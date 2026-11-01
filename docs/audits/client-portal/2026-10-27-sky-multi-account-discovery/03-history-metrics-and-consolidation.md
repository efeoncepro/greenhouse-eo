# SKY · Historia, métricas, capacidad y consolidación de dos cuentas

Fecha: 2026-10-27. Frente de discovery: `analytics_readers`. Estado: propuesta fundada en código y lecturas
agregadas; sin implementación ni decisiones Accepted. Alcance: dos cuentas operativas bajo **una Organization
SKY y un cliente comercial**, con historia conservada y reporting por cuenta/servicio y consolidado. Se mantienen
viables las alternativas del anexo 01: A' con bridges `client` operativos hijos y owner comercial único, o B con
clientId compartido y scope Space explícito; este frente no decide entre ellas.

Se aplicaron los invariantes Organization/Client Portal e ICO y la skill `greenhouse-finance-accounting-operator`
para el boundary de costos/atribución. No se calcularon impuestos, nóminas, fees, márgenes ni movimientos bancarios.
No se seleccionaron nombres de personas, identificadores de miembros, documentos ni referencias de cobro.

## 1. Dictamen

Crear un segundo Space no basta para separar la historia. Hoy proyectos, tareas, equipo, snapshots ICO y puentes
financieros de SKY comparten identidades operativas sin una clasificación completa de Servicio. Una división
apresurada por `client_id`, por nombre o por fecha podría copiar el pasado de Diseño al Blog, perder tareas o contar
la misma prestación dos veces. Hace falta **resolver el scope antes de leer/agregar**, clasificar historia con
evidencia y preservar la identidad original de cada hecho.

La solución debe producir simultáneamente:

- Cuenta Diseño: su operación histórica acreditada y sus nuevas prestaciones.
- Cuenta Blog SEO/AEO: su operación acreditada, con GA4 + GSC + corrida nativa AEO obligatorios desde el primer
  informe; los referrals de IA nunca sustituyen esa corrida.
- Consolidado SKY: unión única de hechos de la organización, incluidos residuales históricos no clasificados,
  separada de las cifras propias de cada cuenta. La existencia de un residual no autoriza inventar su reparto.

Una cuenta operativa no es un nuevo deudor ni un nuevo banco. Los cobros, facturas y costos originales conservan
sus IDs; las vistas por cuenta consumen atribución gobernada. El portal sigue siendo BFF de readers dueños.

## 2. Estado real comprobado

### 2.1 Evidencia compartida del discovery

`.captures/insights-sky-scope-2026-10-27/operating-accounts-readback.json`, 15:05Z, verificó:

| Objeto | Observación |
| --- | --- |
| Organization | `org-b9977f96-f7ef-4afb-bb26-7355d78c981f`. |
| Space actual | `spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9`, `EO-SPC-0011`, activo. |
| Cliente comercial compartido | `hubspot-company-30825221458`. |
| Servicio Diseño | `SVC-HS-551519372424`, activo, en ese Space. |
| Servicio Blog | `SVC-HS-591725750952`, activo, en el mismo Space. |
| Proyectos | 123 en ese Space/client; los 123 tienen `module_id=NULL`. |
| Catálogo adicional | Un servicio activo «Paid Social Care» y dos seeds `legacy_seed_archived`; no son pruebas de otra cuenta ni autorizan reclasificación automática. |

### 2.2 Nuevo readback agregado de este frente

Recibo: `.captures/sky-multi-account-discovery-2026-10-27/history-readback.json`, generado por SELECT con cliente
PostgreSQL canónico y perfil runtime. Fuente reproducible `history-readback.ts`; metadata de schema en
`history-schema.json`. No se extrajeron importes ni PII.

| Corte | Resultado | Interpretación válida |
| --- | --- | --- |
| Tareas PG de SKY | 7.867; todas `module_id=NULL`; 30 sin `project_record_id`; 808 `is_deleted=true` | Es un inventario bruto. No es throughput ni población ICO elegible. Los subconjuntos pueden solaparse. |
| Fechas de tareas | Primer registro creado en PG 17-03-2026; completadas 08-09-2025 a 26-10-2026; due dates 01-08-2025 a 28-10-2026 | La fecha de creación de la proyección no equivale al inicio real de una tarea o servicio. |
| Proyectos | 123 activos, cero eliminados, una DB de origen, `start_date/end_date` no pobladas | El flag activo no identifica a qué Servicio pertenecen. |
| Binding Notion | Una source, sync habilitado, último sync 27-10-2026 06:03Z | Hay un binding común; no demuestra que el futuro Blog use esa misma DB. |
| Staffing | Tres assignments activos, tres miembros distintos, FTE sumada 3,000; todos `service_id=NULL`; primer start 01-12-2024 | Capacidad comprometida a cliente, no tres FTE probadas de cada cuenta ni horas utilizadas. |
| Fechas Servicio Diseño | Runtime `start_date/target_end_date=NULL`; creado 06-05-2026 | El CRM no fija ahí su inicio de prestación. |
| Fechas Servicio Blog | Runtime start 24-09-2026; target end 31-10-2028; creado 25-09-2026 | Son fechas persistidas del objeto; no demuestran inicio efectivo de prestación ni aceptación contractual. |
| Facturas | 27, entre 20-08-2025 y 07-10-2026; cero con deal, contrato, cotización, PO o service_line poblados; ninguna anulada en el corte | Falta evidencia de atribución directa por Servicio en esas columnas. No prueba que los documentos carezcan de anexos externos. |
| Cobros | Diez filas; dos superseded, una con Space, tres marcadas reconciled | No son diez cobros efectivos sumables. Es metadata de estado, no comprobación bancaria de recepción. |
| Service facts resueltos | Tres revenue y seis labor_cost de Diseño; períodos 202605–202608 y 202607–202608, respectivamente | Ya existe atribución; debe conservarse y explicar su método antes de recalcularla. |
| Service facts unresolved | Nueve labor `no_resolved_revenue_share`; seis overhead con esa razón; cuatro revenue `ambiguous_service_candidates` | Ya hay residuales observables. No son ceros ni permisos para dividir en mitades. |

