# Rooms — sistema de motion V1

Fecha: 2026-10-07. **La órbita es el design system decidido; coreografía Rooms pendiente de validar renderizada.** [Dirección visual](../visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md).

## 1. Principio

Motion orienta: indica de dónde viene una pieza, qué cambió, dónde quedó el relato y si una acción terminó. La obra del cliente conserva su movimiento original. La interfaz no compite con un video, música o animación presentada.

Autoridad: [efeonce-graphic-line](../../../.codex/skills/efeonce-graphic-line/SKILL.md) y su [lenguaje de movimiento](../../../.codex/skills/efeonce-graphic-line/references/motion.md). Movimiento de marca desde `efeonceGraphicLine.motion` y recursos oficiales; estados funcionales desde el contrato de cada componente; microinteracción con `axisMotion`. AXIS es la distribución técnica, no una estética alternativa.

Base de microinteracción verificada en tokens AXIS: duration instant 75 ms, short 150 ms, standard 200 ms, medium 300 ms, long 400 ms, extended 600 ms. Eases `standard` y `emphasized` según propósito. Consumir esos tokens; distancias, opacidades y stagger se fijan como roles Rooms después de prueba, no como literales repetidos.

## 2. Partitura por interacción

| Interacción | Coreografía candidata | Duración AXIS | Reduced motion |
|---|---|---|---|
| Entrada | Aparece contexto y se asienta la pieza dominante; sin bloquear acceso ni esperar intro | long/extended, una vez | Aparición directa |
| Botón/selección | Cambio de estado inmediato y transición breve de color/superficie | instant/short | Estado directo |
| Miniatura → escenario | Marco se relaciona con origen; imagen conserva proporción, sin deformación | medium/long | Corte con foco y título |
| Cambio de adaptación | Preview nueva lista antes del relevo; transición del marco y contenido separado | standard/medium | Sustitución directa |
| Fundamento/mapa | Panel entra desde borde coherente; escenario conserva referencia | standard/medium | Abrir/cerrar sin desplazamiento |
| Comparación | Reorganizar en dos marcos etiquetados; no hacer morph de los artes | medium | Layout directo |
| Siguiente escena | Continuidad breve de plano; corte permitido por tipo de contenido | standard/medium | Corte |
| Cerrar detalle | Recuperar origen, posición y foco sin recorrer toda la página | medium | Restitución directa |
| Carga de medios | Poster inmóvil; progreso solo si es medible | Estado, no cronómetro ficticio | Igual |
| Lectura → radiografía | Mantener fragmento/origen; desplegar instrumento sin perder posición ni encoger texto hasta ilegibilidad | medium/long | Corte, ancla y foco preservados |
| Fragmento → evidencia / derivado → origen | Indicar dirección y selección con etiquetas; énfasis breve y un solo destino activo | short/standard | Selección/etiqueta estáticas |
| Cambio de filtro o escenario | Actualizar valores y unidades con estado explícito; sin contar desde cero ni simular resultados | standard | Cambio directo con resumen accesible |
| Audio/video | Timeline y waveform siguen tiempo real del medio | Reloj del player | Contenido con controles; no autoplay |

La duración de transición no retrasa la disponibilidad de un botón. La espera de red no se disfraza con una animación de duración fija. No hay audio de interfaz por defecto.

## 3. Continuidad técnica

Una máquina de estados de vista coordina open/closing/ready; la orden más reciente cancela o resuelve la anterior. No acumular clicks en una cola de animaciones. Evitar layout thrashing: animar transform/opacity cuando sea posible y medir cambios de marco necesarios. Shared-element transition exige fallback si origen/destino no están montados.

No animar simultáneamente la misma propiedad desde CSS, Motion y GSAP. CSS/WAAPI para estados simples; Motion para composición React; GSAP solo ante una coreografía concreta que lo justifique y con cleanup. Cancelar trabajo al desmontar, navegar o cambiar preferencia de movimiento.

Precargar escena actual/siguiente bajo presupuesto; no todos los medios. Suspender decoración en pestaña oculta y mientras una pieza pesada lo requiera. Un frame dropped debe degradar a un cambio limpio, no dejar controles inactivos.

## 4. Lo que no se utiliza

Sin scroll hijacking, parallax obligatorio, texto letra a letra, cámara 3D decorativa, elasticidad excesiva, temblores de error ni cursores perseguidores. No órbitas decorativas permanentes; un loader orbital canónico sí puede indicar trabajo en curso según su contrato y detenerse al terminar. Medida/progreso exige dato real, distinto de espera indeterminada. El movimiento de marca aprobado se consume de assets oficiales cuando corresponde; no autoriza una nueva animación de logo Rooms.

## 5. Accesibilidad y medios

Respetar `prefers-reduced-motion` desde la primera pintura y sus cambios en vivo; [referencia MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion). Reducir motion de UI no modifica automáticamente el contenido audiovisual solicitado: sus controles de reproducción siguen disponibles y su inicio es voluntario.

Focus nunca desaparece tras transición. Actualización accesible de nombre/estado, sin anunciar cada frame. No flashes ni variaciones de luminancia añadidas por la interfaz. Los gestos tienen botones y teclado equivalentes.

Sound/fullscreen requieren comportamiento real del navegador, sin garantías basadas en un comando; [autoplay MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay). La coordinación de ventanas V1 está limitada al origen/partición que admite [BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API); no es control remoto entre dispositivos.

## 6. Evidencia pendiente

Grabar entrada, apertura/cierre de pieza, cambio de ratio, panel, comparación, lectura→radiografía, fragmento↔evidencia, linaje y retorno a tour en desktop y móvil. Repetir con reduced motion, teclado, video reproduciéndose y red degradada. Medir fluidez/INP y comprobar que no se modifica ni recorta la creatividad. La tabla es contrato propuesto, no evidencia de una animación ya validada.
