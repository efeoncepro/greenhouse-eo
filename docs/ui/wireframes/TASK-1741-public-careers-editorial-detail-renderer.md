# TASK-1741 — Public Careers Editorial Detail Renderer

## Meta

- Product Design asset: `docs/ui/visual-directions/TASK-1741-public-careers-editorial-detail-renderer.md`
- Visual direction mode: `repo-native-benchmark`

## Visual Direction Contract

- Source: `repo-native-benchmark` — renderer actual de Careers, tokens/primitives vigentes y captura staging `.captures/2026-08-17T12-25-12_task354-careers-runtime-audit/`.
- Targets: desktop `1440×1200` y mobile `390×844`.
- Audience and decision: una persona profesional evalúa si el trabajo es concreto, remoto viable y relevante antes de ir al formulario existente.
- Action hierarchy: CTA verde del hero existente (primario) → CTA azul del resumen existente (refuerzo desktop/scroll) → ningún CTA adicional.
- Visual fidelity mapping: navy/verde/magenta y tokenización de Careers existentes; jerarquía editorial, espacios y composición son una extensión de la surface, no un rediseño de marca.
- Performance posture: sin stock, vídeo, canvas, WebGL, Lottie, nuevas fuentes ni dependencia visual pesada.

### Alternatives considered

| Dirección | Lectura | Decisión |
|---|---|---|
| Editorial dossier | El rol es un documento vivo: promesa/facts → outcomes → trabajo → encaje → beneficios/proceso; rail estable | Seleccionada |
| Data-dense marketplace | Ficha con muchas filas, chips y cards equivalentes | Rechazada: parece job board intercambiable y aplana la oportunidad |
| Cinematic agency | Imágenes grandes, motion y manifiesto de marca | Rechazada: peso/fragilidad altos y el rol queda en segundo plano |

