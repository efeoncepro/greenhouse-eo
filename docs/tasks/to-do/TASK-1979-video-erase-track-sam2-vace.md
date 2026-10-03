# TASK-1979 — Borrar y seguir objetos en video: SAM 2 + Wan VACE sobre `pnpm ai:inpaint video`

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
- Status real: `Sin empezar. Esquemas de fal-ai/sam2/video y fal-ai/wan-vace-14b/inpainting leídos en TASK-1965, nunca conectados; precio sin medir`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar los huecos H1, H2 y H3 de la taxonomía de video: **seguir** un objeto con SAM 2 para obtener una máscara por
cuadro (`pnpm ai:track`), **borrarlo** con Wan VACE inpainting (`pnpm ai:inpaint video --op erase`) y permitir
**editar una zona con cámara en movimiento** con esa misma máscara. Todo sobre el pipeline existente: el motor
trabaja dentro de la máscara, el pipeline recompone el original afuera y verifica delta 0 en cada cuadro.

## Why This Task Exists

- Ninguna operación de borrado de video está conectada (guía §4.3, `edit.erase`): hoy un objeto que sobra obliga a
  regenerar la toma completa, con el costo y la deriva que eso trae.
- `pnpm ai:inpaint video` sólo acepta una máscara fija o cajas interpoladas en línea recta (`video-mask.ts`): con
  cámara en movimiento la zona queda pegada a la pantalla, no al objeto (manual «Editar una zona de un video»).
- El único canario de video pasó con deriva 11,16 contra un umbral de 12, con cámara **quieta**: la métrica actual de
  deriva (delta medio de toda la zona protegida) va a fallar con cámara en movimiento aunque el resultado esté bien.
- Es la primera candidata del programa EPIC-051 y la técnica más pedida en posproducción (sobra un objeto, un cable,
  una persona al fondo, un logo ajeno).

## Goal

- `pnpm ai:track --video clip.mp4 --points x,y[@t] | --box x0,y0,x1,y1[@t] | --prompt "<objeto>"` escribe una
  secuencia de máscaras por cuadro + video de máscara + `track.json`, con vista previa y costo antes de gastar.
- `pnpm ai:inpaint video --mask-track <track.json>` acepta esa máscara por cuadro en cualquier estrategia existente.
- `pnpm ai:inpaint video --op erase --engine fal:wan-vace-inpaint` borra el objeto con garantía: delta 0 fuera de la
  máscara dilatada en cada cuadro y detector de residuo (código 3 si el objeto reaparece).
- Canario real en tres clips (cámara quieta, paneo, objeto en movimiento) con costo real por request.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- Taxonomía de video (`docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md`): operaciones `edit.track`,
  `edit.erase` y `edit.zone` de la fase de posproducción; huecos H1–H3.
- Pipeline de inpainting (`docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` §Pipeline de inpainting):
  recomposición sobre el original, verificación del archivo escrito, códigos `0`/`2`/`3`/`1`, caché por huella.
- ADR-024: CLI primero con forma de producto; el núcleo nuevo (máscara por cuadro, dilatación temporal, detector de
  residuo, deriva por banda) nace puro, sin `@/`, disco ni red, graduable a `@efeoncepro/axis-creative-core`; los
  adaptadores de fal se quedan en Greenhouse.
- Guarda de marca: logos y marcas nunca se generan; borrar un logo ajeno es válido, dibujar uno no.
- Herramienta out-of-band: nunca importada por `src/app/**` ni por el runtime de `src/lib/**`.

## Normative Docs

- `docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md`
- `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md` (§4.3, §6.8, §8.4)
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` (§Pipeline de inpainting)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLI_FIRST_GRADUATION_DECISION_V1.md` (ADR-024)
- `docs/manual-de-uso/ai-tooling/editar-una-zona-de-un-video.md`
- `ai-generations/2026-10-02_task-1965-canary/` (canario de `edit.zone`)

## Dependencies & Impact

### Depends on

- TASK-1965 (complete): `pipeline-video.ts`, `video-mask.ts`, `ffmpeg.ts`, adaptadores de video.
- Preferible después de TASK-1976 (frontera del núcleo y su gate); si no, el código nuevo nace igual dentro de esa
  frontera y TASK-1976 lo absorbe.
