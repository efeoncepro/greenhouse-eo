---
name: greenhouse-gtm-ga4-operator
description: Operate Google Tag Manager Web/Server + GA4 + Meta Conversions API for Efeonce — create/edit tags, triggers and variables via the GTM API v2 (governed workspace → preview → confirm → publish), register GA4 custom dimensions and key events, and verify events land. Use when tagging Growth Forms, Growth CTAs, the native meeting scheduler or landings; wiring governed dataLayer events to GA4; building or auditing GTM container config; confirming a measurement ID/property; or diagnosing "event not showing in GA4". Operates the `src/lib/growth/{gtm,ga4}` clients and the measurement tracking plan; event semantics remain owned by their source domains.
---

# Greenhouse GTM Web/Server + GA4 + Meta CAPI Operator

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

## Meta CAPI / sGTM — cargar antes de proponer o ejecutar

Canon: `docs/reference/measurement-gtm-ga4/08-meta-conversions-api-server-side.md` +
ADR `GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md`. Para Efeonce, CAPI se opera por
**GTM Server**, separado de Pixel/web; no proponer Pixel web como solución completa.
Meta admite backend directo y Gateway, pero no son la ruta elegida. Inventariar primero:
API 2026-10-13 confirmó `Efeonce Server` `GTM-K2X4ZTTK`, cuenta `6068297031`, container
`191286361`, live 3, Client GA4 y tag CAPI para `708931297255942`; entrega actual pendiente.
Releer `usageContext`, endpoints, Clients, template/SHA/permisos, versiones y fuentes.

1. Recuperar el server existente antes de crear otro. Metadata/URL/token no prueban funcionamiento.
   Hosting: leer billing mode, mínimos de servicio/revisión, máximos, CPU/RAM y costo antes de
   provisionar. El contenedor Server requiere ejecución; la referencia USD/mes de instancia
   always-on no es una tarifa fija ni una factura. min=0 no garantiza gratis y free tier se
   comparte por billing. Ante cuota de vinculación, evaluar el proyecto canónico existente
   antes de solicitar cuota o crear otro proyecto, con capacidad/costo explícitos.
2. PageView requiere navegación consentida. Para recuperar Lead, reusar
   `gh_form_submission_accepted → generate_lead → GA4 Client sGTM → Meta Lead`: accepted
   se emite tras aceptación backend. No exigir otro emisor backend ni usar `gh_form_submitted`.
   No enviar postulaciones, clics ni errores; un sender outbox futuro es otro carril con dedupe.
   Reuniones: `gh_meeting_booking_confirmed → generate_lead` (`lead_source=meeting_booking`)
   → CAPI Lead con filtro propio por scheduler/surface. Cargar `greenhouse-growth-meetings`: sólo
   confirmación elegible, nunca apertura/intento/replay; UUID opaco renderer o fallback sender
   Crypto memoizado por evento GTM. No exige release GH; nunca receipt/IDs internos. Futuro backend necesita identidad compartida.
3. CAPI tag y token sólo servidor. No ampliar dataLayer/GA4 con PII; usar ingress separado,
   allowlists por destino, gate Meta explícito (denegado/desconocido bloquea) y exports redactados.
4. Identidad/tiempo estables por ocurrencia/retry; Pixel complementario comparte nombre/ID.
   No crear dos senders independientes ni prometer que sGTM evita todos los bloqueadores.
5. Preview Server → salida y respuesta Meta → Test Events Server → readback live/dedupe.
   `/healthy`, tag disparado, GA4 smoke y snapshot web NO prueban CAPI.

