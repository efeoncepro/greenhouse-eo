'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import { typographyScale } from '@/components/theme/typography-tokens'
import {
  CompositionShell,
  GreenhouseBrandLogoMark,
  GreenhouseButton,
  GreenhouseChip,
  type GreenhouseBrandLogoKind,
  type GreenhouseBrandLogoSize
} from '@/components/greenhouse/primitives'

import { DESIGN_SYSTEM_LAB_TOKENS } from './design-system-lab-tokens'

const GEMINI_FIGMA_NODE_URL =
  'https://www.figma.com/design/yyMksCoijfMaIoYplXKZaR/Design-System-%7C-AXIS?node-id=12267-95&m=dev'

const ADOBE_FIGMA_NODE_URL =
  'https://www.figma.com/design/yyMksCoijfMaIoYplXKZaR/Design-System-%7C-AXIS?node-id=12273-32&m=dev'

const EXPRESS_FIGMA_NODE_URL =
  'https://www.figma.com/design/yyMksCoijfMaIoYplXKZaR/Design-System-%7C-AXIS?node-id=12274-44&m=dev'

const FIREFLY_FIGMA_NODE_URL =
  'https://www.figma.com/design/yyMksCoijfMaIoYplXKZaR/Design-System-%7C-AXIS?node-id=12267-441&m=dev'

const PHOTOSHOP_FIGMA_NODE_URL =
  'https://www.figma.com/design/yyMksCoijfMaIoYplXKZaR/Design-System-%7C-AXIS?node-id=12270-452&m=dev'

const PREMIERE_FIGMA_NODE_URL =
  'https://www.figma.com/design/yyMksCoijfMaIoYplXKZaR/Design-System-%7C-AXIS?node-id=12273-5&m=dev'

const ILLUSTRATOR_FIGMA_NODE_URL =
  'https://www.figma.com/design/yyMksCoijfMaIoYplXKZaR/Design-System-%7C-AXIS?node-id=12270-481&m=dev'

const AFTER_EFFECTS_FIGMA_NODE_URL =
  'https://www.figma.com/design/yyMksCoijfMaIoYplXKZaR/Design-System-%7C-AXIS?node-id=12271-506&m=dev'

const ENVATO_FIGMA_NODE_URL =
  'https://www.figma.com/design/yyMksCoijfMaIoYplXKZaR/Design-System-%7C-AXIS?node-id=12274-35&m=dev'

const SHUTTERSTOCK_FIGMA_NODE_URL =
  'https://www.figma.com/design/yyMksCoijfMaIoYplXKZaR/Design-System-%7C-AXIS?node-id=12274-62&m=dev'

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
  kind: GreenhouseBrandLogoKind
  title: string
  figmaProperty: string
  description: string
}

const GEMINI_KIND_SPECIMENS: KindSpecimen[] = [
  {
    kind: 'geminiIsotype',
    title: 'Isotipo',
    figmaProperty: 'Property 1=Isotipo',
    description: 'Marca cromática independiente para contextos donde Gemini ya está nombrado cerca.'
  },
  {
    kind: 'geminiOnBlue',
    title: 'Fondo azul',
    figmaProperty: 'Property 1=Fondo-Azul',
    description: 'Badge circular de alto contraste para listas, matrices o estados compactos.'
  },
  {
    kind: 'geminiOnNeutral',
    title: 'Fondo gris',
    figmaProperty: 'Property 1=Fondo-Gris',
    description: 'Badge circular sobre superficies neutras cuando el azul sólido compite con el contenido.'
  },
  {
    kind: 'geminiLogotype',
    title: 'Logotipo',
    figmaProperty: 'Property 1=Logotipo',
    description: 'Lockup completo para referencias de proveedor, integración o documentación interna.'
  }
]

const ADOBE_KIND_SPECIMENS: KindSpecimen[] = [
  {
    kind: 'adobeIsotype',
    title: 'Isotipo',
    figmaProperty: 'Property 1=Isotipo',
    description: 'Marca corporativa simple para menciones donde Adobe ya está nombrado cerca.'
  },
  {
    kind: 'adobeOnRed',
    title: 'Fondo rojo',
    figmaProperty: 'Property 1=Fondo-Rojo',
    description: 'Badge corporativo de alto contraste para matrices compactas y referencias visuales.'
  },
  {
    kind: 'adobeOnNeutral',
    title: 'Fondo gris',
    figmaProperty: 'Property 1=Fondo-Gris',
    description: 'Badge sobre superficies neutras cuando el rojo sólido compite con el contenido.'
  },
  {
    kind: 'adobeOnPink',
    title: 'Fondo rosa',
    figmaProperty: 'Property 1=Fondo-Rosa',
    description: 'Badge suave para documentación, comparativas y menciones menos prominentes.'
  },
  {
    kind: 'adobeLogotype',
    title: 'Logotipo',
    figmaProperty: 'Property 1=Logotipo',
    description: 'Lockup corporativo completo para referencias de proveedor, integración o documentación.'
  }
]

