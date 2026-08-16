# TASK-1733 — Motion contract · People 360 Hiring journey

## Intent

Motion conserva ownership visual entre un evento y su detail. La historia en sí permanece estable; no se anima la
línea temporal como storytelling decorativo.

## Contract

- Selección: feedback inmediato del item; detail entra mediante primitive AdaptiveSidecar/transition canónica.
- Replace detail: transición localizada sin desmontar timeline ni perder scroll.
- Load more: nuevas filas aparecen sin stagger largo; announce de cantidad por live region.
- Close/back: foco vuelve al evento exacto.
- Timing/easing: sólo tokens/primitives existentes; cero valores locales.

## Reduced motion

Detail aparece/desaparece instantáneamente, mantiene selección/foco y entrega igual jerarquía. Load more no anima
filas; la live region conserva el feedback.

## GVC evidence

- Desktop/mobile: select, replace, close y load more.
- Repetir bajo reduced motion; verificar foco, scroll, contraste y ausencia de frames intermedios ambiguos.
