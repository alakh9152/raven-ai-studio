const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const dashboardService = require('../services/dashboardService');

const router = Router();

// GET /api/dashboard - Full dashboard data
router.get('/', requireAuth, async (req, res) => {
  try {
    const stats = await dashboardService.getStats(req.user.id);
    const projects = await dashboardService.getProjects(req.user.id);
    const enquiries = await dashboardService.getEnquiries(req.user.id);

    res.json({
      stats,
      projects: projects.rows.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        created_at: p.created_at,
      })),
      enquiries: enquiries.rows.map(e => ({
        id: e.id,
        subject: e.subject || 'No subject',
        message: e.message,
        status: e.status,
        created_at: e.created_at,
      })),
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
});

// GET /api/dashboard/stats - Stats only
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await dashboardService.getStats(req.user.id);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// GET /api/dashboard/projects - User's projects
router.get('/projects', requireAuth, async (req, res) => {
  try {
    const result = await dashboardService.getProjects(req.user.id);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

// POST /api/dashboard/projects - Create project
router.post('/projects', requireAuth, async (req, res) => {
  try {
    const { name, description, status } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Project name must be at least 2 characters' });
    }
    const result = await dashboardService.createProject(req.user.id, { name: name.trim(), description, status });
    res.status(201).json({ success: true, project: result.rows[0] });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ success: false, error: 'Failed to create project' });
  }
});

// PATCH /api/dashboard/projects/:id - Update project
router.patch('/projects/:id', requireAuth, async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const project = await dashboardService.getProject(req.user.id, req.params.id);
    const result = await dashboardService.updateProject(req.user.id, req.params.id, { name, description, status });
    res.json({ success: true, project: result.rows[0] });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// DELETE /api/dashboard/projects/:id - Delete project
router.delete('/projects/:id', requireAuth, async (req, res) => {
  try {
    await dashboardService.deleteProject(req.user.id, req.params.id);
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/enquiries - User's enquiries
router.get('/enquiries', requireAuth, async (req, res) => {
  try {
    const result = await dashboardService.getEnquiries(req.user.id);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch enquiries' });
  }
});

module.exports = router;
