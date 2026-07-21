# Tracking Plan — Registro de Forms & CTAs (SoT de la capa de medición)

> **Registro vivo y OBLIGATORIO.** Todo form o CTA público de Efeonce se registra aquí con su estado de tagging.
> - **SoT de definiciones de form:** la base de datos (`greenhouse_growth.form_definition`) — no este archivo.
> - **SoT de la capa de MEDICIÓN/tagging** (qué evento emite, a qué evento GA4 mapea, si es key event, si está taggeado): **este archivo.** Esa capa NO vive en la DB.
> Convención y mecánica: `04-greenhouse-gh-event-convention.md`. Coordenadas: GTM `GTM-NGHPGRLZ` · GA4 `486264460`.

---

## ⚠️ Regla de enforcement (agentes y humanos)

**Al crear, publicar, o cambiar el tagging de un form/CTA, es OBLIGATORIO:**

1. **Leer** este archivo antes de crear el form/CTA (ver si ya existe uno equivalente; reusar antes de crear).
2. **Registrar/actualizar su fila** en la tabla de abajo con: slug, kind, página/surface, si emite al `dataLayer`, a qué evento GA4 mapea, si es key event, y **el estado de tagging (`✅ taggeado` / `⏳ pendiente` / `n/a`)**.
3. Un form/CTA **no está "listo" si su fila dice `⏳ pendiente`** de tagging y la capability es medible. Dejarlo registrado como pendiente explícito, no omitirlo.

> Esta regla está espejada como hard rule en la skill `greenhouse-growth-forms` (Claude + Codex) y apuntada desde el código de creación (`src/lib/growth/forms/store.ts`). Backstop mecánico advisory **(propuesto, aún no construido):** un `pnpm growth:forms-tracking-audit` que consulte la DB (query de §Refrescar) y liste los forms `published` sin fila aquí — análogo de `pnpm flags:audit`.

---

## Forms

Leyenda tagging: `✅` taggeado y verificado en GA4 · `⏳` pendiente · `n/a` no medible.
`dataLayer` = el renderer empuja el evento a `window.dataLayer` (default `true`; se apaga por `analytics_policy_json.gtmDataLayer=false`).

| Slug | Kind | Nombre | Página / surface | Emite dataLayer | Evento GTM → GA4 | Key event | Tagging | Notas |
|---|---|---|---|---|---|---|---|---|
| `efeonce-aeo-diagnostic` | diagnostic_intake | Diagnóstico AEO | `/aeo-2/` (servicio AEO) | ✅ default | `gh_form_submission_accepted` → `generate_lead` | sí (previsto) | ✅ genérico | Form comercial AEO → HubSpot. |
| `efeonce-careers-application` | application | Careers Application | `/public/careers/[publicId]/apply` (surface `public-careers-nextjs`) | ✅ default | `gh_form_submission_accepted` → `generate_lead` | sí (previsto) | ✅ genérico | TASK-1373. Form de postulación Careers por Growth Forms; submit técnico probado con ATS projection + CV privado, sin destinos externos. |
| `ai-visibility-grader` | diagnostic_intake | AI Visibility Grader | grader (lead magnet self-serve) | ✅ default | `gh_form_submission_accepted` → `generate_lead` | sí (previsto) | ✅ genérico | Lead magnet del grader. |
| `efeonce-seo-diagnostic` | diagnostic_intake | Diagnóstico SEO | landing SEO (agencia SEO) | ✅ default | `gh_form_submission_accepted` → `generate_lead` | sí (previsto) | ✅ genérico | Form comercial SEO. |
| `efeonce-desarrollo-web-cotizacion` | quote_request | Cotización desarrollo web | landing desarrollo web | ✅ default | `gh_form_submission_accepted` → `generate_lead` | sí (previsto) | ✅ genérico | 2 versiones publicadas. |
| `efeonce-lead-gen-web` | lead_magnet | Lead Gen — Web (diseño de sitios) | landing diseño web | ✅ default | `gh_form_submission_accepted` → `generate_lead` | sí (previsto) | ✅ genérico | — |
| `efeonce-social-audit` | diagnostic_intake | Diagnóstico Redes Sociales | landing redes sociales | ✅ default | `gh_form_submission_accepted` → `generate_lead` | sí (previsto) | ✅ genérico | Detectado por `pnpm growth:forms-tracking-audit` 2026-07-07. |
| `efeonce-surround-discovery-ebook` | lead_magnet | Ebook "Surround Discovery™" | `/seo-surround-discovery` (Think, surface `fhsf-surround-discovery-ebook`) | ✅ default | `gh_form_submission_accepted` → `generate_lead` | sí | ⏳ pendiente | TASK-1386. Usa el pipeline GTM genérico ya publicado; marcar ✅ tras el browser smoke real de submit, descarga gated y `/g/collect` desde Think. |
| `efeonce-web-agentica-ebook` | lead_magnet | Ebook "El fin de la web" | `/web-agentica` (Think, surface `fhsf-web-agentica-ebook`) | ✅ default | `gh_form_submission_accepted` → `generate_lead` | sí (previsto) | ✅ tagged | TASK-1375. Lead magnet ebook (descarga gated tokenizada). Emite además `download_url` en el accepted (browser-safe); el pipeline genérico GTM v2 distingue la surface por `form_slug` y `surface_id`. |

