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
 *   pnpm brand:deck-plan -- --bind --plan <plan.json> (--context <context.json> | --proposal <id> --org <ownerOrgId>
 *                            [--audience internal|client_facing] [--facts <facts.json>] | --sources <sources.json>)
 *                            [--out <plan-ligado.json>]
 *     Liga los slots de datos del plan (`bindDeckSlots`, TASK-1930) e imprime la tabla de slots con su estado, fuente o
 *     motivo, evidencia y fecha. Con `--proposal` lee la propuesta, su evidencia y el logo de su cliente por los readers
 *     canónicos (necesita el proxy de Cloud SQL: `pnpm pg:connect`); con `--sources` corre sin base sobre un fixture de
 *     fuentes ya leídas. No escribe nada en la base. Sale con 1 si el plan ligado no compone.
 *
 * El plan nombra recetas del catálogo por id (`docs/operations/brand-graphic-line/deck-recipes/`); los códigos están en
 * el README del catálogo. La confirmación humana y el camino por API, Nexa y MCP son de TASK-1932.
 */

import fs from 'node:fs'
import path from 'node:path'

import { validateDeckPlan, type DeckPlan, type DeckPlanIssue } from '@/lib/brand-surfaces/deck-recipes'
import type { DeckBindingSources, DeckSlotBindingResult, SlotBinding } from '@/lib/brand-surfaces/deck-recipes/bindings/types'

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

const printBindings = (bindings: SlotBinding[]) => {
  if (bindings.length === 0) {
    console.log('  el plan no tiene slots de datos')

    return
  }

  for (const entry of bindings) {
    const mark = entry.status === 'bound' ? '✓' : '·'
    const where = `lámina ${entry.slideIndex + 1} (${entry.recipeId}) · ${entry.slot}`
    const how = entry.status === 'bound' ? `ligado desde ${entry.source}` : `sin ligar: ${entry.reason}`
    const origin = entry.dataOrigin ? ` · datos ${entry.dataOrigin === 'client' ? 'del cliente' : 'de muestra'}` : ''
    const refs = entry.evidenceRefs?.length ? ` · evidencia ${entry.evidenceRefs.join(', ')}` : ''
    const asOf = entry.asOf ? ` · al ${entry.asOf.slice(0, 10)}` : ''

    console.log(`  ${mark} ${where} — ${how}${origin}${refs}${asOf}`)
  }
}

/** `--bind`: liga los slots de datos del plan desde readers canónicos o desde un fixture de fuentes. */
const bind = async (planFile: string) => {
  const plan = readJson(planFile) as DeckPlan
  const sourcesFile = arg('sources')

  let result: DeckSlotBindingResult

  if (sourcesFile) {
    const { bindDeckSlotsWith } = await import('@/lib/brand-surfaces/deck-recipes/bindings/core')

    result = bindDeckSlotsWith(plan, readJson(sourcesFile) as DeckBindingSources)
  } else {
    const contextFile = arg('context')
    const proposalId = arg('proposal')
    const facts = arg('facts') ? readJson(arg('facts')!) : []

    const context = contextFile
      ? readJson(contextFile)
      : proposalId
        ? { kind: 'proposal', proposalId, ownerOrgId: arg('org'), audience: arg('audience') ?? 'client_facing', facts }
        : { kind: 'brand', audience: arg('audience') ?? 'client_facing', facts }

    // Lectura por los readers canónicos con el perfil de sólo runtime (DML); nunca escribe.
    const { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } = await import('../lib/load-greenhouse-tool-env')

    loadGreenhouseToolEnv()
    applyGreenhousePostgresProfile('runtime')

    const { bindDeckSlots, DeckBindingContextError } = await import('@/lib/brand-surfaces/deck-recipes/bindings')

    try {
      result = await bindDeckSlots(plan, context)
    } catch (error) {
      if (error instanceof DeckBindingContextError) {
        console.error(`✗ Contexto inválido: ${error.message}`)
        process.exit(2)
      }

      throw error
    }
  }

  const bound = result.bindings.filter(entry => entry.status === 'bound').length

  console.log(`${result.ok ? '✓ El plan ligado compone' : '✗ El plan ligado no compone'} · ${bound} de ${result.bindings.length} slot(s) de datos ligados`)
  console.log('Slots de datos:')
  printBindings(result.bindings)
  console.log('Issues:')
  printIssues(result.issues)

  const out = arg('out')

  if (out) {
    fs.writeFileSync(path.resolve(out), `${JSON.stringify({ plan: result.plan, bindings: result.bindings }, null, 2)}\n`)
    console.log(`  plan ligado y rastro escritos en ${out}`)
  }

  if (!result.ok) process.exit(1)
}

const main = async () => {
  const planFile = arg('plan')
  const contextFile = arg('context')

  if (process.argv.includes('--bind')) {
    if (!planFile) {
      console.error('✗ --bind necesita --plan <plan.json>.')
      process.exit(2)
    }

    await bind(planFile)

    return
  }

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
    console.error(
      'Uso: pnpm brand:deck-plan -- --plan <plan.json>  |  --propose --context <context.json> [--out <plan.json>]  |  --bind --plan <plan.json> (--context <c.json> | --proposal <id> --org <org> | --sources <s.json>)'
    )
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
