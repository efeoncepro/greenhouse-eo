import 'server-only'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join } from 'node:path'
import { spawn } from 'node:child_process'

import { config as loadEnv } from 'dotenv'

import {
  generateOpenAIImage,
  type OpenAIImageBackground,
  type OpenAIImageModel,
  type OpenAIImageQuality,
  type OpenAIImageSize
} from '@/lib/ai/openai-image'

// Self-contained: load .env.local so OPENAI_API_KEY_SECRET_REF resolves without manual sourcing.
loadEnv({ path: join(process.cwd(), '.env.local') })

/**
 * Greenhouse AI image CLI — generate images with OpenAI gpt-image-2 (default).
 *
 * Canonical entry point: src/lib/ai/openai-image.ts (`generateOpenAIImage`). This CLI is
 * the operational wrapper around it (flexible out path + timeout + batch). For repo-bound
 * product assets prefer the runtime helper `src/lib/ai/image-generator.ts`; this CLI is for
 * operator/agent-driven generation (concepts, mockup fixtures, icon/asset batches).
 *
 * Usage:
 *   pnpm ai:image --prompt "a teal orbital mark, flat vector, transparent" [options]
 *   pnpm ai:image --prompt-file ./prompt.txt --out public/images/generated/mark.png
 *   pnpm ai:image --batch ./concepts.json   # [{ "filename": "a.png", "prompt": "…" }, …]
 *
 * Options (all optional unless noted):
 *   --prompt <text>         Prompt text (required unless --prompt-file or --batch)
 *   --prompt-file <path>    Read the prompt from a file (long prompts)
 *   --batch <path>          JSON array of { filename, prompt } — generates each
 *   --out <path>            Output file path (single prompt). Default: <out-dir>/<slug>-<ts>.png
 *   --out-dir <dir>         Output directory. Default: public/images/generated
 *   --size <WxH>            1024x1024 | 1536x1024 | 1024x1536 | 2048x... (default 1536x1024)
 *   --quality <q>           low | medium | high | auto (default high)
 *   --background <b>        opaque | transparent (default opaque; transparent → gpt-image-1.5)
 *   --model <m>             gpt-image-2 | gpt-image-1.5 | gpt-image-1 | gpt-image-1-mini (default gpt-image-2)
 *   --count <n>             Images per prompt (default 1)
 *   --timeout <ms>          Per-image timeout (default 280000; gpt-image-2 high can exceed 125s)
 *   --open                  Open the result(s) in the default viewer (macOS `open`)
 *   --help                  Show this help
 */

const DEFAULT_OUT_DIR = join(process.cwd(), 'public', 'images', 'generated')

const CONCEPTS_DIR = join(process.cwd(), '.captures', 'concepts')

interface CliArgs {
  prompt?: string
  promptFile?: string
  batch?: string
  out?: string
  outDir?: string
  concept?: string
  task?: string
  size: OpenAIImageSize
  quality: OpenAIImageQuality
  background: OpenAIImageBackground
  model: OpenAIImageModel
  count: number
  timeoutMs: number
  open: boolean
  help: boolean
}

const HELP = `Greenhouse AI image CLI — OpenAI gpt-image-2

  pnpm ai:image --prompt "<text>" [--out <path>] [--size 1536x1024] [--quality high]
                [--background opaque|transparent] [--model gpt-image-2] [--count 1]
                [--timeout 280000] [--open]
  pnpm ai:image --prompt-file <path> ...
  pnpm ai:image --batch <json>          # [{ "filename": "a.png", "prompt": "…" }, …]
  pnpm ai:image --concept <loop> --batch <json> [--task TASK-###]   # conceptos del design-loop

Concept mode:
  --concept <loop>   Rutea a .captures/concepts/<loop>/ (gitignored, trazable, protegido
                     del GC) y escribe manifest.json. Para product-design-loop. Prioridad
                     sobre --out-dir. Aparece en \`pnpm fe:capture:index\` por loop.
  --task <id>        Tag de work-item (TASK-###/ISSUE-###) registrado en el manifest.

Defaults: model gpt-image-2 · size 1536x1024 · quality high · background opaque · out-dir public/images/generated
Requires OPENAI_API_KEY_SECRET_REF (or OPENAI_API_KEY) — resolved server-side, never printed.`

const parseArgs = (argv: string[]): CliArgs => {
  const args: CliArgs = {
    size: '1536x1024',
    quality: 'high',
    background: 'opaque',
    model: 'gpt-image-2',
    count: 1,
    timeoutMs: 280_000,
    open: false,
    help: false
  }

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    const next = () => argv[(i += 1)]

    switch (token) {
      case '--prompt':
        args.prompt = next()
        break
      case '--prompt-file':
        args.promptFile = next()
        break
      case '--batch':
        args.batch = next()
        break
      case '--out':
        args.out = next()
        break
      case '--out-dir':
        args.outDir = next()
        break
      case '--concept':
        args.concept = next()
        break
      case '--task':
        args.task = next()
        break
      case '--size':
        args.size = next() as OpenAIImageSize
        break
      case '--quality':
        args.quality = next() as OpenAIImageQuality
        break
      case '--background':
        args.background = next() as OpenAIImageBackground
        break
      case '--model':
        args.model = next() as OpenAIImageModel
        break
      case '--count':
        args.count = Math.max(1, Number(next()) || 1)
        break
      case '--timeout':
        args.timeoutMs = Math.max(10_000, Number(next()) || 280_000)
        break
      case '--open':
        args.open = true
        break
      case '--help':
      case '-h':
        args.help = true
        break
      default:
        throw new Error(`Unknown argument: ${token}`)
    }
  }

  return args
}

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'image'

