import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

type Customer = {
  id?: string
  name?: string
  business_name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  street_address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  notes?: string | null
}

export function CustomerForm({
  customer,
  action,
  cancelHref,
}: {
  customer?: Customer
  action: (formData: FormData) => Promise<void>
  cancelHref: string
}) {
  return (
    <form action={action} className="space-y-5 max-w-lg">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
        <Input
          id="name"
          name="name"
          defaultValue={customer?.name ?? ''}
          required
          placeholder="Full name"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="business_name">Business Name</Label>
        <Input
          id="business_name"
          name="business_name"
          defaultValue={customer?.business_name ?? ''}
          placeholder="Company or shop name"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={customer?.email ?? ''}
          placeholder="email@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          defaultValue={customer?.phone ?? ''}
          placeholder="(555) 000-0000"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="street_address">Street Address</Label>
        <Input
          id="street_address"
          name="street_address"
          defaultValue={customer?.street_address ?? customer?.address ?? ''}
          placeholder="123 Main St"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            defaultValue={customer?.city ?? ''}
            placeholder="Springfield"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="zip_code">Zip Code</Label>
          <Input
            id="zip_code"
            name="zip_code"
            defaultValue={customer?.zip_code ?? ''}
            placeholder="62701"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="state">State</Label>
        <select
          id="state"
          name="state"
          defaultValue={customer?.state ?? ''}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">— Select state —</option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={customer?.notes ?? ''}
          placeholder="Any additional notes..."
          rows={4}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit">Save Customer</Button>
        <Link
          href={cancelHref}
          className="inline-flex items-center px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
