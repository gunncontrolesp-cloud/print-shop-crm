'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'

export async function createCustomer(formData: FormData) {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from('customers')
    .insert({
      tenant_id: tenantId,
      name: formData.get('name') as string,
      business_name: (formData.get('business_name') as string) || null,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      street_address: (formData.get('street_address') as string) || null,
      city: (formData.get('city') as string) || null,
      state: (formData.get('state') as string) || null,
      zip_code: (formData.get('zip_code') as string) || null,
      notes: (formData.get('notes') as string) || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/customers')
  redirect(`/dashboard/customers/${data.id}`)
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('customers')
    .update({
      name: formData.get('name') as string,
      business_name: (formData.get('business_name') as string) || null,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      street_address: (formData.get('street_address') as string) || null,
      city: (formData.get('city') as string) || null,
      state: (formData.get('state') as string) || null,
      zip_code: (formData.get('zip_code') as string) || null,
      notes: (formData.get('notes') as string) || null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/customers')
  revalidatePath(`/dashboard/customers/${id}`)
  redirect(`/dashboard/customers/${id}`)
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/customers')
  redirect('/dashboard/customers')
}
