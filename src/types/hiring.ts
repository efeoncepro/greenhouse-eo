import type { HiringDataOrigin } from '@/lib/hiring/data-origin/contracts'

// TASK-353 — Hiring / ATS domain foundation.
// Tipos de dominio (view models camelCase + enums que espejan los CHECK constraints de
// greenhouse_hiring). Arch: GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md.
// Person-first: candidate_facet + hiring_application anclan a identity_profile_id.

// ── Enums (1:1 con los CHECK del schema) ──

export const TALENT_DEMAND_STAKEHOLDER_TYPES = ['internal', 'client'] as const
export type TalentDemandStakeholderType = (typeof TALENT_DEMAND_STAKEHOLDER_TYPES)[number]

export const TALENT_DEMAND_ENGAGEMENT_TYPES = ['on_demand', 'on_going'] as const
export type TalentDemandEngagementType = (typeof TALENT_DEMAND_ENGAGEMENT_TYPES)[number]

export const HIRING_FULFILLMENT_MODES = [
  'internal_reassignment',
  'internal_hire',
  'staff_augmentation',
  'contractor',
  'partner'
] as const
export type HiringFulfillmentMode = (typeof HIRING_FULFILLMENT_MODES)[number]

export const TALENT_DEMAND_ORIGINS = [
  'client_request',
  'prospect_request',
  'replacement',
  'expansion',
  'capacity_gap',
  'manual_internal'
] as const
export type TalentDemandOrigin = (typeof TALENT_DEMAND_ORIGINS)[number]

export const TALENT_DEMAND_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export type TalentDemandPriority = (typeof TALENT_DEMAND_PRIORITIES)[number]

export const TALENT_DEMAND_STATUSES = [
  'draft',
  'qualified',
  'open',
  'sourcing',
  'partially_fulfilled',
  'fulfilled',
  'stalled',
  'cancelled',
  'archived'
] as const
export type TalentDemandStatus = (typeof TALENT_DEMAND_STATUSES)[number]

export const HIRING_OPENING_VISIBILITIES = ['internal_only', 'private_sourcing', 'public_listed'] as const
export type HiringOpeningVisibility = (typeof HIRING_OPENING_VISIBILITIES)[number]

export const HIRING_OPENING_PUBLICATION_STATUSES = [
  'draft',
  'ready_for_review',
  'published',
  'paused',
  'closed'
] as const
export type HiringOpeningPublicationStatus = (typeof HIRING_OPENING_PUBLICATION_STATUSES)[number]

export const HIRING_OPENING_STATUSES = ['draft', 'active', 'paused', 'filled', 'cancelled', 'closed'] as const
export type HiringOpeningStatus = (typeof HIRING_OPENING_STATUSES)[number]

export const HIRING_PUBLIC_WORK_MODES = ['remote', 'hybrid', 'onsite'] as const
export type HiringPublicWorkMode = (typeof HIRING_PUBLIC_WORK_MODES)[number]

/**
 * Vocabulario candidate-facing. Los niveles internos (p. ej. L2) pertenecen a
 * scorecards/assessment y nunca deben cruzar la frontera pública.
 */
export const HIRING_PUBLIC_SENIORITIES = ['Junior', 'Semi-senior', 'Senior', 'Lead'] as const
export type HiringPublicSeniority = (typeof HIRING_PUBLIC_SENIORITIES)[number]

export const HIRING_PUBLIC_AREAS = [
  'Marketing',
  'Growth',
  'Creative',
  'Technology',
  'Operations',
  'People',
  'Finance',
  'Sales',
  'Strategy'
] as const
export type HiringPublicArea = (typeof HIRING_PUBLIC_AREAS)[number]

export const CANDIDATE_SOURCES = [
  'public_careers',
  'manual',
  'referral',
  'bench_internal',
  'partner',
  'hubspot',
  'import'
] as const
export type CandidateSource = (typeof CANDIDATE_SOURCES)[number]

export const CANDIDATE_READINESS = ['unknown', 'not_ready', 'passive', 'active', 'ready'] as const
export type CandidateReadiness = (typeof CANDIDATE_READINESS)[number]

export const CANDIDATE_CONSENT_STATUSES = ['not_captured', 'granted', 'withdrawn'] as const
export type CandidateConsentStatus = (typeof CANDIDATE_CONSENT_STATUSES)[number]

