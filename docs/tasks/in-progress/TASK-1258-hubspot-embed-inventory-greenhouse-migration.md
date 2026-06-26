# TASK-1258 — HubSpot Embed Inventory + Greenhouse Forms Migration Control Plane

## Delta 2026-06-26 (sesión Claude — precondiciones de TASK-1259 SHIPPED, resto diferido)

- **Decisión operador 2026-06-26: construir las 2 precondiciones backend de TASK-1259 PRIMERO** (no el inventory/dry-run/apply/cutover). Entregado local-first (develop, sin push, commit `5746e4908`):
  - **(1) Catálogo externo gobernado** — reader `listInsertableFormCatalog(surface)` ([src/lib/growth/forms/readers.ts](../../../src/lib/growth/forms/readers.ts)) + endpoint público cross-origin `GET /api/public/growth/forms/catalog` ([route](../../../src/app/api/public/growth/forms/catalog/route.ts)), flag nuevo `GROWTH_FORMS_CATALOG_API_ENABLED` (default OFF → 404). Metadata editor-safe (`displayName/formSlug/version/versionStatus/surfaceIds/destinationReadiness`), `destinationReadiness` honest-degradation. Un reader, muchos consumers.
  - **(2) Modelo de auth del editor externo (Opción A elegida por el operador — reusar la primitiva existente):** credencial per-site = embed key de la surface (`form_host_surface.embed_key_id` + sha256 `embed_key_hash`) + origin allowlist. `embed-key.ts` (mint/verify timing-safe, fail-closed) + command `setSurfaceEmbedKey` + CLI `pnpm growth:forms:embed-key`. Secreto server-side en el plugin; el catálogo EXIGE embed key provisionada (401 sin ella).
  - **Gates:** 12 tests focales + `pnpm test` full 8195/0 + `pnpm build` OK + tsc/lint limpios + flag-audit 0. Ledger actualizado.
- **DIFERIDO (sigue pendiente en esta task, NO cerrado):** Slice 1 inventory WP read-only · Slice 2 mapping · Slice 3 dry-run · Slice 4 apply allowlist · y el **cutover productivo** (swap embed `/diseno-de-sitios-web/` + flip prod de `GROWTH_FORMS_PUBLIC_API_ENABLED`+`SERVER_VALIDATION` juntos + destino `de4593c3` `disabled`→`direct`) = rollout operador-coordinado out-of-band. Por eso la task queda `in-progress`, no `complete`.
- **TASK-1259** desbloqueada en su precondición backend (el catálogo + auth existen); sigue gated por su propio scope UI + por provisionar la embed key real de la surface WP.

## Delta 2026-06-26

