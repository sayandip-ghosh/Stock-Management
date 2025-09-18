const { body, validationResult } = require('express-validator');
const RawItemPurchaseOrder = require('../models/RawItemPurchaseOrder');
const RawItem = require('../models/RawItem');
const StockTransaction = require('../models/StockTransaction');
const mongoose = require('mongoose');

// Validation middleware for raw item purchase orders
const validateRawItemPurchaseOrder = [
  body('supplier_name').trim().isLength({ min: 1, max: 200 }).withMessage('Supplier name is required and must be less than 200 characters'),
  body('supplier_contact').optional().trim().isLength({ max: 200 }).withMessage('Supplier contact must be less than 200 characters'),
  body('order_date').isISO8601().withMessage('Valid order date is required'),
  body('expected_delivery_date').optional().isISO8601().withMessage('Valid expected delivery date required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.raw_item_id').isMongoId().withMessage('Valid raw item ID is required for each item'),
  body('items.*.quantity_ordered').isFloat({ min: 0.01 }).withMessage('Valid quantity is required for each item'),
  body('items.*.unit_cost').optional().isFloat({ min: 0 }).withMessage('Unit cost must be non-negative'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters')
];

// Lighter validation for updates (allows partial updates)
const validateRawItemPurchaseOrderUpdate = [
  body('supplier_name').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Supplier name must be less than 200 characters'),
  body('supplier_contact').optional().trim().isLength({ max: 200 }).withMessage('Supplier contact must be less than 200 characters'),
  body('order_date').optional().isISO8601().withMessage('Valid order date is required'),
  body('expected_delivery_date').optional().isISO8601().withMessage('Valid expected delivery date required'),
  body('status').optional().isIn(['pending', 'partial', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('items').optional().isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.raw_item_id').optional().isMongoId().withMessage('Valid raw item ID is required for each item'),
  body('items.*.quantity_ordered').optional().isFloat({ min: 0.01 }).withMessage('Valid quantity is required for each item'),
  body('items.*.unit_cost').optional().isFloat({ min: 0 }).withMessage('Unit cost must be non-negative'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters')
];

// Get all raw item purchase orders
const getAllRawItemPurchaseOrders = async (req, res) => {
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
    const purchaseOrders = await RawItemPurchaseOrder.find(query)
      .populate('items.raw_item_id', 'item_id name material_type unit')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await RawItemPurchaseOrder.countDocuments(query);

    res.json({
      data: purchaseOrders,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    });
  } catch (error) {
    console.error('Error fetching raw item purchase orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get raw item purchase order by ID
const getRawItemPurchaseOrderById = async (req, res) => {
  try {
    const purchaseOrder = await RawItemPurchaseOrder.findById(req.params.id)
      .populate('items.raw_item_id', 'item_id name material_type unit quantity_in_stock');

    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Raw item purchase order not found' });
    }

    res.json({ data: purchaseOrder });
  } catch (error) {
    console.error('Error fetching raw item purchase order:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid raw item purchase order ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new raw item purchase order
const createRawItemPurchaseOrder = async (req, res) => {
  try {
    console.log('=== CREATE RAW ITEM PURCHASE ORDER ===');
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

    // Verify all raw items exist
    const rawItemIds = req.body.items.map(item => item.raw_item_id);
    console.log('Raw item IDs to verify:', rawItemIds);
    
    const rawItems = await RawItem.find({ _id: { $in: rawItemIds } });
    console.log(`Found ${rawItems.length} raw items out of ${rawItemIds.length} requested`);
    
    if (rawItems.length !== rawItemIds.length) {
      console.log('Missing raw items. Found:', rawItems.map(r => r._id));
      return res.status(400).json({ error: 'One or more raw items not found' });
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

    console.log('Creating raw item purchase order with data:', purchaseOrderData);
    
    const purchaseOrder = new RawItemPurchaseOrder(purchaseOrderData);

    console.log('Attempting to save raw item purchase order...');
    await purchaseOrder.save();
    console.log('Raw item purchase order saved successfully with order number:', purchaseOrder.order_number);

    // Populate references for response
    await purchaseOrder.populate('items.raw_item_id', 'item_id name material_type unit');

    res.status(201).json({ data: purchaseOrder });
  } catch (error) {
    console.error('Error creating raw item purchase order:', error);
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

// Update raw item purchase order
const updateRawItemPurchaseOrder = async (req, res) => {
  try {
    console.log('=== UPDATE RAW ITEM PURCHASE ORDER ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const purchaseOrder = await RawItemPurchaseOrder.findById(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Raw item purchase order not found' });
    }

    // Don't allow updates to completed orders unless it's a status change
    if (purchaseOrder.status === 'completed' && req.body.status !== 'completed') {
      return res.status(400).json({ error: 'Cannot modify completed raw item purchase order' });
    }

    // Update fields
    Object.assign(purchaseOrder, req.body);
    await purchaseOrder.save();

    await purchaseOrder.populate('items.raw_item_id', 'item_id name material_type unit');

    console.log('Successfully updated raw item purchase order');
    res.json({ data: purchaseOrder });
  } catch (error) {
    console.error('Error updating raw item purchase order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete raw item purchase order
const deleteRawItemPurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await RawItemPurchaseOrder.findById(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Raw item purchase order not found' });
    }

    // Don't allow deletion if items have been received
    const hasReceivedItems = purchaseOrder.items.some(item => (item.quantity_received || 0) > 0);
    if (hasReceivedItems) {
      return res.status(400).json({ 
        error: 'Cannot delete raw item purchase order with received items',
        message: 'This purchase order has received items and cannot be deleted'
      });
    }

    await RawItemPurchaseOrder.findByIdAndDelete(req.params.id);
    res.json({ message: 'Raw item purchase order deleted successfully' });
  } catch (error) {
    console.error('Error deleting raw item purchase order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Receive raw items for purchase order
const receiveRawItems = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { received_date, items, notes, receiver_name, carrier_info } = req.body;
    const purchaseOrderId = req.params.id;

    console.log('=== RECEIVE RAW ITEMS ===');
    console.log('Raw Item Purchase Order ID:', purchaseOrderId);
    console.log('Items to receive:', JSON.stringify(items, null, 2));

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Items to receive are required' });
    }

    // Get purchase order
    const purchaseOrder = await RawItemPurchaseOrder.findById(purchaseOrderId).session(session);
    if (!purchaseOrder) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Raw item purchase order not found' });
    }

    if (purchaseOrder.status === 'completed') {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Raw item purchase order is already completed' });
    }

    // Process each received item
    const stockTransactions = [];

    for (const receivedItem of items) {
      const { item_id, raw_item_id, quantity_receiving, notes: itemNotes, condition = 'good' } = receivedItem;

      console.log('Processing raw item:', { item_id, raw_item_id, quantity_receiving });

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

      // Get raw item and update stock
      const rawItem = await RawItem.findById(raw_item_id).session(session);
      if (!rawItem) {
        await session.abortTransaction();
        return res.status(400).json({ error: `Raw item not found: ${raw_item_id}` });
      }

      const previousStock = rawItem.quantity_in_stock;
      const newStock = previousStock + quantity_receiving;

      // Update raw item stock
      await RawItem.updateOne(
        { _id: raw_item_id },
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
        raw_item_reference: raw_item_id,
        transaction_type: 'DELIVERY',
        quantity: quantity_receiving,
        unit_price: poItem.unit_cost || 0,
        total_value: (poItem.unit_cost || 0) * quantity_receiving,
        reference: purchaseOrder.order_number,
        reference_type: 'RAW_ITEM_PURCHASE_ORDER',
        notes: `Received from raw item purchase order ${purchaseOrder.order_number}`,
        created_by: receiver_name || 'system',
        previous_stock: previousStock,
        new_stock: newStock,
        date: new Date(received_date)
      });

      await stockTransaction.save({ session });
      stockTransactions.push(stockTransaction);
    }

    // Update purchase order status
    purchaseOrder.updateStatus();
    await purchaseOrder.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: `Successfully received ${items.length} raw item types`,
      purchase_order_status: purchaseOrder.status,
      completion_percentage: purchaseOrder.completion_percentage,
      stock_transactions: stockTransactions.length
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error receiving raw items:', error);
    
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

// Get pending raw item purchase orders (include partial orders)
const getPendingRawItemPurchaseOrders = async (req, res) => {
  try {
    // Include both pending and partial orders in "pending" view
    const orders = await RawItemPurchaseOrder.find({ 
      status: { $in: ['pending', 'partial'] } 
    })
      .populate({
        path: 'items.raw_item_id',
        select: 'item_id name material_type unit quantity_in_stock'
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
    
    console.log('Pending/Partial raw item purchase orders:', ordersWithStatus.length);
    res.json({ data: ordersWithStatus });
  } catch (error) {
    console.error('Error fetching pending raw item purchase orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get partial raw item purchase orders
const getPartialRawItemPurchaseOrders = async (req, res) => {
  try {
    const orders = await RawItemPurchaseOrder.find({ status: 'partial' })
      .populate({
        path: 'items.raw_item_id',
        select: 'item_id name material_type unit quantity_in_stock'
      })
      .sort({ order_date: -1 });
    
    res.json({ data: orders });
  } catch (error) {
    console.error('Error fetching partial raw item purchase orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  validateRawItemPurchaseOrder,
  validateRawItemPurchaseOrderUpdate,
  getAllRawItemPurchaseOrders,
  getRawItemPurchaseOrderById,
  createRawItemPurchaseOrder,
  updateRawItemPurchaseOrder,
  deleteRawItemPurchaseOrder,
  receiveRawItems,
  getPendingRawItemPurchaseOrders,
  getPartialRawItemPurchaseOrders
};
