# Contrato de mantenimiento del catálogo V3

[Superficie implementada y formatos](cotizador-v3-superficie-implementada.md) y [manual operativo completo](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md): mantenimiento monetario y de policy/créditos son carriles separados, con versión y evidencia propias.

Accepted para prototipo local, operador 2026-10-09. [ADR](../../architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md).
Código: `catalog/contracts.ts`, `catalog/catalog.ts`, `adapters/catalog-local.ts` bajo `src/lib/finance/pricing-v3`.
[Manual y ejemplos](../../manual-de-uso/finance/catalogo-v3-seleccion-y-actualizacion.md).

## Ownership y revisión

- Finance/Commercial mantiene costo humano, moneda/FX, fees, margen/markup y factores de mercado. Desde el
  2026-10-10 también el redondeo comercial; piso de margen, tipo de cambio de cotización, múltiplos de redondeo y
  excepciones los decide el operador (CEO) y se registran con su decisión como fuente.
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
price_rounding ([detalle](#redondeo-tipo-de-cambio-de-cotización-y-costos-confirmados-2026-10-10)). Perfil no incorpora fee,
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
