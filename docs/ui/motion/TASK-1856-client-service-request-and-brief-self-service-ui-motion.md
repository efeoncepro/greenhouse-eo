# TASK-1856 — feedback y continuidad

Contrato inicial, sin runtime. La task reutiliza controles canónicos; no añade animaciones propias.

## Motion brief

El estado pending y el acuse explican la espera del command/reader, sin éxito antes de confirmación.
Navegación y autenticación nunca esperan un efecto visual. Se mantienen texto, aria-busy y foco visible.

## State transitions

| Cambio | Feedback | Reduced motion |
|---|---|---|
| ready → pending | control invocado deshabilitado, texto de espera | mismo texto/estado |
| pending → error | mensaje persistente, inputs conservados, foco al resumen | mismo contenido sin movimiento |
| pending → confirmado | detalle/acuse desde resultado del servidor | mismo estado sin entrada animada |
| detalle → retorno | URL/contexto y foco restaurados | idéntico |

## Constraints

Sin keyframes locales, timers inventados, stagger ni cifras animadas. Tokens heredados de primitives.
Leer un aviso no resuelve la acción. Un GET de correo no cambia estado. Escape/dirty state usa primitives.

## GVC evidence

Desktop/390px, teclado/focus/restore, pending/error/confirmed y prefers-reduced-motion reduce. Mismo
significado con y sin movimiento; scrollWidth === clientWidth. Evidencia pendiente de implementación.
