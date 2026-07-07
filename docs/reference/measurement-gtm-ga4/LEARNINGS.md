# Learnings — build-log operativo de medición (GTM/GA4)

> Registro vivo de **aprendizajes reales** al operar GTM/GA4 en producción para Efeonce. Cada entrada = qué se hizo + qué se aprendió (gotchas verificados en runtime, no teoría). Los agentes que operen medición (skill `greenhouse-gtm-ga4-operator`) deben leer esto antes de construir tags. Complementa los shapes de `05-gtm-api-v2-tag-shapes.md`.

---

## 2026-07-07 — Tagging de think.efeoncepro.com (subdominio, propiedad unificada, sin doble conteo)

**Qué:** medir `think.efeoncepro.com` (hub Astro, repo `efeonce-think`) con la **MISMA propiedad GA4** (`486264460` / `G-KYPPY57M14`) que efeoncepro.com — funnel unificado (subdominio = mismo stream; NO crear stream/propiedad aparte).

- **Snippet:** instalar el container `GTM-NGHPGRLZ` (head + noscript) en `src/layouts/BaseLayout.astro` de `efeonce-think`. **Cross-repo → rama + PR** (`efeonce-think#10`), NUNCA push directo a `main` (auto-deploy Vercel); merge tras preview verde.
- **page_view sin doble conteo:** el sitio WP ya hace page_view por **Site Kit** (`GT-KV5CNNKQ`). Si se pone un GA4 Config global en el container, **duplica**. Solución: **GA4 Config (`googtag`) gateado por hostname** — trigger `pageview` con filtro `{{Page Hostname}} equals think.efeoncepro.com`. Así dispara SOLO en think; en efeoncepro.com no (Site Kit sigue siendo la única fuente). Verificado: efeoncepro.com = 1 page_view a G-KYPPY57M14; think = 1 page_view a G-KYPPY57M14.
- **El `googtag` mide todo solo:** page_view + session_start + user_engagement + Enhanced Measurement (scroll/outbound/etc.) automáticamente. Enhanced Measurement es config **a nivel de stream** → think hereda los toggles del mismo stream, cero config por evento.
- **Conversiones gratis:** el form dock de think usa `<greenhouse-form>` (renderer gobernado) que ya emite `gh_form_submission_accepted` → el tag genérico `generate_lead` funciona en think por construcción, sin tocar nada.
- Container v3 publicado (generate_lead + GA4 Config think). Verificado con Playwright (`/g/collect en=page_view tid=G-KYPPY57M14` en think; sin doble conteo en WP).

