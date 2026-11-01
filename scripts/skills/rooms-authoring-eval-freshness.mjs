#!/usr/bin/env node
/**
 * Falla cuando la skill de oficio de Rooms (`efeonce-rooms-authoring`) cambió y su hash vigente no tiene un recibo
 * PASS de una corrida viva del eval de referencia (TASK-2091, ADR del carril de agentes D6).
 *
 * El hash cubre SKILL.md, agents/, references/, evals/briefs/, evals/expected/, evals/cases.json y
 * evals/score.mjs (definición única en score.mjs). Solo cuenta un recibo `kind: live` con `verdict: PASS` y el mismo
 * hash: los fixtures offline nunca escriben recibo.
 *
 * Uso: node scripts/skills/rooms-authoring-eval-freshness.mjs
 */
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const repo = resolve(new URL('../..', import.meta.url).pathname)
const claudeSkill = join(repo, '.claude/skills/efeonce-rooms-authoring')
const codexSkill = join(repo, '.codex/skills/efeonce-rooms-authoring')
const scorer = join(claudeSkill, 'evals/score.mjs')

if (!existsSync(scorer)) {
  console.error(`rooms-authoring-eval-freshness: no existe ${scorer}.`)
  process.exit(1)
}

const { bundleHash, findPassReceipt, listReceipts } = await import(pathToFileURL(scorer).href)
const current = bundleHash(claudeSkill)
const failures = []

if (existsSync(codexSkill)) {
  const mirror = bundleHash(codexSkill)

  if (mirror.hash !== current.hash) failures.push(`El espejo .codex tiene otro hash (${mirror.hash}). Corre pnpm skills:mirrors y copia la skill byte a byte.`)
} else {
  failures.push('Falta el espejo .codex/skills/efeonce-rooms-authoring.')
}

const receipts = listReceipts(claudeSkill)
const pass = findPassReceipt(receipts, current.hash)

if (!pass) {
  const lastLive = receipts.filter(({ receipt }) => receipt?.kind === 'live').at(-1)

  const last = lastLive
    ? `Último recibo vivo: evals/runs/${lastLive.name} (${lastLive.receipt.verdict}, hash ${lastLive.receipt.skillBundleHash}).`
    : 'No hay ningún recibo vivo en evals/runs/.'

  failures.push(
    [
      `La skill efeonce-rooms-authoring no tiene un recibo PASS para su hash vigente ${current.hash}.`,
      last,
      'No la uses con un cliente real. Corre el eval contra Rooms local (evals/README.md) y puntúa con:',
      '  node .claude/skills/efeonce-rooms-authoring/evals/score.mjs score --runs <dir-de-corridas>',
    ].join('\n'),
  )
}

if (failures.length) {
  console.error(`rooms-authoring-eval-freshness: FALLA\n\n${failures.join('\n\n')}`)
  process.exit(1)
}

console.log(`rooms-authoring-eval-freshness: OK — recibo evals/runs/${pass.name} (PASS) cubre ${current.hash}.`)
