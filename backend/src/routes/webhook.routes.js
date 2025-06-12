const express = require('express');
const router = express.Router();
const WebhookController = require('../controllers/webhook.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Fail fast if run as root or with sudo
if (typeof process.getuid === 'function' && process.getuid() === 0) {
  // eslint-disable-next-line no-console
  console.error('❌ Do not run the backend as root or with sudo. Exiting.');
  process.exit(1);
}
if (process.env.SUDO_USER) {
  // eslint-disable-next-line no-console
  console.error('❌ Do not run the backend with sudo. Exiting.');
  process.exit(1);
}

// AI analysis webhook endpoint
router.post('/ai-analysis', WebhookController.handleAIAnalysis);

// Protected webhook endpoints (if needed)
router.post('/protected', verifyToken, (req, res) => {
    // Handle protected webhooks here
    res.status(200).json({ message: 'Protected webhook received' });
});

module.exports = router; 