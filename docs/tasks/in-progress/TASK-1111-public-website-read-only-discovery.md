# TASK-1111 — Public Website Read-Only Discovery

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-019`
- Status real: `Public + authenticated WordPress discovery repetible listo; Kinsta SSH/WP-CLI read-only repetible listo; Kinsta API token pendiente`
- Rank: `TBD`
- Domain: `platform|commercial|marketing-ops|integrations`
- Blocked by: `Kinsta API token para environment/cache/backups read-only; decision de si esto queda como blocker o follow-up de publish/cache`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la primera conexion segura entre Greenhouse y el sitio publico `efeoncepro.com` en modo read-only: inventario REST publico, deteccion de WordPress Abilities API, señales de hosting Kinsta/Cloudflare y contrato de configuracion para pasar luego a discovery autenticada. No publica, no crea drafts y no ejecuta acciones mutantes.

## Why This Task Exists

`EPIC-019` no debe empezar con un write path contra un sitio publico. Antes de disenar el bridge o publicar landings, Greenhouse necesita saber que expone hoy WordPress, si Abilities esta disponible, que tipos/landings existen, que headers de Kinsta/CDN aparecen y que secretos faltan para inspeccionar tema/builder/plugins/SEO/Kinsta sin filtrar credenciales.

## Goal

- Proveer un script reusable `pnpm public-website:discover` que haga inventory read-only publico, autenticado y WP-CLI de `efeoncepro.com`.
- Guardar el primer reporte versionado de discovery bajo `docs/operations/`.
- Documentar el contrato de env vars/Secret Manager para WordPress Application Passwords, Kinsta API y futuro bridge HMAC.
- Mantener claro el limite operativo: sin escrituras hasta usuario tecnico, staging/preview, audit log y rollback baseline.

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

Reglas obligatorias:

- Discovery publica solo puede usar `GET` contra endpoints publicos y no debe autenticar ni mutar.
- No imprimir ni commitear application passwords, Kinsta tokens, bridge secrets ni valores resueltos desde Secret Manager.
- WordPress Abilities API es el contrato preferente cuando el runtime lo soporte; REST queda como transporte/compatibilidad.
- Kinsta operations destructivas quedan fuera de scope; cache clear futuro requiere task separada de publish.

## Normative Docs

- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md`
- `docs/context/00_INDEX.md`
- `docs/context/03_ecosistema-producto.md`
- `docs/context/08_estrategia-comercial.md`
- `docs/context/11_hubspot-bowtie.md`
- `.codex/skills/wordpress-router/SKILL.md`
- `.codex/skills/wp-rest-api/SKILL.md`
- `.codex/skills/wp-abilities-api/SKILL.md`
- `.codex/skills/greenhouse-secret-hygiene/SKILL.md`

## Dependencies & Impact

### Depends on

- Public REST exposure at `https://efeoncepro.com/wp-json/`.
- WordPress technical user with Application Passwords (`public-website-wordpress-application-password` in Secret Manager).
- Kinsta SSH access via user-level public key for read-only WP-CLI inspection.
- Future Kinsta API token with least privilege for environment/cache/backups inventory.
- Secret Manager refs published through env vars, not raw values.

### Blocks / Impacts

- `EPIC-019` phase 1 bridge plugin foundation.
- Landing manifest/template design, because the current WordPress types/builders/plugins influence what the bridge can render safely.
- Future HubSpot attribution work, because existing landing/page inventory needs to be mapped before Greenhouse-owned objects are introduced.

### Files owned

