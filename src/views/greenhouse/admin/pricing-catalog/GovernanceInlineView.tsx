'use client'

import { useCallback, useEffect, useState } from 'react'

import { toast } from 'react-toastify'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

// ── Types ──────────────────────────────────────────────────────────────

interface RoleTierMarginEntry {
  tier: string
  tierLabel: string
  marginMin: number
  marginOpt: number
  marginMax: number
  effectiveFrom: string
  notes: string | null
  updatedAt: string
}

interface ServiceTierMarginEntry {
  tier: string
  tierLabel: string
  marginBase: number
  description: string | null
  effectiveFrom: string
  updatedAt: string
}

interface CommercialModelMultiplierEntry {
  modelCode: string
  modelLabel: string
  multiplierPct: number
  description: string | null
  effectiveFrom: string
  updatedAt: string
}

interface CountryPricingFactorEntry {
  factorCode: string
  factorLabel: string
  factorMin: number
  factorOpt: number
  factorMax: number
  appliesWhen: string | null
  effectiveFrom: string
  updatedAt: string
}

interface FteHoursGuideEntry {
  fteFraction: number
  fteLabel: string
  monthlyHours: number
  recommendedDescription: string | null
  effectiveFrom: string
  updatedAt: string
}

interface GovernanceData {
  roleTierMargins: RoleTierMarginEntry[]
  serviceTierMargins: ServiceTierMarginEntry[]
  commercialModelMultipliers: CommercialModelMultiplierEntry[]
  countryPricingFactors: CountryPricingFactorEntry[]
  fteHoursGuide: FteHoursGuideEntry[]
}

type GovernanceType =
  | 'role_tier_margin'
  | 'service_tier_margin'
  | 'commercial_model_multiplier'
  | 'country_pricing_factor'

// ── Helpers ────────────────────────────────────────────────────────────

const formatPct = (value: number): string =>
  `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value)}%`

// ── Inline editable cell ───────────────────────────────────────────────

interface InlinePctCellProps {
  value: number
  onSave: (next: number) => Promise<void>
  disabled?: boolean
  ariaLabel: string
}

