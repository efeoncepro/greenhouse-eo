# TASK-999 — Organization Brand Asset Enrichment

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
- Epic: `optional`
- Status real: `code complete local/dev; rollout staging/prod pendiente`
- Rank: `TBD`
- Domain: `identity|agency|ui|data|integrations|reliability`
- Blocked by: `none`
- Branch: `develop` (por instruccion explicita del operador)
- Legacy ID: `optional`
- GitHub Issue: `optional`

## Summary

Greenhouse debe resolver el flujo enterprise para poblar logos de organizaciones sin cargarlos uno a uno desde cero: dominio/HubSpot/website generan candidatos, un operador revisa o sube el asset, y `Organization` queda con un logo canonico servido desde storage propio.

La task conecta ese logo al avatar/header de Organization Workspace y superficies 360, usando `greenhouse_core.organizations.logo_asset_id` como puntero final, `greenhouse_core.assets` como owner de bytes y una cola de revision para evitar aplicar logos incorrectos.

**Guardrail de alcance:** TASK-999 aplica a organizaciones comerciales/cliente/proveedor que no son la entidad legal/operating entity de Efeonce. No cambia logos de Efeonce, Greenhouse institucional, operating entities ni entidades relacionadas usadas en documentos legales.

## Progress Log

- 2026-06-08/09 — Foundation implementada en `develop`: migration dev aplicada, contexts de assets, capability `organization.brand_asset`, command/API de attach, candidates, discovery por website/URL, review queue admin suplementaria, señales reliability, ops-worker y consumo de `logoUrl` en listas/workspace.
- 2026-06-09 — UX principal corregida por feedback de operador: el flujo primario vive al hacer click en el avatar de la organizacion, abre un pop-up `GreenhouseFloatingSurface` tipo Logo Studio y usa `GreenhouseFileUploader` para carga manual; Admin Center queda como cola suplementaria de data-quality/bulk review.
- 2026-06-09 — Busqueda por URL corregida: acepta sitio web o URL directa de imagen; si recibe un website (ej. `https://latam.com`) lee metadata (`og:image`, `twitter:image`, icon links/fallback) y guarda el logo como asset privado, sin hotlink.

## Why This Task Exists

Hoy las organizaciones tienen espacio visual para avatar/logo, pero el runtime no entrega un logo reusable:

- `greenhouse_core.organizations.logo_asset_id` existe, pero nacio en TASK-862 como logo de empleador/legal entity para documentos legales.
- La vista `greenhouse_serving.organization_360` y los readers UI no exponen `logo_asset_id` ni una URL segura de logo.
- `OrganizationWorkspaceHeader`, `OrganizationDetailData` y `OrganizationLeftSidebar` renderizan iniciales o iconos fijos.
- El flujo legacy de logo de tenant (`greenhouse.clients.logo_url`) vive en BigQuery/media admin y no es SSOT para Organization 360.
- La inspeccion read-only del 2026-06-03 encontro 157 organizaciones, 0 con `logo_asset_id`, 128 con `hubspot_company_id` y 125 originadas desde HubSpot. Hay anclas suficientes para discovery, pero falta el control plane.

La causa raiz no es visual: falta una primitive canonica de Organization Brand Assets con discovery, ownership, revision, apply y serving seguro.

## Goal

