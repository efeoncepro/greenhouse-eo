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

try {
  await runProcess('npx', ['next', 'build'], {
    ...process.env,
    NEXT_DIST_DIR: distDir
  })

  await writeLatestBuildPointer({ distDir, buildId })
  await pruneOldIsolatedBuilds()
} finally {
  await restoreTsconfig()
}
