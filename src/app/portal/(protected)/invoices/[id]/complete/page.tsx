import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function PaymentCompletePage({
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

  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="text-4xl mb-4">✓</div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Payment received</h1>
      <p className="text-sm text-gray-500 mb-8">
        Thank you — your payment for Invoice #{id.slice(0, 8).toUpperCase()} has been submitted.
        You will receive a confirmation shortly.
      </p>
      <div className="flex gap-3 justify-center">
        <Link href="/portal/invoices" className="text-sm text-blue-600 hover:underline">
          View invoices →
        </Link>
        <Link href="/portal" className="text-sm text-gray-500 hover:text-gray-900">
          Back to portal
        </Link>
      </div>
    </div>
  )
}
