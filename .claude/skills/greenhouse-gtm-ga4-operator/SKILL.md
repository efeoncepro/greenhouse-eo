---
name: greenhouse-gtm-ga4-operator
description: Operate Google Tag Manager + GA4 for Efeonce — create/edit tags, triggers and variables via the GTM API v2 (governed workspace → preview → confirm → publish), register GA4 custom dimensions and key events, and verify events land. Use when tagging Growth Forms, Growth CTAs, the native meeting scheduler or landings; wiring governed dataLayer events to GA4; building or auditing GTM container config; confirming a measurement ID/property; or diagnosing "event not showing in GA4". Operates the `src/lib/growth/{gtm,ga4}` clients and the measurement tracking plan; event semantics remain owned by their source domains.
---

# Greenhouse GTM + GA4 Operator

Use this skill to **operate measurement instrumentation** for Efeonce: build and publish GTM tags/triggers/variables via the API v2, register GA4 custom dimensions and key events, and verify that events actually land in GA4. It is an **executing operator**, not a knowledge dump — the conceptual reference (event model, naming, taxonomy, house style) lives in **`docs/reference/measurement-gtm-ga4/`** (owner skill: `growth-marketing-cro`). Load that for the "what/why"; this skill is the "how to build/publish/verify".

> **Efeonce tagging is immature.** Assume nothing is tagged until verified. Build in the workspace, verify, and only publish with human confirmation.

## When to invoke

- Tagging a Growth Form, Growth CTA, native meeting scheduler or landing so its governed event reaches GA4.
- Wiring form `gh_form_*`, CTA engine `greenhouse_cta_*`, legacy host `gh_cta_clicked` or native
  meeting `gh_meeting_*` events to GA4 without merging their namespaces.
- Creating/editing/publishing GTM tags, triggers, variables (by API or reviewing UI changes).
- Registering GA4 custom dimensions (`form_slug`, `form_kind`, `surface_id`, `cta_location`…) or key events (`generate_lead`, `sign_up`).
- Confirming which Measurement ID maps to which GA4 property; auditing a container.
- Diagnosing "event not showing in GA4" (container-not-installed, wrong ID, consent, dataLayer timing).

For **event naming / taxonomy / the gh_ house style** → `docs/reference/measurement-gtm-ga4/` (skill `growth-marketing-cro`). For **campaign/UTM measurement strategy** → `digital-marketing`.

## Canonical coordinates (Efeonce)

| Recurso | Valor |
|---|---|
| GTM contenedor live | `GTM-NGHPGRLZ` · account `6291647045` · container `218104216` · workspace **Default (id=2)** |
| GTM Google tag (config) actual | type `googtag`, `tagId=G-KYPPY57M14` (firing All Pages) |
| GA4 propiedad | `efeoncepro.com` · propertyId `486264460` · account GA4 `252968286` |
| Hosts medidos (misma propiedad) | `efeoncepro.com` (page_view vía Site Kit) + `think.efeoncepro.com` (page_view vía GA4 Config gateado por hostname en el container; snippet GTM en `efeonce-think` repo). Subdominio = mismo stream, funnel unificado. |
| Google tag del sitio (Site Kit) | `GT-KV5CNNKQ` (separado del GTM) |
| Service account | `greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com` |
| Clientes de código | `src/lib/growth/gtm/api-client.ts` (`GtmApiClient`) · `src/lib/growth/ga4/api-client.ts` |
| Verificar en vivo | `scripts/ga4/realtime-events.ts 486264460` · `scripts/gtm/verify-connection.ts` |

> **⚠️ Verificar SIEMPRE el Measurement ID destino.** El sitio tiene DOS ids GA4-ish (`G-KYPPY57M14` en el GTM, `GT-KV5CNNKQ` de Site Kit). Antes de crear un GA4 Event tag, confirmar **qué measurement ID pertenece a la propiedad `486264460`** por la Admin API (`properties/486264460/dataStreams`) — si mandás al id equivocado, el evento no aparece en la propiedad que medimos. Ver `docs/reference/measurement-gtm-ga4/07-ga4-admin-api-ops.md`.

## Metodología — cómo decidir el camino (árbol de decisión)

Ante una tarea de medición, seguir este árbol; NO improvisar el camino:

1. **¿Qué se quiere medir?** submit de form · click de CTA · vista · conversión.
2. **¿El evento ya se emite al dataLayer?** Resolver su SoT antes de taggear: Forms `gh_form_*`
   (`src/lib/growth/forms/contracts.ts`); CTA engine `greenhouse_cta_*`
   (`src/lib/growth/ctas/contracts.ts`); rail CTA legacy `gh_cta_clicked` (no renombrar); meetings
   `gh_meeting_step_reached|gh_meeting_booking_confirmed` (`src/lib/growth/meetings/contracts.ts`).
   Verificar el renderer y el dataLayer; GTM no inventa eventos ausentes.
