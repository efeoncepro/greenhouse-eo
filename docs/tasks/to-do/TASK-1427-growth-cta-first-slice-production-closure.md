# TASK-1427 — Growth CTA first-slice production closure

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1427-growth-cta-first-slice-production-closure.md`
- Flow: `docs/ui/flows/TASK-1427-growth-cta-first-slice-production-closure-flow.md`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-023`
- Status real: `Definida`
- Rank: `1`
- Domain: `growth|public-site|ops`
- Blocked by: `none`
- Branch: `task/TASK-1427-growth-cta-first-slice-production-closure`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra honestamente la primera rebanada ya operativa del motor CTA: monta el mismo `<greenhouse-cta>` publicado en WordPress, prueba Think + WordPress de extremo a extremo, confirma la llegada consent-aware a GA4, observa las señales productivas durante siete días y sincroniza lifecycle/documentación con el runtime real.

## Why This Task Exists

TASK-1339/1340 están en `complete/` y Think está live, pero la promesa original era portabilidad Think + WordPress. WordPress sigue sin placement, `dataLayer` no prueba por sí solo llegada a GA4 y varios documentos aún declaran flag OFF/rollout pendiente. Estas son evidencias de un único cutover; separarlas en tasks produciría ceremonia sin ownership adicional.

## Goal

- WordPress consume el mismo contrato y renderer que Think, sin lógica CTA local.
- Render, apertura de Growth Form, ingest y medición quedan probados en ambas superficies.
- Se conserva un baseline visual/interaction del renderer actual en ambos hosts para comparar TASK-1429/1431 sin confundir enriquecimiento con regresión de portabilidad.
- El cierre de siete días y los documentos canónicos reflejan la verdad productiva.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md`
- `docs/architecture/public-site/PRIMITIVES.md`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`

Reglas obligatorias:

- WordPress es host; Greenhouse conserva contrato, targeting, acción y medición.
- Reusar el bundle publicado y `open_growth_form`; cero snippet de lógica o copy divergente.
- No declarar GA4 verificado solo por `dataLayer`: exigir `/g/collect` consentido + realtime/readback.
- No publicar cambios WordPress sin snapshot, rollback y QA live gobernada.

## Normative Docs

- `docs/manual-de-uso/growth/operar-motor-cta.md`
- `docs/tasks/complete/TASK-1339-growth-cta-engine-foundation.md`
- `docs/tasks/complete/TASK-1340-growth-cta-portable-renderer-surfaces.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- Renderer/API/CTA publicados por TASK-1339/1340.
- Surface WordPress ya registrada y credencial disponible por el carril secreto vigente.
- GTM v4 y dimensiones GA4 ya publicadas.

### Blocks / Impacts

- Cierra la primera rebanada vertical de EPIC-023; no cierra el V1 completo.
- Desbloquea usar WordPress como superficie productiva del motor.

### Files owned

- Host/plugin WordPress aplicable `[verificar en discovery operativo]`
- `docs/tasks/complete/TASK-1339-growth-cta-engine-foundation.md`
- `docs/tasks/complete/TASK-1340-growth-cta-portable-renderer-surfaces.md`
- `docs/epics/to-do/EPIC-023-growth-cta-popup-cro-engine.md`
- `docs/documentation/growth/motor-cta-popup.md`
- `docs/manual-de-uso/growth/operar-motor-cta.md`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `Handoff.md`

## Current Repo State

### Already exists

- Think productivo renderiza el CTA y emite `greenhouse_cta_viewed`.
- Bundle/API/flag/GTM y surface WordPress existen.
- Manual contiene snippet base de embed.

### Gap

- WordPress no monta el CTA; no existe prueba GA4 consentida ni ventana steady-state cerrada; docs/lifecycle divergen.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/growth-cta-renderer/**` + host WordPress + Think
- Future candidate home: `public`
- Boundary: contrato publicado de Growth CTA y custom element canónico; los hosts solo configuran surface/placement
- Server/browser split: secrets y arbitración server-side; browser recibe contrato browser-safe
- Build impact: bundle existente, sin dependencia nueva
- Extraction blocker: credencial/origin/CSP y operación multi-repo WordPress/Think

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: visitante público
- Momento del flujo: follow-up contextual tras consumir contenido o informe
- Resultado perceptible esperado: CTA consistente abre el Growth Form gobernado
- Friccion que debe reducir: host sin CTA o CTA divergente
- No-goals UX: rediseñar el card, crear popup o cambiar copy

### Surface & system decision

