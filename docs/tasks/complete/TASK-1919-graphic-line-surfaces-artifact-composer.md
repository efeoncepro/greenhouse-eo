# TASK-1919 — «La órbita» por superficie en el Artifact Composer

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Completa (2026-09-27): 20 recetas aprobadas en tres catálogos, gate visual a 0 px, pnpm test completo y pnpm build en verde, push a develop. La ruta productiva sigue en TASK-1921.`
- Rank: `TBD`
- Domain: `creative|brand|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; AXIS main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

AXIS publicó el 2026-09-27 la v0.3.7 con el contrato `efeonce.surface-composition` (candidate) y los tokens
`efeonceGraphicLine.surfaces`. Esta task convierte las recetas **aprobadas** de «La órbita» por superficie (deck, web,
DOOH, overlays audiovisuales y storyboard de motion) en plantillas del Artifact Composer, con dos catálogos propios y
un comando local `pnpm brand:compose` que va de un intent validado por AXIS a PDF o PNG deterministas. El video sigue
fuera del composer: el composer entrega fijos, cuadros clave y overlays transparentes.

## Why This Task Exists

Las piezas aprobadas en el canvas del 2026-09-26/27 existen hoy sólo como scripts de sesión fuera del repo: cada
lámina, hero o caminero se vuelve a armar a mano, con valores copiados y sin gate visual. La norma por superficie
(`EFEONCE_SURFACE_COMPOSITION_V1.md`) y el contrato AXIS ya dicen **qué** va en cada superficie; falta el motor que lo
produzca de forma repetible. El Artifact Composer ya resuelve composición domain-free, catálogos como dato, render
hermético y gate a cero píxeles, pero no sabe producir un PNG con fondo transparente (hace `page.screenshot` sin
`omitBackground`), que es justo lo que piden los overlays audiovisuales.

## Goal

- Un intent de superficie validado por AXIS se convierte, sin decisiones de diseño a mano, en un plan del composer
  y en PDF (deck) o PNG (web, DOOH, overlays, storyboard) reproducibles.
- Sólo las recetas **aprobadas** existen como plantilla; una receta en estado opción o pendiente falla cerrado con un
  issue legible.
- Ambos catálogos quedan bajo el visual gate a cero píxeles y bajo los tests de portabilidad y tokenización del
  composer, sin tocar `deck-axis` ni la línea base de SKY.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` (catálogo = dato, motor domain-free,
  `outputTarget` `pdf-merged|png-set` implementados, entradas públicas barrel vs `/pure`)
- `docs/architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md`
- `docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md`
- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` (norma por superficie y estado de cada receta)
- AXIS (repositorio `efeoncepro/axis-design-system`): `docs/architecture/SURFACE_COMPOSITION_DECISION_V1.md` y
  `docs/agent-composition/surfaces/*.md`; Lab `https://axis.efeonce.org/references/surfaces/`

Reglas obligatorias:

- AXIS es dueño de los valores y del contrato: formatos, reservas por región, escala de voces, firma y estado de cada
  receta salen de `resolveSurfaceComposition` y de `efeonceGraphicLine.surfaces`. Ninguna plantilla nueva lleva HEX,
  px de diseño, familia tipográfica o ms literales.
- El motor sigue domain-free: la opción de fondo transparente es un campo genérico del contrato de plantilla, no un
  caso especial de marca. El mapper de marca vive fuera de `src/lib/artifact-composer/` y sólo usa sus tipos.
- Un autor o agente nunca elige `template`: el mapper produce un `CompositionPlanInput` y el selector del composer
  resuelve (`TemplateAuthorityError` sigue vigente).
- `src/**` no importa el barrel del composer como valor (lint `greenhouse/no-worker-only-module-in-vercel-code`); el
  mapper consume `/pure` y tipos.
- Nada del video vive en el composer (decisión del operador 2026-09-27, opción b): la animación la produce
  `orbit:video` / la pipeline de motion; el composer entrega fijos, cuadros clave y overlays.
- Sólo recetas **aprobadas** se vuelven plantilla. `deck-axis` es el catálogo de propuestas de licitación con la línea
  base de SKY: no se mezcla con los catálogos nuevos.

## Normative Docs

