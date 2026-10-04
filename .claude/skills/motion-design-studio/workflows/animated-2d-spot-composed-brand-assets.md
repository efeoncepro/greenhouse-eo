# Spot animado 2D con assets de marca compuestos

> Estado: **validado** — 2026-10-03 · v2 aprobada por el operador (49,6 s, 1920×1080, 24 fps: «Quedó genial…
> Muy bueno») · Evidencia: `ai-generations/2026-10-03_sparks-aeo-60s/` (scripts y `.md` en git, media
> gitignored; commits `eb08704da` v1 voz/mezcla, `178c73c6c` v2, `81b171fc6` cierre) · historia y decisiones en
> `PREPRODUCCION.md` §11–12 del run · retrospectiva del caso:
> [`docs/operations/social/2026-10-03-sparks-aeo-spot-animado-production-method.md`](../../../../docs/operations/social/2026-10-03-sparks-aeo-spot-animado-production-method.md).
> Aprobación creativa ≠ licencia de música confirmada [pendiente] ≠ publicación. Distribución del caso (2026-10-03):
> concepto CMP001-08 «Los Sparks» en Marketing Studio y posts programados en Metricool (IG 05-oct, LinkedIn 08-oct,
> `PENDING`, no publicado); registro en `final/redes/PROGRAMACION.md` del run (ver §9).

El método transversal (orden de preproducción, gates, estados) vive en el
[método operativo](../../../../docs/operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md) y sus
[companions](../companions/video-preproduction-and-production.md). Este archivo es la **receta del spot animado 2D**:
qué capa produce cada herramienta, con qué script del run y qué gate la cierra.

## Cuándo usarla

Explainer o spot de marca **animado 2D** (cartoon cel-shaded: contorno grueso, un escalón de degradado, sombras
duras) con personajes, **mascotas de marca exactas** (los Sparks u otro personaje con SVG/rig oficial), pantallas de
interfaz legibles y cierre con logo. Duración corta (el caso: 49,6 s), cámara que se mueve y luz con profundidad.

No usarla cuando: la pieza es fotográfica o live action (fotografía de marca y sus comandos `foto:*`); los
personajes necesitan **lipsync** o diálogo en cuadro (no se probó: aquí sólo hay narrador); la mascota puede ser
reinterpretada por el modelo (entonces no es «exacta» y otro workflow aplica); o el brief pide una sola toma
continua larga (el tope por solicitud es 15 s, ver §Trampas).

## Contrato

- **Input:** brief aprobado; `PREPRODUCCION.md` con historia, guion VO, música, SFX y VFX por toma; storyboard en
  canvas aprobado por escena; elenco 2D canonizado (hojas de giro y expresiones); SVG oficiales de las mascotas
  (`@efeoncepro/axis-brand-assets`, sparks-2d); kit sonoro oficial; logos oficiales.
- **Locks:** diseño de la mascota (nunca la genera el modelo, nunca se espeja), logos, texto e interfaz (siempre
  compuestos), paleta, elenco (quién puede aparecer y en qué papel).
- **Variable:** luz, cámara, gesto de los personajes humanos, fondos, ritmo.
- **Output:** master con y sin subtítulos quemados; SRT de diálogo y SRT SDH; stems; master de audio medido.
- **Gates humanos:** aprobación por escena del storyboard; aprobación del elenco; piloto; corte mudo; escucha y
  aprobación final del operador.

## Las cinco capas (quién produce qué)

| Capa | Quién la produce | Herramienta en el run | Regla dura |
|---|---|---|---|
| 1. Personajes humanos 2D | motor de imagen con las hojas del elenco como referencia | `pnpm ai:image` (GPT Image 2.5 Sunburst, 2048×1152 high) | sólo el **elenco 2D ficticio** hace de cliente; el elenco fotográfico representa al equipo Efeonce |
| 2. Mascotas de marca | **composición** desde el SVG oficial | `cuadros/compose-sparks.cjs`, `cuadros/spark-mirada.cjs` | nunca generadas, nunca espejadas; la mirada se emula con la lógica del rig |
| 3. Movimiento | image-to-video con cuadro inicial y final | `pnpm ai:fal --capability h3-i2v` (MiniMax H3 base, 768P) | H3 base con `--prompt-expansion disabled`; mismo eje de cámara inicio/fin |
| 4. Motion graphics exactos | vector dibujado cuadro a cuadro | `corte/ui-s2-s9.cjs`, `corte/placas-1080.cjs`, `corte/placa-cierre.cjs` | ningún texto generado; escala decimal, nunca `zoompan` |
| 5. Audio | VO, SFX, cama, mezcla | ElevenLabs Creative `eleven_v4`, ffmpeg, Stable Audio 2.5 a2a, `audio/mezcla-v2.py` | VO escrita con la skill dueña de la oferta; cama derivada del kit oficial |

