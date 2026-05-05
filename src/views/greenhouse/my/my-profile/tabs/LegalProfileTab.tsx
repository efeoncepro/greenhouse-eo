'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

interface DocumentMaskedDto {
  documentId: string
  countryCode: string
  documentType: string
  displayMask: string
  verificationStatus: 'pending_review' | 'verified' | 'rejected' | 'archived' | 'expired'
  source: string
  declaredAt: string
  rejectedReason: string | null
}

interface AddressMaskedDto {
  addressId: string
  addressType: 'legal' | 'residence' | 'mailing' | 'emergency'
  countryCode: string
  presentationMask: string
  city: string
  region: string | null
  verificationStatus: DocumentMaskedDto['verificationStatus']
  source: string
  declaredAt: string
  rejectedReason: string | null
}

interface ReadinessResultDto {
  ready: boolean
  blockers: string[]
  warnings: string[]
}

interface LegalProfileResponseDto {
  profileId: string
  documents: DocumentMaskedDto[]
  addresses: AddressMaskedDto[]
  readiness: {
    payrollChileDependent: ReadinessResultDto
    finalSettlementChile: ReadinessResultDto
  }
}

const STATUS_LABELS: Record<DocumentMaskedDto['verificationStatus'], string> = {
  pending_review: 'Pendiente de revision',
  verified: 'Verificado',
  rejected: 'Rechazado',
  archived: 'Archivado',
  expired: 'Vencido'
}

const STATUS_COLORS: Record<DocumentMaskedDto['verificationStatus'], 'default' | 'success' | 'warning' | 'error'> = {
  pending_review: 'warning',
  verified: 'success',
  rejected: 'error',
  archived: 'default',
  expired: 'default'
}

const ADDRESS_TYPE_LABELS: Record<AddressMaskedDto['addressType'], string> = {
  legal: 'Direccion legal',
  residence: 'Residencia',
  mailing: 'Correspondencia',
  emergency: 'Contacto de emergencia'
}

const formatDeclared = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

const documentTypeLabel = (type: string, country: string): string => {
  if (type === 'CL_RUT') return 'RUT (Chile)'

  return `${type.replace(/_/g, ' ')} (${country})`
}

