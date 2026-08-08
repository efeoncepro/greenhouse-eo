# TASK-1310 — Dirección visual: SEO cliente + Report Artifact

## Modo y fuente

- Modo: `repo-native-benchmark`
- Fuente durable: `docs/ui/wireframes/TASK-1310-growth-seo-client-dashboard-report-artifact.md`, el
  master flow de Search Visibility 360, la vista cliente AEO aprobada y la dirección
  `TASK-1308-growth-seo-keyword-opportunities-direction.md`.
- Proveniencia / decisión: el operador pidió la recomendación de dirección más profesional y premium
  para competir con AEO y Semrush el 2026-08-08. Se adopta una composición híbrida, con una dirección
  principal y dos patrones subordinados.
- Estado: las tres direcciones se implementan como una familia coherente.
- Targets: desktop 1440×900 · compact 390×844.

## Enmienda vigente — auditoría 2026-08-08

La dirección anterior describía `masterDetail` para el dashboard, pero la decisión vigente para esta
superficie es `CompositionShell composition='single'` con navegación SEO horizontal mediante tabs. El
menú vertical principal conserva su ownership y no se introduce un rail SEO lateral. Esta enmienda supera
la aceptación visual anterior: las capturas de 10:25–10:26 son baseline fallido y el trabajo continúa por
la [auditoría premium de TASK-1310](../reviews/TASK-1310-growth-seo-client-dashboard-report-artifact-audit-2026-08-08.md).

La dirección de ejecución se nombra **Editorial Evidence Canvas**: canvas abierto, evidencia agrupada por
fuente, disclosure progresivo, charts honestos para datos escasos y ausencia de card-on-card. AEO usa un
icono de estrella única (`tabler-star`/`tabler-star-off`) dentro de esta familia; `tabler-sparkles` no se usa
en las superficies de TASK-1310.

### Corrección vigente — materialidad tonal posterior al primer loop

`Canvas abierto` no significa una superficie gris única. La revisión GVC del primer loop mostró que eliminar
la materialidad dejó una pantalla plana y sin foco. La dirección activa conserva la economía de superficies,
pero recupera tres planos intencionales: base clara del producto, hero tonal para el veredicto y una superficie
de evidencia con tinte propio por lectura. El color semántico puede ocupar un plano cuando explica la fuente o
el estado; no se usa como wallpaper ni se repite en cada fila.

- Resumen: hero tonal + banda KPI de posición + rail de evidencia cromático.
- Evolución: panel de evidencia claro + cabecera temporal tonal + stage de chart diferenciado.
- Quadrant: panel mapa con identidad AEO/SEO + rail de distribución + tabla sobria priorizada.
- Report: masthead editorial y módulos con la misma materialidad tonal, sin convertir cada sección en una card.

El criterio premium vigente es **superficies hermanas con contraste de plano**, no `open` aplicado a todo.

## Alternativas comparadas

1. **Evidence Narrative** — el dashboard abre con un veredicto legible, métricas que prueban la lectura
   y luego muestra evolución y quadrant. Es la dirección principal del producto.
2. **Visibility Map** — el quadrant SEO × AEO toma el protagonismo y permite leer la posición estratégica
   sin convertir los ejes en un score compuesto. Se conserva como módulo hero de `Quadrant 360`.
3. **Trust Report Artifact** — el informe adopta un tono editorial, imprimible y presentable, con
   masthead, veredicto, evidencia y provenance. Se conserva como la jerarquía de `/growth/seo/report`.

## Decisión

Se construyen **las tres direcciones** como una familia de producto. No serán tres temas intercambiables
ni tres páginas que compiten por el mismo trabajo: cada una posee un momento de uso propio y comparte
contratos, tokens, disclosure y lenguaje visual.

La composición final asigna cada dirección a su superficie natural:

- `/growth/seo`: **Evidence Narrative** en `CompositionShell` `single`, con tabs horizontales para entender qué está
  pasando y decidir el siguiente paso.
- Sección `Quadrant 360`: **Visibility Map** como visualización dominante, con ejes ortogonales y labels
  textuales, para hacer visible el diferenciador SEO × AEO.
- `/growth/seo/report`: **Trust Report Artifact**, usando el mismo `ReportArtifactModel` y el adapter SEO,
  no un sistema de scoring paralelo, para entregar y compartir la lectura.

La unidad visual se mantiene mediante una misma gramática: veredicto antes del gráfico, superficies hermanas,
provenance visible, color semántico, estados honestos y acción contextual. La diferencia entre las tres es
jerarquía, no branding ni un sistema de componentes paralelo.

### Por qué no usar una sola alternativa en toda la tarea

- Visibility Map como pantalla completa sacrifica el contexto temporal y puede sentirse como una demo de
  visualización.
- Trust Report Artifact como dashboard diario es demasiado editorial y reduce la velocidad de lectura
  operativa.
- Evidence Narrative como único tratamiento no aprovecha la oportunidad de hacer del quadrant y del
  informe dos momentos distintivos del producto. Construir las tres permite que el dashboard sea útil a
  diario, el quadrant sea memorable y el informe sea presentable sin duplicar contratos.

## Tesis visual

- **Orden de lectura del primer fold:** breadcrumb → título y contexto → veredicto de visibilidad →
  métricas de evidencia → siguiente acción → evolución / quadrant.
- **Decisión dominante:** decir qué significa el dato antes de dibujarlo.
- **Densidad:** aire editorial en la parte superior; densidad analítica controlada en los paneles de
  evidencia.
- **Modelo de profundidad:** planos tonales hermanados, borde sutil y elevación mínima; no card-on-card ni
  fondos decorativos sin función.
