# Greenhouse Multimodal Campaign Production V1

> Estado: operativo para producción out-of-band. Validado el 2026-07-18 y ampliado el 2026-07-19 con
> Layout Design & Finishing sobre Seedream 5 Lite/Pro,
> GPT Image 2, Gemini Omni Flash y post determinístico. Seedance 2.0 queda como fallback condicionado;
> no fue necesario para el release validado. No modifica el runtime del portal.
> Ultima actualizacion: 2026-09-24 por Codex — contrato operativo de Gemini Omni 1.1 Cloud y CLI local;
> el piloto de 2026-07-18 permanece como evidencia histórica del modelo anterior.

## Propósito

Convertir una idea en un sistema de campaña profesional para canales digitales, motion, print y OOH,
sin depender de un único modelo ni confundir una imagen atractiva con un release listo. La unidad de
trabajo es un **linaje aprobable de assets**: brief, territorios, anchor, plates, motion, composición,
prepress, QA, paquete y aprendizaje.

## Entrada social: clasificación y límites de este documento

Para solicitudes de seasonality, trendjacking y piezas sociales, el canon de oportunidad, idea, marca y crítica
es [social-media-studio, módulo 11](../../.codex/skills/social-media-studio/modules/11_TRENDJACKING_CREATIVE_PRODUCTION.md)
(espejo Claude: ../../.claude/skills/social-media-studio/modules/11_TRENDJACKING_CREATIVE_PRODUCTION.md).
Este documento conserva el flujo de campaña y los gates humanos; no sustituye esa decisión creativa ni exige
usar todos los proveedores del piloto histórico. Aplicar:

- **Seasonality:** ventana previsible y comportamiento cultural/comercial; planificar etapa, significado y
  relación de marca. Una fecha no es por sí sola un concepto.
- **Trendjacking:** detonante emergente observado, código, audiencia, oportunidad vigente y aportación propia;
  revalidar antes de activar. Si no existe detonante, clasificar como seasonality o evergreen.
- **Híbrido:** documentar por separado temporada y detonante; no usar la etiqueta para evitar decidir.
- Definir objetivo, mecanismo y papel de marca antes de producir; calidad visual no compensa falta de sentido.
- Escalar alternativas, producción y aprobaciones al encargo autorizado. Los gates de este pipeline runtime/
  campaña no se falsean ni se eliminan; tampoco se imponen como nuevas autorizaciones a cada borrador local.

Los modelos y parámetros del «router validado» registran una corrida histórica, **no disponibilidad vigente ni
ranking universal**. Para otra corrida, descubrir schema y seleccionar por delta según
[conectores sociales](../../.codex/skills/social-media-studio/references/social-production-connectors.md).

> **➡️ Qué modelo elegir hoy, cuándo y cómo:** la guía canónica es
> [GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md](../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md)
> (modelos de `pnpm ai:image`, `pnpm ai:fal` y `pnpm ai:omni`). Este documento conserva el flujo de campaña, las manos y los
> gates; la selección vigente de motor vive allá. Dos correcciones del 2026-09-16 que afectan a este flujo: (1) los
> rankings externos no coinciden — OpenArt pone a Seedream 5 Pro #1 en imagen, mientras Arena (2026-09-07) y
> Artificial Analysis (2026-09-16) ponen a GPT Image 2.5 Sunburst y Flare #1/#2 y a Seedream 5 Pro entre #8 y #15;
> ninguno reemplaza la prueba con el brief; (2) el costo de video en fal depende del **escalón de resolución** y el
> precio registrado es el más bajo (Wan 3.0 sale en 1080p por defecto a USD 0,20/s, H3 base en 2K a 0,13/s, Flux 3
> publica el doble de lo registrado); Seedance se presupuesta con `tokens = alto × ancho × segundos × 24 / 1024`.
> Detalle: [catálogo Fal §Precios por escalón de resolución](../architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md).

## Dos ejes que no deben confundirse

### Canal

