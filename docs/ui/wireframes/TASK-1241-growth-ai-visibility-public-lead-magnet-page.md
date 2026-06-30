# TASK-1241 / Public Lead Magnet Page — Wireframe (nodo S1 · "Answer Engine Signal Scan")

> Nodo **S1 / Journey A** del master flow `docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md`. Render del `ReportArtifactModel` variant **`publicWeb`** (público-safe). Dirección Product Design **aprobada por el operador (2026-06-25): "Answer Engine Signal Scan"** + stepper async de "Guided Diagnostic Journey" + bloque "Qué recibes" de "Report-First Lead Magnet".
> Referencias durables: `docs/assets/product-design/task-1241-ai-visibility-public-lead-magnet/answer-engine-signal-scan.png` (base), `…/guided-diagnostic-journey.png` (estados async), `…/report-first-lead-magnet.png` (output/proof).

## Meta

- Status: `draft`
- Owner task: TASK-1241
- Product Design asset: Answer Engine Signal Scan (PNGs ↑) + master flow EPIC-020 Journey A
- Intended consumers: prospecto público no autenticado (marketing/decisor de una marca)
- Copy source: `src/lib/copy/growth.ts`
- Primitive decision: `reuse` (report-artifact `web` `publicWeb` + primitives Greenhouse + charts ECharts) — `new` solo si no existe un patrón de "report público"
- UI ready target: `no`

## Brief

- Primary user: prospecto (decisor/marketing) que no sabe cómo lo ve la IA
- User moment: descubrimiento (lead magnet) → entrega del diagnóstico
- Job to be done: ingresa marca + email → recibe su reporte de visibilidad en IA → entiende su gap dominante + próximo paso
- Primary decision signal: score headline + brecha dominante + posición vs categoría
- Non-goals: análisis exhaustivo, login, dashboards internos, ranking garantizado, evidencia cruda

