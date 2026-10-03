# TASK-1983 — Recorte de sujeto / reemplazo de fondo y upscale con detalle verificable en video

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
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
- Status real: `Sin empezar. Recorte de sujeto y upscale de video sólo existen en el MCP de sesión de Magnific; candidatos de fal sin conectar y sin precio leído`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `TASK-1980`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Dos operaciones de posproducción que hoy no tienen carril CLI: `edit.background` (recortar el sujeto con alfa por
cuadro y componerlo sobre otro fondo) y `finish.upscale` (subir resolución o restaurar), y un **detector de detalle
nativo** que distinga resolución real de reescalado. Cierra los huecos H5 y H6 de la taxonomía y da el detector que
necesita el canario C7 de TASK-1980.

## Why This Task Exists

- Cambiar el fondo de una toma (oficina → set de marca, plate generado → fondo real) se resuelve regenerando o en el MCP
  de Magnific, sin presupuesto gobernado ni manifiesto.
- «Dimensiones 4K no demuestran detalle nativo» (método de video): hoy no hay detector y la barra `premium` (taxonomía
  §3.2) depende de un juicio humano.
- La nitidez de Seedance 2.5 a 1080p y de H3 base 2K/4K (reescalado desde 768P) siguen sin verificar (guía §8.4).

## Goal

- `pnpm ai:video matte --video toma.mp4 [--mask-track track.json]` entrega el sujeto con alfa (secuencia PNG/MOV
  ProRes 4444 o WebM) y `pnpm ai:video background --video … --plate fondo.(png|mp4)` lo compone, con verificación de
  sujeto intacto y borde sin halo.
- `pnpm ai:video upscale --video … --engine <id> --target 1080p|4k` con medición de detalle nativo antes y después.
- `pnpm ai:video detail --video …` (detector solo, 0 créditos) para cualquier salida.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- Taxonomía de video: `edit.background` (carril H) y `finish.upscale` (carril G), barra de calidad por nivel (§3.2);
  huecos H5 y H6.
- Pipeline de inpainting: el sujeto recortado se compone sobre el fondo y lo que no es sujeto se verifica; patrón
  «generativo propone, determinístico garantiza».
- ADR-024: detector de detalle y verificación de borde como núcleo puro graduable; adaptadores en Greenhouse.
- Conectar un candidato exige slug + contrato en `fal-capabilities.ts`, corrida real y actualizar la guía (§11).
- Herramienta out-of-band: nunca importada por `src/app/**` ni por el runtime de `src/lib/**`.

## Normative Docs

- `docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md`
- `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md` (§4.3, §8.4, §10.2, §11)
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` (§Pipeline de inpainting)
- `docs/operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md` (gate «antes de llamar acabado al export»)

## Dependencies & Impact

### Depends on

- TASK-1980 (banco y métricas). La máscara por cuadro de TASK-1979 mejora el recorte, pero no bloquea: el matting
  dedicado produce su propia alfa.

### Blocks / Impacts

- TASK-1980 C7 (resolución nativa) usa el detector de detalle.
- TASK-1984 (relight) puede usar el sujeto recortado.

### Files owned

- `scripts/ai/video/detail.ts` [nuevo] (núcleo: detalle nativo por análisis de frecuencias)
- `scripts/ai/video/matte.ts` [nuevo] (núcleo: verificación de borde, composición sobre plate)
- `scripts/ai/video/adapters/matte-fal.ts` [nuevo], `scripts/ai/video/adapters/upscale-fal.ts` [nuevo]
- `scripts/ai/video/cli.ts` (subcomandos `matte`, `background`, `upscale`, `detail`)
- `src/lib/ai/fal-capabilities.ts` (capacidades de matting y upscale elegidas) [verificar slugs y precio en Discovery]
- Docs: guía §4.3/§8.4/§10.2, taxonomía §5, manual nuevo `docs/manual-de-uso/ai-tooling/fondo-y-upscale-de-video.md`

## Current Repo State

### Already exists

- `flux3-enhance` (sube a 1080p sólo un draft de Flux 3) y H3 base 2K/4K (reescalado interno).
- MCP de sesión de Magnific con `video_remove_background` (alfa en WebM, ≤ 20 s) y `video_upscale` (Topaz y Magnific):
  referencia de capacidades, no carril de producción.
- Recorte de fondo local de imágenes (`pnpm ai:image:rmbg`) — sólo imagen.

### Gap

- Ningún matting ni upscale de video en el CLI; ningún detector de detalle nativo.
- La sonda de precios del 2026-10-03 no devolvió tarifas para los candidatos: el precio se mide en el canario.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ai/video/**`, ejecutado con `tsx` en el equipo del operador
- Future candidate home: `undecided`
- Future candidate home note: `detail.ts` y `matte.ts` candidatos a `@efeoncepro/axis-creative-core`; adaptadores en Greenhouse
- Boundary: núcleo puro; adaptadores de fal fuera; consumidores autorizados: `pnpm ai:video` y el banco de TASK-1980
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

