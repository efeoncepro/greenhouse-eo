# TASK-1352 — Dirección visual: Sistema vivo de crecimiento

## Estado y autoridad

- Status: `approved direction; research-dependent copy; pre-implementation`.
- Owner: `TASK-1352`.
- Surface: sitio público WordPress/Ohio, futura URL `/servicios/hubspot/`.
- Rigor: `ui-standard` con gate premium.
- Direction mode: `repo-native-benchmark`.
- Dirección seleccionada: **Sistema vivo de crecimiento**.
- Source of truth comercial: `docs/services/hubspot-as-a-service/HUBSPOT_OFFER_ARCHITECTURE_V2.md`.
- Source of truth ejecutable: `docs/tasks/to-do/TASK-1352-landing-hubspot-agentic-platform.md`.
- Copy status: ninguna gran idea, H1, claim o prueba queda aprobada por este documento; se resuelven mediante el
  proceso de copywriting/VoC de TASK-1352.

Este documento gobierna composición, identidad visual, jerarquía, comportamiento responsive y criterios de
aceptación. No gobierna claims de producto ni sustituye research de intención, SERP, VoC, CRO o proof.

## Reset de diseño

El diseño anterior de Claude Design es un **baseline negativo**. No se reutilizan su estructura, hero, módulos,
proporciones, copy, claims, imágenes, prompts ni styling. Tampoco se usa como referencia de fidelidad.

Quedan explícitamente descartados:

- catálogo de Hubs o features como estructura principal;
- mapa rígido `dolor → Hub`;
- Customer Agent o Agent Hub como centro de toda la oferta;
- hero gobernada por descuento, waiver, precio o cifra;
- command center/dashboard ficticio;
- constelación de agentes, robots, órbitas, partículas o “red neuronal”;
- bento/card wall, logo wall, gradients sin función y trade dress de hubspot.com;
- copy heredado presentado como definitivo antes del research.

Si una propuesta nueva se parece materialmente al baseline rechazado, el resultado es `REVISE`, aunque pase lint o
use los colores correctos.

## Problema perceptual a resolver

La oferta HubSpot contemporánea es amplia y cambiante. Un comprador puede entrar por marketing, ventas, contratos,
service, customer success, datos, integraciones, proyectos o agentes, pero no necesita memorizar la taxonomía del
producto. Necesita reconocer tres cosas:

1. qué resultado de negocio está intentando producir;
2. cómo se conectan datos, equipos y capacidades para producirlo;
3. cuál es el siguiente paso proporcional y sin ambigüedad comercial.

La dirección debe convertir amplitud en comprensión. La inmersión existe para mostrar relaciones y causalidad, no
para impresionar sin explicar.

## Tesis visual estable

**Sistema vivo de crecimiento** representa seis trayectorias de resultado que comparten datos, decisiones y
accountability. Cada trayectoria conserva identidad, pero ninguna opera como isla. El recorrido visual va de
fragmentación a conexión y de conexión a una evaluación informada.

La tesis visual es durable aunque cambie el H1 final. La gran idea de copy debe descubrirse con research y luego
habitar esta estructura; la estructura no obliga a escoger “evidencia antes que promesa” ni otra frase predefinida.

### Las seis trayectorias canónicas

1. `Marketing, Content & AEO`
2. `Sales & AI Pipeline`
3. `Revenue Lifecycle`
4. `Service, Customer Success & Delivery`
5. `Data, Integration & CRM Intelligence`
6. `Agent Hub & Agentic Operations`

Los Hubs, workspaces, agentes, Contracts, Projects, Services, Smart CRM y capacidades IA son mecanismos dentro de
estas trayectorias. No se convierten en una segunda navegación rival.

## Alternativas comparadas

### A — Sistema vivo de crecimiento — seleccionada

- First fold: categoría y outcome → diferencia Efeonce → acción primaria → señal de confianza → anticipo del sistema.
- Composición: un stage editorial inmersivo y un atlas conectado, no una cuadrícula de módulos.
- Densidad: baja en hero, media en atlas, alta sólo donde se comparan criterios, límites o prueba.
- Profundidad: máximo tres planos funcionales: campo, contenido y señal/conexión.
- Firma: un hilo de señal conecta trayectorias y cambia de rol al atravesar demanda, revenue, servicio, datos y
  agentes.
- Responsive: el atlas se recompone como secuencia vertical; no se encoge ni se convierte en carrusel horizontal.
- Riesgo genérico: bajo si la conexión nace de la oferta y no de un SVG decorativo intercambiable.
- Razón de selección: expresa amplitud, integración y operación sin sesgar la oferta hacia un departamento o moda.

