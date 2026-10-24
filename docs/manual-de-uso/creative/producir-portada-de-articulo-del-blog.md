# Producir la portada de un artículo del blog (Marketing con Manzanitas) — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-10-24 por Claude
> **Ultima actualizacion:** 2026-10-24 por Claude
> **Modulo:** Creative · Marketing con Manzanitas · sitio público (blog en WordPress)
> **Ruta en portal:** no aplica: la foto se genera y compone en el taller local, y la portada se publica en
> `efeoncepro.com` por WP-CLI
> **Documentacion tecnica:** [Norma del registro §5.6](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md) ·
> [Firma en primer plano, delta 2026-10-24](../../operations/brand-photography/EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) ·
> [Script de subida](../../../scripts/public-website/blog-post-cover-apply.php)
> **Documentacion relacionada:** [Componer piezas de Marketing con Manzanitas](./componer-piezas-de-marketing-con-manzanitas.md) ·
> [Producir una foto cine de marca](./producir-foto-cine-de-marca.md) · [Registro de marca (funcional)](../../documentation/creative/registro-marketing-con-manzanitas.md)

## Para qué sirve

Explica cómo hacer la **imagen destacada de un artículo del blog** de Marketing con Manzanitas y cómo publicarla. Esa
imagen también es la que se muestra cuando alguien comparte el artículo en LinkedIn, X, WhatsApp o Facebook. Cubre
las zonas seguras, la foto, la composición, la exportación, la subida con guardas y el QA en vivo.

**Por qué existe esta variante.** El banner de blog aprobado pone la cabecera, la voz y la firma en x 72. Pero la
misma imagen se ve recortada en cuadrado en la vista previa compacta de WhatsApp y en cualquier tarjeta cuadrada (así
la mostraba el archivo del blog de Ohio hasta el 2026-10-24), y ese recorte toma el centro. Con el banner, el recorte perdía la manzana, casi toda la pregunta y la firma. La variante
centrada pone todo el texto dentro del cuadrado central, para que se lea igual en el formato ancho y en el cuadrado.
La aprobó el operador el 2026-10-24.

Caso fuente: las portadas de *Qué es el inbound marketing*, *Qué es paid media* y *Topic clusters*, publicadas el
2026-10-24. Carpeta de trabajo: `ai-generations/2026-10-24_portadas-blog/`.

## Antes de empezar

- **Confirma que es un artículo de Marketing con Manzanitas.** Glitch tiene sus propias plantillas
  ([Componer piezas de Glitch](./componer-piezas-glitch.md)). Una pieza de Efeonce que no es MCM usa La órbita.
- **Confirma la línea del tema** en la norma (§2): Inbound y HubSpot van con `revenue-hubspot`, Paid Media con `voice`,
  SEO con `engine`. La línea elige el acento de la manzana, el punto de la respuesta y la prenda del sujeto.
- **Ten a mano el post:** su id, su slug y su URL pública. Las categorías cambian la URL (`/%category%/%postname%/`):
  nunca cambies la categoría para «arreglar» una portada.
- **Revisa el acceso:** `pnpm public-website:ssh-check` tiene que pasar antes de cualquier WP-CLI.
- **La subida cambia un sitio en vivo:** necesitas la aprobación explícita del operador después de que vea las
  portadas. Avisa también a las sesiones del blog que estén trabajando (ver paso 10).

## Zonas seguras

![Zonas seguras de la portada de artículo del blog](./assets/portada-blog-zonas-seguras.svg)

El lienzo es de **1200 × 630** (1,9:1) y se entrega al doble. Cada superficie muestra una parte distinta:

