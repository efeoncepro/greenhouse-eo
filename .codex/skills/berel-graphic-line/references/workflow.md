# Flujo Berel de punta a punta — del brief al PR

> Solo Berel. Comandos verificados contra el Workbench y Greenhouse al 2026-11-01/02. Si un script cambió,
> manda el script: corre `--help` o léelo antes de seguir.
>
> - Workbench (motor y contratos): `/Users/jreye/Documents/creative-workbench` (repo privado `efeoncepro/creative-workbench`).
> - Greenhouse (generación de imagen): `/Users/jreye/Documents/greenhouse-eo`.

## 0. Antes de empezar

| Comprobación | Cómo | Si falla |
|---|---|---|
| Hay ficha de la pieza | La escribe `berel-content-production` (módulo 05 portada/cierre, 11 infografías). Sin artículo no hay banner | Detente: un banner sin ficha es un placeholder |
| Recursos locales completos | `ls clients/berel/.resources-local/{fonts,catalog,photos,logos}` en el Workbench (+ `products/` si hay producto en escena, `video/` si hay reel) | Detente y pídelos al operador; no los reconstruyas |
| Contratos vigentes | Lee `brands/berel/contracts/berel-photo-registers.json` y `berel-recipes.json` (+ `berel-video-reels.json` si hay reel) | — |
| Aislamiento | Vas a tocar solo `brands/berel/**`, `projects/berel/**` y el registro de estado | Si necesitas tocar `tools/` u otra marca, para y consulta al operador |

Berel sigue `gated` en `clients/brands.json` (TASK-1945): nada de este flujo autoriza entregar al cliente sin la
aprobación de Daniela, Andrés o Melkin.

## 1. Brief → registro, espacio y color

1. **Color**: nombre + código del brief o de la Wiki de Berel. Nunca de una pieza vieja (caso N41) ni de
   `color-cercano` ([color-pipeline.md](color-pipeline.md) §3).
2. **Registro** según producto y tema: `medio` (tutoriales, problemas, líneas de entrada), `medio-alto`
   (inspiración de color, paletas, Color del Año), `alto` (premium, acabados especiales, lanzamientos).
   Ver [photography.md](photography.md) §2.
3. **Toma**: el tipo de foto (`espacio` por defecto; `antes`, `diagnostico`, `exterior`, `azotea`, `cenital`,
   `proceso`, `taller`, `herreria`, `personas`, `nocturna`, `muestra`, `detalle`). Ver [photography.md](photography.md) §5 bis.
4. **Espacio**: una clave del contrato (`recamara`, `sala`, `cocina`, `comedor`, `fachada`, `infantil`, `bano`,
   `estudio`, `terraza`).
5. Carpeta de trabajo en Greenhouse: `ai-generations/<AAAA-MM-DD>_berel-<tema>/` (ejemplo real:
   `ai-generations/2026-11-01_berel-espacios/`). Nunca dentro de `.captures/` ni en el default de `ai:image`
   (`public/images/generated/`).

## 2. Chip del color

No hay script canónico (pendiente). Receta probada (sale idéntica al chip de la ronda real), desde el Workbench,
con el HEX validado por `assertColor`:

```bash
cd /Users/jreye/Documents/creative-workbench
D=/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-01_berel-espacios/ronda-2/v3
node --input-type=module -e "import { loadCatalog, assertColor } from './brands/berel/compose/render.mjs'; import sharp from 'sharp'; const [name, code, out] = process.argv.slice(1); const c = assertColor(loadCatalog('clients/berel/.resources-local'), { name, code }); await sharp({ create: { width: 1024, height: 1024, channels: 3, background: c.hex } }).png().toFile(out); console.log(code, c.hex);" "Terra Nova" 1-3605D "$D/chip-1-3605D.png"
```

Si el par está mal, falla cerrado antes de escribir nada.

## 3. Prompt

Siempre con el builder, nunca a mano ([photography.md](photography.md) §5):

