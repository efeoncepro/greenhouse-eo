# Greenhouse `gh_` Event Convention — house style (actionable)

> **Este es el doc que se aplica al construir.** Los otros tres (`01` GA4, `02` GTM, `03` taxonomía) son el fundamento; éste es la decisión Greenhouse: cómo nombramos, dónde vive el contrato, con qué contenedor/propiedad reales, y cómo verificamos que un evento llega.
> **Mandato:** toda superficie de adquisición (Growth Forms, CTAs, landings, botones, lead magnets) **nace instrumentada** — evento `dataLayer` gobernado + tag en GTM. Contrato en `docs/architecture/GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md §19`.

---

## 1. Coordenadas reales (usar SIEMPRE estas)

| Recurso | Valor | Nota |
|---|---|---|
| **Contenedor GTM live** | `GTM-NGHPGRLZ` · containerId `218104216` · cuenta **Efeonce Global** `6291647045` | El instalado en `efeoncepro.com` (verificado en el HTML). Todo tag productivo se construye AQUÍ. |
| **GA4 propiedad** | `efeoncepro.com` · propertyId `486264460` · cuenta GA4 `252968286` | Destino de reporting. |
| **Google tag / Measurement** | `GT-KV5CNNKQ` | El gtag del sitio que rutea a GA4. |
| Contenedor duplicado (NO usar) | `GTM-NS3RNNCD` (cuenta `6068297031`) | Se llama "efeoncepro.com" pero NO está instalado en el sitio → tags ahí no disparan. Cleanup pendiente. |
| SA de gestión | `greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com` | Opera GTM + lee GA4 (Viewer). |
| Cliente de código | `src/lib/growth/gtm/` (`GtmApiClient`) · `src/lib/growth/ga4/` (`Ga4AdminClient`, `Ga4DataClient`) | — |
| Verificar eventos en vivo | `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/ga4/realtime-events.ts 486264460` | Conteo realtime por `eventName`. |

> El nombre de un contenedor GTM es una etiqueta, NO prueba de instalación. Verificar siempre con `curl -s https://efeoncepro.com/ | grep -oE 'GTM-[A-Z0-9]+'`.

---

## 2. La gramática `gh_`

**`gh_<object>_<action>`** — `snake_case`, past tense, prefijo `gh_`, ≤40 chars, empieza con letra, sin espacios/guiones. Nunca prefijos reservados de GA4 (`ga_`, `google_`, `firebase_`, `gtm.`).

Ejemplos vivos (SoT `src/lib/growth/forms/contracts.ts → GTM_EVENT_NAMES`, espejo en `src/growth-forms-renderer/telemetry.ts`):

```
gh_form_viewed
gh_form_started
gh_form_field_validation_failed
gh_form_submitted
gh_form_submission_accepted
gh_form_submission_rejected
gh_form_destination_delivered
gh_form_asset_accessed
gh_form_success_viewed
gh_form_success_action_clicked
```

**Extensión a superficies nuevas** (misma gramática, ver `03 §7.2`):

| Superficie | Eventos `gh_` | Params propios (sumados al allowlist base) |
|---|---|---|
| **CTA / botón** | `gh_cta_viewed`, `gh_cta_clicked` | `cta_id`, `cta_kind`, `cta_location`, `cta_variant`, `destination_id` |
| Página | `gh_page_viewed` | `page_uri`, `page_type` |
| Scroll | `gh_scroll_depth_reached` | `percent` (enum 25/50/75/90/100) |
| Descarga | `gh_file_downloaded` | `file_id`, `file_kind` |
| Búsqueda | `gh_search_submitted`, `gh_search_results_viewed` | `results_count`, `filters_applied` |
| Lead | `gh_lead_captured`, `gh_demo_requested` | `lead_source`, `plan`, `correlation_id` |

