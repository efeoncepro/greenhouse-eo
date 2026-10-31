# Decisiones, unidades de entrega y verificación

Fecha: 2026-10-27. Estado: **propuesta de implementación derivada de discovery**, no contrato aceptado ni ejecución.
Dueños propuestos: Growth/SEO para alcance y readers; Insights para binding, edición y representación;
Platform/Release para promoción coordinada. Las asignaciones son responsabilidades técnicas, no compromisos
de personas ni fechas de entrega.

**Corrección de alcance del operador, 27-10:** GA4, GSC y corridas del motor AEO propio son obligatorios desde
el primer informe. Se sustituye la recomendación anterior de primer corte sólo SEO/GSC. Las limitaciones de una
métrica se documentan; la ausencia de una de estas tres fuentes no se acepta como entrega completa.

**Contexto operativo posterior del operador:** Diseño y SEO deben funcionar como dos cuentas con stakeholders
distintos. Ver [anexo 06](06-operating-accounts-under-one-organization.md). Filtrar URLs sigue siendo una capacidad
acotada, pero abrir dos cuentas de cliente aisladas requiere además Space/Servicio, sync y autorización propios.
No se debe promover la obligación del informe SEO a un default global de todos los informes de SKY.

## 1. Resultado que debe asegurar el diseño

Un informe de SKY para Blog SEO/AEO integra GA4, GSC y el motor AEO propio, limitando las mediciones de páginas
a `blog.skyairline.com` y declarando el panel de preguntas de la corrida AEO. Cada hecho y comparación debe
acreditar el selector y la población que declara; las ausencias se explican. Una sesión con actividad en el blog
puede haber navegado por otros hosts: ese hecho no autoriza llamarla entrada o interacción exclusivamente local.
El dato de toda SKY no puede sustituir la medición porque una consulta no soporta el filtro o un runtime no lo entiende.

Hay tres niveles de entrega que conviene separar:

| Nivel | Qué asegura | Qué necesita | Qué puede quedar para después |
| --- | --- | --- | --- |
| L1: informe del blog con GA4+GSC+motor AEO, período acotado | Tres fuentes verificadas, URL del host y panel/run AEO declarados, evidencia sellada y alcance visible | Contrato host, filtros GA4/GSC, proyección AEO por URL, bindings, guard por fuente y cobertura honesta | Historia mensual completa, ICO, serviceId, automatización y valor monetario |
| L2: informe mensual comparable | Todo L1 y ventanas comparables con controles de cobertura y agregación | Historia disponible y readers dueños capaces de servirla, adquisición/actividad GA4 bien nombradas | Entrega editorial e informes de Diseño |
| L3: informe operativo por servicio | L2 más producción editorial y destinatarios/cadencia propios | TASK-1960: vínculo Servicio↔proyectos, ICO filtrado y reporting por servicio | Evoluciones no solicitadas de catálogo o interfaz |

L1 no debe anunciarse como L2. TASK-1960 completa no es prerrequisito de desarrollar el filtro o una preview interna.
El requisito nuevo de cuentas independientes sí exige su frontera operativa antes de abrir acceso a stakeholders:
un informe correcto por URL no prueba aislamiento de listas, indicadores o portal entre Diseño y SEO.

## 2. Registro de concerns y autoridad

| ID | Pregunta que debe quedar resuelta | Prioridad | Dueño propuesto / aceptación | Evidencia necesaria |
| --- | --- | --- | --- | --- |
| C01 | ¿Puede entrar una URL de reservas o de la web principal? | Crítica | Growth; Julio valida el alcance del servicio | Matriz TS/SQL/GA4 y recibo de primera edición |
| C02 | ¿Una versión vieja ignora el host? | Crítica | Growth + Release | Prueba cruzada binario viejo/formato nuevo; cero hechos ajenos |
| C03 | ¿Un retry cambia la población o rompe idempotencia? | Alta | Insights | Binding inmutable por edición; prueba A→cambio B→retry A |
| C04 | ¿El informe confunde sesiones con actividad y sesiones de entrada? | Alta | Analytics/SEO; liderazgo de cuenta | Consulta agregada de control, semántica y límites registrados |
| C05 | ¿Se comparan meses completos con períodos parciales? | Alta | Growth/SEO | Manifest/controles de cobertura; método temporal explícito |
| C06 | ¿Se mezcla producción de Diseño con Blog? | Alta si incluye ICO | Delivery + Insights | Proyecto→Servicio verificado; hasta entonces GA4/GSC/AEO sin ICO |
| C07 | ¿El lector reconoce qué mide el informe? | Alta | Insights + dirección editorial | A4/deck/web y gate apto para cliente |
| C08 | ¿Se conserva Berel y se facilita la extracción futura? | Alta | Growth/Architecture | Fixtures legacy, contratos dueños y ausencia de nuevo SQL cruzado |
| C09 | ¿Qué puede operar un agente y con qué autoridad? | Alta | API/MCP/Insights | Reader/command canónico; auth de organización existente; ninguna URL concede acceso |
| C10 | ¿El módulo AEO contiene una corrida real del motor o sólo referrals GA4? | Crítica | Motor AEO + Insights | Recibo de run/perfil/panel y proyección canónica de citas del blog; gate independiente de GA4 |

