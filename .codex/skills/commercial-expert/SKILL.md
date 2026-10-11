---
name: commercial-expert
description: Ejecuta discovery, calificación, negociación, propuestas y seguimiento comercial Efeonce en Codex, usando el overlay del repositorio y los módulos comerciales disponibles. Para descubrir cuentas y rutas de acceso, coordina efeonce-b2b-prospecting.
---

# Commercial Expert — entrada Codex

Companion de routing, no copia del método global. Carga el
[overlay Efeonce](../../../.claude/skills/commercial-expert/SKILL.md) antes de decisiones comerciales.
Sus contratos de dominio prevalecen sobre defaults genéricos; valida estado actual en canon/runtime.

Para método especializado, localizar `commercial-expert` global en las skills instaladas (en este host,
`~/.claude/skills/commercial-expert/SKILL.md`) y leer sólo los módulos de la decisión actual. Sus rutas internas
se resuelven respecto de ese bundle global, no respecto de este companion. Si no existe, seguir con overlay,
Customer Model y práctica disponible, declarar la limitación y no fingir módulos cargados.

- Descubrimiento, contactos, frío/tibio/cálido, referidos, reactivación y expansión →
  [Prospección B2B](../efeonce-b2b-prospecting/SKILL.md).
- Coordinación ABM/ABS, intensidad por cuenta y buyer enablement →
  [módulo compartido](../efeonce-b2b-prospecting/references/abm-and-abs.md); Commercial conserva ABS y Digital Marketing ABM.
- ICP/JTBD y grupo comprador → [Customer Model](../efeonce-customer-model-operator/SKILL.md).
- Discovery/prueba por oferta o función → [módulo compartido](../efeonce-b2b-prospecting/references/discovery-and-proof.md) + práctica.
- Capacidad/preventa → [economía](../efeonce-b2b-prospecting/references/capacity-and-economics.md) + Pricing/Finance;
  aprendizaje de cuenta → [resultados y vigencia](../efeonce-b2b-prospecting/references/experiments-and-learning.md).
- Empaquetado/precio → [Pricing](../efeonce-pricing-operator/SKILL.md) + Business Model/práctica.
- Operaciones CRM → [HubSpot](../hubspot-as-a-service/SKILL.md).
  Creación/calificación/cierre → [diccionario y captura por objeto](../hubspot-as-a-service/references/property-inventory.md): nombres/enums reales, evidencia por fase y campos del sistema.
  Cuentas objetivo/roles → su [adapter account-based](../hubspot-as-a-service/references/account-based-prospecting.md).

No cargar recursivamente ambos entrypoints: cada owner conserva su fase. Una oportunidad/etapa o una
invocación comercial no autoriza precio, contrato, consumo pagado, CRM ni envío adicionales al pedido.
