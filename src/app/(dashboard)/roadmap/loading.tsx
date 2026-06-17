/**
 * TASK-1153 — Skeleton del cockpit de Roadmap mientras el reader resuelve el índice.
 * Tamaños alineados al contenido final (header + summary + filtros + board).
 */
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'

const RoadmapLoading = () => (
  <Box data-capture='roadmap-shell' sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Skeleton variant='text' width={160} height={18} />
      <Skeleton variant='text' width={220} height={42} />
      <Skeleton variant='text' width='60%' height={22} />
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 3 }}>
      {Array.from({ length: 7 }).map((_, idx) => (
        <Skeleton key={idx} variant='rounded' height={120} />
      ))}
    </Box>
    <Skeleton variant='rounded' height={68} />
    <Box sx={{ display: 'flex', gap: 3.5 }}>
      {Array.from({ length: 4 }).map((_, idx) => (
        <Skeleton key={idx} variant='rounded' width={286} height={260} sx={{ flex: '0 0 286px' }} />
      ))}
    </Box>
  </Box>
)

export default RoadmapLoading
