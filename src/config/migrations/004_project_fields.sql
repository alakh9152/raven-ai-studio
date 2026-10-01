-- Migration: 004_project_fields.sql
-- Enhanced project management fields

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'archived', 'cancelled')),
    client_id UUID NOT NULL REFERENCES users(id),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    budget DECIMAL(12, 2),
    estimated_hours DECIMAL(8, 2),
    actual_hours DECIMAL(8, 2),
    tags VARCHAR(255)[],
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project milestones
CREATE TABLE IF NOT EXISTS project_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project activities/log
CREATE TABLE IF NOT EXISTS project_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_project ON project_activities(project_id);

-- Trigger for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get project stats
CREATE OR REPLACE FUNCTION get_project_stats(p_project_id UUID)
RETURNS TABLE (
    total_milestones INTEGER,
    completed_milestones INTEGER,
    total_hours DECIMAL,
    estimated_hours DECIMAL,
    hours_remaining DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(m.id)::INTEGER as total_milestones,
        COUNT(CASE WHEN m.status = 'completed' THEN m.id END)::INTEGER as completed_milestones,
        COALESCE(p.actual_hours, 0) as total_hours,
        COALESCE(p.estimated_hours, 0) as estimated_hours,
        COALESCE(p.estimated_hours, 0) - COALESCE(p.actual_hours, 0) as hours_remaining
    FROM projects p
    LEFT JOIN project_milestones m ON m.project_id = p.id
    WHERE p.id = p_project_id
    GROUP BY p.id, p.actual_hours, p.estimated_hours;
END;
$$ LANGUAGE plpgsql;
