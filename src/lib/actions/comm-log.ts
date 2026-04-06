'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'

export async function addCommEntry(formData: FormData): Promise<void> {
  const customerId = formData.get('customer_id') as string
  const type = formData.get('type') as string
  const body = ((formData.get('body') as string) ?? '').trim()

  if (!body) redirect(`/dashboard/customers/${customerId}?comm_error=Body+is+required`)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantId = await getTenantId()

  const { error } = await supabase.from('customer_comm_log').insert({
    tenant_id: tenantId,
    customer_id: customerId,
    user_id: user.id,
    type,
    body,
  })

  if (error) redirect(`/dashboard/customers/${customerId}?comm_error=${encodeURIComponent(error.message)}`)

  revalidatePath(`/dashboard/customers/${customerId}`)
  redirect(`/dashboard/customers/${customerId}`)
}

export async function deleteCommEntry(entryId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: entry } = await supabase
    .from('customer_comm_log')
    .select('customer_id')
    .eq('id', entryId)
    .single()

  if (!entry) redirect('/dashboard/customers')

  await supabase.from('customer_comm_log').delete().eq('id', entryId)

  revalidatePath(`/dashboard/customers/${entry.customer_id}`)
  redirect(`/dashboard/customers/${entry.customer_id}`)
}
