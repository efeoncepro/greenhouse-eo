'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { typographyScale } from '@/components/theme/typography-tokens'
import {
  GreenhouseChip,
  GreenhouseLeaderboardCard,
  GreenhouseLeaderboardPodium,
  type GreenhouseLeaderboardRanking,
  type GreenhouseLeaderboardRankingItem
} from '@/components/greenhouse/primitives'
import { formatNumber } from '@/lib/format'

import { DESIGN_SYSTEM_LAB_TOKENS } from './design-system-lab-tokens'

const TEAM_RANKINGS: GreenhouseLeaderboardRanking[] = [
  {
    userId: 'julio-reyes',
    userName: 'Julio Reyes',
    rank: 1,
    value: 289400,
    avatarUrl: '/images/greenhouse/team/EO_Avatar-Jullio.png'
  },
  {
    userId: 'daniela',
    userName: 'Daniela',
    rank: 2,
    value: 251800,
    avatarUrl: '/images/greenhouse/team/EO_Avatar-Daniela.png'
  },
  {
    userId: 'valentina',
    userName: 'Valentina',
    rank: 3,
    value: 238300,
    avatarUrl: '/images/greenhouse/team/EO_Avatar-Valentina.png'
  },
  {
    userId: 'luis',
    userName: 'Luis',
    rank: 4,
    value: 198700,
    avatarUrl: '/images/greenhouse/team/Luis.jpg'
  },
  {
    userId: 'melkin',
    userName: 'Melkin',
    rank: 5,
    value: 156200,
    avatarUrl: '/images/greenhouse/team/EO_Avatar-Melkin.png'
  }
]

const TEAM_RANKING_ITEMS: GreenhouseLeaderboardRankingItem[] = [
  {
    ...TEAM_RANKINGS[0],
    byline: 'Nivel 42 · Diamond'
  },
  {
    ...TEAM_RANKINGS[1],
    byline: 'Nivel 39 · Platinum'
  },
  {
    ...TEAM_RANKINGS[2],
    byline: 'Nivel 35 · Gold'
  },
  {
    ...TEAM_RANKINGS[3],
    byline: 'Nivel 31 · Silver'
  },
  {
    ...TEAM_RANKINGS[4],
    byline: 'Nivel 28 · Bronze'
  }
]

const formatPoints = (value: number) => `${formatNumber(value)} pts`
const formatLeaderboardValue = (value: number) => formatNumber(value)

const formatCompactLeaderboardValue = (value: number) =>
  `${formatNumber(value / 1000, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`

const SectionCard = ({
  children,
  dataCapture,
  subtitle,
  title
}: {
  children: ReactNode
  dataCapture: string
  subtitle: string
  title: string
}) => (
  <Card
    data-capture={dataCapture}
    sx={theme => ({
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      border: '1px solid',
      borderColor: alpha(theme.palette.divider, 0.78),
      boxShadow: `0 ${DESIGN_SYSTEM_LAB_TOKENS.shadow.cardOffsetY}px ${DESIGN_SYSTEM_LAB_TOKENS.shadow.cardBlur}px ${alpha(
        theme.palette.common.black,
        DESIGN_SYSTEM_LAB_TOKENS.opacity.elevatedShadow
      )}`
    })}
  >
    <CardContent sx={{ pb: { xs: 12, md: 4 } }}>
      <Stack spacing={4}>
        <Stack spacing={1}>
          <Typography variant='h5'>{title}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {subtitle}
          </Typography>
        </Stack>
        {children}
      </Stack>
    </CardContent>
  </Card>
)

const ShowcaseSection = ({
  children,
  dataCapture,
  subtitle,
  title
}: {
  children: ReactNode
  dataCapture: string
  subtitle: string
  title: string
}) => (
  <Stack data-capture={dataCapture} spacing={2.5} sx={{ minInlineSize: 0 }}>
    <Stack spacing={0.75} sx={{ maxInlineSize: 780 }}>
      <Typography variant='h5'>{title}</Typography>
      <Typography variant='body2' color='text.secondary'>
        {subtitle}
      </Typography>
    </Stack>
    {children}
  </Stack>
)

