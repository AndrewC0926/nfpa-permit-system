const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'INSP_001',
        permitId: 'PERMIT_DEMO_001',
        type: 'PRELIMINARY',
        scheduledDate: '2025-06-15T10:00:00Z',
        inspector: 'John Smith',
        status: 'SCHEDULED'
      }
    ]
  });
});

module.exports = router;
