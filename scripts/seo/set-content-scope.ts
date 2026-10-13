/**
 * Alcance de contenido de una organización (TASK-2033): qué parte de su sitio trabaja Efeonce.
 *
 * Pasa por el command canónico `setSeoContentScope` y NO por SQL: valida las reglas, versiona (append-only) y es
 * idempotente —fijar las mismas reglas y la misma etiqueta no escribe—. Efeonce Insights mide las ediciones NUEVAS
 * de la organización sobre el alcance vigente; las ya selladas no cambian.
 *
 * Usage:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/seo/set-content-scope.ts \
 *     --org=org-... --label="Artículos y tutoriales" \
 *     --prefix=/articulos --prefix=/tutoriales --exact=/guia-de-barniz \
 *     --reason="Por qué cambia el alcance" [--from=2026-09-01 --to=2026-10-01] [--apply]
 *
 *   --clear        fija una versión SIN reglas: la organización vuelve a medirse sobre el sitio completo.
 *   --from/--to    ventana `[from, to)` para la vista previa (por defecto, el último mes calendario completo con datos).
 *
 * Sin `--apply` es dry-run: muestra el alcance vigente, lo que el nuevo mediría frente al sitio completo y las páginas
 * con más clics que quedarían FUERA (para detectar contenido propio que el alcance olvida). No escribe nada.
 */

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')
// El recorte vive en los readers del módulo SEO; esta herramienta los usa tal cual para la vista previa.
process.env.GROWTH_SEO_ENABLED = 'true'

import { query } from '@/lib/db'
import { type SeoContentScopeRuleV1, isPathInContentScope, parseSeoContentScopeRules } from '@/lib/growth/seo/content-scope/contracts'
import { SeoContentScopeInputError, readSeoContentScope, setSeoContentScope } from '@/lib/growth/seo/content-scope/store'
import { readSeoOverviewKpisForWindow } from '@/lib/growth/seo/overview/read-overview-kpis'

const values = (name: string): string[] => process.argv.filter(arg => arg.startsWith(`--${name}=`)).map(arg => arg.slice(name.length + 3))
const value = (name: string): string | undefined => values(name)[0]

const ORGANIZATION_ID = value('org')
const APPLY = process.argv.includes('--apply')
const CLEAR = process.argv.includes('--clear')
const OUTSIDE_LIMIT = 15

const formatRules = (rules: readonly SeoContentScopeRuleV1[]): string => (rules.length === 0 ? '(sin reglas: sitio completo)' : rules.map(rule => `${rule.kind === 'prefix' ? 'prefijo' : 'exacta'} ${rule.path}`).join(' · '))

const number = (input: number): string => new Intl.NumberFormat('es-CL').format(input)

const defaultWindow = async (organizationId: string): Promise<{ from: string; toExclusive: string } | null> => {
  const rows = await query<{ from_date: string | null; to_date: string | null }>(
    `SELECT (date_trunc('month', MAX(capture_date)) - interval '1 month')::date::text AS from_date,
            date_trunc('month', MAX(capture_date))::date::text AS to_date
       FROM greenhouse_growth.seo_gsc_daily
      WHERE organization_id = $1`,
    [organizationId]
  )

  return rows[0]?.from_date && rows[0].to_date ? { from: rows[0].from_date, toExclusive: rows[0].to_date } : null
}

