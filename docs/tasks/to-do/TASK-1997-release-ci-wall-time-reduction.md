# TASK-1997 — Releases más cortos: un solo CI por árbol, CI en paralelo y smoke automático

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
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno; baseline medido el 2026-10-04 sobre los releases 9a906a164677 y 7182af769e71`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; local-first; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Un release chico de 9 archivos tardó 81 minutos el 2026-10-04 y el orquestador sólo explicó 13. El resto
fueron esperas de CI: el mismo árbol se verifica dos veces (PR 26 min + `main` 26 min), el CI corre lint,
typecheck, tests y build en serie dentro de un solo job, el smoke de Playwright no corre sobre `main` y
corta el preflight, y CI Deep vive al borde de su límite. Esta task baja un release chico a ~30–35 minutos
sin quitar ninguna verificación.

## Why This Task Exists

El tiempo de punta a punta de un release subió de ~1 h 05 min (agosto) a 1 h 20 min – 2 h 26 min
(octubre), con picos de 3–4 h por ciclos de corrección. Lo medido el 2026-10-04 (detalle en
`## Detailed Spec`):

- **El orquestador no es el problema**: 12–14 min estable desde agosto; los workers son change-gated y se
  despliegan en < 1 min.
- **CI duplicado**: el PR `develop → main` y el `push` a `main` corren el mismo CI completo sobre el mismo
  árbol (con squash merge el árbol de `main` es idéntico al del merge ref del PR cuando `main` no se movió).
- **CI en serie**: el job único `quality` de `.github/workflows/ci.yml` suma Lint (~200 s) + Typecheck
  (~155 s) + Test (~780 s, límite 14 min) + Build (~350 s) ≈ 25 min. Creció ~22 % desde fines de agosto
  con el volumen de código (+206 archivos de test y +1.253 archivos en `src/lib` en tres semanas).
