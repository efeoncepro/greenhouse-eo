# Greenhouse — Guía de selección de modelos de IA para medios V1

> **Tipo de documento:** Referencia técnica agent-facing
> **Version:** 1.16
> **Creado:** 2026-09-16 por Claude
> **Ultima actualizacion:** 2026-10-06 por Codex — v1.16: CLI Nano Banana 2.1 separada; generación real Nexa 4K/high y comparación visual acotada con NX7d Sunburst (§10.1). OpenAI conserva su default `gpt-image-2`.
> **Antes (v1.15):** 2026-10-04 por Claude — v1.15: 🔁 **corrige una regla sobregeneralizada de Seedance.** La guía decía que Seedance rechaza personas reales y marcas en las referencias (filtro ByteDance) y recomendaba evitarlo con ese material. La evidencia es más acotada: **dos** rechazos medidos en fal el 2026-09-16, tras encolar y cobrados (`422 content_policy_violation` / `partner_validation_failed`: el isotipo de Efeonce, «potential copyright violation», y un video de barista, «likenesses of real people») [verificado 2026-09-16]; las mascotas 3D de partner pasaron sin rechazo [operador, 2026-09-22]; y el operador ha producido en fal videos con Seedance con personas y marcas reales sin problema [operador, 2026-10-04]. El rechazo es un **riesgo observado en casos puntuales, no un filtro sistemático**; qué lo dispara: [sin dato]. Seedance vuelve a ser candidato con personas y marcas, presupuestando el posible rechazo cobrado (prueba corta y a baja resolución antes del final) y con Flux 3 / Wan 3.0 como alternativa si rechaza (§3, §4.3, §5.2, §5.3, §5.4, §5.6, §5.7, §6.8, §6.9, §6.12, §7.3, §7.4, §10.3).
> **Antes (v1.14):** 2026-10-03 por Claude — v1.14: evidencia de uso real del spot animado 2D «Sparks × Efeonce AEO» (aprobado por el operador el 2026-10-03): §5.5 H3 base > Max con personajes 2D, mismo eje de cámara, prohibir texto, fijar paleta, sondeo de resoluciones (`h3-i2v` sin 1080P; `h3max-i2v` sin 2K), tope 15 s y `--estimate` que cuelga con PNG grande; §5.9 Stable Audio 2.5 audio-to-audio para **cambiar de estilo** (rock → punk) acelerando la referencia; §4.3 `audio.voice` con `eleven_v4` vía el conector ElevenLabs Creative (MCP).
> **Antes (v1.13):** 2026-10-03 por Claude — v1.13: nueva §4.3 **Video por operación y fase** (operación × motor, neutral de motor, con el puente de la CLI de la app de Higgsfield y la regla «propio primero», organizada en preproducción, producción y posproducción según la [taxonomía de video](GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md)), con columna de canario de garantía separada de [verificado]; programa EPIC-051.
> **Antes (v1.12):** 2026-10-03 por Claude — v1.12 (TASK-1965 + TASK-1973): el árbol de imagen (§2.2) cubre cada técnica de edición de una foto existente con ganador medido, alternativa y «evita» — editar una zona, borrar, mover, incorporar, expandir, separar en capas, cambiar el fondo, rehacer un detalle y reiluminar—; receta §6.17; costo de Layerize con la base (§6.13); hallazgos de Seedream edit dentro de `pnpm ai:inpaint` (§5.2); pendientes BFL FLUX Tools, relight y video con máscara (§8.4); y la nueva §10.3 **Reiluminar (relight) — estudio de mercado 2026-10-03** (imagen y video, todo sin verificar en vivo).
> **Antes (v1.11):** 2026-10-02 por Claude — v1.11 (TASK-1964, escenario del login): 🔴 `pnpm ai:inpaint image` con Sunburst no sirve para retocar la PIEL de una cara (zona casi sin cambio o reencuadre de ~6 px) y una cara a 3840×2160 salió craquelada frente a la de 2560×1440 [verificado, una corrida; causa sin aislar] (§5.1). v1.10 (TASK-1965): inpainting con `pnpm ai:mask` + `pnpm ai:inpaint image|video` (recompone y verifica delta 0); 🔴 Sunburst con máscara devuelve un panel negro plano (3 de 3) y la fila de inpainting pasa a Flare / Flux Pro Fill (§2, §5.1, §6.8).
> **Antes:** 2026-09-27 por Claude — v1.9: nueva ficha §5.9 **Música de marca vía fal** (Stable Audio 2.5 audio-to-audio y text-to-audio, ElevenLabs Music v2.5), con la evidencia de uso real de la música de Glitch [verificado 2026-09-27] y la regla «nunca síntesis pura para música de marca; medir medios ≥ ~35 % antes de mostrar».
> **Historial anterior:** 2026-09-24 por Claude — v1.8: la CLI `higgsfield` **ya tiene sesión** (1.1.26, mkt@efeoncepro.com, workspace Private ultra); Recraft V4.1 por CLI pasa de «sin sesión» a «con sesión, salida SVG sin corrida real» (§6.14, §8.4, §10.1). Además quedan instalados los puentes MCP locales de Blender, Illustrator y Photoshop (skill `higgsfield-provider`), fuera del alcance de esta guía.
> 2026-09-24 por Codex — v1.7: `pnpm ai:omni` conecta las seis operaciones Cloud de Gemini Omni 1.1, con canaries reales y manual propio.
> 2026-09-23 por Claude — v1.6: 🔴 `--mask` de 2.5 no sirve para mover material que ya está en la foto: sobre un primer plano oscuro y desenfocado, Sunburst rellenó toda la zona editable con un panel plano de borde recto y borró un objeto que el prompt pedía conservar [verificado 2026-09-23] (§5.1). · v1.5: primer motion de Efeonce producido («No fuiste tú», CMP-001). Tres hallazgos medidos: **`h3max-r2v` SÍ acepta `--aspect`, y sin él devuelve 1920×1080 horizontal** aunque todas las referencias sean verticales (§5.5); **`--aspect adaptive` NO adopta el ratio de las referencias** (1152×1440 → 1920×1080); y 🔴 **ningún motor de video del carril soporta 4:5** — medido en los cinco, todos ofrecen `3:4` — siendo 4:5 el formato principal de los estáticos de Efeonce: se genera en 3:4 y se recorta (§3, §4.2). · v1.4: Seedance 2.5 **entrega 1080×1920 verificado** en dos corridas reales (i2v y r2v); nitidez nativa vs reescalado sigue [sin dato]. La contradicción con la tabla oficial (480p/720p) queda parcialmente resuelta. · v1.3: la máscara de 2.5 orienta pero no preserva: la «deriva fuera de zona 2,4/255» es una media; el 2026-09-17 la zona protegida llegó a delta máximo 221/255 (media 4,85) y se recompone desde la base. v1.2: carril **Higgsfield API** dentro de `pnpm ai:fal` (§5.8): 44 capacidades con esquema real y precio exacto por API; Recraft de Higgsfield API: SVG **sin confirmar**. v1.1: brechas de los CLIs corregidas (commit `17196ead1`): estimación de costo previa con confirmación en `ai:fal`, resolución barata por defecto, formato real, `--seed` y tope de referencias validados, flags de LoRA/entrenador; `ai:image` valida `--size`/`--background`, agrega `--format` y estima costo
> **Alcance:** todos los modelos de imagen y video disponibles en `pnpm ai:image` (OpenAI), `pnpm ai:fal` (55 capacidades de fal + 44 de Higgsfield API) y `pnpm ai:omni` (Gemini Omni 1.1 Cloud), `pnpm ai:nano` (Nano Banana 2.1 Google directo), más los carriles fuera de esos CLIs y los candidatos evaluados que NO están conectados. Desde v1.9, además, la música de marca vía fal (§5.9), que no pasa por esos CLIs.
> **Documentación relacionada (no se duplica acá):**
> [Catálogo de modelos fal](GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md) ·
> [Generador de assets visuales](GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) ·
> [Manual del CLI fal](../manual-de-uso/ai-tooling/operar-cli-fal-seedream-seedance.md) ·
> [Manual del CLI Omni](../manual-de-uso/ai-tooling/gemini-omni-1-1-cli.md) ·
> [Manual del CLI Nano](../manual-de-uso/ai-tooling/nano-banana-2-1-cli.md) ·
> [Selección de motor por contrato de fidelidad](../../.claude/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md)
> **Código fuente de verdad:** `src/lib/ai/fal-capabilities.ts` (registro), `src/lib/ai/higgsfield-capabilities.ts` + `higgsfield-schemas.json` (registro Higgsfield), `scripts/ai/higgsfield-lane.ts` (carril Higgsfield), `scripts/ai/fal-image.ts` (CLI `ai:fal`), `src/lib/ai/gemini-omni-cli.ts` + `scripts/ai/gemini-omni.ts` (CLI `ai:omni`), `src/lib/ai/openai-image.ts` + `scripts/ai/generate-image.ts` (CLI `ai:image`), `src/lib/ai/nano-banana-cli.ts` + `scripts/ai/nano-banana.ts` (CLI `ai:nano`), `src/lib/ai/fal.ts` (cuentas).

---

## 0. Cómo usar esta guía

Sigue siempre este orden. No saltes al comando sin pasar por el árbol.

1. **Árbol de decisión** (§2 imagen, §3 video): parte de lo que necesitas ("toma larga", "editar con personas", "capas editables") y llegas a un modelo con su alternativa y lo que debes evitar.
2. **Matriz comparativa** (§4): confirma que el modelo elegido cumple entrada, salida máxima real, duración, audio y precio **a la resolución que vas a pedir**.
3. **Ficha del modelo** (§5): lee "cuándo NO", las trampas y cómo estimar el costo antes de gastar.
4. **Receta** (§6) si tu caso está listado; **presupuesto** (§7) antes de cualquier lote.
5. **Comando**: copia el de la ficha o receta. Todo `--capability` y todo `ai:image` **gasta dinero**; `--list`, `--balance` y `--status` son gratis.

Reglas que mandan sobre cualquier tabla de esta guía:

- **Fidelidad por toma, no precio por clip.** El motor se elige por el contrato de fidelidad de la toma (qué debe quedar idéntico, qué puede interpretar el modelo); los defectos editoriales (crop, texto, grade, foley, mezcla) se arreglan en post, no regenerando. Canon: [engine-selection-by-fidelity-contract.md](../../.claude/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md). [decisión]
- **Ningún ranking reemplaza la prueba con tu propio brief** (§9). [decisión]
- **Copy final, logotipo y texto legal se componen fuera del modelo.** Todo texto generado dentro de la imagen o el video es concept-only. El logotipo de Efeonce es `efe[isotipo]nce` completo; no confundirlo con el isotipo solo ni duplicarlo. [decisión]
- **Salidas fuera del repo público:** usa `--out`/`--out-dir` hacia `ai-generations/` o el scratchpad; nunca `public/` ni `.captures/`. `ai:image` y `ai:fal`, sin `--out`, escriben en `public/images/generated` [contrato]; `ai:omni` exige `--gcs-output` privado y sólo descarga a la ruta explícita de `--out` [contrato]. [decisión]
- **`pnpm ai:fal` es out-of-band**: NUNCA es runtime del producto. El runtime de imagen del producto es `generateImage` (`src/lib/ai/image-generator.ts`) con providers `openai-image` (default) y `google-gemini-image`. [contrato]

---

## 1. Leyenda de evidencia

Cada dato de esta guía lleva una etiqueta. Si un dato no la tiene, trátalo como no confiable.

| Etiqueta | Significa | Cómo se obtuvo |
|---|---|---|
| **[verificado]** | Corrida real hecha por Greenhouse, con fecha | Registro `verifiedAt`, catálogo fal, evidencia en `ai-generations/` |
| **[contrato]** | Lo que declara el registro del repo, el código del CLI o el OpenAPI de cola del proveedor | `src/lib/ai/fal-capabilities.ts`, `scripts/ai/*.ts`, `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<slug>` (leído 2026-09-16) |
| **[oficial]** | Publicado por el fabricante o por fal como hosting oficial, con URL (§12) | Leído 2026-09-16 salvo otra fecha indicada |
| **[tercero]** | Ranking, benchmark, revendedor o prensa, con URL y fecha (§12) | No es verdad del proveedor |
| **[decisión]** | Decisión del operador de Efeonce o regla interna vigente | Memoria del operador, skills y docs de arquitectura |
| **[cálculo]** | Aritmética propia sobre una fórmula o tarifa [oficial] o [contrato]; **no medida** | Se indica la fórmula usada |
| **[sin dato]** | No se encontró; no se infiere ni se rellena | — |

Precios en USD, con fecha de lectura 2026-09-16 y **escalón de resolución explícito**. Cuando el precio del registro y el publicado no coinciden, se muestran ambos.

---

## 2. Árbol de decisión — IMAGEN

Formato: *si necesitas X → usa Y · por qué · alternativa · qué evitar*.

### 2.1 Primero, el carril

| Si necesitas | Carril | Por qué |
|---|---|---|
| Un raster final para marca, UI, pieza editorial o edición con máscara | `pnpm ai:image` (OpenAI) | Máscara real, transparencia plena en 2.5, #1–#2 en Arena/AA [tercero] |
| Materialidad, atmósfera, look development, lotes baratos, capas editables | `pnpm ai:fal` (Seedream 5) | Rango de aspecto 1/16–16, Lite a USD 0,035, único con layerize [oficial] |
| Modelos propios de Higgsfield (SOUL 2, Marketing Studio) o familias que fal no expone (Ideogram 4.0, Qwen Image 3, Z-Image, PixVerse 6, LTX 2.5, Happy Horse, Kling 3.0/Omni/O3, Grok Imagine) | `pnpm ai:fal --capability hf-*` (Higgsfield API) | Precio exacto por API antes de encolar [contrato]; **sólo 1 de 44 verificada en real** (`hf-zimage-turbo`, 2026-09-17); las demás tienen precio y esquema validados pero **no salida**. Los créditos ya se cargaron [verificado 2026-09-22] (§5.8) |
| Vectores reales (SVG) | Recraft V4.1 vía Higgsfield CLI | GPT Image y Seedream son raster [contrato]; CLI **con sesión desde 2026-09-24**, salida SVG **sin corrida real** (§8.4). El Recraft de la **API** de Higgsfield (`hf-recraft41`): SVG **sin confirmar** (§5.8) |
| Nano Banana 2.1 / Pro | Google directo (Vertex) | [decisión] nunca por fal; 2.1 por `pnpm ai:nano`, Pro sin CLI (§10) |

### 2.2 Árbol

