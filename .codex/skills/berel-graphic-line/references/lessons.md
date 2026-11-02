# Lecciones Berel — registro fechado de aprendizajes y correcciones

> Solo Berel. Más reciente primero. Cada entrada: cita textual del operador (cuando la hubo), qué pasó, la regla que
> quedó y dónde quedó codificada. Las rutas son del Workbench (`/Users/jreye/Documents/creative-workbench`) salvo
> que se diga otra cosa.
>
> **Sobre las fechas:** todo ocurrió en una sola sesión que cruzó del 2026-11-01 al 2026-11-02. Cuando las fuentes no
> registran el día exacto, la entrada dice «2026-11-01/02» y el orden sigue el de `docs/operations/HARNESS_STATUS.md`.
>
> **Cómo agregar una lección:** arriba de todo, con el mismo formato; codifica la regla en el contrato, el código o
> una prueba (una lección que solo vive aquí se olvida) y anota dónde. Si es de fotografía, agrégala también a
> `lessons` de `brands/berel/contracts/berel-photo-registers.json`.

| Estado | Significa |
|---|---|
| **Codificada + prueba** | La regla está en contrato o código y una prueba la cubre |
| **Codificada** | Está en contrato o código, sin prueba propia |
| **Documental** | Solo en docs o skills: depende de que el agente la lea |

---

## 2026-11-02 · Reel: el color del muro se mide y el motor se elige por toma

- **Cita:** «el efecto de los elementos lo resuelve mejor flux 3, es más fluido».
- **Qué pasó:** con los mismos cuadros antes/después, Wan 3.0 llevó la terracota a salmón (ΔE 18,3); MiniMax H3 clavó el
  color pero metió los muebles como fundido semitransparente; FLUX 3 dejó la herrería de golpe (reja y muro de un cuadro
  a otro); Omni armó la cama por partes y pintó el muro con rodillo. Ningún motor ganó en las cuatro tomas. Medir ΔE en
  una caja fija del muro daba otro número que la máscara (recámara 3,2 vs 3,6).
- **Regla:** FLUX 3 por defecto y Omni por toma; el QA mide el color sobre la máscara del muro (ΔE ≤ 4) y el salto entre
  cuadros (≤ 5 %), y falla cerrado; lo que no mide (fundidos, objetos flotando) se mira en la hoja de cuadros.
  Higgsfield puede devolver una recomendación de preset en vez del job: se reenvía con `declined_preset_id`.
- **Dónde quedó:** `contracts/berel-video-reels.json`, `compose/video.mjs`, `scripts/reel.mjs`, `test/video.test.mjs`.
  **Codificada + prueba**. **Reemplazada en parte por la lección siguiente** (motor y compuerta del salto).

## 2026-11-02 · Reel: los objetos se forman en su lugar y frenan suave

- **Citas:** «el efecto de los videos de Berel es como de que saltan a la escena»; tras el rebote, «se ve muy irreal,
  el efecto es más suave»; «no aparecer por aparecer… es suave, como un salto suave»; y sobre la toma final, «sí, es ese».
- **Qué pasó:** tres prompts fallaron antes de medir el corpus: fundidos («smooth continuous transformation»), caída y
  rebote («drops in / hops»: irreal) y aparición seca («appears in place»: el objeto está en un cuadro y no en el
  anterior). Medido cuadro a cuadro en los reels publicados, cada objeto se **forma** en 0,5–1 s (crece, se despliega,
  se desenrolla, baja o entra por el borde) con un frenado suave, en cadena solapada. Con esa gramática en el prompt,
  Seedance 2.0 dio la toma aprobada (salto 4,2 %, ΔE 4,0 → 0,7 con `corregir`).
- **Regla:** Seedance 2.0 por defecto con la plantilla del contrato; el `--transformacion` nombra cómo se forma cada
  objeto (nunca *appears*, *drops in*, *hops*, *bounces*). El salto entre cuadros es dato, no compuerta (14 de 29 reels
  publicados pasan del 5 %); solo el color falla cerrado. Ante una descripción de movimiento ambigua, mirar el corpus
  cuadro a cuadro antes de reescribir el prompt.
- **Dónde quedó:** `contracts/berel-video-reels.json` (`effect`, `videoPrompt`, `approvedExample`, `engines`) y una
  prueba que verifica que la plantilla reproduce letra por letra el prompt aprobado. **Codificada + prueba**.

## 2026-11-02 · Producto: un buen montaje no parece montaje (método guiado, 1,4×)