3. **¿Existe un evento recomendado GA4 que calce?** (lead → `generate_lead`; signup → `sign_up`). Sí → usar ese verbatim (hereda key events/predictivos). No → custom `gh_<object>_<action>`. Regla completa: doc `04`.
4. **¿Ya hay un tag genérico que lo cubra?** Un solo GA4 Event tag + parámetro de identidad (`form_slug`) cubre N superficies — **reusar antes de crear**. Ver `TRACKING-PLAN.md`.
5. **Construir** con el Workflow gobernado (abajo) usando los shapes verificados del doc `05`.
6. **Verificar** que LLEGA a GA4: verification tiers del doc `06 §3` + **LEARNINGS §7b (consent granted + lag del Data API)**. La prueba dura es el `/g/collect`, la confirmación es el evento en realtime.
7. **Cerrar**: registrar la fila en `TRACKING-PLAN.md` + anotar cualquier gotcha nuevo en `LEARNINGS.md`.

Diagnóstico "no llega a GA4" → el **diagnostic ladder del doc `06 §6`** (dataLayer → Preview → `/g/collect` → DebugView → realtime; el primer eslabón que rompe nombra la falla).

## Hard Rules (acción gobernada)

- **SIEMPRE leer `docs/reference/measurement-gtm-ga4/LEARNINGS.md` + el doc `05` (shapes) ANTES de construir un tag.** Los gotchas verificados (`measurementIdOverride` no tagReference, scope `quick_preview`, consent en verificación, branch-from-version) evitan repetir errores ya pagados.
- **NUNCA publicar a `GTM-NGHPGRLZ` sin (a) preview/Tag Assistant, (b) confirmación humana explícita en el turno.** Construir en el **workspace** es seguro (no toca el sitio); `create_version` + `publish` es la ÚNICA mutación live y requiere OK. Si lo opera un agente, es `propose → confirm → execute` (el humano confirma antes del publish).
- **NUNCA hand-writear el bloque `gaawe` de memoria a ciegas.** Usar las plantillas verificadas de `docs/reference/measurement-gtm-ga4/05-gtm-api-v2-tag-shapes.md`; la API valida al crear en el workspace (un shape malo falla en el `POST`, no en producción) — crear, hacer `GET` de vuelta, confirmar shape.
- **NUNCA taggear el contenedor equivocado.** Solo `GTM-NGHPGRLZ` (218104216) dispara en el sitio. `GTM-NS3RNNCD` es un duplicado huérfano.
- **SIEMPRE registrar en `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`** el estado de tagging del form/CTA (obligación espejada en la skill `greenhouse-growth-forms`).
- **NUNCA PII ni valores crudos** en parámetros de eventos (allowlist `src/lib/growth/forms/contracts.ts`); registrar un parámetro como custom dimension en GA4 para poder reportarlo.
- **Preferir el evento recomendado GA4** cuando existe (submit de lead → `generate_lead`, hereda key events/predictivos); custom `gh_` solo cuando no hay equivalente (regla en `docs/reference/measurement-gtm-ga4/04`).
- **Un evento genérico + parámetro de identidad** (`form_slug`), NO un tag por form. Un solo GA4 Event tag cubre todos los forms.
- **NUNCA marcar como key event un click/scroll/view/paso de funnel** (`gh_cta_clicked`, `gh_form_started`, `page_view`…). Key event SOLO para conversiones reales de negocio (`generate_lead`, `sign_up`, `purchase`). Criterio canónico: doc `04 §3b`. (GA4 limita a 30 key events/propiedad — son escasos.)
- **Meetings:** `gh_meeting_step_reached` es funnel custom y nunca key event.
  `gh_meeting_booking_confirmed` sólo existe tras un receipt server-confirmed elegible; GTM lo
  transforma a `generate_lead` con `lead_source=meeting_booking` y NO envía además el custom a GA4.
  El ledger es verdad de conversión; GA4 es mirror a reconciliar.
- **SIEMPRE que se sume un host/sitio nuevo del ecosistema** (subdominio, Astro/WP, microsite) → **instalar el tag GA4** desde su nacimiento: snippet `GTM-NGHPGRLZ` + (si no tiene otra fuente de page_view) GA4 Config gateado por hostname, **misma propiedad `486264460`** (NUNCA stream/propiedad aparte por subdominio propio). Registrar en Tracking Engine §19.5 + verificar sin doble conteo. **Un host sin tag GA4 = superficie incompleta** (mandato §19.2). Cross-repo: rama+PR. En Astro, `is:inline` va SOLO en `<script>`, NUNCA en `<noscript>`.

## Workflow gobernado (crear un tag end-to-end)

