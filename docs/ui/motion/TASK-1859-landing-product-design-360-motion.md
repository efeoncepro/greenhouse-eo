# TASK-1859 — Landing de capacidad de diseño Motion Contract

## Meta

- Status: `draft — inventario y restricciones fijados; valores sujetos a la dirección visual`
- Owner task: `TASK-1859 — Landing pública de capacidad de diseño (superficie de producto de Product Design 360)`
- Related wireframe: [docs/ui/wireframes/TASK-1859-landing-product-design-360.md](../wireframes/TASK-1859-landing-product-design-360.md)
- Related flow: [docs/ui/flows/TASK-1859-landing-product-design-360-flow.md](../flows/TASK-1859-landing-product-design-360-flow.md)
- Motion type: `restrained — feedback and orientation only`
- Primary primitive / library: CSS con alcance a la raíz de la página + un `IntersectionObserver` para revelados; sin librerías de animación.
- Copy source: Copy Ledger del wireframe.

## Motion Brief

- Primary user: Head of Design evaluando si Efeonce sabe de oficio de diseño y de accesibilidad.
- Motion intent: **demostrar control, no espectáculo.** La página vende design system y accesibilidad; su motion debe verse como el de un sistema bien gobernado: breve, consistente, predecible y completamente prescindible sin perder significado.
- Uncertainty reduced: que un CTA respondió, dónde está el foco, a qué región llevó un ancla.
- User decision supported: confiar lo suficiente como para agendar una reunión.
- Non-goals: marquee, contadores animados, video en el hero, scroll-jacking, parallax, animaciones infinitas, contenido oculto esperando a JavaScript, librerías GSAP/Lottie/Framer.

**La restricción es la señal de oficio.** En una landing de diseño, cada animación gratuita es un argumento en contra: le muestra al comprador exactamente el tipo de decisión que no queremos que asocie con nosotros.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Copy del hero | primer render | entrada escalonada breve desde un estado **ya visible** (opacidad ≥ 0,85) | CSS | opcional |
| Esquema de la región 3 | entrada al viewport | las dos filas se completan una vez; nunca en bucle | CSS + IntersectionObserver | opcional, sujeto a dirección visual |
| Tarjetas de frentes (región 5) | hover / focus | leve elevación y cambio de borde; **el foco produce el mismo efecto que el hover** | CSS | sí |
| Revelado de regiones | entrada al viewport | ajuste sutil desde estado visible; nunca desde `opacity:0` | CSS + IntersectionObserver | opcional |
| Cifras de la región 6 | ninguno | **sin animación de valor**; como mucho, el mismo revelado de región | — | — |
| CTAs | hover / focus / active | cambio de fondo, desplazamiento del ícono de flecha, anillo de foco | CSS | sí |
| Preguntas frecuentes | click / teclado | rotación del ícono; apertura del panel | CSS | sí |
| Desplazamiento por ancla | click en ancla | desplazamiento suave con margen superior del header | CSS `scroll-behavior` | sí |
| Scheduler | apertura / cierre | lo define el componente nativo; la landing no agrega motion | nativo | — |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| CTA primario | fondo de marca, texto con contraste AA | fondo más intenso, flecha avanza | anillo de foco ≥ 3:1, mismo estado que hover | sombra reducida, sin destello | — | estado pendiente mientras monta el scheduler; sin doble activación | lo resuelve el scheduler |
| CTA secundario / enlace | texto subrayado | subrayado y color | anillo de foco visible | presión del navegador | — | — | — |
| Tarjeta de frente | plana | elevación leve | **idéntica al hover** | — | — | — | — |
| Pregunta frecuente | cerrada | realce del borde | anillo de foco | toggle | abierta, ícono rotado | — | — |
| Enlace de costura | texto | subrayado | anillo de foco | — | — | — | — |

## Transition Specs

