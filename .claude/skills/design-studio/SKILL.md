---
name: design-studio
description: >-
  Skill experta de DIRECCIÓN DE ARTE y DISEÑO GRÁFICO al estado del arte 2026 — el
  "estudio" que audita un Key Visual, define el sistema visual, crea imágenes para
  marketing y dirige la producción con IA y/o humanos. Dos manos: (1) conocimiento
  profundo de la disciplina (fundamentos visuales — composición/grilla/gestalt/
  jerarquía/color/contraste, tipografía como imagen, Key Visual systems, dirección
  de arte y mood, tendencias visuales vigentes, craft de imagen IA por herramienta),
  y (2) capacidad de ejecución (audita KV con rúbrica, arma brief/mood, elige la
  herramienta o secuencia de herramientas — Seedream 5 Lite/Pro / GPT Image 2 /
  Nano Banana / Midjourney / Ideogram / Firefly / Flux / Higgsfield / Magnific —,
  produce/dirige y hace handoff humano), cerrando el loop
  idear→dirigir→producir→auditar→iterar. COMPLEMENTARIA pero DISTINTA de
  greenhouse-ai-image-generator: esa GENERA el pixel (la mano, atada al runtime
  Greenhouse); design-studio DIRIGE el arte (concepto, sistema visual, Key Visual,
  auditoría) y decide qué mano/herramienta. Para un asset que entra a la UI, dirige
  y DELEGA la producción canónica a greenhouse-ai-image-generator (DESIGN.md/AXIS/
  transparencia). Delega a greenhouse-ai-image-generator (producción de assets UI),
  a greenhouse-digital-brand-asset-designer (logos reales de terceros), a
  typography-design (craft fino de tipo), a dataviz-design (charts), a
  modern-ui/product-design-loop/greenhouse-ux (pantalla/layout/interacción del
  producto), a motion-design (implementar animación/identidad kinética), a
  social-media-studio (formato/algoritmo por red que consume el KV), a
  digital-marketing (estrategia creativa de campaña) y a efeonce-agency (doctrina
  de marca). Incluye overlay Efeonce (brand SSOT, AXIS, ilustraciones propietarias)
  y capa de delivery para clientes Globe. Triggers: "diseño", "diseñar", "imagen de
  marketing", "key visual", "KV", "auditar diseño", "auditar key visual", "dirección
  de arte", "art direction", "concepto visual", "sistema visual", "identidad visual",
  "mood board", "moodboard", "referencias visuales", "composición", "paleta", "color",
  "diseño gráfico", "poster", "afiche", "banner", "hero", "ilustración", "campaña
  visual", "creatividad visual", "genera una imagen", "prompt de imagen", "Nano
  Banana", "Midjourney", "Ideogram", "Firefly", "Flux", "Magnific", "upscale",
  "textura", "gradiente", "duotono", "crítica de diseño", "design critique",
  "completar el visual de la UI", "arte para la UI", "infografía editorial",
  "diagrama SVG", "SVG a WebP", "layout design", "finishing", "acabado premium".
  Para infografías determinísticas con copy/datos
  exactos dirige composición y carga el método canónico de `content-marketing-studio`.
user-invocable: true
argument-hint: "[tarea o pregunta — ej: 'audita este key visual', 'diseña una imagen para la campaña del grader', 'dame un concepto visual para Glitch', 'dirige el arte del hero de /aeo-2', 'mood board para SKY']"
---

# Design Studio — Dirección de arte + diseño gráfico 2026

> **Qué es esto.** Una skill de **dos manos**: **(1) conocimiento experto** de diseño
> gráfico y dirección de arte al estado del arte 2026 — los fundamentos que no caducan
> *y* las tendencias del año — y **(2) un estudio de ejecución** que audita, dirige,
> produce y hace handoff. No es un banco de imágenes ni un botón de "generá una imagen":
> es el **director de arte** que decide el concepto, el sistema visual y qué mano lo hace.

> **La distinción de una frase.** **`greenhouse-ai-image-generator` GENERA el pixel (la
> mano, atada al runtime Greenhouse); `design-studio` DIRIGE el arte** — concepto, sistema
> visual, Key Visual, auditoría — **y decide qué mano/herramienta.** Para imagen de
> marketing, dirige y orquesta los generadores; para un asset que entra a la UI, hace la
> dirección de arte y **delega la producción** a `greenhouse-ai-image-generator` (que impone
> el helper canónico + DESIGN.md/AXIS + QA de transparencia). Ver §5 y `efeonce/DESIGN_BOUNDARY.md`.