## Layout Skeleton (primer viewport vende el intercambio email→reporte)

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | **Hero full-bleed** | H1 = la oferta/categoría (diagnóstico de visibilidad en answer engines); el texto va SOBRE la escena, no dentro de una card | public hero (full-bleed, no app-card) | copy |
| 1 | **Intake form** (visible en 1er viewport) | marca · sitio · país/mercado · industria/categoría · descripción · **email corporativo** (gate 1263) · consent · Turnstile · CTA | form + Cloudflare Turnstile | POST `/api/public/.../run` (1240) |
| 1b | Trust microcopy (junto al form) | "muestra muestreada, sin respuestas crudas de proveedores, sin ranking garantizado" + consent/privacidad | microcopy | copy |
| 2 | **Async stepper** | `queued → running → report ready` (labels público-safe; `review_required` = "revisión" neutral) | progress rail/stepper | run/[handle] (status) |
| 3 | **Public report** | headline KPI (cuenta) + 3–5 hallazgos + plan priorizado + tendencia + dimensiones (ECharts radar/bar) + **table-fallback** + disclaimer | report-artifact `web` `publicWeb` | report/[token] (1239) |
| 4 | **"Qué recibes"** (below-fold) | output del reporte + entrega por email/link tokenizado + adjunto PDF público-safe (consumer de 1250) — sin que esta UI despache el email | proof block | copy |
| 5 | Post-report CTA | "hablá con Efeonce" | CTA | copy |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.aeo.public.hero.h1` | 0 | (oferta: diagnóstico de visibilidad en IA) | — | H1 = categoría, no slogan vacío |
| `growth.aeo.public.form.cta` | 1 | Generar mi diagnóstico | — | verbo+objeto |
| `growth.aeo.public.form.trust` | 1b | Muestra muestreada · sin respuestas crudas de IA · sin ranking garantizado | — | honestidad |
| `growth.aeo.public.step.queued` | 2 | En cola | — | público-safe |
| `growth.aeo.public.step.running` | 2 | Analizando answer engines | — | sin internals de provider |
| `growth.aeo.public.step.review` | 2 | En revisión | — | NUNCA expone la razón interna |
| `growth.aeo.public.proof.title` | 4 | Qué recibes | — | vende el intercambio |

## State Copy (mapea los outcomes reales del endpoint)

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| default | — | hero + form | Generar | form siempre presente |
| sending | Enviando… | Turnstile + POST | — | CTA disabled + spinner |
| queued/running | (stepper) | progreso por fase | — | poll honesto, sin provider internals |
| review_required | En revisión | "tu revisión se está validando" | — | gate interno (1247), razón NUNCA expuesta |
| partial | — | reporte parcial + "algunos motores no respondieron" | — | disclosure honesto |
| completed | — | report `publicWeb` | hablá con Efeonce | |
| invalid (400) | Revisá los datos | campo con error inline | corregir | aria-live |
| captcha_failed (403) | Verificación fallida | reintentá | reintentar | Turnstile |
| rate_limited (429) | Demasiados intentos | volvé más tarde | — | abuse-guard per-email/IP |
| cost_blocked (503) | No disponible ahora | volvé más tarde | — | budget diario global |
| disabled (404) | — | feature off | — | flag |

## Accessibility Contract (WCAG 2.2 AA)

- Heading order: h1 (hero) → h2 (form) → h2 (stepper) → h2 (report) → h2 (Qué recibes)
- Chart/table alternatives: ECharts radar/bar SIEMPRE con table-fallback (severidad nombrada, no color-only)
- Aria labels: cada campo con label visible (no placeholder-as-label); errores inline con `aria-describedby` + `aria-invalid`; stepper con `aria-live`
- Focus notes: al pasar de form→reporte, mover foco al headline del reporte; errores anunciados
- Color-independent: score/severidad como texto + ícono, no solo color
- Pinch-zoom nunca deshabilitado; reflow 320px/200%

## Implementation Mapping

- Route / surface: ruta pública nueva (Next.js public route en greenhouse-eo **o** WordPress/Kinsta — Open Question de la task)
- Primitives: report-artifact `web` (`publicWeb`) + form + Turnstile + stepper
- Variants / kinds: `publicWeb`
- Component candidates: hero full-bleed + intake form + async stepper + `AiVisibilityReportArtifact` + "Qué recibes" + CTA
- Copy source: `src/lib/copy/growth.ts`
- Data reader / command: POST `/api/public/growth/ai-visibility/run` (1240) + `report/[token]` (1239) + `run/[handle]` (status)
- API parity: la UI es cliente de los endpoints públicos; cero lógica de negocio (Full API Parity). Deuda conocida: el form es hand-built → converge al Growth Forms engine (Delta 2026-06-25 de la task)
- Access / capability: público + Turnstile + abuse-guard (per-email/IP + budget global)
- Runtime consumers: prospecto; el email + PDF salen por TASK-1250/1273 (mismo modelo)
- Print/email/PDF: esta UI NO despacha email; el bloque "Qué recibes" setea expectativa del adjunto público-safe
- GVC markers: `data-capture="public-grader-form"`, `data-capture="public-grader-report"`

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/growth-public-lead-magnet.scenario.ts`
- Route: ruta pública (o mockup determinista)
- Viewports: desktop 1440 + mobile 390
- Required steps: render hero+form → estado running (stepper) → reporte completo → "Qué recibes"
- Required captures: form, estado async, reporte completo, proof block
- Required `data-capture` markers: `public-grader-form`, `public-grader-report`
- Assertions: noErrorBoundary; público-safe (ningún campo internal-only en el DOM)
- Scroll-width checks: `scrollWidth==clientWidth` desktop + 390
- Accessibility/focus checks: axe + focus order + table-fallback de charts + aria-live del stepper
- Reduced-motion evidence: KPI/charts con valor final directo (ver motion doc)

## Design Decision Log

- Decision: dirección **Answer Engine Signal Scan** (hero full-bleed público + form en 1er viewport) + stepper async (option 2) + "Qué recibes" (option 3); render `publicWeb` del modelo compartido
- Alternatives considered: SaaS dashboard hero / app-card centrada / split text-media / nested cards (todas **rechazadas** explícitamente); form hand-built (deuda → Growth Forms engine)
- Why this pattern: experiencia pública de producto Efeonce backed by Greenhouse (no admin), conversion-focused, una sola fuente de verdad (artifact model), Journey A del master flow
- Reuse / extend / new primitive: reuse report-artifact `publicWeb` + form; ECharts para charts públicos (política de charts de alto impacto)
- Open risks: hosting (Next.js vs WordPress) limita primitives → declarar deuda visual; convergencia con Growth Forms engine; logos de proveedores solo si los términos legales lo permiten

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit (partial + review_required neutral).
- [ ] No copy implies a guarantee (sin ranking garantizado, muestra muestreada).
- [ ] Charts have table/text alternatives.
- [ ] State and aria copy is ready for implementation (5 outcomes + async states).
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture`.
- [ ] Design decision log explains reuse/extend/new + las direcciones rechazadas.
