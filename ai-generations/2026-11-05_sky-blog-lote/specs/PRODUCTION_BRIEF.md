# Brief de producción · Imágenes y banners del Blog SKY · lote 05/11/2026

> Para la sesión derivada que produce las piezas. Servicio **SEO / Marca** de SKY (blog.skyairline.com).
> Nunca Performance/KV/Always On: esos sistemas no se cruzan con el blog.

## 1. Qué hay que producir

Por artículo (54): **IMG 1 portada 🔁**, **IMG 2** y **IMG 3** (fotos editoriales sin texto) y **BANNER 1** de ruta
(compuesto, con texto). Specs: `specs/<id>.json` (una por artículo) + `specs/MANIFEST.json` (índice con estado).
La spec es copia del callout que quedó en Notion dentro de cada artículo: **si difieren, manda el callout de Notion**.
Los banners con `estado: "bloqueado"` no se producen (ruta no catalogada como 🟢 Activa).

## 2. Antes de empezar (obligatorio, en este orden)

1. Skills: `sky-blog-graphic-line` (esta línea, completa con sus `references/`), `efeonce-creative-workbench`
   (+ `references/state-continuity.md`), y para el motor `greenhouse-ai-image-generator` / `ai-model-selection`.
2. Workbench `/Users/jreye/Documents/creative-workbench`: `AGENTS.md`, `brands/sky-airline/blog/AGENTS.md`,
   `brands/sky-airline/blog/system/SKY_BLOG_VISUAL_SYSTEM_V1.md`, contratos `contracts/sky-blog-photography.json` y
   `contracts/sky-blog-recipes.json`. `git status` y preservar trabajo ajeno; cambios solo en
   `brands/sky-airline/blog/**` y `projects/sky/<pieza>/**`.
3. Notion (teamspace «Sky Ariline - SEO+AEO»): Spec Imágenes `cbf3b2942bf74f5784f4105881ed1f6d`, Skill de imágenes
   `5e4b2473c7914933a3e65531bb72c885`, Sistema de selección `3f439c2fefe78004844fc55f417c3324`, Playbook
   `06531fec27634eed98b73094ba05ce5e` (Fases 6 y 8, bitácora), Precios y Rutas `c6bcd3d717794691b706befbc25c4b74`.
4. Criterio fotográfico de Daniela Ferreira: SharePoint Sky-Efeonce
   `Documentos compartidos/General/SKY Blog SEO/01 Onboarding/SKY_Blog_Sistema_Visual.pdf`.
5. Asesoría de la sesión «Sky creative assets y generación de KV» (ver §7, si llegó).

## 3. Invariantes que no se negocian

- 🔴 **Nano Banana Pro NO se usa** (decisión de Julio, 05/11/2026: «no tiene buena calidad»). Motor de todas las
  fotos: `gpt-image-2.5-sunburst` (calidad max, 3840×2160). Con REF-01 real, modo edición del mismo motor
  (`pnpm ai:image … --image refs/ref-01.jpg`); correcciones dirigidas, también con el mismo motor. Si se quiere probar
  GPT Image 2.6, primero se mide contra 2.5 en una pieza y se pide autorización. **Primera tarea de la sesión:**
  registrar la decisión en el Workbench (`contracts/sky-blog-photography.json → engines` y la prueba que corresponda),
  en `references/lessons.md` y `photography.md §7` de la skill `sky-blog-graphic-line`, con su espejo en `.codex/`.


- Foto editorial **sin texto**; si necesita texto, es banner de ruta.
- **Nunca** avión, cabina, uniforme ni tripulación SKY generados; ni rótulos legibles de negocios reales, logos de
  terceros, rostros identificables en primer plano o personas reales identificables.
- La IA **no inventa geografía**: lugar identificable = foto real **REF-01** cargada antes de generar (gpt-image-2.5-sunburst
  en modo edición con `--image` REF-01). REF-ESTILO-D guía lenguaje, no lugar. Sin REF-01 → pieza `Bloqueado` con motivo «fidelidad del lugar».
- El prompt sale de `prompt-plate.mjs`; nunca a mano. La hora y el clima son los del relato: no inventar sol ni
  reemplazar cielo; ganar luz = abrir exposición y sombras sin quemar altas luces.
- Primer plano: decisión explícita (`--primer-plano "<elemento real>" --borde …` o `--sin-primer-plano "<razón>"`);
  muy cerca del lente, muy fuera de foco, por un borde, cerca de 12 % del cuadro como máximo, sin tapar rostro,
  manos, contacto ni landmark. En portada entra por abajo.
- Todo sale del **maestro** (3840×2160 preferido, mínimo 2752×1500, horizontal); artículo 1408×768, OG 1200×630 y
  1080×1080 se recortan del mismo maestro con `exportar.mjs`. Nunca se regenera para obtener una variante.
