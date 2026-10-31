# TASK-2064 — Motion

## Inventory and tokens

La composición adapta TASK-1964: entrada formulario por transform con motionCss; la fotografía estática conserva geometría AXIS; hover/focus de campos y botones, estado pending del controller real. La foto no debe bloquear contenido por opacity base.

## Reduced Motion

prefers-reduced-motion elimina entrada/transforms; conserva estados, foco y significado. No loader con tiempo ficticio, ni promesa de shared-element cross-origin.

## GVC / Micro Evidence

Captura normal/reduce, control foco por teclado y ausencia de animación que retrase submit verificadas en las dos corridas premium del dossier TASK-2064. El carrusel pausa con hover/foco/visibilidad y reduced motion; el arco estático conserva proporción al cambiar viewport. No se replica Ken Burns ni shared-element cross-origin.

## Design Decision Log

2026-10-25: se reutiliza dirección V4 sin forzar espera ni transición compartida entre orígenes. Prefers-reduced-motion mantiene resultado y foco.
