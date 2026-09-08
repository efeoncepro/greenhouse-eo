# TASK-1847 — render estático de documentos

Contrato de exclusión de motion, 2026-09-08. Deck y A4 no tienen animaciones, autoplay, stagger ni contadores.
El harness muestra el estado final directamente. El contrato existe para hacer explícita la fidelidad del
render y la equivalencia bajo prefers-reduced-motion; no agrega implementación de motion.

## Triggers and Targets

No hay triggers temporales: ChartSpec produce geometría final; enlaces siguen navegación semántica normal.

## Reduced Motion

Mismo contenido/geometría con o sin prefers-reduced-motion. Exportar no espera una animación ni captura un frame intermedio.

## GVC Scenario Plan

Comparar gráficos del harness con reduced motion y estado normal; valores/etiquetas finales idénticos.

## Design Decision Log

La evidencia gráfica no depende del tiempo de captura. UI web interactiva pertenece a TASK-1849.
