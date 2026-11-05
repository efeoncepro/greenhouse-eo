# Video Berel — reel de transformación

> Solo Berel. Fuente de verdad de los valores: `creative-workbench/brands/berel/contracts/berel-video-reels.json`
> (schema `berel.video-reels.v1`, estado **candidato**). Lo de abajo es un **snapshot del 2026-11-02**: si el contrato
> cambió, manda el contrato. CLI: `brands/berel/scripts/reel.mjs`; funciones puras en `compose/video.mjs`.

## 1. Qué es un reel Berel

Del análisis de los 41 videos del Workspace Oficial (2026-11-02): 30 reels de 14 s a 750 × 1334, todos con la misma
forma, una sola transformación generada por IA de 8 s, sin cortes, más la tapa roja de cierre de 6 s. El marcador de
color entra hacia los 2–3 s y el titular hacia los 4–5 s. No hay voz; hay 4 pistas de música en todo el corpus. Las
fuentes de esos clips eran Firefly/Magnific a 720p.

**El efecto Berel: los objetos se forman en su lugar** (operador, 2026-11-02; medido cuadro a cuadro en los reels
publicados y aprobado en el estudio Ultravioleta). Cada objeto **crece, se despliega, se infla, se desenrolla, baja del
techo o entra por el borde del cuadro**, en **0,5 a 1 s**, rápido al inicio y con un **frenado suave** hasta posarse,
con un asentamiento mínimo (1–2 %) y sin rebote. Las llegadas **se encadenan y se solapan**: la siguiente empieza antes
de que termine la anterior. La pintura brota como nubes de acuarela que se densifican (N41, N31), en manchas (N29) o
con borde de brocha (N61). Medido en el corpus: la lámpara de la cocina baja el 22 % del alto en 0,65 s, de 6 px por
cuadro a casi cero; la segunda arranca 0,9 s después; la cubeta de N20 crece del 80 al 100 % y se posa en 0,8 s; la
mesa de N31 se despliega como origami desde una pieza chica; los módulos del sofá de N25 se inflan desde el piso.

Lo que **no** es, probado el mismo día sobre los mismos cuadros:

| Prompt | Resultado | Por qué falla |
|---|---|---|
| «smooth continuous transformation… settle into place» | FLUX 3 barre el muro y la lámpara entra difuminada; Omni mete una ola rosada y una silla transparente | Fundidos |
| «drops in / hops into place / bounce» (FLUX 3) | El escritorio cae de muy alto y la alfombra vuela | Irreal |
| «appears directly in its final place» (Seedance) | El escritorio está en un cuadro y no en el anterior (salto 30 %) | Aparición seca, sin movimiento |
| **Plantilla vigente** (Seedance, `approvedExample`) | Escritorio que entra y frena, silla que crece y se posa, lámpara que nace y se asienta (salto 4,2 %) | **Aprobado** |

Hojas de contacto del análisis (corpus y tomas):
`greenhouse-eo/ai-generations/2026-11-02_berel-umbral-vivo/analisis-movimiento/`.

El reel nuevo sale a **1080 × 1920, 30 fps, 14 s**: clip de 8 s + marcador (2,5 s, fundido 0,6) + titular (4,5 s,
fundido 0,8) + tapa vigente (`Tapa de Cierre_3._9.16-DOS.mp4`, nunca la carpeta «Viejo»).

## 2. Flujo

```bash
R=brands/berel/scripts/reel.mjs; O=projects/berel/<pieza>/salidas/video/<toma>
node $R cuadros --job projects/berel/<pieza>/jobs/<toma>-story.json --out $O --lugar "dining room" \
  --cambios "<cómo era antes>" --transformacion "<qué pasa en el video>" [--conservar "…"] [--luz "Sunny daylight"]
node $R capas --dir $O
node $R qa --dir $O --clip $O/seedance.mp4
node $R corregir --dir $O --clip $O/seedance.mp4 --out $O/seedance-color.mp4   # solo si el muro falla por color; luego qa otra vez
node $R armar --dir $O --clip $O/seedance-color.mp4 --out $O/reel-seedance.mp4 --mes NOV
node $R comparar --out $O/../comparar.mp4 --modelos "seedance omni" <dir> [<dir>…]
```

