export async function POST(request: Request) {
  const secret = request.headers.get('x-n8n-secret')

  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const event: string = body.event ?? 'unknown'

  console.log('[n8n webhook]', event, body)

  switch (event) {
    case 'payment.confirmed':
      // Phase 3: mark invoice paid + notify owner
      console.log('[n8n webhook] Payment confirmed event received (Phase 3 handler pending)')
      break
    default:
      console.log(`[n8n webhook] Unhandled event: ${event}`)
  }

  return Response.json({ received: true }, { status: 200 })
}
