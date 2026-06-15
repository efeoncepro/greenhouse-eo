# Operar UI Platform y Design System

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** UI Platform / Design System
> **Rutas:** `/admin/design-system`, `/admin/design-system/colors`, `/admin/design-system/*`
> **Documentacion relacionada:** `docs/documentation/plataforma/ui-platform-design-system-end-to-end.md`

## Antes de construir UI

1. Lee `DESIGN.md`.
2. Busca si ya existe primitive o pattern.
3. Si hay Figma, mapea tokens; no copies HEX/px crudos.
4. Decide si la pantalla usa Composition Shell.
5. Define states: loading, empty, error, degraded, ready.

## Usar Design System

1. Abre `/admin/design-system`.
2. Busca la familia: colors, buttons, chips, composition shell, card density, motion, Nexa, etc.
3. Abre el lab correspondiente.
4. Revisa props, variants y kinds documentados.
5. Usa la primitive desde `@/components/greenhouse/primitives` cuando exista.

## Crear o extender una primitive

1. Confirma que no existe primitive equivalente.
2. Crea o extiende en `src/components/greenhouse/primitives/**`.
3. Exporta en el barrel.
4. Define variants funcionales y kinds semanticos.
5. Agrega lab en `/admin/design-system/<slug>`.
6. Declara route reachability.
7. Documenta en `ui-platform/PRIMITIVES.md` o doc tematico.
8. Captura con GVC desktop/mobile.

## Validar visualmente

1. Ejecuta `pnpm fe:capture --route=/ruta --env=local` o scenario existente.
2. Abre frames PNG y revisa layout, overflow, textos y estados.
3. Repite hasta que se vea enterprise.
4. Para scroll horizontal, mide `scrollWidth > clientWidth`; fullPage no basta.

## Que no hacer

- No inventar grids/layouts paralelos si Composition Shell aplica.
- No crear cards que solo se ven bien en un ancho.
- No hardcodear colores HEX ni font families.
- No importar `@floating-ui/react` o `gsap` directo en views de producto.
- No declarar UI lista sin evidencia visual si toca pantalla visible.

## Problemas comunes

### Figma no coincide con runtime

Figma es intencion. Mapea a tokens y primitives; runtime gana si hay conflicto.

### Hay overflow horizontal

Revisa `minWidth: 0`, `overflowX: clip/auto`, grids `minmax(0, 1fr)` y contenedores Recharts/sr-only.

### No se si crear primitive

Si se repetira, es platform-level o tiene estados/a11y complejos, crea/expande primitive. Si es one-off real, mantenlo local pero tokenizado.
