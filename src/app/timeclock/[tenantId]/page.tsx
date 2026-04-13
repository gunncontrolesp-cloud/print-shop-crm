import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { KioskClient } from './KioskClient'

export default async function KioskPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params

  const service = createServiceClient()
  const { data: tenant } = await service
    .from('tenants')
    .select('id, name, shop_name')
    .eq('id', tenantId)
    .single()

  if (!tenant) notFound()

  return (
    <KioskClient
      tenantId={tenant.id}
      shopName={tenant.shop_name ?? tenant.name}
    />
  )
}
