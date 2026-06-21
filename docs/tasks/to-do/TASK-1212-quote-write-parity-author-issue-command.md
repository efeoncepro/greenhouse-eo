# TASK-1212 — Quote Write Parity (Author/Issue Command + Nexa Governed Action)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `Commercial P1.3`
- Domain: `commercial|finance|api|ai`
- Blocked by: `none`
- Branch: `task/TASK-1212-quote-write-parity-author-issue-command`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

**Write vertical** del cotizador para Full API Parity (capability **B. autorar/emitir**, write/lifecycle). Extrae el command canónico `submitQuoteFromBuilder` (atómico + idempotente) que hoy vive coreografiado client-side en `QuoteBuilderShell.handleSubmit` (`POST /quotes` | `PUT /quotes/:id` + `POST /lines` + `POST /issue`), hace que la UI delegue en él sin cambio visible, da contrato Zod del payload de autoría, y registra la **Nexa governed action** (`propose → confirm → execute`) para que Nexa pueda crear/emitir una cotización con confirmación humana. Wave 1 (consultar-first, ADR aceptado): la escritura gobernada es **interna** (Nexa con loop de confirmación); el write lane externo de MCP/agentes queda diferido. El **read vertical** (simular + discovery) es `TASK-1211`.

## Why This Task Exists

La auditoría arch-architect 2026-06-21 (ADR `GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md`, `Accepted`) encontró que la autoría/emisión del cotizador se coreografía client-side en `QuoteBuilderShell.handleSubmit`: 3-4 fetch secuenciales + fresh-simulate previo, **no atómico** (riesgo zombie: header actualizado con líneas viejas si falla `POST /lines`), **no idempotente**, **no reusable** por ningún otro consumer. Es el anti-patrón "remote-click-handler" que viola Full API Parity #16 (la UI no es source of truth). Además la capability `commercial.quote_to_cash.execute` está huérfana (no enforced) y no hay Nexa governed action para autoría.

Esta task cierra ese gap extrayendo el command canónico y exponiéndolo como acción gobernada interna, completando la capability B del split A/B.

## Goal

- Extraer `submitQuoteFromBuilder({ mode, header, lines, issueAfterSave, idempotencyKey, ... })` en `src/lib/**`, atómico (una transacción o rollback completo) e idempotente (replay devuelve el resultado previo).
- Hacer que `QuoteBuilderShell.handleSubmit` delegue en el command (un solo call), preservando comportamiento visible.
- Dar contrato Zod introspectable del payload de autoría; las rutas parsean con el schema.
- Registrar la Nexa governed action de autoría/emisión (`propose → confirm → execute`) behind capability; el LLM nunca muta directo.
- Consumir la capability de write que acuña `TASK-1202` (no re-acuñar).

## Discovery 2026-06-21 (pre-ejecución — leer antes de tomar la task)

Discovery + audit hechos por Claude antes de tomar la task (con TASK-1211 read vertical ya cerrada y en `develop`). Un agente que tome esta task debe respetar estas conclusiones:

**El `handleSubmit` actual** (verificado `QuoteBuilderShell.tsx:1687-1909`, post-redIseño Codex): la coreografía client-side sigue intacta — fresh-simulate (`POST /pricing/simulate`) → `buildPersistedQuoteLineItems` → persist (create `POST /quotes` | edit `PUT /quotes/:id` + `POST /lines`) → issue opcional (`POST /quotes/:id/issue`). No atómico (riesgo zombie), no idempotente, no reusable. **Hay un seam de delegación a nivel página: la prop `onSubmit` (línea 1788)** — el command se puede cablear en las páginas (`new/page.tsx`, `edit/page.tsx`), no en el layout que Codex rediseña.

**Commands canónicos a reusar (NO reimplementar SQL):** `persistQuotationPricing`/`recalculateQuotationPricing` (`src/lib/finance/pricing/quotation-pricing-orchestrator.ts`, atómicos), `requestQuotationIssue` (`src/lib/commercial/quotation-issue-command.ts`), `buildPersistedQuoteLineItems` (`src/lib/finance/pricing/quote-builder-pricing.ts`), `simulateQuotePricing` (TASK-1211, para el fresh-simulate). El header INSERT (create) y el PUT dynamic-update viven inline en los routes (`api/finance/quotes/route.ts` + `[id]/route.ts`) — el command debe orquestarlos en UNA transacción (o, como mínimo, garantizar idempotencia + rollback honesto).

