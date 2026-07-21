# Greenhouse runtime — Demo teamspace canonical (TASK-910)

> **Status canonical 2026-05-17**: Operador clonó Efeonce template a `Greenhouse Migration Demo` ✓. IDs verified live vía Notion MCP. TASK-910 implementation pending.
> **Purpose**: gate canonical pre-Fase 1 RpA pilot Efeonce (4 semanas runtime end-to-end verde DEMO antes de TASK-901 Slice 4)
> **Last verified**: 2026-05-17

## 1. IDs canonical verified (live 2026-05-17)

```typescript
// src/lib/notion-metrics/demo-config.ts (TBD canonical en TASK-910 S0)
export const DEMO_TEAMSPACE_CONFIG = {
  teamspaceId: '36339c2f-efe7-814c-a0f5-0042863dbb5a',
  teamspaceName: 'Demo Greenhouse',
  databases: {
    tasks: {
      pageId: '36339c2f-efe7-80e2-9109-e7e9e41b36e4',
      dataSourceId: '36339c2f-efe7-81a6-980c-000b0056bba8'
    },
    projects: {
      pageId: '36339c2f-efe7-800e-9bba-c5c1661dd242',
      dataSourceId: '36339c2f-efe7-8116-8c15-000be81c5538'
    },
    sprints: {
      pageId: '36339c2f-efe7-803c-a94a-e52bc41c8e77',  // Notice: name "Sprints " trailing space
      dataSourceId: '36339c2f-efe7-81cc-8f2f-000b112ee87c'
    }
  },
  webhookEndpoint: '/api/webhooks/notion-tasks-demo',
  hmacSecretRef: 'notion-webhook-signing-secret-demo',
  tenantType: 'demo' as const
} as const
```

## 2. Schema clone verified

Operador clonó Efeonce template 1:1. Formulas legacy preservadas para shadow mode paridad testing:
- **Tareas**: `Client Change Round Final` formula (code `Q3lidw`), `Completitud` formula
- **Proyectos**: `RpA Promedio` formula (code `Xmtgbw`), `% On-Time` formula (`VH1kUw`)
- **Sprints**: `Tareas completadas` + `Total de tareas` rollups

→ Habilita validación end-to-end durante shadow mode TASK-901: el helper canonical `calculateRpa(taskId)` debe matchear la fórmula Notion legacy en el mismo task de demo.

## 3. Cross-references integridad verified

- Proyectos data source referencia Tareas DS (`Tareas` rollup field) ✓
- Sprints data source referencia Tareas DS (`Tareas` rollup field) ✓
- Tareas data source referencia Proyectos DS + Sprints DS (relations bidireccionales) ✓

## 4. Historical identifiers — not an authorization boundary

| Database | Demo Greenhouse | Efeonce productivo | Sky Airline productivo |
|---|---|---|---|
| Teamspace ID (abbreviated for display) | `36339c2f-...4c-a0f5-0042863dbb5a` | `f31929ee-...` | `[Sky]` |
| Tasks Data Source | `36339c2f-...80c-000b0056bba8` | `5126d7d8-...80f4-be31d1ca38d4` | `23039c2f-...82d-000b67594d18` |

These displayed values help diagnose legacy records only. IDs are opaque and their prefixes do not prove tenant ownership. Writes require the resolved `space_id`, scoped token, exact data source binding and schema fingerprint from `work-space-registry.md`.

## 5. Garantías operativas canonical (TASK-910)

### Bonus calculation NUNCA toca demo members

3 layers defense in depth:

#### Layer 1 — Filter en `fetchKpisForPeriod`
```typescript
// src/lib/payroll/fetch-kpis-for-period.ts (TASK-910 Slice 5)
const memberKpisQuery = `
  SELECT m.member_id, m.rpa_avg, ...
  FROM members m
  JOIN ico_engine.metrics_by_member ...
  WHERE m.tenant_type != 'demo'   ← FILTER CANONICAL
    AND m.active = TRUE
`
```

#### Layer 2 — Pre-check en helpers bonus
```typescript
// src/lib/payroll/bonus-proration.ts (TASK-910 Slice 5)
export const calculateRpaBonus = (member: Member, kpis: KpiSnapshot, config: BonusConfig) => {
  if (member?.tenantType === 'demo') {
    return { amount: 0, qualifies: false, prorationFactor: null }
  }
  // ... resto del cálculo canonical
}
```

