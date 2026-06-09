# TASK-1064 — Context Pack drift sweep + altitude boundary + freshness governance

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `policy`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `task/TASK-1064-context-pack-drift-sweep`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`docs/context/*` (el business context pack para agentes) repite claims de runtime/técnicos que ya driftearon y mezcla **dirección estratégica (durable)** con **valores perecederos** que envejecen sin guardia. Barrer el pack para reemplazar todo claim de runtime por punteros al SoT técnico (CLAUDE.md / DESIGN.md / specs / glosario), dejar el pack en su altitud (negocio/marca/GTM), agregar metadata de frescura por doc y reconciliar con la skill `efeonce-agency` (una fuente, la otra referencia). No cambia código de producto.

## Why This Task Exists

Las dos correcciones puntuales recientes (color/tipografía hardcodeados en `05_voz-tono-estilo.md`; nomenclatura de primera versión) **no eran casos aislados sino síntomas de una causa raíz única**: el pack baja de su altitud y pincha valores de runtime, lo que CLAUDE.md explícitamente prohíbe ("el context pack… no reemplaza arquitectura vigente, runtime real, DESIGN.md, specs técnicas ni contratos de datos. Si hay drift, prevalece el contrato técnico verificado"). Evidencia concreta de drift ya realizado:

- `00_INDEX.md:84` — "Test coverage ~3.3% en módulos críticos": falso (la suite vigente pasa 6508 tests).
- `00_INDEX.md:82` — lista "Reactividad cross-module (outbox)" como gap **abierto**; está **cerrado** (TASK-773).
- `04_greenhouse-producto.md:28` — "6 schemas PostgreSQL"; el runtime tiene **9** (`core, serving, sync, payroll, finance, hr, crm, delivery, ai`). Igual conteos "4 cron jobs / 150-162 rutas / ~1.800 archivos TS" que envejecen.
- `00_INDEX.md:92` — RpA "el dashboard rotula 'Reviews per Asset', alinear a 'Rounds per Asset'": TODO de string de runtime probablemente resuelto (TASK-901/909).
- Nomenclatura de primera versión (Pulse/Ciclos/Torre de Control/Spaces) — en 7 de 13 docs.
- Roadmap fechado (Q2/Q3/Q4 2026) en `00`, `04`, `14`.
- Sin metadata de frescura por doc (solo "destilación junio 2026" global) → sin resistencia al drift.
- Redundancia con la skill `efeonce-agency` (mismo contexto de negocio en dos lados → drift entre ellos).

El pack es valioso en su núcleo estratégico (North Star, filtro verdes/rojas, ICP/JTBD, ASaaS, voz). El objetivo NO es vaciarlo sino **subirlo a su altitud durable**.

## Goal

- Cada claim de runtime/técnico en `docs/context/*` o se elimina o se reemplaza por un puntero al SoT canónico (CLAUDE.md / DESIGN.md / specs de arquitectura / glosario vivo). El pack fija **norte**, no **valores**.
- Conteos, porcentajes, gaps-ya-cerrados, strings de métrica, roadmap fechado y nomenclatura listada: neutralizados o referenciados, no hardcodeados.
- Metadata de frescura por doc (last-verified + owner) + cadencia de refresh atada a `greenhouse-documentation-governor`.
- Reconciliación con la skill `efeonce-agency`: una es fuente, la otra referencia (sin duplicar la misma verdad).

## Architecture Alignment

Revisar y respetar:

- `CLAUDE.md` — sección "Business Context Pack" (regla de altitud: el pack no reemplaza runtime; si hay drift, prevalece el contrato técnico verificado).
- `docs/context/00_INDEX.md` — propósito + carga selectiva del pack.
- `.claude/skills/greenhouse-documentation-governor/SKILL.md` — gobierno documental + cadencia.

Reglas obligatorias:

- NO inventar valores nuevos para reemplazar los viejos. Si un dato de runtime es necesario, **apuntar al SoT** (no copiar el valor, que volvería a driftear).
- NO tocar la nomenclatura del producto en sí (eso es TASK-1065). Aquí solo se neutralizan las **menciones/listados** en los docs de contexto (deferir al glosario/SSOT).
- Preservar el núcleo estratégico (North Star, filtro de decisión, ICP/JTBD, modelo ASaaS, doctrina de voz). El sweep quita drift, no contenido estratégico.

## Normative Docs

- `docs/context/05_voz-tono-estilo.md` — ya alineado (color→AXIS, copy→UX writing, nombres quitados) como patrón de referencia del sweep.

## Dependencies & Impact

### Depends on

- none (doc-only).

### Blocks / Impacts

- TASK-1065 (nomenclatura rename) — complementaria: este sweep hace que los docs de contexto **defieran al SoT** para nombres; TASK-1065 cambia lo que el SoT dice.
- Skill `efeonce-agency` (global `~/.claude/skills/` + mirror repo `.claude/skills/` si existe [verificar]) — recibe la reconciliación fuente/referencia.

