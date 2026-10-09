# V3 — Presupuesto de créditos IA incluidos y adicionales

Prototipo local2026-10-09, TASK-2020. [Decisión técnica](../../architecture/GREENHOUSE_PRICING_V3_AI_CREDIT_BUDGET_DECISION_V1.md) y [manual CLI](../../manual-de-uso/finance/presupuestar-creditos-ia-v3.md). No compra, saldo live, reserva ni tarifa comercial.

## Dos costos distintos

Créditos incluidos: cuota mensual × créditos asignados al cliente / créditos incluidos. Suscripción existente139USD/3000Higgsfield y40EUR/45000Magnific, declarada por operador. El presupuesto declara cuántos normales están realmente disponibles para asignar; no presupone todo el paquete libre. Cuota no asignada/uso interno sigue costo de Efeonce, no cero.

Créditos adicionales: demanda menos normales asignados. Elegir combinación más barata de paquetes enteros observados para cubrir ese déficit. En empate, menos sobrante y menos paquetes. No multiplicar déficit por promedio de suscripción para comprar. El escenario conservador asigna toda la compra al cliente, aunque sobren créditos; repartir costo de sobrantes entre otros clientes requiere política y consumo/evidencia propios. No anticipar ventas futuras para bajar el costo.

## Paquetes observados en capturas del operador

Fuente2026-10-09, no precio futuro garantizado. [Catálogo y hashes](../../../data/pricing/v3-resources/ai-credits.review-v1.json). HiggsfieldUSD por contexto monetario del operador; captura muestra `$`. Sólo precios seleccionados visibles, no valores del slider sin precio.

| Proveedor | Créditos extra | Importe del paquete |
| --- | ---: | ---: |
| Higgsfield | 100 | USD6,25 |
| Higgsfield | 200 | USD12 |
| Higgsfield | 500 | USD26 |
| Higgsfield | 1.000 | USD49 |
| Higgsfield | 2.000 | USD95 |
| Higgsfield | 4.000 | USD190 |
| Higgsfield | 5.000 | USD235 |
| Magnific | 10.000 | EUR9,60 |
| Magnific | 30.000 | EUR28,80 |
| Magnific | 150.000 | EUR144 |

Higgsfield extra dura90días según captura. Magnific extra dura3años, requiere suscripción activa y se consume después de normales. El cálculo usa fecha de compra estimada, anniversary UTC/date-only y cutoff exclusivo conservador; verificar timestamp/condiciones reales antes de prometer vigencia. Fecha de caducidad del crédito no establece vigencia de la promoción. Impuestos y condiciones de repetición de compra pendientes.

## Desglose y ejemplos

- 600extraHiggsfield: pack500USD26 + pack100USD6,25 = compraUSD32,25, sin sobrante. Si además asignamos400normales del plan existente, costo atribuido18,53; presupuesto total50,78USD y caja nueva32,25USD.
- 6000extraMagnific: packmínimo10000EUR9,60; quedan4000. No presupuestar compraEUR5,76 por prorrateo. Los4000 mantienen caducidad y dueño/costo, no se vuelven saldo confirmado ni dinero.
- 6000extraHiggsfield:5000+1000 por284USD resulta menor que4000+2000 por285USD.

Estos son costos, no precios de venta. No se suma cuota completa más su atribución. Monedas quedan separadas; FX, margen e impuestos pertenecen al cotizador bajo sus fuentes/policies.

## Estados y límites

`calculated/requires_review` o `needs_input`, siempre `binding=false`. Faltan datos/vencimiento/paquetes suficientes: sin breakdown completo. Repetir pack requiere `allowRepeatedPacks=true`, supuesto de simulación explícito; no autorización de compra. Catálogo/request/método quedan en resultado para reproducirlo.

Un proveedor/cliente por cálculo. Normales limitados a una ventana del mismo mes para no inventar reset/replenishment. Disponible/asignado son declaración de planificación, no ledger ni reserva concurrente; comparar varias cotizaciones no garantiza saldo global. Magnific puede consumir normales de la cuenta antes de extra: la asignación contable por cliente no cambia ese orden del proveedor.

CLI calcula presupuesto de herramientas. Binding automático al brief/quote, servicios compuestos, reparto Vercel/GCP y asignaciones de Adobe siguen pendientes. Quote/kernel anteriores no cambian. No activar auto-refill ni pulsar compra para preparar un presupuesto.
