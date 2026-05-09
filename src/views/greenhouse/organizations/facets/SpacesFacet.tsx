'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import CustomChip from '@core/components/mui/Chip'

import { GH_ORGANIZATION_WORKSPACE } from '@/lib/copy/agency'

import type { FacetContentProps } from '@/components/greenhouse/organization-workspace/types'

import FacetEmptyState from './FacetEmptyState'
import useOrganizationDetail from './use-organization-detail'

/**
 * TASK-612 — Spaces facet. Lista los Spaces operativos asociados a la
 * organización (datos vienen del payload `OrganizationDetailData.spaces[]`
 * — ya provistos por el endpoint `/api/organizations/[id]`).
 */

const SpacesFacet = ({ organizationId }: FacetContentProps) => {
  const state = useOrganizationDetail(organizationId)

  if (state.status === 'loading') {
    return (
      <Stack direction='row' spacing={2} alignItems='center' sx={{ py: 6, justifyContent: 'center' }}>
        <CircularProgress size={20} />
        <Typography variant='body2' color='text.secondary'>
          {GH_ORGANIZATION_WORKSPACE.facets.loading}
        </Typography>
      </Stack>
    )
  }

  if (state.status === 'error') {
    return (
      <FacetEmptyState
        icon='tabler-alert-circle'
        title={GH_ORGANIZATION_WORKSPACE.shell.degraded.title}
        description={GH_ORGANIZATION_WORKSPACE.shell.degraded.reasons.unknown}
      />
    )
  }

  const spaces = state.detail.spaces ?? []

  if (spaces.length === 0) {
    return (
      <FacetEmptyState
        icon='tabler-grid-4x4'
        title={GH_ORGANIZATION_WORKSPACE.facets.empty.spaces.title}
        description={GH_ORGANIZATION_WORKSPACE.facets.empty.spaces.description}
      />
    )
  }

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardContent>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Space</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell align='right'>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {spaces.map(space => (
                <TableRow key={space.spaceId}>
                  <TableCell>
                    <Typography variant='body2'>{space.spaceName}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {space.publicId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <CustomChip variant='tonal' size='small' color='info' label={space.spaceType} />
                  </TableCell>
                  <TableCell align='right'>
                    <CustomChip
                      variant='tonal'
                      size='small'
                      color={space.status === 'active' ? 'success' : 'secondary'}
                      label={space.status}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  )
}

export default SpacesFacet
