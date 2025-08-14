const mongoose = require('mongoose');

const bomItemSchema = new mongoose.Schema({
  part_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Part',
    required: true
  },
  quantity_required: {
    type: Number,
    required: true,
    min: 0.01
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 200
  }
}, {
  _id: true
});

const assemblySchema = new mongoose.Schema({
  assembly_id: {
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
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  category: {
    type: String,
    trim: true,
    maxlength: 100,
    default: 'Assembly'
  },
  bom_items: [bomItemSchema],
  ready_built: {
    type: Number,
    default: 0,
    min: 0
  },
  total_shipped: {
    type: Number,
    default: 0,
    min: 0
  },
  total_dismantled: {
    type: Number,
    default: 0,
    min: 0
  },
  estimated_build_time: {
    type: Number, // in minutes
    default: 0,
    min: 0
  },
  build_cost: {
    type: Number,
    default: 0,
    min: 0
  },
  is_active: {
    type: Boolean,
    default: true
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
assemblySchema.index({ assembly_id: 1 });
assemblySchema.index({ name: 1 });
assemblySchema.index({ category: 1 });
assemblySchema.index({ is_active: 1 });

// Pre-save middleware to generate assembly_id
assemblySchema.pre('save', async function(next) {
  if (!this.assembly_id) {
    try {
      const count = await this.constructor.countDocuments({});
      let nextNumber = count + 1;
      
      const lastAssembly = await this.constructor.findOne(
        { assembly_id: { $exists: true, $ne: null } },
        { assembly_id: 1 },
        { sort: { createdAt: -1 } }
      );
      
      if (lastAssembly && lastAssembly.assembly_id) {
        const match = lastAssembly.assembly_id.match(/ASM(\d+)/);
        if (match) {
          const lastNumber = parseInt(match[1]);
          nextNumber = Math.max(nextNumber, lastNumber + 1);
        }
      }
      
      let assemblyId;
      let attempts = 0;
      
      do {
        assemblyId = `ASM${String(nextNumber + attempts).padStart(6, '0')}`;
        const existing = await this.constructor.findOne({ assembly_id: assemblyId });
        
        if (!existing) {
          this.assembly_id = assemblyId;
          console.log('Generated assembly ID:', this.assembly_id);
          break;
        }
        
        attempts++;
      } while (attempts < 100);
      
      if (!this.assembly_id) {
        this.assembly_id = `ASM${Date.now().toString().slice(-6)}`;
      }
      
    } catch (error) {
      console.error('Error generating assembly ID:', error);
      this.assembly_id = `ASM${Date.now().toString().slice(-6)}`;
    }
  }
  
  next();
});

// Virtual for total BOM cost
assemblySchema.virtual('bom_cost').get(function() {
  if (!this.bom_items || this.bom_items.length === 0) return 0;
  
  return this.bom_items.reduce((total, item) => {
    const partCost = item.part_id?.cost_per_unit || 0;
    return total + (partCost * item.quantity_required);
  }, 0);
});

// Virtual for total built (ready + shipped)
assemblySchema.virtual('total_built').get(function() {
  return (this.ready_built || 0) + (this.total_shipped || 0);
});

// Instance method to check if assembly can be built
assemblySchema.methods.canBuild = async function(quantity = 1) {
  if (!this.bom_items || this.bom_items.length === 0) {
    return { canBuild: false, reason: 'No BOM items defined' };
  }

  await this.populate('bom_items.part_id', 'part_id name quantity_in_stock unit');
  
  const insufficientParts = [];
  
  for (const item of this.bom_items) {
    const requiredQuantity = item.quantity_required * quantity;
    const availableQuantity = item.part_id?.quantity_in_stock || 0;
    
    if (availableQuantity < requiredQuantity) {
      insufficientParts.push({
        part_name: item.part_id?.name || 'Unknown',
        part_id: item.part_id?.part_id || 'Unknown',
        required: requiredQuantity,
        available: availableQuantity,
        shortage: requiredQuantity - availableQuantity
      });
    }
  }
  
  return {
    canBuild: insufficientParts.length === 0,
    insufficientParts,
    reason: insufficientParts.length > 0 ? 'Insufficient stock for some parts' : null
  };
};

module.exports = mongoose.model('Assembly', assemblySchema);