const EXPRESS_KIND_SPECIMENS: KindSpecimen[] = [
  {
    kind: 'expressIsotype',
    title: 'Isotipo',
    figmaProperty: 'Property 1=Isotipo',
    description: 'Marca cromática simple para menciones donde Adobe Express ya está nombrado cerca.'
  },
  {
    kind: 'expressOnBlack',
    title: 'Fondo negro',
    figmaProperty: 'Property 1=Fondo-Negro',
    description: 'Badge de alto contraste para matrices compactas y estados sobre superficies claras.'
  },
  {
    kind: 'expressFullColorOnBlack',
    title: 'Full color sobre negro',
    figmaProperty: 'Derived: Isotipo + Fondo-Negro',
    description: 'Badge con el isotipo cromático completo dentro del círculo negro de marca.'
  },
  {
    kind: 'expressOnNeutral',
    title: 'Fondo gris',
    figmaProperty: 'Property 1=Fondo-Gris',
    description: 'Badge sobre superficies neutras cuando el fondo negro pesa demasiado.'
  },
  {
    kind: 'expressLogotype',
    title: 'Logotipo',
    figmaProperty: 'Property 1=Logotipo',
    description: 'Lockup completo para referencias de proveedor, integración o biblioteca de marca.'
  }
]

const FIREFLY_KIND_SPECIMENS: KindSpecimen[] = [
  {
    kind: 'fireflyIsotype',
    title: 'Isotipo',
    figmaProperty: 'Property 1=Isotipo',
    description: 'Marca simple para menciones donde Adobe Firefly ya está contextualizado.'
  },
  {
    kind: 'fireflyOnRed',
    title: 'Fondo rojo',
    figmaProperty: 'Property 1=Fondo-Rojo',
    description: 'Badge circular de alto contraste para matrices compactas y estados visuales.'
  },
  {
    kind: 'fireflyOnNeutral',
    title: 'Fondo gris',
    figmaProperty: 'Property 1=Fondo-Gris',
    description: 'Badge sobre superficies neutras cuando el fondo rojo pesa demasiado.'
  },
  {
    kind: 'fireflyOnPink',
    title: 'Fondo rosa',
    figmaProperty: 'Property 1=Fondo-Rosa',
    description: 'Badge suave para contextos editoriales, comparativas o documentación.'
  },
  {
    kind: 'fireflyLogotype',
    title: 'Logotipo',
    figmaProperty: 'Property 1=Logotipo',
    description: 'Lockup completo para referencias de proveedor, integración o biblioteca de marca.'
  }
]

const PHOTOSHOP_KIND_SPECIMENS: KindSpecimen[] = [
  {
    kind: 'photoshopIsotype',
    title: 'Isotipo',
    figmaProperty: 'Property 1=Isotipo',
    description: 'Marca simple para menciones donde Photoshop ya está nombrado cerca.'
  },
  {
    kind: 'photoshopOnDarkBlue',
    title: 'Fondo azul oscuro',
    figmaProperty: 'Property 1=Fondo-AzulOscuro',
    description: 'Badge de alto contraste para matrices compactas y estados sobre superficies claras.'
  },
  {
    kind: 'photoshopOnNeutral',
    title: 'Fondo gris',
    figmaProperty: 'Property 1=Fondo-Gris',
    description: 'Badge sobre superficies neutras cuando el azul oscuro pesa demasiado.'
  },
  {
    kind: 'photoshopOnLightBlue',
    title: 'Fondo azul claro',
    figmaProperty: 'Property 1=Fondo-AzulClaro',
    description: 'Badge suave para documentación, comparativas y referencias menos prominentes.'
  },
  {
    kind: 'photoshopLogotype',
    title: 'Logotipo',
    figmaProperty: 'Property 1=Logotipo',
    description: 'Lockup completo para referencias de proveedor, integración o biblioteca de marca.'
  }
]

const PREMIERE_KIND_SPECIMENS: KindSpecimen[] = [
  {
    kind: 'premiereIsotype',
    title: 'Isotipo',
    figmaProperty: 'Property 1=Isotipo',
    description: 'Marca simple para menciones donde Premiere ya está nombrado cerca.'
  },
  {
    kind: 'premiereOnLightPurple',
    title: 'Fondo morado claro',
    figmaProperty: 'Property 1=Fondo-MoradoClaro',
    description: 'Badge suave para documentación, comparativas y referencias menos prominentes.'
  },
  {
    kind: 'premiereOnDarkPurple',
    title: 'Fondo morado oscuro',
    figmaProperty: 'Property 1=Fondo-MoradoOscuro',
    description: 'Badge de alto contraste para matrices compactas y estados sobre superficies claras.'
  },
  {
    kind: 'premiereOnNeutral',
    title: 'Fondo gris',
    figmaProperty: 'Property 1=Fondo-Gris',
    description: 'Badge sobre superficies neutras cuando el morado oscuro pesa demasiado.'
  },
  {
    kind: 'premiereLogotype',
    title: 'Logotipo',
    figmaProperty: 'Property 1=Logotipo',
    description: 'Lockup completo para referencias de proveedor, integración o biblioteca de marca.'
  }
]

