# Design Tokens Audits

Auditorías del sistema de tokens visuales de Greenhouse EO. Cubren la consistencia entre:

- `DESIGN.md` (raíz) — contrato compacto agent-facing (formato Google Labs `@google/design.md`)
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` — spec extensa canónica
- `src/components/theme/mergedTheme.ts` + `src/app/layout.tsx` — runtime source-of-truth
- Consumo real en `src/views/**`, `src/components/**`, `src/app/**`

## Auditorías disponibles

- [DESIGN_TOKENS_AUDIT_2026-05-02.md](DESIGN_TOKENS_AUDIT_2026-05-02.md) — primer audit transversal post TASK-567 (typography sweep). Inventaría 14 drift items entre DESIGN.md, V1 spec y runtime; propone resolución por rangos de severidad.
- [TYPOGRAPHY_TECHNICAL_DEBT_AUDIT_2026-06-06.md](TYPOGRAPHY_TECHNICAL_DEBT_AUDIT_2026-06-06.md) — deuda técnica de tipografía (emergió en TASK-1034 al robustecer DESIGN.md). Responde "¿solo labels o todo?": **sistémica**, 3 capas — L1 divergencia de vocabulario contrato↔runtime (~todos los tokens), L2 drift/stubs (h5/section-title, button/label-md sin fontSize; label-lg/sm inexistentes), L3 magic numbers de control-text en @core (read-only). Sano: lineHeights + headlines. Remediación = task dedicada con SoT de tipografía (espejo de axis-tokens para color). NO resuelta aún.
- [ELEVATION_SHADOW_TOKEN_AUDIT_2026-06-07.md](ELEVATION_SHADOW_TOKEN_AUDIT_2026-06-07.md) — deuda de elevación/sombra detectada al revisar `GreenhouseFloatingSurface`: runtime tiene `theme.shadows`/`customShadows`, pero falta un SoT semántico Greenhouse (`floating`, `overlay`, `modal`, etc.). Recomienda ADR + TASK-1049 antes de tocar la sombra de la primitive.

## Cuándo refrescar

Crear nuevo audit (no actualizar el existente) cuando:

- Se cambia material en `mergedTheme.ts` (theme override, palette, shape)
- Se ship un pivot de fuente (como TASK-566 Inter → Geist)
- Se agrega/elimina un namespace de color (`customColors.*`, `palette.dark.*`, etc.)
- DESIGN.md sube de versión major (alpha 0.x → 1.0)
- TASK-764 (DESIGN.md hardening) cierra slice estructural

Un audit es snapshot de estado en fecha; no reemplaza specs ni tasks.
