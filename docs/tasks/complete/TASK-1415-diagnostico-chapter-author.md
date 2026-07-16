# TASK-1415 — Tender Proposal Studio: el motor de chapter-authors (servicio-agnóstico) — con diagnóstico (SEO/AEO) como primera implementación de prueba


## Delta 2026-07-16 — CIERRE (implementada completa)

- **Los 5 slices shipped** en `develop` local (commits atómicos, sin push): interface + máquina compartida → mapper → 2º author (agnosticismo) → author LLM diagnóstico + eval golden → loop integrado + flag.
- **Open Questions resueltas en Discovery:** (1) 1ª implementación = diagnóstico (como especificaba la task); (2) 2º author = credenciales (bullet-list, no lee el Grader); (3) capability = REUSA `commercial.proposal.manage` (el catálogo ya fijó el criterio "propose no escribe"; NO se creó `commercial.proposal.author`); (4) el mapeo dim→peldaño **NO requirió coordinación out-of-band**: ya era código canónico (`report-artifact/model.ts` `REPORT_LEVEL_DIMENSIONS` + `readiness.agentic` para Be Actionable) y verificado contra el run real reproduce el golden 40/70/37/8/76 exacto; (5) "F1" conversacional no se filtró a código/docs; (6) EPIC-029 queda como decisión del operador (follow-up).
- **Runtime evidence:** 3 corridas LLM reales contra `EO-GRUN-00046` (las 2 primeras rechazadas por el guard — cifra huérfana "2026" y overflow — probaron el fail-closed en vivo; la 3ª renderizó 2 PNG + PDF 759 KB, 0 warnings, frames revisados a ojo). Sanity committeado: `scripts/commercial/_sanity-diagnostico-chapter-author.ts`.
- **Gates:** test full 9572/0 · build prod OK · `composer:visual-gate` 61 frames a 0 px · `docs:closure-check` limpio · `flags:audit` 0 sin registrar · `ops:lint` 0/0.
- **Capas documentales (triple, completa):** técnica = Delta §5-ter + §0 del arch doc + invariantes en `COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` + companion `proposal-studio-runtime.md` (espejado a `.codex/`); funcional = `docs/documentation/comercial/motor-chapter-authors.md`; manual = `docs/manual-de-uso/comercial/autorar-lamina-con-chapter-author.md` (ambos indexados; agregados 2026-07-16 a pedido del operador — la operación hoy es por script, el manual lo documenta y declara la superficie Nexa/UI como follow-up).
- **Rollout:** `code complete, rollout pendiente` sólo en el sentido del flag (OFF por diseño en esta task; prender en prod es decisión de negocio posterior — Move 0). No hay migraciones, env vars requeridas ni redeploy pendiente para el estado declarado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `none` (el Tender Proposal Studio no tiene EPIC dedicado — ver Open Questions)
- Status real: `COMPLETE 2026-07-16 en develop local (sin push) — code complete verificado end-to-end en local; rollout: flag OFF en todos los environments (flip staging = sign-off operador)`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none`
- Branch: `task/TASK-1415-diagnostico-chapter-author`

## Summary

Construye el **motor de chapter-authors** del Tender Proposal Studio: la máquina **servicio-agnóstica** con la que un agente **redacta el contenido de una lámina** de propuesta (el humano confirma; el composer renderiza), en el molde `propose → confirm → render` que F0 ya dejó probado. La misma interface sirve a **cualquier línea de servicio de Efeonce** (creativo, social media, web/CRM, HubSpot, contenido, SEO/AEO): cada author enchufa **su propia fuente de datos** + el framing LLM compartido + su propio validador. Se materializa con **una primera implementación de prueba — el chapter-author de diagnóstico (SEO/AEO)** — elegida sólo por tener el contrato más limpio (entra el run del AI Visibility Grader, sale a una plantilla probada, y el golden set ya existe). Hoy ese contenido se **escribe a mano** en el `deck-plan.json`; el composer sólo lo renderiza. Es el vertical slice que de-riesga toda la capa de autoría — y que prueba que la interface es **reusable entre servicios, no fiteada a AEO**.

> 🟢 **Servicio-agnóstico por diseño (invariante duro):** el motor NO es de SEO/AEO. Diagnóstico es la primera implementación por contrato limpio, pero la interface `ChapterAuthor` sirve igual a un author de brief creativo, de plan social, de web/CRM/HubSpot o de contenido. Diagnóstico lee el Grader; otro author leerá el squad blueprint, el cotizador o el RFP. **NUNCA** hornear una suposición AEO en la interface ni en el harness de eval — el **segundo consumidor del eval es de OTRO servicio**, precisamente para probarlo.

> 🔴 **Aclaración de nomenclatura (leer antes de tomar):** en la conversación esto se llamó "F1", pero **la F1 canónica del arch doc (`§9`) es OTRA cosa** — análisis/admisibilidad del RFP. Este trabajo es el **nodo chapter-author de la topología `§5-ter`** (orquestador → chapter-author → verifier). NO implementa el orquestador ni el verifier ni la admisibilidad. Citar `§5-ter` + `Apéndice B` + `F4`, no `§9 F1`.

## Why This Task Exists

El spine del Studio está shipeado (F0/TASK-1392: aggregate `Proposal`, state machine, gates humanos, entitlement per-ORG, intake agent propose→confirm; TASK-1391 render; TASK-1393 composer domain-free) y **operó una licitación real** (SKY, enviada por Wherex, 2026-07-15). Pero en toda esa cadena **el humano sigue autorando el `deck-plan`**: para la lámina de diagnóstico de SKY, un humano leyó el run `EO-GRUN-00046` y escribió a mano el título, los 3 hechos (0% citabilidad, LATAM 16 vs 9, ~40.000 visitas) y los 5 scores de la escalera (40/70/37/8/76). El agente **no autoró nada**.

El arch doc ya decidió la forma de cerrar ese gap (`§5-ter`, Accepted): un chapter-author por capítulo que emite **structured output** (no tool-chains) reusando `generateStructured*` — sin agent-runtime nuevo. Falta **materializarlo**, y la disciplina del repo exige empezar por un **vertical delgado con eval baseline** (la deuda declarada: *todo hito nace con TASK + gates*, y `§5-bis` exige eval baseline por agente). La lámina de diagnóstico es el slice de **contrato más limpio**: entra dato estructurado real (el Grader), sale a una plantilla probada, y el golden set del eval **ya existe** (las láminas SKY autoradas a mano).

## Goal

- La **interface `ChapterAuthor` servicio-agnóstica** + la máquina compartida (`deriveFacts` por-author, `frame` LLM compartido, `validate` por-author, molde `propose`/`confirm`, harness de eval) — el primitive reusable por **cualquier** línea de servicio, sin suposición AEO.
- Un **mapper determinista** `Grader → hechos de diagnóstico` (la primera fuente enchufada: scores→peldaños, métricas→goals, cada uno con `evidenceRef` al run) — el transform que hoy no existe y que hace **imposible fabricar un número**.
- Un **chapter-author LLM** (diagnóstico) que enmarca esos hechos, fail-closed: una cifra sin hecho/`evidenceRef` se rechaza.
- Un **eval baseline** que **gatea el prompt** (golden = láminas SKY a mano) + un **segundo consumidor de OTRO servicio** (author distinto, misma interface) que prueba que el motor **no está AEO-fitted**.
- El **loop end-to-end probado**: `propose` → `confirm` (humano, molde `intake-agent.ts`) → `composeArtifact` renderiza la lámina real, detrás de flag OFF.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` → **§5-bis** (stack de agentes: Claude vía cliente canónico, orquestación propia, **eval baseline obligatorio por agente**), **§5-ter** (topología Accepted: chapter-author como nodo de juicio, structured output, **reusa `generateStructured*`, NO agent-runtime nuevo**; cero LLM en render; selector contentType→plantilla es lookup puro), **Apéndice B** (el composer del deck) y **§9 F4** (packaging/decks).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — la capability nace con contrato gobernado a nivel capability (un primitive, muchos consumers).
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` — los 3 principios (anti-fabricación · fail-closed · human-in-control) y las reglas del composer.
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` → §LLM providers (extender el cliente canónico `src/lib/ai/`, NUNCA instanciar un SDK paralelo).