const ILLUSTRATOR_KIND_SPECIMENS: KindSpecimen[] = [
  {
    kind: 'illustratorIsotype',
    title: 'Isotipo',
    figmaProperty: 'Property 1=Isotipo',
    description: 'Marca simple para menciones donde Illustrator ya está nombrado cerca.'
  },
  {
    kind: 'illustratorOnBrown',
    title: 'Fondo café',
    figmaProperty: 'Property 1=Fondo-Cafe',
    description: 'Badge de alto contraste para matrices compactas y estados sobre superficies claras.'
  },
  {
    kind: 'illustratorOnNeutral',
    title: 'Fondo gris',
    figmaProperty: 'Property 1=Fondo-Gris',
    description: 'Badge sobre superficies neutras cuando el café sólido pesa demasiado.'
  },
  {
    kind: 'illustratorOnYellow',
    title: 'Fondo amarillo',
    figmaProperty: 'Property 1=Fondo-Amarillo',
    description: 'Badge suave para documentación, comparativas y referencias menos prominentes.'
  },
  {
    kind: 'illustratorLogotype',
    title: 'Logotipo',
    figmaProperty: 'Property 1=Logotipo',
    description: 'Lockup completo para referencias de proveedor, integración o biblioteca de marca.'
  }
]

const AFTER_EFFECTS_KIND_SPECIMENS: KindSpecimen[] = [
  {
    kind: 'afterEffectsIsotype',
    title: 'Isotipo',
    figmaProperty: 'Property 1=Isotipo',
    description: 'Marca simple para menciones donde After Effects ya está nombrado cerca.'
  },
  {
    kind: 'afterEffectsOnDarkPurple',
    title: 'Fondo morado oscuro',
    figmaProperty: 'Property 1=Fondo-MoradoOscuro',
    description: 'Badge de alto contraste para matrices compactas y estados sobre superficies claras.'
  },
  {
    kind: 'afterEffectsOnNeutral',
    title: 'Fondo gris',
    figmaProperty: 'Property 1=Fondo-Gris',
    description: 'Badge sobre superficies neutras cuando el morado oscuro pesa demasiado.'
  },
  {
    kind: 'afterEffectsOnLightPurple',
    title: 'Fondo morado claro',
    figmaProperty: 'Property 1=Fondo-MoradoClaro',
    description: 'Badge suave para documentación, comparativas y referencias menos prominentes.'
  },
  {
    kind: 'afterEffectsLogotype',
    title: 'Logotipo',
    figmaProperty: 'Property 1=Logotipo',
    description: 'Lockup completo para referencias de proveedor, integración o biblioteca de marca.'
  }
]

const ENVATO_KIND_SPECIMENS: KindSpecimen[] = [
  {
    kind: 'envatoIsotype',
    title: 'Isotipo',
    figmaProperty: 'Property 1=Isotipo',
    description: 'Marca simple para menciones donde Envato ya está nombrado cerca.'
  },
  {
    kind: 'envatoOnGreen',
    title: 'Fondo verde',
    figmaProperty: 'Property 1=Fondo-Verde',
    description: 'Badge de alto contraste para matrices compactas y estados visuales.'
  },
  {
    kind: 'envatoOnNeutral',
    title: 'Fondo gris',
    figmaProperty: 'Property 1=Fondo-Gris',
    description: 'Badge sobre superficies neutras cuando el verde sólido compite con el contenido.'
  },
  {
    kind: 'envatoOnLightGreen',
    title: 'Fondo verde claro',
    figmaProperty: 'Property 1=Fondo-VerdeClaro',
    description: 'Badge suave para documentación, comparativas y referencias menos prominentes.'
  },
  {
    kind: 'envatoLogotype',
    title: 'Logotipo',
    figmaProperty: 'Property 1=Logotipo',
    description: 'Lockup completo para referencias de proveedor, integración o biblioteca de marca.'
  }
]

