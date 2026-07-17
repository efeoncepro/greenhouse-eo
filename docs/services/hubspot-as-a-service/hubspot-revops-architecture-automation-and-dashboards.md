# Servicio — Arquitectura RevOps, automatización y paneles HubSpot

> **Clave:** `hubspot.revops-managed`
> **Familia:** HubSpot as a Service
> **Tipo:** discovery + arquitectura + implementación + reporting + Managed Ops
> **Estado de la oferta:** activa
> **Implementación de referencia:** ANAM, portal `19893546`
> **Service owner:** Efeonce Group SpA

## Promesa del servicio

Convertir HubSpot en un sistema RevOps gobernado y observable: cada hecho vive en el objeto correcto, los datos
se capturan con ownership, las automatizaciones tienen límites y recuperación, y los paneles responden preguntas
de negocio con definiciones, denominadores y calidad visible.

El servicio no se limita a crear propiedades o gráficos. Incluye discovery, modelo de datos, cambio controlado,
remediación acotada, automatización, paneles, QA, adopción y continuidad gestionada.

## Problema que resuelve

- campos y objetos creados desde correos sin definición ni consumers;
- pipeline usado como sustituto de tipo de ingreso o resultado;
- Deals sin Company, duplicados y dimensiones incompletas que sesgan ventas por industria o región;
- montos que mezclan cotizado, adjudicado, facturado, reconocido o cobrado;
- workflows que crean registros con el grain equivocado o sin idempotencia;
- dashboards atractivos pero sin período, denominador, cobertura o acción;
- deuda de captura atribuida indiscriminadamente a plataforma o a “disciplina comercial”.

## Resultado esperado

El cliente recibe un modelo RevOps vivo, un diccionario de datos, change sets verificables, colas de calidad,
automatizaciones controladas y paneles que separan resultados oficiales, diagnósticos parciales y pilotos. La
operación deja evidencia suficiente para decidir el siguiente slice sin reiniciar discovery.

## Alcance incluido

### 1. Discovery y arquitectura

- procesos, decisiones, lifecycle, stages, owners, fuentes, usuarios e integraciones;
- inventario de objetos, propiedades, pipelines, asociaciones, reportes, dashboards y workflows;
- definición de grain y fact ownership para Contact, Lead, Company, Deal, Product, line item, Service, Ticket y
  objetos/eventos adicionales cuando sean necesarios;
- reconciliación de reuniones, tareas, adjuntos y runtime antes de ejecutar.

### 2. Schema y gobierno de propiedades

Cada propiedad declara definición, objeto, estándar reutilizable, internal name estable, tipo/opciones, fuente,
owner, requiredness, backfill, consumers, privacidad y política de deprecación. El label visible permanece natural;
el internal name es técnico, estable y en `snake_case`.

### 3. Calidad de datos y remediación

- baseline, denominador, excepciones, owner, acción y cadencia;
- causa separada entre schema/plataforma, fuente/migración, integración y captura/adopción;
- partición `apply`, `review-only` y `held`;
- snapshots, manifests, readback y rollback por slice;
- asociaciones sólo cuando una cadena explícita converge en una identidad única;
- duplicados, dominio-only, ambigüedad y fuzzy match retenidos para revisión humana.

### 4. Automatización

- diseño de triggers, elegibilidad, acciones, errores, re-enrollment y recovery;
- positive/negative path y evidencia de ejecución real;
- tareas humanas cuando el dato requiere ratificación;
- idempotencia por grain de destino;
- workflows simples descartados cuando no pueden iterar líneas o preservar cardinalidad.

### 5. Reporting y paneles

Los paneles se diseñan en tres capas:

1. pulso ejecutivo con KPIs definidos;
2. drivers y tendencias por dimensión confiable;
3. diagnóstico y colas accionables por owner.

Cada reporte registra business question, período, fecha, población elegible, medida, dimensión, comparación,
visualización, owner y limitaciones. Un panel Data Quality es una torre de control, no una superficie de culpa.

### 6. Adopción y Managed Ops

- requisitos de captura en el momento correcto del proceso;
- queues, training y revisión por owner;
- auditoría periódica de schema, valores, automatizaciones y reportes;
- QBR/roadmap de mejoras y transición desde pilotos hacia métricas oficiales;
- continuidad documental y backlog con approvals/dependencias explícitas.

## Entregables

