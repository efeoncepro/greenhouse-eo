/**
 * `pnpm brand:deck-plan` — valida o propone el plan de un deck de «La órbita» contra el catálogo de recetas (TASK-1929).
 *
 *   pnpm brand:deck-plan -- --plan <plan.json>
 *     Valida el plan (`validateDeckPlan`) y lista los issues con su código. Sale con 1 si hay algún error.
 *
 *   pnpm brand:deck-plan -- --propose --context <context.json> [--out <plan.json>]
 *     Pide al agente un plan (`proposeDeckPlan`), lo valida y lo imprime con los tokens y el costo estimado del
 *     modelo. Con `--out` escribe el plan propuesto para revisarlo y componerlo. No confirma ni compone nada.
 *
 * El plan nombra recetas del catálogo por id (`docs/operations/brand-graphic-line/deck-recipes/`); los códigos están en
 * el README del catálogo. La confirmación humana y el camino por API, Nexa y MCP son de TASK-1932.
 */

import fs from 'node:fs'
import path from 'node:path'

import { validateDeckPlan, type DeckPlan, type DeckPlanIssue } from '@/lib/brand-surfaces/deck-recipes'

const arg = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`)

  return at === -1 ? undefined : process.argv[at + 1]
}

const readJson = (file: string): unknown => {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'))
  } catch (error) {
    console.error(`✗ No se pudo leer ${file}: ${(error as Error).message}`)
    process.exit(2)
  }
}

/**
 * Tarifa de referencia para ESTIMAR el costo (USD por millón de tokens, entrada / salida) de la familia Sonnet de
 * Anthropic. Es una estimación impresa para el operador, no facturación: la factura del proveedor manda.
 */
const REFERENCE_USD_PER_MTOK = { input: 3, output: 15 }

const printIssues = (issues: DeckPlanIssue[]) => {
  if (issues.length === 0) {
    console.log('  sin issues')

    return
  }

  for (const issue of issues) {
    const where = issue.slideIndex === undefined ? 'plan' : `lámina ${issue.slideIndex + 1}${issue.recipeId ? ` (${issue.recipeId})` : ''}`
    const mark = issue.severity === 'error' ? '✗' : '!'

    console.log(`  ${mark} ${issue.code} [${issue.source}] · ${where}${issue.slot ? ` · ${issue.slot}` : ''}\n    ${issue.detail}`)
  }
}

const printPlan = (plan: DeckPlan) => {
  console.log(`  documento: ${plan.document}${plan.line ? ` · línea ${plan.line}` : ''}`)
  plan.slides.forEach((slide, index) => console.log(`  ${String(index + 1).padStart(2)}. ${slide.recipeId}${slide.purpose ? ` — ${slide.purpose}` : ''}`))
}

const main = async () => {
  const planFile = arg('plan')
  const contextFile = arg('context')

  if (process.argv.includes('--propose')) {
    if (!contextFile) {
      console.error('✗ --propose necesita --context <context.json>.')
      process.exit(2)
    }

    const { DeckPlanContextError, proposeDeckPlan } = await import('@/lib/brand-surfaces/deck-recipes/propose')

    let result: Awaited<ReturnType<typeof proposeDeckPlan>>

    try {
      result = await proposeDeckPlan(readJson(contextFile))
    } catch (error) {
      if (error instanceof DeckPlanContextError) {
        console.error(`✗ Contexto inválido: ${error.message}`)
        process.exit(2)
      }

      throw error
    }

    const cost = (result.usage.inputTokens * REFERENCE_USD_PER_MTOK.input + result.usage.outputTokens * REFERENCE_USD_PER_MTOK.output) / 1_000_000

    console.log(`${result.ok ? '✓ Plan propuesto' : '✗ Sin plan válido'} · ${result.model} · ${result.attempts} intento(s)`)
    console.log(
      `  tokens: entrada ${result.usage.inputTokens} · salida ${result.usage.outputTokens} · costo estimado ≈ USD ${cost.toFixed(4)} (tarifa de referencia USD ${REFERENCE_USD_PER_MTOK.input}/${REFERENCE_USD_PER_MTOK.output} por millón)`
    )

    if (result.ok) {
      printPlan(result.plan)
      if (result.rationale) console.log(`  por qué: ${result.rationale}`)
      console.log('Issues:')
      printIssues(result.issues)

      const out = arg('out')

      if (out) {
        fs.writeFileSync(path.resolve(out), `${JSON.stringify(result.plan, null, 2)}\n`)
        console.log(`  plan escrito en ${out}`)
      }

      return
    }

    if (result.rejectedPlan) {
      console.log('Plan rechazado (sólo para diagnóstico):')
      printPlan(result.rejectedPlan)
    }

    console.log('Issues:')
    printIssues(result.issues)
    process.exit(1)
  }

  if (!planFile) {
    console.error('Uso: pnpm brand:deck-plan -- --plan <plan.json>  |  --propose --context <context.json> [--out <plan.json>]')
    process.exit(2)
  }

  const result = validateDeckPlan(readJson(planFile) as DeckPlan)
  const errors = result.issues.filter(issue => issue.severity === 'error').length

  console.log(result.ok ? `✓ Plan válido (${result.issues.length} aviso(s))` : `✗ Plan inválido: ${errors} error(es)`)
  printIssues(result.issues)
  if (!result.ok) process.exit(1)
}

main().catch(error => {
  console.error(`✗ ${(error as Error).message}`)
  process.exit(1)
})
