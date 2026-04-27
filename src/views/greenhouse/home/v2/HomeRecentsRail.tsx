'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useRouter } from 'next/navigation'

import CustomAvatar from '@core/components/mui/Avatar'
import type { ThemeColor } from '@core/types'

import { motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

import type { HomeRecentItem, HomeRecentsRailData } from '@/lib/home/contract'

interface HomeRecentsRailProps {
  data: HomeRecentsRailData
}

const ICON_FOR_KIND: Record<string, { icon: string; color: ThemeColor }> = {
  project: { icon: 'tabler-folders', color: 'primary' },
  quote: { icon: 'tabler-file-text', color: 'warning' },
  client: { icon: 'tabler-building', color: 'info' },
  invoice: { icon: 'tabler-receipt', color: 'success' },
  payroll_period: { icon: 'tabler-calendar-check', color: 'primary' },
  task: { icon: 'tabler-checklist', color: 'primary' },
  space: { icon: 'tabler-building', color: 'info' },
  view: { icon: 'tabler-layout', color: 'secondary' },
  report: { icon: 'tabler-report', color: 'info' }
}

const formatRelativeTime = (iso: string): string => {
  const target = new Date(iso).getTime()

  if (Number.isNaN(target)) return ''
  const diffSeconds = Math.max(1, Math.floor((Date.now() - target) / 1000))

  if (diffSeconds < 60) return `hace ${diffSeconds}s`
  const minutes = Math.floor(diffSeconds / 60)

  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)

  if (days < 30) return `hace ${days} d`

  return new Date(iso).toLocaleDateString('es-CL', { dateStyle: 'medium' })
}

const RecentItemRow = ({ item, index }: { item: HomeRecentItem; index: number }) => {
  const router = useRouter()
  const reduced = useReducedMotion()
  const meta = ICON_FOR_KIND[item.entityKind] ?? { icon: 'tabler-link', color: 'secondary' as ThemeColor }

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, x: -8 }}
      animate={reduced ? undefined : { opacity: 1, x: 0 }}
      transition={reduced ? undefined : { duration: 0.18, delay: 0.04 * index, ease: [0.2, 0, 0, 1] }}
    >
      <Stack
        direction='row'
        alignItems='center'
        spacing={1.5}
        sx={{
          py: 1,
          px: 1.5,
          borderRadius: theme => theme.shape.customBorderRadius?.md ?? 6,
          cursor: 'pointer',
          transition: 'background-color 120ms cubic-bezier(0.2, 0, 0, 1)',
          '&:hover': { backgroundColor: 'action.hover' }
        }}
        onClick={() => router.push(item.href)}
      >
        <CustomAvatar skin='light' color={meta.color} size={28}>
          <i className={meta.icon} style={{ fontSize: 14 }} />
        </CustomAvatar>
        <Stack flex={1} minWidth={0} spacing={0}>
          <Typography variant='body2' noWrap sx={{ fontWeight: 500 }}>{item.title}</Typography>
          <Typography variant='caption' color='text.secondary' noWrap>
            {formatRelativeTime(item.lastSeenAt)}
            {item.badge ? ` · ${item.badge}` : null}
          </Typography>
        </Stack>
      </Stack>
    </motion.div>
  )
}

export const HomeRecentsRail = ({ data }: HomeRecentsRailProps) => {
  const hasItems = data.items.length > 0
  const hasDrafts = data.draftItems.length > 0

  if (!hasItems && !hasDrafts) return null

  return (
    <Card component='aside' aria-label='Continúa donde lo dejaste' variant='outlined'>
      <CardHeader
        title={
          <Stack direction='row' alignItems='center' spacing={1.5}>
            <CustomAvatar variant='rounded' skin='light' color='secondary' size={28}>
              <i className='tabler-history' style={{ fontSize: 14 }} />
            </CustomAvatar>
            <Typography variant='subtitle2'>Continúa donde lo dejaste</Typography>
          </Stack>
        }
        sx={{ pb: 0.5 }}
      />
      <CardContent sx={{ pt: 1, px: 0.5 }}>
        {hasItems ? (
          <Stack spacing={0}>
            {data.items.map((item, index) => (
              <RecentItemRow key={item.recentId} item={item} index={index} />
            ))}
          </Stack>
        ) : null}
        {hasDrafts ? (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant='caption' color='text.secondary' sx={{ px: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Borradores
            </Typography>
            <Stack spacing={0} sx={{ mt: 0.5 }}>
              {data.draftItems.map((item, index) => (
                <RecentItemRow key={item.recentId} item={item} index={index} />
              ))}
            </Stack>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default HomeRecentsRail