- `scripts/public-website/discover-wordpress.ts`
- `docs/operations/discovery-public-website-wordpress-*.md`
- `.env.example`
- `package.json`
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/tasks/README.md`
- `Handoff.md`
- `changelog.md`
- `project_context.md`

## Current Repo State

### Already exists

- Architecture/ADR/epic for the public website landing control plane exist in proposed state.
- Official WordPress Agent Skills are vendored for Codex and Claude.
- `efeoncepro.com/wp-json/` publicly advertises `wp/v2`, `wp-abilities/v1` and `application-passwords`.

### Gap

- No Greenhouse-side connector/script existed for repeatable public website discovery.
- No env contract existed for WordPress/Kinsta public website credentials.
- Authenticated WordPress smoke is available.
- Kinsta SSH/WP-CLI read-only access is available for operational inspection at `/www/efeoncegroup_752/public`; active theme/plugin/post-type inventory was collected manually on 2026-06-13.
- Authenticated discovery ya tiene un Slice 3 repetible para WordPress/Abilities/plugins/theme/post-types usando Application Password + WP-CLI read-only.
- Kinsta environment/cache/backups discovery remains blocked until a Kinsta API token is provisioned, o hasta decidir formalmente que cache/backups pertenecen a una task posterior de publish.

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

### Slice 1 — Public REST and Abilities discovery

- Crear `pnpm public-website:discover`.
- Inventariar REST index, namespaces, authentication modes, sample pages/posts, REST types and public hosting/cache headers.
- Detectar `wp-abilities/v1`, listar rutas del namespace y registrar si `/abilities` requiere auth.
- Escribir reporte Markdown con `--write`.

### Slice 2 — Config and secret contract

- Agregar env vars vacias en `.env.example` para WordPress base URL, technical username, application password Secret Manager ref, Kinsta token Secret Manager ref, Kinsta SSH read-only metadata y future bridge shared secret ref.
- No resolver ni imprimir secretos; solo reportar presencia/ausencia de env vars.

### Slice 3 — Authenticated read-only follow-up

- Extender el discovery para listar abilities visibles, tema/builder/plugin/SEO surface sin writes.
- Confirmar scope minimo del usuario tecnico antes de bridge/publish tasks; el usuario actual `Greenhouse` autentica correctamente pero conserva rol `administrator`, por lo que la reduccion de privilegios queda como riesgo de TASK-1116.
- Incorporar la via SSH/WP-CLI read-only como fallback auditado cuando la Kinsta API no cubra WordPress internals; comandos mutantes siguen fuera de scope.
- Kinsta environment/cache/backups queda pendiente de token Kinsta API y no debe bloquear el bridge draft-only si publish/cache clear siguen fuera de scope.

## Out of Scope

- Crear o instalar el plugin `greenhouse-wp-bridge`.
- Crear, actualizar, publicar o borrar paginas WordPress.
- Ejecutar Kinsta cache clear, staging push, backup restore, reset o cualquier accion destructiva.
- Agregar UI Greenhouse.
- Crear tablas/migraciones de landing manifests.

## Detailed Spec

El script debe:

1. Usar `PUBLIC_WEBSITE_WORDPRESS_BASE_URL` con default `https://efeoncepro.com`.
2. Hacer solo `GET` a endpoints publicos:
   - `/wp-json/`
   - `/wp-json/wp/v2/pages?per_page=10&_fields=id,slug,status,link,modified,title,type`
   - `/wp-json/wp/v2/posts?per_page=10&_fields=id,slug,status,link,modified,title,type`
   - `/wp-json/wp/v2/types`
   - `/wp-json/wp-abilities/v1/`
   - `/wp-json/wp-abilities/v1/abilities?per_page=10`
3. Capturar headers utiles (`x-kinsta-cache`, `ki-cache-type`, `ki-edge`, `cf-cache-status`, `x-wp-total`, `link`, etc.).
4. Tratar `401/403` en `/wp-abilities/v1/abilities` como señal esperada de auth requerida, no como fallo del discovery publico.
5. Escribir un reporte Markdown solo cuando se pasa `--write`.

## Rollout Plan & Risk Matrix

Repo-only read-only change. No requiere migraciones, deploy ni credenciales para Slice 1.

### Slice ordering hard rule

- Slice 1 (public discovery) -> Slice 2 (env/secret contract) -> Slice 3 (authenticated read-only).
- Slice 3 WordPress queda cerrado con Application Password + WP-CLI read-only; Kinsta API queda como blocker solo para environment/cache/backups/publish/cache clear.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El script accidentalmente muta WordPress | WordPress publico | low | Solo `GET`, sin Authorization, sin payload mutante | code review / endpoint allowlist |
| Se filtra un token en reporte o logs | Secret Manager / WordPress / Kinsta | low | No resolver secretos; reportar solo bool de env var presente | grep de diffs / secret scan |
| Cloudflare/Kinsta bloquea discovery por rate o bot | Public website | low | Pocos endpoints, timeout acotado, sin loop | HTTP 403/429 en reporte |
| Abilities existe pero lista requiere auth y se interpreta como fallo | WordPress bridge planning | medium | Clasificar `401/403` como `listRequiresAuth=true` | reporte `Abilities API` |

### Feature flags / cutover

Sin flag — script local/documental, no runtime.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert script y package script | <10 min | si |
| Slice 2 | Revert `.env.example` env vars si el naming cambia | <10 min | si |
| Slice 3 | No aplica hasta credenciales; extender bajo follow-up | TBD | si |

### Production verification sequence

1. `pnpm public-website:discover`
2. `pnpm public-website:discover -- --write`
3. `node --check` no aplica a TypeScript; usar `pnpm exec tsc --noEmit` o lint general.
4. Confirmar que el reporte no contiene secretos ni Authorization headers.