Reglas obligatorias:

- **El agente NUNCA escribe.** `propose → confirm → execute`: el chapter-author propone; un humano (`actor.kind==='member'`) confirma el mismo command. Molde exacto: `src/lib/commercial/tenders/proposals/intake-agent.ts`.
- **Anti-fabricación mecanizada.** Cada cifra de la lámina lleva `evidenceRef` derivado del run del Grader; el mapper es la única fuente de hechos; el LLM sólo los enmarca. El composer ya rechaza una cifra sin `evidenceRef`.
- **Structured output, no tool-chains.** Usar `generateStructuredAnthropic` (`src/lib/ai/anthropic.ts:71`) con `inputSchema` JSON-Schema-literal + validador TS puro fail-closed. NO abrir un loop agéntico ni depender del router de Nexa.
- **El autor declara `contentType`+`slots`, NUNCA `template`** (`TemplateAuthorityError`). Cero LLM en el render.
- **Eval como gate del prompt** (`§5-bis`): sin eval verde, el prompt no shipea. Patrón: `intake-agent-eval.test.ts`.

## Normative Docs

- `src/lib/commercial/tenders/proposals/intake-agent.ts` — el contrato propose→confirm→execute a espejar (el molde canónico del dominio).
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — registrar `TENDER_CHAPTER_AUTHOR_ENABLED` en el mismo PR (gate `pnpm docs:closure-check`).
- `docs/commercial/tenders/sky-blog-2026/deck-plan.json` — láminas `diagnostico` (`one-metric`→StatSplit) y `escalera` (`maturity-ladder`→MaturityLadderFull): el golden set del eval.

