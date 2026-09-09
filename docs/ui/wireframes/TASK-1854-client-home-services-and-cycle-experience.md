# TASK-1854 — Wireframe: Inicio, servicios y ciclo

Diseño detallado 2026-09-09; UI ready: no. Contrato para implementación, sin JSX ni evidencia GVC.
- Visual direction mode: repo-native-benchmark
- Product Design asset: docs/ui/visual-directions/TASK-1854-client-home-services-and-cycle-experience.md
- Flow: docs/ui/flows/TASK-1854-client-home-services-and-cycle-experience-flow.md
- Motion: docs/ui/motion/TASK-1854-client-home-services-and-cycle-experience-motion.md

## Alcance y convenciones

Pantallas H0 Inicio, S1 servicio/período y S2 detalle contextual de trabajo. H0 y S1 pertenecen a esta task;
S2 enlaza el destino canónico de Delivery/revisión cuando existe. No se crea un editor ni visor de assets.
Toda cifra en ejemplos es un fixture sintético de diseño, no un dato de Berel/Sky ni un objetivo comercial.
Las rutas nuevas y los campos DTO siguientes son contratos propuestos, no capacidades ya implementadas.

| Superficie | Ruta de diseño | Resolución y ownership |
|---|---|---|
| H0 Inicio | `/home` existente | Se integra en el consumer cliente de Home; no sustituye el Home interno |
| S1 Servicio | `/home/services/[serviceId]?period=[periodId]` propuesta | Nueva página hoja de TASK-1854; scope, vista/módulo y acciones de TASK-1852/1853 |
| S2 Trabajo | `authorizedDestination` del objeto | Reusar destino real; `/reviews` existe pero sus filtros exactos no se inventan |
| I1 Edición | `authorizedDestination` de TASK-1849 | Familia `/insights/**` propuesta por su dueña; no `/nexa/insights` |
| R1 Solicitudes | `/home/services/[serviceId]/requests` propuesta | TASK-1856; enlace sólo tras habilitación del reader/command |

`serviceId` y `periodId` son identificadores opacos. No transportar títulos, correos, briefs ni tokens en
query strings. La ruta no selecciona libremente una organización; el servidor resuelve contexto y autoridad.
El guard base de Home no habilita por herencia sus hijos. Registrar su mapping de vistas antes del rollout.
La ubicación bajo Home es navegación de servicio, no una nueva ficha organization-centric/Account 360.

## Desktop Target

### H0 — Inicio, 1440×900

```text
SHELL EXISTENTE: contexto de organización · navegación · notificaciones
┌ Header editorial ──────────────────────────────────────────────────┐
│ Inicio                          Período [Septiembre 2026 ▾]        │
│ Tus servicios y lo que necesita tu atención                         │
│ Corte general sólo si es común a todas las señales                  │
└────────────────────────────────────────────────────────────────────┘
┌ Hoja de trabajo ───────────────────────────────────────────────────┐
│ NECESITA TU ATENCIÓN                                                │
│ [objeto autorizado] · [servicio] · [siguiente paso]    [Revisar …]    │
│ [fecha comprometida si existe; sin urgencia inventada]              │
│ ────────────────────────────────────────────────────────────────── │
│ MIS SERVICIOS                                                      │
│ SEO                      hallazgo breve, fuente/corte   Ver servicio│
│ Marketing de contenidos  avance y pendiente concreto    Ver servicio│
│ ────────────────────────────────────────────────────────────────── │
│ EFEONCE INSIGHTS                                                    │
│ [título edición emitida] · [período] · [fecha]          Abrir informe│
│ [resumen aprobado para el cliente, como máximo dos frases]          │
└────────────────────────────────────────────────────────────────────┘
```

Sky recibe la misma composición con una fila de Diseño digital. No se rellena espacio con servicios no
contratados. Si no hay una acción pendiente, la cabecera de la hoja comienza por Mis servicios; un texto
breve “No tienes acciones pendientes” aparece subordinado, sin medalla ni tarjeta celebratoria.

El primer fold debe contener contexto, primer servicio y siguiente acción si existe. Insights puede bajar
con muchas filas reales; no desplazar un pendiente concreto para mantener un bloque de informes visible.
No duplicar el mismo CTA como botón de header y de fila. H0 no es un selector que automáticamente cambie
el servicio al recibir un refresh; el usuario elige la fila o llega mediante un deep link.

