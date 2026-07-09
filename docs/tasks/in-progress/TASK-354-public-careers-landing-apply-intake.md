# TASK-354 — Public Careers Landing

## Delta 2026-07-08 (revisión de arquitectura — `arch-architect`, 4 pilares)

Gaps arquitectónicos cerrados antes de implementar:

- **Routing + i18n (corregido 2026-07-08):** el app SÍ tiene i18n real **bilingüe (`es-CL` + `en-US`)** — pero **next-intl basado en cookie `gh_locale` + Accept-Language, NO por segmento de URL `[lang]`** (`src/i18n/request.ts`, `resolveLocaleFromRequest`). → **Ruta = `src/app/public/careers/**`** (sin `[lang]`, patrón público canónico) **Y locale-aware bilingüe** por construcción: el server component resuelve `const locale = await getLocale()` (`next-intl/server`) y consume `getMicrocopy(locale).careers`. Careers es **es-CL + en-US** (atrae talento nacional + internacional), NO es-CL-only ni follow-up. `hreflang` por-URL no aplica (i18n es cookie/header, una URL por página; SEO indexa el locale por defecto). Copy en dictionaries por-locale `src/lib/copy/dictionaries/{es-CL,en-US}/careers.ts` (namespace nuevo), NO un `careers.ts` suelto.
- **Scalability — caching:** una careers pública indexable puede recibir tráfico (SEO/bots). **NO `force-dynamic`** (cada hit = query a PG). → Read path = **SSR + ISR** (`export const revalidate`) con **revalidación on-demand** (`revalidatePath('/public/careers')`) disparada por el publish/unpublish de TASK-355. CQRS-lite: read cacheado separado del write (apply API).
- **Safety — defense-in-depth del payload:** (a) `buildPublicOpeningPayload` choke point único (353), (b) tipo TS en la frontera del componente (solo `PublicOpeningPayload`, nunca `HiringOpening`), (c) NUNCA importar un reader interno en `src/app/public/careers/**`.
- **Rollout coupling:** la careers arranca **`noindex`** hasta que el apply esté live end-to-end (`HIRING_PUBLIC_APPLICATIONS_ENABLED` ON en 1367) — no indexar una página cuyo "Postular" devuelve 404. Resuelve la Open Question de indexación.
- **RSC/client:** listing + detalle = **RSC** (fetch server, cacheable, SEO); filtros + apply form = **client** (Turnstile + validación). El submit postea al endpoint de 1367 vía **client fetch** (no Server Action) — el contrato ya existe (Full API Parity: UI + WebMCP comparten endpoint).
- **Resilience:** el read público degrada honesto (error boundary + estado de error, nunca 500 en blanco) + `captureWithDomain(err, 'hiring')`.

## Delta 2026-07-08 (revisión product-design + talent)

Revisión con `greenhouse-talent-people-operator` + `forms-ux` + `greenhouse-ux-writing` (+ `greenhouse-ux`/`state-design`/`a11y-architect`). Gaps cerrados en wireframe/flow/motion + spec:

- **Attract (N0) agregado** — la careers deja de ser "un listado": hero de employer brand + 3 pilares "por qué Efeonce" + stepper "cómo es el proceso" (transparencia = reduce ansiedad + defendible). Careers-as-funnel attract→convert→apply→nurture.
- **Detalle skills-forward** — competencias clave (chips, enlazan al assessment engine) + cómo es el proceso + **señal de compensación** (rango si el payload lo trae; si no, "se conversa en el proceso" — pay-transparency 2026).
- **Apply form → floor forms-ux completo** — `autocomplete`+`inputmode` por campo (estaba ausente, crítico), **submit ENABLED** (corrige "disabled por consent" → validar al click), validación 3-stage, foco al 1er error, paste tolerante, no-autofocus, "(opcional)" en la minoría, **Turnstile widget** (el backend 1367 exige `captchaToken`, faltaba en el diseño).
- **Copy es-CL enriquecido** — consent referencia el aviso de privacidad (Ley 21.719), error-copy por campo ("qué pasó + cómo se arregla"), labels noun-based, gender-inclusive.
- **Fairness/AI-Act** — nunca ID docs ni datos proxy de clase protegida en el apply público; sin scoring IA en el intake (ya se cumplía, ahora explícito en Acceptance).
- **Nurture (N4)** — talent pool "Avísame" en el empty-state (V1 affordance; wiring backend = follow-up).

