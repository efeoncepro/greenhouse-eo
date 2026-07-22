# TASK-1505 — Execution Plan

- Fecha: 2026-07-22
- Estado: aprobado por el operador dentro del goal Producer end-to-end
- Source led: `docs/ui/visual-sources/TASK-1505/approved-prototype.dc.html`
- Runtime: `/Users/jreye/Documents/efeonce-globe/apps/studio-web`
- Skills: `greenhouse-globe`, `greenhouse-ai-design-studio`, `greenhouse-ui-orchestrator`,
  `greenhouse-ux-content-accessibility`, `greenhouse-browser-diagnostics`

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
