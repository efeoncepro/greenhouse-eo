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
const MAX_CHIP_LENGTH = 30

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

const firstTermIndex = (text: string, terms: string[]): number => {
  const indexes = terms.map(term => text.indexOf(term)).filter(index => index >= 0)

  return indexes.length ? Math.min(...indexes) : -1
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

const isInternalProcessNote = (value: string): boolean => {
  const normalized = normalizeText(value)

  return [
    'assessment template',
    'template account',
    'internamente',
    'internal',
    'l1',
    'l2',
    'l3',
    'l4',
    'scorecard',
  ].some(term => containsAreaTerm(normalized, term))
}

const publicProcessNotes = (value: string | null | undefined): string[] => {
  const notes = splitParagraphs(value, '')
    .map(cleanText)
    .filter(Boolean)

  if (!notes.length || notes.some(isInternalProcessNote)) return []

  return notes.slice(0, 4)
}

const RESPONSIBILITY_BOUNDARY_HEADINGS = [
  'requisitos',
  'requirements',
  'nice to have',
  'deseables',
  'beneficios',
  'benefits',
  'competencias',
  'skills',
  'como es el proceso',
  'proceso',
  'compensacion',
] as const

const RESPONSIBILITY_ITEM_PREFIX = /^(?:[\s\-*•·–—]+|\d+[.)])\s*/

const cleanResponsibilityItem = (value: string): string =>
  cleanText(value).replace(RESPONSIBILITY_ITEM_PREFIX, '').trim()

const isResponsibilityBoundaryHeading = (value: string): boolean => {
  const normalized = normalizeText(cleanText(value))

  return RESPONSIBILITY_BOUNDARY_HEADINGS.some(heading => normalized.startsWith(heading))
}

const extractResponsibilityItems = (value: string | null | undefined): string[] => {
  if (!value?.trim()) return []

  const lines = value
    .split(/\r?\n/g)
    .map(line => line.trim())
    .filter(Boolean)

  const headingIndex = lines.findIndex(line => normalizeText(cleanText(line)).startsWith('responsabilidades'))
  const scopedLinesWithoutBoundary = headingIndex >= 0 ? lines.slice(headingIndex + 1) : lines

  const nextBoundaryIndex = headingIndex >= 0
    ? scopedLinesWithoutBoundary.findIndex(isResponsibilityBoundaryHeading)
    : -1

  const scopedLines = nextBoundaryIndex >= 0
    ? scopedLinesWithoutBoundary.slice(0, nextBoundaryIndex)
    : scopedLinesWithoutBoundary

  const bulletItems = scopedLines
    .filter(line => RESPONSIBILITY_ITEM_PREFIX.test(line))
    .map(cleanResponsibilityItem)
    .filter(Boolean)

  if (bulletItems.length) return bulletItems.slice(0, 4)

  if (headingIndex >= 0) return scopedLines.map(cleanResponsibilityItem).filter(Boolean).slice(0, 4)

  return splitList(value).slice(0, 4)
}

const weightedSourceText = (opening: PublicOpeningPayload): Array<{ text: string; weight: number }> => [
  { text: opening.title, weight: 8 },
  { text: opening.summary ?? '', weight: 6 },
  { text: opening.requirements ?? '', weight: 4 },
  { text: opening.description ?? '', weight: 3 },
  { text: opening.niceToHave ?? '', weight: 1 },
]

const inferArea = (opening: PublicOpeningPayload, copy: CareersCopy): string => {
  const sources = weightedSourceText(opening).map(source => ({
    ...source,
    text: normalizeText(source.text),
  }))

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

  let winner: { label: string; score: number } | null = null

  for (const rule of rules) {
    const score = sources.reduce((total, source) => {
      const sourceScore = rule.terms.some(term => containsAreaTerm(source.text, term)) ? source.weight : 0

      return total + sourceScore
    }, 0)

    if (score > (winner?.score ?? 0)) {
      winner = { label: rule.label, score }
    }
  }

  return winner?.label ?? copy.fallbacks.area
}

const resolveModality = (
  opening: PublicOpeningPayload,
  fallback: string,
): { label: string; kind: CareersModalityKind; icon: string } => {
  if (opening.workMode === 'remote') return { label: 'Remoto', kind: 'remote', icon: 'tabler-world' }
  if (opening.workMode === 'hybrid') return { label: 'Híbrido', kind: 'hybrid', icon: 'tabler-building-community' }
  if (opening.workMode === 'onsite') return { label: 'Presencial', kind: 'onsite', icon: 'tabler-building' }

  const locationMode = opening.locationMode
  const label = cleanText(locationMode ?? '') || fallback
  const normalized = normalizeText(label)
  const remoteIndex = firstTermIndex(normalized, ['remot', 'remote'])
  const hybridIndex = firstTermIndex(normalized, ['hibrid', 'hybrid'])

  if (remoteIndex >= 0 && (hybridIndex < 0 || remoteIndex <= hybridIndex)) {
    return { label: normalized.includes('remote') ? 'Remote' : 'Remoto', kind: 'remote', icon: 'tabler-world' }
  }

  if (hybridIndex >= 0) {
    return { label: normalized.includes('hybrid') ? 'Hybrid' : 'Híbrido', kind: 'hybrid', icon: 'tabler-building-community' }
  }

  if (normalized.includes('presencial') || normalized.includes('onsite') || normalized.includes('office')) {
    return { label: normalized.includes('onsite') || normalized.includes('office') ? 'Onsite' : 'Presencial', kind: 'onsite', icon: 'tabler-building' }
  }

  return { label, kind: 'flexible', icon: 'tabler-adjustments-horizontal' }
}

