# Greenhouse Operating Responsibility Decision V1

- **Status:** Accepted
- **Date:** 2026-08-07
- **Owner:** Greenhouse Platform + Efeonce Business Model
- **Scope:** cómo se representa en runtime el operating mode (`efeonce-managed` | `co-operated` | `client-operated`) por organización y módulo, y cómo lo consumen los módulos de producto
- **Reversibility:** two-way para el cableado por módulo; el historial de asignaciones es append-only y no se borra
- **Confidence:** high para la forma y el boundary — replica un contrato ya `Accepted` y desplegado en Globe (SPEC-008)
- **Implementation owner:** [`TASK-1663`](../tasks/to-do/TASK-1663-greenhouse-operating-responsibility-primitive.md)
- **Primeros consumidores:** [`TASK-1659`](../tasks/to-do/TASK-1659-growth-seo-keyword-target-intent-model.md) · [`TASK-1660`](../tasks/to-do/TASK-1660-growth-seo-keyword-targets-surface.md)

## Decisión

Greenhouse representa el operating mode como un **snapshot de accountability append-only y
versionado**, con alcance **organización × módulo**, en una tabla **hermana** de
`greenhouse_client_portal.module_assignments` — no como columna de ella.

🔴 **Nunca es una membership, entitlement, grant, rol ni input de autorización. Un cambio de modo
no puede agregar ni quitar capabilities.** Esta regla se copia verbatim del contrato de Globe
(`EFEONCE_GLOBE_OPERATING_RESPONSIBILITY_V1.md`, SPEC-008) porque es la que sostiene todo lo demás.

La ausencia de asignación **falla cerrada**: el sistema **nunca infiere** el modo.

## Por qué existe esta decisión

El vocabulario ya era canónico en
[`EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md`](../business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md),
que además fija algo load-bearing: *"el operating mode puede cambiar por lane o etapa; no se infiere
automáticamente del delivery model"*. O sea que la dimensión real es **org × lane**, no org sola.

Globe ya lo materializó y lo tiene desplegado. Pero vive en el Postgres de Globe, y Greenhouse ni lo
lee ni guarda copia — correcto por boundary, e inútil para los módulos de Greenhouse. En Greenhouse
`src/lib/commercial/delivery-model.ts` existe pero es de **cotización** (`CommercialModel`,
`StaffingModel`, `QuotationPricingModel`), no de operating mode. Y verificado el 2026-08-07: el
módulo Growth SEO no conoce el concepto — `grep` de operating-mode en `src/lib/growth/` da cero.

Sin un primitive canónico, cada módulo que necesite la distinción va a inventar la suya, y vamos a
terminar con N respuestas incompatibles a *"¿este cliente es co-operated?"*. Es la forma de módulo
del pecado de identidad paralela que el repo ya prohíbe para los objetos 360.

## 🔴 Las tres dimensiones son ORTOGONALES y no se mezclan

| Dimensión | Pregunta | Dónde vive | Quién la mueve |
|---|---|---|---|
| **Autorización** | ¿quién **puede** actuar? | capabilities + entitlements | Admin Center / governance |
| **Accountability** | ¿quién **responde**? | esta decisión | comercial + delivery, por engagement |
| **Comercial** | ¿quién **paga**? | contrato / cotización | Finance |

Mezclarlas es el error que esta decisión existe para prevenir. Concretamente:

- **Si el modo autorizara**, cambiar una etiqueta comercial en una tabla cambiaría en silencio quién
  puede comprometer gasto. Es el peor acoplamiento posible: una decisión comercial con efecto de
  seguridad, sin pasar por governance.
- **Si el modo llevara precio**, la tabla de accountability se volvería un registro financiero
  paralelo. Globe lo prohíbe explícitamente en su contrato —price, currency, provider cost y margin
  están vetados— y acá vale igual.
- **"Que el cliente contrate la herramienta" NO es un cuarto modo.** Es `client-operated` cruzado
  con un delivery model de plataforma, y arrastra una pregunta del tercer eje —quién paga el gasto
  del proveedor— que no es ni "quién puede" ni "quién responde".

## Forma del contrato

Replica la de Globe, reducida a lo que Greenhouse necesita hoy:

- **Scope:** `organization × module_key`. Un override de scope más fino (por período, por lane
  interno) es aditivo y no se decide acá.
- **Snapshot versionado append-only**, con versión monótona por scope, idempotencia por clave de
  request con fingerprint de intención, y concurrencia optimista por `expectedVersion`.
- **Responsabilidades nombradas**, cada una con `party` (`client | efeonce`) y actor de registro. El
  set mínimo de Greenhouse: autoridad del brief · operador de registro · aprobador de presupuesto ·
  dueño del delivery · aprobador del delivery. (Globe usa 8 porque su dominio suma creative y
  rights; no se copian por copiar.)
- **Política de modo fail-closed:** `efeonce-managed` exige operador y dueño de delivery del lado
  Efeonce; `client-operated`, del lado cliente; `co-operated` exige al menos una responsabilidad de
  cada lado. Una asignación que no cumple su propio modo es inválida, no se guarda.
- **Sin default hardcodeado.** Decidido con el operador el 2026-08-07: **cada engagement declara sus
  responsabilidades explícitamente**. Un default por modo parece cómodo y es exactamente lo que hace
  que nadie las revise; y en `co-operated` el reparto real varía por cliente.
- **Audit en la misma transacción** que la asignación, con actor, correlación, scope, versión
  resultante y modo. Sin payload crudo, sin PII, sin precio.
- Commands y readers con **capability propia** (`manage` / `read`), separada de las del módulo.

## Qué decide el modo, y qué NO

**Sí decide:**