## Delta 2026-07-08 (split UI/backend)

- **Task partida por Execution profile** (Task Authoring Contract + task-planner): el *apply intake service* (endpoint público + validación + reconciliación Person→facet→application + dedupe/idempotency + consent + anti-abuse) se movió a **`TASK-1367` (backend-data)**. Esta task queda como la **careers UI** (`ui-ux`): listing + detalle + apply form, **cliente delgado** del service de 1367. `Blocked by` ahora incluye `TASK-1367`.
- **Docs de diseño creados (robustos, no stubs):** `docs/ui/wireframes/TASK-354-public-careers-landing.md`, `docs/ui/flows/TASK-354-public-careers-landing-flow.md`, y el **master UI flow del programa** `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` (esta surface = nodos N1/N2/N3).
- **V1 con CV PDF privado:** portafolio/LinkedIn siguen como enlace; el CV opcional se sube como PDF (máx. 10 MB) dentro del submit público protegido por Turnstile y se persiste en `greenhouse_core.assets` con contexto `hiring_application_cv`. `TASK-1362` queda para document capture completo (portfolio-file, identidad, scan/quarantine formal). El shell público sin sesión se diseña reusable para `/assessment/[token]` (TASK-1363).
- El apply **NO** dispara el test (se envía después desde el desk, TASK-355/1363).

## Delta 2026-07-08 (desbloqueo de ejecución Codex)

- **`TASK-1367` ya está en `docs/tasks/complete/` y su service existe en runtime** (`POST /api/public/hiring/applications`, `src/lib/hiring/public-careers/**`), por lo que deja de bloquear esta UI. Se corrige el drift documental: `Blocked by: none`.
- **Baseline visual primario:** por instrucción del operador, `/Users/jreye/Documents/carreers/Efeonce Carrers/Efeonce Careers.dc.html` es la fuente visual de alta fidelidad para la implementación. Wireframe/flow/motion siguen como contrato técnico, pero si hay tensión visual no funcional, prevalece el HTML de `carreers` salvo choque con seguridad, accesibilidad, privacidad, i18n o runtime verificado.

## Delta 2026-07-09 (implementación + rollout)