const SHUTTERSTOCK_KIND_SPECIMENS: KindSpecimen[] = [
  {
    kind: 'shutterstockIsotype',
    title: 'Isotipo',
    figmaProperty: 'Property 1=Isotipo',
    description: 'Marca simple para menciones donde Shutterstock ya está nombrado cerca.'
  },
  {
    kind: 'shutterstockOnNeutral',
    title: 'Fondo gris',
    figmaProperty: 'Property 1=Fondo-Gris',
    description: 'Badge sobre superficies neutras cuando el rojo sólido compite con el contenido.'
  },
  {
    kind: 'shutterstockOnRed',
    title: 'Fondo rojo',
    figmaProperty: 'Property 1=Fondo-Rojo',
    description: 'Badge de alto contraste para matrices compactas y estados visuales.'
  },
  {
    kind: 'shutterstockOnPink',
    title: 'Fondo rosado',
    figmaProperty: 'Property 1=Fondo-Rosado',
    description: 'Badge suave para documentación, comparativas y referencias menos prominentes.'
  },
  {
    kind: 'shutterstockLogotype',
    title: 'Logotipo',
    figmaProperty: 'Property 1=Logotipo',
    description: 'Lockup completo para referencias de proveedor, integración o biblioteca de marca.'
  }
]

const SIZES: GreenhouseBrandLogoSize[] = ['small', 'medium', 'large']

const BRAND_LOGO_FAMILY_CARD_QUERY = '@container (min-width: 760px)'

const BRAND_LOGO_FAMILIES = [
  {
    title: 'Gemini',
    nodeId: '12267:95',
    figmaUrl: GEMINI_FIGMA_NODE_URL,
    dataCapture: 'brand-logo-gemini-kind-matrix',
    specimens: GEMINI_KIND_SPECIMENS
  },
  {
    title: 'Adobe',
    nodeId: '12273:32',
    figmaUrl: ADOBE_FIGMA_NODE_URL,
    dataCapture: 'brand-logo-adobe-kind-matrix',
    specimens: ADOBE_KIND_SPECIMENS
  },
  {
    title: 'Adobe Express',
    nodeId: '12274:44',
    figmaUrl: EXPRESS_FIGMA_NODE_URL,
    dataCapture: 'brand-logo-express-kind-matrix',
    specimens: EXPRESS_KIND_SPECIMENS
  },
  {
    title: 'Adobe Firefly',
    nodeId: '12267:441',
    figmaUrl: FIREFLY_FIGMA_NODE_URL,
    dataCapture: 'brand-logo-firefly-kind-matrix',
    specimens: FIREFLY_KIND_SPECIMENS
  },
  {
    title: 'Adobe Photoshop',
    nodeId: '12270:452',
    figmaUrl: PHOTOSHOP_FIGMA_NODE_URL,
    dataCapture: 'brand-logo-photoshop-kind-matrix',
    specimens: PHOTOSHOP_KIND_SPECIMENS
  },
  {
    title: 'Adobe Premiere Pro',
    nodeId: '12273:5',
    figmaUrl: PREMIERE_FIGMA_NODE_URL,
    dataCapture: 'brand-logo-premiere-kind-matrix',
    specimens: PREMIERE_KIND_SPECIMENS
  },
  {
    title: 'Adobe Illustrator',
    nodeId: '12270:481',
    figmaUrl: ILLUSTRATOR_FIGMA_NODE_URL,
    dataCapture: 'brand-logo-illustrator-kind-matrix',
    specimens: ILLUSTRATOR_KIND_SPECIMENS
  },
  {
    title: 'Adobe After Effects',
    nodeId: '12271:506',
    figmaUrl: AFTER_EFFECTS_FIGMA_NODE_URL,
    dataCapture: 'brand-logo-after-effects-kind-matrix',
    specimens: AFTER_EFFECTS_KIND_SPECIMENS
  },
  {
    title: 'Envato',
    nodeId: '12274:35',
    figmaUrl: ENVATO_FIGMA_NODE_URL,
    dataCapture: 'brand-logo-envato-kind-matrix',
    specimens: ENVATO_KIND_SPECIMENS
  },
  {
    title: 'Shutterstock',
    nodeId: '12274:62',
    figmaUrl: SHUTTERSTOCK_FIGMA_NODE_URL,
    dataCapture: 'brand-logo-shutterstock-kind-matrix',
    specimens: SHUTTERSTOCK_KIND_SPECIMENS
  }
] as const satisfies ReadonlyArray<{
  title: string
  nodeId: string
  figmaUrl: string
  dataCapture: string
  specimens: KindSpecimen[]
}>

