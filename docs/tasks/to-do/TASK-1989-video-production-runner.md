# TASK-1989 — Runner de producción de video: plan declarativo por toma, compuertas y ledger (`pnpm video:*`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-051`
- Status real: `Sin empezar. ADR-025 aceptada por el operador el 2026-10-03; lista para tomar`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir la **espina** del programa de video (ADR-025): un runner local determinístico que ejecuta el **plan de una
pieza** —un grafo de pasos por toma, cada uno una operación de la taxonomía— con ejecutores (`cli`, `puente`, `humano`,
`local`), **compuertas** automática, humana y de gasto, **ledger append-only** con retome e invalidación `stale`, y
**recetas** como datos. Los modelos generativos quedan como ejecutores de un paso; nunca orquestan.

## Why This Task Exists

- La consistencia de una pieza sale de las referencias construidas y aprobadas en preproducción (casos Glitch,
  CMP-001, Fiestas Patrias), y hoy nada impide gastar en video con una referencia sin aprobar.
- Cada paso ya tiene forma de producto (manifiesto, caché, códigos 0/2/3/1, tope de costo), pero ninguna herramienta
  encadena los pasos de una pieza, guarda sus aprobaciones ni sabe qué rehacer cuando algo cambia: SKY V17 se orquestó a
  mano y superó USD 150 sin ledger conciliado.
- Sin la espina, las tasks de EPIC-051 producen capacidades sueltas que cada pieza vuelve a coser a mano.

## Goal

- `pnpm video:plan` instancia y valida un plan (desde receta o archivo) y estima su árbol de costo sin gastar.
- `pnpm video:run` ejecuta lo listo, se detiene en compuertas, retoma tras un corte sin reenviar, y rehace sólo lo
  `stale`.
- `pnpm video:approve|reject|budget|status` operan las compuertas humanas y de gasto y muestran el grafo.
- Tres recetas: feature spotlight, producto con mano y loop de atmósfera.
- Una pieza real de punta a punta corrida como plan.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- ADR-025 (`docs/architecture/creative-studio/EFEONCE_VIDEO_PRODUCTION_PIPELINE_ARCHITECTURE_V1.md`): D1–D9.
- Taxonomía de video y anexo de producto e interfaces: el vocabulario de operaciones y roles es el contrato del plan.
- ADR-024: CLI primero; núcleo puro graduable a `@efeoncepro/axis-creative-core`; ejecutores y runner se quedan.
- Método de producción de video: unidades, estados y seis dimensiones de aprobación.
- Módulo 13 de `motion-design-studio`: ciclo estimación → reserva → aprobación → ejecución → liquidación.

## Normative Docs

- `docs/architecture/creative-studio/EFEONCE_VIDEO_PRODUCTION_PIPELINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md`
- `docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCT_AND_INTERFACE_V1.md`
- `docs/operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md`
- `docs/operations/AI_GENERATIONS_STORAGE_V1.md`
- `.claude/skills/motion-design-studio/modules/13_STUDIO_CREDITS_AND_ACCOUNTABILITY.md`

## Dependencies & Impact

### Depends on

- ADR-025 aceptada (2026-10-03).
- Los CLIs existentes como ejecutores (`foto:*`, `ai:image`, `ai:fal`, `ai:omni`, `ai:inpaint`); los nuevos de EPIC-051
  se suman como ejecutores cuando existan.
- **Clasificación desde el primer archivo (acordado con la sesión del pipeline, 2026-10-03):** todo módulo nuevo bajo `scripts/ai/video/` se declara núcleo, orquestación o adaptador desde el primer archivo, para el gate por manifiesto de TASK-1976.

### Blocks / Impacts

- TASK-1979 a TASK-1988 pasan a ser ejecutores del runner: deben devolver manifiesto y código 0/2/3/1.
- EPIC-050 (Creative Workbench): pregunta abierta de si su expansión de campañas instanciará este formato de plan.

### Files owned

