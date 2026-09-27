# Aplicaciones de «La órbita» — guía por pieza y por espacio

Verificado contra: greenhouse-eo@7cb24df17 · axis-design-system@a5c21ae (íconos: AXIS `main@5b8ab20`, tag `v0.3.6`)
— 2026-09-26 (decisiones del operador D1–D22 del 2026-09-26 registradas; ver `ledger.md`)

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
    Nunca en cada post, nunca con esfera, nunca traducido ni en mayúsculas.
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

### A7. Avatar e ícono

- **Va:** el **isotipo** en negativo sobre un círculo navy, ocupando el **60 % del ancho**; ícono de app o favicon en
  cuadrado redondeado con el mismo margen.
- **Nunca:** otra órbita alrededor del isotipo (ya es una órbita) · recolorearlo · recortarlo con un círculo que lo
  corta · logo completo en un avatar.
- **Tamaño mínimo:** isotipo 24 px en pantalla; a 16 px el favicon se valida aparte.
- **Fuente:** L 3.3, L 5.5; M §8.4.

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

---

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

### B4. Deck de Insights y correo de aviso

- **Deck de Insights:** portada, figura y cierre en 16:9; la órbita chica de la esquina es la navegación (3 de 5); pie
  con logo, edición, burbuja URL y folio (excepción aprobada). **Correo de aviso (640 × 900):** pregunta del mes y
  respuesta «Tu informe está listo», misma voz.
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

---

## C. Correo

### C1. Firma de correo personal (v3.1, aprobada 2026-09-26)

- **Para qué:** la firma de cada persona en Outlook. Dos versiones aprobadas: **A · sobre papel** y **B · tarjeta
  navy** (B se reconoce de lejos en la bandeja y funciona en modo oscuro sin cambios).
- **Lienzo:** 460 px de ancho máximo en escritorio; fluida en móvil (vista de 360 px en L 4.5).
- **Zonas en orden fijo** (T `emailSignature.zones`; las opcionales se omiten, el orden no cambia):
  foto con órbita (96 px, `portraitOrbitSvg`) → nombre y cargo (el nombre es la única voz de titular: Bricolage 800,
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
- **Cómo se produce:** `ai-generations/2026-09-26_firma-partners/build4.mjs` con `HOST_BASE=https://storage.googleapis.com/efeonce-group-axis-public-media/email-signature/v3.1/`
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
  referencia es la lámina 4.3 (generador del canvas en `ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/`);
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
| Portada LinkedIn 1584×396 | órbita a la derecha con halo, un solo anillo, sin el logo adentro | promesa con esfera + mecanismo | `composeGraphicLine` desde L 4.1 |
| Avatar / favicon | ninguna (el isotipo ya es órbita) | isotipo al 60 % | archivo oficial |
| Ad con CTA | ninguna por defecto; declarada si trabaja | tres voces + CTA + logo 20–25 % | `pnpm foto:componer:cta` |
| Objeto de Plastilina protagonista | órbita sesgada (nunca mide) | objeto en reposo, voz en el tercio inferior, firma | `skewedOrbitHeroSvg` |
| Fila de íconos (deck, lámina, servicios) | ninguna propia | una voz, 48–56 px, responde uno solo o ninguno | `resolveIcon` + `auditIconGroup` |
| Deck | progreso: arco por sección; 80 px en contenido; completa al cierre | voz, cifras reales, eslogan sólo al cierre | `deckSlideHtml` |
| Portada de deck con foto | lente | foto + voz | `lensRecipe('deck-cover')` |
| Informe A4 | portada con órbita; avance/medida sólo con dato; esfera al final de la serie | voz, figuras, pie con burbuja | catálogo Insights (L 7.x es prueba) |
| Pantalla de recepción | cierre de marca en loop | órbita, logo, eslogan | `brandClose` |
| Fondo de Teams | órbita a la derecha, un solo anillo | logo abajo-derecha; izquierda libre | desde L 4.3 3/3 |
| Firma de correo personal | retrato con órbita + línea que termina en la esfera | nombre con punto, contacto, burbuja, cierre de marca, partners | `build4.mjs`, `portraitOrbitSvg`, `sphereDividerSvg` |
| Firma de equipo | órbita alrededor del ícono del área | área con punto, correo del área | `AREA=… build4.mjs` |
| Firma de respuesta | ninguna | una línea de texto | texto vivo |
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

1. Dónde va el logo en la portada de LinkedIn, ahora que no va dentro de la órbita (A6). *(La tensión «logo dentro de
   la órbita» quedó decidida el 2026-09-26, D5: §0.2.)*
2. La grilla y la existencia del post 1:1 como aplicación de la línea (A2).
3. Todo el carrusel (A4): no hay regla.
4. Que el banner 1584 × 396 sea la portada de perfil/página, y dejar libre la zona de la foto de perfil (A6).
5. El webinar/transmisión (B5) y que la pantalla de recepción siga con el cierre de marca y no con el reveal.
6. Que el marcador de estado de sala se produzca con `stateMarkerSvg` / elemento `state` (D2).
7. Que la cocina no lleve logo en el muro (D3).
8. La proporción del muro de recepción descrita como «algo más de la mitad del alto» es una medida de la lámina, no
   una regla de obra; la regla física es la órbita Ø 1,2 m con su centro a 1,5 m (§0.1).
