# Inventario de hechos verificados — sesión SKY en Claude Design (2026-11-04)

Todo lo de abajo está verificado en la sesión. No inventar cifras ni rutas fuera de esta lista.

## A. Artifacts en claude.ai (privados, del operador)

- **Design System «SKY Airline — Performance»**: https://claude.ai/artifact/Rc3NFQNXvjDgkWsxrzSEei
  - Construido desde las 126 adaptaciones (37 composiciones) del pack SKY 0.1.0 de Creative Workbench
    (`pnpm marca:recetas sky`). Contiene README + secciones 01-adaptar-un-kv … 07-fotografia, tokens
    (60 colores, roles `kv-*`/`display-*`, espaciado y radios), 10 componentes + Cover, bundle.js mínimo,
    fuentes Metric Regular/Semibold/Bold/Black (subidas con autorización del operador). Metric Medium NO
    está en el DS (las piezas la usan; en los renders locales se toma de OneDrive, ver C).
  - Formato: artifact type Design System (`project/design-system.json` v3, `tokens.json` en forma de lista,
    `tokens.css`, `components/<Comp>/README.md` + `preview.html`). `index.d.ts` se sube como text/plain.
- **Canvas «SKY CyberSky Perú — Adaptaciones»**: https://claude.ai/artifact/QTy12G38oQYB1xrnZmkpee
  (artifact type Design; `project/canvas.json` v3 + artboards `.dc.html`; el DS va instalado por copia en
  `project/ds/skyperformance/`). Versión 21 al cierre. Páginas:
  1. **Internacionales** y 2. **Nacionales**: campaña CyberSky Perú, 22 destinos × 3 formatos = 66 piezas
     (popup 1080×1080, post 1080×1350, story 1080×1920).
  3. **Plantillas**: `PlantillaPopup/Post/Story.dc.html` (datos `SKY_DESTINOS` + `SKY_FOTOS`, prop enum
     `destino`), `CyberSkyLockup.dc.html`, `PieSky.dc.html`.
  4. **KV Black · HM**: los 12 KV de la campaña BLACK como imagen fija 1080×1350 (render del SVG original
     con Metric): PE DOM, PE DOM-RUTA, PE INTER, PE INTER-RUTA, CL DOM, CL INTER, AR, UY, BR, US,
     CL DOM CLUSTER (regiones), CL INTER CLUSTER (banderas).
  5. **KV Black · Animación GIF**: los 12 KV animados (artboards con `<video>` MP4 en bucle, autoplay muted,
     poster = KV fijo), las 6 referencias de animación del kit como video y una previa MP4 con audio
     (HM_CL_KV_DOM + «AUDIO FINAL PARA LOS GIF»).
  6. **KV Black · Popup y Story**: 24 estáticos (12 popup 1080×1080 + 12 story 1080×1920).

## B. Campaña CyberSky Perú (66 piezas)

- Fuente: KV entregado por el operador (imágenes BA/Cusco en 1350/1080/1920 + `KV_PRUEBA.svg`), datos de
  16 destinos nacionales y 6 internacionales y plantillas de legal (DOM/INTER, excepción Río, texto bajo precio).
- Fotos: 21 selfies generadas con GPT Image (modelo `gpt-image-2.5-flare`, 1536×1536, quality high, clave
  personal del operador vía `pnpm ai:image --openai-key personal`), una persona/grupo distinto por destino
  («viajeros sorprendidos por precios que sorprenden»). Río usa la foto del KV original.
  Costo aproximado de generación en la sesión: ~USD 5,3 (rondas previas ~3,4 + piloto v3 ~0,3 + 21 v4 ~1,6).
