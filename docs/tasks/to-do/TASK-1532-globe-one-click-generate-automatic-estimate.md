# TASK-1532 — Globe One-Click Generate with Automatic Credit Estimate

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1532-globe-one-click-generate.md`
- Flow: `docs/ui/flows/TASK-1552-globe-producer-composer-focused-creation-flow.md`
- Motion: `docs/ui/motion/TASK-1552-globe-producer-composer-focused-creation-motion.md`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Diseño listo; runtime exige dos acciones manuales para una sola intención`
- Rank: `TBD`
- Domain: `creative|ui|credits`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

> **Flow y Motion son COMPARTIDOS con `TASK-1552`, a propósito.** El flujo del gasto es UNO
> (`prompt → estimado → prepare → execute`) y el estimado atenuado vive dentro del composer; dos contratos del
> mismo flujo se separarían, y el que derive sería el que cotiza distinto de como corre.

## Delta 2026-07-25 — el modelo de vigencia del estimado YA ESTÁ CONSTRUIDO (venía de TASK-1564, retirada)

Se creó `TASK-1564` sin ver que esta task ya era la dueña de "el sistema precalcula estimates y al pulsar el CTA
revalida estimate, policy y saldo". **`TASK-1564` queda retirada** y su Slice 1 pertenece acá:

**Entregado** (`efeonce-globe`, commit `feffd47`): `apps/studio-client/src/data/composer-recipe.ts` + **17 tests**.

**La compuerta la da el CONTRATO, no contabilidad del cliente.** `LabEstimatePreviewV1` trae **`approvalToken`**
—el contrato lo describe como *"Opaque, short-lived server approval binding the previewed commercial quote"*— y
`ExecuteExperimentPayloadV1` lo consume. **El token ES la cotización:** el cliente no puede ejecutar un precio que
no mostró, porque lo único que puede mandar es el token que recibió con ese precio. Esto reemplaza cualquier
bookkeeping de "¿cambió algún campo?".

**Dos ejes de vigencia observables por el cliente, no tres:**

| Eje | Quién lo detecta | Cómo |
|---|---|---|
| la forma cambió | cliente | `recipeKey` del estimado ≠ el de la recipe en pantalla |
| pasó el tiempo | cliente | `estimateExpiresAt` |
| cambió la tarifa | **servidor** | el `approvalToken` deja de valer; `rateCatalogVersion` vive en `CreditEstimateV1`, que es interno, y la proyección client-safe **no** lo expone |

**Decisiones que los tests fijan:** el **prompt no entra** en `recipeKey` (si entrara, el estimado se invalidaría
con cada tecla y el botón quedaría deshabilitado mientras alguien escribe; y cambiar las palabras no cambia el
costo) pero **sí** se exige para ejecutar; la clave se arma con orden explícito de campos, no `JSON.stringify`
(que depende del orden de inserción); un vencimiento **ilegible se trata como vencido** —ante la duda sobre plata
no se gasta—; un estimado stale **se conserva** para mostrarlo atenuado, porque un riel en blanco se lee como "no
cuesta nada".

**Investigación de producto para el riel** (Higgsfield · Freepik/Magnific · Adobe/Photoroom/PixAI): el costo va
**en el botón** (patrón Higgsfield) además del riel, porque son dos preguntas — *"¿cuánto me queda?"* vs *"¿cuánto
cuesta esto?"*. Y la queja #1 de la industria no es el precio: es que **se cobra al apretar y la devolución no es
instantánea**. Globe **retiene** (`held → settled | released`), así que el `Disp./Reserv./Gastado` del prototipo
**es el mecanismo anti-sorpresa** y colapsarlo en un número tiraría la ventaja.

## Summary

Eliminar el botón manual `Calcular costo` del Producer y convertir `Generar` en una intención única. El sistema
precalcula estimates en background cuando puede y, al pulsar el CTA, resuelve/revalida estimate, policy, saldo y
fingerprint antes de preparar la generación. El usuario no ejecuta dos pasos técnicos, pero nunca pierde
transparencia ni protección contra gasto inesperado.

## Why This Task Exists

TASK-1505 conectó correctamente el estimate server-side y bloqueó Generate hasta que fuese vigente, pero materializó
el gate como dos botones consecutivos. Eso expone una operación interna como tarea del usuario, agrega fricción y
se vuelve especialmente engorroso cada vez que prompt, negative constraint, route, shape o seed invalidan el cálculo.
TASK-1505 está sobrecargada e in-progress; este slice tiene ownership, verificación y cierre independientes.

## Goal

