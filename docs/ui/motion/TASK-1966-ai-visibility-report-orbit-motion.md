# TASK-1966 — Órbita Engine en la landing

## Contrato vigente · 2026-10-04

- **Estado:** hero demostrativo publicado en Think `6aab907`; geometría amplia publicada en `56a300a`, Vercel success y readback público a 1710/2560 px. El hover azul profundo posterior permanece local.
- **Escena:** `EngineHeroOrbit.astro` conserva el SVG oficial y demuestra consulta → respuesta → mención de «Tu marca» → cita `tu-sitio.ejemplo`. Es un ejemplo, no un run real ni una respuesta atribuida a un proveedor. La descripción accesible lo identifica; por decisión del operador no hay pie visible.
- **Ciclo:** 12 s continuo, coreografía propia autorizada para esta landing; no reemplaza tokens ni motion de logo de AXIS. Rotación de la órbita, entrada del texto de respuesta, énfasis de mención y aparición de cita/insight. El énfasis anima el fondo de la mención: no afirmar que todo sea compositor-only.
- **Control:** clic/toque sobre toda la escena pausa/reanuda. Área transparente de botón nativo con nombre «Pausar/Reanudar demostración», foco visible y activación Enter/espacio. No hay enlace ni botón de pausa separado. No se usa live region para repetir el contenido.
- **Suspensión:** `IntersectionObserver`, visibilidad de pestaña y preferencia de movimiento reducido. El custom element limpia listeners/observer al desconectarse. La pausa manual se conserva al salir/volver a pantalla.
- **Fallback:** sin JS o con movimiento reducido, escena completa estática y control oculto. CTA y formulario siguen disponibles.
- **Geometría:** shell máximo 1360 px, escena máxima 500 px; móvil/tablet en flujo normal. Evita que el aspect-ratio de la escena empuje indefinidamente el formulario. Readback público: escena 500 px y formulario y=678 tanto a 1710 como a 2560.
- **Botones del formulario:** sin elevación; último ajuste local sólo de color: Engine accent 70% + ground 30%, texto blanco, contraste 6,80:1. No agrega efectos ni modifica renderer/políticas compartidos.
- **Evidencia:** [hero demostrativo y correcciones](../reviews/TASK-1966-ai-visibility-report-landing-la-orbita/hero-demo-2026-10-04/README.md). Clic pausa seis elementos; Enter reanuda; espacio pausa. Reduced-motion, suspensión fuera de viewport y foco CTA comprobados localmente. Build/tipos PASS. No hay medición de FPS, energía o INP ni smoke de envío real nuevo.

## Registro histórico — versiones sustituidas

Lo siguiente conserva decisiones y evidencia de las entradas finita y de tarjetas abstractas. Sus afirmaciones de cero JavaScript, ausencia de loop/control, estado local y aceptación pendiente pertenecen a esos cortes; no describen el contrato vigente anterior.

## Revisión del operador — 2026-10-04 (propuesta local)

El operador considera que la entrada finita dejó la landing demasiado estática y perdió atractivo. La versión publicada del 03/10 permanece como registro histórico; la propuesta local sustituye sólo su motion por una escena de respuestas: SVG oficial intacto, recorrido continuo de una vuelta cada 12 s y relevo de tarjetas conceptuales ChatGPT/Gemini/Claude cada 4 s, sin cifras ni resultados inventados. El ciclo de 12 s es **propuesta específica de esta superficie**, no un token AXIS aprobado ni una modificación del brand-close oficial. Canonización del ciclo después de aceptación visual.

CSS transform/opacity; sin video, GSAP ni React nuevo. Un custom element sólo gobierna pausa manual, IntersectionObserver, visibilidad de pestaña y preferencia de movimiento reducido; limpia sus listeners al desconectarse. Sin JS o con movimiento reducido se muestra la tarjeta inicial y la órbita final, sin botón inoperante. Se mantiene disponible el CTA y se conserva el formulario gobernado. La composición móvil reserva espacio entre ilustración, pausa y titular; desktop refuerza el tamaño de la escena.

