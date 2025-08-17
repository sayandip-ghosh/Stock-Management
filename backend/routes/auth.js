const express = require('express');
const {
  validateSignup,
  validateLogin,
  checkUserExists,
  signup,
  login,
  verifyToken,
  logout
} = require('../controllers/authController');

const router = express.Router();

// GET check if user exists
router.get('/check', checkUserExists);

// POST signup (only allowed if no users exist)
router.post('/signup', validateSignup, signup);

// POST login (only allowed if user exists)
router.post('/login', validateLogin, login);

// GET verify token
router.get('/verify', verifyToken);

// POST logout
router.post('/logout', logout);

module.exports = router;
