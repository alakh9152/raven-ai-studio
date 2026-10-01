const { Router } = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { query } = require('../config/db');

const router = Router();

// GET /api/dashboard/stats - Protected
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM enquiries WHERE status = 'new') as pending_enquiries
    `);
    res.json(stats.rows[0]);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/dashboard/projects - Protected
router.get('/projects', requireAuth, async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, u.email as client_email, u.first_name, u.last_name
      FROM projects p
      JOIN users u ON p.client_id = u.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Projects error:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/dashboard/users - Admin only
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, email, first_name, last_name, role, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/dashboard/enquiries - Read enquiries
router.post('/enquiries', requireAuth, async (req, res) => {
  try {
    const result = await query('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (err) {
    console.error('Enquiries error:', err);
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
});

// POST /api/dashboard/enquiries/:id/status - Update enquiry status
router.post('/enquiries/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const result = await query(
      'UPDATE enquiries SET status = $1 WHERE id = $2 RETURNING id, status',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update enquiry error:', err);
    res.status(500).json({ error: 'Failed to update enquiry' });
  }
});

module.exports = router;
