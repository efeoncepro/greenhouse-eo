# Benchmark de servicios HubSpot y arquitectura de oferta — 2026-08-30

> **Tipo:** research + benchmark competitivo secundario
> **Decisión informada:** redefinir el catálogo público y operativo de la práctica HubSpot de Efeonce
> **Estado:** cerrado para esta decisión; todo dato de producto o perfil debe reverificarse antes de uso público
> **Confidence global:** media-alta

## 1. Pregunta y método

La investigación respondió tres preguntas:

1. ¿Cómo cambió la superficie de HubSpot en 2026 y qué implica para un partner?
2. ¿Cómo estructuran su oferta los partners regionales y best-in-class?
3. ¿Qué familias de solución y sectores puede sostener Efeonce sin convertir features en servicios ni sobreafirmar prueba?

Se usaron fuentes primarias de HubSpot para producto y disponibilidad; Solutions Directory y sitios públicos para
posicionamiento de partners; y el canon interno para evidencia/capacidad de Efeonce. La revisión competitiva cubrió
11 firmas. No se normalizaron precios porque solo cinco publicaban algún número o rango comparable; la ausencia de
precio público no se trató como debilidad.

### Peer set

- Regional/LATAM: Cyberclick, Triario, Digifianz, HAL, Grows, RevOps LATAM, Revenue Hub Latam y Manyflow.
- Best-in-class global: SmartBug Media, Aptitude 8 y New Breed.
- Referencia propia: [Efeonce Group](https://ecosystem.hubspot.com/marketplace/solutions/efeoncepro).

Dimensiones: puerta de entrada; implementación/migración; Managed RevOps; AI/agentes; cobertura del lifecycle;
sectorización; IP/packaging; y prueba pública.

## 2. Cambios de producto load-bearing

| Hallazgo | Evidencia | Confidence | Consecuencia |
| --- | --- | --- | --- |
| HubSpot declara seis productos sobre Smart CRM: Marketing, Sales, Service, Content, Data y Revenue. | [Customer Platform](https://www.hubspot.com/products/customer-platform) | Alta | La oferta no puede seguir usando el mapa anterior ni presentar Agent Hub como otro Hub equivalente. |
| Agent Hub centraliza agentes preconstruidos, custom y agentic workflows, pero continúa marcado beta. | [Agent Hub](https://knowledge.hubspot.com/ai/understand-agent-hub) | Alta | Es una familia de servicio agentic con gate de elegibilidad; no se promete un roster fijo ni SLA general. |
| Revenue Hub conecta quote-to-cash y Contracts centraliza revenue comprometido; ciertas funciones siguen sujetas a beta, seat o territorio. | [Revenue Hub](https://www.hubspot.com/products/revenue), [Contracts](https://knowledge.hubspot.com/contracts/create-contracts) | Alta | Revenue Lifecycle merece una familia propia; la promesa end-to-end en Chile requiere validación Finance/Legal/SII/ERP. |
| Customer Success Workspace incorpora Customers, Projects, Revenue y health scores. | [Customer Success Workspace](https://knowledge.hubspot.com/customer-success/set-up-and-manage-the-customer-success-workspace) | Alta | Service ya no se limita a tickets/Customer Agent: abarca adopción, riesgo, renovación y expansión. |
| Projects y Services son objetos CRM con API. | [Projects](https://developers.hubspot.com/docs/api-reference/latest/crm/objects/projects/guide), [Services](https://developers.hubspot.com/docs/api-reference/latest/crm/objects/services/guide) | Alta | Habilitan workflows de delivery; no son por sí mismos un PSA ni servicios comerciales de Efeonce. |
| Marketing Studio y AEO amplían Marketing/Content con planificación AI y visibilidad en motores de respuesta. | [Marketing Studio](https://www.hubspot.com/products/marketing/studio), [Marketing Hub](https://www.hubspot.com/products/marketing) | Alta | AEO se integra a Marketing/Content; no debe absorber la narrativa de toda la práctica. |

## 3. Benchmark competitivo

### Patrón de la mediana

- conversación o evaluación inicial sin costo;
- implementación, onboarding y migración como núcleo;
- lenguaje general de RevOps e IA;
- menú por Marketing/Sales/Service;
- logos o listados sectoriales sin workflow profundo;
- precios mayoritariamente privados;
- Revenue Hub, contratos y agentes distribuidos en páginas o claims aislados.

### Patrón del top quartile

- doble puerta: evaluación comercial gratuita y audit/blueprint pagado solo cuando existe un entregable autónomo;
- alcance publicado con duración, responsabilidades, exclusiones y post-go-live;
- AI como readiness, contexto, agentes, gobierno, piloto, enablement y optimización continua;
- combinación de capabilities nativas, agentes custom, integraciones/MCP y managed operations;
- verticales expresados como modelo de datos, workflow, integración, compliance y caso;
- prueba visible: reviews, casos, acreditaciones y especialistas nombrados.

Ejemplos verificables: [Triario](https://ecosystem.hubspot.com/marketplace/solutions/triario-agencia-de-inbound-marketing)
posiciona RevOps, migración, integraciones y agentes custom; [Digifianz](https://ecosystem.hubspot.com/marketplace/solutions/digifianz)
combina implementación con industrias explícitas; [SmartBug](https://ecosystem.hubspot.com/marketplace/solutions/smartbug-media)
presenta lifecycle, arquitectura, integración y despliegue de IA con una superficie de prueba extensa.

## 4. Brechas y oportunidades para Efeonce

| Prioridad | Brecha u oportunidad | Acción |
| --- | --- | --- |
| P0 | El catálogo reducía la práctica a dos servicios canónicos y elevaba Customer Agent a categoría. | Adoptar seis familias por outcome y conservar Customer Agent como componente. |
| P0 | Docs públicos aún afirmaban un roster fijo de “tres agentes GA”. | Sustituir por inventario versionado: feature, estado, portal/tier/seat/crédito y readback. |
| P0 | Revenue Hub, Contracts, Customer Success, Projects y Services no tenían lugar coherente. | Integrarlos en Revenue Lifecycle y Service/Customer Success & Delivery. |
| P1 | La evaluación gratuita y la auditoría pagada se confundían. | Hacer gratuita la evaluación de fit/cotización; cobrar solo blueprint con artefacto independiente. |
| P1 | White space regional en Revenue Lifecycle y agentic operations. | Desarrollar pilotos y prueba antes de prometer cobertura end-to-end. |
| P1 | Efeonce figura Gold, pero su perfil tiene cero reviews. | Obtener reviews verificadas, casos estructurados y acreditaciones/especialistas visibles. |
| P2 | Sectorización amplia sin IP pública suficiente. | Lanzar servicios profesionales/B2B, SaaS/tech y manufactura/distribución; incubar el resto. |

El perfil de Efeonce afirma más de 100 implementaciones, 35+ certificaciones y experiencia en 12 industrias. Son
claims propios del perfil, no prueba independiente. Hasta que exista evidencia enlazable, no se usan como pilar de
la landing.

## 5. Decisión resultante

Se adopta la arquitectura de seis familias documentada en
[`HUBSPOT_OFFER_ARCHITECTURE_V2.md`](../../services/hubspot-as-a-service/HUBSPOT_OFFER_ARCHITECTURE_V2.md),
con modos de entrega transversales y overlays sectoriales. La landing organiza la navegación por resultados; los
Hubs, workspaces, agentes y objetos respaldan cada solución. La evaluación inicial sin costo sigue siendo la puerta
normal de cotización.

## 6. Limitaciones

- El producto HubSpot cambió varias veces durante 2026; nombres, packaging, betas y precios son perecederos.
- El benchmark usa superficies públicas y no contratos/SOW privados de los peers.
- Los hallazgos de “mediana” y “top quartile” son cualitativos; no deben convertirse en un ranking numérico.
- La prueba sectorial propia de Efeonce sigue concentrada; la arquitectura propuesta es una prioridad de desarrollo,
  no una afirmación de escala ya lograda.

