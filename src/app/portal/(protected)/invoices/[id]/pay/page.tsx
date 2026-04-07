import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createEmbeddedCheckoutSession } from '@/lib/actions/checkout'
import { StripeEmbeddedCheckout } from '@/components/portal/embedded-checkout'

export default async function InvoicePayPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/portal/login')

  const serviceClient = createServiceClient()
  const { data: customer } = await serviceClient
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!customer) redirect('/portal')

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, amount, status')
    .eq('id', id)
    .single()

  if (!invoice) notFound()
  if (invoice.status !== 'sent') redirect('/portal/invoices')

  const clientSecret = await createEmbeddedCheckoutSession(id)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/portal/invoices" className="text-sm text-gray-500 hover:text-gray-900">
          ← Invoices
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">
        Pay Invoice #{id.slice(0, 8).toUpperCase()}
      </h1>
      <p className="text-sm text-gray-500 mb-8">${Number(invoice.amount).toFixed(2)} due</p>
      <StripeEmbeddedCheckout clientSecret={clientSecret} />
    </div>
  )
}
