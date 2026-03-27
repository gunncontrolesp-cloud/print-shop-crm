'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createCustomer(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customers')
    .insert({
      name: formData.get('name') as string,
      business_name: (formData.get('business_name') as string) || null,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      address: (formData.get('address') as string) || null,
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
      address: (formData.get('address') as string) || null,
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
