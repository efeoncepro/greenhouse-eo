'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import {
  GreenhouseActivityTimeline,
  GreenhouseChip,
  GREENHOUSE_ACTIVITY_TIMELINE_TOKENS,
  type GreenhouseActivityTimelineItem
} from '@/components/greenhouse/primitives'
import { typographyScale } from '@/components/theme/typography-tokens'

import { DESIGN_SYSTEM_LAB_TOKENS } from './design-system-lab-tokens'

const activityTimelineItems: GreenhouseActivityTimelineItem[] = [
  {
    id: 'contract-pack-rendered',
    title: 'Pack contractual renderizado',
    timestamp: '12 min',
    description: 'Contrato, anexos y comprobante de recepción quedaron generados desde la plantilla vigente.',
    tone: 'primary',
    attachment: {
      label: 'contrato-honorarios.pdf',
      ariaLabel: 'Archivo adjunto contrato-honorarios.pdf'
    }
  },
  {
    id: 'legal-review',
    title: 'Revisión legal aprobada',
    timestamp: '45 min',
    description: 'Sin observaciones abiertas para la modalidad honorarios Chile.',
    tone: 'success',
    person: {
      name: 'Camila Rojas',
      description: 'People Ops · Efeonce',
      initials: 'CR'
    }
  },
  {
    id: 'signature-handoff',
    title: 'Handoff enviado a firma',
    timestamp: '2 días',
    description: '6 integrantes quedan informados para seguimiento operativo.',
    tone: 'info',
    avatars: [
      { id: 'julio', alt: 'Julio Reyes', initials: 'JR' },
      { id: 'marcela', alt: 'Marcela Campos', initials: 'MC' },
      { id: 'daniela', alt: 'Daniela Pereira', initials: 'DP' },
      { id: 'felipe', alt: 'Felipe Araya', initials: 'FA' },
      { id: 'andrea', alt: 'Andrea Silva', initials: 'AS' },
      { id: 'nicolas', alt: 'Nicolas Vera', initials: 'NV' }
    ]
  }
]

const auditTrailItems: GreenhouseActivityTimelineItem[] = [
  {
    id: 'contract-rendered',
    title: 'Pack contractual renderizado',
    timestamp: '09:42',
    description: 'PDF generado desde plantilla vigente y checksum registrado.',
    tone: 'primary',
    attachment: { label: 'honorarios-pack.pdf', ariaLabel: 'Archivo contractual honorarios-pack.pdf' }
  },
  {
    id: 'provider-handoff',
    title: 'Handoff enviado a firma',
    timestamp: '09:45',
    description: 'Proveedor externo acepto el callback de recepcion.',
    tone: 'success',
    person: {
      name: 'Camila Rojas',
      description: 'People Ops',
      initials: 'CR'
    }
  },
  {
    id: 'evidence-pending',
    title: 'Evidencia pendiente de verificacion',
    timestamp: '10:18',
    description: 'El archivo existe, pero falta resultado de escaneo.',
    tone: 'warning'
  }
]

const InlineCode = ({ children }: { children: string }) => (
  <Box
    component='span'
    sx={theme => ({
      px: 0.65,
      py: 0.15,
      borderRadius: 0.75,
      color: theme.palette.text.primary,
      backgroundColor: alpha(theme.palette.text.primary, DESIGN_SYSTEM_LAB_TOKENS.opacity.codeBackground),
      ...typographyScale.labelSm,
      whiteSpace: 'nowrap'
    })}
  >
    {children}
  </Box>
)