> **Página/surface** arriba es inferida por slug/nombre — confirmar el `surface_id` real del embed al taggear (viaja en el evento).
> **Estado global (2026-07-07): LIVE.** Pipeline **genérico** publicado en `GTM-NGHPGRLZ` v2: trigger `CE - gh_form_submission_accepted` + tag `GA4 Event - generate_lead` (`measurementIdOverride=G-KYPPY57M14`) con params `form_slug`/`form_kind`/`surface_id`. Cubre TODOS los forms; se distinguen por `form_slug`. GA4: custom dimensions `form_slug`/`form_kind`/`surface_id` + key event `generate_lead` registrados. Verificado con Playwright (`/g/collect?...en=generate_lead`). Un form nuevo queda medido al publicarse, sin tocar GTM. Detalle + gotchas: [`LEARNINGS.md`](LEARNINGS.md).

### Smoke-tests / drafts (NO son producción — candidatos a archivar)

`live-hs-1782380033`, `live-hs-1782379959`, `sm-hsbad-1782379602`, `sm-hsoff-1782379602`, `smoke-b-1782377074`, `smoke-test-1782376321`, `sm-hsbad/off-1782379551`, `smoke-hs-bad/off-*`, `builder-smoke-1256-*` → **ARCHIVADOS 2026-07-07** (`status='archived'`, 11 forms). Los `gate-demo-1254*` quedan como demos (no archivados). **No taggear.**

---

## CTAs

> **Dos rails, deslinde explícito (TASK-1340):** (a) el **motor Growth CTA** (`<greenhouse-cta>`, TASK-1339/1340) emite la familia canónica **`greenhouse_cta_*`** del arch spec `GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1` §13 — namespace deliberado, distinto del interno `growth.cta.*`; SoT en código: `CTA_GTM_EVENT_NAMES` + `CTA_TELEMETRY_ALLOWED_PAYLOAD_KEYS` (`src/lib/growth/ctas/contracts.ts`, espejo en el renderer con parity test). (b) el rail **legacy ad-hoc `gh_cta_clicked`** de los widgets WordPress pre-motor (redes-sociales) sigue vivo tal cual (deprecar-no-renombrar, doc 04 §7); NO se armonizan. Misma disciplina en ambos: evento genérico + identidad por parámetro (`cta_id`/`cta_slug`/`cta_location`), nunca un evento por superficie/posición; ningún click de CTA es key event (doc 04 §3b).
>
> **Delta 2026-07-18 (TASK-1431, code complete — rollout pendiente):** el param existente **`action_kind`** ahora puede portar 4 valores (`open_growth_form` | `link_url` | `open_think_tool` | `book_meeting`). CERO eventos/params nuevos: un CTA de navegación emite `greenhouse_cta_viewed`/`clicked`/`dismissed`/`error` (no hay `form_opened`/`form_submitted` para navigate; el `clicked` sale ANTES de navegar con ingest `keepalive`). El destino (URL) JAMÁS viaja en telemetría — solo `action_kind` allowlisted. `book_meeting` es navegación-only: ningún click crea Meeting/Contact/Deal, así que no existe evento de conversión browser para ese kind.

