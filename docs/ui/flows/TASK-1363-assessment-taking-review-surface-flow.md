# TASK-1363 — Assessment Taking + Review Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1363 — Assessment Taking + Review Surface`
- Related wireframe: [docs/ui/wireframes/TASK-1363-assessment-taking-review-surface.md](../wireframes/TASK-1363-assessment-taking-review-surface.md)
- Intended route / surface: candidate = `src/app/public/assessment/[token]/**` (URL `/assessment/[token]`, público, fuera del dashboard, NO `[lang]`, bilingüe vía `getMicrocopy`, reusa el shell público de 354/DDL-2); interno = Application 360 del desk (`(dashboard)/agency/hiring/applications/[id]`, tab `Evaluación`)
- Flow type: `multi-surface` (público tokenizado → desk interno; nodo del master flow del programa Hiring)
- Primary primitives: `CompositionShell` (desk), shell público tokenizado (patrón TASK-354), `CustomTextField`/radios/`CustomChip` (respuestas), barra de progreso wizard, scorecard = barras horizontales por competencia
- Copy source: `src/lib/copy/hiring.ts` (es-CL, tuteo)

> **Nota de madurez:** este contrato fija IA, flujo, estados, rutas, copy-intent y a11y (decisiones que preceden al skin, lideradas por info-architecture). La **dirección visual** sale del product-design loop (Slice 1 de la task); `UI ready: no` hasta GVC desktop+mobile.

## Flow Brief

- Primary user: (A) **candidato** que rinde el test; (B) **reclutador** que corrige lo abierto y lee el scorecard.
- Entry moment: (A) el candidato abre el link tokenizado que recibió; (B) el reclutador entra a la postulación en el desk.
- Successful outcome: (A) el candidato completa y envía el test una sola vez; (B) el reclutador ve el scorecard por competencia y corrige las respuestas abiertas pendientes.
- Primary decision/action: (A) responder + enviar; (B) confirmar/ajustar el score de cada respuesta abierta.
- Non-goals: decidir la contratación (el scorecard es advisory); generar/corregir con IA (TASK-1361, acá solo se muestra la sugerencia + botón confirmar).

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Landing tokenizada `/assessment/[token]` | Entry candidato | Shell mínimo centrado (sin nav interna), instrucciones + consentimiento | Igual, full-width, una columna | Shell público (patrón TASK-354) |
| Test wizard (misma ruta, estados) | Rendición | Una competencia por paso, timer sticky arriba, autosave | Timer sticky top, botones full-width, teclado móvil por `inputmode` | Wizard single-column (forms-ux) |
| Confirmación de envío | Cierre candidato | Estado terminal, sin acción de re-entrada | Igual | `role="status"` |
| Application 360 → tab `Evaluación` | Review interno | Scorecard por competencia + cola de corrección lado a lado | Scorecard arriba, cola apilada abajo | `CompositionShell` + barras horizontales |
| Drawer de corrección | Rating abierto | Respuesta + rúbrica lado a lado, confirmar/ajustar | Drawer full-height, apilado | Adaptive Sidecar / drawer canónico |

## Flow Map