Reglas de extensión:
- `*_location` es la válvula anti-explosión de posición (`hero`/`nav`/`footer`/`pricing`) → **un** `gh_cta_clicked`, nunca `gh_hero_cta_clicked`.
- `*_kind` (bajo `form_kind`) para variantes low-cardinality → nunca un evento nuevo por variante.
- `surface_id`, `page_uri`, `correlation_id`, `utm_*` viven en el **allowlist base** compartido por todos los eventos; sólo los keys realmente propios se suman por familia.
- Duplicar el split intent/outcome (`_accepted`/`_rejected`) **solo si hay outcome de servidor real** (no en clicks de pura navegación).

---

## 3. ⚠️ Regla de decisión: nombre recomendado de GA4 vs prefijo `gh_`

GA4 publica un **vocabulario de eventos recomendados** (`generate_lead`, `sign_up`, `login`, `purchase`, `select_content`, `search`, `share`…). Usar el nombre recomendado **verbatim, sin prefijo** desbloquea reporting predefinido, métricas/audiencias predictivas y key events limpios. Un evento custom (`gh_*`) NO obtiene esas features automáticas.

**Regla:**

1. **Si existe un evento recomendado GA4 que calza el momento** (submit de lead → `generate_lead`; alta de cuenta → `sign_up`; selección de contenido → `select_content`) → **emitir el nombre recomendado GA4 verbatim** y marcarlo key event. NO lo prefijes.
2. **Si NO existe equivalente GA4** (comportamiento propio del producto: `gh_form_viewed`, `gh_form_submission_rejected`, `gh_cta_viewed`) → **evento custom `gh_<object>_<action>`**.
3. **Patrón dual (recomendado para el momento de conversión):** mantener el `gh_*` granular para gobernanza/funnel interno **y** disparar/derivar el recomendado GA4 para reporting. En GA4 se puede hacer con un GA4 Event tag adicional en GTM, o con "Create event" derivando `generate_lead` desde `gh_form_submission_accepted`. Pro: conservas granularidad interna + heredas features GA4. Contra: dos eventos que mantener alineados.

### Tabla de mapeo Greenhouse (canónica)

| Evento interno `gh_*` | Momento | GA4 recomendado | Key event | Trato |
|---|---|---|---|---|
| `gh_form_viewed` | impresión del form | — (no hay) | no | custom |
| `gh_form_started` | primera interacción | (GA4 auto `form_start` existe, reservado) | no | custom `gh_` (no colisiona; el reservado es de enhanced measurement) |
| `gh_form_submitted` | click submit (intent) | (GA4 auto `form_submit` existe, reservado) | no | custom `gh_` |
| **`gh_form_submission_accepted`** | **lead válido (outcome)** | **`generate_lead`** | **sí** | **dual → dispara también `generate_lead`** |
| `gh_form_submission_rejected` | rechazo servidor | — | no | custom |
| `gh_form_asset_accessed` | descarga lead magnet | `select_content` (opcional) | opcional | custom, dual si aplica |
| `gh_cta_clicked` | click CTA | `select_content` (opcional) | opcional | custom; dual solo si el CTA representa selección de contenido |
| (alta de cuenta portal) | signup | **`sign_up`** | sí | usar recomendado directo |

> Nota: los nombres GA4 **reservados** (`form_start`, `form_submit`, `page_view`, `scroll`…) NO se pueden usar como custom events, pero nuestros `gh_form_started`/`gh_form_submitted` son nombres distintos (con prefijo) → conviven sin colisión. Lo que hereda features GA4 es el recomendado (`generate_lead`), por eso el patrón dual en el momento de conversión.

---

## 4. Payload: allowlist + cero PII

Regla dura (ya enforced en `src/growth-forms-renderer/telemetry.ts` → `RENDERER_ALLOWED_PAYLOAD_KEYS` / `src/lib/growth/forms/contracts.ts` → `TELEMETRY_ALLOWED_PAYLOAD_KEYS`): **solo claves del allowlist cruzan al browser; jamás PII, valores crudos, internals de HubSpot, URLs privadas ni tokens.** Cualquier clave fuera del allowlist se descarta en la frontera.

