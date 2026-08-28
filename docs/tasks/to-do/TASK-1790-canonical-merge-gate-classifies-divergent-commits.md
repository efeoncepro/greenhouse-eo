# TASK-1790 — El merge canónico develop←main lo decide un gate, no la prosa del runbook

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
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
- Backend impact: `reader`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El merge canónico `origin/main → develop` que precede a cada PR de release se decide hoy leyendo
prosa y eligiendo a mano entre `-s ours` y `-X ours`. Tres releases seguidos eligieron mal y metieron
contenido de `main` en silencio, uno de ellos código de producción. Esta task convierte esa decisión
en un comando — `pnpm release:merge-canonical` — que clasifica los commits divergentes contra
`greenhouse_sync.release_manifests`, elige la estrategia, corre las cuatro verificaciones y **se niega**
ante un commit que no reconoce.

## Why This Task Exists

La regla estaba **factualmente invertida**, no solo mal redactada. Prescribía `-s ours` "si V1 está
vacía (el caso normal)" y `-X ours` si no, donde V1 = `git log origin/main --not HEAD`. Con
squash-merge V1 **nunca** está vacía en el estado estacionario: cada release deja en `main` un commit
de squash que no será ancestro de `develop` hasta que el merge canónico del release siguiente lo
traiga. Comprobado el 2026-08-28: los squashes de los siete releases del 08-09 al 08-27 son todos
ancestros de `origin/develop`, y V1 al arrancar ese release era exactamente `{cc73c74789ce}`. La rama
que el runbook llamaba "el caso normal" era inalcanzable, así que la regla literal empujaba a
`-X ours` en **todos** los releases.

`-X ours` solo decide los hunks en conflicto: los de `main` que aplican limpio entran como adición
silenciosa. El costo medido:

| Fecha | Release | Qué entró en silencio |
|---|---|---|
| 2026-08-06 | `fcee5ab9f7ce` | `dataForSeoBreaker.recordFailure(family)` incondicional — **código de producción** que habría contado 4xx del caller y abierto el breaker |
| 2026-08-23 | `709e15f6688e` | 8 tasks resucitadas en su lifecycle viejo + 10 líneas duplicadas de un manual |
| 2026-08-28 | `c983be7f18e6` | Un bloque completo de `.claude/rules/growth-seo.md` duplicado + TASK-1775/1776/1777 resucitadas en `in-progress/`, **con la verificación de código vacía** |

La regla ya quedó corregida en prosa (runbook §2.4, playbook, las dos skills espejadas y el manual del
orchestrator). Pero **la prosa ya había sido corregida antes**: el delta del 2026-08-23 documentaba
exactamente esta clase de bug y aun así el 08-28 volvió a ocurrir. Un gotcha documentado y no
pre-emptado es un incidente agendado; el arreglo durable es que la máquina decida.

## Goal

- `pnpm release:merge-canonical` clasifica los commits que `main` tiene de más y elige la estrategia.
- Un commit que no sea un squash de release reconocido **detiene** el merge con un diagnóstico
  accionable, en vez de degradar a una estrategia que adivina.
- Las cuatro verificaciones post-merge corren solas y fallan ruidoso.
- El runbook y las skills dejan de prescribir comandos git a mano y apuntan al comando.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- El source of truth de qué es un release es `greenhouse_sync.release_manifests`, nunca el título del
  commit por sí solo ni una lista a mano de SHAs.
- La herramienta **lee**; nunca escribe ni transiciona un manifest. Escribir manifests sigue siendo
  exclusivo de `recordReleaseStarted` / `transitionReleaseState`.
- Cualquier cambio al procedimiento de release actualiza, en el mismo change set, el runbook, el
  playbook, las dos skills espejadas y el manual del orchestrator (skill-maintenance contract de
  `greenhouse-production-release`).
- El checkout es compartido: la herramienta opera sobre el árbol actual y nunca crea worktrees,
  clones ni checkouts aislados.

## Normative Docs

