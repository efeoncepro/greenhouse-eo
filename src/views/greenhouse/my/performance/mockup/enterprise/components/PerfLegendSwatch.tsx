// TASK-1075 — chart legend swatch (HTML — chart annotations live OUT of the SVG,
// where the AppRecharts 13px !important would otherwise mangle them).
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

const PerfLegendSwatch = ({ color, dashed, label }: { color: string; dashed?: boolean; label: string }) => (
  <Stack direction='row' alignItems='center' spacing={1}>
    <Box
      aria-hidden='true'
      sx={{ width: 18, height: 0, borderTop: dashed ? `2px dashed ${color}` : `3px solid ${color}`, borderRadius: '2px' }}
    />
    <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 600 }}>
      {label}
    </Typography>
  </Stack>
)

export default PerfLegendSwatch