- Definir `organizations.logo_asset_id` como puntero canonico final para logo de organizacion, preservando su uso legal-documental y documentando el delta semantico.
- Limitar enrichment comercial a organizaciones con `is_operating_entity=FALSE`; las filas Efeonce/operating entity quedan fuera del flujo normal de discovery, upload, review y replace.
- Crear un flujo de enrichment enterprise: discovery de candidatos, normalizacion a asset propio, review queue, accept/reject/upload manual y re-scan.
- Exponer el logo en `organization_360`, readers, Organization Workspace, listas y avatars con fallback estable a iniciales.
- Evitar hotlinking, SVG no confiable, aplicar logos de baja confianza sin revision y fugas de acceso.
- Dejar señales de drift/completitud para saber cuantas organizaciones siguen sin brand asset.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `project_context.md`
- `Handoff.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `DESIGN.md`

Reglas obligatorias:

- Organization sigue siendo el objeto canonico 360; no crear un SSOT paralelo de cliente/logo en BigQuery, HubSpot ni media legacy.
- `greenhouse_core.assets` guarda bytes, metadata, retention y access log; la semantica de marca pertenece al dominio Organization.
- El enrichment comercial excluye `organizations.is_operating_entity=TRUE` y cualquier fila institucional Efeonce/relacionada; esos logos pertenecen al contrato legal/institucional existente y no se gestionan por esta cola.
- No hacer hotlink de logos remotos en UI productiva. Todo logo aceptado debe copiarse a storage propio, validarse y servirse por endpoint/proxy controlado.
- No renderizar SVG remoto sin sanitizacion fuerte. Preferir PNG/WebP normalizado; SVG solo si se sanitiza y se sirve como asset controlado.
- La lectura visible del logo vive bajo `organization.identity`; mutar/revisar logos requiere capability granular y auditada, no solo presencia de ruta.
- Si se agrega capability nueva, actualizar `src/config/entitlements-catalog.ts` y seed en `greenhouse_core.capabilities_registry`; nunca borrar capabilities del registry.
- Cualquier ruta nueva `src/app/(dashboard)/**/page.tsx` debe ser alcanzable por nav o declararse en `src/lib/navigation/route-reachability-manifest.ts`.
- Si la task cambia el contrato compartido de `organizations.logo_asset_id`, documentar delta/ADR antes de implementar.

## Normative Docs

- `docs/manual-de-uso/identity/organization-workspace-projection.md`
- `docs/documentation/identity/sistema-identidad-roles-acceso.md`
- `docs/documentation/identity/sincronizacion-clientes-hubspot.md`
- `docs/documentation/agency/cuenta-completa-360.md`
- `docs/architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`
- `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md`

## Design + Architecture Skills (invocar en Plan Mode)

- **Product design (cualquier UI nueva, hook obligatorio CLAUDE.md)**: `greenhouse-ux` (layout + CustomAvatar + tokens), `state-design` (estados del avatar/logo + review queue), `info-architecture` (dónde vive el review queue, reachability), `greenhouse-ux-writing` (copy es-CL → `src/lib/copy/identity.ts`), `greenhouse-ui-review` (gate pre-commit). Verificar con GVC en loop (`pnpm fe:capture`), nunca freehand.
- **Image safety / normalización**: `greenhouse-digital-brand-asset-designer` aplica a payment instruments (matriz 4-variantes + VTracer + manifest provenance + visual QA). Los logos de organización son OTRA clase de asset (no reusar la matriz 4-variantes), pero **sí reusar sus patrones de saneamiento SVG, normalización raster→vector y QA visual** cuando se valide un candidato.
- **Arquitectura**: `arch-architect` (overlay greenhouse) — extensión canónica 360, state machine + CHECK + audit trio (TASK-700/765), VIEW + helper + reliability signal (TASK-571/766/774), defense-in-depth 7-layer (TASK-742), outbox + reactive consumer (TASK-771/773), capability granular (overlay regla #7). Scoring 4-pilar obligatorio.

## Dependencies & Impact

### Depends on

- `greenhouse_core.organizations.logo_asset_id` en `migrations/20260511170036789_task-862-finiquito-snapshot-extension-v1.sql`
- `greenhouse_core.assets` y helpers en `src/lib/storage/greenhouse-assets.ts`
- Upload/download privado en `src/app/api/assets/private/route.ts` y `src/app/api/assets/private/[assetId]/route.ts`
- `greenhouse_serving.organization_360` en migraciones existentes y readers en `src/lib/account-360/organization-store.ts`
- Organization Workspace projection en `src/lib/organization-workspace/projection.ts`
- Capabilities `organization.identity` y `organization.identity_sensitive` en `src/config/entitlements-catalog.ts`
- HubSpot company anchors (`hubspot_company_id`) consumidos por `src/lib/hubspot/company-identity.ts` y syncs relacionados
- Flujo legacy de media tenant en `src/app/api/admin/tenants/[id]/logo/route.ts`, `src/app/api/media/tenants/[id]/logo/route.ts` y `src/lib/admin/media-assets.ts`

### Blocks / Impacts

- Avatars/logos en `/agency/organizations`, `/agency/organizations/[id]` y Organization Workspace.
- Account/Organization Complete 360 surfaces que renderizan identity chrome.
- Future client lifecycle/onboarding visual polish de TASK-992/TASK-997/TASK-998.
- Manuales y documentacion de operacion de identidad/organizaciones.

### Files owned

- `migrations/`
- `src/types/db.d.ts`
- `src/types/assets.ts`
- `src/lib/storage/greenhouse-assets.ts`
- `src/lib/account-360/organization-store.ts`
- `src/lib/account-360/organization-identity.ts`
- `src/lib/sync/projections/organization-360.ts`
- `src/lib/organization-workspace/projection-types.ts`
- `src/components/greenhouse/organization-workspace/types.ts`
- `src/components/greenhouse/organization-workspace/OrganizationWorkspaceShell.tsx`
- `src/views/greenhouse/organizations/types.ts`
- `src/views/greenhouse/organizations/OrganizationLeftSidebar.tsx`
- `src/views/greenhouse/organizations/OrganizationListView.tsx`
- `src/app/api/organizations/[id]/route.ts`
- `src/app/api/organizations/360/route.ts`
- `src/app/api/assets/private/route.ts`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/reliability/registry.ts`
- `src/lib/reliability/queries/` (signals coverage/discovery/drift/operating-entity)
- `src/lib/hubspot/company-identity.ts` (backfill `domain` => `organizations.website_url`)
- `services/ops-worker/` (discovery fetch + download candidates fuera de Vercel)
- `src/lib/sync/projections/` (reactive consumer de candidate_discovered si aplica)
- `src/lib/copy/identity.ts` (copy es-CL del review queue)
- `src/lib/navigation/route-reachability-manifest.ts` (declarar el review queue admin)
- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`
- `docs/manual-de-uso/identity/organization-workspace-projection.md`
- `docs/documentation/identity/sistema-identidad-roles-acceso.md`
- `docs/documentation/agency/cuenta-completa-360.md`

## Current Repo State

### Already exists

- `greenhouse_core.organizations.logo_asset_id` con FK a `greenhouse_core.assets`, pero el comentario actual lo limita a documentos legales de TASK-862.
- `src/types/db.d.ts` expone `GreenhouseCoreOrganizations.logo_asset_id`.
- `src/types/assets.ts` define contexts/retention classes de assets, pero no incluye `organization_logo_draft`, `organization_logo` ni `organization_logo_candidate`.
- `src/lib/storage/greenhouse-assets.ts` maneja upload, attach, download, access log y storage privado para assets cross-module.
- `/api/assets/private` existe para subir y descargar assets privados.
- `organization.identity` ya se define como capability de datos basicos: nombre, dominio, status comercial y logo.
- `docs/manual-de-uso/identity/organization-workspace-projection.md` ya promete logo bajo `organization.identity`.
- `OrganizationWorkspaceShell` comenta "Header (logo...)" pero no recibe ni renderiza un logo real.
- `OrganizationLeftSidebar` renderiza un avatar con inicial de `organizationName`.
- `src/app/api/admin/tenants/[id]/logo/route.ts` y `src/lib/admin/media-assets.ts` resuelven logos legacy de tenant sobre `greenhouse.clients.logo_url`, no Organization SSOT.
- Inspeccion read-only 2026-06-03: 157 orgs, 0 con `logo_asset_id`, 128 con `hubspot_company_id`, 125 con `origin='hubspot_sync'`; `organization_360` no expone `logo_asset_id`, dominio ni `website_url`.

### Gap

- Falta un contrato explicito para distinguir `logo_asset_id` como logo de marca de organizacion vs logo legal de empleador en documentos.
- Falta modelo de candidatos, estados de revision, confianza, source/provenance y audit trail.
- Falta discovery desde dominio/website/HubSpot y fallback manual.
- Falta endpoint/command para aceptar/rechazar/subir/reemplazar logo con capability y audit/outbox.
- Falta proyeccion `organization_360` + DTO + UI para consumir logo canonicamente.
- Falta signal de cobertura/drift para logos faltantes, candidatos vencidos o logos rechazados recurrentemente.

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

### Slice 1 — Canonical contract, domain SSOT and projection

- Documentar el delta semantico de `organizations.logo_asset_id`: puntero final del **logo canonico de la organizacion** (significado unificado), reusable por UI y documentos. El uso depende del tipo de fila: operating entity (`is_operating_entity=TRUE`) => logo legal en documentos (TASK-862); organizacion cliente => avatar comercial en 360/Workspace. Un override documental separado seria una columna NUEVA futura (YAGNI hoy — ver Open Questions resueltas).
- **Capturar SSOT de dominio (prerequisito de discovery, BLOQUEANTE de Slice 3 `website_metadata`/`hubspot_company`)**: la inspeccion 2026-06-03 confirmo que `greenhouse_core.organizations` NO tiene columna `website`/`domain`. Sin dominio no hay favicon/website/HubSpot-logo derivable. Agregar columna additive nullable `organizations.website_url` (o `domain`) + backfillearla desde la propiedad HubSpot `domain` dentro del sync de companies existente (`src/lib/hubspot/company-identity.ts` / `syncHubSpotCompanies`). Exponerla en `organization_360`. Confirmar primero el scope del token HubSpot para leer `domain` (coordinacion out-of-band).
- Crear migracion additive para actualizar comment/metadata de `logo_asset_id` y refrescar `greenhouse_serving.organization_360` (`CREATE OR REPLACE VIEW`) con `logo_asset_id` + `website_url`/`domain`. NOTA: `organization_360` es un VIEW (migration `20260402094316652`), no un materializer; verificar si el owned-file `src/lib/sync/projections/organization-360.ts` aplica o si solo se toca el VIEW + reader `organization-store.ts`.
- Extender `OrganizationDetailData`, `OrganizationWorkspaceHeader` y DTOs de readers con `logoAssetId` y `logoUrl` seguro cuando aplique.
- Agregar tests de reader/projection para confirmar que una organizacion con logo lo expone y una sin logo conserva fallback.

### Slice 2 — Asset contexts and manual attach

- Agregar contexts/retention classes `organization_logo_draft`, `organization_logo` y `organization_logo_candidate` en `src/types/assets.ts` y storage helpers.
- Extender upload privado o crear endpoint dedicado para subir logo de organizacion con validacion de MIME, tamano, dimensiones y owner `organizationId`.
- Crear command atomico (tx unica) para adjuntar/reemplazar logo: actualiza `organizations.logo_asset_id`, marca asset como attached (`owner_aggregate_type='organization_logo'`), escribe audit/outbox y **preserva el logo anterior como asset historico no borrado** (supersede, nunca DELETE). Idempotente por `content_hash`.
- Gatear mutaciones con la capability granular `organization.brand_asset` (`update|review`) — ver Access model. Aplicar el **operating-entity guard**: bloquear el flujo normal cuando `is_operating_entity=TRUE`; TASK-999 no permite cambiar logos de Efeonce/operating entities desde discovery, upload, review ni replace comercial. Cualquier cambio legal/institucional futuro debe ir por task/ADR separado.

### Slice 3 — Candidate discovery model

- Crear tabla additive de candidatos `greenhouse_core.organization_brand_asset_candidates`, con `organization_id`, `source`, `source_url`, `asset_id`, `confidence`, `status`, `metadata_json`, `discovered_at`, `reviewed_by`, `reviewed_at` y `rejection_reason`. Append-friendly; el `status` sigue el state machine de candidatos (ver Detailed Spec) con CHECK enum cerrado.
- **Orden de fuentes V1 segun dependencia de dominio (Slice 1 debe haber capturado `domain`/`website_url`)**: `hubspot_company` requiere leer la propiedad HubSpot `domain` (confirmar scope token); `website_metadata` (favicon/apple-touch/open-graph) requiere `organizations.website_url` poblado. Si Slice 1 NO logra capturar dominio, V1 degrada a `manual_upload` + `operator_url` unicamente y `website_metadata` queda diferido (no listar fuentes que no pueden correr).
- **Ejecucion del discovery en ops-worker (Cloud Run), NO en route Vercel** (overlay arch-architect regla #3 + resiliencia): el fetch externo + descarga de imagenes es trabajo con rate-limit/timeout/retry/circuit-breaker; vive en `services/ops-worker/` disparado por outbox/scheduler, no inline en serverless. El "buscar de nuevo" manual de una org puede ser un route Vercel que ENCOLA (emite `organization.brand_asset.candidate_discovered` o un trigger) y el ops-worker hace el fetch+download. Aplicar rate limit + retries acotados + circuit breaker.
- Descargar candidatos a storage propio como `organization_logo_candidate`; **nunca** servir ni persistir hotlinks como logo final. Validar MIME real + size + sanitizar SVG (reusar patrones de `greenhouse-digital-brand-asset-designer`).
- Registrar provenance suficiente para saber de donde salio cada candidato y por que tuvo determinada confianza.

### Slice 4 — Review queue and UI consumption

- **IA: espejar el precedente canonico existente `/admin/data-quality/notion-titles`** (cola de hygiene con NULL names + CTA — ver CLAUDE.md "Admin queue de hygiene"). El review queue de logos vive como cola de data-quality bajo `/admin/...` (supplemental nav: `info-architecture`), p.ej. `/admin/data-quality/organization-logos`, NO inventar IA nueva. Reachable por nav o declarado en `src/lib/navigation/route-reachability-manifest.ts` (`pnpm route-reachability-gate --strict`). Adicionalmente, **accion contextual por-fila en `/agency/organizations`** (subir/revisar logo desde la lista — contextual nav). Las dos surfaces consumen el mismo command/reader; cero composicion ad-hoc.
- Surface de revision: lista de organizaciones sin logo + candidatos disponibles, acciones `Aceptar`, `Rechazar`, `Subir`, `Buscar de nuevo`. Mostrar `confidence` + `provenance` (source + source_url) visibles para que el operador decida.
- **Estados del review queue (state-design, 12-state matrix)**: `loading` (skeleton de tabla, no spinner page-level), `empty` (todas las orgs ya tienen logo => zero-state celebratorio con CTA secundario), `empty-filtered` (filtro sin resultados => limpiar filtros), `error` retriable, `degraded` (discovery caido => banner honesto "Algunos candidatos no disponibles", no $0/blanco). Acciones con UI optimista + rollback al fallar.
- **Estados del avatar/logo en Workspace/list/sidebar (state-design)**: usar `CustomAvatar variant='rounded'` con **`object-fit: contain` + padding sobre fondo neutro** (NO `cover` — los wordmarks se croppearian). Default => `logoUrl`; sin logo => **inicial estable** derivada del `organizationName`; `<img>` con `onError` => fallback a inicial (NUNCA imagen rota); skeleton dimensionado al avatar final (sin CLS). Nunca renderizar un candidato/rechazado como logo final.
- Evitar dos primary actions en headers (1 primary contained + N tonal); usar Vuexy/MUI primitives y copy canonico es-CL en `src/lib/copy/identity.ts` (validar con `greenhouse-ux-writing`).
- Ejecutar GVC en loop sobre las rutas visibles tocadas (`pnpm fe:capture`), leer el frame, ajustar hasta enterprise, guardar evidencia en `.captures/`.

### Slice 5 — Backfill, signals and docs

- Ejecutar discovery dry-run para organizaciones con `hubspot_company_id` y sin `logo_asset_id`; reportar cobertura esperada antes de aplicar.
- Aplicar candidate discovery en staging con feature flag/kill switch; no auto-aplicar logos salvo regla high-confidence aprobada en Plan Mode.
- Agregar reliability signals de cobertura y errores, por ejemplo `identity.organization_brand_assets.coverage_gap` y `identity.organization_brand_assets.discovery_failures`.
- Actualizar documentacion funcional/manual: como se revisa, sube, rechaza y reemplaza un logo.

## Out of Scope

- Redisenar completo el Organization Workspace.
- Sustituir el logo institucional Efeonce/Greenhouse en PDFs, footers o brand assets propios.
- Cambiar logos de Efeonce, operating entities o entidades relacionadas a Efeonce usadas como marca legal/institucional.
- Usar imagen generada por IA para suplantar el logo real de una organizacion.
- Aplicar automaticamente logos de baja o media confianza sin revision humana.
- Hotlink permanente a Clearbit, HubSpot, website externo u otro proveedor.
- Crear una plataforma general de brand intelligence para todos los assets de marca no-logo.
- Resolver la captura de dominios/website si el SSOT de dominio no existe; en ese caso esta task debe agregar el minimo campo/proyeccion necesario o abrir follow-up.

## Detailed Spec

### Final logo contract

- `greenhouse_core.organizations.logo_asset_id` es el puntero final de logo aceptado.
- El asset final debe tener `owner_aggregate_type='organization_logo'`, `owner_aggregate_id=<organization_id>`, `visibility='private'` salvo decision explicita de media publica.
- La UI consume `logoUrl` desde endpoint/proxy propio, nunca desde `source_url`.
- Un asset rechazado o candidato nunca se renderiza como logo final.

### Candidate status model

Estados minimos:

- `discovered`: candidato nuevo sin decision.
- `download_failed`: fuente detectada pero no se pudo copiar a storage propio.
- `needs_review`: candidato viable, requiere operador.
- `accepted`: candidato aplicado a `organizations.logo_asset_id`.
- `rejected`: operador rechazo el candidato.
- `superseded`: otro candidato/logo reemplazo este registro.

### Candidate sources

Fuentes iniciales permitidas:

- `hubspot_company`: metadata asociada al `hubspot_company_id`.
- `website_metadata`: favicon/apple-touch/open-graph/logo link desde website/dominio verificado.
- `manual_upload`: archivo subido por operador.
- `operator_url`: URL ingresada por operador y descargada por backend a storage propio.

### Image safety rules

- Validar MIME real y extension; permitir PNG, JPEG, WebP y SVG solo con sanitizacion fuerte.
- Normalizar tamanos/variantes si el stack disponible lo permite; minimo conservar dimensiones y hash en metadata.
- Rechazar archivos demasiado grandes o no imagen.
- Registrar `content_hash` para dedupe.
- No exponer errores crudos de proveedor/HTTP en respuestas de API.

### Access model

- Read: `organization.identity:read` (logo es parte de identity basica; `logoUrl` se sirve por proxy propio con `canTenantAccessAsset`).
- Mutate/review: **capability granular nueva `organization.brand_asset`** con actions `review|update` scope `tenant|all`. DECIDIDO (overlay arch-architect regla #7 — capability granular, no reusar coarse): NO reutilizar `organization.identity_sensitive.update` porque mezcla dimensiones ortogonales (editar campos sensibles de identidad vs revisar/aplicar logos). El naming `brand_asset` es consistente con los eventos `organization.brand_asset.*` y la tabla `organization_brand_asset_candidates`.
- Capability nueva => TS catalog (`src/config/entitlements-catalog.ts`) + migration seed `capabilities_registry` + grants en `src/lib/entitlements/runtime.ts` en el MISMO PR + `capability-grant-coverage.test.ts` verde (invariant TASK-873/935; sin grant runtime el endpoint da 403 a todos). Grants canonicos: route_group `identity`/`admin` + `EFEONCE_ADMIN`; evaluar `efeonce_account` (lider de cuenta) para review de sus organizaciones si Discovery lo justifica.
- **Operating-entity guard (Pilar 1, DECIDIDO)**: las mutaciones de `organization.brand_asset` que apunten a una fila con `is_operating_entity=TRUE` (logo legal de Efeonce usado en finiquitos/contratos, TASK-862/863) DEBEN bloquearse en TASK-999. Aplicar un logo comercial a la operating entity cambiaria el logo de documentos legales. El command verifica el flag antes de tocar `logo_asset_id`; cambios legales/institucionales quedan fuera de alcance y requieren task/ADR separado.
- `routeGroups` y `views` solo gobiernan navegacion; las mutaciones API deben usar `can()`.

### Events and audit

Eventos propuestos:

- `organization.brand_asset.candidate_discovered` v1
- `organization.brand_asset.accepted` v1
- `organization.brand_asset.rejected` v1
- `organization.brand_asset.replaced` v1

El plan puede colapsar eventos si el event catalog vigente recomienda granularidad menor, pero debe preservar auditabilidad de candidate -> decision -> final logo.

## 4-Pillar Scoring (arch-architect contract)

- **Safety**: capability granular nueva `organization.brand_asset` (no coarse); operating-entity guard protege el logo legal de Efeonce; `logoUrl` servido por proxy propio con `canTenantAccessAsset` (sin fuga cross-tenant); SVG saneado o rechazado; no hotlink; errores externos redactados (`redactErrorForResponse`, nunca crudo). Blast radius de un logo mal aplicado = 1 organizacion, mitigado por review-first.
- **Robustness**: command de apply atomico (tx unica) con supersede del logo previo (nunca DELETE); idempotencia por `content_hash`; candidate state machine con CHECK enum cerrado; validacion MIME real + size + dimensiones en el boundary; discovery idempotente por `(organization_id, source, source_url)`.
- **Resilience**: discovery en ops-worker con retries acotados + circuit breaker + dead-letter; reliability signals `coverage_gap` / `discovery_failures` / `projection_drift` / `operating_entity_mutation_blocked` (steady=0); degradacion honesta en UI (img rota => inicial; discovery caido => banner, no $0); rollback per-slice documentado; feature flags para discovery y review UI.
- **Scalability**: 157 orgs hoy, ~125 con ancla HubSpot — volumen bajo; discovery batched + rate-limited absorbe 10x; assets en storage propio servido por proxy cacheable; `organization_360` es VIEW (sin materializacion extra). Si emerge superficie cliente-facing publica de alto trafico, variantes publicas/cacheadas son follow-up.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contract + read projection) MUST ship before any UI relies on `logoUrl`.
- Slice 2 (manual attach) MUST ship before automated candidate acceptance; operators need a deterministic fallback.
- Slice 3 (candidate discovery) MUST run in dry-run/staging before Slice 4 exposes bulk review.
- Slice 4 UI MUST remain review-first; no bulk auto-apply unless Slice 5 defines an approved high-confidence rule.
- Slice 5 backfill/signals MUST run before declaring operationally complete.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Logo incorrecto aplicado a cliente equivocado | identity / UI / data | medium | review humana por defecto, confidence + provenance visible, no auto-apply bajo umbral | `identity.organization_brand_assets.rejected_after_apply` |
| Hotlink o fuente externa cae/trackea usuarios | UI / privacy | medium | copiar a storage propio, servir por endpoint Greenhouse, bloquear source_url como final | `identity.organization_brand_assets.hotlink_detected` |
| SVG malicioso o imagen no valida | security / assets | medium | MIME sniffing, sanitizacion o rechazo SVG, normalizacion y size limits | `identity.organization_brand_assets.validation_failures` |
| Fuga de logo privado entre tenants | identity / assets | low | `canTenantAccessAsset` con owner organization + relationship/capability check | `identity.organization_brand_assets.access_denied_rate` |
| Drift de `organization_360` vs `organizations.logo_asset_id` | data / serving | medium | tests de projection + signal de coverage/drift | `identity.organization_brand_assets.projection_drift` |
| Backfill genera demasiadas descargas externas | integrations / ops | medium | rate limit, dry-run, allowlist, retries acotados, circuit breaker, fetch en ops-worker no Vercel | `identity.organization_brand_assets.discovery_failures` |
| Aplicar logo comercial a la operating entity y romper logo legal en documentos (finiquito/contrato) | identity / legal | medium | operating-entity guard: bloquear/elevar a `EFEONCE_ADMIN` cuando `is_operating_entity=TRUE`; el logo legal se gestiona aparte | `identity.organization_brand_assets.operating_entity_mutation_blocked` |

### Feature flags / cutover

- Proponer `ORGANIZATION_BRAND_ASSET_DISCOVERY_ENABLED=false` para discovery automatico.
- Proponer `ORGANIZATION_BRAND_ASSET_REVIEW_UI_ENABLED=false` si la surface nueva debe desplegarse antes del rollout operativo.
- Manual upload/attach puede ser sin flag si queda capability-gated y no cambia comportamiento existente.
- Cutover visual: renderizar logo cuando `logoUrl` exista; fallback a iniciales permanece siempre disponible.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR o refrescar view sin columnas nuevas; no borrar `logo_asset_id` existente | <30 min | si |
| Slice 2 | Deshabilitar capability/grant o revert endpoint; logos ya aplicados pueden limpiarse seteando `logo_asset_id=NULL` por script auditado | <30 min | parcial |
| Slice 3 | Apagar `ORGANIZATION_BRAND_ASSET_DISCOVERY_ENABLED`; candidatos quedan historicos sin aplicarse | <5 min + redeploy si env | si |
| Slice 4 | Apagar `ORGANIZATION_BRAND_ASSET_REVIEW_UI_ENABLED` o revert UI; fallback de avatar queda intacto | <5 min + redeploy si env | si |
| Slice 5 | Pausar backfill/discovery; revert de docs/signals por PR si hace falta | <30 min | si |

### Production verification sequence

1. Ejecutar `pnpm task:lint --task TASK-999` al tomar/cerrar cambios de task.
2. Migrar staging y verificar que `organization_360` expone `logo_asset_id` sin romper readers existentes.
3. Subir manualmente un logo en staging para una organizacion allowlist; verificar `assets`, `organizations.logo_asset_id`, audit/outbox y UI.
4. Ejecutar discovery dry-run staging sobre organizaciones con `hubspot_company_id`; revisar candidatos y rechazos.
5. Activar review UI staging; aceptar y rechazar al menos un candidato; verificar fallback y reemplazo.
6. Ejecutar GVC en rutas afectadas (`/agency/organizations`, `/agency/organizations/[id]` y Organization Workspace si aplica).
7. Repetir migracion/deploy en produccion con discovery flag OFF.
8. Habilitar manual attach primero; luego discovery dry-run productivo; revisar señales 7 dias antes de cualquier auto-apply.

### Out-of-band coordination required

- Validar con operadores Agency/Admin si quieren auto-apply solo para high-confidence o siempre review humana.
- Si se consulta HubSpot para logos/dominio, confirmar scopes disponibles del token actual antes de depender de propiedades no sincronizadas.
- Si se usa proveedor externo de logo enrichment, requiere decision/procurement separada; por defecto esta task usa discovery desde dominios/metadata propios y HubSpot disponible.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `organization_360` y los readers exponen logo canonico sin romper organizaciones sin logo.
- [x] Manual upload/attach permite asignar/reemplazar logo con capability, audit/outbox y access control.
- [ ] Candidate discovery crea candidatos con provenance y copia a storage propio sin hotlink final.
- [ ] Review queue permite aceptar, rechazar, subir manualmente y buscar de nuevo.
- [x] Organization list/detail/workspace renderizan logo cuando existe y fallback estable cuando no.
- [ ] Reliability signals reportan coverage gap, discovery failures y/o projection drift.
- [ ] Docs funcionales/manuales explican el flujo enterprise y la politica de no auto-aplicar logos dudosos.
- [ ] No hay rutas huerfanas nuevas (`pnpm route-reachability-gate --strict` verde si se agregan pages).

## Progress Log

### 2026-06-08 — Foundation/manual attach implemented on `develop`

- Migration `20260608230303037_task-999-organization-brand-assets-foundation.sql` applied in dev via `pnpm pg:connect:migrate --status` wrapper: adds `organizations.website_url`, creates `organization_brand_asset_candidates`, seeds capability `organization.brand_asset`, and refreshes `greenhouse_serving.organization_360` with `logo_asset_id`, `website_url`, `is_operating_entity`.
- Added asset contexts `organization_logo_draft`, `organization_logo_candidate`, `organization_logo`; private upload/download access now supports organization logo drafts/finals with identity/owner checks.
- Added domain command `attachOrganizationLogoAsset()` and API route `POST /api/organizations/[id]/brand-assets/logo`; command blocks `is_operating_entity=TRUE` before asset lookup, supersedes previous logo without deleting bytes, updates `organizations.logo_asset_id`, and publishes outbox events.
- Updated entitlements catalog/runtime grants for `organization.brand_asset` (`review|update`), with tests for admin/superadmin coverage.
- Account 360 readers, `organization_360` DTOs, Organization list/detail/sidebar/workspace headers now consume `logoUrl` with stable fallback.
- ADR added: `docs/architecture/GREENHOUSE_ORGANIZATION_BRAND_ASSET_DECISION_V1.md`.

Still pending before task completion:

- discovery worker / scheduled fetch and candidate download;
- visual review queue under Admin/Data Quality;
- reliability signals for coverage/drift/failures;
- staging/production rollout and GVC evidence after runtime server capture.

## Verification

- `pnpm task:lint --task TASK-999`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm route-reachability-gate --strict`
- `pnpm design:lint` si se toca UI visible o `DESIGN.md`
- `pnpm fe:capture --route=/agency/organizations --env=staging --hold=3000`
- `pnpm fe:capture --route=/agency/organizations/<organizationId> --env=staging --hold=3000`
- Smoke staging: manual upload -> `organizations.logo_asset_id` -> UI logo visible -> asset download autorizado.
- Smoke staging: candidate discovery dry-run -> review accept/reject -> final logo/fallback correcto.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/manual-de-uso/identity/organization-workspace-projection.md` y docs relacionadas explican el flujo de logos
- [ ] Si se agrego capability nueva, `capabilities_registry` y `src/config/entitlements-catalog.ts` quedaron en paridad

## Follow-ups

- Auto-apply de candidatos high-confidence, gated por precision medida (umbral a definir) — diferido de V1 (review-first).
- Reconciliar el 3er logo legacy `greenhouse.clients.logo_url` (BQ, branding del portal cliente, `src/lib/admin/media-assets.ts`): decidir si el logo comercial de la organizacion lo reemplaza como SSOT o coexisten. NO se toca en V1 (evitar 3 SSOT en paralelo sin decision).
- Evaluar proveedor externo de logo enrichment solo si discovery propio + HubSpot no cubren suficientes organizaciones.
- Crear variantes publicas/cacheadas de logo si aparece una superficie client-facing publica que no pueda usar private asset proxy.

## Resolved Decisions (arch-architect verdict 2026-06-04)

- **Auto-apply vs review** => **V1 siempre review humana** para todos los candidatos. Blast radius de logo equivocado en cliente equivocado es medium; costo de review es 1 click. Auto-apply high-confidence se difiere a follow-up gated por precision medida (>= N candidatos aceptados sin rechazo posterior). Pinned en Slice ordering.
- **Capability de mutacion** => **nueva granular `organization.brand_asset` (`review|update`)**, NO reusar `organization.identity_sensitive.update` (overlay regla #7; naming consistente con eventos/tabla `brand_asset`). Resuelto en Access model.
- **Logo legal vs comercial comparten `logo_asset_id`** => **SI, comparten** la misma columna; el significado es unificado "logo canonico de la organizacion" y el uso depende del tipo de fila (operating entity => documentos; cliente/proveedor/no-operating => UI/enrichment comercial). TASK-999 solo opera sobre filas no-operating; un override documental o cambio institucional de Efeonce seria una columna/tarea/ADR futuro, no parte de esta implementacion. Protegido por el operating-entity guard.

## Open Questions

- ¿Qué umbral exacto de precision medida habilita el follow-up de auto-apply high-confidence (y para qué fuentes)?
- ¿La accion contextual por-fila en `/agency/organizations` debe permitir solo `Subir`/`Aceptar candidato`, o también disparar `Buscar de nuevo` (encolar discovery on-demand)?
- ¿El logo comercial de una organizacion cliente debe convertirse en SSOT que reemplace el legacy `greenhouse.clients.logo_url` (branding del portal cliente), o ambos coexisten? (ver Follow-ups — reconciliacion del 3er logo legacy en BQ).
