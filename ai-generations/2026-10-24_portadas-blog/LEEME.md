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

## Pendiente

- **Formalizar la variante centrada en AXIS** (pieza nueva o regla de zona segura del banner de blog) y en la plantilla
  `blog-banner` del compositor; hoy no es una pieza aprobada de AXIS y se compuso con la maqueta.
- Casebook cine: filas nuevas para «voz en el cuadrado central» (el compilador reserva el 42 % izquierdo y no sabe
  expresarlo), la deriva medida (los dos sujetos salieron ~15 puntos más al centro de lo pedido) y la llave fuera de
  cuadro en exteriores.
- Replicar en el resto del blog (≈ 35 artículos + Glitch con sus plantillas propias), con aprobación por tanda.
- Binarios sólo en disco local (`*.png`/`*.jpg` ignorados por git): archivar con `pnpm ai-gen:archive` cuando se decida.
