'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import { GH_INTERNAL_MESSAGES } from '@/lib/copy/admin'
import TeamAvatar from '@/components/greenhouse/TeamAvatar'
import { formatCurrency } from '@views/greenhouse/payroll/helpers'

import type { PersonDetail } from '@/types/people'
import { countryFlag, formatFte, roleCategoryLabel, safeRoleCategory } from './helpers'
import IntegrationStatus from './components/IntegrationStatus'

const TASK407_COPY_MICROSOFT = "Microsoft"
const TASK407_COPY_NOTION = "Notion"
const TASK407_COPY_HUBSPOT = "HubSpot"


const GREENHOUSE_COPY = getMicrocopy()

type Props = {
  detail: PersonDetail
  isAdmin?: boolean
  onEditProfile?: () => void
  onDeactivate?: () => void
  onEditCompensation?: () => void
}

const PersonLeftSidebar = ({ detail, isAdmin, onEditProfile, onDeactivate, onEditCompensation }: Props) => {
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
            <Box
              component='img'
              src={
                member.contactChannel === 'teams' ? '/images/integrations/teams.svg'
                  : member.contactChannel === 'slack' ? '/images/integrations/slack.svg'
                  : '/images/integrations/outlook.svg'
              }
              alt={member.contactChannel}
              sx={{ width: 18, height: 18, objectFit: 'contain' }}
            />
            <Typography variant='body2'>
              {member.contactChannel === 'teams' ? 'Teams' : member.contactChannel === 'slack' ? 'Slack' : member.contactChannel}
              {member.contactHandle ? ` · ${member.contactHandle}` : ''}
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
            { label: TASK407_COPY_MICROSOFT, linked: integrations.microsoftLinked },
            { label: TASK407_COPY_NOTION, linked: integrations.notionLinked },
            { label: TASK407_COPY_HUBSPOT, linked: integrations.hubspotLinked }
          ]}
        />
      </CardContent>

      {member.eoId && (
        <>
          <Divider />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant='overline' color='text.secondary'>Identidad</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <i className='tabler-fingerprint' style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
              <Typography variant='body2' sx={{ fontWeight: 600 }}>{member.eoId}</Typography>
            </Box>
            {detail.linkedUserId && (
              <Button
                component={Link}
                href={`/admin/users/${member.eoId}`}
                variant='tonal'
                size='small'
                startIcon={<i className='tabler-shield-check' />}
                fullWidth
              >
                {GH_INTERNAL_MESSAGES.people_detail_link_admin}
              </Button>
            )}
          </CardContent>
        </>
      )}

      {detail.currentCompensation ? (
        <>
          <Divider />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant='overline' color='text.secondary'>Compensación</Typography>
              {isAdmin && onEditCompensation && (
                <Button size='small' startIcon={<i className='tabler-edit' style={{ fontSize: 14 }} />} onClick={onEditCompensation} sx={{ minWidth: 0, fontSize: '0.75rem', py: 0 }}>{GREENHOUSE_COPY.actions.edit}</Button>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <i className='tabler-cash' style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {formatCurrency(detail.currentCompensation.baseSalary, detail.currentCompensation.currency)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <i className='tabler-building-bank' style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
              <Typography variant='body2'>
                {detail.currentCompensation.payRegime === 'chile' ? 'Chile' : 'Internacional'} · {detail.currentCompensation.currency}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <i className='tabler-calendar-check' style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
              <Typography variant='body2' color='text.secondary'>
                Desde {detail.currentCompensation.effectiveFrom}
              </Typography>
            </Box>
          </CardContent>
        </>
      ) : isAdmin && onEditCompensation ? (
        <>
          <Divider />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant='overline' color='text.secondary'>Compensación</Typography>
            <Typography variant='body2' color='text.secondary'>Sin compensación configurada</Typography>
            <Button
              variant='tonal'
              size='small'
              startIcon={<i className='tabler-cash' />}
              onClick={onEditCompensation}
              fullWidth
            >
              Configurar compensación
            </Button>
          </CardContent>
        </>
      ) : null}

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
