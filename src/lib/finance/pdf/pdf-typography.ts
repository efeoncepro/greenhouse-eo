import 'server-only'

// TASK-1043 — PDF typography adapter (deriva del SoT de tipografía).
//
// Cuarto "medio" del SoT de tipografía (TASK-1036/1038): web (variantes MUI),
// charts (chart-typography.ts), y **PDF** (este) + email. Los documentos PDF
// (finiquito, recibo, comprobante, reportes) declaran `fontSize` inline en sus
// `StyleSheet`, fuera de la fuente única. react-pdf NO tiene cascada CSS, así
// que la gobernanza es un **adapter opt-in**: cada componente consume los roles
// de aquí en lugar de hardcodear tamaños.
//
// Política canónica "PDF/email = un SSOT semántico + adapter por medio"
// (DESIGN.md §Typography, V1 §3): **el SoT define los roles semánticos +
// el peso + la familia (display/text); el adapter elige el TAMAÑO apropiado
// a su medio**. NO se copian los px del web — un documento legal denso usa
// `pt` con una jerarquía propia (title/body ≈ 2.5x) que no es proporcional a
// la del web (1.43x). Lo que SÍ deriva del SoT (cero hardcode):
//   - el set de roles,
//   - el `fontWeight` de cada rol (desde `typographyScale[token].fontWeight`),
//   - la familia (display=Poppins vs text=Geist, desde `fontFamilies`).
// El test `pdf-typography.test.ts` pinea esa derivación.
//
// react-pdf usa registro POR NOMBRE DE FAMILIA (register-fonts.ts): el peso se
// codifica en el nombre ('Geist SemiBold', 'Poppins ExtraBold'), NO como
// `fontWeight` numérico. `pdfFamilyName()` mapea (intent, weight del SoT) → el
// nombre registrado — aquí se consumen las familias 600/800 que sumó TASK-1040.

import {
  fontFamilies,
  fontWeights,
  letterSpacings,
  typographyScale,
  type TypographyTokenName
} from '@/components/theme/typography-tokens'

/** Intención de familia del SoT (las únicas dos familias activas, V1 §3.1). */
export type PdfFamilyIntent = 'display' | 'text'

/** Estilo react-pdf resuelto para un rol (familia registrada + pt). */
export interface PdfTextStyle {
  /** Nombre de familia REGISTRADO en register-fonts.ts (codifica el peso). */
  fontFamily: string
  /** Tamaño en `pt` (unidad nativa de react-pdf / documento). */
  fontSize: number
  /** letter-spacing en pt (solo overline). */
  letterSpacing?: number
}

/** Roles canónicos del adapter PDF (vocabulario semántico compartido con email). */
export type PdfTypographyRole =
  | 'display'
  | 'pageTitle'
  | 'sectionTitle'
  | 'subtitle'
  | 'label'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'micro'
  | 'overline'
  | 'numericId'
  | 'numericAmount'
  | 'kpiValue'

export type PdfTypography = Record<PdfTypographyRole, PdfTextStyle>

/**
 * Definición de cada rol: el token del SoT que aporta peso + familia, y el
 * tamaño en `pt` propio del medio PDF. Roles sin token canónico 1:1
 * (`bodyStrong`, `micro`) referencian primitivas del SoT (`fontWeights`,
 * `fontFamilies`) — siguen derivando de la fuente única, no inventan pesos.
 */
interface PdfRoleSpec {
  /** Token del SoT que aporta `fontWeight` + familia. */
  token?: TypographyTokenName
  /** Override de intent/peso para roles medium-specific (sin token 1:1). */
  familyIntent?: PdfFamilyIntent
  fontWeight?: number
  /** Tamaño en `pt` — propio del medio (NO copiado del web). */
  sizePt: number
  /** Aplica letter-spacing de caps (overline). */
  caps?: boolean
}

