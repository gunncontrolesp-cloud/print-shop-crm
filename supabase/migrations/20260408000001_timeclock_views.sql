-- ── Active time entries view ──────────────────────────────────────────────────
-- Shows all currently clocked-in employees with their name and elapsed hours

CREATE OR REPLACE VIEW public.active_time_entries AS
SELECT
  te.id,
  te.tenant_id,
  te.user_id,
  te.clocked_in_at,
  te.job_id,
  te.task_stage,
  te.notes,
  u.name   AS employee_name,
  u.email  AS employee_email,
  ROUND(
    EXTRACT(EPOCH FROM (NOW() - te.clocked_in_at)) / 3600.0,
    2
  ) AS hours_so_far
FROM public.time_entries te
JOIN public.users u ON u.id = te.user_id
WHERE te.clocked_out_at IS NULL;

-- ── Daily employee hours view ─────────────────────────────────────────────────
-- Aggregates closed entries by employee per day

CREATE OR REPLACE VIEW public.daily_employee_hours AS
SELECT
  te.tenant_id,
  te.user_id,
  u.name  AS employee_name,
  u.email AS employee_email,
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
JOIN public.users u ON u.id = te.user_id
GROUP BY te.tenant_id, te.user_id, u.name, u.email, DATE(te.clocked_in_at AT TIME ZONE 'UTC');
