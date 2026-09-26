# TASK-1877 — Flow público de equipos humano-agente

> Estado: contrato de planificación, no flujo publicado. Sin nuevo command ni permiso implícito.

## Nodos

S0 entrada orgánica / paid / outbound / referida → S1 landing neutral → S2 lectura del proceso →
S3 ruta por job (operaciones o marketing, sin crear lead) → S4 conversación de fit por Growth
Form/Meeting existente y verificado → S5 receipt real → S6 decisión comercial humana
(Blueprint pagado, First Hybrid Team si el diseño existe, otro servicio o no-fit).

La ruta CMO puede llegar de la landing AEO; el contexto público observado en búsqueda no pasa
automáticamente al agente de campaña. La ruta de plataforma puede llegar de HubSpot o Salesforce;
la nueva página no la obliga a abandonar su proveedor.

## Estados y transiciones

| Desde | Evento | Hacia | Gate |
|---|---|---|---|
| S0 | URL solicitada | S1 | 200/canonical/robots; nunca enviar PAID a 404 |
| S1 | Leer job | S2/S3 | Sin formulario oculto ni atribución de lead |
| S3 | CTA | S4 | Surface, consentimiento y CTA binding verificados |
| S4 | Envío/reunión aceptada | S5 | Receipt del host, no mensaje optimista |
| S4 | Error/denegación | S4 | Recuperación y contacto alternativo |
| S5 | Discovery humano | S6 | Scope, buyer, presupuesto y no-fit explícitos |

## Handoff y medición

- Comercial recibe job y origen con consentimiento, no un diagnóstico inventado por la página.
- Marketing/Content, Creative, Media y RevOps/platform se incorporan al delivery sólo según alcance.
- Medir conversación cualificada por proceso/buyer y avance a contrato; form starts/sends son señales
  previas con denominadores distintos.
- El enlace desde Home/HubSpot/AEO (TASK-1878) se activa sólo tras readback de S1 y S4.
