'use client'

import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'

export function DeleteCustomerButton({ action }: { action: () => Promise<void> }) {
  return <ConfirmDeleteButton action={action} />
}