### S1 — Servicio y período

```text
┌ Header: Inicio / Marketing de contenidos ──────────────────────────┐
│ Marketing de contenidos                   [Período ▾]             │
│ [organización autorizada] · [alcance resumido]                     │
│ [fuente y corte comunes si corresponden]                          │
│ Resumen   Trabajo del período   Solicitudes*                      │
└───────────────────────────────────────────────────────────────────┘
┌ Hoja del servicio ─────────────────────────────────────────────────┐
│ [Tesis factual: 2 piezas esperan tu revisión]                      │
│ Entregadas 6       En producción 3        En revisión 2            │
│ [unidad y cobertura por señal, si difieren]                        │
│ ─ Próximo paso ─────────────────────────────────────────────────── │
│ [Pieza seleccionada por prioridad del reader]     [Revisar pieza]  │
│ [responsable visible y fecha confirmada, o siguiente paso real]    │
│ ─ Trabajo del período ──────────────────────────────────────────── │
│ Pieza              Estado        Fecha       Próximo responsable  │
│ [título]           En revisión   [fecha]     Tú                    │
│ [título]           En producción [fecha]     Equipo Efeonce        │
│ [paginación y total conocido; ver todas las piezas si corresponde] │
│ ─ Efeonce Insights ─────────────────────────────────────────────── │
│ [edición de este servicio/período]               [Abrir informe]   │
└───────────────────────────────────────────────────────────────────┘
* Solicitudes sólo cuando TASK-1855/1856 estén operativas y permitidas.
```

Los números 6/3/2 son exclusivamente fixture. “Entregadas” no incluye publicaciones como una etapa
implícita ni derivados contados dos veces. La tesis factual usa cantidades del reader, no texto generado
que infiera éxito. El porcentaje de avance sólo existe con denominador y clasificación explícitos.
Los tabs Resumen/Trabajo son navegación dentro de la misma superficie; no duplican toda la hoja debajo.
Resumen ofrece primeras filas; Trabajo ofrece lista completa y sus filtros. Sólo el panel activo se monta.

### Modelo de contenido por servicio

| Zona | SEO | Marketing de contenidos | Diseño digital |
|---|---|---|---|
| Tesis | Cambio medido o cobertura disponible | Estado del ciclo editorial | Estado de entregables y revisiones |
| Señal principal | Clics Search Console si existen; fuente alternativa identificada | Piezas principales entregadas o en revisión | Entregables principales confirmados |
| Secundarias | Impresiones/CTR comparables; no mezclar ranking de proveedor | En producción / en revisión; publicación separada | Puntualidad/rondas según ICO y denominadores |
| Evidencia | Serie medida o tabla de observaciones autorizadas | Título, tipo, estado, destino editorial | Miniatura autorizada opcional, formato, versión, estado |
| Siguiente acción | Ver hallazgo o completar información requerida | Revisar pieza o completar brief | Revisar entrega o completar especificación |
| Profundidad | Vista SEO de TASK-1690 | Pieza en herramienta fuente verificada | Revisión de TASK-289/proveedor verificado |

No se privilegia clics si no hay Search Console. Una estimación se etiqueta “Estimación de [fuente]” y
no ocupa una serie medida bajo el mismo nombre. La posición promedio y el ranking de keyword no se suman.
OTD/RpA/FTR siguen nombres y fórmulas canónicas con explicación legible, sin reimplementarlas en React.
La disponibilidad de una señal se decide por contrato; las tres columnas no obligan a inventar tres KPIs.

### Anatomía de fila y detalle de evidencia

1. Título enlazado completo, identificador secundario sólo si ayuda a reconocer la pieza.
2. Servicio/tipo cuando la lista mezcla servicios; en una lista homogénea no repetir contexto inútil.
3. Estado legible y fecha confirmada; distinguir fecha solicitada de comprometida.
4. Próximo responsable visible permitido, o “Equipo Efeonce”; no mostrar correo interno ni carga personal.
5. Una acción con verbo y objeto. La fila no anida botones en un link que ocupa todo su contenido.
6. Metodología/fuente bajo disclosure accesible: período, asOf, unidad, cobertura, numerador/denominador,
   método, restricción de comparación y destino autorizado si aplica. No tooltip como única evidencia.
