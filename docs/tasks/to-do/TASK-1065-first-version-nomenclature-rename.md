# TASK-1065 — Rename first-version Greenhouse nomenclature (operator-disliked)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none (nombres resueltos 2026-06-09 — ver Delta)`
- Branch: `task/TASK-1065-nomenclature-rename`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La nomenclatura de producto de la **primera versión** de Greenhouse (Pulse, Ciclos, Torre de Control, Espacios) ya no le gusta al operador. Renombrarla de forma gobernada en el SSOT `src/config/greenhouse-nomenclature.ts` + los componentes que la consumen + tests + la tabla "Greenhouse Product Vocabulary" de la skill `greenhouse-ux-writing` + las menciones en docs (context pack, DESIGN.md, docs funcionales). NO es un cleanup de doc: es un rename de producto con blast radius real.

## Why This Task Exists

Estos nombres son **reales y load-bearing en el runtime** (no alucinación): viven en el SSOT de nomenclatura y en componentes como `HomePulseStrip.tsx`, `GreenhouseDashboard`, agency clients, varios views del Home V2. El operador los identificó como nomenclatura de primera versión que no quiere conservar. Cambiarlos requiere: (a) decidir los **nombres nuevos** (o términos neutros), y (b) un pase coordinado config → componentes → tests → skill → docs, para no dejar drift parcial ni romper referencias.

## Goal

- SSOT `greenhouse-nomenclature.ts` actualizado con los nombres nuevos.
- Todos los consumidores (componentes, views, tests) alineados — cero referencias rotas, cero strings viejos visibles en UI.
- Tabla "Greenhouse Product Vocabulary" de la skill `greenhouse-ux-writing` + menciones en `docs/context/*` + DESIGN.md + docs funcionales sincronizadas.
- GVC de las superficies afectadas (Home/Pulse strip, dashboards) confirma la nueva nomenclatura sin regresión visual.

## Architecture Alignment

Revisar y respetar:

- `CLAUDE.md` — sección "Microcopy / UI copy" + decision tree (nomenclatura → `greenhouse-nomenclature.ts`).
- `DESIGN.md` — si referencia nombres de producto.
- `.claude/skills/greenhouse-ux-writing` — tabla "Greenhouse Product Vocabulary" (refleja el producto: mover junto con el rename, no antes).

Reglas obligatorias:

- Invocar `greenhouse-ux-writing` antes de fijar los nombres nuevos (tono es-CL, coherencia, no introducir otra colisión).
- La tabla de vocabulario de la skill se actualiza **junto con** el rename del producto, NUNCA antes (si no, la skill driftea de la realidad y confunde a los agentes que escriben copy).
- Mover juntos en el mismo PR: SSOT + consumidores + tests + skill + docs. Un rename parcial deja drift peor que el estado actual.

## Normative Docs

- `src/config/greenhouse-nomenclature.ts` — SSOT de nomenclatura.

## Dependencies & Impact

### Depends on

- Decisión del operador sobre los nombres nuevos (Open Questions) — **bloqueante**.
- TASK-1064 (sweep del context pack) — recomendable cerrarla antes para que los docs ya defieran al SSOT.

### Blocks / Impacts

- Toda surface que renderice nomenclatura de producto (Home V2, dashboards, navegación, agency clients).

### Files owned

- `src/config/greenhouse-nomenclature.ts`
- `src/views/greenhouse/home/v2/HomePulseStrip.tsx` + demás consumidores [verificar set completo via grep]
- Tests que pinean los strings de nomenclatura
- `.claude/skills/greenhouse-ux-writing/SKILL.md` (tabla Product Vocabulary) [global — verificar mirror repo]
- `docs/context/*`, `DESIGN.md`, `docs/documentation/*` con menciones

## Current Repo State

### Already exists

- SSOT `src/config/greenhouse-nomenclature.ts` con los nombres de primera versión.
- Consumidores reales (grep: `HomePulseStrip.tsx`, `GreenhouseDashboard`, agency clients, Home V2 views).
- Tabla "Greenhouse Product Vocabulary" en la skill `greenhouse-ux-writing` (Clients→Espacios, Sprints→Ciclos, Dashboard→Pulse, Internal admin→Torre de Control).

### Gap

- Los nombres nuevos no están decididos (bloqueante).
- No hay rename aplicado.

## Scope

### Slice 1 — Decidir + fijar nombres en el SSOT

- Con `greenhouse-ux-writing`, fijar los nombres nuevos (o términos neutros) en `greenhouse-nomenclature.ts`.

### Slice 2 — Alinear consumidores + tests

- Actualizar componentes/views y los tests que pinean strings. Grep exhaustivo para cero referencias huérfanas.

### Slice 3 — Sincronizar skill + docs

- Tabla "Greenhouse Product Vocabulary" de la skill + menciones en `docs/context/*` + DESIGN.md + docs funcionales.