- **Cita:** «sunburst si le pasas bien la referencia es completamente capaz de poner el producto sin tergiversar su
  etiqueta… cuando lo pones de forma determinística la etiqueta se nota y se ve un mal montaje… un buen montaje se conoce
  por NO parecer un montaje». Después, sobre el tamaño: «Publicitario».
- **Qué pasó:** la vía híbrida (etiqueta restituida desde el render) daba fidelidad 0,96–0,99, pero la etiqueta se veía
  pegada. Con el render como segunda imagen de referencia, Sunburst redibujó el producto con etiquetas correctas, pero lo
  agrandaba 1,35–1,6× de forma dispareja; a escala física pura se leía chico.
- **Regla:** el código fija tamaño y posición (diámetro × presencia 1,4, declarada) y el modelo pone el acabado;
  `verificar` exige alto 0,88–1,12×, corrimiento ≤ 30 px y escena ≤ 8/255, con OCR como aviso. `restituir` es respaldo.
- **Dónde quedó:** `berel-photo-registers.json` (`productInScene.method`, `defaultPresence`, `levers.presenceFactor`,
  `pilotGuided`); `compose/product.mjs` (`integrationPrompt`, `verifyPlacement`); `scripts/producto-en-escena.mjs`
  (`verificar`); `scripts/ocr-vision.swift`. **Codificada + prueba**.

## 2026-11-02 · Escala ≠ presencia: la superficie del producto se planea en el plate

- **Cita:** «Joven se sigue viendo muy muy pequeño, un galón de 4 Lts jamás se verá así, jamás».
- **Qué pasó:** con la escala física correcta, un galón a 4 m de la cámara se veía chico. Con la cámara a 1,2 m de
  altura, el piso cercano queda fuera del cuadro: no se podía acercar después.
- **Regla:** un producto protagonista necesita una superficie planeada desde la toma (`PRODUCT SURFACE` en el `--extra`:
  aparador o banco a ≈ 1,5 m); nunca se agranda en su lugar. Recortes: blog anclado abajo, story lo deja fuera, el
  producto nunca toca el logo del post.
- **Dónde quedó:** `berel-photo-registers.json` (`levers.presence`, `levers.crops`, `storySafeBaseV`). **Codificada**.

## 2026-11-02 · Renders maqueta: la forma tiene que corresponder al contenido

- **Cita:** «El aerosol de mancha también se ve mal, así no se ve un aerosol, es probable que el render estuviese malo».
- **Qué pasó:** los renders de Mancha 1 L (y algunos diluyentes) tienen forma de aerosol con boquilla y dicen
  «CONT. NET. 1L»; no existe un aerosol de 1 L. Eran maquetas.
- **Regla:** antes de colocar un render, comprueba que su forma corresponde al contenido; las maquetas no se usan. Para
  madera, la lata redonda real (Laca de Nitrocelulosa 1L). Pedir a Berel el empaque real de las Manchas.
- **Dónde quedó:** `berel-photo-registers.json` (`productInScene.excludedRenders`). **Codificada**.

## 2026-11-02 · Dos logos con producto en escena

- **Cita:** «Si, que salga dos veces el logo».
- **Qué pasó:** la regla de un logo por pieza chocaba con la etiqueta del envase, que ya muestra el logo Berel.
- **Regla:** la etiqueta es producto, no firma; la pieza conserva su logo compuesto. La regla de un solo logo aplica a los
  logos compuestos.
- **Dónde quedó:** `berel-recipes.json` (`never`); `productInScene.levers.signature`; libro §8. **Codificada**.

## 2026-11-02 · Lecho del logo: probado y apagado

- **Cita:** «Si no funciona no te compliques con el lecho... hasta el momento lo hemos hecho sin él y sin problema».
- **Qué pasó:** el primer plano desenfocado subió el logo de 1–2,5:1 a 10–19:1, pero ocupó en mediana el 9 % del cuadro
  (17× el logo) y el operador lo vio grande. Al achicarlo y anclar los recortes, el exterior soleado y el marco
  de puerta no lo sostuvieron, y 9 de 13 lechos repetían la misma forma.
- **Regla:** el lecho queda opcional y apagado (`--lecho`, `photo.lecho`); el esfuerzo va a las tomas y a la banda del titular.
- **Dónde quedó:** `berel-photo-registers.json` (`foreground.status`, `lessons`). **Codificada + prueba**.

## 2026-11-02 · El titular nunca sobre un objeto

