'use client'

import { forwardRef, useEffect, useMemo, useState, type HTMLAttributes, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'

import { typographyScale } from '@/components/theme/typography-tokens'
import { getMicrocopy } from '@/lib/copy'
import { formatDate } from '@/lib/format'

import GreenhouseLeaderboardPodium, { type GreenhouseLeaderboardRanking } from './GreenhouseLeaderboardPodium'
import GreenhouseLeaderboardRankings, { type GreenhouseLeaderboardRankingItem } from './GreenhouseLeaderboardRankings'

export interface GreenhouseLeaderboardRunOption {
  id: string
  label: string
}

export interface GreenhouseLeaderboardCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  fromDate: string | Date
  toDate: string | Date
  podiumRankings: GreenhouseLeaderboardRanking[]
  rankings: GreenhouseLeaderboardRankingItem[]
  currentUserId?: string
  currentUserLabel?: string
  runOptions?: GreenhouseLeaderboardRunOption[]
  selectedRunId?: string
  onRunChange?: (runId: string) => void
  valueFormatter?: (value: number, ranking: GreenhouseLeaderboardRanking | GreenhouseLeaderboardRankingItem) => string
  podiumValueFormatter?: (value: number, ranking: GreenhouseLeaderboardRanking) => string
  rankingValueFormatter?: (value: number, ranking: GreenhouseLeaderboardRankingItem) => string
  ariaLabel?: string
  sx?: SxProps<Theme>
  dataCapture?: string
}

const formatRangeDate = (value: string | Date) =>
  formatDate(value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    fallback: ''
  })

const GreenhouseLeaderboardCard = forwardRef<HTMLDivElement, GreenhouseLeaderboardCardProps>(
  (
    {
      ariaLabel = 'Leaderboard',
      className,
      currentUserId,
      currentUserLabel,
      dataCapture,
      fromDate,
      onRunChange,
      podiumRankings,
      rankings,
      runOptions,
      selectedRunId,
      sx,
      title = 'Leaderboard',
      toDate,
      podiumValueFormatter,
      rankingValueFormatter,
      valueFormatter,
      ...props
    },
    ref
  ) => {
    const firstRunId = runOptions?.[0]?.id ?? ''
    const resolvedRunId = selectedRunId ?? firstRunId
    const isControlled = onRunChange != null
    const [localRunId, setLocalRunId] = useState(resolvedRunId)
    const microcopy = getMicrocopy()

    useEffect(() => {
      if (!isControlled) setLocalRunId(resolvedRunId)
    }, [isControlled, resolvedRunId])

    const activeRunId = isControlled ? resolvedRunId : localRunId

    const rangeLabel = useMemo(() => {
      const fromLabel = formatRangeDate(fromDate)
      const toLabel = formatRangeDate(toDate)

      return [fromLabel, toLabel].filter(Boolean).join(' - ')
    }, [fromDate, toDate])

    return (
      <Card
        ref={ref}
        className={className}
        data-capture={dataCapture}
        aria-label={ariaLabel}
        {...props}
        sx={[
          theme => ({
            position: 'relative',
            inlineSize: '100%',
            minInlineSize: 0,
            borderRadius: `calc(${theme.shape.customBorderRadius.xl}px * 2.4)`,
            border: '1px solid',
            borderColor: alpha(theme.palette.divider, 0.55),
            bgcolor: theme.palette.background.paper,
            boxShadow: `0 16px 38px ${alpha(theme.palette.common.black, 0.14)}`,
            overflow: 'hidden'
          }),
          ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
        ]}
      >
        <CardContent
          sx={{
            position: 'relative',
            zIndex: 1,
            p: { xs: 3, sm: 4, md: 5 },
            '&:last-child': { pb: { xs: 3, sm: 4, md: 5 } }
          }}
        >
          <Stack spacing={{ xs: 3.5, md: 5 }} sx={{ minInlineSize: 0 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent='space-between'
              alignItems={{ xs: 'stretch', sm: 'flex-start' }}
              gap={2}
              sx={{ minInlineSize: 0 }}
            >
              <Stack spacing={1} sx={{ minInlineSize: 0 }}>
                <Typography
                  variant='h4'
                  sx={{
                    color: 'text.primary',
                    fontWeight: 700,
                    lineHeight: 1.15
                  }}
                >
                  {title}
                </Typography>
                {rangeLabel ? (
                  <Typography variant='h6' sx={{ color: 'text.secondary', fontWeight: 400 }}>
                    {rangeLabel}
                  </Typography>
                ) : null}
              </Stack>

              {runOptions && runOptions.length > 0 ? (
                <FormControl
                  size='small'
                  sx={{
                    minInlineSize: { xs: '100%', sm: 176 },
                    maxInlineSize: { xs: '100%', sm: 240 }
                  }}
                >
                  <Select
                    aria-label={microcopy.aria.leaderboardRunSelect}
                    value={activeRunId}
                    onChange={event => {
                      const nextRunId = event.target.value

                      if (onRunChange) {
                        onRunChange(nextRunId)

                        return
                      }

                      setLocalRunId(nextRunId)
                    }}
                    sx={theme => ({
                      borderRadius: `${theme.shape.customBorderRadius.md}px`,
                      bgcolor: alpha(theme.palette.background.paper, 0.9),
                      boxShadow: `0 10px 24px ${alpha(theme.palette.common.black, 0.08)}`,
                      ...typographyScale.labelSm,
                      '& .MuiSelect-select': {
                        py: 1,
                        minBlockSize: 'auto'
                      }
                    })}
                  >
                    {runOptions.map(option => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : null}
            </Stack>

            <Box
              sx={{
                position: 'relative',
                px: 0,
                py: { xs: 1, sm: 1.5 },
                minInlineSize: 0,
                overflowX: 'clip',
                '& > [role="list"]': {
                  position: 'relative',
                  zIndex: 1
                }
              }}
            >
              <GreenhouseLeaderboardPodium
                rankings={podiumRankings}
                medalStyle='modern'
                size='lg'
                valueFormatter={podiumValueFormatter ?? valueFormatter}
                ariaLabel={`${ariaLabel} top 3`}
              />
            </Box>

            <GreenhouseLeaderboardRankings
              rankings={rankings}
              currentUserId={currentUserId}
              currentUserLabel={currentUserLabel}
              showPagination
              defaultPageSize={10}
              valueFormatter={rankingValueFormatter ?? valueFormatter}
              ariaLabel={`${ariaLabel} rankings`}
            />
          </Stack>
        </CardContent>
      </Card>
    )
  }
)

GreenhouseLeaderboardCard.displayName = 'GreenhouseLeaderboardCard'

export default GreenhouseLeaderboardCard