## Desktop Target — 1440×1200

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ breadcrumb / Careers                                                         │
│                                                                              │
│ SENIOR VISUAL DESIGNER                         [ REMOTE ] [ FULL-TIME ]      │
│ Diseña trabajo que permite que el siguiente equipo no parta de cero.         │
│ Área · modalidad · región elegible · seniority                              │
│                                                                              │
│ [ Enviar postulación ]  ← CTA EXISTENTE, verde; no añadir otro              │
└──────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────┬──────────────────────────────────┐
│ PROMESA / MISIÓN                           │ RESUMEN (sticky desktop)         │
│ Una introducción factual, 2–4 líneas       │ Área · modalidad · ubicación       │
│                                           │ Seniority · tipo de empleo         │
│ CÓMO SE VE UN BUEN PRIMER AÑO              │ [ Enviar postulación ]             │
│ Outcome 01          Outcome 02             │ CTA AZUL EXISTENTE                  │
│ Outcome 03                                  │                                  │
│                                           │                                  │
│ EL TRABAJO                                 │                                  │
│ Artefactos, entregables y colaboración     │                                  │
│ con ritmo editorial; no un muro de cards   │                                  │
│                                           │                                  │
│ LO ESENCIAL / APRENDIBLE                   │                                  │
│ Evidencia, skills, portfolio               │                                  │
│                                           │                                  │
│ TRABAJO REMOTO                             │                                  │
│ Países, huso/solapamiento, idioma y        │                                  │
│ modalidad sólo cuando estén aprobados      │                                  │
│                                           │                                  │
│ ── BENEFICIOS ─────────────────────────── │                                  │
│ Banda tipográfica, no mosaico de cards     │                                  │
│                                           │                                  │
│ PROCESO                                    │                                  │
│ Etapas reales, sin CTA de cierre           │                                  │
└───────────────────────────────────────────┴──────────────────────────────────┘
```

## Mobile Target — 390×844

```text
┌──────────────────────────────────────┐
│ Careers                               │
│ SENIOR VISUAL DESIGNER                │
│ Promesa en 2–4 líneas                 │
│ [ REMOTE ] [ FULL-TIME ]              │
│ [ Enviar postulación ] ← existente    │
├──────────────────────────────────────┤
│ facts compactos                       │
│ PROMESA / MISIÓN                      │
│ CÓMO SE VE UN BUEN PRIMER AÑO          │
│ EL TRABAJO                            │
│ LO ESENCIAL / APRENDIBLE               │
│ TRABAJO REMOTO                        │
│ BENEFICIOS                             │
│ PROCESO                                │
│ summary + CTA azul existente           │
│ (no se agrega CTA nuevo)               │
└──────────────────────────────────────┘
```

## Action Hierarchy

1. CTA verde del hero existente: acción primaria temprana, especialmente en móvil.
2. CTA azul del resumen existente: refuerzo contextual en rail desktop y al final en móvil.
3. `Volver a vacantes`: navegación secundaria. No existe un CTA final ni un tercer enlace hacia apply.

## Visual Fidelity Mapping

- Hero navy y acento verde preservan la identidad actual; no se cambia la marca ni la paleta.
- Poppins mantiene título/display y Geist el cuerpo mediante variables existentes.
- Outcomes usan ritmo editorial y numeración, no cards repetidas.
- Benefits usa una banda tipográfica; rail conserva superficie contenida y el cuerpo permanece abierto.
- En 390 px el grid se transforma en flujo lineal sin alterar el orden semántico.

## Copy Ledger

| id | región | fuente |
|---|---|---|
| `detail.outcomesTitle` | resultados | `src/lib/copy/*` |
| `detail.workTitle` | trabajo | `src/lib/copy/*` |
| `detail.essentialsTitle` | esenciales | `src/lib/copy/*` |
| `detail.learnablesTitle` | aprendible | `src/lib/copy/*` |
| `detail.evidenceTitle` | evidencia | `src/lib/copy/*` |
| `detail.remoteTitle` | remoto | `src/lib/copy/*` |
| `detail.eligibleCountriesTitle` | países | `src/lib/copy/*` |
| `detail.compensationTitle` | compensación | `src/lib/copy/*` |
| `detail.benefitsTitle` | beneficios | `src/lib/copy/*` |
| `detail.processTitle` | proceso | `src/lib/copy/*` |

## State Copy

| state | visible copy | recovery behavior |
|---|---|---|
| ready | título, promesa y secciones aprobadas de la vacante | continuar a uno de los dos CTA existentes |
| loading | sin copy nuevo: el detalle es SSR y el navegador conserva la navegación | reintentar la carga normal de la página si falla la red |
| empty | se omite únicamente la sección sin datos; nunca aparece una banda vacía | leer las demás secciones disponibles |
| partial | contenido estructurado disponible más prosa legacy de fallback | continuar con toda la evidencia pública disponible |
| error | estado `notFound` público existente, sin causa interna | volver al listado de vacantes |
| denied | mismo `notFound` público para opening no publicado; sin filtrar existencia | volver al listado de vacantes |

## Accessibility Contract

- Un `h1`; títulos de sección `h2`; outcomes, trabajo, skills, beneficios y proceso son listas semánticas.
- Orden DOM hero → contenido → resumen; el grid no cambia el orden de foco.
- Ambos CTA tienen nombre accesible, foco visible y el mismo `applyHref`.
- Esencial/aprendible no se diferencia sólo por color; contraste AA y sin dependencia de motion.
- En 390 px no hay scroll horizontal; reduced motion conserva el mismo estado final.

## Implementation Mapping

- Route: `src/app/public/careers/[publicId]/page.tsx`.
- Surface: `src/components/greenhouse/careers/CareersDetailView.tsx` and `careers.module.css`.
- Data: `src/lib/hiring/public-careers/view-model.ts` consuming the allowlist-safe structured payload from TASK-1740.
- Reuse: existing hero, tags, links/buttons and summary rail. Extend the local section composition only; no global primitive or client fetch.
- Content order: title/promise/facts → outcomes → work → essentials/evidence → remote model → benefits → process. Missing structured blocks fall back to compatible legacy copy/list sections.
- CTA constraint: keep two existing `applyUrl` links exactly. The hero remains the early mobile action; the rail remains a desktop reinforcement and mobile terminal summary. No final CTA.
- Token mapping: decide exact token names from `DESIGN.md` and Careers CSS during implementation. Do not introduce raw hex/font/spacing literals or a new palette.
- Motion: none beyond existing CSS state affordances; `Motion: none` remains correct.

## GVC Scenario Plan

- Fixture: a stable published opening in staging with approved/seeded content, selected during task discovery; never rely on a private/internal payload.
- Baseline: capture current flag-OFF renderer before changes at 1440 and 390, first fold and full page.
- Runtime: `pnpm fe:capture <careers-detail-editorial-scenario> --env=staging`.
- Quality profile: `premium`.
- Review dossier: se crea bajo `.captures/` con before/after, findings y decisión de aceptación.
- Required evidence:
  - 1440 and 390, first fold and full-page.
  - hero CTA and summary CTA focus states; both preserve the identical `applyUrl`.
  - structured complete, legacy fallback and partial-content fixture/state.
  - `scrollWidth === clientWidth`, keyboard order, landmarks/headings, console/hydration/HTTP clean and reduced-motion check.
- Assertions:
  - exactly two application CTA links render on the detail page;
  - no final/third CTA appears;
  - requirements, process and legacy content are not hidden;
  - no blank bands for absent structured content;
  - full page remains readable at 390 px.

## Design Decision Log

- Decision: `Editorial dossier` is the selected direction.
- Why: it prioritizes a candidate’s decision evidence over company exposition, creates a modern visual rhythm without unnecessary assets, and respects the existing apply journey.
- Reuse / extend / new: reuse existing public Careers route, hero/CTA and summary; extend the local content composition; create no new product primitive.
- Accessibility: semantic landmarks, one `h1`, ordered `h2` sections, lists for list semantics, visible focus, AA contrast and source order that remains understandable without layout.
- Regression guard: rollout behind server-side flag; legacy fallback and old CTA/navigation are invariant. Compare visible baseline rather than relying only on pixel diff.
- Open risks: incomplete public model, overly long legacy copy and CSS cascade conflicts. Mitigate with fixtures/partial states and a staged flag rollout.
