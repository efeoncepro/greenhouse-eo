import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-1709 — los tres guardias estructurales del carril:
 *
 * 1. FRONTERA: `prospect/**` no importa el fetcher del dominio AEO ni fetchea por su
 *    cuenta — la evidencia de sitio se DELEGA al sustrato (la delegación es el
 *    contrato, no una convención).
 * 2. CORTESÍA: cero literales de evasión de bloqueo en el carril (robots override,
 *    proxy pools, robots.txt custom).
 * 3. ANTI-CAPTURA-RECURRENTE: ningún cron/scheduler lee la tabla del diagnóstico,
 *    la migración no tiene columna de scheduling, y el ops-worker no la conoce.
 *
 * Los patrones perseguidos se construyen por concatenación para que este archivo no
 * se detecte a sí mismo ni dispare detectores de string en el árbol escaneado.
 */

const PROSPECT_DIR = resolve(process.cwd(), 'src/lib/growth/seo/prospect')

const prospectSourceFiles = (): Array<{ name: string; content: string }> =>
  readdirSync(PROSPECT_DIR)
    .filter(name => name.endsWith('.ts'))
    .map(name => ({ name, content: readFileSync(resolve(PROSPECT_DIR, name), 'utf8') }))

describe('frontera del carril (delegación al sustrato)', () => {
  it('ningún archivo del carril importa el fetcher del dominio AEO ni safe-fetch', () => {
    const forbiddenSpecifiers = ['safe-' + 'fetch', 'ai-visibility/' + 'probes']

    for (const file of prospectSourceFiles()) {
      // Solo los especificadores de import cuentan: mencionar la regla en un comentario
      // es documentación, importar el módulo es la violación.
      const importSpecifiers = [...file.content.matchAll(/from\s+'([^']+)'/g)].map(match => match[1])

      for (const specifier of importSpecifiers) {
        for (const forbidden of forbiddenSpecifiers) {
          expect(specifier.includes(forbidden), `${file.name} importa ${specifier}`).toBe(false)
        }
      }
    }
  })

  it('ningún archivo del carril construye un fetch de red propio', () => {
    // El único camino a la red del sitio es el SiteFetcher del sustrato. Un `fetch(`
    // global o un `new URL(` sobre el dominio del prospecto fuera del sustrato es la
    // regresión SSRF que TASK-1697 existe para impedir.
    const fetchCall = 'fetch' + '('

    for (const file of prospectSourceFiles()) {
      const withoutComments = file.content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\*.*$/gm, '').replace(/\/\/.*$/gm, '')

      const offending = withoutComments
        .split('\n')
        .filter(line => line.includes(fetchCall))
        // Los nombres del sustrato (createSiteFetcher, fetcher('/')) son la delegación
        // legítima; lo prohibido es el global fetch(.
        .filter(line => /(?<![A-Za-z])fetch\(/.test(line))

      expect(offending, `${file.name}: ${offending.join(' | ')}`).toEqual([])
    }
  })
})

describe('cortesía verificable (no se evade un bloqueo)', () => {
  it('cero literales de evasión en el código del carril', () => {
    const forbiddenLiterals = [
      'switch_' + 'pool',
      'ip_pool_' + 'for_scan',
      'custom_robots' + '_txt',
      'robots_txt_merge_mode'
    ]

    for (const file of prospectSourceFiles()) {
      for (const literal of forbiddenLiterals) {
        expect(file.content.includes(literal), `${file.name} contiene ${literal}`).toBe(false)
      }
    }
  })
})

describe('anti-captura-recurrente (una corrida por diagnóstico, disparo humano)', () => {
  const TABLE = 'seo_prospect_' + 'diagnostics'

  it('la migración del carril no tiene columnas de scheduling', () => {
    const migrationsDir = resolve(process.cwd(), 'migrations')
    const migration = readdirSync(migrationsDir).find(name => name.includes('task-1709'))

    expect(migration).toBeDefined()

    const sql = readFileSync(resolve(migrationsDir, migration as string), 'utf8')

    // El literal aparece legítimamente en el DO guard (que verifica su AUSENCIA) y en
    // comentarios: lo que no puede pasar es que el CREATE TABLE lo DEFINA como columna.
    const createTableBlock = sql.match(new RegExp(`CREATE TABLE[^;]+${TABLE}[^;]+;`, 's'))?.[0] ?? ''

    expect(createTableBlock.length).toBeGreaterThan(0)
    expect(createTableBlock.includes('next_' + 'run_at')).toBe(false)
    expect(createTableBlock.includes('schedule')).toBe(false)

    // Y el guard de la migración debe seguir vigente (aborta si la columna aparece).
    expect(sql.includes('must NOT have scheduling columns')).toBe(true)
  })

  it('vercel.json no tiene un cron que toque el carril de prospecto', () => {
    const vercelJson = readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')

    expect(vercelJson.includes('prospect')).toBe(false)
  })

  it('el ops-worker no lee la tabla del diagnóstico ni ejecuta el carril', () => {
    // El command corre inline en Vercel por diseño (V1): un handler o scheduler del
    // worker que lea esta tabla sería la captura recurrente que la task prohíbe.
    const workerDir = resolve(process.cwd(), 'services/ops-worker')

    const scan = (dir: string): string[] => {
      const offenders: string[] = []

      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue

        const fullPath = resolve(dir, entry.name)

        if (entry.isDirectory()) {
          offenders.push(...scan(fullPath))
        } else if (/\.(ts|mjs|sh)$/.test(entry.name)) {
          const content = readFileSync(fullPath, 'utf8')

          if (content.includes(TABLE) || content.includes('prospect-diagnostic')) {
            offenders.push(fullPath)
          }
        }
      }

      return offenders
    }

    expect(scan(workerDir)).toEqual([])
  })
})