| Superficie | Qué muestra | Consecuencia |
|---|---|---|
| Open Graph en LinkedIn y Facebook | la imagen completa, 1,9:1 | se ve todo |
| Vista previa compacta de WhatsApp y cualquier tarjeta cuadrada | **el cuadrado central, x 285–915** | el texto tiene que estar entero dentro del cuadrado |
| Archivo del blog (temas, etiquetas, autores, búsqueda) | desde el 2026-10-24 (archivo v3, TASK-2055) es una lista de texto y **no muestra la imagen**. El archivo de Ohio anterior la mostraba en tarjetas cuadradas de 304 × 304 | hoy no aplica; el recorte cuadrado se mantiene por WhatsApp y por cualquier tarjeta futura |
| Tarjeta grande de X | 2:1, así que puede recortar unos 15 px arriba y abajo | nada importante en los 15 px de cada borde. Fuente: el validador de X citado en 2020; no lo medimos |
| Rail «Para leer con calma» de `/blog/`, escritorio (1440 y 1920) | tarjeta de 440 × 600 con la foto arriba en **440 × 330 (4:3)**, `object-fit: cover` centrado: en el lienzo de 1200 × 630 se ve **x 180–1020** | el cuadrado central cabe entero adentro, con 132 px de aire a cada lado de la columna de texto |
| Rail, tablet (768 y 1024) | tarjeta de 361 × 492 con la foto en **361 × 271 (4:3)**: mismo recorte, x 180–1020 | igual que en escritorio |
| Rail, móvil (390) | tarjeta de 300 × 440 con la foto en **300 × 220 (1,36:1)**: se ve x 170–1030 | igual; el texto se lee más chico, así que la respuesta de una palabra es la que se lee |
| Slider de `/blog/` | usa el `hero` del post si existe; si no, la destacada a sangre, anclada a la derecha (`object-position: 100% 50%`) y con su propio título encima, a la izquierda | **el título del slider choca con el texto de la portada.** Si un post con esta portada entra al slider, ponle como `hero` el plate sin texto (paso 10) |

Medidas en vivo del 2026-10-24, con el adaptador de la portada (`EO_Home_Adapter::rail()`). En escritorio, el rail
sólo pone foto en la primera y la cuarta tarjeta; en móvil, sólo en la primera. Las demás son tarjetas de minutos de
lectura, sin imagen. **La restricción que manda es el cuadrado central:** todos los demás recortes lo contienen.

Las medidas, en píxeles del lienzo de 1200 × 630:

| Elemento | Dónde va | Regla |
|---|---|---|
| Columna de texto | **x 312–782 · y 50–341** | 27 px de aire contra el borde izquierdo del cuadrado (285) y 133 px libres antes del borde derecho (915) |
| Cabecera de Manzanitas | 312, 50 → 492, 131 | con la manzana en el acento de la línea |
| Pregunta (la voz) | desde 312, 170 | dos líneas como máximo |
| Respuesta | 312, 250 → 782, 341 | **sin desborde**: el compositor informa `answerOverflowPx`, que tiene que ser 0. Las publicadas tienen de 5 a 8 letras («Orden», «Ayudar», «Atención») |
| Cara del sujeto | **x 795–900**, en el tercio de arriba | dentro del borde derecho del cuadrado, para que el recorte conserve la cara |
| Cuerpo y fenómeno | tercio derecho y mesa | el fenómeno (la luz, las tarjetas) puede quedar a medias en el recorte: la portada se tiene que entender sólo con el texto |
| Lecho | la mesa o el suelo en sombra, abajo | la foto 16:9 se recorta **quitando arriba**, así que el lecho queda entero |
| Firma | **no lleva** | la cabecera identifica la pieza y la prenda ya trae la marca bordada |
| Bajada y eslogan | **no llevan** | la pregunta y su respuesta bastan |

## Paso a paso

### Paso 1 · Escribe la pregunta y la respuesta

La pregunta es la que el artículo responde, dicha como la diría una persona. La respuesta es una sola palabra que la
resume y lleva el punto del acento. Ejemplos publicados: «¿Qué compra de verdad el paid media?» → «Atención.» y
«¿Qué le falta a tu blog para rankear?» → «Orden.». Revísalas con la skill `copywriting` si dudas.

### Paso 2 · Escribe la ficha cine

Copia una ficha de la carpeta del caso fuente (`fichas/MCB-TC1-169.json`) y ajústala. Lo que no puede faltar:

