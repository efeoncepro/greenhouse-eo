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
market_factor llevan valores desde el 2026-10-11 ([detalle](#factores-de-país-talento-y-mercado-2026-10-11)). Desde
la tarde del 2026-10-11 hay un kind más, engagement_factor: la razón de precio de cada forma del trabajo
([detalle](#registro-engagement_factor)). Perfil no incorpora fee,
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
180 combinado no agrega Express por separado (estado hasta la policy v6; desde la v7 Adobe son dos productos
facturados en pesos y el escenario es el precio de lista de la factura:
[policy v7](#policy-v7-adobe-tal-como-se-factura-2026-10-11)). Versionar por separado portfolio/capacidad y una nueva
demanda.
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
> `pnpm --silent pricing:v3 current show`. Este documento no repite cuál es la vigente; como dato fechado, tras la
> oferta SEO/AEO del 2026-10-11 eran el catálogo v8 y la policy v6, y al cierre de ese día el catálogo v9 y la
> policy v10.

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
  validados con contrataciones reales. Siguen estimados por elección del operador, que pidió que el agente los
  propusiera y quedaran marcados así: no es una decisión que deba. Los de mercado confirmados (CL, CO, US) los
  decidió el operador a partir de los rangos de la hoja «Factor País» del workbook, que era una tabla guía sin
  fórmulas que la referenciaran; los de PE, MX y ES son estimaciones. Validarlos es el pendiente `COUNTRY_FACTORS_UNVALIDATED` del
  [ledger](../../../data/pricing/v3-operating/operational-gaps.json).
- España entró como país, no como moneda de cotización: no hay regla de redondeo ni tipo de cambio vigente para
  EUR, así que todavía no se puede cotizar en EUR a un cliente de España.
- No hay factores por tipo de cliente (pyme, licitación, cliente estratégico): hoy se expresan como `agreed_net` en
  la demanda.

Para cotizaciones nuevas el par es `catalog.review-v5.json` + `resources.review-v5.json`, más
`data/pricing/v3-resources/ai-credits.review-v1.json`. v2, v3 y v4 no se editan ni se retiran: son los padres
congelados de los artefactos que los usaron. La CLI sin `--catalog` sigue leyendo review-v1.

> Nota 2026-10-11: ese párrafo describe el momento en que se emitió v5. Desde ese mismo día las versiones vigentes
> las nombra el puntero y las imprime `current show`, que es la fuente. Como dato fechado: tras la oferta SEO/AEO
> eran `catalog.review-v8.json` y `resources.review-v6.json`, y al cierre del 2026-10-11 `catalog.review-v9.json` y
> `resources.review-v10.json`. Cada versión anterior pasó a ser un padre congelado. Las secciones siguientes describen
> cada versión en el orden en que se emitió.

## Puntero de versiones vigentes (2026-10-11)

Cada versión del catálogo, de la policy de recursos y del catálogo de créditos es un archivo que no se vuelve a
tocar, porque las cotizaciones ya congeladas dependen de las anteriores. Por eso «la versión vigente» no puede ser
un nombre de archivo: es un documento aparte, el único que sí cambia. Fuente ejecutable:
[`adapters/current-versions.ts`](../../../src/lib/finance/pricing-v3/adapters/current-versions.ts).

### Qué es

`data/pricing/v3-operating/current.json`, con `schemaVersion: pricing-v3-current/1`. Nombra tres fuentes —`catalog`,
`policy` y `credits`— y de cada una guarda la ruta relativa al repositorio, la versión y el digest (la huella del
contenido). Guarda además `updatedAt` (el día en que se movió) y `reason` (por qué).

La fuente de qué nombra es el propio puntero, no este documento: `pnpm --silent pricing:v3 current show` lo imprime.
Como dato fechado, al cierre del 2026-10-11 nombraba `data/pricing/v3-operating/catalog.review-v9.json`,
`data/pricing/v3-operating/resources.review-v10.json` y `data/pricing/v3-resources/ai-credits.review-v1.json`; más
temprano ese día, tras la oferta SEO/AEO, el catálogo v8 y la policy v6.

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
- Nota 2026-10-11 (tarde): esos conteos son los de v6. Desde la policy v7 son 26 precios con importe propio (Adobe
  Express dejó de estar pendiente): 4 confirmados y 22 estimados. 24 llevan la revisión del 2027-04-11 y los dos de
  Creative Cloud Pro la del 2026-12-01, porque su descuento termina antes. Desde la policy v9 son 27 (se suma el
  precio facturado de Microsoft 365): 5 confirmados y 22 estimados; 24 llevan la revisión del 2027-04-11 y los tres
  de Adobe (los dos de Creative Cloud Pro y el de Adobe Express) la del 2026-11-16, el día en que renueva su
  contrato. La policy v10 no cambia esos conteos.

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

## Sucesor v8: oferta de la práctica SEO/AEO (2026-10-11)

`catalog.review-v8.json` (versión `operating-review-2026-10-11-v8`) se emitió desde `catalog.review-v7.json` con
`catalog preview` y `catalog apply` sobre `seo-aeo-managed-service.change.json`. El change-set son 32 `add`, uno por
perfil (`pricing:<profileId>:seo-aeo-managed-service`, revisión 1, vigentes desde el 2026-10-11): una tercera oferta,
los servicios gestionados de la práctica SEO/AEO.

- Qué agrega: `method: target_margin` con `rate` 0,55 sobre todos los costos y `minimumMargin` 0,45, registros
  `confirmed`.
- Quién decidió qué: el piso de 45 % de la práctica lo aprobó el CEO el 2026-07-13, con una banda objetivo de 55–60 %.
  El 2026-10-11 aprobó llevarlo al cotizador como oferta propia con objetivo 55 %, el extremo bajo de esa banda,
  propuesto por el agente y confirmado por él.
- Qué no cambia: las políticas de `creative-managed-service` y `talent-assurance-staffing` y el resto de v7. Con una
  fecha anterior al 2026-10-11 la oferta no tiene política y la cotización queda `needs_input`.
- Medido: el ejemplo de servicio gestionado del repo, con esta oferta, Chile, CLP y fecha 2026-10-11, calcula con
  55,07 % de margen, motor `pricing-v3-local/1.1.0`, sin líneas bajo el piso. Vuelto a medir esa tarde con las
  versiones vigentes da el mismo margen, pero la demanda necesita ahora excluir, con su motivo, la tarea de Adobe
  Express de sus dos líneas de community manager ([policy v7](#policy-v7-adobe-tal-como-se-factura-2026-10-11)).
- [Decisión y por qué una oferta propia](../../architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--oferta-propia-de-la-práctica-seoaeo-catálogo-v8).

## Sucesor v9: forma del trabajo, puesta en marcha y CLP→USD (2026-10-11)

`catalog.review-v9.json` (versión `operating-review-2026-10-11-v9`) se emitió desde `catalog.review-v8.json` con
`catalog preview` y `catalog apply` sobre `engagement-forms-setup-clp.change.json`. El change-set son 13
operaciones, todas vigentes desde el 2026-10-11, y hace tres cosas. Las políticas de precio y los pisos no se tocan.

**1. La forma del trabajo como dato propio** — 2 `add` de un kind nuevo.

- Qué agrega: `engagement:on_going` (razón de precio 1) y `engagement:on_demand` (razón 1,10), los dos generales y
  `confirmed`. Qué es la forma y cómo entra al precio:
  [superficie implementada](cotizador-v3-superficie-implementada.md#forma-del-trabajo-on-going-y-on-demand-2026-10-11).
- Quién decidió qué: el CEO eligió el diseño —un registro por forma— y preguntó si 10 % era correcto, dejando el
  ajuste al agente. El agente lo mantuvo: es el multiplicador de «modelo comercial» del Excel de pricing, el mismo
  concepto que usa el cotizador de Greenhouse en producción, y el extremo bajo del 10–15 % que una agencia suele descontar a un servicio
  continuo frente a su tarifa de proyecto.
- Alternativa descartada: duplicar las 96 políticas de precio por forma. El recargo habría quedado repartido en 96
  registros con tasas raras y cada cambio de objetivo habría que hacerlo dos veces.
- Qué no carga: las formas híbrida y de licencia o consultoría del Excel. Un trabajo híbrido se cotiza como dos
  cotizaciones.

**2. La puesta en marcha con costo propio** — 2 `add`, 7 `replace` y 1 `retire`.

- Qué agrega: `provision-account-onboarding` (200 USD, una vez por persona que se suma a una cuenta) y
  `provision-recruiting` (500 USD, una vez por persona, sólo cuando hay que contratarla para ese cliente). Las dos
  `estimated`.
- Los 7 `replace` son los siete kits de staffing (revisión 2): su requisito `setup` pasa a resolverse con el
  onboarding, por defecto, y ganan un requisito opcional `recruiting` que sólo entra cuando la línea lo elige con
  `choices`. `managed-service-core` no cambia: no tiene requisito de puesta en marcha.
- El `retire` es `trial-setup`, el importe de prueba de 100 USD: deja de seleccionarse desde el 2026-10-11. Una
  cotización con fecha anterior lo sigue resolviendo.
- Quién decidió qué: las dos provisiones las propuso el agente y las aceptó el CEO; se van a medir en las dos
  próximas incorporaciones reales (pendiente `STARTUP_PROVISIONS_NOT_MEASURED` del
  [ledger](../../../data/pricing/v3-operating/operational-gaps.json)). Por qué no se trajo la regla del Excel de un
  mes del costo de la persona:
  [provisiones y costos](cotizador-v3-provisiones-y-costos.md#puesta-en-marcha-onboarding-por-persona-y-reclutamiento-opcional-2026-10-11).

**3. La tasa CLP→USD** — 1 `add`.

- Qué agrega: `fx:CLP:USD`, 0,001, `confirmed`. Es la inversa del tipo de cambio de cotización de 1.000 CLP por USD
  que decidió el CEO, y existe para que un costo facturado en pesos entre al cálculo y vuelva a una cotización en CLP
  por el mismo importe. Debe moverse junto con `fx:USD:CLP`: cambiar uno sin el otro los deja incoherentes.

Medido el 2026-10-11: el ejemplo `designer-on-demand.demand.json` (un mes de un diseñador senior en Chile,
On-Demand, CLP) calcula con motor `pricing-v3-local/1.3.0` y ninguna línea bajo el piso. Su artefacto congelado,
con la policy v7 (Adobe con descuento), da neto 2.790.000; vuelto a cotizar con `--current` y la policy v10 (Adobe
sin descuento), 2.870.000. El siguiente catálogo sería v10.

### Registro `engagement_factor`

`value` es `{ "form", "priceRatio", "offerId"? }`; `source` y vigencia como cualquier otro registro. Identidad: la
forma más la oferta (o general cuando no lleva `offerId`).

- Un registro general por forma. Un registro con `offerId` gobierna esa oferta y prevalece sobre el general de la
  misma forma.
- Las formas son datos: existe la que tenga un registro vigente. Agregar una es un `add`; cambiar una razón es un
  `replace` del registro existente con referencia nueva, no un `add`.
- Una forma declarada en un pedido sin registro vigente a la fecha de la cotización bloquea con
  `MISSING_CATALOG_SELECTION` en la ruta `engagementForm`. Dos registros vigentes del mismo nivel bloquean con
  `AMBIGUOUS_SELECTION`. Nunca se asume una razón de 1.
- La razón no tiene tope en el esquema: sólo debe ser mayor que cero. Una razón menor que 1 sería un descuento por
  compromiso; hoy no hay ninguna.
- Agregar o cambiar un registro no toca ninguna cotización congelada ni ningún pedido que no declare la forma.
- Consultar: `pricing:v3 catalog search --kind engagement_factor --current --date YYYY-MM-DD`.

## Policy v7: Adobe tal como se factura (2026-10-11)

`resources.review-v7.json` (versión `operating-review-2026-10-11-v7`) se emitió desde `resources.review-v6.json` con
`resources preview` y `resources apply` sobre `adobe-invoice.change.json`. Fuente: la factura de Adobe del
2026-09-16, que mostró el CEO. Ninguna otra herramienta cambia.

- Qué cambia: Adobe deja de ser un paquete declarado de 180 USD y pasa a dos productos con importe confirmado por
  la factura, en CLP y con IVA (decisión del CEO: el impuesto se recupera, pero no mes a mes). `adobe` es Adobe
  Creative Cloud Pro, 3 licencias, CLP 162.605 al mes, e incluye Adobe Express. `adobe-express` es Adobe Express, 3
  licencias, CLP 16.240 al mes; antes estaba pendiente de precio.
- El descuento: Creative Cloud Pro tiene un 50 % que el CEO espera que termine en unos dos meses. `current` lleva
  fecha de revisión 2026-12-01 y `renewal-scenario` pasa a ser el precio de lista de la factura con IVA, CLP 325.405,5
  al mes, `estimated`. Confirmar el precio real cuando termine el descuento es el pendiente `ADOBE_DISCOUNT_ENDS`.
  Eso duró hasta la v9: la [policy v10](#policy-v10-creative-cloud-pro-se-cotiza-sin-descuento-2026-10-11) invirtió
  los dos precios y retiró `renewal-scenario`.
- Quién usa qué: la tarea `express-design` sale de `adobe` y queda sólo en `adobe-express`, y las recetas de Social
  Media Manager, Community Manager, Content Manager y Content Creator la incluyen. Esos cuatro perfiles los confirmó
  el CEO.
- Dato nuevo en un precio: `commitmentTermMonths`, opcional. Dice cuántos meses hay que seguir pagando una licencia
  una vez tomada. Los tres precios de Adobe declaran 12. No entra a ningún cálculo.
- Regla de composición más estrecha: `BUNDLED_TOOL_DOUBLE_COUNT` se dispara sólo cuando la misma línea o persona
  lleva el plan y un producto que el plan incluye. Un equipo mixto ya no se bloquea.
- La policy rige desde el 2026-10-11 (la v6 regía desde el 2026-10-10). Consecuencia: una demanda con fecha anterior
  cotizada con `--current` queda `needs_input` con `RESOURCE_POLICY_NOT_EFFECTIVE`; para reproducirla se pasan las
  fuentes de su época por ruta explícita.
- Otra consecuencia: una demanda escrita para la v6 con uno de esos cuatro perfiles queda `needs_input` con
  `RESOURCE_ALLOCATION_REQUIRED` para `adobe-express` hasta que declare la asignación o excluya la tarea con un
  motivo. `managed-care-colombia.demand.json` está en ese caso; su artefacto congelado se sigue reproduciendo.
- Una demanda que usa un producto de Adobe nombra `fx:CLP:USD` en `fxRecordIds` (catálogo v9).

## Policy v8: cuánto tiempo se sigue pagando una licencia (2026-10-11)

`resources.review-v8.json` (versión `operating-review-2026-10-11-v8`) se emitió desde `resources.review-v7.json` con
`resources preview` y `resources apply` sobre `supplier-contract-terms.change.json`. Sólo agrega plazos: ningún
importe, moneda ni unidad cambia, y una cotización da los mismos totales con v7 y con v8.

El plazo (`commitmentTermMonths`, de 1 a 120) dice cuánto tiempo hay que seguir pagando una licencia una vez que se
toma. Habla de la licencia, no del papel del contrato. Lo declaró el CEO el 2026-10-11:

| Herramienta | Plazo declarado | Por qué |
| --- | --- | --- |
| Adobe (los tres precios) | 12, desde v7 | Plan anual pagado mes a mes: una licencia comprada sigue disponible y se sigue cobrando hasta que el contrato se renueva; la cuenta no baja |
| Microsoft 365 (sus dos precios mensuales) | 1 | El contrato es anual y se paga mes a mes, pero quitar una licencia baja la cuenta |
| Notion (`current`) | 1 | Se paga mes a mes, sin más compromiso |
| HubSpot | Sin declarar | Es anual, pero su precio vigente está pendiente de evidencia; un precio pendiente no admite plazo |

- Un plazo de 1 es una declaración, distinta de no declarar nada: con él la lectura de compromisos deja de listar la
  herramienta como «sin declarar».
- En la v8 los importes de Microsoft 365 eran precios públicos de referencia, porque su factura estaba pendiente;
  llegó con la [policy v9](#policy-v9-microsoft-365-y-notion-como-se-facturan-y-la-renovación-de-adobe-2026-10-11).
  La evidencia del plan de HubSpot sigue en el pendiente `SUPPLIER_CONTRACT_TERMS`, a cargo de Operations.
- Las demás herramientas todavía no declaran plazo.
- Límite de la v8: declara cuánto dura el plazo, no cuándo se renueva el contrato. Con ella la lectura de
  compromisos supone un plazo entero desde el primer mes cotizado y sobrestima lo que falta de un contrato que ya
  está corriendo, como el de Adobe. La policy v9 agrega la fecha de renovación.
- Un artefacto congelado con v7 conserva su policy: su lectura de compromisos sigue mostrando Notion y Microsoft 365
  como no declarados.

## Policy v9: Microsoft 365 y Notion como se facturan, y la renovación de Adobe (2026-10-11)

`resources.review-v9.json` (versión `operating-review-2026-10-11-v9`) se emitió desde `resources.review-v8.json` con
`resources preview` y `resources apply` sobre `microsoft-invoice-adobe-renewal.change.json`. Son tres hechos que el
CEO mostró el 2026-10-11: dos facturas y la consola de Adobe. El agente no propuso ningún valor aquí.

- **Microsoft 365 como se factura.** Factura G185142527 del 2026-09-16: Business Standard, USD 14,70 por licencia
  al mes, seis licencias, sin impuesto. El precio `current` deja de estar pendiente y queda confirmado. La factura
  nombra un compromiso de un año facturado mes a mes, y el CEO afirma que asignar o quitar una licencia sube o baja
  el monto mensual: una licencia obliga por un mes (`commitmentTermMonths: 1`). Los precios públicos de referencia
  (`public-standard-teams-monthly` a USD 16,80 y los demás) siguen en la policy; una cotización nueva debería elegir
  `current`. Las demandas de ejemplo eligen todavía el precio público, así que sus cifras no cambian.
- **Notion como se factura.** Factura 0D8C80A9-0039 del 2026-09-21: Business mensual, nueve miembros a USD 24, más
  3000 créditos de Notion a USD 30, sin impuesto. Los importes no cambian; ahora citan la factura. Mes a mes.
- **La renovación de Adobe.** El contrato se renueva el 2026-11-16, según la consola del proveedor: plan anual
  pagado mes a mes; en la renovación se puede cambiar el número de licencias o cancelar el plan. Los tres precios de
  Adobe declaran esa fecha y la llevan también como fecha de revisión (antes, 2026-12-01 los de Creative Cloud Pro y
  2027-04-11 el de Adobe Express). El CEO espera que el descuento de Creative Cloud Pro termine en unos dos meses;
  que termine exactamente en esa renovación no está confirmado.
- **Dato nuevo en un precio: `commitmentRenewsOn`**, fecha ISO, opcional, y sólo se admite junto con
  `commitmentTermMonths`. El plazo dice cuánto obliga una licencia; la fecha dice en qué punto está el plazo que ya
  corre. Con ella la lectura de compromisos cuenta lo que queda hasta la renovación en vez de suponer un plazo
  entero: la licencia queda atada hasta la primera renovación posterior al último mes cotizado, y si la cotización
  cruza una renovación, hasta la siguiente. Un precio con plazo y sin fecha se sigue leyendo como antes, como un
  techo. No entra a ningún cálculo.
- Ningún importe de una cotización cambia entre v8 y v9 mientras la demanda no elija el precio `current` de
  Microsoft 365.

## Policy v10: Creative Cloud Pro se cotiza sin descuento (2026-10-11)

`resources.review-v10.json` (versión `operating-review-2026-10-11-v10`) se emitió desde `resources.review-v9.json`
con `resources preview` y `resources apply` sobre `adobe-without-discount.change.json`. Decisión del CEO del
2026-10-11, en sus palabras: «prefiero que se calcule sin descuento de una vez». Al descuento le quedan unos 36
días y un fee cotizado hoy tiene que sostenerse después. Sólo cambia la herramienta `adobe`:

| `priceId` | Importe mensual (tres licencias) | Una licencia | Estado | Cuándo se usa |
| --- | --- | --- | --- | --- |
| `current` | CLP 325.405,5 | CLP 108.468,5 | Estimado, hasta que exista una factura a precio completo | Por defecto, en toda cotización nueva |
| `invoiced-with-discount` | CLP 162.605 | CLP 54.202 | Confirmado por la factura | Sólo por elección explícita, para un trabajo que termina antes que el descuento; lo decide el operador |

- `current` es el precio de lista de la factura 3582641940 (CLP 91.150 por licencia más IVA).
- `renewal-scenario` desaparece: es el `current` de ahora. Una demanda que todavía lo nombre queda `needs_input` con
  `RESOURCE_PRICE_SELECTION_REQUIRED`; se cambia a `current`.
- Los dos precios conservan el plazo de 12 meses, la renovación del 2026-11-16 y esa misma fecha de revisión. Adobe
  Express no cambia (CLP 16.240, sin descuento).
- Medido el 2026-10-11 con `designer-on-demand.demand.json` y `--current`: costo 1.822.704 y neto 2.870.000 (el
  artefacto congelado con la v7 da 1.768.438 y 2.790.000); eligiendo `invoiced-with-discount` vuelven las cifras del
  artefacto. La lectura de compromisos de esa cotización nueva deja un mes de una licencia, CLP 108.468, atada hasta
  el 2026-11-16.
- La siguiente policy sería v11.

## Valores de política vigentes al 2026-10-11

Resumen para leer sin abrir el JSON. La fuente es el catálogo que nombra el puntero y su `audit`; estos valores
cambian sólo con una versión nueva. Los factores de país están en la tabla de
[sucesor v5](#sucesor-v5).

**Forma del trabajo** (catálogo v9, 2026-10-11; diseño elegido por el CEO, 10 % mantenido por el agente): On-Going,
razón de precio 1; On-Demand, razón 1,10 sobre el precio de toda la fila. No mueve el costo ni ningún piso. Un
pedido que no declara la forma se cotiza como On-Going.

**Puesta en marcha** (catálogo v9, 2026-10-11; propuesta por el agente y aceptada por el CEO; estimada): onboarding
de 200 USD una vez por persona, por defecto en staffing; reclutamiento de 500 USD una vez por persona, sólo si se
elige.

**Margen.** Hay tres ofertas con su política, todas decididas por el CEO, y cada una vive en los 32 registros de su
oferta. El piso de 45 % es la norma para los servicios gestionados: la política `creative-managed-service` (práctica
creativa) tiene margen objetivo 0,45 y mínimo 0,45 (2026-10-10), y desde el catálogo v8 la política
`seo-aeo-managed-service` (práctica SEO/AEO) tiene objetivo 0,55 y mínimo 0,45 (2026-10-11). El piso de 25 % es el de
una persona vendida por dedicación (staff augmentation): desde el catálogo v7 la política `talent-assurance-staffing`
tiene mínimo 0,25 y un objetivo de 0,30, 0,35 o 0,40 según el tier del perfil (2026-10-11; piso y objetivos decididos
por el CEO). Donde se puede ganar más se sube el objetivo de la oferta o del perfil, nunca se baja el piso. Una
cotización de staffing con fecha anterior al 2026-10-11 o hecha sobre un catálogo anterior conserva el recargo
histórico sin piso, y ahí que no se marque ninguna
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
| CLP→USD | 0,001 | 2026-10-11 | Inversa del USD→CLP del CEO; se mueven juntos |
| USD→EUR | No existe | — | Por eso no se puede emitir en EUR |

Pendientes abiertos sobre estos valores, con su responsable, en el
[ledger](../../../data/pricing/v3-operating/operational-gaps.json): `QUOTE_FX_REVIEW`, `COMMERCIAL_ROUNDING_SCOPE`,
`COUNTRY_FACTORS_UNVALIDATED`, `UNIT_PRICE_REVIEW` y `COMMERCIAL_POLICY` (las excepciones bajo un piso, caso por
caso; los objetivos de staffing y de SEO/AEO ya están confirmados). Desde la tarde del 2026-10-11 también
`ENGAGEMENT_FORM` (si los pedidos nuevos deben declarar la forma, si hacen falta más formas y la revisión del 10 %),
`STARTUP_PROVISIONS_NOT_MEASURED`, `ADOBE_DISCOUNT_ENDS`, `SUPPLIER_CONTRACT_TERMS` y `THIRD_PARTY_AND_CONTINGENCY`
(costos de terceros y reserva de contingencia: diseñados, no construidos).
