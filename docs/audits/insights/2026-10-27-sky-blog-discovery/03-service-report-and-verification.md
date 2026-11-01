# Discovery 03 · Informe Blog SKY, ciclo de vida, servicio y verificación

Fecha de investigación: 2026-10-27. Naturaleza: discovery; las formas de DTO, errores, columnas y cortes siguientes
son propuestas para decidir antes de implementar. No se han cambiado código, configuración, datos, ediciones ni flags.

**Requisito corregido por el operador, 27-10:** GA4 + GSC + corridas AEO del motor propio son obligatorios desde
el primer informe. Las recomendaciones iniciales de SEO-only y omisión de GA4/AEO quedan sustituidas en este anexo.

**Contexto posterior:** el operador requiere además dos cuentas operativas bajo la organización SKY. El
[anexo 06](06-operating-accounts-under-one-organization.md) propone dos Spaces y describe los gaps de sync,
sesión y acceso. El mínimo organizacional estudiado aquí permite una preview de medición, pero no certifica
aislamiento entre stakeholders. El requisito del informe se asigna a la cuenta/Servicio SEO, no a todos los reportes de SKY.

## 1. Conclusión y alcance de la primera entrega

El primer informe verificable de Blog SKY puede implementarse **sin esperar toda TASK-1960**, pero debe integrar
GA4, GSC y una corrida del motor AEO propio. Solicita módulos `seo` y `aeo` y exige cada fuente por separado.
Las páginas medidas pertenecen a `blog.skyairline.com`; la corrida y su panel declaran su población y proyectan
citas del blog por el reader dueño. No lleva ICO del espacio compartido ni presenta un score general de marca como
score del blog. El binding fija alcance y fuentes; la evolución al Servicio canónico permanece separada.

Tres garantías son diferentes y deben probarse por separado:

1. **Población:** ninguna medición SEO de la edición usa URL fuera del alcance.
2. **Producto:** una edición presentada como informe del blog contiene efectivamente la evidencia requerida del blog,
   o falla con causa. Omitir silenciosamente SEO y entregar otro módulo no satisface esta garantía.
3. **Servicio:** producción editorial, destinatarios y recurrencia pertenecen al servicio Blog SEO/AEO, separados de Diseño.
   La primera entrega GA4/GSC/AEO necesita las dos primeras; la tercera requiere trabajo por servicio si se incorpora ICO.

No se debe inferir ninguna de estas garantías del título, de los chips de portada, del nombre del target o de una casilla del catálogo.

## 2. Baseline observado y límites de esta investigación

Se inspeccionaron los contratos, commands, stores, schedules, adapters, planner y mappers del checkout actual.
La configuración actual de la cuenta procede del readback del padre del 27-10:
`.captures/insights-sky-scope-2026-10-27/readback.json`. No se realizaron nuevas consultas DB en este subdiscovery.

| Hecho observado | Evidencia y consecuencia |
| --- | --- |
| `request.scope` es presentación | `contracts/request.ts:71–76`, `presentation/scope-catalog.ts:1–9,58–67`: resuelve etiquetas/glifos de portada. No filtra páginas ni tareas. |
| El request no tiene `serviceId` ni binding de medición | `contracts/request.ts:60–85`; el validador construye un objeto nuevo allowlisted, `commands/validate-request.ts:133–151`. |
| Los reportes sólo tienen identidad organizacional | `stores/report-store.ts:22–43,54–60`: columnas de organización, propósito y título; no Servicio ni requisito de alcance. |
| El adapter SEO lee latest al recolectar | `adapters/seo-adapter.ts:557–561`: se lee una vez por llamada y se reutiliza actual/comparación. No se fija en create. |
| La edición puede crearse sin generar | `commands/create-edition.ts:35–36,139`: `deferGeneration` permite separación temporal. |
| El orquestador degrada toda excepción de adapter | `adapters/collect-evidence.ts:40–50`: registra `no_data`, incluidos errores de lectura de alcance. |
| `allowPartial` permite módulos vacíos | `commands/generation.ts:137–147`: bloquea sólo si faltan facts y no hay omisiones explícitamente permitidas. |
| ICO no usa `projectIds` | `adapters/ico-adapter.ts:217–239`: obtiene todos los spaces activos de la organización y llama `readSpaceMetrics`. |
| AEO contiene dos poblaciones | `adapters/aeo-adapter.ts:201,210–223`: presencia de marca desde Grader y visitas GA4 de asistentes; estas últimas no reciben alcance. |
| Catálogo no acredita capacidad de medir el blog | `catalog.ts:83–105`: comprueba asignación de módulos/espacios, no conexión, cobertura ni host. |
| La autoridad sigue siendo organizacional/capability/audience | `authz.ts:120–154`: el alcance de medición no concede acceso ni sustituye entitlements. |
| SKY no tiene schedules en el corte | Recibo del 27-10: lista vacía. Activar uno no es necesario para aislar URLs. |
| Las seis ediciones SKY observadas son sólo ICO | Recibo del 27-10: no se identificó edición SEO existente que haya que reescribir. Los snapshots anteriores permanecen inmutables. |

