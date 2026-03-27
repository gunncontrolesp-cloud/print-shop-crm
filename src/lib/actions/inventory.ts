'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { notifyLowStock } from '@/lib/n8n'

export async function createInventoryItem(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('inventory_items').insert({
    name: formData.get('name') as string,
    category: (formData.get('category') as string) || 'supplies',
    quantity: Number(formData.get('quantity')),
    unit: (formData.get('unit') as string) || 'units',
    low_stock_threshold: Number(formData.get('low_stock_threshold')),
    notes: (formData.get('notes') as string) || null,
  })

  revalidatePath('/dashboard/inventory')
  revalidatePath('/dashboard')
}

export async function updateInventoryItem(id: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('inventory_items')
    .update({
      name: formData.get('name') as string,
      category: (formData.get('category') as string) || 'supplies',
      unit: (formData.get('unit') as string) || 'units',
      low_stock_threshold: Number(formData.get('low_stock_threshold')),
      notes: (formData.get('notes') as string) || null,
    })
    .eq('id', id)

  revalidatePath('/dashboard/inventory')
}

export async function adjustQuantity(id: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const delta = Number(formData.get('delta'))

  const { data: item } = await supabase
    .from('inventory_items')
    .select('id, name, quantity, low_stock_threshold')
    .eq('id', id)
    .single()

  if (!item) throw new Error('Item not found')

  const newQty = Math.max(0, Number(item.quantity) + delta)

  await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', id)

  if (newQty <= Number(item.low_stock_threshold)) {
    await notifyLowStock(item.id, item.name, newQty, Number(item.low_stock_threshold))
  }

  revalidatePath('/dashboard/inventory')
  revalidatePath('/dashboard')
}
