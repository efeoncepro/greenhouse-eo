# Lecciones (casebook, lo más reciente primero)

Formato: qué pasó → regla → dónde quedó codificada → estado (Codificada + prueba / Codificada / Documental).

## 2026-11-05 · Alejar la cámara: usar el candidato crudo, no el recompuesto

**Qué pasó.** En el lote de 54 artículos muchas portadas salieron con el sujeto bajo. Pedir la posición en el prompt
(«COMPOSITION, MEASURED» con porcentajes del cuadro) no bastó: las v2 de equipaje, líquidos y noticias también
necesitaron expansión. Se alejó la cámara expandiendo el maestro con `ai:inpaint` y Flare (Sunburst con máscara devuelve
un panel negro; Flux Fill de fal no tenía saldo). El candidato recompuesto, con la zona protegida pegada bit a bit,
dejaba uniones visibles; un pase de corrección de uniones con máscara en la junta no se adoptó. Se usó el candidato
crudo (2560×1440, imagen completa rehecha) ampliado con lanczos a 3840×2160: quedaron 39 maestros ampliados. Costo: el
crudo es otra imagen; en Punta Cana la viajera desapareció, y el log avisó reencuadres.

**Regla.** Expansión con `zoomout.mjs` (lienzo + guía difuminada + máscara) → Flare high → `candidate-1-raw.png`
ampliado → `medir-portada` con la caja nueva → comparar con el maestro anterior (sujeto presente, mismo lugar).
Método pendiente de validación de Julio, igual que la ampliación 2560 → 3840.

**Dónde.** [hero-and-export.md](hero-and-export.md) §7; scripts en `projects/sky/blog-lote-2026-11/tools/imagenes/`
(`zoomout.mjs`, `runzoom2.sh`, commit del Workbench `e8b2098`). No está en el contrato ni en `prompt-plate`.
**Documental.**

## 2026-11-05 · Mitad inferior clara: el suelo de la expansión va en sombra profunda

**Qué pasó.** En portadas con arena al sol, espuma o pisos brillantes, el gate de contraste fallaba: el H1 blanco no se
leía en la mitad inferior aunque el sujeto estuviera arriba. Pedir el suelo «in soft open shade, calm and mid-toned» no
siempre alcanzó.

**Regla.** Repetir la expansión describiendo el suelo «in DEEP soft shade: matte, mid-dark and calm, never bright, with
no sunlit sand, no bright reflections and no white foam in the lower half», con un elemento real del lugar muy
desenfocado en el borde inferior. Nunca un velo ni un degradado propio encima.

**Dónde.** [hero-and-export.md](hero-and-export.md) §7 paso 2. **Documental.**

## 2026-11-05 · Retocar letras: máscara + Flare y un prompt que no nombre «logo»

**Qué pasó.** Tres fotos traían letras: el arco de Catacaos (portada) con letras inventadas, la inscripción tallada del
arco de Yanahuara y un letrero en la fachada de la escena 2 de la noticia de Talara. El retoque de Talara abortó
porque el prompt decía «no logo»: la guarda de marca de `ai:inpaint` corta cualquier mención de logo, marca o brand,
aunque sea en negativo. En Yanahuara la primera máscara cubrió media inscripción y quedó la otra mitad.

**Regla.** `ai:mask` (`--rect` o `--polygon`) + `ai:inpaint image` con `gpt-image-2.5-flare` high y
`OPENAI_API_KEY_PROFILE=personal`. El prompt describe la superficie limpia en positivo («…with nothing mounted on it»).
Si queda texto, segundo paso sobre el resultado con una máscara que cubra toda la banda. Mirar al 100 % y guardar el
`-antes.png`.

**Dónde.** [qa-review.md](qa-review.md) §1 «Letras dentro de la foto»; invariante 11 de `SKILL.md`. **Documental.**

## 2026-11-05 · Referencias reales: leer la descripción antes de licenciar

**Qué pasó.** Julio habilitó Shutterstock para las REF-01 y, donde no había, eligió Wikimedia Commons. La búsqueda de
Shutterstock devolvió para lugares de Perú fotos de otros países con nombres parecidos: «Oropesa landmarks, Spain» para
Lamas, un pinar de Norfolk para Costa del Este, un mercado de Marrakech para el aguaje de Iquitos, manglares de
Langkawi (Malasia) para Tumbes. Las búsquedas además agotaron el tope de 100 consultas por hora de la API.

