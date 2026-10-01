const { query, transaction } = require('../config/db');
const authService = require('./authService');

class DashboardService {
  // Get dashboard statistics
  async getStats(userId, role) {
    if (role === 'admin') {
      // Admin sees all stats
      const [users, projects, enquiries] = await Promise.all([
        query('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
        query('SELECT COUNT(*) as count FROM projects'),
        query("SELECT COUNT(*) as count FROM enquiries WHERE status = 'new'"),
      ]);

      return {
        totalUsers: parseInt(users.rows[0].count),
        totalProjects: parseInt(projects.rows[0].count),
        pendingEnquiries: parseInt(enquiries.rows[0].count),
      };
    } else {
      // Client sees their own stats
      const [projects, enquiries] = await Promise.all([
        query('SELECT COUNT(*) as count FROM projects WHERE client_id = $1', [userId]),
        query("SELECT COUNT(*) as count FROM enquiries WHERE email = (SELECT email FROM users WHERE id = $1)", [userId]),
      ]);

      return {
        totalProjects: parseInt(projects.rows[0].count),
        totalEnquiries: parseInt(enquiries.rows[0].count),
      };
    }
  }

  // Get projects for user
  async getProjects(userId, role) {
    if (role === 'admin') {
      return await query(`
        SELECT p.*, u.email as client_email, u.first_name, u.last_name
        FROM projects p
        JOIN users u ON p.client_id = u.id
        ORDER BY p.created_at DESC
      `);
    } else {
      return await query(
        'SELECT * FROM projects WHERE client_id = $1 ORDER BY created_at DESC',
        [userId]
      );
    }
  }

  // Get users (admin only)
  async getUsers() {
    return await query(`
      SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at
      FROM users
      ORDER BY created_at DESC
    `);
  }

  // Get enquiries
  async getEnquiries(userId, role) {
    if (role === 'admin') {
      return await query('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 50');
    } else {
      // Clients can only see their own enquiries
      const userEmail = await query('SELECT email FROM users WHERE id = $1', [userId]);
      return await query(
        "SELECT * FROM enquiries WHERE email = $1 ORDER BY created_at DESC",
        [userEmail.rows[0].email]
      );
    }
  }

  // Update enquiry status
  async updateEnquiryStatus(enquiryId, status, userId) {
    const result = await query(
      'UPDATE enquiries SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status',
      [status, enquiryId]
    );

    if (result.rows.length === 0) {
      throw new Error('Enquiry not found');
    }

    // Log the activity
    await query(
      `SELECT log_activity($1, 'enquiry_status_update', 'enquiry', $2, NULL, NULL, NULL, 
        jsonb_build_object('status', $3))`,
      [userId, enquiryId, status]
    );

    return result.rows[0];
  }
}

module.exports = new DashboardService();
