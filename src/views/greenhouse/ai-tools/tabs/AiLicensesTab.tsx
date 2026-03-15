'use client'

import { useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'
import type { TextFieldProps } from '@mui/material/TextField'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import TablePaginationComponent from '@components/TablePaginationComponent'

import type { AiTool, MemberToolLicense, AiToolingAdminMetadata } from '@/types/ai-tools'
import { licenseStatusConfig, accessLevelConfig, formatDate } from '../helpers'
import { getInitials } from '@/utils/getInitials'
import AiLicensesFilters from './AiLicensesFilters'

import tableStyles from '@core/styles/table.module.css'

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)

  addMeta({ itemRank })

  return itemRank.passed
}

const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & Omit<TextFieldProps, 'onChange'>) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => { setValue(initialValue) }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => { onChange(value) }, debounce)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <CustomTextField {...props} value={value} onChange={e => setValue(e.target.value)} />
}

const columnHelper = createColumnHelper<MemberToolLicense>()

type Props = {
  licenses: MemberToolLicense[]
  tools: AiTool[]
  meta: AiToolingAdminMetadata | null
  onRefresh: () => void
}

const AiLicensesTab = ({ licenses, tools, meta, onRefresh }: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filtered, setFiltered] = useState<MemberToolLicense[]>(licenses)
  const [globalFilter, setGlobalFilter] = useState('')

  // Form state
  const [formMember, setFormMember] = useState('')
  const [formTool, setFormTool] = useState('')
  const [formAccess, setFormAccess] = useState('full')
  const [formEmail, setFormEmail] = useState('')
  const [formExpires, setFormExpires] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const openCreate = () => {
    setFormMember('')
    setFormTool('')
    setFormAccess('full')
    setFormEmail('')
    setFormExpires('')
    setFormNotes('')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const res = await fetch('/api/admin/ai-tools/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: formMember,
          toolId: formTool,
          accessLevel: formAccess,
          accountEmail: formEmail || null,
          expiresAt: formExpires || null,
          notes: formNotes || null
        })
      })

      if (res.ok) {
        setDialogOpen(false)
        onRefresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const columns = useMemo<ColumnDef<MemberToolLicense, any>[]>(
    () => [
      columnHelper.accessor('memberName', {
        header: 'Colaborador',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            <CustomAvatar skin='light' color='info' size={34}>
              {getInitials(row.original.memberName || '')}
            </CustomAvatar>
            <div className='flex flex-col'>
              <Typography color='text.primary' className='font-medium'>
                {row.original.memberName ?? '—'}
              </Typography>
              {row.original.memberEmail && (
                <Typography variant='body2'>{row.original.memberEmail}</Typography>
              )}
            </div>
          </div>
        )
      }),
      columnHelper.display({
        id: 'toolName',
        header: 'Herramienta',
        cell: ({ row }) => (
          <Typography color='text.primary'>{row.original.tool?.toolName ?? row.original.toolId}</Typography>
        )
      }),
      columnHelper.accessor('accessLevel', {
        header: 'Acceso',
        cell: ({ row }) => {
          const al = row.original.accessLevel
          const conf = accessLevelConfig[al]

          return (
            <CustomChip
              round='true' size='small' variant='tonal'
              icon={<i className={conf?.icon ?? 'tabler-shield'} />}
              label={conf?.label ?? al}
              color={conf?.color === 'default' ? 'secondary' : conf?.color ?? 'secondary'}
            />
          )
        }
      }),
      columnHelper.accessor('accountEmail', {
        header: 'Email cuenta',
        cell: ({ getValue }) => (
          <Typography sx={{ fontFamily: getValue() ? 'monospace' : undefined, fontSize: getValue() ? '0.8rem' : undefined }}>
            {getValue() ?? '—'}
          </Typography>
        )
      }),
      columnHelper.accessor('licenseStatus', {
        header: 'Estado',
        cell: ({ row }) => {
          const st = row.original.licenseStatus
          const conf = licenseStatusConfig[st]

          return (
            <CustomChip
              round='true' size='small' variant='tonal'
              label={conf?.label ?? st}
              color={conf?.color === 'default' ? 'secondary' : conf?.color ?? 'secondary'}
            />
          )
        }
      }),
      columnHelper.display({
        id: 'assignedDate',
        header: 'Asignado',
        cell: ({ row }) => (
          <Typography>{formatDate(row.original.activatedAt ?? row.original.createdAt)}</Typography>
        )
      })
    ],
    []
  )

  const table = useReactTable({
    data: filtered,
    columns,
    filterFns: { fuzzy: fuzzyFilter },
    state: { globalFilter },
    globalFilterFn: fuzzyFilter,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  })

  return (
    <>
      <Card>
        <CardHeader title='Filters' className='pbe-4' />
        <AiLicensesFilters
          data={licenses}
          meta={meta}
          status={filterStatus}
          setStatus={setFilterStatus}
          setFiltered={setFiltered}
        />
        <div className='flex justify-between flex-col items-start md:flex-row md:items-center p-6 border-bs gap-4'>
          <CustomTextField
            select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className='max-sm:is-full sm:is-[70px]'
          >
            <MenuItem value='10'>10</MenuItem>
            <MenuItem value='25'>25</MenuItem>
            <MenuItem value='50'>50</MenuItem>
          </CustomTextField>
          <div className='flex flex-col sm:flex-row max-sm:is-full items-start sm:items-center gap-4'>
            <DebouncedInput
              value={globalFilter ?? ''}
              onChange={value => setGlobalFilter(String(value))}
              placeholder='Buscar licencia'
              className='max-sm:is-full sm:is-[250px]'
            />
            <Button
              variant='contained'
              startIcon={<i className='tabler-plus' />}
              onClick={openCreate}
              className='max-sm:is-full'
            >
              Asignar licencia
            </Button>
          </div>
        </div>
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : (
                        <>
                          <div
                            className={classnames({
                              'flex items-center': header.column.getIsSorted(),
                              'cursor-pointer select-none': header.column.getCanSort()
                            })}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: <i className='tabler-chevron-up text-xl' />,
                              desc: <i className='tabler-chevron-down text-xl' />
                            }[header.column.getIsSorted() as 'asc' | 'desc'] ?? null}
                          </div>
                        </>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            {table.getFilteredRowModel().rows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                    <Typography color='text.secondary' sx={{ py: 4 }}>
                      No se encontraron licencias
                    </Typography>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {table
                  .getRowModel()
                  .rows.slice(0, table.getState().pagination.pageSize)
                  .map(row => (
                    <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
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
          onPageChange={(_, page) => table.setPageIndex(page)}
        />
      </Card>

      {/* Assign License Dialog */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth='sm' fullWidth closeAfterTransition={false}>
        <DialogTitle>
          <Stack direction='row' spacing={2} alignItems='center'>
            <CustomAvatar variant='rounded' skin='light' color='info' size={36}>
              <i className='tabler-key' style={{ fontSize: 20 }} />
            </CustomAvatar>
            <Box>
              <Typography variant='h6'>Asignar licencia</Typography>
              <Typography variant='caption' color='text.secondary'>Otorga acceso a una herramienta AI</Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <CustomTextField
              select fullWidth size='small' label='Colaborador'
              value={formMember} onChange={e => setFormMember(e.target.value)}
              required
            >
              {(meta?.activeMembers ?? []).length === 0 && <MenuItem disabled value=''>Sin miembros disponibles</MenuItem>}
              {(meta?.activeMembers ?? []).map(m => (
                <MenuItem key={m.memberId} value={m.memberId}>{m.displayName}</MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              select fullWidth size='small' label='Herramienta'
              value={formTool} onChange={e => setFormTool(e.target.value)}
              required
            >
              {tools.length === 0 && <MenuItem value='' disabled>Sin herramientas disponibles</MenuItem>}
              {tools
                .filter(tool => tool.isActive)
                .map(tool => (
                  <MenuItem key={tool.toolId} value={tool.toolId}>{tool.toolName}</MenuItem>
                ))}
            </CustomTextField>
            <CustomTextField
              select fullWidth size='small' label='Nivel de acceso'
              value={formAccess} onChange={e => setFormAccess(e.target.value)}
            >
              {(meta?.accessLevels ?? ['full', 'limited', 'trial', 'viewer']).map(al => (
                <MenuItem key={al} value={al}>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <i className={accessLevelConfig[al as keyof typeof accessLevelConfig]?.icon ?? 'tabler-shield'} style={{ fontSize: 16 }} />
                    <span>{accessLevelConfig[al as keyof typeof accessLevelConfig]?.label ?? al}</span>
                  </Stack>
                </MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              fullWidth size='small' label='Email de cuenta'
              value={formEmail} onChange={e => setFormEmail(e.target.value)}
              helperText='Email asociado a la cuenta de la herramienta'
            />
            <CustomTextField
              fullWidth size='small' label='Fecha expiración' type='date'
              value={formExpires} onChange={e => setFormExpires(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <CustomTextField
              fullWidth size='small' label='Notas'
              value={formNotes} onChange={e => setFormNotes(e.target.value)}
              multiline rows={2}
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 4, py: 2.5 }}>
          <Button variant='tonal' color='secondary' onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant='contained' onClick={handleSave} disabled={saving || !formMember || !formTool}>
            {saving ? 'Asignando...' : 'Asignar licencia'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default AiLicensesTab
