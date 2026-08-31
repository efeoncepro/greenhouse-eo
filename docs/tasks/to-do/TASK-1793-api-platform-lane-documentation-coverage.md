# TASK-1793 — El lane ecosystem se documenta solo cuando alguien pasa por ahí: 20 de 26 rutas SEO sin declarar

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `policy`
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
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` es el doc donde el lane ecosystem se documenta de
verdad, y su cobertura del carril growth/seo es **6 de 26 rutas** — medido contra el filesystem,
no estimado. Las 20 restantes existen, están federadas algunas de ellas al gateway MCP, y no
figuran en ningún doc de contrato. En paralelo, `docs/api/**` tiene **cero menciones de growth**
y su propio archivo raíz se declara *"documento derivado/transicional, ya no source of truth"*.

Esta task no es "escribir los 20 deltas que faltan". Es cerrar la **causa**: el lane se documenta
como efecto secundario de que una task pase por ahí, así que la cobertura depende de quién tuvo
tiempo. Sin un mecanismo, el número vuelve a caer en el próximo trimestre.

## Why This Task Exists

Tres razones concretas, en orden de peso:

1. **La ausencia no se distingue de la decisión.** Una ruta que no está en el doc puede ser una
   que nadie documentó o una que deliberadamente no se expone. Hoy son indistinguibles, y ésa es
   exactamente la clase de hueco que el guard de paridad del gateway MCP ya cerró del lado de las
   tools (`efeonce-mcp/src/providers/greenhouse-seo-tool-parity.ts`: toda tool está *federada O
   excluida con razón*, la ausencia silenciosa no es una decisión). **El lane HTTP no tiene ese
   guard.**

2. **El doc que un agente lee primero miente por omisión.** `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
   describe el lane con detalle —anti-oracle, `servedMarket`, tiers— y quien lo lea concluirá que
   la enumeración es el inventario. No lo es.

3. **`docs/api/**` está peor que vacío para este dominio.** No es que le falten rutas nuevas: no
   tiene ninguna de growth, y agregar sólo unas pocas sugeriría que está al día. Hay que decidir
   si se retira, se marca explícitamente como no-canónico para growth, o se llena — pero no
   dejarlo en el limbo actual.

🔴 **Hallazgo de método que esta task debe heredar:** medir esta cobertura por substring produce
falsos verdes. Un primer barrido marcó `performance` como documentada porque la palabra aparecía
en prosa sobre *"auth, caching, paginación y performance"*. Y un segundo barrido, corrigiendo el
primero, dio **3 de 26** porque su regex no contemplaba la notación de llaves que el doc usa
(`/api/platform/ecosystem/growth/seo/{keyword-opportunities,visibility-360,entitlement}`). El
número correcto —6— salió recién al medir por ruta completa **y** por forma expandida. Cualquier
gate que se escriba acá tiene que derivar del filesystem y contemplar las dos notaciones.

## Goal

- Un **mecanismo** que haga imposible que una ruta del lane nazca sin quedar declarada: o
  documentada, o excluida con razón. El precedente es el guard bidireccional del gateway.
- La cobertura del carril growth/seo cerrada como consecuencia de aplicar ese mecanismo, no como
  trabajo manual que hay que repetir.
- Una decisión explícita sobre `docs/api/**`: retirarlo, acotarlo o llenarlo. El limbo se cierra.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — el doc a cerrar
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — por qué el contrato programático
  es parte de "listo", no un extra
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §1.1/§7/§17 — el boundary que
  decide cuáles rutas son internal-only y por qué
- `CLAUDE.md` §"Full API Parity Principle"

Reglas obligatorias:

- **NUNCA documentar una ruta sin su postura de binding.** El anti-oracle no es un detalle: varias
  de estas rutas son `internal`-only con 404 deliberado, y omitirlo invita a exponerlas.
- **NUNCA inventar la razón de una exclusión.** Si no se sabe por qué una ruta no está expuesta al
  cliente, se pregunta o se marca `[verificar]` — una razón fabricada es peor que el hueco.
- **NUNCA medir la cobertura por substring** (ver el hallazgo de método arriba).

## Normative Docs

- `efeonce-mcp/src/providers/greenhouse-seo-tool-parity.ts` — el precedente del guard bidireccional
  y su vocabulario (`undeclared_in_gateway`, `exclusion_reason_missing`)
- `docs/tasks/complete/TASK-1658-*.md` [verificar nombre exacto] — la task que cerró el drift
  equivalente del lado de las tools MCP

## Dependencies & Impact

### Depends on

- Nada bloqueante. Las 26 rutas ya existen en `src/app/api/platform/ecosystem/growth/seo/**`.

### Blocks / Impacts

- Toda task futura que agregue una ruta al lane: si el gate aterriza, agregar ruta pasa a exigir
  declararla en el mismo PR.
- `TASK-1780` (inventario canónico de tools MCP) quedó **`complete` el 2026-08-31**: deja de ser una task
  futura con la que coordinar y pasa a ser el precedente a copiar. Vocabulario a espejar:
  `src/mcp/greenhouse/tool-manifest.ts` + el gate `pnpm mcp:manifest:check`. 🔴 El precedente son **dos
  piezas**, no una: manifiesto dueño en el PRODUCTO + guardia consumidor en el ADAPTADOR — que es justo la
  separación que este gate necesita para el lane HTTP.

### Files owned

- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `scripts/ci/api-platform-lane-coverage-gate.mjs` (nuevo) [verificar nombre al crear]
- `docs/api/**` (decisión de alcance)

## Current Repo State

### Already exists

- 26 rutas en `src/app/api/platform/ecosystem/growth/seo/**`, todas con header que declara su task
  dueña (salvo cuatro: `backlink-detail`, `domain-overview`, `keyword-market-data`,
  `url-visibility`).
- El doc del lane con 6 de ellas declaradas: `keyword-opportunities`, `visibility-360`,
  `entitlement` (notación de llaves), `keywords/track`, `provider-spend`, `work-queue`.
- El precedente completo del guard bidireccional, funcionando, en el repo `efeonce-mcp`.

### Gap

- **20 rutas sin declarar**: `backlink-detail`, `backlink-profile`, `competitor-candidates`,
  `competitors/declare`, `competitors/retire`, `domain-overview`, `grounded-queries`,
  `keyword-discovery`, `keyword-discovery/actions`, `keyword-gap`, `keyword-market-data`,
  `keywords/untrack`, `overview-kpis`, `performance`, `performance-catalog`,
  `prospect-diagnostic`, `rank-evolution`, `serp-top-results`, `site-audit-report`,
  `url-visibility`.
- **No existe gate**: nada detecta una ruta nueva sin declarar.
- **`docs/api/**` sin decisión**: cero menciones de growth y un raíz que se autodeclara no-canónico.
- Los otros carriles del lane (fuera de growth/seo) **no se midieron**. Esta task los mide antes
  de decidir si el gate nace acotado a growth/seo o global.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: doc en `docs/architecture/`, gate en `scripts/ci/` del monolito greenhouse-eo.
- Future candidate home: `remain-shared`
- Boundary: el gate lee el filesystem de `src/app/api/platform/ecosystem/**` y lo compara contra
  el doc. No importa código de dominio ni ejecuta rutas.
- Server/browser split: `n/a` — script de CI.
- Build impact: none.
- Extraction blocker: none.

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

### Slice 1 — Medir de verdad, en los cuatro carriles del lane

- Barrido por ruta COMPLETA y por notación expandida (llaves), no por substring, sobre
  `src/app/api/platform/ecosystem/**` entero — no sólo growth/seo.
- Entregable: la cifra real por carril, con la lista de las no declaradas. Si otro carril está
  peor que growth/seo, el alcance del gate cambia y hay que saberlo antes de escribirlo.

### Slice 2 — El gate

- `scripts/ci/api-platform-lane-coverage-gate.mjs`: falla si una ruta del lane no está ni
  declarada en el doc ni en una lista de exclusiones **con razón** (vocabulario del guard MCP:
  la ausencia silenciosa no es una decisión).
- 🔴 Verificar el gate EN ROJO antes de darlo por bueno: agregar una ruta ficticia y comprobar que
  falla nombrándola. Un gate que nunca se vio fallar es una afirmación.
- Nace en modo advisory; el flip a blocking es Slice 4.

### Slice 3 — Cerrar la deuda de growth/seo

- Declarar las 20 rutas con su postura de binding, su task dueña y su razón de exclusión cuando
  corresponda. Las cuatro sin task en el header se atribuyen por `git blame` antes de escribirlas.

### Slice 4 — Decisión sobre `docs/api/**` + flip del gate a blocking

- Retirar, acotar explícitamente o llenar. Se documenta la decisión, no se deja el limbo.
- Gate a blocking en CI una vez que la deuda esté en cero.

## Out of Scope

- **Documentar el lane `app` (`/api/admin/**`)**. Otro carril, otra decisión.
- **Cambiar el comportamiento de cualquier ruta.** Esta task documenta y mide; no toca runtime.
- **Federar tools MCP.** Es el guard hermano y ya tiene dueño.
- **Reescribir `GREENHOUSE_API_REFERENCE_V1.md`.** Si la decisión del Slice 4 es retirarlo, se
  retira; reescribirlo es otra task.

## Detailed Spec

El gate compara dos conjuntos derivados, ninguno escrito a mano:

1. **Rutas en disco:** `find src/app/api/platform/ecosystem -name route.ts`, normalizadas a su path
   público.
2. **Rutas declaradas:** las que el doc cita, expandiendo la notación de llaves
   (`/a/{b,c}` → `/a/b`, `/a/c`) antes de comparar.

La diferencia es el finding. Una ruta puede salir de la diferencia declarándose en el doc **o**
apareciendo en la lista de exclusiones con una razón no vacía — mismo contrato que el guard de
tools del gateway.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Medir (1) antes de escribir el gate (2), porque el alcance del gate depende de la medición. Cerrar
la deuda (3) antes del flip a blocking (4), o el gate rojo se normaliza y deja de leerse.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigation | Signal |
|---|---|---|---|---|
| El gate mide por substring y da falsos verdes | CI | **alta** (ya pasó dos veces al medir a mano) | Derivar del filesystem + expandir llaves + verificar EN ROJO con una ruta ficticia | El gate pasa con una ruta que no está en el doc |
| Se escriben razones de exclusión fabricadas para bajar el número | docs | media | Toda exclusión cita su boundary en la arquitectura del dominio; `[verificar]` es una respuesta válida | Revisión humana del Slice 3 |
| El gate nace blocking y bloquea PRs ajenos con deuda preexistente | CI | media | Nace advisory; blocking sólo en Slice 4, con la deuda ya en cero | — |

### Feature flags / cutover

N/A — cambio de tooling y documentación, sin runtime de producción. El "cutover" es el flip
advisory → blocking del Slice 4.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 — medición | nada que revertir (read-only) | — | sí |
| 2 — gate advisory | revert PR | <5 min | sí |
| 3 — deuda documental | revert PR | <5 min | sí |
| 4 — blocking + `docs/api` | volver el gate a advisory | <5 min | sí |

### Production verification sequence

N/A — no toca runtime de producción. La verificación es CI: el gate debe fallar con una ruta
ficticia y pasar sin ella.

### Out-of-band coordination required

Ninguna. Si el Slice 1 revela que otro carril está peor, avisar antes de ampliar el alcance.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La medición del Slice 1 cubre los cuatro carriles del lane, deriva del filesystem y expande
      la notación de llaves.
- [ ] El gate falla, nombrando la ruta, cuando existe una ruta no declarada y no excluida —
      **verificado en rojo**, no sólo en verde.
- [ ] Toda exclusión tiene razón no vacía que cita su boundary; ninguna dice sólo "interna".
- [ ] Las 20 rutas de growth/seo quedan declaradas o excluidas, con su postura de binding.
- [ ] Las cuatro rutas sin task en su header quedan atribuidas por `git blame`.
- [ ] `docs/api/**` tiene una decisión escrita: retirado, acotado o llenado.
- [ ] El gate corre en CI y está en blocking al cerrar.

## Verification

- `node scripts/ci/api-platform-lane-coverage-gate.mjs` en verde y en rojo (prueba negativa)
- `pnpm local:check`
- `pnpm docs:closure-check`
- `pnpm task:lint --task TASK-1793` y `pnpm ops:lint --changed`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado si hubo aprendizajes o deuda
- [ ] `changelog.md` actualizado si cambió comportamiento o protocolo visible
- [ ] chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- El mismo gate para el lane `app` (`/api/admin/**`).
- Unificar la forma del gate de rutas con la del guard de tools de `efeonce-mcp`, para que agregar
  una capability declare sus dos superficies con el mismo vocabulario.

## Open Questions

- ¿`docs/api/**` se retira o se llena? Es una decisión de producto documental, no técnica, y
  conviene tomarla con el operador antes del Slice 4.
- ¿El gate nace acotado a growth/seo o global? Depende del Slice 1.
