import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateShopSettings } from '@/lib/actions/pricing'
import { TZ_OPTIONS } from '@/lib/tz'

export default async function ShopSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error: errorMsg, success } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: tenant } = await supabase.from('tenants').select('*').single()

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="p-4 sm:p-8 max-w-xl">
      {errorMsg && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {decodeURIComponent(errorMsg)}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Settings saved.
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Shop Settings</h1>
        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
          Admin only
        </span>
      </div>

      <form action={updateShopSettings} encType="multipart/form-data" className="space-y-5">
        {/* Logo */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Shop Logo</label>
          {tenant?.logo_url && (
            <div className="mb-2">
              <img
                src={`${tenant.logo_url}?cb=${Date.now()}`}
                alt="Shop logo"
                className="h-16 object-contain rounded border border-border p-1 bg-card"
              />
            </div>
          )}
          <input
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-foreground file:text-background hover:file:bg-foreground/80 file:cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">PNG, JPG, WebP or SVG. Appears on invoices.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Shop Name</label>
          <input
            name="shop_name"
            defaultValue={tenant?.shop_name ?? ''}
            placeholder="e.g. Acme Print Co."
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Address</label>
          <textarea
            name="shop_address"
            defaultValue={tenant?.shop_address ?? ''}
            placeholder={'123 Main St\nSuite 100\nCity, ST 00000'}
            rows={3}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Phone</label>
            <input
              name="shop_phone"
              defaultValue={tenant?.shop_phone ?? ''}
              placeholder="(555) 000-0000"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              name="shop_email"
              type="email"
              defaultValue={tenant?.shop_email ?? ''}
              placeholder="hello@yourshop.com"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tax Rate (%)</label>
            <input
              name="tax_rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={tenant?.tax_rate ?? 0}
              placeholder="0.00"
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground">Applied to invoices. Enter 0 for no tax.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Payment Terms</label>
            <input
              name="payment_terms"
              defaultValue={tenant?.payment_terms ?? 'Due on receipt'}
              placeholder="e.g. Net 30, Due on receipt"
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground">Shown on invoices.</p>
          </div>
        </div>

        {/* Payment Mode */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Payment Mode</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="radio"
                name="payment_mode"
                value="full"
                defaultChecked={!tenant?.payment_mode || tenant.payment_mode === 'full'}
                className="accent-primary"
              />
              Full payment upfront
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="radio"
                name="payment_mode"
                value="deposit"
                defaultChecked={tenant?.payment_mode === 'deposit'}
                className="accent-primary"
              />
              Deposit + balance on pickup
            </label>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Deposit Percentage (%)</label>
            <input
              name="deposit_percent"
              type="number"
              min="1"
              max="100"
              step="1"
              defaultValue={tenant?.deposit_percent ?? 50}
              placeholder="50"
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground">
              Only applies when payment mode is &ldquo;Deposit&rdquo;. Remaining balance is due on pickup.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Timezone</label>
          <select
            name="timezone"
            defaultValue={tenant?.timezone ?? 'America/Chicago'}
            className={inputClass}
          >
            {TZ_OPTIONS.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Used for timeclock display and reports.</p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-background bg-foreground rounded-lg hover:bg-foreground/80 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  )
}
