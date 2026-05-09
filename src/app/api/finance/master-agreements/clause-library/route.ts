import { NextResponse } from 'next/server'

import {
  createClause,
  listClauseLibrary,
  MasterAgreementClauseValidationError
} from '@/lib/commercial/master-agreement-clauses-store'
import type {
  MasterAgreementClauseCategory,
  MasterAgreementClauseLanguage
} from '@/lib/commercial/master-agreements-types'
import {
  canAdministerPricingCatalog,
  requireCommercialTenantContext
} from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const ALLOWED_CATEGORIES: ReadonlySet<MasterAgreementClauseCategory> = new Set([
  'general',
  'payment',
  'privacy',
  'security',
  'ip',
  'sla',
  'legal'
])

const ALLOWED_LANGUAGES: ReadonlySet<MasterAgreementClauseLanguage> = new Set(['es', 'en'])

interface CreateClauseBody {
  clauseCode?: string
  category?: MasterAgreementClauseCategory
  title?: string
  summary?: string | null
  bodyTemplate?: string
  language?: MasterAgreementClauseLanguage
  version?: number
  defaultVariables?: Record<string, unknown>
  required?: boolean
  active?: boolean
  sortOrder?: number
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('includeInactive') === 'true'
  const languageParam = searchParams.get('language')
  const categoryParam = searchParams.get('category')

  const language =
    languageParam && ALLOWED_LANGUAGES.has(languageParam as MasterAgreementClauseLanguage)
      ? (languageParam as MasterAgreementClauseLanguage)
      : undefined

  const category =
    categoryParam && ALLOWED_CATEGORIES.has(categoryParam as MasterAgreementClauseCategory)
      ? (categoryParam as MasterAgreementClauseCategory)
      : undefined

  const items = await listClauseLibrary({
    activeOnly: !includeInactive,
    language,
    category
  })

  return NextResponse.json({ items, count: items.length })
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json(
      { error: 'Solo Finance Admin o Efeonce Admin pueden crear cláusulas.' },
      { status: 403 }
    )
  }

  let body: CreateClauseBody

  try {
    body = (await request.json()) as CreateClauseBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  if (!body.category || !ALLOWED_CATEGORIES.has(body.category)) {
    return NextResponse.json(
      { error: `category inválida. Debe ser: ${Array.from(ALLOWED_CATEGORIES).join(', ')}.` },
      { status: 400 }
    )
  }

  try {
    const clause = await createClause({
      clauseCode: body.clauseCode ?? '',
      category: body.category,
      title: body.title ?? '',
      summary: body.summary ?? null,
      bodyTemplate: body.bodyTemplate ?? '',
      language: body.language,
      version: body.version,
      defaultVariables: body.defaultVariables ?? {},
      required: body.required ?? false,
      active: body.active ?? true,
      sortOrder: body.sortOrder ?? 100,
      actorUserId: tenant.userId
    })

    return NextResponse.json(clause, { status: 201 })
  } catch (error) {
    if (error instanceof MasterAgreementClauseValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
