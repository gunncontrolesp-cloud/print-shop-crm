import { createTenant } from '@/lib/actions/onboarding'

const PLAN_TIERS = [
  {
    id: 'starter',
    label: 'Starter',
    price: '$99/mo',
    description: 'Customers, quotes, and orders',
  },
  {
    id: 'pro',
    label: 'Pro',
    price: '$149/mo',
    description: '+ Production board, file uploads, notifications, invoicing',
  },
  {
    id: 'premium',
    label: 'Premium',
    price: '$299/mo',
    description: '+ Customer portal, analytics, inventory',
  },
]

export default function OnboardingPage() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Set up your shop</h1>
        <p className="text-gray-500 mt-1 text-sm">
          You&apos;re almost in. Tell us about your print shop.
        </p>
      </div>

      <form action={createTenant} className="space-y-6">
        <div>
          <label htmlFor="shop_name" className="block text-sm font-medium text-gray-700 mb-1">
            Shop name
          </label>
          <input
            id="shop_name"
            name="shop_name"
            type="text"
            required
            placeholder="Acme Print Co."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
          <div className="space-y-2">
            {PLAN_TIERS.map((tier) => (
              <label
                key={tier.id}
                className="flex items-start gap-3 border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-300 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
              >
                <input
                  type="radio"
                  name="plan_tier"
                  value={tier.id}
                  defaultChecked={tier.id === 'pro'}
                  className="mt-0.5"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{tier.label}</span>
                    <span className="text-sm text-gray-500">{tier.price}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{tier.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create shop and continue →
        </button>
      </form>
    </div>
  )
}
