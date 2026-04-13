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

## Estado actual en el repo

Hoy esta capa ya tiene foundation materializada en código:

- schema objetivo: `greenhouse_context`
- tablas base:
  - `context_documents`
  - `context_document_versions`
  - `context_document_quarantine`
- runtime compartido:
  - `src/lib/structured-context/`

El primer uso real conectado es el tracking reactivo:

- los runs de `reactive_worker` pueden escribir `event.replay_context`
- ese contexto se relee desde el mismo aggregate `source_sync_run`
- el objetivo es dejar evidencia estructurada para replay, debugging y auditoría operativa sin tocar la verdad canónica del sync

La aplicación de la migración en el shared dev DB quedó pendiente por drift de historial entre ramas, pero la base runtime y el contrato ya quedaron implementados en repo.

## Aprendizajes de implementación

Estos aprendizajes ya deberían considerarse reglas prácticas para el equipo y para agentes.

### 1. Un documento persistido debe ser JSON real, no "casi JSON"

Esto parece obvio, pero en implementación pegó de inmediato.

No basta con que el documento "se vea bien". También debe cumplir el contrato técnico de JSON puro:

- sin `undefined`
- sin funciones
- sin instancias raras
- sin objetos que no sean serializables de forma estable

Regla práctica:

- si un dato opcional no existe, usar `null`
- no confiar en que un objeto con propiedades opcionales se va a serializar como esperas

### 2. La capa debe dejar evidencia incluso cuando rechaza un documento

Si algo falla al validar, no conviene perder la evidencia.

Por eso la foundation deja quarantine antes de lanzar el error.

En términos simples:

- documento inválido no entra al flujo normal
- pero tampoco desaparece
- queda registro para revisar qué intentó escribirlo y por qué falló

### 3. No todo consumer debe caerse si el sidecar falla

En el primer piloto, el contexto estructurado se conectó al tracking reactivo.

Ahí quedó claro algo importante:

- cuando la capa agrega contexto pero no define la verdad canónica, debe degradar con seguridad

Eso significa:

- el `source_sync_run` sigue siendo el registro principal del run
- el `event.replay_context` lo enriquece
- si el sidecar falla, el worker no debería morir solo por eso

### 4. No conviene indexar todo el JSONB "por si acaso"

La implementación base no creó un índice GIN global sobre `document_jsonb`.

La razón es simple:

- primero se consulta por owner, tipo, source system, tenant y retención
- el contenido interno del JSON no necesita indexarse masivamente desde el día uno

Si aparece una necesidad real de búsqueda interna por documento, ese índice debe entrar de forma dirigida.

### 5. La idempotencia correcta es local al aggregate

Otro aprendizaje importante:

- la idempotencia no debería ser global para toda la capa
- debe acotarse por aggregate y `context_kind`

Eso evita colisiones innecesarias y respeta la lógica sidecar del modelo.

### 6. En trabajo multi-agente, la base compartida puede ir más adelantada que tu branch

Esto pasó de verdad durante la implementación.

La base dev compartida ya tenía una migración de otro frente (`TASK-379`) y eso impidió aplicar la nueva migración de `TASK-380` en orden.

Qué implica:

- una branch no puede asumir que la historia de migraciones local coincide con la de la base compartida
- antes de empujar una migración, conviene revisar si el bloqueo viene por drift de ramas y no por un error del cambio nuevo

### 7. El tooling local del worktree también importa

Durante la validación apareció una fricción de Turbopack:

- no aceptó un `node_modules` symlink que apuntaba fuera del root del worktree

Aprendizaje práctico:

- en worktrees aislados conviene usar `node_modules` local real al validar build
- si no, puedes perder tiempo persiguiendo un falso error de aplicación

## Aspectos críticos a tener en cuenta

### No convertir la capa en basurero estructurado

Si cada módulo empieza a meter:

- `payload`
- `data`
- `metadata`
- `extra`

sin semántica ni policy, la capa se degrada muy rápido.

La capa solo escala si cada documento entra con:

- `context_kind`
- política de retención
- sensibilidad
- validación
- owner claro

### No meter secretos ni binarios

Esto no es opcional.

No deben vivir aquí:

- tokens
- cookies
- passwords
- credenciales
- blobs binarios o base64 grandes

### Recordar siempre qué es verdad y qué es contexto

La forma más sana de revisar una implementación es preguntarse:

1. ¿esto define el negocio?
2. ¿o esto explica, acompaña o contextualiza el negocio?

Si define el negocio, va al modelo relacional.

Si solo lo explica o lo acompaña, esta capa puede ser la salida correcta.

### Pensar en promoción futura

Un documento en JSONB no es necesariamente su forma final.

Si con el tiempo ese dato:

