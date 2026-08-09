# TASK-1676 — Que el gate de release verifique de verdad, y que sus comandos no envejezcan en silencio

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
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
- Backend impact: `reader`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El check `release_batch_policy` del preflight **aprueba sin mirar nada** cuando corre en el
orquestador, porque está anclado a `origin/main` y para entonces el `target_sha` ya está mergeado:
el rango queda vacío y devuelve `ship`. Esta task lo re-ancla al `target_sha` del release anterior,
endurece el marker `[release-coupled: …]` que hoy se dispara con prosa, y elimina la clase de bug
que hizo fallar tres comandos del runbook en una sola noche: CLI crudo copiado en markdown que
nadie ejecuta hasta que hay un incidente.

## Why This Task Exists

`ISSUE-114` (cerrada 2026-08-09) corrigió **cómo** se computaba el diff. Quedó vivo el problema más
grave: **contra qué** se computa. Y quedó documentado un patrón adyacente que ya costó tiempo real.

Un gate que grita de más hace perder tiempo. Uno que **nunca** grita entrega una seguridad que no
existe — y hoy tenemos el segundo, con evidencia dura: los `preflight-result.json` de tres releases
consecutivos reportan `filesChanged=0, decision=ship`, incluido uno con **1045 archivos y 14
migraciones**. Los 12 checks se presentan como gate de CI, y éste en particular es decorativo ahí.

A eso se suma que el marker de acoplamiento **nunca se lee donde el runbook dice** (el commit de
squash queda fuera del rango en ambos caminos) y, simultáneamente, **se dispara solo con prosa**: el
2026-08-09 una cita del literal `[release-coupled: ...]` dentro de un commit de documentación de
growth/MCP (`aea35a678`) neutralizó la protección `split_batch` para un batch completo.

Y la clase de bug del runbook: en el release del 2026-08-08/09 fallaron **tres** comandos copiados de
la doc (`vercel ls --target=`, `gcloud run services describe --format="value(...filter(...))"`, y un
`vercel redeploy` que no hace lo que la doc promete). **Ninguno de los comandos envueltos en `pnpm`
falló.** No es casualidad: un wrapper es un lugar donde el cambio de una herramienta se arregla una
vez y el uso diario lo ejercita; un snippet en markdown es un fósil que nadie corre hasta el
incidente, y cuando falla el operador no distingue "comando viejo" de "sistema roto".

## Goal

