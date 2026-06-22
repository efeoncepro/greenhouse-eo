# TASK-1215 — Payroll Nexa write actionability (propose → confirm → execute)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-1214`
- Branch: `task/TASK-1215-payroll-nexa-write-actionability`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra la consecuencia North Star de Full API Parity para payroll: cablear las capabilities de escritura de nómina (definidas en TASK-1214) al runtime de acción gobernada de Nexa (`propose → confirm → execute`), de modo que Nexa pueda accionar nómina por construcción sin nada Nexa-específico. Hoy Nexa cubre lectura de payroll (`check_payroll`, `explain_my_pay`) pero su accionabilidad de escritura es 0% (gap ledger: 0/217 capabilities accionables, único write gobernado es `mark_notifications_read`).

## Why This Task Exists

El ADR de Full API Parity establece que la base (contrato gobernado a nivel capability) tiene como consecuencia obligatoria que **Nexa opere toda capability por construcción** vía el loop `propose → confirm → execute` (el LLM nunca escribe directo; muta sólo en el endpoint de confirmación humana). TASK-1214 deja el core de nómina con capabilities finas + comandos canónicos gobernados; esta task conecta esas capabilities al registry de acciones gobernadas de Nexa. Sin esto, payroll tiene contrato de lectura pero su mitad de escritura del North Star queda incompleta.

Se prioriza P2 (después de TASK-1214 P1) porque la base de gobernanza es el prerequisito duro; la accionabilidad por Nexa es el incremento de valor sobre esa base.

## Goal

- Registrar las acciones de escritura de payroll de menor riesgo / mayor valor en el runtime de acción gobernada de Nexa.
- Garantizar que el write pasa por `propose → confirm → execute`: Nexa propone, un humano confirma, la mutación ocurre sólo en el endpoint de confirmación reusando el comando canónico de TASK-1214 (cero lógica duplicada).
- Validar capability + autorización + audit en el path de ejecución (mismas garantías que la UI).
- Subir la fila de payroll del gap ledger de "0% accionable" a "accionable (subset)".

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — §North Star
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` — runtime de acción gobernada
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_GAP_LEDGER_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`

Reglas obligatorias:

- El LLM NUNCA ejecuta un write directo: el loop es `propose → confirm → execute`; la mutación ocurre SOLO en el endpoint de confirmación humana.
- El path de ejecución reusa el comando canónico de `src/lib/payroll/**` (definido/gobernado en TASK-1214). Cero lógica de negocio nueva o duplicada en la capa Nexa.
- La ejecución valida la MISMA capability/autorización que la UI (no un bypass para Nexa).
- NO construir integración "Nexa-específica": Nexa es un consumer más del primitive canónico.

## Normative Docs

- Skill obligatoria: `greenhouse-nexa-conversational` (cargar al tocar Nexa: tools/prompt/runtime).
- Skill: `greenhouse-payroll-auditor` (validar semántica de las acciones de nómina).
- `src/lib/nexa/nexa-tools.ts`, `src/lib/nexa/nexa-contract.ts` — registry de tools/acciones (existente).

## Dependencies & Impact

### Depends on

- **TASK-1214** — capabilities `payroll.*` finas + comandos canónicos gobernados (bloqueante duro).
- Runtime de acción gobernada de Nexa (registry TASK-1137, `propose_action` / `mark_notifications_read` como precedente del loop).

### Blocks / Impacts

- Avanza el North Star de Nexa total operability para el dominio payroll.
- Impacta el gap ledger (fila payroll: accionabilidad).

### Files owned

