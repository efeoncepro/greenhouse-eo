# TASK-1358 — Home: contrato de motion as-built

Estado: implementación publicada, registro 2026-08-30; no aprobación global de copy.
Dueño: [contrato Elementor](../../architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md).
Evidencia fechada: [audit visual](../../audits/public-site/2026-08-30-home-visual-review.md).

## Primitive decision

`reuse`: Logo Marquee y Brand Proof Avatar Group; `extend`: módulos semánticos y
lifecycle `agency-landing.js`; `new`: ningún framework de motion ni scheduler.
Los valores efectivos viven en CSS/JS del plugin, no en un segundo set de tokens documental.

## Comportamientos preservados

- Reveal, contadores, paths SVG y hero/orbit conservan la dirección del HTML fuente.
  Isotipo proporcional al círculo; halos radiales sin bordes rectangulares.
- Avatares con logos reales conservan elevación original de 6 px, escala 1.08 y halo al hover.
  Reemplazar iniciales por imágenes no elimina esta microinteracción.
- Work rails usan periodo medido (incluye gap) y copias suficientes para cubrir el viewport.
  Recalcular al resize; pausar/reducir según contrato; editor sin clones persistentes.
- Filtros no destruyen enlaces; FAQ usa estados nativos. Hover/focus de CTA conserva texto visible;
  Ohio `-undash` evita la capa de underline que ocultaba el contenido.

## Showreel

Dirección específica: [Home showreel modal](../visual-directions/home-showreel-modal.md).
Click explícito → dialog navy/teal, backdrop difuminado, frame16:9 y cierre44px.
YouTube sólo se crea al abrir; cerrar quita iframe/audio y devuelve foco y scroll.
URL editable, hosts permitidos y enlace alternativo a YouTube; no player en editor.
Animación de entrada sutil, eliminada con reduced motion. El reproductor conserva su UI propia.

## Accesibilidad y lifecycle

Respetar `prefers-reduced-motion`: detener movimiento decorativo y no ocultar contenido.
Desmontaje limpia listeners, observers, clones y player; remount no duplica efectos.
No-JS conserva contenido y enlaces; reproducción requiere JS y disponibilidad de YouTube.
Pruebas con shims de dialog validan lifecycle, **no** focus trap nativo ni navegación cross-origin.

## QA

Desktop1280/1440, tablet890, móvil390 y landscape844×390; overflow horizontal,
hover sostenido, filtros/FAQ, periodo completo de carrusel, resize, reduced motion y remount.
Playback real y cierre X/exterior tienen evidencia previa. Teclado completo dentro/fuera del iframe
y save/reload del editor siguen pendientes; no declararlos certificados por un test JSDOM.
