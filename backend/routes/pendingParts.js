const express = require('express');
const {
  getAllPendingParts,
  getPendingPartById,
  reviewPendingPart,
  getPendingPartsStatistics,
  deletePendingPart
} = require('../controllers/pendingPartController');

const router = express.Router();

// GET pending parts statistics (must come before /:id route)
router.get('/stats/summary', getPendingPartsStatistics);

// GET all pending parts
router.get('/', getAllPendingParts);

// GET pending part by ID
router.get('/:id', getPendingPartById);

// POST review pending part (accept/reject)
router.post('/:id/review', reviewPendingPart);

// DELETE pending part (admin only)
router.delete('/:id', deletePendingPart);

module.exports = router;
