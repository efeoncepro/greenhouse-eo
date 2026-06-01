/**
 * Efeonce brand — single source of truth (SSOT).
 *
 * Canonical brand facts reusable across PDFs, emails, headers, footers and
 * any surface that needs Efeonce's institutional identity. Do NOT hardcode
 * the URL / address / slogan elsewhere — import from here.
 *
 * The legal entity identity (legalName, taxId, legalAddress) is dynamic and
 * multi-entity: prefer `getOperatingEntityIdentity()` (greenhouse_core.organizations,
 * `is_operating_entity = TRUE`) at runtime. The constants here are the canonical
 * FALLBACK / seed (used when no operating-entity row is resolvable, e.g. a PDF
 * rendered without DB context) and the brand-level facts that don't live in the
 * org table (URL, slogan).
 */

/** Public URL of Efeonce. Already used in payroll PDF footer + transactional emails. */
export const EFEONCE_URL = 'efeoncepro.com'
export const EFEONCE_URL_HTTPS = 'https://efeoncepro.com'

/** Canonical fallback legal entity (V1 single operating entity). Prefer getOperatingEntityIdentity() at runtime. */
export const EFEONCE_LEGAL_NAME_FALLBACK = 'Efeonce Group SpA'

/** Canonical fallback legal address. Prefer operatingEntity.legalAddress at runtime. */
export const EFEONCE_LEGAL_ADDRESS_FALLBACK = 'Dr. Manuel Barros Borgoño 71 Of 1105, Providencia, RM — Chile'

/**
 * Efeonce slogan — "Empower your Growth".
 *
 * Typography contract (Poppins, per the operator + DESIGN.md):
 *  - "Empower" → Poppins ExtraBold Italic (weight 800, italic)
 *  - "your"    → Poppins ExtraBold       (weight 800)
 *  - "Growth"  → Poppins Black Italic     (weight 900, italic)
 *
 * Rendered via the canonical components:
 *  - Web:  src/components/greenhouse/brand/EfeonceSlogan.tsx
 *  - PDF:  src/lib/finance/pdf/efeonce-slogan-pdf.tsx
 *
 * Font assets: the 4 slogan weights (Poppins ExtraBold, ExtraBold Italic,
 * Black, Black Italic) live in src/assets/fonts/Poppins-{ExtraBold,
 * ExtraBoldItalic,Black,BlackItalic}.ttf (Google Fonts Poppins v24 Latin
 * subset, SIL OFL 1.1) and are registered for PDF in
 * src/lib/finance/pdf/register-fonts.ts under the family names below.
 */
export const EFEONCE_SLOGAN_PARTS = [
  { text: 'Empower', weight: 800, italic: true, poppinsFamily: 'Poppins ExtraBold Italic' },
  { text: 'your', weight: 800, italic: false, poppinsFamily: 'Poppins ExtraBold' },
  { text: 'Growth', weight: 900, italic: true, poppinsFamily: 'Poppins Black Italic' }
] as const

export const EFEONCE_SLOGAN_TEXT = 'Empower your Growth'

/**
 * Color canónico del eslogan "Empower your Growth": gris `#848484` (brand
 * reference 2026-06-01). El eslogan es un elemento de marca INDEPENDIENTE del
 * logo — se renderiza solo o compuesto, pero nunca se fusiona con el logo en un
 * único asset. Tanto `EfeonceSlogan` (web) como `EfeonceSloganPdf` (PDF) usan
 * este gris por default; un override de color es excepción (e.g. sobre fondo
 * oscuro), no la norma.
 */
export const EFEONCE_SLOGAN_COLOR = '#848484'

export type EfeonceSloganPart = (typeof EFEONCE_SLOGAN_PARTS)[number]