Lead para remarketing requiere el contrato **08 §4.1–4.2** y TASK-2034: Meta usa hashes
SHA-256 sin salt y sin appendix SDK; Google normaliza por separado (Gmail dots y +E.164).
No reutilizar HMAC interno. Prohibido PII/hash en eventos GA4 ordinarios, dimensiones,
dataLayer y URLs. **UPD dedicado top-level MP es el carril permitido para Google**, con
client_id real, sin events ni otro generate_lead; publicidad y analytics consentidos.
El template Meta pin necesita `custom_properties` JSON string, no un objeto directo.
Backend captura sólo aceptación/confirmación, veto adicional Sec-GPC, snapshot cifrado,
UUID/tiempo durables y unique source. Worker comparte cadence Forms con fallo de medición
aislado; destinos independientes, lease CAS y retención48h. Al cutover retirar los triggers
Meta Lead browser12/17 antes de habilitar backend; PageView11/GA4 mirror continúan.
2026-10-13: código local probado y draftworkspace8 Preview/Test Events Server muestran
em/ph/fn/ln + clasificadores; **todavía sin deploy**. GA4 486264460 UPD/ack activos, automática
OFF y siete audiencias90d releídas, Ads link9531478329 ya activo. Secretos scoped preparados.
No asumir serving, matching efectivo ni atribución deduplicada por Processed. Google Signals
no es prerrequisito de UPD. Respetar la restricción shared workspace antes del release.

Verificado 2026-10-13: hosting del mismo `GTM-K2X4ZTTK` recuperado en `efeonce-group`,
tagging + preview min 0/max 1, 1CPU/512MiB, instance-based; `/healthy` 200 y Preview funcional.
GTM Web live **5**/Server live **5** publicados con autorización; HubSpot categoría opt-in y
routing WP/Think activos. Test Events Server procesados y PageView real completó ambos destinos.
Próximas conversiones comerciales/replay pendientes. Ver estado/URLs en la auditoría.
Cargar `09-hubspot-consent.md`: API banner `_hsp`, boolean categories, nunca legacy `allowed`
ni `_hsq`. Default inline denied antes de tags; analítica no concede Meta, GPC bloquea publicidad.
PV explícito una vez/destino: `meta_only` gatea GA4, `meta_capi_page_view` + UUID gatean Meta.
Forwarding GA4 gatea consentimiento nativo `x-ga-gcs` con `^G1[01]1$`; custom analytics_consent
no está en todos los eventos automáticos y no sirve como único gate. Unknown/denied bloquea.
SDK GA4 transporta `event_id` como **evnid**, Client normaliza a event_id: no concluir ID
ausente por buscar sólo ep.event_id. Retirar Test Events code antes del publish/readback.
SoT bridge `scripts/measurement/hubspot-consent-bridge.js`; WP/Think copias byte-idénticas.
Preferencias de cookies = control de texto integrado al pie legal; nunca franja/CTA
independiente debajo del sitio. Probar acceso móvil sin superposición del CTA de reuniones.
Gates: **no usar regex `.+` para validar event_id**: acepta missing/`undefined` como string.
Exigir UUID anclado y probar ausente + literal `undefined`; una prueba sintética alcanzó Meta
antes de corregirlo. Positivos sólo con `test_event_code` real verificado; nunca un código inventado.
Routing Think no cubre Site Kit en WordPress: inspeccionar el emisor/config inicial de cada host.
Forwarding GA4 oficial server usa `sgtmgaaw`/`measurementId`, no la shape web `gaawe`.
Sanear URL por destino: Regex Table server `remm` + transformación `tf_augment_event` sólo
Meta; excluir referrer/controles con `tf_exclude_params`. UI rechaza literal vacío en aumento;
excluir el campo. Validar variables y luego payload positivo Test Events; no igualar ambos.
6. Workspaces aislados por contenedor; presentar diff/QA/rollback antes de publicar.
   Documentación no autoriza provisionar cloud/DNS/IAM, rotar secretos ni enviar canaries.

## Canonical coordinates (Efeonce)

