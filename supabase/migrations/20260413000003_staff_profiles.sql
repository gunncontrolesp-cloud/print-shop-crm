-- staff_profiles: lightweight employee records for PIN kiosk
-- These are NOT Supabase auth users — production floor workers who don't log in.
-- PIN is stored as a SHA-256 hex digest (handled in application layer).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.staff_profiles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  role        text        NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'manager', 'admin')),
  pin_hash    text        NOT NULL,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- Staff profiles trigger for updated_at
CREATE TRIGGER staff_profiles_updated_at
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: admins can manage profiles in their own tenant
CREATE POLICY "Admins can view own tenant staff profiles"
  ON public.staff_profiles FOR SELECT
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin());

CREATE POLICY "Admins can insert own tenant staff profiles"
  ON public.staff_profiles FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_admin());

CREATE POLICY "Admins can update own tenant staff profiles"
  ON public.staff_profiles FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_admin());

CREATE POLICY "Admins can delete own tenant staff profiles"
  ON public.staff_profiles FOR DELETE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin());

-- Make user_id nullable to support staff_profile_id-only entries
ALTER TABLE public.time_entries ALTER COLUMN user_id DROP NOT NULL;

-- time_entries: allow staff_profile_id as an alternative to user_id for kiosk punches
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS staff_profile_id uuid NULL REFERENCES public.staff_profiles(id) ON DELETE SET NULL;

-- staff_profile_id and user_id cannot both be null
ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_identity_check
    CHECK (user_id IS NOT NULL OR staff_profile_id IS NOT NULL);

-- Update views to include staff_profile name as a fallback
CREATE OR REPLACE VIEW public.active_time_entries AS
SELECT
  te.id,
  te.tenant_id,
  te.user_id,
  te.staff_profile_id,
  te.clocked_in_at,
  te.job_id,
  te.task_stage,
  te.notes,
  COALESCE(u.name, u.email, sp.name)  AS employee_name,
  COALESCE(u.email, sp.name)          AS employee_email,
  ROUND(
    EXTRACT(EPOCH FROM (NOW() - te.clocked_in_at)) / 3600.0,
    2
  ) AS hours_so_far
FROM public.time_entries te
LEFT JOIN public.users u ON u.id = te.user_id
LEFT JOIN public.staff_profiles sp ON sp.id = te.staff_profile_id
WHERE te.clocked_out_at IS NULL;

CREATE OR REPLACE VIEW public.daily_employee_hours AS
SELECT
  te.tenant_id,
  te.user_id,
  te.staff_profile_id,
  COALESCE(u.name, u.email, sp.name)  AS employee_name,
  COALESCE(u.email, sp.name)          AS employee_email,
  DATE(te.clocked_in_at AT TIME ZONE 'UTC') AS work_date,
  ROUND(
    SUM(
      EXTRACT(EPOCH FROM (
        COALESCE(te.clocked_out_at, NOW()) - te.clocked_in_at
      )) / 3600.0
    )::numeric,
    2
  ) AS hours_worked
FROM public.time_entries te
LEFT JOIN public.users u ON u.id = te.user_id
LEFT JOIN public.staff_profiles sp ON sp.id = te.staff_profile_id
GROUP BY te.tenant_id, te.user_id, te.staff_profile_id, COALESCE(u.name, u.email, sp.name), COALESCE(u.email, sp.name), DATE(te.clocked_in_at AT TIME ZONE 'UTC');
