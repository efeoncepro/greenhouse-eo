# TASK-1039 — Tipografía: rol semántico para el peso 500 (énfasis medio)

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `none`
- Status real: `Cerrada — evaluada y descartada (won't-do)`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `develop` (local-first)
- Legacy ID: `TASK-1038 FU1`

## Resolution — won't-do (2026-06-06)

Evaluado con comparación visual live (sección 5b del mockup de tipografía, GVC capturado) y **descartado**. Dos razones, fundamentadas tras verificar el estado real:

1. **Diferencia imperceptible:** a 14px, 400→500 es casi invisible; el salto que el ojo lee es 400↔600. Agregar un tier que no se percibe viola la regla `modern-ui` (restraint — no token que no se ve).
2. **El 500 ya rinde:** Vuexy/MUI ya usan `fontWeightMedium` (500) en label de Tab, stepper y custom-inputs. No era "peso reservado sin usar" — el SoT simplemente no lo nombra. Formalizarlo sería un fix de gobernanza (SoT == realidad) con el costo de un 4º tier que mete la ambigüedad "¿esto va 400/500/600?". Beneficio marginal < costo de claridad.

El análisis se conserva como **récord de decisión** en la sección 5b del mockup (`/admin/design-system/typography/mockup`). El peso 500 queda donde Vuexy ya lo pone; no se introduce token nuevo. La energía se redirige al follow-up de mayor valor (TASK-1041 charts adapter).

## Summary

El SoT de tipografía (TASK-1036/1038) carga el peso **500** en ambas familias (Geist + Poppins) pero lo tiene **"reserved"** — sin rol semántico. Greenhouse usa 400 (body) / 600 (labels-títulos-botones) / 700 (raro) / 800 (display). Falta el **énfasis medio (500)**: el peso para nav-items, encabezados de tabla y labels sutiles que deben leerse un poco más pesados que body sin gritar como un label/título. Esta task define ese rol, lo propone con evidencia visual, y — **tras aprobación** — lo aplica.

## Why This Task Exists

La convergencia de sistemas serios (Linear, Stripe, GitHub, Notion) usa una rampa 400/500/600/700: el **500 es el "in-between"** para jerarquía sutil (nav, table headers, metadata enfatizada). Greenhouse saltó de 400 a 600, lo que fuerza a esos elementos a elegir entre "muy liviano" (400, se pierde) o "muy pesado" (600, compite con títulos). El 500 ya está cargado; solo falta darle un rol y aplicarlo donde corresponde.

## Goal

- Definir el/los token(s) de énfasis medio en el SoT (p.ej. `labelMedium` 14/500 / rol `nav`).
- Mapear los consumidores canónicos: nav-items, encabezados de tabla, tab labels (candidatos).
- **Proponer con evidencia visual** (sección en el mockup + GVC) ANTES de aplicar — cambio cross-surface.
- Tras aprobación: aplicar en el SoT + overrides de componente + drift-guard + DESIGN.md/V1.

## Architecture Alignment

Revisar y respetar:

- `DESIGN.md` §Typography + `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §3
- `CLAUDE.md` "Typography System" (mover SoT + mergedTheme + DESIGN.md + V1 + drift-guard juntos)
- Skill `design-system-governance` (protocolo de agregar token) + `modern-ui` (restraint: un tier nuevo solo con consumidor real)

Reglas obligatorias:

- **No display tier / no token sin consumidor real** (modern-ui). El 500 entra solo con surfaces concretas que lo usen.
- Mover las 3 capas juntas (SoT → mergedTheme → DESIGN.md/V1) + extender `typography-drift.test.ts` o el guard rompe CI.
- Cambio visual cross-surface → **GVC + aprobación del operador antes del flip** (mismo protocolo que la escala TASK-1038).

## Dependencies & Impact

### Depends on

- `src/components/theme/typography-tokens.ts` (SoT — `fontWeights.medium` ya = 500)
- `src/components/theme/mergedTheme.ts` (overrides de componente)
- VerticalMenu / DataTableShell / CustomTabList (consumidores candidatos)

### Blocks / Impacts

- Toca nav + tablas + tabs (visible en casi todo el portal) → requiere GVC por surface.

### Files owned

- `src/components/theme/typography-tokens.ts`
- `src/components/theme/mergedTheme.ts`
- `src/components/theme/typography-drift.test.ts`
- `DESIGN.md` + `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `src/views/greenhouse/admin/design-system/typography/mockup/*` (sección propuesta)

## Current Repo State

### Already exists

- `fontWeights.medium: 500` cargado, comentado `(500 reserved)`.
- Familias Geist Medium / Poppins Medium disponibles (web + PDF).

### Gap

- No hay token semántico que use 500.
- Ningún override de componente referencia el énfasis medio.

## Scope

### Slice 1 — Propuesta con evidencia (NO flip)

- Sección "peso 500 — propuesta de rol" en el mockup de tipografía con **comparación live 400 vs 500 vs 600** sobre ejemplos reales (nav-item, table-header, label sutil).
- Mapping propuesto: qué surfaces pasan a 500.
- GVC de la propuesta → presentar al operador.

### Slice 2 — Aplicación (POST-aprobación)

- Token(s) en `typographyScale` + bridge si aplica.
- Overrides en `mergedTheme` (nav / table-header / tab).
- Extender `typography-drift.test.ts` + DESIGN.md/V1 + Delta.
- GVC de las surfaces afectadas sin regresión.

## Out of Scope

- Tocar el peso de títulos/botones (600) o display (800).
- Aplicar 500 sin aprobación visual previa.

## Rollout Plan & Risk Matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Nav/tablas se ven distintas y al operador no le cierra | UI | medium | Slice 1 propone con GVC ANTES de flip; aprobación explícita | revisión visual |
| Drift SoT↔runtime↔DESIGN.md | UI | low | drift-guard extendido en el mismo PR del flip | `typography-drift.test.ts` CI |

Sin flag (el tier es additive en el SoT; el flip de overrides es el cambio visible). Rollback: revertir el commit del flip — el token queda definido pero sin consumidor.

## Acceptance Criteria

- [ ] Slice 1: propuesta + comparación live en el mockup + GVC presentada.
- [ ] **Aprobación del operador** registrada.
- [ ] Slice 2: token + overrides + drift-guard + DESIGN.md/V1 sincronizados.
- [ ] GVC de nav/tablas/tabs sin regresión.
- [ ] `pnpm lint` + `pnpm tsc --noEmit` + `pnpm test src/components/theme` verdes.

## Verification

- `pnpm test src/components/theme/typography-drift`
- `pnpm design:lint`
- GVC de `/admin/design-system` + una vista con tabla + nav.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md` si aplica

## Follow-ups

- Si el operador rechaza algún surface, ajustar el mapping (no es all-or-nothing).