No se requiere un nuevo producto, repositorio, paquete ni servicio. El trabajo nace en el runtime actual, con
contrato puro y readers del dueño, conforme a la dirección de desacople aceptada.

## 3. Decisiones candidatas

Estas decisiones se deben aceptar en el canon antes de materializar cambios estructurales. Este documento
propone su contenido; no las marca Accepted ni reemplaza un ADR.

### D1 — Compatibilidad del alcance URL

**Recomendación:** mantener arrays legacy para alcances de rutas como Berel y usar un envelope de formato nuevo
para host+rutas. El `CHECK` de `rules_json` se amplía de forma controlada; no se reescribe el alcance de Berel.
La versión del formato y el número de versión append-only de la configuración son conceptos distintos.

La razón principal es la coexistencia: el parser que ya implementa TASK-2033 rechaza un objeto; eso hace que no mida
silenciosamente toda la propiedad. No protege binarios anteriores a TASK-2033, que no leen el alcance. En cambio,
una columna host que el código viejo desconoce o un atributo host dentro de cada
regla pueden perderse sin error. El probe independiente confirmó que el parser actual descarta un `host` extra.
La semántica propuesta y las alternativas completas están en el [anexo 01](01-url-scope-contract.md).

Punto de ADR: contrato Growth SEO y persistencia compartida. Mantener lecturas por versión, canonicalización y
digest bajo el dueño Growth; el algoritmo declara formato/host/reglas/etiqueta, orden y encoding, separando versión
de configuración e identidad semántica. El digest prueba identidad, no que el reader aplicó el filtro.
Insights transporta referencia y recibo, no calcula otra clasificación. No se añaden fetch/DNS ni autoridad por host.

### D2 — Binding estable de la edición

**Recomendación para L1:** resolver y persistir una referencia de alcance propiedad del servidor al aceptar la
edición, con versión exacta, organización y digest; todas las fases posteriores consumen ese binding. Mantener
`request_hash` como identidad de la intención validada del caller, sin incorporar una lectura mutable de `latest`
antes del lookup idempotente. La forma exacta de persistencia requiere el diseño de migration/records del anexo 03.

Un caller que reintenta la misma key y payload recibe la misma edición y su binding original. Una nueva key puede
adquirir la configuración vigente. `recover` reutiliza el binding. Una revisión debe declarar si preserva el alcance
de la edición anterior o solicita uno nuevo; no se cambia esa semántica en silencio.

Un selector público de versión/requisito obligaría a extender el contrato canónico de request y sus consumidores.
El validador v1 actual descarta campos extra: escribirlos en un payload no crea la capability. No se exige request
v2 sólo para guardar metadata del servidor; sí debe evaluarse una versión nueva al exponer intención nueva al caller.
La metadata no hace compatible un `recover` viejo que la ignore: el piso de versión incluye todas las fases.

Punto de ADR: ciclo de vida y contrato de ediciones. El anexo 03 compara este nivel con la protección persistente
por informe/servicio para impedir futuras omisiones del alcance, sin exigir implementar todo TASK-1960 primero.

### D3 — Error de alcance obligatorio y degradación

**Recomendación:** separar error de una fuente de medición de error del alcance que da identidad al informe.
La fuente caída puede ser un límite según la policy existente. Un alcance requerido ausente, ilegible, de otra
organización o distinto entre fuentes no debe convertirse en una omisión autorizable mediante `allowPartial`.