La ausencia de importes fue deliberada: el discovery necesita conocer grain, puentes y cobertura; no requiere
revelar remuneraciones, fees ni saldos. Una reconciliación monetaria futura se ejecuta en el carril Finance con sus
readers y autorizaciones y conserva sólo resúmenes adecuados para el usuario de cada superficie.

## 3. Contrato de scope de datos propuesto

### 3.1 Identidades distintas

| Dimensión | Qué responde | Lo que no reemplaza |
| --- | --- | --- |
| `organizationId` | Qué entidad cliente y relación longitudinal es SKY | No decide por sí sola cuál operación/Servicio se está viendo. |
| `commercialClientId` | Cliente comercial/financiero único dueño de la contraparte | No distingue por sí solo las dos cuentas operativas. |
| `operatingClientId` | Bridge legacy de una cuenta: child operativo en A', compartido en B | No crea otro deudor ni perfil financiero. Los IDs no son intercambiables con el owner comercial. |
| `spaceId` | Cuenta operativa/entorno de trabajo | No crea otro cliente fiscal ni evidencia de pertenencia de una tarea vieja. |
| `serviceId` | Prestación comercial contratada | No es un módulo/capability ni un nombre inferido. |
| `moduleId` | Clasificación de módulo de delivery | **No es `serviceId`**. |
| `projectSourceId/taskSourceId` | Identidad estable del trabajo en su sistema fuente | No debe recrearse para cada cuenta ni usarse como nombre heurístico. |
| `campaignId` | Iniciativa con sus proyectos vinculados | No equivale automáticamente al Servicio ni duplica tareas subyacentes. |

Precisión load-bearing: `projects.module_id` y `tasks.module_id` referencian
`greenhouse_core.service_modules(module_id)` (`scripts/setup-postgres-source-sync.sql:77,134`), no
`greenhouse_core.services(service_id)`. Los 123 NULL no se corrigen escribiendo `SVC-HS-…` en esa columna.
TASK-1960 ya admite decidir un binding proyecto↔Servicio con vigencia; hay que hacerlo explícito.

### 3.2 Contexto que los readers deberían recibir

Conceptual, no DTO implementado:

```ts
type OperatingReadScope = {
  organizationId: string
  commercialClientId: string
  operatingClientIds: readonly string[]
  mode: 'account' | 'consolidated'
  spaceIds: readonly string[]
  serviceIds: readonly string[]
  bindingVersion: string
  effectiveWindow: { start: string; endExclusive: string; timeZone: string }
  historyView: 'as_recorded' | 'classified_restated'
}
```

Los IDs se resuelven desde pertenencia y autoridad de servidor; no basta un query param del cliente. El selector
operativo se aplica upstream en Delivery, ICO, Team Capacity y atribución Finance; el portal no filtra resultados
de una organización completa ya descargada. `account` no acepta un scope vacío con fallback al consolidado.

En A', un command específico puede crear un child operativo de `clients` con relación explícita a su único
commercialOwner, sin otro perfil financiero. En B, varias cuentas comparten el mismo bridge. En ambos casos los
readers financieros resuelven el owner comercial canónico, no suman indistintamente cada ID operativo. Crear el
child no hace que las finanzas y costos existentes se vuelvan automáticamente compatibles.

`consolidated` usa la unión de scopes autorizados, con IDs deduplicados, y distingue «todo SKY» de «las cuentas a
las que este actor accede». El total visible no debe incluir datos de una cuenta oculta sólo para reconciliarlo.
Una capability comercial a nivel cliente no sustituye las reglas de acceso del Space.

### 3.3 Versión y comprobante de pertenencia

Cada agregación que se congele debe registrar el scope, versión/digest del binding, período y fecha efectiva,
IDs de fuente, método de inclusión/exclusión y cobertura. Para historia ya emitida: lo publicado queda `as_recorded`;
una reclasificación crea otra proyección/version/revisión, sin reescribir el snapshot anterior. La pertenencia
histórica del hecho se resuelve con la versión/fecha efectiva correspondiente; el permiso del actor se revalida
contra su autoridad actual para esa población. No exigir que el routing actual del Servicio siga siendo igual al
routing congelado de agosto para leer legítimamente agosto, ni permitirlo sólo por un grant histórico revocado.
Los receipts no acreditan por sí solos que cada query filtró bien: las pruebas deben contrastarlos contra el conjunto
de fuente.

## 4. Historia de trabajo: clasificar antes de mover

### 4.1 Mapa fuente→proyección observado

Notion es owner de primitives de trabajo; Greenhouse es owner de métricas. El binding de DB por Space vive en
`greenhouse_core.space_notion_sources`; BQ replica el binding y la sync alimenta conformed→PG, conforme a
`GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md:69–75,120–128`.

La proyección PG hace `ON CONFLICT(notion_project_id) DO UPDATE` y sobrescribe `space_id/client_id/module_id`
(`sync/project-notion-delivery-to-postgres.ts:274–298`). Con tareas ocurre lo mismo por `notion_task_id`
(`435–481`). Una misma página Notion no se convierte en dos hechos independientes por conectar la misma DB a dos
Spaces: el último upsert puede cambiar su pertenencia. También hay reconciliación de ausentes por Space
(`580–610`): un corte mal planteado puede marcar historia como ausente/deleted aunque siga existiendo en la DB.

Consecuencias:

- No activar dos bindings sobre las mismas DB sin una regla determinista de routing por objeto y pruebas de que
  cada página se proyecta una sola vez.
- No hacer UPDATE manual de `space_id` sobre los 123 proyectos mientras el upstream siga enviando el Space viejo:
  la siguiente sync puede revertirlo o volver a mover tareas.
