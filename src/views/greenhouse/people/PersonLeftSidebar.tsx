'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import TeamAvatar from '@/components/greenhouse/TeamAvatar'

import type { PersonDetail } from '@/types/people'
import { countryFlag, formatFte, roleCategoryLabel, safeRoleCategory } from './helpers'
import IntegrationStatus from './components/IntegrationStatus'

type Props = {
  detail: PersonDetail
  isAdmin?: boolean
  onEditProfile?: () => void
  onDeactivate?: () => void
}

const PersonLeftSidebar = ({ detail, isAdmin, onEditProfile, onDeactivate }: Props) => {
  const { member, integrations, summary } = detail
  const roleCategory = safeRoleCategory(member.roleCategory)

  return (
    <Card>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, pt: 6 }}>
        <TeamAvatar
          name={member.displayName}
          avatarUrl={member.avatarUrl}
          roleCategory={roleCategory}
          size={120}
        />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant='h5'>{member.displayName}</Typography>
          <Typography variant='body2' color='text.secondary'>{member.roleTitle}</Typography>
        </Box>
        <Chip
          size='small'
          label={roleCategoryLabel[roleCategory] ?? member.roleCategory}
          variant='tonal'
          color='secondary'
        />
        {member.profile.locationCountry && (
          <Typography variant='body2'>
            {countryFlag(member.profile.locationCountry)} {member.profile.locationCity ? `${member.profile.locationCity}, ` : ''}{member.profile.locationCountry}
          </Typography>
        )}

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 6, width: '100%', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant='h6'>{formatFte(summary.totalFte)}</Typography>
            <Typography variant='caption' color='text.secondary'>FTE</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant='h6'>{summary.totalHoursMonth}</Typography>
            <Typography variant='caption' color='text.secondary'>Hrs/mes</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant='h6'>{summary.activeAssignments}</Typography>
            <Typography variant='caption' color='text.secondary'>Spaces</Typography>
          </Box>
        </Box>
      </CardContent>

      <Divider />

      {/* Contact */}
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant='overline' color='text.secondary'>Contacto</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <i className='tabler-mail' style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
          <Typography variant='body2'>{member.publicEmail}</Typography>
        </Box>
        {member.internalEmail && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <i className='tabler-mail' style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
            <Typography variant='body2' color='text.secondary'>{member.internalEmail}</Typography>
          </Box>
        )}
        {member.contactChannel && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <i className='tabler-message' style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
            <Typography variant='body2'>
              {member.contactChannel}{member.contactHandle ? ` · ${member.contactHandle}` : ''}
            </Typography>
          </Box>
        )}
      </CardContent>

      <Divider />

      {/* Integrations */}
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant='overline' color='text.secondary'>Integraciones</Typography>
        <IntegrationStatus
          items={[
            { label: 'Microsoft', linked: integrations.microsoftLinked },
            { label: 'Notion', linked: integrations.notionLinked },
            { label: 'HubSpot', linked: integrations.hubspotLinked }
          ]}
        />
      </CardContent>

      {detail.linkedUserId && (
        <>
          <Divider />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant='overline' color='text.secondary'>Portal</Typography>
            <Button
              component={Link}
              href={`/admin/users/${detail.linkedUserId}`}
              variant='tonal'
              size='small'
              startIcon={<i className='tabler-shield-check' />}
              fullWidth
            >
              {GH_INTERNAL_MESSAGES.people_detail_link_admin}
            </Button>
          </CardContent>
        </>
      )}

      {isAdmin && (
        <>
          <Divider />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant='overline' color='text.secondary'>Admin</Typography>
            <Button variant='tonal' size='small' startIcon={<i className='tabler-edit' />} onClick={onEditProfile} fullWidth>
              Editar perfil
            </Button>
            {member.active && (
              <Button variant='tonal' color='error' size='small' startIcon={<i className='tabler-user-off' />} onClick={onDeactivate} fullWidth>
                Desactivar
              </Button>
            )}
          </CardContent>
        </>
      )}
    </Card>
  )
}

export default PersonLeftSidebar
