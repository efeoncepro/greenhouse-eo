# TASK-1577 — Globe Producer Audio Edit Studio flow

## Primary flow

1. Abrir un audio gobernado en Sonic Canvas.
2. Elegir “Editar audio”.
3. Seleccionar rango en waveform o frase en transcript.
4. Elegir capa y edit kind: voz, SFX, música o limpieza.
5. Escribir intención y elegir qué preservar.
6. Revisar route/fidelity, derechos y estimate server-side.
7. Confirmar; crear child asset y mostrar original/resultado A/B.

## Alternate and recovery flows

- Mezcla sin stems: mostrar degradación y limitar capas editables.
- Ruta gated/rights-required: conservar brief y explicar bloqueo.
- Estimate stale: invalidar y exigir nueva estimación.
- Unknown outcome: reconciliar por reader; no retry ciego.
- Resultado degradado: marcar clipping, timing, ruido o capa no preservada.

## Keyboard and accessibility contract

- Tab alcanza trigger, play, waveform, transcript, layer, prompt, estimate y execute.
- Arrow seek sólo con waveform enfocada.
- Escape cierra rail y restaura focus al trigger.
- Async states se anuncian con texto y `aria-live` apropiado.
- Reduced motion conserva estados y orden de foco sin transiciones.
