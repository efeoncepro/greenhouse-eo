'use client'

import Link from 'next/link'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import {
  GreenhouseActivityTimeline,
  type GreenhouseActivityTimelineItem
} from '@/components/greenhouse/primitives'

const DESIGN_SYSTEM_ROUTE = '/admin/design-system'

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
      backgroundColor: alpha(theme.palette.text.primary, 0.055),
      fontSize: '0.78em',
      fontWeight: 700,
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
        width: 32,
        height: 32,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        color: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        '& > i': { fontSize: 18 }
      })}
    >
      <i className={icon} />
    </Box>
    <Stack spacing={0.25}>
      <Typography variant='body2' sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      <Typography variant='caption' color='text.secondary'>
        {description}
      </Typography>
    </Stack>
  </Stack>
)

const UtilitiesLabView = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 1100, mx: 'auto' }}>
    <Stack spacing={1.5}>
      <Button
        component={Link}
        href={DESIGN_SYSTEM_ROUTE}
        variant='text'
        color='secondary'
        size='small'
        startIcon={<i className='tabler-arrow-left' />}
        sx={{ alignSelf: 'flex-start', px: 0 }}
      >
        Design System
      </Button>
      <AxisWordmark variant='auto' height={32} sx={{ mb: 0.5 }} />
      <Typography variant='overline' color='primary' sx={{ fontWeight: 800 }}>
        Utilities Lab
      </Typography>
      <Typography variant='h4' sx={{ fontWeight: 800 }}>
        Utilidades enterprise para Greenhouse
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 820 }}>
        Laboratorio interno para primitives utilitarias del Design System. Esta primera pieza adapta
        <InlineCode>Activity Timeline</InlineCode> de AXIS a un patrón reusable para secuencias operativas, evidencia
        ligera y handoffs.
      </Typography>
    </Stack>

    <Box
      data-capture='utilities-lab-activity-timeline'
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 554px) minmax(320px, 1fr)' },
        gap: 4,
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
          borderColor: alpha(theme.palette.text.primary, 0.08),
          boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 18px 42px rgba(47, 43, 61, 0.06)'
        })}
      >
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Stack spacing={1}>
            <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
              <Chip size='small' color='primary' variant='tonal' label='Primitive' />
              <Chip size='small' color='success' variant='tonal' label='Reduced motion' />
              <Chip size='small' color='info' variant='tonal' label='Ordered list a11y' />
            </Stack>
            <Typography variant='h6' sx={{ fontWeight: 800 }}>
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
      <CardContent sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 320px' }, gap: 4 }}>
        <Stack spacing={2.5}>
          <Typography variant='h6' sx={{ fontWeight: 800 }}>
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
          <Typography variant='body2' sx={{ fontWeight: 800 }}>
            Fit esperado
          </Typography>
          {[
            ['activityTimeline', 'Eventos recientes de una entidad o workspace.'],
            ['auditTrail', 'Secuencia resumida con evidencia ligera, no auditoria legal completa.'],
            ['handoffTimeline', 'Estados de traspaso a proveedor, callback o integracion externa.'],
            ['documentTimeline', 'Generacion, revision, firma y archivo de documentos.']
          ].map(([kind, description]) => (
            <Stack key={kind} direction='row' spacing={1.25} alignItems='flex-start'>
              <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.lighter', color: 'primary.dark', fontSize: 13 }}>
                <i className='tabler-timeline-event' />
              </Avatar>
              <Stack spacing={0.25}>
                <Typography variant='body2' sx={{ fontWeight: 800 }}>
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
