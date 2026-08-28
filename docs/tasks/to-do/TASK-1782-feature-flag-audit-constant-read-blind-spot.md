# TASK-1782 — El auditor de flags no ve los flags que se leen por constante

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`pnpm flags:audit` detecta flags con una sola forma sintáctica —`process.env.X_ENABLED` escrito
literal— y por eso es ciego a todo módulo que lee el flag por constante (`isTrue(env[FLAG])`,
`envFlag('X_ENABLED')`). El gate corre dentro de `pnpm docs:closure-check`, que **bloquea cierres**,
y reporta verde sobre flags que nunca miró. Esta task cambia el detector de "una forma sintáctica" a
"nombres de flag alcanzados por el código, sin importar cómo se leen", define la frontera entre
**flag** y **knob de configuración** para que ampliarlo no genere ruido, y le pone al script una red
de tests propia para que la ceguera no vuelva en silencio.

## Why This Task Exists

El detector es una línea: `const FLAG_RE = /process\.env\.((?:NEXT_PUBLIC_)?[A-Z0-9_]+_ENABLED)\b/g`
(`scripts/ci/feature-flags-audit.mjs:32`). Todo lo que no calce con ese literal exacto no existe para
el script. Y hay dos ejes de ceguera distintos, con causas distintas:

**Eje 1 — la forma de lectura.** Módulos enteros declaran el nombre como constante y leen por índice.
`src/lib/growth/ai-visibility/flags.ts` lo hace 23 veces (`isTrue(env[GROWTH_AI_VISIBILITY_*_FLAG])`);
`src/lib/public-site/astro/github-control-plane/commands/flags.ts` usa un helper
(`envFlag('PUBLIC_SITE_GITHUB_COMMANDS_ENABLED', false)`). El nombre está en el repo, en texto plano,
a un string literal de distancia — pero el detector busca la forma equivocada.

**Eje 2 — el sufijo.** El detector asume que todo flag termina en `_ENABLED`. No es cierto:
`GROWTH_AI_VISIBILITY_BUDGET_GATE_ENFORCED` (el que decide si el gate de presupuesto **bloquea** o
sólo observa), `FINANCE_BQ_WRITE_DISABLED`, `MAINTENANCE_MODE`, `FX_SYNC_DRY_RUN`,
`GREENHOUSE_PAYSLIP_DELIVERY_MODE` y `HIRING_ASSESSMENT_AI_RUN_MODE` cambian comportamiento de
producción y ninguno es visible para el gate.

**Por qué duele más de lo que parece: no es higiene documental.** El mismo `sortedCode` —derivado del
detector ciego— alimenta los dos chequeos de ISSUE-150, que son los únicos del script que **fallan
siempre**, no sólo con `--strict`:

- `prodWithoutCodeOnMain` — flag ON en Production cuyo código lector sólo existe en `develop`.
  Producción sirve `main`; con semántica fail-closed eso no degrada, bloquea usuarios reales. Es lo
  que pasó el 2026-08-11 con `ASSET_MALWARE_SCAN_ENABLED`: cinco CV de candidatos en cuarentena por
  403 (`docs/issues/resolved/ISSUE-150-production-flag-enabled-for-code-only-on-develop.md`).
- `prodOnDriftedCode` — flag ON en Production con código lector que difiere de `main`.

Un flag leído por constante **no puede disparar ninguno de los dos**. La protección más cara del
script está apagada exactamente para los 51 flags que más se movieron este año.

