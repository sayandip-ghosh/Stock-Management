const BOM = require('../models/BOM');
const Product = require('../models/Product');
const Part = require('../models/Part');

// Get all BOM entries
const getAllBOMs = async (req, res) => {
  try {
    const boms = await BOM.find({ isActive: true })
      .populate('productId', 'product_id name isAssembled')
      .populate('partId', 'part_id name quantity_in_stock unit cost_per_unit')
      .sort({ 'productId.name': 1, 'partId.name': 1 });
    
    res.json({
      success: true,
      data: boms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching BOMs',
      error: error.message
    });
  }
};

// Get BOM by ID
const getBOMById = async (req, res) => {
  try {
    const bom = await BOM.findById(req.params.id)
      .populate('productId', 'product_id name isAssembled')
      .populate('partId', 'part_id name quantity_in_stock unit cost_per_unit');
    
    if (!bom) {
      return res.status(404).json({
        success: false,
        message: 'BOM not found'
      });
    }
    
    res.json({
      success: true,
      data: bom
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching BOM',
      error: error.message
    });
  }
};

// Get BOM for a specific product
const getProductBOM = async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Check if product exists and is assemblable
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    if (!product.isAssembled) {
      return res.status(400).json({
        success: false,
        message: 'This product is not assemblable'
      });
    }
    
    const bomItems = await BOM.getProductBOM(productId);
    const bomSummary = await BOM.getBOMSummary(productId);
    
    res.json({
      success: true,
      data: {
        product,
        bomItems,
        summary: bomSummary
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product BOM',
      error: error.message
    });
  }
};

// Create new BOM entry
const createBOM = async (req, res) => {
  try {
    const { productId, partId, quantityPerUnit, isOptional, notes } = req.body;
    
    // Validate required fields
    if (!productId || !partId || !quantityPerUnit) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, Part ID, and quantity per unit are required'
      });
    }
    
    // Check if product exists and is assemblable
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    if (!product.isAssembled) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add BOM to non-assemblable product'
      });
    }
    
    // Check if part exists
    const part = await Part.findById(partId);
    if (!part) {
      return res.status(404).json({
        success: false,
        message: 'Part not found'
      });
    }
    
    // Check if BOM entry already exists
    const existingBOM = await BOM.findOne({
      productId,
      partId,
      isActive: true
    });
    
    if (existingBOM) {
      return res.status(400).json({
        success: false,
        message: 'BOM entry already exists for this product-part combination'
      });
    }
    
    const bomData = {
      productId,
      partId,
      quantityPerUnit,
      isOptional: isOptional || false,
      notes: notes || '',
      createdBy: req.body.createdBy || 'system'
    };
    
    const bom = new BOM(bomData);
    await bom.save();
    
    // Populate references for response
    await bom.populate('productId', 'product_id name');
    await bom.populate('partId', 'part_id name');
    
    res.status(201).json({
      success: true,
      message: 'BOM entry created successfully',
      data: bom
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating BOM entry',
      error: error.message
    });
  }
};

// Update BOM entry
const updateBOM = async (req, res) => {
  try {
    const { quantityPerUnit, isOptional, notes } = req.body;
    
    const updateData = {};
    if (quantityPerUnit !== undefined) updateData.quantityPerUnit = quantityPerUnit;
    if (isOptional !== undefined) updateData.isOptional = isOptional;
    if (notes !== undefined) updateData.notes = notes;
    
    const bom = await BOM.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('productId', 'product_id name')
     .populate('partId', 'part_id name');
    
    if (!bom) {
      return res.status(404).json({
        success: false,
        message: 'BOM entry not found'
      });
    }
    
    res.json({
      success: true,
      message: 'BOM entry updated successfully',
      data: bom
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating BOM entry',
      error: error.message
    });
  }
};

// Delete BOM entry (soft delete)
const deleteBOM = async (req, res) => {
  try {
    const bom = await BOM.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!bom) {
      return res.status(404).json({
        success: false,
        message: 'BOM entry not found'
      });
    }
    
    res.json({
      success: true,
      message: 'BOM entry deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting BOM entry',
      error: error.message
    });
  }
};

// Get all products that use a specific part
const getProductsUsingPart = async (req, res) => {
  try {
    const { partId } = req.params;
    
    // Check if part exists
    const part = await Part.findById(partId);
    if (!part) {
      return res.status(404).json({
        success: false,
        message: 'Part not found'
      });
    }
    
    const products = await BOM.getProductsUsingPart(partId);
    
    res.json({
      success: true,
      data: {
        part,
        products
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching products using part',
      error: error.message
    });
  }
};

// Check if product has BOM
const checkProductBOM = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const hasBOM = await BOM.hasBOM(productId);
    
    res.json({
      success: true,
      data: {
        productId,
        hasBOM
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking product BOM',
      error: error.message
    });
  }
};

module.exports = {
  getAllBOMs,
  getBOMById,
  getProductBOM,
  createBOM,
  updateBOM,
  deleteBOM,
  getProductsUsingPart,
  checkProductBOM
};
