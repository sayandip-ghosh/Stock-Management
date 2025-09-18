const mongoose = require('mongoose');

const scrapItemSchema = new mongoose.Schema({
  raw_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RawItem',
    required: true
  },
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
    required: true
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
  quantity_available: {
    type: Number,
    required: true,
    min: 0,
    default: 0
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
  source_operation: {
    type: String,
    required: true,
    enum: ['manufacturing', 'cutting', 'machining', 'assembly', 'other']
  },
  source_details: {
    part_name: String,
    operation_date: Date,
    operator: String,
    notes: String
  },
  is_usable: {
    type: Boolean,
    default: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_by_migration: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'scrapItems'
});

// Pre-save middleware to generate item_id if not provided
scrapItemSchema.pre('save', async function(next) {
  if (!this.item_id) {
    try {
      // Get the count of all scrap items to determine the next number
      const count = await this.constructor.countDocuments({});
      let nextNumber = count + 1;
      
      // Try to find the highest existing scrap item ID
      const lastItem = await this.constructor.findOne(
        { item_id: { $exists: true, $ne: null } },
        { item_id: 1 },
        { sort: { createdAt: -1 } }
      );
      
      if (lastItem && lastItem.item_id) {
        const match = lastItem.item_id.match(/SI(\d+)/);
        if (match) {
          const lastNumber = parseInt(match[1]);
          nextNumber = Math.max(nextNumber, lastNumber + 1);
        }
      }
      
      // Generate and check for uniqueness
      let itemId;
      let attempts = 0;
      
      do {
        itemId = `SI${String(nextNumber + attempts).padStart(6, '0')}`;
        const existingItem = await this.constructor.findOne({ item_id: itemId });
        
        if (!existingItem) {
          this.item_id = itemId;
          break;
        }
        
        attempts++;
      } while (attempts < 100);
      
      // Fallback if all attempts failed
      if (!this.item_id) {
        this.item_id = `SI${Date.now().toString().slice(-6)}`;
      }
      
    } catch (error) {
      console.error('Error generating scrap item ID:', error);
      this.item_id = `SI${Date.now().toString().slice(-6)}`;
    }
  }
  
  next();
});

// Virtual for stock status
scrapItemSchema.virtual('stockStatus').get(function() {
  if (this.quantity_available <= 0) return 'out_of_stock';
  return 'available';
});

// Virtual for stock value
scrapItemSchema.virtual('stockValue').get(function() {
  return this.quantity_available * this.cost_per_unit;
});

// Indexes for better query performance
scrapItemSchema.index({ item_id: 1 });
scrapItemSchema.index({ raw_item_id: 1 });
scrapItemSchema.index({ name: 1 });
scrapItemSchema.index({ material_type: 1 });
scrapItemSchema.index({ quantity_available: 1 });
scrapItemSchema.index({ is_active: 1 });
scrapItemSchema.index({ source_operation: 1 });

// Instance method to update stock (for atomic operations)
scrapItemSchema.methods.updateStock = function(quantity, type = 'adjustment') {
  if (type === 'in' || type === 'IN') {
    this.quantity_available += quantity;
  } else if (type === 'out' || type === 'OUT') {
    this.quantity_available = Math.max(0, this.quantity_available - quantity);
  } else {
    this.quantity_available = Math.max(0, quantity);
  }
  
  return this.save();
};

module.exports = mongoose.model('ScrapItem', scrapItemSchema);

