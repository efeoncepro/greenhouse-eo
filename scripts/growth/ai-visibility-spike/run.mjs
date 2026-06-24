#!/usr/bin/env node
/**
 * TASK-1228 — AI Visibility Grader · Discovery & Eval Spike harness (THROWAWAY).
 *
 * NO es el adapter canónico. El adapter productivo lo construye TASK-1226 en
 * `src/lib/growth/ai-visibility/providers/**` (server-side, gobernado). Este
 * script es un harness LOCAL/MANUAL de descubrimiento: corre el prompt pack
 * borrador contra los answer engines disponibles para producir evidencia que
 * calibra dimensiones/pesos, varianza, costo y extracción.
 *
 * Reglas:
 *  - Lee keys SOLO de env (OPENAI_API_KEY / PERPLEXITY_API_KEY / GEMINI_API_KEY).
 *    Si falta una, ese provider se SALTA limpio (no crashea).
 *  - Si no hay ninguna key: imprime el plan (dry-run) y sale 0.
 *  - NO envía PII; interpola marca/categoría como dato.
 *  - Raw captures van a ./captures (gitignored); acá solo se imprime resumen bounded.
 *  - Model ids / tool config pueden requerir verificación al correr (freshness):
 *    revisar docs vigentes de cada provider antes de un run real.
 *
 * Uso:
 *   node scripts/growth/ai-visibility-spike/run.mjs            # dry-run o run real según keys
 *   N_VARIANCE=3 node scripts/growth/ai-visibility-spike/run.mjs   # repite cada prompt N veces (varianza)
 */

import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..', '..', '..')
const ARTIFACTS = join(REPO, 'docs', 'architecture', 'growth', 'ai-visibility')
const CAPTURES = join(HERE, 'captures')
const EXCERPT_MAX = 600
const N_VARIANCE = Number.parseInt(process.env.N_VARIANCE ?? '1', 10) || 1
const SMOKE_LIMIT = Number.parseInt(process.env.SMOKE_LIMIT ?? '0', 10) || 0 // 0 = sin límite; N = primeros N runs por provider (validación barata)
const ONLY_PROMPTS = (process.env.ONLY_PROMPTS ?? '').split(',').map(s => s.trim()).filter(Boolean) // subset de prompt ids (acota costo)

// Anthropic NO está en el arch V1 del grader (OpenAI/Perplexity/Gemini); se incluye
// como fuente exploratoria por decisión de producto (TASK-1228) — retroalimentar al arch doc.
const PROVIDERS = {
  openai: { env: 'OPENAI_API_KEY' },
  anthropic: { env: 'ANTHROPIC_API_KEY' },
  perplexity: { env: 'PERPLEXITY_API_KEY' },
  gemini: { env: 'GEMINI_API_KEY' }
}

const readJson = async name => JSON.parse(await readFile(join(ARTIFACTS, name), 'utf8'))

const interpolate = (text, vars) =>
  text.replace(/\{\{(\w+)\}\}/g, (_m, k) => (vars[k] != null ? String(vars[k]) : `{{${k}}}`))

const boundedExcerpt = s => (typeof s === 'string' ? s.slice(0, EXCERPT_MAX) : null)

// --- Provider adapters (spike-grade, REST directo) --------------------------

async function callOpenAI(key, prompt) {
  const started = Date.now()

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4.1', tools: [{ type: 'web_search' }], input: prompt })
  })

  const json = await res.json()
  const blocks = Array.isArray(json.output) ? json.output : []

  const textParts = blocks
    .filter(b => b.type === 'message')
    .flatMap(b => (Array.isArray(b.content) ? b.content : []))
    .filter(c => c.type === 'output_text')

  const text = json.output_text ?? (textParts.map(c => c.text).join('') || null)

  const citations = textParts
    .flatMap(c => (Array.isArray(c.annotations) ? c.annotations : []))
    .filter(a => a.type === 'url_citation')
    .map(a => ({ url: a.url, title: a.title ?? null }))

  return { ok: res.ok, text, citations, usage: json.usage ?? {}, latencyMs: Date.now() - started, raw: json }
}

async function callPerplexity(key, prompt) {
  const started = Date.now()

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'sonar', messages: [{ role: 'user', content: prompt }] })
  })

  const json = await res.json()
  const text = json.choices?.[0]?.message?.content ?? null

  
return { ok: res.ok, text, citations: json.citations ?? [], usage: json.usage ?? {}, latencyMs: Date.now() - started, raw: json }
}

async function callGemini(key, prompt) {
  const started = Date.now()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], tools: [{ google_search: {} }] })
  })

  const json = await res.json()
  const text = json.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ?? null

  
return { ok: res.ok, text, usage: json.usageMetadata ?? {}, latencyMs: Date.now() - started, raw: json }
}

async function callAnthropic(key, prompt) {
  const started = Date.now()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }]
    })
  })

  const json = await res.json()
  const blocks = Array.isArray(json.content) ? json.content : []
  const text = blocks.filter(b => b.type === 'text').map(b => b.text).join('') || null
  const citations = []

  for (const b of blocks) {
    if (Array.isArray(b.citations)) {
      for (const c of b.citations) if (c.url) citations.push({ url: c.url, title: c.title ?? null })
    }

    if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
      for (const r of b.content) if (r.url) citations.push({ url: r.url, title: r.title ?? null })
    }
  }

  return { ok: res.ok, text, citations, usage: json.usage ?? {}, latencyMs: Date.now() - started, raw: json }
}

