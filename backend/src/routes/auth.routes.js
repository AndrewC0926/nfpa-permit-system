const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Register a new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Apply authentication middleware to protected routes
router.use(authController.verifyToken);

// Get current user profile
router.get('/profile', authController.getProfile);

// Update user profile
router.patch('/profile', authController.updateProfile);

// Change password
router.post('/change-password', authController.changePassword);

module.exports = router; 