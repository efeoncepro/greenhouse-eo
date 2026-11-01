# SKY · Insights limitado al blog: diagnóstico y trabajo pendiente

Fecha: 2026-10-27. Encargo: analizar qué falta para que los informes de Blog y SEO de SKY midan sólo las URL del blog.
Estado: análisis de código, configuración y datos reales, sin implementar ni cambiar configuración compartida.

**Ampliación posterior del mismo día:** el [discovery con subagentes](2026-10-27-sky-blog-discovery/README.md)
desarrolla alternativas, contratos, lifecycle y plan. Verificó BigQuery —cero fechas de SKY en el rango consultado—
y reprodujo problemas de compatibilidad, binding y gate cliente. Esta auditoría conserva el corte inicial;
sus unknowns de BQ se resuelven en el discovery, sin cambiar código o runtime.

**Alcance precisado después por Julio:** GA4, GSC y corridas de nuestro motor AEO deben estar incluidos desde el
primer informe. La propuesta inicial de entrega sólo SEO/GSC queda sustituida por el discovery actualizado y su
[anexo de motor AEO](2026-10-27-sky-blog-discovery/05-aeo-engine-required.md).

## Dictamen

**La base de Berel existe y se puede reutilizar, pero no alcanza para SKY tal como está.** Berel delimita carpetas
y páginas dentro de un dominio; SKY necesita delimitar un **host exacto**, `blog.skyairline.com`, cuyos artículos
están en la raíz. El filtro actual elimina el host antes de clasificar la URL. GA4 tampoco admite filtrarlo desde
su reader canónico. Configurar `/blog`, enumerar artículos o cambiar el título del informe no resuelve el problema.

Search Console ya está conectado al blog; GA4 sigue siendo la propiedad general de SKY. Además, hay dos asuntos
distintos: aislar las URL que se miden y vincular cada informe al servicio de Blog SEO/AEO, separado de Diseño.
Se puede entregar primero un informe SEO acotado sin esperar toda la separación operativa de servicios.

## Evidencia actual

Lecturas SELECT mediante el cliente PostgreSQL canónico y `readSeoContentScope`, sin modificar datos.
Recibo local sin credenciales: `.captures/insights-sky-scope-2026-10-27/readback.json`.

| Componente | Verificado el 27-10 | Implicación |
| --- | --- | --- |
| Organización SKY | `org-b9977f96-f7ef-4afb-bb26-7355d78c981f` | Se mantiene la identidad existente. |
| Alcance de SKY | `readSeoContentScope` devuelve `null` | El adapter conserva su comportamiento sin recorte. |
| Alcance de Grupo Berel | v1 del 12-10; `/articulos`, `/tutoriales`, `/inspiracion` y dos guías exactas | La configuración reutilizable está aplicada; no es sólo una propuesta. |
| GSC de SKY | Activo, `https://blog.skyairline.com/` | La propiedad seleccionada ya corresponde al blog. |
| GA4 de SKY | Activo en DB, `354430952`, «SKY web GA4 - Prod» | Estado de conexión persistido; no se reejecutó Data API en este encargo. |
| Target SEO | `seot-sky-blog-cl`, `root_domain=skyairline.com`, Chile/español | El nombre del target no demuestra alcance de blog. |
| Serie GSC materializada en PG | 11–25 octubre; 149.831 filas, 1.511 páginas, 15 fechas | No hay septiembre en la fuente que leen los KPIs de Insights. |
| Host de esas filas GSC | Todas las páginas del corte: `blog.skyairline.com` | No se observó contaminación de otros hosts en esta serie. |
| Ranking persistido | Sin filas PG para los targets de SKY | No se puede presentar evolución de posiciones monitorizadas como disponible. No se comprobó BigQuery. |
| Cola SEO, todos sus snapshots | 2.400 ítems con URL del blog y 2.291 sin URL | Los acumulados no son el backlog vigente. Los ítems sin URL no prueban pertenencia al blog. |
| Ediciones de SKY | Seis, todas `ready_for_review`, todas sólo `ico` | No aparece una edición SEO de SKY que haya que corregir por este encargo. |
| Recurrencias de SKY | Ninguna | No hay un schedule existente que ajustar. |

