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
    .upsert({ id: user.id, email: user.email, tenant_id: tenant.id, role: 'admin' }, { onConflict: 'id' })

  if (userError) throw new Error(userError.message)

  // 3. Seed default pricing config for this tenant
  const { error: pricingError } = await service
    .from('pricing_config')
    .insert({ tenant_id: tenant.id, config: DEFAULT_PRICING_CONFIG })

  if (pricingError) throw new Error(pricingError.message)

  // 4. Seed default product catalog
  const defaultProducts = [
    // Business Stationery
    { name: 'Business Cards', category: 'Business Stationery', description: 'Standard 3.5" x 2" business cards' },
    { name: 'Letterhead', category: 'Business Stationery', description: '8.5" x 11" branded letterhead' },
    { name: 'Envelopes', category: 'Business Stationery', description: '#10 standard envelopes' },
    { name: 'Note Cards', category: 'Business Stationery', description: 'Folded note cards with envelopes' },
    { name: 'Presentation Folders', category: 'Business Stationery', description: '9" x 12" folders with pockets' },
    // Flyers & Marketing
    { name: 'Flyers — Half Page', category: 'Flyers & Marketing', description: '5.5" x 8.5" single-sided flyers' },
    { name: 'Flyers — Full Page', category: 'Flyers & Marketing', description: '8.5" x 11" single-sided flyers' },
    { name: 'Postcards (4x6)', category: 'Flyers & Marketing', description: 'Standard 4" x 6" postcards' },
    { name: 'Postcards (6x9)', category: 'Flyers & Marketing', description: 'Large 6" x 9" postcards' },
    { name: 'Door Hangers', category: 'Flyers & Marketing', description: '4.25" x 11" door hangers with hole' },
    { name: 'Rack Cards', category: 'Flyers & Marketing', description: '4" x 9" rack display cards' },
    { name: 'EDDM Mailers', category: 'Flyers & Marketing', description: 'Every Door Direct Mail oversized mailers' },
    // Brochures
    { name: 'Brochures — Bi-Fold', category: 'Brochures', description: '8.5" x 11" folded to 5.5" x 8.5"' },
    { name: 'Brochures — Tri-Fold', category: 'Brochures', description: '8.5" x 11" folded to 3.67" x 8.5"' },
    { name: 'Brochures — Z-Fold', category: 'Brochures', description: '8.5" x 11" accordion z-fold' },
    // Booklets & Multi-Page
    { name: 'Booklets — Saddle Stitch', category: 'Booklets & Multi-Page', description: 'Staple-bound booklets, 8 pages minimum' },
    { name: 'Catalogs', category: 'Booklets & Multi-Page', description: 'Perfect-bound or saddle-stitch product catalogs' },
    { name: 'Newsletters', category: 'Booklets & Multi-Page', description: '8.5" x 11" folded newsletter' },
    { name: 'Notepads', category: 'Booklets & Multi-Page', description: 'Glue-top notepads, 25 or 50 sheets' },
    { name: 'NCR Forms', category: 'Booklets & Multi-Page', description: 'Carbonless copy forms, 2-part or 3-part' },
    // Posters & Signage
    { name: 'Posters', category: 'Posters & Signage', description: 'Full-color posters, various sizes' },
    { name: 'Vinyl Banners', category: 'Posters & Signage', description: 'Durable outdoor vinyl banners with grommets' },
    { name: 'Retractable Banner Stand', category: 'Posters & Signage', description: '33" x 80" roll-up display banner with stand' },
    { name: 'Foam Board Signs', category: 'Posters & Signage', description: 'Mounted foam board signs, rigid display' },
    { name: 'Yard Signs', category: 'Posters & Signage', description: 'Corrugated plastic yard signs with H-stakes' },
    { name: 'Window Clings', category: 'Posters & Signage', description: 'Static-cling window decals' },
    { name: 'A-Frame Signs', category: 'Posters & Signage', description: 'Sidewalk A-frame with printed inserts' },
    // Labels & Stickers
    { name: 'Custom Labels', category: 'Labels & Stickers', description: 'Custom-shaped or sheet labels' },
    { name: 'Stickers', category: 'Labels & Stickers', description: 'Die-cut or square/round stickers' },
    { name: 'Roll Labels', category: 'Labels & Stickers', description: 'Labels on a roll for automated application' },
    { name: 'Magnets', category: 'Labels & Stickers', description: 'Business card or custom-size magnets' },
    // Specialty & Finishing
    { name: 'Greeting Cards', category: 'Specialty', description: 'Folded greeting cards with envelopes' },
    { name: 'Calendars', category: 'Specialty', description: 'Wall or desk calendars, 12-month' },
    { name: 'Canvas Prints', category: 'Specialty', description: 'Gallery-wrapped canvas prints' },
    { name: 'Photo Prints', category: 'Specialty', description: 'High-resolution photo prints' },
    { name: 'T-Shirts', category: 'Specialty', description: 'Screen-printed or heat-transfer t-shirts' },
  ].map((p) => ({
    tenant_id: tenant.id,
    name: p.name,
    category: p.category,
    description: p.description,
    unit_price: 0,
    active: true,
  }))

  await service.from('products').insert(defaultProducts)

  redirect('/onboarding/subscribe')
}
