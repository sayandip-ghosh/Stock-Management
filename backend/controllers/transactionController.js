const { body, validationResult } = require('express-validator');
const StockTransaction = require('../models/StockTransaction');
const Part = require('../models/Part');
const Assembly = require('../models/Assembly');

// Validation middleware
const validateTransaction = [
  body('part_reference').isMongoId().withMessage('Valid part reference is required'),
  body('transaction_type').isIn(['DELIVERY', 'WITHDRAWAL', 'ADJUSTMENT', 'ASSEMBLY_BUILD', 'ASSEMBLY_DISASSEMBLE']).withMessage('Invalid transaction type'),
  body('quantity').isFloat({ min: 0.01 }).withMessage('Valid quantity is required'),
  body('unit_price').optional().isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number'),
  body('reference').optional().trim().isLength({ max: 100 }).withMessage('Reference must be less than 100 characters'),
  body('reference_type').optional().isIn(['INVOICE', 'ASSEMBLY_ID', 'PURCHASE_ORDER', 'SALES_ORDER', 'ADJUSTMENT', 'OTHER']).withMessage('Invalid reference type'),
  body('assembly_reference').optional().isMongoId().withMessage('Valid assembly reference is required'),
  body('purchase_order_id').optional().isMongoId().withMessage('Valid purchase order ID is required'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters'),
  body('created_by').optional().trim().isLength({ max: 100 }).withMessage('Created by must be less than 100 characters')
];

// Get all transactions with pagination and filters
const getAllTransactions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      transaction_type, 
      part_id, 
      assembly_id, 
      start_date,
      end_date,
      sortBy = 'date', 
      sortOrder = 'desc' 
    } = req.query;
    
    // Build query
    const query = {};
    if (transaction_type) query.transaction_type = transaction_type;
    if (part_id) query.part_reference = part_id;
    if (assembly_id) query.assembly_reference = assembly_id;
    
    // Date range filter
    if (start_date || end_date) {
      query.date = {};
      if (start_date) query.date.$gte = new Date(start_date);
      if (end_date) query.date.$lte = new Date(end_date);
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query with pagination
    const transactions = await StockTransaction.find(query)
      .populate('part_reference', 'part_id name')
      .populate('assembly_reference', 'assembly_id name')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    // Get total count for pagination
    const total = await StockTransaction.countDocuments(query);
    
    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get transaction by ID
const getTransactionById = async (req, res) => {
  try {
    const transaction = await StockTransaction.findById(req.params.id)
      .populate('part_reference', 'part_id name')
      .populate('assembly_reference', 'assembly_id name');
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new transaction
const createTransaction = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Check if part exists
    const part = await Part.findById(req.body.part_reference);
    if (!part) {
      return res.status(400).json({ error: 'Part not found' });
    }
    
    // Check if assembly exists if provided
    if (req.body.assembly_reference) {
      const assembly = await Assembly.findById(req.body.assembly_reference);
      if (!assembly) {
        return res.status(400).json({ error: 'Assembly not found' });
      }
    }

    // Check purchase order reference if provided
    let purchaseOrderReference = null;
    if (req.body.purchase_order_id) {
      const PurchaseOrder = require('../models/PurchaseOrder');
      purchaseOrderReference = await PurchaseOrder.findById(req.body.purchase_order_id);
      if (!purchaseOrderReference) {
        return res.status(400).json({ error: 'Purchase order not found' });
      }
    }
    
    // Get current stock for the part
    const previousStock = part.quantity_in_stock;
    let newStock = previousStock;
    
    // Update stock based on transaction type
    if (req.body.transaction_type === 'DELIVERY') {
      newStock = previousStock + req.body.quantity;
      part.quantity_in_stock = newStock;
      part.last_restocked = new Date();
    } else if (req.body.transaction_type === 'WITHDRAWAL') {
      if (previousStock < req.body.quantity) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }
      newStock = previousStock - req.body.quantity;
      part.quantity_in_stock = newStock;
    }
    // For ADJUSTMENT, ASSEMBLY_BUILD, ASSEMBLY_DISASSEMBLE, don't update stock here
    // as they are handled by their respective controllers
    
    // Save part if stock was updated
    if (req.body.transaction_type === 'DELIVERY' || req.body.transaction_type === 'WITHDRAWAL') {
      await part.save();
    }
    
    // Create transaction record with automatic ID generation
    const transactionData = {
      part_reference: req.body.part_reference,
      transaction_type: req.body.transaction_type,
      quantity: req.body.quantity,
      unit_price: req.body.unit_price || 0,
      reference: req.body.reference || (purchaseOrderReference ? purchaseOrderReference.order_number : 'Manual Entry'),
      reference_type: req.body.reference_type || (purchaseOrderReference ? 'PURCHASE_ORDER' : 'OTHER'),
      assembly_reference: req.body.assembly_reference,
      notes: req.body.notes,
      created_by: req.body.created_by,
      previous_stock: previousStock,
      new_stock: newStock,
      date: new Date()
    };

    const transaction = new StockTransaction(transactionData);
    await transaction.save();
    
    // Populate references for response
    await transaction.populate('part_reference', 'part_id name');
    await transaction.populate('assembly_reference', 'assembly_id name');
    
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get transaction summary
const getTransactionSummary = async (req, res) => {
  try {
    const { start_date, end_date, transaction_type } = req.query;
    
    // Build filter
    const filter = {};
    if (start_date || end_date) {
      filter.date = {};
      if (start_date) filter.date.$gte = new Date(start_date);
      if (end_date) filter.date.$lte = new Date(end_date);
    }
    if (transaction_type) filter.transaction_type = transaction_type;
    
    const summary = await StockTransaction.getTransactionSummary(filter);
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get recent transactions
const getRecentTransactions = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const transactions = await StockTransaction.getRecentTransactions(parseInt(limit));
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get transactions by part
const getTransactionsByPart = async (req, res) => {
  try {
    const { part_id } = req.params;
    const { page = 1, limit = 10, sortBy = 'date', sortOrder = 'desc' } = req.query;
    
    // Check if part exists
    const part = await Part.findById(part_id);
    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query with pagination
    const transactions = await StockTransaction.find({ part_reference: part_id })
      .populate('assembly_reference', 'assembly_id name')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    // Get total count for pagination
    const total = await StockTransaction.countDocuments({ part_reference: part_id });
    
    res.json({
      part: {
        part_id: part.part_id,
        name: part.name,
        current_stock: part.quantity_in_stock
      },
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    });
  } catch (error) {
    console.error('Error fetching transactions by part:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid part ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get transaction statistics
const getTransactionStatistics = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (start_date || end_date) {
      dateFilter.date = {};
      if (start_date) dateFilter.date.$gte = new Date(start_date);
      if (end_date) dateFilter.date.$lte = new Date(end_date);
    }
    
    // Get total transactions
    const totalTransactions = await StockTransaction.countDocuments(dateFilter);
    
    // Get transactions by type
    const transactionsByType = await StockTransaction.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$transaction_type',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$total_value' }
        }
      }
    ]);
    
    // Get recent activity (last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const recentActivity = await StockTransaction.countDocuments({
      date: { $gte: lastWeek }
    });
    
    res.json({
      totalTransactions,
      transactionsByType,
      recentActivity,
      period: {
        start_date: start_date || null,
        end_date: end_date || null
      }
    });
  } catch (error) {
    console.error('Error fetching transaction statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  validateTransaction,
  getAllTransactions,
  getTransactionById,
  createTransaction,
  getTransactionSummary,
  getRecentTransactions,
  getTransactionsByPart,
  getTransactionStatistics
};
