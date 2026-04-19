'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import { GH_PRICING } from '@/config/greenhouse-nomenclature'

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'expired'

const STATUS_META: Record<
  QuoteStatus,
  { label: string; color: 'secondary' | 'info' | 'success' | 'error'; icon: string }
> = {
  draft: { label: GH_PRICING.identityStrip.draftLabel, color: 'secondary', icon: 'tabler-circle-dashed' },
  sent: { label: GH_PRICING.identityStrip.sentLabel, color: 'info', icon: 'tabler-send' },
  approved: { label: GH_PRICING.identityStrip.approvedLabel, color: 'success', icon: 'tabler-circle-check' },
  expired: { label: GH_PRICING.identityStrip.expiredLabel, color: 'error', icon: 'tabler-circle-x' }
}

export interface QuoteIdentityStripProps {
  breadcrumbs: Array<{ label: string; href?: string }>
  title: string
  subtitle?: string
  quoteNumber?: string | null
  status: QuoteStatus
  actions?: ReactNode

  /** Sticky top offset (for MUI AppBar spacing). Default 0 */
  stickyOffset?: number
}

/**
 * Row 1 del patron Command Bar: identidad del documento + CTAs principales.
 * Sticky top del viewport con el logo de Greenhouse, titulo del quote, numero
 * (si ya existe) o 'Q-NUEVO', chip de estado, validez, y botonera de acciones
 * (cancelar / preview / save).
 */
const QuoteIdentityStrip = ({
  breadcrumbs,
  title,
  subtitle,
  quoteNumber,
  status,
  actions,
  stickyOffset = 0
}: QuoteIdentityStripProps) => {
  const statusMeta = STATUS_META[status]

  return (
    <Box
      component='header'
      role='banner'
      aria-label={GH_PRICING.identityStrip.ariaLabel}
      sx={theme => ({
        position: 'sticky',
        top: stickyOffset,
        zIndex: theme.zIndex.appBar - 1,
        backgroundColor: alpha(theme.palette.background.paper, 0.92),
        backdropFilter: 'saturate(180%) blur(8px)',
        WebkitBackdropFilter: 'saturate(180%) blur(8px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        py: 2,
        px: { xs: 2, md: 3 }
      })}
    >
      <Stack spacing={1.25}>
        {breadcrumbs.length > 0 ? (
          <Breadcrumbs
            separator={<Box component='span' sx={{ color: 'text.disabled' }}>›</Box>}
            sx={{ '& ol': { flexWrap: 'nowrap' } }}
          >
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1

              return isLast || !crumb.href ? (
                <Typography
                  key={idx}
                  variant='caption'
                  color={isLast ? 'text.primary' : 'text.secondary'}
                  sx={{ fontWeight: isLast ? 600 : 400 }}
                >
                  {crumb.label}
                </Typography>
              ) : (
                <Link key={idx} href={crumb.href} underline='hover' variant='caption' color='text.secondary'>
                  {crumb.label}
                </Link>
              )
            })}
          </Breadcrumbs>
        ) : null}

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 1.5, md: 2 }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent='space-between'
        >
          <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap sx={{ minWidth: 0 }}>
            <Box
              sx={theme => ({
                width: 40,
                height: 40,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                color: theme.palette.primary.main,
                flexShrink: 0
              })}
              aria-hidden='true'
            >
              <i className='tabler-file-invoice' style={{ fontSize: 22 }} />
            </Box>
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
                <Typography
                  component='h1'
                  variant='h5'
                  sx={{
                    fontWeight: 600,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {title}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{
                    fontFamily: 'monospace',
                    color: 'text.secondary',
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    backgroundColor: 'action.hover'
                  }}
                >
                  {quoteNumber ?? GH_PRICING.identityStrip.numberPlaceholder}
                </Typography>
                <CustomChip
                  round='true'
                  size='small'
                  variant='tonal'
                  color={statusMeta.color}
                  icon={<i className={statusMeta.icon} aria-hidden='true' style={{ fontSize: 14 }} />}
                  label={statusMeta.label}
                />
              </Stack>
              {subtitle ? (
                <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.3 }}>
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>
          </Stack>

          {actions ? (
            <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
              {actions}
            </Stack>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  )
}

export default QuoteIdentityStrip
