import 'server-only'

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * TASK-863 V1.4 — Legal Signatures: resolver canonico compartido para firmas
 * digitalizadas de representantes legales. Recurso reutilizable por cualquier
 * flow del repo que renderice documentos firmados por el representante legal
 * de una organizacion (finiquitos, contratos, addenda, cartas formales, etc.).
 *
 * ## Convencion de filename
 *
 * `src/assets/signatures/{taxId_sin_puntos_ni_espacios}.{png|jpg|jpeg}`
 *
 * Ejemplo Efeonce Group SpA, RUT `77.357.182-1`:
 *   src/assets/signatures/77357182-1.png
 *
 * ## Path traversal protection
 *
 * - Bloquea `..` y paths absolutos.
 * - Solo permite extensiones png/jpg/jpeg.
 * - Solo accepta caracteres `[a-zA-Z0-9._\-/]` en el path relativo.
 *
 * ## Graceful fallback
 *
 * Si el archivo NO existe, `resolveLegalRepresentativeSignaturePath` retorna
 * `null`. Los consumers deben renderizar la linea de firma vacia en ese caso
 * para que pueda firmarse manualmente post-impresion.
 *
 * ## V2 follow-up
 *
 * Migrar a FK asset privado en `greenhouse_core.organizations.legal_representative_signature_asset_id`
 * con bucket `greenhouse-private-assets-{env}/signatures/`, audit log, rotation,
 * retention class `legal_signature`. La firma persistiria como private asset
 * canonico (mismo patron que `final_settlement_document`), no como filesystem
 * hardcoded en el repo. El path forward es agregar DDL + writer + reader
 * downstream que reemplace esta funcion.
 */

export const LEGAL_SIGNATURE_BASE_DIR = 'src/assets/signatures'

const ALLOWED_PATH_PATTERN = /^[a-zA-Z0-9._\-/]+\.(png|jpg|jpeg)$/

const isSafePath = (relativePath: string): boolean => {
  if (relativePath.includes('..')) return false
  if (relativePath.startsWith('/')) return false

  return ALLOWED_PATH_PATTERN.test(relativePath)
}

/**
 * Normaliza un Chile RUT (o cualquier taxId) a su filename canonico:
 * sin puntos, sin espacios, mantiene guion. Retorna `null` cuando input vacio.
 *
 * Ejemplos:
 *   "77.357.182-1"  → "77357182-1.png"
 *   "77 357 182 1"  → "773571821.png"
 *   ""              → null
 *   null            → null
 */
export const buildSignatureFilenameForTaxId = (taxId: string | null | undefined): string | null => {
  if (!taxId) return null

  const cleaned = String(taxId).replace(/[.\s]/g, '').trim()

  if (!cleaned) return null

  return `${cleaned}.png`
}

/**
 * Resuelve el absolute path filesystem de una firma digital del representante
 * legal. Retorna `null` cuando:
 *   - Input es null/undefined/vacio
 *   - Path falla path traversal protection
 *   - Archivo no existe en filesystem
 *
 * Consumers deben usar el `null` como senal de "no hay firma pre-cargada,
 * dejar la linea vacia para firma manual".
 */
export const resolveLegalRepresentativeSignaturePath = (relativePath: string | null | undefined): string | null => {
  if (!relativePath) return null
  if (!isSafePath(relativePath)) return null

  const absolutePath = resolve(process.cwd(), LEGAL_SIGNATURE_BASE_DIR, relativePath)

  try {
    return existsSync(absolutePath) ? absolutePath : null
  } catch {
    return null
  }
}

/**
 * Helper de alto nivel para consumers: resuelve la firma del representante
 * legal de una organizacion conocida por su `taxId` (RUT chileno).
 * Combina `buildSignatureFilenameForTaxId` + `resolveLegalRepresentativeSignaturePath`.
 *
 * Retorna `null` cuando taxId vacio, filename invalido, o archivo no existe.
 */
export const getLegalRepresentativeSignatureAbsolutePath = (taxId: string | null | undefined): string | null => {
  const relativePath = buildSignatureFilenameForTaxId(taxId)

  return resolveLegalRepresentativeSignaturePath(relativePath)
}
