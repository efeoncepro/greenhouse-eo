# Revisión profunda de métodos de costeo y arquitectura de costos

**Fecha de corte:** 2026-08-02
**Alcance:** Greenhouse, cotizaciones comerciales, servicios de diseño/SEO y economía operativa de Globe
**Tipo:** auditoría de método y decisión de arquitectura
**Estado:** recomendación para ADR; no cambia código, schema ni datos live

## 1. Decisión ejecutiva

MLCM no debe descartarse, pero tampoco debe convertirse literalmente en el modelo económico completo de Efeonce.

La necesidad real no es un “costo por miembro”. Es poder responder, para una cotización concreta:

```text
¿Qué voy a entregar?
¿Qué personas, horas, herramientas, proveedores y operaciones consume?
¿Cuál es el costo incremental y cuál es el costo plenamente cargado?
¿Qué margen debe aplicar y con qué evidencia?
¿Qué supuestos quedan congelados en esta versión de la cotización?
¿Qué compararé después contra lo que realmente consumí?
```

La arquitectura recomendada es un modelo híbrido:

```text
MLCM                         → costo real cargado de personas/capacidad
Standard costing + TDABC     → costo planificable por rol/actividad/hora
Job-order costing            → costo de una cotización, servicio o engagement
Cost-to-serve                → costo por cliente/servicio y decisión comercial
ABC selectivo                → pools compartidos y drivers difíciles de trazar
Actual vs standard variance  → control de ejecución y aprendizaje del cotizador
Plan económico + mappings    → conexión futura con el plan de cuentas/GL
```

La decisión concreta es:

> **Usar MLCM como motor de costo real de recursos humanos, y extender el cotizador existente con un Cost Object & Cost Basis Model híbrido. El primer objeto comercial no será el miembro: será la línea de servicio de una cotización, vinculada luego a engagement, periodo y ejecución.**

No recomiendo implementar ahora un ABC completo, un sistema de proceso, un libro mayor legal ni una migración literal de toda la spec MLCM. Primero hay que demostrar una vertical reproducible de costos para tres casos: diseñador individual, servicio de diseño digital compuesto y servicio SEO explícito.

## 2. Qué se está resolviendo exactamente

Hay tres preguntas distintas y no deben compartir un único número sin etiqueta:

| Pregunta | Objeto | Método principal | Salida |
|---|---|---|---|
| ¿Cuánto cuesta tener disponible esta capacidad? | miembro, rol, tool, provider, Globe | MLCM + pools de recursos | costo real/estándar por periodo y unidad |
| ¿Cuánto cuesta vender y entregar esta propuesta? | quote/version/service line/engagement | receta + TDABC/standard + job-order | baseline trazable de costo y precio |
| ¿Qué resultado económico produjo lo ejecutado? | engagement/client/service/period | actuals + asignación + variance | costo real, margen y explicación |

El error que se quiere evitar es mezclar:

- salario o costo mensual de una persona con el costo de un entregable;
- precio de una licencia con el consumo efectivo de una herramienta;
- saldo o precio comercial de Globe con su costo técnico/financiero;
- markup de una línea con margen bruto objetivo;
- costo estándar estimado con costo real reconciliado;
- revenue facturado con revenue reconocido o cobrado.

## 3. Comparación de métodos

### 3.1 MLCM / resource-loaded costing

MLCM encaja bien con el problema de construir el costo cargado de un miembro, un rol y una capacidad mensual. La spec vigente ya contempla snapshots, periodos, labor, tools, overhead y degradación honesta.

Su límite estructural es el grano: `member × client × period` no representa por sí solo una receta de servicio, un trabajo específico, una operación de Globe o un tercero contratado para un entregable.

**Veredicto:** conservar como backbone de recursos humanos y como fuente de costos reales; extender el modelo de objetos y no usarlo como único cost object.

### 3.2 Job-order / project costing

