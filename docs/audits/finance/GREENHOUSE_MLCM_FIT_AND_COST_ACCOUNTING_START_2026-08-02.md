# Evaluación de MLCM y punto de partida para contabilidad de costos

**Fecha de corte:** 2026-08-02
**Alcance:** Greenhouse, cotizaciones de servicios y economía operativa de Globe
**Tipo:** evaluación de ajuste de modelo y recomendación de inicio
**Estado:** recomendación propuesta; no reemplaza ni acepta todavía un ADR de source of truth

## 1. Decisión resumida

El `Member Loaded Cost Model (MLCM)` es una buena base para calcular el costo real de la capacidad humana y distribuirlo hacia clientes. No es suficiente, tal como está escrito, para modelar toda la necesidad de Efeonce.

La recomendación es:

> **Conservar MLCM como backbone del costo real de recursos, pero extenderlo dentro de un modelo híbrido de costo por servicio, cotización y ejecución.**

No conviene:

- desechar MLCM y crear otro modelo completamente separado;
- implementar MLCM V1 de forma literal y asumir que resolverá el cotizador;
- construir primero un libro mayor legal para después recién conocer el costo de vender un servicio.

Sí conviene:

- comenzar por contabilidad de costos;
- definir desde ahora la relación con contabilidad general y plan de cuentas;
- hacer que el cotizador existente consuma una base de costo gobernada;
- construir el costo planificado y el costo real como dos lanes conectadas;
- incorporar después la contabilidad de gestión y, si Efeonce lo decide formalmente, la contabilidad legal.

## 2. La necesidad que el modelo debe resolver

La pregunta no es únicamente:

> ¿Cuánto cuesta tener a una persona trabajando este mes?

También debe responder:

> ¿Cuánto cuesta vender y entregar este servicio específico, con esta receta, este cliente, este periodo, estas herramientas, este uso de Globe y este nivel de margen?

Eso exige al menos cuatro objetos relacionados:

1. **Recurso:** persona, rol, herramienta, proveedor, capacidad de Globe, tercero o costo compartido.
2. **Servicio/engagement:** lo que Efeonce entrega y cómo lo opera.
3. **Cotización:** el costo y precio planificados para una oportunidad concreta.
4. **Ejecución:** lo que realmente se consumió, facturó y pagó.

MLCM cubre bien el primer objeto y parte del cuarto. El gap está en conectar esos objetos sin que el servicio o la cotización queden reducidos a una simple suma de miembros.

## 3. Evidencia revisada

### Arquitectura

`GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md` se declara como spec raíz del modelo económico, pero su estado de implementación es explícitamente `SPEC — no implementado`. Su modelo central es:

```text
Provider × Tool × Member × Client × Period
        → member loaded cost
        → client member cost
        → client full cost
```

La spec tiene aciertos importantes:

- snapshots temporales e inmutabilidad;
- degradación honesta cuando faltan datos;
- separación de costo laboral, tools y overhead;
- policies explícitas para distribuir overhead;
- intención de reemplazar atajos como `allocated_client_id`.

Pero deja el margin lane de recipe versus reality para V2 y no incluye como hecho central el costo planificado por servicio/cotización.

### Runtime de cotizaciones y servicios

El módulo existente ya tiene:

- Pricing Engine V2;
- simulación y autoría server-side;
- catálogo de roles, tools, márgenes, FX y addons;
- service recipes de roles y herramientas;
- versionado, snapshots y audit trail de cotizaciones;
- consumidores para Nexa, MCP y API Platform.

La comprobación live del catálogo mostró:

| Objeto | Filas live | Lectura |
|---|---:|---|
| `service_modules` | 28 | Identidades de servicios |
| `service_pricing` | 7 | Servicios comerciales activos |
| `service_role_recipe` | 7 | Recetas de roles parciales |
| `service_tool_recipe` | 14 | Recetas de tools parciales |
| `sellable_roles` | 38 | Catálogo de roles |
| `greenhouse_ai.tool_catalog` | 34 | Catálogo de tools |
| `greenhouse_core.tool_catalog` | 29 | Catálogo paralelo que requiere convergencia |

Los servicios activos tienen esta cobertura:

