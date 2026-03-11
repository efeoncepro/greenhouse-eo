'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'

import TablePaginationComponent from '@components/TablePaginationComponent'

import type { AdminUserDetail } from '@/lib/admin/get-admin-user-detail'
import { getInitials } from '@/utils/getInitials'

import tableStyles from '@core/styles/table.module.css'

import { accessLevelTone, getProjectAccessProgress, toTitleCase } from './helpers'

type ProjectRow = AdminUserDetail['projectScopes'][number]

const columnHelper = createColumnHelper<ProjectRow>()

const UserProjectListTable = ({ data }: { data: AdminUserDetail }) => {
  const [searchValue, setSearchValue] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'projectName', desc: false }])

  const filteredProjects = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return data.projectScopes.filter(project => {
      if (query.length === 0) return true

      return [project.projectName, project.accessLevel, project.projectId].join(' ').toLowerCase().includes(query)
    })
  }, [data.projectScopes, searchValue])

  const columns = useMemo<ColumnDef<ProjectRow, any>[]>(
    () => [
      columnHelper.accessor('projectName', {
        header: 'Project',
        cell: ({ row }) => (
          <div className='flex items-center gap-4'>
            <CustomAvatar skin='light' color='primary' size={34}>
              {getInitials(row.original.projectName)}
            </CustomAvatar>
            <div className='flex flex-col'>
              <Typography color='text.primary' className='font-medium'>
                {row.original.projectName}
              </Typography>
              <Typography variant='body2'>{row.original.projectId}</Typography>
            </div>
          </div>
        )
      }),
      columnHelper.accessor('accessLevel', {
        header: 'Access',
        cell: ({ row }) => (
          <Chip size='small' variant='tonal' color={accessLevelTone(row.original.accessLevel)} label={toTitleCase(row.original.accessLevel)} />
        )
      }),
      columnHelper.display({
        id: 'coverage',
        header: 'Coverage',
        cell: ({ row }) => {
          const progress = getProjectAccessProgress(row.original.accessLevel)

          return (
            <div className='min-is-[140px]'>
              <Typography color='text.primary' className='mbe-1'>{`${progress}%`}</Typography>
              <LinearProgress color={accessLevelTone(row.original.accessLevel)} value={progress} variant='determinate' className='is-full' />
            </div>
          )
        }
      }),
      columnHelper.display({
        id: 'source',
        header: 'Source',
        cell: ({ row }) =>
          row.original.pageUrl ? (
            <Typography component={Link} href={row.original.pageUrl} target='_blank' color='primary'>
              Abrir Notion
            </Typography>
          ) : (
            <Typography color='text.secondary'>Sin origen</Typography>
          )
      })
    ],
    []
  )

  const table = useReactTable({
    data: filteredProjects,
    columns,
    state: { sorting },
    initialState: {
      pagination: {
        pageSize: 7
      }
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  return (
    <Card>
      <CardHeader title="User's Project List" />
      <div className='flex items-center justify-between p-6 gap-4'>
        <div className='flex items-center gap-2'>
          <Typography>Show</Typography>
          <CustomTextField
            select
            value={table.getState().pagination.pageSize}
            onChange={event => table.setPageSize(Number(event.target.value))}
            className='is-[88px]'
          >
            <MenuItem value='5'>5</MenuItem>
            <MenuItem value='7'>7</MenuItem>
            <MenuItem value='10'>10</MenuItem>
          </CustomTextField>
        </div>
        <CustomTextField value={searchValue} onChange={event => setSearchValue(event.target.value)} placeholder='Search Project' />
      </div>
      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={classnames({
                          'flex items-center gap-2': header.column.getIsSorted(),
                          'cursor-pointer select-none': header.column.getCanSort()
                        })}
                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <i className='tabler-chevron-up text-xl' />,
                          desc: <i className='tabler-chevron-down text-xl' />
                        }[header.column.getIsSorted() as 'asc' | 'desc'] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          {table.getRowModel().rows.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                  Este usuario no tiene scopes de proyecto activos.
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
      <TablePagination
        component={() => <TablePaginationComponent table={table} />}
        count={table.getFilteredRowModel().rows.length}
        rowsPerPage={table.getState().pagination.pageSize}
        page={table.getState().pagination.pageIndex}
        onPageChange={(_, page) => {
          table.setPageIndex(page)
        }}
      />
    </Card>
  )
}

export default UserProjectListTable
