const Product = require('../models/Product');
const BOM = require('../models/BOM');

// Get all products
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

// Get product by ID
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
};

// Create new product
const createProduct = async (req, res) => {
  try {
    const productData = {
      ...req.body,
      createdBy: req.body.createdBy || 'system'
    };
    
    const product = new Product(productData);
    await product.save();
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
};

// Delete product (soft delete)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
};

// Get products that can be assembled
const getAssemblableProducts = async (req, res) => {
  try {
    const products = await Product.find({ 
      isAssembled: true, 
      isActive: true 
    }).sort({ name: 1 });
    
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching assemblable products',
      error: error.message
    });
  }
};

// Get product with BOM details
const getProductWithBOM = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    let bomDetails = null;
    if (product.isAssembled) {
      bomDetails = await BOM.getBOMSummary(req.params.id);
    }
    
    res.json({
      success: true,
      data: {
        product,
        bom: bomDetails
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product with BOM',
      error: error.message
    });
  }
};

// Update product stock
const updateProductStock = async (req, res) => {
  try {
    const { quantity, type, notes } = req.body;
    
    if (!quantity || !type) {
      return res.status(400).json({
        success: false,
        message: 'Quantity and type are required'
      });
    }
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    await product.updateStock(quantity, type);
    
    res.json({
      success: true,
      message: 'Product stock updated successfully',
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating product stock',
      error: error.message
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAssemblableProducts,
  getProductWithBOM,
  updateProductStock
};
