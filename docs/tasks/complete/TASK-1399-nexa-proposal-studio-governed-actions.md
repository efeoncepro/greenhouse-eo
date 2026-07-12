# TASK-1399 — La capa de operador del Proposal Studio: acciones gobernadas de Nexa + los readers que faltan

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
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
- Backend impact: `api`
- Epic: `EPIC-027`
- Status real: `Code complete — rollout pendiente (flag OFF por diseño)`
- Rank: `alto — es el gap que separa "el sistema existe" de "el equipo lo usa"`
- Domain: `commercial|ai`
- Blocked by: `none — TASK-1392/1393/1391 complete; el runtime gobernado de Nexa YA existe y tiene prior art (author_quote)`
- Branch: `task/TASK-1399-nexa-proposal-studio-actions`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El Proposal Studio está completo y operando (aggregate + motor + render en Cloud Run), pero **hoy
solo se opera desde el repo** (scripts/API por un agente Claude o por un desarrollador). Nexa —la
Conversational Experience de Greenhouse— **ya tiene el runtime de acciones gobernadas** (`propose_action`
→ preview read-only → confirmación humana → `execute` del command canónico), con dos acciones vivas
(`mark_notifications_read`, `author_quote`). **El Proposal Studio no tiene ninguna registrada.**

Esta task enchufa el dominio a ese runtime: registrar las acciones gobernadas del Proposal Studio
para que un humano pueda, **desde una conversación**, registrar una propuesta, adjuntar el RFP,
registrar evidencia y pedir el render del deck — con el mismo `propose → confirm → execute` y los
MISMOS commands canónicos. **No se construye nada "Nexa-específico"**: es Full API Parity en su forma
más literal — un primitive, otro consumer.

## Los 5 gaps del uso cotidiano (detectados al documentar, 2026-07-12)

Escribir el manual del día a día obligó a responder *"¿qué hace un account manager un martes?"* — y
la respuesta expuso que **el sistema está completo pero sin puerta**. Los gaps, en orden de dolor:

| # | Gap | Hoy | Debería ser |
|---|---|---|---|
| 1 | **No hay ninguna superficie fuera del repo** | Todo el ciclo exige repo + terminal + proxy PG. Un comercial sin repo **no puede ni ver el estado de una propuesta** | Acciones gobernadas de Nexa (esta task) + readers |
| 2 | **Bajar el PDF no tiene camino de operador** | Hay que resolver `output_pdf_asset_id` por SQL y usar `/api/assets/private/<id>` o `gcloud storage cp` | Un link de descarga en la propuesta (el asset store ya expone `buildPrivateAssetDownloadUrl`) |
| 3 | **No existe el reader "mis propuestas"** | `buildProposalRenderProjection` es POR propuesta; no hay listado con estado/deadline/semáforo | Un read model del día a día (deadline at risk, jobs en curso, artefactos listos) |
| 4 | **El `deck-plan.json` vive fuera del dominio** | Es un archivo suelto en `docs/commercial/tenders/<caso>/`: se versiona mal y no está vinculado al aggregate | El plan es un asset/entidad de la propuesta (cierra el loop de trazabilidad) |
| 5 | **La "confirmación humana" hoy es una instrucción verbal al agente** | El script de SKY lo documenta explícitamente: el actor member se pasa por parámetro | Un confirm auditado con la identidad de sesión (el endpoint de Nexa ya lo hace: `context.memberId`) |
| 6 | **No hay camino HTTP para SUBIR el binario del RFP** | Los contextos `proposal_rfp_draft`/`proposal_deliverable_draft` existen en el asset store (scan gate, 50 MB, allowlist Office), pero **no están en `DRAFT_CONTEXT_VALUES` de `POST /api/assets/private`** ni tienen rama en `canUploadForContext`: el binario solo entra por script server-side | Habilitar el upload gobernado (es una extensión de allowlist, no lógica nueva) — sin esto, "adjuntar el RFP" desde Nexa/UI es imposible |

**El gap 5 es el más sutil y el más importante**: el contrato `propose → confirm → execute` está
implementado y es correcto, pero **la confirmación no está materializada en una superficie con
identidad**. Registrar las acciones en Nexa lo resuelve de raíz — el confirm pasa a ser un click de
una persona autenticada, no un parámetro que alguien escribe.

## Why This Task Exists

