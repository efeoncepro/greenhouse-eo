# Servicio — Customer Agent gestionado en HubSpot

> **Clave:** `hubspot.customer-agent-managed`
> **Familia:** HubSpot as a Service
> **Tipo:** implementación + gobierno + QA + operación gestionada
> **Estado de la oferta:** activa
> **Implementación de referencia:** ANAM, portal `19893546`
> **Service owner:** Efeonce Group SpA

## Promesa del servicio

Diseñar, implementar y operar un Customer Agent de HubSpot que responda desde conocimiento aprobado, capture el
contexto útil de cada intención y transfiera a una persona cuando se requiere juicio o una acción humana. El
resultado no es “un chatbot instalado”: es un canal gobernado, verificable, actualizable y medible.

## Problema que resuelve

- conocimiento disperso o contradictorio que produce respuestas inconsistentes;
- equipos que repiten preguntas de clasificación antes de poder actuar;
- transferencias sin contexto que obligan al cliente a empezar de nuevo;
- agentes que prometen precios, fechas, cumplimiento o acciones que no pueden ejecutar;
- costos por créditos y resolución que se activan sin modelado ni seguimiento;
- configuraciones que parecen publicadas pero no se prueban en el canal real.

## Resultado esperado

El cliente recibe una experiencia conversacional alineada con su marca y operación, una base de conocimiento
versionada, rutas por intención, reglas de autonomía, handoff humano, QA trazable, medición de resultados y una
cadencia de mantenimiento. El servicio separa persona, conocimiento, instrucciones, acciones, handoff, canal y
medición como contratos independientes.

## Alcance incluido

### 1. Intake e inventario

- objetivos, intenciones, idiomas, audiencias, tono, restricciones y dueños;
- inventario de knowledge, respuestas cortas, archivos, URLs, canales, permisos, licencias y créditos;
- revisión de contradicciones, vigencia, privacidad y fuentes que no deben alimentar respuestas;
- baseline de carga humana, tipos de consulta, volumen y escalamiento cuando existe evidencia.

### 2. Arquitectura conversacional

- identidad y personalidad del agente;
- clasificación por intención y secuencia progresiva de preguntas;
- memoria multi-turno y regla de no pedir dos veces el mismo dato;
- límites para precios, fechas, normativa, resultados, responsabilidad y acciones;
- tratamiento de intención mixta, frustración, reclamo y solicitud explícita de una persona.

### 3. Knowledge y gobierno editorial

- transformación de fuentes aprobadas en Markdown enfocado y versionable;
- separación por empresa, servicios/normas, cotización, preguntas frecuentes, seguimiento, facturación, calidad
  y catálogos técnicos;
- registro de procedencia, owner, fecha, sincronización, audiencia y estado de publicación;
- reconciliación de contradicciones antes de cargar; el modelo nunca arbitra políticas incompatibles.

### 4. Handoff humano y canal

- triggers, información mínima, owner, disponibilidad y mensajes online/offline;
- conservación del contexto reunido antes de transferir;
- configuración del chatflow y su entry point desde landing o sitio;
- QA de comportamiento nativo de HubSpot cuando la transferencia antecede una respuesta entrenada.

El servicio separa cuatro decisiones que no deben colapsarse: el trigger que hace que Customer Agent deje de
responder, la modalidad live/asíncrona, la asignación del ticket o conversación y una eventual reasignación entre
personas. Para un único destino puede usarse routing directo; cuando el destino depende de intención u otra
condición gobernada se selecciona un workflow de tickets en Help Desk o de conversaciones en Inbox.

Cuando se requiere una secuencia principal → reemplazo, se implementa como una composición verificable: limpiar
al Customer Agent como owner, intentar el principal disponible y luego el reemplazo disponible sin sobrescribir
una asignación exitosa. No se vende como una modalidad nativa denominada “fallback”. Si nadie está disponible,
el caso queda sin owner y el live chat debe conservarse abierto cuando se espera continuidad humana.

El handoff live mantiene el mismo hilo y contexto. Después de que la primera persona toma el caso, una segunda
persona continúa mediante reasignación manual del owner; terminar el chat impide reabrir ese chat. Una petición
libre por nombre activa la necesidad de una persona, pero no garantiza que HubSpot resuelva el nombre al usuario
correcto: la asignación nominal requiere una condición estructurada o una reasignación humana comprobada.

### 5. QA y aceptación

- información técnica con y sin norma;
- cotización por familia de servicio;
- parámetros desconocidos o documentos ausentes;
- orientación administrativa versus acción real de facturación;
- seguimiento, reclamos, intención mixta y solicitud humana;
- memoria multi-turno, repetición de datos, transferencia disponible/no disponible y entrada con privacidad;
- continuidad con respuesta humana, reasignación a una segunda persona en el mismo hilo, petición nominal y chat
  terminado;
- registro por escenario de esperado, observado, fuentes, transferencia, veredicto y acción.

### 6. Operación gestionada

- revisión de disponibilidad, consumo, conversaciones, unresolved intents y handoffs;
- actualización controlada de knowledge y directrices;
- pruebas de regresión después de cada cambio;
- reporte de resultados, limitaciones de plataforma, dependencia de créditos y próximos pasos.

## Entregables

