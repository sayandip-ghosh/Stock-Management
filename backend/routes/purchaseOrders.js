const express = require('express');
const {
  validatePurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  receiveItems,
  getPendingPurchaseOrders,
  getPartialPurchaseOrders,
  getPurchaseOrderReceipts
} = require('../controllers/purchaseOrderController');

const router = express.Router();

// GET all purchase orders
router.get('/', getAllPurchaseOrders);

// GET pending purchase orders
router.get('/status/pending', getPendingPurchaseOrders);

// GET partial purchase orders
router.get('/status/partial', getPartialPurchaseOrders);

// GET purchase order by ID
router.get('/:id', getPurchaseOrderById);

// POST create new purchase order
router.post('/', validatePurchaseOrder, createPurchaseOrder);

// PUT update purchase order
router.put('/:id', validatePurchaseOrder, updatePurchaseOrder);

// DELETE purchase order
router.delete('/:id', deletePurchaseOrder);

// POST receive items for purchase order
router.post('/:id/receive', receiveItems);

// GET receipts for purchase order
router.get('/:id/receipts', getPurchaseOrderReceipts);

module.exports = router;
