# TASK-1986 — Puente de la CLI de Higgsfield como motor de nuestros CLIs (costo en créditos, manifiesto, canario de humo)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
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
- Status real: `Sin empezar. Catálogo leído el 2026-10-03: 39 modelos de video en la CLI higgsfield 1.1.26 más workflows de video; generate cost estima gratis; 4.118 créditos en el plan Ultra; ninguna corrida real de video`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Aplicar la regla del programa —**propio primero, proveedor como puente**— al puente más amplio que tenemos: la CLI
de la app de Higgsfield (`higgsfield`). Un adaptador hace que nuestros CLIs (`pnpm ai:video-bench`, `pnpm ai:inpaint
video`, `pnpm ai:track`, `pnpm ai:video`) puedan usar sus modelos como **motor**, con estimación en créditos antes de
gastar, tope y confirmación, manifiesto, retome por job sin reenvío, y reconciliación del valor del crédito en USD. Así
el puente queda gobernado mientras construimos lo propio, y lo propio puede reemplazarlo sin cambiar a quien lo usa.

## Why This Task Exists

- La CLI de la app de Higgsfield cubre casi todas las operaciones de post que no tienen camino propio (taxonomía
  §3.13): Genjutsu (reemplazar objeto, transferir movimiento), SAM 3 video, recorte con alfa, Topaz y ByteDance
  (upscale, interpolación), deflicker, HDR, reframe generativo, doblaje y cambio de voz; y motores que la API de
  Higgsfield nos rechaza (Veo 3.1). Usarla a mano deja el gasto y la evidencia fuera de nuestros manifiestos.
- No es la API de Higgsfield que ya está en `pnpm ai:fal` (`hf-*`): son otra cuenta, otro catálogo y otra moneda
  (créditos de la suscripción, cuyo valor en USD es [sin dato]).
- Varias tasks del programa necesitan comparar su camino propio contra este puente (TASK-1979 con `sam_3_video`,
  TASK-1983 con Topaz y el recorte, TASK-1984 con Cinema Studio 4.0, TASK-1985 con el doblaje); sin un adaptador común
  cada una lo reimplementaría.

## Goal

- Adaptador `higgsfield-app` reutilizable por los CLIs del programa: `cost` (gratis), `create` con tope y `--yes`,
  `wait`/retome por `job_id`, descarga y registro en el manifiesto.
- Ledger de créditos por job y reconciliación del valor del crédito en USD con `higgsfield account transactions`.
- Mapa operación de la taxonomía → `job_type`/workflow, con parámetros validados (`higgsfield model get`).
- Canario C11 de humo: una corrida por capacidad puente priorizada, con créditos reales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- Taxonomía de video §1 (principio 4), §3.12 (carril `cli-higgsfield`) y §3.13 (camino propio y puente por operación).
- Guía de selección §4.3, bloque «Puente Higgsfield».
- ADR-024: el adaptador es código de proveedor y se queda en Greenhouse (no se gradúa); el mapa de operaciones y la
  normalización del manifiesto siguen la forma de producto del resto del programa.
- Skill `higgsfield-provider` (estado local de la CLI, sesión y trampas); la CLI no es infraestructura de Globe.
- Herramienta out-of-band: nunca importada por `src/app/**` ni por el runtime de `src/lib/**`; la sesión de la CLI es
  del operador, no un secreto de servicio.

## Normative Docs

