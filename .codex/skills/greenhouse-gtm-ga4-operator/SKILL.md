---
name: greenhouse-gtm-ga4-operator
description: Operate Google Tag Manager + GA4 for Efeonce — create/edit tags, triggers, variables via the GTM API v2 (governed workspace → preview → confirm → publish), register GA4 custom dimensions & key events, and verify events land. Use when tagging Growth Forms/CTAs/landings, wiring gh_* dataLayer events to GA4, building or auditing GTM container config, confirming a measurement ID/property, or diagnosing "event not showing in GA4". Operates the src/lib/growth/{gtm,ga4} clients and the docs/reference/measurement-gtm-ga4 tracking plan. Delegates naming/strategy to growth-marketing-cro, the event source to greenhouse-growth-forms, snippet install to efeonce-public-site-wordpress, browser verify to greenhouse-gvc-playwright.
---

# Greenhouse GTM + GA4 Operator

Use this skill to **operate measurement instrumentation** for Efeonce: build and publish GTM tags/triggers/variables via the API v2, register GA4 custom dimensions and key events, and verify that events actually land in GA4. It is an **executing operator**, not a knowledge dump — the conceptual reference (event model, naming, taxonomy, house style) lives in **`docs/reference/measurement-gtm-ga4/`** (owner skill: `growth-marketing-cro`). Load that for the "what/why"; this skill is the "how to build/publish/verify".

> **Efeonce tagging is immature.** Assume nothing is tagged until verified. Build in the workspace, verify, and only publish with human confirmation.

## When to invoke

- Tagging a Growth Form / CTA / landing so its submit/click event reaches GA4.
- Wiring `gh_*` dataLayer events (`gh_form_submission_accepted`, future `gh_cta_clicked`) → GA4 Event tags.
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
| Google tag del sitio (Site Kit) | `GT-KV5CNNKQ` (separado del GTM) |
| Service account | `greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com` |
| Clientes de código | `src/lib/growth/gtm/api-client.ts` (`GtmApiClient`) · `src/lib/growth/ga4/api-client.ts` |
| Verificar en vivo | `scripts/ga4/realtime-events.ts 486264460` · `scripts/gtm/verify-connection.ts` |

> **⚠️ Verificar SIEMPRE el Measurement ID destino.** El sitio tiene DOS ids GA4-ish (`G-KYPPY57M14` en el GTM, `GT-KV5CNNKQ` de Site Kit). Antes de crear un GA4 Event tag, confirmar **qué measurement ID pertenece a la propiedad `486264460`** por la Admin API (`properties/486264460/dataStreams`) — si mandás al id equivocado, el evento no aparece en la propiedad que medimos. Ver `docs/reference/measurement-gtm-ga4/07-ga4-admin-api-ops.md`.

## Metodología — cómo decidir el camino (árbol de decisión)

Ante una tarea de medición, seguir este árbol; NO improvisar el camino:

1. **¿Qué se quiere medir?** submit de form · click de CTA · vista · conversión.
2. **¿El evento ya se emite al dataLayer?** Forms SÍ (`gh_form_*`, default true). CTAs → falta la familia `gh_cta_*` (definir primero en la SoT `src/lib/growth/forms/contracts.ts`). Verificar con `curl gtm.js | grep` o el renderer telemetry.
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

## Workflow gobernado (crear un tag end-to-end)

1. **Verificar** measurement ID de la propiedad (`486264460`) + que el contenedor correcto está live (`curl efeoncepro.com | grep GTM-`).
2. **Construir en el workspace** (id=2) vía `GtmApiClient`, en orden: **Variables** (`dlv – form_slug`…) → **Trigger** (`CE – gh_form_submission_accepted`) → **GA4 Event tag** (`gaawe`, referencia el `firingTriggerId`). Shapes exactos en `docs/reference/measurement-gtm-ga4/05-gtm-api-v2-tag-shapes.md`.
3. **`GET` de vuelta** cada recurso creado → confirmar shape/fingerprint. **Preview** (Tag Assistant) sobre el sitio.
4. **Confirmar con el humano** el diff antes de publicar.
5. **`create_version`** (nombre + notas) → **`publish`**. Registrar la fila en el TRACKING-PLAN.
6. **Verificar**: `scripts/ga4/realtime-events.ts 486264460` → enviar el evento en el sitio → confirmar que aparece (`generate_lead`, con `form_slug` como parámetro/custom dimension).
7. **GA4 Admin**: marcar `generate_lead` como key event + registrar `form_slug`/`form_kind`/`surface_id` como custom dimensions (`docs/reference/measurement-gtm-ga4/07-ga4-admin-api-ops.md`).

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
- **`efeonce-public-site-wordpress`** → dónde vive el snippet GTM; instalar/verificar el contenedor en el sitio, resolver container-drift.
- **`greenhouse-gvc-playwright`** → verificación en browser real (dataLayer, `/collect`, Tag Assistant) desktop+mobile.
- **`digital-marketing`** → medición de campañas, taxonomía UTM que alimenta los eventos.
- **`greenhouse-secret-hygiene`** → Measurement Protocol API secrets, rotación.
- **`greenhouse-documentation-governor`** → cierre documental (actualizar TRACKING-PLAN + Tracking Engine §19).
- **Full API Parity / Nexa** → los clientes `src/lib/growth/{gtm,ga4}` son el contrato programático; el write path a producción es acción gobernada (`propose → confirm → publish`), el LLM nunca publica directo.
