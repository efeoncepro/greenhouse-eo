'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { visuallyHidden } from '@mui/utils'

import CustomAutocomplete from '@core/components/mui/Autocomplete'
import CustomTextField from '@core/components/mui/TextField'

import { GreenhouseChip } from '@/components/greenhouse/primitives'
import { GH_GROWTH_SEO_PERFORMANCE } from '@/lib/copy/growth'
import { formatInteger } from '@/lib/format'
import type { SeoPerformanceCatalogItem, SeoPerformanceMode } from '@/lib/growth/seo/contracts'

/**
 * TASK-1307 — el control que define QUÉ se compara.
 *
 * Es el primer control del orden de foco a propósito: en el concepto visual aprobado la
 * banda de KPI se lleva el peso visual, así que el selector tiene que ganar en jerarquía de
 * INTERACCIÓN lo que cede en jerarquía visual — si no, el operador ve números antes de
 * entender que él elige de qué son.
 *
 * ⚠️ El set NO vive en estado local: cada cambio empuja a la URL (`?urls=`/`?keywords=`).
 * Así el enlace es compartible, el back/forward del browser funciona y el servidor vuelve a
 * validar el `module_assignment` en cada cambio. Un `useState` rompería las tres cosas.
 *
 * ⚠️ Cambiar de modo LIMPIA el set: una URL no es una keyword, y arrastrar los ítems entre
 * ejes produciría un set que no matchea nada — un vacío que parecería un bug.
 */

export interface SeoSetSelectorProps {
  mode: SeoPerformanceMode
  items: string[]
  catalog: SeoPerformanceCatalogItem[]
  maxItems: number
  onModeChange: (mode: SeoPerformanceMode) => void
  onItemsChange: (items: string[]) => void
}

const SeoSetSelector = ({ mode, items, catalog, maxItems, onModeChange, onItemsChange }: SeoSetSelectorProps) => {
  const reachedMax = items.length >= maxItems
  const byItem = new Map(catalog.map(entry => [entry.item, entry]))

  return (
    <Card data-capture='seo-performance-set'>
      <CardContent>
        <Stack spacing={4}>
          <Typography variant='h6' component='h2'>
            {GH_GROWTH_SEO_PERFORMANCE.set.title}
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems={{ md: 'flex-start' }}>
            <Stack spacing={1}>
              <Typography variant='body2' color='text.secondary' id='seo-performance-mode-label'>
                {GH_GROWTH_SEO_PERFORMANCE.set.modeLabel}
              </Typography>
              <RadioGroup
                row
                aria-labelledby='seo-performance-mode-label'
                value={mode}
                onChange={event => onModeChange(event.target.value as SeoPerformanceMode)}
              >
                <FormControlLabel
                  value='url'
                  control={<Radio />}
                  label={GH_GROWTH_SEO_PERFORMANCE.set.modeByUrl}
                />
                <FormControlLabel
                  value='keyword'
                  control={<Radio />}
                  label={GH_GROWTH_SEO_PERFORMANCE.set.modeByKeyword}
                />
              </RadioGroup>
            </Stack>

            <CustomAutocomplete
              multiple
              disableCloseOnSelect
              options={catalog.map(entry => entry.item)}
              value={items}
              // El techo se aplica acá y no en el submit: deshabilitar las opciones extra
              // explica el límite en el momento de elegir, en vez de rechazar después.
              getOptionDisabled={(option: string) => reachedMax && !items.includes(option)}
              onChange={(_, value) => onItemsChange((value as string[]).slice(0, maxItems))}
              // Los chips los pinta el bloque de abajo con su propio `onDelete` accesible:
              // los tags por defecto del Autocomplete no exponen un aria-label por ítem.
              renderTags={() => null}
              sx={{ flex: 1, minInlineSize: 260 }}
              renderOption={(props, option: string) => {
                const entry = byItem.get(option)

                return (
                  <Box component='li' {...props} key={option}>
                    <Stack sx={{ inlineSize: '100%' }}>
                      <Typography variant='body2' noWrap>
                        {option}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {entry && entry.impressions > 0
                          ? GH_GROWTH_SEO_PERFORMANCE.set.impressionsHint.replace(
                              '{impressions}',
                              formatInteger(entry.impressions)
                            )
                          : GH_GROWTH_SEO_PERFORMANCE.set.noImpressionsHint}
                        {entry?.tracked ? ` · ${GH_GROWTH_SEO_PERFORMANCE.set.trackedBadge}` : ''}
                      </Typography>
                    </Stack>
                  </Box>
                )
              }}
              renderInput={params => (
                <CustomTextField
                  {...params}
                  label={GH_GROWTH_SEO_PERFORMANCE.set.picker}
                  placeholder={GH_GROWTH_SEO_PERFORMANCE.set.pickerPlaceholder}
                  helperText={
                    reachedMax
                      ? GH_GROWTH_SEO_PERFORMANCE.set.maxReached.replace('{max}', String(maxItems))
                      : mode === 'url'
                        ? GH_GROWTH_SEO_PERFORMANCE.set.pickerHelperUrl
                        : GH_GROWTH_SEO_PERFORMANCE.set.pickerHelperKeyword
                  }
                />
              )}
            />
          </Stack>

          {items.length > 0 ? (
            <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
              {items.map(item => {
                const entry = byItem.get(item)

                return (
                  <Tooltip
                    key={item}
                    title={entry?.tracked ? GH_GROWTH_SEO_PERFORMANCE.set.trackedHint : ''}
                    disableHoverListener={!entry?.tracked}
                  >
                    <span>
                      <GreenhouseChip
                        kind='metric'
                        variant='outlined'
                        size='small'
                        label={entry?.tracked ? `◑ ${item}` : item}
                        closable
                        // El botón de quitar dice QUÉ quita: "Quitar" a secas obliga al
                        // lector de pantalla a reconstruir el contexto desde la fila.
                        closeLabel={GH_GROWTH_SEO_PERFORMANCE.set.removeAria.replace('{item}', item)}
                        onDelete={() => onItemsChange(items.filter(current => current !== item))}
                      />
                    </span>
                  </Tooltip>
                )
              })}
            </Stack>
          ) : (
            <Typography variant='caption' color='text.secondary'>
              {GH_GROWTH_SEO_PERFORMANCE.set.max.replace('{max}', String(maxItems))}
            </Typography>
          )}

          {/* El cambio de set re-renderiza el chart entero: sin anuncio, quien navega por
              teclado no se entera de que la comparación cambió. */}
          <Box aria-live='polite' sx={visuallyHidden}>
            {GH_GROWTH_SEO_PERFORMANCE.set.liveRegion.replace('{count}', String(items.length))}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default SeoSetSelector
