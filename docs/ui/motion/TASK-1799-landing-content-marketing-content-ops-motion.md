# TASK-1799 — Landing Content Marketing & Content Ops — Motion Contract

## Meta

- Task: `TASK-1799`
- Motion role: explicar causalidad y continuidad de una idea
- Surface: public WordPress/Elementor landing
- Scope: page-scoped; no cambios globales al theme
- Reduced-motion equivalence: mandatory

## Estado de implementación — 2026-08-31

El export aprobado usa palabra dinámica en hero (2400 ms), reveals y stage de siete capítulos.
Click de capítulo suspende la sincronización con scroll durante el movimiento programático;
los tabs admiten flechas/Home/End. Editor, motion apagada y reduced motion detienen enhancements.
JS-off mantiene SSR y siete capítulos. Mount y resize habilitan pin sólo con ancho ≥940 y alto ≥740. La asimetría
fue corregida y publicada el 2026-08-31: 1440×650 conserva siete capítulos en flujo tras resize
y recarga, sin cambiar duración ni navegación programática. El inventario/timings inferior sigue siendo planificación;
el detalle real vive en el cliente compilado y en la evidencia pública.

[Implementación canónica](../../architecture/public-site/CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md) ·
[Auditoría y pendientes](../../audits/public-site/2026-08-31-content-marketing-publication.md).

## Intent

La motion explica tres relaciones: una idea conserva identidad mientras cambia de formato; una decisión
produce el siguiente artefacto; una aprobación habilita publicación/distribución. Si una animación no
aclara una de esas relaciones o no mejora feedback de interacción, se elimina.

La experiencia debe sentirse viva, no inestable. Todo texto y CTA importante existe antes, durante y
después de la transición con contraste suficiente.

## Motion principles

1. **Causa antes que efecto:** el trigger es visible y el destino mantiene continuidad espacial.
2. **Localized:** sólo el stage relevante responde; el viewport nunca es secuestrado.
3. **Interruptible:** scroll, resize, tab y click pueden interrumpir sin dejar estado corrupto.
4. **Compositor-conscious:** transform/opacity/clip con prudencia; evitar layout thrashing.
5. **Content-first:** first paint no espera una timeline.
6. **Equivalent:** reduced motion y JS-off muestran el mismo estado/orden.

## Inventory

| ID | Trigger | Motion | Meaning | Reduced motion |
|---|---|---|---|---|
| M0 hero entrance | initial render | copy y stage entran por capas breves | jerarquía | todo visible; sin desplazamiento |
| M1 idea current | scroll localizado en R3 | núcleo viaja entre nodos | continuidad del contenido | nodos conectados estáticos |
| M2 artifact reveal | chapter active | fuente/brief/content se reemplazan con shared origin | decisión produce artefacto | estados apilados/chapters |
| M3 atomization | R6 enter/select | derivados salen del contenido madre hacia slots | adaptación multicanal | overview + selected visible |
| M4 format select | click/tap/key | preview y explanation crossfade/slide corto | propiedad de selección | cambio inmediato |
| M5 review resolve | R5 enter or explicit step | comentario se ancla y cambia a resuelto | feedback → aprobación | antes/después visible |
| M6 mode select | click/tap/key | highlight de columna y summary | responsabilidad elegida | cambio inmediato |
| M7 CTA feedback | click/submit | estado pressed/pending/success del host | acción reconocida | feedback nativo sin travel |
| M8 section bridge | scroll | corriente cambia de dark a paper y vuelve | promesa → evidencia → acción | divider/label estático |

## Choreography

### M0 — Hero

- HTML se pinta en estado legible.
- Enhancement añade una entrada corta: eyebrow/copy primero, stage después, CTA nunca al final de un
  stagger largo.
- No typewriter en H1, no palabra por palabra y no blur que comprometa contraste.
- El núcleo queda quieto después de entrar; no loop orbital permanente.

### M1/M2 — System stage

- Desktop puede usar un pinning localizado mientras los siete capítulos avanzan, siempre que:
  - la altura total siga siendo proporcional;
  - Escape no sea necesario para salir;
  - wheel/touchpad mantenga respuesta normal;
  - resize/orientation recalculen o desactiven sin salto;
  - contenido no quede debajo del header.
- Mobile no usa pinning: capítulos verticales con reveal simple.
- Un capítulo anterior permanece como contexto tenue pero legible; nunca opacity insuficiente para
  texto activo.

### M3/M4 — Atomization

- El overview dibuja salidas una vez y se detiene.
- Seleccionar un formato mantiene el punto de origen y mueve sólo preview/annotation.
- No simular que adaptar es sólo cambiar aspect ratio: motion acompaña cambios de estructura/copy.
- Inputs rápidos cancelan la transición anterior y terminan en la última selección.

