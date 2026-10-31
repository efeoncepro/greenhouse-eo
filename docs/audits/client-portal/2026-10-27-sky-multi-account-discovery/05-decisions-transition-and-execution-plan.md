# 05 · Decisiones, transición y plan de ejecución integral

Fecha: 2026-10-27. Estado: **propuesta de discovery**, no tasks registradas, ADRs Accepted ni autorización de
provisioning/rollout. Este plan concilia los capítulos 01–04 y el backlog vigente, preservando el checkout compartido.

## 1. Qué se entrega y qué no demuestra cada hito

| Hito | Resultado | No demuestra todavía |
| --- | --- | --- |
| M0: diseño decidido | Organization/Spaces/Servicios, bridge, ownership, permisos y método de medición especificados | Implementación, migración o disponibilidad |
| M1: foundations verificadas | Routing determinista, contexto autorizado, cachés y writers compatibles con multi-Space | Que las fuentes de SKY estén listas ni que exista una nueva cuenta activa |
| M2: cuenta SEO provisionable | Plan de alta idempotente sin recrear cliente comercial, Finance o historia | Apertura a stakeholders ni sincronización externa activada |
| M3: medición interna completa | Preview/edición interna con GA4+GSC+motor AEO y receipts válidos | Portal departamental aislado, share público o entrega a cliente |
| M4: dos cuentas utilizables | Stakeholders/operadores trabajan con datos y permisos propios; Diseño conserva historia | Que haya entrega comercial o resultados SEO atribuibles |
| M5: operación recurrente | Sync, alertas, recurrencias y distribución autorizados y reconciliados | Lectura, aceptación del informe o impacto de negocio |

La medición puede desarrollarse en paralelo con foundations. M4 no puede apoyarse sólo en M3: filtrar URLs y
tener un PDF correcto no prueba aislamiento del portal, sus APIs, cachés, personas o automatizaciones.

## 2. Drivers y preocupaciones

| ID | Driver | Consecuencia de fallar | Dueño propuesto |
| --- | --- | --- | --- |
| DR1 | Una identidad comercial SKY | Duplicación de cliente, contexto financiero o conteos | Account/Core + Commercial + Finance |
| DR2 | Dos cuentas operativas reales | Mezcla de stakeholders, trabajo, datos y reporting | Spaces + Identity + Delivery |
| DR3 | Historia Diseño intacta | Pérdida/reclasificación de un año de operación | Delivery + ICO + Account360 |
| DR4 | Sync estable | Reasignación automática de SEO a Diseño en próximo tick | Services intake + Source Sync |
| DR5 | Tres fuentes del Blog obligatorias | Informe incompleto presentado como SEO/AEO | Growth + motor AEO + Insights |
| DR6 | Apertura proporcional y reversible | Un cambio local de datos afecta todo el portal | Release + dueños de runtime |
| DR7 | Atribución honesta | Baseline previo confundido con prestación o costos duplicados | Servicio + Metrics + Finance |
| DR8 | Principals y permisos explícitos | Dos usuarios por persona o acceso global por pertenecer a SKY | Identity/Access |

Los stakeholders reales y sus grants concretos se identifican en una fase autorizada; este discovery no consulta
nombres ni correos para completarlos ficticiamente. Un departamento, sponsor o cargo no equivale a permiso.

## 3. Registro de decisiones propuestas

### D01 — Organization → Spaces → Servicios

Reutilizar el modelo canónico aceptado: una Organization SKY; Space histórico como operación Diseño y nuevo Space
para Blog SEO/AEO; Servicios dentro de su cuenta operativa. Account360 es una lectura consolidada, no una entidad
Account nueva. Un Space puede agrupar varios servicios de una misma relación operativa.

La nueva decisión debe precisar la aplicación multi-Space en los owners de Core/Identity/Services; no reescribir
el ADR general para fingir que todos los consumers actuales ya cumplen. No crear repositorios, emisores, pools,
schemas por departamento ni otra plataforma para resolver este caso.

### D02 — Bridge técnico: dos alternativas legítimas

