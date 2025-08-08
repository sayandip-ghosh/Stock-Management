const { body, validationResult } = require('express-validator');
const Part = require('../models/Part');
const StockTransaction = require('../models/StockTransaction');

// Validation middleware
const validatePart = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be less than 100 characters'),
  body('type').isIn(['Mechanical', 'Electrical', 'Electronic', 'Plastic', 'Metal', 'Other']).withMessage('Invalid part type'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('unit').trim().isLength({ min: 1, max: 20 }).withMessage('Unit is required and must be less than 20 characters'),
  body('quantity_in_stock').isFloat({ min: 0 }).withMessage('Quantity must be a non-negative number'),
  body('min_stock_level').isFloat({ min: 0 }).withMessage('Minimum stock level must be a non-negative number'),
  body('max_stock_level').optional().isFloat({ min: 0 }).withMessage('Maximum stock level must be a non-negative number'),

  body('cost_per_unit').optional().isFloat({ min: 0 }).withMessage('Cost per unit must be a non-negative number'),
  body('location').optional().trim().isLength({ max: 100 }).withMessage('Location must be less than 100 characters'),
  body('category').optional().trim().isLength({ max: 50 }).withMessage('Category must be less than 50 characters'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
];

// Get all parts with pagination and search
const getAllParts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, type, category, sortBy = 'name', sortOrder = 'asc' } = req.query;
    
    // Build query
    const query = { is_active: true };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (type) query.type = type;
    if (category) query.category = category;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query with pagination
    const parts = await Part.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    // Get total count for pagination
    const total = await Part.countDocuments(query);
    
    res.json({
      parts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      hasNext: page * limit < total,
      hasPrev: page > 1
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

module.exports = {
  validatePart,
  getAllParts,
  getPartById,
  createPart,
  updatePart,
  deletePart,
  getLowStockAlerts,
  updateStockQuantity,
  getPartStatistics
};