- **UI code complete:** `/public/careers/**` implementado con alta fidelidad al HTML local `carreers`, usando marca Efeonce externa, home employer-brand, listado, detalle, apply y estados no disponibles. Listing/detalle consumen solo `PublicOpeningPayload`; apply postea a `POST /api/public/hiring/applications`.
- **Apply como Growth Form, sin write path paralelo:** el formulario usa contrato browser de Growth Forms (`formKind='application'`, slug `efeonce-careers-application`, schema/campos/consent/captcha y eventos `gh_form_*`) con estética del HTML fuente; la autoridad de negocio sigue siendo Hiring/TASK-1367.
- **CV con Greenhouse uploader/asset pipeline:** el apply público acepta un PDF opcional y lo adjunta como asset privado a `hiring_application` usando `createPrivatePendingAsset` + `attachAssetToAggregate`. No usa el endpoint privado del componente autenticado en browser público.
- **GVC runtime formalizado:** se agregó `scripts/frontend/scenarios/task354-careers-runtime-audit.scenario.ts` para capturar home/listing/detalle/apply/uploader en desktop 1440 + mobile 390 con gates layout/runtime/keyboard/reduced-motion. El loop detectó targets tocables pequeños y se corrigieron brand/footer/privacy links en `careers.module.css`.
- **Paridad HTML verificada:** comparación Playwright + `sharp` contra `/Users/jreye/Documents/carreers/Efeonce Carrers/Efeonce Careers.dc.html` en desktop 1440 y mobile 390. La diferencia visual esperada es contenido runtime (1 opening seed) vs baseline estático (6 openings) y ausencia del overlay de revisión del HTML.
- **Rollout/release completado por autorización explícita del operador:** `HIRING_PUBLIC_APPLICATIONS_ENABLED=true` y `NEXT_PUBLIC_TURNSTILE_SITE_KEY` quedaron seteados en Vercel `staging` y `Production` el 2026-07-09; `TURNSTILE_SECRET` existe en ambos. El operador autorizó el release acoplado y `production-release.yml` run `28991488376` terminó `success`, promoviendo `433cfa2b0fd3` a producción con Vercel READY y manifest `released`.
- **Smoke productivo parcial:** `/api/auth/health` respondió 200 `overallStatus=ready` y `/public/careers` respondió 200 con release `433cfa2b0fd3`. La base productiva no tiene openings `published + public_listed` (`0 rows`), por lo que no se ejecutó submit/dedupe real sin fabricar datos en producción.
- **Release residual documentado:** el watchdog reporta drift sólo para `ops-worker` (`bba072bf` vs `433cfa2b0fd3`), pero el job del orquestador lo saltó porque los paths runtime del worker no cambiaron; diff runtime vacío. No forzar redeploy salvo cambio real del worker.
- **Límite explícito:** `revalidatePath` on-demand al publicar/despublicar queda en TASK-355 (Publication Desk). Esta UI ya usa ISR (`revalidate=300`) y no crea un publish command paralelo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-354-public-careers-landing.md`
- Flow: `docs/ui/flows/TASK-354-public-careers-landing-flow.md`
- Motion: `docs/ui/motion/TASK-354-public-careers-landing-motion.md`
- Backend impact: `api`
- Epic: `EPIC-011`
- Status real: `Code complete; production route live; submit smoke pendiente por falta de opening público`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `follow-on de GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1`
- GitHub Issue: `none`

## Summary

La landing pública de vacantes de Efeonce: listing de openings publicados, detalle por vacante y formulario de postulación, como **cliente delgado** del apply intake service (TASK-1367) y del publication contract (TASK-353). Es la puerta de entrada visible de candidatos al dominio `Hiring / ATS`, sin abrir un pipeline paralelo.

## Why This Task Exists

TASK-353 dejó la foundation + el payload público (`PublicOpeningPayload`) y TASK-1367 expone el apply service, pero **no existe ninguna superficie pública** donde un candidato descubra una vacante y postule. Sin esta UI, el ATS no tiene cara externa y 1360/1361 no reciben candidatos por el canal público. La UI se separa del backend (Full API Parity: la pantalla es cliente de commands/readers gobernados).

## Goal

- Renderizar listing + detalle público consumiendo SOLO el payload allowlist (nunca columnas internas).
- Entregar un apply form accesible (bilingüe es-CL + en-US vía next-intl, con CV PDF opcional vía assets privados) que postee al service de TASK-1367 con confirmación genérica y segura.
- Diseñar el shell público sin sesión reusable para `/assessment/[token]` (TASK-1363).

## Hybrid Execution Justification

El operador pidió explícitamente que el upload de CV use Greenhouse uploader/asset pipeline dentro del cierre end-to-end de esta UI. El backend añadido es pequeño, reversible y sin migración: `multipart/form-data` en el endpoint público existente + contextos exhaustivos del asset registry + attach a `hiring_application`. No cambia schema de Hiring ni crea comandos paralelos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` (master flow — esta surface = N1/N2/N3)
- `docs/ui/wireframes/TASK-354-public-careers-landing.md` + `docs/ui/flows/TASK-354-public-careers-landing-flow.md` (contrato de diseño)
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (publication contract allowlist)
- `DESIGN.md` + tokens AXIS + `src/config/efeonce-brand.ts` (marca **Efeonce**, no Greenhouse — careers es institucional/externo)
- `docs/architecture/ui-platform/README.md` (primitives + patterns)

Reglas obligatorias:

