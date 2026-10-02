/**
 * pnpm glitch:editions [--json]
 *
 * Lee del blog (efeoncepro.com/glitch/, categoría Glitch de WordPress) las ediciones semanales PUBLICADAS e imprime la
 * última y la próxima esperada. Es la fuente de verdad de la numeración (decisión 2026-09-28): el número de un manifiesto
 * semanal nuevo es el que imprime este comando. El Glitch Flash no lleva número y no cuenta.
 *
 * Sólo lectura (API REST pública, sin credenciales). Sin respuesta del blog sale con código 1 y
 * `published-editions-unavailable`: nunca inventa un número.
 */

import { fetchPublishedGlitchEditions } from '@/lib/glitch-composition'

import { toGlitchPieceError } from './errors'

const main = async () => {
  const published = await fetchPublishedGlitchEditions()

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(published, null, 2))

    return
  }

  console.log(`Glitch · ediciones publicadas (${published.source})\n`)

  for (const e of published.editions.slice(0, 5)) console.log(`  #${e.number}  ${e.date.slice(0, 10)}  ${e.title}\n        ${e.link}`)

  if (published.editions.length > 5) console.log(`  … y ${published.editions.length - 5} más`)

  if (published.ignored.length > 0) console.log(`\n  Sin número (Flash u otras notas, no cuentan): ${published.ignored.length}`)

  for (const n of published.duplicates) console.warn(`⚠ El #${n} aparece en más de un post publicado.`)

  console.log(
    published.lastNumber === null
      ? '\nTodavía no hay ediciones numeradas publicadas.'
      : `\nÚltima publicada: #${published.lastNumber}\nPróxima semanal:  #${published.nextNumber}`
  )
}

main().catch((raw: unknown) => {
  const error = toGlitchPieceError(raw)

  if (error) {
    console.error(`✗ [${error.code}] ${error.message}`)

    for (const issue of error.issues) console.error(`  - [${issue.code}]${issue.path ? ` ${issue.path}` : ''}: ${issue.message}`)

    process.exit(1)
  }

  console.error(raw)
  process.exit(1)
})
