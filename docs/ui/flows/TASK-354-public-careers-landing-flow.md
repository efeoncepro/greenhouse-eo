# TASK-354 — Public Careers Landing Flow Contract

## Meta

- Task: `TASK-354`
- Master flow: `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` — esta superficie implementa **N1 (listing) · N2 (detalle) · N3 (apply form)**.
- Wireframe: `docs/ui/wireframes/TASK-354-public-careers-landing.md`
- Route group: público (sin sesión), locale-aware `[lang]`
- Estado: `draft` (UI ready: no)

## Flow Brief

El candidato entra por careers, descubre una vacante, la lee y postula — sin sesión. El flujo cruza tres superficies (listing → detalle → apply) y termina en una confirmación **genérica y segura**. El apply crea `Person → candidate_facet → hiring_application` (vía el service de TASK-1367); NO dispara el test (eso es del desk, después).

## Surfaces Involved

| Surface | Ruta | Tipo | Nodo |
|---|---|---|---|
| Listing | `/[lang]/careers` | público | N1 |
| Detalle | `/[lang]/careers/[publicId]` | público | N2 |
| Apply | sección/step del detalle o `/[lang]/careers/[publicId]/apply` | público | N3 |
| (downstream) Desk bandeja | `internal` (TASK-355) | interno | N4 — recibe la application creada |

## Flow Map

```
Listing (N1) ──click card──▶ Detalle (N2) ──"Postular"──▶ Apply form (N3)
   │  loading/empty/error         │  detalle/404              │  idle→validando→enviando
   │                              │                           ▼
   └──────────────────────────────┴───────────────▶ submit → submitPublicHiringApplication (1367)
                                                              │
                                          ┌───────────────────┼───────────────────┐
                                          ▼                   ▼                   ▼
                                    success genérico     rate-limited(429)    error genérico
                                          │
                                          ▼
                        (async, fuera del submit) application visible en Desk N4
```

## Interaction Triggers

- **Buscar/filtrar** (N1): input debounced + selects área/modalidad → filtra client-side sobre el payload ya cargado (discovery básico V1).
- **Click en VacancyCard** (N1→N2): navega a `/careers/[publicId]`.
- **"Postular a esta vacante"** (N2→N3): ancla/navega al form.
- **Submit del apply** (N3): valida (schema compartido) → POST al service → resuelve a success/rate-limited/error.
- **Consent obligatorio**: submit deshabilitado hasta marcar el checkbox.

## State Machine

```
listing:  idle → loading → (loaded | empty_zero | empty_filtered | error)
detail:   loading → (detail | not_found_404)
apply:    idle → validating(inline) → submitting → (success | rate_limited | validation_error | server_error)
          success = TERMINAL (confirmación genérica; no revela estado interno)
```

- `submitting` es idempotente (dedupe determinístico `openingId + normalizedEmail + window` en el service) → doble submit/retry NO crea aplicación duplicada; el cliente muestra el mismo success.
- `validation_error` vuelve a `idle` conservando lo tipeado (NUNCA limpia el form en error).

## Routing Contract

- `/[lang]/careers` — listing. SSR/ISR del payload público (cacheable; sin datos sensibles).
- `/[lang]/careers/[publicId]` — detalle por `public_id` del opening. 404 si no está publicado.
- Apply: preferir sección del detalle (menos navegación) o `/apply` como step. Deep-link al form vía ancla.
- `[lang]` locale-aware (`hreflang`-ready) — clientes/candidatos internacionales.
- **NUNCA** exponer ids internos del opening en la URL (solo `public_id`).

## Focus & Accessibility

- Skip-link → `<main>`. Focus visible ≥2px 3:1. Orden de tab = visual.
- Al navegar listing→detalle, foco al `<h1>` del detalle (SPA announce).
- Errores de submit: foco al resumen `role="alert"`; inline `aria-describedby` + `aria-invalid`.
- Consent: checkbox nativo requerido, error anunciado.
- Reflow 320px / 200% zoom; `prefers-reduced-motion`.

## Data & Command Boundaries

| Acción | Contrato | Owner |
|---|---|---|
| Listar vacantes | `listPublicOpenings()` → `PublicOpeningPayload[]` (allowlist) | TASK-353 |
| Detalle vacante | `getPublicOpeningByPublicId(publicId)` → `PublicOpeningPayload` | TASK-353 |
| Enviar postulación | `submitPublicHiringApplication(input)` (endpoint `POST /api/public/hiring/applications`) | **TASK-1367** |

- La UI NO reconcilia Person/facet/application en el cliente — eso vive en el service (1367). La UI arma el payload validado y postea.
- La UI consume SOLO el payload allowlist; nunca lee columnas internas del opening.

## Failure Paths

| Falla | Qué ve el candidato | Qué NO ve |
|---|---|---|
| Sin vacantes | Empty state "vuelve pronto" | — |
| Opening despublicado | 404 "ya no está disponible" | que existió/estado interno |
| Email ya postuló (dedupe) | **success genérico** (idéntico) | que ya existía / dedupe |
| Rate limit | 429 genérico "intenta en unos minutos" | umbral/detección |
| Error servidor | "no pudimos enviar, intenta de nuevo" | stack/SQL/detalle |
| Provider/DB caído | error genérico + retry | causa técnica |

## GVC Scenario Plan

- `careers-listing` (loaded / empty-zero / empty-filtered / error), desktop 1440 + mobile 390.
- `careers-detail` (detalle / 404).
- `careers-apply` (idle → validación inline → enviando → success genérico → rate-limited).
- Checks: `scrollWidth==clientWidth` (1440 + 390), consola limpia, reduced-motion, foco correcto.
- Datos: opening publicado real sembrado vía 353/355 en staging.

## Design Decision Log

- **Shell público reusable** (DDL-2 del master): el layout sin-sesión se diseña para que 1363 (`/assessment/[token]`) lo reuse.
- **Confirmación genérica terminal**: seguridad sobre feedback — superficie pública hostil.
- **Filtrado client-side V1**: el payload público es acotado; discovery básico sin endpoint de búsqueda dedicado (follow-up si crece el volumen).
- **Locale-aware desde V1**: candidatos internacionales; `hreflang`-ready.

## Acceptance Checklist

- [ ] Los 3 nodos (N1/N2/N3) implementados con sus estados del wireframe.
- [ ] Submit vía `submitPublicHiringApplication` (1367); 0 reconciliación en cliente.
- [ ] Dedupe/idempotency → doble submit = mismo success, sin duplicar application.
- [ ] Confirmación + fallas genéricas (no filtran estado interno/PII/dedupe).
- [ ] Routing con `public_id` (nunca id interno) + `[lang]`.
- [ ] a11y (foco cross-surface, consent, reflow, reduced-motion) + GVC desktop+mobile.
- [ ] `## Delta` en el master flow si cambia un nodo/regla transversal.
