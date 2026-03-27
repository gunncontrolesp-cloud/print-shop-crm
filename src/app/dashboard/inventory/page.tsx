import { createClient } from '@/lib/supabase/server'
import { createInventoryItem, adjustQuantity } from '@/lib/actions/inventory'

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('inventory_items')
    .select('id, name, category, quantity, unit, low_stock_threshold, notes')
    .order('name', { ascending: true })

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Inventory</h1>
      </div>

      {/* Inventory table */}
      {!items?.length ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center mb-6">
          <p className="text-sm text-gray-500 mb-1">No inventory items yet.</p>
          <p className="text-xs text-gray-400">
            Add your first item below to start tracking stock.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Item</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Category</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">Quantity</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">Threshold</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.map((item) => {
                const isLow = Number(item.quantity) <= Number(item.low_stock_threshold)
                const adjustAction = adjustQuantity.bind(null, item.id)
                return (
                  <tr key={item.id} className={isLow ? 'bg-orange-50' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.notes && (
                        <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{item.category}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold ${isLow ? 'text-orange-600' : 'text-gray-900'}`}
                      >
                        {Number(item.quantity)} {item.unit}
                      </span>
                      {isLow && (
                        <p className="text-xs text-orange-500 font-medium">Low stock</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {Number(item.low_stock_threshold)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={adjustAction} className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          name="delta"
                          placeholder="±qty"
                          className="w-16 text-xs border border-gray-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-gray-900"
                        />
                        <button
                          type="submit"
                          className="text-xs px-2 py-1 rounded bg-gray-900 text-white hover:bg-gray-700"
                        >
                          Update
                        </button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add item form */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">Add Item</p>
        <form action={createInventoryItem} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <input
            name="name"
            required
            placeholder="Item name"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <input
            name="category"
            placeholder="Category (e.g. paper, ink)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <input
            name="quantity"
            type="number"
            min="0"
            required
            placeholder="Starting qty"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <input
            name="unit"
            placeholder="Unit (sheets, bottles…)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <input
            name="low_stock_threshold"
            type="number"
            min="0"
            required
            placeholder="Low stock threshold"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <input
            name="notes"
            placeholder="Notes (optional)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <div className="col-span-2 sm:col-span-3">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
