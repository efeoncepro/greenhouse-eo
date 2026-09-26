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
  herramienta o secuencia de herramientas desde un portafolio enterprise gobernado — Seedream 5 Lite/Pro / GPT Image 2 /
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
> _y_ las tendencias del año — y **(2) un estudio de ejecución** que audita, dirige,
> produce y hace handoff. No es un banco de imágenes ni un botón de "genera una imagen":
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

Para **paid media / scroll-stop / estáticos e híbridos**, carga
[palancas visuales para ads](../efeonce-advertising-creative/references/paid-visual-attention-playbook.md).
Elige una hipótesis de atención, su ejecución y control; distingue contraste perceptual de semántico.
El recurso publicitario no reemplaza el registro fotográfico ni agrega enums a `foto:prompt`.



Para Marketing con Manzanitas, consultar la
[biblioteca gráfica](../../../docs/operations/social/MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md):
logos completos, versiones sin manzana y cinco símbolos; conservar el SVG original y distinguir
marca física integrada de gráfico plano. No inventar lockups con efeonce.

Para Nexa como personaje creativo, cargar
[su biblioteca de recursos](../../../docs/operations/social/NEXA_CREATIVE_RESOURCE_LIBRARY.md).
La identidad vigente es la Nexa humana fotorrealista confirmada el 2026-09-24: rostro de la familia Avatar A y
ocho vistas de continuidad con polera gris en `ai-generations/2026-09-20_identidad-julio-nexa/set-identidad/angulos/`.
Resolver vistas por `pnpm foto:prompt`; usar las poses OneDrive para gesto/cuerpo, nunca como ancla facial.
No recuperar el antiguo set sintético como rostro.
Para globos fotorealistas y continuidad, cargar
[la referencia de fotohistorias](../social-media-studio/references/dialogue-carousel-and-document-delivery.md).
Separar referencias de identidad de placas de escena; no extender textura de pared a rostros.

Para fotografía propia Efeonce, cargar
[`references/efeonce-photographic-language.md`](references/efeonce-photographic-language.md) y completar su
**preflight visual**: abrir imágenes aprobadas comparables antes de generar, declarar cómo se integra el color en
la composición sin forzar utilería y comparar los píxeles finales con esas referencias. Haber leído la guía o
reutilizado un prompt no lo cumple.

Para piezas de la marca propia Efeonce o su familia (Globe, Wave, Reach) con la **línea gráfica «La órbita»**
(canónica 2026-09-25: anillo, arco con esfera, halo; lente y foco), cargar
[`../efeonce-brand-studio/references/graphic-line-orbit.md`](../efeonce-brand-studio/references/graphic-line-orbit.md)
y el [manual V1](../../../docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md). Valores desde los tokens
AXIS `efeonceGraphicLine`, nunca HEX/px a mano; ningún texto cruza la órbita; una órbita o lente por pieza; URL en
burbuja `url-lum`. No aplica a UI de Greenhouse ni a clientes.

Cuando aparezca Julio, usar su identidad fotorrealista aprobada: `refs-aprobadas/` (11 referencias; `julio-ap-04`
primera opción de rostro y `julio-ap-11` de cuerpo) más `set-identidad/angulos/` (seis ángulos), ambos bajo
`ai-generations/2026-09-20_identidad-julio-nexa/`. Consultar el manifiesto y resolver vistas con `foto:prompt`;
no usar `julio-ap-02` como ancla —es una pieza compuesta— ni mezclar las fotos fuente/descartes con el set aprobado.
Canon: [`EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md`](../../../docs/operations/brand-photography/EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md).

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
7. Si el trabajo corre dentro de **Creative Studio / Efeonce Globe**, carga el Business Model y el Credit
   Model canónicos enlazados en `efeonce/CLIENT_DELIVERY.md`. Cotiza la producción generativa por operación;
   nunca conviertas una pieza, una hora o el costo de un provider en la unidad de crédito.

Para **ads con CTA**, aplicar [Tres voces + acción](../../../docs/operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md) junto con publicidad:
texto/contorno/relleno aprobados a demanda, CTA Poppins como función y no cuarta voz, aire medido respecto del sujeto
y firma. La superficie funcional de acción no autoriza tarjetas de contenido ni scrims sobre foto.

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

