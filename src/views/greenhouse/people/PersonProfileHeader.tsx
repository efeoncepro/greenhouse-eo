'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import OptionMenu from '@core/components/option-menu'
import CardStatsSquare from '@components/card-statistics/CardStatsSquare'
import TeamAvatar from '@/components/greenhouse/TeamAvatar'

import type { PersonDetail } from '@/types/people'
import { formatFte, safeRoleCategory, roleCategoryLabel } from './helpers'

type Props = {
  detail: PersonDetail
  isAdmin?: boolean
  onEditProfile?: () => void
  onDeactivate?: () => void
  onEditCompensation?: () => void
}

const INTEGRATION_ITEMS = [
  { key: 'notionLinked' as const, label: 'Notion' },
  { key: 'hubspotLinked' as const, label: 'HubSpot' },
  { key: 'microsoftLinked' as const, label: 'Microsoft' }
]

const PersonProfileHeader = ({ detail, isAdmin, onEditProfile, onDeactivate, onEditCompensation }: Props) => {
  const { member, integrations, summary } = detail
  const roleCategory = safeRoleCategory(member.roleCategory)

  return (
    <Card
      component='article'
      aria-label={`Perfil de ${member.displayName}`}
      elevation={0}
      sx={{ border: theme => `1px solid ${theme.palette.divider}` }}
    >
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'center', sm: 'flex-start' }}
          spacing={4}
        >
          {/* LEFT — Avatar + identity */}
          <Stack
            direction='row'
            gap={4}
            alignItems='center'
            sx={{ flexGrow: 1, minWidth: 0 }}
          >
            <TeamAvatar
              name={member.displayName}
              avatarUrl={member.avatarUrl}
              roleCategory={roleCategory}
              size={80}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant='h5' noWrap>{member.displayName}</Typography>
              <Typography variant='body2' color='text.secondary' noWrap>
                {member.roleTitle}
                {roleCategory !== 'unknown' ? ` · ${roleCategoryLabel[roleCategory]}` : ''}
                {' · Efeonce Team'}
              </Typography>
              {member.publicEmail && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <i className='tabler-mail' style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }} />
                  <Typography variant='caption' color='text.secondary' noWrap>
                    {member.publicEmail}
                  </Typography>
                </Box>
              )}
              <Stack direction='row' gap={1} mt={1} flexWrap='wrap'>
                {INTEGRATION_ITEMS.map(({ key, label }) => {
                  const linked = integrations[key]

                  return (
                    <CustomChip
                      key={key}
                      round='true'
                      size='small'
                      variant='tonal'
                      color={linked ? 'success' : 'secondary'}
                      icon={<i className={linked ? 'tabler-check' : 'tabler-x'} />}
                      label={label}
                    />
                  )
                })}
              </Stack>
            </Box>
          </Stack>

          {/* CENTER — Stat cards */}
          <Grid container spacing={3} sx={{ flexShrink: 0, width: { xs: '100%', md: 'auto' }, maxWidth: { md: 480 } }}>
            <Grid size={{ xs: 4 }}>
              <CardStatsSquare
                avatarIcon='tabler-clock'
                avatarColor='info'
                stats={formatFte(summary.totalFte)}
                statsTitle='FTE'
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <CardStatsSquare
                avatarIcon='tabler-calendar'
                avatarColor='info'
                stats={String(summary.totalHoursMonth)}
                statsTitle='Hrs/mes'
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <CardStatsSquare
                avatarIcon='tabler-building'
                avatarColor='success'
                stats={String(summary.activeAssignments)}
                statsTitle='Spaces'
              />
            </Grid>
          </Grid>

          {/* RIGHT — Status chip + admin actions */}
          <Stack direction='row' alignItems='center' gap={2} sx={{ flexShrink: 0 }}>
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={member.active ? 'success' : 'error'}
              icon={<i className={member.active ? 'tabler-check' : 'tabler-user-off'} />}
              label={member.active ? 'Activo' : 'Inactivo'}
            />
            {isAdmin && (
              <OptionMenu
                iconClassName='tabler-settings-2'
                options={[
                  {
                    text: 'Editar perfil',
                    icon: <i className='tabler-edit' />,
                    menuItemProps: { onClick: onEditProfile }
                  },
                  {
                    text: 'Editar compensación',
                    icon: <i className='tabler-cash' />,
                    menuItemProps: { onClick: onEditCompensation }
                  },
                  { divider: true },
                  {
                    text: 'Desactivar',
                    icon: <i className='tabler-user-off' />,
                    menuItemProps: {
                      sx: { color: 'error.main' },
                      onClick: onDeactivate
                    }
                  }
                ]}
              />
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default PersonProfileHeader