- **Cita:** «asegurarnos de que la foto deje un espacio para que el texto del título sí tenga dónde estar sin que tenga
  objetos o algo detrás».
- **Qué pasó:** el titular de post y story ocupa una banda arriba, casi a todo el ancho del recorte, no solo la esquina.
  En el piloto fallaron las tomas cuya propia cámara metía textura ahí: cielo de tormenta, sombras de hojas, reja alta,
  rodillo, árbol, lámpara colgante. Con `TEXT SPACE` en el prompt y la cámara de cada toma corregida pasaron 12 de 12
  (exterior y proceso cambiando el focal del post). Una story con bordes 5,28 pasaba la medición y aun así «calidez»
  rozaba la ventana.
- **Regla:** `titleSpace` en todo prompt; `medir-plate.mjs` antes de componer con el focal del job; el umbral 6 no
  reemplaza mirar: el titular no toca ningún objeto, y ante duda gana el titular limpio sobre la viñeta.
- **Dónde quedó:** `berel-photo-registers.json` (`titleSpace`, cámaras de `takes`); `scripts/medir-plate.mjs`;
  pieza `projects/berel/tomas-fotograficas`. **Codificada + prueba**.

## 2026-11-02 · Escala del producto: por diámetro, medida con regla

- **Cita:** «se siguen viendo pequeños… es imposible que una lata de pintura en una mesa se vea así de pequeña».
- **Qué pasó:** a ojo, los productos salieron entre 25 % chicos y casi el doble. Calculados por el alto, 15–40 % chicos:
  los renders son más altos que el envase real respecto de su ancho, y la referencia de la mesa estaba mal leída.
- **Regla:** escala por diámetro (ancho visible del render) y referencia medida con regla a resolución completa; el script
  no acepta un alto a mano; nunca se agranda para que se lea (se acerca a la cámara o toma `detalle`).
- **Dónde quedó:** `compose/product.mjs` (`productScale`), `scripts/producto-en-escena.mjs`,
  `berel-photo-registers.json` (`productInScene`, toma `detalle`). **Codificada + prueba**.

## 2026-11-02 · Producto en escena: la física del modelo, el arte del render

- **Cita:** «la etiqueta se vea realista y no se alteren los textos, tu tendencia va a ser irte a la vía determinística,
  esa vía sirve pero el acabado debe darlo el modelo porque maneja mejor la física, luces».
- **Qué pasó:** solo determinista se ve pegado; solo modelo integra bien pero reescribe los textos pequeños (fidelidad
  0,16–0,23); inpainting con máscara inventó otro producto.
- **Regla (vigente hasta el método guiado, ver arriba):** vía híbrida: el modelo integra la foto completa y la etiqueta
  se restituye desde el render oficial transfiriendo solo la luz de baja frecuencia (fidelidad 0,98). Hoy es el respaldo
  `restituir`; nunca se entrega una etiqueta reescrita por un modelo sin referencia.
- **Dónde quedó:** Workbench `brands/berel/compose/product.mjs` + `scripts/producto-en-escena.mjs` y [photography.md](photography.md) §6 bis. **Codificada + prueba** (`brands/berel/test/product.test.mjs`).

## 2026-11-02 · Recortes verticales mal encuadrados (terraza)

- **Cita:** «Regeneraste epro al menos lo que se ve en estos formatos mas verticales es como mal encuadrado».
- **Qué pasó:** el plate nuevo era una escena simétrica con dos sillones; post, story y Pinterest recortaban al centro
  y partían ambos sillones. Con el foco en el sillón derecho, «terraza» caía sobre la columna de cantera en el post.
- **Regla:** `photo.focal` por formato para que cada recorte vertical enmarque una viñeta completa, sin muebles
  principales cortados a la mitad y con el titular sobre muro liso. El aviso de titular sobre fondo cargado delata
  el foco equivocado.
- **Dónde quedó:** `berel-recipes.json → grids.framing`, `lessons` de `berel-photo-registers.json`, jobs de la terraza
  (post 0.27, story 0.64, Pinterest 0.72) y [photography.md](photography.md) §6. **Documental** (sin prueba propia).

## 2026-11-02 · Frizo mal terminado en la terraza (registro alto)

- **Cita:** «Esto es un frizo mal terminado? si es así no se puede aprobar para Berel por el estrato».
- **Qué pasó:** la terraza (Terra Nova 1-3605D, registro alto) tenía una viga de concreto aparente que terminaba
  irregular contra el muro pintado. Se leía como obra mal terminada y bajaba el estrato; además, en los recortes
  verticales la viga entraba completa y la píldora caía encima.
