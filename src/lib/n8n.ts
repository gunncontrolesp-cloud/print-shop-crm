export async function notifyN8n(
  webhookUrl: string | undefined,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-n8n-secret': process.env.N8N_WEBHOOK_SECRET ?? '',
      },
      body: JSON.stringify({
        event,
        ...payload,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch (err) {
    console.error('[n8n]', event, err instanceof Error ? err.message : err)
  }
}

export async function notifyQuoteSent(
  quoteId: string,
  customerEmail: string,
  customerName: string
): Promise<void> {
  await notifyN8n(process.env.N8N_WEBHOOK_QUOTE_SENT, 'quote.sent', {
    quoteId,
    customerEmail,
    customerName,
  })
}

export async function notifyOrderApproved(
  orderId: string,
  customerEmail: string,
  customerName: string
): Promise<void> {
  await notifyN8n(process.env.N8N_WEBHOOK_ORDER_APPROVED, 'order.approved', {
    orderId,
    customerEmail,
    customerName,
  })
}

export async function notifyJobReady(
  jobId: string,
  orderId: string,
  customerEmail: string,
  customerName: string,
  customerPhone: string | null
): Promise<void> {
  await notifyN8n(process.env.N8N_WEBHOOK_JOB_READY, 'job.ready_for_pickup', {
    jobId,
    orderId,
    customerEmail,
    customerName,
    customerPhone,
  })
}

export async function notifyProofDecision(
  jobId: string,
  orderId: string,
  decision: 'approved' | 'changes_requested',
  comments: string,
  customerEmail: string,
  customerName: string
): Promise<void> {
  await notifyN8n(process.env.N8N_WEBHOOK_PROOF_DECISION, 'proof.decision_submitted', {
    jobId,
    orderId,
    decision,
    comments,
    customerEmail,
    customerName,
  })
}

export async function notifyInvoicePaid(
  invoiceId: string,
  customerEmail: string,
  customerName: string
): Promise<void> {
  await notifyN8n(process.env.N8N_WEBHOOK_INVOICE_PAID, 'invoice.paid', {
    invoiceId,
    customerEmail,
    customerName,
  })
}

export async function notifyMissedClockOut(
  userId: string,
  employeeName: string,
  employeeEmail: string,
  clockedInAt: string,
  hoursElapsed: number
): Promise<void> {
  await notifyN8n(process.env.N8N_TIMECLOCK_MISSED_CLOCKOUT_URL, 'timeclock.missed_clockout', {
    userId,
    employeeName,
    employeeEmail,
    clockedInAt,
    hoursElapsed,
  })
}

export async function notifyLowStock(
  itemId: string,
  itemName: string,
  quantity: number,
  threshold: number
): Promise<void> {
  await notifyN8n(process.env.N8N_WEBHOOK_LOW_STOCK, 'inventory.low_stock', {
    itemId,
    itemName,
    quantity,
    threshold,
  })
}

export async function notifyInvoicePaymentLink(
  invoiceId: string,
  customerEmail: string,
  customerName: string,
  paymentLinkUrl: string
): Promise<void> {
  await notifyN8n(process.env.N8N_WEBHOOK_INVOICE_PAYMENT_LINK, 'invoice.payment_link_sent', {
    invoiceId,
    customerEmail,
    customerName,
    paymentLinkUrl,
  })
}
