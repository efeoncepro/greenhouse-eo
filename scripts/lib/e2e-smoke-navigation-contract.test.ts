import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const SMOKE_DIR = path.resolve(process.cwd(), 'tests/e2e/smoke')
const RAW_PAGE_GOTO_PATTERN = /\bpage\.goto\s*\(/

async function listSmokeSpecs(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })

  const files = await Promise.all(
    entries.map(async entry => {
      const absolutePath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        return listSmokeSpecs(absolutePath)
      }

      if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
        return [absolutePath]
      }

      return []
    })
  )

  return files.flat()
}

describe('Playwright smoke navigation contract', () => {
  it('routes smoke specs through the shared transient navigation helper', async () => {
    const specs = await listSmokeSpecs(SMOKE_DIR)
    const offenders: string[] = []

    await Promise.all(
      specs.map(async spec => {
        const content = await readFile(spec, 'utf8')

        if (RAW_PAGE_GOTO_PATTERN.test(content)) {
          offenders.push(path.relative(process.cwd(), spec))
        }
      })
    )

    expect(offenders).toEqual([])
  })
})
