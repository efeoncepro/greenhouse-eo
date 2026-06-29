# TASK-1276 — AEO Operator View (Growth + Account 360)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1276-aeo-operator-view.md`
- Flow: `docs/ui/flows/TASK-1276-aeo-operator-view-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-1275, TASK-1279, TASK-1287`
- Branch: `task/TASK-1276-aeo-operator-view-growth-account360`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Vista **operador** del AEO, fuera de `/admin`: un cockpit en **Growth** (`/growth/aeo`) + detalle por-sujeto (`/growth/aeo/[organizationId]`), también alcanzable como **facet "AEO" en el Account 360**. Reusa la `masterDetail` CompositionShell + el report model de TASK-1248. Hace dos cosas: (1) **gestión** del Plan AEO de clientes contratados (control de estado, write del command de TASK-1275); (2) **arma de cross-sell/prospección** — el operador elige un target (cliente sin AEO **o prospecto HubSpot**), corre el motor (puerta operador de TASK-1277), ve la **brecha competitiva**, y **envía el informe + abre oportunidad** (command de TASK-1279). Lee informes de clientes **y prospectos**.

## Why This Task Exists

El operador presta el servicio AEO pero hoy no tiene una superficie propia para ver el AEO completo de un cliente ni para registrar el avance del Plan AEO. La decisión IA del operador fue explícita: esta vista **NO va en `/admin`** (admin = salud operativa de la plataforma, no el programa Growth) → vive en **Growth** (taxonomía interna correcta) + un **facet en Account 360** (modelo mental "este cliente"). Sin ella, el status que TASK-1275 persiste no tiene quién lo escriba, y la vista cliente `/aeo` no puede mostrar avance.

## Goal

