# TASK-1526 — Producer Resilient Feed / Motion Contract

## Source and intent

- Source-led baseline:
  `docs/ui/visual-sources/TASK-1505/approved-prototype.dc.html`.
- El source aprobado usa CSS para lift de card, reveal de acciones, selección y glow; no usa
  `document.startViewTransition`.
- Esta corrección preserva esa intención sin convertir motion en autoridad de estado ni esconder latencia.

## Motion boundaries

- **Creación real de nodo:** una entrada corta de opacidad/traslación puede ejecutarse una vez cuando aparece una
  key nueva.
- **Refresh, filtro, búsqueda y orden:** reutilizan/mueven el mismo nodo. No repiten entrance ni crossfadean el
  medio ya cargado.
- **Hover y `focus-within`:** lift y action-bar reveal son equivalentes; ningún CTA existe sólo en hover.
- **Lifecycle de run:** el contenido cambia en el mismo nodo. No hay porcentaje temporal, pulse infinito ni
  transición que retrase el estado server-authoritative.
- **Viewer:** abrir/cerrar conserva/restaura foco; playback no se reinicia por una reconciliación incidental.

## CSS contract

- La animación de mount no deja `transform` persistente mediante `animation-fill-mode: both|forwards`; el estilo
  final base vuelve a ser propiedad de la card.
- Hover/lift y entrance no animan simultáneamente `transform` sobre el mismo nodo.
- Las acciones se revelan con propiedades de compositor y siguen disponibles por teclado/touch.
- Duraciones y easing reutilizan los tokens existentes de Globe; no se copian tokens Greenhouse por herencia.

## View Transitions decision

Native View Transitions queda fuera de este slice. Los nodos keyed estables son prerrequisito: agregar un shared
element antes de estabilizar identidad, foco, cache y playback sólo ocultaría la reconstrucción. Una adopción futura
debe vivir en `TASK-1505` o promoverse por `TASK-1485`, con namespace, interrupción, fallback y evidencia propios.

## Reduced motion

- `prefers-reduced-motion: reduce` elimina entrance/lift animado y muestra el estado final inmediatamente.
- Filtro, selección, lifecycle, errores y acciones conservan significado y operabilidad.
- No se oculta contenido para esperar un evento `animationend`.

## Evidence plan

1. Capturar hover y `focus-within` sobre la misma card en desktop.
2. Filtrar Todas → Video → Todas y comprobar `isSameNode`, Blob URL estable y ausencia de entrance repetida.
3. Reordenar y refrescar mientras audio/video reproduce; comprobar continuidad.
4. Repetir con reduced motion y a 390 px.
5. Registrar frames y assertions en el dossier GVC de `TASK-1526`.

## Decision log

- Elegido: CSS localizada sobre nodos reconciliados por key.
- Rechazado: animación de entrada con fill persistente.
- Diferido: Native View Transitions/shared elements hasta tener reconciliación estable y un segundo consumer.
