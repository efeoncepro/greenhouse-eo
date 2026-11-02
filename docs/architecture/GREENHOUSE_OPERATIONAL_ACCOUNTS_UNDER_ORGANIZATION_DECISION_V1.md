# Greenhouse — Cuentas operativas bajo una Organization

## Status

- Status: `Proposed`
- Date: `2026-10-27`
- Owner: `Core/Spaces + Identity + Services`; Finance valida atribución; Julio decide aceptación y apertura.
- Scope: cuentas operativas, bridge legacy, contexto autorizado, sync, atribución y reporting por servicio.
- Reversibility: `two-way-but-slow` para la transición de datos; `two-way` para el prototipo local.
- Confidence: `medium`; B recomendado con evidencia local de permisos/Finance/routing/historia; integración y rollout pendientes.
- Validated as of: `2026-11-01`, componentes reales en PostgreSQL efímero (TASK-2094); sin conexión productiva.
- Primera unidad: [TASK-2073](../tasks/complete/TASK-2073-operational-account-bridge-local-prototype.md).

## Revisión inicial 2026-11-01 — Recomendación A′ suspendida

La [revisión crítica con tres subagentes](../audits/client-portal/2026-11-01-sky-bridge-critical-review.md), ampliada
por la [revisión profunda de seis frentes](../audits/client-portal/2026-11-01-sky-deep-review/README.md),
suspende la recomendación de aceptar A′. Las 97 pruebas del modelo siguen pasando, pero no ejercitan grants,
refresh, perfiles/P&L financieros o rematerialización histórica reales. A′ y B requieren comparación con DB
local aislada y commands/readers reales. El modelo Organization→Spaces se mantiene como dirección; bridge y
schema siguen pendientes. La medición/preview interna del Blog puede desarrollarse sin esperar al alta del
segundo Space; la apertura departamental exige aislamiento completo. No hay autorización de provisioning.

## Incremento local TASK-2094

[Contrato candidato Blog](EFEONCE_INSIGHTS_BLOG_MEASUREMENT_CONTRACT_V1.md) y
[evaluación con componentes reales](../audits/client-portal/2026-11-01-sky-real-component-validation/README.md):
89 pruebas pasan, 27 sobre PG16 efímero. A′ conserva selectividad por client pero requiere provisioning operativo
sin duplicación comercial; B revela default de sesión dependiente de metadata. Ambos reproducen revocación
insuficiente, replay de owner Services y alcance org de Account360. Snapshot sellado y rollback local sí probados.
No es una implementación completa de ninguno de los bridges. Decisión sigue pendiente de contexto/grants,
refresh, P&L, ICO histórico, sincronización y entrega reales sobre fixtures; sin mutaciones de producción.

## Incremento local de autoridad — 2026-11-01

[Pruebas de permisos/contexto](../audits/client-portal/2026-11-01-sky-space-context-validation/README.md):
78 nuevas, total 167 PASS. El recurso real de Insights mezcla reports departamentales bajo la Organization
con A′ y B; el parámetro Space no basta. Callbacks cookie y sesiones App difieren al desactivar usuario.
Contexto experimental, principal fresco, grant por Space/verbo y binding Service/report permiten el mismo
comportamiento seguro bajo ambos bridges, incluida revocación SEO que conserva Diseño del usuario dual.
A′ no obtiene ventaja de autorización por separar client_id. El contrato requerido es común; la decisión del
bridge depende ahora de compatibilidad de readers/writers, owner comercial y preservación histórica. No se
acepta el ADR ni se autoriza provisioning; falta integración HTTP/UI, concurrencia, Finance/ICO y distribución.

## Recomendación actual — B, tras Finance/routing/historia local

[Comparación ejecutada](../audits/client-portal/2026-11-01-sky-finance-routing-validation/README.md):
**204 pruebas PASS**, 37 nuevas. El trigger real de asignación de gastos rechaza A′ cuando el gasto conserva
el owner comercial y el servicio SEO usa otro client. Cambiar el gasto al client hijo permite asignarlo, pero
divide P&L. La atribución de costos laborales también cambia por esa identidad. B conserva el owner actual
y permite asignación explícita al servicio SEO. A′ requeriría normalización aún no implementada en esos puntos.

