const mongoose = require('mongoose');
const PendingPart = require('../models/PendingPart');
const Part = require('../models/Part');
const RawItem = require('../models/RawItem');
const ScrapItem = require('../models/ScrapItem');
const StockTransaction = require('../models/StockTransaction');
const ManufacturingRecord = require('../models/ManufacturingRecord');

// Get all pending parts
const getAllPendingParts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'pending_review',
      part_id,
      start_date,
      end_date,
      sortBy = 'production_date', 
      sortOrder = 'desc' 
    } = req.query;
    
    // Build query
    const query = { is_active: true };
    if (status && status !== 'all') query.status = status;
    if (part_id) query.part_id = part_id;
    
    if (start_date || end_date) {
      query.production_date = {};
      if (start_date) query.production_date.$gte = new Date(start_date);
      if (end_date) query.production_date.$lte = new Date(end_date);
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const pendingParts = await PendingPart.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('part_id', 'name part_id type unit')
      .populate('raw_items_used.raw_item_id', 'name item_id material_type unit')
      .exec();
    
    const total = await PendingPart.countDocuments(query);
    
    res.json({
      pendingParts,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit),
        has_next: page < Math.ceil(total / limit),
        has_prev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching pending parts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get pending part by ID
const getPendingPartById = async (req, res) => {
  try {
    const pendingPart = await PendingPart.findById(req.params.id)
      .populate('part_id', 'name part_id type unit cost_per_unit')
      .populate('raw_items_used.raw_item_id', 'name item_id material_type unit cost_per_unit');
    
    if (!pendingPart) {
      return res.status(404).json({ error: 'Pending part not found' });
    }
    
    res.json(pendingPart);
  } catch (error) {
    console.error('Error fetching pending part:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid pending part ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Review pending parts (accept/reject)
const reviewPendingPart = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const { id } = req.params;
    const { 
      action, // 'accept' or 'reject'
      inspector_name,
      passed_quantity,
      rejected_quantity,
      rejection_reason,
      inspection_notes
    } = req.body;
    
    // Validate action
    if (!action || !['accept', 'reject'].includes(action)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: 'Invalid action', 
        message: 'Action must be either "accept" or "reject"' 
      });
    }
    
    // Find the pending part
    const pendingPart = await PendingPart.findById(id).session(session);
    if (!pendingPart) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Pending part not found' });
    }
    
    if (pendingPart.status !== 'pending_review') {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: 'Part already reviewed', 
        message: `This part has already been ${pendingPart.status}` 
      });
    }
    
    const now = new Date();
    let manufacturingRecord = null;
    
    if (action === 'accept') {
      // Validate quantities for acceptance
      const totalPassed = passed_quantity || pendingPart.quantity_created;
      const totalRejected = rejected_quantity || 0;
      
      if (totalPassed + totalRejected !== pendingPart.quantity_created) {
        await session.abortTransaction();
        return res.status(400).json({ 
          error: 'Invalid quantities', 
          message: 'Passed quantity + rejected quantity must equal total quantity created' 
        });
      }
      
      // Update pending part status
      pendingPart.status = 'accepted';
      pendingPart.quality_control = {
        inspector_name: inspector_name || 'system',
        inspection_date: now,
        passed_quantity: totalPassed,
        rejected_quantity: totalRejected,
        rejection_reason: totalRejected > 0 ? rejection_reason : null,
        inspection_notes: inspection_notes || ''
      };
      pendingPart.reviewed_by = inspector_name || 'system';
      pendingPart.reviewed_at = now;
      
      await pendingPart.save({ session });
      
      // Add passed parts to main stock
      if (totalPassed > 0) {
        const part = await Part.findById(pendingPart.part_id).session(session);
        if (!part) {
          await session.abortTransaction();
          return res.status(404).json({ error: 'Part not found' });
        }
        
        const previousStock = part.quantity_in_stock;
        const newStock = previousStock + totalPassed;
        
        await Part.updateOne(
          { _id: pendingPart.part_id },
          { 
            $set: { 
              quantity_in_stock: newStock,
              last_restocked: now
            }
          },
          { session }
        );
        
        // Create stock transaction for accepted parts
        const partTransaction = new StockTransaction({
          part_reference: pendingPart.part_id,
          transaction_type: 'DELIVERY',
          quantity: totalPassed,
          unit_price: part.cost_per_unit || 0,
          total_value: (part.cost_per_unit || 0) * totalPassed,
          reference: `Quality Control Acceptance - ${pendingPart.pending_part_id}`,
          reference_type: 'OTHER',
          notes: `Accepted ${totalPassed} parts from manufacturing${inspection_notes ? ` - ${inspection_notes}` : ''}`,
          previous_stock: previousStock,
          new_stock: newStock,
          date: now,
          created_by: inspector_name || 'system'
        });
        
        partTransaction.transaction_id = await generateTransactionId(session);
        await partTransaction.save({ session });
        
        // Create manufacturing record for accepted parts
        manufacturingRecord = new ManufacturingRecord({
          part_id: pendingPart.part_id,
          part_name: pendingPart.part_name,
          part_part_id: pendingPart.part_part_id,
          quantity_created: totalPassed,
          vendor_type: pendingPart.vendor_type,
          raw_items_used: pendingPart.raw_items_used,
          production_date: pendingPart.production_date,
          completed_date: now,
          notes: pendingPart.notes || '',
          created_by: pendingPart.created_by,
          status: 'completed',
          quality_control: {
            passed: true,
            inspection_date: now,
            inspector_name: inspector_name || 'system',
            inspection_notes: inspection_notes || ''
          },
          total_manufacturing_cost: pendingPart.total_manufacturing_cost,
          pending_part_reference: pendingPart.pending_part_id
        });
        
        const manufacturingId = `MFG${Date.now().toString().slice(-6)}`;
        manufacturingRecord.manufacturing_id = manufacturingId;
        await manufacturingRecord.save({ session });
      }
      
      // Handle rejected parts - add to scrap
      if (totalRejected > 0) {
        await handleRejectedParts(pendingPart, totalRejected, rejection_reason, inspector_name, session);
      }
      
    } else if (action === 'reject') {
      // Reject all parts
      pendingPart.status = 'rejected';
      pendingPart.quality_control = {
        inspector_name: inspector_name || 'system',
        inspection_date: now,
        passed_quantity: 0,
        rejected_quantity: pendingPart.quantity_created,
        rejection_reason: rejection_reason || 'Quality control failure',
        inspection_notes: inspection_notes || ''
      };
      pendingPart.reviewed_by = inspector_name || 'system';
      pendingPart.reviewed_at = now;
      
      await pendingPart.save({ session });
      
      // Add all parts and raw materials to scrap
      await handleRejectedParts(pendingPart, pendingPart.quantity_created, rejection_reason, inspector_name, session);
    }
    
    await session.commitTransaction();
    
    // Prepare response
    const responseData = {
      success: true,
      message: action === 'accept' 
        ? `Successfully accepted ${passed_quantity || pendingPart.quantity_created} parts` 
        : `Successfully rejected ${pendingPart.quantity_created} parts`,
      data: {
        pending_part: pendingPart,
        manufacturing_record: manufacturingRecord
      }
    };
    
    if (action === 'accept' && rejected_quantity > 0) {
      responseData.message += ` and rejected ${rejected_quantity} parts to scrap`;
    }
    
    res.json(responseData);
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Error reviewing pending part:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to review pending part',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

