'use client'

import { useState, useTransition } from 'react'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { DataTableShell } from '@/components/greenhouse/data-table'

import type { ProductCatalogDetailData } from './detail-data'

// ─────────────────────────────────────────────────────────────
// TASK-605 Fase E — Detail editor (MVP, no tabs — single page
// with sections). Tabs + rich editor + member autocomplete are
// deferred to follow-up tasks.
// ─────────────────────────────────────────────────────────────

const CURRENCY_CODES = ['CLP', 'USD', 'CLF', 'COP', 'MXN', 'PEN'] as const

type CurrencyCode = (typeof CURRENCY_CODES)[number]

interface Props {
  data: ProductCatalogDetailData
}

const formatDate = (iso: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)

  return Number.isFinite(d.getTime()) ? d.toLocaleString('es-CL') : '—'
}

const ProductCatalogDetailView = ({ data }: Props) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { product, prices, owner, drift, refOptions } = data

  const [form, setForm] = useState({
    productName: product.productName,
    description: product.description ?? '',
    descriptionRichHtml: product.descriptionRichHtml ?? '',
    hubspotProductTypeCode: product.hubspotProductTypeCode ?? '',
    categoryCode: product.categoryCode ?? '',
    unitCode: product.unitCode ?? '',
    taxCategoryCode: product.taxCategoryCode ?? '',
    isRecurring: product.isRecurring,
    recurringBillingFrequencyCode: product.recurringBillingFrequencyCode ?? '',
    recurringBillingPeriodIso: product.recurringBillingPeriodIso ?? '',
    commercialOwnerMemberId: product.commercialOwnerMemberId ?? '',
    ownerGhAuthoritative: product.ownerGhAuthoritative,
    marketingUrl: product.marketingUrl ?? '',
    imageUrlsText: product.imageUrls.join('\n'),
    isArchived: product.isArchived
  })

  // Build price map keyed by currency for easy state management.
  const initialPriceMap = new Map<CurrencyCode, { unitPrice: number; isAuthoritative: boolean; source: string }>()

  for (const price of prices) {
    initialPriceMap.set(price.currencyCode as CurrencyCode, {
      unitPrice: price.unitPrice,
      isAuthoritative: price.isAuthoritative,
      source: price.source
    })
  }

  const [priceInputs, setPriceInputs] = useState<Record<CurrencyCode, string>>(() => {
    const result = {} as Record<CurrencyCode, string>

    for (const code of CURRENCY_CODES) {
      const existing = initialPriceMap.get(code)

      result[code] = existing ? String(existing.unitPrice) : ''
    }

    return result
  })

  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'success'; message: string } | { kind: 'error'; message: string }
  >({ kind: 'idle' })

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveDetail = () => {
    startTransition(async () => {
      try {
        const imageUrls = form.imageUrlsText
          .split('\n')
          .map(u => u.trim())
          .filter(u => u.length > 0)

        const body = {
          productName: form.productName,
          description: form.description || null,
          descriptionRichHtml: form.descriptionRichHtml || null,
          hubspotProductTypeCode: form.hubspotProductTypeCode || null,
          categoryCode: form.categoryCode || null,
          unitCode: form.unitCode || null,
          taxCategoryCode: form.taxCategoryCode || null,
          isRecurring: form.isRecurring,
          recurringBillingFrequencyCode: form.recurringBillingFrequencyCode || null,
          recurringBillingPeriodIso: form.recurringBillingPeriodIso || null,
          commercialOwnerMemberId: form.commercialOwnerMemberId || null,
          ownerGhAuthoritative: form.ownerGhAuthoritative,
          marketingUrl: form.marketingUrl || null,
          imageUrls,
          isArchived: form.isArchived
        }

        const res = await fetch(
          `/api/admin/commercial/products/${encodeURIComponent(product.productId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          }
        )

        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null

          setStatus({ kind: 'error', message: err?.error ?? `HTTP ${res.status}` })
          
return
        }

        setStatus({ kind: 'success', message: 'Cambios guardados.' })
        router.refresh()
      } catch (err) {
        setStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : String(err)
        })
      }
    })
  }

  const handleSavePrices = () => {
    startTransition(async () => {
      try {
        const payload: Array<{ currencyCode: string; unitPrice: number }> = []

        for (const code of CURRENCY_CODES) {
          const input = priceInputs[code]?.trim() ?? ''

          if (input.length === 0) continue
          const num = Number(input)

          if (!Number.isFinite(num) || num < 0) {
            setStatus({ kind: 'error', message: `Precio inválido para ${code}` })
            
return
          }

          payload.push({ currencyCode: code, unitPrice: num })
        }

        if (payload.length === 0) {
          setStatus({ kind: 'error', message: 'Ingresa al menos 1 precio autoritativo.' })
          
return
        }

        const res = await fetch(
          `/api/admin/commercial/products/${encodeURIComponent(product.productId)}/prices`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prices: payload })
          }
        )

        const result = (await res.json().catch(() => null)) as
          | { written?: unknown[]; errors?: Array<{ currencyCode: string; error: string }> }
          | null

        if (!res.ok && result?.errors?.length) {
          setStatus({
            kind: 'error',
            message: `Errores: ${result.errors.map(e => `${e.currencyCode}: ${e.error}`).join('; ')}`
          })
          
return
        }

        if (!res.ok) {
          setStatus({ kind: 'error', message: `HTTP ${res.status}` })
          
return
        }

        setStatus({
          kind: 'success',
          message: `Precios guardados: ${result?.written?.length ?? 0} autoritativos.`
        })
        router.refresh()
      } catch (err) {
        setStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : String(err)
        })
      }
    })
  }

  const handleManualSync = () => {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/commercial/products/${encodeURIComponent(product.productId)}/sync`,
          { method: 'POST' }
        )

        const result = (await res.json().catch(() => null)) as
          | { status?: string; action?: string; hubspotProductId?: string; error?: string }
          | null

        if (!res.ok) {
          setStatus({
            kind: 'error',
            message: `Sync falló: ${result?.error ?? `HTTP ${res.status}`}`
          })
          
return
        }

        setStatus({
          kind: 'success',
          message: `Sync ${result?.status ?? 'ok'} (${result?.action ?? '—'})${
            result?.hubspotProductId ? ` hubspotId=${result.hubspotProductId}` : ''
          }`
        })
        router.refresh()
      } catch (err) {
        setStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : String(err)
        })
      }
    })
  }

  return (
    <Box>
      <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 2 }}>
        <Box>
          <Link
            href='/admin/commercial/product-catalog'
            style={{ textDecoration: 'none', fontSize: 14, color: '#666' }}
          >
            ← Catálogo
          </Link>
          <Typography variant='h4' sx={{ mt: 1 }}>
            {product.productName}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            SKU {product.productCode} · {product.businessLineCode ?? 'sin BU'} ·{' '}
            {product.sourceKind ?? 'manual'} · HubSpot ID{' '}
            {product.hubspotProductId ?? 'sin binding'}
          </Typography>
        </Box>
        <Stack direction='row' spacing={1}>
          <Chip
            label={product.syncStatus}
            size='small'
            color={product.syncStatus === 'synced' ? 'success' : 'default'}
            variant='outlined'
          />
          {product.isArchived && <Chip label='Archivado' size='small' variant='outlined' />}
          <Button
            variant='contained'
            onClick={handleManualSync}
            disabled={isPending}
          >
            Sincronizar a HubSpot
          </Button>
        </Stack>
      </Stack>

      {status.kind === 'success' && (
        <Alert severity='success' onClose={() => setStatus({ kind: 'idle' })} sx={{ mb: 2 }}>
          {status.message}
        </Alert>
      )}
      {status.kind === 'error' && (
        <Alert severity='error' onClose={() => setStatus({ kind: 'idle' })} sx={{ mb: 2 }}>
          {status.message}
        </Alert>
      )}

      {drift && drift.driftedFields && drift.driftedFields.length > 0 && (
        <Alert severity='warning' sx={{ mb: 2 }}>
          <Typography variant='subtitle2'>
            Drift detectado ({drift.driftedFields.length}):
          </Typography>
          <Box component='ul' sx={{ my: 0.5, pl: 2 }}>
            {drift.driftedFields.map((field, idx) => (
              <Box component='li' key={`${field.name}-${idx}`} sx={{ typography: 'body2' }}>
                <strong>{field.name}</strong> — {field.classification}
                {field.reason ? `: ${field.reason}` : ''}
              </Box>
            ))}
          </Box>
          <Typography variant='caption' color='text.secondary'>
            El próximo outbound (manual o reactivo) resuelve los{' '}
            <code>pending_overwrite</code>. Revisa manualmente los <code>manual_drift</code> y{' '}
            <code>error</code>.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Identidad */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant='outlined' sx={{ p: 3 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>
              Identidad
            </Typography>
            <Stack spacing={2}>
              <TextField
                label='Nombre'
                value={form.productName}
                onChange={e => setField('productName', e.target.value)}
                fullWidth
                size='small'
              />
              <TextField
                label='Descripción (texto plano)'
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                fullWidth
                multiline
                rows={3}
                size='small'
              />
              <TextField
                label='Descripción HTML (rich)'
                value={form.descriptionRichHtml}
                onChange={e => setField('descriptionRichHtml', e.target.value)}
                fullWidth
                multiline
                rows={4}
                size='small'
                helperText='Whitelist server-side: <p>, <strong>, <em>, <ul>, <ol>, <li>, <a href>, <br>'
              />
              <TextField
                label='Marketing URL'
                value={form.marketingUrl}
                onChange={e => setField('marketingUrl', e.target.value)}
                fullWidth
                size='small'
              />
              <TextField
                label='Image URLs (una por línea)'
                value={form.imageUrlsText}
                onChange={e => setField('imageUrlsText', e.target.value)}
                fullWidth
                multiline
                rows={3}
                size='small'
                helperText='URLs HTTPS absolutas'
              />
            </Stack>
          </Paper>
        </Grid>

        {/* Clasificación */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant='outlined' sx={{ p: 3 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>
              Clasificación
            </Typography>
            <Stack spacing={2}>
              <TextField
                select
                label='HubSpot product_type'
                value={form.hubspotProductTypeCode}
                onChange={e => setField('hubspotProductTypeCode', e.target.value)}
                fullWidth
                size='small'
              >
                <MenuItem value=''>—</MenuItem>
                <MenuItem value='service'>service</MenuItem>
                <MenuItem value='inventory'>inventory</MenuItem>
                <MenuItem value='non_inventory'>non_inventory</MenuItem>
              </TextField>

              <TextField
                select
                label='Categoría'
                value={form.categoryCode}
                onChange={e => setField('categoryCode', e.target.value)}
                fullWidth
                size='small'
              >
                <MenuItem value=''>—</MenuItem>
                {refOptions.categories.map(cat => (
                  <MenuItem key={cat.code} value={cat.code}>
                    {cat.labelEs} ({cat.code})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label='Unidad'
                value={form.unitCode}
                onChange={e => setField('unitCode', e.target.value)}
                fullWidth
                size='small'
              >
                <MenuItem value=''>—</MenuItem>
                {refOptions.units.map(u => (
                  <MenuItem key={u.code} value={u.code}>
                    {u.labelEs} ({u.code})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label='Categoría tributaria'
                value={form.taxCategoryCode}
                onChange={e => setField('taxCategoryCode', e.target.value)}
                fullWidth
                size='small'
              >
                <MenuItem value=''>—</MenuItem>
                {refOptions.taxCategories.map(tc => (
                  <MenuItem key={tc.code} value={tc.code}>
                    {tc.labelEs} ({tc.code})
                  </MenuItem>
                ))}
              </TextField>

              <Box>
                <Typography variant='caption' color='text.secondary'>
                  pricing_model <strong>flat</strong> · classification <strong>standalone</strong>{' '}
                  · bundle_type <strong>none</strong> (Fase 1 fijo)
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Precios */}
        <Grid size={12}>
          <Paper variant='outlined' sx={{ p: 3 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>
              Precios autoritativos
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ mb: 2, display: 'block' }}>
              Ingresa un precio para marcarlo como autoritativo (`source=gh_admin`). Los otros se
              derivan automáticamente via FX. Deja en blanco las monedas que no vas a fijar.
            </Typography>
            <DataTableShell identifier='product-catalog-prices' ariaLabel='Precios autoritativos del producto'>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Moneda</TableCell>
                  <TableCell align='right'>Precio actual</TableCell>
                  <TableCell>Fuente</TableCell>
                  <TableCell>Nuevo precio (opcional)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {CURRENCY_CODES.map(code => {
                  const existing = initialPriceMap.get(code)

                  return (
                    <TableRow key={code}>
                      <TableCell>
                        <strong>{code}</strong>
                      </TableCell>
                      <TableCell align='right'>
                        {existing ? existing.unitPrice.toLocaleString('es-CL') : '—'}
                      </TableCell>
                      <TableCell>
                        {existing ? (
                          <Chip
                            label={existing.source}
                            size='small'
                            variant='outlined'
                            color={existing.isAuthoritative ? 'primary' : 'default'}
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <TextField
                          size='small'
                          type='number'
                          placeholder='0.00'
                          value={priceInputs[code]}
                          onChange={e =>
                            setPriceInputs(prev => ({ ...prev, [code]: e.target.value }))
                          }
                          sx={{ width: 160 }}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            </DataTableShell>
            <Stack direction='row' spacing={2} sx={{ mt: 2 }}>
              <Button variant='contained' onClick={handleSavePrices} disabled={isPending}>
                Guardar precios
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* Recurrencia */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant='outlined' sx={{ p: 3 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>
              Recurrencia
            </Typography>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isRecurring}
                    onChange={e => setField('isRecurring', e.target.checked)}
                  />
                }
                label='Producto recurrente'
              />
              <TextField
                label='Frecuencia de facturación'
                value={form.recurringBillingFrequencyCode}
                onChange={e => setField('recurringBillingFrequencyCode', e.target.value)}
                fullWidth
                size='small'
                placeholder='monthly, yearly, ...'
                disabled={!form.isRecurring}
              />
              <TextField
                label='Período de facturación (ISO 8601)'
                value={form.recurringBillingPeriodIso}
                onChange={e => setField('recurringBillingPeriodIso', e.target.value)}
                fullWidth
                size='small'
                placeholder='P1M, P1Y, ...'
                disabled={!form.isRecurring}
              />
            </Stack>
          </Paper>
        </Grid>

        {/* Metadatos */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant='outlined' sx={{ p: 3 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>
              Metadatos y owner
            </Typography>
            <Stack spacing={2}>
              <TextField
                label='Commercial owner member_id'
                value={form.commercialOwnerMemberId}
                onChange={e => setField('commercialOwnerMemberId', e.target.value)}
                fullWidth
                size='small'
                helperText={
                  owner
                    ? `Actual: ${owner.displayName ?? owner.memberId}${
                        owner.email ? ` <${owner.email}>` : ''
                      }`
                    : 'Sin owner asignado. Ingresa member_id directamente (autocomplete es follow-up).'
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.ownerGhAuthoritative}
                    onChange={e => setField('ownerGhAuthoritative', e.target.checked)}
                  />
                }
                label='Owner SoT = Greenhouse (autoritativo)'
              />
              <Typography variant='caption' color='text.secondary'>
                Con <strong>ownerGhAuthoritative=true</strong>, cambios de owner en HubSpot se
                ignoran. Soft-SoT por default durante la ventana pre-admin-UI.
              </Typography>

              <Divider />

              <FormControlLabel
                control={
                  <Switch
                    checked={form.isArchived}
                    onChange={e => setField('isArchived', e.target.checked)}
                  />
                }
                label='Archivado'
              />

              <Divider />

              <Stack spacing={0.5}>
                <Typography variant='caption' color='text.secondary'>
                  <strong>Last outbound sync:</strong> {formatDate(product.lastOutboundSyncAt)}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  <strong>GH last write:</strong> {formatDate(product.ghLastWriteAt)}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  <strong>Owner assigned (HS audit):</strong>{' '}
                  {formatDate(product.commercialOwnerAssignedAt)}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  <strong>Updated at:</strong> {formatDate(product.updatedAt)}
                </Typography>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Stack direction='row' spacing={2} sx={{ mt: 3 }}>
        <Button variant='contained' size='large' onClick={handleSaveDetail} disabled={isPending}>
          Guardar cambios
        </Button>
        <Button variant='outlined' href='/admin/commercial/product-catalog' disabled={isPending}>
          Volver
        </Button>
      </Stack>
    </Box>
  )
}

export default ProductCatalogDetailView
