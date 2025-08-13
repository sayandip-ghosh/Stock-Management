const mongoose = require('mongoose');

const partSchema = new mongoose.Schema({
  part_id: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
  },
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

// Pre-save middleware to generate part_id if not provided
partSchema.pre('save', async function(next) {
  if (!this.part_id) {
    try {
      // Get the count of all parts to determine the next number
      const count = await this.constructor.countDocuments({});
      let nextNumber = count + 1;
      
      // Try to find the highest existing part ID
      const lastPart = await this.constructor.findOne(
        { part_id: { $exists: true, $ne: null } },
        { part_id: 1 },
        { sort: { createdAt: -1 } }
      );
      
      if (lastPart && lastPart.part_id) {
        const match = lastPart.part_id.match(/P(\d+)/);
        if (match) {
          const lastNumber = parseInt(match[1]);
          nextNumber = Math.max(nextNumber, lastNumber + 1);
        }
      }
      
      // Generate and check for uniqueness
      let partId;
      let attempts = 0;
      
      do {
        partId = `P${String(nextNumber + attempts).padStart(6, '0')}`;
        const existingPart = await this.constructor.findOne({ part_id: partId });
        
        if (!existingPart) {
          this.part_id = partId;
          console.log('Generated part ID:', this.part_id);
          break;
        }
        
        attempts++;
      } while (attempts < 100);
      
      // Fallback if all attempts failed
      if (!this.part_id) {
        this.part_id = `P${Date.now().toString().slice(-6)}`;
        console.log('Generated fallback part ID:', this.part_id);
      }
      
    } catch (error) {
      console.error('Error generating part ID:', error);
      this.part_id = `P${Date.now().toString().slice(-6)}`;
    }
  }
  
  next();
});

// Virtual for stock status
partSchema.virtual('stockStatus').get(function() {
  if (this.quantity_in_stock <= 0) return 'out_of_stock';
  if (this.quantity_in_stock <= this.min_stock_level) return 'low_stock';
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
partSchema.index({ part_id: 1 });
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

// Instance method to update stock (for atomic operations)
partSchema.methods.updateStock = function(quantity, type = 'adjustment') {
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

module.exports = mongoose.model('Part', partSchema);