7. La pieza principal agrupa derivados; expansión muestra relaciones sin cambiar el conteo de principales.
8. “Publicado” exige evidencia de destino validada. Si no hay URL verificada, mostrar el estado editorial
   disponible y “Publicación sin verificar” donde el contrato lo requiera, sin inventar una etapa exitosa.

## Mobile Target

```text
[Shell compacto · organización · avisos]
Inicio / Marketing de contenidos
Marketing de contenidos
[Período: Septiembre 2026             ▾]
[Fuente/corte legibles]
[Resumen] [Trabajo] [Solicitudes*]
──────────────────────────────────────
2 piezas esperan tu revisión
Entregadas                         6
En producción                      3
En revisión                        2
──────────────────────────────────────
Próximo paso
[Título completo de la pieza]
[Fecha y siguiente responsable]
[           Revisar pieza            ]
──────────────────────────────────────
Trabajo del período
[Título completo]
Estado       En producción
Fecha        [confirmada / sin definir]
[Ver detalle]
```

- Controles de alcance en su propia fila a ancho completo; el valor activo no se corta con el chevron.
- Orden de DOM = orden de lectura. No CSS order que desplace la acción y deje otro orden de teclado.
- Tabs visibles con texto completo; si no caben, navegación compacta canónica con label del panel activo.
  No admitir scroll horizontal de página. Un scroller de tabs sólo con affordance y allowlist GVC explícita.
- Listas con pares label/valor; nunca una tabla reducida hasta texto ilegible.
- Miniaturas se reducen o pasan bajo el título; conservan alternativa textual y no determinan el estado.
- No footer flotante para lectura. La acción vive junto al objeto; no cubrir contenido con un CTA persistente.
- El periodo abierto y el tab activo sobreviven a Back. No volver automáticamente al mes actual.

## Action Hierarchy

| Contexto | Primaria | Secundarias | Ausencia de permiso |
|---|---|---|---|
| H0 con pendiente | Ver/revisar el objeto priorizado por el reader | Ver servicio, abrir edición | No mostrar CTA de escritura |
| H0 sin pendiente | Ver servicio si sólo hay uno; filas si hay varios | Abrir último informe | No fabricar una tarea para llenar el espacio |
| S1 con acción cliente | Revisar pieza / Completar información | Ver trabajo, abrir informe | Lectura independiente si sigue autorizada |
| S1 sin pendiente | Nueva solicitud cuando esté habilitada | Ver evidencia/historial | Sin botón si capacidad no existe; explicación si temporalmente bloqueada |
| Error de sección | Reintentar esa lectura | Volver a resumen | No reintentar una denegación como error de red |

Ranking de pendientes es responsabilidad de TASK-1853: prioridad y criterio estables, fechas confirmadas y
siguiente actor. El front preserva orden y no declara urgencia por color o por cantidad de notificaciones.
Una capacidad futura no aparece como control deshabilitado indefinidamente. Un bloqueo temporal de una
capacidad disponible sí explica causa y recuperación accesible.

## Visual Fidelity Mapping

| Intención | Primitive / contrato verificado | Decisión |
|---|---|---|
| Estructura H0/S1 | `SurfaceRecipe kind='analyticsReport'` → CompositionShell single | reuse; header fuera de regions.primary |
| Chrome | `WorkbenchHeader kind='report'` | secondaryActions alcance; meta hechos; supporting tabs |
| Señales | `SignalStrip variant='integrated' kind='custom'` | reuse; valores browser-safe del reader |
| Secciones | `OperationalSection kind='content' variant='open'` | reuse; sin contenedor por sección |
| Listado navegable | MUI List/ListItem y links canónicos del starter-kit | reuse base: InventoryList expone listbox y SelectionRow selección, no links |
| Breadcrumb | `GreenhouseBreadcrumbs kind='pageHierarchy'` | reuse; ancestros links, último aria-current |
| Fuente expandible | `GreenhouseDisclosureTrigger` y disclosure canónico | reuse, misma fuente en compacto |
| Carga | Texto de estado estable + MUI Skeleton decorativo en región existente | reuse base; GreenhouseLoadingSurface añade fade de texto y otra card, no apropiado aquí |
| Vacío/denegación | empty-states existentes de client-portal | reuse con copy específico, sin raw error |
| Input de alcance | wrapper Vuexy `CustomTextField`/`CustomAutocomplete` según catálogo | reuse; no combobox artesanal |
| Tipografía | `surfaceHeroTitle`, `h5`, `body1`, `body2`, `caption`, `kpiValue`, `monoId` | bridge de typography-tokens.ts |

