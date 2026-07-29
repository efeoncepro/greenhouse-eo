# ANAM HubSpot Managed Service end-to-end

> **Tipo:** Documentación funcional
> **Versión:** 1.4
> **Actualizado:** 2026-07-24
> **Cliente/portal:** ANAM / `19893546`
> **Canon técnico:** [`../../architecture/kortex/hubspot-as-a-service/README.md`](../../architecture/kortex/hubspot-as-a-service/README.md)
> **Manual:** [`../../manual-de-uso/hubspot-as-a-service/operar-anam-hubspot-managed-service.md`](../../manual-de-uso/hubspot-as-a-service/operar-anam-hubspot-managed-service.md)
> **Servicios:** [Customer Agent gestionado](../../services/hubspot-as-a-service/hubspot-customer-agent-managed-service.md) · [RevOps, automatización y paneles](../../services/hubspot-as-a-service/hubspot-revops-architecture-automation-and-dashboards.md)

## Qué es

Efeonce opera HubSpot para ANAM como un servicio gestionado que conecta captación, venta, servicio contratado,
renovación, atención y, en el siguiente slice de construcción, facturación. ANAM es dueño de su portal, registros
y paneles. Greenhouse conserva el método, decisiones, evidencia, documentación y skills; no replica datos ANAM
en CRM, Finance, Income, Account 360 ni analytics de Efeonce.

```text
Contacto -> Lead -> Empresa -> Negocio -> Cotización + líneas -> Servicio -> renovación
                              |                              |
                              |                              +-> Ticket/caso humano
                              +-> Unidad ANAM -> Evento de facturación (diseñado, aún no operativo)
```

El Negocio representa oportunidad y adjudicación; la línea conserva el componente vendido; Service representa
el alcance contratado/entregado; Ticket representa una acción humana con SLA; el futuro Billing Event representa
un ítem fuente de facturación. No se deben aplanar estos hechos en Company o Deal.

## Customer Agent y landing

La landing live abre el chat oficial con tres intenciones: cotizar, seguimiento del servicio y requerimientos de
calidad. Customer Agent responde conocimiento documentado, reúne contexto y deriva a una persona del equipo cuando
hace falta una acción humana. El nombre del assignee se mantiene como routing interno y no forma parte del copy
visible. El source pack independiente y reconciliado versiona las 23 fuentes en uso, las
17 respuestas cortas, el catálogo de 356 registros y el contrato de identidad/directrices/handoff/canales.

El readback del 24 de julio confirmó que Customer Agent volvió a operar, con live chat activo y cobertura de todas
las horas. El bloqueo administrativo observado el 17 de julio queda como antecedente histórico, no como estado
vigente. Los ajustes posteriores de Seguimiento, Calidad y copy neutral fueron publicados tras una comprobación
previa sin problemas. El simulador live no respondió en la regresión posterior y esa prueba debe repetirse.

## Estado por fase

| Fase | Estado | Resultado vigente |
|---|---|---|
| Customer Agent y landing | Operativo; mejora publicada | Landing, tres intents, 23 fuentes y canal activo. Ajustes de Seguimiento, Calidad y handoff neutral publicados; regresión live complementaria pendiente. |
| Growth y calidad | Cerrada | Data Quality `21144697`, Growth `19708354`, siete assets y outcome exacto. |
| Catálogo | Suficiente | 505/506 líneas tienen Product; 220/220 líneas ganadas resuelven a Product. |
| Service y contrato | Piloto live | Grupo, diez propiedades, asociaciones, cinco Services y workflow `1852406585`. |
| Renovación | Pipeline gobernado; medición bloqueada | Etapas semánticas, creación en `Por revisar` y compuertas live. GRR/NRR y lineage de Service siguen bloqueados por hechos reales y materialización por línea. |
| Retención/Fidelización | Piloto, no oficial | Retención `21152855` (4 reports); Fidelización `21152950` (3). |
| Tickets/SLA | Planificada | Se ejecuta después de las bases comerciales. |
| Facturación | Diseño listo; construcción pendiente | Intake tenant-scoped, Account Unit + Billing Event y profiler read-only. |

## Growth por mercado, sector y región