**Regla.** Elegir mirando hojas de contacto con candidatos etiquetados y leyendo la descripción; licenciar en lote
después de elegir; sin REF del lugar real, la pieza queda bloqueada (portadas de Colán y Amigos, 6 escenas). Una REF
aproximada se declara en el expediente. Procedencia en `refs-ledger/` sin URLs firmadas.

**Dónde.** [sources.md](sources.md) §5; invariante 10 de `SKILL.md`; `projects/sky/blog-lote-2026-11/refs-ledger/`.
**Documental.**

## 2026-11-05 · Bajo 200 KB sin perder resolución: desenfoque leve del maestro

**Qué pasó.** 11 escenas con follaje, manglar u oleaje no bajaban de 200 KB ni con calidad 60 y `exportar.mjs` falló
en `toWebpUnder`. La regla prohíbe reducir resolución.

**Regla.** Exportar desde una copia del maestro con desenfoque leve a 3840 px, subiendo σ por pasos (0,6 · 0,9 · 1,2 y
luego 1,6 · 2,0 · 2,4) hasta que pase. En el lote bastó entre 0,6 y 2,0; a 1408 px no se ve, y se confirma mirando al
100 % la de σ más alto. El maestro original no se toca.

**Dónde.** [hero-and-export.md](hero-and-export.md) §5. Copias en `ai-generations/2026-11-05_sky-blog-lote/escenas/suave/`.
**Documental.**

## 2026-11-05 · `ai:inpaint` sin perfil paga la clave de empresa

**Qué pasó.** Julio preguntó «tenemos dos API key, ¿cuál estás usando?». Las generaciones con `ai:image` decían «clave
personal» en el log, pero `ai:inpaint` no acepta `--openai-key`: al quitar la flag rechazada, las expansiones y
retoques de portada (≈ USD 3, suma de los manifiestos) corrieron con la clave de empresa. Julio: «no hay problema».

**Regla.** Todo `ai:inpaint` de generación creativa se corre con `OPENAI_API_KEY_PROFILE=personal` delante; `ai:image`
con `--openai-key personal`. Revisar la línea de clave del log antes de seguir una tanda.

**Dónde.** Invariante 12 de `SKILL.md`; `runzoom2.sh` del lote ya lo antepone. Manual de la clave:
`docs/manual-de-uso/ai-tooling/alternar-clave-openai.md`. **Documental.**

## 2026-11-05 · El costo de un lote se suma una vez por log

**Qué pasó.** Al cerrar portadas y banners se informó a Julio «cerca de USD 43 en generación (cifra estimada de los
registros)». El comando sumó `batch*.log` y `../*/*.log` desde la carpeta `portadas/`: el segundo glob vuelve a incluir
los mismos `batch*.log`, que quedaron contados dos veces (143 líneas). Sin duplicar, las 49 generaciones de portada (43 piezas más
6 versiones v2) estiman ≈ USD 20,00 y las líneas de expansión y corrección de uniones, ≈ USD 3,03.

**Regla.** Sumar las líneas `costo estimado ≈ USD` con una lista explícita de logs, sin solapar globs, y decir que es
estimación (la entrada se cobra aparte). Separar generación, expansión y retoque.

**Dónde.** [workflow.md](workflow.md) §9; cifras corregidas en el expediente
`docs/services/sky-blog-seo/LOTE_NOVIEMBRE_2026_PRODUCCION_IMAGENES.md`. **Documental.**

## 2026-11-05 · Lote de noviembre: la caja del sujeto empieza en la coronilla y el zoom deja margen arriba

**Qué pasó.** En el lote de 54 artículos, muchas portadas generadas dejaban al sujeto bajo; se «alejó la cámara»
expandiendo el maestro con `ai:inpaint` (Flare) y subiendo la escena para que el sujeto quedara entre 13 % y 49 %
del alto. Tres portadas (noticia-talara, noticia-gol-cl, noticia-puntual-cl) pasaron `medir-portada` y aun así
mostraban la cabeza cortada en la vista de escritorio: la caja declarada empezaba en los hombros y la coronilla
quedaba en 13 %, justo encima de donde empieza la ventana del tema (~13,3 % del maestro). En Catacaos el arco de
entrada salió con letras falsas («ETTCGOUNTE»). En Paraty, «Santiago → Río de Janeiro» ocupa dos líneas en la
receta B de escritorio y el titular choca con el CTA.