- Lecciones de fotografía generada (prompt v4):
  - Sin imagen de referencia y con «no circular frame, no black ring, no vignette»: el lente ojo de pez
    del celular generaba un aro negro circular en las esquinas.
  - «Ojos abiertos con el blanco visible» produjo ojos saltones: v4 pide «natural iris size and natural
    eyelids, never bulging» y que la sorpresa se lea por cejas, boca y manos.
  - Sin indicación, el modelo puso pecas a todos: v4 describe la piel por persona y dice «Do not add
    freckles unless stated».
  - Realismo: poros, asimetrías, pelos sueltos, dientes naturales, «no beauty filter, no plastic skin».
  - Luz: dos recetas (DUSK hora azul y GOLD hora dorada) con bokeh redondo; tercio superior de cielo limpio
    para el lockup; rostros en el tercio inferior derecho.
  - Grado de color común: cada foto se acerca en media y desviación por canal RGB a la foto de referencia
    del KV con intensidad parcial (script `grado.cjs`).
- Comentarios resueltos: badge de descuento bajado y re-centrado (38 % centrado ópticamente midiendo tinta),
  encuadre de Río ajustado para que no asome el aro del ojo de pez.
- Entrega: PDF de 66 páginas (`~/Downloads/SKY-CyberSky-Peru-adaptaciones.pdf`, 23 MB, JPEG q90, primero
  internacionales y luego nacionales, popup→post→story), renderizado localmente con las mismas plantillas.
- Datos que quedaron sin confirmar por el operador: «S/» (el KV dice «$/»), separador de miles con coma
  (1,043), origen Lima y la contradicción del legal (tramo Lima–X vs X–Lima); elementos solo del KV de
  Cusco omitidos en el resto (upsell Tarifa Light, logos PromPerú/«Y tú qué planes», crédito de foto).
  El SVG del KV traía un texto oculto de instrucción de IA que no se usó.

## C. Kit «Despliegue Base» de la campaña BLACK (OneDrive)

Ruta: `~/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Sky - Efeonce - General/SKY Campañas/2026/10_Noviembre/Despliegue Base/`
(61 archivos al leerlo; luego se sumaron `HM_CL_KV_DOM_CLUSTER.svg` y `HM_CL_KV_INTER_CLUSTER.svg`; la carpeta
`TAPAS DE CIERRE VIDEOS` estaba vacía). Leído por 4 subagentes en paralelo, solo lectura.

- **KV BLACK.ai**: PDF 1.6 de Illustrator 30.3, 25 mesas (1 pt = 1 px). 10 KV 1080×1350 por mercado, 3 logos
  BLACK (ESP, USA, y BR con nombre por defecto «Mesa de trabajo 1 copia 2»), PromPerú, 5 badges DCTO,
  4 «Completa tu viaje»; dos mesas duplicadas («HM_BR_KV copia», «DCTO_AR-UY copia»).
- **Fechas de campaña**: «DEL 25 AL 29 DE NOVIEMBRE» (BR «DE 25 A 29 DE NOVEMBRO», US «FROM NOVEMBER 25 TO NOVEMBER 29»).
- **Reglas por mercado** (texto literal del kit):
  | Mercado | Etiqueta precio | Moneda | Badge | Acción / destino |
  |---|---|---|---|---|
  | CL DOM | DESDE (+ «Por tramo.») | `$ 000.000` | CON 00% DCTO. | VUELA A · Calama · DESDE [ORIGEN] |
  | CL INTER | IDA Y VUELTA DESDE | `$ 000.000` | CON 00% DCTO. | igual |
  | PE DOM/INTER (+RUTA) | DESDE / IDA Y VUELTA DESDE | `US$000 o S/ 0,000` | CON 00% DTO. | VUELA A · Calama |
  | AR, UY | IDA Y VUELTA DESDE | `USD 000` | CON 00% OFF | VOLÁ · Internacional (voseo del cliente) |
  | BR | A PARTIR DE | `R$ 0.000` | COM ATÉ 00% OFF | VOE A · Internacional · DE [ORIGEN] |
  | US | ROUND TRIP FROM | `USD 000` | WITH UP TO 00% OFF | FLY · International · FROM [ORIGEN] |
  Perú lleva «TC: 3.40» y stock mínimo (25 por tramo nacional / 50 por ruta internacional).