| Si necesitas | Usa | Por qué | Alternativa | Evita |
|---|---|---|---|---|
| **Editar una zona y dejar el resto idéntico** (inpainting) | `pnpm ai:inpaint image` (TASK-1965) con **GPT Image 2.5 Flare** `medium` + máscara (default); para la pieza final, **Sunburst SIN máscara** con guía de zona (`--model gpt-image-2.5-sunburst`; `--provider-mask auto` es el default) | El pipeline recompone y verifica el archivo en **delta máximo 0** fuera de la zona [verificado 2026-10-02]; Flare, Flux Fill, Sunburst sin máscara + guía en magenta y boceto + referencia colocaron el objeto, ≈ USD 0,40 la jornada [verificado 2026-10-02]. Sin la guía, Sunburst puso el objeto FUERA de la zona [verificado 2026-10-02] | `fal:flux-pro-fill` (relleno con máscara blanca, USD 0,05/MP) [verificado 2026-10-02] | 🔴 **Sunburst CON máscara**: devuelve la zona como panel negro plano, 3 de 3 [verificado 2026-09-23 y 2026-10-02]; `fal:seedream5-lite-edit`: costura en la pared e ignoró `image_size` [verificado 2026-10-02]; retocar la piel de una cara con Sunburst (§5.1) [verificado 2026-10-02] |
| **Borrar un objeto** | `pnpm ai:inpaint erase --layers <layers.json> --layer <sel>` (TASK-1973): rellena con el clean plate de Layerize, USD 0, e incluye la sombra proyectada | PASS: taza y sombra fuera, la mesa continúa, sin gasto [verificado 2026-10-03] | Con `--mask` y sin capas: **Sunburst por instrucción** (default de `--fill model`), PASS, USD 0,010 [verificado 2026-10-03] | Flare con máscara (dejó media taza, código 3, USD 0,013) y **Flux Fill** (dibujó OTRA taza dos veces, USD 0,10 c/u): un modelo que llena una máscara rellena la silueta con otro objeto [verificado 2026-10-03]; Seedream 5 Pro Edit dejó un fantasma del asa que el detector no ve (USD 0,068) [verificado 2026-10-03]; FLUX Erase de BFL: no conectado [sin dato] |
| **Mover o escalar un objeto dentro de la misma foto** | `pnpm ai:inpaint move --layers <layers.json> --layer <sel> --dx <px> --dy <px> [--scale]` | Hueco con clean plate, elemento recortado de la ORIGINAL y halo de sombra de contacto y reflejo: PASS, delta 0 fuera de lo tocado, USD 0,01 [verificado 2026-10-03] | `--harmonize off` (sin IA ni gasto) [contrato] | Inpainting generativo con `--mask` para desplazar material de la foto: Sunburst llenó la zona con un panel plano [verificado 2026-09-23]; usar los píxeles regenerados de la capa en vez de los de la original [contrato] |
| **Incorporar un objeto de otra imagen** | `pnpm ai:inpaint place --image <destino> --from <origen> --layers <layers.json> --layer <sel> --at x,y [--width]` con `--finish halo` (default) | Destino en delta 0 fuera de lo pegado y su acabado: PASS sin acabado (USD 0) y con halo (USD 0,01) [verificado 2026-10-03] | `pnpm ai:inpaint image --reference <objeto> --sketch <trazo>` con Sunburst: objeto de la referencia en la posición del boceto, con la máscara derivada que crece hasta el objeto [verificado 2026-10-02]. `--finish element` también relumina el elemento, pero su forma puede variar [contrato]; sin canario de ese modo [sin dato] | Incorporar un logo o asset de marca: la guarda lo detiene [contrato] |
| **Expandir a otro formato** (outpaint) | `pnpm ai:inpaint expand --to <formato>` con **Flux Fill** (`fal:flux-pro-fill`, default) | 1,91:1 sin costura, USD 0,10; 9:16 coherente, USD 0,15 [verificado 2026-10-03]. Los lienzos grandes se generan a menor resolución y el área nueva se escala (9:16 de 1536×2730 → 1088×1904), y puede inventar elementos (una banca en el 9:16) [verificado 2026-10-03] | BFL FLUX Outpainting (API propia de BFL, hasta 4 MP): no conectado [sin dato]. `pnpm foto:expandir` es otro contrato (redibuja con Sunburst) y no delega en este núcleo [contrato] | GPT Image: Flare reencuadró la escena (escala 0,88–0,90, código 3) y Sunburst `high` copió el relleno en espejo como contenido [verificado 2026-10-03] |
| **Cambiar el fondo y dejar el sujeto intacto** | `pnpm ai:inpaint background --prompt "<fondo nuevo>"` (sujeto por matting local, o `--layers` + `--layer`) con el adaptador default (`openai`, Flare) | Sujeto en delta 0, costura media 10,6/255, USD 0,01 [verificado 2026-10-03] | Sujeto desde capas cuando el matting no separa bien lo que debe quedar [contrato] | Dar por buena la costura sin mirar pelo y transparencias al 100 % [contrato]; injertar caras de personas reales del equipo (reglas de identidad de brand-photography) [decisión] |
| **Rehacer un detalle** (manos, una textura, un objeto chico) | `pnpm ai:inpaint image --mask <zona> --zone-resolution <px>` (512–4096) | Genera la zona recortada a ese lado largo y la devuelve a su lugar: PASS mecánico, USD 0,022 [verificado 2026-10-03] | — | Esperar un upscale: **reinterpreta** — Flare redibujó la taza y le quitó el pie pese a pedir la misma forma [verificado 2026-10-03]; la piel de una cara con Sunburst (§5.1) [verificado 2026-10-02] |
| **Reiluminar** (relight) un objeto pegado que debe quedar exacto | `place --finish element --model gpt-image-2.5-sunburst`: objeto intacto, sombra de contacto, relight sutil [verificado 2026-10-03] | Canario §10.3 | Magnific Image Relight (API y MCP) [sin verificar en vivo] | `fal:iclight-v2` (deformó el objeto e inventó una ventana) y `fal:image-apps-relighting` (cambió el color del producto) [verificado 2026-10-03]; reiluminar un plate del registro cine: el canon lo regenera [decisión] |
| **Generación cotidiana de calidad, rápida** | GPT Image 2.5 **Flare** `medium`/`high` | Mismo costo que Sunburst; en `high` 18,7 s vs 29,1 s, en `max` 46,0 s vs 80,6 s a 1024² [verificado 2026-09-16] | Sunburst si la pieza es de edición | Dejar el default del CLI (`gpt-image-2` `high` 1536×1024 ≈ USD 0,165): cuesta lo mismo que 2.5 `max` [cálculo] |
| **Máxima calidad OpenAI sin importar latencia** | 2.5 Sunburst `max` | `max` ≈ tokens de GPT Image 2 `high` [cálculo sobre fórmula oficial] | 2.5 Flare `max` (#1 AA texto a imagen, 1189) [tercero] | `xhigh`/`max` con `gpt-image-2`: el CLI lo rechaza antes de la red [contrato] |
| **Mínimo costo por pieza en OpenAI** | 2.5 `low` (≈ 0,006 a 1024²) o `medium` (≈ 0,013) | [cálculo] fórmula oficial | Seedream Lite (0,035 por imagen) si buscas divergencia | Esperar calidad final en `low` |
| **Descuento Batch 50 %** | GPT Image 2 por la Batch API | Único modelo con Batch [oficial] | — | Creer que `pnpm ai:image --batch` usa la Batch API: lee un JSON de prompts y llama la API normal, sin descuento [contrato] |
| **Fondo transparente nativo** | 2.5 Flare/Sunburst `--background transparent` | Soporte pleno en 2.5; sin costo extra [oficial] [verificado 2026-09-16] | GPT Image 2 (transparencia en preview) [oficial]; recorte local gratis con `pnpm ai:image:rmbg` [contrato] | Seedream Pro/Lite en fal: transparencia no expuesta [contrato] |
| **Divergencia barata de territorios / series relacionadas** | Seedream 5 **Lite** (`seedream5-lite`, `max_images` vía `--input`) | USD 0,035 por imagen efectiva [oficial]; series relacionadas [contrato] | 2.5 `medium` | Seedream Pro para explorar (0,0675–0,135) |
| **Materialidad, atmósfera, desarrollo de look** | Seedream 5 **Pro** (`seedream5-pro`) | Mayor riqueza de color, material y luz [verificado 2026-07-18]; realismo y textura declarados [oficial] | GPT Image 2.5 si hay texto o layout | Pedirle más de 2048² de área (§5.2) |
| **Fusión de varias referencias orientada a material** | `seedream5-pro-edit` (hasta 10 refs) | Retuvo mejor carácter [verificado 2026-07-18] | `seedream5-lite-edit` | Pasar más de 10 `--image`: fal usa las **últimas** 10 sin aviso [oficial] |
| **Separar una pieza en capas editables** (o una foto en elementos con máscara y clean plate: `pnpm ai:layers`, TASK-1973) | `seedream5-pro-layerize` | Base + hasta 16 capas PNG con alfa, nombre, z_index y bounding box [oficial]; 8 capas limpias en un KV [verificado 2026-09-16]; foto de mesa 1536×1024 → 3 capas (mesa, taza, cuaderno), ≈ USD 0,10, y **la base saca también la superficie** [verificado 2026-10-03]; **la base se cobra como una capa** (saldo de fal: 4 capas + base = USD 0,17) [verificado 2026-10-03]; el número de capas varía entre corridas (misma foto: 3 y 4) [verificado 2026-10-03]; se elige una capa por `#índice` o por nombre, y el nombre gana sobre la descripción [contrato] | Ninguna conectada | Usar la base sola como clean plate (deja pared donde había mesa: el clean plate de un elemento es la base + las demás capas por `z_index`); usar las capas como píxeles finales: son contenido regenerado, sólo máscara y clean plate [contrato]; esperar que reconstruya fielmente texto pequeño: [sin dato] |
| **Resolución nativa mayor a 2K** | GPT Image 2/2.5 hasta 3840×2160 (experimental > 2560×1440) o Seedream Lite (`auto_3K`/`auto_4K`) | [oficial]; área Lite hasta 4096² según schema, ficha dice 3072² [oficial, drift] | — | Seedream **Pro** en fal: tope 2048² de área [contrato] |
| **Formatos extremos (más de 3:1)** | Seedream Pro (aspecto 1/16–16) | [oficial] | GPT Image 2 resolvió 3:1 en un pase [verificado 2026-07-18] | GPT Image más allá de 3:1: tope 1:3–3:1 [oficial] |
| **Texto multilingüe dentro de la imagen (concepto)** | Seedream 5 Pro | Texto denso multilingüe declarado, 16 idiomas de prompt incluido español [oficial] | GPT Image 2 escribió bien una frase corta en español [verificado 2026-07-18] | Entregar ese texto como final; OpenAI no declara nada multilingüe para 2.5 [oficial, ausencia] |
| **Infografía o layout denso (concepto)** | GPT Image 2.5 o Seedream Pro | 2.5 "improves infographic accuracy and layout" [oficial]; Pro "dense text into professional layouts" [oficial] | — | Confiar en datos o cifras dentro de la imagen |
| **Vectores (SVG)** | Recraft V4.1 vía Higgsfield **CLI** | Único vector real [contrato] | Recraft por fal: no conectado (§10) | Vectorizar un raster de GPT/Seedream y llamarlo vector; dar por hecho que `hf-recraft41` (API) entrega SVG: sin confirmar (§5.8) |
| **Campaña híbrida** | Seedream ↔ GPT Image 2/2.5 → video | Flujo canónico [decisión], ver §6.16 | — | Mezclar anclas de distintas campañas |

---

## 3. Árbol de decisión — VIDEO

El video se opera con `pnpm ai:fal` para fal/Higgsfield y `pnpm ai:omni` para Gemini Omni 1.1 Cloud directo por Google. La CLI Omni cubre texto, imagen, primer/último cuadro, referencias, edición y extensión; seis canaries reales del 2026-09-24 están en el [manual](../manual-de-uso/ai-tooling/gemini-omni-1-1-cli.md). No implica disponibilidad en Globe.

| Si necesitas | Usa | Por qué | Alternativa | Evita |
|---|---|---|---|---|
| **Explorar movimiento o actuación, barato y rápido** | `h3turbo-t2v`/`-i2v` a 480P, 5 s | Latencia medida 2,7–8 s [verificado 2026-09-16]; la H3 más barata [contrato] | `flux3-*-draft` (+ `flux3-enhance` sólo del elegido); `seedance20-mini-*` 480p | Asumir paridad de calidad Turbo = Max: [sin dato]; y usar el precio del registro sin medir (§5.5) |
| **Toma hero de máxima calidad** | `seedance25-*` (hasta 30 s) | #1 OpenArt video (1125) y lidera adherencia, estética, física y consistencia [tercero] | Wan 3.0 (#1 AA texto a video con audio) [tercero]; H3 Max (#1 AA imagen a video con audio) [tercero] | Ir directo al final con **personas reales o marcas** sin una prueba corta: Seedance rechazó dos casos tras encolar, **cobrados** (isotipo Efeonce y video de barista) [verificado 2026-09-16], aunque las mascotas 3D de partner —Codex, Clawd, Gigi— pasaron [operador, 2026-09-22] y el operador ha producido videos con personas y marcas reales sin problema [operador, 2026-10-04]. Es un riesgo puntual, no un filtro sistemático; qué lo dispara: [sin dato]. Presupuestar el posible rechazo (corto y a baja resolución primero) y tener Flux 3 / Wan 3.0 si rechaza; y 1080p de 2.5 sin probar nitidez (§5.3) |
| **Toma larga (más de 15 s)** | `seedance25-*` (≤ 30 s) o `wan3-*` (2–30 s) | [contrato] | Flux 3 (≤ 20 s) | Seedance 2.0 / H3 (≤ 15 s) [contrato]; y creer que 30 s de Wan son un solo plano: puede cortar entre encuadres [tercero] |
| **4K** | `seedance20-*` base `--resolution 4k` | Único endpoint conectado que entregó 3840×2160 [verificado 2026-09-16] | `h3-*` base 4K (reescalado desde 768P, no nativo) [contrato] | Seedance 2.0 fast/mini/us (techo 720p); Seedance 2.5, Flux 3 y Wan (techo 1080p) [contrato] |
| **Control de cámara preciso sobre una imagen fija** | `h3max-camera` | Escena congelada, sólo se mueve la cámara, trayectoria de hasta 12 keyframes [contrato] [verificado 2026-09-16] | Describir el movimiento en el prompt de cualquier i2v | Pedir acción del sujeto: el modelo congela la escena [oficial] |
| **Controlar principio y fin exactos** | `flux3-flf` (ambos cuadros obligatorios) | Contrato explícito primer + último [contrato] | `wan3-i2v`, `seedance25-i2v`, `seedance20-i2v`, `h3*-i2v` con `--end-image` | `flux3-flf --duration auto` (no acepta auto) [contrato] |
| **Pasar por varios cuadros clave** | `flux3-keyframes` (1–10, `--keyframe img@frame`) | Único con keyframes [contrato] [verificado 2026-09-16] | Encadenar varios flf | Índices fuera del largo del clip (24 fps × segundos) |
| **Editar un video existente** | `seedance25-r2v --task editing` | Cambió un viñedo a nieve conservando encuadre [verificado 2026-09-16] | `flux3-edit` (también si Seedance rechaza) | Pasar `--duration`/`--aspect` (el CLI los rechaza: el proveedor fuerza auto) [contrato]; con personas o marcas, gastar el clip completo sin una prueba corta: posible rechazo cobrado [verificado 2026-09-16] |
| **Editar un video con personas o marcas, sin arriesgar un rechazo cobrado** | `flux3-edit` | USD 0,03/s, conserva movimiento y encuadre [contrato] [verificado]; sin rechazos como los de Seedance observados [verificado] | Wan 3.0 r2v usando el video como referencia (no es edición); `seedance25-r2v --task editing` presupuestando el posible rechazo cobrado: dos casos medidos [verificado 2026-09-16], producción del operador con personas y marcas sin problema [operador, 2026-10-04] | Asumir que Seedance siempre rechaza o que nunca rechaza: qué lo dispara [sin dato] |
| **Extender un video** | `seedance25-r2v --task extension` (con personas o marcas, presupuestar un posible rechazo cobrado) | Continuó el movimiento y reveló los Andes [verificado 2026-09-16] | `flux3-extend` (origen **con audio**; entrega sólo la continuación) | `flux3-extend` sobre un clip sin pista de audio: 422 tras encolar [verificado]; el CLI lo revisa con ffprobe [contrato] |
| **Muchas referencias multimodales** | `seedance25-r2v` (30 img · 10 video · 10 audio) | Mayor cupo [contrato] | `wan3-r2v` (10/5/5) · `h3*-r2v` (9/3/3) · `seedance20-r2v` (9/3/3, video sólo guía) | Enviar sólo audio: exige al menos una imagen o video [contrato] |
| **Video basado en una página web o un documento** | `wan3-r2v --thinking --web-url` / `--file` | Único con esa entrada [contrato]; `--web-url` verificado sobre efeoncepro.com [verificado 2026-09-16] | Escribir el guion a mano y usar t2v | Esperar un teaser narrativo sin prompt con guion: salió animación de la portada [verificado]; `--file` sin corrida real [sin dato] |
| **Consistencia de personaje/producto entre tomas** | Referencias (r2v) en Seedance 2.5 / Wan 3.0 / H3 | Único camino operativo hoy [contrato] | LoRA de H3 (postergada [decisión]); Higgsfield Soul ID (otro carril, skill motion-design-studio) | Dar por seguro Seedance con rostros reales sin prueba corta: un rechazo cobrado medido [verificado 2026-09-16], aunque el operador ha producido con personas reales sin problema [operador, 2026-10-04] |
| **Sólo mover la cámara con la escena quieta** | `h3max-camera` | [contrato] | — | — |
| **Diálogo con lip sync** | Seedance 2.x (diálogo entre comillas) o Flux 3 | Declarado [oficial] | Wan 3.0 (declarado, lip sync débil según terceros) [tercero] | Prometer diálogo en español sin probarlo (fal dice "inglés principal" para Flux 3) [oficial] |
| **Video con residencia de procesamiento en EE. UU.** | `seedance20-us-*` | "US hosted version" [oficial]; +20 % por token y techo 720p [contrato] | — | Elegirla por calidad: no hay diferencia declarada [oficial] |
| **Prompt exacto, sin reinterpretación** | `wan3-* --no-prompt-expansion` o H3 base `--prompt-expansion disabled` | [contrato] | — | H3 Max/Turbo: expansión obligatoria (el CLI envía `balanced`) [contrato] |
| **Video sin audio** | `--no-audio` en Seedance, Flux 3 y Wan | [contrato] | Quitar la pista en post | H3: **no tiene toggle y siempre entrega audio** [contrato] |
| 🔴 **Una pieza social en 4:5** (el formato principal de los estáticos aprobados de Efeonce) | Generar en **`3:4`** (1080×1440) con el motor que pida la toma y **recortar a 1080×1350** en post | **Ningún motor de video del carril soporta 4:5** — medido en los cinco: Seedance 2.5, Seedance 2.0, Wan 3.0, Flux 3 y H3; todos ofrecen `3:4` como lo más cercano [verificado 2026-09-22] | Entregar sólo 9:16 y 1:1 y declarar el 4:5 fuera del set, si el brief lo permite | Recortar sin medir antes que las franjas sacrificadas estén vacías; y subir un 3:4 donde la plataforma espera 4:5: **ella** recorta y decide dónde |
| **Reiluminar un video** | Ninguno conectado | Estudio de mercado en §10.3: todo **sin verificar en vivo** | ID-V2V Relight (reilumina un cuadro y lo propaga) o Beeble SwitchX [sin verificar en vivo] | Prometer relight de video con Seedance por prompt sin probarlo (y con personas o marcas, posible rechazo cobrado) [verificado 2026-09-16 para los rechazos] |
| **Stream en tiempo real dirigido** | Ninguno operable | `h3max-director` exige cliente realtime AsyncAPI, no cola [contrato] [oficial] | — | Intentarlo con el CLI (se detiene) [contrato] |

**Audio generado = provisional.** Seedance, Wan, Flux 3 y H3 generan audio; si la pieza tiene diseño sonoro, reemplázalo en post. [decisión]

🔴 **4:5 no existe en video, y la diferencia no es cosmética.** `3:4` es 0,750 y `4:5` es 0,800: a 1080 de ancho son 1440 contra 1350, **90 px, un 6,7 %**. Quien planifique motion en 4:5 tiene que **contar con el recorte desde el brief** — reservar el espacio en el encuadre y medir que las franjas que se van estén vacías antes de cortar (en la pieza de referencia: luminancia 1,8/255 arriba y 0,2/255 abajo). [verificado 2026-09-22]

```bash
ffmpeg -i toma-3x4.mp4 -vf "crop=1080:1350:0:45" -c:v libx264 -preset slow -crf 18 -c:a copy pieza-4x5.mp4
```

---

## 4. Matrices comparativas

### 4.1 Imagen

| Modelo / id | Carril / CLI | Entradas | Salida máx. real | Transparencia | Controles especiales | Precio (escalón) | Latencia medida | Estado | Ranking (§9) |
|---|---|---|---|---|---|---|---|---|---|
| GPT Image 2.5 Sunburst `gpt-image-2.5-sunburst` (+ `-2026-09-08`) | OpenAI · `ai:image` | Prompt ≤ 32.000 car.; hasta 16 imágenes < 50 MB; máscara PNG alfa [oficial] | 3840×2160 (borde ≤ 3840, área ≤ 8.294.400; > 2560×1440 experimental) [oficial] | Plena [oficial] | Calidad `low…max`; `--mask`; `n` vía `--count` = N pedidos (el CLI lo avisa) [contrato] | Por tokens de salida: 1024² `high` ≈ 0,053 · `max` ≈ 0,211 [cálculo] | 1024²: low 11,6 s · high 29,1 s · max 80,6 s [verificado 2026-09-16] | Conectado, en uso | Arena T2I #1, edit #1; AA T2I #2, edit #1 [tercero] |
| GPT Image 2.5 Flare `gpt-image-2.5-flare` (+ snapshot) | OpenAI · `ai:image` | Igual que Sunburst [oficial] | Igual [oficial] | Plena [oficial] | Igual; única diferencia de API es `model` [oficial] | Idéntico a Sunburst [verificado 2026-09-16] | 1024²: low 13,3 s · high 18,7 s · max 46,0 s [verificado 2026-09-16] | Conectado | Arena T2I #2, edit #2; AA T2I #1, edit #2 [tercero] |
| GPT Image 2 `gpt-image-2` (+ `-2026-04-21`) | OpenAI · `ai:image` (**default del CLI**) | Igual; `input_fidelity` se omite [oficial] | Igual [oficial] | Preview [oficial] | Calidad `low/medium/high/auto`; único con Batch API [oficial] | 1536×1024 `high` ≈ 0,165; `medium` ≈ 0,041 [oficial] | `medium` 34–58 s por job [verificado 2026-07-18]; `high` puede superar 125 s [contrato] | Conectado; "Earlier GPT Image models" [oficial] | Arena T2I #3; OpenArt #2 [tercero] |
| Seedream 5.0 Pro `seedream5-pro` | fal · `ai:fal` | Prompt (recomendado ≤ 600 palabras inglés [oficial]) | Área 1024²–2048² (`auto_1K`, `auto_2K`, WxH); aspecto 1/16–16 [contrato] | No expuesta en fal [contrato] | `--format jpeg|png` (default **jpeg**); `--count` 1–6; sin seed [contrato] | 0,0675 (≤ 1536²) · 0,135 (1536²–2048²) [oficial, "tentative"] | 56,8 s [verificado 2026-09-16] | Verificada 2026-09-16 | OpenArt #1; Arena T2I #10; AA T2I #15 [tercero] |
| Seedream 5.0 Pro Edit `seedream5-pro-edit` | fal · `ai:fal` | Prompt + hasta 10 `--image` (≤ 30 MB) [oficial] | Igual que Pro [contrato] | No [contrato] | Sin máscara; edición sólo por lenguaje [contrato] | 0,0675/0,135 por salida + 0,0045 por referencia adicional (la primera gratis) [oficial] | 116,2 s [verificado 2026-09-16] | Verificada 2026-09-16 | Arena edit #8; AA edit #9 [tercero] |
| Seedream 5.0 Pro Layerize `seedream5-pro-layerize` | fal · `ai:fal` | 1 imagen png/jpeg 512²–6000², ≤ 30 MB; prompt opcional con `<bbox>` [contrato] | Base + hasta 16 capas PNG con alfa + `layers.json` [contrato] | Sí, por capa [verificado] | `image_size` `auto|auto_1K|auto_1.5K|auto_2K`; `enhance_prompt_mode` vía `--input` [contrato] | 0,03375/capa (área < 1536²) · 0,0675/capa (> 1536²) [oficial]; la base se cobra como una capa [verificado 2026-10-03] | 83,2 s [verificado 2026-09-16] | Verificada 2026-09-16 | — |
| Seedream 5.0 Lite `seedream5-lite` | fal · `ai:fal` | Prompt | Área 2560×1440–4096² según schema; ficha dice 3072² [oficial, drift] | No [contrato] | `max_images` 1–6 vía `--input`; PNG; devuelve seed [contrato] | 0,035 por imagen efectiva [oficial] | 43,8 s [verificado 2026-09-16] | Verificada 2026-09-16 | Arena T2I #37; AA T2I #43 [tercero] |
| Seedream 5.0 Lite Edit `seedream5-lite-edit` | fal · `ai:fal` | Prompt + hasta 10 refs en fal [contrato] | Igual que Lite [contrato] | No | `max_images` vía `--input` [contrato] | 0,035 por imagen [oficial] | 53,5 s [verificado 2026-09-16] | Verificada 2026-09-16 | Arena edit #26; AA edit #20 [tercero] |

### 4.2 Video

Precio: **registro** = lo que guarda `fal-capabilities.ts` (escalón más bajo de la API de pricing de fal) · **publicado** = página del modelo o fabricante por resolución. Si difieren, manda el publicado hasta medir con `--balance` (§7).

| Familia · ids | Entradas | Salida máx. real | Duración | fps | Audio | Referencias | Controles especiales | Precio registro → publicado por escalón | Latencia | Estado | Ranking (§9) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Gemini Omni 1.1 Cloud** · `gemini-omni-1.1-flash-preview` vía `ai:omni` | Texto · imagen · primer/último cuadro · referencias · MP4 para `edit`/`extend` [contrato] | 360p/3 s entregados [verificado 2026-09-24]; 720p/1080p/4K declarados, 1080p/4K reescalados [oficial] | 3–10 s [oficial] | 24 a 360p [verificado] | AAC en seis canaries [verificado] | Hasta 10 imágenes y 3 videos por prompt; video fuente ≤ 10 s [oficial] | `text_to_video`, `image_to_video`, `reference_to_video`, `edit`, `extend`; `global`, GCS privado, cuota fija [contrato] [oficial] | Video output nominal: 360p 0,0338/s · 720p 0,1014/s · 1080p 0,1520/s · 4K 0,3041/s; input y otros tokens aparte [oficial] | Ver [manual](../manual-de-uso/ai-tooling/gemini-omni-1-1-cli.md) | Seis rutas MP4 verificadas 2026-09-24 a 360p [verificado] | El ranking de §9 corresponde al modelo anterior |
| **Seedance 2.5** · `seedance25-t2v`, `-i2v`, `-r2v` | Texto · imagen (+ `--end-image`) · refs [contrato] | **1080p ENTREGADO [verificado 2026-09-22]**: dos corridas `seedance25-i2v` y `-r2v` devolvieron 1080×1920 reales (145 cuadros, 24 fps). Nitidez nativa vs reescalado: [sin dato]. La tabla oficial de la ficha sigue listando sólo 480p/720p [oficial, contradicción parcialmente resuelta] | 4–30 s o `auto` [contrato] | 24 [oficial] | Sí, `--no-audio` [contrato] | 30 img · 10 video (1,8–30,2 s c/u, ≤ 30,2 s total) · 10 audio [contrato] | `--task reference|editing|extension` (único), `--bitrate`, `--aspect` [contrato] | 0,0214/1.000 tokens → 480p ≈ 0,2205/s · 720p ≈ 0,4730/s · 1080p ≈ 1,164/s; con videos de referencia 720p ≈ 0,2838/s, 480p ≈ 0,1323/s [oficial] | r2v reference > 15 min [verificado] | Verificadas 2026-09-16 (a 480p) | OpenArt #1 [tercero] |
| **Seedance 2.0 base** · `seedance20-t2v`, `-i2v`, `-r2v` | Igual [contrato] | **4K 3840×2160** [verificado 2026-09-16]; nativo o reescalado [sin dato] | 4–15 s o `auto` | 24 | Sí, `--no-audio` | 9 img · 3 video (2–15 s total, 480p–720p) · 3 audio; **video sólo guía**, sin `--task` [contrato] | `--bitrate`, multi-shot dentro de la generación [oficial] | 0,014/1.000 tokens → 720p 0,3024/s [oficial]; 480p ≈ 0,141/s · 1080p ≈ 0,685/s · 4K ≈ 2,72/s [cálculo] | "menos de 2 minutos" [oficial] | Verificadas 2026-09-16 | OpenArt #3; AA I2V con audio #2 (720p) [tercero] |
| **Seedance 2.0 fast** · `seedance20-fast-*` | Igual | 720p [contrato] | 4–15 s | 24 | Sí | 9/3/3 [contrato] | `--bitrate`; "Output quality: Same" que base según fal [oficial] | 0,0112/1.000 tokens → 480p ≈ 0,1125/s · 720p 0,2419/s [oficial] | [sin dato] | Verificadas 2026-09-16 | — |
| **Seedance 2.0 mini** · `seedance20-mini-*` | Igual | 720p [contrato] | 4–15 s | 24 | Sí | 9/3/3 [contrato] | **Sin** `--bitrate` [contrato] | 0,007/1.000 tokens → 480p ≈ 0,0721/s · 720p ≈ 0,1547/s [oficial] | [sin dato] | Verificadas 2026-09-16 | OpenArt #4 [tercero] |
| **Seedance 2.0 us** · `seedance20-us-*` | Igual | 720p [contrato] | 4–15 s | 24 | Sí | 9/3/3 [contrato] | Hospedada en EE. UU. [oficial] | 0,0168/1.000 tokens → 480p 0,1731/s · 720p 0,37/s [oficial] | [sin dato] | Verificadas 2026-09-16 | — |
| **H3 base** · `h3-t2v`, `-i2v`, `-r2v` | Texto · imagen (+ `--end-image`, sin `--aspect`) · refs [contrato] | 480P/768P nativos; **2K y 4K reescalados desde 768P** [contrato] | 5–15 s enteros [contrato] | 24 [oficial] | **Siempre, sin toggle**; estéreo 48 kHz [contrato] [oficial] | 9 img · 3 video · 3 audio [contrato] | `--prompt-expansion disabled|fast|balanced|quality` (opcional); resolución en MAYÚSCULAS [contrato] | 0,05/s → 480P 0,05 · 768P 0,06 · **2K 0,13** · 4K 0,16 [oficial] | [sin dato] | Verificadas 2026-09-16 | OpenArt #7; AA T2V con audio #4 [tercero] |
| **H3 Max** · `h3max-t2v`, `-i2v`, `-r2v` | Igual | 480P/768P nativos; 1080P refinado desde 768P [contrato] | 5–15 s | 24 | Siempre | 9/3/3 [contrato] | 🔴 **`h3max-r2v` SÍ acepta `--aspect`, y SIN él devuelve 1920×1080 HORIZONTAL aunque todas las referencias sean verticales [verificado 2026-09-22, 2 corridas]** — el registro sólo anota «sin aspect ratio» para `-i2v`. Expansión **obligatoria** (`balanced` por defecto del CLI) [contrato]; post-entrenado por fal, no por MiniMax [oficial] | 0,025/s → 480P 0,025 · 768P 0,04 · 1080P 0,08 (rotulados "50% off": promo o lista [sin dato]) [oficial] | 5 s en < 3 s declarado [oficial] | Verificadas 2026-09-16 | AA I2V con audio **#1**, T2V con audio #3 [tercero] |
| **H3 Max camera** · `h3max-camera` | 1 imagen; prompt opcional [contrato] | 1080P [contrato] | 5–15 s | 24 | Siempre | — | `--camera-trajectory` ≤ 12 keyframes `{distance, elevation −90..90, azimuth, time 0..1}`; unidades de distance/azimuth [sin dato] [contrato] | 0,025/s registro; escalones publicados [sin dato] | [sin dato] | Verificada 2026-09-16 | — |
| **H3 Max Turbo** · `h3turbo-t2v`, `-i2v` | Texto · imagen [contrato] | 1080P [contrato] | 5–15 s | 24 | Siempre | — | Expansión obligatoria [contrato] | 0,0125/s registro → 768P 0,02 (promo 0,01) · 1080P 0,04 (promo 0,02); 480P no listado [oficial]; **registro no calza: medir** | 2,7–8 s [verificado 2026-09-16] | Verificadas 2026-09-16 | Sin presencia [tercero] |
| **H3 LoRA** · `h3-t2v-lora`, `h3-i2v-lora`, `h3-r2v-lora` | Igual que base + `--lora path@escala` (≤ 3, escala 0–4) [contrato] | 2K/4K reescalados [contrato] | 5–15 s | 24 | Siempre | 9/3/3 (r2v) | `--lora path@escala#weight_name` [contrato] | 0,0625/s registro; escalones [sin dato] | [sin dato] | **SIN VERIFICAR** | — |
| **H3 entrenadores** · `h3-train-t2v`, `-i2v`, `-flf2v`, `-ref2va` | `.zip` de clips (`--training-data`) [contrato] | `lora_file` .safetensors + `config_file` [oficial] | — | — | Entrena video+audio (`t2va`) [oficial] | — | `--steps` (1–15000 contrato; página 1–6000 [contradicción]), `--rank 8…128`, `--learning-rate`, `--trigger` [contrato] | t2v 0,005/step · i2v/flf2v 0,01 · ref2va 0,015; **mínimo 100 steps** [oficial] | Espera CLI hasta 3 h [contrato] | **SIN VERIFICAR** | — |
| **H3 Max Director** · `h3max-director` | Prompt, primer/último cuadro, audio objetivo [oficial] | [sin dato] | Sesión hasta 15 min [oficial] | — | — | — | Stream realtime | 0,08/s lista · 0,02/s promo · 1080p 2× · mínimo USD 1,20 [oficial] | Realtime | **NO OPERABLE** por cola | — |
| **Flux 3** final · `flux3-t2v`, `-i2v`, `-flf`, `-keyframes` | Texto · imagen · primer+último (ambos obligatorios) · 1–10 keyframes [contrato] | 720p/1080p en fal (BFL directo hasta 3840×2176) [oficial] | `auto` o 5–20 s (flf y keyframes sin `auto`) [contrato] | 24 [verificado] | Sí, `--no-audio` [contrato] | — | `--safety-tolerance 0–4` (default 2) [contrato] | 0,085/s registro → **720p 0,17 · 1080p 0,29** [oficial BFL y fal] | 40 s–4 min [verificado] | Verificadas 2026-09-16 | OpenArt #6; ausente en AA [tercero] |
| **Flux 3 draft** · `flux3-t2v-draft`, `-i2v-draft`, `-flf-draft`, `-keyframes-draft` | Igual, sin `--resolution` [contrato] | Borrador 1280×704 [verificado] | Igual | 24 | Sí | — | Devuelve `draft_cache` [contrato] | 0,03/s registro → **0,06/s** publicado [oficial] | [sin dato] | Verificadas 2026-09-16 | — |
| **Flux 3 enhance** · `flux3-enhance` | `--draft-cache <url>` (sin prompt, duración, resolución ni aspect) [contrato] | 1920×1088 [verificado] | Hereda | 24 | Hereda | — | "sin reinterpretar", misma semilla y movimiento [oficial] | 0,085/s registro; publicado [sin dato] (riesgo 2×, ver §7) | [sin dato] | Verificada 2026-09-16 | — |
| **Flux 3 edit** · `flux3-edit` | `--video` (MP4/MOV/WebM/M4V/GIF, < 15 s) [contrato] [oficial] | 720p [oficial] | Hereda | 24 | Conserva audio [sin dato] | — | Re-render por prompt conservando movimiento y encuadre [contrato] | 0,03/s registro = 0,03/s publicado (720p) [oficial] | ~5 min [oficial] | Verificada 2026-09-16 | — |
| **Flux 3 extend** · `flux3-extend`, `flux3-extend-draft` | `--video` **con pista de audio**, < 50 MB [contrato] | 720p/1080p [contrato] | `--duration` = segundos **nuevos** (5–20 o `auto`; `auto` entregó 15 s) [contrato] [verificado] | 24 | Sí | — | Usa hasta 4 s de video+audio como contexto; entrega **sólo la continuación** [oficial] [verificado] | extend 0,205/s registro → **720p 0,41 · 1080p 0,53** [oficial]; extend-draft 0,06/s registro, publicado [sin dato] | [sin dato] | Verificadas 2026-09-16 | — |
| **Wan 3.0** · `wan3-t2v`, `-i2v`, `-r2v` | Texto · imagen (prompt opcional, `--end-image`) · refs; web/documento en r2v [contrato] | 1080p (default del proveedor; el CLI envía 480p si omites `--resolution`) [contrato] | 2–30 s o `auto` (se envía `null`; verificado → 5,04 s) [contrato] [verificado] | **30** [oficial] | Sí, `--no-audio` [contrato] | 10 img · 5 video (≤ 15 s total, ≥ 16 fps) · 5 audio [contrato] | `--thinking`, `--web-url`, `--file` (r2v), `--no-prompt-expansion`, `--seed` [contrato] | 0,05/s registro → 480p 0,05 · 720p 0,10 · **1080p 0,20** [oficial] | Sin expansión ahorra 20–60 s [contrato]; típica 1–5 min [tercero] | Verificadas 2026-09-16 (`--file` sin corrida) | OpenArt #2; AA T2V con y sin audio **#1** [tercero] |
| **Wan 3.0 Prime** · `wan3prime-t2v`, `-i2v`, `-r2v` | Igual que base [contrato] | 1080p [contrato] | Igual | 30 | Igual | Igual | Igual; "versión acelerada" [oficial] | 0,05/s registro → 480p 0,068 · 720p 0,14 · **1080p 0,28** (más cara que base) [oficial] | Más rápida [oficial]; "hasta 7×" [tercero]; sin medir | Verificadas 2026-09-16 | No figura [tercero] |

🔴 **Ninguna familia de esta matriz ofrece `4:5`** — medido en los cinco motores fal [verificado 2026-09-22]; Gemini Omni 1.1 Cloud publica sólo `16:9`/`9:16` [oficial]. En fal, el aspecto más cercano es `3:4`, y el camino a 4:5 es generar en 3:4 y recortar: ver la fila de 4:5 en §3.

### 4.3 Video por operación y fase (operación × motor)

Organiza §4.2 por **operación** según la [taxonomía de producción de video](GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md)
(§3.5: preproducción, producción, posproducción). **Ningún motor es el default**: cada fila lista todos los que hacen
la operación; se elige por contrato de fidelidad (§0) y por esta evidencia. Leído y armado el 2026-10-03.

**Estado:** `[verificado AAAA-MM-DD]` = generación real nuestra que verificó el **contrato del endpoint** (resolución,
duración, audio, que el CLI arma bien el pedido), según la leyenda de §1 · `[contrato]` = conectado, nunca corrido ·
`[sin dato]` = no medido · `[hf-cli]` = CLI de la app de Higgsfield (bloque al final de esta sección) · `[mcp]` = sólo en un MCP de sesión de Claude (out-of-band, sin presupuesto gobernado ni
manifiesto: no es carril de producción). **Canario** = corrida real con **garantía medida** y README de evidencia
(ADR-024 req. 1); hoy hay **uno** en video. Precio: USD por segundo **publicado** a 720p · 1080p (§4.2 manda; donde
el escalón difiere se indica). Los costos por canario están en [EPIC-051](../epics/to-do/EPIC-051-ai-video-production-cli-capabilities.md).

**Bandas de costo** (las cita la [taxonomía](GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md) §3.1b por tipo de video;
USD por segundo de salida **publicado**, a la resolución de entrega, 2026-10-03):

| Banda | USD/s | Ejemplos (de esta guía) |
|---|---|---|
| **0** | sin generación | post determinístico (ffmpeg, HyperFrames, `pnpm ai:inpaint` sin motor) |
| **bajo** | ≤ 0,10 | Wan 3.0 480p/720p · H3 Max 768P/1080P · H3 Max Turbo · Seedance 2.0 mini 480p · `flux3-edit` · Flux 3 draft |
| **medio** | 0,10 – 0,30 | Flux 3 720p/1080p · Seedance 2.0 base/fast 720p · Seedance 2.0 mini 720p · Omni 720p/1080p · Wan 3.0 Prime 1080p · Wan 3.0 1080p |
| **alto** | > 0,30 | Seedance 2.5 720p/1080p · Seedance 2.0 1080p/4K · `flux3-extend` |

Los modelos de la CLI de Higgsfield (Veo 3.1, Cinema Studio, Kling 3.0) cobran en **créditos** y entran en una banda
cuando se mida el valor del crédito (TASK-1986); hasta entonces se comparan entre sí en créditos.

#### Preproducción

| Operación | Herramienta | Estado | Nota |
|---|---|---|---|
| `pre.storyboard`, `pre.keyframe-still`, `pre.reference-build`, `pre.cast-sheet` | modelos de imagen (§2, §4.1): GPT Image 2.5, Seedream 5.0; `pnpm foto:*` para piezas de marca; `pnpm ai:inpaint` para corregir un still | ver §4.1 | El still de entrada se aprueba al 100 % antes de animarlo; la marca va resuelta ahí |
| `pre.previs3d` | Blender vía puente MCP local `higgsfield-use-blender` | conectado 2026-09-24 (skill `higgsfield-provider`); playblast → referencia de movimiento **[sin dato]** como receta | Previs exportado → r2v: capacidad investigada, no receta validada (workflow de selección) |
| `pre.pilot` | el motor más barato que conserve lo que se juzga: `h3turbo-*` 480P/768P, `flux3-*-draft`, `seedance20-mini-*` 480p, `wan3-*` 480p, Omni 360p | [verificado 2026-09-16] (Omni 2026-09-24) | §7.2 |
| `pre.estimate` | `--estimate` (`ai:fal`, `ai:omni`), `--dry-run` (`ai:inpaint`); MCP Magnific `simulate_cost` [mcp] | [contrato] | La estimación no es techo de factura (§7.3, caso SKY V11) |

#### Producción

| Operación | Motor · id | Estado | Canario | USD/s 720p · 1080p | Nota |
|---|---|---|---|---|---|
| `gen.t2v` | Seedance 2.5 · `seedance25-t2v` | [verificado 2026-09-16] | no | 0,473 · 1,164 (el CLI estima 1,04 a 1080p) | hasta 30 s |
| | Seedance 2.0 base/fast/mini/us · `seedance20-*-t2v` | [verificado 2026-09-16] | no | base 0,302 · ≈0,685; fast 0,242 · —; mini 0,155 · — | único 4K nativo-o-reescalado entregado (base) |
| | Flux 3 · `flux3-t2v` (+ `-draft`) | [verificado 2026-09-16] | no | 0,17 · 0,29 (draft 0,06) | ≤ 20 s |
| | Wan 3.0 / Prime · `wan3-t2v`, `wan3prime-t2v` | [verificado 2026-09-16] | no | 0,10 · 0,20 (Prime 0,14 · 0,28) | 30 fps; ≤ 30 s, puede cortar entre encuadres |
| | MiniMax H3 base/Max/Turbo · `h3-t2v`, `h3max-t2v`, `h3turbo-t2v` | [verificado 2026-09-16] | no | base 0,06 (768P) · 0,13 (2K reesc.); Max 0,04 · 0,08; Turbo 0,02 · 0,04 | audio siempre, sin toggle |
| | Gemini Omni 1.1 · `ai:omni` modo texto | [verificado 2026-09-24, 360p] | no | 0,101 · 0,152 (output nominal) | 3–10 s; 16:9/9:16 |
| | Higgsfield API · Kling 3.0 std/pro/4K/Turbo, Kling 2.6, LTX 2.5, PixVerse 6, Happy Horse, Hailuo 2.3, Wan 2.6/2.7, H3 2K | [contrato] (sólo `--estimate`) | no | por `--estimate` (§5.8) | ninguna capacidad de video corrida en salida |
| `gen.i2v` | Seedance 2.5 · `seedance25-i2v` | [verificado 2026-09-16]; 1080×1920 entregado 2026-09-22 | no | 0,473 · 1,164 | posible rechazo cobrado con personas reales o marcas (riesgo puntual, no sistemático) |
| | Seedance 2.0 · `seedance20-*-i2v` | [verificado 2026-09-16] | no | ídem t2v | ídem riesgo |
| | Flux 3 · `flux3-i2v` (+ draft → `flux3-enhance`) | [verificado 2026-09-16] | no | 0,17 · 0,29 | enhance publicado [sin dato] |
| | Wan 3.0 / Prime · `wan3-i2v` | [verificado 2026-09-16] | no | 0,10 · 0,20 | prompt opcional |
| | H3 base/Max/Turbo · `h3-i2v`, `h3max-i2v`, `h3turbo-i2v` | [verificado 2026-09-16] | no | ídem t2v | Max #1 AA imagen a video con audio [tercero] |
| | Gemini Omni 1.1 · modo imagen | [verificado 2026-09-24, 360p] | no | 0,101 · 0,152 | Social Wall publicado con el modelo anterior |
| | Higgsfield API · `hf-kling3-*-i2v`, `hf-kling25turbo-i2v`, `hf-seedance*-i2v`, `hf-wan3-i2v` | [contrato] | no | `--estimate` | |
| `gen.r2v` | Seedance 2.5 · `seedance25-r2v` (30 img · 10 video · 10 audio) | [verificado 2026-09-16]; 1080p 2026-09-22 | no | 0,473 · 1,164 (menos con video de referencia, §4.2) | el que más referencias acepta |
| | Seedance 2.0 · `seedance20-*-r2v` (9/3/3, video sólo guía) | [verificado 2026-09-16] | no | ídem | |
| | Wan 3.0 / Prime · `wan3-r2v` (10/5/5) | [verificado 2026-09-16] | no | 0,10 · 0,20 | sin rechazo por personas reales observado |
| | H3 base/Max · `h3-r2v`, `h3max-r2v` (9/3/3) | [verificado 2026-09-16]; CMP-001 2026-09-22 | no | ídem t2v | sin `--aspect` sale 1920×1080 horizontal |
| | Gemini Omni 1.1 · modo referencias (10 img · 3 video) | [verificado 2026-09-24, 360p] | no | 0,101 · 0,152 | |
| | Higgsfield API · `hf-seedance*-r2v`, `hf-wan3-r2v`, `hf-grok-video15-r2v`; Kling `elements` vía `--input` | [contrato] | no | `--estimate` | `elements` = candidato a consistencia de cast |
| `gen.flf` | Flux 3 · `flux3-flf` (ambos cuadros obligatorios) | [verificado 2026-09-16] | no | 0,17 · 0,29 | sin `auto` |
| | Wan · `wan3-i2v --end-image`; Seedance 2.5/2.0 · `-i2v --end-image`; H3 · `h3*-i2v --end-image` | [verificado 2026-09-16] (generación; el último cuadro no se midió) | no | según familia | |
| | Gemini Omni 1.1 · modo cuadros | [verificado 2026-09-24, 360p] | no | 0,101 · 0,152 | |
| | Higgsfield API · `hf-kling-o3-flf`, `hf-kling-omni-flf` | [contrato] | no | `--estimate` | |
| `gen.keyframes` | Flux 3 · `flux3-keyframes` (1–10, `img@cuadro`) | [verificado 2026-09-16] | no | 0,17 · 0,29 (draft 0,06) | único con keyframes |
| `gen.camera` | H3 Max · `h3max-camera` (≤ 12 keyframes de trayectoria) | [verificado 2026-09-16] | no | registro 0,025; escalones [sin dato] | escena congelada |
| | Higgsfield Cinema Studio 4.0 (cámara, lente, rig de luz) | [mcp], fuera del catálogo de API | no | [sin dato] | |
| `gen.source-doc` | Wan 3.0 · `wan3-r2v --thinking --web-url` / `--file` | web [verificado 2026-09-16]; `--file` [sin dato] | no | 0,10 · 0,20 | exige guion en el prompt |
| `gen.multishot` | Seedance 2.0 (multi-shot declarado [oficial]); Wan 3.0 (puede cortar en 30 s [tercero]); Kling 3 `multi_prompt` vía Higgsfield [contrato] | [sin dato] como operación medida | no | según familia | |
| `time.extend` | Seedance 2.5 · `seedance25-r2v --task extension` | [verificado 2026-09-16] | no | 0,473 · 1,164 (+ entrada) | con personas o marcas, posible rechazo cobrado |
| | Flux 3 · `flux3-extend` (+ draft) | [verificado 2026-09-16] | no | 0,41 · 0,53 | origen con audio; entrega sólo la continuación |
| | Gemini Omni 1.1 · modo extender | [verificado 2026-09-24, 360p → 6 s] | no | 0,101 · 0,152 | aspecto heredado |
| | Higgsfield API · `hf-seedance25-extend` | [contrato] | no | `--estimate` | |
| `audio.native` | Seedance, Wan, Flux 3 (`--no-audio`), H3 (siempre), Omni (AAC) | [verificado] por familia | no | incluido | provisional por regla |
| `cast.train` | H3 · `h3-train-*` + `h3-*-lora` | [contrato]; postergado [decisión] | no | piso 100 steps (§5.5) | |
| | Higgsfield Soul ID | [mcp] / app | no | [sin dato] | |

#### Posproducción

| Operación | Motor · id | Estado | Canario | USD/s 720p · 1080p | Nota |
|---|---|---|---|---|---|
| `edit.zone` | `pnpm ai:inpaint video` + Flux 3 · `fal:flux3-edit` (máscara fija o cajas por keyframes) | [verificado 2026-09-16] | ✅ **sí**, 2026-10-02 (`ai-generations/2026-10-02_task-1965-canary/`): 5 s cámara quieta, 120 cuadros PASS, deriva 11,16/255 (umbral 12) | 0,03 (720p) | único canario de video; cámara quieta |
| | `pnpm ai:inpaint video` + `fal:seedance25-edit` (+ estrategia `first-frame`) | [contrato] (`verifiedAt: null` en el adaptador) | no | tokens de Seedance | nunca corrido |
| `edit.global` | Flux 3 · `flux3-edit` | [verificado 2026-09-16] | no (sólo dentro de `edit.zone`) | 0,03 (720p) | sale a 720p |
| | Seedance 2.5 · `seedance25-r2v --task editing` | [verificado 2026-09-16] | no | ≈ 0,284 con video de referencia (720p) | posible rechazo cobrado con personas o marcas (puntual) |
| | Gemini Omni 1.1 · modo editar | [verificado 2026-09-24, 360p] | no | 0,101 · 0,152 | cadena stateful sin probar |
| | Higgsfield API · `hf-seedance25-edit` | [contrato] | no | `--estimate` | |
| | Magnific `video_modify` (Aleph 2, Seedance 2/2.5, Omni, H3, Grok) | [mcp] | no | créditos Magnific [sin dato USD] | |
| `edit.erase` | — **ningún motor conectado** · candidato Wan VACE 14B inpainting (`fal-ai/wan-vace-14b/inpainting`, `mask_video_url`) | esquema leído (TASK-1965), sin conectar | no | [sin dato] | TASK-1979 |
| `edit.track` | — · candidato SAM 2 video (`fal-ai/sam2/video`); hoy sólo cajas interpoladas en `ai:inpaint video` | esquema leído, sin conectar | no | [sin dato] | TASK-1979 |
| `edit.background` | — en el CLI · Magnific `video_remove_background` (alfa en webm, ≤ 20 s) | [mcp] | no | créditos | TASK-1983 |
| `edit.relight` | — en el CLI · Magnific `video_relight` (Beeble SwitchLight, ≤ 240 cuadros); Higgsfield Cinema Studio `video_edit`; candidatos fal ID-V2V y LightX (§10.3) | [mcp] / sin conectar | no | ID-V2V 0,20 · LightX 0,10 [tercero] | TASK-1984 |
| `time.loop` | `gen.flf` con el mismo cuadro al inicio y al final (Flux 3, Wan, Seedance, H3); crossfade o palíndromo determinístico | [sin dato] como loop medido | no | según familia · 0 | TASK-1982 |
| `time.retime` | ffmpeg (constante, local) · Magnific `video_speed` (constante gratis, rampas con créditos) | D sin CLI de manifiesto · [mcp] | no | 0 | TASK-1981 |
| `time.interpolate` | — en el CLI · Topaz vía Magnific `video_upscale` (`frameInterpolation`) | [mcp] | no | créditos | follow-up |
| `assemble.cut`, `assemble.edit` | ffmpeg / HyperFrames (determinístico); Magnific `video_cut`, `video_concatenate` | D sin CLI genérico · [mcp] | no | 0 | TASK-1981 |
| `finish.overlay`, `finish.captions` | HyperFrames, ffmpeg, motor de Glitch (taller) | D por pieza | no | 0 | TASK-1981 |
| `finish.grade` | ffmpeg `lut3d` (determinístico) · Magnific `video_color_grade` / `video_color_transfer` | D sin CLI · [mcp] | no | 0 · créditos | TASK-1981 |
| `finish.reframe` | ffmpeg `crop` con medición manual de franjas (4:5 desde 3:4) · Aleph 2 `targetAspectRatio` vía Magnific | D manual · [mcp] | no | 0 | TASK-1981 |
| `finish.upscale` | Flux 3 · `flux3-enhance` (sólo su propio draft) · H3 base 2K/4K (reescalado interno) · Magnific `video_upscale` (Topaz, Magnific) | [verificado 2026-09-16] · [mcp] | no | enhance [sin dato] · créditos | detalle nativo sin detector; TASK-1983 |
| `audio.voice`, `audio.sfx` | ElevenLabs (MCP de sesión): locución con `eleven_v4` vía el conector **ElevenLabs Creative** (`creative_generate_speech`, etiquetas `[excited]` `[curious]` `[warmly]` `[dramatically]` `[fast]`; usado 2026-10-03 en el spot «Sparks × Efeonce AEO»); motor de sonido de Glitch (taller) | [mcp] · D | no | `estimate_only` 71 créditos por toma corta (~USD 0,016); el run reportó 0 créditos [mcp 2026-10-03] | TASK-1985 |
| `audio.music` | Stable Audio 2.5 / ElevenLabs Music v2.5 vía fal, fuera de `ai:fal` (§5.9) | [verificado 2026-09-27] (Glitch) · [verificado 2026-10-03] cambio de estilo audio-to-audio (spot Sparks) | no | §5.9 | |
| `audio.lipsync` | Seedance 2.x / Flux 3 (diálogo declarado [oficial]); Wan 3.0 (débil [tercero]); Higgsfield LipSync [mcp] | [sin dato] en español | no | según familia | TASK-1985 |
| `audio.mix` | ffmpeg `loudnorm` | D sin CLI de manifiesto | no | 0 | TASK-1981 |
| `deliver.export` | ffmpeg + hash | D manual | no | 0 | TASK-1981 |

#### Puente Higgsfield: CLI de la app (`higgsfield`) y su MCP

Regla de uso: **propio primero, proveedor como puente** (taxonomía §1 y §3.13). Este bloque es el puente más amplio
disponible hoy. **No es la API de Higgsfield** (`hf-*` de §5.8): es la CLI de la app, con sesión de usuario
(mkt@efeoncepro.com, plan Ultra, **4.118 créditos** el 2026-10-03) y el catálogo de la app. Inventario leído el
2026-10-03: **39 modelos de video** en `higgsfield model list --video` más los workflows de video (`higgsfield workflow
list`); el MCP de la misma cuenta lista 54. `higgsfield generate cost` estima **gratis** sin encolar; para las
operaciones sobre un video existente la estimación exige subir antes la fuente (`higgsfield upload`), que no se hizo.
**Ninguna corrida real**: todo es `[contrato]` (catálogo y validación de parámetros).

| Operación | `job_type` / workflow | Estado | Créditos estimados (`generate cost`, 2026-10-03) |
|---|---|---|---|
| `gen.t2v` / `gen.i2v` | `veo3_1`, `veo3_1_lite`, `veo3` (**Veo, que la API nos rechaza**) | [contrato] | Veo 3.1 8 s: 32 · Veo 3.1 lite 8 s: 12 |
| | `kling3_0` (std/pro/4K), `kling3_0_turbo`, `kling2_6` | [contrato] | Kling 3.0 5 s: 8,75 · Turbo 720p 5 s: 7,5 |
| | `seedance_2_5` (t2v, omni-reference, edición, extensión), `seedance_2_0`, `seedance_2_0_mini`, `seedance1_5` | [contrato] | Seedance 2.5 5 s: 720p 35 · 1080p 60 |
| | `wan3_0`, `wan3_0_prime`, `wan2_7`, `wan2_6` | [contrato] | Wan 3.0 720p 5 s: 8,75 |
| | `minimax_h3`, `minimax_h3_max`, `minimax_hailuo` | [contrato] | H3 Max 5 s: 12,5 |
| | `flux_3_video`, `gemini_omni`, `gemini_omni_flash_1_1`, `grok_video_v15`, `happy_horse_video` | [contrato] | [sin dato] (requieren parámetros adicionales) |
| | workflows Cinema Studio `cinematic_studio_video_v2`, `_3_0` (hasta 4K, género, rampas de velocidad, multi-shot), `_3_5`, `cinematic_studio_video_4_0` (cámara, lente, era, paleta, rig de luz) | [contrato] | [sin dato] |
| `gen.motion-transfer` | `hf_mult_motion_control` (Genjutsu), workflow `kling3_0_motion_control` | [contrato] | requiere fuente |
| `time.extend` | `seedance_2_5` modo extensión; Cinema Studio 4.0 `video_extension` (adelante y atrás) | [contrato] | requiere fuente |
| `time.interpolate` | `fps_boost` (ByteDance o Topaz) | [contrato] | requiere fuente |
| `edit.global` | `kling_video_edit`, `flux_3_video_edit`, Seedance 2.5 `video_edit`, Cinema Studio 4.0 `video_edit` | [contrato] | requiere fuente |
| `edit.replace` | `hf_mult_replace_object` (Genjutsu) | [contrato] | requiere fuente |
| `edit.track` | `sam_3_video` (SAM 3, `apply_mask`) | [contrato] | requiere fuente |
| `edit.depth` | `depth_anything_video` | [contrato] | requiere fuente |
| `edit.background` | `video_background_remover` | [contrato] | requiere fuente |
| `edit.relight` | Cinema Studio 4.0 (`light: preset\|custom\|user`, rig ordenado) | [contrato] | requiere fuente |
| `finish.reframe` | workflow `reframe` (expansión generativa a 16:9, 9:16, 4:3, 3:4, 1:1, 21:9; **sin 4:5**) | [contrato] | requiere fuente |
| `finish.upscale` | `topaz_video` (1080p/2160p, interpolación), `bytedance_video_upscale` (1080p/2K/4K), `video_upscale` | [contrato] | requiere fuente |
| `finish.deflicker` | `video_deflicker` | [contrato] | requiere fuente |
| `finish.hdr` | `topaz_hyperion_2_5` | [contrato] | requiere fuente |
| `assemble.auto-clips` | `clipify` (desde YouTube, subtítulos, recorte que sigue la cara) | [contrato] | [sin dato] |
| `audio.voice` | workflow `voice_change` | [contrato] | requiere fuente |
| `audio.lipsync` | workflow `dubbing` (18 idiomas, incluye `spa`); **sólo en el MCP:** `sync_so` (lipsync con audio propio) | [contrato] | requiere fuente |
| `pre.reference-analysis` | **sólo en el MCP:** `video_analysis_create` (escena por escena) | [contrato] | [sin dato] |

**Créditos ≠ USD.** El valor del crédito de la suscripción es **[sin dato]**. Comparando el mismo modelo en los dos
carriles, Wan 3.0 720p 5 s cuesta USD 0,50 en fal y 8,75 créditos aquí, y Seedance 2.5 720p 5 s USD 2,31 y 35 créditos:
eso da ≈ USD 0,057–0,066 por crédito **[cálculo indirecto, no medido]**. La cifra real sale de `higgsfield account
transactions` después de la primera corrida (TASK-1986).

🔴 **Lo que la matriz deja a la vista:** de 41 operaciones de producción y post, **una** tiene canario de garantía
(`edit.zone` con cámara quieta). El resto está verificado como mucho a nivel de contrato del endpoint. Las operaciones
de post sin camino propio tienen casi todas un **puente** en el CLI de Higgsfield, pero ninguno corrido. El plan para
cerrarlo es EPIC-051.

---

## 5. Fichas por familia

Cada ficha: qué es · cuándo SÍ · cuándo NO · capacidades y límites · contenido · precio y estimación · comando · trampas · estado · fuentes.

### 5.1 OpenAI GPT Image 2.5 Sunburst / Flare y GPT Image 2 (`pnpm ai:image`)

**Qué es.** Sunburst: "most capable model for image generation and editing", posicionado donde la precisión de edición importa más. Flare: "fastest model for high-quality, everyday image generation", propuesto como opción por defecto. GPT Image 2: generación anterior, no deprecada, bajo "Earlier GPT Image models". Para integraciones nuevas OpenAI recomienda 2.5 [oficial]. Entre Sunburst y Flare la única diferencia de API es `model` y cuestan igual [oficial] [verificado 2026-09-16].

| id | Uso interno recomendado |
|---|---|
| `gpt-image-2.5-sunburst` / `gpt-image-2.5-sunburst-2026-09-08` | Pieza final con edición precisa, inpainting con máscara, multi-turno |
| `gpt-image-2.5-flare` / `gpt-image-2.5-flare-2026-09-08` | Generación cotidiana, iteración rápida, transparente |
| `gpt-image-2` / `gpt-image-2-2026-04-21` | Default del CLI y del runtime; único con Batch API; evitar como elección nueva salvo Batch |

**Cuándo SÍ.** Raster final de marca/UI/editorial; edición localizada con máscara; transparencia nativa; tamaños grandes hasta 3840×2160; layouts e infografías de concepto.
**Cuándo NO.** Vectores (raster siempre) [contrato]; formatos más allá de 3:1 [oficial]; texto final dentro de la imagen ("can still struggle with precise text placement and clarity") [oficial]; consistencia estricta de personaje o marca entre piezas (limitación vigente en la guía) [oficial]; deepfakes de personas reales (violan la política) [oficial].

**Capacidades y límites.**

| Aspecto | 2.5 (Sunburst/Flare) | GPT Image 2 |
|---|---|---|
| Prompt | ≤ 32.000 caracteres [oficial] | igual |
| Imágenes de entrada | ≤ 16, < 50 MB c/u [oficial] [contrato] | igual |
| Formatos de entrada en edits | [sin dato] | [sin dato] |
| Máscara | PNG con alfa, mismas dimensiones y formato que la primera imagen; transparente = editable; guía, no matte exacto [oficial]; el CLI la valida con `sharp` antes de gastar [contrato] | igual |
| `input_fidelity` | No existe [oficial]; el CLI lo **rechaza antes de gastar** desde el 2026-09-27 [contrato] | Se omite [oficial]; también rechazado |
| Tamaños | recomendados `1024x1024`, `1536x1024`, `1024x1536`, `auto`; custom múltiplos de 16, ratio 1:3–3:1, borde ≤ 3840, área 655.360–8.294.400, > 2560×1440 experimental [oficial] | igual + populares 2048×2048, 2048×1152, 3840×2160, 2160×3840 [oficial] |
| Calidad | `low`, `medium`, `high`, `xhigh`, `max`, `auto` [oficial] | `low`, `medium`, `high`, `auto` [oficial] |
| Transparencia | Plena, PNG/WebP [oficial] | Preview [oficial] |
| Formato | PNG/JPEG/WebP en API [oficial]; el CLI acepta `--format png|jpeg|webp` o lo deduce de la extensión de `--out` (png si no hay pista); `transparent` + `jpeg` se rechaza [contrato] | igual |
| Batch API | No [oficial] | Sí, mitad de precio [oficial] |
| Provenance | C2PA + SynthID [oficial] | C2PA; SynthID [sin dato] |
| Rate limits | T1 100.000 TPM/5 IPM · T2 250.000/20 · T3 800.000/50 · T4 3.000.000/150 · T5 8.000.000/250 [oficial] | igual [oficial] |
| ZDR | [sin dato] | [sin dato] |
| Tope de `n` por request | [sin dato]; el helper lo fija en 1 [contrato] | igual |

**Políticas de contenido.** Moderación de entrada y salida; error `moderation_blocked` con `moderation_details`: no reintentes sin cambiar el prompt [oficial]. `moderation` `auto|low` existe en API [oficial] pero el CLI no tiene flag [contrato]. System card 2.5: la mejora en "unsafe presented" no es estadísticamente significativa y "Abuse" empeora vs 2.0 [oficial]. Puede exigirse API Organization Verification [oficial]. Política específica de marcas para 2.5: no publicada [oficial, ausencia]. Regla interna: nunca reproducir un trademark, salvo logos de cliente bajo TASK-999 [decisión].

**Precio y estimación antes de gastar.**
Tarifas por 1M tokens (Standard), iguales para las tres: imagen entrada 8,00 · imagen en caché 2,00 · **imagen salida 30,00** · texto entrada 5,00 · texto en caché 1,25. Batch sólo `gpt-image-2`: imagen 4,00/1,00/15,00; texto 2,50/0,625 [oficial, pricing 2026-09-16].

Fórmula oficial de tokens de salida (calculadora de la guía de OpenAI, cubre 2.5 aunque la ficha de 2.5 todavía diga que no: **contradicción oficial vigente**; la fórmula reproduce exactamente las 7 mediciones del repo: 196 / 1.756 / 7.024 tokens en `low` / `high` / `max` a 1024²) [oficial] [verificado 2026-09-16]:

```text
G (lado largo en celdas):
  gpt-image-2   → low 16 · medium 48 · high 96
  gpt-image-2.5 → low 16 · medium 24 · high 48 · xhigh 64 · max 96
lado_corto     = redondeo(G / (lado_mayor_px / lado_menor_px))     # .5 redondea a par
tokens_salida  = ceil(G × lado_corto × (2.000.000 + ancho × alto) / 4.000.000)
costo_salida   = tokens_salida × 30 / 1.000.000
costo_total    = costo_salida + tokens_imagen_entrada × 8 / 1.000.000 + tokens_texto × 5 / 1.000.000
```

Equivalencias: 2.5 `high` = GPT Image 2 `medium`; 2.5 `max` = GPT Image 2 `high` en tokens [cálculo]. `auto` no es estimable [oficial].

Costo de salida por imagen (USD) [cálculo sobre la fórmula; coincide con la tabla oficial de GPT Image 2]:

| Calidad | 1024×1024 | 1536×1024 / 1024×1536 | 2048×1152 | 2048×2048 | 3840×2160 |
|---|---:|---:|---:|---:|---:|
| 2.5 `low` / GPT Image 2 `low` | 0,0059 | 0,0047 | 0,0047 | 0,0119 | 0,0111 |
| 2.5 `medium` | 0,0132 | 0,0103 | 0,0110 | 0,0268 | 0,0260 |
| 2.5 `high` = GPT Image 2 `medium` | 0,0527 | 0,0412 | 0,0424 | 0,1070 | 0,1001 |
| 2.5 `xhigh` | 0,0937 | 0,0738 | 0,0753 | 0,1903 | 0,1779 |
| 2.5 `max` = GPT Image 2 `high` | 0,2107 | 0,1646 | 0,1695 | 0,4282 | 0,4003 |

- Un tamaño no cuadrado mayor puede costar menos que uno menor (2048×1152 `low` = 157 tokens < 1024² = 196) [oficial] [cálculo].
- **Editar no abarata:** la imagen base suma ~1.024 tokens de entrada a 1024²; editar = 2,3× generar en `low`, ~1,15× en `high`, ~1,04× en `max`; la máscara no cambia el `usage` [verificado 2026-09-16, Flare `low`].
- Transparente no cuesta extra [verificado 2026-09-16].
- `partial_images` suma 100 tokens de salida cada una [oficial]; el helper no lo permite [contrato].
- El CLI imprime `usage` (tokens de entrada imagen/texto, salida, total) por pieza [contrato]: úsalo para validar tu estimación después.
- `--count N` = **N pedidos pagados** secuenciales; el CLI lo avisa (`⚠ --count N: son N pedidos separados…`) [contrato].
- **Estimación del CLI (desde 2026-09-16, commit `17196ead1`):** antes de pedir, `ai:image` imprime `$ costo estimado ≈ USD X (N × tokens × USD 30/1M; la entrada suma aparte)` con esta misma fórmula. No estima con `--size auto` ni con modelos sin grilla publicada, y **no pide confirmación**: sólo informa [contrato].

**Comandos.**

```bash
# Generación cotidiana (Flare, high, horizontal)
pnpm ai:image --prompt "<descripción>" --model gpt-image-2.5-flare --quality high --size 1536x1024 --out ai-generations/2026-09-16_mi-pieza/kv.png

# Pieza final con edición precisa (Sunburst, xhigh)
pnpm ai:image --image base.png --prompt "<qué cambia + qué debe quedar idéntico>" --model gpt-image-2.5-sunburst --quality xhigh --out ai-generations/2026-09-16_mi-pieza/kv-final.png

# Inpainting: máscara canónica + recomposición y verificación automáticas (TASK-1965)
pnpm ai:mask --base base.png --rect 0.33,0.42,0.67,0.72 --feather 24 --out mask.png
pnpm ai:inpaint image --image base.png --mask mask.png --prompt "<qué va en la zona>" --run ai-generations/2026-10-02_mi-pieza   # Flare medium por defecto
# (pnpm ai:image --mask sigue existiendo, pero no recompone ni verifica: el modelo redibuja toda la imagen)

# Fondo transparente
pnpm ai:image --prompt "<objeto aislado>" --model gpt-image-2.5-flare --quality high --size 1024x1024 --background transparent --out ai-generations/2026-09-16_mi-pieza/icono.png

# Lote desde JSON [{ "filename": "a.png", "prompt": "<texto>" }] (API normal, sin descuento Batch)
pnpm ai:image --batch conceptos.json --model gpt-image-2.5-flare --quality medium --out-dir ai-generations/2026-09-16_lote

# Recorte de fondo local de una imagen existente (sin costo)
pnpm ai:image:rmbg
```

Flags reales de `ai:image` [contrato]: `--prompt`, `--prompt-file`, `--batch`, `--image` (repetible), `--mask`, `--input-fidelity`, `--out`, `--out-dir`, `--concept`, `--task`, `--size`, `--quality`, `--background`, `--format`, `--model`, `--count`, `--timeout` (default 280000 ms), `--open`, `--help`. Defaults: `gpt-image-2` · `1536x1024` · `high` · `opaque` · `public/images/generated`.

**Trampas.** 🔴 **Sunburst con `--mask` devuelve la zona totalmente editable como un PANEL NEGRO PLANO** [verificado 3 de 3: 2026-09-23 y dos pasadas el 2026-10-02 con máscara de RGB negro y con el RGB de la imagen bajo el alfa]; Flare, con la misma máscara y el mismo prompt, colocó el objeto. `pnpm ai:inpaint image` usa Flare por defecto, edita con Sunburst sin máscara (`--provider-mask auto`) y marca `suspectFlatPanel` si la salida cruda vuelve negra. 🔴 **`--mask` no sirve para MOVER material que ya está en la foto** [verificado 2026-09-23]: sobre una franja de primer plano oscuro y desenfocado (subir el lecho de un plate), Sunburst llenó toda la zona transparente con un panel plano de borde superior recto justo en el límite de la máscara y borró el apoyabrazos que había en ella, aunque el prompt pedía conservar lo que quedaba sobre el nuevo borde; los dos candidatos, igual: se lee como un velo. Para desplazar material fotográfico existente no uses inpainting generativo: mueve los píxeles de la propia foto (caso y script: `ai-generations/2026-09-23_v07-lecho-04-elegida/`). Ver §8.1: `--count` = N pedidos pagados; `--input-fidelity` rechazado antes de gastar (desde 2026-09-27); sin `--moderation`; default de salida en `public/`. Ya no son trampas (commit `17196ead1`): `--size` se valida en local (2/2.5: `auto` o WxH múltiplos de 16, borde ≤ 3840, relación ≤ 3:1, área 655.360–8.294.400; 1.5/1/mini: sólo `1024x1024`, `1536x1024`, `1024x1536` o `auto`), `--background` se valida y existe `--format`. Deprecaciones de modelos anteriores que el CLI aún acepta: `gpt-image-1` retira 2026-10-23; `gpt-image-1.5` y `gpt-image-1-mini` 2026-12-01 [oficial].

🔴 **`pnpm ai:inpaint image` con Sunburst NO sirve para retocar la piel de una cara** [verificado 2026-10-02, 2 corridas, `ai-generations/2026-10-02_login-escenario/piel/inpaint/`]. Plates de 3840×2160, máscara de cara, orejas y cuello (4–7 % del cuadro), prompt que pide re-renderizar **sólo** la piel; el pipeline recortó con contexto (1488×1168 y 1200×1008, ≈ USD 0,05 cada una) y editó sin enviar máscara (`providerMaskSent: false`). Run `e29414c20458`: PASS, zona protegida idéntica, pero la zona cambió poco (`editedMeanDelta` 10,4/255): la piel siguió viéndose IA. Run `fdd790982b85`: el modelo **reencuadró** (dx −6 px, escala 0,98, `suspectMisaligned`; el pipeline marcó REVISAR, salida 3). La piel de un personaje se resuelve en su **retrato ancla** antes de la escena, no retocando la foto terminada (método: [casebook cine, escenario del login](../operations/brand-photography/EFEONCE_PHOTO_CINE_CASEBOOK_V1.md#escenario-del-login-de-greenhouse-2026-10-02--lo-que-aprendimos)). Flare (el default de `ai:inpaint`) sobre piel no se probó [sin dato].
🔴 **Resolución de una escena con personas: 2560×1440, no 3840×2160** [verificado 2026-10-02, una sola corrida; que la causa sea la resolución no se aisló: sin dato]. La misma ficha con Sunburst `high`: a **3840×2160** (sobre 2560×1440, zona experimental) la cara de un personaje de casting salió con microtextura craquelada y la punta de la nariz más ancha y brillante que su retrato ancla; regenerada a **2560×1440** (el máximo no experimental) salió fina (`LG2d` → `LG2e`, `revision/LG2d-vs-LG2e-cara.jpg`). Coincide con lo ya medido en retratos: más resolución no es más fidelidad, el modelo inventa poro que la referencia no tiene (`.claude/rules/brand-photography.md`, «Realismo NO es castigo»).

**Estado.** Conectados. Línea base de consumo 2.5 medida 2026-09-16 (7 piezas 1024²) [verificado]; canary transparente GPT Image 2 2026-08-21 [verificado].
**Fuentes.** O1–O8 (§12).

---

### 5.2 Seedream 5.0 Pro, Pro Edit, Pro Layerize, Lite, Lite Edit (`pnpm ai:fal`)

**Qué es.** Seedream 5.0 Pro (ByteDance Seed, lanzado 2026-07-08): generación de alta precisión con control de posición y elementos; mejoras declaradas en infografías/texto denso, edición de precisión, realismo de retrato y multilingüe nativo [oficial]. Seedream 5.0 Lite: generación rápida de calidad para publicidad creativa [oficial fal]; fecha de lanzamiento [sin dato] (terceros en conflicto).

| id | slug | Uso |
|---|---|---|
| `seedream5-pro` | `bytedance/seedream/v5/pro/text-to-image` | Materialidad, atmósfera, desarrollo de look |
| `seedream5-pro-edit` | `bytedance/seedream/v5/pro/edit` | Edición semántica regional y fusión de hasta 10 referencias |
| `seedream5-pro-layerize` | `bytedance/seedream/v5/pro/layerize` | Descomposición en capas editables |
| `seedream5-lite` | `bytedance/seedream/v5/lite/text-to-image` | Divergencia barata, lotes, series |
| `seedream5-lite-edit` | `bytedance/seedream/v5/lite/edit` | Edición barata por referencia |

**Cuándo SÍ.** Look development, materialidad y luz; exploración masiva barata (Lite); fusión multirreferencia; formatos extremos (aspecto 1/16–16); separar una pieza en capas (único); texto multilingüe de concepto.
**Cuándo NO.** Proteger píxeles fuera de una zona (sin máscara en fal) [contrato] [verificado]; transparencia (no expuesta en fal) [contrato]; reproducibilidad (sin seed de entrada) [contrato]; resolución mayor a 2048² con **Pro** [contrato]; vectores.

**Capacidades y límites.**

| Aspecto | Pro T2I | Pro Edit | Pro Layerize | Lite T2I | Lite Edit |
|---|---|---|---|---|---|
| Prompt | requerido | requerido | **opcional**; acepta `<bbox>l t r b</bbox>` 0–1000 | requerido | requerido |
| Referencias | — | hasta 10 (más → el CLI lo rechaza en local) | 1 imagen png/jpeg 512²–6000², ≤ 30 MB, aspecto 1/16–16 | — | hasta 10 en fal |
| Tamaño | enum `square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9, auto_1K, auto_2K` o WxH; área 1024²–2048²; default `auto_2K` | igual | `auto`, `auto_1K`, `auto_1.5K`, `auto_2K` | enum + `auto_2K/3K/4K`; área 2560×1440–4096² (ficha: 3072²); reescala solo si no cumple | igual que Lite |
| Formato | **jpeg (default)** \| png | igual | capas PNG con alfa | PNG | PNG |
| Imágenes por pedido | `num_images` 1–6 (`--count`) | igual | base + ≤ 16 capas con `name`, `description`, `z_index`, `bounding_box` | `num_images` 1–6 × `max_images` 1–6 | igual |
| Seed | ni entrada ni salida | igual | — | devuelve seed; sin entrada | igual |
| Máscara / transparencia | No | No | Alfa por capa | No | No |
| Marca de agua | fal no la expone; si la aplica [sin dato] | — | — | — | — |

Todo [contrato] (OpenAPI de fal 2026-09-16), salvo la ficha de Lite [oficial]. ModelArk (ByteDance directo) documenta capacidades de Pro que fal **no expone**: fondo transparente en imagen a imagen, edición por `<point>`/`<bbox>` y trazos, 1.5K al precio de 1K [oficial]; si fal respeta `<point>`/`<bbox>` en Pro Edit vía prompt [sin dato].

**Políticas de contenido.** Safety checker activo por defecto; apagarlo exige autorización de cuenta [oficial]. Rechazos por marcas o personas reales en Seedream **imagen**: [sin dato] (los dos rechazos medidos son de Seedance video, en casos puntuales). Licencia: Lite "Commercial use permitted under partner agreement" [oficial]; Pro [sin dato].

**Precio y estimación** [oficial, fichas fal 2026-09-16]:

| Endpoint | Precio | Estimar |
|---|---|---|
| Pro T2I | 0,0675 por imagen con área ≤ 1536² · 0,135 entre 1536² y 2048² ("tentative pricing") | `imágenes × tarifa del área`; `auto_2K` cae en el escalón alto [cálculo] |
| Pro Edit | igual por salida + 0,0045 por referencia adicional (la primera gratis) | `salidas × tarifa + (refs − 1) × 0,0045` |
| Pro Layerize | 0,03375 por capa (área < 1536²) · 0,0675 por capa (> 1536²) | 8 capas + base a 2K ≈ 0,61 [cálculo]; la base se cobra como una capa [verificado 2026-10-03] |
| Lite T2I / Edit | 0,035 por imagen | `num_images × max_images efectivas × 0,035` |

fal no devuelve `usage` y el CLI no reporta costo [contrato]. Referencia directa ModelArk: Pro ≈ 0,045/0,09 [tercero, sin fecha verificada] → fal ≈ 1,5× [cálculo].

**Comandos.**

```bash
# Look development (Pro); la extensión .png pide PNG (Pro entrega JPEG por defecto)
pnpm ai:fal --capability seedream5-pro --prompt "<materialidad, luz, atmósfera>" --size 2048x1152 --out ai-generations/2026-09-16_mi-pieza/look.png

# Exploración barata: 4 imágenes Lite
pnpm ai:fal --capability seedream5-lite --prompt "<territorio>" --size auto_2K --count 4 --out-dir ai-generations/2026-09-16_mi-pieza/lite

# Serie relacionada (max_images por --input)
pnpm ai:fal --capability seedream5-lite --prompt "<serie de 4 piezas coherentes>" --input '{"max_images":4}' --out-dir ai-generations/2026-09-16_mi-pieza/serie

# Edición con referencias (la primera es el ancla)
pnpm ai:fal --capability seedream5-pro-edit --image ancla.png --image material.png --prompt "<qué cambia; conserva todo lo demás>" --out ai-generations/2026-09-16_mi-pieza/edit.png

# Capas editables
pnpm ai:fal --capability seedream5-pro-layerize --image kv.png --out-dir ai-generations/2026-09-16_mi-pieza/capas

# Capas con escalón y modo rápido
pnpm ai:fal --capability seedream5-pro-layerize --image kv.png --size auto_2K --input '{"enhance_prompt_mode":"fast"}' --out-dir ai-generations/2026-09-16_mi-pieza/capas
```

**Trampas.** Pro cobra 0,0045 por cada `--image` adicional en edit; `--size`/`--count` no validados contra el contrato de imagen; sin flags para `max_images`, `enhance_prompt_mode` ni `enable_safety_checker` (usar `--input`) [contrato]. Slug sin prefijo `fal-ai/`: con prefijo equivocado responde 200 y el resultado da 404 [verificado]. Resuelto en el CLI el 2026-09-16 (commit `17196ead1`): Pro deriva `output_format` de la extensión de `--out` (`.png` → png, `.jpg`/`.jpeg` → jpeg, otra → error local) y, al descargar, detecta el formato por los bytes y corrige la extensión con aviso; `--format` en Lite se rechaza (Lite entrega PNG); `--seed` se rechaza en todo Seedream; más de 10 `--image` se rechaza en local [contrato]. El registro dice "Hasta 4K según el proveedor" para Pro era **incorrecta**: el tope es 2048²; la nota del registro se corrigió el 2026-09-16 [contrato].

**Como editor dentro de `pnpm ai:inpaint`** (sin máscara: edita por instrucción y el pipeline recompone). Lite Edit dejó una costura visible en la pared (re-renderiza la superficie con otro tono) e ignoró `image_size` (entregó 2880×1920) [verificado 2026-10-02]. Pro Edit, al borrar una taza, pasó la verificación pero dejó un **fantasma tenue del asa** que el detector de residuo no ve, USD 0,068 [verificado 2026-10-03]. Para borrar, usa el clean plate o Sunburst (§2.2).

**Estado.** Las 5 verificadas 2026-09-16 (una corrida cada una); laboratorio híbrido 2026-07-18 [verificado].
**Fuentes.** B1–B9 (§12).

---

### 5.3 Seedance 2.5 (`seedance25-t2v`, `seedance25-i2v`, `seedance25-r2v`)

**Qué es.** Sucesor de Seedance 2.0 con arquitectura conjunta audio-video, 30 s en una pasada y hasta 50 referencias multimodales [oficial fal]. Presentado 2026-06-23, lanzado 2026-07-31 en Jimeng/Doubao [tercero]; llegada a fal [sin dato]. "~20 % mejor adherencia" según ByteDance [oficial].

**Cuándo SÍ.** Toma hero realista sostenida; tomas de 15 a 30 s; muchas referencias (30/10/10); **editar** (`--task editing`) o **extender** (`--task extension`) un video, también con personas o marcas, presupuestando el posible rechazo (ver **Contenido**); diálogo con lip sync (entre comillas) [oficial].
**Cuándo NO.** Ir directo al final con personas reales o marcas/logotipos sin una prueba corta y a baja resolución: el rechazo, si llega, es tras encolar y **cobrado** [verificado 2026-09-16] (riesgo puntual, ver **Contenido**); 4K (techo 1080p, no verificado) [contrato]; multi-shot con cortes (se vende como toma continua) [oficial]; texto fino, geometría exacta de producto, objetos pequeños persistentes [tercero]; prompts que acumulan cámara + caminata + gestos + luz + dos hablantes (el lip sync pierde prioridad) [tercero].

**Capacidades y límites** [contrato salvo indicación].
- Duración 4–30 s o `auto` (texto). Resolución 480p/720p/1080p. Aspecto `auto, 21:9, 16:9, 4:3, 1:1, 3:4, 9:16`. `--bitrate`. Audio apagable (`--no-audio`). 24 fps [oficial].
- i2v: `--image` + `--end-image` opcional.
- r2v: hasta 30 imágenes; 10 videos (cada uno 1,8–30,2 s, ≤ 200 MB, 300–6000 px por lado, 24–60 fps; suma ≤ 30,2 s); 10 audios (1,8–30,2 s, ≤ 15 MB; suma ≤ 30,2 s); 50 archivos. Referencia visual obligatoria. Se citan como `@Image1`, `@Video1`, `@Audio1`.
- `--task reference` (default, el video guía) · `editing` (fuerza duración y aspecto a auto; el CLI rechaza `--duration`/`--aspect`) · `extension` (fuerza aspecto a auto; el CLI rechaza `--aspect`). `editing`/`extension` exigen `--video`.
- `seed` sólo existe en 2.5 r2v ("puede variar levemente") [contrato].
- **1080p: contradicción.** El OpenAPI lo ofrece y fal lo cobra (~1,164/s), pero la tabla de resoluciones de la ficha lista sólo 480p/720p [oficial]; prensa dice 4K nativo 10 bits [tercero]; otros terceros dicen tope nativo 720p y 1080p reescalado [tercero]. Nuestras corridas fueron a 480p [verificado]. **1080p de 2.5: ENTREGA verificada [2026-09-22], nitidez nativa sin dato.** Dos corridas a 1080p devolvieron 1080×1920. Falta comparar detalle contra 720p para saber si es nativo o reescalado — eso sí se hace con una prueba de 5 s, no con la toma hero.
- Capacidades anunciadas que fal **no** expone: referencias de modelos 3D blancos, edición local de zonas, video largo beta hasta 3 min, color 10 bits [tercero].

**Contenido.** Filtros de rostros, marcas de agua C2PA y detección de personajes con copyright [tercero]. Rechazo medido con `422 content_policy_violation` / `partner_validation_failed` **después de encolar, cobrado**: isotipo Efeonce ("potential copyright violation") y video de barista ("likenesses of real people") [verificado 2026-09-16]. **No es un filtro sistemático:** las mascotas 3D de partner pasaron sin rechazo [operador, 2026-09-22] y el operador ha producido en fal videos con Seedance con personas y marcas reales sin problema [operador, 2026-10-04]; qué dispara el rechazo: [sin dato]. Con personas o marcas: probar primero corto y a baja resolución, presupuestar el intento cobrado y tener Flux 3 / Wan 3.0 como alternativa si rechaza. Uso comercial "Commercial use", estado Partner [oficial]; derechos de ByteDance sobre la salida [sin dato].

**Precio y estimación.**

```text
tokens = alto × ancho × segundos × 24 / 1024          [oficial fal]
costo  = tokens × 0,0214 / 1000                        [contrato, 2.5]
```

La fórmula calza con lo medido dentro de ~5 % [verificado 2026-09-16, ver §5.4]. **No uses la equivalencia de OpenArt** (54.000 tokens por 5 s a 720p): subestima ~2×. Precio por segundo publicado: 480p ≈ 0,2205 · 720p ≈ 0,4730 · 1080p ≈ 1,164; con videos de referencia en r2v el precio baja (720p ≈ 0,2838/s; 480p ≈ 0,1323/s) y **la duración del video de entrada cuenta para el cobro** [oficial]. `auto`: el largo lo decide el modelo, así que el costo no es estimable con exactitud [cálculo].

**Comandos.**

```bash
# Hero desde imagen, 720p vertical
pnpm ai:fal --capability seedance25-i2v --image plate.png --prompt "<movimiento de cámara y acción>" --duration 8 --resolution 720p --aspect 9:16 --out ai-generations/2026-09-16_mi-pieza/sd25-hero.mp4

# Desde texto, toma larga
pnpm ai:fal --capability seedance25-t2v --prompt "<escena continua>" --duration 20 --resolution 720p --aspect 16:9 --out ai-generations/2026-09-16_mi-pieza/sd25-larga.mp4

# Referencias multimodales
pnpm ai:fal --capability seedance25-r2v --image personaje.png --image producto.png --audio musica.mp3 --prompt "@Image1 sostiene @Image2 al ritmo de @Audio1" --duration 10 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/sd25-r2v.mp4

# Editar un clip (sin --duration ni --aspect)
pnpm ai:fal --capability seedance25-r2v --task editing --video clip.mp4 --prompt "Cambia @Video1 a <nuevo estilo>, conserva la acción" --out ai-generations/2026-09-16_mi-pieza/sd25-edit.mp4

# Extender un clip (sin --aspect)
pnpm ai:fal --capability seedance25-r2v --task extension --video clip.mp4 --prompt "Continúa @Video1: <qué pasa después>" --duration 8 --out ai-generations/2026-09-16_mi-pieza/sd25-extension.mp4
```

**Trampas.** Rechazo de contenido cobrado cuando ocurre (puntual, condiciones [sin dato]); r2v reference > 15 min de latencia (usa `--detach`) [verificado]; `--seed` sólo lo acepta `seedance25-r2v`; en t2v/i2v (y en 2.0) el CLI lo rechaza en local desde 2026-09-16 [contrato]. Con `--duration auto` o sin `--duration`, la estimación previa usa el máximo del contrato (30 s en 2.5): pasa `--duration` para que no te pida `--yes` de más [contrato].
**Estado.** Las 3 verificadas 2026-09-16 (480p); `editing` y `extension` verificadas [verificado].
**Fuentes.** V1, V2, V32–V38, R1 (§12).

---

### 5.4 Seedance 2.0 base, fast, mini, us

**Qué es.** 2.0 (febrero 2026 [tercero]; API en fal 2026-04-09 [oficial]). **base**: "renders finales de producción"; **fast**: menor latencia y costo, "Output quality: Same" según fal [oficial]; **mini**: versión más rápida y barata (2026-06-15 [tercero]); **us**: "US hosted version" [oficial].

| Variante | ids | Techo | Bitrate | Precio por 1.000 tokens [contrato] | Cuándo |
|---|---|---|---|---|---|
| base | `seedance20-t2v`, `-i2v`, `-r2v` | **4K** [verificado] | Sí | 0,014 | Única ruta 4K conectada |
| fast | `seedance20-fast-t2v`, `-i2v`, `-r2v` | 720p | Sí | 0,0112 | Final 720p más barato que base, misma calidad declarada |
| mini | `seedance20-mini-t2v`, `-i2v`, `-r2v` | 720p | **No** | 0,007 | Exploración Seedance más barata (OpenArt 1033 vs 1044 base) [tercero] |
| us | `seedance20-us-t2v`, `-i2v`, `-r2v` | 720p | Sí | 0,0168 (+20 %) | **Sólo** si un cliente exige procesamiento en EE. UU. [oficial] |

**Cuándo SÍ.** 4K (base); multi-shot con cortes dentro de una generación de hasta 15 s [oficial]; transición primer/último cuadro; exploración barata con look Seedance (mini).
**Cuándo NO.** Más de 15 s; editar o extender (r2v 2.0 **no** tiene `--task`: el video sólo guía) [contrato]; ir directo al final con personas reales o marcas sin prueba corta (mismo riesgo que 2.5: dos rechazos cobrados medidos [verificado 2026-09-16]; prensa dice que ByteDance no acepta rostros humanos realistas como origen y bloquea copyright en sus canales empresariales [tercero], pero el operador ha producido en fal con personas y marcas reales sin problema [operador, 2026-10-04]); `us` por calidad.

**Capacidades y límites** [contrato]. Duración 4–15 s o `auto`. Resolución base 480p/720p/1080p/4k; fast/mini/us 480p/720p. Aspecto como 2.5. r2v: 9 imágenes, 3 videos (suma 2–15 s, < 50 MB, ~480p–720p), 3 audios (suma ≤ 15 s), 12 archivos; referencia visual obligatoria. `--end-image` en i2v. 24 fps. Lip sync en 8+ idiomas [tercero]. La ficha de fal de 2.0 dice "hasta 720p", desactualizada frente al OpenAPI y la corrida 4K [oficial] [verificado]; si el 4K es nativo o reescalado [sin dato]. Términos de residencia de `us` [sin dato].

**Precio y estimación.** Misma fórmula de tokens que 2.5 con la tarifa de la variante. Validación [verificado 2026-09-16, gasto real cuenta B]:
- 3 × `seedance20-fast` 864×496 × 4,13 s → **1,39 calculado vs 1,37 medido**.
- 3 × `mini` 4 s 480p → 0,82 calculado vs 0,85 medido.
- Tanda 2.0 base i2v + r2v (4,06 s) + 2 Wan 480p de 2 s → 1,33 calculado vs 1,37 medido.

Por segundo: base 720p 0,3024 [oficial], 480p ≈ 0,141, 1080p ≈ 0,685, **4K ≈ 2,72** [cálculo: 3840×2160×24/1024 = 194.400 tokens/s]; fast 480p ≈ 0,1125, 720p 0,2419; mini 480p ≈ 0,0721, 720p ≈ 0,1547; us 480p 0,1731, 720p 0,37 [oficial].

**Comandos.**

```bash
# 4K (base)
pnpm ai:fal --capability seedance20-i2v --image plate-4k.png --prompt "<movimiento>" --duration 5 --resolution 4k --aspect 16:9 --out ai-generations/2026-09-16_mi-pieza/sd20-4k.mp4

# Exploración barata (mini, 480p)
pnpm ai:fal --capability seedance20-mini-t2v --prompt "<escena>" --duration 4 --resolution 480p --aspect 16:9 --out ai-generations/2026-09-16_mi-pieza/sd20-mini.mp4

# Final 720p económico (fast)
pnpm ai:fal --capability seedance20-fast-i2v --image plate.png --end-image final.png --prompt "<transición>" --duration 6 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/sd20-fast.mp4

# Referencias (el video sólo guía)
pnpm ai:fal --capability seedance20-r2v --image personaje.png --video movimiento.mp4 --prompt "@Image1 se mueve como @Video1" --duration 8 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/sd20-r2v.mp4
```

**Trampas.** `--bitrate` en mini lo rechaza el CLI [contrato]; `--task` en 2.0 lo rechaza el CLI [contrato]; rechazo de contenido cobrado cuando ocurre (puntual, condiciones [sin dato]) [verificado 2026-09-16].
**Estado.** Las 12 verificadas 2026-09-16 [contrato].
**Fuentes.** V3–V6, V34, V39, V43–V46 (§12).

---

### 5.5 Minimax H3 (Hailuo 3.0): base, Max, Max Turbo, camera-controls, LoRA, entrenadores, Director

**Qué es.** H3 base: modelo omni-modal de MiniMax lanzado 2026-07-31, video con audio estéreo nativo, multi-shot nativo; fortalezas oficiales: seguimiento de instrucciones, **texto y marca precisos**, transferencia de movimiento; debilidad oficial: "el detalle visual aún puede mejorar" [oficial]. **H3 Max**: post-entrenamiento hecho por **fal Research** (no por MiniMax), publicado 2026-08-27; fal afirma #1 en su evaluación humana y 5 s en < 3 s [oficial]. **H3 Max Turbo**: descrito por fal con el mismo texto que Max; diferencia técnica [sin dato] [oficial].

| Variante | ids | Resolución [contrato] | Expansión de prompt [contrato] | Registro [contrato] → publicado [oficial] |
|---|---|---|---|---|
| base | `h3-t2v`, `h3-i2v`, `h3-r2v` | 480P/768P nativos · 2K/4K **reescalados desde 768P** | Opcional: `disabled|fast|balanced|quality` | 0,05/s → 480P 0,05 · 768P 0,06 · **2K 0,13** (default del proveedor; el CLI envía 480P si omites `--resolution`) · 4K 0,16 |
| Max | `h3max-t2v`, `h3max-i2v`, `h3max-r2v` | 480P/768P nativos · 1080P refinado desde 768P | **Obligatoria** `disabled|balanced|quality` (CLI envía `balanced`) | 0,025/s → 480P 0,025 · 768P 0,04 (default del proveedor) · 1080P 0,08 ("50% off": promo o lista [sin dato]) |
| camera | `h3max-camera` | 480P/768P/1080P | Obligatoria | 0,025/s; escalones [sin dato] |
| Max Turbo | `h3turbo-t2v`, `h3turbo-i2v` | 480P/768P/1080P | Obligatoria | 0,0125/s → 768P 0,02 (promo 0,01) · 1080P 0,04 (promo 0,02); 480P no listado → **medir** |
| LoRA | `h3-t2v-lora`, `h3-i2v-lora`, `h3-r2v-lora` | como base | Opcional | 0,0625/s; escalones [sin dato] |
| Director | `h3max-director` | [sin dato] | — | 0,08/s lista · 0,02 promo · 1080p 2× · mínimo 1,20 por sesión |

**Cuándo SÍ.** Exploración masiva y rápida (Turbo, 2,7–8 s [verificado]); imagen a video con audio (H3 Max #1 en AA [tercero]); control de cámara real sobre una escena congelada (`h3max-camera`); texto o marca dentro del video de concepto (declarado [oficial]); precio bajo por segundo a baja resolución.
**Cuándo NO.** 4K "real" (reescalado) [contrato]; necesitas silencio (sin toggle de audio) [contrato]; prompt literal en Max/Turbo (expansión obligatoria) [contrato]; lip sync en rostros no humanos, timing fino de audio (terceros reportan desincronía y parpadeo) [tercero]; reutilizar salidas como dataset de entrenamiento sin revisar licencia (ver contenido).

**Capacidades y límites** [contrato].
- Duración entera 5–15 s. Resolución en **MAYÚSCULAS** (`480P`, `768P`, `2K`, `4K`, `1080P`).
- i2v **sin** `--aspect` (encuadre del medio de entrada); `--end-image` opcional.
- r2v: 9 imágenes, 3 videos, 3 audios; aspecto `adaptive` + ratios. 🔴 **`h3max-r2v` SÍ acepta `--aspect`, y SIN él devuelve 1920×1080 HORIZONTAL aunque las cuatro referencias sean verticales** — el «sin aspect ratio» del registro vale sólo para `-i2v`. Y **`--aspect adaptive` NO adopta el ratio de las referencias**: con referencias de 1152×1440 devolvió 1920×1080. Pasa siempre el ratio explícito (`9:16`, `3:4`, `1:1`); descubrirlo costó dos tomas. [verificado 2026-09-22]
- camera: `--camera-trajectory` JSON con ≤ 12 keyframes `{distance, elevation, azimuth, time}`; `elevation` −90..90, `time` 0..1 (el CLI valida ambos); unidades de `distance` y rango de `azimuth` [sin dato]; prompt opcional; guía oficial: empezar y terminar en el encuadre original, luz y focal sin cambios [oficial].
- Audio 48 kHz estéreo, 24 fps [oficial].
- LoRA: `--lora <path|url|repo HF>[@<escala 0–4>][#<weight_name>]`, hasta 3; `weight_name` elige el archivo de pesos dentro de un repo de Hugging Face [contrato].
- Entrenadores (`h3-train-t2v`, `h3-train-i2v`, `h3-train-flf2v`, `h3-train-ref2va`): `--training-data` zip, `--steps` (default 2000; contrato 1–15000, página 1–6000: **contradicción**, [sin dato] cuál rige), `--rank 8|16|32|64|128` (default 32), `--learning-rate` (default 2e-4), `--trigger`. Condicionamiento: i2v primer cuadro 0.5; flf2v primero 0.2 · último 0.2 · ambos 0.4; ref2va referencia 0.9 y puede retomar desde una LoRA [contrato]. Datos oficiales del entrenador t2v: mínimo 10 clips recomendados, 20–50 rinden mejor; **captions obligatorias** (`.txt` con el mismo nombre por clip, o `trigger_phrase` de respaldo); **clips de menos de 73 cuadros (~3 s) se descartan en silencio** salvo `auto_scale_input`; entrena video+audio (`t2va`) [oficial]. `--frames <n>` → `number_of_frames` (22–124 y `% 17 == 5`: 22, 39, 56, 73, 90, 107, 124) y `--split-threshold <s>` → `split_input_duration_threshold` (1–60 s, default 30); el CLI valida ambas reglas también si llegan por `--input`, y avisa si pides menos de 100 steps (mínimo facturable) [contrato]. Con `split_input_into_scenes`, ref2va descarta los sidecars de referencia de clips partidos [contrato]. Diferencias reales entre entrenadores más allá del condicionamiento [sin dato].
- Director: stream realtime (AsyncAPI) con prompt, primer y último cuadro y audio objetivo; **no operable por cola**, el CLI se detiene [oficial] [contrato].

**Contenido y licencia.** `enable_safety_checker` default true, sin flag [contrato]. fal rotula H3 "Commercial use" [oficial]. Pesos abiertos H3-Base bajo licencia comunitaria propia: reportan obligación de mostrar "MiniMax H3", autorización sobre USD 20 M de ingresos, **prohibición de usar H3 o sus salidas para entrenar otro modelo** y exclusión territorial (UE, Reino Unido, Corea, EE. UU.) para despliegue local [tercero]; si alcanza a salidas de la API de fal [sin dato]. H3 Max es de fal, relevante para derechos [oficial].

**Precio y estimación.**
- Video: `segundos × tarifa publicada del escalón pedido`. Usa la **publicada**, no la del registro: H3 base a 2K cuesta 2,6× el registro [oficial]. Para Turbo, ninguna cifra calza con el registro: mide con `--balance` antes y después de una corrida aislada.
- Entrenamiento: `max(steps, 100) × tarifa` → t2v 0,005 · i2v/flf2v 0,01 · ref2va 0,015. Piso: t2v **0,50**, i2v/flf2v 1,00, ref2va 1,50; 2000 steps = 10 / 20 / 20 / 30 [oficial] [cálculo]. **El plan anterior "10 steps ≈ USD 0,40" es falso** (corrección 2026-09-16).
- Director: mínimo 1,20 por sesión [oficial].

**Comandos.**

```bash
# Exploración Turbo 480P, 5 s
pnpm ai:fal --capability h3turbo-t2v --prompt "<escena y acción>" --duration 5 --resolution 480P --aspect 9:16 --out ai-generations/2026-09-16_mi-pieza/h3-turbo.mp4

# Max desde imagen con último cuadro (sin --aspect)
pnpm ai:fal --capability h3max-i2v --image inicio.png --end-image final.png --prompt "<transición>" --duration 6 --resolution 768P --out ai-generations/2026-09-16_mi-pieza/h3max-i2v.mp4

# Max con referencias (ratio SIEMPRE explícito: sin él, y también con `adaptive`, sale 1920×1080 horizontal)
pnpm ai:fal --capability h3max-r2v --image personaje.png --image producto.png --prompt "<cómo aparecen juntos>" --aspect 9:16 --duration 6 --resolution 768P --out ai-generations/2026-09-16_mi-pieza/h3max-r2v.mp4

# Base con prompt literal y 4K (reescalado desde 768P)
pnpm ai:fal --capability h3-t2v --prompt "<texto exacto>" --prompt-expansion disabled --duration 5 --resolution 4K --aspect 16:9 --out ai-generations/2026-09-16_mi-pieza/h3-4k.mp4

# Control de cámara (órbita de 60°)
pnpm ai:fal --capability h3max-camera --image escena.png --camera-trajectory '[{"distance":1,"elevation":10,"azimuth":0,"time":0},{"distance":1,"elevation":10,"azimuth":60,"time":1}]' --duration 5 --resolution 768P --out ai-generations/2026-09-16_mi-pieza/h3-camara.mp4

# LoRA (SIN VERIFICAR; postergada)
pnpm ai:fal --capability h3-t2v-lora --prompt "<frase disparadora> <escena>" --lora https://<url-de-la-lora>@1 --duration 5 --resolution 768P --out ai-generations/2026-09-16_mi-pieza/h3-lora.mp4

# Entrenamiento (SIN VERIFICAR; postergado; piso de cobro 100 steps)
pnpm ai:fal --capability h3-train-t2v --training-data dataset.zip --steps 100 --rank 32 --trigger "tronl0g0" --detach
```

**Trampas.** `h3max-r2v` sin `--aspect` —o con `--aspect adaptive`— entrega horizontal aunque todo lo que le pases sea vertical [verificado 2026-09-22]; resolución en minúsculas → rechazo local [contrato]; audio siempre presente [contrato]; precios del registro subestiman [oficial]; clips cortos descartados en silencio [oficial]. Sin `--resolution`, el CLI ya no hereda el 2K del proveedor en H3 base: envía el escalón más barato y lo avisa; para entrega pasa `--resolution` explícito [contrato].
**Uso real: spot animado 2D «Sparks × Efeonce AEO» [verificado 2026-10-03].** Personajes 2D cel-shaded (elenco 2D) y Sparks compuestos desde SVG, image-to-video con cuadro inicial y final, `h3-i2v` a 768P (1344×768, USD 0,06/s publicado); total de video medido en fal USD 4,38 para todas las tomas, pilotos incluidos. Corrida: `ai-generations/2026-10-03_sparks-aeo-60s/` (`INVENTARIO-DE-HECHOS.md` §3, `PREPRODUCCION.md` §11–12).
- **H3 base con `--prompt-expansion disabled` fue más fiel que H3 Max:** Max **giró los Sparks en 3D** y rompió el 2D. Para personajes o marca 2D compuestos, base con prompt literal.
- **Cuadro inicial y final con el mismo eje de cámara:** si no lo comparten, la toma salta de trayectoria.
- **Prohibir texto en pantalla en el prompt:** sin esa prohibición escribió texto ilegible; dos tomas se rehicieron. Refuerza la regla de §0: el texto se compone fuera.
- **Fijar la paleta en el prompt:** una toma derivó al verde y se rehízo.
- **Resoluciones por sondeo de flags:** `h3-i2v` acepta 480P/768P/2K/4K (**no hay 1080P**); `h3max-i2v` **no tiene 2K**. Para entregar a 1080 desde 768P se reescaló en post: `scale=1920:1097:flags=lanczos,crop=1920:1080,unsharp=5:5:0.35`.
- **Tope de 15 s por request** en fal y en Higgsfield (verificado en documentación y en vivo): las escenas cortas son el límite real, no una preferencia.
- **`--estimate` colgó subiendo un PNG de 3,5 MB:** usar JPG como entrada y calcular con el precio publicado.

**Estado.** 9 verificadas 2026-09-16 (base ×3, Max ×3, camera ×1, Turbo ×2); `h3-i2v` y `h3max-i2v` usadas en producción 2026-10-03 (arriba); LoRA ×3 y entrenadores ×4 **sin verificar** por [decisión] del operador; Director no operable [contrato].
**Fuentes.** V7–V14, V47–V53 (§12); corrida del spot «Sparks × Efeonce AEO» (2026-10-03).

---

### 5.6 Flux 3 (Black Forest Labs) — en fal es VIDEO

**Qué es.** Primer modelo de video público de BFL: modelo de flujo multimodal (imagen, video, audio). Anunciado 2026-07-23; disponible vía API 2026-08-04; BFL lo llama "preview" [oficial] [tercero]. Flux 3 **Image** no está en fal ni en el registro [contrato].

| Grupo | ids |
|---|---|
| Final | `flux3-t2v`, `flux3-i2v`, `flux3-flf`, `flux3-keyframes` |
| Borrador | `flux3-t2v-draft`, `flux3-i2v-draft`, `flux3-flf-draft`, `flux3-keyframes-draft` |
| Mejora de borrador | `flux3-enhance` |
| Edición | `flux3-edit` |
| Extensión | `flux3-extend`, `flux3-extend-draft` |

**Cuándo SÍ.** Primer y último cuadro exactos (`flf`); pasar por 1–10 cuadros clave (`keyframes`, único); flujo borrador → final sin reinterpretar; editar un video **con personas** barato (`edit`, 0,03/s); extender con audio de contexto; tomas que dependen de un impacto, salpicadura o caída (causa-efecto físico, sonido en el cuadro del evento) [oficial] [tercero]; texto y tipografía dentro de la escena (declarado) [oficial]; varias escenas con cortes duros en una generación [oficial].
**Cuándo NO.** 4K por fal (tope 1080p; BFL directo llega a 3840×2176, no conectado) [oficial]; coordinación de grupos o varias acciones simultáneas (BFL recomienda partir en pedidos) [oficial]; tomas realistas sostenidas donde Seedance 2.5 rinde mejor [tercero]; escenas quietas si necesitas sonido (pueden salir casi mudas) [oficial]; extend sobre un clip sin audio [verificado].

**Capacidades y límites.**
- t2v/i2v: `auto` o 5–20 s; flf y keyframes: 5–20 s sin `auto`; 720p/1080p; aspecto `auto, 21:9, 2:1, 16:9, 4:3, 1:1, 3:4, 9:16`; `--no-audio`; `--safety-tolerance 0–4` (0 = más estricto, default 2) [contrato].
- flf: `--image` (primero) y `--end-image` (último) **obligatorios** [contrato].
- keyframes: `--keyframe <imagen>@<frame_index>` de 1 a 10, índice entero ≥ 0; probado `@0` y `@96` en 5 s a 24 fps [contrato] [verificado]. BFL directo usa timestamp en segundos; fal usa `frame_index` [oficial].
- draft: sin `--resolution`; devuelve `draft_cache` y el CLI imprime el comando `flux3-enhance` listo [contrato]; borrador 1280×704 → mejora 1920×1088 [verificado]. `flux3-enhance` no acepta prompt, duración, resolución ni aspecto [contrato]. Validez del `draft_cache` [sin dato] (relevante si pasan horas).
- edit (FAST Edit): `--video` MP4/MOV/WebM/M4V/GIF, < 15 s; salida 720p; ~5 min; sin duración/resolución/aspecto [contrato] [oficial]. Tipos de edición más allá de reemplazo de objeto/estilo/luz [sin dato]; si conserva el audio [sin dato].
- extend: `--video` con **pista de audio** (< 50 MB, < 15 s); usa hasta 4 s de video y audio como contexto; `--duration` = segundos nuevos (`auto` entregó 15 s); entrega **sólo la continuación**, une en post [oficial] [contrato] [verificado]. Enviar más de 4 s de origen no aporta contexto adicional (se deduce del límite oficial de 4 s).
- 24 fps; audio con diálogo y lip sync; idiomas declarados por BFL incluyen español, pero fal dice "inglés principal": **contradicción**, prueba español antes de prometer diálogo [oficial].

**Contenido y derechos.** Evaluación externa de riesgos NCII/CSAM antes del lanzamiento [oficial]. Política explícita sobre personas reales, marcas o menores [sin dato]; edit/extend con personas funcionaron sin rechazos como los de Seedance [verificado]. BFL no reclama propiedad sobre la salida; si la entrada contiene material de terceros, explotarla puede requerir derechos que BFL no otorga [oficial]. fal: uso comercial permitido [oficial].

**Precio y estimación — RIESGO ALTO.**

| Endpoint | Registro [contrato] | Publicado [oficial] |
|---|---|---|
| final (t2v, i2v, flf, keyframes) | 0,085/s | **720p 0,17/s · 1080p 0,29/s** (BFL directo: qhd 0,40, uhd 0,80) |
| draft | 0,03/s | **0,06/s** |
| enhance | 0,085/s | [sin dato] |
| edit | 0,03/s | 0,03/s (720p) — coincide |
| extend | 0,205/s | **720p 0,41/s · 1080p 0,53/s** |
| extend-draft | 0,06/s | [sin dato] |

Las dos fuentes oficiales (BFL y fal) dan exactamente el **doble** del registro en final, draft y extend; la causa [sin dato]. Estima con el **publicado** y confirma con `--balance` antes y después de una corrida aislada (§7). Draft ≈ 1/3 del render completo según BFL [oficial].

**Comandos.**

```bash
# Borrador barato
pnpm ai:fal --capability flux3-t2v-draft --prompt "<escena y acción>" --duration 5 --aspect 16:9 --out ai-generations/2026-09-16_mi-pieza/flux3-draft.mp4

# Mejora del borrador elegido (copia el draft_cache que imprime el CLI)
pnpm ai:fal --capability flux3-enhance --draft-cache "<url-draft-cache>" --out ai-generations/2026-09-16_mi-pieza/flux3-final.mp4

# Primer y último cuadro
pnpm ai:fal --capability flux3-flf --image inicio.png --end-image final.png --prompt "<transición>" --duration 5 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/flux3-flf.mp4

# Keyframes (24 fps: 96 = segundo 4)
pnpm ai:fal --capability flux3-keyframes --keyframe inicio.png@0 --keyframe clave.png@48 --keyframe cierre.png@96 --prompt "<qué pasa entre cuadros>" --duration 5 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/flux3-kf.mp4

# Editar un video con personas
pnpm ai:fal --capability flux3-edit --video clip.mp4 --prompt "<qué cambia: estilo, luz, material>" --out ai-generations/2026-09-16_mi-pieza/flux3-edit.mp4

# Extender (origen con audio; sale sólo la continuación)
pnpm ai:fal --capability flux3-extend --video clip-con-audio.mp4 --prompt "<cómo sigue la acción>" --duration 5 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/flux3-continuacion.mp4
```

**Trampas.** Extend sin audio → 422 tras encolar (el CLI lo revisa con ffprobe cuando el video es local; con URL remota o sin ffprobe no puede saberlo) [verificado] [contrato]; `--image` en edit/extend lo rechaza el CLI [contrato]; precios del registro a la mitad [oficial].
**Estado.** Las 12 verificadas 2026-09-16; latencias 40 s–4 min [verificado].
**Fuentes.** V21–V27, V35, V44, V54–V57 (§12).

---

### 5.7 Wan 3.0 y Wan 3.0 Prime (Alibaba)

**Qué es.** Wan 3.0: beta 2026-08-06, blog 2026-08-13, lanzamiento oficial 2026-08-24 [oficial] [tercero]. Prime: "versión **acelerada** de Wan, generación significativamente más rápida manteniendo calidad alta" (2026-08-27) [oficial] [tercero]. Calidad Prime vs base: **sin medir**; ningún benchmark la compara [tercero].

| Variante | ids | Publicado por escalón [oficial fal] |
|---|---|---|
| base | `wan3-t2v`, `wan3-i2v`, `wan3-r2v` | 480p 0,05/s · 720p 0,10/s · **1080p 0,20/s** |
| Prime | `wan3prime-t2v`, `wan3prime-i2v`, `wan3prime-r2v` | 480p 0,068/s · 720p 0,14/s · **1080p 0,28/s** |

El registro guarda 0,05/s para ambas y el manual dice "mismo precio": **incorrecto en fal**; Prime es ~36–40 % más cara. En Alibaba directo Prime 720P = 0,127199/s [oficial]; Picsart dice que Prime cuesta 1/3 de créditos [tercero, 2026-08-31]: el precio depende del canal.

**Cuándo SÍ.** Toma larga hasta 30 s; video a partir de una **página web** o **documento** (único); consistencia por referencias (10/5/5) incluyendo replicar movimiento de cámara [oficial]; alternativa con personas o marcas cuando Seedance rechaza (sin rechazo medido); texto a video con audio (#1 AA [tercero]); rostros humanos diversos con microexpresiones (declarado) [oficial]. Prime sólo si la latencia manda.
**Cuándo NO.** Texto preciso en pantalla y textura de audio ("todavía no donde queremos") [oficial]; lip sync, manos o multitudes, prompts surrealistas o con varios sujetos [tercero]; un solo plano continuo de 30 s (puede cortar entre encuadres) [tercero]; edición, extensión o multi-shot controlado de Wan 3.0 (Alibaba los ofrece, **fal no los expone**) [oficial]; asumir que omitir `--resolution` da calidad final (el CLI envía 480p, el escalón más barato).

**Capacidades y límites** [contrato salvo indicación].
- Duración entera 2–30 s o `auto` (se envía `null`; el modelo eligió 5,04 s [verificado]). Resolución 480p/720p/1080p; default del proveedor 1080p, pero sin `--resolution` el CLI envía 480p y lo avisa. Aspecto `adaptive, 16:9, 4:3, 1:1, 3:4, 9:16`. **30 fps** [oficial].
- t2v: prompt obligatorio. i2v: `--image` = primer cuadro, `--end-image` opcional, **prompt opcional**. r2v: 10 imágenes (≤ 20 MB c/u), 5 videos (total ≤ 15 s, ≥ 16 fps, ≤ 100 MB c/u), 5 audios (total ≤ 15 s, ≤ 15 MB c/u), máximo 20 materiales; prompt opcional; se citan por posición ("the subject in Image 1 … like Video 1") [contrato] [oficial].
- Audio por campo `audio` (`--no-audio`) con diálogo, BGM y efectos [oficial].
- `--no-prompt-expansion` ahorra 20–60 s y puede bajar calidad; `--seed`.
- `--thinking`; sólo en r2v, `--web-url <url pública sin login>` y `--file <documento local o URL>` exigen `--thinking`; 1 documento (hasta 100 MB y 50 páginas según blog) [contrato] [oficial].
- `enable_safety_checker` modera entrada y salida; sin autorización de cuenta siempre revisa [contrato]. Política explícita sobre personas reales, marcas o menores [sin dato]. URL de video en Alibaba directo válida 24 h [oficial]. Pesos: repositorio Apache 2.0 **sin checkpoint** al 2026-09-01 [tercero]; derechos sobre salidas de la API [sin dato]; fal "Commercial use" [oficial].

**Precio y estimación.** `segundos × tarifa del escalón`. 30 s a 1080p base = **6,00** (cifra oficial de Alibaba); Prime 1080p 30 s = 8,40 [cálculo]. Con `--duration auto` el largo lo decide el modelo: presupuesta el máximo (30 s) si no tienes margen [cálculo]. Descuento API de 30 % entre 24-ago y 23-sep en algunas plataformas [tercero]; si aplica en fal [sin dato]. Nuestras corridas de Wan fueron a 480p, coherentes con 0,05/s [verificado].

**Comandos.**

```bash
# Explorar a 480p, largo automático
pnpm ai:fal --capability wan3-t2v --prompt "<escena y acción>" --duration auto --resolution 480p --aspect 16:9 --out ai-generations/2026-09-16_mi-pieza/wan3-t2v.mp4

# Primer y último cuadro, 720p
pnpm ai:fal --capability wan3-i2v --image inicio.png --end-image final.png --prompt "<transición>" --duration 6 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/wan3-i2v.mp4

# Referencias (imagen + video de movimiento)
pnpm ai:fal --capability wan3-r2v --image personaje.png --image producto.png --video movimiento.mp4 --prompt "the subject in Image 1 holds the product in Image 2 and moves like Video 1" --duration 8 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/wan3-r2v.mp4

# Desde una página web pública (prompt con guion)
pnpm ai:fal --capability wan3-r2v --thinking --web-url https://efeoncepro.com --prompt "<guion: plano 1, plano 2, cierre>" --duration 15 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/wan3-web.mp4

# Desde un documento (sin corrida real)
pnpm ai:fal --capability wan3-r2v --thinking --file brief.pdf --prompt "<qué pieza quieres a partir del documento>" --duration 15 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/wan3-doc.mp4

# Prompt literal, semilla fija, sin audio
pnpm ai:fal --capability wan3-t2v --prompt "<texto exacto>" --no-prompt-expansion --seed 7 --no-audio --duration 5 --resolution 480p --out ai-generations/2026-09-16_mi-pieza/wan3-exacto.mp4

# Prime (misma sintaxis, más cara y más rápida)
pnpm ai:fal --capability wan3prime-t2v --prompt "<escena>" --duration 5 --resolution 720p --aspect 16:9 --out ai-generations/2026-09-16_mi-pieza/wan3prime.mp4
```

**Trampas.** Omitir `--resolution` = 480p (el CLI elige el escalón barato; para entrega pásalo explícito); creer que Prime cuesta igual; `--web-url`/`--file` fuera de r2v o sin `--thinking` los rechaza el CLI [contrato]; `--web-url` sin guion anima la portada en vez de narrar [verificado].
**Estado.** Las 6 verificadas 2026-09-16 según el registro (`--web-url` con Prime r2v verificado); `--file` **sin corrida real**. El manual del CLI aún dice que i2v, r2v y Prime no tienen corrida: desactualizado frente al registro.
**Fuentes.** V17–V20, V28, V29, V31, V58–V64, R1 (§12).

---

### 5.8 Higgsfield API (`pnpm ai:fal --capability hf-*`)

**Qué es.** Segundo proveedor de `pnpm ai:fal`, con el mismo diseño que fal (cola asíncrona, clave `id:secret` en `Authorization: Key`). Cliente canónico `src/lib/ai/higgsfield.ts`; secreto `greenhouse-higgsfield-api-key` en Secret Manager (`efeonce-group`), leído vía `HIGGSFIELD_API_KEY_SECRET_REF`. `--capability hf-*` elige el proveedor sola; `--provider higgsfield --model <endpoint>` abre cualquier otro endpoint [contrato].

**Catálogo.** 44 capacidades (`pnpm ai:fal --list --provider higgsfield`): SOUL 2 / SOUL / SOUL Cinema, Marketing Studio, Recraft 4.1 (+Pro; SVG sin confirmar), Ideogram 4.0, Qwen Image 3, Z-Image Turbo, Grok Imagine Image 2.0; Seedance 2.5 (t2v, i2v, r2v, editar, extender) y 2.0; Wan 3.0 (t2v, i2v, r2v), Wan 3.0 Prime, 2.7 y 2.6; Kling 3.0 std/pro/4K/Turbo, Kling O3 y Omni primer-último cuadro, Kling 2.6 Pro, 2.5 Turbo; MiniMax H3 (sólo 2K), Hailuo 2.3, LTX 2.5 Fast/Pro, PixVerse 6, Happy Horse 1.0/1.1, Grok Imagine Video 1.5 [contrato].

**Contrato de entrada.** No se transcribe a mano: `pnpm ai:higgsfield:sync-schemas` congela en `src/lib/ai/higgsfield-schemas.json` el JSON Schema que el playground de la consola publica por endpoint (43 al 2026-09-16; SOUL Cinema transcrito de su documentación). La CLI mapea los flags genéricos al campo real de cada endpoint (`--image` → `image_url`/`first_frame_url`/`image_urls`; `--end-image` → `end_image_url`/`last_image_url`/`last_frame_url`; `--no-audio` → `generate_audio:false` o `sound:"off"`; `--count` → `batch_size`) y valida todo el cuerpo en local antes de pedir precio. Lo propio de cada endpoint (`style_id`, `multi_prompt`, `camera_movement`, `rendering_speed`, `colors`, `preset_id`) va por `--input` [contrato].

**Precio.** Lo da la API de estimación (`POST /estimate/<endpoint>`), que valida el cuerpo y **no cobra**. Monto exacto con descuento vigente en 33 capacidades; Seedance 2.0/2.5 y Wan 3.0 sólo devuelven fórmula y la CLI la aplica como **cota antes de descuento** (si falta la duración de un video remoto de entrada, exige `--yes`). Tope y `--yes` como en fal. `--estimate` imprime precio y cuerpo sin encolar [contrato].

| Barrido `--estimate` 2026-09-16 (cuerpo mínimo, resolución más barata) | USD |
|---|---|
| SOUL 2 · SOUL Cinema (720p) | 0,004 |
| Z-Image Turbo (1k) · Recraft 4.1 · Qwen Image 3 (1k) | 0,015 · 0,035 · 0,040 |
| Ideogram 4.0 · Grok Image 2.0 (1k) · SOUL | 0,060 · 0,060 · 0,094 |
| Marketing Studio (1k) · Recraft 4.1 Pro | 0,189 · 0,210 |
| PixVerse 6 5 s 360p · Kling 2.5 Turbo i2v | 0,175 · 0,179 |
| Hailuo 2.3 · Wan 3.0 Prime 5 s 480p · Grok Video 1.5 5 s 480p | 0,280 · 0,340 · 0,410 |
| Kling 3.0 Turbo 720p · Kling Omni/O3 · Wan 2.7/2.6 720p | 0,476 · 0,476 · 0,500 |
| Kling 3.0 std · LTX 2.5 Fast 6 s · H3 2K · Kling 2.6 Pro · Happy Horse | 0,536 · 0,540 · 0,553 · 0,595 · 0,595 |
| Kling 3.0 Pro · LTX 2.5 Pro 6 s · Kling 3.0 4K | 0,714 · 0,720 · 1,785 |
| Seedance 2.5 5 s 480p (cota por fórmula) · Wan 3.0 5 s 480p (fórmula) | ≈ 1,075 · 0,25 |

**Diferencias con fal que importan.** Salida retenida ≥ 7 días en el proveedor (la CLI siempre descarga; un `--detach` hay que recuperarlo dentro de esa ventana). Tope de concurrencia por cuenta que responde `400`, no `429`. `--cancel` sólo mientras siga en cola. Sin API de saldo documentada: `--balance` remite a la consola. La cuenta de API tiene créditos propios, distintos de la suscripción de la app [contrato].

**Cuándo SÍ.** Modelos que fal no expone (SOUL, Marketing Studio, Ideogram 4.0, Qwen Image 3, Z-Image, LTX 2.5, PixVerse 6, Happy Horse, Kling Omni/O3); comparar precio exacto antes de gastar [contrato].

**Cuándo NO.** Contar con SVG todavía (ver Vectores abajo); Veo 3.1, Sora 2 y Nano Banana Pro (la API responde `model_not_found`/`model_disabled` a la cuenta) [verificado 2026-09-16]. **Ojo:** eso vale para la **API**; la **CLI de la app** (`higgsfield`, otra cuenta y otro catálogo) sí lista Veo 3.1, Veo 3.1 lite y Veo 3 [contrato, 2026-10-03] — ver §4.3, bloque «Puente Higgsfield»; Nano Banana y Gemini Omni siempre directo por Google [decisión].

**Vectores (Recraft).** La API rechaza `output_format: svg` (400: sólo `jpg`/`png`/`webp`) [verificado 2026-09-16]. La app de Higgsfield ofrece Recraft V4.1 con `model_type` `vector` y `utility_vector` (logos, íconos, ilustración tipo SVG) [verificado con el conector de la app 2026-09-16]. La API no documenta `model_type` y su estimación acepta cualquier campo (`foo`, `model_type: "banana"` → 200), así que no prueba nada: **si `--input '{"model_type":"vector"}'` entrega SVG por la API está sin confirmar** hasta una generación real (USD 0,035). La CLI deja pasar ese campo para poder probarlo.

**Estado.** Las 44 capacidades pasaron el barrido `--estimate` (acceso + esquema + precio) [verificado 2026-09-16]. La cuenta de API ya tiene créditos: **`hf-zimage-turbo` completó la primera generación real** el 2026-09-17 (1k, USD 0,015, 7,7 s, request `52df8c09-c2b4-4aec-98c7-b5768fbda8fc`) [verificado 2026-09-17]. **Las otras 43 siguen SIN VERIFICAR en salida:** una generación exitosa prueba la cuenta y esa capacidad, no la familia. Antes de usar una en producción, correr una generación real de esa capacidad.

```bash
# Precio y cuerpo sin encolar
pnpm ai:fal --capability hf-kling3-std-t2v --prompt "<texto>" --duration 5 --estimate

# Imagen SOUL 2 vertical
pnpm ai:fal --capability hf-soul2 --prompt "<texto>" --aspect 3:4 --out retrato.jpg

# Marketing Studio con referencias de producto (campos propios por --input)
pnpm ai:fal --capability hf-marketing-studio --prompt "<brief>" --image producto.png --resolution 2k --out pieza.png

# Video largo desacoplado, estado, cancelación y retome
pnpm ai:fal --capability hf-seedance25-i2v --image hero.png --duration 10 --resolution 720p --detach --yes
pnpm ai:fal --provider higgsfield --request-id <id> --status
pnpm ai:fal --provider higgsfield --request-id <id> --cancel
pnpm ai:fal --capability hf-seedance25-i2v --request-id <id> --out clip.mp4

# Refrescar esquemas del proveedor
pnpm ai:higgsfield:sync-schemas
```

**Fuentes.** docs.higgsfield.ai (requests, polling, errors, webhooks, billing, rate limits, file uploads, SDK), console.higgsfield.ai (catálogo y JSON Schema por playground), barrido `--estimate` con la cuenta de Efeonce (2026-09-16).

### 5.9 Música de marca vía fal (fuera de `pnpm ai:fal`): Stable Audio 2.5 y ElevenLabs Music v2.5

**Qué es.** Tres rutas de música usadas por el script de corrida `ai-generations/2026-09-26_branding-sonoro/motor/ai-music.ts` sobre el cliente canónico `src/lib/ai/fal.ts`; **no son capacidades de `pnpm ai:fal`** ni están en `fal-capabilities.ts` [contrato]. `--route sa` = `fal-ai/stable-audio-25/audio-to-audio` (re-grabar una maqueta propia); `--route el-bed` = `elevenlabs/music/v2.5` desde texto; `--route sa-bed` = `fal-ai/stable-audio-25/text-to-audio` [contrato]. Evidencia de uso real: la música aprobada de Glitch (tema B + cama post-punk), producida el 2026-09-27 [verificado 2026-09-27]. Oficio, licencias y precios: skill `audio-studio` (`SOURCES.md`, `efeonce/STUDIO_TOOLING.md`).

| Ruta | Rindió así en producción | Úsalo para |
|---|---|---|
| **Stable Audio 2.5 audio-to-audio** (`--route sa`, strength 0,7–0,75) | Conserva el tiempo de la maqueta (0–5 ms) y **redondea la duración a segundos enteros**; volvió banda real la maqueta del tema B de Glitch [verificado 2026-09-27] | Re-grabar una maqueta propia cuando el tiempo manda (motivo, golpes y compases fijos) |
| **ElevenLabs Music v2.5** desde texto (`--route el-bed`, `composition_plan` de un tramo, **sin referencia de audio**) | Dio la cama aprobada con instrumentos reales y tempo exacto (150,00 BPM medido), 38 % de medios [verificado 2026-09-27]. Con un plan con referencia de audio (rondas del rock de Efeonce) **no respetó cortes ni el golpe final** [verificado 2026-09-26] | Camas y tracks libres desde texto; los cortes y golpes se aplican después, editando el audio |
| **Stable Audio 2.5 text-to-audio** (`--route sa-bed`) | Camas con cuerpo (36–37 % de medios), no elegidas [verificado 2026-09-27] | Alternativa para camas desde texto |

**Cambiar de estilo una pieza aprobada (audio-to-audio) [verificado 2026-10-03].** En el spot «Sparks × Efeonce AEO» se pasó la pieza larga de energía del kit sonoro (rock, 120 BPM) a una cama punk: se reordenó la fuente (56 s), se **aceleró** con `atempo=1.3333` a 160 BPM y 42 s exactos (duración entera), y se regrabó con Stable Audio 2.5 audio-to-audio (`ai-generations/2026-10-03_sparks-aeo-60s/audio/musica/regrabar-punk.ts`, USD 0,20 medido por pieza; strength 0,65 y 0,8, elegida **0,8**). **Conservó el tempo acelerado** (autocorrelación fuerte a 80 = medio compás de 160): para cambiar tempo, se acelera la referencia, no se le pide al modelo. **Salió cargada de graves** (medios 21 % contra ~35 % de la regla de abajo) y se corrigió con EQ (−4 dB bajo 180 Hz, +2 dB a 2,5 kHz). Usarla bajo locución fue una excepción del operador a la norma sonora (`docs/operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md`, «Excepciones registradas»).

**Cuándo SÍ.** Música de marca con instrumentos reales: regrabar una maqueta (tempo exacto) o una cama desde texto con los instrumentos descritos y negativos explícitos (`chiptune`, `video game`, `8-bit`, `synthwave`, `arcade`, `lead synth`…) [verificado 2026-09-27].

**Cuándo NO.** 🔴 **Nunca síntesis pura para música de marca:** tres rondas de síntesis de Glitch se rechazaron por sonar «arcade» (a videojuego); lo medido fue falta de cuerpo en los medios (cama rechazada 13 % de su energía entre 300 Hz y 3 kHz contra 45 % de la intro aprobada) [verificado 2026-09-27]. Una **maqueta sintetizada delgada contagia la regrabación** [verificado 2026-09-27]. No pedirle al modelo cortes al cuadro, tartamudeos ni silencio en seco: difumina la falla; se aplican después sobre la grabación [decisión]. No regenerar una pieza aprobada: otra corrida es otra toma; la fuente de verdad es el archivo aprobado (URL + sha256) [decisión].

**Control antes de mostrar.** Medir los medios (300 Hz–3 kHz ≥ ~35 % de la energía) con balance espectral por bandas, además de sonoridad (ebur128) y tempo (autocorrelación de ataques). El número no reemplaza el oído del operador, que aprueba siempre [decisión].

**Trampas.** Stable Audio 2.5 redondea la duración a segundos enteros: arma maquetas de duración entera [verificado]. La licencia comercial de cada modelo **vía fal** sigue por confirmar con legal (`audio-studio` → `SOURCES.md`) [sin dato].

**Fuentes.** Corrida del spot Sparks en `ai-generations/2026-10-03_sparks-aeo-60s/` (`INVENTARIO-DE-HECHOS.md` §5); corrida de Glitch en `ai-generations/2026-09-26_branding-sonoro/` (`LEEME.md`, `motor/ai-music.ts`); norma de Glitch `docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md` §13.12; skill `audio-studio`.

---

## 6. Recetas por caso de uso

Costos: [cálculo] con tarifa **publicada** del escalón indicado, salvo que se diga otra cosa. Confírmalos con §7.

### 6.1 Explorar barato → final

1. Imagen: 8 × `seedream5-lite` (0,035) = **0,28**; elige ancla.
2. Video: 5 × `h3turbo-i2v` 5 s 480P desde el ancla (registro 0,0125/s → 0,31; si rige 768P promo/lista 0,50–1,00) → **medir**.
3. Final sólo de la toma aprobada: `seedance25-i2v` 8 s 720p ≈ **3,78**, o `flux3-*-draft` → `flux3-enhance`.

```bash
pnpm ai:fal --capability seedream5-lite --prompt "<territorio>" --count 4 --size auto_2K --out-dir ai-generations/2026-09-16_explorar/lite
pnpm ai:fal --capability h3turbo-i2v --image ai-generations/2026-09-16_explorar/lite/ancla.png --prompt "<acción>" --duration 5 --resolution 480P --out ai-generations/2026-09-16_explorar/turbo-01.mp4
pnpm ai:fal --capability seedance25-i2v --image ai-generations/2026-09-16_explorar/lite/ancla.png --prompt "<acción aprobada>" --duration 8 --resolution 720p --detach
```

### 6.2 Hero

- **Imagen hero:** `gpt-image-2.5-sunburst` `xhigh` 1536×1024 ≈ **0,074** por pieza (+ entrada si editas).
- **Video hero:** `seedance25-i2v` 10 s → 720p **4,73** · 1080p **11,64** (1080p sin verificar: prueba 5 s = 5,82 primero). Alternativas por fidelidad: `wan3-i2v` 10 s 1080p **2,00**; `h3max-i2v` 10 s 1080P **0,80** (refinado desde 768P).

### 6.3 Toma larga (> 15 s)

- `seedance25-t2v` 25 s 720p ≈ **11,83**; 480p ≈ 5,51.
- `wan3-t2v` 25 s 720p **2,50**; 1080p **5,00**.
- `flux3-t2v` 20 s 720p **3,40** (publicado).
- Nunca Seedance 2.0 ni H3 (tope 15 s) [contrato].

### 6.4 4K

- `seedance20-i2v --resolution 4k` 5 s ≈ **13,61** [cálculo: 194.400 tokens/s × 5 × 0,014/1000]; 10 s ≈ 27,22. Única 4K verificada.
- `h3-i2v --resolution 4K` 10 s **1,60** (reescalado desde 768P, no nativo).
- Alternativa: generar 1080p y reescalar en post; decide por contrato de fidelidad.

### 6.5 Control de cámara

`h3max-camera` 5 s 768P: registro 0,025/s → **0,125**; escalones [sin dato] → mide con `--balance`. Si el sujeto debe actuar, no sirve: usa i2v describiendo la cámara.

### 6.6 Inicio y fin exactos

- `flux3-flf` 5 s 720p **0,85** (publicado; registro 0,425).
- `wan3-i2v --end-image` 5 s 720p **0,50**.
- `seedance25-i2v --end-image` 5 s 720p **2,37**.
- `h3max-i2v --end-image` 6 s 768P **0,24**.

### 6.7 Keyframes

`flux3-keyframes-draft` 5 s **0,30** (publicado 0,06/s) → `flux3-enhance` del elegido (registro 0,425 por 5 s; publicado [sin dato]). Directo final 5 s 720p **0,85**.

### 6.8 Editar video

- **Seedance:** `seedance25-r2v --task editing`, costo = tokens de la salida + duración del video de entrada que cuenta para el cobro [oficial]; clip de 5 s a 720p con referencia de video ≈ 1,42 [cálculo con 0,2838/s; confírmalo con `--balance`]. Con personas o marcas, sumar una prueba corta a baja resolución por el posible rechazo cobrado (riesgo puntual, §5.3).
- **Flux 3 (alternativa si Seedance rechaza, o para no arriesgar el cobro):** `flux3-edit` 10 s **0,30** (720p).
- **Editar sólo una ZONA y dejar el resto idéntico cuadro a cuadro:** `pnpm ai:inpaint video` (TASK-1965) sobre `flux3-edit` — normaliza la salida, aborta si el motor corrió el encuadre (deriva media de la zona protegida > 12/255), recompone cada cuadro y verifica delta 0 sobre PNG. Canario 5 s cámara quieta: 120 cuadros PASS, deriva 11,16/255, objeto estable, **0,15** [verificado 2026-10-02]. Manual: `docs/manual-de-uso/ai-tooling/editar-una-zona-de-un-video.md`.

### 6.9 Extender

- `seedance25-r2v --task extension --duration 8` 720p ≈ **3,78** (con personas o marcas, presupuestar un posible rechazo cobrado; sin `--aspect`).
- `flux3-extend --duration 5` 720p **2,05** publicado (origen con audio; une origen + continuación en post). Borrador: `flux3-extend-draft` 5 s 0,30 registro (publicado [sin dato]).

### 6.10 Referencias multimodales

- `seedance25-r2v` 10 s 720p con videos de referencia ≈ **2,84**; sin videos ≈ 4,73.
- `wan3-r2v` 10 s 720p **1,00**.
- `h3max-r2v` 10 s 768P **0,40**.
- Siempre al menos una imagen o video; cita por `@Image1`/`@Video1` (Seedance) o por posición (Wan).

### 6.11 Video desde web o documento

`wan3-r2v --thinking --web-url` 15 s 720p **1,50**; con `--file` igual precio [cálculo], sin corrida real. Escribe el guion en el prompt.

### 6.12 Consistencia de personaje o producto

1. Hoy: referencias r2v con la misma hoja de personaje/producto en cada toma (`seedance25-r2v`, también con rostros reales presupuestando un posible rechazo cobrado; `wan3-r2v` o `h3max-r2v` como alternativa si rechaza).
2. Futuro: LoRA de H3 (postergada [decisión]; verificación mínima: entrenamiento t2v 100 steps **0,50** + inferencia).
3. Otro carril: Higgsfield Soul ID (skill motion-design-studio). Kling elements: expuestos como campo `elements` en `hf-kling3-*` (Higgsfield API) vía `--input`, **sin corrida real**.

### 6.13 Capas editables

`seedream5-pro-layerize` sobre un KV 2K con 8 capas ≈ **0,61** (0,0675 × 9: las 8 capas **más la base, que se cobra como una capa** [verificado 2026-10-03]); bajo 1536² ≈ 0,30 [cálculo]. Entrega `NN-<nombre>.png` + `layers.json`.

Para separar una foto en elementos con máscara y clean plate (no para editar las capas): `pnpm ai:layers --image foto.png [--prompt …] [--bbox x0,y0,x1,y1]` escribe `00-base.png`, `NN-<slug>.png` y `layers.json` con la caja de cada capa en píxeles de la base; `--dry-run` imprime la cota (16 capas + base) y `--list <layers.json>` lista las capas gratis [contrato]. Foto de mesa 1536×1024: 3 capas ≈ 0,10 y, en otra corrida, 4 + base = 0,17 medido con el saldo [verificado 2026-10-03].

### 6.14 Vectores

Recraft V4.1 vía Higgsfield CLI: la CLI **tiene sesión desde 2026-09-24** (1.1.26, mkt@efeoncepro.com, workspace Private) [verificado]; la generación de un SVG real por esta vía **sigue sin corrida** (§8.4). No sustituir con vectorización de raster. **API de Higgsfield:** `model_type: vector|utility_vector` existe en la app de Higgsfield; la API no lo documenta y su estimación ignora campos desconocidos, así que **si la API entrega SVG está sin confirmar** hasta una generación real (§5.8).

### 6.15 Texto en imagen

Concepto: `seedream5-pro` (texto denso multilingüe declarado) o `gpt-image-2.5-*` `high` (≈ 0,041 a 1536×1024). Final: compón el texto fuera del modelo (§0). En video, H3 y Flux 3 declaran texto preciso [oficial] y Wan admite debilidad [oficial]: igual se compone en post.

### 6.16 Campaña híbrida (imagen → video)

1. Divergencia: 12 × `seedream5-lite` = **0,42**.
2. Look/material del ancla: 2 × `seedream5-pro` 2K = **0,27**.
3. Final con precisión y layout: 3 × `gpt-image-2.5-sunburst` `xhigh` 1536×1024 = **0,22** (+ entrada por edición).
4. Adaptaciones de formato extremo: `seedream5-pro-edit` con el ancla = 0,135 + 0,0045 por referencia adicional.
5. Video: exploración `h3turbo-i2v` y final en el motor que pida el contrato de fidelidad de cada toma.
Canon del flujo híbrido: skill `greenhouse-ai-image-generator`, referencia `seedream-5-gpt-image-2-hybrid-production.md` [decisión].

### 6.17 Editar una foto que ya existe (zona, borrar, mover, incorporar, expandir, fondo, detalle)

Todo pasa por `pnpm ai:inpaint`, que recompone sobre la original y verifica el archivo en delta máximo 0 fuera de lo
tocado; código 0 = usar, 2 = no usar, 3 = revisar al 100 % [contrato]. Contrato completo:
[GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md §Pipeline de inpainting](GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md).
Costos del canario del 2026-10-03 sobre una foto de 1536×1024 [verificado 2026-10-03]:

```bash
# 0. Capas (sólo si vas a borrar, mover, incorporar o cambiar el fondo por elemento): ≈ 0,10–0,17
pnpm ai:layers --image foto.png --run ai-generations/<fecha>_<pieza>
# Editar una zona (Flare medium por defecto; --dry-run primero)
pnpm ai:mask --base foto.png --rect 0.33,0.42,0.67,0.72 --feather 24 --out mascara.png
pnpm ai:inpaint image --image foto.png --mask mascara.png --prompt "<qué va en la zona>" --dry-run
# Borrar con el clean plate: 0
pnpm ai:inpaint erase --image foto.png --layers <layers.json> --layer "mug"
# Borrar sin capas (Sunburst por instrucción): ≈ 0,01
pnpm ai:inpaint erase --image foto.png --mask mascara.png --fill model
# Mover: ≈ 0,01 con el halo · 0 con --harmonize off
pnpm ai:inpaint move --image foto.png --layers <layers.json> --layer "notebook" --dx -300 --dy 40
# Incorporar en otra imagen: 0 con --finish off · ≈ 0,01 con halo
pnpm ai:inpaint place --image destino.png --from foto.png --layers <layers.json> --layer "mug" --at 0.3,0.62 --width 0.12
# Expandir (Flux Fill por defecto): ≈ 0,10 (1,91:1) · ≈ 0,15 (9:16)
pnpm ai:inpaint expand --image foto.png --to 9:16 --prompt "<qué hay alrededor>"
# Cambiar el fondo: ≈ 0,01
pnpm ai:inpaint background --image foto.png --prompt "<fondo nuevo>"
# Rehacer un detalle (reinterpreta, no escala): ≈ 0,022
pnpm ai:inpaint image --image foto.png --mask detalle.png --zone-resolution 2048 --prompt "<el detalle>"
```

Manuales: [editar una zona de una imagen](../manual-de-uso/ai-tooling/editar-una-zona-de-una-imagen.md) ·
[expandir y separar en capas](../manual-de-uso/ai-tooling/expandir-y-separar-en-capas.md) ·
[editar una zona de un video](../manual-de-uso/ai-tooling/editar-una-zona-de-un-video.md).

---

## 7. Presupuesto y control de gasto

### 7.1 Costo de un clip de 10 s por resolución (USD)

[oficial] = tarifa publicada × 10 · [cálculo] = fórmula de tokens o aritmética · (registro) = sólo tarifa del registro, sin escalón publicado.

| Modelo | 480p / 480P | 720p / 768P | 1080p / 1080P / 2K | 4K |
|---|---:|---:|---:|---:|
| Seedance 2.5 | 2,21 [oficial] | 4,73 [oficial] | 11,64 [oficial, 1080p sin verificar] | — |
| Seedance 2.0 base | 1,41 [cálculo] | 3,02 [oficial] | 6,85 [cálculo] | 27,22 [cálculo] |
| Seedance 2.0 fast | 1,13 [cálculo] | 2,42 [oficial] | — | — |
| Seedance 2.0 mini | 0,72 [oficial] | 1,55 [oficial] | — | — |
| Seedance 2.0 us | 1,73 [oficial] | 3,70 [oficial] | — | — |
| H3 base | 0,50 [oficial] | 0,60 (768P) [oficial] | 1,30 (2K) [oficial] | 1,60 [oficial, reescalado] |
| H3 Max | 0,25 [oficial] | 0,40 (768P) [oficial] | 0,80 (1080P) [oficial] | — |
| H3 Max Turbo | 0,125 (registro; 480P no publicado) | 0,20 lista / 0,10 promo [oficial] | 0,40 lista / 0,20 promo [oficial] | — |
| H3 camera | 0,25 (registro) | [sin dato] | [sin dato] | — |
| H3 LoRA | 0,625 (registro) | [sin dato] | [sin dato] | [sin dato] |
| Flux 3 final | — | 1,70 [oficial] (registro 0,85) | 2,90 [oficial] | — |
| Flux 3 draft | 0,60 [oficial] (registro 0,30) sin resolución | | | |
| Flux 3 edit | — | 0,30 [oficial] | — | — |
| Flux 3 extend (10 s nuevos) | — | 4,10 [oficial] (registro 2,05) | 5,30 [oficial] | — |
| Wan 3.0 | 0,50 [oficial] | 1,00 [oficial] | 2,00 [oficial, default] | — |
| Wan 3.0 Prime | 0,68 [oficial] | 1,40 [oficial] | 2,80 [oficial] | — |

**Spot de 30 s ≈ 120 s generados** [cálculo]: todo Turbo 480P ≈ 1,50 (registro, medir) · todo Wan 480p 6,00 / 1080p 24,00 · todo Seedance 2.5 720p ≈ 56,76 · mixto (100 s de exploración Turbo 480P + 30 s finales Seedance 2.5 720p) ≈ 15,44.

### 7.2 Estrategia explorar → final

1. Explora en el motor más barato que conserve lo que quieres juzgar (movimiento: Turbo 480P / Flux 3 draft / Seedance mini 480p; look: Seedream Lite; layout: GPT Image 2.5 `medium`).
2. Genera en el motor final **sólo** la toma aprobada, a la resolución de entrega.
3. Arregla defectos editoriales en post; no regeneres por crop, texto, grade o mezcla [decisión].
4. Para la toma final pasa `--resolution` explícito. Sin ese flag, el CLI envía la resolución **más barata** del endpoint y lo avisa (`· sin --resolution: uso 480p…`); antes del 2026-09-16 se heredaban los defaults caros del proveedor (Wan 1080p ≈ 0,20/s, H3 base 2K ≈ 0,13/s) [contrato] [oficial].

### 7.3 Reglas de gasto

- **Mide con `--balance` antes y después** de la primera corrida aislada en toda familia con precio incierto: Flux 3 (final, draft, enhance, extend, extend-draft), H3 Max Turbo, H3 Max (promo vs lista), H3 camera, H3 LoRA, Wan Prime, Seedance 2.5 1080p. Una corrida por familia, sola, sin otros trabajos en la cuenta.

  ```bash
  pnpm ai:fal --balance
  pnpm ai:fal --capability flux3-t2v --prompt "<escena de prueba>" --duration 5 --resolution 720p --out ai-generations/2026-09-16_medicion/flux3-720p.mp4
  pnpm ai:fal --balance
  ```

- **Seedance**: estima con la fórmula de tokens de fal (§5.3); nunca con la equivalencia de OpenArt.
- **OpenAI**: estima con la fórmula oficial (§5.1) y valida con el `usage` que imprime el CLI.
- **Dos cuentas fal** [contrato]: `FAL_API_KEY` (cuenta A) y `FAL_API_KEY_B` (cuenta B), secretos `greenhouse-fal-api-key` y `greenhouse-fal-api-key-b`. Sin `--fal-account`, el CLI usa la de más saldo y, si fal la bloquea por saldo (403, antes de encolar, no cobra), pasa sola a la otra. Forzar: `--fal-account FAL_API_KEY_B`.
- **`--detach` / `--status` / `--request-id`** [contrato]: `--detach` encola, imprime `request_id` y cuenta, y termina; `--status` consulta una vez sin esperar ni descargar (no cobra); `--request-id` retoma y descarga **sin volver a pagar**. Un timeout local **no** detiene el trabajo en fal: sigue corriendo y se cobra; retómalo. Esperas por defecto: imagen 3 min · video 30 min · entrenamiento 3 h.

  ```bash
  pnpm ai:fal --capability seedance25-r2v --image ref.png --prompt "@Image1 <acción>" --duration 10 --resolution 720p --detach
  pnpm ai:fal --capability seedance25-r2v --request-id <request_id> --status
  pnpm ai:fal --capability seedance25-r2v --request-id <request_id> --out ai-generations/2026-09-16_mi-pieza/sd25.mp4
  ```

- **Rechazos cobrados**: cuando Seedance rechaza después de encolar, igual cobra [verificado 2026-09-16]. Es un riesgo puntual con personas o marcas, no un filtro sistemático [operador, 2026-10-04]: prueba **antes** corto y a baja resolución, y ten Flux 3 / Wan 3.0 como alternativa.
- **Estimación y confirmación en `ai:fal`** (desde 2026-09-16, commit `17196ead1`) [contrato]: antes de encolar el CLI imprime `$ costo estimado ≈ USD X · <base del cálculo>`.
  - Seedance: fórmula de tokens (área × segundos × 24 / 1024 × precio por 1.000 tokens de la API de pricing). Con `--duration auto` o sin `--duration` usa el máximo del contrato como cota superior (2.5 a 480p ≈ USD 6,45): pasa `--duration`.
  - H3 base/Max/Turbo, Wan 3.0/Prime y Flux 3 (final, draft, extend, edit): precio publicado por escalón de resolución; donde no hay escalón publicado (camera-controls, LoRA, enhance, extend draft, Turbo 480P) usa el precio de la API. Extend cobra los segundos nuevos de `--duration`; edit mide con `ffprobe` la duración del video de origen local.
  - Seedream: por imagen según área (+ 0,0045 por referencia extra en Pro edit). Layerize: precio por capa, sin total (el número de capas lo decide el modelo).
  - Entrenadores H3: `steps × precio` con mínimo facturable de 100 steps.
  - **Tope:** si la estimación supera USD 1 (o `FAL_COST_CONFIRM_USD`, o `--max-usd <n>` para esa corrida), el CLI se detiene **antes de encolar** y pide `--yes`. Sin estimación posible (slug fuera del registro con `--model`, datos faltantes) avisa y no bloquea.
  - La estimación es orientativa: las tablas de escalones son de las páginas de fal y fabricantes al 2026-09-16. La medida real sigue siendo `--balance` antes y después. Las subidas de archivos locales ocurren antes de la estimación (subir no cobra).

  ```bash
  pnpm ai:fal --capability wan3-t2v --prompt "<escena>" --duration 10 --resolution 1080p --out ai-generations/2026-09-16_mi-pieza/wan3.mp4
  # → $ costo estimado ≈ USD 2.00 · … supera el tope de USD 1.00 → repite con --yes
  pnpm ai:fal --capability wan3-t2v --prompt "<escena>" --duration 10 --resolution 1080p --yes --out ai-generations/2026-09-16_mi-pieza/wan3.mp4
  ```

### 7.4 Presupuesto por toma según tipo y dificultad (ejemplos)

Aplica la fórmula de la [taxonomía §4.2](GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md): pilotos + intentos
esperables × tarifa a la resolución de entrega + entradas cobradas, **× 1,43 de reserva** mientras la diferencia
medida estimación/factura siga siendo la de SKY V11. Tarifas: `pnpm ai:fal --estimate` del 2026-10-03 [contrato] o
publicadas (§4.2) [oficial]; tomas de 5 s, 9:16. **Son ejemplos para presupuestar, no recomendaciones de motor**: el
motor sale del banco de TASK-1980.

| Tipo / subtipo · dificultad | Nivel | Pilotos | Final (intentos × costo) | Subtotal | Con reserva |
|---|---|---|---|---|---|
| `atmosfera/loop-fondo` · baja (≈ 2) | final 720p | — | Wan 3.0 720p: 1,5 × 0,50 | 0,75 | ≈ 1,1 |
| | | — | H3 Max Turbo 768P: 2 × 0,10 | 0,20 | ≈ 0,3 |
| `producto/estudio` · media (≈ 7: C 2, E 2, D 0…) | final 1080p | `h3max-camera` 768P: 0,20 | Wan 3.0 1080p: 2,5 × 1,00 | 2,70 | ≈ 3,9 |
| | | | Flux 3 1080p: 2,5 × 1,45 | 3,83 | ≈ 5,5 |
| `fotorrealista/persona-accion` · alta (≈ 13) | final 1080p | 2 × H3 Max Turbo 768P: 0,20 | H3 Max 1080P: 4 × 0,40 | 1,80 | ≈ 2,6 |
| | | | Wan 3.0 1080p: 4 × 1,00 | 4,20 | ≈ 6,0 |
| | | | Seedance 2.5 1080p: 4 × 5,20 (con persona real, contar un posible rechazo cobrado) | 21,00 | ≈ 30,0 |
| `personaje-3d/nexa` · alta, **3 tomas** con la misma ancla | final 720p | 1 × Seedance 2.0 mini 480p: 0,35 | Wan 3.0 r2v 720p: 3 tomas × 4 × 0,50 | 6,35 | ≈ 9,1 |
| | | | Seedance 2.5 r2v 720p: 3 × 4 × 2,31 | 28,07 | ≈ 40,1 |
| **Feature spotlight 15 s** (`demo-ui/con-persona`, [anexo](GREENHOUSE_AI_VIDEO_PRODUCT_AND_INTERFACE_V1.md) §3.6): P2 5 s media · P5 4 s alta · P6 5 s propio · cierre | final 720p | 2 × H3 Max Turbo 768P: 0,20 | Wan 3.0 720p: P2 2,5 × 0,50 + P5 4 × 0,40 · P6 y cierre 0 | 3,05 | ≈ 4,4 |
| | | | Seedance 2.5 720p (mínimo 4 s): P2 2,5 × 2,31 + P5 4 × 1,85 | 13,37 | ≈ 19,1 |
| `motion-graphics/tipografia-kinetica` · cualquiera | final | — | camino propio (HyperFrames / taller) | 0 | 0 (créditos); el costo es tiempo de diseño |
| `demo-ui/captura` · cualquiera | final | — | captura real + `pnpm video:finish` (TASK-1981) | 0 | 0 |

**Lecturas que da la tabla:** en dificultad alta la diferencia entre motores es de hasta **≈ 12×** por toma (H3 Max contra
Seedance 2.5 a 1080p), así que el banco por tipo (C1) se paga solo antes de la primera pieza premium; y los tipos con
camino propio no compiten por presupuesto de IA. Los motores de la CLI de Higgsfield se presupuestan en créditos con
`higgsfield generate cost` (§4.3) hasta conocer el valor del crédito.

---

## 8. Brechas, fallas conocidas y pendientes

### 8.1 `pnpm ai:image` [contrato]

| Brecha | Efecto | Mitigación |
|---|---|---|
| Sin `--output-compression` | No controlas la compresión de JPEG/WebP | Recomprime en post |
| `--count N` = N pedidos pagados secuenciales | Multiplica costo y tiempo (el CLI lo avisa y la estimación ya multiplica por N) | Cuenta `N × costo` |
| Estimación sólo informativa | No hay tope ni `--yes` en `ai:image`; sin estimación con `--size auto` o modelos sin grilla | Revisa la línea `$ costo estimado` antes de dejarlo correr |
| `--input-fidelity` con 2.5 o GPT Image 2 | Desde el 2026-09-27 el CLI lo **rechaza antes de la red** (antes se ignoraba en silencio) | Pide la preservación por prompt |
| Sin `--moderation` | No puedes usar `moderation=low` | — |
| `--batch` no usa la Batch API | Sin descuento 50 % | Batch sólo vía API directa con `gpt-image-2` |
| Default de salida `public/images/generated` | Riesgo de commitear assets | Siempre `--out`/`--out-dir` |

**Resuelto el 2026-09-16 (commit `17196ead1`):** `--format png|jpeg|webp` (o deducido de la extensión de `--out`); `--size` validado en local contra la grilla del modelo; `--background` validado; aviso de `--count N`; estimación previa con la fórmula oficial de tokens. Sigue [sin dato] si OpenAI rechaza un tamaño inválido antes de cobrar (ahora el CLI corta antes).

### 8.2 `pnpm ai:fal` [contrato]

| Brecha | Efecto | Mitigación |
|---|---|---|
| `--size`/`--count` sin validar en imagen | Lite reescala solo | Usa el enum |
| Sin flags para `max_images`, `enhance_prompt_mode`, `enable_safety_checker` | Sólo vía `--input` | `--input '{"campo":valor}'` |
| `--seed` forzado por `--input` en un endpoint que no lo declara | Efecto [sin dato] | No lo fuerces |
| Layerize: número de capas | Lo decide el modelo y varía entre corridas (misma foto: 3 y 4); la base se cobra como una capa [verificado 2026-10-03] | Presupuesta 16 capas + base como techo |
| Flux 3: la API de pricing devuelve la mitad del precio publicado | Causa [sin dato]; la estimación usa el publicado | Mide con `--balance` |
| Estimación orientativa | Tablas de escalones al 2026-09-16, pueden cambiar; las subidas locales ocurren antes de estimar (no cobran) | `--balance` antes y después |
| Registro con precio del escalón más bajo | Subestima Wan, H3 base/Max/Turbo y Flux 3 | Usa el publicado (§4.2) |
| Nota del registro "Hasta 4K" en `seedream5-pro` | Corregida el 2026-09-16 (tope 2048²; también notas de precio de Wan, Flux 3 y H3) | Resuelto |
| Default de salida `public/images/generated` | Riesgo de commitear | Siempre `--out`/`--out-dir` |

**Resuelto el 2026-09-16 (commit `17196ead1`)** [contrato]: formato real de Seedream Pro derivado de `--out` + detección por bytes con corrección de extensión; `--format` rechazado en Lite; `--seed` aceptado sólo en los 19 endpoints que lo declaran (H3 de generación, Wan 3.0/Prime, `seedance25-r2v`); tope de 10 `--image` en Seedream edit validado; `--lora …#weight_name`, `--frames` y `--split-threshold` con validación (también por `--input`); estimación de costo con confirmación `--yes` sobre el tope; resolución más barata por defecto en video.

### 8.3 Higgsfield API dentro de `pnpm ai:fal` [contrato]

| Brecha | Efecto | Mitigación |
|---|---|---|
| Carril Higgsfield casi sin verificar en real | **1 de 44** con `verifiedAt` (`hf-zimage-turbo`, 2026-09-17, USD 0,015). Los créditos **ya se cargaron**: el `403 not_enough_credits` dejó de ser el bloqueo [verificado 2026-09-22] | Verificar **por CAPACIDAD, no por familia** — una generación exitosa verifica su capacidad y nada más (así lo declara `higgsfield-capabilities.ts`). Las otras 43 tienen sólo `estimateVerifiedAt`, que prueba acceso, esquema y precio, **no la salida** |
| Sin API de saldo documentada | `--balance` no muestra monto | Consola del proveedor |
| Seedance/Wan 3.0: la estimación devuelve fórmula | La CLI calcula una cota antes de descuento | Si falta la duración de un video remoto de entrada, pide `--yes` |
| Validador local = subconjunto de JSON Schema | Lo no cubierto lo rechaza la estimación (sin cobrar) | Mensaje del proveedor en inglés en ese caso |
| Snapshot de esquemas puede quedar viejo | Enum o rango desactualizado | `pnpm ai:higgsfield:sync-schemas` |
| Salida retenida ≥ 7 días | Un `--detach` olvidado pierde el archivo | Recuperar con `--request-id` dentro de la ventana |

### 8.4 Pendientes

| Pendiente | Estado | Condición de cierre |
|---|---|---|
| **LoRA H3 y entrenadores** | Postergados [decisión]. Costos corregidos: piso 100 steps → t2v ≥ 0,50, i2v/flf2v ≥ 1,00, ref2va ≥ 1,50; captions por clip obligatorias; clips < 73 cuadros descartados | Verificar entrenamiento t2v de 100 steps + 1–3 inferencias `h3-t2v-lora` y anotar `verifiedAt` |
| **Recraft V4.1 vía Higgsfield** | Sesión resuelta 2026-09-24 (CLI actualizada 0.2.1 → 1.1.26 con el instalador oficial de `higgsfield-ai/cli`; login aprobado en navegador; `workspace set` obligatorio después) [verificado]. **Salida SVG sin corrida real** | Una corrida `higgsfield generate create` con el modelo Recraft V4.1 y readback del SVG |
| **Rotación de la clave B de fal** | Pendiente [contrato] | Rotar `greenhouse-fal-api-key-b` con verificación del consumer |
| ~~Estimación de costo en `ai:fal`~~ | **Cerrado 2026-09-16** (commit `17196ead1`): estimación + confirmación con tope + resolución barata por defecto | — |
| **Nano Banana Pro sin superficie** | `gemini-3-pro-image` disponible en Vertex (models.get OK 2026-09-16) pero ninguna superficie lo usa; decisión pendiente del operador de exponerlo | Decisión del operador |
| Medición real de precios | Flux 3 (todos), H3 Turbo/Max/camera, Wan Prime, Seedance 2.5 1080p | Corrida aislada con `--balance` (§7.3) |
| Calidad y latencia Wan base vs Prime | Sin medir | Misma toma en ambos, comparar |
| `wan3-r2v --file` | Sin corrida real | Una corrida con documento |
| Nitidez de Seedance 2.5 a 1080p | Sin verificar | 5 s a 1080p revisado cuadro a cuadro |
| **BFL FLUX Tools** (Erase, Outpainting) | No están en fal; API propia de BFL (`https://api.bfl.ai/v1/flux-tools/outpainting-v1` hasta 4 MP, desde USD 0,10/MP; `.../erase-v1` desde USD 0,034 por imagen). Requiere cuenta BFL del operador y el secreto `greenhouse-bfl-api-key` | Adaptador en `pnpm ai:inpaint` + canario comparativo contra clean plate, Sunburst y Flux Fill |
| **Relight dedicado** | Ninguno conectado; estudio de mercado del 2026-10-03 sin verificar en vivo (§10.3) | Canario de un candidato contra `place --finish element` sobre el mismo composite |
| **Video con máscara real** (Wan VACE + SAM 2) | Esquemas leídos, sin conectar | TASK-1979 (EPIC-051) con canario; resto del programa de video en [EPIC-051](../epics/to-do/EPIC-051-ai-video-production-cli-capabilities.md) |

---

## 9. Rankings externos

**Ningún ranking es la verdad.** Metodologías, versiones, calidades y fechas difieren; los votos de GPT Image 2.5 son pocos (≈ 3–7 mil) frente a GPT Image 2; las cifras de Arena y AA se leyeron con un resumidor y conviene revalidarlas a mano antes de citarlas externamente [tercero]. Decide con tu brief y el contrato de fidelidad.

### 9.1 Imagen

| Modelo | OpenArt Arena imagen v1.0 (2026-09-16) | Arena texto a imagen (act. 2026-09-07) | Arena edición (act. 2026-09-07) | Artificial Analysis T2I (leído 2026-09-16) | Artificial Analysis edición (leído 2026-09-16) |
|---|---|---|---|---|---|
| GPT Image 2.5 Sunburst | no listado | #1 · 1421±13 · 3.149 votos | #1 · 1520±9 · 6.704 | #2 (max) · 1183 | #1 (max) · 1164 |
| GPT Image 2.5 Flare | no listado | #2 · 1399±13 · 2.856 | #2 · 1491±9 · 5.676 | #1 (max) · 1189 | #2 (max) · 1140 |
| GPT Image 2 | #2 · 1047 | #3 (medium) · 1381±4 · 78.731 | #3 (medium) · 1461±3 · 235.928 | #3 (high) · 1173 | #5 (high) · 1113 |
| Seedream 5.0 Pro | **#1 · 1051** | #10 · 1257±4 · 62.443 | #8 · 1394±4 · 179.966 | #15 · 1082 | #9 · 1099 |
| Seedream 5.0 Lite | no listado | #37 · 1138±3 | #26 · 1294±3 | #43 · 1000 | #20 · 1049 |
| Nano Banana Pro (no en CLIs) | #3 · 1008 | — | — | — | — |

OpenArt completo (2026-09-16): 1 Seedream 5.0 Pro · 2 GPT Image 2 · 3 Nano Banana Pro · 4 Grok Imagine 2.0 · 5 Nano Banana 2 · 6 Qwen Image 3.0 · 7 Flux.2 Pro.

**Contradicción:** OpenArt pone a Seedream 5.0 Pro #1; Arena lo pone #10/#8 y AA #15/#9, con GPT Image 2.5 #1/#2 en ambos. No se elige uno como verdad.

### 9.2 Video

| Modelo | OpenArt Arena video v1.0 (2026-09-16) | AA texto a video con audio (2026-09-16) | AA texto a video sin audio | AA imagen a video con audio | AA imagen a video sin audio |
|---|---|---|---|---|---|
| Seedance 2.5 | **#1 · 1125** | no incluido | no incluido | no incluido | no incluido |
| Wan 3.0 | #2 · 1047 | **#1 · 1240** | **#1 · 1335** | #6 · 1178 | #2 · 1360 |
| Seedance 2.0 | #3 · 1044 | #5 · 1220 (720p) | — | #2 · 1197 (720p) | #4 · 1342 |
| Seedance 2.0 Mini | #4 · 1033 | — | — | — | — |
| Gemini Omni Flash (ranking histórico del modelo anterior) | #5 · 1029 | #2 · 1237 | #2 · 1325 | #5 · 1181 | **#1 · 1365** |
| Flux 3 Video | #6 · 1003 | no incluido | no incluido | no incluido | no incluido |
| MiniMax H3 | #7 · 1000 (ancla) | #4 · 1225 | #3 | #3 · 1190 | #3 · 1351 |
| H3 Max (post-entrenado por fal) | — | #3 · 1231 | — | **#1 · 1206** | — |
| Kling 3.0 Omni (vía Higgsfield API, sin corrida real) | #8 · 979 | — | — | — | — |

OpenArt 9–11: HappyHorse 1.1 · Grok Imagine 1.5 · PixVerse V6. Subcategoría Video Editing de OpenArt: #1 Wan 3.0, pero **en fal Wan 3.0 no tiene endpoint de edición** (la edición Wan conectable es 2.7, no conectada). Sub-puntajes OpenArt de Seedance 2.5: adherencia 1053, estética 1096, física y movimiento 1104, consistencia 1195. fal afirma que H3 Max es #1 en su propia evaluación humana contra 12 modelos (autodeclarado) [oficial]; BFL declara Elo 1135 de Flux 3 en texto a video (autodeclarado) [oficial].

**Contradicción:** OpenArt pone a H3 última de los conectados y a Seedance 2.5 #1; AA pone a H3 Max #1 en imagen a video con audio y a Wan 3.0 #1 en texto a video, y no incluye Seedance 2.5 ni Flux 3. No hay ganador universal.

---

## 10. Carriles Google directos y candidatos NO conectados

### 10.1 Disponibles fuera de `ai:image` / `ai:fal`

| Carril | Motor | Estado | Regla |
|---|---|---|---|
| Google directo (Vertex `global`), CLI `pnpm ai:nano` | **Nano Banana 2.1** = `gemini-nano-banana-2.1` (default exacto del CLI) | Local: 1K, edición iterativa/stream/búsqueda 2K y Nexa 4K/high con ocho referencias verificadas 2026-10-06; [manual](../manual-de-uso/ai-tooling/nano-banana-2-1-cli.md) | Texto/edición/referencias/video/PDF, 1K–4K, 14 ratios, thinking, búsqueda web/imagen; Batch/Interactions remoto/máscaras no implementados. No cambia el runtime del producto ni Globe |
| Google directo (Vertex, location `global`), runtime `generateImage` provider `google-gemini-image` | **Nano Banana 2** = `gemini-3.1-flash-image` (default del provider; sobrescribible con `GOOGLE_GEMINI_IMAGE_MODEL`) | En runtime del producto; **sin CLI** [contrato] | Cambiar la env cambia todo el carril del producto [contrato] |
| Google directo (Vertex) | **Nano Banana Pro** = `gemini-3-pro-image` | Disponible (models.get OK 2026-09-16) pero **ninguna superficie lo usa**; `gemini-3.1-pro-image` responde 404 [verificado] | Siempre directo por Google, nunca por fal [decisión]; exponerlo es decisión pendiente |
| Google directo (Cloud Interactions `global`) | **Gemini Omni 1.1 Flash** (`gemini-omni-1.1-flash-preview`) | `pnpm ai:omni` local, seis operaciones verificadas con MP4 reales el 2026-09-24; [manual](../manual-de-uso/ai-tooling/gemini-omni-1-1-cli.md) | Directo por Google, nunca por fal; separado de Globe y del ID Developer `gemini-omni-1.1-flash` |
| Higgsfield CLI `~/.local/bin/higgsfield` 1.1.26 (cuenta mkt@efeoncepro.com, workspace Private), out-of-band | **Recraft V4.1** vectores reales (SVG) | Con sesión desde 2026-09-24 [verificado]; SVG real sin corrida | La 0.2.1 ya no puede iniciar sesión: actualizar con el instalador oficial antes de `auth login`, y `workspace set <id>` después. Distinto del carril Higgsfield **API** de `ai:fal` (§5.8) |

**Nexa cine, evidencia visual 2026-10-06.** La [comparación de NB21 V2 con NX7d Sunburst](../audits/ai-tooling/2026-10-06-nexa-cine-nano-banana-2-1-vs-sunburst.md)
favorece Sunburst para esas dos imágenes por naturalidad de pose, luz y escena; Nano aporta
5504×3072 nativo, identidad/emblema sostenidos y mejores reservas de composición. V2 pasó cine y
4/4 reservas y quedó APROBABLE técnicamente, en estado `proof-only`. Mayor resolución o un gate
técnico aprobado no demuestra superioridad artística. Prompt, expresión y referencias difieren: no
es A/B controlado, ranking general ni benchmark de costo/velocidad. Para continuar ese registro,
conservar la dirección de Sunburst NX7d; para probar Nano, usar la ficha y `pnpm foto:prompt`,
`--resolution 4K --thinking high`, revisar a escala real y pasar la misma rúbrica cine.
`high` es el mayor thinking del contrato Nano; no equivale a `quality max` de OpenAI. El default de
`pnpm ai:image` sigue siendo `gpt-image-2`, sin cambio del runtime/Globe.

### 10.2 Evaluados y NO conectados (no usar como si existieran)

Precios de la API de pricing de fal (2026-09-16), escalón más bajo, **no verificados**.

| Candidato | Qué ofrece | Precio fal | Por qué importa |
|---|---|---|---|
| **Kling 3** (O3 standard/pro/4K; V3; imagen o3) | Multi-prompt multi-toma, `shot_type`, *elements* con voz para consistencia, video a video edit/reference; V3 negative_prompt, cfg_scale, motion-control con video de movimiento, turbo; imagen hasta 4K con series coherentes 2–9 | O3 standard/pro 0,14/s · 4K 0,42/s; V3 turbo 0,112–0,14/s; motion-control 0,126–0,168/s; imagen 0,028/img | Consistencia de personaje por *elements*; 4K. OpenArt video #8 [tercero] |
| **Grok Imagine** (video v1.5, video base, imagen v2.0) | v1.5 1–15 s hasta 1080p, r2v 1–7 imágenes; base con edit-video y extend-video 2–10 s; imagen `quality low|medium` 1k/2k | v1.5 0,01/s (el más barato); base 0,05/s; imagen "0,01 USD/unidad" (unidad [sin dato]) | Exploración ultrabarata; OpenArt video #10, imagen 2.0 #4 [tercero] |
| **Recraft vía fal** (23 endpoints) | text-to-vector V4.1, pro, vectorize, upscale crisp, estilos propios `recraft/v4/style/*` | text-to-vector 0,08 · pro 0,30 · vectorize 0,01 · upscale crisp 0,004 · create-style 0,005 | Vía alternativa a Higgsfield para SVG |
| **Qwen Image 3** | Imagen, edición, *layered* | [sin dato] | Capas; OpenArt imagen #6 [tercero] |
| **Wan 2.7** | Edición de video | [sin dato] | Edición Wan (3.0 no la expone en fal) |
| **HappyHorse 1.1**, **PixVerse V6** | Video | Conectados vía Higgsfield API (`hf-happyhorse11-t2v`, `hf-pixverse6-t2v`), sin corrida real | OpenArt video #9 y #11 [tercero] |
| **Flux.2 Pro** | Imagen | [sin dato] | OpenArt imagen #7 [tercero] |
| **Flux 3 directo en BFL** | qhd/uhd hasta 3840×2176, keyframes por timestamp, i2v con 1–10 imágenes | qhd 0,40/s · uhd 0,80/s [oficial] | 4K de Flux 3 |
| **Wan 3.0 directo en Alibaba** | Edición (incluye cambiar diálogo), extensión adelante/atrás, multi-shot 4–6 s por plano | Prime 720P 0,127199/s [oficial] | Funciones que fal no expone |

Conectar cualquiera exige: slug + contrato en `fal-capabilities.ts`, corrida real, y actualizar esta guía (§11). Mientras tanto, `pnpm ai:fal --model <slug> --input '<json>'` corre un slug fuera del registro **sin validación** [contrato]: úsalo sólo para evaluar, no para producción.

### 10.3 Reiluminar (relight) — estudio de mercado 2026-10-03

**Estado (canario del 2026-10-03, tarde):** IC-Light v2 y el relighting por estilos de fal quedaron **conectados y
probados** como adaptadores de `pnpm ai:inpaint`, y **ninguno conserva un objeto exacto**: IC-Light deformó la taza e
inventó una ventana; el de estilos le cambió el color. Para un compuesto, el ganador medido es Sunburst por instrucción
(`place --finish element`). El resto de esta sección es el estudio de mercado: **sin verificar en vivo** salvo esas filas. Donde el estudio no distinguió si el dato venía del fabricante o de un tercero, la fila se marca
[tercero] hasta leer la página del proveedor; nunca lo uses como [oficial].

**Lo que ya tenemos (lo más cercano):**

- `pnpm ai:inpaint place --finish element`: además de la sombra de contacto y el reflejo, deja que el modelo relumine
  el elemento pegado (`RELIGHT_PROMPT`: igualar luz, temperatura de color y sombras a la escena, conservando forma,
  proporciones, colores, materiales y texto) en una zona = el elemento + 48 px; la forma del elemento puede variar
  [contrato]. Ese modo no tiene canario propio [sin dato].
- `pnpm foto:isotipo --acabado`: el acabado del isotipo compuesto sobre un plate [contrato].

**Restricciones del canon que mandan sobre cualquier herramienta** [decisión]:

- El plate del registro cine se genera **sin relight ni upscale**: si la luz no sirve, se corrige la ficha y se
  regenera, no se reilumina la foto ([casebook cine](../operations/brand-photography/EFEONCE_PHOTO_CINE_CASEBOOK_V1.md)).
  Sin scrim; luz con carácter.
- Colorimetría: luz de día neutro-cálida (~5200 K) y sombras neutras, b* entre −3 y +3
  ([EFEONCE_PHOTO_COLORIMETRY_V1.md](../operations/brand-photography/EFEONCE_PHOTO_COLORIMETRY_V1.md)).
- Por eso el relight sirve para **composites** (un objeto pegado que no toma la luz de la escena), no para arreglar un
  plate.

**Imagen**

| Herramienta | Acceso | Tipo de control | Precio | ¿Preserva el detalle? | Estado |
|---|---|---|---|---|---|
| **Magnific Image Relight** (ex Freepik; `docs.freepik.com` → `docs.magnific.com`) | API `POST /v1/ai/image-relight` asíncrona (+ `GET` por task-id); MCP oficial `https://mcp.magnific.com` (OAuth) con `images_relight` (`creationIdentifier` + `lights`, máximo 4 luces); app con luces posicionables en vista 3D (versión 2026-03-24) | `prompt`, imagen de referencia (`transfer_light_from_reference_image`), lightmap en grises (`transfer_light_from_lightmap`), `light_transfer_strength` 0–100, `interpolate_from_original`, `change_background` (default `true`), `style` (`standard`, `darker_but_realistic`, `clean`, `smooth`, `brighter`, `contrasted_n_hdr`, `just_composition`), avanzados (whites, blacks, brightness, contrast, saturation, `engine`, `fixed_generation`) [oficial] | €0,10 por operación [oficial] | `preserve_details` (default `true`) [oficial], pero re-renderiza (generativo), con riesgo en caras pequeñas; el modelo es propio y no está publicado [tercero] | MCP conectado en las sesiones Claude con la cuenta de Efeonce (`account_profile` responde) [verificado 2026-10-03]; sus esquemas no cargaron en la sesión: **sin invocación verificada**. No conectado a nuestros CLIs |
| **IC-Light v2** (`fal-ai/iclight-v2`) | fal | Prompt + dirección (`initial_latent`) [oficial] | USD 0,10/MP, redondea hacia arriba [oficial API 2026-10-03] | **No**: deformó la taza e inventó una ventana; tarda > 120 s [verificado 2026-10-03] | **Conectado** (`--adapter fal:iclight-v2`) |
| **fal `image-apps-v2/relighting`** (`fal-ai/image-apps-v2/relighting`) | fal | Estilo de una lista cerrada (`--prompt natural`, `side_light`…) [oficial] | USD 0,04/imagen [oficial API 2026-10-03] | **No**: cambió el color del producto (blanca → lila) [verificado 2026-10-03] | **Conectado** (`--adapter fal:image-apps-relighting`) |
| **Qwen-Image-Edit lighting-restoration** | fal | Restauración de luz | USD 0,035/MP [tercero] | [sin dato] | Sin conectar |
| **Photoroom AI Relight** | API de Photoroom | Corrección de luz, 3 modos, hasta 3500 px [tercero] | [sin dato] | [sin dato] | Sin conectar |
| **Nano Banana Pro** por instrucción | Google directo (Vertex), nunca por fal [decisión] | Instrucción | USD 0,134–0,24 [tercero] | [sin dato] | Disponible en Vertex sin superficie (§10.1) |
| **GPT Image 2.5** por instrucción | `pnpm ai:image` / `pnpm ai:inpaint` (conectado) | Instrucción; es el modelo de `place --finish element` | Fórmula oficial de tokens (§5.1) | Redibuja: se recompone y se vuelve a pegar el objeto | Conectado; relight sin medir [sin dato] |
| **Kontext LoRA relight** | LoRA sobre FLUX Kontext | [sin dato] | [sin dato] | [sin dato] | Experimental; revisar licencia antes de usar [tercero] |
| **Higgsfield Relight** | Función de la app de Higgsfield | — | [sin dato] | [sin dato] | **No está en la API**: ni en nuestro catálogo (`higgsfield-capabilities.ts`), ni en sus páginas públicas, ni en el MCP (`models_explore` con «relight» → 0 resultados) [verificado 2026-10-03] |
| **ByteDance (Dreamina)** | App | Relight de fotos con Seedream 5.0 **por prompt**; agente de hasta 40 imágenes con luz consistente [oficial, marketing] | [sin dato] | [sin dato] | Sin modelo dedicado. Seedream edit por prompt sí está conectado (`seedream5-pro-edit`), relight sin medir [sin dato]. Investigación: DreamLight (Tsinghua + ByteDance, arXiv 2506.14549, sin pesos) [tercero] |

**Video**

| Herramienta | Acceso | Tipo de control | Precio | ¿Preserva el detalle? | Estado |
|---|---|---|---|---|---|
| **ID-V2V Relight** (`fal-ai/id-v2v/relight`) | fal | Propaga un cuadro reiluminado al clip | USD 0,20/s [tercero] | [sin dato] | Sin conectar |
| **LightX** (`fal-ai/lightx/relight`) | fal | [sin dato] | USD 0,10/s [tercero] | [sin dato] | Sin conectar |
| **Beeble SwitchX** | API de Beeble | [sin dato] | USD 0,10–0,30 por 30 cuadros; compra mínima USD 50 [tercero] | [sin dato] | Sin conectar |
| **Runway Aleph 2.0** | API de Runway | [sin dato] | USD 0,28/s [tercero] | [sin dato] | Sin conectar |
| **LTX-2.3 Relight IC-LoRA** | Pesos abiertos | Relight, orientado a exteriores | [sin dato] | [sin dato] | Sin conectar [tercero] |
| **Higgsfield Cinema Studio 4.0** (`cinematic_studio_video_4_0`) | **Sólo el MCP** de Higgsfield | `mode: video_edit` edita un video de referencia (cobrado por su duración); luz `light: preset\|custom\|user`, `light_id`, `light_custom` (rig ordenado: la primera fuente es la llave), además de cámara, lente, apertura, era, género y paleta [verificado 2026-10-03, listado del MCP] | [sin dato] | [sin dato] | **No está en nuestro catálogo de la API** (0 coincidencias) [verificado 2026-10-03]. Candidato a relight de video por rig, sin invocación |
| **Magnific video relight** | MCP `video_relight` (`video_url` + `first_frame_url` o una creación; `lights` o `light_transfer_image`); app | Luces o imagen de transferencia | [sin dato] | [sin dato] | Sin invocación verificada (esquemas no cargaron) |
| **Seedance 2.0 / 2.5** por prompt | `seedance25-r2v --task editing` (conectado) | Edición de video por instrucción; en Runware, `duration=auto` y la palabra «relight» en el prompt [tercero] | Tokens de Seedance (§4.2) | [sin dato] | Relight sin medir; posible rechazo cobrado con personas o marcas (puntual) [verificado 2026-09-16] |
| **CapCut AI Relight** | App | Relight de video; no nombra el modelo [tercero] | [sin dato] | [sin dato] | Sin API conocida |

**Recomendación del estudio — NO medida todavía:**

- **Composites (objeto pegado):** Magnific con `preserve_details=true`, `change_background=false`, fuerza de
  transferencia moderada y la escena como imagen de referencia; o un editor por instrucción. En los dos casos,
  **volver a pegar después el objeto exacto** encima: el híbrido es lo que ya hace el pipeline (`place` toma el
  elemento de la imagen ORIGINAL y sólo deja al modelo el acabado).
- **Video:** Beeble SwitchX o ID-V2V (reiluminar un cuadro y propagarlo).
- **Antes de adoptar cualquiera:** canario contra `place --finish element` sobre el mismo composite, mirando al 100 %
  forma, texto y materiales del objeto. Conectar un candidato sigue la regla de §11.

---

<!-- INVENTARIO-GENERADO:INICIO -->
<!-- NO EDITAR A MANO: lo regenera `pnpm models:inventory --write` desde los contratos de código. -->

> **Inventario generado el 2026-10-03** desde `src/lib/ai/fal-capabilities.ts` y
> `src/lib/ai/higgsfield-capabilities.ts`. Es la lista COMPLETA de lo que `pnpm ai:fal` puede ejecutar
> —y por tanto de lo que puede **gastar**—. Si un id aparece acá y no tiene ficha en §5, la ficha es la que
> falta. La columna «verificado» es la fecha de una generación real nuestra; `—` significa que **nadie la
> ha corrido**, no que no funcione.

**Carril fal · 58 capacidades** (53 con corrida real)

| id | slug | tipo | operación | verificado |
|---|---|---|---|---|
| `flux-pro-fill` | `fal-ai/flux-pro/v1/fill` | image | inpaint | 2026-10-02 |
| `flux3-edit` | `blackforestlabs/flux-3/edit-video` | video | video-edit | 2026-09-16 |
| `flux3-enhance` | `blackforestlabs/flux-3/draft-enhance` | video | draft-enhance | 2026-09-16 |
| `flux3-extend` | `blackforestlabs/flux-3/extend-video` | video | video-extend | 2026-09-16 |
| `flux3-extend-draft` | `blackforestlabs/flux-3/extend-video/draft` | video | video-extend | 2026-09-16 |
| `flux3-flf` | `blackforestlabs/flux-3/first-last-frame-to-video` | video | first-last-frame-to-video | 2026-09-16 |
| `flux3-flf-draft` | `blackforestlabs/flux-3/first-last-frame-to-video/draft` | video | first-last-frame-to-video | 2026-09-16 |
| `flux3-i2v` | `blackforestlabs/flux-3/image-to-video` | video | image-to-video | 2026-09-16 |
| `flux3-i2v-draft` | `blackforestlabs/flux-3/image-to-video/draft` | video | image-to-video | 2026-09-16 |
| `flux3-keyframes` | `blackforestlabs/flux-3/keyframes-to-video` | video | keyframes-to-video | 2026-09-16 |
| `flux3-keyframes-draft` | `blackforestlabs/flux-3/keyframes-to-video/draft` | video | keyframes-to-video | 2026-09-16 |
| `flux3-t2v` | `blackforestlabs/flux-3/text-to-video` | video | text-to-video | 2026-09-16 |
| `flux3-t2v-draft` | `blackforestlabs/flux-3/text-to-video/draft` | video | text-to-video | 2026-09-16 |
| `h3-i2v` | `minimax/h3/image-to-video` | video | image-to-video | 2026-09-16 |
| `h3-i2v-lora` | `minimax/h3/image-to-video/lora` | video | image-to-video | 2026-09-16 |
| `h3-r2v` | `minimax/h3/reference-to-video` | video | reference-to-video | 2026-09-16 |
| `h3-r2v-lora` | `minimax/h3/reference-to-video/lora` | video | reference-to-video | 2026-09-16 |
| `h3-t2v` | `minimax/h3/text-to-video` | video | text-to-video | 2026-09-16 |
| `h3-t2v-lora` | `minimax/h3/text-to-video/lora` | video | text-to-video | — |
| `h3-train-flf2v` | `minimax/h3/flf2v/trainer` | training | lora-training | — |
| `h3-train-i2v` | `minimax/h3/i2v/trainer` | training | lora-training | — |
| `h3-train-ref2va` | `minimax/h3/ref2va/trainer` | training | lora-training | 2026-09-16 |
| `h3-train-t2v` | `minimax/h3/t2v/trainer` | training | lora-training | — |
| `h3max-camera` | `minimax/h3-max/camera-controls` | video | camera-control | 2026-09-16 |
| `h3max-director` | `minimax/h3-max/director` | video | realtime-stream | — |
| `h3max-i2v` | `minimax/h3-max/image-to-video` | video | image-to-video | 2026-09-16 |
| `h3max-r2v` | `minimax/h3-max/reference-to-video` | video | reference-to-video | 2026-09-16 |
| `h3max-t2v` | `minimax/h3-max/text-to-video` | video | text-to-video | 2026-09-16 |
| `h3turbo-i2v` | `minimax/h3-max-turbo/image-to-video` | video | image-to-video | 2026-09-16 |
| `h3turbo-t2v` | `minimax/h3-max-turbo/text-to-video` | video | text-to-video | 2026-09-16 |
| `iclight-v2` | `fal-ai/iclight-v2` | image | relight | 2026-10-03 |
| `image-apps-relighting` | `fal-ai/image-apps-v2/relighting` | image | relight | 2026-10-03 |
| `seedance20-fast-i2v` | `bytedance/seedance-2.0/fast/image-to-video` | video | image-to-video | 2026-09-16 |
| `seedance20-fast-r2v` | `bytedance/seedance-2.0/fast/reference-to-video` | video | reference-to-video | 2026-09-16 |
| `seedance20-fast-t2v` | `bytedance/seedance-2.0/fast/text-to-video` | video | text-to-video | 2026-09-16 |
| `seedance20-i2v` | `bytedance/seedance-2.0/image-to-video` | video | image-to-video | 2026-09-16 |
| `seedance20-mini-i2v` | `bytedance/seedance-2.0/mini/image-to-video` | video | image-to-video | 2026-09-16 |
| `seedance20-mini-r2v` | `bytedance/seedance-2.0/mini/reference-to-video` | video | reference-to-video | 2026-09-16 |
| `seedance20-mini-t2v` | `bytedance/seedance-2.0/mini/text-to-video` | video | text-to-video | 2026-09-16 |
| `seedance20-r2v` | `bytedance/seedance-2.0/reference-to-video` | video | reference-to-video | 2026-09-16 |
| `seedance20-t2v` | `bytedance/seedance-2.0/text-to-video` | video | text-to-video | 2026-09-16 |
| `seedance20-us-i2v` | `bytedance/seedance-2.0/us/image-to-video` | video | image-to-video | 2026-09-16 |
| `seedance20-us-r2v` | `bytedance/seedance-2.0/us/reference-to-video` | video | reference-to-video | 2026-09-16 |
| `seedance20-us-t2v` | `bytedance/seedance-2.0/us/text-to-video` | video | text-to-video | 2026-09-16 |
| `seedance25-i2v` | `bytedance/seedance-2.5/image-to-video` | video | image-to-video | 2026-09-16 |
| `seedance25-r2v` | `bytedance/seedance-2.5/reference-to-video` | video | reference-to-video | 2026-09-16 |
| `seedance25-t2v` | `bytedance/seedance-2.5/text-to-video` | video | text-to-video | 2026-09-16 |
| `seedream5-lite` | `bytedance/seedream/v5/lite/text-to-image` | image | text-to-image | 2026-09-16 |
| `seedream5-lite-edit` | `bytedance/seedream/v5/lite/edit` | image | edit | 2026-09-16 |
| `seedream5-pro` | `bytedance/seedream/v5/pro/text-to-image` | image | text-to-image | 2026-09-16 |
| `seedream5-pro-edit` | `bytedance/seedream/v5/pro/edit` | image | edit | 2026-09-16 |
| `seedream5-pro-layerize` | `bytedance/seedream/v5/pro/layerize` | image | layerize | 2026-09-16 |
| `wan3-i2v` | `alibaba/wan-3.0/image-to-video` | video | image-to-video | 2026-09-16 |
| `wan3-r2v` | `alibaba/wan-3.0/reference-to-video` | video | reference-to-video | 2026-09-16 |
| `wan3-t2v` | `alibaba/wan-3.0/text-to-video` | video | text-to-video | 2026-09-16 |
| `wan3prime-i2v` | `alibaba/wan-3.0-prime/image-to-video` | video | image-to-video | 2026-09-16 |
| `wan3prime-r2v` | `alibaba/wan-3.0-prime/reference-to-video` | video | reference-to-video | 2026-09-16 |
| `wan3prime-t2v` | `alibaba/wan-3.0-prime/text-to-video` | video | text-to-video | 2026-09-16 |

**Carril Higgsfield · 44 capacidades** (4 con corrida real)

| id | slug | tipo | operación | verificado |
|---|---|---|---|---|
| `hf-grok-image2` | `xai/grok-imagine-image-2.0` | image | image-edit | — |
| `hf-grok-video15-r2v` | `xai/grok-imagine-video/v1.5/reference-to-video` | video | reference-to-video | — |
| `hf-h3-t2v` | `minimax/h3/text-to-video` | video | text-to-video | — |
| `hf-hailuo23-t2v` | `minimax/hailuo-2.3/standard/text-to-video` | video | text-to-video | — |
| `hf-happyhorse1-t2v` | `alibaba/happy-horse/text-to-video` | video | text-to-video | — |
| `hf-happyhorse11-t2v` | `alibaba/happy-horse/v1.1/text-to-video` | video | text-to-video | — |
| `hf-ideogram4` | `ideogram/v4.0` | image | text-to-image | 2026-09-17 |
| `hf-kling-o3-flf` | `kling-video/o3/first-last-frame` | video | first-last-frame | — |
| `hf-kling-omni-flf` | `kling-video/omni/first-last-frame` | video | first-last-frame | — |
| `hf-kling25turbo-i2v` | `kling-video/v2.5-turbo/standard/image-to-video` | video | image-to-video | — |
| `hf-kling26-pro-t2v` | `kling-video/v2.6/pro/text-to-video` | video | text-to-video | — |
| `hf-kling3-4k-i2v` | `kling-video/v3.0/4k/image-to-video` | video | image-to-video | — |
| `hf-kling3-4k-t2v` | `kling-video/v3.0/4k/text-to-video` | video | text-to-video | — |
| `hf-kling3-pro-i2v` | `kling-video/v3.0/pro/image-to-video` | video | image-to-video | — |
| `hf-kling3-pro-t2v` | `kling-video/v3.0/pro/text-to-video` | video | text-to-video | — |
| `hf-kling3-std-i2v` | `kling-video/v3.0/std/image-to-video` | video | image-to-video | — |
| `hf-kling3-std-t2v` | `kling-video/v3.0/std/text-to-video` | video | text-to-video | — |
| `hf-kling3turbo-i2v` | `kling-video/v3.0-turbo/image-to-video` | video | image-to-video | — |
| `hf-kling3turbo-t2v` | `kling-video/v3.0-turbo/text-to-video` | video | text-to-video | — |
| `hf-ltx25-fast` | `lightricks/ltx-2.5/text-to-video/fast` | video | text-to-video | — |
| `hf-ltx25-pro` | `lightricks/ltx-2.5/text-to-video/pro` | video | text-to-video | — |
| `hf-marketing-studio` | `marketing-studio/image` | image | image-edit | — |
| `hf-pixverse6-t2v` | `pixverse/v6/text-to-video` | video | text-to-video | — |
| `hf-qwen-image3` | `alibaba/qwen-image-3/text-to-image` | image | text-to-image | 2026-09-17 |
| `hf-recraft41` | `recraft/v4.1/text-to-image` | image | text-to-image | — |
| `hf-recraft41-pro` | `recraft/v4.1/pro/text-to-image` | image | text-to-image | 2026-09-17 |
| `hf-seedance2-i2v` | `bytedance/seedance-2.0/image-to-video` | video | image-to-video | — |
| `hf-seedance2-r2v` | `bytedance/seedance-2.0/reference-to-video` | video | reference-to-video | — |
| `hf-seedance2-t2v` | `bytedance/seedance-2.0/text-to-video` | video | text-to-video | — |
| `hf-seedance25-edit` | `bytedance/seedance-2.5/video-edit` | video | video-edit | — |
| `hf-seedance25-extend` | `bytedance/seedance-2.5/video-extend` | video | video-extend | — |
| `hf-seedance25-i2v` | `bytedance/seedance-2.5/image-to-video` | video | image-to-video | — |
| `hf-seedance25-r2v` | `bytedance/seedance-2.5/reference-to-video` | video | reference-to-video | — |
| `hf-seedance25-t2v` | `bytedance/seedance-2.5/text-to-video` | video | text-to-video | — |
| `hf-soul` | `higgsfield-ai/soul/standard` | image | text-to-image | — |
| `hf-soul-cinema` | `higgsfield-ai/soul/cinema` | image | text-to-image | — |
| `hf-soul2` | `higgsfield-ai/soul/v2/standard` | image | text-to-image | — |
| `hf-wan26-t2v` | `wan/v2.6/text-to-video` | video | text-to-video | — |
| `hf-wan27-t2v` | `wan/v2.7/text-to-video` | video | text-to-video | — |
| `hf-wan3-i2v` | `alibaba/wan-3.0/image-to-video` | video | image-to-video | — |
| `hf-wan3-r2v` | `alibaba/wan-3.0/reference-to-video` | video | reference-to-video | — |
| `hf-wan3-t2v` | `alibaba/wan-3.0/text-to-video` | video | text-to-video | — |
| `hf-wan3prime-t2v` | `alibaba/wan-3.0-prime/text-to-video` | video | text-to-video | — |
| `hf-zimage-turbo` | `z-image/turbo` | image | text-to-image | 2026-09-17 |

<!-- INVENTARIO-GENERADO:FIN -->

---

## 11. Regla de mantenimiento

Al **conectar**, **verificar** o **medir** un modelo (precio real, latencia, resolución nativa, rechazo de contenido), actualiza **en el mismo commit**:

1. `src/lib/ai/fal-capabilities.ts` (contrato, `verifiedAt`, precio, notas) o `src/lib/ai/openai-image.ts` según el carril.
2. `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` (o `GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` para OpenAI/Gemini).
3. **Esta guía**: árbol (§2/§3), matriz (§4), ficha (§5), tabla de costo (§7.1), brechas/pendientes (§8) y, si cambió un ranking, §9 con fecha.
4. `docs/manual-de-uso/ai-tooling/operar-cli-fal-seedream-seedance.md` si cambian comandos o flags.

Reglas: sube la versión de este documento (menor si agregas/corriges datos; mayor si cambias estructura); cada dato nuevo con etiqueta de evidencia y fecha; nunca borres una contradicción resuelta sin dejar la evidencia que la resolvió; rankings siempre con fecha y fuente.

---

## 12. Fuentes

Leídas el 2026-09-16 salvo otra fecha indicada.

**Repo (contrato y verificación)**
- `src/lib/ai/fal-capabilities.ts` · `src/lib/ai/fal.ts` · `scripts/ai/fal-image.ts` · `src/lib/ai/openai-image.ts` · `scripts/ai/generate-image.ts` · `src/lib/ai/image-generator.ts`
- `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` · `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` · `docs/manual-de-uso/ai-tooling/operar-cli-fal-seedream-seedance.md`
- `.claude/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md` · `.claude/skills/greenhouse-ai-image-generator/SKILL.md` · `.claude/skills/greenhouse-ai-image-generator/references/seedream-5-gpt-image-2-hybrid-production.md`
- OpenAPI de cola de fal: `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<slug>`

**OpenAI [oficial]**
- O1 https://developers.openai.com/api/docs/guides/image-generation
- O2 https://developers.openai.com/_astro/GptImageTokenCalculator.react.yz8GdjDh.js (fórmula de tokens; el hash puede cambiar)
- O3 https://developers.openai.com/api/docs/models/gpt-image-2.5-flare
- O4 https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst
- O5 https://developers.openai.com/api/docs/models/gpt-image-2
- O6 https://developers.openai.com/api/docs/pricing
- O7 https://developers.openai.com/api/docs/changelog (Sep 8, 2026) · https://developers.openai.com/api/docs/deprecations
- O8 https://openai.com/index/introducing-chatgpt-images-2-5/ · https://deploymentsafety.openai.com/chatgpt-images-2-5

**ByteDance Seedream / fal [oficial]**
- B1 https://seed.bytedance.com/en/blog/beyond-generation-it-understands-design-introducing-seedream-5-0-pro
- B2 https://docs.byteplus.com/en/docs/ModelArk/2582774
- B3 https://docs.byteplus.com/en/docs/ModelArk/1541523
- B4 https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image
- B5 https://fal.ai/models/bytedance/seedream/v5/pro/edit
- B6 https://fal.ai/models/bytedance/seedream/v5/pro/layerize
- B7 https://fal.ai/models/bytedance/seedream/v5/lite/text-to-image
- B8 https://fal.ai/models/bytedance/seedream/v5/lite/edit
- B9 [tercero] https://openrouter.ai/bytedance-seed/seedream-5-0-pro · https://www.atlascloud.ai/blog/ai-updates/seedream-5-0-pro-price (sin fecha verificada)

**Video**
- V1 https://fal.ai/models/bytedance/seedance-2.5/reference-to-video
- V2 https://fal.ai/models/bytedance/seedance-2.5/text-to-video
- V3 https://fal.ai/models/bytedance/seedance-2.0/us/text-to-video
- V4 https://fal.ai/models/bytedance/seedance-2.0/mini/text-to-video
- V5 https://fal.ai/seedance-2.0
- V6 https://fal.ai/models/bytedance/seedance-2.0/fast/image-to-video
- V7 https://www.minimax.io/blog/minimax-h3
- V8 https://blog.fal.ai/introducing-h3-max-by-fal/
- V9 https://fal.ai/models/minimax/h3/text-to-video
- V10 https://fal.ai/models/minimax/h3-max/text-to-video
- V11 https://fal.ai/models/minimax/h3-max-turbo/text-to-video
- V12 https://fal.ai/models/minimax/h3-max/director
- V13 https://fal.ai/models/minimax/h3/t2v/trainer
- V14 https://fal.ai/models/minimax/h3-max/camera-controls
- V17 https://fal.ai/models/alibaba/wan-3.0/text-to-video
- V18 https://fal.ai/models/alibaba/wan-3.0-prime/text-to-video
- V19 https://www.alibabacloud.com/blog/wan3-0-30-second-ai-video-generation-from-any-input_603452 (2026-08-13)
- V20 https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-guide · https://www.alibabacloud.com/help/en/model-studio/wan3-0-video-prime
- V21 https://bfl.ai/blog/flux-3-video
- V22 https://docs.bfl.ml/flux_3/flux3_overview
- V23 https://fal.ai/models/blackforestlabs/flux-3/text-to-video
- V24 https://fal.ai/models/blackforestlabs/flux-3/text-to-video/draft
- V25 https://fal.ai/models/blackforestlabs/flux-3/extend-video
- V26 https://fal.ai/models/blackforestlabs/flux-3/edit-video
- V27 https://fal.ai/flux-3
- V57 https://bfl.ai/legal/developer-terms-of-service · https://bfl.ai/legal/flux-api-service-terms

**Rankings y terceros [tercero]**
- R1 https://openart.ai/arena/leaderboard (2026-09-16)
- R2 https://arena.ai/leaderboard/text-to-image (act. 2026-09-07)
- R3 https://arena.ai/leaderboard/image-edit (act. 2026-09-07)
- R4 https://artificialanalysis.ai/image/leaderboard/text-to-image (leído 2026-09-16)
- R5 https://artificialanalysis.ai/image/leaderboard/editing (leído 2026-09-16)
- V28 https://artificialanalysis.ai/video/leaderboard/text-to-video (leído 2026-09-16)
- V29 https://artificialanalysis.ai/video/leaderboard/image-to-video (leído 2026-09-16)
- V31 https://picsart.com/blog/wan-3-0-vs-wan-3-0-prime/ (2026-08-31)
- V32 https://thenextweb.com/news/bytedance-seedance-2-5-ai-video-4k-30-seconds
- V33 https://technode.com/2026/07/31/bytedance-launches-seedance-2-5-video-generation-model/
- V34 https://en.wikipedia.org/wiki/Seedance_2.0
- V35 https://www.mindstudio.ai/blog/seedance-2-5-vs-wan-3-flux-3-miniax-h3 (2026-08-12)
- V36 https://www.seedance.tv/blog/seedance-2-5-review-2026
- V37 https://www.seedance.tv/blog/seedance-2-5-lip-sync-issues
- V38 https://www.mindstudio.ai/blog/seedance-2-5-review-guide
- V39 https://natlawreview.com/press-releases/seedance-20-api-now-live-fal
- V40 https://aiseedance25.app/seedance-2-5-1080p · https://apiframe.ai/guides/seedance-2-5-guide
- V43 https://the-decoder.com/bytedance-rolls-out-seedance-2-0-to-100-countries-but-keeps-the-us-off-the-list/
- V44 https://www.orcarouter.ai/blog/flux-3-video-vs-bytedance-seedance-2
- V45 https://www.mindstudio.ai/blog/seedance-2-0-content-restrictions-workarounds
- V46 https://phemex.com/news/article/bytedance-relaunches-seedance-20-globally-with-restrictions-on-realface-uploads-68605
- V47 https://huggingface.co/blog/ResterChed/minimax-h3-hailuo-3-0
- V48 https://www.atlascloud.ai/blog/tips/minimax-h3-commercial-use-license
- V49 https://pollo.ai/hub/minimax-h3-review · https://www.atlascloud.ai/blog/tips/minimax-h3-chinese-dialogue-accuracy
- V50 https://www.deeplearning.ai/the-batch/minimaxs-state-of-the-art-video-model-is-only-minimally-open
- V51 https://www.techtimes.com/articles/322904/20260804/minimax-h3-open-weights-exclude-us-eu-uk-korea-local-deployment.htm
- V53 https://www.prnewswire.com/news-releases/fal-launches-h3-max-a-new-post-trained-video-model-with-frontier-quality-and-faster-than-real-time-generation-302866462.html
- V54 https://www.marktechpost.com/2026/07/26/black-forest-labs-releases-flux-3-a-multimodal-flow-model-for-image-video-audio-and-robot-action-prediction/
- V55 https://datanorth.ai/news/black-forest-labs-releases-flux-3
- V56 https://morphic.com/resources/compare/seedance-2-5-vs-flux-3 · https://www.digitalapplied.com/blog/flux-3-vs-seedance-2-5-gemini-omni-video-field-2026
- V58 https://technode.com/2026/08/24/alibaba-launches-wan3-0-video-model-with-30-second-generation-and-document-input/
- V59 https://openrouter.ai/alibaba/wan-3.0-prime
- V60 https://wavespeed.ai/blog/ai-comparisons/wan-3-0-prime-vs-standard/ · https://www.atlascloud.ai/blog/tips/wan-3.0-prime
- V61 https://help.aliyun.com/en/model-studio/wan3-video-generation-api-reference
- V62 https://www.atlascloud.ai/blog/tips/wan-3.0-multi-shot-consistency · https://www.buildfastwithai.com/blogs/wan-3-0-review-accuracy-price-is-it-worth-it-2026
- V63 https://www.atlascloud.ai/blog/tips/is-wan-3.0-open-source
- V64 https://github.com/AlibabaCloud-Official/Wan3.0
