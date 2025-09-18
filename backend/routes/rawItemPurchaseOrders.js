const express = require('express');
const {
  validateRawItemPurchaseOrder,
  validateRawItemPurchaseOrderUpdate,
  getAllRawItemPurchaseOrders,
  getRawItemPurchaseOrderById,
  createRawItemPurchaseOrder,
  updateRawItemPurchaseOrder,
  deleteRawItemPurchaseOrder,
  receiveRawItems,
  getPendingRawItemPurchaseOrders,
  getPartialRawItemPurchaseOrders
} = require('../controllers/rawItemPurchaseOrderController');

const router = express.Router();

// GET all raw item purchase orders
router.get('/', getAllRawItemPurchaseOrders);

// GET pending raw item purchase orders
router.get('/status/pending', getPendingRawItemPurchaseOrders);

// GET partial raw item purchase orders
router.get('/status/partial', getPartialRawItemPurchaseOrders);

// GET raw item purchase order by ID
router.get('/:id', getRawItemPurchaseOrderById);

// POST create new raw item purchase order
router.post('/', validateRawItemPurchaseOrder, createRawItemPurchaseOrder);

// PUT update raw item purchase order
router.put('/:id', validateRawItemPurchaseOrderUpdate, updateRawItemPurchaseOrder);

// DELETE raw item purchase order
router.delete('/:id', deleteRawItemPurchaseOrder);

// POST receive raw items for purchase order
router.post('/:id/receive', receiveRawItems);

module.exports = router;
