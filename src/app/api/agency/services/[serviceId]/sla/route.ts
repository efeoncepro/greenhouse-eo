import { NextResponse } from 'next/server'

import {
  getServiceSlaComplianceReport,
  refreshServiceSlaCompliance
} from '@/lib/agency/sla-compliance'
import {
  SERVICE_SLA_COMPARISON_MODES,
  SERVICE_SLA_INDICATOR_CODES,
  SERVICE_SLA_UNITS,
  type UpsertServiceSlaDefinitionInput
} from '@/types/service-sla'
import {
  deleteServiceSlaDefinition,
  ServiceSlaValidationError,
  upsertServiceSlaDefinition
} from '@/lib/services/service-sla-store'
import { requireAdminTenantContext, requireAgencyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

type RouteParams = Promise<{ serviceId: string }>

const getString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const getNullableString = (value: unknown) => {
  const normalized = getString(value)

  return normalized || null
}

const getNumber = (value: unknown, field: string) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) return parsed
  }

  throw new ServiceSlaValidationError(`${field} debe ser numérico.`)
}

const readJsonBody = async (request: Request) => {
  try {
    return await request.json()
  } catch {
    throw new ServiceSlaValidationError('JSON inválido.')
  }
}

const readOptionalJsonBody = async (request: Request) => {
  const contentLength = request.headers.get('content-length')

  if (contentLength === '0') {
    return {}
  }

  try {
    return await request.json()
  } catch {
    return {}
  }
}

const readSpaceIdFromRequest = (request: Request, body?: Record<string, unknown>) => {
  const url = new URL(request.url)
  const fromQuery = url.searchParams.get('spaceId')
  const fromBody = body ? getNullableString(body.spaceId) : null
  const spaceId = fromQuery?.trim() || fromBody

  if (!spaceId) {
    throw new ServiceSlaValidationError('spaceId es requerido.')
  }

  return spaceId
}

const readDefinitionInput = (body: Record<string, unknown>): UpsertServiceSlaDefinitionInput => {
  const indicatorCode = getString(body.indicatorCode) as UpsertServiceSlaDefinitionInput['indicatorCode']
  const comparisonMode = getString(body.comparisonMode) as UpsertServiceSlaDefinitionInput['comparisonMode']
  const unit = getString(body.unit) as UpsertServiceSlaDefinitionInput['unit']

  if (!SERVICE_SLA_INDICATOR_CODES.includes(indicatorCode)) {
    throw new ServiceSlaValidationError('indicatorCode no es válido.')
  }

  if (!SERVICE_SLA_COMPARISON_MODES.includes(comparisonMode)) {
    throw new ServiceSlaValidationError('comparisonMode no es válido.')
  }

  if (!SERVICE_SLA_UNITS.includes(unit)) {
    throw new ServiceSlaValidationError('unit no es válido.')
  }

  return {
    definitionId: getNullableString(body.definitionId) ?? undefined,
    indicatorCode,
    indicatorFormula: getString(body.indicatorFormula),
    measurementSource: getString(body.measurementSource),
    comparisonMode,
    unit,
    sliLabel: getNullableString(body.sliLabel),
    sloTargetValue: getNumber(body.sloTargetValue, 'sloTargetValue'),
    slaTargetValue: getNumber(body.slaTargetValue, 'slaTargetValue'),
    breachThreshold: body.breachThreshold === null || body.breachThreshold === undefined
      ? null
      : getNumber(body.breachThreshold, 'breachThreshold'),
    warningThreshold: body.warningThreshold === null || body.warningThreshold === undefined
      ? undefined
      : getNumber(body.warningThreshold, 'warningThreshold'),
    displayOrder: body.displayOrder === undefined ? undefined : getNumber(body.displayOrder, 'displayOrder'),
    active: typeof body.active === 'boolean' ? body.active : undefined
  }
}

const handleRouteError = (error: unknown) => {
  if (error instanceof ServiceSlaValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'No se pudo procesar el contrato SLA del servicio.' },
    { status: 500 }
  )
}

export async function GET(request: Request, { params }: { params: RouteParams }) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { serviceId } = await params
    const url = new URL(request.url)
    const spaceId = readSpaceIdFromRequest(request)
    const shouldRefresh = url.searchParams.get('refresh') !== '0'

    const report = shouldRefresh
      ? await refreshServiceSlaCompliance({ serviceId, spaceId, emitStatusChangeEvents: false })
      : await getServiceSlaComplianceReport({ serviceId, spaceId })

    return NextResponse.json(report)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: Request, { params }: { params: RouteParams }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { serviceId } = await params
    const body = (await readJsonBody(request)) as Record<string, unknown>
    const spaceId = readSpaceIdFromRequest(request, body)

    const definition = await upsertServiceSlaDefinition({
      serviceId,
      spaceId,
      actorUserId: tenant.userId,
      input: readDefinitionInput(body)
    })

    const report = await refreshServiceSlaCompliance({ serviceId, spaceId })

    return NextResponse.json({ definition, report })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: Request, context: { params: RouteParams }) {
  return POST(request, context)
}

export async function PUT(request: Request, context: { params: RouteParams }) {
  return POST(request, context)
}

export async function DELETE(request: Request, { params }: { params: RouteParams }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { serviceId } = await params

    const body = (await readOptionalJsonBody(request)) as Record<string, unknown>

    const spaceId = readSpaceIdFromRequest(request, body)
    const url = new URL(request.url)
    const definitionId = url.searchParams.get('definitionId')?.trim() || getString(body.definitionId)

    if (!definitionId) {
      throw new ServiceSlaValidationError('definitionId es requerido.')
    }

    await deleteServiceSlaDefinition({
      serviceId,
      spaceId,
      definitionId,
      actorUserId: tenant.userId
    })

    const report = await refreshServiceSlaCompliance({ serviceId, spaceId })

    return NextResponse.json({ deleted: true, definitionId, report })
  } catch (error) {
    return handleRouteError(error)
  }
}
