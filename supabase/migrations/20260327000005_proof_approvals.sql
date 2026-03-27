-- Add proof approval columns to jobs
ALTER TABLE public.jobs
  ADD COLUMN proof_decision text CHECK (proof_decision IN ('approved', 'changes_requested')),
  ADD COLUMN proof_comments text;

-- Customer RLS: customers can SELECT jobs for their orders
CREATE POLICY "Customers can view own jobs"
  ON public.jobs FOR SELECT
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.customers c ON c.id = o.customer_id
      WHERE c.auth_user_id = auth.uid()
    )
  );

-- Customer RLS: customers can submit proof decision (once, only in proofing stage)
CREATE POLICY "Customers can submit proof decision"
  ON public.jobs FOR UPDATE
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.customers c ON c.id = o.customer_id
      WHERE c.auth_user_id = auth.uid()
    )
    AND stage = 'proofing'
    AND proof_decision IS NULL
  )
  WITH CHECK (
    stage IN ('proofing', 'printing')
    AND proof_decision IN ('approved', 'changes_requested')
  );