| #   | Módulo                                           | Cárgalo cuando…                                                                                                   |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 01  | `modules/01_VISUAL_FUNDAMENTALS.md`              | composición, grilla, gestalt, jerarquía, foco, contraste                                                          |
| 02  | `modules/02_COLOR_SYSTEMS.md`                    | paleta, duotono, gradiente, armonía, contraste/a11y en imagen                                                     |
| 03  | `modules/03_TYPE_IN_IMAGE.md`                    | tipografía como elemento visual, lockups, headline art                                                            |
| 04  | `modules/04_KEY_VISUAL_SYSTEMS.md`               | qué es un KV, master→derivados, sistema de campaña, escalabilidad                                                 |
| 05  | `modules/05_KEY_VISUAL_AUDIT.md`                 | auditar un KV/visual con rúbrica puntuada                                                                         |
| 06  | `modules/06_ART_DIRECTION_MOOD.md`               | mood boards, referencias, dirección foto vs ilustración, brief→visual                                             |
| 07  | `modules/07_TRENDS_2026.md`                      | aplicar tendencias visuales vigentes sin caer en gimmick                                                          |
| 08  | `modules/08_AI_IMAGE_CRAFT.md`                   | prompt para diseño + selección por herramienta + edición/upscale                                                  |
| 09  | `modules/09_PRODUCTION_STUDIO.md`                | orquestar generadores + handoff humano + iteración                                                                |
| 10  | `modules/10_FORMATS_DELIVERY.md`                 | specs de entregable, formatos, safe zones, empaquetado                                                            |
| 11  | `modules/11_PRODUCT_STORY_SCENES.md`             | portadas/heroes con producto o analítica, auditoría forense de referencias, anti-referencias y SVG determinístico |
| 12  | `modules/12_HYBRID_IMAGE_CAMPAIGN_PRODUCTION.md` | campañas Seedream↔GPT→Gemini Omni, still+motion, digital+print/OOH, brand modes, anchors y routing por operación |
| 13  | `modules/13_LAYOUT_DESIGN_AND_FINISHING.md`      | control compositivo por ratio, capas operativas, finish Seedream/GPT, mastering y QA premium                      |
| 14  | `modules/14_ENTERPRISE_CREATIVE_MODEL_ROUTING.md`| selección/incorporación de modelos, Google→GCP, escala enterprise, estados y routing agentic                       |

## 4. La mano de ejecución (por qué es "studio")

Cierra el loop **idear → dirigir → producir → auditar → iterar** (detalle en
`efeonce/STUDIO_TOOLING.md`):

### Social report visual contract

Cuando el asset sea un post o carrusel que promociona un reporte, dashboard o evidencia de producto, cargar
[`docs/operations/GREENHOUSE_SOCIAL_VISUAL_REPORT_PRODUCTION_V1.md`](../../../docs/operations/GREENHOUSE_SOCIAL_VISUAL_REPORT_PRODUCTION_V1.md).
La dirección por defecto es **proof-first / score dominante**: una evidencia legible, crop nativo por formato y
ningún frame, tarjeta, sombra pesada o mockup que convierta la captura en un dashboard genérico. El logo debe
aparecer una sola vez y los datos/UI finales se componen determinísticamente. La dirección debe entregar una
familia de derivados por superficie —no un archivo universal— y mantener evidencia crítica en la zona central,
validada contra overlays y recortes reales de cada plataforma. Ver la auditoría
[`docs/audits/social/2026-07-28-social-platform-surface-audit.md`](../../../docs/audits/social/2026-07-28-social-platform-surface-audit.md).

- **Auditar**: rúbrica de KV (`modules/05` + `templates/key-visual-audit-scorecard.md`).
- **Dirigir**: brief + mood board + selección de herramienta por tarea (`modules/06`, `08`).
- **Producir**: la herramienta o secuencia correcta para cada trabajo — **UI de Greenhouse →**
  `greenhouse-ai-image-generator`; **marketing/concept →** Nano Banana / Midjourney /
  Ideogram / Adobe Firefly / Higgsfield / Magnific (upscale) vía sus MCP/skills; **Photoshop e Illustrator
  nativos** desde el agente vía los puentes MCP locales `higgsfield-use-photoshop` / `higgsfield-use-illustrator`
  (instalados 2026-09-24: capas, Smart Objects, texto y máscaras editables, exportación PNG/PSD; `/Vectorize` para
  vector real en `.ai`; `/Image-fixer` sólo en su ruta segura — sin Healing/Generative Fill; estado en
  `higgsfield-provider`);
  **campaña híbrida Seedream/GPT/Gemini Omni →** cargar `modules/12_HYBRID_IMAGE_CAMPAIGN_PRODUCTION.md` y
  relevar por contrato `brand/channel→diverge→develop→anchor→organize→extend→animate→compose/post→prepress→release`;
  **set estático premium con layout controlado →** cargar `modules/13_LAYOUT_DESIGN_AND_FINISHING.md`, completar
  `templates/layout-design-contract.yaml`, ejecutar `pnpm creative:layout` después del finish aprobado y usar
  `anchor→layout→clean plate→finish→compose→master→QA`;
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
  routing de finish, Campaign Layout Compiler V1 y cierre determinístico premium.
