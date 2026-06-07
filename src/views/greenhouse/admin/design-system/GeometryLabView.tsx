'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import { GreenhouseButton, GreenhouseChip } from '@/components/greenhouse/primitives'
import { DESIGN_SYSTEM_LAB_TOKENS } from './design-system-lab-tokens'

const DESIGN_SYSTEM_ROUTE = '/admin/design-system'

const SPACING_STEPS = [...Array.from({ length: 16 }, (_, index) => index + 1), 25] as const
const PREFERRED_SPACING_STEPS = new Set<number>([1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12])

const RADIUS_STEPS = [
  { key: 'xs', label: 'xs', usage: 'Separadores muy compactos y detalles internos.' },
  { key: 'sm', label: 'sm', usage: 'Inputs, toggle buttons y controles pequenos.' },
  { key: 'md', label: 'md', usage: 'Default operacional: cards, panels y shells densos.' },
  { key: 'lg', label: 'lg', usage: 'Superficies destacadas sin perder sobriedad.' },
  { key: 'xl', label: 'xl', usage: 'Paneles amplios y previews con mas aire.' },
  { key: 'xxl', label: 'xxl', usage: 'Superficies grandes modernas con uso intencional.' },
  { key: 'display', label: 'display', usage: 'Hero/support surfaces internas, no tablas ni inputs.' }
] as const

