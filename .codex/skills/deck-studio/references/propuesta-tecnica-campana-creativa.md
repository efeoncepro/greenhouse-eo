# Propuesta técnica de campaña creativa para leer sin presentador

> **Estado:** referencia de oficio escrita el 2026-10-12 desde un solo caso: la propuesta técnica de
> «conceptualización y despliegue creativo» para Sika Mexicana (licitación privada, Wherex N.º 1164), deck 16:9 de
> 21 láminas, línea Brand (Efeonce Creative Studio). El operador la revisó lámina por lámina en el lienzo y sus
> correcciones son las reglas de abajo. **El paquete quedó terminado y exportado; no consta que se haya cargado en el
> portal y el resultado de la licitación se desconoce.** No cites este caso como propuesta presentada ni ganada.
>
> Es el molde hermano de [propuesta-tecnica-seo-sin-presentador.md](propuesta-tecnica-seo-sin-presentador.md): misma
> técnica (láminas HTML con tokens + láminas del compositor, PDF 16:9), otro argumento. Lo que aquí no se repite
> (objetos sobre la plataforma de luz, ritmo, logo del cliente sobre fondos oscuros, enlaces clicables) vale igual.
>
> Fuentes del caso: `ai-generations/2026-10-12_sika-propuesta-tecnica/LEEME.md` (procedimiento y tabla de fuentes por
> lámina), `build-tecnica.py` de esa carpeta y `docs/commercial/tenders/sika-mexico-campana-creativa-1164/`.

## Cuándo aplica

- El comprador pide una **propuesta técnica** para un servicio creativo: evolución de una línea gráfica, concepto de
  campaña, piezas de muestra y un método para producir lanzamientos sucesivos.
- El documento **se lee sin nosotros** (comité, compras, marketing) y compite contra otras agencias.
- Hay un **anexo gráfico aparte** con el trabajo a tamaño completo (manual de campaña, piezas, storyboard). El deck
  técnico lo cita y lo muestra en miniatura; no lo reemplaza. Decisión del operador en el caso fuente: son
  **documentos separados**, igual que la oferta económica (plantilla A4, nunca una lámina).

No aplica a un brochure de la práctica creativa ni a una propuesta que sólo vende el servicio: para eso mandan las
recetas del set aprobado (`pnpm brand:compose`).

## El argumento

La frase única del caso: *ustedes ya tienen un concepto que funciona; les entregamos un sistema para aplicarlo igual
en cada lanzamiento, y un método para producirlo.* De ahí sale el orden: **primero el trabajo, después la prueba de
que responde a lo pedido, después cómo se produce, quién lo hace y cómo sigue.**

Dos decisiones del operador fijaron la apertura (12/10): salió la lámina de resumen de «tres documentos» (su
contenido vive en la de cumplimiento) y **el deck abre con el trabajo**: tras la portada, la pieza madre a página
completa. Y la lámina de punto de partida dejó el tono de diagnóstico: parte de lo que el cliente ya hizo bien
(«Partimos de un concepto que ya funciona»), no de lo que tiene mal.

### Orden de las 21 láminas

| Tramo | Láminas | Función |
|---|---|---|
| **Apertura** | 1 portada · 2 la idea (Master Graphic a página completa) · 3 cumplimiento | Mostrar el trabajo antes de explicarlo y darle al evaluador el mapa: cada punto de la ficha, con sus palabras, y dónde está |
| **La propuesta** (sección 1) | 4 punto de partida · 5 evolución (qué se conserva / qué se ordena) · 6 el sistema · 7 el brief, punto por punto · 8 audiencias · 9 muestras · 10 alcance del sistema | Demostrar que la idea nace del material del cliente, que evoluciona sin reemplazar, que responde a su brief y que escala a otros productos y canales |
| **La producción** (sección 2) | 11 método (cinco etapas, dos aprobaciones del cliente) · 12 lanzamiento tipo · 13 reel (QR + enlace) · 14 plazo · 15 control (aprobación, rondas, contenido técnico, IA, derechos) | Convertir la idea en un servicio repetible: qué se entrega, en cuánto tiempo y quién decide |
| **El equipo** (sección 3) | 16 equipo · 17 trabajo con el país del cliente · 18 experiencia (caso) | Quién lo hace, con nombre; cómo se atiende al cliente; prueba medida en otra cuenta |
| **Continuidad e inicio** (sección 4) | 19 continuidad · 20 inicio (cinco insumos) | Un horizonte más largo que la muestra (el brief fijaba la campaña hasta diciembre de 2027) y un primer paso concreto |
| **Cierre** | 21 contraportada | `close-proposal` del compositor |