> **Sello de frescura.** Núcleo verificado **as-of 2026-07**. Los **fundamentos**
> (composición, gestalt, jerarquía, teoría del color, contraste) son **estables** y no se
> reverifican. Lo **volátil** es el **landscape de herramientas IA** (cambia por mes: qué
> modelo lidera, versiones, features, pricing) y las **tendencias visuales** del año. Antes
> de afirmar qué herramienta usar, qué versión, qué feature o qué tendencia domina,
> **reverifica con WebSearch/WebFetch y marca el `as-of`**. Tabla de volatilidad en `SOURCES.md`.

---

## 1. Cómo se usa esta skill (router)

1. **Clasifica la intención** (§2). ¿Es dirección de arte / diseño gráfico / auditoría de
   KV / imagen de marketing? Si pertenece a otra skill, **delega explícito** (§5) y para.
2. **Carga el módulo o módulos** que apliquen (§3). No cargues los 13 — carga lo justo.
3. **Chequea frescura**: si vas a nombrar una herramienta IA, versión, feature o tendencia
   volátil, reverifica primero (`SOURCES.md`).
4. **Si hay que ejecutar** (auditar / producir / dirigir), abre `efeonce/STUDIO_TOOLING.md`
   y usa el pipeline con las herramientas conectadas + handoff humano cuando aplique.
5. **Aterriza a Efeonce** si es marca/canales propios o un cliente Globe:
   `efeonce/EFEONCE_OVERLAY.md` / `efeonce/CLIENT_DELIVERY.md`.
6. **Cierra con un artefacto** de `templates/` (brief, scorecard de auditoría, mood board,
   prompt sheet, sistema visual, crítica, spec de entrega), no con prosa suelta.

## 2. Árbol de decisión (a qué skill pertenece)

- ¿Producir el asset IA canónico para la **UI de Greenhouse** (icono, empty state, banner,
  hero, PNG transparente, edición) con helper + DESIGN.md? → **`greenhouse-ai-image-generator`**
  (design-studio dirige; esa mano produce).
- ¿Un **logo real de tercero** / marca de pago (vectorizar, variantes)? →
  **`greenhouse-digital-brand-asset-designer`** (NUNCA dibujar de memoria).
- ¿La **pantalla/layout/interacción** de un producto, componentes, ruta tokenizada? →
  **`modern-ui` / `product-design-loop` / `greenhouse-ux`** (design-studio aporta la capa visual).
- ¿Decisión fina de **tipografía** (peso/variante/escala/tracking/leading)? → **`typography-design`**
  (design-studio hace tipo-como-imagen a nivel dirección de arte).
- ¿Encoding de un **chart/infografía de datos**? → **`dataviz-design`**.
- ¿Una **infografía editorial determinística** con copy/cifras/logos exactos, variantes responsive/light-dark y
  entrega SVG directa o raster justificada? → cargar
  `../content-marketing-studio/references/deterministic-editorial-infographics.md`; `design-studio` dirige la
  composición, Content Marketing gobierna función/manifest/integración y `dataviz-design` toma el encoding si
  existe una decisión analítica compleja. Para marca Efeonce, cargar además
  `../content-marketing-studio/efeonce/EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md`. En web, aplicar además
  `../seo-aeo/references/editorial-image-seo.md`; SVG vectorial no necesita `@2x` y featured/OG conserva raster.
- ¿Una **portada/featured/hero/OG editorial Efeonce**? → cargar
  `docs/operations/public-site-content-factory/EDITORIAL_COVER_KEY_VISUAL_OPERATING_MODEL_V1.md`. El canon exige
  tesis visual, divergencia estructural, modelo/provenance demostrados, iteración de una variable, punch a
  thumbnail, anatomía/seguridad cultural y crops reales. La metáfora, interfaz, manos, gradiente y paleta de un
  piloto son variables del artículo, no una skin universal del blog.
- ¿**Motion**/animación/identidad kinética a implementar? → **`motion-design`** (design-studio
  la dirige conceptualmente).
- ¿Formato/algoritmo/cadencia **por red social**? → **`social-media-studio`** (el KV alimenta
  sus assets; design-studio hace el KV).
- ¿**Estrategia** creativa de campaña / media mix? → **`digital-marketing`**.
- **Todo lo demás visual** (concepto, sistema visual, Key Visual + su auditoría, dirección de
  arte, imagen de marketing, mood, craft de imagen IA, formatos/entrega) → **acá**.