| Entregable | Evidencia de aceptación |
|---|---|
| Discovery reconciliado | Decisiones estables, notas tentativas, tareas y material superado clasificados. |
| Modelo RevOps vivo | Grain, fact owner, asociaciones y proyecciones permitidas por objeto. |
| Diccionario/change set | Current/proposed, impacto, aprobación, rollback y consumers. |
| Schema y readback | Internal names, opciones, fórmulas y valores representativos verificados. |
| Data Quality control tower | Denominador, excepciones, owner, causa, acción y cadence. |
| Automatizaciones | Stored config más ejecución positiva/negativa y recovery. |
| Dashboards/reportes | IDs, filtros, fecha, denominador, resultado y caveats. |
| Roadmap por fases | Cerrado, piloto, bloqueado, approval-pending y siguiente slice. |
| Manual y continuidad | Operación diaria/semanal/mensual, troubleshooting y escalamiento. |

## Workstreams configurables

- portal foundation, usuarios, permisos y convenciones;
- arquitectura comercial, lifecycle, pipeline y outcome;
- segmentación, industria/sector, mercado y región;
- Company identity, asociaciones, deduplicación y parent-child;
- catálogo, Products y line items;
- Service, contratos, renovación, Retención y Fidelización;
- Tickets/SLA y casos humanos;
- facturación/ERP como integración con evento fuente e idempotencia;
- dashboards ejecutivos, operativos y de calidad;
- operación gestionada, adopción, QBR e incident/recovery.

## Fuera de alcance por defecto

- inferencia masiva de identidad, merges o backfills sin aprobación y rollback;
- declarar facturación o revenue reconocido desde el amount comercial de Deal;
- combinar monedas sin política FX y grain explícito;
- publicar GRR/NRR, NPS, health score o KPI oficial desde pilotos/sintéticos;
- reemplazar decisiones del cliente por clasificación AI o smart properties;
- integración ERP/billing, custom object o desarrollo Kortex no incluido en el SOW;
- licencias, permisos de super admin o cambios de suscripción no autorizados.

## Responsabilidades

| Parte | Responsabilidad |
|---|---|
| Efeonce | Método RevOps, diseño, change sets, ejecución aprobada, readback, QA, documentación y Managed Ops. |
| Cliente | Definiciones, owners, fuentes, acceso, aprobación, ratificación de hechos y disciplina de captura. |
| HubSpot | Runtime, APIs, builders, límites, indexación, licencias y comportamiento de workflows/reportes. |

## Métricas y gates

- cobertura de asociaciones y dimensiones, con población elegible;
- completitud y excepciones por owner/punto de captura;
- resultado comercial por tipo de ingreso y outcome exacto;
- ventas por segmento, sector o región sólo sobre cohortes cubiertas;
- ejecución de workflows, rejects y recovery;
- Services elegibles para renovación/retención con moneda, periodicidad y vigencia;
- adopción: registros completos en el momento requerido, no sólo backfill posterior;
- tiempo de resolución de colas y reducción de trabajo manual.

Un KPI oficial exige definición, período, denominador, cobertura y owner. Bajo el gate, el título debe declarar
`histórico parcial`, `diagnóstico` o `PILOTO` y mantener visible la cola faltante.

## Caso de referencia ANAM

La implementación ANAM materializó una base RevOps por fases:

- Growth `19708354` y Data Quality `21144697` operativos;
- segmento/región en 471 Companies y sector estratégico en 65, sin crear records ni merges;
- tres gráficos por segmento, sector y región como `histórico parcial`;
- 34 asociaciones Deal→Company determinísticas, con cobertura 629/1.240; el resto continúa en cola;
- schema nativo de Service, cinco Services controlados y workflow de revisión `1852406585`;
- Retención `21152855` con cuatro reportes y Fidelización `21152950` con tres, todos piloto;
- inputs de activación sintéticos marcados, sin GRR/NRR oficial ni backfill masivo;
- modelo futuro Account Unit + Billing Event diseñado para ingesta idempotente y multimoneda, aún no operativo.

El caso prueba el servicio y también sus controles: no se fusionaron Companies duplicadas, no se usó dominio
como identidad automática, no se retiró `(PILOTO)` y no se convirtió un gráfico parcial en métrica oficial.

## Fuentes y evidencia

- [Informe Word detallado](../../architecture/kortex/hubspot-as-a-service/reports/ANAM_Informe_Detallado_Arquitectura_RevOps_Paneles_2026-07-17.docx)
- [Roadmap por fases](../../architecture/kortex/hubspot-as-a-service/anam-revops-implementation-roadmap-phases-2026-07-16.md)
- [Modelo vivo](../../architecture/kortex/hubspot-as-a-service/anam-revops-data-model-and-object-synergies-v1.md)
- [Documentación funcional](../../documentation/hubspot-as-a-service/anam-hubspot-managed-service-end-to-end.md)
- [Manual operativo](../../manual-de-uso/hubspot-as-a-service/operar-anam-hubspot-managed-service.md)
- [Canon técnico](../../architecture/kortex/hubspot-as-a-service/README.md)
