'use client'

import { useEffect, useMemo, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'

import { typographyScale } from '@/components/theme/typography-tokens'
import { getMicrocopy } from '@/lib/copy'
import { formatNumber } from '@/lib/format'

export interface GreenhouseLeaderboardRankingItem {
  userId: string
  userName: string | null
  rank: number
  value: number
  byline?: string | null
  rankChange?: number
  displayed?: boolean
  avatarUrl?: string | null
}

export interface GreenhouseLeaderboardRankingsProps {
  rankings: GreenhouseLeaderboardRankingItem[]
  currentUserId?: string
  currentUserLabel?: string
  onUserClick?: (ranking: GreenhouseLeaderboardRankingItem) => void
  variant?: 'contained' | 'cards'
  showPagination?: boolean
  defaultPageSize?: 10 | 25 | 50 | 100
  ariaLabel?: string
  valueFormatter?: (value: number, ranking: GreenhouseLeaderboardRankingItem) => string
  className?: string
  sx?: SxProps<Theme>
  dataCapture?: string
}

const formatDefaultValue = (value: number) => formatNumber(value)
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

type GreenhouseLeaderboardRow =
  | { type: 'ranking'; ranking: GreenhouseLeaderboardRankingItem }
  | { type: 'ellipsis'; key: string }

const getDisplayName = (ranking: GreenhouseLeaderboardRankingItem) =>
  ranking.userName?.trim() || `Usuario ${ranking.userId.slice(0, 6)}`

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')

const getRankTone = (theme: Theme, rank: number) => {
  if (rank === 1) return theme.palette.warning.main
  if (rank === 2) return theme.palette.info.main
  if (rank === 3) return theme.palette.warning.dark

  return theme.palette.text.secondary
}

const GreenhouseLeaderboardRankings = ({
  ariaLabel = 'Leaderboard rankings',
  className,
  currentUserId,
  currentUserLabel = 'Tú',
  dataCapture,
  defaultPageSize = 10,
  onUserClick,
  variant = 'contained',
  rankings,
  showPagination = false,
  sx,
  valueFormatter = formatDefaultValue
}: GreenhouseLeaderboardRankingsProps) => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(defaultPageSize)
  const microcopy = getMicrocopy()
  const pageCount = Math.max(1, Math.ceil(rankings.length / pageSize))

  const pagedRankings = showPagination
    ? rankings.slice((page - 1) * pageSize, page * pageSize)
    : rankings

  const rows = useMemo<GreenhouseLeaderboardRow[]>(() => {
    const nextRows: GreenhouseLeaderboardRow[] = []
    let hiddenRunCount = 0

    pagedRankings.forEach((ranking, index) => {
      if (ranking.displayed === false) {
        hiddenRunCount += 1

        return
      }

      if (hiddenRunCount > 0) {
        nextRows.push({ type: 'ellipsis', key: `ellipsis-${index}` })
        hiddenRunCount = 0
      }

      nextRows.push({ type: 'ranking', ranking })
    })

    if (hiddenRunCount > 0) {
      nextRows.push({ type: 'ellipsis', key: 'ellipsis-tail' })
    }

    return nextRows
  }, [pagedRankings])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  if (rankings.length === 0) return null

  const isContained = variant === 'contained'

  return (
    <Stack
      className={className}
      data-capture={dataCapture}
      spacing={2}
      sx={[
        {
          minInlineSize: 0,
          inlineSize: '100%'
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <Stack
        component='ol'
        role='list'
        aria-label={ariaLabel}
        spacing={isContained ? 0 : 1.25}
        sx={theme => ({
          m: 0,
          p: 0,
          minInlineSize: 0,
          ...(isContained
            ? {
                overflow: 'hidden',
                borderRadius: `calc(${theme.shape.customBorderRadius.xl}px * 1.9)`,
                border: '1px solid',
                borderColor: alpha(theme.palette.divider, 0.55),
                bgcolor: theme.palette.background.paper
              }
            : {})
        })}
      >
        {rows.map(row => {
          if (row.type === 'ellipsis') {
            return (
              <Box
                key={row.key}
                component='li'
                role='listitem'
                aria-label={microcopy.aria.leaderboardRowsCollapsed}
                sx={theme => ({
                  listStyle: 'none',
                  display: 'grid',
                  placeItems: 'center',
                  px: 2,
                  py: 1,
                  color: 'text.secondary',
                  borderBlockStart: '1px solid',
                  borderBlockStartColor: alpha(theme.palette.divider, 0.55),
                  '& > i': { fontSize: 22 }
                })}
              >
                <i className='tabler-dots' aria-hidden='true' />
              </Box>
            )
          }

          const { ranking } = row
          const displayName = getDisplayName(ranking)
          const initials = getInitials(displayName)
          const isCurrentUser = currentUserId != null && ranking.userId === currentUserId
          const formattedValue = valueFormatter(ranking.value, ranking)
          const isInteractive = onUserClick != null
          const rankChange = ranking.rankChange

          return (
            <Box
              key={ranking.userId}
              component='li'
              role='listitem'
              tabIndex={isInteractive ? 0 : undefined}
              aria-current={isCurrentUser ? 'true' : undefined}
              aria-label={`Rank ${ranking.rank}: ${displayName}, ${formattedValue}`}
              onClick={() => onUserClick?.(ranking)}
              onKeyDown={event => {
                if (!isInteractive) return
                if (event.key !== 'Enter' && event.key !== ' ') return

                event.preventDefault()
                onUserClick?.(ranking)
              }}
              sx={theme => {
                const rankTone = getRankTone(theme, ranking.rank)

                return {
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'auto minmax(0, 1fr)',
                    sm: isContained ? '34px 34px 56px minmax(0, 1fr) auto' : 'auto minmax(0, 1fr) auto'
                  },
                  gridTemplateAreas: {
                    xs: '"identity identity" "value value"',
                    sm: isContained ? '"rank crown avatar identity value"' : '"identity identity value"'
                  },
                  alignItems: 'center',
                  gap: { xs: 1.5, sm: isContained ? 1.75 : 2 },
                  px: { xs: 1.5, sm: isContained ? 2 : 2 },
                  py: isContained ? { xs: 1.5, sm: 1.75 } : 1.5,
                  listStyle: 'none',
                  minInlineSize: 0,
                  borderRadius: isCurrentUser && isContained ? `${theme.shape.customBorderRadius.md}px` : `${theme.shape.customBorderRadius.md}px`,
                  border: isCurrentUser ? '2px solid' : isContained ? 0 : '1px solid',
                  borderColor: isCurrentUser
                    ? theme.palette.text.primary
                    : isContained
                      ? 'transparent'
                      : alpha(theme.palette.primary.main, 0.1),
                  borderBlockStart: isContained && !isCurrentUser ? '1px solid' : undefined,
                  borderBlockStartColor: isContained && !isCurrentUser ? alpha(theme.palette.divider, 0.55) : undefined,
                  bgcolor: isCurrentUser
                    ? alpha(theme.palette.action.selected, theme.palette.mode === 'dark' ? 0.28 : 0.46)
                    : isContained
                      ? theme.palette.background.paper
                      : alpha(theme.palette.background.paper, 0.82),
                  boxShadow: isContained
                    ? 'none'
                    : isCurrentUser
                      ? `0 10px 26px ${alpha(theme.palette.primary.main, 0.12)}`
                      : `0 8px 22px ${alpha(theme.palette.common.black, 0.045)}`,
                  my: isCurrentUser && isContained ? 0.5 : 0,
                  transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow'], {
                    duration: theme.transitions.duration.shorter
                  }),
                  cursor: isInteractive ? 'pointer' : 'default',
                  '&:hover': {
                    borderColor: isContained ? undefined : alpha(theme.palette.primary.main, 0.32),
                    boxShadow: isContained ? undefined : `0 12px 28px ${alpha(theme.palette.common.black, 0.08)}`,
                    bgcolor: isInteractive && !isCurrentUser ? alpha(theme.palette.action.hover, 0.48) : undefined
                  },
                  '&:focus-visible': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: -2
                  },
                  '--gh-leaderboard-rank-tone': rankTone,
                  '& > *': { minInlineSize: 0 }
                }
              }}
            >
              {isContained ? (
                <Box
                  aria-hidden='true'
                  sx={{
                    gridArea: 'rank',
                    display: { xs: 'none', sm: 'block' },
                    textAlign: 'center',
                    color: 'text.primary',
                    ...typographyScale.labelLg
                  }}
                >
                  {ranking.rank}
                </Box>
              ) : null}

              {isContained ? (
                <Box
                  aria-hidden='true'
                  sx={{
                    gridArea: 'crown',
                    display: { xs: 'none', sm: 'grid' },
                    placeItems: 'center',
                    color: ranking.rank <= 3 ? 'var(--gh-leaderboard-rank-tone)' : 'transparent',
                    '& > i': { fontSize: 26 }
                  }}
                >
                  <i className='tabler-crown' />
                </Box>
              ) : null}

              <Stack
                direction='row'
                spacing={1.5}
                alignItems='center'
                sx={{ gridArea: isContained ? 'avatar' : 'identity', minInlineSize: 0 }}
              >
                {!isContained ? (
                  <Box
                    aria-hidden='true'
                    sx={theme => {
                      const badgeRankTone = getRankTone(theme, ranking.rank)

                      return {
                        inlineSize: 32,
                        blockSize: 32,
                        flex: '0 0 auto',
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                        color: 'var(--gh-leaderboard-rank-tone)',
                        bgcolor: alpha(badgeRankTone, ranking.rank <= 3 ? 0.1 : 0.04),
                        border: '1px solid',
                        borderColor: alpha(badgeRankTone, ranking.rank <= 3 ? 0.45 : 0.16),
                        ...typographyScale.labelMd
                      }
                    }}
                  >
                    {ranking.rank}
                  </Box>
                ) : null}

                <Avatar
                  src={ranking.avatarUrl ?? undefined}
                  alt={`Avatar de ${displayName}`}
                  sx={theme => {
                    return {
                      inlineSize: isContained ? 48 : 38,
                      blockSize: isContained ? 48 : 38,
                      flex: '0 0 auto',
                      bgcolor: alpha(theme.palette.action.selected, 0.34),
                      color: theme.palette.text.secondary,
                      fontSize: isContained ? 18 : 14
                    }
                  }}
                >
                  {initials}
                </Avatar>
              </Stack>

              <Stack spacing={0.25} sx={{ gridArea: 'identity', minInlineSize: 0 }}>
                <Stack direction='row' gap={1} alignItems='center' sx={{ minInlineSize: 0 }}>
                  <Typography noWrap sx={{ ...typographyScale.labelMd, color: 'text.primary' }}>
                    {displayName}
                  </Typography>
                  {isCurrentUser && !isContained ? (
                    <Chip
                      label={currentUserLabel}
                      size='small'
                      color='primary'
                      variant='outlined'
                      sx={theme => ({
                        blockSize: 22,
                        borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                        '& .MuiChip-label': { px: 1, ...typographyScale.bodySm }
                      })}
                    />
                  ) : null}
                </Stack>
                {ranking.byline ? (
                  <Typography noWrap sx={{ ...(isContained ? typographyScale.bodyMd : typographyScale.bodySm), color: 'text.secondary' }}>
                    {ranking.byline}
                  </Typography>
                ) : null}
              </Stack>

              <Stack
                direction='row'
                justifyContent='flex-end'
                alignItems='center'
                spacing={1}
                sx={{ gridArea: 'value', minInlineSize: 0 }}
              >
                {typeof rankChange === 'number' && rankChange !== 0 ? (
                  <Typography
                    aria-hidden='true'
                    sx={theme => ({
                      display: { xs: 'none', sm: 'inline-flex' },
                      alignItems: 'center',
                      gap: 0.5,
                      color: rankChange > 0 ? theme.palette.success.main : theme.palette.error.main,
                      ...typographyScale.bodySm,
                      '& > i': { fontSize: 14 }
                    })}
                  >
                    <i className={rankChange > 0 ? 'tabler-trending-up' : 'tabler-trending-down'} />
                    {Math.abs(rankChange)}
                  </Typography>
                ) : null}
                <Box
                  sx={theme => ({
                    px: isContained ? 0 : 1.25,
                    py: isContained ? 0 : 0.65,
                    borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                    bgcolor: isContained ? 'transparent' : alpha(theme.palette.background.default, 0.72),
                    border: isContained ? 0 : '1px solid',
                    borderColor: isContained ? 'transparent' : alpha(theme.palette.primary.main, 0.12),
                    inlineSize: { xs: '100%', sm: 'auto' },
                    textAlign: { xs: 'start', sm: 'end' }
                  })}
                >
                  <Typography
                    sx={{
                      ...typographyScale.labelMd,
                      color: 'text.primary',
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                      ...(isContained ? typographyScale.labelMd : {})
                    }}
                  >
                    {formattedValue}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )
        })}
      </Stack>

      {showPagination ? (
        <Stack
          direction='row'
          justifyContent={isContained ? 'space-between' : 'flex-end'}
          alignItems='center'
          sx={theme => ({
            pt: isContained ? 1.5 : 0.5,
            px: isContained ? 2 : 0,
            pb: isContained ? 0.5 : 0,
            color: 'text.secondary',
            ...(isContained
              ? {
                  border: '1px solid',
                  borderTop: 0,
                  borderColor: alpha(theme.palette.divider, 0.55),
                  borderEndStartRadius: `calc(${theme.shape.customBorderRadius.xl}px * 1.9)`,
                  borderEndEndRadius: `calc(${theme.shape.customBorderRadius.xl}px * 1.9)`
                }
              : {})
          })}
        >
          {isContained ? (
            <Stack direction='row' spacing={1} alignItems='center'>
              <Typography sx={{ ...typographyScale.bodySm, color: 'text.secondary' }}>Show</Typography>
              <Select
                size='small'
                value={pageSize}
                onChange={event => setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
                sx={theme => ({
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  minInlineSize: 76,
                  '& .MuiSelect-select': {
                    py: 0.75,
                    ...typographyScale.bodySm
                  }
                })}
              >
                {PAGE_SIZE_OPTIONS.map(option => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          ) : null}
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <IconButton
              size='small'
              aria-label={microcopy.aria.paginationPrev}
              disabled={page === 1}
              onClick={() => setPage(currentPage => Math.max(1, currentPage - 1))}
              sx={theme => ({
                inlineSize: 40,
                blockSize: 40,
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                border: '1px solid',
                borderColor: alpha(theme.palette.divider, 0.55)
              })}
            >
              <i className='tabler-chevron-left' aria-hidden='true' />
            </IconButton>
            <Typography sx={{ ...typographyScale.bodySm, color: 'text.secondary' }}>Page {page} of {pageCount}</Typography>
            <IconButton
              size='small'
              aria-label={microcopy.aria.paginationNext}
              disabled={page === pageCount}
              onClick={() => setPage(currentPage => Math.min(pageCount, currentPage + 1))}
              sx={theme => ({
                inlineSize: 40,
                blockSize: 40,
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                border: '1px solid',
                borderColor: alpha(theme.palette.divider, 0.55)
              })}
            >
              <i className='tabler-chevron-right' aria-hidden='true' />
            </IconButton>
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  )
}

export default GreenhouseLeaderboardRankings
