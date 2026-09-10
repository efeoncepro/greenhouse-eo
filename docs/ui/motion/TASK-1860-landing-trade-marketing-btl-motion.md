# TASK-1860 — Landing Trade Marketing & BTL — Motion Contract

## Meta

- Status: `proposed`
- Owner task: `TASK-1860`
- Motion: `microinteraction` + `scroll reveal` + una coreografía acotada en la firma.
- Primitive: CSS + `IntersectionObserver` del sitio público. **No** se usan wrappers del portal Greenhouse
  (`Motion`, `useGreenhouseGSAP`): el runtime es WordPress.
- Wireframe: [`TASK-1860-landing-trade-marketing-btl.md`](../wireframes/TASK-1860-landing-trade-marketing-btl.md)

## Intent

La motion existe para explicar una sola idea: **lo que se ve en la góndola se convierte en una decisión
ordenada**. Todo lo demás es feedback de interacción. Si una animación no explica ni confirma algo, se elimina.

## Tokens

Duraciones y curvas se toman de los tokens de motion del runtime público. **[verificar]** los nombres exactos en
`eo-elementor-widgets` antes de implementar. Rangos de referencia:

| Rol | Duración | Curva |
|---|---|---|
| Feedback de interacción (hover, press, focus) | 120–180 ms | estándar de salida |
| Apertura de panel o disclosure | 180–240 ms | estándar |
| Reveal de sección | 400–520 ms | desaceleración |
| Stagger entre elementos hermanos | 40–60 ms por elemento, máximo 6 | — |
| Coreografía de la firma | 600–900 ms en total | desaceleración |

## Inventory

| Elemento | Disparador | Propiedades | Duración | Reduced motion | Guardia de performance |
|---|---|---|---|---|---|
| Hero | Carga | `opacity`, `transform: translateY(8px)` | 400 ms | Visible al cargar | Nunca retrasa el LCP: la ilustración se pinta sin esperar la animación |
| Puntos de lectura del hero | Carga | Un único pulso de escala 1→1,08→1 | 520 ms, una vez | Sin pulso | Sin bucle infinito |
| Banda de definición y problema | Entrada en viewport | `opacity`, `translateY(12px)` | 440 ms | Visible | Observer se desconecta tras disparar |
| Tabla de posición | Entrada en viewport | Columna Efeonce: `opacity` + énfasis de superficie | 360 ms | Estado final directo | Sin reflow de tabla |
| Pasos del ciclo | Entrada en viewport | Stagger de `opacity` + `translateX(8px)` | 5 × 50 ms | Visibles | — |
| Flecha de retorno del ciclo | Tras el último paso | Trazo de línea con `stroke-dashoffset` | 480 ms | Trazo completo | Sólo SVG inline |
| Firma: puntos de lectura | Entrada en viewport | Aparición secuencial de los seis puntos | 6 × 60 ms | Todos visibles | — |
| Firma: transformación a lista | Tras los puntos | Tres puntos se desplazan hacia su ítem de la lista y el ítem aparece | 700 ms total | Lista completa visible, sin desplazamiento | `transform` y `opacity` únicamente |
| Panel de un punto | Enter, Espacio o clic | `opacity` + `translateY(4px)` | 200 ms | Aparece directo | — |
| Grupos de servicios | Entrada en viewport | Stagger por grupo, no por servicio | 4 × 60 ms | Visibles | — |
| Conexión digital | Entrada en viewport | Línea que parte en la góndola hacia los tres bloques | 520 ms | Línea completa | Se omite bajo 760 px |
| CTAs | Hover y focus | `transform: translateY(-1px)` + sombra contenida | 150 ms | Sólo cambio de color y foco | — |
| Dock | Salir del hero / entrar a R13 | `opacity` + `translateY(12px)` | 220 ms | Aparece y desaparece sin transición | `inert` mientras está oculto |
| FAQ | Abrir `<details>` | Disclosure nativo | Del navegador | Nativo | Sin JS |
| Selects premium | Apertura | Feedback del renderer | Del renderer | Estado final completo | Propiedad del renderer |

## Choreography de la firma

1. La sección entra al viewport (umbral 30 %).
2. Aparecen los seis puntos numerados sobre la góndola, en orden, 60 ms entre cada uno.
3. Pausa de 200 ms.
4. Los puntos 1, 5 y 2 —los que corresponden a los tres ítems priorizados— se desplazan visualmente hacia la
   lista y cada ítem aparece con su chip de impacto y costo.
5. Los puntos quedan en su lugar sobre la góndola; el desplazamiento es sólo un indicio visual, no mueve el DOM.
6. La animación ocurre **una sola vez** por carga de página y no está ligada a la posición del scroll.

Con reduced motion, los pasos 2 a 5 no ocurren: la góndola, los seis puntos y la lista priorizada están
completos desde el primer render.

## Guardrails

- Sólo `transform` y `opacity`, más `stroke-dashoffset` en SVG inline.
- Sin scroll pinning ni animaciones ligadas al scroll.
- Sin bucles infinitos ni autoplay de video o audio.
- Los observers se desconectan después de disparar.
- Ningún contenido crítico depende de una animación para ser visible o legible.
- En 390 px se reduce la densidad: sin la línea de conexión digital y con stagger más corto.
- `prefers-reduced-motion: reduce` elimina reveals, pulsos, trazos y scroll suave, conservando el contenido y los
  estados.
- El foco, los errores y el estado del formulario nunca dependen de motion.

## GVC / Micro Evidence

- Firma en dos frames: puntos visibles antes de la transformación y lista priorizada después.
- Hover y focus de ambos CTAs y del CTA del dock.
- Apertura de un punto de lectura con teclado.
- Dock en tres estados: oculto en el hero, visible entre R2 y R13, oculto en R13.
- La misma ruta con reduced motion: la firma completa desde el primer frame.
- Medición de LCP y CLS en 390 y 1440; confirmar que ninguna animación entra en la ruta del LCP.
- `scrollWidth === clientWidth` durante y después de cada animación.

## Design Decision Log

| Decisión | Alternativa | Por qué |
|---|---|---|
| Coreografía de una sola vez | Animación ligada al scroll | Evita el costo de pinning visto en Content Marketing y respeta al lector que vuelve |
| Transformación sólo visual | Reordenar el DOM | La lista priorizada debe existir siempre para lectores de pantalla y para el schema |
| Pulso único en el hero | Pulso en bucle | Un bucle distrae y compite con los CTAs |
| CSS + IntersectionObserver | GSAP | El comportamiento es simple y el runtime público no necesita la dependencia |
| Stagger por grupo de servicios | Stagger por servicio | Con 23 servicios, animar cada uno es ruido |
