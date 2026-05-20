# Greenhouse ICO Metrics Progressive Migration V1

> **ADR canonical** — formaliza la estrategia operacional para migrar el cómputo de las 14 métricas ICO desde fórmulas Notion (legacy, frágiles) hacia compute canonical Greenhouse con writeback (TASK-901+). **NO es big-bang** — strangler pattern obligatorio con stop-gates canonical, demo teamspace pre-prod, recovery primitives explícitas y backward compatibility 90+ días.
>
> Este ADR es el **contrato operacional que protege la migración de los siguientes 12-14 meses**. Sin él, cualquier task downstream (TASK-901/902/903/etc.) tiene tentación de "flip rápido para terminar el sprint" — esa tentación es el bug class que dejó 3,168 tareas Sky con `rpa=null` 10 meses (TASK-877 follow-up).

| Campo | Valor |
|---|---|
| Status | Accepted |
| Decision date | 2026-05-17 |
| Author | Operador + arch reasoning post sesión Payroll bonus ADR |
| Scope | Migración de 14 métricas ICO canonical (RpA, FTR, OTD, Cumplimiento, Cycle Time, CT Variance, CT SLO%, Throughput, Pipeline Velocity, CSC Distribution, Stuck Assets, Stuck %, OCF, + narrative-level Iteration Velocity/BCS/TTM deferred) |
| Cross-refs | `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` (boundary) · `GREENHOUSE_METRIC_SPEC_PATTERN_V1.md` (specs) · `GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md` (bonus consumer) · 14 specs en `metrics/` · TASK-908 (foundation) · TASK-901/902 (RpA/OTD writeback) · TASK-910 (demo teamspace sandbox) |

---

## 1. Decisión canonical

La migración del compute canonical de métricas ICO **NO es big-bang**. Es **strangler pattern obligatorio** con:

1. **Foundation completa antes de cualquier migration** (TASK-908 status transition tracking + `countCorrectionTransitions` helper canonical).
2. **Demo teamspace sandbox** (TASK-910) como **gate canonical pre-Fase 1** — valida pattern arquitectónico end-to-end antes de tocar producción.
3. **Pilot scope ≤ 1 cliente** (Efeonce primero, Sky después) — NUNCA flip global directo.
4. **8 stop-gates obligatorios canonical** que deben cumplirse TODOS antes de cada flip (no judgment call ad-hoc).
5. **Backward compatibility 90+ días** — formulas Notion legacy NO se borran durante la migración.
6. **Defense in depth 8-layer per flip** (feature flag per-cliente per-métrica + kill switch + reliability signal + HR sign-off + snapshot pre-flip + Sentry alerts + runbook + cliente sign-off cuando aplica).
7. **Recovery primitives canonical** pre-instaladas (4 scripts + dashboard + runbook) ANTES del primer flip.
8. **Cuándo NO migrar** documentado explícito (BCS/TTM/Iteration Velocity deferred hasta Frame.io + ad platforms).

**Timeline realista**: ~12-14 meses end-to-end para las 13 métricas operacionales. Las 3 narrative-level (BCS, TTM, Iteration Velocity) quedan deferred V2.

---

## 2. Risk surface canonical — 3 capas con sensibilidades distintas

| Capa | Blast radius si rompe | Tolerancia drift | Velocidad migración |
|---|---|---|---|
| **Bonus (RpA + OTD)** | Compensación financiera real del colaborador. Bug class TASK-877 follow-up demostró: nómina Sky proyectada perdía bonus RpA silenciosamente 10 meses. Ofensa potencial vs equipo + retraso pago + recálculos manuales. | **Cero** — discrepancia >1% requiere rollback inmediato. HR firma cada flip. | **Más lenta** (90+ días/métrica) — pilot Efeonce → observation 30d → HR reconciliation bonus mes 1 → expand Sky → observation 30d → 90d total declared stable |
| **Visible operacional (FTR, Cycle Time, CT SLO%, Throughput, Pipeline Velocity, Cumplimiento per-task, CSC Distribution, Stuck Assets, Stuck %, OCF, CT Variance)** | Operador/cliente ve número raro en Pulse/Person 360/CVR — erosión confianza. Cliente Sky pregunta "por qué cambió mi CT este mes". Caso peor: cliente cuestiona retención. | Baja — drift sostenido >5% afecta retención cliente | **Media** (30-60 días/métrica) — shadow 7d + flip + observation 30d |
| **Narrative-level Revenue Enabled (Iteration Velocity, BCS, TTM)** | Pitch comercial — claim difícil de defender. V1 mostly proxy mode HONESTO. | Media — sustentables como proxy si transparente. | **NO migrar V1** — esperar Frame.io + ad platforms integration |

