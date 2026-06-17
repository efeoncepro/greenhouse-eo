/**
 * TASK-1153 — Estado de error del cockpit (si el reader de TASK-1152 falla).
 * Copy canónico es-CL, sin detalle técnico. Server-safe (sin estado).
 */
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Typography from '@mui/material/Typography'

import { GreenhouseBreadcrumbs } from '@/components/greenhouse/primitives'
import { GH_ROADMAP } from '@/lib/copy/roadmap'

const RoadmapCockpitError = () => (
  <Box data-capture='roadmap-shell' sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <GreenhouseBreadcrumbs
        kind='pageHierarchy'
        items={[{ label: GH_ROADMAP.breadcrumbRoot, href: '/home' }, { label: GH_ROADMAP.breadcrumbCurrent }]}
      />
      <Typography variant='h4'>
        {GH_ROADMAP.pageTitle}
      </Typography>
    </Box>
    <Alert severity='error' variant='standard'>
      <AlertTitle sx={{ fontWeight: 600, typography: 'body2' }}>{GH_ROADMAP.errorTitle}</AlertTitle>
      <Typography variant='body2' sx={{ color: 'error.dark' }}>
        {GH_ROADMAP.errorBody}
      </Typography>
    </Alert>
  </Box>
)

export default RoadmapCockpitError
