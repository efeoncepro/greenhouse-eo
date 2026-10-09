# Recursos V3 — suscripción y recargas IA

[Superficie V3 implementada y frontera comercial](../../../docs/documentation/finance/cotizador-v3-superficie-implementada.md). Este conjunto conserva su versión/caso original; las fuentes y la policy operativa sucesora se seleccionan explícitamente y no alteran resultados congelados.

TASK-2020. [Catálogo observado](ai-credits.review-v1.json):7 packsHiggsfield y 3 Magnific, suscripciones del operador, monedas separadas, vigencias 90 días/3 años. Capturas aportadas 2026-10-09; precios/términos necesitan revalidación. Sólo hashes, no datos privados de cuenta ni captura completa guardados.

[Funcional](../../../docs/documentation/finance/cotizador-v3-creditos-ia.md) y [manual](../../../docs/manual-de-uso/finance/presupuestar-creditos-ia-v3.md).

- [Higgsfield request](examples/higgsfield.request.json) y [resultado CLI](examples/higgsfield.budget.json):1000 demandados,400 normales+600 extra; costo 50,78 USD, nueva caja 32,25 USD.
- [Magnific request](examples/magnific.request.json) y [resultado CLI](examples/magnific.budget.json):25000 demandados,15000 normales+10000 extra; costo 22,93 EUR, nueva caja 9,60 EUR.

Disponibilidad y fechas de ejemplo son hipótesis, no saldo real/reserva. El planner usa catálogo, no Excel o precios escritos por agente. Mismo pack repetido sólo por supuesto explícito; no click/compra. El resultado conserva fuente/método/request/catálogo, sin checksum de quote ni aprobación.

Catálogo separado del monetario actual, no `--catalog` de `quote`. [Compositor integrado](../v3-composition/README.md) une estos presupuestos al kernel/quote y recursos monetarios por demanda. El [flujo operativo sucesor](../v3-operating/README.md) añade FX EUR referencial explícito y mantenimiento versionado de estos packs con impacto. Inventario/cartera/reservas live, FXcontractual y planes/asignaciones reales siguen pendientes. Baseline histórica y cotizaciones congeladas intactas.
