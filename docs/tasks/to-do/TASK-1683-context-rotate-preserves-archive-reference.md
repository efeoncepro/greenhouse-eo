# TASK-1683 — Que la rotación de contexto no deje rojo su propio gate

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Bajo`
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
- Domain: `ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`pnpm docs:context-rotate --apply` archiva secciones de `Handoff.md` por bloque, y cuando la línea
`> Historial rotado: [Handoff.archive.md](Handoff.archive.md)` cae dentro del bloque archivado se va
con él. `pnpm docs:context-check:strict` exige esa referencia
(`check-context-handoff.mjs:163`), así que la rotación **deja rojo el gate que ella misma existe para
satisfacer**. Esta task hace que la referencia sobreviva a la rotación.

## Why This Task Exists

Ocurrió dos veces el 2026-08-09, en la misma sesión, con dos horas de diferencia. La secuencia es
siempre igual y por eso vale arreglarla: el gate estricto pide rotar → la rotación se come la
referencia → el gate estricto ahora falla por un error **distinto** (`must reference
Handoff.archive.md`) → el agente restaura la línea a mano.

El costo no es el minuto de restaurarla: es que el segundo error no se parece al primero, así que un
agente que ve `Errors: 1` después de rotar razonablemente sospecha de su propio cambio antes de
sospechar de la herramienta. La primera vez me llevó a releer el diff de `Handoff.md` buscando qué
había roto yo.

Y hay un agravante de diseño: la línea es un **puntero de navegación del documento**, no una entrada
de bitácora. No tiene fecha, no pertenece a ninguna sesión, y su lugar natural es el pie del archivo.
Que sea archivable es el bug.

## Goal

- `pnpm docs:context-rotate --apply` seguido de `pnpm docs:context-check:strict` da 0 errores, sin
  intervención manual, incluso cuando la referencia estaba dentro del bloque archivado.
