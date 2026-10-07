# Usar la línea gráfica de Efeonce — Manual de uso

> **Decisión vigente 2026-10-07 — Rooms:** La órbita (`efeonce-graphic-line`) es su design system completo: Bricolage editorial/Poppins funcional, color, componentes, iconografía y motion. AXIS distribuye el sistema. Aplica a autoría, exploración y presentación; las piezas del cliente mantienen su diseño. [Dossier](../../architecture/rooms/README.md). La composición y runtime siguen pendientes; no se migra automáticamente Greenhouse ni se impone narrativa pregunta/respuesta.

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.9
> **Creado:** 2026-09-25 por Claude
> **Ultima actualizacion:** 2026-09-27 por Claude (1.9: los 19 íconos de IA, redes sociales y staff, D26, en «buscar un ícono», sus notas de uso y en volumen; set de 79 y 43 volúmenes, AXIS main@cf77452 (2026-09-27), tag `v0.6.0`) · 2026-09-27 (1.8: los 30 íconos de oficio, D25, en «buscar un ícono» y en volumen; set de 60, verificado contra AXIS main@aa66225, 2026-09-27) · 2026-09-27 (1.7: usar y pedir un ícono en volumen — Plastilina en volumen, D24) · 2026-09-26 (1.6: usar y pedir un ícono de la marca — iconografía Trazo y Plastilina, AXIS `v0.3.6`)
> **Modulo:** Creative · marca propia de Efeonce (línea gráfica «La órbita»)
> **Ruta en portal:** no aplica — es un sistema de marca; los valores viven en AXIS y el PDF se regenera con un comando local
> **Documentacion relacionada:** [Documentación funcional](../../documentation/creative/linea-grafica-efeonce.md) · [Manual técnico-operativo V1](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) · [ADR «La órbita»](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md) · [Producir una foto de marca](../marketing/fotografia-de-marca-efeonce.md)

> **Actualización AXIS 2026-10-04:** catálogo unificado de íconos, logos y workflow de agentes en [AXIS: packages y Lab](../../documentation/creative/axis-packages-y-lab.md). Los releases y pins fechados en el historial inferior describen esos cortes; consulta el [runbook vigente](../../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md) antes de instalar.

## Para qué sirve

Este manual explica cómo hacer una pieza de Efeonce con la órbita (post, slide, portada, informe, merch, papelería,
señalética) sin romper sus reglas, cómo usar las animaciones de marca (la órbita y las tres animaciones del logo), cómo
usar y pedir un ícono de la marca y cómo regenerar el manual en PDF cuando cambia su fuente.

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

Un acento por pieza. **El acento sirve para gráficos y para texto de 24 px o más; nunca para texto más chico**, que va
en navy sobre claro y en blanco sobre oscuro (decisión del operador, 2026-09-26). Sobre papel, el halo va a la mitad.
Los valores exactos están en los tokens y en el §2 del manual técnico.

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
- La toma debe tener el sujeto dentro de un círculo del 55 % del **círculo visible de la lente** en el formato de la
  pieza (no del lado corto de la foto), **sin emblemas legibles** (el logo lo pone la pieza, no la ropa) y en registro
  documental: nadie mira a la cámara. Si el sujeto no cabe, rehaz la toma; no cambies la pieza.
- No le pongas velo oscuro encima: fuera del círculo la foto va en navy apagado, dentro va a todo color. Ese exterior
  apagado es el espacio del texto de la lente; en una pieza **sin** lente sigue prohibido oscurecer la foto.
- Pide el lecho igual, aunque la pieza firme sobre la foto apagada. Si la escena ya trae un anillo dibujado (en una
  pizarra, por ejemplo), cuenta como órbita: elige otra foto. Con lente manda el encuadre del círculo; las palancas que
  llenan el cuadro (`variantes`, `manos`) quedan para piezas de sólo foto. (Decisiones del operador, 2026-09-26.)
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

