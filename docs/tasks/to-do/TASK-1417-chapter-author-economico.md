# TASK-1417 — Chapter-author económico: la lámina `pricing` desde el motor de pricing (nunca desde el LLM)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-029`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none` (TASK-1415 shipped; el motor no se toca)
- Branch: `task/TASK-1417-chapter-author-economico`

## Summary

El **segundo chapter-author productivo**: la lámina económica (`contentType: pricing` → `PricingFull`) autorada desde una **simulación real del motor de pricing/cotizador** — los montos, períodos y notas fiscales salen del engine (cost-plus sobre loaded cost), jamás del LLM. Implementa la interface `ChapterAuthor` de TASK-1415 **sin tocarla**: `deriveEconomicaFacts` (puro: simulación → hechos con `evidenceRef` a la quote/simulación), framing LLM (labels de plan, scope narrado, título — texto, no números) y `toSlides` que inyecta los montos desde los hechos. Golden del eval: la lámina `economica` del deck SKY real ($5.200.000 mensual neto).

## Why This Task Exists

Es la lámina de mayor riesgo del deck: **un monto equivocado en la oferta económica es un incidente comercial/legal**, no un typo. Hoy se escribe a mano/sesión ad-hoc; el motor de TASK-1415 hace estructuralmente imposible que el LLM toque un número, pero necesita el mapper que conecte el motor de pricing con la lámina. Además le da el **consumer real** que la capability `commercial.quote_to_cash.execute` y el camino "simular" del cotizador esperan (el ADR de quote parity partió A=simular vs B=autorar; este author es un consumer de A). Es también el tercer punto de la prueba de agnosticismo: un author cuyos hechos vienen de un ENGINE, no de un reader analítico.

## Goal

- `deriveEconomicaFacts(simulación) → EconomicaFacts` puro: montos por plan, período, nota fiscal (neto/IVA/reajuste), alcance por plan — cada hecho con `evidenceRef` a la simulación/quote (id + fecha).
- `economicaChapterAuthor` (implementa `ChapterAuthor`): framing = título/labels/scope narrado; validador fail-closed con los límites REALES de `pricing-full.slots.json`; `toSlides` inyecta montos desde hechos.
- Eval baseline con golden = lámina `economica` de SKY (fixture frozen) + mutaciones adversariales (monto fabricado rechaza).
- Corrida real: una simulación viva del cotizador → propose → confirm → `composeArtifact` renderiza, frame revisado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` §5-ter (Delta 2026-07-16) — el motor y sus rieles.
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` §Chapter-author engine — los NUNCA del motor aplican verbatim.
- El ADR/decisión de quote parity (cotizador: `quote.simulate` como contrato multi-consumer) `[verificar doc exacto en DECISIONS_INDEX en Discovery]`.
- **Skill MANDATORIA al tocar pricing/montos:** `greenhouse-finance-accounting-operator` (el precio sale de loaded cost + margen; piso de margen del dominio).

Reglas obligatorias:

- **NUNCA** un monto, porcentaje o condición fiscal producido/reformateado por el LLM — todo valor monetario es un hecho del engine, formateado por el mapper (formato CLP canónico determinista).
- **NUNCA** tocar `chapter-author.ts`/`eval-harness.ts` (si este author lo exige, STOP — la abstracción está mal).
- El eval gatea el prompt (§5-bis); el golden SKY no se edita para "pasar".

## Normative Docs

- `src/lib/commercial/tenders/proposals/authoring/diagnostico-chapter-author.ts` — el molde vivo de author (copiar la forma, cambiar las 3 piezas).
- `src/lib/artifact-composer/catalogs/deck-axis/pricing-full.slots.json` — el contrato de la lámina (límites reales del validador).
- `docs/commercial/tenders/sky-blog-2026/deck-plan.json` → slide `economica` — el golden.
- `.claude/skills/greenhouse-public-private-tenders/pricing-garantias-finance.md` — costeo/indexación (contexto del dominio).

## Dependencies & Impact

### Depends on

- TASK-1415 (shipped): la interface + harness.
- El camino "simular" del cotizador como fuente: `src/lib/finance/pricing/` (`simulate-input-schema.ts` y su engine) + la superficie `app-quotation` `[verificar en Discovery el reader/command exacto que entrega el snapshot de simulación]`.

### Blocks / Impacts

- Alimenta al orquestador (TASK-1419) con su segundo capítulo productivo.
- Da consumer real al camino A (simular) del quote parity.

### Files owned