Ambas conservan una Organization y un único owner comercial/financiero. No son dos empresas ni dos Companies CRM.

| Alternativa | Beneficio | Trabajo/condición crítica | Criterio de preferencia |
| --- | --- | --- | --- |
| A': bridge operativo legacy propio por Space | Los readers/writers client-only conservan un selector inequívoco; menor mezcla accidental de Notion/equipo/delivery | Command de alta hijo, owner comercial común y rutas Finance/counters que no lo interpreten como cliente comercial nuevo; membresías/contexto para personas con ambas cuentas | Candidata transitoria preferida si se prueba conservación financiera y cobertura de aliases/consumers |
| B: mismo client técnico, contexto Space explícito | No introduce otro bridge legacy; hace a Space la frontera directamente | Convertir todos los consumers relevantes que sólo filtran por client, reparar sesión y latest-Space, source getters, permisos y métricas antes de apertura | Viable si la cobertura de conversión es completa y su mayor alcance se acepta |
| Dos Organizations / otro Account master | Aparenta aislamiento inmediato | Fragmenta identidad comercial e historia y obliga consolidación/dedupe nuevos | No recomendado para separar departamentos |

`clients.hubspot_company_id` no es UNIQUE en el schema vivo, pero el command de instanciación comercial rechaza un
segundo client de la Organization y crea perfil Finance. **No usar ese command para A'.** Diseñar un alta operativa
separada no es permiso para saltarse la validación: requiere contrato propio, owner comercial explícito y pruebas
de que no duplica contraparte, perfil, factura, pago o cliente en los conteos.

A' no elimina activeSpace: una persona puede ver ambas cuentas y `client_users.client_id` es singular. B tampoco
queda resuelta por crear membership: la sesión, refresh y cada reader deben respetar el contexto. La elección
definitiva queda condicionada al prototype/reconciliación del capítulo 01, no a una estimación de días inventada.

**Barrera financiera previa al cambio de routing:** el materializador actual prefiere candidatos por client
operativo antes que Organization. A' podría quitar Blog de los candidatos de una factura del owner comercial y
dejar Diseño falsamente único. Hay que resolver owner comercial **antes de candidatos y pesos**, conservando
Space/Servicio/vigencia, y comprobar consumers reactivos. Deduplicar sólo el SUM final no corrige esa falsa certeza.

### D03 — Contexto operativo y permisos

Reutilizar identidad/capabilities vigentes y las efectivas por Space; componer membership, asignación, techo de
Organization y permiso de la acción. El contexto estable incluye Organization/Space/Servicio(s), deriva bridges
técnicos y no se construye desde el nombre del cliente o el dominio del email.

Usar contexto por request/ruta para multi-tab. Un valor guardado como preferencia de cuenta no concede permisos;
el selector sólo enumera cuentas autorizadas. No imponer el último selector global de una pestaña a otra solicitud
que ya declara una cuenta distinta. No deducir consolidado corporativo por tener dos memberships: puede haber
otros Spaces o datos sin clasificar que el actor no tenga derecho a ver.

### D04 — Ownership de routing y fuentes

HubSpot conserva los campos comerciales que le pertenecen; Greenhouse conserva el mapping operativo explícito
Servicio→Space y el registro de fuentes→Space. Los cuatro carriles de sync convergen en el mismo resolver/command.
Ambigüedad queda como pendiente observable, no se resuelve por `LIMIT 1` o coincidencia de nombre.

El binding de fuente Notion y el binding Proyecto→Servicio son relaciones distintas. `module_id` apunta al
catálogo técnico `service_modules`: **no se escribe un `SVC-HS-*` en esa FK**. La relación de servicio tiene su
propio contrato de vigencia y su escritor dueño, no SQL de mapeo dentro de Insights.

### D05 — Historia, consolidado y finanzas

Conservar IDs, snapshots cerrados y población histórica de Diseño. No mover masivamente los proyectos, tareas o
facturas para inaugurar SEO. Clasificar trabajo mezclado sólo con evidencia y vigencia; lo unresolved permanece
visible. La nueva cuenta no hereda métricas de entrega de años en que aún no existía el servicio.