const ContractSignal = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
  <Stack direction='row' spacing={1.25} alignItems='flex-start'>
    <Box
      aria-hidden='true'
      sx={theme => ({
        width: GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.icon.contractSignalContainer,
        height: GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.icon.contractSignalContainer,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        color: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, DESIGN_SYSTEM_LAB_TOKENS.opacity.softAccentSurface),
        '& > i': { fontSize: GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.icon.contractSignal }
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

const UtilitiesLabView = () => (
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
      <AxisWordmark variant='auto' height={DESIGN_SYSTEM_LAB_TOKENS.layout.logoBlockSize} sx={{ mb: 0.5 }} />
      <Typography variant='overline' color='primary'>
        Utilities Lab
      </Typography>
      <Typography variant='h4'>
        Utilidades enterprise para Greenhouse
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}>
        Laboratorio interno para primitives utilitarias del Design System. Esta primera pieza adapta
        <InlineCode>Activity Timeline</InlineCode> de AXIS a un patrón reusable para secuencias operativas, evidencia
        ligera y handoffs.
      </Typography>
    </Stack>

    <Box
      data-capture='utilities-lab-activity-timeline'
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          lg: `minmax(0, ${GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.card.maxInlineSize}px) minmax(${DESIGN_SYSTEM_LAB_TOKENS.layout.narrowAsideMinInlineSize}px, 1fr)`
        },
        gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap,
        alignItems: 'start'
      }}
    >
      <GreenhouseActivityTimeline
        title='Activity Timeline'
        items={activityTimelineItems}
        variant='card'
        kind='activityTimeline'
        dataCapture='greenhouse-activity-timeline-axis-port'
      />

      <Card
        variant='outlined'
        sx={theme => ({
          borderColor: alpha(theme.palette.text.primary, DESIGN_SYSTEM_LAB_TOKENS.opacity.subtleBorder),
          boxShadow:
            theme.palette.mode === 'dark'
              ? 'none'
              : `0 ${DESIGN_SYSTEM_LAB_TOKENS.shadow.cardOffsetY}px ${DESIGN_SYSTEM_LAB_TOKENS.shadow.cardBlur}px ${alpha(
                  theme.palette.text.primary,
                  DESIGN_SYSTEM_LAB_TOKENS.opacity.elevatedShadow
                )}`
        })}
      >
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Stack spacing={1}>
            <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
              <GreenhouseChip size='small' tone='primary' variant='label' kind='attribute' label='Primitive' />
              <GreenhouseChip size='small' tone='success' variant='label' kind='attribute' label='Reduced motion' />
              <GreenhouseChip size='small' tone='info' variant='label' kind='attribute' label='Ordered list a11y' />
            </Stack>
            <Typography variant='h6'>
              Contrato reusable, no screenshot
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              <InlineCode>GreenhouseActivityTimeline</InlineCode> gobierna rail, dots, tiempos, adjuntos, personas,
              avatar clusters, responsive y semántica. Los dominios solo entregan eventos ya autorizados.
            </Typography>
          </Stack>

          <Divider />

          <ContractSignal
            icon='tabler-layers-intersect'
            title='Variants funcionales'
            description='card para surfaces AXIS, embedded para panels y compact para inspectores densos.'
          />
          <ContractSignal
            icon='tabler-player-play'
            title='Motion medido'
            description='Framer Motion cubre entradas y conectores; GSAP queda para timelines complejas.'
          />
          <ContractSignal
            icon='tabler-shield-check'
            title='Límites claros'
            description='No reemplaza audit trail legal, permisos, evidence vault, retention ni commands.'
          />
        </CardContent>
      </Card>
    </Box>

    <Card variant='outlined' data-capture='utilities-lab-variants'>
      <CardContent
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: `minmax(0, 1fr) ${DESIGN_SYSTEM_LAB_TOKENS.layout.asideMinInlineSize}px`
          },
          gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap
        }}
      >
        <Stack spacing={2.5}>
          <Typography variant='h6'>
            Variants y kinds semánticos
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            La primitive no es un audit log completo ni un proveedor de datos. Sirve como chasis reusable para actividad,
            handoffs y timelines de documento donde el usuario necesita escanear secuencia, tiempo y evidencia ligera.
          </Typography>
          <GreenhouseActivityTimeline
            title='Contract audit trail'
            subtitle='Embedded example'
            items={auditTrailItems}
            variant='embedded'
            kind='auditTrail'
            dataCapture='greenhouse-activity-timeline-audit-embedded'
          />
        </Stack>

        <Stack spacing={2}>
          <Typography variant='h6'>
            Fit esperado
          </Typography>
          {[
            ['activityTimeline', 'Eventos recientes de una entidad o workspace.'],
            ['auditTrail', 'Secuencia resumida con evidencia ligera, no auditoria legal completa.'],
            ['handoffTimeline', 'Estados de traspaso a proveedor, callback o integracion externa.'],
            ['documentTimeline', 'Generacion, revision, firma y archivo de documentos.']
          ].map(([kind, description]) => (
            <Stack key={kind} direction='row' spacing={1.25} alignItems='flex-start'>
              <Avatar
                sx={{
                  width: GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.icon.fitAvatar,
                  height: GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.icon.fitAvatar,
                  bgcolor: 'primary.lighter',
                  color: 'primary.dark',
                  ...typographyScale.labelSm,
                  '& > i': { fontSize: GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.icon.fitAvatarGlyph }
                }}
              >
                <i className='tabler-timeline-event' />
              </Avatar>
              <Stack spacing={0.25}>
                <Typography variant='h6'>
                  {kind}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {description}
                </Typography>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  </Box>
)

export default UtilitiesLabView