- `modules/14_ENTERPRISE_CREATIVE_MODEL_ROUTING.md` — portafolio enterprise, registry machine-readable,
  provider sovereignty, promotion gates y route proposals operables por agentes.
- `efeonce/` — overlay: `EFEONCE_OVERLAY.md`, `STUDIO_TOOLING.md`, `DESIGN_BOUNDARY.md`,
  `CLIENT_DELIVERY.md`.
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md` — contrato económico
  canónico de Studio Credits; no duplicar bandas ni equivalencias dentro de esta skill.

## Estándar obligatorio para informes Efeonce

Al producir o revisar un informe, carga
`docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md`: pie en todas las páginas
con URL bubble oficial, dirección y teléfono; logos oficiales de Efeonce y del cliente
cuando aplique; gráficos con unidades y fuentes claras. Si el destino es PDF, entrega
y revisa el PDF A4; el HTML queda como insumo editable.

Para crear o mejorar el informe completo, carga `report-studio`: narrativa, evidencia, gráficos, producción y QA del formato final. La práctica especializada conserva sus contratos y datos.

## Entrada de creatividad social

Para seasonality, trendjacking, memes y correcciones de marca sobre objetos, cargar
[social-media-studio módulo 11](../social-media-studio/modules/11_TRENDJACKING_CREATIVE_PRODUCTION.md).
Social decide pertinencia/objetivo y conserva el entregable; Design resuelve recorrido visual, cámara, luz,
material, tipografía y adaptación. Leer módulos 03/13 y, si hay marca física,
[brand-in-scene](../social-media-studio/references/brand-in-scene.md). No usar la calidad de render como
prueba de concepto ni reconstruir una firma editorial con el modelo.

Para mecanismos, innovación y conexión emocional en creatividad social, cargar
[social módulo 12](../social-media-studio/modules/12_CREATIVE_REASONING_AND_EMOTIONAL_DESIGN.md).
Separar hipótesis de diseño de evidencia psicológica/neural y de resultados de audiencia; revisar memoria
para el mensaje y para la marca por separado. No presentar una heurística como garantía de persuasión.

## Escenas culturales y comida premium

Para comida, mesa y detalles de una celebración, cargar
[art direction de comida cultural](references/premium-cultural-food-art-direction.md): autenticidad,
referencias, anatomía, apetito, luz, profundidad, decisión foto/generación/3D y composición por ratio.
El [caso Fiestas Patrias](../../../docs/operations/social/2026-09-13-fiestas-patrias-production-method.md)
conserva la metodología completa con evidencia y programación.

## Fotografía de marca propia Efeonce

Para fotografía o imagen fotorrealista de **la marca Efeonce** (no de clientes), cargar
[lenguaje fotográfico de Efeonce](references/efeonce-photographic-language.md), aprobado el 2026-09-19:
«El oficio a la vista», barra de juicio, firma con primer plano **planeado** y logo SVG al 20% del lado corto, roles de color,
WB sin grade, catálogo de tomas y checklist QA. **NUNCA** anclar la serie en la categoría de un cliente real.
El [documento maestro](../../../docs/operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) conserva el
contrato completo; la producción del pixel sigue en `greenhouse-ai-image-generator`.

La toma se prepara y se valida con tres comandos, **nunca concatenando bloques a mano**: `pnpm foto:doctor` (¿esta
máquina puede generar? seis chequeos que ejercitan la cadena, sin costo), `pnpm foto:prompt <ficha.json>` (arma el
prompt desde una ficha de toma; formato, % del lecho y límite de sujetos salen de UNA tabla) y
`pnpm foto:validar <plate.png>` (mide las **seis** reservas sobre el plate limpio). Canon de las reservas:
[reserva de espacio en el plate](../../../docs/operations/brand-photography/EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md).
La **capa de composición gráfica** sobre la foto (tipografía, jerarquía, cursores) **no está aprobada** y su canon es
`efeonce-advertising-creative`, no los ejemplos de la carpeta de fotografía.

🔴 **Tres trampas medidas el 2026-09-22 (CMP-001) que el validador da por buenas.** Detalle, frases exactas y
casos en la regla auto-load `.claude/rules/brand-photography.md`:

- **Una criatura de partner CÁLIDA decide la temperatura de toda la pieza.** Con Clawd (naranja) en cuadro y la
  escena callada sobre temperatura, el modelo armoniza la iluminación hacia tungsteno ámbar y la pieza envejece
  a estética ochentera — lo contrario de un servicio que habla de motores de respuesta. Las reservas pasaron
  5/5. Si la criatura es cálida, el frío del cuadro se declara y el cálido se niega por su nombre; con Codex
  (azul) el problema no aparece.
- **El lecho de la firma lo mata el REFLEJO, no la luz directa.** Un plinto de aluminio claro dejó la firma en
  3,55:1 con el LED ya apantallado y el suelo en sombra; cambiar sólo el material a negro mate la llevó a
  19,69:1, sin tocar luz ni encuadre.
- **Dos reservas que fallan juntas suelen tener UNA causa**: buscar la superficie clara antes de tocar la luz.

## Adaptaciones Paid Media

Cuando el brief sea Paid Media multiformato, aplicar la matriz del canon **Tres voces + acción**: 4:5, 1:1, 9:16 y 16:9 por concepto, salvo exclusión explícita. Resolver reservas y foto nativas para cada ratio, conservar identidad/manos/pantallas al editar y pasar QA individual. No convertir un recorte o un resize en evidencia de composición validada. El QA local 1:1 no cambia el estado global de validación del catálogo.

🔴 **En horizontal el texto se ve perdido, y la causa NO es el tamaño de fuente respecto de su columna**
[medido 2026-09-22, CMP-001]: 4:5 da **968 px** de columna y 16:9 da **901 px** — casi la misma columna en un
lienzo del doble de ancho, así que el bloque ocupa poco del cuadro, no poco de su caja. **Escalar por ancho de
LIENZO aplana la jerarquía** (el ratio dominante/entrada cayó a 2,3, bajo el mínimo de 3). La dirección correcta
es llenar la columna: el compositor escala el bloque hasta que el dominante llene su `dominantMax`, sólo cuando
`W > H`, y 4:5 y 9:16 quedan idénticos. §13 de
[compositor de CTA](../../../docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md).

🔴 **«Sobra texto» se resuelve acortando cada voz, nunca eliminando una.** Dirigir una pieza a «dominante +
puente + CTA» rompe el concepto —entrada · titular · remate—. El gate de `foto:componer:cta` **bloquea**
la falta de entrada o remate desde el 2026-09-23, salvo `conceptoReducido` con aprobador registrado.
Al restituir la entrada, releer el ratio dominante/entrada: puede bajar porque el compositor achica
el dominante cuando no cabe en `dominantMax`. §El concepto completo no es opcional en
[Tres voces + acción](../../../docs/operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md).

## Paid Media: zonas seguras y handoff completo

Cargar `docs/operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md`, §Zonas seguras, al adaptar o
cerrar anuncios. Declarar placement además de ratio; proteger texto, CTA y cursor de la UI.
La firma cierra al pie sobre lecho físico: no elevarla al centro para aprobar un gate. Medirla por separado,
declarar cualquier solapamiento posible y revisar el placement; nunca resolverlo con scrim.
Entregar concepto, audiencia, fase del embudo, hipótesis, progreso, CTA/destino y KPI junto con prompts,
referencias, editables, comandos/dependencias y QA. Promover a Finales según autorización del operador;
conservar pilotos y separar final creativo de tráfico/publicación y de resultados medidos.

## Dirección de ads: escena, lecho y continuidad

El [método completo SEO/AEO](../../../docs/operations/social/2026-09-22-seo-aeo-paid-media-production-method.md) conecta registro, idea, referencias y producción. El lecho sirve a la firma; no domina el encuadre ni comprime la escena para satisfacer una safe zone. Si baja la firma, revisar también la foto y reducir el primer plano excesivo mediante edición, conservando materia y profundidad. En la corrección SEO/AEO se buscó el quinto inferior; es una decisión del caso, no porcentaje universal. Verificar tablet orientada hacia su usuario, agarre/manos, identidad y colores en píxeles. Cambiar sólo el gráfico no resuelve una mala composición fotográfica.

## Continuidad de campañas CMP

Canon: [registro y contrato de brief](../../../docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md#8-contrato-del-brief-ampliado-y-templates).
El pensamiento vive en `Alineación/2. Campañas/CMP-###_…`; los assets, en la carpeta del canal.

La ficha por pieza declara referencias reales por vista, identidad, prenda, espacio/prop y hash; abrir referencias
aprobadas comparables antes de producir. Conservar plate, prompt íntegro, copy/layout editable, capas y receta en
canal. Para firma 9:16, elevar ligeramente el lecho si hace falta para alojarla dentro de materia y zona segura,
sin subirla al centro ni agrandar excesivamente el primer plano; verificar cada placement.

## Manifiesto de pauta y continuidad MCP

Canon: [manifiesto compartido y handoff MCP](../../../docs/operations/EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md).
La entrega final para pauta usa la estructura común, sin carpetas por agente. Mantener bytes e identidad de los exports al moverlos; conservar receta en tres capas y mapa de rutas. Las referencias adjuntas reales necesitan disponibilidad/hash, aunque el checker general termine correctamente.