1. **Pieza gráfica (post, anuncio, portada con foto):** firma con el **logo de Efeonce centrado abajo**. La portada de un deck, brochure o propuesta no sigue esta regla: lleva el logo de 500 px arriba, en la columna de voz (`EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6, 2026-09-27). No agregues la
   burbuja de URL.
2. **¿El logo de Efeonce ya aparece dentro de la imagen** (una maqueta, un objeto, una prenda)? Entonces no repitas el
   logo: firma con la **burbuja URL, centrada y con fusión de luminosidad**, sola. Nunca a un costado ni junto al logo.
3. Mide el contraste de la burbuja-firma: debe llegar a **4,5:1**. En la práctica sólo lo logra sobre un fondo muy
   oscuro; sobre fondos medios o claros no llega (1,6–3,1:1). Si no llega, la pieza no pasa.
4. Fuera de las piezas gráficas: logo completo si cabe a 96 px o más; si no, el isotipo. **Nunca los dos en la misma
   vista.**
5. La órbita **nunca rodea el logo**, salvo en los tres cierres de marca: el final del deck, el final de video y el
   muro de recepción, con el anillo fuera del área de resguardo del logo (decisión del operador, 2026-09-26). En
   objetos, en el banner de LinkedIn y en el reverso de la tarjeta, el logo va solo.

- Los pies con la burbuja (deck, informe, papelería, stand, firma de mail) siguen como siempre.
- Si aparece `efeoncepro.com`, usa la **burbuja oficial**, no la dirección escrita. En web y en herramientas que
  soportan fusión, el SVG gris con fusión de luminosidad; en PDF, correo, visores o referencias para IA, la variante
  horneada (`url-lum-light.svg` sobre blanco o papel, `url-lum-dark.svg` sobre navy).
- El eslogan «Empower your Growth» sólo va en cierres (último slide, contratapa, firma, final de video) y desde el
  archivo oficial. En el cierre del deck, la palabra final va en el acento de la línea, no en blanco.

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

### Paso 4 · Si vas a animar algo nuevo de la marca, sigue el lenguaje de movimiento

Antes de animar cualquier pieza nueva de Efeonce (una cortinilla, un cierre de evento, una transición, otra marca de
la familia), lee la [norma del lenguaje de movimiento de la órbita](../../operations/brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md)
y aplica sus siete reglas:

1. Define el protagonista de cada tramo y ordénalos: nunca dos a la vez.
2. Pon una pausa o una anticipación antes de cada arranque y un golpe al final (sobrepaso, pulso y, si encaja algo,
   la onda de acento).
3. Elige la curva por papel: llega (`emphasized`), se transforma (`standard`) o se va (`emphasizedAccelerate`).
4. Revisa los relevos: la velocidad no puede saltar.
5. Agrega desenfoque real sólo donde el movimiento es rápido.
6. Usa los archivos oficiales y compara el cuadro final con el logo original.
7. Si lleva sonido, un golpe por impacto y cierre con fundido.

Los números salen del token `efeonceGraphicLine.motion` de `@efeoncepro/axis-tokens` (0.3.3 o superior): no los
copies de un documento ni de un script. Si tu pieza necesita un valor que no existe, pide que se agregue al token con
su razón.

> Detalle técnico: [norma del lenguaje de movimiento](../../operations/brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md)
> · [spec de motion](../../operations/brand-graphic-line/EFEONCE_ORBIT_REVEAL_MOTION_V1.md) (tiempos,
> oclusión, entregables y QA) · [manual técnico §10.1](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#101-pantalla-y-campaña)
> · generador en `scripts/creative/brand-motion/` (lee los valores de `efeonceGraphicLine.motion`) · animación de la órbita en `@efeoncepro/axis-graphic-line`
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

## Paso a paso — armar una firma de correo

La firma v3.1 está aprobada en dos versiones: **A · sobre papel** y **B · tarjeta navy**. Las reglas completas están
en el [manual §10.2](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#102-firma-de-mail); el contrato
que las hace cumplir es `efeonce.email-signature` de AXIS.

1. **Reúne los datos de la persona:** nombre, cargo, teléfono, correo, LinkedIn y su foto aprobada.
2. **Genera la firma** con `node ai-generations/2026-09-26_firma-partners/build4.mjs` (hoy tiene los datos de Julio
   Reyes en `P`; cámbialos para otra persona). Sale en `out/v3.1/`: A y B en escritorio, móvil y sin fuentes web, y
   la firma de respuesta.
3. **Revisa las tres vistas.** La versión sin fuentes web es la que ven Outlook y Gmail: debe leerse bien en Arial.
4. **Revisa los partners** contra el [registro de partnerships](../../operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md).
   Sólo entran relaciones activas, aceptadas o declaradas por el operador. Truora no va en la firma.
5. **Publica las imágenes** (sólo si cambió algo o es otra persona): corre el generador con
   `HOST_BASE=https://storage.googleapis.com/efeonce-group-axis-public-media/email-signature/v3.1` y `PERSON=<nombre-apellido>`, y sube la carpeta `out/v3.1/hosted/` con
   `gcloud storage cp -r out/v3.1/hosted/* gs://efeonce-group-axis-public-media/email-signature/v3.1/`. Nunca uses la
   versión con imágenes incrustadas: Outlook y Gmail las bloquean o las muestran como adjuntos.
6. **Instálala en Outlook:** abre `out/v3.1/outlook-b.html` (o `outlook-a.html`) en el navegador, selecciona todo,
   copia y pega en Configuración → Cuentas → Firmas como firma para mensajes nuevos. Crea una segunda firma con
   `outlook-respuesta.html` y elígela para respuestas y reenvíos. Envíate un correo de prueba y revísalo en escritorio
   y en el teléfono.

**Firmas personales del equipo (2026-09-29).** Las seis firmas del equipo actual (Julio, Daniela, Andrés, Melkin,
Humberly y Valentina) se generan con `ai-generations/2026-09-29_avatares-equipo/firmas/build-firmas.mjs`: el mismo
constructor v3.1 con la tabla del equipo (nombres y correos de Entra, cargos del operador, el WhatsApp de la agencia
+56 9 3732 3064 como teléfono salvo Julio) y la foto con órbita sacada del avatar oficial (bomber y fondo con el halo de
la órbita; [roster](../../operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md)). Corre
`HOST_BASE=https://storage.googleapis.com/efeonce-group-axis-public-media/email-signature/v3.1 PERSON=<nombre-apellido> node
…/build-firmas.mjs` y sube sólo `hosted/people/*` (las imágenes compartidas ya están publicadas y otras firmas instaladas
dependen de ellas). Los paquetes para cada persona quedan en OneDrive: `Alineación/6. Marca/Kit media/Firmas/
firma-<nombre-apellido>.zip`, con la instrucción de instalación adentro. Un cambio de foto se ve solo en las firmas ya
instaladas: la URL de la foto no cambia. Las fotos con órbita salen de `firmas/fotos-orbita.mjs`, que lee el tamaño del
token y las exporta a 3× (390 px). **Desde el 2026-09-29 el avatar mide 130 px**, a la altura del bloque de texto de al
lado: quien pegó la firma antes sigue viendo la foto nueva, pero a 96 px; para verla más grande tiene que volver a copiarla
desde su página. En pantallas angostas el correo largo se parte antes de la «@» en vez de desbordar la firma.

**Cómo lo instala cada persona:** su página con el botón «Copiar mi firma»
(`https://storage.googleapis.com/efeonce-group-axis-public-media/email-signature/v3.1/instalar/<nombre-apellido>.html`; los
buzones, `instalar/area-<talent|finance|commercial>.html`): la abre, aprieta el botón y la pega en Outlook. Nadie tiene que
tocar HTML. Tres detalles de Outlook que el constructor ya resuelve (2026-09-29): la foto va en su propia celda, del
tamaño del token (130 px; la marca de área, 106 px), porque con el margen dentro de la celda Outlook la achataba; la esfera de la línea es una imagen (el círculo por estilos se
perdía al pegar) y el **eslogan va horneado** con sus pesos canónicos (Outlook no carga Poppins y lo dejaba en Arial).
Adaptarse sola al tema claro u oscuro del sistema no es posible: Outlook quita esas reglas al pegar; la versión de
fondo blanco está preparada para el oscurecido automático de Outlook (logo y eslogan con halo blanco, partners transparente).

**Firma de un buzón de área (equipo).** Talent, Finance y Commercial tienen firma propia, sin foto: la órbita rodea el
ícono del área y sólo lleva su correo. Se genera con `AREA=talent` (o `finance`, `commercial`) delante del mismo
comando, y se instala igual, en la cuenta del buzón. `people@efeoncepro.com` usa la firma de **Talent** (no es un área
aparte). Un área nueva se pide primero en AXIS (tokens de la firma).

**Quién la instala:** cada persona, en su propia cuenta de Outlook, desde el HTML generado (decisión del operador,
2026-09-26). La firma de equipo todavía no lleva LinkedIn: falta que el operador confirme la URL de la empresa.

**Qué no hacer con la firma:** agregar «Quedo atento.» o «Saludos» (van en el cuerpo del correo) · poner una
segunda esfera en la línea de los partners · mostrar logos de partners a color o en insignias de nivel sin haberlas
confirmado en el portal del programa · escribir la URL como texto en vez de usar la burbuja.

## Paso a paso — usar un ícono de la marca

La iconografía de la línea tiene dos voces: **Trazo** (lo que se mide) y **Plastilina** (lo que se crea). Las reglas
completas están en el [manual §14](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#14-iconografía-trazo-y-plastilina)
y en la [guía de AXIS](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/iconography.md);
este paso a paso no las repite todas.

1. **Confirma que la pieza es de Efeonce** (o de su familia). Para clientes o para la interfaz de Greenhouse no se
   usan estos íconos.
2. **Elige la voz por la línea de servicio de la pieza:** Growth, Engine o Revenue → Trazo; Brand → Plastilina. La
   línea Voice todavía no tiene voz fija: elige con criterio y decláralo en la pieza. Una voz por grupo, nunca las dos
   juntas.
3. **Busca el ícono en la [página del Lab](https://axis.efeonce.org/references/iconography/):** muestra 134 íconos únicos: 109
   canónicos (60 Trazo y 49 Plastilina) y 25 candidatos, con filtros AEO, SEO y Autoridad y «Copiar SVG».
   Confirma el estado antes de elegir. Las colecciones se superponen; Brand Authority conserva una sola identidad. Desde el 2026-09-27 incluye los
   **30 íconos de oficio**: en Trazo, correo, llamada, calendario, reunión, objetivo, presentación, contrato, checklist,
   código, base de datos, nube, integración, seguridad, ubicación y reloj; en Plastilina, lápiz, rodillo, aerosol,
   escuadra, post-it, encuadre, película, vinilo, guitarra, reproducir, varita, taza, lámpara, trofeo y estrella. Y los
   **19 de IA, redes sociales y staff** (D26): en Trazo, ia, composer, buscador, influencer, prensa, social, multimedia,
   assets y staff-gorra («Staff»); en Plastilina, chispa, prompt, barra de búsqueda, aro de luz, televisión, like
   («Me gusta»), galería, biblioteca («Biblioteca de assets»), hoodie («Hoodie Efeonce») y gorra («Gorra Efeonce»).
   Cada idea tiene su clave en cada voz (ia/chispa, composer/prompt, buscador/barra-busqueda, influencer/aro-de-luz,
   prensa/television, social/like, multimedia/galeria, assets/biblioteca, staff-gorra/gorra); el hoodie existe sólo
   en Plastilina. Al elegir, ten en cuenta:
   - **Llamada o teléfono:** «llamada» es el teléfono en Trazo; «teléfono» es el móvil en Plastilina. Elige según la
     voz de la pieza.
   - **Checklist:** su esfera cae en la columna de vistos. No lo uses como viñeta de una lista de verdad.
   - **Varita y estrella:** comparten la estrella; no las pongas en el mismo grupo.
   - **Encuadre** es composición y formatos, no recortar (para eso está tijeras).
   - **Influencer (Trazo) y talent:** al responder se parecen; no los pongas juntos.
   - **Chispa:** no va con la estrella ni con la varita.
   - **Galería y biblioteca:** se parecen; úsalas por separado.
   - **Prompt:** es el más débil a 32 px; míralo a ese tamaño antes de entregar.
   - **Hoodie y gorra:** no llevan logo dibujado; la marca la pone la esfera (en la capucha y en el panel frontal).
     Ningún ícono de IA imita la pantalla ni el logo de ChatGPT o Gemini: no les agregues uno.
   Si el que necesitas no está, **no lo dibujes**: pídelo (ver abajo).
4. **Decide el estado.** Reposo por defecto. **Responde uno solo**, el que importa, y sólo si la pieza no tiene otra
   esfera (una órbita, una voz con esfera o un marcador de estado). En listas, tablas, contacto y navegación, reposo.
5. **Toma el color de la línea de la pieza**, no del ícono: en un deck de Growth todos van con el acento de Growth,
   aunque el ícono «pertenezca» a otra línea. Sin línea clara, Growth.
6. **Respeta los tamaños mínimos:** el Trazo responde desde 20 px (más chico, sólo reposo); Plastilina no baja de
   32 px (más chico, usa el Trazo).
7. **Si Plastilina es la protagonista de la pieza,** va dentro de su **órbita sesgada** y en reposo: la esfera la pone
   la órbita. Una por pieza, rodea sólo al objeto y el texto vive fuera.
8. **Si trabajas en código o con un agente,** pinta con `resolveIcon`, revisa el grupo con
   `auditIconGroup(items, { pieceHasSphere })` antes de entregar y usa `skewedOrbitHeroSvg` para la protagonista
   (`@efeoncepro/axis-graphic-line/icons`, desde 0.4.0; los íconos de oficio, desde 0.5.0, tag `v0.5.0`; los de IA,
   redes sociales y staff, desde 0.6.0, tag `v0.6.0`). El set canónico como archivos sale con `pnpm icons:export` en
   el repositorio de AXIS. Nunca copies HEX ni px: salen de `efeonceGraphicLine.icons`. Al corte 2026-10-04, Greenhouse fija
   axis-graphic-line 0.11.0 y axis-brand-assets 0.4.15; dentro de Greenhouse sólo lo usa el generador de piezas por
   superficie. Para otra pieza, úsalo desde AXIS o copia el SVG del Lab.

Para los candidatos, usa `resolveSeoIcon` desde `@efeoncepro/axis-graphic-line/icons/seo`, como declara el
manifest del Lab. `resolveIcon` y `icons:export` sólo cubren canónicos. El release `0.17.0` de graphic-line
está publicado; consumirlo en Greenhouse exige actualizar y verificar su pin por separado.

### Pedir un ícono nuevo

1. **Revisa el catálogo** de la página del Lab: confirma que no hay uno que sirva.
2. **Pídelo al operador de la línea** con cuatro datos: el objeto, la voz (Trazo o Plastilina), dónde se va a usar y
   dónde ocurre la acción (ahí va la esfera cuando responde).
3. **Quien lo produce sigue el método de AXIS** ([guía, glifo nuevo](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/iconography.md#un-glifo-nuevo-de-trazo)):
   - **Trazo:** se dibuja en la grilla de 24 con remates redondos y se verifica con `pnpm icons:check`.
   - **Plastilina:** se genera sólo la forma (nunca el color) con la referencia de estilo y el prompt modelo que
     guarda AXIS (`docs/agent-composition/iconography/`), se vectoriza con `pnpm icons:vectorize` y se verifica con
     `pnpm icons:check`. La esfera se compone después.
4. **El operador aprueba** mirando las hojas de control que deja `icons:check`.
5. **Recién entonces entra al set** y se publica una versión nueva del paquete. Mientras no esté aprobado, no se usa
   en piezas.

## Paso a paso — usar un ícono en volumen

**Plastilina en volumen** es la tercera capa de los íconos: cada Plastilina en arcilla mate e inflada, como imagen PNG
con fondo transparente. Es para el objeto protagonista de una pieza, no para acompañar texto. Reglas completas en el
[manual §14.1](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#141-plastilina-en-volumen-d24-2026-09-27).

1. **Confirma que es un momento protagonista:** portada, key visual, pieza social con un solo objeto, escenario, merch
   o el objeto en escena. Si el ícono va en una lista, tabla, menú, lámina de contenido de un deck, dashboard o
   interfaz, **no uses el volumen**: usa el ícono plano o el Trazo.
2. **Confirma que es uno solo en la pieza** y que no va agrupado con íconos planos (de Plastilina o de Trazo).
3. **Búscalo en la sección «Plastilina en volumen» del [Lab](https://axis.efeonce.org/references/iconography/#volumen)**
   y descarga el PNG. Hay 43, uno por cada Plastilina plana (incluidos los 15 de oficio y los 10 de IA, redes sociales
   y staff). Si el objeto no está, ve a
   «Pedir un ícono en volumen».
4. **Si trabajas con un agente o en código,** pídele que tome el archivo de `@efeoncepro/axis-brand-assets` con
   `volumeIconUrl(glyph)` (falla si el glifo no es de Plastilina). Greenhouse fija la 0.3.4 (tag `v0.6.0`), con los 43
   (los 18 de la base, los 15 de oficio y los 10 de IA, redes sociales y staff). El Lab sirve para descargarlos a mano.
5. **Colócalo a 160 px o más.** Si tiene que ir más chico, usa el ícono plano.
6. **Ponlo tal como viene:** ya está en respuesta, con el naranja de Brand y su gesto. No lo recolorees ni le cambies
   la forma. El PNG trae fondo transparente y los huecos abiertos, así que sirve sobre cualquier fondo; si la pieza
   necesita una sombra en el piso, agrégala al componer.

### Pedir un ícono en volumen

1. **Si el objeto ya tiene su Plastilina plana,** pide su volumen al operador de la línea.
2. **Si no la tiene,** primero se pide el ícono plano (ver «Pedir un ícono nuevo»). Nunca se genera un objeto nuevo
   directo en 3D.
3. **Quien lo produce sigue el método de AXIS** (guía `iconography.md` §9 del repositorio de AXIS):
   `pnpm icons:volume -- refs` arma la referencia desde el ícono plano; en Greenhouse,
   `pnpm ai:image --model gpt-image-2.5-sunburst --quality high --size 1024x1024 --image <ref.png> --prompt-file <volume-prompt.txt> --out <crudo.png>` (sin `--input-fidelity`: la familia 2.5 lo ignora; la fidelidad la da el prompt)
   genera el volumen con el prompt canónico (no se reescribe; si un detalle falla, se agrega una línea que lo nombre);
   `pnpm icons:volume -- key` recorta por color, `-- check` compara con el plano y `-- publish` lo deja en el paquete y
   en el Lab.
4. **El operador aprueba** mirando cada ícono al 100 %. Los avisos de `check` no rechazan solos: se rechaza sólo si la
   forma se reinventó, un hueco se volvió relieve o figura y fondo se invirtieron.

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

## Paso a paso — fondos de Teams y kit de cada persona

Cada persona del equipo tiene su página con el kit completo: su avatar, los nueve fondos de Teams y su firma
(`https://storage.googleapis.com/efeonce-group-axis-public-media/team/kit/<nombre-apellido>.html`). Los fondos
también están en OneDrive, `Kit media/Fondos de Teams/2026-09 La órbita/`.

1. **Poner un fondo:** en Teams, antes o durante la reunión, Efectos de fondo → Agregar nuevo → elige el archivo.
2. **Hacer un fondo nuevo:** se parte de una ficha con `"formato": "teams"` en `pnpm foto:prompt` (el centro queda
   libre para la persona) y del arte exacto de cada texto; el logo de Efeonce va como objeto (`logo-efeonce-3d-escritorio-*`).
3. **Revisar antes de repartir:** el texto y el logo al 100 %, y la prueba con una silueta sentada encima reducida a
   480 y 1280 px: nada importante puede quedar detrás de la persona.

## Qué significan los estados

| Estado | Qué significa |
|---|---|
| **Canónica (2026-09-25)** | la órbita es la forma oficial de la marca propia; cuando una pieza la usa, toma sus valores de los tokens de AXIS. No va por defecto en toda pieza |
| **Sistema consistente, no activo distintivo demostrado** | no se ha medido si la gente reconoce a Efeonce sin el logo; no afirmes que la órbita se reconoce sola |
| **Candidato sin aprobar** | pares de copy del banco; sirven de referencia, no de copy final |
| **Decisión pendiente** | proveedor y presupuesto del panel de la prueba sin logo (que debe correr antes de pauta pagada); revisión del banco de pares; URL de LinkedIn de la empresa. El contraste mínimo de la burbuja quedó en 4,5:1 (2026-09-26) |
| **No certificable** (`foto:cta:gate`) | pieza del canon anterior que firma con la URL; se dibuja igual que antes y no se recertificó |
| **Maqueta de presentación** | las fotos de merch y de oficina del canvas generadas con IA; la producción sale de los archivos vectoriales y de una muestra física del proveedor |
| **Reposo** (ícono) | el ícono es sólo su forma, sin esfera; es el estado por defecto |
| **Respuesta** (ícono) | aparece la esfera en el acento de la línea de la pieza; sólo uno por pieza y nunca junto a otra esfera |
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
- No escribas tiempos, sobrepasos ni proporciones de una animación en un script: salen de
  `efeonceGraphicLine.motion`.
- No uses fotos de banco ni pongas un velo navy sobre la foto.
- No publiques el claim «Te hacemos visible» en pauta: está pendiente de revisión legal.
- No mezcles Trazo y Plastilina en un mismo grupo ni hagas que todos los íconos respondan.
- No dibujes un ícono a mano dentro de una pieza: si no está en el catálogo, pídelo.
- No pintes el cuerpo, el gesto o el trazo de un ícono con el acento, ni le des volumen, brillo o sombra: el acento va
  sólo en la esfera. El volumen sólo existe como los PNG aprobados de «Plastilina en volumen».
- No uses un ícono en volumen en listas, tablas, menús, decks de contenido, dashboards ni UI; no pongas más de uno por
  pieza ni lo mezcles con íconos planos; no lo generes de nuevo si ya existe.
- No recortes un ícono en volumen con `pnpm ai:image:rmbg`: rellena los huecos. El recorte es por color.
- No uses la órbita sesgada para medir: lo que mide va en la órbita circular.
- No cambies los íconos Tabler de la firma de correo o de equipo por los de la línea: espera la decisión del operador.

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
| Un ícono pedido en respuesta **sale sin esfera** | es Trazo a menos de 20 px: `resolveIcon` lo deja en reposo y avisa `response-below-min` | agrándalo a 20 px o más, o déjalo en reposo |
| `resolveIcon` falla con `plastilina-below-min` | Plastilina a menos de 32 px | agrándalo o usa el ícono equivalente en Trazo |
| `auditIconGroup` reporta `mixed-voices`, `more-than-one-response` o `response-with-piece-sphere` | dos voces en un grupo, varios íconos respondiendo, o un ícono respondiendo en una pieza que ya tiene esfera | una voz por grupo; que responda uno solo; si la pieza ya tiene esfera, todos en reposo |
| Un ícono en volumen tiene **los huecos rellenos** o una pieza suelta semitransparente | se recortó con matting por IA (`pnpm ai:image:rmbg`) | recórtalo por color con `pnpm icons:volume -- key` o, mejor, usa el PNG aprobado del Lab |
| Un ícono en volumen se ve **plano, como una galleta** | se extruyó el vector en Blender | ese método está descartado; el volumen se genera editando el ícono plano con el método de AXIS |
| `pnpm icons:volume -- check` sale con código 1 | hay avisos de silueta, huecos o piezas sueltas | míralo al 100 %: se rechaza sólo si la forma se reinventó, un hueco se volvió relieve o figura y fondo se invirtieron; si no, se acepta |
| `volumeIconUrl` lanza un error | el glifo no es de Plastilina | usa un glifo de Plastilina o el ícono plano que corresponda |
| `resolveIcon` falla con `unknown-glyph` | el ícono no está en el catálogo aprobado | pídelo con el método de alta; no lo dibujes en la pieza |
| Un repositorio nuevo no puede instalar `@efeoncepro/axis-graphic-line` o `axis-tokens` (error 403) | el acceso de GitHub Packages es por paquete y ese repositorio no lo tiene | pide `Manage Actions access → Read` para el repositorio en cada paquete ([runbook de paquetes AXIS](../../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md)) |
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
- Animaciones de marca: [norma del lenguaje de movimiento](../../operations/brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md) · [spec de motion](../../operations/brand-graphic-line/EFEONCE_ORBIT_REVEAL_MOTION_V1.md) · valores en `efeonceGraphicLine.motion` (`@efeoncepro/axis-tokens` 0.3.3) · masters en `gs://efeonce-group-axis-public-media/motion/logo/v1.1/`
- Compositor de piezas con CTA: [manual de uso](./compositor-piezas-cta.md)
- Iconografía (Trazo y Plastilina): [manual técnico §14](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#14-iconografía-trazo-y-plastilina) · [guía en AXIS](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/iconography.md) · [página del Lab](https://axis.efeonce.org/references/iconography/) y [datos para agentes](https://axis.efeonce.org/references/iconography.json) · `efeonceGraphicLine.icons` (`@efeoncepro/axis-tokens` 0.3.6) · `@efeoncepro/axis-graphic-line/icons` (0.4.0) · comandos `pnpm icons:export|check|vectorize` en el repo de AXIS · Plastilina en volumen: [manual técnico §14.1](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#141-plastilina-en-volumen-d24-2026-09-27) · [Lab, sección 05](https://axis.efeonce.org/references/iconography/#volumen) · `efeonceGraphicLine.icons.volume` (`axis-tokens` 0.3.7) · `@efeoncepro/axis-brand-assets` 0.3.2 (publicado con el tag `v0.3.7`) · `pnpm icons:volume` en el repo de AXIS · Oficio (D25, 60 glifos y 33 volúmenes): `@efeoncepro/axis-graphic-line` 0.5.0 y `@efeoncepro/axis-brand-assets` 0.3.3 (tag `v0.5.0`), guía de AXIS §«Catálogo aprobado»
