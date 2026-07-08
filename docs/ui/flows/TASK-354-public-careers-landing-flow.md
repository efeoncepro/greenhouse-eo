# TASK-354 — Public Careers Landing Flow Contract

## Meta

- Task: `TASK-354`
- Master flow: `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` — esta superficie implementa **N0 (attract) · N1 (listing) · N2 (detalle) · N3 (apply form)** (+ N4 nurture/talent-pool como follow-up).
- Wireframe: `docs/ui/wireframes/TASK-354-public-careers-landing.md` · Motion: `docs/ui/motion/TASK-354-public-careers-landing-motion.md`
- Route group: público (sin sesión) — ruta `src/app/public/careers/**` (NO `[lang]`); locale-aware BILINGÜE (es-CL + en-US) vía next-intl (cookie `gh_locale` + Accept-Language, sin segmento de URL). Copy vía `getMicrocopy(locale)`
- Estado: `draft` (UI ready: no)

## Flow Brief

El candidato entra por careers, **entiende por qué Efeonce** (attract), descubre una vacante, la lee (competencias + cómo es el proceso) y postula — sin sesión. El flujo cruza attract → listing → detalle → apply y termina en una confirmación **genérica y segura**. El apply crea `Person → candidate_facet → hiring_application` (vía el service de TASK-1367, que exige captcha); NO dispara el test (eso es del desk, después). Careers-as-funnel: attract → convert → apply → nurture.

## Surfaces Involved

| Surface | Ruta | Tipo | Nodo |
|---|---|---|---|
| Careers home (attract + listing) | `/careers` | público | N0 + N1 |
| Detalle | `/careers/[publicId]` | público | N2 |
| Apply | sección/step del detalle o `/careers/[publicId]/apply` | público | N3 |
| Talent pool (nurture) | sección del home | público | N4 (follow-up) |
| (downstream) Desk bandeja | `internal` (TASK-355) | interno | N4-desk — recibe la application creada |

## Flow Map

```
Careers home: Attract (N0: brand + proceso) ─▶ Listing (N1) ──click card──▶ Detalle (N2) ──"Postular"──▶ Apply (N3)
   │                                              │  loading/empty(+pool)/error   │  detalle/404          │  idle→validando→captcha→enviando
   │  (empty → talent pool N4)                     │                              │  (skills + proceso)   ▼
   └───────────────────────────────────────────────┴──────────────────▶ submit → POST /api/public/hiring/applications (1367)
                                                                                   │
                                          ┌────────────────┬────────────────┬──────┴──────────┐
                                          ▼                ▼                ▼                 ▼
                                    accepted (202)    rate_limited(429)  captcha_failed(403)  not_open(404)/invalid(422)
                                    genérico
                                          │
                                          ▼
                        (async, fuera del submit) application visible en Desk (TASK-355)
```

## Interaction Triggers

- **Ver vacantes** (N0→N1): ancla al listing.
- **Buscar/filtrar** (N1): input debounced (200–300ms) + selects área/modalidad → filtra client-side; refleja en URL search params (deep-link/back).
- **Click en VacancyCard** (N1→N2): navega a `/careers/[publicId]`.
- **"Postular a esta vacante"** (N2→N3): ancla/navega al form; foco al `<h1>`/primer campo del step (no autofocus si el form vive dentro del detalle).
- **Submit del apply** (N3): valida (schema compartido) → captcha (Turnstile) → POST → resuelve a accepted/rate-limited/captcha-failed/not_open/invalid.
- **Consent**: submit SIEMPRE habilitado; si el consent no está marcado, al click se muestra su error y foco al checkbox (NO se deshabilita el botón — forms-ux).
- **Avísame (talent pool, N4)**: input email → follow-up (backend de talent pool no es V1).

## State Machine

```
listing:  idle → loading → (loaded | empty_zero[+pool] | empty_filtered | error)
detail:   loading → (detail | not_found_404)
apply:    idle → validating(inline 3-stage) → submitting → (accepted | rate_limited | captcha_failed | not_open | validation_error | server_error)
          accepted = TERMINAL (confirmación genérica; no revela estado interno)
```

- **Validación (forms-ux 3-stage):** silencio mientras escribe (campo intacto) → `onBlur` (formato/requerido) → `onChange` si el campo ya erró → server-confirm al enviar. NUNCA limpia el form en error; foco al primer error.
- `submitting` es idempotente (dedupe determinístico en el service) → doble submit/retry NO crea aplicación duplicada; el cliente muestra el mismo `accepted` genérico.
- `captcha_failed` → recargar el widget; no revela el umbral de detección.

## Routing Contract

