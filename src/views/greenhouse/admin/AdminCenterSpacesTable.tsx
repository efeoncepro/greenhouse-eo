'use client'

import { useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'

import EmptyState from '@components/greenhouse/EmptyState'
import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import { getInitials } from '@/utils/getInitials'

import type { DerivedControlTowerTenant } from '../internal/dashboard/helpers'
import { formatPercent, getOtdTone } from '../internal/dashboard/helpers'

type StatusFilter = 'all' | 'active' | 'onboarding' | 'attention' | 'inactive'

type Props = {
  rows: DerivedControlTowerTenant[]
  totalRows: number
  searchValue: string
  onSearchChange: (value: string) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (value: StatusFilter) => void
  onExport: () => void
  attentionCount: number
}

const PAGE_SIZE = 8

const filterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: GH_INTERNAL_MESSAGES.internal_dashboard_table_filter_all },
  { value: 'active', label: GH_INTERNAL_MESSAGES.internal_dashboard_table_filter_active },
  { value: 'onboarding', label: GH_INTERNAL_MESSAGES.internal_dashboard_table_filter_onboarding },
  { value: 'attention', label: GH_INTERNAL_MESSAGES.internal_dashboard_table_filter_attention },
  { value: 'inactive', label: GH_INTERNAL_MESSAGES.internal_dashboard_table_filter_inactive }
]

const AdminCenterSpacesTable = ({
  rows,
  totalRows,
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onExport,
  attentionCount
}: Props) => {
  const router = useRouter()
  const theme = useTheme()
  const [page, setPage] = useState(0)

  const paginatedRows = useMemo(
    () => rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [rows, page]
  )

  return (
    <Stack spacing={3}>
      {/* Filter bar */}
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={2}
        alignItems={{ lg: 'center' }}
        justifyContent='space-between'
      >
        <Stack direction='row' spacing={1} flexWrap='wrap'>
          {filterOptions.map(option => {
            const isActive = statusFilter === option.value

            const chip = (
              <Chip
                clickable
                color={isActive ? 'primary' : 'default'}
                variant={isActive ? 'filled' : 'outlined'}
                label={option.label}
                onClick={() => {
                  onStatusFilterChange(option.value)
                  setPage(0)
                }}
              />
            )

            if (option.value === 'attention' && attentionCount > 0) {
              return (
                <Badge key={option.value} badgeContent={attentionCount} color='error'>
                  {chip}
                </Badge>
              )
            }

            return <Box key={option.value}>{chip}</Box>
          })}
        </Stack>
        <Stack direction='row' spacing={2} alignItems='center'>
          <CustomTextField
            value={searchValue}
            onChange={event => {
              onSearchChange(event.target.value)
              setPage(0)
            }}
            placeholder={GH_INTERNAL_MESSAGES.internal_dashboard_table_search_placeholder}
            sx={{ minWidth: 200 }}
          />
          <Button
            variant='tonal'
            color='secondary'
            size='small'
            startIcon={<i className='tabler-upload' />}
            onClick={onExport}
          >
            {GH_INTERNAL_MESSAGES.internal_dashboard_export}
          </Button>
        </Stack>
      </Stack>

      {/* Table */}
      {rows.length === 0 ? (
        <EmptyState
          icon={totalRows === 0 ? 'tabler-building-community' : 'tabler-search-off'}
          title={
            totalRows === 0
              ? GH_INTERNAL_MESSAGES.internal_dashboard_table_empty_title
              : GH_INTERNAL_MESSAGES.internal_dashboard_table_empty_filtered_title
          }
          description={
            totalRows === 0
              ? GH_INTERNAL_MESSAGES.internal_dashboard_table_empty_description
              : GH_INTERNAL_MESSAGES.internal_dashboard_table_empty_filtered_description
          }
          minHeight={200}
        />
      ) : (
        <>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Space</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align='center'>Usuarios</TableCell>
                  <TableCell align='center'>Proyectos</TableCell>
                  <TableCell align='right'>Actividad</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRows.map(row => {
                  const avatarColor = row.needsAttention
                    ? 'error'
                    : row.statusTone === 'default'
                      ? 'secondary'
                      : row.statusTone

                  return (
                    <TableRow
                      key={row.clientId}
                      hover
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: row.needsAttention
                          ? alpha(theme.palette.error.main, 0.04)
                          : undefined
                      }}
                      onClick={() => router.push(`/admin/tenants/${row.clientId}`)}
                    >
                      {/* Space */}
                      <TableCell>
                        <Stack direction='row' spacing={2} alignItems='center'>
                          <CustomAvatar
                            skin={row.logoUrl ? undefined : 'light'}
                            color={avatarColor}
                            size={38}
                            src={row.logoUrl ? `/api/media/tenants/${row.clientId}/logo` : undefined}
                          >
                            {row.logoUrl ? null : getInitials(row.clientName)}
                          </CustomAvatar>
                          <Stack spacing={0.25}>
                            <Typography variant='body2' sx={{ fontWeight: 500 }}>
                              {row.clientName}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {row.primaryContactEmail || GH_INTERNAL_MESSAGES.internal_dashboard_table_no_contact}
                            </Typography>
                            {row.primaryAlerts.length > 0 ? (
                              <Typography variant='caption' color='error.main'>
                                {row.primaryAlerts[0]}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Stack>
                      </TableCell>

                      {/* Estado */}
                      <TableCell>
                        <Stack spacing={0.75}>
                          <Chip
                            size='small'
                            variant='tonal'
                            color={row.statusTone === 'default' ? undefined : row.statusTone}
                            label={row.statusLabel}
                          />
                          {row.avgOnTimePct !== null ? (
                            <Chip
                              size='small'
                              variant='outlined'
                              color={getOtdTone(row.avgOnTimePct) === 'default' ? undefined : getOtdTone(row.avgOnTimePct)}
                              label={`OTD ${formatPercent(row.avgOnTimePct)}`}
                            />
                          ) : null}
                        </Stack>
                      </TableCell>

                      {/* Usuarios */}
                      <TableCell align='center'>
                        <Typography variant='body2'>
                          {row.activeUsers} / {row.totalUsers}
                        </Typography>
                        {row.invitedUsers > 0 ? (
                          <Typography variant='caption' color='text.secondary'>
                            {row.invitedUsers} pend.
                          </Typography>
                        ) : null}
                      </TableCell>

                      {/* Proyectos */}
                      <TableCell align='center'>
                        <Stack direction='row' spacing={0.75} justifyContent='center' alignItems='center'>
                          {row.scopedProjects === 0 ? (
                            <i className='tabler-alert-triangle text-[16px]' style={{ color: theme.palette.error.main }} />
                          ) : null}
                          <Typography
                            variant='body2'
                            color={row.scopedProjects === 0 ? 'error.main' : 'text.primary'}
                          >
                            {row.scopedProjects}
                          </Typography>
                        </Stack>
                      </TableCell>

                      {/* Actividad */}
                      <TableCell align='right'>
                        <Typography
                          variant='body2'
                          color={(row.lastActivityDays ?? 0) > 30 ? 'error.main' : 'text.primary'}
                        >
                          {row.lastActivityLabel}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {row.lastLoginAt
                            ? GH_INTERNAL_MESSAGES.internal_dashboard_table_last_login_recorded
                            : GH_INTERNAL_MESSAGES.internal_dashboard_table_no_login}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component='div'
            count={rows.length}
            rowsPerPage={PAGE_SIZE}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPageOptions={[PAGE_SIZE]}
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </>
      )}
    </Stack>
  )
}

export default AdminCenterSpacesTable
