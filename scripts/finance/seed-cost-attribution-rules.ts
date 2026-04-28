#!/usr/bin/env tsx
/**
 * TASK-705 — Seed expense attribution rules.
 *
 * Reglas declaradas por el founder (Julio Reyes) el 2026-04-28:
 *
 *   - Vercel       → overhead Greenhouse (hosting plataforma)
 *   - Anthropic    → overhead Greenhouse R&D (Claude Code para dev)
 *   - Adobe Creative → equipo creativo (Daniela, Andrés, Melkin)
 *   - Envato       → equipo creativo
 *   - Notion       → overhead operativo (todos los miembros)
 *   - Google Workspace + Cloud → overhead infra
 *   - Toku/Nubox   → overhead admin contabilidad
 *   - GitHub       → overhead Greenhouse dev
 *   - OpenAI       → overhead R&D tooling
 *   - ElevenLabs   → overhead R&D tooling
 *   - Metricool    → cliente Motogas SpA (PENDIENTE crear cliente)
 *   - Deel REC-*   → payroll directo Melkin
 *   - Daniela payroll Global66 → direct member
 *   - Andres payroll Global66  → direct member
 *
 * El cliente Motogas SpA es declarado por el user manualmente; Metricool
 * queda con default_allocated_client_id NULL hasta que se actualice.
 */

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const CREATIVE_TEAM = ['daniela-ferreira', 'andres-carlosama', 'melkin-hernandez']

interface RuleSeed {
  rule_id: string
  rule_priority: number
  match_supplier_pattern?: string | null
  match_reference_pattern?: string | null
  match_description_pattern?: string | null
  match_currency?: string | null
  tool_catalog_id?: string | null
  cost_category: 'operational' | 'overhead' | 'direct_client' | 'direct_member' | 'tax' | 'investment'
  cost_is_direct: boolean
  allocation_strategy: 'single_client' | 'single_member' | 'team_split_equal' | 'all_active_members' | 'overhead_internal' | 'business_line' | 'manual_required'
  default_allocated_client_id?: string | null
  default_member_ids?: string[] | null
  default_service_line?: string | null
  default_direct_overhead_kind?: string | null
  default_business_line?: string | null
  rule_name: string
  rule_description?: string
}