---

## 3. 8 Stop-gates canonical obligatorios (no judgment call ad-hoc)

Cada flip de writeback de métrica `Vn → Vn+1` debe cumplir **TODOS** los 8 antes de avanzar. Falta cualquiera → **NO flip**. No "casi listo".

### 3.1 Foundation completa

- TASK-908 Slices 0-3.5 SHIPPED + tabla `task_status_transitions` poblada vía webhook live
- Backfill histórico best-effort completado (TASK-908 Slice 9) — porcentaje de tareas con transition rows materializado documentado
- Helper canonical `countCorrectionTransitions(taskId)` SHIPPED + verde en producción 7+ días

### 3.2 Demo teamspace pre-prod (TASK-910)

- **4 semanas runtime end-to-end** en demo teamspace con la métrica target ya en writeback enabled demo
- Reliability signals demo verde sostenido (`notion.metrics.shadow_paridad_<metric>_demo` steady=0)
- Recovery primitives testeadas end-to-end en demo (kill switch < 5min, rollback script, reconciliation script)
- HR/Delivery training completado vía demo
- Operador firma comprensión del flow

### 3.3 Shadow mode prod verde 30 días (bonus metrics) / 7 días (operational)

- Shadow mode activo (compute canonical Greenhouse + LOG-only, sin writeback)
- Reliability signal `notion.metrics.shadow_paridad_<metric>` steady=0 (paridad > 99% members con data canónica completa)
- Cero issues Sentry `domain=integrations.notion` últimos 30 días pre-flip

### 3.4 Pilot scope ≤ 1 cliente — Efeonce primero

- Primer flip: SOLO Efeonce internal (`tenant_type='efeonce_internal'` members)
- Sky flip ocurre 30 días después de Efeonce verde + HR reconciliation passed
- NUNCA flip ambos clientes simultáneamente
- Feature flag per-cliente per-métrica (`NOTION_RPA_WRITEBACK_ENABLED_EFEONCE`, `NOTION_RPA_WRITEBACK_ENABLED_SKY` distintos)

### 3.5 HR/Finance written sign-off (bonus metrics solamente: RpA + OTD)

- Approval en `Handoff.md` con allowlist explícita de members impactados
- HR review de proyección bonus mes pre-flip vs simulated bonus post-flip — diff <1%
- Plan de reconciliation bonus mes 1 post-flip documentado y aceptado
- Plan de comunicación al equipo HR + colaboradores afectados documentado

### 3.6 Snapshot pre-flip restorable

- BQ snapshot persistido (`ico_engine_backup.metrics_by_*_<metric>_<date>`) con la data completa pre-flip
- Restorable con paridad <1 hora vía script `scripts/notion-metrics/restore-snapshot-<metric>.ts`
- Snapshot incluye `metrics_by_member` + `payroll_entries` proyectado si bonus metric

### 3.7 Kill switch verificado en staging

- Env var revert testeado: `NOTION_<METRIC>_WRITEBACK_ENABLED=true` → `false` en staging
- Comprueba que restaura comportamiento legacy en <5 minutos sin redeploy
- Verifica que el formula Notion legacy sigue computando correctamente cuando writeback se apaga
- Runbook de kill switch publicado: pasos exactos + quién tiene autoridad para ejecutarlo

### 3.8 Runbook operativo + cliente sign-off

- Runbook `docs/operations/runbooks/notion-metric-writeback-<metric>.md` publicado:
  - Cómo verificar paridad post-flip
  - Cómo ejecutar rollback (paso por paso, comandos verbatim)
  - Cómo escalation a HR/Finance si emergen issues bonus
  - Qué reportar al cliente si pregunta por discrepancia
- Cliente sign-off via QBR (solo si métrica visible al cliente — OTD, CT, FTR, Cycle Time, RpA aparecen en CVR)
  - Cliente Efeonce: HR Efeonce informal sign-off (interno)
  - Cliente Sky: Account Manager Sky sign-off (externo) — risk management

