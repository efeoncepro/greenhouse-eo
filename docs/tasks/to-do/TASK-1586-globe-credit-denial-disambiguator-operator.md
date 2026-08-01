# TASK-1586 — Globe Credit Decision Status and Operator Recovery Plane

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-028`
- Status real: `Rebaselinada por TASK-1630; bloqueada hasta que TASK-1482 publique decisión/período correctos`
- Rank: `next.4`
- Domain: `platform`
- Blocked by: `TASK-1482`
- Branch: `task/TASK-1586-globe-credit-denial-disambiguator-operator`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Publica en Greenhouse el read/recovery plane canónico de Studio Credits: status autoritativo, preview puro,
operaciones list/get y reconcile. No expone los DTOs actuales tal como están: consume el snapshot corregido de
TASK-1482 y entrega proyecciones distintas para administración Greenhouse y self-view de Producer.

## Why This Task Exists

El colapso del `409` hacia callers no autorizados sigue siendo correcto, pero el reader actual tampoco es una
verdad operativa: `spentInPeriod` agrega toda la historia y `evaluateCreditBudget` no aplica monthly/project caps
como `reserveCredits`. Exponerlo cerraría ISSUE-124 con una explicación falsa. Además, Greenhouse sólo registra
un contador de propuestas stale y no permite listar, inspeccionar o reconciliar cada operación.

## Goal

- Una sesión humana o agente autorizada puede leer `CreditCapacityStatusV1`, preview y razón vigente sin SQL,
  break-glass ni math local.
- Greenhouse puede listar/leer/reconciliar operaciones por `operationId|proposalId`, incluyendo expiradas,
  `confirm_failed` y outcome ambiguo.
- Producer consume `CreditCapacitySelfStatusV1` redactado; nunca recibe IDs internos, actores, vendor cost o margen.
- ISSUE-124 se cierra sólo cuando reader y reserve pasan conformance sobre una negación real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md` —
  **ADR-015** Slice F y §Contexto (el colapso del 409 es diseño, no bug).
