# Línea gráfica Efeonce — La órbita · V1

> **Tipo de documento:** Manual de marca (contrato operativo de diseño)
> **Versión:** 1.0
> **Creado:** 2026-09-25 por Claude, con dirección de Julio Reyes (Managing & GTM Director)
> **Última actualización:** 2026-09-25
> **Estado:** dirección aprobada por el operador; **candidata a canon**. La canonización formal queda para el ADR, que el operador pidió hacer una vez cerrado todo. Mientras no exista, este documento no reemplaza `DESIGN.md`, AXIS ni `src/config/efeonce-brand.ts`: los complementa.
> **Canvas de referencia:** [Línea gráfica Efeonce](https://claude.ai/artifact/EKeA34qiPH77wsUFCtX9ii) (37 láminas, seis capítulos)
> **Referencia viva (AXIS):** `efeoncepro/axis-design-system` → tokens `efeonceGraphicLine` en `@efeoncepro/axis-tokens` (contrastes vigilados por pruebas) y página del Lab `apps/lab/src/pages/references/graphic-line.astro` (axis.efeonce.org/references/graphic-line/, pendiente de publicar). Greenhouse sigue siendo el plano de control: este manual y su decisión viven aquí.
> **Manual en PDF:** [`deliverables/Efeonce-Linea-Grafica-La-Orbita-V1.pdf`](./deliverables/Efeonce-Linea-Grafica-La-Orbita-V1.pdf) (A4, 52 hojas, confidencial · uso interno). Se regenera con `node scripts/documents/render-efeonce-graphic-line.mjs`.
> **Fuentes del repo:** `ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/` (generador del canvas, texturas, renders, firma de mail, merch generativo y prueba sin logo)
> **Relacionados:** [Lenguaje fotográfico](../brand-photography/README.md) · [Selección de referencias de marca](../EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md) · `docs/context/09_marca-agencia.md` · `src/config/efeonce-brand.ts`

---

## 0. En una frase

**Una esfera que recorre su órbita.** La esfera del isotipo (la nave con su anillo y su esfera) es el activo
distintivo de Efeonce. Recorre su órbita: el avance se ve, el oficio está a la vista y la conversación cierra con
una respuesta.

Tres ideas sostienen todo lo demás:

1. **La forma viene del isotipo.** La nave de Efeonce ya tiene un anillo y una esfera. La línea no inventa un
   símbolo nuevo: extiende el que existe. Por eso el isotipo nunca lleva otra órbita.
2. **Anillo = pregunta, esfera = respuesta.** El anillo es lo abierto, lo libre, lo que todavía se pregunta. La
   esfera es lo decidido, lo ocupado, lo que cierra. Esta gramática rige la voz, la oficina, las credenciales y
   los objetos.
3. **Línea fina y luz, nunca un disco plano.** La órbita es un trazo tenue con un arco y una esfera en la punta;
   el halo es luz. Nada de discos rellenos, brillos, reflejos ni esferas de vidrio.

---

## 1. La esfera

### 1.1 Tres estados

| Estado | Forma | Dónde se usa |
|---|---|---|
| **Punto final** | la esfera cierra la palabra respuesta | titulares, firma de mail, taza blanca, credenciales |
| **Órbita** | anillo tenue + arco + esfera en la punta + halo | portadas, cierres, carga, avance, objetos |
| **Foco** | la órbita leída como foco de escenario sobre una foto | fotografía, «Te hacemos visible» |

### 1.2 El punto final — construcción

- La esfera mide el **24 % del alto del isotipo**; se toma entera, sin la órbita.
- **Diámetro = 0,20 em** de la palabra dominante (el punto tipográfico de Bricolage mide 0,197 em).
- Apoyada en la **línea base**, sin superar la altura de x.
- **Mínimo:** 4 px en pantalla y 1,5 mm impresa. Bajo eso, se omite.
- **Tintas:** `#36C8BF` sobre oscuro (8,5:1 sobre `#001A33`) y `#0E8C82` sobre claro (3,9:1 sobre papel).
  El teal claro `#36C8BF` sobre blanco da **2,1:1**: no se usa en claro.
- **Espaciado óptico** después de la última letra:

| Letra final | Espacio |
|---|---|
| r | −0,02 em (el brazo deja aire) |
| a, s, í, z, i | 0,03 em |
| o, n, e, d | 0,035 em (curvas y astas) |
| x | 0,02 em |
| t | 0 |

- Sola (sin palabra): área de respeto de **2 diámetros**.
- **Nunca:** otro color que el acento de la marca · volumen, brillo o sombra · deformarla o agrandarla ·
  repetirla como patrón · reemplazar letras con ella · usar el teal en textos o fondos · ponerla en una
  pregunta · usarla como viñeta · más de una por pieza.

### 1.3 La órbita — anatomía y regla

Anatomía: **anillo** (el recorrido) · **arco** (lo avanzado) · **esfera** en la punta (dónde vamos) ·
**halo** (el foco) · **órbitas interiores** (máximo 2) · **satélites** (canales o productos).

Todas las medidas se expresan **por cada 794 px de ancho** del lienzo (la base del informe A4 de Insights):

| Elemento | Regla |
|---|---|
| Anillo | 1 px por cada 794 px, opacidad 16–22 %. Máximo dos órbitas interiores: 72 % y 44 % del radio, opacidad 11 % y 6 % |
| Arco | 1,6–2 px por cada 794 px, punta redonda, sentido horario. Corto (40–60°) con esfera; largo (hasta 140°) en degradé cuando lleva satélites, y entonces sin esfera |
| Esfera | radio 3,5–4 px por cada 794 px; siempre en la punta del arco, nunca suelta |
| Radio de la órbita | 30 % del ancho en retrato; 40 % del alto en horizontal |
| Halo | radial: 13 % de opacidad en el centro, 3 % al 60 %, 0 al borde |
| Arco de avance | **sólo con un dato real**; el arco mide el dato. Sin dato, no hay arco de avance |
| Satélites | discos de 30 px con el ícono del canal o producto, sobre la órbita exterior |
| Redes | en lienzos de hasta 1200 px de ancho, grosores ×1,75 (anillo 2,4 px y esfera r 8 px sobre 1080). Verificado a 390 px de ancho |

**Posición:** centro fuera del eje, hacia la derecha y arriba. El texto vive en el tercio inferior izquierdo y
**nunca cruza la órbita**. Una sola órbita por pieza.

**Origen verificado en producción:** `src/lib/artifact-composer/catalogs/insights-report/report-cover.html`,
`report-cover-light.html` y `report-back-cover.html`.

### 1.4 El foco — «Te hacemos visible»

La órbita leída como foco de escenario: la esfera en la punta del arco es la lámpara, el círculo es su luz y lo que
queda dentro es el cliente. Es la promesa del marketing dicha con la forma de la marca, y **siempre va con su
prueba**: «Te hacemos visible. Y lo medimos.»

- **Verbal:** idea de campaña bajo «Empower your Growth», con remate de prueba.
- **Visual:** penumbra navy y un solo foco; la esfera chica es la lámpara.
- **Espacio:** un foco real proyecta el círculo en recepción, stand o escenario.
- **Motion:** el foco barre la escena y se posa sobre el cliente.
- **Cuidar:** «visible» siempre con el mecanismo al lado (buscadores, respuestas de IA, alcance medido). Nunca
  nombres reales de competidores en el campo en penumbra. Una sola luz por pieza.
- **Pendiente:** revisión legal del claim «Te hacemos visible» antes de pauta.

### 1.5 La lente

La foto entera en navy apagado; dentro del círculo, a todo color y ampliada. La esfera muestra lo que importa:
dónde está la decisión. Funciona con cualquier foto del lenguaje fotográfico. **Riesgo:** exige una foto con un
punto de interés claro; con una foto débil se nota el truco.

---

## 2. Color

| Contexto | Fondo | Texto | Acento (esfera, arco, anillo) | Halo |
|---|---|---|---|---|
| **Oscuro Efeonce** | `#001A33` (`--axis-deck-navy-920`) | blanco / `#F4F6F8` | `#36C8BF` (`--axis-deck-teal-500`) | `#72DED8` (`--axis-deck-recipe-cover-halo-teal`) |
| **Papel Efeonce** | papel `#F7F8F6` o blanco | navy `#023C70` | `#0E8C82` **sólo gráfico** (en texto chico no llega a 4,5:1) | navy al 6 % |
| **Productos, oscuro** | tinta `#091951` | blanco | Globe `#FF6500` · Wave `#0375DB` · Reach `#F83902` | el acento |
| **Productos, claro** | papel | tinta `#091951` | Globe `#BB1954` · Wave `#0375DB` · Reach `#F83902` | el acento |

Contrastes medidos de la esfera: Efeonce 8,5:1 (oscuro) y 3,9:1 (claro) · Globe 5,6:1 y 5,8:1 · Wave 3,6:1 y
4,3:1 · Reach 4,4:1 y 3,5:1. La esfera es gráfico, no texto; el texto cumple 4,5:1 siempre.

**Reglas:** una marca, un acento por pieza · el teal es sólo de Efeonce y nunca aparece en una pieza de producto ·
el halo toma el color del acento · nunca dos acentos en la misma órbita · los valores son sRGB: la conversión a
CMYK o Pantone se fija con prueba física del proveedor, nunca sin prueba.

---

## 3. Tipografía

- **Bricolage Grotesque, peso 760**, tracking −0,035 em: la palabra dominante (la respuesta).
- **Poppins:** la pregunta (Light 300), el texto (400–500) y los números (con cifras tabulares).
- El eslogan usa los pesos del SSOT de marca (`src/config/efeonce-brand.ts`).
- **Nunca:** Bricolage en párrafos · monoespaciada · falsas cursivas · `fontSize` inline en UI (usar variantes
  del sistema tipográfico, ver `typography-design`).

---

## 4. La voz: pregunta y respuesta

Siempre hay dos voces, y a veces una tercera:

| Voz | Tipo | Regla |
|---|---|---|
| **Pregunta** | Poppins Light con anillo teal | una pregunta real del cliente, no retórica; abre |
| **Respuesta** | Bricolage con su esfera | una a tres palabras; es el dominante y mide **al menos 3× la pregunta**; cierra |
| **Evidencia** | Poppins, una palabra en negrita | dato, fuente o mecanismo; puede faltar |

- **Abierta:** en cuadernos, pizarras y formularios la pregunta queda sola con su anillo: responde quien lo usa.
- **Cuidar:** tuteo neutro, sin voseo ni modismos · nunca dos preguntas ni dos respuestas seguidas · la respuesta
  no promete resultados que no se pueden probar · nada de chistes ni frases motivacionales.

**Banco de pares (candidatos, sin aprobar):** ¿Lo medimos? Siempre. · ¿Quién decide? Tú, con evidencia. · ¿Y si
después lo hago yo? Esa es la idea. · ¿Y el reporte del viernes? Ya lo viste. · ¿Cuánto rindió? Te mostramos
todo. · ¿Cómo va? En vivo. · ¿Dónde quedó lo aprendido? En tu historial. · ¿Otra agencia más? No. Un sistema. ·
¿Y si lo probamos? Hoy.

**Verbos de la línea:** Hacer (Efeonce) · Medir · Crear (Globe) · Aparecer (Wave) · Llegar (Reach) · Siempre ·
Adelante · Gracias · Aquí.

---

## 5. El eslogan

«Empower your Growth» tiene dos formas oficiales: el **bloque con el logo** (centrado debajo) y el **eslogan
solo**, con la palabra final destacada. La palabra final rota por capability y toma el acento: **Growth**
(Efeonce), **Brand** (Globe), **Engine** (Wave), **Voice** (Reach).

- Se usa desde el archivo oficial; no se rearma.
- Va en cierres: final de video, última lámina, contratapa, firma de correo, recepción, merch.
- No va en cada post: ahí la respuesta con esfera ya cierra.
- **Nunca:** pegarle la esfera · traducirlo · cambiarle pesos o cursivas · escribirlo en mayúsculas.

---

## 6. Oficio a la vista

El trabajo se ve mientras ocurre. Cinco herramientas, **máximo dos por pieza** además de la esfera:

1. Guía de 1 px, del borde del texto al borde del soporte.
2. Marcas de corte, brazo del 3 % del lado corto.
3. Selección AXIS `eight-handles` (campaña) o `four-corners` (superficies tranquilas).
4. Nota al margen, una por pieza y firmada.
5. Cursores AXIS: local (screen-fixed), multiplayer acting y multiplayer moving.

Las guías y marcas van en azules; la selección y los cursores son los de AXIS tal como se resuelven en
producción (`@efeoncepro/axis-ui-contracts`), nunca coordenadas decorativas.

---

## 7. La familia

Efeonce es la marca principal; Globe (Creative Studio), Wave (búsqueda, web y medición) y Reach (medios y
distribución) son marcas de producto. **Un lenguaje, cuatro acentos.**

- **Igual en toda la familia:** la esfera y el anillo (forma, 0,20 em, comportamiento) · el oficio a la vista y
  los cursores AXIS · la voz · Bricolage + Poppins · el papel como fondo claro.
- **Cambia por marca:** el color de la esfera y del anillo · el fondo oscuro (navy para Efeonce, tinta `#091951`
  para productos) · la firma (el logo de cada producto con «by efeonce»).
- **Mapa de portafolio:** el arco y el centro son de Efeonce; los productos van como satélites con su isotipo.
- **Hilo de familia (decidido):** la órbita misma, más la palabra final del eslogan. Descartado: el anillo teal
  en productos.

---

## 8. Logo e isotipo

### 8.1 Cuándo usar cada uno

- **Logo completo:** post, slide, portada, email, reverso de taza, muro, stand; siempre que quepa a 96 px o más.
- **Isotipo:** avatar, favicon, ícono de app, pin, sticker, credencial, lomo de cuaderno, marca de agua en video.
- **Nunca los dos en la misma vista.**
- Productos: su isotipo firma dentro de su propio contexto; Efeonce aparece en el logo completo («by efeonce») o
  en la pieza madre.

### 8.2 Logo — uso correcto

| Regla | Detalle |
|---|---|
| A color sobre blanco o papel | el navy oficial, desde el archivo |
| Negativo sobre navy | siempre el archivo negativo, todo blanco |
| Sobre foto | sólo en una zona calma, con contraste ≥ 4,5:1 medido; nunca con velo encima |
| Área de resguardo | **X = alto de la nave**, en los cuatro lados. Nada entra en ese margen: ni texto, ni bordes, ni la órbita |
| Tamaño mínimo | **96 px en pantalla · 25 mm impreso**; recomendado ≥ 160 px. Bajo el mínimo, el isotipo [propuesta, validar con prueba de impresión] |
| Familia | cada marca con su propio archivo, a color o en negativo (productos sobre `#091951`) |
| Logo con eslogan | sólo el bloque oficial, en cierres |
| En una frase de display | **sí, con reglas**: sólo en titulares grandes (el logo sobre 96 px); misma altura de x y misma línea base que el texto (la altura de x de «efeonce» es el 55 % del alto del archivo y su línea base cae al 80 %: con Bricolage 760, `height: 0.94em; vertical-align: -0.19em`); una vez por pieza y sin repetir el logo como firma en la misma vista; reemplaza sólo la palabra Efeonce; color oficial y el punto final al cierre de la frase, nunca pegado al logo |

**Cómo elegir:** ¿cabe a 96 px? Logo completo; si no, isotipo. ¿Fondo oscuro? Negativo. ¿Claro? A color. ¿Foto?
Zona calma o cambia la foto; no se oscurece encima. En objetos, el logo va en el dorso, solo.

### 8.3 Logo — usos incorrectos (los doce)

1. Estirar o comprimir.
2. Rotar o inclinar: el logo va siempre horizontal.
3. Recolorear: ni teal, ni el acento de otra marca.
4. Degradados o efectos: el logo es plano.
5. Sombras, brillos o contornos.
6. Sin contraste: navy sobre azul oscuro, o sobre textura.
7. Sobre una foto cargada: el logo compite con la escena.
8. Órbita alrededor del logo: la órbita rodea palabras, nunca el logo.
9. Agregarle la esfera o un punto: la esfera es de la palabra, no del logo.
10. Escribirlo con una fuente: se usa el archivo, no se tipea.
11. Logo e isotipo juntos: uno u otro en cada vista.
12. En texto corrido (párrafos, interfaz, tamaño chico): el logo no reemplaza una palabra. En titulares de display sí, con las reglas de §8.2.

La causa es siempre la misma: tratar el logo como una imagen editable. **Si ninguna versión funciona, cambia el
fondo o la foto, no el logo.** Si falta una versión (por ejemplo, un negativo todo blanco de Wave), se pide a
diseño; no se arma en la pieza.

### 8.4 Isotipo — uso correcto, incorrecto y tamaño mínimo

El isotipo ya es una órbita: no se le agrega nada.

- **Correcto:** a color sobre blanco o papel · blanco sobre navy (archivo blanco oficial) · avatar: círculo navy
  con el isotipo al 60 % del ancho · ícono de app o favicon: cuadrado redondeado, mismo margen.
- **Área de resguardo:** **X = diámetro de la esfera del isotipo**, en los cuatro lados.
- **Tamaño mínimo:** **24 px en pantalla · 8 mm impreso**. A 16 px las tres ventanas de la nave se pierden: el
  favicon de 16 px se valida aparte [propuesta].
- **Incorrecto:** rotarlo o voltearlo (la nave sube hacia la derecha, siempre) · recolorearlo · estirarlo ·
  ponerle otra órbita · recortarlo en un círculo que lo corta (el círculo contiene; no corta) · armar un lockup
  propio (isotipo + palabra tipeada no es el logo) · sin contraste · mezclarlo con otro isotipo.

**Aviso conocido:** el isotipo de Wave en negativo (repo y OneDrive) conserva media figura en azul. Si existe una
versión toda blanca, se reemplaza.

### 8.5 Archivos

`public/branding/` y `public/branding/SVG/` en el repo; `OneDrive › Alineación › 5. Contenidos › 13- Branding ›
SVG`. Nunca se redibujan ni se exportan desde una captura.

---

## 9. Fotografía

La foto va en la lente o en el foco, con su luz y **sin velo**. Personas reales del equipo o escenas del oficio;
nunca banco de imágenes. Se produce con el pipeline canónico del [lenguaje fotográfico](../brand-photography/README.md)
(`pnpm foto:prompt` → `pnpm foto:validar`), nunca armando prompts a mano.

**Reglas de la toma para la lente:** el sujeto cabe en un círculo del 55 % del lado corto con 15 % de aire · fuera
del círculo la foto tolera quedar en navy apagado · **sin emblema legible** (el logo lo pone la pieza, no la ropa) ·
un acento cálido dentro del círculo, nunca en el fondo · la obra en proceso · registro documental: nadie mira al
lente.

**Banco propio (brief listo, sin generar):** 8 tomas — manos ajustando una curva de color · dos personas
decidiendo entre dos versiones · estratega en la pizarra con la órbita · cámara detrás del monitor · revisión de un
informe impreso · llamada con cliente (sólo la escucha) · pieza aprobada en pantalla grande · mesa vacía al final
del ciclo. Costo estimado USD 5–10; **espera aprobación de presupuesto**.

---

## 10. Aplicaciones

### 10.1 Pantalla y campaña

- **Deck:** la órbita es la navegación. La portada lleva un arco corto; cada sección suma su tramo; el cierre
  completa la órbita con la esfera arriba. En el contenido en papel, la órbita baja a 80 px en la esquina.
- **Campaña:** la órbita rodea la lente con aire; la esfera va arriba a la izquierda, lejos de la cara.
- **Movimiento (cierre de marca 4,5 s):** anillo 0–0,5 s · arco 0,4–1,4 s · la esfera asienta 1,4–1,7 s · halo
  1,2–2,0 s · logo 1,9–2,5 s · eslogan 2,5–3,0 s. Con movimiento reducido, cuadro final fijo.
- **Grillas:** margen del 9 % del lado corto en redes (96 px sobre 1080) y 140 px en 16:9; en 9:16 se respeta la
  zona que tapa la interfaz de cada red.

### 10.2 Firma de mail

HTML con texto vivo y máximo dos imágenes; en Outlook de escritorio fija a 460 px y fluida en móvil. Dos opciones
con la órbita alrededor de la foto: **A · clara** (divisor que termina en la esfera) y **B · tarjeta navy**
(recomendada: se reconoce de lejos y funciona en modo oscuro). **Decisión pendiente: A o B.** Generador:
`exploracion-v5/firma/`.

### 10.3 Oficina

- **Llegar:** el logo completo va una sola vez, en el muro de recepción dentro de su órbita. Salas con verbos
  (Hacer, Medir, Crear); en el directorio, cada área con la esfera en su acento; la señalética de servicio en
  Poppins, sin esfera ni órbita.
- **Trabajar:** **anillo = libre o abierto; esfera = ocupado o decidido**, nunca como semáforo de colores. El arco
  del estado de sala mide tiempo real. Una lente o una órbita por muro o vidrio; nada de patrones. Muro de voz: una
  pregunta y su respuesta por espacio.
- **Convivir:** tazas, cuaderno, credencial, stickers, fondos de pantalla (la órbita a la derecha, la zona izquierda
  libre para la cámara) y tarjetas de mesa con la voz. Los datos reales los completa la oficina.

### 10.4 Objetos — la regla

> **Frente: la palabra en Bricolage con su punto** (la órbita es opcional y siempre alrededor de la palabra, con el
> acento de cada marca). **Dorso: el logo solo**, chico y abajo, sin órbita ni texto. La órbita alrededor del logo
> quedó descartada.

- **Tazas:** la blanca con «Hacer.» es la favorita del operador; con la órbita en Bricolage también funciona. En
  cerámica no hay halo: anillo 0,5 mm, arco 1,2 mm, esfera Ø 4,4 mm, órbita Ø 74 mm. El interior toma el acento.
- **Vaso térmico y botella deportiva:** acero con pintura en polvo; diseño propio, nunca la forma ni la tapa de una
  marca existente.
- **Lapiceros:** el botón superior es la esfera, en el acento de cada marca.
- **Pulseras de silicona:** un verbo con su punto; las de color, texto y punto en blanco.
- **Alfombra de escritorio (90 × 40 cm):** la órbita a la derecha, bajo el mouse.
- **Llavero:** la argolla es el anillo y la cuenta teal es la esfera; la placa dice «Adelante.» y atrás, el logo.
- **Paraguas:** visto desde arriba es una órbita con «Siempre.»; de lado, el logo en un paño.

### 10.5 Vestir

El uniforme actual (polo, hoodie, gorra, chaqueta, lanyard) **sigue vigente**; lo nuevo son ediciones.

- **Polo navy:** «Hacer.» bordado chico en el pecho y el botón superior de la tapeta en teal. La softshell se
  queda como está.
- **Polera navy:** la órbita con «Hacer.» centrada en el pecho. En el hoodie no se usa: la capucha y el bolsillo la
  cortan.
- **Polera blanca:** una respuesta chica en el pecho y su pregunta en la nuca, por dentro.
- **Gorra:** «Hacer.» bordado adelante y el botón superior en teal.
- **Técnica según la tela:** bordado en piqué y softshell; estampado en algodón. Prueba física antes de producir.

### 10.6 Identificarse

- **Carnet:** la foto con su órbita, el nombre con su punto, el cargo y el logo abajo. Atrás: «¿Lo encontraste?
  Devuélvelo.»
- **Credencial de evento:** el rol por la forma — **anillo = asistente, órbita = speaker, esfera = staff** —, no por
  colores; el staff en navy.
- **Tarjeta de presentación:** adelante la persona; atrás la órbita con el logo y el eslogan.
- **Pin esmaltado:** la órbita en plata y teal.

### 10.7 Bienvenida, papelería y eventos

- **Caja de bienvenida:** la tapa pregunta y responde («¿Primer día? Adelante.»); adentro, «Esto es tuyo. [Nombre].»
  y el kit (botella, carnet, llavero, polo, lapicero, tarjeta). El logo va en el canto.
- **Envío a clientes:** por fuera, sobrio (logo chico y un anillo): lo que viaja por correo no anuncia lo que lleva.
  Por dentro, «Gracias.» y el papel de seda cerrado con un sello teal: la esfera.
- **Hoja membretada A4:** logo arriba a la izquierda, la órbita recortada en la esquina superior derecha al 18 % en
  navy, pie con dirección, teléfono y web; la línea del pie termina en la esfera. Texto en Poppins 11 pt; nunca la
  órbita detrás del texto. La continuación no lleva órbita.
- **Sobre americano:** frente con logo y remitente; en el dorso, **el sello es la esfera: cerrado = respondido**.
- **Stand (3 × 2,4 m):** el telón pregunta y responde en la mitad de arriba, sobre la altura del mesón («¿Te
  encuentran cuando te buscan? Aquí.»); el pendón (85 × 200 cm) lleva la conversación al centro y 20 cm libres
  abajo; el mesón (100 × 90 cm) lleva el logo solo: es la firma del stand.

### 10.8 Merch en foto

El canvas incluye 17 fotos de producto generadas con IA (GPT Image 2.5 Sunburst) a partir del **arte plano exacto**
de cada pieza como referencia, y de los kits reales de prenda (polo, gorra, lanyard) como referencia de forma y
tela. El modelo sólo pone material y luz. **Son maquetas de presentación**: la producción sale de los archivos
vectoriales y de una muestra física del proveedor. Prompts y runner: `exploracion-v5/merch-ia/`.

---

## 11. Do's & Don'ts — resumen

| Elemento | Sí | No |
|---|---|---|
| Esfera | al final de la respuesta, 0,2 em, en el acento; una por pieza | en preguntas, como viñeta, repetida, con volumen o brillo |
| Órbita | anillo fino al 16–22 %, arco y esfera, al costado del texto | anillos gruesos o muchos, detrás del texto, alrededor del logo |
| Arco de avance | mide un dato real | decorativo o inventado |
| Voz | pregunta chica, respuesta grande de 1–3 palabras | pregunta grande, respuesta larga y chica |
| Color | navy profundo con teal; teal oscuro sólo en gráfico sobre claro | teal claro como texto sobre blanco (2,1:1); dos acentos en una pieza |
| Tipografía | Bricolage para decir, Poppins para explicar | Bricolage en párrafos, monoespaciada |
| Eslogan | bloque oficial, en cierres | traducido, con esfera, en mayúsculas, con otros pesos |
| Objetos | frente: palabra; dorso: logo solo | logo y órbita juntos al frente |
| Foto | oficio real, luz con carácter, sin emblema legible | velo navy encima, foto de banco |
| Logo | archivo oficial, con resguardo X y contraste; en titulares puede ocupar el lugar de la palabra Efeonce | los doce usos incorrectos de §8.3 |
| Isotipo | solo, en formatos chicos, ≥ 24 px | con otra órbita, recoloreado, rotado, combinado |
| Terceros | satélites de canal que muestran dónde medimos | logos de terceros como si fueran alianzas |

---

## 12. Decisiones y validación

**Decidido (2026-09-25, reversible):**

- La órbita es la forma canónica; el punto final se mantiene en titulares, firma de mail y taza blanca; el foco,
  en fotos.
- En oscuro manda la paleta de la órbita (tokens del deck AXIS); en papel, navy `#023C70` y teal `#0E8C82`.
- Hilo de familia: la órbita más la variante del eslogan. Descartado: anillo teal en productos.
- Redes: grosores ×1,75 en lienzos de hasta 1200 px.
- Objetos: palabra al frente, logo solo atrás. Descartada la órbita alrededor del logo.
- Retirados del canvas (quedan en el repo como historia): punto gigante, esfera tipográfica, objeto 3D, variantes
  contemporáneas y aplicaciones planas anteriores.

**Prueba sin logo (kit listo para campo):** fase de aprendizaje con logo y atribución de piezas nuevas sin logo;
600 personas (300 por versión), decisores de marketing y comercial en Chile, empresas de 50+ personas. Métrica: %
que elige «Efeonce» entre Efeonce, 5 competidores y «No sé». Éxito: +10 puntos sobre el distractor con 95 % de
confianza. Kit: `exploracion-v5/prueba-sin-logo/` (protocolo, cuestionario, 24 estímulos, potencia y análisis).

**Pendiente (decisión del operador):**

1. Presupuesto del banco de fotos propio (8 tomas, USD 5–10).
2. Panel de la prueba sin logo (Netquest, Cint o Toluna, a cotizar).
3. Firma de mail A o B, e instalarla.
4. Aprobar el banco de pares de copy.
5. El ADR de canonización.

**Pendiente (producción):** archivos de impresión y plantillas editables · componente de órbita en AXIS (hoy son tokens y una página de referencia) · la
frontera Greenhouse ↔ Efeonce (la línea es de Efeonce, no de Greenhouse) · que la línea no se filtre al trabajo de
clientes · copy en inglés · revisión legal de «Te hacemos visible» · accesibilidad medida en las piezas reales ·
tamaños mínimos del logo validados con prueba de impresión.