**Decisión load-bearing pendiente de U0:** dónde se conserva la expectativa de que el Blog exige scope, incluso
cuando `latest` devuelva `null` o una versión vacía. No puede deducirse de «hay scope activo»: precisamente ese dato
es el que podría faltar. Con el requisito adicional de dos cuentas operativas, se prefiere una política del dueño
SEO asignada al Space/Servicio de Blog, independiente de la versión activa y no impuesta a todo SKY. Su storage
y la resolución del scope operativo se deben escoger en U0, conforme al anexo 06.
Alternativas: requisito persistente del report o intención explícita en un contrato de request versionado.
No se afirma que ese registro exista hoy. El command debe impedir un `clear` que deje incumplida la expectativa
sin un cambio explícito y auditado de la política. Esa expectativa tampoco concede autorización al actor.

Hoy `collectInsightEvidence` captura cualquier excepción del adapter y la convierte en `no_data`; por tanto,
fallar en la lectura evita datos amplios, pero no basta para demostrar que la edición no avanzará si se permiten
parciales. El guard nuevo debe operar antes de recolectar y comprobarse antes de congelar/emitir. No basta un catch
con un mensaje distinto ni una regla de copy en la portada.

Para el primer informe: módulos `seo` y `aeo`, `allowPartial=false`, requisito de fuentes `gsc`, `ga4` y `aeo_run`
y ejecución comprobada en runtimes actualizados. Los nombres de ese requisito son propuesta de contrato, no campos
existentes. El flag actual sólo exige hechos por módulo: GA4 puede producir hechos SEO y AEO sin GSC ni corrida.
Por eso hay que añadir el gate por fuente; el encargo no se satisface con una sola fuente poblando ambos módulos.
No se exigen todas las métricas posibles: ranking o un score inválido pueden faltar con causa, pero las tres fuentes
deben acreditar una medición válida del período. Cero observado con evidencia no equivale a fuente ausente.

### D4 — Métricas GA4 y calidad de respuesta

**Recomendación:** introducir filtro de host en el reader dueño y hacer explícita la base de medición.
No declarar adquisición de entrada al blog si sólo se acreditó actividad en el host. Conservar metadata de
calidad y consultar un total agregado independiente cuando se publique un total; los desgloses no sustituyen
automáticamente ese control. La solución exacta de adquisición depende de compatibilidad y comprobación real,
no de un nombre de dimensión supuesto. [Anexo 02](02-analytics-and-history.md).

Punto de ADR: cambio del contrato compartido GA4 y semántica de sus hechos. Una nueva integración de export GA4
a BigQuery sería otra capacidad y no forma parte implícita de este discovery.

### D5 — Historia GSC sin duplicar la fuente de verdad

**Recomendación para L2:** historia en BigQuery y servicio por readers dueños con recorte por host, precedencia
de fuente definida y controles de completitud. No volcar meses a PG para eludir la separación OLTP/OLAP.
SKY no tiene historia en BQ en el rango consultado: conectar el reader a la tabla vacía no resuelve el baseline.

No debe prometerse `complete` porque exista una fila por fecha. El materializador y el backfill tienen fallas
parciales posibles; hay que definir evidencia de cierre de día y recuperación. La amplitud de ese trabajo se
adecua al período que se vaya a reportar. Una primera salida parcial, expresamente nombrada como tal, puede
preceder a una plataforma histórica completa. [Anexo 02](02-analytics-and-history.md).

Punto de ADR: evolución del contrato histórico ya dueño de TASK-1655, no creación de una segunda serie en Insights.

### D6 — Corrida AEO y gate de las tres fuentes obligatorias

**Requisito del operador:** el informe aceptado integra GA4, GSC y evidencia del motor AEO propio desde el primer
corte. Referrals de asistentes medidos por GA4 no son una corrida ni satisfacen la fuente `aeo_run`.

**Recomendación:** fijar un `runId` exacto, perfil/snapshot, panel/prompts, mercado, método y corte; leerlos por el
reader dueño con tenant y elegibilidad del blog. Reutilizar corridas existentes cuando permitan una proyección
canónica honesta de citas del blog, preservando el denominador del panel completo. No exigir una nueva corrida
como sustituto automático de adaptar el reader. Un panel editorial dedicado puede mejorar la medición, pero su
creación y ejecución no están autorizadas por esta aclaración ni son un prerequisito demostrado de toda proyección.

