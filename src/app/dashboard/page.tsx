import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Users, ShoppingCart, AlertCircle, Layers, Receipt,
  AlertTriangle, FileText, ArrowRight, Plus, CheckCircle2,
} from 'lucide-react'
import type { OrderStatus } from '@/lib/types'

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pending:  { label: 'Pending',   className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  approved: { label: 'Approved',  className: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
  printing: { label: 'Printing',  className: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
  finishing:{ label: 'Finishing', className: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  completed:{ label: 'Completed', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  delivered:{ label: 'Delivered', className: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' },
}

function SectionLabel({ children, variant = 'default' }: {
  children: React.ReactNode
  variant?: 'default' | 'urgent' | 'clear'
}) {
  const colors = {
    default: 'text-slate-400 [--rule:theme(colors.slate.200)]',
    urgent:  'text-amber-500 [--rule:theme(colors.amber.200)]',
    clear:   'text-emerald-600 [--rule:theme(colors.emerald.200)]',
  }
  return (
    <div className={`flex items-center gap-3 mb-4 ${colors[variant]}`}>
      <div className="h-px flex-1 bg-[--rule]" />
      <p className="text-[10px] font-mono font-semibold uppercase tracking-widest shrink-0">{children}</p>
      <div className="h-px flex-1 bg-[--rule]" />
    </div>
  )
}

function ActionCard({ label, value, href, icon: Icon, variant }: {
  label: string; value: number; href: string
  icon: React.ElementType; variant: 'amber' | 'rose' | 'clear'
}) {
  const styles = {
    amber: {
      wrap: 'border-amber-200 bg-amber-50 hover:border-amber-300 hover:shadow-md',
      icon: 'bg-amber-100 text-amber-600',
      num:  'text-amber-900',
      label: 'text-amber-700',
      arrow: 'text-amber-300',
    },
    rose: {
      wrap: 'border-rose-200 bg-rose-50 hover:border-rose-300 hover:shadow-md',
      icon: 'bg-rose-100 text-rose-600',
      num:  'text-rose-900',
      label: 'text-rose-700',
      arrow: 'text-rose-300',
    },
    clear: {
      wrap: 'border-border bg-card hover:border-border/60 hover:shadow-sm',
      icon: 'bg-muted text-muted-foreground',
      num:  'text-muted-foreground/40',
      label: 'text-muted-foreground',
      arrow: 'text-border',
    },
  }
  const s = styles[variant]
  return (
    <Link
      href={href}
      className={`animate-fade-up flex items-center gap-4 rounded-xl border-2 p-5 active:scale-[0.97] transition-[box-shadow,border-color,transform] duration-200 ${s.wrap}`}
    >
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 ${s.icon}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-4xl font-mono font-bold tabular-nums leading-none ${s.num}`}>{value}</p>
        <p className={`text-sm font-medium mt-1.5 ${s.label}`}>{label}</p>
      </div>
      <ArrowRight className={`h-4 w-4 shrink-0 ${s.arrow}`} />
    </Link>
  )
}

function StatCard({ label, value, href, icon: Icon }: {
  label: string; value: number; href: string; icon: React.ElementType
}) {
  return (
    <Link
      href={href}
      className="animate-fade-up group block bg-card rounded-xl border border-border px-4 py-3.5 hover:border-border/60 hover:shadow-md active:scale-[0.97] transition-[box-shadow,border-color,transform] duration-200"
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors duration-150" />
        <ArrowRight className="h-3 w-3 text-border group-hover:text-muted-foreground transition-colors duration-150" />
      </div>
      <p className="text-2xl font-mono font-bold text-foreground tabular-nums leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{label}</p>
    </Link>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userProfile } = user
    ? await supabase.from('users').select('role').eq('id', user.id).single()
    : { data: null }
  const isStaff = (userProfile?.role ?? 'staff') === 'staff'

  const [
    { count: customerCount },
    { data: orders },
    { count: openQuoteCount },
    { count: unpaidInvoiceCount },
    { data: inventoryItems },
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('id, status, total, created_at, customers(name)').order('created_at', { ascending: false }),
    supabase.from('quotes').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent']),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent']),
    supabase.from('inventory_items').select('id, quantity, low_stock_threshold'),
  ])

  const lowStockCount = (inventoryItems ?? []).filter(
    (item) => Number(item.quantity) <= Number(item.low_stock_threshold)
  ).length

  const allOrders = orders ?? []
  const openOrderCount    = allOrders.filter((o) => o.status !== 'delivered').length
  const pendingCount      = allOrders.filter((o) => o.status === 'pending').length
  const inProductionCount = allOrders.filter((o) => o.status === 'printing' || o.status === 'finishing').length
  const recentOrders      = allOrders.slice(0, 6)

  const hasActions = pendingCount > 0 || (unpaidInvoiceCount ?? 0) > 0
  const actionSectionVariant = hasActions ? 'urgent' : 'clear'
  const actionSectionLabel   = hasActions ? 'Action Required' : 'All Clear'

  const isNewShop = allOrders.length === 0
  const workflowSteps = [
    {
      done: (customerCount ?? 0) > 0,
      label: 'Add your first customer',
      description: 'Customers are the starting point — every quote and order links back to one.',
      href: '/dashboard/customers/new',
      action: 'Add customer',
    },
    {
      done: (openQuoteCount ?? 0) > 0 || allOrders.length > 0,
      label: 'Build and send a quote',
      description: 'Price out a job with line items, set a due date, and send it for approval.',
      href: '/dashboard/quotes/new',
      action: 'New quote',
    },
    {
      done: allOrders.length > 0,
      label: 'Convert an approved quote to an order',
      description: 'Once a customer approves, one click turns it into a production order.',
      href: '/dashboard/quotes',
      action: 'View quotes',
    },
    {
      done: false,
      label: 'Complete the job and send an invoice',
      description: 'Move the order through production, then generate and send the invoice.',
      href: '/dashboard/orders',
      action: 'View orders',
    },
  ]

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Link
            href="/dashboard/customers/new"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted/60 active:scale-[0.97] transition-[background-color,transform] duration-150 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> New Customer
          </Link>
          <Link
            href="/dashboard/quotes/new"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 active:scale-[0.97] transition-[background-color,transform] duration-150 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> New Quote
          </Link>
        </div>
      </div>

      {/* Getting Started — shown to admin/manager until first order exists */}
      {isNewShop && !isStaff && (
        <div className="mb-8">
          <SectionLabel>Getting Started</SectionLabel>
          <div className="bg-card rounded-xl border border-border divide-y divide-border/30">
            {workflowSteps.map((step, i) => {
              const isActive = !step.done && workflowSteps.slice(0, i).every((s) => s.done)
              return (
                <div key={i} className={`flex items-start gap-4 px-5 py-4 ${isActive ? 'bg-primary/5' : ''}`}>
                  <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full shrink-0 ${
                    step.done ? 'bg-emerald-100' : isActive ? 'bg-primary/10' : 'bg-slate-100'
                  }`}>
                    {step.done
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      : <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-primary' : 'text-slate-400'}`}>{i + 1}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-tight ${step.done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {step.label}
                    </p>
                    {!step.done && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{step.description}</p>
                    )}
                  </div>
                  {!step.done && (
                    <Link
                      href={step.href}
                      className={`flex items-center gap-1 text-xs font-medium shrink-0 mt-0.5 transition-colors duration-100 ${
                        isActive ? 'text-primary hover:text-primary/80' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {step.action} <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Action Required — dominant, state-aware */}
      <div className="mb-8">
        <SectionLabel variant={actionSectionVariant}>
          {hasActions ? actionSectionLabel : (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" />
              {actionSectionLabel}
            </span>
          )}
        </SectionLabel>
        <div className="stagger grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ActionCard
            label="Orders Awaiting Approval"
            value={pendingCount}
            href="/dashboard/orders"
            icon={AlertCircle}
            variant={pendingCount > 0 ? 'amber' : 'clear'}
          />
          <ActionCard
            label="Unpaid Invoices"
            value={unpaidInvoiceCount ?? 0}
            href="/dashboard/invoices"
            icon={Receipt}
            variant={(unpaidInvoiceCount ?? 0) > 0 ? 'rose' : 'clear'}
          />
        </div>
      </div>

      {/* At a Glance — secondary stats */}
      <div className="mb-8">
        <SectionLabel>At a Glance</SectionLabel>
        <div className="stagger grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Customers"    value={customerCount ?? 0}  href="/dashboard/customers"  icon={Users}         />
          <StatCard label="Open Orders"  value={openOrderCount}       href="/dashboard/orders"     icon={ShoppingCart}  />
          <StatCard label="In Production" value={inProductionCount}   href="/dashboard/production" icon={Layers}        />
          <StatCard label="Low Stock"    value={lowStockCount}        href="/dashboard/inventory"  icon={AlertTriangle} />
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <h2 className="text-sm font-semibold text-slate-800">Recent Orders</h2>
            <Link href="/dashboard/orders" className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors duration-150">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-5 py-3 text-left text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest">Customer</th>
                <th className="px-5 py-3 text-left text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="px-5 py-3 text-right text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest">Total</th>
                <th className="px-5 py-3 text-right text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest">Date</th>
                <th className="sr-only">View</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <p className="text-muted-foreground text-sm mb-1">No orders yet.</p>
                    <Link href="/dashboard/quotes/new" className="text-sm text-primary hover:underline font-medium">
                      Create a quote to get started →
                    </Link>
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => {
                  const customerName =
                    (Array.isArray(order.customers) ? order.customers[0] : order.customers)?.name ?? 'Unknown'
                  const status = order.status as OrderStatus
                  const cfg = STATUS_CONFIG[status]
                  return (
                    <tr key={order.id} className="border-b border-border/30 hover:bg-muted/40 transition-colors duration-100">
                      <td className="px-5 py-3.5 font-medium text-foreground">{customerName}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-foreground font-medium">
                        ${Number(order.total).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground text-xs">
                        {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/dashboard/orders/${order.id}`} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors duration-100">
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Open Quotes</p>
              </div>
              <span className="text-2xl font-mono font-bold text-foreground tabular-nums">{openQuoteCount ?? 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Draft and sent — awaiting approval</p>
            <Link href="/dashboard/quotes" className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors duration-100">
              View all quotes <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="space-y-2">
              <Link href="/dashboard/quotes/new" className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 active:scale-[0.97] transition-[background-color,transform] duration-150">
                <Plus className="h-4 w-4" /> New Quote
              </Link>
              <Link href="/dashboard/customers/new" className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-foreground bg-muted border border-border rounded-lg hover:bg-muted/60 active:scale-[0.97] transition-[background-color,transform] duration-150">
                <Plus className="h-4 w-4" /> New Customer
              </Link>
              <Link href="/dashboard/production" className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-foreground bg-muted border border-border rounded-lg hover:bg-muted/60 active:scale-[0.97] transition-[background-color,transform] duration-150">
                <Layers className="h-4 w-4" /> Production Board
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