---

## 4. Defense in depth canonical per flip — 8 layers

Cada flip a producción debe tener las 8 layers activas SIMULTÁNEAMENTE:

| Layer | Mecanismo |
|---|---|
| 1. **Feature flag per cliente per métrica** | `NOTION_<METRIC>_WRITEBACK_ENABLED_<CLIENT>` env var (default `false`) |
| 2. **Kill switch instant rollback** | Env var revert <5min sin redeploy; restaura legacy formula behavior |
| 3. **Reliability signal paridad active** | `notion.metrics.shadow_paridad_<metric>` steady=0 monitoreado 7+ días post-flip |
| 4. **HR reconciliation script** | Para bonus metrics: compara bonus computed vs legacy manual mes 1 post-flip; >1% diff → rollback |
| 5. **Snapshot BQ pre-flip restorable** | `ico_engine_backup.metrics_by_*_<metric>_<date>` |
| 6. **Sentry alerts canonical** | `domain=integrations.notion` con threshold ajustado per métrica |
| 7. **Runbook operativo publicado** | `docs/operations/runbooks/notion-metric-writeback-<metric>.md` + difundido HR/Delivery |
| 8. **Cliente sign-off cuando aplica** | QBR conversation o written approval per cliente externo (Sky) |

---

## 5. Ramp canonical por fases (6 fases, ~12-14 meses)

```text
Fase 0 — Foundation (T+0 → T+6 semanas)
   TASK-908 Slices 0-3.5 ship → task_status_transitions live
   TASK-908 Slice 9 backfill histórico best-effort
   Reliability signals foundation
   countCorrectionTransitions helper canonical SHIPPED

Fase 0.5 — Demo teamspace setup (T+0 → T+4 semanas, paralelo a Fase 0)
   TASK-910 ship: demo teamspace clone Efeonce
     - Schema 1:1 vía Notion MCP
     - Members sintéticos + bridge identity flag tenant_type='demo'
     - Webhook endpoint dedicado /api/webhooks/notion-tasks-demo
     - Outbox events marcados demo_mode=true
     - Reliability signals duales con sufijo _demo
     - Governance doc + comunicación equipo

Fase 1 — RpA pilot Efeonce (T+10 → T+22 semanas, 12 semanas)
   T+10:  TASK-901 Slices 0-4 ship → shadow mode Efeonce activo
          Stop-gate check: 8 gates green
   T+10 → T+14:  4 semanas shadow demo (TASK-910 verde)
   T+14 → T+18:  4 semanas shadow Efeonce prod
                  reliability signal shadow_paridad_rpa steady=0
                  zero Sentry domain=integrations.notion
                  HR sign-off Handoff.md
   T+18:  Flip writeback Efeonce ONLY
   T+18 → T+22:  4 semanas observation Efeonce
                  HR reconciliation bonus mes 1
                  diff <1% → continue
                  diff >1% → rollback + investigation
   T+22:  Pass → expand a Sky (Fase 2)

Fase 2 — RpA Sky (T+22 → T+30 semanas, 8 semanas)
   T+22 → T+26:  4 semanas shadow Sky
                  reliability signal shadow_paridad_rpa_sky steady=0
                  HR sign-off + cliente Sky sign-off via QBR
   T+26:  Flip writeback Sky
   T+26 → T+30:  4 semanas observation Sky
                  HR reconciliation bonus mes 1
                  pass → declare RpA stable V1.0
   Total RpA end-to-end: ~6 meses (Fase 0 + 0.5 + 1 + 2)

Fase 3 — OTD% (T+30 → T+42 semanas, 12 semanas)
   Mismo pattern que RpA (HR sign-off + pilot Efeonce → Sky + 90d observation)
   Diferencia: bonus OTD usa graduated linear proration distinta
     → HR review específico
   Total OTD end-to-end: ~3 meses

Fase 4 — Operational metrics non-bonus rapid (T+42 → T+50 semanas, 8 semanas)
   FTR (delega a RpA — automático cuando RpA verde),
   Cycle Time, CT SLO%, CT Variance
   Pattern más rápido (no afecta bonus directo):
     - 7d shadow demo + 7d shadow prod + flip + 30d observation
     - Pueden migrar en paralelo si pattern Slice 5+ ya battle-tested
   No HR sign-off requerido (no bonus impact)
   Sí client sign-off Sky vía QBR (visible)

Fase 5 — Resto operational (T+50 → T+58 semanas, 8 semanas)
   Throughput, Pipeline Velocity, Stuck Assets, Stuck %, OCF,
   CSC Distribution, Cumplimiento per-task
   Pattern paralelo mismo gateado
   Total operational completo: ~9 meses

Fase 6 — Narrative Revenue Enabled (DEFERRED V2)
   BCS, TTM, Iteration Velocity NO se migran hasta que Frame.io +
   ad platforms shippeen
   Cuando emerja integración → strangler propio pattern con su
   ADR derivado
```

