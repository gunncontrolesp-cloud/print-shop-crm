'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  return { supabase, user }
}

export async function saveAccountingSettings(formData: FormData) {
  const { supabase } = await requireAdmin()
  const tenantId = await getTenantId()

  const webhookUrl = (formData.get('accounting_webhook_url') as string)?.trim() || null
  const enabled = formData.get('accounting_webhook_enabled') === 'on'

  const { error } = await supabase
    .from('tenants')
    .update({ accounting_webhook_url: webhookUrl, accounting_webhook_enabled: enabled })
    .eq('id', tenantId)

  if (error) {
    redirect(
      '/dashboard/settings/accounting?error=' + encodeURIComponent(error.message)
    )
  }

  revalidatePath('/dashboard/settings/accounting')
  redirect('/dashboard/settings/accounting?success=1')
}

export async function testAccountingWebhook(): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireAdmin()
  const tenantId = await getTenantId()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('accounting_webhook_url')
    .eq('id', tenantId)
    .single()

  if (!tenant?.accounting_webhook_url) {
    return { ok: false, message: 'No webhook URL configured' }
  }

  try {
    const res = await fetch(tenant.accounting_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'test.connection',
        tenantId,
        timestamp: new Date().toISOString(),
      }),
    })
    return {
      ok: res.ok,
      message: res.ok ? 'Connection successful' : `HTTP ${res.status} — check n8n workflow`,
    }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Connection failed',
    }
  }
}
