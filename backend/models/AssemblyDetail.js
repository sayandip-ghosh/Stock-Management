const mongoose = require('mongoose');

const assemblyDetailSchema = new mongoose.Schema({
  assembly_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assembly',
    required: true
  },
  part_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Part',
    required: true
  },
  quantity_required: {
    type: Number,
    required: true,
    min: 0.01,
    default: 1
  },
  unit: {
    type: String,
    trim: true,
    maxlength: 20,
    default: 'pcs'
  },
  is_optional: {
    type: Boolean,
    default: false
  },
  sequence: {
    type: Number,
    default: 1,
    min: 1
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'stock'
});

// Compound unique index to prevent duplicate part-assembly combinations
assemblyDetailSchema.index({ assembly_id: 1, part_id: 1 }, { unique: true });

// Indexes for better query performance
assemblyDetailSchema.index({ assembly_id: 1 });
assemblyDetailSchema.index({ part_id: 1 });
assemblyDetailSchema.index({ sequence: 1 });

// Virtual for total cost of this component
assemblyDetailSchema.virtual('totalCost').get(function() {
  if (!this.populated('part_id')) return 0;
  return this.quantity_required * (this.part_id.cost_per_unit || 0);
});

// Pre-save middleware to set sequence if not provided
assemblyDetailSchema.pre('save', async function(next) {
  if (!this.sequence) {
    const maxSequence = await this.constructor
      .find({ assembly_id: this.assembly_id })
      .sort({ sequence: -1 })
      .limit(1)
      .then(results => results[0]?.sequence || 0);
    this.sequence = maxSequence + 1;
  }
  next();
});

module.exports = mongoose.model('AssemblyDetail', assemblyDetailSchema);