Evidencia de revisión: `docs/ui/reviews/TASK-1966-ai-visibility-report-landing-la-orbita/motion-revision-2026-10-04/README.md`. Implementación local en Think sobre `0c5701a`, sin commit/push/publicación. Esta propuesta reemplaza el criterio de una reproducción de las secciones históricas siguientes; todavía requiere juicio visual del operador.

## Meta

- Status: `implemented` (local; aceptación y publicación pendientes).
- Owner task: `TASK-1966 — Landing del AI Visibility Report`.
- Related wireframe: `docs/ui/wireframes/TASK-1966-ai-visibility-report-landing-la-orbita.md`.
- Related flow: ancla existente al formulario; no cambio de flujo.
- Motion type: `primitive-default`.
- Primary primitive / library: CSS oficial `ORBIT_MOTION_CSS` de AXIS.
- Copy source: copy aprobado de la landing; no se anima ni cambia.

## Motion Brief

Prospecto antes del diagnóstico. El operador pidió el 2026-10-03 adaptar la animación anterior y evaluar si pesa demasiado. Se prueba una adaptación reducida de la idea de análisis: una órbita que aparece y asienta, sin la escena de lupa, tarjetas y múltiples bucles de `HeroAnswerLens`.

Es una entrada decorativa de identidad, sin significado de progreso ni resultado. No reduce incertidumbre sobre el estado del análisis: ese estado sigue gobernado por el formulario. El CTA está disponible desde el primer cuadro. No hay parallax, audio, video, animación de iconos ni movimiento de texto.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Anillo | Carga de página | Opacidad y escala 0,96 → 1 | AXIS CSS | sí, salvo movimiento reducido |
| Arco | 400 ms | Trazo normalizado 1 → 0 | AXIS CSS | sí |
| Esfera | 1400 ms | Aparición y asentamiento | AXIS CSS | sí |
| Halo | 1200 ms | Aparición suave | AXIS CSS | sí |

## Microinteraction States

La órbita es decorativa, `aria-hidden`, sin hover, foco ni respuesta al puntero. No tiene pending, selected ni success/error. Final natural del SVG: órbita completa. Los controles conservan sus estados y foco de la landing.

## Transition Specs

Valores exactos del paquete; no coreografía escrita a mano:

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Anillo | tenue y contraído | final | `brandClose.ring` 0–500 ms, `axisMotion.ease.emphasized` | una reproducción | cuadro final |
| Arco | sin trazo | final | `brandClose.arc` 400–1400 ms, `axisMotion.ease.standard` | una reproducción | cuadro final |
| Esfera | ausente | final | `brandClose.sphere-settle` 1400–1700 ms, emphasized | sobrepaso oficial 1,18 y asentamiento | cuadro final |
| Halo | ausente | final | `brandClose.halo` 1200–2000 ms, standard | una reproducción | cuadro final |

Movimiento efectivo 2 s. El export `ORBIT_MOTION_TOTAL_MS` dice 2,5 s porque incluye la firma del paquete; esta aplicación no anima su firma ni tiene ese hook, y termina a los 2 s. No loop ni reactivación al scroll.

## Primitive & Token Mapping

- `EngineHeroOrbit.astro`: SVG oficial de brand-assets 0.4.10 importado como texto `?raw`, sin editar.
- `engine-orbit-motion.ts`: snapshot exacto de `@efeoncepro/axis-graphic-line` 0.11.0 `/motion`; ese paquete fija tokens 0.3.29. Los hooks son compatibles con el SVG 0.4.10 y se comprobaron en navegador.
- SHA256 del CSS: `3dcefd13d74ec4f90144712505ed120ca16e139ac3926f326bd0e3e89dec3276`.
- Duraciones/curvas del paquete; sin nuevos tokens ni dependencia privada en Think. Para regenerar, importar `ORBIT_MOTION_CSS` desde el paquete de Greenhouse y escribir el snapshot sin modificar la cadena; verificar su hash.
- Propiedades: transform, opacity, stroke-dashoffset. Este último pinta un solo arco SVG durante 1 s; no se afirma que toda la secuencia sea compositor-only.
- GSAP/Lottie: no se añaden ni hidratan componentes para esta animación.

