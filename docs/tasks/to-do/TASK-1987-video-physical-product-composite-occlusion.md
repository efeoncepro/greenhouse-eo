# TASK-1987 — Producto físico exacto compuesto cuadro a cuadro, con oclusión de manos y pase de integración

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
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
- Epic: `EPIC-051`
- Status real: `Sin empezar. Técnica definida en el anexo de producto e interfaces (2026-10-03); producto piloto pendiente de decisión del operador`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `TASK-1979`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir la técnica que permite **una mano (generada o real) tocando un producto físico exacto**: generar la toma con un
sustituto de la misma forma y tamaño, seguir el producto cuadro a cuadro, pegar encima el render o still exacto del
producto, poner la mano por delante con su propia máscara y **pasar un pase de integración** (luz, reflejos, desenfoque
de movimiento) para que no se vea pegado. Cierra el hueco H21 del anexo y aporta el camino propio de `producto/en-uso`.

## Why This Task Exists

- El modelo generativo redibuja el producto en cada cuadro: deforma forma, texto y logo (medido en foto: cuatro
  pasadas, cuatro logotipos). Para un ad de producto con manos no hay hoy un camino que conserve el producto exacto.
- El operador rechazó en video el reemplazo de pantalla porque **lo compuesto no recibe la luz del render y se ve
  pegado** (2026-09-11). Lo mismo aplica a un producto compuesto: sin integración, la técnica no sirve.
- El puente (Genjutsu `hf_mult_replace_object`) reemplaza objetos sin garantía de exactitud.

## Goal

- `pnpm ai:inpaint video --op product-insert` (nombre a confirmar en Discovery): producto exacto en cada cuadro, dedos por
  delante, integración aplicada, delta 0 del producto contra su fuente dentro de su máscara de pegado.
- Canario C12 que compare tres técnicas sobre el mismo brief con el criterio «¿se ve pegado?» como veredicto humano.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- Anexo de producto e interfaces (`docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCT_AND_INTERFACE_V1.md`) §1 y §2.
- Taxonomía: `edit.replace`, `edit.track`, `edit.relight`; tipo `producto/en-uso`; regla «propio primero».
- Canon de marca: el producto y su marca se componen; marca tapada por una mano = vista de oclusión del kit.
- ADR-024: núcleo de composición y oclusión puro y graduable; adaptadores en Greenhouse.

## Normative Docs

- `docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCT_AND_INTERFACE_V1.md`
- `docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md`
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` (§Pipeline de inpainting)
- `docs/operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md`

## Dependencies & Impact

### Depends on

- TASK-1979 (máscara por cuadro con SAM 2 y seguimiento) — bloqueante.
- TASK-1984 o TASK-1977 para el relight de integración, si existen; si no, la integración del Slice 3 usa un pase
  básico (color, sombra de contacto, desenfoque de movimiento) y se marca así.
- **Clasificación desde el primer archivo (acordado con la sesión del pipeline, 2026-10-03):** todo módulo nuevo bajo `scripts/ai/inpaint/` o `scripts/ai/video/` se declara núcleo, orquestación o adaptador desde el primer archivo, para el gate por manifiesto de TASK-1976.

### Blocks / Impacts

- Puede alimentar `producto/variantes` (otro producto en la misma toma) sin pasar por el puente.

### Files owned

- `scripts/ai/inpaint/product-insert.ts` [nuevo] (núcleo: transformación por cuadro, orden de capas producto/mano, verificación)
- `scripts/ai/inpaint/integration.ts` [nuevo] (núcleo: color, sombra de contacto, desenfoque de movimiento)
- `scripts/ai/inpaint/pipeline-video.ts` (op nueva)
- Docs: anexo §2, guía §4.3, manual de edición de zona de video

## Current Repo State

### Already exists

- `pnpm ai:inpaint video` con recomposición por cuadro y verificación delta 0; máscara por cuadro en TASK-1979.
- `pnpm ai:inpaint place --finish element` en imagen (pegado de un elemento con halo de integración por instrucción).

### Gap

- No hay pegado de un producto por cuadro con transformación seguida ni orden de capas con la mano por delante.
- No hay pase de integración temporal (luz, reflejos, desenfoque de movimiento) en video.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ai/inpaint/**`, ejecutado con `tsx` en el equipo del operador
- Future candidate home: `undecided`
- Future candidate home note: `product-insert.ts` e `integration.ts` candidatos a `@efeoncepro/axis-creative-core`
- Boundary: núcleo puro (buffers, máscaras, transformaciones, `sharp`); ffmpeg y adaptadores fuera; consumidor autorizado: `pnpm ai:inpaint video`
- Server/browser split: `n/a` (Node CLI; nunca en bundle ni runtime de producto)
- Build impact: `none` (fuera del grafo de Next)
- Extraction blocker: adaptadores sobre `@/lib/ai/*`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Pegado por cuadro y orden de capas

