# 08 · Craft de imagen IA para diseño

> **Sello de frescura.** El **landscape de herramientas es VOLÁTIL** — cambia por mes: quién
> lidera, versiones, features, pricing. Verificado **as-of 2026-07 — reverificar**. La
> **estructura del prompt** y el **loop IA+humano** son estables. Antes de afirmar qué modelo
> usar o qué versión, reverifica (`SOURCES.md`) y ajusta el `as-of`.

> **Doctrina del año.** *No elijas un modelo — ten acceso a todos y sabe cuándo usar cada
> uno.* El valor 2026 no es dominar una herramienta, es **elegir la herramienta correcta por
> tarea** y dirigir el resultado. La IA es una mano rápida; el juicio de marca es tuyo.

> **Borde duro.** Si el asset **entra a la UI de Greenhouse**, no lo produzcas acá — dirige y
> **delega a `greenhouse-ai-image-generator`** (helper canónico + DESIGN.md/AXIS + QA de
> transparencia). Este módulo es craft de imagen **para diseño/marketing/concepto**, no la
> mano canónica del runtime. Ver `efeonce/DESIGN_BOUNDARY.md`.

---

## 1. Anatomía de un prompt para diseño

Un prompt de diseño no es "algo bonito". Es un **brief comprimido**. Orden canónico —
llena de lo más importante a lo accesorio; si el modelo trunca, que trunque lo accesorio:

| Bloque | Qué declara | Ejemplo |
|---|---|---|
| **Sujeto** | Qué es la imagen, foco principal | "un frasco de laboratorio translúcido" |
| **Composición** | Encuadre, regla, aire, punto focal, capas | "centrado, mucho aire arriba, plano cenital" |
| **Estilo** | Lenguaje visual, referencia de dirección | "editorial, mixed-media, collage sutil" |
| **Luz** | Dirección, dureza, temperatura, mood | "luz lateral suave, sombra larga, cálida" |
| **Paleta** | Colores dominantes + acento | "verde profundo + off-white, acento coral" |
| **Material / textura** | Superficie, tratamiento, grano | "vidrio glassy con refracción, grano fino" |
| **Formato / ratio** | Aspect ratio y orientación de salida | "3:2 horizontal, 4K" |
| **Negativos** | Qué NO quieres (según modelo lo soporte) | "sin texto, sin marca de agua, sin manos" |

**Reglas de escritura:**
- **Específico > adjetivos.** "luz lateral dura a 45°" vale más que "buena iluminación".
- **Un concepto por prompt.** Si necesitas dos ideas, haz dos generaciones y compón después.
- **Nombra la dirección, no imites un artista vivo.** Describe el *lenguaje* (editorial,
  brutalista, retro-futurista), no "estilo de [persona]".
- **El ratio se decide por destino** (ver `modules/10`): hero ≠ story ≠ OG image.
- **Referencia > descripción** cuando puedas: casi todos aceptan imagen de referencia; una
  ref de composición/paleta encierra el resultado mejor que 40 palabras.

Cierra siempre en `templates/image-prompt-sheet.md` — no dejes el prompt suelto en el chat.

## 2. Selección de modelo por tarea *(as-of 2026-07 — MUY volátil, reverificar mensual)*

> Todo este cuadro cambia por mes. Es un mapa de *fortalezas/debilidades relativas*, no un
> ranking eterno. La **matriz completa y canónica vive en `modules/14_ENTERPRISE_CREATIVE_MODEL_ROUTING.md`**
> y en su registry machine-readable;
> acá va la versión de trabajo. Antes de recomendar un modelo, reverifica.

### 2.1 Modelos de IMAGEN

