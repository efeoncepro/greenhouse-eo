'use client'

import type { MouseEvent } from 'react'

import Link from 'next/link'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'

import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { HrOrgLeadershipNode } from '@/lib/reporting-hierarchy/org-chart-leadership'
import { getInitials } from '@/utils/getInitials'

export type OrgLeadershipNodeCardData = {
  node: HrOrgLeadershipNode
  isFocused: boolean
  onFocusMember: (memberId: string | null) => void
}

export type OrgLeadershipNodeCardNode = Node<OrgLeadershipNodeCardData, 'orgLeadershipNode'>

const resolveRoleTone = (roleCategory: string) => {
  switch (roleCategory) {
    case 'account':
      return GH_COLORS.role.account
    case 'operations':
      return GH_COLORS.role.operations
    case 'strategy':
      return GH_COLORS.role.strategy
    case 'design':
      return GH_COLORS.role.design
    case 'media':
      return GH_COLORS.role.media
    case 'development':
      return GH_COLORS.role.development
    default:
      return GH_COLORS.role.development
  }
}

const stopPropagation = (event: MouseEvent) => {
  event.stopPropagation()
}

const OrgLeadershipNodeCard = ({ data }: NodeProps<OrgLeadershipNodeCardNode>) => {
  const node = data.node
  const tone = resolveRoleTone(node.roleCategory)
  const primaryDepartment = node.associatedDepartments.find(department => department.isPrimary) ?? node.associatedDepartments[0] ?? null
  const extraDepartments = node.associatedDepartments.slice(0, 3)

  return (
    <Card
      role='button'
      tabIndex={0}
      aria-label={`Enfocar a ${node.displayName}`}
      onClick={() => data.onFocusMember(node.memberId)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          data.onFocusMember(node.memberId)
        }
      }}
      sx={{
        width: 320,
        minHeight: 268,
        overflow: 'hidden',
        borderRadius: 2,
        border: theme => `1px solid ${data.isFocused ? alpha(tone.source, 0.55) : theme.palette.customColors.lightAlloy}`,
        background: theme => `linear-gradient(180deg, ${alpha(tone.source, 0.12)} 0%, ${theme.palette.background.default} 52%)`,
        boxShadow: data.isFocused ? `0 0 0 2px ${alpha(tone.source, 0.14)}` : 'none',
        cursor: 'pointer',
        '&:focus-visible': {
          outline: `2px solid ${alpha(tone.source, 0.72)}`,
          outlineOffset: 2
        }
      }}
    >
      <Handle type='target' position={Position.Top} style={{ opacity: 0 }} />
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Stack spacing={1.5}>
          <Stack direction='row' spacing={1.5} alignItems='flex-start'>
            <Avatar
              src={node.avatarUrl || undefined}
              sx={{
                width: 48,
                height: 48,
                bgcolor: tone.bg,
                color: tone.textDark,
                border: `1px solid ${tone.bgHover}`,
                flexShrink: 0
              }}
            >
              {getInitials(node.displayName)}
            </Avatar>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction='row' spacing={0.75} flexWrap='wrap' useFlexGap sx={{ mb: 0.75 }}>
                <Chip size='small' label='Líder' variant='outlined' sx={{ height: 24 }} />
                <Chip size='small' label='Activo' variant='outlined' sx={{ height: 24 }} />
                {node.isCurrentMember ? <Chip size='small' label='Tú' color='primary' variant='outlined' sx={{ height: 24 }} /> : null}
                {node.isRoot ? <Chip size='small' label='Raíz visible' variant='outlined' sx={{ height: 24 }} /> : null}
                {node.hasActiveDelegation ? <Chip size='small' label='Delegación activa' color='warning' variant='outlined' sx={{ height: 24 }} /> : null}
                {node.associatedDepartments.length > 0 ? <Chip size='small' label='Responsable de área' color='info' variant='outlined' sx={{ height: 24 }} /> : null}
              </Stack>

              <Typography variant='subtitle1' fontWeight={700} lineHeight={1.2} noWrap title={node.displayName}>
                {node.displayName}
              </Typography>
              <Typography variant='body2' color='text.secondary' noWrap title={node.roleTitle ?? 'Sin cargo visible'}>
                {node.roleTitle ?? 'Sin cargo visible'}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant='body2'
              fontWeight={600}
              lineHeight={1.35}
              noWrap
              title={primaryDepartment?.name ?? node.contextDepartmentName ?? node.departmentName ?? 'Sin área visible'}
            >
              {primaryDepartment?.name ?? node.contextDepartmentName ?? node.departmentName ?? 'Sin área visible'}
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
              noWrap
              title={node.supervisorName ? `Reporta a ${node.supervisorName}` : 'Nivel más alto visible'}
            >
              {node.supervisorName ? `Reporta a ${node.supervisorName}` : 'Nivel más alto visible'}
            </Typography>
          </Box>

          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            <Chip size='small' label={`Directos ${node.directReportsCount}`} variant='outlined' sx={{ height: 24 }} />
            <Chip size='small' label={`Subárbol ${node.subtreeSize}`} variant='outlined' sx={{ height: 24 }} />
            <Chip size='small' label={`Áreas ${node.associatedDepartments.length}`} variant='outlined' sx={{ height: 24 }} />
          </Stack>

          <Box
            sx={theme => ({
              p: 1.25,
              borderRadius: 2,
              border: `1px solid ${theme.palette.customColors.lightAlloy}`,
              bgcolor: alpha(theme.palette.background.default, 0.96)
            })}
          >
            <Typography variant='caption' color='text.secondary'>
              Áreas asociadas
            </Typography>
            <Stack direction='row' spacing={0.75} flexWrap='wrap' useFlexGap sx={{ mt: 0.75 }}>
              {extraDepartments.length > 0 ? (
                <>
                  {extraDepartments.map(department => (
                    <Chip
                      key={department.departmentId}
                      size='small'
                      label={department.name}
                      color={department.isPrimary ? 'primary' : 'default'}
                      variant={department.isPrimary ? 'outlined' : 'filled'}
                      sx={{ height: 24 }}
                    />
                  ))}
                  {node.associatedDepartments.length > extraDepartments.length ? (
                    <Chip
                      size='small'
                      label={`+${node.associatedDepartments.length - extraDepartments.length} más`}
                      variant='outlined'
                      sx={{ height: 24 }}
                    />
                  ) : null}
                </>
              ) : (
                <Typography variant='body2' color='text.secondary'>
                  Sin área liderada visible en este scope.
                </Typography>
              )}
            </Stack>
          </Box>

          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            <Button
              component={Link}
              href={`/people/${node.memberId}`}
              size='small'
              variant='tonal'
              color='primary'
              startIcon={<i className='tabler-user-search' />}
              onClick={stopPropagation}
            >
              Ver ficha
            </Button>
            <Button
              component={Link}
              href='/hr/hierarchy'
              size='small'
              variant='outlined'
              color='secondary'
              startIcon={<i className='tabler-hierarchy-2' />}
              onClick={stopPropagation}
            >
              Jerarquía
            </Button>
          </Stack>
        </Stack>
      </CardContent>
      <Handle type='source' position={Position.Bottom} style={{ opacity: 0 }} />
    </Card>
  )
}

export default OrgLeadershipNodeCard
