'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import { GH_PRICING } from '@/lib/copy/pricing'

export type QuoteStatus = 'draft' | 'pending_approval' | 'approval_rejected' | 'issued' | 'sent' | 'approved' | 'expired' | 'converted'

const STATUS_META: Record<
  QuoteStatus,
  { label: string; color: 'warning' | 'info' | 'success' | 'error' | 'primary'; icon: string }
> = {
  draft: { label: GH_PRICING.identityStrip.draftLabel, color: 'primary', icon: 'tabler-pencil' },
  pending_approval: { label: 'En aprobación', color: 'warning', icon: 'tabler-shield-check' },
  approval_rejected: { label: 'Revisión requerida', color: 'error', icon: 'tabler-shield-x' },
  issued: { label: 'Emitida', color: 'info', icon: 'tabler-file-check' },
  sent: { label: GH_PRICING.identityStrip.sentLabel, color: 'info', icon: 'tabler-send' },
  approved: { label: 'Emitida', color: 'info', icon: 'tabler-file-check' },
  expired: { label: GH_PRICING.identityStrip.expiredLabel, color: 'error', icon: 'tabler-circle-x' },
  converted: { label: 'Facturada', color: 'primary', icon: 'tabler-receipt-2' }
}

export interface QuoteIdentityStripProps {
  breadcrumbs: Array<{ label: string; href?: string }>
  title: string
  subtitle?: string
  quoteNumber?: string | null
  status: QuoteStatus
  centerSlot?: ReactNode
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
  centerSlot,
  actions,
  stickyOffset = 0
}: QuoteIdentityStripProps) => {
  const statusMeta = STATUS_META[status]

  return (
    <Box
      component='header'
      role='banner'
      aria-label={GH_PRICING.identityStrip.ariaLabel}
      data-capture='quote-identity-strip'
      sx={theme => ({
        position: { xs: 'static', md: 'sticky' },
        top: { md: stickyOffset },
        zIndex: theme.zIndex.appBar - 1,
        backgroundColor: alpha(theme.palette.background.paper, 0.92),
        backdropFilter: 'saturate(180%) blur(8px)',
        WebkitBackdropFilter: 'saturate(180%) blur(8px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        pt: 1.5,
        pb: 1.85,
        px: { xs: 2, md: 3 }
      })}
    >
      <Stack spacing={1}>
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

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: centerSlot
                ? 'minmax(390px, 1fr) minmax(340px, 420px) max-content'
                : 'minmax(0, 1fr) max-content',
              xl: centerSlot
                ? 'minmax(430px, 1fr) minmax(460px, 560px) minmax(260px, 1fr)'
                : 'minmax(0, 1fr) max-content'
            },
            alignItems: { xs: 'flex-start', lg: 'center' },
            columnGap: { xs: 1.5, lg: 2.5, xl: 3 },
            rowGap: { xs: 1.5, lg: 1 },
            minWidth: 0
          }}
        >
          <Stack
            direction='row'
            spacing={1.5}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            sx={{ minWidth: 0 }}
          >
            <Box
              sx={theme => ({
                width: 40,
                height: 40,
                borderRadius: `${theme.shape.customBorderRadius.lg}px`,
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
            <Stack spacing={0.35} sx={{ minWidth: 0 }}>
              <Typography
                component='h1'
                variant='surfaceHeroTitle'
                sx={{
                  whiteSpace: { xs: 'normal', sm: 'nowrap' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  overflowWrap: 'anywhere'
                }}
              >
                {title}
              </Typography>
              <Stack direction='row' spacing={0.75} alignItems='center' flexWrap='wrap' useFlexGap>
                <Tooltip
                  title={quoteNumber ? '' : 'El número se asigna automáticamente al guardar'}
                  placement='bottom-start'
                  arrow
                  disableInteractive
                >
                  <Typography
                    variant='monoId'
                    sx={{
                      color: 'text.secondary',
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      backgroundColor: 'action.hover',
                      cursor: quoteNumber ? 'default' : 'help'
                    }}
                  >
                    {quoteNumber ?? GH_PRICING.identityStrip.numberPlaceholder}
                  </Typography>
                </Tooltip>
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
                <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.35 }}>
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>
          </Stack>

          {centerSlot ? (
            <Box
              sx={{
                justifySelf: { xs: 'stretch', lg: 'center' },
                minWidth: 0,
                width: { xs: '100%', lg: '100%' },
                maxWidth: { xs: '100%', lg: 420, xl: 560 }
              }}
            >
              {centerSlot}
            </Box>
          ) : null}

          {actions ? (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}
              flexWrap={{ xs: 'wrap', sm: 'nowrap' }}
              useFlexGap
              sx={{
                justifySelf: { xs: 'stretch', lg: 'end' },
                flexShrink: 0,
                minWidth: 0,
                width: { xs: '100%', sm: 'auto' },
                '& .MuiButton-root': {
                  width: { xs: '100%', sm: 'auto' }
                }
              }}
            >
              {actions}
            </Stack>
          ) : null}
        </Box>
      </Stack>
    </Box>
  )
}

export default QuoteIdentityStrip
