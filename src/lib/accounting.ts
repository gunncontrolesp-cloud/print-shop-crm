import { createServiceClient } from '@/lib/supabase/server'

export type AccountingSyncStatus = 'synced' | 'pending' | 'failed'

export async function fireAccountingWebhook(
  tenantId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<AccountingSyncStatus> {
  const supabase = createServiceClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('accounting_webhook_url, accounting_webhook_enabled')
    .eq('id', tenantId)
    .single()

  if (!tenant?.accounting_webhook_enabled || !tenant.accounting_webhook_url) return 'pending'

  try {
    await fetch(tenant.accounting_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, tenantId, ...payload, timestamp: new Date().toISOString() }),
    })
    return 'synced'
  } catch (err) {
    console.error('[accounting]', event, err instanceof Error ? err.message : err)
    return 'failed'
  }
}