| `channelMode`    | Salidas típicas                                                    | Gate específico                                            |
| ---------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| `digital-static` | 4:5, 1:1, 9:16, 16:9, display                                      | safe zones, peso, thumbnail, landing                       |
| `digital-motion` | 9:16/16:9; shots generativos 3–10 s; masters editados 6/10/15/30 s | identidad temporal, flicker, audio, captions, poster frame |
| `print`          | A-series, afiche, folleto                                          | tamaño físico, bleed, trim, 300 ppi, ICC de imprenta       |
| `ooh`            | billboard, mobiliario, gran formato                                | lectura a distancia, 3 s, pocas palabras, vendor spec      |

### Presencia de marca

| `brandMode`         | Significado                                    | Regla                                                     |
| ------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| `branded`           | marca, tipo, URL y paleta visibles             | activos oficiales; firma exacta, marca física según contrato              |
| `brand-light`       | la campaña se reconoce sin dominar con el logo | firma/end card discreto exacto; física sólo con arte oficial              |
| `editorial-neutral` | plate útil sin firma visual de Efeonce         | no hereda AXIS ni una skin Efeonce; conserva provenance   |
| `client-brand`      | pertenece a un cliente                         | sólo brand book/activos del cliente; Efeonce no contamina |

`off-branding` no significa “fuera de control”. Significa que la capa visual generativa queda limpia
para contenido editorial, performance, motion o cliente, y que la firma correcta se decide en post. Tampoco
es sinónimo de `offline`: una pieza puede ser digital y editorial-neutral, o un OOH completamente branded.

### Marca física y firma editorial: autoridades separadas

El papel narrativo de marca (firma, punto de vista, participante, facilitadora, demostración o protagonista)
se declara en el brief; no añade enums al schema `brandMode`. La modalidad física tampoco es un nuevo enum.

- **Firma editorial:** logo, titular, CTA, URL, legal y captions permanecen exactos en el compositor.
- **Marca física:** logo o packaging sobre objeto realista puede requerir referencia oficial al modelo,
  mockup fotográfico o 3D para describir tinta, foil, bajorrelieve, grabado o bordado. No generar de memoria.
  Ruta por defecto cuando la forma debe salir exacta (2026-09-17): el render determinístico entra como **referencia de
  forma** y la **intención** —material, montaje, escena, atmósfera— va en el prompt; pegar el render sobre la escena no
  es el default. Método: [ejecución social](SOCIAL_CREATIVE_AGENT_EXECUTION_V1.md) y
  [bitácora del kit 3D](social/2026-09-17-efeonce-logo-3d-reference-kit-production-method.md).
- Registrar un `materialized_plate` como artefacto de trabajo separado: escena con marca física revisada,
  sin titular/firma editorial. El nombre es descriptivo, no nuevo tipo o estado del compiler.
- Verificar identidad, proporción sobre la superficie, luz/material y reconocimiento en consumo. Una
  homografía matemáticamente válida no demuestra escala física ni relieve; inspeccionar el crop de marca.
- Si la marca debe ser exacta y la generación no conserva su identidad, cambiar a composición/mockup/3D
  controlable. No aceptar deformación por realismo ni añadir un segundo logo para ocultar el defecto.
- El master editorial compuesto nunca vuelve al generador. Para corregir marca física, volver a su plate,
  proteger el resto, revisar y recomponer el mismo titular después.

Contrato de oficio: [brand-in-scene.md](../../.codex/skills/social-media-studio/references/brand-in-scene.md).
No cambia approvals, schema ni capacidad del layout compiler. Si éste no admite una operación, no falsificar
su contrato; resolver el asset fuera de él con lineage y conservar sus gates para la composición aplicable.

## Arquitectura de manos

```text
strategy / rights / channelMode / brandMode
                    │
                    ▼
Seedream 5 Lite ── diverge 3–16 territorios
                    │ curaduría humana
                    ▼
Seedream 5 Pro ─── develop material, luz, color, atmósfera
                    │ anchor gate
                    ▼
GPT Image 2 ────── organize, repair, extend ratios, copy fields
                    │
          layout contract + clean ratio plates
                    │
      Seedream Pro / GPT ─ bounded finish by remaining delta
                    │
              ┌─────┴─────────────┐
              ▼                   ▼
       clean still plates    Gemini Omni Flash
       branded composition   animate / reference / edit
              │                   │
              └─────┬─────────────┘
                    ▼
deterministic post: type / editorial logo / CTA / legal / captions / audio mix
                    ▼
digital release + print/OOH production proofs + manifests + QA
```