- `docs/operations/runbooks/production-release.md` (§2.4 Paso A — la regla ya corregida en prosa)
- `docs/operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md`
- `.claude/skills/greenhouse-production-release/SKILL.md` y su espejo `.codex/`
- `docs/manual-de-uso/plataforma/release-orchestrator.md`
- `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md` (bitácoras de los tres releases afectados)

## Dependencies & Impact

### Depends on

- `greenhouse_sync.release_manifests` — poblada y con estados `released` reales.
- `src/lib/release/preflight/last-released-reader.ts` — expone `readLastReleasedRelease`, que ya
  resuelve el último manifest `released` por rama. El gate extiende este primitive; no abre un lector
  paralelo.
- `src/lib/release/manifest-store.ts` — `listRecentReleases` para obtener el conjunto de `target_sha`
  ya desplegados contra el cual clasificar.

### Blocks / Impacts

- `TASK-864` (production readiness control plane contract) — el gate es una pieza más del control
  plane que 864 quiere endurecer; coordinar para no duplicar la separación doctor/preflight.
- `TASK-1681` (batch policy clasifica por contenido) — comparte la noción de "rango del release" y el
  helper `buildReleaseDiffRange`; ninguna de las dos posee los archivos de la otra.
- `TASK-860` (PR lifecycle multi-agente) — **observa** PRs vía webhook; esta task **ejecuta** el merge
  previo al PR. Objetos distintos, cero archivos compartidos.
- Cualquier agente que ejecute un paso a producción: cambia el paso A de su procedimiento.

### Files owned

