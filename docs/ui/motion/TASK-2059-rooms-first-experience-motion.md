# TASK-2059 — Motion Rooms

Estados de Button y Dialog/Tabs desde AXIS; CSS sobre axisMotion, sin animación del logo. Foco nunca espera una transición. Piezas mantienen ratio. Reduced motion elimina movimiento de interfaz; ningún autoplay.

## GVC / Micro Evidence

Capturar apertura/cierre y cambio de capítulo con reduced motion y preferencia normal; comprobar retorno de foco, Escape, ausencia de scroll horizontal y clicks rápidos. Dossier docs/ui/reviews/TASK-2059-rooms-first-experience/.

## Design Decision Log

2026-10-25: microinteracción funcional del paquete, sin GSAP ni intro decorativa. Se conserva La órbita; no se reconstruye motion del logo Rooms, pendiente de aprobación independiente.

## Evidencia de implementación

Dialog AXIS conserva Escape/focus restore. El adapter coloca foco inicial en título y scroll0 para que una radiografía extensa no abra mostrando su cierre. En móvil el cierre superior evita obligar a recorrer el contenido. El desplazamiento entre capítulos respeta reduced motion; no hay autoplay ni animación del logo.