- **Regla:** todo encuentro muro-plafón, viga, piso o vano va terminado con línea limpia y sombra de remate o
  moldura; nunca pintura terminando irregular contra concreto o piedra. En `alto`, concreto aparente **solo como
  elemento terminado**.
- **Resultado:** plate regenerado (Sunburst + chip, USD 0,12; plafón liso con remate; prompt en
  `greenhouse-eo/ai-generations/2026-11-01_berel-espacios/ronda-2/v3/prompt-terraza.txt`), corregido de ΔE 7,22 a 0,19.
- **Dónde quedó:** bloque `common` y registro `alto` de `brands/berel/contracts/berel-photo-registers.json`; caso en su
  arreglo `lessons`. **Codificada** (sin prueba: ningún test mira el píxel de un plate).

## 2026-11-02 · Aislamiento de Efeonce

- **Cita:** «OJO! esto es solo para Berel cuidado dañas el flujo que usamos para efeonce». Y sobre la skill: «esto no
  debe confundir a los agentes, esto es solo para cuando trabajemos con Berel».
- **Qué pasó:** al ajustar el compositor y el corrector para Berel había riesgo de tocar motores compartidos que usa
  Efeonce.
- **Regla:** todo cambio Berel vive en `brands/berel/**` y `projects/berel/**`. Los motores neutrales
  (`tools/surface-color.mjs`, `tools/marca-color-superficie.mjs`) se consumen sin modificarlos; lo propio de Berel va
  en el adaptador (`brands/berel/scripts/ajustar-muro.mjs`). Antes de commitear: `git diff --name-only`. Esta skill
  nunca se carga para Efeonce, SKY u otro cliente.
- **Dónde quedó:** `brands/berel/AGENTS.md` («Nunca importar identidad Efeonce, AXIS o SKY»); nota en
  `HARNESS_STATUS.md` («Solo afecta `brands/berel/**`; el flujo de Efeonce no cambia»); `description` de esta skill.
  **Documental** (no hay gate que bloquee un diff fuera de `brands/berel/**`).

## 2026-11-02 · Textura de estuco confundida con objetos

- **Qué pasó:** al medir «objetos bajo el marcador» por densidad de bordes, el grano del estuco del muro (foto `port-3`)
  daba 9,7, igual que un objeto, y la grilla descartaba muro perfectamente válido.
- **Regla:** medir los bordes **tras un desenfoque σ=1** (a 1408 px de ancho), que borra el grano y deja los objetos.
  Calibración: muro liso 1,0; estuco 1,4–2,2; lámpara 5,0; cuadro 10,2. Umbral `busyMax` 3, en 4 tramos tomando el peor.
- **Dónde quedó:** `brands/berel/contracts/berel-recipes.json → grids.shared` (`grain`, `busyMax`, `slices`, `busyNote`).
  **Codificada + prueba** (`compose.test.mjs`: «el marcador no se posa sobre objetos»).

## 2026-11-02 · Grilla por formato

- **Cita:** «armar una grilla para cada tipo de formato donde delimites espacios y longitud de texto».
- **Qué pasó:** el marcador anclado a coordenadas de la foto (con anclas alternativas `alt`) caía sobre objetos, quedaba
  apretado o se cortaba según el recorte. El operador propuso la grilla; se aceptó y construyó.
- **Regla:** los jobs no llevan coordenadas (`at`/`alt` fallan cerrado). Cada formato declara márgenes, celdas, objetivo,
  zonas intocables y presupuestos de texto; el motor elige la celda sobre el muro de **su** color, sin objetos y con más
  aire. Con foto sin corregir se declara `sample: [u, v]`.
- **Errores corregidos en el camino:** con filas gruesas (120 px) la cocina no tenía celda; con un sesgo «más arriba» todo
  se pegaba al borde superior (se cambió a un objetivo por formato); la zona intocable del titular era de ancho completo
  (ahora usa el ancho real del titular).
- **Resultado:** 40 piezas recompuestas, 37 en primer nivel; post del estudio y de la cocina en la franja de la píldora y
  story de la cocina apretada bajo la repisa, las tres con aviso en `qa.warnings`.
- **Dónde quedó:** `berel-recipes.json → grids` (shared + blog/post/story/pinterest); `brands/berel/compose/render.mjs`;
  `brands/berel/AGENTS.md`. **Codificada + prueba** («el marcador ya no acepta coordenadas», «sin celda bajo el titular,
  el segundo nivel usa la franja de la píldora y lo avisa», «story: el marcador respeta titular y zonas seguras»).
  Detalle: [marker-grid.md](marker-grid.md).