Los valores son **provisionales**: se mapean a los tokens de motion del sitio público de Efeonce cuando la dirección visual los fije. Si esos tokens no existen, se declaran con alcance a la página y se registran para extracción (patrón `TASK-1350`).

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Entrada del hero | render | asentado | corto, ~400–600 ms; desaceleración (`cubic-bezier(.2,0,0,1)` provisional) | escalonado por bloque; sólo `transform` y `opacity` | contenido asentado de inmediato |
| Revelado de región | cerca del viewport | asentado | ~500–700 ms, misma curva | se ejecuta una vez por región | sin transformación, visible |
| Esquema región 3 | fuera | completo | ~800–1000 ms, una sola vez | filas se completan; nunca se repite | estado final estático |
| Hover/focus de tarjeta | idle | elevado | ~150–200 ms | `transform: translateY()` pequeño | cambio de borde sin movimiento |
| Hover/focus de CTA | idle | activo | ~150–200 ms | fondo + flecha | cambio de color sin desplazamiento |
| Toggle de pregunta | cerrada | abierta | ~150–200 ms | rotación del ícono | cambio instantáneo |
| Desplazamiento por ancla | posición | región | comportamiento del navegador | con `scroll-margin-top` ≥ altura del header | salto instantáneo |

## Primitive & Token Mapping

- Primitive: widgets públicos de `eo-elementor-widgets` con CSS y JS con alcance a la raíz de la página.
- Imports allowed: CSS y un script pequeño con `IntersectionObserver`; APIs nativas del navegador.
- Imports forbidden: GSAP, Lottie, Framer Motion, bundles de React para esta página; runtime de prototipo (`x-import`, `sc-if`, `_ds_bundle`, `support.js`).
- Timing tokens: tokens de motion del sitio público `[verificar existencia]`; provisionales por página si no existen.
- Easing tokens: una sola curva de desaceleración para entradas y una para interacciones; nada de rebotes ni resortes.
- Layout animation: ninguna; dimensiones estables, movimiento sólo por `transform`.
- CSS properties: `transform`, `opacity`, `background-color`, `border-color`. Prohibido animar `top`, `left`, `width`, `height` o `margin`.
- GSAP/Lottie justification: no se usan. La página no necesita coreografía; necesita demostrar contención.

## Reduced Motion Contract

- Detection: `@media (prefers-reduced-motion: reduce)` en CSS **y** atributo `data-motion="off"` en la raíz, fijado por JS, para cubrir ambos caminos.
- Replacement behavior: todo el contenido visible y asentado desde el primer render; transiciones desactivadas; desplazamientos instantáneos.
- Meaning preserved: ningún elemento transmite significado sólo con movimiento; el esquema de la región 3 tiene su equivalente textual.
- Animations removed: entrada del hero, revelados de región, esquema de la región 3, elevación de tarjetas, desplazamiento de flecha, rotación de íconos, desplazamiento suave.
- Animations retained: indicación nativa de foco y cambios de estado instantáneos.

## Accessibility & Feedback

- **Sin movimiento automático prolongado** (WCAG 2.2.2): ningún elemento se mueve por sí solo más de 5 segundos. No hay marquee ni carrusel automático.
- **Movimiento por interacción** (WCAG 2.3.3): desactivable por preferencia del sistema.
- **Foco no oculto** (WCAG 2.4.11): `scroll-margin-top` en cada destino de ancla y en elementos enfocables cercanos al header persistente.
- **Paridad teclado/puntero:** cada efecto de hover tiene su equivalente de foco.
- Live region / status behavior: la página no tiene estados asíncronos propios; los del scheduler los anuncia el componente nativo.
- Color-independent state: estados abiertos/activos combinan color con ícono, posición o texto.
- Motion-independent meaning: con motion desactivado, la página se entiende completa.
- **Cifras sin contadores:** las cifras de la región 6 están en el DOM con su valor final desde el primer render; un lector de pantalla nunca recorre valores intermedios.

## Performance Guardrails

