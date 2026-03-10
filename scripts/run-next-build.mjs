import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const latestBuildFile = path.resolve(process.cwd(), '.next-build-dir')
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

const isWindowsLocal = process.platform === 'win32' && !process.env.VERCEL
const distDir = isWindowsLocal ? path.posix.join('.next-local', `build-${Date.now()}`) : '.next'

await fs.mkdir(path.dirname(latestBuildFile), { recursive: true })
await fs.writeFile(latestBuildFile, `${distDir}\n`, 'utf8')

const tsconfigBackup = isWindowsLocal ? await fs.readFile(tsconfigFile, 'utf8') : null

try {
  await runProcess('npx', ['next', 'build'], {
    ...process.env,
    NEXT_DIST_DIR: distDir
  })
} finally {
  if (tsconfigBackup !== null) {
    await fs.writeFile(tsconfigFile, tsconfigBackup, 'utf8')
  }
}