```bash
cd /Users/jreye/Documents/creative-workbench
node brands/berel/scripts/prompt-plate.mjs --registro alto --espacio terraza \
  --color "Terra Nova" --codigo 1-3605D \
  --extra "Variant: covered terrace facing an interior garden, a smooth plastered ceiling that meets the painted wall with a crisp straight shadow reveal (no exposed beam above the painted wall), cantera stone floor, outdoor lounge chairs with linen cushions, large potted agave and bougainvillea at the side, warm late-afternoon light." \
  > "$D/prompt-terraza.txt"
```

Agrega al final el párrafo del chip (texto exacto de `ronda-2/run.sh`):

```bash
printf '\n\nThe attached reference image is the exact Berel paint color swatch for the painted surface (%s %s). The painted surface must match that swatch exactly in hue, value and saturation under neutral daylight. Do not show the swatch itself in the photo.' "Terra Nova" "1-3605D" >> "$D/prompt-terraza.txt"
```

Lee el prompt completo antes de pagar: que el `--extra` no contradiga el bloque común (sin fraccionamiento,
sin vigas sin rematar, objetos a la derecha).

## 4. Generar el plate (Greenhouse, `pnpm ai:image`)

```bash
cd /Users/jreye/Documents/greenhouse-eo
gtimeout 600 pnpm -s ai:image \
  --image "$D/chip-1-3605D.png" \
  --prompt-file "$D/prompt-terraza.txt" \
  --model gpt-image-2.5-sunburst --quality xhigh --size 2048x1536 \
  --format png --out "$D/terraza.png"
```

- **Por qué así**: 4:3 a 2048×1536 alimenta blog, post, story y Pinterest de una sola toma sin reescalar de más;
  Sunburst respeta mejor las reservas de composición; el chip deja el muro más cerca del color y el corrector
  mueve menos. `xhigh` existe solo en la familia 2.5 (el CLI lo rechaza en `gpt-image-2`).
- **`--image` es modo edición** en `ai:image` (image-to-image): el chip entra como referencia. No confundir con
  «editar un plate con el chip», que no mejora el color ([color-pipeline.md](color-pipeline.md) §4).
- **Costo**: ≈ USD 0,12 por plate (Sunburst y Flare cuestan igual). Para explorar puedes usar
  `gpt-image-2.5-flare` al mismo costo; la toma final es Sunburst + chip.
- **Una sola intención por corrida.** Si el plate sale mal, lee por qué (¿el `--extra`?, ¿una reserva que el
  prompt no pidió?), corrige el prompt y recién ahí vuelve a pagar. Nada de reintentos pagados a ciegas ni
  `--count` > 1 «por si acaso» (son N pedidos y se pagan N veces).
- Varias tomas: el patrón es un `specs.tsv` (espacio, registro, nombre, código, extra) y un `run.sh` que llama
  al builder y a `ai:image` por fila; referencia `ai-generations/2026-11-01_berel-espacios/ronda-2/v2/`.
- Para elegir otro modelo o entender costos: `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`
  y la skill `ai-model-selection`. No generes plates de Berel con otro motor sin medir antes su ΔE.

**Mira el plate al 100 %** antes de corregir: estrato, remates, reservas (tercio superior del muro libre,
cuadrante superior izquierdo liso, esquina inferior izquierda calma), sin texto ni logos.

## 5. Corregir el color

```bash
cd /Users/jreye/Documents/creative-workbench
node brands/berel/scripts/ajustar-muro.mjs "$D/terraza.png" \
  --color "Terra Nova" --codigo 1-3605D \
  --semilla 0.3,0.15 --semilla 0.55,0.25 --semilla 0.7,0.12 --semilla 0.2,0.4 \
  --zona "0,0.03 0.785,0.03 0.785,0.5 0.6,0.5 0.6,0.68 0.34,0.68 0.34,0.5 0,0.5" \
  --out clients/berel/.resources-local/photos/espacios/terraza.png
```

- El `--out` deja el plate directamente en el set local admitido (`clients/berel/.resources-local/photos/espacios/`),
  junto a `terraza.mascara.png` y `terraza.qa.json`. El compositor solo acepta fotos de ahí o de `projects/berel/**`.
