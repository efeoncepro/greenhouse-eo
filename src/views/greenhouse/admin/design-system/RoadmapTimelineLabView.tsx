'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import {
  GreenhouseBreadcrumbs,
  GreenhouseChip,
  GreenhouseRoadmapTimeline,
  type GreenhouseRoadmapTimelineItem
} from '@/components/greenhouse/primitives'
import { typographyScale } from '@/components/theme/typography-tokens'

import { DESIGN_SYSTEM_LAB_TOKENS } from './design-system-lab-tokens'

const productRoadmapItems: GreenhouseRoadmapTimelineItem[] = [
  {
    id: 'core',
    period: 'Q1 2023',
    title: 'Core Platform',
    description: 'Basic functionality and user management',
    status: 'done'
  },
  {
    id: 'analytics',
    period: 'Q2 2023',
    title: 'Analytics',
    description: 'Reporting and data visualization',
    status: 'in-progress'
  },
  {
    id: 'integrations',
    period: 'Q3 2023',
    title: 'Integrations',
    description: 'Third-party app connections',
    status: 'upcoming'
  },
  {
    id: 'ai-features',
    period: 'Q4 2023',
    title: 'AI Features',
    description: 'Smart automation and predictions',
    status: 'upcoming'
  }
]

const releasePlanItems: GreenhouseRoadmapTimelineItem[] = [
  {
    id: 'primitive',
    period: 'Slice 1',
    title: 'Primitive contract',
    description: 'Tipos, aliases del prompt, variant resolver, reduced-motion y semántica ordered-list.',
    status: 'complete'
  },
  {
    id: 'lab',
    period: 'Slice 2',
    title: 'Design-system lab',
    description: 'Catálogo interno, reachability, GVC scenario y documentación de la primitive.',
    status: 'active'
  },
  {
    id: 'adoption',
    period: 'Slice 3',
    title: 'Adopción por dominio',
    description: 'Sustituir timelines de roadmap one-off cuando aparezcan en surfaces de producto.',
    status: 'pending'
  }
]

const onboardingItems: GreenhouseRoadmapTimelineItem[] = [
  {
    id: 'intake',
    period: 'Día 0',
    title: 'Intake',
    description: 'El cliente comparte objetivo, restricciones y evidencia disponible.',
    status: 'complete'
  },
  {
    id: 'taxonomy',
    period: 'Día 1',
    title: 'Taxonomy',
    description: 'Greenhouse ubica el flujo en dominio, capability y ownership operativo.',
    status: 'active'
  },
  {
    id: 'execution',
    period: 'Semana 1',
    title: 'Execution loop',
    description: 'Nexa propone momentos, acciones y checkpoints con trazabilidad.',
    status: 'pending'
  },
  {
    id: 'activation',
    period: 'Semana 2',
    title: 'Activation',
    description: 'El cliente queda operando con handoff, métricas y next best actions.',
    status: 'blocked',
    meta: 'Depends on data access'
  }
]

const InlineCode = ({ children }: { children: string }) => (
  <Box
    component='span'
    sx={theme => ({
      px: 0.65,
      py: 0.15,
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

const ContractRow = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
  <Stack direction='row' spacing={1.25} alignItems='flex-start'>
    <Box
      aria-hidden='true'
      sx={theme => ({
        width: 34,
        height: 34,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        color: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, DESIGN_SYSTEM_LAB_TOKENS.opacity.softAccentSurface),
        '& > i': { fontSize: 18 }
      })}
    >
      <i className={icon} />
    </Box>
    <Stack spacing={0.25}>
      <Typography variant='h6'>
        {title}
      </Typography>
      <Typography variant='caption' color='text.secondary'>
        {description}
      </Typography>
    </Stack>
  </Stack>
)

const RoadmapTimelineLabView = () => (
  <Box
    data-capture='roadmap-timeline-lab'
    sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: DESIGN_SYSTEM_LAB_TOKENS.layout.sectionGap,
      maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.pageMaxInlineSize,
      mx: 'auto'
    }}
  >
    <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.layout.headerGap}>
      <GreenhouseBreadcrumbs
        kind='pageHierarchy'
        items={[
          { label: 'Design System', href: '/design-system' },
          { label: 'Roadmap timeline' }
        ]}
      />
      <AxisWordmark variant='auto' height={DESIGN_SYSTEM_LAB_TOKENS.layout.logoBlockSize} sx={{ mb: 0.5 }} />
      <Typography variant='overline' color='primary'>
        Roadmap Timeline Lab
      </Typography>
      <Typography variant='h4'>
        Roadmaps, release plans y horizontes de producto
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}>
        <InlineCode>GreenhouseRoadmapTimeline</InlineCode> trae el patrón del prompt al Design System sin shadcn,
        Tailwind ni Framer Motion directo en views de producto. Los dominios entregan periodos, estado y copy; la
        primitive gobierna responsive, tokens AXIS, a11y y reduced motion.
      </Typography>
      <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
        <GreenhouseChip size='small' tone='primary' variant='label' label='Primitive' />
        <GreenhouseChip size='small' tone='success' variant='label' label='Aliases del prompt' />
        <GreenhouseChip size='small' tone='info' variant='label' label='Variants + kinds' />
        <GreenhouseChip size='small' tone='warning' variant='label' label='GVC scenario' />
      </Stack>
    </Stack>

    <Box
      data-capture='roadmap-timeline-product'
      sx={{
        display: 'flex',
        justifyContent: 'center'
      }}
    >
      <GreenhouseRoadmapTimeline
        title='Product Roadmap'
        description='Upcoming features and releases'
        items={productRoadmapItems}
        kind='productRoadmap'
        dataCapture='roadmap-timeline-product-roadmap'
      />
    </Box>

    <Card variant='outlined'>
      <CardContent
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(280px, 0.8fr)' },
          gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap
        }}
      >
        <Stack spacing={1}>
          <Typography variant='h6'>
            Decisión de integración
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            No importamos el componente del prompt como screenshot de shadcn. Lo convertimos en primitive Greenhouse
            para que el roadmap pueda vivir en Nexa, docs internas, onboarding y surfaces de cliente con el mismo
            contrato.
          </Typography>
        </Stack>
        <Stack spacing={2}>
          <ContractRow
            icon='tabler-route'
            title='Kinds semánticos'
            description='productRoadmap, releasePlan, implementationPlan y clientOnboarding resuelven variantes oficiales.'
          />
          <Divider />
          <ContractRow
            icon='tabler-accessible'
            title='A11y horneada'
            description='Ordered list, region label, aria-current en el item activo y color acompañado de texto.'
          />
          <ContractRow
            icon='tabler-brand-framer-motion'
            title='Motion contenido'
            description='Entrada progresiva desde la primitive con reduced-motion; los views no importan motion directo.'
          />
        </Stack>
      </CardContent>
    </Card>

    <Box
      data-capture='roadmap-timeline-variants'
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(320px, 0.72fr)' },
        gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap,
        alignItems: 'start'
      }}
    >
      <GreenhouseRoadmapTimeline
        title='Release plan'
        description='Horizontal por defecto para plan de entrega, con estados canónicos Greenhouse.'
        items={releasePlanItems}
        kind='releasePlan'
        dataCapture='roadmap-timeline-release-plan'
      />

      <GreenhouseRoadmapTimeline
        title='Client onboarding'
        description='Stacked para flujos donde el usuario necesita leer dependencia, bloqueo o próximo paso.'
        items={onboardingItems}
        kind='clientOnboarding'
        dataCapture='roadmap-timeline-client-onboarding'
      />
    </Box>
  </Box>
)

export default RoadmapTimelineLabView