// Helper function to handle rejected parts and raw materials
const handleRejectedParts = async (pendingPart, rejectedQuantity, rejectionReason, inspector, session) => {
  try {
    // Calculate proportional raw material waste for rejected parts
    const rejectionRatio = rejectedQuantity / pendingPart.quantity_created;
    
    // Create scrap entries for rejected parts and proportional raw materials
    for (const rawItemUsed of pendingPart.raw_items_used) {
      const wasteQuantity = rawItemUsed.total_quantity_used * rejectionRatio;
      
      // Create scrap item entry
      const scrapItem = new ScrapItem({
        name: `Rejected ${pendingPart.part_name} Material`,
        item_id: `SCRAP-${Date.now().toString().slice(-6)}`,
        material_type: 'Manufacturing Waste',
        quantity_available: wasteQuantity,
        unit: rawItemUsed.unit,
        raw_item_id: rawItemUsed.raw_item_id,
        source_operation: 'other',
        source_details: {
          operation_date: new Date(),
          part_name: pendingPart.part_name,
          part_id: pendingPart.part_part_id,
          rejection_reason: rejectionReason || 'Quality control failure',
          inspector_name: inspector || 'system',
          original_raw_item: rawItemUsed.raw_item_name,
          pending_part_id: pendingPart.pending_part_id,
          rejected_quantity: rejectedQuantity,
          total_quantity_created: pendingPart.quantity_created
        },
        cost_per_unit: rawItemUsed.cost_per_unit || 0,
        total_cost: (rawItemUsed.cost_per_unit || 0) * wasteQuantity,
        notes: `Rejected from manufacturing: ${rejectionReason || 'Quality control failure'}`
      });
      
      await scrapItem.save({ session });
    }
    
    console.log(`Successfully created ${rejectedQuantity} scrap entries for rejected raw materials`);
    
  } catch (error) {
    console.error('Error handling rejected parts:', error);
    throw error;
  }
};

// Get pending parts statistics
const getPendingPartsStatistics = async (req, res) => {
  try {
    const stats = await PendingPart.getSummaryStats();
    const summary = stats[0] || {
      totalPending: 0,
      totalAccepted: 0,
      totalRejected: 0,
      totalQuantityPending: 0,
      totalQuantityAccepted: 0,
      totalQuantityRejected: 0
    };
    
    // Calculate rates
    const totalReviewed = summary.totalAccepted + summary.totalRejected;
    const acceptanceRate = totalReviewed > 0 ? (summary.totalAccepted / totalReviewed) * 100 : 0;
    const rejectionRate = totalReviewed > 0 ? (summary.totalRejected / totalReviewed) * 100 : 0;
    
    res.json({
      ...summary,
      acceptanceRate: parseFloat(acceptanceRate.toFixed(2)),
      rejectionRate: parseFloat(rejectionRate.toFixed(2)),
      totalReviewed
    });
  } catch (error) {
    console.error('Error fetching pending parts statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete pending part (admin only)
const deletePendingPart = async (req, res) => {
  try {
    const pendingPart = await PendingPart.findById(req.params.id);
    if (!pendingPart) {
      return res.status(404).json({ error: 'Pending part not found' });
    }
    
    // Only allow deletion of pending parts that haven't been reviewed
    if (pendingPart.status !== 'pending_review') {
      return res.status(400).json({ 
        error: 'Cannot delete reviewed part',
        message: 'Only pending parts can be deleted'
      });
    }
    
    await PendingPart.findByIdAndUpdate(req.params.id, { is_active: false });
    
    res.json({ 
      success: true,
      message: 'Pending part deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting pending part:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid pending part ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to generate transaction ID
async function generateTransactionId(session) {
  const timestamp = Date.now().toString();
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TXN${timestamp.slice(-6)}${randomNum}`;
}

module.exports = {
  getAllPendingParts,
  getPendingPartById,
  reviewPendingPart,
  getPendingPartsStatistics,
  deletePendingPart
};
