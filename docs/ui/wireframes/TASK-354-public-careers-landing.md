# TASK-354 — Public Careers Landing Wireframe

## Meta

- Task: `TASK-354`
- Superficie: Careers pública (sin sesión) — **attract** (employer brand) + listing + detalle + apply form
- Nodos del master flow: N0 (attract/hero+brand) · N1 (listing) · N2 (detalle) · N3 (apply form) — ver `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md`
- UI rigor: `ui-standard`
- Route group: público (sin auth), locale-aware `[lang]`
- Marca: **Efeonce** (institucional/externo — es careers público, no la app Greenhouse). Logo Efeonce, no Greenhouse.
- Estado: `draft` (UI ready: no — falta loop GVC con la ruta real)
- Skills revisadas: `greenhouse-talent-people-operator` (candidate experience + fairness) · `forms-ux` (apply floor) · `greenhouse-ux-writing` (copy es-CL) · `greenhouse-ux` · `state-design` · `a11y-architect`

## Brief

La cara pública del ATS: no un listado de vacantes, sino una **experiencia de atracción de talento**. Una persona externa (1) entiende por qué querría trabajar en Efeonce (employer brand), (2) descubre vacantes, (3) lee el detalle con las competencias y cómo es el proceso, y (4) postula. Es la **puerta de entrada de candidatos** (sin ella, 1360/1361 no tienen a quién evaluar). Careers-as-funnel: **attract → convert → apply → nurture**. V1 = **links-only** (portafolio como enlace; el upload de archivo es TASK-1362). El apply NO dispara el test — el test se asigna después desde el desk.

## Layout Skeleton

### Surface A — Careers home (`/[lang]/careers`) = Attract (N0) + Listing (N1)

```
┌───────────────────────────────────────────────────────────┐
│  [Efeonce logo]                              (es-CL)        │  header institucional
├───────────────────────────────────────────────────────────┤
│  H1: Crece con Efeonce                                      │  hero attract (Poppins h1)
│  Subtítulo: construimos crecimiento para marcas… y para     │
│  las personas que lo hacen posible.       [Ver vacantes ↓]  │
├───────────────────────────────────────────────────────────┤
│  ¿Por qué Efeonce?  (3 pilares de employer brand)          │  N0 attract
│  [Crecimiento real] [Trabajo con impacto] [Equipo + remoto]│  cards/íconos, no stock
├───────────────────────────────────────────────────────────┤
│  Cómo es nuestro proceso  (transparencia — reduce ansiedad)│  N0 attract
│  Postulas → Conversamos → Evaluación por competencias →    │  stepper horizontal
│  Decisión                                                   │
├───────────────────────────────────────────────────────────┤
│  Vacantes abiertas          [buscar]  [área ▾] [modalidad ▾]│  N1 listing + filtros
│  ┌─ VacancyCard ────────────────────────────────────────┐ │
│  │ Título del rol            · [chip modalidad]          │ │  card por opening publicado
│  │ Área · ubicación/remoto · seniority                   │ │
│  │ resumen 1-2 líneas · [chips de skills clave]          │ │  skills-forward
│  │                                       [Ver y postular →]│ │
│  └──────────────────────────────────────────────────────┘ │
│  … N cards …                                               │
├───────────────────────────────────────────────────────────┤
│  ¿No ves tu rol? Déjanos tu correo y te avisamos.  [Avísame]│  N4 nurture (talent pool, follow-up)
├───────────────────────────────────────────────────────────┤
│  © {año} · Efeonce — eslogan institucional (footer)        │
└───────────────────────────────────────────────────────────┘
```

### Surface B — Detalle (`/[lang]/careers/[publicId]`)

```
┌───────────────────────────────────────────────────────────┐
│  [Efeonce logo]                    [← Volver a vacantes]    │
├───────────────────────────────────────────────────────────┤
│  H1: Título del rol      [chip modalidad] [chip área]      │
│  ubicación/remoto · seniority · jornada                    │
│  ─────────────────────────────────────────────────────────│
│  Descripción del rol (payload allowlist, prosa)            │
│  Responsabilidades · Requisitos · Qué ofrecemos            │
│  Competencias clave: [chips de skills]                     │  skills-forward (enlaza assessment)
│  Cómo es el proceso: postulas → conversamos → evaluación → │  transparencia (set expectations)
│    decisión                                                 │
│  Compensación: se conversa en el proceso *(si el payload   │  pay-transparency signal V1
│    no trae rango; si trae, mostrarlo)*                     │
│  ─────────────────────────────────────────────────────────│
│  [ Postular a esta vacante ]  (CTA primario, ancla al form)│
└───────────────────────────────────────────────────────────┘
```

