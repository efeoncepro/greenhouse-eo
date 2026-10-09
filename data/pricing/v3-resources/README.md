# Recursos V3 — suscripción y recargas IA

TASK-2020. [Catálogo observado](ai-credits.review-v1.json):7packsHiggsfield y3Magnific, suscripciones del operador, monedas separadas, vigencias90días/3años. Capturas aportadas2026-10-09; precios/términos necesitan revalidación. Sólo hashes, no datos privados de cuenta ni captura completa guardados.

[Funcional](../../../docs/documentation/finance/cotizador-v3-creditos-ia.md) y [manual](../../../docs/manual-de-uso/finance/presupuestar-creditos-ia-v3.md).

- [Higgsfield request](examples/higgsfield.request.json) y [resultado CLI](examples/higgsfield.budget.json):1000demandados,400normales+600extra; costo50,78USD, nueva caja32,25USD.
- [Magnific request](examples/magnific.request.json) y [resultado CLI](examples/magnific.budget.json):25000demandados,15000normales+10000extra; costo22,93EUR, nueva caja9,60EUR.

Disponibilidad y fechas de ejemplo son hipótesis, no saldo real/reserva. El planner usa catálogo, no Excel o precios escritos por agente. Mismo pack repetido sólo por supuesto explícito; no click/compra. El resultado conserva fuente/método/request/catálogo, sin checksum de quote ni aprobación.

Catálogo separado del monetario actual, no `--catalog` de `quote`. Binding automático a quote/kit, cartera de clientes, reservas concurrentes, FX, Vercel/GCP y Adobe son siguientes incrementos. Baseline histórica y cotizaciones congeladas intactas.