El motor ya conserva URLs en evidencia, pero algunas agregaciones juntan el dominio principal y el blog. Hace
falta proyección por URL en Growth AEO, sin recalcular scores en Insights ni etiquetar un score general como score
del blog. El [anexo 05](05-aeo-engine-required.md) documenta qué permiten las corridas existentes y qué falta.

El binding de la edición conserva también el requisito de tres fuentes y sus receipts. La validación debe exigir
una medición válida de cada fuente actual; `allowPartial` no la sustituye. Para la comparación, fijar corridas
compatibles cuando existan; si cambió el panel o no hay corrida comparable, declarar ese delta no disponible en
lugar de reutilizar una corrida futura. No confundir ausencia de citas observada con ausencia de corrida.

Los scores/findings del motor se pueden recomputar con el mismo runId y scoreVersion. El binding debe conservar
también el corte/método/digests pertinentes; el snapshot sella los hechos efectivamente leídos. RunId por sí solo
no acredita inmutabilidad de la proyección antes de sellarla. Un re-score posterior no modifica la edición sellada.

Punto de ADR: selección/proyección de evidencia del motor AEO y source requirements del ciclo de Insights. El
campo de requisito, selector y errores son diseño propuesto; no se asume que existan en el request v1.

## 4. Unidades implementables propuestas

Los códigos U son unidades de este discovery, **no IDs TASK reservados**. Antes de código se formalizan contra el
backlog vigente mediante el planner del repositorio; se decide si ampliar una task o crear una dependiente.

| Unidad | Home y ownership | Entrega concreta | Depende de | Gate de salida |
| --- | --- | --- | --- | --- |
| U0 | Architecture + owners Growth/Insights | Aceptar D1–D4/D6, expectativa requerida independiente de latest, tres fuentes y nivel L1/L2; identificar canon histórico para D5 | Discovery | Ninguna decisión irreversible escondida en implementación |
| U1 | `growth/seo/content-scope/**`, migration Growth y CLI | Formato dual, host-only/host+rutas, reader por versión, digest y preview | D1 | TS/SQL equivalentes; Berel intacto; predecesor TASK-2033 rechaza v2; pre-TASK-2033 es runtime no admisible |
| U2 | `growth/analytics-ga4/**`, readers GSC/cola, selección ranking | Filtros de host y semántica comprobada por fuente; límites honestos | U1 + D4 | Ninguna fuente sustituye el alcance por el sitio completo |
| U2b | `growth/ai-visibility/**`, reader y adapter AEO | Selección exacta de run elegible, proyección canónica por URL del blog y denominadores del panel | U1 + D6 | Motor AEO real incluido; sin score global rebautizado ni referrals como sustituto |
| U3 | Política del dueño SEO + `efeonce-insights/commands`, stores/records y adapters | Expectativa requerida, binding, requisito de tres fuentes, propagación y receipts | U1/U2b + D2/D3/D6 | Null/clear no reactivan fallback; ninguna fuente puede faltar; retries y referencias coherentes |
| U4 | evidence/plan/presentation y consumers de formatos | Host sellado visible; gate cliente lo reconoce sin permitir datos internos | U1/U3 | A4/deck/web describen la misma población, con portadas light/dark |
| U5 | Growth historical readers/backfill/completitud | Períodos necesarios disponibles y reconciliados para L2 | D5; U1 para recorte | Fecha/propiedad/host/cobertura declarados y sin doble conteo |
| U6 | Verificación local y release coordinado | Primera preview GA4/GSC/AEO y luego edición interna; web como modelo/renderer local | U2/U2b/U3/U4; U5 si L2 | Tres fuentes acreditadas por runtime; share público no se infiere de preview |
| U7 | Servicios/Delivery/Insights, TASK-1960 | Producción editorial, informe y recurrencia por Servicio | L1 verificado; vínculo proyecto→servicio | ICO del Blog excluye Diseño y viceversa |

U1–U4, incluida U2b, forman una capacidad conjunta para L1; pueden desarrollarse por seams, pero no se activa el dato host-only
hasta que todos los consumers que generarán ediciones tengan el protocolo compatible. U5 no cambia a medio camino
las definiciones de U1–U4. U7 se mantiene separado para no mezclar un cambio de datos acotado con una reorganización
completa del reporting de entrega.

### Backlog existente a conciliar antes de reservar IDs

