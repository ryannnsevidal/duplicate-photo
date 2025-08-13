-- Fix enum value addition for auditor role
-- We need to commit the enum change first
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'auditor';