- Surface: WordPress público + Think de control
- Composition Shell: `no aplica` — Web Component embebido en host público
- Primitive decision: `reuse` — `<greenhouse-cta>` TASK-1340
- Adaptive density / The Seam: `heredado` — container queries del renderer
- Floating/Sidecar/Dialog decision: reusa apertura de Growth Form existente
- Copy source: contrato publicado + `src/lib/copy/growth.ts`
- Access impact: `none`

### State inventory

- Default: CTA visible
- Loading: skeleton reservado
- Empty: fail-closed sin card
- Error: `greenhouse_cta_error`, sin error crudo
- Degraded / partial: host sin autorización no muestra CTA
- Permission denied: n/a público
- Long content: contrato vigente
- Mobile / compact: 390px sin overflow
- Keyboard / focus: CTA y cierre/form accesibles
- Reduced motion: comportamiento existente del renderer

### Interaction contract

- Primary interaction: CTA → `open_growth_form`
- Hover / focus / active: renderer existente
- Pending / disabled: una activación por interacción
- Escape / click-away: delegado al Growth Form
- Focus restore: al CTA al cerrar el form
- Latency feedback: loading existente
- Toast / alert behavior: errores inline/fail-closed

### Motion & microinteractions

- Motion primitive: `none` nuevo; reuso exacto del renderer
- Enter / exit: existente
- Layout morph: n/a
- Stagger: n/a
- Timing / easing token: existente
- Reduced-motion fallback: existente
- Non-goal motion: no alterar motion en este rollout

### Implementation mapping