No es un ranking de modelos. Cada mano recibe un delta y conserva locks. Todos los formatos vuelven al
anchor aprobado; no se encadenan derivados como `v1 → v2 → v3`.

Cuando una pieza aprobada usa la metáfora de selección activa o multiplayer, esa geometría pertenece al
postproceso determinista, nunca al plate generativo. El agente normaliza un `AxisCollaborationSelectionIntent`
con `efeonce.collaboration-selection` y entrega el manifest
`axis.collaboration-selection-composition.v1` al adapter del compositor. Greenhouse ya implementa este paso en
`pnpm creative:layout`: liga el target a `headline|support|hook|lockup`, deriva bounds del contenido pintado y
verifica acting/moving, hotspot, labels y canvas. En otro motor sin adapter, la capa queda `pending adapter`: no se
inventan coordenadas ni se devuelve la pieza al modelo para simularla. El manifest de selección complementa el de
campaña; no reemplaza lineage, gates ni aprobación humana.

## Gobernanza arquitectónica

- **Arquetipo:** pipeline creativo multimodelo, out-of-band y human-in-the-loop; no es una feature autónoma
  del portal ni un servicio de producción desatendido.
- **Autonomía:** `recommend-with-approval`. Los modelos proponen/generan; una persona aprueba territorio,
  anchor, claims, derechos, release creativo, preprensa y activación en medios.
- **Reversibilidad:** el router de modelos es una two-way door. Los handoffs se expresan como contratos de
  input/delta/locks/output y permiten sustituir un proveedor sin cambiar el resto del linaje.
- **ADR:** no se abre uno para V1 porque no cambia source of truth, schema, auth, API, deploy ni runtime
  compartido. Este documento operativo es el owner. Un servicio runtime, automatización autónoma,
  presupuesto persistente o contrato API sí deberá proponer ADR antes de implementarse.
- **Observabilidad mínima:** manifest por llamada con provider/model/endpoint/request ID, parent, latencia,
  costo, hashes y outcome; jamás prompts con datos restringidos ni valores de secrets.
- **Límites de costo:** presupuesto declarado en intake, selección humana antes de pasos premium y scripts
  generativos separados de composición/QA determinísticos para no gastar por accidente.

## Router validado

| Operación                                       | Mano                                   | Por qué                                                                       |
| ----------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------- |
| Divergencia visual económica                    | Seedream 5 Lite                        | abre familias de medio/material sin gastar cierre premium                     |
| Desarrollo expresivo                            | Seedream 5 Pro                         | material, color, luz, atmósfera y edición regional semántica                  |
| Disciplina compositiva                          | GPT Image 2                            | reencuadre, identidad, safe zones, reparación y ratios                        |
| Finish de plates con layout aprobado            | Seedream Pro o GPT Image 2             | Pro para material/luz/atmósfera; GPT para geometría/safe zones/protección     |
| Toma motion base desde anchor limpio            | Gemini Omni Flash                      | una toma continua por ratio, con audio nativo y plate sin marca               |
| Familia 15/10/6 desde toma aprobada             | edición determinista                   | trim, montaje, format wall, end card, mezcla y exports sin regenerar          |
| Nueva toma, ángulo o continuidad física ausente | Seedance 2.0, fallback                 | sólo cuando los píxeles/actuación necesarios no existen en el master aprobado |
| Copy/firma editorial/legal exactos                         | composición determinista               | precisión, localización, compliance y reemplazo sin regenerar                 |
| Aprobación                                      | director/a de arte + brand/legal/media | el modelo no es autoridad de marca ni de lanzamiento                          |

