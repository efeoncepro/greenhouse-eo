'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import CustomTabList from '@core/components/mui/TabList'

import HorizontalWithSubtitle from '@/components/card-statistics/HorizontalWithSubtitle'
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
    setError(null)

    try {
      const [catRes, licRes, walRes, metaRes] = await Promise.all([
        fetch('/api/admin/ai-tools/catalog'),
        fetch('/api/admin/ai-tools/licenses'),
        fetch('/api/admin/ai-tools/wallets'),
        fetch('/api/admin/ai-tools/meta')
      ])

      const errors: string[] = []

      if (catRes.ok) {
        setCatalogData(await catRes.json())
      } else {
        const body = await catRes.json().catch(() => ({ error: `HTTP ${catRes.status}` }))
        errors.push(`Catálogo: ${body.error ?? catRes.statusText}`)
      }

      if (licRes.ok) {
        setLicensesData(await licRes.json())
      } else {
        const body = await licRes.json().catch(() => ({ error: `HTTP ${licRes.status}` }))
        errors.push(`Licencias: ${body.error ?? licRes.statusText}`)
      }

      if (walRes.ok) {
        setWalletsData(await walRes.json())
      } else {
        const body = await walRes.json().catch(() => ({ error: `HTTP ${walRes.status}` }))
        errors.push(`Wallets: ${body.error ?? walRes.statusText}`)
      }

      if (metaRes.ok) {
        setMeta(await metaRes.json())
      } else {
        const body = await metaRes.json().catch(() => ({ error: `HTTP ${metaRes.status}` }))
        errors.push(`Metadata: ${body.error ?? metaRes.statusText}`)
      }

      if (errors.length > 0) {
        setError(errors.join(' · '))
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión al cargar datos')
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
        <Stack direction='row' spacing={2} alignItems='center'>
          <Skeleton variant='circular' width={40} height={40} />
          <Box>
            <Skeleton variant='text' width={200} />
            <Skeleton variant='text' width={280} />
          </Box>
        </Stack>
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
  const categoryCount = Object.keys(catSummary.categories).length

  return (
    <Stack spacing={6}>
      {/* Header */}
      <Stack direction='row' justifyContent='space-between' alignItems='center'>
        <Stack direction='row' spacing={2} alignItems='center'>
          <Tooltip title='Volver a Admin'>
            <IconButton component={Link} href='/admin' color='secondary' size='small'>
              <i className='tabler-arrow-left' />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography variant='h5' fontWeight={600}>AI Tooling & Créditos</Typography>
            <Typography variant='body2' color='text.secondary'>
              Catálogo, licencias y créditos del ecosistema IA
            </Typography>
          </Box>
        </Stack>
        <Tooltip title='Actualizar datos'>
          <IconButton onClick={fetchData} color='primary' size='small'>
            <i className='tabler-refresh' />
          </IconButton>
        </Tooltip>
      </Stack>

      {error && (
        <Alert severity='error' variant='outlined' onClose={() => setError(null)}>
          <Typography variant='body2' fontWeight={500} sx={{ mb: 0.5 }}>No se pudieron cargar algunos datos</Typography>
          <Typography variant='caption' color='text.secondary'>{error}</Typography>
        </Alert>
      )}

      {/* KPIs */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Herramientas'
            stats={String(catSummary.total)}
            avatarIcon='tabler-tools'
            avatarColor='warning'
            trend='positive'
            trendNumber={String(catSummary.active)}
            subtitle={`activas · ${categoryCount} categorías`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Licencias'
            stats={String(licSummary.total)}
            avatarIcon='tabler-key'
            avatarColor='info'
            trend='positive'
            trendNumber={String(licSummary.active)}
            subtitle={`activas · ${licSummary.members} personas`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Wallets'
            stats={String(walSummary.totalWallets)}
            avatarIcon='tabler-wallet'
            avatarColor='primary'
            trend={walSummary.depletedWallets > 0 ? 'negative' : 'positive'}
            trendNumber={String(walSummary.activeWallets)}
            subtitle={`activos${walSummary.depletedWallets > 0 ? ` · ${walSummary.depletedWallets} agotados` : ''}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Créditos disponibles'
            stats={walSummary.totalCreditsAvailable.toLocaleString('es-CL')}
            avatarIcon='tabler-coins'
            avatarColor='success'
            trend='positive'
            trendNumber=''
            subtitle='Balance total sistema'
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <TabContext value={tab}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CustomTabList onChange={handleTabChange} variant='scrollable'>
            <Tab
              value='catalog'
              label={`Catálogo${catSummary.total > 0 ? ` (${catSummary.total})` : ''}`}
              icon={<i className='tabler-tools' />}
              iconPosition='start'
            />
            <Tab
              value='licenses'
              label={`Licencias${licSummary.total > 0 ? ` (${licSummary.total})` : ''}`}
              icon={<i className='tabler-key' />}
              iconPosition='start'
            />
            <Tab
              value='wallets'
              label={`Wallets${walSummary.totalWallets > 0 ? ` (${walSummary.totalWallets})` : ''}`}
              icon={<i className='tabler-wallet' />}
              iconPosition='start'
            />
            <Tab value='consumption' label='Consumo' icon={<i className='tabler-receipt' />} iconPosition='start' />
          </CustomTabList>
        </Card>

        <TabPanel value='catalog' sx={{ p: 0 }}>
          <AiCatalogTab
            tools={catalogData?.tools ?? []}
            providers={catalogData?.providers ?? []}
            meta={meta}
            onRefresh={fetchData}
          />
        </TabPanel>
        <TabPanel value='licenses' sx={{ p: 0 }}>
          <AiLicensesTab
            licenses={licensesData?.licenses ?? []}
            tools={catalogData?.tools ?? []}
            meta={meta}
            onRefresh={fetchData}
          />
        </TabPanel>
        <TabPanel value='wallets' sx={{ p: 0 }}>
          <AiWalletsTab
            wallets={walletsData?.wallets ?? []}
            tools={catalogData?.tools ?? []}
            meta={meta}
            onRefresh={fetchData}
          />
        </TabPanel>
        <TabPanel value='consumption' sx={{ p: 0 }}>
          <AiConsumptionTab meta={meta} />
        </TabPanel>
      </TabContext>
    </Stack>
  )
}

export default AiToolingDashboard