**Regla.** La caja del sujeto parte en la coronilla (incluye pelo y sombrero), nunca en los hombros; si un zoom
sube la escena, el sujeto queda desde ≥ 18 % del alto. Toda letra legible dentro de la foto se retoca con máscara
antes de exportar (herrería, carteles, toldos). Si la ruta no cabe en la receta B de escritorio, ese formato pasa a
receta A; nunca se achica la letra (se probó y se revirtió por la regla aprobada del 2026-11-05).

**Dónde.** [hero-and-export.md](hero-and-export.md) §3 y §7; [route-banners.md](route-banners.md) §3. El zoom del lote
quedó copiado en `projects/sky/blog-lote-2026-11/tools/imagenes/zoomout.mjs` (Workbench `e8b2098`; se corrió con
`ZOOM_TOP=0.18`, el default del script es 0,13) y no en el contrato. El retoque de letras: lección «Retocar letras» de
arriba. Pendiente: llevar el margen a `HERO SPACE` / `medir-portada` como advertencia cuando la caja toca el borde
superior de la ventana. **Documental.**

## 2026-11-05 · Ruta primero, titular sin repetir el H1, avión que se lea como avión

**Qué pasó.** Julio revisó el banner del kickoff: «el avión no es un avión, son 2 palitos» (un trazo de líneas a
`rotate(8)` fijo, con la línea punteada pasando por debajo) y «la etiqueta debería ir antes del título del artículo,
porque el título ya lo tendrá el mismo artículo, y el nombre de la ruta debería destacar más». El primer reemplazo,
el ícono «Avión despegando» del pack, se veía chico y de perfil: «hazlo más avión moderno como el de SKY».

**Regla.** Orden de lectura logo → **ruta «Origen → Destino» (Metric Black, arriba)** → titular secundario (Metric
Bold, `purple/100`, máximo 6 palabras, nunca el H1 ni el meta title) → CTA. Sin etiqueta inferior. Si la ciudad no
cabe, el destino baja a la segunda línea; nunca se achica la letra. Avión: jet moderno visto desde arriba, relleno,
en `t = 0,42` del arco, girado por la tangente, con hueco en la línea punteada. Aprobado por Julio el 2026-11-05.

**Dónde.** `contracts/sky-blog-recipes.json → ruta.jerarquia, ruta.plane, ruta.copy, layouts.*.routeName`,
`compose/route-banner.mjs → routeName, routeGeometry, planeIcon`, `blog/assets/plane-topview.svg`;
`test/route-banner.test.mjs`. **Codificada + prueba.**

## 2026-11-05 · Nano Banana Pro queda fuera del blog

**Qué pasó.** Julio: «Nano banana pro no lo uses, no tiene buena calidad».

**Regla.** Todas las fotos con `gpt-image-2.5-sunburst` (max, 3840×2160). Con REF-01 real, el mismo motor en modo
edición (`--image`); las correcciones dirigidas, también. Probar otro motor exige medir contra 2.5 y autorización.

**Dónde.** `contracts/sky-blog-photography.json → engines.authorized / engines.excluded`; `test/engines.test.mjs`.
**Codificada + prueba.**

## 2026-11-02 · HERO SPACE sin margen superior corta la cabeza en escritorio

**Qué pasó.** Primera portada generada con el sistema (Cusco, San Blas, registro E, `gpt-image-2.5-sunburst` max
3840×2160, USD 0,40 por intento). V1: el sujeto quedó arriba y el H1 se leía (6 % / 5 % bajo 3:1), pero el gate dio
84 %: el recorte de escritorio quita el 12 % superior y le cortaba la cabeza. Con un maestro 16:9 casi no hay margen
vertical para arreglarlo con el foco.

**Regla.** HERO SPACE pide la mitad superior **sin tocar el borde**: margen de cielo o fondo sobre cabezas, manos alzadas
y remates del monumento. V2 pasó (86 %, 13 % / 7 %), aún justa arriba: declarar la caja del sujeto con honestidad y
mirar la vista de escritorio.

**Dónde.** `contracts/sky-blog-photography.json → heroSpace.prompt`. Corridas en
`greenhouse-eo/ai-generations/2026-11-02_sky-blog-linea/` y `projects/sky/blog-linea-grafica/salidas/cusco/`.
**Codificada** (la verificación es el gate).

## 2026-11-02 · El modelo puede invertir la posición del fotógrafo

**Qué pasó.** La V2 de Cusco pidió «quien fotografía sube tres escalones detrás de ella»; el modelo puso la cámara
delante, mirando calle abajo, con la compañera subiendo hacia el lente. La foto funciona y pasa el gate, pero no es la
microescena declarada.

