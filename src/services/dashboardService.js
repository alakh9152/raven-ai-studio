const { query } = require('../config/db');

class DashboardService {
  // Get dashboard statistics for current user
  async getStats(userId) {
    const [projects, enquiries] = await Promise.all([
      query('SELECT COUNT(*) as count FROM projects WHERE client_id = $1 AND status != $2', [userId, 'archived']),
      query("SELECT COUNT(*) as count FROM enquiries WHERE email = (SELECT email FROM users WHERE id = $1)", [userId]),
    ]);

    return {
      totalProjects: parseInt(projects.rows[0].count),
      pendingEnquiries: parseInt(enquiries.rows[0].count),
    };
  }

  // Get user's projects
  async getProjects(userId) {
    return await query(
      `SELECT * FROM projects 
       WHERE client_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  // Create a project
  async createProject(userId, { name, description, status }) {
    return await query(
      `INSERT INTO projects (name, description, status, client_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description || null, status || 'active', userId]
    );
  }

  // Get single project with ownership check
  async getProject(userId, projectId) {
    const result = await query(
      'SELECT * FROM projects WHERE id = $1 AND client_id = $2',
      [projectId, userId]
    );
    if (result.rows.length === 0) {
      throw Object.assign(new Error('Project not found'), { statusCode: 404 });
    }
    return result.rows[0];
  }

  // Update project with ownership check
  async updateProject(userId, projectId, { name, description, status }) {
    const result = await query(
      `UPDATE projects 
       SET name = COALESCE($1, name), description = COALESCE($2, description), 
           status = COALESCE($3, status) 
       WHERE id = $4 AND client_id = $5 
       RETURNING *`,
      [name, description, status, projectId, userId]
    );
    if (result.rows.length === 0) {
      throw Object.assign(new Error('Project not found'), { statusCode: 404 });
    }
    return result.rows[0];
  }

  // Delete project with ownership check
  async deleteProject(userId, projectId) {
    const result = await query(
      'DELETE FROM projects WHERE id = $1 AND client_id = $2 RETURNING id',
      [projectId, userId]
    );
    if (result.rows.length === 0) {
      throw Object.assign(new Error('Project not found'), { statusCode: 404 });
    }
    return { success: true };
  }

  // Get enquiries for user
  async getEnquiries(userId) {
    const userEmail = await query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userEmail.rows.length === 0) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }
    return await query(
      'SELECT * FROM enquiries WHERE email = $1 ORDER BY created_at DESC',
      [userEmail.rows[0].email]
    );
  }
}

module.exports = new DashboardService();
