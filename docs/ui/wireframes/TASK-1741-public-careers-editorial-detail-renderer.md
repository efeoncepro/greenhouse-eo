# TASK-1741 — Public Careers Editorial Detail Renderer

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

## Wireframe

### Desktop — 1440 px

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

### Mobile — 390 px

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
