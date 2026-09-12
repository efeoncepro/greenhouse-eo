# TASK-1865 — Landing Performance Marketing — Motion Contract

## Meta

- Status: `proposed`
- Owner task: `TASK-1865`
- Motion: `microinteraction` + `scroll reveal` + dos coreografías acotadas: el recorrido de la señal en el hero y el
  reordenamiento de la firma.
- Primitive: CSS + `IntersectionObserver` del sitio público, más FLIP con Web Animations API para el reordenamiento. **No**
  se usan wrappers del portal Greenhouse (`Motion`, `useGreenhouseGSAP`): el runtime es WordPress.
- Wireframe: [`TASK-1865-landing-performance-marketing.md`](../wireframes/TASK-1865-landing-performance-marketing.md)

## Intent

La motion explica una sola idea: **el resultado vuelve a la plataforma y cambia a quién le da el presupuesto**. En el
hero la señal recorre el circuito una vez y vuelve; en la firma, cambiar lo que aprende la plataforma reordena las
campañas. Todo lo demás es feedback de interacción. Si una animación no explica ni confirma algo, se elimina.

## Tokens

Duraciones y curvas se toman de los tokens de motion del runtime público. **[verificar]** los nombres exactos en
`eo-elementor-widgets` antes de implementar. Rangos de referencia:

| Rol | Duración | Curva |
|---|---|---|
| Feedback de interacción (hover, press, focus) | 120–180 ms | estándar de salida |
| Cambio de estado del control segmentado | 180 ms | estándar |
| Reordenamiento de la firma (FLIP) | 360–420 ms | desaceleración |
| Cambio de largo de las barras | 360 ms, en paralelo al FLIP | desaceleración |
| Reveal de sección | 400–520 ms | desaceleración |
| Stagger entre elementos hermanos | 40–60 ms por elemento, máximo 6 | — |
| Recorrido de la señal en el hero | 1.200 ms en total, una vez | estándar |

## Inventory

| Elemento | Disparador | Propiedades | Duración | Reduced motion | Guardia de performance |
|---|---|---|---|---|---|
| Hero, columna de texto | Carga | `opacity`, `transform: translateY(8px)` | 400 ms | Visible al cargar | Nunca retrasa el LCP: el H1 se pinta sin esperar la animación |
| Circuito: líneas | Carga | Trazo con `stroke-dashoffset` | 600 ms | Trazo completo | Sólo SVG inline |
| Circuito: punto de señal | Tras el trazo | Un punto recorre los cuatro nodos y vuelve por el arco | 1.200 ms, una vez | Sin punto; arco de retorno ya destacado | `transform` sobre un único elemento; sin bucle |
| Circuito: arco de retorno | Cuando el punto lo recorre | Aumento de grosor y color primario | 240 ms | Estado final directo | — |
| Banda de definición y problema | Entrada en viewport | `opacity`, `translateY(12px)` | 440 ms | Visible | Observer se desconecta tras disparar |
| Bloques de 2026 | Entrada en viewport | Stagger de `opacity` + `translateY(8px)` | 3 × 60 ms | Visibles | — |
| Firma: control segmentado | Cambio de opción | Desplazamiento del indicador de selección | 180 ms | Cambio directo | — |
| Firma: lista | Cambio de opción | FLIP: cada fila se mueve de su posición anterior a la nueva con `transform` | 360–420 ms | Reordenamiento instantáneo | `transform` y `opacity` únicamente; interrumpible |
| Firma: barras | Cambio de opción | `transform: scaleX()` desde el origen izquierdo | 360 ms | Largo final directo | Sin animar `width` |
| Firma: leyenda del estado | Cambio de opción | Cruce de `opacity` | 180 ms | Cambio directo | El texto nunca baja de contraste AA durante la transición |
| Dos formas de trabajar | Entrada en viewport | Las dos columnas entran juntas | 440 ms | Visibles | Sin stagger entre columnas: ninguna tiene prioridad |
| Módulos | Entrada en viewport | Stagger | 6 × 50 ms | Visibles | — |
| Canales | Entrada en viewport | Stagger por columna, no por canal | 2 × 60 ms | Visibles | Con ocho canales, animar cada uno es ruido |
| Escalera: línea de conexión | Entrada en viewport | Trazo de izquierda a derecha | 480 ms | Línea completa | Se omite bajo 760 px |
| Chips de canal | Hover y focus del canal | Cambio de fondo tonal | 150 ms | Sólo color y foco | — |
| CTAs | Hover y focus | `transform: translateY(-1px)` + sombra contenida | 150 ms | Sólo cambio de color y foco | — |
| Dock | Salir del hero / entrar a R14 | `opacity` + `translateY(12px)` | 220 ms | Aparece y desaparece sin transición | `inert` mientras está oculto |
| FAQ | Abrir `<details>` | Disclosure nativo | Del navegador | Nativo | Sin JS |
| Selects premium | Apertura | Feedback del renderer | Del renderer | Estado final completo | Propiedad del renderer |