const LegalProfileTab = () => {
  const [data, setData] = useState<LegalProfileResponseDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [docCountry, setDocCountry] = useState('CL')
  const [docType, setDocType] = useState('CL_RUT')
  const [docValue, setDocValue] = useState('')

  const [addrType, setAddrType] = useState<AddressMaskedDto['addressType']>('legal')
  const [addrCountry, setAddrCountry] = useState('CL')
  const [addrStreet, setAddrStreet] = useState('')
  const [addrCity, setAddrCity] = useState('')
  const [addrRegion, setAddrRegion] = useState('')
  const [addrPostal, setAddrPostal] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const r = await fetch('/api/my/legal-profile', { cache: 'no-store' })

      if (!r.ok) {
        const body = await r.json().catch(() => ({}))

        throw new Error(body?.error ?? 'Error al cargar tus datos legales')
      }

      const json = (await r.json()) as LegalProfileResponseDto

      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDocumentSubmit = async () => {
    if (!docValue.trim()) {
      setError('Ingresa el numero de documento')

      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const r = await fetch('/api/my/legal-profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'document',
          countryCode: docCountry,
          documentType: docType,
          rawValue: docValue.trim()
        })
      })

      if (!r.ok) {
        const body = await r.json().catch(() => ({}))

        throw new Error(body?.error ?? 'Error al guardar el documento')
      }

      setDocValue('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddressSubmit = async () => {
    if (!addrStreet.trim() || !addrCity.trim()) {
      setError('Calle y ciudad son requeridas')

      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const r = await fetch('/api/my/legal-profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'address',
          addressType: addrType,
          countryCode: addrCountry,
          streetLine1: addrStreet.trim(),
          city: addrCity.trim(),
          region: addrRegion.trim() || null,
          postalCode: addrPostal.trim() || null
        })
      })

      if (!r.ok) {
        const body = await r.json().catch(() => ({}))

        throw new Error(body?.error ?? 'Error al guardar la direccion')
      }

      setAddrStreet('')
      setAddrCity('')
      setAddrRegion('')
      setAddrPostal('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  const blockerLabels = useMemo<Record<string, string>>(
    () => ({
      cl_rut_missing: 'Falta declarar tu RUT',
      cl_rut_pending_review: 'Tu RUT esta pendiente de revision por HR',
      cl_rut_rejected: 'Tu RUT fue rechazado — vuelve a declararlo',
      cl_rut_archived_or_expired: 'Tu RUT esta archivado o vencido',
      address_missing_legal: 'Falta tu direccion legal',
      address_missing_residence: 'Falta tu direccion de residencia',
      profile_missing: 'Tu perfil de identidad no esta vinculado',
      document_missing: 'Falta declarar un documento',
      document_pending_review: 'Tu documento esta pendiente de revision'
    }),
    []
  )

  if (loading) return <LinearProgress />

  return (
    <Box>
      {error ? (
        <Alert severity='error' sx={{ mb: 4 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {data?.readiness?.finalSettlementChile?.blockers?.length ? (
        <Alert severity='warning' sx={{ mb: 4 }}>
          <Typography variant='body2' sx={{ fontWeight: 600 }}>
            Datos pendientes para emitir documentos formales
          </Typography>
          <Box component='ul' sx={{ m: 0, pl: 3 }}>
            {data.readiness.finalSettlementChile.blockers.map(b => (
              <li key={b}>
                <Typography variant='body2'>{blockerLabels[b] ?? b}</Typography>
              </li>
            ))}
          </Box>
        </Alert>
      ) : null}

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Stack spacing={4}>
                <Box>
                  <Typography variant='h6'>Documento de identidad</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Ingresa tu RUT si eres colaborador en Chile, o tu documento equivalente.
                    Tu valor completo NUNCA se muestra despues de guardarlo — solo HR puede verlo,
                    con motivo y registro de auditoria.
                  </Typography>
                </Box>

                <Stack spacing={3}>
                  {data?.documents?.length ? (
                    data.documents.map(doc => (
                      <Box key={doc.documentId} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Stack direction='row' alignItems='center' justifyContent='space-between'>
                          <Stack spacing={0.5}>
                            <Typography variant='body2' sx={{ fontWeight: 600 }}>
                              {documentTypeLabel(doc.documentType, doc.countryCode)}
                            </Typography>
                            <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>
                              {doc.displayMask}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              Declarado {formatDeclared(doc.declaredAt)}
                            </Typography>
                            {doc.rejectedReason ? (
                              <Typography variant='caption' color='error'>
                                Motivo del rechazo: {doc.rejectedReason}
                              </Typography>
                            ) : null}
                          </Stack>
                          <Chip
                            size='small'
                            label={STATUS_LABELS[doc.verificationStatus]}
                            color={STATUS_COLORS[doc.verificationStatus]}
                            variant={doc.verificationStatus === 'verified' ? 'filled' : 'tonal'}
                          />
                        </Stack>
                      </Box>
                    ))
                  ) : (
                    <Typography variant='body2' color='text.secondary'>
                      Aun no has declarado tu documento de identidad.
                    </Typography>
                  )}
                </Stack>

                <Divider />

                <Stack spacing={2}>
                  <Typography variant='subtitle2'>Declarar / actualizar documento</Typography>

                  <FormControl size='small'>
                    <InputLabel>Pais emisor</InputLabel>
                    <Select
                      label='Pais emisor'
                      value={docCountry}
                      onChange={e => setDocCountry(String(e.target.value))}
                    >
                      <MenuItem value='CL'>Chile</MenuItem>
                      <MenuItem value='AR'>Argentina</MenuItem>
                      <MenuItem value='BR'>Brasil</MenuItem>
                      <MenuItem value='CO'>Colombia</MenuItem>
                      <MenuItem value='MX'>Mexico</MenuItem>
                      <MenuItem value='PE'>Peru</MenuItem>
                      <MenuItem value='UY'>Uruguay</MenuItem>
                      <MenuItem value='US'>Estados Unidos</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size='small'>
                    <InputLabel>Tipo de documento</InputLabel>
                    <Select
                      label='Tipo de documento'
                      value={docType}
                      onChange={e => setDocType(String(e.target.value))}
                    >
                      <MenuItem value='CL_RUT'>RUT (Chile)</MenuItem>
                      <MenuItem value='CL_PASSPORT'>Pasaporte (Chile)</MenuItem>
                      <MenuItem value='AR_DNI'>DNI (Argentina)</MenuItem>
                      <MenuItem value='BR_CPF'>CPF (Brasil)</MenuItem>
                      <MenuItem value='CO_CC'>Cedula (Colombia)</MenuItem>
                      <MenuItem value='MX_RFC'>RFC (Mexico)</MenuItem>
                      <MenuItem value='PE_DNI'>DNI (Peru)</MenuItem>
                      <MenuItem value='UY_CI'>Cedula (Uruguay)</MenuItem>
                      <MenuItem value='US_SSN'>SSN (US)</MenuItem>
                      <MenuItem value='US_PASSPORT'>Pasaporte (US)</MenuItem>
                      <MenuItem value='GENERIC_PASSPORT'>Pasaporte (otro pais)</MenuItem>
                      <MenuItem value='GENERIC_NATIONAL_ID'>Documento nacional (otro pais)</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    size='small'
                    label={docType === 'CL_RUT' ? 'RUT' : 'Numero de documento'}
                    placeholder={docType === 'CL_RUT' ? '12.345.678-K' : 'Ingresa el numero de documento'}
                    value={docValue}
                    onChange={e => setDocValue(e.target.value)}
                  />

                  <FormHelperText>
                    Despues de guardar veras solo los ultimos digitos. Tu valor completo NUNCA aparece
                    en logs ni se comparte sin tu autorizacion.
                  </FormHelperText>

                  <Button
                    variant='contained'
                    onClick={handleDocumentSubmit}
                    disabled={submitting || !docValue.trim()}
                  >
                    Guardar documento
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Stack spacing={4}>
                <Box>
                  <Typography variant='h6'>Direcciones</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Tu direccion legal se usa para documentos formales (finiquito, contrato).
                    La direccion de residencia es para entregas y comunicaciones.
                  </Typography>
                </Box>

                <Stack spacing={3}>
                  {data?.addresses?.length ? (
                    data.addresses.map(addr => (
                      <Box key={addr.addressId} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Stack direction='row' alignItems='center' justifyContent='space-between'>
                          <Stack spacing={0.5}>
                            <Typography variant='body2' sx={{ fontWeight: 600 }}>
                              {ADDRESS_TYPE_LABELS[addr.addressType]}
                            </Typography>
                            <Typography variant='body2'>{addr.presentationMask}</Typography>
                            <Typography variant='caption' color='text.secondary'>
                              Declarada {formatDeclared(addr.declaredAt)}
                            </Typography>
                            {addr.rejectedReason ? (
                              <Typography variant='caption' color='error'>
                                Motivo del rechazo: {addr.rejectedReason}
                              </Typography>
                            ) : null}
                          </Stack>
                          <Chip
                            size='small'
                            label={STATUS_LABELS[addr.verificationStatus]}
                            color={STATUS_COLORS[addr.verificationStatus]}
                            variant={addr.verificationStatus === 'verified' ? 'filled' : 'tonal'}
                          />
                        </Stack>
                      </Box>
                    ))
                  ) : (
                    <Typography variant='body2' color='text.secondary'>
                      Aun no has declarado direcciones.
                    </Typography>
                  )}
                </Stack>

                <Divider />

                <Stack spacing={2}>
                  <Typography variant='subtitle2'>Declarar / actualizar direccion</Typography>

                  <FormControl size='small'>
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      label='Tipo'
                      value={addrType}
                      onChange={e => setAddrType(e.target.value as AddressMaskedDto['addressType'])}
                    >
                      <MenuItem value='legal'>Direccion legal</MenuItem>
                      <MenuItem value='residence'>Residencia</MenuItem>
                      <MenuItem value='mailing'>Correspondencia</MenuItem>
                      <MenuItem value='emergency'>Contacto de emergencia</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size='small'>
                    <InputLabel>Pais</InputLabel>
                    <Select label='Pais' value={addrCountry} onChange={e => setAddrCountry(String(e.target.value))}>
                      <MenuItem value='CL'>Chile</MenuItem>
                      <MenuItem value='AR'>Argentina</MenuItem>
                      <MenuItem value='BR'>Brasil</MenuItem>
                      <MenuItem value='CO'>Colombia</MenuItem>
                      <MenuItem value='MX'>Mexico</MenuItem>
                      <MenuItem value='PE'>Peru</MenuItem>
                      <MenuItem value='UY'>Uruguay</MenuItem>
                      <MenuItem value='US'>Estados Unidos</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    size='small'
                    label='Calle y numero'
                    placeholder='Av. Apoquindo 1234, Depto 501'
                    value={addrStreet}
                    onChange={e => setAddrStreet(e.target.value)}
                  />

                  <TextField
                    size='small'
                    label='Ciudad'
                    value={addrCity}
                    onChange={e => setAddrCity(e.target.value)}
                  />

                  <TextField
                    size='small'
                    label='Region / Estado'
                    value={addrRegion}
                    onChange={e => setAddrRegion(e.target.value)}
                  />

                  <TextField
                    size='small'
                    label='Codigo postal (opcional)'
                    value={addrPostal}
                    onChange={e => setAddrPostal(e.target.value)}
                  />

                  <Button
                    variant='contained'
                    onClick={handleAddressSubmit}
                    disabled={submitting || !addrStreet.trim() || !addrCity.trim()}
                  >
                    Guardar direccion
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default LegalProfileTab
