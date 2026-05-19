# Notion Demo Teamspace — Governance canonical

> **Type**: Operations governance doc
> **Version**: 1.0
> **Created**: 2026-05-19 by TASK-910 Slice 6
> **Status**: Active (sandbox setup canonical, gate pre-Fase 1 RpA pilot Efeonce)
> **Spec técnica**: [TASK-910 spec](../tasks/in-progress/TASK-910-notion-demo-teamspace-migration-sandbox.md), [ADR ICO Metrics Progressive Migration V1](../architecture/GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md)

---

## Qué es este teamspace

**`Demo Greenhouse`** es un teamspace Notion sandbox creado live 2026-05-17 por operador. Sirve como **gate canonical pre-producción** para todo el motor ICO progressive migration (RpA, OTD, FTR, Cumplimiento, Cycle Time SLO%, etc.).

### IDs canonical verified

| Asset | Name | Notion ID |
|---|---|---|
| Teamspace | `Demo Greenhouse` | `36339c2f-efe7-814c-a0f5-0042863dbb5a` |
| Tareas DS | `Tareas` | `36339c2f-efe7-81a6-980c-000b0056bba8` |
| Proyectos DS | `Proyectos` | `36339c2f-efe7-8116-8c15-000be81c5538` |
| Sprints DS | `Sprints` | `36339c2f-efe7-81cc-8f2f-000b112ee87c` |

**Cero overlap** con IDs productivos (Efeonce `5126d7d8-...`, Sky `23039c2f-...`).

---

## Por qué existe

**Bug class motivador**: TASK-877 follow-up (3,168 tareas Sky con `rpa=null` 10 meses, nómina Sky proyectada perdía bonus RpA silenciosamente). Migración big-bang sin sandbox testing → riesgo similar × 14 métricas × N meses de migración.

**Demo teamspace** canonicaliza el principio defense-in-depth para el motor ICO: probar infrastructura nueva (webhook ingestion, reactive consumer, writeback Notion, recovery primitives) en ambiente equivalente a producción **pero aislado** antes de tocar Efeonce/Sky productivo.

---

## Garantías canonical (Defense in depth 9 capas)

| # | Garantía | Mecanismo canonical |
|---|---|---|
| 1 | **Tabla físicamente separada** `task_status_transitions_demo` | Migration Slice 0 + CHECK workspace_id='demo' + triggers append-only |
| 2 | **Discriminator `members.is_demo BOOLEAN`** default FALSE | Migration Slice 0 + index parcial |
| 3 | **Webhook dedicated** + HMAC secret separado | `/api/webhooks/notion-tasks-demo` + `notion-webhook-signing-secret-demo` (GCP) |
| 4 | **Sync legacy NO procesa demo** | `space_notion_sources.sync_enabled = FALSE` para demo space |
| 5 | **Helper `isDemoMember` strict** === true canonical | Anti-coersion contra truthy values |
| 6 | **Filter SQL canonical** en `fetchKpisForPeriod` | `WHERE m.is_demo = TRUE` exclude del payroll input |
| 7 | **Pre-check helpers** `calculateRpaBonusForMember` + `calculateOtdBonusForMember` | Defense in depth dual con wrappers canonical |
| 8 | **Reactive consumer filter** `metadata.demo_mode === true` | Demo events solo entran a tabla demo |
| 9 | **Reliability signal `payroll.bonus.demo_member_contamination`** | Steady=0. ERROR canonical si > 0 (NUNCA debe pasar) |

**Resultado canonical**: demo NUNCA afecta colaboradores reales en KPIs, bonus, payroll, dashboards productivos.

---

## Members sintéticos canonical V1

5 perfiles representativos (pattern Efeonce):

