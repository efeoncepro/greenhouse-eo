import 'server-only'

import { query } from '@/lib/db'

/**
 * TASK-768 — Identity lookup helpers para el resolver de economic_category.
 *
 * IMPORTANTE: RUT NO está en `greenhouse_core.members` directamente — vive en
 * `greenhouse_core.organizations.tax_id` (con `tax_id_type` = 'cl_rut_natural'
 * para personas naturales) y se vincula al profile via
 * `greenhouse_core.person_legal_entity_relationships`. Estos helpers
 * encapsulan ese join multi-tabla para que el resolver no tenga que
 * conocer la topología.
 */

const CHILEAN_RUT_REGEX = /\b\d{1,2}\.\d{3}\.\d{3}-[0-9kK]\b/g

/**
 * Extrae todos los RUTs chilenos de un texto libre (ej. description de
 * bank statement: "Transf.Internet a 27.836.817-3").
 *
 * Retorna array vacío si no encuentra. Normaliza a uppercase (DV K → K).
 *
 * IMPORTANTE: RUT es identificador chileno. Colaboradores y proveedores
 * NO chilenos (Daniela España, Andrés Colombia, Melkin Nicaragua, vendors
 * SaaS internacionales) NO tendrán match aquí. Esos casos se resuelven via:
 *   - Rule 4 (lookupMemberByDisplayName) si están registrados en members
 *     con employment_type='international' o 'contractor' o 'deel_managed'.
 *   - Rule 5 (lookupKnownPayrollVendor regex) cuando el pago va via Deel,
 *     Remote, Velocity Global, Global66, etc.
 *   - Rule 9 (ambiguous fallback → manual queue) si nada matchea.
 *
 * Esto NO es bug — es feature. La taxonomía de identidad es local-aware.
 */
export const extractRutsFromText = (text: string | null | undefined): string[] => {
  if (!text) return []

  const matches = text.match(CHILEAN_RUT_REGEX) ?? []

  return matches.map(rut => rut.toUpperCase())
}

interface MemberLookupRow {
  member_id: string
  identity_profile_id: string
  display_name: string
  employment_type: string | null
  primary_email: string | null
  active: boolean
  payroll_via: string | null
  deel_contract_id: string | null
  [key: string]: unknown
}

export interface ResolvedMember {
  memberId: string
  identityProfileId: string
  displayName: string
  employmentType: string | null
  primaryEmail: string | null
  active: boolean
  payrollVia: string | null
  deelContractId: string | null
}

const normalizeMember = (row: MemberLookupRow): ResolvedMember => ({
  memberId: row.member_id,
  identityProfileId: row.identity_profile_id,
  displayName: row.display_name,
  employmentType: row.employment_type,
  primaryEmail: row.primary_email,
  active: row.active,
  payrollVia: row.payroll_via,
  deelContractId: row.deel_contract_id
})

/**
 * Lookup member por RUT chileno — chain canónica:
 *   organizations.tax_id (tax_id_type='cl_rut_natural')
 *   → person_legal_entity_relationships (vínculo profile↔organization)
 *   → identity_profiles
 *   → members
 *
 * Retorna null si:
 *   - RUT no existe en organizations
 *   - profile asociado no es persona natural activa
 *   - profile no tiene member asociado (es solo persona, no colaborador)
 */
export const lookupMemberByRut = async (rut: string): Promise<ResolvedMember | null> => {
  const normalized = rut.trim().toUpperCase()

  if (!CHILEAN_RUT_REGEX.test(normalized)) return null

  const rows = await query<MemberLookupRow>(
    `SELECT m.member_id, m.identity_profile_id, m.display_name, m.employment_type,
            m.primary_email, m.active, m.payroll_via, m.deel_contract_id
       FROM greenhouse_core.organizations o
       JOIN greenhouse_core.person_legal_entity_relationships pler
         ON pler.organization_id = o.organization_id
       JOIN greenhouse_core.members m
         ON m.identity_profile_id = pler.profile_id
      WHERE o.tax_id = $1
        AND COALESCE(o.tax_id_type, '') IN ('cl_rut_natural', 'cl_rut_persona_natural', 'cl_rut')
        AND m.active = TRUE
      LIMIT 1`,
    [normalized]
  )

  return rows[0] ? normalizeMember(rows[0]) : null
}

/**
 * Lookup member por email — busca en `primary_email` y en `email_aliases` array.
 */
