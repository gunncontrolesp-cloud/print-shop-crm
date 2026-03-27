'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updatePricingConfig(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const configRaw = formData.get('config') as string

  let config: unknown
  try {
    config = JSON.parse(configRaw)
  } catch {
    throw new Error('Invalid JSON. Please check your config and try again.')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('pricing_config')
    .update({ config, updated_by: user.id })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/settings/pricing')
  redirect('/dashboard/settings/pricing')
}
