'use client'

// TASK-960 mockup — showcase harness for the Contractor Remittance Advice.
// Toggles locale (es-CL / en-US) + regime (4 cases), renders the in-app MUI
// viewer, and shows how it integrates into the Self-Service Hub (contractor)
// and Admin Workbench (Finance/HR) surfaces from TASK-796.

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import { formatCurrency, type CurrencyCode } from '@/lib/format'

import RemittanceAdviceViewer from './RemittanceAdviceViewer'
import {
  REMITTANCE_REGIMES,
  buildRemittancePresentation,
  type RemittanceLocale,
  type RemittanceRegime
} from './remittance-data'

const SURFACE_COPY: Record<RemittanceLocale, { listTitle: string; view: string; download: string; payeeCol: string; numberCol: string; netCol: string; dateCol: string; actionsCol: string; hubHint: string; adminTitle: string }> = {
  'es-CL': {
    listTitle: 'Comprobantes de pago',
    view: 'Ver',
    download: 'Descargar PDF',
    payeeCol: 'Beneficiario',
    numberCol: 'N°',
    netCol: 'Neto',
    dateCol: 'Fecha',
    actionsCol: 'Acciones',
    hubHint: 'Disponible para cada pago liquidado de tus servicios.',
    adminTitle: 'Comprobantes emitidos'
  },
  'en-US': {
    listTitle: 'Payment remittances',
    view: 'View',
    download: 'Download PDF',
    payeeCol: 'Payee',
    numberCol: 'No.',
    netCol: 'Net',
    dateCol: 'Date',
    actionsCol: 'Actions',
    hubHint: 'Available for each settled payment of your services.',
    adminTitle: 'Issued remittances'
  }
}