- Si la DB de Blog es distinta, comprobar su identidad, permisos y relaciones; un Content Hub editorial no entra
  al mismo pipeline sólo por tener páginas o tareas parecidas.
- Si se comparte DB, el particionado por Servicio necesita un primitive mantenido por el owner y un único routeo
  aplicado antes de BQ/PG. El texto de un nombre no es ese primitive.

### 4.2 Inventario de clasificación propuesto

Generar un preview revisable por proyecto/tarea/campaña, sin aplicar cambios, con estas columnas no sensibles:

`sourceSystem`, `sourceDatabaseId`, `sourceId`, `currentSpaceId`, `candidateSpaceId`, `candidateServiceId`,
`effectiveFrom`, `effectiveTo`, `evidenceKind`, `evidenceRef`, `confidence`, `decisionState`, `reason`, `version`.

Jerarquía de evidencia:

1. Binding explícito vigente del proyecto a Servicio y cuenta, aprobado y corroborado contra la fuente.
2. DB de origen dedicada y contrato de onboarding que establezca esa pertenencia inequívoca.
3. Relación comercial documentada del proyecto/campaña al Servicio, con fecha efectiva.
4. Propuesta heurística de nombre, responsables o fechas sólo como candidato de revisión; no como clasificación.

Estados: `confirmed_design`, `confirmed_blog`, `shared_with_rule`, `unclassified`, `conflict`. Son estados de
clasificación, no nuevas organizaciones ni clientes. Un objeto `unclassified/conflict` no se incorpora a un informe
split como si estuviera clasificado. En el consolidado puede permanecer en el residual histórico, visible y separado.

No asignar automáticamente todo lo anterior a noviembre a Diseño ni todo lo posterior a Blog. La fecha de
prestación y el inventario pueden hacer una hipótesis razonable, pero no prueban pertenencia individual.
No ampliar el algoritmo de entitlement para «ayudar» a un objeto sin clasificación.

### 4.3 Relaciones de trabajo que deben conservarse

- `tasks.project_record_id` y la identidad `notion_project_id` deben seguir apuntando al mismo proyecto real.
- Las 30 tareas sin proyecto requieren triage; no rellenarlas con un proyecto de Blog por defecto. Conservar sus
  relaciones fuente hasta resolver si son huérfanas reales, proyección incompleta o relaciones múltiples.
- `project_source_ids`, `tarea_principal_ids` y `subtareas_ids` se transportan como arrays
  (`project-notion-delivery-to-postgres.ts:153–158,437–458,486–511`). Una tarea que tenga varias relaciones no puede
  multiplicarse por cada proyecto al totalizar la organización.
- Los eventos de estado/correcciones se identifican por tarea y fuente. Preservar ese ID permite conservar RpA,
  FTR y trazabilidad; clonar tareas para cuenta nueva duplicaría historias y métricas.
- Mantener reglas de deleted/excluded y períodos iguales al comparar snapshots; 7.867 filas brutas no se
  convierten en 7.867 activos o entregables elegibles.

## 5. Fechas: cuatro relojes, sin atribución retroactiva silenciosa

| Reloj | Evidencia/contrato | Tratamiento |
| --- | --- | --- |
| Historia del sitio | GA4/GSC/AEO con sus propiedades, runId y fecha de observación | Puede preceder al servicio. Es baseline/contexto, no resultado de una prestación Efeonce. |
| Inicio del Servicio en CRM | Blog `start_date=2026-09-24` | Conservar como dato del objeto y aclarar qué evento representa; no convertirlo automáticamente en inicio de producción. |
| Inicio planificado de prestación | `docs/context/13_icp-buyer-personas-jtbd.md:250` declara 01-11-2026 | Es planificación/contexto, no sustituto de anexo firmado ni prueba de delivery. |
| Fecha efectiva de cuenta/clasificación | El nuevo binding de Proyecto/Servicio/Space | Debe declarar desde cuándo rige y cuándo se registró la decisión. No cambia automáticamente las tres fechas anteriores. |

Agregar `effective_from/effective_to` para vigencia y `recorded_at/actor/reason` para auditoría. Una corrección que
hoy descubre que un proyecto pertenecía a Diseño en agosto no debe fingir que esa clasificación se conocía en agosto.
Las vistas `as_recorded` y `classified_restated` responden preguntas diferentes y deben identificarse.

Las fechas de importación PG tampoco identifican creación fuente: el primer registro local es marzo de 2026 y
existen tareas completadas en 2025. Preservar `source_updated_at`, `synced_at` y timestamps propios de Notion;
no inventar el timestamp de origen que no se capturó. Los períodos ICO usan sus reglas de due/completed/anchor,
no `created_at` del registro local. El baseline SEO usa el calendario de cada fuente, no el de una factura.

## 6. ICO: población, snapshots y consolidación

### 6.1 Lo que existe

- `ico-engine/read-metrics.ts:313–332` lee el snapshot mensual por **space_id** y mes.
- `efeonce-insights/adapters/ico-adapter.ts:62–67` enumera Spaces de toda la organización; no resuelve la cuenta
  ni filtra por Servicio. `projectIds` del request no corrige ese alcance.
- `ico-engine/shared.ts:81–88` declara dimensiones space/project/member/client/sprint/business_unit; Servicio no
  es dimensión disponible de ese contrato actual.
- `materialize.ts:625–631` guarda `metrics_by_organization.organization_id` usando **client_id**, una identidad
  legacy distinta de la PK de Organization. Dos Spaces con el mismo client llegan al mismo bucket legacy.
- `organization-ico-metrics-source.ts:53–95` resuelve aliases de Organization y Spaces con un `Set`; luego lee y
  agrega todas las filas BQ de esos aliases (`112–184`).

Conservar esas identidades antiguas como procedencia, no convertirlas silenciosamente en IDs de cuentas nuevas.
Un informe de cuenta debe leer la población por cuenta/Servicio; `metrics_by_organization` no es un atajo válido.
El consolidado debe representar la unión de tareas de SKY una vez, no sumar un snapshot global y los dos Spaces.

