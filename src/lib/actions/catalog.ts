'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.role ?? '')) redirect('/dashboard')
}

export async function addProduct(formData: FormData): Promise<void> {
  const name = ((formData.get('name') as string) ?? '').trim()
  const category = ((formData.get('category') as string) ?? '').trim() || 'General'
  const unit_price = parseFloat(formData.get('unit_price') as string)
  const description = ((formData.get('description') as string) ?? '').trim() || null

  if (!name) redirect('/dashboard/settings/catalog?error=Name+is+required')
  if (isNaN(unit_price) || unit_price < 0) redirect('/dashboard/settings/catalog?error=Invalid+price')

  await requireAdmin()
  const tenantId = await getTenantId()
  const supabase = await createClient()

  const { error } = await supabase.from('products').insert({
    tenant_id: tenantId,
    name,
    category,
    unit_price,
    description,
  })

  if (error) redirect(`/dashboard/settings/catalog?error=${encodeURIComponent(error.message)}`)
  revalidatePath('/dashboard/settings/catalog')
  redirect('/dashboard/settings/catalog?success=added')
}

export async function updateProduct(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  const name = ((formData.get('name') as string) ?? '').trim()
  const category = ((formData.get('category') as string) ?? '').trim() || 'General'
  const unit_price = parseFloat(formData.get('unit_price') as string)
  const description = ((formData.get('description') as string) ?? '').trim() || null

  if (!name) redirect('/dashboard/settings/catalog?error=Name+is+required')
  if (isNaN(unit_price) || unit_price < 0) redirect('/dashboard/settings/catalog?error=Invalid+price')

  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .update({ name, category, unit_price, description })
    .eq('id', id)

  if (error) redirect(`/dashboard/settings/catalog?error=${encodeURIComponent(error.message)}`)
  revalidatePath('/dashboard/settings/catalog')
  redirect('/dashboard/settings/catalog?success=updated')
}

export async function archiveProduct(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('products').update({ active: false }).eq('id', id)
  if (error) redirect(`/dashboard/settings/catalog?error=${encodeURIComponent(error.message)}`)
  revalidatePath('/dashboard/settings/catalog')
  redirect('/dashboard/settings/catalog?success=archived')
}

export async function restoreProduct(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('products').update({ active: true }).eq('id', id)
  if (error) redirect(`/dashboard/settings/catalog?error=${encodeURIComponent(error.message)}`)
  revalidatePath('/dashboard/settings/catalog')
  redirect('/dashboard/settings/catalog')
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) redirect(`/dashboard/settings/catalog?error=${encodeURIComponent(error.message)}`)
  revalidatePath('/dashboard/settings/catalog')
  redirect('/dashboard/settings/catalog?success=deleted')
}
