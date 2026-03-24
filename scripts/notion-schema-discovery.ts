/**
 * Notion Schema Discovery — Multi-Space Property Comparison
 * Efeonce Group · Greenhouse Conformed Data Layer
 *
 * Compares Notion database properties across Spaces to identify naming/type
 * differences and generates property mapping configuration for onboarding
 * new clients into the conformed data layer.
 *
 * Usage:
 *   npx tsx scripts/notion-schema-discovery.ts [--space-id <id>]
 *
 * Requires:
 *   - NOTION_TOKEN env var (or in .env.local) with access to all target databases
 *   - Postgres connection (reads client_notion_bindings for database IDs)
 */

import process from 'node:process'
import { writeFileSync } from 'node:fs'

import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

// ---------------------------------------------------------------------------
// Conformed schema target (matches greenhouse_conformed.delivery_tasks)
// ---------------------------------------------------------------------------

interface ConformedFieldDef {
  bqType: string
  description: string
  required: boolean
}

const CONFORMED_SCHEMA: Record<string, ConformedFieldDef> = {
  task_status:                { bqType: 'STRING',  description: 'Estado actual de la tarea',                required: true },
  client_change_round_final:  { bqType: 'INTEGER', description: 'Rondas de revisión del cliente',           required: true },
  client_change_round_label:  { bqType: 'STRING',  description: 'Rondas de revisión (label original)',      required: false },
  workflow_change_round:      { bqType: 'INTEGER', description: 'Rondas de revisión internas',              required: false },
  rpa_value:                  { bqType: 'FLOAT',   description: 'Rounds per Asset (fórmula Notion)',        required: false },
  rpa_semaphore_source:       { bqType: 'STRING',  description: 'Semáforo RpA (verde/amarillo/rojo)',       required: false },
  frame_versions:             { bqType: 'INTEGER', description: 'Total versiones en Frame.io',              required: false },
  frame_comments:             { bqType: 'INTEGER', description: 'Total comentarios Frame.io',               required: false },
  open_frame_comments:        { bqType: 'INTEGER', description: 'Comentarios sin resolver Frame.io',        required: false },
  client_review_open:         { bqType: 'BOOLEAN', description: 'Revisión de cliente abierta',              required: false },
  workflow_review_open:       { bqType: 'BOOLEAN', description: 'Revisión interna abierta',                 required: false },
  review_source:              { bqType: 'STRING',  description: 'Origen de última revisión',                required: false },
  last_reviewed_version:      { bqType: 'INTEGER', description: 'Última versión revisada',                  required: false },
  notion_project_id:          { bqType: 'STRING',  description: 'Relación al proyecto padre (page ID)',     required: true },
  notion_sprint_id:           { bqType: 'STRING',  description: 'Relación al sprint/ciclo (page ID)',       required: false },
  url_frame_io:               { bqType: 'STRING',  description: 'URL del asset en Frame.io',                required: false },
  task_name:                  { bqType: 'STRING',  description: 'Nombre de la tarea',                       required: true },
  task_phase:                 { bqType: 'STRING',  description: 'Fase/priorización de la tarea',            required: false },
  task_priority:              { bqType: 'STRING',  description: 'Prioridad de la tarea',                    required: false },
  completion_label:           { bqType: 'STRING',  description: 'Etiqueta de completitud',                  required: false },
  delivery_compliance:        { bqType: 'STRING',  description: 'Cumplimiento de entrega',                  required: false },
  completed_at:               { bqType: 'TIMESTAMP', description: 'Fecha de completación',                  required: false },
}

// ---------------------------------------------------------------------------
// Name matching patterns (Notion property name → conformed field)
// ---------------------------------------------------------------------------

