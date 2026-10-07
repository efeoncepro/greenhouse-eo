# Rooms — dirección visual V1

Fecha: 2026-10-07. **Design system La órbita decidido por el operador; composición y aprobación visual pendientes.** Modo: repo-native-benchmark. [Experiencia](../../architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_V1.md) · [Wireframes](../wireframes/rooms-v1.md) · [Motion](../motion/rooms-v1.md).

## 1. Referencias y selección de dirección

Referencias funcionales solicitadas: AEO X-Ray para explorar evidencia, Insights para presentar, Trumpet para persistencia comercial. La autoridad estética es **La órbita**, gobernada por [efeonce-graphic-line](../../../.codex/skills/efeonce-graphic-line/SKILL.md), incluida la UI de autoría, exploración, consola y audiencia. AXIS distribuye sus tokens, contratos, componentes y assets; sus defaults históricos de producto no sustituyen esta autoridad.

Corrección explícita del operador, 2026-10-07: «efeonce-graphic-line es el nuevo design system». Se retira la base anterior Poppins/Geist de Rooms. Fuentes verificadas en AXIS `f4dd2fe`: `packages/tokens/src/tokens.ts` (`efeonceGraphicLine.type/color/motion`), `color-system.ts` y referencia de [componentes de La órbita](../../../.codex/skills/efeonce-graphic-line/references/lab-components.md). Pins/export paths y adaptación Rooms pendientes; ninguna instalación o aceptación de píxeles se infiere de esta decisión.

| Dirección | Fortaleza | Coste / motivo de elección |
|---|---|---|
| Escenario editorial | Una idea o pieza domina; permite lectura, demostración y presentación | **Recomendada**: el impacto lo produce el trabajo, con profundidad al inspeccionar |
| Galería espacial 3D | Sensación de lugar y recorrido | Añade orientación, carga y barreras móviles; reservar para una pieza 3D real que lo requiera |
| Sala documental densa | Comparación rápida de documentos/estados | Adecuada para gestión interna; menor protagonismo de la propuesta en audiencia |

Elegir escenario editorial no aprueba todavía un mockup. La primera validación después del go será el primer viewport desktop/móvil con contenido real y una transición pieza→detalle creativa, además de lectura→radiografía SEO/AEO.

## 2. Composición y firma

Un gran plano de contenido, margen generoso y las voces de La órbita: Bricolage para decir, Poppins para explicar y operar. Papel/navy, acento semántico de la línea, iconografía canónica y estados funcionales coherentes. La jerarquía se reconoce en un vistazo: qué propuesta es, qué estoy viendo y qué puedo hacer ahora. Controles subordinados; los paneles se abren cuando aportan contexto. No distribuir cada argumento en una tarjeta equivalente.

Entrada: título corto, contexto de cliente y pieza/demostración dominante según el perfil. Un hallazgo SEO/AEO conserva fuente, fecha y ámbito legibles; la evidencia ocupa el escenario con la misma jerarquía que un arte. Una marca Efeonce oficial en el marco de producto; sin inventar logo Rooms ni trasladar la órbita encima del arte del cliente. En presentación, casi toda la superficie pertenece a la pieza. Marca, edición y navegación permanecen disponibles de forma discreta.

El efecto distintivo es la **continuidad entre relato y detalle**: abrir una pieza conserva origen y retorno; abrir su fundamento mantiene la referencia visual; volver recupera escala y posición. Profundidad limitada a escenario, panel contextual y modal cuando es realmente necesario.

## 3. Roles visuales y tokens

| Rol | Base y aplicación |
|---|---|
| Títulos y voz editorial | Bricolage Grotesque desde `efeonceGraphicLine.type.answer.family`; escala/peso según rol y contrato de componente, sin aplicar el peso de una respuesta gráfica a todo encabezado |
| Lectura y operación | Poppins desde `efeonceGraphicLine.type.text.family`: párrafos, navegación, controles, formularios, notas, captions y evidencia; pesos por componente |
| Jerarquía de superficie | Roles del adapter La órbita Rooms derivados del canon; verificar wrap, escala responsive y carga efectiva de fuentes; no heredar `surfaceHeroTitle` con familia Poppins |
| Arte creativo | Mantiene tipografía, color y composición originales; fuentes de marca solo si están provistas/licenciadas |
| Autoría | Papel/navy desde `efeonceGraphicLine.color` y `axisColorSystem`; densidad funcional, controles de marca y bordes discretos |
| Escenario | Fondo sobrio claro/oscuro según material; rol neutral de inspección por mapear o proponer, sin afirmar token existente |
| Acento | `resolveAxisColorRoles`/`axisColorSystem` y `axisOrbitRamp`, derivados de La órbita; contexto de línea explícito, sin inventar acento propio Rooms. Texto pequeño y estados según contraste/contrato del componente |
| Iconografía | Catálogo oficial Trazo/Plastilina según función/voz; controles con glifos funcionales del componente y labels. `resolveIcon`/`auditIconGroup` cuando se compone iconografía; nunca glifos dibujados a mano ni Plastilina en volumen en UI |
| Espaciado | Escala `axisGeometry.spacing` existente; nuevos gaps semánticos se derivan de ella, no literales arbitrarios |
| Elevación | `axisElevation` raised/floating/overlay según jerarquía; sombra solo si comunica superposición |
| Motion | Gramática y recursos de `efeonceGraphicLine.motion`; interacción funcional con `axisMotion` y estados del componente; wrappers nativos Rooms |