const main = async () => {
  if (!ORGANIZATION_ID) throw new Error('Falta --org=<organization_id>')

  const organizations = await query<{ organization_name: string }>(`SELECT organization_name FROM greenhouse_core.organizations WHERE organization_id = $1`, [ORGANIZATION_ID])

  if (organizations.length === 0) throw new Error(`La organización ${ORGANIZATION_ID} no existe`)

  const proposed = CLEAR ? [] : [...values('prefix').map(path => ({ kind: 'prefix', path })), ...values('exact').map(path => ({ kind: 'exact', path }))]
  const parsed = parseSeoContentScopeRules(proposed)

  if (!parsed.ok) throw new SeoContentScopeInputError(parsed.errors)
  if (!CLEAR && parsed.rules.length === 0) throw new Error('Faltan reglas: usa --prefix=/ruta o --exact=/ruta (o --clear para volver al sitio completo)')

  const label = value('label') ?? (CLEAR ? 'Sitio completo' : undefined)
  const reason = value('reason')

  if (!label) throw new Error('Falta --label="Nombre del contenido medido"')

  const current = await readSeoContentScope(ORGANIZATION_ID)

  console.log(`Organización: ${organizations[0]!.organization_name} (${ORGANIZATION_ID})`)
  console.log(`Alcance vigente: ${current ? `v${current.version} «${current.label}» — ${formatRules(current.rules)}` : '(ninguno: sitio completo)'}`)
  console.log(`Alcance propuesto: «${label}» — ${formatRules(parsed.rules)}\n`)

  const window = value('from') && value('to') ? { from: value('from')!, toExclusive: value('to')! } : await defaultWindow(ORGANIZATION_ID)

  if (window && parsed.rules.length > 0) {
    const [whole, scoped] = await Promise.all([
      readSeoOverviewKpisForWindow(ORGANIZATION_ID, window),
      readSeoOverviewKpisForWindow(ORGANIZATION_ID, window, { scope: { rules: parsed.rules } })
    ])

    const share = (part: number, total: number): string => (total > 0 ? `${((part / total) * 100).toFixed(1).replace('.', ',')} %` : '—')

    console.log(`Vista previa sobre Search Console, ${window.from} → ${window.toExclusive} (fin exclusivo):`)
    console.log(`  Sitio completo : ${number(whole.totals.clicks)} clics · ${number(whole.totals.impressions)} impresiones`)
    console.log(`  Alcance        : ${number(scoped.totals.clicks)} clics (${share(scoped.totals.clicks, whole.totals.clicks)}) · ${number(scoped.totals.impressions)} impresiones (${share(scoped.totals.impressions, whole.totals.impressions)})`)

    const pages = await query<{ page: string; clicks: string; impressions: string }>(
      `SELECT page, SUM(clicks)::text AS clicks, SUM(impressions)::text AS impressions
         FROM greenhouse_growth.seo_gsc_daily
        WHERE organization_id = $1 AND capture_date >= $2::date AND capture_date < $3::date
        GROUP BY page
        ORDER BY SUM(clicks) DESC, page COLLATE "C"`,
      [ORGANIZATION_ID, window.from, window.toExclusive]
    )

    const inside = pages.filter(row => isPathInContentScope(row.page, parsed.rules))
    const outside = pages.filter(row => !isPathInContentScope(row.page, parsed.rules))

    console.log(`  Páginas        : ${number(inside.length)} dentro del alcance, ${number(outside.length)} fuera\n`)
    console.log(`Páginas FUERA del alcance con más clics (revisa que ninguna sea contenido que trabajamos):`)

    for (const row of outside.slice(0, OUTSIDE_LIMIT)) {
      console.log(`  ${number(Number(row.clicks)).padStart(8)} clics · ${number(Number(row.impressions)).padStart(9)} impr. · ${row.page}`)
    }

    console.log('')
  } else if (!window) {
    console.log('Sin capturas de Search Console para la organización: no hay vista previa.\n')
  }

  if (!APPLY) {
    console.log('DRY-RUN — sin `--apply` no se escribe nada. Vuelve a correr con --apply (y --reason="…") para fijar el alcance.')

    return
  }

  if (!reason) throw new Error('Falta --reason="Por qué cambia el alcance" (queda registrado en la versión)')

  const result = await setSeoContentScope({ organizationId: ORGANIZATION_ID, label, rules: parsed.rules, reason, actor: { kind: 'operator_cli', userId: value('user') ?? null } })

  console.log(result.changed ? `Alcance fijado: v${result.scope.version} «${result.scope.label}» — ${formatRules(result.scope.rules)}` : 'Sin cambios: el alcance vigente ya es ese.')
  console.log('Las ediciones nuevas de Efeonce Insights de esta organización se miden sobre el alcance vigente; las ya selladas no cambian.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error instanceof SeoContentScopeInputError ? `Alcance inválido:\n- ${error.errors.join('\n- ')}` : error instanceof Error ? error.message : error)
    process.exit(1)
  })