export const CANDIDATE_FACET_STATUSES = ['active', 'archived'] as const
export type CandidateFacetStatus = (typeof CANDIDATE_FACET_STATUSES)[number]

export const HIRING_APPLICATION_STAGES = [
  'sourced',
  'screening',
  'shortlisted',
  'interview',
  'decision_pending',
  'closed'
] as const
export type HiringApplicationStage = (typeof HIRING_APPLICATION_STAGES)[number]

/**
 * TASK-1765 — las etapas del RECORRIDO: el subconjunto que un cambio de etapa puede escribir.
 *
 * Polaridad invertida a propósito. El guard anterior era una DENYLIST de cuatro literales
 * (`['selected','backup','rejected','withdrawn']`) y, como toda lista de excepciones, falló por lo
 * que no enumeraba: por ahí se colaron `closed` y `handoff_ready`, que son justo los dos que hacen
 * daño. Arrastrar una tarjeta a «Cerrado» escribía `closed` SIN decisión: sin evento, sin correo,
 * sin arrancar el reloj de retención — y peor, congelando el borrado de los documentos de esa
 * persona en TODAS sus demás postulaciones, porque el detector de retención cruza por
 * `identity_profile_id`.
 *
 * Agregar un quinto nombre a la denylist habría repetido el defecto con más letras. Acá el conjunto
 * de lo escribible se define por INCLUSIÓN, y el tipo lo hace cumplir en compilación: una etapa
 * nueva nace NO escribible hasta que alguien la agregue deliberadamente.
 *
 * Fuera del subconjunto, y por qué:
 * - `closed` — cerrar ES decidir. Pasa por `decideHiringApplication`, nunca por un `PATCH` de etapa.
 * - `selected` / `backup` / `rejected` / `withdrawn` — espejos del desenlace; son del command.
 * - `handoff_ready` — no es una posición del recorrido de la PERSONA, sino un estado del agregado
 *   `handoff`, que tiene su propia máquina de estados.
 * - `qualified` / `client_review` — TASK-1754: absorbidas por `shortlisted`. Salen de acá ANTES
 *   que del `CHECK`, y ese orden es el slice entero. El tablero muestra seis columnas y el
 *   dominio tenía trece etapas, así que las tres que se ven como «Evaluación» eran tres destinos
 *   posibles para un mismo gesto: los diez movimientos humanos a esa columna cayeron en
 *   `qualified`, que ninguna automatización vigila, y las quince políticas configuradas en
 *   `shortlisted` nunca dispararon. Retirarlas del subconjunto escribible cierra la boca por la
 *   que entraban; retirarlas del `CHECK` es el contract, y ése va DESPUÉS del release —
 *   producción todavía escribe `qualified` desde el tablero viejo.
 */
export const HIRING_PIPELINE_STAGES = [
  'sourced',
  'screening',
  'shortlisted',
  'interview',
  'decision_pending'
] as const
export type HiringPipelineStage = (typeof HIRING_PIPELINE_STAGES)[number]

/**
 * TASK-1754 Slice F — las etapas que significan «este recorrido terminó». FUENTE ÚNICA.
 *
 * Existían tres copias verbatim del mismo `Set` —en `assessment/instances.ts`,
 * `assessment/public-session/store.ts` y `assessment/access-recovery/vocabulary.ts`— cada una con
 * cinco literales, cuatro de los cuales el contract del enum acaba de volver irrepresentables.
 * Tres copias sin fuente compartida son tres oportunidades de que la próxima corrección alcance a
 * dos.
 *
 * Con el colapso queda UNA etapa terminal, y el `CHECK` del invariante de `TASK-1765`
 * (`(stage='closed') = (decision IS NOT NULL)`) la ata al eje de desenlace. Los tres guards que la
 * consumen ya comprueban `decision` por separado, así que hoy este conjunto es redundante con esa
 * comprobación — **y se conserva a propósito**: es la guarda que sigue siendo correcta si algún día
 * el invariante se relaja, y leerla es más barato que re-derivar la equivalencia en cada callsite.
 */
export const TERMINAL_APPLICATION_STAGES: ReadonlySet<string> = new Set<HiringApplicationStage>(['closed'])

