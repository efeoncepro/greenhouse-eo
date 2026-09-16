/**
 * Canary facturable de GPT Image 2.5 — TASK-1851 Slice 4.
 *
 * OpenAI declara que la calculadora de GPT Image 2 NO estima el consumo de 2.5 y que tarifas por token
 * iguales no implican costo por imagen igual. La única vía documentada es leer `usage` de respuestas
 * reales, que es lo que hace este script. Corre EN SERIE y persiste lo que el API resolvió, no lo pedido.
 *
 * Uso:  npx tsx --require ./scripts/lib/server-only-shim.cjs <este archivo> <caseId...>
 */
import { appendFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { config } from 'dotenv'

config({ path: '.env.local' })

const PROMPT =
  'A flat-style vector illustration of a single potted plant, centered, on a plain neutral background. ' +
  'Soft even lighting, muted green and terracotta palette. No text, no lettering, no logos, no people.'

const TRANSPARENT_PROMPT =
  'A flat-style vector illustration of a single potted plant, isolated subject, fully transparent background. ' +
  'No backdrop, no solid background, no checkerboard, no drop shadow. No text, no lettering, no logos, no people.'

type Case = {
  id: string
  model: 'gpt-image-2.5-flare' | 'gpt-image-2.5-sunburst'
  quality: 'low' | 'high' | 'max'
  background?: 'transparent'
}

const CASES: Case[] = [
  { id: 'flare-low', model: 'gpt-image-2.5-flare', quality: 'low' },
  { id: 'flare-high', model: 'gpt-image-2.5-flare', quality: 'high' },
  { id: 'flare-max', model: 'gpt-image-2.5-flare', quality: 'max' },
  { id: 'sunburst-low', model: 'gpt-image-2.5-sunburst', quality: 'low' },
  { id: 'sunburst-high', model: 'gpt-image-2.5-sunburst', quality: 'high' },
  { id: 'sunburst-max', model: 'gpt-image-2.5-sunburst', quality: 'max' },
  { id: 'flare-transparent', model: 'gpt-image-2.5-flare', quality: 'high', background: 'transparent' }
]

const OUT_DIR = join(process.cwd(), 'ai-generations', '2026-09-16_gpt-image-2-5-usage-baseline')

const run = async () => {
  const selected = process.argv.slice(2)
  const cases = selected.length ? CASES.filter(c => selected.includes(c.id)) : CASES

  if (!cases.length) {
    console.error(`No case matched. Valid ids: ${CASES.map(c => c.id).join(', ')}`)
    process.exit(1)
  }

  const { generateOpenAIImage } = await import('@/lib/ai/openai-image')
  const sharp = (await import('sharp')).default

  for (const testCase of cases) {
    const started = Date.now()

    try {
      const result = await generateOpenAIImage({
        prompt: testCase.background ? TRANSPARENT_PROMPT : PROMPT,
        model: testCase.model,
        size: '1024x1024',
        quality: testCase.quality,
        format: 'png',
        background: testCase.background,
        timeoutMs: 280_000
      })

      const buffer = Buffer.from(result.imageBytesBase64, 'base64')
      const meta = await sharp(buffer).metadata()

      // Alfa verificada desde los bytes decodificados, nunca por metadata ni por ver un checkerboard.
      let alpha: { hasAlphaChannel: boolean; hasNonOpaquePixel: boolean } | null = null

      if (testCase.background === 'transparent') {
        const raw = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
        let nonOpaque = false

        for (let i = 3; i < raw.data.length; i += raw.info.channels) {
          if (raw.data[i] < 255) { nonOpaque = true; break }
        }

        alpha = { hasAlphaChannel: (meta.channels ?? 0) === 4, hasNonOpaquePixel: nonOpaque }
      }

      const row = {
        caseId: testCase.id,
        requested: { model: testCase.model, quality: testCase.quality, size: '1024x1024', background: testCase.background ?? null },
        resolvedByApi: { model: result.model, quality: result.quality, size: result.size, background: result.background },
        usage: result.usage,
        alpha,
        image: { bytes: buffer.length, width: meta.width, height: meta.height, channels: meta.channels },
        latencyMs: Date.now() - started,
        observedAt: new Date().toISOString()
      }

      appendFileSync(join(OUT_DIR, 'runs.jsonl'), `${JSON.stringify(row)}\n`)
      writeFileSync(join(OUT_DIR, `${testCase.id}.png`), buffer)
      console.log(JSON.stringify(row, null, 2))
    } catch (error) {
      const e = error as Error & { status?: number }
      const row = { caseId: testCase.id, outcome: 'failed', status: e.status ?? null, message: e.message?.slice(0, 400), observedAt: new Date().toISOString() }

      appendFileSync(join(OUT_DIR, 'runs.jsonl'), `${JSON.stringify(row)}\n`)
      console.error(JSON.stringify(row, null, 2))

      // Ante 429 o cualquier fallo, detener la serie: nunca reintentar en bucle contra un gasto.
      process.exit(1)
    }
  }
}

void run()
