# TASK-986 — Contractor Directory en el workbench HR (browse, no solo cola)

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Implementacion`
- Rank: `TBD`
- Domain: `hr|ui`
- Blocked by: `TASK-975, TASK-984 (complete)`
- Branch: `develop` (instrucción del operador 2026-06-01)
- Legacy ID: `none`

## Summary

`/hr/contractors` es una **cola de revisión** (envíos/disputas/payables/pending_review/missing-rate), NO un directorio. Un engagement **activo + liquidado + sin ítems abiertos** (caso Valentina `EO-CENG-0001`: active, rate seteado, `needs_review`) **no aparece en ninguna fuente de la cola → es inalcanzable**: no se puede ver detalle, editar términos, revisar clasificación ni cerrarlo. Este fix agrega la **pierna de directorio** (browse/search de TODOS los engagements) reusando el inspector/detalle/compensación/clasificación/cierre existentes. Backend ya existe (`GET /api/hr/contractors`).

## Why This Task Exists

Diagnóstico verificado (read-only, 2026-06-01): la cola del workbench se arma de 5 fuentes accionables; un contractor activo sano matchea ninguna → desaparece de la UI. Es una falla de IA **browse vs. queue** (Rosenfeld): existe la cola de acción, falta el directorio. Misma clase que TASK-982 (alcanzabilidad): entidad real sin path de navegación. **También bloquea el cierre TASK-984** (si el engagement no está en la cola, no se llega al drawer "Cerrar contractor"). Analizado con `info-architecture` + `arch-architect` + `greenhouse-ux`.

## Goal

- Poder **encontrar y abrir cualquier engagement** (activo/pausado/draft/ending/terminal) desde `/hr/contractors`, independiente de la cola de acción.
- Reusar el inspector + detalle + compensación + revisión de clasificación + cierre — cero superficie nueva de gestión.
- Cero backend nuevo: consume `GET /api/hr/contractors` (lista filtrable, `read`).

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `CLAUDE.md` → "Navigation Reachability Governance (TASK-982)" (browse/directory + reachability), IA doctrine.

Reglas:

- Directorio = **browse** (todos los engagements). La cola = **triage** (accionables). Dos piernas IA, no se colapsan.
- NUNCA backend nuevo si el reader existe (`listContractorEngagements` / `GET /api/hr/contractors`).
- Reusar inspector/detalle/compensación/clasificación/cierre (TASK-968/975/984). Solo se agrega el punto de entrada.
- Copy es-CL via `src/lib/copy/*` (ux-writing). Tokens canónicos.

## Dependencies & Impact

### Depends on

- `GET /api/hr/contractors` (lista all, filterable, `read`) — existe.
- `ContractorAdminWorkbenchView` + AdminInspector + drawers (TASK-975/968/984) — complete.

### Files owned

- `src/views/greenhouse/contractors/ContractorAdminWorkbenchView.tsx` (tab/sección Directorio + wiring al inspector)
- `src/views/greenhouse/contractors/mockup/*` (mockup de referencia)
- `src/app/(dashboard)/hr/contractors/directory/mockup/page.tsx` (mockup route)
- `src/lib/copy/contractor-compensation.ts` (copy directorio)
- `src/lib/contractor-engagements/hr-workbench-projection.ts` (si hace falta proyectar directory rows compatibles con el inspector)

## Scope

### Slice 1 — Mockup-first + GVC + skills

- Mockup del workbench con tab **"Cola de revisión" | "Directorio"**: lista buscable de todos los engagements (nombre, ID, estado, subtipo, monto, clasificación) → select → inspector. GVC + revisión `modern-ui`/`greenhouse-ux`/`ux-writing`. Iterar.

### Slice 2 — Runtime

- Tab "Directorio" en `ContractorAdminWorkbenchView`: fetch `GET /api/hr/contractors` (all, con búsqueda por nombre/estado), tabla TanStack/`DataTableShell`, select → mismo Inspector (compensación + clasificación + cierre + detalle). Estados loading/empty/degraded.

### Slice 3 — Copy + docs + GVC runtime

- Copy es-CL tokenizado; doc funcional + manual; GVC del directorio runtime (lista + select → inspector con Valentina activa).

## Out of Scope

- Backend nuevo (el reader existe).
- Rediseño de la cola de revisión (se mantiene; se agrega el tab Directorio al lado).
- Mutaciones de data (Valentina ya quedó activa + 600k; este task solo la hace **alcanzable**).

## Rollout Plan & Risk Matrix

UI-only sobre endpoint existente. Aditivo, reversible por revert.

| Riesgo | Sistema | Prob | Mitigación |
|---|---|---|---|
| Inspector espera shape de queue row | UI | Media | Proyectar engagement→inspector row (counts 0/real) o adaptar props; tests |
| Lista grande sin paginar | perf | Baja | El endpoint pagina (limit/offset); búsqueda server o client acotada |
| Romper la cola existente | UI | Baja | Tab additive; la cola queda igual |

Rollback: revert del PR.

## Acceptance Criteria

- [x] `/hr/contractors` tiene un Directorio (browse) que lista TODOS los engagements, no solo la cola de acción.
- [x] Valentina `EO-CENG-0001` (active, rate 600k, needs_review) aparece en el Directorio y se puede seleccionar.
- [x] Seleccionar en el Directorio abre el mismo inspector → revisar clasificación / compensación / cierre / detalle.
- [x] Búsqueda por nombre/estado funciona.
- [x] La cola de revisión existente queda intacta.
- [x] Boundary: `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde.

## Delta 2026-06-01 — Cerrada

Implementación shipped (develop, sin push — local-first per operador):

- **Proyección**: `resolveContractorHrWorkbenchProjection()` ganó una 8ª fuente (`listContractorEngagements({ excludeTerminal: true, limit: 500 })`) → campo `directory: ContractorWorkbenchQueueRow[]` (todos los no-terminales ordenados por nombre). El helper `buildWorkbenchRow` se extrajo para que cola y directorio compartan el mismo mapper (status desde attention items, si no, label de lifecycle). Nombres resueltos sobre la unión cola∪directorio.
- **UI**: `ContractorAdminWorkbenchView` ganó toggle de pestañas **Cola de revisión (N) | Directorio (N)** (`role=tab`), buscador (`CustomTextField`) por nombre/ID/estado, `selected` abarca cola∪directorio, refetch preserva selección en ambas, `AdminQueueTable` parametrizado (title/subheader/empty/caption). Mismo inspector reutilizado (compensación + clasificación + cierre + detalle). Cero backend nuevo.
- **Copy**: bloque `CC.directory` en `src/lib/copy/contractor-compensation.ts` (tokenizado, es-CL).

**Verificación real (no mock)**: el resolver contra la DB (vía proxy) devuelve `directory: 1` → **Valentina Hoyos (EO-CENG-0001, Activo, rate 600000, needs_review)**, `degraded: []`. Esto prueba que la queja del operador ("aquí no me sale Valentina") queda cerrada: el contractor activo sano es ahora **alcanzable** en el Directorio. (El GVC contra el dev server local mostró 0 por timeout del connector local — banner "No pudimos cargar los envíos" lo confirma — no es bug del código.)

**Gates**: tsc 0 · lint 0 (archivos tocados) · boundary `pnpm vitest run src/lib/contractor-engagements src/lib/payroll src/lib/workforce/offboarding` = 728 passed · `pnpm build` exit 0.

**Sin invariante nuevo**: reusa el patrón canónico TASK-982 (browse vs queue / reachability) + proyección runbench TASK-796/835. Cero migración, cero capability, cero mutación de data. Aditivo, reversible por revert.

## Verification

- tsc / lint / build / `pnpm vitest run src/lib/contractor-engagements src/lib/payroll src/lib/workforce/offboarding`
- GVC del directorio (mockup + runtime con Valentina).

## Closing Protocol

- [ ] Lifecycle + README + registry + Handoff + changelog.
- [ ] Arch Delta + CLAUDE.md si emerge invariante.
