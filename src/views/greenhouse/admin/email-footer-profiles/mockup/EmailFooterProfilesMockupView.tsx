'use client'

import { useEffect, useMemo, useState } from 'react'

import Image from 'next/image'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { EMAIL_COLORS } from '@/emails/constants'

import { FOOTER_PROFILE_MOCKS } from './data'
import type { FooterProfileId, FooterProfileMock } from './data'

type PreviewViewport = 'desktop' | 'mobile'

const ARIA_PREVIEW_WIDTH = 'Ancho de la vista previa'
const ARIA_DESKTOP_VIEW = 'Vista de escritorio'
const ARIA_MOBILE_VIEW = 'Vista móvil'
const ARIA_POLICY_MATRIX = 'Bloques permitidos por perfil de footer'
const ARIA_SOCIAL_LINKS = 'Redes sociales de Efeonce'

const PROFILE_ICONS: Record<FooterProfileId, string> = {
  internal_operational: 'tabler-settings-automation',
  access_security: 'tabler-shield-lock',
  relationship_transactional: 'tabler-heart-handshake',
  regulated_transactional: 'tabler-file-certificate',
  subscription_marketing: 'tabler-speakerphone'
}

const BooleanMark = ({ value }: { value: boolean }) => (
  <Box
    component='span'
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 1,
      color: value ? 'success.main' : 'text.secondary'
    }}
  >
    <i className={value ? 'tabler-check' : 'tabler-minus'} aria-hidden='true' />
    {value ? 'Sí' : 'No'}
  </Box>
)

