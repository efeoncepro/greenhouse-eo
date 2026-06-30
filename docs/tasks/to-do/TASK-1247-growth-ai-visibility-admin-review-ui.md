# TASK-1247 — Growth AI Visibility: Admin Review UI

## Delta 2026-06-30 — validación multi-skill (product-design + seo-aeo + arch) + 6 ajustes

Revisión con `greenhouse-ux` + `seo-aeo` + `arch-architect`, **verificando el backend real** (no supuestos):

**Validado en código (los supuestos se sostienen → scope UI-pura correcto):**

- Backend de 1244 EXISTE: `src/lib/growth/ai-visibility/review/{commands,queries,state}.ts` + rutas `runs/[runId]/review/{approve,reject}/route.ts` + `reviews/route.ts`.
- Capability `growth.ai_visibility.report.review` **granteada a EFEONCE_ADMIN ∪ AI_TOOLING_ADMIN** (`runtime.ts:234`). El cross-check de grant que esta task marcaba como pendiente **queda RESUELTO** — no hay permission-denied-for-all.
- Guard de conflicto multi-revisor: el state machine deriva del log append-only `grader_report_reviews` (`pending→approved|rejected`); flip terminal (approved↔rejected) → **`invalid_transition`**; gate fuera de `review_required` → **`not_reviewable`** (ambos 409). El guard YA existe.

**Ajustes a incorporar (de la revisión):**

1. **[seo-aeo · load-bearing] El Evidence Ledger es la 2ª capa de defensa contra el falso-0 (ISSUE-110).** Esta surface es el último gate humano antes de mandar un diagnóstico AEO a un prospecto. Errores más peligrosos de publicar, en orden: (a) **falso-negativo/falso-0** ("no apareces en IA" cuando sí te citan — la clase ISSUE-110, destruye credibilidad al instante); (b) **cita/claim alucinado**; (c) **evidencia stale** (los motores cambian semanalmente); (d) **conflación entre motores** (~11% de solapamiento ChatGPT↔Perplexity → un veredicto único sin desglose por-motor es engañoso). Por eso el ledger DEBE mostrar, como evidencia bounded: **presencia por-motor con la probe verbatim + snippet de respuesta + `as_of` por motor**, **flag de frescura/staleness**, y **procedencia de cada claim público** (cada afirmación del DTO trazable a una respuesta de motor bounded). Marco de seguridad: motor brand-aware (EPIC-021) = capa 1; este gate humano = capa 2 del MISMO falso-0.
2. **[product-design] Primitive lookup de `reconciler` ANTES de asumir effort.** La task asume `AdaptiveSidecarLayout` variante `reconciler` como si existiera. En Discovery: grep `src/components/greenhouse/primitives` — si el variant NO existe, nacerlo es protocolo Primitive+Variants+Kinds completo (Lab interno `/admin/design-system/<nombre>` + GVC + nodo AXIS), lo que **sube el effort** (deja de ser `ui-standard`). Reportar reuse/extend/new ANTES de codear.
3. **[product-design] La cola densa usa `DataTableShell`, no MUI crudo.** Las filas (brand, score, gate reason, risk type, evidence completeness, age, reviewer/lock, conflict) son >8 columnas → regla dura: `<DataTableShell>`.
4. **[arch] Nombrar los error codes canónicos del conflicto.** La UI mapea `invalid_transition` / `not_reviewable` (409) → copy honesto "este reporte ya fue revisado por otro operador (actualizando cola)", NO "guard de versión/estado" genérico ni error genérico. El guard ya existe; la UI solo traduce esos códigos. La aprobación está ligada a la `score_version` revisada (re-score → nueva versión `pending`): mostrar la `score_version` vigente y detectar staleness.
5. **[seo + state-design] Estado de abstención del grader (`insufficient_data` / `confidence=none`) de primera clase.** "Evidencia incompleta porque una probe falló" ≠ "el grader se abstuvo por evidencia insuficiente". Son decisiones de review distintas; un abstención normalmente NO se publica. Agregar al state inventory.
6. **[arch · menor] `Backend impact: none` es impreciso** — hay una migración de seed del viewCode (`administracion.growth_ai_visibility` en `VIEW_REGISTRY`). Es plumbing de UI-access (no contrato de negocio) → el profile `ui-ux` está bien, pero la migración sigue la regla seed+VIEW_REGISTRY mismo-PR (TASK-827/982).

