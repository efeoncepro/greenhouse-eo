'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'

import { typographyScale } from '@/components/theme/typography-tokens'
import { formatNumber } from '@/lib/format'

export interface GreenhouseLeaderboardRanking {
  userId: string
  userName: string | null
  rank: number
  value: number
  avatarUrl?: string | null
}

export type GreenhouseLeaderboardPodiumSize = 'sm' | 'default' | 'lg'
export type GreenhouseLeaderboardPodiumMedalStyle = 'classic' | 'modern' | 'minimal'

export interface GreenhouseLeaderboardPodiumProps {
  rankings: GreenhouseLeaderboardRanking[]
  size?: GreenhouseLeaderboardPodiumSize
  showValue?: boolean
  showAvatar?: boolean
  medalStyle?: GreenhouseLeaderboardPodiumMedalStyle
  ariaLabel?: string
  valueFormatter?: (value: number, ranking: GreenhouseLeaderboardRanking) => string
  className?: string
  sx?: SxProps<Theme>
  dataCapture?: string
}

const PODIUM_ORDER = [2, 1, 3] as const

const PODIUM_SIZE_TOKENS = {
  sm: {
    avatar: 40,
    badge: 20,
    podiumWidth: 80,
    podiumHeights: { 1: 104, 2: 84, 3: 72 },
    gap: 2,
    iconSize: 13,
    rankSize: 32,
    nameTypography: typographyScale.labelSm,
    valueTypography: typographyScale.bodySm
  },
  default: {
    avatar: 56,
    badge: 26,
    podiumWidth: 92,
    podiumHeights: { 1: 132, 2: 104, 3: 88 },
    gap: 3,
    iconSize: 16,
    rankSize: 36,
    nameTypography: typographyScale.labelMd,
    valueTypography: typographyScale.labelSm
  },
  lg: {
    avatar: 72,
    badge: 32,
    podiumWidth: 108,
    podiumHeights: { 1: 164, 2: 132, 3: 112 },
    gap: 4,
    iconSize: 19,
    rankSize: 42,
    nameTypography: typographyScale.labelLg,
    valueTypography: typographyScale.labelMd
  }
} as const

const PODIUM_COMPACT_SIZE_TOKENS = {
  sm: {
    avatar: 36,
    badge: 18,
    podiumWidth: 74,
    podiumHeights: { 1: 86, 2: 70, 3: 62 },
    gap: 1.5,
    iconSize: 12,
    rankSize: 28
  },
  default: {
    avatar: 46,
    badge: 22,
    podiumWidth: 84,
    podiumHeights: { 1: 104, 2: 84, 3: 72 },
    gap: 2,
    iconSize: 14,
    rankSize: 32
  },
  lg: {
    avatar: 58,
    badge: 26,
    podiumWidth: 96,
    podiumHeights: { 1: 120, 2: 98, 3: 82 },
    gap: 2,
    iconSize: 16,
    rankSize: 34
  }
} as const

const getRankColor = (theme: Theme, rank: 1 | 2 | 3) => {
  if (rank === 1) return theme.palette.warning.main
  if (rank === 2) return theme.palette.info.main

  return theme.palette.success.main
}

const getRankSurface = (theme: Theme, rank: 1 | 2 | 3) => {
  const color = getRankColor(theme, rank)

  return {
    color,
    soft: alpha(color, rank === 1 ? 0.18 : 0.12),
    block: alpha(color, rank === 1 ? 0.24 : 0.16),
    ring: alpha(color, 0.42)
  }
}

const formatDefaultValue = (value: number) => formatNumber(value)

const getDisplayName = (ranking: GreenhouseLeaderboardRanking) =>
  ranking.userName?.trim() || `Usuario ${ranking.userId.slice(0, 6)}`

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')

const getPodiumRankings = (rankings: GreenhouseLeaderboardRanking[]) =>
  PODIUM_ORDER.map(rank => rankings.find(item => item.rank === rank)).filter(
    (item): item is GreenhouseLeaderboardRanking => Boolean(item)
  )

