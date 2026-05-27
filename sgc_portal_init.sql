-- SGC Portal Database Schema & Seed Data
-- Database: PostgreSQL

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'away')),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User-Roles Mapping
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    head_of_dept VARCHAR(100)
);

-- Systems Registry
CREATE TABLE IF NOT EXISTS systems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'critical', 'decommissioned')),
    uptime_percentage DECIMAL(5,2),
    documentation_url TEXT,
    repository_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit & Logging
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    old_values TEXT,
    new_values TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. SEED DATA

-- Initial Roles
INSERT INTO roles (name, description) VALUES 
('Super Admin', 'Full system access including user management and audit deletion'),
('System Admin', 'Manage systems directory and view audit logs'),
('Operator', 'Update system status and maintenance notes'),
('Viewer', 'Read-only access to system directory');

-- Initial Categories
INSERT INTO categories (name, description) VALUES 
('Internal', 'Applications used exclusively within the corporate network'),
('Client Facing', 'Portals and APIs accessible by customers'),
('Infrastructure', 'Core network, storage, and server systems'),
('Operations', 'Tools for managing day-to-day business processes');

-- Initial Departments
INSERT INTO departments (name, head_of_dept) VALUES 
('IT Operations', 'Robert Chen'),
('HR Dept', 'Sarah Miller'),
('Sales', 'David Wilson'),
('Accounting', 'Linda Garcia'),
('Engineering', 'James Smith');

-- Sample User
INSERT INTO users (email, full_name, status) VALUES 
('admin@sgc.com', 'System Administrator', 'active');

-- Link User to Role
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r 
WHERE u.email = 'admin@sgc.com' AND r.name = 'Super Admin';

-- Sample Systems
INSERT INTO systems (name, description, category_id, department_id, status, uptime_percentage) 
VALUES 
('HR Management System', 'Centralized employee database and payroll management.', 
 (SELECT id FROM categories WHERE name = 'Internal'), 
 (SELECT id FROM departments WHERE name = 'HR Dept'), 'active', 99.9),

('Customer Portal', 'External facing portal for customer support and orders.', 
 (SELECT id FROM categories WHERE name = 'Client Facing'), 
 (SELECT id FROM departments WHERE name = 'Sales'), 'active', 99.8),

('Inventory Controller', 'Real-time tracking of warehouse stock and shipments.', 
 (SELECT id FROM categories WHERE name = 'Operations'), 
 (SELECT id FROM departments WHERE name = 'IT Operations'), 'maintenance', 94.5),

('Cloud Storage API', 'Core storage API for all internal applications.', 
 (SELECT id FROM categories WHERE name = 'Infrastructure'), 
 (SELECT id FROM departments WHERE name = 'Engineering'), 'active', 99.99);

-- 4. RLS & POLICIES

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create default permissive policies for development (WARNING: Update these for production!)
CREATE POLICY "Allow full access to roles" ON roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to user_roles" ON user_roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to departments" ON departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to systems" ON systems FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