- `"formato": "16:9"`, `"registro": "cine"`, `"alcance": "manzanitas"` y la `"linea"` del tema.
- `identidad`: una persona del **elenco ficticio** (Antonio, Isabella, Sophia, Karo o Hum) con su `vista`. En las
  portadas del blog no aparece Julio ni el equipo real: es el precedente del 2026-10-18 para las fotos del sitio.
- `objetos`: la prenda de la línea (softshell o bomber en las líneas de negocio, hoodie en Servicios creativos; norma
  §4.2). La marca va **bordada** en la prenda.
- `fenomeno`: lo que el artículo explica, visible y sin texto (un anillo de tarjetas unidas para topic clusters, una
  tarjeta de luz para inbound).
- `escena`: **pide la cara en torno al 85 % del ancho** y deja **el 64 % izquierdo en oscuridad calma**, sin luces ni
  objetos. El modelo corre al sujeto unos 15 puntos hacia el centro, así que la cara termina cerca de x 800–900.
- `lecho` en sombra abajo y `reservas.texto` con tinta blanca sobre el muro oscuro.

### Paso 3 · Pide la revisión antes de gastar

Pasa la ficha y su prompt (`pnpm foto:prompt <ficha>`) por el agente `cine-reviewer`. Corrige lo que marque como
CORREGIR y vuelve a pasarla hasta que diga APROBABLE.

### Paso 4 · Genera la foto

```bash
pnpm foto:generar ai-generations/<carpeta>/fichas/<ficha>.json --quality high --size 2560x1440
```

Agrega `--dry` primero: imprime qué haría sin gastar. Cada foto cuesta unos USD 0,055 (gpt-image-2.5-sunburst,
octubre de 2026). El plate queda en `plates/`, junto a la ficha.

### Paso 5 · Valida la foto

```bash
pnpm foto:validar:cine <plate.png>
pnpm foto:validar <plate.png>
```

Además, mira al 100 % que el bordado de la prenda sea el logo correcto (`pnpm foto:emblema <plate.png>`) y que la cara
corresponda a la persona del elenco. Si la cara cae fuera de x 795–900 en el lienzo de 1200, corrige la escena y
vuelve a generar: no muevas ni recortes la foto de lado para compensar.

### Paso 6 · Compón la portada

Mientras la variante no esté en AXIS, se compone con la maqueta del caso fuente. La maqueta copia la plantilla aprobada
`blog-banner` del catálogo `manzanitas` y cambia sólo las posiciones:

```bash
cd ai-generations/2026-10-24_portadas-blog
ESCALA=2 FIRMA=0 node composicion/componer-centrada.cjs <plate.png> <linea> "<pregunta>" "<respuesta>" <salida.png>
```

- `ESCALA=2` renderiza a 2400 × 1260, que es la entrega.
- `FIRMA=0` quita el logo de Efeonce. Sin esa variable sale con firma: no lo publiques así.
- El comando imprime las cajas medidas (`boxes`) y `answerOverflowPx`. Revisa que las cajas caigan dentro de la columna
  de texto y que el desborde sea 0.
- Junto a la salida escribe `<salida>-recorte-movil.png`, el cuadrado central.

### Paso 7 · Revisa la portada completa y su recorte

Mira juntas la portada completa y el recorte cuadrado (una hoja como
`portadas-sin-logo-revision.png`). En el recorte tienen que leerse enteras la cabecera, la pregunta y la respuesta, y
tiene que verse la cara. Muéstrale la hoja al operador y espera su aprobación.

### Paso 8 · Exporta el JPEG

```bash
node -e 'require("sharp")("<salida.png>").jpeg({quality:88,chromaSubsampling:"4:4:4",mozjpeg:true}).toFile("<nombre>.jpg")'
```

- JPEG calidad 88 con croma 4:4:4, para que los bordes del texto y el punto de color no se manchen.
- El nombre del archivo describe el tema, en kebab-case: `que-es-paid-media-2026.jpg`. Si repites un nombre ya
  subido, WordPress le agrega un sufijo: elige otro.
