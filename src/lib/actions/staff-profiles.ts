'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Admin access required')
}

function hashPin(pin: string): string {
  // PINs are low-security (4 digits, internal use only). SHA-256 is acceptable.
  const crypto = require('crypto') as typeof import('crypto')
  return crypto.createHash('sha256').update(pin).digest('hex')
}

export async function createStaffProfile(formData: FormData): Promise<void> {
  const name = ((formData.get('name') as string) ?? '').trim()
  const role = formData.get('role') as string
  const pin = ((formData.get('pin') as string) ?? '').trim()

  if (!name) throw new Error('Name is required')
  if (!['staff', 'manager', 'admin'].includes(role)) throw new Error('Invalid role')
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits')

  await requireAdmin()
  const tenantId = await getTenantId()
  const service = createServiceClient()

  // Check PIN uniqueness within tenant
  const { data: existing } = await service
    .from('staff_profiles')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('pin_hash', hashPin(pin))
    .eq('active', true)
    .single()

  if (existing) redirect('/dashboard/settings/staff/new?error=PIN+already+in+use+by+another+employee')

  const { error } = await service.from('staff_profiles').insert({
    tenant_id: tenantId,
    name,
    role,
    pin_hash: hashPin(pin),
    active: true,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/settings/staff')
  redirect('/dashboard/settings/staff?success=created')
}

export async function updateStaffProfile(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  const name = ((formData.get('name') as string) ?? '').trim()
  const role = formData.get('role') as string
  const pin = ((formData.get('pin') as string) ?? '').trim()
  const active = formData.get('active') !== 'false'

  if (!id) throw new Error('Missing staff profile ID')
  if (!name) throw new Error('Name is required')
  if (!['staff', 'manager', 'admin'].includes(role)) throw new Error('Invalid role')

  await requireAdmin()
  const tenantId = await getTenantId()
  const service = createServiceClient()

  const updates: Record<string, unknown> = { name, role, active }

  if (pin) {
    if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits')

    // Check PIN uniqueness — exclude self
    const { data: conflict } = await service
      .from('staff_profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('pin_hash', hashPin(pin))
      .eq('active', true)
      .neq('id', id)
      .single()

    if (conflict) redirect(`/dashboard/settings/staff/${id}/edit?error=PIN+already+in+use+by+another+employee`)

    updates.pin_hash = hashPin(pin)
  }

  const { error } = await service
    .from('staff_profiles')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/settings/staff')
  redirect('/dashboard/settings/staff?success=updated')
}

export async function deleteStaffProfile(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  if (!id) throw new Error('Missing staff profile ID')

  await requireAdmin()
  const tenantId = await getTenantId()
  const service = createServiceClient()

  const { error } = await service
    .from('staff_profiles')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/settings/staff')
  redirect('/dashboard/settings/staff?success=deleted')
}