El consolidado opera sobre el owner comercial y poblaciones/IDs deduplicados; A' necesita resolver owner, no sólo
hacer DISTINCT de bridges. OTD se compone desde numerador/denominador; una mediana exacta no se obtiene promediando
medianas. Finanzas y sus cierres siguen siendo canónicos: atribución por servicio no reescribe documentos cerrados.

### D06 — Asignación de medición e Insights

El requirement GA4/GSC/aeo_run corresponde al informe de Blog y su cuenta/Servicio. Las conexiones organizacionales
se pueden reutilizar bajo bindings autorizados y versionados. No ampliar globalmente los informes de Diseño ni
crear otro OAuth para esquivar el scope. El capítulo 04 define receipts, pinning, hash y gates por fuente.

AEO reutiliza evidencia existente por URL cuando su panel/denominador lo permiten. Un panel general no se convierte
en editorial por filtrar citas; nuevas corridas se autorizan por separado. Historia GSC faltante requiere captura
y readers canónicos; no se fabrica al crear el Space ni se obtiene del Excel por inferencia.

### D07 — Apertura y distribución

Verificar aislamiento mediante portal/API/MCP, listas, detalle, outputs, cachés y automatizaciones. Para aislamiento
por identidad se utiliza recorrido autenticado. Bearer sharing sigue siendo una modalidad explícita transferible;
no se vende como prueba de departamento. Revalidar autoridad de distribución antes de dispatch y respetar el ledger.

## 4. Unidades formales propuestas

Los IDs Uxx son códigos de este plan, **no TASK reservadas**. Antes de implementar se concilia el backlog y se
formalizan las unidades con el planner, sus ADRs y los hooks que correspondan. No ejecutar una task citada sólo
porque este documento la mencione.

| Unidad | Resultado concreto | Ownership/home actual | Dependencias | Evidencia de cierre |
| --- | --- | --- | --- | --- |
| U00 | Decisiones D01–D07, estrategia A'/B y mapping mínimo de SKY | Core/Architecture/Identity/Commercial | Discovery | Drivers, alternativa elegida, migrations/interfaces propuestas y riesgos aceptados explícitos |
| U01 | Contexto operativo autorizado, sesión/multi-tab y grants por Space | Identity/tenant/entitlements + API context | U00 | Un actor/una identidad; dos cuentas permitidas; negativos de acceso y refresh sin rebote |
| U02 | Routing de Servicios y fuentes que sobreviva a todos los writers | `src/lib/services`, source registry/Notion + workers | U00 | Replay webhook, cron, backfill y conflicto no reubican servicio ni historia |
| U02F | Foundation de owner comercial, candidatos/pesos y compatibilidad reactiva | Finance/service attribution + contrato Core | U00/U02 | Fixture A'/B no vuelve falsamente único a Diseño ni duplica owner; pasa antes de mover el Servicio |
| U03 | Provisioning de cuenta operativa y bridge elegido, preview/audit/recovery | Core/Spaces + dueño de alta | U01/U02/U02F | Alta idempotente sin alta comercial/Finance extra; dos Spaces posibles sin selector arbitrario |
| U04 | Readers operativos/cachés/portal que conservan scope end-to-end | Delivery, Account360, client portal, API/MCP | U01 y contratos U03 | Lista/detalle/export sólo población autorizada; caché separada del consolidado |
| U05 | Vínculo Proyecto→Servicio e historia/ICO/capacidad reconciliados | Delivery/ICO/service attribution | U02/U04 | Conservación de filas e IDs; unresolved explícitos; Design history intacta y sin FTE duplicado |
| U06 | Asignación URL/fuentes y proyección AEO canónica | Growth GA4/GSC/SEO/AI Visibility | U00 y contexto U01 | Tres fuentes válidas, host/panel correctos, períodos y cobertura declarados |
| U07 | Report/edición/recurrencia/distribución por cuenta y servicio | Insights + contracts/stores/commands/adapters | U01/U04/U06; U05 si incluye ICO | Pinning, idempotency, source gates, audiencia y autorización por cuenta |
| U08 | Primera preview completa y validación sintética de dos cuentas | QA + dueños de cada capítulo | U01–U07 según superficie | Matriz de amenazas y reconciliación; modelo web local separado de share público |
| U09 | Configurar SKY por plan aprobado y abrir capacidad por capacidad | Operación + Release | Gates anteriores + fuentes SKY verificadas | Antes/después, checks de Diseño, autoridad y datos reales; no sólo deploy READY |
| U10 | Operación duradera, observabilidad y recuperación | Workers + dueños de datos | U09 | Sync estable, alertas por cuenta, fallos reintentables sin duplicar ni ampliar scope |