## 2026-11-02 · Aire alrededor del marcador

- **Cita:** «podías subirlo más porque tienes mucho muro, donde no se vea todo apretado sino que juegues con el aire con
  elegancia».
- **Regla:** el marcador busca el objetivo del formato (tercio superior, nunca pegado al borde) y prefiere la celda con más
  aire: se mide la densidad de bordes en un margen de 6 % del ancho alrededor (`air`, `airMax` 3,5); el puntaje suma aire +
  3 × distancia vertical al objetivo + 1 × distancia horizontal. Sobre `airMax`, la celda solo entra en segundo nivel y con aviso.
- **Dónde quedó:** `grids.shared` (`air`, `airMax`, `crowdedFactor`, `pull`). **Codificada + prueba** («en un muro liso el
  marcador va al objetivo del formato, nunca al borde»).

## 2026-11-01/02 · Marcador sobre objetos

- **Cita:** «Necesitamos reglas para que esto no se ponga sobre objetos así porque pierde limpieza y no se lee bien el texto»
  (casos: estudio, lámpara).
- **Regla:** una celda solo vale si ≥ 85 % de los píxeles bajo el marcador son muro de su color (ΔE(a,b) ≤ 12, ΔL ≤ 28 contra
  el HEX) y la densidad de bordes, con un respiro de 2,5 %, es ≤ 3. Desde el plate: tercio superior del muro libre y objetos a
  la derecha.
- **Dónde quedó:** `grids.shared` (`wall`, `busyMax`, `breath`); bloque `common` de `berel-photo-registers.json`. **Codificada +
  prueba** («el marcador sólo va sobre el muro de su color», «no se posa sobre objetos»).

## 2026-11-01/02 · Estrato bajo en el registro medio

- **Cita:** «las fotos de berel son como de gente más de dinero» (Berel se vende a medio, medio-alto y alto).
- **Qué pasó:** la primera versión de `medio` (ronda 2) salió de estrato bajo: fachada de fraccionamiento, ventanas de aluminio
  blanco. El `--extra` de la fachada lo pedía explícitamente (sigue en `greenhouse-eo/ai-generations/2026-11-01_berel-espacios/ronda-2/specs.tsv`
  como evidencia; no reutilizarlo).
- **Regla:** el registro más bajo es **medio-alto accesible**. Nunca fraccionamiento genérico, aluminio blanco, mueble laminado,
  sanitarios de plástico ni desorden visible. Se regeneraron fachada, infantil, baño y comedor (`ronda-2/v2/`).
- **Dónde quedó:** `berel-photo-registers.json` (`status`, `rule`, `common`, `registers.medio`); libro
  `brands/berel/system/BEREL_VISUAL_SYSTEM_V1.md` §7. **Codificada** (la prueba del builder verifica que el prompt se arme, no
  el estrato del resultado).

## 2026-11-01/02 · Titular ilegible sobre muro claro

- **Qué pasó:** el titular social en blanco no se leía sobre muros claros (Maíz, pasteles), y sobre ventanas o lámparas el
  fondo cargado lo ensuciaba.
- **Regla:** el titular y su regla vertical pasan a `ink` cuando el blanco no alcanza 3:1 con el fondo del bloque. Aviso en
  `qa.warnings` si la densidad de bordes bajo el titular supera 6 (sin desenfoque; muro limpio 1,5–4,4; ventanas o lámpara
  8,6–14). El plate reserva el cuadrante superior izquierdo como muro liso. Titular ≤ 3 líneas, falla cerrado si no cabe
  (caso comedor en 4 líneas); ≤ 14 palabras.
- **Dónde quedó:** `brands/berel/compose/render.mjs` (`titleTone`); bloque `common` del contrato de fotografía. **Codificada +
  prueba** («titular social en tinta sobre muro claro y en blanco sobre muro medio u oscuro»).

## 2026-11-01/02 · Marcador en blanco cuando alcanza 3:1

- **Cita:** «Acá no debería ir en blanco??» (sobre Bien y de Buenas, `#B37A75`: blanco 3,5:1, ink 4,0:1).
- **Qué pasó:** el marcador elegía el tono de mayor contraste (ink), pero Berel usa blanco sobre tonos medios (pieza N46).
- **Regla:** blanco si el contraste WCAG con el muro es ≥ 3:1 (texto Bold grande); si no, ink.
- **Dónde quedó:** `render.mjs` (cálculo de `tone`, comentario «Blanco cuando alcanza 3:1…»). **Codificada + prueba** («tono
  automático: marcador blanco sobre muro oscuro, tinta sobre muro claro»).

