const mongoose = require('mongoose');

const partSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    required: true,
    enum: ['Mechanical', 'Electrical', 'Electronic', 'Plastic', 'Metal', 'Other'],
    default: 'Other'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  unit: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20,
    default: 'pcs'
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
  category: {
    type: String,
    trim: true,
    maxlength: 50
  },
  is_active: {
    type: Boolean,
    default: true
  },
  last_restocked: {
    type: Date
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'parts'
});

// Virtual for stock status
partSchema.virtual('stockStatus').get(function() {
  if (this.quantity_in_stock <= 0) return 'out_of_stock';
  if (this.quantity_in_stock <= this.min_stock_level) return 'low_stock';
  if (this.max_stock_level && this.quantity_in_stock >= this.max_stock_level) return 'overstocked';
  return 'normal';
});

// Virtual for stock value
partSchema.virtual('stockValue').get(function() {
  return this.quantity_in_stock * this.cost_per_unit;
});

// Virtual for days since last restock
partSchema.virtual('daysSinceRestock').get(function() {
  if (!this.last_restocked) return null;
  const now = new Date();
  const diffTime = Math.abs(now - this.last_restocked);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Indexes for better query performance
partSchema.index({ name: 1 });
partSchema.index({ type: 1 });

partSchema.index({ quantity_in_stock: 1 });
partSchema.index({ is_active: 1 });
partSchema.index({ category: 1 });

// Compound index for low stock queries
partSchema.index({ quantity_in_stock: 1, min_stock_level: 1 });



// Instance method to check if stock is low
partSchema.methods.isLowStock = function() {
  return this.quantity_in_stock <= this.min_stock_level;
};

// Instance method to update stock
partSchema.methods.updateStock = function(quantity, type = 'adjustment') {
  if (type === 'in') {
    this.quantity_in_stock += quantity;
  } else if (type === 'out') {
    this.quantity_in_stock = Math.max(0, this.quantity_in_stock - quantity);
  } else {
    this.quantity_in_stock = Math.max(0, quantity);
  }
  
  if (type === 'in') {
    this.last_restocked = new Date();
  }
  
  return this.save();
};

module.exports = mongoose.model('Part', partSchema);
