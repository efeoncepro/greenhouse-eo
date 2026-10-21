#!/usr/bin/env tsx
/**
 * pnpm ai:listen — Gemini escucha o mira archivos y critica (QA de sonido, sincronía, impacto y cierre).
 * Con --findings devuelve hallazgos estructurados; con --verify los contrasta con ffmpeg.
 */
import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { config as loadEnv } from 'dotenv'

import { analyzeMedia, cleanupStaged, countMediaTokens, prepareMedia } from '@/lib/ai/gemini-media-analysis'
import {
  buildFindingsSchema,
  composePrompt,
  estimateFrames,
  type FindingsReport,
  GEMINI_MEDIA_FRAME_BUDGET,
  isGcsUri,
  kindForPath,
  LISTEN_USAGE,
  parseCues,
  parseListenArgs,
  shortHash
} from '@/lib/ai/gemini-media-analysis-cli'
import { GEMINI_MEDIA_PRESETS } from '@/lib/ai/gemini-media-presets'
import { collectMeasurements, type Measurements, verifyCues, verifyFinding } from '@/lib/ai/gemini-media-verify'

loadEnv({ path: join(process.cwd(), '.env.local'), quiet: true })

const probeDuration = (path: string) => {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], { encoding: 'utf8' })
  const value = Number(result.stdout.trim())

  return Number.isFinite(value) ? value : undefined
}

