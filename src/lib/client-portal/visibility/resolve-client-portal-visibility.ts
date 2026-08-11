import 'server-only'

import { resolveClientPortalModulesForOrganization } from '@/lib/client-portal/readers/native/module-resolver'

import {
  canSeeClientPortalView,
  type ClientPortalViewVisibilityInputs
} from './client-portal-view-visibility'
import { resolvePersonRevokedViewCodes } from './person-view-revocations'

/**
 * TASK-1685 Slice 2 — Adaptador server del primitive de visibilidad.
 *
 * Consigue los insumos contra PG y se los da al primitive puro
 * (`canSeeClientPortalView`). Es el ÚNICO lugar que sabe de dónde salen: el page guard, el
 * layout que alimenta al menú y la señal de divergencia lo consumen y ninguno vuelve a
 * resolver por su cuenta.
 *
 * **Los dos insumos se piden en paralelo** porque son independientes y ambos están cacheados
 * 60s: en el hot path de un page load, el caso normal es dos cache hits.
 *
 * **NUNCA** llamar a `resolveClientPortalModulesForOrganization` o a
 * `resolvePersonRevokedViewCodes` sueltos para decidir visibilidad. Sirven para otras
 * preguntas (listar módulos contratados, auditar overrides); la pregunta *"¿puede ver esta
 * vista?"* pasa por acá.
 */

export interface ClientPortalVisibilitySubject {
  readonly userId: string | null | undefined
  readonly organizationId: string | null | undefined
  readonly isInternalSession: boolean
}

/**
 * Resuelve los insumos de visibilidad de una sesión.
 *
 * Para una sesión interna corta antes de tocar PG: el bypass D1 gana sobre todo lo demás, así
 * que consultar módulos y revocaciones sería trabajo cuyo resultado nadie mira.
 *
 * Un `organizationId` nulo produce `moduleViewCodes: []`. **Eso NO significa "permitir"**: el
 * caller tiene que tratar la falta de organización como falta de contexto y terminar el flujo
 * — el page guard lo hace antes de llegar acá, y la señal
 * `identity.client_portal.client_without_organization` cuenta a quienes están en ese estado.
 */
export const resolveClientPortalVisibilityInputs = async (
  subject: ClientPortalVisibilitySubject
): Promise<ClientPortalViewVisibilityInputs> => {
  if (subject.isInternalSession) {
    return { isInternalSession: true, moduleViewCodes: [], revokedViewCodes: [] }
  }

  const [modules, revokedViewCodes] = await Promise.all([
    subject.organizationId
      ? resolveClientPortalModulesForOrganization(subject.organizationId)
      : Promise.resolve([]),
    subject.userId ? resolvePersonRevokedViewCodes(subject.userId) : Promise.resolve([] as readonly string[])
  ])

  return {
    isInternalSession: false,
    moduleViewCodes: modules.flatMap(module => module.viewCodes),
    revokedViewCodes
  }
}

/**
 * `true` si esta persona puede abrir esta vista del portal cliente.
 *
 * Es la forma que consume el page guard. Puede lanzar: un fallo del resolver de módulos o del
 * reader de revocaciones se propaga para que el caller degrade **hacia cerrado** con evidencia
 * observable, nunca hacia abierto.
 */
export const canOpenClientPortalView = async (
  viewCode: string,
  subject: ClientPortalVisibilitySubject
): Promise<boolean> => {
  const inputs = await resolveClientPortalVisibilityInputs(subject)

  return canSeeClientPortalView(viewCode, inputs)
}
