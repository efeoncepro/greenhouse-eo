import 'server-only'

import { Text } from '@react-pdf/renderer'

import { EFEONCE_SLOGAN_PARTS } from '@/config/efeonce-brand'

/**
 * Efeonce slogan "Empower your Growth" for react-pdf — a brand-zone element
 * (header / masthead), NOT the legal footer (see efeonce-pdf-footer.tsx).
 *
 * Typography contract (per operator + DESIGN.md), rendered with the Poppins
 * families registered in register-fonts.ts:
 *   - "Empower" → Poppins ExtraBold Italic (800 italic)
 *   - "your"    → Poppins ExtraBold        (800)
 *   - "Growth"  → Poppins Black Italic      (900 italic)
 *
 * Requires `ensurePdfFontsRegistered()` to have run (the PDF render path does).
 * Render inline inside a <View> next to the logo or as a brand line.
 */

const SLOGAN_FAMILY_BY_TEXT: Record<string, string> = Object.fromEntries(
  EFEONCE_SLOGAN_PARTS.map(part => [part.text, part.poppinsFamily])
)

export interface EfeonceSloganPdfProps {
  /** Font size in pt (default 12). */
  fontSize?: number
  /** Text color (default Efeonce ink). */
  color?: string
}

export const EfeonceSloganPdf = ({ fontSize = 12, color = '#1f2937' }: EfeonceSloganPdfProps) => (
  <Text style={{ fontSize, color }}>
    {EFEONCE_SLOGAN_PARTS.map((part, index) => (
      <Text
        key={part.text}
        style={{ fontFamily: SLOGAN_FAMILY_BY_TEXT[part.text] }}
      >
        {index > 0 ? ' ' : ''}
        {part.text}
      </Text>
    ))}
  </Text>
)

export default EfeonceSloganPdf
