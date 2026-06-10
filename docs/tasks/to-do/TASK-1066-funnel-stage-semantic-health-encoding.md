# TASK-1066 — Funnel stage semantic-health color encoding

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|design-system|delivery`
- Blocked by: `none`
- Branch: `task/TASK-1066-funnel-stage-semantic-health-encoding`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hacer que el `GreenhouseFunnelChartCard` codifique **salud operativa por etapa** en el canal de color dominante (el fill del chevron) en vez de **rol de etapa** (decorativo). Las etapas se tiñen con un semáforo semántico discreto — `healthy` / `alert` / `critical` / `neutral (sin-dato)` — con **baseline neutro y escalado solo del problema**, de modo que el operador escanea el rail y el ojo va directo a la etapa en rojo/ámbar. Incluye un resolver de salud determinístico (umbrales reales: bloqueos, fuga de retención, SLA, freshness) + un rollup de salud a nivel pipeline. El color es downstream de la política; la política es el verdadero entregable.

## Why This Task Exists

Hoy el fill del chevron de cada etapa se tiñe por **rol** (`resolveStageRoleColor`: intake=azul, production=verde, quality=azul, rework=ámbar, delivery=verde) — un agrupador decorativo. La **salud** (`stage.health`) vive solo en un `GreenhouseStatusDot` secundario. Esto desperdicia el canal perceptual más fuerte (posición/área/fill domina sobre un dot chico — Cleveland & McGill) en un chart cuyo propósito #1 es triage operativo ("¿dónde está el problema?").

Además genera dos defectos honestos ya detectados en review visual del CSC pipeline:
1. **Dos sistemas de color compiten** sobre el mismo rail (fill=rol + dot=salud) sin que ninguno sea el primario.
2. El tono del dot (salud de etapa) está **desacoplado** del número que tiene al lado (retención): Entrega muestra dot verde junto a "29.7%", que se lee como "29.7% está bien" cuando el verde es *salud*, no *calidad del %*.

`stage.health` además es hoy **provisto a mano por el consumer** (el lab lo hardcodea); no existe una función determinística que lo derive de métricas reales — así que aunque pintáramos por salud, mentiríamos. El trabajo de fondo no es el color: es la **política de salud**.

Surge de un review de diseño en vivo sobre el primitive (sesión 2026-06-09) tras la fusión de la banda de alerta (Opción A). Decisión del operador: "hacerlo inteligente con una escala de semánticos".

## Goal

- El `GreenhouseFunnelChartCard` en `variant=operationalPipeline` codifica salud por etapa en el fill, con **tiers discretos** (no gradiente) y **baseline neutro / escalado solo del problema** (sano = calmo, alerta/crítico = pop).
- Existe un resolver de salud determinístico y **overridable** que deriva el tier desde los campos del stage (bloqueos, retención, SLA, freshness) + un rollup de salud a nivel pipeline.
- Cero degradación de honestidad: sin-dato = `neutral` gris, NUNCA verde; color nunca como único canal (ícono + label por tier); la selección se encoda en un canal **no-color** (ring/borde/elevación) para no chocar con el semáforo.
- Reusa tokens semánticos AXIS / Chart SoT existentes — no inventa hex; reconcilia con `DESIGN.md` semáforo (Óptimo/Atención/Crítico) y TASK-1053 Chart SoT.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `DESIGN.md` — sistema semáforo (Óptimo `#6ec207` / Atención `#ff6500` / Crítico `#bb1954`) + reserva de colores semánticos para *estados* (no para diferenciar CTAs).
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` — paleta semántica, ramps AXIS (success/warning/error 100→900), reglas de color.
- `docs/architecture/ui-platform/PRIMITIVES.md` — contrato de primitives (este chart card vive en el registry de primitives).
- `docs/architecture/ui-platform/HISTORIAL.md` — Delta cronológico de la plataforma UI.
- Skills de diseño aplicables (loop obligatorio de UI): `dataviz-design` (encoding por la pregunta + Cleveland & McGill + color colorblind-safe), `modern-ui` (restraint: baseline neutro, escalar solo el problema), `greenhouse-ux` (semáforo + tokens), `a11y-architect` (color nunca solo + forced-colors).

Reglas obligatorias:

- **NUNCA** color como único canal de estado. Cada tier lleva color + ícono + label (WCAG 1.4.1 + greenhouse-ux semáforo).
- **NUNCA** mostrar verde a una etapa sin datos. `neutral`/gris = "sin verificar"; verde = "verificado sano" (state-design honest degradation).
- **NUNCA** inventar hex. Los tiers se resuelven desde `theme.palette.{success,warning,error}` / ramps AXIS / Chart SoT (TASK-1053). NO hardcodear (`greenhouse/no-hardcoded-hex-color`).
- **NUNCA** un gradiente continuo de "rojos por qué tan malo". Tiers discretos nombrados; sub-tier solo como paso nombrado del ramp si emerge necesidad.
- **NUNCA** la salud se pinta tan saturada en todas las etapas que el rail se vuelve un arcoíris. Baseline calmo, color que pop-ea solo en `alert`/`critical`.
- **NUNCA** la selección de etapa colisiona con el color de salud: la selección migra a un canal distinto (ring/borde/elevación), no a "fill más fuerte".
- Verificación visual con **GVC** (light + dark, desktop + mobile) mirada, en loop, antes de declarar listo.

## Normative Docs

- `docs/tasks/complete/TASK-1053-feedback-semantic-color-system-direction-d.md` — Chart SoT "Deep-bright" + semánticos AA (los tiers de salud deben reconciliar con esto, no competir).
- `~/.claude/skills/dataviz-design/SKILL.md` — chart-by-question + perceptual ranking + secondary encoding.

## Dependencies & Impact

### Depends on

- `src/components/greenhouse/primitives/GreenhouseFunnelChartCard.tsx` — primitive existente (untracked/nascent al momento de crear la task) `[verificar estado git al tomar]`.
- `src/components/greenhouse/primitives/greenhouse-funnel-chart-controller.ts` — SoT del chrome/variant/geometría del funnel.
- Tokens semánticos del theme (`theme.palette.{success,warning,error}`, `theme.axis.ramp.*`) — ya existentes.

### Blocks / Impacts

- **TASK-1059 / TASK-1061 / TASK-1063** (Organization Workspace enterprise detail runtime + tokenization) — son los consumers reales del funnel card (CSC delivery pipeline). El cambio de encoding impacta cómo se ve esa card en el runtime de la organización. **Coordinar**: TASK-1061 gobierna la tokenización del chart en org-workspace; esta task debe alinear el contrato de salud con esa capa, no duplicarlo.
- Cualquier otro consumer futuro del `GreenhouseFunnelChartCard` (commercialLifecycle, quoteToCash, onboardingActivation kinds).

### Files owned

- `src/components/greenhouse/primitives/GreenhouseFunnelChartCard.tsx`
- `src/components/greenhouse/primitives/greenhouse-funnel-chart-controller.ts`
- `src/components/greenhouse/primitives/__tests__/GreenhouseFunnelChartCard.test.tsx`
- `src/components/greenhouse/primitives/__tests__/greenhouse-funnel-chart-controller.test.ts` `[verificar si existe; crear si no]`
- `src/views/greenhouse/admin/design-system/ChartsLabView.tsx` — demo del modo salud + fixtures healthy/alert/critical/sin-dato
- `docs/architecture/ui-platform/PRIMITIVES.md` — contrato (variant/colorMode/tier scale)
- `docs/architecture/ui-platform/HISTORIAL.md` — Delta
- `scripts/frontend/scenarios/design-system-charts.scenario.ts` — scenario GVC (extender si hace falta para capturar el modo salud + dark)

## Current Repo State

### Already exists

- `GreenhouseFunnelChartCard` con `variant=operationalPipeline` / `kind=cscPipeline`, rail chevron SVG, selección de etapa, matriz de diagnósticos, `GreenhouseStatusDot`, summary sr-only, reduced-motion.
- `resolveStageHealth(stage)` (helper privado en el `.tsx`, líneas ~221) que hoy solo hace fallback `stage.health ?? diagnostic.blockersTone ?? diagnostic.freshnessTone ?? 'neutral'` — **no** umbraliza retención ni SLA.
- `resolveStageRoleColor(role, theme)` (líneas ~364) que tiñe el fill por rol vía `theme.axis.ramp`.
- `GreenhouseFunnelStageHealth = 'success'|'warning'|'error'|'info'|'neutral'` (tipo del diagnostic tone).
- Lab vivo en `/admin/design-system/charts` (`ChartsLabView.tsx`) con `cscPipelineStages` hardcodeados (incluye `health` por etapa).
- Scenario GVC `design-system-charts` (desktop/wide/mobile).

### Gap

- El fill del chevron está atado a **rol**, no a salud.
- No existe una **política de salud determinística** (umbrales SLA/bloqueos/retención/freshness) — `stage.health` es provisto a mano por el consumer.
- No existe **tier scale semántico** con tratamiento "baseline neutro / escalar solo el problema" (hoy `resolveStageRoleColor` aplica un tinte uniforme por rol).
- No existe **rollup de salud a nivel pipeline** (la pregunta "¿el pipeline está fuera de valores adecuados?").
- La selección se encoda hoy con fill más fuerte + halo → colisionaría con un fill por salud.
- El `GreenhouseStatusDot` de salud quedaría redundante si el fill ya codifica salud (un signal, dos lugares).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Health policy resolver (foundation, en el controller)

- En `greenhouse-funnel-chart-controller.ts`: definir el **tier scale** canónico `FunnelStageHealthTier = 'healthy' | 'alert' | 'critical' | 'neutral'` + un mapa declarativo `tier → { paletteKey, iconClassName, label }` (sano/atención/crítico/sin-dato) reusando tokens semánticos.
- Función pura `resolveStageOperationalHealth(stage, thresholds?) → FunnelStageHealthTier`: si `stage.health` viene explícito (override del consumer), respetarlo (mapeo `success→healthy`, `warning→alert`, `error→critical`, `neutral/info→neutral`). Si no, derivar del tier desde los campos del stage con umbrales declarativos: bloqueos > N → escala; fuga de retención (drop vs paso anterior) > X% → escala; SLA excedido → escala; freshness viejo → escala; sin datos suficientes → `neutral` (honesto, NUNCA healthy por defecto).
- Config de umbrales `FUNNEL_HEALTH_THRESHOLDS` (frozen, overridable por prop) — declarativa, no hardcode disperso.
- Función pura `resolvePipelineHealth(stages) → FunnelStageHealthTier` (worst-of con piso neutro si falta cobertura).
- Tests del resolver (`greenhouse-funnel-chart-controller.test.ts`): cada tier por cada disparador + override explícito + caso sin-dato → neutral + rollup worst-of.

### Slice 2 — Semantic-health color encoding en el rail (la pieza visual)

- Agregar prop `colorMode?: 'role' | 'health'` al `GreenhouseFunnelChartCard`. Default por `variant`: `operationalPipeline → 'health'` (declarar como Open Question si el operador prefiere opt-in).
- Cuando `colorMode='health'`: el fill del chevron lo resuelve un nuevo `resolveStageHealthFill(tier, theme, { selected })` con contrato **baseline neutro, escalar solo el problema**: `healthy` = neutro/verde muy suave; `alert` = ámbar que pop-ea; `critical` = rojo que pop-ea; `neutral` = gris. El rol se conserva en el **ícono/label**, no en el fill.
- Mover la **selección** a un canal no-color (ring/borde/elevación vía `theme.greenhouseElevation` o outline) que conviva con cualquier tier.
- **Un signal, un lugar**: cuando `colorMode='health'`, eliminar/reconvertir el `GreenhouseStatusDot` de salud del rail (p.ej. el dot pasa a mostrar el % de retención en tono neutro, o se quita) para no duplicar la señal.
- a11y por tier: el `aria-label` del botón de etapa incluye el tier de salud en texto ("Cambios: 22, 34.4% retenido, salud crítica"); ícono de tier visible; verificar `@media (forced-colors: active)`.
- GVC light + dark, desktop + mobile, mirada en loop.

### Slice 3 — Pipeline-level health rollup

- Badge de salud del pipeline en el header de la card (un solo indicador, derivado de `resolvePipelineHealth`) — responde "¿este pipeline está fuera de valores adecuados?".
- Opcional: si hay `insight`, derivar su `tone` por defecto del rollup cuando el consumer no lo provee (sin pisar un tone explícito).
- Tests + GVC.

### Slice 4 — Lab + contrato + docs

- `ChartsLabView.tsx`: demo del `colorMode='health'` con al menos 3 fixtures contrastantes (un pipeline sano, uno en alerta, uno crítico + una etapa sin-dato) para que el lab muestre el escalado.
- `PRIMITIVES.md`: documentar el contrato (variant, `colorMode`, tier scale, neutral-baseline rule, selección no-color, override de `health`, thresholds). `HISTORIAL.md`: Delta.
- Scenario GVC actualizado si hace falta para cubrir health + dark.

## Out of Scope

- **La política de salud específica de dominio (CSC/ICO real)** — esta task entrega un resolver **genérico + overridable** que usa los campos ya presentes en el stage. La política con umbrales reales por kind (CSC contra SLA/RpA/cycle-time reales del ICO Engine) es un **consumer concern** y va en TASK-1063/1061 o en una follow-up de delivery; NO se hardcodean umbrales de negocio dentro del primitive.
- **Cambiar la forma del chevron para que el ancho/área codifique volumen** (el debate "funnel real vs riel de etapas") — es una decisión de diseño separada; esta task no toca la geometría del rail.
- **Migrar otros charts** al esquema de salud (esto es específico del funnel primitive).
- **Tocar la matriz de diagnósticos inferior** (Bloqueos/Owner/Freshness × etapa) más allá de lo necesario para no duplicar señal.
- Reconciliación del double-label "Retención" (KPI global vs panel) — refinamiento de copy separado, no parte del encoding.

## Detailed Spec

Razonamiento de diseño canonizado en el review (fundamento, para el agente que la tome):

1. **Tiers discretos, no gradiente.** El humano no distingue "rojo 73% malo" de "rojo 61% malo". Semáforo de 3 estados + neutro. Sub-tier solo como paso nombrado de ramp si emerge necesidad real.
2. **Baseline neutro, escalar solo el problema.** El error amateur es pintar todo saturado → arcoíris → nada pop-ea. Patrón Datadog/Grafana/Linear: sano = calmo (casi neutro / verde muy suave), alerta/crítico = pop. El rojo de la etapa rota tiene que ser lo único que jale el ojo.
3. **Un signal, un lugar.** Si el fill = salud, sacar/reconvertir el dot de salud y mover rol al ícono/label. No duplicar.
4. **La política de salud va primero; el color es downstream.** Sin función determinística (umbrales), pintar por salud = mentir.
5. **Neutral honesto.** Sin-dato/`na` = gris, nunca verde. Verde = verificado sano.
6. **a11y.** Color nunca solo: ícono + label de tier por etapa. forced-colors respetado.
7. **Selección en canal no-color.** Ring/borde/elevación, para no chocar con el semáforo.
8. **Dos planos de salud.** Por etapa (los fills) + rollup global (un badge en el header / tone del insight). Distintos.

Anti-arcoíris (referencia visual):

```
✗ traffic-light rail:  [verde fuerte][verde fuerte][ámbar][ROJO][verde fuerte]   ← ruidoso
✓ enterprise:          [ neutro·✓ ][ neutro·✓ ][ámbar!][ROJO!][ neutro·✓ ]      ← el ojo va al rojo
```

## Rollout Plan & Risk Matrix

Cambio aditivo a un **primitive UI consumido solo por el lab interno y por el runtime org-detail en progreso (TASK-1059/1063)** — sin path de producción crítico (no toca SCIM/SSO/payroll/finance/release/identity/cron/outbox/migrations). Sin DB, sin runtime backend.

### Slice ordering hard rule

- Slice 1 (resolver de salud + tier scale) **DEBE** cerrar antes que Slice 2 (encoding visual): el color depende del tier resuelto.
- Slice 2 antes que Slice 3 (el rollup reusa el tier scale + resolver).
- Slice 4 (lab + docs) cierra último (documenta lo construido).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Regresión visual en la card CSC del org-detail runtime (TASK-1059/1063) | UI | medium | `colorMode` con default acordado + coordinación con TASK-1061; GVC baseline mockup→runtime antes de mergear | GVC diff / review visual |
| Semáforo rojo/verde falla en daltonismo si queda color-only | UI / a11y | medium | ícono + label por tier horneados; verificar con DevTools vision-deficiency + forced-colors | `quality.keyboard`/rubric GVC + axe |
| "Falso verde" por sin-dato tratado como healthy | UI / honestidad | medium | resolver devuelve `neutral` ante datos insuficientes; test anti-regresión explícito | test del resolver |
| Selección colisiona con el color de salud (no se distingue la etapa elegida) | UI | low | selección migrada a ring/borde/elevación (canal no-color) | GVC selected-state frame |
| Hardcode de hex al introducir tiers | design-system | low | usar `theme.palette.*`/AXIS ramps; lint `greenhouse/no-hardcoded-hex-color` | lint CI |

### Feature flags / cutover

Sin env/DB flag. El control de rollout es la prop `colorMode` del primitive (`'role'` preserva el comportamiento actual; `'health'` activa el nuevo encoding). Cutover inmediato por consumer. Default por variant a definir con el operador (Open Question).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (helpers puros, sin consumidores hasta Slice 2) | <5 min | sí |
| Slice 2 | setear `colorMode='role'` en consumers / revert PR | <5 min | sí |
| Slice 3 | ocultar badge / revert PR | <5 min | sí |
| Slice 4 | revert PR (lab/docs) | <5 min | sí |

### Production verification sequence

1. `pnpm lint && pnpm tsc --noEmit && pnpm test` local verde (incl. tests nuevos del resolver).
2. `pnpm fe:capture design-system-charts --env=local` → mirar frames light+dark, desktop+mobile; verificar baseline neutro + pop del rojo + tier ícono/label + selección distinguible.
3. Coordinar con TASK-1061/1063 el default `colorMode` para la card del org-detail; correr GVC del consumer real (org detail) antes de mergear.
4. Sin paso de prod-backend (UI primitive). Monitoreo = review visual del runtime org-detail cuando ese consumer ship.

### Out-of-band coordination required

- Coordinación con **TASK-1061** (org-workspace tokenization / chart SoT) y **TASK-1063/1059** (org-detail runtime) sobre el default de `colorMode` y la paridad visual mockup→runtime. Repo-only; sin sistemas externos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `resolveStageOperationalHealth(stage, thresholds?)` puro que devuelve `'healthy'|'alert'|'critical'|'neutral'`, respeta `stage.health` explícito como override, y deriva el tier desde bloqueos/retención/SLA/freshness con umbrales declarativos cuando no hay override.
- [ ] Datos insuficientes → `neutral` (gris), nunca `healthy`. Hay test anti-regresión que lo prueba.
- [ ] Existe `resolvePipelineHealth(stages)` (worst-of con piso neutro) + badge de salud del pipeline en el header.
- [ ] Con `colorMode='health'` el fill del chevron lo decide el tier de salud, con baseline neutro: `healthy` calmo, `alert`/`critical` pop-ean; el rol se conserva en ícono/label, no en el fill.
- [ ] La etapa seleccionada se distingue por un canal **no-color** (ring/borde/elevación), distinguible en las 4 viewports y en los 4 tiers.
- [ ] Cada etapa expone el tier de salud en texto (aria-label) + ícono; ninguna señal de estado es color-only; render correcto en `forced-colors`.
- [ ] Cero hex hardcodeado nuevo (lint `greenhouse/no-hardcoded-hex-color` verde); los tiers salen de `theme.palette.*` / ramps AXIS / Chart SoT.
- [ ] El lab `/admin/design-system/charts` muestra el modo salud con fixtures sano/alerta/crítico/sin-dato.
- [ ] `colorMode='role'` preserva el comportamiento previo bit-for-bit (back-compat).
- [ ] `PRIMITIVES.md` + `HISTORIAL.md` documentan el contrato; GVC light+dark+desktop+mobile mirada.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (full suite — el primitive es recurso compartido)
- `pnpm fe:capture design-system-charts --env=local` (light + dark + desktop + mobile, mirada) + GVC del consumer org-detail al coordinar con TASK-1061/1063
- Verificación a11y manual: DevTools vision-deficiency (protanopia/deuteranopia) + forced-colors

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado si hubo aprendizajes/deuda
- [ ] `changelog.md` actualizado (cambio de encoding visible)
- [ ] chequeo de impacto cruzado sobre TASK-1059/1061/1063 (consumers del funnel card)
- [ ] `greenhouse-documentation-governor` invocado antes de declarar complete (cambio visible de UI)

## Follow-ups

- **Política de salud de dominio CSC/ICO real** (umbrales contra SLA/RpA/cycle-time del ICO Engine) — consumer-side, candidata a follow-up en delivery / dentro de TASK-1063.
- **Geometría del funnel** ("funnel real" donde el ancho/área codifique volumen vs asumir "riel de etapas") — decisión de diseño separada.
- **Lint rule** `no-role-color-fill-in-operational-pipeline` si emerge necesidad de enforcement.
- Reconciliación del double-label "Retención" (KPI global vs panel) — refinamiento de copy.

## Open Questions

- **Default de `colorMode`**: ¿`operationalPipeline` arranca en `'health'` (opinión por defecto, alineada al propósito de triage) o `'role'` opt-in (no-breaking)? — Decisión del operador / coordinación con TASK-1061.
- **Tratamiento de `healthy`**: ¿verde muy suave o directamente neutro con check discreto? (lo segundo maximiza el pop del problema; lo primero comunica "verificado sano"). — Resolver en el loop GVC.
- **¿El badge de rollup vive en el header de la card o en el panel "Lectura de etapa"?** — Resolver en diseño.