#### Layer 3 — Reliability signal
- `payroll.bonus.demo_member_contamination` (signal nuevo TASK-910) — count > 0 = bug crítico

### Demo events NUNCA contaminan productivo

- Reactive consumer filtra `metadata.demo_mode === true` antes de insert en `task_status_transitions_demo` (tabla separada física)
- Webhook secret separado (`notion-webhook-signing-secret-demo`)
- Endpoint separado (`/api/webhooks/notion-tasks-demo`)

## 6. Members sintéticos canonical

Pattern TASK-910 Slice 1 — 3-5 demo members con identidad sintética:

```typescript
// scripts/notion-metrics/setup-demo-members.ts
const DEMO_MEMBERS = [
  { displayName: 'Demo Juan', email: 'demo-juan@demo.greenhouse.efeonce.org', role: 'creative_producer' },
  { displayName: 'Demo Maria', email: 'demo-maria@demo.greenhouse.efeonce.org', role: 'content_lead' },
  { displayName: 'Demo Pedro', email: 'demo-pedro@demo.greenhouse.efeonce.org', role: 'designer' },
  { displayName: 'Demo Ana', email: 'demo-ana@demo.greenhouse.efeonce.org', role: 'designer' },
  { displayName: 'Demo Carlos', email: 'demo-carlos@demo.greenhouse.efeonce.org', role: 'designer' }
]
```

⚠️ **NUNCA** registrar miembros reales con `tenant_type='demo'` por error — auditará incorrecto.

## 7. Webhook subscription setup (operador)

1. Notion → Settings → Connections → Greenhouse integration
2. Webhooks tab → Create subscription
3. URL: `https://greenhouse.efeoncepro.com/api/webhooks/notion-tasks-demo`
4. Event types: `page.properties_updated` (mínimo), opcionales otros
5. Save → Notion envía `verification_token` POST
6. Token visible en `notion_webhook_inbox` (audit-only) — operador copia + paste a Notion UI
7. Token persistido como `notion-webhook-signing-secret-demo` en GCP Secret Manager

## 8. Reliability signals duales canonical

TASK-910 Slice 4 wire-up subsystem `Notion Metrics Migration` con signals demo + prod side-by-side:

| Signal | Productivo | Demo |
|---|---|---|
| `shadow_paridad_rpa` | `notion.metrics.shadow_paridad_rpa` | `notion.metrics.shadow_paridad_rpa_demo` |
| `echo_loop_detected` | `notion.metrics.echo_loop_detected` | `notion.metrics.echo_loop_detected_demo` |
| `webhook_signature_failures` | `notion.metrics.webhook_signature_failures` | `notion.metrics.webhook_signature_failures_demo` |
| `writeback_dead_letter` | `notion.metrics.writeback_dead_letter` | `notion.metrics.writeback_dead_letter_demo` |
| Schema drift detection | N/A | `notion.metrics.demo_teamspace_drift` (NEW) |

## 9. Cuándo deprecate / archive demo

Per ADR `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1`:
- Mantener demo **durante toda la migración 12-14 meses**
- Post Fase 5 complete (todas métricas críticas migradas + estables 90+ días) → evaluar archive vs keep-as-sandbox-innovation
- **NUNCA** archive durante la migración — sin él, los siguientes flips Fase 2-5 pierden el gate canonical

## 10. Hard rules canonical

- **NUNCA** computar bonus para demo members (3 layers defense in depth)
- **NUNCA** mezclar demo events con productivos en tabla `task_status_transitions`
- **NUNCA** compartir webhook secret demo ↔ prod
- **NUNCA** permitir acceso de cliente externo (Sky) al demo teamspace
- **NUNCA** desincronizar schema del demo con template productivo — cuando Efeonce template cambia, demo se actualiza en el mismo PR
- **NUNCA** archivar demo durante la migración
- **SIEMPRE** validar `tenant_type='demo'` en write paths críticos (defensive)

## 11. Cross-refs

- TASK-910 (Greenhouse) — implementation spec completa
- ADR `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1` — gate canonical
- `greenhouse-runtime/tenant-config.md` — multi-tenant pattern
- `use-cases-greenhouse/demo-sandbox.md` (stub) — operational detail
- CLAUDE.md § "ICO Metrics Progressive Migration invariants"