Gemini Omni Flash es **video**, no un tercer generador de stills. El piloto de 2026-07-18 usó el modelo
anterior `gemini-omni-flash-preview`; sus resultados y límites no certifican el reemplazo. La ruta local vigente
es `pnpm ai:omni` con Gemini Omni 1.1 Cloud `gemini-omni-1.1-flash-preview` en `global`. Cubre texto, imagen,
primer/último cuadro, referencias, edición y extensión mediante [su manual](../manual-de-uso/ai-tooling/gemini-omni-1-1-cli.md).
Fal lista `google/gemini-omni-flash`, `/image-to-video`, `/reference-to-video` y `/edit`, pero Greenhouse **no**
opera Omni por Fal: se conecta directo por Google (el registro de `pnpm ai:fal` no lo incluye).
**Reafirmado 2026-09-16 por el operador:** Omni Flash y Nano Banana Pro van directo por Google, nunca por Fal (por
Google es más barato con la misma calidad). Los motores de video que sí operan por `pnpm ai:fal` como alternativa
out-of-band son Seedance, Minimax H3, Flux 3 y Wan 3.0. **Delta 2026-09-16:** el bloqueo por saldo agotado de ese
mismo día quedó superado: el cliente usa dos cuentas de Fal, elige la de más saldo y cambia sola ante un 403 por
saldo (`pnpm ai:fal --balance` muestra los saldos). El registro quedó con 47 de 55 capacidades verificadas, incluidas
las de Wan 3.0 y Seedance. Ojo con Seedance 2.5 en video a video: su filtro rechaza marcas y personas reales
**después** de encolar y cobra el intento; con personas o marcas, usar Flux 3 o Wan 3.0. Seedream 5 Pro en fal llega
a 2048² (no a 4K) y entrega JPEG por defecto: si se necesita más área,
Seedream 5 Lite la ofrece (hasta 4096² según su schema). Ver [catálogo Fal §Cuentas, saldo y operación del CLI](../architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md).

### Patrón motion validado: single-shot → familia profesional

El generador no tiene que producir una pieza por duración. La corrida aprobada creó **un clean master Omni de
8 s por ratio** (`9:16` y `16:9`), cada uno como toma continua sin cortes, copy ni logo. Desde esos dos masters,
el post determinístico produjo la familia profesional completa:

| Pieza       | Construcción                                                               | Generaciones incrementales |
| ----------- | -------------------------------------------------------------------------- | -------------------------: |
| Hero 15 s   | toma aprobada + montaje de piezas reales de la campaña + end card de 2,5 s |                          0 |
| Master 10 s | 8 s de toma aprobada + end card de 2 s                                     |                          0 |
| Bumper 6 s  | 4 s seleccionados de la toma aprobada + end card de 2 s                    |                          0 |

En dos ratios, la matriz es **2 × 3 = 6 videos**. El `format wall` del hero no se vuelve a generar ni simula
interfaces: se compone con los stills finales reales del mismo release, identificados por path/hash. Esto hace
visible la capacidad de producción a escala y mantiene copy, marca y formatos bajo control.

Seedance 2.0 no es una etapa ritual ni un “mejorador” del single-shot. Se abre sólo si el master aprobado no
contiene la toma, el ángulo, el blocking o la continuidad física que el relato exige. Si sólo cambian duración,
orden, hold, grade, format wall, end card, copy, captions o audio/loudness, la mano correcta es determinista.

### Regla: UI en la pantalla de un dispositivo dentro del video

Aprendizaje del Short «Nuestro Duo» (2026-09-11, Seedance 2.5 vía Higgsfield MCP; caso:
[`social/2026-09-11-iphone-duo-trendjack.md`](social/2026-09-11-iphone-duo-trendjack.md)). Si un dispositivo en
cuadro muestra UI, esa pantalla es parte de la toma, no de la capa de marca:

- **La renderiza el modelo.** Reemplazar pantallas verdes por tracking de esquinas se rechazó antes de usarse:
  el texto pegado no recibe luz, reflejos ni respuesta al movimiento, y no se ve dentro de la pantalla.
- **Pantallas video-safe como `image_references`.** Mismo diseño reducido a pocas frases grandes (sin URLs,
  barra de estado, pestañas ni texto diminuto; lo secundario pasa a barras grises). El plate va como
  `start_image`, cada pantalla como referencia indexada, y el prompt lista las frases exactas. Un plate con texto
  chico como `start_image` hizo que el modelo redibujara palabras desde el primer frame («B2S» por B2B).
