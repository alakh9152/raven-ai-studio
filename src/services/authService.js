const { query, transaction } = require('../config/db');
const { hashPassword, comparePassword, generateSessionToken, isValidEmail, validatePassword } = require('./crypto');

class AuthService {
  // Register new user
  async register({ email, password, firstName, lastName }) {
    if (!isValidEmail(email)) {
      throw Object.assign(new Error('Invalid email format'), { statusCode: 400 });
    }
    if (!validatePassword(password)) {
      throw Object.assign(new Error('Password must be at least 8 characters with letters and numbers'), { statusCode: 400 });
    }

    return await transaction(async (client) => {
      const existing = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (existing.rows.length > 0) {
        throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
      }

      const passwordHash = await hashPassword(password);
      const verificationToken = generateSessionToken();
      const tokenHash = require('./crypto').hashToken(verificationToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const result = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, email, first_name, last_name, role, email_verified, created_at`,
        [email.toLowerCase(), passwordHash, firstName || null, lastName || null, 'client']
      );

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
        verificationToken,
      };
    });
  }

  // Login user
  async login({ email, password, ipAddress, userAgent }) {
    const normalizedEmail = email.toLowerCase();

    return await transaction(async (client) => {
      const result = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [normalizedEmail]
      );

      if (result.rows.length === 0) {
        throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        throw Object.assign(new Error('Account is deactivated'), { statusCode: 403 });
      }

      const validPassword = await comparePassword(password, user.password_hash);
      if (!validPassword) {
        throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
      }

      // Generate session
      const sessionId = generateSessionToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await client.query(
        `INSERT INTO sessions (session_id, user_id, ip_address, user_agent, expires_at) 
         VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, user.id, ipAddress, userAgent, expiresAt]
      );

      await client.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
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
          emailVerified: user.email_verified,
        },
      };
    });
  }

  // Logout user
  async logout(sessionId) {
    if (!sessionId) return;
    return await query(
      `UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE session_id = $1 AND revoked_at IS NULL`,
      [sessionId]
    );
  }

  // Get current user from session
  async getSessionUser(sessionId) {
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.email_verified,
              s.expires_at, s.revoked_at
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
      isActive: user.is_active,
    };
  }

  // Verify email
  async verifyEmail(userId, token) {
    const hashToken = require('./crypto').hashToken;
    const result = await query(
      `SELECT id FROM email_verification_tokens 
       WHERE user_id = $1 
       AND token_hash = $2 
       AND expires_at > NOW() 
       AND used_at IS NULL`,
      [userId, hashToken(token)]
    );

    if (result.rows.length === 0) {
      throw Object.assign(new Error('Invalid or expired verification token'), { statusCode: 400 });
    }

    await query(
      `UPDATE users SET email_verified = true, email_verified_at = NOW() WHERE id = $1`,
      [userId]
    );

    await query(
      `UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1`,
      [userId]
    );

    return { success: true };
  }

  // Get user profile
  async getProfile(userId) {
    const result = await query(
      'SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }
    return result.rows[0];
  }

  // Update profile
  async updateProfile(userId, { firstName, lastName }) {
    return await query(
      'UPDATE users SET first_name = $1, last_name = $2 WHERE id = $3 RETURNING id, email, first_name, last_name, role',
      [firstName, lastName, userId]
    );
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    const hashToken = require('./crypto').hashToken;
    if (!validatePassword(newPassword)) {
      throw Object.assign(new Error('New password does not meet requirements'), { statusCode: 400 });
    }

    return await transaction(async (client) => {
      const result = await client.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      if (result.rows.length === 0) {
        throw Object.assign(new Error('User not found'), { statusCode: 404 });
      }

      const valid = await comparePassword(currentPassword, result.rows[0].password_hash);
      if (!valid) {
        throw Object.assign(new Error('Current password is incorrect'), { statusCode: 401 });
      }

      const newHash = await hashPassword(newPassword);
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newHash, userId]
      );

      // Revoke all sessions except current
      await client.query(
        'UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
        [userId]
      );

      return { success: true };
    });
  }

  // Generate password reset token
  async forgotPassword(email) {
    const hashToken = require('./crypto').hashToken;
    const normalizedEmail = email.toLowerCase();
    const result = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    
    if (result.rows.length === 0) {
      // Don't reveal whether email exists
      return { success: true, message: 'If the email exists, a reset link has been sent' };
    }

    const userId = result.rows[0].id;
    const token = generateSessionToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );

    return { success: true, token, userId };
  }

  // Reset password with token
  async resetPassword(token, newPassword) {
    if (!validatePassword(newPassword)) {
      throw Object.assign(new Error('Password does not meet requirements'), { statusCode: 400 });
    }

    const hashToken = require('./crypto').hashToken;
    const result = await query(
      `SELECT user_id FROM password_reset_tokens 
       WHERE token_hash = $1 AND expires_at > NOW() AND used_at IS NULL`,
      [hashToken(token)]
    );

    if (result.rows.length === 0) {
      throw Object.assign(new Error('Invalid or expired reset token'), { statusCode: 400 });
    }

    const userId = result.rows[0].user_id;
    const newHash = await hashPassword(newPassword);

    return await transaction(async (client) => {
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newHash, userId]
      );
      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1',
        [userId]
      );
      // Revoke all sessions
      await client.query(
        'UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1',
        [userId]
      );
      return { success: true };
    });
  }
}

module.exports = new AuthService();
