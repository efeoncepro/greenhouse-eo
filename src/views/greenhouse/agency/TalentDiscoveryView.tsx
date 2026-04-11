'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import BrandLogo from '@/components/greenhouse/BrandLogo'
import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_TALENT_DISCOVERY } from '@/config/greenhouse-nomenclature'

import type { SkillCatalogItem } from '@/types/agency-skills'
import type { ToolCatalogItem } from '@/types/talent-taxonomy'

/* ─── Types (aligned to backend TalentDiscoveryResult / TalentDiscoverySummary) ─── */

interface TopSkill {
  skillName: string
  seniorityLevel: string
  verified: boolean
}

interface TopTool {
  toolName: string
  iconKey: string | null
  verified: boolean
}

interface TopLanguage {
  languageName: string
  proficiencyLevel: string
}

interface TalentDiscoveryItem {
  memberId: string
  displayName: string
  avatarUrl: string | null
  headline: string | null
  roleTitle: string | null
  locationCity: string | null
  locationCountry: string | null
  skillCount: number
  verifiedSkillCount: number
  toolCount: number
  certificationCount: number
  activeCertCount: number
  languageCount: number
  commercialAvailabilityHours: number | null
  utilizationPercent: number | null
  capacityHealth: string | null
  topSkills: TopSkill[]
  topTools: TopTool[]
  topLanguages: TopLanguage[]
  discoveryScore: number
}

interface TalentDiscoverySummary {
  totalMembers: number
  membersWithSkills: number
  membersWithVerifiedItems: number
  topSkillCategories: Array<{ category: string; count: number }>
  averageAvailabilityHours: number | null
}

type SortOption = 'relevance' | 'availability' | 'verified_count'
type VerificationFilter = 'all' | 'verified_only' | 'has_verified'

const CAPACITY_HEALTH_COLOR: Record<string, 'success' | 'warning' | 'error'> = {
  idle: 'success',
  balanced: 'success',
  high: 'warning',
  overloaded: 'error'
}

const CAPACITY_HEALTH_LABEL: Record<string, string> = {
  idle: 'Baja carga',
  balanced: 'Equilibrado',
  high: 'Alta carga',
  overloaded: 'Sobrecargado'
}

/* ─── Component ─── */

