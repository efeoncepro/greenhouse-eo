# TASK-1988 — Kit propio de motion de UI y sincronía por acción (`pnpm video:ui`)

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
- Status real: `Sin empezar. Receta HTML + Playwright validada en el spot AEO Grader (2026-07-05); pnpm fe:capture graba la UI real del portal; sin kit reutilizable`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convertir en un comando propio lo que hoy se hace a mano en cada pieza de producto digital: tomar una **captura real**
(`pnpm fe:capture`) o un **render en código** (HTML + Playwright) de una interfaz y aplicarle, de forma determinística,
**cursor, tap, scroll, typing, zoom a una zona, llamadas y marco de dispositivo**, guiado por un **guion de interfaz**;
y **detectar el cuadro del contacto del gesto** en un plano de persona para cortar en la acción hacia el inserto de UI.
Cierra los huecos H19 y H20 del anexo y es el camino propio de los planos P6, P7 y P9.

## Why This Task Exists

- Es el género que más se va a producir (personas usando producto digital) y la UI exacta siempre sale de nuestras
  herramientas (anexo §1): hoy cada pieza la arma a mano.
- La sincronía gesto→UI es el problema propio del género y ningún motor acierta un cuadro exacto; se resuelve con
  montaje (corte en la acción), pero detectar el cuadro del contacto es manual.
- Una UI en código se localiza a costo 0: es el multiplicador del género (anexo §3.8).

## Goal

- `pnpm video:ui <guion.json>`: produce el inserto P6 (y paneles P7) desde captura o render, con eventos en cuadros
  exactos, manifiesto y export.
- `pnpm video:ui sync --person p5.mp4 --insert p6.mp4`: detecta el cuadro del contacto en P5 y arma el corte en la acción.
- Canario C13 con nuestro portal en un tenant de ejemplo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- Anexo de producto e interfaces §3 (gramática P1–P10, verbos, guion de interfaz, formatos, localización, QA).
- Taxonomía: `demo-ui/*`, `finish.overlay`, `assemble.edit`; regla «propio primero».
- Regla del operador: pantallas dentro de una escena las renderiza el modelo; este kit produce la UI exacta **fuera**
  del dispositivo (inserto, flotante, pantalla dividida).
- Workflow `ui-without-after-effects` (validado) y captura GVC (`GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`).

## Normative Docs

- `docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCT_AND_INTERFACE_V1.md`
- `docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `.claude/skills/motion-design-studio/workflows/ui-without-after-effects.md`
- `docs/manual-de-uso/creative/componer-recursos-aeo-con-axis.md` (UI de terceros gobernada)

## Dependencies & Impact

### Depends on

- `pnpm fe:capture` (GVC) y Playwright instalados; `pnpm media:web-video` para el empaquetado web.
- TASK-1981 (montaje por EDL y export con hash) si ya existe; si no, el corte en la acción se entrega con su propio
  ensamble mínimo y TASK-1981 lo absorbe.
- **Clasificación desde el primer archivo (acordado con la sesión del pipeline, 2026-10-03):** todo módulo nuevo bajo `scripts/ai/inpaint/` o `scripts/ai/video/` se declara núcleo, orquestación o adaptador desde el primer archivo, para el gate por manifiesto de TASK-1976.

### Blocks / Impacts

- TASK-1985 (lipsync) y el formato «asistente conversacional» usan los paneles P7.
- C13 de EPIC-051.

### Files owned

- `scripts/ai/video/ui/script.ts` [nuevo] (núcleo: guion de interfaz → timeline de eventos en cuadros)
- `scripts/ai/video/ui/overlays.ts` [nuevo] (núcleo: cursor, tap, zoom, llamadas, marco de dispositivo como capas)
- `scripts/ai/video/ui/sync.ts` [nuevo] (núcleo: detección del cuadro de contacto y plan de corte)
- `scripts/ai/video/ui/run.ts` [nuevo] (orquestación: Playwright/GVC, ffmpeg)
- `scripts/ai/video/ui/cli.ts` [nuevo] (`pnpm video:ui`)
- `package.json` (script `video:ui`)
- Docs: anexo §3 y §4, manual nuevo `docs/manual-de-uso/ai-tooling/motion-de-interfaces.md`

## Current Repo State

### Already exists

- Receta HTML + Playwright con timeline determinístico (spot AEO Grader, validado 2026-07-05).
- `pnpm fe:capture` graba rutas reales del portal con agent auth, con escenarios declarativos.
- Compositor de recursos AEO (UI de ChatGPT/Gemini gobernada) y HyperFrames.

### Gap

- No hay comando que aplique cursor, tap, scroll, typing, zoom y llamadas sobre una captura o render desde un guion.
- No hay detección del cuadro de contacto ni plan de corte en la acción.
- No hay marcos de dispositivo reutilizables para P6/P9.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ai/video/ui/**`, ejecutado con `tsx` en el equipo del operador
- Future candidate home: `undecided`
- Future candidate home note: `script.ts`, `overlays.ts` y `sync.ts` candidatos a `@efeoncepro/axis-creative-core`; la captura GVC se queda en Greenhouse
- Boundary: núcleo puro (timelines, capas, detección sobre buffers); Playwright, GVC y ffmpeg sólo en `run.ts`; consumidores autorizados: `pnpm video:ui` y las tasks de EPIC-051
- Server/browser split: `n/a` (Node CLI; nunca en bundle ni runtime de producto)
- Build impact: `none` (fuera del grafo de Next)
- Extraction blocker: la captura depende de GVC y del agent auth del portal

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Guion de interfaz y timeline