- **Ruta canónica `src/app/public/careers/**`** (espeja `src/app/public/quote/**`). NUNCA `src/app/[lang]/careers` (el i18n es cookie/header vía next-intl, NO por URL; agregar `[lang]` es one-way door). La página es BILINGÜE (es-CL + en-US) vía `getLocale()` + `getMicrocopy(locale)`.
- **Read path cacheado (ISR):** listing + detalle en RSC con `export const revalidate` + `revalidatePath('/public/careers')` on-demand desde el publish de 355. NUNCA `force-dynamic` para el listing público (no absorbe tráfico).
- **Defense-in-depth del payload:** consumir SOLO `PublicOpeningPayload` (allowlist `buildPublicOpeningPayload`, choke point de 353); el tipo TS en la frontera del componente debe ser `PublicOpeningPayload`; NUNCA importar un reader interno del opening en `src/app/public/careers/**`.
- **`noindex` hasta apply live:** no indexar la careers hasta que `HIRING_PUBLIC_APPLICATIONS_ENABLED` esté ON (coordinar con 1367) — no indexar una página cuyo "Postular" es 404.
- El apply postea a `POST /api/public/hiring/applications` (TASK-1367) vía **client fetch** con `captchaToken`; la UI NO reconcilia Person/facet/application en el cliente.
- **RSC/client:** listing/detalle = RSC (server, cacheable); filtros + apply form = client. Read falla → degradación honesta (error boundary + estado de error, nunca 500) + `captureWithDomain(err, 'hiring')`.
- Copy 100% desde `getMicrocopy(locale).careers` (dictionaries `src/lib/copy/dictionaries/{es-CL,en-US}/careers.ts`, es-CL + en-US) (nuevo), bilingüe es-CL + en-US, tuteo neutro (validar con `greenhouse-ux-writing`); 0 literals en JSX.
- Tokens `theme.palette.*`/`theme.axis.*` + variantes tipográficas; sin HEX/px/`fontSize` inline. Marca Efeonce (logo + eslogan institucional), no la app.
- Confirmación + fallas **genéricas** (superficie pública hostil): nunca revelar dedupe/estado interno/existencia previa/PII.
- WCAG 2.2 AA; `scrollWidth==clientWidth` en desktop + 390px; `prefers-reduced-motion`.

## Normative Docs

- `docs/tasks/complete/TASK-1367-careers-apply-intake-service.md` (el service que consume)
- `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1367` (apply intake service — `submitPublicHiringApplication`, `POST /api/public/hiring/applications`)
- `TASK-353` (`listPublicOpenings` / `getPublicOpeningByPublicId`, publication contract)
- Shell/foundation UI compartida (`src/app`, `src/components/greenhouse`)
- Product-design skills (info-architecture lead + state-design + forms-ux + greenhouse-ux-writing + modern-ui + a11y-architect)

### Blocks / Impacts

- Visibilidad externa del ATS
- Reusa el shell público para TASK-1363 (`/assessment/[token]`)
- Analítica futura de conversión de careers

### Files owned

- `src/app/public/careers/**` (rutas públicas — patrón `src/app/public/**`; NO `[lang]`. El slug URL exacto — `/public/careers` vs un `src/app/careers/` raíz para `/careers` limpio — lo decide Discovery; NUNCA `[lang]`)
- `src/views/greenhouse/careers/**`
- `src/components/greenhouse/careers/**` (VacancyCard, shell público reusable, apply form)
- `getMicrocopy(locale).careers` (dictionaries `src/lib/copy/dictionaries/{es-CL,en-US}/careers.ts`, es-CL + en-US) (copy es-CL)
- (consume, NO owns) `src/lib/hiring/publication.ts` (readers — allowlist) + el endpoint de TASK-1367
- (extiende, coordina) el publish de TASK-355 debe llamar `revalidatePath` de la careers on-demand

## Current Repo State

### Already exists

- App Router + foundation UI compartida (`src/app`, `src/components/greenhouse`), patrones Vuexy/MUI para listados/cards/forms.
- Publication contract + readers públicos (TASK-353): `listPublicOpenings`, `getPublicOpeningByPublicId` → `PublicOpeningPayload`.
- `react-hook-form`, `GreenhouseDatePicker`, `CustomTextField`, `CustomChip` como primitives disponibles.
- `EfeonceSlogan` / marca Efeonce SSOT (`src/config/efeonce-brand.ts`).

### Gap

- No existe ninguna surface pública de careers (listing/detalle/apply).
- No existe el shell público sin sesión reusable.
- No existe `getMicrocopy(locale).careers` (dictionaries `src/lib/copy/dictionaries/{es-CL,en-US}/careers.ts`, es-CL + en-US).

## UI/UX Contract

### Experience brief