- Anota el sha256 del archivo (`shasum -a 256 <nombre>.jpg`): la subida lo exige.

### Paso 9 · Escribe los metadatos

El archivo de metadatos (por ejemplo `tmp/cover-<post>.json`) lleva:

```json
{ "mode": "dry-run", "postId": 245605, "slug": "inbound-marketing-paid-media",
  "expectedThumb": 252066, "expectedOg": 252066,
  "filename": "que-es-paid-media-2026.jpg", "title": "Qué es paid media — portada",
  "alt": "Portada de Marketing con Manzanitas: una mujer con la chaqueta de Efeonce camina de noche por la calle y mira a cámara, junto al texto «¿Qué compra de verdad el paid media? Atención.»",
  "caption": "", "sha256": "<sha256 del JPEG>" }
```

- `expectedThumb` y `expectedOg` son los ids de la destacada y de la imagen OG **que el post tiene ahora**: léelos
  antes (paso 11). Si alguien cambió la portada mientras tanto, la subida se detiene.
- El `alt` describe la escena y repite el texto de la portada, como en el ejemplo.

### Paso 10 · Avisa a las sesiones del blog

Antes de escribir en el sitio, lista las sesiones activas y avísales a las que trabajan en el blog: la subida purga
toda la caché de Kinsta. Espera su confirmación de que no tienen un despliegue o un QA en curso. Pregúntale también a
la sesión de la portada del blog si el post tiene `hero` propio (`pnpm public-website:blog-home slider`): si lo tiene,
el slider no tomará la portada nueva hasta cambiar ese `hero`. Si no lo tiene y el post entra al slider, ponle como
`hero` el plate sin texto: el slider pinta su propio título sobre la imagen.

### Paso 11 · Simula la subida

Con `"mode": "dry-run"`, el script no escribe nada: comprueba las guardas y muestra el estado actual.

```bash
pnpm public-website:wpcli -- --eval-file scripts/public-website/blog-post-cover-apply.php \
  --input-file <nombre>.jpg --input-file tmp/cover-<post>.json --wp-user 12
```

Tiene que responder `"ok": true`, con todas las guardas en verde: post publicado, slug, destacada y OG esperadas,
proporción 1,9:1 y tamaño mínimo de 1200 × 630.

### Paso 12 · Sube la portada

Cambia `"mode"` a `"apply"` y corre el mismo comando. El script:

1. vuelve a comprobar las guardas y aborta sin escribir si alguna falla;
2. guarda las cinco metas de imagen del post en la opción `_gh_cover_refresh_<post>_<fecha UTC>`;
3. sube el JPEG a la biblioteca de medios con su título y su `alt`;
4. lo pone como imagen destacada y como imagen OG de Yoast. La imagen de X sólo se cambia si el post ya tenía una
   propia; si no, X usa la OG;
5. reconstruye el indexable de Yoast y purga la caché.

Anota el adjunto nuevo y el nombre de la opción de respaldo que imprime.

### Paso 13 · Haz el QA en vivo

- **Metadatos:** en el HTML del artículo (sigue los redirects), `og:image` apunta al archivo nuevo con 2400 × 1260,
  `primaryImageOfPage` del schema también, y no queda ninguna referencia al archivo anterior.
- **Archivo:** el sha256 del archivo publicado es igual al local.
- **Portada del blog:** `pnpm public-website:blog-home verify --browser` en verde.
- **Rail de la portada:** si el post entra al rail, mira su tarjeta en 1440 y en 390 (`?qa=1` evita la caché).
- **Recorte real:** el archivo v3 del blog ya no muestra la imagen. Revisa el recorte cuadrado en el archivo
  `-recorte-movil.png` del paso 6 y, si puedes, compartiendo el enlace en WhatsApp.
- **Redes:** X y LinkedIn guardan en caché la tarjeta anterior. Para refrescarla, usa el Post Inspector de LinkedIn y
  vuelve a compartir el enlace en X.

### Paso 14 · Registra lo publicado