> **`corregir` aún no está en todas las ramas (2026-11-04).** El subcomando existe solo en la rama sin mergear
> `claude/berel-reel-forma` del Workbench (commit `159f03c`, PR #31). En otra rama `reel.mjs` responde
> «uso: reel.mjs cuadros|capas|qa|armar|comparar». Mientras el PR #31 no se mergee, usa el rodeo de §5 bis sin cambiar
> de rama.

1. **Cuadros.** El reel parte del job de la **story** (hereda titular, marcador y focal). *Después* = recorte 9:16
   (864 × 1536) del plate ya corregido de color. *Antes* = edición de ese cuadro con GPT Image 2.5 Sunburst `xhigh`
   (clave personal; `cuadros` imprime el comando): misma cámara, muro sin color, sin lo que la escena va a ganar.
   Nombra lo que no cambia (ventanas, puerta, piedra, reja) para que el modelo lo conserve. **Mira antes y después
   juntos**: si la cámara se movió, el video lo delata.
2. **Capas.** `capas` compone la story sobre el cuadro después y separa marcador y titular en dos PNG transparentes.
3. **Clip.** Motor según §3. Guárdalo como `<toma>/<modelo>.mp4`. El `--transformacion` sigue
   `frames.transformacionGuide` y el `approvedExample` del contrato: primero la pintura («blooms across it like soft
   watercolor clouds…»), después «Then the room furnishes itself in one elegant, continuous chain where each piece
   begins before the previous one has finished:» y cada objeto con su forma de formarse (*unfolds in place*, *grows in
   place from a small size to its full size while lowering softly*, *unrolls flat along the floor*, *lowers gently
   from the ceiling*, *slides in from the edge of the frame*). **Nunca** *appears*, *drops in*, *hops* ni *bounces*. La
   plantilla añade la duración, la curva de frenado y las prohibiciones; con el ejemplo aprobado reproduce letra por
   letra el prompt de la toma aprobada (lo verifica una prueba).
4. **QA.** `qa` falla cerrado (salida 1) solo por color. Además, **mira la hoja de cuadros** (3 por segundo): cada
   objeto se forma en varios cuadros y frena suave; nada aparece de golpe, rebota ni es semitransparente. Si solo falla el color, `corregir`
   aplica al clip una ganancia por canal que lleva el muro del último cuadro al plate, **solo en los píxeles con el
   tono del muro** (los muebles y los blancos quedan intactos), y se vuelve a correr `qa` sobre la salida. Caso fuente:
   estudio Ultravioleta 2026-11-02, FLUX 3 saturó el muro (ΔE 7,2; L −2, a +4, b −5) y quedó en ΔE 0,6; Seedance lo
   dejó más oscuro (ΔE 4,0) y quedó en 0,7, sin tocar madera ni tapiz. No sirve si el muro cambia de tono a mitad del clip ni si el modelo pintó otro color.
5. **Armado.** `armar` pone capas, tapa y música. La pista del mes suena bajo los 14 s y los efectos de la tapa van
   encima a partir de los 8 s; mezcla a −14 LUFS (el corpus del squad va a −12).

## 3. Motor

| Motor | Uso | Costo | Por qué |
|---|---|---|---|
| **Seedance 2.0** (`seedance_2_0`, Higgsfield, `std`) | **Por defecto** (desde 2026-11-02) | 96 créditos / clip 1080p 8 s; tarda unos 10 min | Aprobado por el operador con la plantilla vigente: los objetos se forman y frenan suave |
| **Gemini Omni** (`pnpm ai:omni --task frames`, Greenhouse; probado con 1.1) | Alternativa por toma | ≈ USD 1,22 nominales con 1.1 (1080p reescalado, 8 s); ≈ USD 0,83 con 1.2, el default desde 2026-11-05 (first/last frame sigue en 3–10 s) | Arma muebles por partes (cama: estructura → colchón → cojines), pinta muros largos con trazo de rodillo. Sin probar con la plantilla vigente |
| FLUX 3 (`flux_3_video`) | Candidato | 64 créditos | Fue el motor por defecto hasta el 2026-11-02. Sin probar con la plantilla vigente; satura el muro (ΔE 7,2–7,5 en el estudio) |
| Wan 3.0 | Descartado | 28 créditos | Corre el color: ΔE 18,3 (terracota → salmón) |
| MiniMax H3 | Descartado | 16 créditos (2K) | Fiel al color, pero los muebles entran como fundido semitransparente |

Evidencia con el prompt original de fundidos (2026-11-02, mismos cuadros y prompts, pares ΔE / salto %); sirve para el
color, no para el efecto:

| Toma | FLUX 3 | Omni | MiniMax H3 | Seedance 2.0 |
|---|---|---|---|---|
| Comedor | 3,4 / 3,9 | 2,3 / 1,9 | 2,4 / 2,4 | 2,8 / 2,9 |
| Recámara | 3,2 / 3,4 | 0,8 / 3,7 | 1,6 / 2,4 | 3,5 / 2,2 |
| Fachada | 1,4 / 1,8 | 2,9 / 1,9 | 2,3 / 2,0 | 3,0 / 2,1 |
| Herrería | 1,3 / **7,5** | 1,9 / 1,8 | 0,9 / 1,9 | 4,4 / 3,8 |

Higgsfield: `generate_video` con `start_image` (antes) y `end_image` (después), `duration 8`, `resolution 1080p`,
`aspect_ratio 9:16`, `generate_audio false`. Subida: `media_upload` → PUT con `If-None-Match: *` → `media_confirm`.
Omni: `--staging-uri` y `--gcs-output` en el bucket privado `gs://efeonce-group-greenhouse-private-assets-dev/…`,
`--max-usd 1.5` para 1080p/8 s, `--yes`, `--out`.

Trampas medidas (2026-11-02):
- Higgsfield puede responder con una **recomendación de preset** (p. ej. «IN THE DARK») en vez de crear el job: se
  reenvía la misma solicitud con `declined_preset_id`. `get_cost: true` cotiza sin gastar.
- `jobs_wait` espera como máximo 15 s por llamada; un clip tarda minutos (Seedance llegó a pasar los 15 min).
- Si la conexión con Higgsfield se corta al enviar, el resultado es incierto: revisa `show_generations` con
  `only_completed: false` antes de reenviar, para no pagar dos veces (pasó el 2026-11-02).
- Salidas: Seedance 2.0 y Omni entregan 1080 × 1920 a 24 fps; FLUX 3, 1088 × 1920; Omni 1080 × 1920 a 24 fps **con pista de audio**; MiniMax H3 solo
  2K (1440 × 2560). `armar` reescala a 1080 × 1920 / 30 fps y descarta el audio del clip (solo música + tapa).
- Omni con el `--max-usd` por defecto (1) falla antes de enviar a 1080p/8 s: pasa `--max-usd 1.5`.

## 4. QA

- **Color:** ΔE (CIE76) del muro en el último cuadro contra el cuadro después, medido sobre la máscara del muro que
  dejó `ajustar-muro` (`<plate>.mascara.png`, recortada igual). Máximo 4. Sin máscara, `--zona x,y,w,h`.
- **Salto y reparto: dato, no compuerta.** Diferencia media entre cuadros consecutivos (gris 108 × 192, 24 fps): el
  salto más brusco como % del cambio total y cuántos cuadros concentran la mitad del cambio. El umbral del 5 % se retiró
  el 2026-11-02: el efecto Berel *es* una aparición de golpe. En los 29 reels publicados (0,5–7,7 s, mitad inferior) el
  salto tiene mediana 4,7 %, rango 1,4–21,6 %, y 14 de 29 pasan del 5 %. El área que cambia de golpe tampoco separa lo
  bueno de lo malo (reels publicados hasta 41 %).
- **Lo que se mira:** objetos que entran semitransparentes (MiniMax; Omni en el estudio Ultravioleta), un barrido de
  pintura parejo, un objeto flotando o la cámara que se mueve. Eso se ve en la hoja de cuadros y en el clip.

## 5. Música y tapa

Envato Elements: el squad descarga las pistas con su licencia (confirmado por el operador el 2026-11-02). Una por mes
en `02_Recursos/11_Musica/Propuesta {n}_{MES}.mp3` (OCT, NOV, DIC), de 14,07 s: dura el reel completo. Admitidas en
`clients/berel/.resources-local/video/musica-<MES>.mp3`; la tapa en `video/tapa-cierre-9x16.mp4`. Mes nuevo = pista
nueva en `music.tracks` del contrato.

## 5 bis. Lecciones del 2026-11-04 (reels de los artículos Umbral Vivo y Color a la Mexicana)

- **Reusar un clip aprobado si el cuadro después es idéntico.** El N1 del artículo Umbral Vivo es el plate del estudio
  Ultravioleta con el muro lateral corregido a Conciencia 1-3301P, pero ese muro queda fuera del recorte 9:16 de la
  story (foco 0,55, x 651). `cuadros` dio un `despues.png` con diferencia media 0,000 contra el del reel aprobado, así
  que se reutilizó el clip Seedance aprobado (`seedance-forma-color.mp4`) con las capas nuevas del artículo y se ahorró
  un clip de 96 créditos. Compara siempre los dos `despues.png` píxel a píxel antes de pagar otro clip.
- **`qa` sin máscara útil → `--zona`.** Si la máscara del plate pertenece a otra corrección (aquí, el muro lateral) la
  zona del muro queda vacía y `qa` se cae («la zona del muro quedó vacía»). Pasa `--zona x,y,w,h` en píxeles del cuadro
  9:16 sobre el muro protagonista (Umbral: `120,120,620,480`, ΔE 0,4).
- **El prompt del video se escribe como el aprobado, no con la cola de la plantilla.** `videoPrompt` del contrato
  termina en «smooth continuous transformation», la frase que dio fundidos el 2026-11-02. Reemplaza la cola por la luz,
  «consistent contact shadows, no camera movement, no people, no text», como en `approvedExample`, y quita los objetos
  que no están en el recorte (en la fachada, la puerta).
- **Fachada:** el cambio de antes es pintura y blanco, no muebles: muro de enlucido gris → color, marcos y cornisa del
  mismo gris → blanco, y luego las macetas crecen en su lugar. El antes conserva rejas, ventanas, banqueta, calle y
  ramas; Sunburst mantuvo cámara y encuadre a la primera.
- **Música:** los dos reels de diciembre usan `musica-DIC.mp3`. Umbral Vivo sale en enero y aún no hay pista ENE:
  cuando el squad la entregue, se vuelve a correr solo `armar`.
- **`corregir` sin cambiar de rama (rodeo hasta que se mergee el PR #31).** El checkout estaba en
  `claude/sky-blog-visual-system`, sin `corregir`. Se extrajeron los dos archivos del commit `159f03c` a temporales:
  `git show 159f03c:brands/berel/compose/video.mjs > brands/berel/compose/_tmp-video-forma.mjs` y
  `git show 159f03c:brands/berel/scripts/reel.mjs` pasado por `sed` para que importe ese temporal →
  `brands/berel/scripts/_tmp-reel-forma.mjs`; se corrieron `corregir` y `qa` con él y se borraron los dos temporales.
  Color a la Mexicana: ΔE 5,8 → 0,9 (ganancias 1,116 / 1,106 / 1,087, matiz 178). Cuando el PR #31 esté en `main`,
  usa `reel.mjs corregir` directo y descarta este rodeo.
- **El titular del reel se revisa sobre el recorte 9:16 del video, no sobre la story.** `capas` compone sobre el
  `despues.png` de 864 × 1536, más angosto que la imagen de la story, y un titular que pasa en la story puede pisar un
  objeto en el reel. «Un color vivo se ve mejor con blanco» se montó sobre la ventana superior; se cambió en la story y en
  el reel por «Color vivo, marco blanco» (borde derecho del titular en 619 px contra el marco de la ventana en 655 px, a
  1080 de ancho). Antes de `armar`, compara los límites de `capa-titulo.png` con los objetos del cuadro.
- **Entregable medido:** 14 s, 1080 × 1920, H.264 + AAC, ≈ 4,5–4,8 MB. Dónde se deja y cómo se nombra:
  [workflow.md](workflow.md) §13.

## 5 ter. Lección del 2026-11-05 (reel de Rayados)

- **Clip con golpe.** Seedance 2.0 con cuadro inicial y final. El prompt se escribió con acción: la tele se enciende con
  un destello, el balón viene hacia la pantalla, la pintura azul brota desde detrás de la tele como una ola de estadio y
  después crece la planta; se conservó el efecto Berel de objetos que se forman en su lugar (§1). La pantalla muestra
  partido sin escudo, patrocinadores ni marcador ([photography.md](photography.md) §6 ter).
- **`qa` y el destello:** `fluidez` falla justo en el encendido de la tele, que es el golpe buscado; el color pasó (ΔE
  2,2). Se aceptó tras mirar el clip y se declara en el handoff ([qa-review.md](qa-review.md) §3 ter).

- **Un clip aprobado no se regenera para que quepa un titular más largo.** El operador pidió el título del artículo en
  todas las piezas («Colores de Rayados: la historia del azul y blanco», 3 líneas en 9:16) y la tercera línea pisaba la
  tele. Regenerar el clip con un plate más alto dio otro movimiento (barrido de lado a lado) y el operador lo rechazó: «el
  video anterior tenía más impacto visual». **Solución:** estirar solo la franja de muro liso sobre el objeto (0–475 px →
  0–588 px a 1080×1920) y recortar lo mismo abajo, en el piso, con `ffmpeg split → crop/scale → vstack`; aplicar la misma
  transformación al `despues.png` (864×1536: 0–380 → 0–470) en una carpeta nueva con el `reel.json`, y correr `capas` y
  `armar` ahí. Solo sirve cuando la franja estirada es una superficie lisa (muro); nunca sobre muebles ni personas.
- **Story y reel pueden salir de plates distintos de la misma escena:** la story usa el plate con el muro ampliado
  (`rayados-n1-sala-tv-alta.png`, unión nivelada fila por fila en Lab) y el reel usa el clip original estirado.

## 6. Pendientes

- Revisión de Berel (Daniela, Andrés o Melkin) de los reels piloto.
- Revisión de Berel del reel de Rayados (N52), aprobado por el operador (Efeonce) el 2026-11-05.
- Mergear el PR #31 del Workbench (`claude/berel-reel-forma`) para que `corregir` exista en todas las ramas y se
  retire el rodeo de §5 bis.
- El titular entra con fundido, no palabra a palabra como en el corpus.
- La plantilla vigente está aprobada en una sola toma (estudio Ultravioleta, Seedance). Falta confirmarla en otros
  espacios (comedor, recámara, fachada, herrería) y probar FLUX 3 y Omni con ella.
- En la toma aprobada la pintura brota con borde nítido; en el corpus es difusa, como acuarela.
- Si la exportación antigua a 750 × 1334 era decisión o límite (el reel nuevo sale a 1080 × 1920).
