'use client'

import { useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import { getMicrocopy } from '@/lib/copy'

import { activationFilters, activationMembers, activationSummary, type ActivationMember, type ReadinessStatus } from './data'

type StateCopyKey = 'available' | 'blocked' | 'inReview' | 'pending'

const intakeStatusMeta: Record<ActivationMember['intakeStatus'], { copyKey: StateCopyKey; color: 'primary' | 'success' | 'warning' }> = {
  pending_intake: { copyKey: 'pending', color: 'warning' },
  in_review: { copyKey: 'inReview', color: 'primary' },
  ready_to_complete: { copyKey: 'available', color: 'success' }
}

const laneStatusMeta: Record<ReadinessStatus, { copyKey: StateCopyKey; color: 'success' | 'warning' | 'error'; icon: string }> = {
  ready: { copyKey: 'available', color: 'success', icon: 'tabler-circle-check' },
  attention: { copyKey: 'inReview', color: 'warning', icon: 'tabler-alert-triangle' },
  blocked: { copyKey: 'blocked', color: 'error', icon: 'tabler-circle-x' }
}

const filterMembers = (filter: string) => {
  switch (filter) {
    case 'ready':
      return activationMembers.filter(member => member.intakeStatus === 'ready_to_complete')
    case 'compensation':
      return activationMembers.filter(member => member.blockers.some(blocker => blocker.includes('Compensación') || blocker.includes('Tarifa')))
    case 'hireDate':
      return activationMembers.filter(member => member.blockers.some(blocker => blocker.includes('Fecha de ingreso')))
    case 'legal':
      return activationMembers.filter(member => member.blockers.some(blocker => blocker.includes('Relación legal') || blocker.includes('Engagement')))
    case 'payment':
      return activationMembers.filter(member => member.blockers.some(blocker => blocker.includes('pago')))
    case 'contractor':
      return activationMembers.filter(member => member.relationshipType === 'contractor')
    default:
      return activationMembers
  }
}

const MemberIdentity = ({ member, compact = false }: { member: ActivationMember; compact?: boolean }) => (
  <Stack direction='row' spacing={3} alignItems='center' sx={{ minWidth: 0 }}>
    <Avatar sx={{ bgcolor: 'primary.lighter', color: 'primary.main', width: compact ? 34 : 38, height: compact ? 34 : 38 }}>{member.initials}</Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant={compact ? 'body2' : 'body1'} sx={{ fontWeight: 700 }} noWrap>
        {member.name}
      </Typography>
      <Typography variant='caption' color='text.secondary' noWrap>
        {member.email}
      </Typography>
    </Box>
  </Stack>
)

const ControlStrip = ({
  filter,
  onFilterChange
}: {
  filter: string
  onFilterChange: (filter: string) => void
}) => (
  <Card sx={{ width: '100%', maxWidth: '100%', borderRadius: 2, overflow: 'hidden', minWidth: 0 }}>
    <CardContent sx={{ p: 3, maxWidth: '100%', overflow: 'hidden' }}>
      <Stack spacing={3}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            minWidth: 0,
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }
          }}
        >
          {activationSummary.map((item, index) => (
            <Box
              key={item.label}
              sx={{
                display: { xs: index > 1 ? 'none' : 'grid', sm: 'grid' },
                gridTemplateColumns: { xs: '1fr', sm: '30px auto 1fr' },
                gap: 2,
                alignItems: 'center',
                justifyItems: { xs: 'center', sm: 'stretch' },
                textAlign: { xs: 'center', sm: 'left' },
                border: theme => `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                px: { xs: 1, sm: 2 },
                py: { xs: 1.25, sm: 1.5 }
              }}
            >
              <Avatar variant='rounded' sx={{ bgcolor: `${item.color}.lighter`, color: `${item.color}.main`, width: { xs: 26, sm: 28 }, height: { xs: 26, sm: 28 } }}>
                <i className={item.icon} />
              </Avatar>
              <Typography variant='body1' sx={{ fontWeight: 800, lineHeight: 1 }}>
                {item.value}
              </Typography>
              <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 0 }}>
                <Typography variant='caption' sx={{ display: 'block', fontWeight: 700 }} noWrap>
                  {item.label}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Divider />

        <Stack
          direction='row'
          spacing={2}
          useFlexGap
          flexWrap={{ xs: 'nowrap', md: 'wrap' }}
          sx={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: { xs: 'auto', md: 'visible' }, pb: { xs: 0.5, md: 0 } }}
        >
          {activationFilters.map(item => {
            const active = filter === item.key

            return (
              <Button
                key={item.key}
                size='small'
                variant={active ? 'contained' : 'tonal'}
                color={active ? 'primary' : 'secondary'}
                startIcon={<i className={item.icon} />}
                onClick={() => onFilterChange(item.key)}
                sx={{ flexShrink: 0, minHeight: 34, py: 0.75, px: 2.5, fontSize: theme => theme.typography.caption.fontSize }}
              >
                {item.label}
              </Button>
            )
          })}
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

const QueueRow = ({
  member,
  selected,
  onSelect
}: {
  member: ActivationMember
  selected: boolean
  onSelect: () => void
}) => {
  const copy = getMicrocopy()
  const status = intakeStatusMeta[member.intakeStatus]
  const ready = member.intakeStatus === 'ready_to_complete'

  return (
    <Box
      component='button'
      type='button'
      onClick={onSelect}
      sx={{
        width: '100%',
        textAlign: 'left',
        border: 0,
        borderBottom: theme => `1px solid ${theme.palette.divider}`,
        bgcolor: selected ? 'action.selected' : 'background.paper',
        cursor: 'pointer',
        px: 4,
        py: 3,
        '&:hover': { bgcolor: selected ? 'action.selected' : 'action.hover' }
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          alignItems: 'center',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(250px, 1.25fr) 108px minmax(180px, 0.9fr) 92px' }
        }}
      >
        <MemberIdentity member={member} />

        <Stack spacing={1}>
          <CustomChip round='true' size='small' variant='tonal' label={copy.states[status.copyKey]} color={status.color} sx={{ alignSelf: 'flex-start' }} />
        </Stack>

        <Box sx={{ minWidth: 0 }}>
          <Stack direction='row' spacing={1} alignItems='center' useFlexGap flexWrap='wrap'>
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={ready ? 'success' : 'error'}
              label={ready ? 'Sin blockers' : `${member.blockers.length} blockers`}
            />
            <Typography variant='caption' color='text.secondary' noWrap>
              {member.blockers[0] ?? 'Lista para completar'}
            </Typography>
          </Stack>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }} noWrap>
            {member.blockers[1] ?? member.source}
          </Typography>
        </Box>

        <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
          <Typography variant='body2' sx={{ fontWeight: 700 }}>
            {member.readinessScore}%
          </Typography>
          <LinearProgress variant='determinate' value={member.readinessScore} color={ready ? 'success' : 'primary'} sx={{ width: 82, height: 6, borderRadius: 3 }} />
          <Typography variant='caption' color='text.secondary'>
            {member.age}
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}

const ActivationQueue = ({
  members,
  selectedId,
  onSelect
}: {
  members: ActivationMember[]
  selectedId: string
  onSelect: (memberId: string) => void
}) => (
  <Card sx={{ borderRadius: 2, overflow: 'hidden', minWidth: 0 }}>
    <CardContent sx={{ px: 4, py: 2.5 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent='space-between' spacing={3}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant='h5'>Cola priorizada</Typography>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
            Personas ordenadas por riesgo de activación incompleta.
          </Typography>
        </Box>
        <CustomChip round='true' size='small' variant='tonal' color='primary' label={`${members.length} en vista`} />
      </Stack>
    </CardContent>
    <Divider />
    <Box>
      {members.map(member => (
        <QueueRow key={member.id} member={member} selected={selectedId === member.id} onSelect={() => onSelect(member.id)} />
      ))}
    </Box>
  </Card>
)

const ReadinessInspector = ({ member }: { member: ActivationMember }) => {
  const copy = getMicrocopy()
  const ready = member.intakeStatus === 'ready_to_complete'

  return (
    <Card sx={{ borderRadius: 2, minWidth: 0, position: { lg: 'sticky' }, top: { lg: 96 } }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={4}>
          <Stack spacing={3}>
            <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={3}>
              <MemberIdentity member={member} compact />
              <CustomChip round='true' size='small' variant='tonal' color={ready ? 'success' : 'error'} label={ready ? copy.states.available : copy.states.blocked} />
            </Stack>

            <Box>
              <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                <Typography variant='body2' sx={{ fontWeight: 700 }}>
                  Readiness
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {member.readinessScore}%
                </Typography>
              </Stack>
              <LinearProgress variant='determinate' value={member.readinessScore} color={ready ? 'success' : 'primary'} sx={{ height: 8, borderRadius: 4 }} />
            </Box>

            <Alert
              severity={ready ? 'success' : 'warning'}
              icon={<i className={ready ? 'tabler-circle-check' : 'tabler-shield-lock'} />}
              sx={{ py: 0.75, '& .MuiAlert-message': { py: 0.25, fontSize: theme => theme.typography.caption.fontSize } }}
            >
              {ready ? 'Ficha lista para completar.' : `Resolver primero: ${member.blockers.slice(0, 2).join(', ')}.`}
            </Alert>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row', lg: 'column' }} spacing={2}>
            <Button fullWidth size='small' variant={ready ? 'contained' : 'outlined'} disabled={!ready} startIcon={<i className='tabler-circle-check' />}>
              Completar ficha
            </Button>
            <Button fullWidth size='small' variant='tonal' color='secondary' startIcon={<i className='tabler-route' />}>
              Ruta de desbloqueo
            </Button>
          </Stack>

          <Divider />

          <Stack spacing={2.5}>
            <Typography variant='body1' sx={{ fontWeight: 700 }}>
              Lanes críticas
            </Typography>
            {member.lanes.map(lane => {
              const laneStatus = laneStatusMeta[lane.status]

              return (
                <Box key={lane.key} sx={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 2.5 }}>
                  <Box sx={{ color: `${laneStatus.color}.main`, pt: 0.25 }}>
                    <i className={laneStatus.icon} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
                      <Typography variant='body2' sx={{ fontWeight: 700 }} noWrap>
                        {lane.label}
                      </Typography>
                      <CustomChip round='true' size='small' variant='tonal' color={laneStatus.color} label={copy.states[laneStatus.copyKey]} />
                    </Stack>
                    <Typography variant='caption' color='text.secondary'>
                      {lane.owner}
                    </Typography>
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5, lineHeight: 1.35 }}>
                      {lane.detail}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

const WorkforceActivationMockupView = () => {
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(activationMembers[0]?.id ?? '')

  const members = useMemo(() => filterMembers(filter), [filter])
  const selectedMember = members.find(member => member.id === selectedId) ?? members[0] ?? activationMembers[0]

  const handleFilterChange = (nextFilter: string) => {
    const nextMembers = filterMembers(nextFilter)

    setFilter(nextFilter)
    setSelectedId(nextMembers[0]?.id ?? activationMembers[0].id)
  }

  return (
    <Stack spacing={4} sx={{ minWidth: 0, overflowX: 'hidden' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between' spacing={3}>
        <Box>
          <Stack direction='row' spacing={2} alignItems='center' useFlexGap flexWrap='wrap' sx={{ mb: 1 }}>
            <Typography variant='h5' sx={{ fontSize: { xs: 22, md: 28 }, lineHeight: 1.2 }}>
              Workforce Activation
            </Typography>
            <CustomChip round='true' size='small' variant='tonal' color='secondary' label='TASK-874 mockup' sx={{ fontSize: { xs: 13, md: 14 } }} />
            <CustomChip round='true' size='small' variant='tonal' color='warning' label='Guard activo' sx={{ fontSize: { xs: 13, md: 14 } }} />
          </Stack>
          <Typography variant='body2' color='text.secondary' sx={{ fontSize: { xs: 14, md: 15 }, lineHeight: 1.45 }}>
            Habilitación laboral completa antes de cerrar intake: relación, cargo, compensación, pago y onboarding.
          </Typography>
        </Box>
        <Stack direction='row' spacing={2} useFlexGap flexWrap='wrap'>
          <Button size='small' variant='tonal' color='secondary' startIcon={<i className='tabler-download' />} sx={{ fontSize: theme => theme.typography.caption.fontSize }}>
            Exportar
          </Button>
          <Button size='small' variant='contained' startIcon={<i className='tabler-user-plus' />} sx={{ fontSize: theme => theme.typography.caption.fontSize }}>
            Nueva habilitación
          </Button>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 4,
          minWidth: 0,
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 360px' }
        }}
      >
        <Box sx={{ gridColumn: '1 / -1', width: '100%', maxWidth: '100%', minWidth: 0 }}>
          <ControlStrip filter={filter} onFilterChange={handleFilterChange} />
        </Box>
        <ActivationQueue members={members} selectedId={selectedMember.id} onSelect={setSelectedId} />
        <ReadinessInspector member={selectedMember} />
      </Box>
    </Stack>
  )
}

export default WorkforceActivationMockupView
