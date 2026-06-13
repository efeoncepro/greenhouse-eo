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

export type NexaExpressiveTextValue = string | NexaExpressiveTextSegment[]

export interface NexaExpressiveTextProps {
  value: NexaExpressiveTextValue
  variant?: TypographyProps['variant']
  color?: TypographyProps['color']
  component?: TypographyProps['component']
  sx?: SxProps<Theme>
}
