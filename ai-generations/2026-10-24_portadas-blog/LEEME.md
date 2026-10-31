# Portadas de blog de Marketing con Manzanitas · centradas para el recorte móvil (2026-10-24)

**Estado:** publicadas el 2026-10-24 como imagen destacada e imagen social (Open Graph y tarjeta grande de X) de:

| Artículo | Post | Adjunto | Archivo |
|---|---|---|---|
| Qué es el inbound marketing y cómo funciona en 2026 | `244765` | `252065` | `wp-content/uploads/2024/07/que-es-inbound-marketing-portada-2026.jpg` (2400 × 1260) |
| Qué es paid media y cómo combinarlo con el inbound marketing | `245605` | `252066` | `wp-content/uploads/2024/10/que-es-paid-media-portada-2026.jpg` (2400 × 1260) |

Aprobadas por el operador tal como están («La verdad no las veo mal, súbelas»). `cine-reviewer`: inbound
APROBABLE; paid media CORREGIR (fenómeno poco legible, luz frontal, carteles azules, brillo de la baranda bajo la firma):
el operador la aceptó igual. Si se rehace, las correcciones están en la revisión del 2026-10-24.

## Por qué existen

El banner de blog aprobado de la sub-línea (`blog-banner-escena`, AXIS `manzanitasRegister`) pone cabecera, voz y firma
en x 72 de 1200. La vista previa móvil (WhatsApp y las tarjetas del blog, que recortan en cuadrado) toma el centro
(x 285–915) y perdía el logo de Manzanitas, casi toda la voz y la firma (`demo/comparacion.png`). El operador eligió la
opción A: Escena con foto, texto dentro del cuadrado central y sujeto en el tercio derecho (`demo/esquema-opciones.png`).

## Cómo se hizo

1. Fichas cine `fichas/MCB-INB1-169.json` (Antonio, `revenue-hubspot`, softshell) y `fichas/MCB-PM1-169.json`
   (Isabella, `voice`, bomber), elenco ficticio con `alcance: "manzanitas"` y nota del precedente del 2026-10-18.
   Dos pasadas de `cine-reviewer` antes de generar.
2. `pnpm foto:generar <ficha> --quality high --size 2560x1440` (gpt-image-2.5-sunburst, ≈ USD 0,055 c/u).
3. `foto:validar:cine` sin fallas · `foto:validar` 4/4 · bordado al 100 % correcto en las dos · identidad contra el
   elenco · contraste bajo la caja real de la firma 16,9:1 y 15,0:1 (peor 5 %: 16,1 y 9,8).
4. Composición: `composicion/componer-centrada.cjs` — **maqueta candidata**: copia el catálogo `manzanitas` a un
   temporal y cambia sólo la x de cabecera, voz y firma (72 → 312 px). Entrega con `ESCALA=2` (2400 × 1260),
   JPEG q88 4:4:4 en `final/`.
5. Subida con `tmp/post-cover-apply.php` (guardas de slug, estado, imagen destacada y OG previos; respaldo en opción
   de servidor; adjunto con autor Julio y alt descriptivo; Yoast reindexado; caché purgada).

## Rollback

Opciones de servidor con el estado previo: `_gh_cover_refresh_244765_20261024_093912` (destacada `244824`, OG `244847`)
y `_gh_cover_refresh_245605_20261024_093925` (destacada `245724`, OG `245730`). Restaurar = volver a poner esos IDs y
URLs en `_thumbnail_id`, `_yoast_wpseo_opengraph-image` e `-image-id`, reindexar Yoast y purgar caché.

## Sin logo (2026-10-24, tarde)

El operador pidió quitar el logo de Efeonce de las tres portadas. `componer-centrada.cjs` acepta `FIRMA=0`, que borra
la firma antes del render. Las nuevas portadas están en `final-sin-logo/` (con su `-recorte-movil.png`) y la hoja de
revisión es `portadas-sin-logo-revision.png`. **Publicadas el 2026-10-24 a las 17:21 UTC con aprobación del operador**
como destacada e imagen OG de los tres posts. La tarjeta de X usa la OG: los posts no tienen imagen propia de X.

