import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-1391 — PORTABILIDAD del catálogo: un catálogo es DATO autocontenido que debe renderizar
 * idéntico en cualquier máquina/contenedor. Un path absoluto (`file://`, `/Users/…`, `C:\\…`) o
 * una referencia fuera del árbol del catálogo funciona en la máquina del autor y revienta en el
 * worker — bug class REAL: dos plantillas quedaron con `file:///Users/…/logo-negative.svg`
 * horneado y el deck de SKY falló en Cloud Run con `missing_asset` (2026-07-12).
 */

const CATALOGS_DIR = path.resolve(__dirname, '../catalogs')

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]
  )

const FORBIDDEN = [
  { rx: /file:\/\//, label: 'file:// (path absoluto de una máquina)' },
  { rx: /(?:src|href)=["']\/(?!\/)/, label: 'src/href raíz-absoluto ("/…")' },
  { rx: /\/Users\/|\/home\/|[A-Z]:\\\\/, label: 'path de filesystem de una máquina' },
  { rx: /\.\.\/\.\.\//, label: 'referencia que escapa del catálogo (../../)' }
]

describe('portabilidad del catálogo (autocontenido o no es un catálogo)', () => {
  const htmlFiles = walk(CATALOGS_DIR).filter(f => f.endsWith('.html'))

  it('hay plantillas que auditar', () => {
    expect(htmlFiles.length).toBeGreaterThan(20)
  })

  for (const file of htmlFiles) {
    it(`${path.relative(CATALOGS_DIR, file)} no contiene referencias no portables`, () => {
      const html = fs.readFileSync(file, 'utf8')

      for (const { rx, label } of FORBIDDEN) {
        const match = rx.exec(html)

        expect(match, `${label} → "${match?.[0] ?? ''}"`).toBeNull()
      }
    })
  }
})
