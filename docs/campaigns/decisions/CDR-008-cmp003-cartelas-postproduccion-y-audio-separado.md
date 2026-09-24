# CDR-008 · CMP-003: cartelas en posproducción y música/SFX sin voz

**Estado:** `Accepted` · **Fecha:** 2026-09-24 · **Decide:** Julio Reyes · **Campaña:** CMP-003 SKY.
**Alcance aceptado:** frontera de composición y animación punch-v3. V17 exportado para revisión; aprobación final y escucha pendientes. Los intentos anteriores quedan documentados abajo.

## Contexto y decisión

El operador aprobó la última preview: «GENIAL!!! Quedó muy muy bueno», y pidió documentar el método y planificar correcciones del audio/video. La aprobación corresponde a cartelas posteriores al avión y cierre. Búsqueda, resultados, chat/cita, cámaras, avión y cielo siguen generativos. El fondo final de las cartelas debe ser cielo animado de la película generada; la fotografía de la preview no es el fondo final.

La URL Bubble usa el SVG canónico en capa separada y fusión Luminosidad, con opacidad 0,72 incorporada al alpha. El cierre mantiene primero azul Efeonce y después morado SKY. La coreografía v3 se conserva y cualquier variante se revisa antes de heredar aprobación.

Audio exigido: música y SFX sin voz. La preferencia musical de v7 no aprueba el mix con residuos de narración. ElevenLabs directo es la ruta propuesta con controles instrumentales verificados; Magnific está excluido por falta de créditos indicada por el operador. El piloto posterior tiene autorización específica; otros gastos no están autorizados.

## Evidencia y alcance pendiente

- Preview aprobada: `ai-generations/2026-09-23_cmp003-sky-video/seedance/v10-local/prueba-cartelas-punch-v3.mp4`.
- SHA-256: `71daf664907d768ababdac883cf217fa55543f6e2a454cd5ff5ca706bf03f6dc`.
- `approval-punch-v3.json` registra artefactos y fuentes; `versions/approved-punch-v3/` conserva fuentes.
- Alpha, seek y Luminosidad: reportes locales `qa/engine-check.json`, `qa/export-check.json`, `qa/luminosity-check.json`.
- Fal v9 consumió ~USD 40,98938 según diferencia de saldo registrada; no repetir una llamada comparable por inferencia de permiso. La estimación debe incluir video de entrada y salida.
- Pendientes: corrección de la película, cielo animado sin letras, integración de capas, audio limpio sincronizado, revisión del master completo y adaptación 4:5.
- Omni 1.1 admite MP4 de hasta 10 s por el carril actual: cualquier reparación por ventanas requiere aceptar una excepción a la preferencia de película completa. El piloto se envió después del ajuste del operador; resultado abajo.

## Fuentes dueñas

Método reutilizable, separado de las aprobaciones de esta campaña: [producción y posproducción de video](../../operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md).


Retrospectiva solicitada tras V17: [método completo, tropiezos, aciertos, modelos y costos](../../operations/social/2026-09-24-sky-retrospectiva-produccion-v17.md).

Guion, referencias, cámaras, plan sonoro, rutas/costos y gates viven en [PLAN-VIDEO-AUDIO-V10.md](</Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/2. Campañas/CMP-003_sky-nos-eligio-seo-aeo/PLAN-VIDEO-AUDIO-V10.md>), junto a BRIEF/PRODUCCION/ASSETS en OneDrive. Este CDR no duplica el brief.

Método reproducible: [registro de producción](../../operations/social/2026-09-24-sky-generative-film-title-overlay-method.md) y skill `motion-design-studio/workflows/generative-film-with-approved-title-overlays.md`.

Marco técnico existente: [Omni CLI](../../architecture/GREENHOUSE_GEMINI_OMNI_CLI_DECISION_V1.md). Esta decisión no cambia APIs ni arquitectura de Globe. Publicación conserva el requisito de firma de adenda del brief; aprobación de cartelas no es aprobación de publicación.

## Ajuste del operador antes del piloto

El 2026-09-24 acepta avanzar por ventanas sujeto a continuidad perceptual verificada. Autoriza el piloto presupuestado, no una garantía de preservación del modelo. Corrige el orden: cerrar imagen y revisar fotogramas antes de generar música y SFX. El audio se diseña sobre los tiempos reales resultantes. Este delta sustituye la condición previa de ventanas aún no aceptadas; el master sigue pendiente de QA.

## Resultado del piloto: no pasa continuidad

Una salida Omni de 9,5 s a 1080×1920/24 fps, completada. Inspección de 228 cuadros: cielo distinto en entrada, doble avión en f102–111 y salto de escala/posición al salir. Rechazada; no integrada al master. Uso reportado equivale a ~USD 1,54 según tarifas consultadas, no factura. Una sola generación, sin nuevo audio ni segundo intento.

[Informe y evidencia local](../../../ai-generations/2026-09-23_cmp003-sky-video/omni/v10-pilot-01/REVIEW.md). La condición del operador no se satisface con esta prueba; el plan de OneDrive registra el resultado y mantiene pendientes las rutas alternativas.

## Continuación completa preparada