**⚠️ COORDINACIÓN CON CODEX (gate duro).** Codex es dueño del shell AHORA: 3 redIseños recientes (`ae688c622`/`cf19093fe`/`2a1b8475e`) + **TASK-1213 (rediseño del pipeline de cotizaciones) EN VUELO**, que toca `QuoteBuilderShell.tsx`. El **Slice 2 (delegación del shell) colisiona** y garantiza merge conflict.

**Decisión de ejecución (recomendada):** hacer **Slices 1, 3, 4, 5 primero** (todo backend — entregan la capability "Nexa puede crear/emitir una cotización" end-to-end) y **diferir el Slice 2** (delegación del shell) como **handoff coordinado con Codex** cuando TASK-1213 aterrice. El command + governed action son la SSOT; el shell migra a ellos como paso separado (duplicación transitoria aceptada y trackeada). Cablear el command por el seam `onSubmit` a nivel página minimiza la colisión.

**Capability de write:** TASK-1202 (steward del catálogo) aún no cerrada. Coordinar el naming; si no está disponible, acuñar `commercial.quotation.author` (action `create`) + `commercial.quotation.issue` (action `approve`) siguiendo la convención del catálogo y dejar nota para que TASK-1202 las absorba. La huérfana `commercial.quote_to_cash.execute` es del CIERRE (TASK-1206), no de la autoría.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md` (**ADR gobernante** — `Accepted`)
- `docs/architecture/GREENHOUSE_QUOTE_API_PARITY_MULTI_CONSUMER_V1.md` (**spec de detalle**: §3 split A/B, §7 loop de escritura gobernada)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md` + `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md`

Reglas obligatorias:

- La UI no es source of truth: la lógica de autoría/emisión se extrae a command en `src/lib/**`; la UI delega thin. Prohibido dejar orquestación de negocio en `QuoteBuilderShell`.
- Un primitive, muchos consumers: UI y Nexa governed action consumen el MISMO `submitQuoteFromBuilder`. NUNCA implementación Nexa-específica.
- Write gobernado: el LLM nunca muta directo; la mutación ocurre solo en el endpoint de confirmación humana (`propose → confirm → execute`).
- Wave 1 (consultar-first): la escritura gobernada es **interna** (Nexa). El **write lane externo de MCP/agentes queda fuera de scope** (diferido por el ADR).
- Commercial es owner de la cotización (`greenhouse_commercial.quotations`); confirmar ubicación del command con `GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`.
- Capability catalog: `TASK-1202` es steward; consumir la capability de write, no re-acuñar.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`

## Dependencies & Impact

### Depends on

- Commands/readers existentes (reusar, no reimplementar):
  - `src/lib/finance/pricing/quotation-pricing-orchestrator.ts` (`persistQuotationPricing`, `recalculateQuotationPricing`)
  - `src/lib/commercial/quotation-issue-command.ts` (`requestQuotationIssue`)
  - `src/lib/finance/pricing/quote-builder-pricing.ts` (`buildPersistedQuoteLineItems`, guard de no-override) `[verificar path]`
  - `TASK-1211` (read vertical): `simulateQuotePricing` para el fresh-simulate previo a persistir
- Rutas a delegar: `src/app/api/finance/quotes/route.ts`, `.../[id]/route.ts`, `.../[id]/lines/route.ts`, `.../[id]/issue/route.ts`
- UI: `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` (`handleSubmit`) — **coordinar con Codex (trabajo UI en curso sobre el shell)**
- Nexa: `src/lib/nexa/actions/registry.ts` (`NEXA_ACTION_REGISTRY`) + `src/lib/nexa/actions/confirm.ts`
- Capability catalog: `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` (consumir capability de write de `TASK-1202`)

### Blocks / Impacts

- Completa la capability B del split A/B; con `TASK-1211` cierra el frente del embudo Q2C.
- Comparte el governed-action surface (dominio commercial-q2c) con el close de `TASK-1206` — NO una integración Nexa paralela.
- Habilita el follow-up de cliente self-service "pedir cotización real" (B con aprobación interna).

### Files owned

- `src/lib/commercial/` o `src/lib/finance/pricing/` — nuevo `submit-quote-from-builder.ts` (ubicación exacta en Plan Mode por boundary Commercial/Finance)
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` (delegación de `handleSubmit`)
- `src/app/api/finance/quotes/route.ts`, `.../[id]/route.ts`, `.../[id]/lines/route.ts`, `.../[id]/issue/route.ts` (delegar + Zod)
- `src/lib/nexa/actions/registry.ts` + nuevo `src/lib/nexa/actions/` definition de autoría/emisión
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` (consumo de capability + grant)
- `src/lib/reliability/queries/` (signal `commercial.quote.authored_without_command`)
- schemas Zod del payload de autoría `[verificar convención]`

## Current Repo State

### Already exists

- `persistQuotationPricing`/`recalculateQuotationPricing`: persistencia atómica de pricing + líneas + versión + outbox.
- `requestQuotationIssue`: command de emisión.
- Guard de no-override de precio para líneas de catálogo en `quote-builder-pricing`.
- Nexa governed action runtime (`propose_action` + `NEXA_ACTION_REGISTRY` + confirm endpoint) como patrón.

### Gap

- No existe command único de autoría/emisión; la coreografía vive en `QuoteBuilderShell.handleSubmit` (no atómica, no idempotente, no reusable).
- No hay contrato Zod del payload de autoría.
- No hay Nexa governed action para autoría/emisión.
- La capability `commercial.quote_to_cash.execute` está huérfana (no enforced).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_commercial.quotations`, `quotation_line_items`, `quotation_versions`, `greenhouse_sync.outbox_events`
- Consumidores afectados: UI cotizador, Nexa governed action; futuros (cliente self-service "pedir cotización real")
- Runtime target: `local`, `staging`, `production`