- TASK-2033 posee el alcance actual. Conservar su estado real, no tildar MCP ni rollback por este discovery.
- TASK-1655 posee historia GSC; reutilizar su escritor/mirror y declarar el trabajo de completitud/lectura faltante.
- TASK-1960 posee el informe por Servicio y el riesgo de ICO mezclado.
- TASK-1992 posee hechos SEO adicionales; toda incorporación futura hereda el mismo receipt, no filtros propios.
- TASK-1787 es la serie longitudinal de referrals IA; no es necesaria para filtrar una lectura GA4 de una ventana.
- El indicador monetario tiene ADR propio: integrarlo a Insights sería una unidad adicional, no efecto de U1.

## 5. Secuencia de transición y rollback

| Estado | Schema/código/datos | Comportamiento exigido |
| --- | --- | --- |
| T0 actual | Array de rutas; SKY sin scope | No declarar SKY blog-only en GA4 |
| T1 expansión | CHECK admite array legacy o envelope discriminado estricto, preservando PK/FK, append-only y grants SELECT/INSERT; sin configuración v2 activa | Clientes actuales sin cambios; no admitir objetos arbitrarios |
| T2 código compatible | Nuevos readers y guards en Vercel y worker; probes y preview sin activar SKY | Mantener scope legacy y gates existentes; verificar todos los generadores |
| T3 dato acotado | Command canónico fija v2 de SKY con motivo, actor y preview | Nuevo SEO SKY con host exacto y binding; reader predecesor TASK-2033 rechaza; binarios pre-TASK-2033 excluidos |
| T4 evidencia | Preview y edición interna autorizada verificadas; outputs por flujo normal | Inspeccionar receipt, cobertura, guard y los tres formatos |
| T5 operación | Emisión humana y, si se decide, nueva recurrencia | Cada ocurrencia fija su binding; no emite ni envía sola |

Rollback seguro prioriza detener la generación/emisión afectada y conservar la configuración restrictiva y los
bindings. **`--clear` no es rollback del filtro: cambia la población al sitio completo.** No debe ejecutarse
para hacer funcionar un binario viejo. El objeto v2 puede quedarse mientras un código que ya implementa TASK-2033
lo rechaza; esto evita ensanchamiento de cifras, pero no es recuperación operativa ni protege binarios pre-TASK-2033.
Rollback de schema sólo se contempla si no hay filas/versiones/bindings dependientes del formato nuevo y el ledger lo permite;
no se eliminan versiones ni snapshots para poder volver atrás.

Para estados mixtos, documentar un piso de runtime para create/generate/recover/validate/issue/schedules y qué pasa
con ediciones ya aceptadas antes del corte. Crear con código nuevo y recuperar con uno que ignore el binding no
es compatible. Re-render de una edición sellada usa su snapshot: no consulta `latest`.

## 6. Escenarios de calidad y fitness functions

