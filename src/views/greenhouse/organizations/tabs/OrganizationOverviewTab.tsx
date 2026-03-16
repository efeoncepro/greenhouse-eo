'use client'

import Link from 'next/link'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import type { OrganizationDetailData } from '../types'

type Props = {
  detail: OrganizationDetailData
}

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'secondary'> = {
  active: 'success',
  inactive: 'secondary',
  prospect: 'warning'
}

const OrganizationOverviewTab = ({ detail }: Props) => {
  const spaces = detail.spaces ?? []

  return (
    <Grid container spacing={6}>
      {/* Spaces */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title={`Spaces (${spaces.length})`}
            subheader='Tenants operativos asociados a esta organización'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                <i className='tabler-layout-grid' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          {spaces.length === 0 ? (
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
                <Typography variant='h6' sx={{ mb: 1 }}>Sin Spaces</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Esta organización aún no tiene tenants operativos asociados.
                </Typography>
              </Box>
            </CardContent>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Space</TableCell>
                    <TableCell>ID</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Client ID</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {spaces.map(space => (
                    <TableRow key={space.spaceId} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={600}>
                          {space.clientId ? (
                            <Link
                              href={`/admin/tenants/${space.clientId}`}
                              style={{ color: 'inherit', textDecoration: 'none' }}
                            >
                              {space.spaceName}
                            </Link>
                          ) : (
                            space.spaceName
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {space.publicId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>{space.spaceType}</Typography>
                      </TableCell>
                      <TableCell>
                        <CustomChip
                          round='true'
                          size='small'
                          variant='tonal'
                          color={STATUS_COLOR[space.status] ?? 'secondary'}
                          label={space.status}
                        />
                      </TableCell>
                      <TableCell>
                        {space.clientId ? (
                          <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {space.clientId}
                          </Typography>
                        ) : (
                          <Typography variant='body2' color='text.secondary'>—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Grid>
    </Grid>
  )
}

export default OrganizationOverviewTab
