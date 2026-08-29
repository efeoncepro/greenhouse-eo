#!/usr/bin/env tsx

import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

import { chromium } from 'playwright'

const liveUrl = 'https://efeoncepro.com/servicios/agencia-de-influencers/'
const outputDirectory = resolve('.captures', 'task1598-influencer-seo')
const outputPath = resolve(outputDirectory, 'agencia-influencers-efeonce-og-1200x630.png')

const main = async () => {
  await mkdir(outputDirectory, { recursive: true })

  const browser = await chromium.launch({ headless: true })

  try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce'
  })

  const response = await page.goto(`${liveUrl}?og-capture=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000
  })

  if (response?.status() !== 200) throw new Error(`Expected HTTP 200, received ${response?.status()}`)

  await page.locator('body.page-id-251627[data-fidelity-runtime="1"]').waitFor({ timeout: 30_000 })
  await page.locator('#hero-video').waitFor({ state: 'visible', timeout: 20_000 })
  await page.evaluate(() => {
    const video = document.querySelector('#hero-video') as HTMLVideoElement | null

    video?.pause()
  })
  await page.waitForTimeout(1_000)
  await page.screenshot({ path: outputPath, type: 'png' })

  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    height: window.innerHeight,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }))

  if (dimensions.width !== 1200 || dimensions.height !== 630 || dimensions.overflow !== 0) {
    throw new Error(`Unexpected OG capture contract: ${JSON.stringify(dimensions)}`)
  }

    console.log(JSON.stringify({ status: 'ok', outputPath, ...dimensions }, null, 2))
  } finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
