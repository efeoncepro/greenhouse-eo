# AXIS en Marketing Studio — implementación y QA, 2026-10-07

Estado: rollout completo para reproductor compartido y miniaturas, autorizado por el operador («Termina todo lo que le falte»). Studio `da2a02a` en main y producción; migración, CORS, workers y backfill verificados en ambos ambientes. Reproducción y miniaturas comprobadas visualmente en producción. La regresión del reader Metricool detectada al cierre fue recuperada y verificada; incidente y evidencia abajo.

## Decisión y fuente

[ADR de adopción](../../architecture/marketing-studio/EFEONCE_STUDIO_AXIS_VIDEO_DECISION_V1.md).
Dirección visual: AXIS Cinema embedded publicado, preservando superficies de Studio, claro/oscuro y ratios reales.
Tres subagentes descubrieron superficies, pipeline y adapter antes de implementar. Repositorio Studio:
`efeonce-marketing-studio`, baseline `3829a8b`; WIP previo `apps/web/next-env.d.ts` preservado.

## Alcance

- Una fachada MediaVideo con adaptador React oficial y controles AXIS compartidos.
- Inspector vertical/feed y activaciones; carrusel parcial inerte y grupos con visor.
- Derivados temporales sprite/WebVTT, DTO y transporte, con activación separada de la migración.
- Capítulos, subtítulos generados, YouTube/Vimeo, subida web y distribución pública: fuera de esta implementación.

## Evidencia

- Paquete publicado primitives0.6.5 instalado desde registro/caché, sin copia local de AXIS.
- Catálogo único; regeneración de tema desde tokens0.6.0 sin diff en theme.generated.css.
- `pnpm check`: PASS (gates, lint, manifiesto, typecheck, suites); tests de integración DB se omiten sin su entorno.
- `pnpm build`: PASS, todas las rutas generadas. Los cambios posteriores de seguridad/backfill tienen tests focales.
- FFmpeg real: sprite WebP generado por `nodeMediaToolkit.timeline`, leído y pintado por Media Chrome.
- Chrome instalado: escenarios stage horizontal1000/390, story vertical390, carrusel vertical1000/390 y grupo390;
  claro/oscuro, sin overflow, sólo un player activo; grupo cierra/desmonta y carrusel parcial es inerte.
- Play con avance de tiempo; autoocultación `userinactive`; replay con SVG de órbita; error simulado/retry
  conserva segundo6; miniatura real1600px cargada, recorte temporal visible.
- Evidencia local: `.captures/studio-axis-video-20261007/` (JSON y capturas). Se usó harness de componentes
  reales con clips sintéticos porque Next local devuelve `database: unreachable`; no prueba reader+DB ni
  representa la tipografía del shell Next. No hay ruta fixture publicada ni copia de AXIS en el producto.
- Readback de producción sin mutaciones: asset existente responde206 con `Content-Range`, MIMEvideo/mp4,
  destino storage.googleapis.com; `Access-Control-Allow-Origin` ausente para https://studio.efeonce.org.
  El riesgo CORS está confirmado; es condición de rollout, no causa inferida del reproductor anterior.
- `scripts/ops/media-playback-cors.mjs --env production`: dry-run PASS. Añade GET/HEAD del host exacto,
  conserva reglas previas y verifica readback con `--apply`; aplicado después según el registro siguiente.
- Revisión adversarial: firmas sprite acotadas al vencimiento del índice; backfill1 por corrida con flagON
  para no acumular20extracciones. No garantiza presupuesto global de archivos grandes.

## Rollout autorizado — evidencia verificada

- Studio: commit `da2a02a`, push main `3829a8b..da2a02a` confirmado.
- Migración `1791390000000_video-timeline-renditions.sql` aplicada únicamente por nombre mediante
  node-pg-migrate en staging y producción; constraint validada en ambos ambientes.
- CORS GET/HEAD aplicado a ambos buckets de medios conservando reglas previas. Readback real de producción:
  `206` y `Access-Control-Allow-Origin: https://studio.efeonce.org`.
- Cloud Build `2dcedb1f-8f01-4888-b293-92d9b9f239d0`: SUCCESS, 2 min 18 s; imagen
  `da2a02a60fcb`. Worker staging `00008-n9x` activo; backfill de cuatro videos completo, pending=0/failed=0.