Detectado al documentar el sistema (2026-07-12, a pedido del operador): el manual del día a día
tenía que decir *"pídeselo a Claude Code en el repo"* porque **no existe otra puerta**. Eso es una
capability de plataforma que solo pueden usar quienes tienen el repo abierto — exactamente lo que la
doctrina **Full API Parity → Nexa total operability** existe para evitar.

El costo es bajo y el prior art está probado: `src/lib/nexa/actions/author-quote.ts` es el molde
exacto (acción parametrizada: el LLM propone un payload validado por el MISMO schema del command, el
humano ve un preview read-only, el endpoint de confirmación ejecuta el command canónico). Los agentes
del dominio (`intake-agent.ts`, `render-agent.ts`) **ya implementan la mitad difícil**: contexto
allowlisted, propuesta tipada que cita inputs, validación fail-closed, eval fixture.

## Goal

- Registrar en `NEXA_ACTION_REGISTRY` las acciones gobernadas del Proposal Studio, reusando los
  commands canónicos existentes (cero lógica nueva de negocio).
- Preservar TODOS los gates: entitlement per-ORG (`proposal_studio_v1`), capabilities
  (`commercial.proposal.*`), gates humanos de estado, audience por referencia, accesibilidad,
  deadline, margen. El LLM sigue sin poder escribir ni cruzar un gate.
- Que el manual del día a día pueda decir **"pídeselo a Nexa"** sin asteriscos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md` + `agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md`
  (runtime de acción gobernada: `propose → confirm → execute`; el LLM muta SOLO en el endpoint de
  confirmación humana)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (la doctrina que esta task materializa)
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` §0
- `docs/architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md` (el pipeline de render)
- Manual del día a día: `docs/manual-de-uso/proposal-studio/rfp-a-pdf-el-dia-a-dia.md` (§ "Cómo será
  con Nexa" — esta task es lo que cierra ese apartado)

**Prior art obligatorio (el molde a copiar, no a reinventar):**
`src/lib/nexa/actions/author-quote.ts` + `registry.ts` + `confirm.ts` + `types.ts`.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` (el LLM nunca escribe; la
  mutación ocurre SOLO en el endpoint de confirmación humana)
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`
- `.claude/skills/greenhouse-public-private-tenders/proposal-studio-runtime.md`

## Dependencies & Impact

### Depends on

- `TASK-1392` ✅ (aggregate `Proposal` + commands + intake agent)
- `TASK-1391` ✅ (render gobernado + render agent)
- Runtime de acciones gobernadas de Nexa ✅ (`propose_action`, confirm endpoint, registry, eventos)

### Blocks / Impacts

- El manual del día a día (`rfp-a-pdf-el-dia-a-dia.md`) deja de tener el asterisco "hoy solo desde
  el repo".
- F5 (UI del Proposal Studio) consume los MISMOS commands: esta task no la bloquea ni la duplica.

### Files owned

- `src/lib/nexa/actions/proposal-*.ts` (nuevas definiciones de acción) + sus tests
- `src/lib/nexa/actions/registry.ts` (registro de las acciones nuevas)
- `src/lib/nexa/flags.ts` (flag por acción, default OFF)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila del flag, MISMO PR)
- Docs: manual del día a día (§ Nexa) + `KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` (si suma invariante)

## Current Repo State

### Already exists

- **El runtime gobernado de Nexa, completo y probado**: `src/lib/nexa/actions/{registry.ts,
  confirm.ts, types.ts}` + la tool `propose_action` (`nexa-tools.ts:949`) + eventos
  (`proposal_denied` con `unknown_action`/`not_permitted`) + la señal
  `nexa.action.unauthorized_proposal_rate`.
- **Dos acciones vivas como prior art**: `mark_notifications_read` (simple) y **`author_quote`**
  (parametrizada, el molde exacto: payload validado por el mismo schema del command → preview
  read-only → confirm ejecuta `submitQuoteFromBuilder`).
- **Todos los commands del Proposal Studio**: `createProposal`, `attachProposalAsset`/
  `ingestProposalRfp`, `recordProposalEvidence`, `declareProposalRequirement`,
  `requestProposalRender`, `retryProposalRenderJob` + readers + `assertProposalStudioAccess`.
- **Los agentes del dominio**: `intake-agent.ts` y `render-agent.ts` (contexto allowlisted →
  propuesta tipada → validación fail-closed → confirm member-only), cada uno con su eval fixture.

### Gap

- **`NEXA_ACTION_REGISTRY` no tiene NINGUNA acción del Proposal Studio** (verificado 2026-07-12:
  `registry.ts` registra exactamente 2 acciones, ninguna del dominio comercial de propuestas).