## Delta 2026-06-26 — desbloqueada por TASK-1244 (complete dev)

El backend del gate humano ya existe — esta UI es cliente puro de él (Full API parity). Consumir, sin lógica nueva de negocio:

- **Navegación (decisión operador 2026-06-26):** la surface debe quedar bajo el menú top-level **Growth** como sibling de **Forms**, con label visible de menú **AEO Grader**. No usar "AI Visibility" como label de menú aunque el dominio técnico siga siendo `growth.ai_visibility`; la página puede titular/explicar "AI Visibility Grader" dentro del contenido.
- **View registry:** seed de `viewCode` propio sugerido `administracion.growth_ai_visibility`, `route_group='admin'`, `route_path='/admin/growth/ai-visibility'`, icono relacionado al grader/scan y grants internos alineados con `growth.ai_visibility.report.review`. La ruta puede abrir la review queue como default o redirigir a `/admin/growth/ai-visibility/review`, pero la entrada del menú debe ser **Growth → AEO Grader**.
- **Cola:** `GET /api/admin/growth/ai-visibility/reviews` → `{ items: [{ runId, scoreVersion, reviewReasons, finishedAt, createdAt }], total }` (reader `listPendingReportReviews`).
- **Acciones:** `POST /api/admin/growth/ai-visibility/runs/[runId]/review/approve` (body opcional `{ reason }`) → `{ runId, scoreVersion, state:'approved', reportToken }`; `POST …/review/reject` (body `{ reason }` **obligatorio**, 422 `reason_required` si falta) → `{ state:'rejected' }`. Errores: 409 `not_reviewable`/`invalid_transition` (mostrar copy es-CL, NO botón "Reintentar" — son estructurales).
- **Capability:** `growth.ai_visibility.report.review` (ya gateando los endpoints; la UI debe ocultar las acciones sin la capability).
- **Evidencia a mostrar:** `reviewReasons` (ya agrega scoring TASK-1227 + exactitud de marca TASK-1238) + el reporte interno (`GET /runs/[runId]/report`). Recordar: el motivo de `review_required` es INTERNAL-only (nunca exponerlo público).
- **Detalle del run existente:** el botón aprobar/rechazar vive idealmente en el detalle del run admin (no inventar otra superficie de regiones).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1247-growth-ai-visibility-admin-review-ui.md`
- Flow: `docs/ui/flows/TASK-1247-growth-ai-visibility-admin-review-ui-flow.md`
- Motion: `docs/ui/motion/TASK-1247-growth-ai-visibility-admin-review-ui-motion.md`
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|ui|reliability`
- Blocked by: `none`
- Branch: `task/TASK-1247-growth-ai-visibility-admin-review-ui`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye la superficie interna para operar el gate humano de `review_required`: cola de reportes pendientes, detalle de evidencia, preview publico seguro y acciones aprobar/rechazar consumiendo los comandos de `TASK-1244`. Convierte el backend de review en una operacion usable por Growth/Marketing Ops.

## Why This Task Exists

`TASK-1244` declara explicitamente que la UI admin queda como follow-up. Sin esta task, el sistema puede tener comandos approve/reject pero el operador no tiene una ruta enterprise para revisar reportes antes del release publico.

## Goal

