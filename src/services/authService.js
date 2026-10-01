const { query, transaction } = require('../config/db');
const { hashPassword, comparePassword, generateSessionToken, isValidEmail, validatePassword } = require('./crypto');
const { generateToken, hashToken } = require('./crypto');

class AuthService {
  // Register new user
  async register({ email, password, firstName, lastName }) {
    // Validate inputs
    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }
    if (!validatePassword(password)) {
      throw new Error('Password must be at least 8 characters with letters and numbers');
    }

    return await transaction(async (client) => {
      // Check if user exists
      const existing = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (existing.rows.length > 0) {
        throw new Error('Email already registered');
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Generate email verification token
      const verificationToken = generateToken();
      const tokenHash = hashToken(verificationToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const result = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, email, first_name, last_name, role, email_verified, created_at`,
        [email.toLowerCase(), passwordHash, firstName, lastName, 'client']
      );

      // Store verification token
      await client.query(
        `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) 
         VALUES ($1, $2, $3)`,
        [result.rows[0].id, tokenHash, expiresAt]
      );

      return {
        user: {
          id: result.rows[0].id,
          email: result.rows[0].email,
          firstName: result.rows[0].first_name,
          lastName: result.rows[0].last_name,
          role: result.rows[0].role,
          emailVerified: result.rows[0].email_verified,
        },
        verificationToken, // Return token for email (in production, send via email)
      };
    });
  }

  // Login user
  async login({ email, password, ipAddress, userAgent }) {
    const normalizedEmail = email.toLowerCase();

    return await transaction(async (client) => {
      // Find user
      const result = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [normalizedEmail]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = result.rows[0];

      // Check if account is active
      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }

      // Check if account is locked
      if (user.locked_until && user.locked_until > new Date()) {
        throw new Error('Account is temporarily locked. Try again later.');
      }

      // Verify password
      const validPassword = await comparePassword(password, user.password_hash);
      if (!validPassword) {
        // Call database function to handle failed login
        await client.query(
          'SELECT handle_failed_login($1, $2)',
          [user.id, ipAddress]
        );
        throw new Error('Invalid credentials');
      }

      // Successful login - reset failed attempts
      await client.query(
        'SELECT handle_successful_login($1)',
        [user.id]
      );

      // Generate session
      const sessionId = generateSessionToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await client.query(
        `INSERT INTO sessions (session_id, user_id, ip_address, user_agent, expires_at) 
         VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, user.id, ipAddress, userAgent, expiresAt]
      );

      // Log successful login
      await client.query(
        `SELECT log_activity($1, 'login_success', 'user', $2, $3, $4, $5, NULL)`,
        [user.id, user.id, ipAddress, userAgent, sessionId]
      );

      return {
        session: {
          id: sessionId,
          expiresAt,
        },
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
        },
      };
    });
  }

  // Logout user
  async logout(sessionId) {
    return await query(
      `UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE session_id = $1 AND revoked_at IS NULL`,
      [sessionId]
    );
  }

  // Get current user from session
  async getSessionUser(sessionId) {
    const result = await query(
      `SELECT u.*, s.expires_at, s.revoked_at
       FROM users u
       JOIN sessions s ON u.id = s.user_id
       WHERE s.session_id = $1 
       AND s.revoked_at IS NULL 
       AND s.expires_at > NOW()`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      emailVerified: user.email_verified,
    };
  }

  // Verify email
  async verifyEmail(userId, token) {
    const result = await query(
      `SELECT id FROM email_verification_tokens 
       WHERE user_id = $1 
       AND token_hash = $2 
       AND expires_at > NOW() 
       AND used_at IS NULL`,
      [userId, hashToken(token)]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired verification token');
    }

    return await query(
      `UPDATE users 
       SET email_verified = true, email_verified_at = NOW() 
       WHERE id = $1`,
      [userId]
    );
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    if (!validatePassword(newPassword)) {
      throw new Error('New password does not meet requirements');
    }

    return await transaction(async (client) => {
      // Get current user
      const result = await client.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      // Verify current password
      const valid = await comparePassword(currentPassword, result.rows[0].password_hash);
      if (!valid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newHash = await hashPassword(newPassword);

      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newHash, userId]
      );

      // Revoke all sessions
      await client.query(
        'UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1',
        [userId]
      );

      // Log password change
      await client.query(
        `SELECT log_activity($1, 'password_change', 'user', $1, NULL, NULL, NULL, NULL)`,
        [userId]
      );

      return { success: true };
    });
  }
}

module.exports = new AuthService();
