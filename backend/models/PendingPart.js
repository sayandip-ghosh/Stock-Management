const mongoose = require('mongoose');

const pendingPartSchema = new mongoose.Schema({
  pending_part_id: {
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
  part_type: {
    type: String,
    required: true
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
      default: 0,
      min: 0
    },
    total_cost: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  production_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    required: true,
    enum: ['pending_review', 'accepted', 'rejected'],
    default: 'pending_review'
  },
  quality_control: {
    inspector_name: {
      type: String,
      trim: true
    },
    inspection_date: {
      type: Date
    },
    passed_quantity: {
      type: Number,
      min: 0
    },
    rejected_quantity: {
      type: Number,
      min: 0
    },
    rejection_reason: {
      type: String,
      trim: true
    },
    inspection_notes: {
      type: String,
      trim: true
    }
  },
  total_manufacturing_cost: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  },
  created_by: {
    type: String,
    default: 'system',
    trim: true
  },
  reviewed_by: {
    type: String,
    trim: true
  },
  reviewed_at: {
    type: Date
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
pendingPartSchema.index({ status: 1 });
pendingPartSchema.index({ part_id: 1 });
pendingPartSchema.index({ production_date: -1 });
pendingPartSchema.index({ pending_part_id: 1 }, { unique: true, sparse: true });

// Virtual for acceptance rate
pendingPartSchema.virtual('acceptance_rate').get(function() {
  if (this.status !== 'accepted' && this.status !== 'rejected') return null;
  if (!this.quality_control.passed_quantity && !this.quality_control.rejected_quantity) return null;
  
  const total = (this.quality_control.passed_quantity || 0) + (this.quality_control.rejected_quantity || 0);
  if (total === 0) return 0;
  
  return ((this.quality_control.passed_quantity || 0) / total) * 100;
});

// Virtual for rejection rate
pendingPartSchema.virtual('rejection_rate').get(function() {
  if (this.status !== 'accepted' && this.status !== 'rejected') return null;
  if (!this.quality_control.passed_quantity && !this.quality_control.rejected_quantity) return null;
  
  const total = (this.quality_control.passed_quantity || 0) + (this.quality_control.rejected_quantity || 0);
  if (total === 0) return 0;
  
  return ((this.quality_control.rejected_quantity || 0) / total) * 100;
});

// Static method to get summary statistics
pendingPartSchema.statics.getSummaryStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalPending: {
          $sum: {
            $cond: [{ $eq: ['$status', 'pending_review'] }, 1, 0]
          }
        },
        totalAccepted: {
          $sum: {
            $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0]
          }
        },
        totalRejected: {
          $sum: {
            $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0]
          }
        },
        totalQuantityPending: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'pending_review'] },
              '$quantity_created',
              0
            ]
          }
        },
        totalQuantityAccepted: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'accepted'] },
              { $ifNull: ['$quality_control.passed_quantity', '$quantity_created'] },
              0
            ]
          }
        },
        totalQuantityRejected: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'rejected'] },
              { $ifNull: ['$quality_control.rejected_quantity', '$quantity_created'] },
              0
            ]
          }
        }
      }
    }
  ]);
};

// Pre-save middleware to generate pending_part_id
pendingPartSchema.pre('save', async function(next) {
  if (!this.pending_part_id) {
    const timestamp = Date.now().toString().slice(-6);
    this.pending_part_id = `PP${timestamp}`;
  }
  next();
});

module.exports = mongoose.model('PendingPart', pendingPartSchema);
