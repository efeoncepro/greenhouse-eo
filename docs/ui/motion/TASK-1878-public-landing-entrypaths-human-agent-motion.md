# TASK-1878 — Contrato de no-regresión de motion

> La task no introduce animación ni transición nueva. Este contrato existe para que un cambio de
> copy/enlace no altere el comportamiento temporal ya aprobado de las tres páginas.

- Home, HubSpot y AEO conservan su motion existente y su fallback reduced-motion.
- El enlace usa hover/focus nativos; no hay reveal, contador, desplazamiento forzado ni estado pending.
- Capturar reduced-motion antes/después en la región tocada; una diferencia fuera de copy/enlace bloquea cierre.
