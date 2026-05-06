'use client'

import { type ReactNode } from 'react'

import Avatar from '@mui/material/Avatar'
import CardHeader from '@mui/material/CardHeader'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import type { ThemeColor } from '@core/types'

export type CardHeaderBadgeColor = ThemeColor
export type CardHeaderBadgeVariant = 'tonal' | 'outlined' | 'filled'

export interface CardHeaderWithBadgeProps {
  /** Title — string para render canónico h6 + badge, o ReactNode custom. */
  title: ReactNode

  /** Valor del badge (ej. count de items, status, etc.). Se stringifica. */
  badgeValue: string | number

  /** Color semántico del badge. Default 'primary'. */
  badgeColor?: CardHeaderBadgeColor

  /** Variant del badge. Default 'tonal'. */
  badgeVariant?: CardHeaderBadgeVariant

  /** ARIA label para el badge — útil cuando el valor es numérico solo. */
  badgeAriaLabel?: string

  /** Subtitle / subheader text bajo el title. */
  subheader?: ReactNode

  /** Tabler icon className — render como avatar rounded primary.lightOpacity. */
  avatarIcon?: string

  /** Override del color del icono — default usa CSS var primary.main. */
  avatarIconColor?: string

  /** Action slot — typically OptionMenu, IconButton, ToolBar. */
  action?: ReactNode
}

/**
 * Card header con title + badge inline. Pattern enterprise (Linear / Notion /
 * Stripe Billing): identifica la sección + comunica scale (count) en un solo
 * phrase visual.
 *
 * Render canónico:
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  [icon]   Título de la sección  [12]                    │
 *   │           Subtitle opcional               [action menu]  │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Reusable platform-wide. NO importa lógica de dominio. El consumer decide
 * el badgeColor (no se deriva de count automáticamente — la semántica del
 * "0 = secondary, n>0 = primary" es decisión del dominio, no del primitive).
 */
const CardHeaderWithBadge = ({
  title,
  badgeValue,
  badgeColor = 'primary',
  badgeVariant = 'tonal',
  badgeAriaLabel,
  subheader,
  avatarIcon,
  avatarIconColor = 'var(--mui-palette-primary-main)',
  action
}: CardHeaderWithBadgeProps) => {
  const renderedTitle = typeof title === 'string' || typeof title === 'number'
    ? (
        <Stack direction='row' spacing={1} alignItems='center'>
          <Typography variant='h6' sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <CustomChip
            round='true'
            size='small'
            variant={badgeVariant}
            color={badgeColor}
            label={String(badgeValue)}
            aria-label={badgeAriaLabel}
          />
        </Stack>
      )
    : title

  return (
    <CardHeader
      title={renderedTitle}
      subheader={subheader}
      avatar={
        avatarIcon ? (
          <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity', width: 40, height: 40 }}>
            <i className={avatarIcon} style={{ fontSize: 20, color: avatarIconColor }} aria-hidden='true' />
          </Avatar>
        ) : undefined
      }
      action={action}
    />
  )
}

export default CardHeaderWithBadge
