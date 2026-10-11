# V3 — Presupuesto de créditos IA incluidos y adicionales

Prototipo local 2026-10-09, TASK-2020. [Decisión técnica](../../architecture/GREENHOUSE_PRICING_V3_AI_CREDIT_BUDGET_DECISION_V1.md) y [manual CLI](../../manual-de-uso/finance/presupuestar-creditos-ia-v3.md). No compra, saldo live, reserva ni tarifa comercial.

## Dos costos distintos

Créditos incluidos: cuota mensual × créditos asignados al cliente / créditos incluidos. Suscripción existente 139 USD/3000 Higgsfield y 40 EUR/45000 Magnific, declarada por operador. El presupuesto declara cuántos normales están realmente disponibles para asignar; no presupone todo el paquete libre. Cuota no asignada/uso interno sigue costo de Efeonce, no cero.

Créditos adicionales: demanda menos normales asignados. Elegir combinación más barata de paquetes enteros observados para cubrir ese déficit. En empate, menos sobrante y menos paquetes. No multiplicar déficit por promedio de suscripción para comprar. El escenario conservador asigna toda la compra al cliente, aunque sobren créditos; repartir costo de sobrantes entre otros clientes requiere política y consumo/evidencia propios. No anticipar ventas futuras para bajar el costo.

## Paquetes observados en capturas del operador

Fuente 2026-10-09, no precio futuro garantizado. [Catálogo y hashes](../../../data/pricing/v3-resources/ai-credits.review-v1.json). HiggsfieldUSD por contexto monetario del operador; captura muestra `$`. Sólo precios seleccionados visibles, no valores del slider sin precio.

| Proveedor  | Créditos extra | Importe del paquete |
| ---------- | -------------: | ------------------: |
| Higgsfield |            100 |            USD 6,25 |
| Higgsfield |            200 |              USD 12 |
| Higgsfield |            500 |              USD 26 |
| Higgsfield |          1.000 |              USD 49 |
| Higgsfield |          2.000 |              USD 95 |
| Higgsfield |          4.000 |             USD 190 |
| Higgsfield |          5.000 |             USD 235 |
| Magnific   |         10.000 |            EUR 9,60 |
| Magnific   |         30.000 |           EUR 28,80 |
| Magnific   |        150.000 |             EUR 144 |

Higgsfield extra dura 90 días según captura. Magnific extra dura 3 años, requiere suscripción activa y se consume después de normales. El cálculo usa fecha de compra estimada, anniversary UTC/date-only y cutoff exclusivo conservador; verificar timestamp/condiciones reales antes de prometer vigencia. Fecha de caducidad del crédito no establece vigencia de la promoción. Impuestos y condiciones de repetición de compra pendientes.

## Desglose y ejemplos

- 600 extraHiggsfield: pack 500 USD 26 + pack 100 USD 6,25 = compraUSD32,25, sin sobrante. Si además asignamos 400 normales del plan existente, costo atribuido 18,53; presupuesto total 50,78 USD y caja nueva 32,25 USD.
- 6000 extraMagnific: packmínimo 10000 EUR 9,60; quedan 4000. No presupuestar compraEUR5,76 por prorrateo. Los 4000 mantienen caducidad y dueño/costo, no se vuelven saldo confirmado ni dinero.
- 6000 extraHiggsfield:5000+1000 por 284 USD resulta menor que 4000+2000 por 285 USD.

Estos son costos, no precios de venta. No se suma cuota completa más su atribución. Monedas quedan separadas; FX, margen e impuestos pertenecen al cotizador bajo sus fuentes/policies.

## Estados y límites

`calculated/requires_review` o `needs_input`, siempre `binding=false`. Faltan datos/vencimiento/paquetes suficientes: sin breakdown completo. Repetir pack requiere `allowRepeatedPacks=true`, supuesto de simulación explícito; no autorización de compra. Catálogo/request/método quedan en resultado para reproducirlo.

Un proveedor/cliente por cálculo. Normales limitados a una ventana del mismo mes para no inventar reset/replenishment. Disponible/asignado son declaración de planificación, no ledger ni reserva concurrente; comparar varias cotizaciones no garantiza saldo global. Magnific puede consumir normales de la cuenta antes de extra: la asignación contable por cliente no cambia ese orden del proveedor.

CLI calcula presupuesto de herramientas; TASK-2021 lo integra por proveedor/mes mediante `compose`, y TASK-2022 agrega plan/portfolio, Adobe combinado y Vercel/GCP por capacidad declarada. [Superficie actual](cotizador-v3-superficie-implementada.md) y [manual operativo](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md). El presupuesto separado no se pasa directamente a quote legacy. Inventario, asignaciones reales, reservas concurrentes y contratos de servicio siguen pendientes. No activar auto-refill ni pulsar compra para preparar un presupuesto.

Nota 2026-10-11: cuál es el catálogo de créditos vigente ya no se nombra a mano. Lo dice el [puntero de versiones vigentes](cotizador-v3-mantenimiento-catalogo.md#puntero-de-versiones-vigentes-2026-10-11), que hoy sigue apuntando a `ai-credits.review-v1.json`. `resources budget --input request.json --current` lo toma de ahí, y en una composición `--current` llena también el catálogo de créditos. Los paquetes y precios de este documento no cambiaron. La decisión de ese día de que un precio unitario no vence se aplicó a los precios de herramientas de la policy de recursos; los paquetes de créditos conservan lo dicho arriba: precio observado en capturas, sin vigencia de promoción verificada.

Nota 2026-10-11 (tarde): dos lecturas nuevas de una cotización ya congelada usan estos presupuestos sin recalcularlos. La lectura de caja (`compose cash`) cuenta los paquetes extra como la única caja nueva a proveedores; la parte de la suscripción que se atribuye ya está pagada y no es caja nueva. La lectura de compromisos (`compose commitments`) lista los créditos que sobran con su vencimiento, y dice expresamente que no puede saber por cuánto tiempo está comprometida la suscripción mensual de Higgsfield o de Magnific: ese plazo no está declarado. Los paquetes y precios de este documento siguen iguales. [Qué responde cada lectura](cotizador-v3-superficie-implementada.md#tres-lecturas-de-una-cotización-congelada-2026-10-11).