const BrandLogoHero = () => (
  <Box
    data-capture='brand-logo-hero'
    sx={theme => ({
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', lg: 'minmax(360px, 0.9fr) minmax(520px, 1.1fr)' },
      gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap,
      alignItems: 'stretch',
      p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)}, ${theme.palette.background.paper} 54%, ${alpha(theme.palette.secondary.main, 0.08)})`
    })}
  >
    <Box
      sx={theme => ({
        display: 'grid',
        placeItems: 'center',
        minBlockSize: { xs: 220, md: 260 },
        minWidth: 0,
        overflow: 'hidden',
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        bgcolor: alpha(theme.palette.common.white, 0.72),
        boxShadow: `0 0 0 1px ${alpha(theme.palette.common.black, 0.04)} inset`
      })}
    >
      <Stack spacing={2.5} alignItems='center' justifyContent='center' sx={{ minWidth: 0 }}>
        <Stack direction='row' spacing={3} alignItems='center' justifyContent='center' flexWrap='wrap' useFlexGap>
          <GreenhouseBrandLogoMark kind='geminiIsotype' size='large' dataCapture='brand-logo-gemini-isotype-hero' />
          <GreenhouseBrandLogoMark kind='adobeOnRed' size='large' dataCapture='brand-logo-adobe-logotype-hero' />
          <GreenhouseBrandLogoMark
            kind='expressFullColorOnBlack'
            size='large'
            dataCapture='brand-logo-express-logotype-hero'
          />
          <GreenhouseBrandLogoMark kind='fireflyOnRed' size='large' dataCapture='brand-logo-firefly-logotype-hero' />
          <GreenhouseBrandLogoMark
            kind='photoshopOnDarkBlue'
            size='large'
            dataCapture='brand-logo-photoshop-logotype-hero'
          />
          <GreenhouseBrandLogoMark
            kind='premiereOnDarkPurple'
            size='large'
            dataCapture='brand-logo-premiere-logotype-hero'
          />
          <GreenhouseBrandLogoMark
            kind='illustratorOnBrown'
            size='large'
            dataCapture='brand-logo-illustrator-logotype-hero'
          />
          <GreenhouseBrandLogoMark
            kind='afterEffectsOnDarkPurple'
            size='large'
            dataCapture='brand-logo-after-effects-logotype-hero'
          />
          <GreenhouseBrandLogoMark kind='envatoOnGreen' size='large' dataCapture='brand-logo-envato-logotype-hero' />
          <GreenhouseBrandLogoMark
            kind='shutterstockOnRed'
            size='large'
            dataCapture='brand-logo-shutterstock-logotype-hero'
          />
        </Stack>
        <Typography variant='caption' color='text.secondary'>
          Gemini / Adobe / Adobe Express / Adobe Firefly / Adobe Photoshop / Adobe Premiere Pro / Adobe Illustrator /
          Adobe After Effects / Envato / Shutterstock
        </Typography>
      </Stack>
    </Box>

    <Stack spacing={3} justifyContent='center'>
      <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
        <GreenhouseChip label='AXIS Figma' size='small' tone='primary' variant='label' kind='attribute' />
        <GreenhouseChip label='kind → variant' size='small' tone='secondary' variant='label' kind='attribute' />
        <GreenhouseChip label='asset colors' size='small' tone='info' variant='label' kind='attribute' />
      </Stack>
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
        <Typography variant='h6'>Primitive para logos externos</Typography>
        <Typography variant='body2' color='text.secondary'>
          <InlineCode>GreenhouseBrandLogoMark</InlineCode> encapsula la geometría del logo y expone las variantes de
          Figma como <InlineCode>kind</InlineCode>. Los consumers no dibujan SVG sueltos, fondos paralelos ni
          reinterpretan el lockup.
        </Typography>
      </Stack>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        flexWrap='wrap'
        useFlexGap
        sx={{ pb: { xs: 10, sm: 0 } }}
      >
        <GreenhouseButton
          href={GEMINI_FIGMA_NODE_URL}
          kind='secondaryAction'
          variant='outlined'
          tone='primary'
          leadingIcon={<i className='tabler-brand-figma' />}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Nodo Gemini
        </GreenhouseButton>
        <GreenhouseButton
          href={ADOBE_FIGMA_NODE_URL}
          kind='secondaryAction'
          variant='outlined'
          tone='primary'
          leadingIcon={<i className='tabler-brand-figma' />}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Nodo Adobe
        </GreenhouseButton>
        <GreenhouseButton
          href={EXPRESS_FIGMA_NODE_URL}
          kind='secondaryAction'
          variant='outlined'
          tone='primary'
          leadingIcon={<i className='tabler-brand-figma' />}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Nodo Express
        </GreenhouseButton>
        <GreenhouseButton
          href={FIREFLY_FIGMA_NODE_URL}
          kind='secondaryAction'
          variant='outlined'
          tone='primary'
          leadingIcon={<i className='tabler-brand-figma' />}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Nodo Firefly
        </GreenhouseButton>
        <GreenhouseButton
          href={PHOTOSHOP_FIGMA_NODE_URL}
          kind='secondaryAction'
          variant='outlined'
          tone='primary'
          leadingIcon={<i className='tabler-brand-figma' />}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Nodo Photoshop
        </GreenhouseButton>
        <GreenhouseButton
          href={PREMIERE_FIGMA_NODE_URL}
          kind='secondaryAction'
          variant='outlined'
          tone='primary'
          leadingIcon={<i className='tabler-brand-figma' />}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Nodo Premiere
        </GreenhouseButton>
        <GreenhouseButton
          href={ILLUSTRATOR_FIGMA_NODE_URL}
          kind='secondaryAction'
          variant='outlined'
          tone='primary'
          leadingIcon={<i className='tabler-brand-figma' />}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Nodo Illustrator
        </GreenhouseButton>
        <GreenhouseButton
          href={AFTER_EFFECTS_FIGMA_NODE_URL}
          kind='secondaryAction'
          variant='outlined'
          tone='primary'
          leadingIcon={<i className='tabler-brand-figma' />}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Nodo After Effects
        </GreenhouseButton>
        <GreenhouseButton
          href={ENVATO_FIGMA_NODE_URL}
          kind='secondaryAction'
          variant='outlined'
          tone='primary'
          leadingIcon={<i className='tabler-brand-figma' />}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Nodo Envato
        </GreenhouseButton>
        <GreenhouseButton
          href={SHUTTERSTOCK_FIGMA_NODE_URL}
          kind='secondaryAction'
          variant='outlined'
          tone='primary'
          leadingIcon={<i className='tabler-brand-figma' />}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Nodo Shutterstock
        </GreenhouseButton>
      </Stack>
    </Stack>
  </Box>
)

const BrandLogoVariantTile = ({ item }: { item: KindSpecimen }) => (
  <Box
    component='li'
    sx={theme => ({
      display: 'grid',
      gridTemplateRows: '72px auto auto auto',
      gap: DESIGN_SYSTEM_LAB_TOKENS.spacing.tight,
      alignItems: 'start',
      minWidth: 0,
      minBlockSize: 208,
      p: DESIGN_SYSTEM_LAB_TOKENS.spacing.related,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.md}px`,
      bgcolor: alpha(theme.palette.text.primary, DESIGN_SYSTEM_LAB_TOKENS.opacity.subtleFill),
      '& > *': {
        minWidth: 0
      },
      '&:has([data-variant="lockup"])': {
        gridColumn: { xs: 'auto', lg: 'span 2' }
      }
    })}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minBlockSize: 72,
        overflow: 'hidden'
      }}
    >
      <GreenhouseBrandLogoMark
        kind={item.kind}
        size={item.kind.endsWith('Logotype') ? 'small' : 'medium'}
        sx={{ maxInlineSize: '100%' }}
      />
    </Box>
    <Stack spacing={0.25}>
      <Typography variant='subtitle2'>{item.title}</Typography>
      <Typography variant='caption' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
        {item.kind}
      </Typography>
    </Stack>
    <Typography variant='caption' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
      {item.figmaProperty}
    </Typography>
    <Typography
      variant='caption'
      color='text.secondary'
      sx={{
        display: '-webkit-box',
        overflow: 'hidden',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: 2
      }}
    >
      {item.description}
    </Typography>
  </Box>
)

