# Greenhouse Client Service Experience Decision V1

## Status

- Status: `Accepted` — contrato de planificación aprobado; implementación y rollout por tasks
- Date: `2026-09-09`
- Owner: `Client Experience / Platform / Delivery / Growth; Julio Reyes (producto)`
- Scope: `portal cliente, servicios, métricas, solicitudes, Insights, notificaciones/email/Teamsbot y rollout Berel/Sky`
- Reversibility: `two-way-but-slow`
- Confidence: `high` sobre reutilizar el portal; `medium` sobre cobertura de datos por servicio
- Validated as of: `2026-09-09` — código, PostgreSQL compartido y lectura HTTP autenticada de producción; no certificación E2E con sesión cliente.
- Epic: [EPIC-046](../epics/to-do/EPIC-046-client-services-visibility-and-self-service.md).

El operador aprobó la propuesta en esta conversación y añadió Efeonce Insights para autogestión cliente
y gestión interna. Las cinco tasks quedan registradas como TASK-1852–1856 el 2026-09-09. Esta aceptación no declara una
implementación realizada, cambios comerciales ni un rollout habilitado.

## Context

Greenhouse ya tiene un BFF de portal, catálogo/asignaciones de módulos, navegación y guards comunes,
lecturas de proyectos/equipo/revisiones, Analytics de delivery y superficies SEO/AEO. La distancia
entre esas capacidades y una experiencia utilizable tiene tres causas: asignación incompleta,
destinos declarados sin página y resultados que permanecen en la cara interna.

El diagnóstico del 2026-09-09 verificó 14 entradas de catálogo; Berel con `seo_v2` y
`ai_visibility_v1`, Sky con `creative_hub_globe_v1` y `ai_visibility_v1`. Ningún módulo vigente
declara `cliente.analytics` o `cliente.ciclos`. `/creative-hub` y `/brand-intelligence` devolvieron
404 en producción. La cantidad de entradas del catálogo no mide módulos listos ni adopción.

Alcance comercial confirmado por el operador en esta conversación:

| Cuenta | Servicios | Resultado esperado en el portal |
|---|---|---|
| Berel | SEO y marketing de contenidos | Resultados de búsqueda, plan/avance mensual de contenidos, piezas y revisiones pendientes |
| Sky Airlines | Diseño digital | Trabajo solicitado/en curso/entregado, revisiones, puntualidad y calidad del servicio |

Una asignación técnica AEO observada no prueba una contratación adicional. No se retira ni amplía
esa asignación por inferencia; se concilia su propósito dentro del inventario de cada cuenta.

## Decision

### 1. Componer la experiencia desde los servicios y los dominios existentes

El cliente comprende su relación mediante servicios contratados. Los módulos siguen siendo bundles
técnicos de acceso y no se reemplazan por nombres comerciales ni por condiciones hardcoded de cliente.
Un servicio puede requerir varias vistas/módulos y varias fuentes; varias prestaciones pueden compartir
la misma vista. Antes de crear un módulo se busca uno compatible y se declara el mapping servicio →
módulos → vistas → acciones → fuentes. No se asigna a Berel el bundle de Sky sólo porque ambos producen piezas.

Account 360/Commercial conservan servicios, alcance y términos; Delivery/ICO conservan trabajo y
métricas; Growth conserva SEO/AEO. `src/lib/client-portal/` sigue siendo un BFF hoja que compone
DTOs permitidos. No nace un segundo catálogo de contratos, ledger de consumo, motor de métricas o CMS.

### 2. Entregar primero visibilidad útil, después autogestión transaccional

La primera entrega reúne inicio, mis servicios, progreso, métricas y pendientes con enlaces a la
superficie operativa autorizada. El recorrido inicial de feedback puede continuar en la herramienta
dueña; el portal no muestra una aprobación completada sin leer su resultado allí.