const NAME_PATTERNS: Record<string, string[]> = {
  task_status:                ['estado', 'status', 'state', 'estatus', 'estado_tarea', 'task_status'],
  task_name:                  ['nombre_de_tarea', 'nombre', 'name', 'titulo', 'task_name', 'tarea'],
  task_phase:                 ['priorizacion', 'fase', 'phase', 'priorizacion'],
  task_priority:              ['prioridad', 'priority', 'urgencia'],
  client_change_round_final:  ['client_change_round_final', 'client_change_round', 'rondas_cliente',
                               'rounds_client', 'rondas_de_revision', 'cambios_cliente'],
  client_change_round_label:  ['client_change_round_label'],
  workflow_change_round:      ['workflow_change_round', 'rondas_workflow', 'rondas_internas', 'internal_rounds'],
  rpa_value:                  ['rpa', 'rounds_per_asset', 'rondas_por_asset', 'rpa_value'],
  rpa_semaphore_source:       ['semaforo_rpa', 'semaforo', 'traffic_light', 'rpa_semaforo', 'rpa_semaphore_source'],
  frame_versions:             ['frame_versions', 'frame_version', 'versiones', 'versions'],
  frame_comments:             ['frame_comments', 'comentarios', 'comments'],
  open_frame_comments:        ['open_frame_comments', 'comentarios_abiertos', 'open_comments'],
  client_review_open:         ['client_review_open', 'revision_cliente', 'client_review', 'en_revision_cliente'],
  workflow_review_open:       ['workflow_review_open', 'revision_interna', 'workflow_review'],
  review_source:              ['review_source', 'fuente_revision', 'source'],
  last_reviewed_version:      ['last_reviewed_version', 'ultima_version', 'version_revisada'],
  notion_project_id:          ['proyecto', 'project', 'proyectos', 'proyecto_ids'],
  notion_sprint_id:           ['sprint', 'sprints', 'ciclo', 'ciclos', 'cycle'],
  url_frame_io:               ['url_frame_io', 'url_frame', 'frame_io_url', 'frame_url', 'frameio'],
  completion_label:           ['completitud', 'completion', 'finalizacion'],
  delivery_compliance:        ['cumplimiento', 'compliance', 'delivery_compliance'],
  completed_at:               ['fecha_de_completado', 'completed_at', 'completed_date', 'fecha_completado'],
}

// ---------------------------------------------------------------------------
// Notion API helpers
// ---------------------------------------------------------------------------

const NOTION_API = 'https://api.notion.com/v1'

