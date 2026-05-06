# TASK-811 — Copy Migration: greenhouse-nomenclature.ts Domain Microcopy Trim

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `TASK-407` (sweep shared shell + rule extendida) + `TASK-408` (promote rule a `error` mode + emails/notifications migrados).
- Branch: `task/TASK-811-greenhouse-nomenclature-domain-microcopy-trim`
- Legacy ID: — (originalmente Slice 7 de TASK-407 según Delta 2026-05-02; ID corregido 2026-05-06 — TASK-409 está burned por `payroll-reliquidation-program`).
- GitHub Issue: —
- Parent: `TASK-265` (split-off final del programa de copy migration).

## Summary

Tercera y última derivada del programa TASK-265. Recorta `src/config/greenhouse-nomenclature.ts` (~2,733 líneas hoy) separando **product nomenclature + navegación** (que se queda) de **domain microcopy** (que migra a `src/lib/copy/`). El archivo histórico mezcla ambas categorías y bloquea la legibilidad del contrato canónico.

## Why This Task Exists

`greenhouse-nomenclature.ts` nació como contenedor genérico antes de que existiera `src/lib/copy/`. Hoy contiene:

- **Product nomenclature** legítimo (Pulse, Spaces, Ciclos, GH_NEXA, GH_PIPELINE_COMMERCIAL) — debe quedarse.
- **Navegación + labels institucionales** (sidebar, menús) — debe quedarse.
- **Domain microcopy** (GH_LABELS, GH_MESSAGES, GH_INTERNAL_MESSAGES, GH_COMPENSATION) — debe migrar a `src/lib/copy/` o eliminarse si es orphan.

Mezclar las tres categorías en un solo archivo de 2,733 líneas:

- Confunde a agentes nuevos sobre dónde declarar copy nuevo.
- Hace que el contrato canónico de `src/lib/copy/` no sea único — hay dos lugares donde buscar.
- Pesa en bundle (algunos exports llegan al cliente sin necesitarlo).

Esta task ejecuta el trim ahora que TASK-407 + TASK-408 cerraron el sweep en superficies UI y la rule está en `error` mode.

## Goal

- Recortar `greenhouse-nomenclature.ts` para que contenga **solo** product nomenclature + navegación + labels institucionales.
- Migrar el domain microcopy a `src/lib/copy/` (namespaces existentes o nuevos según necesidad).
- Eliminar exports orphan (cero importers).
- Cero regresiones runtime: la migración es refactor puro.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — el contrato canónico declara `src/lib/copy/` como SSOT de microcopy funcional.

Reglas obligatorias:

- No editar copy: el trim mueve strings de sitio, no cambia su valor.
- Cada export migrado debe tener su lista de importers actualizada en el mismo PR (no dejar imports rotos).
- Mantener tipado type-safe — `GH_*` exports son el contrato implícito hoy; la migración debe preservar consumer ergonomics.
- No tocar login (heredado de TASK-407).

## Normative Docs

- `docs/tasks/complete/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md`
- `docs/tasks/to-do/TASK-407-copy-migration-shared-shell-components.md`
- `docs/tasks/to-do/TASK-408-copy-migration-notifications-emails.md`

## Dependencies & Impact

### Depends on

- `TASK-407` cerrada — sweep shared shell completo, rule extendida a 6 patterns.
- `TASK-408` cerrada — emails + notifications migrados, rule en `error` mode.

### Blocks / Impacts

- Ningún consumer downstream. Es trim de housekeeping post-sweep.

### Files owned

