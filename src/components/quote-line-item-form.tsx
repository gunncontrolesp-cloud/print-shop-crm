'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { LineItem, Product } from '@/lib/types'

export function QuoteLineItemForm({
  products,
  onAdd,
}: {
  products: Product[]
  onAdd: (item: LineItem) => void
}) {
  const [mode, setMode] = useState<'catalog' | 'custom'>('catalog')

  // Catalog mode state
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [catalogQty, setCatalogQty] = useState(1)
  const [catalogDescription, setCatalogDescription] = useState(products[0]?.name ?? '')

  // Custom mode state
  const [customDescription, setCustomDescription] = useState('')
  const [customQty, setCustomQty] = useState(1)
  const [customUnitPrice, setCustomUnitPrice] = useState('')

  const selectedProduct = products.find((p) => p.id === productId)
  const catalogUnitPrice = Number(selectedProduct?.unit_price ?? 0)
  const catalogTotal = Math.round(catalogUnitPrice * catalogQty * 100) / 100

  const customUnitPriceNum = parseFloat(customUnitPrice) || 0
  const customLineTotal = Math.round(customQty * customUnitPriceNum * 100) / 100

  function handleProductChange(id: string) {
    setProductId(id)
    const p = products.find((pr) => pr.id === id)
    if (p) setCatalogDescription(p.name)
  }

  function handleAddCatalog() {
    if (!selectedProduct || catalogQty <= 0 || !catalogDescription.trim()) return
    onAdd({
      id: crypto.randomUUID(),
      description: catalogDescription.trim(),
      product_type_id: selectedProduct.id,
      qty: catalogQty,
      base_price: catalogUnitPrice,
      material_id: null,
      material_multiplier: 1,
      finishing_id: null,
      finishing_multiplier: 1,
      qty_multiplier: 1,
      unit_price: catalogUnitPrice,
      line_total: catalogTotal,
    })
    setCatalogQty(1)
    setProductId(products[0]?.id ?? '')
    setCatalogDescription(products[0]?.name ?? '')
  }

  function handleAddCustom() {
    if (!customDescription.trim() || customQty <= 0 || customUnitPriceNum <= 0) return
    onAdd({
      id: crypto.randomUUID(),
      description: customDescription.trim(),
      product_type_id: null,
      qty: customQty,
      base_price: customUnitPriceNum,
      material_id: null,
      material_multiplier: 1,
      finishing_id: null,
      finishing_multiplier: 1,
      qty_multiplier: 1,
      unit_price: customUnitPriceNum,
      line_total: customLineTotal,
    })
    setCustomDescription('')
    setCustomQty(1)
    setCustomUnitPrice('')
  }

  const selectClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Add Line Item</h3>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setMode('catalog')}
            className={`px-3 py-1.5 font-medium transition-colors ${
              mode === 'catalog'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Catalog
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`px-3 py-1.5 font-medium transition-colors border-l border-gray-200 ${
              mode === 'custom'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {mode === 'catalog' ? (
        products.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">
            No products in catalog yet.{' '}
            <a href="/dashboard/settings/catalog" className="text-gray-900 underline font-medium">
              Add products in Settings → Product Catalog
            </a>
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="li-product">Product</Label>
                <select
                  id="li-product"
                  value={productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className={selectClass}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${Number(p.unit_price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="li-desc">Description</Label>
                <Input
                  id="li-desc"
                  value={catalogDescription}
                  onChange={(e) => setCatalogDescription(e.target.value)}
                  placeholder="Line item description"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="li-qty">Quantity</Label>
                <Input
                  id="li-qty"
                  type="number"
                  min={1}
                  value={catalogQty}
                  onChange={(e) => setCatalogQty(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>

              <div className="space-y-1">
                <Label>Total</Label>
                <div className="flex items-center h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900">
                  ${catalogUnitPrice.toFixed(2)}/unit × {catalogQty} ={' '}
                  <span className="ml-1 font-semibold">${catalogTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddCatalog}
              disabled={!selectedProduct || catalogQty <= 0 || !catalogDescription.trim()}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add Line Item
            </button>
          </>
        )
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="li-custom-desc">Description</Label>
              <Input
                id="li-custom-desc"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="e.g. Custom T-Shirts — Navy Blue, Screen Print"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="li-custom-qty">Quantity</Label>
              <Input
                id="li-custom-qty"
                type="number"
                min={1}
                value={customQty}
                onChange={(e) => setCustomQty(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="li-custom-price">Unit Price ($)</Label>
              <Input
                id="li-custom-price"
                type="number"
                min={0}
                step={0.01}
                value={customUnitPrice}
                onChange={(e) => setCustomUnitPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1">
              <Label>Total</Label>
              <div className="flex items-center h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900">
                {customUnitPriceNum > 0 && customQty > 0 ? (
                  <>
                    ${customUnitPriceNum.toFixed(2)}/unit × {customQty} ={' '}
                    <span className="ml-1 font-semibold">${customLineTotal.toFixed(2)}</span>
                  </>
                ) : (
                  <span className="text-gray-400">Enter qty and price</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddCustom}
            disabled={!customDescription.trim() || customQty <= 0 || customUnitPriceNum <= 0}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Line Item
          </button>
        </>
      )}
    </div>
  )
}