### M5 — Review

- Comentario aparece junto a su región, no como burbuja flotante sin ancla.
- La resolución usa una transición de estado y label; no confeti, check gigante ni sonido.
- Si la escena es conceptual, el label lo declara antes de la interacción.

### M6 — Modes

- La selección mueve un indicador entre columnas y actualiza summary.
- La tabla no reordena responsabilidades; evita layout shift y preserva comparación.

### M7 — Conversion

- Botón y host usan su motion canónica. La landing no envuelve el submit en una timeline propia.
- Pending no usa skeleton sobre campos completados; conserva contexto.
- Success no se declara antes del response real.

## Timing and easing policy

- Definir variables page-scoped por tiers: `instant`, `feedback`, `transition`, `narrative`.
- `instant`: cambio de estado con reduced motion y correcciones.
- `feedback`: hover/focus/pressed/select.
- `transition`: preview, comentario, mode indicator.
- `narrative`: sólo R3 y entrada del stage.
- Valores exactos se fijan al auditar tokens/runtime y se centralizan; ningún handler contiene tiempos
  literales dispersos.
- Stagger sólo dentro de un artefacto pequeño; nunca por cada sección, FAQ, logo o fila.

## Performance budget and implementation constraints

- Cero dependencia nueva como default; verificar si GSAP ya está cargado antes de usarlo.
- No video hero obligatorio, canvas, WebGL, filtros blur animados ni partículas.
- SVG optimizado; número de paths/nodos acotado y no animar sombras costosas.
- Lazy-load de imágenes below-fold con dimensiones reservadas; hero asset crítico dimensionado.
- IntersectionObserver para enhancements; listeners passive y cleanup al desmontar/recalcular.
- Evitar animar `top/left/width/height`; medir layout fuera del frame crítico.
- JS failure deja el atributo/clase en estado visible, no `opacity:0` permanente.
- Medir LCP, INP, CLS y long tasks contra baseline acordada; cualquier regresión material bloquea
  cutover aunque la experiencia «se vea fluida» en una máquina rápida.

## Reduced motion

Con `prefers-reduced-motion: reduce`:

- sin pinning, travel, parallax, stagger ni autoplay;
- cada capítulo aparece en posición final;
- selector cambia instantáneamente y mantiene focus;
- la corriente es una línea/diagrama estático;
- el comentario muestra estado inicial/final por labels;
- smooth scroll se desactiva;
- formularios/scheduler preservan feedback accesible propio.

Reduced motion no significa ocultar el stage ni entregar menos contenido.

## Keyboard, focus and touch

- Hover nunca dispara contenido exclusivo.
- Focus no mueve el elemento fuera de la vista ni activa una timeline larga.
- El selector responde según el patrón semántico elegido; no handlers globales de flechas.
- Targets táctiles respetan tamaño/spacing y no compiten con scroll vertical.
- Focus ring tiene contraste sobre midnight, paper y estados seleccionados.
- Si se abre overlay canónico, cierre restaura focus al CTA exacto.

## Stop conditions

- Texto esencial inicia oculto esperando JS.
- El usuario pierde control del scroll o aparece jank durante R3.
- Mobile conserva pinning/horizontal travel.
- Reduced motion cambia el significado o elimina formatos.
- La animación introduce una dependencia pesada para un efecto reproducible con CSS.
- LCP/INP/CLS o long tasks se degradan materialmente.
- Una interacción rápida deja preview, aria state y label desincronizados.
- El efecto se percibe como fábrica automática o celebración decorativa.

## GVC / Micro Evidence

- Capture desktop 1440: hero after paint, R3 chapters 1/4/7, R6 overview/selected, R9 mode selected.
- Capture mobile 390: hero, vertical system, selector, matrix, conversion.
- Video corto sólo como evidencia complementaria; frames estáticos son obligatorios.
- Reduced-motion capture con todos los estados finales visibles.
- Keyboard trace y focus screenshots sobre fondos claro/oscuro.
- JS-off screenshot y DOM assertions de contenido crítico.
- Performance trace antes/después y console/network sin errores.
- GVC dossier y scorecard apuntan a evidencia fechada posterior al último cambio.

## Design Decision Log

- Motion se usa para continuidad causal, no para ambientación permanente.
- Desktop admite pinning localizado sólo si performance y control de scroll pasan; mobile nunca lo usa.
- El estado inicial es legible y el final existe sin JS, por lo que enhancement puede fallar seguro.
- CSS y APIs nativas son el default; GSAP sólo si ya existe en el runtime y evita una implementación
  menos robusta sin aumentar el bundle de la página.
- Reduced motion es una composición alternativa completa, no una timeline con duración cero.