- Un test fija esa secuencia, para que no vuelva por una tercera vez.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md` (contrato de `Handoff.md` y del archivo)

Reglas obligatorias:

- **NUNCA** relajar el gate para que la rotación pase: la referencia al archivo es parte del contrato
  —"archivar no significa ocultar"— y sin ella el historial queda inalcanzable desde la cabina.
- **NUNCA** hacer que la rotación mueva contenido de bitácora al pie para "salvar" la línea: lo que
  se mueve es el puntero, no las sesiones.
- **SIEMPRE** preservar el contenido semántico de lo archivado: la rotación no reescribe entradas.

## Normative Docs

- `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md` — la fila del release `2c87d71e2eca` registra las dos ocurrencias
- `scripts/maintenance/rotate-handoff-context.mjs` — su docblock ya narra dos bugs previos de esta misma herramienta (patrones de heading que matcheaban 1 de 40 y 0 de 23 secciones)

## Dependencies & Impact

### Depende de

- `scripts/maintenance/rotate-handoff-context.mjs` — existe
- `scripts/check-context-handoff.mjs` — existe; `requireIncludes` en la línea 163

### Impacta a

- Todo agente que cierre trabajo tocando `Handoff.md` o `changelog.md`, o sea prácticamente todos
- El gate `Agent Context Governance` del CI

### Files owned

- `scripts/maintenance/rotate-handoff-context.mjs`
- `scripts/maintenance/__tests__/` \[verificar el path real de sus tests]

## Current Repo State

### Already exists

- La rotación por bloques con detección de nivel de heading (`h2`/`h3`) y su degradación explícita
- El gate estricto con `requireIncludes('Handoff.md', handoff, 'Handoff.archive.md')`
- El contrato documental que exige el puntero al archivo

### Gap

- La rotación trata la línea del puntero como parte del bloque que la precede, porque su unidad de
  corte es el heading: cualquier línea entre dos headings pertenece al bloque de arriba.
- No hay test que ejercite `rotate --apply` seguido de `context-check --strict` sobre un `Handoff.md`
  donde la referencia esté en medio del contenido archivable.
- El script tiene tres bugs conocidos en su historia (dos narrados en su propio docblock, éste el
  tercero) y ninguno tenía test de la secuencia completa rotar→verificar. \[verificar si existen
  tests unitarios del script]

## Modular Placement Contract

- Topology impact: `none`
- Current home: `scripts/maintenance/` + `scripts/`, ejecutado por `pnpm` y el CI
- Future candidate home: `remain-shared`
- Boundary: tooling de repo; no consume ni expone contratos de dominio
- Server/browser split: `n/a`
- Build impact: `none`
- Extraction blocker: `none`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reproducir con un test que falle

- Test que construya un `Handoff.md` sintético con la referencia al archivo **en medio** del
  contenido archivable, corra la rotación y verifique con el mismo predicado del gate estricto.
- Debe fallar antes del fix. Un test que pasa antes no prueba nada.

### Slice 2 — Preservar el puntero

- La rotación reconoce la línea del puntero como **estructura del documento, no bitácora**, y la
  reemite al pie de `Handoff.md` después de archivar.
- Idempotente: correr la rotación dos veces no duplica la línea.
- Si el puntero no existía antes de rotar, la rotación lo agrega — porque después de archivar el
  contrato lo exige.

### Slice 3 — Cerrar el ciclo en el gate

- Que la secuencia `rotate --apply` → `context-check --strict` quede cubierta por el test del Slice 1
  como par, no como dos verificaciones sueltas. El bug vivía exactamente en la costura.

## Out of Scope

- Rediseñar la rotación, sus techos o su detección de headings.
- Cambiar el contrato de `Handoff.md` / `Handoff.archive.md`.
- Los otros dos bugs históricos del script: ya están resueltos y narrados en su docblock.

## Detailed Spec

**Por qué no alcanza con "el agente restaura la línea".** Ya lo hicimos dos veces el mismo día, y las
dos veces funcionó. El problema es que la herramienta le enseña al agente a desconfiar de su propio
trabajo: después de rotar aparece un error que no existía antes y que no menciona la rotación. Una
herramienta de mantenimiento que rompe su propia postcondición gasta atención cada vez que se usa, y
se usa en el momento de menos atención disponible — el cierre.

**Por qué el fix va en la rotación y no en el gate.** El gate tiene razón: sin el puntero, el
historial archivado queda inalcanzable desde la cabina de mando, que es justo lo que el modelo
operativo prohíbe ("archivar no significa ocultar"). Relajarlo cambiaría un molestia de tooling por
una pérdida real de navegabilidad.

## Rollout Plan & Risk Matrix

N/A — cambio aditivo sobre tooling local y de CI, sin impacto en runtime de producción, sin
migración ni flag. El rollback es `revert PR`: la rotación vuelve a comerse la línea y el agente la
restaura a mano, o sea al estado conocido de hoy.

Única precaución real: la rotación **escribe** `Handoff.md` y `changelog.md`, así que el Slice 2 se
prueba sobre archivos sintéticos en un directorio temporal, nunca sobre los del repo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm docs:context-rotate --apply` seguido de `pnpm docs:context-check:strict` da 0 errores sin
      intervención manual, con la referencia originalmente dentro del bloque archivado.
- [ ] Correr la rotación dos veces seguidas no duplica la línea del puntero.
- [ ] Si el puntero no existía antes de rotar, después de rotar existe.
- [ ] Existe un test que falla sin el fix y que cubre la secuencia rotar→verificar como par.
- [ ] El contenido semántico de lo archivado no cambió (la rotación sigue sin reescribir entradas).
- [ ] Los tests corren sobre archivos sintéticos, no sobre `Handoff.md` del repo.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts` \[verificar el path real de los tests del script]
- `pnpm docs:context-check:strict`
- Prueba manual: rotar con la referencia en medio del contenido archivable y confirmar 0 errores

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado — sólo si el comportamiento de la herramienta cambia de forma
      observable para quien la usa

## Follow-ups

- El script acumula tres bugs de la misma naturaleza: la herramienta no coincidía con la convención
  real del documento que edita. Vale evaluar si su unidad de corte debería ser explícita en el
  documento (un marcador de "acá termina la ventana activa") en vez de inferida por heading — cierra
  la clase entera en vez del tercer caso.

## Open Questions

1. ¿Existen tests unitarios de `rotate-handoff-context.mjs` hoy? Sus dos bugs previos se narran en el
   docblock, lo que sugiere que se arreglaron sin test de regresión. Si no existen, el Slice 1 crea el
   primero y conviene dejarlo dicho. \[verificar en Discovery]