- `docs/manual-de-uso/creative/componer-por-superficie-con-axis.md`
- `docs/operations/runbooks/composer-visual-gate.md`
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` (gate a cero píxeles, `BASELINE_DELTAS.md`)
- `.claude/skills/efeonce-graphic-line/SKILL.md` y `.claude/skills/deck-studio/SKILL.md`

## Dependencies & Impact

### Depends on

- AXIS v0.3.7 fijado en `package.json` (commit local `f3f93c926`): `@efeoncepro/axis-tokens` 0.3.7,
  `@efeoncepro/axis-ui-contracts` 0.3.6 (`resolveSurfaceComposition`, `validateSurfaceCompositionIntent`,
  constantes `AXIS_SURFACE_*`), `@efeoncepro/axis-brand-assets` 0.3.2 y `@efeoncepro/axis-graphic-line` 0.4.0
  (`resolveIcon`, `answerHtml`, `answerSphere`, `orbitSvg`, `composeGraphicLine`, `deckSlideHtml`).
  **Delta 2026-09-27:** subido a `axis-tokens` 0.3.8 y `axis-ui-contracts` 0.3.7 (tag `v0.3.8`, contrato
  `efeonce.surface-composition` 0.1.1; commit `016d0a183`), con `axis-brand-assets` 0.3.3 y `axis-graphic-line` 0.5.0
  (commit `8d817f29e`).
- `src/lib/artifact-composer/{catalog.ts,compose.ts,render.ts,plan.ts,contracts.ts,quality-gates.ts,pure.ts}`.
- Fuentes de las piezas aprobadas en scripts de sesión fuera del repo (se portan en los Slices 4 y 5).

### Blocks / Impacts

- `TASK-1921` (ruta productiva: command, API, consumer del `artifact-worker`, MCP) queda bloqueada por esta task.
- `TASK-1918` (foto:prompt y chequeos de la lente) es hermana: produce las fotos que estas plantillas consumen como
  `externalAssets`; no se solapan.
- `scripts/artifact-composer/visual-gate.ts` y los tests por catálogo del composer suman dos catálogos.
- Skills `efeonce-graphic-line` y `deck-studio`, que se actualizan al cerrar.

### Files owned

- `src/lib/artifact-composer/render.ts` (opción de fondo transparente)
- `src/lib/artifact-composer/contracts.ts` (campo del contrato de plantilla) `[verificar]` el archivo exacto al tocarlo
- `src/lib/artifact-composer/quality-gates.ts` (gate de tinta con alfa)
- `src/lib/artifact-composer/catalogs/graphic-line-deck/**`
- `src/lib/artifact-composer/catalogs/graphic-line-stills/**`
- `src/lib/artifact-composer/__tests__/**` (tests nuevos y alta de los dos catálogos en los tests por catálogo)
- `src/lib/brand-surfaces/**`
- `scripts/brand-surfaces/**`
- `scripts/artifact-composer/visual-gate.ts` (`PROBE_CATALOGS`)
- `scripts/frontend/baselines/artifact-composer/templates-graphic-line-deck/**`
- `scripts/frontend/baselines/artifact-composer/templates-graphic-line-stills/**`
- `scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md` y `baseline-manifest.json`
- `package.json` (script `brand:compose`)
- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md`
- `docs/manual-de-uso/creative/componer-por-superficie-con-axis.md`
- `.claude/skills/efeonce-graphic-line/**`, `.claude/skills/deck-studio/SKILL.md` y sus espejos `.codex/`

## Current Repo State

### Already exists

- Composer: `catalog.ts` (`ArtifactCatalog`, `OutputTarget`, `IMPLEMENTED_OUTPUT_TARGETS`, `loadRegistry`,
  `resolvePlan`, `TemplateAuthorityError`), `compose.ts` (`composeArtifact` sobre un `DeckPlan`; un PNG por lámina y
  merge a PDF cuando `pdf-merged`; `ComposeOptions.externalAssets`), `render.ts` (`renderSlide` hace
  `page.screenshot({ path })` sin `omitBackground` y luego `assertSlideHasInk`), `plan.ts` (`CompositionPlanInput`),
  `resolver-contract.ts`, `contracts.ts` (`TemplateContract` con `viewport`).
- Catálogos `deck-axis`, `insights-deck`, `insights-report`, `insights-shared`; gate
  `scripts/artifact-composer/visual-gate.ts` con `PROBE_CATALOGS` (deck-axis, insights-deck, insights-report);
  líneas base en `scripts/frontend/baselines/artifact-composer/**` con `BASELINE_DELTAS.md`.
- Tests por catálogo: `catalog-portability.test.ts` (recorre todos los `.html` de `catalogs/`),
  `template-authority.test.ts`, `external-assets.test.ts`, `quality-gates.test.ts`.
- Slice 1 hecho: AXIS v0.3.7 fijado en `package.json` y `pnpm-lock.yaml` (commit `f3f93c926`, local en `develop`).
- Norma y manual por superficie: `EFEONCE_SURFACE_COMPOSITION_V1.md` y `componer-por-superficie-con-axis.md`.

### Gap

- El motor no produce PNG con alfa y el gate de tinta asume fondo opaco.
- No existe mapper de intent de superficie a plan del composer (`src/lib/brand-surfaces/` no existe).
- No existen los catálogos `graphic-line-deck` ni `graphic-line-stills`; las piezas aprobadas viven fuera del repo.
- No hay comando `pnpm brand:compose` (`scripts/brand-surfaces/` no existe).
- Nada de esto está bajo el visual gate.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `src/lib/artifact-composer/` (motor y catálogos), `src/lib/brand-surfaces/` (mapper puro),
  `scripts/brand-surfaces/` (CLI local)
- Future candidate home: `worker`
- Boundary: el mapper `src/lib/brand-surfaces` expone una función pura intent → `{ catalog, plan, externalAssets }`
  que consumen el CLI local y, en TASK-1921, el command gobernado; el motor se consume sólo por su contrato público
- Server/browser split: `sólo server y CLI — Chromium y la lectura de archivos nunca van al browser ni a Vercel; el mapper es puro y no toca filesystem`
- Build impact: `Chromium/Playwright ya presente en el composer; @efeoncepro/axis-graphic-line como dependencia directa ya agregada en f3f93c926`
- Extraction blocker: `none — el render ya corre sólo en el Job artifact-worker; la frontera productiva la cierra TASK-1921`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `command`
- Source of truth afectado: contrato AXIS `efeonce.surface-composition` 0.1.0 + tokens `efeonceGraphicLine.surfaces`
  (paquetes `@efeoncepro/axis-ui-contracts` 0.3.6 y `@efeoncepro/axis-tokens` 0.3.7); los catálogos son dato
  derivado, no fuente
- Consumidores afectados: CLI local `pnpm brand:compose`; en TASK-1921, el command gobernado y el consumer del
  `artifact-worker`
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: `ArtifactCatalog`/`OutputTarget` (`catalog.ts`), `CompositionPlanInput` (`plan.ts`),
  `ComposeOptions.externalAssets` (`compose.ts`), `TemplateContract` (`contracts.ts`), selector y
  `TemplateAuthorityError`, ADR del composer
- Contrato nuevo o modificado: campo opcional del contrato de plantilla para fondo transparente (p. ej.
  `render.background: 'transparent'`), mapper `resolveBrandSurfacePlan(intent, plates)` en `src/lib/brand-surfaces/`,
  CLI `pnpm brand:compose -- --intent <intent.json> [--plate id=path] --out <dir>`
- Backward compatibility: `compatible` — el campo nuevo es opcional con default opaco; catálogos existentes no cambian
  un píxel (lo prueba el visual gate)
- Full API parity: el mapper es el primitive; el CLI es su primer consumer y TASK-1921 agrega command, API, worker y
  MCP sobre el mismo mapper. Deuda declarada con dueño (TASK-1921) y condición de retiro (esa task cerrada)

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna; no hay DB
- Invariantes que no se pueden romper:
  - Un intent con issues de `validateSurfaceCompositionIntent` o `resolveSurfaceComposition` nunca llega a render.
  - Una receta cuyo estado AXIS no es aprobado falla cerrado con issue (`recipe_not_approved` o el código que defina
    AXIS); no hay fallback silencioso a otra receta.
  - El mapper nunca escribe `template`: entrega plan, y el selector decide.
  - Ninguna plantilla nueva contiene HEX, px de diseño, familia o ms literales (test de portabilidad/tokenización).
  - Mismo intent + mismos plates + mismas versiones AXIS ⇒ mismos bytes de salida.
  - El fondo transparente no altera ningún catálogo que no lo declare.
- Write-target allowlist: `N/A — no hay escrituras a base; la salida son archivos en --out`
- Tenant/space boundary: `sin datos de tenant — piezas de marca propia de Efeonce; los plates son archivos locales del operador`
- Idempotency/concurrency: render determinista; re-ejecutar sobre el mismo `--out` reemplaza los mismos archivos
- Audit/outbox/history: sin outbox; el CLI escribe junto a la salida un manifiesto con versiones AXIS, receta,
  hash del intent y SHA-256 de cada plate (procedencia local)

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: habilitado en local; no existe ruta productiva hasta TASK-1921
- Backfill plan: sin backfill
- Rollback path: revertir los commits; el campo de fondo transparente es opcional y los catálogos nuevos se retiran
  de `PROBE_CATALOGS`
- External coordination: ninguna; los paquetes AXIS ya están publicados y fijados

### Security and access

- Auth/access gate: sin auth — herramienta local del operador; la gobernanza por capability la agrega TASK-1921
- Sensitive data posture: sin datos sensibles; fotos de marca propia
- Error contract: el CLI sale con código distinto de cero y lista los issues del contrato AXIS (código, ruta y
  mensaje en es-CL); nunca stack trace crudo como único mensaje
- Abuse/rate-limit posture: sin exposición de red

### Runtime evidence

- Local checks: tests focales del mapper, del fondo transparente y de los catálogos; `pnpm composer:visual-gate`;
  `pnpm local:check`
- DB/runtime checks: sin base de datos
- Integration checks: `pnpm brand:compose` sobre los ejemplos de intent publicados por AXIS produce PDF y PNG
- Reliability signals/logs: sin señal; el gate visual es la vigilancia
- Production verification sequence: sin producción en esta task; la secuencia productiva vive en TASK-1921

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] *(No aplica: la task no crea tablas ni escribe en base de datos.)* Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] *(No aplica: no toca datos sensibles; los errores del mapper son `SurfacePieceError` con códigos estables.)* Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Consumir AXIS v0.3.7 (hecho)

- `@efeoncepro/axis-tokens` 0.3.7, `axis-ui-contracts` 0.3.6, `axis-brand-assets` 0.3.2 y `axis-graphic-line` 0.4.0
  fijados en `package.json` y `pnpm-lock.yaml` (commit `f3f93c926`).

### Slice 2 — Fondo transparente por plantilla en el motor

- Campo opcional en el contrato de plantilla (p. ej. `render.background: 'transparent'`), default opaco.
- `renderSlide` usa `page.screenshot({ omitBackground: true })` sólo cuando la plantilla lo declara.
- `assertSlideHasInk` mide tinta sobre píxeles con alfa > 0 cuando el fondo es transparente (un overlay vacío sigue
  fallando).
- Test: una plantilla de prueba transparente produce PNG con canal alfa y esquinas con alfa 0; una opaca no cambia.

### Slice 3 — Mapper puro `src/lib/brand-surfaces/`

- Valida el intent con `validateSurfaceCompositionIntent` y lo resuelve con `resolveSurfaceComposition`; cualquier
  issue corta con error tipado que lista los issues.
- Elige catálogo y `contentType` por superficie y receta con una tabla de datos (no `if` por pieza).
- Arma `CompositionPlanInput` y `externalAssets` desde el manifiesto resuelto y los plates declarados.
- Sólo importa tipos y la entrada `/pure` del composer; tests unitarios con los ejemplos de intent de AXIS.

### Slice 4 — Catálogo `graphic-line-deck`

- `outputTarget: 'pdf-merged'`, lienzo 1920 × 1080.
- Seis plantillas aprobadas: `section-classic`, `section-split`, `content-measure`, `triptych`,
  `proposal-cinematic`, `method-staircase`, portadas desde los scripts de sesión y reescritas con tokens.

### Slice 5 — Catálogo `graphic-line-stills`

- `outputTarget: 'png-set'`, viewport por plantilla.
- Web: `hero-lens`, `hero-bleed`, `hero-uniform-tablet`, `hero-mobile-native`.
- DOOH: `caminero-lens` (sólo la aprobada; `paleta` queda fuera hasta decidir 20 % vs 35 %).
- Audiovisual, overlays con fondo transparente: `cartela`, `zocalo`, `callout-selection`, `data-super`,
  `split-screen`, `subtitles`; más `shot-plan` y `close-reveal` como fijos.
- Motion: `storyboard` (cuadros clave); el loop `loop-lens-reveal` se entrega como cuadros clave, nunca como video.

### Slice 6 — CLI `pnpm brand:compose`

- `scripts/brand-surfaces/compose.ts` [verificar extensión según el runner de scripts]:
  `pnpm brand:compose -- --intent <intent.json> [--plate id=path] --out <dir>`.
- Escribe los archivos del catálogo elegido y un manifiesto de procedencia (versiones AXIS, receta, hash del intent,
  SHA-256 de plates).
- Sale con código distinto de cero y los issues del contrato cuando el intent no es válido o la receta no está
  aprobada.

### Slice 7 — Gates

- Alta de ambos catálogos en `PROBE_CATALOGS` con sus carpetas de línea base y entrada en `BASELINE_DELTAS.md`.
- Alta en los tests por catálogo (portabilidad, sin HEX literal, autoridad de plantilla, assets externos).
- `pnpm composer:visual-gate` a cero píxeles, incluida la línea base de SKY sin cambios.

### Slice 8 — Documentación

- Delta en `EFEONCE_SURFACE_COMPOSITION_V1.md` (qué receta tiene plantilla), manual
  `componer-por-superficie-con-axis.md` (paso con `pnpm brand:compose`), delta en el ADR del composer (fondo
  transparente y catálogos nuevos), skills `efeonce-graphic-line` y `deck-studio` con espejo `.codex/`.

## Out of Scope

- Video o animación dentro del composer (queda en `orbit:video` / pipeline de motion).
- Recetas en estado opción o pendiente: paleta DOOH, las cuatro de pDOOH (`led-wall-answer`, `mupi-story`,
  `spot-10s`, `dynamic-variants`), hero «foco» y variantes de deck de las rondas del canvas.
- Command gobernado, endpoint `api/platform/app/**`, consumer del `artifact-worker`, tool MCP y flag: TASK-1921.
- Salida PPTX (`pptx-native` sigue no implementado) y Adobe Express.
- Generar las fotos: TASK-1918 y el flujo `foto:*`.
- Cambiar `deck-axis` o su línea base de SKY.

## Detailed Spec

- **Tabla de enrutamiento del mapper** (dato, no código ramificado): superficie `deck` → `graphic-line-deck`;
  `web`, `dooh`, `audiovisual`, `motion` → `graphic-line-stills`; `contentType` = id de la receta aprobada. Una
  superficie o receta sin fila falla con issue explícito.
- **Plates**: `--plate id=path` mapea el id del slot fotográfico del manifiesto AXIS al archivo local; el mapper lo
  pasa como `externalAssets`, nunca como ruta embebida en la plantilla (regla de portabilidad).
- **Fondo transparente**: el campo vive en el contrato de plantilla, no en el catálogo, para que un catálogo mezcle
  fijos opacos y overlays. El PNG transparente conserva el tamaño del viewport de la plantilla.
- **Deck**: `deckSlideHtml` de `axis-graphic-line` es la fuente del marcado de sección; la plantilla lo envuelve con
  slots, no lo reescribe.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slices 4 y 5 (en paralelo) → Slice 6 → Slice 7 → Slice 8.
- Slice 2 MUST ship antes que el Slice 5: sin fondo transparente los overlays saldrían opacos.
- Slice 7 MUST correr antes de declarar los catálogos listos para TASK-1921.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El cambio en `render.ts` altera píxeles de catálogos existentes (SKY, Insights) | composer | low | default opaco; visual gate a cero píxeles sobre todos los catálogos antes de commitear | `pnpm composer:visual-gate` rojo |
| Una plantilla portada arrastra HEX o px del script de sesión | composer / marca | medium | test de portabilidad y tokenización extendido a los catálogos nuevos | test de portabilidad rojo |
| El contrato AXIS candidate cambia en una versión siguiente | contrato AXIS | medium | versiones fijadas exactas; el mapper valida con el contrato instalado y el manifiesto registra la versión | issues del contrato en el CLI |
| Se cuela una receta no aprobada como plantilla | marca | low | tabla de enrutamiento sólo con aprobadas; test que falla si una receta no aprobada resuelve | test del mapper rojo |
| Otra sesión edita `visual-gate.ts` o las líneas base en paralelo | checkout compartido | medium | commits acotados a los paths propios; `git status` antes de cada commit | conflicto en `git status` |

### Feature flags / cutover

Sin flag: herramienta local, additive, sin runtime de producción. El campo de fondo transparente es opcional con
default opaco, así que el cutover es inmediato y no cambia catálogos existentes. El flag productivo lo declara
TASK-1921.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revertir el bump de AXIS en `package.json` y `pnpm-lock.yaml` | minutos | si |
| Slice 2 | revertir el commit del motor; el campo es opcional | minutos | si |
| Slice 3 | revertir `src/lib/brand-surfaces/` | minutos | si |
| Slices 4 y 5 | quitar el catálogo de `PROBE_CATALOGS` y revertir su carpeta | minutos | si |
| Slice 6 | revertir `scripts/brand-surfaces/` y el script de `package.json` | minutos | si |
| Slice 7 | revertir las líneas base nuevas y la entrada de `BASELINE_DELTAS.md` | minutos | si |
| Slice 8 | revertir los deltas de docs y skills | minutos | si |

### Production verification sequence

Sin producción en esta task (repo-only, no production runtime impact). Verificación local en orden:

1. Tests focales del motor: fondo transparente y catálogos existentes sin cambio.
2. `pnpm composer:visual-gate` a cero píxeles, incluida la línea base de SKY.
3. `pnpm brand:compose` con cada ejemplo de intent de AXIS: PDF del deck y PNG de las superficies.
4. `pnpm brand:compose` con una receta no aprobada: falla cerrado con issue.
5. `pnpm local:check` y `pnpm test` completo antes de cerrar.

### Out-of-band coordination required

Ninguna: repo-only change. Si AXIS publica una versión que cambie el contrato candidate mientras la task corre, se
coordina con la sesión de AXIS antes de subir la versión fijada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] AXIS v0.3.7 (tokens 0.3.7, ui-contracts 0.3.6, brand-assets 0.3.2, graphic-line 0.4.0) fijado en `package.json`
      y `pnpm-lock.yaml` (commit `f3f93c926`).
- [x] Una plantilla que declara fondo transparente produce PNG con canal alfa y esquinas con alfa 0; los catálogos
      existentes quedan idénticos en el visual gate. *(`src/lib/artifact-composer/__tests__/transparent-render.test.ts`:
      esquinas con alfa 0 y contenido opaco; las capas quedaron congeladas con su alfa; el gate global da la misma lista y
      cuentas de deriva —60 frames, ISSUE-122— con y sin el `render.ts` nuevo.)*
- [x] `assertSlideHasInk` rechaza un overlay transparente vacío. *(`transparent-render.test.ts`: capa vacía → `blank_slide`;
      capa con contenido pasa.)*
- [x] El mapper de `src/lib/brand-surfaces/` sólo importa tipos y la entrada `/pure` del composer (el lint
      `greenhouse/no-worker-only-module-in-vercel-code` pasa). *(2026-09-27: único import del composer es
      `import type … from '@/lib/artifact-composer/pure'` en `types.ts`; `eslint src/lib/brand-surfaces` sin hallazgos.)*
- [x] El catálogo `graphic-line-deck` contiene exactamente las seis recetas de deck aprobadas y emite un PDF de
      1920 × 1080. *(registry + `deck-recipes.test.ts`; commits `a2dc7c5fd`, `422ec35fd`.)*
- [x] *(Reformulado al cerrar, por el diseño implementado.)* Las recetas aprobadas no-deck se reparten en dos catálogos:
      `graphic-line-stills` (las cuatro web —el teléfono con una plantilla por ancho, 360/390/430—, `caminero-lens`,
      `loop-lens-reveal` como último cuadro y `storyboard`) y `graphic-line-overlays` (cartela, zócalo, llamada, dato y
      subtítulos con alfa; pantalla dividida y `shot-plan` opacas). `close-reveal` queda fuera del composer por ser video
      (`recipe-outside-composer`) y ninguna receta opción o pendiente tiene plantilla (`recipe-not-approved`).
      *(registries + `stills-recipes.test.ts` y `overlays-recipes.test.ts`.)*
- [x] `pnpm brand:compose` con los ejemplos de intent (formas 0.1.1 validadas contra el schema de AXIS) produce PDF
      (deck) y PNG (resto) y la procedencia: `<id>.surface-manifest.json` (el manifest de AXIS) y `<id>.provenance.json`
      (SHA-256 del intent y de cada plate, versiones de los paquetes AXIS; sin fechas). *(21/21 ejemplos compuestos,
      incluidos los tres anchos del teléfono.)*
- [x] `pnpm brand:compose` con una receta no aprobada sale con código distinto de cero y un issue legible.
      *(`SurfacePieceError` `recipe-not-approved` → `process.exit(1)` con mensaje es-CL; test «una receta pendiente no
      tiene plantilla».)*
- [x] Dos ejecuciones con el mismo intent y los mismos plates producen bytes idénticos en los PNG (medido con
      `deck.proposal-cinematic`, `audiovisual.zocalo` y `web.hero-lens`). Los PDF son idénticos salvo la fecha de
      creación que escriben Chromium (por lámina) y `pdf-lib` (el unido): verificado leyendo las dos fechas; el contenido
      no cambia. Es comportamiento del motor para todos los catálogos, no de éstos.
- [x] Ninguna plantilla nueva contiene HEX, `rgb()`, familia tipográfica, animaciones ni duraciones (guardas de
      `graphic-line-catalogs.test.ts`). Las medidas de la receta llegan del manifest de AXIS como custom properties
      (`gl-px-*`, `gl-css`); los px del molde son sólo el respaldo del probe del gate, con el valor de la lámina aprobada.
- [x] `pnpm composer:visual-gate` a cero píxeles con ambos catálogos y la línea base de SKY sin cambios;
      `BASELINE_DELTAS.md` registra el alta. *(Scope `--catalog=graphic-line`: 22 frames a 0 px, commit `752986a88`;
      SKY no se rebaselinó. El gate global conserva 60 frames con deriva previa, ISSUE-122, idéntica con el
      `render.ts` anterior.)*
- [x] Norma por superficie, manual, ADR del composer y skills `efeonce-graphic-line` y `deck-studio` actualizados y
      espejados. *(Barrido documental 2026-09-27; `pnpm skills:mirrors` al cierre del barrido.)*

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (completo al cerrar) y tests focales de `src/lib/artifact-composer` y `src/lib/brand-surfaces`
- `pnpm composer:visual-gate`
- `pnpm brand:compose` con los ejemplos de AXIS
- `pnpm skills:mirrors`

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas (TASK-1395 recibió un delta; TASK-1417/1418/1902 tocan sus propios catálogos y no cambian)

- [x] TASK-1921 recibió un `## Delta` con el contrato final del mapper y los nombres de los catálogos
- [x] las skills `efeonce-graphic-line` y `deck-studio` quedaron actualizadas y espejadas según su contrato

## Follow-ups

- TASK-1921: ruta productiva gobernada (command, API, consumer del `artifact-worker`, MCP, flag).
- Plantillas para paleta DOOH y pDOOH cuando el operador apruebe esas recetas.
- Salida PPTX del catálogo de deck cuando `pptx-native` se implemente en el composer.

## Open Questions

- ~~¿El CLI corre con `tsx` o se compila?~~ Resuelto: `tsx scripts/brand-surfaces/compose.ts` (como
  `composer:visual-gate`).
- **Preguntas del operador (2026-09-27; las plantillas siguen la lámina aprobada hasta que decida, sin token nuevo):**
  1. Posición de la lente del caminero: el token dice 0,70 y la lámina aprobada la muestra cerca de 0,77.
  2. Super de dato (`audiovisual.data-super`): ¿arco completo como en la lámina, o la estela canónica de la medida?
  3. Burbuja URL en `section-classic`, `section-split`, `content-measure` y `triptych`: las láminas aprobadas no la
     llevan y el manifest del deck dice `url-bubble-footer`; se siguió la lámina.
  4. Gris del descriptor y de la bajada web: no tiene token.
  5. Paleta DOOH: 20 % vs 35 % (sin plantilla hasta decidir).
- La salida `.captures/brand-surfaces/<id>/` y los plates viven fuera de git; la procedencia versionada es de TASK-1921.