El antecedente del [15-10](../growth/2026-10-15-sky-ga4-connection-verification.md) ya documentó con Data API que
la propiedad GA4 contiene el blog y que `hostName=blog.skyairline.com` devuelve datos. También advirtió expresamente
que los adapters canónicos medían la propiedad completa. Esa prueba histórica no acredita una ejecución actual.

## Qué se reutiliza y qué falta

### 1. Extender el alcance de rutas a URLs con host

Implementación actual: `src/lib/growth/seo/content-scope/{contracts,sql,store}.ts` y
`scripts/seo/set-content-scope.ts`, procedentes de TASK-2033.

- Las reglas sólo tienen `kind` y `path`.
- `contentScopePathOf` elimina esquema y host. La misma ruta del blog y de la web principal resulta indistinguible.
- `/` se rechaza; cero reglas significa «sitio completo» y `isContentScopeActive` sólo cuenta reglas de ruta.
- El SQL de GSC y de la cola replica ese comportamiento. No basta añadir un campo al formulario o a la CLI.

Hace falta un contrato versionado compatible con Berel que permita **host sin restricción de ruta**, y también
host combinado con rutas cuando corresponda. Semántica propuesta: hosts permitidos AND cualquiera de las reglas
de ruta; sin rutas, todas las páginas de los hosts permitidos. Ausencia de ambos conserva el comportamiento legado.
La representación final requiere decisión de arquitectura por cambiar un contrato compartido y su persistencia.

Debe alcanzar matcher TS, SQL, validación, igualdad/idempotencia, almacenamiento append-only, CLI y lectores.
No usar `contains`, sufijos ambiguos ni cadenas como `blog.skyairline.com.ejemplo.net`. Una URL relativa no puede
probar su host: sólo se acepta si la fuente aporta una identidad de host inequívoca y documentada.

La primera configuración de SKY debe cubrir `blog.skyairline.com`, incluida su portada y categorías. El pedido
no exige limitarlo a artículos escritos por Efeonce; ese subconjunto requeriría un inventario editorial distinto.
La web `www.skyairline.com` y el motor de reservas quedan fuera. Las URL antiguas `www.skyairline.com/blog/`
son un alcance histórico de migración, no una inclusión automática en el alcance actual.

### 2. Aplicar el host en GA4 y nombrar bien la métrica

`src/lib/growth/analytics-ga4/reader.ts` acepta `landingPrefix` o `landingMatch`, ambos sobre
`landingPagePlusQueryString`. No tiene filtro de host ni `hostName` entre sus dimensiones.
`readGa4ChannelWindow` sólo recibe reglas de ruta; sin alcance consulta la propiedad general.

Hace falta un filtro explícito y validado de host en el reader dueño, compuesto con rutas mediante AND, pasado
por `adapters/ga4-site-facts.ts` para ambas ventanas. Si no se puede aplicar, el informe debe declarar la ausencia
de la métrica en lugar de incorporar la propiedad completa.

Hay que validar además la interpretación: sesiones con actividad en el host y sesiones cuya entrada fue el blog
son poblaciones distintas. Google define `hostName` como el host de la URL y `landingPagePlusQueryString` como la
ruta con query del primer pageview de la sesión; esa última dimensión no contiene el host. Por ello, **un filtro
de host por sí solo no demuestra adquisición con entrada en el blog**. Antes de llamar a una cifra «entradas
orgánicas al blog», contrastar la consulta con controles de entrada y recorridos entre hosts. Si sólo se acredita
actividad en el blog, nombrarla así. [Esquema oficial de Data API](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema).

No sumar sesiones de páginas o de fuentes para reconstruir un total sin control agregado independiente: la cuenta
ya tiene diferencias de agregación documentadas en la verificación del 15-10.

### 3. Propagar y sellar el mismo alcance en todas las fuentes

`adapters/seo-adapter.ts` ya resuelve una vez el alcance, lo reutiliza para actual/comparación y sella
`EvidenceSourceV1.contentScope`. Se conserva esa arquitectura. Hay que transportar también el host y su versión
en `EvidenceContentScopeV1`, el plan y su metodología, sin reinterpretar ediciones antiguas.

Aplicación necesaria por fuente:

| Fuente | Trabajo |
| --- | --- |
| GSC: KPIs, semanas, páginas y consultas que explican el cambio | Añadir host al predicado canónico. La propiedad actual ya acota el dato observado, pero falta declarar y garantizar el alcance. |
| Ranking | La selección de último punto por keyword en `rankFacts` debe comprobar host y ruta de la URL que posiciona. Hoy usa el matcher que descarta el host. |
| Oportunidades | Filtrar por URL antes del límite en el reader de la cola. Una oportunidad sin URL debe quedar fuera o con pertenencia demostrada por un contrato explícito. |
| Tráfico estimado DataForSEO | No usar una cifra de `skyairline.com` como cifra del blog. El rechazo `outside_content_scope` ya existe y debe funcionar también con alcance sólo por host. |
| GA4 desde asistentes de IA | `aeo-adapter.ts` llama a `readGa4ChannelWindow` sin alcance. Si se incluye ese tráfico, debe heredar el host; de lo contrario, excluirlo. |
| Corridas del motor AEO propio | Fuente obligatoria: fijar corrida/panel/método y proyectar citas a URL del blog en el dueño. Un score global de marca no se transforma en score del blog por añadir el filtro de host. |

No es necesario cambiar a ciegas `root_domain` del target ni volver a comprar datos. Primero verificar qué fuentes
pueden servir el subdominio o filtrar por URL y qué histórico existe. El control es sobre la población que se reporta.

**Distinción de métricas:** `organic_etv` del adapter es volumen estimado de tráfico (`visits_estimated`), no dinero.
El valor publicitario por clic × CPC de país de `growth/seo/organic-traffic-value/` es otra capacidad: ya acepta host,
pero no está conectado al adapter de Insights. Integrarlo requiere hechos propios con método y cobertura; no se
obtiene automáticamente al activar el alcance ni debe etiquetarse como ahorro o ROI.

### 4. Cubrir las ventanas de comparación que el informe consume

Es independiente del filtro, pero bloquea un primer informe mensual completo con las fuentes actuales:

- `readSeoOverviewKpisForWindow` y `readSeoWindowMovers` sólo leen `seo_gsc_daily` de PostgreSQL.
- SKY no tiene septiembre ni el 1–10 de octubre en esa tabla al corte de la auditoría.
- El backfill canónico escribe en `greenhouse_growth_analytics.seo_gsc_history` de BigQuery, **no en PG**.
  Ejecutarlo por sí solo no hace que estos readers dispongan de los períodos faltantes.
- Hay que verificar el histórico BQ y ampliar los readers dueños con una estrategia coherente de ventanas,
  deduplicación, cobertura y host. No llenar la tabla operativa con 16 meses para sortear el contrato.
- Septiembre 2026 tuvo datos en las extracciones de auditoría; esos archivos no son una integración con Insights.
- Para seguimiento de recuperación, ofrecer comparación con el mismo mes del año anterior, conforme al marco
  estacional de SKY, siempre que exista cobertura comparable. No sustituir el año faltante por cero.

No se leyó BigQuery en este encargo: su cobertura efectiva queda pendiente de verificar, no se afirma vacía.

### 5. Separar Blog SEO/AEO de Diseño sin bloquear el primer corte SEO

TASK-1960 sigue `to-do`: los informes no están anclados al Servicio canónico. `request.scope` sólo selecciona chips
de portada; poner `content` o `seo` no filtra URLs, tareas ni destinatarios. `projectIds` tampoco resuelve el ICO:
su adapter actual toma los espacios activos de toda la organización.

Para la primera entrega: módulos `seo` y `aeo`, fuentes GA4/GSC/motor AEO verificadas por separado y población del
blog declarada. Excluir `ico` global y no presentar scores generales como resultados de las URL del blog.
Esto permite avanzar sin esperar toda TASK-1960, conservando las tres fuentes obligatorias.
Para informar también producción editorial/OTD/RpA, se necesita el vínculo proyecto → servicio y su lectura filtrada.
La separación formal debe conservar informes y, cuando se configuren, destinatarios y recurrencias por servicio.

El alcance actual vive por organización: no debe convertirse en una restricción comercial implícita de cualquier
servicio futuro de SKY. La evolución por servicio reutiliza el mismo contrato de URL. El informe de Blog debe exigir
su alcance esperado; si falta, no debe aprovechar el fallback legado de «sitio completo».

### 6. Verificar la salida completa y los runtimes

