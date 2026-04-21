'use client'

import { useState, useTransition } from 'react'
import { bulkImportProducts } from '@/lib/actions/catalog'

type ParsedRow = {
  name: string
  category: string
  unit_price: number
  description: string
  error?: string
}

function parseRows(text: string): ParsedRow[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((raw) => {
      const cols = raw.includes('\t')
        ? raw.split('\t').map((c) => c.trim())
        : raw.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))

      const [name = '', category = '', priceStr = '', description = ''] = cols
      const unit_price = parseFloat(priceStr.replace(/[$,]/g, ''))

      if (!name) return { name, category, unit_price, description, error: 'Missing name' }
      if (isNaN(unit_price) || unit_price < 0)
        return { name, category, unit_price: 0, description, error: 'Invalid price' }

      return { name, category: category || 'General', unit_price, description }
    })
}

export function BulkImportProducts() {
  const [text, setText] = useState('')
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [result, setResult] = useState<{ imported?: number; error?: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handlePreview() {
    setResult(null)
    setRows(parseRows(text))
  }

  function handleImport() {
    if (!rows) return
    const valid = rows.filter((r) => !r.error)
    if (!valid.length) return

    startTransition(async () => {
      const res = await bulkImportProducts(
        valid.map(({ name, category, unit_price, description }) => ({
          name,
          category,
          unit_price,
          description: description || null,
        }))
      )
      setResult(res)
      if (!res.error) {
        setText('')
        setRows(null)
      }
    })
  }

  const validCount = rows?.filter((r) => !r.error).length ?? 0
  const errorCount = rows?.filter((r) => r.error).length ?? 0

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
      <h2 className="text-sm font-semibold text-slate-800 mb-1">Bulk Import from Spreadsheet</h2>
      <p className="text-xs text-slate-500 mb-3">
        Copy rows from Excel or Google Sheets and paste below. Column order:{' '}
        <span className="font-mono text-slate-700">Name · Category · Price · Description</span>
      </p>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setRows(null)
          setResult(null)
        }}
        placeholder={'Custom T-Shirt\tApparel\t15.00\tFull color front print\nBranded Mug\tPromo\t12.50\t11oz ceramic mug'}
        rows={5}
        className={`${inputClass} font-mono mb-3`}
      />

      <button
        type="button"
        onClick={handlePreview}
        disabled={!text.trim()}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
      >
        Preview
      </button>

      {rows && rows.length > 0 && (
        <div className="mt-4">
          <div className="overflow-auto rounded-lg border border-slate-200 mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Category</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500">Price</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Description</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={`border-b border-slate-50 ${row.error ? 'bg-rose-50' : ''}`}>
                    <td className="px-3 py-2 text-slate-800 font-medium">{row.name || '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{row.category}</td>
                    <td className="px-3 py-2 text-right text-slate-800">
                      {row.error && row.unit_price === 0 ? '—' : `$${row.unit_price.toFixed(2)}`}
                    </td>
                    <td className="px-3 py-2 text-slate-400">{row.description || '—'}</td>
                    <td className="px-3 py-2">
                      {row.error ? (
                        <span className="text-rose-600 font-medium">{row.error}</span>
                      ) : (
                        <span className="text-emerald-600 font-medium">Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleImport}
              disabled={isPending || validCount === 0}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              {isPending ? 'Importing…' : `Import ${validCount} product${validCount !== 1 ? 's' : ''}`}
            </button>
            {errorCount > 0 && (
              <span className="text-xs text-rose-600">
                {errorCount} row{errorCount !== 1 ? 's' : ''} will be skipped
              </span>
            )}
          </div>
        </div>
      )}

      {rows && rows.length === 0 && (
        <p className="mt-3 text-xs text-slate-400">No rows detected — check the pasted text.</p>
      )}

      {result?.imported != null && !result.error && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {result.imported} product{result.imported !== 1 ? 's' : ''} imported successfully.
        </div>
      )}
      {result?.error && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Import failed: {result.error}
        </div>
      )}
    </div>
  )
}
