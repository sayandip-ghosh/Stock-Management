const mongoose = require('mongoose');

const receiptItemSchema = new mongoose.Schema({
  purchase_order_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  part_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Part',
    required: true
  },
  quantity_received: {
    type: Number,
    required: true,
    min: 0.01
  },
  unit_cost: {
    type: Number,
    default: 0,
    min: 0
  },
  condition: {
    type: String,
    enum: ['good', 'damaged', 'partial_damage'],
    default: 'good'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  _id: true
});

const purchaseOrderReceiptSchema = new mongoose.Schema({
  receipt_number: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
  },
  purchase_order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true
  },
  received_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  items: [receiptItemSchema],
  total_items_received: {
    type: Number,
    default: 0,
    min: 0
  },
  receiver_name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  delivery_notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  carrier_info: {
    type: String,
    trim: true,
    maxlength: 200
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
purchaseOrderReceiptSchema.index({ receipt_number: 1 });
purchaseOrderReceiptSchema.index({ purchase_order_id: 1 });
purchaseOrderReceiptSchema.index({ received_date: -1 });

// Pre-save middleware to generate receipt number
purchaseOrderReceiptSchema.pre('save', async function(next) {
  if (!this.receipt_number) {
    try {
      // Get count of all receipts to determine the next number
      const count = await this.constructor.countDocuments({});
      let nextNumber = count + 1;
      
      // Try to find the highest existing receipt number
      const lastReceipt = await this.constructor.findOne(
        { receipt_number: { $exists: true, $ne: null } },
        { receipt_number: 1 },
        { sort: { createdAt: -1 } }
      );
      
      if (lastReceipt && lastReceipt.receipt_number) {
        const match = lastReceipt.receipt_number.match(/RCP(\d+)/);
        if (match) {
          const lastNumber = parseInt(match[1]);
          nextNumber = Math.max(nextNumber, lastNumber + 1);
        }
      }
      
      // Generate and check for uniqueness
      let receiptNumber;
      let attempts = 0;
      
      do {
        receiptNumber = `RCP${String(nextNumber + attempts).padStart(6, '0')}`;
        const existingReceipt = await this.constructor.findOne({ receipt_number: receiptNumber });
        
        if (!existingReceipt) {
          this.receipt_number = receiptNumber;
          console.log('Generated receipt number:', this.receipt_number);
          break;
        }
        
        attempts++;
      } while (attempts < 100);
      
      // Fallback if all attempts failed
      if (!this.receipt_number) {
        this.receipt_number = `RCP${Date.now().toString().slice(-6)}`;
        console.log('Generated fallback receipt number:', this.receipt_number);
      }
      
    } catch (error) {
      console.error('Error generating receipt number:', error);
      this.receipt_number = `RCP${Date.now().toString().slice(-6)}`;
    }
  }
  
  // Calculate total items received
  this.total_items_received = this.items.reduce((sum, item) => sum + item.quantity_received, 0);
  
  next();
});

module.exports = mongoose.model('PurchaseOrderReceipt', purchaseOrderReceiptSchema);
