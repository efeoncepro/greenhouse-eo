# Conectores, seguridad y operación

Lee esta referencia al incorporar Google Sheets o BigQuery, copiar/reemplazar fuentes, diagnosticar errores,
configurar seguridad por audiencia, evaluar extracts/refresh o decidir si una API evita operar el canvas.

## Intake por conector

### Google Sheets

Antes de conectar registra spreadsheet, worksheet, rango, owner, audiencia y frecuencia de cambio.

- Usa una fila única de headers, nombres únicos y columnas con tipos homogéneos.
- Elimina filas de resumen, celdas combinadas y bloques decorativos del rango analítico.
- Confirma que fechas y números sean tipos reales, no strings formateados.
- No asumas que columnas ocultas están fuera del dataset.
- Decide si el rango debe crecer automáticamente; valida nuevas filas y columnas con un caso controlado.
- Un cambio de datos no equivale a un cambio de schema: nuevos campos requieren refresh de fields.

Fuente: [Google Sheets connector](https://docs.cloud.google.com/data-studio/connect-to-google-sheets).

### BigQuery

Registra proyecto de facturación, proyecto/dataset/región de datos, tabla, view o custom query, grain, partición,
permisos efectivos, volumen y costo esperado.

- Prefiere tabla o view gobernada cuando la lógica es reutilizable; custom SQL exige revisión de parámetros y costo.
- Filtra por partición y limita columnas/rango antes de agregar componentes.
- Verifica que el actor y las credenciales del data source puedan ejecutar jobs y leer los objetos requeridos.
- Para custom SQL, aplica allowlists a parámetros y nunca expongas proyecto, dataset o tabla sensible como input libre.
- Revisa bytes estimados o evidencia equivalente antes de consultas amplias y evita refresh repetido.
- Trata schema drift, cambio de región, cuotas, billing y permisos como fallas distintas.

Fuente: [BigQuery connector](https://docs.cloud.google.com/data-studio/connect-to-google-bigquery).

## Ciclo de vida de una fuente

Elige la acción mínima:

| Síntoma o cambio                                 | Acción                               | Riesgo principal                               |
| ------------------------------------------------ | ------------------------------------ | ---------------------------------------------- |
| Cambiaron filas o valores, no el schema          | refresh del reporte/datos            | cuota, costo y caché                           |
| Se agregaron, removieron o renombraron columnas  | refresh data source fields           | calculated fields y charts dependientes        |
| Cambió tabla, worksheet, rango, query o conexión | reconnect                            | schema incompatible, credenciales y consumers  |
| Debe sustituirse una fuente completa             | replace/re-add con mapping explícito | charts rotos, campos \`Unknown\`, agregaciones |

Antes de refresh fields o reconnect exporta/inventaría fields, calculated fields y consumers. Si se elimina un campo,
los cálculos dependientes pueden quedar deshabilitados y los charts pueden romperse. Reconnect puede cambiar quién
autoriza la conexión; no lo ejecutes como solución genérica a un error de render.

Fuentes: [Refresh data source fields](https://docs.cloud.google.com/data-studio/refresh-data-source-fields) y
[Edit the data source connection](https://docs.cloud.google.com/data-studio/edit-the-data-source-connection).

## Copias, reemplazo y rollback

Una copia de reporte no es un backup completo:

- no conserva el historial del original;
- puede incluir las embedded data sources, pero una reusable data source sigue siendo un asset separado;
- si una embedded source usa Owner's Credentials y quien copia no es el credential owner, esa fuente no se copia y
  sus charts quedan con error; si sí se copia, verifica qué credenciales continúan activas aunque la copia sea privada;
- reemplazar una fuente exige schema compatible; campos sin correspondencia pueden quedar \`Unknown\` y romper charts;
- el historial del reporte puede restaurar embedded sources, no una reusable source, que tiene historial propio;
- cambios de data credentials no se restauran con version history;
- settings externos o específicos, como un Measurement ID, requieren verificación independiente.

Antes de copiar define source mapping, actor, credenciales, privacidad y criterio de rollback. Después prueba cada
página, campo calculado, filtro, parámetro, blend y chart; no declares éxito porque el canvas se ve parecido.

Fuentes: [Copy a report](https://docs.cloud.google.com/data-studio/copy-a-report),
[Copy a data source](https://docs.cloud.google.com/data-studio/copy-a-data-source) y
[Version history](https://docs.cloud.google.com/data-studio/see-whats-changed-in-reports-and-data-sources).

## Report publishing

Por defecto, viewers ven los cambios a medida que se guardan. Si report publishing está activo, editors trabajan en
un draft y viewers continúan viendo la versión published hasta un Publish explícito.

- Antes de editar registra `publishing enabled|disabled` y versión `draft|published` del baseline.
- Editors pueden alternar draft/published en view mode; viewers solo ven published.
- Publish de una versión anterior cambia lo que ven los viewers sin cambiar el draft actual.
- Restore convierte una versión anterior en el nuevo draft sin cambiar published.
- Cambios de nombre, fórmula y visibilidad de fields en embedded sources esperan Publish; cambios equivalentes en
  reusable sources aparecen también en published.
- Revocar credenciales, remover una source o moverla a Trash puede romper published sin esperar Publish.
- Una copia hecha por editor conserva draft y published y mantiene publishing activo; una copia hecha por viewer solo
  contiene published y usa publicación automática.

En `apply`, verifica primero el draft. No publiques ni actives/desactives publishing sin autorización específica. Tras
un Publish autorizado, vuelve a verificar published con el actor viewer esperado.

Fuente: [Report publishing](https://docs.cloud.google.com/data-studio/report-publishing).

## Seguridad por audiencia

Sharing, data credentials y seguridad por fila son capas separadas.

### Filter by viewer email

Úsalo solo cuando el modelo tenga una columna de email o identidad autorizada y el negocio acepte el flujo de
consentimiento.

- El viewer debe iniciar sesión y consentir que el reporte use su email.
- El matching del email es case-sensitive: normaliza el modelo antes de publicar.
- En BigQuery custom SQL puede usarse \`@DS_USER_EMAIL\` según el contrato oficial.
- Un link público sigue requiriendo sign-in cuando este filtro está activo.
- Prueba actor autorizado, actor sin filas, rechazo de consentimiento y ausencia de sesión.
- En scheduled delivery verifica por separado si el envío se filtra por el email de cada destinatario.

Nunca uses parámetros, controles, filtros visibles, URL params, páginas ocultas o un iframe como sustituto de
autorización. Un data control permite al viewer cambiar una cuenta o dataset compatible; tampoco es una frontera de
seguridad.

Fuente: [Filter by email address](https://docs.cloud.google.com/data-studio/filter-by-email-address).

### Credenciales y contenido oculto

- Service Account Credentials solo aplican a BigQuery, en organizaciones Google Workspace o Cloud Identity, y
  requieren configuración administrativa.
- Owner's Credentials pueden mostrar datos a viewers sin acceso directo a la fuente.
- Viewer's Credentials trasladan el control de acceso a cada viewer y fuente.
- Ocultar una página o componente es navegación/presentación, no control de acceso.
- Un personal report link de Pro puede copiar páginas ocultas; revisa el contenido antes de habilitarlo.

Fuentes: [Data credentials](https://docs.cloud.google.com/data-studio/data-credentials-article) y
[Personal report links](https://docs.cloud.google.com/data-studio/get-a-personal-report-link).

## Freshness, refresh y extracts

No mezcles estos mecanismos:

- Data freshness controla cuándo Data Studio puede volver a consultar la fuente.
- Viewer data refresh permite refresh manual según Report settings; el refresh manual tiene cooldown de un minuto y
  puede ejecutar consultas facturables.
- Un viewer no puede hacer refresh manual dentro de un embed.
- Auto-refresh es una capacidad Pro que recarga periódicamente el reporte abierto; no invalida por sí sola freshness
  ni caché.
- Extracted Data es un snapshot: máximo 100 MB y 750.000 filas; el exceso de filas se trunca. Configura auto update si
  la actualidad lo exige y valida que extraer datos ya agregados no altere su semántica.

Prueba estado recién actualizado, stale permitido, refresh bloqueado/cooldown, embed y fallo de actualización.

Fuentes: [Manage data freshness](https://docs.cloud.google.com/data-studio/manage-data-freshness),
[Manage auto-refresh](https://docs.cloud.google.com/data-studio/manage-auto-refresh-for-a-report) y
[Extract data](https://docs.cloud.google.com/data-studio/extract-data-for-faster-performance).

## Delivery, alertas y exports

Estas acciones transmiten o materializan datos fuera de la vista interactiva y requieren autorización específica.

- Scheduled delivery envía PDF y, según destino, edición y ownership, puede incluir preview inline o link; usa una
  configuración de filtros propia y un cambio posterior de defaults no garantiza actualizar schedules existentes.
- El panel Filters del schedule no ofrece data controls ni buttons.
- La personalización por email de destinatario es Pro y no aplica a entregas por Google Chat o Slack.
- Borrar un schedule no es un rollback: no se puede restaurar.
- Las alertas evalúan los valores/defaults configurados, no el estado interactivo arbitrario de cada viewer.
- Verifica destinatarios, páginas, filtros, row-level security, attachment, frecuencia, edición Free/Pro y límites.
- Exportar underlying data depende del chart, conector y permisos; prueba el caso exacto y minimiza PII.

Fuentes: [Schedule report delivery](https://docs.cloud.google.com/data-studio/schedule-automatic-report-delivery) y
[Create alerts](https://docs.cloud.google.com/data-studio/create-alerts-on-a-chart).

## Automatización disponible

No existe una API general para leer o editar páginas, charts, filtros, dimensiones o el canvas.

- La Data Studio API busca assets y gestiona permisos. Está orientada a organizaciones Google Workspace o Cloud
  Identity y requiere que un administrador autorice la aplicación mediante domain-wide delegation.
- La Linking API crea/configura reportes desde templates mediante una URL. El usuario necesita al menos Viewer sobre
  el template y, según embedded/reusable y replace/update, acceso a las data sources y datos subyacentes. La API no
  concede esos accesos ni reemplaza la validación de credenciales, schema o sharing.
- Browser, Playwright, Webwright o Computer Use siguen siendo necesarios para configuración visual y verificación de
  view mode cuando no existe una operación semántica más segura.

No pidas ni configures admin grants, OAuth o domain-wide delegation sin autorización específica.

Fuentes: [Data Studio API](https://developers.google.com/data-studio/integrate/api) y
[Linking API](https://developers.google.com/data-studio/integrate/linking-api).

## Escalera de troubleshooting

Diagnostica en este orden y conserva el Error ID visible, sin capturar datos o tokens innecesarios:

1. actor, cuenta, edit/view, asset y permisos;
2. tipo de data credentials y autorización del conector;
3. conexión: archivo, worksheet/rango, proyecto/dataset/región, tabla/view/query;
4. schema: field IDs, tipos, agregaciones, campos removidos y calculated fields;
5. modelado: filtros, parámetros, blend, grain y cardinalidad;
6. cuota, billing, freshness, extract y backend;
7. componente/página, navegador, extensiones, consola y red saneadas.

Reproduce primero con una tabla mínima y un rango pequeño. No reconectes, reemplaces, cambies credenciales ni
refresques agresivamente hasta demostrar que esa capa causa el error. Si una acción puede afectar otros reportes,
inventaría consumers y solicita autorización.

Fuente: [Troubleshooting guide](https://docs.cloud.google.com/data-studio/troubleshooting-guide).