| SKU | Servicio | Receta de roles | Receta de tools |
|---|---|---:|---:|
| EFG-001 | Onboarding HubSpot Marketing Pro | 2 | 5 |
| EFG-002 | Servicio de Diseño Digital Full Funnel | 3 | 6 |
| EFG-003 | Servicio de Performance y Paid Ads | 2 | 3 |
| EFG-004 | Consultoría Go-To-Market Efeonce | 0 | 0 |
| EFG-005 | Implementación CRM Sales Hub | 0 | 0 |
| EFG-006 | Auditoría Técnica AEO | 0 | 0 |
| EFG-007 | Retainer Loop Marketing | 0 | 0 |

No se encontró un servicio comercial denominado SEO. `Auditoría Técnica AEO` no se considera automáticamente equivalente a SEO.

La auditoría financiera previa también verificó que:

- `tool_provider_cost_basis_snapshots` tiene 0 filas live;
- `member_capacity_economics` tiene 136 filas, de las cuales 104 están `partial`;
- `role_blended_cost_basis_snapshots` tiene 12 filas;
- `role_modeled_cost_basis_snapshots` tiene 0 filas;
- solo 3 de 135 líneas comerciales tienen `pricingV2CostBasisKind` explícito persistido.

## 4. Evaluación de ajuste de MLCM

| Necesidad | MLCM V1 | Evaluación |
|---|---|---|
| Costo loaded por persona | Sí | Conservar como backbone |
| Costo por rol sin persona asignada | Parcial, vía lanes blended/modeled externas | Integrar como standard cost derivado, no como actual |
| Costo por hora o esfuerzo | Implícito en FTE/periodo | Hacerlo explícito y versionado |
| Servicio compuesto | No es el grano principal | Agregar `service/engagement/work package` |
| Cotización planificada | Margin lane diferida a V2 | Debe entrar desde el primer slice |
| Herramientas subscription | Sí, conceptualmente | Separar costo contractual esperado de gasto real reconciliado |
| Herramientas por uso | Parcial | Requiere usage fact; no siempre se puede asignar a un miembro |
| Globe | No suficiente | Requiere operación/proveedor/cliente/quote, no solo credit unit |
| Overhead | Sí, con policies | Mantener, pero separar contribution y fully loaded |
| Direct costs/pass-through/rights | Parcial | Agregar lanes explícitas fuera de labor |
| Actual versus quoted | Diferido | Debe ser una salida de V1, no una promesa futura abstracta |
| Plan de cuentas | Fuera de scope | Documentarlo como capa contable separada con mappings |
| Cierre y snapshots | Sí, conceptualmente | Mantener y conectar a quote baseline y actuals |

## 5. Qué debe cambiar del modelo

### 5.1 El miembro no debe ser el único objeto de costo

El miembro sí es el átomo correcto para costo laboral y capacidad humana. No es el átomo universal para:

- una licencia compartida;
- una llamada de proveedor;
- una operación de Globe;
- un tercero contratado para un entregable;
- derechos, stock o pass-through;
- un costo directo asociado a un servicio o proyecto;
- una reserva de riesgo o costo financiero.

El modelo debe conservar `member` como recurso, pero permitir que el costo nazca también en otros recursos y se atribuya al objeto correcto mediante drivers explícitos.

### 5.2 Deben existir dos vistas de costo

Para cotizar no basta un único número de “costo loaded”. Se necesitan:

1. **Costo variable/contribution cost:** costo incremental de aceptar y entregar el trabajo.
2. **Costo fully loaded:** costo sostenible incluyendo capacidad humana, herramientas, overhead asignable y políticas de absorción.

El cotizador debe mostrar ambos internamente y aplicar la política de margen correspondiente. De lo contrario, un servicio puede parecer rentable antes de overhead y destruir margen después de absorber estructura.

### 5.3 Deben separarse costo estándar y costo real

Para cotizar un rol sin conocer la persona concreta, el sistema necesita un costo estándar o modelado. Para analizar ejecución necesita costo real.

```text
standard cost / recipe  →  cotización y baseline
actual cost / usage     →  ejecución y cierre
                         →  variance
```

El costo estándar no debe hacerse pasar por costo real. Ambos deben conservar fuente, fecha, vigencia, método y confianza.