- Guarda semillas y zona en un `zonas.tsv` junto a los prompts (como `ronda-2/zonas.tsv`) para poder repetir.
- Valida: `deltaEAfter` ≤ 3, máscara limpia, sol y sombra conservados ([color-pipeline.md](color-pipeline.md) §7).
  Si no, ajusta zona o semillas y vuelve a correr (local, gratis).
- **Misma escena en varios colores muy distintos** (franjas): zona rectangular de todo el muro, `--matiz 12`, semillas
  también en las esquinas superiores en sombra y dos pasadas; nunca muescas en la zona ([color-pipeline.md](color-pipeline.md)
  §6, caso 2026-11-04).

## 5 bis. Editar una zona de un plate ya aprobado

Para cambiar una sola zona (la pantalla de una tele, un objeto nuevo en el muro) sin regenerar la escena se usa
`pnpm ai:inpaint image` desde Greenhouse; la zona protegida debe quedar idéntica bit a bit. Si el objeto va sobre un
patrón (franjas, azulejo), la edición repinta el fondo de la máscara: conserva solo la caja medida del objeto y devuelve
el muro original ([photography.md](photography.md) §6 quater). Logos o escudos de terceros se componen desde su SVG
oficial y el modelo solo los termina ([photography.md](photography.md) §6 ter). Después de editar, vuelve a medir el
color del muro y la banda del titular.

## 6. Jobs por formato (sin coordenadas)

Un job por formato en `projects/berel/<pieza>/jobs/<espacio>-<formato>.json`. Ejemplo real
(`projects/berel/espacios-gpt-image/jobs/terraza-post.json`):

```json
{
  "schema": "berel.banner-job.v1",
  "brandId": "berel",
  "recipe": "social.post",
  "slug": "terraza_SM_POST",
  "photo": { "file": "../../../../clients/berel/.resources-local/photos/espacios/terraza.png", "focal": [0.5, 0.5] },
  "markers": [{ "name": "Terra Nova", "code": "1-3605D" }],
  "title": "Terracota para una terraza que invita a quedarse"
}
```

| Formato | `recipe` | `title` | Nota |
|---|---|---|---|
| Portada de blog 1408×768 | `blog.portada` | No (los banners de blog no llevan titular, píldora ni CTA) | — |
| Post 1080×1350 | `social.post` | Sí, ≤ 14 palabras y ≤ 3 líneas | Lleva píldora `berel.com/inspiracion` |
| Story 1080×1920 | `social.story` | Sí, mismas reglas | Zonas seguras |
| Pinterest 1000×1500 | `social.pinterest` | No | Puede mostrar la señal del registro con `focal` |

- **Nunca** `at` ni `alt` en un marcador: fallan cerrado; la grilla elige la celda ([marker-grid.md](marker-grid.md)).
- `focal` solo mueve el recorte ([photography.md](photography.md) §6).
- **Antes del job, mide el plate**: `node brands/berel/scripts/medir-plate.mjs <plate.png> --focal post=u,v --focal story=u,v`
  comprueba que la banda del titular esté limpia con el mismo `focal` del job ([photography.md](photography.md) §5 bis).
- **Plate con lecho** (opcional, apagado por defecto): `"photo": { "file": "…", "lecho": true }` **sin** `focal` en
  portada, post y Pinterest: el compositor ancla esos recortes a la esquina del logo y falla cerrado si declaras
  `focal`. `qa.logoBed` (contraste y nitidez bajo el logo) va siempre en el qa; solo avisa con `lecho`.
- `sample: [u, v]` solo si la foto **no** está corregida al color.
- No pases tamaños, posiciones, fuentes ni colores: los define la receta.
- **Adaptaciones sociales de un artículo** (evidencia 2026-11-04, Umbral Vivo y Color a la Mexicana): los jobs viven en
  `projects/berel/<proyecto>/jobs/<prefijo>_SM_<POST|STORIE|PINTEREST>.json`, junto a los `articulo-n#.json`, y parten
  del plate N1 del artículo con las recetas `social.post|story|pinterest`. Si el post no encuentra banda limpia en el N1
  con ningún foco, sale de otra escena del mismo artículo y se declara en el handoff ([photography.md](photography.md) §6).

## 7. Componer

