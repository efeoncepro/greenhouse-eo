import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const paths = process.argv.slice(2)

if (paths.length === 0) {
  console.error('Usage: node scripts/clean-paths.mjs <path> [...paths]')
  process.exit(1)
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const runProcess = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'ignore',
      windowsHide: true
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

const removePathWindows = async absoluteTarget => {
  const quotedPath = `"${absoluteTarget.replaceAll('"', '""')}"`
  const command = `if exist ${quotedPath} (rmdir /s /q ${quotedPath} || del /f /q ${quotedPath})`

  await runProcess('cmd.exe', ['/d', '/s', '/c', command])
}

const removePath = async target => {
  const absoluteTarget = path.resolve(process.cwd(), target)

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      if (process.platform === 'win32') {
        await removePathWindows(absoluteTarget)
      } else {
        await fs.rm(absoluteTarget, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 250
        })
      }

      return
    } catch (error) {
      const isRetryable =
        error &&
        typeof error === 'object' &&
        'code' in error &&
        ['EPERM', 'EBUSY', 'ENOTEMPTY'].includes(error.code)

      if (!isRetryable || attempt === 10) {
        throw error
      }

      await sleep(400 * attempt)
    }
  }
}

for (const target of paths) {
  await removePath(target)
}
