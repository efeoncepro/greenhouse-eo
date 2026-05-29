// TASK-947 — not-found page canonical (TASK-946 framework state #7).
//
// Render semánticamente indistinguible para:
//   1. ID con shape válido pero sin row en DB.
//   2. ID con shape inválido (no matchea EO-AIS-* / EO-AIE-* / EO-AIH-*).
//   3. Subject sin acceso al insight encontrado.
//   4. Tenant cliente externo (out-of-scope V1).
//
// Anti-oracle TASK-872 pattern: el atacante NO puede distinguir "el insight
// existe pero no tengo acceso" de "el insight no existe".

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_NEXA } from '@/config/greenhouse-nomenclature'

const NotFound = () => (
  <Stack spacing={6} sx={{ py: 4 }} component='main' role='main'>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Link
        href='/home'
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'inherit', textDecoration: 'none' }}
      >
        <i className='tabler-arrow-left' style={{ fontSize: 16 }} aria-hidden='true' />
        <Typography variant='caption' color='text.secondary'>
          {GH_NEXA.detail_back_to_home}
        </Typography>
      </Link>
    </Box>

    <Card elevation={0} sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}>
      <CardContent>
        <EmptyState
          icon='tabler-search-off'
          title={GH_NEXA.detail_not_found_title}
          description={GH_NEXA.detail_not_found_body}
          minHeight={240}
          action={
            <Button
              variant='contained'
              color='primary'
              component={Link}
              href='/home'
              startIcon={<i className='tabler-home' aria-hidden='true' />}
            >
              {GH_NEXA.detail_not_found_cta}
            </Button>
          }
        />
      </CardContent>
    </Card>
  </Stack>
)

export default NotFound
