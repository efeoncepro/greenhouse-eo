# Digital Sales Room y el Workspace del Deal

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.0
> **Creado:** 2026-07-15 por Claude (con Julio Reyes)
> **Última actualización:** 2026-07-15 por Claude
> **Documentación técnica:** [GREENHOUSE_DIGITAL_SALES_ROOM_DECISION_V1.md](../../architecture/GREENHOUSE_DIGITAL_SALES_ROOM_DECISION_V1.md) + [ARCHITECTURE_V1](../../architecture/GREENHOUSE_DIGITAL_SALES_ROOM_ARCHITECTURE_V1.md) · contrato: [TENDER_WORKSPACE_TEMPLATE.md](../../commercial/tenders/TENDER_WORKSPACE_TEMPLATE.md)

## Para qué sirve

Antes, cada propuesta de Efeonce vivía repartida entre carpetas de OneDrive, chats y la memoria del
equipo — y cuando salía por la puerta, entraba en un agujero negro (¿el cliente la abrió? ¿qué miró?).
El **Digital Sales Room (DSR)** es la respuesta a las dos cosas: **ordenar todo el deal en un lugar** y
—más adelante— **poder verlo y medirlo del lado del comprador**.

La idea nace de comparar con Trumpet (la categoría "sala de ventas digital"): reemplazar el PDF estático
por algo vivo, siempre en su última versión, y medido. Efeonce ya hacía la mitad de esto a mano; ahora
está ordenado.

## Las tres capas (no confundirlas)

Lo que se llama "DSR" son en realidad **tres capas**, y la del medio ya existía:

| Capa | Qué es | Quién la ve |
|---|---|---|
| **1. El taller** | La **carpeta del deal** con las fuentes: el RFP, la investigación, la oferta técnica, el plan del deck, los internos | El equipo de Efeonce (interno) |
| **2. El registro gobernado** | La **propuesta** dentro del sistema (aggregate `Proposal`): las versiones finales, la cotización, el estado del deal | El equipo, desde el portal `/admin/commercial/proposals` |
| **3. El DSR externo** | El **micrositio del comprador**: la propuesta viva y trackeada (Trumpet-style) | El cliente (futuro — aún no construido) |

Una aclaración importante: **la propuesta no es un documento *dentro* del DSR — es el contenedor.** Los
documentos (RFP, oferta técnica, económica, deck, cotización) son sus miembros. El "DSR interno" son las
capas 1 y 2 (que ya existen); el "DSR para clientes" es la capa 3, que se pilotea después.

> Detalle técnico: [GREENHOUSE_DIGITAL_SALES_ROOM_DECISION_V1.md](../../architecture/GREENHOUSE_DIGITAL_SALES_ROOM_DECISION_V1.md) §"Delta 2026-07-15 — tres capas".

## El workspace del deal (la capa 1, ya lista)

Cada licitación o propuesta tiene una **carpeta estándar**. Se crea con un comando
(`pnpm tender:new <slug>`) para que nadie olvide una parte:

- **`bases/`** — el RFP y las bases. Manda sobre todo lo demás.
- **`research/`** — la investigación interna (diagnóstico, benchmark, fuentes). 🔒 Nunca va al cliente.
- **`oferta-tecnica.md`** — la oferta técnica, que se escribe e itera acá (con su ledger de evidencia).
- **`deck-plan.json`** — el plan desde el que se compone el deck.
- **`artifact-manifest.json`** — los artefactos vivos del deal (ver abajo).
- **`anexos/`** — los administrativos.
- **`*-INTERNO.md`** — lo que nunca se entrega (el blueprint del squad con costos, el piso de negociación).

La regla que ordena todo es **la audiencia**: lo que está en `research/` y lo marcado `-INTERNO` **nunca**
cruza al cliente; el resto sí. Y las fuentes (los `.md`, el `.json`) se guardan como **archivos** — para
que se editen, se revisen y se pueda volver atrás — mientras que las versiones finales renderizadas (los
PDF) quedan en el sistema.

## El manifiesto de artefactos

Algunas piezas de un deal **no son archivos** de la carpeta: la Radiografía AEO es una página interactiva
que vive en otro lado, y el informe del Brand Visibility Grader es un reporte generado. El
**`artifact-manifest.json`** es la lista de esas piezas vivas — guarda el **enlace y de dónde viene**, no
la pieza. Una regla dura: se referencian **por enlace, nunca por captura** (un PNG mata justo lo
interactivo que demuestran; la pieza se defiende sola).

Sirve para tres cosas a la vez: respalda las cifras de la oferta (un informe del Grader es una fuente
verificable), alimenta el deck (las láminas que muestran esas piezas), y —cuando exista— el DSR externo
las embebe desde acá.

## De la carpeta al deck (el flujo)

```
pnpm tender:new → bases/ (RFP) → admisibilidad + bid/no-bid → research/ (investigación)
   → oferta-tecnica.md (evidencia + narrativa) → deck-plan.json → deck (PDF) → registrar como Proposal
```

El deck **no se dibuja ni se auto-genera** del Markdown: se compone desde el `deck-plan.json`, que un
humano (o un agente, con confirmación) arma **desde** la oferta técnica. Comparten la evidencia, pero son
archivos independientes y revisables por separado.

> Cómo operarlo paso a paso: [manual-de-uso/comercial/armar-el-workspace-de-un-deal.md](../../manual-de-uso/comercial/armar-el-workspace-de-un-deal.md).

## Qué falta (el DSR externo)

La capa 3 —la sala del comprador con tracking (quién la abrió, qué miró)— **está diseñada pero no
construida**. Su decisión de arquitectura ya está tomada (es una proyección de lo `client_facing` de la
propuesta, servida al comprador y medida), y se pilotea internamente primero. La pregunta abierta honesta
es build-vs-buy (construir la nuestra vs. usar Trumpet), que se decide con volumen real de deals.