- Portada: sujeto y detalle crítico en la **mitad superior, tercio central, sin tocar el borde superior** (el tema
  recorta el octavo de arriba); mitad inferior tranquila y no muy clara (H1 blanco encima). Gate
  `medir-portada.mjs --sujeto … --vista …` en verde **y** mirar `-hero-desktop` / `-hero-mobile`.
- Banner: `componer-ruta.mjs` (Metric sin fallback, logo oficial intacto, un logo por pieza); sin precios, moneda,
  «oferta», «imperdible», «desde», %, «Está bueno SKY» ni comparaciones; ruta con `verificadaEl` + `fuente`
  (verificar de nuevo en skyairline.com el día de producción); titular máx. 8 palabras (A) / 9 (B), no se achica la
  letra: se acorta el titular. 1408×400 y 1080×1080, WebP menos de 150 KB.
- Una intención por corrida, sin `--count` mayor a 1, máximo **tres intentos** por pieza; después `Bloqueado` y se escala.
  Un artefacto en el punto focal se regenera, no se retoca.
- `qa.approval` queda `pending-human-and-pixel-review`: ejecutar ≠ criterio de marca ≠ aprobación ≠ entrega.

## 4. Acabado (estándar D y registro E)

- **D · observación**: foto espontánea de viajero buen fotógrafo con teléfono de última generación, 28–35 mm
  equivalente, altura de ojos, encuadre observacional levemente asimétrico. Exposición luminosa creíble, sombras
  abiertas con volumen, altas luces conservadas, balance coherente con hora y clima, color natural limpio, contraste
  moderado, piel fiel, grano natural leve. Profundidad óptica real (la nitidez cae con la distancia).
- **E · experiencia**: hereda D + microescena completa (quién hace qué, instante intermedio, objeto, consecuencia,
  objetivo de la mirada, dónde está y qué hace quien fotografía), miradas con objetivo real, casting cotidiano y
  cuidado sin logos, piel natural sin plástico ni cuadrícula de poros, corrección de color por material (menos cian en
  agua y cielo sin tocar la piel), no desaturación global.
- **Rechazar**: borrón gaussiano plano, franjas, halos, máscaras, bokeh decorativo artificial, HDR, postal saturada,
  gris apagado, altas luces quemadas, sombras empastadas, luz de estudio, dron, poses o miradas al lente, manos
  deformes, objetos duplicados, letreros pseudo-legibles, sombras sin fuente.
- QA al 100 % en orden: manos · arquitectura · texturas · letreros · sombras · fidelidad vs REF-01 · personas ·
  miradas (E) · microescena (E: el modelo puede invertir la posición del fotógrafo) · profundidad · luz y color ·
  producto. Después, la **secuencia**: las tres del artículo juntas (mismo viaje, variedad de tipo, escala y encuadre).

## 5. Flujo por artículo (comandos en `references/workflow.md` de la skill)

`pnpm pieza:nueva sky blog-<id>` → leer spec → `prompt-plate.mjs` (`--portada` en IMG 1; registro E exige
`--fotografo` y `--mirada`) → leer el prompt completo → generar maestro en Greenhouse (`pnpm ai:image`, motor
autorizado y verificable en el log; con REF-01 → `--image` sobre el mismo motor) → mirar al 100 % → `medir-portada.mjs` (IMG 1) →
`exportar.mjs` → banner: job JSON → `componer-ruta.mjs` → QA → registrar en la ficha de la tarea (prompt BASE y
NEGATIVE, motor y versión, parámetros, caja del sujeto, salida del gate, versión V01…) → Frame.io → estado en Notion.

## 6. Orden y alcance sugeridos (decide el operador)

1. Calibrar con 2–3 artículos con REF-01 disponible y banner listo (p. ej. Zorritos LIM→TBP) antes de escalar.
2. Priorizar los de temporada (Navidad, Año Nuevo, verano, Candelaria, Carnaval) y los aprobados por SKY.
3. Costo: preguntar al operador el tope antes de lanzar; registrar costo por pieza.
4. Las tareas de diseño (subtareas `SKY · Artículo N · IMG n` en la base Tareas del teamspace SKY) se crean con la
   ficha copiada del callout del artículo; la numeración N la define el Content Hub.

## 7. Asesoría de la sesión Sky creative (completar al recibirla)

Respuesta del 05/11/2026: esa sesión trabajó solo Performance/KV y no aporta reglas propias del blog. Confirmó el mapa
de archivos de §2 como fuente vigente y que, si la skill y un contrato difieren, **manda el contrato**. Últimos commits
de la línea del blog en el Workbench: `1c660a6` (HERO SPACE con margen superior) y `a8759ca` (familia visual, gate de
portada, exportación, banner). Antes de commitear en el Workbench, la sesión debe pasar estos gates:

- `node --test brands/sky-airline/blog/test/*.test.mjs`
- `node --test brands/sky-airline/test/*.test.mjs`
- `pnpm gates`
- `pnpm git:identidad --check`
- `git diff --name-only`: no puede aparecer nada fuera de `brands/sky-airline/blog/**` ni de `projects/sky/<pieza>/**`.

Origen del banner: kickoff del 02/11
(`greenhouse-eo/ai-generations/2026-10-31_kickoff-seo-sky/canvas/project/25-banners.dc.html` y `26-banners-reglas.dc.html`).

## 8. Referencias visuales de la línea (calibración del 02/11/2026)

- Canvas «Blog SKY — Línea gráfica · candidato 02-11-2026» (privado): https://claude.ai/artifact/XSXa4MRuNjnyaKmhdLTvUD.
  Tiene 8 láminas: sistema, fotografía editorial, portada en el tema, portadas de octubre medidas, Cusco antes y
  después, un maestro y tres formatos, banner de ruta, reglas y pendientes. Se lee con la herramienta Artifact
  (`action: read`), nunca con WebFetch.
- Calibración local: `/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-02_sky-blog-linea/`
  (`cusco-portada-maestro.png` y `-v2.png`, `prompt-cusco-portada.txt` y `-v2.txt`, `avisos-notion.md`).
  La portada de Cusco v2 es la referencia de una portada que pasa el gate.
- Canvas del kickoff SEO: https://claude.ai/artifact/JQ3k1siSTNxgUiqu1NsaHE. Su proyecto está en
  `ai-generations/2026-10-31_kickoff-seo-sky/canvas/project/` y el banner de ruta sale de `25-banners.dc.html`.
- Todo esto es la misma línea que ya está en la skill y en el Workbench. Si algo choca, manda el contrato del
  Workbench, con una salvedad: la decisión del 05/11 de **no usar Nano Banana Pro** está por encima de cualquier
  referencia anterior.

## 9. Ajustes pendientes del banner de ruta (Julio, 05/11/2026). Van antes de componer cualquier banner

1. **El avión no se lee como avión: «son 2 palitos».** Hoy, `compose/route-banner.mjs` (línea ~94) lo dibuja como un
   trazo (`<path d="M -16 0 L 16 0 M 2 0 L -6 -11 …" stroke=… fill="none">`). Hay que reemplazarlo por una
   **silueta rellena de avión de línea vista desde arriba**: fuselaje con nariz redondeada, alas en flecha,
   estabilizadores y, opcionalmente, motores bajo las alas. Va en blanco (`P.ink`), con `fill` y sin `stroke`, y a un
   tamaño que se lea en escritorio (1408 × 400) y en móvil (1080 × 1080).
   - Es un **ícono genérico**: nunca un avión SKY con librea ni un logo de terceros. Si la marca SKY tiene un ícono
     oficial de avión en `brand-assets`, se prefiere ese.
2. **El avión tiene que seguir la curva.** Hoy la rotación es fija (`rotate(8)`). Debe calcularse con la tangente del
   arco en el punto donde va el avión, con la nariz apuntando al destino.
3. **El trazo punteado no pasa bajo el avión.** Hay que dejar un hueco en la línea alrededor del ícono para que no se
   cruce con él.
4. Cada cambio lleva su prueba en `test/route-banner.test.mjs`: la forma del ícono y la rotación según la tangente.
   Después se recomponen los ejemplos de calibración A y B (escritorio y móvil). Antes de producir el lote, se le
   muestran a Julio en vistas al 100 %.
5. **Jerarquía nueva (Julio, 05/11/2026): la ruta manda.** El nombre de la ruta («Lima → Tumbes», o
   «Ruta Lima – Tumbes» si Diseño prefiere ese formato) pasa a ser el **primer elemento de lectura**. Va arriba, antes
   del titular, con más tamaño y peso que hoy (hoy es una etiqueta chica en `purple/100` al pie). El titular queda en
   segundo nivel, más corto y sin repetir el H1 del artículo, que ya está en la página. Orden de lectura: logo → **ruta** →
   titular → CTA. Aplica a la receta A y a la B, en escritorio y en móvil. Hay que revisar en el contrato
   (`sky-blog-recipes.json → ruta`) el presupuesto de líneas del titular y las zonas que choquen con la ruta dibujada,
   y actualizar las pruebas. Antes de cerrar el compositor, pregúntale a Julio si hay más ajustes. No se produce
   ningún banner del lote hasta que apruebe la versión ajustada.
6. La lección queda registrada en `references/lessons.md` y `route-banners.md` de la skill `sky-blog-graphic-line`,
   con su espejo en `.codex/`.

Vista actual de referencia: `projects/sky/blog-linea-grafica/runs/cd00b1b8-6e56-4f99-82ee-ff9614d44d50/ruta-color-lim-tbp.webp`.