La elección clara/oscura afecta al marco, jamás recolorea una pieza. Checkerboard de transparencia solo en inspección explícita. Halo, lente, foco o profundidad se usan cuando cumplen la intención y receta de La órbita; no se prohíbe su luz canónica ni se añaden efectos ajenos. Personalización por cliente conserva el design system de Rooms; assets y contenidos del cliente conservan su marca. Contenido, tenant y permisos no dependen del tema.

Geist no es la fuente de lectura de Rooms. Guttery/verde/manzana/bytes de Glitch y el registro Manzanitas no se trasladan al producto. No copiar CSS del Lab ni importar wrappers privados de Greenhouse/Vuexy: consumir los packages y adaptar por roles de La órbita, fijando versiones al implementar.

La voz pregunta/respuesta es una composición específica, **no la estructura obligatoria de las propuestas ni un asistente de preguntas y respuestas**. Títulos declarativos, relatos, método y evidencia mantienen su función. Una órbita debe rodear, medir o enfocar algo concreto; no aparece en cada card. Si mide progreso, el dato/posición es real; si indica espera, usa el contrato de loading y nunca simula un porcentaje. No texto cruzando órbita ni marca sobre arte del cliente.

## 4. Primer viewport y responsive

Desktop 1440×900: cabecera compacta; contexto/título y acción reconocibles; trabajo creativo o demostración SEO/AEO visible sin scroll; mapa cerrado o resumido. La composición puede ser asimétrica, con arte dominante y texto breve. Evitar hero lleno de copy que relegue las piezas al segundo fold.

Pantalla 1920×1080: stage amplio con contain y fondo controlado. La pieza 9:16 se ve completa con espacio lateral útil, no recortada para llenar 16:9. Datos y fundamentos pueden ocupar el lateral cuando se solicitan.

Móvil 390×844: contexto breve, pieza y acción visibles; lectura en una columna, paneles a pantalla útil, controles tocables. No reproducir el escritorio reducido. Una pieza larga abre lectura dedicada. El navegador conserva su zoom; navegación de vuelta predecible.

Tablet 1024×768: explorar/presentar en una ventana; barras plegables, sin asumir mouse. Autoría puede revisar y corregir campos simples; la composición intensiva prioriza desktop.

## 5. Inventario reuse / extend / new

| Decisión | Piezas |
|---|---|
| Reuse | Tokens/assets de La órbita y componentes de marca distribuidos por AXIS: botones, chips, badges y formularios, según export y madurez verificados |
| Extend | Navegación contextual, estados de carga y paneles sobre primitives existentes; verificar export real antes de consumir |
| New en Rooms | RoomStage, VariantRail, NarrativeMap, EvidencePanel, InventoryCoverage, PresenterConsole, AudienceView, EditorialReader, XrayInspector, EvidenceSnapshotView y PlanView; nombres candidatos |

Las composiciones nuevas son dominio Rooms; no se publican en AXIS por anticipación. Un problema portable demostrado en más de un consumidor puede promoverse mediante el contrato de AXIS.

## 6. Anti-patrones y aceptación

Rechazar: grid de cards uniformes como experiencia principal, carrusel que oculta inventario, crop automático de anuncios, animación de cada palabra, scroll secuestrado, cursor personalizado obligatorio, video con sonido automático, loader cinematográfico para trabajo ya disponible y controles esenciales solo al hover.

Pendiente: capturas desktop/móvil, grabación de interacciones, contraste, teclado, texto ampliado y prueba con dos marcas. Verificar fuente calculada y glifos efectivamente renderizados: Bricolage editorial/Poppins funcional, sin fallback silencioso a Geist. Auditar origen de colores, iconografía, estados y motion con la skill La órbita. Aplicar el premium UI standard del repo; objetivo de evaluación ≥4,5 promedio, ningún eje <4 y ejes críticos ≥4,5. No hay score asignado sin superficie renderizada. La fidelidad de las piezas y la claridad para el champion son criterios de aceptación, no solo apariencia.

## 7. Composición SEO/AEO y sala combinada

La [definición de perfiles](../../architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md) añade lectura editorial a ancho útil y radiografía bajo demanda: seleccionar fragmento revela decisión/evidencia, con referencia de origen persistente. Desktop puede dividir el plano; móvil usa panel legible y retorno al bloque. Planes y hallazgos conservan jerarquía editorial, sin convertir la sala en un dashboard de tarjetas. Las visualizaciones ofrecen valores/unidades y alternativa tabular; colores de estado no sustituyen etiquetas.

El instrumento usa Bricolage/Poppins de La órbita aunque reutilice el contrato funcional X-ray; jamás importa su tipografía histórica por defecto. La pieza cliente conserva su identidad. Una sala combinada mantiene el mismo marco al pasar de argumento a artículo, radiografía o video. QA exige ambos perfiles y la transición entre ellos.