**Timeline total realista**: 12-14 meses para 13 métricas operacionales. Big-bang vs progressive = años de runtime estable vs días.

---

## 6. Backward compatibility canonical 90+ días

Durante TODA la migración:

- **Formulas Notion legacy de RpA/OTD/FTR/Cumplimiento/etc. NO se borran del template** ni de tareas existentes
- **Notion property `[GH] <métrica>` coexiste** con property formula legacy en paralelo
- **Mínimo 90 días de coexistencia** post-flip antes de discutir deprecation
- Cuando emerja discrepancia, operador puede comparar ambos lados visualmente
- Templates nuevos creados post-V2 stable (todas métricas verde 90 días) pueden omitir formulas legacy
- Tareas pre-deployment quedan con formulas legacy intactas para audit histórico

---

## 7. Recovery primitives canonical (pre-instalar antes de Fase 1)

Antes del primer flip de Fase 1 debemos tener listos en código + producción:

| Primitive | File | Función |
|---|---|---|
| **Rollback script** | `scripts/notion-metrics/rollback-writeback-<metric>.ts` | Disable feature flag + restore previous state + reconcile metrics_by_member if needed |
| **Reconciliation script** | `scripts/notion-metrics/reconcile-<metric>-paridad.ts` | Compute paridad Greenhouse-computed vs Notion-stored vs legacy SQL; emite report CSV con drift per member |
| **Snapshot script** | `scripts/notion-metrics/snapshot-pre-flip-<metric>.ts` | BQ snapshot completo de `metrics_by_member.<metric>` + `payroll_entries` projection + state Notion properties |
| **HR bonus simulator** | `scripts/notion-metrics/simulate-bonus-impact-<metric>.ts` | Para RpA + OTD pre-flip: simula bonus mes N+1 con compute canonical vs legacy; muestra diff per member |
| **Reliability dashboard** | `/admin/operations` subsystem `Notion Metrics Migration` rollup | Visibility en vivo: signals paridad demo + prod + Sentry alerts + flip status per métrica per cliente |
| **Runbook canonical** | `docs/operations/runbooks/notion-metric-writeback-rollback.md` | Pasos exactos rollback < 5min |

---

## 8. Cuándo NO migrar / cuándo abortar

### 8.1 Métricas que NO migran V1

- **BCS, TTM, Iteration Velocity** → dependen de Frame.io + ad platforms que NO existen. Quedan en `proxy` mode honesto. V2 indefinido.

### 8.2 Condiciones de abort durante migración

| Trigger | Acción |
|---|---|
| Shadow mode demo paridad <99% sustained | NO flip — investigation primero |
| Shadow mode prod paridad <99% sustained | NO flip — investigation primero |
| Issue Sentry `domain=integrations.notion` recurrente | NO flip nuevo — fix primero |
| Bug class emergente durante pilot Efeonce | **Rollback + halt migration completa**, evaluar cause root, RCA documentada antes de retry |
| HR/Finance no firma | NO flip (bonus metrics) |
| Cliente Sky no firma | NO flip Fase 2 (RpA Sky / OTD Sky / métricas visibles) |
| Reliability dashboard muestra cualquier kind=`drift` activo en `Notion Metrics Migration` subsystem | NO flip nuevo hasta limpiar |
| HR reconciliation bonus mes 1 post-flip diff >1% | **Rollback inmediato** — investigation antes de retry |
| Cliente reporta discrepancia operativa post-flip | **Rollback** dentro de 24h si discrepancia confirmada — investigation antes de retry |

### 8.3 Cuándo declarar métrica "stable V1.0"

