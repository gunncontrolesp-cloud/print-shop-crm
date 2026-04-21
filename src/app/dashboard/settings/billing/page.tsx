import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'
import { changePlan, createBillingPortalSession } from '@/lib/actions/billing'
import { Check } from 'lucide-react'

const PLANS = [
  {
    tier: 'starter',
    name: 'Starter',
    price: '$99',
    description: 'Everything you need to get started',
    features: [
      'Quotes & orders',
      'Customer management',
      'Basic invoicing',
      'Up to 3 employees',
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '$149',
    description: 'For growing shops with production needs',
    features: [
      'Everything in Starter',
      'Production board',
      'File uploads & proofs',
      'Email notifications',
      'Time clock & timecards',
      'Unlimited employees',
    ],
  },
  {
    tier: 'premium',
    name: 'Premium',
    price: '$299',
    description: 'Full-featured for established operations',
    features: [
      'Everything in Pro',
      'Customer portal',
      'Inventory tracking',
      'Analytics dashboard',
      'Accounting integration',
      'Priority support',
    ],
  },
]

const TIER_ORDER = ['starter', 'pro', 'premium']

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { success, error: errorMsg } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const tenantId = await getTenantId()
  const service = createServiceClient()
  const { data: tenant } = await service
    .from('tenants')
    .select('plan_tier, stripe_subscription_id')
    .eq('id', tenantId)
    .single()

  const currentTier = tenant?.plan_tier ?? 'starter'
  const currentIdx = TIER_ORDER.indexOf(currentTier)
  const hasSubscription = !!tenant?.stripe_subscription_id

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Billing & Plan</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your subscription. Changes take effect immediately with prorated billing.
        </p>
      </div>

      {success === 'plan_changed' && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Plan updated successfully.
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(errorMsg)}
        </div>
      )}

      {/* Current plan badge */}
      <div className="mb-6 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-900">
            Current plan: <span className="capitalize">{currentTier}</span>
          </p>
          <p className="text-xs text-indigo-600 mt-0.5">
            {hasSubscription ? 'Active subscription' : 'No active subscription'}
          </p>
        </div>
        {hasSubscription && (
          <form action={createBillingPortalSession}>
            <button
              type="submit"
              className="text-xs font-medium text-indigo-700 border border-indigo-200 bg-white rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors"
            >
              Manage billing →
            </button>
          </form>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const planIdx = TIER_ORDER.indexOf(plan.tier)
          const isCurrent = plan.tier === currentTier
          const isUpgrade = planIdx > currentIdx
          const isDowngrade = planIdx < currentIdx

          const changePlanAction = changePlan.bind(null, plan.tier)

          return (
            <div
              key={plan.tier}
              className={`relative rounded-xl border p-5 flex flex-col ${
                isCurrent
                  ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-4 inline-flex items-center rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wide">
                  Current
                </span>
              )}

              <div className="mb-4">
                <p className="text-base font-semibold text-gray-900">{plan.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {plan.price}
                  <span className="text-sm font-normal text-gray-400">/mo</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
              </div>

              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-center text-xs font-medium text-indigo-600">
                  Your current plan
                </div>
              ) : hasSubscription ? (
                <form action={changePlanAction}>
                  <button
                    type="submit"
                    className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isUpgrade
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {isUpgrade ? `Upgrade to ${plan.name}` : `Downgrade to ${plan.name}`}
                  </button>
                </form>
              ) : (
                <p className="text-xs text-center text-gray-400">No active subscription</p>
              )}
            </div>
          )
        })}
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Upgrades are charged immediately on a prorated basis. Downgrades take effect at the next billing cycle.
        Questions? Contact support.
      </p>
    </div>
  )
}