const BrandLogoFamilyCard = ({
  title,
  nodeId,
  figmaUrl,
  dataCapture,
  specimens
}: {
  title: string
  nodeId: string
  figmaUrl: string
  dataCapture: string
  specimens: KindSpecimen[]
}) => (
  <Box
    data-capture={dataCapture}
    sx={theme => ({
      containerType: 'inline-size',
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      bgcolor: 'background.paper',
      overflow: 'hidden'
    })}
  >
    <Box
      sx={theme => ({
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', md: '240px minmax(0, 1fr) auto' },
        gap: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup,
        alignItems: { xs: 'start', md: 'center' },
        px: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset,
        py: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup,
        borderBlockEnd: `1px solid ${theme.palette.divider}`
      })}
    >
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        <Typography variant='h6'>{title}</Typography>
        <Typography variant='body2' color='text.secondary'>
          Nodo AXIS <InlineCode>{nodeId}</InlineCode>
        </Typography>
      </Stack>
      <Stack
        direction='row'
        spacing={1}
        flexWrap='wrap'
        useFlexGap
        sx={{ display: { xs: 'none', md: 'flex' }, minWidth: 0 }}
      >
        {specimens.map(item => (
          <GreenhouseBrandLogoMark key={item.kind} kind={item.kind} size='small' decorative />
        ))}
      </Stack>
      <GreenhouseButton
        href={figmaUrl}
        kind='secondaryAction'
        variant='outlined'
        tone='primary'
        aria-label={`Abrir nodo Figma de ${title}`}
        sx={{ minInlineSize: 40, px: 1 }}
      >
        <i className='tabler-brand-figma' />
      </GreenhouseButton>
    </Box>

    <Box
      component='ul'
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))',
        gap: DESIGN_SYSTEM_LAB_TOKENS.spacing.related,
        m: 0,
        p: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup,
        listStyle: 'none',
        [BRAND_LOGO_FAMILY_CARD_QUERY]: {
          gridTemplateColumns: 'repeat(auto-fit, minmax(184px, 1fr))',
          p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset
        }
      }}
    >
      {specimens.map(item => (
        <BrandLogoVariantTile key={item.kind} item={item} />
      ))}
    </Box>
  </Box>
)

