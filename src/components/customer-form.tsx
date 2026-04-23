import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Customer = {
  id?: string
  name?: string
  business_name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
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
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          name="address"
          defaultValue={customer?.address ?? ''}
          placeholder="Street, City, State, ZIP"
        />
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
