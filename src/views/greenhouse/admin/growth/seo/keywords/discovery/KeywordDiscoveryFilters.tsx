'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import { GH_GROWTH_SEO_KEYWORDS } from '@/lib/copy/growth'
import {
  SEO_DISCOVERY_LINK_BARRIER_FILTER_LEVELS,
  SEO_DISCOVERY_METHODS
} from '@/lib/growth/seo/keyword-discovery/contracts'

import { countActiveKeywordDiscoveryFilters, type KeywordDiscoveryQuery } from './keyword-discovery-query'

/**
 * TASK-1693 Slice 3 — filtros del canvas de candidatos.
 *
 * 🔴 **Filtran SERVER-SIDE, no en cliente.** Filtrar la página cargada diría «3 candidatos»
 * mirando 50 filas cuando el universo filtrado tiene 40 repartidos en páginas que nadie trajo.
 * El conteo visible tiene que seguir a los filtros sobre el TOTAL — es la misma mentira por
 * omisión que TASK-1665 ya tuvo que mitigar una vez con el aviso de truncado.
 *
 * 🔴 **`maxDifficulty` no se ofrece.** `TASK-1694` lo declara no-op y lo reporta en
 * `ignoredFilters`: `keyword_difficulty` colapsa a 0 en SERPs es-LATAM (`ISSUE-152`), así que
 * filtrar por él devuelve barrera Alta a quien creyó pedir lo fácil. El control visible es
 * **Barrera de enlaces**, derivada del perfil real del top-10.
 *
 * Presentación: barra sobre la tabla en desktop y drawer tras `Filtros (N)` en 390px. Se
 * descartó el rail lateral que dibujaba el wireframe de `TASK-1665`: a 1440px conviviría con
 * una tabla de nueve columnas y con el sidecar de 460px del candidato, y el canvas de
 * comparación —que es la razón de ser de esta pantalla— quedaría sin ancho para comparar.
 */

export interface KeywordDiscoveryFiltersProps {
  query: KeywordDiscoveryQuery
  onChange: (next: Partial<KeywordDiscoveryQuery>) => void
  onClear: () => void
}

const SOURCE_LABEL: Record<string, string> = {
  keyword_suggestions: 'Sugerencias',
  related_keywords: 'Relacionadas',
  keyword_ideas: 'Ideas',
  keywords_for_site: 'Dominio'
}

const INTENT_LABEL: Record<string, string> = {
  informational: 'Informacional',
  navigational: 'Navegacional',
  commercial: 'Comercial',
  transactional: 'Transaccional'
}

const BARRIER_LABEL: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta'
}