> **Corte de semántica `greenhouse_cta_viewed` (TASK-1429, 2026-07-18):** `viewed` pasa de dispararse **al montar** el card (baseline TASK-1427: mount = viewed) a dispararse **cuando el card ES visible** — IntersectionObserver ≥50% + dwell 300ms, una sola vez (`notifyViewed`). Aplica a embedded Y slide_in en el bundle ≥ `1.1.0`. Efecto esperado en series: `greenhouse_cta_viewed` BAJA para placements below-the-fold (medición más honesta, no regresión del motor). Además `viewed` ahora también entra al ingest server como **Tier B** (rollup agregado `cta_exposure_rollup`, TASK-1428) — jamás al ledger de conversión. Sin cambios de nombres de eventos ni params (SoT intacto; los tags GTM v4 publicados siguen válidos).

| CTA id | Kind | Ubicación (page + location) | Emite dataLayer | Evento GTM → GA4 | Key event | Tagging | Notas |
|---|---|---|---|---|---|---|---|
| `ai-visibility-report-followup` | growth_cta_engine | Motor CTA (`<greenhouse-cta>`): Think `/brand-visibility/r/*` (`cta-location=report_followup`) LIVE + WP página de prueba `/greenhouse-cta-prueba/` (`cta-location=wp_test_page`, noindex) LIVE — placement amplio WP pendiente de decisión post-validación | ✅ verificado live 2026-07-18 en AMBOS hosts (dataLayer + `/g/collect` con los 3 eventos + ingest 202 + ledger `browser_reported/accepted` + forja 403; TASK-1427) | `greenhouse_cta_*` → ✅ tags GA4 publicados (GTM v4, 2026-07-18; 6 tags + 6 triggers CE + 7 DLVs; custom dimensions `cta_slug`/`cta_location`/`placement` creadas en GA4) | no | ✅ | Primer CTA del motor (TASK-1339/1340). **Rollout 2026-07-18**: flag `GROWTH_CTA_ENGINE_ENABLED` ON en staging+Production; GTM v4 publicado vía `scripts/gtm/build-cta-events-workspace.ts` (workspace→quick_preview→publish gobernado bajo orden del operador). El `form_submitted` NO se taggea como conversión: la conversión sigue siendo `gh_form_submission_accepted` → `generate_lead` del form (autoridad Growth Forms; no doble conteo). Publish al container SOLO workspace→preview→confirmación humana. |
| `social_meeting_hero_primary` | meeting_booking | `/servicios/redes-sociales/` · `hero_primary` | ✅ `dataLayer` | `gh_cta_clicked` → pendiente de tag GA4 | no | ⏳ pendiente | Abre el panel inline de HubSpot Meetings; fallback href directo si JS no carga. |
| `social_meeting_final_primary` | meeting_booking | `/servicios/redes-sociales/` · `final_primary` | ✅ `dataLayer` | `gh_cta_clicked` → pendiente de tag GA4 | no | ⏳ pendiente | CTA principal de la sección final. |
| `social_meeting_sticky_primary` | meeting_booking | `/servicios/redes-sociales/` · `sticky_primary` | ✅ `dataLayer` | `gh_cta_clicked` → pendiente de tag GA4 | no | ⏳ pendiente | Sticky CTA desktop; mobile se oculta por contrato de la landing. |
| `social_meeting_audit_fallback` | meeting_booking | `/servicios/redes-sociales/` · `audit_fallback` | ✅ `dataLayer` | `gh_cta_clicked` → pendiente de tag GA4 | no | ⏳ pendiente | Fallback visible si el Growth Form no renderiza. |
| `social_meeting_tab` | meeting_booking | `/servicios/redes-sociales/` · `final_cta` | ✅ `dataLayer` | `gh_cta_clicked` → pendiente de tag GA4 | no | ⏳ pendiente | Tab que cambia de Auditoría a Reunión. |
| `social_meeting_direct_fallback` | meeting_booking | `/servicios/redes-sociales/` · `meeting_embed` | ✅ `dataLayer` | `gh_cta_clicked` → pendiente de tag GA4 | no | ⏳ pendiente | Link directo a HubSpot si el iframe no aparece o el usuario prefiere nueva pestaña. |
| `web_agentica_pillar` | editorial_resource | `/desarrollo-sitios-web/` · `two_visitors` | enlace editorial implementado; sin dataLayer | medición pendiente de contrato runtime; no emitir `gh_cta_clicked` ad hoc | no | ⏳ pendiente | Enlace recíproco live hacia la pillar pública `El fin de la web “solo para humanos”: cómo preparar tu sitio para los agentes de IA`. El artículo devuelve tres enlaces a la landing. La bidireccionalidad editorial está verificada; la instrumentación sigue separada y pendiente de gobernanza. |

