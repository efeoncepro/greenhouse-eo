'use client'

import type { ReactNode } from 'react'

import { alpha } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import {
  GreenhouseBreadcrumbs,
  GreenhouseChip,
  GREENHOUSE_BREADCRUMBS_VARIANT_CONFIG,
  GREENHOUSE_BREADCRUMBS_VARIANTS,
  type GreenhouseBreadcrumbsKind,
  type GreenhouseBreadcrumbsSeparator,
  type GreenhouseBreadcrumbsVariant
} from '@/components/greenhouse/primitives'

import { DESIGN_SYSTEM_LAB_TOKENS } from './design-system-lab-tokens'

const DESIGN_SYSTEM_ROUTE = '/design-system'

const previewItems = [
  { label: 'Greenhouse', href: '/home', iconClassName: 'tabler-star-filled' },
  { label: 'Design System', href: DESIGN_SYSTEM_ROUTE, iconClassName: 'tabler-star-filled' },
  { label: 'Breadcrumbs', iconClassName: 'tabler-star-filled' }
]

const workbenchItems = [
  { label: 'Agency', href: '/agency' },
  { label: 'Organizaciones', href: '/agency/organizations' },
  { label: 'Workspace enterprise' }
]

const variants: { label: string; value: GreenhouseBreadcrumbsVariant; note: string }[] = [
  {
    label: 'Default',
    value: 'default',
    note: GREENHOUSE_BREADCRUMBS_VARIANT_CONFIG.default.description
  },
  {
    label: 'Compact',
    value: 'compact',
    note: GREENHOUSE_BREADCRUMBS_VARIANT_CONFIG.compact.description
  }
]

const kinds: { label: string; value: GreenhouseBreadcrumbsKind; separator: GreenhouseBreadcrumbsSeparator }[] = [
  { label: 'Page hierarchy', value: 'pageHierarchy', separator: 'slash' },
  { label: 'Workbench hierarchy', value: 'workbenchHierarchy', separator: 'slash' },
  { label: 'Design System specimen', value: 'designSystemSpecimen', separator: 'slash' },
  { label: 'Legacy wrapper', value: 'legacy', separator: 'chevron' }
]

const SectionFrame = ({
  children,
  dataCapture,
  eyebrow,
  title
}: {
  children: ReactNode
  dataCapture: string
  eyebrow: string
  title: string
}) => (
  <Stack
    spacing={2}
    data-capture={dataCapture}
    sx={theme => ({
      p: { xs: 3, md: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset },
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 1,
      backgroundColor: theme.palette.background.paper
    })}
  >
    <Stack spacing={0.75}>
      <Typography variant='overline' sx={{ color: 'text.secondary' }}>
        {eyebrow}
      </Typography>
      <Typography variant='h5'>{title}</Typography>
    </Stack>
    {children}
  </Stack>
)

