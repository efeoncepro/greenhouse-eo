import assert from 'node:assert/strict'

import { extractToken } from '../axis-package-credential-expiry-gate.mjs'

// El caso fuente: la rotación del 2026-08-29 cambió la FORMA del secreto (de PAT
// pelado a `.npmrc` completo) y el gate empezó a pasar el blob entero como valor
// del header `Authorization`. `Headers.append` lo rechaza, el fetch tira, y el
// detector quedó ciego desde el 2026-09-01 — justo en la ventana en que tenía que
// avisar del siguiente vencimiento. Estos casos fijan la forma que el gate acepta.
const cases = [
  {
    name: '.npmrc completo — extrae el token de la línea _authToken',
    input: [
      '@efeoncepro:registry=https://npm.pkg.github.com',
      '//npm.pkg.github.com/:_authToken=ghp_ejemploDePruebaNoEsReal',
      ''
    ].join('\n'),
    assertions: result => {
      assert.equal(result, 'ghp_ejemploDePruebaNoEsReal')
    }
  },
  {
    name: '.npmrc con el orden de líneas invertido — sigue encontrando el token',
    input: [
      '//npm.pkg.github.com/:_authToken=ghp_otroEjemplo',
      '@efeoncepro:registry=https://npm.pkg.github.com'
    ].join('\n'),
    assertions: result => {
      assert.equal(result, 'ghp_otroEjemplo')
    }
  },
  {
    name: '.npmrc con CRLF — no arrastra el \\r al header',
    input: '@efeoncepro:registry=https://npm.pkg.github.com\r\n//npm.pkg.github.com/:_authToken=ghp_crlf\r\n',
    assertions: result => {
      assert.equal(result, 'ghp_crlf')
      assert.doesNotMatch(result, /\s/)
    }
  },
  {
    name: 'PAT pelado — se acepta tal cual (forma legacy del secreto)',
    input: 'ghp_patPelado',
    assertions: result => {
      assert.equal(result, 'ghp_patPelado')
    }
  },
  {
    name: 'PAT pelado con whitespace alrededor — se recorta',
    input: '  ghp_conEspacios\n',
    assertions: result => {
      assert.equal(result, 'ghp_conEspacios')
    }
  },
  {
    name: 'valor multilínea SIN la línea _authToken — null, no un header inválido',
    input: 'registry=https://npm.pkg.github.com\nalways-auth=true',
    assertions: result => {
      assert.equal(result, null)
    }
  },
  {
    name: 'vacío o ausente — null',
    input: '   \n  ',
    assertions: result => {
      assert.equal(result, null)
    }
  },
  {
    name: 'undefined — null, sin lanzar',
    input: undefined,
    assertions: result => {
      assert.equal(result, null)
    }
  },
  {
    name: 'ningún resultado conserva whitespace (la condición que rompía Headers.append)',
    input: [
      '@efeoncepro:registry=https://npm.pkg.github.com',
      '//npm.pkg.github.com/:_authToken=ghp_sinEspacios',
      'always-auth=true'
    ].join('\n'),
    assertions: result => {
      assert.equal(result, 'ghp_sinEspacios')
      // La verificación que importa: lo que sale tiene que poder ser un header.
      assert.doesNotThrow(() => new Headers({ authorization: `Bearer ${result}` }))
    }
  }
]

let passed = 0
let failed = 0

for (const testCase of cases) {
  try {
    testCase.assertions(extractToken(testCase.input))

    console.log(`  ✓ ${testCase.name}`)
    passed++
  } catch (error) {
    console.error(`  ✗ ${testCase.name}`)
    console.error(`    ${error.message}`)
    failed++
  }
}

console.log(`\n[axis-package-credential-expiry-gate.test] ${passed}/${passed + failed} passed.`)

if (failed > 0) process.exit(1)