### Una limitación de nomenclatura con efecto real en emisión

`presentation/client-fit-gate.ts:50–82` considera un token con punto como identificador interno. Su excepción de dominios
públicos sólo se construye con etiquetas de hechos `cited_source.*` (`:66–73`). En consecuencia, añadir literalmente
`blog.skyairline.com` a `scopeLines`, metodología, título o apertura puede impedir emitir un informe de cliente.
El padre reprodujo el caso, junto con la pérdida de campos desconocidos de request, en
`.captures/insights-sky-scope-2026-10-27/discovery-probes.json`.

La solución no es relajar la expresión regular global: el host debe ser un valor público validado, tomado del binding
sellado y permitido únicamente como token de dominio exacto. `blog.skyairline.com.ejemplo.net` o
`notblog.skyairline.com` no pueden quedar legitimados porque contienen el host permitido. La implementación debe
comprobar límites de token o tratar el host como campo semántico; `text.split(domain)` sin límites no basta.

## 3. Dos niveles de diseño y su coste

| Alternativa | Garantía | Coste/limitación | Veredicto propuesto |
| --- | --- | --- | --- |
| Cambiar título/chips o pasar un campo no declarado en v1 | Ninguna garantía de medición | `validateInsightRequest` descarta campos no reconocidos. | Rechazada. |
| Alcance v2 por organización + binding servidor por edición + gate de generación | Todas las mediciones SEO de SKY pasan por el mismo alcance; nueva edición fija la población | No identifica por sí mismo un servicio ni impide que alguien cree un reporte sólo ICO y lo titule Blog. Requiere rollout coordinado. | Núcleo mínimo recomendado para este encargo. |
| Request público versionado con selector/ref de alcance requerido | El caller expresa su intención; runtimes antiguos rechazan un contrato nuevo | Más contrato/paridad. Una ref exacta exige superficie para descubrir la versión; `get_seo_content_scope` sigue pendiente en TASK-2033. | Añadir sólo si se expone selección pública desde el primer corte. |
| Requisito de medición persistente por report | Las futuras ediciones de ese report no pueden omitir su requisito; posible guard DB frente a escritores viejos | Migración y policy de actualización del report. No garantiza que todos los reportes nuevos de la org estén protegidos. | Endurecimiento útil; no equivalente a TASK-1960 completa. |
| Informe anclado al Servicio, proyectos y entrega filtrados | Aislamiento comercial/operativo y futuras distribuciones | Depende del vínculo proyecto→Servicio y del cómputo ICO por población. | TASK-1960, como unidad dependiente. |

El alcance v2 del anexo 01 también funciona como barrera ante código viejo: almacenar un objeto discriminado en
`rules_json` provoca rechazo del parser que sólo conoce arrays. Una columna opcional de hosts con `rules=[]` permitiría
que un binario viejo interpretara «sitio completo»; se descarta esa transición.

El MVP no debe prometer que todo rollback de binarios es seguro. El rechazo legacy evita ensanchar SEO, pero un runtime
viejo puede degradar ese rechazo a módulo omitido y continuar con otros módulos si `allowPartial=true`.

## 4. Binding de medición e idempotencia: decisión recomendada

### 4.1 Identidad de la intención y de la población

