import type { ReactNode } from 'react'

import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'

/**
 * TASK-1685 Slice 2 — el layout gatea por el MISMO carril que la página.
 *
 * Acá vivía un `hasAuthorizedViewCode({ viewCode: 'cliente.proyectos', … })`: el carril de
 * ROL. La página (`page.tsx`) gateaba por el MÓDULO contratado. Dos puertas, dos rieles, y la
 * de afuera era la equivocada.
 *
 * El agujero no era teórico: **`/proyectos/[id]` no tiene guard propio**, así que su única
 * puerta era este layout. Un cliente cuyo rol concedía `cliente.proyectos` pero cuya
 * organización NO tenía el módulo entraba al detalle escribiendo la URL, aunque el listado le
 * estuviera negado. El módulo no gateaba lo que creía gatear.
 *
 * Usar el guard canónico además mejora el destino: `/home?denied=proyectos` renderiza
 * `ModuleNotAssignedEmpty`, que explica qué pasó, en vez de un `/401` mudo. Y conserva el
 * bypass interno (D1), que el carril de rol rompía — un operador interno recibía 401 acá pese
 * a que la página lo dejaba entrar.
 *
 * **NUNCA** volver a gatear una ruta `cliente.*` con `hasAuthorizedViewCode`. El lint
 * `greenhouse/no-client-portal-view-visibility-bypass` lo impide.
 */
export default async function ProjectsLayout({ children }: { children: ReactNode }) {
  await requireViewCodeAccess('cliente.proyectos')

  return children
}