### B — Revenue command center — rechazada

- First fold dominado por KPIs, pipeline y controles.
- Comunica medición, pero estrecha la historia a ventas/RevOps y parece un SaaS propio.
- Oculta marketing, content/AEO, service, customer success, delivery y sectores.
- Riesgo: dashboard ficticio, card soup y confusión entre Efeonce, HubSpot y herramientas propias.

### C — Agentic universe — rechazada

- First fold dominado por agentes, órbitas y automatización.
- Tiene novedad superficial, pero convierte una capa volátil en la arquitectura de toda la página.
- Riesgo: promesa de autonomía no sustentada, estética genérica de IA y envejecimiento rápido.

### D — Refinar el diseño anterior — rechazada

- Mantendría estructura y supuestos, cambiando estilo o secciones.
- No resuelve la causa raíz: brief heredado, gran idea prefijada y producto antes que intención.
- Está fuera de alcance por decisión explícita de TASK-1352.

## Arquitectura de marca Efeonce × HubSpot

Efeonce es masterbrand, responsable de la relación, discovery, diseño, implementación, operación y resultados.
HubSpot es la plataforma habilitante. La página debe sentirse inequívocamente Efeonce y reconocer claramente el
ecosistema HubSpot sin parecer propiedad oficial del proveedor.

### Reglas de identidad

- Header, footer, voz, formulario, relación contractual y CTA pertenecen a Efeonce.
- Los activos HubSpot se usan sólo con fuente, fecha, autorización, variante y condición de vigencia registradas.
- No se crea un lockup Efeonce×HubSpot inventado ni se altera un logo/badge.
- Un badge de partner nunca sustituye la propuesta de valor ni ocupa el lugar del H1.
- Si no existe asset autorizado, se usa texto factual y la identidad Efeonce; no se aproxima el asset.
- La relación de partner o tier se verifica al publicar y mantiene próxima fecha de revisión.

## Contrato cromático

HubSpot se reconoce mediante **color con función**, no mediante apropiación de su UI.

| Token documental | Función perceptual | Uso permitido | Uso prohibido |
|---|---|---|---|
| `--hsx-field-base` | campo maestro Efeonce | hero, atlas y cierre | copiar fondo de hubspot.com |
| `--hsx-signal-primary` | energía/conexión/acción HubSpot | CTA principal, nodo activo, hilo causal | fondo ubicuo o texto pequeño sin AA |
| `--hsx-signal-secondary` | apoyo autorizado | diferenciar estado o transición | inventar por captura/memoria |
| `--hsx-surface-reading` | lectura editorial | secciones, FAQ, proof, form | glassmorphism repetido |
| `--hsx-surface-emphasis` | ownership/selección | panel activo y umbral | card para cada párrafo |
| `--hsx-text-primary` | lectura principal | headings/body | opacidad decorativa |
| `--hsx-text-secondary` | contexto | metadata/disclosure con AA | “muted” ilegible |
| `--hsx-focus` | foco visible independiente | todos los controles | derivarlo sólo del coral |
| `--hsx-success/warning/error` | estado semántico | form y validación | taxonomía de familias |

Antes de implementar se crea un asset/token ledger con `fuente`, `fecha`, `asset`, `valor`, `rol`, `contraste` y
`review_at`. No se aceptan HEX “temporales” que terminen en producción. La paleta se limita a una base Efeonce, una
señal HubSpot dominante y apoyos mínimos autorizados. El color nunca es el único portador de significado.

## Sistema de superficie y profundidad

- Un stage dominante por tramo narrativo; no una card por unidad de contenido.
- Máximo tres superficies contenidas visibles en el first fold, contando cualquier trust/proof element.
- Las familias se conectan dentro de un atlas común; no seis cards equivalentes.
- Sectores se leen como lentes sobre el sistema, no como otra grilla de tres tarjetas.
- Límites, proof y formulario son momentos deliberadamente quietos y de alta legibilidad.
- Bordes, contraste y espacio establecen ownership antes que sombras.
- Sombras sólo para elevación/interacción real; nunca para simular “premium”.
- Nada flota sobre un fondo sin un motivo semántico.

## Tipografía y ritmo editorial

- La tipografía pública vigente del sitio y la masterbrand Efeonce gobiernan; no se imita la tipografía HubSpot.
- Un H1 expresivo y controlado; body legible con ancho de línea estable; metadata y disclosures nunca bajan de
  legibilidad AA.
- La escala editorial produce contraste entre tesis, explicación, evidencia y acción; no depende de mayúsculas o
  weight excesivo.
