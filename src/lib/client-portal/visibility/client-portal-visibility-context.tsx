'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

import {
  canSeeClientPortalView,
  type ClientPortalViewVisibilityInputs
} from './client-portal-view-visibility'

/**
 * TASK-1685 Slice 2 — Transporte de los insumos de visibilidad al cliente.
 *
 * El primitive es puro, pero sus insumos viven en PG. El page guard los resuelve en el
 * servidor; el menú (`VerticalMenu`) y el ⌘K (`GlobalCommandPalette`) son Client Components y
 * necesitan **los mismos** insumos para responder **la misma** pregunta. Este contexto los
 * transporta.
 *
 * **Por qué contexto y no props.** Los dos consumers cuelgan de ramas distintas del layout —
 * el menú de `<Navigation>`, el ⌘K de `<Navbar>`— así que pasarlos por props obligaría a
 * atravesar componentes intermedios que no tienen nada que ver con visibilidad. El layout ya
 * usa esta forma para el modo de interacción de Nexa (`NexaInteractionModeProvider`).
 *
 * **Los insumos se resuelven UNA vez, en `(dashboard)/layout.tsx`**, con el mismo adaptador
 * server que consume el guard. Ésa es la propiedad que hace que menú y puerta coincidan: no
 * es que ejecuten la misma función, es que además la ejecutan sobre los mismos insumos.
 *
 * ⚠️ Los insumos viajan como JSON plano al cliente. Son viewCodes e identificadores de
 * superficie — sin PII, sin secretos. **NUNCA** agregar acá un insumo sensible: lo que entra
 * a este provider es legible por cualquiera con las devtools abiertas.
 *
 * **NUNCA** usar el hook para decidir un acceso que importe. La visibilidad en el cliente es
 * presentacional: decide qué se dibuja. La autorización real la hace el page guard en el
 * servidor, contra PG, en cada navegación. Un cliente que fuerce el contexto se dibuja un
 * enlace y aterriza en `/home?denied=…`.
 */

const FALLBACK_INPUTS: ClientPortalViewVisibilityInputs = {
  isInternalSession: false,
  moduleViewCodes: [],
  revokedViewCodes: []
}

const ClientPortalVisibilityContext = createContext<ClientPortalViewVisibilityInputs>(FALLBACK_INPUTS)

export const ClientPortalVisibilityProvider = ({
  inputs,
  children
}: {
  inputs: ClientPortalViewVisibilityInputs
  children: ReactNode
}) => (
  <ClientPortalVisibilityContext.Provider value={inputs}>{children}</ClientPortalVisibilityContext.Provider>
)

/**
 * Devuelve el predicado de visibilidad del portal cliente.
 *
 * Fuera del provider devuelve un predicado que niega todo salvo las vistas base — degradación
 * hacia cerrado. Es deliberado: el modo de fallo aceptable de un menú es que falte un ítem, no
 * que ofrezca superficies que la organización no contrató. Ese fallo se ve; el contrario
 * termina en un enlace que no lleva a ninguna parte, que es el defecto que esta task cierra.
 */
export const useClientPortalViewVisibility = (): ((viewCode: string) => boolean) => {
  const inputs = useContext(ClientPortalVisibilityContext)

  return useMemo(() => (viewCode: string) => canSeeClientPortalView(viewCode, inputs), [inputs])
}