- Vercel producción READY: `dpl_2ZJFZsgMTbw3P2qNREp8ugW1mFVX`, commit `da2a02a`, alias
  `studio.efeonce.org` sobre `efeonce-marketing-studio-fx1njubl9-efeonce-7670142f.vercel.app`.
- Browser producción real CMP001-08 (1280 × 720): reproducción avanza >3 s, autoHide=true,
  replay con órbita=true, overflow móvil=false, errores=[]; evidencias `production-result.json`,
  `production-playing.png`, `production-mobile.png` en la carpeta de capturas de esta auditoría.
- Worker producción `00006-9lq` recibe 100 % del tráfico, misma imagen `da2a02a60fcb`. Backfill completo 7/7:
  readback DB playback=7, timeline_sprite_v1=7, timeline_vtt_v1=7. Corrida final
  `76a4ecb7-f5f3-4084-a141-8bdd44683cee` succeeded, pending=0/failed=0/deferred=0.
- VTT y sprite por transporte real: HTTP 200, sprite image/webp. No se registran URLs firmadas.
  Un timeout del harness se corrigió al atravesar el Shadow DOM anidado con locators de Playwright;
  no fue un fallo del producto.
- Gateway: no requiere sync ni despliegue para este DTO aditivo. Reenvía el JSON completo y no declara
  `outputSchema`. El catálogo de main conserva 44 tools frente a 75 de Studio; sincronizarlo incorporaría
  11 readers ajenos al cambio. No se amplía el catálogo por este rollout.

## Cierre visual y alcance

- `production-thumbnail.png`: miniatura de Los Sparks visible en 0:24, captura inspeccionada.
- `production-portrait.png`: reproducción vertical 720 × 1280, captura inspeccionada.
- `production-timeline-result.json`: cinco assets con timeline en CMP-001, VTT 200, sprite 200,
  dimensiones 1600 × 90; video vertical en segundo 1.377, error=null y errores=[].
- Reproductor/pipeline operativos: reproducción, replay de órbita, autoocultación, móvil, transporte,
  generación y pintura de miniaturas verificados. No hay pendiente de rollout dentro de este alcance.
- Subida web, subtítulos/capítulos generados, YouTube/Vimeo y distribución pública Think/WordPress
  siguen siendo continuaciones independientes; no se declaran implementadas aquí.


## Incidente posterior — compatibilidad del worker compartido

El deep health de cierre detectó `metricool_readback:last_run_failed`. La corrida 21:30 UTC de la revisión
`00006-9lq` falló; las de 21:00 y 20:30 UTC habían terminado bien. Un reintento confirmó HTTP 500.
No se considera un aviso ajeno al release: el worker nuevo contiene código ya presente en main que escribe
`email_evidence` en `activations/observation.ts`, también para observaciones sociales de Metricool.
La migración canónica `1791155100000_owned-email-providers` estaba pendiente en ambos ambientes.

La migración `1791155100000_owned-email-providers` se aplicó acotadamente como dependencia del código
ya desplegado, en staging y después producción, tras dry-run por nombre con `--no-check-order` porque la
migración de timeline posterior ya estaba aplicada. Constraint staging validada; no se infiere aquí un
readback de constraint productiva que no fue reportado. Flags leídos en ambos workers:
`MEDIA_WORKER_THUMBNAILS_ENABLED=true`, `MEDIA_WORKER_OWNED_READBACK_ENABLED=false`; owned/email no se habilitan, sin cuentas ni
proveedores nuevos. No se amplía funcionalidad ni se cambia el lifecycle de tasks.

Recuperación verificada: POST Metricool HTTP 200, corrida `9b52e838-5aad-400f-bdaf-a163fdb1a90d`
succeeded; candidates=4, observed=3, new_observations=0, not_found=1, brands=2, brand_errors=0.
Deep health: media_worker=OK, metricool_readback=OK, pending_renditions=OK. Persisten avisos separados
`activations_pending_verification` y `channels_require_mapping`; greenhouse_metrics/owned no configurados.
No se atribuyen a fallos de reproducción ni se ocultan. Incidente recuperado, sin regresión de worker
pendiente de este release y sin issue formal creada.