const FiltersBody = ({ query, onChange, onClear }: KeywordDiscoveryFiltersProps) => {
  const copy = GH_GROWTH_SEO_KEYWORDS.discovery.results

  return (
    /*
     * Grilla y no un `Stack` en fila con `alignItems='flex-end'`.
     *
     * Con flex-end, el helper de «Barrera máxima» empujaba ese campo hacia arriba y las cuatro
     * etiquetas quedaban en tres líneas base distintas — una barra de filtros desalineada se lee
     * como pantalla sin terminar, justo encima del canvas donde se decide el gasto. La grilla da
     * a cada campo la misma altura de fila y las etiquetas alinean por construcción.
     */
    <Stack spacing={4}>
      <Box
        sx={{
          display: 'grid',
          gap: 4,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(auto-fit, minmax(180px, 1fr))' },
          alignItems: 'start'
        }}
      >
      <CustomTextField
        label={copy.filterSearch}
        value={query.q}
        onChange={event => onChange({ q: event.target.value })}
        sx={{ minInlineSize: { md: 200 } }}
      />

      <CustomTextField
        select
        label={copy.filterSource}
        value={query.source}
        onChange={event => onChange({ source: event.target.value as KeywordDiscoveryQuery['source'] })}
        sx={{ minInlineSize: { md: 160 } }}
      >
        <MenuItem value='all'>{copy.filterAll}</MenuItem>
        {SEO_DISCOVERY_METHODS.map(method => (
          <MenuItem key={method} value={method}>
            {SOURCE_LABEL[method] ?? method}
          </MenuItem>
        ))}
      </CustomTextField>

      <CustomTextField
        select
        label={copy.filterIntent}
        value={query.intent}
        onChange={event => onChange({ intent: event.target.value as KeywordDiscoveryQuery['intent'] })}
        sx={{ minInlineSize: { md: 160 } }}
      >
        <MenuItem value='all'>{copy.filterAll}</MenuItem>
        {Object.entries(INTENT_LABEL).map(([value, label]) => (
          <MenuItem key={value} value={value}>
            {label}
          </MenuItem>
        ))}
      </CustomTextField>

      {/* El filtro canónico de dificultad. NUNCA `maxDifficulty`. */}
      <CustomTextField
        select
        label={copy.filterBarrier}
        value={query.maxLinkBarrier}
        onChange={event =>
          onChange({ maxLinkBarrier: event.target.value as KeywordDiscoveryQuery['maxLinkBarrier'] })
        }
        helperText={copy.filterBarrierHelper}
        sx={{ minInlineSize: { md: 180 } }}
      >
        <MenuItem value='all'>{copy.filterAll}</MenuItem>
        {SEO_DISCOVERY_LINK_BARRIER_FILTER_LEVELS.map(level => (
          <MenuItem key={level} value={level}>
            {BARRIER_LABEL[level]}
          </MenuItem>
        ))}
      </CustomTextField>

      <CustomTextField
        label={copy.filterMinVolume}
        type='number'
        value={query.minVolume === null ? '' : String(query.minVolume)}
        onChange={event => {
          const parsed = Number.parseInt(event.target.value, 10)

          onChange({ minVolume: Number.isFinite(parsed) && parsed > 0 ? parsed : null })
        }}
        sx={{ minInlineSize: { md: 140 } }}
      />

      </Box>

      {/* Segunda fila: los dos interruptores y la salida. Separarlos de los campos evita que
          «Limpiar filtros» quede alineado con un checkbox deshabilitado, que se leía como si
          fueran el mismo control. */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={4}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        flexWrap='wrap'
        useFlexGap
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={query.state === 'untracked'}
              onChange={event => onChange({ state: event.target.checked ? 'untracked' : 'all' })}
            />
          }
          label={copy.filterStateUntracked}
        />

        {/* «Sin dato» no es «Baja»: sólo entra si el operador lo pide explícitamente. */}
        <FormControlLabel
          control={
            <Checkbox
              checked={query.includeUnknownBarrier}
              disabled={query.maxLinkBarrier === 'all'}
              onChange={event => onChange({ includeUnknownBarrier: event.target.checked })}
            />
          }
          label={copy.filterIncludeUnknownBarrier}
        />

        <Button variant='text' onClick={onClear} sx={{ marginInlineStart: { sm: 'auto' } }}>
          {copy.clearFilters}
        </Button>
      </Stack>
    </Stack>
  )
}

const KeywordDiscoveryFilters = (props: KeywordDiscoveryFiltersProps) => {
  const copy = GH_GROWTH_SEO_KEYWORDS.discovery.results
  const [drawerOpen, setDrawerOpen] = useState(false)
  const activeCount = countActiveKeywordDiscoveryFilters(props.query)

  return (
    <Box data-capture='seo-keyword-discovery-filters'>
      {/* Desktop: barra visible. Se alterna por CSS y no por `useMediaQuery`, mismo motivo que
          la tabla/card list — cambiar el árbol React según el ancho reintrodujo mismatch de
          hidratación en esta superficie. */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <FiltersBody {...props} />
      </Box>

      {/* 390px: el conteo activo es visible en el propio botón, así que el operador sabe que hay
          filtros puestos sin abrir nada. */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Button variant='outlined' onClick={() => setDrawerOpen(true)} fullWidth>
          {activeCount > 0 ? copy.filtersOpen.replace('{count}', String(activeCount)) : copy.filtersOpenNone}
        </Button>

        <Drawer anchor='bottom' open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Box sx={{ padding: 5 }}>
            <Typography variant='h6' component='h3' sx={{ marginBlockEnd: 3 }}>
              {copy.filtersLabel}
            </Typography>

            <FiltersBody {...props} />

            <Button variant='contained' fullWidth sx={{ marginBlockStart: 4 }} onClick={() => setDrawerOpen(false)}>
              {copy.filtersClose}
            </Button>
          </Box>
        </Drawer>
      </Box>
    </Box>
  )
}

export default KeywordDiscoveryFilters
