/**
 * Traduce los errores del motor a los códigos estables de Marketing con Manzanitas (TASK-1939), para que el comando y la
 * ruta productiva los muestren con el mismo vocabulario que el mapper. Una plantilla en propuesta pedida a mano sale como
 * `piece-not-approved` (validador `manzanitas.piece-approval`); cualquier otra regla del catálogo, como `contract-issues`.
 */

import { CatalogSemanticError } from '@/lib/artifact-composer'
import { ManzanitasPieceError } from '@/lib/manzanitas-composition'

export const toManzanitasPieceError = (error: unknown): ManzanitasPieceError | null => {
  if (error instanceof ManzanitasPieceError) return error
  if (!(error instanceof CatalogSemanticError)) return null

  const failed = error.runs.filter((run) => run.result === 'fail')
  const issues = failed.flatMap((run) => run.violations.map((message) => ({ code: run.name, message })))
  const notApproved = failed.some((run) => run.name === 'manzanitas.piece-approval')

  return new ManzanitasPieceError(
    notApproved ? 'Una pieza está en propuesta: no se compone como canon hasta que el operador la apruebe.' : 'La pieza no pasa las reglas del catálogo de Marketing con Manzanitas.',
    notApproved ? 'piece-not-approved' : 'contract-issues',
    issues
  )
}