### 6.2 Inmutabilidad: distinguir el contrato de Insights de las proyecciones ICO

Las ediciones Insights selladas son inmutables y se revisan por nueva versión. En ICO hay snapshots operativos y
cierres con otra mecánica:

- `materialize.ts:81–97` reutiliza un período con task snapshots locked, salvo force.
- `99–177` reemplaza el task snapshot del período; la función de freeze usa `lockSnapshot=true,force=true`
  (`498–509`). No invocarla como una lectura ni como script de migración de cuenta.
- `215–284` reemplaza el conjunto mensual de métricas por período mediante DELETE+INSERT y lo agrega por Space.
- `shared.ts:191–229` prefiere locked/working por período y cae a live si no existen snapshots preferidos.
  La preferencia no es un binding histórico versionado por cuenta.
- Los cinco materializers dimensionales tienen además sus safety gates/MERGE/tracking de TASK-900. No trasladar
  ese contrato por analogía a cualquier función que se llame snapshot.

**Riesgo:** mover tareas hoy y rematerializar un mes pasado puede cambiar el split de Space o recalcular el
consolidado de un período ya revisado. El alcance de varias operaciones es el período completo, incluso otros
clientes. La migración no debe llamar al materializador global para «hacer aparecer» la cuenta nueva.

Ruta segura: conservar snapshot/edición original, crear una clasificación histórica versionada y probar una
proyección paralela de lectura de cuenta. Si se decide restatar un período, usar un flujo de corrección explícito,
con scope y reconciliación, sin borrar evidencia ni alterar bonus/pagos de nómina. Lo no restatado sigue mostrándose
como historia anterior a la separación, con alcance original.

### 6.3 Matemática del consolidado

La misma ventana, método, filtro deleted y población elegible son precondiciones. Reutilizar
`ico-engine/shared.ts:334–395`, el registro y gates del dueño; no introducir fórmulas nuevas en el BFF.

| Métrica | Consolidación correcta | Agregado inválido |
| --- | --- | --- |
| OTD | `sum(on_time)/sum(on_time+late_drop+overdue)` en la unión de tareas elegibles | Promedio simple de los porcentajes de las dos cuentas; penalizar carry-over que el contrato excluye. |
| RpA media | Suma de valores elegibles / número de tareas elegibles positivas, conservando missing/non-positive y confidence | Promediar medias sin peso; tratar null como cero; usar total de completadas como denominador cuando difiere del elegible. |
| RpA mediana | Distribución conjunta o sketch compatible del dueño, declarando aproximación | Mediana de medianas o promedio ponderado de medianas presentado como mediana de SKY. |
| FTR | Suma de passed / suma de eligible con el criterio canónico y método uniforme | Ponderar por una población distinta a la elegible o ignorar falta de evidencia. |
| Throughput/completadas | Conteo de task/deliverable únicos en scope y período | Sumar tareas duplicadas por relación a campaña/proyecto/cuenta. |
| Cycle time | Distribución conjunta; media ponderada por muestra elegible si los métodos coinciden | Media de medias sin muestra o mediana de medias. |
| Stuck% | `sum(stuck)/sum(open eligible)` de la misma foto temporal | Sumar porcentajes o mezclar fotos de distinta fecha. |

La fórmula canónica de mediana ICO usa `APPROX_QUANTILES` (`shared.ts:373–377`): si se utiliza, se declara como
aproximación. El fallback Organization actual pondera `rpa_median` de aliases (`organization-ico-metrics-source.ts:144–149`);
**eso no calcula la mediana de la unión**. No debe reutilizarse con una garantía más fuerte en el nuevo consolidado.

### 6.4 Riesgo de aliases, acotado y condicional

Añadir otro Space con el mismo client **no duplica por sí solo** el alias: el resolver usa un Set. El problema
aparece si se materializa la misma población bajo alias viejos y nuevos y luego se suman todos, o si el origen
conformed replica una tarea en dos Spaces. Hace falta una política de identidad de hecho/version: una fila global
legacy y dos filas split no son tres poblaciones independientes.

Antes del cutover, comparar inventario de task IDs y muestra de snapshots, no sólo totales que podrían compensarse.
El reader de organización no debe sumar automáticamente toda fila cuyo ID parezca alias. Los aliases son formas
de encontrar una fuente, no evidencia de que sus poblaciones sean disjuntas.

## 7. Campañas, proyectos y work items

`campaigns/campaign-store.ts:9–42` ancla Campaign en Space y vincula `project_source_system/project_source_id`.
`campaign-metrics.ts:161–170` deduplica los IDs de proyectos y `199–204` filtra tareas por Space y proyectos.
Son buenas bases para un lector de cuenta, pero una campaña que cambie de Space no puede conservar links al Space
viejo sin reconciliación, ni el cambio de campaña puede trasladar automáticamente toda su historia de tareas.

El modelo debe decidir por cada caso: campaña exclusiva de una cuenta, iniciativa consolidada con proyectos
separados, o trabajo compartido con ownership explícito. No duplicar una campaña y copiar sus entregables para
representar el mismo trabajo en dos cuentas. En un consolidado, las tareas subyacentes se unen por identidad aunque
aparezcan en más de una relación legítima.

`campaign-metrics.ts:210` también muestra un AVG sobre RpA bruto del conformed: no convertir ese reader en la
fuente del ICO oficial por Servicio. Puede servir evidencia de campaña con su metodología; los ratios oficiales
se obtienen del mismo reader/población/gate que la entrega del portal y de Insights.

## 8. Equipo y capacidad bajo dos cuentas

### 8.1 Granularidad real y riesgos

Los tres assignments actuales pertenecen al cliente y carecen de `service_id`. No hay dato que los convierta en
staffing de Blog. Tampoco se deben borrar para empezar de cero o copiarlos a ambas cuentas.

