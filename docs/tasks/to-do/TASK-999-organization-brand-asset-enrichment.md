# TASK-999 — Organization Brand Asset Enrichment

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity|agency|ui|data|integrations|reliability`
- Blocked by: `none`
- Branch: `task/TASK-999-organization-brand-asset-enrichment`
- Legacy ID: `optional`
- GitHub Issue: `optional`

## Summary

Greenhouse debe resolver el flujo enterprise para poblar logos de organizaciones sin cargarlos uno a uno desde cero: dominio/HubSpot/website generan candidatos, un operador revisa o sube el asset, y `Organization` queda con un logo canonico servido desde storage propio.

La task conecta ese logo al avatar/header de Organization Workspace y superficies 360, usando `greenhouse_core.organizations.logo_asset_id` como puntero final, `greenhouse_core.assets` como owner de bytes y una cola de revision para evitar aplicar logos incorrectos.

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

### Slice 1 — Canonical contract and projection

- Documentar el delta semantico de `organizations.logo_asset_id`: puntero final de logo de organizacion, reusable por UI y documentos; no source alternativo de legal identity.
- Crear migracion additive para actualizar comment/metadata y refrescar `greenhouse_serving.organization_360` con `logo_asset_id` y una referencia consumible por readers.
- Extender `OrganizationDetailData`, `OrganizationWorkspaceHeader` y DTOs de readers con `logoAssetId` y `logoUrl` seguro cuando aplique.
- Agregar tests de reader/projection para confirmar que una organizacion con logo lo expone y una sin logo conserva fallback.

### Slice 2 — Asset contexts and manual attach

- Agregar contexts/retention classes `organization_logo_draft`, `organization_logo` y `organization_logo_candidate` en `src/types/assets.ts` y storage helpers.
- Extender upload privado o crear endpoint dedicado para subir logo de organizacion con validacion de MIME, tamano, dimensiones y owner `organizationId`.
- Crear command atomico para adjuntar/reemplazar logo: actualiza `organizations.logo_asset_id`, marca asset como attached, escribe audit/outbox y preserva el logo anterior como asset historico no borrado.
- Gatear mutaciones con capability granular, propuesta inicial: `organization.identity_logo` action `update|review` scope `tenant|all`, o extender `organization.identity_sensitive.update` solo si Discovery demuestra que no hace falta nueva capability.

### Slice 3 — Candidate discovery model

- Crear tabla additive de candidatos, por ejemplo `greenhouse_core.organization_brand_asset_candidates`, con `organization_id`, `source`, `source_url`, `asset_id`, `confidence`, `status`, `metadata_json`, `discovered_at`, `reviewed_by`, `reviewed_at` y `rejection_reason`.
- Implementar discovery idempotente desde datos disponibles: `hubspot_company_id`, dominio/website cuando exista, metadata web segura y fuentes de logo verificables.
- Descargar candidatos a storage propio como `organization_logo_candidate`; no servir ni persistir hotlinks como logo final.
- Registrar provenance suficiente para saber de donde salio cada candidato y por que tuvo determinada confianza.

### Slice 4 — Review queue and UI consumption

- Crear surface alcanzable para revision operativa: lista de organizaciones sin logo, candidatos disponibles, acciones `Aceptar`, `Rechazar`, `Subir`, `Buscar de nuevo`.
- Conectar Organization Workspace/list/sidebar para renderizar logo canonicamente con fallback a inicial estable cuando no hay logo.
- Evitar dos primary actions en headers; usar Vuexy/MUI primitives y copy canonico en `src/lib/copy/identity.ts` cuando haya labels reutilizables.
- Ejecutar GVC sobre las rutas visibles tocadas y guardar evidencia en `.captures/`.

### Slice 5 — Backfill, signals and docs

- Ejecutar discovery dry-run para organizaciones con `hubspot_company_id` y sin `logo_asset_id`; reportar cobertura esperada antes de aplicar.
- Aplicar candidate discovery en staging con feature flag/kill switch; no auto-aplicar logos salvo regla high-confidence aprobada en Plan Mode.
- Agregar reliability signals de cobertura y errores, por ejemplo `identity.organization_brand_assets.coverage_gap` y `identity.organization_brand_assets.discovery_failures`.
- Actualizar documentacion funcional/manual: como se revisa, sube, rechaza y reemplaza un logo.

## Out of Scope

- Redisenar completo el Organization Workspace.
- Sustituir el logo institucional Efeonce/Greenhouse en PDFs, footers o brand assets propios.
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

- Read: `organization.identity:read`.
- Mutate/review: el plan debe decidir entre nueva capability granular `organization.identity_logo` (`update`, `review`) o `organization.identity_sensitive:update`.
- Si se crea capability nueva: TS catalog + migration `capabilities_registry` + runtime grants + tests de coverage.
- `routeGroups` y `views` solo gobiernan navegacion; las mutaciones API deben usar `can()`.

### Events and audit

Eventos propuestos:

- `organization.brand_asset.candidate_discovered` v1
- `organization.brand_asset.accepted` v1
- `organization.brand_asset.rejected` v1
- `organization.brand_asset.replaced` v1

El plan puede colapsar eventos si el event catalog vigente recomienda granularidad menor, pero debe preservar auditabilidad de candidate -> decision -> final logo.

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
| Backfill genera demasiadas descargas externas | integrations / ops | medium | rate limit, dry-run, allowlist, retries acotados, circuit breaker | `identity.organization_brand_assets.discovery_failures` |

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

- [ ] `organization_360` y los readers exponen logo canonico sin romper organizaciones sin logo.
- [ ] Manual upload/attach permite asignar/reemplazar logo con capability, audit/outbox y access control.
- [ ] Candidate discovery crea candidatos con provenance y copia a storage propio sin hotlink final.
- [ ] Review queue permite aceptar, rechazar, subir manualmente y buscar de nuevo.
- [ ] Organization list/detail/workspace renderizan logo cuando existe y fallback estable cuando no.
- [ ] Reliability signals reportan coverage gap, discovery failures y/o projection drift.
- [ ] Docs funcionales/manuales explican el flujo enterprise y la politica de no auto-aplicar logos dudosos.
- [ ] No hay rutas huerfanas nuevas (`pnpm route-reachability-gate --strict` verde si se agregan pages).

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

- Evaluar un campo canonico `organization_domain` / `website_url` si TASK-997/TASK-992 no lo materializan.
- Evaluar proveedor externo de logo enrichment solo si discovery propio + HubSpot no cubren suficientes organizaciones.
- Crear variantes publicas/cacheadas de logo si aparece una superficie client-facing publica que no pueda usar private asset proxy.

## Open Questions

- ¿Auto-aplicar logos high-confidence o mantener review humana obligatoria para todos los candidatos en V1?
- ¿La capability de mutacion debe ser nueva (`organization.identity_logo`) o reutilizar `organization.identity_sensitive.update`?
- ¿El logo de legal entity para documentos debe compartir siempre `logo_asset_id` con el logo comercial, o requiere override documental futuro?
