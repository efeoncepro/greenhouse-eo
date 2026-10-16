/**
 * Lógica pura del snapshot GTM (ADR GREENHOUSE_MEASUREMENT_TAGGING_DEPLOYMENT_DECISION_V1).
 *
 * Normaliza la versión LIVE de cada container a un JSON estable y diffable, y TAPA los
 * secretos antes de que toquen el disco: el valor de un parámetro sensible se reemplaza
 * por una huella `sha256` truncada. La huella cambia si el secreto rota (el drift se ve)
 * sin exponer nunca el valor. Sin red ni auth: eso vive en `snapshot.ts`.
 */

import { createHash } from 'node:crypto'

export interface GtmSnapshotTarget {
  /** Nombre corto y estable, usado en logs y en la señal de drift. */
  key: 'web' | 'server'
  publicId: string
  /** `accounts/{accountId}/containers/{containerId}` */
  containerPath: string
  snapshotPath: string
}

export const GTM_SNAPSHOT_TARGETS: readonly GtmSnapshotTarget[] = [
  {
    key: 'web',
    publicId: 'GTM-NGHPGRLZ',
    containerPath: 'accounts/6291647045/containers/218104216',
    snapshotPath: 'docs/reference/measurement-gtm-ga4/container-snapshot.json'
  },
  {
    key: 'server',
    publicId: 'GTM-K2X4ZTTK',
    containerPath: 'accounts/6068297031/containers/191286361',
    snapshotPath: 'docs/reference/measurement-gtm-ga4/server-container-snapshot.json'
  }
]

const VOLATILE = new Set([
  'fingerprint', 'path', 'tagManagerUrl', 'monitoringMetadata', 'accountId', 'containerId',
  'workspaceId', 'tagId', 'triggerId', 'variableId', 'containerVersionId', 'formatValue',
  'clientId', 'transformationId', 'templateId'
])

/** Parámetros cuyo NOMBRE delata un secreto (apiAccessToken, apiSecret, password…). */
const SENSITIVE_KEY = /(token|secret|password|passwd|api_?key|access_?key|credential|private_?key)/i

/** Valores con FORMA de credencial aunque el parámetro tenga un nombre inocente. */
const SECRET_SHAPED_VALUE = /^(EAA[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{30,}|ya29\.[A-Za-z0-9._-]{20,})$/

/** Una referencia a variable (`{{Meta CAPI token}}`) no es un secreto: se conserva tal cual. */
const VARIABLE_REFERENCE = /^\{\{[^{}]+\}\}$/

export const fingerprintSecret = (value: string): string =>
  `[redacted sha256:${createHash('sha256').update(value).digest('hex').slice(0, 12)}]`

const isLiteralSecret = (key: unknown, value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && !VARIABLE_REFERENCE.test(value) &&
  ((typeof key === 'string' && SENSITIVE_KEY.test(key)) || SECRET_SHAPED_VALUE.test(value))

export interface RedactionReport {
  /** `container/coleccion/nombre → parametro` de cada valor tapado, para el log. */
  redacted: string[]
}

const strip = (obj: unknown, where: string, report: RedactionReport): unknown => {
  if (Array.isArray(obj)) return obj.map(item => strip(item, where, report))

  if (obj && typeof obj === 'object') {
    const record = obj as Record<string, unknown>
    const out: Record<string, unknown> = {}

    for (const [k, v] of Object.entries(record)) {
      if (VOLATILE.has(k)) continue

      if (k === 'value' && isLiteralSecret(record.key, v)) {
        out[k] = fingerprintSecret(v)
        report.redacted.push(`${where} → ${String(record.key ?? '(sin key)')}`)
        continue
      }

      out[k] = strip(v, where, report)
    }

    return out
  }

  // Un string suelto con forma de credencial (fuera de un parámetro key/value) también se tapa.
  if (typeof obj === 'string' && SECRET_SHAPED_VALUE.test(obj)) {
    report.redacted.push(`${where} → (valor suelto)`)

    return fingerprintSecret(obj)
  }

  return obj
}

const byName = (a: { name?: string }, b: { name?: string }) => (a.name ?? '').localeCompare(b.name ?? '')

type Live = Record<string, unknown> & { name?: string }

const collection = (live: Live, field: string, label: string, report: RedactionReport) =>
  ((live[field] as Array<{ name?: string }> | undefined) ?? [])
    .map(item => strip(item, `${label}/${item.name ?? '?'}`, report) as { name?: string })
    .sort(byName)

/**
 * Las plantillas personalizadas traen su código entero (`templateData`): se guarda su huella,
 * no el código — basta para detectar que cambió y mantiene el snapshot legible.
 */
const templates = (live: Live, report: RedactionReport) =>
  ((live.customTemplate as Array<Record<string, unknown>> | undefined) ?? [])
    .map(t => {
      const { templateData, ...rest } = t
      const base = strip(rest, `customTemplate/${String(t.name ?? '?')}`, report) as Record<string, unknown> & { name?: string }

      return {
        ...base,
        name: base.name,
        templateDataSha256: typeof templateData === 'string'
          ? createHash('sha256').update(templateData).digest('hex')
          : null
      }
    })
    .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')))

export const normalizeLiveVersion = (live: Live, report: RedactionReport = { redacted: [] }) => ({
  name: live.name ?? null,
  tags: collection(live, 'tag', 'tag', report),
  triggers: collection(live, 'trigger', 'trigger', report),
  variables: collection(live, 'variable', 'variable', report),
  clients: collection(live, 'client', 'client', report),
  transformations: collection(live, 'transformation', 'transformation', report),
  customTemplates: templates(live, report),
  builtInVariables: ((live.builtInVariable as Array<{ type: string }> | undefined) ?? []).map(v => v.type).sort()
})

export type NormalizedSnapshot = ReturnType<typeof normalizeLiveVersion>

export const serializeSnapshot = (snapshot: NormalizedSnapshot): string => JSON.stringify(snapshot, null, 2) + '\n'

const DIFFABLE = ['tags', 'triggers', 'variables', 'clients', 'transformations', 'customTemplates'] as const

/** Resumen humano del drift: qué se agregó, quitó o cambió, por colección y por nombre. */
export const describeDrift = (committed: Partial<NormalizedSnapshot>, live: NormalizedSnapshot): string[] => {
  const lines: string[] = []

  if ((committed.name ?? null) !== live.name) lines.push(`versión: «${committed.name ?? '—'}» → «${live.name ?? '—'}»`)

  for (const field of DIFFABLE) {
    const before = new Map(((committed[field] ?? []) as Array<{ name?: string }>).map(i => [i.name ?? '?', JSON.stringify(i)]))
    const after = new Map((live[field] as Array<{ name?: string }>).map(i => [i.name ?? '?', JSON.stringify(i)]))

    for (const name of after.keys()) {
      if (!before.has(name)) lines.push(`${field}: + ${name}`)
      else if (before.get(name) !== after.get(name)) lines.push(`${field}: ~ ${name}`)
    }

    for (const name of before.keys()) if (!after.has(name)) lines.push(`${field}: - ${name}`)
  }

  const builtBefore = new Set(committed.builtInVariables ?? [])
  const builtAfter = new Set(live.builtInVariables)

  for (const v of builtAfter) if (!builtBefore.has(v)) lines.push(`builtInVariables: + ${v}`)
  for (const v of builtBefore) if (!builtAfter.has(v)) lines.push(`builtInVariables: - ${v}`)

  return lines
}