- **Secuencia con TASK-1976 (acordado con la sesión del pipeline, 2026-10-03):** TASK-1976 separa lógica e I/O en `video-mask.ts`, `pipeline-video.ts` y `adapters/video-fal.ts`, los mismos archivos que toca esta task. Nunca en paralelo: la que se tome segunda rebasa sobre la que cerró primero.
- **Clasificación desde el primer archivo (acordado con la sesión del pipeline, 2026-10-03):** el gate de TASK-1976 derivará de un manifiesto los directorios cubiertos y romperá con cualquier archivo nuevo de `scripts/ai/inpaint/` o `scripts/ai/video/` sin clasificar. Si esta task crea `scripts/ai/video/` antes de que cierre TASK-1976, clasifica cada módulo como núcleo, orquestación o adaptador desde el primer archivo.
- **Puente mientras tanto (propio primero, 2026-10-03):** `sam_3_video` (CLI de Higgsfield) como alternativa o motor de `ai:track` frente a SAM 2 de fal; borrado por instrucción sin garantía con `kling_video_edit` o Seedance 2.5 `video_edit`, y reemplazo de objeto con Genjutsu `hf_mult_replace_object`, todos vía el adaptador de TASK-1986. Comparar en el canario C3/C4 si sobra presupuesto.

### Blocks / Impacts

- TASK-1983 (recorte de sujeto): reutiliza la máscara por cuadro.
- TASK-1984 (relight de video): reutiliza la máscara por cuadro del sujeto.
- Manual de edición de zona de video: deja de remitir al «follow-up VACE + SAM 2».

### Files owned

- `scripts/ai/inpaint/video-mask.ts` (nueva fuente `kind: 'frames'`)
- `scripts/ai/inpaint/track.ts` [nuevo] (núcleo: dilatación temporal, cobertura, huella de la secuencia)
- `scripts/ai/inpaint/track-cli.ts` [nuevo] (`pnpm ai:track`)
- `scripts/ai/inpaint/video-residue.ts` [nuevo] (detector de residuo y deriva por banda)
- `scripts/ai/inpaint/pipeline-video.ts` (op `erase`, máscara por cuadro, deriva por banda)
- `scripts/ai/inpaint/adapters/video-fal.ts` (motor `fal:wan-vace-inpaint`)
- `scripts/ai/inpaint/adapters/track-fal.ts` [nuevo] (SAM 2 video)
- `src/lib/ai/fal-capabilities.ts` (capacidades `sam2-video`, `wan-vace-inpaint`) [verificar slugs en Discovery]
- `package.json` (script `ai:track`)
- Docs: spec §Pipeline de inpainting, guía §4.3/§6.8/§8.4, taxonomía §5, manual de edición de zona de video

## Current Repo State

### Already exists

- `VideoMask` con `at(seconds) → CanonicalMask`; `pipeline-video.ts` pide la máscara de cada cuadro con
  `videoMask.at(frameTime)`; fuentes `static` (PNG) y `keyframes` (rect/polígono interpolados).
- Normalización de la salida a resolución/fps/duración del original (`reconcileFrameCount`), deriva media con aborto
  (`--max-drift`, default 12/255), recomposición por cuadro, verificación delta 0 sobre PNG, parpadeo dentro de la zona,
  copia del audio original, caché por huella.
- Canario `edit.zone` 2026-10-02 con `fal:flux3-edit` (PASS, deriva 11,16).
- `measureErasure` en imagen (sólo mide «cambió»; dio falsos «borrado» con Flux Fill en TASK-1973).

### Gap