- **Gotcha Astro (`is:inline`):** el snippet GTM en Astro va con `is:inline` SOLO en el `<script>` del loader (correcto/necesario — evita que Astro lo bundlee). En el `<noscript>` **NO** (`is:inline` es directiva para `<script>`/`<style>`; en `<noscript>` no aplica y Astro 7 estricto puede colarla como atributo extraño). Copilot lo flageó en el PR; validado con skills `astro` + `arch-architect` (fix PR #11). Regla: `is:inline` solo en `<script>`/`<style>`.

**Patrón reusable:** para sumar cualquier subdominio/host propio a la misma propiedad → snippet GTM en ese host + GA4 Config gateado por hostname en el container (si el host no tiene ya otra fuente de page_view). Un solo container, una sola propiedad, cero doble conteo. Cross-repo → rama+PR (NUNCA push directo a main con auto-deploy). Es el **mandato §19.2/§19.5 del Tracking Engine**: todo host nuevo nace con el tag GA4.

## 2026-07-07 — Primer tag productivo: `generate_lead` para todos los Growth Forms

**Qué se construyó (por API v2, gobernado):** un pipeline **genérico** que capta el submit confirmado de CUALQUIER form y lo manda a GA4 como `generate_lead`, distinguiendo el form por parámetro.

- Contenedor `GTM-NGHPGRLZ` (account 6291647045, container 218104216), workspace nuevo `forms-generate-lead` (id=3):
  - Variables `DLV - form_slug`, `DLV - form_kind`, `DLV - surface_id` (type `v`, dataLayerVersion=2).
  - Trigger `CE - gh_form_submission_accepted` (type `customEvent`, equals `{{_event}}`).
  - Tag `GA4 Event - generate_lead` (type `gaawe`, `measurementIdOverride=G-KYPPY57M14`, `eventSettingsTable` con los 3 params, firing=trigger).
- Publicado como versión **v2** ("Growth forms → generate_lead").
- GA4 (property `486264460`): custom dimensions `form_slug`/`form_kind`/`surface_id` (EVENT-scoped) + key event `generate_lead` (ONCE_PER_EVENT).
- **Verificado:** Playwright sobre `efeoncepro.com` empujó `gh_form_submission_accepted` → se capturó el request `/g/collect?...tid=G-KYPPY57M14&en=generate_lead` saliendo del browser. Sin enviar un form real (cero lead en HubSpot).

### Gotchas verificados (los que costaron)

1. **`gaawe` exige `measurementIdOverride` (G-ID literal), NO basta el `measurementId` tagReference.** Crear el tag con `{type:tagReference, key:measurementId, value:"GA4 - Tag"}` devolvió `400 vendorTemplate.parameter.measurementIdOverride: The value must not be empty`. Fix: `{type:template, key:measurementIdOverride, value:"G-KYPPY57M14"}`. → Resolver el G-ID de la propiedad ANTES (GA4 Admin `dataStreams`) y usar el override.

2. **`quick_preview` necesita scope `tagmanager.edit.containerversions`**, no solo `edit.containers`. Con solo `edit.containers` → `403 ACCESS_TOKEN_SCOPE_INSUFFICIENT`. Crear tags/vars/triggers sí funciona con `edit.containers`; compilar/versionar necesita `edit.containerversions`; publicar necesita `publish`. Mintear el token con los 3 scopes para un flujo completo.

3. **Un workspace creado por API branchea de la última VERSIÓN PUBLICADA, no del Default Workspace.** El Default Workspace (id=2) tenía borradores `GA4 - Tag`/`html` **nunca publicados**. La última versión live era **v1 "Empty Container"** (0 tags). Por eso publicar mi workspace no borró nada live — pero **SIEMPRE verificar la versión live post-publish** (`versions:live`) para confirmar que no se cayó nada. (Susto real: el print del publish mostró 1 tag; la verificación confirmó que v1 estaba vacía y Site Kit hace el page_view.)

4. **El page_view del sitio lo hace Site Kit (`GT-KV5CNNKQ`), independiente del contenedor GTM.** El contenedor `GTM-NGHPGRLZ` estaba **vacío** (solo cargaba el snippet). Ojo: si algún día se publica un GA4 Config/Google tag DENTRO del GTM, **duplicaría** el page_view de Site Kit. La página también carga `AW-16796059774` (Google Ads) → un Ads conversion se puede colgar de `generate_lead` a futuro.

5. **Propagación CDN de `gtm.js`: minutos, no segundos.** Tras publicar, la primera prueba Playwright NO vio el `generate_lead` (el edge servía la versión vieja). Verificar propagación con `curl "https://www.googletagmanager.com/gtm.js?id=GTM-NGHPGRLZ" | grep <evento>` ANTES de concluir que el tag falla. Una vez que el `gtm.js` contiene el trigger, funciona.

6. **La prueba dura es el request `/g/collect` (Tier 0b), no el realtime de GA4.** El `/g/collect?...en=generate_lead` capturado en Playwright prueba que el tag disparó y el hit salió a la propiedad correcta. El realtime API de GA4 laggea unos minutos y a veces no surface el evento sintético como "usuario activo". No concluir "no funciona" por el realtime; el hit saliente es la prueba.

7b. **⚠️ Consent bloquea la VERIFICACIÓN (no el envío): sin `analytics_storage` concedido, GA4 modela el evento fuera del realtime/reportes estándar.** Al verificar con Playwright/browser, el hit sale igual (`/g/collect` con `gcs=G100` = denied) pero **NO aparece en el realtime** — GA4 lo modela en agregado. Con consent concedido (`gcs=G111`) + ~1-2 min de lag del realtime Data API → aparece (`generate_lead=1` confirmado 2026-07-07). En la prueba: conceder consent en la sesión (`window.gtag('consent','update',{analytics_storage:'granted',ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'})`) ANTES de empujar el evento, y polear el realtime varias veces (el Data API laggea más que el DebugView de la UI). El `uafvl=HeadlessChrome` NO fue el bloqueo (el evento aterrizó igual headless) — el bloqueo era el consent.

7. **Los forms ya emiten al dataLayer por default** (`gtmDataLayer` = `z.boolean().default(true)` en `contracts.ts`). Cero trabajo per-form: un solo tag genérico cubre todos, distinguiendo por `form_slug`. Un form nuevo queda medido el día que se publica, sin tocar GTM.

8. **Gobernanza que funcionó:** build en workspace nuevo (descartable) → `quick_preview` (assert sin compilerError) → mostrar al humano → `create_version` + `publish` con OK explícito → verificar live no rompió nada → verificar el hit → registrar en el TRACKING-PLAN. La API valida al crear (un shape malo falla en el POST, no en producción).

### Pendiente / follow-ups de esta entrada
- El evento de test (`form_slug='verification-test'`) queda en GA4 — filtrable/excluible.
- Borradores `GA4 - Tag`/`html` en el Default Workspace: NO publicar (duplicarían Site Kit); limpiar o dejar.
- Google Ads (`AW-16796059774`): oportunidad de importar `generate_lead` como conversion para bidding.
- Smoke-test forms en producción (`smoke-*`, `live-hs-*`): archivar.
