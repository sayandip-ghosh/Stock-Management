const Assembly = require('../models/Assembly');
const AssemblyDetail = require('../models/AssemblyDetail');
const Product = require('../models/Product');
const Part = require('../models/Part');
const BOM = require('../models/BOM');
const StockTransaction = require('../models/StockTransaction');
const mongoose = require('mongoose');

// Get all assemblies
const getAllAssemblies = async (req, res) => {
  try {
    // Get all assemblies, not just active ones, so newly created assemblies are visible
    const assemblies = await Assembly.find()
      .sort({ name: 1 });
    
    console.log('Found assemblies:', assemblies.length);
    console.log('Assemblies data:', assemblies);
    
    res.json({
      success: true,
      data: assemblies
    });
  } catch (error) {
    console.error('Error fetching assemblies:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assemblies',
      error: error.message
    });
  }
};

// Get assembly by ID
const getAssemblyById = async (req, res) => {
  try {
    const assembly = await Assembly.findById(req.params.id);
    
    if (!assembly) {
      return res.status(404).json({
        success: false,
        message: 'Assembly not found'
      });
    }
    
    res.json({
      success: true,
      data: assembly
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching assembly',
      error: error.message
    });
  }
};

// Create new assembly
const createAssembly = async (req, res) => {
  try {
    console.log('Creating assembly with data:', req.body);
    
    const assemblyData = {
      ...req.body,
      created_by: req.body.created_by || 'system'
    };
    
    console.log('Processed assembly data:', assemblyData);
    
    const assembly = new Assembly(assemblyData);
    await assembly.save();
    
    console.log('Assembly saved successfully:', assembly);
    
    res.status(201).json({
      success: true,
      message: 'Assembly created successfully',
      data: assembly
    });
  } catch (error) {
    console.error('Error creating assembly:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating assembly',
      error: error.message
    });
  }
};

// Update assembly
const updateAssembly = async (req, res) => {
  try {
    const assembly = await Assembly.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!assembly) {
      return res.status(404).json({
        success: false,
        message: 'Assembly not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Assembly updated successfully',
      data: assembly
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating assembly',
      error: error.message
    });
  }
};

// Delete assembly (soft delete)
const deleteAssembly = async (req, res) => {
  try {
    const assembly = await Assembly.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    );
    
    if (!assembly) {
      return res.status(404).json({
        success: false,
        message: 'Assembly not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Assembly deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting assembly',
      error: error.message
    });
  }
};