- `src/config/greenhouse-nomenclature.ts` (trim).
- `src/lib/copy/dictionaries/es-CL/**` (extensión de namespaces para absorber el migrado).
- Importers de los exports que cambien de ubicación (lista a auditar con `rg "from '@/config/greenhouse-nomenclature'"`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

Categorización auditada en TASK-407 Delta 2026-05-02 (líneas 44-56 de TASK-407) — replicada acá como contrato:

| Export | Líneas (snapshot) | Categoría real | Acción |
| --- | --- | --- | --- |
| `GH_LABELS` | 248-276 | Domain microcopy | Migrar a `src/lib/copy/` |
| `GH_TEAM` | 278-397 | Mixed | Split: nav-related se queda; microcopy migra |
| `GH_MESSAGES` | 415-676 | Domain microcopy (login, dashboards, errores, tooltips) | Migrar mayoría; login queda diferido |
| `GH_INTERNAL_MESSAGES` | 677-1181 | Mixed (nav admin + microcopy) | Split |
| `GH_COMPENSATION` | 1307-1313 | Domain HR microcopy (0 importers detectados) | Eliminar (orphan) o migrar a `src/lib/payroll/copy.ts` según importer audit |
| `GH_COLORS` | 1182-1305 | Theme tokens (deprecated parcial) | **Out of scope** — vive en theme |
| `GH_NEXA` | 1317-1392 | Product nomenclature ✓ | **Mantener** |
| `GH_PRICING` | 1623-2326 | Mixed | Auditar entry-by-entry; product-related mantiene, microcopy migra |
| `GH_PIPELINE_COMMERCIAL` | 2327-2408 | Product nomenclature ✓ | **Mantener** |

### Slice 1 — Audit + plan de migración por export

- Generar mapa actualizado de importers para cada export (`rg -l "from '@/config/greenhouse-nomenclature'"` y por símbolo).
- Categorizar entry-by-entry los exports `mixed`: cada key de `GH_TEAM`, `GH_INTERNAL_MESSAGES`, `GH_PRICING` se etiqueta `nomenclature` | `microcopy` | `orphan`.
- Output: tabla decisional checked-in en PR description.

### Slice 2 — Migrar microcopy puro a `src/lib/copy/`

- `GH_LABELS` → namespaces correspondientes (`actions`, `states`, `aria`, etc.) o nuevo namespace `labels` si no encaja.
- `GH_MESSAGES` → namespaces o nuevo `messages` (excluyendo login).
- Actualizar imports en consumers (en el mismo PR).

### Slice 3 — Split de exports `mixed`

- `GH_TEAM`, `GH_INTERNAL_MESSAGES`, `GH_PRICING`: split por categoría según el audit del Slice 1.
- Mantener una sola surface para nav (`GH_TEAM` + sidebar consumers).
- Microcopy queda absorbido en `src/lib/copy/`.

### Slice 4 — Eliminar orphans + cleanup final

- `GH_COMPENSATION` y otros exports con cero importers post-migración → eliminar.
- Verificar que el archivo final contiene solo `GH_NEXA`, `GH_PIPELINE_COMMERCIAL`, navegación, y product labels institucionales.
- Diff final: archivo cae de ~2,733 líneas a una cifra estimable post-Slice 1 (target informativo: ~800-1000).

## Out of Scope

- `GH_COLORS` — vive en theme, fuera del contrato de copy.
- Login copy — sigue diferido (heredado de TASK-407).
- Reescribir copy — la migración mueve strings, no edita valores.
- Cambios en `src/lib/copy/` API pública (los namespaces se extienden, no se rompen).

## Acceptance Criteria

- [ ] `src/config/greenhouse-nomenclature.ts` contiene **solo** product nomenclature + navegación + labels institucionales.
- [ ] Cero exports con 0 importers (orphans eliminados).
- [ ] Domain microcopy migrado a `src/lib/copy/` con namespaces apropiados; consumers actualizados en el mismo PR.
- [ ] Diff de bundle size documentado en PR description (esperado: bajada por exports cliente-side migrados).
- [ ] `pnpm build`, `pnpm lint`, `npx tsc --noEmit`, `pnpm test` pasan en cada PR de slice.
- [ ] Smoke verification sobre las 10 surfaces shared de TASK-407 (heredamos el checklist).
- [ ] Sin warnings nuevos de `greenhouse/no-untokenized-copy` (que ya está en `error` mode post-TASK-408).

## Verification

- `pnpm lint && npx tsc --noEmit && pnpm build && pnpm test`
- Smoke verification heredado de TASK-407 (10 surfaces shared).
- `rg "from '@/config/greenhouse-nomenclature'" src/ | wc -l` baja respecto al baseline pre-trim.
- Para cada export eliminado, `rg "<EXPORT_NAME>" src/` retorna 0.

## Closing Protocol

- [ ] Actualizar `Handoff.md` con resumen del trim y diff de líneas.
- [ ] Ejecutar chequeo de impacto cruzado sobre TASK-116, TASK-266 y cualquier task que dependa de los exports eliminados/movidos.
- [ ] Documentar en `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` la separación final: `greenhouse-nomenclature.ts` = product nomenclature + nav; `src/lib/copy/` = microcopy funcional.
- [ ] Cerrar el programa de copy migration TASK-265 → TASK-407 → TASK-408 → TASK-811.

## Open Questions

- ¿`GH_PRICING` necesita un namespace dedicado en `src/lib/copy/` (`pricing`) o sus entries microcopy encajan en `actions`/`labels` existentes? Decidir en Slice 1.
- ¿`GH_COMPENSATION` (0 importers) es realmente orphan o hay imports indirectos via `re-export`? Validar con grep + tsc trace antes de eliminar.

## 4-Pillar Score

| Pillar | Score | Justificación |
| --- | --- | --- |
| **Safety** | ✅ | Refactor puro post-sweep, sin write paths. Rule en `error` mode previene regresión. |
| **Robustness** | ✅ | Cada slice valida importers antes de mover. PR-by-slice + smoke verification. |
| **Resilience** | ✅ | Rollback granular por slice. Audit trail en PR descriptions. |
| **Scalability** | ✅ | Resultado final: SSOT clarificado. Agentes futuros saben dónde declarar copy nuevo. |
