'use server'

import { createServiceClient } from '@/lib/supabase/server'

function hashPin(pin: string): string {
  const crypto = require('crypto') as typeof import('crypto')
  return crypto.createHash('sha256').update(pin).digest('hex')
}

type KioskResult =
  | { success: true; action: 'clocked_in' | 'clocked_out'; name: string }
  | { success: false; error: string }

export async function kioskPunch(tenantId: string, pin: string): Promise<KioskResult> {
  if (!/^\d{4}$/.test(pin)) return { success: false, error: 'Invalid PIN format' }

  const service = createServiceClient()

  // Look up staff profile by PIN + tenant
  const { data: profile } = await service
    .from('staff_profiles')
    .select('id, name, active')
    .eq('tenant_id', tenantId)
    .eq('pin_hash', hashPin(pin))
    .single()

  if (!profile) return { success: false, error: 'PIN not recognised' }
  if (!profile.active) return { success: false, error: 'This PIN has been deactivated' }

  // Check for open entry
  const { data: openEntry } = await service
    .from('time_entries')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('staff_profile_id', profile.id)
    .is('clocked_out_at', null)
    .maybeSingle()

  if (openEntry) {
    // Clock out
    const { error } = await service
      .from('time_entries')
      .update({ clocked_out_at: new Date().toISOString() })
      .eq('id', openEntry.id)

    if (error) return { success: false, error: 'Failed to clock out. Please try again.' }
    return { success: true, action: 'clocked_out', name: profile.name }
  } else {
    // Clock in
    const { error } = await service.from('time_entries').insert({
      tenant_id: tenantId,
      staff_profile_id: profile.id,
      clocked_in_at: new Date().toISOString(),
    })

    if (error) return { success: false, error: 'Failed to clock in. Please try again.' }
    return { success: true, action: 'clocked_in', name: profile.name }
  }
}
