'use client'

// TASK-960 — in-app MUI viewer for the Contractor Remittance Advice
// ("Comprobante de Pago"). Promoted from the approved mockup
// (src/views/greenhouse/contractors/mockup/RemittanceAdviceViewer.tsx) WITHOUT
// touching the JSX/tokens — only the struct source changed from the mock to the
// canonical type. Renders a RemittancePresentation struct; the SAME struct also
// feeds react-pdf (download) → zero content drift (pattern TASK-758). Sober
// one-accent legal aesthetic. No signature (a remittance advice does not require one).

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import { formatCurrency, type CurrencyCode } from '@/lib/format'
import type { RemittancePresentation } from '@/lib/contractor-engagements/remittance/types'

const FieldBlock = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Stack spacing={0.5}>
    <Typography variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}
    </Typography>
    {children}
  </Stack>
)

const RemittanceAdviceViewer = ({ presentation }: { presentation: RemittancePresentation }) => {
  const theme = useTheme()
  const { issuer, beneficiary, providerDocument, breakdown, fx, payment, labels, disclaimer } = presentation

  const money = (amount: number, currency: string) =>
    formatCurrency(amount, currency as CurrencyCode, { currencySymbolSpacing: ' ' }, presentation.locale)

  return (
    <Card
      elevation={0}
      role='article'
      aria-label={`${labels.title} ${presentation.number}`}
      sx={{
        maxWidth: 760,
        mx: 'auto',
        border: t => `1px solid ${t.palette.divider}`,
        bgcolor: 'background.paper'
      }}
    >
      <CardContent sx={{ p: { xs: 5, sm: 8 } }}>
        {/* Header: issuer (Operating Entity) + document identity */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent='space-between'
          alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
          spacing={4}
        >
          <Stack spacing={2}>
            <Box
              component='img'
              src={issuer.logoSrc}
              alt={issuer.legalName}
              sx={{ height: 30, width: 'auto', objectFit: 'contain' }}
            />
            <Stack spacing={0.25}>
              <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                {issuer.legalName}
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                {issuer.taxIdLabel} {issuer.taxId}
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                {issuer.address}
              </Typography>
            </Stack>
          </Stack>

          <Stack spacing={1} alignItems={{ xs: 'flex-start', sm: 'flex-end' }} sx={{ textAlign: { sm: 'right' } }}>
            <Typography variant='h5' sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.1 }}>
              {labels.title}
            </Typography>
            <CustomChip round='true' size='small' variant='tonal' color='secondary' label={labels.regimeLabel} />
            <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}>
              {labels.numberLabel} {presentation.number}
            </Typography>
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {payment.dateLabel}: {payment.dateValue}
            </Typography>
          </Stack>
        </Stack>

        <Divider sx={{ my: 5 }} />

        {/* Parties: payee (beneficiary) | provider document */}
        <Grid container spacing={5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FieldBlock label={labels.beneficiarySection}>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {beneficiary.name}
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                {beneficiary.taxIdLabel}: {beneficiary.taxId}
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                {beneficiary.countryLabel}: {beneficiary.country}
              </Typography>
            </FieldBlock>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FieldBlock label={labels.providerDocSection}>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {providerDocument.label}
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                {providerDocument.value}
              </Typography>
            </FieldBlock>
          </Grid>
        </Grid>

        <Divider sx={{ my: 5 }} />

        {/* Breakdown: gross -> withholding -> net */}
        <FieldBlock label={labels.breakdownSection}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {breakdown
              .filter(row => row.kind !== 'net')
              .map(row => (
                <Stack key={row.id} direction='row' justifyContent='space-between' alignItems='baseline'>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {row.label}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontVariantNumeric: 'tabular-nums', color: row.negative ? 'text.secondary' : 'text.primary' }}
                  >
                    {row.negative ? '− ' : ''}
                    {money(row.amount, row.currency)}
                  </Typography>
                </Stack>
              ))}

            <Divider />

            {breakdown
              .filter(row => row.kind === 'net')
              .map(row => (
                <Stack key={row.id} direction='row' justifyContent='space-between' alignItems='baseline'>
                  <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                    {row.label}
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={theme => ({
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      color: theme.greenhouseSemantic.success.tonalText
                    })}
                  >
                    {money(row.amount, row.currency)}
                  </Typography>
                </Stack>
              ))}

            {fx ? (
              <Typography variant='caption' sx={{ color: 'text.secondary', mt: 0.5 }}>
                {fx.value}
              </Typography>
            ) : null}
          </Stack>
        </FieldBlock>

        <Divider sx={{ my: 5 }} />

        {/* Payment details */}
        <Grid container spacing={5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FieldBlock label={payment.methodLabel}>
              <Typography variant='body2'>{payment.methodValue}</Typography>
            </FieldBlock>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FieldBlock label={payment.referenceLabel}>
              <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {payment.referenceValue}
              </Typography>
            </FieldBlock>
          </Grid>
        </Grid>

        {/* Non-employment disclaimer (load-bearing) */}
        <Box
          role='note'
          sx={{
            mt: 6,
            p: 3,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.text.primary, 0.03),
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <i className='tabler-info-circle' style={{ fontSize: 18, color: theme.palette.text.disabled, flexShrink: 0 }} aria-hidden />
            <span>{disclaimer}</span>
          </Typography>
        </Box>

        <Typography variant='caption' sx={{ color: 'text.disabled', display: 'block', mt: 4 }}>
          {labels.footerNote}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default RemittanceAdviceViewer
