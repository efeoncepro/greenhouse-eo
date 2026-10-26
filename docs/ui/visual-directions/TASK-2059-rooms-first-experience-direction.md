# Rooms — primera experiencia

> Continuidad26Oct: referencia del diseño/scaffold anterior, no aceptación de la interfaz de Claude Design.
> Codex conserva backend; Claude Design posee la nueva UI y su validación. Los requisitos de AXIS,
> View Transitions, reduced-motion, fallback y accesibilidad siguen siendo obligaciones a verificar.
> Integración/estado actual: [dossier Rooms](../../architecture/rooms/README.md) y
> [contrato backend](../../documentation/rooms/backend-api-for-claude-design.md). No activar flags ni repetir canary por este documento.


Fecha: 2026-10-25. Fuente de composición para implementación; aceptación visual del operador pendiente.

## Decision

Escenario editorial seleccionado: el relato comercial ocupa un plano continuo con una pieza dominante. Se compararon galería espacial (demasiada orientación para leer evidencia) y consola documental (útil al operador, débil como experiencia de comprador). La vista interna usa una lista de salas y un detalle, conservando el mismo marco de La órbita. Roles cliente/operador/administrador determinan proyecciones y acciones con can; no son temas visuales.

## Desktop target

1440×900: cabecera con lockup oficial, indicador de demostración y acceso al cambio de vista de demostración. Contexto y título a la izquierda; pieza dominante a la derecha. Índice de capítulos y detalle editorial legibles. Una superficie continua, con separadores y aire, sin grilla de tarjetas equivalentes. Abrir una pieza conserva su ratio y vuelve al disparador.

## Mobile target

390×844 y 320px: cabecera compacta, título breve, pieza visible y acción; capítulos desplazables sólo dentro de su propio rail. Lectura en una columna. Diálogo de detalle dentro del viewport; vuelta con Escape/control y foco al origen. Texto ampliado al 200% sin pérdida.

## Token mapping

Bricolage editorial y Poppins funcional desde la familia de efeonceGraphicLine. Papel/navy y acento Growth desde tokens AXIS; axisGeometry para ritmo/radios y axisMotion para interacción. Roles Rooms centralizados en adapter, traducidos a variables CSS/Tailwind. Botones, tabs y dialog consumen axis-ui-primitives publicados. Logo rooms-lockup y favicon rooms-icon desde axis-brand-assets; sin recrearlos. Arte ficticio con identidad propia separada del marco de Rooms.

## Anti-patterns

Sin crop de piezas, porcentajes ficticios, datos presentados como cliente real, controles sin efecto, notas privadas serializadas a cliente, logo animado no aprobado, cards uniformes, texto letra por letra ni import de Vuexy/MUI a Rooms. Las capacidades no implementadas se explican en el alcance del entorno, sin botones activos que simulen guardar/publicar.

## Refinamiento premium con Product Design — 2026-10-25

El operador pide expresamente una interfaz superior premium y apoyo de Product Design. Se usa el target de código existente y La órbita como base, con auditoría visual IAB. La dirección evoluciona a piezas de campaña fotográficas completas en galería editorial: ningún arte SVG improvisado reemplaza una imagen final. Los tres assets Nómada son sintéticos, generados por formato, con procedencia; no representan una campaña de cliente real.

El visor debe ampliar el trabajo respecto de su preview, aprovechar el viewport y ofrecer imagen original; cierre superior accesible en ambos diálogos. Legibilidad, espacio y fidelidad prevalecen sobre ornamento. Los hallazgos y su corrección están en [auditoría Product Design](../reviews/TASK-2059-rooms-first-experience/product-design-audit.md). La aceptación humana permanece pendiente.
