# TASK-2071 — Motion y continuidad de medios privados

Fuente: adapter Rooms/AXIS y helper room-motion existentes; no nuevo sistema ni paquete.

## State transitions

Selección de bloque y apertura del inspector pueden reutilizar transición breve dentro de una autoridad estable. El progreso de carga sigue bytes reales; verificación usa estado indeterminado accesible, nunca porcentaje inventado ni demora decorativa. No atenuar texto durante el feedback porque baja contraste.

## Inspector

El fit conserva proporción exacta; zoom altera sólo la cámara del visor, no el archivo. Pan requiere límites y equivalentes de teclado; reset explícito vuelve a ajustar. Cierre visible siempre y Escape. No crear shared-element snapshots al cerrar/revocar/cambiar sesión o edición.

## Reduced motion

prefers-reduced-motion reduce elimina desplazamiento/zoom animado y aplica selección inmediatamente. Sin API ViewTransition usa mismo fallback. Foco y resultado no dependen animationend ni timeout. El cambio de fase se anuncia una vez.

## Lifecycle and privacy

Cancelar/abandonar limpia refs y objetos locales; páginas privadas fuerzan navegación de documento al cambiar autoridad. Desmontar inspector al expirar/revocar y reactivar lectura sólo tras revalidación. No snapshots de artes privados atravesando logout/contexto. Carga en background nunca anuncia terminada por la animación.

## Verification

Capturar entrada/final en normal/reduce, medir contraste/ratio y foco; probar Escape, zoom/reset y límites de pan. Inspeccionar getAnimations y events de navegador; nunca afirmar BFCache si persisted no se observó. Runtime 20f9fe9 permanece como candidata remota hasta release separado.

## GVC / Micro Evidence

El dossier TASK-2071 registra apertura/cierre del inspector y estados de transferencia a los cuatro anchos. Probar zoom con botones y teclado, reset, Escape y retorno del foco; medir ratio y posición del cierre durante pan. Con reduced motion no hay desplazamiento animado. Al revocar se desmonta el contenido sin transición ni snapshot. Estas comprobaciones se ejecutarán contra una imagen propia y servicio local real, sin trazas que guarden tokens.

## Design Decision Log

Se extiende el helper Rooms existente únicamente en selección dentro del mismo contexto autorizado. La inspección prioriza control de cámara y estabilidad del foco; ningún movimiento representa readiness. Se evita opacidad de texto durante entrada para conservar contraste, y se usa cambio inmediato al perder autoridad.
