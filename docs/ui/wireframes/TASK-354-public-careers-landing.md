# TASK-354 — Public Careers Landing Wireframe

## Meta

- Task: `TASK-354`
- Superficie: Careers pública (sin sesión) — listing + detalle + apply form
- Nodos del master flow: N1 (listing) · N2 (detalle) · N3 (apply form) — ver `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md`
- UI rigor: `ui-standard`
- Route group: público (sin auth), locale-aware `[lang]`
- Marca: **Efeonce** (institucional/externo — es careers público, no la app Greenhouse). Logo Efeonce, no Greenhouse.
- Estado: `draft` (UI ready: no — falta loop GVC con la ruta real)
- Product-design skills a componer al implementar: `info-architecture` (lead), `state-design`, `forms-ux`, `greenhouse-ux-writing`, `modern-ui`, `a11y-architect`

## Brief

La cara pública del ATS: una persona externa descubre vacantes de Efeonce, lee el detalle de una, y postula. Es la **puerta de entrada de candidatos** al dominio Hiring (sin ella, 1360/1361 no tienen a quién evaluar). Objetivo: que postular sea claro, rápido y confiable (marca sólida + seguridad de datos visible), sin filtrar nada interno. V1 = **links-only** (portafolio como enlace; el upload de archivo es TASK-1362). El apply NO dispara el test — el test se envía después desde el desk.

## Layout Skeleton

### Surface A — Listing (`/[lang]/careers`)

```
┌───────────────────────────────────────────────────────────┐
│  [Efeonce logo]                              (es-CL)        │  header institucional
├───────────────────────────────────────────────────────────┤
│  H1: Únete a Efeonce                                        │  hero (Poppins h1)
│  Subtítulo: construimos crecimiento para marcas…           │
│  [buscar por texto]  [filtro: área ▾]  [filtro: modalidad ▾]│  filtros (discovery básico)
├───────────────────────────────────────────────────────────┤
│  ┌─ VacancyCard ────────────────────────────────────────┐ │
│  │ Título del rol            · [chip modalidad]          │ │  card por opening publicado
│  │ Área · ubicación/remoto · seniority                   │ │
│  │ resumen 1-2 líneas                    [Ver y postular →]│ │
│  └──────────────────────────────────────────────────────┘ │
│  … N cards …                                               │
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
│  ─────────────────────────────────────────────────────────│
│  [ Postular a esta vacante ]  (CTA primario, ancla al form)│
└───────────────────────────────────────────────────────────┘
```

### Surface C — Apply form (mismo detalle, sección/step o `/apply`)

```
┌───────────────────────────────────────────────────────────┐
│  Postular a: {Título del rol}                              │
│  Nombre*        [___________]   Apellido*   [___________]  │
│  Email*         [___________]   Teléfono    [___________]  │
│  Portafolio (enlace)  [https://__________]                 │  V1 links-only (upload = 1362)
│  LinkedIn (enlace)    [https://__________]                 │
│  Disponibilidad ▾     Mensaje (opcional) [__________]      │
│  ☐ Acepto el tratamiento de mis datos (consentimiento)*    │  copy/legal versionado
│     [ver aviso de privacidad]                              │
│                              [ Enviar postulación ]        │
└───────────────────────────────────────────────────────────┘
```

## Copy Ledger

Todo el copy visible vive en `src/lib/copy/` (dominio nuevo `careers.ts`), es-CL tuteo neutro, validado con `greenhouse-ux-writing`. NUNCA literals en JSX.

| id (propuesto) | Texto es-CL | Dónde |
|---|---|---|
| `careers.hero.title` | Únete a Efeonce | Listing hero |
| `careers.hero.subtitle` | Construimos crecimiento para marcas que quieren crecer en serio. | Listing hero |
| `careers.filters.search` | Buscar un rol… | Filtro |
| `careers.card.cta` | Ver y postular | VacancyCard |
| `careers.detail.apply_cta` | Postular a esta vacante | Detalle |
| `careers.form.title` | Postular a: {role} | Apply |
| `careers.form.consent` | Acepto que Efeonce trate mis datos para este proceso de selección. | Consent |
| `careers.form.submit` | Enviar postulación | Apply |
| `careers.form.success` | ¡Gracias! Recibimos tu postulación. Si tu perfil avanza, te contactamos. | Confirmación genérica |

## State Copy (los estados que separan producción de mockup)

| Estado | Superficie | Qué muestra |
|---|---|---|
| **loading** | Listing | Skeletons de cards (no spinner de página) |
| **empty (zero)** | Listing | "Ahora mismo no tenemos vacantes abiertas. Vuelve pronto." + (opcional) CTA "Avísame" (follow-up) |
| **empty (filtrado)** | Listing | "No hay roles para esta búsqueda." + "Limpiar filtros" |
| **404** | Detalle | "Esta vacante ya no está disponible." + "Ver vacantes abiertas" |
| **enviando** | Apply | Botón en loading, campos readonly, sin doble submit |
| **success** | Apply | Confirmación **genérica** (`careers.form.success`) — NUNCA revela dedupe, si ya existía la persona, ni estado interno |
| **rate-limited** | Apply | "Estás enviando demasiadas veces. Intenta en unos minutos." (429 genérico) |
| **error (validación)** | Apply | Errores inline por campo (email inválido, requerido, URL inválida) — es-CL, seguros |
| **error (servidor)** | Apply | "No pudimos enviar tu postulación. Intenta de nuevo." (sin detalle técnico) |

