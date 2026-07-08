# TASK-354 — Public Careers Landing

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
- **V1 links-only:** portafolio/LinkedIn como enlace; el upload de archivo (CV) es `TASK-1362`. El shell público sin sesión se diseña reusable para `/assessment/[token]` (TASK-1363).
- El apply **NO** dispara el test (se envía después desde el desk, TASK-355/1363).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-354-public-careers-landing.md`
- Flow: `docs/ui/flows/TASK-354-public-careers-landing-flow.md`
- Motion: `docs/ui/motion/TASK-354-public-careers-landing-motion.md`
- Backend impact: `none`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-1367`
- Branch: `task/TASK-354-public-careers-landing`
- Legacy ID: `follow-on de GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1`
- GitHub Issue: `none`

## Summary

La landing pública de vacantes de Efeonce: listing de openings publicados, detalle por vacante y formulario de postulación, como **cliente delgado** del apply intake service (TASK-1367) y del publication contract (TASK-353). Es la puerta de entrada visible de candidatos al dominio `Hiring / ATS`, sin abrir un pipeline paralelo.

## Why This Task Exists

TASK-353 dejó la foundation + el payload público (`PublicOpeningPayload`) y TASK-1367 expone el apply service, pero **no existe ninguna superficie pública** donde un candidato descubra una vacante y postule. Sin esta UI, el ATS no tiene cara externa y 1360/1361 no reciben candidatos por el canal público. La UI se separa del backend (Full API Parity: la pantalla es cliente de commands/readers gobernados).

## Goal

- Renderizar listing + detalle público consumiendo SOLO el payload allowlist (nunca columnas internas).
- Entregar un apply form accesible (es-CL, links-only V1) que postee al service de TASK-1367 con confirmación genérica y segura.
- Diseñar el shell público sin sesión reusable para `/assessment/[token]` (TASK-1363).

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

- Consumir SOLO `PublicOpeningPayload` (allowlist); NUNCA leer columnas internas del opening.
- El apply postea a `submitPublicHiringApplication` (TASK-1367); la UI NO reconcilia Person/facet/application en el cliente.
- Copy 100% desde `src/lib/copy/careers.ts` (nuevo), es-CL tuteo neutro (validar con `greenhouse-ux-writing`); 0 literals en JSX.
- Tokens `theme.palette.*`/`theme.axis.*` + variantes tipográficas; sin HEX/px/`fontSize` inline. Marca Efeonce (logo + eslogan institucional), no la app.
- Confirmación + fallas **genéricas** (superficie pública hostil): nunca revelar dedupe/estado interno/existencia previa/PII.
- WCAG 2.2 AA; `scrollWidth==clientWidth` en desktop + 390px; `prefers-reduced-motion`.

## Normative Docs

- `docs/tasks/to-do/TASK-1367-careers-apply-intake-service.md` (el service que consume)
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

- `src/app/[lang]/careers/**` (rutas públicas)
- `src/views/greenhouse/careers/**`
- `src/components/greenhouse/careers/**` (VacancyCard, shell público reusable, apply form)
- `src/lib/copy/careers.ts` (copy es-CL)
- (consume, NO owns) `src/lib/hiring/publication.ts` (readers) + el endpoint de TASK-1367

## Current Repo State

### Already exists

- App Router + foundation UI compartida (`src/app`, `src/components/greenhouse`), patrones Vuexy/MUI para listados/cards/forms.
- Publication contract + readers públicos (TASK-353): `listPublicOpenings`, `getPublicOpeningByPublicId` → `PublicOpeningPayload`.
- `react-hook-form`, `GreenhouseDatePicker`, `CustomTextField`, `CustomChip` como primitives disponibles.
- `EfeonceSlogan` / marca Efeonce SSOT (`src/config/efeonce-brand.ts`).

### Gap

- No existe ninguna surface pública de careers (listing/detalle/apply).
- No existe el shell público sin sesión reusable.
- No existe `src/lib/copy/careers.ts`.

## UI/UX Contract

### Experience brief

- **Rigor:** `ui-standard`.
- Un candidato externo (sin sesión) **entiende por qué Efeonce** (employer brand + cómo es el proceso), descubre una vacante, la lee (competencias + proceso) y postula en < 2 min. Careers-as-funnel: **attract → convert → apply → nurture** — la página atrae talento, no es solo un listado. Marca sólida + confianza de datos (consentimiento claro), sin fricción, sin filtrar nada interno. Marca **Efeonce** institucional. Diseñar para una workforce multi-generacional (claro + accesible, no gimmick).

