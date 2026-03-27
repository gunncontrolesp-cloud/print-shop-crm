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
