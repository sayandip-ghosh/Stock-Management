const mongoose = require('mongoose');

const manufacturingRecordSchema = new mongoose.Schema({
  manufacturing_id: {
    type: String,
    unique: true,
    required: false,
    trim: true,
    uppercase: true
  },
  part_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Part',
    required: true
  },
  part_name: {
    type: String,
    required: true,
    trim: true
  },
  part_part_id: {
    type: String,
    required: true,
    trim: true
  },
  quantity_created: {
    type: Number,
    required: true,
    min: 1
  },
  vendor_type: {
    type: String,
    required: true,
    enum: ['internal', 'external'],
    default: 'internal'
  },
  raw_items_used: [{
    raw_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawItem',
      required: true
    },
    raw_item_name: {
      type: String,
      required: true,
      trim: true
    },
    raw_item_item_id: {
      type: String,
      required: true,
      trim: true
    },
    quantity_per_part: {
      type: Number,
      required: true,
      min: 0
    },
    total_quantity_used: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true,
      trim: true
    },
    cost_per_unit: {
      type: Number,
      min: 0,
      default: 0
    },
    total_cost: {
      type: Number,
      min: 0,
      default: 0
    }
  }],
  total_raw_material_cost: {
    type: Number,
    min: 0,
    default: 0
  },
  manufacturing_cost_per_part: {
    type: Number,
    min: 0,
    default: 0
  },
  total_manufacturing_cost: {
    type: Number,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['completed', 'in_progress', 'cancelled', 'failed'],
    default: 'completed'
  },
  production_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  completed_date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  created_by: {
    type: String,
    trim: true,
    maxlength: 100,
    default: 'system'
  },
  quality_control: {
    passed: {
      type: Boolean,
      default: true
    },
    inspected_by: {
      type: String,
      trim: true,
      maxlength: 100
    },
    inspection_date: {
      type: Date
    },
    quality_notes: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  batch_number: {
    type: String,
    trim: true,
    maxlength: 50
  },
  work_order_number: {
    type: String,
    trim: true,
    maxlength: 50
  },
  production_line: {
    type: String,
    trim: true,
    maxlength: 100
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'manufacturing_records'
});

// Pre-save middleware to generate manufacturing_id
manufacturingRecordSchema.pre('save', function(next) {
  if (!this.manufacturing_id) {
    // Simple fallback ID generation
    this.manufacturing_id = `MFG${Date.now().toString().slice(-6)}`;
  }
  
  // Calculate costs
  if (this.raw_items_used && this.raw_items_used.length > 0) {
    this.total_raw_material_cost = this.raw_items_used.reduce((total, item) => {
      return total + (item.total_cost || 0);
    }, 0);
    
    this.manufacturing_cost_per_part = this.total_raw_material_cost / this.quantity_created;
    this.total_manufacturing_cost = this.total_raw_material_cost;
  }
  
  next();
});

// Virtual for production efficiency
manufacturingRecordSchema.virtual('efficiency').get(function() {
  if (this.raw_items_used.length === 0) return 0;
  
  const totalRawMaterialUsed = this.raw_items_used.reduce((total, item) => {
    return total + item.total_quantity_used;
  }, 0);
  
  return (this.quantity_created / totalRawMaterialUsed) * 100;
});

// Virtual for formatted production date
manufacturingRecordSchema.virtual('formattedProductionDate').get(function() {
  return this.production_date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Virtual for raw materials summary
manufacturingRecordSchema.virtual('rawMaterialsSummary').get(function() {
  return this.raw_items_used.map(item => ({
    name: item.raw_item_name,
    quantity: item.total_quantity_used,
    unit: item.unit,
    cost: item.total_cost
  }));
});

// Indexes for better query performance
manufacturingRecordSchema.index({ manufacturing_id: 1 });
manufacturingRecordSchema.index({ part_id: 1 });
manufacturingRecordSchema.index({ production_date: -1 });
manufacturingRecordSchema.index({ status: 1 });
manufacturingRecordSchema.index({ vendor_type: 1 });
manufacturingRecordSchema.index({ batch_number: 1 });
manufacturingRecordSchema.index({ work_order_number: 1 });
manufacturingRecordSchema.index({ created_by: 1 });

// Compound indexes for common queries
manufacturingRecordSchema.index({ part_id: 1, production_date: -1 });
manufacturingRecordSchema.index({ status: 1, production_date: -1 });
manufacturingRecordSchema.index({ vendor_type: 1, production_date: -1 });

// Static method to get manufacturing summary
manufacturingRecordSchema.statics.getManufacturingSummary = async function(filters = {}) {
  const pipeline = [
    { $match: { ...filters, is_active: true } },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        totalPartsCreated: { $sum: '$quantity_created' },
        totalCost: { $sum: '$total_manufacturing_cost' },
        averageCostPerPart: { $avg: '$manufacturing_cost_per_part' }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to get manufacturing by part
manufacturingRecordSchema.statics.getManufacturingByPart = async function(partId, limit = 10) {
  return this.find({ part_id: partId, is_active: true })
    .sort({ production_date: -1 })
    .limit(limit)
    .populate('part_id', 'name part_id type')
    .populate('raw_items_used.raw_item_id', 'name item_id material_type');
};

// Static method to get recent manufacturing records
manufacturingRecordSchema.statics.getRecentManufacturing = async function(limit = 10) {
  return this.find({ is_active: true })
    .sort({ production_date: -1 })
    .limit(limit)
    .populate('part_id', 'name part_id type')
    .populate('raw_items_used.raw_item_id', 'name item_id material_type');
};

// Instance method to calculate efficiency
manufacturingRecordSchema.methods.calculateEfficiency = function() {
  if (this.raw_items_used.length === 0) return 0;
  
  const totalRawMaterialUsed = this.raw_items_used.reduce((total, item) => {
    return total + item.total_quantity_used;
  }, 0);
  
  return (this.quantity_created / totalRawMaterialUsed) * 100;
};

// Instance method to get cost breakdown
manufacturingRecordSchema.methods.getCostBreakdown = function() {
  return {
    raw_materials: this.total_raw_material_cost,
    manufacturing: this.total_manufacturing_cost - this.total_raw_material_cost,
    total: this.total_manufacturing_cost,
    per_part: this.manufacturing_cost_per_part
  };
};

module.exports = mongoose.model('ManufacturingRecord', manufacturingRecordSchema);
