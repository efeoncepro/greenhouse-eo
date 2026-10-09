# Fotos aprobadas → reel vertical con capa gráfica determinística y transición punto → logo

> **Estado:** validado — 2026-10-09 · video vertical de 12 s publicado en la muestra AEO X-Ray de Pibank Perú
> (campo `reel` de la pieza «Story + video» en ambas piezas; commit efeonce-think `5594128`). No hay registro
> separado de aprobación creativa del video fuera de su publicación en la muestra.
> **Evidencia y receta:** expediente fuera de git `~/Documents/Banco Pichincha Peru — Prospect Case/09-XRay-Pibank/video/`.

## La idea en una frase

Partir de **fotos ya aprobadas** (no de un prompt en blanco), convertirlas en **cuadros clave verticales**, animarlas
con **Gemini Omni image-to-video**, y poner todo lo que debe ser exacto (titular, tarjeta, checks, logo) en una
**capa gráfica HTML determinística** renderizada cuadro a cuadro. El cierre es una **transición de marca**: el punto de
color del logo del cliente crece, llena la pantalla y se encoge hasta ser el punto del logo final. Música instrumental
de **Eleven Music** por el conector remoto oficial.

## Cuándo usarla

- Hay fotos aprobadas de una pieza (X-Ray, campaña, landing) y se necesita un reel vertical corto (≈ 10–15 s) coherente
  con ellas.
- El mensaje depende de texto y marca exactos (criterios, checks, logo) que un modelo de video no reproduce fielmente.
- El logo del cliente tiene un elemento geométrico simple (punto, círculo) que puede actuar de hilo de la transición.

## Pasos (encadenados)

1. **Cuadros clave verticales desde las fotos aprobadas.** Editar cada foto a 2:3 vertical, sin regenerar la escena:
   `pnpm ai:image --image <foto-aprobada> … gpt-image-2.5-sunburst 1024x1536` (ver la skill `greenhouse-ai-image-generator`
   para flags vigentes). En Pibank: 2 cuadros clave.
2. **Animar cada cuadro con Omni image-to-video** (contrato en el manual CLI Omni 1.1):
   `pnpm ai:omni --task image --staging-uri gs://… --aspect 9:16 --resolution 1080p --duration 5`
   (≈ US$0,76 por toma de 5 s). Prohibir texto en el prompt: el texto vive en la capa gráfica.
3. **Capa gráfica determinística en HTML** (`graphics.html` + `render-graphics.mjs`): la página expone `seek(t)` y se
   captura cuadro a cuadro como **PNG con alfa a 30 fps**. En Pibank: titular cinético, tarjeta con tres criterios
   cuyos checks se dibujan, cortina navy y la transición punto → logo.
4. **Transición punto → logo.** El logo se inyecta como **SVG** en la página y la posición/tamaño del punto se mide con
   `getBoundingClientRect()`; la animación del punto (crece, llena la pantalla, se encoge) termina exactamente sobre esa
   caja, así el punto del logo final coincide al píxel. Logo blanco sobre el fondo de marca (navy en Pibank), sin
   recuadro.
5. **Montaje con ffmpeg por segmentos**: renderizar cada tramo (toma Omni + overlay) a su archivo intermedio y luego
   concatenar. No intentar un único filtro gigante (ver gotchas).
6. **Música:** Eleven Music por el conector **remoto oficial** de ElevenLabs (`creative_generate_in_flow`, nodo `music`,
   modelo `eleven_music_v2_5`, instrumental). ≈ US$0,35 por pista; tarda ≈ 5–7 min. Detalle en `audio-studio`
   (`efeonce/STUDIO_TOOLING.md`).
7. **Verificar ausencia de voz** en cada pista con `whisper-cli` (modelos locales en `~/.cache/hyperframes/whisper/models/`).
   Un ASR vacío es una señal, no una escucha: la aprobación perceptual sigue siendo del operador.
8. **Mezcla y entrega:** −16 LUFS integrado (medido −15,5) con fades de entrada y salida; export web H.264 con
   faststart y poster (criterios de entrega web en `seo-aeo/references/aeo-xray.md` §7).

## Qué NO hacer / gotchas

- ❌ **Un solo filtro ffmpeg con `zoompan` + `xfade`** para todo el montaje: quedó trabado sin consumir CPU. Renderizar
  por partes y concatenar.
- ❌ **Conectores locales de ElevenLabs** (`elevenlabs` y «ElevenLabs Player»): tienen cargado el ID de la clave en vez
  de la clave `sk_…`; fallan. Usar el remoto oficial (`creative_*`). Antes de declarar bloqueo, probar los demás
  conectores del mismo servicio.
- ❌ **Enviar a Omni con ADC vencida:** el intento falló antes del envío (sin cobro). Renovar con
  `pnpm gcloud:auth:playwright -- --force` (puede requerir login del operador) y reintentar.
- ❌ Pedirle al modelo de video el texto, los checks o el logo: van en la capa HTML.
- ❌ Dibujar el punto final «a ojo»: medir la caja real del SVG del logo.

## Costo / gasto gobernado

Pibank, aproximado: imagen + Omni ≈ US$1,9; música ≈ US$0,70 (dos pistas). Total ≈ US$2,6. El intento con ADC
vencida no tuvo cobro.

## Evidencia

- Receta y fuentes: `09-XRay-Pibank/video/` (fuera de git).
- Publicación: muestra Pibank en Think, commit `5594128` (música en el video).
- Caso de referencia del X-Ray: `seo-aeo/references/aeo-xray.md` §10.
