const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication endpoint ready',
    token: 'demo-token'
  });
});

module.exports = router;