| Post | Adjunto nuevo | Archivo | Respaldo (estado previo) |
|---|---|---|---|
| `244765` inbound | `252079` | `uploads/2024/07/que-es-inbound-marketing-2026.jpg` | `_gh_cover_refresh_244765_20261024_172130` (`252065`) |
| `245605` paid media | `252080` | `uploads/2024/10/que-es-paid-media-2026.jpg` | `_gh_cover_refresh_245605_20261024_172143` (`252066`) |
| `245154` topic clusters | `252081` | `uploads/2024/08/topic-clusters-contenido-pilar-2026.jpg` | `_gh_cover_refresh_245154_20261024_172150` (`252069`) |

QA en vivo:
- En las tres páginas, `og:image` y `primaryImageOfPage` apuntan al archivo nuevo, a 2400 × 1260, y ya no queda ninguna
  referencia a las portadas con logo.
- El sha256 de los tres archivos publicados es igual al del archivo local.
- `blog-home verify --browser` pasa en verde: 8 anchos sin desborde y 0 violaciones de accesibilidad.
- La tarjeta cuadrada del archivo de Inbound muestra entera la portada de paid media, sin logo.
- Los tres posts no están en el slider de la portada, así que no hubo que tocar ningún `hero`.

Antes de subir se avisó a las sesiones del blog y las tres confirmaron que no tenían trabajo en curso. Las guardas esperan como destacadas
actuales `252065` (inbound, post 244765), `252066` (paid media, 245605) y `252069` (topic clusters, 245154); el respaldo
de topic clusters es `_gh_cover_refresh_245154_20261024_101153`. La variante quedó documentada en
`docs/operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md` §5.6 y en la skill `efeonce-graphic-line`
(`references/manzanitas.md` §4.5).

```bash
ESCALA=2 FIRMA=0 node composicion/componer-centrada.cjs plates/MCB-INB1-169.png revenue-hubspot \
  "¿Qué es el inbound marketing en 2026?" "Ayudar" final-sin-logo/portada-inbound.png
```

## Cómo validar el RUT en formularios de HubSpot (2026-10-25)

Portada del artículo refrescado el mismo día (post `246024`). **Publicada el 2026-10-25 a las 10:44 UTC con aprobación
del operador** como destacada e imagen OG; la tarjeta de X usa la OG.

| Post | Adjunto nuevo | Archivo | Respaldo (estado previo) |
|---|---|---|---|
| `246024` RUT en HubSpot | `252092` | `uploads/2024/11/validar-rut-formularios-hubspot-2026.jpg` (2400 × 1260, 231 KB) | `_gh_cover_refresh_246024_20261025_104440` (destacada `246029`, OG `246030`, WebP de 2024) |

- **Ficha:** `fichas/MCB-RUT1-169.json` (Antonio, `revenue-hubspot`, softshell). Fenómeno: una tarjeta de vidrio cruza
  una compuerta vertical de luz azure; la mitad que pasó, limpia; las que no pasaron, opacas a la izquierda. Acento
  magenta en la esquina de la tarjeta que pasó.
- **`cine-reviewer` antes de generar: CORREGIR** (acento azure sobre luz azure; dirección de la tarjeta ambigua; riesgo
  de lector, chip o visto bueno en las tarjetas). Las tres correcciones se aplicaron textuales. Plate generado una sola
  vez (`plates/MCB-RUT1-169.png`, gpt-image-2.5-sunburst high, ≈ USD 0,055).
- **Validación:** `foto:validar:cine` sin fallas (sombra 93 %); `foto:validar` 4/4 reservas; bordado al 300 %: nave,
  órbita, tres ventanas y esfera. Cara en torno al 72 % del ancho: en el recorte cuadrado queda en el borde derecho,
  igual que paid media y topic clusters.
- **Texto:** «¿Cómo entra un RUT a HubSpot?» → «Validado.» (`answerOverflowPx` 0). La primera versión, «¿Cómo debe
  entrar un RUT a HubSpot?», dejaba la «a» final contra el hombro del sujeto. Composición: `final-rut/portada-rut-c.png`;
  hoja de revisión `final-rut/portada-rut-revision.png`.
- **QA en vivo:** `og:image` y `primaryImageOfPage` apuntan al archivo nuevo, a 2400 × 1260; `og:image:alt` y
  `twitter:image:alt` con el alt descriptivo; sha256 del publicado = local (`67fb8944…`); ninguna referencia a la portada
  de 2024. `blog-home verify --browser`: 8 anchos sin desborde y 0 violaciones (una comprobación de «autor de ejemplo»
  en `/blog/` falló una vez y pasó al repetir). El post no está en el slider ni en el rail.
