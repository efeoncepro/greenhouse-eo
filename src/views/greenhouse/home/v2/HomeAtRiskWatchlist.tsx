'use client'

import { useEffect, useRef } from 'react'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'
import type { ThemeColor } from '@core/types'

import { motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

import type { AtRiskItem, AtRiskKind, HomeAtRiskWatchlistData } from '@/lib/home/contract'
import { formatTime as formatGreenhouseTime } from '@/lib/format'

interface HomeAtRiskWatchlistProps {
  data: HomeAtRiskWatchlistData
}

const KIND_META: Record<AtRiskKind, { icon: string; color: ThemeColor }> = {
  space: { icon: 'tabler-building', color: 'info' },
  invoice: { icon: 'tabler-receipt', color: 'warning' },
  member: { icon: 'tabler-user-exclamation', color: 'info' },
  project: { icon: 'tabler-folder-exclamation', color: 'primary' }
}

const BAND_TONE: Record<AtRiskItem['riskBand'], { color: ThemeColor; label: string }> = {
  critical: { color: 'error', label: 'Crítico' },
  attention: { color: 'warning', label: 'Atención' },
  monitor: { color: 'secondary', label: 'Monitor' }
}

interface AtRiskRowProps {
  item: AtRiskItem
  index: number
  active: boolean
  onActivate: (item: AtRiskItem) => void
}

const AtRiskRow = ({ item, index, active, onActivate }: AtRiskRowProps) => {
  const reduced = useReducedMotion()
  const meta = KIND_META[item.kind] ?? KIND_META.space
  const band = BAND_TONE[item.riskBand]
  const critical = item.riskBand === 'critical'

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={reduced ? undefined : { duration: 0.18, delay: 0.06 * index, ease: [0.2, 0, 0, 1] }}
    >
      <Tooltip title={`Última actualización · ${formatGreenhouseTime(new Date(), {
  hour: '2-digit',
  minute: '2-digit'
}, 'es-CL')}`} placement='left' arrow disableInteractive enterDelay={500}>
        <Box
          component='button'
          type='button'
          onClick={() => onActivate(item)}
          aria-label={`${item.title}, riesgo ${band.label} ${item.riskScore}, ${item.subtitle ?? ''}`}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            width: '100%',
            border: 0,
            background: 'transparent',
            textAlign: 'left',
            cursor: 'pointer',
            py: 1.25,
            px: 2,
            borderRadius: theme => theme.shape.customBorderRadius?.md ?? 6,
            transition: 'background-color 120ms cubic-bezier(0.2, 0, 0, 1)',
            outline: active ? '2px solid' : 'none',
            outlineColor: 'primary.main',
            outlineOffset: 2,
            '&:hover': { bgcolor: 'action.hover' },
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2
            }
          }}
        >
          <CustomAvatar skin='light' variant='rounded' color={meta.color} size={36}>
            <i className={classnames(meta.icon, 'text-[18px]')} />
          </CustomAvatar>
          <Stack flex={1} minWidth={0} spacing={0.25}>
            <Typography variant='body2' sx={{ fontWeight: 500 }} color='text.primary' noWrap>
              {item.title}
            </Typography>
            <Typography variant='caption' color='text.secondary' noWrap>
              {item.subtitle ?? ''}
            </Typography>
          </Stack>
          <Stack direction='row' spacing={1.5} alignItems='center'>
            {item.metric ? (
              <Stack alignItems='flex-end' spacing={0}>
                <Typography variant='caption' color='text.disabled' sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
                  {item.metric.label}
                </Typography>
                <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }} color='text.primary'>
                  {item.metric.value}
                </Typography>
              </Stack>
            ) : null}
            <Box
              sx={{
                position: 'relative',
                px: 1.25,
                py: 0.5,
                borderRadius: 9999,
                bgcolor: theme => `color-mix(in oklch, ${theme.palette[band.color].main} 14%, transparent)`,
                color: theme => theme.palette[band.color].main,
                fontVariantNumeric: 'tabular-nums',
                fontSize: 12,
                fontWeight: 600,
                minWidth: 36,
                textAlign: 'center',
                '&::after': critical
                  ? {
                      content: '""',
                      position: 'absolute',
                      inset: -3,
                      borderRadius: 9999,
                      bgcolor: theme => theme.palette[band.color].main,
                      opacity: 0.25,
                      animation: 'gh-atrisk-pulse 2.4s cubic-bezier(0.2, 0, 0, 1) infinite',
                      pointerEvents: 'none'
                    }
                  : undefined,
                '@media (prefers-reduced-motion: reduce)': { '&::after': { animation: 'none' } },
                '@keyframes gh-atrisk-pulse': {
                  '0%': { transform: 'scale(1)', opacity: 0.25 },
                  '60%': { transform: 'scale(1.4)', opacity: 0 },
                  '100%': { transform: 'scale(1.4)', opacity: 0 }
                }
              }}
            >
              {item.riskScore}
            </Box>
            <i className='tabler-chevron-right text-[18px] text-textDisabled' aria-hidden />
          </Stack>
        </Box>
      </Tooltip>
    </motion.div>
  )
}

