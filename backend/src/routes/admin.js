const express = require('express');
const router = express.Router();

router.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      totalPermits: 156,
      pendingReview: 23,
      approved: 98,
      rejected: 12,
      revenueCollected: 15750.00,
      inspectionsPending: 8
    }
  });
});

module.exports = router;