### Slice 1 — Detector de detalle nativo (0 créditos)

- `detail.ts`: energía de altas frecuencias por cuadro normalizada por resolución, comparada con la misma toma
  reducida y vuelta a subir; un reescalado puro casi no pierde energía en esa prueba. Calibrar con material conocido:
  una toma nativa de cámara y la misma reescalada desde 768p.
- `pnpm ai:video detail`: veredicto `nativo | reescalado | indeterminado` por toma.

### Slice 2 — Matting y reemplazo de fondo

- Discovery: leer contrato y precio oficial de los candidatos de matting de video en fal; elegir uno por canario.
- `matte.ts`: verificación de borde (halo por diferencia de color en un anillo alrededor de la alfa) y estabilidad de la
  alfa entre cuadros; composición sobre plate estático o en video.
- Subcomandos `matte` y `background`.

### Slice 3 — Upscale

- Discovery: candidatos de upscale de video en fal (contrato y precio); conectar el que pase el canario.
- Subcomando `upscale` con `detail` antes y después en el manifiesto; código 3 si el resultado sigue «reescalado».

### Slice 4 — Canario C8 y documentación

- C8 en el banco (tope propuesto USD 2,0, autorización del monto): matting en dos tomas (persona y producto) y upscale
  de una toma 720p a 1080p.
- Guía §4.3 (`edit.background`, `finish.upscale`), §8.4 (nitidez de Seedance 2.5 1080p si C7 ya corrió), §10.2
  (candidatos), taxonomía §5 (H5, H6), manual.

## Out of Scope

- Relight del sujeto recortado (TASK-1984).
- Upscale de imagen fija (ya cubierto por los generadores de imagen).
- Conectar el MCP de Magnific al CLI (es un carril de sesión; su API propia sería otra task).

## Detailed Spec

- **Garantía de matting:** sujeto intacto (sin cambios de píxel dentro de la alfa sólida), halo bajo umbral en el anillo
  del borde, alfa estable entre cuadros.
- **Garantía de upscale:** el detector marca `nativo` o al menos sube la energía de detalle sobre el umbral calibrado.
- **Códigos:** `0` PASS · `2` FAIL (dimensiones/duración distintas) · `3` REVISAR (halo, alfa inestable, detalle
  `reescalado`) · `1` error.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1. Slice 1 primero (sin gasto, desbloquea C7 de TASK-1980).
2. Slices 2–3 con dry-runs; Slice 4 con autorización del monto.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| El detector de detalle confunde nitidez artificial con detalle | Calidad | media | calibración con material conocido + revisión al 100 % | canario |
| Upscale inventa textura (caras) | Marca | media | revisión de caras al 100 %; no usar en personas reales sin aprobación | canario |
| Precio distinto del esperado | Costo | media | `--balance` antes y después | README |

### Feature flags / cutover

N/A — herramienta out-of-band sin runtime de producción ni flags.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| 1–4 | `git revert` del commit del slice | minutos | sí |

### Production verification sequence

N/A — no hay runtime de producción. Verificación: pruebas del núcleo, dry-runs y el canario C8.

### Out-of-band coordination required

- Autorización de gasto del operador para C8.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm ai:video detail` distingue una toma nativa de su versión reescalada en el material de calibración.
- [ ] `matte` y `background` entregan sujeto con alfa y composición, con código 3 ante halo o alfa inestable.
- [ ] `upscale` registra detalle antes y después y sale con código 3 si el resultado sigue reescalado.
- [ ] C8 corrido con autorización, costo real y veredicto humano al 100 %.
- [ ] Guía §4.3, §10.2 y taxonomía §5 actualizadas con lo medido.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts/ai/video`
- Dry-runs y canario C8
- `pnpm test` y `pnpm build` (gate de cierre; el build con autorización del operador si el equipo está cargado)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Evidencia del canario en `ai-generations/<fecha>_task-1983-canary/README.md`

## Follow-ups

- Adaptador de la API de Magnific (upscale Topaz/Magnific, relight) si su canario supera a los de fal.

## Open Questions

- ¿El matting dedicado supera a la máscara de SAM 2 de TASK-1979 en bordes finos (pelo)? Se compara en C8 si TASK-1979
  ya está cerrada.
