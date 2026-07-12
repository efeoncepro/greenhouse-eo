import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Gate de frontera del primitive (TASK-1393 Slice 1) — MECÁNICO, no criterio de reviewer.
 *
 * La regla que hace que el primitive siga siendo primitive: **el motor NUNCA importa de un
 * dominio**. Si lo necesita, no es del motor — es del catálogo. Y como nace package-shaped
 * (Creative Studio y el tender-worker lo consumirán como paquete), tampoco puede traer Next-isms
 * (`server-only` obligaba al CLI a un shim que habría viajado a cada consumer) ni alias del
 * monolito (`@/`, `@core/`): fuera del repo no resuelven.
 *
 * Enforcement por ALLOWLIST, no por blocklist: un import del motor sólo puede ser
 *   - relativo y SIN escapar del directorio del paquete,
 *   - un builtin `node:*`,
 *   - `playwright` o `pdf-lib` (las dependencias declaradas).
 * Todo lo demás rompe el build — incluye `@/lib/commercial/**`, `@/lib/growth/**`, `server-only`,
 * `next`, `@core/*` y cualquier dependencia nueva no declarada acá a propósito.
 *
 * Segunda capa: eslint `no-restricted-imports` sobre `src/lib/artifact-composer/**` (defense in
 * depth — el lint corre en pre-commit, este test en CI/vitest).
 */

const PACKAGE_DIR = path.resolve(__dirname, '..')

const ALLOWED_BARE_IMPORTS = new Set(['playwright', 'pdf-lib'])

const listSourceFiles = (dir: string): string[] => {
  const out: string[] = []

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue

      out.push(...listSourceFiles(full))
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      out.push(full)
    }
  }

  return out
}

const importSpecifiers = (source: string): string[] => {
  const specifiers: string[] = []

  // import … from '<spec>' · export … from '<spec>' · import '<spec>' · import('<spec>') · require('<spec>')
  const patterns = [
    /(?:^|\n)\s*(?:import|export)[^'"\n]*?from\s+['"]([^'"]+)['"]/g,
    /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ]

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.push(match[1]!)
  }

  return specifiers
}

describe('frontera del paquete artifact-composer', () => {
  const files = listSourceFiles(PACKAGE_DIR)

  it('el paquete tiene fuentes que auditar', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it.each(files.map(file => [path.relative(PACKAGE_DIR, file), file] as const))(
    '%s — sólo imports relativos internos, node:* y dependencias declaradas',
    (_rel, file) => {
      const source = fs.readFileSync(file, 'utf8')

      for (const spec of importSpecifiers(source)) {
        if (spec.startsWith('node:')) continue

        if (ALLOWED_BARE_IMPORTS.has(spec)) continue

        if (spec.startsWith('.')) {
          // Relativo: no puede ESCAPAR del paquete (../../commercial sería un import de dominio
          // disfrazado de relativo).
          const resolved = path.resolve(path.dirname(file), spec)

          expect(
            resolved.startsWith(PACKAGE_DIR + path.sep) || resolved === PACKAGE_DIR,
            `${_rel}: el import relativo "${spec}" escapa del paquete (resuelve a ${resolved}).`
          ).toBe(true)
          continue
        }

        // Cualquier otra cosa — '@/…', '@core/…', 'server-only', 'next', un paquete nuevo — es
        // una violación de frontera o una dependencia no declarada. Ambas rompen el build acá.
        expect.fail(
          `${_rel}: import "${spec}" viola la frontera del primitive. ` +
            `El motor sólo puede importar relativo-interno, node:*, playwright o pdf-lib. ` +
            `Si es lógica de dominio → va al catálogo/consumer. Si es una dependencia nueva → ` +
            `declarala en ALLOWED_BARE_IMPORTS de este test + en el barrel (decisión consciente).`
        )
      }
    }
  )
})
