'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import CustomTabList from '@core/components/mui/TabList'

import { HorizontalWithSubtitle } from '@/components/card-statistics'
import type {
  AiToolsCatalogResponse,
  AiToolLicensesResponse,
  AiCreditWalletsResponse,
  AiToolingAdminMetadata
} from '@/types/ai-tools'

import AiCatalogTab from './tabs/AiCatalogTab'
import AiLicensesTab from './tabs/AiLicensesTab'
import AiWalletsTab from './tabs/AiWalletsTab'
import AiConsumptionTab from './tabs/AiConsumptionTab'

type AdminTab = 'catalog' | 'licenses' | 'wallets' | 'consumption'

const AiToolingDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<AdminTab>('catalog')
  const [catalogData, setCatalogData] = useState<AiToolsCatalogResponse | null>(null)
  const [licensesData, setLicensesData] = useState<AiToolLicensesResponse | null>(null)
  const [walletsData, setWalletsData] = useState<AiCreditWalletsResponse | null>(null)
  const [meta, setMeta] = useState<AiToolingAdminMetadata | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)

    try {
      const [catRes, licRes, walRes, metaRes] = await Promise.all([
        fetch('/api/admin/ai-tools/catalog'),
        fetch('/api/admin/ai-tools/licenses'),
        fetch('/api/admin/ai-tools/wallets'),
        fetch('/api/admin/ai-tools/meta')
      ])

      if (catRes.ok) setCatalogData(await catRes.json())
      if (licRes.ok) setLicensesData(await licRes.json())
      if (walRes.ok) setWalletsData(await walRes.json())
      if (metaRes.ok) setMeta(await metaRes.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleTabChange = (_: SyntheticEvent, value: string) => {
    setTab(value as AdminTab)
  }

  if (loading) {
    return (
      <Stack spacing={6}>
        <Skeleton variant='rounded' height={48} />
        <Grid container spacing={6}>
          {[0, 1, 2, 3].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant='rounded' height={100} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={48} />
        <Skeleton variant='rounded' height={400} />
      </Stack>
    )
  }

  const catSummary = catalogData?.summary ?? { total: 0, active: 0, categories: {} }
  const licSummary = licensesData?.summary ?? { total: 0, active: 0, members: 0 }
  const walSummary = walletsData?.summary ?? { totalWallets: 0, activeWallets: 0, depletedWallets: 0, totalCreditsAvailable: 0 }

  return (
    <Stack spacing={6}>
      {/* Header */}
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
        <Stack direction='row' spacing={2} alignItems='center'>
          <Button component={Link} href='/admin' variant='tonal' color='secondary' size='small'>
            <i className='tabler-arrow-left' />
          </Button>
          <Box>
            <Typography variant='h4'>AI Tooling & Créditos</Typography>
            <Typography variant='body2' color='text.secondary'>
              Catálogo, licencias y créditos del ecosistema IA
            </Typography>
          </Box>
        </Stack>
      </Stack>

      {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

      {/* KPIs */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Herramientas'
            stats={String(catSummary.total)}
            avatarIcon='tabler-wand'
            avatarColor='primary'
            subtitle={`${catSummary.active} activas`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Licencias'
            stats={String(licSummary.total)}
            avatarIcon='tabler-key'
            avatarColor='info'
            subtitle={`${licSummary.active} activas · ${licSummary.members} personas`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Wallets'
            stats={String(walSummary.totalWallets)}
            avatarIcon='tabler-wallet'
            avatarColor='success'
            subtitle={`${walSummary.activeWallets} activos${walSummary.depletedWallets > 0 ? ` · ${walSummary.depletedWallets} agotados` : ''}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Créditos disponibles'
            stats={String(walSummary.totalCreditsAvailable)}
            avatarIcon='tabler-coins'
            avatarColor='warning'
            subtitle='Balance total sistema'
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <TabContext value={tab}>
        <CustomTabList onChange={handleTabChange} variant='scrollable' pill='true'>
          <Tab value='catalog' label='Catálogo' icon={<i className='tabler-wand' />} iconPosition='start' />
          <Tab value='licenses' label='Licencias' icon={<i className='tabler-key' />} iconPosition='start' />
          <Tab value='wallets' label='Wallets' icon={<i className='tabler-wallet' />} iconPosition='start' />
          <Tab value='consumption' label='Consumo' icon={<i className='tabler-receipt' />} iconPosition='start' />
        </CustomTabList>

        <TabPanel value='catalog' className='p-0'>
          <AiCatalogTab
            tools={catalogData?.tools ?? []}
            providers={catalogData?.providers ?? []}
            meta={meta}
            onRefresh={fetchData}
          />
        </TabPanel>
        <TabPanel value='licenses' className='p-0'>
          <AiLicensesTab
            licenses={licensesData?.licenses ?? []}
            tools={catalogData?.tools ?? []}
            meta={meta}
            onRefresh={fetchData}
          />
        </TabPanel>
        <TabPanel value='wallets' className='p-0'>
          <AiWalletsTab
            wallets={walletsData?.wallets ?? []}
            tools={catalogData?.tools ?? []}
            meta={meta}
            onRefresh={fetchData}
          />
        </TabPanel>
        <TabPanel value='consumption' className='p-0'>
          <AiConsumptionTab meta={meta} />
        </TabPanel>
      </TabContext>
    </Stack>
  )
}

export default AiToolingDashboard
