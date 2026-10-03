# TASK-1982 — Extender y cerrar en loop con costura medida

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
- Epic: `EPIC-051`
- Status real: `Sin empezar. Extensión verificada a nivel de contrato en Seedance 2.5, Flux 3 y Omni; ningún loop ni costura medidos. Canario C5 estimado en ≈ USD 6,2 (EPIC-051)`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `TASK-1980`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Dar garantía a dos operaciones de tiempo: `time.extend` (continuar una toma) y `time.loop` (cerrar en loop sin
costura). Un comando une la continuación con el original y **mide la junta** (posición, luz, movimiento y audio), y
otro arma loops por primer/último cuadro iguales o por cierre determinístico y mide el cierre. Cierra los huecos H7 y
H8 de la taxonomía; motor neutral: compara Seedance 2.5, Flux 3, Gemini Omni y los caminos por primer/último cuadro
(Flux 3, Wan, H3).

## Why This Task Exists

- Las extensiones entregan sólo la continuación (Flux 3) o una toma nueva (Seedance, Omni) y nadie mide si la junta se
  nota; el método exige probar entrada, centro y salida en contexto antes de unir ventanas.
- Los loops para `story-reel` y `hero-sitio` se hacen con crossfade a mano o con primer/último cuadro sin medir el
  cierre (workflow `static-key-visual-to-looping-social-motion`).
- `flux3-extend` falla después de encolar si el origen no tiene audio (verificado): el comando debe prevenirlo.

## Goal

- `pnpm ai:video extend --video toma.mp4 --engine <id> --seconds N` encola, une y mide la costura con código 3 si se
  nota.
- `pnpm ai:video loop --still kv.png | --video toma.mp4 --engine <id> | --mode crossfade|palindrome` produce un loop y
  mide el cierre.
- Canario C5 con costo real reconciliado en el banco de TASK-1980.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- Taxonomía de video: `time.extend` (producción) y `time.loop` (posproducción); huecos H7 y H8.
- Guía de selección §4.3 (motores de extensión y de primer/último cuadro) y §6.9.
- ADR-024: la medición de costura es núcleo puro graduable; los motores se invocan por los CLIs existentes.
- Método de video: «los handles se planifican, no se inventan con crossfade».
- Herramienta out-of-band: nunca importada por `src/app/**` ni por el runtime de `src/lib/**`.

## Normative Docs

- `docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md`
- `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md` (§4.3, §5.3, §5.6, §6.9)
- `docs/operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md`
- `.claude/skills/motion-design-studio/workflows/static-key-visual-to-looping-social-motion.md`

## Dependencies & Impact

### Depends on

- TASK-1980 (banco y núcleo de métricas de video).
- TASK-1981 para el cierre determinístico (crossfade/palíndromo) si ya existe; si no, el loop determinístico se
  implementa acá con los helpers de ffmpeg y TASK-1981 lo absorbe.
- **Clasificación desde el primer archivo (acordado con la sesión del pipeline, 2026-10-03):** el gate de TASK-1976 derivará de un manifiesto los directorios cubiertos y romperá con cualquier archivo nuevo de `scripts/ai/inpaint/` o `scripts/ai/video/` sin clasificar. Si esta task crea `scripts/ai/video/` antes de que cierre TASK-1976, clasifica cada módulo como núcleo, orquestación o adaptador desde el primer archivo.

### Blocks / Impacts

- Recetas de loop y de extensión de `motion-design-studio` pasan a citar el comando.

### Files owned

- `scripts/ai/video/seam.ts` [nuevo] (núcleo: diferencia en la junta, continuidad de movimiento, cierre de loop)
- `scripts/ai/video/extend-loop-run.ts` [nuevo] (orquestación)
- `scripts/ai/video/cli.ts` [nuevo] (`pnpm ai:video extend|loop`)
- `package.json` (script `ai:video`)
- Docs: guía §4.3/§6.9, taxonomía §5, manual nuevo `docs/manual-de-uso/ai-tooling/extender-y-loop-de-video.md`, workflow de loop (+ espejo)

## Current Repo State

### Already exists

- Extensión: `seedance25-r2v --task extension`, `flux3-extend` (+ draft) y Omni modo extender, verificados a nivel de
  contrato; el CLI de fal revisa con ffprobe que el origen de `flux3-extend` tenga audio.
- Primer/último cuadro: `flux3-flf`, `wan3-i2v --end-image`, `seedance25-i2v --end-image`, `h3*-i2v --end-image`.

### Gap

