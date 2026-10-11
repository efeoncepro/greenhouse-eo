# Recursos V3 — suscripción y recargas IA

[Superficie V3 implementada y frontera comercial](../../../docs/documentation/finance/cotizador-v3-superficie-implementada.md). Este conjunto conserva su versión/caso original; las fuentes y la policy operativa sucesora se seleccionan explícitamente y no alteran resultados congelados.

TASK-2020. [Catálogo observado](ai-credits.review-v1.json):7 packsHiggsfield y 3 Magnific, suscripciones del operador, monedas separadas, vigencias 90 días/3 años. Capturas aportadas 2026-10-09; precios/términos necesitan revalidación. Sólo hashes, no datos privados de cuenta ni captura completa guardados.

[Funcional](../../../docs/documentation/finance/cotizador-v3-creditos-ia.md) y [manual](../../../docs/manual-de-uso/finance/presupuestar-creditos-ia-v3.md).

- [Higgsfield request](examples/higgsfield.request.json) y [resultado CLI](examples/higgsfield.budget.json):1000 demandados,400 normales+600 extra; costo 50,78 USD, nueva caja 32,25 USD.
- [Magnific request](examples/magnific.request.json) y [resultado CLI](examples/magnific.budget.json):25000 demandados,15000 normales+10000 extra; costo 22,93 EUR, nueva caja 9,60 EUR.

Disponibilidad y fechas de ejemplo son hipótesis, no saldo real/reserva. El planner usa catálogo, no Excel o precios escritos por agente. Mismo pack repetido sólo por supuesto explícito; no click/compra. El resultado conserva fuente/método/request/catálogo, sin checksum de quote ni aprobación.

Catálogo separado del monetario actual, no `--catalog` de `quote`. [Compositor integrado](../v3-composition/README.md) une estos presupuestos al kernel/quote y recursos monetarios por demanda. El [flujo operativo sucesor](../v3-operating/README.md) añade FX EUR referencial explícito y mantenimiento versionado de estos packs con impacto. Inventario/cartera/reservas live, FXcontractual y planes/asignaciones reales siguen pendientes. Baseline histórica y cotizaciones congeladas intactas.

Desde el 2026-10-11 el catálogo de créditos vigente lo nombra el puntero
[`../v3-operating/current.json`](../v3-operating/current.json), hoy `ai-credits.review-v1.json`. Con `--current`,
`compose` y `resources` lo reciben como `--credits`, y `resources budget` lo recibe como `--catalog`. Si agregas un
`ai-credits.review-vN.json` en esta carpeta, mueve el puntero con `pricing:v3 current set` en el mismo cambio: una
prueba exige que nombre la versión de número más alto y, si no, `pnpm pricing:v3:test` falla. El catálogo v6 del
flujo operativo agrega además un tipo de cambio de cotización EUR→USD de 1,20 (estimado) que rige desde el
2026-10-11 sin fecha de término; la referencia del BCE anterior valía sólo el 2026-10-09.

Desde el 2026-10-11 dos lecturas de un artefacto congelado usan estos presupuestos sin recalcularlos. `compose cash`
cuenta como caja nueva a proveedores sólo los packs extra; la parte de suscripción atribuida ya está financiada.
`compose commitments` lista los créditos sobrantes de un pack con su vencimiento (si siguen válidos después del
último período o caducan dentro de él). Por cuánto tiempo está comprometida la suscripción de cada proveedor no
está en este catálogo: la lectura lo declara como no derivable (`CREDIT_SUBSCRIPTION_TERM_NOT_FROZEN`).
[Decisión](../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--tres-lecturas-de-una-cotización-congelada-calendario-caja-y-compromisos).