Las cuatro secciones llevan la navegación en anillo de La órbita y el eyebrow del capítulo («La propuesta · Evolución»,
«La producción · Plazo»). Las láminas 2, 3 y 18 y el marco van sin indicador.

Piezas que sostienen el argumento y conviene repetir:

- **Dos tablas de cruce, no una.** La 3 cruza la **ficha del portal** (lo que se evalúa); la 7 cruza el **brief**
  (factores diferenciadores, mensajes clave, tono) con la parte del sistema que lo resuelve. Son documentos distintos
  del comprador y contestan preguntas distintas.
- **«Se conserva / Se ordena»** en dos fichas, con el antes y el después de la firma debajo. Es la forma de mostrar
  una evolución sin descalificar lo existente.
- **Franja «Qué significa para ustedes»** con su fuente en cada lámina de contenido (ver regla 1).
- **Las piezas del anexo entran como miniatura con su página** («anexo gráfico, página 15»), recortadas del PDF del
  anexo (`pdftoppm -r 192`).

## Las nueve reglas del operador

Todas son correcciones del operador del 12/10/2026 sobre comentarios en el lienzo (la 7 es del 07/10). Donde hay cita
literal, va entre comillas; donde no quedó registrada, no se inventa.

1. **El deck se le habla a quien lo recibe.** Segunda persona formal: ustedes, su brief, sus respuestas. Nunca
   «Sika pidió / indicó / confirmó». *Porqué:* varias láminas le contaban a un tercero lo que el cliente dijo, y el
   documento se le entrega al cliente. El rótulo fijo pasó a **«Qué significa para ustedes»**. El nombre del cliente
   queda sólo como nombre de marca («el logotipo de Sika»). Costó cerca de 60 frases, corregidas con un script de
   reemplazos y un grep de verbos en tercera persona.
2. **Nada defensivo ni que limite alcance si el comprador no lo pidió.** El operador quitó entera la lámina de
   «piezas adicionales» («¿Es realmente necesario decir esto? ¿Para qué?»), la tarjeta «Fuera del servicio», una línea
   de moneda y facturación («no tiene sentido acá») y una de idioma y textos («¿en qué aporta acá?»). *Porqué:* una
   propuesta técnica muestra lo que se hace; las exclusiones, tarifas de extras y condiciones se conversan al
   formalizar o van en la económica si el comprador las pide.
3. **No exponer la distancia.** «Desde Chile» y «horas en común» «nos puede jugar en contra». Se dice lo que hay:
   personas en Chile y en México sobre la misma campaña, con una sola persona responsable. El repo no dice quiénes
   están en México: es indicación del operador y se confirma con él antes de repetirla.
4. **Plazo competitivo para el tamaño del cliente.** 15 a 20 días por lanzamiento fue «demasiado tiempo para un
   cliente de este tipo». Quedó en diez días hábiles, con la pieza madre a aprobación el día 4. **Ese plazo es
   propuesta propia, sin visto bueno de operaciones:** la regla es dimensionar el plazo contra el cliente y validarlo,
   no copiar «diez días».