- `scripts/ai/video/pipeline/core/plan.ts` [nuevo] (esquema y validación del plan con las reglas de la taxonomía)
- `scripts/ai/video/pipeline/core/graph.ts` [nuevo] (orden topológico, huellas, invalidación `stale`)
- `scripts/ai/video/pipeline/core/state.ts` [nuevo] (máquina de estados del paso)
- `scripts/ai/video/pipeline/core/budget.ts` [nuevo] (agregación de estimaciones, reserva y liquidación)
- `scripts/ai/video/pipeline/core/ledger.ts` [nuevo] (esquema de eventos append-only)
- `scripts/ai/video/pipeline/executors/*.ts` [nuevo] (`cli`, `humano`, `local`; `puente` cuando exista TASK-1986)
- `scripts/ai/video/pipeline/run.ts` y `cli.ts` [nuevo] (`pnpm video:plan|run|approve|reject|budget|status|recipe`)
- `scripts/ai/video/pipeline/recipes/*.json` [nuevo] (tres recetas)
- `package.json` (scripts `video:*`)
- Docs: ADR-025 (lo medido), manual nuevo `docs/manual-de-uso/ai-tooling/producir-una-pieza-de-video-con-plan.md`,
  `motion-design-studio` (+ espejo)

## Current Repo State

### Already exists

- Forma por paso: manifiesto, caché por contenido, códigos 0/2/3/1 y tope de costo en `scripts/ai/inpaint/**`; retome por
  `request_id` en `pnpm ai:fal` (`--detach`, `--request-id`) y por interaction ID en `pnpm ai:omni`.
- Cadena ficha → prompt → generación → gate medido con canon sellado en `scripts/foto/**`.
- Almacenamiento lógico de `ai-generations/` con `ai-gen:where|pull|archive`.

### Gap

