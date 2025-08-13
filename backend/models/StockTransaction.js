const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema({
  transaction_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  part_reference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Part',
    required: true
  },
  transaction_type: {
    type: String,
    required: true,
    enum: ['DELIVERY', 'WITHDRAWAL', 'ADJUSTMENT', 'ASSEMBLY_BUILD', 'ASSEMBLY_DISASSEMBLE'],
    default: 'ADJUSTMENT'
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01
  },
  unit_price: {
    type: Number,
    min: 0,
    default: 0
  },
  total_value: {
    type: Number,
    min: 0,
    default: 0
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  reference: {
    type: String,
    trim: true,
    maxlength: 100
  },
  reference_type: {
    type: String,
    enum: ['INVOICE', 'ASSEMBLY_ID', 'PURCHASE_ORDER', 'SALES_ORDER', 'ADJUSTMENT', 'OTHER'],
    default: 'OTHER'
  },
  assembly_reference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assembly'
  },
  purchase_order_reference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder'
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
  previous_stock: {
    type: Number,
    min: 0,
    default: 0
  },
  new_stock: {
    type: Number,
    min: 0,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'stock_transactions'
});

// Indexes for better query performance
stockTransactionSchema.index({ transaction_id: 1 });
stockTransactionSchema.index({ part_reference: 1 });
stockTransactionSchema.index({ transaction_type: 1 });
stockTransactionSchema.index({ date: -1 });
stockTransactionSchema.index({ reference: 1 });
stockTransactionSchema.index({ assembly_reference: 1 });
stockTransactionSchema.index({ purchase_order_reference: 1 });

// Compound indexes for common queries
stockTransactionSchema.index({ part_reference: 1, date: -1 });
stockTransactionSchema.index({ transaction_type: 1, date: -1 });

// Pre-save middleware to generate transaction_id if not provided
stockTransactionSchema.pre('save', async function(next) {
  if (!this.transaction_id) {
    try {
      const lastTransaction = await this.constructor.findOne({}, {}, { sort: { 'transaction_id': -1 } });
      let nextNumber = 1;
      
      if (lastTransaction && lastTransaction.transaction_id) {
        const match = lastTransaction.transaction_id.match(/TXN(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      
      let attempts = 0;
      let transactionId;
      do {
        transactionId = `TXN${String(nextNumber + attempts).padStart(6, '0')}`;
        const existingTransaction = await this.constructor.findOne({ transaction_id: transactionId });
        if (!existingTransaction) {
          break;
        }
        attempts++;
      } while (attempts < 100);
      
      this.transaction_id = transactionId;
    } catch (error) {
      this.transaction_id = `TXN${Date.now().toString().slice(-6)}`;
    }
  }
  
  // Calculate total value if not provided
  if (!this.total_value && this.unit_price && this.quantity) {
    this.total_value = this.unit_price * this.quantity;
  }
  
  next();
});

// Virtual for transaction description
stockTransactionSchema.virtual('description').get(function() {
  const type = this.transaction_type;
  const qty = this.quantity;
  const ref = this.reference || 'N/A';
  
  switch (type) {
    case 'DELIVERY':
      return `Stock Delivery: ${qty} units (Ref: ${ref})`;
    case 'WITHDRAWAL':
      return `Stock Withdrawal: ${qty} units (Ref: ${ref})`;
    case 'ASSEMBLY_BUILD':
      return `Assembly Build: ${qty} units consumed (Ref: ${ref})`;
    case 'ASSEMBLY_DISASSEMBLE':
      return `Assembly Disassemble: ${qty} units returned (Ref: ${ref})`;
    case 'ADJUSTMENT':
      return `Stock Adjustment: ${qty} units (Ref: ${ref})`;
    default:
      return `${type}: ${qty} units (Ref: ${ref})`;
  }
});

// Virtual for formatted date
stockTransactionSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Static method to get transaction summary
stockTransactionSchema.statics.getTransactionSummary = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: '$transaction_type',
        count: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: '$total_value' }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to get recent transactions
stockTransactionSchema.statics.getRecentTransactions = async function(limit = 10) {
  return this.find()
    .sort({ date: -1 })
    .limit(limit)
    .populate('part_reference', 'part_id name')
    .populate('assembly_reference', 'assembly_id name');
};

module.exports = mongoose.model('StockTransaction', stockTransactionSchema);