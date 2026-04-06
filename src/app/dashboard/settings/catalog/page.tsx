import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button-variants'
import { addProduct, archiveProduct, restoreProduct } from '@/lib/actions/catalog'

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
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="p-8 max-w-3xl">
      {errorMsg && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(errorMsg)}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success === 'added'
            ? 'Product added.'
            : success === 'updated'
              ? 'Product updated.'
              : success === 'archived'
                ? 'Product archived.'
                : 'Done.'}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Product Catalog</h1>
        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
          Admin only
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Products added here appear in the Catalog tab when building quotes.
      </p>

      {/* Add product form */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Product</h2>
        <form action={addProduct} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <input
              name="name"
              required
              placeholder="Product name (e.g. Custom T-Shirt, Branded Mug)"
              className={inputClass}
            />
          </div>
          <div>
            <input
              name="category"
              placeholder="Category (e.g. Apparel, Promo, Print)"
              className={inputClass}
            />
          </div>
          <div>
            <input
              name="unit_price"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="Unit price (e.g. 15.00)"
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <input
              name="description"
              placeholder="Description (optional)"
              className={inputClass}
            />
          </div>
          <div>
            <button type="submit" className={buttonVariants({ size: 'sm' })}>
              Add Product
            </button>
          </div>
        </form>
      </div>

      {/* Active products */}
      <div className="rounded-lg border border-gray-200 overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Unit Price</th>
              <th className="px-4 py-3 w-32" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeProducts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No products yet — add one above
                </td>
              </tr>
            ) : (
              activeProducts.map((product) => (
                <tr key={product.id} className="bg-white">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {product.name}
                    {product.description && (
                      <p className="text-xs text-gray-400 font-normal">{product.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{product.category}</td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    ${Number(product.unit_price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/dashboard/settings/catalog/${product.id}/edit`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        Edit
                      </a>
                      <form action={archiveProduct}>
                        <input type="hidden" name="id" value={product.id} />
                        <button
                          type="submit"
                          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                        >
                          Archive
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
          <summary className="cursor-pointer text-gray-500 hover:text-gray-900 select-none">
            {archivedProducts.length} archived product
            {archivedProducts.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {archivedProducts.map((product) => (
                  <tr key={product.id} className="bg-white opacity-50">
                    <td className="px-4 py-3 text-gray-700">{product.name}</td>
                    <td className="px-4 py-3 text-gray-400">{product.category}</td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      ${Number(product.unit_price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={restoreProduct}>
                        <input type="hidden" name="id" value={product.id} />
                        <button type="submit" className="text-xs text-blue-600 hover:underline">
                          Restore
                        </button>
                      </form>
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
