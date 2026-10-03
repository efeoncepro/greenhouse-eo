/**
 * CLI de operador para el set de preguntas AEO de una marca (Grader) y la categoría de su perfil. Usa SÓLO los commands gobernados
 * (`readGraderPromptSets`, `createGraderPromptSetDraft`, `approveGraderPromptSet`): mismo `can()`, misma transacción,
 * mismo «un solo set activo por perfil y mercado». Nunca SQL directo.
 *
 * Existe porque esos commands no tienen ruta API ni tool MCP todavía (brecha de Full API Parity registrada en
 * TASK-1962); cuando existan, este CLI pasa a llamarlas.
 *
 *   pnpm growth:aeo-prompt-set list    --profile=gprf-...
 *   pnpm growth:aeo-prompt-set create  --profile=gprf-... --market=gpmk-... --file=set.json [--apply]
 *   pnpm growth:aeo-prompt-set approve --set=gps-...                                      [--apply]
 *   pnpm growth:aeo-prompt-set set-category --profile=gprf-... --category=sector:... --reason="..." [--apply]
 *
 * Sin `--apply`, `create` y `approve` sólo validan e imprimen lo que harían. El orden de las preguntas importa: un
 * análisis `full` ejecuta las primeras 12 (`policy.ts`).
 */

import { readFileSync } from 'node:fs'

import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { PROMPT_FAMILIES, PROMPT_FAN_OUT_TYPES, PROMPT_INTENT_STAGES } from '@/lib/growth/ai-visibility/prompt-packs/tag-vocabulary'
import { approveGraderPromptSet, createGraderPromptSetDraft, readGraderPromptSets } from '@/lib/growth/ai-visibility/prompt-packs/prompt-set-command'
import { getPromptSet, type PromptSetPrompt } from '@/lib/growth/ai-visibility/prompt-packs/prompt-set-store'
import { overrideProfileCategory } from '@/lib/growth/ai-visibility/override-category'
import { getCategoryTaxonomyNode } from '@/lib/growth/ai-visibility/taxonomy'

const ACTOR = 'user-agent-e2e-001'

const subject = {
  userId: ACTOR,
  tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin'],
  primaryRoleCode: 'efeonce_admin',
  routeGroups: [],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  portalHomePath: '/'
} as unknown as TenantEntitlementSubject

const arg = (name: string): string | undefined => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
const apply = process.argv.includes('--apply')

interface SetFile {
  businessModel: string | null
  categoryNodeId: string | null
  reason: string
  prompts: PromptSetPrompt[]
}

const validate = (file: SetFile): string[] => {
  const errors: string[] = []
  const ids = new Set<string>()

  if (!file.reason || file.reason.trim().length < 10) errors.push('reason: explica por qué cambia el set (≥ 10 caracteres)')
  if (file.prompts.length === 0) errors.push('prompts: vacío')

  file.prompts.forEach((prompt, index) => {
    const where = `prompts[${index}] ${prompt.id}`

    if (ids.has(prompt.id)) errors.push(`${where}: id repetido`)
    ids.add(prompt.id)
    if (!(PROMPT_FAMILIES as readonly string[]).includes(prompt.family)) errors.push(`${where}: family ${prompt.family} no existe`)
    if (!(PROMPT_FAN_OUT_TYPES as readonly string[]).includes(prompt.fanOutType)) errors.push(`${where}: fanOutType ${prompt.fanOutType} no existe`)
    if (!(PROMPT_INTENT_STAGES as readonly string[]).includes(prompt.intentStage)) errors.push(`${where}: intentStage ${prompt.intentStage} no existe`)
    if (prompt.text.trim().length < 10) errors.push(`${where}: texto demasiado corto`)
  })

  return errors
}

const main = async () => {
  const command = process.argv[2]

  if (command === 'list') {
    const profileId = arg('profile')

    if (!profileId) throw new Error('--profile=gprf-... es obligatorio')

    const result = await readGraderPromptSets({ subject, profileId, ...(arg('market') ? { marketId: arg('market') } : {}) })

    console.log(`activo: ${result.active ? `${result.active.setId} v${result.active.version}` : 'ninguno (las corridas usan el paquete genérico del arquetipo)'}`)

    for (const version of result.versions) {
      console.log(`- ${version.setId} v${version.version} ${version.status} mercado=${version.marketId ?? '—'} preguntas=${version.prompts.length}`)
    }

    return
  }

  if (command === 'create') {
    const profileId = arg('profile')
    const marketId = arg('market')
    const path = arg('file')

    if (!profileId || !marketId || !path) throw new Error('--profile, --market y --file son obligatorios')

    const file = JSON.parse(readFileSync(path, 'utf8')) as SetFile
    const errors = validate(file)

    if (errors.length > 0) throw new Error(`Set inválido:\n${errors.join('\n')}`)

    file.prompts.forEach((prompt, index) => console.log(`${String(index + 1).padStart(2, '0')}${index >= 12 ? ' (fuera del modo full)' : ''} [${prompt.family}/${prompt.intentStage}${prompt.namesBrand ? '/marca' : ''}] ${prompt.text}`))

    if (!apply) {
      console.log('\nDry-run: agrega --apply para crear el borrador.')

      return
    }

    const draft = await createGraderPromptSetDraft({
      subject,
      profileId,
      marketId,
      businessModel: file.businessModel,
      categoryNodeId: file.categoryNodeId,
      prompts: file.prompts,
      generationStrategy: 'template_baseline',
      model: null,
      systemPromptVersion: null,
      groundingSources: [`operator:${file.reason.slice(0, 120)}`],
      createdBy: ACTOR
    })

    console.log(`\nborrador creado: ${draft.setId} v${draft.version} (${draft.status}). Apruébalo con: approve --set=${draft.setId} --apply`)

    return
  }

  if (command === 'approve') {
    const setId = arg('set')

    if (!setId) throw new Error('--set=gps-... es obligatorio')

    const current = await getPromptSet(setId)

    if (!current) throw new Error(`No existe el set ${setId}`)

    console.log(`${setId} v${current.version} ${current.status}, ${current.prompts.length} preguntas, perfil ${current.profileId}, mercado ${current.marketId ?? '—'}`)

    if (!apply) {
      console.log('Dry-run: agrega --apply para activarlo (el activo anterior queda reemplazado).')

      return
    }

    const approved = await approveGraderPromptSet({ subject, setId, approvedBy: ACTOR })

    console.log(`activo: ${approved.setId} v${approved.version} (${approved.status})`)

    return
  }

  if (command === 'set-category') {
    const profileId = arg('profile')
    const categoryNodeId = arg('category')
    const reason = arg('reason')

    if (!profileId || !categoryNodeId || !reason) throw new Error('--profile, --category y --reason son obligatorios')

    const node = getCategoryTaxonomyNode(categoryNodeId)

    if (!node) throw new Error(`La categoría ${categoryNodeId} no existe en la taxonomía`)

    console.log(`${profileId} → ${node.id} «${node.label.es}»`)

    if (!apply) {
      console.log('Dry-run: agrega --apply para corregir la categoría.')

      return
    }

    console.log(await overrideProfileCategory({ subject, profileId, categoryNodeId, reason, updatedBy: ACTOR }))

    return
  }

  throw new Error('Comando: list | create | approve | set-category')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error((error as Error).message)
    process.exit(1)
  })
