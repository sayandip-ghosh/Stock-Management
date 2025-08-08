const express = require('express');
const {
  validateAssembly,
  getAllAssemblies,
  getAssemblyById,
  createAssembly,
  updateAssembly,
  deleteAssembly,
  addPartToAssembly,
  removePartFromAssembly,
  buildAssembly,
  getAssemblyStatistics
} = require('../controllers/assemblyController');

const router = express.Router();

// GET all assemblies
router.get('/', getAllAssemblies);

// GET assembly by ID
router.get('/:id', getAssemblyById);

// POST create new assembly
router.post('/', validateAssembly, createAssembly);

// PUT update assembly
router.put('/:id', validateAssembly, updateAssembly);

// DELETE assembly
router.delete('/:id', deleteAssembly);

// POST add part to assembly
router.post('/:id/parts', addPartToAssembly);

// DELETE remove part from assembly
router.delete('/:id/parts/:part_id', removePartFromAssembly);

// POST build assembly
router.post('/:id/build', buildAssembly);

// GET assembly statistics
router.get('/stats/summary', getAssemblyStatistics);

module.exports = router;