- **Rol tipográfico:** `surfaceHeroTitle` para el título de la superficie; `h4`/`h5` para veredictos y
  paneles; labels cortos y legibles dentro de los gráficos.
- **Rol del color:** tokens semánticos para estado y acción; el color nunca es el único canal de
  significado. SEO y AEO mantienen identidad visual separada.
- **Detalles de firma:** delta junto al KPI, provenance al lado de la evidencia, eje de posición invertido
  documentado, quadrant con nombres de celda y cross-link recíproco a AEO.

## Target desktop — 1440×900

### Dashboard `/growth/seo`

La composición usa `single`: una banda horizontal de secciones SEO debajo del encabezado y un canvas de
detalle a todo el ancho disponible. El menú vertical principal mantiene el ownership de navegación. El
encabezado conserva breadcrumb, título "SEO — Visibilidad en búsqueda", provenance por fuente y el CTA
`Ver informe` en una sola línea. El primer detalle comienza con un veredicto de una o dos líneas, no con
cuatro KPI cards sin contexto.

El resumen contiene una banda de evidencia con visibilidad orgánica, posición media, keywords de página 1
y oportunidades priorizadas. Debajo, la evolución y el quadrant son paneles hermanos. El quadrant utiliza
un crosshair 2×2, cuadrantes rotulados y un punto/agrupación legible; X representa citabilidad IA y Y
posición SEO con 1 arriba. No depende de hover para explicar lo que significa cada celda.

### Report `/growth/seo/report`

El informe usa el tratamiento editorial: masthead sobrio, organización/dominio, fecha de corte, badge de
lectura ejecutiva, veredicto, KPI de resumen, luego quadrant y evolución en paralelo. La provenance y la
metodología aparecen como una nota de confianza al cierre. El control de descarga pertenece al chrome del
artifact; el contenido usa la misma semántica y disclosure del `ReportArtifactModel`.

## Target mobile — 390×844

- La banda de tabs se vuelve scrollable de forma contenida en compact; no se crea un segundo menú lateral ni
  un drawer SEO. El foco permanece en la tab activa y el panel conserva su relación `aria-controls`.
- El encabezado se apila sin generar una segunda barra de chrome; `Ver informe` permanece visible como
  acción secundaria accesible.
- El veredicto ocupa el ancho completo; los KPIs pasan a una cuadrícula 2×2 con label y delta.
- Evolución y quadrant se apilan. El gráfico conserva labels esenciales y un resumen textual para no
  depender del tooltip.
- El quadrant ajusta sus márgenes y leyenda al viewport, sin scroll horizontal; cualquier lista de
  keywords queda debajo del canvas, no al lado.
- El informe mantiene el orden editorial pero reduce el masthead y apila los dos módulos de evidencia.
- Con `prefers-reduced-motion`, charts y transiciones entran sin animación.

## Mapeo al sistema

| Cue | Primitive / recipe canónica | Desviación |
|---|---|---|
| Layout dashboard | `CompositionShell composition='single'` | Tabs SEO horizontales dentro del canvas; no rail lateral |
| Navegación | `GreenhouseBreadcrumbs` + `Tabs`/`tabpanel` | Labels propios de SEO en copy canónico |
| Veredicto | `Typography` + superficie hermana `Card` outlined | Componente local de feature; no se promueve aún |
| Métricas | `Card`/`CardContent` y tokens semánticos existentes | No se agrega un KPI primitive nuevo |
| Evolución | ECharts lazy existente, serie de `readRankEvolution` | Y invertido y labels textuales |
| Quadrant | ECharts lazy existente, `classifyQuadrant` para leyendas | Scatter 2×2 local, sin score compuesto |
| Report web/print | `ReportArtifactModel` + adapters existentes | Nuevo `modelFromSeoReport` y adapters SEO aditivos |
| Estados | `EmptyState`, banner honesto y locked/teaser | Copy nuevo en `GH_GROWTH_SEO_CLIENT` |
| Color | Paleta semántica Greenhouse y roles de identidad | No se permiten HEX literales de diseño |
| Profundidad | `plane='none'`, superficies tonales hermanas, bordes/dividers y elevación del sistema | Sin gradientes, glass, sombras teatrales o card wallpaper |

## Anti-patrones

- Un score único que fusione SEO y AEO.
- Un hero visual que no explique la lectura de negocio.
- Muro de tarjetas KPI sin veredicto ni provenance.
- Alert full-width para una nota de cobertura o falta de GSC.
- Quadrant sin ejes, labels de celda o estado `sin_dato` explícito.
- Dashboard oscuro, neon, glassmorphism o gradientes usados para simular premium.
- Report SEO con scoring, disclosure o charts forkados del AEO.
- Datos crudos de operador, costos de provider o competidores no client-safe.
- Valores literales de diseño en `className` o estilos fuera de los tokens existentes.

## Acceptance signature

- Promedio objetivo ≥4.5/5 en jerarquía, economía de superficies, impacto visual, fidelidad al sistema y
  resistencia a template genérico; ninguna dimensión por debajo de 4/5.
- El primer fold responde qué está pasando, por qué importa y cuál es el siguiente paso.
- Dashboard y report comparten contrato de datos y disclosure; no hay scoring duplicado.
- Desktop 1440×900 y compact 390×844 sin `scrollWidth > clientWidth`.
- Evolución documenta `1 = mejor` y el quadrant usa ejes ortogonales, labels y degradación honesta.
- Teclado, foco restaurable, `role=img`, reduced motion y estados locked/empty/error/degraded cubiertos.