const FooterPreview = ({ profile, viewport }: { profile: FooterProfileMock; viewport: PreviewViewport }) => {
  const previewWidth = viewport === 'desktop' ? 560 : 350

  return (
    <Box
      id='email-footer-profile-preview'
      data-capture='email-footer-profile-preview'
      sx={{
        inlineSize: '100%',
        maxInlineSize: previewWidth,
        mx: 'auto',
        bgcolor: EMAIL_COLORS.background,
        overflow: 'hidden',
        borderRadius: theme => `${theme.shape.customBorderRadius.display}px`,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: theme => theme.greenhouseElevation.raised.boxShadow
      }}
    >
      <Box
        sx={{
          py: 4,
          px: 3,
          textAlign: 'center',
          background: `linear-gradient(135deg, ${EMAIL_COLORS.headerBg}, ${EMAIL_COLORS.headerAccent})`
        }}
      >
        <Image
          src='/branding/pdf/efeonce-wordmark-white.png'
          alt='Efeonce'
          width={150}
          height={35}
          style={{ inlineSize: 150, blockSize: 'auto' }}
          priority
        />
      </Box>

      <Box sx={{ px: viewport === 'desktop' ? 5 : 3, pb: 4 }}>
        <Paper
          data-capture='email-footer-profile-body-control'
          elevation={0}
          sx={{
            mt: -3,
            p: viewport === 'desktop' ? 4 : 3,
            borderRadius: theme => `${theme.shape.customBorderRadius.xxl}px`,
            bgcolor: EMAIL_COLORS.containerBg,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Stack spacing={2}>
            <Typography variant='h6' component='h3' sx={{ color: EMAIL_COLORS.text }}>
              Hola, Daniela
            </Typography>
            <Typography variant='body2' sx={{ color: EMAIL_COLORS.secondary }}>
              Este cuerpo se mantiene igual en todos los ejemplos para que puedas evaluar únicamente el footer.
            </Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: EMAIL_COLORS.infoBg,
                borderRadius: theme => `${theme.shape.customBorderRadius.md}px`
              }}
            >
              <Typography variant='body2' sx={{ color: EMAIL_COLORS.text, fontWeight: 600 }}>
                Mensaje o acción principal del correo
              </Typography>
            </Box>
            <Box data-capture='email-footer-profile-signature' sx={{ pt: 1 }}>
              <Typography variant='body2' sx={{ color: EMAIL_COLORS.secondary }}>
                Saludos,
              </Typography>
              <Typography variant='body2' sx={{ color: EMAIL_COLORS.text, fontWeight: 700 }}>
                Equipo responsable · Efeonce
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Box
          component='footer'
          data-capture='email-footer-profile-footer'
          sx={{ pt: 3, pb: 1, px: viewport === 'desktop' ? 2 : 0, textAlign: 'center' }}
        >
          <Divider sx={{ mb: 3, borderColor: EMAIL_COLORS.border }} />
          <Box data-capture='email-footer-profile-brand' sx={{ display: 'flex', justifyContent: 'center' }}>
            <Image
              src='/branding/email/footer/efeonce-wordmark-gray.png'
              alt='Efeonce'
              width={96}
              height={23}
              style={{ inlineSize: 96, blockSize: 'auto' }}
            />
          </Box>
          <Typography
            variant='body2'
            sx={{ color: EMAIL_COLORS.secondary, display: 'block', maxInlineSize: 440, mt: 3, mx: 'auto' }}
          >
            {profile.context}
          </Typography>
          {profile.help && (
            <Box
              sx={{
                maxInlineSize: 440,
                mt: 1,
                mx: 'auto',
                ...(profile.helpTone === 'warning' && {
                  px: 2,
                  py: 1,
                  bgcolor: EMAIL_COLORS.warningBg,
                  borderRadius: theme => `${theme.shape.customBorderRadius.md}px`
                })
              }}
            >
              <Typography
                variant='body2'
                sx={{ color: profile.helpTone === 'warning' ? EMAIL_COLORS.warning : EMAIL_COLORS.secondary }}
              >
                {profile.help}
              </Typography>
            </Box>
          )}
          {profile.controls && (
            <Box
              component='ul'
              sx={{
                p: 0,
                m: 0,
                mt: 1.5,
                display: 'flex',
                listStyle: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: viewport === 'desktop' ? 'row' : 'column',
                columnGap: 1.5,
                rowGap: 0.5
              }}
            >
              {profile.controls.map(control => (
                <Box
                  key={control}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    '&:not(:first-of-type)::before':
                      viewport === 'desktop' ? { content: '"·"', mr: 1.5, color: EMAIL_COLORS.muted } : undefined
                  }}
                  component='li'
                >
                  <Link
                    href='#email-footer-profile-preview'
                    onClick={event => event.preventDefault()}
                    aria-label={`${control} (enlace de muestra)`}
                    variant='caption'
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      minBlockSize: theme => theme.spacing(6),
                      color: EMAIL_COLORS.primaryHover,
                      fontWeight: 600,
                      textDecorationThickness: 'from-font',
                      textUnderlineOffset: 2,
                      '&:focus-visible': {
                        borderRadius: 0.5,
                        outline: `2px solid ${EMAIL_COLORS.primary}`,
                        outlineOffset: 2
                      }
                    }}
                  >
                    {control}
                  </Link>
                </Box>
              ))}
            </Box>
          )}
          {profile.socialLinks && (
            <Box
              component='ul'
              data-capture='email-footer-profile-social'
              aria-label={ARIA_SOCIAL_LINKS}
              sx={{
                p: 0,
                m: 0,
                mt: 2,
                gap: 1,
                display: 'flex',
                listStyle: 'none',
                justifyContent: 'center',
                color: EMAIL_COLORS.muted
              }}
            >
              {profile.socialLinks.map(social => (
                <Box component='li' key={social.channel}>
                  <Link
                    href={social.url}
                    target='_blank'
                    rel='noreferrer'
                    aria-label={social.label}
                    title={social.label}
                    underline='none'
                    sx={{
                      display: 'inline-grid',
                      placeItems: 'center',
                      inlineSize: 32,
                      blockSize: 32,
                      borderRadius: 9999,
                      color: 'inherit',
                      '&:hover': { color: EMAIL_COLORS.primary },
                      '&:focus-visible': {
                        outline: `2px solid ${EMAIL_COLORS.primary}`,
                        outlineOffset: 2
                      }
                    }}
                  >
                    <Image
                      src={`/branding/email/footer/${social.channel}.png`}
                      alt=''
                      width={22}
                      height={22}
                      style={{ inlineSize: 22, blockSize: 22 }}
                    />
                  </Link>
                </Box>
              ))}
            </Box>
          )}
          {profile.legalLines && (
            <Box
              component='ul'
              data-capture='email-footer-profile-legal'
              sx={{ p: 0, m: 0, mt: 2, mx: 'auto', maxInlineSize: 460, listStyle: 'none' }}
            >
              {profile.legalLines.map((line, index) => (
                <Box component='li' key={line} sx={{ '& + &': { mt: 0.5 } }}>
                  <Typography
                    variant='caption'
                    sx={{ color: EMAIL_COLORS.muted, display: 'block', fontWeight: index === 0 ? 600 : 400 }}
                  >
                    {line}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
          {profile.legalNotice && (
            <Typography
              variant='body2'
              sx={{ color: EMAIL_COLORS.secondary, display: 'block', maxInlineSize: 440, mt: 1.5, mx: 'auto' }}
            >
              {profile.legalNotice}
            </Typography>
          )}
          {profile.reference && (
            <Typography
              variant='caption'
              sx={{
                color: EMAIL_COLORS.muted,
                display: 'block',
                mt: 1,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {profile.reference}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}

const EmailFooterProfilesMockupView = () => {
  const theme = useTheme()
  const compactViewport = useMediaQuery(theme.breakpoints.down('lg'))
  const [captureReady, setCaptureReady] = useState(false)
  const [selectedId, setSelectedId] = useState<FooterProfileId>('relationship_transactional')
  const [viewport, setViewport] = useState<PreviewViewport>('desktop')

  useEffect(() => {
    if (compactViewport) setViewport('mobile')
  }, [compactViewport])

  useEffect(() => setCaptureReady(true), [])

  const selectedProfile = useMemo(
    () => FOOTER_PROFILE_MOCKS.find(profile => profile.id === selectedId) ?? FOOTER_PROFILE_MOCKS[0],
    [selectedId]
  )

  return (
    <Box
      data-capture={captureReady ? 'email-footer-profiles-mockup' : undefined}
      sx={{ maxInlineSize: 1280, mx: 'auto' }}
    >
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          gap: 3,
          alignItems: { xs: 'flex-start', md: 'flex-end' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' }
        }}
      >
        <Box sx={{ maxInlineSize: 760 }}>
          <Typography variant='overline' color='primary.main'>
            EPIC-042 · Lámina de aprobación
          </Typography>
          <Typography variant='h4' component='h1' sx={{ mt: 0.5 }}>
            Perfiles de footer para correos Efeonce
          </Typography>
          <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>
            Compara el contenido, la jerarquía y la densidad de cada perfil. La firma permanece dentro del cuerpo; el
            footer está centrado y sólo muestra los bloques que corresponden al propósito del correo.
          </Typography>
        </Box>
        <ToggleButtonGroup
          exclusive
          value={viewport}
          onChange={(_, value: PreviewViewport | null) => value && setViewport(value)}
          aria-label={ARIA_PREVIEW_WIDTH}
          size='small'
        >
          <ToggleButton value='desktop' aria-label={ARIA_DESKTOP_VIEW}>
            <i className='tabler-device-desktop' aria-hidden='true' />
            Escritorio
          </ToggleButton>
          <ToggleButton value='mobile' aria-label={ARIA_MOBILE_VIEW}>
            <i className='tabler-device-mobile' aria-hidden='true' />
            Móvil
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <CustomTextField
        id='email-footer-profile-selector'
        select
        fullWidth
        label='Perfil de footer'
        value={selectedId}
        onChange={event => setSelectedId(event.target.value as FooterProfileId)}
        sx={{ mb: 2, display: { xs: 'block', lg: 'none' } }}
      >
        {FOOTER_PROFILE_MOCKS.map(profile => (
          <MenuItem key={profile.id} value={profile.id}>
            {profile.name}
          </MenuItem>
        ))}
      </CustomTextField>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(280px, 0.72fr) minmax(0, 1.6fr)' },
          gap: 3
        }}
      >
        <Paper
          variant='outlined'
          sx={{
            p: 2,
            display: { xs: 'none', lg: 'block' },
            borderRadius: theme => `${theme.shape.customBorderRadius.lg}px`,
            alignSelf: 'start'
          }}
        >
          <Typography variant='subtitle2' component='h2' sx={{ px: 1, mb: 1 }}>
            Selecciona un perfil
          </Typography>
          <Stack spacing={1}>
            {FOOTER_PROFILE_MOCKS.map(profile => {
              const selected = profile.id === selectedId

              return (
                <ButtonBase
                  key={profile.id}
                  onClick={() => setSelectedId(profile.id)}
                  aria-pressed={selected}
                  sx={{
                    p: 2,
                    gap: 1.5,
                    textAlign: 'left',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                    border: '1px solid',
                    borderColor: selected ? 'primary.main' : 'transparent',
                    bgcolor: selected ? 'primary.lighterOpacity' : 'transparent',
                    '&:hover': { bgcolor: selected ? 'primary.lighterOpacity' : 'action.hover' }
                  }}
                >
                  <Box sx={{ color: selected ? 'primary.main' : 'text.secondary', pt: 0.5 }}>
                    <i className={PROFILE_ICONS[profile.id]} aria-hidden='true' />
                  </Box>
                  <Box>
                    <Typography
                      variant='subtitle2'
                      component='span'
                      sx={{ color: selected ? 'primary.main' : 'text.primary' }}
                    >
                      {profile.name}
                    </Typography>
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
                      {profile.description}
                    </Typography>
                  </Box>
                </ButtonBase>
              )
            })}
          </Stack>
        </Paper>

        <Paper
          variant='outlined'
          data-capture='email-footer-profile-stage'
          sx={{
            p: { xs: 2, md: 4 },
            minInlineSize: 0,
            bgcolor: 'action.hover',
            borderRadius: theme => `${theme.shape.customBorderRadius.lg}px`
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ mb: 3, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Box>
              <Typography variant='h6' component='h2'>
                {selectedProfile.name}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {selectedProfile.description}
              </Typography>
            </Box>
            <CustomChip
              size='small'
              color='primary'
              variant='tonal'
              label={viewport === 'desktop' ? '560 px' : 'Máx. 350 px'}
            />
          </Stack>
          <FooterPreview profile={selectedProfile} viewport={viewport} />
        </Paper>
      </Box>

      <Paper
        variant='outlined'
        data-capture='email-footer-profiles-policy-matrix'
        sx={{
          mt: 3,
          p: { xs: 2, md: 3 },
          borderRadius: theme => `${theme.shape.customBorderRadius.lg}px`,
          overflowX: 'auto'
        }}
      >
        <Typography variant='h6' component='h2'>
          Matriz de bloques permitidos
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, mb: 2 }}>
          Esta matriz gobierna qué puede aparecer. En marketing, las RRSS institucionales son obligatorias y sus
          destinos provienen del SSOT de marca Efeonce.
        </Typography>
        <Typography
          id='email-footer-policy-matrix-scroll-hint'
          variant='caption'
          color='text.secondary'
          sx={{ display: { xs: 'block', md: 'none' }, mb: 1 }}
        >
          Desplaza horizontalmente para revisar todas las columnas.
        </Typography>
        <TableContainer
          tabIndex={0}
          aria-describedby='email-footer-policy-matrix-scroll-hint'
          sx={{
            '&:focus-visible': {
              borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2
            }
          }}
        >
          <Table aria-label={ARIA_POLICY_MATRIX} sx={{ minInlineSize: 760 }}>
            <TableHead>
              <TableRow>
                {['Perfil', 'RRSS', 'Baja', 'Identidad legal', 'Nota legal'].map(label => (
                  <TableCell key={label} sx={{ fontWeight: 700 }}>
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {FOOTER_PROFILE_MOCKS.map(profile => (
                <TableRow key={profile.id} sx={{ '&:last-child td, &:last-child th': { borderBlockEnd: 0 } }}>
                  <TableCell component='th' scope='row' sx={{ fontWeight: 600 }}>
                    {profile.name}
                  </TableCell>
                  <TableCell>
                    <BooleanMark value={profile.rules.social} />
                  </TableCell>
                  <TableCell>
                    <BooleanMark value={profile.rules.unsubscribe} />
                  </TableCell>
                  <TableCell>
                    <BooleanMark value={profile.rules.postalAddress} />
                  </TableCell>
                  <TableCell>{profile.rules.legalNotice}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}

export default EmailFooterProfilesMockupView