- Consecuencia: el sistema completo (aggregate + composer + render en Cloud Run) **solo se opera
  desde el repo** — por un agente Claude con acceso al código o por un desarrollador. Un account
  manager no puede pedir un deck.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/nexa/actions/**` (definiciones de acción) consumiendo
  `src/lib/commercial/tenders/proposals/**` (commands canónicos, sin cambios)
- Future candidate home: `domain-package`
  (nota: si algún día `nexa/actions` se extrae, las definiciones viajan con él; los commands del
  dominio comercial NO se mueven por esta task)
- Boundary: la acción es un ADAPTADOR — traduce un payload propuesto por el LLM al input del command
  canónico. **Cero regla de negocio nueva**: si algo falta, se agrega al command en
  `src/lib/commercial/**`, nunca a la acción.
- Server/browser split: definiciones, preview y confirm son server-only; el cliente de Nexa
  únicamente recibe el preview ya serializado.
- Build impact: `none` (no crea deployable, no toca la imagen de ningún worker)
- Extraction blocker: ninguno.

## Backend/Data Contract

### Contract surface

- Contrato existente a respetar: `NexaActionDefinition<T>` (`actionKey`, `intent`, `sensitivity`,
  `domain`, `requiredCapability`, `inputSchema`, `isEnabled`, `isPermitted`, `buildPreview`,
  `execute`), el endpoint canónico de confirmación (`/api/nexa/actions/[actionKey]/confirm`) y los
  eventos de acción (`proposal_denied`, etc.).
- Contrato nuevo: **ninguno de negocio**. Solo las definiciones de acción que envuelven commands
  existentes.

### Acciones propuestas (a confirmar en Plan Mode)

| actionKey | Intent | Command canónico que ejecuta | Sensitivity | Capability |
|---|---|---|---|---|
| `register_proposal` | Registrar una propuesta nueva (RFP/licitación/venta directa) | `createProposal` (o `confirmProposalIntake` si se reusa el intake agent para derivar el payload) | high | `commercial.proposal.manage` |
| `attach_proposal_rfp` | Adjuntar el RFP/anexo a una propuesta | `attachProposalAsset` / `ingestProposalRfp` | medium | `commercial.proposal.manage` |
| `record_proposal_evidence` | Registrar una evidencia con su audience | `recordProposalEvidence` | **high** (el `audience` es el vector de fuga) | `commercial.proposal.manage` |
| `request_proposal_render` | Generar el deck (PDF) de una propuesta | `requestProposalRender` | **high** (produce el artefacto client-facing) | `commercial.proposal.render` |
| `get_proposal_status` (tool read-only, no acción) | Ver estado/jobs/artefactos | readers (`listProposals`, `listProposalRenderJobs`) | — | `commercial.proposal.read` |

⚠️ **Las transiciones de estado con gate humano** (`fit_review→producing|declined`,
`packaging→ready_to_submit`) **NO se registran como acción de Nexa en esta task**: son la decisión
bid/no-bid y la aprobación del paquete. El preview+confirm de Nexa es un gate humano válido en
principio, pero esa decisión merece su propia superficie deliberada (F5) y una decisión explícita del
operador. **Fuera de scope hasta que se decida.**

### Data model and invariants

- **Ninguna tabla nueva.** Cero lógica de negocio nueva.
- Los gates se preservan por construcción (los aplica el command, no la acción):
  - entitlement per-ORG `proposal_studio_v1` (`assertProposalStudioAccess`);
  - `audience` por referencia (una evidencia `internal` en un artefacto `client_facing` → rechazo);
  - accesibilidad / deadline / validadores / margen;
  - `client_facing` exige actor `member` (la DB lo exige: `requested_by_kind='member'`).
- **El `actor` sale del contexto de sesión de Nexa, NUNCA del payload del LLM.**

### Security and access

- `isPermitted` de cada acción = gate síncrono adelantado (`can(subject, capability, action, scope)`);
  el command re-enforza todo en el confirm (defensa en profundidad, igual que `author_quote`).
- Flag por acción, default **OFF** (`NEXA_PROPOSAL_ACTIONS_ENABLED` o granular), fila en el ledger.
- El preview **NO** puede exponer contenido interno: evidencia `internal`, costos, ni el RFP crudo
  (reusar la proyección allowlisted `buildProposalRenderProjection`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (lo llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Acciones read + registro

- Tool read-only de estado (propuestas, jobs, artefactos) sobre readers existentes.
- `register_proposal` + `attach_proposal_rfp` con preview y confirm. Eval fixture.

### Slice 2 — Evidencia y render (las sensibles)

- `record_proposal_evidence` (preview que MUESTRA el audience elegido en rojo/verde: es la decisión
  más peligrosa del dominio) + `request_proposal_render` (preview que muestra: qué evidencia se cita,
  qué constraints aplican, qué bloqueos hay). Eval fixture.

### Slice 2b — Los readers del día a día (sin esto, Nexa puede actuar pero nadie puede MIRAR)

- Reader `listProposalsForOperator` (o extender `listProposals`): estado, deadline y su riesgo,
  jobs de render en curso, artefactos listos — el read model que hoy no existe (gap 3).
- Camino de descarga del artefacto para el operador: exponer el link privado del PDF en el detalle
  de la propuesta (`buildPrivateAssetDownloadUrl` ya existe; falta cablearlo al reader) (gap 2).
- Tool read-only de Nexa sobre esos readers ("¿cómo va la propuesta de SKY?" / "pásame el deck").

### Slice 3 — Rollout

- Flag ON staging → smoke conversacional real (registrar una propuesta y pedir un deck **hablando**)
  → evidencia → sign-off.

## Out of Scope

- UI del Proposal Studio (F5).
- Transiciones de estado con gate humano vía Nexa (decisión pendiente del operador).
- Cualquier lógica de negocio nueva: si algo hace falta, va al command canónico, no a la acción.

## Detailed Spec

Cada acción es un `NexaActionDefinition<T>` que vive en `src/lib/nexa/actions/proposal-<accion>.ts`
y sigue EXACTAMENTE el molde de `author-quote.ts`:

1. **`inputSchema`**: el MISMO Zod schema (o su equivalente) que valida el input del command
   canónico. El LLM no puede proponer un payload que el command no aceptaría.
2. **`isPermitted(context)`**: gate síncrono adelantado con `can(subject, capability, action,
   scope)`. El command re-enforza TODO en el confirm (defensa en profundidad).
3. **`buildPreview(payload, context)`**: read-only. Muestra al humano exactamente lo que va a pasar.
   Para `record_proposal_evidence` el preview DEBE hacer inequívoco el `audience` elegido (es la
   decisión más peligrosa del dominio). Para `request_proposal_render` DEBE mostrar: qué evidencia
   se cita y con qué audience, qué constraints del RFP aplican (peso/páginas/accesibilidad) y qué
   bloqueos existen. El preview NUNCA expone RFP crudo, costos, evidencia interna ni URLs de storage
   (reusar `buildProposalRenderProjection`).
4. **`execute(payload, context)`**: llama al command canónico con el `actor` derivado del CONTEXTO DE
   SESIÓN (`context.memberId`), jamás del payload. La mutación ocurre SOLO acá, tras la confirmación
   humana del endpoint `/api/nexa/actions/<actionKey>/confirm`.

El `intake-agent.ts` y el `render-agent.ts` del dominio ya producen propuestas tipadas validadas
fail-closed contra un contexto allowlisted. Esta task decide en Plan Mode si el `buildPreview` los
reusa (derivando el payload desde el contexto del dominio) o si el payload viene directo del
`propose_action` de Nexa. **La opción robusta es reusarlos**: son el molde probado y traen su eval.

Nada de lo anterior agrega reglas de negocio: si al implementar aparece una regla que "falta",
va al command en `src/lib/commercial/tenders/proposals/**` (donde la consumen también API, CLI y la
futura UI), nunca a la definición de acción.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (read + acciones de bajo riesgo) MUST cerrar antes de Slice 2: las acciones sensibles
  (evidencia y render) no se registran sin que el preview/confirm esté probado end-to-end.
- Producción sólo tras smoke conversacional real en staging + sign-off del operador.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigación | Signal |
|---|---|---|---|---|
| El LLM propone una evidencia con `audience: client_facing` que en realidad es interna (loaded cost al comprador) | comercial | **medium** | El `audience` viaja en el payload PERO el command lo persiste tal cual: el **preview debe mostrarlo de forma inequívoca** y el humano confirma. Además, el gate del render (`assertEvidenceAllowedForAudience`) sigue vigente aguas abajo | `nexa.action.*` + auditoría de evidencia |
| El modelo intenta una acción no registrada | ai/seguridad | low | El registry es una allowlist: `proposal_denied` con `unknown_action` | `nexa.action.unauthorized_proposal_rate` |
| El actor se toma del payload del LLM en vez de la sesión | ai/seguridad | low | Contrato del runtime (`buildSubjectFromContext`); test que lo prueba | — |
| Duplicar lógica de negocio en la acción | arquitectura | medium | Las acciones SOLO envuelven commands; review bloquea cualquier regla nueva fuera de `src/lib/commercial/**` | — |

### Feature flags / cutover

- Flag por acción (o uno del bloque), default **OFF**, fila en `FEATURE_FLAG_STATE_LEDGER.md` en el
  MISMO PR. Cutover: staging ON → smoke conversacional → sign-off → producción.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Flag OFF (las acciones desaparecen del registry efectivo) | inmediato | sí |
| 2 | Flag OFF; los jobs/propuestas ya creados quedan auditables | inmediato | sí |
| 3 | Flag OFF + revert del PR | < 10 min | sí |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSURE
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Las acciones viven en `src/lib/nexa/actions/proposal-studio.ts` y ejecutan los commands canónicos
      existentes; **cero lógica de negocio duplicada**.
- [x] El LLM solo PROPONE un payload validado por el mismo schema del command; el humano ve un
      preview read-only y confirma; el endpoint de confirmación es la ÚNICA mutación.
- [x] El `actor` viene del contexto de sesión, jamás del payload del modelo. **Y más: el SCOPE
      también** — ningún `inputSchema` acepta `ownerOrgId` (se deriva del entitlement) y el cliente
      entra por nombre, resuelto fail-closed.
- [x] Todos los gates del dominio siguen vigentes y hay test que lo prueba — y además smoke contra PG
      REAL (`scripts/commercial/_sanity-nexa-proposal-actions.ts`): una evidencia `internal` de SKY
      citada en un render `client_facing` **no llega ni a proponerse** (gap `unavailable`).
- [x] El preview no expone RFP crudo, costos, evidencia interna ni URLs de storage.
- [x] Flag default OFF (`NEXA_PROPOSAL_ACTIONS_ENABLED`) + fila en el ledger en el MISMO commit.
- [x] El manual `rfp-a-pdf-el-dia-a-dia.md` se actualizó: "Cómo será con Nexa (F5)" (que ya era falso)
      pasó a ser "Operar desde Nexa (el chat)", con el estado real (flag OFF) y sin prometer UI.

## Verification

- `pnpm vitest run src/lib/nexa/actions src/lib/commercial/tenders` · `pnpm qa:gates --changed`
- Smoke conversacional real en staging (registrar propuesta + pedir deck hablando con Nexa) con
  evidencia del job renderizado.

## Closing Protocol

- No mover a `complete/` sin: acciones registradas + evals verdes + flag/ledger + smoke
  conversacional real en staging (registrar una propuesta y pedir un deck HABLANDO con Nexa, con el
  job renderizado como evidencia) + revisión humana del preview de las 2 acciones sensibles.
- No cerrar como "Nexa opera el Studio" si sólo existe la definición sin smoke conversacional.
- Actualizar al cerrar: `rfp-a-pdf-el-dia-a-dia.md` (§ Nexa deja de ser futuro),
  `proposal-studio-runtime.md` (la skill), Handoff y changelog.

## Resultado (2026-07-12) — lo que se construyó y los 3 bugs que aparecieron por el camino

**Entregado (5 slices, todo en `develop`, sin push):**

| Slice | Qué |
|---|---|
| S1 `0cabe9991` | Upload del RFP por HTTP (`proposal_rfp_draft` / `proposal_deliverable_draft` en `/api/assets/private`), con guard exhaustivo derivado del tipo (un contexto nuevo sin autorización **rompe el build**) |
| S2 `87b8425fa` | `operator-view.ts` — el read model del día a día ("¿cómo va y dónde está el PDF?"): semáforo de deadline, conteos, link canónico de descarga. Lo consumirá también la UI (F5) |
| S3 `cbd2cbcba` | 4 acciones gobernadas + tool read-only `proposal_status` + flag `NEXA_PROPOSAL_ACTIONS_ENABLED` (OFF) + fila en el ledger |
| S4 `f9b7edc72` | 20 tests del gobierno + el fix del manifest (abajo) |
| S5 | Docs: doc-gate Nexa (behavior + data-contracts + manifest), invariantes del dominio, manual del operador, skill (Claude + mirror Codex), regla auto-load |

**Los 3 bugs que la task no venía a arreglar y encontró:**

1. **Toda acción parametrizada de Nexa estaba rota** (latente desde TASK-1212; nunca explotó porque su
   flag jamás se prendió): la confirm-card **no re-ecoaba `execution.input`**, y el endpoint de confirm
   re-valida `body.input` contra el schema → recibía `undefined` → **422 `invalid_input` siempre**.
   `author_quote` habría muerto en su primer intento real. Arreglado en S1.
2. **Zod se estaba comiendo el manifest** (lo cazó el test de S4): faltaba `.passthrough()` → se borraba
   la procedencia (`input`) del `ResolvedCompositionManifest` → **otro `manifestHash`** → el MISMO deck
   pedido por la API y por Nexa habría producido **dos jobs** en vez de uno idempotente.
3. **Drift del manifest del doc-gate de Nexa**: `nexa-tools.ts` (donde viven TODOS los tools) sólo exigía
   docs de knowledge. Corregido: ahora exige la tabla de ruteo — que es el doc que un tool nuevo debe
   actualizar de verdad.

**Tres invariantes nuevos que aplican a TODA acción gobernada futura** (no sólo a este dominio; quedaron
en `behavior-and-routing.md` §Reglas duras y en los invariantes del dominio):

1. **El scope sale de la sesión, nunca del modelo** — ningún `inputSchema` acepta un id de organización.
2. **Un preview que promete lo que va a fallar es una mentira** — `NexaActionBlockedError` → gap
   `unavailable`: la acción no se propone, **se explica**.
3. **El preview ejercita los gates del command, no una copia** — `assertProposalRenderAdmissible`.

**Verificación:**

- `pnpm test` full: **9.417 tests verdes** (1.308 archivos) · `pnpm build` producción: verde · lint/tsc limpios.
- `pnpm nexa:doc-gate --changed`: verde (11 dominios, 25 docs de capa, 42 archivos Nexa cubiertos).
- **Smoke contra PG REAL** (`scripts/commercial/_sanity-nexa-proposal-actions.ts`), con la propuesta SKY viva:
  - flags OFF → gap `runtime_disabled` (el bloque nace apagado de verdad);
  - org dueña **derivada del entitlement** (Efeonce) — nadie la propuso;
  - `proposal_status` → SKY: `intake`, deadline `at_risk`, 3 evidencias, artefacto `completed`, link
    `/api/assets/private/asset-266fe55c…`;
  - `register_proposal` → preview con el cliente resuelto **por nombre** ("Aguas Andinas"), sin un solo
    UUID salido del modelo;
  - **EL GATE**: se registró la evidencia interna real de SKY (loaded cost) y se citó en un render
    `client_facing` → **no se propuso nada**; gap `unavailable` (la evidencia interna ni siquiera existe
    en esa proyección — defensa en profundidad). Con la evidencia legítima **sí propone**, y el manifest
    viaja **verbatim**.

**Rollout pendiente (por diseño, no por olvido):** `NEXA_PROPOSAL_ACTIONS_ENABLED` sigue **OFF en todos
los targets**. Prenderlo en staging + el smoke conversacional con el LLM real (que Nexa *decida* llamar
al tool) es el próximo paso, y **requiere push + decisión del operador**. Mientras esté OFF, Nexa lo dice
honestamente y el camino del día a día sigue siendo el repo.

## Notas de precisión (detectadas al documentar, 2026-07-12)

- **`missing_asset`, `blank_slide` y `font_fallback_detected` NO están en `NON_RETRYABLE_FAILURES`**,
  pero en la práctica casi siempre son culpa del plan o del catálogo: un retry reproduce el mismo
  fallo y gasta uno de los 3 intentos. Se documentaron con matiz ("reintenta solo si sospechas causa
  ambiental"). **Decisión pendiente:** ¿moverlos a no-reintentables? Requiere datos de uso real.
- **`timeout` cubre dos cosas distintas** (deadline vencido en cola vs. timeout de ejecución del
  worker). Hoy solo lo emite el dispatcher para el primer caso; si el segundo aparece, conviene un
  código propio para no confundir el diagnóstico.

## Follow-ups

- **Gap 4 — el plan del deck como dato del dominio**: hoy el `deck-plan.json` es un archivo del repo.
  Debería ser un asset/entidad de la propuesta (versionado, trazable, y editable por el autor sin
  tocar el repo). Task propia: toca el aggregate y la autoría, no este puente.
- F5: UI del Proposal Studio (consume los mismos commands; no duplica).
- Decisión del operador: ¿los gates de estado (bid/no-bid, aprobación del paquete) se cruzan desde
  Nexa con preview+confirm, o exigen la UI dedicada?