1. Entry (A): el candidato abre `/assessment/[token]` → validación de token (válido / inválido / expirado / ya usado).
2. Primary action (A): lee instrucciones + acepta consentimiento → inicia (arranca el timer) → responde por competencia (autosave por respuesta) → **enviar** (confirmación irreversible).
3. Transition: al enviar, la instancia pasa a `submitted`; el auto-score de lo objetivo corre; lo abierto entra a la cola de corrección.
4. User decision (B): el reclutador abre la postulación → tab `Evaluación` → corrige cada respuesta abierta (confirma/ajusta score, o confirma sugerencia IA si TASK-1361 activa).
5. Completion: al cerrar todas las correcciones, la instancia pasa a `scored`; el resultado por competencia rueda a `hiring_application.score` (helper de TASK-1360); el scorecard queda completo.
6. Recovery / exit (A): si el tiempo expira, la instancia pasa a `expired` con estado honesto (lo respondido se conserva); (B) el reclutador puede reabrir una corrección hasta cerrar la instancia.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Abrir link | candidato | validación de token | — | single-use |
| Aceptar consentimiento + Iniciar | botón | `in_progress` (arranca timer) | Enter/Espacio | consentimiento obligatorio |
| Responder pregunta | input/radio | autosave (`saving`→ok) | por tipo de input | idempotente por (instancia, pregunta) |
| Siguiente competencia | botón Continuar | siguiente paso del wizard | Enter | valida el paso actual |
| Enviar test | botón primario | confirmación → `submitted` | Enter | **irreversible** (dialog de confirmación) |
| Expira el tiempo | timer | `expired` | — | anuncio `aria-live` + auto-submit de lo respondido |
| Abrir corrección | fila de la cola | drawer de rating | Enter | interno |
| Confirmar/ajustar score | botón en drawer | actualiza resultado + rueda al scorecard | Ctrl/Cmd+Enter | command de TASK-1360 |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| token_check | Validando el link | abrir URL | resultado del token | skeleton + `aria-busy` |
| token_invalid | Token inválido/usado/expirado | token inválido | — (terminal) | estado permanente honesto + contacto, sin filtrar por qué exactamente |
| instructions | Instrucciones + consentimiento | token válido | aceptar + iniciar | consentimiento obligatorio; no arranca timer aún |
| in_progress | Rindiendo, timer corriendo | iniciar | enviar / expira | timer accesible sticky; autosave por respuesta |
| saving | Guardando una respuesta | responder | ok/err | indicador inline por respuesta (no bloquea) |
| submitting | Enviando el test | confirmar envío | ok/err | botón `Enviando…` + disable |
| submitted | Enviado (terminal candidato) | envío ok | — | `role="status"`; sin re-entrada |
| expired | Se acabó el tiempo | timer=0 | — | honesto: "Se acabó el tiempo"; conserva lo respondido |
| review_empty | Sin respuestas por corregir | abrir tab sin pendientes | llega pendiente | empty state con las 5 partes |
| rating | Corrigiendo una respuesta | abrir corrección | confirmar/cerrar | rúbrica + respuesta lado a lado |
| scored | Scorecard completo | todas corregidas | — | scorecard por competencia advisory |
| error | Falla de carga/red | fetch/command falla | reintentar | recovery action (retry) |

## Routing Contract

- Route changes: candidato `path` (`/assessment/[token]`); interno `query` (tab `?tab=evaluacion`) + drawer `query` (`?rate=<responseId>`)
- Canonical URL: `/assessment/[token]` (candidato, `src/app/public/assessment/[token]/**`, NO `[lang]`, bilingüe vía `getMicrocopy`); `/agency/hiring/applications/[id]?tab=evaluacion` (interno)
- Deep-link behavior: el token es la credencial; el tab/drawer interno son deep-linkeables con capability
- Back button behavior: candidato — back no re-abre un test enviado (`submitted`/`expired` son terminales); interno — cierra drawer, mantiene tab
- Reload behavior: candidato — recarga re-valida token y reanuda desde `in_progress` con lo autosaveado; interno — re-fetch del scorecard
- Shareability: el link del candidato NO se comparte (single-use); el interno requiere capability

## Focus & Accessibility

- Initial focus: candidato — primer control accionable (aceptar consentimiento); interno — primer ítem de la cola / drawer
- Escape behavior: cierra el drawer interno (no aplica en el wizard del candidato salvo cancelar con confirmación)
- Click-away behavior: no cierra el wizard (evita pérdida); cierra el drawer interno con guardia si hay cambios sin guardar
- Focus restore: al cerrar el drawer, foco vuelve a la fila que lo abrió
- Modal vs non-modal semantics: dialog de confirmación de envío = modal (`aria-modal`); drawer de corrección = non-modal sidecar
- Screen reader announcement: cambios de paso (`aria-live=polite`), autosave ("Respuesta guardada"), timer en umbrales (5 min / 1 min restante, no cada segundo), envío ("Test enviado")
- Keyboard traversal: wizard 100% teclado (Tab por campos, Enter continúa, radios con flechas); timer nunca roba foco
- Reduced motion: transición de paso = crossfade/opacity con `prefers-reduced-motion`; timer sin animación distractora

## Data & Command Boundaries

