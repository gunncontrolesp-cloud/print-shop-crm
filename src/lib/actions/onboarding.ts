'use server'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const DEFAULT_PRICING_CONFIG = {
  product_types: [
    { id: 'business_cards', label: 'Business Cards', base_price: 0.05 },
    { id: 'flyers_half', label: 'Flyers (Half Page)', base_price: 0.08 },
    { id: 'flyers_full', label: 'Flyers (Full Page)', base_price: 0.12 },
    { id: 'brochures', label: 'Brochures', base_price: 0.25 },
    { id: 'banners', label: 'Banners', base_price: 15.0 },
    { id: 'custom', label: 'Custom', base_price: 0.0 },
  ],
  qty_breaks: [
    { min: 1, max: 99, multiplier: 1.0 },
    { min: 100, max: 249, multiplier: 0.9 },
    { min: 250, max: 499, multiplier: 0.85 },
    { min: 500, max: 999, multiplier: 0.8 },
    { min: 1000, max: null, multiplier: 0.75 },
  ],
  materials: [
    { id: 'standard', label: 'Standard', multiplier: 1.0 },
    { id: 'glossy', label: 'Glossy', multiplier: 1.2 },
    { id: 'matte', label: 'Matte', multiplier: 1.15 },
    { id: 'recycled', label: 'Recycled', multiplier: 1.1 },
  ],
  finishing: [
    { id: 'none', label: 'None', multiplier: 1.0 },
    { id: 'lamination', label: 'Lamination', multiplier: 1.3 },
    { id: 'uv_coating', label: 'UV Coating', multiplier: 1.25 },
    { id: 'foil', label: 'Foil Stamping', multiplier: 1.5 },
  ],
}

export async function createTenant(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const shopName = (formData.get('shop_name') as string)?.trim()
  const planTier = formData.get('plan_tier') as string

  if (!shopName) throw new Error('Shop name is required')
  if (!['starter', 'pro', 'premium'].includes(planTier)) {
    throw new Error('Invalid plan tier')
  }

  // All three writes use service role — user has no tenant yet so RLS blocks them
  const service = createServiceClient()

  // 1. Create tenant
  const { data: tenant, error: tenantError } = await service
    .from('tenants')
    .insert({ name: shopName, plan_tier: planTier })
    .select('id')
    .single()

  if (tenantError || !tenant) throw new Error(tenantError?.message ?? 'Failed to create tenant')

  // 2. Link user to tenant — upsert handles trigger failures where the row was never created
  const { error: userError } = await service
    .from('users')
    .upsert({ id: user.id, tenant_id: tenant.id, role: 'admin' }, { onConflict: 'id' })

  if (userError) throw new Error(userError.message)

  // 3. Seed default pricing config for this tenant
  const { error: pricingError } = await service
    .from('pricing_config')
    .insert({ tenant_id: tenant.id, config: DEFAULT_PRICING_CONFIG })

  if (pricingError) throw new Error(pricingError.message)

  redirect('/onboarding/subscribe')
}