- se vuelve contractual
- se consulta seguido
- participa en reporting
- se usa en reglas o permisos

entonces debe promocionarse a columnas o tablas relacionales.

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

## Guia rápida para agentes: cuando usar JSON, JSONB y cuando no

Esta guía baja la decisión a reglas simples.

### Usa modelo relacional cuando

El dato forma parte de la verdad principal del negocio.

Ejemplos:

- estados oficiales
- montos y balances
- relaciones entre entidades
- ownership y tenant isolation
- permisos
- fechas contractuales
- campos que el sistema filtra o joinea todo el tiempo

Si el dato define cómo funciona Greenhouse, no debería ir a JSON ni a JSONB.

### Usa JSONB cuando

El dato es contexto flexible, pero aun así tiene valor operativo y Greenhouse puede querer leerlo después de forma estructurada.

Ejemplos:

- payload normalizado de una integración
- contexto para replay de un proceso reactivo
- evidencia de auditoría
- snapshot explicativo
- supuestos o resultados de un agente
- metadata local pequeña y bien acotada

La idea es: contexto reusable sí, verdad canónica no.

### Usa JSON solo en casos excepcionales

Dentro de Greenhouse, `JSON` puro debería ser raro.

Solo tiene sentido cuando importa conservar una representación casi tal cual llegó y no necesitas lo que normalmente da `JSONB` en PostgreSQL.

Ejemplo mental:

- un payload crudo que quieres preservar tal como vino

Si va a vivir en PostgreSQL y después Greenhouse puede inspeccionarlo, mezclarlo o consultarlo, lo normal debería ser `JSONB`.

### No uses ninguno cuando

El problema real es que todavía no modelaste bien el dato.

No conviene crear campos genéricos como:

- `metadata_jsonb`
- `extra_json`
- `payload`
- `data`

solo para patear la decisión.

Si el dato ya se volvió importante para joins, reporting o reglas de negocio, la salida correcta suele ser una tabla o columna relacional.

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

## Que faltaba para que esto sea realmente enterprise

Sí, faltaban varias cosas importantes.

Una capa así no queda nivel enterprise solo por usar `JSONB`.

También necesita reglas claras de operación para que no se vuelva un contenedor flexible pero frágil.

### 1. Clasificación de datos

Cada tipo de contexto debería declarar qué tan sensible es.

Eso importa porque no es lo mismo guardar:

- metadata técnica inocua
- contexto financiero
- contexto con PII
- un resultado de agente que necesita redacción

Y hay una regla dura:

- secretos, tokens, cookies, credenciales y material de autenticación no deberían guardarse aquí

### 2. Retención

No todo el contexto debería vivir para siempre.

Ejemplos:

- payloads crudos pueden expirar antes
- contexto de replay puede durar solo la ventana operativa
- bundles de auditoría pueden necesitar una vida más larga

### 3. Idempotencia y trazabilidad

Si integraciones, retries o agentes escriben contexto más de una vez, Greenhouse necesita detectar duplicados y mantener lineage entre versiones o reemplazos.

### 4. Acceso y redacción

No todo contexto que cuelga de un objeto debería ser visible a cualquiera que vea ese objeto.

Puede haber contexto:

- interno
- restringido a ops
- restringido a finanzas
- client-safe solo después de redacción

### 5. Límites de tamaño

Esta capa no es para guardar binarios ni blobs enormes.

Los archivos deben seguir viviendo en Assets. La capa debería guardar referencias y contexto, no PDFs embebidos ni base64 gigantes.

### 6. Observabilidad y quarantine

Si un productor emite un documento inválido, Greenhouse no debería:

- aceptarlo a ciegas
- ni perderlo silenciosamente

Debería poder rechazarlo o mandarlo a una ruta de quarantine/dead-letter con trazabilidad suficiente.

## Qué quedó resuelto en la documentación

La arquitectura y la task ahora ya dejan explícito que esta capa enterprise debe contemplar:

- clasificación
- redacción
- retención
- idempotencia
- lineage
- access scopes
- límites de tamaño
- observabilidad
- quarantine de documentos inválidos

O sea: ya no está planteada como "tabla con `JSONB`", sino como una capability de plataforma con gobierno real.

## Siguiente paso natural

El siguiente paso es bajar esta decisión a runtime con:

1. un schema dedicado
2. una tabla base de documentos de contexto
3. tipos y validators compartidos
4. guardrails enterprise de clasificación, retención, redacción e idempotencia
5. primeros pilotos reales en integraciones, replay o memoria de agentes

## En resumen

La Capa de Contexto Estructurado existe para que Greenhouse pueda usar contexto flexible con disciplina.

No es un reemplazo del modelo relacional.

Es una capa sidecar para guardar memoria útil, reusable y gobernada alrededor de los objetos canónicos del portal.
