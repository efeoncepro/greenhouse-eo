/**
 * Opciones con las que un consumidor construye un catálogo de «La órbita».
 *
 * Todo catálogo `graphic-line-*` exporta `createCatalog(options)`: el CLI local y, cuando exista, el worker
 * lo resuelven por nombre y le inyectan las pinturas que el motor no puede importar (la selección
 * colaborativa y el CTA son del adaptador de Greenhouse sobre contratos de AXIS).
 */

import type { GraphicLineCtaPainter } from './cta-hook'
import type { GraphicLineSelectionPainter } from './selection-hook'

export interface GraphicLineCatalogOptions {
  /** Pintura de la selección colaborativa. Sin ella, un plan con selección falla. */
  selectionPainter?: GraphicLineSelectionPainter
  /** Pintura del CTA (corchetes abiertos + cursor local). Sin ella, un plan con CTA falla. */
  ctaPainter?: GraphicLineCtaPainter
}
