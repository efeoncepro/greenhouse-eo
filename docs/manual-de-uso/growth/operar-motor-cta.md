# Operar el motor de CTAs (`/growth/ctas` + API)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.2
> **Creado:** 2026-07-17 por Claude (TASK-1339)
> **Ultima actualizacion:** 2026-07-18 por Claude (rollout a producción: gobernanza en Growth, embed en hosts, medición GTM live)
> **Documentacion tecnica:** [GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md)
> **Skill de dominio (agentes):** `greenhouse-growth-ctas`

## Para qué sirve

Definir, publicar, pausar, embeber y medir CTAs/popups gobernados en las superficies públicas (Think, WordPress). El día a día se opera desde **`/growth/ctas`** (menú Growth); la autoría de CTAs nuevos hoy es por API admin o seed/CLI (el cockpit visual de autoría es una task futura).

## Estado vigente (2026-07-18)

Motor **encendido en staging y producción**. Primer CTA (`ai-visibility-report-followup`) **live** en el reporte AI Visibility de Think **y en WordPress** (página de prueba `efeoncepro.com/greenhouse-cta-prueba/`, noindex, `cta-location=wp_test_page` — decisión del operador: validar en test page antes del placement amplio). Medición GTM/GA4 **publicada y verificada E2E en ambos hosts** (dataLayer + `/g/collect` + ingest + ledger + forja 403; TASK-1427). Pendientes: placement amplio en WP (decisión post-validación) y ventana steady-state de 7 días de los signals.

**Rollback de la página de prueba WP:** borrar la página id `251561` (`wp post delete 251561 --force` vía `pnpm public-website:wpcli`) — no se tocó tema ni plugin.

## Antes de empezar

- Rol operador interno con la capability que corresponda (`growth.cta.read/author/publish/pause`).
- Para autorar: el form de destino de la acción debe estar **publicado** en Growth Forms (el publish del CTA lo verifica y bloquea si no resuelve).
- Para embeber en un host nuevo: surface registrada + embed key (ver §Registrar una superficie).

## Operación diaria desde `/growth/ctas` (menú Growth)

1. **Ver el estado**: el chip del header dice si el motor está encendido en ese ambiente; la tabla de inventario muestra cada CTA con su estado, campaña y versión.
2. **Pausar de emergencia**: botón `Pausar` en la fila (pide confirmación). El CTA deja de mostrarse en las superficies públicas en ~2 minutos. `Reanudar` lo devuelve a publicado. Solo requiere la capability `growth.cta.pause`.
3. **Publicar**: cuando una versión está `En revisión`, el botón `Publicar` (con confirmación) congela el snapshot inmutable y deprecia la versión publicada anterior si existe.
4. **Preview**: la sección "Preview del renderer" muestra el card con las variantes visuales (`Default`, `Spotlight`, `Minimal`, banner, copy largo) exactamente como se ve en un host.

## Crear y publicar un CTA (API admin)

1. `POST /api/admin/growth/ctas` con slug, name, purpose, placement, content (eyebrow/headline/body/ctaLabel/dismissLabel/footnote), `styleVariant` opcional (`default`|`spotlight`|`minimal`), `actionPolicy: { kind: 'open_growth_form', formRef: '<slug-o-form-key>' }`, targeting (`routes` glob) y priority. Crea la versión **draft**.
2. `POST /api/admin/growth/ctas/{ctaId}/lifecycle` con `{ action: 'submit_review', ctaVersionId }` y luego `{ action: 'publish', ctaVersionId }` (o desde la UI).
3. Para editar un CTA vivo: autora una **versión nueva** (paso 1 con el mismo slug) y publícala — nunca se edita la publicada.
4. **Registrar la medición**: fila del CTA en `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` §CTAs (obligatorio; los tags GTM de la familia ya cubren todo CTA nuevo — se distinguen por `cta_slug`).

## Registrar una superficie (host autorizado)

1. `POST /api/admin/growth/ctas/surfaces` con `{ action: 'register', surfaceKind, surfaceName, originAllowlist, allowedCtaSlugs }`.
2. La respuesta trae el **embed key secret UNA sola vez** — guárdalo server-side en el host (wp-config / Vercel env). En DB solo queda el hash.
3. Rotar: `{ action: 'rotate_embed_key', surfaceId }` (invalida la anterior en el acto).

