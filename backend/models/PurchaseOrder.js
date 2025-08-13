const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
  part_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Part',
    required: true
  },
  quantity_ordered: {
    type: Number,
    required: true,
    min: 0.01
  },
  quantity_received: {
    type: Number,
    default: 0,
    min: 0
  },
  unit_cost: {
    type: Number,
    default: 0,
    min: 0
  },
  total_cost: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  _id: true
});

const purchaseOrderSchema = new mongoose.Schema({
  order_number: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
  },
  supplier_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  supplier_contact: {
    type: String,
    trim: true,
    maxlength: 200
  },
  order_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  expected_delivery_date: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'completed', 'cancelled'],
    default: 'pending'
  },
  items: [purchaseOrderItemSchema],
  total_amount: {
    type: Number,
    default: 0,
    min: 0
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
purchaseOrderSchema.index({ order_number: 1 });
purchaseOrderSchema.index({ supplier_name: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ order_date: -1 });

// Pre-save middleware to generate order number and calculate totals
purchaseOrderSchema.pre('save', async function(next) {
  // Only generate order number if it doesn't exist
  if (!this.order_number) {
    try {
      // Get the count of all purchase orders to determine the next number
      const count = await this.constructor.countDocuments({});
      let nextNumber = count + 1;
      
      // Try to find the highest existing order number to avoid conflicts
      const lastOrder = await this.constructor.findOne(
        { order_number: { $exists: true, $ne: null } }, 
        { order_number: 1 },
        { sort: { createdAt: -1 } }
      );
      
      if (lastOrder && lastOrder.order_number) {
        const match = lastOrder.order_number.match(/PO(\d+)/);
        if (match) {
          const lastNumber = parseInt(match[1]);
          nextNumber = Math.max(nextNumber, lastNumber + 1);
        }
      }
      
      // Generate and check for uniqueness
      let orderNumber;
      let attempts = 0;
      
      do {
        orderNumber = `PO${String(nextNumber + attempts).padStart(6, '0')}`;
        const existingOrder = await this.constructor.findOne({ order_number: orderNumber });
        
        if (!existingOrder) {
          this.order_number = orderNumber;
          console.log('Generated order number:', this.order_number);
          break;
        }
        
        attempts++;
      } while (attempts < 100);
      
      // Fallback if all attempts failed
      if (!this.order_number) {
        this.order_number = `PO${Date.now().toString().slice(-6)}`;
        console.log('Generated fallback order number:', this.order_number);
      }
      
    } catch (error) {
      console.error('Error generating order number:', error);
      // Fallback to timestamp-based number
      this.order_number = `PO${Date.now().toString().slice(-6)}`;
    }
  }
  
  // Calculate item totals and order total
  this.total_amount = 0;
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      item.total_cost = (item.quantity_ordered || 0) * (item.unit_cost || 0);
      this.total_amount += item.total_cost;
    });
  }
  
  next();
});

// Instance method to update status based on received quantities
purchaseOrderSchema.methods.updateStatus = function() {
  if (!this.items || this.items.length === 0) {
    this.status = 'pending';
    return;
  }

  let totalOrdered = 0;
  let totalReceived = 0;
  let hasAnyReceived = false;

  this.items.forEach(item => {
    totalOrdered += item.quantity_ordered || 0;
    const received = item.quantity_received || 0;
    totalReceived += received;
    if (received > 0) hasAnyReceived = true;
  });

  console.log('Status update calculation:', {
    totalOrdered,
    totalReceived,
    hasAnyReceived,
    percentage: totalOrdered > 0 ? (totalReceived / totalOrdered * 100) : 0
  });

  if (totalReceived === 0) {
    this.status = 'pending';
  } else if (totalReceived >= totalOrdered) {
    this.status = 'completed';
  } else if (hasAnyReceived) {
    this.status = 'partial';
  } else {
    this.status = 'pending';
  }

  console.log('Updated status to:', this.status);
};

// Virtual for completion percentage
purchaseOrderSchema.virtual('completion_percentage').get(function() {
  if (!this.items || this.items.length === 0) return 0;
  
  const totalOrdered = this.items.reduce((sum, item) => sum + (item.quantity_ordered || 0), 0);
  const totalReceived = this.items.reduce((sum, item) => sum + (item.quantity_received || 0), 0);
  
  return totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
});

// Static method to get orders by status - include partial orders in pending view
purchaseOrderSchema.statics.getByStatus = function(status) {
  let query = {};
  
  if (status === 'pending') {
    // Include both pending and partial orders
    query = { status: { $in: ['pending', 'partial'] } };
  } else {
    query = { status: status };
  }
  
  return this.find(query)
    .populate('items.part_id', 'part_id name unit')
    .sort({ order_date: -1 });
};

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
