-- Migration: Add Ordering Platform Links to Companies
-- Description: Generate unique links for staff ordering platform access

BEGIN;

-- Add ordering_platform_link column to companies table
ALTER TABLE companies
ADD COLUMN ordering_platform_link VARCHAR(255) UNIQUE,
ADD COLUMN ordering_platform_password VARCHAR(255),
ADD COLUMN staff_link_created_at TIMESTAMP,
ADD COLUMN staff_link_expires_at TIMESTAMP,
ADD COLUMN staff_link_active BOOLEAN DEFAULT true;

-- Create index for quick link lookup
CREATE INDEX idx_companies_ordering_platform_link ON companies(ordering_platform_link);

-- Update existing companies with generated links (run before deploying)
-- This will be handled by application code
UPDATE companies
SET ordering_platform_link = 'link_' || gen_random_uuid()::text,
    staff_link_created_at = CURRENT_TIMESTAMP
WHERE ordering_platform_link IS NULL;

COMMIT;