```bash
cd /Users/jreye/Documents/creative-workbench
node brands/berel/scripts/componer.mjs projects/berel/<pieza>/jobs/<job>.json --out projects/berel/<pieza>/runs

# todos los jobs de la pieza
for j in projects/berel/<pieza>/jobs/*.json; do
  node brands/berel/scripts/componer.mjs "$j" --out projects/berel/<pieza>/runs
done
```

Cada corrida escribe `runs/<uuid>/` con la pieza (webp o png), `job.json` y `qa.json`, e imprime `⚠` por cada
aviso. Las corridas solo pueden escribirse bajo `projects/berel/`.

## 7 bis. Producto en escena (si la pieza lo lleva)

Antes de componer, sobre el plate ya corregido ([photography.md](photography.md) §6 bis):

```bash
cd /Users/jreye/Documents/creative-workbench
O=projects/berel/<pieza>/salidas/producto/<slug>
node brands/berel/scripts/producto-en-escena.mjs colocar --foto <plate> --producto clients/berel/.resources-local/products/<RENDER>.png \
  --x <u> --base <v> --referencia <metros>:<px> --nombre "<Producto>" --superficie "<superficie>" --textos "<texto|texto>" --out $O
# colocar imprime el comando de Greenhouse (pnpm ai:image con compuesto.png + referencia.png, Sunburst xhigh)
node brands/berel/scripts/producto-en-escena.mjs verificar --dir $O     # salida 1 si falla; deja producto-en-escena.png
```

El job apunta `photo.file` a `$O/producto-en-escena.png` (vive en `projects/berel/**`, ruta admitida) y elige el
`focal` por formato según la regla de recortes con producto. La pieza conserva su firma aunque la etiqueta muestre el
logo Berel.

## 8. Leer `qa.json` y mirar el píxel

- Lee `warnings`: «sin celda de primer nivel», franja de la píldora, aire apretado, fondo cargado bajo el titular.
  Cada aviso se mira en la pieza y se decide: acortar el titular, mover `focal`, regenerar el plate o aceptarlo
  sabiendo por qué.
- Revisa marcadores colocados y eliminados, peso (blog < 200 KB) y SHA.
- `qa.approval` siempre es `pending-human-and-pixel-review`: ejecutar no aprueba.
- Mira el archivo real, no solo el JSON. Checklist completo: [qa-review.md](qa-review.md).

## 9. Hoja de contacto

Antes de subir un lote, arma una hoja de contacto local con sharp: una fila por espacio y los 4 formatos en la
fila, para ver las piezas de un vistazo (así se revisaron las 40 piezas de `espacios-gpt-image`). No hay script
canónico: escríbelo en el scratchpad de la sesión, no en el repo.

## 9 bis. Reel (si la pieza lleva video)

Parte del job de la story ya revisada; todo vive en `projects/berel/<pieza>/salidas/video/<toma>/` (ignorado por Git):
`despues.png`, `antes.png`, `prompt-antes.txt`, `prompt-video.txt`, `reel.json`, `capa-marcador.png`,
`capa-titulo.png`, `<modelo>.mp4` (`flux3.mp4`, `omni.mp4`), `<modelo>-qa.json`, `<modelo>-hoja.jpg` y
`reel-<modelo>.mp4`. Comandos, motor y QA: [video.md](video.md).

## 10. Canvas de revisión y comentarios

- Canvas Claude Design de revisión: <https://claude.ai/artifact/DTJR1QxZDtamvRQQRqY7zW> (artboards por espacio:
  portada, post, story, Pinterest). Design System Berel: <https://claude.ai/artifact/NbL96tUf9snkpRAsgQ81s8>.
  Ambos privados; compartirlos con Daniela, Andrés y Melkin es decisión del operador.
- Antes de publicar, **lee** el artifact (`Artifact` con `action: "read"`) y trabaja sobre esa versión.
- Sube los webp como assets (`Artifact` con `url`, `asset: true`, `file_paths`, hasta 25 por llamada), reemplaza
  en el `.dc.html` cada `/_blob/<id>` por la `url` que devuelve la subida, y publica con `root`.
- Los comentarios del operador llegan como hilos del artifact: **responde en el hilo** (`ArtifactComments`), no en
  el chat.
