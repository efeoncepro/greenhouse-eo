'use client'

import Link from 'next/link'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { ExecutiveCardShell, ExecutiveMiniStatCard } from '@/components/greenhouse'
import type { AdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import type { AdminTenantsOverview } from '@/lib/admin/get-admin-tenants-overview'
import { GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'

type Props = {
  access: AdminAccessOverview
  tenants: AdminTenantsOverview
}

type DomainCard = {
  title: string
  subtitle: string
  icon: string
  status: { label: string; color: 'success' | 'warning' | 'info' | 'secondary' }
  href: string
  primaryAction: string
  routes: string[]
  points: string[]
}

const domainCards = ({ access, tenants }: Props): DomainCard[] => [
  {
    title: 'Spaces',
    subtitle: 'Provisioning context, enablement y postura de acceso por tenant.',
    icon: 'tabler-grid-4x4',
    status: { label: tenants.totals.activeTenants > 0 ? 'Activo' : 'Sin spaces', color: tenants.totals.activeTenants > 0 ? 'success' : 'warning' },
    href: '/admin/tenants',
    primaryAction: 'Abrir spaces',
    routes: ['/admin', '/admin/tenants'],
    points: [
      `${tenants.totals.totalTenants} spaces visibles en governance`,
      `${tenants.totals.tenantsWithScopedProjects} con proyectos scoped`,
      'Aquí vive el contexto de capabilities y acceso por empresa'
    ]
  },
  {
    title: 'Identity & Access',
    subtitle: 'Usuarios, roles, equipo interno y scopes visibles del portal.',
    icon: 'tabler-shield-lock',
    status: { label: access.totals.activeUsers > 0 ? 'Operativo' : 'Pendiente', color: access.totals.activeUsers > 0 ? 'success' : 'warning' },
    href: '/admin/users',
    primaryAction: 'Abrir usuarios',
    routes: ['/admin/users', '/admin/roles', '/admin/team'],
    points: [
      `${access.totals.totalUsers} usuarios y ${access.roles.length} roles registrados`,
      `${access.totals.invitedUsers} invitaciones pendientes`,
      'Esta familia separa gobierno de acceso de las vistas operativas del producto'
    ]
  },
  {
    title: 'Delivery',
    subtitle: 'Historial de envios, suscripciones y trazabilidad de delivery operacional.',
    icon: 'tabler-mail-bolt',
    status: { label: 'Listo', color: 'success' },
    href: '/admin/email-delivery',
    primaryAction: 'Abrir correos',
    routes: ['/admin/email-delivery'],
    points: [
      'La capa centralizada de email ya tiene surface administrativa',
      'Permite revisar delivery, retries y destinatarios por tipo',
      'Es la slice de governance para notificaciones transaccionales'
    ]
  },
  {
    title: 'AI Governance',
    subtitle: 'Catálogo, licencias, wallets y control administrativo de AI Tools.',
    icon: 'tabler-robot',
    status: { label: 'Dual', color: 'info' },
    href: '/admin/ai-tools',
    primaryAction: 'Abrir AI governance',
    routes: ['/admin/ai-tools'],
    points: [
      'Sigue existiendo como domain surface para usuarios de AI Tooling',
      'Dentro de Admin Center funciona como capa de gobernanza y control',
      'No mezcla uso diario con administración de créditos o licencias'
    ]
  },
  {
    title: 'Cloud & Integrations',
    subtitle: GH_INTERNAL_NAV.adminCloudIntegrations.subtitle,
    icon: 'tabler-plug-connected',
    status: { label: 'warning', color: 'warning' },
    href: '/admin/cloud-integrations',
    primaryAction: 'Abrir cloud & integrations',
    routes: ['/admin/cloud-integrations', '/agency/operations'],
    points: [
      'Ya tiene entrypoint propio dentro de Admin Center para syncs y webhooks',
      'Sigue pudiendo deep-linkear a operaciones compartidas cuando hace falta más contexto',
      'El foco es health, stale data, retries y auth por referencia'
    ]
  },
  {
    title: 'Ops Health',
    subtitle: GH_INTERNAL_NAV.adminOpsHealth.subtitle,
    icon: 'tabler-activity-heartbeat',
    status: { label: 'stale', color: 'secondary' },
    href: '/admin/ops-health',
    primaryAction: 'Abrir ops health',
    routes: ['/admin/ops-health', '/agency/operations'],
    points: [
      'Ahora vive dentro de /admin como vista mínima de outbox, queue y handlers reactivos',
      'La semántica objetivo es ok, warning, failed y stale',
      'La mutación real de replay o retry debe seguir viviendo en helpers canónicos'
    ]
  }
]

const AdminCenterView = ({ access, tenants }: Props) => {
  const cards = domainCards({ access, tenants })
  const healthTone = access.totals.invitedUsers > 0 ? 'warning' : 'info'

  return (
    <Stack spacing={6}>
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 4, md: 6 },
            background:
              'linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(34,197,94,0.1) 32%, rgba(15,23,42,0) 100%)'
          }}
        >
          <Stack spacing={2.5}>
            <Chip label={GH_INTERNAL_NAV.adminCenter.label} color='info' variant='outlined' sx={{ width: 'fit-content' }} />
            <Typography variant='h3'>{GH_INTERNAL_NAV.adminCenter.subtitle}</Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 980 }}>
              Esta landing deja de tratar <strong>/admin</strong> como redirect y lo convierte en control plane. Desde aquí agrupamos
              identity, delivery, AI governance y la observabilidad operativa que necesita crecer sin romper las rutas especialistas ya activas.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button component={Link} href='/admin/users' variant='contained'>Abrir Identity & Access</Button>
              <Button component={Link} href='/admin/cloud-integrations' variant='outlined'>Ver Cloud & Integrations</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        <ExecutiveMiniStatCard
          eyebrow='Governance'
          tone='info'
          title='Spaces activos'
          value={String(tenants.totals.activeTenants)}
          detail='Tenants visibles con postura operativa vigente.'
          icon='tabler-grid-4x4'
        />
        <ExecutiveMiniStatCard
          eyebrow='Identity'
          tone='success'
          title='Usuarios activos'
          value={String(access.totals.activeUsers)}
          detail='Base con acceso habilitado dentro del portal.'
          icon='tabler-users'
        />
        <ExecutiveMiniStatCard
          eyebrow='Access'
          tone='warning'
          title='Invitados pendientes'
          value={String(access.totals.invitedUsers)}
          detail='Invitaciones o onboarding aún sin cerrar.'
          icon='tabler-mail-exclamation'
        />
        <ExecutiveMiniStatCard
          eyebrow='RBAC'
          tone={healthTone}
          title='Roles registrados'
          value={String(access.roles.length)}
          detail='Catálogo visible de roles y route groups.'
          icon='tabler-shield-lock'
        />
      </Box>

      <ExecutiveCardShell
        title='Mapa de dominios de governance'
        subtitle='Cada dominio indexa una family operacional distinta. Las rutas especialistas siguen vivas; Admin Center las contextualiza.'
      >
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' }
          }}
        >
          {cards.map(card => (
            <Card key={card.title} variant='outlined' sx={{ height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Stack spacing={3} sx={{ height: '100%' }}>
                  <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
                    <Stack spacing={1}>
                      <Stack direction='row' spacing={1.5} alignItems='center'>
                        <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity', color: 'info.main' }}>
                          <i className={card.icon} />
                        </Avatar>
                        <Typography variant='h5'>{card.title}</Typography>
                      </Stack>
                      <Typography color='text.secondary'>{card.subtitle}</Typography>
                    </Stack>
                    <Chip size='small' color={card.status.color} variant='tonal' label={card.status.label} />
                  </Stack>

                  <Stack spacing={1.25}>
                    {card.points.map(point => (
                      <Typography key={point} variant='body2' color='text.secondary'>
                        - {point}
                      </Typography>
                    ))}
                  </Stack>

                  <Box sx={{ mt: 'auto' }}>
                    <Typography variant='overline' color='text.secondary'>Rutas indexadas</Typography>
                    <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1.25, mb: 2.5 }}>
                      {card.routes.map(route => (
                        <Chip key={route} size='small' label={route} variant='outlined' sx={{ fontFamily: 'monospace' }} />
                      ))}
                    </Stack>
                    {(card.title === 'Identity & Access' || card.title === 'Cloud & Integrations' || card.title === 'Ops Health') ? (
                      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 2 }}>
                        {card.title === 'Identity & Access'
                          ? 'Esta familia agrupa usuarios, roles y equipo sin rehacer sus routes existentes.'
                          : 'Esta landing indexa el dominio de governance aunque el detalle operativo siga viviendo fuera de /admin en este MVP.'}
                      </Typography>
                    ) : null}
                    <Button component={Link} href={card.href} variant='outlined'>
                      {card.primaryAction}
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      </ExecutiveCardShell>

      <ExecutiveCardShell
        title='Criterio operativo del shell'
        subtitle='Lo que pertenece aquí y lo que deliberadamente sigue viviendo fuera del control plane.'
      >
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' } }}>
          <Card variant='outlined'>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant='h6'>Pertenece a Admin Center</Typography>
                <Typography variant='body2' color='text.secondary'>- Alcance, acceso, delivery, health, retries, syncs, auditoría y config operativa.</Typography>
                <Typography variant='body2' color='text.secondary'>- Índices de secciones futuras como secret refs, economics readiness y capacity freshness.</Typography>
                <Typography variant='body2' color='text.secondary'>- Entry points que ordenan la navegación sin romper las surfaces existentes.</Typography>
              </Stack>
            </CardContent>
          </Card>
          <Card variant='outlined'>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant='h6'>No reemplaza módulos especialistas</Typography>
                <Typography variant='body2' color='text.secondary'>- No se convierte en mega-dashboard de producto ni en consola cloud vendor-specific.</Typography>
                <Typography variant='body2' color='text.secondary'>- No absorbe la surface operativa diaria de AI Tools, Finance, Payroll o Agency.</Typography>
                <Typography variant='body2' color='text.secondary'>- No expone secretos en claro; solo debe crecer hacia metadata y `secret_ref` gobernado.</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </ExecutiveCardShell>
    </Stack>
  )
}

export default AdminCenterView
