# TASK-1421 — F1 canónica: análisis del RFP + matriz de admisibilidad + fit score → gate humano bid/no-bid

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-029`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none` (F0 shipped: aggregate + assets + estado `analyzed → fit_review` existen)
- Branch: `task/TASK-1421-f1-analisis-admisibilidad-rfp`

## Summary

La **F1 del arch doc (§9)** — NO confundir con el nodo chapter-author de §5-ter (TASK-1415): el análisis agéntico de las **bases del RFP**. Lee los assets `rfp_source` de una `Proposal` (F0 deliberadamente no leyó contenido), propone el **requisito-set estructurado** (persiste en `greenhouse_commercial.proposal_requirements`, que existe mínima desde F0), corre la **matriz de admisibilidad** (checks del checklist canónico de la skill: requisitos excluyentes, anexos, garantías, inhabilidades) y calcula el **fit score explicable** — todo para alimentar el gate humano `fit_review` (bid/no-bid) que la state machine ya exige. Molde propose→confirm→execute; el LLM propone requisitos citando página/sección de las bases; el humano confirma; el command canónico persiste.

## Why This Task Exists

El error #1 que deja a Efeonce fuera de una licitación es un requisito excluyente no detectado (anexo faltante, garantía mal constituida) — no el precio (regla dura #2 de la skill: **admisibilidad primero**). Hoy ese análisis es una lectura humana/ad-hoc de las bases; la state machine ya tiene el estado (`analyzed → fit_review`) y la tabla del requisito-set, pero **nada los llena**: el render de TASK-1391 consume `proposal_requirements` (constraints) que hoy se cargan a mano. F1 cierra el ciclo: del PDF de bases al gate bid/no-bid con evidencia trazable, y de paso alimenta con requisitos reales las constraints del render y el contexto del orquestador (TASK-1419).

## Goal

- **Lectura gobernada de assets RFP**: extracción de texto de los `rfp_source` (PDF/DOCX) server-side `[verificar tooling de extracción vigente en el repo en Discovery]` → contexto allowlisted del agente (nunca el binario al prompt).
- **Requisito-set propose→confirm**: el agente propone requisitos tipados `{ kind, text, cita (página/sección), excluyente?, attestation }` — cada uno CITANDO su origen en las bases; validación fail-closed (cita obligatoria; kinds del CHECK vigente de la tabla); confirm humano ejecuta el command que persiste en `proposal_requirements`.
- **Matriz de admisibilidad determinista**: checks contra el perfil Efeonce + el checklist de `compliance-riesgo-integridad.md` (documentos, garantías, inhabilidades) → estado por check con evidencia.
- **Fit score explicable** (componentes declarados, no un número opaco — patrón scoring de `bid-lifecycle-go-no-go.md`), como INSUMO del gate humano `fit_review` (el humano decide bid/no-bid; el score jamás auto-transiciona).
- **Eval baseline**: golden = las bases reales de SKY (Wherex) → el requisito-set que el humano usó, con citas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` §9 (F1) + §5-bis (structured output + eval) — F1 es fan-out de lectura, NO un tool-loop.
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` — evidence-first (toda clasificación cita el documento), human-in-control (bid/no-bid es humano SIEMPRE).
- Skill `greenhouse-public-private-tenders` → `compliance-riesgo-integridad.md` (checklist de admisibilidad canónico) + `bid-lifecycle-go-no-go.md` (scoring explicable) — la spec funcional de esta task.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — commands gobernados; Nexa/MCP los operan por construcción (superficie = extensión de TASK-1416).

Reglas obligatorias:

- **NUNCA** un requisito sin cita a las bases (página/sección/anexo) — un requisito sin origen no es confirmable (espejo del `citedInputs` del intake agent).
- **NUNCA** el score/matriz transiciona el estado solo: `fit_review` es gate humano de la state machine (la DB ya lo exige).
- **NUNCA** norma/umbral/plazo como verdad eterna en el código de la matriz: los checks citan su fuente y fecha (regla dura #1 de la skill).
- **NUNCA** el RFP crudo completo a un evento/proyección (invariante del dominio: no exponer `external_source_snapshot`).

## Normative Docs

- `src/lib/commercial/tenders/proposals/intake-agent.ts` — el molde propose→confirm→execute.
- `migrations/20260712160001023_task-1392-proposal-studio-foundation.sql` §6 — el shape mínimo vigente de `proposal_requirements` (extenderlo es migración aditiva de esta task si Discovery lo exige).
- `src/lib/commercial/tenders/proposals/render-constraints.ts` — el consumer downstream del requisito-set (no romperlo).
- `docs/commercial/tenders/sky-blog-2026/bases/` — las bases reales de SKY (el golden del eval) `[verificar path exacto del workspace]`.

## Dependencies & Impact

### Depends on

- TASK-1392 (shipped): aggregate + `proposal_assets` (`rfp_source`) + state machine con `analyzed`/`fit_review` + tabla `proposal_requirements`.
- Extracción de texto PDF/DOCX server-side `[verificar: qué tooling existe en el repo (storage/scan pipeline) vs qué hay que incorporar — decisión de Discovery con arch-architect si implica dependencia nueva]`.

### Blocks / Impacts

- Alimenta las constraints reales del render (TASK-1391, ya shipped) y el contexto del orquestador (TASK-1419).
- El gate de margen de `fit_review` (F0) gana su complemento: admisibilidad + fit.

### Files owned

- `src/lib/commercial/tenders/proposals/analysis/*` (nuevo módulo: extracción-contexto, agente, matriz, score, commands)
- `src/lib/commercial/tenders/proposals/analysis/__tests__/*` + fixtures golden (nuevos)
- `migrations/*` (sólo si el shape de `proposal_requirements` requiere columnas aditivas)
- `scripts/commercial/_sanity-rfp-analysis.ts` (nuevo)

## Current Repo State

### Already exists

- La tabla `proposal_requirements` (mínima, F0) + su consumer (`render-constraints.ts`). Los estados `analyzed`/`fit_review` con gate humano en DB. Los assets RFP con scan pipeline. El molde de agente + eval. El checklist funcional en la skill.

### Gap

- Nada lee el contenido de los assets; nada llena `proposal_requirements` programáticamente; no existe matriz de admisibilidad ni fit score en código. `[verificar]` el CHECK vigente de kinds/attestation de la tabla contra lo que el checklist necesita.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/commercial/tenders/proposals/analysis/`
- Future candidate home: `domain-package`
- Boundary: el análisis consume assets vía el reader canónico del asset store y persiste vía commands propios del aggregate; la matriz/score son funciones puras sobre el requisito-set confirmado; nada importa del composer ni del authoring.
- Server/browser split: **server-only** (binarios, extracción y LLM server-side; el browser verá el resultado vía superficies futuras).
- Build impact: `none` (si Discovery incorpora una dependencia de extracción PDF, se re-declara en el plan con arch-architect antes de agregarla).
- Extraction blocker: la extracción de documentos podría ser primitive de plataforma (storage) más que del dominio — documentar el port si se extrae.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (llena el insumo del gate bid/no-bid y las constraints del render de una oferta contractual)
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_commercial.proposal_requirements` (escritura vía command); assets `rfp_source` (lectura).
- Consumidores afectados: `render-constraints.ts` (no romper), gate `fit_review`, orquestador (TASK-1419), Nexa/MCP (vía TASK-1416).
- Runtime target: `local` + `staging`.

### Contract surface

- Contrato existente a respetar: shape/CHECKs vigentes de `proposal_requirements` + `extractRenderConstraints` (su test es el contrato del consumer); state machine (transición `analyzed` la ejecuta un command con actor).
- Contrato nuevo: `buildRfpAnalysisContext` (extracción allowlisted) · `proposeRequirementSet`/`confirmRequirementSet` (molde) · `computeAdmissibilityMatrix(requisitos, perfil)` (pura) · `computeFitScore(...)` (pura, explicable).
- Backward compatibility: los requirements cargados a mano (SKY) siguen válidos; el command es aditivo e idempotente.
- Full API parity: commands gobernados desde el día 1; superficie conversacional = extensión de TASK-1416 (follow-up).

### Data model and invariants

- Entidades: `proposal_requirements` (posibles columnas aditivas: cita/origen, excluyente, fuente del check `[verificar]`).
- Invariantes: requisito ⇒ cita obligatoria; confirm humano antes de persistir; matriz/score NUNCA transicionan estado; re-análisis no duplica (idempotencia por asset+hash del contexto); los requirements confirmados son la ÚNICA fuente de `render-constraints`.
- Tenant/space boundary: entitlement per-ORG + capability del dominio vía la puerta única.
- Idempotency/concurrency: idempotencyKey por hash (molde); re-confirmar el mismo set no duplica filas (upsert por proposal+requirement key).
- Audit/outbox/history: el confirm persiste con el patrón de audit/outbox del aggregate (mismo riel que los commands F0).

### Migration, backfill and rollout

- Migration posture: `additive` (sólo si el shape lo exige; markers canónicos + DO block anti pre-up-marker).
- Default state: flag nuevo `TENDER_RFP_ANALYSIS_ENABLED` default OFF (fila en el ledger mismo PR) — dominio distinto al chapter-author, se apaga por separado.
- Backfill plan: N/A (los requirements manuales de SKY quedan como están).
- Rollback path: flag OFF + revert PR; migración aditiva reversible con down.
- External coordination: ninguna.

### Security and access

- Auth/access gate: puerta única del Studio + capability `commercial.proposal.manage` (o need nuevo en `NEED_TO_CAPABILITY` — decidir en Discovery).
- Sensitive data posture: las bases pueden contener datos del comprador — el contexto del agente es allowlisted (texto extraído por secciones, no binario); nada del RFP crudo a eventos/proyecciones.
- Error contract: `canonicalErrorResponse` en routes; `captureWithDomain`; extracción fallida → análisis `no_disponible` explícito (nunca un requisito-set vacío como "sin requisitos").
- Abuse/rate-limit: interno; fan-out de lectura acotado por asset.

### Runtime evidence

- Local checks: suite del módulo + eval golden verdes; `extractRenderConstraints` intacto.
- DB/runtime checks: requisito-set persistido verificado en PG real; idempotencia ejercitada (2º confirm no duplica).
- Integration checks: corrida real con las bases de SKY → requisito-set con citas → matriz + fit score → transición `analyzed` por actor humano; evidencia en Handoff.
- Reliability signals/logs: evaluar en Discovery un signal de análisis fallido persistente (steady=0) si el flujo queda operativo en staging.
- Production verification sequence: flag OFF en prod; flip = decisión del operador (EPIC-029).

### Acceptance criteria additions

- [ ] Un requisito sin cita a las bases rechaza el set completo (test).
- [ ] `extractRenderConstraints` produce lo mismo antes/después para los requirements de SKY (no-regresión del consumer).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Extracción + contexto allowlisted

- `buildRfpAnalysisContext(proposalId)`: assets `rfp_source` → texto por secciones/páginas (tooling decidido en Discovery) → contexto tipado. Fallo de extracción = `no_disponible` explícito.

### Slice 2 — Requisito-set propose→confirm→persist

- Molde completo: `proposeRequirementSet` (structured output; cada requisito con cita) → validador fail-closed (citas ⊆ contexto; kinds del CHECK) → `confirmRequirementSet` (member) → upsert idempotente en `proposal_requirements` + audit/outbox del aggregate. Migración aditiva si el shape lo exige.

### Slice 3 — Matriz de admisibilidad + fit score (puros)

- `computeAdmissibilityMatrix` (checks del checklist canónico, cada uno con fuente+fecha) + `computeFitScore` (componentes explicables). Funciones puras sobre el set confirmado; tests con el caso SKY.

### Slice 4 — Eval baseline + corrida real

- Golden = bases SKY → requisito-set esperado (fixture frozen). Adversariales: requisito sin cita, cita inventada, kind fuera del CHECK. Corrida real end-to-end contra la proposal SKY (o el siguiente caso vivo) documentada; transición `analyzed` ejecutada por humano.

## Out of Scope

- Bid/no-bid automático (el humano decide SIEMPRE). El foro de aclaraciones y seguimiento (fases posteriores del método). La superficie Nexa/UI (extensión de TASK-1416 / F5). El discovery público (RESEARCH-007). Cambiar `render-constraints.ts` (consumer intocado). El chapter-author/orquestador/verifier (§5-ter — otro carril).

## Detailed Spec

La spec funcional ES el método de la skill (checklist de admisibilidad + scoring explicable) — esta task lo mecaniza sobre el aggregate F0 sin re-decidirlo. Decisiones técnicas que la task deja al Discovery con `[verificar]`: tooling de extracción de texto, columnas aditivas del requisito-set, y el need de capability. Todo lo demás (molde, gates, idempotencia, evidencia) está fijado por los rieles existentes del dominio.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → 2 → 3 → 4 estricto: sin extracción no hay contexto; sin set confirmado no hay matriz/score; el eval (4) gatea el prompt del propose (§5-bis) — ejecutar el eval de Slice 4 contra el validador ANTES de dar por shippable el prompt de Slice 2.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Requisito excluyente NO detectado (falso negativo) | commercial | medium | eval con las bases reales + el humano de `fit_review` revisa el set con las bases al lado (la matriz lista "no detectados" como categoría honesta) | revisión humana / post-mortem por caso |
| Requisito alucinado con cita inventada | commercial | medium | validador exige cita ⊆ contexto extraído (fail-closed) | eval rojo |
| Regresión de `render-constraints` | render pipeline | low | test de no-regresión con los requirements SKY | suite render rojo |
| Migración aditiva rompe CHECKs vigentes | DB | low | markers canónicos + DO block + `pnpm migrate:up` verificado contra information_schema | migrate gate |
| Score opaco genera confianza indebida | commercial | medium | componentes explicables + el score NUNCA transiciona estado | review del gate humano |

### Feature flags / cutover

- `TENDER_RFP_ANALYSIS_ENABLED` (env var, default `false`, Vercel-only) — fila en `FEATURE_FLAG_STATE_LEDGER.md` mismo PR (gate `docs:closure-check`). OFF → el análisis no se ofrece; los requirements manuales siguen operativos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert PR | <5 min | sí |
| 2 | flag OFF + revert PR; migración aditiva con down | <10 min | sí |
| 3-4 | revert PR (funciones puras + tests) | <5 min | sí |

### Production verification sequence

1. CI: suite del módulo + eval + no-regresión de constraints verdes.
2. Staging: corrida real con bases reales; requisito-set en PG verificado; transición `analyzed` humana.
3. Prod: flag OFF; flip = decisión del operador con sign-off (EPIC-029).

### Out-of-band coordination required

- N/A — repo-only change (las bases de SKY ya están en el workspace del repo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `buildRfpAnalysisContext` extrae por secciones con origen; extracción fallida = `no_disponible` explícito (nunca set vacío silencioso).
- [ ] El propose exige cita por requisito; cita fuera del contexto RECHAZA el set completo (test).
- [ ] El confirm es member-only, idempotente (2º confirm no duplica filas en PG — test contra DB real) y persiste con audit/outbox del aggregate.
- [ ] Matriz de admisibilidad con fuente+fecha por check y categoría honesta de "no evaluado"; fit score con componentes explicables; ninguno transiciona estado (tests).
- [ ] `extractRenderConstraints` sin regresión con los requirements de SKY (test).
- [ ] Eval baseline verde contra las bases reales de SKY + adversariales.
- [ ] `TENDER_RFP_ANALYSIS_ENABLED` OFF + fila en el ledger, mismo PR.
- [ ] Corrida real end-to-end documentada con transición `analyzed` ejecutada por humano.

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test` (full) · `pnpm build`
- `pnpm vitest run src/lib/commercial/tenders/proposals`
- `pnpm migrate:up` + verificación contra information_schema (si hay migración)
- Corrida real vía proxy PG documentada + `pnpm docs:closure-check`

## Closing Protocol

- [ ] Lifecycle + carpeta + README/registry sincronizados.
- [ ] `Handoff.md` + `changelog.md` + ledger.
- [ ] Delta en el arch doc (§9 F1: materializada; §0 actualizado) + companion `proposal-studio-runtime.md` (ambos espejos) + invariantes del dominio si nacen reglas duras nuevas.
- [ ] Impacto cruzado: EPIC-029, TASK-1419 (contexto del orquestador), TASK-1416 (superficie del análisis como follow-up).

## Follow-ups

- Acción gobernada Nexa del análisis ("analiza las bases de X") — extensión de TASK-1416.
- Conexión con el discovery público (RESEARCH-007): promover oportunidad → analizar — sigue siendo command con confirmación humana.

## Open Questions

- **Tooling de extracción PDF/DOCX**: ¿existe primitive en el repo (pipeline de scan/storage) o se incorpora dependencia? Decisión de Discovery; si es dependencia nueva, pasar por `arch-architect` (overlay) antes de agregarla.
- **¿El shape mínimo de `proposal_requirements` alcanza** (cita/excluyente/fuente del check) **o exige columnas aditivas?** Resolver contra el CHECK vigente de la migración F0.
