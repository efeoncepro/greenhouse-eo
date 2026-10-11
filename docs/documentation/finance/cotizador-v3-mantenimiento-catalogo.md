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

> Nota 2026-10-11: `apply` sigue sin elegir el sucesor, pero ya no hay que nombrarlo a mano en cada cotización.
> Después de emitir una versión nueva se mueve el puntero de versiones vigentes y las cotizaciones usan `--current`.
> Ver [puntero de versiones vigentes](#puntero-de-versiones-vigentes-2026-10-11).

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

> Nota 2026-10-11: una versión nueva de la policy o del catálogo de créditos tampoco se activa sola; se vuelve la
> vigente cuando se mueve el [puntero](#puntero-de-versiones-vigentes-2026-10-11). Los precios de herramienta ya no
> tienen fecha de término corta: ver
> [vigencia y fecha de revisión](#precios-unitarios-vigencia-y-fecha-de-revisión-2026-10-11).

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

> Nota 2026-10-11: el catálogo v6 registró esa tasa (EUR→USD 1,20, estimada, sin fecha de término). Ver
> [sucesor v6](#sucesor-v6-tipo-de-cambio-eur-de-cotización-2026-10-11).

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
> v4 se suma a los padres congelados y tampoco se edita. Ese mismo día, más tarde, las versiones vigentes dejaron de
> nombrarse a mano: las dice el [puntero](#puntero-de-versiones-vigentes-2026-10-11) y las imprime
> `pnpm --silent pricing:v3 current show` (al 2026-10-11, tras el piso de staffing: catálogo v7 y policy v6).

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
  con `AMBIGUOUS_SELECTION`. Pendiente conocido al 2026-10-11: ni `catalog preview` ni `catalog apply` detectan un
  factor duplicado (otro `recordId` para el mismo par); el change-set pasa los dos y el problema aparece recién al
  cotizar. Cambiar un factor es un `replace` del registro existente, no un `add`.
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

> Nota 2026-10-11: ese párrafo describe el momento en que se emitió v5. Desde ese mismo día las versiones vigentes
> las nombra el puntero y las imprime `current show` (al 2026-10-11, tras el piso de staffing:
> `catalog.review-v7.json` y `resources.review-v6.json`); v5 y `catalog.review-v6.json` pasaron a ser padres
> congelados. Las secciones siguientes describen el estado vigente.

## Puntero de versiones vigentes (2026-10-11)

Cada versión del catálogo, de la policy de recursos y del catálogo de créditos es un archivo que no se vuelve a
tocar, porque las cotizaciones ya congeladas dependen de las anteriores. Por eso «la versión vigente» no puede ser
un nombre de archivo: es un documento aparte, el único que sí cambia. Fuente ejecutable:
[`adapters/current-versions.ts`](../../../src/lib/finance/pricing-v3/adapters/current-versions.ts).

### Qué es

`data/pricing/v3-operating/current.json`, con `schemaVersion: pricing-v3-current/1`. Nombra tres fuentes —`catalog`,
`policy` y `credits`— y de cada una guarda la ruta relativa al repositorio, la versión y el digest (la huella del
contenido). Guarda además `updatedAt` (el día en que se movió) y `reason` (por qué).

Al 2026-10-11, tras el piso de staffing, nombra `data/pricing/v3-operating/catalog.review-v7.json`,
`data/pricing/v3-operating/resources.review-v6.json` y `data/pricing/v3-resources/ai-credits.review-v1.json`. La
fuente de esa respuesta es el propio puntero, no este documento: `pnpm --silent pricing:v3 current show` lo imprime.

### Cómo se usa al cotizar

Agrega `--current` a la operación. La CLI toma del puntero cada fuente que no hayas pasado con `--catalog`,
`--policy` o `--credits`; una ruta explícita siempre gana. Antes de usar una fuente la comprueba: lee el archivo y
compara su versión y su digest con los del puntero. Si no coinciden, rechaza con `CURRENT_VERSIONS_MISMATCH` y no
calcula nada. Un puntero desactualizado se rechaza, nunca se sigue.

```bash
pnpm --silent pricing:v3 compose quote --input demand.json --current --out artifact.json
```

Sin `--current` nada cambió: sin `--catalog` se lee la baseline histórica review-v1, y `--policy` y `--credits`
siguen siendo obligatorios donde lo eran.

### Cómo se consulta

```bash
pnpm --silent pricing:v3 current show
```

Imprime el puntero, su `pointerDigest` y, por cada fuente, un `status`:

| `status` | Qué significa |
| --- | --- |
| `match` | El archivo existe y su versión y digest son los del puntero |
| `version_mismatch` | El archivo declara otra versión |
| `digest_mismatch` | Misma versión, contenido distinto |
| `invalid` | El archivo no pasa su propia validación |
| `unreadable` | No se pudo leer el archivo |

`consistent` es `true` sólo si las tres están en `match`; el comando sale con 0 en ese caso y con 2 en cualquier
otro. `current show --input otro.json` revisa un puntero distinto del versionado, por ejemplo uno escrito con
`--out` para revisarlo antes.

### Cómo se mueve

```bash
pnpm --silent pricing:v3 current set --catalog A.json --policy B.json --credits C.json \
  --reason "por qué cambia" --confirm <pointerDigest>
```

- Las tres rutas y `--reason` son obligatorias. Las rutas deben quedar dentro del repositorio.
- La versión y el digest de cada fuente no se escriben a mano: la CLI los calcula desde los archivos, así que el
  puntero no puede nombrar algo que nadie leyó.
- `--confirm` es el `pointerDigest` del puntero que vas a reemplazar, tal como lo muestra `current show`. Es el
  mismo candado que `catalog apply`: sólo reemplazas lo que leíste. Si otra persona o sesión movió el puntero entre
  tu lectura y tu escritura, el digest ya no coincide y la CLI rechaza con `CURRENT_VERSIONS_CONFLICT`. Si falta
  `--confirm` rechaza con `MISSING_ARGUMENT`.
- `--out otro.json` escribe el puntero en otra ruta para revisarlo, sin tocar el versionado. Si esa ruta no existe
  no hay nada que confirmar, y pasar `--confirm` ahí también es `CURRENT_VERSIONS_CONFLICT`.
- Mover el puntero no aprueba nada. Dice cuál es la versión que se usa por defecto; no convierte un precio estimado
  en confirmado ni una simulación en un precio aprobado.

### Regla de mantenimiento

Después de que `catalog apply` o `resources apply` emite una versión nueva, mueve el puntero con `current set`. Una
prueba permanente ([`pricing-v3-current-versions.test.ts`](../../../src/lib/finance/pricing-v3/__tests__/pricing-v3-current-versions.test.ts))
exige que el puntero nombre la versión de número más alto presente en cada carpeta. Si alguien emite una versión y
olvida mover el puntero, `pnpm pricing:v3:test` queda en rojo.

Las versiones anteriores no se borran ni se editan: los artefactos congelados dependen de ellas. Para simular con
una versión anterior pásala con su ruta explícita (`--catalog`, `--policy`, `--credits`), que gana sobre el puntero.
El puntero mismo no se devuelve a una versión anterior mientras exista una más nueva en la carpeta: la misma prueba
lo marcaría en rojo. Corregir un valor es emitir otra versión.

## Precios unitarios: vigencia y fecha de revisión (2026-10-11)

Decisión del operador (CEO) del 2026-10-11: **un precio unitario no vence**. En sus palabras, Notion o Microsoft 365
no cambian su precio; lo que cambia es cuántas licencias se contratan. Datos: `resources.review-v6.json` (versión
`operating-review-2026-10-11-v6`) y su cambio `stable-unit-prices.change.json`. Esquema:
[`composition-contracts.ts`](../../../src/lib/finance/pricing-v3/resources/composition-contracts.ts).

Un precio de herramienta tiene ahora dos fechas con funciones distintas:

| Fecha | Dónde vive | Qué hace cuando pasa |
| --- | --- | --- |
| Vigencia (`price.source.effectiveUntil`) | En la fuente del precio | **Bloquea**: una cotización con fecha posterior queda `needs_input` con `RESOURCE_PRICE_NOT_EFFECTIVE` |
| Revisión (`reviewBy`) | En la entrada del precio, opcional | **Avisa**: la cotización se calcula igual y el aviso aparece en el resumen |

- Antes de v6 cada precio tenía una vigencia corta, casi siempre 30 días desde su evidencia. Cotizar con una fecha
  posterior quedaba bloqueado aunque el precio no hubiera cambiado.
- En v6 los 25 precios con importe propio tienen vigencia abierta (`9999-12-31`) y `reviewBy: 2027-04-11`. Ningún
  importe, moneda, unidad ni referencia de fuente cambió.
- La fecha de revisión a seis meses la eligió el agente; el operador decidió que el precio no vence, no esa fecha.
- `reviewBy` no entra en ningún cálculo y nunca cambia un resultado: sólo alimenta avisos. Un precio cambia
  únicamente cuando se emite una versión nueva de la policy con `resources preview|apply` y se mueve el puntero.
- Un plan que todavía no tiene precio (`pendingReason`) no admite `reviewBy`: no hay nada que revisar.
- La cantidad de licencias no es parte del precio. Se declara en cada cotización, en las asignaciones de la demanda.
- Que un precio no venza no lo confirma. De los 25, 23 siguen marcados como estimados (en su mayoría precio de
  lista público) y 2 como confirmados. Confirmar el plan realmente contratado es el pendiente `UNIT_PRICE_REVIEW`
  del [ledger](../../../data/pricing/v3-operating/operational-gaps.json), a cargo de Operations.

### Cómo saber qué toca revisar

```bash
pnpm --silent pricing:v3 resources inspect --current --date 2026-10-11
```

La respuesta trae `priceReview`, leído a la fecha que pasas:

| Clave | Contenido | ¿Bloquea? |
| --- | --- | --- |
| `reviewDue` | Fechas de revisión que ya pasaron | No |
| `dueSoon` | Vigencias o fechas de revisión que caen dentro de `withinDays` (30 días) | Todavía no |
| `expired` | Vigencias que ya terminaron | Sí, a una cotización de esa fecha que use ese dato |

Cada aviso dice si es una vigencia (`hard_expiry`) o una revisión (`review`), a qué se refiere (un precio de
herramienta, la policy, un registro del catálogo o un proveedor de créditos), su fecha, los días que faltan y, cuando
bloquea, con qué diagnóstico. Al cotizar, `compose prepare|quote` muestran los mismos avisos sólo para los precios que
esa cotización usa, bajo `runNotices.priceDates`
([contrato](cotizador-v3-contrato-y-validacion.md#resumen-avisos-de-la-corrida-y-exposición-a-estimados-2026-10-11)).

Al 2026-10-11 la única entrada en `expired` es la referencia EUR→USD del BCE, que valía sólo el 2026-10-09. El
catálogo v6 ya tiene otra tasa para ese par; que la anterior siga listada es un pendiente conocido.

## Sucesor v6: tipo de cambio EUR de cotización (2026-10-11)

`catalog.review-v6.json` (versión `operating-review-2026-10-11-v6`) se emitió desde `catalog.review-v5.json` con
`catalog preview` y `catalog apply` sobre `eur-quote-fx.change.json`. El change-set hace una sola cosa: `add` del
registro `fx:EUR:USD`, con tasa 1,20, vigencia desde el 2026-10-11 sin fecha de término y `status: estimated`.

- Por qué: la única tasa EUR→USD del catálogo era la referencia del BCE (1,1206), válida sólo el 2026-10-09. Una
  cotización de fecha posterior con una herramienta que se paga en EUR no tenía tasa.
- Quién la eligió: el agente, aplicando la instrucción del operador del 2026-10-10 de usar un margen prudencial
  sobre el spot. El operador no decidió una tasa para EUR; por eso el registro es estimado y su revisión está en
  `QUOTE_FX_REVIEW` del [ledger](../../../data/pricing/v3-operating/operational-gaps.json). Como esta tasa convierte
  costos, el lado prudente es una tasa más alta.
- Qué no agrega: no hay tasa USD→EUR ni regla de redondeo para EUR. **Todavía no se puede emitir una cotización en
  EUR**; a un cliente de España se le cotiza en USD. Las tasas no se invierten ni se cruzan solas.
- CLF sigue igual: sin regla de redondeo y con USD→CLF como valor estimado de 2025.

Los demás registros de v5 —costos, factores de país, redondeo y tipos de cambio desde USD— no cambiaron.

## Sucesor v7: piso de margen de staffing (2026-10-11)

`catalog.review-v7.json` (versión `operating-review-2026-10-11-v7`) se emitió desde `catalog.review-v6.json` con
`catalog preview` y `catalog apply` sobre `staffing-margin-floor.change.json`. El change-set son 32 `replace`, uno
por perfil (`pricing:ECG-001`…, revisión 2, vigentes desde el 2026-10-11), sobre la oferta
`talent-assurance-staffing`: una persona vendida por dedicación (staff augmentation).

- Qué cambia: cada registro pasa de `method: markup` con el recargo histórico del workbook y `minimumMargin` 0 a
  `method: target_margin` sobre todos los costos con `minimumMargin` 0,25. Objetivo por tier del workbook: 0,30 en
  `historical-tier-1` y `historical-tier-2`, 0,35 en `historical-tier-3`, 0,40 en `historical-tier-4`.
- Quién decidió qué: el piso de 25 % lo decidió el CEO el 2026-10-11 («25% está bien como piso y de ahí en adelante
  subimos dependiendo»). Los objetivos por tier los propuso el agente y el CEO los confirmó el mismo día
  («sí me sirven»); los registros son `confirmed` y su nota dice quién propuso y quién decidió.
- Qué no cambia: `creative-managed-service` y el resto de v6. Una cotización con fecha anterior al 2026-10-11, las
  versiones anteriores del catálogo y los artefactos ya congelados conservan el recargo histórico.
- [Decisión y alternativas descartadas](../../architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--piso-de-margen-de-staff-augmentation-catálogo-v7).

## Valores de política vigentes al 2026-10-11

Resumen para leer sin abrir el JSON. La fuente es el catálogo que nombra el puntero y su `audit`; estos valores
cambian sólo con una versión nueva. Los factores de país están en la tabla de
[sucesor v5](#sucesor-v5).

**Margen.** Hay dos pisos, ambos decididos por el CEO, y cada uno vive en los 32 registros de su oferta. El de
45 % es la norma para los servicios gestionados de la práctica creativa: la política `creative-managed-service` tiene
margen objetivo 0,45 y mínimo 0,45 (2026-10-10). El de 25 % es el de una persona vendida por dedicación (staff
augmentation): desde el catálogo v7 la política `talent-assurance-staffing` tiene mínimo 0,25 y un objetivo de 0,30,
0,35 o 0,40 según el tier del perfil (2026-10-11; piso y objetivos decididos por el CEO). Donde se puede
ganar más se sube el objetivo de la oferta o del perfil, nunca se baja el piso. Una cotización con fecha anterior al
2026-10-11 o hecha sobre un catálogo anterior conserva el recargo histórico sin piso, y ahí que no se marque ninguna
línea no prueba que cumpla un piso. El 40 %/35 % que muestra `compose assess` es una propuesta genérica
sin aprobar, nunca un piso. Un precio bajo el piso queda marcado y requiere una excepción explícita del CEO,
registrada caso por caso. La que consta en el ledger (`MARGIN_FLOOR_SCOPE`), SKY social care 2027, se aprobó porque
SKY ya es cliente; no es referencia de margen para ningún otro cliente.

**Redondeo comercial** (decisión del CEO, 2026-10-10; todas las ofertas; cada fila facturable sube a su múltiplo):

| Moneda | Múltiplo |
| --- | --- |
| CLP | 10.000 |
| USD | 10 |
| PEN | 50 |
| COP | 50.000 |
| MXN | 100 |
| CLF, EUR | Sin regla: no se redondean |

**Tipo de cambio de cotización** (USD es la moneda de referencia; valor de política con margen prudencial sobre el
spot, no una tasa observada):

| Par | Tasa | Desde | Quién lo decidió |
| --- | --- | --- | --- |
| USD→CLP | 1.000 | 2026-10-10 | CEO |
| USD→COP | 3.650 | 2026-10-10 | CEO |
| USD→MXN | 19,25 | 2026-10-10 | CEO |
| USD→PEN | 3,70 | 2026-10-10 | CEO |
| USD→CLF | 0,024 | 2026-10-09 | Nadie: valor estimado de 2025, sin revisar |
| EUR→USD | 1,20 | 2026-10-11 | El agente, bajo la instrucción de margen prudencial; estimado |
| USD→EUR | No existe | — | Por eso no se puede emitir en EUR |

Pendientes abiertos sobre estos valores, con su responsable, en el
[ledger](../../../data/pricing/v3-operating/operational-gaps.json): `QUOTE_FX_REVIEW`, `COMMERCIAL_ROUNDING_SCOPE`,
`COUNTRY_FACTORS_UNVALIDATED`, `UNIT_PRICE_REVIEW` y `COMMERCIAL_POLICY` (confirmar por perfil los objetivos de
staffing).
