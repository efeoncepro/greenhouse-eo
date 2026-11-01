# SKY — Revisión profunda en seis frentes

Fecha: 2026-11-01. Estado: **discovery consolidado; implementación e integración pendientes**.
Base de código: `985f84d3c`.
Continúa la [revisión crítica](../2026-11-01-sky-bridge-critical-review.md).

**Dictamen:** mantener una Organization SKY y separar Diseño/Blog SEO mediante Spaces; todavía no elegir
el puente técnico A′/B ni crear el segundo Space real. La medición interna puede avanzar en paralelo.
El problema no se resuelve copiando la configuración de Berel ni duplicando un client: hay contratos comunes
de autoridad, ownership, historia y evidencia que ambas alternativas necesitan.

## Encargo y límites

Revisar la separación de Diseño y Blog SEO/AEO antes de elegir el bridge A′ o B. Seis subagentes con ownership
documental separado, ejecutados en dos tandas por el límite de concurrencia. Sólo investigación local y fuentes
públicas cuando corresponda; sin DB compartida, secretos, provisioning, migraciones, envíos o despliegues.

El agente principal contrasta las conclusiones. Coincidencia entre agentes no sustituye evidencia de código,
prueba o readback; una operación de helper no se declara alcanzable hasta revisar sus callers y gates.

## Preguntas asignadas

| Frente | Pregunta de decisión | Entregable |
| --- | --- | --- |
| Identidad | ¿Puede una persona usar dos cuentas con contexto completo y revocación efectiva? | [01](01-identity-context.md) |
| Commercial/Finance | ¿Dónde vive el owner único y qué writes/readers pueden cambiarlo o dividir cifras? | [02](02-commercial-finance.md) |
| Historia/recovery | ¿Qué ocurre al recalcular períodos previos o revertir el split? | [03](03-history-recovery.md) |
| Sync/fuentes | ¿Quién decide el destino de cada servicio, fuente y proyecto durante replay? | [04](04-sync-sources.md) |
| GA4/GSC | ¿Qué población y cobertura representa cada indicador del Blog? | [05](05-ga4-gsc.md) |
| AEO/Insights | ¿Cómo se preservan panel, fuentes, scope y destinatarios durante todo el ciclo? | [06](06-aeo-insights.md) |

## Regla de evaluación

1. Separar hechos del código actual, escenarios reproducibles, inferencias y evidencia pendiente.
2. Explicitar condiciones de activación y protecciones existentes para cada riesgo.
3. Comparar A′/B con iguales escenarios; no puntuar sólo selectores donde una alternativa ya tiene ventaja.
4. No confundir Organization comercial, Space operativo, Servicio contratado y población URL de medición.
5. Separar desarrollo/validación interna de medición de apertura departamental y distribución externa.
6. Priorizar pruebas sobre commands/readers reales y DB aislada; los PASS del simulador no acreditan esos caminos.

## Dirección que se mantiene

Una Organization representa la relación con SKY. Diseño conserva su Space y sus identidades históricas;
Blog SEO/AEO necesita un Space operativo distinto, con stakeholders, permisos y trabajo propios. Los Servicios
son compromisos dentro de esa operación, no sinónimos de Organization, Space ni propiedad analítica.
Un mismo stakeholder puede tener acceso a ambos departamentos mediante grants distintos, sin duplicar la persona.

El consolidado corporativo conserva utilidad para Efeonce y para quien tenga autoridad explícita. No se deriva
el derecho a ver Diseño por ser parte de SKY SEO. Un owner comercial común tampoco obliga a usar una sola
factura/contrato ni a mezclar el P&L de los servicios: identidad comercial y atribución económica son ejes distintos.

**La elección A′/B continúa pendiente.** No basta contabilizar cuántos `LIMIT 1` se resuelven. A′ requiere un
bridge operativo y owner persistidos que hoy el simulador inventa; B requiere contexto Space en cada consumer
que actualmente sólo entiende client. Los controles comunes pesan más de lo que reflejó la primera comparación.

## Fronteras que deben probarse por separado

| Frontera | Identidad que gobierna | No se puede inferir de |
| --- | --- | --- |
| Comercial | Organization / contraparte / perfil de facturación | Último Space actualizado |
| Operativa | Space + servicio/proyecto y sus vigencias | Company de HubSpot, `clientIds[0]` o un nombre |
| Autoridad | Principal + grant vigente + acción + recurso | Org compartida, selector de UI o rol global |
| Medición | Conexión/propiedad + población URL + método + ventana | Space, presencia de algún fact SEO o respuesta API exitosa |
| Historia | Propiedad registrada + versión publicada + correcciones explícitas | Mapping/active actuales al recalcular |
| Distribución | Edición concreta + destinatarios/canal autorizados + estado de entrega | Audiencia `client`, token compartible o membership del creador |

