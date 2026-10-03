# TASK-1978 — Un solo motor de expansión: `ai:inpaint expand` con lo mejor de `foto:expandir`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
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
- Epic: `none`
- Status real: `Sin empezar. Reemplaza al Slice 2 de TASK-1973 (que había pasado a TASK-1925). CMP-004 ya está cerrada (44 piezas aprobadas el 2026-10-02), así que no hay campaña en curso que romper`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy hay **dos implementaciones** para llevar una escena a otro formato: `pnpm foto:expandir` (CMP-004, Sunburst,
redibuja) y `pnpm ai:inpaint expand` (TASK-1973, Flux Fill, escena en delta 0). Esta task deja **un solo motor**
—`ai:inpaint expand`— con lo mejor de los dos, y `foto:expandir` pasa a ser un alias que llama a ese motor con los
defaults de campaña, hasta retirarlo. Es el caso piloto de convergencia de ADR-024: dos implementaciones del mismo
problema se resuelven en un núcleo, no copiando.

## Why This Task Exists

- El operador (2026-10-03): «la idea es no tener 2 sino dejar uno robusto con lo mejor de los dos».
- Lo que aporta cada uno:

  | `ai:inpaint expand` | `foto:expandir` |
  |---|---|
  | Verificación delta 0 sobre el archivo escrito | Modo campaña: Sunburst rehace el borde y armoniza (`--reponer no`); reponer el original dejaba un recuadro (CMP-004 S04) |
  | Flux Fill por defecto (no reencuadra; canario 2026-10-03) | Pista: el plate estirado y desenfocado como relleno previo, además del espejo |
  | Detectores de reencuadre, panel plano y costura | Banda libre abajo (`abajo`) para el lecho de la firma |
  | Manifiesto, caché por hash, tope de costo, dry-run | Canon medido 1:1 → 1,91:1: `0.8`, `--lienzo 2048x1072 --ancla derecha --fundido 120` |
  | Adaptadores intercambiables | Prompt de outpainting probado en piezas aprobadas |

- **Contradicción medida a resolver:** `foto:expandir` llama a Sunburst **con máscara** (`ai:image --mask`), la
  combinación que en TASK-1965 devolvió un panel negro en 3 de 3; sin embargo las horizontales de CMP-004 salieron y se
  aprobaron. Antes de fijar defaults hay que saber por qué (ruta distinta de `ai:image`, el tamaño, la pista, o que las
  piezas pasaron por `--reponer no`).

## Goal

- `pnpm ai:inpaint expand` con dos modos de fidelidad:
  - **`--fidelity exact`** (default): escena en delta 0 verificada; Flux Fill.
  - **`--fidelity reharmonize`**: el modelo puede rehacer el borde (o la escena) para borrar la unión; Sunburst; la
    verificación cambia a «cuánto se movió la escena» + revisión obligatoria de caras e identidad al 100 %, y el
    manifiesto lo declara.
- Relleno previo `--prefill mirror|neutral|hint` (`hint` = la pista desenfocada de `foto:expandir`).
- `--reserve-bottom <fracción>` para la banda libre del lecho de la firma.
- `pnpm foto:expandir` = alias con sus flags actuales traducidos al motor, y aviso de retiro.
- Regresión contra dos horizontales 1,91:1 aprobadas de CMP-004.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- ADR-024 (`docs/architecture/creative-studio/EFEONCE_GLOBE_CLI_FIRST_GRADUATION_DECISION_V1.md`): un núcleo, nunca dos
  implementaciones; ésta es su convergencia piloto (§4 Estructurales, §8 Roadmap 4).
- Pipeline de inpainting (`docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` §Pipeline de inpainting).
- Canon de formatos de pauta: `.claude/skills/efeonce-advertising-creative/references/paid-format-safe-zones-and-craft.md`
  §0b/§0c (receta aprobada de `foto:expandir`, que se conserva como default del modo campaña).
- Si TASK-1976 ya cerró, el núcleo de expansión respeta su manifiesto y su gate.