- Un tablero por artículo y familia en el canvas «Berel — Banners»: por ejemplo `Rayados-Articulo` (N1–N4) y
  `Rayados-Social` (post, story, Pinterest, reel), 2026-11-05.

## 11. Pruebas y gates (Workbench)

```bash
cd /Users/jreye/Documents/creative-workbench
node --test brands/berel/test/*.test.mjs test/surface-color.test.mjs   # 37 PASS al 2026-11-02 y al 2026-11-05 (35 Berel + 2 motor)
npm run gates                                                           # managed-drift, hygiene, piezas, native-policy
```

Sin los recursos locales, las pruebas que los necesitan se saltan: un «verde» con saltos no prueba Berel.

## 12. Commit y PR (Workbench)

1. `git status --short` y `git diff --name-only`: solo `brands/berel/**`, `projects/berel/**` (los `runs/` están
   ignorados) y `docs/operations/HARNESS_STATUS.md`. Si aparece `tools/`, otra marca o `clients/brands.json`, para.
2. Rama propia, nunca directo a `main`. `git add <rutas>` y `git commit` en la **misma** llamada (el checkout puede
   ser compartido con otras sesiones).
3. Push, PR y merge solo cuando el operador lo indique (el clasificador de permisos bloquea un merge sin su OK
   explícito en el chat). El repo **solo permite squash merge** (merge commit y rebase
   deshabilitados, verificado con `gh repo view` el 2026-11-01). Referencia: PR #20, squash `5636cb9`, 2026-11-02.
4. Registra lo hecho en `docs/operations/HARNESS_STATUS.md` (sección Berel): qué cambió, qué se verificó y qué queda
   pendiente.

## 13. Entregar

- Nombres: `N##_BN_<ROL>.webp` para blog, `N##_SM_<POST|STORIE|PINTEREST>.png` para social y
  `N##_SM_REEL.mp4` para el reel (convención del corpus), con el número de artículo correcto (ya hubo cruces
  N30→N38 y N50→N53).
- Reel: MP4 H.264 + AAC, 1080×1920, 14 s, con la música del mes ya mezclada (≈ 4,5–4,8 MB en los reels del
  2026-11-04; las piezas de diciembre usan `musica-DIC.mp3`).
- Blog 1408×768 webp < 200 KB; og:image 1200×630 derivado de la portada.
- Sube a Frame.io debajo de la versión anterior.
- **Carpeta de entrega en OneDrive** (verificada el 2026-11-04; en el Mac del operador se sincroniza en
  `~/Library/CloudStorage/OneDrive-EfeonceGroupSpA/`): `Berel - Efeonce - Squad Berel › Workspace Oficial ›
  04_Entregables › <NN>. Articulos <Mes>/Artículo N## - <Título>/`. Meses existentes: `01. Articulos Junio` …
  `06. Articulos Noviembre`; el 2026-11-04 se creó `07. Articulos Diciembre`. Dentro de cada artículo, los banners del
  blog van en la raíz y lo social en la subcarpeta `Social media` (en algunos meses escrita `Social Media`):
  `N##_SM_POST.png`, `N##_SM_STORIE.png`, `N##_SM_PINTEREST.png`, `N##_SM_REEL.mp4` (algunos meses `N##_SM_REEL_2.mp4`).
  Los banners de meses anteriores se llamaban `N##_BN_PORTADA.webp`, `N##_BN_CIERRE.webp`, `N##_BN_<TEMA>.webp`.
- **Artículo sin número editorial todavía** (caso 2026-11-04, Color a la Mexicana y Umbral Vivo): la carpeta se llama
  `Artículo (sin número) - <Título>/`; los banners del blog llevan el nombre exacto que declara la ficha del artículo
  (manda la Spec de la wiki: minúsculas y guiones, p. ej. `colores-mexicanos-con-blanco-hero.webp`, `-comparativa`,
  `-patio`, `-cierre`; `umbral-vivo-2027-hero.webp`, `umbral-vivo-2027-cierre.webp`) y lo social sale como
  `<slug>_SM_POST.png | _SM_STORIE.png | _SM_PINTEREST.png | _SM_REEL.mp4` (slugs `colores-mexicanos-con-blanco`,
  `umbral-vivo-2027`). Cuando se asigne el N##, renombra la carpeta a `Artículo N## - …` y los sociales a `N##_SM_…`.
  Números asignados el 2026-11-05: **N62** Umbral Vivo y **N63** Color a la Mexicana (si la carpeta sigue «sin número»,
  aplica el renombre).
