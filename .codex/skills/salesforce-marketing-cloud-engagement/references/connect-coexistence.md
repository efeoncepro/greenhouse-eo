# Connect y coexistencia

## Marketing Cloud Connect

Confirma org de CRM, tenant de Engagement, versión, managed package, integration user, permisos, BUs conectadas, objetos sincronizados, filtros, latencia y dirección de cada flujo. Documenta qué usa synchronized data sources, Salesforce Data Entry Events y actividades de CRM.

No trates Connect como réplica total, tiempo real garantizado ni mecanismo universal de consentimiento. Aísla el integration user, evita permisos administrativos generales y prueba el efecto de cambios de ownership, deduplicación y estado de contacto.

## Engagement y Next

Clasifica cada capacidad en `retain`, `integrate`, `rebuild`, `retire` o `undecided`. Inventaría journeys, automations, SQL, DEs, contenido, canales, integraciones, identidad, consentimiento, reporting y operación. Compara capacidad real y entitlement; no traduzcas 1:1 ni prometas migración automática.

En coexistencia, asigna un owner por dominio:

- perfil e identidad;
- consentimiento y preferencias;
- segmentación;
- contenido;
- decisión y journey;
- activación por canal;
- respuesta y CRM writeback;
- medición y atribución.

Evita audiencias duplicadas, frecuencia fragmentada, loops de sincronización y métricas incompatibles. Engagement+ se valida contra el contrato y la org, no sólo contra la página de pricing.