### Surface C — Apply form (mismo detalle, sección/step o `/apply`)

```
┌───────────────────────────────────────────────────────────┐
│  Postular a: {Título del rol}                              │
│  Los campos marcados (opcional) no son obligatorios.       │  convención: marca la minoría
│  Nombre        [___________]   Apellido    [___________]  │  fila pareada (given/family-name)
│  Correo electrónico  [___________]                         │
│  Teléfono (opcional) [___________]  (paste tolerante)      │
│  Portafolio (opcional, enlace)  [https://__________]       │  V1 links-only (upload = 1362)
│  LinkedIn (opcional, enlace)    [https://__________]       │
│  Disponibilidad (opcional) ▾   Mensaje (opcional) [______] │
│  ☐ Acepto que Efeonce trate mis datos para este proceso   │  consent (Ley 21.719)
│     de selección. [Ver aviso de privacidad]                │
│  [ Turnstile widget ]                                      │  captcha (backend exige captchaToken)
│                              [ Enviar postulación ]        │  ENABLED (no disabled); valida al click
└───────────────────────────────────────────────────────────┘
```

## Copy Ledger

Todo el copy visible vive en `src/lib/copy/` (dominio nuevo `careers.ts`), es-CL tuteo neutro, sentence case, gender-inclusive, validado con `greenhouse-ux-writing`. NUNCA literals en JSX.

| id (propuesto) | Texto es-CL | Dónde |
|---|---|---|
| `careers.hero.title` | Crece con Efeonce | Hero |
| `careers.hero.subtitle` | Construimos crecimiento para marcas — y para las personas que lo hacen posible. | Hero |
| `careers.hero.cta` | Ver vacantes | Hero |
| `careers.brand.title` | ¿Por qué Efeonce? | Attract |
| `careers.brand.pillar1` | Crecimiento real: proyectos que mueven la aguja de marcas que crecen en serio. | Attract |
| `careers.brand.pillar2` | Trabajo con impacto: tu trabajo se ve, se mide y se nota. | Attract |
| `careers.brand.pillar3` | Equipo + flexibilidad: talento en Chile y el mundo, con foco en resultados. | Attract |
| `careers.process.title` | Cómo es nuestro proceso | Attract/detalle |
| `careers.process.steps` | Postulas · Conversamos · Evaluación por competencias · Decisión | Attract/detalle |
| `careers.list.title` | Vacantes abiertas | Listing |
| `careers.filters.search` | Buscar un rol… | Filtro |
| `careers.card.cta` | Ver y postular | VacancyCard |
| `careers.detail.comp` | La compensación se conversa durante el proceso. | Detalle (si no hay rango) |
| `careers.detail.apply_cta` | Postular a esta vacante | Detalle |
| `careers.form.title` | Postular a: {role} | Apply |
| `careers.form.optional_hint` | Los campos marcados (opcional) no son obligatorios. | Apply |
| `careers.form.label.firstName` | Nombre | Apply |
| `careers.form.label.lastName` | Apellido | Apply |
| `careers.form.label.email` | Correo electrónico | Apply |
| `careers.form.label.phone` | Teléfono (opcional) | Apply |
| `careers.form.label.portfolio` | Portafolio (opcional) | Apply |
| `careers.form.label.linkedin` | LinkedIn (opcional) | Apply |
| `careers.form.consent` | Acepto que Efeonce trate mis datos para este proceso de selección, conforme al aviso de privacidad. | Consent |
| `careers.form.consent_link` | Ver aviso de privacidad | Consent |
| `careers.form.submit` | Enviar postulación | Apply |
| `careers.form.submitting` | Enviando… | Apply (loading) |
| `careers.form.success` | ¡Gracias! Recibimos tu postulación. Si tu perfil avanza, te contactamos. | Confirmación genérica |
| `careers.pool.prompt` | ¿No ves tu rol? Déjanos tu correo y te avisamos cuando abramos algo para ti. | Talent pool |
| `careers.pool.cta` | Avísame | Talent pool |

## State Copy (los estados que separan producción de mockup)