const BrandLogoFamilyCatalog = () => (
  <Box
    data-capture='brand-logo-family-catalog'
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: 'minmax(0, 1fr)', xl: 'repeat(2, minmax(0, 1fr))' },
      gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap,
      alignItems: 'start',
      '& > *': {
        minWidth: 0
      }
    }}
  >
    {BRAND_LOGO_FAMILIES.map(family => (
      <BrandLogoFamilyCard
        key={family.nodeId}
        title={family.title}
        nodeId={family.nodeId}
        figmaUrl={family.figmaUrl}
        dataCapture={family.dataCapture}
        specimens={family.specimens}
      />
    ))}
  </Box>
)

const BrandLogoSizeSpecimens = () => (
  <Box
    data-capture='brand-logo-size-specimens'
    sx={theme => ({
      p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      bgcolor: 'background.paper'
    })}
  >
    <Stack spacing={2.5}>
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
        <Typography variant='h6'>Size contract</Typography>
        <Typography variant='body2' color='text.secondary'>
          El tamaño ajusta densidad del contexto; no cambia la identidad ni el mapping de Figma.
        </Typography>
      </Stack>
      <Stack spacing={2}>
        {SIZES.map(size => (
          <Stack key={size} direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
            <Typography variant='caption' color='text.secondary' sx={{ minInlineSize: 64 }}>
              {size}
            </Typography>
            <GreenhouseBrandLogoMark kind='geminiIsotype' size={size} />
            <GreenhouseBrandLogoMark kind='geminiOnBlue' size={size} />
            <GreenhouseBrandLogoMark kind='geminiOnNeutral' size={size} />
            <GreenhouseBrandLogoMark kind='geminiLogotype' size='small' />
            <GreenhouseBrandLogoMark kind='adobeIsotype' size={size} />
            <GreenhouseBrandLogoMark kind='adobeOnRed' size={size} />
            <GreenhouseBrandLogoMark kind='adobeOnNeutral' size={size} />
            <GreenhouseBrandLogoMark kind='adobeOnPink' size={size} />
            <GreenhouseBrandLogoMark kind='adobeLogotype' size='small' />
            <GreenhouseBrandLogoMark kind='expressIsotype' size={size} />
            <GreenhouseBrandLogoMark kind='expressOnBlack' size={size} />
            <GreenhouseBrandLogoMark kind='expressFullColorOnBlack' size={size} />
            <GreenhouseBrandLogoMark kind='expressOnNeutral' size={size} />
            <GreenhouseBrandLogoMark kind='expressLogotype' size='small' />
            <GreenhouseBrandLogoMark kind='fireflyIsotype' size={size} />
            <GreenhouseBrandLogoMark kind='fireflyOnRed' size={size} />
            <GreenhouseBrandLogoMark kind='fireflyOnNeutral' size={size} />
            <GreenhouseBrandLogoMark kind='fireflyOnPink' size={size} />
            <GreenhouseBrandLogoMark kind='fireflyLogotype' size='small' />
            <GreenhouseBrandLogoMark kind='photoshopIsotype' size={size} />
            <GreenhouseBrandLogoMark kind='photoshopOnDarkBlue' size={size} />
            <GreenhouseBrandLogoMark kind='photoshopOnNeutral' size={size} />
            <GreenhouseBrandLogoMark kind='photoshopOnLightBlue' size={size} />
            <GreenhouseBrandLogoMark kind='photoshopLogotype' size='small' />
            <GreenhouseBrandLogoMark kind='premiereIsotype' size={size} />
            <GreenhouseBrandLogoMark kind='premiereOnLightPurple' size={size} />
            <GreenhouseBrandLogoMark kind='premiereOnDarkPurple' size={size} />
            <GreenhouseBrandLogoMark kind='premiereOnNeutral' size={size} />
            <GreenhouseBrandLogoMark kind='premiereLogotype' size='small' />
            <GreenhouseBrandLogoMark kind='illustratorIsotype' size={size} />
            <GreenhouseBrandLogoMark kind='illustratorOnBrown' size={size} />
            <GreenhouseBrandLogoMark kind='illustratorOnNeutral' size={size} />
            <GreenhouseBrandLogoMark kind='illustratorOnYellow' size={size} />
            <GreenhouseBrandLogoMark kind='illustratorLogotype' size='small' />
            <GreenhouseBrandLogoMark kind='afterEffectsIsotype' size={size} />
            <GreenhouseBrandLogoMark kind='afterEffectsOnDarkPurple' size={size} />
            <GreenhouseBrandLogoMark kind='afterEffectsOnNeutral' size={size} />
            <GreenhouseBrandLogoMark kind='afterEffectsOnLightPurple' size={size} />
            <GreenhouseBrandLogoMark kind='afterEffectsLogotype' size='small' />
            <GreenhouseBrandLogoMark kind='envatoIsotype' size={size} />
            <GreenhouseBrandLogoMark kind='envatoOnGreen' size={size} />
            <GreenhouseBrandLogoMark kind='envatoOnNeutral' size={size} />
            <GreenhouseBrandLogoMark kind='envatoOnLightGreen' size={size} />
            <GreenhouseBrandLogoMark kind='envatoLogotype' size='small' />
            <GreenhouseBrandLogoMark kind='shutterstockIsotype' size={size} />
            <GreenhouseBrandLogoMark kind='shutterstockOnNeutral' size={size} />
            <GreenhouseBrandLogoMark kind='shutterstockOnRed' size={size} />
            <GreenhouseBrandLogoMark kind='shutterstockOnPink' size={size} />
            <GreenhouseBrandLogoMark kind='shutterstockLogotype' size='small' />
          </Stack>
        ))}
      </Stack>
    </Stack>
  </Box>
)

