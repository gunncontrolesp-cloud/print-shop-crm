'use client'

import { useState, useRef } from 'react'
import { QuoteLineItemForm } from '@/components/quote-line-item-form'
import { Label } from '@/components/ui/label'
import type { LineItem, Product } from '@/lib/types'

type Customer = { id: string; name: string; business_name: string | null }

export function QuoteBuilder({
  customers,
  products,
  createQuote,
}: {
  customers: Customer[]
  products: Product[]
  createQuote: (formData: FormData) => Promise<void>
}) {
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const formRef = useRef<HTMLFormElement>(null)

  const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0)

  function addLineItem(item: LineItem) {
    setLineItems((prev) => [...prev, item])
  }

  function removeLineItem(id: string) {
    setLineItems((prev) => prev.filter((item) => item.id !== id))
  }

  const selectClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <form ref={formRef} action={createQuote} className="space-y-6 max-w-3xl">
      {/* Customer */}
      <div className="space-y-1.5">
        <Label htmlFor="customer_id">
          Customer <span className="text-red-500">*</span>
        </Label>
        <select id="customer_id" name="customer_id" required className={selectClass}>
          <option value="">Select a customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.business_name ? ` — ${c.business_name}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Line Items */}
      <QuoteLineItemForm products={products} onAdd={addLineItem} />

      {/* Line Items Table */}
      {lineItems.length > 0 && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Description</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Qty</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 hidden sm:table-cell">Unit</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Total</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lineItems.map((item) => (
                <tr key={item.id} className="bg-white">
                  <td className="px-3 py-2">{item.description}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{item.qty}</td>
                  <td className="px-3 py-2 text-right text-gray-600 hidden sm:table-cell">
                    ${item.unit_price.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    ${item.line_total.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      className="text-gray-400 hover:text-red-500 text-xs"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={3} className="px-3 py-2 text-right text-sm font-semibold text-gray-700">
                  Subtotal
                </td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-900">
                  ${subtotal.toFixed(2)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Hidden line_items input */}
      <input type="hidden" name="line_items" value={JSON.stringify(lineItems)} />

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Any notes for this quote…"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={lineItems.length === 0}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Quote
        </button>
        {lineItems.length === 0 && (
          <span className="text-xs text-gray-400">Add at least one line item</span>
        )}
      </div>
    </form>
  )
}
