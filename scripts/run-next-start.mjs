import { spawn } from 'node:child_process'

import { resolveLatestStartDistDir } from './next-dist-dir.mjs'

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

const distDir = await resolveLatestStartDistDir()

await runProcess('npx', ['next', 'start'], {
  ...process.env,
  NEXT_DIST_DIR: distDir
})
