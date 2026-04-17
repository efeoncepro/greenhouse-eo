import { NextResponse } from 'next/server'

import {
  createTerm,
  listTerms,
  TermValidationError
} from '@/lib/commercial/governance/terms-store'
import {
  TERM_CATEGORIES,
  type QuotationPricingModel,
  type TermCategory
} from '@/lib/commercial/governance/contracts'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ROLE_CODES } from '@/config/role-codes'

export const dynamic = 'force-dynamic'

const requireAdmin = (roleCodes: string[]) =>
  roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN) || roleCodes.includes(ROLE_CODES.FINANCE_ADMIN)

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const categoryParam = searchParams.get('category')
  const includeInactive = searchParams.get('includeInactive') === 'true'

  const category =
    categoryParam && TERM_CATEGORIES.includes(categoryParam as TermCategory)
      ? (categoryParam as TermCategory)
      : undefined

  const items = await listTerms({
    activeOnly: !includeInactive,
    category
  })

  return NextResponse.json({ items, total: items.length })
}

interface CreateTermBody {
  termCode?: string
  category?: TermCategory
  title?: string
  bodyTemplate?: string
  appliesToModel?: QuotationPricingModel | null
  defaultForBl?: string[]
  required?: boolean
  sortOrder?: number
  active?: boolean
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!requireAdmin(tenant.roleCodes)) {
    return NextResponse.json(
      { error: 'Solo Finance Admin o Efeonce Admin pueden crear términos.' },
      { status: 403 }
    )
  }

  let body: CreateTermBody

  try {
    body = (await request.json()) as CreateTermBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  if (!body.category || !TERM_CATEGORIES.includes(body.category)) {
    return NextResponse.json(
      { error: `category inválida. Debe ser: ${TERM_CATEGORIES.join(', ')}.` },
      { status: 400 }
    )
  }

  try {
    const term = await createTerm({
      termCode: body.termCode ?? '',
      category: body.category,
      title: body.title ?? '',
      bodyTemplate: body.bodyTemplate ?? '',
      appliesToModel: body.appliesToModel ?? null,
      defaultForBl: body.defaultForBl ?? [],
      required: body.required ?? false,
      sortOrder: body.sortOrder ?? 100,
      active: body.active ?? true,
      createdBy: tenant.userId
    })

    return NextResponse.json(term, { status: 201 })
  } catch (error) {
    if (error instanceof TermValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
