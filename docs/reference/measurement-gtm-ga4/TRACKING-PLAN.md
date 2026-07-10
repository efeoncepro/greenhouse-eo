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
| `ai-visibility-grader` | diagnostic_intake | AI Visibility Grader | grader (lead magnet self-serve) | ✅ default | `gh_form_submission_accepted` → `generate_lead` | sí (previsto) | ✅ genérico | Lead magnet del grader. |
| `efeonce-seo-diagnostic` | diagnostic_intake | Diagnóstico SEO | landing SEO (agencia SEO) | ✅ default | `gh_form_submission_accepted` → `generate_lead` | sí (previsto) | ✅ genérico | Form comercial SEO. |
| `efeonce-desarrollo-web-cotizacion` | quote_request | Cotización desarrollo web | landing desarrollo web | ✅ default | `gh_form_submission_accepted` → `generate_lead` | sí (previsto) | ✅ genérico | 2 versiones publicadas. |
| `efeonce-lead-gen-web` | lead_magnet | Lead Gen — Web (diseño de sitios) | landing diseño web | ✅ default | `gh_form_submission_accepted` → `generate_lead` | sí (previsto) | ✅ genérico | — |
| `efeonce-social-audit` | diagnostic_intake | Diagnóstico Redes Sociales | landing redes sociales | ✅ default | `gh_form_submission_accepted` → `generate_lead` | sí (previsto) | ✅ genérico | Detectado por `pnpm growth:forms-tracking-audit` 2026-07-07. |
| `efeonce-web-agentica-ebook` | lead_magnet | Ebook "El fin de la web" | `/web-agentica` (Think, surface `fhsf-web-agentica-ebook`) | ✅ default | `gh_form_submission_accepted` → `generate_lead` | sí (previsto) | ✅ tagged | TASK-1375. Lead magnet ebook (descarga gated tokenizada). Emite además `download_url` en el accepted (browser-safe); el pipeline genérico GTM v2 distingue la surface por `form_slug` y `surface_id`. |

> **Página/surface** arriba es inferida por slug/nombre — confirmar el `surface_id` real del embed al taggear (viaja en el evento).
> **Estado global (2026-07-07): LIVE.** Pipeline **genérico** publicado en `GTM-NGHPGRLZ` v2: trigger `CE - gh_form_submission_accepted` + tag `GA4 Event - generate_lead` (`measurementIdOverride=G-KYPPY57M14`) con params `form_slug`/`form_kind`/`surface_id`. Cubre TODOS los forms; se distinguen por `form_slug`. GA4: custom dimensions `form_slug`/`form_kind`/`surface_id` + key event `generate_lead` registrados. Verificado con Playwright (`/g/collect?...en=generate_lead`). Un form nuevo queda medido al publicarse, sin tocar GTM. Detalle + gotchas: [`LEARNINGS.md`](LEARNINGS.md).

### Smoke-tests / drafts (NO son producción — candidatos a archivar)

`live-hs-1782380033`, `live-hs-1782379959`, `sm-hsbad-1782379602`, `sm-hsoff-1782379602`, `smoke-b-1782377074`, `smoke-test-1782376321`, `sm-hsbad/off-1782379551`, `smoke-hs-bad/off-*`, `builder-smoke-1256-*` → **ARCHIVADOS 2026-07-07** (`status='archived'`, 11 forms). Los `gate-demo-1254*` quedan como demos (no archivados). **No taggear.**

---

## CTAs

> Cuando arranquen los `gh_cta_*` (ver `04 §2`), registrar aquí cada CTA medible. Misma disciplina: un evento genérico `gh_cta_clicked` + `cta_id`/`cta_location`/`cta_kind` como parámetros; se distinguen por parámetro, no por evento.

| CTA id | Kind | Ubicación (page + location) | Emite dataLayer | Evento GTM → GA4 | Key event | Tagging | Notas |
|---|---|---|---|---|---|---|---|
| `social_meeting_hero_primary` | meeting_booking | `/servicios/redes-sociales/` · `hero_primary` | ✅ `dataLayer` | `gh_cta_clicked` → pendiente de tag GA4 | no | ⏳ pendiente | Abre el panel inline de HubSpot Meetings; fallback href directo si JS no carga. |
| `social_meeting_final_primary` | meeting_booking | `/servicios/redes-sociales/` · `final_primary` | ✅ `dataLayer` | `gh_cta_clicked` → pendiente de tag GA4 | no | ⏳ pendiente | CTA principal de la sección final. |
| `social_meeting_sticky_primary` | meeting_booking | `/servicios/redes-sociales/` · `sticky_primary` | ✅ `dataLayer` | `gh_cta_clicked` → pendiente de tag GA4 | no | ⏳ pendiente | Sticky CTA desktop; mobile se oculta por contrato de la landing. |
| `social_meeting_audit_fallback` | meeting_booking | `/servicios/redes-sociales/` · `audit_fallback` | ✅ `dataLayer` | `gh_cta_clicked` → pendiente de tag GA4 | no | ⏳ pendiente | Fallback visible si el Growth Form no renderiza. |
| `social_meeting_tab` | meeting_booking | `/servicios/redes-sociales/` · `final_cta` | ✅ `dataLayer` | `gh_cta_clicked` → pendiente de tag GA4 | no | ⏳ pendiente | Tab que cambia de Auditoría a Reunión. |
| `social_meeting_direct_fallback` | meeting_booking | `/servicios/redes-sociales/` · `meeting_embed` | ✅ `dataLayer` | `gh_cta_clicked` → pendiente de tag GA4 | no | ⏳ pendiente | Link directo a HubSpot si el iframe no aparece o el usuario prefiere nueva pestaña. |

## Meeting embeds

| Surface id | Kind | Página / ubicación | Emite dataLayer | Evento GTM → GA4 | Key event | Tagging | Notas |
|---|---|---|---|---|---|---|---|
| `social_meeting_embed` | hubspot_meetings_embed | `/servicios/redes-sociales/` · sección final CTA | ✅ `dataLayer` | `gh_meeting_embed_viewed`, `gh_meeting_embed_loaded`, `gh_meeting_embed_failed` → pendiente de tags GA4 | no | ⏳ pendiente | El iframe se lazy-load al abrir Reunión. Los UTMs de campaña viajan por la query de la página; `dataLayer` conserva CTA/surface sin PII. |

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