- **Esta task hereda las patas "página WordPress viva" de TASK-1232 (cerrada complete) y el cutover real de TASK-1261.** TASK-1232 quedó complete con su gate #1 (→destination full-loop) probado live contra un HubSpot TEST form (`836277c5`) vía `dispatchPendingSubmissions`; lo que falta es el mundo real: (a) **swap del embed** del form "Lead Gen - Web" en `/diseno-de-sitios-web/` (HubSpot embed → `<greenhouse-form>`), (b) **smoke del submit + dataLayer en la página padre viva**, (c) el **cutover productivo del destino** de TASK-1261 (`delivery_mode='disabled'`→`'direct'` apuntando al GUID productivo `de4593c3`) **bundle con el flip prod de los flags** `GROWTH_FORMS_PUBLIC_API_ENABLED` **+** `GROWTH_FORMS_SERVER_VALIDATION_ENABLED` (decisión operador 2026-06-26: en prod ambos están OFF/sin tráfico → deben flipearse juntos en este launch para que el primer submit prod nazca validado; flipearlos sueltos antes es no-op no-verificable). El form gobernado + destino ya están sembrados (TASK-1261); el delivery loop ya está probado (solo falta el form productivo real + el embed vivo).
- **Precondición backend para TASK-1259 explicitada (revisión arquitectónica 2026-06-26).** El selector WordPress de `TASK-1259` consume dos contratos que hoy NO existen y que esta task debe entregar (su goal ya dice "dejar listo el insumo backend para el editor/selector de TASK-1259", pero no los enumeraba): (1) **reader/endpoint gobernado de catálogo externo** de forms publicados/insertables (`displayName`, `formSlug`, `version`, `versionStatus`, `surfaceId(s)`, `destinationReadiness`), consumible cross-origin por el plugin WordPress, Nexa/MCP y futuros hosts — los readers actuales no cubren el caso: `getPublishedRenderContract` es por-slug y `listFormsAdmin`/`listHostSurfacesAdmin` son admin/session-gated; (2) **modelo de auth del editor externo** (credencial per-site server-side en el plugin + allowlist de origins + scope read-only de catálogo), decisión Safety hard-to-reverse. Acción: incorporar ambos al scope/`Backend/Data Contract` antes de cerrar o crear follow-up explícito si se difiere. `TASK-1259` queda `blocked` hasta que existan (un reader, muchos consumers — Full API Parity).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|public-site|hubspot|wordpress`
- Blocked by: `TASK-1232`
- Branch: `task/TASK-1258-hubspot-embed-inventory-greenhouse-migration`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea el control plane backend/data para inventariar los embeds HubSpot actuales del sitio Efeonce y migrarlos a Growth Forms gobernados por Greenhouse. La task toma el patron operativo del plugin HubSpot All-In-One Marketing: WordPress debe ser un adapter fino, mientras Greenhouse mantiene definiciones, versiones, surfaces, destinos, ledger y observabilidad.

## Why This Task Exists

El sitio Efeonce hoy carga HubSpot directo en WordPress: tracking global, embeds de form y un form activo (`b76c4bba-22d4-497a-9714-5946efa5c730`, "Lead Gen - Hubspot x Efeonce") en paginas como `/servicios-contratar-hubspot/` y `/contacto/`. Si reemplazamos eso a mano, terminamos con otro stack acoplado al sitio. Greenhouse ya tiene el motor de forms, renderer portable y adapter HubSpot seguro; falta el puente gobernado para saber que hay en WordPress, mapearlo a `formSlug`/surface/version y ejecutar una migracion reversible.

## Goal

- Inventariar embeds HubSpot existentes en WordPress: shortcodes, bloques, Elementor widgets, scripts `forms/embed`, assets `js.hsforms.net` y content embed.
- Crear un contrato de mapping `HubSpot embed -> Greenhouse form definition/version/surface/destination` sin copiar codigo del plugin HubSpot.
- Entregar comandos/readers dry-run-first para proponer, revisar y aplicar una migracion controlada de embeds a `<greenhouse-form>`.
- Registrar evidencia operativa: que form se migraria, donde aparece, que destino HubSpot conserva, que riesgos de SEO/CMS existen y como se revierte.
- Dejar listo el insumo backend para el editor/selector WordPress de **TASK-1259**.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`
- `docs/documentation/growth/motor-formularios-publicos.md`

Reglas obligatorias:

- No copiar codigo GPL del plugin HubSpot; solo usarlo como referencia arquitectonica/patron de adapter.
- El plugin HubSpot `leadin` queda **read-only**: no patch, no fork, no override, no monkey patch.
- WordPress no es source of truth: solo descubre, monta y reporta estado. Definiciones, versiones, destinos, consent y delivery viven en Greenhouse.
- Ningun patch a WordPress se aplica sin `dry-run`, diff revisable, allowlist de posts/pages y rollback documentado.
- El destino HubSpot se conserva via el adapter seguro de Greenhouse (`TASK-1230`), no via embeds directos `hbspt.forms.create`.
- Tracking propio de Greenhouse queda fuera de esta task; se discute en una task/ADR posterior.

## Normative Docs

- `.codex/skills/efeonce-public-site-wordpress/SKILL.md`
- `.codex/skills/hubspot-greenhouse-bridge/SKILL.md`
- `.codex/skills/wp-wpcli-and-ops/SKILL.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1229` Growth Forms Backend/API Parity Foundation.
- `TASK-1230` Growth Forms HubSpot Secure Submit Adapter.
- `TASK-1231` Growth Forms Portable Renderer + Host Surfaces.
- `TASK-1232` Growth Forms Admin Cockpit + First Migration (coordinar: no duplicar el first migration en curso).
- WordPress Efeonce runtime accesible por SSH/WP-CLI para discovery read-only.

### Blocks / Impacts