5. **El caso de éxito es la lámina aprobada, no una hecha a mano.** El operador rechazó la versión dibujada para el
   deck («esta no es la lámina de caso de éxito nuestra») y pidió la foto concreta del caso (el avión de Sky, en lugar
   del ala al amanecer). Se usa `decision-case` del compositor. *Porqué:* lo aprobado se reutiliza desde su generador;
   redibujarlo o inventar una variante se rechazó dos veces en el mismo paquete.
6. **Equipo con nombre y tamaño.** Fotos reales del squad, nombre, cargo y función en el proyecto, un solo
   interlocutor destacado, y la cifra «+85 profesionales en toda Latinoamérica» en grande. Revierte el criterio «sin
   capacidad nominada» del borrador descartado. La cifra es del operador y **no tiene fuente en el repo**: se confirma
   con él en cada deck.
7. **Títulos directos, sin pregunta y respuesta** (instrucción del 07/10 para este deck). Siguen siendo afirmaciones
   («Cada punto de la ficha tiene su respuesta», «Diez días hábiles por lanzamiento», «Nada sale sin su aprobación»):
   lo que se retira es el formato de pregunta, no la conclusión en el título.
8. **Cumplimiento con las palabras de la ficha.** La lámina usa el texto literal de lo que pide el comprador y dice en
   qué lámina o anexo está cada cosa (sección siguiente).
9. **Si la ficha pide un video, se entrega un video.** La ficha pedía «1 video tipo reel no mayor a 30 seg». El
   comprador había admitido un storyboard, pero el operador decidió entregar el reel real (25 s, con locución y
   música). La primera versión, un animatic, fue rechazada porque «no se ve cinemático y profesional» para una marca
   que pauta en televisión: la muestra se juzga con la vara de la publicidad del propio cliente. Cómo se produjo el
   reel: sección «Reel v2» del `LEEME.md` del caso.

## La lámina de cumplimiento

Va en la posición 3, antes del desarrollo. Tres columnas: **«Lo que pide la ficha» · «Nuestra respuesta» · «Dónde
está»**.

- La primera columna copia **las palabras del comprador**, sin parafrasear («1 imagen para Facebook, 1 para Instagram
  y 1 video tipo reel», «Tiempos de entrega», «Propuesta económica desglosada»). El evaluador busca su propia frase.
- La respuesta es una línea con el hecho, no un adjetivo («Diez días hábiles por lanzamiento, desde la entrega del
  brief»).
- «Dónde está» nombra lámina, página del anexo, archivo o «documento aparte, en Wherex». En el generador esos números
  salen de `ref(clave)`, no se escriben a mano: al retirar una lámina (pasó el 12/10, de 22 a 21) se renumeran solos.
- Una fila final **«Además»** para lo que se entrega sin que la ficha lo pida (equipo con nombre, caso).
- La franja de pie dice para qué sirve («Pueden ir directamente al punto que evalúan») y cita la fuente exacta (ficha
  N.º 1164, apartado «Comentarios generales»).

Fundamento en [SKILL.md](../SKILL.md) §«En una licitación puntuada…»: el evaluador es ruidoso; el documento se diseña
para que no pueda dejar de encontrar la respuesta.

## Cómo se enlaza un video

Un PDF no reproduce video. El reel vive en una página propia y la lámina lleva hasta ella por **dos caminos**:

1. **QR** (`qrcode`, nivel M) en una ficha destacada: «Véalo en video · 25 segundos», «Escanee el código o abra el
   enlace».
2. **Enlace escrito** junto al QR, y además **clicable en el PDF**: como cada lámina entra como JPEG, el enlace se
   agrega como anotación URI sobre la ficha del QR (`pdf.mjs`).

Alrededor, la lámina muestra los cuadros del storyboard y una ficha «Qué incluye el reel». La lámina de cumplimiento
dice que el reel va como video y dónde está; el storyboard del anexo lleva el mismo QR.