- Los nombres canónicos de las seis familias pueden conservar inglés donde son denominación de oferta, pero la
  explicación visible usa español LATAM neutro y lenguaje del comprador.
- H1, subhead y CTA permanecen variables hasta cerrar el copy dossier. El mockup usa `COPY_SLOT`, no una frase
  heredada disfrazada de placeholder.

## Lenguaje de imagen e iconografía

Permitido:

- diagramas propios que explican relación, flujo y gobernanza;
- screenshots oficiales/autorizados, actuales y con contexto;
- formas abstractas derivadas de las seis trayectorias y tokens;
- iconografía funcional consistente con el sistema público existente.

Rechazado:

- dashboard o UI HubSpot ficticia;
- stock genérico de equipos mirando laptops;
- robots humanoides, hologramas, cerebros, circuitos y constelaciones;
- screenshots desactualizados usados como prueba;
- logos de Hubs como sustituto de una explicación;
- mockups decorativos que no sobreviven mobile/no-JS.

## First fold target

### Desktop 1440×1100

- Header público heredado y tranquilo.
- Hero entre 78–90 svh, con copy y action hierarchy dominantes.
- Campo del sistema vivo ocupa el segundo plano visual, no compite con el H1.
- CTA primaria visible sin scroll; Meetings subordinado como link/action secondary.
- Trust/proof máximo tres señales, todas verificadas y sin logo wall.
- Se ve el inicio del atlas para prometer continuidad del recorrido.

Lectura de 8 segundos que debe validar una persona:

1. sé que es una oferta HubSpot de Efeonce;
2. entiendo el resultado/categoría, no sólo el producto;
3. percibo que conecta el ciclo completo;
4. sé qué ocurre si solicito la evaluación;
5. no confundo la página con HubSpot oficial.

### Mobile 390×844

- Orden: eyebrow factual → H1 → subhead → CTA → Meetings → proof → visual compacta.
- La visual no empuja la acción fuera del primer viewport por una altura ornamental.
- Atlas como línea/secuencia de seis estaciones, no canvas, swipe ni mini desktop.
- Targets táctiles ≥44 px, inputs ≥16 px, foco visible y cero overflow.
- CTA reaparece sólo en momentos de decisión; no sticky bar permanente.

## Transformación responsive

| Desktop | Tablet | Mobile 390 |
|---|---|---|
| hero split editorial | split asimétrico comprimido | una columna, acción antes del arte |
| atlas con rail + stage | rail compacto + stage | secuencia/`details` semánticos |
| lentes sectoriales en control horizontal | wrap controlado | lista de botones/text links |
| delivery como hilo horizontal/diagonal | steps en dos columnas | lista numerada vertical |
| proof ledger comparativo | stack de evidencias | disclosure editorial sin tabla ancha |
| CTA/form en chamber amplia | chamber contenida | flujo natural, sin modal obligatorio |

No se usa reordenamiento CSS que contradiga el DOM. Ninguna transformación depende de `position:absolute` para
conservar significado.

## Firma inmersiva

### Hilo vivo

Una señal recorre la página y conecta outcomes, datos y decisiones. Su estado final existe en HTML/CSS; motion sólo
explica la relación. El hilo nunca se convierte en una decoración que persigue el scroll.

### Atlas de outcomes

Es el único set piece dominante. Permite reconocer las seis familias y explorar una sin ocultar las otras. Cada
trayectoria termina en outcome, fit, mecanismos elegibles, prueba/límite y la misma acción primaria.

### Cambio de lente sectorial

La lente cambia ejemplos, preguntas y énfasis; no cambia la verdad estructural ni crea una oferta vertical ficticia.
El visitante siempre puede volver a `Todos los sectores`.

### Quiet zones

No-fit, frontera gratuita/pagada, proof, FAQ y form reducen movimiento, profundidad y color. La quietud comunica
criterio y seguridad; no es una falta de diseño.

## Action hierarchy

1. Primary: `COPY_SLOT: assessment CTA` → evaluación inicial sin costo.
2. Secondary: `COPY_SLOT: Meetings CTA` → conversación para quien ya está listo.
3. Contextual: explorar familia, aplicar lente o abrir FAQ.
4. Editorial: visitar un cluster publicado.

El wording final se decide en el copy deck. La función es invariable: verbo + valor, sin “Enviar”, “Saber más” ni
cinco acciones de igual peso.

## SEO/AEO como restricción visual