| Estado | Superficie | Qué muestra |
|---|---|---|
| **loading** | Listing | Skeletons de cards (no spinner de página) |
| **empty (zero)** | Listing | "Ahora mismo no tenemos vacantes abiertas." + CTA talent pool "Avísame" |
| **empty (filtrado)** | Listing | "No hay roles para esta búsqueda." + "Limpiar filtros" |
| **404** | Detalle | "Esta vacante ya no está disponible." + "Ver vacantes abiertas" |
| **enviando** | Apply | Botón "Enviando…" + spinner, campos readonly, sin doble submit |
| **success** | Apply | Confirmación **genérica** (`careers.form.success`) — NUNCA revela dedupe, si ya existía la persona, ni estado interno |
| **rate-limited** | Apply | "Estás enviando demasiadas veces. Intenta de nuevo en unos minutos." (429 genérico) |
| **captcha-failed** | Apply | "No pudimos verificar que no eres un robot. Recarga la página e intenta de nuevo." |
| **error (validación)** | Apply | Errores inline por campo — "qué pasó + cómo se arregla" (ver Error Copy) |
| **error (servidor)** | Apply | "No pudimos enviar tu postulación. Intenta de nuevo." (sin detalle técnico) |

### Error Copy por campo (forms-ux: "qué pasó + cómo se arregla")

| Campo | Error es-CL |
|---|---|
| Nombre/Apellido | "Ingresa tu {nombre/apellido} para continuar." |
| Correo | "Tu correo necesita un @. Prueba `nombre@empresa.com`." |
| Portafolio/LinkedIn | "El enlace debe empezar con `https://`." |
| Consent | "Necesitamos tu consentimiento para procesar tu postulación." |

## Accessibility Contract (WCAG 2.2 AA)

- Semántica: `<main>`, `<nav>`, cards como `<article>`, form con `<label for>` reales (nunca placeholder-como-label).
- Focus visible ≥2px, 3:1; orden de tab = orden visual; skip-link al `<main>`. **NO autofocus** (el form está dentro de la página, no ES la página — forms-ux).
- Consent como checkbox nativo, requerido, con error anunciado (`aria-invalid` + `aria-describedby` + `role="alert"`).
- **Foco al primer error** tras fallo de validación (server o click) + anuncio `aria-live`.
- Target táctil ≥24px (preferir 44), esp. checkboxes/radios. Reflow 320px / 200% zoom. `prefers-reduced-motion` respetado.
- Contraste AA en marca Efeonce (verificar chips de modalidad/área/skills sobre fondos).

## Implementation Mapping

| Región UI | Componente (lookup: Greenhouse primitive → Vuexy `Custom*` → MUI) | Reader/Command | Tokens |
|---|---|---|---|
| Header/footer institucional | shell público reusable (nuevo, `src/components/greenhouse/careers/`) + `EfeonceSlogan` | — | marca Efeonce SSOT |
| Hero + brand pillars + process stepper (N0) | secciones estáticas (contenido de marca) | — (copy `careers.ts`) | h1 Poppins, body Geist |
| VacancyCard | Card outlined (`elevation={0}` + `border`) + `CustomChip` modalidad + chips skills | `listPublicOpenings()` | role colors / semantic |
| Filtros | `CustomTextField` (búsqueda, debounced 200–300ms) + `CustomTextField select` (área/modalidad); URL search params | client-side sobre el payload | — |
| Detalle | prosa del `PublicOpeningPayload` (allowlist) + chips skills + stepper proceso + comp signal | `getPublicOpeningByPublicId` | h1 Poppins |
| Apply form | `react-hook-form` (o `useActionState`) + `CustomTextField` + checkbox consent + **Turnstile widget** | `POST /api/public/hiring/applications` (**TASK-1367**) | — |
| Talent pool (N4) | input email + CTA (follow-up backend) | follow-up | — |

**Contrato de campos del form (forms-ux — autocomplete + inputmode obligatorios):**

| Campo | type | autocomplete | inputmode | Requerido | Validación |
|---|---|---|---|---|---|
| Nombre | text | `given-name` | — | sí | no vacío |
| Apellido | text | `family-name` | — | sí | no vacío |
| Correo | email | `email` | `email` | sí | regex + normaliza lowercase |
| Teléfono | tel | `tel` | `tel` | no | paste tolerante (normaliza) |
| Portafolio | url | `url` | `url` | no | `https://` browser-safe |
| LinkedIn | url | `url` | `url` | no | `https://` browser-safe |
| Disponibilidad | select | — | — | no | enum |
| Mensaje | textarea | — | — | no | ≤ límite |
| Consent | checkbox | — | — | sí | debe estar marcado (valida al click, NO deshabilita el submit) |
| captchaToken | (Turnstile) | — | — | sí | provisto por el widget |