- `agency/team-capacity-store.ts:306–326` une assignments a client y escoge **un Space** por `client_id` usando
  `ORDER BY created_at DESC … LIMIT 1` (`309–321`). Al crear otro Space para el mismo cliente, todas las asignaciones
  pueden aparecer como del Space nuevo. Es un riesgo reproducible de selección, no staffing real del nuevo servicio.
- `toAgencyCapacityOverview` agrupa por clientId+clientName (`222–250`), aun llamando `spaceAllocations` al resultado:
  dos cuentas del mismo cliente se vuelven a colapsar.
- `account-360/facets/team.ts:74–82` suma assignments por member sin filtro de client/Space/Servicio; su lateral
  `104–109` toma el último assignment del miembro. No usarlo como staffing de cuenta: puede incluir asignaciones de
  otros clientes de la misma persona. Este discovery no leyó personas ni probó una fuga efectiva en SKY.

### 8.2 Propuesta

Usar assignments existentes como fuente, añadiendo un binding de cuenta/Servicio y vigencia gobernado. En A' los
nuevos assignments pueden necesitar el bridge operativo child; en B mantienen el client compartido. Ambos necesitan
resolver owner comercial, sin multiplicar el costo base ni atribuirlo al child como nueva contraparte. Evaluar si
`client_team_assignments.service_id` basta para resolver el Space mediante el Servicio; si se necesita asignación
compartida o por cuenta sin un único Servicio, modelar slices efectivos que referencien **el assignment original**.
Nunca obtener la cuenta con latest Space por client.

Una persona en Diseño y Blog es una identidad única. Su capacidad contractual base no se duplica y la suma de sus
slices no puede exceder la asignación fuente/capacidad sin una excepción explícita. La proyección muestra personas
únicas para headcount y suma FTE de slices para dedicación; son magnitudes distintas.

Distinguir `contracted`, `assigned` y `used`: `TEAM_CAPACITY_ARCHITECTURE_V1.md:150–182` fija que el compromiso no
es consumo real, que tener varios assignments no aumenta capacidad contractual y que un índice porcentual no se
presenta como horas. No convertir throughput SEO o tráfico web en horas de trabajo de la persona.

La lectura histórica usa snapshots de staffing vigentes al período; no aplica la plantilla actual a agosto.
Cualquier modificación de asignaciones actuales requiere su command/auditoría y no reabre automáticamente
nómina o costos de períodos cerrados. Los clientes sólo reciben el DTO client-safe de equipo, sin sueldo/costo
personal ni desglose privado de dedicación a otros clientes.

## 9. Finance: una relación comercial, atribución por cuenta, conservación monetaria

### 9.1 Objetos que permanecen únicos

Conservar Organization, cliente comercial, perfiles financieros, contratos/facturas originales, cobros/pagos,
conciliaciones y sus identificadores de proveedor. La opción A' puede introducir un bridge client operativo hijo,
con owner comercial explícito, sin duplicar contraparte ni Finance profile; no se ejecuta mediante el command de
alta comercial que crea ambos. Crear otro Space no requiere duplicar RUT, documento, cuenta
bancaria ni fila `income_payments`. Los cobros ya están ligados a `income_id`; el campo opcional Space es atribución
operativa, no una segunda entrada de caja.

`finance/income-payments-reader.ts:9–17` manda usar la view normalizada para CLP y supersede. El readback vio dos
filas superseded: sumarlas como cobros efectivos sería doble conteo. No repartir un cobro entre cuentas reescribiendo
el banco; una vista de allocation referencia el cobro/documento único y conserva el monto original y su moneda.

Distinguir fee pactado, factura devengada y caja cobrada. Las cantidades del Servicio/engagement no acreditan
facturación ni recepción. Las 27 facturas observadas no tienen en esas columnas un puente directo al Servicio,
por lo que un split financiero exacto todavía necesita evidencia documental/atribución; no se infiere por el
cliente común, el nombre del Space ni una ratio de tareas.

### 9.2 Reutilizar atribución existente

`service-attribution/materialize.ts:26–69` ya define hechos resueltos y unresolved con organization/client/space/
service, período, sourceId, método, confianza y evidencia. `426–540` resuelve Servicio por vínculo directo,
puentes de deal/documentos, línea/alcance inequívoco y deja ambigüedad observable. `651–672` usa servicios activos
y fechas; cambiar hoy active/Space puede influir una re-materialización pasada si no se fija el contexto temporal.

Para costos directos, `finance/expense-service-allocations.ts:178–205` y su migration proporcionan allocation
explícita revisable. Sólo lo aprobado debe afectar cifras. Para labor comercial, el grain upstream continúa
`member+client+period`; la separación por Servicio es downstream y no debe reescribir el costo base.

**Riesgo específico de A':** el loader toma `service.clientId` de `spaces.client_id` (`materialize.ts:659–668`),
el índice por client usa ese valor (`326`) y la resolución de candidatos prefiere client antes de Organization
(`527–531`). Si Blog se mueve al Space child pero la factura conserva el owner comercial, ese fallback podría
excluir Blog y convertir Diseño en un falso «único Servicio». Un reparto de labor del child también podría perder
el revenue del owner. Resolver commercialOwner no es sólo deduplicar el SUM final: hay que normalizar la identidad
comercial **antes de construir candidatos y pesos**, manteniendo las restricciones de Space/Servicio y vigencia.
No ampliar candidatos de otra cuenta por normalizar owner; la ambigüedad queda unresolved hasta tener evidencia.
Este es un riesgo condicional del diseño A', no un incidente observado del estado actual de SKY.

El materializer actual distribuye labor/overhead por revenue share del cliente y período, o por Servicio único
cuando lo hay (`service-attribution/materialize.ts:1242–1273`); si no tiene pesos válidos deja
`no_resolved_revenue_share` (`1283–1301`). Es un método **modelado**, no tiempo observado por Servicio.
`distributeAmountByWeights` conserva el residual de redondeo en la última slice (`279–303`). No declarar esa
asignación como costo real medido de cada cuenta ni cambiarla a 50/50 sin política/evidencia.

