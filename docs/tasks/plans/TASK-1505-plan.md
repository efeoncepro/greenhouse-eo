# TASK-1505 — Execution Plan

- Fecha: 2026-07-22
- Estado: aprobado por el operador dentro del goal Producer end-to-end
- Source led: `docs/ui/visual-sources/TASK-1505/approved-prototype.dc.html`
- Runtime: `/Users/jreye/Documents/efeonce-globe/apps/studio-web`
- Skills: `greenhouse-globe`, `greenhouse-ai-design-studio`, `greenhouse-ui-orchestrator`,
  `greenhouse-ux-content-accessibility`, `greenhouse-browser-diagnostics`

## Execution checkpoint 2026-07-22 — cierre de gaps live-verified

- Goal confirmado por el operador: cerrar wiring y evidencia propia de TASK-1505 sin absorber rollout ni
  foundations backend de otras tasks.
- Excepción de rama autorizada: mantener `greenhouse-eo` en `develop`; no cambiar de branch ni crear worktree.
  El repo hermano `efeonce-globe` permanece en su branch actual `main`, sin cambio de branch, porque el override
  de develop gobierna el checkout Greenhouse y Globe no tiene un checkout `develop` activo.
- Subagentes: `fork recomendado, no autorizado`; la ejecución será secuencial. Los gaps convergen en
  `producer-controller.ts`, `producer-client.ts`, `producer-ui.ts`, sus tests y el fixture GVC, por lo que un fork
  además aumentaría el riesgo de colisión.
- Estado de árbol preservado: no tocar `scripts/allocate-internal-credits.mjs` sin trackear en Globe ni los tres
  directorios `ai-generations/2026-07-22_mural-guacamayas-*` sin trackear en Greenhouse.

## Audit 2026-07-22

### Supuestos correctos

- El runtime vive en `/Users/jreye/Documents/efeonce-globe/apps/studio-web`; Greenhouse conserva task, ADR,
  evidencia, QA y handoff.
- Browser → BFF same-origin → API privada sigue siendo la frontera. No se requieren endpoints, migrations,
  provider SDKs ni authority browser-side nuevos.
- El baseline source-led, wireframe, flow, motion, scenario premium y pattern `Producer Console` ya existen;
  la decisión sigue siendo `extend`, no una primitive Greenhouse ni un layout Vuexy.

### Supuestos desactualizados

- `requestEstimate()` y `estimateIsCurrent()` existen pero no tienen caller. `Generate` se habilita con
  `canBuildPayload()` y el test prohíbe una acción estimate: el costo pre-spend no está cableado.
- `ProducerInput`/`generate()` descartan `structuredBrief`, `style` y `recipe` antes de `prepare`. Esto deja sin
  efecto conditioning ya construido y bloquea un seed gobernado aunque `PrepareExperimentPayloadV1.recipe`
  exista y se valide server-side.
- El campo negative prompt es un stub deshabilitado. No hace falta inventar un campo vendor: se modelará como
  constraint explícita dentro del `StructuredBriefV1.notes` ya canónico, compilado server-side.
- Los seis modos que consumen assets/provenance se habilitan por `globe.lab.experiment.prepare`. La coverage
  estática no refleja el kill switch runtime de TASK-1467; se requiere un probe read-only al reader canónico
  `globe.asset.provenance.list` y un estado UI fail-closed.
- Existe CSS `max-width:430px`, pero la task no tiene contrato mecánico exacto de 390 px ni evidencia de los
  nuevos controles/overlays ricos. Se agregará una regla 390 px focal y se medirá DOM real.
- `Handoff.md` afirma score 4.74/PASS, mientras task y scorecard canónicos están en 4.39/BLOCK. La task,
  scorecard y evidencia prevalecen y el handoff se reconciliará al cierre.

### Arquitectura y acceso

- ADR vigente: `EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md`; no se requiere ADR nueva porque no
  cambia el trust boundary ni el source of truth.
- Access impact: entitlement/capability + runtime policy de Globe. No aplican `routeGroups`, `views` ni startup
  policy de Greenhouse.
- Modular placement validado: current home, boundary, server/browser split, build impact y extraction blocker
  coinciden con el repo real. No se crea topología nueva.

### Baseline verificado

- Greenhouse: task lint, wireframe, flow, motion y readiness pasan sin findings.
- Globe: `pnpm check && pnpm build` pasan antes del cambio; 182 tests de `studio-web` y suites del monorepo verdes.

### Riesgos / blast radius

- Un estimate stale no puede habilitar gasto; el controller exige firma vigente y el client vuelve a cotizar al
  confirmar para proteger cambios concurrentes.
- El probe de provenance es read-only, tenant-scoped y usa el reader compartido; `policy_blocked`,
  `access_denied` o dependencia degradada mantienen los modos cerrados sin convertir metadata en autoridad.
- La evidencia rica será fixture HTTP contract-backed para calidad visual. No se presentará como staging/live,
  ni reemplazará migrations, grants, workers, provider canaries o generación facturable.

## Plan de cierre aprobado y ejecutado

1. **Wiring pre-spend y conditioning gobernado.** Modificar `producer-client.ts`, `producer-controller.ts`,
   `producer-ui.ts` y copy/tests para preservar `structuredBrief|style|recipe`, agregar `Calcular costo`, exigir
   `estimateIsCurrent()` para `Generate`, y cablear negative constraint + seed lock/input/reroll por contratos
   existentes. Sin schema/API nuevo.