Hoy `createInsightEdition` valida el request, calcula `requestHash` y busca la key antes de insertar
(`commands/create-edition.ts:58–75`). El hash canónico excluye `idempotencyKey` y claves undefined; conserva el orden de
arrays (`request-hash.ts:10–33`). Se debe conservar esta semántica para requests legacy.

Para el núcleo mínimo, **mantener `requestHash` como hash de la intención del caller**. Tras autorizar, normalizar y
resolver la idempotencia, obtener el alcance vigente desde SEO y fijar su identidad en un **campo servidor inmutable de
la edición**. Propuesta de nombre, todavía no canon: `measurementBinding`.

Contenido mínimo del binding: contrato del binding, organización autorizada, módulo al que aplica, referencia al alcance
SEO por versión y digest semántico, requisito de aplicación y versión del contrato de población. Opcionalmente, Servicio
cuando exista. El digest se calcula por el dueño SEO, no importando el helper de hash de Insights hacia Growth.

Se recomienda persistirlo como metadata tipada de la edición (columna JSON explícita o registro de binding 1:1), no
inyectarlo silenciosamente en el request público. No necesita un segundo «edition request hash»: el binding contiene su
digest; snapshotHash sella los hechos y el alcance; issuedHash ya incluye requestHash, snapshotHash, planHash y outputs
(`commands/lifecycle.ts:75`). Si se elige otra identidad, debe nombrarse y documentarse sin confundir intención con resultado.

**Orden obligatorio para una solicitud con key:**

1. Autorizar organización, capability y audiencia; normalizar request.
2. Calcular el mismo hash de intención que se compara contra una edición existente.
3. Si existe la key: hash igual → devolver esa edición y su binding ya fijado; distinto → 409. No consultar latest para
   reconstruir el hash ni rebindear una edición existente.
4. Sólo para creación nueva: resolver el alcance desde SEO y validarlo. Insertar edición y binding de manera atómica.
5. Una carrera de dos creadores con la misma key debe converger al ganador y comparar su hash; el perdedor no puede
   dejar otra edición/binding. Ejercitar esta carrera contra el store real de forma aislada antes del cierre.

Resultado esperado: crear con key K y alcance A; cambiar configuración a B; repetir K y mismo payload devuelve edición A.
Una **key nueva** resuelve B. Recolectar o recuperar la edición A sigue leyendo A por versión, aunque B sea latest.
Resolver latest antes del hash produciría un 409 falso para un retry sin cambio de intención.

### 4.2 Alternativa pública con referencia exacta

Si el caller necesita seleccionar A de manera explícita, añadir un selector discriminado al contrato público y actualizar
App API, Ecosystem, MCP y generador de schedules. El selector forma parte del hash de intención: cambiar A por B con la
misma key debe producir 409. Una key nueva con selector A sigue usando A por diseño; «nueva key adquiere latest B» sólo
aplica al modo latest, no al modo exacto.

El caller nunca entrega reglas libres para ampliar la población; entrega una referencia, que el servidor resuelve en la
organización autorizada. El reader pendiente `readSeoContentScopeVersion(org, version)` comprueba existencia y digest.
El conocimiento de una versión de otra organización no acredita acceso a ella.

### 4.3 ¿Es obligatorio `requestVersion` v2?

No para metadata exclusivamente servidor. Sí es la opción segura si se introduce un selector público cuya semántica no
puede ignorarse: `commands/validate-request.ts:68–69` rechaza una versión distinta de `insight_request_v1`, mientras
`:133–151` reconstruye el request y descarta un campo extra de v1. Un campo opcional añadido sólo al cliente no funciona.

La migración fundacional declara `request_json jsonb NOT NULL` (`20260915100154428...sql:194`); no tiene CHECK del
`requestVersion`. `stores/edition-store.ts:22,48–57` tipa/castea el JSON sin parsearlo. Por tanto, admitir request v2 requiere
un parser/validador discriminado en los lectores ejecutores, no sólo en create. No se propone añadir enums DB sin una
decisión de contrato ni cambiar el string de todos los requests legacy.

## 5. Puntos del ciclo de vida que deben quedar cerrados