- **Antes de subir** se avisó a las cinco sesiones del blog; las cinco confirmaron que no tenían despliegue ni QA en curso.
- **Mismo día, metadatos:** se quitaron las etiquetas `comohacer` y `how-to` del post (sólo lo usaban a él y salían
  como `keywords` del schema); quedan `hubspot` y `tutoriales`. Respaldo `_gh_tags_refresh_246024_20261025_104454`.

## ICP B2B: cómo definir tu cliente ideal (2026-10-25)

Portada del refresh del post `249108`. **Aprobada por el operador; se sube junto con la publicación del artículo**
(simulación con guardas `ok: true`; `expectedOg: 0` porque el post no tiene OG propia de Yoast).

- **Ficha:** `fichas/MCB-ICP1-169.json` (Hum, `growth`, bomber). Fenómeno: de unas veinte tarjetas de vidrio, la mayoría
  barridas a un montón opaco a la izquierda y tres encendidas frente a ella; acento teal en el bisel de la del medio.
- **`cine-reviewer`: CORREGIR** (montón del lado equivocado e invisible; «tiles» y «playing cards» invitaban a dibujar
  palos y números; teal sobre luz azure; resto de TC1). Correcciones aplicadas; una sola generación (≈ USD 0,055).
- **Validación:** `foto:validar:cine` sin fallas (sombra 92 %); `foto:validar` 4/4; bordado de la bomber correcto al 300 %.
  Cara en torno al 70 % del ancho.
- **Texto:** «¿Para qué sirve un ICP?» → «Decir no.» (`answerOverflowPx` 0). «Descartar.» se descartó: la «r» caía sobre
  el hombro. Archivo: `final-icp/icp-b2b-cliente-ideal-2026.jpg` (2400 × 1260, 227 KB, sha256 `67246507…`).
- 🔴 **Fórmula agotada (operador, 2026-10-25):** «para las próximas cambiemos la fórmula, tenemos varias portadas con una
  persona al frente y vidrio». La próxima portada no repite persona tras la mesa con tarjetas de vidrio.

## SEO y AEO: cómo aparecer en Google y en la IA (2026-10-25)

Portada del refresh del post `248463`, **primera con la fórmula nueva** que pidió el operador (sin persona al frente y
sin vidrio). **Aprobada por el operador el 2026-10-25** («Ok dale») con el texto «○ Google te encuentra. La IA /
**te elige**●». **Publicada el 2026-10-25 a las 15:24 UTC** con el artículo: portada `252123` (respaldo
`_gh_cover_refresh_248463_20261025_152401`), `hero` `252124` (no fijado) y tarjeta `252125` (foco `75% 50%`). Se avisó
antes a las sesiones del blog. QA en vivo en `docs/public-site/SEO_AEO_REFRESH_DRAFT_V1.md` §5.

