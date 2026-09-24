# SKY: registro de producción de cartelas sobre película generativa

Historia completa hasta V17: [retrospectiva de producción](2026-09-24-sky-retrospectiva-produccion-v17.md), con procedencia del montaje, errores, aciertos, modelos y costos.

**Corte:** 2026-09-24. **Estado real:** punch-v3 aprobado; V17 exportado en 4K restaurado y 1080p, 29,5 s/708 cuadros, con QA visual/técnica. Escucha/aprobación final pendientes.

Método reusable vigente: [producción y posproducción de principio a fin](../creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md). Este archivo conserva la secuencia histórica; sus pendientes intermedios no sustituyen el estado actual.

## Autoridad y rutas

- Decisión de campaña: [CDR-008](../../campaigns/decisions/CDR-008-cmp003-cartelas-postproduccion-y-audio-separado.md).
- Plan creativo canónico: [OneDrive CMP-003](</Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/2. Campañas/CMP-003_sky-nos-eligio-seo-aeo/PLAN-VIDEO-AUDIO-V10.md>). Brief, guion, referencias y assets se mantienen allí.
- Método reutilizable: [motion-design-studio](../../../.codex/skills/motion-design-studio/workflows/generative-film-with-approved-title-overlays.md).
- Sonido: [audio-studio](../../../.codex/skills/audio-studio/efeonce/NO_VOICE_MUSIC_SFX.md).
- Corrida local: `ai-generations/2026-09-23_cmp003-sky-video/seedance/v10-local`. Los medios existentes no se movieron ni se publicaron en esta revisión.

## Qué se aprobó

`prueba-cartelas-punch-v3.mp4`, 14,25 s, 1080×1920, 24 fps, muda, fotografía de referencia. Aprobación del operador: «GENIAL!!! Quedó muy muy bueno». Acredita coreografía de cartelas y cierre; no acredita sky plate final ni audio. `approval-punch-v3.json` conserva hashes; `versions/approved-punch-v3/` conserva fuentes/configuración.

El + actúa antes del despliegue de 2.000; la noticia tiene revelado progresivo y SEO/AEO recibe el mayor golpe. Las salidas enlazan escenas y Gracias baja la energía. Relieve fino y barrido especular breve conservan lectura; no metal fijo. La coreografía está fijada en `animator/title-plan.json` y el sonido futuro consume `cue-sheet.json`.

## Export e integración

| Archivo | Inserción | Contrato |
| --- | --- | --- |
| `titulos-y-firma-alpha.mov` | 15,75 s, dura 14,25 s | ProRes 4444 alpha; sólo texto/firma, excluye URL |
| `url-bubble-luminosidad-alpha.mov` | 26 s, dura 4 s | SVG canónico gris; alpha incorpora 0,72; capa a 100% en Luminosidad |

El MOV no transporta blend mode. Nunca insertar la URL con alpha normal esperando el mismo resultado. El cielo final debe estar animado en el video generado; los fondos de prueba no viajan en estas capas.

Reproducción desde raíz del repo: consultar [README de la corrida](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v10-local/README.md), con build, render y verificación de Luminosidad. El engine usa tiempo explícito y seek determinista; no se modificó en esta revisión documental.

## Evidencia y límites

- `qa/engine-check.json`: reproducción/seek estable.
- `qa/export-check.json`: streams, alpha y hashes. Revisar nuevamente tras cualquier rerender; no trasladar el reporte a otro archivo.
- `qa/luminosity-check.json`: comparación con compositor canónico sobre azul y morado; no acredita todos los frames de un fondo futuro.
- `qa/v3-*-to-*.png`: revisión de transiciones. La integración posterior requiere nueva QA sobre el cielo real.
- V9: 16 hojas con 361 cuadros muestreados a 12 fps inspeccionadas; la fuente generada no tiene audio. La mezcla posterior y el feedback del operador documentan residuos vocales/discontinuidad; no se declara escucha nueva en esta revisión.
- En la auditoría inicial no se generó video. Tras autorización condicionada del operador se ejecutó un piloto Omni de 9,5 s, rechazado: cambio de cielo en entrada, doble avión y salto de salida. 228 cuadros inspeccionados; uso estimado ~USD 1,54, no factura. [Informe](../../../ai-generations/2026-09-23_cmp003-sky-video/omni/v10-pilot-01/REVIEW.md). No integrado al master; no se generó audio nuevo.

## Cambios documentales de esta revisión

Se actualizaron BRIEF/PRODUCCION/ASSETS/DECISIONES y se añadió el plan V10 en la carpeta local sincronizada de OneDrive. Se corrigió el contrato Omni antiguo del workflow para distinguirlo de la CLI Cloud 1.1; la implementación existente no cambió. Skills motion/audio se espejan en `.codex` y `.claude`.

No se requiere un ADR nuevo: CDR-008 conserva la decisión de campaña; el carril Omni mantiene su ADR vigente. No cambian contratos compartidos, APIs, auth, source of truth ni runtime. AGENTS ya enruta creative/documentación; project_context suma una referencia breve a los workflows motion/audio. Se conserva el contenido histórico que difería entre espejos: la descripción extendida de Audio Studio queda en `efeonce/EXTENDED_DESCRIPTION.md` y el workflow del estático a loop permanece en ambos índices.


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


## V16: cierre de restauración y mezcla de marca

Piloto Topaz4s aceptado y metraje26s restaurado una sola vez tras autorización hastaUSD5,60. Total reportadoUSD5,59944. Revisión y composición posterior mantienen cartelas aprobadas, URL Luminosidad y cierre azul→morado. Salidas30s/24fps/720cuadros:2160×3840 restaurado desde montaje1080p y derivado1080×1920; no afirmar4K nativo. Se mantiene rock íntegro a tempo uniforme y se sustituye el bus de marca por una trayectoria sonora de3s con crest9,583s. Resultado medido−16,03LUFS-I/−1,38dBTP; escucha no realizada en esta sesión. Evidencia y entregas: `ai-generations/2026-09-23_cmp003-sky-video/seedance/v16-brand-repair/README.md`.