const resolveLocation = (
  opening: PublicOpeningPayload,
  modality: { label: string; kind: CareersModalityKind },
  fallback: string,
): string => {
  if (opening.workMode === 'remote' && opening.hiringRegion?.trim()) return cleanText(opening.hiringRegion)

  if ((opening.workMode === 'hybrid' || opening.workMode === 'onsite') && opening.officeLocation?.trim()) {
    return cleanText(opening.officeLocation)
  }

  if ((opening.workMode === 'hybrid' || opening.workMode === 'onsite') && opening.city?.trim() && opening.country?.trim()) {
    return `${cleanText(opening.city)}, ${cleanText(opening.country)}`
  }

  const locationMode = opening.locationMode
  const source = cleanText(locationMode ?? '')
  const normalized = normalizeText(source)

  const locationRules = [
    { label: 'Santiago, Chile', terms: ['santiago'] },
    { label: 'Chile', terms: ['chile'] },
    { label: 'LATAM', terms: ['latam', 'latinoamerica', 'latin america', 'america latina'] },
    { label: 'Global', terms: ['global', 'worldwide', 'mundo'] },
    { label: 'Colombia', terms: ['colombia'] },
    { label: 'Mexico', terms: ['mexico'] },
    { label: 'Peru', terms: ['peru'] },
    { label: 'Argentina', terms: ['argentina'] },
  ]

  const explicitLocation = locationRules.find(rule => rule.terms.some(term => containsAreaTerm(normalized, term)))

  if (explicitLocation) return explicitLocation.label

  if (modality.kind === 'remote') return fallback

  const cleanedWithoutModality = cleanText(
    source.replace(/remoto|remote|híbrido|hibrido|hybrid|presencial|onsite|office/gi, '').replace(/[\/·|,-]+/g, ' '),
  )

  if (cleanedWithoutModality && cleanedWithoutModality.length > 3) return cleanedWithoutModality

  return fallback
}

const deriveSkillChips = (opening: PublicOpeningPayload, copy: CareersCopy): string[] => {
  const structuredChips = opening.skillTags
    .map(cleanText)
    .filter(Boolean)
    .slice(0, MAX_CHIPS)

  if (structuredChips.length) return structuredChips

  const candidates = [
    ...splitList(opening.requirements),
    ...splitList(opening.niceToHave),
    ...splitList(opening.summary),
  ]

  const chips: string[] = []
  const seen = new Set<string>()

  const canonicalRules: Array<{ label: string; terms: string[] }> = [
    { label: 'SEO', terms: ['seo', 'organic', 'organico', 'keywords', 'on-page', 'search'] },
    { label: 'Marketing generalista', terms: ['marketing generalista', 'marketing digital', 'campaign', 'campana', 'funnel'] },
    { label: 'Vendor management', terms: ['vendor', 'proveedor', 'proveedores', 'especialistas externos'] },
    { label: 'Comunicación con clientes', terms: ['cliente', 'clientes', 'stakeholder', 'stakeholders', 'comunicacion'] },
    { label: 'Liderazgo operativo', terms: ['liderazgo', 'ownership', 'priorizar', 'riesgos', 'operativo'] },
    { label: 'Account management', terms: ['account management', 'cuentas', 'account manager'] },
    { label: 'Growth', terms: ['growth', 'crecimiento', 'cro'] },
    { label: 'Performance marketing', terms: ['performance', 'paid media', 'ads', 'medios'] },
    { label: 'Contenido', terms: ['contenido', 'content'] },
    { label: 'Automatización', terms: ['automatizacion', 'automation'] },
  ]

  const addChip = (rawChip: string): void => {
    const chip = cleanText(rawChip).replace(/\.$/, '')
    const key = normalizeText(chip)

    if (!chip || chip.length > MAX_CHIP_LENGTH || seen.has(key)) return

    seen.add(key)
    chips.push(chip)
  }

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate)
    const match = canonicalRules.find(rule => rule.terms.some(term => containsAreaTerm(normalized, term)))

    if (match) addChip(match.label)
    if (chips.length >= MAX_CHIPS) break
  }

  for (const candidate of candidates) {
    const shortened = cleanText(candidate)
      .replace(/^(experiencia|experience|dominio|manejo|conocimiento|knowledge)\s+(en|with|of)\s+/i, '')
      .replace(/\.$/, '')

    const beforeSeparator = shortened.split(/[:;,]/)[0] ?? shortened
    const words = beforeSeparator.split(/\s+/)
    const chip = words.length > 4 ? words.slice(0, 4).join(' ') : beforeSeparator

    addChip(chip)

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
  const modality = resolveModality(opening, copy.fallbacks.modality)
  const location = resolveLocation(opening, modality, copy.fallbacks.location)
  const descriptionParagraphs = splitParagraphs(opening.description, opening.summary ?? copy.fallbacks.summary)
  const responsibilityItems = extractResponsibilityItems(opening.description)
  const requirementItems = splitList(opening.requirements)

  return {
    publicId: opening.publicId,
    title: opening.title,
    summary: cleanText(opening.summary ?? '') || copy.fallbacks.summary,
    area: cleanText(opening.area ?? '') || inferArea(opening, copy),
    location,
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
    processNotes: publicProcessNotes(opening.processNotes),
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
