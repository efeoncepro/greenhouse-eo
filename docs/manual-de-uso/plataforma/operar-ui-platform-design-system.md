# Operar UI Platform y Design System

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** UI Platform / Design System
> **Rutas:** `/admin/design-system`, `/admin/design-system/colors`, `/admin/design-system/*`
> **Documentacion relacionada:** `docs/documentation/plataforma/ui-platform-design-system-end-to-end.md`, `docs/documentation/plataforma/design-handoff-control-plane.md`

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

## Operar handoffs de diseño producto

1. Abre `/design-system/handoff`.
2. Usa el ledger para revisar handoffs que requieren acción, están listos para review o fueron implementados recientemente.
3. En `Allowlist`, aprueba el `file_key` de un archivo Figma de producto antes de registrar nodos. No uses nodos del master AXIS.
4. En `Nuevo nodo`, pega una URL de selección Figma desde un archivo allowlisted y registra el handoff como `Página` o `Componente`; el backend crea el primer snapshot de verificación del nodo en el mismo comando.
5. Abre una entrada del ledger para asignar owners, prioridad, target surface, links, evidencia y re-verificación del nodo Figma cuando haya drift o cambios de diseño.
6. En `Primitive governance`, registra la estrategia de implementación: `route_only`, `reuse_primitive`, `extend_primitive`, `new_primitive`, `variant_kind` o `research_required`.
7. Completa primitive key, variant/kind, Lab, runtime route, GVC, docs, rationale, owner o fecha según la estrategia. Los chips de warning indican qué falta.
8. DEV pasa el handoff por `En implementación` -> `En revisión` -> `Implementado`. El cierre requiere ruta interna real, evidencia runtime/GVC o excepción gobernada, y una decisión Primitive governance resuelta.

Si el allowlist está vacío, la vista debe permanecer fail-closed: se puede inspeccionar el carril, pero no registrar nodos reales hasta aprobar un `file_key` de producto.

Si una entry está como `research_required`, no se debe cerrar como implementada hasta convertirla a una estrategia final. Si una entry es `new_primitive`, debe tener Lab, docs y GVC antes del cierre.

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
