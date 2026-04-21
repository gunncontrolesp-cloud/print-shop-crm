import Link from 'next/link'
import { createBillingPortalSession } from '@/lib/actions/billing'

export default function UpgradePage() {
  return (
    <div className="p-4 sm:p-8 max-w-lg">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Upgrade required</h1>
      <p className="text-gray-500 mb-6">
        This feature isn&apos;t included in your current plan. Upgrade to unlock it.
      </p>

      <div className="space-y-3 mb-8">
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="font-medium text-gray-900">Pro — $149/mo</p>
          <p className="text-sm text-gray-500 mt-0.5">
            Production board, invoicing, file uploads, notifications
          </p>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="font-medium text-gray-900">Premium — $299/mo</p>
          <p className="text-sm text-gray-500 mt-0.5">
            + Customer portal, analytics, inventory tracking
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <form action={createBillingPortalSession}>
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Manage subscription →
          </button>
        </form>
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 py-2 px-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
