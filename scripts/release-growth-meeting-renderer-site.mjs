import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const siteDir = resolve(repoRoot, 'artifacts/public-renderers')
const rollbackArg = process.argv.find(argument => argument.startsWith('--rollback='))
const stableAlias = 'efeonce-public-renderers.vercel.app'
const scope = 'efeonce-7670142f'

const run = (command, args, cwd = repoRoot) => execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()

if (rollbackArg) {
  const deployment = rollbackArg.slice('--rollback='.length).replace(/^https?:\/\//, '')

  if (!/^efeonce-public-renderers-[a-z0-9-]+\.vercel\.app$/.test(deployment)) throw new Error('invalid rollback deployment')
  run('vercel', ['alias', 'set', deployment, stableAlias, '--scope', scope])
  console.log(`[renderer:meeting:site:release] rollback alias → ${deployment}`)
  process.exit(0)
}

run('pnpm', ['renderer:meeting:site:build'])
run('pnpm', ['renderer:meeting:site:verify'])
const output = run('vercel', ['deploy', '--prod', '--skip-domain', '--yes', '--scope', scope], siteDir)
const deployment = output.split(/\s+/).find(value => /^https:\/\/efeonce-public-renderers-[a-z0-9-]+\.vercel\.app$/.test(value))

if (!deployment) throw new Error('deployment URL not found')

const manifest = JSON.parse(await readFile(resolve(siteDir, 'channels/stable.json'), 'utf8'))
const health = await fetch(`${deployment}/health.json`).then(response => response.ok ? response.json() : Promise.reject(new Error(`health ${response.status}`)))

if (health.releaseId !== manifest.releaseId) throw new Error('staged deployment release mismatch')

run('vercel', ['alias', 'set', deployment.replace('https://', ''), stableAlias, '--scope', scope])
console.log(`[renderer:meeting:site:release] promoted release=${manifest.releaseId} deployment=${deployment}`)
