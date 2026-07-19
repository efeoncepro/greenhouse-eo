# Operar UI Platform y Design System

> **Tipo de documento:** Manual de uso
> **Version:** 1.2
> **Creado:** 2026-06-15 por Codex
> **Modulo:** UI Platform / Design System
> **Rutas:** `/admin/design-system`, `/admin/design-system/colors`, `/admin/design-system/*`
> **Documentacion relacionada:** `docs/documentation/plataforma/ui-platform-design-system-end-to-end.md`, `docs/documentation/plataforma/design-handoff-control-plane.md`

## Antes de construir UI

1. Invoca `greenhouse-ai-design-studio` y registra la Visual Direction aplicable.
2. Lee `DESIGN.md` y `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`.
3. Elige un recipe en `docs/ui/recipes/` y una composición de Composition Shell.
4. Busca si ya existe primitive o pattern; si hay Figma/Claude Design, mapea la intención a tokens y primitives.
5. Define jerarquía de acciones, contenido real y estados: loading, empty, error, degraded, ready.
6. Diseña el first fold con máximo tres superficies `contained` y un momento visual dominante.
7. Registra wireframe, flow y motion según corresponda antes de JSX.

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

1. Ejecuta `pnpm design-contract:lint --task TASK-###`.
2. Ejecuta `pnpm ui:code-lint --changed`.
3. Captura un scenario con `quality.profile='premium'` en desktop y 390 px.
4. Abre los PNG y el review dossier; revisa first fold, jerarquía, economía de superficies, impacto visual, responsive, motion, contraste y estados.
5. Ejecuta `pnpm ui:visual-gate --task TASK-###` y `pnpm ui:quality --task TASK-###`.
6. Repite mientras la media sea `<4.5`, alguna dimensión sea `<4`, o jerarquía/economía de superficies/impacto visual/fidelidad/resistencia genérica sea `<4.5`.
7. Mide `scrollWidth === clientWidth` en desktop y 390 px; `fullPage` no demuestra ausencia de overflow.

## Usar el secondary Tidal Teal

1. Confirma que el elemento sea una acción de apoyo, selección contextual o énfasis secundario de marca. Si representa éxito, información, advertencia o error, usa el token semántico correspondiente.
2. En componentes Greenhouse usa `kind='secondaryAction'` o `tone='secondary'`; en MUI usa `color='secondary'` únicamente cuando el rol sea realmente secondary.
3. Para estilos compuestos consume `theme.palette.secondary.main|light|dark|contrastText`. No selecciones a mano un paso del ramp para un consumer normal.
4. Reserva `theme.axis.ramp.secondary` para labs, series de charts deliberadas o trabajo explícito con el ramp.
5. Revisa `/admin/design-system/colors`, Buttons y Chips en light/dark antes de aprobar un cambio que toque secondary.
6. Corre el scenario `design-system-colors` en desktop y 390 px; confirma contraste, ausencia de overflow y que secondary no compita con el CTA primario.

Rollback de emergencia: definir `NEXT_PUBLIC_GREENHOUSE_SECONDARY_TEAL_ENABLED=false` y ejecutar un build nuevo restaura el Azure legacy. No es un selector de tema ni un permiso para reintroducir lime; cualquier uso debe registrarse en `Handoff.md` y el ledger de flags.

### Stop conditions

- Más de tres superficies `contained` en el first fold normal.
- Card dentro de card sin frontera semántica o cambio de interacción.
- Mobile convertido en una lista serial de los mismos containers de desktop.
- Ningún elemento domina la primera lectura o comunica la decisión principal.
- Todas las secciones comparten la misma geometría, elevación y peso visual.
- El dossier o un frame tiene findings de contraste, runtime, keyboard, overflow o enterprise rubric.

## Que no hacer

- No inventar grids/layouts paralelos si Composition Shell aplica.
- No crear cards que solo se ven bien en un ancho.
- No usar card como wrapper universal ni maquillar card wallpaper variando sombras o radios.
- No aceptar una UI porque "se ve limpia" si no tiene impacto, profundidad y una composición task-native.
- No hardcodear colores HEX ni font families.
- No usar Tidal Teal como sinónimo de success ni como segundo CTA primario contained.
- No reintroducir el lime retirado desde un mock, Figma o una regeneración de tokens.
- No importar `@floating-ui/react` o `gsap` directo en views de producto.
- No declarar UI lista sin evidencia visual si toca pantalla visible.

## Problemas comunes

### Figma no coincide con runtime

Figma es intencion. Mapea a tokens y primitives; runtime gana si hay conflicto.

### Hay overflow horizontal

Revisa `minWidth: 0`, `overflowX: clip/auto`, grids `minmax(0, 1fr)` y contenedores Recharts/sr-only.

### No se si crear primitive

Si se repetira, es platform-level o tiene estados/a11y complejos, crea/expande primitive. Si es one-off real, mantenlo local pero tokenizado.
