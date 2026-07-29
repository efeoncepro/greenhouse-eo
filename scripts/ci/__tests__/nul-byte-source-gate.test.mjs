import assert from 'node:assert/strict'
import test from 'node:test'

import { inspectBytes, isTextPath } from '../nul-byte-source-gate.mjs'

const NUL = String.fromCharCode(0)

test('isTextPath cubre fuente y docs, y deja pasar lo binario por definicion', () => {
  for (const path of ['src/a.ts', 'src/a.tsx', 'docs/a.md', 'infra/a.tf', 'migrations/a.sql']) {
    assert.equal(isTextPath(path), true, path)
  }

  for (const path of ['public/a.png', 'fonts/a.woff2', 'docs/a.pdf', 'a.webm']) {
    assert.equal(isTextPath(path), false, path)
  }
})

test('isTextPath ignora el case de la extension', () => {
  assert.equal(isTextPath('docs/README.MD'), true)
})

test('inspectBytes no reporta nada en contenido limpio', () => {
  assert.equal(inspectBytes('src/clean.ts', Buffer.from("const a = '1'\n", 'utf8')), null)
})

test('inspectBytes detecta el separador NUL crudo — el caso credit-funding.ts', () => {
  // Exactamente la forma que hizo invisible el simbolo: un NUL como separador de
  // join dentro de una linea que por lo demas es UTF-8 valido.
  const source = `const key = [a, b].join('${NUL}')\n`
  const finding = inspectBytes('packages/domain/src/credit-funding.ts', Buffer.from(source, 'utf8'))

  assert.ok(finding, 'el NUL crudo debe producir hallazgo')
  assert.equal(finding.path, 'packages/domain/src/credit-funding.ts')
  assert.equal(finding.count, 1)
  assert.equal(finding.lineNumber, 1)
  assert.match(finding.context, /\[NUL\]/)
})

test('inspectBytes cuenta todos los NUL y reporta la linea del primero', () => {
  const source = `linea 1\nlinea 2\nsep ${NUL} y ${NUL} otro\nlinea 4\n`
  const finding = inspectBytes('src/multi.ts', Buffer.from(source, 'utf8'))

  assert.ok(finding)
  assert.equal(finding.count, 2)
  assert.equal(finding.lineNumber, 3)
})

test('inspectBytes deja el contexto en una sola linea legible', () => {
  const source = `antes\n${NUL}\ndespues\n`
  const finding = inspectBytes('src/ctx.ts', Buffer.from(source, 'utf8'))

  assert.ok(finding)
  assert.doesNotMatch(finding.context, /\n/, 'el contexto no debe romper el reporte en varias lineas')
})

test('la secuencia de escape es runtime-identica al byte crudo (por eso el fix no cambia ids)', () => {
  assert.equal('\0', NUL)
  assert.equal(['a', 'b'].join('\0'), ['a', 'b'].join(NUL))
})