`SurfaceRecipe` contiene el body; no anidar DetailHero report contenido dentro de ese mismo plano.
Si una composición necesita cards canónicas completas, justificar `plane='none'` y contar sus superficies.
Lookup documentado: `InventoryList` monta `role='listbox'` y `SelectionRow` no tiene href;
no falsear esa semántica para navegar. Usar lista semántica con links reales tras el lookup de primitives.
`GreenhouseLoadingSurface` actual envuelve texto en MotionShell con opacity de entrada y plano propio;
se conserva como referencia, pero aquí se usa estado textual estático y skeleton decorativo de MUI.
No se crea primitive nueva; un gap real se extiende en su dueña, con ejemplo y revisión independiente del consumer.

## State Copy

Claves propuestas en `src/lib/copy/client-services.ts`; nombres institucionales del nomenclature config.

| Clave / estado | Texto propuesto | Acción y regla |
|---|---|---|
| loading | “Estamos cargando tus servicios.” | Estructura estable; no porcentaje ficticio |
| noPending | “No tienes acciones pendientes.” | Se mantienen trabajo y resultados |
| noPeriod | “No hay trabajo registrado para este período.” | “Cambiar período”; no decir que no hay servicio |
| noSource | “Aún no tenemos datos de [fuente] para este período.” | Otras fuentes continúan disponibles |
| partial | “Estos resultados incluyen [cobertura].” | “Ver cobertura”; nunca porcentaje sin base |
| stale | “Últimos datos disponibles: [fecha y hora].” | Reintentar sólo si el reader lo permite; no inventar próxima sync |
| readError | “No pudimos cargar [sección]. Puedes volver a intentarlo.” | “Reintentar”; conservar el contexto |
| noService | “Tu organización no tiene este servicio habilitado.” | Canal de contacto sólo si está configurado |
| deniedObject | “No tienes acceso a este contenido.” | “Volver a Inicio”; no título, thumbnail ni existencia ajena |
| invalidPeriod | “Este período no está disponible.” | Elegir entre opciones autorizadas; no sustituir silenciosamente |
| incomparable | “Sin comparación equivalente.” | Explicar motivo en metodología |
| noQuota | “Consumo contractual no disponible.” | Mostrar avance; no dibujar saldo cero |
| noInsight | “Aún no hay un informe disponible para este período.” | Sólo dentro de un módulo Insights habilitado |
| reportScope | “Informe emitido el [fecha], con datos al [corte].” | Distinguir de métricas actualizadas del servicio |

Empty de servicio no contratado sólo después de resolución confiable; fallo del resolver es degradación.
No convertir un 404/403 de objeto en un mensaje comercial que revele a qué cuenta pertenece.
Números/fechas con locale y zona configurados; SEO no hereda fechas por el país del navegador. Mostrar zona
cuando una hora límite pueda cambiar de día. Conteos singular/plural, fechas largas y copy extenso son fixtures.

## Accessibility Contract

- Un h1 por pantalla; secciones h2; filas no simulan headings por tamaño. Variantes y HTML semántico separados.
- Selectores con labels persistentes, helper/error conectados por aria-describedby; no placeholder como label.
- Estado por texto e icono además del color. Texto normal AA 4.5:1; texto grande 3:1; controles/foco 3:1.
  Medir contraste compuesto en capturas cuando haya alpha, no sólo tokens aislados ni axe.
- Objetivos táctiles de al menos 44×44 CSS px como criterio de experiencia; mapping al tamaño canónico.
- Gráfico sólo con datos suficientes, resumen textual y tabla equivalente accesible. Sin animación de cifras.
- Un live region de estado por actualización; no anunciar cada celda ni tomar foco en refresco de fondo.
- No tooltip necesario para identificar fecha, estado, acción o valor completo. Escape cierra disclosure flotante
  y restaura invocador; links reales preservan nueva pestaña y comportamiento estándar.
- Fuente a 200 %, reflow, teclado, lector, reduced motion y `scrollWidth === clientWidth` incluidos en QA.

## Implementation Mapping

