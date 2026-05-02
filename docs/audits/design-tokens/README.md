# Design Tokens Audits

Auditorías del sistema de tokens visuales de Greenhouse EO. Cubren la consistencia entre:

- `DESIGN.md` (raíz) — contrato compacto agent-facing (formato Google Labs `@google/design.md`)
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` — spec extensa canónica
- `src/components/theme/mergedTheme.ts` + `src/app/layout.tsx` — runtime source-of-truth
- Consumo real en `src/views/**`, `src/components/**`, `src/app/**`

## Auditorías disponibles

- [DESIGN_TOKENS_AUDIT_2026-05-02.md](DESIGN_TOKENS_AUDIT_2026-05-02.md) — primer audit transversal post TASK-567 (typography sweep). Inventaría 14 drift items entre DESIGN.md, V1 spec y runtime; propone resolución por rangos de severidad.

## Cuándo refrescar

Crear nuevo audit (no actualizar el existente) cuando:

- Se cambia material en `mergedTheme.ts` (theme override, palette, shape)
- Se ship un pivot de fuente (como TASK-566 Inter → Geist)
- Se agrega/elimina un namespace de color (`customColors.*`, `palette.dark.*`, etc.)
- DESIGN.md sube de versión major (alpha 0.x → 1.0)
- TASK-764 (DESIGN.md hardening) cierra slice estructural

Un audit es snapshot de estado en fecha; no reemplaza specs ni tasks.