const BreadcrumbsLabView = () => {
  return (
    <Box
      data-capture='breadcrumbs-lab'
      sx={{
        maxInlineSize: DESIGN_SYSTEM_LAB_TOKENS.layout.pageMaxInlineSize,
        mx: 'auto',
        px: { xs: 3, md: 5 },
        py: { xs: 4, md: 6 }
      }}
    >
      <Stack spacing={5}>
        <Box
          sx={theme => ({
            p: { xs: 3, md: 5 },
            borderRadius: 1,
            backgroundColor: alpha(theme.palette.primary.main, DESIGN_SYSTEM_LAB_TOKENS.opacity.softAccentSurface)
          })}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent='space-between'
          >
            <Stack spacing={1.5} sx={{ maxInlineSize: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                <GreenhouseChip label='Primitive' kind='attribute' tone='primary' variant='label' size='small' />
                <GreenhouseChip label='AXIS Figma 205:234905' kind='attribute' tone='info' variant='label' size='small' />
              </Stack>
              <Typography variant='h1'>Breadcrumbs</Typography>
              <Typography variant='body1' sx={{ color: 'text.secondary', maxInlineSize: 680 }}>
                Navegación jerárquica para ubicar una página dentro de una estructura y permitir volver a sus ancestros sin duplicar CTAs de retorno.
              </Typography>
            </Stack>
            <AxisWordmark
              height={DESIGN_SYSTEM_LAB_TOKENS.layout.logoBlockSize}
              sx={{ flex: '0 0 auto', alignSelf: { xs: 'flex-start', sm: 'center' } }}
            />
          </Stack>
        </Box>

        <SectionFrame dataCapture='greenhouse-breadcrumbs-axis-default' eyebrow='AXIS port' title='Default with optional icons'>
          <Box
            sx={theme => ({
              minBlockSize: 132,
              display: 'flex',
              alignItems: 'center',
              px: { xs: 2, md: 4 },
              borderRadius: 1,
              backgroundColor: alpha(theme.palette.background.default, 0.72)
            })}
          >
            <GreenhouseBreadcrumbs
              items={previewItems}
              kind='designSystemSpecimen'
              dataCapture='breadcrumbs-default-specimen'
            />
          </Box>
        </SectionFrame>

        <SectionFrame dataCapture='greenhouse-breadcrumbs-variants' eyebrow='Variants' title='Functional density modes'>
          <Stack spacing={2.5}>
            {variants.map(item => (
              <Stack key={item.value} spacing={1.25}>
                <Stack direction='row' alignItems='center' spacing={1} flexWrap='wrap' useFlexGap>
                  <Typography variant='h6'>{item.label}</Typography>
                  <GreenhouseChip label={item.value} kind='attribute' tone='secondary' variant='label' size='small' />
                </Stack>
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {item.note}
                </Typography>
                <GreenhouseBreadcrumbs
                  items={item.value === 'compact' ? workbenchItems : previewItems}
                  variant={item.value}
                  kind={item.value === 'compact' ? 'workbenchHierarchy' : 'pageHierarchy'}
                  showIcons={item.value !== 'compact'}
                  dataCapture={`breadcrumbs-${item.value}-variant`}
                />
              </Stack>
            ))}
          </Stack>
        </SectionFrame>

        <SectionFrame dataCapture='greenhouse-breadcrumbs-kinds' eyebrow='Kinds' title='Semantic mappings'>
          <Stack
            component='dl'
            spacing={0}
            divider={<Divider flexItem />}
            sx={{
              m: 0
            }}
          >
            {kinds.map(kind => (
              <Stack
                key={kind.value}
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{ py: 2 }}
              >
                <Box component='dt' sx={{ minInlineSize: { md: 220 } }}>
                  <Typography variant='button'>{kind.label}</Typography>
                </Box>
                <Stack component='dd' spacing={1} sx={{ m: 0, minInlineSize: 0 }}>
                  <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                    <GreenhouseChip label={`kind=${kind.value}`} kind='attribute' tone='primary' variant='label' size='small' />
                    <GreenhouseChip label={`separator=${kind.separator}`} kind='attribute' tone='info' variant='label' size='small' />
                  </Stack>
                  <GreenhouseBreadcrumbs
                    items={kind.value === 'workbenchHierarchy' || kind.value === 'legacy' ? workbenchItems : previewItems}
                    kind={kind.value}
                    separator={kind.separator}
                    showIcons={kind.value !== 'workbenchHierarchy' && kind.value !== 'legacy'}
                    dataCapture={`breadcrumbs-kind-${kind.value}`}
                  />
                </Stack>
              </Stack>
            ))}
          </Stack>
        </SectionFrame>

        <SectionFrame dataCapture='greenhouse-breadcrumbs-usage-rules' eyebrow='Usage rules' title='Contract'>
          <Stack spacing={2}>
            <Typography variant='body1' sx={{ color: 'text.secondary' }}>
              Usa <code>GreenhouseBreadcrumbs</code> para jerarquía real de navegación. El último item es estado actual con <code>aria-current=&apos;page&apos;</code>; los ancestros son links. No lo combines con botones “volver” en la misma zona.
            </Typography>
            <Typography variant='body1' sx={{ color: 'text.secondary' }}>
              El diseño Figma se mapea a tokens Greenhouse: links con <code>theme.palette.primary</code>, current con <code>text.primary</code>, separator con <code>text.secondary</code>, tipografía MUI <code>body1/body2</code> y radius/focus desde <code>theme.shape</code>.
            </Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              El acceso al nodo AXIS vive en el shell del Design System (esquina superior derecha) vía <code>GreenhouseFigmaNodeButton</code>; queda inactivo en las páginas sin nodo asociado para señalar que falta crearlo.
            </Typography>
          </Stack>
        </SectionFrame>

        <Box
          sx={theme => ({
            px: 2,
            py: 1.5,
            borderRadius: 1,
            color: 'text.secondary',
            backgroundColor: alpha(theme.palette.text.primary, DESIGN_SYSTEM_LAB_TOKENS.opacity.codeBackground)
          })}
        >
          <Typography variant='body2'>
            Variants activas: {GREENHOUSE_BREADCRUMBS_VARIANTS.join(' / ')}. Wrapper legacy: <code>Breadcrumb</code> delega en <code>GreenhouseBreadcrumbs</code>.
          </Typography>
        </Box>
      </Stack>
    </Box>
  )
}

export default BreadcrumbsLabView
