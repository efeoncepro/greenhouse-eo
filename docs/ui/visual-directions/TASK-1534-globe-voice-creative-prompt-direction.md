# TASK-1534 — Voice-to-Creative-Prompt Visual Direction

## Decision

Seleccionar **B — Thought Capsule**: el micrófono vive dentro del prompt bar y, al detenerse, despliega una cápsula
inline con transcripción editable y dos destinos claros: insertar literalmente o convertir en propuesta creativa.
La cápsula mantiene la autoría visible: separa lo hablado, la normalización de transcripción y cualquier lectura
sugerida por el sistema.

## Alternatives

- **A — Instant dictation:** escribe directamente mientras se habla. Rápido, pero mezcla errores con el source y
  no distingue dictado de ideación. Rechazada.
- **B — Thought Capsule — selected:** captura primero, revisa después; preserva control y encaja con TASK-1531.
- **C — Voice room:** sesión conversacional larga. Potente, pero introduce streaming, memoria y chat. Diferida.

## Desktop target

Mic button al extremo del textarea. Recording conserva el composer y muestra timer/Stop. Después aparece una sola
surface inline: waveform estática mínima, transcript editable, language/confidence honestos y acciones.

## Mobile target

Mic target de 44 px; recording banner fijo dentro del composer, no global. Transcript/actions en columna y sin
side-by-side. Stop permanece alcanzable con pulgar y no depende de hover.

## Token mapping

- Reusar prompt bar, capability button, status, disclosure y tokens Globe.
- Recording usa semantic danger sólo para estado activo, no decoración.
- Motion contractual y causal; reduced effects conserva timer/texto.

## Signature details

- Indicador persistente `Grabando · 00:23`.
- “Esto fue lo que entendimos” antes del transcript.
- Dos destinos: `Insertar transcripción` y `Convertir en propuesta creativa`.
- Provenance compacto `hablado|normalizado|sugerido`; ninguna inferencia aparece como frase del operador.

## Anti-patterns

- Micrófono siempre escuchando, auto-send, orb de IA, chat falso, waveform decorativa dominante.
- Inferir emoción/identidad, ocultar permiso o retención, guardar audio por defecto.
- Presentar una interpretación creativa como si hubiera sido dicha literalmente.
