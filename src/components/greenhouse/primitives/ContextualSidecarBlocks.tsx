'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import type { ThemeColor } from '@core/types'

export interface ContextualSidecarSignalProps {
  icon: string
  title: ReactNode
  description?: ReactNode
  color?: ThemeColor
  meta?: ReactNode
  secondaryMeta?: ReactNode
  action?: ReactNode
}

export interface ContextualSidecarMetric {
  label: ReactNode
  value: ReactNode
  helper?: ReactNode
  color?: ThemeColor
  icon?: string
}

export interface ContextualSidecarTimelineItem {
  id: string
  title: ReactNode
  meta?: ReactNode
  description?: ReactNode
  icon?: string
  color?: ThemeColor
}

export interface ContextualSidecarComparisonRow {
  id: string
  field: ReactNode
  sourceA: ReactNode
  sourceB: ReactNode
  status: ReactNode
  tone?: ThemeColor
  selected?: boolean
}

export interface ContextualSidecarRunbookStep {
  id: string
  index: number
  title: ReactNode
  description?: ReactNode
  status: ReactNode
  color?: ThemeColor
  active?: boolean
  disabled?: boolean
  meta?: ReactNode
}

const SOURCE_COMPARISON_ARIA_LABEL = 'Comparación de fuentes'

export const ContextualSidecarSection = ({
  title,
  subtitle,
  dense = false,
  children
}: {
  title?: ReactNode
  subtitle?: ReactNode
  dense?: boolean
  children: ReactNode
}) => (
  <Stack spacing={dense ? 2 : 3}>
    {title || subtitle ? (
      <Stack spacing={0.75}>
        {title ? (
          <Typography variant='body2' fontWeight={700}>
            {title}
          </Typography>
        ) : null}
        {subtitle ? (
          <Typography variant='caption' color='text.secondary'>
            {subtitle}
          </Typography>
        ) : null}
      </Stack>
    ) : null}
    {children}
  </Stack>
)

