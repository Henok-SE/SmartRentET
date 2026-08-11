const express = require('express');

const router = express.Router();

router.get('/summary', (req, res) => {
  res.status(200).json({
    message: 'SmartRent dashboard API is working',
  });
});

module.exports = router;