- **Rigor:** `ui-standard`.
- Un candidato externo (sin sesión) **entiende por qué Efeonce** (employer brand + cómo es el proceso), descubre una vacante, la lee (competencias + proceso) y postula en < 2 min. Careers-as-funnel: **attract → convert → apply → nurture** — la página atrae talento, no es solo un listado. Marca sólida + confianza de datos (consentimiento claro), sin fricción, sin filtrar nada interno. Marca **Efeonce** institucional. Diseñar para una workforce multi-generacional (claro + accesible, no gimmick).

### Surface & system decision

- 4 nodos: **N0 attract** (hero + pilares de marca + stepper de proceso, en `/careers`), **N1 listing** (mismo home), **N2 detalle** (`/careers/[publicId]`), **N3 apply** (sección/step). N4 nurture (talent pool) = follow-up. Ver master flow EPIC-011.
- Shell público sin sesión **nuevo y reusable** (lo reusa 1363). Primitive lookup: Greenhouse primitive → Vuexy `Custom*` → MUI (no inventar).
- No es `ui-platform` (no crea Design System nuevo), pero el shell público es reusable → documentarlo como patrón en `ui-platform/PATTERNS.md` al implementar.

### State inventory

Los 10 estados del wireframe: listing (loading/loaded/empty-zero[+talent-pool]/empty-filtered/error), detalle (detail/404), apply (idle/validando-inline/enviando/accepted-genérico/rate-limited/captcha-failed/validation-error/server-error). `accepted` es terminal y genérico. Detalle + error-copy por campo en `docs/ui/wireframes/TASK-354-public-careers-landing.md` → State Copy + Error Copy.

### Interaction contract (forms-ux floor obligatorio)

- Buscar/filtrar client-side (debounced 200–300ms, URL search params); click card→detalle; "Postular"→form.
- **Apply form (forms-ux):** single column (Nombre/Apellido pareado), label sobre input, `autocomplete`+`inputmode` por campo, validación **3-stage** (silencio→blur→fix-on-change→server-confirm), error inline 4-elementos, **submit ENABLED** (validar al click, foco al 1er error, NO deshabilitar por consent), preservar datos en error, NO autofocus, "(opcional)" en la minoría, paste tolerante (teléfono), **Turnstile** (pasa `captchaToken` a 1367).
- Submit idempotente (dedupe en el service) → mismo `accepted` genérico en doble submit. Detalle en el Flow + wireframe §Implementation Mapping (contrato de campos).

### Motion & microinteractions

- Motion trivial (reveal de cards, hover, estados de submit) — `UI impact: flow`, no `motion`. Todo detrás de `prefers-reduced-motion`. Sin motion no-trivial → sin doc de motion dedicado. Si al implementar emerge motion no-trivial, crear `docs/ui/motion/TASK-354-*.md` y declararlo.

### Implementation mapping

Ver la tabla completa en el wireframe (§Implementation Mapping): VacancyCard = Card outlined + `CustomChip`; filtros = `CustomTextField`(+select); apply = `react-hook-form` + `CustomTextField` + checkbox consent; readers `listPublicOpenings`/`getPublicOpeningByPublicId`; command `submitPublicHiringApplication` (1367). Tokens AXIS; copy `getMicrocopy(locale).careers` (dictionaries `src/lib/copy/dictionaries/{es-CL,en-US}/careers.ts`, es-CL + en-US).

### GVC scenario plan

- `careers-listing` (loaded/empty-zero/empty-filtered/error), `careers-detail` (detalle/404), `careers-apply` (idle→validando→enviando→success→rate-limited).
- GVC desktop 1440 + mobile 390 obligatorio (`ui-standard`); `scrollWidth==clientWidth`; consola limpia; reduced-motion; foco cross-surface correcto. Datos: opening publicado real sembrado en staging.

### Design decision log

- Marca Efeonce (no Greenhouse); CV PDF opcional como asset privado (document capture amplio = 1362); confirmación genérica terminal; shell público reusable (DDL-2 master); filtrado client-side V1; locale-aware `hreflang`-ready. Detalle en wireframe + flow.

## Backend/Data Contract

