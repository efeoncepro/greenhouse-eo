# Implementación y operación

## Blueprint mínimo

1. Outcomes, KPIs, owners y sistemas de registro.
2. Inventario de fuentes, claves, retención, residencia y clasificación.
3. Modelo Data 360: streams, mappings, DMO, data spaces, reglas de identidad y reconciliación.
4. Consentimiento: captura, propósito, canal, jurisdicción, supresión, cambio y prueba auditable.
5. Segmentos y activaciones con cardinalidad esperada y control de freshness.
6. Contenido, marca, CMS, dominios, sender authentication y approvals.
7. Marketing Flows: entradas, decisiones, fallos, límites, versiones, pausing y rollback.
8. Agentforce: caso, grounding, acciones permitidas, human-in-the-loop, datos y créditos.
9. Observabilidad: errores, consumo, deliverability, audience drift, performance y owner.

## Secuencia segura

Usa `discover → design → provision → configure → test → approve → activate → reconcile → operate`. La aprobación para diseñar no autoriza provisionar, activar o enviar.

Antes de activar exige:

- org/release/edición y entitlements leídos;
- permisos least-privilege y separación admin/marketer;
- test contacts y segmentos con exclusiones;
- seed list, dominios y sender verificados;
- consentimiento y unsubscribe probados end-to-end;
- presupuesto/alertas de mensajes, Data 360 y Agentforce;
- fault paths, pause, rollback y owner on-call;
- reconciliación de counts desde fuente hasta envío.

## Managed operations

Opera un cadence de salud de datos, identidad, consentimiento, flows, canales, consumo, deliverability, seguridad y releases. No uses “campaña enviada” como evidencia suficiente: confirma población, exclusiones, delivery, gasto y efecto medible.