## Dependencies & Impact

### Depends on

- **F0 aggregate `Proposal`** (TASK-1392, aplicado a dev) — el molde propose→confirm: `src/lib/commercial/tenders/proposals/intake-agent.ts` (`buildProposalAgentContext:50`, `proposeProposalIntake:210`, `validateProposalIntakeProposal:143`, `confirmProposalIntake:243`).
- **Composer domain-free** (TASK-1393) — `composeArtifact(catalog, deckPlan, outDir, options)` en `src/lib/artifact-composer/compose.ts:105`; tipos `DeckPlan`/`SlideSpec`/`ContentType` en `src/lib/artifact-composer/contracts.ts:135/127/12`.
- **Helpers structured output** — `generateStructuredAnthropic` `src/lib/ai/anthropic.ts:71` (+ `openai.ts:172`, `google-genai.ts:150` como fallbacks por tarea).
- **Reader del Grader** (AI Visibility) — `readGraderReport(...)` `src/lib/growth/ai-visibility/report/command.ts:46` → `GraderReport` (`report/contracts.ts:519`); `getGraderScore(...)` `src/lib/growth/ai-visibility/scoring/store.ts:207` → `PersistedGraderScore` (7 dims en `scoring/config.ts:18`); readiness `scoring/readiness-engine.ts` + `report/builder.ts:481 buildReportReadiness`.
- Catálogo `deck-axis`: registry `one-metric→StatSplit` (`catalogs/deck-axis/registry.json:539`), `maturity-ladder→MaturityLadderFull` (`registry.json:541`) + sus `.slots.json`.

### Blocks / Impacts

- Desbloquea el **fan-out del resto de chapter-authors** (§5-ter): probado el loop en diagnóstico, se replica a squad/líneas/económica-narrativa/etc. como tasks hermanas.
- Es prerequisito conceptual del **orquestador** y el **verifier** (los otros 2 nodos de §5-ter): esta task deja el nodo chapter-author probado en aislamiento.
- No impacta payroll/finance/identity/SCIM. No toca el runtime productivo (flag OFF).

### Files owned