### Slice 4 — GVC

- Capturar las superficies afectadas (Home/Pulse strip, dashboards) y confirmar la nueva nomenclatura sin regresión visual.

## Out of Scope

- El sweep de drift general del context pack (TASK-1064).
- Cambios de lógica de negocio; esto es rename de labels/nomenclatura, no de comportamiento.

## Detailed Spec

Pendiente de los nombres nuevos (Open Questions). Una vez decididos, el detalle es mecánico: rename en SSOT → grep de consumidores → update tests → skill/docs → GVC.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (SSOT) → Slice 2 (consumidores + tests) → Slice 3 (skill + docs) → Slice 4 (GVC). La skill (Slice 3) se actualiza **después** del rename del producto (Slices 1-2), nunca antes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Referencia huérfana a string viejo | UI | medium | grep exhaustivo pre-merge + tests que pinean strings + GVC | tests rojos / string viejo visible en captura |
| Skill driftea de la realidad si se cambia antes que el producto | agents/copy | medium | regla dura: skill se mueve junto al rename, nunca antes | agentes escriben copy con nombre viejo/nuevo inconsistente |

### Feature flags / cutover

- Sin flag — rename de labels, additive cutover inmediato. Revert = revert PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1-4 | revert PR + redeploy | <10 min | sí |

### Production verification sequence

1. `pnpm test` (tests de nomenclatura verdes).
2. GVC de Home/Pulse strip + dashboards → nueva nomenclatura visible, sin regresión.
3. Deploy staging + smoke visual.

### Out-of-band coordination required

- Decisión del operador sobre los nombres nuevos (bloqueante, pre-Slice 1).

## Acceptance Criteria

- [ ] `greenhouse-nomenclature.ts` usa los nombres nuevos.
- [ ] Cero referencias a los strings viejos en `src/**` (grep limpio).
- [ ] Tests que pinean nomenclatura actualizados y verdes.
- [ ] Tabla "Greenhouse Product Vocabulary" de la skill + menciones en docs sincronizadas.
- [ ] GVC confirma la nueva nomenclatura sin regresión visual.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- GVC de las superficies afectadas.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado (cambio visible de nomenclatura)
- [ ] chequeo de impacto cruzado (TASK-1064)
- [ ] grep de strings viejos = cero hits

## Follow-ups

- none.

## Delta 2026-06-09 — nombres resueltos + matiz Space≠Organization

Nombres nuevos (decisión operador 2026-06-09):

| Concepto | Nombre viejo (1ª versión) | **Nombre nuevo** |
|---|---|---|
| Cliente/cuenta | Espacios | **Organizations / Organizaciones** (ya vigente en gran parte del runtime: Account 360, org workspace) |
| Sprint de producción | Ciclos | **Sprints** |
| Dashboard | Pulse / Pulse Global | **Dashboard / dashboards** (genérico, minúscula) |
| Admin interno / vista cross-cuenta | Torre de Control | **Cabina de Mando** (corto: "Cabina") — preserva identidad de centro-de-comando sin la cursilería de 1ª versión; el repo ya usa "cabina de mando" (Handoff.md). Override del operador posible. |

**Matiz CRÍTICO (no es find-replace):** `Space` es un **objeto canónico 360 distinto** (`greenhouse_core.spaces.space_id`, contenedor de trabajo por cliente) — NO es sinónimo de cliente. La nomenclatura de 1ª versión conflaba "Clients" con "Espacios/Spaces". El rename es: **cliente-como-Espacio → Organizations**, pero el objeto canónico **Space se queda** (no renombrar `spaces`/`space_id`/"Spaces" donde refiere al objeto de trabajo). Auditar cada mención de "Espacios/Spaces" y clasificar: ¿refiere al cliente (→ Organization) o al objeto Space (→ se queda)?

**Estado del SSOT (`greenhouse-nomenclature.ts`):** `organizations` ya es 'Organizaciones' (l.75). A cambiar: `dashboard` label 'Pulse'→'Dashboard' (l.15), `sprints` label 'Ciclos'→'Sprints' (l.17), `internalDashboard` 'Torre de control'→'Cabina de Mando' (l.31), `pulseGlobal` 'Pulse Global' (l.72) + subtítulos con "Pulse"/"Spaces" (l.31/71/72) — reescribir distinguiendo Space-objeto de cliente.

**Slice ordering recomendado (timing):** ejecutar como **pase limpio dedicado, idealmente post-release** (la rama actual tiene el release en vuelo + WIP paralelo de Codex en componentes; un rename de labels sobre archivos compartidos ahora arriesga conflictos). Las renames de **identificadores de código** (`HomePulseStrip.tsx`→...) son follow-up de menor valor (internos, no user-facing) — separar de los cambios de label user-facing.