El operador acepta la recomendación de volver a una generación completa. [V11](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v11-full/README.md) conserva payload, manifiesto y hash: 30 s/1080p/9:16, 10 imágenes, 5 s de referencia de vuelo, `generate_audio:false`. Dos referencias nuevas de búsqueda lateral mantienen todo el campo visible. Estimación actual USD 23,88204; presupuesto específico USD 25/un intento consultado y todavía pendiente. No hay POST de generación nuevo.

### V11: gasto autorizado y ejecución

El operador confirma el presupuesto y exige un único intento bien planificado. Autorización USD 25 ligada al hash del request en `v11-full/budget-approval.json`; revisión completa en `qa/pre-submit-review.md`. Solicitud fal aceptada con HTTP 202, ID `01a0d2c8-444a-7fd0-b606-5a2987148e87`. Estado creativo pendiente; no audio generado. Se sigue el mismo ID sin reenvíos.


### V11: resultado y gasto verificados

Una generación completada: 1080×1920/24 fps, 713 cuadros y 29,708333 s, sin pista de audio. Revisión completa de cuadros: rechazo por ritmo de búsqueda, ausencia de turno separado/revelado de respuesta, pérdida de impulso en cita→avión y permanencia del avión en toda la reserva de cartelas. No se ejecutó compositor ni audio. La fila individual de fal confirma USD34,162558, por encima del presupuesto USD25; estimación 23,88204 insuficiente. Sin segundo intento. Informe: `ai-generations/2026-09-23_cmp003-sky-video/seedance/v11-full/REVIEW.md`. El master sigue pendiente; ni el éxito de API ni la planificación acreditan aprobación visual.


## V12: rescate local sin gasto adicional

Por instrucción del operador, se resolvió con fuentes existentes: búsqueda lateral V7, chat/revelado V9, bloom V7 y vuelo/cielo V11. Montaje local con salida editorial hacia las nubes; cartelas punch-v3 intactas sobre ese cielo animado y cierre canónico azul→morado con URL Luminosidad. Export 30 s/1080×1920/24 fps, 720 cuadros, música y SFX originales V6 mezclados por32 eventos; ningún audio de video/separación contaminada. Gasto adicional USD0; cero solicitudes de generación.

Revisión visual de720 cuadros, holds nativos, hashes aprobados y paquetes de video idénticos tras mux; decodificación sin errores. AAC final −16,25 LUFS/−1,47 dBTP. La sesión no permite escuchar audio: revisión perceptual y aprobación del operador siguen pendientes, no se declara garantía sonora. Fuentes720p y reencuadre de cielo limitan detalle aunque el export sea1080p. [Entrega y evidencia V12](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v12-recovery/README.md).


## V13: correcciones tras feedback de V12

El operador rechazó SFX, música V6, tamaño de URL y tono de cierre, y prefirió el portal nativo V11. V13 usa ese portal continuo hacia el avión, URL620→320 px con Luminosidad, morado más profundo#50015C de la referencia local SKY y música recuperada de V7 con su cierre. Se excluye íntegro el intervalo fuente con narración15,1–24,4 s; puente instrumental de material previo, velocidad1×. Nuevos efectos locales por acción, sin recortes V6. Export30 s/1080p/720 cuadros, USD0 adicionales. QA visual/técnica realizada; escucha/aprobación pendientes. ASR del master es inconcluso (frase ajena inestable), no se afirma validación sonora. Evidencia: `ai-generations/2026-09-23_cmp003-sky-video/seedance/v13-refinement/README.md`.


## V14: Omni localizado y Heroic Ascent Music v2.5

Tras «Vamos con todo», se ejecutó una sola ventana Omni6,5 s/1080p. Se revisaron156 cuadros, entrada por oclusión del paso cercano y salida sólo sobre nubes. Se preservan portalV11, cartelas aprobadas, URL320px/Luminosidad y cierre profundo. Música generada después de fijar imagen: el operador corrigió el catálogo desactualizado del conector; Music2.5 se seleccionó explícitamente en UI. Heroic Ascent tuvo un silencio inicial; la edición de intro dejó una caída7–10 s. La alternativa Ascent of the Brave fue rechazada por el operador, que eligió Heroic. El operador rechazó también el puente local por percibir el corte. Autorizó una nueva toma completa con Heroic como referencia: **Heroic Ascent Finale / Music v2.5**, 30 s, una variante, instrumental, referencia nativa `idrq0CycPCeXW50njc3Y` con influencia1. Proyecto `riVXVCCDac1uJmLXZvTI`, canción `7DG5i9CQXNDR2GTlUqwZ`. El master vigente usa esa toma íntegra, sin empalmes, loops ni retiming; sólo envolvente de volumen. Cinco SFXv2 nuevos, un solo flyby y ningún motor bajo cartelas. La medición no encuentra vacíos internos bajo−50dB en ventanas de100ms antes de29,4s; ASR no detecta habla. Esto no sustituye escucha.

