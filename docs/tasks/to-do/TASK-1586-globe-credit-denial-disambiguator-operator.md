# TASK-1586 — Globe Credit Admin: desambiguador de negación al alcance del operador (ADR-015 Slice F)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-1586-globe-credit-denial-disambiguator-operator`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Pone los dos lectores que desambiguan una negación de crédito de Globe —
`globe.credits.budget.evaluate` (devuelve la `reason` vigente) y
`globe.credits.budget.availability.get` (`policyAvailable` vs `ledgerAvailable`) — **al alcance del
operador** sin break-glass ni impersonación: hoy un `409 conflict` de gasto colapsa causas que
exigen acciones opuestas y los desambiguadores sólo son alcanzables por el lane privado de
workload. Cierra la mitad operativa restante de `ISSUE-124` y es el **precursor backend** de la
futura superficie ui-ux de administración de crédito en el portal.

## Why This Task Exists

El colapso del `409` es **deliberado y correcto** hacia el caller (no filtrar saldos ni política),
pero deja al operador sin forma de distinguir `pool_exhausted` de `month_cap_exceeded` de
`approval_expired` sin pedirle a un agente que impersone el workload caller. ADR-015 Slice F lo
nombra: «el desambiguador al alcance del operador». La fase de negación del lado servidor ya existe
(TASK-1566 Slice 1 cerró la mitad de diagnóstico de `ISSUE-124`); lo que falta es que **una persona
con sesión de Greenhouse** pueda preguntarle al sistema «¿por qué se niega HOY?» y leer la
respuesta, por el mismo puente gobernado que ya opera el fondeo.

## Goal

- El operador, con su sesión de Greenhouse, puede leer la **razón vigente de negación** para un
  monto dado y la **disponibilidad** (`policyAvailable` vs `ledgerAvailable` vs
  `effectiveAvailable`) del workspace — sin break-glass, sin impersonación, sin SQL.
- La vía elegida **no amplía el grant OAuth humano de Globe** salvo decisión explícita con el
  rollout de 3 pasos de ADR-010 (la lección del login caído).
- `ISSUE-124` queda cerrable: sus dos mitades (fase server-side + desambiguador alcanzable)
  entregadas, con delta final en el issue.

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
- **NUNCA** re-derivar disponibilidad con una regla paralela: consumir `getPolicySnapshot`/
  `getAvailability`/`evaluateCreditBudget` canónicos (la MISMA regla que el ledger consume).

## Normative Docs

- `docs/issues/open/ISSUE-124-globe-credit-grant-canonical-409-root-cause-hidden.md` — la mitad
  operativa que esta task cierra. [verificar path/estado exacto en Discovery]
- `docs/manual-de-uso/creative-studio/fondear-creditos-globe.md` — el runbook del carril cuyo
  patrón de rutas broker esta task replica.
- `.claude/skills/greenhouse-globe/SKILL.md` § «Gasto y crédito en Globe» regla 2.

## Dependencies & Impact

### Depends on

- Carril `sister-platform` de fondeo vivo (TASK-1566, entregado): las rutas broker
  `src/app/api/admin/globe/credit-funding/*` son el patrón a replicar (WIF + caller + envelope +
  error mapping).
- Los readers ya existen y son `available` en `http`/`sdk` para el workload
  (`READ.evaluate`/`READ.availability` en `efeonce-globe/packages/domain/src/credit-administration.ts`,
  capability `globe.credits.budget.read` — ya en el caller genérico post-retiro).

### Blocks / Impacts

- **Superficie ui-ux de administración de crédito del portal** (task futura, nace con wireframe
  real): consumirá estos endpoints; esta task es su foundation backend (split backend-data →
  ui-ux por disciplina híbrida).
- **`ISSUE-124`**: cerrable al completar esta task (delta + move a resolved).

### Files owned

En `greenhouse-eo`:

- `src/app/api/admin/globe/credit-funding/` — [verificar] rutas hermanas nuevas, p.ej.
  `credit-availability/route.ts` y `credit-evaluate/route.ts` (o un `credit-status` único; decidir
  en Plan Mode).
- `src/lib/globe/**` — reuso del cliente broker existente para readers.
- `docs/**` — cierre documental (manual del carril gana la sección «diagnosticar una negación»).

En `efeonce-globe`: **idealmente cero código** — la vía broker no exige flip de coverage ni scopes.
Si el Plan Mode decide flip de `ui` coverage en vez de la vía broker, los archivos son
`packages/domain/src/credit-administration.ts` (COVERAGE — ⚠️ es UN const compartido por los 14
commands y 10 readers: crear un const separado para readers read-only, lección del Discovery de
TASK-1566) + el rollout ADR-010 en los dos repos.

## Current Repo State

### Already exists

- Los dos readers canónicos con su lógica de fase/razón (`evaluateCreditBudget`,
  `getAvailability`) y la capability `globe.credits.budget.read` en el caller genérico.
- El puente broker completo (WIF, envelope, `x-idempotency-key`, mapping de errores 4xx→422 no
  actionable / 5xx→503 actionable) probado end-to-end por el fondeo.
- La fase de negación server-side (TASK-1566 Slice 1) — mitad ya cerrada de ISSUE-124.

### Gap

- Ninguna ruta de Greenhouse expone los dos readers a una sesión humana; el único camino hoy es
  impersonar el workload caller (break-glass de facto para un READ).
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
- Source of truth afectado: ninguno nuevo — lectura de los readers canónicos de Globe
- Consumidores afectados: operador (curl/consola hoy; UI del portal y Nexa mañana)
- Runtime target: `staging` + `production` (Vercel, rutas admin)

### Contract surface