- Endpoint afectado: `POST /api/public/hiring/applications`.
- Entrada pública: JSON sin archivo (compatibilidad) o `multipart/form-data` con los mismos campos + `cvFile` opcional.
- Archivo permitido: `application/pdf`, tamaño máximo 10 MB, validado en cliente y servidor.
- Persistencia: `greenhouse_core.assets` en bucket privado con contexto draft `hiring_application_cv_draft`; attach final a `owner_aggregate_type='hiring_application_cv'` y `owner_aggregate_id=<application_id>`.
- Acceso: el candidato público nunca recibe URL de descarga. Descarga interna pasa por `/api/assets/private/[assetId]` y `canTenantAccessAsset` limitado a HR/internal/admin/EFEONCE_ADMIN.
- Riesgo residual documentado: V1 PDF-only marca `scanStatus='not_scanned_pdf_only_v1'`; scan/quarantine formal queda en `TASK-1362`.

### Visual verification

- `pnpm fe:capture` en loop hasta enterprise (desktop+mobile), frames mirados. `pnpm ui:wireframe-check --task TASK-354` + `pnpm ui:flow-check --task TASK-354` verdes. 2 gates Figma si se toca token/primitive.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Shell público + attract (N0) + listing (N1)

- Shell público sin sesión reusable (header/footer Efeonce) + ruta `/careers`.
- **Attract (N0):** hero de employer brand + 3 pilares ("por qué Efeonce") + stepper "cómo es el proceso" (transparencia). NO es solo un listado — la página atrae talento (`greenhouse-talent-people-operator`).
- Listing de openings publicados (`listPublicOpenings`) con VacancyCard **skills-forward** (chips de competencias clave) + filtros client-side (búsqueda/área/modalidad, debounce 200–300ms, URL search params).
- Estados: loading (skeletons), empty-zero (+ CTA talent pool), empty-filtered, error. Copy `getMicrocopy(locale).careers` (dictionaries `src/lib/copy/dictionaries/{es-CL,en-US}/careers.ts`, es-CL + en-US).

### Slice 2 — Detalle (N2)

- Ruta `/careers/[publicId]` con detalle desde `getPublicOpeningByPublicId` (allowlist): descripción + **competencias clave** (chips, enlaza al assessment engine) + **cómo es el proceso** + **señal de compensación** ("se conversa en el proceso" si el payload no trae rango; si trae, mostrarlo — pay-transparency). Estado 404. CTA "Postular a esta vacante".

### Slice 3 — Apply form (N3) — forms-ux floor

- Form (`react-hook-form` o `useActionState`): Nombre/Apellido (fila pareada) · Correo · Teléfono (opcional) · CV PDF (opcional) · Portafolio-link (opcional) · LinkedIn-link (opcional) · Disponibilidad (opcional) · Mensaje (opcional) · Consent · **Turnstile widget**. Postea a `POST /api/public/hiring/applications` (1367) con `captchaToken`.
- **Floor forms-ux (obligatorio):** single column, label sobre input, `autocomplete`+`inputmode` por campo (ver wireframe §Implementation Mapping), validación 3-stage (silencio→blur→fix-on-change→server-confirm), error inline 4-elementos (`aria-invalid`+`aria-describedby`+`role=alert`), submit **ENABLED** (validar al click, NO deshabilitar por consent), preservar datos en error, foco al primer error, NO autofocus, "(opcional)" en la minoría, paste tolerante (teléfono).
- Estados: idle/validando-inline/enviando/accepted-genérico/rate-limited/captcha-failed/validación/error. Confirmación genérica (nunca revela dedupe/estado/PII). Consent referencia el aviso de privacidad (Ley 21.719).

### Slice 4 — GVC + verificación visual

- Scenarios GVC (careers-home[attract+listing]/detalle/apply) desktop+mobile; loop hasta enterprise; `scrollWidth==clientWidth`; consola limpia; foco al 1er error. Registrar el shell público como patrón en `ui-platform/PATTERNS.md`.

### Slice 5 (follow-up) — Talent pool / nurture (N4)

- "Avísame de nuevas vacantes" (captura de email para talent pool). Requiere backend propio (no V1) — dejar el affordance en el empty-state y diferir el wiring. Documentar como follow-up si no entra en V1.

## Out of Scope

- El apply intake service (backend) — TASK-1367.
- Document capture completo — TASK-1362 (portfolio-file, identidad, scan/quarantine formal). El CV PDF opcional V1 queda en TASK-354 por instrucción del operador.
- Assessment (envío/rendición) — TASK-1363; el apply no dispara el test.
- Desk interno — TASK-355.