const TalentDiscoveryView = () => {
  // Data state
  const [results, setResults] = useState<TalentDiscoveryItem[]>([])
  const [summary, setSummary] = useState<TalentDiscoverySummary | null>(null)
  const [skillCatalog, setSkillCatalog] = useState<SkillCatalogItem[]>([])
  const [toolCatalog, setToolCatalog] = useState<ToolCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<SkillCatalogItem[]>([])
  const [selectedTools, setSelectedTools] = useState<ToolCatalogItem[]>([])
  const [verification, setVerification] = useState<VerificationFilter>('all')
  const [sort, setSort] = useState<SortOption>('relevance')

  // Debounce search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setSearchDebounced(search), 300)

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [search])

  // Load catalogs on mount
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [skillsRes, toolsRes] = await Promise.all([
          fetch('/api/agency/skills?activeOnly=true', { cache: 'no-store' }),
          fetch('/api/my/tools', { cache: 'no-store' })
        ])

        if (skillsRes.ok) {
          const skillsData = await skillsRes.json()

          setSkillCatalog(skillsData.items || [])
        }

        if (toolsRes.ok) {
          const toolsData = await toolsRes.json()

          setToolCatalog(toolsData.catalog || [])
        }
      } catch {
        // Catalogs are optional for filter dropdowns; proceed without them
      }
    }

    loadCatalogs()
  }, [])

  // Load discovery results
  const loadResults = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      if (searchDebounced) params.set('q', searchDebounced)
      if (selectedSkills.length > 0) params.set('skills', selectedSkills.map(s => s.skillCode).join(','))
      if (selectedTools.length > 0) params.set('tools', selectedTools.map(t => t.toolCode).join(','))
      if (verification !== 'all') params.set('verification', verification)
      if (sort !== 'relevance') params.set('sortBy', sort)

      const res = await fetch(`/api/agency/talent-discovery?${params}`, { cache: 'no-store' })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()

      setResults(data.items || [])
      setSummary(data.summary || null)
    } catch {
      setError(GH_TALENT_DISCOVERY.error_message)
      setResults([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [searchDebounced, selectedSkills, selectedTools, verification, sort])

  useEffect(() => {
    loadResults()
  }, [loadResults])

  // Summary KPIs
  const kpis = useMemo(
    () => [
      {
        title: GH_TALENT_DISCOVERY.summary_total,
        stats: String(summary?.totalMembers ?? 0),
        subtitle: 'En el directorio',
        avatarIcon: 'tabler-users',
        avatarColor: 'info' as const
      },
      {
        title: GH_TALENT_DISCOVERY.summary_verified,
        stats: String(summary?.membersWithVerifiedItems ?? 0),
        subtitle: 'Al menos 1 item verificado',
        avatarIcon: 'tabler-rosette-discount-check',
        avatarColor: 'success' as const
      },
      {
        title: GH_TALENT_DISCOVERY.summary_availability,
        stats: summary?.averageAvailabilityHours != null ? `${Math.round(summary.averageAvailabilityHours)}h` : '—',
        subtitle: 'Promedio semanal',
        avatarIcon: 'tabler-clock',
        avatarColor: 'warning' as const
      },
      {
        title: GH_TALENT_DISCOVERY.summary_categories,
        stats: String(summary?.topSkillCategories?.length ?? 0),
        subtitle: 'Áreas de expertise',
        avatarIcon: 'tabler-category',
        avatarColor: 'primary' as const
      }
    ],
    [summary]
  )

  return (
    <Grid container spacing={6}>
      {/* ── Page header ── */}
      <Grid size={{ xs: 12 }}>
        <Box>
          <Typography variant='h4' sx={{ mb: 0.5 }}>
            {GH_TALENT_DISCOVERY.page_title}
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            {GH_TALENT_DISCOVERY.page_subtitle}
          </Typography>
        </Box>
      </Grid>

      {/* ── Summary KPIs ── */}
      {kpis.map((kpi, i) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
          <HorizontalWithSubtitle {...kpi} />
        </Grid>
      ))}

      {/* ── Filter bar ── */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardContent>
            <Grid container spacing={4} alignItems='center'>
              {/* Search */}
              <Grid size={{ xs: 12, md: 4 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  placeholder={GH_TALENT_DISCOVERY.search_placeholder}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position='start'>
                          <i className='tabler-search' style={{ fontSize: 18 }} />
                        </InputAdornment>
                      )
                    }
                  }}
                  aria-label={GH_TALENT_DISCOVERY.search_placeholder}
                />
              </Grid>

              {/* Skills filter */}
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <Autocomplete
                  multiple
                  size='small'
                  options={skillCatalog}
                  getOptionLabel={option => option.skillName}
                  value={selectedSkills}
                  onChange={(_, value) => setSelectedSkills(value)}
                  renderInput={params => (
                    <CustomTextField {...params} label={GH_TALENT_DISCOVERY.filter_skills} />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index })

                      return (
                        <CustomChip
                          key={key}
                          size='small'
                          round='true'
                          variant='tonal'
                          color='primary'
                          label={option.skillName}
                          {...tagProps}
                        />
                      )
                    })
                  }
                  limitTags={1}
                />
              </Grid>

              {/* Tools filter */}
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <Autocomplete
                  multiple
                  size='small'
                  options={toolCatalog}
                  getOptionLabel={option => option.toolName}
                  value={selectedTools}
                  onChange={(_, value) => setSelectedTools(value)}
                  renderOption={(props, option) => {
                    const { key, ...rest } = props

                    return (
                      <li key={key} {...rest}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {option.iconKey ? (
                            <BrandLogo brand={option.iconKey} size={22} />
                          ) : (
                            <i className='tabler-tool' style={{ fontSize: 16 }} />
                          )}
                          <Typography variant='body2'>{option.toolName}</Typography>
                        </Box>
                      </li>
                    )
                  }}
                  renderInput={params => (
                    <CustomTextField {...params} label={GH_TALENT_DISCOVERY.filter_tools} />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index })

                      return (
                        <CustomChip
                          key={key}
                          size='small'
                          round='true'
                          variant='tonal'
                          color='info'
                          label={option.toolName}
                          {...tagProps}
                        />
                      )
                    })
                  }
                  limitTags={1}
                />
              </Grid>

              {/* Verification filter */}
              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label={GH_TALENT_DISCOVERY.filter_verification}
                  value={verification}
                  onChange={e => setVerification(e.target.value as VerificationFilter)}
                >
                  <MenuItem value='all'>{GH_TALENT_DISCOVERY.verification_all}</MenuItem>
                  <MenuItem value='verified_only'>{GH_TALENT_DISCOVERY.verification_only_verified}</MenuItem>
                  <MenuItem value='has_verified'>{GH_TALENT_DISCOVERY.verification_with_verifications}</MenuItem>
                </CustomTextField>
              </Grid>

              {/* Sort */}
              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label={GH_TALENT_DISCOVERY.filter_sort}
                  value={sort}
                  onChange={e => setSort(e.target.value as SortOption)}
                >
                  <MenuItem value='relevance'>{GH_TALENT_DISCOVERY.sort_relevance}</MenuItem>
                  <MenuItem value='availability'>{GH_TALENT_DISCOVERY.sort_availability}</MenuItem>
                  <MenuItem value='verified_count'>{GH_TALENT_DISCOVERY.sort_verified}</MenuItem>
                </CustomTextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* ── Loading indicator ── */}
      {loading && (
        <Grid size={{ xs: 12 }}>
          <LinearProgress aria-label={GH_TALENT_DISCOVERY.loading} />
        </Grid>
      )}

      {/* ── Error state ── */}
      {error && !loading && (
        <Grid size={{ xs: 12 }}>
          <Alert
            severity='error'
            action={
              <Button color='inherit' size='small' onClick={loadResults}>
                Reintentar
              </Button>
            }
          >
            {error}
          </Alert>
        </Grid>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && results.length === 0 && (
        <Grid size={{ xs: 12 }}>
          <EmptyState
            icon='tabler-user-search'
            title={GH_TALENT_DISCOVERY.empty_title}
            description={GH_TALENT_DISCOVERY.empty_description}
          />
        </Grid>
      )}

      {/* ── Results grid ── */}
      {!loading &&
        !error &&
        results.map(person => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={person.memberId}>
            <TalentCard person={person} />
          </Grid>
        ))}
    </Grid>
  )
}

