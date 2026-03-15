'use client'

import { useMemo, useState } from 'react'

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

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import TablePaginationComponent from '@components/TablePaginationComponent'

import type { AiTool, MemberToolLicense, AiToolingAdminMetadata } from '@/types/ai-tools'
import { licenseStatusConfig, accessLevelConfig, formatDate } from '../helpers'
import { getInitials } from '@/utils/getInitials'
import AiLicensesFilters from './AiLicensesFilters'

import tableStyles from '@core/styles/table.module.css'

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
  const [search, setSearch] = useState('')
  const [filtered, setFiltered] = useState<MemberToolLicense[]>(licenses)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'memberName', desc: false }])

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

  const columns = useMemo(
    () => [
      columnHelper.accessor('memberName', {
        header: 'Colaborador',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            <CustomAvatar skin='light' color='info' size={30}>
              {getInitials(row.original.memberName || '')}
            </CustomAvatar>
            <div className='flex flex-col'>
              <Typography className='font-medium' color='text.primary'>
                {row.original.memberName ?? '—'}
              </Typography>
              {row.original.memberEmail && (
                <Typography variant='body2' color='text.disabled'>
                  {row.original.memberEmail}
                </Typography>
              )}
            </div>
          </div>
        )
      }),
      columnHelper.display({
        id: 'toolName',
        header: 'Herramienta',
        cell: ({ row }) => (
          <Typography variant='body2'>{row.original.tool?.toolName ?? row.original.toolId}</Typography>
        )
      }),
      columnHelper.accessor('accessLevel', {
        header: 'Acceso',
        cell: ({ getValue }) => {
          const conf = accessLevelConfig[getValue()]

          return (
            <CustomChip
              round='true' size='small' variant='tonal'
              icon={<i className={conf?.icon ?? 'tabler-shield'} />}
              label={conf?.label ?? getValue()}
              color={conf?.color === 'default' ? 'secondary' : conf?.color ?? 'secondary'}
            />
          )
        }
      }),
      columnHelper.accessor('accountEmail', {
        header: 'Email cuenta',
        cell: ({ getValue }) => (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ fontFamily: getValue() ? 'monospace' : undefined, fontSize: getValue() ? '0.8rem' : undefined }}
          >
            {getValue() ?? '—'}
          </Typography>
        )
      }),
      columnHelper.accessor('licenseStatus', {
        header: 'Estado',
        cell: ({ getValue }) => {
          const conf = licenseStatusConfig[getValue()]

          return (
            <CustomChip
              round='true' size='small' variant='tonal'
              icon={<i className={conf?.icon ?? 'tabler-circle'} />}
              label={conf?.label ?? getValue()}
              color={conf?.color === 'default' ? 'secondary' : conf?.color ?? 'secondary'}
            />
          )
        }
      }),
      columnHelper.display({
        id: 'assignedDate',
        header: 'Asignado',
        cell: ({ row }) => (
          <Typography variant='body2' color='text.secondary'>
            {formatDate(row.original.activatedAt ?? row.original.createdAt)}
          </Typography>
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
    <>
      <Card>
        <CardHeader
          title='Licencias de herramientas'
          subheader={`${filtered.length} licencias`}
          action={
            <Button variant='contained' size='small' startIcon={<i className='tabler-plus' />} onClick={openCreate}>
              Asignar licencia
            </Button>
          }
        />
        <AiLicensesFilters
          data={licenses}
          meta={meta}
          status={filterStatus}
          search={search}
          setStatus={setFilterStatus}
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
                    <Stack alignItems='center' spacing={2} sx={{ py: 6 }}>
                      <CustomAvatar variant='rounded' skin='light' color='info' size={56}>
                        <i className='tabler-key' style={{ fontSize: 28 }} />
                      </CustomAvatar>
                      <Typography variant='h6' color='text.secondary'>
                        {filterStatus || search ? 'Sin resultados' : 'Sin licencias asignadas'}
                      </Typography>
                      <Typography variant='body2' color='text.disabled' sx={{ maxWidth: 360, textAlign: 'center' }}>
                        {filterStatus || search
                          ? 'No hay licencias que coincidan con los filtros.'
                          : 'Asigna herramientas AI a los miembros del equipo para gestionar accesos y controlar el uso.'}
                      </Typography>
                      {!(filterStatus || search) && (
                        <Button variant='contained' size='small' startIcon={<i className='tabler-plus' />} onClick={openCreate}>
                          Asignar primera licencia
                        </Button>
                      )}
                    </Stack>
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