## Accessibility Contract (WCAG 2.2 AA)

- Semántica: `<main>`, `<nav>`, cards como `<article>`, form con `<label for>` reales (nunca placeholder-como-label).
- Focus visible ≥2px, 3:1; orden de tab = orden visual; skip-link al `<main>`.
- Consent como checkbox nativo, requerido, con error anunciado (`aria-invalid` + `aria-describedby`).
- Target táctil ≥24px (preferir 44). Reflow 320px / 200% zoom. `prefers-reduced-motion` respetado.
- Errores de form: `role="alert"` en el resumen bloqueante; inline con `aria-describedby`.
- Contraste AA en marca Efeonce (verificar chips de modalidad/área sobre fondos).

## Implementation Mapping

| Región UI | Componente (lookup: Greenhouse primitive → Vuexy `Custom*` → MUI) | Reader/Command | Tokens |
|---|---|---|---|
| Header/footer institucional | shell público reusable (nuevo, `src/components/greenhouse/careers/`) + `EfeonceSlogan` | — | `theme.palette.*`, marca Efeonce SSOT |
| VacancyCard | Card outlined (`elevation={0}` + `border: divider`) + `CustomChip` modalidad | `listPublicOpenings()` | role colors / semantic |
| Filtros | `CustomTextField` (búsqueda, debounced) + `CustomTextField select` (área/modalidad) | client-side sobre el payload | — |
| Detalle | prosa del `PublicOpeningPayload` (allowlist) | `getPublicOpeningByPublicId` | h1 Poppins, body Geist |
| Apply form | `react-hook-form` + `CustomTextField` + `GreenhouseDatePicker` (disponibilidad si aplica) + checkbox consent | `submitPublicHiringApplication` (**TASK-1367**) | — |
| CTA primario | `<Button>` MUI o shiny según dirección (no Nexa) | ancla/POST | `theme.palette.primary` |

**Contrato de datos:** la UI consume SOLO `PublicOpeningPayload` (nunca columnas internas del opening) y postea al service de TASK-1367. Ver `docs/ui/flows/TASK-354-public-careers-landing-flow.md`.

## GVC Scenario Plan

`ui-standard` → GVC desktop (1440) + mobile (390) obligatorio al implementar. Scenarios:

1. `careers-listing` — lista con N vacantes + estado vacío (sin vacantes) + filtrado-vacío.
2. `careers-detail` — detalle de una vacante publicada + 404.
3. `careers-apply` — form idle → validación inline → enviando → confirmación genérica → rate-limited.
- Verificar `scrollWidth==clientWidth` en 1440 + 390; consola limpia; reduced-motion.
- Datos: sembrar un opening publicado real (via 353/355) contra staging.

## Design Decision Log

- **Marca Efeonce, no Greenhouse:** careers es institucional/externo → logo + eslogan Efeonce (SSOT `src/config/efeonce-brand.ts`), no la marca de la app.
- **Links-only en V1:** portafolio/LinkedIn como enlace; el upload de archivo (CV) es TASK-1362 (necesita quarantine/scan). Evita colisión de ownership de assets.
- **Confirmación genérica siempre:** nunca revelar dedupe/estado interno/existencia previa — es superficie hostil (pública). Seguridad > feedback rico.
- **Shell público reusable:** el layout sin-sesión se diseña para que 1363 (`/assessment/[token]`) lo reuse (DDL-2 del master flow).
- **El apply no dispara el test:** el test se asigna después desde el desk (evita spam de assessments).

## Acceptance Checklist

- [ ] Listing/detalle consumen SOLO `PublicOpeningPayload` (allowlist); 0 columnas internas.
- [ ] Apply postea a `submitPublicHiringApplication` (TASK-1367); no reimplementa reconciliación en el cliente.
- [ ] Los 9 estados del State Copy existen (incluye vacío, 404, rate-limited, validación, error genérico).
- [ ] Confirmación genérica — no filtra dedupe/estado/PII.
- [ ] Copy 100% desde `src/lib/copy/careers.ts` es-CL; 0 literals en JSX.
- [ ] a11y: labels reales, focus, consent accesible, reflow 320/200%, reduced-motion.
- [ ] GVC desktop+mobile mirado; `scrollWidth==clientWidth`; consola limpia.
- [ ] Marca Efeonce (no Greenhouse) en header/footer.
- [ ] `UI ready: yes` solo cuando lo anterior + `pnpm task:lint --task TASK-354` sin findings.