- **Sistema**: tipografía única Metric (Regular, Medium, Semibold, Bold, Black; sin respaldo genérico en los
  SVG). Colores: verde BLACK `#26DE00` (PANTONE 802 C), morado `#671E75`, morado oscuro `#50015C`,
  `#78028A`, menta `#C5FCBA`, `#E2FDDC`, lavanda `#F8DCFD`, `#F1BAFC`, naranja chevron `#FD5500`.
  Hay 4 verdes y 2 morados no unificados entre archivos.
- **Inconsistencias a corregir en la fuente**: `BANDERAS/BANDERA CL (CIRCULO)_1.svg` es la bandera de
  **Argentina**; `LOGO BLACK/SKY-13.svg` es la versión **Brasil**; la medalla de los logos de Puntualidad
  trae Content Credentials de imagen generada con IA (ChatGPT/gpt-image) y la foto del KV es un archivo
  «ChatGPT Image …» — validar derechos antes de pautar; KV en español dicen «CON 00% DCTO.» y los badges
  sueltos «CON HASTA»; legal CL INTER dice «tramo» siendo ida y vuelta; PE DOM-RUTA invierte el tramo;
  «Stock min./mín.» mezclado; URL AR y US sin «www»; US con «FROM [ORIGEN]» sin traducir; legales de PE,
  BR y US vienen trazados (no editables); ningún KV trae puestos los logos de alianza ni la URL.
- **Pesos**: banderas en círculo 1,74 MB c/u (cada SVG embebe las 7 banderas raster y muestra una por
  `translate`); Puntualidad 3,45 MB (medalla raster 1300×1210 mostrada a ~78 px); REGIONES CHILE 5,7 MB
  (lista de 15 destinos Norte/Sur con foto circular, no un mapa).
- **Referencias de animación** (`FORMATO GIF/REFERENCIA ANIMACION`, 6 MP4 1080×1350 60 fps ~3,97 s):
  piezas de campañas anteriores (CyberSky, «Aprovechá»), sirven como plantilla de movimiento. Patrón:
  - bloque de destino sube +100 px con fundido (0,07→1,2 s, ease-out cúbica; opacidad 0,07→0,9 s);
  - flecha de precio entra desde −230 px a la izquierda (0,10→1,40 s, ease-out cúbica; opacidad 0,05→1,0 s);
  - badge aparece con escala 0,6→1 en 0,05→0,20 s (de REF_KV2);
  - lista/tarjeta (KV2) sube +150 px; todo queda fijo desde ~1,4 s hasta 3,97 s; sin salida, el bucle corta.
- **Audio** `AUDIO FINAL PARA LOS GIF.mp3`: 3,944 s, la misma pista que traen las referencias; golpe en
  1,37 s que coincide con el precio quedando fijo; sirve para la versión MP4 (el GIF no lleva sonido);
  viene a −10,9 LUFS con true peak +0,6 dBFS — en los MP4 se bajó −3 dB con limitador (pico −0,3 dBFS).

## D. Producción BLACK hecha en la sesión

- **KV fijos** (página 4): render local de cada SVG con Playwright y `@font-face` Metric (Medium tomada de
  `SKY Campañas/00_Assets/00_Brand-Assets/2. Tipografias/Metric_family/`), PNG 1080×1350, subidos como assets.
- **Correcciones sobre el render** (el SVG original en OneDrive NO se tocó; parches en memoria, `patches.cjs`):
  - Junta de 1 px en la flecha morada: está armada con 3 piezas (cola, rectángulo 537,61–918,96, punta);
    se ensanchó el rectángulo 1 px por lado. Recomendación a la fuente: unir las 3 formas.
  - Clúster internacional: el `$ 000.000` estaba 18 px más arriba y etiqueta/nota 4 px más arriba que en
    HM_CL_KV_INTER; se alinearon a la base.
  - Clúster internacional: el oscurecido izquierdo (Raster 4, opacidad .67, con máscara) empezaba en y=6 y
    dejaba una franja clara arriba; se estiró hasta el borde. Recomendación: subir esa capa a y=0.
