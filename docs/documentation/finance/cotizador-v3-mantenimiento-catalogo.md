# Contrato de mantenimiento del catálogo V3

[Superficie implementada y formatos](cotizador-v3-superficie-implementada.md) y [manual operativo completo](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md): mantenimiento monetario y de policy/créditos son carriles separados, con versión y evidencia propias.

Accepted para prototipo local, operador 2026-10-09. [ADR](../../architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md).
Código: `catalog/contracts.ts`, `catalog/catalog.ts`, `adapters/catalog-local.ts` bajo `src/lib/finance/pricing-v3`.
[Manual y ejemplos](../../manual-de-uso/finance/catalogo-v3-seleccion-y-actualizacion.md).

## Ownership y revisión

- Finance/Commercial mantiene costo humano, moneda/FX, fees, margen/markup y factores de mercado. Desde el
  2026-10-10 también el redondeo comercial; piso de margen, tipo de cambio de cotización, múltiplos de redondeo y
  excepciones los decide el operador (CEO) y se registran con su decisión como fuente. Desde el 2026-10-11 también
  los factores de país —talento y mercado— y la base del piso de un mercado (`floorBasis`); People aporta el costo
  real por perfil y país cuando existe.
- Operations mantiene perfiles, kits, capacidad/asignación y costos de Talent Assurance/operación.
- Platform mantiene schemas, compatibilidad y consumers.

Revisar valores trimestralmente y ante nueva factura/plan, revisión salarial, cambio de proveedor, FX/política o país.
Cada revisión deja fecha, responsable y fuente por registro. Esta cadencia es contrato operativo; no crea un scheduler,
no consulta proveedores ni revisa precios automáticamente. Source confirmed exige respaldo concreto; histórico o
estimado continúa revisión. Confirmar significado de una celda no confirma costo/país/vigencia.

## Registro

`recordId` estable, `revision`, `kind`, `value`, `source` y `note`. Fuente tiene referencia, `effectiveFrom`,
`effectiveUntil`, `status=confirmed|estimated|pending`; ventanas son inclusivas y fechas ISO. Un cero necesita
`zeroReason` en componentes humanos para modo commercial_draft y justificación según contrato del motor; null/pending no se transforma en cero.