| Capa | Owner | Requisito para el consumer |
|---|---|---|
| Scope/vista/acción | TASK-1852 | Organización autorizada y destinos habilitados; guard por cada ruta nueva |
| Lista de servicios | TASK-1853 | serviceId, displayName, alcance permitido, períodos disponibles, estado de cobertura |
| Métrica | TASK-1853 / TASK-1690 | value nullable, unit, source, asOf, período, metodología, coverage, comparison explícita |
| Trabajo | TASK-1853 / Delivery | Parent/derivados, estado canónico, fecha solicitada/comprometida, siguiente actor permitido |
| Pendiente | TASK-1853 / TASK-289 | Orden estable, motivo, destino, capacidad; no sorting local de prioridades |
| Informe | TASK-1849 | Título/redacción cliente, edición, corte, output disponible y destino autorizado |
| Solicitud | TASK-1855/1856 | Enlace sólo con reader/command operativo; no consulta a stores desde browser |

DTO contract requirements, no nombres de campos existentes garantizados. Si falta un dato, su dueña lo
resuelve o la sección adopta el estado honesto documentado. No calcular resultados en cliente para llenar UI.
Requests se cancelan/descartan por clave organización+servicio+período+vista; una respuesta tardía nunca
pinta datos del contexto anterior. Caché privada y autoridad revalidada al entrar y antes de navegar a objetos.

## GVC Scenario Plan

Archivo propuesto `scripts/frontend/scenarios/task1854-client-services.scenario.ts`, `CaptureScenario`
tipado, `qualityProfile: 'premium'`. No existe aún ni se presenta este plan como test ejecutado.
Markers propuestos: `client-services-root`, `client-service-header`, `client-service-scope`,
`client-service-evidence`, `client-service-next-action`, `client-service-work`, `client-service-insight`,
`client-service-state`. Sin IDs, títulos privados ni datos de cuenta en nombres de markers.

| Caso | Fixture y pasos | Aserción observable / captura |
|---|---|---|
| H54-01 | SEO+contenidos sintéticos; abrir H0 y S1 | Dos servicios, prioridad correcta, fuente visible; first fold desktop/390 |
| H54-02 | Diseño sintético con un servicio | No SEO/AEO/Globe implícitos; ninguna tarjeta de relleno |
| H54-03 | Período vacío, valor cero, null y parcial por separado | Cuatro representaciones distintas; cero no es ausencia |
| H54-04 | Cambiar período rápidamente con respuestas invertidas | Sólo último período activo; label/datos/corte coinciden |
| H54-05 | Una fuente falla y otra responde | Bloque local con retry; resto útil; retry no resetea la selección |
| H54-06 | Trabajo con derivados y publicación sin confirmar | No doble conteo; no badge Publicado sin evidencia |
| H54-07 | Aviso → login → objeto → Back | Objeto exacto y retorno contextual; GET sin mutación de negocio |
| H54-08 | Sesión en otra cuenta, objeto revocado o inexistente | Sin datos ajenos en DOM/red/caché/captura; denegación segura |
| H54-09 | Texto largo, zoom, teclado y reduced motion | No overflow; foco visible, orden lógico, misma información |
| H54-10 | Insights no habilitado / sin edición / edición emitida | Oculto / vacío honesto / link autorizado; nunca draft interno |
| H54-11 | Métricas operativas frescas y edición anterior | Dos cortes distintos explícitos; no actualiza el snapshot del informe |
| H54-12 | Deep link leído por scanner/prefetch | Ningún write, aprobación ni adopción humana atribuidos |

Capturar baseline actual y candidate con datos equivalentes; first fold + página + estados focales en
1440×900 y 390×844. Añadir medium para resolver reflow real y sesión oscura si el theme la habilita.
Assert DOM `document.documentElement.scrollWidth === document.documentElement.clientWidth`; revisar también
contenedores y overlays. Escrollers legítimos requieren selector explícito, nunca allowlist global.
La prueba de autenticación/negativas usa fixtures técnicos; los clientes no son datos de pruebas destructivas.

## Design Decision Log

Dirección C seleccionada para implementación; detalles y rechazos en visual direction.
Rutas bajo Home son nuevas propuestas de esta task; destinations externos/Insights se delegan a sus owners.
Readiness documental no equivale a UI lista: faltan integración de DTO, primer fold renderizado, GVC revisado
y scorecard real. No marcar criterios funcionales completados con este wireframe.
