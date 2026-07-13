# TASK-1363 — Assessment Taking + Review Surface Wireframe

## Meta

- Status: `implemented`
- Owner task: `TASK-1363 — Assessment Taking + Review Surface`
- Product Design asset: `/Users/jreye/Documents/carreers/Assesment/Task execution request/Superficie de evaluación.dc.html` + `support.js` + screenshots (`scorecard-markers`, `radar`, `radar2`)
- Intended consumers: candidato (público tokenizado), reclutador (desk Application 360)
- Copy source: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringAssessment.ts` (es-CL, tuteo)
- Primitive decision: reuse (shell público TASK-354 + Application360/Hiring Desk chrome + drawer/review surface + barras horizontales/radar inline); timer accesible implementado route-local por ser surface-specific.
- UI ready target: `yes` (source HTML reviewed; runtime GVC evidence attached in task)

## Brief

- Primary user: candidato que rinde / reclutador que corrige y lee
- User moment: el candidato recibió un link y tiene tiempo limitado; el reclutador quiere una lectura rápida y justa del candidato
- Job to be done: medir competencias reales (SEO, copywriting, liderazgo, vendor management + actitudinal) de forma honesta y sin fricción
- Primary decision signal: scorecard por competencia (advisory) que alimenta la decisión humana
- Non-goals: decidir contratación; mostrar respuestas correctas al candidato; puntuar con IA sin confirmación humana

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header candidato | Marca Efeonce mínima + título del proceso + timer sticky | Shell público + timer accesible | instancia (token) |
| 1 | Instrucciones + consentimiento | Qué es, cuánto dura, tratamiento de datos, checkbox consentimiento | Card + checkbox + botón primario | plantilla + consent policy |
| 2 | Wizard de rendición | Una competencia por paso; progreso; pregunta + input; autosave | Wizard single-column (forms-ux) | preguntas (sin answer-key) |
| 3 | Barra de progreso | "Paso N de M" nombrado por competencia | Progress indicator | plantilla |
| 4 | Confirmación de envío | Estado terminal "Test enviado" | Card `role=status` | instancia |
| 5 | Desk — tab Evaluación | Scorecard por competencia + overall (advisory) | `CompositionShell` + barras horizontales | `getAssessmentScorecard` |
| 6 | Desk — cola de corrección | Respuestas abiertas pendientes de corregir | Data table / lista | respuestas `needs_human_rating` |
| 7 | Desk — drawer de corrección | Respuesta + rúbrica + confirmar/ajustar (+ sugerencia IA) | Drawer / Adaptive Sidecar | respuesta + rúbrica + propuesta IA |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `hiring.assessment.taking.header.title` | 0 | `Evaluación para {rol}` | `{rol}` | rol público del opening |
| `hiring.assessment.taking.timer.label` | 0 | `Tiempo restante` | `{mm:ss}` | anuncio en umbrales, no cada segundo |
| `hiring.assessment.taking.instructions.title` | 1 | `Antes de empezar` | — | tono calmo, no examen intimidante |
| `hiring.assessment.taking.instructions.body` | 1 | `Vas a responder {n} secciones. Tenés {min} minutos. Una vez que envíes, no podés volver a editar.` | `{n}`,`{min}` | claridad sobre irreversibilidad |
| `hiring.assessment.taking.consent.checkbox` | 1 | `Autorizo el tratamiento de mis respuestas para este proceso de selección.` | — | consentimiento obligatorio |
| `hiring.assessment.taking.start.cta` | 1 | `Empezar evaluación` | — | verbo + objeto; arranca el timer |
| `hiring.assessment.taking.progress.label` | 3 | `Sección {i} de {total}: {competencia}` | `{i}`,`{total}`,`{competencia}` | nombrado por competencia |
| `hiring.assessment.taking.next.cta` | 2 | `Continuar` | — | valida el paso |
| `hiring.assessment.taking.submit.cta` | 2 | `Enviar evaluación` | — | primario; abre confirmación |
| `hiring.assessment.taking.submit.confirm.title` | 2 | `¿Enviar tu evaluación?` | — | pregunta |
| `hiring.assessment.taking.submit.confirm.body` | 2 | `No vas a poder editar tus respuestas después de enviar.` | — | consecuencia |
| `hiring.assessment.taking.submit.confirm.primary` | 2 | `Enviar evaluación` | — | específico |
| `hiring.assessment.taking.saved` | 2 | `Respuesta guardada` | — | autosave, `role=status` |
| `hiring.assessment.taking.submitted.title` | 4 | `¡Listo! Recibimos tu evaluación` | — | cierre cálido |
| `hiring.assessment.taking.submitted.body` | 4 | `El equipo va a revisar tus respuestas. Gracias por tu tiempo.` | — | sin prometer resultado |
| `hiring.assessment.taking.expired.title` | 4 | `Se acabó el tiempo` | — | honesto, sin culpa |
| `hiring.assessment.taking.expired.body` | 4 | `Guardamos lo que alcanzaste a responder.` | — | conserva lo respondido |
| `hiring.assessment.token.invalid.title` | — | `Este enlace no está disponible` | — | no revelar por qué exactamente |
| `hiring.assessment.token.invalid.body` | — | `Puede haber expirado o ya haberse usado. Escribile a quien te contactó.` | — | recovery |
| `hiring.assessment.review.scorecard.title` | 5 | `Evaluación por competencia` | — | interno |
| `hiring.assessment.review.scorecard.advisory` | 5 | `Referencia para tu decisión. No reemplaza tu criterio.` | — | advisory explícito |
| `hiring.assessment.review.queue.title` | 6 | `Respuestas por corregir ({n})` | `{n}` | conteo |
| `hiring.assessment.review.queue.empty.title` | 6 | `Sin respuestas pendientes` | — | empty state |
| `hiring.assessment.review.queue.empty.body` | 6 | `Cuando el candidato envíe respuestas abiertas, aparecen acá para que las corrijas.` | — | 5-part empty |
| `hiring.assessment.review.rate.confirm` | 7 | `Confirmar puntaje` | — | command |
| `hiring.assessment.review.rate.ai_suggestion` | 7 | `Sugerencia de IA (revisá antes de confirmar)` | — | solo si TASK-1361 activa |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | `Antes de empezar` | instrucciones | `Empezar evaluación` | consentimiento obligatorio |
| loading | — | — | — | skeleton + `aria-busy` |
| empty (cola) | `Sin respuestas pendientes` | `…aparecen acá para que las corrijas.` | — | 5-part |
| partial (scorecard) | competencia sin corregir | muestra `Pendiente`, no `0` | corregir | honest degradation |
| error | `No pudimos cargar la evaluación` | `Probá de nuevo en unos minutos.` | `Reintentar` | genérico, sin leak |
| denied (token) | `Este enlace no está disponible` | `Puede haber expirado o ya haberse usado.` | contactar | no revelar detalle |
| submitted | `¡Listo! Recibimos tu evaluación` | `El equipo va a revisar tus respuestas.` | — | terminal |
| expired | `Se acabó el tiempo` | `Guardamos lo que alcanzaste a responder.` | — | terminal honesto |

## Accessibility Contract

- Heading order: `h1` título del proceso → `h2` sección/competencia → `h3` pregunta; interno `h1` postulación → `h2` Evaluación → `h3` competencia
- Chart/table alternatives: el scorecard (barras por competencia) tiene tabla equivalente sr-only (competencia · nivel objetivo · puntaje · estado) + `role="img"` con resumen
- Aria labels: timer `aria-label="Tiempo restante {mm}:{ss}"` con `aria-live=polite` solo en umbrales; autosave `role=status`; confirmación de envío `role=dialog aria-modal=true`
- Focus notes: foco inicial al primer control; el timer NUNCA roba foco; drawer restaura foco a la fila; wizard no atrapa foco (single-page, no modal)
- Color-independent state labels: score/estado con texto + icono, nunca color solo (semáforo Óptimo/Atención/Crítico con label); barras del scorecard con etiqueta de valor directa

## Implementation Mapping

- Route / surface: candidato `src/app/assessment/[token]/**` + compat `src/app/public/assessment/[token]/**` (URL limpia `/assessment/[token]`, NO `[lang]`, bilingüe vía `getMicrocopy`, shell público); interno `(dashboard)/agency/hiring/applications/[id]` tab `Evaluación`
- Primitives: shell público tokenizado, Application360/Hiring Desk host, drawer MUI contextual, barras horizontales tokenizadas y radar SVG inline con tabla sr-only; timer accesible `role=timer`
- Variants / kinds: scorecard bar = tono semáforo por competencia (`success/warning/error` como estado, no color-only)
- Component candidates: `CustomTextField`, radios/checkbox nativos, `CustomChip`, progress indicator, `EmptyState`
- Copy source: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringAssessment.ts` (todas las ids del ledger)
- Data reader / command: `resolveAssessmentByToken`, `startAssessment`, `saveResponse`, `submitAssessment`, review DTOs internos y endpoints de score existentes de TASK-1360/1361
- API parity: la superficie consume commands/readers server-side; sin lógica de scoring en el cliente
- Access / capability: candidato = token single-use; interno = `hiring.assessment.read`/`score`
- Runtime consumers: candidato (público), reclutador (desk), Nexa (por parity, lectura del scorecard)
- Print/email/PDF considerations: el reporte agregado por vacante es follow-up; el email con el link es de TASK-354
- GVC markers: `assessment-instructions`, `assessment-start`, `assessment-question`, `assessment-timer`, `assessment-next`, `assessment-submitted`, `assessment-scorecard`, `assessment-mode-bars`, `assessment-mode-radar`, `assessment-review-queue`, `assessment-review-row`, `assessment-review-drawer`

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task1363-assessment-taking-runtime.scenario.ts` + `scripts/frontend/scenarios/task1363-assessment-review-runtime.scenario.ts`
- Route: `/assessment/<token>` (fixture) + `/agency/hiring/applications/<id>` tab `Evaluación`
- Viewports: desktop 1440 + mobile 390
- Required steps: token → instrucciones → consentir → iniciar → responder → autosave → avanzar; operador → tab Evaluación → cargar review → scorecard barras/radar → cola → drawer
- Required captures: instrucciones, wizard+timer, autosave, avance, scorecard barras/radar, cola, drawer
- Required `data-capture` markers: ver markers arriba
- Assertions: payload público allowlisted sin answer-key/rúbrica; sin console.error/pageerror bloqueante; no login redirect; regiones esperadas visibles
- Scroll-width checks: sí (desktop + 390)
- Accessibility/focus checks: foco inicial; timer no roba foco; drawer restaura foco; contraste semáforo
- Reduced-motion evidence: transición de paso estática

## Design Decision Log

- Decision: rendición como wizard single-column por pregunta/competencia (timer, autosave, envío irreversible); review como scorecard de barras horizontales + modo radar secundario + cola de corrección en drawer.
- Alternatives considered: scroll largo único (rechazado por fricción/forms-ux); radar en vez de barras (barras ganan en legibilidad/comparación por Cleveland & McGill; radar opcional secundario); test dentro del portal con login (rechazado, candidato externo).
- Why this pattern: honesto, accesible, sin filtrar answer-key, respeta "humano decide" (scorecard advisory).
- Reuse / extend / new primitive: reuse mayoritario; timer accesible se mantuvo local porque no hay aún patrón reutilizable de evaluación cronometrada en otras surfaces.
- Open risks: anti-cheat V1 limitado; contenido de pruebas y fairness = gobernanza continua; rollout remoto pendiente de push/deploy.
- Follow-up: reportes agregados por vacante; anti-cheat/proctoring liviano sólo si People/Talent lo justifica.

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded.
- [x] Partial/degraded states are explicit.
- [x] No copy implies a guarantee when data is estimated.
- [x] Charts have table/text alternatives.
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [x] Design decision log explains reuse/extend/new before JSX starts.