| Entrada | Comportamiento actual | Cambio requerido para edición con binding |
| --- | --- | --- |
| Create sin defer | Recolecta inmediatamente tras persistir | Congelar binding antes de cualquier lectura de datos. |
| Create con defer | Edición persistida; collecting futuro lee latest | Capturar el binding al crear, no al ejecutar el job. Si falta el alcance requerido, rechazar antes de crear o dejar fallo explícito sin datos amplios. |
| Idempotent replay | Devuelve edición previa, sin generar | Devolver binding previo incluso si la configuración cambió. |
| Revise | Nueva edición del mismo report, con request del caller (`create-edition.ts:149–155`) | Por defecto propuesta: nuevo encargo resuelve current; comparar con la anterior debe advertir cambio de población. Para reproducir A, usar selector exacto cuando exista. Nunca modificar A. |
| Recover collecting | Vuelve a ejecutar generación desde collecting (`lifecycle.ts:135–142`) | Resolver únicamente la ref congelada; error si no puede leerse. Nunca cambiar a latest. |
| Recover composing | Lee snapshot sellado y vuelve a componer (`generation.ts:98–125`) | Usar sólo el snapshot y su alcance; no volver a leer configuración ni crear binding nuevo. |
| Recover validating | Revalida snapshot/plan congelados | Comprobar coherencia del binding sin remedir ni mutar el snapshot. |
| Render/retry render | Usa plan/snapshot congelados | Ninguna lectura de latest. Verificar que plan, evidencia y binding correspondan a la misma edición. |
| Issue | Exige review state, hashes y outputs; client-fit | Añadir comprobación de cumplimiento del alcance requerido, no una nueva autorización comercial. |
| Share/delivery | Consume edición emitida | Mantener audiencia/grant/TTL y selección de edición; el cambio de config no cambia enlaces históricos. |

**Importante:** un scope ilegible actualmente evita producir cifras amplias, pero el orquestador lo convierte en
`no_data`. Para una obligación de medición, introducir una clase de error reconocible que escape de la degradación o un
gate previo al loop y una validación posterior obligatoria. Debe fallar la edición por contrato incumplido aunque
`allowPartial=true`, haya otros módulos con hechos o existan sólo referencias. La omisión de datos de un proveedor sí
puede seguir la política de parcialidad; no son el mismo fallo.

`editorial-v2.ts:569–570` toma la primera fuente SEO con `contentScope` y presupone que todas coinciden. Añadir validación
de identidad/digest/versión y de fuente sin scope antes de composing; `issue` comprueba de nuevo el resultado sellado.
Una etiqueta igual no demuestra que dos scopes tengan las mismas reglas.

## 6. Guard mínimo, requisito persistente y operación clear

Para este encargo, activar el alcance v2 de SKY y fijar binding para toda edición nueva del informe Blog. Su primer
informe integra `seo` y `aeo`, `allowPartial=false` y exige `gsc`, `ga4` y `aeo_run` por separado. Estos requisitos por
fuente son contrato propuesto, no los garantiza el código actual. El binding no es una preferencia que un caller
pueda desactivar; la policy se deriva en servidor del alcance/contrato aplicable.

**Decisión pendiente indispensable:** nombrar la fuente de esa obligación antes de crear el primer binding. Si el
servidor sólo deduce «requerido» de que encontró un scope activo, `latest=null` o una versión `clear` puede regresar al
comportamiento amplio. Una política organizacional persistente del dueño SEO, un requisito mínimo del report o una
expectativa validada de activación pueden resolverlo sin implementar todo TASK-1960. El protocolo debe especificar
cuál se elige, cómo subsiste el requisito cuando falla la lectura y quién puede cambiarlo deliberadamente. El guard
del binding resuelve retries posteriores; por sí solo no demuestra la obligación del primer create.

La garantía se pierde para futuras solicitudes si alguien fija después un alcance vacío equivalente a sitio completo.
La operación `clear` debe considerarse un cambio de población explícito: el command dueño debe rechazar una omisión
accidental del requisito, registrar motivo/actor y exigir que la transición sea deliberada según la autoridad vigente.
No borra ni reescribe bindings históricos. Un cambio válido de host genera una versión nueva; los informes anteriores
siguen nombrando su host original.

