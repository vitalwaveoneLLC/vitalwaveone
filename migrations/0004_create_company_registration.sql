-- Migration: Create Company Registration and User Tables
-- Description: Add support for company registration with payment and MFA

BEGIN;

-- Companies Table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  license_number VARCHAR(100),
  registration_number VARCHAR(100),
  license_document_url TEXT,
  registration_document_url TEXT,
  logo_url TEXT,

  -- Owner/Admin Info
  owner_first_name VARCHAR(100) NOT NULL,
  owner_last_name VARCHAR(100) NOT NULL,
  owner_email VARCHAR(255) NOT NULL UNIQUE,
  owner_phone VARCHAR(20),

  -- Address (Separate Fields)
  street_address VARCHAR(255),
  building_id VARCHAR(50),
  zip_code VARCHAR(10),
  state VARCHAR(50),

  -- Subscription Info
  subscription_plan VARCHAR(50) CHECK (subscription_plan IN ('starter', 'professional', 'enterprise')),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  payment_id VARCHAR(255),

  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'cancelled')),
  mfa_enabled BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT company_name_not_empty CHECK (char_length(name) > 0)
);

-- Users/Customers Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),

  -- Address
  street_address VARCHAR(255),
  building_id VARCHAR(50),
  zip_code VARCHAR(10),
  state VARCHAR(50),

  -- User Type
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('customer', 'driver', 'walk-in', 'admin')),

  -- Customer Specific
  license_number VARCHAR(100),
  registration_number VARCHAR(100),
  license_photo_url TEXT,
  registration_photo_url TEXT,

  -- Authentication
  password_hash VARCHAR(255),
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret VARCHAR(255),

  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,

  UNIQUE(company_id, email),
  CONSTRAINT user_name_not_empty CHECK (char_length(first_name) > 0 AND char_length(last_name) > 0)
);

-- Trucks/Fleet Table
CREATE TABLE IF NOT EXISTS trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  truck_number VARCHAR(50) NOT NULL,
  license_plate VARCHAR(50),
  vehicle_type VARCHAR(100),
  capacity_units INT,

  driver_id UUID REFERENCES users(id) ON DELETE SET NULL,

  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(company_id, truck_number)
);

-- Sessions/Activity Table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  token VARCHAR(255) UNIQUE,
  ip_address VARCHAR(50),
  user_agent TEXT,

  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_company_id (company_id),
  INDEX idx_sessions_expires_at (expires_at)
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(255),
  changes JSONB,

  ip_address VARCHAR(50),
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_audit_company_id (company_id),
  INDEX idx_audit_created_at (created_at)
);

-- Create Indexes
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_subscription ON companies(subscription_plan);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_trucks_company_id ON trucks(company_id);
CREATE INDEX idx_trucks_driver_id ON trucks(driver_id);

COMMIT;