- `docs/architecture/creative-studio/EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md`
  — ADR-010: el rollout de 3 pasos zero-downtime si se decide ampliar scopes del grant humano
  (`capabilityScopes ⊆ requiredScopes`; agregar en un movimiento tumba el login).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — la capability nace con contrato
  gobernado; la futura UI del portal es un consumer más de estos readers.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` — coverage de 3
  estados; `policy-blocked` es declarado, no un gap.

Reglas obligatorias:

- **NUNCA** exponer saldos/política cruda al CLIENTE final: el desambiguador es para el operador
  interno (el `propose` del fondeo ya filtra agregados al plano de Greenhouse — riesgo residual
  nombrado en ADR-015; esta task no lo amplía hacia afuera).
- **NUNCA** ampliar `capabilityScopes` del grant OAuth de Globe en un solo movimiento (ADR-010,
  rollout de 3 pasos, verificando login entre pasos).
- **NUNCA** publicar `getAvailability`/`evaluateCreditBudget` actuales como si fueran autoritativos. Consumir el
  `CreditDecisionSnapshot` corregido por TASK-1482 y mantener el reserve como recheck transaccional.
- **NUNCA** calcular cap, remaining o effective available en Greenhouse/Producer; el browser sólo formatea.

## Normative Docs

- `docs/issues/open/ISSUE-124-globe-credit-grant-canonical-409-root-cause-hidden.md` — la mitad
  operativa que esta task cierra. [verificar path/estado exacto en Discovery]
- `docs/manual-de-uso/creative-studio/fondear-creditos-globe.md` — el runbook del carril cuyo
  patrón de rutas broker esta task replica.
- `.claude/skills/greenhouse-globe/SKILL.md` § «Gasto y crédito en Globe» regla 2.

## Dependencies & Impact

### Depends on

- `TASK-1482`: publica período explícito, evaluator compartido y snapshots admin/self con conformance contra
  `reserveCredits`. Es un bloqueante duro.
- Carril `sister-platform` de fondeo vivo (TASK-1566, entregado): las rutas broker
  `src/app/api/admin/globe/credit-funding/*` son el patrón a replicar (WIF + caller + envelope +
  error mapping).
- Los readers ya existen y son `available` en `http`/`sdk` para el workload
  (`READ.evaluate`/`READ.availability` en `efeonce-globe/packages/domain/src/credit-administration.ts`,
  capability `globe.credits.budget.read` — ya en el caller genérico post-retiro).

### Blocks / Impacts

- `TASK-1483`: consume status/preview/operations para `/admin/globe/credits`.
- `TASK-1628`: consume exclusivamente la proyección self-status redactada.
- `TASK-1629`: reusa list/get/reconcile para recovery y one-command API/CLI.
- **`ISSUE-124`**: cerrable al completar esta task (delta + move a resolved).

### Files owned

En `greenhouse-eo`:

- `src/app/api/admin/globe/credits/status/**`
- `src/app/api/admin/globe/credits/funding/preview/**`
- `src/app/api/admin/globe/credits/funding/operations/**`
- `src/lib/globe/credit-capacity-status*.ts` y `src/lib/globe/credit-funding-operation*.ts` [crear según Plan Mode]
- `src/lib/globe/**` — reuso del cliente broker existente para readers.
- `docs/**` — cierre documental (manual del carril gana la sección «diagnosticar una negación»).

En `efeonce-globe`: **idealmente cero código** — la vía broker no exige flip de coverage ni scopes.
Si el Plan Mode decide flip de `ui` coverage en vez de la vía broker, los archivos son
`packages/domain/src/credit-administration.ts` (COVERAGE — ⚠️ es UN const compartido por los 14
commands y 10 readers: crear un const separado para readers read-only, lección del Discovery de
TASK-1566) + el rollout ADR-010 en los dos repos.

## Current Repo State

### Already exists

- Readers `evaluateCreditBudget`/`getAvailability` y la capability `globe.credits.budget.read`, pero sus shapes y
  algoritmos no representan todavía la decisión completa.
- El puente broker completo (WIF, envelope, `x-idempotency-key`, mapping de errores 4xx→422 no
  actionable / 5xx→503 actionable) probado end-to-end por el fondeo.
- La fase de negación server-side (TASK-1566 Slice 1) — mitad ya cerrada de ISSUE-124.
- TASK-1629 registra intents con provenance/fases terminales y API Platform propose/confirm.

### Gap

- Ninguna ruta de Greenhouse expone un status correcto y estable a una sesión humana/agente.
- No existen operations list/get/reconcile; la reliability actual sólo entrega cantidad/edad de stale proposals.
- `ui`/`mcp` coverage de esos readers sigue `policy-blocked` (declarado; cambiarlo exigiría el
  rollout de scopes — por eso la vía broker es la recomendada).
- El manual del carril no tiene sección de diagnóstico de negaciones.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `greenhouse-eo` App Router (`src/app/api/admin/globe/**` + `src/lib/globe/**`)
- Future candidate home: `remain-shared`
- Boundary: readers gobernados de Globe consumidos vía el cliente broker canónico de
  `src/lib/globe/`; la UI futura y Nexa consumen ESTOS endpoints, nunca el lane workload directo
- Server/browser split: el token WIF y el caller viven server-side; el browser sólo ve la
  respuesta curada (razón + agregados permitidos al operador)
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: ninguno nuevo — Globe sigue siendo autoridad; Greenhouse materializa/adapta status e intents
- Consumidores afectados: `Greenhouse Admin UI|API Platform|CLI|Nexa|MCP|Globe Producer self-view`
- Runtime target: `staging` + `production` (Vercel, rutas admin)

### Contract surface

- Contrato existente a respetar: `ReaderRequestEnvelopeV1`, ADR-015, intents de TASK-1629 y el
  `CreditDecisionSnapshot` de TASK-1482.
- Contrato nuevo o modificado: `CreditCapacityStatusV1`, `CreditCapacitySelfStatusV1` y
  `CreditFundingOperationV1`; rutas status/preview/operations list|get|reconcile.
- Backward compatibility: `not applicable` (rutas nuevas).
- Full API parity: UI, API Platform, CLI, Nexa y MCP consumen estos primitives; Producer consume sólo self-status.

### Data model and invariants

- Entidades/tablas/views afectadas: lectura de intents existentes; cualquier proyección adicional es aditiva y se
  decide en Plan Mode, sin duplicar la máquina de estados de Globe.
- Invariantes que no se pueden romper:
  - La disponibilidad/caps/reasons se leen del snapshot corregido, nunca se recomputan en Greenhouse.
  - `partial|stale|unknown` nunca se convierte a cero.
  - `outcome_unknown` no ofrece retry; ofrece status/reconcile con la misma operation key.
  - self-status no contiene IDs internos, actores, source confidencial, vendor cost ni margen.
  - El colapso del 409 hacia el caller de gasto NO se relaja: el desambiguador es una superficie
    aparte, gateada a operador.
  - Cero saldos/política en logs (ISSUE-127: sanitización CON contraparte de observabilidad —
    loggear código/fase, jamás montos).
- Tenant/space boundary: workspace fijo al binding del broker (`greenhouse-org:efeonce` hoy);
  el operador no elige workspaces arbitrarios.
- Idempotency/concurrency: status/preview/list/get son puros; reconcile es idempotente por operation key y no repite
  la mutación económica.
- Audit/outbox/history: acceso auditado; reconcile agrega evidencia append-only, nunca reescribe intents.

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: gate por entitlement de operador en la ruta (mismo patrón que
  `credit-funding/*`); sin flag nuevo salvo que el Plan Mode encuentre razón.
- Backfill plan: `n/a`.
- Rollback path: revert PR + redeploy.
- External coordination: ninguna si es vía broker (ese es el punto de elegirla).

### Security and access

- Auth/access gate: sesión de Greenhouse + entitlement de administración de crédito (el mismo
  plano que confirma fondeos); NUNCA expuesto a `client_*`.
- Sensitive data posture: agregados de presupuesto visibles SOLO al operador interno; respuesta
  curada, campos permitidos listados explícitamente.
- Error contract: `canonicalErrorResponse` en las rutas de Greenhouse; mapping del broker ya
  existente (4xx real ≠ `globe_unavailable`).
- Abuse/rate-limit posture: readers de bajo costo tras auth de operador; sin límite adicional
  (razón: superficie interna, volumen humano).

### Runtime evidence

- Local checks: `pnpm local:check` + tests focales de las rutas (mock del broker).
- DB/runtime checks: `n/a` (sin DB).
- Integration checks: smoke staging de status + preview + operations + reconcile; decisión comparada contra reserve.
- Reliability signals/logs: `credit_decision_enforcement_drift`, `credit_operation_stale`,
  `credit_operation_outcome_unknown`, `credit_period_uncovered`.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Capacity status y preview puro

- Publicar `CreditCapacityStatusV1` y `CreditCapacitySelfStatusV1` desde el snapshot de TASK-1482.
- Exponer status y preview a sesión humana/agente con entitlement, coverage/freshness y reasons tipados.
- Probar redacción por audiencia y cero math cliente.

### Slice 2 — Operations y recovery

- Publicar list/get por cursor y reconcile idempotente para intents/proposals.
- Terminalizar/representar `expired|confirm_failed|outcome_unknown|reconciled` sin borrar historia.
- Enlazar Globe proposal, Greenhouse intent, operation key, fingerprint, correlación y receipts.

### Slice 3 — Evidencia y cierre de ISSUE-124

- Smoke staging contra negaciones reales conocidas y conformance snapshot↔reserve.
- Manual de status/diagnóstico/recovery con tabla reason→acción y prohibición de retry ciego.
- Delta final en ISSUE-124 sólo si las razones observadas corresponden al enforcement real.

## Out of Scope

- Flip de coverage `ui`/`mcp` de los readers en Globe y ampliación del grant OAuth humano (sólo si
  el Plan Mode lo justifica; la vía broker es la recomendada y no lo necesita).
- La superficie ui-ux del portal (`TASK-1483`) y el widget Producer (`TASK-1628`).
- Crear/arreglar la semántica económica de los readers; pertenece a TASK-1482/TASK-1468/TASK-1579.
- Confirmar o fondear desde MCP; esta task publica contrato/read/recovery, no amplía autoridad.
- Cualquier relajación del colapso del 409 hacia el caller de gasto.
- El guard «un solo grant activo» que ISSUE-124 descarta explícitamente.

## Detailed Spec

Vía recomendada: **broker lane** para Greenhouse y self-status separado para Producer. El contrato administrativo
no se abre al browser de Globe. Si el self-status requiere coverage `ui`, se publica una capability/reader
redactados independientes; nunca se flipea el const compartido que también cubre writes de administración.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1482 conformance → Slice 1 → Slice 2 → Slice 3. ISSUE-124 exige smoke real, no sólo routes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Filtrar agregados de presupuesto a un plano no autorizado | credit admin | low | respuesta curada con lista explícita de campos + gate de entitlement + nunca `client_*` | review + test de shape |
| Divergencia entre status y reserve | credit admin | high | snapshot/evaluator compartido + conformance | `credit_decision_enforcement_drift` |
| Retry duplica fondeo | finance | medium | outcome unknown → status/reconcile | `credit_funding_duplicate_delta` |

### Feature flags / cutover

- Sin flag — rutas admin aditivas gateadas por entitlement; revert = revert PR (<10 min).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + redeploy | <10 min | sí |
| Slice 2 | doc-only; revert commit | <5 min | sí |

### Production verification sequence

1. Staging: sesión humana y agente autorizados leen status/preview; partial/stale no aparece como cero.
2. Staging: negaciones por funding, monthly cap y project cap corresponden con reserve.
3. Staging: operación completada y outcome ambiguo convergen por list/get/reconcile sin segunda mutación.
4. Producción: repetir reads/recovery tras release gobernado, sin ejecutar fondeo real no autorizado.

### Out-of-band coordination required

- N/A — repo-only change (la vía broker no toca Globe ni IAM).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Con sesión humana o agente autorizada, sin impersonación/break-glass, se lee status y razón vigente.
- [ ] La respuesta es curada: lista explícita de campos, cero prosa cruda de Globe, cero campos no
  autorizados; nunca alcanzable por roles `client_*`.
- [ ] Los valores calzan con el snapshot de TASK-1482 y con reserve en conformance; los DTOs legacy incorrectos no
  son source of truth.
- [ ] `periodKey`, timezone, `[start,end)`, cap/spent/held/remaining, funding eligible, ledger histórico,
  effective available, blockers, coverage y freshness tienen semántica explícita.
- [ ] Operations list/get/reconcile permite atribuir y recuperar cada propuesta stale/ambigua sin retry ciego.
- [ ] Producer self-status está redactado y no expone authority/admin internals.
- [ ] El grant OAuth humano de Globe NO cambió (o, si cambió, fue con el rollout de 3 pasos de
  ADR-010 con login verificado entre pasos).
- [ ] `ISSUE-124` movida a resolved con su delta de cierre y verificación.
- [ ] Manual del carril con la sección de diagnóstico (tabla razón→acción).

## Verification

- `pnpm local:check`
- `pnpm test` (focales de las rutas nuevas)
- Smoke staging por el puente real (sesión de operador)
- `pnpm ops:lint --changed` al cierre

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `ISSUE-124` cerrada (delta + move + README de issues)

## Follow-ups

- `TASK-1483` implementa la superficie Greenhouse; `TASK-1628` implementa el self-view Producer.
- Exponer los mismos readers a Nexa (contrato ya gobernado; consumer adicional cuando el dominio
  Globe entre al scope de Nexa).

## Delta 2026-08-01 — re-scope por TASK-1630

La auditoría invalidó la premisa de “sólo exponer dos readers”: ambos divergen del enforcement real. Esta task es
ahora el read/recovery plane Greenhouse y queda bloqueada por el snapshot/evaluator de TASK-1482. También publica
la proyección self-status que consume TASK-1628, sin abrir los DTOs administrativos al Producer.