| Display Name | Email canonical | Role |
|---|---|---|
| Demo Juan | `demo-juan@demo.greenhouse.efeonce.org` | Creative Producer |
| Demo Maria | `demo-maria@demo.greenhouse.efeonce.org` | Content Lead |
| Demo Pedro | `demo-pedro@demo.greenhouse.efeonce.org` | Senior Designer |
| Demo Ana | `demo-ana@demo.greenhouse.efeonce.org` | Designer |
| Demo Carlos | `demo-carlos@demo.greenhouse.efeonce.org` | Junior Designer |

**Domain canonical**: `@demo.greenhouse.efeonce.org` (controlado, NO entrega email real). Helper `registerDemoMember` rechaza emails fuera del domain (anti-confusion).

---

## Acceso canonical

| Audiencia | Acceso permitido |
|---|---|
| EFEONCE_ADMIN | Lectura + ejecución completa (capability `notion.metrics.demo.execute` + `.read`) |
| EFEONCE_OPERATIONS | Lectura (capability `notion.metrics.demo.read`) |
| HR_MANAGER | Lectura (capability `notion.metrics.demo.read`) — para observation bonus guardrail signals |
| Cliente externo (Sky, etc.) | **NUNCA** — demo es interno Greenhouse |
| Demo members sintéticos | N/A — no son login users (no `client_users` rows) |

---

## Lifecycle canonical

### Manual sync con template Efeonce

Cuando el template productivo Efeonce cambie (rename status option, agregar property, etc.):

1. Operador replica el cambio manualmente en demo teamspace via Notion MCP/UI
2. Update `src/lib/sync/projections/notion-status-transition-capture-demo.ts` si CHECK constraint enum cambia
3. Update migration nueva si tabla schema cambia
4. Re-run `pnpm test src/lib/webhooks/handlers/notion-tasks-demo` para verificar status normalization

**NO automatizar sync schema (V1 manual)**. V2 reliability signal `notion.metrics.demo_teamspace_drift` ya detecta drift (Slice 4) — manual review canonical.

### Deprecation timeline

Demo teamspace es **load-bearing durante toda la migración** (12-14 meses canonical per ADR Strangler). Post-stable V1.0 todas métricas (Fase 5 complete):

- Opción A: archive demo + preserve audit trail (`task_status_transitions_demo` mantiene rows para post-mortems)
- Opción B: mantener como sandbox de innovation para próximas métricas V2+ (Frame.io, Iteration Velocity, BCS, TTM)

**Decisión**: V2 cuando emerja necesidad operativa. V1 mantener activo.

---

## Operador-side prerequisites (pre-V1.1 activation)

Las siguientes acciones requieren coordinación operador-side (NO agent-side):

1. **GCP Secret Manager**: crear secret `notion-webhook-signing-secret-demo`

   ```bash
   gcloud secrets create notion-webhook-signing-secret-demo \
     --replication-policy=automatic --project=efeonce-group

   echo -n "<random 32 bytes hex>" | gcloud secrets versions add \
     notion-webhook-signing-secret-demo --data-file=- --project=efeonce-group
   ```

2. **Vercel env var**: setear `NOTION_DEMO_WEBHOOK_SIGNING_SECRET_REF` apuntando al secret resource name.

3. **Notion Developer Console**: registrar webhook subscription en el teamspace `Demo Greenhouse` apuntando a `https://greenhouse.efeoncepro.com/api/webhooks/notion-tasks-demo` con el HMAC secret demo.

4. **(Opcional)** `GREENHOUSE_NOTION_INTEGRATION_USER_ID`: env var para echo-loop filter activo (cuando integration user de Greenhouse escribe writebacks).

5. **(Opcional)** Poblar páginas test en demo Notion (5-10 tareas, 1-2 proyectos, 1 sprint) + asignar a Notion People sintéticos (si operador los crea).

---

## Verification canonical post-shipping

Cuando operador-side prerequisites listos:

| Check | Comando canonical |
|---|---|
| Migration applied | `pnpm migrate:status` → ver `20260519120713456_task-910-demo-teamspace-sandbox-foundation` aplicada |
| Tabla demo creada | `psql -c "\dt greenhouse_delivery.task_status_transitions_demo"` |
| Capabilities seeded | `SELECT * FROM greenhouse_core.capabilities_registry WHERE capability_key LIKE 'notion.metrics.demo.%' AND deprecated_at IS NULL` |
| Webhook endpoint registered | `SELECT * FROM greenhouse_sync.webhook_endpoints WHERE endpoint_key = 'notion-tasks-demo' AND active = TRUE` |
| Members sintéticos | `SELECT * FROM greenhouse_core.members WHERE is_demo = TRUE` |
| Reliability signals visibles | `/admin/operations` page → 6 demo signals canonical |
| Bonus guardrail verde | `SELECT * FROM payroll_entries pe JOIN members m ON m.member_id = pe.member_id WHERE m.is_demo = TRUE` → 0 rows |

---

## Reliability signals canonical

6 signals visibles en `/admin/operations` (subsystem rollup `delivery` para 5 + `payroll` para 1 critical):

| Signal ID | Kind | Steady state | Severity matrix |
|---|---|---|---|
| `notion.metrics.shadow_paridad_rpa_demo` | drift | unknown pre-TASK-913 | warning > 5% diff post-V1.1 |
| `notion.metrics.echo_loop_detected_demo` | drift | 0 | warning 1-10, error > 10 |
| `notion.metrics.webhook_signature_failures_demo` | drift | 0 | warning 1-5, error > 5 |
| `notion.metrics.writeback_dead_letter_demo` | drift | unknown pre-V1.1 | error > 0 (deferred V1.1) |
| `notion.metrics.demo_teamspace_drift` | drift | 0 | warning > 0 (schema drift) |
| `payroll.bonus.demo_member_contamination` | drift | 0 | **ERROR canonical si > 0** ⚠️ |

---

## Hard rules canonical (NUNCA)

- **NUNCA** computar bonus para demo members. Filter SQL + helper pre-check garantizan canonical.
- **NUNCA** mezclar demo events con productivos en tabla `task_status_transitions`. Físicamente separadas.
- **NUNCA** compartir webhook HMAC secret entre prod y demo. GCP secrets separados.
- **NUNCA** permitir cliente externo (Sky, etc.) accese al demo teamspace. Solo interno Greenhouse + HR + Delivery.
- **NUNCA** desincronizar schema demo del template Efeonce sin update governance doc.
- **NUNCA** archivar demo durante la migración (12-14 meses). Demo es load-bearing.
- **NUNCA** activar `sync_enabled=TRUE` en demo `space_notion_sources` row. Sync legacy NO procesa demo.
- **NUNCA** marcar real member con `is_demo=TRUE` manualmente. Helper `registerDemoMember` rechaza convertir.
- **NUNCA** invocar `Sentry.captureException()` directo en demo code paths. Usar `captureWithDomain('integrations.notion', ...)` o `'payroll'` para signal contamination.

---

## Cross-refs

- Spec implementación: `docs/tasks/in-progress/TASK-910-notion-demo-teamspace-migration-sandbox.md`
- ADR Strangler Migration: `docs/architecture/GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` §9
- ADR Boundary Notion ↔ Greenhouse: `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`
- Webhook handler: `src/lib/webhooks/handlers/notion-tasks-demo.ts`
- Reactive consumer: `src/lib/sync/projections/notion-status-transition-capture-demo.ts`
- Identity helpers: `src/lib/identity/demo-members.ts`
- Bonus guardrail: `src/lib/payroll/fetch-kpis-for-period.ts` + `src/lib/payroll/bonus-proration.ts`
- Reliability signals: `src/lib/reliability/queries/notion-metrics-demo-signals.ts`
- Migration foundation: `migrations/20260519120713456_task-910-demo-teamspace-sandbox-foundation.sql`
