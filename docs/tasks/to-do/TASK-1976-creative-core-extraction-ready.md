# TASK-1976 — Núcleo de inpainting listo para extraer (ADR-024), sin publicar paquete

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
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
- Status real: `Sin empezar. Globe está hibernado por decisión del operador (2026-10-03): esta task deja el núcleo listo para extraer sin crear paquete ni tocar Globe`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Separar en `scripts/ai/inpaint/**` el **núcleo determinístico** (máscaras, recomposición, verificación delta 0, recorte,
alineación, geometría de capas, planificación de expansión y mediciones) de la **orquestación con I/O** (disco, caché,
adaptadores de proveedor), declarar la frontera en un manifiesto y hacerla cumplir con un gate. Es el paso 2 del
roadmap de ADR-024 hecho **dentro de Greenhouse**: al despertar Globe, extraer el núcleo a un paquete `@efeoncepro/*`
debe ser mover archivos, no reescribirlos.

## Why This Task Exists

- ADR-024 decide que una capacidad creativa probada en CLI se gradúa a Globe con su **núcleo compartido** y que los
  adaptadores nunca se copian. El primer candidato es el inpainting (TASK-1965/1973).
- El operador decidió el 2026-10-03 **no prender Globe todavía** (está hibernado por costo) y seguir probando en CLI,
  sobre todo los flujos de **video**, que tienen menos canarios que los de imagen. Pidió construir de forma que extraer
  después sea sencillo.
- Hoy la frontera existe por convención y no por mecanismo. Medido el 2026-10-03: **ningún** módulo fuera de
  `adapters/` importa `@/`, pero `pipeline-image.ts`, `pipeline-video.ts`, `mask.ts`, `layers.ts`, `erase.ts`,
  `move.ts`, `place.ts`, `background.ts`, `expand-run.ts` y `run-io.ts` mezclan lógica con lectura y escritura de
  archivos. Nada impide que una sesión futura importe `@/lib/**` desde el núcleo y lo vuelva inextraíble en silencio.

## Goal

- Un manifiesto versionado que dice qué módulos son núcleo (graduables) y cuáles son orquestación o adaptadores.
- Un gate que falla si un módulo del núcleo importa `@/`, `node:fs`, red, `child_process`, adaptadores o secretos.
- La lógica pura de los módulos mixtos (`mask.ts`, `layers.ts`, `pipeline-image.ts` y las técnicas) separada de su
  I/O, con el comportamiento del CLI idéntico (mismas pruebas en verde, mismos manifiestos).
- Pruebas del núcleo que corren sin disco ni red (buffers en memoria).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- ADR-024 (`docs/architecture/creative-studio/EFEONCE_GLOBE_CLI_FIRST_GRADUATION_DECISION_V1.md`): §D2 qué se gradúa,
  §D5 núcleo compartido sin `@/lib/**`, sin secretos, sin red; §D7 primer candidato y su bloqueador.
- Frontera Globe ↔ Greenhouse (overlay `arch-architect/globe-overlay.md`, G1/G8): el núcleo no lleva proveedor ni
  secreto; los adaptadores se quedan en Greenhouse.
- Herramienta out-of-band: `scripts/ai/inpaint/**` nunca se importa desde `src/app/**` ni el runtime de `src/lib/**`.
- EPIC-026/027: esta task **no** crea `packages/*`, servicios ni repos; el hogar candidato es metadata.
- Contrato del pipeline: `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` §Pipeline de inpainting.

## Normative Docs

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLI_FIRST_GRADUATION_DECISION_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` (§Pipeline de inpainting)
- `docs/tasks/complete/TASK-1965-ai-inpaint-image-video-cli-pipeline.md`
- `docs/tasks/complete/TASK-1973-ai-inpaint-editing-techniques.md`

## Dependencies & Impact

### Depends on

- TASK-1965 y TASK-1973 cerradas (pipeline y técnicas en develop).
- ADR-024 aceptado (2026-10-03).

### Blocks / Impacts

- La futura task de extracción a `@efeoncepro/creative-core` (por crear cuando Globe despierte).
- TASK-1925 (migración al taller y convergencia de `foto:expandir`): consume la misma frontera.
- Cualquier técnica o adaptador nuevo de `ai:inpaint` (video incluido) debe respetar el manifiesto desde que exista.

### Files owned

- `scripts/ai/inpaint/core-manifest.ts` [nuevo]
- `scripts/ai/inpaint/core-boundary.test.ts` [nuevo] (gate como prueba Vitest; ver Open Questions)
- `scripts/ai/inpaint/mask.ts`, `layers.ts`, `pipeline-image.ts`, `techniques.ts`, `erase.ts`, `move.ts`, `place.ts`,
  `background.ts`, `expand-run.ts` (separación lógica/I-O)
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` (§Pipeline de inpainting: mapa núcleo/orquestación)

