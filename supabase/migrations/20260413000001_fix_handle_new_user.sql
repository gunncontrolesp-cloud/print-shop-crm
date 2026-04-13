-- Fix handle_new_user: add exception handling so auth signups never fail silently.
-- Also handles edge case where trigger fires before tenant is set (onboarding flow).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip portal customers — they are not staff
  IF (NEW.raw_user_meta_data->>'is_customer' = 'true') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (id, email, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'staff'),
    -- NULL if tenant_id not in metadata (admin onboarding — set later by createTenant)
    NULLIF((NEW.raw_user_meta_data->>'tenant_id'), '')::uuid
  )
  ON CONFLICT (id) DO UPDATE SET
    email     = EXCLUDED.email,
    role      = EXCLUDED.role,
    tenant_id = COALESCE(EXCLUDED.tenant_id, public.users.tenant_id);

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Log the error but never block auth signup
  RAISE WARNING 'handle_new_user failed for user %: % %', NEW.id, SQLSTATE, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
