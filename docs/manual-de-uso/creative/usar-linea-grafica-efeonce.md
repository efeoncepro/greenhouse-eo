# Usar la línea gráfica de Efeonce — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.2
> **Creado:** 2026-09-25 por Claude
> **Ultima actualizacion:** 2026-09-26 por Claude
> **Modulo:** Creative · marca propia de Efeonce (línea gráfica «La órbita»)
> **Ruta en portal:** no aplica — es un sistema de marca; los valores viven en AXIS y el PDF se regenera con un comando local
> **Documentacion relacionada:** [Documentación funcional](../../documentation/creative/linea-grafica-efeonce.md) · [Manual técnico-operativo V1](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) · [ADR «La órbita»](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md) · [Producir una foto de marca](../marketing/fotografia-de-marca-efeonce.md)

## Para qué sirve

Este manual explica cómo hacer una pieza de Efeonce con la órbita (post, slide, portada, informe, merch, papelería,
señalética) sin romper sus reglas, cómo usar las animaciones de marca (la órbita y las tres animaciones del logo) y
cómo regenerar el manual en PDF cuando cambia su fuente.

La órbita es la forma canónica de la marca propia de Efeonce y de su familia (Globe, Wave, Reach). **No se usa** en la
interfaz de Greenhouse ni en el trabajo de clientes.

## Antes de empezar

- **Confirma que la pieza es de Efeonce** (o de Globe, Wave o Reach). Si es para un cliente o para la UI del portal,
  este manual no aplica.
