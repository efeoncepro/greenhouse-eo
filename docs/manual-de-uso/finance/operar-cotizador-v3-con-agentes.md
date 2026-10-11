# Cotizador V3: flujo completo para Codex y Claude

TASK-2022, 2026-10-09. Prototipo local ejecutable. Entrada:
[data y casos](../../../data/pricing/v3-operating/README.md),
[ADR](../../architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md).
[Referencia funcional de todo lo implementado](../../documentation/finance/cotizador-v3-superficie-implementada.md):
contratos, fórmulas, periodos, selección, costos, evidencia, mantenimiento y límites.
Desde el 2026-10-10: motor 1.1 (precio acordado y redondeo comercial) y catálogo v4
([decisión](../../architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md)).
Desde el 2026-10-11: catálogo v5 con factores por país del cliente y de cada persona, y contrato 1.2.0, en el que el
piso de margen acompaña al factor de mercado (delta 2026-10-11 de la misma decisión;
[cómo cotizar por país](#cotizar-según-el-país-del-cliente-y-del-equipo)).

El operador puede pedir «cotiza un diseñador senior al 50%, talento Colombia, mercado Chile».
El agente consulta perfiles y recursos, interpreta las tareas, completa una demanda explícita y usa la CLI.
El dominio calcula; el agente explica el resultado desde el artefacto. Si falta un dato, devuelve su campo y motivo.
Una simulación calculada sigue pendiente de revisión comercial.

## Archivos y comandos

### Versiones vigentes

Toda cotización nueva usa este trío, desde la raíz del repo. Son variables de la sesión y las usan los comandos de
este manual; la CLI no elige sola la versión más reciente (sin `--catalog` cae en la baseline histórica
`review-2026-10-09-v1`).

```bash
pricing_catalog=data/pricing/v3-operating/catalog.review-v5.json
pricing_policy=data/pricing/v3-operating/resources.review-v5.json
pricing_credits=data/pricing/v3-resources/ai-credits.review-v1.json

pnpm --silent pricing:v3 catalog validate --catalog "$pricing_catalog"
```

`catalog validate` debe responder `"version": "operating-review-2026-10-11-v5"` con exit 0. El catálogo v5 conserva
lo del v4 (redondeo comercial por moneda, tipo de cambio de cotización y los 32 costos de persona confirmados, que
rigen desde el 2026-10-10) y agrega los factores por país del cliente y de cada persona, con los 32 costos declarados
como el costo de cada perfil en Chile; lo nuevo rige desde el 2026-10-11.

**La fecha de la demanda decide qué valores recibe.** Cada valor del catálogo se toma según `brief.quoteDate`, no
según el archivo que se pasa en `--catalog`. Con este mismo trío, una demanda fechada 2026-10-10 resuelve con los
valores de ese día: todos los factores de país valen 1 y los costos no declaran país, y la CLI no lo trata como
error. El mismo pedido (cliente y equipo en Colombia, en COP) da 34.900.000 fechado el 2026-10-10 y 28.100.000 fechado
el 2026-10-11. Una cotización nueva lleva la fecha del día en `quoteDate`; al copiar un ejemplo anterior se cambia
también esa fecha.

Cuando pasa eso, `compose prepare` y `compose quote` lo dicen: el resumen trae `laterCatalogValues`, con la fecha de
la demanda, la fecha más reciente del catálogo y cuántos valores posteriores no se usaron, por clase. Si aparece en una
cotización nueva, la fecha está mal: corregir `quoteDate` y volver a correr. No aparece cuando la fecha está al día,
ni en `replay`, que reproduce una cotización tal como se congeló.

`catalog.review-v2.json` a `catalog.review-v4.json` y las policies `resources.review-v2` a `-v4` son padres
congelados: las cotizaciones hechas con ellos se siguen reproduciendo igual con `replay`, y en este manual sólo se
nombran para repetir un ejemplo anterior.

### Secuencia de comandos

La secuencia es la misma para cualquier pedido. El ejemplo del diseñador está fechado el 2026-10-09 y usa una
herramienta con precio en EUR, cuya única referencia de cambio es de ese día; por eso se reproduce con las versiones
que regían esa fecha, en variables aparte (`ejemplo_*`). Con el trío vigente ese mismo plan devuelve exit 2
(`RESOURCE_POLICY_NOT_EFFECTIVE`: la policy v5 rige desde el 2026-10-10). Para un pedido nuevo son las mismas órdenes
con `$pricing_catalog` y `$pricing_policy`, y la fecha del día en `quoteDate` y `--date`.

```bash
ejemplo_catalog=data/pricing/v3-operating/catalog.review-v2.json
ejemplo_policy=data/pricing/v3-operating/resources.review-v2.json

pnpm --silent pricing:v3 resources inspect --catalog "$ejemplo_catalog" \
  --policy "$ejemplo_policy" --credits "$pricing_credits" --date 2026-10-09 --query diseñador

pnpm --silent pricing:v3 compose scaffold --catalog "$ejemplo_catalog" \
  --policy "$ejemplo_policy" --input data/pricing/v3-operating/writer.brief.json

pnpm --silent pricing:v3 resources portfolio --catalog "$ejemplo_catalog" \
  --policy "$ejemplo_policy" --date 2026-10-09 \
  --input data/pricing/v3-operating/portfolio.example.json

pnpm --silent pricing:v3 compose plan --catalog "$ejemplo_catalog" \
  --policy "$ejemplo_policy" --credits "$pricing_credits" \
  --input data/pricing/v3-operating/designer.plan.json --out /tmp/demanda-v3-nueva.json

pnpm --silent pricing:v3 compose quote --catalog "$ejemplo_catalog" \
  --policy "$ejemplo_policy" --credits "$pricing_credits" \
  --input /tmp/demanda-v3-nueva.json --out /tmp/cotizacion-v3-nueva.json

pnpm --silent pricing:v3 explain --input /tmp/cotizacion-v3-nueva.json
pnpm --silent pricing:v3 replay --input /tmp/cotizacion-v3-nueva.json
pnpm --silent pricing:v3 compose assess --input /tmp/cotizacion-v3-nueva.json
pnpm --silent pricing:v3 compose preview --input /tmp/cotizacion-v3-nueva.json \
  --format markdown --out /tmp/preview-v3-nuevo.md
```

En este ejemplo `inspect` devuelve exit 0, `scaffold` exit 2 (siempre deja preguntas) y los demás exit 3. El resumen
de `compose quote` trae `engineVersion` `pricing-v3-local/1.0.0` y `priceRounding: null`: es una cotización anterior
al redondeo.

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
`compose preview` imprime los importes derivados en la escala de la moneda (CLP sin decimales) y sólo el neto final:
no detalla redondeo, descuento ni recargo. Los carriles
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

FX de cotización y reglas de redondeo:
[mantenimiento del catálogo monetario](catalogo-v3-seleccion-y-actualizacion.md#cambiar-el-redondeo-o-el-fx-de-cotización).
Factores de país (talento y mercado) y costo de un perfil en un país:
[factores de país y costos específicos](catalogo-v3-seleccion-y-actualizacion.md#cambiar-un-factor-de-país-o-registrar-el-costo-de-un-perfil-en-un-país).
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
usar el trío vigente (`catalog.review-v5.json`, `resources.review-v5.json`, `ai-credits.review-v1.json`) y la oferta
`creative-managed-service`.

```bash
# El trío vigente, el mismo de «Versiones vigentes».
pricing_catalog=data/pricing/v3-operating/catalog.review-v5.json
pricing_policy=data/pricing/v3-operating/resources.review-v5.json
pricing_credits=data/pricing/v3-resources/ai-credits.review-v1.json

# 1. Volumen → dedicación. Sin --brief sólo calcula; con --brief escribe un brief nuevo.
pnpm --silent pricing:v3 compose workload --input data/pricing/v3-operating/managed-care.workload.json \
  --brief data/pricing/v3-operating/managed-care.brief.json --out /tmp/brief-dimensionado.json

# 2. Completar la demanda sobre el brief dimensionado y cotizar: artefacto en --out, resumen en stdout.
pnpm --silent pricing:v3 compose quote --catalog "$pricing_catalog" --policy "$pricing_policy" \
  --credits "$pricing_credits" --input data/pricing/v3-operating/managed-care.demand.json \
  --out /tmp/servicio-gestionado.artifact.json > /tmp/servicio-gestionado.summary.json
```

El paso 1 devuelve exit 0 y el paso 2 exit 3 (calculado, en revisión). Si una ruta de `--out` ya existe la CLI rechaza
con `OUTPUT_EXISTS`: elegir otro nombre.

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

La política pone cada fila al piso (margen objetivo 45 %, mínimo 45 %) y el catálogo la sube al múltiplo de su
moneda: el ejemplo (cliente y equipo en Chile) sale en CLP 9.530.000 al mes, de ellos 21.054 de redondeo, con margen
`0.451214` y ninguna línea bajo el piso. El 45 % es el piso de margen de los servicios gestionados (decisión del CEO, 2026-10-10): un servicio
donde se puede ganar más sube su margen objetivo en su propia política, no el piso.

Sigue siendo una simulación en revisión. Las provisiones y el consumo de agentes son hipótesis declaradas y el plan
de Sprout es precio público. Los 32 costos de persona están confirmados por su autor (el CEO) con los montos del
Excel y, desde el catálogo v5, declarados como el costo de cada perfil en Chile.

`managed-care.demand.json` está fechada el 2026-10-10, un día antes de esa declaración: su resumen trae el supuesto
`UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY` en cada línea y cuenta esos costos en `ESTIMATED_SOURCE`. No es un error ni
pide confirmar los montos otra vez. Una copia fechada 2026-10-11 o después da el mismo precio —cliente y equipo en
Chile: los dos factores de país valen 1— sin ese supuesto. Para un cliente o un equipo de otro país:
[Cotizar según el país del cliente y del equipo](#cotizar-según-el-país-del-cliente-y-del-equipo).

## Leer el resumen

`compose prepare` y `compose quote` imprimen el resumen `pricing-v3-composition-summary/1`; `replay` de una
composición lo devuelve dentro de `summary`. Es una lectura derivada del resultado congelado: cuenta, agrupa y
quita repeticiones, no decide nada. El paso 2 de la sección anterior dejó el resumen en
`/tmp/servicio-gestionado.summary.json` y el artefacto en `/tmp/servicio-gestionado.artifact.json`; sobre ese artefacto:

```bash
pnpm --silent pricing:v3 replay --input /tmp/servicio-gestionado.artifact.json
pnpm --silent pricing:v3 explain --input /tmp/servicio-gestionado.artifact.json
```

Los dos devuelven exit 3 en este ejemplo, igual que el `compose quote` que lo generó. El resumen pesa unos 13 KB;
`explain` del mismo artefacto, unos 237 KB.

| Parte                                                                   | Qué dice                                                                                                                                                                                                                                                                                                                                                                                                                                               | Qué hacer                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `calculationId`, `replayDigest`                                         | Identidad del cálculo. `replayDigest` sólo aparece en `quote` y en `replay`: es lo que una reproducción debe igualar                                                                                                                                                                                                                                                                                                                                   | Citarlos al registrar o compartir el caso                                                                                                                                                                                                                             |
| `calculationStatus`, `diagnostics`                                      | `diagnostics` son los **bloqueos**, completos. Si no está vacío, el estado es `needs_input`, `totals` es `null` y el exit es 2                                                                                                                                                                                                                                                                                                                         | Resolver cada bloqueo en la demanda (su `path` dice dónde) y volver a correr. No presentar precio                                                                                                                                                                     |
| `reviewStatus`, `quoteReviewStatus`                                     | Revisión de la composición (siempre `requires_review`) y revisión que devuelve el kernel                                                                                                                                                                                                                                                                                                                                                               | Tratar el número como simulación; ninguno de los dos es una aprobación                                                                                                                                                                                                |
| `engineVersion` | Motor que calculó: `pricing-v3-local/1.2.0` si el factor de mercado del país del cliente declara que el piso lo acompaña (hoy Colombia y Perú); `pricing-v3-local/1.1.0` si la cotización usa un neto acordado, varios ajustes o una regla de redondeo para su moneda; `pricing-v3-local/1.0.0` en los demás casos. `null` si la demanda quedó bloqueada antes de llegar al motor | No se elige: sale de la demanda y del catálogo. Dice qué lectura de `totals` y del piso aplica |
| `totals`, `marginRateRoundedDown` | Del plazo: `cost`, `undiscountedPrice` (precio calculado; ya incluye el factor de mercado y el redondeo), `discount`, `net`, margen, impuestos y moneda. Con el motor 1.1.0 se agregan `roundingAdjustment` (lo que sumó el redondeo) y `uplift` (recargo de un neto acordado sobre el precio); en una cotización 1.0.0 esas dos claves no existen. Con el motor 1.2.0 se agrega `marketAdjustment`: cuánto movió el precio el factor de mercado, con signo (negativo en un mercado bajo 1); es informativo y no se suma otra vez. `net = undiscountedPrice + uplift − discount`. `marginRateRoundedDown` es **siempre el margen real** del neto final contra el costo, a 6 decimales y redondeado hacia abajo, en cualquier mercado | Leer el margen de aquí, no recalcularlo. Es el que se informa al operador, también cuando ninguna línea sale marcada. `tax` y `grandTotal` en `null` significan impuestos pendientes, no cero |
| `commercialAdjustments`                                                 | Los ajustes tal como los declara el `brief` congelado: neto acordado (`agreed_net`) o descuento por tasa (`discount`), con su `reason`. `[]` si no hay                                                                                                                                                                                                                                                                                                 | Comprobar que el monto y el motivo son los que aprobó el operador ([Registrar el precio acordado](#registrar-el-precio-acordado))                                                                                                                                     |
| `priceRounding`                                                         | Regla de redondeo aplicada a la moneda de salida: `{ currency, multiple, scope, offerId, recordId, revision, sourceStatus }`; `scope` es `general` (regla de la moneda) u `offer` (regla propia de la oferta, que prevalece). `null`: esta cotización no redondea                                                                                                                                                                                      | Con valor, una línea marcada es un incumplimiento real; con `null`, leer «Qué significa una línea marcada» abajo                                                                                                                                                            |
| `marketFactor` | Factor de mercado del país del cliente: `{ country, factor, floorBasis, recordId, revision, sourceStatus }`. Sólo aparece cuando cambia algo: factor distinto de 1 o `floorBasis` declarado. Con cliente en Chile o México (factor 1) la clave no existe. `floorBasis: "base_market"` dice que el piso se lee sobre el precio del mercado base; `null`, sobre el neto final. `sourceStatus` dice si el factor es una decisión (`confirmed`) o un estimado (`estimated`) | Comprobar que el país es el del cliente. Con `floorBasis`, leer «Qué significa una línea marcada» abajo. Si esperabas un factor y la clave no está, revisar `offerMarketCountry` y `quoteDate` ([por país](#cotizar-según-el-país-del-cliente-y-del-equipo)) |
| `periods[]`                                                             | Estado y totales de cada periodo                                                                                                                                                                                                                                                                                                                                                                                                                       | Revisar que ningún periodo quede sin calcular y si el neto varía entre meses                                                                                                                                                                                          |
| `assumptions` | Supuestos con que se resolvió el pedido. `UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY` (el costo no declara país y se asume para el de la línea) sólo aparece en demandas fechadas antes del 2026-10-11; desde esa fecha los costos son el costo en Chile y el país de la persona entra por su factor, así que la lista suele venir vacía | Declararlos al explicar el precio. Si aparece en una cotización nueva, la fecha de la demanda es anterior al catálogo v5: los factores de país no se aplicaron |
| `reviewSignals[]` | Todos los diagnósticos de los periodos, una entrada por código y severidad, con `count`, `periodIds`, `lineIds` y `paths`. No bloquean los totales. Un factor de país estimado se informa como `ESTIMATED_SOURCE` con `paths` `snapshot.talentFactors` (país de la persona) o `snapshot.marketFactors` (país del cliente) | Explicar cada código presente (`ESTIMATED_SOURCE`, `HISTORICAL_ONLY`, `MARGIN_BELOW_FLOOR`…); `paths` dice qué dato lo origina. Con un factor estimado, decir que el precio depende de un estimado sin validar |
| `marginFloor.lines[]` | Líneas que el kernel marcó bajo el piso de su política: `minimumMargin`, `net`, `marginAmount`, `marginRateRoundedDown` (margen real de la línea) y cuánto falta. En un mercado cuyo piso acompaña al factor: `floorNet` (neto mínimo de esa línea en ese mercado) y `netShortOfFloor` (neto que falta para alcanzarlo), con `marginAmountShortOfFloor` en `null`. En los demás mercados: `marginAmountShortOfFloor` (margen que falta al neto actual), y las otras dos claves no existen | Ver «Qué significa una línea marcada» abajo |
| `toolSelections`                                                        | `counts` y las herramientas incluidas, las que aporta el cliente y las excluidas con motivo                                                                                                                                                                                                                                                                                                                                                            | Confirmar que cada herramienta incluida corresponde al alcance y que cada exclusión tiene un motivo defendible                                                                                                                                                        |
| `attributions`                                                          | Por herramienta y precio: estado de la fuente, cantidad, parte del servicio y costo mensual completo, atribuido y sin asignar                                                                                                                                                                                                                                                                                                                          | Revisar fuentes no confirmadas y el costo que queda sin asignar                                                                                                                                                                                                       |
| `creditBudgets`, `resourceIncrementalCash`, `cashLedger`, `cashMeaning` | Presupuesto de créditos y caja. Costo atribuido no es dinero nuevo por pagar; `cashMeaning` lo explica                                                                                                                                                                                                                                                                                                                                                 | No presentar `cashCommitment` como factura ni como compra                                                                                                                                                                                                             |
| `fullDetail` | Recuerda que el detalle vive en el artefacto, bajo `semantic.result` | Ir al artefacto con `explain` para una fila de selección, una asignación o los componentes de costo de una línea. `explain.commercialAdjustments.rows` trae el recorrido del precio por fila: `undiscountedPrice`, `roundingAdjustment`, `discount`, `uplift` y `net`; con el motor 1.2.0, además `marketAdjustment`, `marketPriceRatio` (cuánto del precio base conserva la fila tras el factor) y `floorNet` |

Las filas que sólo difieren por periodo se agrupan en una con `periodIds`.

**Qué significa una línea marcada.** El kernel compara el neto final de cada línea con el piso de su política y la
marca (`MARGIN_BELOW_FLOOR`); nunca corrige un incumplimiento. La lectura depende de dos claves del resumen,
`marketFactor` y `priceRounding`:

- **Dónde se lee el piso** (`marketFactor.floorBasis`):
  - Sin `marketFactor`, o con `floorBasis: null` (cliente en Chile, México, Estados Unidos o España): el piso se lee
    sobre el neto final. Ninguna línea marcada significa que el margen de cada línea cumple el mínimo de su política.
  - Con `floorBasis: "base_market"` (cliente en Colombia o Perú, `engineVersion` `pricing-v3-local/1.2.0`): el piso se
    lee sobre el precio que la línea habría tenido en el mercado base (Chile); la rebaja por país ya es una decisión
    de precio y no se marca. **Ninguna línea marcada significa «al precio aprobado para ese país», no «sobre el
    45 %»**: el margen real de esa cotización está bajo el mínimo de la política (41,5 % en el ejemplo de Colombia) y
    se lee en `marginRateRoundedDown`. Una línea sale marcada cuando su neto queda bajo `floorNet`, es decir, cuando
    hay una rebaja adicional a la del país.
- **Con regla de redondeo** (`priceRounding` con valor, `engineVersion` 1.1.0 o 1.2.0): es toda cotización nueva sobre
  el catálogo vigente en CLP, USD, COP, MXN o PEN. El precio de cada fila facturable se sube al múltiplo siguiente de
  su moneda antes de aplicar ajustes; lo agregado queda en `roundingAdjustment` y nunca se redondea hacia abajo. Una
  fila que cumplía su piso antes de redondear lo sigue cumpliendo después, así que una línea cotizada al piso no sale
  marcada: en el ejemplo `managed-care`, `marginFloor.lines` está vacío. **Una línea marcada es un incumplimiento
  real** —un neto acordado o un descuento la dejó bajo el piso de su mercado— y requiere una decisión del operador
  antes de presentarla ([Registrar el precio acordado](#registrar-el-precio-acordado)). El redondeo no se usa para
  «cumplir» un piso.
- **Sin regla** (`priceRounding: null`): cotizaciones congeladas sobre catálogos anteriores al v4, donde
  `engineVersion` es `pricing-v3-local/1.0.0`, y monedas sin regla, como CLF. Rige la lectura anterior: costo y precio
  se redondean por separado a la unidad de la moneda y una línea al piso puede quedar bajo él por menos de una unidad
  (el mismo `managed-care` sobre el catálogo v3 marca seis líneas con `marginAmountShortOfFloor` entre 0,1 y 0,5).
  Faltan fracciones sin ningún ajuste: es redondeo, decirlo así, no es una excepción. Faltan miles: incumplimiento
  real.

## Cotizar según el país del cliente y del equipo

Desde el catálogo v5 el país cambia el resultado, por dos caminos independientes. Los dos se declaran en la demanda
y rigen para demandas con `quoteDate` 2026-10-11 o posterior.

| Campo de la demanda           | Qué declara                                                              | Qué cambia                                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `brief.offerMarketCountry`    | El país del cliente (uno por cotización)                                 | El **precio**: la parte humana de cada línea se multiplica por el factor de mercado de ese país. Herramientas y fees no reciben factor. El costo no cambia, así que el margen real sí cambia            |
| `brief.lines[].talentCountry` | El país donde está cada persona (uno por línea; el equipo puede mezclar) | El **costo** de esa persona: el costo del perfil en Chile por el factor de talento de su país. El precio sale del costo con el margen objetivo de la política, así que también cambia; el margen casi no |

Son códigos de dos letras y deben estar en el catálogo: hoy `CL`, `CO`, `PE`, `MX`, `US` y `ES`. No se infiere uno
del otro ni de la moneda: un cliente chileno con equipo en Colombia es `offerMarketCountry: "CL"` y
`talentCountry: "CO"` en cada línea.

### Valores vigentes

| País | Factor de talento (costo, respecto de Chile) | Factor de mercado (precio de la parte humana) | El piso acompaña al factor |
| ---- | -------------------------------------------- | --------------------------------------------- | -------------------------- |
| CL   | `1`, por definición: es la referencia        | `1`, decidido                                 | No                         |
| CO   | `0.80`, estimado                             | `0.90`, decidido                              | Sí                         |
| PE   | `0.85`, estimado                             | `0.95`, estimado                              | Sí                         |
| MX   | `0.90`, estimado                             | `1`, estimado                                 | No                         |
| US   | `5`, estimado                                | `1.10`, decidido                              | No                         |
| ES   | `3`, estimado                                | `1.10`, estimado                              | No                         |

- **Decidido** por el operador (CEO) el 2026-10-11: los 32 costos del Excel son el costo de cada perfil en Chile; el
  precio sigue al país del cliente y el costo al país de la persona; factor de mercado de Chile 1, Colombia 0,90 y
  Estados Unidos 1,10, tomados de los rangos de «Factor País» del Excel; y en los mercados bajo 1 el piso acompaña al
  factor.
- **Estimado**, sin validar: los cinco factores de talento (avisos de empleo y guías salariales leídos el 2026-10-11;
  un solo número por país para todos los perfiles y seniorities, sin contraste con contrataciones reales) y los
  factores de mercado de Perú, México y España (sin contraste con negocios cerrados o perdidos). Cada uno aparece en
  el resumen como `ESTIMATED_SOURCE` y está abierto en el ledger como `COUNTRY_FACTORS_UNVALIDATED`. Un precio que
  dependa de un factor estimado se presenta diciéndolo.
- **No están en el cotizador** los factores por tipo de cliente que trae el Excel (pyme 0,9; licitación pública
  0,85–0,95; cliente estratégico 0,95). Un precio así se registra como neto acordado con su motivo
  ([Registrar el precio acordado](#registrar-el-precio-acordado)); no se aplica el porcentaje a mano.

Para ver lo que tiene el catálogo (los dos devuelven exit 0; `"resolution": "ambiguous"` sólo dice que la consulta
devolvió varios registros):

```bash
pnpm --silent pricing:v3 catalog search --kind market_factor --catalog "$pricing_catalog" --date 2026-10-11
pnpm --silent pricing:v3 catalog search --kind talent_factor --catalog "$pricing_catalog" --date 2026-10-11
```

### Cómo se combinan

Los dos factores se aplican a la vez y ninguno compensa al otro. El ejemplo `managed-care` (seis líneas, un mes),
copiado con `quoteDate` 2026-10-11 y cotizado en USD para aislar el efecto del país; todas las filas son
`calculated`, exit 3:

| Cliente | Equipo | `totals.cost` | `totals.net` al mes | `marginRateRoundedDown` | Líneas marcadas | Motor |
| ------- | ------ | ------------- | ------------------- | ----------------------- | --------------- | ----- |
| CL      | CL     | 5229.94       | 9530.00             | `0.451213`              | 0               | 1.1.0 |
| CL      | CO     | 4501.94       | 8210.00             | `0.451651`              | 0               | 1.1.0 |
| CO      | CL     | 5229.94       | 8890.00             | `0.411705`              | 0               | 1.2.0 |
| CO      | CO     | 4501.94       | 7690.00             | `0.414572`              | 0               | 1.2.0 |
| PE      | PE     | 4683.94       | 8260.00             | `0.432937`              | 0               | 1.2.0 |
| MX      | MX     | 4865.94       | 8890.00             | `0.452650`              | 0               | 1.1.0 |
| US      | CL     | 5229.94       | 10180.00            | `0.486253`              | 0               | 1.1.0 |
| US      | US     | 19789.94      | 39300.00            | `0.496439`              | 0               | 1.1.0 |
| ES      | ES     | 12509.94      | 24740.00            | `0.494343`              | 0               | 1.1.0 |

- **El país del equipo mueve costo y precio juntos**: equipo en Colombia en vez de Chile baja el costo de 5.229,94 a
  4.501,94 y el precio de 9.530 a 8.210; el margen queda en 45 %.
- **El país del cliente mueve sólo el precio**: el mismo equipo chileno se vende en 8.890 a un cliente colombiano y en
  10.180 a uno estadounidense, con el mismo costo. Por eso el margen real baja a 41,2 % en Colombia y sube a 48,6 % en
  Estados Unidos.
- **El factor de mercado no es el descuento total**: sólo toca la parte humana. Con factor 0,90 el precio del ejemplo
  baja entre 6 % y 7 %, no 10 %, porque herramientas y fees se cobran igual.
- **Equipo en España o Estados Unidos**: los factores 3 y 5 son órdenes de magnitud, no costos. Las dos últimas filas
  muestran cuánto pesan; antes de presentar una cifra así conviene tener el costo real del perfil
  ([abajo](#cuándo-registrar-el-costo-real-de-un-perfil-en-un-país)).

Para cotizar una combinación se copia la demanda a una ruta nueva y se cambian los campos; un archivo versionado no
se edita. Cliente y equipo en Colombia, en USD:

```bash
sed -e 's/"quoteDate": "2026-10-10"/"quoteDate": "2026-10-11"/' \
  -e 's/"offerMarketCountry": "CL"/"offerMarketCountry": "CO"/' \
  -e 's/"talentCountry": "CL"/"talentCountry": "CO"/' \
  -e 's/"outputCurrency": "CLP"/"outputCurrency": "USD"/' \
  data/pricing/v3-operating/managed-care.demand.json > /tmp/servicio-gestionado-co.demand.json

pnpm --silent pricing:v3 compose prepare --catalog "$pricing_catalog" --policy "$pricing_policy" \
  --credits "$pricing_credits" --input /tmp/servicio-gestionado-co.demand.json
```

Devuelve exit 3 con `totals.net` `7690.00`, `engineVersion` `pricing-v3-local/1.2.0`, `marketFactor.factor` `0.90`
y `totals.marketAdjustment` `-529.47`. Comprobar siempre en el resumen que el país entró: `marketFactor` trae el país
del cliente (salvo Chile y México, cuyo factor 1 no cambia nada y no se muestra) y `assumptions` no trae
`UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY`. Si ese supuesto aparece, la demanda está fechada antes del 2026-10-11 y
ningún factor de país se aplicó.

**País sin factor.** Un `talentCountry` sin factor de talento devuelve exit 2 con `MISSING_CATALOG_SELECTION` en
`lines.<lineId>.talentFactor`; un `offerMarketCountry` sin factor de mercado, exit 2 con `MISSING_CATALOG_SELECTION`
en `offerMarketCountry`. No hay precio y no se sustituye por un país «parecido»: el factor se agrega al catálogo con
una decisión del operador ([cómo](catalogo-v3-seleccion-y-actualizacion.md#cambiar-un-factor-de-país-o-registrar-el-costo-de-un-perfil-en-un-país)).
En el carril del núcleo (`calculate`) el mismo faltante se llama `MISSING_TALENT_FACTOR`.

### En Colombia y Perú el piso acompaña al factor

El factor de mercado de esos dos países declara `floorBasis: "base_market"`: el 45 % se comprueba sobre el precio que
cada línea habría tenido en el mercado base (Chile). La rebaja por país ya es una decisión de precio y no se vuelve a
marcar. Tres consecuencias que hay que tener presentes al leer el resultado:

1. Una cotización al precio de política **no sale marcada aunque su margen real esté bajo 45 %**: 41,5 % con cliente
   y equipo en Colombia, 43,3 % en Perú. `marginFloor.lines` vacío significa ahí «al precio aprobado para ese país».
2. `marginRateRoundedDown` es siempre el margen real. Es el número que se lleva al operador; no se presenta el 45 %
   del mercado base como si fuera el margen de la cotización.
3. Una rebaja **adicional** sí sale marcada, y la línea dice cuánto falta: `floorNet` es el neto mínimo de esa línea
   en ese mercado y `netShortOfFloor` lo que le falta al neto actual para alcanzarlo.

Caso versionado: [`managed-care-colombia.demand.json`](../../../data/pricing/v3-operating/managed-care-colombia.demand.json)
(cliente y equipo en Colombia, en COP) y su artefacto congelado. Los dos comandos devuelven exit 3; `replay` responde
`"verified": true`:

```bash
pnpm --silent pricing:v3 compose prepare --catalog "$pricing_catalog" --policy "$pricing_policy" \
  --credits "$pricing_credits" --input data/pricing/v3-operating/managed-care-colombia.demand.json

pnpm --silent pricing:v3 replay --input data/pricing/v3-operating/managed-care-colombia.artifact.json
```

| Caso                                                | `totals.net` al mes | Margen real         | Líneas marcadas | Qué dice la primera línea (`primary`)                                |
| --------------------------------------------------- | ------------------- | ------------------- | --------------- | -------------------------------------------------------------------- |
| Al precio de política                               | COP 28.100.000      | 41,5 % (`0.415231`) | 0               | No aparece en `marginFloor.lines`                                    |
| Con un `agreed_net` de 24.000.000 por las seis líneas | COP 24.000.000      | 31,5 % (`0.315333`) | 6               | `net` 10.163.701, `floorNet` 11.872.366, `netShortOfFloor` 1.708.665 |

El segundo caso es la misma demanda, copiada a una ruta nueva, con un neto acordado mensual sobre sus seis líneas.

En el segundo caso las seis líneas suman 3.943.867 de `netShortOfFloor`: es lo que le falta a ese neto para
alcanzar el mínimo de Colombia, no para llegar al 45 % de margen real. `totals.marketAdjustment` es `-1932511` en los
dos: lo que el factor 0,90 ya había rebajado antes del acuerdo. Una línea marcada es un incumplimiento real y la
excepción la decide el operador («Quién decide», en [Registrar el precio acordado](#registrar-el-precio-acordado)).

En los mercados sin `floorBasis` (Chile, México, Estados Unidos, España) el piso se lee sobre el neto final, como
siempre, y la línea marcada trae `marginAmountShortOfFloor`.

### País no es moneda

`offerMarketCountry` fija el factor; `outputCurrency` fija el FX de cotización y el múltiplo de redondeo
([Cotizar en otra moneda](#cotizar-en-otra-moneda)). Se eligen por separado: a un cliente colombiano se le puede
cotizar en USD (7.690,00 con equipo en Colombia) o en COP (28.100.000), y cambiar sólo la moneda no aplica ningún
factor: la misma demanda con cliente y equipo en Chile, pedida en COP, da 34.900.000. Para un cliente de otro país
se cambian los dos campos.

España está registrada como país, pero no hay regla de redondeo para EUR ni FX de cotización USD→EUR: una cotización
con `outputCurrency: "EUR"` devuelve exit 2 (`MISSING_CATALOG_SELECTION` en `fx.USD:EUR`). Hoy a un cliente español
se le cotiza en USD.

### Cuándo registrar el costo real de un perfil en un país

El factor de talento es una aproximación para cuando no se conoce el costo: un solo número por país, igual para un
diseñador junior y para un consultor senior. Cuando existe el costo real de un perfil en un país —una contratación,
una oferta aceptada, un contrato vigente— se registra en el catálogo como **costo específico** de ese perfil y ese
país. A partir de su fecha de vigencia, una línea con ese perfil y ese `talentCountry` usa ese costo, sin factor de
talento; las personas del mismo perfil en otros países siguen con el costo de Chile por su factor.

Conviene hacerlo antes de presentar un precio cuando el equipo está en España o Estados Unidos, cuando el perfil o
su seniority se apartan del promedio del país, y cuando el caso es grande o recurrente. No se corrige el costo
cambiando el factor del país (afecta a todos los perfiles) ni usando el factor de mercado (es otro hecho: lo que
paga el cliente). Pasos y change-set:
[registrar el costo de un perfil en un país](catalogo-v3-seleccion-y-actualizacion.md#cambiar-un-factor-de-país-o-registrar-el-costo-de-un-perfil-en-un-país).
El ledger lo mantiene abierto como `LOCALIZED_TALENT_COSTS`.

## Cotizar en otra moneda

La moneda de la cotización es `brief.outputCurrency`: `CLP`, `USD`, `COP`, `MXN` o `PEN`. La moneda no dice de qué
país es el cliente ni aplica un factor de país: eso lo declaran otros campos
([País no es moneda](#país-no-es-moneda)). Un archivo versionado no se edita: copiar la demanda a una ruta nueva y
cambiar ese campo. Con el trío vigente:

```bash
sed 's/"outputCurrency": "CLP"/"outputCurrency": "USD"/' \
  data/pricing/v3-operating/managed-care.demand.json > /tmp/servicio-gestionado-usd.demand.json

pnpm --silent pricing:v3 compose prepare --catalog "$pricing_catalog" --policy "$pricing_policy" \
  --credits "$pricing_credits" --input /tmp/servicio-gestionado-usd.demand.json
```

Devuelve exit 3 con `totals.net` `9530.00` y `totals.currency` `USD`.

- **USD es la moneda de referencia.** Los costos se calculan en USD y se convierten al final con el FX de cotización
  del catálogo (`catalog search --kind fx --catalog "$pricing_catalog" --date 2026-10-11` lo lista). No se deriva un
  FX inverso ni cruzado.
- **El FX de cotización es una política, no el tipo de cambio del día.** Lo decidió el CEO el 2026-10-10 con un margen
  prudencial sobre el mercado, para sostener un precio durante el plazo:

  | Par     | FX de cotización | Mercado observado |
  | ------- | ---------------- | ----------------- |
  | USD→CLP | `1000`           | cerca de 937      |
  | USD→COP | `3650`           | cerca de 3219     |
  | USD→MXN | `19.25`          | cerca de 17,98    |
  | USD→PEN | `3.70`           | cerca de 3,435    |

  No presentarlo como tipo de cambio de mercado ni usarlo para liquidar un pago. Su revisión es decisión del operador
  (`QUOTE_FX_REVIEW` en el ledger).

- **Cada moneda redondea a su propio múltiplo**, por fila facturable y siempre hacia arriba: CLP 10.000, USD 10,
  COP 50.000, MXN 100 y PEN 50 (`catalog search --kind price_rounding --catalog "$pricing_catalog" --date 2026-10-11`).
  Por eso la misma oferta en dos monedas **no es la conversión exacta** una de la otra, y eso es lo esperado. El
  ejemplo `managed-care` (cliente y equipo en Chile), cotizado en cada moneda (todas `calculated`, exit 3, motor
  1.1.0, ninguna línea bajo el piso; el resultado es el mismo con `quoteDate` 2026-10-10 y 2026-10-11):

  | Moneda | `totals.net` | `totals.roundingAdjustment` |
  | ------ | ------------ | --------------------------- |
  | CLP    | 9530000      | 21054                       |
  | USD    | 9530.00      | 21.05                       |
  | COP    | 34900000     | 192348                      |
  | MXN    | 183300.00    | 252.82                      |
  | PEN    | 35300.00     | 116.91                      |

  USD 9.530 al FX de cotización serían COP 34.784.500; cotizado en COP sale 34.900.000. Para dar el precio en una
  moneda, cotizar en esa moneda; no convertir a mano el resultado de otra. Estas cifras son de un cliente chileno:
  la fila COP no es el precio para un cliente colombiano, que con el mismo equipo en Chile sale en 32.400.000 y con
  el equipo en Colombia en 28.100.000.

- **Un precio acordado va en la moneda de salida**: el `amount` de un `agreed_net` se declara en esa moneda y con sus
  decimales (CLP y COP, ninguno; USD, MXN y PEN, hasta dos).
- **Moneda sin regla de redondeo** (hoy CLF): calcula, pero sin redondear (`priceRounding: null`, motor 1.0.0) y con un
  FX USD→CLF estimado de 2025; las líneas al piso vuelven a salir marcadas por fracciones. No presentar un precio en
  CLF mientras el operador no decida su FX y su múltiplo (`QUOTE_FX_REVIEW`, `COMMERCIAL_ROUNDING_SCOPE`).
- **Moneda sin FX** (EUR, o cualquier otra): exit 2, `calculationStatus` `needs_input`, `totals` `null` y en
  `diagnostics` un `MISSING_CATALOG_SELECTION` en `fx.USD:<moneda>`. No hay precio y no se inventa una tasa: el FX se
  agrega al catálogo ([mantenimiento](catalogo-v3-seleccion-y-actualizacion.md#cambiar-el-redondeo-o-el-fx-de-cotización)).
  Vale también para un cliente español: España tiene factores de país, pero EUR no tiene FX ni múltiplo; se cotiza en
  USD.
- **Herramienta con precio en EUR** (Magnific): la referencia EUR→USD del catálogo rige sólo el 2026-10-09. Una
  cotización con fecha posterior que la necesite devuelve exit 2 con `RESOURCE_FX_SELECTION_REQUIRED` hasta que el
  catálogo reciba una referencia vigente.

## Registrar el precio acordado

El precio que el operador acuerda de verdad tiene que pasar por el motor. Si se anota sólo en la propuesta, el
artefacto congelado sigue mostrando el precio calculado y nadie comprueba el piso contra el precio real. El precio se
declara directo, como neto acordado (`agreed_net`): no se calcula ninguna tasa a mano.

1. Cotizar sin ajustes con el trío vigente y leer `totals.undiscountedPrice`: es el precio calculado, ya redondeado.
2. Copiar la demanda a un archivo nuevo y declarar el acuerdo dentro de `brief`:

   ```json
   "adjustments": [
     {
       "adjustmentId": "sky-precio-acordado",
       "kind": "agreed_net",
       "amount": "4990000",
       "billing": "monthly",
       "lineIds": ["titular", "lider", "agentes"],
       "reason": "Precio base acordado CLP 4.990.000 más IVA al mes, todo incluido. Excepción al piso de 45 % aprobada por el CEO el 2026-10-10 por ser cliente vigente."
     }
   ]
   ```

   - `amount`: el neto acordado antes de impuestos, en la moneda de salida, como cadena y sin más decimales que los de
     la moneda.
   - Es **por periodo**: con `billing: "monthly"` es lo que se factura cada mes por esas líneas, no el total del plazo.
     En doce meses, el plazo suma doce veces `amount`.
   - `billing`: `monthly` acuerda las filas mensuales de esas líneas; `setup`, las de implementación (cobro único), y
     sólo rige en los periodos que tienen filas de implementación. Acordar las dos cosas son dos ajustes.
   - `lineIds`: los IDs de las líneas del brief que cubre el acuerdo. El motor reparte la diferencia entre sus filas
     en proporción al precio de cada una.
   - `reason`: obligatorio. Dice qué se acordó, quién lo aprobó y cuándo.
   - El monto puede quedar bajo o sobre el precio calculado. Si es menor, la diferencia sale como `discount` (rebaja);
     si es mayor, como `uplift` (recargo). En ambos casos el neto de esas filas es exactamente `amount`.

3. Volver a correr con `compose prepare` y comprobar en el resumen: el neto de cada periodo (`periods[].totals.net`;
   `totals.net` suma todo el plazo) es el monto acordado más lo que facturen las filas que el acuerdo no cubre,
   `commercialAdjustments` trae el ajuste con su motivo y `engineVersion` es `pricing-v3-local/1.1.0` (`1.2.0` con
   cliente en Colombia o Perú). El motor no juzga si el monto es razonable (acepta incluso `"0"`): revisar la cifra
   antes de congelar.
4. Leer el margen real en `marginRateRoundedDown` y las líneas bajo el piso en `marginFloor.lines[]`:
   `marginAmountShortOfFloor` es el margen que falta en cada una; con cliente en Colombia o Perú la línea trae en su
   lugar `floorNet` y `netShortOfFloor`, el neto mínimo de ese mercado y lo que falta para alcanzarlo
   ([el piso acompaña al factor](#en-colombia-y-perú-el-piso-acompaña-al-factor)). Una línea marcada es un
   incumplimiento real: se lleva al operador antes de congelar.
5. Congelar con `compose quote --out` en una ruta nueva, guardar el resumen y correr `compose assess` sobre el
   artefacto. Conservar los cuatro archivos junto al expediente, con una nota de la decisión.

Se admiten hasta 10 ajustes y cada fila facturable recibe a lo más uno. Un `discount` (rebaja por tasa, para un
descuento que de verdad se pacta como porcentaje) toma las filas mensuales y las de implementación de sus líneas, así
que no convive con un `agreed_net` sobre la misma línea. Ningún ajuste aprueba nada: el piso se controla sobre el neto
final. Si el ajuste está mal declarado no hay precio:

| Qué devuelve                                               | Causa                                                                                 | Arreglo                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Exit 2, `diagnostics` con `OVERLAPPING_ADJUSTMENTS`        | Dos ajustes apuntan a la misma fila                                                   | Dejar un ajuste por fila; separar por líneas o por `billing` |
| Exit 2, `diagnostics` con `INVALID_AGREED_AMOUNT`          | `amount` tiene más decimales que la moneda                                            | Escribir el monto en la escala de la moneda                  |
| Exit 2, `diagnostics` con `AGREED_NET_WITHOUT_BASE`        | No hay filas de esa clase que acordar (ej. `setup` en un servicio sin implementación) | Corregir `billing` o `lineIds`                               |
| Exit 2, `diagnostics` con `DUPLICATE_ID`                   | `adjustmentId` repetido                                                               | Un ID distinto por ajuste                                    |
| Exit 2, `diagnostics` con `INVALID_ADJUSTMENT_LINE`        | Un `lineId` no existe en el brief                                                     | Usar los IDs de `brief.lines`                                |
| Exit 1, `SCHEMA_INVALID` en stderr (`issues` da el `path`) | Falta `reason`, `amount` no es una cadena, un campo sobra o hay más de 10 ajustes     | Corregir cada `path`                                         |

El método anterior —un `discount` cuya tasa `1 − neto ÷ precio` se calculaba a mano con siete decimales— sólo sirve
para leer artefactos congelados antes del motor 1.1 (`acordado.*` de SKY); no se usa para registrar un acuerdo nuevo.

Caso real, SKY social care 2027, congelado sobre el catálogo v4 y la policy v5 (su demanda está fechada 2026-10-10,
así que el trío vigente da el mismo resultado): precio calculado CLP 5.430.000 al mes (incluye 9.855 de
redondeo), acordado 4.990.000 → el motor deriva una rebaja de 440.000 y el neto es exactamente 4.990.000; margen
40,26 % (`0.402589`), tres líneas marcadas y CLP 236.579 al mes de margen bajo el piso en total. Archivos en
`docs/commercial/prospects/sky-social-care-2027/pricing/`: `acordado-neto.demand.json`,
`acordado-neto.artifact.json`, `acordado-neto.summary.json`, `acordado-neto.assessment.json` y la
[nota de la excepción](../../commercial/prospects/sky-social-care-2027/pricing/EXCEPCION-PISO-2026-10-10.md). Los
`acordado.*` anteriores (tasa 0,0793605 sobre el catálogo v3, precio al piso 5.420.145, mismo neto y mismo margen)
siguen siendo válidos y reproducibles. Sin precio acordado, la misma demanda (`final.demand.json`) da 5.430.000 y
ninguna línea marcada. Con las tres variables vigentes (los tres comandos devuelven exit 3):

```bash
pnpm --silent pricing:v3 compose prepare --catalog "$pricing_catalog" --policy "$pricing_policy" \
  --credits "$pricing_credits" \
  --input docs/commercial/prospects/sky-social-care-2027/pricing/acordado-neto.demand.json

pnpm --silent pricing:v3 replay \
  --input docs/commercial/prospects/sky-social-care-2027/pricing/acordado-neto.artifact.json

pnpm --silent pricing:v3 compose assess \
  --input docs/commercial/prospects/sky-social-care-2027/pricing/acordado-neto.artifact.json
```

**Quién decide.** Márgenes, pisos, precios, cifras comerciales y excepciones al piso son decisión del operador (CEO y
dueño). El agente le lleva el margen real que entrega el motor y una recomendación; no aprueba, no da una excepción
por implícita ni usa el redondeo o un ajuste para «cumplir» un piso, y `compose assess` tampoco la aprueba. Aprobada
la excepción, se registra con su motivo en `reason` y en una nota junto al artefacto. Confirmado el 2026-10-10: el
45 % es el piso de margen de los servicios gestionados, y un servicio donde se puede ganar más sube su margen
objetivo, no el piso; la política `creative-managed-service` se mantiene en objetivo 0,45 y mínimo 0,45; SKY social
care es una excepción aprobada por ser cliente vigente. No usar el precio de SKY como referencia de margen para otro
cliente. Confirmado el 2026-10-11: el precio sigue al país del cliente, el costo al país de la persona y, en los
mercados con factor bajo 1, el piso acompaña al factor; el 45 % sigue siendo el piso en el mercado base. Declarar
`floorBasis` en otro mercado, o cambiar un factor, es decisión del operador.

Abierto, registrado en el [ledger de pendientes](../../../data/pricing/v3-operating/operational-gaps.json): la
revisión del FX de cotización cuando el mercado se mueva más allá de su margen, más el FX de CLF y la referencia EUR
(`QUOTE_FX_REVIEW`); los múltiplos de redondeo para otras monedas o para una oferta que deba redondear distinto
(`COMMERCIAL_ROUNDING_SCOPE`); la validación de los factores de país con contrataciones reales y con negocios
cerrados o perdidos (`COUNTRY_FACTORS_UNVALIDATED`); y el costo real de cada perfil en cada país donde se aparte del
costo de Chile por su factor (`LOCALIZED_TALENT_COSTS`). El alcance del piso (`MARGIN_FLOOR_SCOPE`) quedó decidido.
Tampoco se decidió, a propósito, redondear sobre el total del periodo en vez de por fila ni redondear a
terminaciones comerciales como 990.000 (un precio así se registra como neto acordado), ni factores por tipo de
cliente (también neto acordado) ni factores de talento por perfil o seniority (se expresan como costo específico).
No resolver nada de esto por cuenta propia en una cotización.

## Pendientes que permanecen visibles

`compose assess` separa cálculo y evidencia: salario/localización, provisionesAssurance/operación/onboarding,
planes actuales, acceso/usuarios, capacidad real, margen comercial, entidad/impuestos y alcance del servicio.
Los montos de los 32 costos de persona están confirmados desde el catálogo v4 y declarados como costo en Chile desde
el v5: con una demanda fechada 2026-10-11 o después `assess` ya no emite `HUMAN_COST_EVIDENCE_REQUIRED`; con una
fechada antes lo sigue emitiendo por línea, porque ese día los registros no declaraban país. `assess` no avisa de un
factor de país estimado: eso se lee en `reviewSignals` del resumen. Cuando el factor de mercado cambia algo,
`margin.policyFloor.marketFactor` lo repite.
Márgenes 40%/35% son propuestas genéricas, no aprobaciones. Creative Practice mantiene 45% bruto aprobado; `assess` no sustituye ese piso ni aprueba una excepción. Consultar la práctica dueña antes de presentar precio. El preview está redactado, local y marcado como simulación;
no es oferta emitida. La promoción futura tiene [mapa de integración](../../documentation/finance/cotizador-v3-promocion-canonica.md),
con la autoridad y lifecycle del cotizador vigente. Este trabajo no despliega ni escribe API/DB/CRM.

Para registrar una licencia nueva, pedir plan, moneda, frecuencia, importe, seats/capacidad, cobertura,
acceso nominativo/compartido y evidencia/fecha. Primero registrar selección y costo en policy/catalog,
luego la asignación en demanda/portfolio. No inferir usuarios habilitados desde una factura ni sustituir un
contrato desconocido por una referencia pública. Las facturas privadas y enlaces firmados no se copian al repo:
registrar referencia, hash y hechos financieros mínimos. [Ledger de pendientes por owner](../../../data/pricing/v3-operating/operational-gaps.json).