Se recomienda **B como objetivo técnico**, sin declarar aceptación del ADR ni seguridad productiva. Los
incrementos anteriores son evidencia histórica, no la recomendación vigente. Los riesgos de replay Notion y
reconstrucción de períodos existen en ambos modelos; no justifican otro client. La transacción de atribución
sí revierte una sustitución fallida. ICO fue probado sólo a nivel de llamadas con puerto SQL simulado.
Siguiente: U01 contexto por Space en una ruta/reader real local; después bindings y protección temporal.
No se requiere otra ronda de discovery general para formular esta recomendación.

## Context

SKY tiene una relación histórica de Diseño y suma Blog SEO/AEO con stakeholders distintos. Necesita dos cuentas
operativas y una sola identidad comercial. El [modelo vigente](GREENHOUSE_360_OBJECT_MODEL_V1.md) ya define
Organization como cuenta canónica y Space como hijo operativo. La decisión pendiente es hacer que los consumers
legacy respeten esa relación cuando hay varios Spaces, sin mover ni reinterpretar historia de Diseño.

El [discovery integral](../audits/client-portal/2026-10-27-sky-multi-account-discovery/README.md) encontró selectores
por `client_id`, resoluciones de Space con `LIMIT 1`, sesión por client, cachés por Organization y atribución
financiera que prefiere candidatos por client. El alta comercial existente impide un segundo client y crea su
contexto financiero: no sirve como command de alta de una cuenta operativa hija.

### Preocupaciones y autoridad

| Preocupación | Dueño de implementación | Evidencia exigible |
| --- | --- | --- |
| Stakeholders separados, misma persona sin duplicarla | Identity/Spaces | contexto explícito, denegación cruzada, refresh y revocación |
| Historia y métricas de Diseño intactas | Delivery/ICO/Account360 | snapshot anterior/posterior, sin reasignaciones ni suma de alias |
| Routing estable tras replay de sync | Services/Source Sync | destino explícito, ambigüedad bloqueada, fuentes sin ownership doble |
| Un cliente comercial y financiero | Commercial/Finance | owner normalizado antes de seleccionar candidatos/pesos |
| Informe Blog completo y acotado | Growth/AEO/Insights | GA4, GSC y corrida nativa AEO, scope de URLs y denominadores sellados |

## Decision

Se propone una Organization con varios Spaces. El Space histórico conserva identidad, proyectos, fuentes,
indicadores y ediciones de Diseño. La nueva relación Blog SEO/AEO se aloja en un Space propio. Un Space puede
contener varios Servicios de la misma operación; no se crea una Organization por departamento ni un master Account.

La recomendación técnica actual es **B: client comercial compartido y contexto Space/Service explícito**.
Sustituye la preferencia A′ del simulador del 27-10. Los caminos departamentales deben retirar selección
implícita y aislamiento client-only antes de abrir. Los consolidados comerciales conservan su dueño y
autoridad propios. Recomendación no equivale a aceptación ni autoriza insertar filas reales.

El bridge operativo no representa otra empresa, Company de HubSpot, perfil Finance, factura, pago o persona.
Su representación persistida —campo/relación de owner y rol del bridge— se diseñará en una unidad posterior.
El prototipo usa un mapping en memoria, que **no es schema aprobado**. Si Finance no puede normalizar ese owner
de forma canónica antes del cutover, A′ queda bloqueada; no se acepta duplicar Finance como atajo.

### Contrato propuesto de contexto y ownership

1. El contexto efectivo es Organization + Space y, cuando aplica, Service. El servidor cruza membership vigente,
   capacidades/entitlements y propiedad del recurso. Ni `client_id`, un rol global, el selector de UI ni la
   pertenencia a la Organization conceden por sí solos acceso a otro Space.
2. Una persona puede operar ambos Spaces con un principal. Cada request declara su contexto y el servidor
   lo intersecta con grants vigentes y ownership del recurso. La preferencia de contexto persistida no redirige
   writes de otra pestaña. El refresh no vuelve a resolver `LIMIT 1`; cambiar metadata del Space no cambia
   autoridad ni selección. El consolidado corporativo exige autoridad explícita adicional.