- **El encuadre no queda fijo.** En `omni_reference`, `start_image` no lo bloquea: el dispositivo creció y subió
  durante el clip. El overlay se diagrama sobre el bounding box medido por frame, en las bandas libres.
- **Titular, bajada y firma editorial siguen fuera del modelo** (overlay ffmpeg). El caso de pantallas no
  autoriza generar esos overlays; la marca física tiene el contrato separado definido arriba.
- **QA:** hoja de frames a 0/2/4/6/8 s, zoom de pantallas al inicio, medio y final, y colisión overlay↔sujeto en
  el último frame.

Receta completa: skill `motion-design-studio` → `modules/09_AI_VIDEO_PIPELINE.md` §7. En estático, la pantalla
exacta sí se compone (homografía sobre chroma): skill `greenhouse-ai-image-generator`.

## Flujo end-to-end

### 0. Intake y autoridad

Definir objetivo, audiencia, etapa de funnel, oferta, claim/evidencia, mercados, `channelMode`, `brandMode`,
rights owner, presupuesto, responsable del anchor y aprobadores de arte, marca, legal, media y prepress.

### 1. Contrato de campaña

Fijar mensajes, ratios, safe zones, activos oficiales, localización, riesgos de anatomía/producto, presencia
de marca y qué contenido debe ser exacto. Separar desde el inicio:

- `clean plate`: sujeto, ambiente, material y luz; sin texto/logo;
- `materialized_plate` opcional: escena con marca física desde arte oficial, validada por identidad y material;
- `brand layer`: firma editorial, tipo, CTA, URL, legal, captions y end card;
- `channel layer`: crop, duración, audio, peso, bleed, ICC y specs del proveedor.

### 2. Divergencia Seedream Lite

Generar 3–16 territorios realmente distintos variando un eje por ruta: metáfora, medio, energía, escala o
composición. Curar con miniaturas; no llevar todo a alta resolución.

### 3. Desarrollo Seedream Pro

Desarrollar sólo 1–3 rutas. Usar referencias con roles y precedencia (`IDENTITY`, `STRUCTURE`, `MATERIAL`,
`IMPACT`, `ANATOMY`, `PALETTE`, `OFFICIAL_ASSET`, `ANTI-REFERENCE`). Pro aporta el mundo visual, no el copy.

### 4. Anchor gate humano

Aprobar tesis, hook, silueta, identidad, anatomía/producto, paleta, luz, copy field, lectura a 320 px, peor
crop y riesgo semántico. Un anchor es una decisión con owner; todavía no es una pieza final.

### 5. GPT Image 2 organiza y extiende

Desde el mismo anchor, producir plates directos por ratio. Un pase cambia un delta: escala, crop, espacio de
copy, reparación o extensión. Bloquear sujeto, hook, paleta y dirección de luz. Texto editorial de modelo es concept-only; marca física sigue el contrato separado de referencias y revisión.

### 5A. Layout Design & Finishing para sets estáticos

Cuando la campaña necesita control compositivo fino y acabado premium, insertar este subflujo antes de la
composición final:

```text
anchor → layout contract → clean plate por ratio → bounded finish → compose → master → QA
```

1. Definir una grilla y composición nativas para cada ratio, con sujeto, `copy_field`, márgenes, peor crop,
   hook gráfico, capas y compositor autoritativo. No recortar un master universal.
2. Exportar un `clean_plate` por ratio sin headline, logo, CTA, legal ni locale.
3. Elegir el executor por el delta restante: Seedream 5 Pro para material, microtextura, luz, color, atmósfera
   e integración; GPT Image 2 para geometría, escala, safe zones, identidad o reparación protegida.
4. Cuando exista marca física, ejecutar el pase de materialización antes del titular y registrar su review.
   Aplicar un solo delta por pase y restatar locks. Detener si el scorecard no mejora o el siguiente trabajo
   ya es determinístico.
5. Componer underlay óptico, hook, tipo, logo, CTA y legal en Figma, Adobe, código/Sharp u otra herramienta
   declarada. Nunca devolver el anuncio final al modelo para “pulirlo”.
6. Masterizar por destino y pasar gates de anchor, layout, finish, craft, formato, técnica y release humano.

