-- ── 1. time_entries table ────────────────────────────────────────────────────

CREATE TABLE public.time_entries (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  clocked_in_at    timestamptz NOT NULL DEFAULT now(),
  clocked_out_at   timestamptz NULL,
  job_id           uuid        NULL REFERENCES public.jobs(id) ON DELETE SET NULL,
  task_stage       text        NULL,
  output_qty       integer     NULL CHECK (output_qty >= 0),
  notes            text        NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Enable RLS ─────────────────────────────────────────────────────────────

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- ── 3. RLS policies ───────────────────────────────────────────────────────────

CREATE POLICY "Staff can view own tenant time entries"
  ON public.time_entries FOR SELECT
  USING (tenant_id = public.get_my_tenant_id() AND public.is_authenticated());

CREATE POLICY "Staff can insert own time entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND user_id = auth.uid()
    AND public.is_authenticated()
  );

CREATE POLICY "Staff can update own open time entries"
  ON public.time_entries FOR UPDATE
  USING (
    user_id = auth.uid()
    AND tenant_id = public.get_my_tenant_id()
    AND clocked_out_at IS NULL
  )
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = public.get_my_tenant_id()
  );

CREATE POLICY "Admins can update any tenant time entry"
  ON public.time_entries FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_admin());

CREATE POLICY "Admins can delete own tenant time entries"
  ON public.time_entries FOR DELETE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin());
