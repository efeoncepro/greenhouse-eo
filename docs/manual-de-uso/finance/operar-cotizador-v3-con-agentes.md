# Cotizador V3: flujo completo para Codex y Claude

TASK-2022, 2026-10-09. Prototipo local ejecutable. Entrada:
[data y casos](../../../data/pricing/v3-operating/README.md),
[ADR](../../architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md).
[Referencia funcional de todo lo implementado](../../documentation/finance/cotizador-v3-superficie-implementada.md):
contratos, fórmulas, periodos, selección, costos, evidencia, mantenimiento y límites.

El operador puede pedir «cotiza un diseñador senior al 50%, talento Colombia, mercado Chile».
El agente consulta perfiles y recursos, interpreta las tareas, completa una demanda explícita y usa la CLI.
El dominio calcula; el agente explica el resultado desde el artefacto. Si falta un dato, devuelve su campo y motivo.
Una simulación calculada sigue pendiente de revisión comercial.

## Archivos y comandos

Desde la raíz del repo; variables de esta sesión, sin cambiar el catálogo predeterminado:

```bash
pricing_catalog=data/pricing/v3-operating/catalog.review-v2.json
pricing_policy=data/pricing/v3-operating/resources.review-v2.json
pricing_credits=data/pricing/v3-resources/ai-credits.review-v1.json

pnpm --silent pricing:v3 resources inspect --catalog "$pricing_catalog" \
  --policy "$pricing_policy" --credits "$pricing_credits" --date 2026-10-09 --query diseñador

pnpm --silent pricing:v3 compose scaffold --catalog "$pricing_catalog" \
  --policy "$pricing_policy" --input data/pricing/v3-operating/writer.brief.json

pnpm --silent pricing:v3 resources portfolio --catalog "$pricing_catalog" \
  --policy "$pricing_policy" --date 2026-10-09 \
  --input data/pricing/v3-operating/portfolio.example.json

pnpm --silent pricing:v3 compose plan --catalog "$pricing_catalog" \
  --policy "$pricing_policy" --credits "$pricing_credits" \
  --input data/pricing/v3-operating/designer.plan.json --out /tmp/demanda-v3-nueva.json

pnpm --silent pricing:v3 compose quote --catalog "$pricing_catalog" \
  --policy "$pricing_policy" --credits "$pricing_credits" \
  --input /tmp/demanda-v3-nueva.json --out /tmp/cotizacion-v3-nueva.json

pnpm --silent pricing:v3 explain --input /tmp/cotizacion-v3-nueva.json
pnpm --silent pricing:v3 replay --input /tmp/cotizacion-v3-nueva.json
pnpm --silent pricing:v3 compose assess --input /tmp/cotizacion-v3-nueva.json
pnpm --silent pricing:v3 compose preview --input /tmp/cotizacion-v3-nueva.json \
  --format markdown --out /tmp/preview-v3-nuevo.md
```