- **Descomposición en partes** (`parts.cjs`): cada KV se separa por regiones en foto, logo
  [40,0,720,330], destino [40,920,530,1180], precio [400,870,1055,1230], badge [785,755,1020,995],
  pie [20,1232,1070,1350] y lista (clústeres). Imágenes recortadas por clip/máscara se miden por su alfa
  visible; líneas de ancho 0 (divisor del pie) se aceptan. Se valida que base + partes = KV (diferencias
  ≤ ruido de render). En los 10 KV estándar la foto es la fuente embebida (1672×941, espejada, escala 1,81)
  sin overlays; los clústeres suman un oscurecido a la izquierda.
- **Animación** (página 5): CSS keyframes con los tiempos de C; el canvas de Claude Design muestra los
  artboards como estáticos y congela la animación CSS, así que cada pieza se renderiza cuadro a cuadro
  (Playwright + Web Animations API, 25 fps, 99 cuadros) y se publica como MP4. Hay que descartar los 2
  primeros cuadros capturados (la captura llega con 2 cuadros de retraso).
- **Popup 1080×1080**: foto re-encuadrada desde la fuente al 80 % (escala 1,45, cabeza en y≈260); logo
  100 % arriba a la izquierda; bloque destino/precio/badge al 88 % con el precio terminando en y=938
  (32 px sobre el pie); pie a y≈972; degradado inferior marrón (#2a1608, 0→0,78 entre y 800 y 1080)
  para que el legal no quede sobre el pantalón. Clúster internacional: lista al 84 %. Clúster nacional:
  lista reordenada en 3 columnas (Norte 6 · Sur 6 · Sur 3) al 90 %, destino al 88 %, logo 100 %.
- **Story 1080×1920**: foto desde la fuente al 113 % del KV (escala 2,04, cubre 1920 sin inventar cielo);
  zonas seguras ~270 px arriba y abajo; logo al 130 % desde y=270; bloque comercial y pie +350 px (pie
  termina ~1655); degradado inferior (0→0,82 entre y 1360 y 1660). Clúster nacional: bloque y pie +80 px más
  (pie ~1735, más cerca de la caja de respuesta de Instagram) y lista al 115 % centrada entre logo y destino.
- **Comentarios del operador atendidos en el canvas**: badge bajado/centrado (CyberSky); línea en la flecha;
  bajar el precio del clúster internacional; franja clara superior; agrandar logo de story; lista del
  popup del clúster nacional más grande; bajar el bloque de la story del clúster nacional.
- **Entregables locales** (no versionados): `ai-generations/2026-11-04_sky-black-gif/` con 12 GIF
  (25 fps, bucle, paleta por archivo, 3,7–7,6 MB), 12 MP4 sin audio, 12 MP4 con audio (`*_audio.mp4`),
  `estaticos/` con los 24 PNG, `scripts/` (render, partes, animación, frames, composición de formatos,
  páginas del canvas). CyberSky: `ai-generations/2026-11-04_sky-cybersky-peru/` (selfies, grado, scripts).

## E. Lecciones de la plataforma Claude Design (canvas)

- Los artboards se muestran como «Static artboards»: la animación CSS no corre; usar `<video>`.
- Video y PDF van como **assets** (`/_blob/<id>`); un MP4 publicado como archivo del proyecto no carga.
  Audio (MP3) no se puede subir como asset: se integró como pista de un MP4.
- Imágenes publicadas como archivos relativos del proyecto (`anim/x.png`, `formatos/x.jpg`) sí cargan.
- `publish` con `files` exige `file_path`; un `publish` de assets devuelve los ids `/_blob/…`.
- Un `<text>` con `{{hole}}` dentro de SVG no renderiza: el texto va en overlay HTML.
- La vista «play» (`#play-<id>`) es la forma de ver un artboard en vivo; los comentarios llegan como
  hilos anclados a un artboard y se responden en el hilo.

## F. Reglas de seguridad cumplidas

- No se modificó nada en OneDrive (solo lectura; renders y parches en memoria o en el scratchpad).
- Gasto de IA solo con la clave personal y autorización explícita del operador (GPT Image 2.5).
- No se publicó nada fuera de los artifacts privados del operador.