### Contract surface

- Contrato existente a respetar: `persistQuotationPricing`, `recalculateQuotationPricing`, `requestQuotationIssue`, las rutas Product-API actuales (backward-compatible).
- Contrato nuevo:
  ```ts
  submitQuoteFromBuilder({
    mode: 'create' | 'edit',
    quotationId,            // requerido en edit
    header, lines,
    issueAfterSave,         // boolean
    idempotencyKey, correlationId, actor, reason
  }) => { operationId, quotationId, finalState, lineCount, issued, events }
  ```
- Backward compatibility: los HTTP callers actuales siguen funcionando; la UI delega sin cambio visible.

### Data model and invariants

- Entidades: `greenhouse_commercial.quotations`, `quotation_line_items`, `quotation_versions`, `greenhouse_sync.outbox_events`.
- Invariantes:
  - **Atomicidad save+issue:** persistir header + líneas + versión + (opcional) emitir en una transacción o rollback completo. NUNCA header con líneas viejas (zombie).
  - **Idempotencia:** replay con el mismo `idempotencyKey` devuelve el resultado previo (mismo `operationId`/`quotationId`), no crea segunda cotización ni duplica líneas.
  - **El precio siempre del engine:** el command no honra price overrides de cliente para líneas de catálogo (preservar el guard de `quote-builder-pricing`); re-simula fresco antes de persistir.
  - **Loop gobernado:** Nexa nunca persiste/emite directo; muta solo en el endpoint de confirmación humana behind capability.
- Tenant/space boundary: contexto tenant/internal existente + `organization_id` de la quotation; sin lookup cross-tenant por id crudo.
- Idempotency/concurrency: `idempotencyKey` persistido + lock de la quotation en edit; replay devuelve el previo.
- Audit/outbox/history: actor, reason, mode, before/after de estado, correlation id, event ids emitidos.

### Migration, backfill and rollout

- Migration posture: preferir sin migración; DDL aditivo solo si el command necesita persistir `idempotencyKey`/`correlationId` — decidir en Plan Mode.
- Default state: delegación de rutas + UI aditiva y behavior-preserving. La Nexa governed action nace gateada por capability.
- Backfill plan: ninguno.
- Rollback path: revert PR + redeploy; la UI puede repuntar a la coreografia previa si el command falla en cutover (gated).
- External coordination: capability con `TASK-1202`; **shell con Codex** (trabajo UI en curso).

### Security and access

- Auth/access gate: capability de write fina (familia de `TASK-1202`; no re-acuñar). Retirar dependencia de route-group coarse donde el command enforza.
- Sensitive data posture: errores sanitizados (`redactErrorForResponse`); no filtrar internals en el preview de la governed action.
- Error contract: `canonicalErrorResponse` con codes estables (estado inválido, permiso denegado, replay/idempotencia).
- Abuse/rate-limit posture: el write externo queda fuera de scope (consultar-first); la governed action interna depende del loop de confirmación humana.

### Runtime evidence