## Normative Docs

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLI_FIRST_GRADUATION_DECISION_V1.md`
- `docs/campaigns/decisions/CDR-012-cmp004-reorientacion-por-servicios.md`
- `docs/manual-de-uso/ai-tooling/expandir-y-separar-en-capas.md`
- `ai-generations/2026-10-03_task-1973-canary/README.md` (comparación de modelos para expandir)

## Dependencies & Impact

### Depends on

- TASK-1973 cerrada (`ai:inpaint expand`).
- Nada bloqueante; preferible después de TASK-1976.

### Blocks / Impacts

- TASK-1925 (migración al taller): migra un solo motor en vez de dos.
- Recetas y skills que citan `pnpm foto:expandir` (efeonce-advertising-creative, design-studio, brand-photography rule).

### Files owned

- `scripts/ai/inpaint/expand.ts`, `scripts/ai/inpaint/expand-run.ts`, `scripts/ai/inpaint/cli.ts` (modos y flags)
- `scripts/foto/expandir.mjs` (pasa a alias)
- Docs: manual de expandir, spec §Pipeline de inpainting, guía de selección, skills que citan `foto:expandir` (+ espejos)

## Current Repo State

### Already exists

- `ai:inpaint expand` (TASK-1973): `--to`, `--canvas`, `--scale`, `--anchor`, `--blend`, `--prefill mirror|neutral`,
  default `fal:flux-pro-fill`, aviso al elegir GPT Image, verificación delta 0.
- `foto:expandir` (`scripts/foto/expandir.mjs`, commit `2ff39fe96`): `<plate> <salida> <escala> "<relleno>" [abajo]`,
  `--lienzo WxH`, `--ancla derecha|izquierda|centro`, `--fundido px` (default 18; 80–140), `--reponer no`; pista
  desenfocada; Sunburst `high` con máscara vía `pnpm ai:image`; guarda la salida del modelo como `<salida>-relleno.png`
  y no la regenera si existe.
- 44 piezas de CMP-004 aprobadas y canonizadas (CDR-012); finales en OneDrive `5. Contenidos/15. Paid Media/03. Finales/`.

### Gap

- Dos motores con contratos distintos; `foto:expandir` sin verificación, manifiesto ni detectores.
- La contradicción Sunburst + máscara sin explicar.
- Sin modo «reharmonize» gobernado en el pipeline.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ai/inpaint/**` y `scripts/foto/expandir.mjs`, ejecutados con `tsx`/`node` en el equipo del operador
- Future candidate home: `undecided`
- Future candidate home note: el núcleo de expansión es candidato a `@efeoncepro/creative-core` (ADR-024 §D5)
- Boundary: un solo núcleo de expansión (`expand.ts`); `foto:expandir` sólo traduce flags y llama al motor; consumidores autorizados: CLIs `ai:inpaint expand` y `foto:expandir`
- Server/browser split: `n/a` (Node CLI; nunca en bundle ni runtime de producto)
- Build impact: `none` (fuera del grafo de Next)
- Extraction blocker: adaptadores sobre `@/lib/ai/*`, igual que el resto del pipeline

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Resolver la contradicción Sunburst + máscara

- Leer el camino de `ai:image --mask` (qué manda a OpenAI) contra el adaptador `openai` de `ai:inpaint`, y reproducir
  una horizontal aprobada de CMP-004 por las dos rutas en dry-run. Si hace falta generar, canario autorizado.
- Documentar la causa y elegir el modelo y el envío de máscara del modo `reharmonize` por evidencia.

### Slice 2 — Núcleo: pista, banda inferior y fundido

- `expand.ts`: `prefill: 'hint'` (plate estirado y desenfocado; variante de cambio de lienzo con `extendWith: 'copy'`),
  `reserveBottom`, y el fundido ancho con la franja interior que rehace el modelo; pruebas sin disco.

### Slice 3 — Modo `--fidelity reharmonize`

- En `expand-run.ts`: entrega la salida del modelo (o una recomposición con fundido ancho) en vez de la escena
  original; verificación nueva: delta medio y máximo de la escena, reporte de la zona de caras (si hay máscara de
  sujeto) y aviso obligatorio de revisión al 100 %. Código 3 si la escena se movió más de un umbral declarado.

### Slice 4 — `foto:expandir` como alias

- `scripts/foto/expandir.mjs` traduce `escala`, `relleno`, `abajo`, `--lienzo`, `--ancla`, `--fundido` y `--reponer` al
  motor (`--fidelity reharmonize` cuando `--reponer no`), conserva rutas de salida y avisa que se retirará.

### Slice 5 — Regresión con CMP-004 y documentación

