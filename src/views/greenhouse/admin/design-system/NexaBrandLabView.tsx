'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import { typographyScale } from '@/components/theme/typography-tokens'
import {
  GreenhouseButton,
  GreenhouseNexaBrandMark,
  type GreenhouseNexaBrandKind,
  type GreenhouseNexaBrandSize
} from '@/components/greenhouse/primitives'

import { DESIGN_SYSTEM_LAB_TOKENS } from './design-system-lab-tokens'

const InlineCode = ({ children }: { children: string }) => (
  <Box
    component='span'
    sx={theme => ({
      px: DESIGN_SYSTEM_LAB_TOKENS.spacing.tight,
      py: DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline,
      borderRadius: `${theme.shape.customBorderRadius.sm}px`,
      color: theme.palette.text.primary,
      backgroundColor: alpha(theme.palette.text.primary, DESIGN_SYSTEM_LAB_TOKENS.opacity.codeBackground),
      ...typographyScale.labelSm,
      whiteSpace: 'nowrap'
    })}
  >
    {children}
  </Box>
)

type KindSpecimen = {
  kind: GreenhouseNexaBrandKind
  title: string
  description: string
  usage: string
}

const KIND_SPECIMENS: KindSpecimen[] = [
  {
    kind: 'askNexaBadge',
    title: 'Ask badge',
    description: 'CTA compacto para invitar a consultar a Nexa dentro de una superficie contextual.',
    usage: 'Prompts, sidecars, empty states accionables y docks de asistencia.'
  },
  {
    kind: 'badgeIcon',
    title: 'Icon badge',
    description: 'Marca mínima cuando el texto ya existe cerca o el espacio no permite el lockup completo.',
    usage: 'Botones flotantes, headers densos, tabs con soporte de tooltip.'
  },
  {
    kind: 'inlineMark',
    title: 'Inline mark',
    description: 'Isotipo full-color para documentación interna, specs y cabeceras donde el fondo es neutro.',
    usage: 'Labs, notas de producto y materiales internos con suficiente aire.'
  },
  {
    kind: 'monoMark',
    title: 'Mono mark',
    description: 'Versión monocroma para fondos oscuros, estados compactos o composición sobre navy.',
    usage: 'Superficies de alto contraste donde el full-color competiría con el contenido.'
  }
]

const SIZES: GreenhouseNexaBrandSize[] = ['small', 'medium']