- Local checks: tests del command (atomicidad save+issue, replay idempotente, no honra override), test de la governed action (propose no muta; confirm muta behind capability).
- DB/runtime checks: SQL read-only antes/después de una autoría via command (quotation + líneas + versión + outbox event).
- Integration checks: staging smoke — crear+emitir via command (no via la coreografia UI) + ejercicio de la governed action de Nexa con confirmación.
- Reliability signals/logs: `commercial.quote.authored_without_command` (steady=0) + health del governed action.
- Production verification sequence: deploy gated → readiness → una autoría+emisión allowlisted via command → verificar quotation/líneas/versión/outbox → ejercicio governed action → signals steady.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Invariantes de datos, boundary tenant/access y posture de idempotencia/concurrencia explícitos.
- [ ] Migración/rollback posture explícita y proporcional al riesgo.
- [ ] Evidencia runtime o DB listada para cada cambio más allá de docs/tooling.
- [ ] Dominios sensibles con errores canónicos, audit/signal posture y sin fuga de internals.

## Capability Definition of Done — Full API Parity gate

- [ ] La autoría + emisión se ejecuta programáticamente via el command canónico sin UI.
- [ ] La UI y las rutas Product-API delegan en el mismo command server-side.
- [ ] El command emite audit/outbox con actor, reason, correlation e idempotencia.
- [ ] La autoría/emisión está disponible como Nexa governed action `propose → confirm → execute` behind capability; el LLM nunca muta directo.
- [ ] La governed action comparte surface con el close de `TASK-1206` (no integración paralela).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Extraer el command `submitQuoteFromBuilder`

- Componer la secuencia hoy coreografiada en `handleSubmit`: fresh-simulate → persist via orchestrator → emit via `requestQuotationIssue`, en una operación atómica + idempotente.
- Tests: atomicidad save+issue, replay idempotente, no honra price override de catálogo.

### Slice 2 — UI shell delegation

- Refactorizar `QuoteBuilderShell.handleSubmit` para delegar en el command (un solo call), preservando comportamiento visible.
- **Coordinar con Codex** (trabajo UI en curso sobre el shell) antes de tocar el archivo.

### Slice 3 — Contrato Zod + capability de write

- Schemas Zod del payload de autoría (header + lines); las rutas parsean con el schema.
- Consumir la capability de write de `TASK-1202` + grant en `runtime.ts` (mismo slice) + coverage test.

### Slice 4 — Nexa governed action

- `NexaActionDefinition` de autoría/emisión en `NEXA_ACTION_REGISTRY` con `propose → confirm → execute`; el confirm endpoint delega en `submitQuoteFromBuilder`.
- Preview read-only (precio + qué se creará) en el propose; mutación solo en confirm behind capability.

### Slice 5 — Reliability + parity gate + closure

- Signal `commercial.quote.authored_without_command` (steady=0) + health del governed action.
- Smoke: crear+emitir via command (no UI) + ejercicio de la governed action.
- Docs: actualizar `docs/documentation/finance/cotizador.md` + manual.

## Out of Scope

- **El read vertical** (simular + discovery + perfiles + read tools) → `TASK-1211`.
- **El write lane externo de MCP/agentes** → diferido (consultar-first; ADR aceptado). Solo Nexa governed action interna en esta task.
- **El close command Q2C** (convert-to-cash/invoice) → `TASK-1206`.
- **La UI de cliente self-service** → follow-up.
- Cambios en el pricing engine — se reusa tal cual.
- Sanear el descuento por línea client-side (`QuoteLineItemsEditor.tsx`) si excede el alcance del command — follow-up.

## Detailed Spec

El command es una capa de orquestación sobre los primitives existentes (`persistQuotationPricing` + `requestQuotationIssue`), NO una copia de su SQL. El estado final de la cotización (persistida + opcionalmente emitida) lo escribe un único writer. El fresh-simulate previo a persistir reusa `simulateQuotePricing` de `TASK-1211` (perfil `internal`).

El loop gobernado (§7 de la spec): `propose_action(author_quote, {...})` → preview read-only + `confirmEndpoint` → `POST /api/nexa/actions/author_quote/confirm` → `submitQuoteFromBuilder` (única mutación, behind capability + audit + outbox).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5.
- Slice 2 (shell) requiere coordinación con Codex antes de tocar `QuoteBuilderShell.tsx`.
- Slice 4 (governed action) NO antes de que el command (1) + Zod/capability (3) existan.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Save+issue no atómico deja quote zombie | commercial quotations | medium | command en una transacción + rollback completo | converted_without_lines / quote con líneas viejas |
| Doble cotización en replay | commercial quotations | medium | `idempotencyKey` persistido + replay devuelve previo | duplicate quotation por idempotencyKey |
| Colisión con el trabajo UI de Codex en el shell | operator workflow | high | coordinar antes de Slice 2; command behavior-preserving; GVC antes/después | conflicto de merge / GVC diff |
| Re-acuñar capability que `TASK-1202` define | entitlements | medium | coordinar naming antes de Slice 3 | capability-grant-coverage test |
| Exponer write a Nexa sin loop gobernado | nexa/safety | low | governed action `propose → confirm → execute`; LLM nunca muta | review del action registry |

