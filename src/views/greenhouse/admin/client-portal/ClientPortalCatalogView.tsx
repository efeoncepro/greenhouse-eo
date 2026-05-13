'use client'

import { useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import DataTableShell from '@/components/greenhouse/data-table/DataTableShell'
import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_CLIENT_PORTAL_ADMIN } from '@/lib/copy/client-portal-admin'

/**
 * TASK-826 Slice 7 — Read-only V1.0 catálogo de módulos client portal.
 *
 * UI surface canónica para que EFEONCE_ADMIN inspeccione los 10 módulos
 * declarativos seedeados (TASK-824). Filtros simples por applicability_scope
 * + tier. NO permite POST/PUT (V1.0 read-only intencional).
 */

export interface CatalogItem {
  moduleKey: string
  displayLabel: string
  displayLabelClient: string
  description: string | null
  applicabilityScope: string
  tier: string
  viewCodes: readonly string[]
  capabilities: readonly string[]
  dataSources: readonly string[]
  pricingKind: string
  effectiveFrom: string | null
  effectiveTo: string | null
  createdAt: string | null
}

interface ClientPortalCatalogViewProps {
  items: CatalogItem[]
}

const APPLICABILITY_OPTIONS = ['globe', 'wave', 'crm_solutions', 'staff_aug', 'cross'] as const
const TIER_OPTIONS = ['standard', 'addon', 'pilot', 'enterprise', 'internal'] as const

const TIER_COLOR: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info'> = {
  standard: 'primary',
  addon: 'info',
  pilot: 'warning',
  enterprise: 'success',
  internal: 'default'
}

const ClientPortalCatalogView = ({ items }: ClientPortalCatalogViewProps) => {
  const [scopeFilter, setScopeFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (scopeFilter !== 'all' && item.applicabilityScope !== scopeFilter) return false
      if (tierFilter !== 'all' && item.tier !== tierFilter) return false

      return true
    })
  }, [items, scopeFilter, tierFilter])

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant='h4'>{GH_CLIENT_PORTAL_ADMIN.catalog_page_title}</Typography>
        <Typography variant='body2' color='text.secondary'>
          {GH_CLIENT_PORTAL_ADMIN.catalog_page_subtitle}
        </Typography>
      </Stack>

      <Alert severity='info' variant='outlined'>
        Catálogo declarativo V1.0 read-only. Para modificar capabilities, viewCodes o
        applicability_scope de un módulo, crea una migration nueva con un module_key
        versionado (e.g. <code>creative_hub_globe_v2</code>) y supersedea via{' '}
        <code>effective_to</code>.
      </Alert>

      <Card variant='outlined'>
        <CardContent>
          <Stack direction='row' spacing={2} sx={{ mb: 2 }}>
            <TextField
              select
              size='small'
              label='Applicability scope'
              value={scopeFilter}
              onChange={e => setScopeFilter(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value='all'>Todos</MenuItem>
              {APPLICABILITY_OPTIONS.map(option => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size='small'
              label='Tier'
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value='all'>Todos</MenuItem>
              {TIER_OPTIONS.map(option => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {filtered.length === 0 ? (
            <EmptyState
              title={GH_CLIENT_PORTAL_ADMIN.catalog_empty_title}
              description={GH_CLIENT_PORTAL_ADMIN.catalog_empty_body}
            />
          ) : (
            <DataTableShell identifier='client-portal-catalog' ariaLabel='Catálogo client portal modules'>
              <Table size='small'>
                <caption className='sr-only'>Catálogo client portal modules</caption>
                <TableHead>
                  <TableRow>
                    <TableCell scope='col'>Module key</TableCell>
                    <TableCell scope='col'>Label operador</TableCell>
                    <TableCell scope='col'>Label cliente</TableCell>
                    <TableCell scope='col'>{GH_CLIENT_PORTAL_ADMIN.column_applicability}</TableCell>
                    <TableCell scope='col'>{GH_CLIENT_PORTAL_ADMIN.column_tier}</TableCell>
                    <TableCell scope='col'>{GH_CLIENT_PORTAL_ADMIN.column_pricing}</TableCell>
                    <TableCell scope='col'>Capabilities</TableCell>
                    <TableCell scope='col'>View codes</TableCell>
                    <TableCell scope='col'>Data sources</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(item => (
                    <TableRow key={item.moduleKey}>
                      <TableCell>
                        <Box component='code' sx={{ fontSize: '0.8rem' }}>
                          {item.moduleKey}
                        </Box>
                      </TableCell>
                      <TableCell>{item.displayLabel}</TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {item.displayLabelClient}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={item.applicabilityScope} size='small' variant='outlined' />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.tier}
                          size='small'
                          color={TIER_COLOR[item.tier] ?? 'default'}
                          variant='filled'
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary'>
                          {item.pricingKind}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' component='span' color='text.secondary'>
                          {item.capabilities.length} caps
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' component='span' color='text.secondary'>
                          {item.viewCodes.length} views
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' component='span' color='text.secondary'>
                          {item.dataSources.length}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableShell>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}

export default ClientPortalCatalogView
