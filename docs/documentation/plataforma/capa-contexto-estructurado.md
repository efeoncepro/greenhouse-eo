# Capa de Contexto Estructurado

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-13 por Codex (TASK-380)
> **Ultima actualizacion:** 2026-04-13 por Codex (TASK-380)
> **Documentacion tecnica:** [GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md](../../architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md)

---

## Que es

La Capa de Contexto Estructurado es una forma gobernada de guardar contexto flexible alrededor de objetos canonicos de Greenhouse sin convertir ese contexto en la fuente principal de verdad.

En palabras simples:

- el dato principal del negocio sigue viviendo en tablas relacionales
- el contexto complementario, flexible o cambiante puede vivir en documentos estructurados
- esos documentos no son "cajones libres", sino piezas tipadas, versionadas y atribuibles

La idea es que Greenhouse pueda conservar memoria operativa útil sin ensuciar cada tabla core con un `jsonb` genérico.

## Para que sirve

Sirve para guardar cosas que sí importan operativamente, pero que no siempre justifican una tabla nueva desde el día uno.

Ejemplos:

- payloads normalizados de integraciones
- contexto para replay de eventos o proyecciones
- bundles de auditoría
- supuestos y resultados de trabajo asistido por agentes
- snapshots controlados que ayudan a explicar por qué pasó algo

La regla es simple:

- si algo es verdad canónica del negocio, debe vivir en el modelo relacional
- si algo es contexto flexible, explicativo o auxiliar, puede vivir aquí

## Que problema resuelve

Hoy Greenhouse ya usa JSONB en varios puntos del sistema.

Eso resuelve necesidades puntuales, pero deja varios problemas cuando no existe una capa compartida:

- cada módulo inventa su propio campo flexible
- el significado del JSON cambia según quién lo escribió
- integraciones, debugging y agentes no comparten una memoria común
- parte del contexto termina desperdigado entre logs, payloads crudos, docs y conversación

La Capa de Contexto Estructurado busca ordenar eso.

## Donde encaja dentro de Greenhouse

La capa se ubica entre el modelo canónico y los consumers operativos.

Flujo conceptual:

1. Greenhouse guarda la verdad principal en sus tablas canónicas
2. la capa de contexto guarda memoria estructurada alrededor de esos objetos
3. consumidores como integraciones, observabilidad, replay reactivo o agentes reutilizan ese contexto

No reemplaza:

- Identity
- Finance
- HR
- Spaces
- organizaciones
- estados de workflow

Más bien los acompaña.

## Que tipo de cosas deberían vivir aquí

Los casos más naturales son estos:

### Integraciones

Cuando un sistema externo entrega información que conviene preservar como contexto reusable.

Ejemplos:

- payload recibido
- payload normalizado
- metadata de importación
- evidencia de calidad de datos

### Reactividad y replay

Cuando un evento o una proyección necesita dejar una explicación o contexto de recuperación.

Ejemplos:

- por qué se reintentó un evento
- qué inputs se usaron para reprocesar
- qué señales operativas dispararon un recovery

### Auditoría operativa

Cuando hace falta conservar contexto para entender una decisión o un cambio.

Ejemplos:

- supuestos usados por un proceso
- evidencia acumulada para una resolución
- snapshots de referencia al momento de ejecutar una acción

### Trabajo con agentes

Este punto es especialmente importante para Greenhouse.

La capa permite que parte del trabajo de análisis y ejecución deje huella máquina-legible y no dependa solo de:

- conversación
- handoff manual
- memoria temporal del agente
- reconstrucción desde logs

Ejemplos:

- un reporte de auditoría
- un set de supuestos
- un plan de ejecución
- un resumen de resultados

## Que NO debería vivir aquí

No debería usarse esta capa para evitar modelar bien el sistema.

No corresponde guardar aquí como verdad principal:

- estados oficiales
- montos y balances canónicos
- relaciones principales entre entidades
- ownership o tenancy oficial
- permisos o contratos base del sistema

Si un dato se vuelve:

- contractual
- transaccional
- muy consultado
- parte del core de negocio

entonces debe pasar al modelo relacional.

## Como pensar la capa en una frase

La mejor forma de verla es esta:

> El modelo relacional dice qué es verdad.  
> La capa de contexto dice qué contexto flexible rodea esa verdad.

## Beneficio práctico para el desarrollo con agentes

En el contexto actual de Greenhouse, donde trabajamos con múltiples agentes y bastante ejecución asistida, esta capa sirve para:

- reducir pérdida de contexto entre turnos
- dejar trazas reutilizables para debugging
- guardar auditorías y supuestos de forma estructurada
- disminuir la dependencia de prompts largos o memoria conversacional
- facilitar replay y soporte operativo sin volver a descubrir todo desde cero

En otras palabras: no reemplaza `Handoff.md`, pero sí puede absorber la parte del contexto que conviene que el runtime y los agentes lean como datos.

## Estado actual

Hoy esta capa está formalizada como arquitectura y como task de implementación:

- arquitectura: `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md`
- task: `docs/tasks/to-do/TASK-380-structured-context-layer-foundation.md`

Eso significa que la decisión de modelado ya existe, pero la foundation runtime todavía debe materializarse.

## Siguiente paso natural

El siguiente paso es bajar esta decisión a runtime con:

1. un schema dedicado
2. una tabla base de documentos de contexto
3. tipos y validators compartidos
4. primeros pilotos reales en integraciones, replay o memoria de agentes

## En resumen

La Capa de Contexto Estructurado existe para que Greenhouse pueda usar contexto flexible con disciplina.

No es un reemplazo del modelo relacional.

Es una capa sidecar para guardar memoria útil, reusable y gobernada alrededor de los objetos canónicos del portal.