En el `LEEME.md` de la carpeta de trabajo, anota por post el adjunto nuevo, el archivo, la opción de respaldo y el QA.
Haz commit sólo de los archivos de texto: los PNG y JPG de `ai-generations/` no van a git. Archívalos con
`pnpm ai-gen:archive` cuando el operador lo decida.

## Qué significan las señales

| Señal | Qué quiere decir | Qué haces |
|---|---|---|
| `"ok": false` en la simulación | alguna guarda no pasa | lee cuál: `thumb`/`og` en falso significa que la portada cambió desde que la leíste; vuelve a leer y ajusta los ids esperados, sin forzar |
| `Image integrity failed` | el JPEG no es el que revisaste | vuelve a exportar o corrige el sha256; nunca subas un archivo distinto del aprobado |
| `answerOverflowPx` mayor que 0 | la respuesta no cabe | acorta la palabra; no achiques la letra |
| `readback_mismatch` | la destacada no quedó con el adjunto nuevo | revisa el post y restaura desde la opción de respaldo si hace falta |

## Qué no hacer

- **No** pongas el logo de Efeonce en la portada de un artículo (decisión del operador del 2026-10-24). El banner que
  se comparte fuera del sitio sí firma.
- **No** dejes texto fuera de x 312–782 ni lo acerques a los bordes de arriba y abajo.
- **No** muevas las posiciones a mano en otra copia de la maqueta: cambia la maqueta o espera la pieza de AXIS.
- **No** presentes la variante como pieza de AXIS: todavía no lo es.
- **No** uses a Julio ni al equipo real en estas fotos, y no regeneres ni aproximes una portada ya aprobada.
- **No** subas sin la aprobación del operador ni sin avisar a las sesiones del blog.
- **No** cambies la categoría ni el slug del post: cambian la URL.

## Problemas comunes

| Problema | Causa | Solución |
|---|---|---|
| En el recorte cuadrado no se ve la cara | el sujeto quedó a la derecha de x 915 | pide la cara un poco más al centro en la escena y vuelve a generar |
| El sujeto tapa la pregunta | quedó demasiado al centro | pídelo más a la derecha: el modelo lo corre unos 15 puntos al centro |
| La cabecera choca con el borde de arriba | la foto se recortó quitando abajo | usa la maqueta, que quita arriba y deja el lecho entero |
| El post sigue mostrando la portada vieja | caché del navegador, de Kinsta o de la red social | recarga con un parámetro (`?qa=1`); en redes, usa el inspector de cada una |
| El slider de la portada del blog no cambia | el post tiene `hero` propio | cámbialo con `pnpm public-website:blog-home hero <post> <adjunto> --apply`, coordinando con la sesión de la portada |

## Volver atrás

Cada subida deja la opción `_gh_cover_refresh_<post>_<fecha UTC>` con las cinco metas anteriores (`_thumbnail_id`,
la imagen OG de Yoast y su id, la imagen de X y su id). Para restaurar, vuelve a poner esos valores en el post,
reconstruye el indexable de Yoast y purga la caché. El adjunto nuevo queda en la biblioteca: bórralo sólo si el
operador lo pide.

## Referencias técnicas

- Norma: [`MANZANITAS_REGISTER_V1.md` §5.6](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md) y
  skill `efeonce-graphic-line` → `references/manzanitas.md` §4.5.
- Maqueta: [`componer-centrada.cjs`](../../../ai-generations/2026-10-24_portadas-blog/composicion/componer-centrada.cjs);
  plantilla base: `src/lib/artifact-composer/catalogs/manzanitas/blog-banner.html`.
- Subida: [`scripts/public-website/blog-post-cover-apply.php`](../../../scripts/public-website/blog-post-cover-apply.php).
- Caso fuente y registro de lo publicado: [`LEEME.md`](../../../ai-generations/2026-10-24_portadas-blog/LEEME.md).
- Pendiente: llevar la variante a AXIS (`manzanitasRegister`) y a la plantilla `blog-banner` del compositor, y
  replicarla en el resto del blog por tandas aprobadas.
