import type { ReactNode } from 'react'

import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'

/**
 * TASK-1685 Slice 2 — el layout gatea por el MISMO carril que la página.
 *
 * Acá vivía un `hasAuthorizedViewCode({ viewCode: 'cliente.campanas', … })` — el carril de
 * ROL — mientras `page.tsx` gateaba por el MÓDULO contratado. **`/campanas/[campaignId]` no
 * tiene guard propio**, así que este layout era su única puerta: un cliente cuyo rol concedía
 * la vista pero cuya organización no tenía el módulo alcanzaba el detalle por URL.
 *
 * Ver `proyectos/layout.tsx` para el rationale completo.
 */
export default async function ClientCampaignsLayout({ children }: { children: ReactNode }) {
  await requireViewCodeAccess('cliente.campanas')

  return children
}