- Transformación del producto por cuadro desde el seguimiento (planar u homografía sobre la máscara de TASK-1979);
  pegado del still o render exacto; máscara de la mano (SAM) por delante del producto.
- Pruebas sintéticas: producto que se traslada y rota con un «dedo» que lo cruza → el dedo queda delante, el producto
  conserva sus píxeles dentro de su máscara de pegado.

### Slice 2 — Integración temporal

- Ajuste de color del producto al entorno (anillo alrededor), sombra de contacto, desenfoque de movimiento según la
  velocidad del seguimiento; luz por relight si TASK-1984/1977 existen.

### Slice 3 — Subcomando, canario C12 y documentación

- Subcomando con `--dry-run`, manifiesto y códigos 0/2/3/1.
- C12 (autorización del monto): hero hold + giro con tres técnicas — i2v desde still, sustituto + Genjutsu (puente,
  TASK-1986), sustituto + esta técnica — veredicto humano al 100 % con el criterio «¿se ve pegado?».
- Anexo §2, guía §4.3 y manual.

## Out of Scope

- Productos deformables (prenda, comida): no tienen seguimiento rígido; siguen por kits + generativo.
- Pantallas encendidas: regla del operador, la pantalla la renderiza el modelo (anexo §1).
- Generar el producto con IA.

## Detailed Spec

- **Garantía:** dentro de la máscara de pegado y fuera de la mano, el producto es la fuente exacta transformada; fuera
  de la zona de trabajo, delta 0 contra la toma de base.
- **Códigos:** `0` PASS · `2` FAIL (cambio fuera de la zona) · `3` REVISAR (seguimiento que salta, mano mal recortada,
  integración fuera de rango) · `1` error.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1. Los slices sin gasto primero; el canario sólo con autorización del monto en chat.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Se ve pegado aunque el producto sea exacto | Calidad | alta | pase de integración + veredicto humano «¿se ve pegado?» en C12 | veredicto |
| El seguimiento salta en oclusiones | Seguimiento | media | código 3 con cuadros; seguimiento de TASK-1979 | manifiesto |
| Bordes de dedos sucios | Composición | media | máscara de mano refinada + fundido temporal | revisión al 100 % |

### Feature flags / cutover

N/A — herramienta out-of-band sin runtime de producción ni flags.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| todos | `git revert` del commit del slice | minutos | sí |

### Production verification sequence

N/A — no hay runtime de producción. Verificación: pruebas del núcleo, dry-runs y el canario.

### Out-of-band coordination required

- Autorización de gasto para C12; elección del producto piloto (cliente, merch de Efeonce u objeto neutro).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El producto aparece exacto en cada cuadro dentro de su máscara de pegado, con los dedos por delante (probado en caso sintético y en C12).
- [ ] El pase de integración aplica color, sombra de contacto y desenfoque de movimiento.
- [ ] C12 compara las tres técnicas con veredicto humano al 100 % y costo real.
- [ ] El núcleo no importa `@/`, disco ni red.
- [ ] Anexo §2, guía §4.3 y manual actualizados con lo medido.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts/ai/inpaint`
- Dry-runs y canario C12
- `pnpm test` y `pnpm build` (gate de cierre; el build con autorización del operador si el equipo está cargado)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Evidencia del canario en `ai-generations/<fecha>_task-1987-canary/README.md`

## Follow-ups

- Seguimiento 3D (no planar) para productos que giran fuera del plano.
- Variantes de producto sobre la misma toma (`producto/variantes`) sin el puente.

## Open Questions

- ¿El pase de integración básico basta o hace falta el relight de TASK-1984? Se decide con C12.
