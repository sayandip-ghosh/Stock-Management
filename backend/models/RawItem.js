const mongoose = require('mongoose');

const rawItemSchema = new mongoose.Schema({
  item_id: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  material_type: {
    type: String,
    required: true,
    
  },
  dimensions: {
    width: Number,
    height: Number,
    length: Number,
    thickness: Number,
    diameter: Number,
    gauge: String
  },
  unit: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20,
    default: 'KG'
  },
  quantity_in_stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  min_stock_level: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  cost_per_unit: {
    type: Number,
    min: 0,
    default: 0
  },
  location: {
    type: String,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  specifications: {
    type: Map,
    of: String
  },
  is_active: {
    type: Boolean,
    default: true
  },
  last_restocked: {
    type: Date
  },
  created_by_migration: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'rawItems'
});

// Pre-save middleware to generate item_id if not provided
rawItemSchema.pre('save', async function(next) {
  if (!this.item_id) {
    try {
      // Get the count of all raw items to determine the next number
      const count = await this.constructor.countDocuments({});
      let nextNumber = count + 1;
      
      // Try to find the highest existing raw item ID
      const lastItem = await this.constructor.findOne(
        { item_id: { $exists: true, $ne: null } },
        { item_id: 1 },
        { sort: { createdAt: -1 } }
      );
      
      if (lastItem && lastItem.item_id) {
        const match = lastItem.item_id.match(/RI(\d+)/);
        if (match) {
          const lastNumber = parseInt(match[1]);
          nextNumber = Math.max(nextNumber, lastNumber + 1);
        }
      }
      
      // Generate and check for uniqueness
      let itemId;
      let attempts = 0;
      
      do {
        itemId = `RI${String(nextNumber + attempts).padStart(6, '0')}`;
        const existingItem = await this.constructor.findOne({ item_id: itemId });
        
        if (!existingItem) {
          this.item_id = itemId;
          break;
        }
        
        attempts++;
      } while (attempts < 100);
      
      // Fallback if all attempts failed
      if (!this.item_id) {
        this.item_id = `RI${Date.now().toString().slice(-6)}`;
      }
      
    } catch (error) {
      console.error('Error generating raw item ID:', error);
      this.item_id = `RI${Date.now().toString().slice(-6)}`;
    }
  }
  
  next();
});

// Virtual for stock status
rawItemSchema.virtual('stockStatus').get(function() {
  if (this.quantity_in_stock <= 0) return 'out_of_stock';
  if (this.quantity_in_stock <= this.min_stock_level) return 'low_stock';
  return 'normal';
});

// Virtual for stock value
rawItemSchema.virtual('stockValue').get(function() {
  return this.quantity_in_stock * this.cost_per_unit;
});

// Virtual for days since last restock
rawItemSchema.virtual('daysSinceRestock').get(function() {
  if (!this.last_restocked) return null;
  const now = new Date();
  const diffTime = Math.abs(now - this.last_restocked);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Indexes for better query performance
rawItemSchema.index({ item_id: 1 });
rawItemSchema.index({ name: 1 });
rawItemSchema.index({ material_type: 1 });
rawItemSchema.index({ quantity_in_stock: 1 });
rawItemSchema.index({ is_active: 1 });

// Compound index for low stock queries
rawItemSchema.index({ quantity_in_stock: 1, min_stock_level: 1 });

// Instance method to check if stock is low
rawItemSchema.methods.isLowStock = function() {
  return this.quantity_in_stock <= this.min_stock_level;
};

// Instance method to update stock (for atomic operations)
rawItemSchema.methods.updateStock = function(quantity, type = 'adjustment') {
  if (type === 'in' || type === 'IN') {
    this.quantity_in_stock += quantity;
    this.last_restocked = new Date();
  } else if (type === 'out' || type === 'OUT') {
    this.quantity_in_stock = Math.max(0, this.quantity_in_stock - quantity);
  } else {
    this.quantity_in_stock = Math.max(0, quantity);
  }
  
  return this.save();
};

module.exports = mongoose.model('RawItem', rawItemSchema);
