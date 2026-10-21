#!/usr/bin/env tsx
/**
 * pnpm ai:listen — Gemini escucha o mira archivos locales y responde.
 * Uso típico: QA de una mezcla de sonido contra su video y su hoja de cues.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { config as loadEnv } from 'dotenv'

import { analyzeMediaWithGemini } from '@/lib/ai/gemini-media-analysis'
import { LISTEN_USAGE, parseListenArgs } from '@/lib/ai/gemini-media-analysis-cli'

loadEnv({ path: join(process.cwd(), '.env.local'), quiet: true })

const main = async () => {
  const argv = process.argv.slice(2)

  if (argv.includes('--help') || argv.length === 0) {
    console.log(LISTEN_USAGE)

    return
  }

  const args = parseListenArgs(argv)
  const prompt = args.prompt ?? (await readFile(args.promptFile as string, 'utf8'))

  console.error(`→ ${args.model} · ${args.files.length} archivo(s)`)
  const result = await analyzeMediaWithGemini({ files: args.files, prompt, model: args.model, temperature: args.temperature })

  console.error(`  ✓ ${result.latencyMs} ms · in ${result.usage.inputTokens} · out ${result.usage.outputTokens}`)
  const output = args.json ? JSON.stringify(result, null, 2) : result.text

  if (args.out) {
    await writeFile(args.out, output + '\n')
    console.error(`  → ${args.out}`)
  }

  console.log(output)
}

main().catch(error => {
  console.error(`FATAL: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