export const lookupMemberByEmail = async (email: string): Promise<ResolvedMember | null> => {
  const normalized = email.trim().toLowerCase()

  if (!normalized || !normalized.includes('@')) return null

  const rows = await query<MemberLookupRow>(
    `SELECT m.member_id, m.identity_profile_id, m.display_name, m.employment_type,
            m.primary_email, m.active, m.payroll_via, m.deel_contract_id
       FROM greenhouse_core.members m
      WHERE m.active = TRUE
        AND (
          LOWER(m.primary_email) = $1
          OR EXISTS (
            SELECT 1 FROM unnest(m.email_aliases) alias
            WHERE LOWER(alias) = $1
          )
        )
      LIMIT 1`,
    [normalized]
  )

  return rows[0] ? normalizeMember(rows[0]) : null
}

/**
 * Lookup member por display_name — fuzzy match sin similarity (usa LIKE).
 *
 * Usado para fallback cuando ni RUT ni email son extraíbles. Match contra
 * display_name + legal_name + first_name||' '||last_name. Case-insensitive.
 *
 * Si hay múltiples matches, retorna null (ambiguo — operador resuelve manual).
 */
export const lookupMemberByDisplayName = async (
  name: string
): Promise<ResolvedMember | null> => {
  const normalized = name.trim()

  if (normalized.length < 3) return null

  const rows = await query<MemberLookupRow>(
    `SELECT m.member_id, m.identity_profile_id, m.display_name, m.employment_type,
            m.primary_email, m.active, m.payroll_via, m.deel_contract_id
       FROM greenhouse_core.members m
      WHERE m.active = TRUE
        AND (
          LOWER(m.display_name) ILIKE LOWER('%' || $1 || '%')
          OR LOWER(COALESCE(m.legal_name, '')) ILIKE LOWER('%' || $1 || '%')
          OR LOWER(COALESCE(m.first_name, '') || ' ' || COALESCE(m.last_name, '')) ILIKE LOWER('%' || $1 || '%')
        )
      LIMIT 2`,
    [normalized]
  )

  return rows.length === 1 ? normalizeMember(rows[0]) : null
}

interface SupplierLookupRow {
  supplier_id: string
  trade_name: string
  legal_name: string | null
  tax_id: string | null
  is_partner: boolean
  [key: string]: unknown
}

export interface ResolvedSupplier {
  supplierId: string
  tradeName: string
  legalName: string | null
  taxId: string | null
  isPartner: boolean
}

const normalizeSupplier = (row: SupplierLookupRow): ResolvedSupplier => ({
  supplierId: row.supplier_id,
  tradeName: row.trade_name,
  legalName: row.legal_name,
  taxId: row.tax_id,
  isPartner: row.is_partner
})

export const lookupSupplierByRut = async (rut: string): Promise<ResolvedSupplier | null> => {
  const normalized = rut.trim().toUpperCase()

  if (!CHILEAN_RUT_REGEX.test(normalized)) return null

  const rows = await query<SupplierLookupRow>(
    `SELECT supplier_id, trade_name, legal_name, tax_id, COALESCE(is_partner, FALSE) AS is_partner
       FROM greenhouse_finance.suppliers
      WHERE tax_id = $1
        AND COALESCE(active, TRUE) = TRUE
      LIMIT 1`,
    [normalized]
  )

  return rows[0] ? normalizeSupplier(rows[0]) : null
}

interface KnownEntityRow {
  match_id: string
  display_name: string
  [key: string]: unknown
}

/**
 * Lookup contra `known_regulators` — match regex contra el texto provisto.
 * El primer match wins; si hay ambigüedad, el operador puede agregar regla
 * más específica al seed.
 */
export const lookupKnownRegulator = async (
  text: string
): Promise<{ regulatorId: string; displayName: string } | null> => {
  const normalized = text.trim()

  if (!normalized) return null

  const rows = await query<KnownEntityRow>(
    `SELECT regulator_id AS match_id, display_name
       FROM greenhouse_finance.known_regulators
      WHERE active = TRUE
        AND $1 ~* match_regex
      LIMIT 1`,
    [normalized]
  )

  return rows[0] ? { regulatorId: rows[0].match_id, displayName: rows[0].display_name } : null
}

/**
 * Lookup contra `known_payroll_vendors` — match regex contra el texto provisto.
 */
export const lookupKnownPayrollVendor = async (
  text: string
): Promise<{ vendorId: string; displayName: string } | null> => {
  const normalized = text.trim()

  if (!normalized) return null

  const rows = await query<KnownEntityRow>(
    `SELECT vendor_id AS match_id, display_name
       FROM greenhouse_finance.known_payroll_vendors
      WHERE active = TRUE
        AND $1 ~* match_regex
      LIMIT 1`,
    [normalized]
  )

  return rows[0] ? { vendorId: rows[0].match_id, displayName: rows[0].display_name } : null
}
