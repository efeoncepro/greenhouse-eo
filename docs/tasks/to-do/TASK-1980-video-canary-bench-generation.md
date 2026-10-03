# TASK-1980 — Banco de canarios de video (`pnpm ai:video-bench`) y canarios de generación por motor

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
- Status real: `Sin empezar. Costos de los canarios C1, C2, C6 y C7 estimados el 2026-10-03 con pnpm ai:fal --estimate (EPIC-051)`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir un **banco de canarios de video** que corre el mismo brief en varios motores (fal, Higgsfield API y Gemini
Omni), mide cada salida con detectores objetivos —fidelidad del primer y último cuadro, keyframes, parpadeo, deriva de
identidad, duración/fps/resolución— y reconcilia el costo real por request; y usarlo para convertir en **canario de
garantía** las operaciones de producción más usadas: `gen.i2v`, `gen.r2v` (cast entre tomas), `gen.flf`,
`gen.keyframes` y la resolución nativa. Es neutral de motor: compara, no elige ganador creativo.

## Why This Task Exists

- Ninguna operación de generación tiene canario de garantía (hueco H13): `[verificado]` en la guía sólo prueba el
  contrato del endpoint. No sabemos qué motor conserva mejor un still aprobado ni cuál sostiene el cast entre tomas.
- La identidad entre tomas no tiene detector (H11) aunque ya medimos rostro y emblema en foto (`pnpm foto:rostro`,
  `pnpm foto:emblema`).
- La estimación se desvió de la factura (H14: SKY V11 +43 %; Seedance 2.5 1080p estimado por el CLI bajo la tarifa
  publicada en la guía). Un banco sin reconciliación por request repetiría el error.
- La API de Higgsfield tiene ~25 capacidades de video sin una sola salida verificada (H16).
- Comparar motores hoy es manual, por pieza, y la evidencia queda en conversaciones.

## Goal

- `pnpm ai:video-bench --brief brief.json --engines <ids> --dry-run` imprime el costo por motor y total; sin
  `--dry-run` corre, descarga, mide y escribe `manifest.json`, hoja de contacto por motor y un README de canario.
- Detectores objetivos con códigos `0`/`2`/`3`/`1` por motor y operación.
- Canarios C1 (i2v desde still), C2 (cast entre tres tomas), C6 (primer/último cuadro y keyframes) y C7 (1080p nativo
  vs reescalado) corridos con autorización, con costo real reconciliado.
- Guía §4.3 con la columna «Canario» actualizada por motor y operación, y defaults de selección elegidos por medición.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- Taxonomía de video: fase de producción (`gen.*`), barra de calidad por nivel (§3.2), cast e identidad (§3.6).
- Guía de selección §4.3 (operación × motor) y §7 (costo, estimación ≠ factura).
- ADR-024: el banco es la forma de cumplir «canario real documentado» y «defaults elegidos por medición»; los
  detectores son núcleo puro graduable; los adaptadores llaman a los CLIs existentes (`ai:fal`, `ai:omni`), no los
  reimplementan.
- Evaluation Harness de Globe (SPEC-003) como destino conceptual: el banco no elige ganador creativo; sus métricas
  objetivas alimentarían `objectiveChecks` y los criterios humanos siguen humanos.
- Herramienta out-of-band: nunca importada por `src/app/**` ni por el runtime de `src/lib/**`.

## Normative Docs

