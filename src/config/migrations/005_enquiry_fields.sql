-- Migration: 005_enquiry_fields.sql
-- Enhanced enquiry and contact management

-- Enquiries table with extended fields
CREATE TABLE IF NOT EXISTS enquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    source VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'closed', 'spam')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES users(id),
    reply_message TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enquiry attachments
CREATE TABLE IF NOT EXISTS enquiry_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enquiry_id UUID NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    content_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_email ON enquiries(email);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_enquiries_assigned ON enquiries(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attachments_enquiry ON enquiry_attachments(enquiry_id);

-- Trigger for updated_at
CREATE TRIGGER update_enquiries_updated_at BEFORE UPDATE ON enquiries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get enquiry statistics
CREATE OR REPLACE FUNCTION get_enquiry_stats()
RETURNS TABLE (
    total_new INTEGER,
    total_read INTEGER,
    total_replied INTEGER,
    total_closed INTEGER,
    avg_response_time_hours DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(CASE WHEN e.status = 'new' THEN 1 END)::INTEGER as total_new,
        COUNT(CASE WHEN e.status = 'read' THEN 1 END)::INTEGER as total_read,
        COUNT(CASE WHEN e.status = 'replied' THEN 1 END)::INTEGER as total_replied,
        COUNT(CASE WHEN e.status = 'closed' THEN 1 END)::INTEGER as total_closed,
        AVG(EXTRACT(EPOCH FROM (e.resolved_at - e.created_at)) / 3600)::DECIMAL as avg_response_time_hours
    FROM enquiries e
    WHERE e.status NOT IN ('spam');
END;
$$ LANGUAGE plpgsql;