Export30 s/1080×1920/24fps/720cuadros, decode/payload verificados; AAC−16,02LUFS/−1,87dBTP. ASR sin habla es apoyo, no escucha: aprobación perceptual pendiente. Costos: OmniUSD1,046619 estimados desde uso; tres tomas musicales795créditos cotizados cada una y edición de intro con cargo no verificado; SFX97créditos/USD0,02134 reportados. Reparación/editorial localUSD0. [Entrega, decisiones, costos y QA](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v14-finish/README.md). Sin publicación.


Corrección posterior de marca: el operador no percibía SFX al activar el chip. Se añadió ataque9,083s y subida hasta impacto9,583s con material existente; export `sky-v14-brand-accent-1080p.mp4`, USD0 adicionales. Música sin empalmes y stem idéntico; imagen sin cambios. Alcance Omni aclarado: una ventana integrada12,542–18s, salida de avión/nubes; comparación A/B disponible en el README. Escucha/aprobación final pendientes.


## V15: rock aportado por el operador, color y cierre

Ante desconexión música/SFX y cierre abrupto, se integra el rock del ZIP del operador (versión corta32s), tempo uniforme1,14×, afinación conservada y sin empalmes internos. Transformación9,583s y cierre26,127s; guitarra de la misma fuente forma las anticipaciones, sin clic en SKY ni impactos genéricos de cartelas. Se reconstruye imagen desde fuentes nativas, sin JPEG intermedios, con FFV1 y una codificación final; Rec.709 explícito. Salida de Gracias y paso de nubes a azul corregidos. Persiste el límite de detalle del recorte heredado. USD0 adicionales; Music2.5 con referencia autorizado como opción, no ejecutado. Candidato30s/1080p, escucha/aprobación pendientes. Evidencia y límites: `ai-generations/2026-09-23_cmp003-sky-video/seedance/v15-review/README.md`.


## V16: transformación y restauración exportadas

El operador volvió a rechazar el acento por percibir un clic y pidió resolver nitidez. Se retiró el bus anterior y generó un único efecto continuo3s, rango completo, crest9,583s. Coste reportadoUSD0,0066. V15 era1080×1920; cuadros nativos muestran suavidad ya presente. Operador autorizó hastaUSD5,60 para piloto Topaz4s y restauración26s sólo si el piloto mejora sin deformar. Piloto completado y comparado:16 pares de cuadros a intervalos de0,25s y detalle de UI/avión; mejora de definición sin cambios de geometría observados en las muestras. Completo26s enviado una vez, sesión `hIP2qZLzr5W87dqwwrw8`, cotizadoUSD4,852848; pilotoUSD0,746592, sumaUSD5,59944. Automatización de seguimiento V16 activa; export final pendiente. Estado vivo: `ai-generations/2026-09-23_cmp003-sky-video/seedance/v16-brand-repair/README.md`. No afirmar restauración terminada antes de descargar y revisar.


### V16: resultado revisado y entrega

Topaz completó26s/2160×3840/24fps en aproximadamente60min; no hubo reintento. Comparación numérica de624cuadros: error RGB medio2,788 y correlación de cambios temporales0,999878; revisión visual de52muestras,48cuadros densos de chip/pass y detalles de UI/avión. Conserva la secuencia y mejora bordes/definición observada; persisten blur de movimiento e imperfecciones generativas de origen. Cartelas/cierre se recompusieron después,9 hashes aprobados intactos y URL Luminosidad320px equivalentes.

Entregas `v16-brand-repair/sky-v16-restored-4k.mp4` y `sky-v16-restored-1080p.mp4`:30s/720cuadros/24fps/Rec709, decodificación íntegra; misma pista AAC, −16,03LUFS-I/−1,38dBTP. Imagen del master4K idéntica antes/después de mux. Revisados cielo, cartelas, salida de Gracias y azul→morado del cierre. **Escucha y aprobación del operador pendientes**; no se declara certificación auditiva. Coste de restauración reportadoUSD5,59944 dentro del tope; SFX previoUSD0,0066 separado. Estado/evidencia/hashes en README y `qa/delivery-technical.json`. Sin publicación, commit ni push.


## V17: lectura más breve y geometría de logo corregida

El operador acepta reducir 0,5 s del hold de respuesta anterior a la activación y corregir el logo blanco según la referencia de su diseñadora. Tramo fuente6–9 s:72→60cuadros; transformación y vuelo conservan velocidad/secuencia. Duración aceptada29,5s/708cuadros. El vector anterior unía punta y trazo; se usa la geometría separada de `sky-on-dark.svg`, todo blanco, mismo tamaño/posición. Cierre vectorial renderizado directamente a4K.

Música completa y stems posteriores desplazados−0,5s sin empalmes, UI inicial intacta; mezcla desde WAV originales. Imagen recompuesta desde Topaz existente, ambos exports desde RGBA sin encadenar MP4.2160×3840 y1080×1920,24fps,Rec709; decode íntegro y AAC idéntico−16,03LUFS-I/−1,50dBTP. Revisión de59muestras generales,96cuadros consecutivos del ajuste/activación,18muestras de cierre y logo nativo en ambas resoluciones.USD0; V16 y fuentes aprobadas intactas. Escucha perceptual no realizada; aprobación del operador pendiente. [Entregas y evidencia V17](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v17-refinement-plan/README.md).