| Entregable | Evidencia de aceptación |
|---|---|
| Inventario y matriz de fuentes | Fuentes en uso, excluidas, owner, fecha y procedencia. |
| Source pack Markdown | Archivos revisables que reconciliaron el knowledge live. |
| Contrato de identidad/directrices | Tono, intents, secuencia, límites y reglas de memoria. |
| Matriz de handoff | Trigger, contexto mínimo, owner, disponibilidad y mensaje. |
| Configuración de canal | Chatflow/landing leídos de vuelta y prueba del entry point. |
| QA report | Escenarios y turnos separados, PASS/limitación/falla y riesgo residual. |
| Modelo de medición/costo | Definición de resolución, volumen, créditos y outcome de negocio. |
| Manual y continuidad | Cadencia, cambio, verificación, troubleshooting y escalamiento. |

## Fuera de alcance por defecto

- decisiones legales, regulatorias, de laboratorio o de cumplimiento;
- fijar precios, comprometer fechas o resolver reclamos en nombre del cliente;
- pagar facturas, cambiar suscripciones, comprar créditos o ampliar límites sin autorización;
- construir acciones custom, integraciones o Agent Tools no declarados en el SOW;
- garantizar SLA sobre funciones beta de HubSpot;
- publicar un caso con el nombre del cliente sin autorización.

## Responsabilidades

| Parte | Responsabilidad |
|---|---|
| Efeonce | Método, diseño, preparación de conocimiento, configuración aprobada, QA, documentación y operación acordada. |
| Cliente | Veracidad de fuentes, owners, políticas, accesos, licencias, créditos, facturación y disponibilidad humana. |
| HubSpot | Runtime, consumo, límites, disponibilidad, mensajes nativos y evolución del producto. |

## Métricas

Cada métrica debe declarar período, baseline, denominador y definición. Según alcance pueden utilizarse:

- conversaciones elegibles y resueltas con la definición vigente de HubSpot;
- tasa y causa de handoff;
- reducción de carga humana comparada con baseline;
- unresolved intents y cobertura documental;
- exactitud/QA por escenario y regresiones;
- tiempo hasta transferencia y contexto preservado;
- casos sin owner, reasignaciones humanas y continuidad en el mismo chat;
- créditos consumidos y costo por outcome.

El trigger de handoff, la asignación por workflow y la reasignación manual se miden por separado. Una mera
asignación no prueba un handoff calificable para la métrica de resolución, y deflection no equivale a una necesidad
resuelta. La tasa de resolución de herramienta no sustituye el outcome de negocio. El nombre ANAM o resultados de su caso
no se usan externamente sin autorización y reconciliación del período.

## Caso de referencia ANAM

La implementación ANAM dejó 23 fuentes activas —seis archivos y 17 respuestas cortas—, un catálogo técnico de
356 registros, identidad/directrices, cinco rutas principales, chatflow y QA. El agente volvió a operar y el
2026-09-01 se verificó el handoff por intención y disponibilidad mediante workflow de tickets: cotización a Pablo
con María Paz como reemplazo; seguimiento a Marco con Pablo como reemplazo; y Calidad/facturación/otros a María
Paz con Marco como reemplazo. Tres chats públicos probaron el owner primario y un reemplazo real. Esa evidencia
prueba asignación y cambio de owner; no prueba todavía una respuesta humana ni una segunda transferencia humana
en el mismo chat.

La entrega de cierre incluye una especificación técnica y una guía funcional en PDF, ambas derivadas de fuentes
HTML/CSS y revisadas página por página. El soporte acordado para Customer Agent y KPI es de tres meses,
**2026-08-13 a 2026-11-12 inclusive**. Cubre incidentes, correcciones y operación del alcance construido; no
incluye nuevas funcionalidades, KPI, workflows, automatizaciones, integraciones, rediseños ni innovación.

## Fuentes y evidencia

- [PDF técnico de Emma](../../architecture/kortex/hubspot-as-a-service/reports/ANAM_Emma_Handoff_Especificacion_Tecnica_2026-09-02.pdf)
- [PDF funcional de Emma](../../architecture/kortex/hubspot-as-a-service/reports/ANAM_Emma_Handoff_Documentacion_Funcional_2026-09-02.pdf)
- [Correo de entrega y soporte](../../documentation/hubspot-as-a-service/anam-entrega-documentacion-y-soporte-2026-09-02.md)
- [Informe Word detallado](../../architecture/kortex/hubspot-as-a-service/reports/ANAM_Informe_Detallado_Customer_Agent_2026-07-17.docx)
- [Source pack live reconciliado](../../architecture/kortex/hubspot-as-a-service/anam-customer-agent-source-pack/README.md)
- [QA Customer Agent](../../audits/ANAM_CUSTOMER_AGENT_QA_REPORT_2026-07-16.md)
- [Documentación funcional](../../documentation/hubspot-as-a-service/anam-hubspot-managed-service-end-to-end.md)
- [Manual operativo](../../manual-de-uso/hubspot-as-a-service/operar-anam-hubspot-managed-service.md)
- [Canon técnico](../../architecture/kortex/hubspot-as-a-service/README.md)
- [Configurar el handoff de Customer Agent](https://knowledge.hubspot.com/customer-agent/set-up-and-customize-the-customer-agents-handoff-process)
- [Asignar tickets mediante workflows](https://knowledge.hubspot.com/workflows/assign-tickets-using-workflows)
- [Gestionar tickets y chats en Help Desk](https://knowledge.hubspot.com/help-desk/manage-tickets-in-help-desk)