- **Abre la referencia viva:** [axis.efeonce.org/references/graphic-line](https://axis.efeonce.org/references/graphic-line).
  Muestra cada elemento en HTML nativo, con sus valores.
- **Ten a mano el manual técnico** ([`EFEONCE_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md)):
  ahí están las medidas exactas por formato, color y aplicación.
- **Toma los valores de los tokens**, no de una captura ni de este manual: `efeonceGraphicLine` en
  `@efeoncepro/axis-tokens` (grosores, proporciones, paleta, reglas de logo e isotipo). Si trabajas en código, impórtalos;
  nunca transcribas HEX o px a mano.
- **Ten los archivos oficiales:** logo e isotipo desde `public/branding/` (o la carpeta de Branding en OneDrive) y la
  burbuja de URL (`url-lum.svg`, o sus variantes horneadas `url-lum-light.svg` y `url-lum-dark.svg` en
  `docs/operations/brand-graphic-line/deliverables/assets/`). En código, la fuente es el paquete
  `@efeoncepro/axis-brand-assets` (logo e isotipo de las cuatro marcas y las tres burbujas).
- **Si la pieza lleva foto en la lente**, parte del banco de ocho tomas en `ai-generations/2026-09-25_banco-lente-orbita/`
  o produce una nueva con el lenguaje fotográfico (ver paso 4).

## Paso a paso — hacer una pieza con la órbita

### Paso 1 · Decide qué trabajo hace la órbita

| Si la pieza… | Usa | Nota |
|---|---|---|
| cierra una idea con una palabra | el **punto final**: la esfera al final de la respuesta | titulares, firma de mail, taza blanca |
| enmarca una palabra, una portada o un objeto | la **órbita** (anillo + arco + esfera + halo) | portadas, cierres, objetos |
| muestra un avance medido | el **arco de avance** | sólo si tienes el dato real; sin dato, no hay arco |
| destaca dónde está la decisión en una foto | la **lente** | exige una foto con un punto de interés claro |

Una sola órbita o una sola lente por pieza. **Si la pieza no necesita ninguno de estos trabajos, no lleves órbita**:
la órbita no va por defecto y no reemplaza la composición de la foto. Si la usas, decláralo a propósito.

### Paso 2 · Elige el contexto de color

| Fondo | Acento de la esfera, arco y anillo |
|---|---|
| Oscuro Efeonce (navy) | teal claro de Efeonce |
| Papel o blanco (Efeonce) | teal oscuro, **sólo como gráfico**; el texto va en navy |
| Producto (Globe, Wave o Reach) | el acento de ese producto; nunca el teal |

Un acento por pieza. Los valores exactos están en los tokens y en el §2 del manual técnico.

### Paso 3 · Ubica el texto y la órbita

1. Pon la órbita con su centro **fuera del eje**, hacia la derecha y arriba.
2. Deja el texto en el **tercio inferior izquierdo**.
3. Revisa que **ningún texto cruce la órbita**: ni el titular, ni la bajada, ni la firma. Si no cabe, reduce el copy
   o mueve la órbita; nunca la pongas detrás del texto.
4. En redes (lienzos de hasta 1200 px de ancho), usa los grosores de la variante para redes (×1,75) que definen los
   tokens.

### Paso 4 · Si hay foto, prepárala para la lente

- Usa una toma del banco o produce una nueva con la cadena del lenguaje fotográfico: arma la ficha y corre
  `pnpm foto:generar <ficha.json>` (o `pnpm foto:prompt` + `pnpm foto:validar`). Nunca armes el prompt a mano.
- La toma debe tener el sujeto dentro de un círculo del 55 % del lado corto, **sin emblemas legibles** (el logo lo pone
  la pieza, no la ropa) y en registro documental: nadie mira a la cámara.
- No le pongas velo oscuro encima: fuera del círculo la foto va en navy apagado, dentro va a todo color.
- Respeta la composición de la foto: la órbita nunca cruza el sujeto, el espacio reservado para el texto, el lecho
  (la zona oscura donde se apoya el texto) ni la firma.

### Paso 5 · Escribe la voz

- **Pregunta:** chica, en Poppins Light, una pregunta real del cliente.
- **Respuesta:** en Bricolage, de una a tres palabras, al menos tres veces más grande que la pregunta, cerrada con la
  esfera.
- **Evidencia (opcional):** un dato, fuente o mecanismo en Poppins, con una palabra en negrita.
- Tuteo neutro, sin voseo. Los pares de copy del manual son **candidatos sin aprobar**: úsalos como referencia, no como
  copy final.

### Paso 6 · Firma la pieza

1. **Pieza gráfica (post, anuncio, portada con foto):** firma con el **logo de Efeonce centrado abajo**. No agregues la
   burbuja de URL.
2. **¿El logo de Efeonce ya aparece dentro de la imagen** (una maqueta, un objeto, una prenda)? Entonces no repitas el
   logo: firma con la **burbuja URL, centrada y con fusión de luminosidad**, sola. Nunca a un costado ni junto al logo.
3. Mide el contraste de la burbuja-firma: debe llegar a **4,5:1**. En la práctica sólo lo logra sobre un fondo muy
   oscuro; sobre fondos medios o claros no llega (1,6–3,1:1). Si no llega, la pieza no pasa.
4. Fuera de las piezas gráficas: logo completo si cabe a 96 px o más; si no, el isotipo. **Nunca los dos en la misma
   vista.**
5. La órbita **nunca rodea el logo**. En objetos, el logo va solo en el dorso.

- Los pies con la burbuja (deck, informe, papelería, stand, firma de mail) siguen como siempre.
- Si aparece `efeoncepro.com`, usa la **burbuja oficial**, no la dirección escrita. En web y en herramientas que
  soportan fusión, el SVG gris con fusión de luminosidad; en PDF, correo, visores o referencias para IA, la variante
  horneada (`url-lum-light.svg` sobre blanco o papel, `url-lum-dark.svg` sobre navy).
- El eslogan «Empower your Growth» sólo va en cierres (último slide, contratapa, firma, final de video) y desde el
  archivo oficial.

### Paso 7 · Revisa antes de entregar

- [ ] Una sola órbita o lente en la pieza, y sólo si hace un trabajo (rodear, medir, enfocar); nunca sobre el sujeto,
  las reservas de texto, el lecho ni la firma.
- [ ] La pieza gráfica firma con el logo centrado; la burbuja URL sólo si el logo ya está en la imagen, centrada, sola
  y con ≥ 4,5:1 medido.
- [ ] Ningún texto cruza la órbita.
- [ ] Si hay arco de avance, mide un dato real.
- [ ] Un solo acento; el teal no aparece en una pieza de producto.
- [ ] La URL va en su burbuja y se ve gris, no negra.
- [ ] El logo o el isotipo desde el archivo oficial, con su área de resguardo; nunca los dos juntos.
- [ ] La foto no tiene emblemas legibles ni velo encima.
- [ ] Mira la pieza al 100 % y en el tamaño real en que se verá (en redes, también a 390 px de ancho).

Publicar, imprimir o mandar a producir requiere la autorización del operador; este manual no la reemplaza.

## Paso a paso — componer una pieza con un agente

Un agente no dibuja la órbita a mano: declara qué hace en la pieza y AXIS resuelve el resto.

1. **Escribe la intención** (`intent.json`): el lienzo (`width`, `height`, `brand`, `surface`, `channel`) y los
   elementos. Por ejemplo, una lente con su foto del banco, el par pregunta y respuesta, y la firma.
   Elementos posibles: `orbit`, `measure`, `progress`, `lens`, `spotlight`, `family-map`, `url-bubble`, `voice`,
   `logo-inline`, `signature`, `slogan`, `state` y `brand-close`.
   - **La firma** (`signature`): por defecto el logo de Efeonce, centrado abajo. Si el logo de Efeonce ya aparece
     en la imagen (mockup, objeto, merch), declara `"brandInScene": true` y firma la burbuja URL, centrada y con
     fusión de luminosidad. La burbuja sólo pasa el contraste sobre un fondo muy oscuro.
   - **La órbita** se usa en casos puntuales (lente, medida, progreso, foco); no reemplaza la composición de la
     foto. Declara en `protect` el sujeto y las reservas de texto: la órbita no puede cruzarlos.
   - **En campañas**: `pnpm creative:layout` declara la firma con `brand.signature: { brand_in_scene }` (logo centrado
     sin URL, o burbuja centrada sin logo) y `pnpm foto:componer:cta` con `marcaEnEscena: true` + `url` y sin `logo`.
2. **Resuelve**: `pnpm creative:orbit:resolve -- --input intent.json --out manifest.json`. Si la intención rompe
   una regla (dos anillos en la pieza, una medida sin fuente, una respuesta de más de tres palabras), el comando
   falla y dice cuál.
3. **Escribe los bindings** (`bindings.json`): dónde está cada cosa medida en tu composición (objetos, fotos,
   lugar de la burbuja, cajas de texto). La respuesta lleva además `fontSize`, `baseline` y `lastChar` para
   cerrar con su esfera.
4. **Pinta y revisa**: `pnpm creative:orbit:render -- --intent intent.json --bindings bindings.json --out-dir out/`.
   Deja `piece.svg`, `piece.png`, `manifest.json` y `qa.json`. Si un texto cruza el anillo, la URL aparece como
   texto, la firma queda descentrada o bajo 4,5:1, o la órbita cruza el sujeto, sale con error y `qa.json` dice cuál.
5. **Mira el PNG al 100 %** antes de usarlo: el chequeo del sujeto dentro de la lente es visual.

> Detalle técnico: contrato `efeonce.graphic-line-orbit` 0.3.0 (`stable`) en `@efeoncepro/axis-ui-contracts`
> 0.3.0; archivos oficiales en `@efeoncepro/axis-brand-assets` 0.3.0 (Greenhouse los fija en `develop`; llegan a
> producción con el próximo release); capa opcional en `pnpm creative:layout` (`graphic_line` por formato); adapter en
> `scripts/creative/layout-compiler/graphic-line.mjs`; manual del contrato en AXIS
> `docs/agent-composition/graphic-line-orbit.md`. Fuera de Greenhouse (por ejemplo en el Lab), la órbita, sus recetas
> (lente, foco, deck, retrato de la firma de mail) y su movimiento salen del paquete `@efeoncepro/axis-graphic-line`
> 0.3.1; Greenhouse no depende de él.

## Paso a paso — usar las animaciones de marca

Hay dos tipos de animación. Ninguna se genera con un modelo de video (el logo no se sostiene) y ninguna es para
clientes ni para la UI de Greenhouse.

| Animación | Qué hace | Dura | Úsala en |
|---|---|---|---|
| **Órbita** (sin logo) | anillo → arco → la esfera asienta → halo | 2,0 s + 0,5 s de reposo | fondos de portada, cierres de presentación y piezas que ya tienen su propia firma o texto |
| **Reveal** | la línea se vuelve logo | 3,6 s | cierre de video, apertura de presentación, intro de evento |
| **Apertura** | el logo se abre en la línea | 2,4 s | paso del logo al lenguaje de la línea, antes de componer |
| **Sting** | el golpe corto | 1,6 s | cortinillas, redes y cierres breves |

### Paso 1 · Elige el archivo según dónde lo vas a usar

Cada animación del logo existe por formato (16:9, 16:9 4K, 1:1, 4:5, 9:16) y por fondo (`navy` para fondo oscuro,
`claro` para fondo claro; la versión «para fondo oscuro» lleva el logo en blanco y la «para fondo claro», en navy).

| Si la vas a usar en… | Toma | Dónde |
|---|---|---|
| After Effects, Premiere, Final Cut o DaVinci, sobre tu propio fondo | `…_alpha-para-fondo-{oscuro\|claro}_prores4444.mov` (transparente) | bucket |
| una página web, con transparencia (Chrome, Firefox) | `…_alpha-para-fondo-{oscuro\|claro}.webm` | bucket |
| Keynote, Safari o un dispositivo Apple, con transparencia | `…_alpha-para-fondo-{oscuro\|claro}_hevc.mov` | bucket |
| un video, una presentación o una red social tal cual, con fondo y sonido | `…_60fps.mp4` o `…_30fps.mp4` | OneDrive o bucket |
| una vista previa en un chat o un correo | `…_960.gif` (sólo 16:9 y 1:1) | OneDrive o bucket |
| una imagen fija del final | `…_cuadro-final.png` (con fondo o transparente) | OneDrive o bucket |

### Paso 2 · Descárgalo

- **OneDrive (equipo):** `Alineación › 5. Contenidos › 13- Branding › Motion Órbita Efeonce › v1.1`, una carpeta por
  animación (`reveal`, `apertura`, `sting`) y dentro por formato y fondo. Lee el `LEEME.txt` de la carpeta.
- **Masters pesados (bucket público de AXIS):**
  `https://storage.googleapis.com/efeonce-group-axis-public-media/motion/logo/v1.1/<animación>/<formato>/<fondo>/`.
  Ejemplo: `…/reveal/16x9/navy/efeonce-orbita-reveal_16x9_alpha-para-fondo-oscuro_prores4444.mov`.
- **Fichas y descargas desde el navegador:** Lab de AXIS, sección 4.4.2 «Animaciones de marca»
  ([axis.efeonce.org/references/graphic-line/#animaciones](https://axis.efeonce.org/references/graphic-line/#animaciones)),
  con versiones web livianas para mirarlas antes de bajar el master.
- **La órbita sin logo** no está en OneDrive: se exporta desde el repo de AXIS con
  `pnpm orbit:video -- --format 16x9 --surface dark --out <carpeta>` (formatos `16x9`, `1x1`, `4x5`, `9x16`; fondos
  `dark` y `light`; `--line` elige la línea de servicio). En una página web no hace falta video: el paquete la anima
  con CSS (`ORBIT_MOTION_CSS`, `<AxisOrbit animate>` o `<axis-orbit animate>`). Se ve en el Lab, sección 4.4.2.

### Paso 3 · Úsala sin romperla

- El sonido viene mezclado en los MP4; en los masters transparentes no hay audio.
- El halo es parte del cuadro; si necesitas bajarlo o quitarlo, pide las secuencias PNG por capas (`principal`,
  `halo`, `combinada`), que quedan en el taller `ai-generations/2026-09-26_orbita-motion/` y no se publican.
- No recolorees, no recortes el logo, no cambies la velocidad ni agregues el eslogan en mayúsculas o con esfera.
- Si falta una variante (formato o fondo), no la armes a mano: las que faltan se suman a medida que termina el
  render. Pídela.

> Detalle técnico: [spec de motion](../../operations/brand-graphic-line/EFEONCE_ORBIT_REVEAL_MOTION_V1.md) (tiempos,
> oclusión, entregables y QA) · [manual técnico §10.1](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#101-pantalla-y-campaña)
> · generador en `scripts/creative/brand-motion/` · animación de la órbita en `@efeoncepro/axis-graphic-line`
> (`ORBIT_MOTION_*`).

## Paso a paso — fotografiar una aplicación (merch u oficina)

Las láminas 4.8 (merch) y 4.9 (oficina) del canvas muestran las aplicaciones fotografiadas con IA. Si necesitas una
foto nueva de ese tipo:

1. Parte del **arte plano exacto** de la pieza y **quítale las leyendas y notas de lámina**: el modelo imprime todo lo
   que ve en la referencia.
2. Genera con el mismo método (GPT Image 2.5 Sunburst, `xhigh`): la IA sólo pone espacio, material y luz, en registro
   documental y sin nadie mirando a la cámara. Usa los scripts del taller (`exploracion-v5/oficina-ia/items.mjs` o
   `exploracion-v5/merch-ia/`).
3. Revisa la foto **al 100 %**: el logo chico suele salir deformado y la puntuación se revisa letra por letra.
4. Corrige **editando la foto que salió** (`exploracion-v5/oficina-ia/edits.mjs`), no regenerando la escena. Para el
   logo, pasa el logo oficial como segunda referencia.
5. Trátala como **maqueta de dirección**: la producción sale de los archivos vectoriales, con prueba de color sobre el
   material real.

## Paso a paso — regenerar el PDF del manual

El PDF (`Efeonce-Linea-Grafica-La-Orbita-V1.pdf`, A4, 56 hojas, confidencial) se genera desde una fuente HTML. Se
regenera cuando cambia la fuente o cuando cambian las láminas del anexo.

1. Edita la fuente: `docs/operations/brand-graphic-line/deliverables/linea-grafica-efeonce.src.html`. Si cambias una
   regla, cámbiala también en el manual técnico `EFEONCE_GRAPHIC_LINE_V1.md` (y en el token, si es un valor).
2. Comprueba que tengas en tu equipo el taller de la exploración, en
   `ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/`: las láminas del anexo (`canvas/laminas-full/`),
   el orden del canvas (`canvas/project/canvas.json`) y el lockup negativo (`assets/lockup-claim-neg.png`). **Las
   láminas son locales** (no están versionadas): sin ellas el PDF no se puede regenerar.
3. Desde la raíz del repo, corre:

   ```bash
   node scripts/documents/render-efeonce-graphic-line.mjs
   ```

4. Lee la salida:
   - `✓ docs/operations/brand-graphic-line/deliverables/Efeonce-Linea-Grafica-La-Orbita-V1.pdf · <tamaño> KB` → listo.
   - `✗ Desborde: …` → el PDF se escribió, pero algún bloque se sale de su hoja (el comando termina con código 2).
     Corrige la fuente y vuelve a correr.
5. Abre el PDF y revisa al menos la portada, una hoja con la burbuja de URL y una hoja del anexo.

## Qué significan los estados

| Estado | Qué significa |
|---|---|
| **Canónica (2026-09-25)** | la órbita es la forma oficial de la marca propia; cuando una pieza la usa, toma sus valores de los tokens de AXIS. No va por defecto en toda pieza |
| **Sistema consistente, no activo distintivo demostrado** | no se ha medido si la gente reconoce a Efeonce sin el logo; no afirmes que la órbita se reconoce sola |
| **Candidato sin aprobar** | pares de copy del banco; sirven de referencia, no de copy final |
| **Decisión pendiente** | firma de mail A o B; panel de la prueba sin logo; si el contraste mínimo de la burbuja-firma sigue en 4,5:1 o baja a 3:1 |
| **No certificable** (`foto:cta:gate`) | pieza del canon anterior que firma con la URL; se dibuja igual que antes y no se recertificó |
| **Maqueta de presentación** | las fotos de merch y de oficina del canvas generadas con IA; la producción sale de los archivos vectoriales y de una muestra física del proveedor |
| **[propuesta]** en el manual técnico | valor a validar con prueba de impresión (por ejemplo, tamaños mínimos del logo e isotipo impresos) |

### Salida del comando del PDF

| Salida | Qué significa |
|---|---|
| `✓ … KB` y código 0 | PDF generado sin problemas |
| `✗ Desborde:` y código 2 | PDF generado, con al menos un bloque que se sale de la hoja |
| `Fuentes de marca no cargaron` | Bricolage o Poppins no cargaron en el navegador de render; el PDF no se escribe |
| `<n> imágenes rotas` | alguna imagen de la fuente HTML no cargó en el render; el PDF no se escribe |
| `Input file is missing` o `ENOENT` | falta un archivo local del taller (una lámina, `canvas.json` o el lockup); el PDF no se escribe |

## Qué no hacer

- No pongas la órbita detrás del texto ni dejes que un texto la cruce.
- No repitas la órbita como patrón ni pongas dos en la misma pieza.
- No dibujes un arco de avance sin un dato que lo respalde.
- No rodees el logo con la órbita ni le agregues la esfera o un punto.
- No escribas `efeoncepro.com` como texto: va en su burbuja.
- No agregues la burbuja URL como firma por defecto, a un costado ni junto al logo: sólo reemplaza al logo cuando
  el logo ya está en la imagen.
- No uses la órbita por defecto ni la pongas sobre el sujeto, las reservas de texto, el lecho o la firma.
- No recolorees ni redibujes la burbuja de URL, el logo o el isotipo.
- No uses el teal claro como texto sobre blanco (no llega al contraste mínimo) ni el teal en piezas de Globe, Wave o
  Reach.
- No uses la órbita en la UI de Greenhouse ni en piezas de clientes.
- No copies HEX ni medidas de una captura o de este manual: tómalos de los tokens.
- No uses fotos de banco ni pongas un velo navy sobre la foto.
- No publiques el claim «Te hacemos visible» en pauta: está pendiente de revisión legal.

## Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| La burbuja de URL se ve **negra** en un PDF, en el correo o en un visor | la fusión de luminosidad (`mix-blend-mode`) no se aplica en ese visor, o el color del trazo venía en un bloque de estilos que el visor descartó | usa la variante horneada: `url-lum-light.svg` sobre blanco o papel, `url-lum-dark.svg` sobre navy; ambas llevan el color como atributo del trazo |
| Un texto **cruza la órbita** | el copy es largo o la órbita quedó centrada | mueve la órbita hacia la derecha y arriba, reduce el copy o cambia de formato; nunca pongas la órbita detrás del texto |
| La lente «se nota como truco» | la foto no tiene un punto de interés claro | cambia la foto por una del banco o produce una toma nueva con el sujeto dentro del círculo |
| La foto muestra un logo en la ropa | la toma trae un emblema legible | usa otra toma del banco o regenera; el logo lo pone la pieza, no la ropa |
| La órbita se ve demasiado fina en un post | se usaron los grosores de pantalla grande | aplica la variante para redes de los tokens (grosores ×1,75 en lienzos de hasta 1200 px) |
| La esfera no se ve sobre papel | se usó el teal claro sobre fondo claro | usa el teal oscuro del contexto papel |
| El PDF no se regenera y dice `Input file is missing` o `ENOENT` | faltan archivos locales del taller en `exploracion-v5/` (las láminas del anexo no están versionadas) | genera el PDF desde el equipo que tiene el taller o pide esos archivos; no los reemplaces por capturas nuevas sin revisarlas |
| El PDF no se regenera y dice «imágenes rotas» | una imagen referida en la fuente HTML no cargó | revisa las rutas de imagen de `linea-grafica-efeonce.src.html` y de los assets del renderer |
| El PDF sale con «Desborde» | algún bloque de la fuente HTML no cabe en su hoja | acorta o divide el bloque en `linea-grafica-efeonce.src.html` y vuelve a correr |

| La burbuja-firma **no llega a 4,5:1** | la fusión de luminosidad fija el gris de la burbuja; sobre fondos medios o claros queda entre 1,6 y 3,1:1 | ubícala sobre un lecho muy oscuro; si la pieza no tiene el logo de Efeonce en la imagen, firma con el logo centrado. El umbral está pendiente de decisión del operador |
| El gate de `foto:cta:gate` sale con código **3** («no certificable») en piezas ya aprobadas | el tramo 17 cambió la huella del comando y esas piezas no se recertificaron | se resuelve al recomponerlas; ningún workflow de CI corre este gate, así que no rompe CI |
| Una foto de merch u oficina trae **las notas de la lámina** pintadas | el arte de referencia llevaba leyendas | corrige editando la foto; en adelante pasa el arte sin leyendas |

## Referencias técnicas

- Manual técnico-operativo (fuente de verdad): [`docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md)
- Decisión: [`docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md`](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md)
- Índice de la carpeta: [`docs/operations/brand-graphic-line/README.md`](../../operations/brand-graphic-line/README.md)
- Referencia viva en AXIS: [axis.efeonce.org/references/graphic-line](https://axis.efeonce.org/references/graphic-line) · tokens `efeonceGraphicLine` en `@efeoncepro/axis-tokens` (repo `efeoncepro/axis-design-system`)
- Renderer del PDF: [`scripts/documents/render-efeonce-graphic-line.mjs`](../../../scripts/documents/render-efeonce-graphic-line.mjs)
- Lenguaje fotográfico: [`docs/operations/brand-photography/README.md`](../../operations/brand-photography/README.md)
- Banco de la lente: `ai-generations/2026-09-25_banco-lente-orbita/LEEME.md`
- Canvas de trabajo (privado, 40 láminas): [Línea gráfica Efeonce](https://claude.ai/artifact/EKeA34qiPH77wsUFCtX9ii)
- Contrato y herramientas (AXIS 0.3.0 y `axis-graphic-line` 0.3.1, `creative:orbit:render`, `creative:layout`, `foto:componer:cta` tramo 17): [manual técnico §13](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#13-contrato-y-herramientas-axis-03)
- Animaciones de marca: [spec de motion](../../operations/brand-graphic-line/EFEONCE_ORBIT_REVEAL_MOTION_V1.md) · masters en `gs://efeonce-group-axis-public-media/motion/logo/v1.1/`
- Compositor de piezas con CTA: [manual de uso](./compositor-piezas-cta.md)