/* ─── Talent Card ─── */

function TalentCard({ person }: { person: TalentDiscoveryItem }) {
  const topSkills = person.topSkills.slice(0, 4)
  const topTools = person.topTools.slice(0, 4)
  const topLanguages = person.topLanguages.slice(0, 3)
  const hasCapacity = person.capacityHealth != null && person.commercialAvailabilityHours != null

  return (
    <Card
      elevation={0}
      sx={{
        border: theme => `1px solid ${theme.palette.divider}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': { boxShadow: theme => theme.shadows[4] },
        transition: 'box-shadow 0.2s ease-in-out'
      }}
      component='article'
      aria-label={`${person.displayName}: score ${person.discoveryScore}, ${person.skillCount} skills, ${person.verifiedSkillCount} verificadas`}
    >
      <CardContent sx={{ flex: 1 }}>
        <Stack spacing={2.5}>
          {/* ── Identity row ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CustomAvatar
              src={person.avatarUrl || undefined}
              alt={person.displayName}
              size={48}
              skin='light'
              color='primary'
            >
              {getInitials(person.displayName)}
            </CustomAvatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant='subtitle1' fontWeight={600} noWrap>
                {person.displayName}
              </Typography>
              {person.headline && (
                <Typography variant='caption' color='text.secondary' noWrap>
                  {person.headline}
                </Typography>
              )}
              {(person.locationCity || person.locationCountry) && (
                <Typography variant='caption' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <i className='tabler-map-pin' style={{ fontSize: 12 }} aria-hidden='true' />
                  {[person.locationCity, person.locationCountry].filter(Boolean).join(', ')}
                </Typography>
              )}
            </Box>

            {/* ── Discovery score ── */}
            <Tooltip title={`${GH_TALENT_DISCOVERY.score_label}: ${person.discoveryScore}/100`}>
              <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                <CircularProgress
                  variant='determinate'
                  value={person.discoveryScore}
                  size={44}
                  thickness={4}
                  color={person.discoveryScore >= 70 ? 'success' : person.discoveryScore >= 40 ? 'warning' : 'error'}
                  aria-hidden='true'
                />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant='caption' fontWeight={700} sx={{ fontSize: '0.65rem' }}>
                    {person.discoveryScore}
                  </Typography>
                </Box>
              </Box>
            </Tooltip>
          </Box>

          {/* ── Skills ── */}
          {topSkills.length > 0 && (
            <Box>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                <i className='tabler-star' style={{ fontSize: 14 }} aria-hidden='true' />
                {GH_TALENT_DISCOVERY.card_skills}
                {person.skillCount > 4 && ` (${person.skillCount})`}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {topSkills.map(skill => (
                  <CustomChip
                    key={skill.skillName}
                    size='small'
                    round='true'
                    variant='tonal'
                    color={skill.verified ? 'success' : 'secondary'}
                    label={
                      <Box component='span' sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        {skill.verified && (
                          <i className='tabler-check' style={{ fontSize: 12 }} aria-label='Verificada' />
                        )}
                        {skill.skillName}
                      </Box>
                    }
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* ── Tools ── */}
          {topTools.length > 0 && (
            <Box>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                <i className='tabler-tool' style={{ fontSize: 14 }} aria-hidden='true' />
                {GH_TALENT_DISCOVERY.card_tools}
                {person.toolCount > 4 && ` (${person.toolCount})`}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {topTools.map(tool => (
                  <CustomChip
                    key={tool.toolName}
                    size='small'
                    round='true'
                    variant='tonal'
                    color='info'
                    label={
                      <Box component='span' sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        {tool.iconKey && <BrandLogo brand={tool.iconKey} size={16} />}
                        {tool.toolName}
                      </Box>
                    }
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* ── Languages ── */}
          {topLanguages.length > 0 && (
            <Box>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <i className='tabler-language' style={{ fontSize: 14 }} aria-hidden='true' />
                {GH_TALENT_DISCOVERY.card_languages}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {topLanguages.map(l => `${l.languageName} (${l.proficiencyLevel})`).join(' · ')}
              </Typography>
            </Box>
          )}

          {/* ── Bottom row: certifications count + availability ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            {person.certificationCount > 0 && (
              <Typography variant='caption' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <i className='tabler-certificate-2' style={{ fontSize: 14 }} aria-hidden='true' />
                {person.certificationCount} {GH_TALENT_DISCOVERY.card_certifications}
              </Typography>
            )}

            {hasCapacity && (
              <CustomChip
                size='small'
                round='true'
                variant='tonal'
                color={CAPACITY_HEALTH_COLOR[person.capacityHealth!] || 'secondary'}
                icon={<i className='tabler-clock' style={{ fontSize: 14 }} />}
                label={`${Math.round(person.commercialAvailabilityHours!)}h ${GH_TALENT_DISCOVERY.card_available}`}
                aria-label={`${CAPACITY_HEALTH_LABEL[person.capacityHealth!] || ''}: ${Math.round(person.commercialAvailabilityHours!)} horas ${GH_TALENT_DISCOVERY.card_available}`}
              />
            )}
          </Box>
        </Stack>
      </CardContent>

      <CardActions sx={{ px: 3, pb: 2.5, pt: 0 }}>
        <Button
          component={Link}
          href={`/people/${person.memberId}`}
          size='small'
          variant='outlined'
          startIcon={<i className='tabler-user' style={{ fontSize: 16 }} />}
          fullWidth
        >
          {GH_TALENT_DISCOVERY.card_view_profile}
        </Button>
      </CardActions>
    </Card>
  )
}

/* ─── Helpers ─── */

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('')
}

export default TalentDiscoveryView
