# Cotizador V3: selección y actualización para agentes

Estado: prototipo local ejecutable, 2026-10-09; catálogo histórico de simulación, no tarifas comerciales vigentes.
Owner: Finance/Commercial para costos/precio; Operations para kits/asignación; Platform para contrato. Las cifras
comerciales del catálogo operativo (márgenes, pisos, FX de cotización, múltiplos, factores de país) las decide el
operador (CEO).
[Decisión](../../architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md),
[contrato de mantenimiento](../../documentation/finance/cotizador-v3-mantenimiento-catalogo.md).

Para un pedido con herramientas/consumo y costos compartidos, usar el [flujo operativo actual](operar-cotizador-v3-con-agentes.md): discovery, plan, portfolio, compose y mantenimiento de policy/créditos. La [referencia funcional completa](../../documentation/finance/cotizador-v3-superficie-implementada.md) describe ambos carriles. Los pasos siguientes conservan el carril legacy de kits explícitos y sus valores históricos, sin convertirlos en precios actuales. Las excepciones son [Versiones vigentes: el puntero `current.json`](#versiones-vigentes-el-puntero-currentjson), [Cambiar el redondeo o el FX de cotización](#cambiar-el-redondeo-o-el-fx-de-cotización) y [Cambiar un factor de país o registrar el costo de un perfil en un país](#cambiar-un-factor-de-país-o-registrar-el-costo-de-un-perfil-en-un-país), que operan sobre el catálogo operativo vigente: el que nombra el puntero y se carga con `--current`.

## Qué hace el agente

Antes de preparar el brief, leer las [reglas de herramientas por trabajo](../../documentation/finance/cotizador-v3-seleccion-herramientas.md):
base Notion/Microsoft 365 para todos, SEMrush para redactor SEO y Adobe/IA según alcance. Consultar el kit
elegido y comprobar que cubre esas necesidades; si falta una, preparar actualización versionada antes de
cotizar, sin dar por hecho que la CLI lee el registro del operador. Claude Team tiene referencia pública,
no plan/cantidad de Efeonce confirmados. Conservar razón de inclusiones/omisiones y reparto explícito.

1. Consultar catálogo/perfiles/variantes y kits. Sin `--catalog` ni `--current` la CLI usa la baseline `catalog.review-v1.json`, que es la de los ejemplos de esta sección; NO descubre automáticamente una versión más reciente. El catálogo operativo vigente se carga con `--current`.
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
En esta baseline, costo sin país sólo puede usarse con `mode=simulation` y `allowUnlocalizedCost=true`; queda como
supuesto y revisión, y sus factores de mercado 1 son neutrales de prueba; no WTP aprobado. El catálogo operativo
vigente sí tiene valores por país desde el 2026-10-11: costos declarados como costo en Chile, un factor de talento por
país de la persona y un factor de mercado por país del cliente
([cómo se cotiza con ellos](operar-cotizador-v3-con-agentes.md#cotizar-según-el-país-del-cliente-y-del-equipo)). Las políticas por tier de la baseline usan markup histórico, no
margen objetivo 40%. El catálogo no hereda la aspiración de margen del expediente Pibank. En el catálogo operativo,
desde el v7 (2026-10-11), la oferta de staffing `talent-assurance-staffing` usa margen objetivo por tier (30 %, 30 %,
35 % y 40 %) con piso de 25 %, ambos decididos por el CEO; las fechas anteriores conservan el markup. Las otras dos
ofertas son de servicio gestionado, las dos con piso de 45 %: `creative-managed-service` (práctica creativa, objetivo
45 %) y, desde el v8, `seo-aeo-managed-service` (práctica SEO/AEO, objetivo 55 %).

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
El fixture sólo ilustra un alza de 10 % desde 10-10 en Adobe (80→88) y en el salario base del perfil. No afirma incremento real.
Con los mismos supuestos cambia el neto de tres meses 4334,20→4550,65; una quote del 09-10 conserva el importe anterior.
La versión nueva sólo se usa cuando se selecciona con `--catalog`; aplicar no publica, factura ni activa catálogo canónico.
En el catálogo operativo, una versión nueva queda vigente cuando se mueve el puntero (sección siguiente).

## Versiones vigentes: el puntero `current.json`

**Para qué sirve.** Cada versión del catálogo monetario, de la policy de recursos y del catálogo de créditos es un
archivo que no se edita ni se borra, porque las cotizaciones congeladas dependen de las anteriores. «Vigente» no
puede ser entonces un nombre de archivo: lo dice un único documento, `data/pricing/v3-operating/current.json`
(`pricing-v3-current/1`), que nombra las tres fuentes por ruta relativa al repo, versión y digest, con `updatedAt` y
`reason`. Los comandos lo leen con `--current`
([cómo se usa al cotizar](operar-cotizador-v3-con-agentes.md#versiones-vigentes)).

**Ver el puntero.**

```bash
pnpm --silent pricing:v3 current show
```

Devuelve `pointer` (el documento), `pointerDigest`, `consistent` y, por fuente, `path`, `status` y lo que se encontró
en el archivo (`found.version`, `found.digest`). Exit 0 si `consistent` es `true`; exit 2 si alguna fuente no
coincide. Lo que imprime es la respuesta vigente. Al 2026-10-11, tras la oferta SEO/AEO, apunta a
`data/pricing/v3-operating/catalog.review-v8.json` (`operating-review-2026-10-11-v8`),
`data/pricing/v3-operating/resources.review-v6.json` (`operating-review-2026-10-11-v6`) y
`data/pricing/v3-resources/ai-credits.review-v1.json` (`operator-screenshots-2026-10-09-v1`).

| `status`           | Qué significa                                                              |
| ------------------ | -------------------------------------------------------------------------- |
| `match`            | El archivo tiene la versión y el digest que dice el puntero                |
| `version_mismatch` | El archivo declara otra versión                                            |
| `digest_mismatch`  | Misma versión, otro contenido: alguien editó un archivo versionado         |
| `invalid`          | El archivo no cumple su schema                                             |
| `unreadable`       | El archivo no existe o no es JSON                                          |

**Regla de mantenimiento.** Una versión se emite con `catalog apply` o `resources apply` y, acto seguido, se mueve el
puntero. `apply` nunca lo mueve. Una guarda de `pnpm pricing:v3:test` exige que el puntero nombre la versión de
número más alto presente en cada carpeta (`catalog.review-vN.json` y `resources.review-vN.json` en
`data/pricing/v3-operating/`, `ai-credits.review-vN.json` en `data/pricing/v3-resources/`): una versión emitida sin
mover el puntero deja esa suite en rojo.

**Mover el puntero, paso a paso.**

1. Emitir la versión con `--out` en su carpeta y con el número siguiente, y guardar junto a ella su change-set.
2. Probar el sucesor antes de dejarlo vigente: una opción escrita a mano gana sobre el puntero, así que
   `compose prepare --catalog <sucesor> --current --input <demanda>` cotiza con el catálogo nuevo y con la policy y
   los créditos vigentes. Correr un caso por cada país, moneda u oferta que el cambio toca.
3. Leer el puntero actual con `current show` y copiar su `pointerDigest` y las rutas de las fuentes que no cambian.
4. Reemplazarlo, con la misma confirmación del operador que autorizó el `apply`:

   ```bash
   pnpm --silent pricing:v3 current set \
     --catalog data/pricing/v3-operating/catalog.review-vN.json \
     --policy data/pricing/v3-operating/resources.review-v6.json \
     --credits data/pricing/v3-resources/ai-credits.review-v1.json \
     --reason "Qué cambió, quién lo decidió y cuándo" \
     --confirm POINTER_DIGEST_ACTUAL
   ```

   - Las tres rutas son obligatorias, van escritas (`current set` no acepta `--current`) y deben quedar dentro del
     repo. Versión y digest no se escriben: la CLI los calcula de los archivos que nombran las rutas.
   - `--reason` es obligatorio y queda en el puntero.
   - `--confirm` es el `pointerDigest` del puntero que se reemplaza. Si no coincide —alguien lo movió entre medio—
     rechaza con `CURRENT_VERSIONS_CONFLICT`; si falta, con `MISSING_ARGUMENT` (`option: "confirm"`).
   - `--out otro.json` escribe el puntero nuevo en otra ruta para revisarlo, sin tocar el vigente; se inspecciona
     con `current show --input otro.json`. En una ruta que todavía no existe no se pasa `--confirm`.
   - Responde `{ updated, replaced, pointerDigest, pointer }`; `updatedAt` es la fecha local del día.
5. Verificar: `current show` devuelve exit 0 con `consistent: true`, y `pnpm pricing:v3:test` pasa.
6. Volver a cotizar con `--current` los casos abiertos que el cambio afecta, y actualizar las versiones que citan
   [«Versiones vigentes»](operar-cotizador-v3-con-agentes.md#versiones-vigentes) y la referencia de la skill.

**Qué no hacer.**

- No editar `current.json` a mano: versión y digest tienen que coincidir con los archivos, y la siguiente corrida
  con `--current` rechaza con `CURRENT_VERSIONS_MISMATCH`.
- No editar ni borrar una versión anterior, ni «corregir» la vigente en su archivo: se emite otra versión.
- No emitir una versión y dejar el puntero para después.
- No mover el puntero a una versión que no se probó cotizando (paso 2): un registro duplicado pasa `preview` y
  `apply` y recién bloquea al cotizar ([Problemas comunes](#problemas-comunes)).

Mover el puntero no cambia ninguna cotización congelada: `replay` usa las fuentes que el artefacto lleva dentro. Si
una versión emitida resultó mala, se corrige con otra versión; para cotizar mientras tanto con la anterior se nombran
sus rutas a mano y se dice en el resultado.

## Cambiar el redondeo o el FX de cotización

El redondeo comercial y el tipo de cambio de cotización son registros del catálogo monetario operativo
(`data/pricing/v3-operating/`), no opciones de la CLI ni campos de la demanda. El valor lo decide el operador (CEO);
el agente prepara el change-set, le muestra el preview y aplica sólo con su confirmación. Qué significan al cotizar:
[Cotizar en otra moneda](operar-cotizador-v3-con-agentes.md#cotizar-en-otra-moneda). Para ver lo vigente:

```bash
pnpm --silent pricing:v3 catalog validate --current
pnpm --silent pricing:v3 catalog search --kind price_rounding --current --date 2026-10-11
pnpm --silent pricing:v3 catalog search --kind fx --current --date 2026-10-11
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
  observación. El único registro en otro sentido es `fx:EUR:USD` (EUR→USD), que convierte a USD el costo de una
  herramienta con precio en EUR. No hay USD→EUR ni regla de redondeo para EUR: una cotización no se emite en EUR.

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
(`version` `operating-review-2026-10-10-v4`). Aquí las rutas van escritas porque se repite un cambio sobre la base
que tenía entonces.

Un cambio nuevo se construye sobre el catálogo vigente: su `baseDigest` es el `digest` que devuelve
`catalog validate --current`, y `preview` y `apply` llevan `--current`:

```bash
pnpm --silent pricing:v3 catalog preview --current --input mi-cambio.change.json

pnpm --silent pricing:v3 catalog apply --current --input mi-cambio.change.json \
  --confirm DIGEST_DEL_PREVIEW --out data/pricing/v3-operating/catalog.review-vN.json
```

`mi-cambio.change.json`, `DIGEST_DEL_PREVIEW` y `vN` son marcadores. `--impact` acepta un arreglo de briefs del
carril de catálogo para ver el efecto en casos concretos; una demanda de composición se compara cotizándola con la
base y con el sucesor.

Un ejemplo de `add` es [`eur-quote-fx.change.json`](../../../data/pricing/v3-operating/eur-quote-fx.change.json),
que produjo `catalog.review-v6.json` desde `catalog.review-v5.json`: un solo `add`, el FX de cotización `fx:EUR:USD`
de `1.20` desde el 2026-10-11, sin fecha de término y marcado `estimated`. Lo propuso el agente aplicando al EUR el
margen prudencial que el operador fijó para las otras monedas (referencia ECB `1.1206`); el operador no lo decidió de
forma explícita para EUR, y por eso no está `confirmed`.

Ese mismo día,
[`staffing-margin-floor.change.json`](../../../data/pricing/v3-operating/staffing-margin-floor.change.json)
produjo `catalog.review-v7.json` desde `catalog.review-v6.json`: 32 `replace`, uno por política de precio de
`talent-assurance-staffing`, que cambian el markup histórico con mínimo 0 por margen objetivo por tier con
`minimumMargin` `0.25`. El piso de 25 % lo decidió el CEO; los objetivos por tier los propuso el agente y él los
confirmó el mismo día, así que los registros están `confirmed`.

El cambio más reciente al 2026-10-11 es
[`seo-aeo-managed-service.change.json`](../../../data/pricing/v3-operating/seo-aeo-managed-service.change.json), que
produjo `catalog.review-v8.json` desde `catalog.review-v7.json`: 32 `add`, uno por perfil, que crean la oferta
`seo-aeo-managed-service` (servicios gestionados de la práctica SEO/AEO) con margen objetivo `0.55` y `minimumMargin`
`0.45`. El piso lo aprobó el CEO el 2026-07-13; el objetivo, extremo bajo de la banda 55–60 % de esa práctica, lo
propuso el agente y él lo confirmó el 2026-10-11, así que los registros están `confirmed`. Una oferta nueva son 32
registros, uno por perfil: ya hay tres ofertas y 96 políticas de precio vigentes.

Rechazos (exit 1, `error.code` en stderr): `CATALOG_BASE_CONFLICT` (el `baseDigest` no es el de la base entregada),
`CATALOG_PREVIEW_CONFLICT` (el `--confirm` no es el del preview vigente: repetir el preview),
`CATALOG_RECORD_CONFLICT` (`add` sobre un `recordId` que ya existe, o `replace` sobre uno que no),
`INVALID_CHANGE_RECORD` (revisión o fechas del registro no cuadran con el cambio), `EFFECTIVE_DATE_CONFLICT`
(`effectiveFrom` anterior al del registro que reemplaza), `UPDATED_SOURCE_REFERENCE_REQUIRED` (el reemplazo repite la
fuente anterior), `PRICE_ROUNDING_CURRENCY_NOT_REGISTERED` e `INVALID_PRICE_ROUNDING_MULTIPLE`.

**Un cambio es siempre una versión nueva del catálogo.** `apply` escribe un sucesor en una ruta nueva y no toca la
base. Las cotizaciones ya congeladas lo ignoran: `replay` las recalcula con el catálogo que llevan dentro, así que
conservan su precio, su FX y su redondeo (o la falta de él). Una cotización nueva usa el sucesor cuando el puntero lo
nombra. Después de aplicar: guardar el sucesor en `data/pricing/v3-operating/` con el nombre siguiente al del catálogo
que nombra el puntero (al 2026-10-11 sería `catalog.review-v9.json`) junto a su change-set, probarlo con los casos
afectados y mover el puntero
([pasos](#versiones-vigentes-el-puntero-currentjson)), para que agentes y operador usen el mismo catálogo.

## Cambiar un factor de país o registrar el costo de un perfil en un país

El país entra al precio por tres clases de registro del catálogo monetario operativo. Qué significan al cotizar,
valores vigentes y ejemplos: [Cotizar según el país del cliente y del equipo](operar-cotizador-v3-con-agentes.md#cotizar-según-el-país-del-cliente-y-del-equipo).
Los valores los decide el operador (CEO); el agente prepara el change-set, le muestra el preview y aplica sólo con su
confirmación. Para ver lo vigente (los tres devuelven exit 0):

```bash
pnpm --silent pricing:v3 catalog search --kind talent_factor --current --date 2026-10-11
pnpm --silent pricing:v3 catalog search --kind market_factor --current --date 2026-10-11
pnpm --silent pricing:v3 catalog search --kind cost --query ECG-007 --current --date 2026-10-11
```

- **Factor de talento** (`kind: "talent_factor"`, `recordId` `talent:<PAÍS>:CL`): `value` es
  `{ "country": "CO", "referenceCountry": "CL", "factor": "0.80" }`. Multiplica el costo de Chile de **todos** los
  perfiles para una persona en ese país. Uno por país.
- **Factor de mercado** (`kind: "market_factor"`, `recordId` `market:<PAÍS>`): `value` es
  `{ "country": "CO", "factor": "0.90" }`, con `"floorBasis": "base_market"` opcional. Multiplica el precio de la
  parte humana para un cliente de ese país. Uno por país.
- **Costo de un perfil** (`kind: "cost"`): los 32 registros `cost:<perfil>:unknown` llevan
  `"localization": { "kind": "reference_adjusted", "referenceCountry": "CL" }`: son el costo en Chile y reciben el
  factor de talento. Un registro con `"localization": { "kind": "specific", "country": "CO" }` es el costo propio de
  ese perfil en ese país: no recibe factor y, para las personas de ese país, reemplaza al de referencia. En los dos
  casos el monto es el **costo objetivo** del perfil (el nivel de sueldo que el operador quiere alcanzar), no la
  nómina actual ([base de costo](operar-cotizador-v3-con-agentes.md#selección-y-asignación)).

### Cambiar un factor

Es una entrada `replace` sobre el `recordId` del factor, con `revision` igual a la anterior más uno, una
`source.reference` distinta (la decisión o la evidencia que lo respalda) y `effectiveFrom` igual o posterior al del
registro que reemplaza. Un factor para un país que aún no tiene es un `add` con `revision: 1`. Así quedó el factor
de mercado de Colombia en el change-set real (era `1`, revisión 1):

```json
{
  "operation": "replace",
  "recordId": "market:CO",
  "effectiveFrom": "2026-10-11",
  "record": {
    "recordId": "market:CO",
    "revision": 2,
    "kind": "market_factor",
    "source": {
      "reference": "policy:ceo-market-factors-2026-10-11",
      "effectiveFrom": "2026-10-11",
      "effectiveUntil": "9999-12-31",
      "status": "confirmed"
    },
    "note": "CEO decision of 2026-10-11: conservative end of the workbook range for Colombia (0.85-0.9). The margin floor follows this factor: it is read on the base-market price.",
    "value": { "country": "CO", "factor": "0.90", "floorBasis": "base_market" }
  }
}
```

- `source.status`: `confirmed` si el valor es una decisión del operador o sale de evidencia real; `estimated` si es
  una aproximación. Un factor `estimated` hace que toda cotización que lo use lo informe como `ESTIMATED_SOURCE`.
  `note` dice quién lo decidió o de dónde sale el estimado, y contra qué observación.
- **`floorBasis`** sólo existe en el factor de mercado y su único valor es `"base_market"`: el piso de margen se lee
  sobre el precio del mercado base y la rebaja del país no se marca. Sin el campo, el piso se lee sobre el neto
  final. Con un factor bajo 1 y sin `floorBasis`, **toda** cotización de ese mercado al precio de política sale con
  sus líneas marcadas. Con `floorBasis`, las cotizaciones de ese mercado pasan a firmarse con el motor
  `pricing-v3-local/1.2.0` y dejan de marcarse aunque su margen real quede bajo el mínimo de la política. Declararlo
  es decidir que ese mercado se vende más barato: nunca se agrega ni se quita sin una decisión del operador sobre
  ese país, y no se infiere del valor del factor. Con factor 1 o mayor no cambia el veredicto del piso.
- **País nuevo**: se declara en `dimensions.countriesAdd` del mismo change-set y se agregan sus dos factores (talento
  y mercado). Si falta `countriesAdd`, el preview pasa igual y después toda cotización con ese país devuelve exit 2
  con `UNSUPPORTED_COUNTRY`. Un país con factor de mercado y sin factor de talento sirve para un cliente de ese país,
  no para una persona en él.
- **Un solo factor por país.** Para cambiar un valor se reemplaza el registro; agregar un segundo registro con otro
  `recordId` pasa `preview` y `apply` y después bloquea las cotizaciones de ese país con `AMBIGUOUS_SELECTION`
  ([cómo se detecta y se corrige](#problemas-comunes)).
- No se usa el factor de talento para representar lo que paga un mercado ni el de mercado para representar lo que
  cuesta una persona. Factores por tipo de cliente no existen en el catálogo: se registran como neto acordado.

### Registrar el costo específico de un perfil en un país

Cuándo conviene: [manual operativo](operar-cotizador-v3-con-agentes.md#cuándo-registrar-el-costo-específico-de-un-perfil-en-un-país).
Es un `add` de un registro `cost` nuevo; el de referencia no se toca. Los montos de este ejemplo son marcadores:
se reemplazan por el costo mensual objetivo que el operador decide para ese perfil en ese país. No se copia la nómina
de una persona.

```json
{
  "operation": "add",
  "recordId": "cost:ECG-007:CO",
  "effectiveFrom": "FECHA_DESDE_QUE_RIGE",
  "record": {
    "recordId": "cost:ECG-007:CO",
    "revision": 1,
    "kind": "cost",
    "source": {
      "reference": "REFERENCIA_DE_LA_EVIDENCIA",
      "effectiveFrom": "FECHA_DESDE_QUE_RIGE",
      "effectiveUntil": "9999-12-31",
      "status": "confirmed"
    },
    "note": "Qué decisión o evidencia respalda el costo objetivo de ese perfil en ese país, de qué fecha y quién lo confirmó.",
    "value": {
      "profileId": "ECG-007",
      "seniorityCode": "not_specified",
      "localization": { "kind": "specific", "country": "CO" },
      "currency": "USD",
      "components": [
        { "coverage": "human_salary", "amount": "MONTO" },
        { "coverage": "human_bonus_jit", "amount": "MONTO" },
        { "coverage": "human_bonus_rpa", "amount": "MONTO" },
        { "coverage": "human_bonus_ar", "amount": "MONTO" },
        { "coverage": "human_bonus_overperformance", "amount": "MONTO" },
        { "coverage": "human_charges", "amount": "MONTO" }
      ]
    }
  }
}
```

- `profileId` y `seniorityCode` son los del perfil
  (`catalog show --kind profile --query ECG-007 --current --date 2026-10-11` los muestra); con otro
  `seniorityCode` el registro no se asocia a ese perfil.
- `components` lleva las mismas coberturas que el registro de referencia del perfil (el `search --kind cost` de arriba
  las lista), cada una con su monto mensual como cadena, en la moneda de `currency`. Un componente que es cero se
  escribe `"0"`.
- `reference` nombra la decisión o la evidencia sin copiarla: contratos, liquidaciones, sueldos de personas y datos
  personales no entran al repo.
- Efecto, desde `effectiveFrom`: una línea con ese perfil y `talentCountry` de ese país usa este costo y no recibe
  factor de talento. El mismo perfil en otro país sigue con el costo de Chile por su factor. Para corregir el monto
  después se hace `replace` de este registro, no un segundo `add`.

### El change-set real y su reproducción

[`country-factors.change.json`](../../../data/pricing/v3-operating/country-factors.change.json) es el change-set
que produjo `catalog.review-v5.json` desde `catalog.review-v4.json` con las decisiones del CEO del 2026-10-11 y con
los estimados que propuso el agente (marcados `estimated`):
`dimensions.countriesAdd` con `ES`; 32 `replace` de costos de persona, que pasan a ser el costo en Chile sin cambiar
ningún monto; seis `add` de factor de talento (CL 1; CO 0.80, PE 0.85, MX 0.90, ES 3 y US 5, estimados); cinco
`replace` de factor de mercado (CL 1, CO 0.90 con `floorBasis`, US 1.10, decididos; PE 0.95 con `floorBasis` y MX 1,
estimados) y un `add` (ES 1.10, estimado). Todo con `effectiveFrom` 2026-10-11. Se reproduce así; la base es el v4
porque el cambio se construyó sobre él:

```bash
pnpm --silent pricing:v3 catalog preview --catalog data/pricing/v3-operating/catalog.review-v4.json \
  --input data/pricing/v3-operating/country-factors.change.json

pnpm --silent pricing:v3 catalog apply --catalog data/pricing/v3-operating/catalog.review-v4.json \
  --input data/pricing/v3-operating/country-factors.change.json \
  --confirm a020b319042cd843aca9fbc5c93f0fab89a598af4d83298ade2b6bc10830f7b6 \
  --out /tmp/catalogo-v5-reproducido.json
```

`preview` devuelve exit 0 con ese `previewDigest`, 44 entradas en `differences` y el país agregado en
`dimensionChanges`. `apply` devuelve exit 0 y escribe un archivo idéntico a `catalog.review-v5.json` (`version`
`operating-review-2026-10-11-v5`, 299 registros: los 255 del v4 más las 44 revisiones nuevas; las anteriores se
conservan). Los rechazos son los de la sección anterior; un `floorBasis` con otro valor es `SCHEMA_INVALID`.

Como todo cambio, es una versión nueva del catálogo y rige por fecha:

- Las cotizaciones congeladas lo ignoran: `replay` las recalcula con el catálogo y el contrato que llevan dentro. Un
  artefacto anterior al v5 no tiene `floorBasis` y se sigue verificando con su motor.
- Una demanda con `quoteDate` anterior al `effectiveFrom` del cambio resuelve con el valor previo aunque se cotice
  con el catálogo nuevo. Con el catálogo vigente, una demanda fechada 2026-10-10 no recibe ningún factor de país, y
  `compose prepare|quote` lo avisa en `runNotices.laterCatalogValues`.
- Después de aplicar: mover el puntero ([pasos](#versiones-vigentes-el-puntero-currentjson)), volver a cotizar los
  casos abiertos de ese país con la fecha del día y comparar el neto y `marginRateRoundedDown` con la base. El
  `--impact` de `catalog preview` sólo acepta briefs del carril de catálogo; una demanda de composición se compara
  cotizándola con la base y con el sucesor.

## Problemas comunes

| Síntoma                                                                                                  | Causa                                                                                                                                                 | Qué hacer                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exit 1, `CURRENT_VERSIONS_MISMATCH` (`option: "current"`) en cualquier comando con `--current`           | El puntero y un archivo no coinciden: se editó un archivo versionado o el puntero a mano                                                              | `current show` (exit 2) nombra la fuente y su `status`. Restaurar el archivo versionado; si el que quedó atrás es el puntero, moverlo con `current set`. No cotizar con rutas a mano para saltarlo                                                      |
| Exit 1, `CURRENT_VERSIONS_CONFLICT` (`option: "confirm"`) en `current set`                               | `--confirm` no es el `pointerDigest` del puntero que se reemplaza, o se pasó `--confirm` para una ruta de `--out` que no existe                       | Leer otra vez con `current show`, comprobar que el puntero actual es el que esperabas y repetir                                                                                                                                                       |
| Exit 1, `MISSING_ARGUMENT` (`option: "confirm"` o `"reason"`) en `current set`                           | Falta `--confirm` al reemplazar un puntero que existe, o falta `--reason`                                                                             | Agregar la opción                                                                                                                                                                                                                                     |
| `pnpm pricing:v3:test` en rojo después de un `catalog apply` o `resources apply`                         | El puntero no nombra la versión de número más alto de su carpeta                                                                                      | Mover el puntero ([pasos](#versiones-vigentes-el-puntero-currentjson))                                                                                                                                                                                |
| Una cotización con el catálogo nuevo da el precio de antes y trae `runNotices.laterCatalogValues`        | La demanda está fechada antes del `effectiveFrom` del cambio: los valores se toman por `quoteDate`, no por el archivo                                 | Copiar la demanda con la fecha del día y volver a correr                                                                                                                                                                                              |
| Exit 2, `AMBIGUOUS_SELECTION` en `lines.<lineId>.talentFactor` en toda cotización de un país             | Un segundo registro de factor con otro `recordId` para el mismo país. `catalog preview` y `catalog apply` lo aceptan; bloquea recién al cotizar       | Se detecta probando el sucesor antes de mover el puntero. Para corregir: versión nueva con `{ "operation": "retire", "recordId": "<duplicado>", "effectiveFrom": "<fecha posterior a su inicio>" }` y mover el puntero. Las fechas en que el duplicado estuvo vigente siguen ambiguas |
| Exit 2, `AMBIGUOUS_PRICE_ROUNDING` en toda cotización de una moneda                                      | Una segunda regla general de redondeo para la misma moneda                                                                                            | El múltiplo se cambia con `replace` de la regla existente, no con un segundo `add`                                                                                                                                                                    |
| Exit 2, `UNSUPPORTED_COUNTRY` con un país recién agregado                                                | Faltó `dimensions.countriesAdd` en el change-set                                                                                                      | Versión nueva que declare el país                                                                                                                                                                                                                     |
| Exit 1, `CATALOG_BASE_CONFLICT` o `CATALOG_PREVIEW_CONFLICT`                                             | El `baseDigest` no es el de la base cargada, o el `--confirm` no es el del preview vigente                                                            | Tomar `digest` de `catalog validate --current`, repetir `preview` y usar su `previewDigest`                                                                                                                                                           |

## Límites y futuros consumers

Núcleo/reader/resolvedor/update/proyección viven en `src/lib/finance/pricing-v3/catalog`; hash/replay en adapter;
filesystem/argumentos en CLI. API/UI/MCP pueden consumir los mismos primitives; integración live pendiente.
Actualización local no modifica payroll, licencias reales, contratos ni quote Greenhouse. No hacer outreach/envíos.