- `TASK-1259` WordPress/Elementor/Gutenberg Greenhouse Form Selector + Embed UX.
- Futuro reemplazo progresivo del plugin `leadin`/HubSpot embed directo en WordPress.
- Futuro debate de tracking propio Greenhouse (out of scope aqui, pero alimentado por el inventario).

### Files owned

- `scripts/public-website/discover-wordpress.ts`
- `scripts/public-website/wpcli-remote.ts`
- `scripts/public-website/bridge-inspect.ts`
- `scripts/public-website/bridge-draft-contract.ts`
- `scripts/public-website/deploy-dry-run.ts`
- `src/lib/growth/forms/readers.ts`
- `src/lib/growth/forms/commands.ts`
- `src/lib/growth/forms/contracts.ts`
- `src/lib/growth/forms/destinations/hubspot/**`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/documentation/growth/motor-formularios-publicos.md`

## Current Repo State

### Already exists

- `src/lib/growth/forms/**` con contracts, commands, readers, policy compiler, dispatcher y adapter HubSpot seguro.
- `src/growth-forms-renderer/**` con Web Component portable.
- `src/app/api/public/growth/forms/[formSlug]/route.ts` y `submit/route.ts`.
- Scripts de inspeccion/control del sitio publico bajo `scripts/public-website/**`.
- WordPress host surface ya existe como direccion arquitectonica por `TASK-1231`.

### Gap

- No existe inventario canonico de embeds HubSpot reales del sitio Efeonce.
- No existe mapping revisable de `portalId/formId/page/widget` a `Greenhouse formSlug/surface/version/destination`.
- No existe comando dry-run/apply para reemplazar embeds HubSpot por embeds Greenhouse de forma segura.
- No existe evidencia operacional de que retirar `hbspt.forms.create` no rompe paginas, formularios ni handoff comercial.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: registry de form surfaces/migration plan del motor Growth Forms
- Consumidores afectados: WordPress public site, renderer portable, HubSpot secure submit adapter, admin cockpit
- Runtime target: `production` public-site + Greenhouse production/staging

### Contract surface

- Contrato existente a respetar: `greenhouse-growth-public-forms.v1`
- Contrato nuevo o modificado: reader `listExternalFormEmbeds`, command `draftExternalFormMigrationPlan`, command `applyExternalFormMigrationPlan` (nombres finales a decidir en Plan)
- Backward compatibility: `gated` — discovery/dry-run no cambia runtime; apply solo allowlist
- Full API parity: la migracion se modela como capability/command, no como script manual suelto

### Data model and invariants

- Entidades/tablas/views afectadas: form definitions, form surfaces, destination bindings, migration audit records si el Plan decide persistirlos
- Invariantes que no se pueden romper:
  - Form definition version publicada es inmutable.
  - WordPress page/post content no se modifica sin snapshot y rollback.
  - Destination HubSpot conserva portal/form mapping mediante Greenhouse, no mediante script HubSpot directo.
  - Un form puede estar en varias surfaces; surface id/origin se preserva en submissions.
- Tenant/space boundary: Efeonce public site only, no clientes externos en esta primera ola.
- Idempotency/concurrency: `apply` debe ser idempotente por page/post/widget + migration plan id.
- Audit/outbox/history: cada apply registra actor, plan id, before hash, after hash y rollback artifact.

### Migration, backfill and rollout

- Migration posture: `additive` hasta el apply; apply modifica WordPress content solo por allowlist.
- Default state: `dry-run only`.
- Backfill plan: no backfill de submissions historicos; solo migracion forward de embeds.
- Rollback path: restore snapshot de post/widget/template + revert PR si aplica.
- External coordination: ventana de edicion WordPress/Kinsta y revision humana de paginas afectadas.

### Security and access

- Auth/access gate: comandos internos/admin-only; WP-CLI remoto solo con credenciales ya autorizadas.
- Sensitive data posture: evitar descargar submissions/PII; inventario solo metadata de embeds/pages.
- Error contract: errores canonicos, sin publicar credenciales ni payloads WordPress crudos.
- Abuse/rate-limit posture: N/A para commands internos; public forms siguen protegidos por el motor.

### Runtime evidence

- Local checks: tests de parser/mapping/dry-run con fixtures de shortcode, block, Elementor y script embed.
- DB/runtime checks: reader devuelve mapping esperado para el form activo `b76c4bba-22d4-497a-9714-5946efa5c730`.
- Integration checks: WP-CLI read-only contra staging/prod; dry-run genera patch plan sin aplicar.
- Reliability signals/logs: `growth.forms.external_embed_inventory_count`, `growth.forms.external_migration_plan_ready`, `growth.forms.external_migration_apply_failed`.
- Production verification sequence: ver Rollout.

### Acceptance criteria additions

- [ ] Inventario detecta shortcodes/bloques/widgets/script embeds HubSpot sin falsos positivos obvios.
- [ ] Mapping propone `formSlug`, destination HubSpot y surface para cada embed conocido.
- [ ] Dry-run produce diff revisable y rollback artifact antes de cualquier apply.
- [ ] Apply allowlist modifica solo paginas aprobadas y preserva submission path via Greenhouse.
- [ ] El plugin HubSpot puede permanecer instalado durante coexistencia sin doble submit/doble embed.

## Capability Definition of Done — Full API Parity gate

- [ ] Discovery, plan y apply son readers/commands gobernados o scripts thin wrappers sobre readers/commands.
- [ ] La UI/cockpit/CLI consumen el mismo contrato de migration plan.
- [ ] Ninguna accion critica vive solo en WP admin o en un script ad hoc.
- [ ] Observabilidad y rollback forman parte del command contract.
- [ ] Parity check = SI.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — HubSpot embed inventory

- Extender o crear inspector read-only que detecte: `leadin` shortcodes, HubSpot blocks, Elementor `hubspot-form`, `hbspt.forms.create`, `js.hsforms.net/forms/embed`, `forms/embed/{portalId}.js`.
- Emitir un snapshot normalizado: page/post/template id, URL, embed type, portal id, form id, form name si existe, widget/block context, hashes y confidence.

### Slice 2 — Greenhouse mapping contract

- Mapear cada embed inventariado a `formSlug`, `formVersion`, `surfaceId`, `destinationBinding` y rollout state.
- Reusar el adapter HubSpot seguro para que HubSpot siga recibiendo leads, pero desde Greenhouse.
- Crear fixtures con el form activo de Efeonce (`b76c4bba-22d4-497a-9714-5946efa5c730`) y paginas conocidas.

### Slice 3 — Dry-run migration plan

- Generar patch plan reversible para shortcode/block/Elementor/script embed.
- Producir diff y rollback artifact por cada pagina/widget/template.
- Bloquear apply si falta mapping, si hay doble embed en la misma surface o si el destino HubSpot no esta verificado.

### Slice 4 — Apply allowlist + verification hooks

- Implementar apply idempotente por allowlist.
- Integrar smoke posterior: pagina carga `<greenhouse-form>`, submission test llega a Greenhouse ledger, destination attempt queda queued/delivered/skipped segun flags.
- Registrar signals y handoff operativo.

## Out of Scope

- Construir el selector/editor visual de WordPress/Elementor/Gutenberg → **TASK-1259**.
- Reemplazar el tracking global HubSpot por motor propio Greenhouse.
- Modificar el plugin HubSpot `leadin` o cualquier archivo de ese plugin.
- Retirar/desinstalar el plugin `leadin` de WordPress.
- Migrar submissions historicos desde HubSpot.
- Redisenar forms o copy comercial; esta task conserva comportamiento salvo el pipeline de submit.

## Detailed Spec

El plugin HubSpot muestra una arquitectura util: WordPress mantiene bootstrap, settings, shortcode/block/widget e inyeccion de assets; la logica real vive en HubSpot remoto. Greenhouse debe copiar el patron de frontera, no la implementacion: WordPress queda como adapter fino y Greenhouse como source of truth. El migration plan debe aceptar coexistencia: HubSpot tracking/form embeds pueden seguir cargando mientras se migra una pagina, pero un mismo form/surface no puede hacer doble submit. El estado final deseado es que el contenido WordPress monte `<greenhouse-form form-slug="..." surface-id="...">` o el wrapper equivalente, y que el submit pase por `submitForm` + dispatcher + HubSpot secure submit adapter.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (inventory) -> Slice 2 (mapping) -> Slice 3 (dry-run) -> Slice 4 (apply allowlist).
- Slice 4 no puede ejecutarse si Slice 3 no genero rollback artifact.
- TASK-1259 puede empezar diseno UX despues de Slice 2, pero no debe shippear apply visual sin Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Doble submit por coexistencia HubSpot embed + Greenhouse form | public-site / hubspot | medium | detector de doble embed + apply bloquea si surface queda duplicada | `growth.forms.external_double_embed_detected` |
| Patch WordPress rompe contenido Elementor/Gutenberg | wordpress | medium | dry-run diff + snapshot rollback + allowlist por pagina | smoke visual/post hash mismatch |
| Mapping equivocado manda leads al form/destino incorrecto | hubspot / crm | medium | destino verificado, form id allowlist, smoke con lead test | `growth.forms.destination_mismatch` |
| Inventario omite un embed activo | public-site | medium | combinar WP-CLI content scan + frontend crawl + network scan | count difiere entre scan CMS y crawl |
| Tracking propio se mezcla prematuramente con migracion de forms | analytics | high | out of scope explicito; solo eventos existentes del renderer | no signal — review de plan |

### Feature flags / cutover

- Usar flags existentes de Growth Forms public API y HubSpot secure submit (`GROWTH_FORMS_PUBLIC_API_ENABLED`, `GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED`) segun estado real.
- Si el apply necesita flag propio, crearlo default OFF: `GROWTH_FORMS_EXTERNAL_EMBED_MIGRATION_ENABLED`.
- Cutover por pagina/surface, nunca global.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR/script; no runtime mutation | <5 min | si |
| Slice 2 | revert mapping/plan; no runtime mutation | <5 min | si |
| Slice 3 | descartar dry-run artifacts | <5 min | si |
| Slice 4 | restore WordPress snapshot por page/widget + flag OFF si aplica | <15 min | si |

### Production verification sequence

1. WP-CLI read-only inventory staging/prod + snapshot versionado en artifact gitignored.
2. Validar mapping contra `TASK-1232` cockpit/form definitions publicadas.
3. Dry-run staging para `/servicios-contratar-hubspot/` y `/contacto/`; revisar diff humano.
4. Apply staging allowlist; smoke browser + submit test + destination attempt.
5. Repetir en prod con una sola pagina piloto y cooldown 24h.
6. Monitorear submissions, destination attempts y errores public-site por 7 dias antes de ampliar.

### Out-of-band coordination required

- Ventana de edicion WordPress/Kinsta.
- Aprobacion humana del diff de paginas afectadas.
- Confirmacion comercial de que el HubSpot form id/destination mapping es correcto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Inventario read-only reporta todos los embeds HubSpot conocidos del sitio Efeonce con confidence y URL.
- [ ] Existe mapping revisable de cada embed a Greenhouse form/surface/destination.
- [ ] Dry-run genera diff + rollback artifact y bloquea casos ambiguos.
- [ ] Apply allowlist reemplaza al menos una pagina piloto en staging sin doble submit.
- [ ] Submit piloto llega a Greenhouse ledger y conserva handoff HubSpot via adapter seguro.
- [ ] Tracking propio queda documentado como follow-up, no implementado aqui.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm ops:lint --changed`
- WP-CLI read-only inventory smoke
- Browser/GVC smoke de pagina piloto despues de apply staging
- Curl submit test contra form piloto + verificacion de delivery attempt

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambia comportamiento operativo
- [ ] chequeo de impacto cruzado sobre `TASK-1232`, `TASK-1259` y docs de Growth Forms
- [ ] rollback artifact de la pagina piloto guardado en ubicacion gitignored y referenciado en Handoff

## Follow-ups

- `TASK-1259` WordPress/Elementor/Gutenberg Greenhouse Form Selector + Embed UX.
- Task/ADR posterior para motor propio de tracking Greenhouse (pageview, identity, consent, dataLayer/server events).

## Open Questions

- ¿La primera migracion real debe ser `/servicios-contratar-hubspot/`, `/contacto/` o una pagina staging duplicada?
- ¿Queremos mantener el plugin `leadin` solo para tracking durante coexistencia o apagarlo en cuanto Greenhouse tracking exista?