### Files owned

- `docs/context/00_INDEX.md`
- `docs/context/01_quienes-somos.md` … `docs/context/14_modelo-negocio-asaas.md` (los que tengan drift)
- `.claude/skills/efeonce-agency/SKILL.md` [verificar si el mirror repo existe; la global no es committeable]

## Current Repo State

### Already exists

- El pack completo en `docs/context/` (13 docs activos: 00-11, 13, 14; no hay 12).
- `05_voz-tono-estilo.md` ya saneado (color/tipografía → AXIS/DESIGN.md; copy → UX writing; nombres de primera versión quitados) — commit local `6751548f3`. Sirve de plantilla del sweep.

### Gap

- Drift de runtime en `00`, `04`, `14` (coverage %, conteos, schemas 6≠9, gaps cerrados, roadmap fechado, string RpA).
- Nomenclatura de primera versión en 7 docs (00, 02, 04, 06, 08, 10, 11).
- Sin metadata de frescura por doc.
- Sin reconciliación con la skill `efeonce-agency`.

## Scope

### Slice 1 — Drift audit + neutralización por doc

- Auditar los 13 docs y listar cada claim de runtime/técnico (conteos, %, schemas, gaps cerrados, strings de métrica, roadmap fechado, nomenclatura listada).
- Reemplazar cada uno por: (a) un puntero al SoT (CLAUDE.md / DESIGN.md / spec / glosario), o (b) eliminación si es puro ruido. NO copiar valores nuevos.
- Corregir los drifts concretos ya identificados (coverage 3.3%, 6→9 schemas, outbox gap cerrado, string RpA, roadmap fechado → fases sin fecha dura o con puntero al roadmap vivo).

### Slice 2 — Freshness governance

- Agregar a cada doc un encabezado mínimo de frescura (last-verified + owner/agente) consistente con el patrón de `docs/documentation/`.
- Actualizar `00_INDEX.md` con la cadencia de refresh + nota de que el pack defiere al SoT técnico para todo valor de runtime.
- Registrar el refresh del pack como ítem en `greenhouse-documentation-governor` (cadencia periódica).

### Slice 3 — Reconciliación con `efeonce-agency`

- Declarar la relación fuente↔referencia entre el pack (`docs/context/*`) y la skill `efeonce-agency` (una es SoT del contexto de negocio, la otra referencia) para evitar drift entre ambos.

## Out of Scope

- Renombrar la nomenclatura del producto (Pulse/Ciclos/Torre de Control/Espacios) en config/componentes/tests → TASK-1065.
- Reescribir el núcleo estratégico (North Star, ICP/JTBD, ASaaS, voz) — solo se quita drift, no se reescribe doctrina.
- Cualquier cambio de código de producto (`src/**`).

## Detailed Spec

Omitida (task `policy`/doc-governance). El Scope + el patrón ya aplicado en `05_voz-tono-estilo.md` (color→AXIS, copy→UX writing, nombres quitados, puntero al SoT) es suficiente como guía de ejecución.

## Rollout Plan & Risk Matrix

**impact-only (task `policy`, doc-only):** N/A — additive doc change, no production runtime impact, no rollback needed (revert PR). No toca `src/**`, ni migraciones, ni runtime. Único downstream: TASK-1065 (complementaria, no bloqueante) + skill `efeonce-agency` (reconciliación).

## Acceptance Criteria

- [ ] Cero claims de runtime hardcodeados en `docs/context/*` que puedan driftear (conteos, %, schemas, gaps cerrados, strings de métrica) — verificado por grep de los patrones identificados.
- [ ] Todo dato de runtime necesario está como **puntero** al SoT, no como valor copiado.
- [ ] Cada doc del pack tiene metadata de frescura (last-verified + owner).
- [ ] `00_INDEX.md` declara la regla de altitud (defiere al SoT técnico) + la cadencia de refresh.
- [ ] La relación fuente↔referencia con la skill `efeonce-agency` está declarada.
- [ ] El núcleo estratégico (North Star, filtro, ICP/JTBD, ASaaS, voz) quedó intacto.

## Verification

- Revisión manual (task `policy`): grep de los patrones de drift identificados → cero hits hardcodeados.
- `greenhouse-documentation-governor` pasa el cierre documental.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambió protocolo visible
- [ ] chequeo de impacto cruzado (TASK-1065)
- [ ] grep de patrones de drift = cero hits hardcodeados

## Follow-ups

- TASK-1065 — rename de nomenclatura de primera versión en el producto.

## Open Questions

- ¿El mirror repo `.claude/skills/efeonce-agency/SKILL.md` existe, o la skill es solo global? Determina si la reconciliación de Slice 3 es committeable. [verificar en Discovery]
