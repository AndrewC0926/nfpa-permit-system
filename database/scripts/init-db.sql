-- NFPA Permit System Database Schema
-- Production-ready PostgreSQL schema

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    organization VARCHAR(255),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create permit_types table
CREATE TABLE permit_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    base_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    inspection_required BOOLEAN DEFAULT true,
    validity_period_days INTEGER DEFAULT 365,
    required_documents JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create permits table
CREATE TABLE permits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permit_number VARCHAR(50) UNIQUE NOT NULL,
    blockchain_tx_id VARCHAR(255),
    applicant_id UUID REFERENCES users(id),
    permit_type_id UUID REFERENCES permit_types(id),
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    application_data JSONB NOT NULL,
    project_address TEXT NOT NULL,
    project_description TEXT,
    estimated_value DECIMAL(12,2),
    square_footage INTEGER,
    occupancy_type VARCHAR(100),
    contractor_info JSONB,
    fee_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    payment_transaction_id VARCHAR(255),
    assigned_inspector_id UUID REFERENCES users(id),
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approval_date TIMESTAMP WITH TIME ZONE,
    expiry_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create inspections table
CREATE TABLE inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permit_id UUID REFERENCES permits(id) ON DELETE CASCADE,
    inspection_type VARCHAR(100) NOT NULL,
    inspector_id UUID REFERENCES users(id),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    result VARCHAR(50),
    findings JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permit_id UUID REFERENCES permits(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_hash VARCHAR(255),
    uploaded_by UUID REFERENCES users(id),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT false
);

-- Create permit_history table (audit trail)
CREATE TABLE permit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permit_id UUID REFERENCES permits(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    performed_by UUID REFERENCES users(id),
    old_values JSONB,
    new_values JSONB,
    notes TEXT,
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table (for Redis backup)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- CITY, STATE, FEDERAL, CONTRACTOR
    jurisdiction VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    address JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create notification_preferences table
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    notification_types JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_permits_status ON permits(status);
CREATE INDEX idx_permits_applicant ON permits(applicant_id);
CREATE INDEX idx_permits_type ON permits(permit_type_id);
CREATE INDEX idx_permits_number ON permits(permit_number);
CREATE INDEX idx_permits_submission_date ON permits(submission_date);
CREATE INDEX idx_permits_project_address ON permits USING gin(to_tsvector('english', project_address));

CREATE INDEX idx_inspections_permit ON inspections(permit_id);
CREATE INDEX idx_inspections_inspector ON inspections(inspector_id);
CREATE INDEX idx_inspections_scheduled ON inspections(scheduled_date);
CREATE INDEX idx_inspections_status ON inspections(status);

CREATE INDEX idx_documents_permit ON documents(permit_id);
CREATE INDEX idx_documents_type ON documents(document_type);

CREATE INDEX idx_permit_history_permit ON permit_history(permit_id);
CREATE INDEX idx_permit_history_date ON permit_history(created_at);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Full-text search indexes
CREATE INDEX idx_permits_fulltext ON permits USING gin(
    to_tsvector('english', 
        coalesce(project_address, '') || ' ' || 
        coalesce(project_description, '') || ' ' ||
        coalesce(permit_number, '')
    )
);

-- Insert default permit types
INSERT INTO permit_types (code, name, description, category, base_fee, inspection_required, required_documents) VALUES
('NFPA72_COMMERCIAL', 'NFPA 72 Commercial Fire Alarm System', 'Commercial fire alarm system installation and maintenance', 'Fire Alarm', 150.00, true, '["floor_plans", "system_specifications", "contractor_license"]'),
('NFPA72_RESIDENTIAL', 'NFPA 72 Residential Fire Alarm System', 'Residential fire alarm system installation', 'Fire Alarm', 75.00, true, '["floor_plans", "contractor_license"]'),
('NFPA13_SPRINKLER', 'NFPA 13 Fire Sprinkler System', 'Fire sprinkler system installation and modification', 'Fire Suppression', 200.00, true, '["hydraulic_calculations", "system_plans", "contractor_license"]'),
('NFPA25_INSPECTION', 'NFPA 25 Fire System Inspection', 'Inspection, testing and maintenance of water-based fire protection systems', 'Inspection', 100.00, false, '["previous_inspection_report"]'),
('NFPA101_OCCUPANCY', 'NFPA 101 Life Safety Code Compliance', 'Life safety code compliance review', 'Life Safety', 125.00, true, '["floor_plans", "occupancy_calculations", "egress_analysis"]');

-- Create default admin user (password: admin123 - CHANGE IN PRODUCTION!)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active, email_verified) VALUES
('admin', 'admin@nfpapermits.gov', '$2b$10$rOzJz5XEV5QEwZQKhXvG4uF8kXKqVqGQaWGvPnHcVqYvKb2a5rN3K', 'System', 'Administrator', 'ADMIN', true, true);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permits_updated_at BEFORE UPDATE ON permits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permit_types_updated_at BEFORE UPDATE ON permit_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for permit history logging
CREATE OR REPLACE FUNCTION log_permit_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO permit_history (permit_id, action, old_values, new_values, created_at)
        VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), CURRENT_TIMESTAMP);
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO permit_history (permit_id, action, new_values, created_at)
        VALUES (NEW.id, 'CREATE', to_jsonb(NEW), CURRENT_TIMESTAMP);
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER permit_audit_trigger
    AFTER INSERT OR UPDATE ON permits
    FOR EACH ROW EXECUTE FUNCTION log_permit_changes();

-- Create view for permit dashboard
CREATE VIEW permit_dashboard AS
SELECT 
    pt.category,
    p.status,
    COUNT(*) as count,
    SUM(p.fee_amount) as total_fees,
    AVG(EXTRACT(EPOCH FROM (COALESCE(p.approval_date, CURRENT_TIMESTAMP) - p.submission_date))/86400) as avg_processing_days
FROM permits p
JOIN permit_types pt ON p.permit_type_id = pt.id
GROUP BY pt.category, p.status;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nfpa_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nfpa_admin;
GRANT USAGE ON SCHEMA public TO nfpa_admin;

-- Create read-only user for reporting
CREATE USER nfpa_readonly WITH PASSWORD 'readonly_password_change_in_production';
GRANT CONNECT ON DATABASE nfpa_permits TO nfpa_readonly;
GRANT USAGE ON SCHEMA public TO nfpa_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO nfpa_readonly;
GRANT SELECT ON permit_dashboard TO nfpa_readonly;

COMMIT;
