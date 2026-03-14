'use client'

import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import CardActionArea from '@mui/material/CardActionArea'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import { GH_COLORS, GH_MESSAGES, GH_TEAM } from '@/config/greenhouse-nomenclature'
import type { TeamMembersPayload } from '@/types/team'

import BusinessLineBadge from './BusinessLineBadge'
import EmptyState from './EmptyState'
import ExecutiveCardShell from './ExecutiveCardShell'
import RequestDialog from './RequestDialog'
import TeamMemberCard from './TeamMemberCard'
import { getBrandDisplayLabel } from './brand-assets'

const TeamDossierSection = () => {
  const [data, setData] = useState<TeamMembersPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [requestIntent, setRequestIntent] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const loadData = async () => {
      try {
        setIsLoading(true)

        const response = await fetch('/api/team/members', {
          cache: 'no-store',
          signal: controller.signal
        })

        if (!response.ok) {
          throw new Error(`Team members request failed with ${response.status}`)
        }

        const payload = (await response.json()) as TeamMembersPayload

        setData(payload)
        setError(null)
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') {
          return
        }

        setError(GH_MESSAGES.error_team_members)
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()

    return () => controller.abort()
  }, [])

  const teamMembers = data?.members || []

  const footer = data?.footer || {
    serviceLines: [],
    modality: null,
    totalFte: 0
  }

  const connectedCount = teamMembers.filter(member => member.identityProviders.length > 0).length

  return (
    <>
      <ExecutiveCardShell title={GH_TEAM.section_title} subtitle={GH_TEAM.section_subtitle}>
        <Stack spacing={3}>
          {isLoading ? (
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(0, 1fr))'
                }
              }}
            >
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} variant='rounded' height={240} />
              ))}
            </Box>
          ) : null}

          {error ? <Alert severity='warning'>{error}</Alert> : null}

          {!isLoading && !error && teamMembers.length === 0 ? (
            <EmptyState icon='tabler-users-group' title={GH_TEAM.section_title} description={GH_MESSAGES.empty_team} minHeight={260} />
          ) : null}

          {!isLoading && !error && teamMembers.length > 0 ? (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(3, minmax(0, 1fr))'
                  }
                }}
              >
                <HorizontalWithSubtitle
                  title={GH_TEAM.label_people}
                  stats={String(teamMembers.length)}
                  avatarIcon='tabler-users-group'
                  avatarColor='primary'
                  subtitle='Roster activo visible en tu operacion.'
                />
                <HorizontalWithSubtitle
                  title={GH_TEAM.footer_team_total}
                  stats={`${footer.totalFte.toFixed(1)} FTE`}
                  avatarIcon='tabler-briefcase'
                  avatarColor='success'
                  subtitle={footer.modality || GH_TEAM.modality_pending}
                />
                <HorizontalWithSubtitle
                  title={GH_TEAM.label_identity}
                  stats={`${connectedCount}/${teamMembers.length}`}
                  avatarIcon='tabler-link'
                  avatarColor='info'
                  subtitle='Personas con identidad externa enlazada.'
                />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gap: 3,
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(2, minmax(0, 1fr))'
                  }
                }}
              >
                {teamMembers.map(member => (
                  <TeamMemberCard key={member.memberId} member={member} />
                ))}

                <Box
                  sx={{
                    borderRadius: 3,
                    border: `1px dashed ${GH_COLORS.neutral.border}`,
                    bgcolor: GH_COLORS.neutral.bgSurface,
                    overflow: 'hidden'
                  }}
                >
                  <CardActionArea
                    onClick={() => setRequestIntent(GH_TEAM.expand_title.toLowerCase())}
                    sx={{
                      minHeight: 280,
                      display: 'grid',
                      placeItems: 'center',
                      p: 3,
                      textAlign: 'center'
                    }}
                  >
                    <Stack spacing={1.5} alignItems='center'>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: 999,
                          bgcolor: GH_COLORS.semantic.warning.bg,
                          color: GH_COLORS.semantic.warning.text
                        }}
                      >
                        <i className='tabler-plus text-[24px]' />
                      </Box>
                      <Typography variant='h6'>{GH_TEAM.expand_title}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {GH_TEAM.expand_subtitle}
                      </Typography>
                    </Stack>
                  </CardActionArea>
                </Box>
              </Box>

              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 4,
                  border: `1px solid ${GH_COLORS.neutral.border}`,
                  bgcolor: GH_COLORS.neutral.bgSurface
                }}
              >
                <Typography variant='caption' color='text.secondary'>
                  {GH_TEAM.label_service_line}
                </Typography>
                <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap sx={{ mt: 1 }}>
                  {footer.serviceLines.length ? (
                    footer.serviceLines.map(line => (
                      <Box
                        key={line}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 1.25,
                          py: 0.9,
                          borderRadius: 999,
                          bgcolor: 'background.paper',
                          border: `1px solid ${GH_COLORS.neutral.border}`
                        }}
                      >
                        <BusinessLineBadge brand={line} />
                        <Typography variant='caption' sx={{ fontWeight: 700 }}>
                          {getBrandDisplayLabel(line)}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant='body2' color='text.secondary'>
                      {GH_TEAM.service_lines_empty}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </>
          ) : null}
        </Stack>
      </ExecutiveCardShell>

      <RequestDialog open={requestIntent !== null} intent={requestIntent} onClose={() => setRequestIntent(null)} />
    </>
  )
}

export default TeamDossierSection
