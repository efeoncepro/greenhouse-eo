/**
 * `content-brand-family` (deck SEO/AEO, TASK-1949): «¿Qué hay dentro? Cuatro piezas.». La familia de marcas de Search
 * Visibility 360: a la izquierda el logo de SV360 abre la voz (en el lugar del eyebrow) y la bajada; a la derecha el
 * nombre completo del producto y sus cuatro piezas, cada una con su lockup OFICIAL, su papel (capacidad, proceso,
 * entregable, edición mensual) y una línea que dice qué hace. Fondo de producto, sin escenario.
 *
 * El CONTENIDO llega en el intent con los nombres del catálogo de recetas: `productMark` (el logo que abre la voz),
 * `voice.eyebrow` (el rótulo de la columna derecha, sobre el nombre del producto), `familyMark` (el nombre completo) y
 * `pieces` (cuatro: `mark`, `role`, `description`). Los lockups son archivos de `@efeoncepro/axis-brand-assets` de una
 * lista cerrada: nunca un logo dibujado ni recoloreado.
 */

import { contentOf, voiceSlots } from '../../shared'
import { SurfacePieceError } from '../../types'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { css } from '../kit'
import { req, uniqueAssets } from '../line-stage/kit'
import { PRODUCT_MARKS, productMarkFile, productMarkId } from '../product-mark'

import { listOf, sv360Frame } from './kit'

/** Los nombres completos que pueden encabezar la columna de la familia (archivos de axis-brand-assets). */
const FAMILY_LOCKUPS = { 'sv360-name-lockup-negative': 'Efeonce | Search Visibility 360' } as const

/**
 * El logo que abre la voz: arriba de la pregunta, a 44 px de alto.
 * TODO AXIS TASK-1949: `content-brand-family.productMark` ({ xPx: 140, topPx: 250, heightPx: 44 }).
 */
const OPENING_MARK = { xPx: 140, topPx: 250, heightPx: 44 } as const

type PieceIntent = { mark?: unknown; role?: unknown; description?: unknown }

export const contentBrandFamily: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)

  if (!voice.eyebrow) throw new SurfacePieceError('La familia de marcas lleva el rótulo de su columna (`voice.eyebrow`).', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('La familia de marcas lleva su bajada (`body`).', 'invalid-intent')

  const opening = productMarkId(intent.productMark)

  if (!opening) throw new SurfacePieceError('La familia de marcas abre con el logo del producto (`productMark`).', 'invalid-intent')

  const lockupId = req(intent.familyMark, 'El nombre completo del producto (`familyMark`)')

  if (!(lockupId in FAMILY_LOCKUPS)) {
    throw new SurfacePieceError(`El nombre del producto (\`familyMark\`) es uno de ${Object.keys(FAMILY_LOCKUPS).join(' · ')}.`, 'invalid-intent')
  }

  const members = listOf<PieceIntent>(intent.pieces, 4, 'Las piezas de la familia (`pieces`)').map((piece, i) => {
    const id = productMarkId(piece.mark)

    if (!id || id === opening) throw new SurfacePieceError(`La pieza ${i + 1} (\`pieces[${i}].mark\`) es un lockup de submarca distinto del producto.`, 'invalid-intent')

    return { id, file: productMarkFile(id), role: req(piece.role, `El papel de la pieza ${i + 1} (\`pieces[${i}].role\`)`), text: req(piece.description, `La pieza ${i + 1} (\`pieces[${i}].description\`)`) }
  })

  if (new Set(members.map(m => m.id)).size !== members.length) throw new SurfacePieceError('Cada pieza de la familia lleva su propio lockup.', 'invalid-intent')

  const openingFile = productMarkFile(opening)
  const lockupFile = productMarkFile(lockupId)

  const frame = sv360Frame(manifest, recipe, String(intent.line), ['bg', 'soft', 'halo'], { eyebrowInVoice: false })

  // El eyebrow de esta lámina es el rótulo de la columna derecha: no va en la voz.
  const { eyebrow, ...voiceWithoutEyebrow } = voice

  return {
    contentType: 'deck.content-brand-family',
    slots: {
      frame,
      voice: voiceWithoutEyebrow,
      body: evidenceHtml(content.body, 'none'),
      productMark: {
        src: openingFile.ref,
        alt: PRODUCT_MARKS[opening],
        left: css('pmk-left', OPENING_MARK.xPx),
        top: css('pmk-top', OPENING_MARK.topPx),
        height: css('pmk-height', OPENING_MARK.heightPx)
      },
      family: {
        kicker: eyebrow,
        lockup: lockupFile.ref,
        lockupAlt: FAMILY_LOCKUPS[lockupId as keyof typeof FAMILY_LOCKUPS]
      },
      pieces: members.map(member => ({ mark: member.file.ref, markAlt: PRODUCT_MARKS[member.id], role: member.role, description: member.text }))
    },
    assets: uniqueAssets([openingFile.asset, lockupFile.asset, ...members.map(member => member.file.asset)])
  }
}
