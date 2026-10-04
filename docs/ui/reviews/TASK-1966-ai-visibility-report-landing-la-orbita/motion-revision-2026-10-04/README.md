# Revisión de motion — 2026-10-04

Actualización: incluido en Think `09e1976`, commit + push autorizados y verificados en `origin/main`. Despliegue/readback pendiente; el resto describe la revisión local anterior al push.

Propuesta local tras el feedback del operador: la entrada finita de la landing publicada perdía atractivo. Think sobre `0c5701a`, sólo `EngineHeroOrbit.astro` e `index.astro`; sin commit, push ni despliegue. La versión publicada del 03/10 permanece intacta.

Una órbita oficial, SVG sin modificaciones, gira continuamente en 12 s; tres tarjetas conceptuales de respuestas se relevan cada 4 s. No contiene métricas ni resultados aparentes. La cadencia es propuesta de esta superficie pendiente de aceptación, no canon AXIS. No video ni nueva dependencia; CSS transform/opacity y custom element para las condiciones de reproducción.

## Comprobaciones

- `pnpm type-check`: 0 errores, 0 warnings, 17 hints preexistentes.
- `pnpm build`: PASS después del último ajuste móvil.
- CUA: escritorio 1440/1280/1024 y móvil 390/360. Sin overflow horizontal; a 360 px quedan 11,48 px entre pausa y titular.
- Pausa manual: etiqueta Reanudar animación, `data-playing=false`, animaciones paused. Recorrido continuo observado con matrices de rotación cambiantes y relevo de tarjetas.
- Navegación a Cómo funciona: órbita fuera del viewport, `data-playing=false`.
- Movimiento reducido dinámico: animation none, primera tarjeta visible, resto oculto, botón oculto.
- JavaScript deshabilitado: ilustración y primera tarjeta visibles, sin botón inoperante. Emulación restaurada.
- CTA conserva el ancla al formulario. Embed, validación, consentimiento y envío sin cambios. Formulario local presenta el error de carga de su integración existente; no se realizó envío ni se acredita el flujo remoto con este QA.
- No se midieron FPS/INP ni energía en un móvil físico. Los snapshots muestran cuadros; el movimiento se revisa en localhost:4331/brand-visibility.

[Escritorio](desktop.jpg) · [Móvil](mobile.jpg)
