# Operar el motor de CTAs (foundation TASK-1339 + renderer/gobernanza TASK-1340)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-07-17 por Claude (TASK-1339)
> **Ultima actualizacion:** 2026-07-18 por Claude (TASK-1340 — embed en hosts + gobernanza /growth/ctas)
> **Documentacion tecnica:** [GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md)

## Para qué sirve

Definir, publicar, pausar y medir CTAs/popups gobernados que se muestran en las superficies públicas (WordPress, Think). Se opera desde **/growth/ctas** (menú Growth: inventario, estado, lifecycle y preview — TASK-1340) o por API admin/CLI. El renderer portable `<greenhouse-cta>` ya existe; su despliegue a hosts es el flip coordinado.

## Antes de empezar

- Flag `GROWTH_CTA_ENGINE_ENABLED=true` en el environment donde vas a operar las **APIs** (los commands/CLI no dependen del flag). Hoy está OFF en todos los ambientes.
- Sesión interna con la capability que corresponda (`growth.cta.read/author/publish/pause`).
- El form de destino de la acción debe estar **publicado** en Growth Forms (el publish del CTA lo verifica y bloquea si no resuelve).

## Paso a paso

### Crear y publicar un CTA

1. `POST /api/admin/growth/ctas` con slug, name, purpose, placement, content (eyebrow/headline/body/ctaLabel…), `actionPolicy: { kind: 'open_growth_form', formRef: '<slug-o-form-key>' }`, targeting (`routes` glob) y priority. Crea la versión **draft**.
2. `POST /api/admin/growth/ctas/{ctaId}/lifecycle` con `{ action: 'submit_review', ctaVersionId }`.
3. Mismo endpoint con `{ action: 'publish', ctaVersionId }`. El publish es **atómico**: valida que la acción resuelva contra Growth Forms, congela el snapshot (inmutable) y deprecia la versión published anterior si la hay.
4. Para editar un CTA vivo: autora una **versión nueva** (paso 1 con el mismo slug) y publícala — nunca se edita la publicada.

### Registrar una superficie (dónde puede renderizar)

1. `POST /api/admin/growth/ctas/surfaces` con `{ action: 'register', surfaceKind, surfaceName, originAllowlist, allowedCtaSlugs }`.
2. La respuesta trae el **embed key secret UNA sola vez** — guárdalo server-side en el host (plugin WordPress / config Think). En DB solo queda el hash.
3. Para rotar la credencial: `{ action: 'rotate_embed_key', surfaceId }` (invalida la anterior en el acto).

### Pausar de emergencia / reanudar

- `{ action: 'pause', ctaVersionId }` — la versión deja de arbitrarse (deja de aparecer al expirar el cache CORS/contrato, ≤ ~2 min). Requiere solo `growth.cta.pause`.
- `{ action: 'resume', ctaVersionId }` — vuelve a published (si otra versión se publicó entre medio, el sistema lo rechaza).

### Seed canónico del primer CTA

```bash
GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME= \
npx tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/growth/seed-cta-ai-visibility-followup.ts --smoke
```

Idempotente; con `--smoke` ejercita render arbitrado + ingest + rechazo de forja end-to-end.

## Qué significan los estados

`draft → review → published → paused → deprecated → archived`. Solo `published` se muestra; `paused` es reversible; una sola versión `published` viva por CTA.

## Qué no hacer

- **No** editar filas de `cta_version` publicadas por SQL (el trigger lo bloquea; editar = versión nueva).
- **No** borrar filas de `cta_conversion_event` (append-only; el trigger bloquea UPDATE/DELETE).
- **No** tratar clics `browser_reported` como conversiones — solo `server_confirmed` cuenta en reportes.
- **No** committear ni loggear los embed key secrets.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| Rutas responden 404 "No disponible" | Flag OFF en ese environment | Ver `FEATURE_FLAG_STATE_LEDGER.md`; el flip se coordina con TASK-1340 |
| Publish rechaza con `growth_cta_action_not_resolvable` | El form de destino no está publicado | Publicar el Growth Form primero |
| Signal `surface_unauthorized_attempt` > 0 | Ingest forjado o host mal configurado (embed key/origin) | Revisar el host; si es ataque, rotar embed key |
| Signal `form_handoff_failed` > 0 | Un CTA publicado apunta a un form despublicado | Pausar el CTA o republicar el form |

## Referencias técnicas

- Primitive: [src/lib/growth/ctas/](../../../src/lib/growth/ctas/)
- Smoke SQL: `scripts/growth/_sanity-cta-store-sql.ts`
- Spec: `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md` (§23 delta de esta entrega)

## Incrustar el CTA en un host (WordPress / Astro / Think)

El renderer portable se sirve como bundle estático desde Greenhouse (espejo del de forms):

```
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

- El `embed-key` autentica la **surface** (host), no al visitante — es config del host (wp-config /
  Vercel env), NUNCA se committea a un repo. Rotable vía `POST /api/admin/growth/ctas/surfaces
  {action:'rotate_embed_key'}`.
- `route` se toma sola del pathname; `cta` filtra el resultado arbitrado a un slug específico
  (sin `cta`, monta el primer no-interruptivo elegible).
- Fail-closed: con flag OFF, contrato no elegible o error, el element queda `display:none` —
  jamás un card roto en público.
- **Think**: usar el componente `GrowthCtaDock.astro` (rama `task/TASK-1340-growth-cta-followup`
  de `efeonce-think`); config por env `GREENHOUSE_CTA_SURFACE_ID` + `GREENHOUSE_CTA_EMBED_KEY`.
- **Variantes visuales**: cada versión de CTA elige su `style_variant` (`default` | `spotlight` |
  `minimal`) — es DATO gobernado; el host además puede re-tematizar por tokens CSS `--gh-cta-*`.
- **Medición**: el renderer emite `greenhouse_cta_*` al `dataLayer` del host (allowlist dura, sin
  PII). Los tags GA4 del container se publican en el flip (spec turnkey en
  `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` §CTAs; publish SOLO workspace → preview →
  confirmación humana).
