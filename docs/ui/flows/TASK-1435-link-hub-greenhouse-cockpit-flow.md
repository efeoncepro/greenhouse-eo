# TASK-1435 — Link Hub Greenhouse Cockpit Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1435 — Link Hub Greenhouse cockpit`
- Related wireframe: [TASK-1435-link-hub-greenhouse-cockpit.md](../wireframes/TASK-1435-link-hub-greenhouse-cockpit.md)
- Intended route / surface: `/growth/link-hubs` + `/growth/link-hubs/[pageId]`
- Flow type: `cross-route + sidecar`
- Primary primitives: CompositionShell, DataTableShell, ContextualSidecar, GreenhouseBreadcrumbs
- Copy source: `src/lib/copy/growth.ts`

## Flow Brief

- Primary user: operador Growth/Social con acceso a una o más marcas.
- Entry moment: necesita crear, actualizar, publicar o revisar un Link Hub.
- Successful outcome: una versión validada queda publicada y su URL/health se ve en Greenhouse.
- Primary decision/action: `Publicar cambios` mediante command confirmado.
- Non-goals: cambiar DNS del cliente directamente, publicar contenido social o editar código.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| `/growth/link-hubs` | queue | tabla de páginas/estado | lista densa | DataTableShell |
| `/growth/link-hubs/[pageId]` | workbench | editor + preview lane | editor + preview drawer temporal | CompositionShell |
| preview sidecar | comparación | in-flow, non-modal | drawer temporal | ContextualSidecar |
| publish confirmation | riesgo bajo/medio | confirm gobernado | confirm gobernado | dialog/sidecar canónico según mapping final |

## Flow Map

1. Entry: usuario abre la queue y ve sólo marcas autorizadas.
2. Create/select: crea página para una marca o abre una existente.
3. Edit: modifica draft, reordena bloques por controles accesibles y observa preview del mismo projection contract.
4. Validate: el sistema enumera errores/warnings; errores bloquean publish.
5. Confirm: usuario revisa versión/destino y confirma `publishLinkHubVersion`.
6. Completion: URL y version ID actualizan estado; preview cambia a “publicado”.
7. Domain: usuario solicita custom domain, copia record exacto y Greenhouse verifica hasta `active`.
8. Analytics/history: lee eventos agregados y puede previsualizar/restaurar una versión anterior mediante confirm.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Crear Link Hub | queue | detail nuevo | Enter/Space | brand required |
| Editar bloque | editor | editor state | focus controls | autosave/draft command según task |
| Reordenar | block list | new order | subir/bajar buttons | drag opcional, nunca único |
| Vista previa | editor | sidecar/drawer | Enter | no roba foco |
| Publicar | dock | confirm -> command | Enter/Space | propose-confirm-execute |
| Restaurar versión | history | confirm -> command | Enter/Space | crea nueva published version |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| list | queue visible | route load | select/create | tenant-safe |
| editing_clean | draft coincide | detail load/publish | edit | published status visible |
| editing_dirty | cambios pendientes | edit/reorder | save/discard | dirty guard |
| validating | validación de draft | publish | pass/fail | pending feedback |
| publish_blocked | errores | validation fail | fix | findings accionables |
| confirming | versión lista | validation pass | confirm/cancel | consequences explicit |
| publishing | command activo | confirm | success/error | disabled duplicate submit |
| published | nueva versión vigente | command success | edit | announce success |
| domain_pending | DNS externo pendiente | add domain | active/error/disable | exact records |
| error | command/read failed | failure | retry | draft preserved |

## Routing Contract

- Route changes: list -> detail by stable `pageId`.
- Canonical URL: `/growth/link-hubs/[pageId]` for operator workbench.
- Deep-link behavior: tab/section may use query param only if reload-safe and documented in implementation.
- Back button behavior: returns to queue; dirty state prompts before destructive exit.
- Reload behavior: rehydrates saved draft; unsaved client-only state must not be implied durable.
- Shareability: operator URL requires auth/capability; public URL is separate.

