# Trendjacking «Nuestro Duo» (iPhone Duo) — 2026-09-11

## Estado

Programado en Metricool para la marca **Efeonce Group** (`brandId 3961547`, `America/Santiago`). Los posts quedaron en
`PENDING` (programado, **no** publicado). Falta confirmar la publicación efectiva después de cada hora.

| Red | Cuenta | Hora (Chile) | Post Metricool | Estado observado |
| --- | --- | --- | --- | --- |
| Threads | `efeoncecl` | 2026-09-11 12:30 | `374436590` | `PENDING` |
| Instagram | `efeoncepro` | 2026-09-11 19:00 | `374436637` | `PENDING` (`isAiGenerated: true`) |
| LinkedIn | página `urn:li:organization:20503593` | 2026-09-12 11:00 | `374436668` | `PENDING` |
| YouTube (Short) | canal `UCSChYlj2eOqmemSFgevmVKg` | 2026-09-12 12:00 | `374447961` | `PENDING` (`type: short`, `isAiGeneratedContent: true`) |

## Trend y ángulo

Apple presentó el iPhone Duo (su primer plegable tipo libro) el 2026-09-09. Las marcas se sumaron con cuatro
mecánicas: juego de nombre (Duolingo: «oh god oh god my SEO my SEO», «They named a phone after me…»), «lo hicimos
primero» (Samsung: «reheating our leftovers»), **su producto como un Duo** (Domino's «Duomino», Heinz «Ketchup Duo»)
y tensión del oficio en las dos mitades (Canva). Duolingo **no** estaba en pánico: se sumó al trend en tono de
personaje. Lección aplicada (ContentGrip): el chiste debe llevar el mensaje de la marca; la referencia como
decoración falla.

Ángulo Efeonce: «nuestro Duo» = SEO en una pantalla, AEO en la otra. Nada de claims inventados; la marca de
ejemplo en las pantallas es «tumarca.com».

## Pieza

- 4:5 1080×1350: `https://storage.googleapis.com/efeonce-group-greenhouse-public-media-prod/campaigns/iphone-duo-2026-09/efeonce-nuestro-duo-1080x1350.png`
- Texto de la imagen: «Todos hablan del iPhone Duo.» / «Nuestro Duo.» / «Tu marca, en la búsqueda y en la respuesta.»
- Producción híbrida: el clean plate (manos + plegable con pantallas chroma) es IA (`gpt-image-2`, 1600×2000,
  quality high, 2 variantes; se eligió la 1). Pantallas SEO/AEO, titular y logo son **composición determinística**
  (HTML → Playwright, homografía por mitad sobre el chroma key, logo real `public/branding/logo-negative.svg`). No
  hay logo de Apple ni imágenes de Apple.
- Alt text: «Dos manos sostienen un teléfono plegable abierto. En la pantalla izquierda, resultados de búsqueda con el
  título SEO; en la derecha, una respuesta de IA con el título AEO. Arriba: Todos hablan del iPhone Duo. Nuestro Duo.
  Tu marca, en la búsqueda y en la respuesta. Logo de Efeonce abajo.»
- Etiqueta de IA declarada en Instagram y YouTube (manos/teléfono fotorrealistas generados con IA).

## Copy aprobado

- **Gancho común:** «El iPhone Duo tiene dos pantallas. Tu cliente también.» + «En una te busca en Google. En la otra
  le pregunta a ChatGPT.» + «La que te falta se la queda tu competencia.»
- **LinkedIn:** agrega «¿Apareces en las dos?», «Nuestro Duo: SEO: te encuentran. AEO: te recomiendan.», «Uno sin el
  otro es medio Duo. Y nadie paga US$1.999 por medio Duo.» y CTA a `https://efeoncepro.com/aeo-2/` (HTTP 200
  verificado), `previewIncluded: false`.
- **Instagram:** versión corta con CTA de reenvío («Mándaselo a quien lleva el marketing de tu marca»).
- **Threads:** versión conversacional que cierra con «¿En cuál apareces tú?».
- Iteraciones descartadas por el operador: «SEO de un lado. AEO del otro.» (redundante/contradictorio), «Duolingo está
  en pánico por su SEO» (hecho inventado) y «la búsqueda ya estaba partida» (calco forzado).

## Horario

Datos `getBestTimeToPostByNetwork` (semana del 11 al 15): Instagram pico del viernes a las 19:00; LinkedIn viernes
11:00 ya ocupado por el post de vacantes (`374399721`), así que se eligió el sábado 12 a las 11:00 (2.º mejor valor).
Threads a las 12:30 por ser el canal reactivo del trendjacking (PDR-020).

## YouTube Short (9:16)

- Video: `https://storage.googleapis.com/efeonce-group-greenhouse-public-media-prod/campaigns/iphone-duo-2026-09/efeonce-nuestro-duo-short-1080x1920.mp4` (1080×1920, 8 s, audio).
- Título: «Nuestro Duo: SEO y AEO | Todos hablan del iPhone Duo». Descripción derivada del copy de Instagram + CTA a `/aeo-2/`.
- Metricool no expone posts de comunidad de YouTube (solo `video`/`short`), por eso se produjo un Short.
- Producción: Higgsfield `seedance_2_5`, `omni_reference`, 1080p, 8 s, con el plate 9:16 como `start_image` y cada
  pantalla como `image_references` (72 créditos Higgsfield por intento).
- Aprendizajes de las tres corridas:
  1. Con las pantallas originales (texto chico), el modelo redibujó el texto: «B2S», «Tu marce», «quieres». Rechazado.
  2. Pantallas en verde + reemplazo determinístico por frame: descartado por el operador antes de usarlo, porque el
     texto pegado no se ve dentro de la pantalla (sin luz ni reflejos del movimiento).
  3. Pantallas «video-safe» (mismo diseño, pocas frases grandes, sin URLs ni texto diminuto) + cada pantalla como
     referencia: texto correcto y estable los 8 s, pantallas nativas. Aprobado.
- Seedance no respetó el encuadre del `start_image`: el teléfono entra más grande y sube (borde superior de 598 a
  468 px). El texto se re-diagramó con esa medición: logo + eyebrow + titular terminan en 440 px y la bajada va
  desde 1430 px, entre las manos. Texto y logo son overlay determinístico (ffmpeg), nunca pasan por el modelo.

## Pendientes

- Confirmar publicación efectiva de cada post después de su hora.
