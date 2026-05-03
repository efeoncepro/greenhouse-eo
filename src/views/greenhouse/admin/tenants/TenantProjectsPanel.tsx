'use client'

import Link from 'next/link'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import type { AdminTenantProjectRow } from '@/lib/admin/get-admin-tenant-detail'
import TenantDetailEmptyState from '@views/greenhouse/admin/tenants/TenantDetailEmptyState'

type Props = {
  projects: AdminTenantProjectRow[]
}

const TenantProjectsPanel = ({ projects }: Props) => {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={2} justifyContent='space-between' alignItems={{ xs: 'stretch', md: 'center' }}>
          <div>
            <Typography variant='h5'>{GH_INTERNAL_MESSAGES.admin_tenant_projects_title}</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
              {GH_INTERNAL_MESSAGES.admin_tenant_projects_subtitle}
            </Typography>
          </div>
          <Button variant='contained' startIcon={<i className='tabler-plus' />} disabled>
            {GH_INTERNAL_MESSAGES.admin_tenant_projects_add}
          </Button>
        </Stack>
      </Grid>

      {projects.length === 0 ? (
        <Grid size={{ xs: 12 }}>
          <TenantDetailEmptyState
            icon='tabler-folder-off'
            title={GH_INTERNAL_MESSAGES.admin_tenant_projects_empty_title}
            description={GH_INTERNAL_MESSAGES.admin_tenant_projects_empty_description}
          />
        </Grid>
      ) : (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell component='th' scope='col'>{GH_INTERNAL_MESSAGES.admin_tenant_projects_header_project}</TableCell>
                      <TableCell component='th' scope='col'>{GH_INTERNAL_MESSAGES.admin_tenant_projects_header_id}</TableCell>
                      <TableCell component='th' scope='col'>{GH_INTERNAL_MESSAGES.admin_tenant_projects_header_users}</TableCell>
                      <TableCell component='th' scope='col'>{GH_INTERNAL_MESSAGES.admin_tenant_projects_header_state}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {projects.map(project => (
                      <TableRow key={project.projectId} hover>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography color='text.primary' fontWeight={500}>{project.projectName}</Typography>
                            {project.pageUrl ? (
                              <Typography component={Link} href={project.pageUrl} target='_blank' color='primary' variant='body2'>
                                {GH_INTERNAL_MESSAGES.admin_tenant_projects_open_source}
                              </Typography>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>
                            {project.projectId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <CustomChip round='true' size='small' color='info' variant='tonal' label={GH_INTERNAL_MESSAGES.admin_tenant_projects_users(project.assignedUsers)} />
                        </TableCell>
                        <TableCell>
                          <CustomChip round='true' size='small' color='success' variant='tonal' label={GH_INTERNAL_MESSAGES.admin_tenant_projects_state_scoped} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default TenantProjectsPanel
