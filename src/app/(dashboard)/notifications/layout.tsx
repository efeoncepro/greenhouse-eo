import type { ReactNode } from 'react'

import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'

/**
 * TASK-1685 Slice 2 — el layout gatea por el MISMO carril que la página.
 *
 * Acá vivía un `hasAuthorizedViewCode({ viewCode: 'cliente.notificaciones', … })` con un
 * fallback que enumeraba tres routeGroups (`client`, `my`, `internal`), porque esta ruta la
 * comparten clientes, colaboradores y operadores internos. El guard canónico expresa lo mismo
 * sin enumerar nada:
 *
 *   - sesión interna → bypass D1, entra (cubre `internal` y al colaborador, que es staff);
 *   - cliente → `cliente.notificaciones` es **vista base**: se abre sin módulo contratado,
 *     porque un cliente no contrata "poder ver sus notificaciones".
 *
 * Lo único que ahora cierra la puerta es un `revoke` per-persona, que es exactamente el
 * instrumento que debe poder cerrarla. **`/notifications/preferences` no tiene guard propio**
 * y hereda esta puerta.
 *
 * Ver `proyectos/layout.tsx` para el rationale completo.
 */
export default async function NotificationsLayout({ children }: { children: ReactNode }) {
  await requireViewCodeAccess('cliente.notificaciones')

  return children
}