// Get assembly details
const getAssemblyDetails = async (req, res) => {
  try {
    const { assemblyId } = req.params;
    
    const assembly = await Assembly.findById(assemblyId);
    if (!assembly) {
      return res.status(404).json({
        success: false,
        message: 'Assembly not found'
      });
    }
    
    const details = await AssemblyDetail.find({ assembly_id: assemblyId })
      .populate('part_id', 'part_id name quantity_in_stock unit cost_per_unit')
      .sort({ sequence: 1 });
    
    res.json({
      success: true,
      data: {
        assembly,
        details
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching assembly details',
      error: error.message
    });
  }
};

// CORE ASSEMBLY FUNCTIONALITY - Assemble Product using BOM
const assembleProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { productId, quantity, notes, createdBy } = req.body;
    
    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and valid quantity are required'
      });
    }
    
    // Get product and check if it's assemblable
    const product = await Product.findById(productId).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    if (!product.isAssembled) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'This product is not assemblable — direct stock updates only'
      });
    }
    
    // Check if BOM exists
    const hasBOM = await BOM.hasBOM(productId);
    if (!hasBOM) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'This product has no BOM — direct stock updates only'
      });
    }
    
    // Get BOM items
    const bomItems = await BOM.getProductBOM(productId);
    if (!bomItems || bomItems.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'No BOM items found for this product'
      });
    }
    
    // Check stock availability for all parts
    const stockCheck = [];
    let totalPartsCost = 0;
    
    for (const bomItem of bomItems) {
      const part = bomItem.partId;
      const requiredQty = bomItem.quantityPerUnit * quantity;
      
      if (part.quantity_in_stock < requiredQty) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for part ${part.name} (${part.part_id}). Required: ${requiredQty}, Available: ${part.quantity_in_stock}`,
          part: {
            id: part._id,
            name: part.name,
            partId: part.part_id,
            required: requiredQty,
            available: part.quantity_in_stock
          }
        });
      }
      
      const partCost = (part.cost_per_unit || 0) * requiredQty;
      totalPartsCost += partCost;
      
      stockCheck.push({
        partId: part._id,
        partName: part.name,
        partIdString: part.part_id,
        quantityRequired: requiredQty,
        quantityDeducted: requiredQty,
        unit: part.unit,
        costPerUnit: part.cost_per_unit || 0,
        totalCost: partCost,
        previousStock: part.quantity_in_stock,
        newStock: part.quantity_in_stock - requiredQty
      });
    }
    
    // Deduct parts from stock
    for (const stockItem of stockCheck) {
      const part = await Part.findById(stockItem.partId).session(session);
      await part.updateStock(stockItem.quantityDeducted, 'out');
      
      // Create stock transaction for part deduction
      const partTransaction = new StockTransaction({
        part_reference: part._id,
        transaction_type: 'ASSEMBLY_BUILD',
        quantity: -stockItem.quantityDeducted,
        unit_price: stockItem.costPerUnit,
        total_value: stockItem.totalCost,
        reference: `Assembly: ${product.product_id}`,
        reference_type: 'ASSEMBLY_ID',
        notes: `Part consumed for ${product.name} assembly`,
        created_by: createdBy || 'system',
        previous_stock: stockItem.previousStock,
        new_stock: stockItem.newStock
      });
      
      await partTransaction.save({ session });
    }
    
    // Increase product stock
    const previousProductStock = product.stockQty;
    await product.updateStock(quantity, 'in');
    
    // Create stock transaction for product increase
    const productTransaction = new StockTransaction({
      part_reference: product._id,
      transaction_type: 'ASSEMBLY_BUILD',
      quantity: quantity,
        unit_price: totalPartsCost / quantity,
        total_value: totalPartsCost,
        reference: `Assembly: ${product.product_id}`,
        reference_type: 'ASSEMBLY_ID',
        notes: `Product assembled from parts`,
        created_by: createdBy || 'system',
        previous_stock: previousProductStock,
        new_stock: product.stockQty
    });
    
    await productTransaction.save({ session });
    
    // Update product assembly count
    await product.incrementAssemblyCount(quantity);
    
    // Create assembly record (using existing Assembly model)
    const assembly = new Assembly({
      name: `${product.name} Assembly`,
      description: `Assembly of ${quantity} units of ${product.name}`,
      category: product.category || 'Assembly',
      notes: notes || `BOM-based assembly of ${quantity} units`,
      created_by: createdBy || 'system',
      last_built: new Date(),
      total_built: quantity
    });
    
    await assembly.save({ session });
    
    // Create assembly details
    for (const stockItem of stockCheck) {
      const assemblyDetail = new AssemblyDetail({
        assembly_id: assembly._id,
        part_id: stockItem.partId,
        quantity_required: stockItem.quantityDeducted,
        unit: stockItem.unit,
        sequence: stockCheck.indexOf(stockItem) + 1
      });
      
      await assemblyDetail.save({ session });
    }
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      message: `Successfully assembled ${quantity} units of ${product.name}`,
      data: {
        product: {
          id: product._id,
          name: product.name,
          productId: product.product_id,
          newStock: product.stockQty
        },
        assembly: {
          id: assembly._id,
          assemblyId: assembly.assembly_id
        },
        partsUsed: stockCheck,
        totalPartsCost,
        costPerUnit: totalPartsCost / quantity
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: 'Error during assembly process',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Get assembly history for a product
const getProductAssemblyHistory = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Get recent assembly transactions
    const assemblyTransactions = await StockTransaction.find({
      part_reference: productId,
      transaction_type: 'ASSEMBLY_BUILD',
      quantity: { $gt: 0 } // Only product increases, not part deductions
    })
    .sort({ date: -1 })
    .limit(20);
    
    res.json({
      success: true,
      data: {
        product,
        assemblyHistory: assemblyTransactions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching assembly history',
      error: error.message
    });
  }
};

module.exports = {
  getAllAssemblies,
  getAssemblyById,
  createAssembly,
  updateAssembly,
  deleteAssembly,
  getAssemblyDetails,
  assembleProduct,
  getProductAssemblyHistory
};