### Surface & system decision

- 4 nodos: **N0 attract** (hero + pilares de marca + stepper de proceso, en `/[lang]/careers`), **N1 listing** (mismo home), **N2 detalle** (`/[lang]/careers/[publicId]`), **N3 apply** (sección/step). N4 nurture (talent pool) = follow-up. Ver master flow EPIC-011.
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

Ver la tabla completa en el wireframe (§Implementation Mapping): VacancyCard = Card outlined + `CustomChip`; filtros = `CustomTextField`(+select); apply = `react-hook-form` + `CustomTextField` + checkbox consent; readers `listPublicOpenings`/`getPublicOpeningByPublicId`; command `submitPublicHiringApplication` (1367). Tokens AXIS; copy `src/lib/copy/careers.ts`.

### GVC scenario plan

- `careers-listing` (loaded/empty-zero/empty-filtered/error), `careers-detail` (detalle/404), `careers-apply` (idle→validando→enviando→success→rate-limited).
- GVC desktop 1440 + mobile 390 obligatorio (`ui-standard`); `scrollWidth==clientWidth`; consola limpia; reduced-motion; foco cross-surface correcto. Datos: opening publicado real sembrado en staging.

### Design decision log

- Marca Efeonce (no Greenhouse); links-only V1 (upload = 1362); confirmación genérica terminal; shell público reusable (DDL-2 master); filtrado client-side V1; locale-aware `hreflang`-ready. Detalle en wireframe + flow.

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

- Shell público sin sesión reusable (header/footer Efeonce) + ruta `/[lang]/careers`.
- **Attract (N0):** hero de employer brand + 3 pilares ("por qué Efeonce") + stepper "cómo es el proceso" (transparencia). NO es solo un listado — la página atrae talento (`greenhouse-talent-people-operator`).
- Listing de openings publicados (`listPublicOpenings`) con VacancyCard **skills-forward** (chips de competencias clave) + filtros client-side (búsqueda/área/modalidad, debounce 200–300ms, URL search params).
- Estados: loading (skeletons), empty-zero (+ CTA talent pool), empty-filtered, error. Copy `src/lib/copy/careers.ts`.

### Slice 2 — Detalle (N2)

- Ruta `/[lang]/careers/[publicId]` con detalle desde `getPublicOpeningByPublicId` (allowlist): descripción + **competencias clave** (chips, enlaza al assessment engine) + **cómo es el proceso** + **señal de compensación** ("se conversa en el proceso" si el payload no trae rango; si trae, mostrarlo — pay-transparency). Estado 404. CTA "Postular a esta vacante".

### Slice 3 — Apply form (N3) — forms-ux floor

- Form (`react-hook-form` o `useActionState`): Nombre/Apellido (fila pareada) · Correo · Teléfono (opcional) · Portafolio-link (opcional) · LinkedIn-link (opcional) · Disponibilidad (opcional) · Mensaje (opcional) · Consent · **Turnstile widget**. Postea a `POST /api/public/hiring/applications` (1367) con `captchaToken`.
- **Floor forms-ux (obligatorio):** single column, label sobre input, `autocomplete`+`inputmode` por campo (ver wireframe §Implementation Mapping), validación 3-stage (silencio→blur→fix-on-change→server-confirm), error inline 4-elementos (`aria-invalid`+`aria-describedby`+`role=alert`), submit **ENABLED** (validar al click, NO deshabilitar por consent), preservar datos en error, foco al primer error, NO autofocus, "(opcional)" en la minoría, paste tolerante (teléfono).
- Estados: idle/validando-inline/enviando/accepted-genérico/rate-limited/captcha-failed/validación/error. Confirmación genérica (nunca revela dedupe/estado/PII). Consent referencia el aviso de privacidad (Ley 21.719).

### Slice 4 — GVC + verificación visual

- Scenarios GVC (careers-home[attract+listing]/detalle/apply) desktop+mobile; loop hasta enterprise; `scrollWidth==clientWidth`; consola limpia; foco al 1er error. Registrar el shell público como patrón en `ui-platform/PATTERNS.md`.

### Slice 5 (follow-up) — Talent pool / nurture (N4)

- "Avísame de nuevas vacantes" (captura de email para talent pool). Requiere backend propio (no V1) — dejar el affordance en el empty-state y diferir el wiring. Documentar como follow-up si no entra en V1.

## Out of Scope

