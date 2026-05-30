# TASK-953 — Greenhouse Visual Capture Evidence Hardening

## Delta 2026-05-30 — rutas runtime contractor ya existen (por TASK-796)

`TASK-796` (Contractor Self-Service Hub) **completó**: las rutas runtime `/my/contractor` y `/hr/contractors` ya existen en producción (no solo `/mockup`). El scenario de ejemplo `contractor-admin-runtime` (route `/hr/contractors`) de esta task ahora apunta a una ruta real. TASK-796 dejó **pendiente la captura GVC de runtime** (requiere dev server + un engagement contractor seedeado para el usuario agente) — es exactamente el caso mockup→runtime que esta task formaliza. Al implementar TASK-953, usar `/my/contractor` + `/hr/contractors` como casos vivos de baseline(mockup)→runtime.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|ops`
- Blocked by: `none`
- Branch: `task/TASK-953-gvc-evidence-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Endurecer **Greenhouse Visual Capture** (`GVC`, `pnpm fe:capture`) para que no solo genere screenshots/videos, sino evidencia visual confiable: readiness de página, assertions ligeros, microinteraction evidence layer, frame quality guards, reportes HTML ricos, multi-viewport, consola/red opcional, diff/baseline usable y contrato mockup aprobado → runtime.

## Why This Task Exists

GVC ya reemplaza scripts Playwright ad-hoc y soporta scroll robusto, full-page y captura por sección. El siguiente riesgo no es "no capturar", sino capturar evidencia falsa: login, loading, error boundary, frame vacío, selector frágil, página no lista, o una comparación visual sin contexto. Para agentes futuros, GVC debe reducir falsos positivos y producir artifacts revisables sin depender de interpretación manual dispersa.

## Goal

- Agregar readiness explícito para páginas Greenhouse antes de capturar.
- Agregar assertions ligeros y frame quality guards sin convertir GVC en un test E2E completo.
- Convertir los scenarios de microinteracciones en evidencia más rica: video segmentado, frames antes/durante/después, focus/keyboard, reduced-motion y timing metadata.
- Generar reportes HTML/dossiers más ricos y comparables entre runs.
- Soportar multi-viewport por scenario de forma declarativa.
- Formalizar baseline/mockup → runtime como flujo visual repetible para tasks como `TASK-796`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `docs/ui/GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md`
- `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `docs/ui/GREENHOUSE_ACCESSIBILITY_GUIDELINES_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- GVC sigue siendo herramienta de evidencia visual, no reemplazo de Playwright E2E assertions.
- Los checks de microinteraccion deben evaluar evidencia de feedback, timing y accesibilidad; no deben promover motion decorativo ni exigir animaciones donde la UI debe permanecer estable.
- No reintroducir `_cap.mjs` ni scripts por task como camino principal.
- No loggear secretos, bypass headers, cookies, emails personales ni payloads sensibles en manifest/reportes/console dumps.
- Toda nueva primitive del DSL debe tener validación, tests y documentación.
- Cualquier captura de production conserva el Triple Gate existente; esta task no relaja safety.

## Normative Docs

