const { body, validationResult } = require('express-validator');
const Assembly = require('../models/Assembly');
const AssemblyDetail = require('../models/AssemblyDetail');
const Product = require('../models/Product');
const Part = require('../models/Part');
const BOM = require('../models/BOM');
const StockTransaction = require('../models/StockTransaction');
const mongoose = require('mongoose');

// Validation middleware
const validateAssembly = [
  body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Name is required and must be less than 200 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('category').optional().trim().isLength({ max: 100 }).withMessage('Category must be less than 100 characters'),
  body('estimated_build_time').optional().isFloat({ min: 0 }).withMessage('Build time must be non-negative'),
  body('build_cost').optional().isFloat({ min: 0 }).withMessage('Build cost must be non-negative'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters')
];

// Get all assemblies
const getAllAssemblies = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, is_active, sortBy = 'name', sortOrder = 'asc' } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { assembly_id: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    if (is_active !== undefined) query.is_active = is_active === 'true';
    
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const assemblies = await Assembly.find(query)
      .populate({
        path: 'bom_items.part_id',
        select: 'part_id name unit cost_per_unit quantity_in_stock type category'
      })
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await Assembly.countDocuments(query);
    
    res.json({
      data: assemblies,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    });
  } catch (error) {
    console.error('Error fetching assemblies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get assembly by ID
const getAssemblyById = async (req, res) => {
  try {
    const assembly = await Assembly.findById(req.params.id)
      .populate({
        path: 'bom_items.part_id',
        select: 'part_id name unit cost_per_unit quantity_in_stock type category'
      });
    
    if (!assembly) {
      return res.status(404).json({ error: 'Assembly not found' });
    }
    
    console.log('Assembly BOM items populated:', assembly.bom_items.map(item => ({
      part_name: item.part_id?.name,
      part_stock: item.part_id?.quantity_in_stock,
      quantity_required: item.quantity_required
    })));
    
    res.json(assembly);
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
    console.log('Creating assembly with data:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const assembly = new Assembly({
      name: req.body.name,
      description: req.body.description,
      category: req.body.category || 'Assembly',
      estimated_build_time: req.body.estimated_build_time || 0,
      build_cost: req.body.build_cost || 0,
      notes: req.body.notes,
      created_by: req.body.created_by || 'system',
      bom_items: [] // Start with empty BOM
    });
    
    await assembly.save();
    
    res.status(201).json(assembly);
  } catch (error) {
    console.error('Error creating assembly:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update assembly
const updateAssembly = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const assembly = await Assembly.findById(req.params.id);
    if (!assembly) {
      return res.status(404).json({ error: 'Assembly not found' });
    }
    
    // Don't allow updating assembly_id
    const updateData = { ...req.body };
    delete updateData.assembly_id;
    
    Object.assign(assembly, updateData);
    await assembly.save();
    
    await assembly.populate('bom_items.part_id', 'part_id name unit cost_per_unit');
    
    res.json(assembly);
  } catch (error) {
    console.error('Error updating assembly:', error);
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
    
    await Assembly.findByIdAndDelete(req.params.id);
    res.json({ message: 'Assembly deleted successfully' });
  } catch (error) {
    console.error('Error deleting assembly:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add BOM item to assembly
const addBOMItem = async (req, res) => {
  try {
    console.log('=== ADD BOM ITEM ===');
    console.log('Assembly ID:', req.params.id);
    console.log('Request body:', req.body);
    
    const { part_id, quantity_required, notes } = req.body;
    
    if (!part_id || !quantity_required || quantity_required <= 0) {
      return res.status(400).json({ error: 'Valid part_id and quantity_required are required' });
    }
    
    const assembly = await Assembly.findById(req.params.id);
    if (!assembly) {
      return res.status(404).json({ error: 'Assembly not found' });
    }
    
    const part = await Part.findById(part_id);
    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }
    
    console.log('Found part:', {
      part_id: part.part_id,
      name: part.name,
      current_stock: part.quantity_in_stock
    });
    
    // Check if part already exists in BOM
    const existingItem = assembly.bom_items.find(item => 
      item.part_id.toString() === part_id
    );
    
    if (existingItem) {
      return res.status(400).json({ error: 'Part already exists in BOM' });
    }
    
    assembly.bom_items.push({
      part_id,
      quantity_required: parseFloat(quantity_required),
      notes: notes || ''
    });
    
    await assembly.save();
    console.log('BOM item added successfully');
    
    // Populate the assembly with detailed part information
    await assembly.populate({
      path: 'bom_items.part_id',
      select: 'part_id name unit cost_per_unit quantity_in_stock type category'
    });
    
    console.log('Populated BOM items:', assembly.bom_items.map(item => ({
      part_name: item.part_id.name,
      part_stock: item.part_id.quantity_in_stock,
      quantity_required: item.quantity_required
    })));
    
    res.json(assembly);
  } catch (error) {
    console.error('Error adding BOM item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Remove BOM item from assembly
const removeBOMItem = async (req, res) => {
  try {
    console.log('=== REMOVE BOM ITEM ===');
    console.log('Assembly ID:', req.params.id);
    console.log('Item ID:', req.params.itemId);
    
    const { itemId } = req.params;
    
    const assembly = await Assembly.findById(req.params.id);
    if (!assembly) {
      return res.status(404).json({ error: 'Assembly not found' });
    }
    
    const initialLength = assembly.bom_items.length;
    assembly.bom_items = assembly.bom_items.filter(item => 
      item._id.toString() !== itemId
    );
    
    if (assembly.bom_items.length === initialLength) {
      return res.status(404).json({ error: 'BOM item not found' });
    }
    
    await assembly.save();
    console.log('BOM item removed successfully');
    
    // Populate the assembly with detailed part information
    await assembly.populate({
      path: 'bom_items.part_id',
      select: 'part_id name unit cost_per_unit quantity_in_stock type category'
    });
    
    res.json(assembly);
  } catch (error) {
    console.error('Error removing BOM item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Build assembly
const buildAssembly = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { quantity = 1 } = req.body;
    const assemblyId = req.params.id;
    
    if (quantity <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }
    
    const assembly = await Assembly.findById(assemblyId).session(session);
    if (!assembly) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Assembly not found' });
    }
    
    if (!assembly.bom_items || assembly.bom_items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Assembly has no BOM items defined' });
    }
    
    // Check if assembly can be built
    const buildCheck = await assembly.canBuild(quantity);
    if (!buildCheck.canBuild) {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: 'Cannot build assembly',
        reason: buildCheck.reason,
        insufficientParts: buildCheck.insufficientParts
      });
    }
    
    const stockTransactions = [];
    
    // Deduct stock for each BOM item
    for (const bomItem of assembly.bom_items) {
      const requiredQuantity = bomItem.quantity_required * quantity;
      
      const part = await Part.findById(bomItem.part_id).session(session);
      if (!part) {
        await session.abortTransaction();
        return res.status(400).json({ error: `Part not found: ${bomItem.part_id}` });
      }
      
      const previousStock = part.quantity_in_stock;
      const newStock = previousStock - requiredQuantity;
      
      // Update part stock
      await Part.updateOne(
        { _id: bomItem.part_id },
        { $set: { quantity_in_stock: newStock } },
        { session }
      );
      
      // Generate transaction ID
      const transactionId = await generateTransactionId(session);
      
      // Create stock transaction
      const stockTransaction = new StockTransaction({
        transaction_id: transactionId,
        part_reference: bomItem.part_id,
        transaction_type: 'ASSEMBLY_BUILD',
        quantity: requiredQuantity,
        unit_price: part.cost_per_unit || 0,
        total_value: (part.cost_per_unit || 0) * requiredQuantity,
        reference: assembly.assembly_id,
        reference_type: 'ASSEMBLY_ID',
        assembly_reference: assemblyId,
        notes: `Used in assembly build: ${assembly.name} (Qty: ${quantity})`,
        created_by: req.body.created_by || 'system',
        previous_stock: previousStock,
        new_stock: newStock,
        date: new Date()
      });
      
      await stockTransaction.save({ session });
      stockTransactions.push(stockTransaction);
    }
    
    // Update assembly ready_built count
    assembly.ready_built = (assembly.ready_built || 0) + quantity;
    await assembly.save({ session });
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      message: `Successfully built ${quantity} unit(s) of ${assembly.name}`,
      assembly: {
        assembly_id: assembly.assembly_id,
        name: assembly.name,
        quantity_built: quantity,
        ready_built: assembly.ready_built,
        total_built: assembly.total_built
      },
      parts_consumed: stockTransactions.map(t => ({
        part_name: t.part_reference?.name,
        quantity_used: t.quantity,
        transaction_id: t.transaction_id
      })),
      transactions_created: stockTransactions.length
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Error building assembly:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    session.endSession();
  }
};

// Ship assembly
const shipAssembly = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { quantity = 1, shipping_details, tracking_number, customer_info } = req.body;
    const assemblyId = req.params.id;
    
    console.log('=== SHIP ASSEMBLY ===');
    console.log('Assembly ID:', assemblyId);
    console.log('Quantity:', quantity);
    console.log('Shipping details:', { shipping_details, tracking_number, customer_info });
    
    if (quantity <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }
    
    const assembly = await Assembly.findById(assemblyId).session(session);
    if (!assembly) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Assembly not found' });
    }
    
    console.log('Found assembly:', {
      assembly_id: assembly.assembly_id,
      name: assembly.name,
      ready_built: assembly.ready_built
    });
    
    if ((assembly.ready_built || 0) < quantity) {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: 'Insufficient ready-built assemblies',
        available: assembly.ready_built || 0,
        requested: quantity
      });
    }
    
    // Update assembly counts
    const previousReadyBuilt = assembly.ready_built || 0;
    assembly.ready_built = previousReadyBuilt - quantity;
    assembly.total_shipped = (assembly.total_shipped || 0) + quantity;
    await assembly.save({ session });
    
    console.log('Updated assembly counts:', {
      previous_ready_built: previousReadyBuilt,
      new_ready_built: assembly.ready_built,
      total_shipped: assembly.total_shipped
    });
    
    // Generate transaction ID
    const transactionId = await generateTransactionId(session);
    console.log('Generated transaction ID:', transactionId);
    
    // Create shipping details string
    const shippingDetailsString = [
      shipping_details,
      tracking_number ? `Tracking: ${tracking_number}` : null,
      customer_info ? `Customer: ${customer_info}` : null
    ].filter(Boolean).join(' | ') || 'No details provided';
    
    // Create shipment transaction record (assembly-only transaction, no part_reference)
    const shipmentTransaction = new StockTransaction({
      transaction_id: transactionId,
      // part_reference is intentionally omitted for assembly shipments
      assembly_reference: assemblyId,
      transaction_type: 'ASSEMBLY_SHIP',
      quantity: quantity,
      unit_price: assembly.build_cost || 0,
      total_value: (assembly.build_cost || 0) * quantity,
      reference: assembly.assembly_id,
      reference_type: 'ASSEMBLY_ID',
      notes: `Assembly shipped: ${assembly.name} (Qty: ${quantity}) - ${shippingDetailsString}`,
      created_by: req.body.created_by || 'system',
      previous_stock: previousReadyBuilt,
      new_stock: assembly.ready_built,
      date: new Date()
    });
    
    console.log('Creating shipment transaction:', {
      transaction_id: shipmentTransaction.transaction_id,
      assembly_reference: shipmentTransaction.assembly_reference,
      transaction_type: shipmentTransaction.transaction_type,
      quantity: shipmentTransaction.quantity,
      notes: shipmentTransaction.notes
    });
    
    await shipmentTransaction.save({ session });
    console.log('Shipment transaction saved successfully');
    
    await session.commitTransaction();
    console.log('Transaction committed successfully');
    
    res.json({
      success: true,
      message: `Successfully shipped ${quantity} unit(s) of ${assembly.name}`,
      assembly: {
        assembly_id: assembly.assembly_id,
        name: assembly.name,
        quantity_shipped: quantity,
        ready_built: assembly.ready_built,
        total_shipped: assembly.total_shipped,
        total_built: (assembly.ready_built || 0) + (assembly.total_shipped || 0)
      },
      transaction: {
        transaction_id: shipmentTransaction.transaction_id,
        notes: shipmentTransaction.notes
      },
      shipping_details: {
        tracking_number: tracking_number || null,
        customer_info: customer_info || null,
        details: shipping_details || null
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Error shipping assembly:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to ship assembly',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

// Dismantle assembly
const dismantleAssembly = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { quantity = 1, reason } = req.body;
    const assemblyId = req.params.id;
    
    if (quantity <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }
    
    const assembly = await Assembly.findById(assemblyId).session(session);
    if (!assembly) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Assembly not found' });
    }
    
    if ((assembly.ready_built || 0) < quantity) {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: 'Insufficient ready-built assemblies to dismantle',
        available: assembly.ready_built || 0,
        requested: quantity
      });
    }
    
    if (!assembly.bom_items || assembly.bom_items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Assembly has no BOM items defined' });
    }
    
    const stockTransactions = [];
    
    // Restore stock for each BOM item
    for (const bomItem of assembly.bom_items) {
      const restoreQuantity = bomItem.quantity_required * quantity;
      
      const part = await Part.findById(bomItem.part_id).session(session);
      if (!part) {
        await session.abortTransaction();
        return res.status(400).json({ error: `Part not found: ${bomItem.part_id}` });
      }
      
      const previousStock = part.quantity_in_stock;
      const newStock = previousStock + restoreQuantity;
      
      // Update part stock
      await Part.updateOne(
        { _id: bomItem.part_id },
        { $set: { quantity_in_stock: newStock } },
        { session }
      );
      
      // Generate transaction ID
      const transactionId = await generateTransactionId(session);
      
      // Create stock transaction
      const stockTransaction = new StockTransaction({
        transaction_id: transactionId,
        part_reference: bomItem.part_id,
        transaction_type: 'ASSEMBLY_DISASSEMBLE',
        quantity: restoreQuantity,
        unit_price: part.cost_per_unit || 0,
        total_value: (part.cost_per_unit || 0) * restoreQuantity,
        reference: assembly.assembly_id,
        reference_type: 'ASSEMBLY_ID',
        assembly_reference: assemblyId,
        notes: `Parts restored from assembly dismantle: ${assembly.name} (Qty: ${quantity}) - ${reason || 'No reason provided'}`,
        created_by: req.body.created_by || 'system',
        previous_stock: previousStock,
        new_stock: newStock,
        date: new Date()
      });
      
      await stockTransaction.save({ session });
      stockTransactions.push(stockTransaction);
    }
    
    // Update assembly counts
    assembly.ready_built = (assembly.ready_built || 0) - quantity;
    assembly.total_dismantled = (assembly.total_dismantled || 0) + quantity;
    await assembly.save({ session });
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      message: `Successfully dismantled ${quantity} unit(s) of ${assembly.name}`,
      assembly: {
        assembly_id: assembly.assembly_id,
        name: assembly.name,
        quantity_dismantled: quantity,
        ready_built: assembly.ready_built,
        total_dismantled: assembly.total_dismantled,
        total_built: assembly.total_built
      },
      parts_restored: stockTransactions.map(t => ({
        part_name: t.part_reference?.name,
        quantity_restored: t.quantity,
        transaction_id: t.transaction_id
      })),
      transactions_created: stockTransactions.length
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Error dismantling assembly:', error);
    res.status(500).json({ error: 'Internal server error' });
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

module.exports = {
  validateAssembly,
  getAllAssemblies,
  getAssemblyById,
  createAssembly,
  updateAssembly,
  deleteAssembly,
  addBOMItem,
  removeBOMItem,
  buildAssembly,
  shipAssembly,
  dismantleAssembly
};
