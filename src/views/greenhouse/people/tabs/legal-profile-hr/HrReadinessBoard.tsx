'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

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

/**
 * TASK-784 flat redesign — Readiness strip integrado al container raiz.
 *
 * NO 2 cards separadas con borde. Es un strip horizontal de 2 celdas
 * separadas por 1px de divider, dentro del container que provee la seccion
 * padre. Borders top/bottom unicos para integrarse con secciones adyacentes.
 */
const HrReadinessBoard = ({ finalSettlement, payroll }: HrReadinessBoardProps) => {
  const theme = useTheme()

  const renderCell = (title: string, r: ReadinessResultDto) => {
    const accent = accentForReadiness(r)

    return (
      <Box sx={{ p: 4, backgroundColor: theme.palette.background.paper }}>
        <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 1.5 }}>
          <Typography
            variant='caption'
            sx={{
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'text.secondary',
              fontSize: 11
            }}
          >
            {title}
          </Typography>
          <Stack
            direction='row'
            alignItems='center'
            spacing={1}
            sx={{ color: `${accent}.main` }}
          >
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
            <Typography variant='body2' sx={{ fontWeight: 600, fontSize: 13 }}>
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
            <Box
              component='li'
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                py: 0.25,
                fontSize: 13,
                color: 'text.secondary'
              }}
            >
              <i
                className='tabler-check'
                style={{ fontSize: 13, marginTop: 3, color: theme.palette.success.main, flexShrink: 0 }}
                aria-hidden='true'
              />
              <span>
                {title === HR_LEGAL_COPY.readiness.payroll
                  ? HR_LEGAL_COPY.readiness.payrollOk
                  : 'Listo para emitir documentos formales'}
              </span>
            </Box>
          ) : (
            r.blockers.map(b => (
              <Box
                key={b}
                component='li'
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  py: 0.25,
                  fontSize: 13,
                  color: 'text.secondary'
                }}
              >
                <i
                  className='tabler-x'
                  style={{ fontSize: 13, marginTop: 3, color: theme.palette.error.main, flexShrink: 0 }}
                  aria-hidden='true'
                />
                <span>{HR_LEGAL_COPY.blockerLabels[b] ?? b}</span>
              </Box>
            ))
          )}
        </Box>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
        gap: '1px',
        backgroundColor: theme.palette.divider,
        borderTop: `1px solid ${theme.palette.divider}`,
        borderBottom: `1px solid ${theme.palette.divider}`
      }}
    >
      {renderCell(HR_LEGAL_COPY.readiness.finalSettlement, finalSettlement)}
      {renderCell(HR_LEGAL_COPY.readiness.payroll, payroll)}
    </Box>
  )
}

export default HrReadinessBoard
