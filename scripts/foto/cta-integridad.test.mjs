import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import test from 'node:test'

import { RUTA_MODULO, tomarBloqueo } from './cta-integridad.mjs'

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
