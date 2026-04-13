import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { addProduct, archiveProduct, restoreProduct, deleteProduct } from '@/lib/actions/catalog'
import { Package } from 'lucide-react'

export default async function CatalogPage({
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

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  const activeProducts = products?.filter((p) => p.active) ?? []
  const archivedProducts = products?.filter((p) => !p.active) ?? []

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {errorMsg && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {decodeURIComponent(errorMsg)}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success === 'added' ? 'Product added.' : success === 'updated' ? 'Product updated.' : success === 'archived' ? 'Product archived.' : success === 'deleted' ? 'Product deleted.' : 'Done.'}
        </div>
      )}

      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-slate-900">Product Catalog</h1>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 font-medium">
          Admin only
        </span>
      </div>
      <p className="text-sm text-slate-500 mb-8">
        Products added here appear in the Catalog tab when building quotes.
      </p>

      {/* Add product form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Add Product</h2>
        <form action={addProduct} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <input
              name="name"
              required
              placeholder="Product name (e.g. Custom T-Shirt, Branded Mug)"
              className={inputClass}
            />
          </div>
          <input name="category" placeholder="Category (e.g. Apparel, Promo, Print)" className={inputClass} />
          <input
            name="unit_price"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Unit price (e.g. 15.00)"
            className={inputClass}
          />
          <div className="col-span-2">
            <input name="description" placeholder="Description (optional)" className={inputClass} />
          </div>
          <div>
            <button
              type="submit"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Add Product
            </button>
          </div>
        </form>
      </div>

      {/* Active products */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit Price</th>
              <th className="px-5 py-3 w-36" />
            </tr>
          </thead>
          <tbody>
            {activeProducts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-400">No products yet — add one above</p>
                  </div>
                </td>
              </tr>
            ) : (
              activeProducts.map((product) => (
                <tr key={product.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-slate-900">{product.name}</span>
                    {product.description && (
                      <p className="text-xs text-slate-400 font-normal mt-0.5">{product.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{product.category}</td>
                  <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                    ${Number(product.unit_price).toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/dashboard/settings/catalog/${product.id}/edit`}
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Edit
                      </a>
                      <form action={archiveProduct}>
                        <input type="hidden" name="id" value={product.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          Archive
                        </button>
                      </form>
                      <form action={deleteProduct}>
                        <input type="hidden" name="id" value={product.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {archivedProducts.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-500 hover:text-slate-900 select-none text-xs font-medium uppercase tracking-wide">
            {archivedProducts.length} archived product{archivedProducts.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {archivedProducts.map((product) => (
                  <tr key={product.id} className="border-b border-slate-50 opacity-60">
                    <td className="px-5 py-3 text-slate-700">{product.name}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{product.category}</td>
                    <td className="px-5 py-3 text-right text-slate-500 text-xs">
                      ${Number(product.unit_price).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <form action={restoreProduct}>
                          <input type="hidden" name="id" value={product.id} />
                          <button type="submit" className="text-xs text-indigo-600 hover:underline">
                            Restore
                          </button>
                        </form>
                        <form action={deleteProduct}>
                          <input type="hidden" name="id" value={product.id} />
                          <button type="submit" className="text-xs text-rose-600 hover:underline">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}
