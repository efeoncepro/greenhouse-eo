'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

type TenantMapping = {
  scim_tenant_mapping_id: string
  microsoft_tenant_id: string
  tenant_name: string | null
  client_id: string | null
  default_role_code: string
  allowed_email_domains: string[]
  auto_provision: boolean
  active: boolean
  created_at: string
  updated_at: string
}

type Props = {
  mappings: TenantMapping[]
}

const formatDate = (value: string | null) => {
  if (!value) return '—'

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Santiago'
  }).format(new Date(value))
}

export default function ScimTenantMappingsView({ mappings: initialMappings }: Props) {
  const [mappings, setMappings] = useState(initialMappings)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    microsoftTenantId: '',
    tenantName: '',
    clientId: '',
    defaultRoleCode: 'collaborator',
    allowedEmailDomains: '',
    autoProvision: true
  })

  const handleCreate = async () => {
    setSaving(true)

    try {
      const res = await fetch('/api/admin/scim-tenant-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          allowedEmailDomains: form.allowedEmailDomains
            .split(',')
            .map(d => d.trim().toLowerCase())
            .filter(Boolean)
        })
      })

      if (res.ok) {
        const data = await res.json()

        setMappings(prev => [...prev, data.mapping])
        setDialogOpen(false)
        setForm({
          microsoftTenantId: '',
          tenantName: '',
          clientId: '',
          defaultRoleCode: 'collaborator',
          allowedEmailDomains: '',
          autoProvision: true
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (mapping: TenantMapping, field: 'auto_provision' | 'active') => {
    const newValue = !mapping[field]
    const bodyField = field === 'auto_provision' ? 'autoProvision' : 'active'

    const res = await fetch(`/api/admin/scim-tenant-mappings/${mapping.scim_tenant_mapping_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [bodyField]: newValue })
    })

    if (res.ok) {
      setMappings(prev =>
        prev.map(m =>
          m.scim_tenant_mapping_id === mapping.scim_tenant_mapping_id
            ? { ...m, [field]: newValue }
            : m
        )
      )
    }
  }

  return (
    <Box>
      <Card>
        <CardHeader
          title='SCIM Tenant Mappings'
          subheader='Configura qué tenants de Microsoft Entra pueden aprovisionar usuarios automáticamente en Greenhouse.'
          action={
            <Button variant='contained' size='small' onClick={() => setDialogOpen(true)}>
              + Nuevo Mapping
            </Button>
          }
        />
        <CardContent>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Tenant</TableCell>
                  <TableCell>Microsoft Tenant ID</TableCell>
                  <TableCell>Client ID</TableCell>
                  <TableCell>Rol Default</TableCell>
                  <TableCell>Dominios</TableCell>
                  <TableCell>Auto-Provision</TableCell>
                  <TableCell>Activo</TableCell>
                  <TableCell>Actualizado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mappings.map(m => (
                  <TableRow key={m.scim_tenant_mapping_id}>
                    <TableCell>
                      <Typography variant='body2' fontWeight={600}>
                        {m.tenant_name || m.client_id || 'Tenant interno'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='monoId'>{m.microsoft_tenant_id.slice(0, 8)}...</Typography>
                    </TableCell>
                    <TableCell>{m.client_id || 'Interno Efeonce'}</TableCell>
                    <TableCell>
                      <Chip label={m.default_role_code} size='small' variant='outlined' />
                    </TableCell>
                    <TableCell>
                      <Stack direction='row' spacing={0.5} flexWrap='wrap'>
                        {m.allowed_email_domains.map(d => (
                          <Chip key={d} label={d} size='small' />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={m.auto_provision}
                        size='small'
                        onChange={() => handleToggle(m, 'auto_provision')}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={m.active}
                        size='small'
                        onChange={() => handleToggle(m, 'active')}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='caption'>{formatDate(m.updated_at)}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {mappings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align='center'>
                      <Typography variant='body2' color='text.secondary' py={4}>
                        No hay tenant mappings configurados.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Nuevo SCIM Tenant Mapping</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label='Microsoft Tenant ID'
              placeholder='a80bf6c1-7c45-4d70-b043-...'
              fullWidth
              size='small'
              value={form.microsoftTenantId}
              onChange={e => setForm(f => ({ ...f, microsoftTenantId: e.target.value }))}
            />
            <TextField
              label='Nombre del Tenant'
              placeholder='Efeonce Group'
              fullWidth
              size='small'
              value={form.tenantName}
              onChange={e => setForm(f => ({ ...f, tenantName: e.target.value }))}
            />
            <TextField
              label='Client ID (Greenhouse)'
              placeholder='Vacío para tenant interno; client_id real para clientes'
              fullWidth
              size='small'
              value={form.clientId}
              onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
            />
            <TextField
              label='Rol Default'
              placeholder='collaborator'
              fullWidth
              size='small'
              value={form.defaultRoleCode}
              onChange={e => setForm(f => ({ ...f, defaultRoleCode: e.target.value }))}
            />
            <TextField
              label='Dominios permitidos (separados por coma)'
              placeholder='efeoncepro.com, efeonce.org'
              fullWidth
              size='small'
              value={form.allowedEmailDomains}
              onChange={e => setForm(f => ({ ...f, allowedEmailDomains: e.target.value }))}
            />
            <Stack direction='row' alignItems='center' spacing={1}>
              <Switch
                checked={form.autoProvision}
                onChange={e => setForm(f => ({ ...f, autoProvision: e.target.checked }))}
              />
              <Typography variant='body2'>Auto-provisioning habilitado</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant='contained'
            onClick={handleCreate}
            disabled={saving || !form.microsoftTenantId}
          >
            {saving ? 'Guardando...' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
