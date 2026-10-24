# TASK-2051 — Portada del blog v3: flujo

> Superficie: `/blog/` (página 18456). Fuente: canvas aprobado v67 (ver wireframe de TASK-2051). Este flujo describe
> cómo se mueve el visitante entre la portada, las entradas, los eventos, la búsqueda y los formularios. No hay
> modales ni drawers: todo ocurre en la página o en una URL nueva.

## Flow Goal

Que el visitante encuentre algo para leer, ver o asistir en menos de dos interacciones, y que suscribirse a Glitch o
reservar un webinar ocurra ahí mismo, sin pop-up ni salto a otra página.

## Nodos

| Nodo | Entrada | Salida |
|---|---|---|
| Slider de destacados | carga de `/blog/` | entrada, caso, guía, diagnóstico (`think.efeoncepro.com`) o Flash |
| Pregúntale al blog | foco en el buscador o chip sugerido | resultados en línea (4) → entrada; sin JS → `/?s=…&post_type=post` |
| Glitch | píldora «Suscríbete a Glitch» | formulario en línea → éxito → «Ya estás suscrito»; enlace a la edición |
| Evento próximo | «Reservar mi lugar» | formulario en línea → «¡Lugar reservado!» → «Te esperamos el …»; «Agregar al calendario» → `.ics` o Google Calendar |
| Próximos / grabaciones | tarjeta | página del evento (`/eventos/<slug>/`) o entrada de la grabación |
| Riel | tarjeta o flechas | entrada o recurso |
| Órbita | tema | archivo filtrado por tema |
| Archivo | píldora de año, paginación | `?anio=2025&pagina=2` (servidor, `noindex,follow` si hay filtro) |
| Suscripción final | formulario | éxito; sincroniza el estado del botón de Glitch |

## Recovery Branches

- Formulario con error de validación: el mensaje queda dentro de la píldora; el foco vuelve al campo.
- Envío fallido (red o servidor): estado de error con «Reintentar» si `actionable=true`; si no, enlace a la suscripción por correo.
- Evento cancelado o movido: la tarjeta muestra el estado y oculta la reserva; el `.ics` deja de servirse.
- Búsqueda vacía: pide escribir una pregunta y deja el foco en el campo.
- Sin resultados: mensaje y enlace a «Explora por tema».

## Focus and Navigation

- Orden de tabulación: header canónico → slider (enlace de la diapositiva activa, controles) → buscador → chips →
  Glitch → evento → riel → temas → archivo → suscripción → footer.
- El slider responde a ← → sólo con el foco dentro; las diapositivas ocultas van `inert`.
- Al abrir un formulario en línea, el foco pasa al campo de correo; Esc lo cierra y devuelve el foco al botón.
- Tras el éxito, el foco queda en el mensaje (`role="status"`).
- Enlaces de año y paginación son `<a href>` reales (funcionan sin JS y con el botón atrás).

## GVC Scenario Plan

- Recorrido 1: cargar `/blog/`, esperar la primera diapositiva, avanzar con «Siguiente», pausar.
- Recorrido 2: escribir en el buscador, ver resultados, abrir uno.
- Recorrido 3: abrir la suscripción de Glitch, enviar con fixture, capturar éxito y estado final.
- Recorrido 4: reservar el webinar con fixture, capturar éxito y descargar el `.ics`.
- Recorrido 5: cambiar de año en el archivo y paginar; verificar URL y botón atrás.
- Cada recorrido a 1440 y 390, con y sin movimiento reducido.

## Design Decision Log

- **Decisión:** formularios en línea en vez de modales (pedido del operador 2026-10-24: «ahí mismo, no en pop-up»).
- **Alternativas:** diálogo de Growth CTA (TASK-2045), enlace a la suscripción de abajo (rechazado).
- **Por qué:** menos fricción y fidelidad al canvas.
- **Riesgo:** dos instancias del mismo formulario en la página (Glitch y suscripción final); se verifica en TASK-2054.
