import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import test from 'node:test'

import { MARCA_SUITE, REPO, RUTA_MODULO, dentroDelRepo, marcaDeSuite, tomarBloqueo } from './cta-integridad.mjs'

const carpeta = () => fs.mkdtempSync(path.join(os.tmpdir(), 'foto-bloqueo-'))

// macOS y Linux no asignan un pid tan alto: el proceso de ese bloqueo está muerto.
const PID_MUERTO = 4_000_000

test('Reclamar un bloqueo muerto deja un solo dueño: sin el reclamo, nadie lo borra', () => {
  const dir = carpeta()
  const lock = path.join(dir, '.componer.lock')

  fs.writeFileSync(lock, String(PID_MUERTO))
  // Otro proceso VIVO está reclamando ese mismo bloqueo muerto (se simula con el reclamo a nombre de este proceso).
  fs.writeFileSync(`${lock}.reclamo`, String(process.pid))

  assert.throws(() => tomarBloqueo(dir), /no se pudo tomar el bloqueo/)
  assert.equal(fs.readFileSync(lock, 'utf8'), String(PID_MUERTO), 'mientras otro reclama, el bloqueo muerto no se toca')

  // Sin reclamo en curso, el bloqueo muerto se reclama y queda a nombre de este proceso.
  fs.rmSync(`${lock}.reclamo`)
  const soltar = tomarBloqueo(dir)

  assert.equal(fs.readFileSync(lock, 'utf8'), String(process.pid))
  soltar()
  assert.equal(fs.existsSync(lock), false)
  fs.rmSync(dir, { recursive: true, force: true })
})

test('Ctrl-C suelta el bloqueo: un proceso interrumpido no deja la carpeta tomada', async () => {
  const dir = carpeta()
  const lock = path.join(dir, '.componer.lock')
  const hijo = spawn(process.execPath, ['--input-type=module', '-e', `import { tomarBloqueo } from ${JSON.stringify(RUTA_MODULO)}; tomarBloqueo(${JSON.stringify(dir)}); console.log('listo'); setTimeout(() => {}, 15000)`], { stdio: ['ignore', 'pipe', 'inherit'] })

  await new Promise((ok, mal) => {
    hijo.stdout.on('data', d => { if (String(d).includes('listo')) ok() })
    hijo.on('exit', () => mal(new Error('el proceso hijo terminó antes de tomar el bloqueo')))
  })
  assert.equal(fs.existsSync(lock), true)
  const salida = new Promise(ok => hijo.on('exit', (codigo, senal) => ok({ codigo, senal })))

  hijo.kill('SIGINT')
  const { codigo } = await salida

  assert.equal(codigo, 130, 'sale con el código de Ctrl-C')
  assert.equal(fs.existsSync(lock), false, 'y sin dejar el bloqueo')
  fs.rmSync(dir, { recursive: true, force: true })
})

test('Un bloqueo VACÍO huérfano se reclama; uno recién creado no se pisa, y el error nombra el archivo', () => {
  const dir = carpeta()
  const lock = path.join(dir, '.componer.lock')
  const viejo = new Date(Date.now() - 60e3)

  // Vacío y recién creado: otro proceso lo está escribiendo. No se pisa, y el error dice qué archivo y qué hacer.
  fs.writeFileSync(lock, '')
  assert.throws(() => tomarBloqueo(dir), e => /\.componer\.lock` sigue tomado y vacío/.test(e.message) && /bórralo/.test(e.message))

  // Vacío y viejo: su proceso murió entre crearlo y escribir el pid. Se reclama.
  fs.utimesSync(lock, viejo, viejo)
  const soltar = tomarBloqueo(dir)

  assert.equal(fs.readFileSync(lock, 'utf8'), String(process.pid))
  soltar()

  // Un RECLAMO vacío y viejo tampoco deja la carpeta tomada.
  fs.writeFileSync(lock, String(PID_MUERTO))
  fs.writeFileSync(`${lock}.reclamo`, '')
  fs.utimesSync(`${lock}.reclamo`, viejo, viejo)
  const soltar2 = tomarBloqueo(dir)

  assert.equal(fs.readFileSync(lock, 'utf8'), String(process.pid))
  soltar2()
  fs.rmSync(dir, { recursive: true, force: true })
})

test('La ruta REAL decide si un plan está en el repo: otras mayúsculas o un enlace no lo sacan', () => {
  const dentro = path.join(REPO, 'scripts/foto/cta-integridad.mjs')
  const dir = carpeta()
  const enlace = path.join(dir, 'enlace')

  assert.equal(dentroDelRepo(dentro), true)
  // En macOS el sistema de archivos no distingue mayúsculas: /USERS/… es el mismo repo.
  if (process.platform === 'darwin') assert.equal(dentroDelRepo(dentro.toUpperCase()), true, 'con otras mayúsculas sigue dentro')
  fs.symlinkSync(path.join(REPO, 'scripts/foto'), enlace)
  assert.equal(dentroDelRepo(path.join(enlace, 'cta-integridad.mjs')), true, 'por un enlace sigue dentro')
  assert.equal(dentroDelRepo(path.join(dir, 'piezas.json')), false)
  fs.rmSync(dir, { recursive: true, force: true })
})

test('La marca de la suite vale sólo con el valor que exporta la suite, en la carpeta del plan o más arriba', () => {
  const dir = carpeta()
  const sub = path.join(dir, 'a', 'b')
  const antes = process.env.FOTO_SUITE_NONCE

  fs.mkdirSync(sub, { recursive: true })

  try {
    process.env.FOTO_SUITE_NONCE = 'x'.repeat(48)
    assert.equal(marcaDeSuite(sub), false, 'sin marca')
    fs.writeFileSync(path.join(dir, MARCA_SUITE), 'y'.repeat(48))
    assert.equal(marcaDeSuite(sub), false, 'con otro valor')
    fs.writeFileSync(path.join(dir, MARCA_SUITE), 'x'.repeat(48))
    assert.equal(marcaDeSuite(sub), true, 'con el valor de la suite, en una carpeta superior')
    process.env.FOTO_SUITE_NONCE = 'corto'
    fs.writeFileSync(path.join(dir, MARCA_SUITE), 'corto')
    assert.equal(marcaDeSuite(sub), false, 'un valor corto no vale')
    delete process.env.FOTO_SUITE_NONCE
    assert.equal(marcaDeSuite(sub), false, 'sin el valor en el entorno')
  } finally {
    if (antes === undefined) delete process.env.FOTO_SUITE_NONCE
    else process.env.FOTO_SUITE_NONCE = antes
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