- `docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md`
- `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md` (§4.3, §5.8, §10.1)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLI_FIRST_GRADUATION_DECISION_V1.md` (ADR-024)
- `.claude/skills/higgsfield-provider/SKILL.md`
- `docs/manual-de-uso/creative-studio/higgsfield-provider.md`

## Dependencies & Impact

### Depends on

- CLI `higgsfield` 1.1.26 con sesión y `workspace set` hecho (estado 2026-09-24, skill `higgsfield-provider`).
- **Clasificación desde el primer archivo (acordado con la sesión del pipeline, 2026-10-03):** el gate de TASK-1976 romperá con cualquier archivo nuevo de `scripts/ai/inpaint/` o `scripts/ai/video/` sin clasificar; este adaptador se declara como adaptador desde el primer archivo.

### Blocks / Impacts

- TASK-1980 (el banco incluye motores del puente), TASK-1979, TASK-1983, TASK-1984 y TASK-1985 (comparan su camino
  propio contra el puente).

### Files owned

- `scripts/ai/video/adapters/higgsfield-app.ts` [nuevo] (proceso `higgsfield … --json`: cost, create, wait, get)
- `scripts/ai/video/adapters/higgsfield-app-map.ts` [nuevo] (operación de la taxonomía → `job_type`/workflow y parámetros)
- `scripts/ai/video/credits-ledger.ts` [nuevo] (créditos por job y valor del crédito reconciliado)
- Docs: guía §4.3 (bloque del puente con lo medido), taxonomía §3.13, skill `higgsfield-provider` y su manual

## Current Repo State

### Already exists

- CLI `higgsfield` instalada (`~/.local/bin/higgsfield`) con sesión; `generate cost|create|wait|get|list`, `upload`,
  `model list|get`, `workflow list|get`, `account status|transactions`, salida `--json`.
- Estimaciones del 2026-10-03: Veo 3.1 8 s 32 créditos · Veo 3.1 lite 8 s 12 · Kling 3.0 5 s 8,75 · Seedance 2.5 5 s
  35 (720p) / 60 (1080p) · Wan 3.0 720p 5 s 8,75 · H3 Max 5 s 12,5.
- Carril de la API de Higgsfield en `pnpm ai:fal` (`scripts/ai/higgsfield-lane.ts`): referencia de patrones (estimación,
  tope), no se reutiliza su cliente HTTP.

### Gap

- Ningún CLI nuestro invoca la CLI de la app; ninguna corrida real de video por esta vía; valor del crédito sin medir.
- Las operaciones sobre un video existente sólo se pueden estimar después de `higgsfield upload`.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ai/video/adapters/**`, ejecutado con `tsx` en el equipo del operador
- Future candidate home: `undecided`
- Future candidate home note: adaptador de proveedor; se queda en Greenhouse (ADR-024 §D2: los adaptadores no se gradúan)
- Boundary: el adaptador sólo lanza el proceso `higgsfield` y normaliza su JSON; no lee ni guarda la sesión; consumidores autorizados: los CLIs de EPIC-051
- Server/browser split: `n/a` (Node CLI; nunca en bundle ni runtime de producto)
- Build impact: `none` (fuera del grafo de Next)
- Extraction blocker: depende de un binario y una sesión locales del operador

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Adaptador y mapa de operaciones

- `higgsfield-app.ts`: `cost`, `create` (con `--json`), `wait`/`get` por `job_id`, descarga de la salida; detección de
  sesión vencida o workspace sin fijar con un mensaje accionable; nunca reenvía tras un timeout (retoma el job).
- `higgsfield-app-map.ts`: mapa de las operaciones de la taxonomía (§3.13, columna puente) a `job_type`/workflow, con
  los parámetros validados contra `higgsfield model get` / `workflow get` en un snapshot fechado.
- Pruebas con un ejecutable falso que imita las respuestas JSON de la CLI (sin red).

### Slice 2 — Créditos: estimación, tope y ledger

- Estimación en créditos antes de gastar; tope por corrida en créditos (`--max-credits`) con `--yes` y autorización
  humana del monto.
- `credits-ledger.ts`: créditos estimados y reales por job (de `account transactions`), y valor del crédito en USD
  cuando haya un dato de facturación del plan; mientras no, la columna dice `[sin dato]`, nunca una cifra inferida.

### Slice 3 — Integración en los CLIs del programa

- Motor `higgsfield-app:<job_type>` disponible en el banco de TASK-1980 y como motor de `pnpm ai:inpaint video` cuando la
  operación lo admita (el pipeline recompone y verifica igual que con fal).
- Si TASK-1980 o los demás CLIs aún no existen, se entrega el adaptador con su CLI mínima de prueba y se conecta cuando
  existan.

### Slice 4 — Canario C11 y documentación

