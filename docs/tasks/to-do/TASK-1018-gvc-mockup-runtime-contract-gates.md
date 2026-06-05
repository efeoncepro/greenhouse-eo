# TASK-1018 — GVC Mockup-to-Runtime Contract Gates

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|ops`
- Blocked by: `none`
- Branch: `task/TASK-1018-gvc-mockup-runtime-contract-gates`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Endurecer Greenhouse Visual Capture (`GVC`) para que el paso de **mockup aprobado a runtime** tenga gates productivos y dificiles de saltar: visual diff por seccion, layout integrity, consola/hydration strict, trace on failure, foco/teclado, budgets opt-in y rubric enterprise en el dossier.

Esta task parte de la base ya materializada en `TASK-953` y del gate `@axe-core/playwright` agregado a GVC para `TASK-1016`; no reemplaza GVC, lo convierte en contrato operacional de implementacion UI.

## Why This Task Exists

El loop actual ya captura frames, video, multi-viewport, readiness, assertions, findings y accesibilidad automatizada con axe cuando el scenario lo activa. Aun asi, el riesgo principal de las implementaciones UI sigue vivo: un agente puede tomar un mockup aprobado, "cablear" runtime y desviarse visualmente sin que el sistema lo detecte de forma suficientemente objetiva.

Necesitamos que GVC deje evidencia accionable cuando el runtime traiciona el mockup: layout re-interpretado, tabla plana que reemplaza un workbench, elementos solapados, overlays de desarrollo contaminando mobile, errores de consola, hydration mismatch, foco roto, scroll horizontal inesperado o performance degradada. El objetivo no es crear un robot de gusto visual perfecto; es subir el piso operativo para que el review humano parta desde evidencia robusta.

## Goal

- Convertir `baseline.approvedMockupCaptureDir` en un contrato usable de visual diff mockup -> runtime.
- Detectar automaticamente problemas de layout, chrome de desarrollo, consola/hydration, foco/teclado y datos falsamente sanos.
- Guardar artifacts ricos de debugging, especialmente Playwright trace on failure.
- Hacer que el dossier GVC distinga calidad enterprise, accesibilidad, integridad visual y riesgos de implementacion.
- Mantener GVC local-first, additive y opt-in por scenario donde el costo pueda ser alto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `project_context.md`
- `Handoff.md`
- `DESIGN.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `docs/tasks/complete/TASK-953-greenhouse-visual-capture-evidence-hardening.md`
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md`
- `docs/documentation/plataforma/captura-visual.md`
- `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`

Reglas obligatorias:

- GVC sigue siendo herramienta de evidencia y QA visual, no reemplazo de Playwright E2E ni de review humano.
- Los gates nuevos deben ser aditivos y opt-in por scenario cuando puedan introducir costo/flakiness.
- No relajar el Triple Gate de production ni loggear cookies, bypass secrets, tokens, payloads sensibles o datos personales innecesarios.
- No reintroducir scripts Playwright ad-hoc como camino principal.
- Toda primitive nueva del DSL debe tener tipos, validacion, tests y documentacion.
- Los visual diffs deben soportar masks/selectores para datos dinamicos; no se acepta un diff tan flaky que el equipo lo ignore.
- Cualquier dependencia nueva debe justificarse frente a Playwright/Node existentes y quedar en `devDependencies`.

## Normative Docs

- `scripts/frontend/README.md`
- `scripts/frontend/scenarios/_README.md`
- `scripts/frontend/lib/scenario.ts`
- `scripts/frontend/lib/quality.ts`
- `scripts/frontend/lib/report.ts`
- `scripts/frontend/lib/manifest.ts`
- `scripts/frontend/diff.ts`
- `tests/e2e/smoke/organization-list-enterprise-mockup-a11y.spec.ts`

## Dependencies & Impact

### Depends on

- `TASK-953` completo: readiness, assertions, quality findings, report HTML, multi-viewport, microinteraction V2 y baseline metadata.
- Commit `829b1466a`: `@axe-core/playwright` agregado y GVC con `quality.accessibility` por frame.
- Runtime actual de GVC bajo `scripts/frontend/`.
- Scenarios UI recientes que sirven como pilotos:
  - `scripts/frontend/scenarios/organization-list-enterprise-mockup.scenario.ts`
  - scenarios de onboarding/client lifecycle existentes bajo `scripts/frontend/scenarios/`

### Blocks / Impacts

- Implementacion runtime futura de `TASK-1016` Organization List Enterprise Prototype.
- Cualquier task UI con mockup aprobado que requiera copy-and-patch a runtime.
- Mejora la calidad de cierre de UI visible, responsive, microinteractions y accesibilidad.
- Puede alimentar futuros gates CI/manuales, pero esta task no debe encender CI obligatorio global sin decision separada.

### Files owned

- `scripts/frontend/capture.ts`
- `scripts/frontend/diff.ts`
- `scripts/frontend/review.ts`
- `scripts/frontend/health.ts`
- `scripts/frontend/lib/scenario.ts`
- `scripts/frontend/lib/recorder.ts`
- `scripts/frontend/lib/manifest.ts`
- `scripts/frontend/lib/quality.ts`
- `scripts/frontend/lib/report.ts`
- `scripts/frontend/lib/safety.ts`
- `scripts/frontend/lib/failure-taxonomy.ts`
- `scripts/frontend/lib/scenario.test.ts`
- `scripts/frontend/scenarios/_README.md`
- `scripts/frontend/scenarios/*.scenario.ts` `[solo pilots/regression scenarios]`
- `scripts/frontend/README.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md`
- `docs/documentation/plataforma/captura-visual.md`
- `docs/tasks/to-do/TASK-1018-gvc-mockup-runtime-contract-gates.md`

## Current Repo State

### Already exists

- `pnpm fe:capture` con DSL tipado, readiness, assertions, quality findings, multi-viewport, report HTML y baseline metadata.
- `pnpm fe:capture:review`, `pnpm fe:capture:diff`, `pnpm fe:capture:health`, `pnpm fe:capture:gc`.
- `@axe-core/playwright` como `devDependency`.
- `quality.accessibility` opt-in por scenario, con artifacts `frames/*.axe.json`.
- `applySecretMask` ya oculta secretos y chrome de desarrollo local conocido (`nextjs-portal`, TanStack Query Devtools) para evidencia limpia.
- `CaptureFinding` ya soporta category `accessibility`.
- `organization-list-enterprise-mockup` corre desktop/mobile con axe y 0 findings.

### Gap

- `baseline.approvedMockupCaptureDir` existe como metadata, pero no hay diff semantico/productivo mockup -> runtime.
- `fe:capture:diff` no expresa todavia tolerancias por seccion, masks ni contratos de paridad visual aprobada.
- No hay layout integrity gate para detectar overlap, overflow, text clipping, botones demasiado pequenos, scroll horizontal inesperado o fixed elements tapando contenido.
- No hay gate estricto de consola/hydration/unhandled errors integrado al manifest.
- No hay Playwright trace on failure como artifact canonico de GVC.
- Axe no cubre por si solo foco/keyboard path, reduced motion ni calidad de microinteractions.
- No hay budget opt-in de performance/DOM/network para escenarios criticos.
- No hay data honesty gate para detectar fake-green visual: placeholders, `TBD`, demasiados `0`/`—` sin contexto, o KPIs sin source.
- El dossier todavia no tiene rubric enterprise estructurada ni un resumen ejecutivo que diga "apto para implementar" vs "requiere iteracion".

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

### Slice 1 — Baseline Visual Contract

- Convertir `scenario.baseline.approvedMockupCaptureDir` en input real de `fe:capture:diff` y/o `fe:capture`.
- Soportar comparacion mockup -> runtime por:
  - viewport;
  - frame label;
  - `clipSelector` / `data-capture`;
  - full frame cuando no exista selector.
- Agregar opciones declarativas:
  - `baseline.requiredFrameLabels`;
  - `baseline.maskSelectors`;
  - `baseline.maxDiffRatio`;
  - `baseline.maxChangedPixels`;
  - `baseline.requiredRegions`.
- Emitir findings en manifest/report:
  - `baseline_missing`;
  - `frame_label_missing`;
  - `visual_diff_exceeded`;
  - `required_region_missing`;
  - `mask_selector_missing`.
- Mantener salida humana: PNG diff/overlay o artifact JSON suficiente para review.

### Slice 2 — Layout Integrity Gate

- Agregar `quality.layout` opt-in por scenario.
- Detectar best-effort:
  - elementos con bounding box fuera del viewport o del contenedor;
  - overflow horizontal no esperado;
  - texto truncado/cortado en controles comunes;
  - botones/targets debajo de tamaño minimo;
  - regiones scrollables sin foco o sin label;
  - fixed/floating elements tapando contenido capturado;
  - cards anidadas cuando el DOM/MUI classes permitan detectarlo con baja flakiness.
- Permitir `allowHorizontalScrollSelectors`, `ignoreSelectors`, `minTargetSize`.
- Registrar findings con selector, bounding box y frame label.

### Slice 3 — Console, Hydration and Network Strict Mode

- Agregar collectors durante la captura para:
  - `console.error`;
  - `pageerror`;
  - `unhandledrejection` si Playwright lo expone via page events/evaluate;
  - warnings de hydration/React/Next cuando sean detectables;
  - responses `4xx/5xx` de document/xhr/fetch relevantes.
- Agregar `quality.runtime` opt-in con thresholds:
  - `failOnConsoleError`;
  - `failOnPageError`;
  - `failOnHydrationWarning`;
  - `failOnHttpStatus`;
  - `ignoreUrlPatterns`;
  - `ignoreConsolePatterns`.
- Sanitizar mensajes antes de persistirlos.
- Incluir resumen en manifest y dossier.

### Slice 4 — Playwright Trace on Failure

- Integrar tracing de Playwright en GVC con default `retain-on-failure` para scenarios.
- Guardar `trace.zip` dentro del capture dir cuando:
  - falla un step;
  - hay finding `severity=error`;
  - capture exitCode = 1.
- Agregar metadata en manifest/report apuntando al trace.
- Mantener video/frame output actual.
- Documentar como abrir el trace con Playwright Trace Viewer.

### Slice 5 — Keyboard, Focus and Reduced Motion Gates

- Extender `interaction` o agregar `quality.keyboard` para rutas de teclado:
  - secuencia de `Tab`, `Enter`, `Space`, `Escape`;
  - expected focus selector;
  - required visible focus ring;
  - expected expanded/selected state tras keyboard action.
- Agregar variante reduced-motion opt-in:
  - mismo scenario o interaction bajo `prefers-reduced-motion`;
  - findings si la UI pierde feedback esencial sin motion.
- Producir frames before/during/after con labels consistentes.
- No exigir animacion; exigir feedback usable.

### Slice 6 — Performance and Resource Budgets Opt-In

- Agregar `quality.performance` opt-in liviano usando Playwright/CDP/browser APIs disponibles antes de instalar herramientas pesadas:
  - DOM node count;
  - request count;
  - total transferred bytes aproximado si esta disponible;
  - long tasks via PerformanceObserver/evaluate si es viable;
  - CLS/LCP/FCP aproximados si son estables localmente;
  - memory metrics solo si Chromium los entrega sin flakiness.
- Definir budgets por scenario, no globales.
- Lighthouse/LHCI queda como sub-slice opcional y solo si el discovery confirma Node/runtime compatible y costo aceptable.
- Findings deben ser warning por default, error solo si el scenario opt-in lo declara.

### Slice 7 — Data Honesty and Enterprise Rubric

- Agregar `quality.enterpriseRubric` opt-in para evidence heuristics:
  - placeholders (`Lorem`, `TBD`, `mock`, `fake`, `todo`);
  - exceso de `—`/`0` visibles sin contexto;
  - botones primarios multiples en un mismo header/workbench;
  - tabla plana como unica superficie cuando existe baseline list-detail aprobado;
  - saturacion cromatica aproximada por conteo de semantic warning/error/accent chips;
  - falta de `data-capture` en regiones declaradas.
- Generar un summary de rubric en `index.html` y `review-dossier.md`:
  - `pass`;
  - `warning`;
  - `blocked`;
  - findings accionables.
- Mantener el criterio como apoyo a review humano; no venderlo como juicio estetico absoluto.

### Slice 8 — Docs, Regression Scenarios and Adoption Path

- Actualizar:
  - `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`;
  - `docs/manual-de-uso/plataforma/captura-visual-playwright.md`;
  - `docs/documentation/plataforma/captura-visual.md`;
  - `scripts/frontend/README.md`;
  - `scripts/frontend/scenarios/_README.md`.
- Crear o actualizar scenarios de regresion:
  - uno mockup -> runtime/baseline synthetic o real;
  - uno layout integrity;
  - uno console/runtime strict;
  - uno keyboard/focus;
  - uno performance warning-only.
- Documentar patron para tasks UI:
  - mockup aprobado;
  - runtime scenario con `baseline.approvedMockupCaptureDir`;
  - GVC diff;
  - axe/layout/runtime/focus gates;
  - review humano.

## Out of Scope

- Encender GVC como gate obligatorio de CI global.
- Reemplazar Playwright E2E, unit tests, design review humano o `design:lint`.
- Implementar redisenos de superficies especificas como parte de esta task.
- Instalar servicios externos de visual regression SaaS.
- Usar production captures sin Triple Gate.
- Persistir screenshots/artifacts fuera de `.captures/` o subirlos por default.
- Crear un "score estetico" absoluto que bloquee cambios sin revision humana.

## Detailed Spec

### Desired scenario shape

Ejemplo ilustrativo para una adopcion runtime futura:

```ts
export const scenario: CaptureScenario = {
  name: 'organization-list-runtime-contract',
  route: '/agency/organizations',
  viewport: { width: 1440, height: 900 },
  baseline: {
    surfaceId: 'agency.organizations.list',
    baselineName: 'organization-list-enterprise-approved',
    approvedMockupCaptureDir: '.captures/2026-06-05T10-40-50_organization-list-enterprise-mockup',
    requiredFrameLabels: ['first-fold', 'matrix-mode', 'filtered-risk'],
    maskSelectors: ['[data-dynamic-count]', '[data-relative-time]'],
    maxDiffRatio: 0.08
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="organization-list"]'
    },
    layout: {
      enabled: true,
      ignoreSelectors: ['[aria-label="Abrir Nexa AI"]']
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true
    },
    keyboard: {
      enabled: true
    },
    performance: {
      enabled: true,
      severity: 'warning'
    },
    enterpriseRubric: {
      enabled: true
    }
  },
  steps: [
    { kind: 'mark', label: 'first-fold' },
    { kind: 'click', selector: 'button[aria-label="Vista matriz"]' },
    { kind: 'mark', label: 'matrix-mode' }
  ]
}
```

### Artifact requirements

- `manifest.json` debe conservar backward compatibility con `schemaVersion: 1` mediante campos aditivos o bump documentado si inevitable.
- `index.html` debe mostrar:
  - findings agrupados por category;
  - visual diff artifacts;
  - trace link cuando exista;
  - summary enterprise;
  - captured frame thumbnails.
- `.captures/` sigue gitignored.
- Findings deben ser cortos, accionables y con selector/frame cuando aplique.

### Flakiness guardrails

- Cada gate nuevo empieza opt-in.
- Thresholds default conservadores.
- Los checks heurísticos deben preferir warning sobre error salvo que el scenario declare fail-hard.
- Selectores dinamicos deben poder enmascararse.
- El diff visual debe preferir `clipSelector`/`data-capture` antes que full-page.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (baseline visual contract) MUST ship before enterprise runtime adoption tasks depend on GVC diff.
- Slice 2 (layout integrity) and Slice 3 (runtime strict) can ship after Slice 1 and are independent.
- Slice 4 (trace on failure) SHOULD ship before gates become fail-hard in many scenarios.
- Slice 5 (keyboard/focus) depends on interaction V2 semantics from `TASK-953`.
- Slice 6 (performance) MUST remain opt-in until at least two scenarios prove stability.
- Slice 7 (enterprise rubric) MUST be warning-first and reviewed by humans before any error-mode use.
- Slice 8 closes docs and regression scenarios after primitives are stable.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Visual diff flaky por data dinamica, fuentes o antialiasing | UI tooling | medium | masks, clipSelector, thresholds conservadores, warning-first en pilotos | GVC capture failures recurrentes sin cambios UI |
| Gates lentos reducen adopcion local-first | platform/ops | medium | opt-in por scenario, trace retain-on-failure, performance warning-only | feedback de agentes / durationMs alto en manifest |
| Heuristicas enterprise bloquean criterios legitimos de producto | ui/design | medium | rubric advisory por default, docs claras, override con razon | review humano contradice findings repetidamente |
| Console/network collector registra informacion sensible | security/ops | low | sanitizar, truncar, ignore patterns, no payload bodies | secret hygiene finding / manifest con token |
| Trace artifacts crecen demasiado | ops/storage | medium | retain-on-failure, gc existente, no upload default | `.captures` health/gc report alto |
| Layout integrity genera falsos positivos en UI con scroll legitimo | UI | medium | allow selectors, per-scenario config, warning-first | findings repetidos en regiones declaradas |

### Feature flags / cutover

Sin flags runtime. Cambio de tooling local-first y aditivo.

Gates por scenario:

- `quality.layout.enabled`
- `quality.runtime.failOn*`
- `quality.keyboard.enabled`
- `quality.performance.enabled`
- `quality.enterpriseRubric.enabled`
- `baseline.*`

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir cambios de baseline diff y scenario pilots | <30 min | si |
| Slice 2 | Desactivar `quality.layout` en scenarios o revertir helper | <15 min | si |
| Slice 3 | Desactivar `quality.runtime` en scenarios o revertir collector | <15 min | si |
| Slice 4 | Desactivar tracing retain-on-failure o revertir integration | <15 min | si |
| Slice 5 | Desactivar keyboard/reduced-motion gates en scenarios | <15 min | si |
| Slice 6 | Mantener performance warning-only o remover budgets del scenario | <15 min | si |
| Slice 7 | Mantener rubric advisory o revertir report section | <15 min | si |
| Slice 8 | Revertir docs/regression scenarios | <15 min | si |

### Production verification sequence

N/A — tooling local/staging-first, sin rollout productivo ni cambios de runtime portal.

Verificacion de adopcion:

1. Ejecutar scenarios regression GVC en local.
2. Verificar que un scenario con mockup baseline produce `exitCode=0` cuando no hay drift.
3. Verificar fixture/pilot con drift controlado produce finding esperado.
4. Verificar que `fe:capture:review` renderiza todos los findings nuevos.
5. Verificar `fe:capture:health` no queda roto por manifests aditivos.

### Out-of-band coordination required

N/A — repo-only tooling. Si se decide instalar Lighthouse/LHCI o publicar artifacts fuera de `.captures/`, abrir decision separada antes de implementar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] GVC puede comparar una captura runtime contra un mockup aprobado usando `baseline.approvedMockupCaptureDir`.
- [ ] El diff visual soporta frame labels, viewports, masks y thresholds configurables.
- [ ] `quality.layout` detecta al menos overflow/overlap/target-size/scroll-region cases con findings accionables.
- [ ] `quality.runtime` captura console/page/hydration/network failures sanitizados y configurables.
- [ ] GVC guarda Playwright `trace.zip` on failure y lo referencia en manifest/report.
- [ ] Keyboard/focus/reduced-motion gates existen como opt-in y tienen al menos un scenario regression.
- [ ] Performance/resource budgets existen como opt-in warning-first.
- [ ] Enterprise rubric aparece en dossier/report como advisory structured summary.
- [ ] Docs GVC quedan sincronizadas con las primitives nuevas.
- [ ] Scenarios regression prueban al menos baseline diff, layout, runtime strict, keyboard/focus y report rendering.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run scripts/frontend/lib/scenario.test.ts`
- `pnpm fe:capture <new-regression-scenario> --env=local`
- `pnpm fe:capture:review <capture-dir>`
- `pnpm fe:capture:health`
- `pnpm docs:closure-check -- scripts/frontend docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md docs/manual-de-uso/plataforma/captura-visual-playwright.md docs/documentation/plataforma/captura-visual.md`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta (`to-do/`, `in-progress/`, `complete/`)
- [ ] `docs/tasks/README.md` actualizado
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` actualizado
- [ ] `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md` actualizado con delta V1.5 o version que corresponda
- [ ] `scripts/frontend/README.md` actualizado
- [ ] `scripts/frontend/scenarios/_README.md` actualizado
- [ ] `docs/manual-de-uso/plataforma/captura-visual-playwright.md` actualizado
- [ ] `docs/documentation/plataforma/captura-visual.md` actualizado
- [ ] `Handoff.md` actualizado con pilotos, comandos y limites
- [ ] `greenhouse-documentation-governor` ejecutado antes de cierre completo

## Follow-ups

- Evaluar si algun gate pasa de opt-in local a CI advisory para PRs UI.
- Evaluar integracion con Lighthouse/LHCI solo si performance budgets livianos no alcanzan.
- Crear una task separada para aplicar el contrato a `TASK-1016` runtime `/agency/organizations`.