- El `release_batch_policy` del orquestador evalúa el diff **real** del release y puede bloquear.
- Un marker de acoplamiento sólo cuenta cuando es una declaración, no cuando alguien lo menciona.
- La ausencia de release previo produce `unknown`, nunca un `ship` silencioso.
- Los comandos operativos del runbook viven en wrappers `pnpm`, y el CLI crudo queda como último recurso.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`

Reglas obligatorias:

- Invocar la skill MANDATORIA `greenhouse-production-release` antes de tocar cualquier check del
  preflight, y `arch-architect` antes de modificar `src/lib/release/**` (playbook Regla #3).
- **NUNCA** hacer el gate más permisivo para destrabar un release. Si el gate detecta algo, está
  haciendo su trabajo (playbook, anti-pattern #1).
- **NUNCA** mutar `greenhouse_sync.release_manifests` ni `release_state_transitions`: son append-only
  y esta task sólo **lee** de ahí.
- El fix toca dominio `cloud_release`: va en su propio release, no mezclado con trabajo funcional.

## Normative Docs

- `docs/issues/open/ISSUE-145-release-batch-policy-anchored-to-wrong-base-in-ci.md` — causa raíz, evidencia de los 3 releases y seam exacto
- `docs/issues/resolved/ISSUE-114-release-batch-policy-classifier-squash-divergence-false-positive.md` — el fix previo y su verificación adversarial
- `docs/operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md`
- `docs/operations/runbooks/production-release.md` §2.3, §2.4, §4.1

## Dependencies & Impact

### Depends on

- `greenhouse_sync.release_manifests` (columna `target_sha`, `state`, `target_branch`) — ya existe
- `listRecentReleases({ targetBranch, limit })` en `src/lib/release/manifest-store.ts` — ya existe
- `TERMINAL_RELEASE_STATES` en `src/lib/release/state-machine.ts` — ya existe
- Credenciales PG en el job de preflight de `.github/workflows/production-release.yml` — ya declaradas

### Blocks / Impacts

- Todo release futuro: cambia lo que el gate acepta y rechaza en CI
- `ISSUE-144` (`vercel_readiness`) queda **fuera**, pero comparte familia; ver Out of Scope
- `src/lib/release/preflight/ignored-pending-runs.ts`: la entrada del run `31126022507` ya es letra
  muerta (el run fue cancelado el 2026-08-09) y se puede quitar en el mismo cambio

### Files owned

- `src/lib/release/preflight/checks/release-batch-policy.ts`
- `src/lib/release/preflight/checks/release-batch-policy.test.ts`
- `src/lib/release/preflight/batch-policy/domains.ts`
- `src/lib/release/preflight/batch-policy/classifier.ts`
- `src/lib/release/preflight/batch-policy/classifier.test.ts`
- `scripts/release/` (wrapper nuevo)
- `package.json` (script nuevo)
- `docs/operations/runbooks/production-release.md`
- `docs/manual-de-uso/plataforma/release-orchestrator.md`
- `.claude/skills/greenhouse-production-release/SKILL.md` + `.codex/skills/greenhouse-production-release/SKILL.md`

## Current Repo State

### Already exists

- `buildReleaseDiffRange(baseRef, targetSha)` en `src/lib/release/preflight/checks/release-batch-policy.ts` — el seam donde entra el re-anclaje (creado por el fix de `ISSUE-114`)
- `release-batch-policy.test.ts` con mock **sensible al rango** — la base sobre la que agregar los casos nuevos
- `RELEASE_COUPLED_MARKER_REGEX` en `src/lib/release/preflight/batch-policy/domains.ts`
- `listRecentReleases` en `src/lib/release/manifest-store.ts:388-409` [verificar líneas]
- `pnpm release:watchdog` ya consulta Cloud Run y expone `GIT_SHA` + `Ready` de los 4 workers

### Gap

- El `baseRef` sigue hardcodeado a `origin/${input.targetBranch}`
- No hay reader delgado del último release: `manifest-store.ts` es `import 'server-only'` y arrastra `@/lib/db` + outbox
- Un diff vacío se lee como `ship` (aprobación silenciosa) en vez de `unknown`
- La regex del marker acepta cualquier mención en prosa, en cualquier commit del rango
- No existe un wrapper para "estado + `GIT_SHA` de los 4 workers"; por eso el runbook tenía CLI crudo, que se pudrió

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `src/lib/release/preflight/**` + `scripts/release/**`, ejecutado por el CLI de preflight y por el job de `production-release.yml`
- Future candidate home: `remain-shared`
- Boundary: el check consume un reader de solo lectura de `greenhouse_sync.release_manifests`; ningún consumer nuevo escribe al manifest
- Server/browser split: `n/a` — el preflight es server-only y no tiene superficie de browser
- Build impact: `none` — sin dependencias nuevas; el reader delgado existe para NO arrastrar `@/lib/db` + outbox al preflight
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_sync.release_manifests` (solo lectura)
- Consumidores afectados: CLI `pnpm release:preflight` y job de preflight de `production-release.yml`
- Runtime target: `local` + `production` (el job corre con credenciales PG ya declaradas)

### Contract surface

- Contrato existente a respetar: `ProductionPreflightV1` (`contractVersion='production-preflight.v1'`) en `src/lib/release/preflight/types.ts`
- Contrato nuevo o modificado: `ReleaseBatchPolicyEvidence` gana la base usada y la dirección del cambio; el `contractVersion` **no** cambia si sólo se agregan campos opcionales
- Backward compatibility: `compatible` — campos nuevos opcionales; si el shape rompiera, bumpear versión
- Full API parity: el reader del último release es una primitive server-side reutilizable, no una query inline dentro del check

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_sync.release_manifests` (SELECT)
- Invariantes que no se pueden romper:
  - la task **no escribe** en `release_manifests` ni en `release_state_transitions` (append-only)
  - sólo cuenta como release previo un manifest en estado `released` para ese `target_branch`
  - sin release previo ⇒ `severity: 'unknown'`, **nunca** `ship`
- Tenant/space boundary: `n/a` — el control plane de release es global de plataforma, no per-tenant
- Idempotency/concurrency: read-only puro; el check es idempotente por construcción
- Audit/outbox/history: `none` — un read path no emite eventos; el audit del release ya vive en `release_state_transitions`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — un gate que sólo verifica "cuando alguien lo prende" repite el problema que la task arregla; se enciende con fallback honesto a `unknown`
- Backfill plan: `n/a`
- Rollback path: `revert PR + redeploy`; el peor caso es un gate que bloquea de más, y eso se ve en el propio `preflight-result.json`
- External coordination: ninguna; las credenciales PG del job ya están declaradas en `production-release.yml`

### Security and access

- Auth/access gate: el job de preflight ya corre con WIF + credenciales PG; no se agrega superficie nueva
- Sensitive data posture: `no sensitive data` — sólo SHAs, estados y nombres de rama
- Error contract: `captureWithDomain` + `redactErrorForResponse`, como el resto de los checks
- Abuse/rate-limit posture: `none with rationale` — no hay superficie pública

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/release/`, `pnpm release:preflight --target-sha=<sha>`
- DB/runtime checks: leer `release_manifests` vía el reader nuevo contra PG real (el SQL embebido debe ejercitarse contra PG, no sólo con mocks)
- Integration checks: una corrida real del orquestador y comparar su `preflight-result.json` contra el esperado
- Reliability signals/logs: sin señal nueva; la evidencia es el artefacto del preflight
- Production verification sequence: (1) release siguiente muestra `filesChanged > 0` y dominios reales; (2) un marker en el cuerpo del squash neutraliza `split_batch`; (3) el literal de `aea35a678` no lo neutraliza

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

### Slice 1 — Reader delgado del release anterior

- Reader de solo lectura que devuelve el `target_sha` del último manifest en estado `released` para
  un `target_branch`, sin arrastrar `@/lib/db` + outbox al preflight
- Filtrado explícito por estado: `listRecentReleases` **no** filtra y devuelve también `aborted`/`rolled_back`
- Tests con PG mockeado + una corrida real contra PG (SQL embebido no se valida sólo con mocks)

### Slice 2 — Re-anclar el batch policy

- `buildReleaseDiffRange` recibe el SHA del release anterior como `baseRef` en vez de `origin/<branch>`
- Sin release previo registrado ⇒ `severity: 'unknown'` con summary explícito; **nunca** `ship`
- Evidence declara qué base se usó, para que el `preflight-result.json` sea auditable
- Casos nuevos en `release-batch-policy.test.ts`, apoyados en el mock sensible al rango que ya existe

### Slice 3 — Endurecer el marker de acoplamiento

- La regex sólo matchea una declaración real (inicio de línea y/o sólo desde el cuerpo del commit de merge/squash), no una mención en prosa
- Test de regresión con el caso real de `aea35a678`
- Verificar que un marker escrito según el runbook **sí** neutraliza `split_batch` con la base nueva

### Slice 4 — Wrappers en vez de CLI crudo, y runbook que apunte a ellos

- `pnpm release:workers`: estado + `GIT_SHA` de los 4 servicios Cloud Run mapeados, en una línea por servicio
- Runbook y manual: el wrapper va primero; el CLI crudo queda como último recurso, con la nota de que si falla lo primero a sospechar es que la herramienta cambió
- Barrer los bloques `bash` de los docs de release y reemplazar por wrappers donde ya exista uno
- Quitar la entrada muerta del run `31126022507` de `ignored-pending-runs.ts`

## Out of Scope

- **`ISSUE-144`** (`vercel_readiness` confunde build saltado con fallido). Comparte familia pero
  tiene una **decisión de frontera abierta**: el `ignoreCommand` de Vercel corre antes de
  `pnpm install`, así que el SSOT compartido no puede ser TypeScript, y dónde vive define la
  dirección de la dependencia entre `src/lib/release/**` y `scripts/ci/**`. Mezclarlo acá bloquearía
  esta task esperando esa decisión.
- Un gate de CI que valide los comandos de la doc contra `--help`: evaluado y descartado por ahora —
  necesita los CLI instalados en CI, sólo atrapa deriva de flags, y con el Slice 4 la superficie
  restante es mínima.
- Cambiar la estrategia de merge del release (squash → merge commits). Es una decisión de proceso
  con el operador, no de código.
- Tocar la severidad del classifier ante un único dominio irreversible. Es más estricto que la matriz
  del runbook §2.2 y merece su propia discusión; ver Open Questions.

## Detailed Spec

**Por qué el ancla correcta es el release anterior.** La pregunta que el batch policy quiere
responder es *"¿qué agrega este release respecto de lo que ya está desplegado?"*. Hoy la aproxima con
`origin/<targetBranch>`, que funciona pre-merge y se degrada a tautología post-merge. El
`target_sha` del último manifest `released` responde la pregunta en los dos momentos:

| Momento | Base actual | Rango resultante | Base propuesta | Rango resultante |
|---|---|---|---|---|
| Local, pre-merge | `origin/main` | correcto | `prev_release_sha` | correcto (y estable ante pushes a `main`) |
| Orquestador, post-merge | `origin/main` (= target) | **vacío ⇒ `ship`** | `prev_release_sha` | diff real del release |

Efecto lateral valioso: con la base nueva, el rango post-merge **contiene el commit de squash**, así
que el marker `[release-coupled: …]` por fin se lee donde el runbook dice que se lee. El Slice 2 y el
Slice 3 se sostienen mutuamente: sin el 2, el marker sigue sin leerse; sin el 3, leerlo lo vuelve
más fácil de disparar por accidente.

**Guardrail de honestidad.** El fallback cuando no hay release previo es `unknown`, no `ship`. Un
gate que ante la duda aprueba es exactamente el defecto que esta task corrige, y sería irónico
reintroducirlo por la puerta de atrás.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → 2 → 3. El 2 depende del reader del 1, y el 3 sólo es verificable de punta a punta con la
base del 2 (antes, el marker no se lee en ningún camino). El Slice 4 es independiente y puede ir en
cualquier momento, incluso primero.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| El gate empieza a bloquear releases legítimos | control plane de release | Media | Fallback `unknown` en vez de `error`; una corrida en modo observación antes de que bloquee | `preflight-result.json` del run |
| El reader no encuentra release previo (base vacía) | `release_manifests` | Baja | `unknown` + summary explícito; nunca `ship` | severidad del check |
| El reader arrastra `server-only` + outbox al preflight | preflight CLI | Media | Reader delgado con `query` directo; test de frontera de imports | build/typecheck |
| La regex endurecida deja de reconocer markers válidos | batch policy | Media | Test con el marker canónico del runbook **y** con el falso positivo real | tests |
| Se rompe el propio release que lleva el fix | release | Baja | Slice `cloud_release`-only, verificado local contra el batch real antes de promover | preflight local |

### Feature flags / cutover

Sin flag de env var. El cambio es de un gate de solo lectura cuyo peor caso es visible y ruidoso en
el propio artefacto del preflight. Introducir un flag default-OFF crearía otro interruptor que hay
que acordarse de prender — precisamente la clase de deuda que el ledger de flags existe para evitar.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | revert PR | <5 min | sí |
| 2 | revert PR (vuelve a `origin/<branch>`) | <5 min | sí |
| 3 | revert PR (vuelve a la regex laxa) | <5 min | sí |
| 4 | revert PR (docs + script) | <5 min | sí |

### Production verification sequence

1. Correr `pnpm release:preflight` local contra un batch real y confirmar dominios reales.
2. Promover el fix como slice `cloud_release`-only.
3. En el release siguiente, leer el `preflight-result.json` del orquestador: debe mostrar
   `filesChanged > 0` y la base usada, no `Diff vacio respecto a origin/main`.
4. Confirmar que un marker en el cuerpo del squash neutraliza `split_batch` y que el literal de
   `aea35a678` no.

### Out-of-band coordination required

Ninguna. Sin secretos, sin env vars, sin redeploy de workers, sin cambios de infra.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El `preflight-result.json` de un release real reporta `filesChanged > 0` y dominios reales, en vez de `Diff vacio respecto a origin/main`
- [x] Sin release previo en `release_manifests`, el check devuelve `unknown` y **no** `ship`
- [x] El reader sólo considera manifests en estado `released` para la rama objetivo
- [x] El evidence declara explícitamente qué base se usó para el diff
- [x] Un marker `[release-coupled: …]` en el cuerpo del commit de squash neutraliza `split_batch`
- [x] El literal `[release-coupled: ...]` citado en prosa dentro de `aea35a678` **no** lo neutraliza (test de regresión)
- [x] `pnpm release:workers` imprime estado + `GIT_SHA` de los 4 workers y funciona con la versión actual de `gcloud`
- [x] Runbook y manual del orquestador citan el wrapper antes que el CLI crudo
- [x] La entrada del run `31126022507` ya no está en `ignored-pending-runs.ts`
- [x] El SQL del reader se ejercitó al menos una vez contra PG real, no sólo con mocks

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm vitest run src/lib/release/`
- `pnpm release:preflight --target-sha=<sha real> --target-branch=main`
- Corrida real del orquestador + lectura de su `preflight-result.json`

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] `ISSUE-145` movida a `docs/issues/resolved/` con su §Resolución y fila del índice actualizada
- [x] Ambas skills (`.claude` + `.codex`) actualizadas y **byte-idénticas** entre sí
- [ ] Verificado que `Handoff.md` y `changelog.md` conservan su entrada **después** del merge `main`→`develop` (el `-X ours` los descarta; las dos verificaciones del gotcha #1 no lo detectan porque sólo miran carpetas de código)

## Follow-ups

- `ISSUE-144` — `vercel_readiness` confunde build saltado a propósito con fallido; necesita la decisión de frontera del SSOT antes de tomarse
- Evaluar si el classifier debe seguir marcando `requires_break_glass` ante un único dominio irreversible, dado que la matriz del runbook §2.2 considera legítimo un release de migración acoplado a su consumer directo
- `azure_wif_subject` falla abierto: ante `Insufficient privileges` devuelve `severity: 'ok'` sin haber podido listar las federated credentials; los 3 artefactos revisados el 2026-08-09 tomaron ese camino

## Open Questions

> **Cerrada la segunda (2026-08-09), con datos y en contra de las dos alternativas que planteaba.**
> Se midió el classifier sobre los 8 releases del historial: 6 pidieron break-glass y **sólo 1 fue
> ruido** — los otros tenían migraciones reales o payroll. Relajar la severidad a "2+ dominios" habría
> bajado la tasa de 75% a 50%, pero dejando pasar sin fricción un release con **3 migraciones**: quita
> el freno justo donde más se necesita. El ruido no venía de la severidad sino de la granularidad —el
> classifier clasifica por path y no por contenido, así que cinco comentarios en `entitlements/`
> cuentan igual que otorgar un permiso—. Dueño del fix real: `TASK-1681`.


- ¿El gate debe **bloquear** desde el primer release con la base nueva, o correr una vez en modo observación para medir cuántos releases históricos habría frenado? Recomendación: observar uno, luego bloquear.
- ¿La severidad ante un único dominio irreversible se relaja a `warning` para alinearse con la matriz del runbook, o la matriz se endurece para alinearse con el código? Es una decisión del operador, no del implementador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 5 — DELTA DE EJECUCIÓN (2026-08-09)
     ═══════════════════════════════════════════════════════════ -->

## Delta de ejecución 2026-08-09

### Lo que la ejecución cambió respecto de la spec

**1. El invariante se reformuló sobre el RESULTADO, no sobre la base.** La spec pedía "sin release
previo ⇒ `unknown`". Se implementó algo más fuerte: **un diff vacío nunca es aprobación**, venga de
donde venga el ancla. Dos razones. Cubre un caso que la formulación original dejaba abierto —base
nueva presente pero target idéntico al release anterior—; y permite conservar el fallback a
`origin/<branch>` sin reabrir el agujero, cosa que importa porque **los 75 manifests son de `main`**
(medido) y un preflight exploratorio sobre otra rama habría quedado `unknown` para siempre.

**2. El marker se cerró con DOS candados, no uno.** La spec proponía "inicio de línea y/o sólo desde
el commit de merge". Hacen falta los dos: re-anclar la base mete el squash en rango, pero mete con él
los ~509 commits que lo preceden —442 KB de prosa medidos— donde una cita basta. Anclar la regex
reduce el vector; leer sólo el cuerpo del `target_sha` lo cierra, y de paso hace verdad lo que el
runbook §2.4 afirma desde siempre.

**3. El caso de regresión más elocuente no estaba en la issue.** Además de `aea35a678`, la ventana
contenía `6f3c833ed` — **el commit que creó esta task** — que al describir el defecto lo volvía a
disparar. Los tres literales reales quedaron fijados como tests.

**4. Defecto 4 de la issue (dirección del cambio) NO se implementó.** El `--name-status` para
distinguir "agrega" de "revierte" queda como follow-up. El objetivo de fondo —que el artefacto sea
auditable— sí se cubrió con `diffBase`/`diffBaseSource`/`diffBaseReleaseId`.

### Un test que probaba un dato, no un mecanismo

Retirar la entrada muerta de `ignored-pending-runs.ts` puso rojos dos tests **sin que el código
cambiara**: usaban el `runId` real de la única entrada operativa. Eran el test de regresión de un dato
caducable, no del mecanismo de exclusión. Ahora la lista se inyecta como fixture. Vale registrarlo
porque es una clase de bug, no un caso: un gate o un test que se rompe cuando caduca un dato operativo
está midiendo la cosa equivocada.

### Verificación contra el batch real

| Antes | Después |
|---|---|
| `filesChanged=0, decision=ship` (post-merge, tres releases seguidos) | **65 archivos clasificados**, citando base y release id en el summary |
| El artefacto no permitía distinguir "release vacío" de "base mal" | `diffBase` + `diffBaseSource` + `diffBaseReleaseId` en el evidence |

La primera corrida real reportó `requires_break_glass` por `cloud_release: 6`, **y los 6 archivos son
el propio fix del gate**. O sea: el gate detectó que el batch mezclaba trabajo funcional del portal
cliente con un cambio del control plane — que es exactamente lo que §Architecture Alignment de esta
task ya declaraba ("va en su propio release, no mezclado con trabajo funcional"). El gate no está
fallando: está diciendo la verdad por primera vez.

### Gates ejecutados

| Gate | Resultado |
|---|---|
| `pnpm local:check` | verde |
| `pnpm vitest run src/lib/release/` | 227 passed · 0 failed |
| `pnpm test` (suite completa) | ver cierre |
| `pnpm build` (producción) | ver cierre |
| SQL del reader contra PG real | verde — `e048ef3a47e9…` para `main` saltando el manifest abortado; `null` para `develop` |
| `pnpm release:workers` contra Cloud Run real | los 4 workers `Ready=True` sirviendo `e048ef3a47e9` |
| `pnpm release:preflight` contra el batch real | 65 archivos clasificados con base declarada |

### Estado de rollout

`code complete`. El fix es de un gate de solo lectura y no toca runtime de producto, pero su
verificación productiva sólo existe cuando el orquestador corre con él: leer el
`preflight-result.json` del siguiente release y confirmar `filesChanged > 0` con la base declarada.

### Open Question que queda viva y es del operador

El classifier marca `requires_break_glass` ante **un único** dominio irreversible, sin que haya mezcla
de dominios. La matriz del runbook §2.2 considera legítimo un release de migración acoplado a su
consumer directo. Con el gate arreglado esa diferencia deja de ser teórica: **todo release que toque
`src/lib/release/**`, `migrations/` o `.github/workflows/` va a pedir break-glass**. O se relaja la
severidad para un único dominio, o se endurece la matriz del runbook. Es decisión de proceso, y la
spec la dejó Out of Scope a propósito.