Dos pestañas son un caso normal, no un edge case: un formulario de Diseño no puede pasar a SEO porque otra
pestaña cambió el contexto preferido. El target por request se valida en servidor y se compara con el propietario
del recurso. Un cambio de contexto nunca transforma silenciosamente la intención de un write anterior.

## Correcciones verificadas respecto del primer análisis

1. **Sesión:** el SQL actual contiene selección LATERAL ordenada; no afirmar siempre duplicación de filas.
   Sigue habiendo elección implícita por `updated_at`, no selección autorizada de cuenta.
2. **Membership:** `ensureClientMembership` no tiene callers en `src`; sus limitaciones no prueban un efecto
   en login actual. El flujo de invitación alcanzable sí elige `scope.clientIds[0]`.
3. **Account360:** la caché no elude la autorización de facets; ésta ocurre antes. El fallo concreto es la
   rama cliente same-org no executive que cae en permisos internos, además del agregado org no departamental.
4. **Historia:** ICO ordinario reutiliza snapshots locked y su cron procesa el mes actual por defecto.
   Freeze/reconcile explícitos sí fuerzan reemplazo; atribución PG sí es atómica, pero usa mappings actuales.
5. **Ediciones:** el sello Insights tiene defensa real de store y trigger. No equivale a impedir acceso
   cruzado entre departamentos de la misma org ni a preservar hechos upstream recalculables.
6. **Finance:** editar campos fiscales de un perfil con `clientId` existente conserva ese client en el PUT;
   no activa por sí solo el fallback de último Space. La condición del fallback y el resolver de contexto
   deben probarse, sin afirmar que cualquier edición reancla el perfil. Cadena contrastada por el principal:
   `src/app/api/finance/clients/[id]/route.ts:933–977` → `postgres-store-slice2.ts:1189–1204`.
7. **Notion:** ya existe un writer PG programado posterior al conformed, además del script manual. Ambos
   sobrescriben ownership por ID de objeto; reparar únicamente el script no cubre el camino operativo.
8. **Services:** cron/manual e intake reactivo no comparten la misma resolución de Space. El adapter del
   primero además omite stage y pasa client ID como Company; bajo ejecución exitosa puede desactivar el
   servicio. Es un defecto adicional a la ambigüedad del split, no evidencia de que haya sucedido en SKY.
9. **AEO:** no todos los KPIs usan la misma normalización de dominio. El breakdown agrupa raíz y Blog;
   citation share tiene otra semántica. La corrida sí se busca dentro de ventana y hay controles de readiness.
10. **Recurrencia/entrega:** schedule revalida autoridad y nunca emite/envía automáticamente. Delivery tiene
    ledger y reconciliación de resultados ambiguos; lo ausente es autoridad departamental, no toda defensa.

## Qué cambia realmente la decisión

| Frente | Hallazgo determinante | Implicación |
| --- | --- | --- |
| Identidad | Mismo org sigue dando acceso org-scoped; contexto elegido implícitamente y roles globales | A′ no elimina la necesidad de grants/contexto por request; B tampoco |
| Finance | El perfil existente tiene protección; A′ añade semántica operativa a `clients`, objeto comercial actual | Comparar costo de owner/consumers de A′ contra propagación Space de B, sin asumir que A′ es menor |
| Historia | ICO locked ordinario se conserva, freeze lo reemplaza; atribución reconstruye mes global con mappings actuales | Preservar propiedad registrada y versiones; probar también otra org, meses cerrados y fallos |
| Sync | Múltiples resolvers y writers pueden reemplazar dueño pese a identidad estable | Binding explícito compartido, rechazo de conflictos y replay antes del alta, incluso inactiva |
| GA4/GSC | Scope Berel no distingue host; coverage puede ocultar parcialidad o vacío incierto | Scope v2 y recibos/calidad por productor; no ajustar sólo portada/filtro de UI |
| AEO/Insights | GA4 AI o facts comparativos satisfacen presencia de módulo; request/report/schedule/delivery son org-scoped | Tríada obligatoria por ventana y ownership durable; filtrado URL no sustituye separación de stakeholders |

