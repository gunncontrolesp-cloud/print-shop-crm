'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { LineItem } from '@/lib/types'
import { notifyQuoteSent } from '@/lib/n8n'
import { getTenantId } from '@/lib/tenant'

export async function createQuote(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const tenantId = await getTenantId()
  const customer_id = formData.get('customer_id') as string
  const notes = (formData.get('notes') as string) || null
  const lineItemsRaw = formData.get('line_items') as string
  const line_items: LineItem[] = JSON.parse(lineItemsRaw || '[]')

  const subtotal = line_items.reduce((sum, item) => sum + item.line_total, 0)

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      tenant_id: tenantId,
      customer_id,
      notes,
      line_items,
      subtotal: Math.round(subtotal * 100) / 100,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/quotes')
  redirect(`/dashboard/quotes/${data.id}`)
}

export async function updateQuoteStatus(
  id: string,
  status: 'sent' | 'approved' | 'rejected'
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('quotes')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)

  if (status === 'sent') {
    const { data: quote } = await supabase
      .from('quotes')
      .select('customers(name, email)')
      .eq('id', id)
      .single()
    const customer = Array.isArray(quote?.customers) ? quote.customers[0] : quote?.customers
    if (customer?.email) {
      await notifyQuoteSent(id, customer.email, customer.name ?? '')
    }
  }

  revalidatePath(`/dashboard/quotes/${id}`)
  revalidatePath('/dashboard/quotes')
  redirect(`/dashboard/quotes/${id}`)
}

export async function deleteQuote(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('quotes').delete().eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/quotes')
  redirect('/dashboard/quotes')
}