- Compositor-only properties: sólo `transform` y `opacity` para movimiento.
- Layout reads/writes: el script sólo observa intersección; no lee geometría en scroll ni escribe estilos por frame.
- Animation scope: limitado a la raíz de la página; header y footer nativos intactos.
- Infinite animations: **ninguna** (se verifica con `document.getAnimations()`).
- LCP: el H1 es el elemento LCP; el motion del hero no puede retrasar su pintura (estado inicial visible).
- CLS: el motion no provoca desplazamiento de layout; CLS ≤ 0,1.
- INP: los handlers de interacción son triviales; INP ≤ 200 ms.
- Mobile constraints: sin overflow horizontal a 390 px; ningún efecto depende de hover en pantallas táctiles.

## GVC / Micro Evidence

- Scenario: probe de motion y accesibilidad sobre la página en preview o publicada.
- Scenario file: Playwright live (GVC del portal no aplica — superficie WordPress pública).
- Route: URL de la página `[preview en fase A; noindex en fase B]`.
- Viewports: 1440, 390 y 390 con reduced-motion.
- Required steps: cargar; recorrer con teclado; hover sobre una tarjeta de frente; activar una ancla; abrir una pregunta; repetir con `prefers-reduced-motion: reduce`.
- Required captures: tarjeta en hover y en foco (misma apariencia), encabezado de ancla visible bajo el header, pregunta abierta, página completa bajo reduced-motion.
- Required frame labels: `desktop-1440`, `mobile-390`, `reduced-motion-390`, `focus-parity`, `anchor-focus-visible`.
- Required `data-capture` markers: los del wireframe.
- Assertions:
  - ninguna animación con iteraciones infinitas;
  - bajo reduced-motion, `animationName=none` y `transitionDuration` nulo en los elementos animados;
  - el estado inicial de cada región revelable tiene `opacity` ≥ 0,85 (sin contenido invisible sin JavaScript);
  - el foco sobre un elemento produce la misma apariencia que su hover;
  - el encabezado destino de un ancla no intersecta el header persistente;
  - las cifras de la región 6 muestran su valor final en el primer render.
- Reduced-motion evidence: auditoría de estilos computados, como la de `TASK-1350`.

## Design Decision Log

- **Decision:** motion contenido y funcional; el motion existe sólo para feedback, foco y orientación.
- **Alternatives considered:**
  - *Coreografía rica como en `TASK-1350`* — rechazada: esa landing vende producción creativa y su motion es parte del mensaje; esta vende sistema y accesibilidad, y su mensaje es la contención.
  - *Contadores animados* — rechazados por accesibilidad.
  - *Marquee de logos* — rechazado (WCAG 2.2.2 e inferencia de casos falsa).
  - *Video en el hero* — rechazado: compite por LCP y contradice la restricción.
  - *Scroll-jacking o parallax* — rechazados.
- **Why this pattern:** un comprador de diseño evalúa el oficio en los detalles; la contención demostrable es más persuasiva que el espectáculo, y la accesibilidad de la página es parte del argumento de venta.
- **Reuse / extend / new primitive:** CSS con alcance a la página; si más landings de servicio adoptan esta contención, extraer los valores a tokens compartidos del sitio público.
- **Open risks:** la dirección visual puede pedir más motion del que este contrato permite; cualquier ampliación requiere actualizar este documento y volver a pasar la evidencia.

## Acceptance Checklist

- [x] La task dueña declara este archivo en `Motion`.
- [x] Cada motion está atado a feedback, foco, orientación o reducción de incertidumbre.
- [x] Reduced-motion preserva el mismo significado.
- [x] Foco, seleccionado, pendiente y error no dependen sólo de motion.
- [x] Los imports usan el riel aprobado del sitio público y assets con alcance a la página.
- [x] Los guardrails evitan layout thrash, animaciones infinitas y retraso del LCP.
- [x] La evidencia prueba interacción significativa, no sólo una captura estática.
- [x] El design decision log explica por qué este motion y qué se rechazó.
