const { body, validationResult } = require('express-validator');
const Part = require('../models/Part');
const StockTransaction = require('../models/StockTransaction');
const RawItem = require('../models/RawItem');
const ManufacturingRecord = require('../models/ManufacturingRecord');
const PendingPart = require('../models/PendingPart');
const mongoose = require('mongoose');

// Validation middleware
// Validation middleware
const validatePart = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be less than 100 characters'),
  body('type').isIn(['Copper', 'GI', 'SS', 'Brass', 'PB', 'Aluminium', 'Nylon']).withMessage('Valid type is required'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('unit').trim().isLength({ min: 1, max: 20 }).withMessage('Unit is required and must be less than 20 characters'),
  body('quantity_in_stock').isFloat({ min: 0 }).withMessage('Quantity must be a non-negative number'),
  body('min_stock_level').isFloat({ min: 0 }).withMessage('Minimum stock level must be a non-negative number'),
  body('cost_per_unit').optional().isFloat({ min: 0 }).withMessage('Cost per unit must be a non-negative number'),
  body('weight').optional().isFloat({ min: 0 }).withMessage('Weight must be a non-negative number'),
  body('location').optional().trim().isLength({ max: 100 }).withMessage('Location must be less than 100 characters'),
  body('category').optional().isIn(['Copper', 'GI', 'SS', 'Brass', 'PB', 'Aluminium', 'Nylon']).withMessage('Invalid category')
];