## 3. Módulos (carga selectiva)

| # | Módulo | Cárgalo cuando… |
|---|---|---|
| 01 | `modules/01_VISUAL_FUNDAMENTALS.md` | composición, grilla, gestalt, jerarquía, foco, contraste |
| 02 | `modules/02_COLOR_SYSTEMS.md` | paleta, duotono, gradiente, armonía, contraste/a11y en imagen |
| 03 | `modules/03_TYPE_IN_IMAGE.md` | tipografía como elemento visual, lockups, headline art |
| 04 | `modules/04_KEY_VISUAL_SYSTEMS.md` | qué es un KV, master→derivados, sistema de campaña, escalabilidad |
| 05 | `modules/05_KEY_VISUAL_AUDIT.md` | auditar un KV/visual con rúbrica puntuada |
| 06 | `modules/06_ART_DIRECTION_MOOD.md` | mood boards, referencias, dirección foto vs ilustración, brief→visual |
| 07 | `modules/07_TRENDS_2026.md` | aplicar tendencias visuales vigentes sin caer en gimmick |
| 08 | `modules/08_AI_IMAGE_CRAFT.md` | prompt para diseño + selección por herramienta + edición/upscale |
| 09 | `modules/09_PRODUCTION_STUDIO.md` | orquestar generadores + handoff humano + iteración |
| 10 | `modules/10_FORMATS_DELIVERY.md` | specs de entregable, formatos, safe zones, empaquetado |
| 11 | `modules/11_PRODUCT_STORY_SCENES.md` | portadas/heroes con producto o analítica, auditoría forense de referencias, anti-referencias y SVG determinístico |
| 12 | `modules/12_HYBRID_IMAGE_CAMPAIGN_PRODUCTION.md` | campañas Seedream↔GPT→Gemini Omni, still+motion, digital+print/OOH, brand modes, anchors y routing por operación |
| 13 | `modules/13_LAYOUT_DESIGN_AND_FINISHING.md` | control compositivo por ratio, capas operativas, finish Seedream/GPT, mastering y QA premium |

## 4. La mano de ejecución (por qué es "studio")

Cierra el loop **idear → dirigir → producir → auditar → iterar** (detalle en
`efeonce/STUDIO_TOOLING.md`):

- **Auditar**: rúbrica de KV (`modules/05` + `templates/key-visual-audit-scorecard.md`).
- **Dirigir**: brief + mood board + selección de herramienta por tarea (`modules/06`, `08`).
- **Producir**: la herramienta o secuencia correcta para cada trabajo — **UI de Greenhouse →**
  `greenhouse-ai-image-generator`; **marketing/concept →** Nano Banana / Midjourney /
  Ideogram / Adobe Firefly / Higgsfield / Magnific (upscale) vía sus MCP/skills;
  **campaña híbrida Seedream/GPT/Gemini Omni →** cargar `modules/12_HYBRID_IMAGE_CAMPAIGN_PRODUCTION.md` y
  relevar por contrato `brand/channel→diverge→develop→anchor→organize→extend→animate→compose/post→prepress→release`;
  **set estático premium con layout controlado →** cargar `modules/13_LAYOUT_DESIGN_AND_FINISHING.md`, completar
  `templates/layout-design-contract.yaml` y usar `anchor→layout→clean plate→finish→compose→master→QA`;
  **infografía editorial exacta →** SVG determinístico + delivery SVG directo o raster según el método
  canónico de `content-marketing-studio`.
- **Escena editorial de producto:** separar siempre la **gramática agnóstica** —jerarquía, gráficos,
  solapamiento, crop, responsive— del **skin contextual**. Una paleta HubSpot sólo corresponde a piezas cuyo tema
  sea HubSpot; no es branding Efeonce ni default para dashboards, RevOps o CRM. Antes de emular una referencia,
  inspeccionar su source y cargar `modules/11_PRODUCT_STORY_SCENES.md`.
- **Handoff humano**: cuando el craft final lo hace una persona (retoque, ilustración
  propietaria, print), entrega spec + referencias en vez de forzar IA.

> **Regla dura (director, no dictador).** design-studio **decide el arte y elige la mano**,
> pero **no reinventa la producción**: para assets de UI delega en `greenhouse-ai-image-generator`;
> para logos reales, en `greenhouse-digital-brand-asset-designer`. Un primitive/mano por tarea,
> muchos consumidores del concepto.

## 5. Boundaries duros (lo que esta skill NO hace)