## Current Repo State

### Already exists

- Núcleo sin `@/` ni disco ni red (medido 2026-10-03): `alignment.ts`, `brand.ts`, `crop.ts`, `expand.ts`, `raw.ts`,
  `recompose.ts`, `sketch.ts`, `techniques.ts`.
- Módulos sin `@/` pero con I/O de disco: `mask.ts` (`loadMask` lee ruta o buffer), `layers.ts` (`readLayersDocument`,
  lectura de PNG de capa), `run-io.ts`, `pipeline-image.ts`, `pipeline-video.ts`, `video-mask.ts`, `erase.ts`,
  `move.ts`, `place.ts`, `background.ts`, `expand-run.ts`; `ffmpeg.ts` usa `child_process`.
- Adaptadores con `@/lib/ai/*`: `adapters/openai.ts`, `adapters/fal.ts`, `adapters/video-fal.ts`,
  `adapters/layerize-fal.ts`.
- 110 pruebas del pipeline en verde (2026-10-03), varias con archivos temporales en disco.

### Gap

- No hay manifiesto ni gate de la frontera.
- `pipeline-image.ts` mezcla orquestación pura (plan de recorte, recomposición, veredicto) con caché, disco y llamadas al
  adaptador; ADR-024 §D7 lo marca como el bloqueador de extracción.