| Recurso | Valor |
|---|---|
| GTM contenedor **web** live | `GTM-NGHPGRLZ` · account `6291647045` · container `218104216` · workspace **Default (id=2)** |
| GTM Google tag (config) actual | type `googtag`, `tagId=G-KYPPY57M14` (firing All Pages) |
| GA4 propiedad | `efeoncepro.com` · propertyId `486264460` · account GA4 `252968286` |
| Hosts medidos (misma propiedad) | `efeoncepro.com` (page_view vía Site Kit) + `think.efeoncepro.com` (page_view vía GA4 Config gateado por hostname en el container; snippet GTM en `efeonce-think` repo). Subdominio = mismo stream, funnel unificado. |
| Google tag del sitio (Site Kit) | `GT-KV5CNNKQ` (separado del GTM) |
| Service account | `greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com` |
| Clientes de código | `src/lib/growth/gtm/api-client.ts` (`GtmApiClient`) · `src/lib/growth/ga4/api-client.ts` |
| Verificar en vivo | `scripts/ga4/realtime-events.ts 486264460` · `scripts/gtm/verify-connection.ts` |

> **⚠️ Verificar SIEMPRE el Measurement ID destino.** El sitio tiene DOS ids GA4-ish (`G-KYPPY57M14` en el GTM, `GT-KV5CNNKQ` de Site Kit). Antes de crear un GA4 Event tag, confirmar **qué measurement ID pertenece a la propiedad `486264460`** por la Admin API (`properties/486264460/dataStreams`) — si mandas al id equivocado, el evento no aparece en la propiedad que medimos. Ver `docs/reference/measurement-gtm-ga4/07-ga4-admin-api-ops.md`.

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

### Fallback DOM para CTA anidado (cuando no existe `dataLayer`)

Si Preview muestra un `Click Element` interno (`div`, `span`, icono) y `Click URL` vacío, inspeccionar el DOM antes
de cambiar el activador:

- si se quiere medir todo el enlace o toda la tarjeta, usar `Solo enlaces` + `Click URL` y evitar JavaScript;
- si se quiere medir sólo un CTA dentro del enlace, usar `Todos los elementos` + un selector CSS acotado al CTA y
  una Custom JavaScript mínima que busque `closest('a[href]')` y retorne su `href` con guards explícitos;
- la variable debe ser pura y sin efectos laterales; si `Click URL` ya contiene el destino, no crearla;
- preferir siempre un evento semántico de la aplicación en `dataLayer` cuando se controla el renderer;
- verificar al menos las variantes DOM positivas y un clic negativo ajeno al CTA.

Un tag genérico con `destination_url` cubre N productos; no crear un tag por producto. Caso verificado, selector y
función compatibles con GTM ES5: `docs/reference/measurement-gtm-ga4/LEARNINGS.md` → “CTA anidado en una tarjeta
enlazada”.

## Hard Rules (acción gobernada)

- **SIEMPRE leer `docs/reference/measurement-gtm-ga4/LEARNINGS.md` + el doc `05` (shapes) ANTES de construir un tag.** Los gotchas verificados (`measurementIdOverride` no tagReference, scope `quick_preview`, consent en verificación, branch-from-version) evitan repetir errores ya pagados.
- **NUNCA publicar a `GTM-NGHPGRLZ` sin (a) preview/Tag Assistant, (b) confirmación humana explícita en el turno.** Construir en el **workspace** es seguro (no toca el sitio); `create_version` + `publish` es la ÚNICA mutación live y requiere OK. Si lo opera un agente, es `propose → confirm → execute` (el humano confirma antes del publish).
- **NUNCA hand-writear el bloque `gaawe` de memoria a ciegas.** Usar las plantillas verificadas de `docs/reference/measurement-gtm-ga4/05-gtm-api-v2-tag-shapes.md`; la API valida al crear en el workspace (un shape malo falla en el `POST`, no en producción) — crear, hacer `GET` de vuelta, confirmar shape.
- **NUNCA taggear el contenedor equivocado.** Para la web, `GTM-NGHPGRLZ` (218104216); `GTM-NS3RNNCD` es un duplicado huérfano. Para CAPI, elegir el contenedor `usageContext=server` del inventario; no aplicar coordenadas web al carril servidor. Publicar server también requiere preview y aprobación explícita; provisioning cloud/secrets son mutaciones separadas.
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
| `08-meta-conversions-api-server-side.md` | Meta CAPI vía GTM Server: inventario, contrato, consentimiento, ingress, secretos, dedupe y readback Meta. |
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
