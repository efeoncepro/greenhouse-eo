import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const latestBuildFile = path.resolve(process.cwd(), '.next-build-dir')

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

let distDir = '.next'

try {
  distDir = (await fs.readFile(latestBuildFile, 'utf8')).trim() || distDir
} catch {
  distDir = '.next'
}

await runProcess('npx', ['next', 'start'], {
  ...process.env,
  NEXT_DIST_DIR: distDir
})
