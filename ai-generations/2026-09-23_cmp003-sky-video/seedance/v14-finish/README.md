# SKY V14 · acabado y mezcla para revisión

2026-09-24. Imagen terminada; nueva toma Heroic Ascent Finale generada con referencia nativa Heroic y mezclada sin empalmes. Revisión perceptual del operador pendiente. Sin publicación, commit ni push.

## Entrega

- `sky-v14-finished-1080p.mp4`: 30 s, 1080×1920, 24 fps, 720 cuadros; H.264 + AAC estéreo 48 kHz/256 kb/s.
- `audio/sky-v14-master.wav`: master 24-bit/48 kHz.
- `audio/stem-*.wav`: música, UI, portal, avión, títulos y SFX agregado, reloj de30 s común.
- `audio/music-v2.5-heroic-reference.wav`: nueva toma íntegra **Heroic Ascent Finale / Music v2.5**, sin reparación editorial.

## Imagen

Una edición Omni1.1 de6,5 s usó sólo el clip V13 como referencia. Se revisaron156 cuadros y los empalmes. Se conserva el paso cercano original hasta f300; corte bajo oclusión en f301; salida de la ventana por transición sólo de nubes f420–432. Ninguna disolvencia entre aviones. Fuera de esa ventana permanece V13: búsqueda lateral, progresión UI, portal V11, cartelas punch-v3, cielo generativo móvil, URL320 px/Luminosidad y azul→morado#50015C. Los9 hashes de assets aprobados se verificaron antes de componer. No afirmar que todos los problemas de velocidad fueron eliminados sólo por usar Omni: el movimiento completo se entrega para revisión perceptual.

## Música: decisiones y errores

El catálogo del conector mostró sólo Music v1/v2. El operador corrigió que existía2.5; docs oficiales y UI autenticada lo confirmaron. Se usó **Music v2.5** por Computer Use,30 s, una variante e Instrumental explícito. La UI de historial puede reactivar letras al navegar: se verificó de nuevo antes de enviar.

1. Heroic Ascent original: produjo10 s de silencio. Rechazado como master.
2. Edición de su introducción: produjo música al inicio pero decaimiento7–10 s. No resolvió continuidad. El operador oyó y señaló ese defecto.
3. Ascent of the Brave: toma completa continua, rechazada por preferencia del operador; no está en el master final.
4. **RECHAZADO por el operador por corte audible.** El operador eligió conservar Heroic Ascent. Corrección **local, USD0**: reprise de dos compases de la introducción instrumental limpia, fuente2,05–6,30 s→destino6,05–10,30 s, fundidos0,16/0,26 s, velocidad1×. Se preserva exactamente la fuente posterior10,30 s antes de la mezcla/normalización. No es otra generación, ni un loop del vuelo V7; contiene una reprise musical explícita. Medición confirma retirada del vacío; la naturalidad del empalme requiere escucha.

Fuentes UI: Heroic `gyvTaCwHahnhAWn0aB0k`, original `agrv5ZmlinFC7ODYyxM1`, edición `idrq0CycPCeXW50njc3Y`; alternativa rechazada `U2sOYyYGSZJ5XIJYZe4D` / `MhPnBggvzdOoQmOJVe2b`.

## SFX y continuidad

Cinco efectos originales **Eleven Sound Effects v2**, una variante cada uno, `loop:false`. Prompts finales concisos por causa física. Foley de teclas separado por ataques y alineado a escritura real; Enter1 s, resultados2,04/2,33/2,58 s, chat4 s, respuesta4,65 s, cita5,75 s, bloom9,5 s, UNA pasada10,30–15,30 s con máximo en12,5 s. Acentos de cartelas sólo+18,54 ySEO21,71. Sin motores después15,30 s; cierre sostenido por música, sin clic de URL. Música inicia con envolvente desde Enter y mantiene desarrollo, sin ducking que la vacíe en el portal.

## QA y límites