const RULES: RuleSeed[] = [
  // === Specific reference matches (highest priority) ===
  {
    rule_id: 'rule-deel-payroll-melkin',
    rule_priority: 1000,
    match_reference_pattern: 'deel-REC-%',
    cost_category: 'direct_member',
    cost_is_direct: true,
    allocation_strategy: 'single_member',
    default_member_ids: ['melkin-hernandez'],
    default_direct_overhead_kind: 'international_payroll',
    rule_name: 'Deel REC-* → Melkin Hernández (Nicaragua)',
    rule_description: 'Pagos Deel a Melkin Hernández como contractor internacional. Direct member cost.'
  },

  // === Supplier name patterns (highest specificity first) ===
  {
    rule_id: 'rule-vercel',
    rule_priority: 900,
    match_supplier_pattern: 'Vercel%',
    cost_category: 'overhead',
    cost_is_direct: false,
    allocation_strategy: 'overhead_internal',
    default_direct_overhead_kind: 'internal_platform_infra',
    default_business_line: 'greenhouse-platform',
    rule_name: 'Vercel → overhead infra plataforma Greenhouse',
    rule_description: 'Hosting de Greenhouse (interno). NO se atribuye a cliente.'
  },
  {
    rule_id: 'rule-anthropic',
    rule_priority: 900,
    match_supplier_pattern: 'Anthropic%',
    tool_catalog_id: 'claude-opus',
    cost_category: 'overhead',
    cost_is_direct: false,
    allocation_strategy: 'overhead_internal',
    default_direct_overhead_kind: 'internal_rd_tooling',
    default_business_line: 'greenhouse-platform',
    rule_name: 'Anthropic Claude → overhead R&D Greenhouse',
    rule_description: 'Claude Code usado para desarrollo de Greenhouse. NO se atribuye a cliente.'
  },
  {
    rule_id: 'rule-openai',
    rule_priority: 900,
    match_supplier_pattern: 'OpenAI%',
    tool_catalog_id: 'chatgpt-team',
    cost_category: 'overhead',
    cost_is_direct: false,
    allocation_strategy: 'overhead_internal',
    default_direct_overhead_kind: 'internal_rd_tooling',
    rule_name: 'OpenAI → overhead R&D tooling',
    rule_description: 'OpenAI subscriptions (ChatGPT, API). Overhead R&D Greenhouse.'
  },
  {
    rule_id: 'rule-adobe',
    rule_priority: 900,
    match_supplier_pattern: 'Adobe%',
    cost_category: 'direct_member',
    cost_is_direct: true,
    allocation_strategy: 'team_split_equal',
    default_member_ids: CREATIVE_TEAM,
    default_direct_overhead_kind: 'creative_team_tooling',
    rule_name: 'Adobe Creative Cloud → equipo creativo',
    rule_description: 'Adobe Creative Cloud usado por Daniela, Andrés, Melkin. Split equal entre los 3.'
  },
  {
    rule_id: 'rule-envato',
    rule_priority: 900,
    match_supplier_pattern: 'Envato%',
    cost_category: 'direct_member',
    cost_is_direct: true,
    allocation_strategy: 'team_split_equal',
    default_member_ids: CREATIVE_TEAM,
    default_direct_overhead_kind: 'creative_team_tooling',
    rule_name: 'Envato Elements → equipo creativo',
    rule_description: 'Assets visuales usados por equipo creativo. Split equal entre Daniela, Andrés, Melkin.'
  },
  {
    rule_id: 'rule-elevenlabs',
    rule_priority: 900,
    match_supplier_pattern: 'ElevenLabs%',
    cost_category: 'overhead',
    cost_is_direct: false,
    allocation_strategy: 'overhead_internal',
    default_direct_overhead_kind: 'internal_rd_tooling',
    rule_name: 'ElevenLabs → overhead R&D tooling',
    rule_description: 'AI voice tooling. Overhead Greenhouse hasta atribución específica.'
  },
  {
    rule_id: 'rule-metricool',
    rule_priority: 900,
    match_supplier_pattern: 'Metricool%',
    cost_category: 'direct_client',
    cost_is_direct: true,
    allocation_strategy: 'single_client',
    default_allocated_client_id: null,  // PENDIENTE Motogas SpA — actualizar cuando user cree el client_id
    default_member_ids: ['valentina-hoyos'],
    default_service_line: 'social_media_management',
    rule_name: 'Metricool → cliente Motogas (Valentina)',
    rule_description: 'Metricool usado por Valentina para social media de Motogas SpA. PENDIENTE: actualizar default_allocated_client_id cuando se cree el cliente.'
  },
  {
    rule_id: 'rule-notion',
    rule_priority: 900,
    match_supplier_pattern: 'Notion%',
    cost_category: 'overhead',
    cost_is_direct: false,
    allocation_strategy: 'all_active_members',
    default_direct_overhead_kind: 'workspace_collaboration',
    rule_name: 'Notion → overhead operativo (todos los miembros)',
    rule_description: 'Notion workspace usado por todo el equipo. Distribuido per-seat entre miembros activos.'
  },
  {
    rule_id: 'rule-google-workspace',
    rule_priority: 900,
    match_supplier_pattern: 'Google%',
    cost_category: 'overhead',
    cost_is_direct: false,
    allocation_strategy: 'overhead_internal',
    default_direct_overhead_kind: 'cloud_infrastructure',
    rule_name: 'Google Workspace + Cloud → overhead infra',
    rule_description: 'Pagos Google Workspace + Google Cloud. Overhead infra (incluye Google Play YouTube charges como suscripciones del equipo).'
  },
  {
    rule_id: 'rule-toku-nubox',
    rule_priority: 900,
    match_supplier_pattern: '%Nubox%',
    cost_category: 'overhead',
    cost_is_direct: false,
    allocation_strategy: 'overhead_internal',
    default_direct_overhead_kind: 'admin_accounting',
    rule_name: 'Nubox / Toku → overhead admin',
    rule_description: 'Software de contabilidad y facturación. Overhead admin Greenhouse.'
  },
  {
    rule_id: 'rule-github',
    rule_priority: 900,
    match_supplier_pattern: 'GitHub%',
    cost_category: 'overhead',
    cost_is_direct: false,
    allocation_strategy: 'overhead_internal',
    default_direct_overhead_kind: 'internal_dev_tooling',
    default_business_line: 'greenhouse-platform',
    rule_name: 'GitHub → overhead dev tooling',
    rule_description: 'GitHub subscription. Overhead dev tooling Greenhouse.'
  },

  // === Global66 payroll outflows (matched by description containing member names) ===
  {
    rule_id: 'rule-global66-daniela',
    rule_priority: 850,
    match_description_pattern: '%Daniela%',
    cost_category: 'direct_member',
    cost_is_direct: true,
    allocation_strategy: 'single_member',
    default_member_ids: ['daniela-ferreira'],
    default_direct_overhead_kind: 'international_payroll',
    rule_name: 'Global66 payroll → Daniela Ferreira (España)',
    rule_description: 'Pagos nómina internacional a Daniela vía Global66.'
  },
  {
    rule_id: 'rule-global66-andres',
    rule_priority: 850,
    match_description_pattern: '%Andr%s Carlosama%',
    cost_category: 'direct_member',
    cost_is_direct: true,
    allocation_strategy: 'single_member',
    default_member_ids: ['andres-carlosama'],
    default_direct_overhead_kind: 'international_payroll',
    rule_name: 'Global66 payroll → Andrés Carlosama (Colombia)',
    rule_description: 'Pagos nómina internacional a Andrés vía Global66.'
  },

  // === FX fees / generic Global66 fees ===
  {
    rule_id: 'rule-fx-fees',
    rule_priority: 700,
    match_reference_pattern: '%-fxfee-%',
    cost_category: 'overhead',
    cost_is_direct: false,
    allocation_strategy: 'overhead_internal',
    default_direct_overhead_kind: 'fx_settlement_fees',
    rule_name: 'FX settlement fees → overhead financiero',
    rule_description: 'Fees por conversión FX en transferencias internacionales. Overhead financiero.'
  }
]

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  console.log(`[seed-cost-attribution] Inserting/updating ${RULES.length} rules...`)

  for (const rule of RULES) {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_finance.expense_attribution_rules (
         rule_id, rule_priority, is_active,
         match_supplier_pattern, match_reference_pattern, match_description_pattern, match_currency,
         tool_catalog_id, cost_category, cost_is_direct, allocation_strategy,
         default_allocated_client_id, default_member_ids, default_service_line,
         default_direct_overhead_kind, default_business_line,
         rule_name, rule_description
       ) VALUES (
         $1, $2, TRUE,
         $3, $4, $5, $6,
         $7, $8, $9, $10,
         $11, $12, $13,
         $14, $15,
         $16, $17
       )
       ON CONFLICT (rule_id) DO UPDATE SET
         rule_priority = EXCLUDED.rule_priority,
         match_supplier_pattern = EXCLUDED.match_supplier_pattern,
         match_reference_pattern = EXCLUDED.match_reference_pattern,
         match_description_pattern = EXCLUDED.match_description_pattern,
         match_currency = EXCLUDED.match_currency,
         tool_catalog_id = EXCLUDED.tool_catalog_id,
         cost_category = EXCLUDED.cost_category,
         cost_is_direct = EXCLUDED.cost_is_direct,
         allocation_strategy = EXCLUDED.allocation_strategy,
         default_allocated_client_id = EXCLUDED.default_allocated_client_id,
         default_member_ids = EXCLUDED.default_member_ids,
         default_service_line = EXCLUDED.default_service_line,
         default_direct_overhead_kind = EXCLUDED.default_direct_overhead_kind,
         default_business_line = EXCLUDED.default_business_line,
         rule_name = EXCLUDED.rule_name,
         rule_description = EXCLUDED.rule_description,
         updated_at = NOW()`,
      [
        rule.rule_id, rule.rule_priority,
        rule.match_supplier_pattern ?? null, rule.match_reference_pattern ?? null,
        rule.match_description_pattern ?? null, rule.match_currency ?? null,
        rule.tool_catalog_id ?? null, rule.cost_category, rule.cost_is_direct, rule.allocation_strategy,
        rule.default_allocated_client_id ?? null, rule.default_member_ids ?? null,
        rule.default_service_line ?? null,
        rule.default_direct_overhead_kind ?? null, rule.default_business_line ?? null,
        rule.rule_name, rule.rule_description ?? null
      ]
    )

    console.log(`  ✓ ${rule.rule_id} (priority ${rule.rule_priority})`)
  }

  console.log('[seed-cost-attribution] Done.')
}

main().catch(err => {
  console.error('[seed-cost-attribution] FAILED:', err.message)
  console.error(err.stack)
  process.exit(1)
})