const SectionHeading = ({ overline, title }: { overline: string; title: string }) => (
  <Stack spacing={0.5} sx={{ mb: 4 }}>
    <Typography variant='caption' sx={{ color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
      {overline}
    </Typography>
    <Typography variant='h6' sx={{ fontWeight: 600 }}>
      {title}
    </Typography>
  </Stack>
)

const RemittanceAdviceMockupView = () => {
  const theme = useTheme()
  const [locale, setLocale] = useState<RemittanceLocale>('es-CL')
  const [regime, setRegime] = useState<RemittanceRegime>('honorarios_cl')

  const presentation = useMemo(() => buildRemittancePresentation(regime, locale), [regime, locale])
  const surface = SURFACE_COPY[locale]

  const rows = useMemo(
    () =>
      REMITTANCE_REGIMES.map(r => {
        const p = buildRemittancePresentation(r, locale)
        const net = p.breakdown.find(row => row.kind === 'net')

        return {
          regime: r,
          number: p.number,
          payee: p.beneficiary.name,
          regimeLabel: p.labels.regimeLabel,
          net: net ? formatCurrency(net.amount, net.currency as CurrencyCode, { currencySymbolSpacing: ' ' }, locale) : '—',
          date: p.payment.dateValue
        }
      }),
    [locale]
  )

  return (
    <Box sx={{ p: { xs: 4, md: 6 }, maxWidth: 1120, mx: 'auto' }}>
      <Stack spacing={1} sx={{ mb: 5 }}>
        <Typography variant='h4' sx={{ fontWeight: 700 }}>
          Comprobante de Pago · Remittance Advice
        </Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          TASK-960 — documento de confirmación de pago al contractor (no laboral). Proyección read-only del payable,
          bilingüe (sigue el locale del contractor), numeración correlativa <strong>EO-RA-NNNNNN</strong>. El visor MUI
          y el PDF descargable comparten el mismo struct → cero drift.
        </Typography>
      </Stack>

      {/* Controls */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, mb: 6 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems={{ md: 'center' }} justifyContent='space-between'>
            <Stack spacing={1}>
              <Typography id='remittance-locale-label' variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Idioma (locale del contractor)
              </Typography>
              <ToggleButtonGroup
                exclusive
                size='small'
                value={locale}
                onChange={(_, value) => value && setLocale(value as RemittanceLocale)}
                aria-labelledby='remittance-locale-label'
              >
                <ToggleButton value='es-CL'>Español</ToggleButton>
                <ToggleButton value='en-US'>English</ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            <Stack spacing={1}>
              <Typography id='remittance-regime-label' variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Régimen
              </Typography>
              <ToggleButtonGroup
                exclusive
                size='small'
                value={regime}
                onChange={(_, value) => value && setRegime(value as RemittanceRegime)}
                aria-labelledby='remittance-regime-label'
                sx={{ flexWrap: 'wrap' }}
              >
                {REMITTANCE_REGIMES.map(r => (
                  <ToggleButton key={r} value={r}>
                    {buildRemittancePresentation(r, locale).labels.regimeLabel}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* A — In-app document viewer */}
      <SectionHeading overline='Documento' title='Visor in-app (MUI)' />
      <Box sx={{ mb: 8 }}>
        <RemittanceAdviceViewer presentation={presentation} />
      </Box>

      {/* B — Self-Service Hub integration (contractor) */}
      <SectionHeading overline='Integración · TASK-796' title='Self-Service Hub del contractor' />
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, mb: 8 }}>
        <CardContent>
          <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1 }}>
            <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
              {surface.listTitle}
            </Typography>
          </Stack>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {surface.hubHint}
          </Typography>
          <Stack spacing={2} sx={{ mt: 3 }}>
            {rows.map(row => (
              <Box
                key={row.regime}
                sx={{
                  p: 3,
                  borderRadius: 1,
                  border: t => `1px solid ${row.regime === regime ? t.palette.primary.main : t.palette.divider}`,
                  bgcolor: row.regime === regime ? alpha(theme.palette.primary.main, 0.04) : 'transparent'
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'center' }} spacing={2}>
                  <Stack spacing={0.5}>
                    <Stack direction='row' spacing={1.5} alignItems='center'>
                      <Typography variant='body2' sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {row.number}
                      </Typography>
                      <CustomChip round='true' size='small' variant='tonal' color='info' label={row.regimeLabel} />
                    </Stack>
                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                      {row.net} · {row.date}
                    </Typography>
                  </Stack>
                  <Stack direction='row' spacing={2}>
                    <Button size='small' variant='tonal' startIcon={<i className='tabler-eye' />} onClick={() => setRegime(row.regime)}>
                      {surface.view}
                    </Button>
                    <Button size='small' variant='outlined' startIcon={<i className='tabler-download' />}>
                      {surface.download}
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* C — Admin Workbench integration (Finance/HR) */}
      <SectionHeading overline='Integración · TASK-796' title='Admin Workbench (Finance / HR)' />
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent>
          <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 3 }}>
            {surface.adminTitle}
          </Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Box component='table' sx={{ width: '100%', borderCollapse: 'collapse', '& td, & th': { py: 2.5, px: 2, textAlign: 'left', borderBottom: t => `1px solid ${t.palette.divider}` } }}>
              <Box component='thead'>
                <Box component='tr'>
                  {[surface.payeeCol, surface.numberCol, surface.netCol, surface.dateCol, surface.actionsCol].map(col => (
                    <Box component='th' key={col} scope='col'>
                      <Typography variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {col}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component='tbody'>
                {rows.map(row => (
                  <Box component='tr' key={row.regime}>
                    <Box component='td'>
                      <Typography variant='body2' sx={{ fontWeight: 600 }}>
                        {row.payee}
                      </Typography>
                    </Box>
                    <Box component='td'>
                      <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {row.number}
                      </Typography>
                    </Box>
                    <Box component='td'>
                      <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {row.net}
                      </Typography>
                    </Box>
                    <Box component='td'>
                      <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                        {row.date}
                      </Typography>
                    </Box>
                    <Box component='td'>
                      <Stack direction='row' spacing={1.5}>
                        <Button size='small' variant='tonal' onClick={() => setRegime(row.regime)}>
                          {surface.view}
                        </Button>
                        <Button size='small' variant='outlined' startIcon={<i className='tabler-download' />}>
                          {surface.download}
                        </Button>
                      </Stack>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default RemittanceAdviceMockupView
