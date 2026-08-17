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
- El warning de transferencia (13–14 MB) proviene del bundle de desarrollo local de Next: la task no añade
  imágenes, fuentes, dependencias ni requests de producto. FCP local fue 1172 ms en desktop y 312 ms en
  móvil; se vuelve a medir en el build desplegado antes del flip.

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
