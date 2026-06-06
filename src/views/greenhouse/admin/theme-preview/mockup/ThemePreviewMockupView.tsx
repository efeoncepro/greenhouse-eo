'use client'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'

// Live-theme preview: real MUI components colored by the AXIS-wired palette.
// Verifies contrastText + Alert/Chip/Button rendering against the live theme (TASK-1034).

const SEVERITIES = ['success', 'warning', 'error', 'info'] as const
const COLORS = ['primary', 'secondary', 'success', 'warning', 'error', 'info'] as const

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant='h6' sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {children}
    </CardContent>
  </Card>
)

const ThemePreviewMockupView = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 1100, mx: 'auto' }}>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <AxisWordmark variant='full' height={40} />
      <Typography variant='h4' sx={{ fontWeight: 700 }}>
        Theme vivo — semánticos (mockup)
      </Typography>
      <Typography variant='body2' color='text.secondary'>
        Componentes MUI reales coloreados por el palette (no swatches). Verifica contrastText, alerts y chips
        contra el theme vivo tras cablear AXIS. success/warning/info usan texto oscuro (AA); error usa blanco
        (gap documentado en botón contained — TASK-1034 Slice 2b).
      </Typography>
    </Box>

    <Section title='Alerts · standard (soft)'>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {SEVERITIES.map(sev => (
          <Alert key={sev} severity={sev}>
            <AlertTitle sx={{ textTransform: 'capitalize' }}>{sev}</AlertTitle>
            Mensaje de ejemplo para la severidad {sev}.
          </Alert>
        ))}
      </Box>
    </Section>

    <Section title='Alerts · filled'>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {SEVERITIES.map(sev => (
          <Alert key={sev} severity={sev} variant='filled'>
            <AlertTitle sx={{ textTransform: 'capitalize' }}>{sev}</AlertTitle>
            Mensaje de ejemplo para la severidad {sev}.
          </Alert>
        ))}
      </Box>
    </Section>

    <Section title='Buttons · contained (verifica contrastText)'>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        {COLORS.map(c => (
          <Button key={c} variant='contained' color={c} sx={{ textTransform: 'capitalize' }}>
            {c}
          </Button>
        ))}
      </Box>
    </Section>

    <Section title='Buttons · tonal (soft)'>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        {COLORS.map(c => (
          <Button key={c} variant='tonal' color={c} sx={{ textTransform: 'capitalize' }}>
            {c}
          </Button>
        ))}
      </Box>
    </Section>

    <Section title='Chips · filled + tonal'>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        {COLORS.map(c => (
          <Chip key={`f-${c}`} label={c} color={c} sx={{ textTransform: 'capitalize' }} />
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        {COLORS.map(c => (
          <Chip key={`t-${c}`} label={c} color={c} variant='tonal' sx={{ textTransform: 'capitalize' }} />
        ))}
      </Box>
    </Section>
  </Box>
)

export default ThemePreviewMockupView