U06 puede desarrollar el filtro/proyección con fixtures y previews sin crear el segundo Space en producción. U09
no se adelanta para hacer que los datos parezcan listos. U04/U05 son capacidades separables: abrir un informe
autenticado con evidencia correcta no habilita automáticamente todo el cockpit de equipo, finanzas o delivery.
U02F es anterior al provisioning/rebind y no depende de U03/U04; evita un ciclo y protege el materializador desde
el primer evento. U05 conserva la clasificación/reconciliación histórica posterior, no sustituye esa barrera previa.

### Conciliación con backlog existente

| Artefacto | Relación | Ajuste a resolver al formalizar |
| --- | --- | --- |
| TASK-1852 | Habilitación de servicios por organización | Introducir la dimensión operativa sin conceder la unión de módulos a ambos departamentos |
| TASK-1853 / TASK-1854 | Métricas/progreso y experiencia por Servicio | Consumir el mismo mapping y contexto, no crear lógica paralela de cuenta |
| TASK-1855 / TASK-1856 | Solicitudes/briefs | Persistir target de cuenta/servicio y autorización por acción |
| TASK-1857 | Creative Hub SKY | Preservar Diseño e historia; no usar el onboarding de SEO para rehacerlo |
| TASK-1849 | Biblioteca/builder/visor Insights | Filtrar todos los recorridos por contexto autorizado, no sólo la portada |
| TASK-1960 | Informe por Servicio | Proyecto→Servicio real, contexto operativo, report/schedule binding y recipient scope |
| TASK-2033 | Alcance de contenido | Extender host sin perder compatibilidad; asignarlo al servicio Blog, no como default de toda SKY |
| TASK-1655 | Historia GSC | Captura/lectura/cobertura históricas necesarias para el período comprometido |
| TASK-1992 | Hechos SEO nuevos | Heredar receipt y scope de la cuenta; no reintroducir estimaciones del dominio completo |

No se cambian lifecycle, acceptance checks o prioridad de esas tasks por esta tabla. La historia del backlog no
acredita estado runtime actual. No iniciar una mega-task que mezcle todo ni reservar IDs sin revisar el registry.

## 5. Plan de transición y puntos de parada

### T0 — Actual y congelación de evidencia

SKY sigue con un Space compartido. Conservar inventario y hashes de IDs, mappings, fuentes, snapshots/cierres,
asignaciones y documentos. El receipt del discovery es baseline técnico, no aprobación de reclasificar datos.

**No insertar todavía el segundo Space, ni siquiera inactivo:** hay resolvers que no filtran `active`. Una fila
inactiva también puede alterar un `LIMIT 1`. El segundo Space no es una flag segura frente a código legacy.

### T1 — Expandir contratos y actualizar writers/readers sin crear la cuenta

Migrations aditivas antes del código que las necesite; formatos nuevos rechazados por los lectores incompatibles
cuando proceda. Desplegar piso de versión en Vercel, workers y robots pertinentes antes de activar datos nuevos.
No usar el deploy como sustituto de probar el comportamiento. Clientes de un solo Space conservan su recorrido.

El piso incluye U02F y los materializadores reactivos antes de cualquier rebind de Servicio: el evento del cambio
puede disparar atribución inmediatamente. No diferir esa compatibilidad a la reconciliación histórica de U05.

