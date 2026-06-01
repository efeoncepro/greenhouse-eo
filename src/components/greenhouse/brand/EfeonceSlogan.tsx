import Box from '@mui/material/Box'

import { EFEONCE_SLOGAN_COLOR, EFEONCE_SLOGAN_PARTS, EFEONCE_SLOGAN_TEXT } from '@/config/efeonce-brand'

/**
 * Efeonce slogan "Empower your Growth" for web surfaces — a brand-zone element
 * (headers, mastheads, brand strips), NOT a legal footer line.
 *
 * Typography contract (per operator + DESIGN.md):
 *   - "Empower" → Poppins ExtraBold Italic (800 italic)
 *   - "your"    → Poppins ExtraBold        (800)
 *   - "Growth"  → Poppins Black Italic      (900 italic)
 *
 * Renders each word with its own weight/style. Requires the web Poppins face to
 * include weights 800 + 900 with italics (the global font loading); the PDF
 * variant (src/lib/finance/pdf/efeonce-slogan-pdf.tsx) embeds the exact .ttf.
 */

interface EfeonceSloganProps {
  /** Font size (any CSS size; default '1.5rem'). */
  fontSize?: string | number
  /** Text color (default: canonical brand grey `#848484`). */
  color?: string
  className?: string
}

const FONT_POPPINS = 'Poppins, var(--font-poppins), sans-serif'

const EfeonceSlogan = ({ fontSize = '1.5rem', color = EFEONCE_SLOGAN_COLOR, className }: EfeonceSloganProps) => (
  <Box
    component='span'
    role='img'
    aria-label={EFEONCE_SLOGAN_TEXT}
    className={className}
    sx={{ fontFamily: FONT_POPPINS, fontSize, color, lineHeight: 1.1, whiteSpace: 'nowrap' }}
  >
    {EFEONCE_SLOGAN_PARTS.map((part, index) => (
      <Box
        key={part.text}
        component='span'
        aria-hidden
        sx={{
          fontFamily: FONT_POPPINS,
          fontWeight: part.weight,
          fontStyle: part.italic ? 'italic' : 'normal'
        }}
      >
        {index > 0 ? ' ' : ''}
        {part.text}
      </Box>
    ))}
  </Box>
)

export default EfeonceSlogan