export const ContextualSidecarSignal = ({
  icon,
  title,
  description,
  color = 'primary',
  meta,
  secondaryMeta,
  action
}: ContextualSidecarSignalProps) => (
  <Box
    role='group'
    aria-label={typeof title === 'string' ? title : undefined}
    data-sidecar-block='signal'
    sx={theme => ({
      position: 'relative',
      overflow: 'hidden',
      border: `1px solid ${alpha(theme.palette[color].main, theme.palette.mode === 'dark' ? 0.36 : 0.22)}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      p: 4,
      bgcolor:
        theme.palette.mode === 'dark'
          ? alpha(theme.palette[color].main, 0.13)
          : `linear-gradient(135deg, ${alpha(theme.palette[color].main, 0.068)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 72%)`,
      boxShadow: `0 16px 44px ${alpha(theme.palette[color].main, theme.palette.mode === 'dark' ? 0.16 : 0.095)}`,
      transition: theme.transitions.create(['border-color', 'box-shadow', 'transform'], {
        duration: theme.transitions.duration.shorter,
        easing: 'cubic-bezier(0.2, 0, 0, 1)'
      }),
      '&:hover': {
        borderColor: alpha(theme.palette[color].main, theme.palette.mode === 'dark' ? 0.5 : 0.34),
        boxShadow: `0 18px 52px ${alpha(theme.palette[color].main, theme.palette.mode === 'dark' ? 0.2 : 0.12)}`,
        transform: 'translateY(-1px)'
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
        '&:hover': {
          transform: 'none'
        }
      }
    })}
  >
    <Stack direction='row' spacing={3} alignItems='flex-start'>
      <CustomAvatar
        skin='light'
        color={color}
        variant='rounded'
        sx={theme => ({
          width: 38,
          height: 38,
          boxShadow: `0 0 0 1px ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.08 : 0.72)}`
        })}
      >
        <i className={icon} aria-hidden='true' />
      </CustomAvatar>
      <Stack spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction='row' spacing={2} alignItems='flex-start' justifyContent='space-between'>
          <Typography variant='body2' fontWeight={800}>
            {title}
          </Typography>
          {meta || secondaryMeta ? (
            <Stack spacing={0.5} alignItems='flex-end' sx={{ flexShrink: 0 }}>
              {meta ? (
                <Typography variant='caption' color={`${color}.main`} fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {meta}
                </Typography>
              ) : null}
              {secondaryMeta ? (
                <Typography variant='caption' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {secondaryMeta}
                </Typography>
              ) : null}
            </Stack>
          ) : null}
        </Stack>
        {description ? (
          <Typography variant='body2' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
            {description}
          </Typography>
        ) : null}
        {action ? <Box>{action}</Box> : null}
      </Stack>
    </Stack>
  </Box>
)

export const ContextualSidecarMetricStrip = ({ items }: { items: ContextualSidecarMetric[] }) => (
  <Box
    role='list'
    data-sidecar-block='metric-strip'
    sx={theme => ({
      display: 'grid',
      gridTemplateColumns: {
        xs: '1fr',
        sm: `repeat(${items.length}, minmax(0, 1fr))`
      },
      border: `1px solid ${alpha(theme.palette.divider, 0.78)}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      overflow: 'hidden',
      bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.72 : 0.92),
      boxShadow: `0 14px 38px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.24 : 0.055)}`
    })}
  >
    {items.map((item, index) => (
      <Box
        key={index}
        role='listitem'
        sx={theme => ({
          position: 'relative',
          p: 3,
          minWidth: 0,
          borderInlineStart: { xs: 0, sm: index === 0 ? 0 : `1px solid ${alpha(theme.palette.divider, 0.72)}` },
          borderBlockStart: { xs: index === 0 ? 0 : `1px solid ${alpha(theme.palette.divider, 0.72)}`, sm: 0 },
          transition: theme.transitions.create(['background-color'], {
            duration: theme.transitions.duration.shorter,
            easing: 'cubic-bezier(0.2, 0, 0, 1)'
          }),
          '&:hover': {
            bgcolor: alpha(theme.palette[item.color ?? 'primary'].main, theme.palette.mode === 'dark' ? 0.08 : 0.032)
          }
        })}
      >
        <Stack direction='row' spacing={2} alignItems='center'>
          {item.icon ? (
            <CustomAvatar skin='light' color={item.color ?? 'secondary'} variant='rounded' sx={{ width: 26, height: 26 }}>
              <i className={item.icon} aria-hidden='true' />
            </CustomAvatar>
          ) : null}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='caption' color='text.secondary'>
              {item.label}
            </Typography>
            <Typography
              variant='h5'
              color={item.color ? `${item.color}.main` : 'text.primary'}
              sx={{ mt: 0.5, fontVariantNumeric: 'tabular-nums' }}
            >
              {item.value}
            </Typography>
          </Box>
        </Stack>
        {item.helper ? (
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1, overflowWrap: 'anywhere' }}>
            {item.helper}
          </Typography>
        ) : null}
      </Box>
    ))}
  </Box>
)