| Modelo | Fuerte en | Débil en | Cuándo usarlo |
|---|---|---|---|
| **Gemini 2.5 Flash Image** (Vertex) | contexto, multirreferencia y edición conversacional bajo gobierno GCP | texto final y composición exacta siguen fuera del raster | ruta Google `core`; todo Google va directo por GCP |
| **Gemini 3.1 Flash Image** (Vertex) | contexto/multirreferencia con calidad/latencia | modelo base GA; 4K/video-input pueden seguir preview | `core` estratégico tras eval; directo GCP |
| **Gemini 3 Pro Image** (Vertex) | edición razonada/acabado premium | mayor coste/latencia | specialist premium directo GCP |
| **Gemini 3.1 Flash Lite Image** (Vertex) | volumen y baja latencia | lifecycle corto | scale directo GCP con refresh gate |
| **GPT Image 2** (OpenAI) | realismo, fidelidad al prompt, edición, texto, uso diario (top general) | estilo cinematográfico < MJ | default realista y de publishing diario; el repo ya lo usa (personaje Nexa) |
| **Seedream 5 Lite** (ByteDance vía fal.ai) | divergencia material rápida y barata, refs/edición de volumen | continuidad/anatomía de campaña antes del anchor | abrir 8–16 territorios y descartar barato |
| **Seedream 5 Pro** (ByteDance vía fal.ai) | riqueza material, color, atmósfera, fusión multirreferencia y edición regional semántica | layout extremo menos obediente en el benchmark; sin máscara/layers públicos | desarrollar el mundo visual y hacer art direction regional |
| **Midjourney v7** | **estética/dirección de arte**, cinematográfico, surreal/pictórico, concept | texto-en-imagen, control literal | mood boards, editorial, hero de alto concepto |
| **FLUX.2 Pro / 1.1 Pro** | calidad técnica, realismo, velocidad (~4.5s), **params de cámara** (focal/DoF/ángulo) | estética "de autor" | pre-viz de film/VFX, storyboard, realismo comercial; open-weight/self-host |
| **Ideogram 4** | **texto-en-imagen** (posters, thumbnails, headlines) | fotorrealismo fino | explorar lettering; el release tipográfico sigue siendo determinístico |
| **Recraft v4.1** | **vectores editables reales** (iconos, ilustración, sistemas) que escalan en Illustrator | fotorrealismo | cuando el entregable ES un SVG escalable/editable; logo final requiere validación humana |
| **Adobe Firefly** | workbench de edición/generación integrado con Adobe | ruta externa `watch`; términos/indemnidad dependen del endpoint y cliente | retoque asistido sólo tras rights review |
| ~~**Imagen 4**~~ (Vertex) | legacy | **deprecado; migración oficial a Gemini 2.5 Flash Image** | no usar en trabajo nuevo |

### 2.2 Modelos de VIDEO / motion *(design-studio dirige; producción → `social-media-studio` + Higgsfield)*

| Modelo | Fuerte en | Débil en | Cuándo usarlo |
|---|---|---|---|
| **Seedance 2.0** (ByteDance/Fal) | hasta 9 imágenes + 3 videos + 3 audios, native audio, 4–15 s y reference-to-video | requiere QA de acción, anatomía y continuidad | toma nueva o continuidad controlada por referencias; Seedance 2.5 no está verificado |
| **Veo 3.1 / Fast** (Google Vertex) | ruta premium/broadcast y ruta de escala GCP | costo/cupo y duración por endpoint | premium y scale; nunca vía Fal |
| **Kling 3 Pro/4K** (Fal) | first/last frame, elements, multi-shot y 4K | audio/idioma y concurrencia por endpoint | especialista 4K/control |
| **PixVerse V6** (Fal) | 1080p, audio, camera controls y buen costo/volumen | límites 1080p/duración | variantes social a escala |
| **Gemini Omni Flash** (Google Vertex) | reference/video edit + audio en un contexto | preview, 720p, máximo 10 s | `canary` conversacional con fallback |
| ~~**Sora 2** (OpenAI)~~ | físico/consistencia | **DEPRECADO** — API deprecada 2026-03-24, shutdown 2026-09-24 | **NO** basar nada nuevo en él |

### 2.3 Post-proceso y herramientas de mano

| Herramienta | Para qué |
|---|---|
| **Magnific** | upscale / enhance de alta calidad (subir resolución e inventar detalle plausible) |
| **Higgsfield** | video/imagen/audio/avatares consistentes (MCP conectado) |
| **`greenhouse-ai-image-generator`** | la mano canónica para todo asset que aterrice en la **UI de Greenhouse** |
| **`greenhouse-digital-brand-asset-designer`** | logos reales de terceros (nunca dibujar de memoria) |

**Regla de encaje (imagen):**
- **Marketing con copy dentro de la imagen** → Nano Banana Pro (o Ideogram si es puro headline).
- **Explorar dirección / mood / editorial** → Midjourney.
- **Vector/logo/icono/mascota escalable y editable** → Recraft.
- **Realismo + control de cámara / storyboard** → FLUX.2.
- **Realista diario / edición fiel** → GPT Image 2.
- **Divergencia de campaña barata** → Seedream 5 Lite.
- **Material/color/atmósfera o región semántica** → Seedream 5 Pro.
- **Campaña multi-modelo** → cargar `modules/12_HYBRID_IMAGE_CAMPAIGN_PRODUCTION.md`; usar
  Seedream para abrir/desarrollar y GPT para organizar/extender/reparar cuando ese routing
  corresponda al contrato, no como regla rígida de marca.
- **Cliente con Photoshop/Adobe workflow** → Firefly sólo después de revisar términos, indemnidad y derechos del endpoint.
- **Ya elegiste el frame y falta resolución** → Magnific (upscale).
- **UI de Greenhouse** → nada de esto: `greenhouse-ai-image-generator`.