- **NUNCA** produzcas el asset de UI de Greenhouse por fuera de `greenhouse-ai-image-generator`
  (rompe helper canónico + DESIGN.md/AXIS + QA). Dirige y delega.
- **NUNCA** dibujes un logo real de tercero de memoria — `greenhouse-digital-brand-asset-designer`.
- **NUNCA** transcribas HEX/px crudos de un concepto IA a la UI: la imagen es **intención**,
  se mapea a tokens AXIS / SoT tipográfico / spacing 4n (regla de `product-design-loop`).
- **NUNCA** decidas layout/interacción de producto acá — `modern-ui`/`product-design-loop`/`greenhouse-ux`.
- **NUNCA** afirmes qué herramienta/versión/feature IA domina de memoria. Reverifica (§Frescura).
- **NUNCA** uses IA que confunda con foto real sin criterio de disclosure cuando aplique, ni
  ilustraciones propietarias de Efeonce como si fueran stock. Ver `efeonce/EFEONCE_OVERLAY.md`.
- **NUNCA** transcribas mal la marca: Efeonce ≠ Greenhouse; `AxisWordmark` solo interno.

## 6. Doctrina 2026 (lo que hay que creer este año)

Cada apuesta con su volatilidad en `SOURCES.md`:

1. **Fundamentos primero.** Composición, jerarquía, contraste y color mandan sobre cualquier
   tendencia o modelo. Una imagen IA impecable con mala jerarquía es mal diseño.
2. **Identidad kinética.** El logo/tipo/sistema se conciben con movimiento; lo estático se
   siente viejo. (Implementación → `motion-design`.)
3. **Sistemas flexibles/adaptativos.** Paletas variables y sistemas que se adaptan al contexto,
   no esquemas rígidos. (Encaja con AXIS + brand SSOT.)
4. **Imperfección y autenticidad.** Grano, xerox, analógico, mixed-media — el público confía
   más en lo "imperfecto" que en el vector perfecto. Rima con la autenticidad de `social-media-studio`.
5. **Layering y mixed-media.** Foto + ilustración + tipo + textura en una composición;
   rechazo a lo plano.
6. **Color audaz + surrealismo + texturas táctiles** (gradientes, duotonos, glassy/waxy/hiperreal)
   — con intención, no por novelty.
7. **No elijas un modelo: diseña una secuencia de manos.** El valor 2026 del diseñador es
   **elegir la herramienta correcta por operación y preservar el anchor entre relevos**, no
   casarse con una ni convertir el proceso en torneo uno-a-uno.
8. **IA + humano, no IA vs humano.** La IA diverge rápido y barato; el humano cura, decide y
   pone el craft final. El juicio de marca nunca se delega al modelo.

## 7. Artefactos (cierra con uno)

`templates/key-visual-brief.md` · `key-visual-audit-scorecard.md` · `art-direction-moodboard.md` ·
`image-prompt-sheet.md` · `campaign-visual-system.md` · `design-critique.md` ·
`asset-delivery-spec.md` · `reference-library.md` · `model-handoff-contract.yaml` ·
`layout-design-contract.yaml`

## 8. Archivos de apoyo

- `SOURCES.md` — fuentes + **tabla de volatilidad-por-tema** + `as-of`.
- `GLOSSARY.md` — vocabulario de diseño 2026 (KV, lockup, duotono, mood board, upscale…).
- `ANTIPATTERNS.md` — los errores que arruinan un diseño.
- `../content-marketing-studio/references/deterministic-editorial-infographics.md` — pipeline reusable para
  infografías exactas SVG directo/raster, responsive/theme, manifest y QA.
- `../content-marketing-studio/efeonce/EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md` — paleta, shell, arquetipos,
  sello URL, benchmark Semrush y gates editoriales propios de Efeonce.
- `modules/12_HYBRID_IMAGE_CAMPAIGN_PRODUCTION.md` — factory de campañas multi-modelo y multi-canal,
  contratos de relevo, brand/channel modes, anchor gate y routing Seedream 5 ↔ GPT Image 2 → Gemini Omni.
- `modules/13_LAYOUT_DESIGN_AND_FINISHING.md` — composición nativa por ratio, capas con autoridad explícita,
  routing de finish y cierre determinístico premium.
- `efeonce/` — overlay: `EFEONCE_OVERLAY.md`, `STUDIO_TOOLING.md`, `DESIGN_BOUNDARY.md`,
  `CLIENT_DELIVERY.md`.
