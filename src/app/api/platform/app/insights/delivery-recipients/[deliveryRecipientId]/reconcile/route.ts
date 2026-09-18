import { runAppCommandRoute } from '@/lib/api-platform/core/app-auth'
import { reconcileAppInsightDeliveryRecipient } from '@/lib/api-platform/resources/app-insights'

export const dynamic = 'force-dynamic'

/** TASK-1848 — resuelve un destinatario `ambiguous` contra el ledger de correo antes de cualquier reenvío. */
export async function POST(request: Request, { params }: { params: Promise<{ deliveryRecipientId: string }> }) {
  const { deliveryRecipientId } = await params
  const body = await request.json().catch(() => undefined)

  return runAppCommandRoute({ request, routeKey: 'platform.app.insights.delivery_recipients.reconcile', body, handler: async context => reconcileAppInsightDeliveryRecipient({ context, request, body, deliveryRecipientId }) })
}