/**
 * TASK-1765 — el eje de DESENLACE: cómo terminó el recorrido de una persona.
 * ADR: GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1 §4.
 *
 * El campo físico se sigue llamando `decision`, pero el concepto es DESENLACE: `withdrawn` y
 * `unresponsive` no son decisiones de Efeonce. NUNCA leer esta columna como «lo que Efeonce
 * decidió»; significa «cómo terminó el proceso».
 *
 * - `selected`         — la elegimos.
 * - `backup_selected`  — la elegimos como respaldo.
 * - `not_selected`     — llegó al final y no quedó. Exige `cause`. Es la población objetivo del
 *                        Talent Pool: NUNCA usar `rejected` acá (rejected es un juicio sobre la
 *                        persona, y aplicarlo sin juicio infla la tasa de rechazo de su cohorte
 *                        demográfica en el análisis de impacto adverso).
 * - `rejected`         — juicio desfavorable para este rol.
 * - `withdrawn`        — se retiró, y lo DECLARÓ.
 * - `unresponsive`     — dejó de responder. Sin conducta atribuida y sin correo. NUNCA registrar
 *                        el silencio como `withdrawn`: es atribuirle una decisión que no tomó.
 *
 * `on_hold` NO está, y su ausencia es la decisión: una pausa no es un cierre. Vivía en este enum *y*
 * mapeaba a la etapa `decision_pending`, así que la misma fila decía «terminó» y «sigue viva» a la
 * vez. Una pausa se registra moviendo la ETAPA a `decision_pending`, que el cambio de etapa sí
 * acepta.
 */
export const HIRING_DECISIONS = [
  'selected',
  'backup_selected',
  'not_selected',
  'rejected',
  'withdrawn',
  'unresponsive'
] as const
export type HiringDecision = (typeof HIRING_DECISIONS)[number]

/**
 * TASK-1765 — la CAUSA del desenlace (ADR §4.1). Obligatoria en `not_selected`, prohibida en el
 * resto; la bicondicional la garantiza `hiring_application_decision_cause_pairing_check`.
 *
 * Es enum gobernado y NUNCA texto libre, porque hay consumidores que ramifican por ella: el embudo
 * de equidad (`capacity_filled` cuenta como proceso concluido; los otros dos NO) y el cuerpo del
 * correo al candidato. Si algo ramifica por un valor, ese valor no puede ser prosa.
 *
 * La vacante entra SIEMPRE como causa, JAMÁS como desenlace: etiquetar a una persona con el estado
 * de la vacante es el defecto que este eje viene a cerrar.
 */
export const HIRING_DECISION_CAUSES = ['capacity_filled', 'opening_closed', 'process_cancelled'] as const
export type HiringDecisionCause = (typeof HIRING_DECISION_CAUSES)[number]

// ── View models (camelCase, retornados por el store) ──

