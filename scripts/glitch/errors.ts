/**
 * Traduce los errores del motor a los códigos estables de Glitch, para que el CLI y la ruta productiva los muestren con
 * el mismo vocabulario que el mapper. Una plantilla en PROPUESTA pedida a mano sale como `piece-not-approved` (el
 * validador `glitch.piece-approval@1` del catálogo); cualquier otra regla de edición, como `contract-issues`.
 */

import { CatalogSemanticError } from '@/lib/artifact-composer'
import { GlitchPieceError } from '@/lib/glitch-composition'

export const toGlitchPieceError = (error: unknown): GlitchPieceError | null => {
  if (error instanceof GlitchPieceError) return error
  if (!(error instanceof CatalogSemanticError)) return null

  const failed = error.runs.filter((run) => run.result === 'fail')
  const issues = failed.flatMap((run) => run.violations.map((message) => ({ code: run.name, message })))
  const notApproved = failed.some((run) => run.name === 'glitch.piece-approval')

  return new GlitchPieceError(
    notApproved ? 'Una pieza de la edición está en PROPUESTA: no se compone como canon hasta que el operador la apruebe.' : 'La edición no pasa las reglas del catálogo de Glitch.',
    notApproved ? 'piece-not-approved' : 'contract-issues',
    issues
  )
}
