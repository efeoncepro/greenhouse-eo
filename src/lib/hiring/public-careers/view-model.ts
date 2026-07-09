import type { CareersCopy } from '@/lib/copy'
import type { PublicOpeningPayload } from '@/types/hiring'

export type CareersModalityKind = 'remote' | 'hybrid' | 'onsite' | 'flexible'

export interface CareersOpeningViewModel {
  publicId: string
  title: string
  summary: string
  area: string
  location: string
  modality: string
  modalityKind: CareersModalityKind
  modalityIcon: string
  seniority: string
  employment: string
  detailHref: string
  applyHref: string
  descriptionParagraphs: string[]
  responsibilityItems: string[]
  requirementItems: string[]
  niceToHaveItems: string[]
  skillChips: string[]
  processNotes: string[]
  publishedAt: string | null
}

export interface CareersOpeningFilters {
  query?: string
  area?: string
  modality?: string
}

const MAX_CHIPS = 4
const MAX_LIST_ITEMS = 6

const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const cleanText = (value: string): string =>
  value
    .replace(/^[\s\-*•·]+/, '')
    .replace(/\s+/g, ' ')
    .trim()

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const containsAreaTerm = (text: string, term: string): boolean => {
  if (term.length > 2) return text.includes(term)

  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`).test(text)
}

const splitParagraphs = (value: string | null | undefined, fallback: string): string[] => {
  const source = value?.trim()

  if (!source) return [fallback]

  const parts = source
    .split(/\n{2,}|\r{2,}/)
    .map(cleanText)
    .filter(Boolean)

  return parts.length ? parts : [cleanText(source)]
}

const splitList = (value: string | null | undefined): string[] => {
  if (!value?.trim()) return []

  const byLines = value
    .split(/\n|(?:^|\s)[•▪●]\s|(?:^|\s)-\s/g)
    .map(cleanText)
    .filter(Boolean)

  if (byLines.length > 1) return byLines.slice(0, MAX_LIST_ITEMS)

  return value
    .split(/;|\.\s+(?=[A-ZÁÉÍÓÚÑa-záéíóúñ])/g)
    .map(cleanText)
    .filter(item => item.length > 0)
    .slice(0, MAX_LIST_ITEMS)
}

const inferArea = (opening: PublicOpeningPayload, copy: CareersCopy): string => {
  const text = normalizeText(
    [opening.title, opening.summary, opening.description, opening.requirements, opening.niceToHave].filter(Boolean).join(' '),
  )

  const rules = [
    { label: copy.marquee[0] ?? copy.fallbacks.area, terms: ['disen', 'design', 'figma', 'ux', 'ui', 'producto'] },
    {
      label: copy.marquee[1] ?? copy.fallbacks.area,
      terms: ['software', 'fullstack', 'frontend', 'backend', 'typescript', 'react', 'node', 'data engineer'],
    },
    { label: copy.marquee[2] ?? copy.fallbacks.area, terms: ['growth', 'marketing', 'estrateg', 'cro', 'contenido'] },
    { label: copy.marquee[3] ?? copy.fallbacks.area, terms: ['media', 'medios', 'ads', 'performance', 'paid'] },
    { label: copy.marquee[4] ?? copy.fallbacks.area, terms: ['operacion', 'operations', 'cuentas', 'account', 'project'] },
    { label: copy.marquee[5] ?? copy.fallbacks.area, terms: ['data', 'datos', 'analytics', 'sql', 'bigquery', 'analista'] },
  ]

  return rules.find(rule => rule.terms.some(term => containsAreaTerm(text, term)))?.label ?? copy.fallbacks.area
}

const resolveModality = (
  locationMode: string | null,
  fallback: string,
): { label: string; kind: CareersModalityKind; icon: string } => {
  const label = cleanText(locationMode ?? '') || fallback
  const normalized = normalizeText(label)

  if (normalized.includes('remot') || normalized.includes('remote')) {
    return { label, kind: 'remote', icon: 'tabler-world' }
  }

  if (normalized.includes('hibrid') || normalized.includes('hybrid')) {
    return { label, kind: 'hybrid', icon: 'tabler-building-community' }
  }

  if (normalized.includes('presencial') || normalized.includes('onsite') || normalized.includes('office')) {
    return { label, kind: 'onsite', icon: 'tabler-building' }
  }

  return { label, kind: 'flexible', icon: 'tabler-adjustments-horizontal' }
}

const deriveSkillChips = (opening: PublicOpeningPayload, copy: CareersCopy): string[] => {
  const candidates = [
    ...splitList(opening.requirements),
    ...splitList(opening.niceToHave),
    ...splitList(opening.summary),
  ]

  const chips: string[] = []
  const seen = new Set<string>()

  for (const candidate of candidates) {
    const shortened = cleanText(candidate)
      .replace(/^(experiencia|experience|dominio|manejo|conocimiento|knowledge)\s+(en|with|of)\s+/i, '')
      .replace(/\.$/, '')

    const words = shortened.split(/\s+/)
    const chip = words.length > 5 ? words.slice(0, 5).join(' ') : shortened
    const key = normalizeText(chip)

    if (!chip || chip.length > 42 || seen.has(key)) continue

    seen.add(key)
    chips.push(chip)

    if (chips.length >= MAX_CHIPS) break
  }

  if (chips.length) return chips

  return [opening.seniority, opening.employmentMode, opening.locationMode, copy.fallbacks.skill]
    .map(value => cleanText(value ?? ''))
    .filter(Boolean)
    .slice(0, MAX_CHIPS)
}

export const formatCareersTemplate = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), template)

export const buildCareersOpeningViewModel = (
  opening: PublicOpeningPayload,
  copy: CareersCopy,
): CareersOpeningViewModel => {
  const modality = resolveModality(opening.locationMode, copy.fallbacks.modality)
  const descriptionParagraphs = splitParagraphs(opening.description, opening.summary ?? copy.fallbacks.summary)
  const responsibilityItems = splitList(opening.description).slice(0, 4)
  const requirementItems = splitList(opening.requirements)

  return {
    publicId: opening.publicId,
    title: opening.title,
    summary: cleanText(opening.summary ?? '') || copy.fallbacks.summary,
    area: inferArea(opening, copy),
    location: cleanText(opening.locationMode ?? '') || copy.fallbacks.location,
    modality: modality.label,
    modalityKind: modality.kind,
    modalityIcon: modality.icon,
    seniority: cleanText(opening.seniority ?? '') || copy.fallbacks.seniority,
    employment: cleanText(opening.employmentMode ?? '') || copy.fallbacks.employment,
    detailHref: `/public/careers/${encodeURIComponent(opening.publicId)}`,
    applyHref: `/public/careers/${encodeURIComponent(opening.publicId)}/apply`,
    descriptionParagraphs,
    responsibilityItems: responsibilityItems.length ? responsibilityItems : [copy.fallbacks.responsibility],
    requirementItems: requirementItems.length ? requirementItems : [copy.fallbacks.requirement],
    niceToHaveItems: splitList(opening.niceToHave),
    skillChips: deriveSkillChips(opening, copy),
    processNotes: opening.processNotes ? splitParagraphs(opening.processNotes, '') : [],
    publishedAt: opening.publishedAt,
  }
}

export const buildCareersOpeningViewModels = (
  openings: PublicOpeningPayload[],
  copy: CareersCopy,
): CareersOpeningViewModel[] => openings.map(opening => buildCareersOpeningViewModel(opening, copy))

export const filterCareersOpenings = (
  openings: CareersOpeningViewModel[],
  filters: CareersOpeningFilters,
): CareersOpeningViewModel[] => {
  const query = normalizeText(filters.query?.trim() ?? '')
  const area = filters.area?.trim()
  const modality = filters.modality?.trim()

  return openings.filter(opening => {
    if (area && opening.area !== area) return false
    if (modality && opening.modality !== modality) return false

    if (!query) return true

    const haystack = normalizeText(
      [
        opening.title,
        opening.summary,
        opening.area,
        opening.location,
        opening.modality,
        opening.seniority,
        opening.employment,
        ...opening.skillChips,
      ].join(' '),
    )

    return haystack.includes(query)
  })
}
