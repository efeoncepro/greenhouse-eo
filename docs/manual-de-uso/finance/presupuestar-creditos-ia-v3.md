# Presupuestar créditos IA con V3

Para incorporar este presupuesto al precio de roles o servicios y conservar explicación/replay, usar el [flujo operativo de agentes](operar-cotizador-v3-con-agentes.md). La [referencia funcional](../../documentation/finance/cotizador-v3-superficie-implementada.md) distingue presupuesto independiente, composición y caja; el cálculo no compra ni reserva créditos.

[Funcional y paquetes](../../documentation/finance/cotizador-v3-creditos-ia.md), [ADR](../../architecture/GREENHOUSE_PRICING_V3_AI_CREDIT_BUDGET_DECISION_V1.md). Operador local, sin acceso/cambio proveedor. Snapshot observado2026-10-09, revisión obligatoria.

## Antes de calcular

1. Seleccionar catálogo explícito. No poner precio en el request ni usar el promedio mensual para extras.
2. Determinar proveedor, cliente, fecha de compra estimada y fecha máxima de consumo. Revalidar precio/impuesto/condiciones antes de compromiso.
3. Declarar demanda y créditos normales asignados/disponibles con evidencia o como hipótesis explícita. No confundir paquete incluido con saldo libre; otras cotizaciones pueden reservarlo fuera de este planner.
4. Confirmar suscripción activa cuando aplique. Repetir un pack sólo con supuesto consciente `allowRepeatedPacks=true`; defaultfalse permite una unidad de cada paquete distinto.

## Calcular

```bash
pnpm --silent pricing:v3 resources budget --catalog data/pricing/v3-resources/ai-credits.review-v1.json --input data/pricing/v3-resources/examples/higgsfield.request.json
pnpm --silent pricing:v3 resources budget --catalog data/pricing/v3-resources/ai-credits.review-v1.json --input data/pricing/v3-resources/examples/magnific.request.json --out /tmp/mi-presupuesto-magnific.json
```

Los ejemplos son hipotéticos. Request lleva schemaVersion, mode=simulation, accountRef/providerId, purchaseDate/useBy, requestedCredits, subscriptionCreditsAllocated, subscriptionCreditsAvailable, activeSubscription y allowRepeatedPacks. Normales asignados no superan demanda/disponibilidad y ésta no supera paquete mensual incluido.

## Leer y comprobar

- `subscription.attributedCost`: parte de cuota existente; `newCash=0` sólo porque el escenario presupone suscripción ya financiada. Si hay que contratar otra, este escenario no basta.
- `extra.packages`, cantidad/precio/caja: compra completa necesaria.
- `extra.remainingCredits`, `expiresAt`: capacidad sobrante y cutoff conservador. No descontarla como ingreso futuro.
- `totalBudgetCost` y `incrementalCash`: costo atribuido más compra vs pago nuevo. No son precio ni margen.
- Resultado guarda catálogo/request/método; para reproducir, extraer sus dos inputs y llamar el mismo primitive/CLI. No usar `pricing:v3 replay` de quotes: éste no es artefacto de cotización ni tiene su checksum.

Exit3=calculado con revisión; exit2=needs_input con diagnóstico, sin breakdown; exit1=rechazo con `error.code` en stderr ([qué hacer con cada error](operar-cotizador-v3-con-agentes.md#qué-hacer-con-cada-error)). `--out` exige archivo nuevo y escribe0600; no sobrescribe.

Diagnósticos: proveedor desconocido, capacidad disponible fuera del paquete, suscripción requerida, normales fuera de mes, compra antes de observación/precio vencido, créditos vencidos antes de uso, capacidad discreta/límite de estados. Corregir input/fecha o confirmar nuevo catálogo; no convertir falta en cero ni inventar paquete.

## Llevarlo a la cotización

El [compositor de recursos](componer-cotizacion-v3-con-herramientas.md) integra presupuestos agregados por proveedor/mes al kernel y quote local. Este comando de presupuesto separado mantiene su propio formato. El resultado es evidencia de presupuesto, no input directo para quote. Finance/Operations normaliza recursos y reglas siguiendo [mantenimiento de catálogo](../../documentation/finance/cotizador-v3-mantenimiento-catalogo.md), conservando moneda, alcance, fuentes y costos sin duplicar. No emitir cotización comercial sólo porque el planner calcule.