- C11 (tope propuesto 150 créditos, autorización del monto): una corrida por capacidad priorizada — Veo 3.1 lite,
  Kling 3.0, `sam_3_video`, `video_background_remover`, `topaz_video`, `hf_mult_replace_object`, `reframe` y `dubbing`
  a español — con créditos reales y veredicto humano al 100 %.
- Guía §4.3 (de `[contrato]` a `[verificado]` donde corresponda, con créditos reales), taxonomía §3.13, skill
  `higgsfield-provider` y su manual.

## Out of Scope

- Reemplazar la API de Higgsfield de `pnpm ai:fal` (carril distinto, se conserva).
- Marketing Studio, Ads Studio, websites y otros productos de la app que no son operaciones de video de la taxonomía.
- Herramientas que sólo existen en el MCP (sync.so, análisis de video): se usan desde la sesión como puente puntual.
- Construir los caminos propios (son las otras tasks del epic).

## Detailed Spec

- **Contrato del motor:** `{ engine: "higgsfield-app:<job_type>", operation, params, estimatedCredits, jobId,
  actualCredits, creditUsd: number|null, outputs[] }` en el manifiesto del CLI que lo invoca.
- **Códigos:** `0` entregado · `2` FAIL (salida con duración/formato distintos de lo pedido) · `3` REVISAR (créditos
  reales sobre lo estimado más allá de una tolerancia) · `1` error (sin sesión, workspace sin fijar, tope de créditos,
  job fallido).
- **Retome:** el `job_id` se escribe en el manifiesto antes de esperar; un timeout local nunca reencola.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1. Slices 1–2 sin gasto (ejecutable falso + `generate cost`).
2. Slice 3 cuando existan los CLIs consumidores, o con la CLI mínima de prueba.
3. Slice 4 con autorización del monto.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Cambia el JSON o los parámetros de la CLI | Contrato | media | snapshot fechado de `model get`; prueba de contrato con el ejecutable falso | error de validación |
| Sesión vencida en mitad de una corrida | Operación | media | chequeo de sesión antes de encolar; retome por job | código 1 accionable |
| Créditos reales sobre lo estimado | Costo | media | ledger y código 3 | ledger |
| Usar el puente donde ya existe camino propio | Gobierno | baja | el mapa marca la operación como «propio disponible» y el CLI lo avisa | aviso en la salida |

### Feature flags / cutover

N/A — herramienta out-of-band sin runtime de producción ni flags.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| 1–4 | `git revert` del commit del slice | minutos | sí |

### Production verification sequence

N/A — no hay runtime de producción. Verificación: pruebas con el ejecutable falso, `generate cost` y el canario C11.

### Out-of-band coordination required

- Autorización de gasto en créditos del operador para C11; sesión de la CLI vigente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El adaptador estima en créditos sin encolar y se detiene sobre el tope sin `--yes`.
- [ ] Un timeout local retoma el `job_id` del manifiesto y no reencola (probado con el ejecutable falso).
- [ ] El ledger registra créditos estimados y reales por job, y deja el valor en USD como `[sin dato]` hasta tener un dato de facturación.
- [ ] El banco de TASK-1980 (o la CLI mínima de prueba) corre al menos un motor `higgsfield-app:*`.
- [ ] C11 corrido con autorización, créditos reales y veredicto humano al 100 %.
- [ ] Guía §4.3 y taxonomía §3.13 actualizadas con lo medido.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts/ai/video`
- `higgsfield generate cost` y el canario C11
- `pnpm test` y `pnpm build` (gate de cierre; el build con autorización del operador si el equipo está cargado)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Evidencia del canario en `ai-generations/<fecha>_task-1986-canary/README.md`

## Follow-ups

- Adaptador equivalente para la API de Magnific si su canario supera al puente de Higgsfield en alguna operación.
- Retirar del mapa cada operación cuando su camino propio quede con canario de garantía.

## Open Questions

- ¿Cuánto vale en USD un crédito del plan Ultra? Lo resuelve el operador con el dato de facturación del plan; mientras
  tanto el ledger compara sólo en créditos.
