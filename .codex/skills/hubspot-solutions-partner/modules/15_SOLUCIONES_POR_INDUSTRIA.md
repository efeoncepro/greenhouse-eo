# 15 · Soluciones HubSpot por industria

> Canon: `docs/services/hubspot-as-a-service/HUBSPOT_OFFER_ARCHITECTURE_V2.md` y `sectors/`.

## Regla central

Un sector no es un servicio y un Hub no es un servicio. Efeonce vende responsabilidad sobre un outcome; la
industria modifica el workflow, los objetos, las integraciones, el compliance, los KPIs y el anti-fit; HubSpot aporta
las primitives.

## Router

| Sector | Ficha | Estado inicial | Integración/anti-fit load-bearing |
| --- | --- | --- | --- |
| Servicios profesionales/B2B | `sectors/professional-services.md` | `approved_for_validation` | PSA, time tracking, contabilidad; no prometer resource planning o revenue recognition. |
| SaaS/tecnología | `sectors/saas-technology.md` | `approved_for_validation` | product usage y billing; no sustituir telemetría, CDP o billing engine. |
| Manufactura/distribución | `sectors/manufacturing-distribution.md` | `validated_for_discovery` | ERP/MRP/WMS como source of truth; CPQ/territorios/latencia pueden descalificar. |

Educación, salud, finanzas, real estate/construcción, retail/ecommerce y nonprofit permanecen en incubación. Una
página oficial de industria de HubSpot demuestra que existe un use case del vendor, no que Efeonce tenga práctica
probada.

## Qualification flow

1. Identifica subsegmento, trigger, JTBD, operator/champion y buying group.
2. Dibuja el workflow end-to-end y el primer valor observable.
3. Declara systems of record y qué no sustituye HubSpot.
4. Mapea familia Efeonce → superficie HubSpot → entregable → evidencia.
5. Verifica integraciones, volumen, latencia, reconciliación y fallback.
6. Para cada agente, verifica estado, knowledge/context, tools, permisos, autonomía, handoff, consumo y evaluación.
7. Corre los ocho gates: provider fit, source of truth, data model, integración, compliance, adoption, agent safety y
   delivery economics.
8. Devuelve `fit | fit_with_conditions | hybrid_recommended | alternative_provider_recommended | no_fit |
   unknown_requires_evidence`.

## Reglas de publicación

- No afirmar especialización por tener una landing, badge, logo o caso del vendor.
- No publicar un sector con estado inferior a `approved_for_validation`.
- Separar evidencia HubSpot, perfil del partner, claim propio y runtime/caso autorizado de Efeonce.
- Verificar la nomenclatura y disponibilidad de producto al cotizar y publicar.
- La evaluación inicial es gratuita y limitada; un blueprint pagado requiere entregable autónomo.

