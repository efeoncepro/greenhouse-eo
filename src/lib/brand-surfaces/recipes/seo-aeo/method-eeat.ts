/**
 * `method-eeat` (TASK-1934): PLACEHOLDER — lo reemplaza el builder real de la lámina.
 */

import { SurfacePieceError } from '../../types'

import type { RecipeBuilder } from '../deck'

export const methodEeat: RecipeBuilder = () => {
  throw new SurfacePieceError('`method-eeat` todavía no tiene plantilla en el composer.', 'recipe-without-template')
}