- Ninguna medición de la junta ni del cierre de loop; no hay comando que una origen + continuación.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ai/video/**`, ejecutado con `tsx` en el equipo del operador
- Future candidate home: `undecided`
- Future candidate home note: `seam.ts` candidato a `@efeoncepro/axis-creative-core`; orquestación en Greenhouse
- Boundary: núcleo de medición puro; motores sólo vía los CLIs existentes; consumidores autorizados: `pnpm ai:video` y el banco de TASK-1980
- Server/browser split: `n/a` (Node CLI; nunca en bundle ni runtime de producto)
- Build impact: `none` (fuera del grafo de Next)
- Extraction blocker: `none` conocido

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Núcleo de costura

- `seam.ts`: diferencia entre el último cuadro del origen y el primero de la continuación (SSIM + ΔE), salto de
  movimiento (flujo medio antes y después de la junta), salto de luminancia, discontinuidad de audio (nivel y espectro
  en una ventana corta); cierre de loop = misma medición entre último y primer cuadro.
- Pruebas sintéticas: secuencia continua → sin salto; corte duro → salto detectado.

### Slice 2 — `pnpm ai:video extend`

- Motores: `seedance25-extension`, `flux3-extend`, `omni-extend` (mapa a los CLIs); une origen + continuación cuando el
  motor entrega sólo la continuación; mide la junta; código 3 sobre umbral.
- Prevención: rechaza `flux3-extend` sin audio de origen antes de gastar; avisa del filtro de personas/marcas de
  Seedance.

### Slice 3 — `pnpm ai:video loop`

- Generativo: primer y último cuadro iguales (`flux3-flf`, `wan3-i2v --end-image`, `h3max-i2v --end-image`).
- Determinístico: crossfade o palíndromo (0 créditos).
- Mide el cierre en la versión en bucle (último → primero).

### Slice 4 — Canario C5 y documentación

- C5 en el banco de TASK-1980 (≈ USD 6,2; autorización del monto antes de correr): una extensión por motor y un loop
  por camino.
- Guía §4.3 (columna Canario de `time.extend` y `time.loop`), §6.9, taxonomía §5 (H7, H8), manual y workflow (+ espejo).

## Out of Scope

- Troceo de tomas largas en varias extensiones encadenadas (follow-up si C5 lo justifica).
- Extensión hacia atrás (sólo Wan directo en Alibaba, no conectado).
- Interpolación de cuadros.

## Detailed Spec

- **Garantía de extensión:** la salida unida no tiene salto en la junta sobre los umbrales calibrados con C5; el audio
  no corta.
- **Garantía de loop:** reproducida en bucle, el cierre no supera los mismos umbrales.
- **Códigos:** `0` PASS · `2` FAIL (duración o fps distintos de lo pedido) · `3` REVISAR (salto en junta o cierre) · `1`
  error (tope de costo, origen sin audio para Flux 3, FATAL).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1. Slice 1 sin gasto; Slices 2–3 con dry-runs; Slice 4 con autorización del monto.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| La métrica no ve un salto que el ojo sí ve | Calidad | media | revisión humana al 100 % obligatoria con PASS | discrepancia en C5 |
| Rechazo cobrado de Seedance | Costo | media | material sin personas reales ni marcas | estado del request |
| Origen sin audio en Flux 3 | Costo | baja | rechazo previo al gasto | código 1 |

### Feature flags / cutover

N/A — herramienta out-of-band sin runtime de producción ni flags.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| 1–4 | `git revert` del commit del slice | minutos | sí |

### Production verification sequence

N/A — no hay runtime de producción. Verificación: pruebas del núcleo, dry-runs y el canario C5.

### Out-of-band coordination required

- Autorización de gasto del operador para C5.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm ai:video extend` une origen + continuación y sale con código 3 cuando la junta supera el umbral.
- [ ] `flux3-extend` sin audio de origen se rechaza antes de gastar.
- [ ] `pnpm ai:video loop` produce loops por los caminos generativo y determinístico y mide el cierre.
- [ ] C5 corrido con autorización, con costo real y veredicto humano al 100 %.
- [ ] Guía §4.3 y taxonomía §5 actualizadas con lo medido.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts/ai/video`
- Dry-runs y canario C5
- `pnpm test` y `pnpm build` (gate de cierre; el build con autorización del operador si el equipo está cargado)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Evidencia del canario en `ai-generations/<fecha>_task-1982-canary/README.md`

## Follow-ups

- Encadenar extensiones para tomas largas con costura medida en cada junta.

## Open Questions

- ¿Los umbrales de costura sirven igual para cámara quieta y en movimiento? Se decide con C5.
