# TASK-1801 — Selector premium de país

## Rigor y fuente

- Rigor: `ui-platform` acotado; extiende un control portable y lo activa en Contacto.
- Dirección: `source-led`, basada en la anotación del formulario móvil de `/contacto/` del 2026-09-15.
- Problema observado: `País` es un input de texto sin affordance de selección, bandera ni catálogo.

## Alternativas

1. **Elegida — opt-in del renderer por campo.** Reusa el listbox premium y agrega metadata ISO browser-safe,
   bandera SVG de `circle-flags` y typeahead. Preserva `hubspot_pillar` y el valor del formulario.
2. Cambiar todo Contacto a `diagnostic_premium`. Rechazada: altera radio cards, densidad y CTA sin relación con
   el campo solicitado.
3. Decorar un select desde WordPress. Rechazada: duplica estado e interacción en el host y rompe API parity.

## Contrato visual y responsive

- Trigger de una línea: bandera circular de 26 px, nombre completo y un solo caret.
- Lista: bandera de 28 px, nombre como semántica principal, check + superficie tonal para selección.
- Desktop: conserva la columna del campo junto al teléfono; el overlay queda por encima de filas siguientes.
- Mobile 390: ancho completo, target mínimo de 48 px, texto sin truncar para los países prioritarios y sin
  overflow horizontal.

## Estados y accesibilidad

- Placeholder: `Selecciona tu país`; campo opcional.
- `role=combobox`, `aria-expanded`, `aria-controls`, `role=listbox` y `role=option` quedan en el renderer.
- Teclado: flechas, Home, End, Enter, Espacio, Escape y typeahead sin tildes.
- La bandera es decorativa (`alt=""`); el nombre visible conserva toda la información.
- Reduced motion mantiene los mismos estados finales.

## Mapping

- Recipe/primitive: `<greenhouse-form>` + listbox premium existente, decisión `extend`.
- Tokens: `--ghf-field-bg`, `--ghf-border`, `--ghf-fg`, `--ghf-muted`, `--ghf-accent`, `--ghf-focus`.
- Assets: `circle-flags@2.8.3`, publicados desde el mismo host del renderer; sin CDN.
- Activación: versión inmutable de `efeonce-contacto`; WordPress no cambia.

## Verificación requerida

- Tests de contrato + renderer y build del bundle.
- Preview real a 1440 y 390 con dropdown abierto, teclado, selección y persistencia.
- `scrollWidth === clientWidth`, stacking, foco, contraste y ausencia de errores de consola.
- Readback público por `form_key` después de desplegar renderer y antes de cerrar la versión del form.
