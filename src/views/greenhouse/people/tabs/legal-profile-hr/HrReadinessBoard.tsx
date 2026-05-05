'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { HR_LEGAL_COPY } from './copy'
import type { ReadinessResultDto } from './types'

interface HrReadinessBoardProps {
  finalSettlement: ReadinessResultDto
  payroll: ReadinessResultDto
}

const accentForReadiness = (r: ReadinessResultDto): 'success' | 'warning' | 'error' => {
  if (r.ready) return 'success'
  if (r.blockers.length > 0) return 'error'

  return 'warning'
}

const HrReadinessBoard = ({ finalSettlement, payroll }: HrReadinessBoardProps) => {
  const theme = useTheme()

  const renderCard = (title: string, r: ReadinessResultDto) => {
    const accent = accentForReadiness(r)
    const accentColor = theme.palette[accent].main

    return (
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: theme.shape.customBorderRadius.md,
          p: 4
        }}
      >
        <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 2 }}>
          <Typography
            variant='caption'
            sx={{
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'text.secondary'
            }}
          >
            {title}
          </Typography>
          <Stack direction='row' alignItems='center' spacing={1} sx={{ color: `${accent}.main` }}>
            <i
              className={
                r.ready
                  ? 'tabler-check'
                  : r.blockers.length > 0
                    ? 'tabler-x'
                    : 'tabler-alert-triangle'
              }
              style={{ fontSize: 14 }}
              aria-hidden='true'
            />
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {r.ready
                ? HR_LEGAL_COPY.readiness.statusReady
                : r.blockers.length > 0
                  ? HR_LEGAL_COPY.readiness.statusBlockers(r.blockers.length)
                  : HR_LEGAL_COPY.readiness.statusWarnings(r.warnings.length)}
            </Typography>
          </Stack>
        </Stack>
        <Box component='ul' sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {r.ready ? (
            <Box component='li' sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 0.5, fontSize: 13, color: 'text.secondary' }}>
              <i className='tabler-check' style={{ fontSize: 14, marginTop: 2, color: theme.palette.success.main }} aria-hidden='true' />
              <span>{title === HR_LEGAL_COPY.readiness.payroll ? HR_LEGAL_COPY.readiness.payrollOk : 'Listo para emitir documentos formales'}</span>
            </Box>
          ) : (
            r.blockers.map(b => (
              <Box
                key={b}
                component='li'
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  py: 0.5,
                  fontSize: 13,
                  color: 'text.secondary'
                }}
              >
                <i className='tabler-x' style={{ fontSize: 14, marginTop: 2, color: theme.palette.error.main }} aria-hidden='true' />
                <span>{HR_LEGAL_COPY.blockerLabels[b] ?? b}</span>
              </Box>
            ))
          )}
        </Box>
      </Card>
    )
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
        gap: 4,
        mb: 6
      }}
    >
      {renderCard(HR_LEGAL_COPY.readiness.finalSettlement, finalSettlement)}
      {renderCard(HR_LEGAL_COPY.readiness.payroll, payroll)}
    </Box>
  )
}

// silence unused alpha in some builds
void alpha

export default HrReadinessBoard
