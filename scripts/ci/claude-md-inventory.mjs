#!/usr/bin/env node
/**
 * TASK-1160 — CLAUDE.md inventory.
 *
 * Enumerates every H2/H3 section of CLAUDE.md with its size (lines, chars,
 * estimated tokens = chars/4) plus NUNCA/SIEMPRE rule counts. Feeds the Slice 1
 * classification map and lets the refactor measure progress section by section.
 *
 * This is an analysis tool (not a CI gate). Keep it: re-running it after each
 * Slice-3 batch shows what is left to move.
 *
 * Usage:
 *   node scripts/ci/claude-md-inventory.mjs            # human table
 *   node scripts/ci/claude-md-inventory.mjs --json     # machine-readable
 *   node scripts/ci/claude-md-inventory.mjs --top=20   # only the N biggest H3
 */

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')
const CLAUDE_MD = join(REPO_ROOT, 'CLAUDE.md')

const JSON_OUT = process.argv.includes('--json')
const TOP_ARG = process.argv.find(a => a.startsWith('--top='))
const TOP_N = TOP_ARG ? Number(TOP_ARG.split('=')[1]) : null

const estTokens = chars => Math.round(chars / 4)

const main = () => {
  const raw = readFileSync(CLAUDE_MD, 'utf8')
  const lines = raw.split('\n')

  // Parse sections by H2/H3 headings. A section runs from its heading line to
  // the line before the next H2/H3 heading.
  const headings = []

  lines.forEach((line, idx) => {
    const m = /^(#{2,3}) (.+)$/.exec(line)

    if (m) headings.push({ level: m[1].length, title: m[2].trim(), start: idx })
  })

  const sections = headings.map((h, i) => {
    const end = i + 1 < headings.length ? headings[i + 1].start : lines.length
    const body = lines.slice(h.start, end)
    const text = body.join('\n')

    
return {
      level: h.level,
      title: h.title,
      startLine: h.start + 1,
      endLine: end,
      lines: body.length,
      chars: text.length,
      tokens: estTokens(text.length),
      nunca: (text.match(/NUNCA/g) || []).length,
      siempre: (text.match(/SIEMPRE/g) || []).length
    }
  })

  const totalChars = raw.length
  const totalTokens = estTokens(totalChars)
  const totalNunca = (raw.match(/NUNCA/g) || []).length
  const totalSiempre = (raw.match(/SIEMPRE/g) || []).length

  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        { file: 'CLAUDE.md', totalLines: lines.length, totalChars, totalTokens, totalNunca, totalSiempre, sections },
        null,
        2
      )
    )
    
return
  }

  console.log(`\nCLAUDE.md inventory`)
  console.log(`  lines=${lines.length}  chars=${totalChars}  ~tokens=${totalTokens}  NUNCA=${totalNunca}  SIEMPRE=${totalSiempre}\n`)

  // Only H3 (the real refactor candidates), sorted by token size desc.
  const h3 = sections.filter(s => s.level === 3).sort((a, b) => b.tokens - a.tokens)
  const shown = TOP_N ? h3.slice(0, TOP_N) : h3

  const pad = (s, n) => String(s).padEnd(n)
  const padL = (s, n) => String(s).padStart(n)

  console.log(`${pad('~tok', 6)} ${pad('lines', 6)} ${pad('N', 4)} ${pad('S', 4)} title`)
  console.log('-'.repeat(100))

  for (const s of shown) {
    console.log(`${padL(s.tokens, 6)} ${padL(s.lines, 6)} ${padL(s.nunca, 4)} ${padL(s.siempre, 4)} ${s.title.slice(0, 80)}`)
  }

  const h3Tokens = h3.reduce((a, s) => a + s.tokens, 0)

  console.log('-'.repeat(100))
  console.log(`H3 sections: ${h3.length}   their tokens: ~${h3Tokens} (${Math.round((h3Tokens / totalTokens) * 100)}% of file)`)
}

main()