- **Caso con número (2026-11-05, N52 Rayados, reescritura evergreen; conserva su número):** `07. Articulos Diciembre ›
  Artículo N52 - Colores de Rayados la historia del azul y blanco/` con 4 banners con el nombre de la ficha
  (`colores-de-rayados-hero.webp`, `paleta-oficial-rayados-berel.webp`, `colores-de-rayados-puerta-azul.webp`,
  `colores-de-rayados-recamara-rayas.webp`) y `Social media/N52_SM_POST.png`, `N52_SM_STORIE.png`,
  `N52_SM_PINTEREST.png`, `N52_SM_REEL.mp4`. Aprobado por el operador (Efeonce) el 2026-11-05; revisión de Berel pendiente.
- **Copia a OneDrive que se corta** («Operation timed out» sobre un archivo que se está sincronizando): borra el destino,
  vuelve a copiar y verifica con `cmp origen destino` (sin salida = idéntico). Nunca des por entregado un archivo sin
  ese `cmp`.
- **Qué se exporta:** la corrida más reciente de cada slug (`ls -t projects/berel/<pieza>/runs/*/<archivo> | head -1`)
  y el reel desde `projects/berel/<pieza>/salidas/video/<toma>/reel-*.mp4`. Las infografías N2/N3 de Umbral Vivo son
  material de marca de Berel: no se exportan.
- **Revisión ≠ entrega ≠ aprobación.** El canvas «Berel — Banners» (§10) es la superficie de revisión; OneDrive es la
  superficie de entrega. Exportar a OneDrive no es aprobar: la revisión de diseño (Daniela, Andrés o Melkin) sigue
  pendiente aunque los archivos ya estén en la carpeta.
- **Efeonce no publica para Berel**: el social es insumo para la agencia que opera sus redes. La aprobación es de
  diseño (Daniela, Andrés o Melkin) y luego de Berel.

## Dónde queda cada cosa y qué nunca va a Git

| Archivo | Dónde | ¿Git? |
|---|---|---|
| Prompts, chips, plates crudos, `specs.tsv`, `zonas.tsv`, `run.sh` | Greenhouse `ai-generations/<fecha>_berel-<tema>/` | Hoy sin trackear (`git status` del 2026-11-01); no los incluyas en commits de Greenhouse sin decisión del operador |
| Plates corregidos + máscara + `qa.json` | Workbench `clients/berel/.resources-local/photos/espacios/` | **Nunca** (ignorado) |
| Fuentes Gotham Rounded, catálogo de color, logos, sistema | Workbench `clients/berel/.resources-local/{fonts,catalog,logos,system}` | **Nunca** (licenciados) |
| Renders oficiales de producto, tapa de cierre y música del mes | Workbench `clients/berel/.resources-local/{products,video}` | **Nunca** (licenciados) |
| Producto en escena (compuesto, referencia, integrada, `colocacion.json`, `qa.json`) | Workbench `projects/berel/<pieza>/salidas/producto/<slug>/` | **Nunca** (ignorado) |
| Reel (cuadros, capas, clips, QA, hoja, reel final) | Workbench `projects/berel/<pieza>/salidas/video/<toma>/` | **Nunca** (ignorado) |
| Jobs, `brief.md`, `pieza.json` | Workbench `projects/berel/<pieza>/` | Sí |
| Corridas compuestas | Workbench `projects/berel/<pieza>/runs/<uuid>/` | **Nunca** (ignorado) |
| Contratos, scripts, compositor, pruebas, libro de marca | Workbench `brands/berel/**` | Sí |
| Hoja de contacto | Scratchpad de la sesión | Nunca |
| Entregables exportados (banners, sociales, reel) | OneDrive `Workspace Oficial › 04_Entregables › <NN>. Articulos <Mes>/` (§13) | Nunca |