const GreenhouseLeaderboardPodium = ({
  ariaLabel = 'Top 3 rankings',
  className,
  dataCapture,
  medalStyle = 'classic',
  rankings,
  showAvatar = true,
  showValue = true,
  size = 'default',
  sx,
  valueFormatter = formatDefaultValue
}: GreenhouseLeaderboardPodiumProps) => {
  const podiumRankings = getPodiumRankings(rankings)
  const sizeTokens = PODIUM_SIZE_TOKENS[size]
  const compactTokens = PODIUM_COMPACT_SIZE_TOKENS[size]

  if (podiumRankings.length === 0) return null

  return (
    <Box
      className={className}
      data-capture={dataCapture}
      role='list'
      aria-label={ariaLabel}
      sx={[
        theme => ({
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: { xs: compactTokens.gap, sm: sizeTokens.gap },
          inlineSize: '100%',
          minInlineSize: 0,
          overflowX: 'clip',
          overflowY: 'clip',
          pb: 0.5,
          scrollbarWidth: 'thin',
          '& > *': { minInlineSize: 0 },
          [theme.breakpoints.down('sm')]: {
            justifyContent: 'center',
            px: 1
          }
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      {podiumRankings.map(ranking => {
        const rank = ranking.rank as 1 | 2 | 3
        const displayName = getDisplayName(ranking)
        const formattedValue = valueFormatter(ranking.value, ranking)
        const initials = getInitials(displayName)

        return (
          <Stack
            key={ranking.userId}
            role='listitem'
            aria-label={`Rank ${rank}: ${displayName}${showValue ? `, ${formattedValue}` : ''}`}
            spacing={1}
            alignItems='center'
            sx={theme => {
              const surface = getRankSurface(theme, rank)

              return {
                inlineSize: { xs: compactTokens.podiumWidth, sm: sizeTokens.podiumWidth },
                maxInlineSize: { xs: compactTokens.podiumWidth, sm: sizeTokens.podiumWidth },
                flex: { xs: `1 1 ${compactTokens.podiumWidth}px`, sm: `0 0 ${sizeTokens.podiumWidth}px` },
                color: theme.palette.text.primary,
                '--gh-podium-rank-color': surface.color,
                '--gh-podium-rank-soft': surface.soft,
                '--gh-podium-rank-block': surface.block,
                '--gh-podium-rank-ring': surface.ring
              }
            }}
          >
            <Box sx={{ position: 'relative', display: 'inline-flex' }} aria-hidden={showAvatar ? undefined : true}>
              {showAvatar ? (
                <Avatar
                  src={ranking.avatarUrl ?? undefined}
                  alt={`Avatar de ${displayName}`}
                  sx={{
                    inlineSize: { xs: compactTokens.avatar, sm: sizeTokens.avatar },
                    blockSize: { xs: compactTokens.avatar, sm: sizeTokens.avatar },
                    border: '2px solid',
                    borderColor: 'var(--gh-podium-rank-ring)',
                    bgcolor: 'var(--gh-podium-rank-soft)',
                    color: 'var(--gh-podium-rank-color)',
                    boxShadow: theme => `0 12px 28px ${alpha(theme.palette.common.black, 0.12)}`
                  }}
                >
                  {initials}
                </Avatar>
              ) : (
                <Box
                  sx={{
                    inlineSize: { xs: compactTokens.avatar, sm: sizeTokens.avatar },
                    blockSize: { xs: compactTokens.avatar, sm: sizeTokens.avatar },
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'var(--gh-podium-rank-soft)',
                    color: 'var(--gh-podium-rank-color)'
                  }}
                >
                  <i className='tabler-trophy' aria-hidden='true' />
                </Box>
              )}

              {medalStyle !== 'minimal' ? (
                <Box
                  sx={theme => ({
                    position: 'absolute',
                    insetInlineEnd: -4,
                    insetBlockEnd: -3,
                    inlineSize: { xs: compactTokens.badge, sm: sizeTokens.badge },
                    blockSize: { xs: compactTokens.badge, sm: sizeTokens.badge },
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: medalStyle === 'modern' ? `${theme.shape.customBorderRadius.md}px` : '50%',
                    bgcolor: theme.palette.background.paper,
                    color: 'var(--gh-podium-rank-color)',
                    border: '1px solid',
                    borderColor: alpha(theme.palette.divider, 0.84),
                    boxShadow: theme.greenhouseElevation.raised.boxShadow,
                    '& i': {
                      fontSize: { xs: compactTokens.iconSize, sm: sizeTokens.iconSize }
                    }
                  })}
                >
                  <i className='tabler-crown' aria-hidden='true' />
                </Box>
              ) : null}
            </Box>

            <Stack spacing={0.25} alignItems='center' sx={{ inlineSize: '100%', minInlineSize: 0 }}>
              <Typography
                title={displayName}
                sx={{
                  ...sizeTokens.nameTypography,
                  maxInlineSize: '100%',
                  color: 'text.primary',
                  fontWeight: 700,
                  textAlign: 'center'
                }}
                noWrap
              >
                {displayName}
              </Typography>
              {showValue ? (
                <Typography
                  sx={{
                    ...sizeTokens.valueTypography,
                    color: 'text.secondary',
                    fontVariantNumeric: 'tabular-nums',
                    textAlign: 'center'
                  }}
                  noWrap
                >
                  {formattedValue}
                </Typography>
              ) : null}
            </Stack>

            <Box
              aria-hidden='true'
              sx={theme => ({
                mt: 1,
                inlineSize: '100%',
                blockSize: { xs: compactTokens.podiumHeights[rank], sm: sizeTokens.podiumHeights[rank] },
                borderStartStartRadius:
                  medalStyle === 'modern'
                    ? `${theme.shape.customBorderRadius.xl}px`
                    : `${theme.shape.customBorderRadius.lg}px`,
                borderStartEndRadius:
                  medalStyle === 'modern'
                    ? `${theme.shape.customBorderRadius.xl}px`
                    : `${theme.shape.customBorderRadius.lg}px`,
                border: '1px solid',
                borderColor: 'var(--gh-podium-rank-ring)',
                bgcolor: 'var(--gh-podium-rank-block)',
                backgroundImage:
                  'linear-gradient(180deg, color-mix(in srgb, var(--gh-podium-rank-color) 18%, transparent) 0%, transparent 58%)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.28)}`
              })}
            >
              <Typography
                sx={{
                  pt: 1.5,
                  inlineSize: { xs: compactTokens.rankSize, sm: sizeTokens.rankSize },
                  blockSize: { xs: compactTokens.rankSize, sm: sizeTokens.rankSize },
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--gh-podium-rank-color)',
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {rank}
              </Typography>
            </Box>
          </Stack>
        )
      })}
    </Box>
  )
}

export default GreenhouseLeaderboardPodium