- **Ficha:** `fichas/MCB-AEO1-169.json` (línea `engine`, sin personas, sin palanca). Fenómeno: un cajón de fichero
  contemporáneo (fresno teñido negro mate) sobre una mesa negra; de cientos de fichas en blanco, una sola queda
  levantada bajo un foco frío con el borde en el azul de la línea (#0375DB): la que el motor elige. Excepción de
  alcance declarada en la `nota` (el registro cine define Manzanitas por persona, §2 caso 4).
- **`cine-reviewer`: CORREGIR → APROBABLE.** Sin `luz-motivada` (pedía la fuente visible), cámara a ~2,5 m sobre la
  mesa negra, madera negra y fichas blanco frío (el roble con fichas crema se lee fichero antiguo), el color de la
  línea en el borde de la luz y no como punto suelto, «no hay cara» para neutralizar los bloques de piel.
- **Cinco generaciones (≈ USD 0,28).** v1 dejaba la ficha al 78 % (fuera del recorte cuadrado); v2 tenía el cajón en
  el 57 % (la norma pide el 64 % izquierdo vacío) y «La IA» quedaba a 15 px de su esquina; v3 y v4 lo empeoraron (el
  modelo ignora los porcentajes de un objeto: lo ensancha o lo acerca). **v5, la vigente, describe el cajón con
  fracciones y tamaño relativo** («lejos y chico, un octavo del ancho, entero en el tercio derecho, la tapa a media
  altura»). Plates anteriores en `plates/MCB-AEO1-169-v1…v4.png`. v5: `foto:validar:cine` sin fallas (sombra 97 %),
  `foto:validar` 4/4.
- **Medido en la portada v5 (lienzo 1200 × 630):** línea de arriba termina en x 710 y el cajón empieza en x 735, más
  abajo; «te elige.» termina en x 577, a 139 px del cajón; la ficha en x 775–861, con 54 px de margen dentro del
  cuadrado central (x 285–915).
- **Textos rechazados** (todos sobre la misma foto, `final-aeo/descartes/`): «¿Qué cita la IA de tu sitio? Pasajes.»,
  «¿A quién recomienda la IA? A pocos.», «La IA recomienda / A pocas.», «Nombra pocas», «Elige pocas», «Cita pocas» y
  otros. El operador: «son mensajes absurdos… no pongas preguntas y respuestas; pon el ring, un texto arriba y uno
  abajo destacado con la esfera», con fórmulas de la skill `copywriting`. Lecciones en el canon (La órbita §4,
  Manzanitas §5.6 y registro cine, deltas 2026-10-25).
- **Archivos finales** (`final-aeo/`):

  | Imagen del inventario | Archivo | Medidas | sha256 |
  |---|---|---|---|
  | 1 · Plate (tarjeta del rail) | `seo-y-aeo-google-ia-2026-card.webp`: el plate sin los 380 px de arriba (con el plate entero la ficha caía sobre el inicio del degradado); ficha en y 16–28 % | 2560 × 1060 | `98b6292d…` |
  | 2 · Portada (destacada, OG, X, «Te puede interesar») | `seo-y-aeo-google-ia-2026.jpg` (153 KB) | 2400 × 1260 | `026d262e…` |
  | 3 · Slider (`hero`) | `seo-y-aeo-google-ia-2026-hero.webp` (43 KB): el plate sin los 200 px de arriba y los 160 de la derecha; ficha en x 67–79 % · y 29–40 %, a la derecha del título | 2400 × 1200 | `eaa9f95d…` |
  | 4 · Cuerpo | infografía «Cómo arma su respuesta un motor de IA» v2, adjuntos `252118`/`252119` | 1600 × 930 · 900 × 2578 | — |

  Tarjeta con `--focus "75% 50%"`: se ve x 52–83 % en escritorio y tablet y x 58–81 % en el teléfono; la ficha queda
  entera, centrada, debajo de las etiquetas y por encima del degradado. Medido el 2026-10-25. Hoja de revisión por superficie: `final-aeo/revision-superficies.jpg` (portada, cuadrado, tarjeta 440 ×
  600 y 304 × 540, slider 1440 y 390).
- **Alt de la portada:** «Portada de Marketing con Manzanitas: un cajón de fichero abierto sobre una mesa oscura, con
  una sola ficha levantada bajo un foco de luz azul, junto al texto «Google te encuentra. La IA te elige.»».
- **Alt del `hero` y de la tarjeta:** «Un cajón de fichero abierto sobre una mesa oscura, con una sola ficha levantada
  bajo un foco de luz azul.»
- **Fuera del sitio** (sólo si el plan de canales lo pide): post de LinkedIn 1200 × 627, miniaturas de YouTube y story;
  no se produjeron.

## Pendiente

- **Formalizar la variante centrada en AXIS** (pieza nueva o regla de zona segura del banner de blog) y en la plantilla
  `blog-banner` del compositor; hoy no es una pieza aprobada de AXIS y se compuso con la maqueta.
- Casebook cine: filas nuevas para «voz en el cuadrado central» (el compilador reserva el 42 % izquierdo y no sabe
  expresarlo), la deriva medida (los dos sujetos salieron ~15 puntos más al centro de lo pedido) y la llave fuera de
  cuadro en exteriores.
- Replicar en el resto del blog (≈ 35 artículos + Glitch con sus plantillas propias), con aprobación por tanda.
- Binarios sólo en disco local (`*.png`/`*.jpg` ignorados por git): archivar con `pnpm ai-gen:archive` cuando se decida.