La siguiente entrega incorpora solicitudes y briefs con seguimiento. Una solicitud de cambio de
alcance no activa módulos, modifica precios, contrata ni publica automáticamente. Cada acción declara
actor, autoridad, objeto, estado, idempotencia, auditoría y respuesta operativa. El ingreso del pedido
y su aceptación/planificación son hechos distintos.

### 3. Mantener separados acceso, responsabilidad y contratación

- Organización y scopes se resuelven en servidor; el browser no elige una cuenta arbitraria.
- Menú, búsqueda y URL directa usan el primitive vigente de visibilidad por módulo y veto per-persona.
- Cada lectura/acción conserva sus entitlements y scopes de datos; abrir una página no concede writes.
- Ser responsable o contratar un servicio no implica permisos nuevos. No se construye en este programa
  otra infraestructura de operating modes ni se activa la doctrina pendiente de TASK-1663.
- Las tres vistas base existentes no se amplían para saltar un módulo. `/home` conserva su papel de
  destino alcanzable; los bloques especializados mantienen sus propios permisos y redacciones.
- Cambios de catálogo usan versionado/supersesión canónicos. No se edita `modules.view_codes` in-place,
  ni se revoca un bundle completo para resolver uno de sus enlaces rotos.

### 4. Mostrar métricas con fuente y significado

Toda cifra publicada declara cuenta/servicio, período, fuente, fecha de datos, unidad, cobertura y
comparación válida. Ausencia, cero, degradación y falta de contrato son estados distintos.

- SEO: clics, impresiones y CTR de Search Console; posición medida y seguimiento de keywords se
  distinguen. Estimaciones de proveedor no se presentan como hechos medidos. TASK-1690 conserva el
  reader cliente y la cobertura por fuente; la cola priorizada existente conserva su orden.
- Marketing de contenidos: planificado/en curso/en revisión/entregado/publicado son estados distintos.
  La pieza principal, sus derivados y subtareas no se suman como entregables equivalentes. Publicado
  requiere evidencia del destino, no un estado Notion ni una aprobación editorial.
- Diseño digital: entregas, puntualidad, rondas y aprobación a la primera usan fórmulas ICO vigentes,
  período y denominadores. No se promete ROI o revenue atribuido sin contrato y datos que lo sostengan.
- Consumo/cupos: sólo se muestra saldo cuando existe unidad contractual y una regla verificable de
  imputación. Contar tareas no equivale a consumir un cupo; si falta contrato, se muestra avance del
  trabajo y se declara consumo no disponible. No se inventan cuotas ni SLAs para ninguna cuenta.
- No se exponen costos de proveedor, márgenes, compensaciones ni evidencia interna cruda.

### 5. Preservar las fuentes y canales de trabajo

Berel conserva Notion como fuente editorial viva; el portal proyecta el ciclo y enlaza piezas sin
reemplazar cuerpos, comentarios anclados ni especificaciones. Drupal y sus URLs prueban publicación.
El modelo de colaboración propuesto para Berel no se considera aceptado por el cliente por este ADR.

Sky conserva las fuentes de proyectos/assets/revisión que se verifiquen en el inventario. No se
presupone un workspace Frame.io o una integración habilitada a partir del nombre del servicio.
Los providers se consumen por adapters canónicos, no desde el navegador.

### 6. Rollout por cuenta y capacidad

La apertura de lectura y cada write tienen gates separados. Primero se certifican con fixtures
aislados de los clientes; después se comprueba acceso/datos reales de la cuenta autorizada. Berel y
Sky no son sujetos de pruebas destructivas ni responsables de depurar tokens/logs.

Cada rollout registra configuración previa, cambio exacto, evidencia, responsable y rollback por
cuenta que preserve historia y otros servicios. La migración first-party de Efeonce ID, el piloto MCP
externo y el producto Globe mantienen sus programas; no bloquean por defecto el portal con login vigente.

### 7. Efeonce Insights como capacidad compartida de la experiencia

