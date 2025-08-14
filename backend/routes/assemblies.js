const express = require('express');
const {
  validateAssembly,
  getAllAssemblies,
  getAssemblyById,
  createAssembly,
  updateAssembly,
  deleteAssembly,
  addBOMItem,
  removeBOMItem,
  buildAssembly,
  shipAssembly,
  dismantleAssembly
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

// POST add BOM item to assembly
router.post('/:id/bom', addBOMItem);

// DELETE remove BOM item from assembly
router.delete('/:id/bom/:itemId', removeBOMItem);

// POST build assembly
router.post('/:id/build', buildAssembly);

// POST ship assembly
router.post('/:id/ship', shipAssembly);

// POST dismantle assembly
router.post('/:id/dismantle', dismantleAssembly);

module.exports = router;
