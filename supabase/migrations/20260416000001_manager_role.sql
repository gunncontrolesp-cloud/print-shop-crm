-- Add manager role to user_role enum
-- Managers have elevated access to production, timecards, and customers
-- but cannot manage billing, employees, or tenant settings.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'manager' AFTER 'staff';