Las rutas `--out` deben ser nuevas; nunca sobrescriben un padre o artefacto. JSON en stdout es interfaz para agentes.
Exit 0: operación técnica verificada. Exit 2: falta información. Exit 3: preparado/calculado en revisión;
**no es un error de cálculo ni una aprobación comercial**. Replay de una composición en revisión devuelve 3.
Exit 1: rechazo (entrada inválida, conflicto, overwrite o export comercial bloqueado). stdout queda vacío y stderr
trae un único JSON: `{ "error": { "code", "message", "option"?, "issues"? }, "binding": false }`. `code` nombra la
causa y sale de un registro cerrado ([`errors.ts`](../../../src/lib/finance/pricing-v3/errors.ts)); `message` es un
texto fijo que no describe el caso; `option` nombra la opción a corregir, sin su valor; `issues` lista hasta 20
ubicaciones `{ "path", "rule" }` dentro del documento rechazado. El reporte nunca contiene un valor, una ruta de
archivo ni el mensaje de un parser: decidir por `code`, no por el texto. Tabla en
[Qué hacer con cada error](#qué-hacer-con-cada-error).
No concatenar una secuencia con `&&` esperando exit 0 de una simulación: interpretar explícitamente estos estados.

### Elegir el comando y su input

| Comando                                                | Input/formato                                                      | Resultado y estado                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `catalog search` / `catalog show` / `catalog validate` | Catálogo monetario, consulta/kind y fecha opcionales               | Registros con fuentes o digest validado; no vigencia comercial aprobada                                      |
| `prepare` / `quote`                                    | Brief y catálogo                                                   | Selección / quote del carril de kits; no recibe demanda compuesta                                            |
| `validate` / `calculate`                               | Request + snapshot resuelto                                        | Validación / artefacto del núcleo; no lee Excel ni descubre tools                                            |
| `resources inspect`                                    | Catálogo + policy + fecha; créditos opcionales                     | Perfiles, tools, planes, fee separado, necesidades y hashes; precio vencido deja `needs_input` en su entrada |
| `compose scaffold`                                     | Brief + policy + catálogo                                          | Demanda editable con slots y preguntas, siempre exit 2; completar planes/asignaciones/alcance                |
| `resources portfolio`                                  | Portfolio + policy; fecha/catálogo para costos                     | Cuotas reconciliadas, interno/sin asignar y residual; exit 3 preparado o 2 pendiente                         |
| `compose plan`                                         | Plan con demanda y portfolio opcional + las tres fuentes           | Demanda resuelta y cálculo de prueba; `--out` guarda la demanda, **no** el artefacto                         |
| `compose prepare` / `compose quote`                    | Demanda + catálogo/policy/créditos                                 | Resumen derivado en stdout; `quote` añade `replayDigest`. Resultado completo sólo en el artefacto de `--out` |
| `resources budget`                                     | Request de créditos; `--catalog` es catálogo de packs              | Presupuesto independiente; no es input de quote/replay de cotizaciones                                       |
| `explain` / `replay`                                   | Artefacto snapshot, catálogo o composición                         | Detalle completo / verificación con inputs congelados, sin sucesor; replay de composición devuelve resumen   |
| `compare`                                              | Dos artefactos compatibles de snapshot o catálogo                  | Diferencias internas; el CLI actual no compara artefactos de composición directamente                        |
| `compose assess`                                       | Artefacto compuesto                                                | Gaps, margen propuesto y piso de la política por línea; siempre revisión, no aprueba excepciones; JSON       |
| `compose preview`                                      | Artefacto compuesto calculado                                      | Allowlist JSON/Markdown para revisión; fee agregado si servicio, importes en escala de moneda, sin emisión   |
| `catalog preview` / `catalog apply`                    | Change-set monetario; impacto de briefs opcional                   | Preview / sucesor nuevo; apply exige digest confirmado y `--out`                                             |
| `resources preview` / `resources apply`                | Replacement completo policy/créditos; impacto de demandas opcional | Preview / sucesor nuevo; mismo contexto/hash/impacto, sin selección automática                               |
| `export`                                               | Artefacto completo dentro de policy                                | Gate propio de borrador: composiciones review-only actuales siguen bloqueadas                                |

Los formatos no son intercambiables. `compose prepare` y `compose quote` imprimen el mismo resumen derivado
([Leer el resumen](#leer-el-resumen)); el resultado completo existe **sólo** en el artefacto que escribe `--out`.
Un `compose quote` sin `--out` no deja el detalle en ninguna parte: cotizar siempre con `--out` y leer el detalle
con `explain` sobre ese archivo (salida grande; pedirla sólo cuando haga falta un componente). `replay` de una
composición responde `{ verified, calculationId, summary }`: verifica el archivo y devuelve su resumen, no el
resultado entero. `compose assess` añade un gap `MARGIN_BELOW_POLICY_FLOOR` por cada línea que el kernel marcó bajo
el piso de su política y las lista en `margin.policyFloor.linesBelowFloor`; sus 40 %/35 % genéricos no cambian.
`compose preview` imprime los importes derivados en la escala de la moneda (CLP sin decimales). Los carriles
`prepare`/`quote` de catálogo y `calculate` del núcleo conservan su salida. Opciones ajenas al subcomando se rechazan
con `INVALID_ARGUMENT` y el nombre de la opción; no se interpretan como ejecutadas. Para actualizar el catálogo
monetario, obtener `digest` con `catalog validate`; para policy/créditos, usar `policyDigest`/`creditCatalogDigest`
de inspect con las rutas explícitas.

### Qué hacer con cada error

Códigos del adaptador (argumentos, archivos y formatos). La lista completa y los códigos de dominio están en el
[registro](../../../src/lib/finance/pricing-v3/errors.ts); si un código no aparece aquí, leerlo allí.

| `code`                                   | Qué pasó                                                               | Qué corregir                                                                                      |
| ---------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `UNKNOWN_COMMAND`                        | El comando no existe                                                   | Revisar con `pnpm --silent pricing:v3 help`                                                       |
| `UNKNOWN_OPTION`                         | La opción en `option` no existe (ej. `--inptu`)                        | Corregir el nombre de la opción                                                                   |
| `INVALID_ARGUMENT`                       | El subcomando no acepta la opción en `option`, o su valor no es válido | Quitar esa opción o corregir su valor; sin `option`, revisar comando/subcomando                   |
| `MISSING_ARGUMENT`                       | Falta la opción en `option`, o llegó sin valor                         | Agregarla con su valor                                                                            |
| `INVALID_FORMAT`                         | `--format` no admitido (`json` o `markdown`; `assess` sólo `json`)     | Usar un formato admitido                                                                          |
| `INPUT_NOT_FOUND`                        | El archivo de la opción en `option` no existe o no se puede leer       | Corregir la ruta de esa opción                                                                    |
| `INPUT_NOT_JSON`                         | El archivo de la opción en `option` no es JSON                         | Entregar el JSON correcto; un Markdown o un preview no son input                                  |
| `SCHEMA_INVALID`                         | Un documento no cumple su schema; `issues` trae `path` y `rule`        | Corregir cada `path`. No indica qué archivo: revisar el que contiene esos campos                  |
| `OUTPUT_EXISTS`                          | La ruta de `--out` ya existe                                           | Elegir un nombre nuevo; nunca borrar un artefacto congelado para reutilizar su ruta               |
| `OUTPUT_NOT_WRITABLE`                    | La carpeta de `--out` no existe o no permite escribir                  | Crear la carpeta o elegir otra ruta                                                               |
| `PLAN_REQUIRES_VALID_ALLOCATION`         | `compose plan --out` sin demanda resuelta                              | Correr sin `--out`, resolver lo que reporta el plan y repetir                                     |
| `WORKLOAD_REQUIRES_VALID_DIMENSIONING`   | `compose workload --out` sin dimensionamiento listo                    | Correr sin `--out`, resolver lo pendiente y repetir                                               |
| `EXPORT_REQUIRES_COMPLETE_WITHIN_POLICY` | `export` sobre un cálculo en revisión o una composición                | No hay arreglo de argumentos: export bloqueado; en composición, revisar con `compose preview`     |
| `ADAPTER_FAILURE`                        | Falla que nadie clasificó: es un hueco de la herramienta               | No es un error del pedido. No reintentar a ciegas: reportar el comando exacto a quien la mantiene |

Los conflictos de dominio llegan con su propio código, sin `option`: `REPLAY_MISMATCH` (el artefacto fue modificado o
su versión no está soportada: no editarlo, volver a cotizar), `CATALOG_BASE_CONFLICT` / `RESOURCE_BASE_CONFLICT` (el
`baseDigest` del change-set no corresponde a la base entregada), `CATALOG_PREVIEW_CONFLICT` /
`RESOURCE_PREVIEW_CONFLICT` (el `--confirm` no corresponde al preview vigente: repetir el preview). Un exit 2 o 3 no
es un error: el motivo está en el JSON de stdout, no en stderr.

## Selección y asignación

1. Resolver la variante exacta del perfil: consultores HubSpot y otros niveles mantienen costos distintos.
2. Confirmar tareas y alcance: Copywriter con tareaSEO requiere SEMrush; no cambia al salario de SEO Specialist.
3. Base común Notion/Microsoft 365; añadir Adobe, plataformas e IA sólo cuando el trabajo lo requiere.
4. Elegir `priceId`, frecuencia y plan explícitos. Público, operador, factura e histórico conservan fuente separada.
5. Identificar usuarios con IDs estables sin PII. `planned-*` son slots, nunca personas contratadas ni seats existentes.
6. Declarar cantidad, capacidad contractual, driver y parte atribuida por mes. No hay reparto automático por FTE.
7. Presupuestar créditos por proveedor/mes; la CLI suma consumo de roles y elige paquetes discretos una sola vez.
8. Examinar diagnóstico, desglose y evaluación económica antes de compartir siquiera un precio de prueba.

Las 32 reglas de perfil son **reglas iniciales para revisión**, no recetas universales completas ni autorización
de compras. Hay tareas adicionales para WordPress, UX, video, stock, datos, comunidad y automatización.
Añadir sólo las necesidades del alcance: un desarrollador no exige automáticamente hosting o plugins WordPress.
Un servicio `managed_service` conserva roles como costo interno y proyecta un fee por periodo más implementación,
si la hay. Su SOW, entregables, aceptación, límites y responsabilidades necesitan validación propia.

## Reparto por capacidad declarada

`pricing-v3-resource-portfolio/1` declara recurso/plan/mes, cantidad, unidad, total, unidades por cuenta,
internas y sin asignar. Las tres partes deben reconciliar exactamente. Cuota = unidades de cuenta / total;
Decimal mantiene el residual explícito. Con fecha/catálogo, se presenta también costo mensual en moneda original.
No convertir EUR a USD sin la referenciaFX explícita en demanda.

Ejemplo **hipotético**: Adobe 180, capacidad 160, cliente 40, interno 80, sin asignar 40 →45/90/45 USD.
El 25% deriva de las unidades del ejemplo; no se guarda como default de cartera. Vercel/GCP se reparten con el
mismo contrato por capacidad de plataforma declarada. No inventar 10 clientes ni aplicar el rango de Vercel como
importe exacto: seleccionar mínimo 60 o máximo 100 explícitamente hasta contar con factura/consumo concreto.

Seats nominativos por usuario (`basis=seat`) se declaran en la demanda con cantidad entera, usuarios y driver;
el portfolio de pools no los convierte en una suscripción compartida. Un paquete nominativo, como Adobe, puede
repartirse por capacidad manteniendo el límite de usuarios (3 CC por paquete). Reparto de costo nunca permite
compartir cuentas. La reconciliación entre todas las cuentas/usuarios reales requiere su inventario declarado;
este flujo no reserva ni fiscaliza asignaciones live. Las funciones internas de una cuenta distribuyen el costo
por usuarios únicos; los créditos por consumo. No atribuirles una ponderación por horas que no fue implementada.

## Herramientas del cliente y créditos

`clientProvidedTools` declara herramienta/mes/líneas, motivo y evidencia confirmada que cubra la ventana de uso.
El costo del recurso Efeonce se omite sólo para esas líneas; el desglose registra `client-provided`.
BaseNotion/M365 y herramientas de créditos no se sustituyen por esta excepción. Sin evidencia, con vigencia
insuficiente o cobertura de líneas desconocidas, el cálculo completo queda bloqueado.

Higgsfield 139 USD/3000 créditos y Magnific 40 EUR/45000 créditos son bases reportadas. Se atribuye la parte de créditos
base presupuestada y se suma el costo completo del pack extra requerido. Se muestran caja extra, créditos
sobrantes y vencimiento; no confundir costo atribuido con dinero nuevo por pagar. Remanentes no se descuentan
de otra cotización sin un presupuesto/inventario explícito. Créditos de herramientas distintas no son fungibles.
[Planner y vigencias](presupuestar-creditos-ia-v3.md).

## Actualizar valores sin alterar cotizaciones anteriores

Salarios, cargos, factores país/mercado y FX: [mantenimiento del catálogo monetario](catalogo-v3-seleccion-y-actualizacion.md).
Planes/reglas o packsIA: `resources preview` / `resources apply`. Change-set completo:

```json
{
  "schemaVersion": "pricing-v3-resource-change/1",
  "kind": "policy",
  "baseDigest": "SHA256_DE_LA_POLICY_ACTUAL",
  "reason": "Factura, responsable, fecha y motivo de la revisión",
  "replacement": { "schemaVersion": "pricing-v3-resource-policy/1", "version": "VERSION_NUEVA" }
}
```

`replacement` lleva **todo** el documento válido, no sólo esos dos campos ilustrativos; `kind=credits` usa el
schema de catálogo de créditos. Obtener `policyDigest` y, con `--credits`, `creditCatalogDigest` desde `resources inspect`;
una base incorrecta bloquea. Conservar el change-set y el preview como evidencia de autor/motivo/impacto.

```bash
pnpm --silent pricing:v3 resources preview --catalog "$pricing_catalog" \
  --policy "$pricing_policy" --credits "$pricing_credits" \
  --input cambio-recursos.json --impact demandas-impacto.json --out preview-recursos-nuevo.json

pnpm --silent pricing:v3 resources apply --catalog "$pricing_catalog" \
  --policy "$pricing_policy" --credits "$pricing_credits" \
  --input cambio-recursos.json --impact demandas-impacto.json \
  --confirm DIGEST_DEL_PREVIEW --out policy-sucessora-nueva.json
```

`--impact` es array de demandas estructuradas. Apply revalida schema/referencias/base/impacto/digest y versión
nueva; no activa el sucesor automáticamente. Un monto confirmado no hereda una factura anterior al cambiar;
requiere nueva referencia. Cambios de costos/packs de créditos requieren evidencia nueva. La cadencia de revisión
y owners sigue el [contrato](../../documentation/finance/cotizador-v3-mantenimiento-catalogo.md).
No es monitor automático ni contrato de reajuste al cliente. Seleccionar sucesor explícito para una nueva quote;
replay de la vieja usa sus inputs congelados. Renovación Adobe sigue condicional hasta conocer la fecha real.

## Cotizar un servicio gestionado por volumen

Para un servicio que se vende por capacidad y se dimensiona por volumen (social care, soporte, producción recurrente),
usar las versiones `catalog.review-v3.json` y `resources.review-v5.json` y la oferta `creative-managed-service`.

```bash
pricing_catalog=data/pricing/v3-operating/catalog.review-v3.json
pricing_policy=data/pricing/v3-operating/resources.review-v5.json
pricing_credits=data/pricing/v3-resources/ai-credits.review-v1.json

# 1. Volumen → dedicación. Sin --brief sólo calcula; con --brief escribe un brief nuevo.
pnpm --silent pricing:v3 compose workload --input data/pricing/v3-operating/managed-care.workload.json \
  --brief data/pricing/v3-operating/managed-care.brief.json --out /ruta/nueva/brief-dimensionado.json

# 2. Completar la demanda sobre el brief dimensionado y cotizar.
pnpm --silent pricing:v3 compose quote --catalog "$pricing_catalog" --policy "$pricing_policy" \
  --credits "$pricing_credits" --input data/pricing/v3-operating/managed-care.demand.json --out /ruta/nueva/artefacto.json
```

Qué declarar en el workload (`pricing-v3-workload/1`):

- `capacity`: horas productivas y horas contratadas de un mes a tiempo completo, con su fuente.
- `drivers`: unidades al mes y minutos por unidad. La unidad es un nombre libre.
- `fixedWork`: horas fijas al mes que no dependen del volumen.
- `lines`: qué parte de cada driver y de cada bloque fijo toma cada línea del brief, y las horas de presencia que
  debe cubrir aunque no haya volumen. Las cuotas de cada driver y de cada bloque deben sumar 1.
- `rounding.fteStep`: paso al que se redondea la dedicación, siempre hacia arriba.

`compose workload` devuelve exit 0 con el cálculo listo y exit 2 si falta algo. Los casos que pide resolver a una
persona: horas sin dueño, una línea que no existe en el brief, y una línea que necesita más de lo que su dotación
declarada puede dar (`LINE_OVER_CAPACITY`: se sube la dotación o se reparte el trabajo, no se redondea).

En la demanda:

- Las líneas usan `kitId: "managed-service-core"`. Las provisiones (`assurance`, `operations`) son opcionales y se
  eligen en `choices`; basta declararlas en una línea para cargarlas una vez.
- Si la receta del perfil trae una tarea que este servicio no hace, se excluye con motivo:
  `"excludedProfileTasks": [{ "task": "social-publishing", "reason": "…" }]`. No se edita la receta.
- La bandeja de social care (`social-inbox`) es Sprout Social Advanced con asientos nominativos: un asiento por
  persona que trabaja la bandeja, con `priceId: "sprout-advanced-annual"` (USD 399 por asiento al mes, precio
  público con facturación anual). Alternativa más barata: `sprout-professional-annual` (USD 299; perfiles ilimitados,
  sin API, integraciones ni informes de atención). El plan Standard no sirve con más de cinco perfiles. Un asiento se paga completo aunque la persona dedique una fracción de su tiempo.
- El consumo de agentes se declara en `serviceToolIds: ["agent-runtime-usage"]` con una asignación cuya cantidad es
  el número de bloques de 1.000 ítems procesados al mes.

El precio sale al piso de la práctica (margen objetivo 45 %, mínimo 45 %). Sigue siendo una simulación en revisión:
las provisiones y el consumo de agentes son estimaciones declaradas, y los costos de las personas son históricos.

## Leer el resumen

`compose prepare` y `compose quote` imprimen el resumen `pricing-v3-composition-summary/1`; `replay` de una
composición lo devuelve dentro de `summary`. Es una lectura derivada del resultado congelado: cuenta, agrupa y
quita repeticiones, no decide nada. Con las tres variables de la sección anterior (`catalog.review-v3`,
`resources.review-v5`, `ai-credits.review-v1`):

```bash
pnpm --silent pricing:v3 compose quote --catalog "$pricing_catalog" --policy "$pricing_policy" \
  --credits "$pricing_credits" --input data/pricing/v3-operating/managed-care.demand.json \
  --out /tmp/servicio-gestionado.artifact.json > /tmp/servicio-gestionado.summary.json

pnpm --silent pricing:v3 replay --input /tmp/servicio-gestionado.artifact.json
pnpm --silent pricing:v3 explain --input /tmp/servicio-gestionado.artifact.json
```

Los tres devuelven exit 3 en este ejemplo. El resumen pesa unos 15 KB; `explain` del mismo artefacto, unos 234 KB.

| Parte                                                                   | Qué dice                                                                                                                                                                               | Qué hacer                                                                                                                      |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `calculationId`, `replayDigest`                                         | Identidad del cálculo. `replayDigest` sólo aparece en `quote` y en `replay`: es lo que una reproducción debe igualar                                                                   | Citarlos al registrar o compartir el caso                                                                                      |
| `calculationStatus`, `diagnostics`                                      | `diagnostics` son los **bloqueos**, completos. Si no está vacío, el estado es `needs_input`, `totals` es `null` y el exit es 2                                                         | Resolver cada bloqueo en la demanda (su `path` dice dónde) y volver a correr. No presentar precio                              |
| `reviewStatus`, `quoteReviewStatus`                                     | Revisión de la composición (siempre `requires_review`) y revisión que devuelve el kernel                                                                                               | Tratar el número como simulación; ninguno de los dos es una aprobación                                                         |
| `totals`, `marginRateRoundedDown`                                       | Costo, precio sin descuento, descuento, neto, margen, impuestos y moneda del plazo. `marginRateRoundedDown` es el margen a 6 decimales, redondeado hacia abajo                         | Leer el margen de aquí, no recalcularlo. `tax` y `grandTotal` en `null` significan impuestos pendientes, no cero               |
| `periods[]`                                                             | Estado y totales de cada periodo                                                                                                                                                       | Revisar que ningún periodo quede sin calcular y si el neto varía entre meses                                                   |
| `assumptions`                                                           | Supuestos con que se resolvió el pedido (ej. costo histórico asumido para un país)                                                                                                     | Declararlos al explicar el precio                                                                                              |
| `reviewSignals[]`                                                       | Todos los diagnósticos de los periodos, una entrada por código y severidad, con `count`, `periodIds`, `lineIds` y `paths`. No bloquean los totales                                     | Explicar cada código presente (`ESTIMATED_SOURCE`, `HISTORICAL_ONLY`, `MARGIN_BELOW_FLOOR`…); `paths` dice qué dato lo origina |
| `marginFloor.lines[]`                                                   | Líneas que el kernel marcó bajo el piso de su política: `minimumMargin`, `net`, `marginAmount`, `marginRateRoundedDown` y `marginAmountShortOfFloor` (margen que falta al neto actual) | Ver «Redondeo o incumplimiento» abajo                                                                                          |
| `toolSelections`                                                        | `counts` y las herramientas incluidas, las que aporta el cliente y las excluidas con motivo                                                                                            | Confirmar que cada herramienta incluida corresponde al alcance y que cada exclusión tiene un motivo defendible                 |
| `attributions`                                                          | Por herramienta y precio: estado de la fuente, cantidad, parte del servicio y costo mensual completo, atribuido y sin asignar                                                          | Revisar fuentes no confirmadas y el costo que queda sin asignar                                                                |
| `creditBudgets`, `resourceIncrementalCash`, `cashLedger`, `cashMeaning` | Presupuesto de créditos y caja. Costo atribuido no es dinero nuevo por pagar; `cashMeaning` lo explica                                                                                 | No presentar `cashCommitment` como factura ni como compra                                                                      |
| `fullDetail`                                                            | Recuerda que el detalle vive en el artefacto, bajo `semantic.result`                                                                                                                   | Ir al artefacto con `explain` para una fila de selección, una asignación o los componentes de costo de una línea               |

Las filas que sólo difieren por periodo se agrupan en una con `periodIds`.

**Redondeo o incumplimiento.** El kernel compara cada línea con el piso de su política y la marca; nunca sube el
precio. En `creative-managed-service` el objetivo y el mínimo son ambos 0,45, y el costo y el precio se redondean a
pesos enteros por separado: una línea cotizada exactamente al piso puede quedar bajo él por menos de un peso. En el
ejemplo `managed-care` las seis líneas salen marcadas con `marginAmountShortOfFloor` entre 0,1 y 0,5.

- Faltan **fracciones de peso** en una cotización sin descuento: es el redondeo del precio al piso. Decirlo así; no es
  una excepción ni requiere decisión.
- Faltan **miles de pesos**: el precio está de verdad bajo el piso. Requiere una decisión del operador antes de
  presentarlo ([Registrar el precio acordado](#registrar-el-precio-acordado)).

## Registrar el precio acordado

El precio que el operador acuerda de verdad tiene que pasar por el motor. Si se anota sólo en la propuesta, el
artefacto congelado sigue mostrando el precio al piso y nadie comprueba el piso contra el precio real.

1. Cotizar sin descuento y leer `totals.undiscountedPrice` (precio al piso).
2. Calcular la tasa: `1 − neto acordado ÷ undiscountedPrice`, con siete decimales.
3. Copiar la demanda a un archivo nuevo y declarar el descuento dentro de `brief`:

   ```json
   "adjustments": [
     {
       "adjustmentId": "sky-precio-acordado",
       "kind": "discount",
       "rate": "0.0793605",
       "lineIds": ["titular", "lider", "agentes"],
       "reason": "Precio base acordado CLP 4.990.000 más IVA al mes, todo incluido. Excepción al piso de 45 % aprobada por el CEO el 2026-10-10 por ser cliente vigente."
     }
   ]
   ```

   Se admite un solo ajuste; `rate` es una cadena; `lineIds` son los IDs de las líneas del brief que reciben el
   descuento; `reason` es obligatorio y debe decir qué se acordó, quién lo aprobó y cuándo. Sin `reason`, o con dos
   ajustes, la CLI rechaza con `SCHEMA_INVALID`.

4. Volver a correr y comprobar que `totals.net` es exactamente el monto acordado. Si difiere por pesos, faltan
   decimales en la tasa: ajustarla y repetir (en el caso real, `0.07936` da 4.990.002 y `0.0793605` da 4.990.000).
5. Congelar con `compose quote --out` en una ruta nueva, guardar el resumen y correr `compose assess` sobre el
   artefacto. Conservar los cuatro archivos junto al expediente, con una nota de la decisión.
6. Leer `marginRateRoundedDown` y `marginFloor.lines[]`: ese es el margen real y lo que falta para el piso.

Caso real, SKY social care 2027: acordado CLP 4.990.000 al mes sobre un precio al piso de 5.420.145 → tasa
0,0793605 → neto 4.990.000, margen 40,26 %, tres líneas marcadas y CLP 236.579 al mes de margen bajo el piso en
total. Archivos en `docs/commercial/prospects/sky-social-care-2027/pricing/`: `acordado.demand.json`,
`acordado.artifact.json`, `acordado.summary.json`, `acordado.assessment.json` y la
[nota de la excepción](../../commercial/prospects/sky-social-care-2027/pricing/EXCEPCION-PISO-2026-10-10.md).
Con las mismas tres variables (los tres comandos devuelven exit 3):

```bash
pnpm --silent pricing:v3 compose prepare --catalog "$pricing_catalog" --policy "$pricing_policy" \
  --credits "$pricing_credits" \
  --input docs/commercial/prospects/sky-social-care-2027/pricing/acordado.demand.json

pnpm --silent pricing:v3 replay \
  --input docs/commercial/prospects/sky-social-care-2027/pricing/acordado.artifact.json

pnpm --silent pricing:v3 compose assess \
  --input docs/commercial/prospects/sky-social-care-2027/pricing/acordado.artifact.json
```

**Quién decide.** Márgenes, pisos, precios y excepciones al piso son decisión del operador (CEO y dueño). El agente
le lleva el margen real que entrega el motor y una recomendación; no aprueba, no «redondea» una excepción ni la da
por implícita, y `compose assess` tampoco la aprueba. Aprobada la excepción, se registra con su motivo en `reason` y
en una nota junto al artefacto. Confirmado el 2026-10-10: el piso de 45 % sigue siendo la norma para servicios
gestionados de la práctica creativa; SKY social care es una excepción por ser cliente vigente; la política se
mantiene en 45/45. No usar el precio de SKY como referencia de margen para otro cliente.

Sin decidir, registrado en el [ledger de pendientes](../../../data/pricing/v3-operating/operational-gaps.json):
una regla que redondee el precio hacia arriba (`FLOOR_PRICE_ROUNDS_UNDER_FLOOR`), un ajuste que reciba el neto
acordado directamente (`AGREED_PRICE_OUTSIDE_ENGINE`) y si el piso de 45 % rige servicios gestionados fuera de la
práctica creativa (`MARGIN_FLOOR_SCOPE`). No resolverlos por cuenta propia en una cotización.

## Pendientes que permanecen visibles

`compose assess` separa cálculo y evidencia: salario/localización, provisionesAssurance/operación/onboarding,
planes actuales, acceso/usuarios, capacidad real, margen comercial, entidad/impuestos y alcance del servicio.
Márgenes 40%/35% son propuestas genéricas, no aprobaciones. Creative Practice mantiene 45% bruto aprobado; `assess` no sustituye ese piso ni aprueba una excepción. Consultar la práctica dueña antes de presentar precio. El preview está redactado, local y marcado como simulación;
no es oferta emitida. La promoción futura tiene [mapa de integración](../../documentation/finance/cotizador-v3-promocion-canonica.md),
con la autoridad y lifecycle del cotizador vigente. Este trabajo no despliega ni escribe API/DB/CRM.

Para registrar una licencia nueva, pedir plan, moneda, frecuencia, importe, seats/capacidad, cobertura,
acceso nominativo/compartido y evidencia/fecha. Primero registrar selección y costo en policy/catalog,
luego la asignación en demanda/portfolio. No inferir usuarios habilitados desde una factura ni sustituir un
contrato desconocido por una referencia pública. Las facturas privadas y enlaces firmados no se copian al repo:
registrar referencia, hash y hechos financieros mínimos. [Ledger de pendientes por owner](../../../data/pricing/v3-operating/operational-gaps.json).
