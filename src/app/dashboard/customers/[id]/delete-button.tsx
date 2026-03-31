'use client'

import { buttonVariants } from '@/components/ui/button-variants'

export function DeleteCustomerButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <button
        type="submit"
        className={buttonVariants({ variant: 'destructive' })}
        onClick={(e) => {
          if (!confirm('Delete this customer? This cannot be undone.')) {
            e.preventDefault()
          }
        }}
      >
        Delete
      </button>
    </form>
  )
}
