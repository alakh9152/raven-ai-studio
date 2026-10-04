const { Router } = require('express');
const { query } = require('../config/db');

const router = Router();

// POST /api/contact - Submit enquiry
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'Name, email, and message are required' });
    }

    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Name must be at least 2 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    if (typeof message !== 'string' || message.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Message must be at least 10 characters' });
    }

    const result = await query(
      'INSERT INTO enquiries (name, email, subject, message) VALUES ($1, $2, $3, $4) RETURNING id, name, email, created_at',
      [name.trim(), email.trim().toLowerCase(), subject?.trim() || null, message.trim()]
    );

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully',
      enquiry: result.rows[0],
    });
  } catch (err) {
    console.error('Contact error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to submit enquiry' });
  }
});

module.exports = router;
