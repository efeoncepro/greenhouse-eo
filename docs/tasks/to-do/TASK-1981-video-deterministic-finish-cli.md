# TASK-1981 — Acabado determinístico de video: `pnpm video:finish` (grade, reencuadre, retime, montaje, overlays, loudness, export)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
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
- Epic: `EPIC-051`
- Status real: `Sin empezar. Hoy cada pieza resuelve su post con ffmpeg y HyperFrames a mano; el recorte 4:5 se midió a mano en CMP-001 (2026-09-22)`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Un CLI de **posproducción determinística** a 0 créditos, con manifiesto y verificaciones, que cubre las operaciones
de post que no necesitan IA: `finish.grade` (LUT o ajustes), `finish.reframe` (con franjas medidas y safe zones; 4:5
desde 3:4), `time.retime` (constante), `assemble.cut` y `assemble.edit` (montaje por EDL reproducible),
`finish.overlay` (componer texto, logo y firma desde archivos ya aprobados), `finish.captions`, `audio.mix` (loudness
por plataforma) y `deliver.export` (masters y derivados con hash). Cierra el hueco H10 y H9 de la taxonomía.

## Why This Task Exists

- Las operaciones de post que más se repiten (cutdowns 15/10/6, versiones por aspecto, cartelas, loudness) se hacen
  ad hoc por pieza: sin manifiesto no se pueden reproducir ni auditar, y los errores de crop o de mezcla se descubren
  tarde (método de video, etapas 9–12).
- **4:5 no existe en ningún motor**: se genera en 3:4 y se recorta midiendo a mano que las franjas sacrificadas estén
  vacías (guía §3). Es el formato principal de los estáticos de Efeonce.
- El método exige que el archivo revisado y el entregado sean el mismo (hash): hoy no hay herramienta que lo asegure.
- Es la parte del programa que **no gasta créditos**: avanza en paralelo sin competir por presupuesto.

## Goal

- `pnpm video:finish <receta.json>` aplica una receta declarativa (pasos en orden) sobre fuentes con hash y escribe
  salidas, `manifest.json` y verificaciones por paso, con códigos `0`/`2`/`3`/`1`.
- Subcomandos atajo para lo frecuente: `reframe`, `cutdown`, `grade`, `loudness`, `export`.
- Toda salida queda trazable a sus fuentes y a la receta; reejecutar la receta produce el mismo archivo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- Taxonomía de video: fase de posproducción (`finish.*`, `time.retime`, `assemble.*`, `audio.mix`, `deliver.export`),
  carril D; texto siempre compuesto (§3.8); formato (§3.10).
- Método de producción y posproducción de video (etapas 9–12; hash revisado = entregado).
- ADR-024: núcleo puro graduable (planificación de recorte, medición de franjas, EDL, verificación); ffmpeg es I/O y
  queda en la orquestación.
- `finish.overlay` **compone** arte ya aprobado (PNG/MOV con alfa de HyperFrames, del Composer o del motor de Glitch);
  no diseña tipografía ni anima marca: eso sigue en `efeonce-advertising-creative`, `efeonce-graphic-line` y el repo
  taller.
- Herramienta out-of-band: nunca importada por `src/app/**` ni por el runtime de `src/lib/**`.

## Normative Docs

- `docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md`
- `docs/operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md`
- `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md` (§3 fila 4:5)
- `.claude/skills/motion-design-studio/companions/video-postproduction-and-delivery.md`
- `.claude/skills/motion-design-studio/workflows/single-shot-to-deterministic-campaign-hero.md`
- `.claude/skills/efeonce-advertising-creative/references/paid-format-safe-zones-and-craft.md`

## Dependencies & Impact

### Depends on

- `ffmpeg`/`ffprobe` instalados (ya requeridos por `pnpm ai:inpaint video`).

### Blocks / Impacts

- TASK-1982 (loop determinístico) y TASK-1985 (mezcla con voz) reutilizan `audio.mix` y el montaje.
- Workflows de `motion-design-studio` que hoy describen ffmpeg a mano pasan a citar el comando.

