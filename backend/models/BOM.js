const mongoose = require('mongoose');

const bomSchema = new mongoose.Schema({
  bom_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  partId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Part',
    required: true
  },
  quantityPerUnit: {
    type: Number,
    required: true,
    min: 0.01
  },
  isOptional: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    trim: true,
    maxlength: 100
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'bom'
});

// Pre-save middleware to generate bom_id if not provided
bomSchema.pre('save', async function(next) {
  if (!this.bom_id) {
    try {
      const lastBOM = await this.constructor.findOne({}, {}, { sort: { 'bom_id': -1 } });
      let nextNumber = 1;
      
      if (lastBOM && lastBOM.bom_id) {
        const match = lastBOM.bom_id.match(/BOM(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      
      this.bom_id = `BOM${String(nextNumber).padStart(6, '0')}`;
    } catch (error) {
      this.bom_id = `BOM${Date.now().toString().slice(-6)}`;
    }
  }
  
  // Update lastUpdated timestamp
  this.lastUpdated = new Date();
  next();
});

// Compound unique index to prevent duplicate product-part combinations
bomSchema.index({ productId: 1, partId: 1 }, { unique: true });

// Indexes for better query performance
bomSchema.index({ bom_id: 1 });
bomSchema.index({ productId: 1 });
bomSchema.index({ partId: 1 });
bomSchema.index({ isActive: 1 });

// Virtual for total cost per unit (if part has cost)
bomSchema.virtual('costPerUnit').get(function() {
  if (this.populated('partId') && this.partId.cost_per_unit) {
    return this.partId.cost_per_unit * this.quantityPerUnit;
  }
  return 0;
});

// Static method to get BOM for a specific product
bomSchema.statics.getProductBOM = async function(productId) {
  return this.find({ 
    productId: productId, 
    isActive: true 
  }).populate('partId', 'part_id name quantity_in_stock unit cost_per_unit');
};

// Static method to get all products that use a specific part
bomSchema.statics.getProductsUsingPart = async function(partId) {
  return this.find({ 
    partId: partId, 
    isActive: true 
  }).populate('productId', 'product_id name isAssembled');
};

// Static method to check if a product has a BOM
bomSchema.statics.hasBOM = async function(productId) {
  const count = await this.countDocuments({ 
    productId: productId, 
    isActive: true 
  });
  return count > 0;
};

// Static method to get BOM summary with costs
bomSchema.statics.getBOMSummary = async function(productId) {
  const bomItems = await this.find({ 
    productId: productId, 
    isActive: true 
  }).populate('partId', 'part_id name quantity_in_stock unit cost_per_unit');
  
  let totalCost = 0;
  let totalParts = 0;
  
  bomItems.forEach(item => {
    if (item.partId && item.partId.cost_per_unit) {
      totalCost += item.partId.cost_per_unit * item.quantityPerUnit;
    }
    totalParts += item.quantityPerUnit;
  });
  
  return {
    bomItems,
    totalCost,
    totalParts,
    itemCount: bomItems.length
  };
};

module.exports = mongoose.model('BOM', bomSchema);