const PDF_ROLE_SPECS: Record<PdfTypographyRole, PdfRoleSpec> = {
  display: { token: 'headlineDisplay', sizePt: 20 },
  pageTitle: { token: 'pageTitle', sizePt: 16 },
  sectionTitle: { token: 'sectionTitle', sizePt: 12 },
  subtitle: { token: 'subheader', sizePt: 10 },
  label: { token: 'labelMd', sizePt: 9 },
  body: { token: 'bodyMd', sizePt: 9 },
  bodyStrong: { familyIntent: 'text', fontWeight: fontWeights.bold, sizePt: 9 },
  caption: { token: 'bodySm', sizePt: 8 },
  micro: { familyIntent: 'text', fontWeight: fontWeights.regular, sizePt: 7 },
  overline: { token: 'overline', sizePt: 7, caps: true },
  numericId: { token: 'numericId', sizePt: 9 },
  numericAmount: { token: 'numericAmount', sizePt: 11 },
  kpiValue: { token: 'kpiValue', sizePt: 14 }
}

/** Familia → intent leyendo el SoT (no string-match frágil duplicado). */
const intentForToken = (token: TypographyTokenName): PdfFamilyIntent =>
  typographyScale[token].fontFamily === fontFamilies.display ? 'display' : 'text'

const weightForToken = (token: TypographyTokenName): number =>
  typographyScale[token].fontWeight

/**
 * Mapea (intent, peso del SoT) → nombre de familia REGISTRADO en
 * register-fonts.ts. Aquí se consumen las familias 600/800 de TASK-1040
 * (section-titles `Geist SemiBold`, KPI/display `*ExtraBold`).
 *
 * Display = Poppins; text = Geist. Si un peso no tiene archivo registrado,
 * cae a la variante más cercana disponible (react-pdf a su vez cae a
 * Helvetica si la familia entera falta — degradación segura).
 */
export const pdfFamilyName = (intent: PdfFamilyIntent, weight: number): string => {
  if (intent === 'display') {
    if (weight >= fontWeights.extrabold) return 'Poppins ExtraBold'
    if (weight >= fontWeights.bold) return 'Poppins Bold'
    if (weight >= fontWeights.semibold) return 'Poppins' // 'Poppins' registrado = SemiBold 600
    if (weight >= fontWeights.medium) return 'Poppins Medium'

    return 'Poppins'
  }

  if (weight >= fontWeights.extrabold) return 'Geist ExtraBold'
  if (weight >= fontWeights.bold) return 'Geist Bold'
  if (weight >= fontWeights.semibold) return 'Geist SemiBold'
  if (weight >= fontWeights.medium) return 'Geist Medium'

  return 'Geist'
}

const buildRole = (spec: PdfRoleSpec): PdfTextStyle => {
  const intent = spec.token ? intentForToken(spec.token) : (spec.familyIntent ?? 'text')
  const weight = spec.token ? weightForToken(spec.token) : (spec.fontWeight ?? fontWeights.regular)

  const style: PdfTextStyle = {
    fontFamily: pdfFamilyName(intent, weight),
    fontSize: spec.sizePt
  }

  // letter-spacing del SoT (em) → pt del documento, solo overline (caps).
  if (spec.caps) {
    style.letterSpacing = parseFloat(letterSpacings.caps) * spec.sizePt
  }

  return style
}

/**
 * Tipografía PDF por rol semántico, derivada del SoT.
 *
 * Pura + memoizable (los inputs del SoT son constantes en runtime), pero se
 * computa cada llamada por simplicidad — es barato. Cuando el SoT cambia un
 * peso o la asignación de familia de un rol, el output del adapter cambia sin
 * tocar este archivo; cambiar el TAMAÑO sí es decisión explícita del medio.
 */
export const getPdfTypography = (): PdfTypography => {
  const out = {} as PdfTypography

  for (const role of Object.keys(PDF_ROLE_SPECS) as PdfTypographyRole[]) {
    out[role] = buildRole(PDF_ROLE_SPECS[role])
  }

  return out
}