- Route / surface: placement WordPress aprobado + Think `/brand-visibility/r/*`
- Primitive / variant / kind: `<greenhouse-cta placement='embedded'>`
- Component candidates: renderer existente; host wrapper mínimo
- Copy source: contrato publicado
- Data reader / command: APIs públicas CTA existentes
- API parity: host es consumer del primitive
- Access / capability: surface binding + embed key + origin
- States to implement: configuración host; cero estados nuevos

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task-1427-growth-cta-wordpress-closure.scenario.ts`
- Route: URL WordPress aprobada + reporte Think de control
- Viewports: 1440 y 390
- Required steps: load, CTA visible, foco, abrir/cerrar form
- Required captures: default + form abierto
- Baseline contract: capturar `default|spotlight|minimal` disponibles, wide/390, asset/no-asset y form-open cuando existan fixtures válidos; registrar hashes/rutas como referencia, no como baseline visual rígido entre hosts con temas distintos
- Required `data-capture` markers: host/CTA/form cuando el host permita
- Assertions: bundle/API 200, sin consola, sin error boundary, evento emitido
- Scroll-width checks: `scrollWidth == clientWidth`
- Reduced-motion / focus evidence: focus restore y media reduce

### Design decision log

- Decision: completar la segunda surface sin cambiar diseño/contrato
- Alternatives considered: CTA manual WordPress; iframe; nueva variante
- Why this pattern: prueba portabilidad real y evita fork
- Reuse / extend / new primitive: reuse
- Open risks: CSP/cache/credencial y consentimiento analítico

### Visual verification

- GVC scenario: `task-1427-growth-cta-wordpress-closure`
- Viewports: 1440/390
- Required captures: CTA + form abierto en WP; control Think
- Required `data-capture` markers: según host
- Scroll-width check: obligatorio
- Accessibility/focus checks: teclado, Escape y restauración
- Before/after evidence: WordPress sin/con embed
- Known visual debt: ninguna aceptada para el cierre

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: sin cambio; `greenhouse_growth.cta_*` sigue autoritativo
- Consumidores afectados: WordPress, Think, GTM/GA4
- Runtime target: `production|external`

### Contract surface

- Contrato existente a respetar: `greenhouse-growth-cta-popup.v1`
- Contrato nuevo o modificado: ninguno
- Backward compatibility: `compatible`
- Full API parity: ambos hosts consumen el mismo render/event API

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna migration
- Invariantes que no se pueden romper:
  - ningún secreto se imprime o persiste en HTML/documentación
  - solo `server_confirmed` cuenta como conversión real
- Tenant/space boundary: superficie pública autorizada por binding/origin/key
- Idempotency/concurrency: ingest existente
- Audit/outbox/history: ledger CTA existente + signals

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: flag ya ON; rollback por host removal o flag OFF
- Backfill plan: n/a
- Rollback path: retirar embed WP; emergencia global `GROWTH_CTA_ENGINE_ENABLED=false` + redeploy
- External coordination: placement WordPress, snapshot/rollback, cache purge y consentimiento

### Security and access

- Auth/access gate: surface binding + embed key + origin
- Sensitive data posture: secreto de embed; nunca exponer valor
- Error contract: errores canónicos/fail-closed
- Abuse/rate-limit posture: ingest existente

### Runtime evidence

- Local checks: tests focales renderer/contract
- DB/runtime checks: render/ingest productivo + signals siete días
- Integration checks: WordPress y Think, GTM Preview, `/g/collect`, GA4 realtime
- Reliability signals/logs: `growth.cta.*`
- Production verification sequence: snapshot → embed → QA → analytics → steady-state → docs

## Hybrid Execution Justification

- Why not split: no hay código backend nuevo; UI host, integración y evidencia forman un único cutover reversible.
- Primary execution profile: `ui-ux`
- Contract boundary: renderer/API/ledger existentes quedan inmutables.
- Risk controls: snapshot WordPress, flag global, pruebas cross-surface y monitoreo siete días.

<!-- ZONE 2 — PLAN MODE intentionally empty -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — WordPress host

- Aprobar placement, snapshot y rollback; montar el renderer existente sin lógica local.
- Verificar CSP, cache, origin, bundle y contrato.

### Slice 2 — End-to-end evidence

- Ejecutar GVC/browser desktop+mobile en WordPress y control Think.
- Probar render, form open/close, ingest, `dataLayer`, `/g/collect` con consentimiento y GA4 realtime/readback.

### Slice 3 — Steady-state y cierre

- Observar `growth.cta.*` durante siete días y clasificar cualquier finding.
- Sincronizar task/epic, documentación, manual, tracking plan, flag ledger y Handoff.

## Out of Scope

- Popup/slide-in, frequency capping, nuevos actions o rediseño.
- Corregir el timeout global de CI.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → ventana de 7 días → Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| CSS/CSP/cache del host rompe renderer | WordPress | medium | snapshot + GVC + rollback embed | `growth.cta.render_error_rate` |
| Tag existe pero no llega a GA4 | GTM/GA4 | medium | consentimiento + `/g/collect` + realtime | ausencia de evento |
| Forja/errores tras ampliar surface | CTA ingest | low | binding/origin/key + 7d | `growth.cta.surface_unauthorized_attempt` |

### Feature flags / cutover

- Reusa `GROWTH_CTA_ENGINE_ENABLED`; no introduce flags.
- Rollback preferente: retirar host embed; emergencia: flag OFF + redeploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| WordPress host | restaurar snapshot/retirar embed y purgar cache | <15 min | si |
| Evidencia | sin state de negocio; detener smoke | inmediato | si |
| Docs | revert commit documental | <5 min | si |

### Production verification sequence

1. Snapshot y placement aprobados.
2. Embed + cache purge; bundle/render API 200.
3. GVC 1440/390, teclado/foco/overflow.
4. GTM Preview + `/g/collect` consentido + GA4 readback.
5. Monitorear signals siete días.
6. Cerrar lifecycle/docs solo con evidencia completa.

### Out-of-band coordination required

- Operación WordPress/Kinsta y aprobación del placement.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] WordPress y Think renderizan el mismo CTA/contrato sin lógica ni copy duplicados.
- [ ] Queda evidencia baseline mirada de anatomía, appearances, responsive container, focus y form-open en ambos hosts para la comparación de TASK-1429/1431.
- [ ] CTA→Growth Form funciona con teclado, Escape/focus restore y sin overflow en 1440/390.
- [ ] Render/event ingest y rechazo de credencial inválida se verifican productivamente.
- [ ] `greenhouse_cta_viewed` se observa en `dataLayer`, request `/g/collect` consentido y GA4 realtime/readback.
- [ ] Signals `growth.cta.*` permanecen steady o tienen findings resueltos/documentados durante siete días.
- [ ] Task/epic/docs/manual/tracking plan/flag ledger/Handoff coinciden con el runtime.
- [ ] `pnpm task:lint --task TASK-1427` y gates UI pasan sin findings.

## Verification

- `pnpm exec vitest run src/lib/growth/ctas src/growth-cta-renderer`
- `pnpm task:lint --task TASK-1427`
- `pnpm ui:wireframe-check --task TASK-1427`
- `pnpm ui:flow-check --task TASK-1427`
- `pnpm fe:capture task-1427-growth-cta-wordpress-closure --env=production`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] Lifecycle/carpeta/README/registry/EPIC-023 sincronizados.
- [ ] `Handoff.md` y `changelog.md` registran evidencia y riesgos residuales.
- [ ] `greenhouse-qa-release-auditor` emite PASS o CONDITIONAL PASS sin blocker.
- [ ] Chequeo de impacto cruzado completado.

## Follow-ups

- TASK-1428, TASK-1429 y TASK-1430 completan el V1; no bloquean este cierre.