- **CI Deep al límite**: la cobertura pasó de 10–12 min (mediados de septiembre) a 17–19 min; el 2026-10-04
  se cortó dos veces en su límite de 17 min y costó ~1 h (corrida fallida + PR #252 + otra vuelta de CI).
  Sólo corre sobre `main`, así que su rojo aparece después del merge.
- **Smoke no automático en `main`**: `.github/workflows/playwright.yml` sólo corre por `push` a `develop`
  con filtro de paths; el check `playwright_smoke` del preflight ve 0 corridas sobre el SHA de `main` y
  corta el primer dispatch (o el agente corre el smoke a mano: ~6 min por release).
- **Setup global de tests**: `src/test/setup.ts` importa `@testing-library/jest-dom`,
  `@testing-library/react` y el servidor MSW para los ~2.000 archivos de test, aunque sólo 133 usan
  `@vitest-environment jsdom`. En una corrida local el setup acumuló ~832 s y el import ~521 s, contra
  ~407 s de tests.
- **Repo inflado**: `ai-generations/` tiene 9.483 archivos versionados (376 MB); el repo pasó de ~20.000
  a ~32.000 archivos en tres semanas y el checkout de CI de 15–23 s a 35 s. `.gcloudignore` y
  `.dockerignore` no lo excluyen.

## Goal

- Un release chico (≤ 20 archivos, sin migraciones ni workers) llega de PR abierto a `released` en ≤ 40 min.
- Ningún árbol se verifica dos veces con el CI completo, y ningún release necesita smoke manual.
- CI y CI Deep tienen holgura medida (≤ 70 % de su límite) y avisan antes de llegar al borde.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` (preflight, `ci_green`, `playwright_smoke`, invariantes del orquestador)
- `docs/architecture/GREENHOUSE_CI_COST_SIGNAL_GUARDRAILS_V1.md` (costo de GitHub Actions y señales de CI)
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/TASK_CLOSING_QUALITY_GATE_V1.md`
- `docs/architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md` (dónde vive el material creativo; Slice 6)

Reglas obligatorias:

- **Ninguna verificación se elimina**: lo que hoy corre lint, typecheck, test, build, cobertura y smoke
  sigue corriendo; sólo cambia cuándo, en paralelo o si se reusa la evidencia de un árbol idéntico.
- **La reutilización de evidencia es por árbol exacto** (`git rev-parse <sha>^{tree}`), nunca por mensaje
  de commit, rama o número de PR. Si el árbol difiere en un byte, corre el CI completo.
- Workflows: `pnpm/action-setup@v6` antes de `actions/setup-node@v5`, sin `version:` en pnpm,
  `cache: 'pnpm'`, Node 24 (reglas de `CLAUDE.md`).
- Cualquier cambio al preflight (`ci_green`, `playwright_smoke`) se trata como cambio del control plane:
  invocar la skill `greenhouse-production-release` y actualizar runbook + skill (espejo `.codex`).
- NUNCA bajar un `timeout-minutes` para «forzar velocidad»; los límites sólo se ajustan con medición.

## Normative Docs

- `docs/operations/runbooks/production-release.md`
- `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md` (baseline y medición posterior)
- `.claude/skills/greenhouse-production-release/SKILL.md`

## Dependencies & Impact

### Depends on

- Ninguna task bloqueante. Coordinar con `TASK-1130` (vitest hermético) antes de tocar `src/test/setup.ts`
  y `vitest.config.ts` en el Slice 5, y con `TASK-859` (métricas de workflows) para la alerta del Slice 4.

### Blocks / Impacts

- `TASK-859` — la alerta de duración del Slice 4 puede convertirse en su señal `ci.workflow_duration_p95`.
- `TASK-866` — el Deployment Plan V2 consume la misma evidencia de CI del preflight.
- `TASK-1130` — comparte `src/test/setup.ts` y `vitest.config.ts`.
- Branch protection de `main` y `develop` (checks requeridos por nombre).

### Files owned

- `.github/workflows/ci.yml`
- `.github/workflows/ci-deep.yml`
- `.github/workflows/playwright.yml`
- `src/lib/release/preflight/checks/ci-green.ts` (+ test)
- `src/lib/release/preflight/checks/playwright-smoke.ts` (+ test)
- `src/test/setup.ts` y archivos de setup nuevos por entorno bajo `src/test/`
- `vitest.config.ts`
- `.gcloudignore`, `.dockerignore`
- `scripts/ci/` (scripts nuevos de equivalencia de árbol y presupuesto de pasos)
- `docs/operations/runbooks/production-release.md`, `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`

## Current Repo State

### Already exists

- `.github/workflows/ci.yml`: un job `quality` (`timeout-minutes: 30`) que corre en `pull_request` y en
  `push` a `main` y `develop`, con Lint, Typecheck, Test (`timeout-minutes: 14`) y Build en serie.
- `.github/workflows/ci-deep.yml`: job `coverage` (`timeout-minutes: 25`; paso `pnpm test:coverage` con
  `timeout-minutes: 21` desde PR #252), sólo en `push` a `main`.
- `.github/workflows/playwright.yml`: `workflow_dispatch` + `push` a `develop` con filtro de paths.
- Preflight: `src/lib/release/preflight/registry.ts` con `ci_green` (`checks/ci-green.ts`) y
  `playwright_smoke` (`checks/playwright-smoke.ts`).
- `vitest.config.ts`: proyectos `unit`, reglas ESLint y `live`; `setupFiles: ['src/test/setup.ts']` en la raíz,
  heredado por `extends: true`.
- `pnpm actions:cost:audit` (`scripts/github-actions-cost-audit.mjs`) para medir costo antes y después.
- Primitives de `ai-generations/`: `pnpm ai-gen:protected|where|pull|archive` y el bucket canon (commit `5d2dfab5f`).

### Gap

- No existe evidencia de CI reutilizable por árbol; el preflight sólo acepta CI verde sobre el SHA exacto.
- El CI no está paralelizado ni sus tests repartidos.
- El smoke no se produce sobre el SHA de `main` sin acción manual.
- CI Deep no corre antes del merge, no está repartido y nada avisa cuando un paso se acerca a su límite.
- El setup de tests no distingue entorno `node` de `jsdom`.
- `ai-generations/` entra en checkouts y subidas de Cloud Build.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `.github/workflows/**`, `src/lib/release/preflight/**`, `src/test/**`, `vitest.config.ts`, `scripts/ci/**`, archivos de ignore en la raíz
- Future candidate home: `remain-shared`
- Boundary: el preflight sigue siendo el único juez de «listo para producción»; los workflows producen evidencia y el preflight la valida por árbol
- Server/browser split: `n/a`
- Build impact: `none` en el build de Next.js; cambia la topología de jobs de CI y el setup de Vitest
- Extraction blocker: `none`

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

Los slices conservan la numeración de la propuesta aprobada por el operador (2026-10-04); el orden de
ejecución está en `### Slice ordering hard rule`.

### Slice 1 — Un solo CI por árbol

- Script `scripts/ci/tree-evidence.mjs`: dado un SHA, calcula su árbol y busca una corrida verde de CI
  (y de CI Deep) del mismo repo cuyo commit tenga ese árbol exacto (merge ref de un PR hacia `main`, o
  el commit anterior de `main`). Sin coincidencia exacta devuelve «sin evidencia».
- `ci.yml` en `push` a `main`: primer job decide; si hay evidencia por árbol, publica un check verde que
  cita la corrida reutilizada (run ID + árbol) y omite los jobs pesados; si no, corre el CI completo.
- `ci-deep.yml` corre también en `pull_request` con base `main`, para que su rojo aparezca antes del merge;
  en `push` a `main` aplica la misma reutilización.
- `checks/ci-green.ts` acepta CI verde sobre el SHA **o** la evidencia por árbol publicada, y registra en el
  resultado cuál fue. Tests para: árbol idéntico, árbol distinto, corrida reutilizada fallida, fork.

### Slice 2 — CI en paralelo

- Partir el job `quality` en jobs simultáneos: lint (+ lint-rule tests), typecheck, test repartido en N
  partes (`vitest --shard=i/N`, con reportes unidos para la observabilidad existente) y build.
- Un job agregador final con el nombre que hoy exige branch protection, que sólo pasa si todos pasan.
- Medir con `pnpm actions:cost:audit` el costo antes y después y dejarlo en la task.

### Slice 3 — Smoke automático sobre `main`

- `playwright.yml` corre en `push` a `main` (o lo dispara el CI de `main` al terminar verde) para el SHA
  exacto, de modo que `playwright_smoke` encuentre una corrida antes del dispatch.
- Si el Slice 1 reutiliza evidencia, el smoke también puede reutilizarse por árbol solo si el check del
  preflight lo acepta explícitamente; si no, se corre.
- Runbook: el paso «correr el smoke a mano antes del dispatch» desaparece.

### Slice 4 — CI Deep con holgura y alerta

- Cobertura repartida (`vitest --shard` + `vitest --merge-reports` para el reporte unido) o runner mayor,
  hasta que el paso quede ≤ 70 % de su límite.
- Las suites de procesamiento de imagen (`scripts/ai/inpaint/**` y equivalentes con `sharp`) corren fuera
  de la instrumentación de cobertura o con su propio presupuesto, sin dejar de ejecutarse.
- `scripts/ci/step-budget-check.mjs`: anota un warning en el run cuando un paso supera el 80 % de su
  `timeout-minutes`, en CI y CI Deep. Coordinar con `TASK-859` si su señal ya existe.

### Slice 5 — Setup de tests por entorno

- Separar `src/test/setup.ts` en un setup base (lo que todos necesitan: mock de `server-only`) y uno de
  DOM (jest-dom + cleanup de RTL) aplicado sólo a los archivos `jsdom`.
- MSW se carga sólo en los tests que hacen red (carga perezosa o proyecto propio), sin romper los 133
  archivos `jsdom` ni los que hoy dependen de los handlers de `src/mocks/handlers.ts`.
- Medir antes y después la suma de `setup` + `import` del reporte de Vitest y el tiempo del paso Test en CI.

### Slice 6 — `ai-generations/` fuera del camino de build

- Agregar `ai-generations/` a `.gcloudignore` y `.dockerignore` (verificando que ningún worker la lea en
  build ni en runtime).
- En los jobs de CI, checkout sin `ai-generations/` (sparse checkout no-cone) si y sólo si ningún test,
  script de CI ni gate lee esa carpeta; si alguno la lee, documentarlo y dejarla.
- Propuesta escrita (no ejecución) de dónde vive el material versionado de `ai-generations/` a futuro,
  alineada con `EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md` y los comandos `ai-gen:*`; decide el operador.

## Out of Scope

- Reescribir el historial de git o purgar `ai-generations/` del repo (requiere decisión del operador y
  coordinación con todas las sesiones).
- Cambiar el orquestador `production-release.yml`, sus gates de aprobación o el Deployment Plan V2 (`TASK-866`).
- Quitar, saltar o volver opcional cualquier verificación existente.
- Arreglar tests no herméticos (`TASK-1130`) más allá de lo que el Slice 5 necesite para no romperlos.
- Migrar de proveedor de CI.

## Detailed Spec

### Baseline medido (2026-10-04)

Release `7182af769e71` (PR #253, 9 archivos):

| Tramo | Inicio → fin (UTC) | Minutos |
|---|---|---|
| CI del PR | 13:13 → 13:39 | 26 |
| CI de `main` (mismo árbol) | 13:40 → 14:06 | 26 |
| CI Deep (paralelo) | 13:40 → 13:58 | 18,8 |
| Primer dispatch cortado por `playwright_smoke` | 14:07 → 14:08 | 1,6 |
| Smoke manual | 14:09 → 14:13 | 3,8 |
| Orquestador | 14:13 → 14:26 | 13,4 |

Pasos del job `quality` (medianas sobre `main`): fines de agosto Lint 173 s · Typecheck 130 s · Test 614 s ·
Build 290 s; 2026-10-04 Lint 198 s · Typecheck 153 s · Test 777–791 s · Build 345–359 s. Hay varianza de
hasta 30 % entre runners: comparar medianas, no corridas sueltas.

CI Deep, paso de cobertura: 10–12 min (2026-09-21/26) → 16–19 min (2026-10-03/04).

Archivos de test: 1.826 (2026-09-15) → 2.032 (2026-10-04). Archivos del repo: 19.929 → 31.886.

### Equivalencia de árbol (Slice 1)

Con squash merge, el commit de `main` tiene el mismo árbol que el merge ref del PR que lo produjo si `main`
no se movió entre la corrida del PR y el merge. El script compara `^{tree}` y exige: misma `repository.id`
(sin forks), conclusión `success` de todos los jobs requeridos, workflow con el mismo `path`, y que la
corrida reutilizada no sea más vieja que el último cambio de `.github/workflows/**` en el árbol (que, al
ser parte del árbol, ya queda cubierto por la igualdad). La evidencia queda en el resumen del run y en el
resultado JSON del preflight.

### Criterio de medición final

Dos releases reales posteriores al cierre, cada uno registrado en `PRODUCTION_RELEASE_TIMING_LEDGER.md` con
el desglose por tramo de la tabla de arriba.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 6 (ignores) y Slice 3 (smoke) primero: son aditivos y no dependen de nada.
- Slice 5 (setup de tests) antes del Slice 2: repartir tests sobre un setup que cambia después obliga a
  medir dos veces.
- Slice 2 (CI en paralelo) antes del Slice 1: la reutilización busca jobs por nombre, y el Slice 2 cambia
  los nombres. El job agregador del Slice 2 MUST conservar el nombre del check requerido antes de tocar
  branch protection.
- Slice 4 (CI Deep) después del Slice 2 (comparte la técnica de reparto) y antes de que CI Deep pase a
  `pull_request` en el Slice 1.
- Slice 1 al final: es el único que cambia qué acepta el preflight.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El preflight acepta evidencia de un árbol que no es el desplegado | release | low | igualdad exacta de `^{tree}`; tests de árbol distinto y fork; el resultado nombra la corrida reutilizada | resultado JSON del preflight + resumen del run |
| Branch protection queda esperando un check que ya no existe | release | medium | job agregador con el nombre actual; cambiar protección sólo después, con verificación | PR sin poder mergear |
| Tests repartidos esconden un fallo (shard que no reporta) | CI | low | el agregador exige los N shards y compara el total de tests contra `pnpm test:inventory` | conteo de tests distinto al inventario |
| Separar el setup rompe tests que dependían de MSW o jest-dom implícitos | CI | medium | correr la suite completa antes y después; listar los archivos que dejan de cargar MSW | fallos en `pnpm test` |
| Sparse checkout deja afuera un archivo que un test o gate lee | CI | medium | inventario de lecturas de `ai-generations/` en `src/**`, `scripts/**` y workflows antes de activarlo | fallos «ENOENT» en CI |
| Costo de Actions sube por jobs paralelos | CI | medium | medir con `pnpm actions:cost:audit` antes y después; la reutilización del Slice 1 compensa | reporte de costo |
| CI Deep en `pull_request` duplica corridas | CI | low | sólo con base `main`; reutilización en `push` | conteo de corridas por release |

### Feature flags / cutover

- Sin flag de runtime: son cambios de workflows y tests.
- Slice 1 se activa con una variable del repositorio (`CI_TREE_EVIDENCE_ENABLED`, default `false`) que
  leen el job de decisión y `ci-green.ts`; con `false` se comporta como hoy. Registrar la variable en el
  runbook de release (no es un `*_ENABLED` del ledger de flags de producto) y prenderla después de un
  release verde en modo observación (calcular y anotar la evidencia sin usarla).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `CI_TREE_EVIDENCE_ENABLED=false` (vuelve a CI completo en `main`); revert del PR si hace falta | < 5 min | si |
| Slice 2 | revert del PR de workflows; branch protection sin cambio hasta verificarlo | < 15 min | si |
| Slice 3 | revert del trigger en `playwright.yml` (vuelve el smoke manual) | < 10 min | si |
| Slice 4 | revert del reparto de cobertura y del script de presupuesto | < 10 min | si |
| Slice 5 | revert de `src/test/setup*` y `vitest.config.ts` | < 10 min | si |
| Slice 6 | revert de los ignores y del sparse checkout | < 10 min | si |

### Production verification sequence

1. Cada slice se valida primero en un PR hacia `develop` y en el CI de `develop`.
2. Slice 1 en modo observación durante un release real: el job de decisión calcula la evidencia y la
   anota, pero corre el CI completo; comparar que la evidencia apuntaba al árbol correcto.
3. Prender `CI_TREE_EVIDENCE_ENABLED` y hacer el release siguiente; verificar en el preflight que
   `ci_green` cita la corrida reutilizada y que el árbol coincide.
4. Medir dos releases reales y registrarlos en el ledger de tiempos.

### Out-of-band coordination required

- Cambio de branch protection de `main`/`develop` si cambian los nombres de checks requeridos (operador).
- Aviso a las sesiones activas (Claude y Codex) antes de cambiar `ci.yml`: un PR abierto durante el
  cambio puede quedar con checks de dos topologías.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] En `push` a `main` con árbol idéntico al de un PR verde, el CI completo no vuelve a correr y el check publicado cita run ID y árbol reutilizados.
- [ ] Con un árbol distinto en un byte, el CI completo corre (test que lo prueba).
- [ ] `ci-green.ts` acepta evidencia por árbol sólo con `CI_TREE_EVIDENCE_ENABLED=true` y sus tests cubren árbol idéntico, distinto, corrida fallida y fork.
- [ ] CI Deep corre en los PR con base `main`.
- [ ] El CI de un PR termina en ≤ 12 min de reloj (mediana de 5 corridas), sin quitar ningún paso.
- [ ] El total de tests ejecutados por los shards coincide con `pnpm test:inventory`.
- [ ] Ningún release posterior al cierre necesita smoke manual: `playwright_smoke` encuentra la corrida sobre el SHA de `main`.
- [ ] El paso de cobertura de CI Deep queda ≤ 70 % de su `timeout-minutes` (mediana de 5 corridas).
- [ ] Un paso que supera el 80 % de su límite deja un warning visible en el run.
- [ ] `setup` + `import` del reporte de Vitest bajan y la diferencia queda medida en la task.
- [ ] `ai-generations/` está en `.gcloudignore` y `.dockerignore`, y ningún worker la necesita.
- [ ] Dos releases reales posteriores, registrados en el ledger de tiempos, van de PR abierto a `released` en ≤ 40 min cada uno.
- [ ] El costo de GitHub Actions antes y después queda medido con `pnpm actions:cost:audit`.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/release/preflight`
- `pnpm test` completo antes y después del Slice 5
- Corridas reales de CI en PR hacia `develop` y en `main`
- Dos releases reales medidos en `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] runbook de release, `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` y la skill `greenhouse-production-release` (con espejo `.codex`) describen la evidencia por árbol y el smoke automático
- [ ] el baseline y el resultado quedan en `PRODUCTION_RELEASE_TIMING_LEDGER.md`

## Follow-ups

- Decisión del operador sobre dónde vive el material versionado de `ai-generations/` (propuesta del Slice 6).
- Si la alerta del Slice 4 se materializa como señal de reliability, cerrarla con `TASK-859`.

## Open Questions

- ¿Runner mayor de GitHub (de pago) o reparto en varios runners estándar para CI Deep? Default: reparto
  con runners estándar; el runner mayor sólo si el reparto no llega al 70 %.
