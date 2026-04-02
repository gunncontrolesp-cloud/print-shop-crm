-- ── Add approval columns to time_entries ─────────────────────────────────────

ALTER TABLE public.time_entries
  ADD COLUMN status       text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved')),
  ADD COLUMN approved_by  uuid        NULL REFERENCES public.users(id),
  ADD COLUMN approved_at  timestamptz NULL;