- El apply intake service (backend) — TASK-1367.
- Upload de archivo CV — TASK-1362 (V1 links-only).
- Assessment (envío/rendición) — TASK-1363; el apply no dispara el test.
- Desk interno — TASK-355.

## Detailed Spec

Implementar DESDE el wireframe + flow + master flow (son el contrato de diseño; no freehand). La UI es cliente delgado: readers de 353 + command de 1367. El shell público se diseña reusable para 1363. Copy productivo en `src/lib/copy/careers.ts` (es-CL). Marca Efeonce vía SSOT.

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

### Feature flags / cutover

- Sin flag propio de UI (la exposición pública del endpoint la gobierna TASK-1367). La ruta careers puede quedar noindex hasta sign-off de contenido/legal si se decide. Additive; revert por PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1-4 | revert PR (rutas/vistas additive) | <10 min | si |

### Production verification sequence

1. Deploy staging + sembrar un opening publicado real (via 355/353).
2. GVC careers-listing/detail/apply desktop+mobile mirados; `scrollWidth==clientWidth`; consola limpia.
3. Postular de punta a punta contra staging → verificar application creada (por el service 1367) + confirmación genérica.
4. Repetir en prod vía release pipeline.

### Out-of-band coordination required

- Contenido/legal del aviso de privacidad + versión de copy/consent (coordinar con 1367 que lo persiste).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] **Attract (N0)** presente: hero de employer brand + pilares "por qué Efeonce" + stepper "cómo es el proceso" — la página atrae, no solo lista.
- [ ] Listing/detalle consumen SOLO `PublicOpeningPayload`; 0 columnas internas; **skills-forward** (chips de competencias).
- [ ] Detalle muestra competencias + cómo es el proceso + **señal de compensación** (rango si el payload lo trae, si no "se conversa en el proceso").
- [ ] Apply postea a `POST /api/public/hiring/applications` (1367) con **`captchaToken` (Turnstile)**; 0 reconciliación en cliente.
- [ ] **Form floor forms-ux:** single column (Nombre/Apellido pareado), label sobre input, `autocomplete`+`inputmode` por campo, validación 3-stage, error inline 4-elementos, submit **ENABLED** (no disabled-por-consent), preservar datos en error, foco al 1er error, no autofocus, "(opcional)" en la minoría, paste tolerante.
- [ ] Los 10 estados del State Copy existen (incluye vacío+talent-pool, 404, rate-limited, captcha-failed, validación con error-copy por campo, error genérico).
- [ ] Confirmación + fallas genéricas (no filtran dedupe/estado/PII).
- [ ] Copy 100% desde `src/lib/copy/careers.ts` es-CL; 0 literals; consent referencia el aviso de privacidad (Ley 21.719); marca Efeonce (no Greenhouse).
- [ ] NUNCA se piden documentos de identidad ni datos proxy de clase protegida (edad/género/foto) en el apply público (fairness).
- [ ] a11y WCAG 2.2 AA (labels reales, consent accesible, focus cross-surface + 1er error, reflow 320/200%, reduced-motion).
- [ ] GVC desktop+mobile mirado; `scrollWidth==clientWidth`; consola limpia.
- [ ] Shell público documentado como patrón reusable (para 1363).
- [ ] `UI ready: yes` solo cuando lo anterior + `pnpm task:lint --task TASK-354` sin findings.

## Verification

- `pnpm ui:wireframe-check --task TASK-354`
- `pnpm ui:flow-check --task TASK-354`
- `pnpm local:check:ui`
- `pnpm fe:capture` (GVC desktop+mobile, frames mirados)
- `pnpm task:lint --task TASK-354`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `## Delta` en el master flow si cambia un nodo/regla
- [ ] doc funcional (`docs/documentation/`) + manual (`docs/manual-de-uso/`) si aplica
- [ ] `ui-platform/PATTERNS.md` con el shell público reusable

## Follow-ups

- `TASK-1362` doc capture → upload de CV como archivo (V2 del apply).
- `TASK-1363` reusa el shell público para `/assessment/[token]`.
- Endpoint de búsqueda dedicado si crece el volumen de vacantes.
- "Avísame de nuevas vacantes" (talent pool) como follow-up de engagement.

## Open Questions

- ¿La ruta careers arranca noindex hasta sign-off de contenido/legal, o indexable desde V1? Decidir con el operador.
- ¿Filtros de discovery V1 = área + modalidad, o algo más? Confirmar contra el payload real de `PublicOpeningPayload`.