El layout no garantiza por sí solo un resultado premium. La calidad emerge de
`layout + integración + finishing + mastering + QA`. Las capas operativas son archivos y autoridades reales;
la edición regional de Seedream sigue siendo semántica sobre un raster aplanado.

Contrato reusable: `.codex/skills/design-studio/templates/layout-design-contract.yaml`. Método de dirección:
`.codex/skills/design-studio/modules/13_LAYOUT_DESIGN_AND_FINISHING.md`.

La implementación determinística V1 vive en `scripts/creative/layout-compiler/` y se opera con
`pnpm creative:layout -- --contract <yaml> --mode plan|compile|check`. Produce fuentes SVG editables, masters,
manifests/hashes, contact sheet y QA sin llamar a modelos. `compile` bloquea anchor/layout/finish no aprobados;
el release humano permanece como checkpoint separado. Contrato técnico:
[`GREENHOUSE_CAMPAIGN_LAYOUT_COMPILER_V1.md`](../architecture/GREENHOUSE_CAMPAIGN_LAYOUT_COMPILER_V1.md).

### 6. Bifurcación still/motion

- **Still:** el clean plate, o el materialized plate revisado cuando corresponda, pasa a composición
  determinista branded, brand-light, neutral o client-brand.
- **Motion:** un plate 9:16/16:9 sin logo ni copy se entrega a Gemini Omni como `<FIRST_FRAME>` o referencia.
  Fijar una toma continua, duración, cámara, acción, audio, continuidad, anatomía temporal, prohibiciones y
  poster frame. Primero se genera y aprueba el single-shot; las duraciones de release se editan después.
  Si el concepto exige marca física en la toma, entregar el plate materializado y las referencias que admita
  el modelo; revisar identidad durante todo el movimiento, oclusiones y cambios de luz. Esa ruta requiere
  evidencia propia: el piloto clean no la certifica. Titulares y firmas editoriales siguen fuera del modelo.

### 7. Iteración conversacional Gemini Omni

Si el single-shot necesita un cambio generativo localizado, cada edición usa un delta simple y termina con
`Keep everything else the same`. En el CLI Cloud 1.1, pasar el **MP4 fuente** a `--task edit --video`; conservar
el ID de interacción para trazabilidad, sin asumir que `previous_interaction_id` reanuda la edición en Cloud.
No reabrir simultáneamente cámara,
sujeto, ambiente y audio. El output generativo sigue siendo un master de motion: captions, firmas editoriales, CTA, legal,
familia 15/10/6, format wall, mezcla y loudness se terminan fuera del modelo. Si lo solicitado es una nueva
toma/ángulo o continuidad física ausente, no forzar la edición conversacional: abrir el fallback Seedance 2.0.

### 8. Composición digital y offline

- Digital: safe zones de UI, sRGB, peso y legibilidad thumbnail/tamaño real.
- Motion: H.264/MP4 master, WebM/MP4 derivados, poster, captions, audio mix y loudness por destino. Para el
  piloto web/social se usó `−16 LUFS` integrado como target y `≤ −1 dBTP` como ceiling; los heroes midieron
  `−16,3/−16,4 LUFS` y `−2,0/−2,2 dBFS`. Estas cifras prueban conformidad técnica, no reemplazan escucha humana.
- Print: proof de alta resolución; press file sólo después de recibir tamaño, bleed, trim, sustrato e ICC.
- OOH: una idea, una imagen dominante, headline corto, firma y URL; retirar support copy si no sobrevive a
  una lectura de tres segundos. No miniaturizar un feed ad.

### 9. QA y release

Revisar 100% de dimensiones, naming, color, peso, hashes, lineage y exact content. Inspeccionar contact sheet,
thumbnail, full-size y distancia OOH. Para video: primer/medio/último frame, frame-by-frame en momentos de
acción, anatomía, flicker, texto accidental, audio, safe zones y poster. Medir loudness/true peak y escuchar con
audífonos y parlante de teléfono; un valor conforme no demuestra que un loop, crossfade o foley sea creíble.
Un error bloqueante reabre el stage dueño; no se tapa en un modelo posterior.

### 10. Activación y aprendizaje

