const { body, validationResult } = require('express-validator');
const Assembly = require('../models/Assembly');
const AssemblyDetail = require('../models/AssemblyDetail');
const Part = require('../models/Part');
const StockTransaction = require('../models/StockTransaction');

// Validation middleware
const validateAssembly = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be less than 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('category').optional().trim().isLength({ max: 50 }).withMessage('Category must be less than 50 characters'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters'),
  body('created_by').optional().trim().isLength({ max: 100 }).withMessage('Created by must be less than 100 characters'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
];

// Get all assemblies with pagination and search
const getAllAssemblies = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, sortBy = 'name', sortOrder = 'asc' } = req.query;
    
    // Build query
    const query = { is_active: true };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { assembly_id: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query with pagination
    const assemblies = await Assembly.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    // Get total count for pagination
    const total = await Assembly.countDocuments(query);
    
    res.json({
      assemblies,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    });
  } catch (error) {
    console.error('Error fetching assemblies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get assembly by ID with details
const getAssemblyById = async (req, res) => {
  try {
    const assembly = await Assembly.findById(req.params.id);
    if (!assembly) {
      return res.status(404).json({ error: 'Assembly not found' });
    }
    
    // Get assembly details (bill of materials)
    const assemblyDetails = await AssemblyDetail.find({ assembly_id: req.params.id })
      .populate('part_id', 'part_id name type unit cost_per_unit quantity_in_stock')
      .sort({ sequence: 1 });
    
    res.json({
      assembly,
      details: assemblyDetails
    });
  } catch (error) {
    console.error('Error fetching assembly:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid assembly ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new assembly
const createAssembly = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Check if assembly with same name already exists
    const existingAssembly = await Assembly.findOne({ 
      name: { $regex: new RegExp(`^${req.body.name}$`, 'i') }
    });
    
    if (existingAssembly) {
      return res.status(400).json({ error: 'Assembly with this name already exists' });
    }
    
    const assembly = new Assembly(req.body);
    await assembly.save();
    
    res.status(201).json(assembly);
  } catch (error) {
    console.error('Error creating assembly:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Assembly ID already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update assembly
const updateAssembly = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const assembly = await Assembly.findById(req.params.id);
    if (!assembly) {
      return res.status(404).json({ error: 'Assembly not found' });
    }
    
    // Check if name is being changed and if it conflicts with existing assembly
    if (req.body.name && req.body.name !== assembly.name) {
      const existingAssembly = await Assembly.findOne({ 
        name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      
      if (existingAssembly) {
        return res.status(400).json({ error: 'Assembly with this name already exists' });
      }
    }
    
    // Update assembly
    Object.assign(assembly, req.body);
    await assembly.save();
    
    res.json(assembly);
  } catch (error) {
    console.error('Error updating assembly:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid assembly ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete assembly
const deleteAssembly = async (req, res) => {
  try {
    const assembly = await Assembly.findById(req.params.id);
    if (!assembly) {
      return res.status(404).json({ error: 'Assembly not found' });
    }
    
    // Check if assembly has been built (total_built > 0)
    if (assembly.total_built > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete assembly',
        message: `This assembly has been built ${assembly.total_built} time(s). Cannot delete assemblies that have been built.`
      });
    }
    
    // Delete assembly details first
    await AssemblyDetail.deleteMany({ assembly_id: req.params.id });
    
    // Soft delete assembly
    assembly.is_active = false;
    await assembly.save();
    
    res.json({ message: 'Assembly deleted successfully' });
  } catch (error) {
    console.error('Error deleting assembly:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid assembly ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add part to assembly (create assembly detail)
const addPartToAssembly = async (req, res) => {
  try {
    const { part_id, quantity_required, unit, notes, is_optional } = req.body;
    
    if (!part_id || !quantity_required || quantity_required <= 0) {
      return res.status(400).json({ error: 'Valid part_id and quantity_required are required' });
    }
    
    // Check if assembly exists
    const assembly = await Assembly.findById(req.params.id);
    if (!assembly) {
      return res.status(404).json({ error: 'Assembly not found' });
    }
    
    // Check if part exists
    const part = await Part.findById(part_id);
    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }
    
    // Check if part is already in assembly
    const existingDetail = await AssemblyDetail.findOne({
      assembly_id: req.params.id,
      part_id: part_id
    });
    
    if (existingDetail) {
      return res.status(400).json({ error: 'Part is already in this assembly' });
    }
    
    const assemblyDetail = new AssemblyDetail({
      assembly_id: req.params.id,
      part_id: part_id,
      quantity_required: quantity_required,
      unit: unit || part.unit,
      notes: notes,
      is_optional: is_optional || false
    });
    
    await assemblyDetail.save();
    
    // Populate part details for response
    await assemblyDetail.populate('part_id', 'part_id name type unit cost_per_unit');
    
    res.status(201).json(assemblyDetail);
  } catch (error) {
    console.error('Error adding part to assembly:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Remove part from assembly
const removePartFromAssembly = async (req, res) => {
  try {
    const { part_id } = req.params;
    
    const assemblyDetail = await AssemblyDetail.findOneAndDelete({
      assembly_id: req.params.id,
      part_id: part_id
    });
    
    if (!assemblyDetail) {
      return res.status(404).json({ error: 'Part not found in assembly' });
    }
    
    res.json({ message: 'Part removed from assembly successfully' });
  } catch (error) {
    console.error('Error removing part from assembly:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Build assembly (decrement stock for all parts)
const buildAssembly = async (req, res) => {
  try {
    const { quantity = 1, reference, notes } = req.body;
    
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }
    
    // Get assembly with details
    const assembly = await Assembly.findById(req.params.id);
    if (!assembly) {
      return res.status(404).json({ error: 'Assembly not found' });
    }
    
    const assemblyDetails = await AssemblyDetail.find({ assembly_id: req.params.id })
      .populate('part_id', 'part_id name quantity_in_stock min_stock_level');
    
    if (assemblyDetails.length === 0) {
      return res.status(400).json({ error: 'Assembly has no parts defined' });
    }
    
    // Check if all parts have sufficient stock
    const insufficientParts = [];
    for (const detail of assemblyDetails) {
      const requiredQuantity = detail.quantity_required * quantity;
      if (detail.part_id.quantity_in_stock < requiredQuantity) {
        insufficientParts.push({
          part_id: detail.part_id.part_id,
          part_name: detail.part_id.name,
          required: requiredQuantity,
          available: detail.part_id.quantity_in_stock
        });
      }
    }
    
    if (insufficientParts.length > 0) {
      return res.status(400).json({
        error: 'Insufficient stock for assembly',
        insufficientParts
      });
    }
    
    // Decrement stock for all parts and create transactions
    const transactions = [];
    for (const detail of assemblyDetails) {
      const requiredQuantity = detail.quantity_required * quantity;
      const part = await Part.findById(detail.part_id._id);
      
      const previousStock = part.quantity_in_stock;
      part.quantity_in_stock -= requiredQuantity;
      await part.save();
      
      // Create transaction record
      const transaction = new StockTransaction({
        part_reference: part._id,
        transaction_type: 'ASSEMBLY_BUILD',
        quantity: requiredQuantity,
        reference: reference || assembly.assembly_id,
        notes: notes || `Assembly build: ${assembly.name}`,
        assembly_reference: assembly._id,
        previous_stock: previousStock,
        new_stock: part.quantity_in_stock
      });
      
      await transaction.save();
      transactions.push(transaction);
    }
    
    // Update assembly build count
    assembly.total_built += quantity;
    assembly.last_built = new Date();
    await assembly.save();
    
    res.json({
      message: `Assembly built successfully (${quantity} unit(s))`,
      assembly: {
        assembly_id: assembly.assembly_id,
        name: assembly.name,
        total_built: assembly.total_built,
        last_built: assembly.last_built
      },
      transactions: transactions.length
    });
  } catch (error) {
    console.error('Error building assembly:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid assembly ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get assembly statistics
const getAssemblyStatistics = async (req, res) => {
  try {
    const totalAssemblies = await Assembly.countDocuments({ is_active: true });
    const totalBuilt = await Assembly.aggregate([
      { $match: { is_active: true } },
      { $group: { _id: null, total: { $sum: '$total_built' } } }
    ]);
    
    const recentBuilds = await Assembly.find({ 
      is_active: true, 
      last_built: { $exists: true } 
    })
    .sort({ last_built: -1 })
    .limit(5)
    .select('assembly_id name last_built total_built');
    
    res.json({
      totalAssemblies,
      totalBuilt: totalBuilt[0]?.total || 0,
      recentBuilds
    });
  } catch (error) {
    console.error('Error fetching assembly statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  validateAssembly,
  getAllAssemblies,
  getAssemblyById,
  createAssembly,
  updateAssembly,
  deleteAssembly,
  addPartToAssembly,
  removePartFromAssembly,
  buildAssembly,
  getAssemblyStatistics
};