const main = async () => {
  const argv = process.argv.slice(2)

  if (argv.includes('--help') || argv.length === 0) {
    console.log(LISTEN_USAGE)

    return
  }

  const args = parseListenArgs(argv)
  const preset = args.preset ? GEMINI_MEDIA_PRESETS[args.preset] : undefined
  const hasVideo = args.files.some(file => kindForPath(file) === 'video')

  const thinking = args.thinking ?? preset?.defaults.thinking ?? 'medium'
  const fps = args.agentic || !hasVideo ? undefined : (args.fps ?? (preset?.defaults as { fps?: number } | undefined)?.fps)
  const resolution = args.resolution ?? (preset?.defaults as { resolution?: 'low' | 'medium' | 'high' } | undefined)?.resolution
  const controls = { fps, clip: args.clip, resolution, agentic: args.agentic, model: args.model }

  for (const warning of args.warnings) console.error(`  ⚠ ${warning}`)

  for (const file of args.files.filter(f => kindForPath(f) === 'video' && !isGcsUri(f))) {
    const duration = probeDuration(file)
    const frames = duration ? estimateFrames(duration, fps ?? 1, args.clip) : 0

    if (frames > GEMINI_MEDIA_FRAME_BUDGET) {
      console.error(`  ⚠ ${file}: Gemini mirará ~${frames} cuadros (${fps ?? 1} fps). Es una consulta cara; acota con --clip o baja --fps.`)
    }
  }

  const userPrompt = args.prompt ?? (args.promptFile ? await readFile(args.promptFile, 'utf8') : undefined)
  const cues = args.cues ? parseCues(JSON.parse(await readFile(args.cues, 'utf8'))) : undefined
  const prompt = composePrompt({ preset: args.preset, userPrompt, clip: args.clip, cues, files: args.files, findings: args.findings })
  const schema = args.findings ? buildFindingsSchema(Boolean(cues)) : undefined

  const prepared = await prepareMedia(args.files, args.gcs)

  try {
    const onRetry = (attempt: number, waitMs: number) => console.error(`  ↻ error transitorio de Vertex (429/503): reintento ${attempt} en ${waitMs / 1000} s. Si persiste, usa --model gemini-3.1-pro-preview o gemini-3.5-flash.`)
    const request = { ...controls, thinking, prompt, schema, onRetry }

    const meta = {
      model: args.model,
      thinking,
      preset: args.preset ? `${args.preset}@${preset?.version}` : null,
      promptHash: shortHash(prompt),
      fps: fps ?? (args.agentic ? null : 1),
      clip: args.clip ?? null,
      resolution: resolution ?? 'default',
      processing: args.agentic ? 'agentic' : 'static',
      files: prepared.hashes.length ? prepared.hashes : args.files.map(path => ({ path, sha256: null }))
    }

    if (args.countTokens) {
      const tokens = await countMediaTokens(prepared.sources, request)
      const output = args.json ? JSON.stringify({ meta, inputTokens: tokens }, null, 2) : `${tokens} tokens de entrada`

      console.log(output)

      return
    }

    console.error(`→ ${args.model} · thinking ${thinking} · ${meta.processing}${fps ? ` · ${fps} fps` : ''}${args.clip ? ` · ${args.clip.start}–${args.clip.end} s` : ''} · ${args.files.length} archivo(s)`)
    const result = await analyzeMedia(prepared.sources, request)

    console.error(`  ✓ ${result.latencyMs} ms · in ${result.usage.inputTokens} · think ${result.usage.thoughtTokens} · out ${result.usage.outputTokens}`)
    const fullMeta = { ...meta, usage: result.usage, latencyMs: result.latencyMs }

    if (!args.findings) {
      const output = args.json ? JSON.stringify({ meta: fullMeta, text: result.text }, null, 2) : result.text

      if (args.out) await writeFile(args.out, output + '\n')
      console.log(output)

      return
    }

    const report = JSON.parse(result.text) as FindingsReport
    let measurements: Measurements | undefined

    if (args.verify) {
      const localAudio = args.files.find(f => kindForPath(f) === 'audio' && !isGcsUri(f))
      const localVideo = args.files.find(f => kindForPath(f) === 'video' && !isGcsUri(f))

      if (!localAudio && !localVideo) console.error('  ⚠ --verify necesita archivos locales: con sólo gs:// no se mide.')
      else {
        try {
          measurements = collectMeasurements({ audioPath: localAudio ?? localVideo, videoPath: localVideo })
        } catch (error) {
          console.error(`  ⚠ No se pudo medir: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      if (args.files.filter(f => kindForPath(f) === 'video').length > 1) console.error('  ⚠ Con varios videos, --verify mide sólo el primero.')
    }

    const hallazgos = report.hallazgos.map(finding => ({ ...finding, verificacion: measurements ? verifyFinding(finding, measurements) : undefined }))
    const cuesMedidos = measurements && cues ? verifyCues(cues, measurements) : undefined
    const final = { meta: fullMeta, ...report, hallazgos, cuesMedidos }

    if (args.out) await writeFile(args.out, JSON.stringify(final, null, 2) + '\n')

    if (args.json) {
      console.log(JSON.stringify(final, null, 2))

      return
    }

    console.log(`\n${report.resumen}`)
    if (report.puntajes) console.log(`Puntajes: ${Object.entries(report.puntajes).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
    console.log('\nHallazgos:')

    for (const h of hallazgos) {
      const span = h.t_fin !== undefined ? `${h.t.toFixed(2)}–${h.t_fin.toFixed(2)}` : h.t.toFixed(2)
      const mark = h.verificacion ? ` → ${h.verificacion.estado.toUpperCase()} (${h.verificacion.medido})` : ''

      console.log(`  ${span.padEnd(11)} ${h.tipo.padEnd(13)} ${h.severidad.padEnd(5)} ${h.afirmacion}${mark}`)
    }

    if (report.cues?.length) {
      console.log('\nCues según Gemini:')
      for (const c of report.cues) console.log(`  ${c.t.toFixed(2).padEnd(6)} ${c.veredicto.padEnd(7)} ${c.nota}`)
    }

    if (cuesMedidos?.length) {
      console.log('\nCues medidos con ffmpeg (independiente de Gemini):')
      for (const c of cuesMedidos) console.log(`  ${c.cue.toFixed(2).padEnd(6)} ${c.kind.padEnd(9)} ${c.estado.toUpperCase().padEnd(11)} ${c.medido}`)
    }

    if (measurements) {
      const verified = hallazgos.filter(h => h.verificacion && ['confirmado', 'refutado'].includes(h.verificacion.estado))
      const refuted = verified.filter(h => h.verificacion?.estado === 'refutado').length

      console.log(`\nVerificación: ${verified.length - refuted} confirmados · ${refuted} refutados · ${hallazgos.length - verified.length} de juicio o sin datos.`)
    }

    if (args.out) console.error(`  → ${args.out}`)
  } finally {
    if (prepared.staged.length && !args.keepGcs) cleanupStaged(prepared.staged)
  }
}

main().catch(error => {
  console.error(`FATAL: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