- Cockpit Growth/AEO cross-cliente (`/growth/aeo`) + detalle por-cliente (`/growth/aeo/[organizationId]`), viewCode interno (NUNCA `client_*`), reachable por nav.
- Facet "AEO" en el Organization Workspace (Account 360) que deep-linkea al detalle por-cliente.
- Control de estado de ejecución del Plan AEO (write del command TASK-1275) integrado en el detail canvas, reusando la `masterDetail` CompositionShell + el report model.
- **Cross-sell/prospección**: subject picker (clientes contratados + clientes sin AEO + **prospectos HubSpot**), **correr el motor** sobre el target (puerta operador TASK-1277), **foco competitivo** (marca vs competidores), y acción **"Enviar informe + abrir oportunidad"** (consume el command de TASK-1279 vía `propose→confirm→execute`, con **captura de consentimiento** para prospectos).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/ui-platform/README.md` + `PRIMITIVES.md` (CompositionShell `masterDetail`, TeamAvatarGroup `brands`)
- `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md` (Organization Workspace facet — receta de extensión)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (viewCode interno + capability)
- `docs/tasks/complete/TASK-1248-growth-ai-visibility-client-report-ui.md` (vista cliente espejo + report model)

Reglas obligatorias:

- NUNCA bajo `/admin`. Ruta `internal` en sección Growth + facet Account 360.
- Toda ruta `(dashboard)/**/page.tsx` alcanzable por nav (TASK-982 route-reachability); viewCode nuevo → migration seed en el MISMO PR (TASK-827); NUNCA `client_*` (es vista operador).
- El write de status es el command gobernado de TASK-1275; la UI es cliente del primitive (Full API Parity), sin lógica de negocio en el componente.
- Reuso de `masterDetail` CompositionShell + report-artifact model — NO forkear ni inventar layout.
- GVC desktop + mobile mirado antes de cerrar; copy en `src/lib/copy/growth.ts`.

## Normative Docs

- `docs/ui/wireframes/TASK-1276-aeo-operator-view.md`
- `docs/ui/flows/TASK-1276-aeo-operator-view-flow.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`

## Dependencies & Impact

### Depends on

- **TASK-1287** (readers operador-scoped: `readOperatorScopedAeoReport` + `readOperatorCrossOrgAeoScores`) — bloqueante para el detalle (Slice 1) y el cockpit (Slice 3). Cierra el `[verificar]` del reader operador-scoped.
- **TASK-1275** (command/reader de estado de ejecución) — bloqueante para el write del Plan AEO (Slice 2).
- **TASK-1279** (command `sendAeoReportAndOpenOpportunity` + consent + legalBasis + dealIntent + HubSpot deal) — bloqueante para enviar + abrir oportunidad (Slice 6).
- **TASK-1277** (puerta operador `requestGraderRunForOrganization`/run gobernado + entitlement) — **complete**; provee el run del motor (Slice 5). Reader que expone = `resolveAeoEntitlement` (entitlement, NO el reporte; el reporte lo provee TASK-1287).
- TASK-1248 (report model `modelFromClientReport` + `masterDetail` shell) — existe.
- Organization Workspace projection / facets (Account 360) + prospectos org-sincronizados de HubSpot (TASK-706) — `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md`.

### Blocks / Impacts

- Cierra el loop operador↔cliente del Plan AEO; habilita el follow-up de TASK-1248 (mostrar status en `/aeo`).

### Files owned

- `src/app/(dashboard)/growth/aeo/page.tsx` + `src/app/(dashboard)/growth/aeo/[organizationId]/page.tsx` `[verificar naming]`
- `src/views/greenhouse/growth/ai-visibility/operator/**` (vista operador) `[verificar]`
- Organization Workspace facet AEO `[verificar path del workspace]`
- `src/lib/admin/view-access-catalog.ts` + migration seed del viewCode interno
- `src/lib/navigation/route-reachability-manifest.ts` + nav descriptor
- `scripts/frontend/scenarios/growth-aeo-operator.scenario.ts`
- `src/lib/copy/growth.ts`

## Current Repo State

### Already exists

- Vista cliente `/aeo` (TASK-1248) read-only + `masterDetail` CompositionShell + report model + `TeamAvatarGroup` kind `brands`.
- Organization Workspace (Account 360) con patrón de facets.

### Gap

- No hay superficie operador del AEO; no hay facet AEO en Account 360; el status de TASK-1275 no tiene UI de escritura.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador interno (Account/Growth)
- Momento del flujo: revisar AEO del cliente + registrar avance del Plan AEO
- Resultado perceptible esperado: ver diagnóstico + recomendaciones + escribir status por foco
- Friccion que debe reducir: hoy no hay dónde ver/registrar el avance del servicio AEO por cliente
- No-goals UX: no es la vista cliente; no vive en `/admin`; no re-scorea

### Surface & system decision

- Surface: `/growth/aeo` (cockpit) + `/growth/aeo/[organizationId]` (detalle) + facet AEO en Account 360
- Composition Shell: `aplica` — reusa `masterDetail` (navigator + detail canvas), igual que la vista cliente
- Primitive decision: `reuse` — CompositionShell `masterDetail` + report-artifact view + `TeamAvatarGroup` `brands`; control de status = componente nuevo cliente del command TASK-1275
- Adaptive density / The Seam: `aplica` — el cockpit (tabla) y el workbench condensan por ancho
- Floating/Sidecar/Dialog decision: detalle en drawer en compact (igual que `/aeo`)
- Copy source: `src/lib/copy/growth.ts`
- Access impact: `views` + `entitlements` (viewCode interno + capability `growth.ai_visibility.recommendation.set_status`)

### State inventory

- Default: cockpit + workbench con data
- Loading: skeletons cockpit + workbench
- Empty: "Sin runs AEO" para el cliente
- Error: "No pudimos cargar el AEO" + reintentar
- Degraded / partial: focos sin status como "sin seguimiento aún"
- Permission denied: operador sin scope de la org no ve el cliente
- Long content: navigator scrolleable; detalle paginado por foco
- Mobile / compact: detalle en drawer "Ver detalle"
- Keyboard / focus: cockpit → navigator → detalle → control de status; foco restaurado tras write
- Reduced motion: cambio de status sin motion gratuito

### Interaction contract

- Primary interaction: seleccionar cliente → abrir foco → cambiar status
- Hover / focus / active: filas del cockpit + focos del navigator
- Pending / disabled: control de status disabled mientras el write está en vuelo
- Escape / click-away: n/a (rutas, no modal)
- Focus restore: vuelve al foco editado tras el write
- Latency feedback: optimistic opcional + toast de resultado
- Toast / alert behavior: éxito silencioso/leve; error actionable

### Motion & microinteractions

- Motion primitive: `none` (reusa el motion existente del shell; sin motion nuevo)
- Enter / exit: el del shell
- Layout morph: el de `masterDetail`
- Stagger: n/a
- Timing / easing token: tokens existentes del shell
- Reduced-motion fallback: heredado
- Non-goal motion: no agregar motion nuevo al control de status

### Implementation mapping

- Route / surface: `/growth/aeo` + `/growth/aeo/[organizationId]` + facet Account 360 (NO `/admin`)
- Primitive / variant / kind: CompositionShell `masterDetail` (kind `workbench`), `TeamAvatarGroup` `brands`
- Component candidates: view-adapter operador de `modelFromClientReport` + control de status nuevo
- Copy source: `src/lib/copy/growth.ts`
- Data reader / command: `readRecommendationStatuses` + `setRecommendationStatus` (TASK-1275) + `readOperatorScopedAeoReport` + `readOperatorCrossOrgAeoScores` (TASK-1287)
- API parity: el write es el command gobernado de TASK-1275; UI = cliente del primitive
- Access / capability: viewCode interno (sección Growth, routeGroup `internal`) + capability del write
- States to implement: default/loading/empty/error/partial/denied/mobile

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/growth-aeo-operator.scenario.ts`
- Route: `/growth/aeo` + `/growth/aeo/[organizationId]` (o mockup harness)
- Viewports: desktop 1440 + mobile 390
- Required steps: cockpit → seleccionar cliente → abrir foco → cambiar status
- Required captures: cockpit, workbench operador, control de status
- Required `data-capture` markers: `aeo-operator-cockpit`, `aeo-operator-detail`
- Assertions: noLoginRedirect, noErrorBoundary
- Scroll-width checks: sin scroll horizontal desktop ni mobile 390
- Reduced-motion / focus evidence: foco restaurado tras write; status sin motion gratuito

### Design decision log

- Decision: vista operador en Growth + facet Account 360, NO `/admin`
- Alternatives considered: `/admin/growth/ai-visibility` (rechazado: admin = salud de plataforma)
- Why this pattern: Growth = programa AEO cross-cliente; Account 360 = "este cliente" contextual
- Reuse / extend / new primitive: `reuse` (masterDetail + report model); status control nuevo
- Open risks: reader operador-scoped vs client-scoped (TASK-1243) — Discovery

### Visual verification

- GVC scenario: `growth-aeo-operator`
- Viewports: desktop + mobile
- Required captures: cockpit, workbench, control de status
- Required `data-capture` markers: `aeo-operator-cockpit`, `aeo-operator-detail`
- Scroll-width check: desktop + mobile 390
- Accessibility/focus checks: foco restaurado tras write; status color-independiente
- Before/after evidence: n/a (superficie nueva)
- Known visual debt: ninguna conocida al diseñar

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Detalle operador por-cliente (`/growth/aeo/[organizationId]`)

- Ruta interna + viewCode seed (migration mismo PR) + route-reachability + nav descriptor (sección Growth).
- View-adapter operador del report model (reusa `masterDetail`); estados default/loading/empty/error/denied.

### Slice 2 — Control de estado del Plan AEO (write TASK-1275)

- Control de status por foco en el detail canvas, consumiendo `setRecommendationStatus` + `readRecommendationStatuses`.
- Copy en `growth.ts`; a11y (status color-independiente) + focus restore.

### Slice 3 — Cockpit cross-cliente (`/growth/aeo`)

- Tabla de clientes con score AEO + último run (`DataTableShell`); navegación al detalle.

### Slice 4 — Facet AEO en Account 360

- Tile "AEO" en el Organization Workspace con deep-link al detalle por-cliente.

### Slice 5 — Cross-sell: subject picker + run operador + foco competitivo

- Subject picker (clientes contratados + clientes sin AEO + prospectos HubSpot org-sincronizados).
- Acción "Correr AEO" sobre el target (consume `requestGraderRunAsOperator` de TASK-1277); estados preparando/ready/error.
- Detalle con **foco competitivo** (marca vs competidores / share of voice) como gancho de venta.

### Slice 6 — Enviar informe + abrir oportunidad (consume TASK-1279)

- Acción "Enviar + abrir oportunidad": recipient picker + **captura de consentimiento** (prospecto) + confirmación `propose→confirm→execute` → llama `sendAeoReportAndOpenOpportunity` (TASK-1279).
- Estados: consent requerido, enviado, deal abierto/vinculado, error honesto.

### Slice 7 — GVC + cierre

- Scenario `growth-aeo-operator`; GVC desktop + mobile mirado (gestión + cross-sell + envío); gates + docs.

## Out of Scope

- El contrato backend de status (TASK-1275).
- Mostrar el status en la vista cliente `/aeo` (follow-up TASK-1248).
- Métricas/analytics del avance del plan, notificaciones, SLA.

## Detailed Spec

Ver el wireframe + flow contract declarados. El detalle por-cliente reusa el `masterDetail` shell de TASK-1248 con un view-adapter operador (incluye recomendaciones accionables + control de status). El cockpit es un `DataTableShell` cross-cliente. El facet Account 360 sigue la receta de extensión de `ORG_CLIENT_AGENT_INVARIANTS.md`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Dos mitades con blockers distintos** (pueden cerrarse de forma independiente):
  - **Gestión del Plan AEO (Slices 1-4)** — bloqueada por **TASK-1287** (readers) + **TASK-1275** (write status). Orden interno: Slice 1 (detalle, necesita el reader operador-scoped de TASK-1287) → Slice 2 (write status, no existe sin TASK-1275) → Slice 3 (cockpit, necesita el agregado cross-org de TASK-1287) → Slice 4 (facet Account 360). Esta mitad puede **shippear sin esperar a TASK-1279**.
  - **Cross-sell/prospección (Slices 5-6)** — Slice 5 (run operador) usa TASK-1277 (complete); Slice 6 (enviar + abrir oportunidad) bloqueada por **TASK-1279**. Slice 6 NO existe sin TASK-1279.
- **Slice 7 (GVC + cierre)** corre al final de la(s) mitad(es) que se entreguen.
- Regla dura: NUNCA cerrar Slice 1/3 sin los readers de TASK-1287; NUNCA cerrar Slice 2 sin TASK-1275; NUNCA cerrar Slice 6 sin TASK-1279.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| viewCode sin seed (fallback) | identity/views | medium | seed migration en el mismo PR (TASK-827) | telemetry `role_view_fallback_used` |
| Ruta no alcanzable por nav | UI/navigation | medium | nav descriptor + route-reachability en el mismo PR | `route-reachability-gate` |
| Vista operador expuesta a `client_*` | access | low | viewCode internal + redirect defensivo si `tenantType==='client'` | revisión de grants |
| Lógica de status en el componente | parity | low | consumir command TASK-1275, no reimplementar | code review |

### Feature flags / cutover

- Sin flag de runtime: superficie nueva gateada por viewCode/capability. Cutover por grant del viewCode a roles operador. Revert: revertir el grant + PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + reverse seed migration | <10 min | sí |
| Slice 2 | revert PR (control de status) | <10 min | sí |
| Slice 3 | revert PR (cockpit) | <5 min | sí |
| Slice 4 | revert PR (facet) | <5 min | sí |
| Slice 5 | n/a (scenario/docs) | — | sí |

### Production verification sequence

1. migrate staging (viewCode seed) + verify grant a roles operador.
2. Deploy staging + verify ruta alcanzable + redirect defensivo para `client_*`.
3. GVC desktop + mobile del cockpit + detalle + control de status.
4. Smoke del write de status (command TASK-1275) end-to-end.
5. Repetir en prod.

### Out-of-band coordination required

- N/A — repo-only + migración de viewCode.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `/growth/aeo` (cockpit) + `/growth/aeo/[organizationId]` (detalle), viewCode interno seedeado (mismo PR), alcanzable por nav, NUNCA bajo `/admin` ni para `client_*`.
- [ ] El detalle reusa `masterDetail` CompositionShell + report model (no forkea layout).
- [ ] El control de estado del Plan AEO consume el command/reader de TASK-1275 (sin lógica de negocio en el componente).
- [ ] Facet "AEO" en el Organization Workspace deep-linkea al detalle por-cliente.
- [ ] Estados default/loading/empty/error/partial/denied/mobile cubiertos; copy en `growth.ts`; a11y status color-independiente + focus restore.
- [ ] GVC desktop + mobile mirado, sin scroll horizontal; `route-reachability-gate` 0 orphans.
- [ ] `UI ready` pasó a `yes` solo cuando `pnpm task:lint --task TASK-1276` queda sin findings.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm task:lint --task TASK-1276` + `pnpm ui:wireframe-check --task TASK-1276` + `pnpm ui:flow-check --task TASK-1276` + `pnpm route-reachability-gate`
- `pnpm fe:capture growth-aeo-operator` (desktop + mobile) mirado

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomar, `complete` al cerrar)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1275, TASK-1248)
- [ ] viewCode interno agregado al Design System catalog si aplica + Account 360 facet documentado

## Follow-ups

- TASK-1248 follow-up: mostrar el status del Plan AEO en la vista cliente `/aeo` (read-only).

## Open Questions

- ~~¿El detalle operador usa un reader operador-scoped distinto del client-scoped (TASK-1243)?~~ **Resuelto 2026-06-29:** sí → `readOperatorScopedAeoReport` en **TASK-1287**.
- ~~¿El cockpit cross-cliente necesita su propio reader agregado de scores por org?~~ **Resuelto 2026-06-29:** sí → `readOperatorCrossOrgAeoScores` en **TASK-1287**.
- El subject picker de cross-sell (Slice 5) necesita listar también orgs **sin** AEO + prospectos; TASK-1287 acota su agregado a orgs CON AEO. ¿De dónde sale el listado de targets sin AEO (reader de orgs/prospectos general vs extender TASK-1287)? Resolver en Discovery.

## Delta 2026-06-28 — conectada al Master UI Flow del programa AEO

- Esta task es el nodo **S8/S9/S10/S11/S12** — vista operador (cockpit, detalle, run, enviar+oportunidad, Account 360 facet) del flujo cross-surface del programa AEO. Su UI/flujo se conecta con todas las demás superficies (público → email/PDF → portal cliente tiers/PLG → operador cross-sell → Account 360) en el doc maestro **`docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md`** (info-architecture + state-design + ux-writing + modern-ui). Toda UI del programa renderiza el `ReportArtifactModel` compartido (TASK-1252) y deriva su visibilidad del **entitlement** (TASK-1277), nunca del rol; cada acción mapea a un command gobernado (Full API Parity → Nexa por construcción).

## Delta 2026-06-29 — review multi-lente (product-UI · arquitectura · comercial · AEO)

Ajustes tras revisión con las skills `greenhouse-product-ui-architect`, `arch-architect`, `commercial-expert`, `seo-aeo`:

- **Backend impact legitimado (`none` se mantiene).** El detalle y el cockpit necesitaban un reader operador-scoped + un agregado cross-org que NO existían (TASK-1277 solo expone `resolveAeoEntitlement`, no el reporte). Se separó la foundation backend en **TASK-1287** (readers `readOperatorScopedAeoReport` + `readOperatorCrossOrgAeoScores`, capability + grant), respetando la disciplina hybrid (backend-data foundation antes que ui-ux consumer). Esta task queda UI pura consumiéndolos.
- **Drift de dependencias corregido.** TASK-1277 está **complete** → fuera de `Blocked by`. Blockers reales: **TASK-1275 + TASK-1279 + TASK-1287**.
- **Slice ordering reescrito.** La hard rule referenciaba 5 slices (estructura vieja); ahora declara las **dos mitades** (gestión Slices 1-4 / cross-sell Slices 5-6) con blockers distintos y la independencia de cierre.
- **Send surface (Slice 6) — primitive + campos.** El "enviar + abrir oportunidad" es un write riesgoso de baja frecuencia: NO va embutido en el detail canvas; se modela como **AdaptiveSidecar `composer`** (o stepper/Dialog), non-modal en desktop. Además el command de TASK-1279 exige **`legalBasis` + `dealIntent`** (no solo consent + recipient) → la superficie debe capturarlos. Ver wireframe Copy Ledger.
- **Foco competitivo per-motor (AEO).** El Share of Voice se muestra **por motor** (AI Overviews / ChatGPT / Perplexity / Gemini), no como agregado único (~11% de solape de citas entre motores). Ver wireframe Region 7.
- **Subject picker — dos motions legibles (comercial).** Cliente sin AEO = Expansion (land-and-expand); prospecto = New Business. TASK-1279 ya ramifica el pipeline; la UI debe separar visualmente los dos grupos del picker.