## 2026-11-01 · Marcador cortado por el borde

- **Qué pasó:** en la story del registro alto, el marcador quedó cortado por el borde del formato.
- **Regla:** un marcador debe caber entero; si no cabe, se prueba otra celda y, si ninguna sirve, se elimina (nunca se
  dibuja cortado).
- **Dónde quedó:** primero en el compositor de anclas («descarta un marcador que no cabe entero y prueba la siguiente
  ancla», `HARNESS_STATUS.md`); hoy en la grilla (`render.mjs`: «una celda vale si el marcador cabe entero dentro de los
  márgenes»). **Codificada** (sin prueba específica del caso de corte).

## 2026-11-01 · Flare vs Sunburst: ninguno clava el color

- **Cita:** «Sunburst y Flare no son capaces de poner el color que eliges? debes pintarlo de forma determinística?».
- **Qué pasó:** con el mismo método (mediana del muro contra el HEX), el HEX en texto dio ΔE 8,5–14,2 (rango global de la
  primera prueba 7,7–14,6); el chip como referencia, Sunburst 5,4 (7,9 en alto; 2,4–6,9 en la ronda 2) y Flare 9,7; editar
  el plate con el chip no mejoró (Flare 11,4, Sunburst 8,4).
- **Regla:** la respuesta es **sí, determinista**. Plate final con Sunburst `xhigh` + chip (mismo costo que Flare, ≈ USD
  0,12; respeta mejor las reservas) y después el corrector, que deja ΔE ≤ 3 con máscara y QA. Nunca rotular un color que el
  muro no tiene.
- **Dónde quedó:** `tools/surface-color.mjs` + adaptador `brands/berel/scripts/ajustar-muro.mjs` (**codificada + prueba**:
  `test/surface-color.test.mjs`); la elección de modelo y del chip es **documental** (`brands/berel/skills/berel-banners/SKILL.md`,
  libro §7, [color-pipeline.md](color-pipeline.md)).

## 2026-11-01 · Blog horizontal, social vertical

- **Cita:** «los del blog son los horizontales».
- **Regla:** dos familias. Blog horizontal (1408×768 webp < 200 KB; og:image 1200×630) con foto o infografía y logo blanco
  abajo a la izquierda, **sin titular, píldora ni CTA**. Social vertical (post 1080×1350, story 1080×1920 con zonas seguras,
  Pinterest 1000×1500) con titular y regla vertical (post y story) y píldora `berel.com/inspiracion` (solo post).
- **Dónde quedó:** `berel-recipes.json` (`families`, `formats`, `never`); `brands/berel/AGENTS.md`. **Codificada + prueba**
  («portada de blog: 1408×768 webp bajo 200 KB, sin titular», «el post social lleva píldora y titular; Pinterest no lleva
  titular»).

## 2026-11-01 · Gotham Rounded

- **Cita:** «Usa gotham rounded es la tipografía de Berel».
- **Qué pasó:** la Light declara `familyName` «Gotham Rounded Light», así que una comparación exacta con «Gotham Rounded» la
  rechazaba.
- **Regla:** Gotham Rounded (Light, Book, Medium, Bold) es la familia de producción, **sin fallback**; el texto se compone a
  trazos. El loader valida `/^Gotham Rounded( |$)/` y falla cerrado con cualquier otra fuente. Las fuentes nunca van a Git.
- **Dónde quedó:** `brands/berel/compose/type.mjs`; `brands/berel/AGENTS.md`. **Codificada** (falla cerrado al cargar; las
  pruebas del compositor la ejercitan cuando hay recursos locales).

## Pendientes que no son lecciones todavía

- Confirmar con Berel `#B3153A` como color oficial, el registro fotográfico (hora dorada vs. luz de día) y la leyenda de tonos.
- Recetas declaradas sin render: señalización y técnica gráfica (el reel tiene su armado: [video.md](video.md)).
- Aprobación de Daniela, Andrés o Melkin; `qa.approval` sigue en `pending-human-and-pixel-review`.
- Producto sin probar: abierto o en uso, en mano, familia de tamaños, toma cenital (`productInScene.notTested`).
- Reel: titular palabra a palabra como el corpus (hoy entra con fundido); revisión de los reels piloto por Berel.
- Empaque real de las Manchas (sus renders de 1 L son maquetas).
