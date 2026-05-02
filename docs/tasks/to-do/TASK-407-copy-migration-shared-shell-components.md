# TASK-407 — Copy Migration: Shared Shell + Components

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `TASK-265` — la capa dictionary-ready y el contrato canónico deben existir antes de migrar.
- Branch: `task/TASK-407-copy-migration-shared-shell-components`
- Legacy ID: —
- GitHub Issue: —
- Parent: `TASK-265` (split-off de Slice 3)

## Summary

Derivada de `TASK-265`. Ejecuta la migración de copy shared en el shell del portal y los componentes reusables: navegación, CTAs base, arrays de meses, empty/error/loading states. No entrega contrato (lo hace `TASK-265`); solo consume la capa dictionary-ready ya inicializada y reduce hardcodes en `src/components/greenhouse/` y `src/views/greenhouse/`.

## Why This Task Exists

La migración masiva no puede ir junto con el diseño del contrato: mezclarlas obliga a revisar un PR gigante que toca 50+ archivos sin poder validar el contrato antes. Esta task espera a que `TASK-265` cierre con el contrato estable, y entonces ejecuta la migración del shell shared de forma aislada y revisable.

El baseline detectado en el codebase:

- **8+ vistas** duplican arrays de meses (`['Ene', 'Feb', ..., 'Dic']`) en analytics, payroll, organization economics.
- **9+ instancias** de CTAs base (`Guardar`, `Guardando...`, `Editar`, `Cancelar`, `Confirmar`, `Volver`) hardcoded en `src/components/greenhouse/` (AboutMeCard, ProfessionalLinksCard y similares).
- Empty states, error states y loading copy distribuidos inline en vistas del portal.

## Goal

- Ejecutar migración completa de copy shared en navigation, shell components y vistas reusables del portal (excluyendo login diferido).
- Dejar 0 arrays de meses y 0 CTAs base hardcoded fuera de la capa canónica.
- Mantener comportamiento runtime idéntico: la task es un refactor puro, no debe introducir cambios visibles al usuario.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — consume el contrato canónico que deja `TASK-265`.

Reglas obligatorias:

- No introducir nueva taxonomía ni expandir `greenhouse-nomenclature.ts` — consumir la capa dictionary-ready tal como la definió `TASK-265`.
- No tocar login (diferido explícitamente).
- No migrar copy de dominio específico si no es shared: si un string vive en un solo módulo y no se reusa, puede quedar local.
- Mantener cero regresiones UI — verificar visualmente las vistas migradas en staging.

## Normative Docs

- `docs/tasks/to-do/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-265` en estado `complete` (capa dictionary-ready + contrato canónico).
- Layer nueva que `TASK-265` inicialice (p.ej. `src/lib/copy/` o similar).

### Blocks / Impacts

- `TASK-266` Slice 4 — rollout incremental de locales consume directamente el trabajo de esta migración.
- `TASK-116` — labels/subtitles del sidebar deben quedar alineados al nuevo contrato.

### Files owned

- `src/components/greenhouse/**` (solo archivos con CTAs/empty/error/loading shared)
- `src/views/greenhouse/**` (solo strings shared, no dominio local)
- Arrays de meses en cualquier ubicación

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Arrays de meses

- Detectar todos los arrays de meses hardcoded (`['Ene', 'Feb', ..., 'Dic']` y variantes).
- Reemplazar por un helper único que consuma la capa canónica.
- Validar que las vistas afectadas (analytics, payroll, organization economics) siguen renderizando igual.

### Slice 2 — CTAs base en `src/components/greenhouse/`

- Inventariar strings tipo `Guardar`, `Guardando...`, `Editar`, `Cancelar`, `Confirmar`, `Volver`, `Siguiente`, `Cargando...`.
- Migrarlos al namespace correspondiente de la capa dictionary-ready.
- Dejar un ESLint rule o check (si viable) que alerte sobre nuevos hardcodes de estos strings.

### Slice 3 — Empty / error / loading states shared

- Detectar empty states, error messages y loading labels que aparecen en 2+ lugares.
- Migrar al namespace shared correspondiente.
- Mantener copy específica de dominio en su lugar si no tiene vocación de reuso.

### Slice 4 — Navegación y labels de shell

- Validar que toda la nav y labels del shell consumen la capa canónica con la nueva estructura (no queda inline).
- Si `TASK-265` dejó el recorte de `greenhouse-nomenclature.ts` planeado pero no ejecutado, ejecutarlo aquí.

## Out of Scope

- Login — diferido.
- Copy de dominio local sin vocación shared.
- Traducción a otros locales (eso es `TASK-266` + child tasks).
- Notifications y emails (eso es `TASK-408`).

## Acceptance Criteria

- [ ] **0** arrays de meses hardcoded fuera de la capa canónica (validar con grep en `src/views/` y `src/components/`).
- [ ] **0** CTAs base (`Guardar`, `Cancelar`, `Editar`, `Guardando...`, `Cargando...`, `Confirmar`, `Volver`, `Siguiente`) hardcoded en `src/components/greenhouse/` y en componentes shared de `src/views/greenhouse/` fuera del login.
- [ ] Empty / error / loading states shared consumen la capa canónica.
- [ ] `pnpm build`, `pnpm lint`, `npx tsc --noEmit`, `pnpm test` pasan.
- [ ] Verificación visual en staging: nav, shell, profile cards, analytics con meses, formularios con CTAs base.
- [ ] No hay regresiones reportadas tras deploy a staging.

## Verification

- `pnpm lint && npx tsc --noEmit && pnpm build && pnpm test`
- Deploy a preview/staging y revisión manual de vistas shared clave.
- Grep post-migración confirma baseline cero en los targets medibles.

## Closing Protocol

- [ ] Actualizar `Handoff.md` con resumen de migración y superficies afectadas.
- [ ] Ejecutar chequeo de impacto cruzado sobre `TASK-116`, `TASK-266` y `TASK-408`.
- [ ] Verificar que el contador de warnings de `greenhouse/no-untokenized-copy` (rule introducida por TASK-265 Slice 5) bajó respecto al baseline registrado al cierre de TASK-265. Si quedan 0 warnings en el scope cubierto por esta task (shared shell + componentes), documentar; si no, registrar el delta y dejar el resto a TASK-408.

## Open Questions

- ~~¿Conviene agregar un ESLint rule que alerte sobre hardcodes de CTAs base, o basta con la disciplina de code review?~~ — **Resuelto 2026-05-02 vía TASK-265 Slice 5**: la rule `greenhouse/no-untokenized-copy` fue agregada al programa de TASK-265 (gate antes que sweep, mismo patrón TASK-567). Esta task ejecuta el sweep contra ese baseline.