## Meeting embeds

| Surface id | Kind | Página / ubicación | Emite dataLayer | Evento GTM → GA4 | Key event | Tagging | Notas |
|---|---|---|---|---|---|---|---|
| `social_meeting_embed` | hubspot_meetings_embed | `/servicios/redes-sociales/` · sección final CTA | ✅ `dataLayer` | `gh_meeting_embed_viewed`, `gh_meeting_embed_loaded`, `gh_meeting_embed_failed` → pendiente de tags GA4 | no | ⏳ pendiente | El iframe se lazy-load al abrir Reunión. Los UTMs de campaña viajan por la query de la página; `dataLayer` conserva CTA/surface sin PII. |

### Native meeting scheduler (TASK-1509 / TASK-1510)

| Surface id | Kind | Página / ubicación | Emite dataLayer | Evento GTM → GA4 | Key event | Tagging | Notas |
|---|---|---|---|---|---|---|---|
| `fhsf-efeonce-lead-gen-web` + binding `discovery` | native_meeting_scheduler | Efeonce público, placement por host | ✅ cuando renderer pilot esté activo | `gh_meeting_step_reached` → custom homónimo; `gh_meeting_booking_confirmed` → `generate_lead` con `lead_source=meeting_booking` | sólo `generate_lead` existente | ⏳ workspace 6 previewado; publish/pilot pendientes | El custom `gh_meeting_booking_confirmed` NO se reenvía a GA4. Auditoría 2026-07-21: identidad semántica independiente del copy, cero PII/slot exacto y conversión sólo con receipt server-confirmed. Ledger `server_confirmed` es SoT; GA es mirror browser-reported y se reconcilia. Fallback iframe/link permanece. |

Allowlist funnel: `meeting_step`, `scheduler_key`, `surface_id`, `placement`, `availability_state`, `days_ahead_bucket`, `time_of_day_bucket`, `error_category`. Se prohíben PII, valores de campos, slot/timestamp/timezone exactos, receipt, idempotency/correlation/provider IDs, Teams URL, raw UTMs/referrer/query y provider body/error. `stage` no existe: sería redundante y podría contradecir `meeting_step`.

GTM pendiente: workspace descartable basado en versión publicada; reusar DLV `surface_id`/`placement`; crear DLVs `meeting_step`, `scheduler_key`, `availability_state`, `days_ahead_bucket`, `time_of_day_bucket`, `error_category`; 2 triggers y 2 tags dedicados. GA4: registrar esas 6 dimensiones event-scoped; no crear otro key event ni usar `transaction_id`. Publish sólo tras preview, evidencia `/g/collect`, confirmación humana y snapshot.

---

## Refrescar la lista desde la DB (SoT de definiciones)

La lista de forms se refresca consultando `greenhouse_growth.form_definition` + `form_version` (published). Query canónica:

```sql
SELECT d.slug, d.form_key, d.form_kind, d.name, d.status AS def_status,
       COUNT(v.form_version_id) FILTER (WHERE v.status = 'published') AS published_versions,
       MAX(v.published_at) AS last_published_at
FROM greenhouse_growth.form_definition d
LEFT JOIN greenhouse_growth.form_version v ON v.form_id = d.form_id
GROUP BY d.form_id, d.slug, d.form_key, d.form_kind, d.name, d.status
ORDER BY last_published_at DESC NULLS LAST;
```

Al refrescar: agregar forms nuevos con tagging `⏳ pendiente`, no borrar filas (marcar `archived` si se archivó en la DB). El markdown mantiene la capa de medición que la DB no tiene.
