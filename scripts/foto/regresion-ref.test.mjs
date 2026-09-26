import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { IMPORT_RELATIVO, extraerReferencia } from './regresion-ref.mjs'

// Un repo de juguete en memoria: la extracción se prueba sin tocar git ni el árbol real.
const ARCHIVOS = {
  'scripts/foto/entrada.mjs': "import a from './a.mjs'\nimport { b } from '../../scripts/lib/b.mjs'\nimport sharp from 'sharp'\nconst c = await import('./c.mjs')\n",
  'scripts/foto/a.mjs': "export default 1\nexport { x } from './c.mjs'\n",
  'scripts/lib/b.mjs': "import './a-lado.mjs'\nexport const b = 2\n",
  'scripts/lib/a-lado.mjs': 'export {}\n',
  'scripts/foto/c.mjs': 'export const x = 3\n'
}

test('Extrae el cierre completo y reescribe cada import relativo a su copia', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'ref-'))

  for (const d of ['scripts/foto', 'scripts/lib']) fs.mkdirSync(path.join(raiz, d), { recursive: true })
  const r = extraerReferencia({ raiz, ref: 'HEAD', entrada: 'scripts/foto/entrada.mjs', etiqueta: 'prueba', leer: rel => ARCHIVOS[rel] })

  assert.deepEqual([...r.dependencias].sort(), Object.keys(ARCHIVOS).sort())
  assert.equal(r.archivos.length, 5)

  for (const f of r.archivos) {
    const src = fs.readFileSync(f, 'utf8')

    // Ningún especificador a una copia puede quedar «pelado» (`from '.ref-…'`): Node lo tomaría por un paquete.
    for (const [, esp] of src.matchAll(/from\s*['"]([^'"]*\.ref-[^'"]*)['"]|import\s*\(\s*['"]([^'"]*\.ref-[^'"]*)['"]/g)) {
      if (esp) assert.match(esp, /^\.{1,2}\//, `${path.basename(f)} importa «${esp}» sin ./ (Node lo buscaría como paquete)`)
    }

    for (const m of src.matchAll(IMPORT_RELATIVO)) {
      assert.match(path.basename(m[3]), /^\.ref-prueba--/, `${path.basename(f)} importa ${m[3]} sin reescribir`)
      assert.ok(fs.existsSync(path.resolve(path.dirname(f), m[3])), `${m[3]} no existe junto a ${path.basename(f)}`)
    }
  }

  assert.match(fs.readFileSync(r.entrada, 'utf8'), /from 'sharp'/, 'los paquetes no se tocan')
  fs.rmSync(raiz, { recursive: true, force: true })
})
