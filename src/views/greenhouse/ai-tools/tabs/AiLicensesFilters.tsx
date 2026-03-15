'use client'

import { useEffect } from 'react'

import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'

import CustomTextField from '@core/components/mui/TextField'

import type { MemberToolLicense, AiToolingAdminMetadata } from '@/types/ai-tools'
import { licenseStatusConfig } from '../helpers'

type Props = {
  data: MemberToolLicense[]
  meta: AiToolingAdminMetadata | null
  status: string
  setStatus: (v: string) => void
  setFiltered: (d: MemberToolLicense[]) => void
}

const AiLicensesFilters = ({
  data, meta, status,
  setStatus, setFiltered
}: Props) => {
  useEffect(() => {
    const filtered = data.filter(item => {
      if (status && item.licenseStatus !== status) return false

      return true
    })

    setFiltered(filtered)
  }, [data, status, setFiltered])

  const statuses = meta?.licenseStatuses ?? (Object.keys(licenseStatusConfig) as Array<keyof typeof licenseStatusConfig>)

  return (
    <CardContent>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <CustomTextField
            select fullWidth size='small' label='Estado'
            value={status} onChange={e => setStatus(e.target.value)}
          >
            <MenuItem value=''>Todos los estados</MenuItem>
            {statuses.map(s => (
              <MenuItem key={s} value={s}>
                <Stack direction='row' spacing={1} alignItems='center'>
                  <i className={licenseStatusConfig[s as keyof typeof licenseStatusConfig]?.icon ?? 'tabler-circle'} style={{ fontSize: 16 }} />
                  <span>{licenseStatusConfig[s as keyof typeof licenseStatusConfig]?.label ?? s}</span>
                </Stack>
              </MenuItem>
            ))}
          </CustomTextField>
        </Grid>
      </Grid>
    </CardContent>
  )
}

export default AiLicensesFilters