Si el objetivo adicional es impedir que **un report concreto** vuelva a crear una edición sin alcance, persistir un
requisito de medición en ese report. Un campo nullable deja intactos los reportes legacy; un trigger puede rechazar la
inserción de una edición sin binding/contrato válido para un parent protegido, evitando que un escritor viejo omita el
requisito. Esto no protege por sí solo otro report nuevo ni la creación actual de snapshots por un ejecutor viejo.
Debe compararse con el coste de esa migración antes de convertirlo en prerrequisito del primer informe.

## 7. Schedules: compatibilidad real y pin por ocurrencia

Hoy la plantilla reserva período, key y organización (`schedules/commands.ts:51–52`), y el builder fuerza
`requestVersion:'insight_request_v1'` (`:102–107`). No basta poner request v2 dentro del JSON: se sobrescribe.
La validación al crear es sintáctica sobre un período de prueba (`:134–140`), no verifica host/cobertura.

El tick revalida autoridad vigente, llama al mismo `createInsightEdition` y pide render si llega a revisión
(`schedules/tick.ts:103–119,140–157`). Su key por ocurrencia depende de schedule, versión y período
(`schedules/contracts.ts:67–69`). Cada tick nunca emite ni envía.

Con binding servidor recomendado, la primera creación de cada ocurrencia resuelve latest A y lo fija; un reintento
de esa ocurrencia devuelve A aunque la config sea B. La ocurrencia siguiente, de otro período, resuelve B. Es el mismo
contrato de idempotencia del command manual; no se introduce una selección de scope propia en el worker.

Si se ofrece selector exacto en la plantilla, la política será distinta: todas las ocurrencias usan la ref declarada hasta
cambiar la definición. El cambio debe incrementar la versión de schedule o crear otro, según el command que se decida.
Actualmente los commands expuestos son crear/activar/pausar/retirar; no se debe inventar un editor de plantilla ya existente.

La futura recurrencia debe enlazar al report que se quiere continuar: hoy el tick llama create sin `reportId`
(`tick.ts:143–149`), por lo que cada ocurrencia puede crear un report nuevo. «Mensual por organización» no es aún
«sucesivas ediciones del mismo informe por servicio». Este pendiente es pertinente al nivel TASK-1960, no a un preview.

## 8. Servicio e ICO: dependencia real, no bloqueo artificial

TASK-1960 documenta dos servicios canónicos, Diseño y Blog SEO/AEO, y la falta de vínculo proyecto→Servicio en su lectura
del 02-10. Esa foto no se revalidó aquí como estado DB actual. El código de Insights actual confirma que no consume
`serviceId` ni dicho vínculo. El plan no debe enlazar por nombre del proyecto ni por coincidencia de espacio.

El corte por servicio recomendado debe:

1. Resolver Servicio con pertenencia a organización desde un reader dueño, e impedir serviceId ajeno con respuesta
   anti-oracle; una entrada del cliente sólo restringe, nunca amplía autoridad.
2. Resolver la población de proyectos/targets en una frontera única y pasarla tipada a adapters. El dominio Insights no
   importa `client-portal`, hoja del DAG, ni consulta directamente nuevas tablas ajenas para hacer ese resolver.
3. Sellar servicio y población utilizados, con versión/fecha efectiva cuando exista historial. No permitir que una
   reasignación posterior cambie la lectura de una edición ya sellada.
4. Reutilizar el mismo vínculo para TASK-1853/1854 y el portal; evitar otra tabla ad hoc exclusivamente para Insights.
5. Hacer que ICO calcule sobre la población correcta a través del engine dueño. Existe `readProjectMetrics`
   (`ico-engine/read-metrics.ts:699–731`), que devuelve snapshots de todos los proyectos de un espacio; no es por sí
   mismo un reader de Servicio ni una fórmula válida de agregación entre proyectos.
6. No promediar RpA/OTD/FTR de proyectos. Las métricas necesitan elegibilidad, numeradores/denominadores y la misma
   semántica de cohortes/fechas del engine; si no hay un agregado válido, mostrar resultados por proyecto o declarar ausencia.
7. Separar reportes, destinatarios y recurrencias después de verificar el servicio efectivo. Compartir o enviar requiere
   la autoridad ya definida para esos commands; este discovery no realiza ninguna de esas acciones.