**El caso más directo contra el informe actual:** sin corrida nativa AEO del periodo, puede existir un fact de
GA4 AI referrals con módulo AEO; el gate deja de considerar ese módulo vacío incluso con `allowPartial=false`.
Además ese reader GA4 se llama sin `landingMatch`. La revisión humana y la emisión explícita siguen existiendo,
pero no convierten esa validación en garantía de GA4 + GSC + AEO nativo exclusivo del Blog.

La idempotencia también debe incluir la intención completa: hoy `input.reportId` no forma parte del hash de
request. Misma key/request y otro reportId de SKY puede devolver la edición previa. El contrato departamental
debe rechazar ese cambio o devolver sólo lo existente con autoridad vigente sobre su propietario original.

## Verificación del agente principal

Se contrastaron directamente cadenas de auth/Account360, PUT Finance, Services cron/manual y su mapper,
writer programado Notion, locks ICO, reemplazo transaccional de atribución y gate de generación Insights.
Se repitieron de forma independiente dos reproducciones sobre funciones reales TypeScript, transpiladas en
memoria y ejecutadas en VM sin imports de red/DB; sólo `server-only` se sustituyó por un stub vacío.

| Reproducción | Resultado observado |
| --- | --- |
| Account360 manager cliente, misma org; solicita identity/spaces/crm/aeo/finance | Permite identity/spaces/crm/aeo; Finance sigue denegado |
| Mismo caso, executive | Permite identity/spaces; no CRM/AEO |
| Manager cliente de otra org | Sólo identity |
| Scope exact `/viajar`, URL en blog / www / other.invalid | Las tres entran: el matcher sólo compara path |
| Prefijo raíz `/`; scope vacío | Raíz rechazada; vacío desactiva scope |

Estas pruebas caracterizan defectos/límites de código; no equivalen a prueba HTTP con sesión real ni a incidente
productivo. Las matrices DB/HTTP/proveedor de los informes siguen propuestas. No se volvió a ejecutar el
simulador de 97 tests: no cambió su código y sus resultados anteriores no certifican estas integraciones.

## Orden propuesto para avanzar

No crear todavía otro Space/client de SKY. Tampoco bloquear todo el trabajo analítico esperando la decisión
del bridge. Preparar dos carriles locales con contratos compartidos y entregables verificables:

### A. Medición interna del Blog

1. Versionar el alcance con host explícito y semántica por fuente; conservar el comportamiento de Berel.
   Reglas vacías o scope eliminado no autorizan sitio completo cuando el encargo exige Blog.
2. Definir adquisición frente a actividad GA4, preservar metadata y comprobar host de entrada. Reutilizar
   controles GSC existentes sin query y detalle observado; registrar extracciones completas, parciales y vacías.
3. Proyectar citas del motor AEO sobre URLs Blog con panel/denominadores y desconocidos explícitos.
4. Validar requisitos separados para GA4, GSC y AEO nativo en la ventana actual. Preview interna puede mostrar
   faltantes; no etiquetarla como informe completo ni autorizar distribución por ese hecho.

Owners existentes: TASK-2033 (scope), productores Growth/SEO/AEO y TASK-1960 (informe por Servicio).
TASK-1992/1655 conservan facts/historia donde corresponda. No crear un nuevo extractor ad hoc dentro de Insights.

### B. Comparación del puente sobre componentes reales

1. Fixture aislado común: una Organization, Diseño histórico, SEO nuevo, dos Services, usuario con ambos grants,
   usuarios departamentales, otra Organization de control, meses antes/después del corte y fuentes sintéticas.
2. Cargar contratos/vistas/commands/readers reales con PG efímero sin acceso a credenciales externas.
   Para BQ y proveedores, aislar adaptadores e inyectar fallos: esas pruebas no certifican motores remotos.
3. Caracterizar primero el comportamiento actual, incluidas protecciones; aplicar candidatos A′ y B con las
   mismas intenciones y datos. No resolver selectores del candidato preferido mediante mocks especiales.
4. Medir la superficie real a modificar y probar permisos, grants, sesión, writes, sync, Finance, historia,
   jobs y rollback. Guardar resultados por caso/alternativa; no inferir costo total de dos cardinalidades.
5. Elegir y aceptar el bridge sólo con esos resultados. El paso posterior de configuración/apertura real
   sigue siendo una operación distinta de la prueba local y requiere su autorización y verificación.