- Un solo CTA primario para generar.
- Estimate automático, visible y server-authoritative.
- Un clic continúa estimate→validate→prepare sin doble spend ni retry ciego.
- Confirmación adicional sólo ante policy/costo material, no para cada run.
- Latencia, insuficiencia, stale state y unknown outcome tienen recovery honesto.
- Una propuesta aceptada por TASK-1531 invalida el estimate anterior y dispara uno nuevo sin acción manual.
- Cambiar formato, estrategia de adaptación, preservación, cámara, receta o asset padre invalida el estimate
  cuando cambia la operación económica; una adaptación no se trata como una generación nativa.
- El sistema absorbe la ceremonia técnica de calcular; el operador conserva costo visible y la decisión de gastar.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- Reusar `client.estimate(payload)`, `buildPayload()`, signature, spend fence y commands existentes.
- Estimate no consume créditos y nunca se calcula autoritativamente en browser.
- Prepare vuelve a validar route/catalog, estimate, saldo, hard cap y trusted context.
- Un timeout de cliente reconcilia estado antes de repetir un command con gasto.
- No ampliar TASK-1505 ni reimplementar su Producer surface.

## Normative Docs

- `.codex/skills/greenhouse-globe/SKILL.md`
- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/ui/wireframes/TASK-1532-globe-one-click-generate.md`

## Dependencies & Impact

### Depends on

- `TASK-1502` — estimate server-authoritative existente.
- `TASK-1505` — composer/generate baseline y wiring actual.
- `TASK-1519` — BFF humano y trusted commands.
- `TASK-1530` — contrato del Creative Prompt Engineer y outcome versionado.
- `TASK-1531` — aceptación humana de la propuesta y actualización gobernada del composer.

### Files owned

- `../efeonce-globe/apps/studio-web/src/producer-controller.ts`
- `../efeonce-globe/apps/studio-web/src/producer-ui.ts`
- `../efeonce-globe/apps/studio-web/src/producer-copy.ts`
- `../efeonce-globe/apps/studio-web/src/producer-client.ts`
- tests focales y `producer-gvc-fixture.mjs`

## Current Repo State

### Already exists

- `requestEstimate()`, `estimateIsCurrent()`, payload signature y estimate server-side.
- Botones `Calcular costo` y `Generar`; Generate se deshabilita sin estimate vigente.
- Invalidation por prompt, negative constraint, seed, shape, route y referencias.
- Spend fence, idempotency, budget y hard cap gobernados.

### Gap

- El usuario debe pulsar dos acciones para una intención.
- Cada invalidación repite la ceremonia manual.
- El CTA principal queda disabled por estado técnico recuperable.
- No hay single-flight/debounce explícito para estimate background ni secuencia atómica desde click.
- Falta policy visible para diferencia material de costo y timeout/unknown outcome.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/apps/studio-web Producer execution block`
- Future candidate home: `portal`
- Boundary: `server estimate + governed prepare command; Producer UI is consumer`
- Server/browser split: `browser schedules/caches presentation estimate by fingerprint; server owns price, policy, balance, idempotency and spend`
- Build impact: `Studio Web controller/UI/copy/tests/GVC; no dependency or migration`
- Extraction blocker: `same-origin session, composer payload, capability manifest, spend fence and durable run lifecycle`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario: operador creativo listo para generar.
- Momento: composición válida antes del run.
- Resultado: un clic con costo transparente.
- Fricción: acción duplicada y recálculo manual después de cada cambio.
- No-goals: ocultar costo, auto-run durante edición o eliminar safety gates.

### Surface & system decision

- Surface: `/producer`, execution block.
- Composition Shell: no aplica; cambio local.
- Primitive decision: `extend` — existing generate action.
- Adaptive density: aplica a copy/costo en 390 px.
- Floating/Dialog: ninguno por defecto; confirmación sólo si policy existente la exige.
- Copy: `producer-copy.ts`.
- Access: sin cambio.

### State inventory

- Default: Generate habilitado cuando payload es válido.
- Loading: estimating→preparing→running en el mismo CTA.
- Empty/invalid: disabled con causa.
- Error: canonical + retry/reconcile.
- Partial: estimate no disponible; click intenta resolver.
- Permission: capability denial.
- Long content/mobile: copy wrap, 44 px, no overflow.
- Keyboard/focus: foco permanece en CTA.
- Reduced motion: estados textuales inmediatos.

### Interaction contract

- Primary: único click Generate.
- Pending/disabled: single-flight; doble click no duplica command.
- Focus: estable.
- Latency: debounce background + click-through estimate.
- Alert: diferencia material/insuficiencia bloquea antes del spend.

### Motion & microinteractions

- Motion primitive: none; se reutiliza feedback de estado existente.
- Enter/exit/layout/stagger: none.
- Timing: debounce técnico, no animación.
- Reduced-motion: n/a, texto conserva significado.
- Non-goal: progreso inventado.

### Implementation mapping

- Surface: `producer-controller.ts` + execution block.
- Primitive: existing generate button.
- Components: controller/UI/copy/client.
- Commands: existing estimate + prepare/generate.
- API parity: server-authoritative.
- Access: unchanged.
- States: wireframe inventory.