/**
 * Smart Home v2 — At-Risk Watchlist (role-aware Top 5).
 *
 * Pattern: Vuexy `Transactions` rows AS-IS. Linear "issues list" feel.
 * Header label changes by audience (Spaces / Cuentas con AR vencido /
 * Colaboradores con sobrecarga / Proyectos atrasados).
 *
 * Keyboard nav: J/K next-prev, Enter to drill — Linear pattern. Active
 * row gets a 2px primary outline. The composer's capability gate has
 * already filtered the block by role (`home.atrisk.{spaces|invoices|
 * members|projects}`).
 */
export const HomeAtRiskWatchlist = ({ data }: HomeAtRiskWatchlistProps) => {
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement>(null)

  const handleActivate = (item: AtRiskItem) => {
    if (!item.href) return
    type DocVT = Document & { startViewTransition?: (cb: () => void) => unknown }
    const docVT = document as DocVT

    if (typeof docVT.startViewTransition === 'function') {
      docVT.startViewTransition(() => router.push(item.href!))
    } else {
      router.push(item.href)
    }
  }

  // J/K keyboard nav while focus is inside the card
  useEffect(() => {
    const root = cardRef.current

    if (!root) return

    const handler = (event: KeyboardEvent) => {
      if (!root.contains(document.activeElement)) return
      if (!['j', 'k', 'J', 'K'].includes(event.key)) return
      event.preventDefault()

      const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button[type="button"]'))
      const currentIdx = buttons.indexOf(document.activeElement as HTMLButtonElement)

      const next =
        event.key.toLowerCase() === 'j'
          ? Math.min(buttons.length - 1, currentIdx + 1)
          : Math.max(0, currentIdx - 1)

      buttons[next]?.focus()
    }

    document.addEventListener('keydown', handler)

    return () => document.removeEventListener('keydown', handler)
  }, [])

  const empty = data.items.length === 0

  return (
    <Card component='section' aria-label={data.domainLabel} ref={cardRef}>
      <CardHeader
        avatar={<CustomAvatar variant='rounded' skin='light' color={empty ? 'success' : 'error'} size={36}><i className={classnames(empty ? 'tabler-shield-check' : 'tabler-alert-triangle', 'text-[20px]')} /></CustomAvatar>}
        title={data.domainLabel}
        subheader={empty ? 'Sin items en riesgo' : `Top ${data.items.length} priorizado por score · J/K para navegar`}
        titleTypographyProps={{ variant: 'h5' }}
        action={<OptionMenu options={['Ver todos', 'Configurar criterios', 'Exportar']} />}
        sx={{ '& .MuiCardHeader-avatar': { mr: 3 } }}
      />
      <CardContent sx={{ pt: 0, pb: 1, px: 1 }}>
        {empty ? (
          <Box role='status' aria-live='polite' sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, px: 2, color: 'text.secondary' }}>
            <CustomAvatar skin='light' variant='rounded' color='success' size={32}>
              <i className='tabler-check text-[18px]' />
            </CustomAvatar>
            <Typography variant='body2'>Sin riesgos detectados. Tu operación está al día.</Typography>
          </Box>
        ) : (
          <Stack spacing={0}>
            {data.items.map((item, idx) => (
              <AtRiskRow key={item.itemId} item={item} index={idx} active={false} onActivate={handleActivate} />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

export default HomeAtRiskWatchlist