const VariantPreview = ({
  medalStyle,
  showAvatar,
  title
}: {
  medalStyle: 'classic' | 'modern' | 'minimal'
  showAvatar: boolean
  title: string
}) => (
  <Box
    sx={theme => ({
      p: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup,
      borderRadius: `${theme.shape.customBorderRadius.md}px`,
      border: '1px solid',
      borderColor: alpha(theme.palette.divider, 0.74),
      bgcolor: alpha(theme.palette.background.default, 0.56),
      minInlineSize: 0
    })}
  >
    <Stack spacing={2}>
      <Typography sx={{ ...typographyScale.labelMd, color: 'text.primary' }}>{title}</Typography>
      <GreenhouseLeaderboardPodium
        rankings={TEAM_RANKINGS}
        size='sm'
        medalStyle={medalStyle}
        showAvatar={showAvatar}
        valueFormatter={formatPoints}
        ariaLabel={`${title} ranking`}
      />
    </Stack>
  </Box>
)

const GamificationLabView = () => (
  <Box
    data-capture='design-system-gamification'
    sx={{
      inlineSize: '100%',
      maxInlineSize: DESIGN_SYSTEM_LAB_TOKENS.layout.widePageMaxInlineSize,
      mx: 'auto',
      p: { xs: 3, md: 5 }
    }}
  >
    <Stack spacing={5}>
      <Stack spacing={2} sx={{ maxInlineSize: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}>
        <Stack direction='row' flexWrap='wrap' gap={1.5} alignItems='center'>
          <GreenhouseChip label='Primitive' tone='primary' variant='label' />
          <GreenhouseChip label='Gamification' tone='success' variant='label' />
        </Stack>
        <Typography variant='h4'>Gamification leaderboard</Typography>
        <Typography variant='body1' color='text.secondary'>
          Primitive para mostrar rankings internos con podium, lista paginada, avatars reales y selector de run listo
          para cablearse luego al módulo de gamification del equipo.
        </Typography>
      </Stack>

      <ShowcaseSection
        dataCapture='gamification-leaderboard-card'
        title='Leaderboard card'
        subtitle='Composición gobernada: periodo, run activo, podium top 3 y ranking paginado en un único contrato.'
      >
        <GreenhouseLeaderboardCard
          title='Weekly Leaderboard'
          fromDate='2026-04-30'
          toDate='2026-05-06'
          podiumRankings={TEAM_RANKINGS}
          rankings={TEAM_RANKING_ITEMS}
          currentUserId='melkin'
          currentUserLabel='Actual'
          podiumValueFormatter={formatLeaderboardValue}
          rankingValueFormatter={formatCompactLeaderboardValue}
          dataCapture='gamification-leaderboard-card-preview'
          sx={{
            maxInlineSize: { xs: 300, sm: 760 },
            mx: { xs: 0, sm: 'auto' }
          }}
        />
      </ShowcaseSection>

      <SectionCard
        dataCapture='gamification-podium-primary'
        title='Leaderboard podium'
        subtitle='Orden visual 2-1-3, valores tabulares y avatars del equipo Efeonce/Greenhouse.'
      >
        <GreenhouseLeaderboardPodium
          rankings={TEAM_RANKINGS}
          size='lg'
          medalStyle='modern'
          valueFormatter={formatPoints}
          ariaLabel='Top 3 del equipo Greenhouse'
          dataCapture='gamification-podium'
        />
      </SectionCard>

      <SectionCard
        dataCapture='gamification-podium-variants'
        title='Variants'
        subtitle='Mismo contrato de datos, distinto peso visual para cards, docks o módulos compactos.'
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
            gap: 3,
            '& > *': { minWidth: 0 }
          }}
        >
          <VariantPreview title='Classic' medalStyle='classic' showAvatar />
          <VariantPreview title='Modern' medalStyle='modern' showAvatar />
          <VariantPreview title='Minimal sin avatar' medalStyle='minimal' showAvatar={false} />
        </Box>
      </SectionCard>
    </Stack>
  </Box>
)

export default GamificationLabView
