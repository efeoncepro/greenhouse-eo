'use client'

import { useEffect, useMemo } from 'react'

import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'

import CustomTextField from '@core/components/mui/TextField'

import type { AiTool, ProviderRecord, AiToolingAdminMetadata } from '@/types/ai-tools'
import { toolCategoryConfig } from '../helpers'

type Props = {
  data: AiTool[]
  providers: ProviderRecord[]
  meta: AiToolingAdminMetadata | null
  category: string
  provider: string
  search: string
  setCategory: (v: string) => void
  setProvider: (v: string) => void
  setSearch: (v: string) => void
  setFiltered: (d: AiTool[]) => void
}

const AiCatalogFilters = ({
  data, providers, meta, category, provider, search,
  setCategory, setProvider, setSearch, setFiltered
}: Props) => {
  const providerOptions = useMemo(() => {
    const all = [...(meta?.providers ?? []), ...providers]

    return all.reduce<ProviderRecord[]>((acc, p) => {
      if (!p.providerId || acc.some(item => item.providerId === p.providerId)) return acc
      acc.push(p)

      return acc
    }, [])
  }, [meta, providers])

  const categories = useMemo(
    () => meta?.toolCategories ?? (Object.keys(toolCategoryConfig) as Array<keyof typeof toolCategoryConfig>),
    [meta]
  )

  useEffect(() => {
    const filtered = data.filter(item => {
      if (category && item.toolCategory !== category) return false
      if (provider && item.providerId !== provider) return false

      if (search) {
        const q = search.toLowerCase()

        return item.toolName.toLowerCase().includes(q) || (item.description ?? '').toLowerCase().includes(q)
      }

      return true
    })

    setFiltered(filtered)
  }, [data, category, provider, search, setFiltered])

  return (
    <CardContent>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <CustomTextField
            fullWidth
            size='small'
            placeholder='Buscar herramienta...'
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <CustomTextField
            select fullWidth size='small' label='Categoría'
            value={category} onChange={e => setCategory(e.target.value)}
          >
            <MenuItem value=''>Todas</MenuItem>
            {categories.map(cat => (
              <MenuItem key={cat} value={cat}>
                <Stack direction='row' spacing={1} alignItems='center'>
                  <i className={toolCategoryConfig[cat as keyof typeof toolCategoryConfig]?.icon ?? 'tabler-puzzle'} style={{ fontSize: 16 }} />
                  <span>{toolCategoryConfig[cat as keyof typeof toolCategoryConfig]?.label ?? cat}</span>
                </Stack>
              </MenuItem>
            ))}
          </CustomTextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <CustomTextField
            select fullWidth size='small' label='Proveedor'
            value={provider} onChange={e => setProvider(e.target.value)}
          >
            <MenuItem value=''>Todos</MenuItem>
            {providerOptions.map(p => (
              <MenuItem key={p.providerId} value={p.providerId}>{p.providerName}</MenuItem>
            ))}
          </CustomTextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <CustomTextField
            select fullWidth size='small' label='Estado'
            value='' onChange={() => {}}
            disabled
          >
            <MenuItem value=''>Todos</MenuItem>
          </CustomTextField>
        </Grid>
      </Grid>
    </CardContent>
  )
}

export default AiCatalogFilters