### Out-of-band coordination required

- Crear usuario tecnico WordPress con permisos minimos y Application Password.
- Guardar el application password en GCP Secret Manager y publicar `PUBLIC_WEBSITE_WORDPRESS_APPLICATION_PASSWORD_SECRET_REF`.
- Crear/provisionar token Kinsta con scope minimo read-only y publicar `PUBLIC_WEBSITE_KINSTA_API_TOKEN_SECRET_REF` para ambiente/cache/backups. SSH/WP-CLI ya cubre inspeccion WordPress read-only, pero no reemplaza el inventario Kinsta API.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe script read-only reusable para inventario publico WordPress.
- [x] El script confirma `wp/v2`, `wp-abilities/v1` y `application-passwords` cuando el sitio los anuncia.
- [x] El script clasifica la lista de abilities como autenticada si responde `401/403`.
- [x] `.env.example` documenta los env vars necesarios sin valores secretos, incluyendo metadata SSH Kinsta.
- [x] Existe reporte Markdown inicial versionado.
- [x] WordPress application password guardado en Secret Manager y smoke autenticado `GET /wp/v2/users/me?context=edit` verde.
- [x] WordPress Abilities list autenticada responde 200.
- [x] Kinsta SSH con clave publica dedicada registrado y smoke WP-CLI read-only verde.
- [x] Inventario WP-CLI read-only manual de plugins, theme y post types ejecutado sin writes.
- [x] Discovery autenticada repetible de WordPress Abilities, editable REST types, pages y plugin endpoint automatizada sin writes.
- [x] Discovery WP-CLI repetible de theme/plugins/post-types automatizada sin writes.
- [ ] Discovery Kinsta API de environment/cache/backups automatizada con token de menor privilegio o formally deferred fuera del bridge draft-only.

## Verification

- `pnpm public-website:discover`
- `pnpm public-website:discover -- --write`
- `PUBLIC_WEBSITE_WORDPRESS_USERNAME='Greenhouse INTEGRATION' PUBLIC_WEBSITE_WORDPRESS_APPLICATION_PASSWORD_SECRET_REF=public-website-wordpress-application-password PUBLIC_WEBSITE_KINSTA_SSH_HOST=161.153.204.166 PUBLIC_WEBSITE_KINSTA_SSH_PORT=64805 PUBLIC_WEBSITE_KINSTA_SSH_USER=efeoncegroup PUBLIC_WEBSITE_KINSTA_SSH_AUTH_METHOD=public-key PUBLIC_WEBSITE_KINSTA_SSH_KEY_PATH=/Users/jreye/.ssh/greenhouse_efeonce_kinsta_ed25519 PUBLIC_WEBSITE_KINSTA_WORDPRESS_PATH=/www/efeoncegroup_752/public pnpm public-website:discover -- --authenticated --wpcli --write`
- `pnpm ops:lint --changed`
- `pnpm task:lint --changed`
- `pnpm docs:closure-check`
- `pnpm exec tsc --noEmit`
- `git diff --check`
- `ssh -i <local-kinsta-key> -o BatchMode=yes -o IdentitiesOnly=yes -p 64805 efeoncegroup@161.153.204.166 'cd /www/efeoncegroup_752/public && wp --info && wp option get home && wp option get siteurl'`
- `ssh -i <local-kinsta-key> -o BatchMode=yes -o IdentitiesOnly=yes -p 64805 efeoncegroup@161.153.204.166 'cd /www/efeoncegroup_752/public && wp plugin list --format=json && wp theme list --format=json && wp post-type list --format=json'`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` hasta credenciales; `complete` solo despues de authenticated read-only o cierre explicito de scope)
- [ ] el archivo vive en la carpeta correcta (`in-progress/` mientras falta authenticated/Kinsta)
- [ ] `docs/tasks/README.md` quedo sincronizado
- [ ] `Handoff.md` quedo actualizado con hallazgos y blockers
- [ ] `changelog.md` quedo actualizado
- [ ] `project_context.md` quedo actualizado si el contrato operativo cambia

## Follow-ups

- `TASK-1116` — crear `greenhouse-wp-bridge` foundation draft-only con auth firmada, Abilities-first y audit metadata.
- Crear child task para modelo de landing manifest/templates despues de conocer el rendering contract real del WordPress actual.

## Open Questions

- Que capabilities minimas necesita el usuario tecnico `Greenhouse` para crear drafts sin rol administrator?
- Que scope exacto permite Kinsta para read-only site/environment/cache/backups?
- El CPT publico `landing` existente debe tratarse como `wordpress_owned` observado o migrarse a `greenhouse_owned` bajo un bridge futuro?
