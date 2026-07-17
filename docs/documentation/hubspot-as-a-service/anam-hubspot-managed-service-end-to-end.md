# ANAM HubSpot Managed Service end-to-end

> **Tipo:** Documentación funcional
> **Versión:** 1.0
> **Actualizado:** 2026-07-16
> **Cliente/portal:** ANAM / `19893546`
> **Canon técnico:** [`../../architecture/kortex/hubspot-as-a-service/README.md`](../../architecture/kortex/hubspot-as-a-service/README.md)
> **Manual:** [`../../manual-de-uso/hubspot-as-a-service/operar-anam-hubspot-managed-service.md`](../../manual-de-uso/hubspot-as-a-service/operar-anam-hubspot-managed-service.md)

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
calidad. Customer Agent responde conocimiento documentado, reúne contexto y deriva a Maria Paz Haeger cuando
hace falta una acción humana. La licencia y 30.000 créditos pagados fueron confirmados; el consumo sigue siendo
una métrica operativa.

La configuración live y QA están documentadas, pero al cierre no se localizó un source pack Markdown ANAM
independiente que refleje todo el knowledge cargado. Hasta crearlo, el runtime del portal, `customer-agent.md`,
la documentación CMS y el informe QA son el conjunto de evidencia. Owner: servicio gestionado Efeonce.
Condición de retiro: source pack versionado y reconciliado antes del próximo cambio de knowledge.

## Estado por fase

| Fase | Estado | Resultado vigente |
|---|---|---|
| Customer Agent y landing | Cerrada, en operación | Landing, tres intents, handoff y QA conversacional. |
| Growth y calidad | Cerrada | Data Quality `21144697`, Growth `19708354`, siete assets y outcome exacto. |
| Catálogo | Suficiente | 505/506 líneas tienen Product; 220/220 líneas ganadas resuelven a Product. |
| Service y contrato | Piloto live | Grupo, diez propiedades, asociaciones, cinco Services y workflow `1852406585`. |
| Renovación | Bloqueada | Requiere hechos reales, materialización por línea y reglas aprobadas. |
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

## Reglas de confianza

- Un KPI oficial necesita período, definición, denominador, cobertura y owner.
- Un diagnóstico parcial debe revelar la limitación en título e interpretación.
- Los montos se leen por moneda y grain real; el formato no implica conversión.
- Región de sede es aditiva; geografía de ejecución multi-select no debe sumar el Deal varias veces.
- Toda mutación requiere change set, aprobación, snapshot, lote acotado, readback y rollback.

## Referencias

- [Roadmap](../../architecture/kortex/hubspot-as-a-service/anam-revops-implementation-roadmap-phases-2026-07-16.md)
- [Modelo vivo](../../architecture/kortex/hubspot-as-a-service/anam-revops-data-model-and-object-synergies-v1.md)
- [Handoff](../../architecture/kortex/hubspot-as-a-service/anam-next-session-handoff-2026-07-16.md)
- [QA Customer Agent](../../audits/ANAM_CUSTOMER_AGENT_QA_REPORT_2026-07-16.md)