- `docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md`
- `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md` (§4.2, §4.3, §5, §7)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLI_FIRST_GRADUATION_DECISION_V1.md` (ADR-024)
- `docs/epics/to-do/EPIC-051-ai-video-production-cli-capabilities.md` (plan de canarios)
- `.claude/skills/motion-design-studio/companions/video-lessons-and-failure-modes.md` (caso SKY V11, costo)
- `.claude/rules/brand-photography.md` (cast, Nexa identidad A, `foto:rostro`, `foto:emblema`)

## Dependencies & Impact

### Depends on

- `pnpm ai:fal` (fal + Higgsfield API) y `pnpm ai:omni` con `--estimate`, `--detach`, `--request-id`.
- `pnpm foto:rostro` y `pnpm foto:emblema` como detectores de identidad sobre cuadros extraídos [verificar que acepten
  un PNG arbitrario en Discovery].
- **Clasificación desde el primer archivo (acordado con la sesión del pipeline, 2026-10-03):** el gate de TASK-1976 derivará de un manifiesto los directorios cubiertos y romperá con cualquier archivo nuevo de `scripts/ai/inpaint/` o `scripts/ai/video/` sin clasificar. Si esta task crea `scripts/ai/video/` antes de que cierre TASK-1976, clasifica cada módulo como núcleo, orquestación o adaptador desde el primer archivo.
- **Motores del puente en el banco (propio primero, 2026-10-03):** con TASK-1986, el banco suma motores de la CLI de la app de Higgsfield que no están en fal ni en la API (Veo 3.1 y Veo 3.1 lite, Kling 3.0 completo, Cinema Studio 3.0/4.0). Estimaciones gratis del 2026-10-03: Veo 3.1 lite 8 s 12 créditos, Kling 3.0 5 s 8,75. Sus costos van en créditos hasta conocer el valor del crédito.

### Blocks / Impacts

- TASK-1982 (extender y loop) y TASK-1983 (upscale y recorte) usan el banco para sus canarios.
- C7 depende del detector de detalle nativo de TASK-1983; si no existe aún, C7 corre con revisión humana al 100 % y se
  marca así.
- `motion-design-studio/workflows/engine-selection-by-fidelity-contract.md` recibe los defaults medidos.

### Files owned

- `scripts/ai/video/bench-cli.ts` [nuevo] (`pnpm ai:video-bench`)
- `scripts/ai/video/bench-run.ts` [nuevo] (orquestación: lanzar, retomar por request id, descargar)
- `scripts/ai/video/metrics.ts` [nuevo] (núcleo: fidelidad de cuadro, parpadeo, deriva, muestreo)
- `scripts/ai/video/identity.ts` [nuevo] (adaptador de `foto:rostro`/`foto:emblema` sobre cuadros)
- `scripts/ai/video/engines.ts` [nuevo] (mapa motor → comando de CLI y parámetros por operación)
- `package.json` (script `ai:video-bench`)
- Docs: guía §4.3/§7/§8, taxonomía §5, workflow de selección por contrato de fidelidad, manual nuevo
  `docs/manual-de-uso/ai-tooling/comparar-motores-de-video.md`

## Current Repo State

### Already exists

- `pnpm ai:fal` con estimación previa, tope y `--yes`, `--detach`/`--status`/`--request-id`, dos cuentas fal y carril
  Higgsfield con `--estimate` exacto; `pnpm ai:omni` con `--estimate` nominal y retome por interaction ID.
- Helpers de ffmpeg y de medición por cuadro en `scripts/ai/inpaint/ffmpeg.ts` y `recompose.ts` (reutilizables).
- Estimaciones del 2026-10-03 (EPIC-051): C1 ≈ USD 5,0 · C2 ≈ 6,0 · C6 ≈ 0,9 · C7 ≈ 8,1.

### Gap

- No hay comando que corra un brief en varios motores ni detectores de video de generación.
- No hay reconciliación de costo real por request (sólo `--balance` global antes y después).
- Ninguna capacidad de video de Higgsfield verificada en salida.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ai/video/**`, ejecutado con `tsx` en el equipo del operador
- Future candidate home: `undecided`
- Future candidate home note: `metrics.ts` candidato a `@efeoncepro/axis-creative-core`; orquestación y adaptadores se quedan en Greenhouse
- Boundary: núcleo de métricas puro (buffers, números, `sharp`); el banco invoca los CLIs existentes como procesos y no importa sus internos de red; consumidores autorizados: `pnpm ai:video-bench` y las tasks de EPIC-051
- Server/browser split: `n/a` (Node CLI; nunca en bundle ni runtime de producto)
- Build impact: `none` (fuera del grafo de Next)
- Extraction blocker: el adaptador de identidad depende de los scripts `foto:*` del repo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Núcleo de métricas de video

- `metrics.ts`: muestreo de cuadros; fidelidad de un cuadro contra una imagen (SSIM + ΔE en Lab, con alineación de
  tamaño); parpadeo temporal (diferencia entre cuadros consecutivos descontando movimiento global); verificación de
  duración/fps/resolución contra lo pedido.
- Pruebas sin disco con secuencias sintéticas (cuadro idéntico → fidelidad máxima; ruido por cuadro → parpadeo alto).

### Slice 2 — Banco: brief, motores, costo y reconciliación

- Formato del brief (`brief.json`): operación de la taxonomía, still/referencias con rol, prompt, duración, aspecto,
  resolución, motores; validación local.
- `engines.ts`: mapa a `pnpm ai:fal --capability …` / `pnpm ai:omni …` por operación; `--dry-run` suma las
  estimaciones de cada CLI (`--estimate`) y aplica el tope (`--max-usd`, `--yes`).
- Ejecución con `--detach` y retome por request id (nunca reenvío por timeout); costo real: el que reporte el proveedor
  por request cuando exista; si no, `--balance` antes y después en una corrida aislada, marcado como tal.
- Manifiesto, hoja de contacto por motor y README de canario con estimado vs real.

### Slice 3 — Detector de identidad sobre cuadros

- `identity.ts`: extrae N cuadros, corre `foto:rostro --persona <cast>` y, si hay uniforme, `foto:emblema`; deriva de
  identidad = dispersión entre tomas y contra el ancla. Código 3 sobre umbral.

### Slice 4 — Canarios C1 y C6

- C1: mismo still aprobado (elenco ficticio, sin persona real, para que entren los motores con filtro), misma acción,
  9:16, 5 s: Seedance 2.5, Flux 3, Wan 3.0, H3 Max, H3 Turbo, Omni y Kling 3 std vía Higgsfield. ≈ USD 5,0.
- C6: `flux3-keyframes-draft` → `flux3-enhance` y H3 Max con `--end-image`. ≈ USD 0,9.
- Cada uno con autorización del monto en chat antes de correr.