Y la ceguera corre en las dos direcciones: `orphanEnv` (🧹 "en Vercel pero SIN referencia en código,
posible env var muerta") filtra con `!codeFlags.has(f)`, así que un flag **vivo** leído por constante
y seteado en Vercel se reporta como candidato a borrar. El script no sólo omite trabajo: invita a
apagar algo que está en uso.

**El defecto ya está admitido y nadie lo cerró.** La fila de `GROWTH_AI_VISIBILITY_BUDGET_GATE_*` del
propio ledger dice, textual: "⚠️ `pnpm flags:audit` NO los ve: su regex busca `process.env.X_ENABLED`
literal y estos se leen por constante (`env[FLAG]`), como el resto de los flags de
`ai-visibility/flags.ts`". O sea: la nota al pie que explica por qué el gate no sirve vive **dentro
del documento cuya completitud el gate promete garantizar**.

**El síntoma que originó la task (2026-08-27, cierre de TASK-1696):** al agregar dos flags nuevos, el
audit imprimió `📒 En código pero SIN registrar en el ledger (0) ✓ ninguno`. No es que estuvieran
registrados: es que nunca los miró. Un verde que no midió es peor que un rojo, porque entrena a
confiar.

**El alcance real no está medido, y medirlo es parte del trabajo.** Este diseño trae una primera
pasada, con su método explícito para que se pueda refutar: comparando los nombres `*_ENABLED` que
aparecen como literal `process.env.X` (104) contra los que aparecen como string literal en cualquier
parte del código (75), salen **51 nombres que el detector nunca ve**, de los cuales **3 no están hoy
en el ledger** (`KNOWLEDGE_COMPOSITION_LENS_ENABLED`, `PUBLIC_SITE_GITHUB_COMMANDS_ENABLED`,
`PUBLIC_SITE_GITHUB_WORKFLOW_DISPATCH_ENABLED` — los dos últimos gatean escrituras a GitHub del sitio
público). Esa medición es un piso, no la cifra: se hizo con `grep`, no distingue una lectura real de
una mención en comentario o test, y no cubre el eje 2 más allá de una sonda por sufijos. La task
**debe** producir el inventario reproducible antes de proponer la frontera, y declararlo en el
ledger; **NUNCA** citar 51 ni 3 como resultado final sin haberlos vuelto a derivar con el detector
nuevo.

## Goal

- El detector alcanza los flags leídos por constante, por helper y por acceso dinámico, y no depende
  de que alguien escriba `process.env.X_ENABLED` literal.
- Los dos chequeos de ISSUE-150 (`prodWithoutCodeOnMain`, `prodOnDriftedCode`) cubren esos flags, con
  sus rutas de lectores reales para poder preguntarle a `main`.
- Existe una frontera declarada y probada entre **flag de comportamiento** (lleva fila en el ledger)
  y **knob de configuración** (nunca la lleva), de modo que ampliar el detector no convierta el gate
  en ruido que obligue a registrar presupuestos y tamaños de lote.
- El inventario del punto ciego queda medido con el detector nuevo, no con `grep`, y los flags que
  aparezcan sin fila quedan registrados o excluidos con razón.
- El script tiene tests propios que fallan si alguien vuelve a estrechar el detector.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `CLAUDE.md` → §`Runtime Rollout Completion Gate` (contrato del ledger y de los 5 runtimes)

Reglas obligatorias:

- El SoT humano del estado de flags sigue siendo `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` y la
  verdad live sigue siendo `vercel env ls`. Este script es la pasada mecánica que alimenta el ledger;
  **NUNCA** muta nada ni se vuelve fuente de verdad.
- Prender un flag es multi-runtime (Vercel + 4 Cloud Run). El detector debe seguir barriendo `src` y
  `services` juntos: un flag que sólo lee el `ops-worker` es tan flag como uno de Vercel.
- La frontera flag/knob se declara en el código del detector con su razón, no queda en la cabeza de
  quien lo escribió. Un knob que entra al ledger es ruido; un flag que no entra es el defecto que
  esta task cierra.
- Fix sistemático, no por callsite: el arreglo es el detector y su red de tests, no agregar a mano las
  filas que hoy faltan. Las filas son consecuencia.

## Normative Docs

- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — inventario, § Pendientes de acción, runbook de los
  5 runtimes. Contiene la nota que admite el punto ciego en la fila de `BUDGET_GATE`.
- `docs/issues/resolved/ISSUE-150-production-flag-enabled-for-code-only-on-develop.md` — por qué los
  dos chequeos contra `main` fallan siempre y qué costó no tenerlos.
- `docs/operations/TASK_CLOSING_QUALITY_GATE_V1.md` — el gate de cierre del que este script es parte.

## Dependencies & Impact

### Depends on

- `scripts/ci/feature-flags-audit.mjs` — el detector vigente y sus 6 secciones de reporte.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — formato del inventario contra el que se cruza.
- `package.json` → `flags:audit` y `docs:closure-check` (donde corre `--strict --no-vercel`).

### Blocks / Impacts

- `TASK-1293` (`to-do`, post-flag rollout completion hardening) — **declara `Files owned` sobre
  `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`**. Esta task **NO** reclama el ledger: produce el
  inventario y las filas faltantes se coordinan con 1293. Partición: 1782 posee el DETECTOR, 1293
  posee el LEDGER.
- Todo cierre de task que pase por `pnpm docs:closure-check`: al ampliar el detector, cierres que hoy
  pasan pueden empezar a fallar por flags legítimamente no registrados. Es el efecto buscado, y por eso
  el rollout parte en modo advisory antes de bloquear.
- Los ~65 flags de los carriles Growth/AEO/Forms/SEO, que hoy están en el ledger por disciplina humana
  y pasan a estar por gate.

### Files owned

- `scripts/ci/feature-flags-audit.mjs`
- `scripts/ci/feature-flags-audit.test.ts` (nuevo — self-tests del detector)
- `package.json` (sólo la línea de scripts si la task agrega un modo nuevo)

## Current Repo State

### Already exists

- `scripts/ci/feature-flags-audit.mjs` con 6 secciones de reporte, cruce contra `vercel env ls`, mapa
  `flagReaders` (flag → archivos que lo leen) y los dos chequeos de ISSUE-150 contra `origin/main`.
- `pnpm flags:audit` (advisory), `--strict` (falla si hay flags sin fila) y `--no-vercel`.
- `pnpm docs:closure-check` encadena `feature-flags-audit.mjs --strict --no-vercel` como gate de cierre.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con inventario por runtime, § Pendientes de acción y
  el runbook de encendido multi-runtime.
- Precedente de self-tests para scripts de CI en el repo: `scripts/ci/epic-child-parity.test.ts`,
  `scripts/lib/e2e-smoke-navigation-contract.test.ts`.

### Gap

- El detector reconoce una sola forma sintáctica y un solo sufijo.
- `flagReaders` sólo se puebla desde esa forma, así que los chequeos contra `main` no tienen a quién
  preguntarle por los flags leídos por constante.
- `orphanEnv` produce falsos positivos en el sentido contrario (flag vivo reportado como muerto).
- No hay ninguna frontera declarada entre flag y knob: hoy la separa el sufijo `_ENABLED` por
  accidente, no por decisión, y eso deja fuera a `*_ENFORCED` / `*_DISABLED` / `MAINTENANCE_MODE`.
- El script no tiene un solo test. Nada impide que la próxima edición vuelva a estrecharlo.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ci/feature-flags-audit.mjs`, ejecutado por `pnpm flags:audit` y encadenado en `pnpm docs:closure-check`
- Future candidate home: `remain-shared`
- Boundary: el script es lector puro del árbol y de `vercel env ls`; su único contrato de salida son el reporte y el exit code, y sus consumidores autorizados son `docs:closure-check` y el operador
- Server/browser split: `n/a` — script Node de CI, jamás importado por runtime de Vercel ni de Cloud Run
- Build impact: `none` — sin dependencias nuevas; sigue usando `node:fs` y `execSync` sobre `git` y `vercel`
- Extraction blocker: `none` — depende sólo del árbol del repo y del CLI de Vercel ya disponible

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader`
- Source of truth afectado: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (SoT humano) y `vercel env ls` (verdad live); el script no es fuente de ninguno de los dos
- Consumidores afectados: `docs:closure-check` (gate de cierre bloqueante) y el operador que corre `pnpm flags:audit`
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: exit codes de `scripts/ci/feature-flags-audit.mjs` — `0` advisory, `1` con `--strict` y flags sin fila, `1` siempre si hay flags ON en Production sin código en `main`
- Contrato nuevo o modificado: el conjunto `codeFlags` pasa de "flags escritos como literal" a "flags alcanzados por el código", y `flagReaders` se puebla para todos ellos
- Backward compatibility: `compatible` en flags e invocación; las secciones del reporte crecen y por eso el endurecimiento a bloqueante es escalonado
- Full API parity: `N/A — no capability`. El script es tooling de CI: no expone acción de negocio, no muta estado y no tiene consumidor UI, MCP ni Nexa

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna. El script no toca PostgreSQL ni BigQuery
- Invariantes que no se pueden romper:
  - El script es read-only sobre el repo, sobre `git` y sobre Vercel; nunca escribe el ledger ni env vars
  - Un knob de configuración (presupuesto, tamaño de lote, modelo, umbral, proveedor) **NUNCA** exige fila en el ledger
  - Un flag que cambia comportamiento **SIEMPRE** exige fila, sin importar cómo se lea ni en qué sufijo termine
  - Los dos chequeos de ISSUE-150 siguen fallando sin `--strict`: son seguridad de producción, no higiene
- Write-target allowlist: `N/A` — la task no introduce destinos de escritura
- Tenant/space boundary: `N/A` — herramienta de repo, sin tenant
- Idempotency/concurrency: el script es puro respecto del árbol; dos corridas sobre el mismo commit dan el mismo reporte
- Audit/outbox/history: `none` — la trazabilidad la da el ledger, que es el artefacto humano

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: el detector ampliado entra en modo advisory (secciones nuevas visibles, sin cambiar el exit code) y sólo endurece a bloqueante cuando el inventario quedó registrado o excluido
- Backfill plan: el "backfill" es documental — las filas del ledger que el detector nuevo destape se coordinan con `TASK-1293`, que posee ese archivo
- Rollback path: `revert PR` — el script queda como estaba y el gate vuelve a su alcance previo
- External coordination: ninguna. No toca Vercel, GCP, Azure ni secretos

### Security and access

- Auth/access gate: `N/A` — corre en local y en CI con el mismo permiso que hoy
- Sensitive data posture: `no sensitive data`. El script lee **nombres** de env vars, nunca valores; `vercel env ls` sólo lista claves y environments. **NUNCA** imprimir un valor de env var
- Error contract: fallos de `vercel env ls` o de `git rev-parse origin/main` siguen degradando honesto (advertencia + reporte parcial), nunca falso verde
- Abuse/rate-limit posture: `N/A`

### Runtime evidence

- Local checks: `pnpm vitest run scripts/ci/feature-flags-audit.test.ts`, `pnpm flags:audit --no-vercel`, `pnpm flags:audit` con Vercel autenticado
- DB/runtime checks: `N/A` — la task no toca base de datos
- Integration checks: corrida real de `pnpm flags:audit` (con `vercel env ls`) y de `pnpm docs:closure-check` completa
- Reliability signals/logs: `N/A` — el script no emite señales; su salida es el reporte
- Production verification sequence: `N/A — repo-only tooling`. No hay despliegue: el efecto es sobre el gate local y de CI

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

### Slice 1 — Red de tests del detector, escrita contra el defecto

- `scripts/ci/feature-flags-audit.test.ts` con la función de escaneo extraída y exportada desde el
  script (hoy es código suelto en el módulo).
- Casos que hoy fallan y deben quedar rojos antes del fix: lectura por constante
  (`isTrue(env[FLAG])`), lectura por helper (`envFlag('X_ENABLED')`), lectura por índice literal
  (`process.env['X_ENABLED']`), sufijo distinto de `_ENABLED`.
- Casos que deben quedar verdes y **no** aparecer como flag: knobs de presupuesto, de tamaño de lote,
  de modelo y de proveedor.
- Caso de `flagReaders`: por cada flag detectado hay al menos un archivo lector con ruta relativa
  usable por `git show origin/main:<ruta>`.

### Slice 2 — Detector por nombre alcanzado, no por forma sintáctica

- Reemplazar la pasada única por un escaneo que reconozca, como mínimo:
  `process.env.NOMBRE`, `process.env['NOMBRE']`, `env[NOMBRE]` resuelto contra la constante declarada
  en el mismo archivo, y el string literal `'NOMBRE'` cuando el archivo lo usa como clave de entorno.
- `flagReaders` se puebla en todas esas formas, para que los chequeos contra `main` tengan lectores.
- `orphanEnv` deja de reportar como muerto un flag que el código sí alcanza.
- Excluir menciones que son sólo prosa: comentarios y bloques de documentación no convierten un nombre
  en flag detectado; los archivos `*.test.ts` no cuentan como lector para el chequeo contra `main`.

### Slice 3 — Frontera declarada entre flag y knob

- Regla explícita en el script, con su razón escrita al lado: qué sufijos y formas cuentan como flag
  de comportamiento (`_ENABLED`, `_ENFORCED`, `_DISABLED`, `_PAUSED`, `_DRY_RUN`, `MAINTENANCE_MODE` y
  los `*_MODE` que ramifican comportamiento) y qué familias son knobs que nunca llevan fila
  (`*_MONTHLY_BUDGET_USD`, `*_PER_MONTH`, `*_MAX_*`, `*_BATCH_SIZE`, `*_PROVIDER`, `*_MODEL*`, `*_DAYS`).
- Los casos que no caen limpio en ninguna de las dos listas se reportan en una sección propia
  (`❓ sin clasificar`) en vez de colarse a cualquiera de los dos lados en silencio.
- La lista vive en un solo lugar del script y los tests del Slice 1 la ejercitan por ambos lados.

### Slice 4 — Inventario medido con el detector nuevo y cierre del gate

- Corrida de `pnpm flags:audit --no-vercel` y de `pnpm flags:audit` con Vercel: se registra en la task
  la cifra real de flags detectados, cuántos aparecen sin fila y cuántos quedaron sin clasificar.
- Cada flag sin fila se resuelve en una de dos direcciones, nunca se deja abierto: fila en el ledger
  (coordinada con `TASK-1293`, dueña del archivo) o exclusión declarada en el script con razón.
- Sólo cuando ese saldo llega a cero se endurece el modo del gate; hasta entonces las secciones nuevas
  son advisory.
- `pnpm docs:closure-check` corre completo y verde al cierre.

## Out of Scope

- **No** se reescribe ni reordena `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` como documento: su
  estructura y su propiedad son de `TASK-1293`. Acá sólo se agregan las filas que el inventario
  destape, coordinadas con esa task.
- **No** se prende ni se apaga ningún flag, en ningún runtime. La task mide y clasifica; encender es
  decisión del operador y trabajo de otra task.
- **No** se migran los módulos para que lean el flag con la forma literal. La lectura por constante es
  un patrón legítimo; el defecto es del detector, no de `ai-visibility/flags.ts`.
- **No** se toca la plataforma declarativa de flags en PostgreSQL (`home_rollout_flags`,
  `GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md`). Es otro mecanismo y el ledger ya los separa.
- **No** se agrega un chequeo nuevo de Vercel ni se cambia el contrato de los dos chequeos de
  ISSUE-150: se los alimenta con el conjunto completo, nada más.

## Detailed Spec

**El problema no es el regex, es el supuesto.** El script asume que un flag se reconoce por cómo se
escribe. Un flag se reconoce por qué hace: ramifica comportamiento de producción y alguien tiene que
saber en qué estado está en cada runtime. Cambiar el regex por uno más ancho repite el error con otro
alcance; lo que hay que cambiar es la pregunta que el script se hace, de *"¿aparece este texto?"* a
*"¿el código alcanza esta variable de entorno, y esa variable ramifica comportamiento?"*.

**Las dos formas reales que hay que cubrir** (verificadas en el repo, no hipotéticas):

```ts
// src/lib/growth/ai-visibility/flags.ts — 23 ocurrencias del patrón
export const GROWTH_AI_VISIBILITY_BUDGET_GATE_FLAG = 'GROWTH_AI_VISIBILITY_BUDGET_GATE_ENABLED'
// ... más abajo, en otra función:
isTrue(env[GROWTH_AI_VISIBILITY_BUDGET_GATE_FLAG])

// src/lib/public-site/astro/github-control-plane/commands/flags.ts — helper local
const envFlag = (name: string, defaultValue = false): boolean => { const value = process.env[name] /* … */ }
export const isPublicSiteGithubCommandsEnabled = () => envFlag('PUBLIC_SITE_GITHUB_COMMANDS_ENABLED', false)
```

En ambos casos el nombre está en el archivo como string literal. La forma más barata y robusta de
resolverlo es reconocer el string literal con forma de nombre de env var **cuando el archivo también
demuestra que lee el entorno** (`process.env[`, `env[`, un helper que reciba el nombre). No hace falta
análisis de flujo: alcanza con la coexistencia en el archivo, y los tests del Slice 1 fijan el
contrato para que el criterio no se degrade.

**Cuidado con el sentido contrario.** Un detector más ancho puede empezar a contar como flag cualquier
constante mayúscula que aparezca cerca de `process.env`. Ahí es donde entra el Slice 3: la
clasificación es lo que evita que el gate obligue a registrar `GROWTH_SEO_KEYWORDS_PER_MONTH` o
`GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_MAX_TOKENS`. El ledger ya lo dice explícito en dos filas: *"Los
knobs NO son flags y no llevan fila propia"*. Esta task lo convierte de prosa en regla ejecutable.

**Los chequeos contra `main` son la parte cara.** Hoy `flagReaders` mapea flag → archivos lectores y
se usa para `git show origin/main:<ruta>`. Si el detector nuevo agrega flags sin agregarles lectores,
los dos chequeos de ISSUE-150 los saltan en silencio y la task no habría cerrado nada. Por eso el
Slice 1 exige el caso de `flagReaders` explícito y el Slice 2 lo puebla en todas las formas.

**Sección `❓ sin clasificar`.** No es un adorno. Es la diferencia entre un gate honesto y uno que
elige por su cuenta: cuando aparezca un nombre nuevo que no cae ni en flags ni en knobs, el script
tiene que decirlo en vez de asumir. Un gate que clasifica en silencio es la misma clase de defecto que
esta task cierra, con otro disfraz.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (tests) → Slice 2 (detector) → Slice 3 (frontera) → Slice 4 (inventario + endurecimiento).
- **Slice 1 va PRIMERO y sus casos deben quedar ROJOS antes del Slice 2.** Un test escrito después del
  fix demuestra que el fix compila, no que el defecto existía. Es la única forma de probar que el
  detector viejo era ciego.
- **Slice 3 DEBE cerrar antes del Slice 4.** Sin la frontera, el inventario del Slice 4 mezcla knobs y
  flags, y el saldo a cerrar sale inflado y falso.
- **El endurecimiento del gate es lo último del Slice 4**, y sólo con el saldo de flags sin fila en
  cero. Endurecer antes rompe el cierre de tasks ajenas por deuda que esta task recién destapó.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El detector ampliado bloquea cierres de tasks ajenas por flags legítimos aún sin fila | CI / gate de cierre `docs:closure-check` | high | Secciones nuevas en modo advisory hasta que el Slice 4 cierre el saldo; el endurecimiento es el último paso | `pnpm docs:closure-check` falla en una task que no tocó flags |
| Falsos positivos: constantes mayúsculas cercanas a `process.env` contadas como flag | CI / gate de cierre | medium | Frontera del Slice 3 + sección `❓ sin clasificar` + tests de knobs por el lado negativo | Aparecen knobs de presupuesto en la sección `📒` |
| Falsos negativos residuales: una forma de lectura que el Slice 2 no cubra | CI / gate de cierre | medium | Los tests fijan las formas conocidas; la sección `❓ sin clasificar` deja ver los nombres que el script vio pero no supo ubicar | Un flag conocido del ledger no aparece en el reporte |
| Los chequeos de ISSUE-150 quedan alimentados con flags sin lectores y saltan en silencio | Producción (fail-closed sobre `main`) | medium | Caso de `flagReaders` obligatorio en el Slice 1; ningún flag detectado puede quedar sin al menos un lector | Un flag nuevo aparece en `📒` pero nunca en los chequeos contra `main` |
| Se toca el ledger, que pertenece a `TASK-1293`, y se pisa su trabajo | Documentación / coordinación | low | Partición declarada: 1782 posee el detector, 1293 posee el ledger; las filas se coordinan | Conflicto de merge en `FEATURE_FLAG_STATE_LEDGER.md` |

### Feature flags / cutover

Sin flag de runtime: el cambio es tooling de repo. El control de graduación es el **modo del reporte**,
no una env var — las secciones nuevas nacen advisory (visibles, exit code intacto) y pasan a contar
para `--strict` sólo cuando el saldo del Slice 4 está en cero. Revert instantáneo: `git revert` del PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `git revert` del commit de tests; el script queda intacto | <5 min | sí |
| Slice 2 | `git revert`; el detector vuelve al regex literal y el gate a su alcance previo | <5 min | sí |
| Slice 3 | `git revert`; sin frontera el detector vuelve a filtrar sólo por sufijo `_ENABLED` | <5 min | sí |
| Slice 4 | Devolver las secciones nuevas a advisory con un commit de una línea; las filas del ledger se quedan (son verdad, no regresión) | <5 min | parcial — las filas del ledger no se revierten a propósito |

### Production verification sequence

1. `pnpm vitest run scripts/ci/feature-flags-audit.test.ts` — los casos del defecto ROJOS antes del
   Slice 2, VERDES después.
2. `pnpm flags:audit --no-vercel` — comparar el conteo de flags detectados contra el reporte previo al
   cambio y explicar cada nombre nuevo.
3. `pnpm flags:audit` con Vercel autenticado — verificar que `🧹 posible env var muerta` deja de listar
   flags vivos leídos por constante.
4. Revisar `🚨 ON en Production sin código en main` y `⚠️ ON en Production con código que difiere`: con
   el conjunto completo tienen que evaluar los flags nuevos, no saltarlos.
5. Resolver el saldo de `📒` (fila en el ledger coordinada con `TASK-1293`, o exclusión declarada).
6. Endurecer las secciones nuevas y correr `pnpm docs:closure-check` completo.
7. `pnpm local:check` verde antes de cerrar.

### Out-of-band coordination required

- **`TASK-1293`** — posee `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`. Toda fila nueva se coordina
  con esa task antes de escribirla; no es coordinación externa al repo, pero sí a esta task.
- Nada más: no hay Azure, GCP, HubSpot, Notion ni secretos en el camino. `repo-only change` en todo lo
  externo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `scripts/ci/feature-flags-audit.test.ts` existe y cubre las cuatro formas de lectura (literal,
      índice literal, constante por índice, helper) más al menos un caso negativo por cada familia de
      knob declarada en la frontera.
- [ ] Los casos del defecto quedaron ROJOS contra el detector viejo y el commit lo deja evidenciado.
- [ ] `pnpm flags:audit --no-vercel` detecta `GROWTH_AI_VISIBILITY_BUDGET_GATE_ENABLED`,
      `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`, `PUBLIC_SITE_GITHUB_COMMANDS_ENABLED` y
      `GROWTH_AI_VISIBILITY_BUDGET_GATE_ENFORCED`.
- [ ] Ninguno de `GROWTH_AI_VISIBILITY_CONTRACTED_MONTHLY_BUDGET_USD`,
      `GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_PROVIDER` ni `GROWTH_SEO_KEYWORDS_PER_MONTH` aparece en la
      sección `📒`.
- [ ] Todo flag detectado tiene al menos un archivo lector en `flagReaders`, y los dos chequeos de
      ISSUE-150 lo evalúan.
- [ ] `pnpm flags:audit` con Vercel no reporta como `🧹 posible env var muerta` ningún flag que el
      código sí alcanza.
- [ ] Existe la sección `❓ sin clasificar` y su contenido está en cero o cada entrada tiene una
      decisión escrita en la task.
- [ ] La cifra real de flags detectados y de flags sin fila quedó registrada en la task, derivada con
      el detector nuevo y **no** con `grep`.
- [ ] Cada flag sin fila terminó registrado en el ledger (coordinado con `TASK-1293`) o excluido en el
      script con razón; el saldo es cero.
- [ ] `pnpm docs:closure-check` corre verde con las secciones nuevas ya contando para `--strict`.
- [ ] El script sigue siendo read-only: no escribe el ledger, no escribe env vars, no imprime valores
      de variables de entorno.

## Verification

- `pnpm vitest run scripts/ci/feature-flags-audit.test.ts`
- `pnpm flags:audit --no-vercel`
- `pnpm flags:audit` (con `vercel` autenticado en el scope `efeonce-7670142f`)
- `pnpm docs:closure-check`
- `pnpm local:check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1293` quedó notificada con las filas de ledger que este inventario destapó
- [ ] la nota del punto ciego en la fila de `GROWTH_AI_VISIBILITY_BUDGET_GATE_*` del ledger quedó
      retirada o reemplazada por el estado real (coordinado con `TASK-1293`)

## Follow-ups

- Si el inventario destapa flags ON en Production sin código en `main`, eso **no** es trabajo de esta
  task: se escala por el release control plane o se apaga el flag, y se registra como issue con dueño.
- Evaluar si la misma clase de ceguera afecta a otros gates que barren el árbol por patrón
  (`nul-byte-gate`, `migration-marker-gate`, gates de source): un gate que busca una forma sintáctica
  literal es siempre candidato al mismo defecto.
- Considerar publicar la clasificación flag/knob como regla compartida si un segundo consumidor la
  necesita; mientras haya uno solo, vive en el script.

## Open Questions

- ¿La frontera del Slice 3 debe cubrir también `*_MODE` genéricos (`HIRING_ASSESSMENT_AI_RUN_MODE`,
  `GREENHOUSE_PAYSLIP_DELIVERY_MODE`) como flags con fila, o basta con reportarlos en `❓ sin
  clasificar` hasta que el operador decida? El diseño propone la segunda opción por prudencia.
- ¿`KNOWLEDGE_COMPOSITION_LENS_ENABLED` corresponde al ledger de env-var flags, o pertenece a la
  plataforma declarativa de PostgreSQL por vivir en `src/lib/home/rollout-flags.ts`? Es el único de los
  tres nombres sin fila cuya clasificación no es obvia, y decidirlo mal contamina el ledger equivocado.