## Detailed Spec

Implementar DESDE el wireframe + flow + master flow (son el contrato de diseño; no freehand). La UI es cliente delgado: readers de 353 + command de 1367. El shell público se diseña reusable para 1363. Copy productivo en `getMicrocopy(locale).careers` (dictionaries `src/lib/copy/dictionaries/{es-CL,en-US}/careers.ts`, es-CL + en-US) (es-CL). Marca Efeonce vía SSOT.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (shell+listing) → Slice 2 (detalle) → Slice 3 (apply) → Slice 4 (GVC). El apply (Slice 3) requiere que TASK-1367 esté shippeado (blocked by).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Fuga de estado interno en la UI | privacy | medium | Consumir solo `PublicOpeningPayload`; confirmación genérica; test anti-leak | revisión de payloads/GVC |
| Overflow horizontal mobile | UI | medium | `scrollWidth==clientWidth` en GVC 390px; contención | GVC frame |
| Copy hardcodeado / marca equivocada | UI/brand | low | Copy en `careers.ts` + marca Efeonce SSOT; lint `no-untokenized-copy` | lint/GVC |
| Form inaccesible (consent/labels) | a11y | medium | Labels reales + consent accesible + axe; error anunciado | axe/GVC |
| **Public page `force-dynamic` → PG por hit (no absorbe tráfico)** | scalability | medium | RSC + ISR (`revalidate`) + `revalidatePath` on-publish; NUNCA force-dynamic el listing | latencia/carga PG bajo tráfico |
| **Indexar careers con apply 404** (flag OFF) | SEO/rollout | medium | `noindex` hasta `HIRING_PUBLIC_APPLICATIONS_ENABLED` ON; coordinar 354↔1367 | página indexada con CTA roto |
| **`[lang]` one-way door** (routing i18n inexistente) | architecture | low | Ruta `src/app/public/careers/**`; i18n = ADR app-wide follow-up | — |
| Read público falla (PG blip) → 500 en blanco | resilience | low | Error boundary + estado de error honesto + `captureWithDomain('hiring')` | error rate del read |

### Feature flags / cutover

