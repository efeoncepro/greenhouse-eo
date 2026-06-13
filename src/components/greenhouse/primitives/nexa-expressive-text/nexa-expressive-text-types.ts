import type { SxProps, Theme } from '@mui/material/styles'
import type { TypographyProps } from '@mui/material/Typography'

export type NexaExpressiveTextStyle =
  | 'plain'
  | 'strong'
  | 'emphasis'
  | 'soft'
  | 'metric'
  | 'positive'
  | 'warning'
  | 'danger'

/** Fuente citada inline (span-level), estilo Google AI Mode: el marcador [n] abre un
 *  evidence-peek con título, fragmento y score. La cita carga su fuente inline (sin
 *  context/threading) — el generador de la respuesta la emite junto al texto. */
export interface NexaCitationSource {
  id: string
  /** Marcador visible, p.ej. "1". */
  label: string
  title: string
  headingPath?: string[]
  excerpt: string
  /** 0–1; se muestra como "0.92". */
  score?: number
  freshness?: 'current' | 'recent' | 'stale'
  /** URL humana de la fuente (Abrir fuente). */
  href?: string
}

export type NexaExpressiveTextSegment =
  | {
      type?: 'text'
      text: string
      style?: NexaExpressiveTextStyle
    }
  | {
      type: 'emoji'
      value: string
      label?: string
    }
  | {
      type: 'break'
    }
  | {
      type: 'citation'
      source: NexaCitationSource
    }

export type NexaExpressiveTextValue = string | NexaExpressiveTextSegment[]

export interface NexaExpressiveTextProps {
  value: NexaExpressiveTextValue
  variant?: TypographyProps['variant']
  color?: TypographyProps['color']
  component?: TypographyProps['component']
  sx?: SxProps<Theme>
}
