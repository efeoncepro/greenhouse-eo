# Aplicaciones de «La órbita» — guía por pieza y por espacio

> Delta Rooms verificado contra: decisión explícita del operador y fuentes de axis-design-system@f4dd2fe — 2026-10-07; revisión documental, sin implementación ni release Rooms. Los sellos anteriores conservan su ámbito histórico.

Verificado contra: greenhouse-eo@7cb24df17 · axis-design-system@a5c21ae (íconos: AXIS `main@5b8ab20`, tag `v0.3.6`)
— 2026-09-26 (decisiones del operador D1–D22 del 2026-09-26 registradas; ver `ledger.md`) · Plastilina en volumen
(D24, §0.3 y A10): AXIS `main@c18e3d3` — 2026-09-27 · §L con la ruta por el Artifact Composer: greenhouse-eo@016d0a183 — 2026-09-27
· §L «Componer el deck hoy» y «Cambiar la foto, el copy o la sección»: árbol local de `develop` tras el cierre de
TASK-1927 — 2026-09-27 · §L «Recetas con plantilla desde TASK-1928»: árbol local de `develop` en `64be8aa16`
(AXIS `v0.3.20`) — 2026-09-27 · portada con selección (`document-selection`, AXIS `v0.3.21`) — 2026-09-28 · §L
«Láminas SEO/AEO con plantilla desde TASK-1934» (AXIS `v0.3.23`, `develop` tras `af32d9353`) — 2026-09-28 · versiones
vigentes de §L (AXIS `v0.3.24`, greenhouse-eo@53002b352) — 2026-09-28 · §C4 (módulos de correo) y el camino recorrido
de la medida: AXIS `main` `c92160b`, tag `v0.3.38` — 2026-09-29 · §L «El deck SEO/AEO» (catálogo `2f2784d93`,
intents `2382ed624`, orden `b84ec7084`; sin plantillas ni AXIS todavía) — 2026-09-30 · §A11 (perfiles sociales de
Efeonce): `develop` en `d1a41babb` (commits `877165732`, `9e8f5feda`, `d8cb83b9a`, `4e362bb8b`, `d1a41babb`, sin
push) — 2026-10-01 · §A12 (el login V4 de Greenhouse, TASK-1964): árbol local de `develop` sobre `b0efd42a3`
(`src/views/login/LoginLens.tsx`, `src/components/greenhouse/motion/orbit-geometry.ts`) — 2026-10-02

Esta guía dice, **para cada aplicación**, qué elementos de la línea van (y cuáles nunca), dónde se ubican, cuánto espacio
ocupan, en qué superficie y color, y cómo se produce. No repite la API (ver `package-and-tokens.md`), el significado de
cada elemento (`criteria.md`), las recetas paso a paso (`composition.md`), la fotografía (`photography-convergence.md`),
el movimiento (`motion.md`) ni la revisión final (`qa-checklist.md`).

**Fuentes y cómo se citan:**

- **L x.y** = lámina del canvas, en `axis-design-system/apps/lab/src/data/graphic-line-elements.json` (se ve en el Lab,
  `axis.efeonce.org/references/graphic-line`). Las medidas `W×H` son las del lienzo de la lámina.
- **M §x** = manual `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` (v1.6).
- **T** = token `efeonceGraphicLine.*` en `axis-design-system/packages/tokens/src/tokens.ts` (`@efeoncepro/axis-tokens`
  0.3.4). **R** = función de `@efeoncepro/axis-graphic-line` 0.3.1 (`packages/graphic-line/src/recipes.ts`).
- Lo marcado **«inferido»** no está escrito en ninguna fuente: es lectura de este archivo y se confirma con el operador
  antes de producir. Al final hay una lista de todo lo inferido.

**Formato de cada tarjeta:** *Para qué* · *Lienzo* · *Va* · *Nunca* · *Espacio* · *Color y superficie* · *Cómo se
produce* · *Errores comunes* · *Fuente*.

---

## 0. Criterio de espacio que vale para todas las aplicaciones

Estas reglas no se repiten en cada tarjeta; se asumen siempre.

1. **La órbita se declara a propósito, nunca por defecto** (M §1.3, regla del operador 2026-09-26). Aparece sólo si
   hace uno de sus tres trabajos: **rodear** (una palabra, una lente, un objeto), **medir** (un dato real con fuente) o
   **enfocar** (lente, foco). Una pieza que no la necesita va sin órbita: la esfera como punto final ya es la línea.
2. **Una sola órbita por pieza, por muro y por vidrio** (L 4.1, L 4.3 2/3). Nada de patrones ni repeticiones.
3. **Un solo anillo alrededor de lo que rodea** (M §1.3, 2026-09-26): las órbitas interiores sólo van en una órbita
   vacía que las necesita (anatomía, mapa de portafolio). El contrato rechaza `inner-orbits-never-around-content`.
   Varias láminas de aplicaciones (banner de LinkedIn en L 4.1, fondo de Teams en L 4.3 3/3) se dibujaron antes con una
   órbita interior: **al reproducirlas, un solo anillo** (decisión del operador, 2026-09-26, D6).
4. **El texto nunca cruza la órbita** (M §1.3; en código, `textCrossesRing`). La órbita tampoco cruza el sujeto de una
   foto, la reserva de texto, el lecho ni la firma.
5. **Posición por defecto** (L 5.1): centro de la órbita fuera del eje, hacia la derecha y arriba; el texto vive en el
   tercio inferior izquierdo. Radio: **30 % del ancho** en vertical, **40 % del alto** en horizontal.
6. **Márgenes** (L 5.1, T `signature.marginOfShortSide`): 9 % del lado corto en redes (96 px sobre 1080); 140 px en
   16:9; 68 px en A4 de 794 px.
7. **El arco de avance sólo con un dato real** y su fuente; sin dato, no hay arco (M §1.3, T `trajectory`). En un
   estado de sala, el arco mide tiempo real (L 4.3 2/3).
8. **Gramática de estado** (T `state`): **anillo = libre / abierto / pregunta**, **esfera = ocupado / decidido /
   respuesta**. Nunca colores de semáforo, y siempre con su etiqueta de texto.
9. **Logo una vez por vista**, logo o isotipo, nunca los dos (M §8.1). En piezas gráficas la firma es el **logo de
   Efeonce centrado abajo**; la burbuja URL lo reemplaza sólo si el logo ya está en la imagen (M §8.5).
10. **El eslogan sólo en cierres** (M §5): final de video, última lámina, contratapa, firma de correo, recepción, merch.
    Nunca en cada post, nunca en la portada, nunca con esfera, nunca traducido ni en mayúsculas. En la contraportada de
    propuesta comercial es el mensaje principal; en la de brochure firma bajo «¿Conversamos? Cuando quieras.»
    (operador, 2026-09-27; §L).
11. **Objetos: frente la palabra con su punto; dorso el logo solo** (M §10.4). La órbita, si va, rodea la palabra.
    **Nunca** la órbita alrededor del logo en un objeto.
12. **Color:** una marca y un acento por pieza (M §2). Oscuro Efeonce `#001A33` + teal `#36C8BF` + halo `#72DED8`;
    papel `#F7F8F6`/blanco con navy `#023C70` y teal oscuro `#0E8C82` como gráfico y texto de 24 px o más. Cada pieza
    toma el acento de **su línea de servicio**; el logo que firma es siempre Efeonce (M §7). **Regla del acento** (D1,
    2026-09-26): ≥ 3:1 contra su fondo en gráfico y texto ≥ 24 px; **nunca en texto de menos de 24 px** (ahí navy sobre
    claro, blanco sobre oscuro). El teal claro nunca es texto sobre claro (2,1:1).
13. **Halo sobre papel a media intensidad** (D7, token `orbit.haloOnLightScale: 0.5`); en impresión con degradados bajo
    5 % se omite (§0.1).
14. **Soporte físico:** los valores son sRGB; CMYK o Pantone se fijan **con prueba física del proveedor**, nunca sin
    prueba (L 5.1, M §2). Todo objeto o espacio se valida con muestra antes de producir.
15. **Maquetas generadas con IA son maquetas**: se rotulan como tales y la producción sale del arte vectorial (L 4.8,
    L 4.9, M §10.8–10.9). Ver §K.

### 0.1 Medidas de producción por soporte (L 5.1)

| Soporte | Anillo | Arco | Esfera | Halo | Nota |
|---|---|---|---|---|---|
| Pantalla (base 794 px de ancho) | 1 px · 16–22 % | 1,6–2 px | r 3,5–4 px | 13 → 3 → 0 % | escala con el ancho del lienzo |
| Redes (≤ 1200 px de ancho) | × 1,75 (2,4 px sobre 1080) | × 1,75 | × 1,75 (r 8 px) | igual | verificado a 390 px de ancho |
| Papel (informe, cuaderno) | mín. 0,3 mm | mín. 0,5 mm | mín. Ø 1,5 mm | se omite o fondo liso | degradados bajo 5 % hacen bandas en offset |
| Cerámica (taza) | 0,5 mm | 1,2 mm | Ø 4,4 mm | sin halo | órbita Ø 74 mm, centrada en la cara frontal |
| Vinilo (muro, vidrio), órbita Ø 1,2 m | 3 mm | 5 mm | Ø 18 mm | sin halo | escala lineal con el diámetro; **centro a 1,5 m del piso** |
| Pizarra | impreso 2 mm, 30 % | impreso 4 mm | imán Ø 45 mm | sin halo | el imán es la esfera y se mueve |
| Video | igual que pantalla | crece en 1 s, ease-out | asienta con rebote de 0,3 s | sube en 0,8 s | cierre de 4,5 s; movimiento reducido = cuadro final |

### 0.2 El logo dentro de la órbita (decidido el 2026-09-26, D5)

M §8.3 n.º 8 prohíbe «órbita alrededor del logo: la órbita rodea palabras, nunca el logo», y L 4.4 / M §10.4 descartan
la órbita alrededor del logo **en objetos**. El operador decidió la excepción:

- **Sí, sólo en cierres de marca:** el cierre del deck (`deckSlideHtml('close')`), el cierre de video (`brand-close`) y
  el muro de recepción (L 4.3 1/3). El resguardo X del logo (alto de la nave) se respeta: el anillo queda fuera de él.
- **Nunca** en el banner de LinkedIn (L 4.1) ni en el reverso de la tarjeta de presentación (L 4.6 3/3): en objetos, el
  logo va solo en el dorso. Esas láminas no se reproducen tal cual en este punto.
- **En todo lo demás** rige M §8.3 n.º 8: la contraportada de Insights, por ejemplo, lleva el logo fuera de la órbita
  (L 7.2).

### 0.3 Íconos en las aplicaciones (canónicos desde el 2026-09-26, D16–D22)

La iconografía de la línea no es la órbita: se pinta con `@efeoncepro/axis-graphic-line/icons` y su fuente de verdad es
AXIS (`docs/agent-composition/iconography.md`). Criterio en `criteria.md` §3.14; detalle en `iconography.md`. Lo que
vale en toda aplicación:

- **La voz la decide la línea de servicio de la pieza** (`iconVoiceForLine`): **Trazo** en Growth, Engine y Revenue
  (decks, informes, dashboards, listas, firmas, navegación); **Plastilina** en Brand (piezas sociales, portadas,
  stickers, momentos del oficio). Voice, por decidir: se elige y se declara. Una voz por grupo.
- **Reposo por defecto; responde uno solo** —el servicio que se vende, la sección donde vamos— y sólo si la pieza no
  tiene otra esfera (una órbita, una respuesta que cierra con su esfera, un marcador de estado): entonces
  `pieceHasSphere: true` y ningún ícono responde. Listas, tablas, contacto, navegación y satélites: siempre reposo.
- **En una fila:** 48–56 px, línea base común, al menos un ícono de ancho entre íconos; etiqueta opcional debajo en
  Poppins, nunca en el acento (texto de menos de 24 px).
- **Tamaños mínimos:** el Trazo responde desde 20 px; Plastilina no baja de 32 px (más chico, el Trazo).
- **Cómo se produce:** `resolveIcon` (o `iconSvg`) y `auditIconGroup` antes de entregar; en Greenhouse, que todavía no
  consume `/icons`, los SVG salen de `pnpm icons:export` en AXIS o del Lab (`/references/iconography/`, «Copiar SVG»).
  Un glifo que no está en `ICON_CATALOG` no se dibuja en la pieza: se da de alta en AXIS con la aprobación del operador.
- **Excepción vigente:** la firma de correo personal y la de equipo siguen con íconos **Tabler** hasta que el operador
  decida (C1, C2).
- **Plastilina en volumen (D24, 2026-09-27):** la tercera capa, para el objeto **protagonista** con cuerpo. **Sí:**
  portada (de deck, informe o perfil), key visual, pieza social con un solo objeto, escenario (pantalla de evento,
  stand), merch, el objeto en escena. **No:** contenido de deck (columnas, filas de servicios), listas, tablas,
  navegación, dashboards, UI, firmas de correo; ahí van el plano o el Trazo. Uno por pieza, desde 160 px, nunca en un
  grupo con el plano o el Trazo. Se usa el PNG aprobado (`volumeIconUrl(glyph)`), nunca se regenera. Tarjeta en A10.

---

## A. Pantalla y redes

### A1. Post 4:5 con lente (redes)

- **Para qué:** la pieza social de campaña o de marca con una foto del oficio; la lente dice dónde está la decisión.
- **Lienzo:** 1080 × 1350, vertical.
- **Va:** foto en lente (fuera del círculo en navy apagado, dentro a color y ampliada) · órbita alrededor de la lente,
  con aire (anillo, arco corto y esfera arriba a la izquierda) · pregunta chica con anillo + respuesta grande con su
  esfera · firma: logo de Efeonce centrado abajo.
- **Nunca:** eslogan (la respuesta ya cierra) · segunda órbita · velo navy sobre la foto · órbita sobre la cara o el
  gesto · texto sobre el anillo · emblema legible en la ropa (el logo lo pone la pieza).
- **Espacio:** la lente arriba al centro; el texto **debajo** de la órbita (layout `upper-center` / `text: below`). Pieza
  medida (T `pieces.lens.post`): anillo cx 548, cy 600, r 263,2; arco 200°–250°; esfera r 7,62. La variante de campaña
  (`campaign-post`) lleva una lente más grande y más alta: anillo cx 540, cy 500, r 384, arco 195°–250°, esfera r 8,33.
  Cuerpos de texto de la receta: pregunta 38 px, respuesta 140 px (se reduce sola si no cabe en la columna). Grilla
  genérica sin lente (L 5.1): órbita cx 640, cy 500, r 324; zona de texto y 900–1254 (tercio inferior); margen 96 px.
- **Color y superficie:** oscuro de la línea (`#001A33` en Efeonce, `#091951` en productos) con el acento de la línea.
- **Cómo se produce:** `lensRecipe('post' | 'campaign-post', { photoId, photoSrc, alt, question, answer, line })` +
  `recipeHtml(...)`. La foto sale del banco de la lente (L 5.2) o se genera con `pnpm foto:prompt` →
  `pnpm foto:generar <ficha>` → `pnpm foto:validar`, cumpliendo las reglas de la toma: el sujeto cabe en el círculo
  que la lente **muestra de verdad** en ese formato (el 55 % se mide sobre el círculo visible de la lente, no sobre el
  plate: se ajusta la toma, no la pieza; D10 P-3), un solo punto de interés, y una palanca que concentre, nunca una que
  llene el cuadro (D10 P-9). Detalle en `photography-convergence.md`.
- **Errores comunes:** foto sin punto de interés claro («se nota el truco», L 1.3) · esfera suelta sin arco (el token
  `lens.accentSphereDiameterRatio` está retirado: usar `lens.anatomy`) · respuesta de más de tres palabras (la receta
  lanza error).
- **Fuente:** L 1.3, L 4.1, L 4.2, L 5.1, L 5.2; T `pieces.lens`, `lens.anatomy`.

### A2. Post 4:5 o 1:1 sin foto (sólo voz)

- **Para qué:** una pregunta y su respuesta, cuando no hay foto que enfocar.
- **Lienzo:** 1080 × 1350 (4:5). El 1:1 (1080 × 1080) no tiene lámina propia: se toma de la matriz de formatos de ads
  y del video de la órbita (formatos 16:9, 1:1, 4:5, 9:16); la grilla 1:1 es **inferido** (mismo margen del 9 %, radio
  30 % del ancho).
- **Va:** pregunta chica con anillo + respuesta grande (≥ 3× la pregunta) con su esfera · evidencia en Poppins si
  existe · firma centrada abajo. Órbita **sólo si hace un trabajo** (rodear la respuesta o medir un dato).
- **Nunca:** órbita decorativa · arco de avance sin dato · eslogan.
- **Espacio:** grilla L 5.1: órbita arriba a la derecha (cx 640, cy 500, r 324 en 4:5), texto en el tercio inferior
  izquierdo, nunca cruzando el anillo.
- **Cómo se produce:** `composeGraphicLine(intent)` con los elementos que correspondan (voz, órbita, firma); en
  Greenhouse, `pnpm creative:layout` con el modo `graphic_line`, o `pnpm creative:orbit:resolve` / `render`.
- **Fuente:** L 4.1, L 5.1, L 5.6; M §4.

### A3. Story 9:16

- **Para qué:** la misma idea del post en vertical completo.
- **Lienzo:** 1080 × 1920.
- **Va:** lente con órbita (o foco) · pregunta + respuesta debajo · firma centrada.
- **Nunca:** texto, CTA o firma dentro de las zonas que tapa la interfaz de la red.
- **Espacio:** pieza medida (T `pieces.lens.story`): anillo cx 420, cy 760, r 358,4; pregunta 42 px, respuesta 160 px.
  Grilla L 5.1: **franjas de interfaz rayadas arriba (0–250 px) y abajo (1580–1920 px)**; zona de texto y 1300–1580.
  Para anuncios pagados manda además el perfil conservador de ads (reserva 16 % arriba, 35 % abajo, 8 % izquierda y
  12 % derecha, `meta-fullscreen-conservative-v1`), que es más estricto que la lámina.
- **Cómo se produce:** `lensRecipe('story', …)`; con foto propia, `foto:*` como en A1.
- **Errores comunes:** respetar sólo el origen Y del texto y no la caja completa; asumir que un 9:16 aprobado valida el
  4:5 (cada ratio se revisa por separado).
- **Fuente:** L 1.3, L 4.1, L 5.1; T `pieces.lens.story`; `EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md` §Zonas seguras.

### A4. Carrusel

- **No existe lámina ni regla aprobada.** Lo más cercano: cada lámina del carrusel es un post 4:5 (A1/A2) y vale «una
  órbita por pieza». Usar la órbita como navegación del carrusel (el arco que suma su tramo, como el deck) sería una
  extensión **inferida** de B1, no aprobada: consultar al operador antes de producirlo y registrar la decisión.

### A5. Imagen de LinkedIn 1200 × 627 (post con enlace o de campaña)

- **Para qué:** pieza horizontal de campaña en LinkedIn.
- **Lienzo:** 1200 × 627, horizontal.
- **Va:** lente a la derecha con su órbita · a la izquierda, pregunta + respuesta + una línea de apoyo (prueba).
- **Nunca:** firma dentro de la lente; la receta no la agrega (`signature: false`).
- **Espacio:** pieza medida (T `pieces.lens.linkedin`): anillo cx 860, cy 280, r 246; arco 195°–250°; esfera r 5,25;
  pregunta 24 px, respuesta 76 px; texto a la izquierda del anillo (`text: start`).
- **Cómo se produce:** `lensRecipe('linkedin', { …, proof })` (ej. del Lab: «¿Cómo va tu campaña? En vivo. Entra a tu
  operación cuando quieras.»).
- **La foto:** en formato nativo 1200×627, **nunca recortada de un 16:9** (D10 P-6). `foto:prompt` todavía no genera
  ese formato: queda en la task «foto:prompt y chequeos de la lente» (sin ID); hasta entonces, esta pieza no tiene
  camino fotográfico canónico.
- **Fuente:** L 4.2; R `lensRecipe`.

### A6. Banner / portada de perfil de LinkedIn 1584 × 396

- **Para qué:** portada de la página o del perfil (el tamaño 1584 × 396 es el de portada; la lámina lo llama «Banner
  de LinkedIn»; que sea la portada de perfil es **inferido** por el tamaño).