const notionHeaders = () => ({
  'Authorization': `Bearer ${process.env.NOTION_TOKEN || ''}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28'
})

interface NotionPropertyConfig {
  type: string
  id: string
  options?: string[]
  groups?: string[]
  expression?: string
  rollupConfig?: { relation: string; rollupProperty: string; function: string }
  relationDb?: string
  numberFormat?: string
}

const getDatabaseSchema = async (databaseId: string): Promise<{ title: string; properties: Record<string, NotionPropertyConfig> }> => {
  const res = await fetch(`${NOTION_API}/databases/${databaseId}`, { headers: notionHeaders() })

  if (!res.ok) {
    const text = await res.text()

    throw new Error(`Notion API ${res.status}: ${text}`)
  }

  const data = await res.json()
  const titleParts = data.title || []
  const title = titleParts[0]?.plain_text || 'Sin título'

  const properties: Record<string, NotionPropertyConfig> = {}

  for (const [name, config] of Object.entries(data.properties || {})) {
    const c = config as Record<string, unknown>
    const propType = String(c.type || 'unknown')
    const info: NotionPropertyConfig = { type: propType, id: String(c.id || '') }

    if (propType === 'select') {
      info.options = ((c.select as Record<string, unknown>)?.options as Array<{ name: string }> || []).map(o => o.name)
    } else if (propType === 'multi_select') {
      info.options = ((c.multi_select as Record<string, unknown>)?.options as Array<{ name: string }> || []).map(o => o.name)
    } else if (propType === 'status') {
      const statusConfig = c.status as Record<string, unknown> || {}

      info.options = (statusConfig.options as Array<{ name: string }> || []).map(o => o.name)
      info.groups = (statusConfig.groups as Array<{ name: string }> || []).map(g => g.name)
    } else if (propType === 'formula') {
      info.expression = String((c.formula as Record<string, unknown>)?.expression || '')
    } else if (propType === 'rollup') {
      const rc = c.rollup as Record<string, unknown> || {}

      info.rollupConfig = {
        relation: String(rc.relation_property_name || ''),
        rollupProperty: String(rc.rollup_property_name || ''),
        function: String(rc.function || '')
      }
    } else if (propType === 'relation') {
      info.relationDb = String((c.relation as Record<string, unknown>)?.database_id || '')
    } else if (propType === 'number') {
      info.numberFormat = String((c.number as Record<string, unknown>)?.format || 'number')
    }

    properties[name] = info
  }

  return { title, properties }
}

// ---------------------------------------------------------------------------
// Matching engine
// ---------------------------------------------------------------------------

const normalizeKey = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s.\-]+/g, '_')

const typesCompatible = (notionType: string, bqType: string): boolean => {
  const compat = new Set([
    'number:INTEGER', 'number:FLOAT', 'select:STRING', 'status:STRING',
    'multi_select:STRING', 'rich_text:STRING', 'title:STRING', 'url:STRING',
    'checkbox:BOOLEAN', 'date:TIMESTAMP', 'date:DATE', 'relation:STRING',
    'people:STRING', 'created_time:TIMESTAMP', 'last_edited_time:TIMESTAMP'
  ])

  return compat.has(`${notionType}:${bqType}`)
}

const suggestCoercion = (notionType: string, bqType: string): string => {
  if (typesCompatible(notionType, bqType)) return 'direct'

  if (notionType === 'formula') {
    if (bqType === 'INTEGER') return 'formula_to_int'
    if (bqType === 'FLOAT') return 'formula_to_float'
    if (bqType === 'STRING') return 'formula_to_string'
    if (bqType === 'BOOLEAN') return 'formula_to_bool'
  }

  if (notionType === 'rollup') {
    if (bqType === 'INTEGER') return 'rollup_to_int'
    if (bqType === 'FLOAT') return 'rollup_to_float'
    if (bqType === 'STRING') return 'rollup_to_string'
  }

  if (['rich_text', 'title'].includes(notionType) && ['INTEGER', 'FLOAT'].includes(bqType)) {
    return 'extract_number_from_text'
  }

  if (notionType === 'number' && bqType === 'STRING') return 'number_to_string'

  return `custom_${notionType}_to_${bqType.toLowerCase()}`
}

interface MatchResult {
  conformedField: string
  confidence: 'HIGH' | 'MEDIUM'
  reason: string
}

const findLikelyMatches = (propName: string, conformedField: string): MatchResult[] => {
  const normalized = normalizeKey(propName)
  const patterns = NAME_PATTERNS[conformedField]

  if (!patterns) return []

  const matches: MatchResult[] = []

  for (const pattern of patterns) {
    if (pattern === normalized) {
      matches.push({ conformedField, confidence: 'HIGH', reason: `Exact match: '${normalized}'` })
      break
    }

    if (normalized.includes(pattern) || pattern.includes(normalized)) {
      matches.push({ conformedField, confidence: 'MEDIUM', reason: `Partial match: '${normalized}' ~ '${pattern}'` })
      break
    }
  }

  return matches
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

interface SpaceData {
  spaceName: string
  spaceId: string
  dbTareas: string
  dbTitle: string
  properties: Record<string, NotionPropertyConfig>
  error?: string
}

const generateReport = (spaces: SpaceData[]): string => {
  const lines: string[] = []
  const ts = new Date().toISOString().slice(0, 16).replace('T', ' ')

  lines.push('# Notion Schema Discovery Report')
  lines.push(`\n**Generado:** ${ts}`)
  lines.push(`**Spaces analizados:** ${spaces.length}\n`)

  // Section 1: Overview
  lines.push('---\n## 1. Resumen por Space\n')

  for (const space of spaces) {
    lines.push(`### ${space.spaceName}`)
    lines.push(`- **Base de datos:** ${space.dbTitle}`)
    lines.push(`- **Database ID:** \`${space.dbTareas}\``)

    if (space.error) {
      lines.push(`- **Error:** ${space.error}\n`)
      continue
    }

    const props = space.properties
    const count = Object.keys(props).length

    lines.push(`- **Total propiedades:** ${count}`)

    const typeCounts: Record<string, number> = {}

    for (const p of Object.values(props)) {
      typeCounts[p.type] = (typeCounts[p.type] || 0) + 1
    }

    lines.push(`- **Por tipo:** ${Object.entries(typeCounts).sort().map(([t, c]) => `${t}: ${c}`).join(', ')}\n`)
  }

  // Section 2: Conformed schema mapping
  lines.push('---\n## 2. Mapeo al schema conformed\n')

  for (const [field, def] of Object.entries(CONFORMED_SCHEMA)) {
    const required = def.required ? '🔴 REQUIRED' : '⚪ optional'

    lines.push(`### \`${field}\` (${def.bqType}) — ${required}`)
    lines.push(`_${def.description}_\n`)

    for (const space of spaces) {
      if (space.error) {
        lines.push(`- **${space.spaceName}:** ❌ Error al consultar\n`)
        continue
      }

      let found = false

      for (const [propName, propInfo] of Object.entries(space.properties)) {
        const matches = findLikelyMatches(propName, field)

        if (matches.length > 0) {
          const m = matches[0]
          const typeOk = typesCompatible(propInfo.type, def.bqType) ? '✅' : '⚠️ COERCION'

          lines.push(`- **${space.spaceName}:** \`${propName}\` (tipo: \`${propInfo.type}\`) — ${typeOk} — confianza: ${m.confidence}`)

          if (propInfo.expression) {
            lines.push(`  - Fórmula: \`${propInfo.expression.slice(0, 100)}\``)
          }

          found = true
          break
        }
      }

      if (!found) {
        lines.push(`- **${space.spaceName}:** ❌ **NO MATCH** — revisar manualmente`)
      }
    }

    lines.push('')
  }

  // Section 3: Unmapped properties
  lines.push('---\n## 3. Propiedades sin mapeo\n')

  for (const space of spaces) {
    if (space.error) continue

    const unmapped: Array<[string, NotionPropertyConfig]> = []

    for (const [propName, propInfo] of Object.entries(space.properties)) {
      let hasMatch = false

      for (const field of Object.keys(CONFORMED_SCHEMA)) {
        if (findLikelyMatches(propName, field).length > 0) {
          hasMatch = true
          break
        }
      }

      if (!hasMatch) {
        unmapped.push([propName, propInfo])
      }
    }

    if (unmapped.length > 0) {
      lines.push(`### ${space.spaceName} (${unmapped.length} sin mapeo)`)

      for (const [name, info] of unmapped.sort((a, b) => a[0].localeCompare(b[0]))) {
        lines.push(`- \`${name}\` — tipo: \`${info.type}\``)
      }

      lines.push('')
    }
  }

  // Section 4: Type conflicts
  lines.push('---\n## 4. Conflictos de tipo\n')
  let conflictsFound = false

  for (const [field, def] of Object.entries(CONFORMED_SCHEMA)) {
    const detected: Array<{ spaceName: string; propName: string; notionType: string }> = []

    for (const space of spaces) {
      if (space.error) continue

      for (const [propName, propInfo] of Object.entries(space.properties)) {
        if (findLikelyMatches(propName, field).length > 0) {
          detected.push({ spaceName: space.spaceName, propName, notionType: propInfo.type })
          break
        }
      }
    }

    if (detected.length >= 2) {
      const types = new Set(detected.map(d => d.notionType))

      if (types.size > 1) {
        conflictsFound = true
        lines.push(`### ⚠️ \`${field}\` — conflicto de tipos`)
        lines.push(`Target type: \`${def.bqType}\`\n`)

        for (const d of detected) {
          const coercion = suggestCoercion(d.notionType, def.bqType)

          lines.push(`- **${d.spaceName}:** \`${d.propName}\` → tipo \`${d.notionType}\` → coercion: \`${coercion}\``)
        }

        lines.push('')
      }
    }
  }

  if (!conflictsFound) {
    lines.push('_No se detectaron conflictos de tipo entre los Spaces analizados._\n')
  }

  // Section 5: Full property catalog
  lines.push('---\n## 5. Catálogo completo\n')

  for (const space of spaces) {
    if (space.error) continue

    lines.push(`### ${space.spaceName}\n`)
    lines.push('| Propiedad | Tipo | Config |')
    lines.push('|-----------|------|--------|')

    for (const [name, info] of Object.entries(space.properties).sort((a, b) => a[0].localeCompare(b[0]))) {
      const parts: string[] = []

      if (info.options) parts.push(info.options.slice(0, 5).join(', ') + (info.options.length > 5 ? ` (+${info.options.length - 5})` : ''))
      if (info.expression) parts.push(`formula: \`${info.expression.slice(0, 50)}\``)
      if (info.rollupConfig) parts.push(`rollup: ${info.rollupConfig.function}(${info.rollupConfig.rollupProperty})`)
      if (info.numberFormat) parts.push(`format: ${info.numberFormat}`)

      const config = parts.join(' · ') || '—'

      lines.push(`| ${name} | \`${info.type}\` | ${config.slice(0, 60)} |`)
    }

    lines.push('')
  }

  // Section 6: Seed SQL
  lines.push('---\n## 6. Seed propuesto para `space_property_mappings`\n')
  lines.push('```sql')
  lines.push('-- Auto-generated. REVISAR antes de insertar.\n')

  for (const space of spaces) {
    if (space.error) continue

    lines.push(`-- ${space.spaceName} (${space.spaceId})`)
    let idx = 0

    for (const [field, def] of Object.entries(CONFORMED_SCHEMA)) {
      for (const [propName, propInfo] of Object.entries(space.properties)) {
        const matches = findLikelyMatches(propName, field)

        if (matches.length > 0 && matches[0].confidence === 'HIGH') {
          idx++
          const coercion = suggestCoercion(propInfo.type, def.bqType)
          const id = `${space.spaceId.replace(/^space-/, '')}-${String(idx).padStart(3, '0')}`

          lines.push(
            `INSERT INTO greenhouse_delivery.space_property_mappings ` +
            `(id, space_id, notion_property_name, conformed_field_name, notion_type, target_type, coercion_rule, is_required) VALUES ` +
            `('${id}', '${space.spaceId}', '${propName.replace(/'/g, "''")}', '${field}', '${propInfo.type}', '${def.bqType}', '${coercion}', ${def.required});`
          )
        }
      }
    }

    lines.push('')
  }

  lines.push('```\n')

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const notionToken = process.env.NOTION_TOKEN

  if (!notionToken) {
    console.error('❌ NOTION_TOKEN not configured. Set it in .env.local or as env var.')
    process.exit(1)
  }

  const targetSpaceId = process.argv.find((_, i, a) => a[i - 1] === '--space-id') || null

  console.log('🔍 Notion Schema Discovery')
  console.log(`   Target: ${targetSpaceId || 'all spaces with Notion bindings'}`)
  console.log()

  // Load space configurations from Postgres (client_notion_bindings / clients table)
  let spaceConfigs: Array<{ spaceName: string; spaceId: string; dbTareas: string }>

  try {
    // Get Notion database IDs from the registered spaces
    const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
      `SELECT
         sns.space_id,
         c.client_name,
         sns.notion_database_ids
       FROM greenhouse_core.space_notion_sources sns
       INNER JOIN greenhouse_core.clients c ON c.client_id = sns.client_id
       WHERE sns.sync_enabled = TRUE
       ${targetSpaceId ? 'AND sns.space_id = $1' : ''}`,
      targetSpaceId ? [targetSpaceId] : []
    )

    if (rows.length === 0) {
      // Fallback: read from clients table directly
      const clientRows = await runGreenhousePostgresQuery<Record<string, unknown>>(
        `SELECT client_id, client_name, notion_project_ids
         FROM greenhouse_core.clients
         WHERE notion_project_ids IS NOT NULL
         ${targetSpaceId ? 'AND client_id = $1' : ''}`,
        targetSpaceId ? [targetSpaceId] : []
      )

      console.log(`   Found ${clientRows.length} client(s) with Notion bindings (clients table fallback)`)

      spaceConfigs = clientRows
        .filter(r => r.client_id)
        .map(r => ({
          spaceName: String(r.client_name || r.client_id),
          spaceId: String(r.client_id),
          dbTareas: '' // Will need manual database ID input
        }))
    } else {
      spaceConfigs = rows.map(r => {
        const dbIds = r.notion_database_ids as Record<string, string> | null

        return {
          spaceName: String(r.client_name || r.space_id),
          spaceId: String(r.space_id),
          dbTareas: dbIds?.tareas || dbIds?.tasks || ''
        }
      })
    }
  } catch (error) {
    console.error('⚠️ Could not read space configurations from Postgres:', error instanceof Error ? error.message : error)
    console.log('   Using hardcoded Efeonce config as fallback')

    spaceConfigs = [{
      spaceName: 'Efeonce',
      spaceId: 'space-efeonce',
      dbTareas: '3a54f0904be14158833533ba96557a73'
    }]
  }

  if (spaceConfigs.length === 0) {
    console.error('❌ No spaces found to analyze.')
    await closeGreenhousePostgres()
    process.exit(1)
  }

  console.log(`   Spaces to analyze: ${spaceConfigs.length}`)
  console.log()

  const spacesData: SpaceData[] = []

  for (const config of spaceConfigs) {
    console.log(`📦 Analyzing: ${config.spaceName} (${config.spaceId})`)

    if (!config.dbTareas) {
      console.log(`   ⚠️ No database ID for tareas — skipping Notion API call`)
      spacesData.push({
        ...config,
        dbTitle: '(no database ID)',
        properties: {},
        error: 'No database ID configured'
      })
      continue
    }

    try {
      const { title, properties } = await getDatabaseSchema(config.dbTareas)

      console.log(`   ✅ ${Object.keys(properties).length} properties found (${title})`)

      spacesData.push({
        ...config,
        dbTitle: title,
        properties
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)

      console.error(`   ❌ Error: ${msg}`)
      spacesData.push({
        ...config,
        dbTitle: '(error)',
        properties: {},
        error: msg
      })
    }
  }

  console.log()

  // Generate report
  const report = generateReport(spacesData)
  const reportPath = 'discovery_report.md'

  writeFileSync(reportPath, report, 'utf-8')
  console.log(`📄 Report: ${reportPath}`)

  // Save raw data
  const rawPath = 'discovery_raw.json'

  const rawExport = spacesData.map(s => ({
    spaceName: s.spaceName,
    spaceId: s.spaceId,
    dbTareas: s.dbTareas,
    dbTitle: s.dbTitle,
    propertyCount: Object.keys(s.properties).length,
    properties: s.properties,
    error: s.error || null
  }))

  writeFileSync(rawPath, JSON.stringify(rawExport, null, 2), 'utf-8')
  console.log(`📊 Raw data: ${rawPath}`)

  await closeGreenhousePostgres()
}

main().catch(error => {
  console.error('Fatal error:', error)
  closeGreenhousePostgres().finally(() => process.exit(1))
})