La página (caso fuente, repo `efeonce-think`): `src/pages/muestras/<slug>-<token>.astro`, reproductor canónico
`AxisVideoPlayer` (skin Cinema), subtítulos VTT, póster, firma de la campaña renderizada desde el generador del manual,
`noindex` y sin analítica. **El token de la URL es discreción, no seguridad:** el MP4 queda público por URL directa.
El comentario de cabecera de la página dice cómo retirarla. No copies la URL con token a esta skill ni a documentos
compartidos.

Readback hecho en el caso: página 200 con `noindex, nofollow`, MP4 con rangos (206), VTT y póster 200, reproducción
en navegador a tamaño de teléfono. **No verificado:** escanear el QR con un teléfono real. El archivo de video también
viaja como adjunto (el reel pesaba 23 MB y existe una copia de 9 MB; los límites del portal quedaron sin resolver).

## Mecánica de producción

### Un generador, tres salidas

`build-tecnica.py` es la única fuente de las láminas hechas a mano. Con `local` escribe `out/html/NN.html` (rutas
locales); con `dc <project>` escribe los tableros `Tec-NN.dc.html` del lienzo, resolviendo cada imagen contra
`blobs.json` (nombre → `/_blob/<id>`).

```bash
node <caso>/axis-assets.mjs > <caso>/axis-assets.json      # navegación en anillo e íconos Trazo desde AXIS
pnpm brand:compose -- --intent <caso>/composer/cover.json --out <caso>/composer/out-cover
pnpm brand:compose -- --intent <caso>/composer/close.json --out <caso>/composer/out-close
pnpm brand:compose -- --intent <caso>/composer/caso.json  --out <caso>/composer/out-caso
cd <caso>
node quitar-seleccion-dawn.mjs composer/out-cover/01-deck-cover-proposal.png img/portada.png
python3 build-tecnica.py local && node render.mjs && node pdf.mjs out/<nombre>.pdf   # HTML → PNG → PDF
python3 build-tecnica.py dc out/canvas/project                                       # tableros del lienzo
```

- `render.mjs` captura cada lámina a 1920×1080 @1,5x, **avisa `DESBORDE`** cuando un bloque de alto fijo se sale y arma
  hojas de contacto de cuatro láminas.
- `pdf.mjs` arma el PDF con un JPEG por lámina (pdf-lib) y la anotación del enlace.
- `img/` no está en git: portada y cierre del compositor, fotos del squad
  (`src/lib/artifact-composer/catalogs/deck-axis/assets/squad/`) y recortes del anexo.
- El lienzo se publica con la herramienta Artifact (`root` = carpeta del lienzo, `file_path` = `canvas.json`, mapa
  `files`; `null` quita un archivo); imágenes y video suben como activos. El operador revisa **comentando sobre el
  tablero** y cada hilo se responde y se resuelve. Pidió no exportar PDF hasta su aviso: se exportó todo al final.

### Qué sale del compositor y qué se hace a mano

| Lámina | Cómo | Por qué |
|---|---|---|
| Portada | `cover-proposal`, layout `dawn`, línea `brand`, logo oficial del cliente | Portada y contraportada salen siempre del compositor (regla del molde SEO: «estas no son nuestras portadas») |
| Cierre | `close-proposal`, línea `brand`, con plate de cine | Ídem |
| Caso | `decision-case`, `theme: light`, `line: growth`, cifras con `source`, logo del cliente del caso, foto del caso | Regla 5 |
| Navegación e íconos | `deckSlideHtml`, `resolveIcon` y `auditIconGroup` de `@efeoncepro/axis-graphic-line` | Nunca se dibujan a mano |
| Las láminas con datos del cliente (2 a 15, 17, 19, 20) | HTML con tokens en el generador | No tienen receta: llevan la ficha, el brief, las piezas y las respuestas del comprador |
| Equipo (16) | A mano, con las fotos reales del squad del catálogo | La lámina de equipo del compositor truncaba los nombres completos y mostraba la selección «Cliente» |