export const ContextualSidecarTimeline = ({ items }: { items: ContextualSidecarTimelineItem[] }) => (
  <Stack spacing={0} role='list' data-sidecar-block='timeline'>
    {items.map((item, index) => (
      <Stack key={item.id} direction='row' spacing={3} alignItems='flex-start' role='listitem'>
        <Stack alignItems='center' sx={{ pt: 0.25 }}>
          <CustomAvatar
            skin='light'
            color={item.color ?? 'primary'}
            sx={theme => ({
              width: 30,
              height: 30,
              boxShadow: `0 0 0 4px ${alpha(theme.palette[item.color ?? 'primary'].main, theme.palette.mode === 'dark' ? 0.08 : 0.045)}`
            })}
          >
            <i className={item.icon ?? 'tabler-circle-dot'} aria-hidden='true' />
          </CustomAvatar>
          {index < items.length - 1 ? (
            <Box
              sx={theme => ({
                width: 2,
                minHeight: 34,
                my: 1,
                borderRadius: 999,
                bgcolor: alpha(theme.palette[item.color ?? 'primary'].main, theme.palette.mode === 'dark' ? 0.34 : 0.22)
              })}
            />
          ) : null}
        </Stack>
        <Box sx={{ minWidth: 0, flex: 1, pb: index < items.length - 1 ? 3 : 0 }}>
          <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between'>
            <Typography variant='body2' fontWeight={800}>
              {item.title}
            </Typography>
            {item.meta ? (
              <CustomChip size='small' variant='tonal' color={item.color ?? 'secondary'} label={item.meta} />
            ) : null}
          </Stack>
          {item.description ? (
            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
              {item.description}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    ))}
  </Stack>
)

export const ContextualSidecarComparisonRows = ({
  rows,
  sourceALabel = 'Fuente A',
  sourceBLabel = 'Fuente B'
}: {
  rows: ContextualSidecarComparisonRow[]
  sourceALabel?: ReactNode
  sourceBLabel?: ReactNode
}) => (
  <Box
    role='table'
    aria-label={SOURCE_COMPARISON_ARIA_LABEL}
    data-sidecar-block='comparison'
      sx={theme => ({
        border: `1px solid ${alpha(theme.palette.divider, 0.78)}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        overflow: 'hidden',
      bgcolor: 'background.paper',
      boxShadow: `0 14px 38px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.24 : 0.052)}`
    })}
  >
    <Box
      role='row'
      sx={theme => ({
        display: 'grid',
        gridTemplateColumns: '0.86fr 1fr 1fr 0.78fr',
        gap: 2,
        px: 3,
          py: 2,
          bgcolor: alpha(theme.palette.action.hover, theme.palette.mode === 'dark' ? 0.36 : 0.62),
        borderBlockEnd: `1px solid ${alpha(theme.palette.divider, 0.72)}`
      })}
    >
      {['Campo', sourceALabel, sourceBLabel, 'Estado'].map(item => (
        <Typography key={String(item)} role='columnheader' variant='caption' color='text.secondary' fontWeight={800}>
          {item}
        </Typography>
      ))}
    </Box>
    {rows.map((row, index) => (
      <Box
        key={row.id}
        role='row'
        tabIndex={0}
        aria-selected={row.selected ? 'true' : undefined}
        sx={theme => ({
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '0.86fr 1fr 1fr 0.78fr',
          gap: 2,
          alignItems: 'center',
          px: 3,
          py: 2.5,
          borderBlockStart: index === 0 ? 0 : `1px solid ${alpha(theme.palette.divider, 0.58)}`,
          bgcolor: row.selected ? alpha(theme.palette[row.tone ?? 'primary'].main, theme.palette.mode === 'dark' ? 0.14 : 0.05) : 'transparent',
          boxShadow: row.selected
            ? `inset 4px 0 0 ${theme.palette[row.tone ?? 'primary'].main}, 0 10px 24px ${alpha(theme.palette[row.tone ?? 'primary'].main, 0.1)}`
            : 'none',
          outline: 0,
          transition: theme.transitions.create(['background-color', 'box-shadow', 'transform'], {
            duration: theme.transitions.duration.shorter,
            easing: 'cubic-bezier(0.2, 0, 0, 1)'
          }),
          '&:hover': {
            bgcolor: row.selected
              ? alpha(theme.palette[row.tone ?? 'primary'].main, theme.palette.mode === 'dark' ? 0.16 : 0.065)
              : alpha(theme.palette.action.hover, 0.5),
            transform: 'translateX(1px)'
          },
          '&:focus-visible': {
            boxShadow: `inset 0 0 0 2px ${alpha(theme.palette.primary.main, 0.62)}`
          },
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
            '&:hover': {
              transform: 'none'
            }
          }
        })}
      >
        <Typography role='cell' variant='caption' fontWeight={800}>
          {row.field}
        </Typography>
        <Typography role='cell' variant='caption' sx={{ overflowWrap: 'anywhere', fontVariantNumeric: 'tabular-nums' }}>
          {row.sourceA}
        </Typography>
        <Typography role='cell' variant='caption' sx={{ overflowWrap: 'anywhere', fontVariantNumeric: 'tabular-nums' }}>
          {row.sourceB}
        </Typography>
        <Box role='cell'>
          <CustomChip round='true' size='small' variant='tonal' color={row.tone ?? 'success'} label={row.status} />
        </Box>
      </Box>
    ))}
  </Box>
)

export const ContextualSidecarRunbookSteps = ({ steps }: { steps: ContextualSidecarRunbookStep[] }) => (
  <Stack spacing={2} role='list' data-sidecar-block='runbook-steps'>
    {steps.map((step, index) => (
      <Box
        key={step.id}
        role='listitem'
        aria-current={step.active ? 'step' : undefined}
        sx={theme => ({
          position: 'relative',
          border: `1px solid ${step.active ? alpha(theme.palette.primary.main, 0.48) : alpha(theme.palette.divider, 0.74)}`,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          p: 3,
          bgcolor: step.active
            ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.04)
            : alpha(theme.palette.background.paper, step.disabled ? 0.46 : 0.84),
          opacity: step.disabled ? 0.72 : 1,
          boxShadow: step.active
            ? `0 12px 34px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.085)}`
            : `0 1px 0 ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.22 : 0.035)}`,
          transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow', 'transform'], {
            duration: theme.transitions.duration.shorter,
            easing: 'cubic-bezier(0.2, 0, 0, 1)'
          }),
          '&::after': step.active
            ? {
                content: '""',
                position: 'absolute',
                insetBlock: 10,
                insetInlineStart: 0,
                width: 3,
                borderRadius: 999,
                bgcolor: theme.palette.primary.main
              }
            : undefined,
          '&:hover': step.disabled
            ? undefined
            : {
                transform: 'translateY(-1px)',
                boxShadow: step.active
                  ? `0 16px 40px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.105)}`
                  : `0 10px 28px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.24 : 0.055)}`
              },
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
            '&:hover': {
              transform: 'none'
            }
          }
        })}
      >
        <Stack direction='row' spacing={3} alignItems='flex-start'>
          <CustomAvatar
            skin='light'
            color={step.color ?? (step.active ? 'primary' : 'secondary')}
            sx={theme => ({
              width: 32,
              height: 32,
              boxShadow: step.active
                ? `0 0 0 4px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.07)}`
                : 'none'
            })}
          >
            <Typography variant='caption' fontWeight={800}>
              {step.index}
            </Typography>
          </CustomAvatar>
          <Stack spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between'>
              <Typography variant='body2' fontWeight={700}>
                {step.title}
              </Typography>
              <CustomChip round='true' size='small' variant='tonal' color={step.color ?? 'secondary'} label={step.status} />
            </Stack>
            {step.description ? (
              <Typography variant='caption' color='text.secondary'>
                {step.description}
              </Typography>
            ) : null}
            {step.meta ? (
              <>
                <Divider />
                <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between'>
                  <Typography variant='caption' color='text.secondary'>
                    {step.meta}
                  </Typography>
                  {step.active ? (
                    <Button size='small' variant='tonal' disabled={step.disabled} aria-label={`Ejecutar paso ${index + 1}: ${step.title}`}>
                      Ejecutar
                    </Button>
                  ) : null}
                </Stack>
              </>
            ) : null}
          </Stack>
        </Stack>
      </Box>
    ))}
  </Stack>
)

export const ContextualSidecarProgress = ({
  label,
  value,
  helper
}: {
  label: ReactNode
  value: number
  helper?: ReactNode
}) => (
  <Stack spacing={1.5} role='group' aria-label={typeof label === 'string' ? label : undefined} data-sidecar-block='progress'>
    <Stack direction='row' justifyContent='space-between' alignItems='center'>
      <Typography variant='caption' color='text.secondary'>
        {label}
      </Typography>
      <Typography variant='caption' fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}%
      </Typography>
    </Stack>
    <LinearProgress
      variant='determinate'
      value={value}
      aria-label={typeof label === 'string' ? `${label}: ${value}%` : undefined}
      sx={theme => ({
        height: 8,
        borderRadius: 999,
        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08),
        '& .MuiLinearProgress-bar': {
          borderRadius: 999,
          transition: theme.transitions.create(['transform'], {
            duration: theme.transitions.duration.standard,
            easing: 'cubic-bezier(0.2, 0, 0, 1)'
          })
        }
      })}
    />
    {helper ? (
      <Typography variant='caption' color='text.secondary'>
        {helper}
      </Typography>
    ) : null}
  </Stack>
)