- Formato del guion (`guion.json`): beats `{plano, estado de la UI, acción, duración, cuadro del evento}`, fuente de la
  UI (`fe:capture` con escenario, o HTML), idioma; validación y timeline en cuadros.

### Slice 2 — Capas de interacción

- Cursor sintético con estados (hover, press), tap con anillo, scroll a velocidad legible, typing con sostén de lectura,
  zoom a una zona, llamadas y marco de dispositivo opcional; todo determinístico sobre la captura o el render.

### Slice 3 — Inserto P6, flotante P7 y pantalla dividida P9

- Export de cada plano con alfa donde corresponda (P7), manifiesto y hash; versiones por idioma desde el mismo guion.

### Slice 4 — Corte en la acción

- `sync.ts`: detecta el cuadro de contacto en el plano de persona (movimiento de la mano hacia la superficie y su
  detención; revisión humana si la confianza es baja → código 3) y arma el corte a P6 con el evento en el cuadro 0.

### Slice 5 — Canario C13 y documentación

- C13 (autorización del monto): feature spotlight de 15 s con nuestro portal en tenant de ejemplo; P2 y P5 generados
  (Wan 3.0 o el motor que pase el banco), P6 con este kit; comparar contra pantalla nativa «video-safe» en P3/P4.
- Anexo §3/§4, manual nuevo, workflow `ui-without-after-effects` (+ espejo).

## Out of Scope

- Reemplazar pantallas dentro de una escena generada (regla del operador: las renderiza el modelo).
- Diseñar la UI (`greenhouse-ux`, `modern-ui`): el kit anima una UI ya existente.
- Modelos 3D de dispositivos (P10): follow-up.

## Detailed Spec

- **Garantía:** la UI del inserto es la captura o el render exacto; cada evento cae en su cuadro; el corte en la acción
  queda a ≤ 2 cuadros del contacto `[criterio, a calibrar en C13]`.
- **Códigos:** `0` PASS · `2` FAIL (duración o fps distintos del guion) · `3` REVISAR (contacto no detectado con
  confianza, texto bajo el tamaño mínimo legible, safe zone invadida) · `1` error.
- **Costo:** 0 créditos en el kit; el plano de persona cuesta lo que su motor.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1. Los slices sin gasto primero; el canario sólo con autorización del monto en chat.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| La detección del contacto falla | Sincronía | media | código 3 + marca manual del cuadro | manifiesto |
| UI con datos reales en la captura | Privacidad | baja | sólo tenant de ejemplo; chequeo en el guion | revisión |
| Texto ilegible a tamaño de feed | Calidad | media | tamaño mínimo medido; código 3 | manifiesto |

### Feature flags / cutover

N/A — herramienta out-of-band sin runtime de producción ni flags.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| todos | `git revert` del commit del slice | minutos | sí |

### Production verification sequence

N/A — no hay runtime de producción. Verificación: pruebas del núcleo, dry-runs y el canario.

### Out-of-band coordination required

- Autorización de gasto para los planos generados de C13; tenant de ejemplo del portal disponible para la captura.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm video:ui <guion.json>` produce P6 desde una captura real del portal con cursor, tap, scroll y zoom en cuadros exactos.
- [ ] El mismo guion produce versiones en dos idiomas sin regenerar nada.
- [ ] `sync` detecta el cuadro de contacto en un plano de persona o sale con código 3, y arma el corte en la acción.
- [ ] C13 corrido con autorización, con legibilidad, sincronía y veredicto humano al 100 %.
- [ ] El núcleo no importa `@/`, disco ni red; manual y anexo actualizados.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts/ai/video/ui`
- Corrida de punta a punta sin gasto (sólo UI) y canario C13
- `pnpm test` y `pnpm build` (gate de cierre; el build con autorización del operador si el equipo está cargado)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Evidencia del canario en `ai-generations/<fecha>_task-1988-canary/README.md`

## Follow-ups

- Biblioteca de modelos 3D de dispositivos para P10.
- Plantillas por formato narrativo (anexo §3.6).

## Open Questions

- ¿El corte en la acción basta para la percepción de un gesto continuo, o hace falta además un leve desenfoque de movimiento en el empalme? Se decide con C13.