Los reportes `340896790`, `340897291` y `340897635` están rotulados `histórico parcial`, filtran `Ganado` y
sólo incluyen Deals cuya Company tiene la dimensión conocida. Muestran valor comercial del Deal en moneda de la
empresa; no facturación, ingreso reconocido, TAM/SAM ni población completa.

La cobertura Deal→Company pasó de 595/1.240 a 629/1.240 tras 34 asociaciones determinísticas. El saldo sin
Company es **611 calculado**, no un nuevo readback del widget DQ: el reporte conserva baseline live 645. El gate
oficial sigue siendo al menos 95% de cobertura elegible y dimensional.

### Geografía de ejecución del Deal

La sede y la ejecución se modelan por separado. `region_de_chile` en Company conserva la región de sede;
`zona` (`Región`) en Deal registra una o más regiones donde se ejecuta el negocio dentro de Chile; y
`ef_paises_de_ejecucion` (`Países de ejecución`) registra uno o más países de Latinoamérica donde se presta el
negocio. Esta última propiedad quedó live el 2026-07-17 como multiselección de 20 países y su schema fue leído de
vuelta desde HubSpot.

La creación fue prospectiva y existen cero Deals poblados; no se agregó backfill, workflow ni reporte. Desde el
2026-07-17 `Países de ejecución` es obligatorio al mover Growth a `Cierre ganado 100%` o Renovación a `Renovado`.
La captura corresponde al owner/equipo comercial antes o durante la adjudicación. Como un Deal puede seleccionar varios países o regiones, estas dimensiones sirven para slicing
diagnóstico, pero sus grupos no pueden sumarse como un total consolidado sin deduplicar por Deal.

## Gobierno de los pipelines comerciales

Los Deals nuevos requieren Company y una fecha de cierre elegida conscientemente; se retiró la fecha automática
a 60 días. Growth sólo permite creación ordinaria en `Potencial 10%`. `Radar 0%` no cambió porque la
precalificación ocurre en Lead. Calificado e Interesado exigen `Paso siguiente`; Hot agrega `Monto original`; el
cierre ganado exige países, monto original y variación; los cierres negativos exigen motivo.

Renovación conserva los stage IDs y ahora expresa el proceso real desde `Por revisar` hasta `Renovado`, `No
renovado` o `No aplica / Desestimado`. La creación ordinaria parte en `Por revisar`; las cuatro etapas abiertas
exigen `Paso siguiente`. Las automatizaciones de tareas por entrada futura a etapa quedaron diseñadas, no
publicadas: requieren un slice con owner, vencimiento, notificación y prueba sin enrolamiento histórico.

## Metas y visualización comercial

El 24 de julio quedaron operativas tres familias de metas nativas en HubSpot para siete responsables:

- adjudicación en `Crecimiento - Nuevos Negocios`: cuatro ingenieros de venta con 400 UF/mes cada uno y tres
  asistentes comerciales con 150 UF/mes cada uno; total 2.050 UF/mes y 24.600 UF/año;
- 50 correos enviados por persona por semana;
- 5 reuniones programadas por persona por semana.

