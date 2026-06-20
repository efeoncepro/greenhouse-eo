import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

import {
  getNextBuildTarget,
  pruneOldIsolatedBuilds,
  shouldUseIsolatedNextDist,
  writeLatestBuildPointer
} from './next-dist-dir.mjs'

const tsconfigFile = path.resolve(process.cwd(), 'tsconfig.json')

const runProcess = (command, args, env) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env
    })

    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) {
        resolve()

        return
      }

      reject(new Error(`${command} exited with code ${code}`))
    })
  })

const { distDir, buildId } = getNextBuildTarget()

await fs.mkdir(path.resolve(process.cwd(), distDir), { recursive: true })
const tsconfigBackup = shouldUseIsolatedNextDist() ? await fs.readFile(tsconfigFile, 'utf8') : null
let tsconfigRestored = false

const restoreTsconfig = async () => {
  if (tsconfigBackup === null || tsconfigRestored) {
    return
  }

  tsconfigRestored = true
  await fs.writeFile(tsconfigFile, tsconfigBackup, 'utf8')
}

if (tsconfigBackup !== null) {
  process.on('SIGINT', () => {
    void restoreTsconfig().finally(() => process.exit(130))
  })

  process.on('SIGTERM', () => {
    void restoreTsconfig().finally(() => process.exit(143))
  })
}

// Heap ceiling para `next build`. Sin esto el build hace OOM
// (`Ineffective mark-compacts near heap limit`) de forma sistemática cuando pnpm
// corre bajo un Node con old-space chico — caso típico: Volta ata `pnpm` a Node
// 20 (`volta list` → `pnpm / node@20.20.1`) aunque el runtime default sea mayor.
// El grafo de build de esta app no entra en el heap default. Espeja el
// `--max-old-space-size=8192` que `local:check` ya aplica a `tsc`. Preserva un
// NODE_OPTIONS existente (no lo pisa) y es independiente de la versión de Node.
const HEAP_FLAG = '--max-old-space-size=8192'
const existingNodeOptions = process.env.NODE_OPTIONS ?? ''

const nextBuildNodeOptions = existingNodeOptions.includes('--max-old-space-size')
  ? existingNodeOptions
  : `${existingNodeOptions} ${HEAP_FLAG}`.trim()

try {
  await runProcess('npx', ['next', 'build'], {
    ...process.env,
    NODE_OPTIONS: nextBuildNodeOptions,
    NEXT_DIST_DIR: distDir
  })

  await writeLatestBuildPointer({ distDir, buildId })
  await pruneOldIsolatedBuilds()
} finally {
  await restoreTsconfig()
}