### Feature flags / cutover

- Command + delegación aditivo y behavior-preserving; el refactor del shell se verifica con GVC.
- La Nexa governed action nace gateada por capability.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR | <15 min | si |
| Slice 2 | UI repunta a la coreografia previa | <15 min | si |
| Slice 3 | Revert Zod + reverse grant | <10 min | si |
| Slice 4 | Desregistrar la action (gated) | <10 min | si |
| Slice 5 | Revert signals/docs | <10 min | si |

### Production verification sequence

1. Deploy command + delegación gated.
2. GVC del cotizador (desktop+mobile) antes/después — sin cambio visible.
3. Una autoría+emisión allowlisted via command → verificar quotation/líneas/versión/outbox.
4. Ejercicio de la governed action de Nexa con confirmación humana.
5. Signals steady (`authored_without_command` = 0).

### Out-of-band coordination required

- **Codex** para el refactor del shell (trabajo UI en curso).
- Owner de `TASK-1202` para la capability de write.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `submitQuoteFromBuilder` (create/edit + issueAfterSave) en `src/lib/**`, atómico e idempotente; `QuoteBuilderShell.handleSubmit` delega en él sin cambio visible.
- [ ] El command es idempotente (replay devuelve el resultado previo) y atómico (no quote zombie) — cubierto por tests.
- [ ] El precio siempre del engine (no honra override de catálogo) — test.
- [ ] Hay contrato Zod del payload de autoría; las rutas parsean con el schema.
- [ ] La autoría/emisión está disponible como Nexa governed action `propose → confirm → execute` behind capability; el confirm delega en el command.
- [ ] La capability de write consumida NO duplica el catálogo de `TASK-1202`.
- [ ] Signal `commercial.quote.authored_without_command` (steady=0) wired a `/admin/operations`.
- [ ] Evidencia runtime: una autoría+emisión via command produce quotation + líneas + versión + outbox; GVC antes/después sin cambio visible.

## Verification

- `pnpm test` (focal del command + governed action, luego full suite al cierre)
- `pnpm lint`
- `pnpm typecheck`
- `pnpm task:lint --task TASK-1212`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed --runtime --data --docs`
- `pnpm finance:e2e-gate --strict` (toca write paths bajo `src/app/api/finance/quotes/**`)
- GVC del cotizador antes/después (desktop+mobile)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-1211`, `TASK-1202`, `TASK-1206`
- [ ] documentacion funcional + manual del cotizador actualizados

## Follow-ups

- Write lane externo de MCP/agentes (operar cotizaciones desde un agente externo): reabrir solo si emerge un caso real (consultar-first; ADR). Requiere auth de agente + idempotencia + rate-limit + aprobación.
- Cliente self-service "pedir cotización real" (B con aprobación interna): execution profile `ui-ux`.
- Sanear el descuento por línea client-side (`QuoteLineItemsEditor.tsx`) ruteándolo por el engine/command.

## Open Questions

- ~~¿Ubicación exacta del command?~~ **Resuelto (Discovery 2026-06-21):** `src/lib/commercial/**` — Commercial es owner del aggregate quotation (`greenhouse_commercial.quotations`), aunque la UI viva en `/finance/quotes`. Boundary `GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`.
- ~~¿El refactor del shell se hace en esta task o handoff con Codex?~~ **Resuelto (Discovery 2026-06-21): HANDOFF con Codex.** El Slice 2 se difiere; Codex posee el shell (TASK-1213 en vuelo). Slices 1/3/4/5 (backend) se hacen primero; el shell delega al command como paso coordinado posterior. Ver §Discovery.
- Pendiente real: ¿el command logra atomicidad TOTAL (header+líneas+issue en una transacción) o atomicidad por etapa + idempotencia con rollback honesto? Decidir en Plan Mode según el contrato de `persistQuotationPricing` + el header INSERT inline.
