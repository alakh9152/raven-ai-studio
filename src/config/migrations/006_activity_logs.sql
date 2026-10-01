-- Migration: 006_activity_logs.sql
-- Comprehensive activity logging system

-- General activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(128),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- API request logs
CREATE TABLE IF NOT EXISTS api_request_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    query_params TEXT,
    request_body JSONB,
    status_code INTEGER,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_requests_request_id ON api_request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_api_requests_user ON api_request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_requests_path ON api_request_logs(path);
CREATE INDEX IF NOT EXISTS idx_api_requests_created ON api_request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_requests_status ON api_request_logs(status_code);

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_action VARCHAR(100),
    p_entity_type VARCHAR(50),
    p_entity_id UUID,
    p_ip INET,
    p_user_agent TEXT,
    p_session_id VARCHAR(128),
    p_metadata JSONB
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO activity_logs (
        user_id, action, entity_type, entity_id, ip_address, user_agent, session_id, metadata
    ) VALUES (
        p_user_id, p_action, p_entity_type, p_entity_id, p_ip, p_user_agent, p_session_id, p_metadata
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log API request
CREATE OR REPLACE FUNCTION log_api_request(
    p_request_id UUID,
    p_user_id UUID,
    p_method VARCHAR(10),
    p_path VARCHAR(500),
    p_query_params TEXT,
    p_request_body JSONB,
    p_status_code INTEGER,
    p_response_time_ms INTEGER,
    p_ip INET,
    p_user_agent TEXT,
    p_error_message TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO api_request_logs (
        request_id, user_id, method, path, query_params, request_body, 
        status_code, response_time_ms, ip_address, user_agent, error_message
    ) VALUES (
        p_request_id, p_user_id, p_method, p_path, p_query_params, p_request_body,
        p_status_code, p_response_time_ms, p_ip, p_user_agent, p_error_message
    );
END;
$$ LANGUAGE plpgsql;

-- View for dashboard activity
CREATE OR REPLACE VIEW v_recent_activity AS
SELECT 
    al.id,
    al.user_id,
    u.email as user_email,
    al.action,
    al.entity_type,
    al.entity_id,
    al.metadata,
    al.created_at
FROM activity_logs al
LEFT JOIN users u ON u.id = al.user_id
ORDER BY al.created_at DESC
LIMIT 50;

-- View for API performance
CREATE OR REPLACE VIEW v_api_performance AS
SELECT 
    path,
    method,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_time,
    MAX(response_time_ms) as max_response_time,
    AVG(CASE WHEN status_code >= 400 THEN 1.0 ELSE 0.0 END) as error_rate
FROM api_request_logs
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY path, method;