- No hay plan de pieza, grafo, ledger, compuertas humanas ni de gasto, invalidación ni recetas.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ai/video/pipeline/**`, ejecutado con `tsx` en el equipo del operador
- Future candidate home: `undecided`
- Future candidate home note: `pipeline/core/**` candidato a `@efeoncepro/axis-creative-core` (ADR-024 §D5); runner y ejecutores se quedan; en Globe el plan se traduce a `ShotRealizationPlan` (ADR-012) y el paso pagado a una corrida gobernada (SPEC-002)
- Boundary: núcleo puro (sin `@/`, disco ni red); el runner lanza ejecutores como procesos y lee sus manifiestos; consumidores autorizados: los comandos `video:*` y las tasks de EPIC-051
- Server/browser split: `n/a` (Node CLI; nunca en bundle ni runtime de producto)
- Build impact: `none` (fuera del grafo de Next)
- Extraction blocker: ejecutores que dependen de los CLIs y sesiones locales del operador

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Núcleo del plan

- Esquema del plan (producción, pieza, tomas con clasificación y plan de realización, pasos, entradas por rol,
  compuertas, aprobadores por dimensión, modo de operación); validación con reglas duras de la taxonomía (texto y logo
  nunca en paso generativo; personas reales nunca a motores con filtro; 4:5 desde 3:4; audio apagado si no se admite
  voz; propio antes que puente); orden topológico; huellas; máquina de estados.
- Pruebas sin disco ni red: planes válidos e inválidos, ciclo rechazado, invalidación aguas abajo al cambiar un hash.

### Slice 2 — Runner, ledger y ejecutores `cli`

- `ledger.jsonl` append-only; `request_id` escrito antes de esperar; retome tras corte; caché por huella.
- Ejecutores `cli` para `foto:*`, `ai:image`, `ai:fal`, `ai:omni` y `ai:inpaint`, con `--dry-run` en todos.

### Slice 3 — Compuertas humana y de gasto

- `video:approve|reject` por dimensión con aprobador de una lista; `video:budget --authorize`; reserva por paso y
  liquidación con costo real; detención ante diferencia no explicada; ninguna producción generativa con referencias sin
  aprobación creativa; `video:status` con el grafo.

### Slice 4 — Recetas

- Feature spotlight (anexo §3.6), producto con mano (anexo §2.3) y loop de atmósfera, como datos con un solo motor.

### Slice 5 — Primera pieza de punta a punta

- Correr como plan una pieza real (preferentemente el canario C13 con el portal), con autorización del monto aparte;
  README con plan, ledger, costos estimados y reales, y veredicto humano.
- ADR-025 actualizada con lo medido; manual nuevo; skill (+ espejo).

## Out of Scope

- Surface visual del grafo (por ahora `video:status` y la página de la taxonomía).
- Base de datos o servicio; Globe.
- Los ejecutores nuevos (son las otras tasks de EPIC-051).
- Publicación (fuera del runner por diseño).

## Detailed Spec

- **Contrato del paso:** `{ id, op, toma, ejecutor, entradas: {rol: assetRef}, params, compuertas[], salida: {roles} }`;
  la huella es el hash de entradas + ejecutor y revisión + params.
- **Eventos del ledger:** `planned`, `ready`, `estimated`, `budget_authorized`, `reserved`, `submitted(request_id)`,
  `produced(assets)`, `checked(code, detectors)`, `approved|rejected(dimension, by, note)`, `settled|released(usd)`,
  `stale(cause)`, `cancelled`.
- **Códigos del runner:** `0` el plan avanzó o quedó completo · `3` detenido en una compuerta humana · `2` un paso falló
  su detector · `1` error (plan inválido, tope, ejecutor ausente).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1. ADR-025 aceptada (2026-10-03); Slices 1–4 sin gasto (con `--dry-run`); Slice 5 con autorización del monto.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| El formato del plan no calza con piezas reales | Contrato | media | tres recetas distintas + una pieza real antes de fijarlo | Slice 5 |
| Un ejecutor no devuelve manifiesto estándar | Integración | media | envoltorio que normaliza; código 1 si falta | manifiesto |
| Disciplina percibida como lenta | Adopción | media | `--until` y recetas listas; las compuertas son las del método, no nuevas | uso real |
| Diferencia estimado/real | Costo | media | reserva + liquidación + detención | ledger |

### Feature flags / cutover

N/A — herramienta out-of-band sin runtime de producción ni flags.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| todos | `git revert` del commit del slice | minutos | sí |

### Production verification sequence

N/A — no hay runtime de producción. Verificación: pruebas del núcleo, dry-runs del plan y la pieza del Slice 5.

### Out-of-band coordination required

- Autorización de gasto para el Slice 5; lista de aprobadores de video.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm video:plan` rechaza un plan que genera texto o logo, que manda referencias de personas reales a un motor con filtro o que tiene un ciclo.
- [ ] `pnpm video:run` se detiene antes de un paso generativo cuya referencia no está aprobada.
- [ ] Un corte durante un paso en curso se retoma por `request_id` sin reenviar (probado con un ejecutor falso).
- [ ] Cambiar un asset aprobado marca `stale` sólo los pasos que lo consumieron.
- [ ] Cada paso pagado reserva contra la autorización y liquida con el costo real en el ledger.
- [ ] Tres recetas instancian planes válidos.
- [ ] Una pieza real quedó producida como plan, con README, ledger y costos reconciliados.
- [ ] El núcleo no importa `@/`, disco ni red.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts/ai/video/pipeline`
- `pnpm video:plan … --estimate` y la pieza del Slice 5
- `pnpm test` y `pnpm build` (gate de cierre; el build con autorización del operador si el equipo está cargado)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Evidencia de la pieza en `ai-generations/<fecha>_task-1989-pieza/README.md`

## Follow-ups

- Surface visual del grafo (cuando haya una pieza real que la justifique).
- Expansión de campañas que instancia muchos planes desde un brief (con EPIC-050).
- Graduación del núcleo a `@efeoncepro/axis-creative-core` (con TASK-1976).

## Open Questions

- ¿Lista de aprobadores propia de video o la de fotos (`aprobadores.json`)? Se decide en el Slice 3.