La lámina de equipo a mano es una **brecha medida de la plantilla**, no una licencia: sigue usando fotos reales del
catálogo y nombres del roster (`docs/operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md`).

### Trampas medidas (12/10/2026)

- **Selección «Cliente» de la portada.** `cover-proposal` pinta la selección (etiqueta, cursor, marco y manijas) sobre
  el logo del cliente y **no se puede apagar desde el intent**. Se quita en post con un script por layout: en `dawn`,
  `quitar-seleccion-dawn.mjs` repone la etiqueta y el cursor con el espejo izquierdo de la lámina (es simétrica en
  x = 960), rellena el marco interpolando en vertical y devuelve intactos los píxeles del logo. Revisa el resultado al
  100 %: las coordenadas son de esa lámina y ese logo.
- **Respuesta de la portada en una línea.** Con dos líneas la respuesta se monta sobre la burbuja URL. Caso fuente:
  pregunta «Innovar es hacerlo posible», respuesta «Así lo hacemos».
- **`decision-case` sólo compone en claro y en línea `growth`.** Con línea Brand en claro falla con
  `line-piece-keeps-efeonce-dark`. En el caso fuente entró como lámina clara de Growth dentro de un deck oscuro de
  Brand, sin recolorear (el molde SEO recolorea las láminas importadas a un solo acento: decídelo con el operador).
- **Lámina de equipo del compositor.** Trunca nombres completos y muestra la selección «Cliente» (ver tabla).
- **Falla silenciosa por blob faltante.** El generador en modo lienzo fallaba en silencio cuando una imagen nueva no
  tenía su entrada en `blobs.json`. Sube el activo y agrega la entrada **antes** de generar los tableros, y comprueba
  que el generador termine imprimiendo el conteo («21 láminas»: es su última línea, leído en el código) y que los
  tableros cambiaron.
- **El enlace del PDF está atado a un número de página.** `pdf.mjs` pone la anotación en `13.png` con un rectángulo
  fijo (leído en el código, no medido como falla): si el orden o la posición de la ficha cambian, el enlace queda en
  otra lámina. Tras reordenar, vuelve a comprobarlo.
- **El generador conserva funciones retiradas** (resumen, piezas adicionales, caso a mano). Los barridos de texto se
  corren sobre la salida (`out/html`), no sobre el `.py`.

## Lista de control antes de exportar

1. **Releer la ficha y el Centro de mensajes completo**, incluidas las respuestas a otros proveedores, antes de
   congelar. En el caso fuente una exigencia se leyó tarde (ver «Lo que quedó sin cubrir»).
2. **Cumplimiento:** cada fila con las palabras literales de la ficha; abrir cada lámina, página y archivo que cita.
3. **Tercera persona** (regla 1), sobre la salida:

   ```bash
   grep -nEo "(<Cliente>|el cliente|la marca) (pidió|pide|indicó|indica|confirmó|confirma|respondió|definió|solicitó|señaló|admitió|espera|quiere|necesita)[^<]{0,40}" out/html/*.html
   grep -nEo "Qué (recibe|significa para) [A-Z][a-z]+" out/html/*.html
   ```

   Cuando el operador corrige un tono, se barre **todo** el documento y también el anexo, no sólo la lámina
   comentada: el anexo del caso conservaba frases en tercera persona.
4. **Lenguaje defensivo o que limita alcance** (reglas 2 y 3):

   ```bash
   grep -nEio "(fuera de (la oferta|el alcance|del servicio|del alcance)|no (forman?|es) parte|no incluye|no se garantiza|no considera|se cotiza aparte|por separado|adicional(es)?|desde Chile|horas en común|huso)[^<]{0,50}" out/html/*.html
   ```

   Cada acierto se decide con el operador. Medido el 2026-10-12 sobre la salida del caso: la lámina 10 conserva «no
   forman parte del alcance base» y «fuera de la oferta base»; el operador no las comentó.