- **Ruta = `src/app/public/careers/**`** (patrón público canónico, espeja `src/app/public/quote/**`). NO `[lang]` (no hay i18n routing en el app; one-way door).
- `/careers` — attract + listing. **RSC + ISR** (`export const revalidate` ~300s) con **`revalidatePath('/public/careers')` on-demand** desde el publish/unpublish de TASK-355. NUNCA `force-dynamic` (una careers indexable no puede pegarle a PG en cada hit). Cacheable, sin datos sensibles.
- `/careers/[publicId]` — detalle por `public_id`, RSC + ISR. 404 si no está publicado.
- Apply form = **client component** (Turnstile + validación + `client fetch` al endpoint 1367). El resto (listing/detalle) = RSC.
- **`noindex` hasta apply live** (`HIRING_PUBLIC_APPLICATIONS_ENABLED` ON en 1367): no indexar una página cuyo "Postular" devuelve 404. Al prender el apply, quitar el noindex (coordinar 354↔1367).
- BILINGÜE es-CL + en-US vía next-intl (cookie `gh_locale` + Accept-Language); el server component resuelve `getLocale()`; sin segmento de URL `[lang]`. `hreflang` por-URL no aplica (una URL por página, locale por cookie/header).
- **NUNCA** exponer ids internos del opening en la URL (solo `public_id`).

## Focus & Accessibility

- Skip-link → `<main>`. Focus visible ≥2px 3:1. Orden de tab = visual. **NO autofocus** (el form está dentro de la página).
- Al navegar listing→detalle, foco al `<h1>` del detalle (SPA announce).
- Errores de submit: **foco al primer campo con error** + resumen `role="alert"`; inline `aria-describedby` + `aria-invalid`.
- Consent: checkbox nativo requerido, error anunciado.
- Reflow 320px / 200% zoom; `prefers-reduced-motion`.

## Data & Command Boundaries

| Acción | Contrato | Owner |
|---|---|---|
| Listar vacantes | `listPublicOpenings()` → `PublicOpeningPayload[]` (allowlist) | TASK-353 |
| Detalle vacante | `getPublicOpeningByPublicId(publicId)` → `PublicOpeningPayload` | TASK-353 |
| Enviar postulación | `POST /api/public/hiring/applications` (payload + `captchaToken`) | **TASK-1367** |
| Talent pool (nurture) | follow-up (no V1) | follow-up |

- La UI NO reconcilia Person/facet/application en el cliente — eso vive en el service (1367). La UI arma el payload validado + captchaToken y postea.
- La UI consume SOLO el payload allowlist; nunca lee columnas internas del opening ni sabe del dedupe.

## Failure Paths

| Falla | Qué ve el candidato | Qué NO ve |
|---|---|---|
| Sin vacantes | Empty state "vuelve pronto" + talent pool "Avísame" | — |
| Opening despublicado | 404 "ya no está disponible" | que existió/estado interno |
| Email ya postuló (dedupe) | **accepted genérico** (idéntico) | que ya existía / dedupe |
| Captcha falla | 403 "no pudimos verificar, recarga" | umbral de detección |
| Rate limit | 429 genérico "intenta en unos minutos" | umbral/detección |
| Validación | error inline por campo ("qué pasó + cómo") | — |
| Error servidor | "no pudimos enviar, intenta de nuevo" | stack/SQL/detalle |

## GVC Scenario Plan

- `careers-home` (attract + listing: loaded / empty-zero+pool / empty-filtered / error), desktop 1440 + mobile 390.
- `careers-detail` (detalle skills+proceso+comp / 404).
- `careers-apply` (idle → validación inline 3-stage → captcha → enviando → accepted genérico → rate-limited → captcha-failed).
- Checks: `scrollWidth==clientWidth` (1440 + 390), consola limpia, reduced-motion, foco al primer error.
- Datos: opening publicado real sembrado vía 353/355 en staging.

## Design Decision Log

- **Attract antes que listar** (N0): employer brand + transparencia del proceso — atrae talento, no solo lista (`greenhouse-talent-people-operator`).
- **Shell público reusable** (DDL-2 del master): el layout sin-sesión se diseña para que 1363 (`/assessment/[token]`) lo reuse.
- **Confirmación genérica terminal**: seguridad sobre feedback — superficie pública hostil.
- **Submit siempre enabled** (forms-ux): consent se valida al click, no deshabilita el botón.
- **Captcha en el submit** (Turnstile): el backend 1367 lo exige; el form monta el widget y pasa `captchaToken`.
- **Filtrado client-side V1**: el payload público es acotado; discovery básico sin endpoint de búsqueda dedicado (follow-up si crece el volumen).
- **Locale-aware desde V1**: candidatos internacionales; `hreflang`-ready.

## Acceptance Checklist

- [ ] N0 (attract) + N1/N2/N3 implementados con sus estados del wireframe.
- [ ] Submit vía `POST /api/public/hiring/applications` con `captchaToken`; 0 reconciliación en cliente.
- [ ] Validación 3-stage + submit enabled + foco al 1er error + no limpia el form en error.
- [ ] Dedupe/idempotency → doble submit = mismo `accepted`, sin duplicar application.
- [ ] Confirmación + fallas genéricas (no filtran estado interno/PII/dedupe).
- [ ] Routing con `public_id` (nunca id interno); ruta `src/app/public/careers/**` (NO `[lang]`).
- [ ] a11y (foco cross-surface + 1er error, consent, reflow, reduced-motion) + GVC desktop+mobile.
- [ ] `## Delta` en el master flow si cambia un nodo/regla transversal.