1. **Verificar** measurement ID de la propiedad (`486264460`) + que el contenedor correcto está live (`curl efeoncepro.com | grep GTM-`).
2. **Construir en el workspace** (id=2) vía `GtmApiClient`, en orden: **Variables** (`dlv – form_slug`…) → **Trigger** (`CE – gh_form_submission_accepted`) → **GA4 Event tag** (`gaawe`, referencia el `firingTriggerId`). Shapes exactos en `docs/reference/measurement-gtm-ga4/05-gtm-api-v2-tag-shapes.md`.
3. **`GET` de vuelta** cada recurso creado → confirmar shape/fingerprint. **Preview** (Tag Assistant) sobre el sitio.
4. **Confirmar con el humano** el diff antes de publicar.
5. **`create_version`** (nombre + notas) → **`publish`**. Registrar la fila en el TRACKING-PLAN.
6. **Verificar**: `scripts/ga4/realtime-events.ts 486264460` → enviar el evento en el sitio → confirmar que aparece (`generate_lead`, con `form_slug` como parámetro/custom dimension).
7. **GA4 Admin**: marcar `generate_lead` como key event + registrar `form_slug`/`form_kind`/`surface_id` como custom dimensions (`docs/reference/measurement-gtm-ga4/07-ga4-admin-api-ops.md`).

## Capa de robustez (comandos — NO despliegan)

Estrategia de deployment: **build agéntico primario + capa delgada** (ADR `GREENHOUSE_MEASUREMENT_TAGGING_DEPLOYMENT_DECISION_V1` — NO IaC declarativo; GTM no mergea). Comandos:

- **`pnpm gtm:snapshot`** — exporta el config live del container a `docs/reference/measurement-gtm-ga4/container-snapshot.json` (diff revisable en git). **Correr tras cada publish** para que git refleje el live. `pnpm gtm:snapshot --check` = detección de drift (live vs snapshot commiteado), exit 1 (CI).
- **`pnpm measurement:smoke`** — verifica EN VIVO que la medición funciona en los hosts/eventos clave (Playwright `/g/collect`: page_view en efeoncepro.com + think, generate_lead en submit). Atrapa regresiones (Site Kit, drift, consent).
- **`pnpm growth:forms-tracking-audit`** — forms published+active de la DB vs `TRACKING-PLAN.md`; lista los live sin fila (drift del registro).

Escalar a pipeline declarativo SOLO si: tags custom no-genéricos explotan / humanos click-opsean el container / N containers de clientes (ADR §"Cuándo revisitar").

## References

Todo el conocimiento vive en la carpeta canónica `docs/reference/measurement-gtm-ga4/` (una sola copia — la leen Claude, Codex, humanos y Nexa). Esta skill NO duplica; apunta:

| Doc | Qué trae |
|---|---|
| **`LEARNINGS.md`** | **Leer ANTES de construir.** Build-log de aprendizajes reales en runtime (gotchas verificados: `measurementIdOverride`, scope de `quick_preview`, branch-from-version, propagación CDN, verificación `/g/collect`). |
| `05-gtm-api-v2-tag-shapes.md` | **JSON copy-pasteable de la API v2**: `gaawe` (GA4 Event tag — `measurementIdOverride`/`measurementId` tagReference + `eventSettingsTable`), `googtag`, `customEvent` trigger, `v` (DLV), constant/lookup/CJS, built-in vars, workflow versions/publish, quotas/fingerprint. **La plantilla exacta para no adivinar.** |
| `06-gtm-tagging-as-code-and-ops.md` | Container-as-code, deploy seguro (workspace→preview→staging→publish→rollback), verification tiers (Playwright `/g/collect`), gobernanza/permisos, sGTM, diagnostic ladder "event not showing in GA4". |
| `07-ga4-admin-api-ops.md` | GA4 Admin API: data streams (resolver measurement ID de `486264460`), custom dimensions, key events, MP secrets, access bindings; blueprint lead-gen. |
| `04-greenhouse-gh-event-convention.md` | House style `gh_`, regla GA4-recomendado vs custom, coordenadas. |
| `01/02/03` | Conocimiento base: GA4 event model · GTM/dataLayer · taxonomía de naming. |
| `TRACKING-PLAN.md` | Registro obligatorio de forms/CTAs + su estado de tagging. |

## Sinergias (cómo compone con las demás skills)

- **`growth-marketing-cro`** (dueña del reference) → conocimiento de medición, naming, estrategia de conversión. Este operador *ejecuta* lo que esa skill *decide*.
- **`greenhouse-growth-forms`** → fuente de los eventos `gh_form_*` + el TRACKING-PLAN. Un form nuevo llega acá para taggearse.
- **`greenhouse-growth-meetings`** → fuente de `gh_meeting_*`, receipt gate y allowlist sin PII.
  Este operador construye/publica el tagging, pero no decide que una reserva fue confirmada.
- **`efeonce-public-site-wordpress`** → dónde vive el snippet GTM; instalar/verificar el contenedor en el sitio, resolver container-drift.
- **`greenhouse-gvc-playwright`** → verificación en browser real (dataLayer, `/collect`, Tag Assistant) desktop+mobile.
- **`digital-marketing`** → medición de campañas, taxonomía UTM que alimenta los eventos.
- **`greenhouse-secret-hygiene`** → Measurement Protocol API secrets, rotación.
- **`greenhouse-documentation-governor`** → cierre documental (actualizar TRACKING-PLAN + Tracking Engine §19).
- **Full API Parity / Nexa** → los clientes `src/lib/growth/{gtm,ga4}` son el contrato programático; el write path a producción es acción gobernada (`propose → confirm → publish`), el LLM nunca publica directo.
