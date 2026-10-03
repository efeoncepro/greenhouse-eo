# TASK-1984 — Relight de video que conserva el sujeto (continuación de TASK-1977)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
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
- Status real: `Sin empezar. Ningún relight de video conectado ni invocado; candidatos en la guía §10.3, todos sin verificar en vivo`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `TASK-1977`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Llevar a video la técnica de TASK-1977 (el modelo propone la luz y el pipeline la aplica sobre los píxeles originales)
y comparar contra relight de video dedicado: `pnpm ai:inpaint relight --video` aplica, por cuadro y con la máscara
del sujeto, la luz transferida o calculada, con coherencia temporal y el sujeto exacto. Cierra el hueco H4 de la
taxonomía. Es el follow-up que TASK-1977 declara en su sección de Follow-ups.

## Why This Task Exists

- Reiluminar una toma (una pieza pegada que no toma la luz de la escena, o un plano cuya luz no calza con el resto del
  montaje) hoy no tiene camino en el CLI (guía §4.3 `edit.relight`).
- Los candidatos dedicados (ID-V2V Relight y LightX en fal; Beeble SwitchLight vía el MCP de Magnific; Higgsfield
  Cinema Studio con rig de luz; Runway Aleph 2.0) re-renderizan el cuadro: sin verificar si conservan forma, color y
  texto del sujeto, que es lo que el canon exige.
- El canon de marca pone un límite: un plate del registro cine se regenera, no se relumina; esta técnica es para
  composiciones y correcciones locales.

## Goal

- `pnpm ai:inpaint relight --video toma.mp4 --mask-track track.json --mode transfer|physical` reilumina el sujeto por
  cuadro conservando sus píxeles originales, con luz coherente entre cuadros y delta 0 fuera de la zona.
- Canario C9 que compare el modo propio contra al menos un relight dedicado conectado como adaptador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- Taxonomía de video: `edit.relight` (posproducción, carril H); hueco H4.
- TASK-1977: núcleo de luz (`relight.ts`), modos transfer y physical, códigos de salida; esta task lo extiende a
  secuencias, no lo duplica.
- Pipeline de inpainting de video: recomposición y verificación por cuadro; máscara por cuadro de TASK-1979.
- Canon cine: el plate se regenera, no se relumina (`EFEONCE_PHOTO_CINE_CASEBOOK_V1.md`); colorimetría de marca.
- ADR-024: coherencia temporal de la luz como núcleo puro; adaptadores en Greenhouse.

## Normative Docs

- `docs/tasks/to-do/TASK-1977-ai-inpaint-relight-light-transfer.md`
- `docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md`
- `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md` (§4.3, §10.3)
- `docs/operations/brand-photography/EFEONCE_PHOTO_COLORIMETRY_V1.md`

## Dependencies & Impact

### Depends on

- TASK-1977 (núcleo de luz en imagen) — bloqueante.
- TASK-1979 (máscara por cuadro del sujeto) — bloqueante para sujetos en movimiento; con cámara quieta basta una
  máscara fija.
- **Secuencia con TASK-1976 (acordado con la sesión del pipeline, 2026-10-03):** TASK-1976 separa lógica e I/O en `video-mask.ts`, `pipeline-video.ts` y `adapters/video-fal.ts`, los mismos archivos que toca esta task. Nunca en paralelo: la que se tome segunda rebasa sobre la que cerró primero.
- **Puente mientras tanto (propio primero, 2026-10-03):** Cinema Studio 4.0 (`cinematic_studio_video_4_0`, modo `video_edit` con rig de luz) está en la CLI de Higgsfield; entra al canario C9 como relight dedicado vía el adaptador de TASK-1986, junto a ID-V2V/LightX de fal.

### Blocks / Impacts

- `motion-design-studio/modules/11_VFX_COMPOSITING.md` §6b deja de decir «ningún motor conectado».

### Files owned

- `scripts/ai/inpaint/relight-video.ts` [nuevo] (núcleo: suavizado temporal del campo de luz)
- `scripts/ai/inpaint/relight-run.ts` (rama de video; archivo creado por TASK-1977)
- `scripts/ai/inpaint/adapters/relight-video-fal.ts` [nuevo] (candidato dedicado elegido en Discovery)
- Docs: guía §4.3/§10.3, taxonomía §5, módulo 11 de `motion-design-studio` (+ espejo), manual de relight de TASK-1977

