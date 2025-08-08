const express = require('express');
const {
  validatePart,
  getAllParts,
  getPartById,
  createPart,
  updatePart,
  deletePart,
  getLowStockAlerts,
  updateStockQuantity,
  getPartStatistics
} = require('../controllers/partController');

const router = express.Router();

// GET all parts
router.get('/', getAllParts);

// GET part by ID
router.get('/:id', getPartById);

// POST create new part
router.post('/', validatePart, createPart);

// PUT update part
router.put('/:id', validatePart, updatePart);

// DELETE part
router.delete('/:id', deletePart);

// GET low stock alerts
router.get('/alerts/low-stock', getLowStockAlerts);

// GET part statistics
router.get('/stats/summary', getPartStatistics);

// POST update stock quantity
router.post('/:id/stock', updateStockQuantity);

module.exports = router;
