const express = require('express');
const { healthCheck } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const health = await healthCheck();
    res.json(health);
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      error: error.message 
    });
  }
});

module.exports = router;