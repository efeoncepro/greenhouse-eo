/** Synthetic static email preview. No provider call, live token, person or code. */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { render } from '@react-email/render'
import { chromium } from 'playwright'

import RoomsInvitationOtpEmail from '../../src/emails/RoomsInvitationOtpEmail'

async function main() {
  const directory = resolve('.captures/task-2067-email-preview')

  await mkdir(directory, { recursive: true })

  const html = await render(<RoomsInvitationOtpEmail invitationUrl='https://rooms.example.test/invite#token=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
    roomLabel='Sala de ejemplo' code='123456' expiresInMinutes={10} />)

  await writeFile(resolve(directory, 'synthetic-preview.html'), html)
  const browser = await chromium.launch({ headless: true })
  const evidence: unknown[] = []

  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 1 })
      const errors: string[] = []

      page.on('pageerror', error => errors.push(error.name))
      await page.setContent(html, { waitUntil: 'networkidle' })

      const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth, brokenImages: [...document.images].filter(img => !img.complete || img.naturalWidth === 0).length }))

      await page.screenshot({ path: resolve(directory, `${width}.png`), fullPage: true })
      evidence.push({ width, ...metrics, pageErrors: errors })
      if (metrics.scrollWidth > width || metrics.brokenImages > 0 || errors.length > 0) throw new Error('Email preview quality gate failed')
      await page.close()
    }
  } finally { await browser.close() }

  await writeFile(resolve(directory, 'evidence.json'), JSON.stringify(evidence, null, 2))
  process.stdout.write(`Synthetic email preview verified: ${directory}\n`)
}

void main()