- `src/lib/nexa/nexa-tools.ts` (registrar acciones de payroll)
- `src/lib/nexa/nexa-contract.ts` (contrato de las acciones propose/confirm)
- Endpoint(s) de confirmación/ejecución gobernada que reusan los comandos de payroll (path canónico del runtime de acción de Nexa — `[verificar]` ubicación exacta en Discovery)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_GAP_LEDGER_V1.md`

## Current Repo State

### Already exists

- Lectura de payroll por Nexa: `check_payroll` (agregado), `explain_my_pay` (self).
- `propose_action` / `mark_notifications_read` — precedente del loop de acción gobernada (registry Nexa TASK-1137).
- (Post TASK-1214) capabilities `payroll.*` + comandos canónicos gobernados.

### Gap

- Cero acciones de escritura de payroll cableadas al loop de Nexa.
- Gap ledger: 0/217 capabilities accionables por Nexa.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: comandos canónicos de `src/lib/payroll/**` (reusados, no duplicados)
- Consumidores afectados: `Nexa Agent (Conversational Experience)`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: runtime de acción gobernada de Nexa (`propose → confirm → execute`), comandos canónicos de payroll de TASK-1214, capabilities `payroll.*`.
- Contrato nuevo o modificado: registro de acciones de payroll en el contrato de tools/acciones de Nexa; endpoint de confirmación que ejecuta el comando canónico.
- Backward compatibility: `compatible` (additive — agrega acciones, no cambia las existentes).
- Full API parity: Nexa consume el MISMO comando canónico que la UI; cero lógica duplicada.

### Data model and invariants

- Entidades/tablas: ninguna nueva; reusa las de payroll vía los comandos canónicos.
- Invariantes:
  - LLM nunca muta directo; mutación SOLO en confirmación humana.
  - Capability/autorización idéntica a la UI en el path de ejecución.
  - Audit/outbox emitido por el comando canónico subyacente (no se reimplementa).
- Tenant/space boundary: derivado del subject de la sesión Nexa, igual que la UI.
- Idempotency/concurrency: heredada del comando canónico.
- Audit/outbox/history: heredado del comando canónico + traza de la acción propuesta/confirmada en el runtime de Nexa.

### Migration, backfill and rollout

- Migration posture: `none` (salvo que el registry de acciones de Nexa requiera persistencia — `[verificar]`).
- Default state: `flag OFF` — las acciones de escritura de payroll por Nexa nacen detrás de flag, default OFF en prod hasta validación.
- Backfill plan: N/A.
- Rollback path: `flag off` (deshabilita las acciones nuevas) + revert PR.
- External coordination: sign-off HR antes de habilitar escritura de nómina por Nexa en prod.

### Security and access

- Auth/access gate: `capability` (las `payroll.*` de TASK-1214) evaluada en el endpoint de confirmación/ejecución.
- Sensitive data posture: `payroll` — Nexa propone sobre datos sensibles; el confirm muestra el efecto antes de ejecutar; sin PII cruda en el prompt.
- Error contract: `canonicalErrorResponse` (heredado del path de TASK-1214).
- Abuse/rate-limit posture: el confirm humano es el control primario; rate-limit del runtime de Nexa aplica.

### Runtime evidence

- Local checks: tests del contrato de tools de Nexa + tests de las acciones registradas.
- DB/runtime checks: smoke del loop propose→confirm→execute contra una acción de payroll de bajo riesgo en staging.
- Integration checks: E2E conversacional (propose en Nexa → confirm humano → comando ejecuta → audit/outbox emitido).
- Reliability signals/logs: traza de acción gobernada; errores del runtime de Nexa.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [ ] El path de ejecución reusa el comando canónico de payroll (sin lógica duplicada).
- [ ] Capability/autorización idéntica a la UI verificada.
- [ ] El loop propose→confirm→execute es honesto (LLM no muta directo).
- [ ] Flag OFF por default + rollback por flag.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Selección + contrato de las primeras acciones

- Elegir el subset inicial (bajo riesgo / alto valor): candidatas `payroll.period.approve`, `payroll.adjustment.create`.
- Definir el contrato propose/confirm para cada acción (qué propone Nexa, qué muestra el confirm, qué comando ejecuta).
- Registrar las acciones en `nexa-tools.ts` / `nexa-contract.ts` detrás de flag OFF.

### Slice 2 — Wiring del execute al comando canónico

- Cablear el endpoint de confirmación a los comandos canónicos de payroll (TASK-1214), con capability check idéntico a la UI.
- Tests del contrato + del path de ejecución.

### Slice 3 — Validación e2e + gap ledger

- E2E conversacional del loop completo en staging (flag ON staging).
- Actualizar la fila de payroll del gap ledger (accionabilidad subset).

## Out of Scope

- Cablear TODAS las capabilities de payroll (esta task entrega un subset; el resto es follow-up incremental).
- Redefinir/ampliar el runtime de acción gobernada de Nexa (se reusa el existente).
- Cambios en los comandos de payroll (son de TASK-1214).
- Operabilidad de escritura por Nexa de otros dominios.

## Detailed Spec

El subset exacto, el shape del contrato propose/confirm y la ubicación del endpoint de confirmación se resuelven en Discovery con `greenhouse-nexa-conversational` (mapear el runtime de acción gobernada vigente y `propose_action`). El patrón es: Nexa produce una propuesta estructurada → el humano confirma en el endpoint de confirmación → ese endpoint invoca el comando canónico de payroll con la capability de la sesión.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contrato + registro detrás de flag) → Slice 2 (execute wiring) → Slice 3 (e2e + ledger). Sin Slice 1 cerrado, no hay acción que ejecutar.
- TASK-1214 **MUST** estar complete antes de iniciar (bloqueante duro): sin capabilities + comandos gobernados, no hay primitive que reusar.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| LLM ejecuta write sin confirmación humana | payroll / Nexa | low | Loop propose→confirm→execute; mutación SOLO en endpoint de confirmación; test que prueba que el LLM no puede mutar directo | mutación de nómina sin registro de confirmación |
| Nexa bypassa capability de la UI | payroll / identity | medium | El execute reusa el mismo `can()` que la UI; E2E con rol sin grant → rechazo | acción ejecutada por rol sin grant |
| Lógica duplicada en capa Nexa | payroll | medium | El execute sólo invoca el comando canónico; review de no-duplicación | divergencia de comportamiento UI vs Nexa |
| Acción de alto riesgo habilitada antes de tiempo | payroll | low | Subset inicial bajo riesgo; flag OFF default; sign-off HR | — |

### Feature flags / cutover

- Flag (env var, `[nombre a definir]`, default `false`) controla si las acciones de escritura de payroll por Nexa están activas. OFF en prod hasta E2E verde + sign-off HR. Revert: flag a `false` + redeploy (<5 min).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (quita registro) — inerte detrás de flag OFF | <10 min | sí |
| Slice 2 | flag OFF + revert PR | <10 min | sí |
| Slice 3 | flag OFF | <5 min | sí |

### Production verification sequence

1. Deploy a staging con flag ON (staging) + E2E conversacional: Nexa propone approve de un período de prueba → confirm humano → comando ejecuta → audit/outbox emitido.
2. E2E con rol sin grant → la confirmación rechaza con 403 canónico.
3. Verificar que sin confirmación no hay mutación (control negativo).
4. Sign-off HR.
5. Prod con flag OFF; flip a ON post sign-off; monitor de acciones gobernadas 7d.

### Out-of-band coordination required

- Sign-off HR antes de habilitar escritura de nómina por Nexa en prod (acción sensible). Repo + DB only en lo demás.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El subset inicial de acciones de payroll está registrado en el contrato de Nexa detrás de flag.
- [ ] El execute reusa el comando canónico de payroll (cero lógica duplicada).
- [ ] El loop propose→confirm→execute es honesto: test prueba que el LLM no muta directo.
- [ ] La ejecución valida la misma capability que la UI (E2E con rol sin grant → rechazo).
- [ ] Flag OFF por default en prod; rollback por flag verificado.
- [ ] Fila de payroll del gap ledger actualizada (accionabilidad subset).
- [ ] `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- E2E conversacional del loop (staging, flag ON)
- Control negativo (sin confirmación, sin mutación)

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado
- [ ] gap ledger actualizado (fila payroll accionabilidad)
- [ ] flag registrado en `FEATURE_FLAG_STATE_LEDGER.md` (env-var `*_ENABLED` nuevo)
- [ ] `greenhouse-documentation-governor` + `pnpm docs:closure-check`
- [ ] `greenhouse-qa-release-auditor` + `pnpm qa:gates --changed`

## Follow-ups

- Cablear el resto de capabilities de payroll al loop de Nexa (incremental).
- Extender el patrón a otros dominios con capabilities finas ya definidas.

## Open Questions

- Subset inicial exacto (¿`approve` + `adjustment.create`, o sólo una para el primer corte?). Resolver en Discovery con `greenhouse-nexa-conversational` + sign-off HR.
- Nombre del flag y si el registry de acciones de Nexa requiere persistencia nueva (`[verificar]`).