Identidad/Servicios/Finance/Delivery poseen estas foundations; TASK-1852 y 1853/1854 conservan acceso y
read models/portal. No reabrir TASK-2073: quedó completo como simulador, no como implementación del split.

## Matriz común de salida antes de apertura departamental

| Familia | Evidencia mínima exigible | Rechazo explícito |
| --- | --- | --- |
| Identidad | Mismo usuario con dos grants; selección/refresh/revocación; dos pestañas | Otro Space/org, grant vencido, recurso y target inconsistentes |
| Lectura/export | API, portal, biblioteca, outputs y cachés en ambos órdenes | Org compartida no concede consolidado ni informes del otro departamento |
| Comercial/Finance | Owner único; contratos/documentos intactos; costos y revenue por servicio; consolidado sin duplicados | Resolver a último Space o normalizar owner borrando atribución operativa |
| Services/Notion | Todos los triggers conservan bindings; replay y duplicados controlados | Company→primer Space, misma fuente con dos dueños, cambio incidental de ownership |
| Historia | Periodos anteriores iguales; inactivación, recálculo y fallos probados | Sobrescritura de versión publicada o historia oculta por estado actual |
| GA4/GSC | Host/población, calendario, batch, calidad y cobertura verificables | Respuesta vacía/restringida como cero; extracción parcial como completa |
| AEO | Run nativo en ventana, panel compatible, citas exactas y desconocidos diferenciados | Referral GA4 o mención de marca como sustituto de cita Blog |
| Edición/recurrencia | Contexto y request sellados; idempotencia conserva edición; autoridad vigente | Retry que reubica edición antigua por mapping actual |
| Distribución | Destinatarios autorizados por cuenta; política de enlaces y reconciliación de envíos | Compartir por org únicamente o reenviar tras resultado ambiguo sin reconciliar |
| Recuperación | Fallos por frontera y control de otra org/mes; restauración de versión comprobada | “Ocultar SEO” o revertir Git como recuperación de datos |

Los defectos actuales de Account360/cookie y la divergencia del adapter Services ameritan unidades correctivas
separadas, con reproducción y regresión, sin esperar la elección A′/B. Esta auditoría los identifica; no los
da por corregidos ni confirma un incidente en producción.

## Evidencia pendiente y alcance honesto del cierre

Los seis informes incluyen **59 escenarios de integración propuestos** (10/9/10/10/10/10), no 59 tests pasados.
Hay reproducciones puras de autorización, matcher de scope y reducers AEO; las dos primeras fueron repetidas
independientemente por el principal. No se ejecutaron handlers HTTP, DB, pipelines reales ni corridas de SKY.

Queda por demostrar antes de elegir/cortar:

- Inventario completo de consumers comerciales: contratos, líneas, cotizaciones, pagos, exportaciones y
  consolidadores; constraints instaladas y efectos de concurrencia. El frente Finance delimitó estos vacíos.
- Semántica efectiva de host de entrada GA4 y disponibilidad de la señal en la propiedad; stubs no la prueban.
- Estado actual de conexiones, flags, schema desplegado, grants, snapshots y cobertura de noviembre. Los
  expedientes fechados de octubre no se presentaron como mediciones actuales.
- Política explícita de links transferibles frente a acceso autenticado, autorización durable del intent de
  entrega, revocación concurrente y punto irreversible del transporte.
- Igualdad histórica y rollback sobre implementaciones reales, no sobre arrays inertes del simulador.

No se estimaron plazos: sin inventario y prueba integrada, un número sería especulativo. El siguiente incremento
concreto es cerrar los contratos y ejecutar la matriz local sobre componentes reales, con medición Blog y
fundaciones comunes en paralelo. Este discovery no cambia runtime, no acepta el ADR y no abre acceso al cliente.

Documentación técnica: ADR Proposed y este expediente. No se agregó manual de operación ni documentación de
una funcionalidad entregada porque ninguna capacidad nueva está implementada; deberán acompañar su unidad futura.

### Verificación documental

- Cierre documental estricto focal: 12 archivos propios/continuidad, **0 warnings**.
- `git diff --check`: PASS.
- Gate global `check-context-handoff.mjs --strict`: **no pasa**, sin errores y con dos warnings de baseline:
  `project_context.md` ~12035 tokens frente a 12000; Handoff 22 sesiones frente a 20. Se comprobó que HEAD ya
  tiene 22 sesiones y que project_context no fue modificado. No se rotó historia compartida para cerrar este audit.
- Sin commit, push, deploy, correcciones de runtime ni alta de SKY en esta revisión.