### Slice 5 — Canarios C2 y C7, y defaults por medición

- C2: Nexa (identidad A) en tres tomas con la misma ancla: Wan r2v, H3 Max r2v, Omni referencias, Seedance 2.5 r2v
  (una toma). ≈ USD 6,0.
- C7: 1080p de los motores que pasen C1 (Seedance 2.5, Flux 3, Wan, H3 Max). ≈ USD 8,1.
- Guía §4.3 (columna Canario), §7 (estimado vs real), workflow de selección (defaults por operación con la evidencia y
  la alternativa que perdió), taxonomía §5 (H11, H13, H14, H16), manual nuevo y skills (`motion-design-studio`,
  `ai-model-selection`) con espejos.

## Out of Scope

- Edición, borrado, extensión, loop, upscale, relight y audio (otras tasks de EPIC-051).
- Entrenar identidad (LoRA de H3, `elements` de Kling, Soul ID): follow-up con base en C2.
- Elegir ganador creativo: el banco mide; la aprobación creativa es humana.
- MCP de sesión (Magnific, Higgsfield Cinema Studio): fuera del banco por no tener presupuesto gobernado.
- Personas reales del equipo en el canario (requiere consentimiento; follow-up con Wan/H3 si el operador lo pide).

## Detailed Spec

- **Métricas por toma:** `firstFrameSsim`, `firstFrameDeltaE`, `lastFrameSsim` (flf), `keyframeSsim[]`, `flicker`,
  `identityDrift`, `durationOk`, `fpsOk`, `resolutionOk`, `costEstimatedUsd`, `costActualUsd`, `costSource`.
- **Umbrales:** se proponen en el Slice 1 y se calibran con C1; cada umbral declara la evidencia que lo fijó.
- **Códigos por motor:** `0` PASS (todas las métricas dentro) · `2` FAIL (duración/resolución distinta de lo pedido o
  primer cuadro fuera de umbral duro) · `3` REVISAR (deriva, parpadeo o identidad en zona gris) · `1` error.
- **Costo real:** nunca se presenta una estimación como costo; la columna `costSource` dice `proveedor`, `balance` o
  `estimado`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1. Slices 1–3 primero (sin gasto).
2. Slice 4 con autorización de cada monto; Slice 5 sólo con lo aprendido en C1.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Rechazo cobrado por filtro (personas reales o marcas) | Costo | media | elenco ficticio; sin marcas en cuadro | estado del request |
| Costo real sobre lo estimado | Costo | media | reconciliación por request; detener ante diferencia no explicada | README estimado vs real |
| Métrica objetiva premia lo que se ve mal | Calidad | media | revisión humana al 100 % obligatoria junto al veredicto | discrepancia humano/detector |
| `foto:rostro` no sirve sobre cuadros de video | Identidad | media | Discovery; si no aplica, detector alternativo o revisión humana marcada | Slice 3 |
| Saldo insuficiente | Operación | alta | pedir recarga antes de C2/C7 (cuenta B USD 11,46) | `--balance` |

### Feature flags / cutover

N/A — herramienta out-of-band sin runtime de producción ni flags.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| 1–5 | `git revert` del commit del slice | minutos | sí |

### Production verification sequence

N/A — no hay runtime de producción. Verificación: pruebas del núcleo, dry-runs y los canarios de los Slices 4 y 5.

### Out-of-band coordination required

- Autorización de gasto del operador por canario; recarga de fal antes de C2 y C7.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm ai:video-bench --dry-run` imprime costo por motor y total sin encolar, y respeta el tope con `--yes`.
- [ ] El banco retoma por request id sin volver a pagar y escribe manifiesto, hojas de contacto y README.
- [ ] Cada toma registra estimado y costo real con su fuente (`proveedor`, `balance` o `estimado`).
- [ ] C1, C2, C6 y C7 corridos con autorización, con veredicto humano al 100 % junto a las métricas.
- [ ] Al menos una capacidad de video de Higgsfield queda con salida verificada.
- [ ] Guía §4.3 muestra la columna Canario actualizada para `gen.i2v`, `gen.r2v`, `gen.flf` y `gen.keyframes`.
- [ ] El núcleo de métricas no importa `@/`, disco ni red.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts/ai/video`
- Dry-runs y canarios de los Slices 4 y 5
- `pnpm test` y `pnpm build` (gate de cierre; el build con autorización del operador si el equipo está cargado)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Evidencia de cada canario en `ai-generations/<fecha>_task-1980-canary/README.md`

## Follow-ups

- Identidad entrenada (LoRA de H3, `elements` de Kling, Soul ID) comparada contra el r2v de C2.
- C2 con una persona real del equipo (Wan y H3), con consentimiento.
- Correr el banco en cada cambio de versión de un motor (frescura de la guía).

## Open Questions

- ¿El reporte de costo por request existe para todos los proveedores o sólo para algunos? Se resuelve en el Slice 2 y
  define cuándo hace falta una corrida aislada con `--balance`.
