'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import OperationalStatusBadge, { type OperationalStatusTone } from './OperationalStatusBadge'

export type OperationalSignalTone = OperationalStatusTone

export interface OperationalSignalItem {
  id: string
  title: ReactNode
  description: ReactNode
  statusLabel: ReactNode
  statusTone?: OperationalSignalTone
  statusIcon?: string
  code?: ReactNode
  action?: ReactNode
}

export interface OperationalSignalListProps {
  items: OperationalSignalItem[]
  columns?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number }
  emptyState?: ReactNode
}

const getWidth = (columns: number | undefined) => columns && columns > 1 ? `${100 / columns}%` : '100%'

/**
 * List/grid primitive for reliability, health, risk, and governance signals.
 *
 * The item shape is intentionally row-like with restrained radius and generous
 * padding. It avoids nested oversized pill cards while keeping scanability in
 * dense operational screens.
 */
const OperationalSignalList = ({
  items,
  columns = { xs: 1, md: 2 },
  emptyState
}: OperationalSignalListProps) => {
  if (items.length === 0) return <>{emptyState}</>

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3
      }}
    >
      {items.map(item => (
        <Box
          key={item.id}
          sx={theme => ({
            flex: {
              xs: `1 1 calc(${getWidth(columns.xs)} - ${theme.spacing(3)})`,
              sm: `1 1 calc(${getWidth(columns.sm ?? columns.xs)} - ${theme.spacing(3)})`,
              md: `1 1 calc(${getWidth(columns.md ?? columns.sm ?? columns.xs)} - ${theme.spacing(3)})`,
              lg: `1 1 calc(${getWidth(columns.lg ?? columns.md ?? columns.sm ?? columns.xs)} - ${theme.spacing(3)})`,
              xl: `1 1 calc(${getWidth(columns.xl ?? columns.lg ?? columns.md ?? columns.sm ?? columns.xs)} - ${theme.spacing(3)})`
            },
            minWidth: { xs: '100%', md: 280 },
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            p: 5,
            bgcolor: 'background.paper'
          })}
        >
          <Stack spacing={3}>
            <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={3}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                  {item.title}
                </Typography>
                {item.code ? (
                  <Typography variant='caption' color='text.secondary' sx={{ wordBreak: 'break-word' }}>
                    {item.code}
                  </Typography>
                ) : null}
              </Box>
              <OperationalStatusBadge
                label={item.statusLabel}
                tone={item.statusTone ?? 'secondary'}
                icon={item.statusIcon}
              />
            </Stack>
            <Typography variant='body2' color='text.secondary'>
              {item.description}
            </Typography>
            {item.action ? (
              <>
                <Divider />
                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                  {item.action}
                </Typography>
              </>
            ) : null}
          </Stack>
        </Box>
      ))}
    </Box>
  )
}

export default OperationalSignalList