- No hay fuente de máscara por cuadro ni comando de seguimiento.
- No hay motor de borrado de video; VACE pide `mask_video_url` (video de máscara, no PNG).
- La deriva se mide sobre toda la zona protegida: no distingue movimiento de cámara de un motor que corrió el encuadre.
- No hay detector de residuo en video (no existe clean plate).
- La huella de caché de `VideoMask` no contempla una secuencia: reutilizaría una corrida vieja.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ai/inpaint/**`, ejecutado con `tsx` en el equipo del operador
- Future candidate home: `undecided`
- Future candidate home note: `track.ts` y `video-residue.ts` candidatos a `@efeoncepro/axis-creative-core` (ADR-024 §D5); `track-fal.ts` y el motor VACE se quedan en Greenhouse
- Boundary: núcleo puro (buffers, máscaras, números, `sharp`); orquestación, ffmpeg y adaptadores fuera; consumidores autorizados: `pnpm ai:track`, `pnpm ai:inpaint video` y las tasks hermanas de EPIC-051
- Server/browser split: `n/a` (Node CLI; nunca en bundle ni runtime de producto)
- Build impact: `none` (fuera del grafo de Next)
- Extraction blocker: los adaptadores sobre `@/lib/ai/*`, igual que el resto del pipeline (TASK-1976)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Máscara por cuadro en el núcleo

- `VideoMask` con `kind: 'frames'` (secuencia PNG o video de máscara) que implementa `at()`; `isStatic=false`;
  `fingerprint` que cubre la secuencia completa (hash de todos los cuadros o del video de máscara).
- `track.ts`: dilatación espacial y **temporal** (unión con los cuadros vecinos para que un objeto rápido no deje
  bordes), cobertura por cuadro y cuadros vacíos.
- Pruebas sin disco: secuencia sintética con un rectángulo que se desplaza → `at()` devuelve la máscara correcta por
  tiempo; huellas distintas para secuencias distintas.

### Slice 2 — `pnpm ai:track` con SAM 2 video

- Adaptador `track-fal.ts` sobre `fal-ai/sam2/video` (leer su contrato en Discovery: puntos, cajas o prompt; formato
  de salida). Capacidad en `fal-capabilities.ts` con precio oficial o `[sin dato]` medido con `--balance`.
- CLI: entrada por puntos/caja en un tiempo o por texto; salida `masks/NNNN.png`, `mask.mp4`, `track.json`
  (cobertura por cuadro, cuadros vacíos, huella), `track-preview.mp4` (máscara sobre el video); `--dry-run` con costo.
- Detector: cuadros donde la máscara desaparece o salta más que un umbral → código 3 con la lista de cuadros.

### Slice 3 — Edición de zona con máscara por cuadro y deriva por banda

- `pnpm ai:inpaint video --mask-track <track.json>` en las estrategias existentes (`edit-recompose`, `first-frame`).
- `video-residue.ts`: deriva medida en una **banda** alrededor de la máscara (no sobre todo el cuadro) y compensada por
  el movimiento global estimado entre cuadros del original; recalibrar el umbral con el canario.
- Fundido temporal del borde de la máscara para no titilar.

### Slice 4 — Borrado con Wan VACE

- Motor `fal:wan-vace-inpaint` en `video-fal.ts` (`video_url` + `mask_video_url`; el adaptador codifica la secuencia a
  video con los helpers de `ffmpeg.ts` y valida fps/duración contra el original).
- `--op erase`: prompt de relleno opcional («continúa el fondo»), recomposición fuera de la máscara dilatada.
- Detector de residuo: volver a correr SAM 2 sobre la **salida** con los mismos puntos/prompt; si encuentra el objeto
  (área sobre umbral) en más de un porcentaje de cuadros → código 3. El costo de esta segunda pasada se estima y se
  declara.

### Slice 5 — Canario y documentación

- Canario real C3 + C4 de EPIC-051: tres clips (cámara quieta, paneo, objeto en movimiento), borrado con VACE y una
  edición de zona con `flux3-edit` sobre máscara de SAM 2. `--balance` antes y después; README con costos reales.
- Spec, guía (§4.3 `edit.erase`/`edit.track`/`edit.zone`, §6.8, §8.4), taxonomía §5 (H1–H3), manual de edición de
  zona de video y skills (`greenhouse-ai-image-generator` referencia de inpainting, `motion-design-studio`,
  `ai-model-selection`) con espejos.

## Out of Scope

- Reemplazar el fondo completo con alfa (TASK-1983) y relight (TASK-1984), aunque reutilicen la máscara.
- Borrar con motores generales por instrucción sin máscara (Seedance editing, Omni edit): pueden entrar como
  alternativa en el canario si sobra presupuesto, no como entrega.
- Seguimiento interactivo (UI) y Globe.
- Tomas de más de lo que VACE acepte por solicitud: se corta antes (sin troceo automático en esta task).

## Detailed Spec

- **Garantía:** fuera de `dilate(mask_t)` el cuadro de salida es byte a byte el original (verificado sobre PNG antes de
  codificar); dentro, sin residuo detectable por SAM 2 y con parpadeo bajo el umbral medido en el canario.
- **Huella de caché:** `hash(video original) + hash(secuencia de máscaras) + motor + revisión del adaptador + prompt`.
- **Códigos:** `0` PASS · `2` FAIL (algún píxel cambió fuera de la máscara) · `3` REVISAR (residuo, máscara que salta,
  deriva en banda sobre umbral, zona casi sin cambio) · `1` error (tope de costo, límites del motor, FATAL).
- **Costo:** `--dry-run` imprime SAM 2 (seguimiento + detector) + VACE; sobre el tope (`--max-usd`, default USD 1) exige
  `--yes` con autorización humana del monto.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1. Slice 1 primero (núcleo sin red, con pruebas).
2. Slices 2–4 en orden; cada uno sólo gasta con autorización del monto en chat.
3. Slice 5 al final, con el canario completo.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| SAM 2 pierde el objeto en oclusiones | Seguimiento | media | puntos en varios tiempos; código 3 con cuadros vacíos | `track.json` |
| VACE deja un fantasma del objeto | Borrado | media | detector de residuo con SAM 2 sobre la salida | código 3 |
| La deriva por banda deja pasar un reencuadre | Garantía | baja | compensación de movimiento global + revisión al 100 % | canario |
| Precio de VACE/SAM 2 distinto del estimado | Costo | media | `--balance` antes y después, costo real en el manifiesto | diferencia en README |
| Caché reutiliza una corrida con otra máscara | Caché | baja | huella de la secuencia completa (prueba) | prueba del núcleo |

### Feature flags / cutover

N/A — herramienta out-of-band sin runtime de producción ni flags.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| 1–5 | `git revert` del commit del slice | minutos | sí |

### Production verification sequence

N/A — no hay runtime de producción. Verificación: pruebas del núcleo, dry-runs y el canario del Slice 5.

### Out-of-band coordination required

- Autorización de gasto del operador por canario (Slices 2, 4 y 5).
- Recarga de fal si el saldo no alcanza (cuenta B con USD 11,46 al 2026-10-03).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm ai:track` produce máscara por cuadro, video de máscara y `track.json` con cobertura, y sale con código 3 cuando la máscara desaparece o salta.
- [ ] `pnpm ai:inpaint video --mask-track` acepta la máscara por cuadro y verifica delta 0 fuera de ella en cada cuadro.
- [ ] `--op erase` con `fal:wan-vace-inpaint` borra el objeto en el canario de tres clips con veredicto al 100 % registrado.
- [ ] El detector de residuo devuelve código 3 cuando el objeto reaparece (probado con un caso de residuo real o sintético).
- [ ] La huella de caché cambia cuando cambia cualquier cuadro de la máscara (prueba).
- [ ] El núcleo nuevo no importa `@/`, disco ni red.
- [ ] Guía §4.3, taxonomía §5, spec, manual y skills (+ espejos) reflejan lo medido, con costos reales del canario.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts/ai/inpaint`
- Dry-runs y el canario del Slice 5
- `pnpm test` y `pnpm build` (gate de cierre; el build con autorización del operador si el equipo está cargado)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Evidencia del canario en `ai-generations/<fecha>_task-1979-canary/README.md`

## Follow-ups

- Troceo automático de clips largos con solapamiento y costura medida.
- Borrado por instrucción sin máscara como alternativa medida (Seedance editing, Omni edit).
- Seguimiento con SAM 3 si fal lo expone con mejor estabilidad.

## Open Questions

- ¿El umbral de residuo y el de deriva por banda sirven igual en los tres tipos de clip, o dependen del movimiento? Se
  decide con el canario del Slice 5.
