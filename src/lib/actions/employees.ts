'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Admin access required')

  return { user }
}

export async function sendPasswordReset(formData: FormData): Promise<void> {
  const email = formData.get('email') as string
  if (!email) redirect('/dashboard/settings/employees?error=Missing+email')

  await requireAdmin()

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://print-shop-crm.vercel.app/auth/callback',
  })

  if (error) {
    redirect(`/dashboard/settings/employees?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/dashboard/settings/employees?success=reset')
}

export async function updateEmployee(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  const name = ((formData.get('name') as string) ?? '').trim()
  const role = formData.get('role') as string | null

  if (!id) throw new Error('Missing employee ID')
  if (role !== null && role !== 'admin' && role !== 'staff') throw new Error('Invalid role')

  const { user } = await requireAdmin()

  if (id === user.id && role !== null && role !== 'admin') {
    throw new Error('Cannot remove your own admin role')
  }

  const tenantId = await getTenantId()
  const serviceClient = createServiceClient()

  const updates: Record<string, string | null> = { name: name || null }
  if (role !== null) updates.role = role

  const { error } = await serviceClient
    .from('users')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)

  redirect('/dashboard/settings/employees')
}

export async function removeEmployee(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  if (!id) throw new Error('Missing employee ID')

  const { user } = await requireAdmin()
  if (id === user.id) redirect('/dashboard/settings/employees?error=You+cannot+remove+your+own+account')

  const serviceClient = createServiceClient()

  // Try deleting from auth (handles proper accounts)
  const { error: authError } = await serviceClient.auth.admin.deleteUser(id)

  if (authError && !authError.message.toLowerCase().includes('not found')) {
    redirect(`/dashboard/settings/employees?error=${encodeURIComponent(authError.message)}`)
  }

  // Always delete from public.users to handle orphaned records
  await serviceClient.from('users').delete().eq('id', id)

  revalidatePath('/dashboard/settings/employees')
  redirect('/dashboard/settings/employees?success=removed')
}

export async function inviteEmployee(formData: FormData): Promise<void> {
  const email = ((formData.get('email') as string) ?? '').trim().toLowerCase()
  if (!email) redirect('/dashboard/settings/employees?error=Email+is+required')

  await requireAdmin()
  const tenantId = await getTenantId()
  const serviceClient = createServiceClient()

  const { error } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: {
      tenant_id: tenantId,
      role: 'staff',
    },
    redirectTo: 'https://print-shop-crm.vercel.app/auth/callback',
  })

  if (error) {
    const msg = error.message.toLowerCase().includes('already')
      ? 'This email is already registered'
      : error.message
    redirect(`/dashboard/settings/employees?error=${encodeURIComponent(msg)}`)
  }

  revalidatePath('/dashboard/settings/employees')
  redirect('/dashboard/settings/employees?success=1')
}