Una métrica se declara `stable V1.0` cuando:

- 90 días post-flip Sky (full coverage cross-cliente)
- Reliability signal `shadow_paridad_<metric>` steady=0 sostenido 90 días
- Zero issues Sentry `domain=integrations.notion` para esa métrica últimos 90 días
- HR reconciliation bonus 3 ciclos consecutivos diff <1% (solo bonus metrics)
- Sin rollbacks en últimos 90 días

Post-stable: spec V1 graduates a Accepted, METRICS_INDEX actualiza estado writeback a `enabled`, formula Notion legacy puede deprecarse en templates nuevos (no en existentes).

---

## 9. Demo teamspace canonical (TASK-910 — stop-gate adicional)

### 9.1 Por qué demo teamspace es stop-gate

- **Isolation total**: bugs en TASK-901/908 NO afectan nómina real
- **Echo-loop testing**: webhook → outbox → consumer → bulk PATCH → Notion writeback → webhook eco dispara — solo demo permite testear loop end-to-end sin riesgo
- **Rate limiting testing**: throttle bulk PATCH vs Notion 3 req/sec real
- **Backfill testing**: paginación + rate limit complejo de Notion API history
- **HR/Delivery training**: pueden ver flow `[GH] <métrica>` writeback live antes del sign-off productivo
- **Recovery primitives end-to-end testing**: kill switch + rollback + reconciliation testeados antes de necesitarlos en prod

### 9.2 Demo teamspace governance canonical (TASK-910 spec)

| Aspecto | Decisión canonical |
|---|---|
| Teamspace target | Clone schema 1:1 de Efeonce template vía Notion MCP. Sky-flavor (estados `Tomado`/`Aprobado`/`Listo para revisión`/`En feedback`) se agrega al mismo demo en Fase 2 (no segundo teamspace). **Teamspace canonical creado live 2026-05-17**: `Demo Greenhouse` (ID `36339c2f-efe7-814c-a0f5-0042863dbb5a`) |
| Naming | `Greenhouse Migration Demo` con disclaimer claro |
| Members | Sintéticos con prefix `demo-` + emails `demo-<name>@demo.greenhouse.efeonce.org` + bridge identity flag `tenant_type='demo'` |
| Webhook endpoint | Dedicado `/api/webhooks/notion-tasks-demo/route.ts` (mismo handler, distinto entry) |
| Webhook secret HMAC | Separado: `notion-webhook-signing-secret-demo` |
| Outbox events | Marcados `metadata.demo_mode: true` |
| Reactive consumer | Filtra demo events a tabla separada `task_status_transitions_demo` |
| Reliability signals | Duales con sufijo `_demo` (e.g. `notion.metrics.shadow_paridad_rpa_demo`) |
| Bonus calculation | **Filtra demo members**: `fetchKpisForPeriod` excluye `tenant_type='demo'`. **Garantía operativa**: bonus de demo NUNCA toca payroll real |
| Lifecycle | Sync continuo con cambios de template productivo (mismo PR cuando emerge cambio) |
| Acceso cliente | Cliente Sky NO accede. Solo equipo interno Greenhouse + HR + Delivery |
| Demo deprecation | Post-stable V1.0 todas métricas (Fase 5 complete) puede archivarse o quedar como sandbox de innovation |

---

## 10. Hard rules canonical