3. HubSpot conserva campos comerciales. Greenhouse resuelve Servicio→Space mediante mapping explícito y vigencia.
   Un sync ambiguo queda pendiente observable; no elige el primer Space ni vuelve a asignar el servicio.
4. Fuente→Space tiene ownership inequívoco y no se copia una fuente de Diseño a SEO. Proyecto→Servicio requiere
   binding propio y vigencia: `module_id` referencia `service_modules`, no `services.service_id`.
5. Finance normaliza bridge→owner comercial **antes** de seleccionar candidatos y pesos. Una factura sin señal
   de servicio se mantiene sin atribuir; no se asigna a Diseño porque SEO cambió de bridge. Consolidación cuenta
   hechos por identidad canónica, conserva correcciones/supersessions y no copia snapshots cerrados. Owner común
   no obliga a una sola factura/contrato ni elimina la atribución por Space/Servicio. Recalcular un periodo previo
   no reinterpreta su propiedad usando mappings o flags `active` actuales; una reclasificación crea revisión explícita.
6. Cachés y readers incluyen Space/Service, período y versión de autoridad cuando corresponda; una revocación
   vuelve a evaluarse antes de servir resultados. El org scope no sustituye la cuenta operativa.
7. Ownership de una edición histórica es inmutable. Un retry busca la clave existente antes de validar el mapping
   actual; aun así exige permiso vigente sobre el Space de esa edición. Un key ajeno produce conflicto/denegación,
   nunca el informe de otro departamento. Un nuevo informe exige mapping vigente.
8. Blog exige GA4 + GSC + corridas del motor AEO. El scope se aplica en cada productor: URL/landing en GA4,
   página en GSC, citas URL en AEO con denominador completo del panel. AI referrals no sustituye corridas AEO.
   Fuentes ausentes o sin cobertura no son cero; `allowPartial` no evita estos requisitos. Un scope borrado/null
   no habilita medición de toda la Organization. Se validan productor, ventana actual, propiedad/conexión,
   scope y calidad por separado: algún fact por módulo, sólo facts comparativos o filas en cada día no certifican
   el encargo. Adquisición y actividad GA4 son indicadores distintos. Fechas de baseline y prestación se declaran
   por separado, sin atribuir causalidad del desempeño histórico al servicio nuevo.
9. Distribución vuelve a validar destinatarios antes de cada envío nuevo. Un bearer share no prueba identidad
   departamental. Un envío aceptado o ambiguo se reconcilia antes de reintentar; la auditoría no reenvía.

## Alternatives Considered

| Alternativa | Beneficio | Costo / motivo para no seleccionarla directamente |
| --- | --- | --- |
| A′: bridge por Space, owner comercial común | Mantiene selectividad de readers legacy client-only | Nuevo command hijo y normalización Finance; no basta crear otra fila `clients` |
| B: client compartido, Space obligatorio | Evita otro bridge legacy | Hay que convertir todos los readers, writers, sesión, caches y robots client-only antes de abrir |
| Dos Organizations / dos Companies | Aprovecha aislamiento organizacional actual | Duplica identidad y desfigura la relación comercial por departamentos |
| Sólo filtros de URL/servicio en Insights | Menor cambio inicial | No separa acceso, operación, fuentes, métricas ni finanzas |
| Mantener todo junto | Ninguna migración | No satisface stakeholders independientes ni aislamiento del servicio |

No se asignan tiempos o puntajes de esfuerzo sin mediciones. A′ y B comparten los gates de contexto, sync y
cachés; A′ reduce un riesgo legacy, no elimina la migración.

## Consequences

La identidad comercial y la continuidad de Diseño se conservan; el modelo sirve a otros clientes con varios
departamentos. El costo es hacer explícito un ownership que hoy se infiere por coincidencia de client u org.
Los consumers no certificados no pueden entrar al cutover. Las relaciones ambiguas quedan pendientes, lo que
puede retrasar apertura, antes que producir indicadores o atribuciones incorrectos.

