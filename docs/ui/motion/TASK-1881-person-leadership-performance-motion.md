# TASK-1881 — Leadership Performance Motion

## Meta

Contrato propuesto TASK-1881. Motion funcional de primitives existentes; no librería/animación nueva.

## Intent and Triggers

Apertura/cierre de sidecar comunica contexto; cambio de período comunica carga, no mejora de score.
Altas/bajas, búsqueda y paginación actualizan la lista sin animar un aumento de cartera como logro. Si desaparece la fila activa por permiso/reasignación, devolver foco a encabezado/control seguro y anunciar actualización sin nombres protegidos.
Hover/focus/pressed usan states theme existentes. Skeleton no cambia estructura ni desplaza controles.

## Motion Contract

Reusar durations/easing y presencia de ContextualSidecar/AdaptiveSidecarLayout; no valores literales ni counters animados. No stagger de KPIs ni celebración por métricas laborales.
Pendiente deshabilita acciones repetidas pertinentes; no bloquear navegación del perfil entero. Respuestas tardías no disparan transición con período equivocado.

## Reduced Motion

prefers-reduced-motion: apertura/cierre inmediato o fallback oficial del primitive, sin desplazamiento ni shimmer ornamental. Información/foco idénticos; no pérdida de estados.

## Focus and Interruption

Abrir lleva foco al heading/primer control del detalle según primitive; cerrar devuelve al trigger. En lectura Escape interrumpe el fetch; en formulario respeta dirty state/envío del contrato de flow; cambio de cuenta/mes no deja foco oculto. Live region anuncia estado estable, no cada frame.

## Verification

GVC normal/reduced en desktop y 390px; teclado, escape, clicks repetidos, red lenta, paginación con 51/201 cuentas y cambio de manifest durante sidecar. Confirmar layout estable/scrollWidth; dossier muestra equivalencia de contenido y foco. No aprobar motion sólo por screenshot estático.

## Feedback de comandos

Pending, error y confirmación usan feedback canónico accesible y localizado al formulario; reduced motion conserva mensaje y foco. No animar mejora de score al enviar solicitud ni al ejecutar una acción. Confirmar éxito sólo tras readback; transición de verificación inconclusive no usa celebración. Probar red lenta, retry, respuesta tardía y cierre con borrador.
