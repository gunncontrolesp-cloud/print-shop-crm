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
        <h1 className="text-2xl font-semibold text-foreground">Billing & Plan</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
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
      <div className="mb-6 rounded-lg border border-border bg-primary/5 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            Current plan: <span className="capitalize">{currentTier}</span>
          </p>
          <p className="text-xs text-primary mt-0.5">
            {hasSubscription ? 'Active subscription' : 'No active subscription'}
          </p>
        </div>
        {hasSubscription && (
          <form action={createBillingPortalSession}>
            <button
              type="submit"
              className="text-xs font-medium text-primary border border-primary/20 bg-card rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors"
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
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-4 inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground uppercase tracking-wide">
                  Current
                </span>
              )}

              <div className="mb-4">
                <p className="text-base font-semibold text-foreground">{plan.name}</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {plan.price}
                  <span className="text-sm font-normal text-muted-foreground/60">/mo</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
              </div>

              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="rounded-lg border border-primary/20 bg-card px-3 py-2 text-center text-xs font-medium text-primary">
                  Your current plan
                </div>
              ) : hasSubscription ? (
                <form action={changePlanAction}>
                  <button
                    type="submit"
                    className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isUpgrade
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-border bg-card text-foreground hover:bg-muted/60'
                    }`}
                  >
                    {isUpgrade ? `Upgrade to ${plan.name}` : `Downgrade to ${plan.name}`}
                  </button>
                </form>
              ) : (
                <p className="text-xs text-center text-muted-foreground/60">No active subscription</p>
              )}
            </div>
          )
        })}
      </div>

      <p className="mt-6 text-xs text-muted-foreground/60">
        Upgrades are charged immediately on a prorated basis. Downgrades take effect at the next billing cycle.
        Questions? Contact support.
      </p>
    </div>
  )
}
