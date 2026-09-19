# «Nivel de búsqueda» — trendjacking GTA VI / estética Vice City (2026-09-19)

Estado: **prueba producida y revisada por el agente**. Sin aprobación humana, sin programar, sin publicar.

## Oportunidad (clasificación: trendjacking; capa de seasonality por lanzamiento)

- Detonante primario: GTA VI sale el **19 de noviembre de 2026** (Rockstar Newswire). El 2026-09-19 Spotify lanzó
  «GTAVI: The Album» con vallas de estética GTA en Nueva York, Los Ángeles y Miami (Marketing Directo, mismo día).
- Marcas publicando con estética Vice City: **observación del operador**. El agente no pudo muestrear posts nativos
  (IG/X/TikTok sin acceso); la única marca verificada con fuente es Spotify. Estado puntual, evolución no verificada.
- `review_before`: revalidar el tono de la conversación justo antes de programar. Ventana estimada: desde hoy hasta
  el lanzamiento, con un segundo pico probable el 19-nov; condición de retiro: saturación visible de marcas usando
  el mismo código o un cambio de sentido (polémica del juego).

## Idea

- Tensión: en el juego, que toda la ciudad te busque es lo peor; en la búsqueda con IA, que nadie te encuentre es lo peor.
- Mecanismo: **reencuadre por doble sentido**. En el GTA en español, las estrellas de persecución se llaman
  «nivel de búsqueda». Para Efeonce «búsqueda» es su territorio AEO (foco actual PDR-019: AEO + IA).
- Papel de marca: punto de vista + demostración de oficio (las cinco estrellas son cinco señales AEO reales).
- Rutas descartadas: «Misión cumplida / Respeto +» (demasiado pegada a la UI de Rockstar); portada tipo collage de
  personajes (exige imitar el arte de carátula, riesgo de IP alto).

## Piezas (PNG 1080 × 1350, `out/`)

| Archivo | Rol |
|---|---|
| `carrusel-01-portada` | hook: «¿Cuál es tu nivel de búsqueda?», HUD con 0 estrellas |
| `carrusel-02-el-juego` | reencuadre: 5 estrellas en el juego vs en la IA |
| `carrusel-03…07` | una estrella por señal: entidad · respuesta primero · datos propios · menciones · rastreabilidad |
| `carrusel-08-cierre` | «Cinco estrellas. Todos te buscan. Y te encuentran.» + pregunta |
| `post-nadie-te-busca` | pieza suelta (Threads / IG feed): ausencia — motel vacío, 0 estrellas |

Canal-hogar (PDR-020): Instagram + Threads. No despiezar a canales lentos. LinkedIn sólo si se reescribe como
argumento profesional (documento PDF con el mismo cuerpo de 5 señales).

## Copy de publicación (propuesta)

**Carrusel (Instagram):**
> A dos meses del 19 de noviembre, media internet anda con la cabeza en Vice City. 🌴
> En el juego, cinco estrellas significan que toda la ciudad te está buscando. En la búsqueda con IA significan lo
> mismo, y ahí sí las quieres. Estas son las cinco que hacen que ChatGPT, Gemini o Perplexity te encuentren y te citen.
> ¿Cuántas tienes hoy? Te leemos en los comentarios 👇
> #GTA6 #AEO #MarketingDigital #InteligenciaArtificial

**Pieza suelta (Threads):**
> Nadie te está buscando. En el juego es la mejor noticia; en la búsqueda con IA, la peor.
> ¿Cuándo fue la última vez que le preguntaste a ChatGPT por tu categoría y apareciste tú?

Si se quiere empujar el AI Visibility Grader, va en caption/bio, nunca como botón en la imagen.

## Producción y QA

- Plates: `gpt-image-2.5-flare`, 1152 × 1440, sin texto/logos/personas (`brief/plates.json`, ≈ USD 0,20).
- Composición determinística: `componer.mjs` + `brief/slides.json`. Bricolage (ideaShort / ideaMedium) + Poppins
  (structureLead / structureLabel) desde `axisAdvertising`, glifos convertidos a trazos. Estrellas en
  `accentSurface` (#ff6500). HUD dibujado por nosotros: no usa la UI, tipografía (Pricedown) ni marcas de Rockstar.
- Contraste medido bajo la tinta (p98 del fondo, `out/qa.json`): láminas 2–7 ≥ 15:1; cierre 18:1 / 6,4:1;
  portada titular 3,7:1 y pieza suelta apoyo 4,2:1 (texto grande ≥ 3:1). Logo: negativo salvo la pieza suelta,
  que usa color porque cae sobre la piscina clara (5:1).
- Revisado a 390 px (`out/preview-390/`, `nivel-de-busqueda-hoja-de-revision.png`).

## Riesgos abiertos

- **IP:** «GTA», «Vice City» y «Rockstar» no aparecen en las piezas; sólo en el caption como referencia editorial.
  No pautar este contenido sin revisión legal (Take-Two es activo en defensa de marca).
- El convertible del plate recuerda a un clásico europeo reconocible; sin logos ni placas legibles.
- Claims AEO: son criterios de práctica, no cifras. Nada de % inventados.
