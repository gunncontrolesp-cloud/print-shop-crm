import { createClient } from '@/lib/supabase/server'

export async function getTenantId(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!data?.tenant_id) throw new Error('No tenant assigned — complete onboarding first')
  return data.tenant_id as string
}