### Files owned

- `scripts/ai/video/finish/recipe.ts` [nuevo] (núcleo: validación y plan de la receta)
- `scripts/ai/video/finish/reframe.ts` [nuevo] (núcleo: plan de recorte, medición de franjas, safe zones)
- `scripts/ai/video/finish/edl.ts` [nuevo] (núcleo: EDL → plan de cortes en cuadros)
- `scripts/ai/video/finish/run.ts` [nuevo] (orquestación con ffmpeg)
- `scripts/ai/video/finish/cli.ts` [nuevo] (`pnpm video:finish`)
- `package.json` (script `video:finish`)
- Docs: taxonomía §3.5/§5, guía §4.3, manual nuevo `docs/manual-de-uso/ai-tooling/acabado-de-video.md`, companion de
  posproducción de `motion-design-studio` (+ espejo)

## Current Repo State

### Already exists

- Helpers de ffmpeg en `scripts/ai/inpaint/ffmpeg.ts` (extraer cuadros, codificar, copiar audio, medir duración).
- Comando de recorte 4:5 documentado en la guía §3 y medición manual de franjas (luminancia 1,8/255 y 0,2/255 en la
  pieza de referencia).
- Overlays producidos con HyperFrames y el motor de Glitch (repo taller) y cartelas por receta
  (`workflows/generative-film-with-approved-title-overlays.md`).

### Gap