- `scripts/release/merge-canonical.ts`
- `src/lib/release/canonical-merge.ts`
- `src/lib/release/canonical-merge.test.ts`
- `package.json` (script `release:merge-canonical`)
- `docs/operations/runbooks/production-release.md` (§2.4 Paso A)
- `docs/operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md` (pre-empción del gotcha #1)
- `.claude/skills/greenhouse-production-release/SKILL.md`
- `.codex/skills/greenhouse-production-release/SKILL.md`
- `docs/manual-de-uso/plataforma/release-orchestrator.md`

## Current Repo State

### Already exists

- `src/lib/release/preflight/last-released-reader.ts:67` — `readLastReleasedRelease({ targetBranch })`,
  el reader que resuelve el último manifest `released` de una rama.
- `src/lib/release/manifest-store.ts:388` — `listRecentReleases`, con paginación.
- `src/lib/release/preflight/checks/release-batch-policy.ts:67` — `buildReleaseDiffRange`, la función
  única que resuelve el rango del diff, con guardrail anti-regresión en su test.
- `scripts/release/` — siete scripts del control plane con el mismo patrón de invocación
  (`tsx --require ./scripts/lib/server-only-shim.cjs`).
- La regla correcta, ya escrita en prosa en el runbook, el playbook, las dos skills y el manual.

### Gap

- No existe ninguna herramienta que ejecute o valide el merge canónico: es el único paso del release
  que sigue siendo enteramente manual y decidido por lectura.
- No existe un clasificador de commits divergentes contra manifests; el agente compara títulos a ojo.
- Las cuatro verificaciones post-merge son comandos sueltos que hay que recordar y correr en orden;
  la que caza la duplicación documental (`--name-status` completo) es justamente la más fácil de
  omitir, y omitirla es lo que dejó pasar los tres incidentes.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/release/` + `src/lib/release/` en el monorepo Greenhouse
- Future candidate home: `remain-shared`
- Boundary: `src/lib/release/canonical-merge.ts` expone un clasificador puro; el script es su único
  consumidor autorizado y los readers de manifest siguen siendo los canónicos
- Server/browser split: `n/a` — herramienta de línea de comandos, jamás alcanzable desde el browser
- Build impact: `none` — sin dependencias nuevas; reusa `tsx` y el shim `server-only` existentes
- Extraction blocker: `none` — depende sólo del reader de manifests y de git local

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_sync.release_manifests` (lectura exclusiva)
- Consumidores afectados: agentes y operadores que ejecutan un paso a producción
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: `src/lib/release/preflight/last-released-reader.ts`,
  `src/lib/release/manifest-store.ts`
- Contrato nuevo o modificado: `src/lib/release/canonical-merge.ts` (clasificador puro) +
  `pnpm release:merge-canonical` (CLI)
- Backward compatibility: `compatible` — agrega un comando; no cambia ningún contrato existente
- Full API parity: `N/A — no capability`. Es tooling de operación local, no una acción de negocio
  sobre estado, permisos ni datos del producto; no hay superficie que un consumer deba operar.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_sync.release_manifests` (SELECT)
- Invariantes que no se pueden romper:
  - La herramienta **jamás** escribe, transiciona ni inserta en `release_manifests`.
  - Un commit divergente sólo se clasifica como squash de release si su SHA coincide con el
    `target_sha` de un manifest en estado `released`; el título es evidencia de apoyo, nunca la
    prueba.
  - Ante cualquier commit no clasificable, la salida es **detenerse**. Nunca elegir una estrategia
    por descarte.
  - `git merge -s ours` sólo se ejecuta con `--apply` explícito; el modo por defecto es diagnóstico.
- Write-target allowlist: `N/A` — la herramienta no escribe en ninguna tabla
- Tenant/space boundary: `N/A` — no hay tenant; el eje es la rama (`target_branch`)
- Idempotency/concurrency: correr el comando dos veces sobre el mismo estado da el mismo veredicto.
  Si el árbol está sucio o hay un merge en curso, aborta antes de tocar nada.
- Audit/outbox/history: `none` — es una lectura de diagnóstico local; el audit del release ya lo
  cubre el manifest y sus transiciones

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `read-only` — sin `--apply`, sólo imprime la clasificación y el veredicto
- Backfill plan: `N/A`
- Rollback path: revert del PR; el comando es aditivo y nada depende de él hasta que el runbook lo
  declare canónico
- External coordination: `N/A — repo-only change`

### Security and access

- Auth/access gate: credenciales PostgreSQL del perfil de operación ya usadas por el resto de
  `scripts/release/`; sin superficie de red nueva
- Sensitive data posture: `no sensitive data` — SHAs, ramas y estados de release
- Error contract: mensajes de diagnóstico accionables por consola; sin errores crudos ni stack traces
  al operador
- Abuse/rate-limit posture: `none with rationale` — herramienta local, sin superficie expuesta

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/release/canonical-merge.test.ts`, `pnpm lint`, `pnpm typecheck`
- DB/runtime checks: correr el comando contra la base real vía `pnpm pg:connect` y confirmar que
  resuelve el conjunto de `target_sha` `released` y clasifica el estado actual de `main` vs `develop`
- Integration checks: reproducir los tres escenarios históricos (2026-08-06, 08-23, 08-28) usando los
  SHAs reales del repo y confirmar el veredicto esperado en cada uno
- Reliability signals/logs: `none` — no corre en runtime productivo
- Production verification sequence: `N/A — herramienta local`. Su prueba real es el siguiente paso a
  producción ejecutado con el comando en vez de a mano, registrado en el ledger de tiempos.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores nombrados con paths reales.
- [ ] Invariantes de datos, frontera de acceso e idempotencia explícitos.
- [ ] `N/A` de write-target allowlist justificado: la herramienta no escribe.
- [ ] Postura de migración/rollback explícita y proporcional.
- [ ] Evidencia de runtime listada para el cambio.
- [ ] Sin datos sensibles, sin errores crudos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Clasificador puro

- `src/lib/release/canonical-merge.ts` con una función pura que recibe la lista de commits
  divergentes (SHA + asunto) y el conjunto de `target_sha` con manifest `released`, y devuelve un
  veredicto discriminado: `safe_ours` · `stop_unrecognized_commit` · `stop_dirty_tree`.
- Sin git, sin DB, sin I/O: entra dato, sale decisión. Testeable en milisegundos.
- `src/lib/release/canonical-merge.test.ts` cubriendo, como mínimo: sólo squashes conocidos; un
  hotfix desconocido; mezcla de ambos; lista vacía; un commit cuyo título parece release pero cuyo
  SHA no está en ningún manifest (el caso que el título solo no distingue).

### Slice 2 — CLI de diagnóstico

- `scripts/release/merge-canonical.ts` + script `release:merge-canonical` en `package.json`.
- Resuelve los commits divergentes con git, el conjunto de SHAs `released` reusando
  `readLastReleasedRelease` / `listRecentReleases`, e imprime la clasificación commit por commit con
  su veredicto.
- Modo por defecto: **no muta nada**. Aborta si el árbol está sucio o hay un merge en curso.
- Salida no-cero cuando el veredicto es `stop_*`, con el diagnóstico de qué commit no reconoció y qué
  hacer (reconciliar el hotfix a `develop` por su camino canónico).

### Slice 3 — Ejecución y verificación

- `--apply` ejecuta `git merge origin/main -s ours --no-edit` sólo cuando el veredicto es `safe_ours`.
- Post-merge corre las cuatro verificaciones y falla ruidoso si alguna no sale limpia:
  1. `git log origin/main --not HEAD` vacío
  2. `git diff HEAD@{1} HEAD --name-status` **completo** vacío
  3. `git diff HEAD@{1} HEAD -- src/ scripts/ services/ migrations/` vacío
  4. `git diff --diff-filter=A --name-only origin/develop origin/main` vacío
- Ninguna verificación es opcional ni salteable por bandera.

### Slice 4 — El runbook apunta al comando

- Runbook §2.4 Paso A, playbook, las dos skills espejadas y el manual del orchestrator dejan de
  prescribir la secuencia git a mano y prescriben el comando, conservando el árbol de decisión como
  explicación de qué hace el gate.
- Verificar que los dos bundles de la skill quedan idénticos, como exige su contrato.

## Out of Scope

- La creación del PR, el squash merge y el marker `[release-coupled: …]`.
- El `release_batch_policy` y su clasificación por contenido — es `TASK-1681`.
- La capability del bypass y su enforcement — es `TASK-1682`.
- El watchdog, el orquestador y la transición del manifest.
- Automatizar el paso a producción completo. Esta task automatiza **un** paso, el que demostró tener
  una regla que dirigía al error.

## Detailed Spec

El veredicto sale de responder, por cada commit que `main` tiene y `develop` no: *¿su contenido ya
está en `develop`?*

- **Es un squash de release** (`SHA ∈ {target_sha de manifests released}`) ⇒ su contenido salió de
  `develop` por construcción, porque el squash se hizo DE commits de `develop`. Descartarlo con
  `-s ours` no pierde nada.
- **No lo es** ⇒ es un hotfix, un push directo o un revert hecho en `main`. Puede que su contenido ya
  haya vuelto a `develop` por cherry-pick, o puede que no. La herramienta **no adivina**: se detiene y
  nombra el commit para que un humano lo resuelva por su camino canónico.

El título del commit no es prueba. Un commit puede llamarse `release: …` sin ser un release
registrado —y ése es exactamente el caso que un clasificador por título dejaría pasar—, por eso la
pertenencia se decide contra el manifest.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (clasificador puro) → Slice 2 (CLI de diagnóstico) → Slice 3 (ejecución + verificación).
- Slice 3 **no puede** shippear antes que Slice 2: una herramienta que muta el árbol antes de que su
  diagnóstico esté probado en modo lectura repite el defecto que esta task corrige.
- Slice 4 va al final: el runbook no debe apuntar a un comando que todavía no verifica lo que promete.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El clasificador marca `safe_ours` sobre un hotfix real y `-s ours` descarta su contenido | release | low | La pertenencia se decide contra `release_manifests`, no contra el título; ante cualquier commit no reconocido el veredicto es detenerse, nunca continuar | Verificación 4 (`--diff-filter=A`) post-merge, que falla ruidoso |
| El reader de manifests no resuelve (base sin credenciales, sesión caída) y la herramienta degrada a "no hay releases conocidos" | release | medium | Un conjunto vacío de SHAs `released` es una condición de error explícita, no un permiso: sin manifests no hay clasificación posible y el veredicto es detenerse | Salida no-cero con el motivo del fallo de lectura |
| `--apply` corre sobre un árbol sucio o con un merge en curso y mezcla trabajo de otra sesión | release | medium | Aborta antes de tocar nada si el árbol no está limpio; el checkout es compartido y eso es un invariante del repo | El propio abort |
| El runbook queda apuntando al comando mientras el comando todavía no verifica | release | low | Slice 4 es el último por contrato de ordering | Revisión del PR |

### Feature flags / cutover

Sin flag — herramienta local aditiva, cutover inmediato. Nada en producción la invoca y ningún
workflow depende de ella; su adopción es que el runbook la prescriba.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert del PR | <5 min | si |
| Slice 2 | Revert del PR | <5 min | si |
| Slice 3 | Revert del PR; el merge ya aplicado se deshace con `git reset --hard` al SHA previo, que la herramienta imprime antes de mutar | <5 min | si |
| Slice 4 | Revert del PR; el runbook vuelve a la prosa corregida, que ya es correcta | <5 min | si |

### Production verification sequence

1. Correr el comando en modo lectura contra el estado real del repo y confirmar que clasifica el
   squash del último release como reconocido.
2. Reproducir los tres escenarios históricos con sus SHAs reales y confirmar el veredicto esperado.
3. Fabricar un commit local no registrado sobre una copia de `main` y confirmar que el veredicto es
   detenerse, nombrando ese commit.
4. Usar el comando en el siguiente paso a producción real, con `--apply`, y registrar el resultado en
   `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md`.

### Out-of-band coordination required

`N/A — repo-only change`. Ningún sistema externo participa; la única coordinación es avisar en el
Handoff que el paso A del release cambió de prosa a comando.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm release:merge-canonical` existe y, sin banderas, no muta el árbol.
- [ ] El clasificador es una función pura con tests que cubren los cinco casos del Slice 1.
- [ ] Un commit divergente que no corresponde a un manifest `released` produce salida no-cero y nombra
      ese commit.
- [ ] Un conjunto vacío de manifests `released` produce salida no-cero, nunca un veredicto permisivo.
- [ ] `--apply` sólo ejecuta el merge cuando el veredicto es `safe_ours`, y corre las cuatro
      verificaciones después, fallando ruidoso si alguna no sale limpia.
- [ ] Ninguna verificación puede saltearse con una bandera.
- [ ] La herramienta no ejecuta ningún INSERT, UPDATE ni DELETE sobre `release_manifests`.
- [ ] Los tres escenarios históricos (2026-08-06, 08-23, 08-28) quedan cubiertos como casos de prueba
      con sus SHAs reales.
- [ ] Runbook, playbook, las dos skills espejadas y el manual del orchestrator prescriben el comando.
- [ ] `diff .claude/skills/greenhouse-production-release/SKILL.md .codex/skills/greenhouse-production-release/SKILL.md`
      sale vacío.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/release/canonical-merge.test.ts`
- `pnpm test`
- Corrida real del comando contra la base vía `pnpm pg:connect`, con su salida pegada en el PR

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado
- [ ] `changelog.md` quedó actualizado
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] el primer paso a producción ejecutado con el comando quedó registrado en
      `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md`, con el veredicto que dio

## Follow-ups

- Evaluar si el mismo patrón —clasificar contra el manifest en vez de leer prosa— aplica a otros pasos
  del release que hoy dependen de que el agente recuerde una regla.
- `TASK-1681` y `TASK-1682` comparten el control plane del preflight; revisar si conviene un orden
  entre las tres cuando se tomen.

## Open Questions

- ¿El comando debe correr también en CI sobre el PR `develop→main`, o queda como herramienta de
  operador? Correrlo en CI lo volvería un gate de verdad, pero el merge canónico ocurre **antes** del
  PR, así que el CI llegaría tarde para prevenir y sólo serviría para detectar. Decidir al tomarla.
- ¿Qué hacer cuando el commit no reconocido es un revert legítimo hecho en `main` durante un
  rollback? El veredicto de detenerse es correcto, pero conviene decidir si el diagnóstico debe
  ofrecer una ruta específica para ese caso.
