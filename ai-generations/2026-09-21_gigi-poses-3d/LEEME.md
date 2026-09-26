# Gigi (Google Gemini) — biblioteca de poses 3D · 2026-09-21

Tercera mascota de partner con el método de
[`mascot-3d-pose-library.md`](../../.claude/skills/greenhouse-ai-image-generator/references/mascot-3d-pose-library.md),
después de Clawd (Anthropic) y Codex (OpenAI). **24 piezas** × fondo de estudio y transparente.

## 1. Fuente oficial — dónde estaba de verdad

Clawd salió del binario de Claude Code y Codex del `app.asar` de ChatGPT. **Con Gigi ese camino no existe**:
`/Applications/Gemini.app` NO la trae. Lo que parecía prometer (`Resources/GelIdle.mp4`, 412×456, 30 s) resultó ser
el degradado aurora azul del asistente, no la mascota. Descartado tras extraer y mirar los cuadros.

Gigi es un personaje de **campaña**, no de producto: nació para el back-to-school de Gemini (Google confirmó el
nombre y la grafía «Gigi» por votación de fans, 2025-08). La fuente correcta es **el estudio que la creó para
Google: [Gasta](https://www.gasta.org/portfolio/gemini-free/)**, cuya página de portafolio se titula literalmente
«Gigi – Gemini Free For Students» y publica los **assets de producción**: 7 MP4 + 1 GIF + 1 PNG.

De ahí salió lo que importa: **la hoja de modelo oficial** (`dudes_05.mp4`, 1800×2000) con **15 siluetas canónicas**
—el equivalente del spritesheet de Codex—. Son 30+ vistas distintas de Gigi, muy por encima de las 10 imágenes
pedidas, y todas de la mano que la diseñó.

`fuente/` guarda los 9 archivos originales y los cuadros extraídos; `ref/` los recortes usados como referencia.

## 2. Anatomía medida (nunca de memoria)

| | |
|---|---|
| **Cuerpo** | UN blob continuo, fondo plano que se apoya en el suelo, **una sola punta arriba a la izquierda** que se enrosca hacia la derecha. Sin patas, orejas, nariz, dedos ni ropa |
| **Degradado** | rojo `#D93B2B` en la punta → magenta/violeta → **azul `#3B7DF5` dominando dos tercios** → verde-lima `#9ED957` abajo a la izquierda. Medido por regiones en 4 fuentes distintas (`brief/muestrear.mjs`) |
| **Tinta** | contorno negro `#1E2021` dibujado a mano, ondulado, de grosor variable, tipo plumón. **Es la firma del personaje** y sobrevive al 3D como línea pintada |
| **Cara A (héroe)** | dos arcos curvos = ojos cerrados + una sonrisa ancha, en el tercio superior izquierdo |
| **Cara B (alterna)** | dos puntos negros + un punto redondo de boca abierta. Sólo cuando la pose la pide (atención, duda) |
| **Brazos** | no existen; se extruyen del borde como muñones romos **sólo** cuando sostienen algo |

## 3. Material — la decisión de dirección de arte

Clawd es rígido y pixelado → cubos de vinilo. Codex es blando y redondo → vinilo suave con visor.
**Gigi es un dibujo a mano con degradado** → **vinilo/gel satinado ligeramente translúcido**, con el degradado
horneado en el material, y **la línea de tinta conservada como contorno negro mate pintado a mano** sobre la cara
frontal. Hacerla en cubos habría borrado lo único que la hace Gigi: la imperfección de la línea.

## 4. Las tres familias

- **`Poses 3D/`** — los 8 ángulos de la serie (paridad con Clawd y Codex).
- **`Poses 3D con accesorios/`** — los 8 accesorios ligados a servicios de Efeonce.
- **`Poses 3D busqueda y AEO/`** — 🆕 **familia propia de Gigi**, pedida por el operador. Gigi no es quien hace
  marketing: **es la máquina que responde**, que es su papel en el pitch «Tu IA no conoce tu negocio».

| # | Pose AEO | Qué significa |
|---|---|---|
| 01 | La pregunta — cursor esperando en una barra vacía | el momento en que preguntan por tu categoría |
| 02 | La respuesta con citas — 3 tarjetas, una destacada | citación, quién sale mencionado |
| 03 | **No te conoce — tarjeta completamente vacía** | **el KV del pitch** |
| 04 | El podio — tres bloques, la mano en el más alto | Share of Voice |
| 05 | Leyendo tu sitio — asomada sobre una página | crawleabilidad y contenido citable |
| 06 | Datos estructurados — encajando una pieza | JSON-LD / schema |
| 07 | La entidad — nodo con tres brazos | knowledge graph de marca |
| 08 | El diagnóstico — medidor con aguja, sin números | Radiografía AEO / AI Visibility Grader |

## 5. Qué costó intentos y por qué

- **Perfil estricto: salió a la PRIMERA** (Clawd necesitó 3). Funcionó declarar que la cara frontal se ve *de canto*
  y que sólo queda el borde de ataque de la sonrisa, en vez de pedir «perfil».
- **Contrapicado (v02)** y **cenital (v02, v03)** fallaron en v01, igual que en Clawd y Codex. El contrapicado
  necesitó «la cámara está EN EL SUELO, el fondo plano es la superficie más cercana, la línea de horizonte en el
  cuarto inferior». El cenital necesitó además **declarar la escala** («debe LLENAR el cuadro»): la v02 tenía la
  geometría correcta pero el personaje salió chico.
- 🔴 **Utilería blanca sobre fondo claro: no se recorta.** Los 8 accesorios v01 salieron con la utilería en
  `(222,221,223)` contra un fondo de estudio de `(218,217,220)` — **Δ = 4 por canal**. `fill-alpha-holes` usa
  tolerancia 18, así que clasificó gorro, lente, audífonos y birrete como fondo y los dejó como agujeros; sobre navy
  eran manchas oscuras. **Ninguna tolerancia lo arregla: son el mismo valor.** Se corrigió **en la generación**,
  no en el recorte: utilería en **hueso cálido `#D3C8B4`**, que se lee igual de «blanca» y se separa (Δ ≈ 40).
  Es el corolario que faltaba de la regla «objeto claro sobre fondo claro no se recorta».
- 🔴 **Un objeto suelto se lo come el matting.** La chispa de 4 puntas de `08-idea` flotaba separada del cuerpo y el
  segmentador la descartó: el transparente salía sin ella. Corregido pidiendo que **toque la punta**, para que la
  silueta sea una sola. Por eso el bloque de utilería exige que todo prop toque al personaje.
- **La lupa sobre la cara duplica el ojo** (lo detectó el operador): el lente magnificaba un arco y Gigi parecía
  tener tres ojos. La v02 lleva el lente fuera del cuerpo, sobre el fondo.

## 6. QA hecho

Hoja de contacto de las 24 sobre gris de estudio + hoja de las 24 transparentes **sobre navy** (`brief/qa-navy-*.png`),
que es lo que delata agujeros, halos y bordes mordidos. Lo único transparente en el resultado final es el lente de la
lupa, que es vidrio: correcto. Colores verificados contra el arte oficial por regiones, no a ojo.

## 7. Catálogo

Declarado en `scripts/foto/build-prompt.mjs` como **`gigi`** (16 vistas: las 8 poses + los 8 accesorios) y
**`gigi-aeo`** (8 vistas), y sellado con `pnpm foto:assets:lock`. A diferencia de Clawd y Codex —que declaran sólo
3 vistas cada uno y dejan el resto invisible para `foto:prompt`— acá se declaran **todas**.

## 8. Gobernanza

🔴 **Gigi es propiedad de Google.** Igual que Clawd (Anthropic), Codex (OpenAI) y el sprocket (HubSpot): es una
**interpretación 3D** de la mascota de un tercero, de **uso interno y orgánico**. Orgánico aprobado ≠ pauta: antes de
pautar hay que validar contra la guía de marca de Google. Y el KV paraguas fija **una sola mascota de partner por
imagen**; juntas sólo con pedido explícito del operador.

🔴 **Gigi se queda con el sistema de color de la pieza.** No «porta un color»: **es el espectro completo de Google**
—rojo, azul dominante y verde-lima—. Con Gigi en cuadro, buscar otro portador del azul de Efeonce es competir con un
degradado de tres colores y perder. Lo correcto es que **Gigi sea el único acento de color** y Efeonce viva en el
navy y en la estructura. Y si hay ropa Efeonce en la misma pieza, prohibir explícitamente el degradado arcoíris y la
punta enroscada en la prenda, sin describir nuestro emblema.

## 9. Entrega

`5. Contenidos/14. Mascotas de partners/Gigi (Google Gemini)/{Fuente oficial, Poses 3D/v01,
Poses 3D con accesorios/v01, Poses 3D busqueda y AEO/v01}`

Motor: `pnpm ai:image` · `gpt-image-2.5-sunburst` · `xhigh` · 1600×1600 · edit con la base aprobada + la hoja de
modelo oficial como referencias. 31 pasadas en total (24 finales + 2 bases + 5 correcciones).
