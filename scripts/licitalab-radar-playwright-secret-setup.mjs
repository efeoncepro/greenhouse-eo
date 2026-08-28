#!/usr/bin/env node

/** Guarda la cuenta local de LicitaLAB fuera del árbol versionado. */

import { chmod, mkdir, writeFile } from 'node:fs/promises'
import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'

import { PROJECT_ROOT } from './lib/local-env.mjs'

const execFile = promisify(execFileCallback)
const credentialsPath = `${PROJECT_ROOT}/.auth/licitalab-auth-credentials.json`

if (!process.stdin.isTTY || !process.stdin.setRawMode) {
  console.error('[LICITALAB_RADAR] El setup requiere una terminal interactiva para no exponer la clave.')
  process.exit(1)
}

try {
  await assertCredentialPathIsLocal()
  const email = await readVisible('[LICITALAB_RADAR] Correo de LicitaLAB: ')

  if (!email || !email.includes('@')) throw new Error('debes indicar un correo válido')

  const password = await readHidden('[LICITALAB_RADAR] Clave de LicitaLAB (no se mostrará): ')

  if (!password) throw new Error('la clave no puede estar vacía')

  await mkdir(`${PROJECT_ROOT}/.auth`, { recursive: true, mode: 0o700 })
  await writeFile(credentialsPath, `${JSON.stringify({ email, password }, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600
  })
  await chmod(credentialsPath, 0o600)

  console.log('[LICITALAB_RADAR] Credencial local guardada en .auth/ con permisos 0600.')
} catch (error) {
  console.error(`[LICITALAB_RADAR] No se pudo guardar la credencial: ${safeMessage(error)}`)
  process.exitCode = 1
}

async function assertCredentialPathIsLocal() {
  const localPath = '.auth/licitalab-auth-credentials.json'

  const [tracked, ignored] = await Promise.all([
    commandSucceeds('git', ['ls-files', '--error-unmatch', '--', localPath]),
    commandSucceeds('git', ['check-ignore', '--quiet', '--no-index', '--', localPath])
  ])

  if (tracked || !ignored) throw new Error('la credencial local debe permanecer ignorada y fuera del índice Git')
}

async function commandSucceeds(command, args) {
  try {
    await execFile(command, args, { cwd: PROJECT_ROOT, maxBuffer: 1024 * 1024 })
    
return true
  } catch {
    return false
  }
}

function readVisible(prompt) {
  process.stdout.write(prompt)
  process.stdin.resume()

  return new Promise((resolve, reject) => {
    let value = ''

    const cleanup = () => {
      process.stdin.pause()
      process.stdin.removeListener('data', onData)
    }

    const onData = chunk => {
      for (const char of chunk.toString()) {
        if (char === '\u0003') {
          cleanup()
          process.stdout.write('\n')
          reject(new Error('setup cancelado'))
          
return
        }

        if (char === '\r' || char === '\n') {
          cleanup()
          resolve(value.trim())
          
return
        }

        if (char === '\u007f' || char === '\b') {
          value = value.slice(0, -1)
          continue
        }

        value += char
      }
    }

    process.stdin.on('data', onData)
  })
}

function readHidden(prompt) {
  process.stdout.write(prompt)
  process.stdin.setRawMode(true)
  process.stdin.resume()

  return new Promise((resolve, reject) => {
    let value = ''

    const cleanup = () => {
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdin.removeListener('data', onData)
    }

    const onData = chunk => {
      for (const char of chunk.toString()) {
        if (char === '\u0003') {
          cleanup()
          process.stdout.write('\n')
          reject(new Error('setup cancelado'))
          
return
        }

        if (char === '\r' || char === '\n') {
          cleanup()
          process.stdout.write('\n')
          resolve(value)
          
return
        }

        if (char === '\u007f' || char === '\b') {
          value = value.slice(0, -1)
          continue
        }

        value += char
      }
    }

    process.stdin.on('data', onData)
  })
}

function safeMessage(error) {
  const value = error instanceof Error ? error.message : 'fallo no identificado'

  
return value.replace(/https?:\/\/\S+/gi, '[URL redactada]').slice(0, 240)
}
