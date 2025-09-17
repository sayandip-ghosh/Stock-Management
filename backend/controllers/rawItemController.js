const RawItem = require('../models/RawItem');

// Get all raw items
const getAllRawItems = async (req, res) => {
  try {
    const { page = 1, limit = 50, material_type, search, sortBy = 'name', sortOrder = 'asc' } = req.query;
    
    // Build filter object
    const filter = { is_active: true };
    
    if (material_type) {
      filter.material_type = material_type;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { item_id: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: []
    };
    
    const rawItems = await RawItem.find(filter, null, options);
    const total = await RawItem.countDocuments(filter);
    
    res.json({
      success: true,
      data: rawItems,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching raw items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch raw items',
      error: error.message
    });
  }
};

// Get raw item by ID
const getRawItemById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const rawItem = await RawItem.findById(id);
    
    if (!rawItem) {
      return res.status(404).json({
        success: false,
        message: 'Raw item not found'
      });
    }
    
    res.json({
      success: true,
      data: rawItem
    });
  } catch (error) {
    console.error('Error fetching raw item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch raw item',
      error: error.message
    });
  }
};

// Create new raw item
const createRawItem = async (req, res) => {
  try {
    const rawItemData = req.body;
    
    // Validate required fields
    if (!rawItemData.name || !rawItemData.material_type) {
      return res.status(400).json({
        success: false,
        message: 'Name and material type are required'
      });
    }
    
    const rawItem = new RawItem(rawItemData);
    await rawItem.save();
    
    res.status(201).json({
      success: true,
      message: 'Raw item created successfully',
      data: rawItem
    });
  } catch (error) {
    console.error('Error creating raw item:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create raw item',
      error: error.message
    });
  }
};

// Update raw item
const updateRawItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updateData.item_id;
    delete updateData.created_at;
    delete updateData.updated_at;
    
    const rawItem = await RawItem.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!rawItem) {
      return res.status(404).json({
        success: false,
        message: 'Raw item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Raw item updated successfully',
      data: rawItem
    });
  } catch (error) {
    console.error('Error updating raw item:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update raw item',
      error: error.message
    });
  }
};

// Delete raw item (soft delete)
const deleteRawItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    const rawItem = await RawItem.findByIdAndUpdate(
      id,
      { is_active: false },
      { new: true }
    );
    
    if (!rawItem) {
      return res.status(404).json({
        success: false,
        message: 'Raw item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Raw item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting raw item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete raw item',
      error: error.message
    });
  }
};

// Update stock for raw item
const updateRawItemStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, type, reason } = req.body;
    
    if (!quantity || !type) {
      return res.status(400).json({
        success: false,
        message: 'Quantity and type are required'
      });
    }
    
    const rawItem = await RawItem.findById(id);
    
    if (!rawItem) {
      return res.status(404).json({
        success: false,
        message: 'Raw item not found'
      });
    }
    
    await rawItem.updateStock(quantity, type);
    
    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: rawItem
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock',
      error: error.message
    });
  }
};

// Get low stock raw items
const getLowStockRawItems = async (req, res) => {
  try {
    const rawItems = await RawItem.find({
      is_active: true,
      $expr: { $lte: ['$quantity_in_stock', '$min_stock_level'] }
    }).sort({ quantity_in_stock: 1 });
    
    res.json({
      success: true,
      data: rawItems,
      count: rawItems.length
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock items',
      error: error.message
    });
  }
};

// Get raw items by material type
const getRawItemsByMaterialType = async (req, res) => {
  try {
    const { materialType } = req.params;
    
    const rawItems = await RawItem.find({
      material_type: materialType,
      is_active: true
    }).sort({ name: 1 });
    
    res.json({
      success: true,
      data: rawItems,
      count: rawItems.length
    });
  } catch (error) {
    console.error('Error fetching raw items by material type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch raw items',
      error: error.message
    });
  }
};

module.exports = {
  getAllRawItems,
  getRawItemById,
  createRawItem,
  updateRawItem,
  deleteRawItem,
  updateRawItemStock,
  getLowStockRawItems,
  getRawItemsByMaterialType
};

