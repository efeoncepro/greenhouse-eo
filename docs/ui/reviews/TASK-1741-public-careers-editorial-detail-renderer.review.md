# TASK-1741 — Review dossier del detalle editorial de Careers

## Decisión

`PASS local / rollout pendiente`. La variante es una mejora incremental verificable de la hoja completa de
la vacante y conserva el journey existente. El flag permanece OFF por defecto; staging y producción siguen
el orden gobernado `renderer → contenido aprobado → JobPosting schema`.

## Evidencia revisada

- Baseline legacy real, 1440 y 390:
  `.captures/2026-08-17T12-25-12_task354-careers-runtime-audit/`.
- Variante final con fixture v2 completa, contexto/beneficios centrales, dos bloques adicionales,
  colaboración y proceso enriquecido, 1440 y 390:
  `.captures/2026-08-17T16-19-21_task1741-careers-editorial-detail/`.
- Variante sobre la vacante publicada real y parcial `EO-OPN-0061`, después de corregir la semántica
  `Deseable, no excluyente`, 1440 y 390:
  `.captures/2026-08-17T15-51-54_task1741-careers-editorial-detail/`.
- Delta remoto sobre `EO-OPN-0061`, 1440 y 390, con resumen de banderas y disclosure cerrado/abierto de los
  veinte países:
  `.captures/2026-08-17T17-11-13_task1741-careers-editorial-detail/`.
- Delta final de iconografía sobre `EO-OPN-0061`, 1440 y 390, reemplazando emojis por banderas SVG circulares
  controladas:
  `.captures/2026-08-17T18-20-41_task1741-careers-editorial-detail/`.
- Dirección seleccionada:
  `docs/ui/visual-directions/TASK-1741-public-careers-editorial-detail-renderer.md`.

## Qué se comprobó en la hoja completa

- La navegación, header, footer, hero, seniority, metadatos, contenido, rail y ambos enlaces de postulación
  continúan presentes. Las pruebas de componente exigen exactamente dos enlaces al mismo `applyHref`.
- El contrato v2 muestra promesa, rol, contexto corporativo central, outcomes, trabajo, dos extensiones,
  esenciales/preferred/learnables, evidencia, colaboración, países, beneficios centrales más una adición,
  proceso enriquecido y compensación sin un tercer CTA.
- Un bloque parcial conserva toda la prosa legacy disponible. `niceToHave` se presenta como
  `Deseable, no excluyente`; nunca se convierte en una promesa de aprendizaje.
- En 390 px la hoja se recompone de forma lineal, el rail pasa al final y no existe overflow horizontal.
- GVC premium terminó con exit code 0 en ambos viewports: axe, layout, runtime, teclado, foco, reduced motion
  y enterprise rubric pasaron. Hubo cero errores de consola, página, hidratación o HTTP.
- El modelo remoto usa lenguaje `async-first`, separa modalidad/vinculación y muestra una pila de cinco
  banderas SVG circulares más `+15` como apoyo. La información primaria sigue siendo textual: contador,
  disclosure nativo y los veinte nombres localizados dentro de una lista semántica completa. Los SVG salen de
  `circle-flags` 2.8.3 (MIT), se importan localmente y nunca dependen de emojis o un CDN.
- El warning de transferencia (13–14 MB) de la captura anterior provino del bundle de desarrollo local de Next.
  El delta de iconografía añade sólo los 20 SVG estáticos requeridos y ninguna fuente ni request a terceros;
  la medición del build desplegado sigue siendo obligatoria antes del flip.
- La recaptura SVG terminó `exitCode=0` en ambos viewports, con cero errores de consola, página, hidratación o
  HTTP y sin findings de la rúbrica enterprise. Los veinte SVG fuente suman aproximadamente 80 KB. El servidor
  de desarrollo transfirió 13,1 MB en ambos viewports y el primer desktop incluyó compilación en frío
  (`FCP=14.920 ms`); móvil ya caliente quedó en `3.724 ms`. Ambos son warnings de desarrollo y no sustituyen la
  medición del build desplegado previa al flip.

## Diferencia honesta entre fixture y dato real

La fixture completa prueba todas las regiones del renderer. La vacante real `EO-OPN-0061` conserva hoy un
bloque v1 parcial: tiene `remoteModel`, elegibilidad y prosa legacy, pero no tiene outcomes,
evidenceAsk ni learnables aprobados. El contexto y los beneficios centrales sí aparecen por contrato; las
regiones específicas faltantes no se inventan. People/Growth debe completar el packet de evidencia y
publicarlo por el command canónico antes del rollout de contenido.

## Regresión y rollback

- El branch con flag OFF conserva el renderer legacy exacto.
- El formulario `/public/careers/[publicId]/apply` no fue modificado. Sólo se mantiene como guard secundario
  frente a selectores CSS compartidos; la evidencia primaria cubre la hoja de vacante completa.
- Si staging detecta una regresión: apagar primero `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED`, luego
  `CAREERS_DETAIL_EDITORIAL_V2_ENABLED`, y redesplegar. No se revierte contenido ni se cambia la URL.

## Decisión visual

Se acepta `Editorial dossier`: jerarquía por evidencia de decisión, cuerpo mayormente abierto, outcomes
numerados, una sola banda de beneficios, panel remoto y rail existente. Se rechazó convertir la página en un
job board de cards equivalentes o en una landing cinematográfica. El resultado conserva la voz visual de
Careers y se reconoce como una vacante de Efeonce, no como una plantilla genérica.
