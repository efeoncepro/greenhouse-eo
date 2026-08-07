#!/usr/bin/env node

/** Guarda la credencial local de Playwright fuera del árbol versionado. */

import { chmod, mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

import { PROJECT_ROOT } from './lib/local-env.mjs'

const CREDENTIALS_PATH = `${PROJECT_ROOT}/.auth/gcloud-auth-credentials.json`

const email = process.env.GCLOUD_AUTH_PLAYWRIGHT_EMAIL || readActiveAccount()

if (!email) {
  console.error('[GCLOUD_AUTH] No pude resolver la cuenta activa. Define GCLOUD_AUTH_PLAYWRIGHT_EMAIL y repite.')
  process.exit(1)
}

if (!process.stdin.isTTY || !process.stdin.setRawMode) {
  console.error('[GCLOUD_AUTH] Este setup requiere una terminal interactiva para no exponer la clave.')
  process.exit(1)
}

try {
  const password = await readHidden('[GCLOUD_AUTH] Introduce la clave de Google (no se mostrará): ')

  if (!password) {
    throw new Error('la clave no puede estar vacía')
  }

  await mkdir(`${PROJECT_ROOT}/.auth`, { recursive: true })
  await writeFile(CREDENTIALS_PATH, `${JSON.stringify({ email, password }, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600
  })
  await chmod(CREDENTIALS_PATH, 0o600)

  console.log('[GCLOUD_AUTH] Credencial local guardada en .auth/ con permisos 0600.')
} catch (error) {
  console.error(`[GCLOUD_AUTH] No se pudo guardar la credencial: ${error instanceof Error ? error.message : 'fallo no identificado'}`)
  process.exitCode = 1
}

function readActiveAccount() {
  try {
    const account = execFileSync('gcloud', ['config', 'get-value', 'account'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()

    return account && account !== '(unset)' ? account : null
  } catch {
    return null
  }
}

function readHidden(prompt) {
  const stdin = process.stdin
  const stdout = process.stdout

  stdout.write(prompt)
  stdin.setRawMode(true)
  stdin.resume()

  return new Promise((resolve, reject) => {
    let value = ''

    const cleanup = () => {
      stdin.setRawMode(false)
      stdin.pause()
      stdin.removeListener('data', onData)
    }

    const onData = chunk => {
      for (const char of chunk.toString()) {
        if (char === '\u0003') {
          cleanup()
          stdout.write('\n')
          reject(new Error('setup cancelado'))

          return
        }

        if (char === '\r' || char === '\n') {
          cleanup()
          stdout.write('\n')
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

    stdin.on('data', onData)
  })
}
