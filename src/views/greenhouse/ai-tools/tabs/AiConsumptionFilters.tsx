'use client'

import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'

import CustomTextField from '@core/components/mui/TextField'

import type { AiToolingAdminMetadata } from '@/types/ai-tools'

type Props = {
  meta: AiToolingAdminMetadata | null
  filterMember: string
  filterWallet: string
  setFilterMember: (v: string) => void
  setFilterWallet: (v: string) => void
}

const AiConsumptionFilters = ({
  meta, filterMember, filterWallet,
  setFilterMember, setFilterWallet
}: Props) => {
  return (
    <CardContent>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <CustomTextField
            select fullWidth size='small' label='Miembro'
            value={filterMember} onChange={e => setFilterMember(e.target.value)}
          >
            <MenuItem value=''>Todos</MenuItem>
            {(meta?.activeMembers ?? []).map(m => (
              <MenuItem key={m.memberId} value={m.memberId}>{m.displayName}</MenuItem>
            ))}
          </CustomTextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <CustomTextField
            fullWidth size='small' label='Wallet ID'
            value={filterWallet} onChange={e => setFilterWallet(e.target.value)}
            placeholder='Filtrar por wallet...'
          />
        </Grid>
      </Grid>
    </CardContent>
  )
}

export default AiConsumptionFilters
