'use client'

import { useMemo, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { GH_GROWTH_SEO_KEYWORDS } from '@/lib/copy/growth'
import { formatInteger } from '@/lib/format'
import type { KeywordOpportunity } from '@/lib/growth/seo/contracts'

import { KEYWORD_ACTION_ORDER, resolveKeywordAction, type KeywordAction } from './keyword-opportunity-action'

/**
 * TASK-1308 — La banda de veredicto (dirección visual A, "el veredicto primero").
 *
 * ═══ POR QUÉ EXISTE ═══
 *
 * La primera versión de esta pantalla pasó los cuatro gates y aun así se veía mal, y el
 * diagnóstico salió de mirar el frame: **dibujaba los datos sin decir lo que significan**.
 * Con Berel, 42 de 50 oportunidades son de CONSOLIDACIÓN y sólo 8 de optimización — el
 * hallazgo que cambia el trabajo de la semana vivía como un número al final de una leyenda,
 * después de seis bandas de chrome.
 *
 * Esta banda es lo primero con peso visual del fold y hace tres trabajos a la vez:
 *
 * 1. **Dice la lectura dominante** en palabras, redactada desde el reparto REAL. No es una
 *    plantilla: si la mayoría no está canibalizada el titular dice otra cosa, y si no hay
 *    nada que destacar se limita a describir el conjunto en vez de inventar un hallazgo.
 * 2. **Es la leyenda del scatter.** Cada segmento lleva la MISMA forma que el marcador del
 *    canvas (círculo, triángulo, rombo), así que la leyenda dejó de ser una banda aparte.
 * 3. **Es el filtro.** Reemplaza el select "Acción" de la barra de abajo. Leyenda y filtro
 *    de la misma dimensión eran dos objetos para una sola idea.
 *
 * Tres bandas de chrome menos, y la jerarquía invertida a favor del significado.
 */

export interface KeywordOpportunityVerdictProps {
  /** TODAS las oportunidades del target — el veredicto describe el conjunto, no el filtro. */
  opportunities: KeywordOpportunity[]
  activeAction: KeywordAction | 'all'
  onActionChange: (action: KeywordAction | 'all') => void
  /**
   * Los selectores de Space y ventana.
   *
   * ⚠️ VIVEN ACÁ, no en una barra suelta arriba. Sueltos sobre el fondo gris de la página
   * eran dos cajas con relleno propio flotando sin superficie — se veían sin colocar. Y
   * darles una card propia habría dejado cinco cards apiladas, que es card wallpaper.
   *
   * Acá además dicen la verdad compositiva: el veredicto afirma "42 de 50 keywords compiten
   * contra tu propio sitio", y estos controles son EL SUJETO de esa frase — de qué Space y
   * sobre qué ventana. El control pertenece a la superficie cuyo contenido gobierna.
   */
  context?: ReactNode
}

/** Umbral para llamar "dominante" a un reparto. Menos de esto es una mezcla, no un hallazgo. */
const DOMINANCE_RATIO = 0.6

const KeywordOpportunityVerdict = ({
  opportunities,
  activeAction,
  onActionChange,
  context
}: KeywordOpportunityVerdictProps) => {
  const copy = GH_GROWTH_SEO_KEYWORDS

  const counts = useMemo(() => {
    const buckets: Record<KeywordAction, number> = { quickWin: 0, striking: 0, cannibalized: 0 }

    for (const opportunity of opportunities) buckets[resolveKeywordAction(opportunity)] += 1

    return buckets
  }, [opportunities])

  const totalGain = useMemo(
    () => opportunities.reduce((sum, opportunity) => sum + opportunity.estimatedClickGain, 0),
    [opportunities]
  )

  const total = opportunities.length

  /**
   * El titular sale del REPARTO, no de una plantilla.
   *
   * Sólo se llama "hallazgo" a lo que domina de verdad: bajo el umbral, la pantalla describe
   * el conjunto en vez de forzar una conclusión que los datos no sostienen.
   */
  const headline = useMemo(() => {
    if (total === 0) return null

    if (counts.cannibalized / total >= DOMINANCE_RATIO) {
      return {
        text: copy.verdict.mostlyCannibalized
          .replace('{count}', String(counts.cannibalized))
          .replace('{total}', String(total)),
        hint: copy.verdict.mostlyCannibalizedHint
      }
    }

    if (counts.quickWin / total >= DOMINANCE_RATIO) {
      return {
        text: copy.verdict.mostlyQuickWin
          .replace('{count}', String(counts.quickWin))
          .replace('{total}', String(total)),
        hint: copy.verdict.mostlyQuickWinHint
      }
    }

    return {
      text: copy.verdict.balanced.replace('{total}', String(total)),
      hint: copy.verdict.balancedHint
    }
  }, [counts, total, copy.verdict])

  const segmentMeta: Record<KeywordAction, { label: string; hint: string; tone: 'success' | 'info' | 'warning' }> = {
    quickWin: { label: copy.action.quickWin, hint: copy.action.quickWinHint, tone: 'success' },
    striking: { label: copy.action.striking, hint: copy.action.strikingHint, tone: 'info' },
    cannibalized: { label: copy.action.cannibalized, hint: copy.action.cannibalizedHint, tone: 'warning' }
  }

  /** El glyph replica el símbolo del canvas: la leyenda sobrevive en monocromo (WCAG 1.4.1). */
  const glyph = (action: KeywordAction, tone: 'success' | 'info' | 'warning') => (
    <Box
      aria-hidden='true'
      sx={theme => ({
        inlineSize: 14,
        blockSize: 14,
        flexShrink: 0,
        backgroundColor: theme.palette[tone].main,
        clipPath:
          action === 'striking'
            ? 'polygon(50% 0%, 100% 100%, 0% 100%)'
            : action === 'cannibalized'
              ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
              : undefined,
        borderRadius: action === 'quickWin' ? '50%' : 0
      })}
    />
  )

  if (!headline) return null

  return (
    <Card data-capture='seo-keywords-verdict'>
      <CardContent>
        <Stack spacing={5}>
          {/* `useFlexGap` es obligatorio acá, no cosmético: el espaciado por defecto de Stack
              es margen sobre el ORDEN DEL DOM, y el hijo que reordenamos con `order` deja de
              ser el primero visualmente — el margen caía en el lugar equivocado y el titular
              quedaba pegado al selector de ventana. `gap` respeta el orden visual. */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={5}
            useFlexGap
            justifyContent='space-between'
            alignItems={{ md: 'flex-start' }}
          >
            {/* El enunciado completo: hallazgo → cuánto vale → qué hacer al respecto.
                La ganancia vive ACÁ y no con los selectores: es la segunda mitad de la
                lectura, no contexto. Cuando iba agrupada con el contexto, el `order` de
                mobile se la llevaba arriba y la cifra aparecía ANTES del hallazgo que
                cuantifica. */}
            <Stack spacing={2} sx={{ maxInlineSize: '68ch' }}>
              {/* `h4` y no `surfaceHeroTitle`: el titular de la página ya existe arriba y este
                  no puede competir con él — dice más, pero es su subordinado. */}
              <Typography variant='h4' component='p'>
                {headline.text}
              </Typography>

              {totalGain > 0 ? (
                <Tooltip title={copy.verdict.gainTotalHint}>
                  <Typography
                    variant='h5'
                    component='p'
                    color='success.dark'
                    sx={{ fontVariantNumeric: 'tabular-nums', alignSelf: 'flex-start' }}
                  >
                    {copy.verdict.gainTotal.replace('{value}', formatInteger(totalGain))}
                  </Typography>
                </Tooltip>
              ) : null}

              <Typography variant='body2' color='text.secondary'>
                {headline.hint}
              </Typography>
            </Stack>

            {/* ⚠️ En columna (mobile) el contexto va PRIMERO. En su orden de DOM quedaba en
                medio del enunciado: leías el hallazgo, te topabas con dos campos de
                formulario, y recién después el resto. Adelantado se lee natural — "Grupo
                Berel, últimos 28 días → esto es lo que encontramos" — y en fila (desktop)
                vuelve a su sitio arriba a la derecha. */}
            <Stack sx={{ order: { xs: -1, md: 0 }, inlineSize: { xs: '100%', md: 'auto' } }}>{context}</Stack>
          </Stack>

          {/* Los segmentos: leyenda del scatter y filtro de la tabla en el mismo objeto. */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            useFlexGap
            flexWrap='wrap'
            role='group'
            aria-label={copy.verdict.ariaLabel}
          >
            {KEYWORD_ACTION_ORDER.filter(action => counts[action] > 0).map(action => {
              const meta = segmentMeta[action]
              const isActive = activeAction === action

              return (
                <Tooltip key={action} title={meta.hint}>
                  <ButtonBase
                    onClick={() => onActionChange(isActive ? 'all' : action)}
                    // `aria-pressed` y no `role=tab`: son filtros conmutables, no navegación.
                    aria-pressed={isActive}
                    sx={theme => ({
                      flex: { sm: 1 },
                      minInlineSize: { sm: 0 },
                      justifyContent: 'flex-start',
                      gap: 2.5,
                      paddingBlock: 2.5,
                      paddingInline: 3.5,
                      borderRadius: 1,
                      textAlign: 'start',
                      // El estado activo se marca con FONDO y BORDE, no sólo con color de
                      // texto: un filtro que sólo cambia de tinte es invisible en monocromo.
                      border: `1px solid ${
                        isActive ? theme.palette[meta.tone].main : theme.palette.divider
                      }`,
                      backgroundColor: isActive
                        ? alpha(theme.palette[meta.tone].main, 0.08)
                        : 'transparent',
                      transition: theme.transitions.create(['background-color', 'border-color']),
                      '&:hover': { backgroundColor: alpha(theme.palette[meta.tone].main, 0.06) },
                      '&.Mui-focusVisible, &:focus-visible, &:focus': {
                        outline: `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: 2
                      }
                    })}
                  >
                    {glyph(action, meta.tone)}
                    {/* Número y etiqueta EN LÍNEA: apilados, con 180px de ancho mínimo, los
                        segmentos se leían como cards vacías. El número manda y la etiqueta
                        lo califica — no son dos datos, es uno. */}
                    <Stack direction='row' spacing={2} alignItems='baseline' sx={{ minInlineSize: 0 }}>
                      <Typography variant='h5' component='span' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {counts[action]}
                      </Typography>
                      <Typography variant='body2' color='text.secondary' noWrap>
                        {meta.label}
                      </Typography>
                    </Stack>
                  </ButtonBase>
                </Tooltip>
              )
            })}

            {activeAction !== 'all' ? (
              <ButtonBase
                onClick={() => onActionChange('all')}
                sx={theme => ({
                  paddingInline: 3,
                  borderRadius: 1,
                  color: theme.palette.text.secondary,
                  '&.Mui-focusVisible, &:focus-visible, &:focus': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2
                  }
                })}
              >
                <Typography variant='body2'>{copy.verdict.clear}</Typography>
              </ButtonBase>
            ) : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default KeywordOpportunityVerdict
