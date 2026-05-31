-- migrations/0000_create_companies_table.sql
-- Create companies table for multi-tenant support
-- This must be run FIRST before other migrations that reference companies

-- Companies/Tenants table
CREATE TABLE IF NOT EXISTS companies (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  text NOT NULL,
  email                 text,
  phone                 text,
  address               text,
  city                  text,
  state                 text,
  zip                   text,
  tax_id                text,  -- EIN/Tax ID
  tax_rate              numeric DEFAULT 0,
  check_penalty         numeric DEFAULT 50,
  status                text DEFAULT 'active',  -- active, inactive, suspended
  subscription_tier     text DEFAULT 'basic',  -- basic, pro, enterprise
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- Create index on company name and status for lookups
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- Alias 'tenants' to 'companies' for compatibility with sessions table
CREATE VIEW tenants AS SELECT * FROM companies;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_companies_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS companies_updated_at ON companies;
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION update_companies_timestamp();
