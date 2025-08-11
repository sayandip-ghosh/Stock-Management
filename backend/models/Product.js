const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  product_id: {
    type: String,
    required: true,
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
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  isAssembled: {
    type: Boolean,
    required: true,
    default: false
  },
  category: {
    type: String,
    trim: true,
    maxlength: 100
  },
  unit: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20,
    default: 'pcs'
  },
  stockQty: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minStockLevel: {
    type: Number,
    required: true,
    min: 0,
    default: 5
  },
  costPerUnit: {
    type: Number,
    min: 0,
    default: 0
  },
  sellingPrice: {
    type: Number,
    min: 0,
    default: 0
  },
  location: {
    type: String,
    trim: true,
    maxlength: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  specifications: {
    type: Map,
    of: String
  },
  lastAssembled: {
    type: Date
  },
  totalAssembled: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'products'
});

// Pre-save middleware to generate product_id if not provided
productSchema.pre('save', async function(next) {
  if (!this.product_id) {
    try {
      const lastProduct = await this.constructor.findOne({}, {}, { sort: { 'product_id': -1 } });
      let nextNumber = 1;
      
      if (lastProduct && lastProduct.product_id) {
        const match = lastProduct.product_id.match(/PROD(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      
      this.product_id = `PROD${String(nextNumber).padStart(6, '0')}`;
    } catch (error) {
      this.product_id = `PROD${Date.now().toString().slice(-6)}`;
    }
  }
  next();
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.stockQty <= 0) return 'out_of_stock';
  if (this.stockQty <= this.minStockLevel) return 'low_stock';
  return 'normal';
});

// Virtual for stock value
productSchema.virtual('stockValue').get(function() {
  return this.stockQty * this.costPerUnit;
});

// Virtual for profit margin
productSchema.virtual('profitMargin').get(function() {
  if (this.costPerUnit === 0) return 0;
  return ((this.sellingPrice - this.costPerUnit) / this.costPerUnit) * 100;
});

// Indexes for better query performance
productSchema.index({ product_id: 1 });
productSchema.index({ name: 1 });
productSchema.index({ isAssembled: 1 });
productSchema.index({ category: 1 });
productSchema.index({ stockQty: 1 });
productSchema.index({ isActive: 1 });

// Compound index for low stock queries
productSchema.index({ stockQty: 1, minStockLevel: 1 });

// Instance method to check if stock is low
productSchema.methods.isLowStock = function() {
  return this.stockQty <= this.minStockLevel;
};

// Instance method to update stock (for atomic operations)
productSchema.methods.updateStock = function(quantity, type = 'adjustment') {
  if (type === 'in' || type === 'IN') {
    this.stockQty += quantity;
  } else if (type === 'out' || type === 'OUT') {
    this.stockQty = Math.max(0, this.stockQty - quantity);
  } else {
    this.stockQty = Math.max(0, quantity);
  }
  
  return this.save();
};

// Instance method to increment assembly count
productSchema.methods.incrementAssemblyCount = function(quantity = 1) {
  this.totalAssembled += quantity;
  this.lastAssembled = new Date();
  return this.save();
};

module.exports = mongoose.model('Product', productSchema);