Validar U01/U02 contra fixtures sin tocar sujetos reales. Comprobar que cada writer posee el contrato correcto,
incluido el robot Notion→BQ y los consumers de vuelta a PG. No confundir código local de un sibling con su revisión
productiva ni despertar servicios hibernados para completar una lectura ajena a su scope.

### T2 — Preview del alta y mapping de cuenta

El plan canónico debería mostrar al menos:

- Organization y owner comercial/financiero que se preservan.
- Space Diseño y sus IDs/hash sin cambios, estrategia de bridge y Space Blog objetivo.
- Servicio(s) que se vinculan y fuentes DB/data-source explícitas; conflicto si un origen ya tiene otro owner.
- Memberships/roles requeridos como propuestas; no usuarios inventados ni grants por email/domain.
- Requirement de tres fuentes y qué datos faltan por período; ningún run/backfill iniciado automáticamente.
- Operaciones, expected versions, digest del plan, dependencias, stop conditions y compensaciones.

El plan no inicia una sincronización, no publica un Space ni reasigna historia por generarse. La revisión humana
se hace sobre este resultado concreto cuando se vaya a ejecutar la unidad correspondiente.

### T3 — Provisioning controlado, sin apertura del portal por inferencia

Tras piso de código y aprobación del plan, crear la cuenta y su routing por command canónico. Mantener fuentes
externas y capacidades sin abrir hasta verificar sus gates. La transacción/ledger registra lo hecho; compensación
con expected version impide deshacer una edición posterior de otro operador.

No copiar las mismas DBs Notion a dos Spaces si el runtime hace upsert por `notion_project_id` y podría mover la
historia. Si se comparte un origen se necesita un contrato explícito de partición/owner, no duplicar el binding.

### T4 — Shadow reads y reconciliación

Comparar Diseño antes/después por IDs y períodos, sin reescribir snapshots. SEO sólo recibe evidencia con scope
demostrado. Comprobar cero trabajo ajeno en la cuenta y residuales visibles; un informe vacío no se normaliza a cero.
Si un reader aún es client-only y la estrategia B comparte client, mantener esa superficie cerrada a SEO.

### T5 — Apertura por capacidad y personas autorizadas

Probar una persona de Diseño, una de SEO, una con ambas y un actor sin relación, preferentemente con fixtures
sintéticos para negativos. La verificación con stakeholders reales es posterior y autorizada. Abrir capacidades
que hayan pasado, conservando la experiencia de Diseño. No ampliar rol de un contacto existente para conseguir
que aparezca la nueva cuenta; añadir membresía/contexto con authority checks.

### T6 — Automatización y operación

Activar fuentes, recurrencias y entregas sólo en su unidad y secuencia autorizadas. Schedules revalidan actor y
contexto; envío revalida antes de dispatch; aceptado/ambiguo/delivered son estados distintos. Reintentos no crean
cuentas, ediciones, facturas o correos duplicados. Cada fuente expone estado y owner por cuenta.

## 6. Rollback

Un rollback seguro no significa juntar los permisos o datos de nuevo:

- Cerrar la capacidad nueva afectada y preservar Diseño; no devolver a SEO el consolidado para evitar un error.
- Conservar IDs y registros auditados. No borrar Organization/Space/versiones/snapshots/cierres para volver atrás.
- Si se revierte routing o source binding, usar expected version y verificar que nadie lo cambió después del plan.
- No mover proyectos como compensación ciega de un sync que ya hizo upsert: usar ledger de ownership y reconciliar.
- No hacer `clear` de alcance para que el código viejo lea todo el dominio.
- Un bridge hijo con datos no se borra para encajar en el command comercial viejo. Se pausa/cierra con trazabilidad
  y se conserva el owner financiero; recuperar disponibilidad requiere un código compatible y comprobado.
- Tras introducir nuevos bindings, no volver a writers/robots previos de Services, Notion o PG que los ignoren.
  Cerrar la UI o marcar SEO inactivo no los detiene. Mantener el piso compatible o comprobar una pausa acotada
  de esos writers que preserve Diseño; no restablecer disponibilidad aparente con un resolver ambiguo.
