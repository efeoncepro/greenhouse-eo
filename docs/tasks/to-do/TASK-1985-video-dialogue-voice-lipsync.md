# TASK-1985 — Diálogo, voz y lipsync en español sobre video

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
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
- Status real: `Sin empezar. Diálogo con lipsync declarado por Seedance 2.x y Flux 3 (fal dice inglés principal para Flux 3); nada probado en español. Canario C10 estimado en ≈ USD 3,7`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `TASK-1980`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Medir y operar las operaciones de audio con personaje: `audio.lipsync` (sincronía labial), `audio.voice` (voz y TTS)
y el diálogo nativo de los motores, en español neutro y es-CL. Compara diálogo nativo (Seedance 2.5, Flux 3, Wan 3.0)
contra voz generada aparte + lipsync dedicado, con gate de consentimiento para voces reales. Cierra el hueco H12. El
oficio sonoro es de `audio-studio`.

## Why This Task Exists

- Las piezas con personaje hablando (Nexa, elenco, explainers) no tienen camino probado: el diálogo nativo está
  declarado por los proveedores pero nadie lo midió en español (guía §3, fila de diálogo).
- La skill de video ya advierte: pronunciación, pausas, timbre y lipsync no están garantizados por prescindir de audio
  externo; hay que validarlos en el resultado.
- Voz real o clonada exige consentimiento (taxonomía §3.11) y hoy no hay un gate que lo pida antes de gastar.

## Goal

- Canario C10: misma línea de diálogo en español con elenco ficticio y voz sintética, por diálogo nativo en tres
  motores y por voz aparte + lipsync dedicado; veredicto por escucha y por sincronía medida.
- `pnpm ai:video lipsync --video toma.mp4 --audio voz.wav --engine <id>` con gate de consentimiento y medición de
  sincronía (si el canario elige el camino dedicado).
- Defaults de selección para diálogo en la guía, con evidencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- Taxonomía de video: `audio.native` (producción), `audio.voice` y `audio.lipsync` (posproducción); derechos §3.11;
  hueco H12.
- `audio-studio` es dueño de voz, dicción, música y mezcla; `motion-design-studio` de la toma.
- Gobierno de derechos: `greenhouse-ai-creative-rights-governance` + `legal-privacy-ip-operator` para voces reales.
- ADR-024: la medición de sincronía es núcleo puro; adaptadores en Greenhouse.

## Normative Docs

- `docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md`
- `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md` (§3, §4.3, §5.9)
- `.claude/skills/audio-studio/SKILL.md`
- `.claude/skills/motion-design-studio/SKILL.md` (§Video social estacional: diálogo con audio nativo)

## Dependencies & Impact

### Depends on

- TASK-1980 (banco de canarios y reconciliación de costo).
- TASK-1981 (`audio.mix`) para la mezcla final, si ya existe.

### Blocks / Impacts

- Recetas de `motion-design-studio` y `audio-studio` para piezas con diálogo.

### Files owned

- `scripts/ai/video/lipsync-metrics.ts` [nuevo] (núcleo: sincronía entre energía de la voz y apertura de boca)
- `scripts/ai/video/adapters/lipsync-fal.ts` [nuevo] (si el canario elige un lipsync dedicado) [verificar candidato y precio en Discovery]
- `scripts/ai/video/cli.ts` (subcomando `lipsync`)
- Docs: guía §3/§4.3, taxonomía §5, `audio-studio` y `motion-design-studio` (+ espejos), manual nuevo
  `docs/manual-de-uso/ai-tooling/dialogo-y-lipsync-en-video.md`

## Current Repo State

### Already exists

- Diálogo nativo declarado: Seedance 2.x (diálogo entre comillas), Flux 3 (inglés principal), Wan 3.0 (débil según
  terceros); audio nativo verificado por familia a nivel de contrato.
- Voz y efectos por el MCP de ElevenLabs (sesión); música vía fal fuera de `ai:fal` (guía §5.9).

### Gap