**Regla de encaje (video):**
- **Control por referencias / social punchy / económico** → Seedance.
- **Broadcast / cine** → Veo 3.1.
- **Simple y barato** → Kling 3.0.
- **Edición conversacional preservando contexto** → Gemini Omni.
- **Nada nuevo sobre Sora 2** (deprecado).

> **Doctrina 2026 (repetida porque es load-bearing):** los profesionales que hacen el mejor
> trabajo IA **no son leales a un modelo** — usan varios y **emparejan cada tarea con la
> fortaleza del modelo**. La brecha entre "modelo correcto" y "modelo equivocado" para una
> tarea se ensanchó, no se cerró. Tu trabajo es elegir bien y dirigir el resultado.

## 3. El loop IA + humano

La IA **diverge barato**; el humano **cura y decide**. El loop:

```
brief → prompt (§1) → generar N variaciones (barato) → CURAR (humano elige 1–3)
       → editar/refinar (§4) → upscale si aplica → AUDITAR (rúbrica) → iterar o cerrar
```

- **Diverge con IA:** genera muchas opciones baratas antes de comprometerte. 4–12 miniaturas
  para leer dirección, no 1 "definitiva".
- **Cura como humano:** la decisión de cuál sirve es tuya, contra el brief y la marca — no la
  que el modelo "prefiere". El modelo no sabe de tu cliente.
- **Refina, no re-tires:** cuando algo está 80% bien, **edita** (§4); no vuelvas a rifar desde
  cero (pierdes el 80% que ya ganaste).
- **El craft final puede ser humano:** retoque, ilustración propietaria, composición fina →
  handoff con spec (`modules/09`).

## 4. Edición dirigida (más barato que regenerar)

Cuando la generación está casi, **edita el pixel** en vez de rifar de nuevo:

| Operación | Para qué | Cuándo |
|---|---|---|
| **Inpaint** | Reemplazar/corregir una zona (mano rara, objeto sobrante) | Falla local en una imagen buena |
| **Outpaint / expand** | Extender el lienzo, cambiar de ratio sin recortar | Necesitas 16:9 desde un 1:1 |
| **Upscale** | Subir resolución + detalle plausible (Magnific) | Frame elegido → entrega en alta |
| **Remove-bg** | Cutout / fondo transparente | Componer sobre otra capa; PNG héroe |
| **Reference / style-lock** | Fijar composición, paleta o personaje entre tomas | Serie coherente, campaña multi-pieza |

**Regla:** un fallo local no invalida una imagen buena. Inpaint > regenerar. Cada regeneración
completa es dinero y azar; la edición es cirugía barata.

## 5. Iteración por seeds y variaciones

- **Seed fija** = reproducibilidad. Congela la seed y cambia *una* variable (luz, paleta,
  material) para leer su efecto aislado — así aprendes qué mueve qué.
- **Variaciones sobre un ganador** = explora vecindad de una imagen que ya funciona, en vez de
  saltar a territorio nuevo.
- **Barrido controlado:** cambia un eje a la vez (A/B de luz, A/B de encuadre). Cambiar todo de
  golpe no te dice qué funcionó.

## 6. Gasto y disciplina (puente a `modules/09`)

Generar tiene costo variable y, dentro de Creative Studio, devenga Studio Credits sólo por la operación
generativa gobernada. **Dimensiona antes de producir en volumen.** Diverge barato en
miniaturas, elige, *después* subes calidad/cantidad de la elegida. No sacas 20 variantes en
4K de una dirección sin validar; sacas 12 miniaturas, eliges 2, y esas 2 van a 4K + upscale.
No confundas vendor spend con créditos, ni cobres la pieza, curaduría o QA como inferencia. Gobernanza completa
del gasto en `modules/09` y `efeonce/STUDIO_TOOLING.md`.

---

## 7. Boundaries del craft IA

- **NUNCA** produzcas asset de **UI de Greenhouse** acá → `greenhouse-ai-image-generator`.
- **NUNCA** transcribas HEX/px crudos de la imagen IA a la UI — la imagen es **intención**,
  se mapea a tokens AXIS / SoT tipográfico / spacing 4n al implementar.
- **NUNCA** afirmes qué modelo/versión/feature "domina" de memoria — reverifica (`SOURCES.md`).
- **NUNCA** uses IA que confunda con foto real sin criterio de disclosure cuando aplique.
- **NUNCA** trates una ilustración propietaria de Efeonce como stock generable (`efeonce/`).
- **NUNCA** imites por nombre a un artista vivo — describe el lenguaje visual.

> **Cierre.** El prompt es un brief comprimido; la herramienta se elige por tarea, no por
> lealtad; el humano cura. Diverge barato, decide con criterio, edita en vez de rifar, y cierra
> con `templates/image-prompt-sheet.md`. Si el destino es la UI, dirige y delega.