- Crear `/admin/growth/ai-visibility` como surface admin del grader, alcanzable desde **Growth → AEO Grader**; la review queue puede vivir como default o child `/review`.
- Mostrar evidencia interna suficiente para decidir sin filtrar raw innecesario.
- Ejecutar approve/reject via comandos gobernados, con estados de pending/success/error y audit visible.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §10 admin/control plane, §11 API parity.
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/tasks/to-do/TASK-1244-growth-ai-visibility-admin-evidence-review.md`

Reglas obligatorias:

- La UI no aprueba por si sola; consume `approveAiVisibilityReport`/`rejectAiVisibilityReport`.
- No mostrar el DTO publico como unica evidencia: el reviewer necesita razones internas bounded.
- No crear dialogs/drawers paralelos si `AdaptiveSidecar` o `CompositionShell` resuelven el flujo.
- La entrada de navegación visible debe ser **Growth → AEO Grader**; no crear un top-level nuevo ni colgarlo de Forms.
- Copy visible en `src/lib/copy/growth.ts` o archivo canonico de copy del dominio.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `DESIGN.md`

## Dependencies & Impact

### Depends on

- `TASK-1244` — reader de cola y comandos approve/reject.
- `TASK-1238`/`TASK-1227` — razones `review_required`.
- `TASK-1239` — publish honra aprobacion.

### Blocks / Impacts

- Desbloquea operacion humana del gate de seguridad para launch.
- Reduce dependencia de APIs/CLI para revisar reportes.

### Files owned

- `src/app/(dashboard)/admin/growth/ai-visibility/**` [verificar route group vigente]
- `src/views/growth/ai-visibility/admin/**`
- `migrations/*_task-1247-*.sql` para seed de `administracion.growth_ai_visibility`
- `src/config/greenhouse-nomenclature.ts` / `src/config/greenhouse-navigation-copy.ts` para copy de menú **AEO Grader**
- `src/lib/admin/view-access-catalog.ts` si el catálogo admin requiere registrar el viewCode
- `src/lib/navigation/route-reachability-manifest.ts`
- `src/lib/copy/growth.ts`
- `scripts/frontend/scenarios/growth-ai-visibility-admin-review.*` [verificar extension DSL]

## Current Repo State

### Already exists

- Endpoints admin de runs/report/score/publish bajo `src/app/api/admin/growth/ai-visibility/**`.
- Primitives de Composition Shell, Adaptive Sidecar, Loading Surface y command feedback.

### Gap

- No existe una UI admin de review queue ni approve/reject.
- `TASK-1244` deja la UI como follow-up.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador interno Growth/Marketing Ops o admin Efeonce.
- Momento del flujo: reporte escalado a `review_required` antes de release publico.
- Resultado perceptible esperado: el operador entiende el riesgo, compara evidencia, aprueba/rechaza y ve feedback auditable.
- Friccion que debe reducir: revisar sin saltar entre SQL/API/reportes crudos.
- No-goals UX: editar scoring, reescribir respuestas provider, configurar prompt packs.

### Surface & system decision

- Surface: `/admin/growth/ai-visibility` como entrada principal de menú **Growth → AEO Grader**; `/review` puede ser child/deep link. **Ruta admin interna** → viewCode routeGroup `admin`, NUNCA `client_*`.
- Composition Shell: `aplica` — declarar composición `leadPlusContext` (cola lead + evidencia/decisión context); regiones singleton, sin grid/morph ad-hoc.
- Primitive decision: `reuse` — CompositionShell, AdaptiveSidecar, GreenhouseAsyncActionButton, GreenhouseCommandFeedback, cards existentes. **Cola densa (>8 cols: brand, score, gate reason, risk type, evidence completeness, age, reviewer/lock, conflict) → `DataTableShell` obligatorio (regla dura), NO MUI `<Table>` crudo.** **⚠️ Primitive lookup pendiente en Discovery:** confirmar si `AdaptiveSidecarLayout` ya tiene el variant `reconciler` (`grep src/components/greenhouse/primitives`); si NO existe, nacerlo es protocolo Primitive+Variants+Kinds COMPLETO (Lab interno + GVC + nodo AXIS) → sube el effort sobre `ui-standard`. Reportar reuse/extend/new ANTES de codear.
- Adaptive density / The Seam: `aplica` — filas/cards de cola condensan en sidebars y mobile con `card-density` (condensación honesta, el dato clave nunca desaparece).
- Floating/Sidecar/Dialog decision: AdaptiveSidecar para detalle, mapeado a variante oficial **`reconciler`** (flujo de adjudicación aprobar/rechazar con evidencia) — NO drawer/modal custom, desktop = lane in-flow. Dialog solo para la confirmación del rechazo (acción de consecuencia legal/pública).
- Copy source: `src/config/greenhouse-nomenclature.ts` / `src/config/greenhouse-navigation-copy.ts` para label/subtitle de menú; `src/lib/copy/growth.ts` para copy funcional de la surface (invocar `greenhouse-ux-writing`, es-CL).
- Access impact: `views|entitlements` — seed `administracion.growth_ai_visibility` con label **AEO Grader** bajo Growth y capability `growth.ai_visibility.report.review` definida por TASK-1244. **Cross-check RESUELTO (verificado 2026-06-30):** la capability está granteada a **EFEONCE_ADMIN ∪ AI_TOOLING_ADMIN** en `src/lib/entitlements/runtime.ts:234` — no hay permission-denied-for-all. Nueva ruta `(dashboard)` → entrada obligatoria en `route-reachability-manifest.ts` + seed viewCode en `VIEW_REGISTRY` el mismo PR (TASK-827/982).

### Approved visual direction

- Product Design exploration approved by operator on 2026-06-25: **Review Command Center** as the base direction, incorporating the evidence/check ledger from **Evidence Ledger Review** and the public-safe decision checklist from **Reconciler Studio**.
- Durable visual references:
  - Base target: `docs/assets/product-design/task-1247-ai-visibility-admin-review/review-command-center.png`
  - Evidence ledger reference: `docs/assets/product-design/task-1247-ai-visibility-admin-review/evidence-ledger-review.png`
  - Reconciler/checklist reference: `docs/assets/product-design/task-1247-ai-visibility-admin-review/reconciler-studio.png`
- Visual objective: internal, safety-oriented, modern and operational; the surface should feel like a release gate workbench, not a marketing dashboard or vanity analytics page.
- First-screen hierarchy:
  - Header with `GreenhouseBreadcrumbs`, page title, review counts/SLA/risk summary and capability-safe action posture.
  - Primary queue lane with filters/search and dense pending rows: brand, score, gate reason, risk type, evidence completeness, age, reviewer/lock and conflict status.
  - Reconciler/detail lane with WYSIWYG public report preview, internal bounded reasons, evidence completeness warning, audit trail and decision controls.
  - Decision area with balanced approve/reject actions; no pre-focused approve CTA and no primary bias toward publishing.
- Evidence ledger merge from option 2:
  - Include a chronological/checklist-style evidence ledger for score gate, accuracy detector, public snapshot check, provider coverage and publish readiness.
  - Ledger rows show status, bounded detail, impact and timestamp; use evidence peeks only for bounded internal snippets, never raw provider dumps.
  - **[seo-aeo · capa-2 anti-falso-0 ISSUE-110] El ledger DEBE incluir, como evidencia bounded:**
    - **Presencia por-motor con la probe verbatim + el snippet de respuesta del motor + `as_of` por motor** (ChatGPT/Perplexity/Gemini/AI Overviews por separado — NO un veredicto único blended; ~11% de solapamiento entre motores). Es el check que deja al reviewer sanity-checkear "¿probamos bien?" antes de afirmar "no apareces en IA".
    - **Flag de frescura/staleness:** edad del `as_of` por motor; los motores cambian semanalmente → una probe vieja es señal de rechazo.
    - **Procedencia de cada claim público:** cada afirmación del DTO público trazable a la respuesta de motor bounded que la respalda (anti cita/claim alucinado). Un claim sin respaldo trazable = no publicable.
  - **Errores más peligrosos de publicar (orden):** falso-negativo/falso-0 > cita alucinada > evidencia stale > conflación entre motores. El reviewer debe poder detectar los 4 desde el ledger.
- Reconciler checklist merge from option 3:
  - Decision panel includes a public-safe publish readiness checklist: exact public DTO preview, no raw evidence, disclaimer present, evidence complete or explicitly partial, rejection reason captured.
  - Conflict state is first-class: "este reporte ya fue revisado/actualizado por otro operador" with refresh path, not a generic error.
- Avoided directions:
  - No public landing/hero treatment, no decorative gradients/orbs, no dashboard vanity tiles, no raw provider transcript table, no provider-logo wall.
  - Do not make the public preview the only evidence; reviewer needs bounded internal reasons next to the exact public artifact.
  - Do not implement desktop review as a modal or custom drawer; use in-flow Composition Shell / Adaptive Sidecar semantics.

### State inventory

- Default: cola con pendientes + detalle seleccionado.
- Loading: skeleton/loader de cola y detalle.
- Empty: no hay reportes pendientes.
- Error: reader falla o comando rechaza.
- Degraded / partial: evidencia incompleta o run partial — **mostrar explícitamente "evidencia incompleta/Pendiente" (nunca render confiado sobre un slice fallido): aprobar sobre evidencia silenciosamente incompleta es el riesgo de seguridad #1 de esta surface.**
- **Abstención del grader (`insufficient_data` / `confidence=none`):** distinto de "una probe falló" — acá el grader MISMO se abstuvo por evidencia insuficiente. Mostrarlo como estado de review de primera clase (badge propio, copy explícito); un abstención normalmente **NO se publica**. No confundir con `degraded/partial`.
- **Stale / conflicto entre revisores:** dos operadores abren el mismo `review_required`; uno acciona y el otro tiene una vista vieja. **El guard YA existe en el command de 1244** (state machine sobre el log append-only `grader_report_reviews`): un flip terminal (approved↔rejected) lanza **`invalid_transition`** y accionar un gate ya fuera de `review_required` lanza **`not_reviewable`** (ambos 409). La UI **mapea esos dos códigos** → copy honesto "Este reporte ya fue revisado por X — actualizando cola", refresca y NO muestra error genérico. Además la aprobación está ligada a la `score_version` revisada (un re-score genera una nueva versión `pending`): mostrar la `score_version` vigente y detectar staleness. (No es el doble-submit del mismo usuario; es concurrencia multi-revisor.)
- Permission denied: sin capability `report.review`.
- Long content: evidencia/reasons scroll interno, no pagina horizontal.
- Mobile / compact: cola y detalle apilados/drawer.
- Keyboard / focus: foco al detalle y botones, aria-live para resultado.
- Reduced motion: sin transiciones obligatorias.

### Interaction contract

- Primary interaction: seleccionar reporte -> revisar -> aprobar/rechazar.
- Hover / focus / active: estados visibles en filas y botones.
- Pending / disabled: comandos disable mientras ejecutan, anti doble submit.
- Escape / click-away: sidecar cierra si no hay comando pending.
- Focus restore: vuelve a fila revisada tras accion/cierre.
- Latency feedback: pending persistente con command feedback.
- Toast / alert behavior: feedback persistente, no solo toast efimero.

### Motion & microinteractions

- Motion primitive: `Motion|framer layout|CSS`
- Enter / exit: entrada ligera del detalle.
- Layout morph: Composition Shell si aplica.
- Stagger: opcional para lista.
- Timing / easing token: tokens del design system.
- Reduced-motion fallback: sin stagger/morph.
- Non-goal motion: animacion decorativa.

### Visual verification

- GVC scenario: `growth-ai-visibility-admin-review`
- Viewports: desktop + 390px.
- Required captures: empty, cola con detalle, command pending/success/error.
- Required `data-capture` markers: `admin-review-queue`, `admin-review-detail`, `admin-review-actions`.
- Scroll-width check: `scrollWidth==clientWidth` desktop + 390px.
- Accessibility/focus checks: focus order, aria labels, keyboard action.
- Before/after evidence: N/A pagina nueva.
- Known visual debt: depende del route shell admin existente.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader`
- Source of truth afectado: ninguno nuevo; consume reader/commands de `TASK-1244`
- Consumidores afectados: UI admin de review
- Runtime target: `local|staging`

### Contract surface

- Contrato existente a respetar: cola reader + `approveAiVisibilityReport`/`rejectAiVisibilityReport` de `TASK-1244`.
- Contrato nuevo o modificado: ninguno; esta task no crea backend nuevo.
- Backward compatibility: `not applicable`
- Full API parity: la UI es cliente del primitive server-side, sin logica de aprobacion local.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna por esta task.
- Invariantes que no se pueden romper:
  - La UI no auto-aprueba ni muta estado fuera de los comandos gobernados.
  - La UI no filtra raw provider text completo si el reader no lo expone.
- Tenant/space boundary: interno/admin, capability definida por `TASK-1244`.
- Idempotency/concurrency: delegada al command; UI deshabilita doble submit mientras pending.
- Audit/outbox/history: delegada al command de `TASK-1244`; UI muestra resultado/audit cuando el reader lo exponga.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: route oculta o permission denied hasta capability/grant de `TASK-1244`.
- Backfill plan: none.
- Rollback path: revert route/nav o ocultar surface.
- External coordination: rol interno con capability review.

### Security and access

- Auth/access gate: session interna + capability `growth.ai_visibility.report.review`.
- Sensitive data posture: evidencia interna bounded; no publico.
- Error contract: mapear errores canonicos del API a estados UI sanitizados.
- Abuse/rate-limit posture: interno autenticado; no public abuse surface.

### Runtime evidence

- Local checks: UI tests/focal tests.
- DB/runtime checks: fixture o staging con reporte `review_required`.
- Integration checks: approve/reject contra API de `TASK-1244`.
- Reliability signals/logs: revisar signals del backend de review si existen.
- Production verification sequence: staging primero; prod via rollout de EPIC-020.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Review queue surface

- Crear ruta admin `/admin/growth/ai-visibility` con cola de `review_required` pendientes desde el reader de `TASK-1244`.
- Seedear navegación/view registry para que el menú muestre **Growth → AEO Grader** como sibling de **Forms**.
- Estados loading/empty/error/permission.
- Implementar la dirección aprobada **Review Command Center**:
  - queue lane con filtros/search, risk summary y filas densas;
  - selección visible y foco de teclado claro;
  - indicadores explícitos de evidencia incompleta, lock/reviewer y conflicto multi-revisor.

### Slice 2 — Evidence detail + preview

- Mostrar razones de review, accuracy findings internas bounded, score/report preview y snapshot/public preview si aplica.
- Evitar raw provider text completo salvo que el reader interno lo permita explicitamente.
- Incorporar el ledger/checklist de evidencia de **Evidence Ledger Review** y el checklist de decisión de **Reconciler Studio**.
- El detalle debe mostrar el DTO público exacto que se publicaría, junto a razones internas bounded y readiness de publicación.

### Slice 3 — Approve/reject commands

- Botones gobernados con `GreenhouseAsyncActionButton`/feedback.
- Rechazo exige razon; approval/rejection actualiza cola y detalle.
- Aprobar y rechazar deben tener peso visual equilibrado; aprobar comunica consecuencia pública y rechazar preserva la razón ante error de comando.

### Slice 4 — GVC + a11y

- Scenario GVC desktop/mobile con estados clave.
- Scroll-width, focus y reduced-motion.

## Out of Scope

- Backend de review (`TASK-1244`).
- Public page (`TASK-1241`).
- Cambiar scoring/review gates.
- Bulk approve o auto-approve.

## Detailed Spec

La UI debe ser un consumer del contrato `TASK-1244`: lista pendientes, lee detalle, ejecuta approve/reject. Debe usar Composition Shell como substrato y sidecar/inspector para preservar contexto. El reviewer necesita ver suficiente evidencia para decidir, pero la surface no debe normalizar ni recalcular el score.

**Esta es una surface de gate de seguridad — el diseño debe reflejarlo:**

- **WYSIWYG del artefacto público:** el reviewer ve el **DTO público EXACTO que se va a publicar** (el mismo `PublicGraderReport` que vería el prospecto, vía el preview de TASK-1239) lado a lado con las razones internas bounded. Se aprueba el artefacto real, no una aproximación.
- **[capa-2 anti-falso-0] Evidencia por-motor + frescura + procedencia:** junto al DTO, el ledger expone **presencia por-motor** (probe verbatim + snippet del motor + `as_of`, ChatGPT/Perplexity/Gemini/AI Overviews por separado), **frescura** (probe vieja = señal de rechazo; los motores cambian semanalmente) y **procedencia** (cada claim público trazable a una respuesta bounded). Es la segunda capa del mismo falso-0 que el motor (EPIC-021) cierra en la capa 1: el reviewer debe poder cazar un falso-0/cita alucinada/evidencia stale ANTES de publicar a un prospecto.
- **Framing de consecuencia (no sesgar a aprobar):** "Aprobar" comunica su consecuencia ("Esto publica el reporte al prospecto"); aprobar y rechazar tienen igual peso visual; ninguna acción de consecuencia está pre-enfocada por default. La confirmación de rechazo va en Dialog.
- **Razón de rechazo = campo `forms-ux`:** label-above, `min length` razonable, error inline ("qué falta"), preserva el texto en error de comando. La razón ES el registro de auditoría del rechazo (la consume el command de 1244); tratarla como dato sensible (no loggear crudo si trae contexto del prospecto).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3 -> Slice 4. No conectar acciones antes de tener estados de error/pending.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Operador aprueba sin contexto suficiente | safety | medium | evidencia/reasons visibles + WYSIWYG público + evidencia incompleta explícita | rechazos post-publicacion |
| Accion duplicada (mismo usuario) | data quality | low | command idempotente + pending disabled | command conflict |
| Conflicto multi-revisor (dos operadores) | data quality/safety | medium | guard de versión/estado en command 1244 + UI surface conflicto honesto + refresh cola | command conflict 409 |
| UI filtra raw sensitive evidence | privacy/legal | medium | bounded reader + copy interna | code review/GVC |
| Overflow mobile en admin dense UI | UI | medium | Composition Shell + scroll-width check | GVC |

### Feature flags / cutover

- Gated por capability `growth.ai_visibility.report.review`.
- Puede ocultarse de nav hasta que `TASK-1244` este desplegada.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert route/nav | <5 min | si |
| Slice 2 | revert detail panel | <5 min | si |
| Slice 3 | remove actions/disable buttons | <5 min | si |
| Slice 4 | revert visual polish | <5 min | si |

### Production verification sequence

1. Staging con un `review_required` real o fixture seeded.
2. Operador con capability ve cola/detalle.
3. Approve -> publish permitido; reject -> publish 409.
4. GVC desktop/mobile mirado.

### Out-of-band coordination required

- Rol interno/usuarios con capability de review.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaro `Execution profile: ui-ux` y `UI impact: flow`.
- [ ] La entrada de menú queda bajo **Growth** con label visible **AEO Grader**, como sibling de **Forms**.
- [ ] Existe `viewCode` propio para la surface del grader (sugerido `administracion.growth_ai_visibility`) con route group `admin`, grants internos y guard de página alineado a `growth.ai_visibility.report.review`.
- [ ] UI consume reader/commands de `TASK-1244`, sin logica de aprobacion local.
- [ ] Cola, detalle, preview y acciones approve/reject cubren loading/empty/error/permission/pending.
- [ ] La implementación sigue la dirección visual aprobada: **Review Command Center** como base + ledger de **Evidence Ledger Review** + checklist de **Reconciler Studio**.
- [ ] Copy reusable vive en `src/lib/copy/*`.
- [ ] GVC desktop+mobile capturado y mirado **en loop** (gates V1.5: layout/runtime/keyboard/enterpriseRubric); `scrollWidth==clientWidth`. Gate axe verde.
- [ ] Focus/keyboard/reduced-motion validados.
- [ ] No se filtra raw provider text o accuracy findings al publico; esta surface es interna.
- [ ] Sidecar = `AdaptiveSidecarLayout` variante `reconciler` (no drawer/modal custom); Composition Shell con composición declarada.
- [ ] El reviewer ve el DTO público EXACTO (WYSIWYG) + razones internas; evidencia incompleta se muestra explícita (no render confiado sobre slice fallido).
- [ ] **[anti-falso-0 ISSUE-110]** El Evidence Ledger muestra **presencia por-motor** (probe verbatim + snippet + `as_of` por motor, sin blendear), **flag de frescura/staleness**, y **procedencia bounded de cada claim público** (claim sin respaldo trazable = no publicable).
- [ ] Estado de **abstención del grader** (`insufficient_data`/`confidence=none`) renderizado como review distinto de `degraded/partial`; un abstención no se publica por default.
- [ ] Cola densa (>8 cols) implementada con **`DataTableShell`** (no MUI `<Table>` crudo); decisión de primitive del `reconciler` reportada (reuse/extend/new) antes de codear.
- [ ] Conflicto multi-revisor: la UI **mapea `invalid_transition` / `not_reviewable` (409)** del command de 1244 → copy honesto "ya fue revisado por otro" + refresh (no error genérico); muestra la `score_version` vigente.
- [ ] Razón de rechazo con `forms-ux` (label-above, min length, preserva en error) y tratada como dato sensible.
- [ ] Ruta `(dashboard)` en `route-reachability-manifest.ts` + viewCode seed en `VIEW_REGISTRY` (mismo PR); capability `report.review` confirmada con grant a ROLE_CODE real.

## Verification

- `pnpm local:check:ui`
- `pnpm test`
- `pnpm fe:capture growth-ai-visibility-admin-review --env=staging`
- `pnpm task:lint --task TASK-1247`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] route/nav/reachability actualizados si aplica

## Follow-ups

- Notificaciones Teams/email al reviewer cuando entra un reporte pendiente.
- Bulk triage si el volumen lo justifica.

## Open Questions

1. ¿La surface vive como ruta dedicada `/review` o dentro del detalle de run existente? Propuesta: ruta dedicada con deep-link al detalle.

## Delta 2026-06-28 — conectada al Master UI Flow del programa AEO

- Esta task es el nodo **S13** — Admin Review UI (gate pre-publicación) del flujo cross-surface del programa AEO. Su UI/flujo se conecta con todas las demás superficies (público → email/PDF → portal cliente tiers/PLG → operador cross-sell → Account 360) en el doc maestro **`docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md`** (info-architecture + state-design + ux-writing + modern-ui). Toda UI del programa renderiza el `ReportArtifactModel` compartido (TASK-1252) y deriva su visibilidad del **entitlement** (TASK-1277), nunca del rol; cada acción mapea a un command gobernado (Full API Parity → Nexa por construcción).