EPIC-045 es dueño de Insights para dos recorridos autenticados: clientes gestionan informes de su cuenta
y colaboradores internos gestionan informes de las cuentas autorizadas. El acceso web por token sigue
siendo un tercer recorrido acotado. Biblioteca, generación y gestión son parte del alcance de este epic,
no un follow-up opcional de exportación.

Desde Inicio, Mis servicios y métricas se accede a Insights conservando cuenta/servicio/período permitido.
TASK-1849 posee biblioteca/builder/visor para ambas poblaciones; el portal no los duplica. TASK-1845–1848
conservan fuentes, autoridad, render, distribución y recurrencia. Cliente genera sólo mediante plantillas
y datos permitidos; emisión, sharing y envío requieren sus permisos propios, y un link no da acceso al portal.

Berel obtiene informes que pueden combinar resultados SEO y avance de contenidos; Sky, producción y calidad
de diseño digital. Misma fuente/fórmula del dashboard, snapshot y fecha explícitos. El adapter Insights
consume dominios productores, nunca importa del BFF del portal. La integración completa es un hito exigible
del epic; la primera apertura de métricas no tiene que esperar todas las salidas o acciones de Insights.
Contrato compartido: [arquitectura Insights §7.1](EFEONCE_INSIGHTS_ARCHITECTURE_V1.md#71-contrato-de-audiencias-autenticadas--integración-epic-046).

## Alternatives Considered

| Alternativa | Evaluación |
|---|---|
| Activar todo el catálogo | Rechazada: expone destinos inexistentes y puede ampliar acceso fuera del servicio |
| Construir dos portales o ramas UI por nombre de cliente | Rechazada: duplica autorización, métricas y mantenimiento |
| Reescribir el portal y migrar Notion/Frame.io antes de abrir | Rechazada: posterga valor y pone en riesgo historia/operación |
| Esperar Efeonce ID, Insights y automatización completa | Rechazada como prerrequisito global; usar dependencias por capacidad |
| Composición común por servicio, con cohortes y fuentes gobernadas | Propuesta: permite apertura incremental y reutiliza la plataforma |

## Consequences

Se aprovechan métricas y pantallas existentes, con una experiencia reutilizable para siguientes cuentas.
El costo inicial es conciliar alcance, mapeos, cobertura e identidad; algunas cifras y acciones deberán
presentarse como no disponibles hasta contar con evidencia. Hay dos hitos de salida, no una fecha ficticia
de autogestión integral. Se evita completar todo el catálogo como condición para servir estas cuentas.

## Runtime Contract

| Responsabilidad | Dueño a conservar |
|---|---|
| Cuenta y servicios | Account 360, Commercial y readers vigentes de organización/servicios |
| Habilitación | `greenhouse_client_portal.modules`, `module_assignments` y commands canónicos |
| Visibilidad | `src/lib/client-portal/visibility/` + guards y composition existentes |
| Trabajo/métricas | Delivery, ICO, `src/lib/growth/seo/` y readers de cada productor |
| Experiencia | BFF `src/lib/client-portal/`, rutas/views actuales, AXIS/MUI y CompositionShell |
| Writes futuros | Commands del dominio dueño + adapters UI/API/MCP con igual policy y redacción |
| Informes multiformato | EPIC-045 / Efeonce Insights; informes SEO existentes siguen disponibles |
| Estado externo | Notion/Drupal y providers de revisión verificados; readback y sync canónicos |

Este ADR no introduce schema, ruta, capability o deployable nuevo. Las tasks deben fijar los contratos
concretos y API parity antes del código, reusando lo existente; ningún adapter será el único dueño de una regla.
La implementación queda en el checkout compartido y los runtimes actuales; no se crean worktrees ni servicios.

## Revisit When

- Un nuevo servicio exige otro modelo de autorización o de imputación de consumo.
- La misma organización requiere scopes por marca/proyecto que los readers actuales no pueden representar.
- Una acción cliente necesita firma, cambio contractual, publicación o gasto adicional.
- La fuente no puede conservar identidad/versiones o no admite reconciliación de estados.
- Se pretende reemplazar una herramienta operativa o ampliar la cohorte fuera de Berel/Sky.

## References

- [Portal domain](GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md) e [invariantes](agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md).
- [Full API Parity](GREENHOUSE_FULL_API_PARITY_DECISION_V1.md).
- [Operating responsibility](GREENHOUSE_OPERATING_RESPONSIBILITY_DECISION_V1.md): doctrina separada de permisos.
- [EPIC-015](../epics/to-do/EPIC-015-client-portal-domain-consolidation.md): foundation, cascade y reliability.
- [Experiencia cliente](../context/10_experiencia-cliente.md).
- [Skill Berel](../../.codex/skills/berel-content-production/SKILL.md).

## Delta 2026-09-09 — comunicación y retorno al portal

**Accepted para planificación**, por ampliación explícita del operador. La entrega del portal incluye
motivos de retorno: Insights por correo con resumen útil y deep link, avisos in-app/email de revisiones,
briefs y cambios relevantes, y Teamsbot para destinos habilitados en esta fase. App móvil/push quedan
fuera del alcance actual. El primer flujo email + in-app acompaña Hito A; Insights lo amplía al emitir
ediciones. Hito N es obligatorio para cerrar EPIC-046, con matriz Teamsbot y evidencia por destino.

Contrato detallado: [Insights §9.1](EFEONCE_INSIGHTS_ARCHITECTURE_V1.md#91-activación-y-retorno-al-portal--epic-046).
Enlace autenticado por defecto; token compartido separado. Un hecho conserva correlación y estado por
canal; preferencias/quiet hours/digest evitan ruido, y adopción mide consulta/acción autenticada. Reusar
la projection reactiva, sender, in-app y dispatcher Teams existentes hasta el cutover gobernado del Hub.
P09 coordina dueñas existentes; no aumenta las cinco nuevas tasks propuestas ni autoriza envíos reales.

## Delta 2026-09-09 — registro y conexión con TASK-1834

P01 es TASK-1852 y consume el contrato de identidad/entrada/retorno de TASK-1834. La relación es
obligatoria para diseño y pruebas de contexto; activar el login nativo espera su rollout/gates. La
habilitación del servicio con login vigente comprobado puede avanzar sin esperar el cierre total de
1834. No crear otro login/selector, escribir módulos desde callbacks ni usar un deep link como grant.
La matriz de cohorte y los casos email/in-app/Teamsbot → login → objeto autorizado se enlazan en ambos
sentidos. TASK-1853/1854/1855/1856 cubren datos, experiencia y solicitudes. Registro sin implementación.

## Implementación local TASK-1852 — habilitación común

El contrato de preview/apply/compensación vive en `src/lib/client-portal/enablement/`, bajo el mismo BFF hoja.
Usa servicios y términos vigentes como evidencia de mapping; no crea un catálogo comercial paralelo. Los
commands de módulos comparten transacción y lock por organización. La API Platform admite un executor
transaccional opt-in para conservar resultado idempotente y efectos en el mismo commit; sus consumers
previos conservan el executor predeterminado.

Un nuevo evento de audit `enablement_receipt` conserva el recibo para recuperación tras retención del
transporte. Es evidencia de control; se excluye de la revisión de transición para evitar una dependencia
circular entre recibo y revisión. Ningún otro evento queda excluido. Compensación sólo pausa altas propias
sin cambios posteriores. El detalle operativo y de autoridad está en el
[runbook](../operations/CLIENT_SERVICE_ENABLEMENT_RUNBOOK_V1.md). Writes nuevos default-off; la identidad
machine-only ecosystem/MCP mantiene denegación explícita. Esto no declara deploy ni certificación cliente.