### GVC scenario plan

- Scenario: `producer-gvc-fixture.mjs`.
- Route: `/producer?gvc=task-1532-one-click-generate`.
- Viewports: `1440×1000`, `390×844`.
- Quality profile: `premium`
- Steps/captures/markers/assertions: wireframe.
- Scroll-width: equality.
- Reduced-motion/focus: focus and textual states.
- Review dossier: required.
- Baseline surface ID: `globe.creative-producer-surface`.

### Design decision log

- Decision: single CTA + automatic background/on-click estimate.
- Alternatives: two buttons, Generate disabled while stale, hidden cost.
- Why: matches user intent while maintaining safety.
- Reuse/extend/new: extend.
- Risks: storms, races, stale cost, duplicate spend.

### Visual verification

- GVC: task-1532.
- Viewports: 1440/390.
- Captures: all cost/execution states.
- Markers: wireframe.
- Scroll-width/a11y/focus: required.
- Before/after: two-button vs single CTA.
- Known debt: none accepted.
- Scorecard: `docs/ui/reviews/TASK-1532-globe-one-click-generate.scorecard.json`.
- Threshold: `average >= 4.5; floor >= 4; hierarchy/surface economy/fidelity >= 4.5`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth: existing estimate/prepare/spend contracts.
- Consumidores: Producer UI/BFF/API.
- Runtime: internal Cloud Run web/API.

### Contract surface

- Existing: estimate reader/path and prepare command.
- Modified: orchestration only; additive policy metadata only if already representable.
- Compatibility: compatible.
- Full API parity: no UI-side price/spend logic.

### Data model and invariants

- DB/migration: none.
- Estimate binds payload fingerprint, route/catalog revision and expiry.
- El fingerprint incluye el prompt o structured brief aceptado, su proposal revision cuando aplique, route/catalog,
  modalidad/operación, output shape/count, referencias, estilo/preset, seed y negative constraint.
- Prepare revalidates estimate and balance before reservation.
- Tenant: trusted context.
- Idempotency: one user intent, stable key, no duplicate reservation.
- Audit/history: existing run/spend evidence.

### Migration, backfill and rollout

- Migration/backfill: none.
- Default: gated UI revision.
- Rollback: restore manual estimate button without data change.
- Coordination: compatible Studio/API deploy and human canary.

### Security and access

- Session→BFF→IAM API→capability.
- No sensitive data added.
- Canonical errors only.
- Hard caps, quota, replay guard and circuit remain authoritative.

### Runtime evidence

- Controller race/dedupe/fingerprint tests.
- BFF canary current/stale/missing estimate.
- Audit/spend readback proves one reservation.
- Signals: estimate latency/failure, cost-changed, insufficient and prepare outcome.

### Capability Definition of Done — Full API Parity

- [ ] Estimate/prepare semantics remain server-side.
- [ ] UI does not create endpoint, balance cache or click-handler business rule.
- [ ] Idempotency/audit/error contracts remain shared across consumers.

## Hybrid Execution Justification

- Why not split: estimate and prepare capabilities already exist; the change is a small reversible orchestration
  and presentation slice with no schema/API foundation.
- Primary execution profile: `ui-ux`.
- Contract boundary: existing estimate + prepare command.
- Risk controls: fingerprint, single-flight, server revalidation, spend readback, GVC and instant UI rollback.

<!-- ZONE 2 — se completa al tomar la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Automatic estimate scheduler

- Debounce 400–600 ms after valid payload changes; one in-flight request per fingerprint.
- Ignore stale responses; cache only current server estimate.
- Escuchar el outcome aceptado de TASK-1531 como un cambio canónico del composer: invalidar primero y estimar
  sólo el brief aceptado/estable, nunca propuestas parciales mientras el agente está trabajando.

### Slice 2 — One-click orchestration

- Remove manual estimate action.
- On Generate: reuse current estimate or obtain it, validate policy/saldo, then prepare with one stable intent key.
- Keep CTA state/focus honest through estimating/preparing/running.

### Slice 3 — Safety and recovery

- Cost change beyond server policy, insufficient credits, denial, timeout and unknown outcome stop/reconcile safely.
- No blind retry, duplicate reservation or hidden charge.

### Slice 4 — Evidence and rollout

- Tests, GVC desktop/mobile, authenticated canary and spend/audit readback.
- Rollback to two-button UI without data mutation if signals regress.

## Out of Scope

- Pricing, credit ledger or hard-cap redesign.
- Changing provider costs or route catalog.
- Lógica, profiles, evals o UI del Creative Prompt Engineer/Studio (TASK-1530/1531); sólo se integra su outcome
  aceptado mediante el contrato gobernado.
- Auto-generating without a user click.

## Detailed Spec