- `src/lib/commercial/tenders/proposals/authoring/economica-facts.ts` (nuevo)
- `src/lib/commercial/tenders/proposals/authoring/economica-chapter-author.ts` (nuevo)
- `src/lib/commercial/tenders/proposals/authoring/__tests__/economica-*.test.ts` + fixture golden (nuevos)
- `scripts/commercial/_sanity-economica-chapter-author.ts` (nuevo — corrida real)

## Current Repo State

### Already exists

- El motor completo (interface + guards + harness + flag). El slot contract `pricing-full.slots.json` con `PricingFull` probado (la lámina SKY real). El engine de pricing con schema de simulación (`src/lib/finance/pricing/`). El patrón de sanity script con render real.

### Gap

- No existe mapper simulación→hechos ni author económico. `[verificar]` el shape exacto del snapshot de simulación (¿expone montos por plan/opción o sólo un total?) — si el engine no modela "plan propuesto vs ampliado", esa estructura entra como hechos del operador pre-evidenciados (mismo patrón que Semrush en diagnóstico), NO se inventa.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/commercial/tenders/proposals/authoring/`
- Future candidate home: `domain-package`
- Boundary: el author consume el CONTRATO del engine de pricing (port cross-dominio finance→commercial, mismo patrón que el reader del Grader en diagnóstico); el motor no se toca; el composer no importa de acá.
- Server/browser split: **server-only** (el engine de pricing y el LLM son server-side; ningún monto ni prompt llega al browser).
- Build impact: `none` (reusa cliente `src/lib/ai/` + composer ya en bundle).
- Extraction blocker: el port al engine de pricing (`src/lib/finance/pricing/**`) — documentarlo si el dominio Tender se extrae (se suma al port del Grader ya declarado).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: el engine de pricing (input, read-only); `AuthoredSlide[]` como output (el registro en el aggregate es de TASK-1416).
- Consumidores afectados: orquestador futuro (TASK-1419), Nexa/MCP (vía TASK-1416).
- Runtime target: `local` + `staging` (flag OFF en prod).

### Contract surface

- Contrato existente a respetar: interface `ChapterAuthor` (sin cambios), `pricing-full.slots.json`, el contrato de simulación del cotizador.
- Contrato nuevo: `deriveEconomicaFacts(source) → EconomicaFacts` + `economicaChapterAuthor`.
- Backward compatibility: aditivo.
- Full API parity: hereda la superficie del motor (TASK-1416); no crea camino propio.

### Data model and invariants

- Entidades: ninguna nueva; lecturas vía el contrato del engine.
- Invariantes: los del motor + **todo monto trazable a la simulación** (evidenceRef = quote/simulación id + fecha) + formato CLP determinista en el mapper.
- Tenant/space boundary: la simulación se resuelve por el caller con scope de sesión; el source entra como dato.
- Idempotency/concurrency: la del motor (hash de la propuesta).
- Audit/outbox/history: N/A (propose read-only; persistencia = TASK-1416).

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: flag existente `TENDER_CHAPTER_AUTHOR_ENABLED` OFF (sin flag nuevo).
- Backfill plan: N/A.
- Rollback path: revert PR (aditivo puro).
- External coordination: ninguna.

### Security and access

- Auth/access gate: el del motor + el gate del cotizador para obtener la simulación (capability del dominio quote `[verificar]`).
- Sensitive data posture: los montos de la OFERTA son client-facing por diseño; el **loaded cost/margen JAMÁS entra a los hechos ni al prompt** (sólo el precio de venta — invariante anti-leak del dominio).
- Error contract: `captureWithDomain(err, 'commercial', …)`; degradación honesta (sin simulación válida no se propone).
- Abuse/rate-limit: interno; `maxTokens` + retry N=2 del motor.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/commercial/tenders/proposals/authoring` verde (motor intacto + eval nuevo).
- DB/runtime checks: simulación real del cotizador ejercitada vía su contrato (no mock) al construir el fixture.
- Integration checks: corrida real → `composeArtifact` renderiza la lámina `pricing`; frame revisado contra la de SKY.
- Reliability signals/logs: sin signal nuevo.
- Production verification sequence: N/A (flag OFF).

### Acceptance criteria additions

- [ ] El loaded cost/margen no aparece en hechos, prompt, framing ni slots (test anti-leak).
- [ ] Todo monto de la lámina calza 1:1 con la simulación fuente (test de igualdad).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — El facts mapper económico

- `deriveEconomicaFacts`: snapshot de simulación (+ hechos del operador para estructura de planes si el engine no la modela) → hechos con montos formateados determinísticamente (CLP canónico) + `evidenceRef`. Test contra una simulación real que reproduzca los valores del golden SKY (o la corrección justificada — el golden manda).

### Slice 2 — El author + validador fail-closed

- `economicaChapterAuthor`: schema JSON-Schema-literal (framing = título/labels/scope/nota narrativa; NUNCA campos de monto), system prompt (registro formal de usted, sobrio, sin promesas), validador con los límites reales de `pricing-full.slots.json`, `toSlides` que inyecta `amount`/`period`/`taxNote` desde hechos.

### Slice 3 — Eval baseline + golden SKY

- Fixture frozen de la lámina `economica` de SKY + eval en el harness domain-free + mutaciones adversariales (monto fabricado, plan sin hecho, overflow). El prompt shipea sólo con el eval verde.

### Slice 4 — Corrida real end-to-end

- Sanity script: simulación real → propose (LLM real) → confirm → `composeArtifact`; frame revisado a ojo. Evidencia en el task/Handoff.

## Out of Scope

- Tocar el motor, el composer o el catálogo (`PricingFull` ya existe y está probado).
- La superficie Nexa/MCP (TASK-1416 la hereda para todos los authors).
- Cambiar el engine de pricing o el contrato de simulación del cotizador.
- Garantías/boletas y cashflow (viven en el método de la skill, no en la lámina).

## Detailed Spec

Mismo diagrama que diagnóstico con la fuente cambiada: `simulación (engine) → deriveEconomicaFacts [PURO] → propose [LLM: sólo texto] → validate [fail-closed] → confirm [member] → toSlides [montos DESDE hechos] → composeArtifact`. La separación crítica extra de este author: **el precio de venta es hecho; el costo/margen ni siquiera entra al source** — el mapper recibe la proyección de venta de la simulación, no el desglose interno.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (mapper) → Slice 3 (eval) → Slice 2/4: el eval DEBE estar verde antes de que el prompt shipee (§5-bis), y el mapper define los hechos que el eval compara.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un monto distinto al de la simulación llega a la lámina | N/A (flag OFF) | low | montos nunca viajan por el LLM (inyección desde hechos) + test de igualdad 1:1 | eval rojo en CI |
| Leak de loaded cost/margen al prompt o la lámina | commercial | medium | el source sólo recibe la proyección de venta + test anti-leak | test anti-leak rojo |
| El snapshot de simulación no modela planes/opciones | cotizador | medium | estructura de planes como hechos del operador pre-evidenciados (patrón Semrush); NUNCA inventar | `[verificar]` en Discovery |

### Feature flags / cutover

- Reusa `TENDER_CHAPTER_AUTHOR_ENABLED` (OFF). Sin flag nuevo; sin cambio de ledger salvo nota de alcance.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1-4 | revert PR (aditivo puro, sin runtime prod) | <5 min | sí |

### Production verification sequence

1. CI: eval económico + suite authoring verdes.
2. Local: corrida real con simulación viva + frame revisado.
3. Prod: flag OFF (decisión EPIC-029).

### Out-of-band coordination required

- N/A — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `deriveEconomicaFacts` es puro y todo monto de la lámina calza 1:1 con la simulación fuente (test).
- [ ] El author implementa `ChapterAuthor` sin modificar `chapter-author.ts` ni `eval-harness.ts` (diff vacío en ambos).
- [ ] El framing schema NO tiene campos de monto; el validador usa los límites reales de `pricing-full.slots.json`.
- [ ] Test anti-leak: loaded cost/margen ausente de hechos/prompt/framing/slots.
- [ ] Eval baseline verde contra el golden SKY (fixture frozen) + mutaciones adversariales.
- [ ] Corrida real: simulación → propose → confirm → `composeArtifact` renderiza; frame revisado.
- [ ] `pnpm composer:visual-gate` sigue a 0 px (no se toca el catálogo).

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test` (full) · `pnpm build`
- `pnpm vitest run src/lib/commercial/tenders/proposals/authoring`
- Corrida real documentada (sanity script) + `pnpm docs:closure-check`

## Closing Protocol

- [ ] Lifecycle + carpeta + README/registry sincronizados.
- [ ] `Handoff.md` + `changelog.md`.
- [ ] Delta en el arch doc (§5-ter: segundo author productivo) + companion (ambos espejos).
- [ ] Impacto cruzado: EPIC-029, TASK-1419 (orquestador gana un capítulo).

## Follow-ups

- Camino B del quote parity (autorar la quote desde una conversación) sigue siendo task aparte del dominio cotizador.

## Open Questions

- **¿El snapshot de simulación modela opciones/planes** (propuesto vs ampliado) **o sólo un total?** Resolver en Discovery contra `src/lib/finance/pricing/` real; si no los modela, los planes entran como hechos del operador (recomendado) o se abre task al cotizador (NO bloquear este author por eso).