- Un H1 y H2 descriptivos; headings no se reemplazan por labels visuales ambiguos.
- Cada H2 del fan-out abre un pasaje autocontenido visible y citable.
- Tablas/listas sólo cuando hacen la respuesta más exacta; no como táctica visual automática.
- La información crítica vive en HTML servido, no dentro de SVG, canvas, tabs inaccesibles o JS tardío.
- Metadata/schema deriva del mismo contenido aprobado; la UI no mantiene una segunda verdad.
- Las rutas cluster sólo aparecen si están live, indexables y con canonical propio.
- La composición reserva espacio para una fecha de revisión/fuente cuando un claim lo requiere.

## CRO como restricción visual

- Una sola acción primaria en toda la página.
- Relevancia antes de amplitud: la primera pantalla resuelve categoría/outcome/fit antes de mostrar capabilities.
- Prueba próxima al claim que sostiene; no concentrada en un logo wall distante.
- Ansiedad se reduce con límites, proceso, privacidad y expectativa concreta, no con badges decorativos.
- La frontera evaluación gratuita/blueprint pagado aparece antes del formulario.
- Un no-fit informado es una salida válida; no se fuerza captura.
- Clicks y selecciones no se presentan como conversión.

## Motion posture

- `immersive-causal`, one-shot e interrumpible.
- El contenido nace visible; no-JS y reduced motion reciben el estado final completo.
- Motion explica pertenencia, selección, continuidad o resultado del form.
- Quiet zones no tienen reveals ornamentales.
- Scroll nativo; cero autoplay, loops, parallax de texto, scroll hijacking o custom cursor.
- Contrato exacto: `docs/ui/motion/TASK-1352-landing-hubspot-agentic-platform-motion.md`.

## Primitive y runtime decision

- Decision: `extend`, one-off page-scoped sobre Ohio/WordPress.
- Reusar header/footer, `<greenhouse-form>`, Meetings y tracking gobernados.
- HTML semántico primero; CSS y JS son progressive enhancement.
- CSS page-scoped; no override global del theme.
- No librería nueva por defecto. Cualquier engine adicional requiere prototype, budget, reduced-motion y mejora
  demostrable frente a CSS/JS ligero.
- No promover el atlas a primitive global hasta probar un segundo consumer.

## First-fold checkpoint

Implementar exclusivamente R0, R1, proof inmediato e inicio del atlas. Capturar 1440, 1024 y 390 en default,
keyboard y reduced motion. Registrar una única decisión:

- `ACCEPT FIRST FOLD`: categoría, jerarquía, identidad, composición, acción y transformación responsive pasan;
- `REVISE`: listar región, dimensión, evidencia y cambio requerido.

No se construye R3–R11 antes de `ACCEPT FIRST FOLD`. La aprobación no puede basarse sólo en código o descripción.

## Rejection gates

- Se parece materialmente al resultado anterior.
- Fija H1/gran idea antes del dossier de copy.
- No usa exactamente las seis familias canónicas.
- Customer Agent/Agent Hub domina la composición.
- Parecería una página oficial de HubSpot sin leer el footer.
- Hero funciona como dashboard, logo wall o galería de features.
- Mobile es desktop comprimido o presenta overflow.
- El contenido crítico desaparece sin JS/reduced motion.
- Color, badge o screenshot no tienen fuente/autorización.
- La inmersión degrada LCP, INP, CLS, contraste, teclado o comprensión.
- El scorecard no alcanza promedio ≥4,5, ninguna dimensión <4 y dimensiones críticas ≥4,5.

## Evidencia de aceptación

- GVC premium: 1440×1100, 1024×900 y 390×844.
- Capturas: first fold, atlas, lente sectorial, no-fit, frontera, delivery, proof, FAQ, form, error, success,
  no-JS y reduced motion.
- Checks: un H1; orden DOM; teclado/foco; `scrollWidth === clientWidth`; AA en frames base/intermedios; consola;
  no hydration errors; assets y claims verificables.
- Scorecard de 14 dimensiones según `greenhouse-ai-design-studio`.
- Review de marca, copy, SEO/AEO, CRO, accesibilidad, motion y performance.
- Baseline oficial después de `ACCEPT FIRST FOLD`; el diseño rechazado nunca se promociona como baseline.

## Decision log

- `Sistema vivo de crecimiento` permanece por ser una tesis visual, no una frase de venta.
- La gran idea y el H1 se desacoplan de la dirección y quedan sujetos a research/craft.
- El atlas usa las seis familias exactas; delivery y agentes no crean taxonomías paralelas.
- HubSpot aporta señal cromática y activos autorizados; Efeonce conserva masterbrand y accountability.
- La firma visual es conexión + cambio de contexto + quiet zones, no ornamento tecnológico.
- El primer fold humano es un stop condition, no una formalidad documental.
