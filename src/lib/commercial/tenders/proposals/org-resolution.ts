import 'server-only'

/**
 * TASK-1399 — Resolución de organizaciones para el Proposal Studio.
 *
 * ¿Por qué existe? Porque las rutas reciben `ownerOrgId` como parámetro (se lo pasa la UI, que lo
 * tiene), pero un AGENTE no puede conocer un UUID — y dejar que el LLM lo *proponga* sería peor que
 * incómodo: sería una superficie de ataque (proponer el UUID de otra organización y confiar en que el
 * gate lo atrape). La doctrina del runtime gobernado es explícita: **la identidad sale de la sesión,
 * nunca del modelo**. Entonces:
 *
 *   · La org DUEÑA (`ownerOrgId`) se DERIVA del entitlement: es la organización que tiene contratado
 *     el módulo `proposal_studio_v1`. Nadie la propone.
 *   · La org CLIENTE se resuelve POR NOMBRE ("SKY", "Aguas Andinas") contra el catálogo canónico de
 *     organizaciones, fail-closed: cero coincidencias → no inventa; varias → pregunta cuál.
 *
 * Vive en el dominio (no en Nexa) porque es la MISMA resolución que necesita cualquier consumer —
 * una UI de "nueva propuesta" con un autocomplete de cliente resuelve exactamente esto.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { ProposalInputError } from './errors'
import { PROPOSAL_STUDIO_MODULE_KEY } from './authz'

export interface ProposalStudioOrg {
  organizationId: string
  organizationName: string
}

/** Ninguna org tiene el módulo contratado, o hay más de una y no se puede desambiguar sola. */
export class ProposalOrgResolutionError extends Error {
  readonly candidates: ProposalStudioOrg[]

  constructor(message: string, candidates: ProposalStudioOrg[] = []) {
    super(message)
    this.name = 'ProposalOrgResolutionError'
    this.candidates = candidates
  }
}

/**
 * Las orgs que TIENEN contratado el Proposal Studio. Hoy es una (Efeonce), pero el modelo ASaaS
 * permite que mañana sean varias — por eso devuelve la lista y el caller decide, en vez de asumir.
 */
export const listProposalStudioOrgs = async (): Promise<ProposalStudioOrg[]> => {
  const rows = await runGreenhousePostgresQuery<{ organization_id: string; organization_name: string }>(
    `SELECT o.organization_id, o.organization_name
       FROM greenhouse_client_portal.module_assignments ma
       JOIN greenhouse_core.organizations o ON o.organization_id = ma.organization_id
      WHERE ma.module_key = $1
        AND ma.effective_to IS NULL
        AND ma.status IN ('active', 'pilot')
        AND (ma.expires_at IS NULL OR ma.expires_at > now())
      ORDER BY o.organization_name`,
    [PROPOSAL_STUDIO_MODULE_KEY]
  )

  return rows.map(row => ({ organizationId: row.organization_id, organizationName: row.organization_name }))
}

/**
 * La org dueña, derivada del entitlement. Fail-closed en los dos extremos:
 *   · 0 orgs → el módulo no está contratado en ningún lado: no hay nada que operar.
 *   · >1 org → ambigüedad REAL: no se elige una al azar, se pide que la nombren.
 */
export const resolveProposalStudioOwnerOrg = async (): Promise<ProposalStudioOrg> => {
  const orgs = await listProposalStudioOrgs()

  if (orgs.length === 0) {
    throw new ProposalOrgResolutionError('Ninguna organización tiene contratado el Proposal Studio.')
  }

  if (orgs.length > 1) {
    throw new ProposalOrgResolutionError(
      `Hay más de una organización con Proposal Studio (${orgs.map(o => o.organizationName).join(', ')}). Dime cuál.`,
      orgs
    )
  }

  return orgs[0]!
}

/**
 * La org CLIENTE, por nombre. Fail-closed: no crea organizaciones ni adivina.
 * Exacta (case-insensitive) primero; si no, coincidencia parcial ÚNICA. Cero o varias → error con
 * los candidatos, para que el humano (no el modelo) decida.
 */
export const resolveClientOrganizationByName = async (rawName: string): Promise<ProposalStudioOrg> => {
  const name = rawName.trim()

  if (name.length < 2) {
    throw new ProposalInputError('El nombre del cliente es obligatorio (al menos 2 caracteres).')
  }

  const rows = await runGreenhousePostgresQuery<{
    organization_id: string
    organization_name: string
    exact: boolean
  }>(
    `SELECT organization_id,
            organization_name,
            (lower(organization_name) = lower($1)) AS exact
       FROM greenhouse_core.organizations
      WHERE active IS TRUE
        AND (lower(organization_name) = lower($1) OR organization_name ILIKE '%' || $1 || '%')
      ORDER BY exact DESC, organization_name
      LIMIT 10`,
    [name]
  )

  const exact = rows.filter(row => row.exact)

  // Una coincidencia exacta gana sobre cualquier parcial (evita que "Sky" quede ambiguo por "Skyline").
  if (exact.length === 1) {
    return { organizationId: exact[0]!.organization_id, organizationName: exact[0]!.organization_name }
  }

  if (rows.length === 0) {
    throw new ProposalOrgResolutionError(
      `No encuentro una organización llamada "${name}". Créala primero o dime el nombre exacto.`
    )
  }

  if (rows.length > 1) {
    throw new ProposalOrgResolutionError(
      `Hay varias organizaciones que coinciden con "${name}": ${rows.map(r => r.organization_name).join(', ')}. ¿Cuál es?`,
      rows.map(row => ({ organizationId: row.organization_id, organizationName: row.organization_name }))
    )
  }

  return { organizationId: rows[0]!.organization_id, organizationName: rows[0]!.organization_name }
}