- Readers: `getAssessmentInstanceForToken`, `getAssessmentScorecard(applicationId)` (TASK-1360)
- Commands: `saveAssessmentResponse`, `submitAssessment`, `confirmHumanScore` / `confirmAiProposal` (TASK-1360/1361)
- API routes: público `GET/POST /api/public/assessment/[token]` (wrapper token + rate-limit); interno `/api/hiring/assessments/**`
- Optimistic updates: autosave optimista con rollback (state-design); el envío NO es optimista (confirmación real)
- Cache / invalidation: invalidar scorecard tras cada corrección confirmada
- Audit / signals: eventos `hiring.assessment.submitted/scored` (TASK-1360); acceso tokenizado logueado
- Tenant / access boundary: candidato = token single-use (sin sesión); interno = capability `hiring.assessment.read`/`score`; answer-key NUNCA en el payload candidato

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | interno sin capability → 403 es-CL; candidato token inválido → estado permanente | contactar reclutador / pedir nuevo link | no filtrar por qué exactamente el token falló |
| not found / empty | cola de corrección vacía → empty state con CTA | — | 5-part empty state |
| partial / degraded | scorecard con una competencia sin corregir → muestra "Pendiente", no 0 | corregir lo pendiente | honest degradation (nunca `0` como si fuera score real) |
| stale data | scorecard cacheado tras corregir en otra pestaña | "Actualizado hace X" + refetch | stale-while-revalidate |
| timeout / API error | error con retry | reintentar | respuesta pública genérica, sin leak |
| dirty exit | candidato intenta salir a mitad | guardia + autosave ya persistió lo respondido | no perder trabajo |

## GVC Scenario Plan

- Scenario: `hiring-assessment-taking` + `hiring-assessment-scorecard`
- Scenario file: `scripts/frontend/scenarios/hiring-assessment-*.mjs` (crear en Slice 1)
- Route: `/assessment/<token-de-prueba>` (staging con instancia seed) + `/agency/hiring/applications/<id>?tab=evaluacion`
- Viewports: desktop 1440 + mobile 390
- Required steps: token → instrucciones → responder → enviar → (interno) corregir → scorecard
- Required captures: instrucciones, wizard en progreso con timer, confirmación de envío, cola de corrección, scorecard
- Required `data-capture` markers: `assessment-instructions`, `assessment-question`, `assessment-timer`, `assessment-submitted`, `assessment-scorecard`, `assessment-review-queue`
- Assertions: sin answer-key en el DOM candidato; `scrollWidth==clientWidth` desktop+390; sin console.error
- Scroll-width checks: sí (desktop + 390)
- Accessibility/focus checks: foco inicial correcto; timer no roba foco; drawer restaura foco
- Reduced-motion evidence: transición de paso estática con reduced-motion

## Design Decision Log

- Decision: dos surfaces (público tokenizado para rendir + interno en Application 360 para corregir/leer), una máquina de estados por instancia.
- Alternatives considered: (a) rendir dentro del portal con login → rechazado (candidato externo sin cuenta); (b) test en un solo scroll largo → rechazado (forms-ux: wizard por competencia reduce fricción y da progreso claro); (c) scorecard como radar → considerado, pero barras horizontales por competencia son más legibles y comparables (Cleveland & McGill: posición/longitud > área), con radar opcional como vista de "forma de perfil".
- Why this pattern: separa la credencial (token) de la sesión interna; el candidato rinde sin cuenta, el reclutador opera con capability; el scorecard advisory respeta el boundary de "humano decide".
- Reuse / extend / new primitive: reutiliza shell público tokenizado (TASK-354), `CompositionShell`, drawer/sidecar canónico, barras horizontales; el timer accesible puede ser primitive nueva si no existe (evaluar en Discovery).
- Open risks: anti-cheat (token single-use + tiempo, no anti-suplantación fuerte en V1); accesibilidad del timer; fairness del contenido de las pruebas (gobernanza de contenido, no UI).
- Follow-up: accommodations (tiempo extendido), reportes agregados por vacante.

## Acceptance Checklist

- [ ] The owning task declares this file in `Flow`.
- [ ] Every surface has desktop and compact behavior.
- [ ] Opening, closing, escape and focus restore are specified.
- [ ] Route/deep-link/back-button behavior is explicit.
- [ ] Data readers/commands are named and UI-only business logic is avoided.
- [ ] Failure paths are user-safe and do not expose internals.
- [ ] GVC sequence captures prove the flow, not only static screens.
- [ ] Design decision log explains why the flow uses these surfaces/routes.