export interface TalentDemand {
  demandId: string
  publicId: string
  stakeholderType: TalentDemandStakeholderType
  engagementType: TalentDemandEngagementType
  fulfillmentMode: HiringFulfillmentMode
  demandOrigin: TalentDemandOrigin
  organizationId: string | null
  clientId: string | null
  spaceId: string | null
  businessUnit: string | null
  serviceId: string | null
  prospectRef: string | null
  dealRef: string | null
  externalAccountRef: string | null
  requestedCompanyName: string | null
  requestedRole: string
  requestedSeats: number
  requestedSkills: string[]
  targetStartDate: string | null
  priority: TalentDemandPriority
  duration: string | null
  timezone: string | null
  language: string | null
  budgetBand: string | null
  rateBand: string | null
  status: TalentDemandStatus
  ownerUserId: string | null
  notes: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface HiringOpening {
  openingId: string
  publicId: string
  demandId: string
  internalTitle: string
  seniority: string | null
  requestedSeats: number
  ownerUserId: string | null
  spaceId: string | null
  organizationId: string | null
  budgetBand: string | null
  rateBand: string | null
  riskNotes: string | null
  internalNotes: string | null
  visibility: HiringOpeningVisibility
  publicationStatus: HiringOpeningPublicationStatus
  publicTitle: string | null
  publicSummary: string | null
  publicDescription: string | null
  publicRequirements: string | null
  publicNiceToHave: string | null
  publicLocationMode: string | null
  publicWorkMode: HiringPublicWorkMode | null
  publicHiringRegion: string | null
  publicCity: string | null
  publicCountry: string | null
  publicOfficeLocation: string | null
  publicArea: string | null
  publicSkillTags: string[]
  publicCompensationBand: string | null
  publicationSourceRef: string | null
  publicEmploymentMode: string | null
  publicSeniority: string | null
  publicProcessNotes: string | null
  /** TASK-1740 — contenido público estructurado versionado; null = opening legacy. */
  publicContent: PublicOpeningContent | null
  /** TASK-1740 — países elegibles ISO alpha-2 para schema remoto. */
  publicRemoteEligibleCountries: string[]
  applyUrl: string | null
  status: HiringOpeningStatus
  publishedAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface CandidateFacet {
  candidateFacetId: string
  publicId: string
  identityProfileId: string
  memberId: string | null
  source: CandidateSource
  readiness: CandidateReadiness
  availability: string | null
  seniority: string | null
  expectedRate: number | null
  expectedRateCurrency: string | null
  rateBand: string | null
  consentStatus: CandidateConsentStatus
  consentPolicyVersion: string | null
  consentCapturedAt: string | null
  retentionPolicy: string | null
  sourceAttribution: string | null
  verificationSignals: Record<string, unknown>
  portfolioUrl: string | null
  linkedinUrl: string | null
  /** TASK-1688 — teléfono E.164 opcional (PII interna; nunca en payloads públicos). */
  phoneE164: string | null
  /** TASK-1688 — país de residencia AUTODECLARADO (ISO 3166-1 alpha-2); null = no informado. */
  residenceCountryCode: string | null
  status: CandidateFacetStatus
  notes: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface HiringApplication {
  applicationId: string
  publicId: string
  openingId: string
  identityProfileId: string
  candidateFacetId: string
  ownerUserId: string | null
  stage: HiringApplicationStage
  score: number | null
  matchScore: number | null
  blockingIssues: string[]
  nextStepAt: string | null
  source: CandidateSource
  notes: string | null
  /** TASK-1688 — mensaje del candidato, application-scoped (≤4000); PII interna. */
  candidateMessage: string | null
  explainability: Record<string, unknown>
  dedupeFingerprint: string | null
  decision: HiringDecision | null
  /** TASK-1765 — causa del desenlace; no-null sólo con `decision === 'not_selected'`. */
  decisionCause: HiringDecisionCause | null
  decisionAt: string | null
  decisionBy: string | null
  selectedDestination: HiringFulfillmentMode | null
  tentativeStartDate: string | null
  expectedLegalEntity: string | null
  expectedContext: string | null
  prerequisitesSnapshot: Record<string, unknown>
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Razón humana y defendible de una decisión. El score/AI puede aportar evidencia,
 * pero nunca sustituye este juicio explícito del operador.
 */
export interface HiringDecisionReason {
  summary: string
  evidence?: string[]
  overridesAdvisory?: boolean
}

export interface HiringDecisionHistoryEntry {
  decisionId: string
  idempotencyKey: string
  decision: HiringDecision
  /**
   * TASK-1765 — causa gobernada, presente SÓLO cuando `decision === 'not_selected'`. Vive en cada
   * entrada del historial y no sólo en la columna snapshot: el snapshot dice el desenlace VIGENTE,
   * el historial dice el de cada decisión que hubo. Ausente en las entradas anteriores a esta task,
   * que son inmutables y NUNCA se reescriben.
   */
  cause?: HiringDecisionCause | null
  decidedAt: string
  decidedBy: string | null
  reason: HiringDecisionReason
  selectedDestination: HiringFulfillmentMode | null
  tentativeStartDate: string | null
  expectedLegalEntity: string | null
  expectedContext: string | null
  prerequisitesSnapshot: Record<string, unknown>
  supersedesDecisionId: string | null
}

export interface HiringDeskOpeningSummary {
  opening: HiringOpening
  demand: TalentDemand
  applicationCount: number
  activeApplicationCount: number
}

export interface HiringDeskApplicationSummary {
  application: HiringApplication
  candidateName: string
  candidateInitials: string
  maskedEmail: string | null
  portfolioUrl: string | null
  linkedinUrl: string | null
  /** TASK-1688 — contacto durable del facet; null = "No informado" (legacy sin backfill). */
  phoneE164: string | null
  residenceCountryCode: string | null
  openingTitle: string
  openingPublicId: string
  area: string | null
}

export interface HiringDeskSnapshot {
  openings: HiringDeskOpeningSummary[]
  applications: HiringDeskApplicationSummary[]
  totals: {
    openings: number
    applications: number
    publishedOpenings: number
    activeDemands: number
  }
}

// ── Public opening structured content (TASK-1740) ──
// Bloque candidate-facing versionado; el validador canónico vive en
// src/lib/hiring/public-careers/public-content.ts.

export const PUBLIC_OPENING_CONTENT_VERSION = 2 as const
export const PUBLIC_OPENING_LEGACY_CONTENT_VERSION = 1 as const
export type PublicOpeningContentVersion =
  | typeof PUBLIC_OPENING_LEGACY_CONTENT_VERSION
  | typeof PUBLIC_OPENING_CONTENT_VERSION

export const PUBLIC_COMPENSATION_UNITS = ['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'] as const
export type PublicCompensationUnit = (typeof PUBLIC_COMPENSATION_UNITS)[number]

/** Rango monetario aprobado y estructurado. Nunca derivado de public_compensation_band (texto libre). */
export interface PublicOpeningCompensationRange {
  /** ISO 4217, p. ej. `USD`, `CLP`. */
  currency: string
  minValue: number
  maxValue: number
  unitText: PublicCompensationUnit
}

export const PUBLIC_OPENING_ADDITIONAL_SECTION_FORMATS = ['narrative', 'bullets', 'milestones'] as const
export type PublicOpeningAdditionalSectionFormat = (typeof PUBLIC_OPENING_ADDITIONAL_SECTION_FORMATS)[number]

export interface PublicOpeningAdditionalSection {
  title: string
  format: PublicOpeningAdditionalSectionFormat
  intro: string | null
  items: string[]
}

export interface PublicOpeningCollaboration {
  team: string
  reportsTo: string
  language: string
  timezoneOverlap: string
  workingRhythm: string
}

export interface PublicOpeningProcessStep {
  title: string
  /** `null` sólo existe al normalizar contenido v1; en v2 cada etapa explica su propósito. */
  body: string | null
}

export interface PublicOpeningProcess {
  steps: PublicOpeningProcessStep[]
  /** Campos nullable únicamente para compatibilidad read-only de v1. */
  expectedTiming: string | null
  responseCommitment: string | null
  accommodationPath: string | null
}

/**
 * Contenido público estructurado normalizado de una vacante. Writes nuevos usan v2 completo;
 * `version: 1` aparece únicamente al leer datos legacy y degrada por sección.
 */
export interface PublicOpeningContent {
  version: PublicOpeningContentVersion
  /** Promesa al candidato: qué gana la persona en este rol (1-2 frases). */
  promise: string | null
  /** Intro/misión: el problema concreto que la persona resolverá. */
  intro: string | null
  /** Resultados observables esperados del primer año. */
  outcomes: string[]
  /** Trabajo real / entregables del rol. */
  workItems: string[]
  /** Habilidades esenciales (must-have). */
  essentials: string[]
  /** Capacidad preferida, explícitamente no excluyente. */
  preferred: string[]
  /** Habilidades que se pueden aprender en el rol (learnable). */
  learnables: string[]
  /** Qué evidencia/portafolio se pide al candidato. */
  evidenceAsk: string | null
  /** Cómo opera la modalidad en la práctica; aplica a remoto, híbrido o presencial. */
  workModel: string | null
  /** Equipo, reporte, idioma, solapamiento y ritmo; obligatorio en v2. */
  collaboration: PublicOpeningCollaboration | null
  /** Proceso candidate-facing completo; obligatorio en v2. */
  process: PublicOpeningProcess | null
  /** Beneficios adicionales del cargo; el baseline global se resuelve centralmente. */
  benefits: string[]
  /** Rango de compensación aprobado y estructurado; null = no se publica salario. */
  compensation: PublicOpeningCompensationRange | null
  /** Zona de extensión controlada después de `El trabajo`; máximo tres bloques. */
  additionalSections: PublicOpeningAdditionalSection[]
}

// ── Public opening projection (allowlist-only — consumido por TASK-354 careers) ──
// NUNCA incluye owner, budget/rate, risk, notes internos, score ni cliente confidencial.

export interface PublicOpeningPayload {
  publicId: string
  title: string
  summary: string | null
  description: string | null
  requirements: string | null
  niceToHave: string | null
  locationMode: string | null
  workMode: HiringPublicWorkMode | null
  hiringRegion: string | null
  city: string | null
  country: string | null
  officeLocation: string | null
  area: string | null
  skillTags: string[]
  compensationBand: string | null
  employmentMode: string | null
  seniority: string | null
  processNotes: string | null
  applyUrl: string | null
  publishedAt: string | null
  /** TASK-1740 — bloque estructurado candidate-facing; null = fallback legacy de prosa. */
  content: PublicOpeningContent | null
  /** TASK-1740 — países elegibles ISO alpha-2 para remoto; [] = sin elegibilidad declarada. */
  remoteEligibleCountries: string[]
}

// ── Input types (commands del store) ──

export interface CreateTalentDemandInput {
  /**
   * TASK-1739 — Procedencia declarada en el NACIMIENTO del dato. Omitirla deja el dato visible
   * (`real`), jamás oculto: perder un cargo real es peor que tolerar suciedad. Todo seed/smoke que
   * cree demanda DEBE declararla.
   */
  dataOrigin?: HiringDataOrigin
  stakeholderType: TalentDemandStakeholderType
  engagementType: TalentDemandEngagementType
  fulfillmentMode: HiringFulfillmentMode
  demandOrigin: TalentDemandOrigin
  requestedRole: string
  requestedSeats?: number
  requestedSkills?: string[]
  organizationId?: string | null
  clientId?: string | null
  spaceId?: string | null
  businessUnit?: string | null
  serviceId?: string | null
  prospectRef?: string | null
  dealRef?: string | null
  externalAccountRef?: string | null
  requestedCompanyName?: string | null
  targetStartDate?: string | null
  priority?: TalentDemandPriority
  duration?: string | null
  timezone?: string | null
  language?: string | null
  budgetBand?: string | null
  rateBand?: string | null
  ownerUserId?: string | null
  notes?: string | null
}

export interface UpdateTalentDemandInput {
  status?: TalentDemandStatus
  requestedRole?: string
  requestedSeats?: number
  requestedSkills?: string[]
  priority?: TalentDemandPriority
  targetStartDate?: string | null
  duration?: string | null
  timezone?: string | null
  language?: string | null
  budgetBand?: string | null
  rateBand?: string | null
  ownerUserId?: string | null
  notes?: string | null
}

export interface CreateHiringOpeningInput {
  /** TASK-1739 — Procedencia declarada al nacer. Una vacante no-real NUNCA se puede publicar. */
  dataOrigin?: HiringDataOrigin
  demandId: string
  internalTitle: string
  seniority?: string | null
  requestedSeats?: number
  ownerUserId?: string | null
  spaceId?: string | null
  organizationId?: string | null
  budgetBand?: string | null
  rateBand?: string | null
  riskNotes?: string | null
  internalNotes?: string | null
}

export interface UpdateHiringOpeningInput {
  internalTitle?: string
  seniority?: string | null
  requestedSeats?: number
  ownerUserId?: string | null
  budgetBand?: string | null
  rateBand?: string | null
  riskNotes?: string | null
  internalNotes?: string | null
  status?: HiringOpeningStatus
  visibility?: HiringOpeningVisibility
  // Payload público editable (la publicación se gobierna aparte con publish/unpublish).
  publicTitle?: string | null
  publicSummary?: string | null
  publicDescription?: string | null
  publicRequirements?: string | null
  publicNiceToHave?: string | null
  publicLocationMode?: string | null
  publicWorkMode?: HiringPublicWorkMode | null
  publicHiringRegion?: string | null
  publicCity?: string | null
  publicCountry?: string | null
  publicOfficeLocation?: string | null
  publicArea?: string | null
  publicSkillTags?: string[]
  publicCompensationBand?: string | null
  publicationSourceRef?: string | null
  publicEmploymentMode?: string | null
  publicSeniority?: string | null
  publicProcessNotes?: string | null
  /** TASK-1740 — bloque estructurado; el store re-valida con parsePublicOpeningContent. */
  publicContent?: PublicOpeningContent | Record<string, unknown> | null
  /** TASK-1740 — ISO alpha-2; el store valida contra isValidCountryCode. null limpia a []. */
  publicRemoteEligibleCountries?: string[] | null
  applyUrl?: string | null
}

export interface ReconcileCandidateFacetInput {
  identityProfileId: string
  source?: CandidateSource
  readiness?: CandidateReadiness
  availability?: string | null
  seniority?: string | null
  expectedRate?: number | null
  expectedRateCurrency?: string | null
  rateBand?: string | null
  consentStatus?: CandidateConsentStatus
  consentPolicyVersion?: string | null
  consentCapturedAt?: string | null
  retentionPolicy?: string | null
  sourceAttribution?: string | null
  portfolioUrl?: string | null
  linkedinUrl?: string | null
  /** TASK-1688 — omitir/null preserva el valor existente (política anti-wipe del upsert). */
  phoneE164?: string | null
  residenceCountryCode?: string | null
  memberId?: string | null
  notes?: string | null
}

export interface CreateHiringApplicationInput {
  openingId: string
  identityProfileId: string
  candidateFacetId: string
  ownerUserId?: string | null
  /**
   * TASK-1765 — una postulación NACE en el recorrido, nunca cerrada ni en un espejo de desenlace.
   * El tipo es el subconjunto escribible por la misma razón que en `updateHiringApplicationStage`:
   * si crear pudiera escribir `closed`, quedaría abierta la misma puerta que el `PATCH` acaba de
   * perder, y con el invariante del Slice 5 sería además una fila que la base rechaza.
   */
  stage?: HiringPipelineStage
  source?: CandidateSource
  score?: number | null
  matchScore?: number | null
  blockingIssues?: string[]
  nextStepAt?: string | null
  notes?: string | null
  /** TASK-1688 — mensaje del candidato (application-scoped, ≤4000). */
  candidateMessage?: string | null
  dedupeFingerprint?: string | null
}

export interface DecideHiringApplicationInput {
  decision: HiringDecision
  /**
   * TASK-1765 — obligatoria en `not_selected`, rechazada en el resto (422 canónico). La causa viaja
   * en el input del command y NUNCA en un `PATCH` paralelo ni en un campo de notas: la bicondicional
   * de base exige que desenlace y causa se escriban en el MISMO `UPDATE`.
   */
  cause?: HiringDecisionCause | null
  reason: HiringDecisionReason
  idempotencyKey: string
  selectedDestination?: HiringFulfillmentMode | null
  tentativeStartDate?: string | null
  expectedLegalEntity?: string | null
  expectedContext?: string | null
  prerequisitesSnapshot?: Record<string, unknown>
}

export interface DecideHiringApplicationResult {
  application: HiringApplication
  decisionEntry: HiringDecisionHistoryEntry
  idempotentReplay: boolean
}

export interface ListTalentDemandFilters {
  /**
   * TASK-1739 — `true` incluye datos NO reales (seeds/smokes/demo). Default `false`: los readers
   * operativos no cuentan fantasmas. La procedencia es ortogonal a `source` (canal de llegada).
   */
  includeSynthetic?: boolean
  status?: TalentDemandStatus
  stakeholderType?: TalentDemandStakeholderType
  organizationId?: string
  spaceId?: string
  ownerUserId?: string
  limit?: number
  offset?: number
}

export interface ListHiringOpeningFilters {
  /**
   * TASK-1739 — `true` incluye datos NO reales (seeds/smokes/demo). Default `false`: los readers
   * operativos no cuentan fantasmas. La procedencia es ortogonal a `source` (canal de llegada).
   */
  includeSynthetic?: boolean
  demandId?: string
  status?: HiringOpeningStatus
  publicationStatus?: HiringOpeningPublicationStatus
  visibility?: HiringOpeningVisibility
  limit?: number
  offset?: number
}

export interface ListHiringApplicationFilters {
  /**
   * TASK-1739 — `true` incluye datos NO reales (seeds/smokes/demo). Default `false`: los readers
   * operativos no cuentan fantasmas. La procedencia es ortogonal a `source` (canal de llegada).
   */
  includeSynthetic?: boolean
  openingId?: string
  identityProfileId?: string
  stage?: HiringApplicationStage
  source?: CandidateSource
  limit?: number
  offset?: number
}