const InlinePctCell = ({ value, onSave, disabled, ariaLabel }: InlinePctCellProps) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value.toString())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(value.toString())
  }, [value, editing])

  const commit = async () => {
    const parsed = Number(draft)

    if (!Number.isFinite(parsed)) {
      toast.error('Ingresa un número válido.')
      setDraft(value.toString())
      setEditing(false)

      return
    }

    if (parsed === value) {
      setEditing(false)

      return
    }

    setSaving(true)

    try {
      await onSave(parsed)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <Stack direction='row' spacing={1} alignItems='center'>
        <CustomTextField
          size='small'
          type='number'
          value={draft}
          onChange={e => setDraft(e.target.value)}
          disabled={saving}
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter') void commit()
            else if (e.key === 'Escape') {
              setDraft(value.toString())
              setEditing(false)
            }
          }}
          sx={{ width: 96 }}
          aria-label={ariaLabel}
        />
        <IconButton size='small' onClick={() => void commit()} disabled={saving} aria-label='Guardar'>
          {saving ? <CircularProgress size={14} /> : <i className='tabler-check' style={{ fontSize: 16 }} />}
        </IconButton>
        <IconButton
          size='small'
          onClick={() => {
            setDraft(value.toString())
            setEditing(false)
          }}
          disabled={saving}
          aria-label='Cancelar'
        >
          <i className='tabler-x' style={{ fontSize: 16 }} />
        </IconButton>
      </Stack>
    )
  }

  return (
    <Stack direction='row' spacing={1} alignItems='center'>
      <Typography variant='body2' sx={{ fontWeight: 500 }}>
        {formatPct(value)}
      </Typography>
      {!disabled && (
        <Tooltip title='Editar'>
          <IconButton size='small' onClick={() => setEditing(true)} aria-label={`Editar ${ariaLabel}`}>
            <i className='tabler-pencil' style={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  )
}

// ── Section header ─────────────────────────────────────────────────────

interface SectionHeaderProps {
  icon: string
  color: 'primary' | 'info' | 'success' | 'warning' | 'error' | 'secondary'
  title: string
  subtitle: string
  count: number
}

const SectionHeader = ({ icon, color, title, subtitle, count }: SectionHeaderProps) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
    <Avatar variant='rounded' sx={{ bgcolor: `${color}.lightOpacity` }}>
      <i className={icon} style={{ fontSize: 22, color: `var(--mui-palette-${color}-main)` }} />
    </Avatar>
    <Box sx={{ flex: 1 }}>
      <Typography variant='h6'>{title}</Typography>
      <Typography variant='caption' color='text.secondary'>
        {subtitle}
      </Typography>
    </Box>
    <CustomChip round='true' size='small' variant='tonal' color={color} label={`${count} filas`} />
  </Box>
)

// ── Main component ─────────────────────────────────────────────────────

const GovernanceInlineView = () => {
  const [data, setData] = useState<GovernanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/admin/pricing-catalog/governance')

      if (res.ok) {
        setData(await res.json())
        setError(null)
      } else {
        setError(`No pudimos cargar las reglas de gobernanza (HTTP ${res.status}).`)
      }
    } catch {
      setError('No se pudo conectar al servidor. Verifica tu conexión.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const patch = useCallback(
    async (type: GovernanceType, payload: Record<string, unknown>, label: string) => {
      try {
        const res = await fetch('/api/admin/pricing-catalog/governance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, payload })
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))

          toast.error(body.error || `No pudimos actualizar ${label}.`)
          throw new Error(body.error || 'update_failed')
        }

        toast.success(`${label} actualizado`)
        await loadData()
      } catch (err) {
        if (!(err instanceof Error) || err.message !== 'update_failed') {
          toast.error(`No pudimos actualizar ${label}.`)
        }

        throw err
      }
    },
    [loadData]
  )

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 1 }}>
          <Tooltip title='Volver al catálogo'>
            <IconButton component='a' href='/admin/pricing-catalog' size='small' aria-label='Volver al catálogo'>
              <i className='tabler-arrow-left' />
            </IconButton>
          </Tooltip>
          <Typography variant='h4' sx={{ fontWeight: 600 }}>
            Gobierno de márgenes
          </Typography>
        </Stack>
        <Typography variant='body2' color='text.secondary'>
          Reglas centrales que gobiernan rangos de margen, multiplicadores comerciales y factores por país.
        </Typography>
      </Grid>

      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert
            severity='error'
            action={
              <Button color='inherit' size='small' onClick={() => void loadData()}>
                Reintentar
              </Button>
            }
          >
            {error}
          </Alert>
        </Grid>
      )}

      {/* Role tier margins */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <Accordion defaultExpanded disableGutters sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
              <SectionHeader
                icon='tabler-scale'
                color='primary'
                title='Márgenes por tier de rol'
                subtitle='Rangos mín/óptimo/máx que gobiernan rentabilidad por tier'
                count={data?.roleTierMargins.length ?? 0}
              />
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tier</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell align='center'>Margen mínimo</TableCell>
                      <TableCell align='center'>Margen óptimo</TableCell>
                      <TableCell align='center'>Margen máximo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data?.roleTierMargins ?? []).map(row => (
                      <TableRow key={row.tier}>
                        <TableCell>
                          <CustomChip round='true' size='small' variant='tonal' color='primary' label={`T${row.tier}`} />
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>{row.tierLabel}</Typography>
                        </TableCell>
                        <TableCell align='center'>
                          <InlinePctCell
                            value={row.marginMin}
                            ariaLabel={`margen mínimo tier ${row.tier}`}
                            onSave={next =>
                              patch(
                                'role_tier_margin',
                                {
                                  tier: row.tier,
                                  tierLabel: row.tierLabel,
                                  marginMin: next,
                                  marginOpt: row.marginOpt,
                                  marginMax: row.marginMax,
                                  notes: row.notes
                                },
                                `margen mínimo tier ${row.tier}`
                              )
                            }
                          />
                        </TableCell>
                        <TableCell align='center'>
                          <InlinePctCell
                            value={row.marginOpt}
                            ariaLabel={`margen óptimo tier ${row.tier}`}
                            onSave={next =>
                              patch(
                                'role_tier_margin',
                                {
                                  tier: row.tier,
                                  tierLabel: row.tierLabel,
                                  marginMin: row.marginMin,
                                  marginOpt: next,
                                  marginMax: row.marginMax,
                                  notes: row.notes
                                },
                                `margen óptimo tier ${row.tier}`
                              )
                            }
                          />
                        </TableCell>
                        <TableCell align='center'>
                          <InlinePctCell
                            value={row.marginMax}
                            ariaLabel={`margen máximo tier ${row.tier}`}
                            onSave={next =>
                              patch(
                                'role_tier_margin',
                                {
                                  tier: row.tier,
                                  tierLabel: row.tierLabel,
                                  marginMin: row.marginMin,
                                  marginOpt: row.marginOpt,
                                  marginMax: next,
                                  notes: row.notes
                                },
                                `margen máximo tier ${row.tier}`
                              )
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </Card>
      </Grid>

      {/* Service tier margins */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <Accordion disableGutters sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
              <SectionHeader
                icon='tabler-briefcase'
                color='success'
                title='Márgenes base por tier de servicio'
                subtitle='Margen base que aplica a servicios empaquetados según tier'
                count={data?.serviceTierMargins.length ?? 0}
              />
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tier</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell align='center'>Margen base</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data?.serviceTierMargins ?? []).map(row => (
                      <TableRow key={row.tier}>
                        <TableCell>
                          <CustomChip round='true' size='small' variant='tonal' color='success' label={`T${row.tier}`} />
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>{row.tierLabel}</Typography>
                          {row.description && (
                            <Typography variant='caption' color='text.secondary'>
                              {row.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align='center'>
                          <InlinePctCell
                            value={row.marginBase}
                            ariaLabel={`margen base servicio tier ${row.tier}`}
                            onSave={next =>
                              patch(
                                'service_tier_margin',
                                {
                                  tier: row.tier,
                                  tierLabel: row.tierLabel,
                                  marginBase: next,
                                  description: row.description
                                },
                                `margen base servicio tier ${row.tier}`
                              )
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </Card>
      </Grid>

      {/* Commercial model multipliers */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <Accordion disableGutters sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
              <SectionHeader
                icon='tabler-contract'
                color='info'
                title='Multiplicadores por modelo comercial'
                subtitle='Ajuste porcentual según modelo de contratación (on-going, on-demand, híbrido)'
                count={data?.commercialModelMultipliers.length ?? 0}
              />
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Modelo</TableCell>
                      <TableCell align='center'>Multiplicador</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data?.commercialModelMultipliers ?? []).map(row => (
                      <TableRow key={row.modelCode}>
                        <TableCell>
                          <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {row.modelCode}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>{row.modelLabel}</Typography>
                          {row.description && (
                            <Typography variant='caption' color='text.secondary'>
                              {row.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align='center'>
                          <InlinePctCell
                            value={row.multiplierPct}
                            ariaLabel={`multiplicador modelo ${row.modelCode}`}
                            onSave={next =>
                              patch(
                                'commercial_model_multiplier',
                                {
                                  modelCode: row.modelCode,
                                  modelLabel: row.modelLabel,
                                  multiplierPct: next,
                                  description: row.description
                                },
                                `multiplicador ${row.modelLabel}`
                              )
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </Card>
      </Grid>

      {/* Country pricing factors */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <Accordion disableGutters sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
              <SectionHeader
                icon='tabler-flag'
                color='error'
                title='Factores de precio por país'
                subtitle='Ajustes mín/óptimo/máx aplicados según mercado del cliente'
                count={data?.countryPricingFactors.length ?? 0}
              />
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Mercado</TableCell>
                      <TableCell align='center'>Factor mínimo</TableCell>
                      <TableCell align='center'>Factor óptimo</TableCell>
                      <TableCell align='center'>Factor máximo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data?.countryPricingFactors ?? []).map(row => (
                      <TableRow key={row.factorCode}>
                        <TableCell>
                          <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {row.factorCode}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>{row.factorLabel}</Typography>
                          {row.appliesWhen && (
                            <Typography variant='caption' color='text.secondary'>
                              {row.appliesWhen}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align='center'>
                          <InlinePctCell
                            value={row.factorMin}
                            ariaLabel={`factor mínimo ${row.factorCode}`}
                            onSave={next =>
                              patch(
                                'country_pricing_factor',
                                {
                                  factorCode: row.factorCode,
                                  factorLabel: row.factorLabel,
                                  factorMin: next,
                                  factorOpt: row.factorOpt,
                                  factorMax: row.factorMax,
                                  appliesWhen: row.appliesWhen
                                },
                                `factor mínimo ${row.factorLabel}`
                              )
                            }
                          />
                        </TableCell>
                        <TableCell align='center'>
                          <InlinePctCell
                            value={row.factorOpt}
                            ariaLabel={`factor óptimo ${row.factorCode}`}
                            onSave={next =>
                              patch(
                                'country_pricing_factor',
                                {
                                  factorCode: row.factorCode,
                                  factorLabel: row.factorLabel,
                                  factorMin: row.factorMin,
                                  factorOpt: next,
                                  factorMax: row.factorMax,
                                  appliesWhen: row.appliesWhen
                                },
                                `factor óptimo ${row.factorLabel}`
                              )
                            }
                          />
                        </TableCell>
                        <TableCell align='center'>
                          <InlinePctCell
                            value={row.factorMax}
                            ariaLabel={`factor máximo ${row.factorCode}`}
                            onSave={next =>
                              patch(
                                'country_pricing_factor',
                                {
                                  factorCode: row.factorCode,
                                  factorLabel: row.factorLabel,
                                  factorMin: row.factorMin,
                                  factorOpt: row.factorOpt,
                                  factorMax: next,
                                  appliesWhen: row.appliesWhen
                                },
                                `factor máximo ${row.factorLabel}`
                              )
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </Card>
      </Grid>

      {/* FTE hours guide (read-only) */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <Accordion disableGutters sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
              <SectionHeader
                icon='tabler-clock-hour-4'
                color='warning'
                title='Guía de horas por FTE'
                subtitle='Referencia de horas mensuales según dedicación (11 filas fijas)'
                count={data?.fteHoursGuide.length ?? 0}
              />
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Alert severity='info' sx={{ m: 3 }}>
                Tabla de solo lectura. Son las horas mensuales <strong>que se cobran al cliente</strong> según la fracción de FTE vendida. Distinto de la capacidad operacional del módulo Agency Team (160h/FTE fijo). Los valores son referenciales y no se editan desde esta vista.
              </Alert>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell align='center'>Dedicación</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell align='center'>Horas mensuales</TableCell>
                      <TableCell>Recomendación</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data?.fteHoursGuide ?? []).map(row => (
                      <TableRow key={row.fteFraction}>
                        <TableCell align='center'>
                          <CustomChip
                            round='true'
                            size='small'
                            variant='tonal'
                            color='warning'
                            label={`${(row.fteFraction * 100).toFixed(0)}%`}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>{row.fteLabel}</Typography>
                        </TableCell>
                        <TableCell align='center'>
                          <Typography variant='body2' sx={{ fontWeight: 500 }}>
                            {row.monthlyHours}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='caption' color='text.secondary'>
                            {row.recommendedDescription ?? '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </Card>
      </Grid>
    </Grid>
  )
}

export default GovernanceInlineView
