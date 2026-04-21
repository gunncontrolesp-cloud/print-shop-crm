'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')
}

export async function updateShopSettings(formData: FormData): Promise<void> {
  const shop_name = ((formData.get('shop_name') as string) ?? '').trim() || null
  const shop_address = ((formData.get('shop_address') as string) ?? '').trim() || null
  const shop_phone = ((formData.get('shop_phone') as string) ?? '').trim() || null
  const shop_email = ((formData.get('shop_email') as string) ?? '').trim() || null
  const payment_terms = ((formData.get('payment_terms') as string) ?? '').trim() || 'Due on receipt'
  const tax_rate_raw = parseFloat(formData.get('tax_rate') as string)
  const tax_rate = isNaN(tax_rate_raw) ? 0 : Math.min(Math.max(tax_rate_raw, 0), 100)
  const payment_mode_raw = formData.get('payment_mode') as string
  const payment_mode = payment_mode_raw === 'deposit' ? 'deposit' : 'full'
  const deposit_percent_raw = parseFloat(formData.get('deposit_percent') as string)
  const deposit_percent = isNaN(deposit_percent_raw)
    ? 50
    : Math.min(Math.max(deposit_percent_raw, 1), 100)
  const timezone = ((formData.get('timezone') as string) ?? '').trim() || 'America/Chicago'
  const logoFile = formData.get('logo') as File | null

  await requireAdmin()
  const tenantId = await getTenantId()
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {
    shop_name, shop_address, shop_phone, shop_email, tax_rate, payment_terms,
    payment_mode, deposit_percent, timezone,
  }

  if (logoFile && logoFile.size > 0) {
    const ext = logoFile.name.split('.').pop()?.toLowerCase() ?? 'png'
    const path = `${tenantId}/logo.${ext}`
    const buffer = new Uint8Array(await logoFile.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, buffer, { upsert: true, contentType: logoFile.type })

    if (uploadError) {
      redirect(`/dashboard/settings/pricing?error=${encodeURIComponent(uploadError.message)}`)
    }

    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
    updateData.logo_url = urlData.publicUrl
  }

  const { error } = await supabase.from('tenants').update(updateData).eq('id', tenantId)
  if (error) redirect(`/dashboard/settings/pricing?error=${encodeURIComponent(error.message)}`)

  revalidatePath('/dashboard/settings/pricing')
  redirect('/dashboard/settings/pricing?success=1')
}