### Orden de transición

1. Mantener ADR Proposed; TASK-2073 conserva su cierre como simulación. TASK-2094 recomienda B con componentes
   reales aislados. Integrar y certificar los contratos siguientes antes de aceptar/aplicar el puente en runtime.
2. U01 contexto/membership/refresh; U02 routing de servicios/fuentes; **U02F owner Finance y selección de
   candidatos**. Estas foundations preceden a U03, incluso si el nuevo Space se pensara crear inactivo.
3. U03 provisioning hijo idempotente; U04 readers/caches; U05 bindings/historia/ICO/capacidad.
4. U06 GA4/GSC/AEO puede avanzar en paralelo desde el inicio como desarrollo/validación interna, sin otro Space.
   U07 informes/recurrencia/distribución requiere ownership y autoridad completos; U08 QA sintético; U09 alta autorizada de SKY;
   U10 operación durable. Ver [plan integral](../audits/client-portal/2026-10-27-sky-multi-account-discovery/05-decisions-transition-and-execution-plan.md).

**No hay un rollback seguro que consista sólo en ocultar SEO.** Los writers compatibles deben mantenerse o
pausarse de forma acotada y probada. Restaurar sync antiguo tras el split puede volver a atribuir datos a Diseño.

## Runtime Contract

Este ADR Proposed no cambia runtime. TASK-2073 sólo añade tooling local con fixtures sintéticos, sin importar
stores, cargar `.env`, abrir sockets, usar credenciales ni ejecutar comandos remotos. No modifica `src/`,
schemas, migrations, flags, fuentes reales, historial o configuración de SKY.

Owners existentes que deberán evolucionar por sus unidades, sin duplicarlos en el prototipo:

- `src/lib/tenant/identity-store.ts`, `src/lib/auth.ts`, `src/lib/entitlements/effective-reader.ts` (contexto/acceso).
- `src/lib/services/service-sync.ts`, `src/lib/services/upsert-service-from-hubspot.ts` (routing).
- `src/lib/client-lifecycle/commands/provision-client-from-wizard.ts` y
  `src/lib/commercial/party/commands/instantiate-client-for-party.ts` (commands existentes, no reutilizar como alta hija).
- `src/lib/space-notion/space-notion-store.ts`, `src/lib/account-360/facet-cache.ts` (fuentes/cache).
- `src/lib/service-attribution/materialize.ts` (candidatos Finance).
- TASK-1852 conserva habilitación; 1853/1854 métricas/portal; 1960 informe por servicio; 2033 scope de contenido.
  TASK-2073 no implementa sus superficies ni modifica su lifecycle.

## Revisit When

- La prueba no puede garantizar owner comercial único, historia inmutable o rechazo de ambigüedad.
- Se identifica un consumer client-only que mezcla Finance, cuentas o fuentes y no puede normalizarse.
- Aparece evidencia de un consumer que impide B; reevaluar el costo de normalizar A′ con owner canónico.
- Cambia ownership de los dominios, el modelo legal/comercial o el mecanismo de grants.
- Antes de cualquier migration/provisioning real: aceptar ADR, validar contrato persistido y obtener evidencia
  de transacciones, concurrencia, recuperación y permiso de rollout en las unidades dueñas.

## Evidencia y límite de aceptación

El resultado reproducible del prototipo se registra en
[TASK-2073: evaluación local](../audits/client-portal/2026-10-27-sky-operational-bridge-prototype/README.md).
Un PASS local permite recomendar el puente; no acepta automáticamente este ADR ni abre la cuenta SEO.

Resultado 2026-10-27: 97 tests PASS bajo red bloqueada/filesystem restringido, con 68 comprobaciones A′/B y nueve
anchors de código local. Ambas variantes pasan con primitives explícitas; A′ conserva selectividad de los
predicados client-only modelados y exige normalización Finance previa para evitar un falso candidato único de
Diseño. No demuestra transacciones, migración o integración real. Typecheck global baseline agotó heap; lint
global sin errores y 26 warnings existentes. Detalle y recibo reproducible en la evaluación enlazada arriba.