## Choreography

### Hero — recorrido de la señal

1. El H1, el cuerpo y los CTAs se pintan de inmediato; la columna de texto sólo hace su reveal de 400 ms.
2. Las líneas del circuito se trazan en 600 ms.
3. Un punto sale de `Anuncio`, pasa por `Visita` y `Venta u oportunidad` y vuelve por el arco hasta
   `La plataforma aprende`, en 1.200 ms.
4. Al pasar por el arco, este queda destacado en azul primario y más grueso. Ese es el estado final.
5. Ocurre **una sola vez** por carga de página; no se repite al volver al hero.

### Firma — cambiar la señal

1. El usuario cambia el control de `Clics` a `Ventas`, o al revés.
2. El indicador del control se desplaza en 180 ms.
3. Se mide la posición de cada fila antes y después del cambio del DOM; cada fila se anima desde su posición anterior con
   `transform` (FLIP), en 360–420 ms.
4. En paralelo, cada barra cambia de largo con `scaleX()` y la leyenda del estado cruza su texto.
5. La región `aria-live` anuncia el nuevo primer lugar al terminar el cambio del DOM, no al terminar la animación.
6. Si el usuario vuelve a cambiar antes de que termine, la animación en curso se interrumpe y parte desde la posición
   actual; nunca se encola.

Con reduced motion, los pasos 2 a 4 ocurren de forma instantánea: el control, la lista, las barras y la leyenda muestran el
estado final en el mismo frame.

## Guardrails

- Sólo `transform` y `opacity`, más `stroke-dashoffset` en SVG inline.
- Sin scroll pinning ni animaciones ligadas a la posición del scroll.
- Sin bucles infinitos, sin autoplay de video o audio, sin cambio automático de la firma.
- Sin contadores animados en ninguna región.
- Los observers se desconectan después de disparar.
- Ningún contenido crítico depende de una animación para ser visible o legible; la lista de la firma es correcta en el DOM
  antes de que empiece la animación.
- En 390 px se reduce la densidad: sin la línea de la escalera y con stagger más corto.
- `prefers-reduced-motion: reduce` elimina reveals, trazos, el recorrido de la señal, el FLIP y el scroll suave,
  conservando contenido y estados.
- El foco, los errores y el estado del formulario nunca dependen de motion.

## GVC / Micro Evidence

- Hero en dos frames: al cargar y con el arco de retorno ya destacado.
- Firma en tres frames: `Clics`, a mitad del reordenamiento y `Ventas`.
- La firma cambiada dos veces seguidas con teclado, para verificar que la animación se interrumpe sin saltos.
- Hover y focus de ambos CTAs, del CTA del dock y de un chip de canal.
- Dock en tres estados: oculto en el hero, visible entre R2 y R14, oculto en R14.
- La misma ruta con reduced motion: circuito con el arco destacado y firma sin transición.
- Medición de LCP y CLS en 390 y 1440; confirmar que el recorrido de la señal no entra en la ruta del LCP y que el FLIP no
  produce CLS.
- `scrollWidth === clientWidth` durante y después de cada animación.

## Design Decision Log

| Decisión | Alternativa | Por qué |
|---|---|---|
| Recorrido de la señal una sola vez | Bucle continuo en el hero | Un bucle compite con los CTAs y es motion ambiental, fuera del estándar premium |
| FLIP con `transform` | Animar `top` o reordenar con altura | Mantiene la animación en el compositor y sin reflow |
| Firma iniciada por el usuario | Cambio automático al entrar en viewport | Mover contenido sin intención confunde a lectores de pantalla y a quien está leyendo |
| Anuncio live al cambiar el DOM | Al terminar la animación | El significado no puede esperar a la motion |
| Barras con `scaleX()` | Animar `width` | Evita layout en cada frame |
| CSS + IntersectionObserver + WAAPI | GSAP | El comportamiento es acotado y el runtime público no necesita la dependencia |
| Stagger por columna en canales | Stagger por canal | Con ocho canales, animar cada uno es ruido |