La línea «Qué mide este informe» aparece en la portada blanca A4; navy y deck no tienen esa zona. La entrada del
capítulo y la metodología deben dejar claro `blog.skyairline.com` en A4, deck y web, independientemente de la portada.
El host debe salir del alcance sellado, no de copy escrito a mano o de configuración leída al renderizar.

Los textos del 12-10 que aún dicen «Production sin release» son una foto histórica: `d9a1c6a2d` ya es ancestro del
`origin/main` local (`e593e3993`, 24-10). El alias de producción inspeccionado está READY:
`dpl_3z5iGBjLdUZPeW2BxakrhRvH2Bbc`. Ese readback no expone el SHA ni acredita comportamiento del filtro en vivo.
No corresponde declarar el release viejo como pendiente basándose sólo en esa documentación.

Para la ampliación nueva hay que verificar tanto Vercel como el `ops-worker`, que arma las ediciones programadas.
Activar una recurrencia es posterior a validar la primera edición, no parte del aislamiento de URLs.

## Orden recomendado y aceptación

1. Decisión compatible de alcance por host sobre TASK-2033; identificar su ampliación como unidad formal antes de código.
2. Implementar contrato/persistencia, matcher y filtros GSC/cola/ranking/GA4; conservar regresión de Berel.
3. Configurar SKY por command canónico con preview y motivo; exigir ese alcance en el informe Blog.
4. Verificar cobertura y conectar la historia necesaria en los readers; declarar ausencias cuando falte.
5. Generar una vista previa interna GA4/GSC/motor AEO, revisar evidencia, cifras, copy, A4/deck/web y luego ejecutar el flujo de
   edición/revisión habitual. Una vista previa no equivale a una edición emitida ni a una entrega.
6. Vincular formalmente servicios si se incorpora entrega editorial, recurrencia o separación operativa completa.

Criterios de aceptación proporcionales:

- Host exacto permitido; fuera `www`, reservas, hosts parecidos, URL sin host comprobable y el dominio principal con
  el mismo slug. Portada/categorías del blog dentro por defecto; Berel conserva sus reglas actuales.
- JS y SQL coinciden; GA4 recibe host AND rutas cuando existan; se prueban alcance sólo por host y fallo de lectura.
- Ninguna cifra del sitio principal entra como resultado del blog. Cualquier contexto externo es explícito y
  prescindible; el `site_total.*` de la propiedad GSC actual ya es del blog, no de toda SKY, y no debe describirse como tal.
- Todas las fuentes aplicables sellan host, reglas y versión; actual y comparación usan el mismo alcance.
- Se distingue actividad GA4 de adquisición; se contrastan totales agregados y se publica la cobertura temporal.
- No hay ICO general, presencia AEO general ni tráfico estimado del dominio presentados como trabajo del blog.
- El alcance es visible en los tres formatos y las ediciones selladas previas siguen intactas.
- Primera ejecución comprobada en los runtimes que generarán informes; no basta un flag o una captura del portal.

## Validación realizada y límites

- Tres archivos de pruebas existentes: contratos de alcance, adapters y plan de contenido; **72 pruebas pasadas**.
  Son regresión de la base de Berel; no prueban soporte de host, que todavía no existe.
- Readback de conexiones, alcance, targets, serie GSC, ranking PG, cola, ediciones y schedules de SKY; alcance de Berel.
- Inspección de código de readers/adapters, contrato de request/evidencia, arquitectura y tasks relacionadas.
- Sin cambios de runtime, conexión o alcance; sin backfill, compra de datos, nueva edición, emisión, envío o deploy.

## Fuentes de implementación

- [Arquitectura Insights, §5.1](../../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md).
- [TASK-2033: alcance de contenido](../../tasks/in-progress/TASK-2033-efeonce-insights-content-scope-measurement.md).
- [TASK-1960: informe por servicio](../../tasks/to-do/TASK-1960-efeonce-insights-report-per-contracted-service.md).
- [Marco SKY](../../services/sky-blog-seo/README.md) y [método de valor](../../services/sky-blog-seo/INDICADOR_VALOR_ORGANICO_V1.md).
- [Backfill histórico GSC](../../manual-de-uso/growth/backfill-historico-gsc.md).
- [Verificación GSC del 15-10](../growth/2026-10-15-sky-search-console-connection-verification.md).
