# Revisión de brochures HubSpot — insumo comercial, no canon

**Fecha:** 2026-07-26
**Owner:** Efeonce — RevOps & CRM
**Estado:** `Approved for validation`
**Propósito:** convertir material comercial histórico en evidencia útil para el catálogo vigente sin importar claims, nombres de producto o packaging obsoleto.

## Material revisado

- `Alineación/4. Comercial/Brochures/Brochure Efeonce x Hubspot.pdf` — brochure principal, creado en octubre de 2025.
- `Alineación/4. Comercial/Brochures/Efeonce Solutions Brochure/Efeonce CRM Solutions Brochure.pdf` — versión de diciembre de 2024.
- `Alineación/4. Comercial/Brochures/Brochure Viejos/Brochure - HubSpot.pdf` — versión de julio de 2024.
- `Alineación/4. Comercial/Brochures/Brochure Viejos (Efeoncepro)/Efeonce CRM Solutions Brochure Global/Efeonce CRM solutions Brochure.pdf` — versión de enero de 2025.

Las fechas y rutas identifican el material consultado; no lo convierten en fuente de verdad. La fuente vigente de la oferta es [`docs/services/hubspot-as-a-service/README.md`](../../services/hubspot-as-a-service/README.md), junto con las skills y la arquitectura que enlaza.

## Lo que se incorpora

El brochure principal contiene una secuencia comercial sólida que se adopta como patrón de discovery y delivery:

1. diagnóstico estratégico y assessment del stack;
2. arquitectura técnica y funcional;
3. implementación modular y por fases;
4. capacitación y enablement por rol;
5. monitoreo, soporte y optimización continua.

También se incorporan como capacidades de la práctica: modelo de datos y procesos, integraciones, automatización,
dashboards, scoring, documentación, adopción y operación posterior. Son capacidades; no implican que cada deal incluya
todos los Hubs, integraciones o features.

## Traducción a la arquitectura vigente

| Capa | Contrato vigente |
|---|---|
| Marca paraguas | **Efeonce**, responsable de la relación comercial. |
| Línea de negocio | **RevOps & CRM**, la práctica que vende y opera el resultado. |
| Product brand | **Kortex**, cuando aplica como capa de inteligencia, versionado y delivery programático. |
| Plataforma/provider | **HubSpot**, sujeto a licencias, límites, créditos, permisos y cambios del proveedor. |
| Control plane | **Greenhouse**, cuando forma parte del engagement y de la observabilidad operativa. |
| Ofertas | Diagnostic; CRM & HubSpot Architecture; HubSpot Implementation; Data, Automation & Lifecycle; Managed CRM Operations; Customer Agent / AI Operations. |

La oferta se presenta como resultado de negocio y sistema operable, no como venta aislada de un Hub. La licencia puede
ser una capa del engagement, pero no es la promesa completa de Efeonce.

## Claims y elementos que quedan fuera del canon

No se reutilizan sin verificación fechada las cifras del brochure —por ejemplo, reducciones de TCO, porcentajes de
eficiencia o adopción, cantidad de clientes, tasas de renovación y citas de analistas—. Tampoco se importan literalmente
precios, nombres de paquetes, disponibilidad de funcionalidades, créditos, beneficios de partner ni referencias a
productos que puedan haber cambiado.

El framing antiguo de `MaaS`, los bundles cerrados, el lenguaje de “HubSpot como solución completa” y la promesa de
implementar todo de una vez quedan como material histórico. Cualquier claim externo necesita fuente primaria vigente,
fecha `as-of`, alcance, denominador y aprobación comercial.

## Implicaciones de venta y aceptación

- La entrada recomendada es un diagnóstico o assessment que reduzca riesgo y produzca una decisión clara.
- El scope debe separar advisory, arquitectura, implementación, adopción y operación gestionada.
- Cada propuesta debe declarar source of truth, dependencias de licencia y permisos, responsabilidades del cliente,
  criterios de aceptación y evidencia esperada.
- Los resultados se miden por calidad de datos, adopción, automatización efectiva, velocidad y conversión del proceso,
  visibilidad del pipeline y outcomes acordados; no por métricas genéricas de plataforma.
- El brochure no habilita pricing público, claims públicos, venta self-serve ni promesas de disponibilidad.

## Decisión

**Usar los brochures como input de posicionamiento y memoria comercial; no como source of truth.** La práctica vigente
se documenta en el catálogo de servicios y se ejecuta mediante el loop `intake -> inventory -> design -> propose ->
approve -> execute -> verify -> document -> measure`.
