#!/usr/bin/env node

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import process from 'node:process'

const CLOSURE_RE = /\b(listo|lista|terminad[oa]?|hecho|cerrad[oa]?|complete|completo|done|shipped|implementad[oa]?|verificad[oa]?|validado|pas[oó]|passed|green)\b/i
const QA_EVIDENCE_RE = /(greenhouse-qa-release-auditor|qa:gates|QA Release Audit|PASS|CONDITIONAL PASS|BLOCK|docs:closure-check|GVC|fe:capture)/i
const ENFORCE_VALUES = new Set(['1', 'true', 'yes', 'enforce', 'block'])

const RISK_PATTERNS = [
  /^AGENTS\.md$/,
  /^CLAUDE\.md$/,
  /^Handoff\.md$/,
  /^changelog\.md$/,
  /^project_context\.md$/,
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
  /^\.codex\/hooks/,
  /^\.codex\/skills/,
  /^\.claude\/skills/,
  /^\.github\/workflows/,
  /^docs\//,
  /^eslint-plugins\//,
  /^migrations\//,
  /^scripts\//,
  /^services\//,
  /^src\//,
  /^vercel\.json$/,
]

function readStdin() {
  return new Promise(resolve => {
    let input = ''

    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => {
      input += chunk
    })
    process.stdin.on('end', () => resolve(input))
  })
}

function writeContinue() {
  process.stdout.write(JSON.stringify({ continue: true }))
}

function writeContinuation(reason) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }))
}

function runGit(cwd, args) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    return ''
  }

  return result.stdout
}

function splitLines(output) {
  return output
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

function parseNameStatus(output) {
  return splitLines(output).map(line => {
    const parts = line.split('\t')
    const status = parts[0]

    if (status.startsWith('R') || status.startsWith('C')) {
      return parts[2]
    }

    return parts[1] || parts[0]
  })
}

function getChangedFiles(cwd) {
  const tracked = parseNameStatus(runGit(cwd, ['diff', '--name-status', '--find-renames', 'HEAD']))
  const untracked = splitLines(runGit(cwd, ['ls-files', '--others', '--exclude-standard']))

  return [...new Set([...tracked, ...untracked])]
    .map(filePath => filePath.replaceAll('\\', '/'))
    .sort()
}

function isRiskyFile(filePath) {
  return RISK_PATTERNS.some(pattern => pattern.test(filePath))
}

function isHookEnforced(payload) {
  if (payload?.enforce_qa_stop_hook === true) {
    return true
  }

  const mode = String(process.env.GREENHOUSE_QA_STOP_HOOK_MODE || process.env.GREENHOUSE_QA_STOP_HOOK_ENFORCE || '')
    .trim()
    .toLowerCase()

  return ENFORCE_VALUES.has(mode)
}

function needsQaReminder(payload, changedFiles) {
  if (payload?.stop_hook_active) {
    return false
  }

  if (!isHookEnforced(payload)) {
    return false
  }

  const lastAssistantMessage = String(payload?.last_assistant_message || '')

  if (!CLOSURE_RE.test(lastAssistantMessage)) {
    return false
  }

  if (QA_EVIDENCE_RE.test(lastAssistantMessage)) {
    return false
  }

  return changedFiles.some(isRiskyFile)
}

function buildReason(changedFiles) {
  const files = changedFiles.filter(isRiskyFile).slice(0, 12)
  const fileList = files.map(filePath => `- ${filePath}`).join('\n')
  const suffix = changedFiles.length > files.length ? `\n- ... ${changedFiles.length - files.length} more changed files` : ''

  return [
    'Before closing, use $greenhouse-qa-release-auditor because this turn appears to be ending with risky changed files.',
    '',
    'Run `pnpm qa:gates --changed` or a scoped equivalent, load the injected domain skills, and report PASS, CONDITIONAL PASS, or BLOCK with evidence. If runtime evidence is missing, say `code complete, rollout pendiente` or `operativamente bloqueado` instead of `complete`.',
    '',
    'Risky changed files detected:',
    fileList + suffix,
  ].join('\n')
}

export async function evaluateHook(rawInput, cwd = process.cwd()) {
  let payload

  try {
    payload = rawInput.trim() ? JSON.parse(rawInput) : {}
  } catch {
    return { continue: true }
  }

  const changedFiles = getChangedFiles(payload.cwd || cwd)

  if (!needsQaReminder(payload, changedFiles)) {
    return { continue: true }
  }

  return {
    decision: 'block',
    reason: buildReason(changedFiles),
  }
}

async function runSelfTest() {
  const riskyPayload = {
    last_assistant_message: 'Listo, quedó implementado.',
    stop_hook_active: false,
    cwd: process.cwd(),
  }
  const enforcedPayload = {
    ...riskyPayload,
    enforce_qa_stop_hook: true,
  }

  assert.equal(CLOSURE_RE.test(riskyPayload.last_assistant_message), true)
  assert.equal(QA_EVIDENCE_RE.test('Verificación: pnpm qa:gates --changed'), true)
  assert.equal(isRiskyFile('src/app/page.tsx'), true)
  assert.equal(isRiskyFile('.captures/run/frame.png'), false)
  assert.equal(needsQaReminder(riskyPayload, ['src/app/page.tsx']), false)
  assert.equal(needsQaReminder(enforcedPayload, ['src/app/page.tsx']), true)
  assert.equal(needsQaReminder({ ...enforcedPayload, last_assistant_message: 'Listo. Verificación: pnpm qa:gates --changed PASS.' }, ['src/app/page.tsx']), false)
  assert.equal(needsQaReminder({ ...enforcedPayload, stop_hook_active: true }, ['src/app/page.tsx']), false)
}

if (process.argv.includes('--self-test')) {
  await runSelfTest()
  process.exit(0)
}

const result = await evaluateHook(await readStdin())

if (result.decision === 'block') {
  writeContinuation(result.reason)
} else {
  writeContinue()
}