Surfaces vivas hoy: `Efeonce public site (WordPress)` y `Think (Astro)` (esta última ya configurada en el Vercel de `efeonce-think`).

## Incrustar el CTA en un host

Bundle estático servido por Greenhouse (pineado por canal):

```text
https://greenhouse.efeoncepro.com/growth-cta/renderer-<canal>.js   (preview|beta|stable; alias renderer-latest.js)
```

Snippet canónico (WordPress vía widget HTML/Elementor, o cualquier host HTML):

```html
<script src="https://greenhouse.efeoncepro.com/growth-cta/renderer-latest.js" defer></script>
<greenhouse-cta
  surface="<surface_id del binding>"
  embed-key="<embed key secret de la surface>"
  cta="ai-visibility-report-followup"
  cta-location="<ubicación semántica, ej. blog_footer>"
  form-surface="<surface_id del Growth Form en este host>"
  locale="es-CL"
></greenhouse-cta>
```

- **Think** ya lo monta con el componente `GrowthCtaDock.astro` (repo `efeonce-think`; config por env `GREENHOUSE_CTA_SURFACE_ID` + `GREENHOUSE_CTA_EMBED_KEY`).
- `route` se toma sola del pathname; `cta` filtra a un slug específico (sin `cta`, monta el primer no-interruptivo elegible).
- Fail-closed: con motor apagado, contrato no elegible o error, el element queda `display:none` — jamás un card roto en público.
- El host puede re-tematizar el card completo por tokens CSS `--gh-cta-*`; la variante visual base la elige la versión del CTA (dato gobernado).

## Medición (GTM / GA4) — LIVE

- El renderer emite `greenhouse_cta_viewed/clicked/dismissed/form_opened/form_submitted/error` al `dataLayer` del host con allowlist dura (sin PII).
- El container `GTM-NGHPGRLZ` (v4) tiene los 6 tags GA4 + triggers + DLVs publicados; GA4 reporta con las custom dimensions `cta_slug`, `cta_location`, `placement`.
- **Ningún click de CTA es key event**: la conversión sigue siendo `generate_lead` del form (sin doble conteo).
- Eventos/params nuevos: extender el SoT (`CTA_GTM_EVENT_NAMES`/allowlist en `src/lib/growth/ctas/contracts.ts`) + espejo del renderer + fila TRACKING-PLAN, y taggear con la skill `greenhouse-gtm-ga4-operator` (publish solo workspace→preview→confirmación humana).

## Qué significan los estados

`Borrador → En revisión → Publicado → Pausado → Deprecado → Archivado`. Solo `Publicado` se muestra; `Pausado` es reversible; una sola versión publicada viva por CTA.

## Kill switch de emergencia (TASK-1428 — sin redeploy)

Tres frenos, del más fino al más amplio: **pausar la versión** (lifecycle `pause`, deja de arbitrarse en ≤ ~2 min), **kill switch per-surface** y **kill switch global**. Los dos últimos son estado operativo en base de datos (nunca una env var) y operan al instante server-side:

```bash
# Ver estado vigente + audit trail (capability growth.cta.read)
pnpm staging:request "/api/admin/growth/ctas/kill-switch"

# Apagar TODO el motor en todas las surfaces (capability growth.cta.pause; reason obligatorio ≥5 chars)
pnpm staging:request POST "/api/admin/growth/ctas/kill-switch" '{"action":"engage","scope":"global","reason":"incidente en el host"}'

# Apagar una sola surface
pnpm staging:request POST "/api/admin/growth/ctas/kill-switch" '{"action":"engage","scope":"surface","surfaceId":"csur-…","reason":"surface rota"}'

# Restaurar (release del mismo scope)
pnpm staging:request POST "/api/admin/growth/ctas/kill-switch" '{"action":"release","scope":"global","reason":"incidente resuelto"}'
```

