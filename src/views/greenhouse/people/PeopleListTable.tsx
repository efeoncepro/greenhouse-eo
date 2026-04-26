'use client'

import { useMemo, useState } from 'react'


import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
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
import type { SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import ViewTransitionLink from '@/components/greenhouse/motion/ViewTransitionLink'

import TablePaginationComponent from '@components/TablePaginationComponent'
import TeamAvatar from '@/components/greenhouse/TeamAvatar'

import type { PersonListItem } from '@/types/people'
import { countryLabel, formatFte, roleCategoryLabel, safeRoleCategory } from './helpers'
import PeopleListFilters from './PeopleListFilters'

import tableStyles from '@core/styles/table.module.css'

const columnHelper = createColumnHelper<PersonListItem>()

type Props = {
  data: PersonListItem[]
}

const PeopleListTable = ({ data }: Props) => {
  const [role, setRole] = useState('')
  const [country, setCountry] = useState('')
  const [status, setStatus] = useState('active')
  const [search, setSearch] = useState('')
  const [filtered, setFiltered] = useState<PersonListItem[]>(data)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'displayName', desc: false }])

  const columns = useMemo(
    () => [
      columnHelper.accessor('displayName', {
        header: 'Colaborador',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            {/* TASK-525: avatar + name share view-transition-name with the
                detail PersonProfileHeader so they morph on navigation. */}
            <div style={{ viewTransitionName: `person-avatar-${row.original.memberId}` }}>
              <TeamAvatar
                name={row.original.displayName}
                avatarUrl={row.original.avatarUrl}
                roleCategory={safeRoleCategory(row.original.roleCategory)}
                size={38}
              />
            </div>
            <div className='flex flex-col'>
              <Typography
                component={ViewTransitionLink}
                href={`/people/${row.original.memberId}`}
                color='text.primary'
                className='font-medium'
                sx={{
                  '&:hover': { color: 'primary.main' },
                  viewTransitionName: `person-identity-${row.original.memberId}`
                }}
              >
                {row.original.displayName}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {row.original.publicEmail}
              </Typography>
            </div>
          </div>
        )
      }),
      columnHelper.accessor('roleTitle', {
        header: 'Cargo',
        cell: ({ getValue }) => (
          <Typography variant='body2'>{getValue()}</Typography>
        )
      }),
      columnHelper.accessor('roleCategory', {
        header: 'Rol',
        cell: ({ getValue }) => (
          <Chip
            size='small'
            label={roleCategoryLabel[safeRoleCategory(getValue() as string)] ?? getValue()}
            variant='tonal'
            color='secondary'
          />
        )
      }),
      columnHelper.accessor('locationCountry', {
        header: 'País',
        cell: ({ getValue }) => (
          <Typography variant='body2'>{countryLabel(getValue())}</Typography>
        )
      }),
      columnHelper.accessor('totalAssignments', {
        header: 'Spaces',
        cell: ({ getValue }) => (
          <Typography variant='body2'>{getValue()}</Typography>
        )
      }),
      columnHelper.accessor('totalFte', {
        header: 'FTE',
        cell: ({ getValue }) => (
          <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
            {formatFte(getValue())}
          </Typography>
        )
      }),
      columnHelper.accessor('active', {
        header: 'Estado',
        cell: ({ getValue }) => (
          <Chip
            size='small'
            label={getValue() ? 'Activo' : 'Inactivo'}
            color={getValue() ? 'success' : 'default'}
            variant='tonal'
          />
        )
      })
    ],
    []
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  })

  return (
    <Card>
      <CardHeader title='Equipo' subheader={`${filtered.length} colaboradores`} />
      <PeopleListFilters
        data={data}
        role={role}
        country={country}
        status={status}
        search={search}
        setRole={setRole}
        setCountry={setCountry}
        setStatus={setStatus}
        setSearch={setSearch}
        setFiltered={setFiltered}
      />
      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={classnames({ 'flex items-center': header.column.getIsSorted(), 'cursor-pointer select-none': header.column.getCanSort() })}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <i className='tabler-chevron-up text-xl' />,
                          desc: <i className='tabler-chevron-down text-xl' />
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className='text-center'>
                  <Typography color='text.secondary' sx={{ py: 4 }}>
                    No se encontraron colaboradores
                  </Typography>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        component={() => <TablePaginationComponent table={table} />}
        count={table.getFilteredRowModel().rows.length}
        rowsPerPage={table.getState().pagination.pageSize}
        page={table.getState().pagination.pageIndex}
        onPageChange={(_, page) => table.setPageIndex(page)}
      />
    </Card>
  )
}

export default PeopleListTable