- Contrato existente a respetar: `ReaderRequestEnvelopeV1` del spine + los shapes de
  `CreditBudgetEvaluationV1` / `CreditBudgetAvailabilityV1`.
- Contrato nuevo o modificado: 1-2 rutas admin de Greenhouse (GET/POST) que despachan
  `globe.credits.budget.evaluate` y `globe.credits.budget.availability.get` por el broker, con
  respuesta curada (sin exponer campos que ADR-015 no autoriza al plano del operador — validar
  lista exacta en Plan Mode).
- Backward compatibility: `not applicable` (rutas nuevas).
- Full API parity: la capability YA tiene contrato gobernado en Globe; esto agrega el consumer
  humano vía broker. La UI futura consume estas rutas (un primitive, muchos consumers).

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna.
- Invariantes que no se pueden romper:
  - La disponibilidad se lee de los readers canónicos, nunca se recomputa en Greenhouse.
  - El colapso del 409 hacia el caller de gasto NO se relaja: el desambiguador es una superficie
    aparte, gateada a operador.
  - Cero saldos/política en logs (ISSUE-127: sanitización CON contraparte de observabilidad —
    loggear código/fase, jamás montos).
- Tenant/space boundary: workspace fijo al binding del broker (`greenhouse-org:efeonce` hoy);
  el operador no elige workspaces arbitrarios.
- Idempotency/concurrency: readers puros — sin idempotency key requerida (verificar si el broker
  la exige igual por contrato de transporte).
- Audit/outbox/history: acceso auditado como toda ruta admin (sesión + entitlement); sin outbox.

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
- Integration checks: smoke por el puente real en staging — una negación conocida devuelve su
  razón (`pool_exhausted`/`month_cap_exceeded`) y la disponibilidad calza con el plan del fondeo.
- Reliability signals/logs: log del broker existente (`status` + `sdkCode`).
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

### Slice 1 — Rutas broker de diagnóstico

- Ruta(s) admin en Greenhouse que despachan `budget.evaluate` y `budget.availability.get` por el
  cliente broker canónico, con respuesta curada y gate de entitlement de operador.
- Tests focales (mock del broker) + tipos del contrato curado.

### Slice 2 — Evidencia y cierre de ISSUE-124

- Smoke en staging contra una negación real/conocida: la razón y la disponibilidad se leen con
  sesión humana, sin impersonación.
- Sección «diagnosticar una negación» en el manual del carril
  (`docs/manual-de-uso/creative-studio/fondear-creditos-globe.md`) con la tabla razón→acción.
- Delta final en `ISSUE-124` + move a `resolved/` + tabla del README de issues.

## Out of Scope

- Flip de coverage `ui`/`mcp` de los readers en Globe y ampliación del grant OAuth humano (sólo si
  el Plan Mode lo justifica; la vía broker es la recomendada y no lo necesita).
- La superficie ui-ux del portal (task futura con wireframe real; esta es su foundation).
- Cualquier relajación del colapso del 409 hacia el caller de gasto.
- El guard «un solo grant activo» que ISSUE-124 descarta explícitamente.

## Detailed Spec

Vía recomendada (decisión de esta task, validable en Plan Mode): **broker lane**, replicando
`credit-funding/*` — cero cambios en Globe, cero scopes nuevos, cero riesgo de login. La
alternativa (coverage `ui` + capability en el grant humano con rollout ADR-010 de 3 pasos) queda
documentada como NO elegida salvo que emerja un consumer que la exija; si se elige, el COVERAGE de
credit-administration es UN const compartido — crear const separado para los dos readers, nunca
editar el compartido (flipear `ui` ahí pondría `grant.issue` en la superficie del browser).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2. El cierre de ISSUE-124 exige el smoke real de Slice 2, no sólo el código.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Filtrar agregados de presupuesto a un plano no autorizado | credit admin | low | respuesta curada con lista explícita de campos + gate de entitlement + nunca `client_*` | review + test de shape |
| Divergencia entre el desambiguador y la negación real | credit admin | low | consumir los readers canónicos (misma regla que el ledger); smoke contra negación conocida | smoke Slice 2 |

### Feature flags / cutover

- Sin flag — rutas admin aditivas gateadas por entitlement; revert = revert PR (<10 min).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + redeploy | <10 min | sí |
| Slice 2 | doc-only; revert commit | <5 min | sí |

### Production verification sequence

1. Staging: sesión de operador lee availability y evaluate; los números calzan con el último plan
   de fondeo (`monthlyCap`/`policyAvailable`).
2. Staging: una negación conocida (monto > disponible) devuelve su razón exacta.
3. Producción: mismas dos lecturas tras el deploy normal de develop→main.

### Out-of-band coordination required

- N/A — repo-only change (la vía broker no toca Globe ni IAM).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Con SOLO una sesión de operador (sin impersonación, sin break-glass), se lee la razón vigente
  de negación para un monto dado y la disponibilidad del workspace.
- [ ] La respuesta es curada: lista explícita de campos, cero prosa cruda de Globe, cero campos no
  autorizados; nunca alcanzable por roles `client_*`.
- [ ] Los valores calzan con los readers canónicos (smoke contra una negación conocida y contra el
  plan del último fondeo).
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

- Superficie ui-ux de administración de crédito del portal (consume estas rutas; nace con
  wireframe real vía product-design-loop).
- Exponer los mismos readers a Nexa (contrato ya gobernado; consumer adicional cuando el dominio
  Globe entre al scope de Nexa).

## Open Questions

- ¿Una ruta única `credit-status` (evaluate + availability en una respuesta) o dos rutas espejo de
  los readers? Decidir en Plan Mode por el consumo real del operador (la UI futura probablemente
  quiera una sola).