- Las funciones puras de `mask.ts` y `layers.ts` conviven con su lectura de archivos.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ai/inpaint/**`, ejecutado con `tsx` en el equipo del operador
- Future candidate home: `undecided`
- Future candidate home note: paquete `@efeoncepro/creative-core` en GitHub Packages (ADR-024 §D5); qué repo lo publica es pregunta abierta del ADR
- Boundary: núcleo = módulos del manifiesto, sin `@/`, `node:fs`, red, `child_process`, adaptadores ni secretos; orquestación y adaptadores fuera del núcleo; consumidores autorizados: CLIs `ai:inpaint`, `ai:layers`, `ai:mask`
- Server/browser split: `n/a` (Node CLI; nunca en bundle ni runtime de producto)
- Build impact: `none` (fuera del grafo de Next)
- Extraction blocker: el que esta task cierra (orquestación con I/O en `pipeline-image.ts` y módulos mixtos); después, sólo la decisión del hogar del paquete

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Manifiesto del núcleo y gate de frontera

- `core-manifest.ts`: lista `as const` de módulos núcleo, orquestación y adaptadores, con el porqué de cada uno.
- Gate (prueba o script) que analiza los imports de cada módulo núcleo y falla ante `@/`, `node:fs`/`fs`,
  `node:child_process`, `fetch`/clientes de red, `./adapters/` o lectura de variables de entorno. Cubre en ambas
  direcciones: todo `.ts` de `scripts/ai/inpaint/` está clasificado y ningún clasificado falta.
- Con los ocho módulos ya puros declarados núcleo, el gate pasa sin tocar código.

### Slice 2 — Separar lógica e I/O en `mask.ts` y `layers.ts`

- Funciones puras que reciben buffers o `RgbaImage`/`CanonicalMask` en el núcleo; las que leen rutas pasan a un módulo
  de orquestación (p. ej. `mask-io.ts`, `layers-io.ts`) que las envuelve. Las firmas que usa el CLI no cambian.

### Slice 3 — Separar la orquestación pura de `pipeline-image.ts`

- Extraer al núcleo el cálculo sin I/O: plan de recorte, recomposición, verificación, veredicto y detectores; dejar en
  orquestación la caché, el layout de `ai-generations/`, la estimación/tope de costo y la llamada al adaptador.
- Mismo `manifest.json` byte a byte en un dry-run de referencia antes y después.

### Slice 4 — Técnicas sobre el núcleo

- `erase.ts`, `move.ts`, `place.ts`, `background.ts`, `expand-run.ts`: su lógica pura al núcleo (o a funciones del
  núcleo ya existentes) y su I/O en orquestación.

### Slice 5 — Pruebas del núcleo sin disco y documentación

- Las pruebas de los módulos núcleo corren con buffers en memoria, sin `mkdtemp` ni red.
- Spec §Pipeline de inpainting: tabla núcleo / orquestación / adaptadores y la regla del gate; puntero desde ADR-024 §D7.

## Out of Scope

- Crear `packages/*`, publicar `@efeoncepro/creative-core` o decidir qué repo lo publica.
- Cualquier cambio en Globe (hibernado) o en su runtime.
- Tocar adaptadores de proveedor más allá de los imports que el gate exija.
- Nuevas técnicas o modelos; canarios con gasto (es un refactor sin cambio de comportamiento).
- `foto:expandir` y su convergencia (TASK-1978).

## Detailed Spec

- **Definición de núcleo:** un módulo es núcleo si su salida depende sólo de sus argumentos (imágenes, máscaras,
  números) y de `sharp` como dependencia de cálculo. `sharp` se permite: es computación local, no I/O de proveedor.
- **El gate deriva, no enumera a mano:** recorre los archivos reales del directorio y exige que cada uno esté en el
  manifiesto; un archivo nuevo sin clasificar rompe el gate (ejercicio del segundo consumidor de `arch-architect`).
- **Equivalencia observable:** los dry-runs de referencia (`image`, `erase --fill plate`, `expand`, `move --harmonize
  off`, `place --finish off`) producen los mismos artefactos JSON antes y después (ignorando marcas de tiempo).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1. Slice 1 primero: el gate fija la frontera antes de mover código.
2. Slices 2–4 en cualquier orden, cada uno con su suite en verde y su dry-run de referencia idéntico.
3. Slice 5 al final.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Cambio de comportamiento al mover lógica | CLI `ai:inpaint` | media | dry-runs de referencia con artefactos idénticos + suite completa | diff de `manifest.json` |
| Gate frágil (textual) que no prueba la frontera | Gate | media | analizar imports reales y cubrir ambas direcciones; citar en la prueba el mecanismo | módulo nuevo sin clasificar falla |
| Romper el sync al Creative Workbench | `creative:sync` | baja | `scripts/creative-workbench/export-manifest.json` no nombra rutas de `inpaint` (medido 2026-10-03): calcula el cierre de imports desde `scripts/ai`; correr el sync en dry-run tras mover archivos | sync en dry-run |

### Feature flags / cutover

N/A — refactor de herramienta out-of-band sin runtime de producción ni flags.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| 1–5 | `git revert` del commit del slice | minutos | sí |

### Production verification sequence

N/A — no hay runtime de producción. Verificación local: `pnpm vitest run scripts/ai/inpaint`, el gate de frontera y
los dry-runs de referencia sin gasto.

### Out-of-band coordination required

- Ninguna obligatoria. Si el dry-run de `creative:sync` cambia la lista exportada, avisar a la sesión del Creative Workbench.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `scripts/ai/inpaint/core-manifest.ts` y clasifica cada `.ts` del directorio (excluidos los tests) como núcleo, orquestación o adaptador.
- [ ] El gate falla si un módulo núcleo importa `@/`, `fs`, `child_process`, red, `./adapters/` o lee el entorno, y falla si un archivo del directorio no está clasificado.
- [ ] `mask.ts`, `layers.ts` y `pipeline-image.ts` tienen su lógica pura en módulos núcleo y su I/O en orquestación.
- [ ] Los dry-runs de referencia producen artefactos JSON idénticos antes y después (marcas de tiempo aparte).
- [ ] La suite de `scripts/ai/inpaint` queda en verde y las pruebas de módulos núcleo no usan disco ni red.
- [ ] La spec §Pipeline de inpainting documenta núcleo / orquestación / adaptadores y el gate.
- [ ] No se creó ningún `packages/*` ni se tocó Globe.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts/ai/inpaint`
- Gate de frontera del núcleo
- Dry-runs de referencia sin gasto (ver Detailed Spec)
- `pnpm test` y `pnpm build` (gate de cierre; el build con autorización del operador si el equipo está cargado)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Puntero desde ADR-024 §D7 al manifiesto y al gate

## Follow-ups

- Task de extracción a `@efeoncepro/creative-core` cuando Globe despierte y se decida el hogar del paquete (ADR-024 §9).
- Canarios de video en CLI antes de graduar el video (operador, 2026-10-03): borrar y seguir objetos con VACE + SAM2,
  relight de video (ID-V2V, fal lightx) y edición de zona con Seedance 2.5.

## Open Questions

- ¿El gate vive como prueba Vitest junto al pipeline o como script en `scripts/ci/`? Propuesta: prueba Vitest, que ya
  corre en `pnpm test` y en el pre-push del pipeline; mover a CI sólo si otro directorio adopta la misma frontera.