- **NUNCA** flip writeback de métrica ICO sin pasar por los **8 stop-gates** canonical de §3. Falta cualquiera → NO flip.
- **NUNCA** flip global directo cross-cliente. **SIEMPRE** pilot Efeonce primero (30 días observation), después Sky.
- **NUNCA** borrar formula Notion legacy durante la migración. Mínimo **90 días coexistencia** post-flip stable.
- **NUNCA** ejecutar `NOTION_<METRIC>_WRITEBACK_ENABLED=true` sin: (a) demo teamspace verde 4 semanas, (b) shadow mode prod verde 30d bonus / 7d operational, (c) HR sign-off (bonus only), (d) snapshot pre-flip, (e) kill switch testeado staging, (f) runbook publicado.
- **NUNCA** computar bonus para demo members. `fetchKpisForPeriod` filtra `tenant_type='demo'` siempre. Garantía operativa: demo NUNCA toca payroll real.
- **NUNCA** ignorar reliability signal `notion.metrics.shadow_paridad_<metric>` con count > 0. Cualquier drift sostenido pre-flip = NO flip; cualquier drift sostenido post-flip = rollback.
- **NUNCA** flip nuevo si hay rollback de cualquier métrica últimos 30 días. Estabilizar antes de avanzar.
- **NUNCA** flip OTD% antes de RpA stable V1.0 (90 días post-Sky verde). Diferentes equipos cubren ambos para diversificar risk.
- **NUNCA** flip métrica narrative-level Revenue Enabled (BCS, TTM, Iteration Velocity) sin integración Frame.io + ad platforms. V1 mostly proxy honesto es OK.
- **NUNCA** flip métrica visible al cliente sin sign-off canonical (Efeonce HR informal interno; Sky Account Manager externo).
- **NUNCA** acelerar timeline canonical "porque va bien". 12-14 meses es el contrato canonical. Acelerar reintroduce risk class TASK-877 follow-up.
- **NUNCA** ejecutar rollback parcial (e.g. "rollback solo para member X pero mantener para member Y"). Rollback es per-cliente (feature flag) — granularidad menor no se soporta V1.
- **SIEMPRE** que emerja un bug class durante pilot Efeonce, halt migration completa + RCA documentada antes de retry.
- **SIEMPRE** snapshot BQ pre-flip persistido + restorable <1h antes de cualquier flip.
- **SIEMPRE** HR reconciliation bonus mes 1 post-flip antes de declarar pilot pass.
- **SIEMPRE** runbook canonical publicado per métrica antes del flip.

---

## 11. Cross-refs canonical

