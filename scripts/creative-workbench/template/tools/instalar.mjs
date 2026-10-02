// pnpm instalar — instala dependencias con una credencial EFÍMERA para los paquetes privados de AXIS.
//
// La credencial sale de `gh auth token`, vive en un userconfig temporal fuera del repo mientras corre
// `pnpm install` y se borra al terminar, incluso si la instalación falla. Nunca queda en disco.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { ROOT } from './lib.mjs'

const token = spawnSync('gh', ['auth', 'token'], { encoding: 'utf8' })

if (token.status !== 0 || !token.stdout.trim()) {
  console.error('✗ No hay sesión de GitHub CLI. Corre `gh auth login` y `gh auth refresh -s read:packages`.')
  process.exit(1)
}

const dir = mkdtempSync(path.join(os.tmpdir(), 'workbench-npmrc-'))
const userconfig = path.join(dir, 'npmrc')
let status = 1

try {
  writeFileSync(userconfig, `//npm.pkg.github.com/:_authToken=${token.stdout.trim()}\n`, { mode: 0o600 })
  const extra = process.argv.slice(2)
  const args = extra.length ? ['install', ...extra] : ['install', '--frozen-lockfile']

  status =
    spawnSync('pnpm', args, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, NPM_CONFIG_USERCONFIG: userconfig } })
      .status ?? 1
} finally {
  rmSync(dir, { recursive: true, force: true })
}

process.exit(status)
