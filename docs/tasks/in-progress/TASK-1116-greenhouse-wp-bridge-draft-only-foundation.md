# TASK-1116 — Greenhouse WP Bridge Draft-only Foundation

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
- Epic: `EPIC-019`
- Status real: `Partial foundation exists: plugin v0.3.0 in runtime repo has authenticated read-only health/Elementor/Gutenberg block/Ohio inspection plus signed HMAC/replay guarded draft-only routes in code; live write rollout still pending shared secret, write flag, staging/preview and least-privilege`
- Rank: `TBD`
- Domain: `platform|commercial|marketing-ops|integrations|wordpress`
- Blocked by: `none`
- Rollout blockers: `Kinsta API gap bloquea cache/backups/publish operations; confirmar staging/preview target; provisionar shared secret/HMAC y reducir privilegios del usuario tecnico antes de ejecutar writes reales`
- Branch: `task/TASK-1116-greenhouse-wp-bridge-draft-only-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir la foundation del plugin `greenhouse-wp-bridge` para que Greenhouse pueda hablar con `efeoncepro.com` de forma autenticada, firmada y auditable, pero solo en modo draft/read. El primer write path permitido es crear o actualizar drafts/privates controlados, nunca publicar, limpiar cache ni tocar contenido productivo existente sin metadatos Greenhouse.

## Why This Task Exists

`efeoncepro.com` ya expone WordPress REST, Abilities API, Application Passwords, Elementor/Ohio, CPT `landing`, plugins AI/HubSpot/Yoast y WP-CLI read-only. Greenhouse necesita un bridge propio antes de automatizar landings, porque publicar directo contra REST/Elementor sin un contrato de seguridad, audit log y rollback seria frágil y riesgoso para el sitio público.

## Goal

- Crear la foundation del bridge WordPress con health/readiness, auth firmada, audit metadata y rutas draft-only.
- Registrar capabilities/abilities first cuando WordPress Abilities API este disponible, con REST compatibility como fallback gobernado.
- Probar el primer flujo no productivo: create/update draft con preview URL y metadata Greenhouse, sin publish ni cache clear.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/operations/discovery-public-website-wordpress-20260614.md`
- `docs/documentation/public-site/wordpress-custom-widgets-react-strategy.md`

Reglas obligatorias:

- Abilities-first: si `wp-abilities/v1` esta disponible, registrar acciones del bridge como abilities; REST queda como transporte y fallback.
- Draft-only: ninguna ruta puede publicar, borrar, limpiar cache, instalar plugins, modificar theme global o mutar Elementor existente fuera de objetos Greenhouse-owned.
- Auth doble: Application Password identifica el usuario WordPress; HMAC/shared secret o firma equivalente identifica a Greenhouse y protege replay/tampering.
- Least privilege: el usuario actual `Greenhouse` esta como administrator y debe reducirse o encapsularse antes de producción; si no se reduce, documentar riesgo y mitigación.
- Audit por construcción: cada mutación debe persistir `greenhouse_request_id`, `greenhouse_actor`, `greenhouse_manifest_id`, `greenhouse_environment`, timestamps y correlation id.
- No secretos en frontend, docs, logs o responses.
- El plugin puede ser el hogar futuro de widgets custom de Elementor, pero la foundation V1 no debe montar React frontend ni resolver layout con widgets nuevos antes de health/auth/audit/draft-only.

## Normative Docs

- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md`
- `.codex/skills/wp-plugin-development/SKILL.md`
- `.codex/skills/wp-rest-api/SKILL.md`
- `.codex/skills/wp-abilities-api/SKILL.md`
- `.codex/skills/wp-abilities-audit/SKILL.md`
- `.codex/skills/wp-abilities-verify/SKILL.md`
- `.codex/skills/wp-wpcli-and-ops/SKILL.md`
- `.codex/skills/greenhouse-secret-hygiene/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-1111` repeatable read-only discovery and authenticated smoke.
- Secret Manager refs:
  - `PUBLIC_WEBSITE_WORDPRESS_APPLICATION_PASSWORD_SECRET_REF`
  - `PUBLIC_WEBSITE_WORDPRESS_BRIDGE_SHARED_SECRET_SECRET_REF`
- Deployment path del plugin WordPress confirmado por `TASK-1122`: `efeoncepro/efeonce-public-site-runtime:wp-content/plugins/greenhouse-wp-bridge`.
- Confirmar si el primer target es staging Kinsta, draft-only production con allowlist, o ambos: `[verificar]`.

### Blocks / Impacts

- Landing manifest/template implementation.
- Greenhouse UI/API para landing pages.
- HubSpot campaign/UTM attribution sync hacia WordPress.
- Futuras operaciones de publish/cache clear con Kinsta.

### Files owned

- `efeoncepro/efeonce-public-site-runtime:wp-content/plugins/greenhouse-wp-bridge`
- `scripts/public-website/discover-wordpress.ts`
- `docs/operations/discovery-public-website-wordpress-*.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md`
- `docs/tasks/in-progress/TASK-1116-greenhouse-wp-bridge-draft-only-foundation.md`

## Current Repo State

### Already exists

- Architecture/ADR/epic for EPIC-019.
- `pnpm public-website:discover` with public, authenticated and WP-CLI read-only modes.
- Report `docs/operations/discovery-public-website-wordpress-20260614.md`.
- WordPress runtime signals:
  - WordPress REST `wp/v2` available.
  - `wp-abilities/v1` advertised and authenticated list returns 33 abilities.
  - Application Passwords available.
  - Active theme `ohio-child`, parent `ohio`.
  - Elementor/Elementor Pro, Yoast, HubSpot/Leadin, AI providers, `eo-headless-content`, `eo-vibe-coding-api` active.
  - CPT `landing` exists and is private/non-public.

### Gap

- `greenhouse-wp-bridge` exists under `efeoncepro/efeonce-public-site-runtime:wp-content/plugins/greenhouse-wp-bridge` and is deployed/active on Kinsta in read-only inspection mode.
- Current read-only inspection routes:
  - `GET /wp-json/greenhouse-wp-bridge/v1/health`
  - `GET /wp-json/greenhouse-wp-bridge/v1/inspection/elementor-document/{id}`
  - `GET /wp-json/greenhouse-wp-bridge/v1/inspection/ohio-widget-catalog`
- `greenhouse-wp-bridge` v0.2.0 adds read-only Gutenberg/block inspection: `GET /wp-json/greenhouse-wp-bridge/v1/inspection/block-document/{id}`. Recent Efeonce posts are Gutenberg/block-editor content (`hasBlocks=true`, no Elementor data), so draft write design must treat Gutenberg `blockName` and Elementor `widgetType` as separate native module dialects.
- `greenhouse-wp-bridge` v0.3.0 adds code-only signed draft foundation:
  - `POST /wp-json/greenhouse-wp-bridge/v1/drafts`
  - `GET /wp-json/greenhouse-wp-bridge/v1/drafts/{greenhouse_manifest_id}`
  - `PATCH /wp-json/greenhouse-wp-bridge/v1/drafts/{greenhouse_manifest_id}`
  - HMAC canonical request `GHWPB-HMAC-SHA256`, `X-Greenhouse-*` headers, body SHA-256, timestamp window, replay guard, audit meta and `draft|private` only.
  - Mutation routes are default-disabled by `GREENHOUSE_WP_BRIDGE_WRITES_ENABLED`; no live draft smoke until shared secret, staging/preview and least-privilege are ready.
- Production smoke on 2026-06-14: anonymous health returns `401 ghwpb_auth_required`; authenticated health, Elementor inspection for page `244079`, Gutenberg block inspection for post `249766`, and Ohio widget catalog return `200`.
- Greenhouse now has a reusable read-only inspection helper for the active bridge: `pnpm public-website:bridge-inspect -- --page-id <id> [--write]`. First evidence lives at `docs/operations/public-site-bridge-inspections/inspection-page-244079-2026-06-14T16-22-05-591Z.json`.
- Greenhouse also has a read-only internal API lane for the active bridge: `GET /api/admin/public-site/bridge-inspection?pageId=<id>` backed by `src/lib/public-site/bridge-inspection.ts` and gated by `platform.public_site.bridge.inspect`. It is intentionally inspection-only and does not satisfy the signed draft write contract for this task.
- PHP syntax lint passed locally for the new plugin.
- Signed write contract exists in code and Greenhouse signer tests.
- Draft-only endpoints exist in code but are not operationally enabled.
- No staging/preview/rollback baseline exists for Greenhouse-owned WordPress objects.
- Kinsta API token remains missing; cache/backups/environment inventory is not automated.
- No custom Elementor widget registry exists yet. If needed later, it belongs in the bridge/runtime plugin with `\Elementor\Widget_Base`, PHP render and Elementor native controls, not in Ohio parent.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Plugin skeleton and health

- Crear el skeleton del plugin en el path/repo confirmado.
- Exponer health/readiness read-only con version, environment, capabilities registradas y modo operativo.
- Registrar metadata del bridge sin depender de Elementor.
- Preparar namespaces/carpetas para futuras extensiones sin registrar widgets custom aun.

### Slice 2 — Auth, signature and replay guard

- Implementar verificación de Application Password + HMAC/shared secret.
- Validar timestamp, nonce/request id y body hash.
- Fail closed con errores sanitizados.
- No aceptar requests sin correlation id Greenhouse.

### Slice 3 — Abilities-first contract

- Registrar abilities del bridge cuando `wp-abilities/v1` esta disponible.
- Exponer REST fallback equivalente.
- Documentar schema de input/output y capability/capability-map WordPress.

### Slice 4 — Draft-only content write path

- Crear/update draft o private object Greenhouse-owned con metadata de ownership.
- Soportar preview URL y status inspection.
- Bloquear publish/delete/cache clear/theme/plugin/global Elementor mutations.

### Slice 5 — Smoke, audit and rollback baseline

- Ejecutar smoke contra staging/preview target.
- Validar que el objeto creado queda en draft/private y se puede revertir.
- Registrar audit trail/correlation id y actualizar discovery/report docs.

## Out of Scope

- Publicar páginas.
- Limpiar Kinsta/Cloudflare cache.
- Push staging-to-production o backup restore.
- Construir la UI de landing pages en Greenhouse.
- Diseñar el landing manifest final.
- Migrar contenido existente de Elementor/Ohio.
- Ejecutar acciones AI/Jetpack/Yoast mutantes expuestas por Abilities.

## Detailed Spec

El bridge debe aceptar solo payloads tipados y firmados. El contrato read-only ya implementado en repo runtime es:

- `GET /wp-json/greenhouse-wp-bridge/v1/health`
- `GET /wp-json/greenhouse-wp-bridge/v1/inspection/elementor-document/{id}`
- `GET /wp-json/greenhouse-wp-bridge/v1/inspection/ohio-widget-catalog`

El primer contrato mutante futuro puede ser minimo:

- `GET /greenhouse-wp-bridge/v1/health`
- `POST /greenhouse-wp-bridge/v1/drafts`
- `PATCH /greenhouse-wp-bridge/v1/drafts/{greenhouse_manifest_id}`
- `GET /greenhouse-wp-bridge/v1/drafts/{greenhouse_manifest_id}`

Cada draft debe guardar metadata:

- `greenhouse_manifest_id`
- `greenhouse_request_id`
- `greenhouse_actor`
- `greenhouse_environment`
- `greenhouse_source`
- `greenhouse_created_at`
- `greenhouse_updated_at`

El plugin debe rechazar:

- `status=publish`
- cambios a post IDs sin metadata Greenhouse
- acciones sin firma válida
- requests con timestamp fuera de ventana
- duplicate request id si ya fue aplicado

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (skeleton/health) -> Slice 2 (auth/signature) -> Slice 3 (abilities/REST contract) -> Slice 4 (draft-only mutation) -> Slice 5 (smoke/audit/rollback).
- Slice 4 no puede ejecutarse en production sin decisión explícita de target y rollback baseline.
- Publish/cache clear debe nacer en otra task, posterior a evidencia de draft-only.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Mutar contenido productivo por ID incorrecto | WordPress público | medium | Ownership metadata obligatoria + draft-only + blocklist publish/delete | audit request sin `greenhouse_manifest_id` |
| Filtrar secretos en logs/docs | WordPress/GCP | low | Secret Manager refs, no raw values, sanitizar errores | secret scan / grep de diff |
| Bridge queda demasiado privilegiado por usuario admin | WordPress access | medium | Reducir rol/capabilities o encapsular server-side allowlist | discovery muestra role `administrator` |
| Incompatibilidad Elementor/Ohio | WordPress builder | medium | Primer slice no toca Elementor internals; draft simple + preview | preview roto / status 5xx |
| Abilities plugin cambia contrato | WordPress Abilities API | medium | REST fallback + version pin in health | health capability mismatch |

### Feature flags / cutover

- WordPress plugin debe tener modo `draft_only` default.
- Greenhouse runtime debe requerir flag/env antes de llamar mutaciones reales: `[verificar nombre]`.
- Publish/cache clear no tiene flag aqui porque esta fuera de scope.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Desactivar/remover plugin skeleton | <10 min | si |
| Slice 2 | Rotar shared secret y desactivar endpoint mutante | <10 min | si |
| Slice 3 | Desregistrar abilities bridge / desactivar plugin | <10 min | si |
| Slice 4 | Trash del draft Greenhouse-owned creado en smoke + revert plugin | <15 min | si |
| Slice 5 | Revert docs/report si el smoke se invalida | <10 min | si |

### Production verification sequence

1. `pnpm public-website:discover -- --authenticated --wpcli --write`
2. `wp plugin list` read-only via SSH/WP-CLI to confirm bridge install/status.
3. Authenticated `GET bridge health` -> expected ok and `writesEnabled=false` until signed writes ship.
4. Authenticated `GET inspection/elementor-document/{id}` on a known draft/test page -> expected read-only summary.
5. Authenticated `GET inspection/ohio-widget-catalog` -> expected Ohio/HubSpot widget inventory.
6. Future signed draft create in staging/preview target -> expected draft/private only.
7. Verify preview URL, metadata and audit correlation.
8. Verify no published object, no cache clear and no mutation to existing Elementor/Ohio pages.

### Out-of-band coordination required

- Confirmar staging target o production draft-only policy.
- Provisionar `PUBLIC_WEBSITE_WORDPRESS_BRIDGE_SHARED_SECRET_SECRET_REF`.
- Reducir el usuario WordPress tecnico si el bridge puede funcionar con capabilities menores que administrator.
- Provisionar token Kinsta read-only si cache/backups/environment inventory debe ser parte del smoke.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Plugin bridge instalado o listo para deploy en path/repo confirmado.
- [ ] Health/readiness funciona y no filtra secretos.
- [ ] Auth firmada valida Application Password + shared secret/HMAC o equivalente.
- [ ] Abilities del bridge registradas cuando la API esta disponible.
- [ ] REST fallback equivalente documentado.
- [ ] Draft create/update bloquea `publish`, delete, cache clear y objetos no Greenhouse-owned.
- [ ] Smoke real crea/actualiza solo draft/private y deja preview URL.
- [ ] Audit metadata/correlation id verificable.
- [ ] Rollback del draft smoke probado.
- [ ] Docs/architecture/report actualizados.

## Verification

- `pnpm public-website:discover -- --authenticated --wpcli --write`
- `[verificar] wp plugin status greenhouse-wp-bridge`
- `[verificar] signed bridge health smoke`
- `[verificar] signed draft-only smoke`
- `pnpm task:lint --changed`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown queda sincronizado con la carpeta.
- [ ] `docs/tasks/README.md` queda sincronizado.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` queda sincronizado.
- [ ] `docs/operations/discovery-public-website-wordpress-*.md` queda actualizado si el smoke cambia el inventario.
- [ ] EPIC-019 queda actualizado.
- [ ] Arquitectura/ADR quedan actualizados si el bridge cambia source of truth, auth, abilities o deployment path.
- [ ] `Handoff.md`, `changelog.md` y `project_context.md` quedan actualizados.
