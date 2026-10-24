# TASK-2052 — AXIS: botón con texto que rueda y flecha dibujada, segmentado HTML y buscador con haz — wireframe

> Superficie: paquetes AXIS (`@efeoncepro/axis-tokens`, `@efeoncepro/axis-primitives`, `@efeoncepro/axis-ui-contracts`)
> y su Lab; primer consumidor: la portada del blog v3 (TASK-2051). Fuente: tablero `Botones.dc.html` y las secciones
> «Pregúntale al blog» y «Archivo» del canvas v3 (`docs/ui/visual-directions/TASK-2051-blog-portada-v3/`).

## Visual Direction Contract

- **Fuente:** `source-led`, el canvas aprobado (`Botones.dc.html` muestra reposo, hover, foco, presionado,
  seleccionado, deshabilitado, cargando y listo lado a lado sobre oscuro y sobre papel).
- **Targets:** Lab de AXIS a 1440 y 390; el consumidor del blog a los mismos anchos.
- **Jerarquía:** el color va a la acción (tono de marca por línea); los secundarios quedan neutros.
- **Visual fidelity mapping:**
  - Botón: píldora 999 px; `ab` 48 px / `ab--xl` 52 px; 15 px Poppins 500 (xl 600); relleno `.75rem 1.125rem .75rem 1.375rem`
    (xl `0 1.25rem 0 1.5rem`, gap `.75rem`); tonos neutral `#f7f8f6`→hover `#fff`, navy `#023c70`→`#012f58`,
    brand `#36c8bf`→`#73d5cd`→active `#a1e1db`, engine `#0375db`→`#0262b9`→`#014f97`, glitch `#6ec207`→`#8bd13a`→`#a6dd68`;
    presionado `scale(.95)` con rebote `cubic-bezier(0.34,1.56,0.64,1)` 450 ms.
  - Texto que rueda: doble línea en `.roll__in`, `translateY(-50%)` en hover (con `@media (hover:hover)`) y en foco visible.
  - Flecha dibujada: SVG 20 px, palo `pathLength=1` con `stroke-dasharray .5 2` en reposo → `1 2` y `translateX(3px)` en
    hover/foco; presionado 5 px.
  - Segmentado: riel píldora, indicador navy que se desliza 300 ms, botones `aria-pressed`.
  - Buscador: píldora 84 px (64 en teléfono), borde 1,5 px navy; al foco, anillo de luz conic continuo (6,4 s), cometa
    SVG por el perímetro a velocidad constante (3,2 s), aura que respira (3,2 s) y engrosado al teclear.
- **GVC:** `qualityProfile: premium`; dossier del Lab; scroll-width en 390.

## Layout

### Escritorio

```
Lab /references/buttons/  → fila «Pruébalo» + matriz de estados (oscuro | papel) por tono
Lab /references/forms/segmented/ → riel con 4 años y conteo
Lab /references/forms/search-beam/ → buscador en reposo / foco / tecleando / movimiento reducido
```

### Teléfono

Las mismas matrices apiladas; el buscador a 64 px.

## Content Slots

| Pieza | Slots |
|---|---|
| Botón | texto, flecha (on/off), tono, tamaño, estado (`is-loading`, `aria-disabled`, `is-done`) |
| Segmentado | opciones (etiqueta + conteo), seleccionada |
| Buscador | etiqueta accesible, placeholder, botón de envío |

## States

- Reposo, hover, foco visible, presionado, seleccionado, deshabilitado, cargando (loader de la órbita), listo.
- Movimiento reducido: sin rueda ni dibujo (cambio instantáneo); buscador con anillo estático y aura fija.
- Sin JS: botón y segmentado funcionan como enlaces/radios; el buscador es un formulario GET.

## Implementation Mapping

- `packages/tokens/src/button.ts`: `arrowMotion` gana el modo `draw` (además de `nudge`) y `textMotion: roll`.
- `packages/primitives/src/button-css.ts` y `button.ts`: clases y HTML del texto que rueda y la flecha dibujada.
- Nuevo `packages/primitives/src/segmented.ts` + `segmented-css.ts` (HTML + JS mínimo, sin React).
- Nuevo `packages/primitives/src/search-beam.ts` + `search-beam-css.ts`.
- Contratos en `packages/contracts` (`efeonce.button` extendido; `efeonce.segmented` y `efeonce.search-field` candidatos).
- Ledger de la línea gráfica: excepción del aura acotada al foco del buscador web.

## GVC Scenario Plan

- Lab local de AXIS a 1440 y 390; capturas de cada matriz en reposo y en hover/foco forzados.
- Comparación contra `Botones.dc.html` y las secciones del canvas: ≤ 1 % por matriz.
- Corrida con movimiento reducido.

## Design Decision Log

- **Decisión:** nacer en AXIS y vendorizar al sitio (no copias a mano por landing).
- **Alternativas:** dejar las piezas en el plugin del blog (duplicaría lógica en la siguiente landing).
- **Por qué:** son mecanismos de uso general (botón, segmentado, buscador).
- **Riesgo:** el aura contradice `criteria.md` (sin glow); se registra como excepción aprobada y acotada.