- `qa/final-delivery.json`:30 s,720 cuadros, decodificación correcta y payload de video idéntico tras mux.
- `qa/audio-mix.json`: AAC real medido **−16,02 LUFS-I / −1,87 dBTP**; stems/cues disponibles.
- `qa/heroic-local-bridge.json`: origen y destino de reparación; `qa/music-continuity.json` corresponde a alternativa rechazada, no al tema final.
- ASR/VAD de Heroic Ascent Finale no detectó habla. **No acredita ausencia perceptual de voz ni musicalidad.** El agente no puede escuchar audio en esta sesión; no declarar escucha hecha, aprobación humana ni resultado garantizado.
- `qa/output-all-*`, `integrated-seams.jpg`, `portal-cues.jpg`, `whole-film.jpg`: revisión visual. El MP4 exportado1080p conserva límites de detalle de fuentes/reencuadres previos.

## Costos de esta ejecución

`cost-ledger.json`: un Omni; uso reportado equivale a **USD1,046619** según tarifas, no factura. Música: tres tomas completas (795 créditos cotizados cada una) y una edición de introducción (tarifa1591 créditos/min; cargo final de música no verificado). Cinco SFX:97 créditos / **USD0,02134** reportados por el conector. La corrección editorial y composición local cuestanUSD0. No hubo otras llamadas de video ni reintentos automáticos. La cotización inicial deUSD0,20 de audio quedó superada por las correcciones musicales y cambio de superficie; no presentarla como costo final.


## Última corrección del operador y resultado vigente

«Genera otra, cuando cortas tú se siente el corte abrupto». El puente editorial queda rechazado y se conserva como `sky-v14-editorial-bridge-rejected.mp4`. La toma vigente es **Heroic Ascent Finale**, generada completa en Music v2.5 con Heroic adjunto mediante «Usar como referencia», influencia1. La referencia real es la canción nativa completa `idrq0CycPCeXW50njc3Y`; el extracto local preparado NO se subió ni se usó. El operador autorizó explícitamente aceptar los términos; la ruta nativa evitó el upload fallido.

Nueva generación: proyecto `riVXVCCDac1uJmLXZvTI`, canción `7DG5i9CQXNDR2GTlUqwZ`, 30s, una variante, Instrumental verificado, 795 créditos cotizados. Music v3 no figuraba en selector ni docs verificadas. Referencia, resultado y procedencia en `heroic-reference-plan.json`.

`qa/heroic-reference-continuity.json`: señal continua en7–10s; ninguna ventana de100ms bajo−50dB antes de29,4s. La caída final29,4–30s corresponde a la cola de salida. Sin empalmes musicales, loops ni cambios de velocidad; sólo envolvente desde Enter y normalización. El agente no escucha en esta sesión: pendiente aprobación perceptual humana. El master y stems fueron sustituidos por esta toma; las versiones rechazadas se preservan como evidencia.


## Corrección del acento de marca

El operador reportó que no se percibía un SFX en la activación del botón morado. La mezcla anterior sólo tenía el impacto desde9,47s; faltaba un cue de activación y continuidad sonora durante el acercamiento. Se reutilizaron foley y portal existentes: ataque en f218/9,083s, subida de0,5s durante el zoom y bloom en f230/9,583s con mayor nivel. Sin nuevas generaciones ni gasto; música premaster idéntica bit a bit, sin empalmes. Readback AAC−16,02LUFS-I/−1,87dBTP. Escucha perceptual pendiente.

Entrega con nombre nuevo para evitar confusión: `sky-v14-brand-accent-1080p.mp4`. Copia anterior: `sky-v14-before-brand-accent.mp4`. El video no cambió en esta corrección.

Omni fue una sola ventana: integración f301–431 (12,542–18s), con disolvencia sólo de nubes17,5–18s. No rehízo UI ni portal. Comparación sincronizada12–18s: `qa/omni-before-after-12-18s.mp4`, original a la izquierda y montaje integrado a la derecha. El cambio es discreto y no acredita una transformación de toda la película. `qa/omni-integration-readback.json` contrasta cuadros del export con ambas fuentes.