La primitive `commercial_cost_attribution_v2` incluye serviceId, pero su reader por cliente no lo selecciona
(`commercial-cost-attribution/v2-reader.ts:84–94`). No basta renombrar el DTO como por cuenta: requiere una lectura
dueña por Servicio/cuenta que conserve el grain, la cobertura y los métodos de la view canónica.

### 9.3 Conservación, cierres y clasificación histórica

Para cada documento/costo original y período:

`monto original normalizado = suma(slices atribuibles únicas) + residual no atribuido`.

La igualdad se verifica por sourceId, amountKind, moneda/base normalizada y estado de anulación/supersede, no sólo
por un gran total que pueda esconder duplicados. Los importes nativos y CLP/USD conservan su snapshot FX; no hacer
conversiones nuevas por Space. El consolidado cuenta el original una vez, no el original más sus allocations.

`MEMBER_LOADED_COST_MODEL_V1.md:113–135` exige snapshots históricos de cost basis/staffing/overhead e inmutabilidad
de períodos cerrados. El materializer de atribución reemplaza las tablas serving del período dentro de una
transacción (`service-attribution/materialize.ts:1353–1364`): son proyecciones reconstruibles, no el ledger de
una decisión histórica aceptada. Para la separación, congelar recibos as-recorded y versionar la clasificación;
restatar requiere el flujo de período autorizado, no volver a correr el materializer global sin control.

No se necesita desarrollar otra contabilidad para dos cuentas. Sí hacen falta readers y slices con evidencia,
residual visible y gate de cobertura; un margen de Blog con costo faltante no se presenta como canónico positivo.
Los datos financieros privados del consolidado no se incluyen en un portal cliente por heredar acceso al Space.

## 10. Account 360, caches y joins: evitar mezcla o multiplicación

| Superficie | Código observado | Cambio necesario antes de reutilizarla por cuenta |
| --- | --- | --- |
| Resolución Organization→Spaces→clients | `account-360/resolve-scope.ts:22–40` usa arrays DISTINCT | Conservar dedupe de bridges operativos y scope efectivo. En A' varios IDs hijos exigen resolver y deduplicar el commercialOwner; DISTINCT de IDs distintos no consolida una sola contraparte. |
| Cache de facet | `facet-cache.ts:23–24`; `account-complete-360.ts:176,198` | Key sólo org+facet+resolverVersion. Una nueva lectura por cuenta necesita account/scope+asOf/period+view/version y dimensión de autorización/redacción adecuada. No insertar split y consolidado bajo la misma key. |
| Contexto de fecha/paginación | `account-complete-360.ts:148–149` pasa asOf/limit/offset, pero no entran a la key actual | Ya hay riesgo de responder con otra foto/página cacheada; no ampliar su garantía al nuevo selector. |
| Delivery de Organization | `facets/delivery.ts:100–114` cuenta tasks unidas a projects y filtra p.space_id | Tareas huérfanas pueden quedar fuera; declarar cobertura, no moverlas a un Space arbitrario para cuadrar. |
| Economía por Organization | `facets/economics.ts` consume serving de org y client | No unir una fila de costo/cliente una vez por Space. Cuenta requiere atribución explícita; consolidado deduplica cliente/fuente. |
| Finance por Organization | `facets/finance.ts:60–72` usa clientIds y factura | En B ambas cuentas verían la misma factura si no se usa atribución scoped. En A' buscar sólo el child puede dar vacío y añadir parent+child sin normalizar puede duplicar. Resolver owner canónico único + slices operativas; no copiar el query como ledger de cuenta. |
| Módulos por Space | `facets/spaces.ts:49–54` cuenta client_service_modules por client | Dos Spaces compartirían el mismo conteo; no prueba qué Servicio compró cada cuenta. |
| ICO por aliases | `organization-ico-metrics-source.ts:112–184` | Evitar sumar cohorts solapadas bajo alias; recuperar una población por identidad/version. |

Un join `clients → spaces → income` multiplica cada factura si hay dos Spaces del mismo client y se suma tras el
join (alternativa B). En A', los childs operativos deben llegar al mismo owner financiero sin replicar documentos
ni costos. Un query `WHERE client_id=ANY(dedupedClients)` no produce ese fan-out por sí solo; tampoco normaliza a un
owner cuando los IDs operativos son diferentes. Distinguir el riesgo
condicional de un incidente observado. Igualmente, un DTO puede mezclar cuentas sin duplicar números: reusar la
cifra global en ambas vistas de cuenta ya es incorrecto aunque el consolidado permanezca igual.

La invalidación debe alcanzar scopes afectados y consolidado cuando cambia un binding, assignment, clasificación,
source o permiso; no sólo la cache de la cuenta destino. Mantener cache de autorización separada de datos; un hit
no reautoriza una cuenta. El modo degradado nunca vuelve al total de SKY como fallback de una cuenta aislada.

## 11. Historia visible y reporting de las dos cuentas

### Diseño

Conservar historia previa del Space sin rebautizarla como SEO. Mostrar su método/alcance original y, si se clasifica,
una vista posterior con versión y trazabilidad. Las ediciones Insights existentes sólo ICO no se reasignan a otro
Servicio por un cambio de Space: conservar audiencia, reportId, ventana, snapshot y grants emitidos conforme al
contrato. Una revisión posterior es una nueva edición; no editar sus fuentes congeladas.

### Blog SEO/AEO

Obligatorios desde su primer informe: **GA4, GSC y corrida AEO nativa**. Reutilizar el discovery anterior y sus
receipts por fuente; el gate de módulos no basta para exigir GA4 cuando SEO ya tiene GSC, ni AEO nativo cuando hay
referrals IA. El run existente puede aportar proyección URL del blog con panel/denominadores declarados; no exige
una corrida dedicada sólo por tener perfil raíz y tampoco habilita reetiquetar su score global.