5. **Coherencia con los otros documentos del paquete.** Lo que el deck dice de la económica, del anexo y del reel
   tiene que coincidir con cómo quedaron. Medido el mismo día: las láminas 3 y 12 anuncian «el valor de cada pieza»,
   y la económica terminó desglosada por concepto (evolución gráfica, conceptualización, entregables). Ver
   [decision-package.md](decision-package.md).
6. **`render.mjs` sin `DESBORDE`** y **las 21 láminas miradas al 100 %**, no en la hoja de contacto.
7. **Portada:** sin selección, respuesta en una línea, logo oficial del cliente. El uso de la marca del cliente en la
   portada y de su material en miniaturas sigue la autorización de logos (TASK-1937).
8. **Caso:** la lámina del compositor, con la foto del caso y cada cifra con su fuente. Citar a ese cliente en una
   licitación requiere su autorización para **esta** pieza (en el caso fuente quedó sin verificar).
9. **Equipo:** nombres y cargos del roster, fotos reales, cifra de tamaño confirmada por el operador.
10. **Plazo y rondas** con visto bueno de operaciones (en el caso fuente no lo tenían).
11. **Video:** el QR y el enlace abren la página desde el PDF final; la anotación se cuenta por API
    (`page.node.Annots()`), no con grep sobre los bytes; escanear el QR con un teléfono real.
12. **Lienzo y PDF dicen lo mismo:** misma cantidad de láminas, mismas imágenes.
13. **Peso del PDF** contra el límite de adjuntos de las bases (el del caso pesó 11 MB).
14. **Lo que es propuesta propia**, listado para el operador (el `LEEME.md` del caso lo trae como «Por confirmar antes
    de enviar»). Ninguna lámina lo presenta como compromiso validado.
15. **Gate de licitación:** `pnpm tender:canonical-gate <slug>`. En el caso fuente el cierre de Proposal Studio estaba
    en `workshop_only` (leído el 2026-10-12): el deck era taller local, no un entregable registrado.
16. **Exportar sólo con el aviso del operador**, y nada se carga ni se envía en el portal sin su confirmación expresa
    en ese momento.

## Lo que quedó sin cubrir

- **SLA por niveles de complejidad.** El comprador respondió a otro proveedor (09/10, en el Centro de mensajes) que
  espera una propuesta de SLA por niveles de complejidad. Se leyó el 12/10 y **el deck no la trae**. No hay un SLA
  aprobado que copiar: si el comprador lo pide, se define con operaciones y entra en el tramo de producción (junto a
  plazo y control). Esa ubicación es sugerencia de esta referencia, sin validar.
- **Plazo de diez días** sin visto bueno de operaciones.
- **Autorización** del cliente del caso para citar sus cifras, y uso de la marca del comprador en la portada.
- **Quiénes están en el país del cliente:** lo afirmó el operador; el repo no lo documenta.
- **Conflicto de interés** con otro cliente del mismo rubro: sin decidir (por eso no se menciona).

## Diferencias con el molde SEO/AEO

| | Molde SEO/AEO | Este molde |
|---|---|---|
| Títulos | Cinco capítulos con una pregunta cada uno; pregunta y respuesta con lógica | Directos, sin pregunta y respuesta (regla 7) |
| Rótulo de la franja | «Qué significa para <cliente>» | «Qué significa para ustedes» (regla 1) |
| Apertura | «Cómo leer esta propuesta», diagnóstico con revisión pública | El trabajo a página completa y la tabla de cumplimiento |
| Ubicación del equipo | Banderas por persona cuando el cliente la pide | Presencia, no distancia (regla 3) |
| Caso importado | Recoloreado a un solo acento | Lámina clara de Growth, sin recolorear |
| Supuestos | Reunidos en un anexo | Sin anexo de supuestos ni bloques de exclusión (regla 2) |

Coinciden en lo demás: nada de autodefensas ni de riesgos que nadie planteó, portada y cierre del compositor, sin
selecciones que no dicen nada, registro formal y nada enviado sin el operador.
