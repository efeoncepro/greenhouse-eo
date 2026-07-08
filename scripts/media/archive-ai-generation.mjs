#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.mp4',
  '.webm',
  '.mov',
  '.m4v'
])

const usage = `Usage:
  pnpm media:archive-ai-generation -- --run ai-generations/<run> [--apply]

Options:
  --run <dir>       Required. ai-generations run directory.
  --bucket <name>   GCS bucket. Defaults to GREENHOUSE_AI_GENERATIONS_BUCKET or efeonce-group-greenhouse-private-assets-prod.
  --prefix <path>   GCS prefix. Defaults to ai-generations.
  --apply           Upload files and write artifacts.remote.json. Without this, dry-run only.

This archives heavy generation binaries to GCS while keeping ai-generations
versionable as README/prompts/scripts/manifests. Local files are not deleted.`

function parseArgs(argv) {
  const args = {
    bucket: process.env.GREENHOUSE_AI_GENERATIONS_BUCKET || 'efeonce-group-greenhouse-private-assets-prod',
    prefix: 'ai-generations',
    apply: false
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '--') {
      continue
    } else if (arg === '--apply') {
      args.apply = true
    } else if (arg === '--run') {
      args.run = argv[++i]
    } else if (arg === '--bucket') {
      args.bucket = argv[++i]
    } else if (arg === '--prefix') {
      args.prefix = argv[++i]
    } else if (arg === '--help' || arg === '-h') {
      console.log(usage)
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!args.run) throw new Error('Missing required --run <dir>')

  if (!args.run.startsWith('ai-generations/')) {
    throw new Error('--run must point inside ai-generations/')
  }

  return args
}

async function collectFiles(rootDir, currentDir = rootDir) {
  const entries = await readdir(currentDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue
    const fullPath = path.join(currentDir, entry.name)

    if (entry.isDirectory()) {
      files.push(...await collectFiles(rootDir, fullPath))
      continue
    }

    const ext = path.extname(entry.name).toLowerCase()

    if (!BINARY_EXTENSIONS.has(ext)) continue

    const relativePath = path.relative(rootDir, fullPath)

    files.push({ fullPath, relativePath })
  }

  return files
}

async function describeFile(file) {
  const bytes = await readFile(file.fullPath)
  const info = await stat(file.fullPath)

  return {
    path: file.relativePath,
    sizeBytes: info.size,
    sha256: createHash('sha256').update(bytes).digest('hex')
  }
}

function runGcloud(args) {
  const result = spawnSync('gcloud', args, { encoding: 'utf8' })

  if (result.status !== 0) {
    throw new Error(`gcloud ${args.join(' ')} failed:\n${result.stderr || result.stdout}`)
  }

  
return result.stdout
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const rootDir = path.resolve(process.cwd(), args.run)
  const runName = path.basename(rootDir)
  const objectPrefix = `${args.prefix.replace(/^\/+|\/+$/g, '')}/${runName}`
  const files = await collectFiles(rootDir)
  const described = []

  for (const file of files) {
    const item = await describeFile(file)

    item.gsUri = `gs://${args.bucket}/${objectPrefix}/${item.path}`
    described.push(item)
  }

  const totalBytes = described.reduce((sum, item) => sum + item.sizeBytes, 0)

  console.log(`AI generation archive: ${args.run}`)
  console.log(`Bucket: gs://${args.bucket}/${objectPrefix}/`)
  console.log(`Files: ${described.length}`)
  console.log(`Bytes: ${(totalBytes / 1024 / 1024).toFixed(2)} MiB`)

  if (!args.apply) {
    console.log('\nDry-run only. Add --apply to upload and write artifacts.remote.json.')
    
return
  }

  for (const item of described) {
    const source = path.join(rootDir, item.path)

    runGcloud(['storage', 'cp', '--quiet', source, item.gsUri])
    console.log(`uploaded ${item.path} -> ${item.gsUri}`)
  }

  const manifest = {
    schema: 'greenhouse.aiGenerationArtifacts.v1',
    generatedAt: new Date().toISOString(),
    run: args.run,
    bucket: args.bucket,
    prefix: objectPrefix,
    totalBytes,
    fileCount: described.length,
    files: described
  }

  const manifestPath = path.join(rootDir, 'artifacts.remote.json')

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`\nWrote ${path.relative(process.cwd(), manifestPath)}`)
}

main().catch(error => {
  console.error(`media:archive-ai-generation failed: ${error.message}`)
  process.exit(1)
})