Los módulos permitidos de un servicio son un techo genérico. En este encargo hay, además, un requisito explícito de
GA4/GSC/motor AEO desde la primera entrega. El nombre SEO/AEO no transforma métricas globales en resultados del blog:
la evidencia de corrida debe declarar su panel y proyección URL.

## 9. AEO: separar objeto de medición de canal de tráfico

| Evidencia | ¿Pertenece al informe estricto Blog? | Tratamiento propuesto |
| --- | --- | --- |
| Clics/impresiones Google sobre URL del blog | Sí | SEO con alcance aplicado. |
| Visitas GA4 de asistentes que usan URL del blog | Sí, si se valida población y fuente | Reutilizar el reader GA4 filtrado y sellar el mismo binding. |
| Corrida del motor AEO propio | Obligatoria | Fijar runId elegible, perfil, panel, mercado, método y corte; proyección por dueño. |
| Presencia, tono o menciones de SKY en ChatGPT/Gemini/otros | Sólo si el panel y la semántica justifican su uso | Declarar población del panel; no llamar al score global «score del blog». |
| Citas a URL concretas del blog en respuestas IA | Evidencia central del motor para el blog | Proyección por URL, cobertura y denominador del panel; reutilizar corridas existentes cuando lo permitan. |

El adapter AEO mezcla presencia del motor y tráfico de asistentes. El segundo no sustituye al primero.
Solicitar módulos `seo` y `aeo` tampoco demuestra las tres fuentes: los hechos GA4 pueden poblar ambos aunque
falte GSC o una corrida. El gate debe comprobar receipts `gsc`/`ga4`/`aeo_run`; `allowPartial` no permite omitirlos.
El [anexo 05](05-aeo-engine-required.md) detalla selección y proyección por URL, sin recalcular en Insights.

## 10. A4, deck, web y validación de copy

| Superficie | Camino observado | Trabajo proporcional |
| --- | --- | --- |
| A4 claro | `render/cover.ts:82–91` toma `plan.scopeLines`; `report-mapper.ts:411–419` ofrece ambos temas | Mostrar el host desde el plan sellado y comprobar cabida con el contenido real. |
| A4 navy | `cover.ts:94–97` no asigna scopeLines | El alcance debe estar en apertura/metodología aunque la portada conserve su diseño. |
| Deck | `insights-deck-mapper.ts:183–192` usa `light:null`; `:260–261` lleva chapterLead | La apertura del capítulo debe decir qué host se mide. No forzar otro diseño de portada para resolver un filtro. |
| Web | `sharing/web-model.ts:278–297` proyecta límites, metodología y scopeLines | Usar sólo lo sellado; si se añade un campo público estructurado, versionarlo aditivamente y comprobar Think. |
| Coherencia | `editorial-v2.ts:574–585` produce apertura y scopeLines desde el scope | Derivar texto determinista, sin pedir al LLM que elija o resuma hosts. |
| Gate cliente | `presentation/client-fit-gate.ts:50–82` | Admitir sólo hosts públicos validados del binding, con límites de token. |

El host exacto es el dato que permite entender la población: una etiqueta «Blog» sola no basta para distinguirlo de la
web general. El plan puede conservar un campo semántico de hosts que los renderers presenten; no se necesita exponer
IDs internos, hashes, tablas ni referencias de almacenamiento al cliente.

Si las reglas actuales generan `site_total.*`, recordar que la propiedad GSC conectada ya es del blog. Llamarlo «todo
el sitio SKY» sería engañoso; para host-only y propiedad idéntica el contexto es redundante y conviene omitirlo. Para
el informe estricto, tampoco se deben introducir referencias del dominio general sin una decisión explícita de contexto.

## 11. Piso de versión, rollout y rollback

Desplegar el contrato de datos antes de activar su configuración; todos los generadores deben entender el binding y la
semántica host-only. Los consumidores no se reducen a Vercel: el `ops-worker` genera por schedules y el artifact-worker
renderiza planes congelados. Think consume el modelo web; no recalcula alcance ni métricas.

Secuencia propuesta:

1. Migraciones aditivas de scope/binding con guards proporcionales; legacy sin cambios y tablas compartidas intactas.
2. Lectores capaces de parsear v1/v2, guardar/leer binding y validar en create, generation, recover e issue.
3. Pruebas locales de coexistencia y canary sintético de runtime; actualización coordinada Vercel y ops-worker.
4. Configurar el host SKY mediante command dueño con preview; no usar SQL para fijar un alcance.
5. Preview interno con las ventanas que tengan cobertura y módulos permitidos; revisión de evidencia y outputs.
6. Edición real sólo en el flujo autorizado de generación/revisión; emisión y distribución conservan sus decisiones.
7. Recurrencia después de la primera aceptación, con el report correcto si se implementó continuidad por servicio.

Rollback de contenido: volver a una versión válida mediante un command explícito, sin tocar snapshots. Rollback de
binarios: mantener un **piso de versión** para generación/recover de ediciones con binding nuevo; no afirmar que el
parser viejo basta para recuperar/emitir. `recoverInsightEdition` no revalida request (`lifecycle.ts:135–142`) y
`runCollecting` ejecuta un record ya persistido (`generation.ts:68–79`). Un binario viejo puede ignorar metadata nueva.
Si la reversión cae por debajo del piso, detener nuevas generaciones de ese contrato y conservar lectura de ediciones
históricas; no borrar el scope ni hacer clear para que el binario viejo vuelva a funcionar.

## 12. Matriz de pruebas que cierra este frente

| Caso | Resultado verificable | Dueño sugerido |
| --- | --- | --- |
| Request v1 con campo extra | Se documenta/contrasta que hoy se descarta; después se rechaza o se interpreta según versión declarada | `commands/validate-request` tests |
| Legacy Berel sin binding nuevo | Mismo requestHash y mismos facts/plan antes del cambio | Contracts, command/adapters fixtures |
| Key K con A, config cambia a B, retry K | Misma editionId y binding A; no nueva recolección | `commands/commands.test.ts` + store integración aislada |
| Key nueva, selector current, config B | Binding B fijado al crear | Commands |
| Misma key, otro selector/ref explícito | 409 | Commands |
| Dos create simultáneos misma key | Una edición y un binding; perdedor devuelve ganador o conflicto de intención | Store PostgreSQL aislado |
| Create defer A y ejecución tras configurar B | Actual y comparación leen A | Generation/adapters |
| Recover collecting tras A→B | Lee A por versión; no latest | Lifecycle/generation |
| Recover composing/validating | Usa sólo snapshot A; ninguna lectura SEO de config | Lifecycle/generation |
| Scope A ilegible y allowPartial=true + ICO con facts | Fallo obligatorio de la edición requerida; no informe Blog sólo ICO | Registry/commands |
| Fuente SEO sin binding o con digest B entre fuentes A | Gate de coherencia rechaza antes de composición y emisión | Evidence/plan-validation/lifecycle |
| Configuración clear durante recover | Binding A sigue aplicándose; no downgrade silencioso | Store/commands/generation |
| Header «Blog» con request.scope content | Ninguna prueba lo acepta como medición por sí solo | Scope-catalog vs measurement tests |
| `projectIds` para ICO | No declarar aislamiento actual; futura prueba verifica exclusión de proyectos Diseño | ICO adapter/engine |
| Host público exacto sellado en texto | client-fit pasa; hosts parecidos/prefijados/sufijados no se enmascaran | `client-fit-gate.test.ts` |
| Portadas light/navy, deck y web | Alcance legible en apertura/metodología en las tres salidas, sin depender del tema | Mapper/cover/web-model + render QA |
| Mismo snapshot A tras configurar B y re-render | Mismo alcance y cifras; no leer latest | Render commands/consumer |
| Schedule repetido con cambio A→B | Misma ocurrencia retiene A; período nuevo adopta B en modo current | `schedules.test.ts` + store aislado |
| Plantilla selector público v2 | Builder no sobrescribe v2 por v1 | Schedules commands |
| Servicio ajeno o proyecto fuera del Servicio | No amplía población; anti-oracle/contrato explícito | Resolver de Servicio, cuando se implemente |
| Runtime legacy lee scope envelope v2 | Rechazo sin hechos SEO amplios; no declarar emisión válida por omisión | Compatibilidad de despliegue |

