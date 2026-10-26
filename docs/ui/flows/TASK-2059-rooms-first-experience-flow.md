# TASK-2059 — Flujos Rooms

> Continuidad26Oct: referencia del diseño/scaffold anterior, no aceptación de la interfaz de Claude Design.
> Codex conserva backend; Claude Design posee la nueva UI y su validación. Los requisitos de AXIS,
> View Transitions, reduced-motion, fallback y accesibilidad siguen siendo obligaciones a verificar.
> Integración/estado actual: [dossier Rooms](../../architecture/rooms/README.md) y
> [contrato backend](../../documentation/rooms/backend-api-for-claude-design.md). No activar flags ni repetir canary por este documento.


Demostración → sala → capítulo creativo → abrir pieza → cerrar → mismo disparador.
Sala → lectura editorial → fragmento → radiografía/evidencia → cerrar → mismo fragmento.
Vista operador/admin de demostración → lista de salas permitidas → detalle → permisos efectivos.
Cliente no recibe navegación interna ni notas; URL interna con principal cliente devuelve denied.
El cambio de persona existe sólo en la muestra sintética, no en la autoridad de una sala real.

## GVC Scenario Plan

Probar ida/vuelta, Escape, foco y browser Back en desktop y 390px. Verificar negativos can de cliente, operador y administrador con distintas salas y organizaciones. Capturas en docs/ui/reviews/TASK-2059-rooms-first-experience/.

## Design Decision Log

2026-10-25: experiencia de comprador y workspace interno son proyecciones separadas del reader canónico. Apertura de pieza/evidencia mediante Dialog AXIS; publicación y gestión de usuarios fuera de esta primera experiencia.
