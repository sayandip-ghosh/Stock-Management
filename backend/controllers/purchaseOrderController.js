const { body, validationResult } = require('express-validator');
const PurchaseOrder = require('../models/PurchaseOrder');
const PurchaseOrderReceipt = require('../models/PurchaseOrderReceipt');
const Part = require('../models/Part');
const StockTransaction = require('../models/StockTransaction');
const mongoose = require('mongoose');

// Validation middleware for purchase orders
const validatePurchaseOrder = [
  body('supplier_name').trim().isLength({ min: 1, max: 200 }).withMessage('Supplier name is required and must be less than 200 characters'),
  body('supplier_contact').optional().trim().isLength({ max: 200 }).withMessage('Supplier contact must be less than 200 characters'),
  body('order_date').isISO8601().withMessage('Valid order date is required'),
  body('expected_delivery_date').optional().isISO8601().withMessage('Valid expected delivery date required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.part_id').isMongoId().withMessage('Valid part ID is required for each item'),
  body('items.*.quantity_ordered').isFloat({ min: 0.01 }).withMessage('Valid quantity is required for each item'),
  body('items.*.cost_unit_type').optional().isIn(['piece', 'kg']).withMessage('Cost unit type must be either piece or kg'),
  body('items.*.cost_per_unit_input').optional().isFloat({ min: 0 }).withMessage('Cost per unit input must be non-negative'),
  body('items.*.unit_cost').optional().isFloat({ min: 0 }).withMessage('Unit cost must be non-negative'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters')
];

// Get all purchase orders
const getAllPurchaseOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      supplier_name,
      start_date,
      end_date,
      sortBy = 'order_date', 
      sortOrder = 'desc' 
    } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (supplier_name) query.supplier_name = { $regex: supplier_name, $options: 'i' };
    
    if (start_date || end_date) {
      query.order_date = {};
      if (start_date) query.order_date.$gte = new Date(start_date);
      if (end_date) query.order_date.$lte = new Date(end_date);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('items.part_id', 'part_id name unit')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await PurchaseOrder.countDocuments(query);

    res.json({
      purchase_orders: purchaseOrders,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get purchase order by ID
const getPurchaseOrderById = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id)
      .populate('items.part_id', 'part_id name unit quantity_in_stock');

    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    res.json(purchaseOrder);
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid purchase order ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new purchase order
const createPurchaseOrder = async (req, res) => {
  try {
    console.log('=== CREATE PURCHASE ORDER ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array(),
        received_data: req.body
      });
    }

    // Verify all parts exist
    const partIds = req.body.items.map(item => item.part_id);
    console.log('Part IDs to verify:', partIds);
    
    const parts = await Part.find({ _id: { $in: partIds } });
    console.log(`Found ${parts.length} parts out of ${partIds.length} requested`);
    
    if (parts.length !== partIds.length) {
      console.log('Missing parts. Found:', parts.map(p => p._id));
      return res.status(400).json({ error: 'One or more parts not found' });
    }

    // Create purchase order without order_number (let middleware generate it)
    const purchaseOrderData = {
      supplier_name: req.body.supplier_name,
      supplier_contact: req.body.supplier_contact,
      order_date: req.body.order_date,
      items: req.body.items,
      notes: req.body.notes,
      created_by: req.body.created_by || 'system'
    };

    // Only add expected_delivery_date if it's provided and not empty
    if (req.body.expected_delivery_date && req.body.expected_delivery_date.trim() !== '') {
      purchaseOrderData.expected_delivery_date = req.body.expected_delivery_date;
    }

    console.log('Creating purchase order with data:', purchaseOrderData);
    
    const purchaseOrder = new PurchaseOrder(purchaseOrderData);

    console.log('Attempting to save purchase order...');
    await purchaseOrder.save();
    console.log('Purchase order saved successfully with order number:', purchaseOrder.order_number);

    // Populate references for response
    await purchaseOrder.populate('items.part_id', 'part_id name unit');

    res.status(201).json(purchaseOrder);
  } catch (error) {
    console.error('Error creating purchase order:', error);
    if (error.name === 'ValidationError') {
      console.log('Mongoose validation error:', error.errors);
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors,
        message: error.message 
      });
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Update purchase order
const updatePurchaseOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const purchaseOrder = await PurchaseOrder.findById(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    // Don't allow updates to completed orders
    if (purchaseOrder.status === 'completed') {
      return res.status(400).json({ error: 'Cannot modify completed purchase order' });
    }

    // Update fields
    Object.assign(purchaseOrder, req.body);
    await purchaseOrder.save();

    await purchaseOrder.populate('items.part_id', 'part_id name unit');

    res.json(purchaseOrder);
  } catch (error) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete purchase order
const deletePurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    // Don't allow deletion if items have been received
    const hasReceivedItems = purchaseOrder.items.some(item => (item.quantity_received || 0) > 0);
    if (hasReceivedItems) {
      return res.status(400).json({ 
        error: 'Cannot delete purchase order with received items',
        message: 'This purchase order has received items and cannot be deleted'
      });
    }

    await PurchaseOrder.findByIdAndDelete(req.params.id);
    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Receive items for purchase order
const receiveItems = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { received_date, items, notes, receiver_name, carrier_info } = req.body;
    const purchaseOrderId = req.params.id;

    console.log('=== RECEIVE ITEMS ===');
    console.log('Purchase Order ID:', purchaseOrderId);
    console.log('Items to receive:', JSON.stringify(items, null, 2));

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Items to receive are required' });
    }

    // Get purchase order
    const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId).session(session);
    if (!purchaseOrder) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (purchaseOrder.status === 'completed') {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Purchase order is already completed' });
    }

    // Process each received item
    const receiptItems = [];
    const stockTransactions = [];

    for (const receivedItem of items) {
      const { item_id, part_id, quantity_receiving, notes: itemNotes, condition = 'good' } = receivedItem;

      console.log('Processing item:', { item_id, part_id, quantity_receiving });

      // Find the corresponding item in purchase order
      const poItem = purchaseOrder.items.id(item_id);
      if (!poItem) {
        await session.abortTransaction();
        return res.status(400).json({ error: `Purchase order item not found: ${item_id}` });
      }

      // Check if receiving quantity is valid
      const remaining = poItem.quantity_ordered - (poItem.quantity_received || 0);
      if (quantity_receiving > remaining) {
        await session.abortTransaction();
        return res.status(400).json({ 
          error: `Cannot receive ${quantity_receiving} items. Only ${remaining} remaining for this item.`
        });
      }

      // Update purchase order item
      poItem.quantity_received = (poItem.quantity_received || 0) + quantity_receiving;

      // Get part and update stock
      const part = await Part.findById(part_id).session(session);
      if (!part) {
        await session.abortTransaction();
        return res.status(400).json({ error: `Part not found: ${part_id}` });
      }

      const previousStock = part.quantity_in_stock;
      const newStock = previousStock + quantity_receiving;

      // Update part stock
      await Part.updateOne(
        { _id: part_id },
        { 
          $set: { 
            quantity_in_stock: newStock,
            last_restocked: new Date()
          }
        },
        { session }
      );

      // Generate transaction ID manually
      const transactionId = await generateTransactionId(session);
      console.log('Generated transaction ID:', transactionId);

      // Create stock transaction with explicit transaction_id
      const stockTransaction = new StockTransaction({
        transaction_id: transactionId,
        part_reference: part_id,
        transaction_type: 'DELIVERY',
        quantity: quantity_receiving,
        unit_price: poItem.unit_cost || 0,
        total_value: (poItem.unit_cost || 0) * quantity_receiving,
        reference: purchaseOrder.order_number,
        reference_type: 'PURCHASE_ORDER',
        notes: `Received from purchase order ${purchaseOrder.order_number}`,
        created_by: receiver_name || 'system',
        previous_stock: previousStock,
        new_stock: newStock,
        date: new Date(received_date)
      });

      await stockTransaction.save({ session });
      stockTransactions.push(stockTransaction);

      // Add to receipt items
      receiptItems.push({
        purchase_order_item_id: item_id,
        part_id: part_id,
        quantity_received: quantity_receiving,
        unit_cost: poItem.unit_cost || 0,
        condition: condition,
        notes: itemNotes || ''
      });
    }

    // Create receipt record without receipt_number (let middleware generate it)
    console.log('Creating receipt with items:', receiptItems.length);
    
    const receiptData = {
      purchase_order_id: purchaseOrderId,
      received_date: new Date(received_date),
      items: receiptItems,
      receiver_name: receiver_name || 'system',
      delivery_notes: notes || '',
      carrier_info: carrier_info || ''
    };

    console.log('Receipt data before save:', JSON.stringify(receiptData, null, 2));
    
    const receipt = new PurchaseOrderReceipt(receiptData);
    
    console.log('Attempting to save receipt...');
    await receipt.save({ session });
    console.log('Receipt saved successfully with number:', receipt.receipt_number);

    // Update purchase order status
    purchaseOrder.updateStatus();
    await purchaseOrder.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: `Successfully received ${receiptItems.length} item types`,
      receipt: {
        receipt_number: receipt.receipt_number,
        received_date: receipt.received_date,
        total_items_received: receipt.total_items_received
      },
      purchase_order_status: purchaseOrder.status,
      completion_percentage: purchaseOrder.completion_percentage,
      stock_transactions: stockTransactions.length
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error receiving items:', error);
    
    // Provide more detailed error information
    if (error.name === 'ValidationError') {
      console.log('Validation error details:', error.errors);
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors,
        message: error.message 
      });
    }
    
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    session.endSession();
  }
};