Generate is enabled whenever the payload is valid and access permits it. Background estimate improves feedback but
is not a prerequisite for clicking. The click creates one intent context; it resolves or reuses a fingerprint-bound
estimate and proceeds only if server validation succeeds. A materially changed cost requires policy-defined
confirmation; normal estimates continue without a second user action.

El handoff Creative Prompt es explícito: TASK-1530 produce una propuesta versionada; TASK-1531 la mantiene separada
del source hasta `accept`; sólo ese `accept` actualiza el structured brief canónico, invalida estimate/signature y
habilita un nuevo cálculo. Pending, preview, reject y warnings sin aceptar no disparan estimate. Esto evita costo
parpadeante, requests inútiles y una carrera entre el texto original y la propuesta del agente.

## Rollout Plan & Risk Matrix

| Risk | Mitigation | Evidence |
|---|---|---|
| Request storm | debounce + fingerprint cache + single-flight | request-count test |
| Stale quote | epoch/fingerprint + prepare revalidation | race test |
| Double spend | stable key + disabled pending + spend fence | concurrent readback |
| Timeout retry | reconcile before retry | unknown-outcome test |
| Hidden cost | visible estimate + material-change stop | GVC/canary |

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Existe exactamente un CTA primario; no aparece `Calcular costo`.
- [ ] Eliminar la ceremonia manual no oculta estimate, cambio material, saldo insuficiente ni autoridad de gasto.
- [ ] Generate permanece accionable con payload válido aunque estimate esté stale/missing.
- [ ] Background estimate usa debounce, single-flight y stale-response protection.
- [ ] Pending/preview/reject de TASK-1531 no disparan estimates; `accept` invalida el anterior y calcula exactamente
  para el structured brief aceptado.
- [ ] El fingerprint cubre brief/proposal revision, route/catalog, modalidad/operación, output, referencias,
  estilo, seed y negative constraint.
- [ ] Native generation, preserve-source, adapt-existing, regional-edit y Format Set producen fingerprints y
      estimates distinguibles; la UI no suma créditos localmente ni reutiliza un estimate de otra operación.
- [ ] Un click resuelve estimate→validate→prepare sin segunda acción normal.
- [ ] Costo vigente es visible y diferencia material detiene antes del spend.
- [ ] Doble click/timeout/retry no duplican reserva ni run.
- [ ] Invalid, insufficient, denied, error y unknown outcome tienen recovery.
- [ ] Copy centralizado, teclado/foco/live state y mobile 390 pasan.
- [ ] `scrollWidth === clientWidth`.
- [ ] Wireframe/readiness/task/ops lint pasan sin findings.
- [ ] GVC premium y canario real prueban un solo CTA y spend único.
- [ ] Globe `pnpm check && pnpm build` pasan con tests registrados.

### Criterios migrados de TASK-1564 (retirada)

- [ ] **`UI ready` bajó de `yes` a `no` a propósito.** Un CTA que **gasta plata** no puede declararse listo con
      `Motion: none` y `Flow: none`: el estado atenuado del estimado es información sobre gasto, no decoración, y
      el flujo `prepare → execute` tiene cuatro compuertas. Sube a `yes` cuando los dos contratos estén completos.
- [ ] La atenuación del estimado **NO se apaga** bajo `prefers-reduced-motion`: la transición se acorta, el estado
      atenuado se conserva. El portador redundante es el texto (`estimateStale`), y **los dos** se mantienen.
- [ ] El contraste del estimado atenuado se mide con **muestreo de píxeles**, no con axe: el fondo es un
      gradiente y axe reporta `incomplete`, no `pass`. Se registra el valor medido.
- [ ] La invalidación es **sincrónica** con el cambio de campo, **antes** del debounce.
- [ ] `withinHardCap: false` se preserva tal cual — es información (supera el tope), y un truthy-check la perdería.

## Verification

- `pnpm task:lint --task TASK-1532`
- `pnpm ui:wireframe-check --task TASK-1532`
- `pnpm ui:readiness-check --task TASK-1532`
- `cd ../efeonce-globe && pnpm check && pnpm build`
- GVC `1440×1000` + `390×844`
- authenticated BFF canary + audit/spend readback

## Closing Protocol

- [ ] Lifecycle/ruta/README/registry sincronizados.
- [ ] Handoff/runtime handoff/changelog reflejan rollout real.
- [ ] Impact check TASK-1502, TASK-1505 y TASK-1519.
- [ ] Impact check TASK-1530 y TASK-1531 confirma el handoff accept→invalidate→estimate sin ownership duplicado.
- [ ] QA/UI review/docs closure ejecutados.

## Follow-ups

- Evaluar confirmación por umbral sólo con datos de costo, no por defecto.

## Open Questions

- Ninguna load-bearing; el server conserva autoridad sobre tolerancia de cambio material.
