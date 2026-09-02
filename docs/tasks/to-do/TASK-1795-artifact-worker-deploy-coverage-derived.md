# TASK-1795 — La cobertura de deploy del artifact-worker se deriva del árbol real, no de una lista a mano

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El `artifact-worker` es el único worker del ecosistema cuya decisión de deploy sigue dependiendo de
una lista de rutas `src/lib/**` mantenida a mano — la bug class exacta que se rompió **5 veces** en
el `ops-worker` (TASK-1210, 742, 1723, 1746, 1279) y que produjo el incidente del release
`64bdd105c` (release `released` con el worker sirviendo código viejo). El gate nuevo
(`pnpm worker:deploy-path-gate`, commit `146070ffc`) no puede protegerlo: deriva la cobertura del
**metafile de esbuild**, y este worker corre el **árbol fuente con `tsx`, sin bundle** (decisión
deliberada de su Dockerfile). Esta task le da su propio mecanismo: la cobertura se deriva del
**grafo de imports TypeScript real** desde `services/artifact-worker/main.ts`, y un gate en CI
rompe el build cuando la lista del workflow y el grafo divergen.

## Why This Task Exists

Quedó como **límite declarado explícitamente** al cerrar el gate de cobertura de los workers
bundleados (2026-08-29): `worker-deploy-path-coverage-gate.mjs` cubre a los 3 workers con metafile
y el `artifact-worker` quedó fuera **con un comentario en su workflow advirtiendo esta misma bug
class** (`.github/workflows/artifact-worker-deploy.yml:12` — *"cada src/lib/** que el worker
consume DEBE estar listado o el worker queda stale en silencio"*). Un comentario de advertencia es
una guarda que afirma, no un mecanismo: el día que alguien agregue un import nuevo en
`src/lib/artifact-composer/**` (o en cualquiera de sus dependencias transitivas) y olvide la ruta,
el worker servirá código viejo sin error, sin señal, y con el workflow en verde. La misma clase de
falla silenciosa tardó **meses y 5 recurrencias** en cerrarse para el `ops-worker`; acá el costo de
cerrarla ANTES de la primera recurrencia es una fracción. Es además la misma familia de defecto que
`TASK-1782`/`TASK-1783` persiguen en otros gates: un alcance que sale de una lista a mano o de una
forma sintáctica, y no de la realidad del árbol.

## Goal

- La lista de rutas del workflow del `artifact-worker` (triggers `paths:` + drift/latest-SHA) deja
  de ser una afirmación: un gate de CI la compara contra el grafo de imports real del entrypoint y
  rompe el build ante cualquier ruta consumida y no listada.
- El derivador del grafo es determinista y con salida estable (mismo árbol ⇒ misma lista), para que
  el gate no flaquee.
- El comentario-advertencia del workflow pasa a referenciar el gate (la guarda textual señala al
  verificador real), y el límite declarado en las tres capas documentales del gate original se
  retira o se acota.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md` — el contrato de empaque de los
  workers; ahí quedó documentado el límite de alcance que esta task cierra
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md` — anti-patterns #13/#14 y la
  historia completa de la bug class
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- **NUNCA** "cerrar" el hueco agregando una ruta más a la lista a mano — es el parche que falló 5
  veces; el entregable es el mecanismo que deriva, no una lista mejor.
- **NUNCA** cambiar el empaque del worker a esbuild para reutilizar el metafile: la decisión
  tsx-sobre-árbol-fuente está documentada en su Dockerfile con su propia razón (bug class de
  resolución de módulos) y NO es alcance de esta task revertirla.
- **NUNCA** un gate cuya expectativa sea un literal editado por consumidor: los conteos y rutas
  esperadas se DERIVAN del grafo, jamás se fijan como snapshot (overlay `arch-architect` §Guardas
  textuales, 2026-08-29).
- La lista de `paths:` del trigger puede quedar más GRUESA que el grafo (sobre-disparar es seguro);
  lo que el gate prohíbe es que quede más FINA (sub-disparar es la falla silenciosa). El gate
  compara en esa dirección.

## Normative Docs

- `docs/manual-de-uso/plataforma/verificar-cobertura-de-deploy-de-workers.md` — manual del gate de
  los workers bundleados; esta task le agrega el carril del worker sin bundle
- `docs/tasks/complete/TASK-1391-tender-deck-renderer-worker-artifact-pipeline.md` — la task que
  creó el worker, su workflow y la decisión de empaque

## Dependencies & Impact

### Depends on

- `scripts/ci/worker-deploy-path-coverage-gate.mjs` — la mitad de comparación lista↔cobertura ya
  existe ahí; esta task reutiliza esa forma con otra fuente de verdad (grafo TS en vez de metafile)
- `.github/workflows/artifact-worker-deploy.yml` — el workflow cuya lista se gobierna
- `services/artifact-worker/main.ts` + `services/artifact-worker/Dockerfile` — el entrypoint real y
  el contrato de empaque tsx

### Blocks / Impacts

- El follow-up declarado de `TASK-1391` (integrar `artifact-worker-deploy.yml` al release control
  plane / `RELEASE_DEPLOY_WORKFLOWS` para producción) se beneficia directo: promover a producción
  un worker cuya cobertura de deploy es una lista a mano repetiría el modo de falla del release
  `64bdd105c` en el peor lugar. Esa integración es OTRA task; ésta la des-riesga.
- `TASK-1782`/`TASK-1783` (gates cuyo alcance sale de la realidad del árbol) — misma familia, cero
  archivos compartidos; coordinar vocabulario si se toman en la misma ventana.

### Files owned

- `scripts/ci/artifact-worker-import-graph-gate.mjs` (nuevo; o extensión con modo `source-tree` de
  `worker-deploy-path-coverage-gate.mjs` — decisión del agente con `arch-architect`)
- `scripts/ci/__tests__/` o test hermano del derivador (patrón de los gates existentes)
- `.github/workflows/artifact-worker-deploy.yml` (bloque `paths:` + comentario que referencia el
  gate)
- `.github/workflows/ci.yml` (registro del gate, junto a `worker:deploy-path-gate`)
- `package.json` (script `pnpm` del gate)
- `docs/architecture/GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md` (retiro/acote del límite declarado)
- `docs/manual-de-uso/plataforma/verificar-cobertura-de-deploy-de-workers.md` (carril nuevo)

## Current Repo State

### Already exists

- El gate por metafile para los 3 workers bundleados: `scripts/ci/worker-deploy-path-coverage-gate.mjs`
  + `pnpm worker:deploy-path-gate` en `.github/workflows/ci.yml` (commit `146070ffc`).
- El workflow del `artifact-worker` con su lista fina a mano y el comentario-advertencia
  (`.github/workflows/artifact-worker-deploy.yml:12` y su bloque `paths:` con
  `src/lib/artifact-composer/**`, `src/lib/commercial/tenders/**`, `src/lib/postgres/**`, etc.).
- La decisión de empaque tsx-sin-bundle documentada en `services/artifact-worker/Dockerfile:8`.
- El límite de alcance documentado en las tres capas al cerrar el gate original (2026-08-29).

### Gap

- Ningún mecanismo compara la lista del workflow contra lo que el worker realmente importa: la
  única defensa es el comentario y la memoria de quien agrega un import.
- No existe derivador del grafo de imports para un worker que corre árbol fuente (el metafile solo
  existe para los bundleados).

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ci/**` + `.github/workflows/**` del monorepo greenhouse-eo
- Future candidate home: `remain-shared`
- Boundary: un script de gate invocado por CI; consumidores autorizados son `ci.yml` y el operador
  vía `pnpm`; ningún runtime de producción lo importa
- Server/browser split: `n/a`
- Build impact: `none` — resolución de imports con la toolchain TS ya presente, sin dependencia nueva
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

### Slice 1 — El derivador del grafo de imports

- Script que resuelve el grafo de imports TRANSITIVO desde `services/artifact-worker/main.ts` con la
  resolución real del proyecto (paths de `tsconfig.json`, alias `@/`), y lo proyecta a un conjunto
  estable de prefijos de ruta (mismo árbol ⇒ misma salida, orden determinista).
- Candidato de implementación preferido: la API de TypeScript (`ts.createProgram` /
  `program.getSourceFiles()` filtrado a rutas del repo) — es la misma resolución con la que `tsx`
  ejecuta, así que la fuente de verdad coincide con el runtime real. Alternativa aceptable si el
  agente la justifica con `arch-architect`: un bundle esbuild **solo-análisis** (metafile sin
  emitir imagen), reutilizando el gate existente tal cual; deja constancia de por qué eligió una u
  otra.
- Test del derivador con un caso que discrimine: un import agregado a un archivo ya cubierto no
  cambia la salida; un import a un módulo fuera de los prefijos cubiertos SÍ la cambia.

### Slice 2 — El gate en CI

- Comparación direccional: toda ruta del grafo debe estar cubierta por la lista del workflow
  (triggers `paths:` y, si el workflow mantiene lista separada para drift/latest-SHA, también ésa);
  una lista más gruesa que el grafo pasa, una más fina falla nombrando las rutas descubiertas.
- Registro en `.github/workflows/ci.yml` junto a `worker:deploy-path-gate`, script `pnpm` propio, y
  comprobación del gate EN ROJO antes de darlo por bueno (introducir una divergencia sintética y
  confirmar que falla nombrándola).
- El comentario-advertencia del workflow pasa a referenciar el gate por nombre.

### Slice 3 — Corrección de la lista actual + cierre documental

- Correr el gate sobre el estado actual; si destapa rutas consumidas y no listadas, corregir la
  lista del workflow en el mismo PR (ese hallazgo es el valor inmediato de la task).
- Retirar/acotar el límite declarado en `GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md` y agregar el
  carril del worker sin bundle al manual `verificar-cobertura-de-deploy-de-workers.md`.
- Delta en `TASK-1391` (chequeo de impacto cruzado: su follow-up de control plane queda des-riesgado).

## Out of Scope

- Cambiar el empaque del `artifact-worker` (tsx → esbuild): decisión documentada con razón propia.
- Integrar `artifact-worker-deploy.yml` al release control plane / `RELEASE_DEPLOY_WORKFLOWS`
  (follow-up de `TASK-1391`, con su propio gate de sign-off).
- Tocar los 3 workers bundleados o su gate por metafile (ya cubiertos).
- Generalizar el derivador a otros consumidores tsx del repo (si el patrón resulta, es follow-up).

## Detailed Spec

La forma del gate copia la mitad que ya funciona: `worker-deploy-path-coverage-gate.mjs` compara
"lista declarada del workflow" contra "conjunto real de archivos del bundle" y falla con las rutas
faltantes. Lo único que cambia acá es la **fuente del conjunto real**: para un worker sin bundle,
la verdad es el grafo de módulos que la resolución TS alcanza desde el entrypoint — que es
exactamente lo que `tsx` va a ejecutar en Cloud Run.

Detalles que el agente debe respetar:

- La proyección grafo→prefijos debe ser conservadora: si el grafo alcanza
  `src/lib/artifact-composer/catalogs/deck-axis/algo.ts`, basta que la lista cubra
  `src/lib/artifact-composer/**`; el gate normaliza por el prefijo listado más específico que
  cubra el archivo, y solo reporta archivos que NINGÚN prefijo cubre.
- Excluir del grafo lo que no viaja al contenedor (tests, `__tests__/**`, mocks) usando el mismo
  criterio de exclusión que el Dockerfile del worker aplica al copiar el árbol.
- El gate corre sin red y sin credenciales (CI-safe), y su salida en rojo nombra archivo y prefijo
  sugerido — un rojo accionable, no un booleano.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (derivador + test) → Slice 2 (gate en CI) → Slice 3 (corrección de lista + docs).
- Slice 3 no puede adelantarse: corregir la lista sin el gate deja la clase abierta (sería la
  6.ª iteración del parche).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El derivador reporta de más (falsos rojos por archivos que el contenedor no ejecuta) | release / CI | medium | exclusiones espejo del Dockerfile + test del derivador; el gate nombra archivos para triage rápido | gate rojo en PRs que no tocan al worker |
| El derivador reporta de menos (import dinámico/no estático fuera del grafo TS) | release | low | inventario de `import(` dinámicos en el árbol del worker durante Discovery; si existen, se listan como cobertura manual DECLARADA dentro del gate, con razón | corrida del gate contra un caso sintético con import dinámico |
| Ampliar `paths:` del trigger dispara deploys de staging de más | ops | low | sobre-disparar es seguro por diseño (deploy idempotente change-gated); se acepta | frecuencia de deploys del worker en Actions |

### Feature flags / cutover

Sin flag — el gate es tooling de CI aditivo; su peor caso es un rojo accionable en PR. La eventual
corrección de la lista del workflow (Slice 3) solo AGREGA rutas al trigger, que es la dirección
segura.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del PR (script + test sin consumidores) | <5 min | sí |
| Slice 2 | quitar el step de `ci.yml` (⚠️ deja la clase sin mecanismo: último recurso) | <5 min | sí |
| Slice 3 | revert del PR; las rutas agregadas al trigger no requieren undo operativo | <5 min | sí |

### Production verification sequence

1. Gate comprobado EN ROJO con divergencia sintética (archivo del grafo sin prefijo que lo cubra) y
   en verde tras cubrirla.
2. `pnpm lint` + `pnpm typecheck` + tests del derivador verdes.
3. Un PR que toque un módulo consumido por el worker y NO listado (si Slice 3 destapó alguno) debe
   salir rojo del gate antes del fix de lista — esa corrida es la evidencia de que el mecanismo
   protege de verdad.
4. Post-merge: el siguiente push a develop que toque rutas del worker debe disparar
   `artifact-worker-deploy.yml` (observable en Actions).

### Out-of-band coordination required

N/A — repo-only change (CI + workflow + docs); sin secretos, sin GCP, sin coordinación humana
externa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un derivador determinista del grafo de imports del `artifact-worker` con test que
      discrimina (import nuevo fuera de cobertura cambia la salida; dentro de cobertura, no).
- [ ] Existe un gate en `ci.yml` que falla nombrando toda ruta del grafo no cubierta por la lista
      del workflow, y se comprobó EN ROJO antes de darse por bueno.
- [ ] La dirección de la comparación está implementada y documentada: lista más gruesa pasa, lista
      más fina falla.
- [ ] Los imports dinámicos del árbol del worker (si existen) están inventariados y cubiertos con
      declaración explícita dentro del gate, no ignorados.
- [ ] El comentario del workflow referencia el gate por nombre (la advertencia señala al
      verificador real).
- [ ] El límite declarado en `GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md` quedó retirado o acotado, y
      el manual del gate documenta el carril sin-bundle.
- [ ] `TASK-1391` recibió su Delta de impacto cruzado.
- [ ] Ninguna ruta se agregó a mano sin que el gate la haya nombrado primero.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run scripts/ci` (o la ubicación del test del derivador)
- Corrida del gate en rojo (divergencia sintética) y en verde, con salida capturada
- `pnpm ops:lint --changed`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Delta en `TASK-1391` registrado (des-riesgo de su follow-up de control plane)

## Follow-ups

- Generalizar el derivador de grafo a otros consumidores tsx del repo si aparece un segundo worker
  sin bundle.
- La integración de `artifact-worker-deploy.yml` al release control plane (follow-up vigente de
  `TASK-1391`) puede citar este gate como prerequisito de su sign-off.

## Open Questions

- ¿Derivador con API de TypeScript o esbuild solo-análisis? Preferencia declarada por TS (misma
  resolución que `tsx` en runtime); la alternativa exige justificación con `arch-architect` en el
  plan.
