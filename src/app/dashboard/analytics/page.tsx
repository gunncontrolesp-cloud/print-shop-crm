import { createClient } from '@/lib/supabase/server'

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  twelveMonthsAgo.setDate(1)
  twelveMonthsAgo.setHours(0, 0, 0, 0)

  const [{ data: paidInvoices }, { data: recentOrders }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, amount, created_at, orders(customers(id, name))')
      .eq('status', 'paid')
      .gte('created_at', twelveMonthsAgo.toISOString()),
    supabase
      .from('orders')
      .select('id, created_at')
      .gte('created_at', twelveMonthsAgo.toISOString()),
  ])

  // Build last-12-months labels (oldest → newest, current month last)
  const months: { label: string; key: string }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    d.setDate(1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    months.push({ key, label })
  }

  // Monthly revenue aggregation
  const revenueByMonth: Record<string, number> = {}
  for (const invoice of paidInvoices ?? []) {
    const key = invoice.created_at.slice(0, 7)
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + Number(invoice.amount)
  }

  // Top customers aggregation
  type CustomerRef = { id: string; name: string }
  const customerMap: Record<string, { name: string; revenue: number; orderCount: number }> = {}
  for (const invoice of paidInvoices ?? []) {
    const orderRaw = Array.isArray(invoice.orders) ? invoice.orders[0] : invoice.orders
    const order = orderRaw as { customers?: CustomerRef | CustomerRef[] } | null
    const customerRaw = order?.customers
    const customer: CustomerRef | null = Array.isArray(customerRaw)
      ? (customerRaw[0] ?? null)
      : (customerRaw ?? null)
    if (!customer) continue
    const entry = customerMap[customer.id] ?? { name: customer.name, revenue: 0, orderCount: 0 }
    entry.revenue += Number(invoice.amount)
    entry.orderCount += 1
    customerMap[customer.id] = entry
  }
  const topCustomers = Object.values(customerMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Monthly order volume aggregation
  const volumeByMonth: Record<string, number> = {}
  for (const order of recentOrders ?? []) {
    const key = order.created_at.slice(0, 7)
    volumeByMonth[key] = (volumeByMonth[key] ?? 0) + 1
  }

  const monthlyRevenueData = months.map((m) => ({
    label: m.label,
    value: revenueByMonth[m.key] ?? 0,
  }))

  const monthlyVolumeData = months.map((m) => ({
    label: m.label,
    value: volumeByMonth[m.key] ?? 0,
  }))

  const totalRevenue = Object.values(revenueByMonth).reduce((sum, v) => sum + v, 0)
  const totalOrders = Object.values(volumeByMonth).reduce((sum, v) => sum + v, 0)

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-foreground mb-8">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Revenue */}
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Monthly Revenue
          </p>
          <p className="text-2xl font-bold text-foreground mb-4">
            ${totalRevenue.toFixed(2)}
            <span className="text-sm font-normal text-muted-foreground ml-2">last 12 months</span>
          </p>
          {monthlyRevenueData.every((d) => d.value === 0) ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No paid invoices yet.</p>
          ) : (
            <BarChart data={monthlyRevenueData} />
          )}
        </div>

        {/* Order Volume */}
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Order Volume
          </p>
          <p className="text-2xl font-bold text-foreground mb-4">
            {totalOrders}
            <span className="text-sm font-normal text-muted-foreground ml-2">last 12 months</span>
          </p>
          {monthlyVolumeData.every((d) => d.value === 0) ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No orders yet.</p>
          ) : (
            <BarChart data={monthlyVolumeData} />
          )}
        </div>
      </div>

      {/* Top Customers */}
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Top Customers by Revenue
        </p>
        {topCustomers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No revenue data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="pb-2 text-left font-medium text-muted-foreground text-xs">Customer</th>
                <th className="pb-2 text-right font-medium text-muted-foreground text-xs">Invoices</th>
                <th className="pb-2 text-right font-medium text-muted-foreground text-xs">
                  Total Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {topCustomers.map((c, i) => (
                <tr key={i}>
                  <td className="py-2.5 text-foreground font-medium">{c.name}</td>
                  <td className="py-2.5 text-right text-muted-foreground">{c.orderCount}</td>
                  <td className="py-2.5 text-right font-semibold text-foreground">
                    ${c.revenue.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center flex-1 gap-1">
          <div
            className="w-full bg-primary rounded-t min-h-[2px] opacity-70"
            style={{ height: `${(d.value / max) * 100}%` }}
          />
          <span className="text-[9px] text-muted-foreground truncate w-full text-center leading-tight">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  )
}