**Validación (forms-ux 3-stage):** silencio mientras escribe (campo intacto) → `onBlur` (formato/requerido) → `onChange` si el campo ya erró (confirma el fix) → server-confirm al enviar. Preservar TODO lo tipeado en error (nunca limpiar el form). Submit siempre ENABLED (validar al click, foco al primer error).

**Contrato de datos:** la UI consume SOLO `PublicOpeningPayload` (nunca columnas internas del opening) y postea al service de TASK-1367 (que exige `captchaToken`). Ver `docs/ui/flows/TASK-354-public-careers-landing-flow.md`.

## GVC Scenario Plan

`ui-standard` → GVC desktop (1440) + mobile (390) obligatorio al implementar. Scenarios:

1. `careers-home` — attract (hero + pilares + proceso) + listing con N vacantes + estado vacío (con talent-pool CTA) + filtrado-vacío.
2. `careers-detail` — detalle con skills + proceso + comp signal + 404.
3. `careers-apply` — form idle → validación inline → captcha → enviando → confirmación genérica → rate-limited → captcha-failed.
- Verificar `scrollWidth==clientWidth` en 1440 + 390; consola limpia; reduced-motion; foco al primer error.
- Datos: sembrar un opening publicado real (via 353/355) contra staging.

## Design Decision Log

- **Careers-as-funnel, no listado:** attract (employer brand + proceso) + convert (listing/detalle skills-forward) + apply + nurture (talent pool). Razón: una careers 2026 atrae, no solo lista (`greenhouse-talent-people-operator`).
- **Transparencia del proceso** en attract + detalle: reduce ansiedad del candidato y es defendible (proceso estructurado por competencias, ligado al assessment engine).
- **Pay-transparency signal V1:** si el payload no trae rango, decir "se conversa en el proceso"; si trae, mostrarlo (Directiva UE jun-2026 + tendencia).
- **Marca Efeonce, no Greenhouse:** careers es institucional/externo → logo + eslogan Efeonce (SSOT `src/config/efeonce-brand.ts`).
- **Links-only en V1:** portafolio/LinkedIn como enlace; el upload de archivo (CV) es TASK-1362. **NUNCA** documentos de identidad en el apply público (fairness/privacidad — `greenhouse-talent-people-operator`).
- **Submit siempre enabled (forms-ux):** no deshabilitar por consent; validar al click y mostrar el error del consent — deshabilitar esconde el "por qué".
- **autocomplete + inputmode por campo (forms-ux):** password managers/autofill funcionan; menos fricción.
- **Confirmación genérica siempre:** no revelar dedupe/estado interno/existencia previa — superficie pública hostil. Seguridad > feedback rico.
- **Shell público reusable:** el layout sin-sesión se diseña para que 1363 (`/assessment/[token]`) lo reuse (DDL-2 del master flow).
- **El apply no dispara el test:** el test se asigna después desde el desk (evita spam de assessments).

## Acceptance Checklist

- [ ] Attract (hero + pilares de marca + proceso) presente — la página atrae, no solo lista.
- [ ] Listing/detalle consumen SOLO `PublicOpeningPayload` (allowlist); 0 columnas internas; skills-forward.
- [ ] Detalle muestra competencias + cómo es el proceso + señal de compensación.
- [ ] Apply postea a `POST /api/public/hiring/applications` (TASK-1367) con `captchaToken` (Turnstile).
- [ ] **Form floor forms-ux:** single column (name/apellido pareado), label sobre input, `autocomplete`+`inputmode` por campo, validación 3-stage, error inline 4-elementos, submit ENABLED (no disabled-por-consent), paste tolerante, foco al 1er error, no autofocus, "(opcional)" en la minoría.
- [ ] Los 10 estados del State Copy existen (incluye vacío+talent-pool, 404, rate-limited, captcha-failed, validación, error).
- [ ] Confirmación genérica — no filtra dedupe/estado/PII.
- [ ] Copy 100% desde `src/lib/copy/careers.ts` es-CL; 0 literals; consent referencia aviso de privacidad (Ley 21.719).
- [ ] a11y: labels reales, focus+1er-error, consent accesible, reflow 320/200%, reduced-motion.
- [ ] GVC desktop+mobile mirado; `scrollWidth==clientWidth`; consola limpia.
- [ ] Marca Efeonce (no Greenhouse) en header/footer.
- [ ] `UI ready: yes` solo cuando lo anterior + `pnpm task:lint --task TASK-354` sin findings.