- `AGENTS.md`
- `CLAUDE.md`
- `project_context.md`
- `scripts/frontend/README.md`
- `scripts/frontend/scenarios/_README.md`
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md`
- `docs/documentation/plataforma/captura-visual.md`

## Dependencies & Impact

### Depends on

- `TASK-953` nace después del hardening V1.3 de GVC (`scroll selector`, `scrollTo`, `mark fullPage`, `mark clipSelector`) ya materializado en `scripts/frontend/lib/scenario.ts` y `scripts/frontend/lib/recorder.ts`.
- Playwright + agent auth existente:
  - `scripts/playwright-auth-setup.mjs`
  - `scripts/frontend/lib/auth.ts`
  - `scripts/frontend/lib/browser.ts`

### Blocks / Impacts

- Mejora el loop visual de cualquier task UI.
- Impacta directamente la implementación/review de `TASK-796` y futuros flujos mockup aprobado → runtime.
- Puede alimentar futuras lanes CI/manuales de visual QA, pero no debe activar CI obligatorio en esta task sin decisión explícita.

### Files owned

- `scripts/frontend/capture.ts`
- `scripts/frontend/review.ts`
- `scripts/frontend/diff.ts`
- `scripts/frontend/health.ts`
- `scripts/frontend/lib/scenario.ts`
- `scripts/frontend/lib/recorder.ts`
- `scripts/frontend/lib/manifest.ts`
- `scripts/frontend/lib/reliability.ts`
- `scripts/frontend/lib/browser.ts`
- `scripts/frontend/lib/audit.ts`
- `scripts/frontend/lib/*test.ts`
- `scripts/frontend/scenarios/_README.md`
- `scripts/frontend/scenarios/*.scenario.ts`
- `scripts/frontend/README.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `docs/ui/GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md`
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md`
- `docs/documentation/plataforma/captura-visual.md`

## Current Repo State

### Already exists

- `pnpm fe:capture` con scenario DSL tipado.
- `pnpm fe:capture:review`, `fe:capture:diff`, `fe:capture:health`, `fe:capture:gc`.
- Manifest JSON por run y audit local `.captures/audit.jsonl`.
- Scroll por selector, `scrollTo`, `mark fullPage`, `mark clipSelector`.
- Scenarios de referencia:
  - `offboarding-queue-microinteractions`
  - `contractor-admin-workbench`
  - `offboarding-fullpage-capture`
  - `sample-sprints-scroll-anchors`

### Gap

- `hold` y `wait selector` no garantizan que la página esté realmente lista.
- No hay assertions ligeros de "no login", "no error boundary", "no loading dominante", "selector visible esperado".
- No hay frame quality guard automático para imagen blanca/vacía/login/loading/error.
- `review-dossier.md` es útil pero no reemplaza un `index.html` navegable por humanos/agentes.
- Multi-viewport requiere corridas separadas o override manual.
- `health` clasifica poco: no distingue auth failure, selector failure, app 500, timeout visual o helper failure.
- No hay flujo canónico para comparar mockup aprobado contra runtime final en tasks UI.
- Los scenarios de microinteracciones funcionan, pero el análisis sigue siendo manual: el manifest no segmenta clips por interacción, no captura frames transitorios a offsets consistentes, no diferencia hover/focus/pressed/selected, no corre variante reduced-motion y no produce findings sobre timing o feedback.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Page Readiness Contract

- Agregar primitive declarativa para readiness de página, por ejemplo `ready`/`waitForReady`, que soporte:
  - selector estable listo
  - ausencia de selectors de loading/skeleton
  - `document.fonts.ready`
  - delay corto post-ready
  - timeout con error accionable
- Soportar atributo recomendado `data-gvc-ready="true"` o equivalente sin hacerlo obligatorio para todas las rutas.
- Documentar cuándo usar readiness explícito vs `initialHoldMs`.
- Agregar tests del validador y runner.

### Slice 2 — Lightweight Assertions & Failure Taxonomy

- Extender el DSL con assertions ligeros, por ejemplo:
  - `assertVisible`
  - `assertNotVisible`
  - `assertNoLoginRedirect`
  - `assertNoErrorBoundary`
  - `assertNoCriticalToast` o equivalente configurable
- Diferenciar causas de fallo en manifest/audit:
  - `auth_redirect`
  - `selector_timeout`
  - `app_error`
  - `visual_timeout`
  - `frame_quality`
  - `helper_error`
- Mantener estos asserts como evidence guards, no como suite E2E de negocio.

### Slice 3 — Microinteraction Evidence Layer

- Formalizar un patrón declarativo para microinteracciones que hoy se escriben a mano como `hover` + `sleep` + `mark`.
- Agregar una primitive o macro additive, por ejemplo `interaction`, que pueda describir:
  - acción: `hover`, `click`, `press`, `focus`
  - selector target
  - frames relativos: `before`, `at 75ms`, `at 150ms`, `at 300ms`, `after`
  - expected semantic state: `hovered`, `focused`, `pressed`, `selected`, `expanded`, `loading`, `success`, `error`
  - nota de intención: que incertidumbre reduce o que feedback confirma
- Permitir capturar clips/segmentos lógicos dentro del `.webm` mediante metadata de `startMs/endMs` por interacción, aunque el archivo siga siendo un video continuo V1.
- Agregar soporte para keyboard/focus path como primera clase:
  - `focus` por selector
  - `press Tab`
  - `press Enter/Space`
  - frame de focus visible
- Agregar variante `reducedMotion` opt-in por scenario o interaction para validar que la interacción conserva feedback sin depender de motion decorativo.
- Registrar findings de microinteracción en manifest/reporte:
  - target no visible o no focusable
  - no hubo frame posterior al action
  - delay excesivo entre acción y feedback observado (best-effort por timestamps, no pixel-perfect)
  - interaction sin `note`/intención
  - hover-only sobre acción esencial sin evidencia keyboard equivalente
- Migrar o duplicar `offboarding-queue-microinteractions` como scenario de regresión V2 para probar la capa sin romper el scenario V1.

### Slice 4 — Frame Quality Guards

- Agregar análisis automático de frames para detectar:
  - imagen casi blanca/vacía
  - login page
  - error boundary
  - loading dominante
  - captura full-page sin scroll real cuando se esperaba contenido largo
- Registrar findings en manifest y reporte, con severidad `warning`/`error`.
- Permitir opt-out explícito por scenario cuando un frame vacío/loading sea intencional, con `note` y razón.

### Slice 5 — Multi-Viewport Scenario Runs

- Permitir viewports declarativos por scenario sin duplicar archivos, por ejemplo `viewports` o `variants`.
- Generar output ordenado por viewport/device dentro del run dir.
- Mantener compatibilidad con `--device` actual.
- Asegurar que manifest represente múltiples viewports sin romper consumers V1; usar schema additive.

### Slice 6 — Rich HTML Report & Review Dossier V2

- Generar `index.html` por captura con:
  - frames por viewport
  - video/links a webm/gif si existen
  - manifest resumido
  - route/env/actor/viewport/timing
  - readiness/assertions/frame-quality findings
  - microinteraction clips/segments with before/during/after frames
  - focus/reduced-motion evidence when present
  - links relativos a artifacts
- Evolucionar `review-dossier.md` para incluir findings automáticos, no solo checklist.
- No introducir dependencia pesada de UI runtime; report puede ser HTML estático generado por Node.

### Slice 7 — Baseline & Mockup-to-Runtime Contract

- Agregar convención para registrar baseline por scenario o capture dir, por ejemplo:
  - `surfaceId`
  - `baselineName`
  - `approvedMockupCaptureDir`
- Agregar comando o modo de diff que compare mockup aprobado vs runtime actual de forma repetible.
- Documentar el flujo para tasks UI:
  - capturar mockup aprobado
  - capturar runtime final
  - capturar microinteracciones runtime cuando el mockup aprobado describe transiciones/feedback
  - generar diff/review
  - documentar desviaciones justificadas en la task
- Usar `TASK-796` como caso de referencia documental, sin acoplar GVC a contractor.

### Slice 8 — Health V2 & Documentation

- Mejorar `pnpm fe:capture:health` para agrupar fallos por taxonomy.
- Actualizar arquitectura, manual, documentación funcional, UI method, `AGENTS.md`/`CLAUDE.md` si cambia el contrato operativo.
- Agregar escenarios de regresión que cubran readiness, assertions, microinteraction evidence, multi-viewport y report.

## Out of Scope

- Activar GVC como CI obligatorio en todos los PRs.
- Pixel-perfect visual regression gate blocking CI.
- Invocar automáticamente Claude/Anthropic SDK desde `fe:capture:review`.
- Capturar datos sensibles o payloads completos de API.
- Reemplazar `tests/e2e/` Playwright smoke.
- Medir motion pixel-perfect o imponer thresholds universales de animación para todo el producto.
- Forzar que toda UI tenga animación; microinteractions solo deben existir si reducen incertidumbre, confirman estado, guían el próximo paso o previenen error.
- Crear una UI web persistente dentro del portal para browsing de `.captures/`.

## Detailed Spec

### DSL Additions

El agente que ejecute debe proponer el shape final durante Plan Mode, pero el contrato esperado es additive y typed. Ejemplos aceptables:

```ts
export const scenario: CaptureScenario = {
  name: 'contractor-admin-runtime',
  route: '/hr/contractors',
  viewport: { width: 1440, height: 900 },
  readiness: {
    selector: '[data-gvc-ready="contractor-admin"]',
    waitForFonts: true,
    absentSelectors: ['[data-loading="true"]', '[role="progressbar"]'],
    timeout: 10000
  },
  assertions: [
    { kind: 'notVisible', selector: '[data-testid="login-card"]', reason: 'authenticated route expected' },
    { kind: 'notVisible', selector: '[role="alert"][data-severity="error"]', reason: 'no blocking app error' }
  ],
  interactions: [
    {
      name: 'review-filter-hover',
      action: { kind: 'hover', selector: '[role="tab"][aria-label*="Requieren acción"]' },
      intent: 'Confirmar affordance del filtro antes de activar',
      frames: [
        { label: 'before', atMs: 0 },
        { label: 'hover-feedback', atMs: 150 },
        { label: 'hover-settled', atMs: 300 }
      ],
      keyboardEquivalent: {
        action: { kind: 'press', key: 'Tab' },
        expected: 'focus-visible'
      },
      reducedMotion: 'capture'
    }
  ],
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 1024, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  steps: [
    { kind: 'mark', label: 'first-fold' },
    { kind: 'scroll', selector: '[data-capture="contractor-timeline"]', scrollBlock: 'center' },
    { kind: 'mark', label: 'timeline', clipSelector: '[data-capture="contractor-timeline"]' }
  ]
}
```

### Microinteraction Evidence Contract

Los scenarios actuales ya pueden capturar microinteracciones con pasos manuales. Esta task debe preservar ese modelo y agregar una capa de conveniencia/evidencia, no reemplazarlo de golpe.

Un microinteraction evidence item debe producir:

- al menos un frame antes y uno después de la acción
- timestamps relativos a la acción, no solo al inicio del run
- nota de intención obligatoria (`intent` o `note`)
- segmento lógico del video (`startMs/endMs`) en manifest
- evidencia de keyboard/focus cuando la acción sea esencial para completar la tarea
- variante reduced-motion cuando la interacción use motion custom o meaningful motion

Ejemplo de migración conceptual desde V1:

```ts
// V1 actual: válido, pero manual
{ kind: 'hover', selector: '[role="tab"][aria-label*="Requieren acción"]' },
{ kind: 'sleep', ms: 250 },
{ kind: 'mark', label: 'kpi-tile-hover' }

// V2 esperado: mismo comportamiento, más evidencia
{
  kind: 'interaction',
  name: 'kpi-tile-hover',
  action: { kind: 'hover', selector: '[role="tab"][aria-label*="Requieren acción"]' },
  intent: 'Hover refuerza que el KPI filtra la cola',
  frames: [
    { label: 'before', atMs: 0 },
    { label: 'hover-feedback', atMs: 150 },
    { label: 'settled', atMs: 300 }
  ]
}
```

El agente que ejecute puede elegir si `interaction` vive como `kind` nuevo o como campo top-level `interactions[]`, pero debe mantener compatibilidad con scenarios V1.

### Manifest Additions

El manifest debe crecer de forma compatible:

- preservar `schemaVersion: 1` si los campos son puramente aditivos y consumers actuales no rompen
- o subir a `schemaVersion: 2` solo si el shape de `frames` cambia de forma incompatible
- agregar:
  - `readiness`
  - `assertions`
  - `qualityFindings`
  - `failureCategory`
  - `variants`/`viewports`
  - `reportHtml`

### Safety

- Console/network capture, si se implementa como parte del reporte, debe ser opt-in y redacted.
- El redactor debe eliminar cookies, authorization headers, bypass headers, query secrets y payload bodies por defecto.
- No guardar HTML completo de la página si puede incluir datos sensibles; reporta metadata y frames, no DOM dump.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 porque readiness y assertions alimentan el resto de findings.
- Slice 3 depende de Slice 2 si reutiliza failure taxonomy, pero puede diseñarse en paralelo durante Plan Mode.
- Slice 4 depende de Slice 2/3 porque frame quality debe conocer marks e interaction frames.
- Slice 5 puede correr después de Slice 1, pero debe integrarse con manifest antes de Slice 6.
- Slice 6 depende de manifest/finding shape estable.
- Slice 7 depende de report/diff baseline usable.
- Slice 8 cierra docs, health y regression scenarios.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Falsos negativos por readiness demasiado estricta | UI/tooling | medium | Defaults conservadores, opt-in por scenario, timeout accionable | `fe:capture:health` failure taxonomy `visual_timeout` |
| Microinteraction checks se vuelven frágiles/pixel-perfect | UI/tooling | medium | Evidence-first, semantic findings, no thresholds universales | Review de `offboarding-queue-microinteractions` V2 |
| Reporte guarda datos sensibles | Security/tooling | low | Redacción por defecto, no DOM dump, console/network opt-in | Review de artifacts + tests de redaction |
| Multi-viewport rompe consumers de manifest V1 | Tooling | medium | Shape additive o schemaVersion 2 con compatibility reader | Tests de manifest/review/diff |
| Assertions duplican Playwright E2E | QA/tooling | low | Limitar asserts a evidence guards, documentar out-of-scope | Code review contra docs |
| Baseline diff genera ruido excesivo | UI/tooling | medium | Umbrales configurables, reporte warning-first | `fe:capture:health` + review manual |

### Feature flags / cutover

Sin feature flag runtime. GVC es tooling local/agent-facing. Los cambios deben ser additive y opt-in por scenario cuando puedan afectar comportamiento existente. Si un cambio altera defaults globales, debe documentarse y acompañarse de tests antes de merge.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert del commit de readiness o desactivar uso en scenarios | <10 min | si |
| Slice 2 | Revert del commit de assertions/taxonomy; manifests antiguos siguen válidos | <10 min | si |
| Slice 3 | Revert interaction macro; scenarios V1 manuales siguen funcionando | <10 min | si |
| Slice 4 | Revert quality guard o bajar findings a warning | <10 min | si |
| Slice 5 | Revert multi-viewport; scenarios vuelven a viewport único | <10 min | si |
| Slice 6 | Revert report HTML; artifacts base siguen existiendo | <10 min | si |
| Slice 7 | Revert baseline/mockup diff helpers; `fe:capture:diff` legacy sigue | <10 min | si |
| Slice 8 | Revert docs/scenarios si hay drift documental | <10 min | si |

### Production verification sequence

No hay deploy productivo directo. Verificar local y staging cuando aplique:

1. Unit tests del DSL/manifest/report.
2. `pnpm fe:capture:health` antes y después para revisar regression local.
3. Ejecutar scenarios de referencia en `--env=local`.
4. Si staging secrets están disponibles, correr al menos un scenario read-only en `--env=staging`.
5. Revisar `index.html` y `review-dossier.md` de un run real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] GVC soporta readiness explícito con tests y docs.
- [ ] GVC soporta assertions ligeros y failure taxonomy en manifest/audit.
- [ ] GVC soporta microinteraction evidence con before/during/after frames, timestamps relativos, intent, video segments y compatibilidad con scenarios V1.
- [ ] GVC puede capturar focus/keyboard evidence y reduced-motion evidence cuando un scenario lo declara.
- [ ] GVC detecta frames inútiles o engañosos con findings visibles.
- [ ] GVC puede ejecutar un scenario en múltiples viewports sin duplicar archivos.
- [ ] Cada captura genera o puede generar un reporte HTML estático navegable.
- [ ] `fe:capture:review` incorpora findings automáticos en el dossier.
- [ ] Existe flujo documentado de baseline/mockup aprobado → runtime final.
- [ ] `fe:capture:health` agrupa fallos por categoría.
- [ ] Scenarios de regresión cubren readiness, assertions, microinteractions, multi-viewport y report.
- [ ] Docs y entrypoints de agentes quedan sincronizados si cambia el contrato operativo.

## Verification

- `pnpm exec vitest run scripts/frontend/lib`
- `pnpm exec eslint scripts/frontend`
- `pnpm fe:capture:health`
- `pnpm fe:capture <scenario-regression> --env=local`
- `pnpm fe:capture:review <scenario-regression-or-capture-dir>`
- `pnpm docs:context-check`
- `git diff --check`

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` synchronized.
- [ ] `Handoff.md` updated with validation artifacts.
- [ ] `changelog.md` updated if workflow behavior changed.
- [ ] GVC docs/manual/architecture synchronized.
