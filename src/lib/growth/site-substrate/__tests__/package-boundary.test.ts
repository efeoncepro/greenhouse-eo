import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-1697 Slice 2 — La carta del sustrato, MECÁNICA (molde:
 * `artifact-composer/__tests__/package-boundary.test.ts`).
 *
 * La regla en una línea: **el sustrato dice cómo se OBTIENE la evidencia y nunca cómo se
 * JUZGA; si necesita persistir o consultar un dominio, no es del sustrato.**
 *
 * Enforcement por ALLOWLIST, no por blocklist. Un import del sustrato sólo puede ser:
 *   - relativo y SIN escapar del directorio del paquete,
 *   - un builtin `node:*`,
 *   - `server-only` (site-fetch/read-body hacen HTTP saliente),
 *   - `@/lib/observability/capture` (única transversal permitida: los fallos de red se
 *     observan sin filtrar el raw al consumer).
 * Todo lo demás rompe el build — explícitamente `@/lib/growth/*` (incluido el dominio AEO
 * que lo parió), `@/lib/postgres/*`, `@/lib/db`, `@/lib/sync/*` (outbox), cualquier módulo
 * de flags de dominio, `next`, `@core/*`, `@/components/*`.
 *
 * Segunda capa: la lint rule `greenhouse/growth-substrate-boundary` (Slice 3) vigila la
 * misma frontera en pre-commit; este test la vigila en CI/vitest (defense in depth).
 */

const PACKAGE_DIR = path.resolve(__dirname, '..')

const ALLOWED_EXACT = new Set(['server-only', '@/lib/observability/capture'])

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

const isInsidePackage = (file: string, spec: string): boolean => {
  const resolved = path.resolve(path.dirname(file), spec)

  return resolved === PACKAGE_DIR || resolved.startsWith(PACKAGE_DIR + path.sep)
}

describe('frontera del paquete site-substrate', () => {
  const files = listSourceFiles(PACKAGE_DIR)

  it('el paquete tiene fuentes que auditar', () => {
    expect(files.length).toBeGreaterThanOrEqual(5)
  })

  it.each(files.map(file => [path.relative(PACKAGE_DIR, file), file] as const))(
    '%s — sólo imports relativos internos, node:*, server-only y observability/capture',
    (_rel, file) => {
      const source = fs.readFileSync(file, 'utf8')

      for (const spec of importSpecifiers(source)) {
        if (spec.startsWith('node:')) continue
        if (ALLOWED_EXACT.has(spec)) continue

        if (spec.startsWith('.')) {
          expect(isInsidePackage(file, spec), `import relativo escapa del paquete: '${spec}' en ${file}`).toBe(true)
          continue
        }

        // Cualquier otro specifier (alias @/, @core/, bare module, next, flags de dominio,
        // postgres, outbox…) viola la carta del sustrato.
        expect.fail(
          `'${spec}' en ${path.relative(PACKAGE_DIR, file)} viola la carta del sustrato: ` +
            `el sustrato dice cómo se OBTIENE la evidencia, nunca cómo se JUZGA. ` +
            `Permitidos: relativos internos, node:*, server-only, @/lib/observability/capture.`
        )
      }
    }
  )

  it('el sustrato no contiene SQL, outbox ni flags de dominio (barrido de contenido)', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8')

      expect(/\bSELECT\s+.+\s+FROM\s/i.test(source), `SQL embebido en ${file}`).toBe(false)
      expect(/outbox/i.test(source), `referencia a outbox en ${file}`).toBe(false)
      expect(
        /GROWTH_AI_VISIBILITY|GROWTH_SEO_/.test(source),
        `flag de dominio grader/seo en ${file} — el único flag permitido es el del propio fetcher`
      ).toBe(false)
    }
  })
})
