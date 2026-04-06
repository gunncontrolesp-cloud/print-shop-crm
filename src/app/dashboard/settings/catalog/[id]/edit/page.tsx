import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateProduct } from '@/lib/actions/catalog'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: product } = await supabase.from('products').select('*').eq('id', id).single()
  if (!product) redirect('/dashboard/settings/catalog')

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Product</h1>
      <form action={updateProduct} className="space-y-4">
        <input type="hidden" name="id" value={product.id} />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input name="name" defaultValue={product.name} required className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <input name="category" defaultValue={product.category} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Unit Price ($)</label>
          <input
            name="unit_price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={Number(product.unit_price).toFixed(2)}
            required
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <input
            name="description"
            defaultValue={product.description ?? ''}
            placeholder="Optional"
            className={inputClass}
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Save Changes
          </button>
          <a
            href="/dashboard/settings/catalog"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
