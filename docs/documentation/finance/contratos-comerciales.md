# Contratos comerciales

Los contratos comerciales son la entidad que representa el acuerdo post-venta que Greenhouse está ejecutando para un cliente. En el portal conviven con las cotizaciones, pero no significan lo mismo:

- **Cotización**: propuesta comercial, pricing, aprobación y envío.
- **Contrato / SOW**: acuerdo operativo vigente que puede vivir más tiempo que una cotización puntual y puede acumular renovaciones o modificaciones.

## Qué resuelve

Antes, Finance y Commercial seguían demasiadas cosas usando solo `quotation_id`. Eso funcionaba para proyectos one-off, pero se quebraba en retainers y renovaciones:

- un mismo contrato lógico podía tener varias quotes históricas
- la cadena documental podía quedar repartida entre quotes distintas
- la rentabilidad real no tenía un anchor contractual estable
- las renovaciones se medían a nivel quote, no a nivel contrato vigente

Con la lane de contratos, el portal ya puede responder mejor qué acuerdo está activo, qué documentos cuelgan de él y cómo va su margen real.

> Detalle técnico: [GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md), [GREENHOUSE_EVENT_CATALOG_V1.md](../../architecture/GREENHOUSE_EVENT_CATALOG_V1.md).

## Cómo se relaciona con cotizaciones

Cada contrato puede tener varias cotizaciones asociadas:

- **originator**: la quote que dio origen al contrato
- **renewal**: quote usada para renovar
- **modification**: quote usada para modificar alcance o condiciones
- **cancellation**: relación reservada para cierres/cancelaciones futuras

Esto permite que una cuenta retainer mantenga un contrato operativo estable aunque haya quotes nuevas por renovación anual o por ajuste de scope.

## Qué documentos cuelgan del contrato

La cadena documental financiera ya soporta doble anchor:

- Purchase Orders
- HES
- Income / factura emitida

Cada documento puede seguir conservando su relación con la quote original, pero ahora también puede quedar ligado al `contract_id`. Para la lectura operativa del contrato, el portal usa esa relación contractual para mostrar la cadena completa.

## Rentabilidad y renovaciones

Los contratos ya tienen dos capas operativas nuevas:

- **Rentabilidad contractual por período**: materializada en snapshots mensuales por contrato.
- **Renovaciones contractuales**: recordatorios y eventos de vencimiento a nivel contrato, sin depender solo del vencimiento de una quote.

La versión anterior a nivel quote sigue coexistiendo mientras termina la transición, así que algunos dashboards todavía combinan ambos granos según la surface.

## Dónde se ve en el portal

Finance ahora tiene una lane dedicada:

- `/finance/contracts` — lista tenant-safe de contratos
- `/finance/contracts/[id]` — detalle con overview, quotes relacionadas, cadena documental y rentabilidad

La vista está pensada para operación financiera y comercial. No reemplaza todavía las tabs de inteligencia ni el pipeline híbrido; convive con ellas mientras avanza la ola contractual.

## Qué todavía no cubre

Este corte no resuelve todavía:

- MSA / clause library formal
- dashboard ejecutivo de MRR / ARR
- remoción total del anchor legacy por quote

Esas piezas siguen en tasks posteriores del programa comercial.