- No hay CLI de post con receta, manifiesto ni verificación; no hay medición automática de franjas ni de safe zones.
- No hay montaje por EDL reproducible ni normalización de loudness con objetivo por plataforma declarado.
- No hay verificación de que el archivo entregado sea el revisado.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ai/video/finish/**`, ejecutado con `tsx` en el equipo del operador
- Future candidate home: `undecided`
- Future candidate home note: `recipe.ts`, `reframe.ts` y `edl.ts` candidatos a `@efeoncepro/axis-creative-core`; `run.ts` (ffmpeg) se queda en el consumidor
- Boundary: núcleo puro (planes y mediciones sobre números y buffers); ffmpeg y disco sólo en `run.ts`; consumidores autorizados: `pnpm video:finish` y las tasks de EPIC-051
- Server/browser split: `n/a` (Node CLI; nunca en bundle ni runtime de producto)
- Build impact: `none` (fuera del grafo de Next)
- Extraction blocker: `none` conocido (no usa `@/lib/ai/*`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Receta, manifiesto y export con hash

- `recipe.ts`: formato de receta (fuentes con hash, pasos ordenados, salidas), validación y plan; `run.ts` ejecuta paso
  a paso con salidas intermedias y caché por huella.
- `deliver.export`: codecs de entrega declarados, metadata, hash de cada salida; verificación de que el archivo
  entregado tiene el hash del revisado.

### Slice 2 — Reencuadre con franjas medidas (4:5 y otros aspectos)

- `reframe.ts`: plan de recorte para un aspecto destino (ancla, desplazamiento) y **medición de las franjas
  sacrificadas en todos los cuadros** (luminancia y varianza): código 3 si alguna franja tiene contenido sobre umbral
  en algún cuadro; zona segura declarada por plataforma (archivo de safe zones de la receta) con verificación de que el
  sujeto marcado queda dentro.
- Atajo `pnpm video:finish reframe --in toma-3x4.mp4 --aspect 4:5`.

### Slice 3 — Cortes, montaje por EDL y retime constante

- `edl.ts`: EDL en JSON (fuente, entrada y salida en cuadros o timecode, transición), plan de cortes exactos; atajo
  `cutdown` para 15/10/6 desde un master con marcas.
- `time.retime` constante (sin interpolación; la interpolación es generativa y queda fuera).

### Slice 4 — Grade, overlays y subtítulos

- `finish.grade`: LUT `.cube` o ajustes declarados, aplicados tal cual; registro del LUT por hash.
- `finish.overlay`: componer capas con alfa ya aprobadas en tiempos y posiciones de la receta; verificación de que la
  capa entra completa y de contraste medido bajo la caja del texto o logo (mismo criterio que la firma en foto).
- `finish.captions`: quemar o adjuntar subtítulos desde SRT/VTT.

### Slice 5 — Loudness y documentación

- `audio.mix`: normalización de loudness con objetivo por plataforma declarado en la receta, medición antes/después en
  el manifiesto; la escucha sigue siendo humana y separada.
- Manual nuevo, taxonomía §5 (H9, H10 cerrados con evidencia), guía §4.3 (carril D con comando) y companion de
  posproducción de `motion-design-studio` (+ espejo).

## Out of Scope

- Generar texto, tipografía o animación de marca (se compone arte ya aprobado).
- Interpolación de cuadros y slow motion (generativo; follow-up de EPIC-051).
- Estabilización (follow-up si aparece un caso real).
- Edición no lineal interactiva o integración con un NLE.
- Mezcla creativa multipista y diseño sonoro (dueño `audio-studio`).

## Detailed Spec

- **Determinismo:** misma receta + mismas fuentes (hash) = mismo archivo de salida; la versión de ffmpeg se registra en
  el manifiesto.
- **Códigos:** `0` PASS · `2` FAIL (salida con duración, fps o resolución distintas de la receta; hash entregado ≠
  revisado) · `3` REVISAR (franja con contenido, sujeto fuera de la zona segura, contraste bajo umbral, loudness fuera
  de tolerancia) · `1` error.
- **Costo:** 0 créditos; sólo cómputo local.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1. Slice 1 primero (receta y manifiesto son la base de los demás).
2. Slices 2–5 en cualquier orden después del 1; el 2 tiene prioridad por el 4:5.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Reencuadre corta contenido | Calidad | media | medición de franjas en todos los cuadros; código 3 | manifiesto |
| Recodificación degrada el master | Calidad | media | codecs de entrega declarados; sin recodificar pasos intermedios cuando no hace falta | revisión al 100 % |
| Safe zones de plataforma desactualizadas | Formato | media | archivo de safe zones fechado y citado | fecha en la receta |
| Overlay tapa cara o interfaz | Marca | baja | zonas prohibidas declaradas en la receta | código 3 |

### Feature flags / cutover

N/A — herramienta out-of-band sin runtime de producción ni flags.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| 1–5 | `git revert` del commit del slice | minutos | sí |

### Production verification sequence

N/A — no hay runtime de producción. Verificación: pruebas del núcleo y una corrida de punta a punta sobre una pieza
real ya aprobada (sin gasto).

### Out-of-band coordination required

- Ninguna de gasto. Elegir con el operador la pieza real de prueba (por ejemplo, un master de una campaña CMP vigente).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm video:finish <receta.json>` produce salidas, manifiesto y verificación por paso, y reejecutar la receta da el mismo hash.
- [ ] `reframe --aspect 4:5` sobre una toma 3:4 mide las franjas en todos los cuadros y sale con código 3 si alguna tiene contenido.
- [ ] `cutdown` arma 15/10/6 desde un master con marcas en cuadros exactos.
- [ ] `finish.overlay` compone arte aprobado y mide el contraste bajo la caja del texto o logo.
- [ ] `audio.mix` registra loudness antes y después contra el objetivo declarado.
- [ ] `deliver.export` falla con código 2 si el hash entregado no es el revisado.
- [ ] El núcleo no importa `@/`, disco ni red; manual y docs actualizados.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts/ai/video/finish`
- Corrida de punta a punta sobre una pieza real aprobada
- `pnpm test` y `pnpm build` (gate de cierre; el build con autorización del operador si el equipo está cargado)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Evidencia de la corrida de punta a punta en `ai-generations/<fecha>_task-1981-finish/README.md`

## Follow-ups

- Estabilización y reencuadre inteligente que siga al sujeto (con la máscara de TASK-1979).
- Interpolación de cuadros (generativa) para slow motion.

## Open Questions

- ¿Las safe zones por plataforma viven en un archivo propio del CLI o se leen de la referencia de
  `efeonce-advertising-creative`? Se decide en Discovery para no duplicar la fuente.
