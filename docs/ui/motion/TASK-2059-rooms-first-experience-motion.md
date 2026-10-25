# TASK-2059 — Motion Rooms

Estados de Button y Dialog/Tabs desde AXIS; CSS sobre axisMotion, sin animación del logo. Foco nunca espera una transición. Piezas mantienen ratio. Reduced motion elimina movimiento de interfaz; ningún autoplay.

## GVC / Micro Evidence

Capturar apertura/cierre y cambio de capítulo con reduced motion y preferencia normal; comprobar retorno de foco, Escape, ausencia de scroll horizontal y clicks rápidos. Dossier docs/ui/reviews/TASK-2059-rooms-first-experience/.

## Design Decision Log

2026-10-25: microinteracción funcional del paquete, sin GSAP ni intro decorativa. Se conserva La órbita; no se reconstruye motion del logo Rooms, pendiente de aprobación independiente.

## Evidencia de implementación

Dialog AXIS conserva Escape/focus restore. El adapter coloca foco inicial en título y scroll0 para que una radiografía extensa no abra mostrando su cierre. En móvil el cierre superior evita obligar a recorrer el contenido. El desplazamiento entre capítulos respeta reduced motion; no hay autoplay ni animación del logo.

## Delta 2026-10-25 — View Transitions

Adoptar transición progresiva de rutas/detalle según APIs estables verificadas del stack y exports AXIS. El estado y los permisos no dependen de la animación. Reduced motion y navegador sin soporte conservan cambio inmediato; cancelación y clics consecutivos no bloquean navegación ni foco. No capturar vistas privadas en transiciones de cambio de rol/sesión. Nombres únicos por pieza; foco/scroll y Escape se prueban en ambos modos. Documentar API elegida y compatibilidad real antes de code; no activar flags experimentales por inferencia.