- **Va:** respuesta-promesa grande con su esfera («Te hacemos visible.») + una línea de mecanismo en Poppins («Crecimiento
  medido: marca, búsqueda y medios.») a la izquierda · órbita a la derecha con halo.
- **Nunca:** «visible» sin su mecanismo al lado (L 1.4) · órbita interior: un solo anillo (D6) · **el logo dentro de la
  órbita** (D5; la lámina lo pone adentro y eso no se reproduce).
- **Espacio:** en la lámina, texto desde x 80 px; órbita cx 1250, cy 198, r 150 (≈ 38 % del alto). En el Lab (AXIS
  0.3.5) la portada quedó **sin logo**: el avatar de la página ya lleva la marca justo debajo. Es una propuesta de
  implementación, no una decisión del operador: si la portada debe llevar logo, va fuera de la órbita con su
  resguardo (consultar dónde). La zona que tapa la foto de perfil (abajo a la izquierda) no está marcada en la lámina:
  dejarla libre es **inferido**; verificar en la vista real.
- **Cómo se produce:** no hay receta: se compone con `composeGraphicLine` tomando la lámina como referencia.
- **Fuente:** L 4.1; L 1.4.
- **Superada el 2026-10-01 para los perfiles de Efeonce:** las portadas aprobadas (página y perfil personal, con
  medidas, logo y zonas seguras verificadas) están en **A11**; «Te hacemos visible.» quedó objetada como portada.
  Esta tarjeta queda como antecedente de la lámina 4.1.

### A7. Avatar e ícono

- **Va:** el **isotipo** en negativo sobre un círculo navy, ocupando el **60 % del ancho**; ícono de app o favicon en
  cuadrado redondeado con el mismo margen.
- **Nunca:** otra órbita alrededor del isotipo (ya es una órbita) · recolorearlo · recortarlo con un círculo que lo
  corta · logo completo en un avatar.
- **Tamaño mínimo:** isotipo 24 px en pantalla; a 16 px el favicon se valida aparte.
- **Fuente:** L 3.3, L 5.5; M §8.4.
- **Avatar de redes (2026-10-01):** el canónico de LinkedIn, Instagram, Facebook y YouTube va sobre el oscuro
  Efeonce con el halo de la órbita, sin anillo ni arco; ficha en **A11**.

### A8. Anuncios con CTA (paid media, con foto de marca)

- **Para qué:** ads orientados a una acción.
- **Lienzo:** matriz por defecto de cada key visual: **4:5 (1080×1350), 1:1 (1080×1080), 9:16 (1080×1920) y 16:9
  (1920×1080)**; un brief sólo la reduce explícitamente.
- **Va:** las tres voces (Bricolage instala la idea, Poppins estructura, Guttery gesto opcional) + el grupo de acción
  (beneficio → CTA en Poppins → descriptor) · firma: logo centrado abajo, **20 % del lado corto** (vertical y cuadrado) o
  **25 %** (16:9 nuevo), contraste ≥ 4,5:1 medido · la burbuja URL en vez del logo sólo con `marcaEnEscena: true`.
- **Órbita:** **no por defecto.** La composición la manda el lenguaje fotográfico; la órbita se suma sólo declarada y
  haciendo uno de sus trabajos, sin cruzar sujeto, reservas, lecho ni firma (M §1.3, §9).
- **Nunca:** burbuja URL y logo a la vez · la burbuja a un costado · scrim para rescatar contraste · CTA que ocupe la
  reserva de marca.
- **Espacio:** firma cerrando al pie (franja editorial y 78–87 % de esa ejecución; **no** es una zona segura universal);
  zonas de interfaz por placement (ver A3).
- **Cómo se produce:** `pnpm foto:componer:cta <plan>` (y `--variantes` para ver texto/contorno/relleno lado a lado);
  gate `pnpm foto:cta:gate`. Voces y contrato de tipografía: skill `efeonce-advertising-creative`.
- **Fuente:** `EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md` (formatos, firma, zonas seguras); M §8.5; T `signature`.

### A9. Pieza con un objeto de Plastilina protagonista (órbita sesgada)

- **Para qué:** piezas del oficio creativo (línea Brand): un objeto que se crea (pincel, cámara, micrófono…) como
  protagonista. Es la firma de Plastilina (D20).
- **Va:** el objeto de Plastilina en **reposo** dentro de su **órbita sesgada** (elipse inclinada, pasa por detrás
  arriba y por delante abajo); la esfera la pone la órbita, fuera del objeto. La voz vive fuera, en el tercio inferior.
  Firma según §0.
- **Espacio:** objeto de al menos 320 px a 1080 de ancho; una órbita sesgada por pieza; nunca cruza el texto.
- **Nunca:** que la órbita sesgada mida un dato (lo que mide va en la órbita circular) · otra esfera en la pieza · el
  objeto en respuesta dentro de la órbita · el acento en el cuerpo o el gesto.
- **Cómo se produce:** `skewedOrbitHeroSvg({ glyph, line, surface, width, height, object, gesture?, label? })` de
  `@efeoncepro/axis-graphic-line/icons`.
- **Fuente:** guía de iconografía de AXIS §«La órbita sesgada»; T `icons.skewedOrbit`; decisión D20.

### A10. Pieza con un objeto de Plastilina en volumen (D24)

- **Para qué:** el momento en que el objeto es la pieza y conviene que tenga cuerpo: portada, key visual, pieza social
  con un solo objeto, escenario, merch, el objeto en escena.
- **Va:** **un** glifo de Plastilina en volumen (PNG con alfa, en respuesta, con el acento de Brand y el gesto donde
  existe) sobre el fondo que pida la pieza; la voz y la firma según §0.
- **Espacio:** desde 160 px; más chico, el plano.
- **Nunca:** dos objetos en volumen en la pieza · el volumen en listas, tablas, navegación, contenido de deck,
  dashboards o UI · en un grupo con Plastilina plana o con el Trazo · un objeto que no está en el set plano generado
  directo en 3D · regenerar el objeto en la pieza · mezclarlo con las ilustraciones «Clay 3D» del equipo · piezas de
  clientes o la UI del producto Greenhouse.
- **Color y superficie:** el PNG va sobre cualquier fondo (alfa con los calados abiertos). No trae sombra de contacto:
  si la pieza la necesita, se agrega al componer.
- **Cómo se produce:** `volumeIconUrl(glyph)` de `@efeoncepro/axis-brand-assets` 0.3.2 (publicado con el tag
  `v0.3.7`; Greenhouse ya fija esa versión, commit `f3f93c926`, 2026-09-27). El Lab `/references/iconography/#volumen` sigue sirviendo para
  descargar el PNG a mano. Un glifo nuevo: primero al set plano, luego
  `pnpm icons:volume` en AXIS (ver `iconography.md` §12).
- **Errores comunes:** usarlo como ícono de fila «porque se ve mejor» · agrandar un volumen a partir del plano en la
  pieza · un volumen bajo 160 px.
- **Fuente:** guía de iconografía de AXIS §«Plastilina en volumen»; T `icons.volume`; decisión D24.

### A11. Perfiles sociales de Efeonce: portadas, avatar y destacados de Instagram (aprobado 2026-10-01)