La revisión renderizada debe recorrer portada, apertura SEO, gráficos/tablas, límites, metodología y descargas.
Los gates de composición y client-fit siguen siendo necesarios; la coincidencia visual sola no acredita población.
No ejecutar tests live existentes sobre la instancia compartida sin revisar antes si escriben y cuál es su sujeto.
La QA de los tres formatos previa a emisión comprende PDF/deck y proyección/renderer web interno o local. El enlace
público de Think requiere una edición `client` emitida (`sharing/commands.ts:110–111`); una edición interna no prueba
ese camino. Un canary público sintético o la distribución real pertenecen a su fase autorizada posterior.

## 13. Dependencias y archivos de implementación esperados

| Unidad | Archivos/fronteras | Dependencia |
| --- | --- | --- |
| Binding mínimo y semántica de error requerido | `contracts/evidence.ts`, `stores/{records,edition-store}.ts`, `commands/{create-edition,generation,lifecycle}.ts`, `adapters/{contract,collect-evidence,seo-adapter}.ts` | Contrato/reader by-version del anexo 01. |
| Coherencia y presentación sellada | `editorial/{editorial-v2,plan-validation}.ts`, `copy/insights.ts`, `presentation/client-fit-gate.ts`, `render/{cover,report-mapper,insights-deck-mapper}.ts`, `sharing/web-model.ts` | Binding y host aplicados. |
| Contrato público, sólo si se decide | `contracts/request.ts`, `commands/validate-request.ts`, schemas App/Ecosystem/MCP y skill de operación | Decisión exact-ref vs current; no exponer ref sin reader/descubrimiento. |
| Schedules | `schedules/{commands,tick,contracts,store}.ts` | Binding manual estable; continuidad por report si se ofrece. |
| Informe por Servicio | `report-store`, reader dueño de Servicio/proyecto, engine ICO, proyecciones compartidas | TASK-1960 y población real. No bloquea GA4/GSC/AEO sin ICO. |
| Nuevos facts SEO | TASK-1992, TASK-1672/1673 | Cada fuente futura declara si respeta scope; no reintroducir facts de dominio general. |

No se crean nuevos repositorios, runtimes ni capas shared para este cambio. Growth conserva la autoridad del alcance;
Insights consume un contrato serializable y conserva edición/evidencia/plan; ICO conserva fórmulas. Esa frontera permite
los cortes de dominio ya decididos sin introducir consultas cruzadas adicionales.

## 14. Decisiones pendientes y lo que no está probado

- Confirmar forma de binding inmutable servidor y su migración; distinguirlo del requestHash de intención.
- Elegir si el primer corte expone selector público. Recomendación: no exigirlo si el scope de SKY es único por org.
- Resolver si se requiere desde ya protección persistente por report o basta el MVP organizacional con contrato/gate.
- Definir comportamiento de `clear` para una obligación requerida y una política observable de cambio de población.
- GA4, GSC y corrida propia son obligatorios. Definir selección/proyección canónica AEO y gate por fuente;
  las visitas desde asistentes de GA4 son otra métrica y no sustituyen la corrida.
- TASK-1960 conserva su unidad para ICO/destinatarios/recurrencias por servicio; su baseline DB del 02-10 debe refrescarse
  cuando se vaya a implementarla.
- Cobertura GA4/GSC e histórico, definición exacta de sesiones por host/entrada y coste de queries: anexo 02.
- Estado desplegado: este subdiscovery no hizo canary ni lectura de runtime. Las matrices del 12-10 son históricas y no
  acreditan el estado actual. El readback del padre acredita configuración y datos, no ejecución de generación.
- No se creó ni emitió una edición real. No hay aceptación visual ni de cliente ni prueba de entrega en este encargo.

## 15. Evidencia fuente principal

Además de los paths/lineas citados: skill `efeonce-insights` y ledger §TASK-2033; arquitectura Insights §5/§7/§10;
TASK-2033 y TASK-1960; TASK-1992; marco `docs/services/sky-blog-seo/README.md`; catálogo, client-fit y tests del dominio.
Todas las propuestas de este anexo requieren contraste con la implementación final y decisión proporcional del dueño.
