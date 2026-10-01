const { query, transaction } = require('../config/db');
const { generateToken, hashToken } = require('./crypto');

class EmailService {
  // Send email verification
  async sendVerificationEmail(email, userId, token) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, hashToken(token), expiresAt]
    );
    
    // In production, integrate with email service
    // For now, log for testing
    console.log(`[EMAIL VERIFICATION] Token for ${email}: ${token}`);
    
    return { success: true, message: 'Verification email sent' };
  }

  // Send password reset email
  async sendPasswordResetEmail(email, userId, token) {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, hashToken(token), expiresAt]
    );
    
    console.log(`[PASSWORD RESET] Token for ${email}: ${token}`);
    
    return { success: true, message: 'Password reset email sent' };
  }

  // Verify email
  async verifyEmail(userId, token) {
    const result = await query(
      `SELECT id FROM email_verification_tokens 
       WHERE user_id = $1 AND token_hash = $2 AND expires_at > NOW() AND used_at IS NULL`,
      [userId, hashToken(token)]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Invalid or expired verification token');
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

  // Generate password reset token
  async generatePasswordResetToken(userId) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    
    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, hashToken(token), expiresAt]
    );
    
    return token;
  }

  // Reset password
  async resetPassword(userId, token, newPassword) {
    const result = await query(
      `SELECT id FROM password_reset_tokens 
       WHERE user_id = $1 AND token_hash = $2 AND expires_at > NOW() AND used_at IS NULL`,
      [userId, hashToken(token)]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Invalid or expired reset token');
    }
    
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, userId]
    );
    
    await query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1`,
      [userId]
    );
    
    // Revoke all sessions
    await query(
      `UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1`,
      [userId]
    );
    
    return { success: true };
  }
}

module.exports = new EmailService();
