# TASK-1763 — Dirección visual · cierre de vacante por capacidad

## Direction mode

`repo-native-benchmark` · `ui-standard`. Fuente durable: Application 360, su tab/diálogo de decisión,
`HiringDeskFrame`, primitives AXIS/MUI y el command `preview → confirm` de TASK-1762.

## Alternativas comparadas

1. **Auto-cierre + toast:** rápida, pero oculta la cohorte y convierte un efecto irreversible en feedback temporal.
   Rechazada.
2. **Checkbox inline “notificar a los demás”:** mantiene un solo dialog, pero mezcla hechos y puede confirmarse sin
   haber visto el impacto. Rechazada.
3. **Segundo paso de consecuencia:** seleccionada. La decisión se registra primero; si completa cupos, un dialog
   separado muestra el efecto exacto y exige confirmación nueva.

## Tesis seleccionada

“Una decisión, dos consecuencias visibles”. La composición no dramatiza el rechazo: prioriza número de cupos,
personas afectadas, categorías y estado. El tono es calmo, directo y humano.

## Desktop and mobile targets

- Desktop: dialog `sm/md` sobre Application 360, resumen dominante `cupo objetivo → seleccionados → N restantes`,
  seguido por categorías y consecuencia de comunicación.
- Mobile 390: single-plane/full-screen; resumen y CTA dentro del primer recorrido, categorías colapsables, sin tabla.

## Action hierarchy

1. Comprender qué ya ocurrió: decisión individual registrada.
2. Revisar a quién afectaría el cierre.
3. Confirmar `Cerrar vacante y notificar a N personas` o `Ahora no`.
4. Seguir estado del run si la ejecución es parcial.

## Primitive and token mapping

- Reuse Dialog, Alert, GreenhouseButton, Chips de atributo/status y state surfaces.
- AXIS/theme para espaciado, color, radius y tipografía; estado siempre con texto, nunca sólo color.
- Sin primitive nueva: el summary es domain-local hasta demostrar repetición cross-domain.

## Signature and anti-patterns

- Signature: la cifra N aparece junto al verbo final y al resumen de cupos, no como KPI decorativo.
- Evitar semáforos, card wall, nombres/emails de toda la cohorte, confirmación genérica y success prematuro.

## Acceptance signature

En una lectura se distingue qué quedó decidido, qué aún no ocurrió y cuántas personas recibirán una comunicación.