2. **Autoridad real de modos y 390 px.** Probar provenance mediante `globe.asset.provenance.list`, mantener
   cerrados los seis modos dependientes cuando el runtime no está listo, añadir markers
   `producer-seed|producer-shape|producer-asset-actions`, y reforzar recomposición exacta a 390 px.
3. **Fixture y GVC ricos.** Extender `producer-gvc-fixture.mjs` con proyecciones tipadas y estados visuales
   durables representativos; ampliar el scenario para composer estimate/seed/gates, feed/viewer, inpaint,
   presupuesto, palette/cuenta, desktop/mobile, foco y reduced motion. El fixture no adquiere autoridad ni
   simula un provider billable.
4. **Iteración enterprise.** Ejecutar tests focales y `pnpm check && pnpm build`; levantar el fixture, correr
   GVC premium, inspeccionar PNG/ARIA/dossier y medir `scrollWidth === clientWidth` en 1440 y 390. Iterar hasta
   los mínimos visuales o registrar un blocker exacto sin bajar thresholds.
5. **Cierre documental honesto.** Actualizar scorecard/audit/task/Handoff/changelog según evidencia, ejecutar
   `ui:quality`, `qa:gates --changed`, `ops:lint --changed`, `docs:closure-check` y
   `docs:context-check:strict`. Mantener TASK-1505 `in-progress` como `code complete, rollout pendiente` si
   siguen faltando runtime/deploy/canarios de tasks dependientes; no promover a `complete` por código local.

## Resultado 2026-07-22

- Los cinco pasos se ejecutaron dentro del ownership aprobado, sin subagentes, cambio de rama, deploy ni gasto.
- Globe pasa `pnpm check && pnpm build`; Studio Web queda en 185/185 tests.
- GVC final: `.captures/2026-07-22T23-03-58_globe-creative-producer/`, 2 variantes, 38 frames, desktop y
  390 px, teclado/reduced motion, 0 errores y enterprise rubric PASS.
- Scorecard final: 4.72/5, mínimo 4.6, sin dimensiones bajo umbral ni blockers visuales.
- Estado: `code complete, rollout pendiente`; TASK-1505 conserva lifecycle `in-progress` hasta evidencia del
  runtime desplegado y cierre de sus dependencias.

## Request normalization

- Actor: humano; diseño Claude aprobado, no intención exploratoria.
- Surface: `/producer`, consola creativa prompt-first; heavy actions; shared product UI propia de Globe.
- Intent: componer, estimar, generar y continuar activos Image/Video/Audio sin saltar de herramienta.
- Data: catálogo/estimate/run/output/actions reales para el first fold; el resto es parcial y debe verse gated, nunca fake.
- Señal dominante: composer cross-modal + costo previo `✨N`; feed/candidato es continuidad inmediata.
- Reuse decision: `extend`. Se extiende el shell Node/SSR de Globe con patterns Producer propios; no se importa
  CompositionShell/Vuexy ni se copia el estado local del prototipo.

## Visual decision

Se conserva la dirección aprobada: rail estructural, stage editorial oscuro, composer claro dominante, modos
Image/Video/Audio, biblioteca cross-modal y viewer. Se rechazan un dashboard de cards uniforme y un DAG técnico.
El first fold mobile recompone rail/header/composer/feed a una columna de 390 px; no oculta overflow.

## Slices

### 1. Route, shell and copy

- `/producer` autenticada; `/studio` deriva a la consola cuando el bridge está habilitado.
- Módulo de copy tipado y tokens/patterns CSS de Globe.
- Shell responsive con modos, project/budget context, composer, estimate, feed y estados honestos.
- Semántica, foco, tabs, labels, live regions, reduced motion y markers GVC.

### 2. Browser bridge client

- Bootstrap de sesión/CSRF y manifest de capabilities same-origin.
- Readers catálogo/estimate y commands prepare/execute con correlation/idempotency estables.
- Estados loading/empty/degraded/error/success sin provider metadata ni autoridad local.
- Output retrieval por fetch con grant en header y blob URL; nunca grant en URL/log.

### 3. Modalities and output shape

- Image primero con contrato real.
- Video y Audio comparten chassis y envían shapes discriminados; controles no operativos permanecen visibles gated.
- Modelo/ruta viene del catálogo; `✨N` viene del reader estimate, nunca cálculo browser.

### 4. Feed/viewer and foundations

- Integrar output descriptors, favorite/copy-as-reference y Range media.
- Preparar seams de library/viewer/lineage/refinement sin inventar persistence; conectar conforme cierren sus tasks.
- Completar sucesivamente TASK-1467/1469/1493/1494/1496/1497/1498/1520/1472/1468/1482/1511.

### 5. Visual verification

- Tests SSR/DOM contract y browser interactions.
- Captura local 1440 y 390, teclado, reduced motion, console/page errors y `scrollWidth===clientWidth`.
- Promover baseline/dossier/scorecard sólo después de revisar PNG reales.

## Parallel ownership

- Worker UI: render/CSS/copy de `/producer`, sin tocar BFF/infra.
- Worker client: browser controller y tests del transport same-origin, sin tocar render/CSS.
- Root: route integration, contracts, verification, GVC y consolidación.

## Rollout boundary

La UI se puede construir y probar localmente con el bridge real. Promoción interna exige TASK-1519: plan Terraform
sin replace, versiones raw de dos secrets, grants broker, flags y smokes positivos/negativos. Commercial sigue en
TASK-1521. Ninguna de esas ausencias autoriza a reemplazar runtime por fixtures de negocio.