Kinds: profile, cost, resource, kit, allocation, pricing, talent_factor, market_factor, fx y, desde el 2026-10-10,
price_rounding ([detalle](#redondeo-tipo-de-cambio-de-cotización-y-costos-confirmados-2026-10-10)). talent_factor y
market_factor llevan valores desde el 2026-10-11 ([detalle](#factores-de-país-talento-y-mercado-2026-10-11)). Perfil no incorpora fee,
software ni margen dentro de salario. Cost conserva componentes/coberturas y país específico, referencia con factor
u origen desconocido; kits describen cómo asignar recursos. Datos de unidad/scope/moneda son parte del valor.
El catálogo declara países/monedas con precisión explícita y evidence/hashes de los antecedentes.

## Change-set

`schemaVersion=pricing-v3-catalog-change/1`, `changeId`, `baseDigest`, `nextVersion`, `actor`, `reason`, `changes`.
Una operación por recordId por cambio:

- `add`: id nuevo, revisión1; incluye registro completo.
- `replace`: misma identidad semántica/kind, revisión previa+1, registro completo con nueva referencia de fuente.
- `retire`: cierra vigencia, conserva el dato histórico; no incluye otro registro.

Cada operación declara `effectiveFrom`. Replace permite corrección del mismo día en una versión nueva; retire exige fecha posterior al inicio del registro anterior;
cierra su ventana al día anterior sin extender vigencia vencida; renovar un registro vencido conserva el gap como pendiente. No solapar intervalos, cambiar identidad a escondidas ni reutilizar un id retirado.
Una corrección del mismo día sustituye la fila en el sucesor; el padre y el valor completo anterior en audit conservan historia. No se modifica ninguna quote previa.
Para un país/moneda nuevos, `dimensions.countriesAdd` y `currenciesAdd` (código y precisión) amplían dimensiones;
los factores, costos y FX se agregan además como registros. No se infiere precisión ni un factor neutral operativo.

## Propose → inspect → apply

Preview valida base/schema/fechas/identidad, presenta diferencias y puede recalcular briefs antes/después.
Incluye su digest y la versión candidata. Apply reconstruye el mismo preview y exige digest idéntico,
incluidos briefs de impacto; una base cambiada devuelve `CATALOG_BASE_CONFLICT`, una propuesta/impacto cambiado
`CATALOG_PREVIEW_CONFLICT`. Confirm es control técnico de integridad, no aprobación comercial inferida.

El adapter escribe una **ruta nueva** `wx/0600`. No modifica el archivo padre ni selecciona automáticamente el
sucesor. Quote nueva indica `--catalog nueva-version.json`; baseline CLI conserva review-v1. La nueva versión
incluye audit con actor/motivo/baseDigest/previewDigest y cambios completos, también dimensiones nuevas.
Duplicar `changeId` en el sucesor se rechaza. Las versiones se retienen; rollback consiste en seleccionar el padre
para nuevas simulaciones, sin editar artefactos ni usar tarifas retiradas como vigentes.

## Invariantes de cotización

- Resolver selecciona valores por quoteDate; no aplica alzas futuras antes de su fecha.
- Quote congela catálogo íntegro, brief, selección, snapshots y resultados; replay no carga catálogo actual.
- Ningún mantenimiento cambia cotizaciones/contratos activos. Revisarlos requiere nueva quote explícita y aprobación propia.
- Historical/synthetic no se convierten en comerciales por correr apply. Cambiar estado comercial/promoción no forma parte del change-set.
- Valores/costos/precios no vienen de presupuestos del expediente: éste aporta necesidades/capacidad.
- Cambio de monto no hereda confirmación de fuente automáticamente: reemplazo exige referencia nueva y status explícito.
- No hay API/DB/CRM/permiso remoto agregado. Local FS access es autoridad de operador, no autenticación empresarial certificada.

## Evidencia

Tests: fechas futuras, add/replace/retire, identidad/vigencia/conflictos, quote vieja, fuentes, licencias completas,
compartidos, anualidades y calendarios. [Prueba real de CLI](../../../data/pricing/v3-catalog/examples/verification.json).
El incremento de ejemplo10% es ilustrativo; no orden salarial ni precio actual de Adobe.

## Planes, reglas y créditos por demanda

TASK-2022 amplía mantenimiento local con `resources preview|apply`: schema
`pricing-v3-resource-change/1`, kind`policy|credits`, baseDigest/reason/replacement completo y versión nueva.
[Flujo y comandos](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md). Discovery expone el digest de
policy y, con `--credits`, el del catálogo de créditos. Preview presenta sucesor e impactos sobre demandas;
apply exige idéntico digest y escribe archivo nuevo, sin activarlo. Conservar change-set/preview como registro
del responsable/factura/fecha. Base o confirmación stale bloquean; precio confirmado cambiado necesita nueva
referencia y packs/costosIA cambian con evidencia nueva. Reglas review-only no se convierten en tarifas aprobadas.

La fecha de una renovación desconocida no se inventa. Adobe306 permanece como variante condicional explícita;
180 combinado no agrega Express por separado. Versionar por separado portfolio/capacidad y una nueva demanda.
Snapshots previos conservan policy/precios/créditos/FX; ninguna actualización recalcula una quote existente.

## Redondeo, tipo de cambio de cotización y costos confirmados (2026-10-10)

Decisión: [ADR del motor 1.1](../../architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md).
Datos: `catalog.review-v4.json` y su change-set `rounding-fx-confirmed-costs.change.json` en
[`data/pricing/v3-operating/`](../../../data/pricing/v3-operating/README.md). Esquema del registro:
[`catalog/contracts.ts`](../../../src/lib/finance/pricing-v3/catalog/contracts.ts).

### Registro `price_rounding`

`value` es `{ "currency", "multiple", "offerId"? }`; `source` y vigencia como cualquier otro registro. Identidad:
moneda más oferta (o general cuando no lleva `offerId`).

- Una regla general por moneda de cotización. Una regla con `offerId` gobierna esa oferta y prevalece sobre la general
  de su moneda. Sin regla vigente a `quoteDate` para la moneda de salida, esa moneda no se redondea.
- Cada moneda declara su propio múltiplo. No derivar el de una moneda convirtiendo el de otra por tipo de cambio.
- El catálogo se rechaza al validarse si la moneda no está registrada en `currencies`
  (`PRICE_ROUNDING_CURRENCY_NOT_REGISTERED`) o si el múltiplo no es un número entero de unidades mínimas de esa moneda
  (`INVALID_PRICE_ROUNDING_MULTIPLE`).
- Dos registros distintos aplicables al mismo nivel (dos generales de una moneda, o dos de la misma oferta) no los
  rechaza la validación, que sólo impide revisiones solapadas de un mismo `recordId`: bloquean la cotización en la
  resolución con `AMBIGUOUS_PRICE_ROUNDING`. Cambiar un múltiplo es un `replace` del registro existente, no un `add`.
- Agregar la primera regla vigente de una moneda cambia el contrato de las cotizaciones **nuevas** en esa moneda: la
  resolución pasa a emitir `1.1.0` y los precios salen redondeados. No toca ninguna cotización congelada, que lleva su
  catálogo dentro. Por eso una regla nueva entra siempre en un sucesor, nunca editando un catálogo ya usado.
- Consultar: `pricing:v3 catalog search|show --kind price_rounding --catalog <archivo> --date YYYY-MM-DD`.

### Tipo de cambio de cotización como valor de política

En v4 los registros `fx` desde USD hacia CLP, COP, MXN y PEN son valores de política decididos por el operador, con
USD como moneda de referencia y un margen prudencial sobre el spot observado. Su `source.reference` nombra la
decisión, no un mercado, y su `status` es `confirmed` porque lo confirmado es la decisión. No son una tasa observada,
contractual ni futura.

- Se revisan cuando el mercado se mueve más allá de ese margen (`QUOTE_FX_REVIEW` en el ledger). Cambiar uno es un
  `replace` con referencia nueva; la revisión anterior queda con su ventana cerrada.
- La dirección sigue siendo explícita: no se invierten ni se cruzan tasas.
- Fuera de esta decisión: USD→CLF sigue como valor estimado de 2025 y la referencia EUR→USD del BCE está fechada
  sólo el 2026-10-09, de modo que una cotización posterior que necesite EUR no tiene tasa vigente hasta que se
  registre una.

### Costos confirmados por su autor

Los 32 registros de costo humano pasaron a `confirmed` con la declaración del operador, autor del workbook, como
fuente. Los importes no cambiaron. Confirmar el valor no localiza el costo: `localization` sigue en `null`, y la
resolución reporta ese costo como `ESTIMATED_SOURCE` con el supuesto `UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY` aunque la
fuente esté confirmada. Lo que cierra ese aviso es declarar el país de cada registro (`LOCALIZED_TALENT_COSTS`), no
volver a confirmar el importe.

> Nota 2026-10-11: eso describe v4. El catálogo v5 declaró el país de los 32 registros (referencia Chile) y, con
> fecha de cotización desde ese día, el aviso y el supuesto ya no aparecen. Ver
> [factores de país](#factores-de-país-talento-y-mercado-2026-10-11).

### Sucesor v4

`catalog.review-v4.json` (versión `operating-review-2026-10-10-v4`) se emitió desde `catalog.review-v3.json` con
`catalog preview` y `catalog apply` sobre `rounding-fx-confirmed-costs.change.json`. El change-set hace tres cosas:
`add` de cinco reglas generales de redondeo (CLP, USD, PEN, COP, MXN), `replace` de cuatro registros `fx` y `replace`
de los 32 costos. Todas las operaciones rigen desde el 2026-10-10; las revisiones anteriores de `fx` y de costo se
conservan en el sucesor con su ventana cerrada el día previo. La selección es por `quoteDate`: las reglas de redondeo
no aplican a una fecha anterior a su inicio. Los valores viven en el JSON y en su `audit`; este documento no los copia.

Para cotizaciones nuevas el par es `catalog.review-v4.json` + `resources.review-v5.json`, más
`data/pricing/v3-resources/ai-credits.review-v1.json`. v2 y v3 no se editan ni se retiran: son los padres congelados
de los artefactos que los usaron. La CLI sin `--catalog` sigue leyendo review-v1.

> Nota 2026-10-11: el par para cotizaciones nuevas pasó a ser `catalog.review-v5.json` + `resources.review-v5.json`.
> v4 se suma a los padres congelados y tampoco se edita.

## Factores de país: talento y mercado (2026-10-11)

Decisión: [delta 1.2.0 del ADR del motor](../../architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md#delta-2026-10-11--contrato-120-el-piso-acompaña-al-factor-de-mercado).
Datos: `catalog.review-v5.json` y su change-set `country-factors.change.json` en
[`data/pricing/v3-operating/`](../../../data/pricing/v3-operating/README.md). Esquemas:
[`catalog/contracts.ts`](../../../src/lib/finance/pricing-v3/catalog/contracts.ts) y
[`schemas.ts`](../../../src/lib/finance/pricing-v3/schemas.ts). Cómo se calcula con ellos:
[contrato 1.2.0](cotizador-v3-contrato-y-validacion.md#contrato-120--el-piso-acompaña-al-factor-de-mercado-2026-10-11).

Son dos registros para dos hechos. El factor de talento dice cuánto cuesta una persona según el país donde vive; el
factor de mercado dice cuánto paga un cliente según su país. No se usa uno para representar el otro.

### Registro `talent_factor`

`value` es `{ "country", "referenceCountry", "factor" }`: el costo de una persona de `country` como múltiplo del
costo de referencia de `referenceCountry`. `source` y vigencia como cualquier otro registro.

- Se aplica sólo a un costo `reference_adjusted` cuyo `referenceCountry` coincide, en las líneas cuyo
  `talentCountry` es `country`. Multiplica el costo humano y, con él, su precio de política.
- Debe existir un registro vigente por cada par (país de la persona, país de referencia) que se quiera cotizar,
  incluido el del país de referencia consigo mismo, con factor 1. No se asume un factor neutral: sin registro la
  resolución bloquea con `MISSING_CATALOG_SELECTION` en `lines.<lineId>.talentFactor`, y con más de uno aplicable,
  con `AMBIGUOUS_SELECTION`.
- Es un solo factor por país para todos los perfiles. Donde un perfil o un seniority se aparta de él, lo que se
  registra es su costo específico (más abajo), no otro factor.
- No requiere contrato nuevo del kernel: existe desde 1.0.0. Agregarlo o cambiarlo no cambia el contrato que emite la
  resolución.

### Registro `market_factor`

`value` es `{ "country", "factor", "floorBasis"? }`: el multiplicador del precio del componente humano cuando el
cliente es de `country`. Herramientas, fees y provisiones no lo reciben; el costo tampoco.

- `floorBasis` es opcional y su único valor es `"base_market"`; cualquier otro se rechaza al validar
  (`SCHEMA_INVALID`). Declara que el piso de margen de ese mercado se lee sobre el precio del mercado base, de modo
  que el factor no vuelve a contarse contra el piso. Ausente, el piso se lee sobre el neto final.
- Sobre el veredicto de piso sólo tiene efecto con factor menor que 1. Declararlo exige una decisión del operador
  sobre ese mercado; no se agrega por defecto ni «para que no marque».
- Declararlo en el factor de un país cambia el contrato de las cotizaciones **nuevas** de ese mercado, cualquiera
  sea el valor del factor: la resolución pasa a emitir `1.2.0`. Una revisión posterior sin el campo vuelve a la base
  del neto final y al contrato anterior.
  Ninguna cotización congelada se mueve: lleva su catálogo dentro. Por eso entra siempre en un sucesor.
- Cambiar un factor es un `replace` del registro del país con referencia nueva; un país nuevo es un `add`, más
  `dimensions.countriesAdd` si el país no estaba declarado.
- Consultar: `pricing:v3 catalog search --kind market_factor --catalog <archivo> --date YYYY-MM-DD` (o
  `--kind talent_factor`).

### Costos declarados como referencia de Chile

En v5 los 32 registros de costo humano declaran
`localization: { "kind": "reference_adjusted", "referenceCountry": "CL" }`: el importe del workbook es el costo de
ese perfil en Chile. La fuente es la declaración de su autor (el operador), el `status` es `confirmed` y los
importes no cambiaron. El costo de una persona de otro país es ese importe por el factor de talento de su país.

Consecuencias al cotizar con fecha desde el 2026-10-11: la resolución ya no agrega el supuesto
`UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY`, el costo deja de reportarse como `ESTIMATED_SOURCE` y la línea ya no necesita
`allowUnlocalizedCost` para esos costos. Los factores estimados sí se reportan como `ESTIMATED_SOURCE`.

### Costo específico por perfil y país

Cuando se conoce el costo real de un perfil en un país, se registra como un costo propio y reemplaza al factor para
ese caso:

- `add` de un registro `cost` con el mismo `profileId` y `seniorityCode`,
  `localization: { "kind": "specific", "country": "<país>" }`, sus componentes, su moneda y una fuente concreta con
  su `status`.
- La resolución lo prefiere sobre el costo de referencia en toda línea de ese perfil cuyo `talentCountry` es ese
  país (salvo que la línea elija otro registro con `costRecordId`), y no le aplica factor de talento. Las líneas de
  otros países siguen con referencia × factor.
- No se retira el costo de referencia ni el factor del país: siguen sirviendo a los demás perfiles.
- El factor de mercado no cambia: un costo específico no desactiva el ajuste del mercado del cliente.

Es la forma de expresar hoy un factor de talento por perfil o por seniority, que no existe como registro.

### Sucesor v5

`catalog.review-v5.json` (versión `operating-review-2026-10-11-v5`) se emitió desde `catalog.review-v4.json` con
`catalog preview` y `catalog apply` sobre `country-factors.change.json`. El change-set hace cuatro cosas: `replace`
de los 32 costos (declaran la referencia Chile), `add` de seis factores de talento, `replace` de cinco factores de
mercado y `add` del de España, con `dimensions.countriesAdd: ["ES"]`. Todas las operaciones rigen desde el
2026-10-11; las revisiones anteriores de costo y de factor de mercado se conservan con su ventana cerrada el día
previo, de modo que una cotización con fecha anterior sobre v5 resuelve los valores de la época de v4.

Valores al 2026-10-11; la fuente es el JSON y su `audit`, y cambian por `replace`:

| País | Factor de talento (referencia CL) | Factor de mercado | `floorBasis` |
| --- | --- | --- | --- |
| CL | 1, por definición (confirmado) | 1 (confirmado) | — |
| CO | 0,80 (estimado) | 0,90 (confirmado) | `base_market` |
| PE | 0,85 (estimado) | 0,95 (estimado) | `base_market` |
| MX | 0,90 (estimado) | 1 (estimado) | — |
| US | 5 (estimado) | 1,10 (confirmado) | — |
| ES | 3 (estimado) | 1,10 (estimado) | — |

- Los factores de talento estimados salen de avisos de empleo y guías salariales leídos el 2026-10-11; no están
  validados con contrataciones reales. Los de mercado confirmados (CL, CO, US) los decidió el operador a partir de
  los rangos de la hoja «Factor País» del workbook, que era una tabla guía sin fórmulas que la referenciaran; los de
  PE, MX y ES son estimaciones. Validarlos es el pendiente `COUNTRY_FACTORS_UNVALIDATED` del
  [ledger](../../../data/pricing/v3-operating/operational-gaps.json).
- España entró como país, no como moneda de cotización: no hay regla de redondeo ni tipo de cambio vigente para
  EUR, así que todavía no se puede cotizar en EUR a un cliente de España.
- No hay factores por tipo de cliente (pyme, licitación, cliente estratégico): hoy se expresan como `agreed_net` en
  la demanda.

Para cotizaciones nuevas el par es `catalog.review-v5.json` + `resources.review-v5.json`, más
`data/pricing/v3-resources/ai-credits.review-v1.json`. v2, v3 y v4 no se editan ni se retiran: son los padres
congelados de los artefactos que los usaron. La CLI sin `--catalog` sigue leyendo review-v1.