- **En AXIS:** Lab [`/references/social-profiles/`](https://axis.efeonce.org/references/social-profiles/) y su JSON [`social-profiles.json`](https://axis.efeonce.org/references/social-profiles.json) (51 piezas con URL y SHA-256, masters en `gs://efeonce-group-axis-public-media/social-profiles/v1/`); sin token: las medidas son de cada plataforma.
- **Para qué:** la cara de Efeonce en sus redes —portadas de la página de LinkedIn, de Facebook y de YouTube, el avatar,
  los destacados de Instagram— y la portada de LinkedIn que cada persona del equipo puede usar en su perfil. El
  operador lo declaró parte del universo gráfico de Efeonce («ya forma parte del universo gráfico de Efeonce»). Para
  estas superficies reemplaza A6 y A7.
- **Piezas y lienzos** (medidas y zonas seguras verificadas en la sesión; las de cada red cambian: reverificar antes
  de una pieza nueva):

  | Pieza | Lienzo | Variantes | Lo que tapa o recorta la red |
  |---|---|---|---|
  | LinkedIn, página de empresa | 1128 × 191 | 8 | el logo de la página tapa la esquina inferior izquierda |
  | LinkedIn, perfil personal (equipo) | 1584 × 396 | 8 | la foto de perfil, abajo a la izquierda: ≈ 3–22 % del ancho en escritorio y hasta ≈ 29 % en el celular |
  | Facebook | se sube 1640 × 624 | 8 | escritorio 820 × 312; el celular (640 × 360) recorta los costados: franja segura central de 1110 px; la foto de perfil va abajo a la izquierda y el texto termina antes |
  | YouTube | 2560 × 1440, ≤ 6 MB | 8 | mínimo 2048 × 1152; zona segura 1235 × 338 sobre el mínimo (≈ 1546 × 423 a 2560: x 508–2052, y 509–931); en escritorio se ve la franja 2560 × 423: la cara de Nexa centrada en y ≈ 690 |
  | Avatar de redes | 1080 × 1080 | 1 | un solo archivo para LinkedIn, Instagram, Facebook y YouTube |
  | Destacado de Instagram, portada | 1080 × 1920 con el cuadro aprobado al centro (`v01`) | 9 | sirve para **cambiar** la portada de un destacado que ya existe |
  | Destacado de Instagram, historia completa | 1080 × 1920, escena completa (`v02`) | 9 | sirve para **crear** el destacado |

- **Las ocho portadas** son 2 mensajes × 4 fotos cine de Nexa:
  - «¿Cuántos formatos? **Todos.**» — línea Growth (`#36c8bf`); fotos `PS1b` (base; «Esa de Nexa queda»), `PS7b`
    (desliza), `PS6` (estallido) y `PS8` (mosaico).
  - «¿Entre cientos de marcas, a quién cita la IA? **A ti.**» — línea Engine (`#0375db`); fotos `PS2c` (base, la
    tarjeta repintada como horizontal), `PS3` (elige), `PS5` (pasillo) y `PS4` (respuesta).
- **Va:** la voz de la línea —pregunta en Poppins 300 con el anillo del acento, respuesta en Bricolage 760 con su
  esfera, al menos 3× la pregunta— sobre el oscuro `#001a33`, y la foto cine de Nexa. **La portada lleva una idea
  propia**, no un par del catálogo ([criteria.md](criteria.md) §4).
- **Logo:**
  - **Página de Efeonce:** abajo; centrado si el centro queda libre, si no (las ocho aprobadas) bajo la columna de
    texto. Anchos reales: Facebook 156 px (25 % del lado corto de 624), YouTube 200 px dentro de la zona segura,
    LinkedIn de la página 96 px.
  - **Perfil personal:** pequeño (120 px), bajo el texto y fuera de la órbita.
  - Nunca dentro de la órbita (§0.2).
- **Registro cine con Nexa protagonista:** aprobado en estas portadas y en los destacados (amplía el §2 del
  [registro cine](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) para estas
  superficies). No alcanza a piezas sociales con personas del equipo. Fotografía: skill `design-studio`,
  `efeonce-photographic-language.md` §«Cine · La marca en su película».
- **Avatar de redes:** el isotipo de Efeonce en negativo al 60 % del ancho sobre `#001a33`, con el halo de la órbita
  (paradas del token), **sin anillo ni arco** («Y sobre el avatar ok, es el que mejor ves? Si es así Ok»).
- **Destacados de Instagram** («Aprobadas todas.»): **mezcla de recursos, no nueve tomas iguales** (ojo, Nexa,
  objetos del oficio, cada uno con su escena; [criteria.md](criteria.md) §7):
  01 Glitch (el ojo de Nexa con la manzana de Glitch en bytes; sub-línea Glitch, [glitch.md](glitch.md)) · 02 AEO
  (Nexa con la tarjeta que eligió la IA) · 03 Creatividad a escala (Nexa con una órbita de pantallas) · 04 Portafolio
  (abanico de piezas bajo un foco) · 05 Studio (Run & Gun, detrás de cámara filmando a Nexa) · 06 Agents (tres Sparks,
  los mini bots de Nexa) · 07 Podcast (micrófono macro con onda de luz) · 08 Recetas (mise en place de chef con luz,
  pigmento y fotogramas: IA generativa) · 09 Behind the build (manos construyendo una interfaz sobre un plano). Un
  color de luz por destacada sobre oscuro; **sin firma en el círculo** (a ese tamaño no se lee: la marca la pone el
  avatar). **06 Agents** se aprobó con robots genéricos descritos a mano (`PH7`), anteriores al diseño de los Sparks:
  los Sparks oficiales son los del kit ([`SPARKS_V1.md`](../../../../docs/operations/brand-characters/SPARKS_V1.md),
  TASK-1941). **Decisión del operador (2026-10-02): la destacada «Agents» aprobada se queda** (sin Nexa ni texto en el
  círculo); un destacado con Nexa usa otro nombre y otra destacada. Sus robots no se copian como receta.
- **Cómo funciona un destacado** (operador, 2026-10-01): para **cambiar** la portada de un destacado existente basta la
  imagen de portada; para **crearlo** hay que publicar primero una historia 9:16 **completa** y agregarla. Instagram
  toma la portada del **círculo central** (franja y 420–1500 de 1920). Una historia con bandas lisas arriba y abajo no
  sirve. Zonas calmas: arriba ≈ 14 % y abajo ≈ 20 % (nombre de la cuenta y barra de respuesta).
- **Historia completa desde la portada aprobada:** se extiende la foto aprobada a 9:16 y se repone el cuadro aprobado
  por el borde del círculo, nunca por una línea recta; dentro del radio 488 px los píxeles son los aprobados, byte a
  byte (verificado en las 9). Receta: skill `design-studio`, `efeonce-photographic-language.md` §«Extender una foto
  aprobada a 9:16 conservando el centro»; trampas en [lessons.md](lessons.md) (2026-10-01).
- **Portada de LinkedIn personal, derivada de la corporativa:** 1584 × 396; el texto empieza en x 480 (deja libre la
  foto de perfil); pregunta 32 px, respuesta 120–124 px y logo de 120 px **pegado bajo el mensaje**, fuera de la órbita;
  la foto a 1300 px de ancho, sin recortar arriba, con la cara de Nexa en x ≈ 1190 (1130–1140 en las dos AEO con
  burbuja) y los huecos llenos **reflejando su propio borde**. Ajuste del operador al verla en su perfil (2026-10-01):
  Nexa no puede quedar pegada al borde ni con la mano cortada, y el logo no flota lejos del texto.
- **Nitidez de un destacado blando:** una edición con GPT Image que pide sólo detalle y conserva la composición
  funcionó (Glitch, Portafolio, Recetas). En Portafolio y Recetas el modelo metió personas ajenas al roster: se
  sacaron con recorte. **Nunca** personas fuera del roster en una foto de marca.
- **Cómo se produce:** fichas `foto:*` y plates de la corrida; composición en el canvas de Claude Design (las fuentes
  se suben como asset `/_blob/`); render final desde un HTML local con Playwright abierto como archivo
  (`page.goto('file://…')`) tras `document.fonts.ready`. Las personales salen de
  `personal/linkedin-personal.mjs`.
- **Nunca:** un par del catálogo como portada social («¿Qué hace Efeonce? Crecer.» se rechazó: «Really? WTF?»; «Te
  hacemos visible.» ya estaba objetada) · el logo dentro de la órbita · nueve destacados con la misma toma, o íconos
  planos («eso lo podría hacer mi hija de 10 años») · firma dentro del círculo del destacado · una historia con bandas
  lisas para crear un destacado · personas fuera del roster · un fondo plano o un fundido para llenar el hueco al
  correr la foto.
- **Dónde está:**
  - Canvas [«Portadas sociales Efeonce»](https://claude.ai/artifact/THt6cp3Pc2njxN7Takevuu) (páginas mezcla, híbrido,
    ojos, punch, linkedin, avatar, destacados, conceptos, variaciones, ronda-1); sistema de diseño en Claude
    [«Efeonce — La órbita»](https://claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc) (namespace `EfeonceOrbit`).
  - Repo: `ai-generations/2026-09-30_portadas-sociales/` → `fichas/` (PS*, PX*, PH*), `plates/`, `nitidez/`,
    `finales/{linkedin,linkedin-personal,facebook,youtube,avatar,destacados-instagram,historias-destacados}/`,
    `historias/` (bases, máscaras, extensiones), `personal/linkedin-personal.mjs` y `personal/avisos-linkedin-1a1.ts`
    (scripts en git; los binarios, con `pnpm ai-gen:pull ai-generations/2026-09-30_portadas-sociales` si faltan).
  - Kit del equipo: sección «Tu portada de LinkedIn» (`#linkedin`) con las 8 personales en la página de cada persona
    (`https://storage.googleapis.com/efeonce-group-axis-public-media/team/kit/<nombre-apellido>.html`; generador
    `ai-generations/2026-09-29_avatares-equipo/kit/paginas-kit.mjs`, en git; sus insumos, con `pnpm ai-gen:pull`). Archivos:
    `gs://efeonce-group-axis-public-media/team/linkedin-covers/v2/efeonce-linkedin-perfil-<id>-1584x396.png` (+
    `min/…jpg` 792 × 198); ids `formatos`, `formatos-desliza`, `formatos-estallido`, `formatos-mosaico`, `aeo`,
    `aeo-elige`, `aeo-pasillo`, `aeo-respuesta`.
  - OneDrive (`Alineación/`): `5. Contenidos/05. Highlights/2026-10 Destacados La órbita/` (`v01` portadas, para
    cambiar; `v02` historias completas, para crear; LEEME y manifiesto SHA-256) ·
    `5. Contenidos/13- Branding/Redes sociales Efeonce/2026-10 La órbita/v01/{LinkedIn,Facebook,YouTube,Avatar,LinkedIn perfil personal}/`
    · `6. Marca/Kit media/Portadas de LinkedIn/2026-10 La órbita/` (las 8 personales).
- **Estado:** aprobado y entregado. Aviso 1:1 por TeamBot a Andrés, Daniela, Melkin, Humberly y Valentina el
  2026-10-01 (identidad confirmada en Entra antes de cada envío; los cinco ok). **Pendiente, del operador:** publicar
  en cada red del perfil de Efeonce y crear los destacados en Instagram; las historias de adentro de cada destacado
  (más allá de la de portada).
- **Fuente:** [ledger.md](ledger.md), filas 2026-10-01, (b), (c) y (d).

### A12. Escenario del login de Greenhouse (TASK-1964, 2026-10-02 — excepción en curso)

- **Estado:** dirección V4 aprobada por el operador el 2026-10-02 e implementada en local (TASK-1964 en curso). Es la
  **primera pantalla del producto Greenhouse con La órbita**, contra el alcance escrito de esta skill («No: la interfaz
  del producto Greenhouse»): **riesgo abierto**, no regla nueva. Falta la decisión del operador y su canon en AXIS
  ([ledger.md](ledger.md), Pendientes). No se extiende a otra pantalla del producto.
- **Para qué:** la primera impresión del producto. Formulario sobre papel con Efeonce como marca principal y un
  escenario fotográfico con la **Lente**, donde rota un carrusel de novedades.
- **Va:** la Lente (sólo en una foto que no traiga su propia órbita), la voz de la novedad (anillo pequeño delante del
  kicker, esfera como punto del titular) y la mini órbita del botón y del `OrbitLoader` post-login (motion de la task).
- **La Lente, al canon de AXIS** (`LoginLens.tsx`, valores desde `efeonceGraphicLine`, nunca transcritos):
  - anillo **con aire**: a 1,12 × el radio de la foto (`1 + orbit.ringAirRatio`);
  - la foto de adentro **ampliada × `lens.zoom`** (1,25), a color, no saturada; afuera, `lens.outside` (gris,
    contraste, brillo y multiplicado con el fondo Efeonce), que es la reserva del texto;
  - trazos y esfera **× ancho/794** (`orbitWidthScale`, base `orbit.baseWidthPx`), con los pisos
    `orbit.arcStrokePx[0]` y `orbit.sphereRadiusPx[0]` en lienzos chicos;
  - arco de **50°** (`lens.anatomy.arcSweepDeg`) centrado en `upper-start`, con la esfera en su punta, en el
    **acento de la línea de servicio** de la novedad (`lineAccentOnDark`; sin línea, Growth).
- **Encuadre de la foto:** `object-fit: cover` corre la lente del sujeto según la proporción; `object-position: x% y%`
  con el mismo `lens.x`/`lens.y` hace que el punto de la foto y el del escenario coincidan en cualquier ancho.
- **Fotos del escenario:** `LG1` (Nexa, cine) y `LG2e` (directora de casting, cine) van **sin lente**, porque su luz ya
  es la órbita de la pieza (una órbita por pieza; el operador lo aceptó); `LG3e` (registro B) lleva la lente. El cine
  en superficies de producto es el caso 6 del registro (`alcance: "producto"`, operador 2026-10-03; antes, excepción del login). Fotos y fichas:
  `ai-generations/2026-10-02_login-escenario/`; las fotos de referencia se reemplazan antes de producción (task).
- **Voz:** anillo y esfera en el acento («El ring y la esfera faltan como manda /efeonce-graphic-line»). La esfera se
  calcula como `answerSphere` de AXIS, replicada desde el token en `orbit-geometry.ts` porque el paquete raíz
  `@efeoncepro/axis-graphic-line` arrastra el pintor y los íconos al bundle del cliente. **Pendiente:** respuesta de
  1–3 palabras y kicker como etiqueta, no como pregunta ([criteria.md](criteria.md) §4).
- **Nunca:** extender la línea a otra pantalla del producto mientras siga abierto el riesgo · un arco con
  `non-scaling-stroke` + `pathLength`/`stroke-dasharray` (Chrome lo parte en dos tramos: [lessons.md](lessons.md),
  2026-10-02) · lente sobre una foto que ya trae su órbita · valores de la lente escritos a mano.
- **Fuente:** [ledger.md](ledger.md), 2026-10-02 (b); `docs/tasks/in-progress/TASK-1964-login-v4-premium-access-transition.md`.

---

### A13. Efeonce Rooms — design system de producto (2026-10-07)

- **Autoridad:** decisión explícita del operador; La órbita es el design system de Rooms, AXIS su distribución técnica.
- **Superficies:** entrada, gestión de salas, editor, exploración, consola del champion, audiencia y evaluación; [dossier](../../../../docs/architecture/rooms/README.md), [EPIC-052](../../../../docs/epics/to-do/EPIC-052-efeonce-rooms-sales-enablement-platform.md).
- **Tipografía:** Bricolage editorial, Poppins funcional desde los roles de `efeonceGraphicLine.type`; ninguna base Geist ni Poppins para todos los títulos. Cada rol conserva peso/escala de su contrato.
- **Composición:** escenario editorial dentro de La órbita; papel/navy, acentos y componentes canónicos; órbita con intención, iconos del catálogo, sin volumen en UI. No imponer el formato pregunta/respuesta al relato.
- **Marca/cliente:** usar assets oficiales de Efeonce; logo Rooms todavía sin diseñar/aprobar. No modificar arte cliente ni sus fuentes. No añadir una firma gráfica a cada control como si fuera un anuncio.
- **Producción y motion:** adapter nativo Rooms sobre packages, no copia de Lab; `efeonceGraphicLine.motion` para marca y `axisMotion`/contrato del componente para interacción. Pins, mappings y píxeles se validan al implementar.
- **Estado/QA:** decisión de sistema aceptada; composición, runtime, GVC, fuente efectiva, accesibilidad y go final pendientes. Ningún cambio automático al theme de Greenhouse.

## B. Presentaciones e informes

### B1. Deck 16:9 (portada, sección, contenido, cierre)

- **Para qué:** cualquier presentación de marca Efeonce. **La órbita es la navegación**: el arco suma un tramo por
  sección y el cierre la completa con la esfera arriba.
- **Lienzo:** 1920 × 1080, margen 140 px.
- **Por lámina** (T `pieces.deck`, R `deckSlideHtml`):

| Lámina | Superficie | Elementos | Órbita |
|---|---|---|---|
| **Portada** | oscuro | logo arriba a la izquierda (230 px) con el antetítulo al lado; pregunta y respuesta en la mitad inferior | arco corto de acento a la derecha: anillo cx 1500, cy 380, r 340, 16 %; arco 200°–250° |
| **Sección** | papel | número de sección grande **dentro** del anillo y «Sección n de N» debajo; pregunta y respuesta a la izquierda | el arco suma su tramo desde las 12: anillo cx 1420, cy 540, r 300 |
| **Contenido** | papel | antetítulo, pregunta, respuesta; hasta **tres cifras reales** en columnas con su contexto; nota al pie (fuente o «datos de muestra») | **indicador chico de 80 px en la esquina** (cx 1760, cy 130, r 40): sólo marca «3 de 5» |
| **Cierre** | oscuro | la órbita completa con la esfera arriba y el logo dentro, con su resguardo (cierre de marca, §0.2); pregunta, respuesta y eslogan centrados debajo, con **la palabra final en el acento de la línea** (D3; axis-graphic-line 0.3.2) | anillo cx 960, cy 330, r 200 |

- **Nunca:** el arco como decoración (mide la navegación real) · eslogan fuera del cierre · pie con dirección y
  teléfonos: en decks el pie lleva **como máximo la burbuja URL** (excepción aprobada sólo para el deck de Insights,
  ver B3).
- **Cómo se produce:** `deckSlideHtml('cover' | 'section' | 'content' | 'close', { sections, current, question, answer,
  eyebrow?, stats?, note?, line })`. El render verifica que ningún texto cruce la órbita en portada y sección.
- **Errores comunes:** cifras inventadas en la lámina de contenido (usar la nota «datos de muestra») · poner la órbita
  grande en contenido (ahí es un indicador de 80 px).
- **Íconos:** la voz de la línea del deck (Trazo en Growth, Engine y Revenue), en fila según §0.3. Si la lámina ya
  tiene esfera —el indicador de 80 px o una respuesta que cierra con su esfera—, los íconos descansan
  (`auditIconGroup(items, { pieceHasSphere: true })`).
- **Fuente:** L 4.1, L 4.2; M §10.1; `EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md` §Identidad y pie.
- **Delta (operador, 2026-09-27) — brochure y propuesta comercial:** la portada y el cierre de esta tabla (logo de 230
  y 220 px) quedaron **retirados** como portada y contraportada de esos documentos; el logo va a 500 px en 1920 y el
  set aprobado (portadas con foto o de órbita gigante, contraportadas por documento) está en §L, «Portadas y
  contraportadas».
- **Delta (operador, 2026-09-27) — las 69 láminas:** todo el canvas «Deck» quedó aprobado y cada lámina tiene su
  receta (cuándo sí, cuándo no, alternativa, pares, slots, foto, prompt) en
  `docs/operations/brand-graphic-line/deck-recipes/`. Esta tarjeta sigue describiendo las cuatro láminas medidas de
  `deckSlideHtml`; para elegir una lámina concreta, usa el catálogo (§L, «Recetas por lámina»).
- **Delta (operador, 2026-09-28) — nueve láminas SEO/AEO:** el catálogo pasa a 78 recetas, todas con plantilla (§L,
  «Láminas SEO/AEO con plantilla desde TASK-1934»).

### B2. Portada de deck con lente (foto)

- **Lienzo:** 1920 × 1080. **Va:** la lente a la derecha, pregunta 34 px y respuesta 96 px a la izquierda; sin firma en
  la receta (el logo va en el sistema del deck). Pieza medida: anillo cx 1420, cy 600, r 403,2.
- **Cómo se produce:** `lensRecipe('deck-cover', …)`. **Fuente:** L 1.3; T `pieces.lens['deck-cover']`.

### B3. Informe A4 (Efeonce Insights y otros informes)

- **Para qué:** informe mensual y documentos de lectura autónoma.
- **Lienzo:** A4 (794 × 1123 en px de pantalla; 210 × 297 mm). La base de medida de toda la órbita son estos 794 px.
- **Estado:** la portada del informe de Insights ya lleva la órbita en producción
  (`src/lib/artifact-composer/catalogs/insights-report/report-cover.html`, `report-cover-light.html`,
  `report-back-cover.html`). Las láminas **L 7.1 y L 7.2 son una prueba**: «el producto no cambia hasta decidirlo»; si
  se aprueba, el cambio vive en las plantillas del catálogo de Insights y pasa por su gate visual.
- **Va (propuesta L 7.1–7.2):** títulos como respuesta (pregunta Poppins Light con anillo + respuesta Bricolage con su
  esfera) · arco de avance sólo donde mide algo real (la navegación del informe, «2 de 5», o el dato de la página:
  62 % → la esfera a 62 % del círculo) · en las figuras, **el último punto de la serie es la esfera con su halo** · el
  plan marca el estado con la forma (esfera = decidido, anillo = abierto), acompañando al texto · la contraportada
  completa la órbita con la esfera arriba y **el logo fuera de la órbita**.
- **Nunca:** navy como acento sobre papel (impreso se lee negro) · teal claro en papel · arco decorativo · cambiar la
  grilla A4 o el pie.
- **Íconos:** Trazo en papel (tinta navy, acento claro de la línea sólo en la esfera), en reposo en listas y tablas;
  responde uno solo y sólo en una página sin otra esfera (§0.3). El teal claro nunca va sobre papel.
- **Espacio (L 5.1):** margen 68 px; órbita cx 520, cy 376, r 236 (≈ 30 % del ancho); zona de texto y 720–1055.
- **Pie:** las páginas de contenido llevan pie completo (logo, edición, dirección, teléfono, **burbuja URL** y folio
  «NN / total»); las aperturas de capítulo navy, pie reducido; las portadas, sin pie institucional; la contraportada,
  navy con logo y eslogan al centro y el contacto desde `src/config/efeonce-brand.ts`.
- **Cómo se produce:** catálogos del Artifact Composer (`src/lib/artifact-composer/catalogs/insights-report/`), render
  en el `artifact-worker`; informes que no son Insights, skill `report-studio`.
- **Fuente:** L 5.1, L 7.1, L 7.2; M §1.3; `EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md` (Delta 2026-09-25).

### B3b. Marca de producto de Efeonce Insights — dónde se aplica (2026-09-28)

La marca («insights» con la órbita mínima en el punto de la «i»; criterio en [criteria.md](criteria.md), «Insights,
marca de producto que acompaña») acompaña a Efeonce y **nunca firma**: junto al logo de Efeonce se usa el archivo
`insights-lockup-*` (Insights en gris, sólo la esfera en el acento), nunca los dos logos armados a mano.

| Superficie | ¿Lleva la marca? | Qué hay hoy | Dónde |
|---|---|---|---|
| Informe live en Think (`/insights/r/<token>`, muestra `/insights/muestra`) | **sí** | lockup **negativo** en el hero oscuro (31,5 px; 24 px en móvil, el menor en producción) y en la portada del modo presentación (40 px, dentro de `.ins-present.ins-dark`); **positivo sólo al imprimir** (intercambio `.ins-screen-only` / `.ins-print-only`); la barra fija superior no lleva marca, sólo la órbita de progreso; la lámina de cierre de la presentación y el pie firman con el logo de Efeonce + eslogan (Insights nunca firma); las pantallas de estado 404/410/429/502 muestran el logo de Efeonce, no la marca de Insights | `efeonce-think/src/components/insights/InsightReport.astro`, `src/styles/insights.css`, `src/components/primitives/StatusScreen.astro`; archivos en `public/branding/insights/` (copias manuales: 5 de los 6 SVG, falta `insights-isotype-positive`; en código sólo se usan los dos lockups) |
| Imagen OG de Think | **sí** | `og-insights.png`, 1200 × 630: copia del lockup negativo a 520 px de ancho + una órbita de acento, sin datos de ningún informe. **Regenerarla cada vez que cambie el lockup** | `efeonce-think/scripts/build-insights-og.mjs` |
| PDF A4 (`insights-report`) | **versión tipográfica** | portadas navy y clara (bloque navy): logo de Efeonce 32 px + aire 16 + filete 1 × 24 al 26 % + «INSIGHTS» en mayúsculas espaciadas (`uppercase` + `letter-spacing: 0.34em`, no versalitas de fuente; `.brand-product`, 12 px en `navyAccent` = teal-500 → **decisión abierta**, ver abajo), no el archivo oficial; apertura de capítulo: mini-lockup al pie (Efeonce 12 px + filete 1 × 10 + «INSIGHTS» 8 px en `navyMuted`, `report-chapter.html`); pie de página y contraportada con el logo de Efeonce | `src/lib/artifact-composer/catalogs/insights-report/report-cover.html`, `report-cover-light.html`, `report-editorial.css` (usar el lockup oficial pasa por el contrato de fidelidad y el gate visual de TASK-1889) |
| Deck (`insights-deck`) | **versión tipográfica** | portada: logo de Efeonce 30 px + aire 16 + filete 1 × 22 + «INSIGHTS» en mayúsculas espaciadas 12 px en `navyAccent` (`.product`; **decisión abierta**); pie de la apertura de capítulo: Efeonce 13 px + filete 1 × 12 + «INSIGHTS» 9 px en `navyMuted`; los demás pies nombran «Insights · Informe de …» como texto | `catalogs/insights-deck/insights-cover.html`, `insights-chapter.html` |
| Correo de entrega | diseño **aprobado** el 2026-09-29 (canvas «Correo» v21: enlace en escritorio y celular, PDF adjunto) como **aplicación** de los módulos de correo (§C4); implementación pendiente | hoy `brand='efeonce'`, diseño funcional, sin los módulos | `src/emails/InsightsEditionDeliveryEmail.tsx`; dirección `docs/ui/visual-directions/EFEONCE_EMAIL_MODULES_V1-direction.md` |
| Favicon de Think en `/insights/**` | pendiente | favicon genérico del sitio | `efeonce-think/src/layouts/BaseLayout.astro` |
| Ficha de Insights en la receta de deck `content-day-live-results` | pendiente | isotipo de Efeonce en ficha oscura (`efeonce-isotype-negative.svg`, `catalogs/graphic-line-deck/content-day-live-results.html`) | `docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json` |
| Ficha de Insights en la receta de deck `content-day-tools` | pendiente, **desalineada** | el Composer usa el ícono `probe` (`catalogs/graphic-line-deck/content-day-tools.slots.json`), mientras la nota de la receta pide el isotipo de Efeonce en ficha oscura | receta JSON (misma ruta) + `content-day-tools.slots.json` |
| Portal (TASK-1849) y MCP | pendiente | portal sólo diseñado; MCP sin superficie visual | — |

«Versión tipográfica» = la marca se nombra con tipografía; falta usar el archivo oficial `insights-lockup-*`. Ambos
estados, sin decisión del operador ([ledger.md](ledger.md), «Marca de Insights fuera de Think»). Greenhouse fija
`@efeoncepro/axis-brand-assets` 0.3.5 y los archivos de Insights llegan en **0.4.0**: aplicarla en Greenhouse exige
subir esa versión. Referencia visual en el Lab de AXIS: [axis.efeonce.org/references/insights/](https://axis.efeonce.org/references/insights/) (publicada el 2026-09-28, AXIS main `3dfbf0e`; datos para agentes en `/references/insights.json`). El ejemplo vivo del producto es la muestra
`think.efeoncepro.com/insights/muestra`. Las copias `apps/lab/public/branding/insights-*.svg` también están en `main` de AXIS.
Anatomía del informe y de la web: skill `efeonce-insights` → `references/ui-and-brand.md`.

**Decisión abierta (del operador; no la cambies por tu cuenta):** en las portadas PDF/deck, «INSIGHTS» va en el acento
(`navyAccent` = teal-500, 12 px; `report-editorial.css`, `insights-cover.html`) y con proporciones propias. Choca con
«junto a Efeonce, Insights baja su brillo; sólo la esfera conserva el acento» y con «el acento nunca en texto de menos
de 24 px». Cambiarlo toca el contrato de fidelidad de TASK-1889. Los pies de capítulo ya van en `navyMuted`.

**Mini-órbita y «una órbita por pieza»:** el anillo y la esfera de la «i» son parte del logo (como el planeta de
Efeonce) y no cuentan como la órbita de la pieza; el hero de Think y la imagen OG la ponen junto a una órbita de acento,
revisado a ojo el 2026-09-28. Es la interpretación de quien construyó la marca, pendiente de confirmación del operador.

### B3c. Submarcas de producto SEO/AEO — dónde se aplican (2026-09-29)

Las cuatro submarcas (**Efeonce | SV360**, **Efeonce | AEO**, **Efeonce | AEO Assessment**, **Efeonce | AI Visibility
Report**; criterio en [criteria.md](criteria.md), «Submarcas de producto SEO/AEO») acompañan a Efeonce y **nunca
firman**: junto al logo de Efeonce se usa el archivo `*-lockup-*` (o `sv360-name-lockup-*` cuando se quiere el nombre
completo «Search Visibility 360»), nunca los dos logos armados a mano. Piezas de la línea **Engine**: acento `#0375db`,
fondo oscuro `#091951`, «Empower your Engine» en el cierre. Variante `white` para foto y fondos de color; sobre el
oscuro de la línea, la negativa.

| Superficie | ¿Lleva la marca? | Estado | Dónde |
|---|---|---|---|
| Landing del AI Visibility Report («¿Te recomiendan las IA? / Averígualo») | sí, lockup del Report por decisión del operador (2026-10-02) | hero y encaje amplio publicados/verificados el 2026-10-04, Think `56a300a`; último ajuste de hover sólo local | TASK-1966; canvas «Marcas SEO y AEO de Efeonce» |
| Portada del AI Visibility Report | sí | aprobada en el canvas (aprobó también la paleta Engine); canónica en AXIS desde `v0.3.30`: la órbita de la portada dice la gravedad | canvas; Lab `/references/ai-visibility-report/`; receta `aiVisibilityReportOrbitSvg` |
| Post 1:1 de SV360 | sí | aprobado en el canvas | canvas |
| PDF del informe del Grader (versión cliente y no cliente) | sí, lockup «Efeonce \| AI Visibility Report» | diseño aprobado (24 páginas en es/en/pt-BR) y canónico en AXIS (contrato `efeonce.ai-visibility-report` 0.1.0 `candidate`); renderer Engine implementado y validado localmente 2026-10-03; rollout pendiente | TASK-1938; dossier de diez PDFs y 24 comparaciones |

**Estado vigente de la landing (2026-10-04):** identidad Engine y lockup oficial de `axis-brand-assets`
0.4.10, SVG orbital oficial, Trazo y firma «Empower your Engine». El hero demostrativo de Think `6aab907`
y su corrección de ancho `56a300a` están publicados; Vercel success y readback público a 1710/2560 px
registrados en `docs/ui/reviews/TASK-1966-ai-visibility-report-landing-la-orbita/hero-demo-2026-10-04/README.md`.
La última corrección del **color de hover** sigue local y no está publicada. Esta evidencia no certifica
el PDF, la página del informe ni un envío real.

**Hero y movimiento vigentes:** consulta → respuesta → marca → fuente ilustrativas, sin atribuir una respuesta
real a un proveedor. Por decisión del operador no lleva «Cómo funciona» ni leyenda/control visible al pie.
La escena completa es un botón nativo transparente: clic, toque, Enter y espacio pausan/reanudan; el foco de
teclado es visible y la descripción accesible conserva que es un ejemplo ficticio. Suspende el movimiento fuera
de pantalla y en pestaña oculta; reducido/sin JS muestra el ejemplo completo, estable y sin control inoperante.
Grid en flujo normal y mensaje primero en móvil. Escena DOM/CSS con una sola órbita oficial y sin dependencias
nuevas. La composición y los tiempos son propios de esta superficie, **no motion canónico AXIS**.

**Encaje y contraste:** cabecera y hero comparten shell acotado a 1360 px; escena cuadrada con máximo de
500 px. Esos límites locales evitan que el ancho del viewport agrande la fila y aleje el formulario: readback
1710/2560, escena 500 px y comienzo del formulario en y=678, sin overflow. Think y local medidos al mismo ancho
eran idénticos antes del arreglo; no era deriva de assets/CSS. El hover primario se mantiene sin elevación.
El operador rechazó el celeste pálido: el ajuste local usa `color-mix(in srgb, var(--engine-accent) 70%,
var(--engine-ground))` con `var(--engine-ink)` blanco, **6,80:1** medido; sólo cambia dos declaraciones de
`BrandVisibilityFormDock.astro`, sin nuevas flechas, motion o geometría. Los tamaños y la mezcla son del adapter
Think; no se incorporan como tokens generales de la marca.

**Formulario y entorno de prueba:** el readback productivo conserva **Entrega primero**. La versión gobernada
**Marca primero** se prueba en `localhost:4332` mediante `scripts/growth/preview-ai-visibility-landing.cjs`, con
renderer real, contrato candidato, banner de QA y POST deshabilitado. **No está activada** en producción y un
push de la landing no la activa. `localhost:4331` recibe HTTP 200 del contrato pero sin autorización CORS para
ese Origin; el browser no puede leerlo. No ampliar allowlists ni ocultar el error para obtener una captura.

**Criterio reutilizable de esta aplicación:** probar la composición tanto en móvil como por encima del ancho
de diseño; comparar local y producción con el mismo viewport y distinguir contrato de formulario de estilos
host. Un control de pausa integrado en la escena debe seguir siendo botón de teclado con foco y nombre
accesibles. Un ajuste de color se valida sobre el botón real y con contraste medido; no requiere añadir
movimiento. Registrar por separado implementación, commit, push, despliegue y readback.

**Antecedentes preservados:**

- 03/10, Think `f4426d2`: primera landing Engine publicada y verificada, con entrada orbital oficial de 2 s y
  final fijo. Firma compactada sin sumar gap al margen canónico del eslogan. Pie con SVG `aeo-logo-negative.svg`
  pequeño y enlace verificado a `https://efeoncepro.com/aeo-2/`: contexto del servicio en columna separada,
  nunca otra firma ni lockup armado. Legal 600 en caja normal, copyright 400 y enlace 500. Evidencia en el dossier
  TASK-1966, `production/` y `footer-aeo/`.
- 04/10, Think `09e1976`: primera revisión continua con tarjetas conceptuales y refinamiento UX (muestra
  ampliable del PDF con datos sintéticos, cinco niveles desplegables, menor peso tipográfico, aclaraciones de
  entrega/acceso y CTA final). El hero quedó reemplazado por la escena demostrativa; el candidato Marca primero
  sigue separado. Evidencia en `ux-revision-2026-10-04/` y dirección en
  `docs/ui/motion/TASK-1966-ai-visibility-report-orbit-motion.md`.
- 04/10, Think `6aab907` → `56a300a`: hero demostrativo, pausa directa y corrección de pantalla amplia. El
  readback de `56a300a` sustituye el estado anterior de «Vercel en despliegue / readback pendiente» de `6aab907`.
  El celeste pálido documentado en capturas anteriores es histórico; `form-hover-engine-blue.png` registra el
  nuevo candidato local. Documentación Greenhouse y hover nuevo permanecen fuera del release publicado.

Canvas de registro: [«Marcas SEO y AEO de Efeonce»](https://claude.ai/artifact/3wPmSbb24fm1pJqAPcv9ac) (sistema, hojas
por marca, versión en blanco y aplicaciones). Archivos en `@efeoncepro/axis-brand-assets` 0.4.2 (publicado el
2026-09-29, AXIS `main` `7f9c8bb`); Ese registro antecede a la adopción local; ver estado vigente de TASK-1938 a continuación. Referencia visual en el Lab de AXIS
`/references/seo-aeo/` (JSON `/references/seo-aeo.json`, guía `docs/agent-composition/seo-aeo.md`; publicados el
2026-09-29). Norma: manual §7.2.

**El informe completo (canon AXIS, 2026-09-29, tag `v0.3.30`):** la anatomía del Efeonce AI Visibility Report vive en
el token `aiVisibilityReport` y en el contrato `efeonce.ai-visibility-report` 0.1.0 (`candidate`; manifest
`axis.ai-visibility-report-composition.v1`, 22 códigos, 9 chequeos de adapter, `pnpm report:resolve` en AXIS): A4, seis
páginas (portada → qué hacer → por qué → dónde → mercado → contraportada), cabecera y pie interiores, dos audiencias
(prospecto: agenda con UTM, nunca correo; cliente: responsable de la cuenta, sin oferta) y es/en/pt-BR con fallback es.
La órbita sólo va en la portada y es la **medida con gravedad** ([criteria.md](criteria.md) §3.4): estela, esfera y
su brillo en el color del nivel, con etiqueta y escala a la vista; umbrales del productor. Desde AXIS `v0.3.38`
(`axis-graphic-line` 0.13.0) lleva además el **camino recorrido** desde las 12, en el color del nivel (§3.4). Página canónica:
[axis.efeonce.org/references/ai-visibility-report/](https://axis.efeonce.org/references/ai-visibility-report/) (JSON
`/references/ai-visibility-report.json`); guía `docs/agent-composition/ai-visibility-report.md`; dirección de
Greenhouse `docs/ui/visual-directions/TASK-1938-ai-visibility-report-pdf-la-orbita-direction.md`. La adopción local y el renderer se registran en TASK-1938; el estado de publicación se verifica por separado.

**Aplicación PDF verificada localmente (2026-10-03):** TASK-1938 conserva react-pdf, snapshot, métricas y flujo de envío. Usa tokens `0.3.41`, contracts `0.3.40` y brand-assets `0.4.15`, sin bump de paquetes; la anatomía editorial faltante sale de una extensión generada en AXIS y sellada en el consumidor, todavía sin publicar. Seis variantes normales ES/EN/PT-BR × cliente/prospecto, seis A4; nombres largos se miden con la fuente real y el contenido extenso continúa sin truncarse. Diez PDFs auditados, contraste y 24 comparaciones color/gris en `docs/ui/reviews/TASK-1938-ai-visibility-report-pdf-la-orbita/README.md`. Recursos oficiales y seis pesos estáticos: `pnpm exec tsx scripts/build-pdf-brand-assets.ts --ai-visibility-report`; registro aditivo. Redes: el PNG oficial incluye el disco, se muestra completo a 40 px, sin doble reducción. Corrección posterior de anotaciones (03/10): el chip de período centra el texto en un contenedor independiente; las versiones de metodología se presentan como números, nunca como IDs técnicos. Pie interior confirmado: organización/período, burbuja URL y folio, sin lockup Insights. Eslogan Engine al 64 %, divisor canónico 11,263 em. Tipos, build y 108 pruebas focales PASS; desincronización de metadata Manzanitas corregida con autorización del operador (check de 49 archivos y siete tests PASS; suite general no repetida). **Code complete local, rollout pendiente**, no acredita envío ni publicación.

### B4. Deck de Insights y correo de aviso

- **Deck de Insights:** portada, figura y cierre en 16:9; la órbita chica de la esquina es la navegación (3 de 5); pie
  con logo, edición, burbuja URL y folio (excepción aprobada). **Correo de aviso (640 × 900):** pregunta del mes y
  respuesta «Tu informe está listo», misma voz. *Superado el 2026-09-29:* el correo de entrega de Insights aprobado es
  una aplicación de los módulos de correo canónicos (§C4), con su propio cuerpo; esta lámina L 7.2 queda como
  antecedente.
- **Fuente:** L 7.2; `EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md` §Deck de Insights.

### B5. Pantalla de recepción, webinar y pantallas de evento

- **Pantalla de recepción** (L 4.3 1/3): el **cierre de marca en loop** (4,5 s), **sin sonido**; con movimiento
  reducido, cuadro fijo. Hoy también existen las animaciones del logo (reveal 3,6 s para intro de evento); cuál va en
  loop en recepción no está decidido más allá de la lámina (**inferido** que se mantiene el cierre de marca).
- **Webinar / transmisión:** sin lámina. Lo aplicable (**inferido**): apertura con la animación **apertura** o
  **reveal** (L Lab 4.4.2), el cuerpo como deck (B1) y el fondo de cámara como B6.
- **Fuente:** L 4.3 1/3; Lab 4.4.2; M §10.1.

### B6. Fondo de escritorio y de Teams

- **Lienzo:** 1920 × 1080, oscuro.
- **Va:** la órbita **a la derecha** con halo (en la lámina cx 1380, cy 430, r 380) · el logo abajo a la derecha (200
  px).
- **Espacio:** **la zona izquierda queda libre para la cámara**; nada de texto donde va la persona.
- **Nunca:** órbita interior (la lámina tiene una: se reproduce con un solo anillo, D6) · eslogan · voz larga.
- **Fuente:** L 4.3 3/3; M §10.3.
- **Fondos de Teams fotográficos (aprobados por el operador, 2026-09-29):** nueve rincones del mismo piso moderno
  de Efeonce (sala «Responder.», open space «Crecimiento orgánico.», sala «Cerrar.», cocina, muro «final_final_v27»,
  «Hecho a mano. (casi)», «¿Cuántos formatos? Todos.», «¿Cuántas tomas? Una.», «¿Y la marca? Intacta.»). Reglas
  aprendidas: **el centro es de la persona** (30–70 % del ancho): el chiste y la marca van en los tercios; **el logo
  va siempre, como product placement** (logo 3D de escritorio del kit sobre una mesa o repisa), **nunca forzado en la
  pared de una sala**; una órbita por fondo y sutil, en un objeto real (panel de sala «En sesión», alfombra, tazas,
  stickers, órbita de plastilina); Nexa siempre con el uniforme; ironía sobre nosotros, nunca sobre el cliente, sin
  logros inventados. Se producen con `foto:prompt` (formato `teams`), arte exacto de cada texto y prueba de silueta a
  480/1280 px. Archivos: OneDrive `Kit media/Fondos de Teams/2026-09 La órbita/`, GCS `team/teams-backgrounds/v1/`,
  fuentes `ai-generations/2026-09-29_fondos-teams/` (si no están en disco, `pnpm ai-gen:pull` esa carpeta).

---

## C. Correo

### C1. Firma de correo personal (v3.1, aprobada 2026-09-26)

- **Para qué:** la firma de cada persona en Outlook. Dos versiones aprobadas: **A · sobre papel** y **B · tarjeta
  navy** (B se reconoce de lejos en la bandeja y funciona en modo oscuro sin cambios).
- **Lienzo:** 460 px de ancho máximo en escritorio; fluida en móvil (vista de 360 px en L 4.5).
- **Zonas en orden fijo** (T `emailSignature.zones`; las opcionales se omiten, el orden no cambia):
  foto con órbita (130 px, a la altura del bloque de texto de al lado; la marca de área, 106 px; `portraitOrbitSvg`;
  T `emailSignature.portrait.sizePx`, operador 2026-09-29) → nombre y cargo (el nombre es la única voz de titular: Bricolage 800,
  22 px, **con el punto en el acento**; cargo Poppins 400, 13 px) → teléfono y correo (texto vivo, íconos Tabler outline
  trazo 1,75 en el acento; **siguen con Tabler** hasta que el operador decida si los reemplaza la iconografía de la
  línea, §0.3) → burbuja URL + LinkedIn → **línea que termina en la esfera** (una sola vez, 18 px antes) →
  cierre de marca: logo + «Empower your …» (14 px antes) → **regla de sección sin esfera** (20 px antes) → «Partner
  oficial de» + franja de logos (16 px antes).
- **Nunca:** «Quedo atento.», «Saludos» ni ningún cierre en la firma (van en el cuerpo) · repetir la esfera en la
  regla de partners · SVG o fusiones (los clientes no los muestran) · partners que el registro de partnerships no
  permite declarar · Truora (es partner pero no va en la firma) · la URL como texto.
- **Color y superficie:** B navy `#001A33`, nombre blanco, bajada `#9FB3C8`; A papel/blanco, nombre `#023C70`. Franja de
  partners monocroma (`#7c92aa` sobre navy, `#8a95a2` sobre papel), mismo peso óptico (430 px² de tinta en caja de
  80 × 24), filas de hasta cinco, **una sola imagen** con alt que nombra a todos.
- **Retrato** (T `portrait`, caja de 208 px): anillo r 96, foto recortada en círculo r 78, arco 200°–250° trazo 4,
  esfera r 7; anillo 2 px navy al 22 % sobre claro, halo al 40 % sobre oscuro.
- **Cómo se produce:** `ai-generations/2026-09-26_firma-partners/build4.mjs` (sin versionar; `pnpm ai-gen:pull` si falta) con `HOST_BASE=https://storage.googleapis.com/efeonce-group-axis-public-media/email-signature/v3.1/`
  → `out/v3.1/hosted/` (se sube con `gcloud storage cp -r`) y los HTML `outlook-a.html` / `outlook-b.html`. Todo lo que
  no es texto va en PNG 2×–3×. Contrato `efeonce.email-signature`.
- **Errores comunes:** revisarla sólo con fuentes web (Outlook y Gmail muestran **Arial**: revisar también así) · la
  regla de sección como `div` de 1 px (Outlook la ignora: es el borde superior de una celda).
- **Instalación (D11, 2026-09-26):** cada persona la instala en Outlook desde el HTML generado (`outlook-a.html` /
  `outlook-b.html` con sus imágenes publicadas).
- **Eslogan de la firma:** va a 12 px, así que la palabra final va en el color del nombre (navy o blanco), no en el
  acento: es la regla del acento para texto de menos de 24 px (D1).
- **Fuente:** L 4.5; M §10.2; T `emailSignature`, `portrait`; R `portraitOrbitSvg`, `sphereDividerSvg`.

### C2. Firma de equipo (buzón de área, `variant: 'team'`)

- **Va:** **sin foto**: la misma órbita del retrato rodea el **ícono del área** (Tabler outline, trazo 1,5, 72/208 de la
  caja; sigue con Tabler hasta que el operador decida, §0.3) sobre un disco (`#0b2b4a` oscuro, `#eef3f7` claro); el ícono en el color del nombre y la esfera en el acento. El
  nombre es el área con su punto («Talent.»), la bajada su descripción, y **sólo el correo del área**.
- **Nunca:** teléfono ni LinkedIn personal.
- **Áreas:** Talent (`users-group`, talent@) · Finance (`coins`, finance@) · Commercial (`briefcase`, sales@). Un área
  nueva se agrega **primero** en los tokens `emailSignature.team.areas`.
- **Cómo se produce:** `AREA=<talent|finance|commercial> node build4.mjs` (con `HOST_BASE` escribe
  `out/equipo/<área>/hosted/`); el ícono con órbita se publica en `areas/<área>-<dark|light>.png`.
- **`people@efeoncepro.com`** usa la firma del área **Talent** (D11, 2026-09-26): no es un área aparte.
- **Pendiente:** la URL de LinkedIn de la empresa.
- **Fuente:** M §10.2; T `emailSignature.team` (tokens y contratos 0.3.4).

### C3. Firma de respuesta y reenvío

- Una **línea de texto vivo** (nombre, cargo, teléfono), **sin imágenes** (T `emailSignature.reply`).
- **Fuente:** M §10.2.

### C4. Correos de Efeonce: pie, CTA y bloque de marca (módulos canónicos, aprobados 2026-09-29)

**No es la firma de correo** (C1–C3: la firma de una persona, contrato `efeonce.email-signature`, token
`emailSignature`, M §10.2). Esto es el **correo que envía Efeonce o un producto suyo** (Insights, el AI Visibility
Report, avisos): contrato `efeonce.email-modules`, token `efeonceEmail`.

- **Qué es canon y qué es aplicación** (operador, 2026-09-29, al aprobar el correo de entrega de Insights, canvas
  [«Correo»](https://claude.ai/artifact/1FHPWVxQ2rbK6jdxw2EqNd) v21, tres tableros: enlace en escritorio, en celular
  y PDF adjunto):

  | Canon (todo correo) | Aplicación (sólo ese correo) |
  |---|---|
  | el **pie** completo, en su orden | el correo de Insights: cabecera, «Lo esencial del mes», su órbita de medida, la tarjeta de decisión |
  | los **módulos de CTA**: el CTA principal y la tarjeta de agenda | el copy de cada CTA (el principal de Insights: «Ver el informe completo →») |
  | el **bloque de marca** del pie (logo + eslogan de la línea) | — |

  Otros correos arman su propio cuerpo sobre la misma base; **nunca** se copia el correo de Insights como plantilla.
- **El pie, en orden:**
  1. **Tarjeta de agenda:** `#023c70`, radio 16, título «¿Lo revisamos juntos?» en Bricolage 700 22 px, bajada 13 px
     `#cfe4fa`, píldora blanca «Agendar una reunión». Va a `https://efeoncepro.com/contacto/` con UTM
     (`utm_medium=email`, `utm_source={producto}`, `utm_content=pie`, `utm_campaign` si hay), **nunca a un correo**.
  2. **Bloque de marca:** el logo de Efeonce a 220 px y, **debajo**, el eslogan al 64 % del ancho del logo, con la
     palabra de la **línea de servicio** que firma (Growth, Brand, Engine, Voice o Revenue; nunca el producto: Insights
     firma `growth`). Bajo 24 px la palabra va en blanco, y a 220 px siempre lo está.
  3. **Burbuja URL + 4 redes** en círculos: LinkedIn, Instagram, YouTube, Threads.
  4. Filete.
  5. **Bloque legal** en 11 px `#9fb3c8`: «Efeonce Group SpA» en 600 `#cfe4fa` · RUT; dirección; teléfonos · correo.
     Los valores salen de `src/config/efeonce-brand.ts` (espejados en el token), nunca del canvas.
  6. Filete.
  7. Enlaces de **preferencias y baja**, 11 px.
  8. **Motivo** del envío y ©, 10 px.
- **CTA principal:** píldora navy `#001a33` a todo el ancho, etiqueta en texto vivo; como mucho uno por correo.
- **«Suscribirme» está retirado:** la agenda lo reemplaza en todo correo (`efeonceEmail.retired`, código
  `cta-subscribe-retired`).
- **El pie lleva logo y burbuja a la vez, y no rompe la regla de firma:** es un pie, como el de la hoja membretada o la
  firma de correo; la burbuja es la URL del pie, no la firma de una pieza gráfica (criteria §6).
- **Color y superficie:** banda del pie `#001a33` **para toda línea**; el acento de la línea no aparece en el pie.
- **Nunca:** SVG en línea (Gmail y Outlook lo descartan: todo va en PNG @2x con ancho, alto y `alt`) · texto legal, CTA,
  preferencias o motivo en imagen · logo y eslogan en **un solo** archivo · un eslogan escalado para otro ancho de logo
  · fuentes web obligatorias · la agenda como `mailto:`.
- **Cómo se produce:** intent → `pnpm email:resolve` en AXIS → manifest `axis.email-modules-composition.v1` → HTML de
  correo del consumidor (tablas, estilos en línea, botones con VML) con los PNG `email-*` de
  `@efeoncepro/axis-brand-assets` 0.4.6 → los 6 chequeos del adapter. Detalle en
  [package-and-tokens.md](package-and-tokens.md) §2.21, §5b y §6; checklist en [qa-checklist.md](qa-checklist.md) §7b.
- **Estado en Greenhouse (2026-09-29):** **no adoptado**. Greenhouse fija el set anterior de AXIS y
  `src/emails/InsightsEditionDeliveryEmail.tsx` y `src/emails/components/EmailLayout.tsx` no cambiaron; la dirección
  sellada es `docs/ui/visual-directions/EFEONCE_EMAIL_MODULES_V1-direction.md` (PNG de los tres tableros en
  `docs/ui/visual-directions/EFEONCE_EMAIL_MODULES_V1/`). Skills `greenhouse-email` y `resend-email-platform`.
- **Pie por propósito (operador, 2026-09-29; resuelve la tensión con TASK-1764):** el correo de Insights va a clientes
  y es `relationship_transactional` con la **excepción explícita** `efeonce-insights-delivery`, que le conserva el pie
  completo (agenda, redes, preferencias y baja «Dejar de recibir estos informes»). Los demás correos siguen la política
  de presentación: sin agenda, redes ni baja en transaccionales y de servicio; baja obligatoria en suscripción y
  marketing; redes opcionales en suscripción y obligatorias en marketing. Contrato `efeonce.email-modules` `0.2.0`, en
  publicado en `v0.3.39`: el intent lleva `purpose` y, si hay excepción, `application`; se retira `cta-agenda-required`
  (códigos nuevos `cta-agenda-not-allowed`, `footer-socials-not-allowed`, `footer-unsubscribe-not-allowed`,
  `application-unknown`, `application-purpose-mismatch`). Una excepción es por tipo, con aprobador, fecha y motivo;
  un agente nunca la infiere ni quita módulos en el adapter.
- **Fuente:** canvas «Correo» v21; AXIS `docs/architecture/EMAIL_MODULES_DECISION_V1.md` y
  `docs/agent-composition/email-modules.md`; Lab [axis.efeonce.org/references/email/](https://axis.efeonce.org/references/email/); T `efeonceEmail`.

---

## D. Oficina y uso del espacio

**Criterio del espacio (L 4.3, L 5.1):** la marca completa aparece **una sola vez**, en recepción; desde ahí la línea
guía sin repetir el logo. **Una lente o una órbita por muro o por vidrio**, nunca patrones. La órbita en vinilo mide
**Ø 1,2 m** de referencia (anillo 3 mm, arco 5 mm, esfera Ø 18 mm, sin halo) y escala lineal con el diámetro; **su
centro va a 1,5 m del piso** (altura de ojos). Materiales en las láminas: vinilo sobre muro y vidrio esmerilado, pintura
(muro de voz), impreso e imán (pizarra), pantallas. Los datos reales (clave del wifi, horarios, nombres de salas) los
completa la oficina. Todo con prueba de color sobre el material real.

### D1. Llegar

| Aplicación | Va | Nunca | Espacio y material |
|---|---|---|---|
| **Muro de recepción** (L 4.3 1/3) | la órbita con el **logo completo** dentro (cierre de marca aprobado, D5; el anillo fuera del resguardo X) y el eslogan centrado debajo; es el único lugar donde va el logo completo en la oficina | repetir el logo en otros muros | en la lámina el anillo (r 300 sobre 1080 de alto) ocupa algo más de la mitad del alto del muro, centrado, con el eslogan en el tercio inferior; vinilo o pintura sobre navy |
| **Mural / sala de espera con lente** (L 4.3 1/3, L 4.9) | la lente sobre una foto del oficio con su órbita y una palabra con su punto («Hacer.») | segunda órbita en el mismo muro | receta `lensRecipe('wall')`: anillo cx 1150, cy 420, r 392 en 1920×1080, respuesta 200 px, sin pregunta ni firma |
| **Pantalla de recepción** | ver B5 | sonido | pantalla |
| **Directorio de piso** (L 4.3 1/3) | la pregunta «¿A dónde vas?»; cada área con **la esfera en el acento de su marca** | órbitas por fila | papel/claro; esfera como marcador de área |
| **Placas de sala** | las salas se llaman con los verbos de la línea **con su punto**: Hacer., Medir., Crear. (Crear es propuesta) | — | placa junto a la puerta |
| **Señalética de servicio** (cocina, baños, salida) | Poppins y flecha | esfera u órbita: **se lee, no decora** | — |

### D2. Trabajar — el estado se dice con la forma

| Aplicación | Va | Nunca | Espacio y material |
|---|---|---|---|
| **Sala · vidrio esmerilado** (L 4.3 2/3) | la órbita en vinilo sobre el vidrio con la lente como ventana; «Sala 02» y «En sesión hasta las 16:00» | semáforo de colores | una órbita por vidrio; en la lámina anillo r 314 con arco teal oscuro, texto a la izquierda del anillo |
| **Estado de sala** (pantalla junto a la puerta) | nombre de la sala, estado en texto y **el arco que mide el tiempo real** transcurrido de la reunión | arco sin dato: **sin dato, no hay arco** | pantalla; `stateMarkerSvg` / elemento `state` con su etiqueta (**inferido** que es la función a usar para el marcador) |
| **Pasillo · muro de trabajo** (L 4.3 2/3) | lente sobre el trabajo en curso con pregunta y respuesta («¿Cuál sale al aire? Esta.») | anotaciones de lámina en el muro (ver §K) | muro navy, una lente |
| **Pizarra de proyecto** | la pregunta abierta con su anillo («¿Qué aprendimos en este ciclo?», «Escríbelo adentro.»); **el imán es la esfera y avanza por la órbita** | respuesta impresa (la voz queda abierta) | órbita impresa 2 mm al 30 %, arco impreso 4 mm, imán Ø 45 mm |
| **Muro de voz** | **una** pregunta y su respuesta, pintadas («¿Lo medimos? Siempre.»), del banco de voz | dos pares en un espacio | pintura; una por espacio |
| **Cabinas de llamada y podcast** | **anillo = libre**, **esfera = en el aire / en llamada**, con su palabra («Libre.», «En el aire.»); «en el aire» es el estado en vivo y el único que puede sumar el anillo propio de la esfera (`sphereRing` con `live: true`, D8) | rojo/verde | letrero en la puerta |

### D3. Convivir

| Aplicación | Va | Nunca |
|---|---|---|
| **Cocina / repisa de tazas** | la voz en el muro («¿Otra vuelta? Vamos.») sobre la repisa; tazas según E1 | logo en el muro de cocina (**inferido**: la lámina no lo lleva) |
| **Puesto de bienvenida** | cuaderno «Ideas.» (la pregunta abierta en cuadernos, M §4), credencial, stickers y bolsa «Hacer.» | stickers con el logo recoloreado |
| **Stickers** | la esfera, el anillo, la órbita y una respuesta; el isotipo a color (L 3.3) | logo recoloreado; isotipos combinados |
| **Fondo de escritorio y de Teams** | ver B6 | — |
| **Tarjetas de mesa y avisos** | la voz: pregunta con anillo y respuesta corta («¿Clave del wifi? [clave]», «¿Primera vez aquí? Pasa.») | datos inventados: los completa la oficina |

- **Cómo se produce (toda la oficina):** hoy no hay receta de paquete salvo la lente de muro. El arte plano de
  referencia es la lámina 4.3 (generador del canvas en `ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/`; `pnpm ai-gen:pull` si falta);
  los archivos de impresión y plantillas editables están **pendientes** (M §12): se empieza por el muro de recepción y
  la tarjeta de presentación, en PDF vectorial salido de las recetas, **bloqueado** hasta tener la especificación de la
  imprenta (D13). Para mostrarlo en un espacio real, §K.
- **Fuente:** L 4.3 (1/3, 2/3, 3/3), L 4.9, L 5.1; M §10.3, §10.9.

---

## E. Objetos

**Regla de todos los objetos (L 4.4, M §10.4):** **frente, la palabra en Bricolage con su punto**; la órbita es
opcional y siempre **alrededor de la palabra**, con el acento de cada marca. **Dorso, el logo solo**, chico y abajo, sin
órbita ni texto. La órbita alrededor del logo está descartada. Diseño propio: nunca la forma, la tapa ni el cierre de
una marca existente. Muestra física del proveedor antes de producir.

| Objeto | Frente | Dorso / detalle | Material y medidas | Fuente |
|---|---|---|---|---|
| **Taza** | «Hacer.» con su punto; la **blanca con «Hacer.» y punto teal es la favorita** del operador; con órbita alrededor de la palabra también funciona, en toda la familia (Globe «Crear.», Wave «Aparecer.», Reach «Llegar.») | el logo solo, chico y abajo (las dos blancas comparten reverso) | cerámica **sin halo**: anillo 0,5 mm, arco 1,2 mm, esfera Ø 4,4 mm, órbita Ø 74 mm centrada en la cara; **el interior toma el acento** de la marca | L 4.4 |
| **Vaso térmico** | «Hacer.» dentro de una órbita teal (navy), «Medir.» con órbita teal oscuro (blanco), «Crear.» con órbita naranja (Globe) | logo solo | acero con pintura en polvo, banda de acero, tapa con cierre | L 4.6 1/3 |
| **Botella deportiva** | el verbo en su órbita | logo solo | acero con pintura en polvo, tapa rosca con asa | L 4.7 1/3 |
| **Lapiceros** | **el botón superior es la esfera**, en el acento de cada marca; la palabra en el cuerpo | el logo cerca del clip | — | L 4.6 1/3 |
| **Pulseras de silicona** | un verbo con su punto por pulsera (Hacer. · Medir. · Crear. · Aparecer. · Llegar.) | — | en las de color, texto y punto en blanco | L 4.6 1/3 |
| **Alfombra de escritorio** | «Hacer.» y la órbita | el logo | 90 × 40 cm; **la órbita a la derecha, bajo el mouse, no bajo el teclado** | L 4.6 1/3 |
| **Llavero** | la placa dice «Adelante.» | atrás, el logo solo | **la argolla es el anillo y la cuenta teal es la esfera** | L 4.7 2/3 |
| **Pin esmaltado** | la órbita en plata y teal, sobre navy | — | esmalte | L 4.6 3/3, M §10.6 |
| **Paraguas** | **visto desde arriba es una órbita con «Siempre.»** | de lado, el logo en un paño | tela: validar colores con prueba de impresión en tela | L 4.7 3/3 |

- **Cómo se produce:** el arte plano de la lámina es la referencia exacta; la foto de producto es maqueta (§K). Los
  renders 3D de tazas salieron sobre un mismo modelo de taza (`exploracion-v5/`: `familia-tazas.mjs`,
  `orbita-tazas.mjs`, `render-tazas.py`).
- **Errores comunes:** logo y órbita juntos al frente (L 5.6 2/2, «no») · el logo en el frente · halo en cerámica o
  vinilo.

---

## F. Vestir

**Dos capas que no se mezclan:**

1. **Cápsula por contexto (el uniforme vigente, decidido 2026-09-17; skill `efeonce-brand-studio`):**

| Contexto | Prenda |
|---|---|
| Frente a cliente (principal) | polo piqué navy `#023c70` con **emblema bordado** al pecho y, desde 2026-09-21, logo + eslogan bordados en la espalda |
| Reunión formal, comité, licitación | camisa o blusa blanca + chaqueta softshell o blazer navy, emblema bordado discreto, **sin eslogan** |
| Evento, feria, stand | polera navy |
| Producción, terreno, grabación, streaming | hoodie, polera royal y gorra |

   La estampa grande de espalda (logo + eslogan) es lenguaje de merch, no de ropa corporativa. El bordado tono sobre tono
   está descartado. **La estampa con el eslogan se compone, nunca se genera** (tres pesos de `src/config/efeonce-brand.ts`).
   Al vestir a alguien en una pieza, la prenda sale del contexto de la escena.

2. **Ediciones con la línea (L 4.6 2/3):** el uniforme **no cambia**; estas ediciones suman la órbita y la voz:

| Prenda | Va | Nunca |
|---|---|---|
| **Polera navy** | la órbita con «Hacer.» **centrada en el pecho**, en un frente liso | — |
| **Polera blanca** | una respuesta chica en el pecho («Siempre.») y **su pregunta en la nuca, por dentro** («¿Lo medimos?») | — |
| **Polo navy** | «Hacer.» bordado chico en el pecho y **el botón superior de la tapeta en teal: la esfera** | — |
| **Gorra** | «Hacer.» bordado adelante y **el botón superior en teal: la esfera** | — |
| **Hoodie** | se queda como hoy | **la órbita: la capucha y el bolsillo la cortan** |
| **Softshell** | se queda como hoy | — |

- **Técnica según la tela:** bordado en piqué y softshell; estampado en algodón. Prueba física antes de producir.
- **Fotos con personas:** sin emblema legible en la foto que irá en una lente (M §9): la foto no firma, firma la pieza.
- **Fuente:** L 4.6 2/3, L 4.8 1/3; M §10.5; `efeonce-brand-studio` §Vestuario.

---

## G. Identificarse — la forma dice el rol

| Aplicación | Lienzo | Va | Nunca |
|---|---|---|---|
| **Carnet · frente** | 540 × 860 (CR80), claro | la **foto con su órbita**, el nombre con su punto, el cargo, el logo abajo | la órbita sobre la cara |
| **Carnet · reverso** | 540 × 860, navy | la voz: «¿Lo encontraste? Devuélvelo.» y dónde (recepción) | — |
| **Credencial de evento** | 700 × 980 | cabecera navy con nombre del evento, fecha · ciudad y logo; nombre con su punto; **el rol por la forma: anillo = asistente, órbita = speaker, esfera = staff**; **el staff en navy** para encontrarlo rápido | el rol por colores |
| **Tarjeta de presentación · frente** | 850 × 550, claro | la persona: nombre, cargo, teléfono, correo | la URL como texto (va en su burbuja) |
| **Tarjeta · reverso** | 850 × 550, navy | **el logo solo**, como el dorso de un objeto (D5, §0.2) | la órbita alrededor del logo (la lámina 4.6 3/3 la pone: no se reproduce) |
| **Pin** | 500 × 500 | órbita en plata y teal | — |
| **Lanyard, yoyo y portacarnet** | — | **el actual se mantiene** (kit `13- Branding/Lanyard Efeonce/v01/`); portacarnet de marco rígido | una funda cerrada sobre el arte |

- **Excepción de color impreso:** sobre navy impreso, el prefijo del eslogan va en gris claro `#C8CEDA` (el gris de
  marca no resuelve en serigrafía ni sublimado; skill `efeonce-brand-studio`).
- **Cómo se produce:** el retrato con órbita sale de `portraitOrbitSvg` (sirve para tarjetas de equipo y fotos de
  perfil); en la credencial, la cabecera usa una órbita arriba a la derecha (en la lámina r 130 sobre 700 de ancho). Los
  datos entre corchetes se completan por evento. Kit y artes de credencial: `pnpm foto:lanyard`.
- **Fuente:** L 4.6 3/3, L 4.8 2/3; M §10.6.

---

## H. Bienvenida, envíos y papelería

| Aplicación | Lienzo | Va | Nunca / cuidado |
|---|---|---|---|
| **Caja de bienvenida · tapa** | 1600 × 1100 | la tapa pregunta y responde: «¿Primer día? Adelante.»; **el logo en el canto** | el logo en la tapa |
| **Caja · abierta** | 1600 × 1100 | «Esto es tuyo. [Nombre].» y el kit: botella, carnet, llavero, polo del uniforme, lapicero, tarjeta de bienvenida con el enlace al primer mes | — |
| **Envío a clientes · por fuera** | 1200 × 900 | **sobrio: logo chico y un anillo**; lo que viaja por correo no anuncia lo que lleva | eslogan o voz afuera |
| **Envío · por dentro** | 1200 × 900 | «Gracias.» y el papel de seda **cerrado con un sello teal: la esfera** | — |
| **Hoja membretada A4** | 794 × 1123 | logo arriba a la izquierda; **la órbita recortada en la esquina superior derecha al 18 % en navy** (en la lámina, centro en la esquina, r 238); pie con dirección, teléfono y web; **la línea del pie termina en la esfera** | **nunca la órbita detrás del texto**; texto de la carta en Poppins 11 pt |
| **Hoja de continuación** | 794 × 1123 | logo chico y número de página | órbita |
| **Sobre americano** | 1100 × 550 | frente con logo y remitente; **en el dorso, el sello es la esfera: cerrado = respondido** | — |

- La burbuja URL va donde aparezca `efeoncepro.com` (hoja, pie, tarjeta, carnet), horneada donde no hay fusión
  (`url-bubble-baked-light` / `-dark` de `@efeoncepro/axis-brand-assets`).
- Los datos entre corchetes se completan por persona o por envío.
- **Fuente:** L 4.7 1/3, L 4.7 2/3, L 4.8 2/3–3/3; M §8.5, §10.7.

---

## I. Eventos

| Pieza | Medida | Va | Espacio |
|---|---|---|---|
| **Stand completo** | frente de 3 × 2,4 m | el telón pregunta y responde, el pendón repite la voz, el mesón firma | **la zona baja sin contenido** (la tapan el mesón y la gente) |
| **Telón de fondo** | 3 × 2,4 m, navy | **pregunta chica, respuesta grande** («¿Te encuentran cuando te buscan? Aquí.») en la **mitad de arriba, sobre la altura del mesón**; la órbita a la derecha | se ve desde el pasillo |
| **Pendón roll-up** | 85 × 200 cm, navy | logo arriba, la conversación al centro («¿Lo medimos? Siempre.») | **los 20 cm de abajo libres** |
| **Mesón** | 100 × 90 cm | **el logo solo: es la firma del stand** | — |
| **Paraguas** | — | ver E | — |
| **Foco real** (L 1.4) | recepción, stand o escenario | un foco de luz real proyecta el círculo; «Te hacemos visible.» siempre con su prueba («Y lo medimos.») | una sola luz; nunca nombres reales de competidores en la penumbra |

- **Vestir en evento:** polera navy (cápsula, §F).
- **Credenciales:** §G.
- **Cómo se produce:** arte plano de L 4.7 3/3; en pantalla, el foco con `spotlightRecipe('event', { …, proof })`
  (anillo alrededor de una luz cx 960, cy 470, r 380). Validar colores con prueba de impresión en tela.
- **Regla (reafirmada el 2026-09-26, D15):** revisión legal del claim «Te hacemos visible» antes de cualquier pauta.
- **Fuente:** L 1.4, L 4.7 3/3, L 4.8 3/3; M §1.4, §10.7; T `pieces.spotlight`.

---

## J. Video y movimiento — cuándo usar cada uno

| Pieza | Qué es | Cuándo | Duración | Cómo se produce |
|---|---|---|---|---|
| **La órbita sola** | aparece el anillo, crece el arco, la esfera llega y asienta, sube el halo; **sin logo ni eslogan** | fondos de portada, cierres de presentación y cualquier pieza que ya tenga su propia firma o texto | 2,0 s + 0,5 s de reposo | `ORBIT_MOTION_CSS` / `orbitMotionFrameCss(t)` del paquete; video con `pnpm orbit:video -- --format 16x9|1x1|4x5|9x16 --surface dark|light --out <dir>` (repo AXIS) |
| **Cierre de marca** | la órbita + logo (1,9–2,5 s) + eslogan (2,5–3,0 s) | final de video, pantalla de recepción en loop | 4,5 s | tiempos `efeonceGraphicLine.brandClose`; **no va en impresos** |
| **Reveal** | la línea se vuelve logo | cierre de video, apertura de presentación, intro de evento | 3,6 s con sonido | master aprobado (no se regenera) |
| **Apertura** | el logo se abre en la línea | paso del logo al lenguaje de la línea: inicio de un video o de una presentación que sigue con la órbita | 2,4 s con sonido | master aprobado |
| **Sting** | el golpe corto | cortinillas, redes y cierres de menos de dos segundos | 1,6 s con sonido | master aprobado |
| **El foco barre y se posa** | el foco busca y se posa sobre el cliente | piezas de «Te hacemos visible» | — | `spotlightRecipe` + `ORBIT_MOTION_CSS` (Lab 4.4.1) |

- **Nunca:** las animaciones del logo para clientes ni para la UI de Greenhouse · generar una animación de marca con un
  modelo de video · valores de movimiento escritos en un script (salen de `efeonceGraphicLine.motion`).
- **Dónde están:** MP4/GIF/cuadro final en OneDrive `13- Branding › Motion Órbita Efeonce › v1.1`; masters (ProRes 4444,
  WebM y HEVC con alfa) en `gs://efeonce-group-axis-public-media/motion/logo/v1.1/`; fichas en el Lab 4.4.2.
- **Movimiento reducido:** siempre el cuadro final fijo.
- **Detalle completo:** `motion.md`.
- **Fuente:** L 4.1, L 4.4; Lab 4.4.1 y 4.4.2; M §10.1.

---

## K. Producción de maquetas: plano exacto → foto IA con rótulo honesto → muestra física

Toda aplicación física (merch, oficina, papelería, eventos) pasa por tres estados; ninguno reemplaza al siguiente.

1. **Plano exacto (arte vectorial).** Es la fuente de verdad: la lámina del canvas y, para producción, el archivo
   vectorial. Las piezas con receta salen del paquete; las demás, de su lámina. Los archivos de impresión y las
   plantillas editables están **pendientes** (M §12): hoy no hay «archivo final de imprenta» de ninguna pieza física.
   El orden decidido (D13): primero la tarjeta de presentación y el muro de recepción, en PDF vectorial desde las
   recetas; está **bloqueado** hasta tener la especificación de la imprenta.
2. **Foto IA como maqueta de dirección** (L 4.8, L 4.9; M §10.8–10.9). El arte plano entra como **referencia exacta**;
   el modelo (GPT Image 2.5 Sunburst) **sólo pone material, espacio y luz**; la gráfica no se redibuja. Prendas y
   credenciales usan además los kits reales (polo, gorra, lanyard) como referencia de forma y tela. Registro documental
   del lenguaje fotográfico: luz de día con una dirección, materiales reales, nadie mira al lente.
   - **Rótulo honesto:** toda foto así se presenta como «maqueta de presentación» o «maqueta de dirección», nunca como
     foto de un objeto producido.
   - **Lo que enseñó la corrida:** el arte de referencia va **sin leyendas de lámina** (el modelo pintó notas en el
     muro) · el logo chico se reinventa: revisarlo al 100 % y corregirlo **editando** la foto con el logo oficial como
     segunda referencia · revisar la puntuación letra por letra (salió un espacio antes del punto) · corregir editando,
     no regenerando la escena.
   - **Cómo:** runners y prompts en `exploracion-v5/merch-ia/` y `exploracion-v5/oficina-ia/`
     (`items.mjs`, `edits.mjs`, `LEEME.md`); piezas nuevas con la CLI canónica del motor elegido (guía de selección de
     modelos), eligiendo el asset de marca correcto según `EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md` (lo sensible se
     compone; el modelo sólo pone material y luz). La estampa del eslogan **se compone, nunca se genera**.
3. **Muestra física del proveedor** y prueba de color sobre el material real (vinilo, pintura, cerámica, tela, papel),
   más revisión del texto contra el archivo vectorial. Sin esa prueba no se fija ningún CMYK o Pantone.

**Ninguno de estos pasos aprueba, publica ni autoriza la producción**: eso lo decide el operador.

---

## Tabla resumen

| Aplicación | Forma de la órbita (o ninguna) | Elementos | Cómo se produce |
|---|---|---|---|
| Post 4:5 con foto | lente con órbita, esfera arriba-izquierda | foto, pregunta, respuesta con esfera, logo centrado | `lensRecipe('post' \| 'campaign-post')` |
| Post 4:5 / 1:1 sin foto | ninguna, o rodear la respuesta / medir un dato | voz + firma | `composeGraphicLine`, `creative:layout` (1:1 inferido) |
| Story 9:16 | lente con órbita | foto, voz, firma; zonas de interfaz libres | `lensRecipe('story')` |
| Carrusel | sin regla (inferido: una por lámina) | como post | consultar |
| LinkedIn 1200×627 | lente a la derecha | voz + prueba a la izquierda | `lensRecipe('linkedin')` |
| Portadas de perfil de Efeonce (LinkedIn página y personal, Facebook, YouTube) | — (la voz lleva anillo y esfera; el logo nunca va dentro de una órbita) | voz con idea propia, foto cine de Nexa, logo abajo (página) o de 120 px bajo el texto (personal) | A11; finales en `ai-generations/2026-09-30_portadas-sociales/` |
| Avatar de redes | ninguna (el isotipo ya es órbita); halo sin anillo ni arco | isotipo negativo al 60 % sobre `#001a33` | A11 |
| Favicon / ícono de app | ninguna (el isotipo ya es órbita) | isotipo al 60 % | archivo oficial |
| Destacados de Instagram | — | mezcla de recursos, un color de luz por destacada, sin firma en el círculo; portada (cambiar) e historia completa 9:16 (crear) | A11 |
| Escenario del login de Greenhouse (excepción en curso) | lente al canon (anillo 1,12, zoom, ancho/794); sin lente si la foto ya trae su órbita | foto de novedad, voz con anillo y esfera en el acento de la línea | A12 (`LoginLens.tsx`) |
| Ad con CTA | ninguna por defecto; declarada si trabaja | tres voces + CTA + logo 20–25 % | `pnpm foto:componer:cta` |
| Objeto de Plastilina protagonista | órbita sesgada (nunca mide) | objeto en reposo, voz en el tercio inferior, firma | `skewedOrbitHeroSvg` |
| Objeto de Plastilina en volumen (portada, KV, social de un objeto, escenario, merch) | la que pida la pieza (combinación con la órbita sesgada, por decidir) | un objeto protagonista, desde 160 px, voz y firma | `volumeIconUrl(glyph)` |
| Fila de íconos (deck, lámina, servicios) | ninguna propia | una voz, 48–56 px, responde uno solo o ninguno | `resolveIcon` + `auditIconGroup` |
| Deck | progreso: arco por sección; 80 px en contenido; completa al cierre | voz, cifras reales, eslogan sólo al cierre | `deckSlideHtml` |
| Portada de deck con foto | lente | foto + voz | `lensRecipe('deck-cover')` |
| Informe A4 | portada con órbita; avance/medida sólo con dato; esfera al final de la serie | voz, figuras, pie con burbuja | catálogo Insights (L 7.x es prueba) |
| Pantalla de recepción | cierre de marca en loop | órbita, logo, eslogan | `brandClose` |
| Fondo de Teams | órbita a la derecha, un solo anillo | logo abajo-derecha; izquierda libre | desde L 4.3 3/3 |
| Firma de correo personal | retrato con órbita + línea que termina en la esfera | nombre con punto, contacto, burbuja, cierre de marca, partners | `build4.mjs`, `portraitOrbitSvg`, `sphereDividerSvg` |
| Firma de equipo | órbita alrededor del ícono del área | área con punto, correo del área | `AREA=… build4.mjs` |
| Firma de respuesta | ninguna | una línea de texto | texto vivo |
| Correo de Efeonce (pie, CTA, bloque de marca) | ninguna en el pie (la órbita de medida del correo de Insights es de esa aplicación) | agenda, bloque de marca, burbuja + redes, legal, preferencias y baja, motivo; CTA principal navy | `pnpm email:resolve` (AXIS) + PNG `email-*`; Greenhouse sin adoptar |
| Muro de recepción | órbita con el logo (única vez) | logo, eslogan | arte L 4.3; vinilo Ø 1,2 m a 1,5 m |
| Mural / pasillo | lente, una por muro | foto + palabra con punto | `lensRecipe('wall')` |
| Vidrio de sala | órbita en vinilo | nombre de sala, estado en texto | arte L 4.3 2/3 |
| Estado de sala | arco = tiempo real | estado + etiqueta | elemento `state` |
| Pizarra | órbita impresa; imán = esfera | pregunta abierta | impreso + imán Ø 45 mm |
| Muro de voz | ninguna | una pregunta + una respuesta | pintura |
| Cabinas | anillo = libre, esfera = en el aire | palabra con punto | letrero |
| Directorio | ninguna; esfera por área | pregunta, áreas | arte L 4.3 1/3 |
| Señalética de servicio | ninguna | Poppins | — |
| Tazas, vasos, botellas | opcional, alrededor de la palabra | frente palabra; dorso logo | arte L 4.4/4.6/4.7 + muestra |
| Lapicero, gorra, polo | la esfera es el botón | palabra | arte + muestra |
| Llavero | argolla = anillo, cuenta = esfera | «Adelante.» / logo | arte + muestra |
| Paraguas | órbita vista desde arriba | «Siempre.» / logo en un paño | arte + prueba en tela |
| Pin | órbita en plata y teal | — | esmalte + muestra |
| Polera navy | órbita alrededor de «Hacer.» en el pecho | — | estampado |
| Hoodie | ninguna | uniforme vigente | — |
| Carnet | retrato con órbita | nombre con punto, logo, voz atrás | `portraitOrbitSvg` + arte L 4.6 |
| Credencial de evento | anillo / órbita / esfera = rol | cabecera navy, nombre con punto | arte L 4.6 3/3 |
| Tarjeta de presentación | ninguna | persona adelante; el logo solo atrás | arte L 4.6 3/3 sin la órbita del reverso |
| Caja de bienvenida | ninguna | voz en la tapa, logo en el canto | arte L 4.7 |
| Envío a clientes | un anillo afuera; sello-esfera adentro | logo chico, «Gracias.» | arte L 4.7 |
| Hoja membretada | órbita recortada en la esquina al 18 % | logo, pie que termina en la esfera | arte L 4.7 2/3 |
| Sobre | sello = esfera | logo, remitente | arte L 4.7 2/3 |
| Stand | órbita a la derecha del telón | voz en telón y pendón, logo en el mesón | arte L 4.7 3/3 + prueba en tela |
| Foco en evento | foco real | «Te hacemos visible. Y lo medimos.» | `spotlightRecipe('event')` / luz real |
| Video | órbita sola / cierre / reveal / apertura / sting | según pieza | `orbit:video`, masters v1.1 |
| Maquetas en foto | la del arte plano | la del arte plano | foto IA desde el plano + muestra física |

---

## Lo inferido en este archivo (confirmar con el operador)

1. ~~Dónde va el logo en la portada de LinkedIn~~ **decidido el 2026-10-01** (A11): abajo en la página, de 120 px bajo
   el texto en el perfil personal. *(La tensión «logo dentro de la órbita» quedó decidida el 2026-09-26, D5: §0.2.)*
2. La grilla y la existencia del post 1:1 como aplicación de la línea (A2).
3. Todo el carrusel (A4): no hay regla.
4. ~~Que el banner 1584 × 396 sea la portada de perfil/página~~ **resuelto el 2026-10-01** (A11): 1584 × 396 es la
   del perfil personal (texto desde x 480, libre la foto de perfil); la página de empresa usa 1128 × 191.
5. El webinar/transmisión (B5) y que la pantalla de recepción siga con el cierre de marca y no con el reveal.
6. Que el marcador de estado de sala se produzca con `stateMarkerSvg` / elemento `state` (D2).
7. Que la cocina no lleve logo en el muro (D3).
8. La proporción del muro de recepción descrita como «algo más de la mitad del alto» es una medida de la lámina, no
   una regla de obra; la regla física es la órbita Ø 1,2 m con su centro a 1,5 m (§0.1).
9. Si un objeto de Plastilina en volumen puede ir dentro de la órbita sesgada (A9 + A10): ninguna fuente lo dice; el
   set viene en respuesta, y la órbita sesgada pide el objeto en reposo. No combinarlos hasta que el operador decida.

---

## L. Composición por superficie (desde el 2026-09-27)

> Norma: [`EFEONCE_SURFACE_COMPOSITION_V1.md`](../../../../docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md).
> Contrato AXIS `efeonce.surface-composition` 0.1.2 (manifest `axis.surface-composition.v1`; acepta intents 0.1.0 y
> 0.1.1), tokens `efeonceGraphicLine.surfaces.<superficie>` y `pnpm surface:resolve`. **Greenhouse lo integró con
> TASK-1927 y completó el deck con TASK-1928** (las dos `complete` y en `origin/develop`); TASK-1934 sumó las nueve
> láminas SEO/AEO (tag AXIS `v0.3.23`); hoy fija `axis-tokens` **0.3.24** y `axis-ui-contracts` **0.3.22** (tag AXIS `v0.3.24`, el Glitch Flash, sin cambios para la superficie; la serie de versiones está en
> [ledger.md](ledger.md)). Ver «Contrato 0.1.2» y «Componer el deck hoy» al final de esta sección,
> [Lab](https://axis.efeonce.org/references/surfaces/). Canvas por superficie:
> [La órbita — superficies](https://claude.ai/code/artifact/04512639-c45f-4c8c-bb3b-673e8dfdbcb7), una página por
> superficie con su lámina «Guía · cómo componer …» a la izquierda. Esta sección no copia valores: los números están
> en el token.

**Cuándo aplica:** la pieza vive en `web`, `dooh`, `pdooh`, `motion`, `audiovisual` o `deck`. Social, 1:1 y la firma
de redes siguen en las tarjetas A1–A8 y en el contrato de la órbita (canal `social`).

**Cómo se trabaja:** intent (superficie, formato, papel, receta, línea, voz, prueba, pasos, foto, selección) →
`pnpm surface:resolve` en AXIS → se leen los `issues` → cada `delegate` va a su compositor de Greenhouse
(`pnpm creative:orbit:render` para órbita, lente, voz y firma; `pnpm creative:layout` o `pnpm foto:componer:cta` para
la selección; `resolveIcon` en AXIS para los íconos; `pnpm foto:prompt` → `foto:generar` → `foto:validar` →
`foto:emblema` para la ficha fotográfica; `scripts/creative/brand-motion/` para el cierre). **Nunca coordenadas ni
canal (`print`, `screen`, `social`) elegidos a mano:** los fija el `delegate`.

**Receta aprobada = una pieza con un comando (desde el 2026-09-27, TASK-1919):** `pnpm brand:compose -- --intent
<intent.json>` hace ese recorrido completo en el Artifact Composer y entrega el PDF del deck o el PNG (capas de video
con alfa), o el PDF de un documento completo si el intent trae `pages`. Tienen plantilla las aprobadas de la tabla de
abajo (el hero de teléfono, una por ancho; de motion, el último cuadro del loop y el storyboard, nunca la animación);
en el deck, las de «Componer el deck hoy». Lo que es opción o pendiente falla con
`recipe-not-approved`; el cierre de video (`close-reveal`), con `recipe-outside-composer`. Ejemplos por receta en
`src/lib/brand-surfaces/examples/`; paso a paso en el manual de uso `componer-por-superficie-con-axis.md` (Ruta A).
**Preguntas abiertas del operador** (las plantillas siguen la lámina aprobada hasta decidir): lente del caminero (token
0,70 vs ≈0,77 en la lámina), arco completo del super de dato vs la estela canónica, burbuja URL en las láminas de
sección, contenido y tríptico (el manifest dice `url-bubble-footer`, la lámina no la lleva), gris del descriptor y la
bajada web sin token, y la paleta 20 % vs 35 %.

| Superficie | Aprobado | Firma | Tarjeta vecina |
|---|---|---|---|
| Web | hero A (lente gigante), B (a sangre), C (la tableta viene hacia ti, `pov`) y teléfono con toma vertical nativa | la foto no lleva logo; firma el encabezado (opción) | A8 (CTA) |
| DOOH | caminero 12 × 4 m con lente y logo abajo a la izquierda | logo abajo a la izquierda en carretera; paleta centrada (tamaño pendiente) | §0.1 (medidas por soporte) |
| pDOOH | nada todavía (LED, mupi, spot sin audio y variantes por franja son opción) | LED bajo la respuesta, mupi centrada (opción) | J |
| Motion | animación en bucle foto-para-la-lente + reveal, y su storyboard | nunca en la toma; firma el cierre | J |
| Audiovisual | storyboard de planos «Cómo trabajamos» y escenas con generadores de texto | firma la marca en el cierre, nunca la toma | J |
| Deck | **las 69 láminas del canvas** (2026-09-27), cada una con su receta en `deck-recipes/`; con plantilla hoy (TASK-1927): sección clásica, «la órbita mide la cifra», `method-staircase` (BeX), `proposal-cinematic` (`service`, `hero`, `lines`), sección partida (tres composiciones, por la izquierda), tríptico (una palabra por toma) y el marco `cover-brochure`, `cover-proposal`, `close-brochure`, `close-proposal`; TASK-1928 sumó plantillas para las 38 restantes: **69 de 69 componen** (la portada con selección, `cover-brochure-cine-lines-selection`, desde el 2026-09-28 con el layout `document-selection`). `cover-classic` y `close-classic` no se usan | burbuja URL en el pie; logo sólo en portada, cierre o marca-sujeto | B1, B2 |

**Reglas que un agente necesita en el momento**

1. Fondo Efeonce siempre; la línea de servicio sólo aporta el acento.
2. Una esfera por pieza (cierra la respuesta) y una órbita por pieza o lámina.
3. El acento nunca en texto de menos de 24 px: el rótulo del primer paso de una propuesta va en blanco o en el suave.
4. El isotipo de la prenda llega armado en la referencia de su kit (uniformes desde el 2026-09-28, traje de Nexa desde
   el 2026-10-02) y se verifica con `pnpm foto:emblema` al 100 %; si difiere del oficial, se compone desde
   `@efeoncepro/axis-brand-assets` con `foto:isotipo`. El que dibuja el modelo sin referencia se rechaza.
5. Registro cine sólo con Nexa protagonista, en `proposal-cinematic` (casting por rol con el uniforme por registro;
   personas reales del roster con la prenda de su línea) y, por excepción aprobada el 2026-09-27, en las láminas de
   sección y «about» del deck (fuera del deck, las portadas de perfil y los destacados de Efeonce con Nexa, A11, y las
   fotos de Marketing con Manzanitas con el roster); cámara a ~2 m, 85 mm; nunca dos personas mirándose de cerca; en
   la sección partida la mirada va al panel, no al lente (operador, 2026-10-02). La foto se produce con el
   [casebook cine](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_CINE_CASEBOOK_V1.md) (`foto:cine:nueva`
   → `cine-reviewer` → `foto:validar:cine` + `foto:validar` + `foto:emblema`); la dirige `design-studio`.
6. Motion: se anima la línea, no la foto; la foto sólo se acerca, en escala logarítmica y nunca mientras entra la
   voz; tiempos desde `efeonceGraphicLine.motion` y `efeonceGraphicLine.surfaces.motion`, nunca en un script.
7. pDOOH y vía pública: sin audio; la voz se arma en 2 s como máximo; el último cuadro es el estático de respaldo.
8. Montos como `[MONTO]`; cifras sólo con fuente visible («Fuente: …» en la lámina).

**`proposal-cinematic`:** foto de cine a sangre, sujeto a la derecha que mira a cámara, lo digital o el servicio en
acción y el color saliendo de la escena; voz a la izquierda en el espacio oscuro; selección «Cliente» sobre la
respuesta; bajada; prueba con fuente; hasta cuatro pasos con íconos de la voz de la línea (Brand = Plastilina, el
resto Trazo), en reposo; burbuja URL en el pie; sin logo ni indicador. Los mini robots agentes son el hilo visual
entre láminas (robots genéricos de `NX5b`, anteriores a los Sparks: una lámina nueva con agentes los declara por
catálogo según [`SPARKS_V1.md`](../../../../docs/operations/brand-characters/SPARKS_V1.md); regenerar las aprobadas lo
decide el operador). Aprobadas: servicios creativos («¿Tu marca en cada pantalla? En todas.»), web («¿Para quién es tu
web? Para todos.»), la carrera de Nexa («¿Listos para la carrera? Vamos.»), RevOps («¿Tu CRM vende contigo? Con
agentes.»), AEO («¿Te encuentra la IA? Visible.») y líneas de servicio con Nexa. Sin pendientes. **Excepción de
esta última:** sus cinco esferas de luz (una por línea, la naranja en la palma de Nexa) son luz de la foto, no la
esfera de la voz —la respuesta cierra con una sola—, y es la única lámina con los acentos de las cinco líneas (cada
nombre de la pila en su acento, a 24 px o más). No se copia a otra pieza. Rechazadas: servicios creativos en Plastilina,
la carrera v1, Nexa y un director mirándose de cerca, líneas de servicio con Nexa sin punch.

**`method-staircase`:** el método como escalera, **sin foto**: peldaños de vidrio que se iluminan al subir y el
nivel de llegada en bloque sólido en el acento de la línea (BeX: cinco peldaños, el quinto Be Intrinsic en Engine).

**Contrato 0.1.2 (2026-09-27; publicado en AXIS con el tag `v0.3.9` y ampliado ese día por los releases `v0.3.11`
(deltas b y c del contrato), `v0.3.13` (delta e: tokens del marco) y `v0.3.14` (tipografía completa de las
contraportadas)).** Aditivo: un intent 0.1.0 u 0.1.1 se resuelve como antes. Guía AXIS
`docs/agent-composition/surfaces/deck.md`, ADR AXIS `docs/architecture/SURFACE_COMPOSITION_DECISION_V1.md` (delta
0.1.2 y deltas (b)…(l)), ejemplos en `docs/examples/surfaces/`. **En Greenhouse, `pnpm brand:compose` compone sobre
la 0.1.2 desde TASK-1927** (hoy con `axis-tokens` 0.3.24 y `axis-ui-contracts` 0.3.22).

- **Usos:** `use: 'proposal' | 'brochure'` en el deck. Toda receta aprobada admite los dos (el brochure es un PDF
  horizontal 16:9 que se lee sin presentador); una opción, sólo `proposal` (`use-not-for-recipe`). En el brochure,
  `proposal-cinematic` es la página de servicio y su eyebrow nombra el servicio.
- **Portada y cierre: el marco clásico no se usa.** `cover-classic` y `close-classic` **no están aprobadas**: el
  operador no las aprobó como portada ni contraportada (2026-09-27). En AXIS quedan `supersededBy` (brochure →
  `cover-brochure` / `close-brochure`; propuesta → `cover-proposal` / `close-proposal`) y Greenhouse no tiene
  plantilla para ellas. Historia: el primer release de la 0.1.2 (`v0.3.9`) las trajo como recetas del contrato
  (`cover-classic`: logo arriba a la izquierda con el eyebrow, voz en la mitad baja, arco corto, marca 0 de N;
  `close-classic`: órbita completa con el logo dentro y el eslogan en tres tramos, marca N de N; las dos firmaban con
  el logo y sin burbuja URL, `logo-signs-without-url-bubble`). El marco vigente es el de «Componer el deck hoy».
- **Layouts de `proposal-cinematic`:** `service` (por defecto: pregunta, respuesta y bajada; prueba opcional, hasta
  cuatro pasos), `hero` (eyebrow, pregunta, respuesta y bajada; sin prueba ni pasos; selección de Nexa) y `lines` (eyebrow
  y la frase; sin pregunta ni respuesta ni esfera de voz; la pila sale de `efeonceGraphicLine.lines`, cada palabra en
  el acento de su línea, regla `five-accents-only-in-lines`; selección del grupo con «Nexa» abajo a la derecha; lleva
  logo). `selection.anchor` declara otra esquina del colaborador.
- **Documento:** `resolveSurfaceDocument` / `validateSurfaceDocumentIntent`, manifest `axis.surface-document.v1`. En
  un brochure: portada primero, cierre al final y al menos una página `proposal-cinematic` con `layout: 'service'`;
  `sections` y la línea se propagan a las páginas; la portada y el cierre llevan siempre la línea del documento
  (`document-line-mismatch`), una página de servicio puede declarar la suya.
- **Registro cine y órbita:** en la foto de cine la luz de la línea es un fenómeno de la escena (el anillo de la
  portada del brochure, el moño de RevOps, la órbita de pantallas de servicios creativos, las cinco esferas de la
  lámina de líneas) y **cuenta como la órbita de la pieza**: una sola por pieza, sin órbita gráfica encima. Las cinco
  esferas de la lámina de líneas son luz de la foto, no la esfera de la voz (`photo-light-spheres-not-voice`). Fuente
  del registro: [`EFEONCE_PHOTO_REGISTER_CINE_V1.md`](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md)
  §9.4. Las fotos cinematográficas con Nexa (`BR1b`, `BR3`) entran desde TASK-1927 como plates de las recetas del
  marco (`cover-brochure`; `close-brochure` layout `photo` y `close-proposal`).
- **La órbita como trayectoria de la luz en una foto (caso `CR4`, 2026-09-28).** Cuando la foto trae su órbita, se
  dirige como recorrido de la mirada: **una sola órbita**, que nace en el origen del trabajo (el squad al fondo,
  desenfocado), pasa por el sujeto (las manos, nítidas) y termina en el lector; las pantallas que viajan en ella crecen
  y ganan nitidez al acercarse (**tres planos**). La forma decide el sentido: **cerrada** rodea y dirige (`CR2`,
  lámina de servicio creativa); **abierta**, del fondo al lente, entrega (`CR4`, portada «Tu squad.»). Anclada a la
  derecha, deja libre la columna de texto. Fuente:
  [registro cine §16.7](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md#167-cr4-el-squad-te-la-entrega-cambiar-el-plate-de-una-pieza-aprobada-sin-perder-su-concepto).

**Portadas y contraportadas (aprobado por el operador, 2026-09-27; norma `EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6,
resumen operativo en la skill `deck-studio` §«Portadas y contraportadas»).** Tres reglas: **foto ↔ sin foto** entre
portada y contraportada; **mensaje de la contraportada por documento** (propuesta: «Empower your Growth» como mensaje
principal; brochure: «¿Conversamos? Cuando quieras.» con el eslogan de firma); **voz de la línea en la portada**
(eyebrow, pregunta con anillo, respuesta con esfera, evidencia), nunca el eslogan. Logo de Efeonce a 500 px en 1920
(≥ `logo.minScreenPx`). Ningún texto cruza la órbita ni al sujeto. Aprobado: portadas de brochure con foto
(«¿Qué hace Efeonce? Crecer.») y una por línea de servicio con su acento (pares en `criteria.md` §4); contraportadas
de brochure (Nexa hacia la órbita, al amanecer, y la órbita gigante sin foto); portadas de propuesta sin foto con el
logo del cliente dentro de la órbita (órbita gigante y amanecer); contraportadas de propuesta con foto y «Empower your
Growth». La órbita gigante sin foto es portada de **propuesta**, nunca de brochure (en brochure sólo es
contraportada). Selección y cursores sólo sobre la columna de texto o el logo del cliente, nunca sobre la persona, un
cursor en 16:9. Desde TASK-1927 son receta del contrato y tienen plantilla (abajo); la producción idempotente de los
plates sigue siendo TASK-1926. La portada de Creative Services usa su plate propio, `CR4`, desde el 2026-09-28 (antes
repetía `CR2b` con `proposal-cinematic-creative` y el plan marcaba `plate-repeated`).

**Componer el deck hoy (TASK-1927, 2026-09-27).** Elegir **qué** lámina usar se hace con el catálogo de recetas
(`deck-recipes/`); **componerla**, con el intent de AXIS y `pnpm brand:compose`. El `layout` va siempre explícito: la
plantilla usa el que resolvió AXIS, nunca lo infiere. Ejemplos por lámina en
`src/lib/brand-surfaces/examples/deck-*-intent.json`.

**Antes de componer un deck entero, valida su plan (TASK-1929, 2026-09-28).** El plan es la lista ordenada de ids de
receta (`{ document, line?, diagnosisDone?, slides: [{ recipeId, slots?, plateRef?, progress?, purpose? }] }`):
`pnpm brand:deck-plan -- --plan plan.json` corre `validateDeckPlan` (piso AXIS `resolveSurfaceDocument` en propuesta y
brochure + reglas del catálogo que AXIS no conoce) y sale con 1 si hay error. El agente puede proponerlo con
`pnpm brand:deck-plan -- --propose --context context.json [--out plan.json]` (sólo elige ids; un reintento;
fail-closed). Tabla de códigos, forma del contexto y credenciales: skill `deck-studio` §«Plan del deck». El plan nombra
recetas, nunca plantillas ni `contentType`; el `deck-plan.json` que escribe `brand:compose` es otra cosa (el `Plan` del
composer).

**Ligar los datos reales (TASK-1930, 2026-09-28).** Los slots de **datos** del plan —logo del cliente, cifras, casos,
testimonios, logos de terceros, montos, equipo y datos de muestra— nunca se escriben a mano: los llena
`bindDeckSlots(plan, context)` (`src/lib/brand-surfaces/deck-recipes/bindings/`, `server-only`; CLI
`pnpm brand:deck-plan -- --bind --plan plan.json (--context c.json | --proposal <id> --org <org> | --sources f.json)`).
Lo que el plan traiga en un slot de datos se reemplaza por el hecho verificado o se quita, y el plan falla cerrado.
Reglas: el valor viaja en un **hecho** con `evidenceRef` (la `proposal_evidence` no guarda valores, sólo autoriza);
cifras con evidencia `measured`; casos, testimonios, logos de terceros y foto de caso con evidencia `attested` **y**
documento; **ningún deck usa evidencia interna**, ni siquiera uno interno (decisión del operador: ahí vive el costo
cargado y el margen); montos siempre `[MONTO]` hasta TASK-1417; equipo sin ligar hasta TASK-1418 (nunca una cara
generada); muro de logos con 9 autorizados o no compone; las láminas de muestra SEO/AEO quitan su marca sólo con datos
del cliente con evidencia. Mapa por slot y motivos: catálogo `deck-recipes/README.md` §«Datos reales por slot».
Biblioteca de autorizaciones por tercero fuera de una propuesta: TASK-1937 (to-do).

| Receta | `layout` | `contentType` |
|---|---|---|
| `proposal-cinematic` | `service` (o sin layout) · `hero` · `lines` | `deck.proposal-cinematic` · `.hero` · `.lines` |
| `section-classic` · `content-measure` · `triptych` | — | `deck.<receta>` |
| `method-staircase` | `steps` (o sin layout) · `flat` | `deck.method-staircase` · `.flat` |
| `section-split` | `corner-top` (o sin layout) · `corner-bottom` · `panel-end` | `deck.section-split` · `.corner-bottom` · `.panel-end` |
| `cover-brochure` (uso brochure, con foto) | `document` · `line` | `deck.cover-brochure` |
| `cover-brochure` (uso brochure, con foto y selección) | `document-selection` | `deck.cover-brochure.document-selection` |
| `cover-proposal` (uso proposal, **sin foto**) | `orbit` · `dawn` | `deck.cover-proposal` · `.dawn` |
| `close-brochure` (uso brochure) | `orbit` (sin foto) · `photo` | `deck.close-brochure` · `.photo` |
| `close-proposal` (uso proposal, con foto) | — | `deck.close-proposal` |

**Recetas con plantilla desde TASK-1928 (2026-09-27).** 34 plantillas para las 38 recetas restantes, por familia
(builders en `src/lib/brand-surfaces/recipes/`: `proposal-service.ts`, `method.ts`, `close.ts`, `proof.ts`,
`sections.ts`, `content.ts`, con ayudas en `kit.ts`):

| Familia | Receta y `layout` → `contentType` |
|---|---|
| Propuestas sobrias | `proposal-service` → `deck.proposal-service` (las cuatro láminas `proposal-service-aeo/creative/web/revops` comparten plantilla) |
| Método | `method-staircase` + `flat` · `method-score-ring` · `method-hybrid-workforce` (`ladder` por defecto · `scene`) · `decision-plan` |
| Cotización y cierre | `content-pricing` (`table` por defecto · `stage` · `live`) · `decision-next-steps` · `breather` |
| Prueba | `content-focus` · `content-clients` · `content-partners` · `decision-risk` · `decision-case` · `decision-chart` · `decision-testimonial` · `decision-why-us` |
| Secciones y quiénes somos | `section-lens` · `section-bleed` · `section-cine` (`team` por defecto · `services` · `about` · `purpose`; team y services comparten plantilla) · `content-team` · `content-stack` |
| Contenido y día a día | `contact-sheet` · `content-text` · `content-bullets` · `content-day` (`clock` por defecto · `tools` · `live-progress` · `live-results`) · `decision-agenda` |

- **Qué ya hornean** (decisiones de norma de TASK-1928, detalle en `ledger.md`): acento nunca bajo 24 px (D1), la
  respuesta ≥ 3× la pregunta (120 px en cotizaciones, plan, clientes, partners y testimonio), cifras por `figures` con
  «Fuente: …» visible, secciones de cine sin logo, «quiénes somos» y «por qué lo hacemos» sin velo sobre la foto,
  burbuja URL en el pie de `content-partners`, barras del gráfico desde su número (índice, antes = 100), logos de
  terceros normalizados, montos `[MONTO]` y contacto desde `EFEONCE_CONTACT`.
- **Los largos del catálogo son el límite.** Cada slot de la receta tiene su campo en el `slots.json` con el mismo
  largo máximo (`recipe-map.json` → `slots`, vigilado por `recipe-slot-parity.test.ts`) y el compositor rechaza lo que
  se pasa: se acorta el texto, nunca se toca la plantilla.
- **Foco del recorte:** `photo.focus` (0–1) dirige el recorte del plate sólo en las recetas que lo leen (la lente del
  reloj de `content-day` y, desde TASK-1934, la lente de `proposal-service`); sin él, el recorte es centrado. La
  sección partida sigue sin leerlo.
- **Portada con selección:** `cover-brochure-cine-lines-selection` compone desde el 2026-09-28 como
  `deck.cover-brochure.document-selection`, sobre la misma plantilla `CoverBrochure` (marca la respuesta con
  `data-gl-selection-target` y tiene un slot `selection` opcional). `recipe-map.json` ya no tiene recetas `blocked`.

**Láminas SEO/AEO con plantilla desde TASK-1934 (2026-09-28).** Nueve láminas aprobadas ese día (78 recetas en el
catálogo). Siete plantillas nuevas, una por lámina, con builder en `src/lib/brand-surfaces/recipes/seo-aeo/<receta>.ts`
(agregados en `recipes/seo-aeo.ts`) y CSS bajo `.gl-aa`, `.gl-am`, `.gl-sur`, `.gl-df`, `.gl-ee`, `.gl-ttr`, `.gl-dm`;
todas en estilo «vivo» de AXIS (`deckLiveVoice`, `deckStage`, `deckPlatform`, `deckGlass`) y con una sola órbita.

| Lámina | Familia | Receta → `contentType` | Cuándo |
|---|---|---|---|
| `decision-ai-market` | `proof` | `decision-ai-market` → `deck.decision-ai-market` | abrir SEO/AEO con el porqué ahora: tres monolitos, una cifra con fuente y año cada uno |
| `decision-ai-answer` | `proof` | `decision-ai-answer` → `deck.decision-ai-answer` | hacer visible el problema: el mismo prompt en un motor genérico, «Hoy» y «Con AEO»; colaborador «Cliente» |
| `method-surround-cycle` | `method` | `method-surround-cycle` → `deck.method-surround-cycle` | servicio continuo: la órbita tendida es el loop Surround Discovery, cuatro estaciones |
| `method-eeat` | `method` | `method-eeat` → `deck.method-eeat` | por qué la IA te citaría: cuatro letras de vidrio y el medidor |
| `decision-difference` | `proof` | `decision-difference` → `deck.decision-difference` | la comparación con agencias o con el equipo propio; alternativa genérica |
| `decision-traffic-to-revenue` | `proof` | `decision-traffic-to-revenue` → `deck.decision-traffic-to-revenue` | subir de tráfico a negocio: cuatro escalones, el corte y la trayectoria de luz |
| `decision-diagnosis-map` | `next-steps` | `decision-diagnosis-map` → `deck.decision-diagnosis-map` | cerrar con el mapa que entrega el diagnóstico; colaborador «Cliente» en el plan priorizado |
| `proposal-service-seo` | `proposal-service` | `proposal-service` (`engine`) → `deck.proposal-service` (reutilizada) | la oferta SEO sobria; la lente admite el plate de cine SE1 (`v0.3.22`) y lee `photo.focus` |
| `proposal-cinematic-seo` | `proposal-service` | `proposal-cinematic` + `service` (`engine`) → `deck.proposal-cinematic` (reutilizada) | la oferta SEO con impacto; nota del pie (`reserves.note`, `type.note`) y bajada bajo la selección (`bodyUnderSelection`) |

- **Reglas que sostiene el código:** cifras con fuente (AXIS `figure-source-required` al componer; en el plan,
  `figure-source-missing`); datos de muestra marcados («Ejemplo ilustrativo» en `decision-ai-answer`, «Datos de
  muestra» en `decision-diagnosis-map`, obligatorios mientras `dataOrigin` sea `illustrative`; con `client` se exige
  `evidenceRef`; regla AXIS `illustrative-data-marked`); interfaz de IA genérica (sólo SVG, sin nombres ni colores de
  productos; los motores como texto en el diagnóstico; regla AXIS `generic-ai-interface`); respuesta ≥ 3× (las siete
  en `ANSWER_RATIO_CONTENT_TYPES`, respuestas a 120 px) y acento ≥ 24 px, medidos por la auditoría renderizada.
- **Decisiones del operador:** la sobria y la cine son `variant` (una por deck: `variant-both-in-deck`, que rige para
  todo par `variant`); SEO y AEO son servicios distintos; `decision-difference` va en `proof` (no nace `decision`);
  `next-steps-after-diagnosis` rige por familia `next-steps`; en `decision-ai-answer` la ventana trasera se corrió a
  860 y se angostó a 450 al subir la respuesta a 120 px.
- **`proposal-cinematic-seo` va con `slots: null`** en `recipe-map.json`, como sus cuatro hermanas de cine: la
  plantilla compartida admite textos más largos que los de cada receta y el freno es `slot-over-max-chars` de
  `validateDeckPlan` (probado con un fixture adversarial). Mapear las cinco juntas queda para TASK-1933.

- **Marco:** `cover-brochure` lleva foto de cine a sangre y columna de voz, **sin burbuja URL**; en `document` y
  `line`, **sin selección** (`selection-not-in-recipe`). El layout `document-selection` (AXIS `v0.3.21`, el operador
  relajó la regla el 2026-09-28) es la excepción: misma columna y foto que `document`, selección de ocho tiradores
  sobre la respuesta («Crecer.»), nunca sobre la persona, y un solo cursor «Nexa» abajo al final (escala 1.1, sin
  overlay); la respuesta baja 28 px, la evidencia queda 130 px debajo y el logo arriba en 200. `cover-proposal` lleva el logo del cliente (o el marcador «Logo del cliente») con la selección sobre su
  caja, y la burbuja URL. `close-brochure` lleva «¿Conversamos? Cuando quieras.», el eslogan como firma, redes y
  contacto; en `orbit`, el cursor del lector con corchetes sobre la respuesta. `close-proposal` va sin voz: el mensaje
  es el eslogan «Empower your Growth». **Portada con foto ↔ contraportada sin foto, y al revés**
  (`frame-photo-must-alternate`).
- **Campos del intent que elige quien compone:** `use` (`proposal` | `brochure`; sin él AXIS resuelve el de la
  receta) · `layout` · `selection.anchor` (esquina del colaborador) · `column.topPx` (alto de la columna de voz de una
  portada, según la foto; debe caer en la reserva del logo del token o falla con `invalid-intent`) ·
  `clientLogo: { path, alt }` (SVG o PNG, `alt` obligatorio) · `body` de la portada como evidencia, con una palabra
  en negrita marcada `**palabra**` (sin marca, la primera) y saltos de línea respetados · `lines` (qué líneas entran
  a la pila de `proposal-cinematic` layout `lines`; el contenido sale de `content.lines` del manifest, que AXIS arma desde `efeonceGraphicLine.lines`). El contacto de las
  contraportadas sale de `EFEONCE_CONTACT` (`src/config/efeonce-brand.ts`); AXIS sólo define el estilo.
- **Documento:** un intent con `pages` (`{ contract?, version?, surface: 'deck', format, use, line?, sections?,
  pages }`) sale como **un PDF multipágina 16:9** en `.captures/brand-surfaces/<id>/`, con
  `<id>.surface-document-manifest.json` (`axis.surface-document.v1`), `<id>.provenance.json`
  (`efeonce.brand-surface-document.provenance.v1`) y un PNG y un PDF por página. Función pura `planSurfaceDocument`
  (`src/lib/brand-surfaces/document.ts`), que valida con `resolveSurfaceDocument`: un solo issue deja al documento
  sin plan. Códigos: `brochure-cover-first`, `brochure-close-last`, `brochure-needs-service-page`,
  `document-line-mismatch`, `frame-photo-must-alternate`, `document-pages-required`, `document-surface-invalid` y
  `page[i]:<code>`. Ejemplos: `deck-brochure-document.json` (nueve páginas) y `deck-proposal-document.json` (siete
  páginas interiores). Los plates viven fuera de git: sin el archivo, el CLI falla antes de crear la salida.
- **Sección partida:** el indicador sube por la izquierda (regla `split-indicator-rises-start`) y barre las secciones
  ya recorridas, (n−1) de N. **Pregunta abierta del operador**, anotada en el token: ¿unificar a n de N?
- **Tríptico:** una palabra por toma, cada una con su esfera; una toma con más de una palabra falla.
- **Estado (2026-09-28):** TASK-1927 y TASK-1928 `complete`, aprobadas a ojo por el operador y en `origin/develop`:
  las 69 recetas de entonces componen, gate `graphic-line` a 0 px en 66 frames (tasks en `docs/tasks/complete/`).
  TASK-1934 (en curso) suma las nueve SEO/AEO: componen (78 de 78) y el operador las aprobó a ojo el 2026-09-28, junto
  con la nota del pie de la plantilla cine; sus siete frames y el re-congelado de `ProposalCinematic` se congelaron en
  `c652f4f83` (ledger (o)): el gate `graphic-line` queda en 73 frames a 0 px. **Pendiente:**
  la ruta productiva gobernada, que debe aceptar también el documento (TASK-1921, `in-progress` en otra sesión: no está
  disponible), y TASK-1929…1932. Diferencias conocidas contra los prototipos: tamaño de «Cuando quieras.», burbuja URL
  horneada en vez de la de luminosidad, caja de selección del pintor canónico unos píxeles más ajustada.

**Cambiar la foto, el copy o la sección de una lámina (TASK-1927, 2026-09-27).** El contenido es **dato del intent**,
no de la plantilla: nunca edites una plantilla ni retoques la salida para cambiarlo.

1. Crea un intent propio **fuera** de `src/lib/brand-surfaces/examples/` (copia el ejemplo más cercano). Los ejemplos
   están vigilados por un snapshot (`src/lib/brand-surfaces/__tests__/example-plans.test.ts`): no se editan para
   producir una pieza.
2. Cambia el campo que corresponde y vuelve a componer con `pnpm brand:compose -- --intent <intent>.json`:

   | Qué | Campo | Regla |
   |---|---|---|
   | Foto | `photo.plateRef` (ruta) + `photo.alt` | `alt` obligatorio, describe la escena y no el copy; sin ruta o sin `alt`, `missing-photo`. El plate vive fuera de git (`ai-generations/**`): si falta, el CLI falla antes de crear la salida; se rehidrata con `pnpm ai-gen:pull`, nunca se regenera |
   | Copy | `voice`, `body` | reglas de voz de la receta |
   | Sección | `progress` | sección n de N |

3. Antes de elegir la foto, ten presente el recorte: lo hace el CLI (`materializeAssets` en
   `scripts/brand-surfaces/compose.ts`), que ajusta la foto al tamaño de la receta **cubriendo y centrada**. A sangre,
   el lienzo completo; en la sección partida, la franja de foto del token, más angosta que el lienzo.

- **El registro de la foto lo valida AXIS**, no Greenhouse. La sección partida admite personas en luz dramática
  (registro cine, excepción aprobada) o documental.
- **La sección partida no tiene control de foco:** el builder `sectionSplit` no lee `photo.focus`. Si el sujeto queda
  cortado, se cambia la foto por una con otro encuadre. Agregar foco exige un cambio en AXIS y otro en Greenhouse; no
  está hecho ni registrado como task. No lo prometas ni lo simules.
- **`panel-end` espeja la foto** (`photo.mirrored` de AXIS; la plantilla aplica el espejo): una foto con texto legible
  o con un logo sale al revés. El isotipo del uniforme se compone aparte: revísalo en esa composición.
- **No cambia con la foto:** panel, esquina curva, indicador y columna de voz; los fija `layout`.
- **En portadas con columna**, al cambiar la foto revisa `column.topPx` (se elige según dónde queda el sujeto).

**Añadir o modificar una receta del deck (de punta a punta; así se hicieron las 38 de TASK-1928).** Requisito: la
lámina está aprobada por el operador en el canvas y tiene su receta en `deck-recipes/`. Nunca una plantilla sin
receta, ni una receta sin aprobación.

1. **AXIS primero** (repo `axis-design-system`; flujo de release en la skill `axis-design-system`): la receta o la
   composición nueva en `efeonceGraphicLine.surfaces.deck.recipes.<receta>` (`packages/tokens/src/tokens.ts`:
   `status`, `uses`, `voice`, `type`, `reserves`, `selection`, `layouts[<layout>]` con `requires` / `forbids` /
   `references`) y su prueba en `packages/contracts/src/surface-composition.test.ts`; si AXIS no mide todo lo que la
   lámina pinta, se agrega el token antes de escribir la plantilla. Delta en el ADR
   `docs/architecture/SURFACE_COMPOSITION_DECISION_V1.md` y release (tokens + contracts republicado).
2. **Validar antes de publicar:** copia temporal de `packages/tokens/dist` de AXIS sobre
   `node_modules/@efeoncepro/axis-tokens/dist` en Greenhouse, componer y correr el gate; después reinstalar la versión
   fijada ([lessons.md](lessons.md), 2026-09-27).
3. **Greenhouse fija las dos versiones** exactas en `package.json` (`axis-tokens` y `axis-ui-contracts`), instala con
   la credencial efímera y corre `pnpm brand:tokens` (regenera `graphic-line-tokens.json` y los `graphic-line-tokens.css`
   de los catálogos; `--check` detecta deriva).
4. **Builder** en `src/lib/brand-surfaces/recipes/<familia>.ts` (ayudas en `kit.ts`), registrado en
   `src/lib/brand-surfaces/index.ts`. Mezcla el token base con el de la composición y **devuelve su `contentType`**
   si la composición tiene plantilla propia. Los valores salen del manifest; nunca coordenadas en el builder.
5. **Plantilla** `<slug>.html` + `<slug>.slots.json` en `src/lib/artifact-composer/catalogs/graphic-line-deck/`, con un
   prefijo CSS propio, y su entrada en `registry.json` (`name`, `contentTypes`, `prototype`, `slotsRef`). Si lleva
   selección o cursor, se agrega a `TEMPLATES_WITH_SELECTION` / `TEMPLATES_WITH_READER_CURSOR` o al hook de
   selección por ítem o nivel en `index.ts`; si es de decisión con respuesta grande, a la lista 3× de
   `graphic-line-shared/rendered-audit.ts`. Una variante que es la misma lámina con una capa más **reusa** la
   plantilla (slot opcional + entrada en `contentTypes`) en vez de duplicarla. **Todo slot opcional nuevo en una
   plantilla compartida lleva un test que componga una receta existente SIN el slot**: el probe del gate siempre lo
   rellena y los snapshots de planes no renderizan ([lessons.md](lessons.md), 2026-09-28, TASK-1934).
6. **Mapa y ejemplo:** fila en `recipe-map.json` (`contentType`, `example`, `slots` receta → campo del `slots.json`)
   e intent de ejemplo `src/lib/brand-surfaces/examples/deck-<id>-intent.json` (entra al snapshot de
   `__tests__/example-plans.test.ts`; actualízalo sólo por este alta). Si el alta o el cambio toca
   `EFEONCE_DECK_SLIDE_RECIPES_V1.json`, **corre siempre `pnpm brand:deck-recipes`**: reescribe el índice del README
   **y** el catálogo de runtime `src/lib/brand-surfaces/deck-recipes/catalog.generated.json` (TASK-1929). `--check`
   falla si cualquiera de los dos difiere, y el test `deck-recipes/__tests__/catalog-drift.test.ts` lo corre en la
   suite (CI).
7. **Paridad:** `recipe-slot-parity.test.ts` (campo, tipo, obligatoriedad y el mismo largo máximo; en una plantilla
   compartida manda el mayor), `recipe-map.test.ts` y `plan-surface-piece.test.ts`.
8. **Gate y registro:** componer el ejemplo con `pnpm brand:compose` y compararlo **a ojo** con la referencia
   aprobada; declarar la alta o el cambio en `BASELINE_DELTAS.md`; `pnpm composer:visual-gate --catalog=graphic-line
   --freeze` (single-owner, serializado y atómico con su commit; runbook `composer-visual-gate.md`) y luego el gate a
   0 px. Anotar la decisión en [ledger.md](ledger.md) y lo aprendido en [lessons.md](lessons.md).

Modificar una receta existente es el mismo recorrido desde el paso que corresponda: un cambio de valor empieza en AXIS
(paso 1); un cambio de largo, en la receta aprobada y la paridad (paso 7), nunca sólo en el `slots.json`.

**Recetas por lámina (aprobado por el operador, 2026-09-27).** Las 69 láminas del canvas «Deck» están aprobadas y
tienen receta en [`deck-recipes/`](../../../../docs/operations/brand-graphic-line/deck-recipes/README.md) (JSON
`efeonce.deck-slide-recipes.v1`; índice por familia y documento con `pnpm brand:deck-recipes`). Decisiones de ese día
que cambian lo de arriba: **tríptico** con una palabra por toma y su esfera («Escucha.» «Crea.» «Mide.»); **sección
partida** con el indicador por la izquierda y tres variantes (esquina arriba, esquina abajo, panel a la derecha);
**cotización** en tres variantes (tabla, escena, en vivo), sólo en propuesta; **día a día** con cuatro momentos,
herramientas y dos «vívelo»; **próximos pasos** con la agenda abierta; **clientes** en un tono navy (con la excepción
tonal de Aguas Andinas y UC Temuco); **caso Sky** con foto de ejemplo; **BeX** con la escalera como principal; y la
**excepción del registro cine** para secciones y «about». Norma: `EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6 «Recetas por
lámina» y delta (c); manual: `docs/manual-de-uso/creative/componer-deck-con-recetas.md`. El 2026-09-28 el operador
aprobó nueve láminas SEO/AEO más (78 en total; arriba, «Láminas SEO/AEO con plantilla desde TASK-1934») y decidió que
dentro de un par `variant` la otra no entra al deck, seguida o no. El 2026-09-29 aprobó las 19 láminas del **deck de práctica Salesforce** (94 recetas; 16 nuevas sin plantilla todavía y cuatro láminas registradas como `approvedUses` de recetas existentes): orden en cinco actos, marcas de terceros con condición, badge como claim (`partnerMark`) y el deck HubSpot pendiente en la norma §4.6, «Deck de práctica Salesforce» (TASK-1942, TASK-1943). Al canonizar decidió además: las cuatro láminas que no cabían en sus recetas nacen como `decision-diagnosis-verdict` (SF5), `method-waves` (SF10), `content-day-live-console` (SF11) y `content-day-live-approval` (SF18); **dos cierres** según el documento (brochure: `close-brochure-orbit` en la línea `revenue-salesforce`, lámina todavía por componer y con visto bueno pendiente; propuesta: `cover-proposal-orbit` … SF19 `close-proposal-horizon` en la composición `sloganBlock`), con los dos planes validados como fixtures (`src/lib/brand-surfaces/deck-recipes/__tests__/fixtures/golden-{brochure,proposal}-salesforce.json`, con `plateRef` NXSF2/NXSF1/NXSF3 para no caer en `plate-repeated`); **logo de 700 px sólo en la contraportada Salesforce** (las del 2026-09-27 siguen a 500 px); la **columna de la portada en 190** con reserva propia de la línea `revenue-salesforce` en AXIS `v0.3.32` (`reservesByLine` de la composición `line`); y el servicio de SF16 se llama «Enablement conversacional». Después dijo «Todo está aprobado» y declaró la insignia «Salesforce Partner» autorizada por Salesforce: SF20 aprobada, la insignia por defecto en SF0 y SF19, los largos de SF6 y SF7 aprobados tal cual y el costo de color de SF1 y SF8 aprobado (abajo).

**El deck de práctica Salesforce, componible (TASK-1942, 2026-09-29; `f05c26e2f`).** Las 94 recetas del catálogo tienen
plantilla: las 16 nuevas componen con `pnpm brand:compose` sobre AXIS 0.3.33 (familia `line-stage`: builders en
`src/lib/brand-surfaces/recipes/line-stage/`, plantillas y `slots.json` en
`src/lib/artifact-composer/catalogs/graphic-line-deck/`, intents de ejemplo en `src/lib/brand-surfaces/examples/`), y el
baseline quedó sellado en la sección (s) de `BASELINE_DELTAS.md`. Cómo se arma según el documento:

| Documento | Portada | Cuerpo (orden aprobado) | Cierre | Plan golden |
|---|---|---|---|---|
| **Brochure** | `cover-brochure-line-revenue` (línea `revenue-salesforce`, columna 190, «Brochure · Servicios Salesforce», **insignia por defecto**) | SF6 → SF1 → SF4 → SF3 → SF8 → SF9 → SF2 → SF18 → SF16 → SF12 → SF13 → SF5 → SF10 → SF14 → SF15 → SF11 → SF17 | `close-brochure-orbit` en `revenue-salesforce` («¿Conversamos? Cuando quieras.» + eslogan; **SF20, aprobada** el 2026-09-29; intent `deck-close-brochure-orbit-revenue-salesforce-intent.json`) | `golden-brochure-salesforce.json` |
| **Propuesta** | `cover-proposal-orbit` (sin foto, con el logo del cliente). El PDF de dirección usa en cambio la portada con foto de SF0 con el rótulo «Propuesta · Servicios Salesforce» (`DOC=propuesta`) | el mismo | `close-proposal-horizon` en la composición `sloganBlock` (SF19, logo 700 px, **insignia por defecto**) | `golden-proposal-salesforce.json` |

Los planes viven en `src/lib/brand-surfaces/deck-recipes/__tests__/fixtures/` y se validan con
`pnpm brand:deck-plan -- --plan <fixture>` (0 errores; `plateRef` NXSF2/NXSF1/NXSF3 evita `plate-repeated`). Condiciones
que viajan con el deck y que un agente no resuelve solo:

- **Insignia «Salesforce Partner» (`partnerMark`) = claim autorizado.** Salesforce autorizó su uso (declarado por el
  operador el 2026-09-29): el deck la lleva **por defecto** en SF0 y SF19, y el intent la pide con
  `"partnerMark": { "mode": "badge", "readbackRef": "salesforce-partner-authorization-2026-09-29" }` (intents de ejemplo y planes golden).
  `readbackRef` sigue siendo obligatorio: la insignia de cualquier otro partner, sin su autorización o readback, falla
  cerrado. Respaldo que no afirma nada: «Operamos sobre» + logo de Salesforce
  (`deck-cover-brochure-line-revenue-salesforce-operates-on-intent.json`; `SIN_BADGE=1` en
  `ai-generations/2026-09-29_deck-salesforce/render-src/salesforce.mjs`). La insignia no afirma un tier.
- **Marcas de terceros:** logo e íconos de producto de Salesforce, **autorizados por Salesforce** (misma declaración;
  archivar la copia escrita es recomendado, no bloqueante). **Claude y Claudeforce** (SF16) esperan la autorización
  escrita de Anthropic (TASK-1937). Agent Astro es una edición interpretativa y va sólo por ruta local, nunca en un
  package de AXIS. Detalle en [package-and-tokens.md](package-and-tokens.md) §6.
- **Largos aprobados tal cual (2026-09-29):** la pregunta de SF6 (`proposal-cinematic-revops.question`, máximo 30) y
  los nombres de paso de SF7 (`proposal-service-revops`, nombre ≤ 28, también en `proposal-service.slots.json`). El
  costo de color de los íconos de producto en SF1 y SF8, aprobado. Ojo: `validateDeckPlan` mide un slot `text` con su
  marcado, y el cuerpo de SF6 (124 visibles, 128 con `**`) pasa el máximo de 125 si se liga literal.
- **Datos de muestra** marcados en SF11, SF13 y SF15; SF17 sin cifras; montos `[MONTO]`; SF9 con corte 2026-09-18 y
  fuera de un brochure evergreen.
- **Plates** `NXSF1`–`NXSF3` son rutas locales de `ai-generations/` hasta el banco de plates (TASK-1931; si faltan,
  `pnpm ai-gen:pull`): el Job
  `artifact-worker` no los lee. El plate SF1 de la arquitecta está rechazado y no entra.

**PDF de la propuesta y del brochure (con insignia):** `ai-generations/2026-09-29_deck-salesforce/out/Efeonce-Propuesta-Servicios-Salesforce.pdf`
y `Efeonce-Brochure-Servicios-Salesforce.pdf` (19 páginas 1920×1080), generados por
`node ai-generations/2026-09-29_deck-salesforce/render-src/pdf-propuesta.mjs` (`DOC=brochure` para el brochure, que
cierra con SF20; `SIN_BADGE=1` para el respaldo sin insignia) desde las láminas aprobadas en `out/` (la portada
`SF0-portada-propuesta` se genera antes con `DOC=propuesta ONLY=SF0-portada node …/salesforce.mjs`). Es el artefacto de
dirección, no la salida del Composer; `out/` no está en git (los `.mjs` de `render-src/` sí; si `out/` falta,
`pnpm ai-gen:pull ai-generations/2026-09-29_deck-salesforce`). Antes de enviarlo, SF16 sigue sujeta a la autorización de
Anthropic.

**El deck SEO/AEO (Search Visibility 360; TASK-1949, aprobado el 2026-09-30).** El operador aprobó el deck de la
práctica SEO/AEO (línea Engine) en tres documentos —**completo** (33, brochure extendido), **brochure** (24) y
**propuesta** (29)— con cinco capítulos (el problema · SV360 y SEO · AEO · cómo trabajamos · por qué nosotros; el mismo
`progress.sections` en todas las páginas). SEO va al nivel de AEO: SV360 es la marca paraguas y sus piezas, AEO
Assessment, AI Visibility Report e Insights. Recorrido, reglas y pendientes: norma §4.6 «Deck SEO/AEO»; fuente de hechos
`ai-generations/2026-09-29_deck-seo-aeo-documentos/{CANON-INVENTARIO,DECISIONES}.md`.

| Documento | Portada | Cierre | Plan golden | Intent de documento (ejemplo) |
|---|---|---|---|---|
| Completo | `cover-brochure-line-engine` (logo SV360 en 140,790 h64) | `close-brochure-orbit` | `golden-completo-seo.json` | `deck-seo-completo-document.json` |
| Brochure | la misma | `close-brochure-orbit` | `golden-brochure-seo.json` | `deck-seo-brochure-document.json` |
| Propuesta | `cover-proposal-orbit` (logo SV360 en 140,880 h56) | `close-proposal-horizon` «Empower your Engine» | `golden-proposal-seo.json` | `deck-seo-propuesta-document.json` |

- **Seis recetas nuevas, sin plantilla todavía** (Slice 2): `content-brand-family`, `content-service-mockups`,
  `content-report-formats`, `content-committee-deck`, `content-industries`, `content-markets` (100 recetas; 94 con
  plantilla). Estilo «vive» (plataforma de luz, fichas de vidrio, una sola sombra profunda, haces de luz) y maquetas
  nativas grandes, nunca capturas chicas. Hasta el Slice 2 el PDF aprobado se hornea con `render-src/bake.cjs`.
- **Slots opcionales:** `productMark` (lista cerrada de lockups de `axis-brand-assets` 0.4.5: SV360, AEO, AEO Assessment,
  AI Visibility Report, Insights; uno por lámina, donde la lámina habla de esa pieza; obligatorio sólo en
  `content-brand-family`); el eyebrow de `proposal-cinematic-seo`/`-aeo` con `requiredUnless: productMark` (el lockup
  ocupa su lugar en 140,112 h40); `section-cine-team.body` (roles en personas). Pendientes de plantilla en
  `PENDING_TEMPLATE_SLOTS` (`recipe-slot-parity.test.ts`).
- **Fotos:** cine sólo en `section-split` (SX4) y `proposal-cinematic-web` (DV1); casos en **puesta en escena** con la
  imagen de ambiente del cliente y su logo **compuesto** desde el archivo oficial (excepción `caso` de `foto:prompt`,
  `bb7e34b37`); MK2 de `content-markets` no es cine. Plates por ruta local hasta TASK-1931.
- **Los datos van tal cual (decisión del operador, 2026-09-30):** «Deja esos datos... No marques nada en el deck como
  provisional, asumo la responsabilidad.» Cifras de los casos, su fuente, formatos de Insights, industrias y la cifra
  de Bresler, sin marca de «provisional» ni «próximamente»; un agente no los rotula ni los quita. Contexto, sólo como
  registro (`DECISIONES.md`): las cifras reales de los casos no se han cargado; al 2026-09-30 el correo de Insights que
  llega solo no está vivo y el modo presentación no se ha probado con una edición real. Sigue la condición de los logos
  de BICECORP, Banco BICE y Berel (autorización, TASK-1937; el BICE argentino, descartado). Anotaciones «de ejemplo»
  fuera de la lámina; se quedan `mark`, `sampleMark` y `report.sample`.
- **Una sola sección partida por deck;** contraportadas sin cambios; cuatro usos pasan un largo (el `fit` lo dice).

**Lo inferido en esta sección (confirmar con el operador):** que `proposal-cinematic` se quede sin indicador de deck
en versiones futuras (así se aprobaron las piezas); que la firma por soporte de web, paleta, LED y mupi pase de
opción a canon.

## Botones de marca del Lab AXIS (2026-10-04)

Aplicación: CTA y acciones en superficies de marca; componente portable optativo, no recolor de
interfaces existentes. `line` identifica el contexto de negocio y `tone` conserva la función.
Usar para una acción de esa línea; evitar mezclar varios acentos principales en la misma jerarquía.
Radio/medidas comunes, loader orbital y flecha opcional. Fuente y ejemplos: [lab-components.md](lab-components.md).
Verificado contra: axis-design-system@1bccb3f — 2026-10-04; adopción de productos separada.

Evidencia de distribución de botones: [auditoría](../../../../docs/audits/2026-10-04-axis-buttons-release.md).
