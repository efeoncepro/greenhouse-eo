import { redirect } from 'next/navigation'

import GreenhouseProjects from '@views/greenhouse/GreenhouseProjects'

import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  // TASK-827 Slice 4 — Page guard canónico resolver-based. Internal users (bypass D1) y
  // clientes con `cliente.proyectos` en su módulo set pasan; el resto va a
  // `/home?denied=proyectos`.
  //
  // Verificado en staging 2026-08-09: acá vivía además un gate legacy por route group que
  // mandaba a la página de no-autorizado, **encima** de esta llamada, pese a que el
  // comentario de al lado decía que el canónico lo reemplazaba. Al correr primero, ganaba —
  // y como el scope de route groups del operador interno no incluye el del portal cliente,
  // el bypass D1 de soporte nunca se alcanzaba: esta ruta rebotaba mientras las otras 8
  // páginas cliente abrían normal. Era la única de las 9 con ese resto: una migración
  // incompleta que quedó inconsistente entre páginas hermanas.
  //
  // **NUNCA** agregar un gate de route group encima de `requireViewCodeAccess`: el guard ya
  // cubre los dos tenant types (interno por bypass, cliente por módulo o vista base), y un
  // segundo gate que corre antes sólo puede contradecirlo. Fijado por
  // `src/lib/client-portal/guards/no-route-group-gate-above-view-code-guard.test.ts`.
  //
  // (El patrón exacto no se escribe acá a propósito: este archivo está dentro del árbol que
  // ese test escanea, y un gate que se detecta a sí mismo es ruido garantizado.)
  await requireViewCodeAccess('cliente.proyectos')

  return <GreenhouseProjects />
}