- `src/lib/commercial/tenders/proposals/authoring/chapter-author.ts` (nuevo — la interface `ChapterAuthor` servicio-agnóstica + la máquina compartida) `[verificar carpeta]`
- `src/lib/commercial/tenders/proposals/authoring/eval-harness.ts` (nuevo — harness de eval genérico, domain-free)
- `src/lib/commercial/tenders/proposals/authoring/diagnostico-facts.ts` (nuevo — el mapper determinista de diagnóstico)
- `src/lib/commercial/tenders/proposals/authoring/diagnostico-chapter-author.ts` (nuevo — el LLM + propose→confirm de diagnóstico)
- `src/lib/commercial/tenders/proposals/authoring/__tests__/*.test.ts` (nuevos — test del mapper, eval de diagnóstico, eval del 2º author de otro servicio)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila del flag nuevo)
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` (Delta: motor de chapter-authors materializado)

## Current Repo State

### Already exists

- **El molde propose→confirm→execute** (intake-agent.ts) — a espejar tal cual (context allowlisted → propuesta tipada → validador puro fail-closed → confirm humano ejecuta el mismo command).
- **El composer** compone un `DeckPlan` desde código (`composeArtifact`) y valida todo el plan antes de renderizar; la lámina de diagnóstico ya renderiza desde slots a mano.
- **El reader del Grader** entrega `GraderReport` viz-ready (scores, 7 dimensiones, readiness, citas por observación) tipado.
- **El eval-fixture-como-gate** ya es patrón vivo (`intake-agent-eval.test.ts`, `render-agent-eval.test.ts`, `growth/ai-visibility/evals/*`).
- **El golden set**: las láminas `diagnostico` + `escalera` de SKY (autoradas a mano, run `EO-GRUN-00046`).

### Gap

- 🔴 **El transform `Grader → slots del deck` NO existe.** Los 5 peldaños (Be Found/Readable/Correct/Actionable/Intrinsic) **no son** las 7 dimension keys del score (`ai_visibility, entity_clarity, …`); "Be Actionable" sale del **readiness engine**, no del score. El mapeo dimensiones+readiness → 5 rungs + 3 hero-goals está **escrito a mano** en el JSON hoy. Ese mapper es el corazón de la task. `[verificar]` la correspondencia exacta dim/readiness → rung con el equipo del Grader.
- No existe ningún chapter-author (ningún nodo de §5-ter materializado). No existe `TENDER_CHAPTER_AUTHOR_ENABLED`.
- El schema del dominio usa **JSON-Schema-literal + validador TS puro** (NO Zod). Si se prefiere Zod, es trabajo/decisión nueva — el patrón vigente es el de `intake-agent.ts:119` (`INTAKE_SCHEMA`).

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/commercial/tenders/proposals/authoring/` (dentro del dominio Tender ya existente en el monolito)
- Future candidate home: `domain-package`
- Boundary: primitive `ChapterAuthor` (interface servicio-agnóstica) + `diagnosticoChapterAuthor` (propose→confirm) + `deriveDiagnosticoFacts` (mapper puro); consumers autorizados = el orquestador futuro (§5-ter), Nexa (governed action futura), MCP (futuro). Viaja con el dominio Tender (candidato a `packages/*` bajo EPIC-027), NO con el composer — el composer es domain-free y no conoce licitaciones ni servicios. El composer NO importa de acá (frontera del motor).
- Server/browser split: **server-only** (LLM key server-side vía cliente canónico; reader del Grader toca DB; el browser nunca ve el prompt ni el secreto).
- Build impact: `none` (reusa el cliente `src/lib/ai/` ya en el bundle; sin dependencia pesada nueva).
- Extraction blocker: el reader del Grader vive en `src/lib/growth/ai-visibility/**` (otro dominio) — el chapter-author cruza esa frontera por **contrato de reader**, no por acoplamiento; documentar el port si el dominio Tender se extrae.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: reader del Grader (`readGraderReport`) como input; el `DeckPlan`/`ResolvedCompositionManifest` como output; ninguna tabla nueva.
- Consumidores afectados: el orquestador futuro (§5-ter), Nexa (governed action futura), MCP (futuro), CLI de compose.
- Runtime target: `local` + `staging` (flag OFF en prod).

### Contract surface

- Contrato existente a respetar: `intake-agent.ts` (molde propose→confirm→execute), `compose.ts`/`contracts.ts` (DeckPlan/SlideSpec), `report/contracts.ts` (GraderReport), `generateStructuredAnthropic`.
- Contrato nuevo o modificado: `deriveDiagnosticoFacts(graderReport, score, readiness) → DiagnosticoFacts` (puro); `diagnosticoChapterAuthor.propose(context) → DiagnosticoChapterProposal`; `.confirm(proposal, actor) → SlideSpec[]` (los slots de `diagnostico` + `escalera`).
- Backward compatibility: `not applicable` (todo nuevo, aditivo, detrás de flag).
- Full API parity: el chapter-author es un **primitive server-side** (`src/lib/commercial/tenders/proposals/authoring/**`), no lógica en UI; expone `propose`/`confirm` command-shaped para que Nexa/MCP lo operen por construcción (governed action = follow-up, ver DoD gate).

### Data model and invariants

- Entidades/tablas/views afectadas: **ninguna nueva** (input = reader Grader; output = slots efímeros hasta el confirm humano, que reusa el path existente del deck-plan/Proposal).
- Invariantes que no se pueden romper:
  - **Todo hecho de la lámina traza al run del Grader** (`evidenceRef` derivado por el mapper; el LLM no puede introducir una cifra sin hecho).
  - **El LLM sólo enmarca; el mapper es la única fuente de dato numérico** (separación determinista/agéntico).
  - **El agente NUNCA confirma** (`actor.kind==='member'` exigido, igual que `confirmProposalIntake`).
  - **Idempotencia por hash de la propuesta** (mismo run + mismo contexto → misma propuesta; derivar `idempotencyKey` del hash, como intake-agent).
- Tenant/space boundary: el run del Grader se resuelve por `orgId` desde la sesión/contexto (NUNCA un `ownerOrgId` en el input del agente — el scope sale del entitlement, como el resto del dominio).
- Idempotency/concurrency: idempotencyKey = hash canónico de la propuesta; el propose es read-only y stateless.
- Audit/outbox/history: el `propose` no muta (sin audit); el `confirm` reusa el audit del command existente. El eval corre en CI, no en runtime.

### Migration, backfill and rollout

- Migration posture: `none` (sin schema).
- Default state: `flag OFF` (`TENDER_CHAPTER_AUTHOR_ENABLED` default `false`).
- Backfill plan: N/A (sin datos que migrar).
- Rollback path: flag a `false` (el propose deja de ofrecerse) + revert PR. Reversible instantáneo — no hay estado persistido.
- External coordination: LLM provider ya configurado (secret server-side vía `*_SECRET_REF`); ninguna coordinación externa nueva.

### Security and access

- Auth/access gate: capability del dominio (`commercial.proposal.manage` o una `commercial.proposal.author` nueva — decidir en Discovery; grant en `runtime.ts` mismo PR + coverage test si se crea).
- Sensitive data posture: sin PII/finance/payroll. El run del Grader es dato de negocio del ORG; el prompt no incluye secretos.
- Error contract: `captureWithDomain(err, commercial, …)`; el helper LLM lanza en error → el caller **degrada honesto** (no propone), nunca inventa.
- Abuse/rate-limit posture: el propose es interno (no público) — sin rate-limit nuevo; el costo LLM lo acota `maxTokens`.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/commercial/tenders/proposals/authoring` (mapper + eval) verde; `pnpm typecheck`; `pnpm lint`.
- DB/runtime checks: ejercitar `readGraderReport` contra el run real `EO-GRUN-00046` vía proxy PG (el mapper se prueba con dato real, no sólo fixtures).
- Integration checks: una corrida real del chapter-author contra `EO-GRUN-00046` produce una propuesta que **pasa el composer** (`composeArtifact` renderiza la lámina) y el eval la aprueba contra el golden.
- Reliability signals/logs: sin signal nuevo (flag OFF, interno); `captureWithDomain` para fallos del LLM.
- Production verification sequence: N/A en prod (flag OFF). La verificación vive en local/staging + eval CI.

### Acceptance criteria additions

- [x] Source of truth (reader Grader), contract surface (`deriveDiagnosticoFacts` + `diagnosticoChapterAuthor`) y consumers nombrados con paths reales.
- [x] Invariante anti-fabricación explícito (todo hecho traza al run; el LLM sólo enmarca) y cubierto por test.
- [x] Flag `TENDER_CHAPTER_AUTHOR_ENABLED` default OFF + fila en el ledger, mismo PR.
- [x] Eval baseline verde contra el golden SKY **y** contra un segundo consumidor NO-SKY.
- [x] Runtime evidence: corrida real contra `EO-GRUN-00046` que el composer renderiza.

## Capability Definition of Done — Full API Parity gate

- [x] Lógica en el primitive (`authoring/**`), no en UI.
- [x] Modelada como command (`propose`/`confirm`), no click-handler.
- [x] Read (reader Grader) + write (confirm humano) con authorization fina (capability), idempotencia por hash, errores canónicos, observabilidad.
- [x] Capability + grant en el mismo PR si se crea `commercial.proposal.author` (+ coverage test).
- [x] Camino programático declarado: **governed action Nexa + MCP = follow-up explícito** (esta task deja el primitive; la superficie Nexa/MCP es task hermana). Deuda documentada.
- [x] Write apto para `propose → confirm → execute` (ya es el molde). NO construir integración Nexa-específica.
- [x] Un primitive, muchos consumers: cero lógica duplicada.
- [x] Parity check = SÍ (el contrato gobernado existe; Nexa/MCP lo operan por construcción cuando se cablee su acción).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — La interface `ChapterAuthor` servicio-agnóstica + la máquina compartida

- El contrato `ChapterAuthor<Source, Facts>`: `deriveFacts(source) → Facts` (por-author, puro) + `frame(facts) → Framing` (LLM compartido, `generateStructured*`) + `validate(proposal, facts) → ok|reject` (por-author, fail-closed) + `propose`/`confirm` (molde `intake-agent.ts`).
- El **harness de eval genérico**: dado `{author, source, golden}` corre el pipeline y compara. Domain-free.
- **Cero suposición AEO** en el contrato ni el harness (ni "Grader", ni "escalera", ni "dimensión" en la interface). El motor no sabe de servicios.

### Slice 2 — Diagnóstico (SEO/AEO): el facts mapper (primera fuente enchufada)

- `deriveDiagnosticoFacts(graderReport, score, readiness)` puro: deriva los 5 peldaños (Be Found/Readable/Correct/Actionable/Intrinsic) desde dimensiones + readiness, y los hero-goals (métricas), **cada uno con su `evidenceRef`** al run.
- Resolver `[verificar]` la correspondencia exacta dimensión/readiness → peldaño (con el equipo del Grader / `readiness-engine.ts`); documentarla en el código.
- Test puro con el run real `EO-GRUN-00046`: los 5 scores derivados = 40/70/37/8/76 del golden (o la corrección justificada).

### Slice 3 — El eval baseline + la prueba de servicio-agnosticismo

- Golden set = slots `diagnostico` + `escalera` de `deck-plan.json` (SKY, a mano). Eval de diagnóstico verde (hechos exactos; framing por criterios).
- 🟢 **Un segundo author de OTRO servicio** que implementa la MISMA interface `ChapterAuthor` y pasa el harness — aunque sea mínimo (p. ej. un author de **credenciales/equipo** que NO lee el Grader, sino el squad blueprint o una lista de clientes). Es la prueba dura de que el motor es servicio-agnóstico: si construir el 2º author obliga a tocar la interface/harness, la abstracción está mal (test del segundo consumidor de `arch-architect`).

### Slice 4 — Diagnóstico: el chapter-author LLM (el framing)

- `diagnosticoChapterAuthor.propose(context)`: `generateStructuredAnthropic` con `inputSchema` JSON-Schema-literal → propone el framing (título, narrativa, cuerpos) **sobre los hechos del mapper**.
- `validateDiagnosticoProposal` puro fail-closed: rechaza cifra huérfana o `evidenceRef` faltante. Espejo de `validateProposalIntakeProposal`.
- El prompt shipea **sólo con el eval de Slice 3 verde**.

### Slice 5 — El loop end-to-end + flag

- `diagnosticoChapterAuthor.confirm(proposal, actor)`: exige `actor.kind==='member'`, re-valida, deriva `idempotencyKey`, emite `SlideSpec[]`.
- Prueba integrada: run `EO-GRUN-00046` → propose → confirm → `composeArtifact` renderiza (frame revisado a ojo contra la de SKY).
- Flag `TENDER_CHAPTER_AUTHOR_ENABLED` default OFF (helper `isTenderChapterAuthorEnabled()`, patrón `render-jobs.ts:50`) + fila en `FEATURE_FLAG_STATE_LEDGER.md`.

## Out of Scope

- **El orquestador y el verifier** (los otros 2 nodos de §5-ter). Esta task construye el motor + el nodo chapter-author, con diagnóstico como implementación completa.
- **Los demás chapter-authors PRODUCTIVOS** (creativo, social, web/CRM, HubSpot, contenido, económica, squad — cada uno como author real de calidad, con su propia fuente de datos) — tasks hermanas post-loop-probado, una por servicio/lámina. **OJO:** el *segundo author de prueba* de Slice 3 (mínimo, de otro servicio) SÍ está en scope — es la prueba de agnosticismo, no un author productivo.
- **La F1 canónica del arch doc** (análisis/admisibilidad del RFP) — es otra cosa, otra task.
- **La superficie Nexa/MCP** del chapter-author (governed action + tool) — follow-up declarado.
- **La UI** (ninguna).
- **Prender flags en prod** (Move 0 de la conversación) — decisión de negocio separada.
- **Schema/migración nuevos** — esta task no toca la DB salvo lecturas.
- **Cambiar el patrón JSON-Schema→Zod** del dominio — se respeta el vigente.

## Detailed Spec

El chapter-author separa **dato** de **framing**, y ésa es la garantía anti-fabricación:

```
readGraderReport(run) ─┐
getGraderScore(run) ───┼─► deriveDiagnosticoFacts()  [PURO, determinista]
readRunProbes(run) ────┘        │
                                ▼
                    DiagnosticoFacts {
                      rungs:  [{ anchor:'Be Found', score:40, evidenceRef, … }, …×5],
                      goals:  [{ kind, metric:'0%', evidenceRef, sourceFact }, …],
                    }
                                │
                                ▼
        diagnosticoChapterAuthor.propose()   [LLM: generateStructuredAnthropic]
          system+prompt: "enmarca ESTOS hechos; no inventes cifras"
          inputSchema (JSON-Schema-literal) → { title, narrative[], goalBodies[] }
                                │
                                ▼
        validateDiagnosticoProposal()  [PURO, fail-closed]
          rechaza: cifra no presente en facts · evidenceRef faltante · overflow
                                │
                     (humano confirma: actor.kind==='member')
                                ▼
        confirm() → SlideSpec[] (diagnostico + escalera) → composeArtifact()
```

El eval mide dos cosas distintas: **hechos** (exactos, string/número-equality contra el golden) y **framing** (criterios: cita los hechos, registro formal es-CL, sin cifra huérfana, cabe en canvas). El segundo consumidor NO-SKY prueba que el mapper+prompt no están fiteados a SKY.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (interface) → Slice 2 (diagnóstico mapper) → Slice 3 (eval + 2º servicio) → Slice 4 (diagnóstico LLM) → Slice 5 (loop+flag).
- **Slice 1 (interface) primero, siempre:** el mapper y el LLM implementan un contrato que debe existir antes — invertir el orden hornea una suposición AEO en la abstracción (justo lo que esta task existe para evitar).
- **Slice 3 (eval) DEBE existir antes de Slice 4 (LLM):** el prompt no shipea sin su gate (`§5-bis`). Ejecutar 4 antes que 3 viola el eval baseline obligatorio.
- El **segundo author de otro servicio (Slice 3)** valida que la interface es agnóstica **antes** de invertir en el LLM de diagnóstico (Slice 4): si no lo es, se detecta barato.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El LLM inventa una cifra que no está en los hechos | N/A (interno, flag OFF) | medium | validador puro fail-closed + gate `evidenceRef` del composer + eval | test rojo en CI (no llega a runtime) |
| El mapeo dim/readiness → 5 peldaños queda mal (score equivocado en la lámina) | N/A (contenido de propuesta) | medium | `[verificar]` con el equipo del Grader + test contra el run real + confirm humano mira el frame | eval rojo / revisión humana del frame |
| El author queda SKY-fitted (no reusable) | N/A | medium | segundo consumidor NO-SKY en el eval (obligatorio) | eval del 2º consumidor rojo |
| Regresión del composer al integrar el output | composer | low | `composeArtifact` valida todo el plan fail-closed; corrida integrada + visual gate del deck-axis intacto | suite composer / visual-gate |

### Feature flags / cutover

- `TENDER_CHAPTER_AUTHOR_ENABLED` (env var, default `false`). Helper `isTenderChapterAuthorEnabled()` en el módulo tenders (patrón `render-jobs.ts:50`). OFF → el propose no se ofrece. Cutover: flip a `true` en staging tras eval verde; prod = decisión del operador (post sign-off). Revert: env var a `false` + redeploy. Registrar en `FEATURE_FLAG_STATE_LEDGER.md` mismo PR (gate `docs:closure-check`).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (interface) | revert PR (contrato + harness, sin runtime) | <5 min | sí |
| Slice 2 (diagnóstico mapper) | revert PR (función pura sin efecto) | <5 min | sí |
| Slice 3 (eval + 2º servicio) | revert PR (sólo tests + stub) | <5 min | sí |
| Slice 4 (diagnóstico LLM) | flag OFF / revert PR | <5 min | sí |
| Slice 5 (loop+flag) | env var `TENDER_CHAPTER_AUTHOR_ENABLED=false` + redeploy | <5 min | sí |

### Production verification sequence

1. CI: `pnpm vitest run src/lib/commercial/tenders/proposals/authoring` verde (mapper + eval SKY + eval NO-SKY).
2. Local/staging: ejercitar `readGraderReport(EO-GRUN-00046)` vía proxy PG → mapper → propose → confirm → `composeArtifact` renderiza; revisar el frame a ojo contra la lámina SKY.
3. Flag ON en **staging** → repetir el flujo con la sesión agente; verificar que sin `member` el confirm rechaza.
4. Prod: **flag OFF** (no se enciende en esta task; es decisión de negocio posterior).

### Out-of-band coordination required

- `[verificar]` con el equipo/owner del AI Visibility Grader la correspondencia exacta dimensión/readiness → peldaño Be-X (es dato de dominio, no inferible del código solo). Salvo eso: `N/A — repo-only change`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] La interface `ChapterAuthor` + el harness de eval **no contienen ninguna suposición AEO** (ni `Grader`, ni `escalera`, ni `dimensión` en la abstracción), y un **segundo author de otro servicio** implementa la misma interface y pasa el harness **sin tocar la interface** (prueba de servicio-agnosticismo).
- [x] `deriveDiagnosticoFacts` es puro, deriva los 5 peldaños + los hero-goals **cada uno con `evidenceRef`**, y su test contra el run real `EO-GRUN-00046` pasa.
- [x] El chapter-author usa `generateStructuredAnthropic` (cliente canónico `src/lib/ai/`), NO un SDK paralelo ni el router de Nexa, y **sólo enmarca** hechos del mapper.
- [x] `validateDiagnosticoProposal` rechaza fail-closed: cifra huérfana, `evidenceRef` faltante, overflow. Test lo cubre.
- [x] El eval baseline es verde contra el golden SKY **y** contra un segundo consumidor NO-SKY.
- [x] El `confirm` exige `actor.kind==='member'`; el agente no puede confirmar (test).
- [x] Corrida integrada: run → propose → confirm → `composeArtifact` renderiza la lámina, frame revisado.
- [x] `TENDER_CHAPTER_AUTHOR_ENABLED` default OFF + fila en `FEATURE_FLAG_STATE_LEDGER.md`, mismo PR.
- [x] El composer y su visual gate (`pnpm composer:visual-gate`) siguen a 0 px (esta task no toca el catálogo).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (full) + `pnpm vitest run src/lib/commercial/tenders/proposals/authoring`
- `pnpm build`
- Ejercicio real del reader Grader contra `EO-GRUN-00046` vía proxy PG (SQL embebido/reader nuevo se ejercita contra PG real).
- `pnpm docs:closure-check` (flag en el ledger).

## Closing Protocol

- [x] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla).
- [x] El archivo vive en la carpeta correcta.
- [x] `docs/tasks/README.md` sincronizado.
- [x] `Handoff.md` actualizado (el primer nodo agéntico de autoría, aprendizajes del mapeo dim→rung).
- [x] `changelog.md` actualizado (cambio de comportamiento: el Studio ahora puede autorar la lámina de diagnóstico).
- [x] Chequeo de impacto cruzado (tasks del Studio: 1391/1392/1393/1399/1412/1413/1414).
- [x] Delta en `GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md`: el nodo chapter-author de §5-ter, materializado para diagnóstico.
- [x] Follow-up creado: governed action Nexa + tool MCP del chapter-author (Full API Parity).

## Follow-ups

- **Governed action Nexa + tool MCP** del chapter-author (la 3ª y 4ª pata de parity — esta task deja el primitive).
- **Un chapter-author PRODUCTIVO por línea de servicio**, sobre los rieles probados acá (una task por author, cada uno con su fuente): creativo (brief/key visual), social media, web/CRM, HubSpot, contenido/editorial, económica (desde el cotizador `quote.simulate`), squad/equipo (desde el squad blueprint). El motor es el mismo; cambia el `deriveFacts`.
- **El orquestador y el verifier** (los otros 2 nodos de §5-ter).
- **La F1 canónica del arch doc** (análisis/admisibilidad del RFP) — task aparte.
- Evaluar crear un **EPIC dedicado** al Tender Proposal Studio (hoy no existe; próximo id `EPIC-029`) que agrupe 1391/1392/1393/1399/1412/1413/1414/1415 y los follow-ups.

## Open Questions

- 🟢 **Primer author de prueba (decisión del operador):** diagnóstico (SEO/AEO) se eligió por tener el contrato más limpio para probar el motor — **NO** porque AEO sea el foco. ¿Confirmás diagnóstico como primera implementación completa, o preferís que la primera sea un author **servicio-transversal** (equipo/squad o económica, que aplica a TODAS las líneas)? El deliverable —el motor agnóstico— es el mismo en cualquier caso; sólo cambia cuál `deriveFacts` se construye primero.
- **El segundo author de prueba (Slice 3):** ¿de qué otro servicio? (equipo/credenciales es el más barato de stubear y el más transversal — no lee el Grader, prueba el agnosticismo limpio.)
- **Capability:** ¿reusar `commercial.proposal.manage` o crear `commercial.proposal.author`? (Si se crea, grant + coverage test mismo PR.) — resolver en Discovery.
- **Mapeo dim/readiness → 5 peldaños Be-X:** `[verificar]` la correspondencia exacta con el equipo del Grader (el golden a mano podría tener el mapeo implícito y no documentado).
- **Nomenclatura de fases:** esta task es el nodo chapter-author de §5-ter, NO la "F1" del §9. Confirmar que el rótulo conversacional "F1" no se filtre al código/docs como si fuera la fase del arch doc.
- **EPIC:** el Studio no tiene EPIC dedicado hoy. ¿Crear `EPIC-029` o seguir anclando contextualmente a EPIC-027? — decisión del operador.