- Dos horizontales 1,91:1 aprobadas: lienzo, máscara y pista **idénticos byte a byte**; con su `-relleno.png` guardado,
  la recomposición también idéntica (`--reponer si`) o equivalente documentada (`--reponer no`).
- Manual, spec, guía y skills que citan `foto:expandir` (+ espejos).

## Out of Scope

- Regenerar o recertificar piezas aprobadas de CMP-004.
- Retirar `foto:expandir` (sólo alias con aviso; el retiro es una decisión posterior).
- BFL FLUX Outpainting (follow-up de TASK-1973).
- Migración al taller (TASK-1925).

## Detailed Spec

- **Cuándo cada modo:** `exact` cuando la foto no se puede tocar (personas reales, producto, marca) y la unión puede
  resolverse con el fundido; `reharmonize` cuando la unión se nota y la pieza acepta que el modelo rehaga el borde —el
  flujo con que se aprobó CMP-004—, siempre con revisión de caras al 100 %.
- **Verificación de `reharmonize`:** no promete delta 0; mide cuánto cambió la escena (media y máximo por zona) y lo
  escribe en el manifiesto, para que un operador vea lo que el modelo tocó.
- **Compatibilidad:** las recetas que hoy citan `pnpm foto:expandir … 0.8 "<relleno>" 0.04 --lienzo 2048x1072 --ancla
  derecha --fundido 120 --reponer no` siguen funcionando idénticas por el alias.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1. Slice 1 primero: sin explicar la contradicción no se eligen defaults.
2. Slices 2–3, después 4 (el alias sólo cuando el motor cubre todo).
3. Slice 5 al final.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| El alias cambia una pieza de campaña | Recetas de marca | media | regresión byte a byte con salidas guardadas; CMP-004 cerrada | diff de lienzo/máscara/salida |
| `reharmonize` altera caras sin que nadie lo vea | Identidad | media | revisión al 100 % obligatoria + delta por zona en el manifiesto | código 3 sobre el umbral |
| Defaults mal elegidos por la contradicción no resuelta | Calidad | media | Slice 1 antes que todo | evidencia documentada |

### Feature flags / cutover

N/A — herramienta out-of-band; el cutover es el alias de `foto:expandir`, reversible con un revert.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| 1–5 | `git revert` del commit del slice (el alias vuelve a ser el script original) | minutos | sí |

### Production verification sequence

N/A — no hay runtime de producción. Verificación local: suite del pipeline, regresión con CMP-004 y dry-runs.

### Out-of-band coordination required

- Avisar a la sesión que opere campañas de marca antes de convertir `foto:expandir` en alias.
- Autorización de gasto si el Slice 1 necesita generar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La contradicción Sunburst + máscara entre `ai:image` y `ai:inpaint` está explicada con evidencia y el modo `reharmonize` elige modelo y envío de máscara por esa evidencia.
- [ ] `ai:inpaint expand` acepta `--fidelity exact|reharmonize`, `--prefill hint` y `--reserve-bottom`, con pruebas.
- [ ] En `reharmonize` el manifiesto registra cuánto cambió la escena y el comando exige revisión al 100 % (código 3 sobre el umbral).
- [ ] `pnpm foto:expandir` con sus flags actuales llama al motor y conserva sus rutas de salida.
- [ ] La regresión con dos horizontales aprobadas de CMP-004 da lienzo, máscara y pista idénticos byte a byte.
- [ ] No queda lógica de expansión duplicada fuera de `scripts/ai/inpaint/expand*.ts`.
- [ ] Manual, spec, guía y skills que citan `foto:expandir` (+ espejos) describen el motor único.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts/ai/inpaint scripts/foto`
- Regresión con CMP-004 (Slice 5)
- `pnpm test` y `pnpm build` (gate de cierre; el build con autorización del operador si el equipo está cargado)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] TASK-1925 y ADR-024 apuntan a esta task como la convergencia

## Follow-ups

- Retirar `foto:expandir` cuando ninguna receta lo cite.
- Comparar con BFL FLUX Outpainting cuando exista la cuenta (follow-up de TASK-1973).

## Open Questions

- ¿El umbral de «la escena se movió demasiado» en `reharmonize` es global o por formato? Propuesta: global con
  override por receta, calibrado en la regresión de CMP-004.