La operación editorial ICO se añade desde trabajo realmente integrado y clasificado. Una métrica de delivery
puede quedar «fuente no conectada/no disponible» mientras falta ese binding; no puede copiarse el ICO de Diseño.
Eso no reduce las tres fuentes analíticas obligatorias a opcionales. Las ventanas previas al inicio de prestación
sirven de baseline del sitio; no se presentan como contribución de Efeonce.

### Consolidado SKY

Presentar ambas cuentas y su cobertura, fecha y método. Para comparar eficiencia agregada, unir el trabajo único
y recalcular con el dueño; para tráfico/visibilidad, mantener poblaciones/canales/métodos distintos. No sumar
sesiones GA4 a clics GSC ni promediar un score AEO con OTD para inventar un índice de SKY. La visión consolidada
puede juntar capítulos sin inventar una métrica común. El baseline del sitio y la entrega del servicio tienen
líneas temporales distintas y deben leerse como tales.

## 12. Cutover conservador y reversible

### Fase H0 · Congelar el inventario y decidir contratos

- Snapshot sólo lectura de IDs/conteos/hashes de proyectos, tareas, eventos y relaciones; versiones de snapshots
  ICO e Insights y metadata de cierres financieros. Guardar baseline por source y período sin PII en el dossier.
- Fijar qué cuenta conserva el Space existente y cómo se crea la otra, sin duplicar la contraparte comercial,
  Finance profile u Organization. El bridge operativo child de A' requiere su command y commercialOwner; B requiere
  client compartido con scope explícito. No decidir el reparto sólo desde nombres. Confirmar inicio de prestación.
- Registrar cardinalidad de DB→Space→project, política de trabajo compartido, grain de assignments y scopes de
  lectura. Una decisión nueva de schema/scope/Finance requiere ADR propuesto antes de implementar.

### Fase H1 · Preview de clasificación y shadow

- Resolver candidatos sin escrituras; unclassified/conflict quedan pendientes. Revisar primero proyectos activos,
  huérfanos y relaciones múltiples. No mover 123 filas por defecto.
- Probar readers de cuenta con scope explícito y conservar lectura original en paralelo. Comparar conjuntos de
  IDs, no sólo cifras redondeadas. Separar restatement de historia y operación futura.
- Agregar guards de pertenencia y nuevas keys/invalidación de cache antes de ofrecer la cuenta nueva al cliente.
- Validar router único del sync; impedir que una DB o página se reasigne por carrera entre dos bindings.

### Fase H2 · Corte operativo aprobado

- Aplicar bindings/asignaciones aprobadas por commands canónicos, actor, razón y fecha efectiva; emitir eventos de
  invalidación/proyección idempotentes. No ejecutar UPDATE pelado de las columnas owned por sync.
- Sincronizar un lote acotado y comprobar la siguiente sync, webhooks y replay: IDs y cuentas no oscilan y no se
  marcan datos de otra cuenta como deleted. La segunda pasada debe ser idempotente.
- Generar proyecciones nuevas versionadas en el scope acotado; no invocar rematerialización global de meses
  cerrados. Primera edición integrada de Blog sólo después de gates GA4+GSC+AEO y delivery que se incluya.

### Fase H3 · Reconciliación y operación

- Conservar IDs/hashes de hechos originales y sus estados; comparar total único SKY antes/después, separación
  por cuenta y residuales. Los movimientos de clasificación deben explicar toda diferencia.
- Cuadrar FTE/costos/documentos por fuente; ninguna nueva cuenta crea capacidad ni caja. Mantener cifras privadas
  internas fuera de la vista cliente. Verificar datos/autorización en UI, App/Ecosystem API, MCP y exports.
- Observar la corrida de sync/proyecciones posterior al corte y una ventana acordada con los owners. Un éxito
  manual inmediato no acredita que el cron preserve el reparto.

### Rollback

Revertir routing/feature de la lectura nueva y volver a la clasificación/version anterior con evento compensatorio,
preservando el historial de decisiones. Si un dato de cuenta aún no puede aislarse, suspender esa vista; no devolver
todo SKY como fallback. No borrar la nueva Organization (no se crea), duplicar clientes, restaurar DBs a ciegas ni
resetear facturas/pagos. No revocar o reemitir documentos financieros para deshacer una cuenta operativa.

Si la fuente ya produjo trabajo nuevo para Blog, el rollback debe conservarlo como hecho con su identidad y scope;
no moverlo a Diseño para que cuadre con el esquema viejo. Desactivar el sync equivocado antes de cualquier replay
es una medida de contención específica, no permiso para detener indiscriminadamente otras cuentas.

## 13. Matriz de conservación y pruebas

