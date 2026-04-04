'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { LineItem, PricingConfig } from '@/lib/types'

function getQtyMultiplier(
  qty: number,
  breaks: PricingConfig['qty_breaks']
): number {
  const match = breaks.find(
    (b) => qty >= b.min && (b.max === null || qty <= b.max)
  )
  return match?.multiplier ?? 1
}

function calcLineItem(
  productTypeId: string,
  qty: number,
  materialId: string,
  finishingId: string,
  description: string,
  config: PricingConfig
): LineItem {
  const product = config.product_types.find((p) => p.id === productTypeId)
  const material = config.materials.find((m) => m.id === materialId)
  const finishing = config.finishing.find((f) => f.id === finishingId)

  const base_price = product?.base_price ?? 0
  const material_multiplier = material?.multiplier ?? 1
  const finishing_multiplier = finishing?.multiplier ?? 1
  const qty_multiplier = getQtyMultiplier(qty, config.qty_breaks)

  const unit_price =
    Math.round(
      base_price * qty_multiplier * material_multiplier * finishing_multiplier * 10000
    ) / 10000
  const line_total = Math.round(unit_price * qty * 100) / 100

  return {
    id: crypto.randomUUID(),
    description,
    product_type_id: productTypeId,
    qty,
    base_price,
    material_id: materialId,
    material_multiplier,
    finishing_id: finishingId,
    finishing_multiplier,
    qty_multiplier,
    unit_price,
    line_total,
  }
}

export function QuoteLineItemForm({
  config,
  onAdd,
}: {
  config: PricingConfig
  onAdd: (item: LineItem) => void
}) {
  const defaultProduct = config.product_types?.[0]
  const defaultMaterial = config.materials?.[0]
  const defaultFinishing = config.finishing?.[0]

  const [mode, setMode] = useState<'catalog' | 'custom'>('catalog')

  // Catalog mode state
  const [productTypeId, setProductTypeId] = useState(defaultProduct?.id ?? '')
  const [qty, setQty] = useState(100)
  const [materialId, setMaterialId] = useState(defaultMaterial?.id ?? '')
  const [finishingId, setFinishingId] = useState(defaultFinishing?.id ?? '')
  const [description, setDescription] = useState(defaultProduct?.label ?? '')

  // Custom mode state
  const [customDescription, setCustomDescription] = useState('')
  const [customQty, setCustomQty] = useState(1)
  const [customUnitPrice, setCustomUnitPrice] = useState('')

  const preview = calcLineItem(productTypeId, qty, materialId, finishingId, description, config)

  const customUnitPriceNum = parseFloat(customUnitPrice) || 0
  const customLineTotal = Math.round(customQty * customUnitPriceNum * 100) / 100

  function handleProductChange(id: string) {
    setProductTypeId(id)
    const product = config.product_types.find((p) => p.id === id)
    if (product) setDescription(product.label)
  }

  function handleAddCatalog() {
    if (!description.trim() || qty <= 0) return
    onAdd(preview)
    setQty(100)
    setProductTypeId(defaultProduct?.id ?? '')
    setDescription(defaultProduct?.label ?? '')
    setMaterialId(defaultMaterial?.id ?? '')
    setFinishingId(defaultFinishing?.id ?? '')
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
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="li-product">Product Type</Label>
              <select
                id="li-product"
                value={productTypeId}
                onChange={(e) => handleProductChange(e.target.value)}
                className={selectClass}
              >
                {config.product_types.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} (${p.base_price.toFixed(4)}/unit)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="li-desc">Description</Label>
              <Input
                id="li-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Line item description"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="li-qty">Quantity</Label>
              <Input
                id="li-qty"
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="li-material">Material</Label>
              <select
                id="li-material"
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className={selectClass}
              >
                {config.materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} (×{m.multiplier.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="li-finishing">Finishing</Label>
              <select
                id="li-finishing"
                value={finishingId}
                onChange={(e) => setFinishingId(e.target.value)}
                className={selectClass}
              >
                {config.finishing.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} (×{f.multiplier.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Price Preview</Label>
              <div className="flex items-center h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900">
                ${preview.unit_price.toFixed(4)}/unit × {qty} ={' '}
                <span className="ml-1 font-semibold">${preview.line_total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddCatalog}
            disabled={!description.trim() || qty <= 0}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Line Item
          </button>
        </>
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