// Helper function to generate transaction ID
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

// Get pending purchase orders (include partial orders)
const getPendingPurchaseOrders = async (req, res) => {
  try {
    // Include both pending and partial orders in "pending" view
    const orders = await PurchaseOrder.find({ 
      status: { $in: ['pending', 'partial'] } 
    })
      .populate({
        path: 'items.part_id',
        select: 'part_id name unit quantity_in_stock'
      })
      .sort({ order_date: -1 });
    
    // Add completion status for each order
    const ordersWithStatus = orders.map(order => {
      const orderObj = order.toObject();
      orderObj.completion_percentage = order.completion_percentage;
      
      // Add item-level completion info
      orderObj.items = orderObj.items.map(item => ({
        ...item,
        remaining_quantity: (item.quantity_ordered || 0) - (item.quantity_received || 0),
        completion_percentage: item.quantity_ordered > 0 
          ? Math.round(((item.quantity_received || 0) / item.quantity_ordered) * 100)
          : 0
      }));
      
      return orderObj;
    });
    
    console.log('Pending/Partial orders:', ordersWithStatus.length);
    res.json({ purchase_orders: ordersWithStatus });
  } catch (error) {
    console.error('Error fetching pending orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get partial purchase orders
const getPartialPurchaseOrders = async (req, res) => {
  try {
    const orders = await PurchaseOrder.find({ status: 'partial' })
      .populate({
        path: 'items.part_id',
        select: 'part_id name unit quantity_in_stock'
      })
      .sort({ order_date: -1 });
    
    res.json({ purchase_orders: orders });
  } catch (error) {
    console.error('Error fetching partial orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get purchase order receipts
const getPurchaseOrderReceipts = async (req, res) => {
  try {
    const receipts = await PurchaseOrderReceipt.find({ purchase_order_id: req.params.id })
      .populate('items.part_id', 'part_id name unit')
      .sort({ received_date: -1 });

    res.json({ receipts });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  validatePurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  receiveItems,
  getPendingPurchaseOrders,
  getPartialPurchaseOrders,
  getPurchaseOrderReceipts
};
