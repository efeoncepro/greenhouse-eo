# TASK-1862 — Landing ASO — Motion Contract

## Meta

- Status: `proposed`
- Owner task: `TASK-1862`
- Motion: `microinteraction` + `scroll reveal` + una coreografía acotada en la firma.
- Primitive: CSS + `IntersectionObserver` del sitio público. **No** se usan wrappers del portal Greenhouse
  (`Motion`, `useGreenhouseGSAP`): el runtime es WordPress.
- Kinship: el reveal replica el patrón de la landing SEO (`.rv` ocultos hasta intersectar su sección, sin
  timeout global que revele todo) para que la familia se sienta igual al hacer scroll.
- Wireframe: [`TASK-1862-landing-aso.md`](../wireframes/TASK-1862-landing-aso.md)

## Intent

La motion explica una sola idea: **lo que se ve distinto en tres lugares se convierte en una decisión
ordenada**. Todo lo demás es feedback de interacción. Si una animación no explica ni confirma algo, se elimina.

## Tokens

Duraciones y curvas se toman de los tokens de motion del runtime público y de las hermanas. **[verificar]** los
nombres en `eo-elementor-widgets` y las transiciones computadas en `251078` antes de implementar.

| Rol | Duración | Curva |
|---|---|---|
| Feedback de interacción (hover, press, focus) | 120–180 ms | estándar de salida |
| Apertura de panel o disclosure | 180–240 ms | estándar |
| Reveal de sección | 400–520 ms | desaceleración |
| Stagger entre hermanos | 40–60 ms por elemento, máximo 5 | — |
| Coreografía de la firma | 700–1.000 ms en total | desaceleración |

## Inventory

| Elemento | Disparador | Propiedades | Duración | Reduced motion | Guardia de performance |
|---|---|---|---|---|---|
| Hero | Carga | `opacity`, `translateY(8px)` en el texto | 400 ms | Visible al cargar | Nunca retrasa el LCP: los marcos se pintan sin esperar |
| Marcos del hero | Carga | Aparición escalonada de los tres marcos | 3 × 60 ms | Visibles | Sin reflow |
| Línea entre puntos del hero | Tras los marcos | `stroke-dashoffset` | 420 ms, una vez | Trazo completo | SVG inline |
| Definición y qué cambió | Entrada en viewport | `opacity`, `translateY(12px)` (patrón `.rv`) | 440 ms | Visible | Observer se desconecta tras disparar |
| Items de R3 | Entrada en viewport | Stagger de `opacity` | 3 × 50 ms | Visibles | — |
| Tarjetas de R4 | Entrada en viewport | Stagger de `opacity` + `translateY(8px)` | 3 × 60 ms | Visibles | — |
| Firma: puntos | Entrada en viewport (umbral 30%) | Aparición secuencial de los cinco puntos en sus marcos | 5 × 60 ms | Todos visibles | — |
| Firma: líneas de unión | Tras los puntos | `stroke-dashoffset` entre el mismo punto en distintos marcos | 480 ms | Líneas completas | Sólo SVG inline; se omite bajo 760 px |
| Firma: lista priorizada | Tras las líneas | Tres ítems aparecen con su chip | 3 × 80 ms | Lista completa | `transform` y `opacity` |
| Panel de un punto | Enter, Espacio o clic | `opacity` + `translateY(4px)` | 200 ms | Directo | — |
| Líneas de servicio | Entrada en viewport | Stagger por línea | 5 × 50 ms | Visibles | — |
| Tabla de medición | Entrada en viewport | `opacity` de la tabla completa | 360 ms | Directo | Sin animar filas ni celdas |
| CTAs | Hover y focus | Contrato de CTA de las hermanas: color, fondo, flecha y `translateY(-1px)` | 150 ms | Sólo color y foco | — |
| CTA fijo móvil | Salir del hero / entrar a `#diagnostico` | `opacity` + `translateY(12px)` | 220 ms | Aparece y desaparece sin transición | `inert` oculto |
| FAQ | Abrir `<details>` | Disclosure nativo | Del navegador | Nativo | Sin JS |
| Selects premium | Apertura | Feedback del renderer | Del renderer | Estado final | Propiedad del renderer |
| Tarjeta del brief | Hover y focus-within | `translateY(-3px)` contenido | 180 ms | `transform: none` | Patrón de la estación de SEO |

## Choreography de la firma

1. La sección entra al viewport (umbral 30%).
2. Aparecen los cinco puntos numerados, 60 ms entre cada uno, en su marco.
3. Pausa de 160 ms.
4. Se trazan las líneas que unen el mismo tipo de punto entre marcos (por ejemplo, el precio en la respuesta del
   asistente y en la ficha).
5. Aparecen los tres ítems de la lista priorizada, en orden, cada uno con su chip de impacto y esfuerzo.
6. La animación ocurre **una sola vez** por carga y no está ligada a la posición del scroll. Los puntos no se
   mueven en el DOM.

Con reduced motion, los pasos 2 a 5 no ocurren: marcos, puntos, líneas y lista están completos desde el primer
render.

## Guardrails

- Sólo `transform` y `opacity`, más `stroke-dashoffset` en SVG inline.
- Sin scroll pinning, sin animaciones ligadas al scroll, sin marquee, sin bucles, sin autoplay.
- Los observers se desconectan después de disparar; ningún timeout global revela la página.
- Ningún contenido crítico depende de una animación para ser visible o legible.
- En 390 px: sin líneas de unión, stagger más corto y la tira de marcos sin animación horizontal.
- `prefers-reduced-motion: reduce` elimina reveals, trazos y scroll suave, y conserva contenido y estados.
- El foco, los errores y el estado del formulario nunca dependen de motion.

## GVC / Micro Evidence

- Firma en dos frames: puntos visibles antes de las líneas, y lista priorizada completa después.
- Antes de scrollear, la sección siguiente al hero está oculta; después de intersectar, resuelve a opacidad ~1
  (misma verificación que la landing SEO).
- Hover y focus de los dos CTAs del hero y del CTA fijo móvil.
- Apertura de un punto con teclado.
- CTA fijo móvil en tres estados: oculto en el hero, visible entre R2 y R11, oculto en `#diagnostico`.
- La ruta completa con reduced motion: firma completa desde el primer frame.
- LCP y CLS en 390 y 1440; ninguna animación en la ruta del LCP.
- `scrollWidth === clientWidth` durante y después de cada animación.

## Design Decision Log

| Decisión | Alternativa | Por qué |
|---|---|---|
| Reveal con el patrón `.rv` de SEO | Reveal propio | La familia se siente igual al scrollear |
| Coreografía de una sola vez | Ligada al scroll | Evita el costo de pinning y respeta al lector que vuelve |
| Líneas de unión sólo en desktop | También en 390 px | En móvil los marcos están en una tira y las líneas se cruzarían |
| Sin marquee | Marquee de consultas como el de SEO | Un bucle no explica nada en esta página |
| CSS + IntersectionObserver | GSAP | El comportamiento es simple y el runtime público no necesita la dependencia |