- Sin flag propio de UI: la exposición pública del endpoint la gobierna TASK-1367 (`HIRING_PUBLIC_APPLICATIONS_ENABLED`). El 2026-07-09 el operador pidió prender flags y autoriza producción; Vercel quedó con `HIRING_PUBLIC_APPLICATIONS_ENABLED=true` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` en `staging` y `Production`. Como `NEXT_PUBLIC_*` se hornea en build, el flip requiere build fresco y smoke post-release antes de declarar cierre.
- Listing/detalle usan `robots` condicional: indexan solo si `HIRING_PUBLIC_APPLICATIONS_ENABLED` está ON; apply permanece `noindex`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1-4 | revert PR (rutas/vistas additive) | <10 min | si |

### Production verification sequence

1. Deploy staging + sembrar un opening publicado real (via 355/353).
2. GVC `task354-careers-runtime-audit` desktop+mobile mirado; `scrollWidth==clientWidth`; consola limpia.
3. Postular de punta a punta contra staging → verificar application creada (por el service 1367) + confirmación genérica.
4. Repetir en prod vía release pipeline.

### Out-of-band coordination required

- Contenido/legal del aviso de privacidad + versión de copy/consent (coordinar con 1367 que lo persiste).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] **Ruta `src/app/public/careers/**`** (patrón público canónico); NUNCA `[lang]`. Listing/detalle = **RSC + ISR** (`revalidate=300`); NO `force-dynamic`. Apply = client component. `revalidatePath` on-publish queda en TASK-355, dueño del publish desk.
- [x] **`noindex`** hasta que el apply esté live (`HIRING_PUBLIC_APPLICATIONS_ENABLED` ON); read público con degradación honesta + `captureWithDomain('hiring')`.
- [x] **Attract (N0)** presente: hero de employer brand + pilares "por qué Efeonce" + stepper "cómo es el proceso" — la página atrae, no solo lista.
- [x] Listing/detalle consumen SOLO `PublicOpeningPayload`; 0 columnas internas; **skills-forward** (chips de competencias).
- [x] Detalle muestra competencias + cómo es el proceso + **señal de compensación** (rango si el payload lo trae, si no "se conversa en el proceso").
- [x] Apply postea a `POST /api/public/hiring/applications` (1367) con **`captchaToken` (Turnstile)**; 0 reconciliación en cliente.
- [x] **Form floor forms-ux:** single column (Nombre/Apellido pareado), label sobre input, `autocomplete`+`inputmode` por campo, validación 3-stage, error inline 4-elementos, submit **ENABLED** (no disabled-por-consent), preservar datos en error, foco al 1er error, no autofocus, "(opcional)" en la minoría, paste tolerante.
- [x] Los estados del State Copy existen (incluye vacío+talent-pool, 404, rate-limited, captcha-failed, validación con error-copy por campo, error genérico).
- [x] Confirmación + fallas genéricas (no filtran dedupe/estado/PII).
- [x] Copy vía `getMicrocopy(locale).careers` (bilingüe es-CL + en-US); consent referencia el aviso de privacidad (Ley 21.719); marca Efeonce (no Greenhouse).
- [x] NUNCA se piden documentos de identidad ni datos proxy de clase protegida (edad/género/foto) en el apply público (fairness).
- [x] a11y WCAG 2.2 AA de la superficie V1: labels reales, consent accesible, foco al 1er error, reduced-motion y reflow verificado en desktop/mobile.
- [x] GVC desktop+mobile mirado; `scrollWidth==clientWidth`; consola limpia.
- [x] Shell público documentado como patrón reusable (para 1363).
- [x] `UI ready: yes` con `pnpm task:lint --task TASK-354` sin findings.

## Verification

- `pnpm test src/lib/hiring/public-careers/view-model.test.ts src/lib/copy/index.test.ts`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm task:lint --task TASK-354`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- `pnpm fe:capture task354-careers-runtime-audit --env=local --task TASK-354`
- `pnpm fe:capture --route=/public/careers --env=local --hold=1500`
- `pnpm fe:capture --route=/public/careers/EO-OPN-0006 --env=local --hold=1500`
- `pnpm fe:capture --route=/public/careers/EO-OPN-0006/apply --env=local --hold=1500`
- Playwright local smoke desktop/mobile: home/detail/apply 200, consola limpia, `scrollWidth == clientWidth`, Growth Forms contract visible, validation events `gh_form_*`.
- Playwright local smoke con CV PDF: `202 accepted`, application creada y asset privado `hiring_application_cv` adjunto; limpieza posterior de seed/application/asset en dev PG/GCS.
- Parity audit local: `.captures/task354-html-parity-2026-07-09T02-04-49/{source-html,runtime-next,compare}-{desktop1440,mobile390}.png`.
- GVC runtime green: `.captures/2026-07-09T02-04-07_task354-careers-runtime-audit/` (12 frames, desktop1440 + mobile390, console/runtime/layout/keyboard/reduced-motion).

## Closing Protocol

- [x] `Lifecycle` sincronizado (`in-progress` hasta smoke productivo)
- [x] archivo en la carpeta correcta
- [x] `docs/tasks/README.md` sincronizado
- [x] `Handoff.md` + `changelog.md` actualizados
- [x] doc funcional (`docs/documentation/`) + manual (`docs/manual-de-uso/`) si aplica
- [x] `ui-platform/PATTERNS.md` con el shell público reusable

## Follow-ups

- `TASK-1362` doc capture → portfolio-file, identity docs, resolver documental unificado y scan/quarantine formal.
- `TASK-1363` reusa el shell público para `/assessment/[token]`.
- `TASK-355` cablea `revalidatePath('/public/careers')` y detalle/apply al publish/unpublish real.
- Endpoint de búsqueda dedicado si crece el volumen de vacantes.
- "Avísame de nuevas vacantes" (talent pool) como follow-up de engagement.

## Open Questions

- Resuelta 2026-07-09: listing/detalle indexan cuando `HIRING_PUBLIC_APPLICATIONS_ENABLED` está ON; apply siempre `noindex`.
- Resuelta 2026-07-09: filtros V1 = búsqueda + área + modalidad sobre `PublicOpeningPayload`.