**Ventana efectiva**: el servidor responde `killed` desde el request siguiente al engage (no hay cache HTTP en las rutas públicas; el cache CORS de 90s no la alarga — un origin ya permitido recibe la respuesta `killed` igual). Lo que domina la ventana es la cadencia de fetch del renderer: hoy 1 fetch por pageview, así que las páginas ya abiertas conservan el CTA pintado hasta la próxima navegación. Mientras un switch esté activo, el signal `growth.cta.kill_switch_active` queda en warning en `/admin/operations` — el retiro es visible, no silencioso. Cada engage/release queda en el audit trail (quién, cuándo, por qué).

## Suppression y frequency capping (TASK-1428 — hoy en shadow)

El motor decide server-side si un visitante debe volver a ver un CTA: dismiss reciente (cooldown default 14 días), conversión verificada, o tope de impresiones interruptivas (per-CTA 2/24h + global 3/día por visitante). Con `GROWTH_CTA_SUPPRESSION_ENFORCEMENT_ENABLED` OFF (estado actual) la decisión solo se **registra** (shadow) sin alterar lo que se muestra; el flip a ON activa la exclusión real. La policy por versión vive en `suppression_policy_json` (vacía = defaults conservadores). Sin consentimiento del visitante no se guarda estado durable: la ventana es de sesión (48 h) y los placements interruptivos directamente no se muestran a visitantes sin identidad.

## Qué no hacer

- **No** editar filas de `cta_version` publicadas por SQL (el trigger lo bloquea; editar = versión nueva).
- **No** borrar filas de `cta_conversion_event` (append-only; el trigger bloquea UPDATE/DELETE).
- **No** tratar clics `browser_reported` como conversiones — solo `server_confirmed` cuenta en reportes.
- **No** committear ni loggear los embed key secrets.
- **No** publicar tags al container GTM sin preview + confirmación humana.
- **No** dejar un kill switch engaged sin dueño: es un estado de emergencia visible (signal en warning), no una pausa de largo plazo — para retiros planificados usar `pause`/`deprecate` del lifecycle.
- **No** borrar filas de `cta_kill_switch_event` (append-only; es el audit del stop de emergencia).
- **No** prender `GROWTH_CTA_SUPPRESSION_ENFORCEMENT_ENABLED` en producción sin la ventana de shadow-compare en staging (secuencia del rollout de TASK-1428).

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| El CTA no aparece en el host | Motor apagado en ese ambiente, CTA no publicado, ruta fuera del targeting, o surface/embed key mal configurada | Chip de estado en `/growth/ctas`; probar `GET /render` con la surface real; revisar el signal de forja |
| Publish rechaza con `growth_cta_action_not_resolvable` | El form de destino no está publicado | Publicar el Growth Form primero |
| Signal `surface_unauthorized_attempt` > 0 | Ingest forjado o host mal configurado (embed key/origin) | Revisar el host; si es ataque, rotar embed key |
| Signal `form_handoff_failed` > 0 | Un CTA publicado apunta a un form despublicado | Pausar el CTA o republicar el form |
| Eventos no llegan a GA4 | Consent denied, tag sin propagar (CDN toma minutos), o lag del realtime | Verificar `/g/collect` con consent granted (LEARNINGS de medición); no concluir por el realtime |

## Seed y smokes canónicos

```bash
# Seed idempotente del primer CTA + smoke e2e (render arbitrado + ingest + rechazo de forja)
GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME= \
npx tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/growth/seed-cta-ai-visibility-followup.ts --smoke

# Suites del dominio + renderer · GVC de la gobernanza
pnpm vitest run src/growth-cta-renderer src/lib/growth/ctas
pnpm fe:capture task-1340-growth-cta-renderer --env=local
```

## Referencias técnicas

- Primitive: [src/lib/growth/ctas/](../../../src/lib/growth/ctas/) · Renderer: [src/growth-cta-renderer/](../../../src/growth-cta-renderer/)
- Spec: `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md` (§23 delta)
- Funcional: `docs/documentation/growth/motor-cta-popup.md`
- Skill de dominio: `.claude/skills/greenhouse-growth-ctas/SKILL.md` (espejo `.codex/`)
