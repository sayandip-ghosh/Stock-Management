const ScrapItem = require('../models/ScrapItem');
const RawItem = require('../models/RawItem');

// Get all scrap items
const getAllScrapItems = async (req, res) => {
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
      populate: 'raw_item_id'
    };
    
    const scrapItems = await ScrapItem.find(filter, null, options).populate('raw_item_id');
    const total = await ScrapItem.countDocuments(filter);
    
    res.json({
      success: true,
      data: scrapItems,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching scrap items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scrap items',
      error: error.message
    });
  }
};

// Get scrap item by ID
const getScrapItemById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const scrapItem = await ScrapItem.findById(id).populate('raw_item_id');
    
    if (!scrapItem) {
      return res.status(404).json({
        success: false,
        message: 'Scrap item not found'
      });
    }
    
    res.json({
      success: true,
      data: scrapItem
    });
  } catch (error) {
    console.error('Error fetching scrap item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scrap item',
      error: error.message
    });
  }
};

// Create new scrap item
const createScrapItem = async (req, res) => {
  try {
    const scrapItemData = req.body;
    
    // Validate required fields
    if (!scrapItemData.raw_item_id || !scrapItemData.name || !scrapItemData.material_type) {
      return res.status(400).json({
        success: false,
        message: 'Raw item ID, name and material type are required'
      });
    }
    
    // Verify that the raw item exists
    const rawItem = await RawItem.findById(scrapItemData.raw_item_id);
    if (!rawItem) {
      return res.status(400).json({
        success: false,
        message: 'Referenced raw item not found'
      });
    }
    
    const scrapItem = new ScrapItem(scrapItemData);
    await scrapItem.save();
    
    // Populate the raw_item_id field for response
    await scrapItem.populate('raw_item_id');
    
    res.status(201).json({
      success: true,
      message: 'Scrap item created successfully',
      data: scrapItem
    });
  } catch (error) {
    console.error('Error creating scrap item:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create scrap item',
      error: error.message
    });
  }
};

// Update scrap item
const updateScrapItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updateData.item_id;
    delete updateData.created_at;
    delete updateData.updated_at;
    
    const scrapItem = await ScrapItem.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('raw_item_id');
    
    if (!scrapItem) {
      return res.status(404).json({
        success: false,
        message: 'Scrap item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Scrap item updated successfully',
      data: scrapItem
    });
  } catch (error) {
    console.error('Error updating scrap item:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update scrap item',
      error: error.message
    });
  }
};

// Delete scrap item (soft delete)
const deleteScrapItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    const scrapItem = await ScrapItem.findByIdAndUpdate(
      id,
      { is_active: false },
      { new: true }
    );
    
    if (!scrapItem) {
      return res.status(404).json({
        success: false,
        message: 'Scrap item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Scrap item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting scrap item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete scrap item',
      error: error.message
    });
  }
};

// Update stock for scrap item
const updateScrapItemStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, type, reason } = req.body;
    
    if (!quantity || !type) {
      return res.status(400).json({
        success: false,
        message: 'Quantity and type are required'
      });
    }
    
    const scrapItem = await ScrapItem.findById(id);
    
    if (!scrapItem) {
      return res.status(404).json({
        success: false,
        message: 'Scrap item not found'
      });
    }
    
    await scrapItem.updateStock(quantity, type);
    
    // Populate the raw_item_id field for response
    await scrapItem.populate('raw_item_id');
    
    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: scrapItem
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

// Get scrap items by raw item ID
const getScrapItemsByRawItem = async (req, res) => {
  try {
    const { rawItemId } = req.params;
    
    const scrapItems = await ScrapItem.find({
      raw_item_id: rawItemId,
      is_active: true
    }).populate('raw_item_id').sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: scrapItems,
      count: scrapItems.length
    });
  } catch (error) {
    console.error('Error fetching scrap items by raw item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scrap items',
      error: error.message
    });
  }
};

// Add scrap from manufacturing operation
const addScrapFromOperation = async (req, res) => {
  try {
    const { raw_item_id, quantity, source_operation, source_details } = req.body;
    
    if (!raw_item_id || !quantity || !source_operation) {
      return res.status(400).json({
        success: false,
        message: 'Raw item ID, quantity, and source operation are required'
      });
    }
    
    // Get the raw item details
    const rawItem = await RawItem.findById(raw_item_id);
    if (!rawItem) {
      return res.status(404).json({
        success: false,
        message: 'Raw item not found'
      });
    }
    
    // Add the scrap quantity back to the raw item's stock
    await rawItem.updateStock(quantity, 'in');
    
    // Check if scrap item already exists for this raw item
    let scrapItem = await ScrapItem.findOne({
      raw_item_id: raw_item_id,
      is_active: true
    });
    
    if (scrapItem) {
      // Update existing scrap item
      await scrapItem.updateStock(quantity, 'in');
    } else {
      // Create new scrap item
      scrapItem = new ScrapItem({
        raw_item_id: raw_item_id,
        name: `${rawItem.name} (Scrap)`,
        material_type: rawItem.material_type,
        dimensions: rawItem.dimensions,
        unit: rawItem.unit,
        quantity_available: quantity,
        cost_per_unit: rawItem.cost_per_unit * 0.5, // Scrap is typically worth less
        location: rawItem.location,
        description: `Scrap from ${rawItem.name}`,
        specifications: rawItem.specifications,
        source_operation: source_operation,
        source_details: source_details
      });
      
      await scrapItem.save();
    }
    
    // Populate the raw_item_id field for response
    await scrapItem.populate('raw_item_id');
    
    res.status(201).json({
      success: true,
      message: 'Scrap added successfully and raw item stock updated',
      data: scrapItem,
      rawItemUpdated: {
        id: rawItem._id,
        newStock: rawItem.quantity_in_stock
      }
    });
  } catch (error) {
    console.error('Error adding scrap from operation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add scrap',
      error: error.message
    });
  }
};

// Use scrap item (reduce quantity)
const useScrapItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, reason } = req.body;
    
    if (!quantity) {
      return res.status(400).json({
        success: false,
        message: 'Quantity is required'
      });
    }
    
    const scrapItem = await ScrapItem.findById(id);
    
    if (!scrapItem) {
      return res.status(404).json({
        success: false,
        message: 'Scrap item not found'
      });
    }
    
    if (scrapItem.quantity_available < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient scrap quantity available'
      });
    }
    
    // Reduce scrap item quantity
    await scrapItem.updateStock(quantity, 'out');
    
    // Also reduce the raw item stock since scrap is being used
    const rawItem = await RawItem.findById(scrapItem.raw_item_id);
    if (rawItem) {
      await rawItem.updateStock(quantity, 'out');
    }
    
    // Populate the raw_item_id field for response
    await scrapItem.populate('raw_item_id');
    
    res.json({
      success: true,
      message: 'Scrap used successfully and raw item stock updated',
      data: scrapItem,
      rawItemUpdated: rawItem ? {
        id: rawItem._id,
        newStock: rawItem.quantity_in_stock
      } : null
    });
  } catch (error) {
    console.error('Error using scrap item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to use scrap item',
      error: error.message
    });
  }
};

module.exports = {
  getAllScrapItems,
  getScrapItemById,
  createScrapItem,
  updateScrapItem,
  deleteScrapItem,
  updateScrapItemStock,
  getScrapItemsByRawItem,
  addScrapFromOperation,
  useScrapItem
};