### 5.4 El grano mensual no alcanza para el cotizador

MLCM está organizado alrededor de periodos mensuales. Eso funciona para cierre y P&L, pero una cotización puede ser:

- un sprint;
- un proyecto de varias semanas;
- un retainer mensual;
- un servicio con hitos;
- una operación recurrente con uso variable.

Se necesita un baseline por `quotation/version/service_line/engagement`, que después pueda distribuirse por periodos y compararse con actuals.

### 5.5 Globe no debe modelarse como “créditos = costo”

El crédito de Globe es una unidad comercial gobernada, no automáticamente una moneda, hora, token o costo contable. El costo debe derivarse de:

- operación válida;
- modelo/proveedor utilizado;
- consumo técnico y costo variable;
- retries/fallas;
- soporte o excepción incremental;
- cliente, workspace, servicio y periodo;
- derechos o pass-through cuando existan, separados.

La economía de créditos debe llegar al cost model mediante un reader gobernado de Globe. No se debe derivar del saldo o del precio comercial del crédito.

## 6. Modelo recomendado: Cost Object & Cost Basis Model

El nombre de trabajo recomendado es **Cost Object & Cost Basis Model**, con MLCM como componente de recursos humanos.

```text
Plan/taxonomía contable y dimensiones
        ↓
Hechos financieros, payroll, providers y Globe
        ↓
Cost pools y cost basis estándar/real
        ↓
Receta del servicio / effort / usage / direct costs
        ↓
Baseline de cotización versionado
        ↓
Costo ejecutado por engagement y periodo
        ↓
Variance, margen y P&L de gestión
```

### Dimensiones mínimas

- legal entity;
- business line;
- cost center;
- client/organization;
- service/module;
- engagement/project/work package;
- quotation y quotation version;
- contract/retainer cuando exista;
- period;
- currency y FX snapshot;
- member/role;
- provider/tool;
- cost account/economic category.

### Clases mínimas de costo

- labor directa;
- cargas y provisiones laborales;
- capacidad interna no asignada/bench;
- tools por seat;
- provider/compute/usage variable;
- Globe variable cost;
- terceros y subcontratistas;
- derechos, licencias y pass-through;
- overhead operacional compartido;
- costo financiero;
- reservas de riesgo, retries y soporte incremental.

## 7. Contabilidad y plan de cuentas: destino documentado

La contabilidad general, el plan de cuentas y el libro mayor sí forman parte de la necesidad de Efeonce. No deben confundirse con el primer entregable de contabilidad de costos.

### Capas que deben permanecer separadas

| Capa | Responsabilidad | Momento |
|---|---|---|
| Finanzas transaccionales | Facturas, gastos, pagos, cobros, bancos, FX y reconciliación | Ya existe parcialmente |
| Taxonomía/plan económico | Clasificación de labor, tools, providers, overhead, financiero, pass-through y revenue | Definir ahora |
| Contabilidad de costos | Cost pools, drivers, costo estándar/real, asignación y costo de servir | Primer foco |
| Management Accounting | P&L, cierre, variance, forecast y control de gestión | Después de actual confiable |
| Contabilidad legal | Asientos, plan de cuentas legal, libro diario/mayor, balance y reportes fiscales | Lane posterior y decisión formal |

### Plan mínimo que sí conviene definir ahora

Sin inventar códigos legales, se debe definir el catálogo semántico y sus mappings para:

- labor y remuneraciones;
- cargas/provisiones laborales;
- tools y SaaS;
- proveedores/compute/Globe;
- terceros y delivery externo;
- rights/pass-through;
- overhead operacional;
- ventas y revenue;
- costos financieros;
- impuestos y partidas no operativas;
- cuentas puente/suspenso para evidencia incompleta.

Cada cuenta o categoría debe declarar naturaleza, tratamiento de costo, posibilidad de atribución, dimensión obligatoria y mapping desde la fuente transaccional.

No se asignarán números de un plan legal ni reglas tributarias sin una decisión contable formal y validación profesional. Eso sería adivinar.

## 8. Por dónde comenzar

### Slice 0 — Decisiones económicas y contrato de datos

Antes de migrar tablas MLCM, fijar:

1. costo objeto principal: servicio/engagement/quote line;
2. lanes `standard`, `actual`, `contribution` y `fully_loaded`;
3. drivers de asignación por clase de costo;
4. política de overhead para cada vista;
5. taxonomía económica y dimensiones mínimas;
6. gates de cobertura, stale data y confianza;
7. política de margen floor/target y overrides.

### Slice 1 — Vertical de costo para cotización

Construir una primera vertical usando el cotizador existente, no otro módulo:

- un diseñador por persona/rol;
- `Servicio de Diseño Digital Full Funnel` (EFG-002);
- un servicio SEO definido explícitamente, sin reutilizar AEO por inferencia.

La salida interna de cada caso debe ser una **cost basis card** con:

- recursos y cantidades;
- costo variable/contribution;
- costo fully loaded;
- precio por margen floor/target;
- fuentes y snapshots;
- cobertura y confidence;
- supuestos editables y auditados;
- bloqueo si falta un dato crítico.

Este slice valida la pregunta principal del negocio: “¿cuánto me cuesta vender y entregar esto?”

### Slice 2 — Actual cost foundation

Completar las fuentes que la vertical necesita:

- fully-loaded labor, incluyendo provisiones pendientes;
- costo por hora/capacidad;
- cost basis de herramientas y reconciliación con gastos;
- tools por seat y usage facts;
- overhead pools y drivers;
- costos de terceros, rights y pass-through;
- bridge gobernado de Globe;
- snapshots de estándar y actual.

### Slice 3 — Cotizado versus real

Conectar cada baseline de cotización con ejecución:

- horas/capacidad real;
- tools/usage real;
- costos de Globe;
- gastos directos;
- revenue realizado;
- drift de costo y margen;
- drivers de la desviación.

### Slice 4 — Management Accounting y plan completo

Cuando exista un actual confiable:

- cierre de periodo;
- P&L por cliente, servicio, unidad de negocio y entidad;
- variance y forecast;
- plan de cuentas económico completo;
- mappings fiscales/legales;
- decisión formal sobre ledger legal, si Greenhouse debe poseerlo.

## 9. Lo que no debemos hacer primero

- No crear un segundo cotizador.
- No migrar toda la spec MLCM sin validar el grano de servicio.
- No usar `member_loaded_cost` como sustituto de costo de toda operación.
- No tratar el precio comercial de Globe como costo interno.
- No usar el mercado como fallback de costo.
- No crear un plan de cuentas legal con códigos inventados.
- No declarar margen confiable mientras labor, tools o Globe tengan cobertura incompleta.

## 10. Recomendación final

El inicio correcto no es “implementar MLCM completo” ni “construir contabilidad general completa”. Es construir una primera **vertical de contabilidad de costos para cotización**, reutilizando el módulo de cotizaciones y extendiendo MLCM donde realmente aporta.

La primera unidad de trabajo debe entregar una respuesta verificable para tres casos concretos:

```text
designer individual
servicio de diseño digital compuesto
servicio SEO compuesto
```

Si esa vertical produce costos reproducibles, trazables y razonables, se extiende hacia actuals, Globe, margen real y P&L. Si no, corregimos el modelo antes de convertirlo en infraestructura transversal.

Esta recomendación es una evaluación de ajuste y un punto de partida. La decisión de convertirla en arquitectura canónica requiere un ADR posterior, especialmente para `cost object`, `standard vs actual`, `contribution vs fully_loaded`, plan económico y bridge de Globe.

## 11. Fuentes revisadas

- [Member Loaded Cost Model V1](../../architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md)
- [Management Accounting Architecture V1](../../architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md)
- [Cost Intelligence Architecture V1](../../architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md)
- [Commercial Quotation Architecture V1](../../architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md)
- [Service Composition Catalog](../../tasks/complete/TASK-465-service-composition-catalog-ui.md)
- [Cotizador funcional](../../documentation/finance/cotizador.md)
- [Auditoría de costos, cotización y contabilidad](./GREENHOUSE_FINANCE_COST_QUOTING_AUDIT_2026-08-02.md)

**Boundary de este documento:** no crea tablas, no cambia pricing, no crea cuentas contables, no modifica MLCM y no altera datos live.