Creative release no es launch approval. El manifest mantiene dos estados independientes:

- `status: creative_release_complete`: assets, familia 15/10/6, manifests y QA creativo/técnico están cerrados;
- `activationStatus: not_activated|ready|active|paused|complete`: media y medición siguen su propio gate.

Antes de cambiar `activationStatus`: audiencia, landing, UTMs, pixel/CAPI, conversión, presupuesto, trafficking,
legal, escucha final por dispositivo y matriz experimental. Recuperar resultados por `asset_id` y registrar
hook, CTR, CVR, CPA, retención de video y fatiga. El ganador informa el siguiente anchor; no se convierte en una
regla de marca universal por una sola campaña.

## Contrato de relevo still → motion

El siguiente YAML registra el relevo del piloto de 2026-07-18 y conserva su ID de modelo histórico. Para
una corrida nueva, elegir `gemini-omni-1.1-flash-preview` y ejecutar `pnpm ai:omni` con las entradas, GCS
privado y controles del [manual vigente](../manual-de-uso/ai-tooling/gemini-omni-1-1-cli.md).

```yaml
anchor_id: campaign-kv-v1
parent_asset: path/to/clean-plate.png
parent_sha256: '...'
source_stage: gpt-organized-plate
target_model: gemini-omni-flash-preview
target_provider: google-direct  # piloto histórico; no se operó por Fal
brand_mode: editorial-neutral
channel_mode: digital-motion
role: FIRST_FRAME
locks:
  - exactly one subject
  - approved silhouette, palette and material
  - no logo, copy, letters or watermark
delta: animate flight and modular wake
camera: one continuous shot; no cuts
audio: restrained wing pulse; no dialogue
output: 9:16; 8s; 720p; clean single-shot master
acceptance:
  - identity survives first/middle/last frame
  - no extra anatomy or subject clones
  - copy-safe area survives motion
  - audio and motion have no abrupt cut
```

## Limitaciones vigentes de Gemini Omni 1.1 Cloud

- Es **Preview** y usa el ID Cloud `gemini-omni-1.1-flash-preview`, distinto del ID Developer
  `gemini-omni-1.1-flash`. El endpoint de Cloud Interactions está en `global`; fijar el ID y validar cuota y
  acceso del proyecto antes de producir. La cuota Cloud es fija y no ofrece PayGo para este modelo.
- La salida admite 3–10 s, `16:9`/`9:16` y `360p`/`720p`/`1080p`/`4k`; 1080p y 4K son reescalados según Google.
  La entrada admite hasta 10 imágenes y 3 videos por prompt; cada video fuente, hasta 10 s.
- `edit` y `extend` son tareas Cloud disponibles; reemplazo de objetos y cambio de estilo son instrucciones
  dentro de `edit`. Para primer y último cuadro se usa `image_to_video` con dos imágenes ordenadas.
- La edición del CLI usa un MP4 fuente explícito. El esquema expone `previous_interaction_id`, pero su uso
  stateful en Omni Cloud no está probado aquí. Audio subido no forma parte de las seis rutas del CLI.
- Los seis canaries locales del 2026-09-24 prueban conectividad y salida MP4 de las seis rutas a baja resolución;
  no validan por sí solos continuidad visual, calidad a 1080p/4K ni aprobación de marca. Detalle y comandos:
  [manual `ai:omni`](../manual-de-uso/ai-tooling/gemini-omni-1-1-cli.md).
- Copy final continúa fuera del modelo. Revisar audio, procedencia, derechos y cada cuadro de salida antes
  de incorporar el video al master de campaña.

Fuentes oficiales: [ficha Cloud](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/omni-1-1-flash),
[referencia Interactions](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rpc/genai.vertex.v1beta1),
[edición](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/edit-videos),
[extensión](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/extend-videos),
[cuotas](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/quotas) y
[precios Cloud](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing).

## Worked example

`ai-generations/2026-07-18_high-frequency-campaign-e2e/`