## Focus & Accessibility

- Initial focus: H1 on route change; selected block heading when editing.
- Escape behavior: closes temporary preview/confirm and restores trigger focus; never discards draft.
- Click-away behavior: preview may close; dirty editor/confirm never silently discards.
- Focus restore: to originating control after preview/confirm.
- Modal vs non-modal semantics: desktop preview non-modal; mobile preview temporary drawer; publish confirm uses canonical modal semantics.
- Screen reader announcement: validation and publish outcome via polite live region; errors summarized and linked.
- Keyboard traversal: queue -> header -> editor -> reorder controls -> preview -> publish.
- Reduced motion: no status depends on animation; rich shell respects preference.

## Data & Command Boundaries

- Readers: `listLinkHubPages`, `readLinkHubPage`, `readLinkHubPreview`, domain and analytics readers from child tasks.
- Commands: create/update draft/reorder/publish/rollback from `TASK-1433`; add/verify/disable domain from `TASK-1436`.
- API routes: thin Product API adapters defined by backend tasks.
- Optimistic updates: local editor may reflect safe draft changes; publish/domain state waits for server result.
- Cache / invalidation: invalidate page/list/projection on successful commands; public cache purged/version-keyed.
- Audit / signals: publish/rollback/domain transitions append audit/outbox; errors captured by domain.
- Tenant / access boundary: brand/organization/space scope resolved server-side, never trusted from route alone.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | no access to brand/page | back to queue | anti-oracle |
| invalid URL/block | publish blocked with exact field | edit | no public partial publish |
| command conflict | newer draft/version exists | reload/compare | optimistic concurrency |
| publish failed | previous published stays live | retry | zero blank page |
| DNS pending | records + last check | recheck | not labeled error early |
| TLS error | domain inactive; default URL remains | correct DNS/retry | fallback safe |
| analytics delayed | freshness visible | retry later | no false zero |

## GVC Scenario Plan

- Scenario: queue -> edit -> preview -> validation -> publish -> domain/history.
- Scenario file: `scripts/frontend/scenarios/link-hub-cockpit.scenario.ts`
- Route: `/growth/link-hubs` and fixture detail.
- Viewports: desktop 1440 + mobile 390.
- Required steps: create/select, keyboard reorder, preview, blocked publish, successful publish, domain pending, rollback preview.
- Required captures: queue, dirty editor, preview, validation, published, domain pending/active, history.
- Required `data-capture` markers: `link-hub-list`, `link-hub-editor`, `link-hub-preview`, `link-hub-publish-bar`, `link-hub-domain`, `link-hub-history`.
- Assertions: no login redirect, no error boundary, dirty state preserved, focus restored, no horizontal overflow.
- Scroll-width checks: `scrollWidth <= clientWidth` at 1440/390.
- Accessibility/focus checks: keyboard complete path and dialog/drawer semantics.
- Reduced-motion evidence: same state transitions with animations disabled.

## Design Decision Log

- Decision: queue + stable detail route + preview sidecar, with server-governed publish/rollback.
- Alternatives considered: single modal editor, autosave directly to published, separate Vercel/domain dashboard.
- Why this pattern: repeated operator workflow requires context, safe draft boundary and observable publish state.
- Reuse / extend / new primitive: reuse; no platform primitive introduced.
- Open risks: concurrency across operators and DNS polling cadence require backend contracts before UI ready.
- Follow-up: client users reuse identical flow under narrower capabilities.

## Acceptance Checklist

- [ ] The owning task declares this file in `Flow`.
- [ ] Every surface has desktop and compact behavior.
- [ ] Opening, closing, escape and focus restore are specified.
- [ ] Route/deep-link/back-button behavior is explicit.
- [ ] Data readers/commands are named and UI-only business logic is avoided.
- [ ] Failure paths are user-safe and do not expose internals.
- [ ] GVC sequence captures prove the flow, not only static screens.
- [ ] Design decision log explains why the flow uses these surfaces/routes.
