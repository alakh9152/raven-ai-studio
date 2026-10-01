-- Migration: 003_email_verification_improvements.sql
-- Enhanced email verification and user preferences

-- Add email verification fields to users (if not exists)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Create user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, preference_key)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

-- Function to handle failed login
CREATE OR REPLACE FUNCTION handle_failed_login(p_user_id UUID, p_ip INET)
RETURNS VOID AS $$
DECLARE
    v_attempts INTEGER;
    v_locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Increment attempts
    UPDATE users 
    SET login_attempts = login_attempts + 1,
        last_login_attempt = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    
    -- Get current attempts
    SELECT login_attempts INTO v_attempts FROM users WHERE id = p_user_id;
    
    -- Lock account after 5 failed attempts for 30 minutes
    IF v_attempts >= 5 AND v_locked_until IS NULL THEN
        v_locked_until := CURRENT_TIMESTAMP + INTERVAL '30 minutes';
        UPDATE users SET locked_until = v_locked_until WHERE id = p_user_id;
        
        -- Log the lock
        PERFORM create_audit_log(
            p_user_id, 
            'account_locked', 
            'user', 
            p_user_id, 
            p_ip, 
            NULL,
            jsonb_build_object('attempts', v_attempts, 'locked_until', v_locked_until)
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to handle successful login
CREATE OR REPLACE FUNCTION handle_successful_login(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET login_attempts = 0,
        locked_until = NULL,
        last_login_at = CURRENT_TIMESTAMP,
        last_login_ip = inet_client_addr()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;
