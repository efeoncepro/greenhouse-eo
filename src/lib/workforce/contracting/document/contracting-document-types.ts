// TASK-1023 — Immutable snapshot consumed by the contracting @react-pdf render.
// Composed once at first render (Slice 3) from: employer (operating entity) + worker
// (identity profile) + draft captured facts (terms) + approved structured content. Reused
// for every re-render (status transitions only change the watermark) so an approved legal
// document never changes if identities mutate later (OQ1). Pure types — safe client + server.

export type ContractingDocumentLanguage = 'es-CL' | 'en-US'

export type ContractingDocumentKind = 'offer_letter' | 'employment_contract'

export interface ContractingPdfEmployer {
  legalName: string
  taxId: string | null
  legalAddress: string | null
  representativeName: string | null
  /** Filename built from the employer taxId (e.g. "77357182-1.png"); resolved to an absolute path at render. */
  legalRepresentativeSignaturePath: string | null
}

export interface ContractingPdfWorker {
  fullName: string
  taxId: string | null
  nationality: string | null
  address: string | null
  jobTitle: string | null
}

/** Structured offer term row (termscard) — value is language-neutral; labels are bilingual. */
export interface ContractingPdfTermRow {
  code: string
  labelEs: string
  labelEn: string
  value: string
}

export interface ContractingPdfSection {
  sectionCode: string
  /** Clause ordinal (e.g. "PRIMERO" / "FIRST"); null for prose-only sections (salutation, comparecencia). */
  ordinal: string | null
  heading: string
  /** One or more paragraphs of body text. */
  paragraphs: string[]
}

export interface ContractingPdfLocalizedDoc {
  title: string
  sections: ContractingPdfSection[]
}

export interface ContractingPdfSnapshot {
  caseKind: ContractingDocumentKind
  jurisdictionPackCode: string
  authoritativeLanguage: ContractingDocumentLanguage
  employer: ContractingPdfEmployer
  worker: ContractingPdfWorker
  /** Offer termscard rows (employment contract may leave this empty). */
  terms: ContractingPdfTermRow[]
  localized: Record<ContractingDocumentLanguage, ContractingPdfLocalizedDoc>
  placeDateEs: string
  placeDateEn: string
  /** Render timestamp (footer "Generado: …"). */
  generatedAt: string | null
}

/** Watermark severity → @react-pdf colour bucket. */
export type ContractingWatermarkSeverity = 'warning' | 'error' | 'neutral'

export interface ContractingWatermark {
  text: string
  severity: ContractingWatermarkSeverity
}