## Current Repo State

### Already exists

- Plan de TASK-1977 (imagen) con prueba de concepto del nivel 1; adaptadores de imagen IC-Light v2 y relighting por
  estilos conectados (ninguno conserva el objeto).
- `pnpm ai:inpaint video` con recomposición por cuadro.

### Gap

- Ningún relight de video conectado ni medido; ningún suavizado temporal del campo de luz.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ai/inpaint/**`, ejecutado con `tsx` en el equipo del operador
- Future candidate home: `undecided`
- Future candidate home note: `relight-video.ts` candidato a `@efeoncepro/axis-creative-core` junto al núcleo de luz de TASK-1977
- Boundary: núcleo puro; adaptadores fuera; consumidores autorizados: `pnpm ai:inpaint relight`
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

### Slice 1 — Campo de luz por cuadro con coherencia temporal

- `relight-video.ts`: aplicar el campo de luz de TASK-1977 por cuadro con suavizado temporal (filtro sobre la ganancia
  en el tiempo) y seguimiento de la máscara; pruebas sintéticas de parpadeo de luz.

### Slice 2 — Modos transfer y physical en video

- `transfer`: la luz la propone un modelo sobre cuadros clave (relight de imagen) y se interpola entre ellos.
- `physical`: luz declarada sobre geometría estimada por cuadro (si el estimador de TASK-1977 funciona en secuencia).

### Slice 3 — Adaptador dedicado y canario C9

- Discovery: contrato y precio oficial de ID-V2V Relight y LightX en fal (tarifas hoy [tercero]); conectar uno.
- C9 (≈ USD 1,5; autorización del monto): misma toma con el modo propio y con el dedicado; medir sujeto exacto
  (diferencia de forma/color contra el original dentro de la máscara, descontada la ganancia de luz) y parpadeo de luz.

### Slice 4 — Documentación

- Guía §4.3/§10.3, taxonomía §5 (H4), módulo 11 de `motion-design-studio` (+ espejo), manual.

## Out of Scope

- Reiluminar plates del registro cine (el canon los regenera).
- Relight por MCP de sesión (Magnific/Beeble, Higgsfield Cinema Studio) como carril de producción.
- Relight de escena completa sin sujeto definido.

## Detailed Spec

- **Garantía:** dentro de la máscara, el sujeto conserva forma, color base y texto (sólo cambia la luz calculada);
  fuera, delta 0; la luz no titila entre cuadros sobre el umbral calibrado.
- **Códigos:** `0` PASS · `2` FAIL (cambio fuera de la zona) · `3` REVISAR (parpadeo de luz, sujeto alterado) · `1`
  error.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1. Esperar TASK-1977 cerrada; Slices 1–2 sin gasto o sobre salidas ya pagadas; Slice 3 con autorización.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Luz que titila entre cuadros | Calidad | alta | suavizado temporal + detector | código 3 |
| El relight dedicado altera el sujeto | Marca | alta | medir sujeto exacto; recomponer el original | canario |
| Uso para salvar un plate cine | Canon | baja | documentado en manual y skill | revisión del operador |

### Feature flags / cutover

N/A — herramienta out-of-band sin runtime de producción ni flags.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| 1–4 | `git revert` del commit del slice | minutos | sí |

### Production verification sequence

N/A — no hay runtime de producción. Verificación: pruebas del núcleo, dry-runs y el canario C9.

### Out-of-band coordination required

- Autorización de gasto del operador para C9.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm ai:inpaint relight --video` reilumina el sujeto con delta 0 fuera de la zona en cada cuadro.
- [ ] El detector de parpadeo de luz sale con código 3 en un caso sintético con luz inestable.
- [ ] C9 compara el modo propio con un relight dedicado, con costo real y veredicto humano al 100 %.
- [ ] Guía §4.3/§10.3, taxonomía §5 y módulo 11 actualizados con lo medido.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts/ai/inpaint`
- Dry-runs y canario C9
- `pnpm test` y `pnpm build` (gate de cierre; el build con autorización del operador si el equipo está cargado)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Evidencia del canario en `ai-generations/<fecha>_task-1984-canary/README.md`

## Follow-ups

- Comparar con Beeble SwitchLight por su API propia (o la de Magnific) si el operador habilita la cuenta.

## Open Questions

- ¿El modo transfer por cuadros clave basta, o el physical es necesario en video? Se decide con C9.