El panel [`ANAM — Backlog comercial (PILOTO)`](https://app.hubspot.com/reports-dashboard/19893546/view/21329151)
conserva los informes nativos preexistentes y agrega la cola comercial abierta, más nueve visualizaciones de
metas: indicador agregado, evolución temporal y desglose por responsable para adjudicación, correos y reuniones.
Las metas también se pueden revisar en
[`HubSpot Goals`](https://app.hubspot.com/goals/19893546/overview).

No se fabricaron equivalencias para metas que la suscripción no representa fielmente. `Llamadas hechas` cuenta
todas las llamadas y no permite limitarse a los cinco tipos acordados; no existen plantillas nativas equivalentes
para volumen de ofertas/oportunidades calificadas ni tasa de cierre superior a 30%; y Fidelización todavía no
tiene métrica, valor, cadencia ni población aprobadas.

La meta de adjudicación es sólo Growth. El backlog comercial combina Growth y Renovación, por lo que el panel
mantiene `(PILOTO)` hasta que ANAM entregue una meta de Fidelización o apruebe una comparación estratégica
limitada a Growth.

## Calidad de datos y disciplina comercial

Data Quality no es un score cosmético ni una superficie de culpa: es una cola operativa con denominador,
excepciones, owner, acción y cadencia. Parte de la deuda corresponde a captura/adopción: asociaciones y campos
que el proceso comercial debía completar. Esa atribución sólo procede cuando punto de captura, owner y omisión
están evidenciados; de lo contrario se clasifica como causa no resuelta, schema/plataforma, fuente/migración o
integración. La respuesta sostenible combina ownership, requisitos por etapa, colas y automatización en origen;
no inferencia masiva.

El slice aprobado cargó segmento+región en 471 Companies y sector en 65. Quedaron retenidos 22 records bajo 11
claves duplicadas, tres ambigüedades y 527 no emparejados. Para Deal→Company se ejecutaron 34 pares exactos; 113
coincidencias por dominio requieren revisión y 498 siguen held. Los duplicados ANAM no se fusionaron/corrigieron.

## Service, automatización y pilotos

Los cinco Services conservan Company, Deal de origen, línea fuente, owner, moneda, TCV y ARR. Sus hechos de
activación son sintéticos y están marcados para QA; `fields_ready` demuestra propagación, no validación ANAM.

El workflow `1852406585` produjo cinco tareas humanas de revisión, mantiene re-enrollment apagado y no crea
Services, completa hechos, cambia etapas ni habilita KPI. Un workflow simple Deal→Create Service fue descartado:
un Deal puede tener varias líneas y la materialización correcta necesita idempotencia por línea adjudicada.

Retención y Fidelización no declaran GRR, NRR, NPS ni health score. Antes de retirar `(PILOTO)`, ANAM debe
ratificar/reemplazar los datos y deben reconciliarse cobertura, períodos y denominadores.

## Siguiente slice de construcción: facturación

La foundation será un control plane privado y aislado. Primero, un profiler sin escrituras recibe el workbook,
valida estructura/monedas, detecta anomalías y propone reconciliación auditable. Cada Código ANAM/CeCo es Account
Unit y cada ítem fuente un Billing Event idempotente. Company, Deal y Service sólo se asocian determinísticamente.

CLP, UF y USD permanecen separadas. SharePoint puede ser adaptador, pero el carril principal diseñado es intake
administrado con assets privados y GCS. No habrá writes HubSpot hasta aprobar schema, matching, totales, rollback
y lote exacto.

Billing es el siguiente slice de construcción comprometido, no “lo único pendiente”: continúan approval-gated
la ratificación de Services, asociaciones restantes, KPI oficiales y automatizaciones; Tickets/SLA y otras fases
permanecen en backlog.

El inventario completo de trabajo abierto, su prioridad, owner, dependencias, aprobación y criterio de cierre
vive en el [backlog canónico ANAM](../../architecture/kortex/hubspot-as-a-service/anam-open-work-and-exit-gates-2026-07-17.md).
Incluye automatizaciones de pipeline, QA controlada, Calidad de Datos (DQ), Service/renovación, KPI oficiales,
Customer Agent, facturación y Tickets/SLA. Ningún ítem documentado equivale por sí solo a autorización de write.

## Reglas de confianza

- Un KPI oficial necesita período, definición, denominador, cobertura y owner.
- Un diagnóstico parcial debe revelar la limitación en título e interpretación.
- Los montos se leen por moneda y grain real; el formato no implica conversión.
- Región de sede es aditiva; geografía de ejecución multi-select no debe sumar el Deal varias veces.
- Toda mutación requiere change set, aprobación, snapshot, lote acotado, readback y rollback.

## Referencias

- [Catálogo HubSpot as a Service](../../services/hubspot-as-a-service/README.md)
- [Roadmap](../../architecture/kortex/hubspot-as-a-service/anam-revops-implementation-roadmap-phases-2026-07-16.md)
- [Modelo vivo](../../architecture/kortex/hubspot-as-a-service/anam-revops-data-model-and-object-synergies-v1.md)
- [Handoff](../../architecture/kortex/hubspot-as-a-service/anam-next-session-handoff-2026-07-16.md)
- [QA Customer Agent](../../audits/ANAM_CUSTOMER_AGENT_QA_REPORT_2026-07-16.md)
- [Customer Agent live source pack](../../architecture/kortex/hubspot-as-a-service/anam-customer-agent-source-pack/README.md)