const ADAPTERS = { openai: callOpenAI, anthropic: callAnthropic, perplexity: callPerplexity, gemini: callGemini }

// --- Plan builder -----------------------------------------------------------

function buildPlan(pack, brandSet) {
  const vars = brandSet._meta.defaultVariables ?? {}
  const brands = brandSet.brands.filter(b => b.brandName)
  const competitor = brands.find(b => b.role === 'competitor')?.brandName ?? null
  const prompts = ONLY_PROMPTS.length ? pack.prompts.filter(p => ONLY_PROMPTS.includes(p.id)) : pack.prompts
  const runs = []

  for (const prompt of prompts) {
    if (prompt.namesBrand) {
      for (const brand of brands) {
        const v = { ...vars, ...brand, brand: brand.brandName, competitor }

        if (/\{\{competitor\}\}/.test(prompt.text) && !competitor) continue
        runs.push({ promptId: prompt.id, brandId: brand.id, text: interpolate(prompt.text, v) })
      }
    } else {
      // los prompts de categoría corren una vez; competitor disponible para p06 ("alternativas a X")
      runs.push({ promptId: prompt.id, brandId: null, text: interpolate(prompt.text, { ...vars, competitor }) })
    }
  }

  
return runs
}

// --- Main -------------------------------------------------------------------

async function main() {
  const pack = await readJson('prompt-pack.v1.json')
  const brandSet = await readJson('brand-set.v1.json')

  const enabled = Object.entries(PROVIDERS)
    .filter(([, cfg]) => process.env[cfg.env])
    .map(([id]) => id)

  const runs = buildPlan(pack, brandSet)
  const pendingFill = brandSet.brands.filter(b => b.operatorFill && !b.brandName).map(b => b.id)

  console.log(`[spike] prompt pack: ${pack.prompts.length} prompts · brand set: ${brandSet.brands.length} marcas`)
  console.log(`[spike] runs planificados: ${runs.length} × ${N_VARIANCE} (varianza) = ${runs.length * N_VARIANCE}`)

  if (pendingFill.length) {
    console.log(`[spike] ⚠ brand-set tiene marcas operatorFill sin completar: ${pendingFill.join(', ')}`)
  }

  if (enabled.length === 0) {
    console.log(`\n[spike] DRY-RUN — no hay keys de provider en env (${Object.values(PROVIDERS).map(c => c.env).join(' / ')}).`)
    console.log('[spike] Para correr real: agregá al menos una key a .env.local y reejecutá.')
    console.log('[spike] Ejemplos de runs:')
    for (const r of runs.slice(0, 4)) console.log(`   - ${r.promptId}${r.brandId ? ` · ${r.brandId}` : ''}: ${r.text}`)
    console.log('[spike] Exit 0 (skip limpio).')
    
return
  }

  console.log(`[spike] providers activos: ${enabled.join(', ')}`)
  await mkdir(CAPTURES, { recursive: true })
  const summary = []

  for (const provider of enabled) {
    const key = process.env[PROVIDERS[provider].env]
    const runsForProvider = SMOKE_LIMIT > 0 ? runs.slice(0, SMOKE_LIMIT) : runs

    for (const r of runsForProvider) {
      for (let attempt = 1; attempt <= N_VARIANCE; attempt++) {
        try {
          const obs = await ADAPTERS[provider](key, r.text)

          const record = {
            provider, promptId: r.promptId, brandId: r.brandId, attempt,
            ok: obs.ok, latencyMs: obs.latencyMs, usage: obs.usage,
            citations: obs.citations ?? null, excerpt: boundedExcerpt(obs.text)
          }

          summary.push(record)
          await writeFile(
            join(CAPTURES, `${provider}_${r.promptId}_${r.brandId ?? 'cat'}_a${attempt}.json`),
            JSON.stringify(obs.raw, null, 2)
          )
          console.log(`   ✓ ${provider} ${r.promptId}/${r.brandId ?? 'cat'} a${attempt} (${obs.latencyMs}ms)`)
        } catch (err) {
          summary.push({ provider, promptId: r.promptId, brandId: r.brandId, attempt, ok: false, error: String(err?.message ?? err) })
          console.log(`   ✗ ${provider} ${r.promptId}/${r.brandId ?? 'cat'} a${attempt}: ${err?.message ?? err}`)
        }
      }
    }
  }

  await writeFile(join(CAPTURES, 'summary.json'), JSON.stringify(summary, null, 2))
  console.log(`\n[spike] listo. ${summary.length} observaciones. Raw + summary en ${CAPTURES} (gitignored).`)
  console.log('[spike] Siguiente: calibración manual (Slice 3-5) → docs/architecture/GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md')
}

main().catch(err => {
  console.error('[spike] fallo:', err?.message ?? err)
  process.exitCode = 1
})
