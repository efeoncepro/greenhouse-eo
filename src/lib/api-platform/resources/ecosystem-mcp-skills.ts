import 'server-only'

import { createHash } from 'node:crypto'

import type { ApiPlatformRequestContext, ApiPlatformSuccessResult } from '@/lib/api-platform/core/context'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { isApiPlatformConditionalMatch } from '@/lib/api-platform/core/freshness'
import {
  getGreenhouseMcpSkillCatalog,
  listGreenhouseMcpSkills,
  readGreenhouseMcpSkill,
  resolveGreenhouseMcpSkillAudiences,
  type GreenhouseMcpSkillCatalog,
  type GreenhouseMcpSkillSummary
} from '@/mcp/greenhouse/skill-catalog'
import { GREENHOUSE_MCP_SKILL_NAME_PATTERN } from '@/mcp/greenhouse/skill-manifest'

/**
 * TASK-1804 — Lane ecosystem de los manuales de uso de la superficie MCP.
 *
 * Tres consumidores, un primitive: la tool interna `get_greenhouse_skill`, el recurso
 * `skill://efeonce/<name>/SKILL.md` y el gateway federado leen ESTA lane, y esta lane lee el
 * catálogo canónico (`skill-catalog.ts`). Acá no hay lógica de manual: sólo gating por binding,
 * freshness y el contrato de respuesta.
 *
 * Gating: la audiencia se deriva del binding del lane, igual que el resto del carril ecosystem.
 * Un manual `internal` sólo existe para bindings de scope `internal`; para cualquier otro binding
 * NO aparece en el catálogo y su detalle responde `404` anti-oráculo — nunca `403`, porque un 403
 * confirma que hay algo que no se puede leer. Inexistente y no visible son indistinguibles.
 *
 * El contenido es estático y versionado en git, igual para todos los consumidores: lo que varía
 * por binding es QUÉ SUBCONJUNTO se lista, nunca el cuerpo.
 */

export type EcosystemMcpSkillCatalogPayload = {
  skills: GreenhouseMcpSkillSummary[]
  /** Cuenta EXACTA de lo visible: el smoke de producción la compara contra el manifiesto, no `≥ 1`. */
  count: number
}

export type EcosystemMcpSkillPayload = GreenhouseMcpSkillSummary & {
  contentHash: string
  /** El manual completo, verbatim, con su frontmatter. */
  body: string
}

/** Estático y versionado: cacheable por el consumidor, revalidable barato por ETag. */
const SKILL_CACHE_CONTROL = 'private, max-age=300, must-revalidate'

const quoteEtag = (hash: string): string => `"${hash.slice(0, 32)}"`

export const getEcosystemMcpSkillCatalogPayload = async ({
  context,
  request,
  catalog = getGreenhouseMcpSkillCatalog()
}: {
  context: ApiPlatformRequestContext
  request: Request
  catalog?: GreenhouseMcpSkillCatalog
}): Promise<ApiPlatformSuccessResult<EcosystemMcpSkillCatalogPayload>> => {
  const audiences = resolveGreenhouseMcpSkillAudiences(context.binding.greenhouseScopeType)
  const skills = listGreenhouseMcpSkills(catalog, audiences)

  // El ETag del catálogo visible depende del subconjunto Y del contenido: un binding distinto
  // nunca revalida contra el ETag de otro.
  const etag = quoteEtag(
    createHash('sha256')
      .update(`${catalog.catalogHash}:${skills.map(skill => skill.name).join(',')}`)
      .digest('hex')
  )

  return {
    data: { skills, count: skills.length },
    meta: {
      module: 'mcp.skills',
      freshness: {
        etag,
        lastModified: null,
        source: 'greenhouse_mcp_skill_manifest',
        conditionalRequests: ['If-None-Match'],
        policy: 'manuals are static and versioned in git; they change only with a deploy'
      }
    },
    cacheControl: SKILL_CACHE_CONTROL,
    etag,
    notModified: isApiPlatformConditionalMatch({ request, etag })
  }
}

export const getEcosystemMcpSkillPayload = async ({
  context,
  request,
  name,
  catalog = getGreenhouseMcpSkillCatalog()
}: {
  context: ApiPlatformRequestContext
  request: Request
  name: string
  catalog?: GreenhouseMcpSkillCatalog
}): Promise<ApiPlatformSuccessResult<EcosystemMcpSkillPayload>> => {
  const audiences = resolveGreenhouseMcpSkillAudiences(context.binding.greenhouseScopeType)
  const normalized = name.trim()

  // Un nombre con forma inválida tampoco existe: mismo 404 que un manual no visible, para que
  // el formato del identificador no filtre nada sobre el catálogo.
  const skill = GREENHOUSE_MCP_SKILL_NAME_PATTERN.test(normalized)
    ? readGreenhouseMcpSkill(catalog, normalized, audiences)
    : null

  if (!skill) {
    throw new ApiPlatformError('MCP skill not found for the resolved scope.', {
      statusCode: 404,
      errorCode: 'not_found'
    })
  }

  const etag = quoteEtag(skill.contentHash)

  return {
    data: {
      name: skill.name,
      description: skill.description,
      audience: skill.audience,
      appliesTo: skill.appliesTo,
      uri: skill.uri,
      contentHash: skill.contentHash,
      body: skill.body
    },
    meta: {
      module: 'mcp.skills',
      freshness: {
        etag,
        lastModified: null,
        source: 'greenhouse_mcp_skill_manifest',
        conditionalRequests: ['If-None-Match'],
        policy: 'manuals are static and versioned in git; they change only with a deploy'
      }
    },
    cacheControl: SKILL_CACHE_CONTROL,
    etag,
    notModified: isApiPlatformConditionalMatch({ request, etag })
  }
}
