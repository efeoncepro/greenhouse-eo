'use client'

import { useMemo, useState } from 'react'

import Card from '@mui/material/Card'
import Checkbox from '@mui/material/Checkbox'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Divider from '@mui/material/Divider'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'
import TableSortLabel from '@mui/material/TableSortLabel'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import DataTableShell from '@/components/greenhouse/data-table/DataTableShell'
import { GreenhouseAsyncActionButton, GreenhouseChip } from '@/components/greenhouse/primitives'
import type { GreenhouseAsyncActionState } from '@/components/greenhouse/primitives/GreenhouseAsyncActionButton'
import { GH_GROWTH_SEO_KEYWORDS } from '@/lib/copy/growth'
import { formatInteger } from '@/lib/format'
import type { KeywordOpportunity } from '@/lib/growth/seo/contracts'

import { resolveKeywordAction, type KeywordAction } from './keyword-opportunity-action'

/**
 * TASK-1308 — el detalle exacto, y a la vez el **fallback de accesibilidad permanente** del
 * mapa: un chart nunca puede ser la única forma de leer el dato (dataviz-design). No es un
 * toggle — está siempre presente, con los mismos valores y la etiqueta de acción en TEXTO,
 * que es lo que sostiene el contrato color-independiente del scatter.
 *
 * `DataTableShell` es obligatorio (regla dura de UI Platform: >6 columnas + orden + acción
 * embebida). Aporta lo que un `<Table>` crudo no: densidad resuelta por el ANCHO REAL del
 * contenedor y scroll horizontal interno, para que la tabla densa nunca empuje el ancho de
 * la página en 390px.
 *
 * ⚠️ VOLUMEN Y DIFICULTAD DE MERCADO NO VAN EN 0 NI EN GUION. El reader los devuelve `null`
 * (`market: 'unavailable'` hasta TASK-1300) y la celda dice "Sin dato de mercado" con su
 * explicación: un 0 afirmaría que nadie busca eso, y un guion es ambiguo entre "no hay" y
 * "no lo pedimos". Cuando el enriquecimiento aterrice, la MISMA celda pinta el número real
 * sin tocar este componente.
 */

type SortColumn = 'keyword' | 'position' | 'impressions' | 'clicks' | 'ctr' | 'gain'
type SortDirection = 'asc' | 'desc'

/**
 * 25 por defecto, no 10.
 *
 * La lista está ORDENADA POR GANANCIA: la primera página tiene que contener toda la cabeza
 * accionable, no cortarla en el ítem 10 y esconder el resto detrás de un click. 25 cubre la
 * mitad del techo del reader (50) y deja la cola a una página de distancia.
 */
const DEFAULT_ROWS_PER_PAGE = 25
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50]
const ROWS_PER_PAGE_SELECT_ID = 'seo-keywords-rows-per-page'

export interface KeywordOpportunityTableProps {
  opportunities: KeywordOpportunity[]
  trackedKeywords: Set<string>
  /** `false` oculta la acción entera: ver el mapa y comprometer gasto son dos permisos. */
  canTrack: boolean
  /** El set llegó a su techo: el botón se deshabilita con el motivo a la vista. */
  atCapacity: boolean
  trackingState: Record<string, GreenhouseAsyncActionState>
  onTrack: (keyword: string) => void
  onUntrack: (keyword: string) => void
  /** Drill a Rendimiento con esa keyword aislada — el puente al nodo S2 del flujo. */
  onDrill: (keyword: string) => void
  selected: Set<string>
  onToggleSelected: (keyword: string) => void
  onSelectPage: (keywords: string[], select: boolean) => void
  /** Keyword bajo el cursor en el mapa: la fila correspondiente se resalta. */
  /**
   * Sin dato de mercado, las columnas de volumen y dificultad NO SE RENDERIZAN.
   *
   * ⚠️ No es esconder la degradación: la ausencia ya está dicha al pie del mapa, una vez y
   * con sus palabras. Lo que hacían era repetir "Sin dato" 50 veces (dos columnas × 25
   * filas) mientras empujaban la acción primaria fuera de la pantalla — el GVC mostró
   * "Dejar de segu…" cortado. Una columna que no puede tener datos no gana su ancho.
   * Cuando TASK-1300 aterrice vuelven solas.
   */
  marketUnavailable: boolean
  hoveredKeyword: string | null
  onHoverKeyword: (keyword: string | null) => void
  onTrackSelected: () => void
  onClearSelection: () => void
  bulkState: GreenhouseAsyncActionState
}

