const mongoose = require('mongoose');

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
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
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
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  created_by: {
    type: String,
    trim: true,
    maxlength: 100
  },
  last_built: {
    type: Date
  },
  total_built: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'stock'
});

// Indexes for better query performance
assemblySchema.index({ assembly_id: 1 });
assemblySchema.index({ name: 1 });
assemblySchema.index({ category: 1 });
assemblySchema.index({ is_active: 1 });

// Pre-save middleware to generate assembly_id if not provided
assemblySchema.pre('save', async function(next) {
  try {
    if (!this.assembly_id) {
      let count = 0;
      try {
        count = await this.constructor.countDocuments();
      } catch (err) {
        // If countDocuments fails, use timestamp as fallback
        count = Date.now();
      }
      this.assembly_id = `ASM${String(count + 1).padStart(4, '0')}`;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to increment build count
assemblySchema.methods.incrementBuildCount = function() {
  this.total_built += 1;
  this.last_built = new Date();
  return this.save();
};

module.exports = mongoose.model('Assembly', assemblySchema);
