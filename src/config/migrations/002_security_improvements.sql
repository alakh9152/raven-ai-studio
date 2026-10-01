-- Migration: 002_security_improvements.sql
-- Security enhancements and audit logging

-- Audit log table for tracking security events
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
    identifier VARCHAR(255) PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
    p_user_id UUID,
    p_action VARCHAR(100),
    p_entity_type VARCHAR(50),
    p_entity_id UUID,
    p_ip_address INET,
    p_user_agent TEXT,
    p_metadata JSONB
) RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, ip_address, user_agent, metadata
    ) VALUES (
        p_user_id, p_action, p_entity_type, p_entity_id, p_ip_address, p_user_agent, p_metadata
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier VARCHAR(255),
    p_max_attempts INTEGER,
    p_window_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    v_window_start := CURRENT_TIMESTAMP - (p_window_minutes || ' minutes')::INTERVAL;
    
    -- Clean old entries
    DELETE FROM rate_limits WHERE window_start < v_window_start;
    
    -- Get current count
    SELECT count INTO v_count 
    FROM rate_limits 
    WHERE identifier = p_identifier AND window_start >= v_window_start;
    
    v_count := COALESCE(v_count, 0);
    
    IF v_count >= p_max_attempts THEN
        RETURN FALSE;
    END IF;
    
    -- Increment count
    INSERT INTO rate_limits (identifier, count, window_start)
    VALUES (p_identifier, v_count + 1, v_window_start)
    ON CONFLICT (identifier) DO UPDATE
    SET count = rate_limits.count + 1,
        window_start = v_window_start;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- View for recent security events
CREATE OR REPLACE VIEW v_recent_security_events AS
SELECT 
    id,
    user_id,
    action,
    entity_type,
    entity_id,
    ip_address,
    user_agent,
    metadata,
    created_at
FROM audit_logs
WHERE action IN ('login_failed', 'login_success', 'logout', 'password_change', 'account_locked')
ORDER BY created_at DESC
LIMIT 100;