const NexaBrandLabView = () => (
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
        href={DESIGN_SYSTEM_LAB_TOKENS.routes.root}
        variant='text'
        tone='secondary'
        kind='navigation'
        size='small'
        leadingIcon={<i className='tabler-arrow-left' />}
        sx={{ alignSelf: 'flex-start', px: 0 }}
      >
        Design System
      </GreenhouseButton>
      <AxisWordmark
        variant='auto'
        height={DESIGN_SYSTEM_LAB_TOKENS.layout.logoBlockSize}
        sx={{ mb: DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline }}
      />
      <Typography variant='overline' color='primary'>
        Nexa Brand Primitive
      </Typography>
      <Typography variant='h4'>Nexa Brand Mark</Typography>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}
      >
        Hoja interna para gobernar el isotipo de Nexa, sus badges conversacionales y los futuros kinds de marca. La regla
        base es simple: arco + sparkle viven juntos; no se reemplazan por iconos genéricos.
      </Typography>
    </Stack>

    <Box
      data-capture='nexa-brand-primary-specimen'
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          lg: `minmax(360px, 520px) minmax(${DESIGN_SYSTEM_LAB_TOKENS.layout.asideMinInlineSize}px, 1fr)`
        },
        gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap,
        alignItems: 'stretch'
      }}
    >
      <Box
        sx={theme => ({
          display: 'grid',
          placeItems: 'center',
          minBlockSize: { xs: 220, md: 280 },
          p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(
            theme.palette.primary.main,
            0.035
          )} 100%)`
        })}
      >
        <Stack spacing={2.5} alignItems='center' textAlign='center'>
          <GreenhouseNexaBrandMark kind='askNexaBadge' size='medium' dataCapture='nexa-brand-ask-badge-hero' />
          <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 420 }}>
            La versión conversacional usa Midnight Navy, isotipo real y tipografía de control para sentirse accionable sin
            competir con la superficie principal.
          </Typography>
        </Stack>
      </Box>

      <Stack spacing={3} sx={{ py: { xs: 0, lg: DESIGN_SYSTEM_LAB_TOKENS.spacing.related } }}>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Primitive + kinds</Typography>
          <Typography variant='body2' color='text.secondary'>
            <InlineCode>GreenhouseNexaBrandMark</InlineCode> centraliza asset, chrome, tamaño, label y aria-label. Los
            consumers eligen <InlineCode>kind</InlineCode> y <InlineCode>size</InlineCode>; no componen SVG, iconos o texto
            por su cuenta.
          </Typography>
        </Stack>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Mini regla de marca</Typography>
          <Typography variant='body2' color='text.secondary'>
            Si la UI necesita representar a Nexa, debe usar esta primitive. La chispa sola puede significar IA genérica; el
            arco con sparkle sí identifica a Nexa.
          </Typography>
        </Stack>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Mini regla tipográfica</Typography>
          <Typography variant='body2' color='text.secondary'>
            El badge usa <InlineCode>button</InlineCode> / label-md: Geist 600, sentence case y cero tracking decorativo.
            No usar Poppins ni pesos 700/800 para el texto del badge.
          </Typography>
        </Stack>
      </Stack>
    </Box>

    <Box
      data-capture='nexa-brand-kind-matrix'
      sx={theme => ({
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        bgcolor: 'background.paper',
        overflow: 'hidden'
      })}
    >
      <Box
        sx={theme => ({
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '150px 250px minmax(220px, 1fr) minmax(240px, 1fr)' },
          columnGap: { xs: 0, md: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup },
          rowGap: 0,
          px: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup,
          py: DESIGN_SYSTEM_LAB_TOKENS.spacing.related,
          borderBlockEnd: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.text.primary, DESIGN_SYSTEM_LAB_TOKENS.opacity.subtleFill)
        })}
      >
        <Typography variant='caption' color='text.secondary'>
          Kind
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ display: { xs: 'none', md: 'block' } }}>
          Specimen
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ display: { xs: 'none', md: 'block' } }}>
          Intención
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ display: { xs: 'none', md: 'block' } }}>
          Uso recomendado
        </Typography>
      </Box>

      {KIND_SPECIMENS.map(item => (
        <Box
          key={item.kind}
          sx={theme => ({
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '150px 250px minmax(220px, 1fr) minmax(240px, 1fr)' },
            gap: { xs: DESIGN_SYSTEM_LAB_TOKENS.spacing.related, md: 0 },
            columnGap: { xs: 0, md: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup },
            alignItems: 'center',
            px: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup,
            py: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup,
            borderBlockEnd: `1px solid ${theme.palette.divider}`,
            '&:last-of-type': {
              borderBlockEnd: 0
            }
          })}
        >
          <Stack spacing={0.5}>
            <Typography variant='h6'>{item.title}</Typography>
            <Typography variant='caption' color='text.secondary'>
              {item.kind}
            </Typography>
          </Stack>
          <Box>
            <GreenhouseNexaBrandMark kind={item.kind} size={item.kind === 'askNexaBadge' ? 'small' : 'medium'} />
          </Box>
          <Typography variant='body2' color='text.secondary'>
            {item.description}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {item.usage}
          </Typography>
        </Box>
      ))}
    </Box>

    <Box
      data-capture='nexa-brand-size-specimens'
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 0.8fr) minmax(320px, 1fr)' },
        gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap,
        alignItems: 'start'
      }}
    >
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
        <Typography variant='h6'>Size contract</Typography>
        <Typography variant='body2' color='text.secondary'>
          Los tamaños no cambian la personalidad de marca; solo ajustan densidad y hit area del contexto. Nuevos tamaños
          deben pasar por esta hoja antes de llegar a producto.
        </Typography>
      </Stack>

      <Box
        sx={theme => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          bgcolor: 'background.paper',
          p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset
        })}
      >
        <Stack spacing={2.5} alignItems='flex-start'>
          {SIZES.map(size => (
            <Stack key={size} direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
              <Typography variant='caption' color='text.secondary' sx={{ minInlineSize: 64 }}>
                {size}
              </Typography>
              <GreenhouseNexaBrandMark kind='askNexaBadge' size={size} />
              <GreenhouseNexaBrandMark kind='badgeIcon' size={size} />
            </Stack>
          ))}
        </Stack>
      </Box>
    </Box>
  </Box>
)

export default NexaBrandLabView
