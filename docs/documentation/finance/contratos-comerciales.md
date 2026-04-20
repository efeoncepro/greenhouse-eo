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

## Acuerdos marco (MSA)

Greenhouse ahora modela también el paraguas legal que vive por encima de un contrato puntual:

- **MSA / acuerdo marco**: define condiciones legales y comerciales estables con un cliente enterprise.
- **Contrato / SOW**: define el alcance operativo concreto que se ejecuta bajo ese marco.

Esto permite responder preguntas que antes quedaban fuera del portal:

- qué contratos cuelgan de un mismo acuerdo marco
- qué cláusulas legales gobiernan ese contrato
- cuándo vence o se renueva el marco legal
- qué PDF firmado es el documento vigente

La surface nueva vive en:

- `/finance/master-agreements`
- `/finance/master-agreements/[id]`

Desde ahí Finance puede revisar el acuerdo, sus cláusulas versionadas y los contratos vinculados.

### Firma electrónica

La implementación base usa ZapSign como proveedor de firma:

- Greenhouse puede crear una solicitud de firma desde un PDF borrador del MSA
- el webhook de ZapSign sincroniza el estado del documento y guarda el PDF firmado como asset privado
- las URLs temporales de ZapSign no se usan como source of truth; el documento firmado queda persistido en `greenhouse_core.assets`

Esto deja lista la base para operar contratos marco firmados sin depender de Drive como único registro.

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
- `/finance/master-agreements` — lista de acuerdos marco
- `/finance/master-agreements/[id]` — detalle del MSA, cláusulas y contratos relacionados

La vista está pensada para operación financiera y comercial. No reemplaza todavía las tabs de inteligencia ni el pipeline híbrido; convive con ellas mientras avanza la ola contractual.

## Qué todavía no cubre

Este corte no resuelve todavía:

- redlines y negociación colaborativa del documento legal
- overrides de cláusulas por contrato individual desde UI
- alertas automáticas de expiración < 90 días
- remoción total del anchor legacy por quote

Esas piezas siguen en tasks posteriores del programa comercial.
