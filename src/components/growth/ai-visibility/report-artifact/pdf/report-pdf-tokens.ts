import 'server-only'

import { axisSemanticHex } from '@core/theme/axis-semantic'

/**
 * TASK-1273 — AI Visibility Report PDF · tokens.
 *
 * Mapeo de los tokens del report artifact al modelo de `@react-pdf/renderer`
 * (StyleSheet NO soporta CSS vars / oklch / container queries). Fuente visual:
 * `docs/research/mockups/ai-visibility-report-pdf-mockup.html` (v5, aprobado).
 *
 *  - Feedback semántico ← `axisSemanticHex` (AXIS SoT) — NO hex inventado.
 *  - Navy/accent/neutrales = paleta de marca Efeonce, idéntica a la usada por el
 *    PDF institucional (`src/lib/finance/pdf/tokens.ts` PdfColors). Se declaran
 *    acá como constantes PDF-local (PDFs son fuente legítima de HEX crudo).
 *  - Familias = nombres registrados en `src/lib/finance/pdf/register-fonts.ts`
 *    (Geist body + Poppins display + los 4 pesos del eslogan).
 */

export const ReportPdfColors = {
  navy: '#023c70', // Efeonce navy — backbone
  navyDeep: '#022a4f', // cover gradient end
  accent: '#0375db', // Efeonce blue — bars + accent
  text: '#2F2B3D',
  muted: '#6E6B7B',
  subtle: '#A5A3AE',
  surface: '#F8F7FA',
  divider: '#E4E5EB',
  track: '#ECEAF0',
  paper: '#FFFFFF',
  // Semantic feedback — AXIS SoT (no hex inventado).
  success: axisSemanticHex.success,
  warning: axisSemanticHex.warning,
  error: axisSemanticHex.error,
  // Amber `warning` (#ffb703) falla contraste como texto sobre claro → ink oscuro
  // derivado para cifras/labels de severidad "atención" (AA sobre paper).
  warningInk: '#8a6200',
  // On-navy translucents (cover).
  onNavyStrong: 'rgba(255,255,255,0.78)',
  onNavyMuted: 'rgba(255,255,255,0.55)',
  onNavyFaint: 'rgba(255,255,255,0.5)',
  onNavyTrack: 'rgba(255,255,255,0.16)'
} as const

/** Familias registradas por `ensurePdfFontsRegistered` (register-fonts.ts). */
export const ReportPdfFonts = {
  body: 'Geist', // 400
  bodyMedium: 'Geist Medium', // 500
  bodySemibold: 'Geist SemiBold', // 600
  bodyBold: 'Geist Bold', // 700
  display: 'Poppins', // 600 (SemiBold — section titles)
  displayBold: 'Poppins Bold', // 700 (cover org)
  displayExtra: 'Poppins ExtraBold' // 800 (hero score)
} as const

export const ReportPdfPage = {
  width: 595,
  height: 842,
  padX: 46,
  padTop: 44,
  padBottom: 66
} as const