1. **Qué superficie DEBE existir.** En `client-operated`, la superficie del portal del cliente es un
   requisito del producto, no un extra. En `efeonce-managed` puede legítimamente no existir. Esto es
   lo que convierte el modo en una entrada de diseño y no en un adorno de CRM.
2. **Quién es accountable** de cada decisión del lane, para reporte, escalamiento y auditoría.
3. **Qué es una anomalía operativa.** Un cliente `efeonce-managed` cuyo operador de registro es del
   lado cliente es una contradicción declarada, detectable.

**No decide:**

1. **Quién puede ejecutar una acción.** Eso es `can(subject, capability, action, scope)`, y no
   cambia. Un cliente en `client-operated` no gana capabilities por el modo; alguien tiene que
   otorgárselas. Una org en `efeonce-managed` no las pierde.
2. **Quién paga.** Tercer eje.
3. **Qué módulos tiene la org.** Eso es `module_assignments`, que sigue siendo la puerta de acceso.

## Por qué tabla hermana y no columna de `module_assignments`

Dos razones, y la segunda es la fuerte:

1. `module_assignments` responde *"¿esta org tiene este módulo?"* — es **acceso**. Accountability es
   otra dimensión, se mueve por otras razones y a otra cadencia. Meterlas en la misma fila es
   mezclar dimensiones ortogonales, que es regla dura del repo.
2. `module_assignments` tiene **una ventana efectiva**, no un historial de versiones. El dato
   load-bearing acá es *"quién era accountable **cuándo**"* — sin eso no se puede auditar una
   decisión pasada ni explicar un reporte viejo. Una columna lo destruiría en cada cambio.

## Alternativas rechazadas

- **Columna en `module_assignments`** — mezcla acceso con accountability y pierde el historial.
- **Que cada módulo lo resuelva** — N respuestas incompatibles a la misma pregunta; el canon de
  negocio dice que el modo aplica por lane, así que el segundo consumidor es cuestión de tiempo.
- **Leer el modelo de Globe desde Greenhouse** — rompe el boundary: Globe es dueño de su Postgres y
  Greenhouse no lo lee. Además el scope de Globe es workspace×run, no org×módulo.
- **Derivar el modo del delivery model comercial** — el propio canon de negocio lo prohíbe: *"no se
  infiere automáticamente"*.
- **Default por modo** — hace que nadie revise el reparto real, que es justo lo que en `co-operated`
  varía por cliente.

## Los 4 pilares

**Safety.** El riesgo central es que el modo se convierta en un canal de autorización encubierto. Se
cierra con la regla dura, con capabilities separadas para gestionar el modo, y con un test que
prueba que cambiar el modo **no** altera el resultado de `can(...)`. Ese test es el guardrail: sin
él, la regla es una frase en un doc.

**Robustness.** Fail-closed ante ausencia; política de modo validada antes de persistir; idempotencia
con fingerprint que rechaza reusar una clave con intención distinta; concurrencia optimista con
`expectedVersion`; asignación y audit en la misma transacción.

**Resilience.** Append-only: un error se corrige con una versión nueva, nunca con `UPDATE` ni
`DELETE`, así que el historial sobrevive a la corrección. El rollback deshabilita el cableado y
**preserva la tabla y su historia**; nunca borra evidencia.

**Scalability.** El volumen es de órdenes de decenas por organización, no de eventos: no hay
contención real. El costo de escala es **cognitivo** —cuántas responsabilidades nombradas hay que
declarar— y por eso el set mínimo son cinco y no las ocho de Globe.

## Hard rules

- **NUNCA** usar el operating mode como input de autorización, ni derivar capabilities de él. Un
  cambio de modo no agrega ni quita permisos.
- **NUNCA** inferir el modo: la ausencia de asignación es un estado cerrado explícito, no un default.
- **NUNCA** poner precio, costo, moneda ni margen en este contrato. Quién paga es otro eje.
- **NUNCA** `UPDATE` ni `DELETE` sobre las asignaciones: una corrección es una versión nueva.
- **NUNCA** leer ni copiar el modelo de responsabilidad de Globe desde Greenhouse; son scopes y
  dueños distintos.
- **NUNCA** agregar el modo como columna de `module_assignments`.
- **SIEMPRE** que un módulo nuevo necesite la distinción, consumir este primitive en vez de
  declarar el suyo.
- **SIEMPRE** validar la política de modo antes de persistir: una asignación que se contradice a sí
  misma no se guarda.

## Lo que deliberadamente NO se decidió

- **El override de scope más fino** (por período, por lane interno). Globe lo tiene por `run`;
  Greenhouse no tiene aún un equivalente y forzarlo sería inventar una FK. Aditivo cuando aparezca.
- **Cómo se sincroniza con el contrato comercial.** Hoy la asignación se declara a mano; que la
  firma de un SOW la proponga es deseable y es otra decisión.
- **Si el cliente puede ver su propia asignación** desde el portal. Probable que sí en
  `client-operated`, pero es una decisión de producto con su propio modelo de exposición.
- **Qué pasa con los módulos que hoy no tienen asignación.** El fail-closed dice que el estado es
  "no declarado"; qué superficie muestra eso lo decide cada módulo.

## Referencias

- [`EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md`](../business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md) — el canon del vocabulario
- [`EFEONCE_GLOBE_OPERATING_RESPONSIBILITY_V1.md`](creative-studio/EFEONCE_GLOBE_OPERATING_RESPONSIBILITY_V1.md) — SPEC-008, el precedente desplegado
- [`GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`](GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md) — el eje que este contrato **no** toca
- [`GREENHOUSE_CLIENT_LIFECYCLE_V1.md`](GREENHOUSE_CLIENT_LIFECYCLE_V1.md) — `module_assignments` y el acceso por módulo
