import { createClient } from '@/lib/supabase/server'
import { createInventoryItem, adjustQuantity } from '@/lib/actions/inventory'
import { Package, AlertTriangle } from 'lucide-react'

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('inventory_items')
    .select('id, name, category, quantity, unit, low_stock_threshold, notes')
    .order('name', { ascending: true })

  const inputClass =
    'border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-card'

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{items?.length ?? 0} items</p>
        </div>
      </div>

      {!items?.length ? (
        <div className="bg-card rounded-xl border border-border mb-6">
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No inventory items yet</p>
            <p className="text-sm text-muted-foreground">Add your first item below to start tracking stock.</p>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quantity</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Threshold</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isLow = Number(item.quantity) <= Number(item.low_stock_threshold)
                const adjustAction = adjustQuantity.bind(null, item.id)
                return (
                  <tr key={item.id} className={`border-b border-border/30 transition-colors ${isLow ? 'bg-orange-50/60' : 'hover:bg-muted/40'}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground capitalize text-xs">{item.category}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`font-semibold text-sm ${isLow ? 'text-orange-600' : 'text-foreground'}`}>
                        {Number(item.quantity)} {item.unit}
                      </span>
                      {isLow && (
                        <span className="block text-xs text-orange-500 font-medium">Low stock</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground text-xs">
                      {Number(item.low_stock_threshold)} {item.unit}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <form action={adjustAction} className="flex items-center justify-end gap-1.5">
                        <input
                          type="number"
                          name="delta"
                          placeholder="±qty"
                          className="w-16 text-xs border border-border rounded-lg px-2 py-1.5 text-right focus:outline-none focus:ring-1 focus:ring-primary/40 bg-background"
                        />
                        <button
                          type="submit"
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/80 transition-colors font-medium"
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
      <div className="bg-card rounded-xl border border-border p-6">
        <p className="text-sm font-semibold text-foreground mb-4">Add Item</p>
        <form action={createInventoryItem} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <input name="name" required placeholder="Item name" className={inputClass} />
          <input name="category" placeholder="Category (e.g. paper, ink)" className={inputClass} />
          <input name="quantity" type="number" min="0" required placeholder="Starting qty" className={inputClass} />
          <input name="unit" placeholder="Unit (sheets, bottles…)" className={inputClass} />
          <input name="low_stock_threshold" type="number" min="0" required placeholder="Low stock threshold" className={inputClass} />
          <input name="notes" placeholder="Notes (optional)" className={inputClass} />
          <div className="col-span-2 sm:col-span-3">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
