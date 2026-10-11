# Cotizador V3: selección y actualización para agentes

Estado: prototipo local ejecutable, 2026-10-09; catálogo histórico de simulación, no tarifas comerciales vigentes.
Owner: Finance/Commercial para costos/precio; Operations para kits/asignación; Platform para contrato.
[Decisión](../../architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md),
[contrato de mantenimiento](../../documentation/finance/cotizador-v3-mantenimiento-catalogo.md).

Para un pedido con herramientas/consumo y costos compartidos, usar el [flujo operativo actual](operar-cotizador-v3-con-agentes.md): discovery, plan, portfolio, compose y mantenimiento de policy/créditos. La [referencia funcional completa](../../documentation/finance/cotizador-v3-superficie-implementada.md) describe ambos carriles. Los pasos siguientes conservan el carril legacy de kits explícitos y sus valores históricos, sin convertirlos en precios actuales. La excepción es [Cambiar el redondeo o el FX de cotización](#cambiar-el-redondeo-o-el-fx-de-cotización), que opera sobre el catálogo operativo vigente (`catalog.review-v4.json`).

## Qué hace el agente

Antes de preparar el brief, leer las [reglas de herramientas por trabajo](../../documentation/finance/cotizador-v3-seleccion-herramientas.md):
base Notion/Microsoft 365 para todos, SEMrush para redactor SEO y Adobe/IA según alcance. Consultar el kit
elegido y comprobar que cubre esas necesidades; si falta una, preparar actualización versionada antes de
cotizar, sin dar por hecho que la CLI lee el registro del operador. Claude Team tiene referencia pública,
no plan/cantidad de Efeonce confirmados. Conservar razón de inclusiones/omisiones y reparto explícito.

1. Consultar catálogo/perfiles/variantes y kits. Elegir versión explícita con `--catalog`; sin esa opción usa la baseline `catalog.review-v1.json`, NO descubre automáticamente una versión más reciente.
2. Traducir el pedido a brief: país del talento y mercado cliente, perfil, dedicación/horas, headcount, modalidad, duración, kit y alternativas. No introducir precios ni porcentajes inline.
3. Preparar selección y resolver diagnósticos. No elegir el más barato si hay variantes; no usar cero por dato ausente.
4. Cotizar con el mismo catálogo. Guardar el artefacto: contiene catálogo, brief, bindings, snapshots, calendario y resultados.
5. Explicar desde ese artefacto, sin consultar precios nuevos. Exportar borrador sólo si completo y dentro de policy; historical/estimated no pasa ese gate.

```bash
pnpm --silent pricing:v3 catalog validate
pnpm --silent pricing:v3 catalog search --query diseñador --kind profile --date 2026-10-09
pnpm --silent pricing:v3 catalog show --query visual-core --kind kit --date 2026-10-09
pnpm --silent pricing:v3 catalog show --query ETG-001 --kind resource --date 2026-10-09
pnpm --silent pricing:v3 prepare --input data/pricing/v3-catalog/examples/designer-co-cl.json
pnpm --silent pricing:v3 quote --input data/pricing/v3-catalog/examples/designer-co-cl.json --out /tmp/disenador-v3.artifact.json
pnpm --silent pricing:v3 explain --input /tmp/disenador-v3.artifact.json
pnpm --silent pricing:v3 replay --input /tmp/disenador-v3.artifact.json
```

Las salidas son JSON. Código 0: operación correcta/selección resuelta; 2: faltante/entrada inválida;
3: calculado con revisión; 1: error adapter/conflicto/export bloqueado. `prepare` inspecciona selección,
no aprueba precios. Un error del kernel puede aparecer al cotizar una selección estructuralmente resuelta.
Archivos nuevos usan `wx` y `0600`; nunca sobrescriben. Repetir comandos con `--out` exige una ruta nueva.

## Catálogo y reglas

[Presupuesto IA](presupuestar-creditos-ia-v3.md): comando `resources budget` calcula desde catálogo de packs separado; no pasarlo a `quote` como catálogo monetario ni a `replay` como quote. Binding al kernel disponible por `compose`; el presupuesto separado no es input directo de quote legacy.

Los [antecedentes del operador](../../../data/pricing/v3-pilot/economics/resource-inputs/README.md) completan costos actuales de herramientas y plataforma. Leerlos antes de normalizar: completar planes/asignaciones/fechas/FX y policy, convertir a registros y kit, luego preview/apply. No pasar ese JSON como brief o catálogo; el motor no lo importa. Adobe futuro sin fecha, rango Vercel y créditos AI requieren normalización explícita. Las cifras históricas de abajo describen sólo la baseline vigente de simulación.

La baseline incluye 32 perfiles con nombre (omite filas vacías),26 filas históricas de recursos —25 tools y ETG-017 fee genérico—,
fees separados por perfil, kits propuestos, políticas, FX históricos y recursos de prueba. No lee Excel/CSV
al ejecutar. Fuente/hashes quedan en `evidence`; cada registro conserva procedencia, note, revisión y vigencia.
Las fechas de los registros históricos delimitan el uso de la simulación, no acreditan vigencia salarial/proveedor real.
Los componentes humanos mantienen salario, bonos y previsionales separados en bindings; el kernel recibe su suma.
Previsionales históricos cero no acreditan ausencia de cargas. Premium conserva fee ausente, sin heredar USD 49.

Se recuperan **montos completos históricos de paquetes**, sin tomar divisor «proyectos» como derecho de compartir seats.
Ejemplo Adobe USD 80, Notion USD 144, Microsoft 365 USD 80, ChatGPT USD 20: planes/unidades actuales pendientes.
Las reglas de kits son hipótesis: scope cuenta/equipo se reparte por consumidores cuando `equal_consumers` lo declara;
scope persona conserva cantidad por headcount. `fte` sólo existe si una regla lo declara explícitamente.
Ninguna regla certifica permiso contractual para compartir una licencia. Recursos del cliente requieren motivo y
kit con `allowClientProvided`; no se puede eliminar gestión/Assurance diciendo que la cubre el cliente.

País de costo y mercado son dimensiones independientes. Costos específicos no reciben factor salarial adicional.
Costo sin país sólo puede usarse con `mode=simulation` y `allowUnlocalizedCost=true`; queda como supuesto y revisión.
Factores de mercado 1 son neutrales de prueba; no WTP aprobado. Las políticas por tier usan markup histórico, no
margen objetivo 40%. El catálogo no hereda la aspiración de margen del expediente Pibank.

Talent Assurance USD 25/mes, operación USD 25 y setup USD 100 son **placeholders de la prueba anterior**,
identificados `trial-*`; no costos medidos ni promesas de formación/reemplazo. Se actualizan como recursos explícitos.
No hay bolsas del expediente, cargos laborales 20% ni reserva 15% implícitos en este catálogo.

## Calendario y pagos de licencias

El brief soporta `activePeriods` y `dedicationByPeriod`. Resolver genera un snapshot por mes y el orquestador
invoca el kernel; no hay fórmulas de precio duplicadas en CLI. Meses sin actividad no generan venta.
Setup de cuenta se carga una vez, incluso si se incorporan consumidores después.
Anualidades estables devengan 1/12 del precio/costo por mes y comprometen pago anual al inicio y cada doce meses.
Cambiar unidades anuales o reactivar tras una pausa devuelve `ANNUAL_ASSIGNMENT_CHANGE_REQUIRES_POLICY`, no inventa
cancelación/reembolso. `cashLedger` consolida esos compromisos; no es emisión de factura ni caja real.
Las fechas de catálogo se evalúan en `quoteDate` y se congelan para la cotización; no reprecian contratos por mes.

## Ejemplos verificados

- [Diseñador CO→CL](../../../data/pricing/v3-catalog/examples/designer-co-cl.json): tres meses, 50%, paquetes históricos completos.
  Costo USD 3334, neto de simulación USD 4334,20; mensual recurrente USD 1401,40 y setup USD 130.
  Distinto del ensayo USD 1064,70: éste atribuía paquetes mediante divisores históricos.
- [Demanda Pibank PE/CL](../../../data/pricing/v3-catalog/examples/pibank-demand-pe-cl.json): doce meses, diez funciones,
  SEO/redactor costo completo reservado; otros según horas de módulos distribuidas por activaciones.
  Selección explícita SEMrush histórica. Costo USD 61082,82 y neto USD 87102,66, promedio USD 7258,56.
  No es precio nuevo de la propuesta: país/seniority/capacidad/planes pendientes; no se garantiza cobertura técnica AEO
  sólo por usar SEMrush. Si no se elige suite, devuelve alternativas; el recurso `pending-seo-suite` bloquea el cálculo.
- [Evidencia CLI](../../../data/pricing/v3-catalog/examples/verification.json) y
  [quote congelada del diseñador](../../../data/pricing/v3-catalog/examples/designer.quote.artifact.json).

Pibank aporta **demanda**, no salarios ni provisiones. El mapa mensual es un supuesto de planificación:
horas de cada módulo ponderadas por activaciones; mapa PR inicial completo en la primera campaña. No acredita
agenda real, dedicación exclusiva o suficiencia de dirección/AM. Los términos comerciales de un programa gestionado,
proyectos/hitos y facturación no se vuelven Staffing por esta prueba de capacidad.

## Actualizar una versión

```bash
pnpm --silent pricing:v3 catalog preview --input data/pricing/v3-catalog/examples/illustrative-increase.json --impact data/pricing/v3-catalog/examples/update-impact-briefs.json
pnpm --silent pricing:v3 catalog apply --input data/pricing/v3-catalog/examples/illustrative-increase.json --impact data/pricing/v3-catalog/examples/update-impact-briefs.json --confirm DIGEST_DEL_PREVIEW --out /tmp/catalogo-v3-ejemplo-v2.json
pnpm --silent pricing:v3 quote --catalog /tmp/catalogo-v3-ejemplo-v2.json --input BRIEF_CON_FECHA_2026_10_10 --out /tmp/nueva-cotizacion.artifact.json
```

`DIGEST_DEL_PREVIEW` y `BRIEF_CON_FECHA_2026_10_10` son placeholders que el agente sustituye; no copiar literalmente.
El fixture sólo ilustra alza de Adobe 80→88 y salario base 950→1045 desde 10-10. No afirma incremento real.
Con los mismos supuestos cambia el neto de tres meses 4334,20→4550,65; una quote del 09-10 conserva el importe anterior.
La versión nueva sólo se usa cuando se selecciona con `--catalog`; aplicar no publica, factura ni activa catálogo canónico.

## Cambiar el redondeo o el FX de cotización

El redondeo comercial y el tipo de cambio de cotización son registros del catálogo monetario operativo
(`data/pricing/v3-operating/`), no opciones de la CLI ni campos de la demanda. El valor lo decide el operador (CEO);
el agente prepara el change-set, le muestra el preview y aplica sólo con su confirmación. Qué significan al cotizar:
[Cotizar en otra moneda](operar-cotizador-v3-con-agentes.md#cotizar-en-otra-moneda). Para ver lo vigente:

```bash
pricing_catalog=data/pricing/v3-operating/catalog.review-v4.json

pnpm --silent pricing:v3 catalog validate --catalog "$pricing_catalog"
pnpm --silent pricing:v3 catalog search --kind price_rounding --catalog "$pricing_catalog" --date 2026-10-10
pnpm --silent pricing:v3 catalog search --kind fx --catalog "$pricing_catalog" --date 2026-10-10
```

Los tres devuelven exit 0. `catalog validate` entrega el `digest` de la base, que va en `baseDigest` del change-set.
En `search`, `"resolution": "ambiguous"` sólo dice que la consulta devolvió varios registros.

- **Regla de redondeo** (`kind: "price_rounding"`): `value` es `{ "currency": "CLP", "multiple": "10000" }`. Hay una
  regla general por moneda, con `recordId` `rounding:<MONEDA>`; con `offerId` en `value` la regla es propia de esa
  oferta y prevalece sobre la general. `multiple` es un múltiplo entero de la unidad mínima de la moneda, y la moneda
  debe estar registrada en el catálogo (una moneda nueva se registra en el mismo change-set con
  `dimensions.currenciesAdd`, como hizo `eur-reference.change.json` con EUR). Una moneda sin regla no se redondea.
- **FX de cotización** (`kind: "fx"`): `value` es `{ "from": "USD", "to": "COP", "rate": "3650" }`, con `recordId`
  `fx:USD:<MONEDA>`. USD es la moneda de referencia: un registro por par USD→moneda. Es un valor de política con
  margen prudencial, no un tipo de cambio de mercado; `note` debe decir quién lo decidió, cuándo y contra qué
  observación.

Cada cambio es una entrada de `changes` en un change-set `pricing-v3-catalog-change/1`:

```json
{
  "operation": "replace",
  "recordId": "fx:USD:COP",
  "effectiveFrom": "2026-10-10",
  "record": {
    "recordId": "fx:USD:COP",
    "revision": 2,
    "kind": "fx",
    "source": {
      "reference": "policy:ceo-quote-fx-2026-10-10",
      "effectiveFrom": "2026-10-10",
      "effectiveUntil": "9999-12-31",
      "status": "confirmed"
    },
    "note": "Quién lo decidió, cuándo y contra qué valor observado.",
    "value": { "from": "USD", "to": "COP", "rate": "3650" }
  }
}
```

- **Valor nuevo** (una moneda sin regla, un par sin FX, la regla propia de una oferta): `operation: "add"` con
  `revision: 1` y un `recordId` que no exista.
- **Cambiar un valor existente**: `operation: "replace"` sobre el mismo `recordId`, con `revision` igual a la anterior
  más uno, una `source.reference` distinta (la decisión que lo respalda) y un `effectiveFrom` igual o posterior al del
  registro que reemplaza. Para cambiar el múltiplo de una moneda se reemplaza su regla; agregar una segunda regla
  general con otro `recordId` pasa el preview y después bloquea toda cotización en esa moneda con
  `AMBIGUOUS_PRICE_ROUNDING`.
- En ambas, `effectiveFrom` del cambio es igual a `record.source.effectiveFrom`. El valor rige para cotizaciones con
  `quoteDate` en esa fecha o después: una demanda con fecha anterior sigue resolviendo con el valor previo aunque use
  el catálogo nuevo.
- El change-set lleva además `changeId`, `baseDigest`, `nextVersion` (distinta de la versión base), `actor` y
  `reason`.

Ejemplo real: [`rounding-fx-confirmed-costs.change.json`](../../../data/pricing/v3-operating/rounding-fx-confirmed-costs.change.json)
es el change-set que produjo `catalog.review-v4.json` desde `catalog.review-v3.json` con las decisiones del CEO del
2026-10-10: cinco `add` de redondeo (CLP 10000, USD 10, PEN 50, COP 50000, MXN 100), cuatro `replace` de FX
(USD→CLP 1000, COP 3650, MXN 19.25, PEN 3.70) y 32 `replace` de costos de persona que pasan a `confirmed` sin cambiar
ningún monto. Se reproduce así; la base es el v3 porque el cambio se construyó sobre él:

```bash
pnpm --silent pricing:v3 catalog preview --catalog data/pricing/v3-operating/catalog.review-v3.json \
  --input data/pricing/v3-operating/rounding-fx-confirmed-costs.change.json

pnpm --silent pricing:v3 catalog apply --catalog data/pricing/v3-operating/catalog.review-v3.json \
  --input data/pricing/v3-operating/rounding-fx-confirmed-costs.change.json \
  --confirm 64429e2dd6071f907c582ab218f2783b96a3d005b79b2781b46a9531553419d0 \
  --out /tmp/catalogo-v4-reproducido.json
```

`preview` devuelve exit 0 con `previewDigest` (el valor de `--confirm`) y `differences`: 41 entradas con el antes y el
después de cada registro. `apply` devuelve exit 0 y escribe un archivo idéntico a `catalog.review-v4.json`
(`version` `operating-review-2026-10-10-v4`). Un cambio nuevo se construye sobre el catálogo vigente: su `baseDigest`
es el `digest` de `catalog.review-v4.json` y `--catalog` apunta a ese archivo. `--impact` acepta un arreglo de briefs
del carril de catálogo para ver el efecto en casos concretos; una demanda de composición se compara cotizándola con
la base y con el sucesor.

Rechazos (exit 1, `error.code` en stderr): `CATALOG_BASE_CONFLICT` (el `baseDigest` no es el de la base entregada),
`CATALOG_PREVIEW_CONFLICT` (el `--confirm` no es el del preview vigente: repetir el preview),
`CATALOG_RECORD_CONFLICT` (`add` sobre un `recordId` que ya existe, o `replace` sobre uno que no),
`INVALID_CHANGE_RECORD` (revisión o fechas del registro no cuadran con el cambio), `EFFECTIVE_DATE_CONFLICT`
(`effectiveFrom` anterior al del registro que reemplaza), `UPDATED_SOURCE_REFERENCE_REQUIRED` (el reemplazo repite la
fuente anterior), `PRICE_ROUNDING_CURRENCY_NOT_REGISTERED` e `INVALID_PRICE_ROUNDING_MULTIPLE`.

**Un cambio es siempre una versión nueva del catálogo.** `apply` escribe un sucesor en una ruta nueva y no toca la
base. Las cotizaciones ya congeladas lo ignoran: `replay` las recalcula con el catálogo que llevan dentro, así que
conservan su precio, su FX y su redondeo (o la falta de él). Una cotización nueva usa el sucesor sólo si se elige con
`--catalog`. Después de aplicar: guardar el sucesor en `data/pricing/v3-operating/` con el nombre siguiente
(`catalog.review-v5.json`) junto a su change-set, volver a cotizar los casos afectados y actualizar la ruta en
[«Versiones vigentes»](operar-cotizador-v3-con-agentes.md#versiones-vigentes) y en la referencia de la skill, para
que agentes y operador usen el mismo catálogo.

## Límites y futuros consumers

Núcleo/reader/resolvedor/update/proyección viven en `src/lib/finance/pricing-v3/catalog`; hash/replay en adapter;
filesystem/argumentos en CLI. API/UI/MCP pueden consumir los mismos primitives; integración live pendiente.
Actualización local no modifica payroll, licencias reales, contratos ni quote Greenhouse. No hacer outreach/envíos.
