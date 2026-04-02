export type PricingConfig = {
  product_types: Array<{ id: string; label: string; base_price: number }>
  qty_breaks: Array<{ min: number; max: number | null; multiplier: number }>
  materials: Array<{ id: string; label: string; multiplier: number }>
  finishing: Array<{ id: string; label: string; multiplier: number }>
}

export type LineItem = {
  id: string
  description: string
  product_type_id: string
  qty: number
  base_price: number
  material_id: string
  material_multiplier: number
  finishing_id: string
  finishing_multiplier: number
  qty_multiplier: number
  unit_price: number
  line_total: number
}

export const ORDER_STATUS_SEQUENCE = [
  'pending',
  'approved',
  'printing',
  'finishing',
  'completed',
  'delivered',
] as const

export type OrderStatus = (typeof ORDER_STATUS_SEQUENCE)[number]

export function getNextStatus(current: OrderStatus): OrderStatus | null {
  const idx = ORDER_STATUS_SEQUENCE.indexOf(current)
  return idx >= 0 && idx < ORDER_STATUS_SEQUENCE.length - 1
    ? ORDER_STATUS_SEQUENCE[idx + 1]
    : null
}

export const JOB_STAGE_SEQUENCE = [
  'design',
  'proofing',
  'printing',
  'finishing',
  'ready_for_pickup',
] as const

export type JobStage = (typeof JOB_STAGE_SEQUENCE)[number]

export const INVOICE_STATUS_SEQUENCE = ['draft', 'sent', 'paid'] as const
export type InvoiceStatus = (typeof INVOICE_STATUS_SEQUENCE)[number]

export type TimeEntry = {
  id: string
  tenant_id: string
  user_id: string
  clocked_in_at: string
  clocked_out_at: string | null
  job_id: string | null
  task_stage: string | null
  output_qty: number | null
  notes: string | null
  status: 'pending' | 'approved'
  approved_by: string | null
  approved_at: string | null
  created_at: string
}
