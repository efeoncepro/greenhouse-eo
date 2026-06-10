'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import { typographyScale } from '@/components/theme/typography-tokens'
import {
  GreenhouseTalentProfileDossier,
  GreenhouseVerificationBadge,
  type GreenhouseTalentProfileDossierTalent
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

const sampleTalent: GreenhouseTalentProfileDossierTalent = {
  id: 'diego-alejandro-perez',
  name: 'Diego Alejandro Pérez',
  initials: 'DP',
  role: 'Backend Engineer',
  space: 'Productos & Pagos',
  roleLabel: 'Software',
  roleIcon: 'tabler-code',
  roleTone: 'info',
  healthLabel: 'Estable',
  healthIcon: 'tabler-shield-check',
  healthTone: 'success',
  allocationFte: 1,
  coveragePct: 90,
  deliveryConfidence: 88,
  backupDepth: '2.1x',
  skills: ['Java', 'Spring Boot', 'Kafka'],
  certifications: ['Spring Professional'],
  languages: ['ES', 'EN'],
  currentFocus: 'Integraciones transaccionales y confiabilidad',
  lastSignal: 'Entrega estable en las últimas 4 semanas'
}

const TalentProfileLabView = () => (
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
      <AxisWordmark
        variant='auto'
        height={DESIGN_SYSTEM_LAB_TOKENS.layout.logoBlockSize}
        sx={{ mb: DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline }}
      />
      <Typography variant='overline' color='primary'>
        Talent Profile Lab
      </Typography>
      <Typography variant='h4'>Dossier y verificación de talento</Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}>
        Laboratorio interno para primitives de perfil verificable. Centraliza el dossier enterprise, el badge
        &quot;Verificado por Efeonce&quot; y el kind &quot;Talento verificado&quot; antes de crear variantes por superficie.
      </Typography>
    </Stack>

    <Box
      data-capture='talent-profile-lab-dossier'
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          lg: `minmax(320px, 420px) minmax(${DESIGN_SYSTEM_LAB_TOKENS.layout.asideMinInlineSize}px, 1fr)`
        },
        gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap,
        alignItems: 'start'
      }}
    >
      <GreenhouseTalentProfileDossier
        talent={sampleTalent}
        kind='assignedTeamTalent'
        dataCapture='greenhouse-talent-profile-dossier-lab'
      />

      <Stack spacing={3} sx={{ py: { xs: 0, lg: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup } }}>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Primitive + variant</Typography>
          <Typography variant='body2' color='text.secondary'>
            <InlineCode>GreenhouseTalentProfileDossier</InlineCode> owns the enterprise profile shell, verification area,
            compact metrics, coverage meter, verified stack and latest signal. <InlineCode>variant=enterpriseCard</InlineCode>
            is the base for assigned-team, candidate and delivery talent kinds.
          </Typography>
        </Stack>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Mini reglas de uso</Typography>
          <Typography variant='body2' color='text.secondary'>
            Usarlo cuando la UI necesite decidir o revisar cobertura de una persona. No usarlo como tarjeta decorativa de
            directorio, ni poblarlo con señales sin source-of-truth, freshness y política de visibilidad.
          </Typography>
        </Stack>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Mini reglas de cambio</Typography>
          <Typography variant='body2' color='text.secondary'>
            Nuevas métricas o bloques requieren primero un prop explícito, estado degradado y GVC en esta página. No duplicar
            versiones por route; crear kind/variant oficial si cambia densidad, estado o tarea.
          </Typography>
        </Stack>
      </Stack>
    </Box>

    <Box
      data-capture='talent-profile-lab-verification-badges'
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          lg: `minmax(320px, 420px) minmax(${DESIGN_SYSTEM_LAB_TOKENS.layout.asideMinInlineSize}px, 1fr)`
        },
        gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap,
        alignItems: 'start'
      }}
    >
      <Box
        sx={theme => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          bgcolor: 'background.paper',
          p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset
        })}
      >
        <Stack spacing={2.5} alignItems='flex-start'>
          <GreenhouseVerificationBadge kind='efeonce' size='medium' />
          <GreenhouseVerificationBadge kind='talentVerified' size='medium' />
          <GreenhouseVerificationBadge kind='talentVerified' size='small' />
        </Stack>
      </Box>

      <Stack spacing={3} sx={{ py: { xs: 0, lg: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup } }}>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Primitive + kinds</Typography>
          <Typography variant='body2' color='text.secondary'>
            <InlineCode>GreenhouseVerificationBadge</InlineCode> owns the verification lockup, wordmark spacing and accessible
            label. Kinds oficiales: <InlineCode>efeonce</InlineCode> y <InlineCode>talentVerified</InlineCode>.
          </Typography>
        </Stack>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Mini reglas de uso</Typography>
          <Typography variant='body2' color='text.secondary'>
            Usarlo solo cuando exista verificación real o una política aprobada que defina qué se validó. El badge no reemplaza
            evidencia, provenance ni auditoría.
          </Typography>
        </Stack>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Mini reglas de cambio</Typography>
          <Typography variant='body2' color='text.secondary'>
            Nuevos labels o marcas deben entrar como kind oficial con copy bilingüe, aria-label, GVC y revisión de marca. No
            componer logos sueltos ni badges route-locales.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  </Box>
)

export default TalentProfileLabView