const resolvePath = (p: string): string => (isAbsolute(p) ? p : join(process.cwd(), p))

const resolveActor = (): string => {
  if (process.env.GITHUB_ACTOR) return `gh:${process.env.GITHUB_ACTOR}`
  if (process.env.USER) return `user:${process.env.USER}`

  return 'unknown'
}

interface ConceptManifestItem {
  file: string
  prompt: string
}

/**
 * Escribe/mergea `.captures/concepts/<loop>/manifest.json` para que el índice GVC
 * (`pnpm fe:capture:index`) ubique el loop, su work-item y los prompts. Mergea por
 * filename (regenerar un concepto pisa su entrada, no duplica). Best-effort.
 */
const writeConceptManifest = async (loopDir: string, args: CliArgs, items: GenItem[]): Promise<void> => {
  try {
    const manifestPath = join(loopDir, 'manifest.json')
    const fresh: ConceptManifestItem[] = items.map(it => ({ file: basename(it.filePath), prompt: it.prompt }))

    let merged = fresh

    try {
      const prev = JSON.parse(await readFile(manifestPath, 'utf8')) as { items?: ConceptManifestItem[] }
      const byFile = new Map<string, ConceptManifestItem>((prev.items ?? []).map(i => [i.file, i]))

      for (const i of fresh) byFile.set(i.file, i)
      merged = [...byFile.values()]
    } catch {
      // sin manifest previo — se crea nuevo.
    }

    const manifest = {
      kind: 'concept' as const,
      loop: args.concept,
      task: args.task ?? null,
      model: args.model,
      generatedAt: new Date().toISOString(),
      actor: resolveActor(),
      items: merged
    }

    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  } catch {
    // nunca romper la generación por el manifest.
  }
}

const openInViewer = (filePath: string) => {
  if (process.platform !== 'darwin') return
  spawn('open', [filePath], { stdio: 'ignore', detached: true }).unref()
}

interface GenItem {
  prompt: string
  filePath: string
}

const generateOne = async (item: GenItem, args: CliArgs): Promise<void> => {
  await mkdir(dirname(item.filePath), { recursive: true })

  for (let n = 0; n < args.count; n += 1) {
    const target = args.count > 1 ? item.filePath.replace(/\.png$/i, `-${n + 1}.png`) : item.filePath

    process.stdout.write(`→ ${target.replace(process.cwd(), '.')} …\n`)

    const result = await generateOpenAIImage({
      prompt: item.prompt,
      model: args.model,
      size: args.size,
      quality: args.quality,
      background: args.background,
      format: 'png',
      numberOfImages: 1,
      timeoutMs: args.timeoutMs
    })

    const buffer = Buffer.from(result.imageBytesBase64, 'base64')

    await writeFile(target, buffer)

    const fallback = result.modelFallbackReason ? ` (fallback: ${result.requestedModel} → ${result.model}: ${result.modelFallbackReason})` : ''

    process.stdout.write(`  ✓ ${Math.round(buffer.length / 1024)}KB · ${result.model} · ${result.size}${fallback}\n`)

    if (args.open) openInViewer(target)
  }
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))

  if (args.help || (!args.prompt && !args.promptFile && !args.batch)) {
    process.stdout.write(`${HELP}\n`)
    process.exit(args.help ? 0 : 1)
  }

  // --concept <loop> rutea a la taxonomía de conceptos de GVC (gitignored, trazable,
  // protegida del garbage collector). Tiene prioridad sobre --out-dir.
  const conceptLoop = args.concept ? slugify(args.concept) : null
  const outDir = conceptLoop ? join(CONCEPTS_DIR, conceptLoop) : args.outDir ? resolvePath(args.outDir) : DEFAULT_OUT_DIR
  const items: GenItem[] = []

  if (args.batch) {
    const raw = await readFile(resolvePath(args.batch), 'utf8')
    const parsed = JSON.parse(raw) as { filename?: string; prompt?: string }[]

    if (!Array.isArray(parsed)) throw new Error('--batch must be a JSON array of { filename, prompt }')

    parsed.forEach((entry, idx) => {
      if (!entry.prompt) throw new Error(`--batch entry ${idx} missing "prompt"`)
      const filename = entry.filename ?? `${slugify(entry.prompt)}.png`

      items.push({ prompt: entry.prompt, filePath: join(outDir, filename.endsWith('.png') ? filename : `${filename}.png`) })
    })
  } else {
    const prompt = args.promptFile ? (await readFile(resolvePath(args.promptFile), 'utf8')).trim() : args.prompt

    if (!prompt) throw new Error('Empty prompt')
    const ts = Math.floor(Date.now() / 1000)
    const filePath = args.out ? resolvePath(args.out) : join(outDir, `${slugify(prompt)}-${ts}.png`)

    items.push({ prompt, filePath })
  }

  for (const item of items) {
    try {
      await generateOne(item, args)
    } catch (err) {
      process.stdout.write(`  ✗ ${item.filePath.replace(process.cwd(), '.')} FAILED: ${(err as Error)?.message ?? err}\n`)
    }
  }

  if (conceptLoop) {
    await writeConceptManifest(outDir, args, items)
    process.stdout.write(`  ✎ concepto '${conceptLoop}' → .captures/concepts/${conceptLoop}/ (manifest.json actualizado)\n`)
  }

  process.stdout.write('done\n')
}

main().catch(err => {
  console.error('FATAL:', (err as Error)?.message ?? err)
  process.exit(1)
})
