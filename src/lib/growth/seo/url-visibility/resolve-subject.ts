/**
 * TASK-1776 — Resolver de sujeto de visibilidad: la pieza que hace que URL, subdominio y
 * subcarpeta sean UNA capacidad y no tres.
 *
 * Semrush vende `url_research` / `subdomain_research` / `subfolder_research` como tres áreas;
 * en DataForSEO es el MISMO endpoint (`ranked_keywords`) con el `target` cambiado. Este módulo
 * decide `target` + filtros por clase de sujeto; el colector no sabe de qué clase se trata.
 *
 * 🔴 **La clase se DECLARA, jamás se infiere** (decisión de la task, OQ2): `ejemplo.cl/blog`
 * puede ser una subcarpeta o una URL exacta y ninguna heurística de trailing slash puede
 * adivinar la intención del operador. Un `kind` que no calza con la forma del sujeto es un
 * error explícito, no una corrección silenciosa.
 *
 * 🔴 **Gotcha del proveedor (doc oficial, verificado 2026-08-27):** una URL como `target` debe
 * ir CON esquema (`https://`) — sin él, el proveedor devuelve el dominio ENTERO y cobra las
 * filas igual. Por eso `providerTarget` y `normalized` son cosas distintas: la clave de la
 * tabla nunca lleva esquema; el target del proveedor lo lleva cuando la clase lo exige.
 *
 * La subcarpeta no tiene target nativo: se pide el HOST y se filtra server-side (gratis) por
 * `ranked_serp_element.serp_item.relative_url` — campo confirmado contra la doc oficial.
 */

import 'server-only'

/** Clases de sujeto (espeja el CHECK de la migración; un quinto valor rompe el INSERT). */
export type VisibilitySubjectKind = 'domain' | 'subdomain' | 'subfolder' | 'url'

export const VISIBILITY_SUBJECT_KINDS: readonly VisibilitySubjectKind[] = [
  'domain',
  'subdomain',
  'subfolder',
  'url'
]

export const isVisibilitySubjectKind = (value: unknown): value is VisibilitySubjectKind =>
  typeof value === 'string' && (VISIBILITY_SUBJECT_KINDS as readonly string[]).includes(value)

export interface ResolvedVisibilitySubject {
  kind: VisibilitySubjectKind
  /** Clave canónica de la tabla: sin esquema, host sin `www.` (salvo subdominio literal), sin trailing slash, sin query/fragment (salvo `url` con `keepQuery`). */
  normalized: string
  /** Lo que se manda al proveedor como `target` (URL exacta CON esquema; hosts pelados). */
  providerTarget: string
  /** Filtros server-side extra (subcarpeta). El colector los concatena a los suyos. */
  providerFilters: ReadonlyArray<readonly [string, string, string]> | null
  /** El texto tal como lo pidió el caller (trazabilidad; se persiste aparte). */
  raw: string
}

export type ResolveVisibilitySubjectResult =
  | { ok: true; subject: ResolvedVisibilitySubject }
  | {
      ok: false
      errorCode:
        | 'empty_subject'
        | 'invalid_kind'
        | 'unparseable_subject'
        /** La forma del sujeto no calza con la clase declarada (p. ej. `url` sin path). */
        | 'kind_shape_mismatch'
    }

const parseAsUrl = (raw: string): URL | null => {
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }
}

/** Path normalizado: sin trailing slash (salvo raíz), decodificación NO se toca (trazable). */
const normalizePath = (pathname: string): string => {
  if (!pathname || pathname === '/') return ''

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

/**
 * Resuelve un sujeto declarado a su clave canónica + target del proveedor.
 *
 * Reglas de normalización (declaradas y testeadas, no inferidas — Detailed Spec §2):
 * esquema descartado de la clave; `www.` descartado salvo que la clase sea `subdomain` (donde
 * el host es literal: quitar `www.` convertiría el subdominio en el dominio); host en
 * minúsculas; trailing slash removido; query/fragment descartados salvo `url` + `keepQuery`.
 */
export const resolveVisibilitySubject = (input: {
  subject: string
  kind: VisibilitySubjectKind | string
  /** Sólo aplica a `url`: conservar la query si el operador declara que distingue contenido. */
  keepQuery?: boolean
}): ResolveVisibilitySubjectResult => {
  const raw = input.subject?.trim() ?? ''

  if (!raw) return { ok: false, errorCode: 'empty_subject' }
  if (!isVisibilitySubjectKind(input.kind)) return { ok: false, errorCode: 'invalid_kind' }

  const parsed = parseAsUrl(raw)

  if (!parsed || !parsed.hostname) return { ok: false, errorCode: 'unparseable_subject' }

  const kind = input.kind
  const hostLower = parsed.hostname.toLowerCase()
  const path = normalizePath(parsed.pathname)
  const hasQuery = Boolean(parsed.search) || Boolean(parsed.hash)

  switch (kind) {
    case 'domain': {
      // Un dominio no lleva path: si lo trae, el caller quiso otra clase — error, no adivinanza.
      if (path || hasQuery) return { ok: false, errorCode: 'kind_shape_mismatch' }

      const host = hostLower.replace(/^www\./, '')

      return {
        ok: true,
        subject: { kind, normalized: host, providerTarget: host, providerFilters: null, raw }
      }
    }

    case 'subdomain': {
      if (path || hasQuery) return { ok: false, errorCode: 'kind_shape_mismatch' }

      // Host LITERAL: `www.` acá es un subdominio válido y quitarlo cambiaría el sujeto.
      // El proveedor pide el subdominio sin esquema.
      return {
        ok: true,
        subject: { kind, normalized: hostLower, providerTarget: hostLower, providerFilters: null, raw }
      }
    }

    case 'subfolder': {
      // Una subcarpeta ES host + path. Sin path no hay subcarpeta.
      if (!path) return { ok: false, errorCode: 'kind_shape_mismatch' }

      const host = hostLower.replace(/^www\./, '')

      return {
        ok: true,
        subject: {
          kind,
          normalized: `${host}${path}`,
          // No hay target nativo: se pide el host y se filtra server-side por la ruta (gratis).
          providerTarget: host,
          providerFilters: [['ranked_serp_element.serp_item.relative_url', 'like', `${path}%`]],
          raw
        }
      }
    }

    case 'url': {
      if (!path && !hasQuery) return { ok: false, errorCode: 'kind_shape_mismatch' }

      const host = hostLower.replace(/^www\./, '')
      const query = input.keepQuery === true ? parsed.search : ''

      return {
        ok: true,
        subject: {
          kind,
          normalized: `${host}${path}${query}`,
          // 🔴 CON esquema: sin él, el proveedor devuelve el dominio entero y lo cobra igual.
          providerTarget: `${parsed.protocol}//${parsed.hostname}${path || '/'}${query}`,
          providerFilters: null,
          raw
        }
      }
    }
  }
}