| ID | Caso / estímulo | Evidencia de aceptación |
| --- | --- | --- |
| H01 | Preview de 123 proyectos | Cada ID aparece una vez, con decisión/evidencia o residual; nada se aplica automáticamente. |
| H02 | Mismo notion ID aparece bajo dos bindings | Un routing dueño lo asigna de forma determinista o bloquea conflicto; no duplica ni oscila. |
| H03 | Segunda sync después del corte | Las pertenencias aprobadas sobreviven; ningún absent reconciliation borra trabajo ajeno. |
| H04 | Tarea con varias relaciones de proyecto/campaña | Cuenta única en consolidado y ownership split explícito; no fan-out. |
| H05 | Treinta tareas sin proyecto | Residual/triage con evidencia; no exclusión silenciosa ni asignación default a Blog. |
| H06 | Cambio de account/service en medio de un mes | Scope temporal reproducible por hecho; ninguna atribución retroactiva sin revisión. |
| H07 | Baseline web previo a prestación SEO | Cifras de sitio conservadas como baseline; cero claims de resultado Efeonce no observado. |
| H08 | Snapshot ICO locked y edición Insights emitida | Hashes/IDs originales intactos; restatement en otra versión y con reconciliación. |
| H09 | Binario/replay viejo proyecta Space anterior | Contención observable; no reasigna ni ensancha automáticamente el scope nuevo. |
| H10 | Alternativa B: dos Spaces con mismo clientId | Aliases deduplicados; no suma snapshot global más sus particiones. Es un caso de prueba, no elección de arquitectura. |
| H11 | Porcentajes OTD de cuentas con denominadores distintos | Consolidado desde numeradores/denominadores canónicos; no promedio de porcentajes. |
| H12 | RpA missing, no positivo, suppressed o baja confianza | Null/gates/counts preservados; no cero ni agregación que salte supresión. |
| H13 | Medianas por cuenta disponibles, sin distribución conjunta | No se publica su promedio como mediana consolidada; reader devuelve límite o cálculo dueño aproximado. |
| H14 | Misma persona trabaja en ambas cuentas | Headcount único; FTE slices conservadas; no se duplica capacidad contractual ni sueldo/costo base. |
| H15 | Nuevo Space es el más reciente del cliente | Staffing no se mueve por LATERAL LIMIT1; assignment/service/scope explícitos. |
| H16 | Miembro tiene assignment en otro cliente | Ese FTE no entra al equipo de cuenta SKY; DTO no revela otra dedicación privada. |
| H17 | Factura/cobro original con dos allocations de cuenta | Un documento/settlement; suma de slices+residual igual al original con estados de supersede/anulación. |
| H18 | Costos o revenue sin evidencia de Servicio | Residual con método/razón/cobertura; no margen canónico fabricado ni reparto automático 50/50. |
| H19 | Período financiero cerrado y cambio de staffing actual | Historia monetaria congelada intacta; corrección usa flujo de período autorizado. |
| H20 | Cache Diseño caliente seguida de Blog/consolidado/otra fecha | Keys distintas y autorización vigente; ninguna mezcla o foto equivocada. |
| H21 | Un usuario accede a una cuenta pero no a la otra | Consolidado visible es su scope autorizado y no revela total privado de la cuenta oculta. |
| H22 | Falta GA4 o corrida AEO nativa pero hay GSC/referrals | Gate requerido bloquea aceptación del informe Blog; allowPartial no reduce el encargo. |
| H23 | Run nativo existente de perfil raíz tiene citas URL Blog | Proyección canónica reutiliza evidencia y denominador; no copia score global ni fuerza nueva compra. |
| H24 | Rollback después de crear trabajo nuevo Blog | Hechos nuevos conservados; versión/routing anterior sólo donde sea seguro; nunca fallback a todo SKY. |
| H25 | Alternativa A': child operativo de SEO con mismo owner comercial | No Finance profile nuevo ni documentos/costos clonados; owner deduplicado y slices operativas con cobertura; child vacío no se presenta como costo cero. |
| H26 | Servicio cambia de Space después del snapshot histórico | Hecho conserva owner/routing congelados; actor necesita permiso actual para esa población; no reasignación histórica por routing latest. |
| H27 | A': factura del owner comercial y Servicio en Space child | Resolver candidatos y pesos con owner normalizado sin perder restricciones ni volver Diseño falsamente único; si falta evidencia, unresolved. |

Los tests H10 y H25 validan alternativas distintas; no suponen que ambas se activarán. Los tests deben vivir en el owner de la capacidad: Delivery/sync para pertenencia e idempotencia, ICO para población
matemática, Team Capacity para FTE, Finance/attribution para conservación, Account360 para scope/cache, Insights
para receipt/gate/snapshot. Usar fixtures y PostgreSQL local; cualquier live test que escriba en la instancia
compartida requiere su alcance formal y no se ejecuta como discovery.

## 14. Unknowns, decisiones y dueños

| Pendiente | Dueño funcional / técnico | Evidencia que lo resuelve |
| --- | --- | --- |
| A qué cuenta pertenecen los 123 proyectos y tareas actuales | Liderazgo SKY / Delivery + sync | Preview de clasificación, fuente de cada proyecto y aprobación atribuida. |
| DB de producción Blog y cobertura de trabajo editorial | Responsable de cuenta / Delivery + Notion integration | Binding nominal válido, permisos, objetos/primitives y prueba de lectura; no basta un enlace al Content Hub. |
| Fechas de prestación frente al start CRM | Liderazgo SKY + Commercial | Anexo/acta y decisión de fecha efectiva; no cambiar hechos web o delivery retroactivamente. |
| Binding Proyecto↔Servicio efectivo | Delivery + dueño del contrato de Servicio | ADR/contrato y command versionado; module_id no sustituye este vínculo. |
| Historia de assignments por cuenta/Servicio | Agency / Team Capacity | Slices/assignments originales, vigencia y cobertura por período; revisión sin publicar PII. |
| Estado locked/cierre de snapshots ICO y períodos de costos | Delivery/ICO + Finance | Metadata de snapshots y closure records concretos antes de cualquier rematerialización. No se leyó BQ ICO en este frente. |
| Ambigüedad de las facturas y labor ya unresolved | Finance / Service Attribution | Puentes documentales y método aceptado; conservar residual mientras falte. |
| Exactitud/autoridad de medianas consolidadas legacy | ICO + Account360 | Prueba de unión/distribución y versión de método; no aceptar promedio de medianas. |
| Fuente/service scope de campañas transversales | Delivery + Campaign Registry | Links aprobados por ID, ownership y dedupe de tareas. |
| Contratos API y claves de cache por cuenta | Account360 + Client Portal | DTO/membership efectivo server-side, keys y pruebas de invalidación entre scopes. |
| Comparativos/alcance actual de las tres fuentes Blog | Growth/SEO/Analytics/AEO + Insights | Recibos GA4/GSC/aeo_run y proyecciones de los anexos previos, no un reporte reducido. |

Este documento no asigna personas, fecha de entrega ni aceptaciones humanas por inferencia. Los dueños anteriores
son dominios responsables de producir/verificar evidencia. Discovery completo no significa corte listo: faltan
aceptar contratos, formalizar unidades y ejecutar sus verificaciones con el alcance autorizado.