const SectionHeader = ({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) => (
  <Stack spacing={0.75}>
    <Typography variant='overline' color='primary'>
      {eyebrow}
    </Typography>
    <Typography variant='h5'>{title}</Typography>
    <Typography variant='body2' color='text.secondary' sx={{ maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}>
      {description}
    </Typography>
  </Stack>
)

const CodeToken = ({ children }: { children: string }) => (
  <Box
    component='code'
    sx={theme => ({
      px: 1,
      py: 0.35,
      display: 'inline-flex',
      maxWidth: '100%',
      borderRadius: `${theme.shape.customBorderRadius.sm}px`,
      bgcolor: alpha(theme.palette.text.primary, DESIGN_SYSTEM_LAB_TOKENS.opacity.codeBackground),
      color: 'text.primary',
      lineHeight: 1.35,
      whiteSpace: 'normal',
      overflowWrap: 'anywhere'
    })}
  >
    {children}
  </Box>
)

const GeometryLabView = () => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: DESIGN_SYSTEM_LAB_TOKENS.layout.sectionGap,
        maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.pageMaxInlineSize,
        mx: 'auto'
      }}
    >
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.layout.headerGap}>
        <GreenhouseButton
          component={Link}
          href={DESIGN_SYSTEM_ROUTE}
          variant='text'
          tone='secondary'
          size='small'
          kind='navigation'
          leadingIconClassName='tabler-arrow-left'
          sx={{ alignSelf: 'flex-start', px: 0 }}
        >
          Design System
        </GreenhouseButton>
        <AxisWordmark variant='auto' height={DESIGN_SYSTEM_LAB_TOKENS.layout.logoBlockSize} />
        <SectionHeader
          eyebrow='Design System · Interno'
          title='Geometry foundations'
          description='Referencia viva para spacing y radius AXIS en Greenhouse. Spacing se consume con theme.spacing(n); radius se consume con theme.shape.customBorderRadius. Esta pagina muestra equivalencias visuales sin convertir Figma en valores JSX literales.'
        />
      </Stack>

      <Card variant='outlined' data-capture='geometry-spacing-scale'>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <SectionHeader
            eyebrow='AXIS Gap & Padding'
            title='Spacing scale'
            description='La lamina AXIS Gap/Padding usa pasos 1..16 + 25. En runtime no se escribe px: se usa theme.spacing(n), Stack spacing={n}, p: n, gap: n.'
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
            {SPACING_STEPS.map(step => {
              const px = step * 4
              const preferred = PREFERRED_SPACING_STEPS.has(step)

              return (
                <Box
                  key={step}
                  sx={theme => ({
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'minmax(128px, 0.7fr) minmax(0, 1fr)' },
                    gap: 1.5,
                    alignItems: 'center',
                    p: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: `${theme.shape.customBorderRadius.md}px`,
                    bgcolor: preferred ? alpha(theme.palette.primary.main, DESIGN_SYSTEM_LAB_TOKENS.opacity.softAccentSurface) : 'background.paper'
                  })}
                >
                  <Stack spacing={0.5}>
                    <Typography variant='button'>Gap/Padding {step}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      <CodeToken>{`theme.spacing(${step})`}</CodeToken> · {px}px
                    </Typography>
                  </Stack>
                  <Stack direction='row' alignItems='center' spacing={1.5}>
                    <Box
                      sx={theme => ({
                        width: theme.spacing(step),
                        minWidth: theme.spacing(step),
                        height: theme.spacing(2),
                        borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                        bgcolor: preferred ? 'primary.main' : 'action.selected'
                      })}
                    />
                    <GreenhouseChip
                      label={preferred ? 'Preferido' : 'Disponible'}
                      variant={preferred ? 'label' : 'outlined'}
                      tone={preferred ? 'primary' : 'default'}
                      size='small'
                      kind='attribute'
                    />
                  </Stack>
                </Box>
              )
            })}
          </Box>
        </CardContent>
      </Card>

      <Card variant='outlined' data-capture='geometry-radius-scale'>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <SectionHeader
            eyebrow='AXIS Border Radius + Greenhouse extension'
            title='Radius scale'
            description='AXIS trae xs..xl y round. Greenhouse agrega xxl/display para superficies grandes modernas. El shape base de MUI no cambia: los consumidores leen customBorderRadius.'
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 2 }}>
            {RADIUS_STEPS.map(step => {
              const value = theme.shape.customBorderRadius[step.key]
              const isExtension = step.key === 'xxl' || step.key === 'display'

              return (
                <Card key={step.key} variant='outlined' sx={{ height: '100%' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Box
                      sx={theme => ({
                        minHeight: 112,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 2,
                        borderRadius: `${theme.shape.customBorderRadius.md}px`,
                        bgcolor: 'action.hover'
                      })}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          minHeight: 70,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: `${value}px`,
                          bgcolor: 'background.paper',
                          border: theme => `1px solid ${theme.palette.divider}`,
                          boxShadow: theme => `0 ${theme.spacing(1)} ${theme.spacing(3)} ${alpha(theme.palette.common.black, DESIGN_SYSTEM_LAB_TOKENS.opacity.elevatedShadow)}`
                        }}
                      >
                        <Typography variant='monoId'>{value}px</Typography>
                      </Box>
                    </Box>
                    <Stack spacing={1}>
                      <Stack direction='row' alignItems='center' flexWrap='wrap' gap={1}>
                        <Typography variant='h6'>{step.label}</Typography>
                        <GreenhouseChip
                          label={isExtension ? 'Greenhouse' : 'AXIS'}
                          variant='label'
                          tone={isExtension ? 'secondary' : 'primary'}
                          size='small'
                          kind='attribute'
                        />
                      </Stack>
                      <Typography variant='caption' color='text.secondary'>
                        <CodeToken>{`theme.shape.customBorderRadius.${step.key}`}</CodeToken>
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {step.usage}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              )
            })}
          </Box>
          <Divider />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 2 }}>
            <Card variant='outlined'>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant='h6'>Round</Typography>
                <Stack direction='row' alignItems='center' spacing={2}>
                  <Box
                    sx={{
                      px: 2,
                      py: 1,
                      borderRadius: '9999px',
                      bgcolor: 'action.hover',
                      border: theme => `1px solid ${theme.palette.divider}`
                    }}
                  >
                    <Typography variant='button'>Pill / capsule</Typography>
                  </Box>
                  <Box
                    sx={{
                      width: theme.spacing(7),
                      height: theme.spacing(7),
                      borderRadius: '50%',
                      bgcolor: 'action.hover',
                      border: theme => `1px solid ${theme.palette.divider}`
                    }}
                  />
                </Stack>
                <Typography variant='body2' color='text.secondary'>
                  Figma muestra 500px, pero Greenhouse usa 9999px para pills y 50% para circulos.
                </Typography>
              </CardContent>
            </Card>

            <Card
              variant='outlined'
              sx={theme => ({
                overflow: 'hidden',
                borderRadius: `${theme.shape.customBorderRadius.display}px`
              })}
              data-capture='geometry-display-radius-example'
            >
              <CardContent
                sx={theme => ({
                  minHeight: 190,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha(theme.palette.secondary.main, 0.08)})`
                })}
              >
                <Stack spacing={1}>
                  <GreenhouseChip label='display radius' variant='label' tone='secondary' size='small' kind='metric' />
                  <Typography variant='h5'>Surface grande de soporte</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Ejemplo intencional: una superficie amplia de documentacion interna puede usar display. No se aplica a tablas,
                    menus, inputs ni cards operacionales densas.
                  </Typography>
                </Stack>
                <Typography variant='caption' color='text.secondary'>
                  <CodeToken>theme.shape.customBorderRadius.display</CodeToken> · {theme.shape.customBorderRadius.display}px
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default GeometryLabView