**Regla.** El QA del registro E compara la posición declarada de quien fotografía con la que se ve. Si la ficha la exige
(por ejemplo, para la continuidad con IMG 2), es motivo de regenerar; si no, se registra la desviación en la ficha.

**Dónde.** [qa-review.md](qa-review.md) §1 (fila Miradas/microescena). **Documental.**

## 2026-11-02 · La energía de bordes no encuentra al sujeto

**Qué pasó.** El primer gate de portada medía dónde cae el «detalle» (Laplaciano sobre el percentil 94) respecto de la
ventana del sujeto. Con las 11 portadas de octubre, Mascotas (el perro queda bajo el H1) sacaba el mejor puntaje y
Paraty (buena portada) fallaba porque el adoquín de abajo tiene mucha textura. Bordes ≠ sujeto.

**Regla.** El sujeto de la portada se **declara** (`--sujeto u0,v0,u1,v1` en fracciones del maestro, mirando la foto) y se
verifica por geometría contra la ventana. La legibilidad del H1 sí se mide en píxeles (degradado del tema + contraste
3:1): coincidió con lo que se ve (Cancún playa 63 % y Valdivia 44 % bajo 3:1 son ilegibles; Lima 22 % se lee).

**Dónde.** `compose/hero.mjs → PORTADA_GATE, judgePortada` (sujeto obligatorio), `scripts/medir-portada.mjs`;
`test/hero.test.mjs`. El detalle queda como dato informativo. **Codificada + prueba.**

## 2026-11-02 · El hero del tema tapa la mitad inferior de la portada

**Qué pasó.** La Spec fijaba 1408×768 sin zona segura. Medido en vivo: el tema recorta a 2,42:1 en escritorio y 1,34:1 en
móvil y escribe categoría, H1 y fecha sobre la mitad inferior. En el post de Ayacucho el recorte cortaba la cara a la
altura de la nariz. De las 11 portadas de octubre pasan 3 (Lima, Paraty, Copacabana).

**Regla.** Ventana del sujeto: tercio central × mitad superior del 1408×768; mitad inferior tranquila y no demasiado
clara; primer plano de la portada por abajo. HERO SPACE en el prompt.

**Dónde.** `contracts/sky-blog-recipes.json → hero` (medición fechada), `contracts/sky-blog-photography.json →
heroSpace, foreground.heroEdges`, `scripts/prompt-plate.mjs --portada`. **Codificada + prueba.**

## 2026-11-02 · Primer plano: de obligatorio a decisión declarada

**Qué pasó.** Notion lo pedía «siempre», pero la misma Spec admitía escalar si no era plausible y el registro E del 08/10
no siempre lo llevaba. Una regla absoluta empuja a inventar objetos.

**Regla.** Por defecto cuando es plausible; el builder exige `--primer-plano` o `--sin-primer-plano "<razón>"` y lo
registra. Recomendación aceptada por el operador el 2026-11-02 («Sí, construye» sobre la propuesta).

**Dónde.** `contracts/sky-blog-photography.json → foreground`, `scripts/prompt-plate.mjs`; `test/prompt-plate.test.mjs`.
**Codificada + prueba.**

## 2026-11-02 · El banner de ruta no admite copy comercial ni rutas sin verificar

**Qué pasó.** El kickoff fijó «nunca precios, Oferta, Imperdible, Está bueno SKY ni comparaciones» y «sólo rutas activas
verificadas el día que se publica», pero nada lo hacía cumplir.

**Regla.** El compositor escribe CTA y etiqueta desde el contrato, rechaza el copy prohibido y exige `verificadaEl` +
`fuente`; el titular no se achica para caber. (Desde el 2026-11-05 la etiqueta inferior se retiró: la ruta va arriba;
ver la lección «Ruta primero».)

**Dónde.** `contracts/sky-blog-recipes.json → ruta.copy`, `compose/route-banner.mjs → validateRouteJob`;
`test/route-banner.test.mjs`. **Codificada + prueba.**

## 2026-11-02 · Notion tenía contenido de Berel en la wiki de SKY

**Qué pasó.** «Banners» y «Flujo de Producción Diseño» de la wiki SEO de SKY son copias de Berel.

**Regla.** Ninguna regla de esas páginas aplica al Blog SKY; esta skill no las cita como fuente.

**Dónde.** [sources.md](sources.md) §3. **Documental** (mover las páginas es decisión del operador).