Es el método que mejor representa una agencia que vende trabajo custom o semi-custom: cada cotización, proyecto, retainer o work package acumula labor, herramientas, direct costs y overhead asignado. La literatura de contabilidad gerencial lo usa cuando los trabajos son identificables y sus costos pueden trazarse a cada trabajo; [OpenStax resume esa adecuación para trabajos personalizados y servicios identificables](https://openstax.org/books/principles-managerial-accounting/pages/4-1-distinguish-between-job-order-costing-and-process-costing).

**Veredicto:** debe ser el cost object comercial de Efeonce. No sustituye a MLCM; consume sus tasas y hechos.

### 3.3 Standard costing

El cotizador necesita un costo defendible antes de que exista una persona asignada o una factura de proveedor. Para eso hace falta un costo estándar versionado: rol, hora práctica, tool, actividad, service recipe y reglas de vigencia.

El estándar no puede presentarse como realidad. Debe conservar método, periodo, fuente, confianza y luego compararse contra actuals. [OpenStax describe el uso de montos presupuestados como punto de comparación con resultados reales](https://openstax.org/books/principles-managerial-accounting/pages/8-1-explain-how-and-why-a-standard-cost-is-developed).

**Veredicto:** obligatorio desde el primer slice del cotizador.

### 3.4 TDABC / time-driven activity-based costing

TDABC es especialmente adecuado para servicios basados en esfuerzo porque traduce capacidad práctica disponible y tiempo estimado en costo de una actividad. Reduce la necesidad de construir cientos de drivers cuando una buena estimación de tiempo explica el consumo.

La referencia fundacional de Kaplan y Anderson propone precisamente usar capacidad y estimaciones de tiempo para evitar la complejidad operativa de un ABC tradicional; [ver el artículo original de Harvard Business Review](https://hbr.org/2004/11/time-driven-activity-based-costing).

En Efeonce, TDABC puede ser la capa que convierta:

```text
costo cargado de rol o miembro / horas prácticas productivas
    → costo estándar por hora de actividad
    → horas de la receta
    → costo de labor del servicio
```

Pero no debe usar `160 horas` como constante universal. El denominador debe declarar capacidad contratada, disponibilidad comercial, capacidad práctica, ausencias, bench, reuniones internas y política de utilización.

**Veredicto:** usarlo para esfuerzo humano y actividades de servicio; primero definir la política de capacidad y no ocultar la capacidad no utilizada dentro del costo de cada cliente.

### 3.5 ABC tradicional

ABC puede explicar overhead que no se mueve proporcionalmente con horas: onboarding, dirección, QA, ventas técnicas, rework, soporte, compliance o gestión de proveedores. Sin embargo, un ABC exhaustivo exigiría mantener muchos pools, actividades y drivers.

**Veredicto:** usar ABC selectivo para los pools que realmente distorsionan el costo; no construir un catálogo universal de actividades antes de tener evidencia de que el pool lo necesita.

### 3.6 Contribution / marginal costing

Es necesario para decisiones de corto plazo: capacidad ya disponible, cliente estratégico, capacidad ociosa, prueba de un nuevo servicio o un costo incremental de Globe. No debe confundirse con el costo plenamente cargado.

**Veredicto:** calcularlo en paralelo al fully loaded. El cotizador debe mostrar ambos internamente y declarar cuál gobierna la aprobación.

### 3.7 Process costing

Process costing funciona mejor cuando se produce un volumen homogéneo y repetitivo. No es el método principal para diseño digital custom o proyectos de SEO con alcance variable. Puede ser útil más adelante para una unidad altamente estandarizada, por ejemplo reportes recurrentes con entradas y entregables muy repetibles.

**Veredicto:** no es el punto de partida.

### 3.8 Resultado de la comparación

| Método | Encaje con Efeonce | Qué aporta | Riesgo si se usa solo | Decisión |
|---|---|---|---|---|
| MLCM | Alto para personas/capacidad | loaded cost real | no conoce servicio ni trabajo | conservar y extender |
| Job-order | Muy alto para cotizaciones/proyectos | costo por propuesta/engagement | necesita fuentes de tasas y actuals | cost object comercial |
| Standard cost | Muy alto para cotizar | baseline antes de ejecutar | puede volverse ficticio si no se compara | obligatorio V1 |
| TDABC | Alto para labor/actividades | costo por hora práctica y esfuerzo | capacidad mal definida contamina todo | usar para labor |
| ABC selectivo | Medio/alto para pools | overhead con drivers explicables | mantenimiento y falsa precisión | aplicar solo a pools críticos |
| Contribution | Alto para decisión comercial | costo incremental y piso | ignora sostenibilidad estructural | vista paralela |
| Process costing | Bajo hoy | costo unitario repetitivo | aplana complejidad de servicios | posponer |
| GL legal | Necesario como destino | registro financiero formal | no resuelve por sí solo el precio | lane posterior |

## 4. Qué existe realmente hoy y qué implica

### 4.1 El catálogo de servicios aún es una receta incompleta

La implementación actual de `service_role_recipe` solo expresa `hours_per_period`, cantidad, opcionalidad y notas. `service_tool_recipe` expresa cantidad, opcionalidad y `pass_through`.

La expansión de servicio a pricing crea líneas V2 de rol y tool, pero no transmite `pass_through` al motor. Tampoco existen como componentes de la receta:

- actividad o proceso;
- entregable y unidad de salida;
- QA/review;
- coordinación y account management;
- rework o retries;
- complejidad/volumen;
- reserva de incertidumbre;
- terceros o derechos;
- driver de overhead;
- fuente de la tasa usada;
- baseline de estándar versus actual.

Eso explica por qué un servicio compuesto hoy puede tener una suma técnicamente válida de roles y tools y, aun así, producir un costo comercial incompleto.

### 4.2 Hay dos rutas de pricing que todavía conviven

El orquestador de cotizaciones usa el engine V2 para parte del flujo y conserva `resolveLineItemCost` legacy en otra parte. El lector legacy de roles consulta `role_rate_cards`, que en live tiene cero filas.

Esto no prueba que todas las cotizaciones actuales estén incorrectas; sí prueba que todavía no existe una única ruta semántica de costos que pueda gobernarse como contrato universal.

### 4.3 El costo de herramientas tiene un riesgo de unidad verificable

El materializador de `tool_provider_cost_basis_snapshots` agrega gastos observados o costos modelados de suscripción/uso por herramienta, proveedor, periodo y scope. El schema no contiene un campo que diga si `resolved_amount` es:

- total del periodo;
- costo por seat;
- costo por usuario;
- costo por unidad de uso;
- costo unitario de una línea de servicio.

El engine V2 recibe ese valor como `unitCostUsd` y calcula `unitCostUsd × quantity × periods`.

**Estado de evidencia:** la tabla live tiene cero snapshots, por lo que no afirmamos que este riesgo esté generando sobrecobro hoy. La conclusión segura es que la ruta no puede activarse con datos reales hasta fijar `amount_basis`, `allocation_quantity` y la unidad de `quantity`.

### 4.4 Las políticas de margen no son uniformes

En roles, si no hay policy por tier, el engine aplica fallback de 35% y deja warning. En tools, si no existe precio explícito, aplica `cost × 1.15`, que es markup sobre costo, no necesariamente un margen bruto objetivo de 15%.

La fórmula de margen objetivo es distinta:

```text
precio con margen M = costo / (1 - M)
```

Por tanto, `costo × 1.15` no equivale a “margen 15%”. Puede ser una decisión comercial válida para un pass-through, pero debe estar etiquetada como markup o pass-through policy y no presentarse como la misma política de margen del servicio.

### 4.5 La provenance persistida es insuficiente para gobernar la confianza

La auditoría live encontró 135 líneas de cotización; 132 no tienen `unit_cost`, 134 no tienen `pricing_input` y solo 3 tienen `pricingV2CostBasisKind` explícito en `cost_breakdown`.

Sin provenance por línea no se puede responder de forma reproducible:

- qué snapshot se usó;
- qué periodo y FX aplicaron;
- si el valor era estándar, real, fallback o manual;
- qué cantidad representaba el costo;
- qué usuario aprobó un override;
- qué cambió entre versiones.

La cotización tiene versionado como workflow, pero todavía no tiene cobertura suficiente como baseline económico.

## 5. Contrato económico propuesto

### 5.1 Cost object

El cost object primario para el cotizador debe ser:

```text
quotation_id
  → quotation_version
    → service_line / work_package
      → engagement / contract (cuando exista)
        → period
```

El repo ya tiene piezas que pueden servir de ancla, como `service_id` y `engagement_phases`. Eso reduce la necesidad de inventar otra jerarquía; el faltante es vincular la baseline económica de la cotización a esa ejecución sin duplicar el costo ni convertir una fase operativa en una cuenta contable.

El recurso que origina el costo puede ser distinto:

```text
member | role | tool | provider | Globe operation | third party | shared pool
```

La atribución debe conservar ambos lados: no borrar el recurso solo porque el costo terminó en un cliente.

### 5.2 Cuatro lanes, no un único costo

Cada cost basis debe declarar una combinación de estas dimensiones:

| Dimensión | Significado |
|---|---|
| `cost_method` | `mlcm`, `tdabc`, `job_order`, `abc_selective`, `manual` |
| `cost_view` | `contribution` o `fully_loaded` |
| `measurement` | `standard`, `actual`, `forecast` |
| `allocation_status` | `direct`, `allocated`, `unallocated`, `pass_through` |
| `cost_behavior` | `fixed`, `variable`, `step_fixed`, `committed`, `incremental`, `financial` |

El producto de esas dimensiones evita que “costo” sea una cifra sin semántica.

### 5.3 Unidad y base de cantidad

Todo componente debe declarar:

```text
amount
currency
amount_basis: total_period | per_hour | per_seat | per_user | per_usage_unit | per_deliverable
quantity
quantity_basis
period_start / period_end
allocation_driver
```

Ejemplo de regla segura para una herramienta:

```text
si el snapshot es total del periodo:
  costo asignable = total_periodo × participación del servicio

si el snapshot es por seat:
  costo asignable = costo_por_seat × seats_consumidos

si el snapshot es por unidad de uso:
  costo asignable = costo_por_unidad × unidades_consumidas
```

No se debe llamar `unitCost` a un total solo porque el engine necesita un número unitario.

### 5.4 Receta de servicio

La receta actual de roles y tools puede ser el núcleo, pero debe evolucionar a una receta versionada que permita:

```text
service_recipe_version
  ├─ activities / work packages
  │    ├─ role or member
  │    ├─ estimated practical hours
  │    ├─ quantity / volume driver
  │    └─ complexity / uncertainty factor
  ├─ deliverables and acceptance criteria
  ├─ tools and provider usage
  ├─ direct costs / third parties / rights
  ├─ QA, coordination, support and rework allowance
  ├─ pass-through policy
  ├─ overhead policy
  └─ standard cost basis snapshot
```

No todo debe ser obligatorio para todos los servicios. Pero el modelo debe distinguir “no aplica” de “no se capturó”.

### 5.5 Cost card de cotización

Antes de emitir una cotización, el motor debe poder producir internamente una tarjeta como esta:

```text
Cost card
  quote/version/service line
  recipe version
  resources and quantities
  contribution cost
  fully loaded cost
  target margin / floor margin
  recommended price
  standard/actual basis per component
  source refs and snapshot dates
  FX and period
  confidence and coverage
  assumptions
  overrides and approvers
  blockers
```

La vista cliente puede ocultar costos y fuentes. La vista interna de Nexa, MCP y API debe reutilizar esta misma salida gobernada.

## 6. Cómo entra Globe sin contaminar el modelo

Globe debe aportar un hecho de consumo técnico, no una reinterpretación local del saldo comercial.

El hecho mínimo que Greenhouse necesita leer mediante un reader gobernado es:

```text
operation_id / generation_id
provider_id / model_route
input and output units, cuando existan
compute / storage / transfer, cuando existan
retries / failed attempts / moderation or recovery cost
workspace / organization / client
service / engagement / quote line
period and currency
source snapshot / confidence / reconciliation status
```

La unidad comercial de créditos se mantiene en Globe y no se convierte automáticamente en costo. Puede existir una regla de pricing de créditos, pero debe estar separada de la medición de costo técnico.

El bridge correcto es:

```text
Globe operation ledger/fact
  → provider/model cost basis
  → allocation to service/engagement/quote line
  → contribution and fully_loaded views
  → actual vs standard variance
```

El estado live auditado no contiene todavía un reader Greenhouse gobernado para costo real de consumo, margen o costo por cliente de Globe. El puente de funding/credits no demuestra ese costo; son responsabilidades distintas.

## 7. Contabilidad, taxonomía y plan de cuentas

La necesidad contable de Efeonce sí incluye plan de cuentas y contabilidad general, pero la secuencia correcta no es bloquear costos hasta terminar el GL.

### 7.1 Lo que debe definirse ahora

Debe existir una taxonomía económica estable y un mapping provisional hacia las fuentes:

| Familia | Ejemplos de tratamiento de costos |
|---|---|
| Labor interna | costo directo, pool de capacidad, provisiones |
| Labor externa | tercero directo o proveedor de delivery |
| Tools/SaaS | seat, suscripción, usage, pass-through |
| Providers/compute/Globe | costo variable técnico, provider observado o modelado |
| Terceros/rights | direct cost, derecho o pass-through |
| Overhead | pool compartido con driver explícito |
| Finanzas | costo financiero separado de delivery |
| Impuestos/regulatorio | categoría no operativa o tratamiento definido por contabilidad |
| Revenue | servicio, reembolso, otros ingresos separados |
| Suspenso | evidencia incompleta; nunca esconderla en overhead |

El repo ya tiene `economic_category` y `distribution_lane` útiles para esta taxonomía. No deben confundirse todavía con un plan legal numerado.

Tampoco debe confundirse `cost_behavior` con `cost_lane`: una suscripción SaaS puede ser `shared_operational_overhead` como lane y `committed` como comportamiento; un uso de provider de Globe puede ser `client_direct_non_labor` y `variable`; una contratación adicional puede ser `member_direct_labor` y `incremental`. Esta separación es necesaria para que el mismo hecho pueda responder preguntas de corto y largo plazo sin duplicarse.

### 7.2 Lo que requiere una decisión contable formal

Antes de crear un plan legal, hay que fijar con el contador y la entidad:

- entidades legales y moneda funcional;
- cuentas de activo, pasivo, patrimonio, ingreso y gasto;
- devengo y reconocimiento de revenue;
- impuestos y reportes locales;
- cierres, periodos bloqueados y ajustes;
- ownership del GL y de los asientos;
- si Greenhouse será sistema contable o sistema de gestión conectado a otro ledger.

El [Conceptual Framework de IFRS](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2026/issued/part-a/conceptual-framework-for-financial-reporting.pdf?bypass=on) trata la información financiera de propósito general como una capa con objetivo y restricciones propios; por eso el plan legal no debe improvisarse dentro del cotizador. La contabilidad de gestión puede usar información adicional y otras bases de medición, pero debe preservar mappings y reconciliación.

## 8. Punto de partida recomendado

### Fase 0 — ADR y contrato, sin construir tablas aún

Decidir y registrar:

1. `cost object` primario y jerarquía quote → service line → engagement → period;
2. lanes standard/actual y contribution/fully_loaded;
3. unidad y base de cantidad de cada tipo de costo;
4. política de capacidad práctica para TDABC;
5. pools y drivers de overhead;
6. taxonomía económica y distribución;
7. política de margen: target, floor, approval y markup/pass-through;
8. confidence, freshness, fallback y bloqueo;
9. reader y contrato de costos de Globe.

Esta fase requiere ADR porque cambia source of truth, pricing, finanzas y el bridge cross-runtime.

### Fase 1 — Una vertical en el cotizador existente

Extender el módulo actual para que pueda cotizar, internamente y con replay:

1. un diseñador por persona y por rol;
2. `EFG-002 Servicio de Diseño Digital Full Funnel`;
3. un servicio SEO definido en catálogo, sin asumir que AEO es SEO;
4. al menos un direct cost y un tool pass-through;
5. el mismo caso en USD y CLP con FX snapshot;
6. una cotización emitida y una nueva versión con un override aprobado.

La salida debe ser una cost card interna y la persistencia de su baseline. Si algún costo crítico falta, el resultado debe ser `blocked` o `low confidence`, no un fallback silencioso de mercado.

### Fase 2 — Fuentes de actual y capacidad

Completar, en orden de impacto:

1. labor loaded y provisiones pendientes;
2. capacidad práctica y costo por hora con política versionada;
3. tools con unidad explícita y reconciliación de gastos;
4. direct costs, terceros y rights;
5. pools de overhead con drivers;
6. Globe cost facts mediante reader gobernado;
7. snapshots cerrados, freshness y reconciliación.

### Fase 3 — Real versus cotizado

Vincular ejecución a la misma línea de servicio y producir:

```text
variance de horas
variance de tasa
variance de tools/uso
variance de Globe
variance de direct costs
variance de overhead
variance de revenue/margen
```

Sin esta fase, el estándar no aprende y el cotizador volverá a depender de intuición.

### Fase 4 — Management Accounting y plan legal

Cuando existan actuals confiables:

- cierre de gestión;
- P&L por cliente, servicio, business line y entidad;
- forecast y variance;
- mappings completos al plan económico;
- ADR separado para GL legal, integraciones fiscales y ownership de asientos.

## 9. Criterios de aceptación de la primera vertical

La vertical no está lista por “calcular un precio”. Debe demostrar:

- misma entrada produce el mismo baseline por replay;
- toda línea tiene unidad, fuente, periodo, FX y método;
- standard y actual no se mezclan;
- contribution y fully loaded son distinguibles;
- markup no se etiqueta como margen;
- un costo de tool total no se multiplica como unitario sin asignación explícita;
- pass-through no consume el mismo margen interno que delivery;
- faltantes críticos bloquean o degradan visiblemente;
- cada override tiene razón, usuario, fecha y delta;
- la cotización y sus versiones conservan provenance suficiente;
- el mismo cálculo es consumible desde UI, Nexa, MCP y API;
- no se presume que SEO = AEO ni que crédito Globe = costo.

## 10. Lo que falta, ordenado por severidad

### Bloqueadores de verdad económica

- contrato de cost object por servicio/cotización/engagement;
- costo estándar versionado;
- distinción contribution/fully_loaded;
- unidad de costo de herramientas;
- convergencia de rutas legacy/V2;
- provenance de costo por línea;
- política de capacidad práctica;
- servicio SEO explícito y recetas completas para servicios sin recipe.

### Bloqueadores de costo real

- labor/provisiones fully loaded;
- snapshots de tool cost basis confiables;
- costos directos, terceros y rights;
- overhead pools y drivers;
- Globe usage-to-cost reader;
- bridge actual versus quote.

### Necesidad contable posterior, ya documentada

- taxonomía económica completa y mappings;
- cierre de gestión y P&L;
- plan de cuentas legal;
- journal/GL y reportes fiscales;
- gobernanza de periodos cerrados y ajustes.

## 11. Conclusión

La duda sobre MLCM es válida: **MLCM es correcto para una parte fundamental, pero insuficiente como modelo de costeo comercial completo**.

La mejor decisión no es reemplazarlo. Es ubicarlo en su lugar:

```text
MLCM = costo real de recursos y capacidad
TDABC/standard = costo planificable de esfuerzo
Job-order = costo de la cotización/servicio/engagement
ABC selectivo = overhead explicable
Actual/variance = aprendizaje y control
Plan de cuentas/GL = destino contable formal
```

Por eso el primer trabajo no debe ser “implementar toda la contabilidad” ni “terminar MLCM”. Debe ser el contrato de costos y una vertical de cotización que pruebe que Efeonce puede dejar de cotizar por intuición sin crear una segunda plataforma.

## 12. Evidencia y fuentes

### Fuentes del repo

- [Auditoría financiera y de cotización](./GREENHOUSE_FINANCE_COST_QUOTING_AUDIT_2026-08-02.md)
- [Evaluación inicial de MLCM y contabilidad de costos](./GREENHOUSE_MLCM_FIT_AND_COST_ACCOUNTING_START_2026-08-02.md)
- [Member Loaded Cost Model V1](../../architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md)
- [Management Accounting Architecture V1](../../architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md)
- [Cost Intelligence Architecture V1](../../architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md)
- [Service Composition Catalog / TASK-465](../../tasks/complete/TASK-465-service-composition-catalog-ui.md)
- [Cotizador funcional](../../documentation/finance/cotizador.md)
- [TASK-777: canonical expense distribution](../../tasks/complete/TASK-777-canonical-expense-distribution-and-shared-cost-pools.md)
- [Engagement phases, outcomes and lineage](../../../migrations/20260507135645984_task-803-engagement-phases-outcomes-lineage.sql)

### Fuentes externas de método

- [Kaplan y Anderson — Time-Driven Activity-Based Costing](https://hbr.org/2004/11/time-driven-activity-based-costing)
- [OpenStax — Job Order Costing versus Process Costing](https://openstax.org/books/principles-managerial-accounting/pages/4-1-distinguish-between-job-order-costing-and-process-costing)
- [OpenStax — Standard Cost](https://openstax.org/books/principles-managerial-accounting/pages/8-1-explain-how-and-why-a-standard-cost-is-developed)
- [IFRS — Conceptual Framework for Financial Reporting](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2026/issued/part-a/conceptual-framework-for-financial-reporting.pdf?bypass=on)

**Boundary:** este documento es una evaluación y una propuesta de decisión. No crea tablas, no cambia pricing, no crea cuentas legales, no activa snapshots de tools, no modifica Globe y no afirma que un defecto de unidad ya esté produciendo cobros incorrectos en producción.