- **ADRs cross-cutting**:
  - `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — boundary Notion = OS / Greenhouse = motor (prerequisito conceptual)
  - `GREENHOUSE_METRIC_SPEC_PATTERN_V1.md` — pattern 1 métrica = 1 spec (cada migration alimenta su spec)
  - `GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md` — downstream consumer crítico (RpA + OTD inputs canonical)
- **Specs de métricas** (14 specs en `metrics/`):
  - Primary inputs bonus (delicadas): [RPA_V1](metrics/RPA_V1.md), [OTD_V1](metrics/OTD_V1.md), [CUMPLIMIENTO_V1](metrics/CUMPLIMIENTO_V1.md)
  - FTR delegación a RpA: [FTR_V1](metrics/FTR_V1.md)
  - Operational visible: [CYCLE_TIME_V1](metrics/CYCLE_TIME_V1.md), [CT_SLO_PCT_V1](metrics/CT_SLO_PCT_V1.md), [CYCLE_TIME_VARIANCE_V1](metrics/CYCLE_TIME_VARIANCE_V1.md), [THROUGHPUT_V1](metrics/THROUGHPUT_V1.md), [PIPELINE_VELOCITY_V1](metrics/PIPELINE_VELOCITY_V1.md), [CSC_DISTRIBUTION_V1](metrics/CSC_DISTRIBUTION_V1.md), [STUCK_ASSETS_V1](metrics/STUCK_ASSETS_V1.md), [STUCK_ASSET_PCT_V1](metrics/STUCK_ASSET_PCT_V1.md), [OCF_V1](metrics/OCF_V1.md)
  - Narrative Revenue Enabled DEFERRED V2: [ITERATION_VELOCITY_V1](metrics/ITERATION_VELOCITY_V1.md), [BCS_V1](metrics/BCS_V1.md), [TTM_V1](metrics/TTM_V1.md)
- **Tasks downstream que consumen este ADR**:
  - TASK-908 (foundation status transitions) — pre-requisito Fase 0
  - TASK-910 (demo teamspace sandbox) — pre-requisito Fase 0.5 + gate canonical pre-Fase 1
  - TASK-901 (RpA writeback V1) — Fase 1 + 2
  - TASK-902 (OTD writeback) — Fase 3 futura
  - TASK-903 (FTR writeback) — Fase 4 futura
  - TASK-904 (Cumplimiento writeback) — Fase 5 futura
  - TASK-905+ (resto operational) — Fase 5 futura
  - TASK-910+ futuras (BCS, TTM, Iteration Velocity) — V2 deferred
- **Código canonical relevante**:
  - `src/lib/notion-metrics/` — helpers canonical TS (incrementan per fase)
  - `src/lib/payroll/bonus-proration.ts` — downstream consumer fragile (RpA + OTD)
  - `src/lib/payroll/fetch-kpis-for-period.ts` — bridge canonical ICO → Payroll
  - `src/lib/ico-engine/metric-registry.ts` — agregado SQL canonical
- **Bug class fuente**:
  - TASK-877 follow-up (3,168 tareas Sky con `rpa=null` 10 meses) — motivó esta estrategia
  - Identity Bridge Cutover Protocol (CLAUDE.md) — lesson learned canonizada
- **Runbooks operativos**:
  - `docs/operations/runbooks/notion-metric-writeback-rollback.md` — pre-instalado pre-Fase 1
  - `docs/operations/runbooks/notion-metric-writeback-<metric>.md` — per métrica antes del flip

---

## 12. Open questions deliberadamente NO resueltas V1

- **Multi-cliente futuro post-Sky**: cuando emerja cliente cliente externo #3 (e.g. Globe Argentina), ¿se replica pattern pilot Efeonce → Sky → cliente nuevo? V1 asume sí. V2 puede paralelizar si pattern battle-tested.
- **Granularidad rollback per-member**: V1 rollback es per-cliente vía feature flag. ¿V2 permite rollback per-member específico para casos edge? Probable NO — granularity per-cliente es suficiente operativamente.
- **Backfill histórico vs forward-only**: V1 backfill best-effort histórico via Notion API history (TASK-908 Slice 9). ¿V2 mandato backfill perfecto (e.g. mediante audit de version history Notion)? Probable NO — best-effort suficiente; tareas sin history quedan `sourceMode='unavailable'` honesto.
- **Demo teamspace deprecation timeline**: post-stable V1.0 todas métricas, ¿archive o keep como sandbox innovation? Decisión cuando emerja caso.
- **Auto-rollback si signal alerta**: V1 rollback manual via runbook. ¿V2 auto-rollback si reliability signal cruza threshold critical? Probable NO — operator-initiated rollback preserva audit + accountability.
- **Cliente sign-off formalization**: V1 informal HR Efeonce + Sky Account Manager. ¿V2 formal contract con cliente Sky firmado pre-flip? Decisión Account Manager / Sales.
- **HR reconciliation automatization**: V1 manual HR compara bonus mes 1 vs legacy. V2 podría automatizar reporte CSV diff per member. Decisión HR.
- **Métrica drift gobernanza post-stable**: una vez `stable V1.0`, ¿quién audita que el compute canonical sigue alineado con Notion legacy formula? V1 no gobierna; se confía en reliability signals. V2 puede agregar weekly automated reconciliation.

---

## 13. Histórico de decisiones

### 2026-05-17 — V1 created (post sesión Payroll bonus + cliente request migración progresiva)

- ADR canonical creado en respuesta a request explícito del operador: "Hay que hacerlo bien... podemos dañar todo lo que hoy (con defectos) pero funciona. Hay que hacerlo progresivo y no hacer un cutover rápido. Esto impacta datos de delivery, ICO, nómina."
- **8 stop-gates canonical obligatorios** formalizados — no judgment call ad-hoc, contrato operacional explícito.
- **Demo teamspace canonical (TASK-910)** como gate adicional pre-Fase 1 — operator agreed clonar Efeonce template.
- **6 fases ramp** con timeline 12-14 meses (NO acelerar) — formaliza expectativa cross-equipo.
- **15 hard rules anti-regresión** — la 11ª regla específicamente: NUNCA acelerar timeline canonical "porque va bien".
- **Bug class TASK-877 follow-up** canonizado como motivador en sección 2.
- **Risk surface 3 capas** (bonus / operational / narrative) con velocidades distintas.
- **8 layer defense in depth per flip** + 6 recovery primitives canonical pre-instalar.

### Sesiones previas relevantes

- 2026-05-17 sesión Payroll Bonus ADR (`GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md`) — documentó downstream consumer crítico, motivó este ADR de migration strategy
- 2026-05-17 sesión 14 specs canonical métricas (`metrics/*_V1.md`) — proveen contract per métrica que esta strategy migra
- 2026-05-17 sesión ADR boundary + metric spec pattern — proveen framework conceptual
- 2026-05-16 TASK-877 follow-up — bug class motivador