Allowlist base vigente (extender aquí al sumar familias): `form_id, form_key, form_slug, form_version_id, form_kind, surface_id, surface_kind, renderer_version, contract_version, page_uri, page_name, referrer, locale, utm_source, utm_medium, utm_campaign, correlation_id, reason_class, success_behavior, destination_kind, action_kind, reward_kind, run_handle, status_url`.

Para GA4: recordar que un parámetro custom **no reporta** hasta registrarlo como **custom dimension** en la propiedad (`01 §6`). Registrar los keys que quieras ver en reportes (`cta_location`, `form_kind`, etc.).

---

## 5. Naming en GTM (aplicar `02 §6` a nosotros)

Al crear entidades en `GTM-NGHPGRLZ`:

| Entidad | Patrón | Ejemplo Greenhouse |
|---|---|---|
| Tag GA4 Event | `GA4 Event – <evento> – <contexto>` | `GA4 Event – generate_lead – growth form` |
| Tag Google (config) | `GA4 Config – GT-KV5CNNKQ` | — |
| Trigger Custom Event | `CE – <evento> – <contexto>` | `CE – gh_form_submission_accepted` |
| Variable Data Layer | `dlv – <key>` | `dlv – cta_location`, `dlv – form_kind` |
| Variable constante | `const – <qué>` | `const – GA4 Measurement ID` |

Versiones: siempre **nombre + descripción** (bulleted). Workspaces: `<feature> – <persona>` en equipo.

---

## 6. Loop de verificación (¿el evento llega?)

1. Construir el tag `gh_*`/recomendado en `GTM-NGHPGRLZ` (por API con `GtmApiClient` o en la UI).
2. **Preview** (Tag Assistant) → **Publish** versión (con notas).
3. Disparar el evento en el sitio.
4. `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/ga4/realtime-events.ts 486264460` → si aparece el `eventName`, llega. Si no, revisar trigger/DLV/tag.
5. Marcar key events + registrar custom dimensions en GA4 según §3/§4.

---

## 7. Gobernanza (cerrar el único gap — `03 §7.3`)

- **Registro OBLIGATORIO de forms/CTAs:** [`TRACKING-PLAN.md`](TRACKING-PLAN.md) — leer antes de crear un form/CTA; registrar su fila (taggeado o no) al crearlo. SoT de la capa de medición (qué evento emite, mapeo GA4, key event, estado de tagging) que la DB no tiene. Enforcement: hard rule en la skill `greenhouse-growth-forms` + puntero en `src/lib/growth/forms/store.ts`.
- **SoT del vocabulario:** `GTM_EVENT_NAMES` + `TELEMETRY_ALLOWED_PAYLOAD_KEYS` en `src/lib/growth/forms/contracts.ts`. Un evento/param nuevo se agrega AHÍ primero (registry Tier 1 en código), con su espejo en el renderer.
- **Regla de revisión:** nombre nuevo pasa por la gramática `gh_<object>_<action>` + verbo del vocabulario controlado + regla §3 (¿existe recomendado GA4?). Si difiere solo por un valor de otro evento → es parámetro, no evento.
- **Deprecar, no renombrar** un evento vivo (romper una serie temporal). Correr ambos, migrar dashboards, luego deprecar.
- **Drift:** diff periódico de `eventName LIKE 'gh_%'` (realtime/BQ export) vs el SoT.

---

## Ver también

- `01-ga4-event-model.md` — modelo GA4, recomendados, límites, custom dimensions, Measurement Protocol.
- `02-gtm-and-datalayer.md` — GTM, dataLayer, tags/triggers/variables, consent mode, naming GTM.
- `03-event-naming-taxonomy.md` — marco object–action, gobernanza, evaluación de `gh_`.
- `docs/architecture/GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md §19` — mandato + conexión + coordenadas.
- Memoria (Claude): `reference_gtm_ga4_service_account_connection`.
