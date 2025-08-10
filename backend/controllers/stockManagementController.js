const { body, validationResult } = require('express-validator');
const StockTransaction = require('../models/StockTransaction');
const Part = require('../models/Part');
const mongoose = require('mongoose');

/**
 * Validation middleware for stock operations
 */
const validateStockOperation = [
  body('part_id')
    .isMongoId().withMessage('Valid part ID is required'),
  body('quantity')
    .isFloat({ min: 0.01 }).withMessage('Valid quantity is required'),
  body('transaction_type')
    .isIn(['DELIVERY', 'WITHDRAWAL']).withMessage('Transaction type must be DELIVERY or WITHDRAWAL'),
  body('notes')
    .optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters'),
  body('unit_price')
    .optional().isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number'),
  body('reference')
    .optional().trim().isLength({ max: 100 }).withMessage('Reference must be less than 100 characters')
];

/**
 * Perform an atomic stock operation (update stock + create transaction log)
 */
const performStockOperation = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { part_id, quantity, transaction_type, notes, unit_price, reference } = req.body;
    console.log('Stock operation request:', {
      part_id,
      quantity,
      quantityType: typeof quantity,
      transaction_type,
      notes,
      unit_price,
      reference
    });

    // Ensure quantity is a positive number
    const numericQuantity = parseFloat(quantity);
    if (isNaN(numericQuantity) || numericQuantity <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        error: 'Invalid quantity',
        message: 'Quantity must be a valid positive number'
      });
    }

    // Find the part
    const part = await Part.findById(part_id).session(session);
    if (!part) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Part not found' });
    }

    console.log('Found part:', {
      part_id: part.part_id,
      name: part.name,
      current_stock: part.quantity_in_stock,
      min_stock_level: part.min_stock_level
    });

    const previousStock = part.quantity_in_stock;
    let newStock = previousStock;

    // Adjust stock based on transaction type
    if (transaction_type === 'DELIVERY') {
      newStock += numericQuantity;
      part.last_restocked = new Date();
    } else if (transaction_type === 'WITHDRAWAL') {
      if (previousStock < numericQuantity) {
        await session.abortTransaction();
        return res.status(400).json({
          error: 'Insufficient stock',
          currentStock: previousStock,
          requestedQuantity: numericQuantity
        });
      }
      newStock -= numericQuantity;
    }

    console.log('Stock calculation:', {
      previousStock,
      numericQuantity,
      transaction_type,
      newStock
    });

    // Save updated stock
    const updateResult = await Part.updateOne(
      { _id: part_id },
      {
        $set: {
          quantity_in_stock: newStock,
          ...(transaction_type === 'DELIVERY' && { last_restocked: new Date() })
        }
      },
      { session }
    );

    if (updateResult.modifiedCount === 0) {
      await session.abortTransaction();
      return res.status(500).json({
        error: 'Failed to update part stock',
        message: 'Could not update the part stock level'
      });
    }

    console.log('Part updated successfully');

    // Build transaction data
    const transactionData = {
      part_reference: part_id,
      transaction_type,
      quantity: numericQuantity,
      unit_price: parseFloat(unit_price) || 0,
      total_value: (parseFloat(unit_price) || 0) * numericQuantity,
      reference: reference || `${transaction_type} - ${new Date().toLocaleDateString()}`,
      notes: notes || `${transaction_type} operation`,
      previous_stock: previousStock,
      new_stock: newStock,
      date: new Date()
    };

    if (!mongoose.Types.ObjectId.isValid(transactionData.part_reference)) {
      await session.abortTransaction();
      return res.status(400).json({
        error: 'Invalid part reference',
        message: 'The part reference is not a valid ID'
      });
    }

    // Generate transaction_id
    transactionData.transaction_id = await generateTransactionId(session);

    const transaction = new StockTransaction(transactionData);
    await transaction.save({ session });
    console.log('Transaction saved successfully');

    await session.commitTransaction();
    console.log('Transaction committed successfully');

    await transaction.populate('part_reference', 'part_id name');

    return res.status(201).json({
      success: true,
      message: `${transaction_type} successful`,
      part: {
        part_id: part.part_id,
        name: part.name,
        previous_stock: previousStock,
        new_stock: newStock,
        current_stock: part.quantity_in_stock
      },
      transaction: {
        transaction_id: transaction.transaction_id,
        transaction_type: transaction.transaction_type,
        quantity: transaction.quantity,
        date: transaction.date,
        notes: transaction.notes
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error performing stock operation:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Stock operation failed and has been rolled back',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

/**
 * Generate a new transaction ID
 */
async function generateTransactionId(session) {
  try {
    const lastTransaction = await StockTransaction.findOne({}, {}, { sort: { transaction_id: -1 } }).session(session);
    let nextNumber = 1;

    if (lastTransaction?.transaction_id) {
      const match = lastTransaction.transaction_id.match(/TXN(\d+)/);
      if (match) nextNumber = parseInt(match[1]) + 1;
    }

    for (let attempts = 0; attempts < 100; attempts++) {
      const transactionId = `TXN${String(nextNumber + attempts).padStart(6, '0')}`;
      const exists = await StockTransaction.findOne({ transaction_id: transactionId }).session(session);
      if (!exists) return transactionId;
    }

    return `TXN${Date.now().toString().slice(-6)}`;
  } catch {
    return `TXN${Date.now().toString().slice(-6)}`;
  }
}

/**
 * Get stock history for a specific part
 */
const getPartStockHistory = async (req, res) => {
  try {
    const { part_id } = req.params;
    const { page = 1, limit = 20, sortBy = 'date', sortOrder = 'desc' } = req.query;

    const part = await Part.findById(part_id);
    if (!part) return res.status(404).json({ error: 'Part not found' });

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const transactions = await StockTransaction.find({ part_reference: part_id })
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await StockTransaction.countDocuments({ part_reference: part_id });

    const stockStats = await StockTransaction.aggregate([
      { $match: { part_reference: new mongoose.Types.ObjectId(part_id) } },
      {
        $group: {
          _id: '$transaction_type',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$total_value' }
        }
      }
    ]);

    res.json({
      part: {
        part_id: part.part_id,
        name: part.name,
        current_stock: part.quantity_in_stock,
        min_stock_level: part.min_stock_level,
        category: part.category,
        unit: part.unit
      },
      transactions,
      stockStats,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching part stock history:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid part ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get current stock levels with status
 */
const getCurrentStockLevels = async (req, res) => {
  try {
    const { category, status, search } = req.query;

    const query = { is_active: true };
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { part_id: { $regex: search, $options: 'i' } }
      ];
    }

    const parts = await Part.find(query).sort({ name: 1 });

    const partsWithStatus = parts.map(part => {
      let stockStatus = 'normal';
      if (part.quantity_in_stock <= 0) stockStatus = 'out_of_stock';
      else if (part.quantity_in_stock <= part.min_stock_level) stockStatus = 'low_stock';
      return { ...part.toObject(), stockStatus };
    });

    const filteredParts = status
      ? partsWithStatus.filter(part => part.stockStatus === status)
      : partsWithStatus;

    const summary = {
      total: partsWithStatus.length,
      in_stock: partsWithStatus.filter(p => p.stockStatus === 'normal').length,
      low_stock: partsWithStatus.filter(p => p.stockStatus === 'low_stock').length,
      out_of_stock: partsWithStatus.filter(p => p.stockStatus === 'out_of_stock').length
    };

    res.json({
      parts: filteredParts,
      summary,
      filters: { category, status, search }
    });

  } catch (error) {
    console.error('Error fetching current stock levels:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  validateStockOperation,
  performStockOperation,
  getPartStockHistory,
  getCurrentStockLevels
};
