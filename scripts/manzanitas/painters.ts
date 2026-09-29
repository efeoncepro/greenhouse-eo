/**
 * El painter de gráficos que el comando inyecta al catálogo de Marketing con Manzanitas (TASK-1939).
 *
 * El catálogo no importa paquetes (frontera del motor), así que quien compone le pasa esta función: pinta la receta con
 * `manzanitasChartSvg` (@efeoncepro/axis-graphic-line/charts) desde el dato del slot `chart` y corre los chequeos del
 * registro sobre lo pintado (`runManzanitasChartChecks`). Un chequeo que falla corta la lámina: un gráfico nunca sale
 * con la barra dibujada a mano, dos acentos, la cifra sin fuente o el acento bajo 3:1.
 */

import { manzanitasChartSvg, runManzanitasChartChecks, ManzanitasChartError, type ManzanitasChartOptions } from '@efeoncepro/axis-graphic-line/charts'
import type { AxisManzanitasChartIntent, AxisManzanitasChartRecipe } from '@efeoncepro/axis-ui-contracts'

import type { ManzanitasChartPainter, ManzanitasChartRequest } from '@/lib/artifact-composer/catalogs/manzanitas'
import { ManzanitasPieceError } from '@/lib/manzanitas-composition'

/** Pinta y verifica. Devuelve el SVG del lienzo 1080 × 1350 con el acento de la línea. */
export const paintManzanitasChart = (request: ManzanitasChartRequest): { svg: string; checks: readonly { check: string; ok: boolean; detail: string }[] } => {
  let result: ReturnType<typeof manzanitasChartSvg>

  try {
    result = manzanitasChartSvg(request.recipe as AxisManzanitasChartRecipe, request.data as unknown as AxisManzanitasChartIntent, {
      ...(request.options as Omit<ManzanitasChartOptions, 'line' | 'surface'>),
      line: request.line,
      surface: request.surface
    })
  } catch (error) {
    if (error instanceof ManzanitasChartError) {
      throw new ManzanitasPieceError(`El gráfico ${request.recipe} no pasa el contrato del registro.`, 'contract-issues', [{ code: error.code, message: error.message }])
    }

    throw error
  }

  const checks = runManzanitasChartChecks(result)
  const failed = checks.filter((c) => !c.ok)

  if (failed.length > 0) {
    throw new ManzanitasPieceError(
      `El gráfico ${request.recipe} no pasa los chequeos del registro.`,
      'contract-issues',
      failed.map((c) => ({ code: c.check, message: c.detail }))
    )
  }

  return { svg: result.svg, checks }
}

export const manzanitasChartPainter: ManzanitasChartPainter = (request) => paintManzanitasChart(request).svg