## Reduced Motion Contract

CSS `prefers-reduced-motion: reduce`: animation none y dasharray none en todos los hooks. SVG final visible desde la primera observación. Sin JavaScript de detección ni espera de hidratación. Si faltara la hoja de estilos, el SVG conserva el estado final.

## Accessibility & Feedback

- No foco ni live region en la decoración; la animación no comunica progreso real.
- CTA y texto sin desplazamiento: lectura, contraste y activación disponibles inmediatamente.
- Un h1; navegación por teclado existente preservada.
- Intermediate-frame contrast: not applicable a la decoración; copy estático sobre Engine.
- Errores/destructivos: sin cambios al formulario; el CORS local sigue siendo una limitación separada.

## Performance Guardrails

- CSS 1904 bytes + SVG 1100 bytes: 3004 bytes sin comprimir, 938 bytes gzip combinados. Es medición local de contenido, no medición de red de producción.
- Cero JavaScript añadido para motion. Sin lecturas/escrituras de layout, listeners, requestAnimationFrame, blur animado ni render permanente de esta órbita.
- SVG de geometría fija; no CLS por tamaño: caja y geometría conservadas.
- Mobile: misma secuencia finita, sin overflow ni cruce del círculo con copy. Paquete respetado; sin loops por breakpoint.
- No se midieron FPS, INP, energía ni uso de GPU en dispositivo físico; no se atribuye una regresión medida a la animación antigua.

## GVC / Micro Evidence

- Scenario: entrada al hero y final; movimiento reducido.
- Scenario file: verificador de landing reusable existente; geometría nueva verificada por CUA, no ejecutado Chromium en esta sesión.
- Route: `http://localhost:4331/brand-visibility`.
- Viewports: 1440×900 y 390×844 con capturas; 360/430/1280 con geometría.
- Required steps: reload → cuadros de entrada → cuadro final → emular movimiento reducido → reload → verificar final inmediato → restaurar emulación.
- Required captures / labels: `desktop-0`, `desktop-4`, `desktop-final`, `mobile-intro`, `mobile-final`, `mobile-reduced`.
- Marker: `brand-visibility-orbit-motion`.
- Assertions: una órbita, un h1, scrollWidth <= width; estilos iniciales/finales distintos, una sola iteración; reducido con animation none, opacidad 1 y dasharray none.
- Evidence: `docs/ui/reviews/TASK-1966-ai-visibility-report-landing-la-orbita/motion/` (`motion-metrics.json`, `geometry.json` y capturas miradas). CUA captura cuadros naturales de entrada y final; no prueba frame pacing ni cada fase por separado.
- Emulación y viewport se restauran al terminar.

## Design Decision Log

- Decision: preview local de adaptación reducida tras el pedido del operador; no equivalencia narrativa con la ilustración de lupa anterior.
- Alternatives considered: recolorear escena GSAP completa (demasiados protagonistas para esta composición); órbita estática (sin el movimiento pedido).
- Why this pattern: misma órbita oficial y mismo cuadro final que la landing, con coreografía aprobada y sin ejecución permanente.
- Reuse: SVG oficial + CSS de paquete; wrapper Astro nuevo sin client JS.
- Open risks: juicio de operador sobre la pérdida del detalle ilustrativo; CORS local independiente; rollout pendiente.

## Acceptance Checklist

- [x] CSS exacto del paquete y asset oficial sin edición.
- [x] Entrada y final comprobados en escritorio y móvil.
- [x] Movimiento reducido muestra el final inmediatamente.
- [x] Sin overflow en cinco anchos; una órbita.
- [x] Tipos y build pasan (0 errors, 0 warnings, 17 hints heredados).
- [ ] Aceptación del operador y publicación/readback autorizado.