const ContractAside = () => (
  <Box
    data-capture='brand-logo-contract'
    sx={theme => ({
      p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      bgcolor: alpha(theme.palette.primary.main, 0.035),
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, minmax(0, 1fr))' },
      gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap,
      '& > *': {
        minWidth: 0
      }
    })}
  >
    <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
      <Typography variant='h6'>Contrato Figma</Typography>
      <Typography variant='body2' color='text.secondary'>
        Nodos AXIS <InlineCode>12267:95</InlineCode>, <InlineCode>12273:32</InlineCode>,{' '}
        <InlineCode>12274:44</InlineCode>, <InlineCode>12267:441</InlineCode>, <InlineCode>12270:452</InlineCode>,{' '}
        <InlineCode>12273:5</InlineCode>, <InlineCode>12270:481</InlineCode>, <InlineCode>12271:506</InlineCode>,{' '}
        <InlineCode>12274:35</InlineCode> y <InlineCode>12274:62</InlineCode>. Variables de nodo: vacío. Code Connect:
        bloqueado por seat/plan de Figma.
      </Typography>
    </Stack>
    <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
      <Typography variant='h6'>Regla de implementación</Typography>
      <Typography variant='body2' color='text.secondary'>
        Las variantes del componente Figma entran como <InlineCode>kind</InlineCode>; el{' '}
        <InlineCode>variant</InlineCode>
        queda reservado para el modo funcional de la primitive: isotype, contained o lockup.
      </Typography>
    </Stack>
    <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
      <Typography variant='h6'>Límite de marca</Typography>
      <Typography variant='body2' color='text.secondary'>
        Los colores del logo son constantes de asset, no tokens semánticos de UI. Contenedores, bordes y superficies sí
        consumen el theme AXIS/MUI.
      </Typography>
    </Stack>
  </Box>
)

const BrandLogoLabView = () => (
  <Box
    data-capture='brand-logo-lab'
    sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: DESIGN_SYSTEM_LAB_TOKENS.layout.sectionGap,
      inlineSize: '100%',
      maxWidth: 'none',
      mx: 0
    }}
  >
    <Stack
      spacing={DESIGN_SYSTEM_LAB_TOKENS.layout.headerGap}
      sx={{ inlineSize: '100%', maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}
    >
      <AxisWordmark
        variant='auto'
        height={DESIGN_SYSTEM_LAB_TOKENS.layout.logoBlockSize}
        sx={{ mb: DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline }}
      />
      <Typography variant='overline' color='primary'>
        Brand Logo Primitive
      </Typography>
      <Typography variant='h4'>Brand logo variations</Typography>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}
      >
        Hoja interna para portar componentes de logo desde AXIS Figma y gobernar sus variaciones mediante kinds.
      </Typography>
    </Stack>

    <CompositionShell
      composition='single'
      instanceId='brand-logo-lab'
      regions={{
        primary: (
          <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap} data-capture='brand-logo-primary-region'>
            <BrandLogoHero />
            <ContractAside />
            <BrandLogoFamilyCatalog />
            <BrandLogoSizeSpecimens />
          </Stack>
        )
      }}
    />
  </Box>
)

export default BrandLogoLabView
