# Greenhouse — Cuentas operativas bajo una Organization

## Status

- Status: `Proposed`
- Date: `2026-10-27`
- Owner: `Core/Spaces + Identity + Services`; Finance valida atribución; Julio decide aceptación y apertura.
- Scope: cuentas operativas, bridge legacy, contexto autorizado, sync, atribución y reporting por servicio.
- Reversibility: `two-way-but-slow` para la transición de datos; `two-way` para el prototipo local.
- Confidence: `medium`; la evidencia local no certifica migración, transacciones ni rollout.
- Validated as of: `2026-10-27`, código del checkout y discovery sellado en `4be89a9d4`; sin nueva conexión productiva.
- Primera unidad: [TASK-2073](../tasks/in-progress/TASK-2073-operational-account-bridge-local-prototype.md).

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

El puente preferido para evaluar es **A′: bridge operativo legacy distinto por Space, con un único owner
comercial/financiero**. B (client compartido con contexto Space en todos los consumers) es la alternativa de
comparación. La preferencia depende de la prueba local y de gates downstream; no autoriza insertar filas reales.

El bridge operativo no representa otra empresa, Company de HubSpot, perfil Finance, factura, pago o persona.
Su representación persistida —campo/relación de owner y rol del bridge— se diseñará en una unidad posterior.
El prototipo usa un mapping en memoria, que **no es schema aprobado**. Si Finance no puede normalizar ese owner
de forma canónica antes del cutover, A′ queda bloqueada; no se acepta duplicar Finance como atajo.

### Contrato propuesto de contexto y ownership

1. El contexto efectivo es Organization + Space y, cuando aplica, Service. El servidor cruza membership vigente,
   capacidades/entitlements y propiedad del recurso. Ni `client_id`, un rol global, el selector de UI ni la
   pertenencia a la Organization conceden por sí solos acceso a otro Space.
2. Una persona puede operar ambos Spaces con un principal y contexto activo persistente. El refresh no vuelve
   a resolver `LIMIT 1`. El consolidado corporativo exige autoridad explícita adicional.
3. HubSpot conserva campos comerciales. Greenhouse resuelve Servicio→Space mediante mapping explícito y vigencia.
   Un sync ambiguo queda pendiente observable; no elige el primer Space ni vuelve a asignar el servicio.
4. Fuente→Space tiene ownership inequívoco y no se copia una fuente de Diseño a SEO. Proyecto→Servicio requiere
   binding propio y vigencia: `module_id` referencia `service_modules`, no `services.service_id`.
5. Finance normaliza bridge→owner comercial **antes** de seleccionar candidatos y pesos. Una factura sin señal
   de servicio se mantiene sin atribuir; no se asigna a Diseño porque SEO cambió de bridge. Consolidación cuenta
   hechos por identidad canónica, conserva correcciones/supersessions y no copia snapshots cerrados.
6. Cachés y readers incluyen Space/Service, período y versión de autoridad cuando corresponda; una revocación
   vuelve a evaluarse antes de servir resultados. El org scope no sustituye la cuenta operativa.
7. Ownership de una edición histórica es inmutable. Un retry busca la clave existente antes de validar el mapping
   actual; aun así exige permiso vigente sobre el Space de esa edición. Un key ajeno produce conflicto/denegación,
   nunca el informe de otro departamento. Un nuevo informe exige mapping vigente.
8. Blog exige GA4 + GSC + corridas del motor AEO. El scope se aplica en cada productor: URL/landing en GA4,
   página en GSC, citas URL en AEO con denominador completo del panel. AI referrals no sustituye corridas AEO.
   Fuentes ausentes o sin cobertura no son cero; `allowPartial` no evita estos requisitos. Un scope borrado/null
   no habilita medición de toda la Organization. Fechas de baseline y prestación se declaran por separado.
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

1. ADR + comparación local A′/B (TASK-2073); aceptación del puente con sus límites.
2. U01 contexto/membership/refresh; U02 routing de servicios/fuentes; **U02F owner Finance y selección de
   candidatos**. Estas foundations preceden a U03, incluso si el nuevo Space se pensara crear inactivo.
3. U03 provisioning hijo idempotente; U04 readers/caches; U05 bindings/historia/ICO/capacidad.
4. U06 GA4/GSC/AEO; U07 informes/recurrencia/distribución; U08 QA sintético; U09 alta autorizada de SKY;
   U10 operación durable. Ver [plan integral](../audits/client-portal/2026-10-27-sky-multi-account-discovery/05-decisions-transition-and-execution-plan.md).

**No hay un rollback seguro que consista sólo en ocultar SEO.** Los writers compatibles deben mantenerse o
pausarse de forma acotada y probada. Restaurar sync antiguo tras el split puede volver a atribuir datos a Diseño.

## Runtime Contract

Este ADR Proposed no cambia runtime. TASK-2073 sólo añade tooling local con fixtures sintéticos, sin importar
stores, cargar `.env`, abrir sockets, usar credenciales ni ejecutar comandos remotos. No modifica `src/`,
schemas, migrations, flags, fuentes reales, historial o configuración de SKY.

Owners existentes que deberán evolucionar por sus unidades, sin duplicarlos en el prototipo:

- `src/lib/tenant/identity-store.ts`, `src/auth.ts`, `src/lib/entitlements/effective-reader.ts` (contexto/acceso).
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
- Los consumers ya son íntegramente Space-aware: reevaluar retirada del bridge A′ en favor de B.
- Cambia ownership de los dominios, el modelo legal/comercial o el mecanismo de grants.
- Antes de cualquier migration/provisioning real: aceptar ADR, validar contrato persistido y obtener evidencia
  de transacciones, concurrencia, recuperación y permiso de rollout en las unidades dueñas.

## Evidencia y límite de aceptación

El resultado reproducible del prototipo se registra en
[TASK-2073: evaluación local](../audits/client-portal/2026-10-27-sky-operational-bridge-prototype/README.md).
Un PASS local permite recomendar el puente; no acepta automáticamente este ADR ni abre la cuenta SEO.