- Un envío ya aceptado no se retira retroactivamente. Resolver el ledger ambiguo antes de cualquier reintento.

## 7. Matriz integral de aceptación

| ID | Escenario | Evidencia requerida |
| --- | --- | --- |
| A01 | Una Organization, dos cuentas, una persona con ambas | Identidad no duplicada y contexto autorizado por request |
| A02 | Intentar crear el segundo Space mientras existe writer ambiguo | Preflight bloquea; no asumir inactivo seguro |
| A03 | Repetir alta/plan con la misma key | Misma cuenta/bridge; sin otro perfil Finance ni nuevas fuentes duplicadas |
| A04 | Repetir webhook/sweep/backfill | Mismo binding de Servicio→Space; no vuelve a juntarlos |
| A05 | Conectar fuente ya vinculada a Diseño | Conflicto explícito o partición aprobada; no reatribución silenciosa |
| A06 | Persona SEO pide recurso de Diseño por API directa | Denegación sin datos ni identificadores ajenos |
| A07 | Refresh de sesión con otra pestaña activa | Cada request mantiene su cuenta y no rebota a un Space arbitrario |
| A08 | Cambiar role/membership durante un intent de envío | Dispatch respeta autoridad vigente y ledger sin reenvío ciego |
| A09 | Misma key/reportTitle desde otra cuenta | No devuelve ni modifica la edición de la primera |
| A10 | Diseño antes/después por período | IDs, snapshots y población conservados; diferencias explicadas |
| A11 | Tarea sin proyecto o servicio desconocido | Unresolved, no Diseño/SEO por defecto |
| A12 | `module_id` recibe un serviceId comercial | Validación/constraint lo rechaza; se usa el vínculo correcto |
| A13 | Misma persona trabaja en dos cuentas | Asignación/vigencia correctas; no duplicar su FTE/costo base |
| A14 | Consolidado con bridges A' | Un owner comercial; filas financieras no duplicadas por aliases |
| A15 | Medianas por cuenta distintas | No llamar mediana exacta a media ponderada de medianas |
| A16 | Caché calentada con consolidado y luego cuenta | Cada respuesta conserva scope, permiso y fecha correctos |
| A17 | Fecha CRM distinta de inicio de prestación | Baseline y atribución no se inventan a partir del primer timestamp |
| A18 | Falta GA4, GSC o motor AEO real | No cumple el informe solicitado, aunque haya hechos de otros productores |
| A19 | Grader con cero citas blog | Cero válido con panel/cobertura, no ausencia ni resultado omitido |
| A20 | Panel AEO o fuente GSC de comparación diferentes | Límite explícito; no delta falsamente comparable |
| A21 | Perfil/run se actualiza tras sellar | Edición histórica conserva sus hechos y método |
| A22 | Link bearer copiado a otra persona | No declararlo autenticación departamental; policy/TTL/revocación correctas |
| A23 | Desactivar SEO | Diseño, Organization y finanzas siguen operativos; recurrencias SEO pausadas |
| A24 | Rollback con cambios humanos posteriores | CAS/version detiene compensación destructiva y deja conflicto observable |

## 8. Readiness y evidencia pendiente

El discovery identifica los seams y propone el orden. **No equivale a build-ready o launch-ready** sin aceptar
D02 y los contratos de routing/autoridad/atribución, formalizar las unidades y pasar sus verificaciones.

Probes siguientes de bajo alcance: demostrar A' sin duplicación financiera ni lifecycle comercial en un fixture;
demostrar activeSpace/multi-tab sin nuevas identidades; replay de servicio/fuente con dos Spaces; proyección AEO
URL con denominador del panel; lectura GA4 de población acordada; y reconciliación por período de Diseño.
Son trabajo a ejecutar en las unidades autorizadas, no resultados ya observados aquí.

No se fijan fechas, costos ni duración sin medición. El mapa de backlog no habilita implementación de una TASK
nombrada sin el preflight que exige el repositorio. No hay cambios de configuración, datos o runtime en este plan.