const KeywordOpportunityTable = ({
  opportunities,
  trackedKeywords,
  canTrack,
  atCapacity,
  trackingState,
  onTrack,
  onUntrack,
  onDrill,
  selected,
  onToggleSelected,
  onSelectPage,
  marketUnavailable,
  hoveredKeyword,
  onHoverKeyword,
  onTrackSelected,
  onClearSelection,
  bulkState
}: KeywordOpportunityTableProps) => {
  const copy = GH_GROWTH_SEO_KEYWORDS

  // Default: la mayor ganancia estimada arriba. Es la pregunta con la que el operador llega
  // ("¿qué persigo primero?"), y el score del reader ya está en clics, no en un índice.
  const [sortColumn, setSortColumn] = useState<SortColumn>('gain')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE)

  const actionLabel: Record<KeywordAction, string> = {
    quickWin: copy.action.quickWinShort,
    striking: copy.action.strikingShort,
    cannibalized: copy.action.cannibalizedShort
  }

  const actionHint: Record<KeywordAction, string> = {
    quickWin: copy.action.quickWinHint,
    striking: copy.action.strikingHint,
    cannibalized: copy.action.cannibalizedHint
  }

  const sorted = useMemo(() => {
    const rows = [...opportunities]

    rows.sort((a, b) => {
      const factor = sortDirection === 'asc' ? 1 : -1

      switch (sortColumn) {
        case 'keyword':
          return factor * a.keyword.localeCompare(b.keyword)
        case 'position':
          return factor * (a.position - b.position)
        case 'impressions':
          return factor * (a.impressions - b.impressions)
        case 'clicks':
          return factor * (a.clicks - b.clicks)
        case 'ctr':
          return factor * (a.ctr - b.ctr)
        case 'gain':
        default:
          return factor * (a.estimatedClickGain - b.estimatedClickGain)
      }
    })

    return rows
  }, [opportunities, sortColumn, sortDirection])

  /**
   * Página ACOTADA, no reseteada por efecto.
   *
   * Los filtros de arriba cambian el total en cualquier momento: filtrar estando en la
   * página 3 dejaría al operador mirando una tabla vacía que parece un bug. Derivar la
   * página válida del total actual lo resuelve sin un `useEffect` que corra un render tarde
   * — y sin perder la página cuando el filtro no achica lo suficiente como para invalidarla.
   */
  const lastPage = Math.max(0, Math.ceil(sorted.length / rowsPerPage) - 1)
  const safePage = Math.min(page, lastPage)

  const visible = useMemo(
    () => sorted.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage),
    [sorted, safePage, rowsPerPage]
  )

  /** Lo seguible de la página vigente: ni lo ya seguido ni nada fuera de la página. */
  const selectablePage = useMemo(
    () => visible.filter(row => !trackedKeywords.has(row.keyword)).map(row => row.keyword),
    [visible, trackedKeywords]
  )

  const toggleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(current => (current === 'asc' ? 'desc' : 'asc'))

      return
    }

    setSortColumn(column)
    // Texto asciende A→Z; los números arrancan por el "mejor", que en posición es el menor
    // y en demanda/ganancia es el mayor.
    setSortDirection(column === 'keyword' || column === 'position' ? 'asc' : 'desc')
  }

  const ariaSort = (column: SortColumn): 'ascending' | 'descending' | 'none' =>
    sortColumn === column ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'

  const sortLabel = (column: SortColumn, label: string, align: 'left' | 'right' = 'right') => (
    <TableSortLabel
      active={sortColumn === column}
      direction={sortColumn === column ? sortDirection : 'asc'}
      onClick={() => toggleSort(column)}
      sx={{ flexDirection: align === 'right' ? 'row-reverse' : 'row' }}
    >
      {label}
    </TableSortLabel>
  )

  /** Celda de mercado: el estado honesto de un dato que todavía no existe. */
  const marketCell = (value: number | null) =>
    value === null ? (
      <Tooltip title={copy.table.marketUnavailableHint}>
        <Typography variant='caption' color='text.secondary'>
          {copy.table.marketUnavailable}
        </Typography>
      </Tooltip>
    ) : (
      formatInteger(value)
    )

  return (
    <Card data-capture='seo-keywords-table'>
      <CardContent>
        <Stack spacing={4}>
          <Stack spacing={1}>
            <Typography variant='h5' component='h2'>
              {copy.table.title}
            </Typography>
            {/* El criterio de orden, dicho: sin esto la primera página parece arbitraria. */}
            <Typography variant='caption' color='text.secondary'>
              {copy.table.sortedByGain}
            </Typography>
          </Stack>

          {canTrack && selected.size > 0 ? (
            // Barra de lote: aparece sólo con selección. Con 42 candidatas de consolidación
            // y 25 por página, seguirlas de a una son decenas de clicks.
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={3}
              alignItems={{ sm: 'center' }}
              role='status'
              data-capture='seo-keywords-bulk'
            >
              <Typography variant='body2' fontWeight={600}>
                {copy.follow.bulkSelected.replace('{count}', String(selected.size))}
              </Typography>
              <GreenhouseAsyncActionButton
                size='small'
                greenhouseVariant='solid'
                state={bulkState}
                disabled={atCapacity || bulkState === 'loading'}
                onClick={onTrackSelected}
              >
                {copy.follow.bulkTrack}
              </GreenhouseAsyncActionButton>
              <Button size='small' variant='text' onClick={onClearSelection}>
                {copy.follow.bulkClear}
              </Button>
            </Stack>
          ) : null}

          <DataTableShell identifier='seo-keyword-opportunities' ariaLabel={copy.table.ariaLabel} stickyFirstColumn>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  {canTrack ? (
                    <TableCell padding='checkbox'>
                      <Checkbox
                        size='small'
                        inputProps={{ 'aria-label': copy.follow.bulkSelectAll }}
                        // Sólo cuenta lo SEGUIBLE de la página: marcar "todas" no puede
                        // prometer incluir las que ya se siguen.
                        checked={selectablePage.length > 0 && selectablePage.every(k => selected.has(k))}
                        indeterminate={
                          selectablePage.some(k => selected.has(k)) && !selectablePage.every(k => selected.has(k))
                        }
                        onChange={event => onSelectPage(selectablePage, event.target.checked)}
                        disabled={selectablePage.length === 0}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell aria-sort={ariaSort('keyword')}>
                    {sortLabel('keyword', copy.table.colKeyword, 'left')}
                  </TableCell>
                  <TableCell>{copy.action.label}</TableCell>
                  <TableCell align='right' aria-sort={ariaSort('position')}>
                    <Tooltip title={copy.table.colPositionHint}>
                      <span>{sortLabel('position', copy.table.colPosition)}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align='right' aria-sort={ariaSort('impressions')}>
                    <Tooltip title={copy.table.colImpressionsHint}>
                      <span>{sortLabel('impressions', copy.table.colImpressions)}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align='right' aria-sort={ariaSort('clicks')}>
                    {sortLabel('clicks', copy.table.colClicks)}
                  </TableCell>
                  <TableCell align='right' aria-sort={ariaSort('ctr')}>
                    {sortLabel('ctr', copy.table.colCtr)}
                  </TableCell>
                  <TableCell align='right' aria-sort={ariaSort('gain')}>
                    <Tooltip title={copy.table.colGainHint}>
                      <span>{sortLabel('gain', copy.table.colGain)}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align='right'>
                    <Tooltip title={copy.table.colConflictHint}>
                      <span>{copy.table.colConflict}</span>
                    </Tooltip>
                  </TableCell>
                  {marketUnavailable ? null : (
                    <>
                      <TableCell align='right'>{copy.table.colVolume}</TableCell>
                      <TableCell align='right'>{copy.table.colDifficulty}</TableCell>
                    </>
                  )}
                  {canTrack ? <TableCell align='right'>{copy.follow.cta}</TableCell> : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map(row => {
                  const action = resolveKeywordAction(row)
                  const isTracked = trackedKeywords.has(row.keyword)
                  const state = trackingState[row.keyword] ?? 'idle'

                  return (
                    <TableRow
                      key={row.keyword}
                      hover
                      // Sincronía con el mapa: el punto bajo el cursor resalta su fila.
                      selected={hoveredKeyword === row.keyword}
                      onMouseEnter={() => onHoverKeyword(row.keyword)}
                      onMouseLeave={() => onHoverKeyword(null)}
                    >
                      {canTrack ? (
                        <TableCell padding='checkbox'>
                          <Checkbox
                            size='small'
                            checked={selected.has(row.keyword)}
                            onChange={() => onToggleSelected(row.keyword)}
                            disabled={isTracked}
                            inputProps={{ 'aria-label': copy.follow.bulkAria.replace('{keyword}', row.keyword) }}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell sx={{ maxInlineSize: 260 }}>
                        <Stack spacing={0.5}>
                          {/* La keyword es el puente al nodo S2 del flujo: lleva a Rendimiento
                              con esa serie aislada. Antes la tabla no llevaba a ningún lado —
                              seguías una keyword y no había camino para ir a verla. */}
                          <Link
                            component='button'
                            type='button'
                            variant='body2'
                            underline='hover'
                            onClick={() => onDrill(row.keyword)}
                            aria-label={copy.table.drillAria.replace('{keyword}', row.keyword)}
                            // 24px de alto mínimo: como texto plano medían 21px y fallaban
                            // el target-size de WCAG 2.5.8 (hallazgo de axe, 50 nodos).
                            sx={{
                              textAlign: 'start',
                              maxInlineSize: '100%',
                              minBlockSize: 24,
                              display: 'flex',
                              alignItems: 'center',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={row.keyword}
                          >
                            {row.keyword}
                          </Link>
                          {/* La página que rankea hoy, abrible: para consolidar hay que verla. */}
                          <Link
                            href={row.page}
                            target='_blank'
                            rel='noopener noreferrer'
                            variant='caption'
                            color='text.secondary'
                            underline='hover'
                            noWrap
                            title={`${copy.table.openPage} — ${row.page}`}
                            sx={{ display: 'flex', alignItems: 'center', minBlockSize: 24, maxInlineSize: '100%' }}
                          >
                            {row.page}
                          </Link>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {/* La acción en TEXTO: es lo que hace que el color del mapa nunca
                            sea el único encoding (WCAG 1.4.1). */}
                        <Tooltip title={actionHint[action]}>
                          <span>
                            <GreenhouseChip
                              kind='status'
                              variant='label'
                              size='small'
                              label={actionLabel[action]}
                            />
                          </span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {row.position.toFixed(1)}
                      </TableCell>
                      <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatInteger(row.impressions)}
                      </TableCell>
                      <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatInteger(row.clicks)}
                      </TableCell>
                      <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {`${(row.ctr * 100).toFixed(2)}%`}
                      </TableCell>
                      <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {row.estimatedClickGain > 0 ? (
                          copy.table.gainUnit.replace('{value}', formatInteger(row.estimatedClickGain))
                        ) : (
                          // Cero ganancia no es "sin dato": es una medición con significado.
                          <Tooltip title={copy.table.noGainHint}>
                            <Typography variant='caption' color='text.secondary'>
                              {copy.table.noGain}
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                      {/* 🔴 EL DATO QUE DECIDE LA URGENCIA. "Consolidar" aparece decenas de
                          veces y no distingue un conflicto de 2 páginas de uno de 45; este
                          número sí. Vivía sólo en el tooltip del mapa. */}
                      <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {/* ⚠️ El color NO lleva la señal acá. `warning.dark` de este theme
                            resuelve a #eeaa00: 2.02:1 sobre blanco, muy por debajo de AA
                            (hallazgo de axe). El peso distingue el conflicto y la semántica
                            ya la carga el chip "Consolidar" de la misma fila — que es el
                            contrato color-independiente correcto de todos modos. */}
                        {row.competingPages > 1 ? (
                          <Typography variant='body2' fontWeight={700}>
                            {row.competingPages}
                          </Typography>
                        ) : (
                          <Typography variant='body2' color='text.secondary'>
                            1
                          </Typography>
                        )}
                      </TableCell>
                      {marketUnavailable ? null : (
                        <>
                          <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {marketCell(row.searchVolume)}
                          </TableCell>
                          <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {marketCell(row.difficulty)}
                          </TableCell>
                        </>
                      )}
                      {canTrack ? (
                        <TableCell align='right'>
                          {isTracked ? (
                            // Dejar de seguir cierra el callejón: el set tiene techo, y sin
                            // esta acción la única salida era pedirlo por soporte.
                            <Tooltip title={copy.follow.untrackHint}>
                              <span>
                                <GreenhouseAsyncActionButton
                                  size='small'
                                  greenhouseVariant='text'
                                  state={state}
                                  disabled={state === 'loading'}
                                  aria-label={copy.follow.untrackAria.replace('{keyword}', row.keyword)}
                                  onClick={() => onUntrack(row.keyword)}
                                >
                                  {copy.follow.untrack}
                                </GreenhouseAsyncActionButton>
                              </span>
                            </Tooltip>
                          ) : (
                            <Tooltip title={atCapacity ? copy.follow.capacityFullHint : copy.follow.costHint}>
                              <span>
                                <GreenhouseAsyncActionButton
                                  size='small'
                                  greenhouseVariant='outlined'
                                  state={state}
                                  // Anti doble submit: mientras el command corre el botón
                                  // no acepta otro click, y el techo lo deshabilita con el
                                  // motivo visible en vez de dejarlo fallar en el submit.
                                  disabled={atCapacity || state === 'loading'}
                                  loadingLabel={copy.follow.loading}
                                  aria-label={copy.follow.ctaAria.replace('{keyword}', row.keyword)}
                                  onClick={() => onTrack(row.keyword)}
                                >
                                  {copy.follow.cta}
                                </GreenhouseAsyncActionButton>
                              </span>
                            </Tooltip>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </DataTableShell>
        </Stack>
      </CardContent>

      <Divider />

      <TablePagination
        component='div'
        count={sorted.length}
        page={safePage}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        onRowsPerPageChange={event => {
          setRowsPerPage(Number(event.target.value))
          setPage(0)
        }}
        labelRowsPerPage={copy.table.rowsPerPage}
        // Ids declarados, no `useId`: el select de filas-por-página vive dentro del subárbol
        // que la recipe adapta al ancho en cliente, así que su id derivado de la ruta del
        // árbol no coincidía entre servidor y cliente (mismatch reproducible sólo en 390px).
        SelectProps={{ id: ROWS_PER_PAGE_SELECT_ID, labelId: `${ROWS_PER_PAGE_SELECT_ID}-label` }}
        labelDisplayedRows={({ from, to, count }) =>
          copy.table.paginationRange
            .replace('{from}', String(from))
            .replace('{to}', String(to))
            .replace('{count}', String(count))
        }
      />
    </Card>
  )
}

export default KeywordOpportunityTable
