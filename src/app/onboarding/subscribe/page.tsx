import { createSubscriptionCheckout } from '@/lib/actions/billing'

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>
}) {
  const { cancelled } = await searchParams

  if (cancelled) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Subscription required</h1>
        <p className="text-gray-500 text-sm mb-6">
          A subscription is required to access your shop. Complete checkout to get started.
        </p>
        <form action={createSubscriptionCheckout}>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue to checkout →
          </button>
        </form>
      </div>
    )
  }

  // Auto-initiate checkout on first visit
  await createSubscriptionCheckout()

  // createSubscriptionCheckout always redirects; this is unreachable
  return null
}