- Seedream Lite: 3 territorios.
- Seedream Pro: 1 anchor.
- GPT Image 2: plates directos 4:5, 9:16 y 3:1.
- Composición: 18 piezas still, incluyendo 16:9, A2 y OOH de alta resolución.
- Gemini Omni: dos clean masters single-shot de 8 s, 9:16 y 16:9. Post determinístico entrega la familia
  profesional de seis videos: dos heroes de 15 s, dos masters de 10 s y dos bumpers de 6 s. Los heroes combinan
  el shot aprobado con claims exactos y un format wall compuesto desde piezas still reales del release; costo
  generativo incremental: USD 0. El clip inicial de 3,008 s se conserva sólo como technical probe, nunca como
  asset profesional. Costo Fal estimado del release motion: USD 2,08. Seedance 2.0 no se invocó porque no faltaba
  una toma/ángulo/continuidad física nueva.
- Audio: target `−16 LUFS`, ceiling `≤ −1 dBTP`; mediciones conformes. La escucha final por audífonos/teléfono
  sigue siendo un gate de activación aunque el creative release esté empaquetado.
- QA: primera composición digital corregida por copy/safe zones; OOH corrigió densidad informativa retirando
  support copy; print/OOH quedan honestamente como production proofs pendientes de ICC/vendor spec.
- Piloto Layout Design: el mismo sistema se reabrió sólo en estático para `16:9`, `4:5` y `9:16`.
  Cada formato recibió grilla nativa, clean plate, finish Seedream 5 Pro y composición Sharp/fontkit con
  tipo/logo exactos. QA `3/3`, score `47/50`, costo incremental estimado `USD 0,27`; copy/logo nunca entraron
  al modelo. Las métricas son observación, no SLA.

## Package profesional mínimo

```text
campaign-id/
  brief/          strategy, claims, channel/brand modes, rights, matrix
  prompts/        exact prompts and model/version
  work/           territories, anchors, clean plates, motion masters
  layout/         ratio grids, layer contracts, clean/finished plates
  manifests/      lineage, hashes, request IDs, cost, approvals
  review/         contact sheets, frame strips, scorecards, decision log
  delivery/
    digital/
    motion/
    print-proofs/
    ooh-proofs/
    asset-matrix.csv
  qa/             technical, visual, temporal, prepress, release verdict
```

## Gate social adicional

Antes del release, registrar cinco veredictos independientes: estratégico (razón de participar), creativo
(mecanismo y aportación), cultural/contextual (significado y vigencia), marca (atribución y asociación) y
producción (archivo y ejecución). El agente registra su revisión; no se autoasigna aprobación humana.

Entregar la pieza visible y los formatos solicitados, no sólo el prompt. Anotar qué fue investigado, ejecutado,
revisado, aprobado y publicado como estados diferentes. Sin datos de audiencia, desempeño queda no medido.
La crítica de un placement rechazado prevalece sobre checks verdes de tamaño, contraste o geometría.

## Gate de cierre

- [ ] `channelMode` y `brandMode` declarados por asset.
- [ ] Cada salida deriva de un anchor aprobado, no de otro derivado.
- [ ] Clean plates no contienen marca accidental ni texto generado; los materialized plates se identifican aparte.
- [ ] Sets con Layout Design declaran grilla/capas por ratio; finish nunca recibe el master editorial compuesto.
- [ ] El anuncio final compuesto no vuelve a un modelo generativo.
- [ ] Copy/firma editorial/CTA/legal/captions son determinísticos.
- [ ] Marca física tiene arte oficial, proceso, lineage y revisión separada de identidad/geometría/material/lectura.
- [ ] Motion pasa identidad temporal, anatomía, flicker, audio y poster frame.
- [ ] La familia 15/10/6 deriva del single-shot aprobado; cualquier nueva generación justifica qué píxel/toma faltaba.
- [ ] El format wall usa piezas reales del release con lineage, no formatos o interfaces inventados.
- [ ] Loudness/true peak están medidos y la escucha humana por dispositivo está registrada.
- [ ] OOH pasa lectura a distancia; print/OOH tienen vendor spec o se etiquetan proof-only.
- [ ] Derechos, disclosure, claims y approvals quedan registrados.
- [ ] Coste, latencia, modelo, endpoint, parent y hashes están en manifest.
- [ ] Creative release y media launch mantienen estados distintos.