// Get all parts with pagination and search
const getAllParts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 1000, // Increase default limit to handle "get all" requests
      search, 
      type, 
      category, 
      sortBy = 'name', 
      sortOrder = 'asc' 
    } = req.query;
    
    // Build query
    const query = { is_active: true };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { part_id: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (type) query.type = type;
    if (category) query.category = category;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Handle special case for getting all parts (when limit is very high)
    const requestedLimit = parseInt(limit);
    const isGetAllRequest = requestedLimit >= 1000;
    
    let parts;
    let total;
    
    if (isGetAllRequest) {
      // For "get all" requests, don't apply pagination
      parts = await Part.find(query).sort(sort).exec();
      total = parts.length;
    } else {
      // For regular paginated requests
      parts = await Part.find(query)
        .sort(sort)
        .limit(requestedLimit)
        .skip((page - 1) * requestedLimit)
        .exec();
      
      total = await Part.countDocuments(query);
    }
    
    console.log(`Fetched ${parts.length} parts (total in DB: ${total})`);
    
    res.json({
      parts,
      totalPages: isGetAllRequest ? 1 : Math.ceil(total / requestedLimit),
      currentPage: parseInt(page),
      total,
      hasNext: !isGetAllRequest && (page * requestedLimit < total),
      hasPrev: !isGetAllRequest && (page > 1)
    });
  } catch (error) {
    console.error('Error fetching parts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get part by ID
const getPartById = async (req, res) => {
  try {
    const part = await Part.findById(req.params.id);
    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }
    res.json(part);
  } catch (error) {
    console.error('Error fetching part:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid part ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new part
const createPart = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Check if part with same name already exists
    const existingPart = await Part.findOne({ 
      name: { $regex: new RegExp(`^${req.body.name}$`, 'i') }
    });
    
    if (existingPart) {
      return res.status(400).json({ error: 'Part with this name already exists' });
    }
    
    // Create new part with automatic field generation
    const part = new Part({
      name: req.body.name,
      type: req.body.type,
      description: req.body.description,
      unit: req.body.unit || 'pcs',
      quantity_in_stock: req.body.quantity_in_stock || 0,
      min_stock_level: req.body.min_stock_level || 10,
      cost_per_unit: req.body.cost_per_unit || 0,
      weight: req.body.weight || 0,
      location: req.body.location,
      category: req.body.category,
      is_active: true
    });
    
    await part.save();
    
    res.status(201).json(part);
  } catch (error) {
    console.error('Error creating part:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update part
const updatePart = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const part = await Part.findById(req.params.id);
    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }
    

    
    // Check if name is being changed and if it conflicts with existing part
    if (req.body.name && req.body.name !== part.name) {
      const existingPart = await Part.findOne({ 
        name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      
      if (existingPart) {
        return res.status(400).json({ error: 'Part with this name already exists' });
      }
    }
    
    // Update part
    Object.assign(part, req.body);
    await part.save();
    
    res.json(part);
  } catch (error) {
    console.error('Error updating part:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid part ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete part
const deletePart = async (req, res) => {
  try {
    const part = await Part.findById(req.params.id);
    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }
    
    // Check if part is used in any assemblies
    const AssemblyDetail = require('../models/AssemblyDetail');
    const assembliesUsingPart = await AssemblyDetail.countDocuments({ part_id: req.params.id });
    
    if (assembliesUsingPart > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete part',
        message: `This part is used in ${assembliesUsingPart} assembly(ies). Please remove it from assemblies first.`
      });
    }
    
    // Soft delete by setting is_active to false
    part.is_active = false;
    await part.save();
    
    res.json({ message: 'Part deleted successfully' });
  } catch (error) {
    console.error('Error deleting part:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid part ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get low stock alerts
const getLowStockAlerts = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const lowStockParts = await Part.find({
      $expr: {
        $lte: ['$quantity_in_stock', '$min_stock_level']
      },
      is_active: true
    })
    .sort({ quantity_in_stock: 1 })
    .limit(parseInt(limit));
    
    res.json({
      lowStockParts,
      count: lowStockParts.length
    });
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update stock quantity
const updateStockQuantity = async (req, res) => {
  try {
    const { quantity, type, reference, notes } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }
    
    const part = await Part.findById(req.params.id);
    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }
    
    const previousStock = part.quantity_in_stock;
    let newStock;
    
    // Update stock based on type
    if (type === 'in') {
      newStock = previousStock + quantity;
      part.quantity_in_stock = newStock;
      part.last_restocked = new Date();
    } else if (type === 'out') {
      if (previousStock < quantity) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }
      newStock = previousStock - quantity;
      part.quantity_in_stock = newStock;
    } else {
      return res.status(400).json({ error: 'Invalid transaction type. Use "in" or "out"' });
    }
    
    await part.save();
    
    // Create transaction record
    const transaction = new StockTransaction({
      part_reference: part._id,
      transaction_type: type.toUpperCase(),
      quantity,
      reference: reference || 'Manual adjustment',
      notes: notes || `Stock ${type} adjustment`,
      previous_stock: previousStock,
      new_stock: newStock
    });
    
    await transaction.save();
    
    res.json({
      part,
      transaction: transaction,
      message: `Stock ${type} successful`
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid part ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get part statistics
const getPartStatistics = async (req, res) => {
  try {
    const totalParts = await Part.countDocuments({ is_active: true });
    const lowStockCount = await Part.countDocuments({
      $expr: {
        $lte: ['$quantity_in_stock', '$min_stock_level']
      },
      is_active: true
    });
    const outOfStockCount = await Part.countDocuments({
      quantity_in_stock: 0,
      is_active: true
    });
    
    // Calculate total stock value
    const parts = await Part.find({ is_active: true });
    const totalStockValue = parts.reduce((sum, part) => {
      return sum + (part.quantity_in_stock * part.cost_per_unit);
    }, 0);
    
    res.json({
      totalParts,
      lowStockCount,
      outOfStockCount,
      totalStockValue: parseFloat(totalStockValue.toFixed(2))
    });
  } catch (error) {
    console.error('Error fetching part statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create parts from raw items
const createPartsFromRawItems = async (req, res) => {
  console.log('=== CREATE PARTS FROM RAW ITEMS STARTED ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const { 
      part_id, 
      quantity_to_make, 
      vendor_type, 
      raw_items_used, 
      notes 
    } = req.body;
    
    // Validate required fields
    if (!part_id || !quantity_to_make || !raw_items_used || !Array.isArray(raw_items_used)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'part_id, quantity_to_make, and raw_items_used are required'
      });
    }
    
    if (quantity_to_make <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: 'Invalid quantity',
        message: 'quantity_to_make must be greater than 0'
      });
    }
    
    // Find the part to create
    console.log('Looking for part with ID:', part_id);
    const part = await Part.findById(part_id).session(session);
    if (!part) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Part not found' });
    }
    console.log('Found part:', part.name);
    
    // Validate and process raw items
    const rawItemUpdates = [];
    const stockTransactions = [];
    const fetchedRawItems = [];
    
    for (const rawItemData of raw_items_used) {
      const { _id: rawItemId, quantity_used } = rawItemData;
      
      if (!rawItemId || !quantity_used || quantity_used <= 0) {
        await session.abortTransaction();
        return res.status(400).json({ 
          error: 'Invalid raw item data',
          message: 'Each raw item must have valid _id and quantity_used'
        });
      }
      
      // Find the raw item
      const rawItem = await RawItem.findById(rawItemId).session(session);
      if (!rawItem) {
        await session.abortTransaction();
        return res.status(404).json({ 
          error: 'Raw item not found',
          message: `Raw item with ID ${rawItemId} not found`
        });
      }
      
      // Store the fetched raw item for later use
      fetchedRawItems.push(rawItem);
      
      // Calculate total quantity needed
      const totalQuantityNeeded = quantity_used * quantity_to_make;
      
      // Check if enough stock is available
      if (rawItem.quantity_in_stock < totalQuantityNeeded) {
        await session.abortTransaction();
        return res.status(400).json({ 
          error: 'Insufficient raw item stock',
          message: `Not enough ${rawItem.name} in stock. Available: ${rawItem.quantity_in_stock}, Required: ${totalQuantityNeeded}`,
          rawItem: {
            name: rawItem.name,
            available: rawItem.quantity_in_stock,
            required: totalQuantityNeeded
          }
        });
      }
      
      // Prepare raw item stock update
      const newRawItemStock = rawItem.quantity_in_stock - totalQuantityNeeded;
      rawItemUpdates.push({
        rawItemId,
        previousStock: rawItem.quantity_in_stock,
        newStock: newRawItemStock,
        quantityUsed: totalQuantityNeeded
      });
      
      // Create stock transaction for raw item withdrawal
      const rawItemTransaction = new StockTransaction({
        raw_item_reference: rawItemId,
        transaction_type: 'WITHDRAWAL',
        quantity: totalQuantityNeeded,
        unit_price: rawItem.cost_per_unit || 0,
        total_value: (rawItem.cost_per_unit || 0) * totalQuantityNeeded,
        reference: `Manufacturing - ${part.name} (Pending Review)`,
        reference_type: 'OTHER',
        notes: `Raw item consumed for manufacturing ${part.name}${notes ? ` - ${notes}` : ''}`,
        previous_stock: rawItem.quantity_in_stock,
        new_stock: newRawItemStock,
        date: new Date(),
        created_by: 'system'
      });
      
      stockTransactions.push(rawItemTransaction);
    }
    
    // Update raw item stocks
    for (const update of rawItemUpdates) {
      await RawItem.updateOne(
        { _id: update.rawItemId },
        { 
          $set: { 
            quantity_in_stock: update.newStock
          }
        },
        { session }
      );
    }
    
    // Save stock transactions for raw items
    for (const transaction of stockTransactions) {
      transaction.transaction_id = await generateTransactionId(session);
      await transaction.save({ session });
    }
    
    // Update part stock (add the created parts) - REMOVED FOR PENDING REVIEW
    // We no longer directly add parts to stock - they go to pending review first
    
    // Calculate total manufacturing cost
    const totalManufacturingCost = raw_items_used.reduce((total, item) => {
      const rawItem = fetchedRawItems.find(ri => ri._id.toString() === item._id);
      return total + ((rawItem?.cost_per_unit || 0) * item.quantity_used * quantity_to_make);
    }, 0);
    
    // Create pending part record for review instead of manufacturing record
    const pendingPartData = {
      part_id: part_id,
      part_name: part.name,
      part_part_id: part.part_id,
      part_type: part.type,
      quantity_created: quantity_to_make,
      vendor_type: vendor_type || 'internal',
      raw_items_used: raw_items_used.map(item => {
        const rawItem = fetchedRawItems.find(ri => ri._id.toString() === item._id);
        return {
          raw_item_id: item._id,
          raw_item_name: item.name,
          raw_item_item_id: rawItem?.item_id || 'N/A',
          quantity_per_part: item.quantity_used,
          total_quantity_used: item.quantity_used * quantity_to_make,
          unit: rawItem?.unit || 'KG',
          cost_per_unit: rawItem?.cost_per_unit || 0,
          total_cost: (rawItem?.cost_per_unit || 0) * item.quantity_used * quantity_to_make
        };
      }),
      production_date: new Date(),
      total_manufacturing_cost: totalManufacturingCost,
      notes: notes || '',
      created_by: 'system',
      status: 'pending_review'
    };
    
    console.log('Creating pending part for review...');
    const pendingPart = new PendingPart(pendingPartData);
    await pendingPart.save({ session });
    console.log('Pending part created successfully with ID:', pendingPart.pending_part_id);
    
    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      message: `Successfully created ${quantity_to_make} ${part.name} for quality review. Raw materials have been consumed.`,
      data: {
        pending_part: {
          pending_part_id: pendingPart.pending_part_id,
          part_name: pendingPart.part_name,
          part_id: pendingPart.part_part_id,
          quantity_created: pendingPart.quantity_created,
          status: pendingPart.status,
          production_date: pendingPart.production_date
        },
        raw_items_consumed: rawItemUpdates.map(update => ({
          raw_item_id: update.rawItemId,
          quantity_used: update.quantityUsed,
          previous_stock: update.previousStock,
          new_stock: update.newStock
        })),
        total_manufacturing_cost: totalManufacturingCost,
        review_required: true,
        message: 'Parts are now pending quality control review before being added to main stock.'
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('=== ERROR IN CREATE PARTS FROM RAW ITEMS ===');
    console.error('Error creating parts from raw items:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create parts from raw items',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

// Get manufacturing records
const getManufacturingRecords = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      part_id, 
      status, 
      vendor_type,
      start_date,
      end_date,
      sortBy = 'production_date', 
      sortOrder = 'desc' 
    } = req.query;
    
    // Build query
    const query = { is_active: true };
    if (part_id) query.part_id = part_id;
    if (status) query.status = status;
    if (vendor_type) query.vendor_type = vendor_type;
    
    if (start_date || end_date) {
      query.production_date = {};
      if (start_date) query.production_date.$gte = new Date(start_date);
      if (end_date) query.production_date.$lte = new Date(end_date);
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const records = await ManufacturingRecord.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('part_id', 'name part_id type')
      .populate('raw_items_used.raw_item_id', 'name item_id material_type')
      .exec();
    
    const total = await ManufacturingRecord.countDocuments(query);
    
    res.json({
      records,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    });
  } catch (error) {
    console.error('Error fetching manufacturing records:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get manufacturing record by ID
const getManufacturingRecordById = async (req, res) => {
  try {
    const record = await ManufacturingRecord.findById(req.params.id)
      .populate('part_id', 'name part_id type description')
      .populate('raw_items_used.raw_item_id', 'name item_id material_type unit cost_per_unit');
    
    if (!record) {
      return res.status(404).json({ error: 'Manufacturing record not found' });
    }
    
    res.json(record);
  } catch (error) {
    console.error('Error fetching manufacturing record:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid manufacturing record ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get manufacturing statistics
const getManufacturingStatistics = async (req, res) => {
  try {
    const { start_date, end_date, part_id } = req.query;
    
    const filters = { is_active: true };
    if (part_id) filters.part_id = part_id;
    if (start_date || end_date) {
      filters.production_date = {};
      if (start_date) filters.production_date.$gte = new Date(start_date);
      if (end_date) filters.production_date.$lte = new Date(end_date);
    }
    
    const summary = await ManufacturingRecord.getManufacturingSummary(filters);
    const recentRecords = await ManufacturingRecord.getRecentManufacturing(5);
    
    res.json({
      summary: summary[0] || {
        totalRecords: 0,
        totalPartsCreated: 0,
        totalCost: 0,
        averageCostPerPart: 0
      },
      recentRecords
    });
  } catch (error) {
    console.error('Error fetching manufacturing statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  validatePart,
  getAllParts,
  getPartById,
  createPart,
  updatePart,
  deletePart,
  getLowStockAlerts,
  updateStockQuantity,
  getPartStatistics,
  createPartsFromRawItems,
  getManufacturingRecords,
  getManufacturingRecordById,
  getManufacturingStatistics
};