- Ningún diálogo en español probado; ningún lipsync dedicado conectado; ninguna medición de sincronía; ningún gate de
  consentimiento de voz en el CLI.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ai/video/**`, ejecutado con `tsx` en el equipo del operador
- Future candidate home: `undecided`
- Future candidate home note: `lipsync-metrics.ts` candidato a `@efeoncepro/axis-creative-core`; adaptadores en Greenhouse
- Boundary: núcleo de medición puro; voz y lipsync vía adaptadores; consumidores autorizados: `pnpm ai:video lipsync` y el banco
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

### Slice 1 — Medición de sincronía

- `lipsync-metrics.ts`: correlación entre la envolvente de energía de la voz y la apertura de boca estimada por cuadro
  (región de boca detectada localmente); desfase medido en cuadros.

### Slice 2 — Canario C10

- Línea de 5 s en español con elenco ficticio (sin persona real): diálogo nativo en Seedance 2.5, Flux 3 y Wan 3.0
  (≈ USD 3,7); voz sintética aparte con la herramienta que elija `audio-studio`.
- Veredicto por escucha (pronunciación, pausas, timbre) separado de la medición de sincronía.

### Slice 3 — Lipsync dedicado (si C10 lo justifica)

- Discovery: candidato de lipsync en fal (contrato y precio oficial); conectar como adaptador.
- `pnpm ai:video lipsync` con gate de consentimiento: si la voz o el rostro son de una persona real, exige
  `--consent <referencia>` y lo registra en el manifiesto sin el contenido sensible.

### Slice 4 — Documentación

- Guía §3 (fila de diálogo) y §4.3, taxonomía §5 (H12), `audio-studio` y `motion-design-studio` (+ espejos), manual.

## Out of Scope

- Clonar voces de personas reales en esta task (requiere consentimiento y gobierno de derechos aparte).
- Doblaje de piezas existentes a otros idiomas.
- Música y diseño sonoro (ya cubiertos por `audio-studio`).

## Detailed Spec

- **Garantía:** desfase de sincronía bajo el umbral calibrado en C10; la escucha aprueba pronunciación y pausas.
- **Códigos:** `0` PASS · `2` FAIL (duración del audio distinta del video) · `3` REVISAR (desfase sobre umbral) · `1`
  error (sin consentimiento con persona real, tope de costo, FATAL).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1. Slice 1 sin gasto; Slice 2 con autorización del monto; Slice 3 sólo si C10 muestra que el diálogo nativo no basta.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Pronunciación pobre en español | Calidad | alta | escucha humana obligatoria; voz aparte + lipsync | veredicto C10 |
| Uso de voz real sin consentimiento | Derechos | baja | gate `--consent` y elenco ficticio en el canario | código 1 |
| Rechazo cobrado por filtro | Costo | media | elenco ficticio, sin marcas | estado del request |

### Feature flags / cutover

N/A — herramienta out-of-band sin runtime de producción ni flags.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| 1–4 | `git revert` del commit del slice | minutos | sí |

### Production verification sequence

N/A — no hay runtime de producción. Verificación: pruebas del núcleo, dry-runs y el canario C10.

### Out-of-band coordination required

- Autorización de gasto del operador para C10; `audio-studio` elige la voz sintética.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La medición de sincronía detecta un desfase sintético conocido.
- [ ] C10 corrido con autorización, con escucha y sincronía registradas por motor y costo real.
- [ ] Si se conecta un lipsync dedicado, exige `--consent` cuando hay persona real y lo registra en el manifiesto.
- [ ] Guía §3/§4.3 y taxonomía §5 actualizadas con lo medido.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts/ai/video`
- Dry-runs y canario C10
- `pnpm test` y `pnpm build` (gate de cierre; el build con autorización del operador si el equipo está cargado)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Evidencia del canario en `ai-generations/<fecha>_task-1985-canary/README.md`

## Follow-ups

- Voz de marca de Nexa (diseño de voz) con `audio-studio`, si el operador la pide.

## Open Questions

- ¿El diálogo nativo en español alcanza la barra de `final`, o toda pieza con diálogo va por voz aparte + lipsync? Se
  decide con C10.