Lo de marca se **compone**; el modelo sólo pone luz y movimiento.

## Pasos (encadenados)

### 0. Preproducción transversal

Sigue el orden del [companion de preproducción §12](../companions/video-preproduction-and-production.md#12-preproducción-transversal-orden-y-gates)
(brief → historia/VO/música/SFX/VFX → storyboard en canvas con aprobación por escena → elenco → contrato de
fidelidad → cuadros clave → piloto). En este tipo de pieza, dos decisiones se toman antes de cualquier imagen:

- **Elenco.** Si el papel es «cliente», usa el elenco 2D. Canon: `docs/operations/brand-characters/EFEONCE_2D_CAST_V1.md`;
  referencias en `ai-generations/_identidad-elenco-2d/`; sellado en `scripts/foto/assets.lock.json`;
  `scripts/foto/build-prompt.mjs` declara `ELENCO_2D` y el rol `ilustracion-2d`. Sello Efeonce sutil en personajes:
  rim light azul `#0375db` + un objeto azul por personaje; sin órbitas ni esferas en ellos. Si falta un personaje,
  se crea y aprueba **antes** de los cuadros clave (hojas de giro y expresiones).
- **Copy de oferta.** Antes de escribir la VO de una capacidad comercial, carga la skill dueña (en el caso:
  `seo-aeo`, `seo-aeo-practice`) y el canon del personaje (`docs/operations/brand-characters/SPARKS_V1.md`). La v1
  del caso tuvo que reescribirse porque la premisa contradecía la oferta.
- **Naming del servicio.** Guion, subtítulos y copy nombran el servicio como **«Efeonce | AEO»** (con barra) y la
  marca que habla es **Efeonce** («En Efeonce lo resolvemos con nuestro servicio Efeonce | AEO…»). Se fija aquí, antes
  de grabar la voz y quemar subtítulos. Caso fuente: la voz y los subtítulos de «Los Sparks» dicen «Efeonce AEO»; el
  operador lo corrigió en los copies de redes y decidió no re-renderizar el video.

### 1. Cuadros clave por toma (inicio y fin)

Pipeline de cuatro pasos; los nombres de archivo son los del run (`cuadros/`):

1. **Plate** `<toma>-plate.png` — GPT Image 2.5 con las hojas del elenco como referencia, **sin mascotas** y sin
   texto. Prompt al lado (`<toma>-plate.prompt.txt`).
2. **Mirada** (si la mascota debe mirar a alguien) — `node cuadros/spark-mirada.cjs <svg-oficial> <salida.svg> <x -1..1> <y -1..1>`.
   Emula el `lookAt` del rig: la cara LED (entre el reflejo del visor y los botones) se traslada dentro del clip del
   visor (elipse cx200 cy196 rx96 ry48) en x·0,3·96, y·0,28·48; el cuerpo rota x·5° en (200,215). No agrega
   formas ni colores, no espeja. Variantes del run: `cuadros/spark-<rol>-mira-<dirección>.svg`.
3. **Compuesto** `<toma>-compuesto.png` — `node cuadros/compose-sparks.cjs <placa> <salida> '<json: [{svg, cx, cy, alto, halo?, desenfoque?}]>'`:
   rasteriza el SVG a densidad 600, halo radial en modo `screen` y desenfoque opcional para los lejanos (profundidad).
4. **Acabado sólo de luz** `<toma>-acabado-bruto.png` (prompt `<toma>-acabado.prompt.txt`) y **mezcla por zonas**
   `node cuadros/merge-zonas.cjs <base> <acabado> <salida> '<json: [[cx,cy,rx,ry], …]>' [pluma]`: toma el acabado
   sólo dentro de elipses difuminadas e imprime cuántos píxeles cambiaron fuera de zonas+margen; **sale con código 1
   si cambió alguno**. Gate: 0 px fuera [medido en el caso].

Gate del paso: el operador aprueba los cuadros (en el caso pidió que el Spark mirara a Tomás; se corrigió con el
paso 2 y lo aprobó). Exporta a **JPG** para subir al proveedor (ver Trampas).

### 2. Piloto de una toma de riesgo

Elige la toma que concentra el riesgo de identidad (en el caso, S3: el Spark sale del portal) y genérala con las
variantes que quieras comparar, mismos cuadros. Extrae cuadros (`piloto/frames-*`) y compara a tamaño real. Resultado
del caso: **H3 base con `--prompt-expansion disabled` es más fiel que H3 Max; Max giró los Sparks en 3D** [medido].
El piloto se autoriza aparte (USD 0,72; S3 v2 USD 0,50).

### 3. Tomas image-to-video

Forma de referencia (flags de `scripts/ai/fal-image.ts`; los registros reales con `request_id` y estimado están en
`tomas/<toma>.log`):

```bash
pnpm ai:fal --capability h3-i2v \
  --image tomas/<toma>-inicio.jpg --end-image tomas/<toma>-fin.jpg \
  --resolution 768P --duration 5 --prompt-expansion disabled \
  --prompt "$(cat tomas/<toma>.prompt.txt)"
```

- **Una toma ≤ 15 s** por solicitud (tope verificado en fal y Higgsfield); las escenas cortas son límite y control.
- Cuadro inicial y final **comparten eje de cámara**; si no, la toma salta de trayectoria.
- Upscale a 1080: `scale=1920:1097:flags=lanczos,crop=1920:1080,unsharp=5:5:0.35`. 1080P no existe en `h3-i2v`
  (480P/768P/2K/4K) y `h3max-i2v` no tiene 2K [sondeo de flags del 2026-10-03].
- Revisa cada toma contra los cuadros: texto ilegible, cambio de paleta o mascota girada = rehacer con la regla en el
  prompt (en el caso, S1 y S8 por texto, S6 por verde; los descartes quedan como `tomas/*-descarte-*.mp4`).

### 4. Motion graphics exactos

- **Interfaz con zoom** (`corte/ui-s2-s9.cjs`): cada cuadro se dibuja desde el vector con escala **decimal**
  (SVG → sharp raw → ffmpeg). `zoompan` redondea el encuadre a píxeles enteros y salta.
- **Placas** (`corte/placas-1080.cjs`; las provisorias del corte mudo, `corte/placas-provisorias.cjs`).
- **Marcas de terceros en la ficción:** inventadas y verificadas sin empresa homónima por búsqueda web fechada
  (caso: Rodavía, Kilomar, TrazaNorte, 2026-10-03). Nunca un placeholder `[Marca ficticia]` en un corte entregable.

### 5. Corte mudo → corte con un solo mapa de tiempos

1. Corte mudo con placas provisorias para juzgar ritmo antes del audio.
2. Re-timing desde **un único mapa** (`corte/corte-v2.py`: tuplas `segmento, inicio, velocidad 1,0–1,5×, duración
   conservada` + `remap()`), que mueve a la vez video, voz, eventos del bus de SFX y subtítulos. Tras re-timar,
   revisa todo sonido con tiempo absoluto: en el caso el logo sonoro intermedio cayó sobre la voz y se retiró.
3. El ritmo lo dicta la historia: la v1 estiraba tomas para llenar los 60 s del brief y el operador la encontró lenta.

### 6. Cierre animado y logo sin voz

`PLACA_N=<cuadros> PLACA_AEO=<s> PLACA_AVR=<s> node corte/placa-cierre.cjs <salida.mp4>` (caso: 157 cuadros =
6,54 s; lee los assets de `axis-design-system/packages/brand-assets/assets`). Mascotas entran escalonadas con
ease-out-back y flotan con período de un compás de la cama (1,5 s a 160 BPM); cada logo de producto entra con su
palabra en la VO. La **frase completa del llamado a la acción va sobre esta placa**; el **reveal del logo Efeonce
con eslogan queda sin voz** y la cama corta en seco al entrar el logo.

### 7. Audio

- **Kit oficial** descargado del bucket público AXIS y verificado por sha256 contra
  `https://axis.efeonce.org/references/sonic-brand.json`.
- **VO**: ElevenLabs Creative (`creative_generate_speech`, `eleven_v4`), voz de biblioteca por **ID** (los nombres se
  repiten entre plataformas), etiquetas de interpretación (`[excited]`, `[curious]`, `[warmly]`, `[dramatically]`,
  `[fast]`), `generations_count` 2 (por defecto 4). Selección de toma por calce de tiempo (`silencedetect` −42 dB).
- **SFX** sintetizados con ffmpeg (`aevalsrc`/`anoisesrc`) y bus con tiempos (`audio/bus-sfx.py`).
- **Cama**: pieza oficial reordenada y acelerada al tempo y duración objetivo (Stable Audio redondea a segundos
  enteros: cuadra la referencia a segundos exactos) → Stable Audio 2.5 audio-to-audio (`audio/musica/regrabar-punk.ts`,
  `--strength` 0,65 y 0,8 probadas; elegida 0,8). **Medir balance de medios** antes de mostrarla (caso: 21 % contra
  ~35 % de la norma → EQ −4 dB bajo 180 Hz, +2 dB a 2,5 kHz). Para alargar, repetir compases completos del coro.
- **Mezcla** (`audio/mezcla-v2.py`): voz +7 dB con compresión suave; cama con sidechain 8:1 (umbral 0,02); reveal
  con sidechain 5:1; `loudnorm` en dos pasadas a −16 LUFS / −1 dBTP. Escribe `final/v2/cues-fuente.json` con los
  tiempos **reales** de la voz, que alimentan los subtítulos.
- **Nivel por destino:** la norma sonora pide −14 LUFS para video y redes; el master v2 del caso quedó a −16 LUFS y
  las entregas para redes se re-masterizan a −14 LUFS desde el premaster.

### 8. Subtítulos y ensamble

- `corte/subtitulos-v2.cjs`: escribe SRT (diálogo) y SRT SDH (con descriptores) desde `cues-fuente.json` y
  renderiza **cada cue como PNG** transparente 1920×1080 (Poppins Medium 46 px, blanco sobre navy `#001a33` al 80 %,
  rx 14). En pantallas de UI el cue sube (margen 200 px) para no tapar la barra de escritura. Se usó PNG porque el
  ffmpeg local no tiene libass.
- `corte/ensamblar-v2.py`: video mudo + overlays con `enable=between` + master; versiones con y sin subtítulos.
  `overlay` necesita `shortest=1` y `-t` explícito o el video se alarga.

### 9. Distribución: Studio → Metricool

Sólo con autorización de publicación explícita; aprobar la pieza no la da.

1. **Marketing Studio:** registrar el concepto y sus piezas en la campaña. Caso: CMP001-08 «Los Sparks» de CMP-001
   (always-on AEO, `source_of_truth onedrive`): finales en OneDrive `15. Paid Media/03. Finales/CMP-001 - Lo que la IA
   dice de ti/`, entradas en `CATALOGO-DATOS.json` → `pnpm import:catalog --apply` →
   `pnpm media:ingest --campaign CMP-001 --apply`; filas `CMP-001-SP-01…05`; orgánico; versiones `imported` sin
   aprobar; copies «propuesta». Operación: skill [`efeonce-marketing-studio`](../../efeonce-marketing-studio/SKILL.md).
2. **Metricool:** un post por red con portada por red (Instagram: video 16:9 con intro muda de «gira la pantalla» y
   portada **4:5**; LinkedIn: 16:9 con portada 16:9), horario por cruce de mejores horas con la cola y **readback por
   SHA-256** de la media re-alojada (caso: 4 de 4 idénticos). Receta y schema MCP observado:
   [`video-delivery-metricool.md`](../../social-media-studio/references/video-delivery-metricool.md).
3. **Declarar lo humano:** enlace de la bio de Instagram, comprobar la publicación después de la hora (`PENDING` ≠
   publicado), aprobación de versiones en Studio y licencia de la música antes de pauta.

## Plantilla de prompt (H3 i2v, estructura del caso)

```text
A 2D animated shot that keeps EXACTLY the flat vector style of the two given frames: <rasgos de estilo del elenco>.
One continuous camera move, no cuts, no change of angle beyond what is described. Smooth, readable cartoon motion.
No 3D render, no photorealism, no text, no letters, no logos. <Paleta fija de la escena>.
The <mascotas> keep their exact design and proportions: their bodies stay facing the camera and never turn sideways
or show their backs, they only bob gently and their LED faces slide inside the visor to look where described; never
mirrored: <invariante de orientación: anillo, accesorio y lado>.
<Cámara: un movimiento, magnitud acotada (ej. arco de ~25°)>. <Acción del personaje humano>. <Luz y fondo>.
```

## Gates de la receta

- [ ] Elenco correcto para el papel; personajes nuevos aprobados antes de los cuadros clave.
- [ ] VO escrita después de cargar la skill dueña de la oferta y el canon del personaje; sin promesas de resultado.
- [ ] Guion, subtítulos y copy nombran el servicio «Efeonce | AEO» y hablan como Efeonce, antes de grabar la voz.
- [ ] Cada cuadro clave: mascota desde SVG, sin espejar, `merge-zonas` = 0 px fuera; aprobado por el operador.
- [ ] Piloto de la toma de riesgo aprobado antes de producir el resto.
- [ ] Cada toma revisada contra sus cuadros: sin texto, paleta fija, mascotas de frente, sin salto de eje.
- [ ] Interfaz y placas desde vector con escala decimal; cero placeholders; texto dentro de sus contenedores.
- [ ] Un solo mapa de tiempos; sonidos absolutos revisados contra la voz tras re-timar.
- [ ] Balance de medios de la cama medido; mezcla medida; master al nivel del destino (−14 LUFS video/redes, −1 dBTP).
- [ ] Cuadros revisados al **100 %** antes de entregar (el caso entregó placeholders y una pregunta fuera de su
      burbuja que estaban desde la v1).
- [ ] Declarado lo no verificado: sin escucha propia ni ASR, el texto dicho lo valida la escucha del operador.
- [ ] Si se distribuye: pieza registrada en Studio; un post por red con su portada; readback por SHA-256; `PENDING`
      reportado como programado, no publicado.

## Qué NO hacer / trampas

- Pedirle al modelo de imagen o de video que dibuje la mascota o el logo: lo cambia.
- Usar H3 Max cuando la fidelidad del personaje manda: gira las mascotas en 3D [caso].
- Dejar el prompt sin «no text»: el modelo escribe texto ilegible [caso: S1, S8].
- Dejar la paleta implícita: una toma se fue al verde [caso: S6].
- Subir PNG pesados con `--estimate`: colgaba subiendo un PNG de 3,5 MB; usar JPG y precios publicados.
- sharp: `removeAlpha` al final del pipeline perdía el `joinChannel` (se reescribió como mezcla manual); SVG a
  alta densidad necesita `limitInputPixels:false`; el removedor de fondo recortaba el pantalón navy (usar recortes
  de cintura arriba).
- `zoompan` para acercar vectores: salta por redondeo a píxel entero.
- Re-timar con varias tablas sueltas: video, voz, SFX y subtítulos se desincronizan.
- Poner voz encima del reveal del logo: le quita fuerza [decisión del operador].
- Confiar en el nombre de una voz entre plataformas: la «Andre» de Higgsfield no es la de la biblioteca ElevenLabs.

## Costo / gasto gobernado

Cifras del caso, medidas el 2026-10-03 (inventario del run; reverificar tarifas antes de cotizar otra pieza):
fal USD 4,78 (H3 base a USD 0,06/s en 768P + Stable Audio USD 0,20 por pieza); cuadros clave GPT Image dentro de un tope autorizado de USD 2,10 (no es gasto medido)
dentro de lo autorizado (hojas del elenco aparte); ElevenLabs reportó 0 créditos (el `estimate_only` decía 71
créditos por toma corta); Higgsfield, créditos del casting de voz. Tope de referencia del caso: ~USD 8. Piloto y
producción se autorizaron por separado.

## Evidencia y límites

- Run: `ai-generations/2026-10-03_sparks-aeo-60s/` — `INVENTARIO-DE-HECHOS.md` (fuente única de esta receta),
  `PREPRODUCCION.md`, `cuadros/`, `tomas/`, `piloto/`, `corte/`, `audio/`, `final/v2/`.
- **Excepciones al canon sonoro del caso** (decisión del operador): registro de energía debajo de locución, que
  [`EFEONCE_SONIC_IDENTITY_V1`](../../../../docs/operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md) prohíbe, y
  licencia comercial de Stable Audio sin confirmar con legal [pendiente]. No son defaults de la receta.
- Sin lipsync, sin diálogo en cuadro y sin ASR: no validados por este caso.
- Pendientes del caso: prueba de reconocimiento del elenco 2D, derechos del elenco, licencia de Stable Audio.
