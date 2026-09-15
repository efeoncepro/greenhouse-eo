/**
 * TASK-1845 — validación del encargo (`validateRequest`): shape, enums, ventana y
 * comparación. Sin zod: asserts tipados del dominio. El actor y su organización NO se
 * leen del payload — el caller ya los resolvió y aquí sólo se exige coherencia.
 */

import {
  INSIGHT_AUDIENCES,
  INSIGHT_COMPARISON_KINDS,
  INSIGHT_DEPTHS,
  INSIGHT_LOCALES,
  INSIGHT_MODULES,
  INSIGHT_OUTPUTS,
  INSIGHT_REQUEST_VERSION,
  type InsightAudience,
  type InsightComparisonV1,
  type InsightDepth,
  type InsightLocale,
  type InsightModule,
  type InsightOutput,
  type InsightRequestV1
} from '../contracts/request'
import { InsightsInputError } from '../errors'
import { type ResolvedInsightWindows, resolveInsightWindows } from '../window'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const assertString = (value: unknown, field: string, options: { min?: number; max?: number } = {}): string => {
  if (typeof value !== 'string') throw new InsightsInputError(`${field} debe ser texto`, { field })

  const trimmed = value.trim()

  if (options.min !== undefined && trimmed.length < options.min) throw new InsightsInputError(`${field} es demasiado corto`, { field, min: options.min })
  if (options.max !== undefined && trimmed.length > options.max) throw new InsightsInputError(`${field} es demasiado largo`, { field, max: options.max })

  return trimmed
}

const assertEnum = <T extends string>(value: unknown, field: string, allowed: readonly T[]): T => {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new InsightsInputError(`${field} debe ser uno de: ${allowed.join(', ')}`, { field, allowed })
  }

  return value as T
}

const assertEnumArray = <T extends string>(value: unknown, field: string, allowed: readonly T[]): T[] => {
  if (!Array.isArray(value) || value.length === 0) throw new InsightsInputError(`${field} debe ser una lista no vacía`, { field })

  const items = value.map(item => assertEnum(item, field, allowed))

  return [...new Set(items)]
}

export interface ValidatedInsightRequest {
  request: InsightRequestV1
  windows: ResolvedInsightWindows
}

export const validateInsightRequest = (
  raw: unknown,
  context: { organizationId: string; allowedAudiences: InsightAudience[]; now?: Date }
): ValidatedInsightRequest => {
  if (!isRecord(raw)) throw new InsightsInputError('El encargo debe ser un objeto')

  if (raw.requestVersion !== undefined && raw.requestVersion !== INSIGHT_REQUEST_VERSION) {
    throw new InsightsInputError(`requestVersion debe ser ${INSIGHT_REQUEST_VERSION}`, { field: 'requestVersion' })
  }

  if (raw.organizationId !== undefined && raw.organizationId !== context.organizationId) {
    // La org del encargo la fija la autoridad; un valor distinto en el payload es un intento de target.
    throw new InsightsInputError('organizationId no coincide con la organización autorizada', { field: 'organizationId' })
  }

  const modules = assertEnumArray<InsightModule>(raw.modules, 'modules', INSIGHT_MODULES)
  const outputs = assertEnumArray<InsightOutput>(raw.outputs, 'outputs', INSIGHT_OUTPUTS)
  const audience = assertEnum<InsightAudience>(raw.audience ?? 'client', 'audience', INSIGHT_AUDIENCES)

  if (!context.allowedAudiences.includes(audience)) {
    throw new InsightsInputError('audience no permitida para este actor', { field: 'audience', audience })
  }

  const locale = assertEnum<InsightLocale>(raw.locale ?? 'es-CL', 'locale', INSIGHT_LOCALES)
  const depth = assertEnum<InsightDepth>(raw.depth ?? 'standard', 'depth', INSIGHT_DEPTHS)

  if (!isRecord(raw.period)) throw new InsightsInputError('period es obligatorio', { field: 'period' })

  const period = {
    start: assertString(raw.period.start, 'period.start'),
    endExclusive: assertString(raw.period.endExclusive, 'period.endExclusive'),
    timeZone: assertString(raw.period.timeZone ?? 'America/Santiago', 'period.timeZone', { min: 3, max: 64 })
  }

  let comparison: InsightComparisonV1 = { kind: 'previous_period' }

  if (raw.comparison !== undefined) {
    if (!isRecord(raw.comparison)) throw new InsightsInputError('comparison debe ser un objeto', { field: 'comparison' })

    const kind = assertEnum(raw.comparison.kind, 'comparison.kind', INSIGHT_COMPARISON_KINDS)

    comparison =
      kind === 'custom'
        ? { kind, start: assertString(raw.comparison.start, 'comparison.start'), endExclusive: assertString(raw.comparison.endExclusive, 'comparison.endExclusive') }
        : { kind }
  }

  const windows = resolveInsightWindows(period, comparison, context.now)

  const brand = isRecord(raw.brand) ? raw.brand : {}
  const efeoncePackVersion = assertString(brand.efeoncePackVersion ?? 'axis-current', 'brand.efeoncePackVersion', { min: 1, max: 64 })
  const clientBrandRef = brand.clientBrandRef === undefined || brand.clientBrandRef === null ? null : assertString(brand.clientBrandRef, 'brand.clientBrandRef', { min: 1, max: 200 })

  const projectIds = raw.projectIds === undefined ? [] : Array.isArray(raw.projectIds) ? raw.projectIds.map(item => assertString(item, 'projectIds[]', { min: 1, max: 200 })) : null

  if (projectIds === null) throw new InsightsInputError('projectIds debe ser una lista', { field: 'projectIds' })

  const idempotencyKey = raw.idempotencyKey === undefined || raw.idempotencyKey === null ? undefined : assertString(raw.idempotencyKey, 'idempotencyKey', { min: 8, max: 200 })
  const policy = isRecord(raw.policy) ? { allowPartial: raw.policy.allowPartial === true } : undefined
  const title = raw.title === undefined ? undefined : assertString(raw.title, 'title', { min: 3, max: 200 })
  const purpose = raw.purpose === undefined ? undefined : assertString(raw.purpose, 'purpose', { min: 3, max: 500 })

  return {
    request: {
      requestVersion: INSIGHT_REQUEST_VERSION,
      organizationId: context.organizationId,
      projectIds,
      modules,
      period,
      comparison,
      audience,
      locale,
      depth,
      outputs,
      brand: { efeoncePackVersion, clientBrandRef },
      policy,
      idempotencyKey,
      title,
      purpose
    },
    windows
  }
}