| ID | Estímulo y entorno | Respuesta verificable | Mecanismo / momento |
| --- | --- | --- | --- |
| Q01 | Misma ruta en blog y www, host malicioso, URL relativa o nula | Sólo entra el host exacto cuya identidad acredita la fuente | Matcher puro + paridad SQL real; cada cambio de contrato |
| Q02 | Binario predecesor que ya lee TASK-2033 encuentra v2 | Rechaza el alcance; no produce hechos amplios; binario pre-TASK-2033 se prueba como negativo no admisible | Compatibilidad y piso en todo el pipeline, no sólo parser |
| Q03 | Config A cambia a B tras aceptar edición, antes de collecting | Edición, comparación y recover siguen A | Test de command/store con cambios intercalados |
| Q04 | Retry misma key/payload después del cambio A→B | Mismo editionId/binding; ninguna segunda edición ni conflicto nuevo | Test idempotency con lookup previo a latest |
| Q05 | Scope requerido ilegible y `allowPartial=true` | No alcanza una edición válida de Blog sin scope | Test orchestration→validating→issue; no sólo adapter |
| Q05b | Expectativa Blog existe pero latest es null/clear, antes del primer binding | Se rechaza crear/generar con fallback amplio; clear exige cambio explícito de política | Prueba de command y persistencia independiente de la configuración activa |
| Q05c | Hay facts SEO y AEO de GA4, pero falta GSC o corrida nativa | No cumple el informe de tres fuentes y no se emite como tal | Gate por fuente; probar cada ausencia separada con allowPartial true/false |
| Q05d | Hay corrida válida con cero citas blog o panel distinto al previo | Cero citas observado se conserva; panel distinto no genera un delta comparable inventado | Proyección canónica AEO, runId/panel/método fijados y prueba de denominadores |
| Q06 | Measures declaran scopes distintos, omiten receipt o usan un filtro distinto al declarado | Se rechaza antes de congelar/emitir; referencias llevan población propia, no se hacen pasar por measures | Receipt + procedencia por hecho + pruebas reales de filtro |
| Q07 | GA4 sólo acredita actividad y presenta desgloses no aditivos | Texto correcto; total independiente o ausencia/limitación explícita | Control Data API y metadata; primera ventana + cambios de query |
| Q08 | Día GSC parcialmente materializado o sólo presente en BQ | No declara cobertura completa ni duplica con PG | Fixtures de fallo por página y selección de fuente por fecha |
| Q09 | Host válido aparece en metodología; aparece nombre de tabla al lado | Acepta el host público sellado y sigue rechazando el identificador interno | Gate cliente con fronteras de token; todo output |
| Q10 | Se re-renderiza snapshot antiguo o Berel legacy | Mismas cifras, población y hashes existentes; hechos nuevos con host/procedencia pueden tener hash nuevo | Fixtures históricos; no rehash de snapshots sellados |
| Q11 | Fuente no puede medir URL del blog | Ausencia con razón; nunca cifra del dominio como reemplazo | Adapter/query contract y plan visible |
| Q12 | Crece el número de filas GSC del período | Clasificación una vez por página y trabajo acotado al período | EXPLAIN/benchmark antes/después, sin predicado regex por fila |

Objetivo de aislamiento: **ningún hecho publicado usa el dato amplio como sustituto del selector y población que
declara**; las URL de medición son del host permitido. Consistencia de receipts es necesaria, pero no prueba por
sí sola que se aplicó el filtro. `site_total.*` es referencia property-wide: suprimirla en SKY si resulta redundante
o declarar su población por separado, conservando el contexto legacy de Berel. `engagedSessions` es clasificación
de sesión y no demuestra interacción exclusivamente dentro del blog. Rendimiento: conservar el patrón por página
distinta y medir distribución/planes antes de fijar un
presupuesto numérico de latencia; el tiempo histórico de Berel no es un SLO garantizado de SKY.

## 7. Qué falta validar antes de código y antes de operar

**Antes de código estructural:** escoger y aceptar el protocolo D1, la persistencia de binding D2 y la política
D3, incluida la fuente de expectativa requerida cuando latest no existe; decidir la métrica GA4 y la proyección
de corrida AEO de D6. GA4/GSC/motor AEO ya son obligatorios por instrucción del operador; no es una decisión abierta
si incluirlos. Son decisiones concretas de diseño, no permisos de deploy.

**Antes de L1:** recorte por host GA4/GSC, proyección AEO por URL desde corrida elegible, gate obligatorio por las tres
fuentes, pruebas de coexistencia/recuperación, preview de los tres formatos y configuración canónica de SKY.
GA4 requiere consulta por host, control agregado independiente y semántica/metadata. No se acepta GSC-only ni
un capítulo AEO poblado sólo con visitas IA de GA4. Una fuente faltante mantiene el entregable pendiente.
La verificación web previa a emisión es del modelo/proyección y renderer local. `web` no es output durable de render;
Think público con token necesita audiencia `client` y edición `issued`. Si se exige ese extremo end-to-end, añadir
una fase autorizada o canary sintético client/issued, sin convertir la edición interna en evidencia de share vivo.

**Antes de L2:** llenar sólo el histórico autorizado necesario, confirmar períodos completos y baselines
comparables. No confundir los archivos de auditoría del 15/23-10 con datos que ya consume Insights.

**Antes de L3:** proyectos vinculados al Servicio, métricas ICO filtradas y decisiones de destinatarios/cadencia.
Los envíos y la emisión conservan su autorización y revisión humana propias.

Discovery terminado no equivale a build-ready: los seams y los riesgos están identificados; faltan aceptar las
decisiones y formalizar las unidades que se ejecutarán. El discovery no reserva IDs, ejecuta hooks de tasks,
aplica migrations, configura SKY, llena historia ni produce nuevas ediciones.
