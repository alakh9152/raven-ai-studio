const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');

const router = Router();

// GET /api/contact
router.get('/', async (req, res) => {
  res.json({ message: 'Raven API - Use /api/auth/* for auth endpoints' });
});

// POST /api/contact - Submit enquiry
router.post(
  '/contact',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().normalizeEmail(),
    body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, message } = req.body;

      const result = await query(
        'INSERT INTO enquiries (name, email, message) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
        [name, email, message]
      );

      // TODO: Send email notification

      res.status(201).json({
        message: 'Enquiry submitted successfully',
        enquiry: result.rows[0],
      });
    } catch (err) {
      console.error('Contact error:', err);
      res.status(500).json({ error: 'Failed to submit enquiry' });
    }
  }
);

module.exports = router;
