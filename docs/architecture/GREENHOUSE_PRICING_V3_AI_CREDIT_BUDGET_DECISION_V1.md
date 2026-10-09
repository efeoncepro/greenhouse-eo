# Pricing V3 — Presupuesto local de créditos IA y recargas

- Status: Accepted para prototipo local autorizado por operador2026-10-09.
- Date / Validated as of: 2026-10-09.
- Owner: Finance/Pricing + Operations + Platform.
- Scope: TASK-2020, primitive y consumidor CLI interno.
- Reversibility: two-way; ningún estado remoto.
- Confidence: medium; snapshots observados, condiciones comerciales pendientes.

## Context

Operador aprobó incorporar presupuesto de IA y aporta capturas de paquetes extra. Suscripción139USD/3000Higgsfield y40EUR/45000Magnific no son tarifa incremental de recarga. Paquetes observados tienen cantidades/precios discretos y caducidad propia.

## Decision

Catálogo de suscripción y packs separado de registros monetarios existentes; request declara proveedor, fecha de compra estimada, deadline de consumo, demanda, créditos normales asignados y disponibles. Nunca inferir saldo real desde créditos incluidos. Suscripción asignada = cuota × asignados/incluidos; compra incremental cubre déficit con packs enteros al menor precio observado, luego menor remanente y número de packs. El cliente financia el costo completo de compra en este escenario conservador; el sobrante permanece identificado, sin descontar ventas futuras supuestas.

Snapshot de captura conserva precio observado con descuento, precio tachado como referencia, fuente y hash. Precio futuro/impuesto/repetibilidad no se afirman. Packs sin precio visible en slider no se extrapolan. Repetir mismo pack requiere supuesto explícito; no autoriza compra. Vigencia de crédito90días Higgsfield y3años Magnific se conserva separada de vigencia de promoción. Magnific requiere suscripción activa y consume extra después de normales según captura; no se puede elegir saldo extra por cliente dentro del proveedor sólo por el cálculo.

Resultado congela catálogo/request/método con `binding=false`, `requires_review`; no precio de venta, contrato, ledger ni reserva concurrente. Conserva monedas sin FX inventado, costo y caja separados, crédito proveedor sin equivalencias con piezas/horas/créditos comerciales. Canon contable/reconocimiento de prepago no cambia.

## Alternatives

Promedio único base+extra: rechazado, oculta compra mínima/paquetes. Compra manual en agente: rechazado, duplica lógica. Ledger/servicio nuevo o cambio del kernel staffing: diferido, blast radius innecesario para presupuesto local.

## Runtime Contract

`resources/credit-budget.ts` es dominio puro con Zod/Decimal y selección discreta acotada; `pricing:v3 resources budget` carga/serializa. Catálogo `data/pricing/v3-resources/ai-credits.review-v1.json`, archivos nuevos versión explícita. Quote/replay previos mantienen contrato. Este presupuesto no se incorpora automáticamente en una quote: normalización/binding de servicios, inventario portfolio y reglas globales pertenecen a incremento posterior; TASK-2017 conserva validación económica.

## Consequences / Verification

Reproducible por catálogo+request congelados. Probar óptimo mixto vs pack mayor, repetición, no base disponible inferida, excedente/caja y expiración con fecha UTC y aniversario calendario. Límite de estados explícito. No compra ni revalidación live de promoción desde CLI. No se guarda captura completa con datos privados; conservar sólo tabla y hashes.

## Revisit

Al incorporar binding automático a quotes, presupuesto multi-cliente/período, reserva live, FX, cantidades mínimas/repetición verificadas, facturación o consumidores canónicos.

## Integración vigente y mantenimiento

La operación `resources budget` de TASK-2020 sigue independiente. TASK-2021 incorporó su resultado a
`compose quote`, agregando demanda por proveedor/mes antes de planear packs y atribuyéndola a las funciones
consumidoras; TASK-2022 añadió el flujo operativo y mantenimiento versionado de este catálogo. La falta de
binding automático mencionada en el alcance inicial quedó resuelta **en el compositor local**. El planner
no reserva saldos, no compra créditos ni transmite capacidad al proveedor.

Suscripción atribuida, compra incremental, remanente y caja conservan sus dimensiones. El artefacto compuesto
congela catálogo de créditos y resultado, con FX seleccionado explícitamente cuando corresponde. El operador
declara disponibilidad normal y fecha de compra/consumo; no se infieren saldos desde la suscripción ni se
reutiliza remanente entre clientes/períodos. Caducidad de créditos y vigencia de oferta/precio son distintas.
El [ADR operativo](GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md) y el
[ADR de mantenimiento](GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md) conservan fuente/digest,
impactos y sucesores; esta integración no habilita ledger, inventario o consumer canónico.
