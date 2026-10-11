# Cotizador V3: contrato operativo para agentes

Referencia load-on-demand compartida Codex/Claude. Estado verificado 2026-10-09: prototipo local opt-in;
catálogo, kernel Decimal, mantenimiento, créditos, composición y flujo operativo implementados; desde 2026-10-10,
motor 1.1 (precio acordado, redondeo comercial) y catálogo v4 con cotización en CLP, USD, COP, MXN y PEN; desde
2026-10-11, catálogo v5 con factores por país del cliente y de cada persona y contrato 1.2.0 (el piso acompaña al
factor de mercado); el mismo día, más tarde: puntero de versiones vigentes (`current.json`, `--current`), catálogo v6
(FX de cotización EUR→USD) y policy v6 (precios unitarios que no vencen), avisos de la corrida (`runNotices`) y peso
de cada dato estimado (`estimateExposure`). El canon de cotizaciones Greenhouse conserva autoridad, permisos y
lifecycle. Esta referencia interpreta sus contratos; los schemas y primitives de `src/lib/finance/pricing-v3/`
calculan.

Orden para actuar: 1) [qué cargar](#entrada-y-fuentes-dueñas); 2) [cadena de comandos](#secuencia-verificable-por-cli);
3) contratos de selección, capacidad, créditos y precio; 4) leer el resumen
([piso y precio acordado](#resumen-piso-y-precio-acordado-delta-2026-10-10),
[país](#país-del-cliente-y-de-la-persona-delta-2026-10-11),
[avisos y estimados](#avisos-de-la-corrida-exposición-a-estimados-y-base-de-costo-delta-2026-10-11));
5) [mantenimiento: versión nueva y puntero](#mantenimiento-versión-nueva-y-puntero-delta-2026-10-11);
6) [lo que nunca se hace](#nunca).

## Entrada y fuentes dueñas

- [Manual operativo](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md): secuencia completa y comandos.
- [Data operativa](../../../../data/pricing/v3-operating/README.md): catálogo monetario/policy sucesores, casos y evidencias.
- [Selección y actualización monetaria](../../../../docs/manual-de-uso/finance/catalogo-v3-seleccion-y-actualizacion.md).
- [Composición](../../../../docs/manual-de-uso/finance/componer-cotizacion-v3-con-herramientas.md) y
  [créditos](../../../../docs/manual-de-uso/finance/presupuestar-creditos-ia-v3.md).
- [Mantenimiento](../../../../docs/documentation/finance/cotizador-v3-mantenimiento-catalogo.md): owners, vigencia y cadencia.
- [ADR operativo](../../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md),
  [ADR motor 1.1](../../../../docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md)
  (precio acordado, redondeo comercial, contratos convivientes; 2026-10-10; delta 2026-10-11: contrato 1.2.0) y
  [promoción futura](../../../../docs/documentation/finance/cotizador-v3-promocion-canonica.md).

Para interpretar un pedido, identificar unidad comercial, variante/seniority/tier, país del talento, mercado del
cliente, dedicación, headcount, duración, tareas, moneda y fecha. País del talento y mercado del cliente cambian el
resultado desde el catálogo v5 y se preguntan por separado, sin deducir uno del otro ni de la moneda
([delta 2026-10-11](#país-del-cliente-y-de-la-persona-delta-2026-10-11)). Una vacante CRM es señal de necesidad; no
acredita intención de contratar proveedor. Talent Assurance aceptado no aprueba cada salario, fee ni garantía comercial.

El expediente aporta demanda/alcance y evidencias: no reemplaza valores centrales de tools, factores, salario,
provisiones o FX con montos arbitrarios. Excel y `pricing:workbook` sirven para investigación histórica;
V3 no depende de leer el archivo al cotizar. Las escalas de Consultor HubSpot siguen separadas. Una tarea SEO en
Copywriter añade SEMrush cuando corresponde, sin cambiarlo al costo de SEO Specialist.

## Secuencia verificable por CLI

Desde la raíz. **Las versiones vigentes no se nombran a mano.** El puntero
`data/pricing/v3-operating/current.json` (`pricing-v3-current/1`) nombra catálogo, policy y catálogo de créditos por
ruta, versión y digest; `--current` (interruptor sin valor) rellena cada `--catalog`, `--policy` y `--credits` que el
comando acepta y no recibió, después de verificar versión y digest del archivo. Una opción escrita gana. En
`resources budget` rellena `--catalog` con el catálogo de créditos. Sin `--current` nada cambió: sin `--catalog` cae
en la baseline histórica y `--policy`/`--credits` son obligatorios. Qué nombra el puntero lo imprime `current show`;
no citarlo de memoria. Al 2026-10-11, tras la oferta SEO/AEO: `catalog.review-v8.json`
(`operating-review-2026-10-11-v8`) + `resources.review-v6.json` + `ai-credits.review-v1.json`.

Los valores se toman por `quoteDate`, no por el archivo: factores de país, costos en Chile y FX EUR→USD rigen con
`quoteDate` 2026-10-11 o posterior; una demanda fechada 2026-10-10 resuelve sin factores de país y sin error (lo
avisa `runNotices.laterCatalogValues`). Una ruta `…review-vN.json` se escribe sólo para repetir un caso con las
versiones de su fecha, diciéndolo: `designer.plan.json` (2026-10-09) corre con `catalog.review-v2.json` +
`resources.review-v2.json`; con `--current` devuelve `RESOURCE_POLICY_NOT_EFFECTIVE`. Las versiones anteriores no se
borran ni se editan.

```bash
pnpm --silent pricing:v3 current show
pnpm --silent pricing:v3 catalog search --current --query consultor
pnpm --silent pricing:v3 resources inspect --current --date 2026-10-11
pnpm --silent pricing:v3 compose scaffold --current --input pedido.json
pnpm --silent pricing:v3 resources portfolio --current --date 2026-10-11 --input cartera.json
pnpm --silent pricing:v3 compose plan --current --input plan.json --out demanda-nueva.json
pnpm --silent pricing:v3 compose quote --current --input demanda-nueva.json --out artefacto-nuevo.json
pnpm --silent pricing:v3 explain --input artefacto-nuevo.json
pnpm --silent pricing:v3 replay --input artefacto-nuevo.json
pnpm --silent pricing:v3 compose assess --input artefacto-nuevo.json
pnpm --silent pricing:v3 compose preview --input artefacto-nuevo.json --format markdown --out preview-nuevo.md
```

`pedido.json`, `cartera.json` y `plan.json` son los archivos del caso; la misma cadena, con entradas versionadas y sus
códigos de salida, está en el
[manual](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#secuencia-de-comandos).
`explain`, `replay`, `compose assess|preview`, `calculate`, `validate`, `compare`, `export` y `current` no aceptan
`--current` (`INVALID_ARGUMENT`).

`scaffold` produce demanda editable y preguntas; `plan` combina demanda y portfolio sin superponer una misma
asignación manual. `prepare` diagnostica; `quote` congela entradas y resultado. No llamar a quote con las preguntas
sin resolver para presentar un precio completo. `calculate` es el kernel de bajo nivel con snapshot explícito;
`prepare|quote` fuera de `compose` sigue disponible para casos de catálogo sin composición avanzada.

Salida en stdout: `compose prepare` y `compose quote` imprimen el mismo resumen derivado
`pricing-v3-composition-summary/1` (`quote` añade `replayDigest`). El resultado completo existe **sólo** en el
artefacto de `--out`: un `compose quote` sin `--out` no deja el detalle en ninguna parte, así que quote siempre lleva
`--out`. `replay` de composición devuelve `{ verified, calculationId, summary }`; `explain` no cambió y es la vista
de detalle (grande: pedirla sólo para un componente). `prepare|quote` de catálogo y `calculate` conservan su salida.

Códigos: **0** operación técnica verificada, **2** `needs_input`, **3** preparado/calculado en revisión, **1** rechazo
por input/conflicto/overwrite/export bloqueado. Replay de composición puede devolver3. Leer JSON y estado;
no encadenar con `&&` asumiendo que una simulación calculada devuelve0. Salidas nuevas son archivos exclusivos
`wx`, modo0600; no sobrescribir padres, fixtures o artifacts. `export` comercial continúa bloqueado.

Rechazo (exit 1): stdout vacío y en stderr `{ "error": { "code", "message", "option"?, "issues"? }, "binding": false }`.
`code` sale del registro cerrado [`errors.ts`](../../../../src/lib/finance/pricing-v3/errors.ts) (grupos de dominio y
de adaptador); `message` es texto fijo; `option` nombra la opción a corregir sin su valor; `issues` trae hasta 20
`{ path, rule }` y no dice qué archivo. Nunca viaja un valor, una ruta ni un mensaje de parser: decidir por `code`.
Adaptador: `UNKNOWN_COMMAND`, `UNKNOWN_OPTION`, `INVALID_ARGUMENT`, `MISSING_ARGUMENT`, `INVALID_FORMAT`,
`INPUT_NOT_FOUND`, `INPUT_NOT_JSON`, `SCHEMA_INVALID`, `OUTPUT_EXISTS`, `OUTPUT_NOT_WRITABLE`,
`CURRENT_VERSIONS_MISMATCH` (con `--current`, un archivo no tiene la versión o el digest del puntero: `current show`
dice cuál; no saltarlo con rutas a mano) y `CURRENT_VERSIONS_CONFLICT` (`current set` con un `--confirm` que no es el
del puntero que se reemplaza). Los conflictos de dominio
llegan con su código (`REPLAY_MISMATCH`, `CATALOG_BASE_CONFLICT`, `RESOURCE_BASE_CONFLICT`,
`RESOURCE_PREVIEW_CONFLICT`…). `ADAPTER_FAILURE` significa falla sin clasificar —un hueco de la herramienta, no un
error del pedido—: reportarla, no reintentar a ciegas. Arreglo por código en el
[manual](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#qué-hacer-con-cada-error).

## Contratos de selección y recursos

`pricing-v3-composition-demand/1` contiene `commercialUnit`, `brief`, `work`, `serviceToolIds`, `allocations`,
`creditBudgets`, `fxRecordIds` y opcional `clientProvidedTools`. `work` declara IDs estables, tareas, selección IA
con motivo y consumo por proveedor/mes. `planned-*` son slots, nunca personas asignadas o seats reales.
`pricing-v3-resource-policy/1` enlaza perfiles/tareas/tools; `access` diferencia `named`, `shared`, `credits`.
32 reglas de perfil son recetas iniciales para revisión, no una cobertura universal del trabajo solicitado.

Base Notion/Microsoft365 obligatoria para todos. SEMrush se añade al trabajo SEO; Adobe a diseño/video que lo
requiere. ChatGPT, Claude, Higgsfield, Magnific y demás IA se eligen por necesidad y motivo; no sumarlos todos a
cada rol. WordPress, stock, publicación social, datos y automatización usan tareas explícitas del alcance.
Elegir `priceId`/frecuencia; plan múltiple o costo desconocido produce pregunta, nunca el plan más barato o cero.

Una licencia nominativa mantiene cantidad entera, usuarios, capacidad y mínimos contractuales. Dedicación50%
no significa licencia50%. Un costo compartido no autoriza compartir login. `basis=seat` no se transforma en pool;
paquetes nominativos pueden distribuir costo respetando capacidad contractual. Adobe actual reportado:
**USD180/mes por paquete de3CC Teams +3Express**, capacidad3CC; impedir contar Express otra vez. El escenario de
renovación es306USD (+70%), condicional hasta conocer fecha; no activarlo automáticamente.

El estado de cada fuente importa: factura acredita facturado, no pago; operador acredita declaración; tarifa
pública no acredita el plan Efeonce; histórico no acredita salario vigente. Notion factura período21sep–21oct2026:
9usuarios Business×24USD y30USD por3000créditos, componentes separados. No distribuir créditosNotion como otra
licencia obligatoria ni considerar que cada usuario recibe todo ese presupuesto. M365/SEMrush/Claude/ChatGPT
públicos preservan su fuente y siguen marcados `estimated`. Desde la policy v6 un precio unitario no vence: rige
hasta que una versión nueva lo reemplaza y lleva una fecha de revisión que avisa sin bloquear
([detalle](#avisos-de-la-corrida-exposición-a-estimados-y-base-de-costo-delta-2026-10-11)).
No grabar PDFs privados, tarjetas, domicilios o URLs firmadas en datos/docs.

`clientProvidedTools` exige herramienta/mes/líneas/motivo y fuente confirmada con ventana suficiente. Sólo omite
el costo Efeonce de líneas cubiertas y registra `client-provided`. No sustituye Notion/M365 ni tools de créditos.
No presume acceso de partner, permiso de revender licencia ni saldo real del cliente.

## Capacidad y costos compartidos

`pricing-v3-resource-portfolio/1` declara versión, modo, recurso/plan/mes, cantidad, unidad del driver,
`totalUnits`, `accounts[].units`, `internalUnits`, `unallocatedUnits`, motivo y capacidad contractual cuando aplica.
Cliente + interno + sin asignar = total exactamente. Cuota de cuenta = unidades de cuenta / total; residual
Decimal visible. GCP264USD/mes y Vercel60–100USD/mes son declaraciones: seleccionar escenario explícito del rango,
hasta medir consumo/factura. No inventar denominador ni número de clientes. No cargar capacidad interna o sin
asignar al cliente por omisión. El portfolio opera pools/paquetes; los seats individuales se declaran en demanda.

Ejemplo hipotético Adobe180/capacidad160: cliente40→45USD, interno80→90, sin asignar40→45; no es reparto real ni
porcentaje por defecto. Dentro de una cuenta, attributions noIA se distribuyen por usuarios únicos y créditos por
consumo. No presentar esos pesos como una fórmula de horas que el código no implementa. Portfolio no consulta,
reserva ni controla inventario/concurrencia live. Debe existir declaración de capacidad antes del compromiso.

## Créditos y provisiones

`pricing-v3-credit-catalog/1` + `pricing-v3-credit-budget/1`: cada proveedor usa unidad/currency/plan/packs propios.
Higgsfield base reportada139USD/3000créditos; Magnific40EUR/45000créditos. Presupuesto mensual distingue
`subscriptionCreditsAllocated`, `subscriptionCreditsAvailable`, consumo requerido, `purchaseDate`, `useBy`,
plan activo y repetición de packs permitida. No inventar crédito remanente ni fungibilidad entre proveedores.
El planner minimiza caja de packs discretos para cubrir déficit; atribuye costo base proporcional a créditos
presupuestados y **costo completo del pack extra**, muestra sobrantes/validez. Costo atribuido y nueva caja son
cifras separadas. Higgsfield extra90días; Magnific3años con suscripción activa según captura conservada, pendiente
reconfirmar condiciones/precios cuando corresponda. No habilitar recarga automática ni comprar paquetes.

Notion AI credits son componente explícito separado; no equivalen automáticamente a los créditos Higgsfield,
Magnific o Studio Credits de Globe. Las capturas no autorizan crear equivalencia monetaria de Studio Credits.

Provisiones Assurance/operación/onboarding deben costear actividades reales, no porcentaje residual para cuadrar
precio. `trial-*` de la baseline son placeholders no medidos. Fee genérico de plataforma del Excel (ETG-017) queda
separado de tools y sin marcaDeel; verificar coberturas laborales/EOR para evitar duplicar cargas/plataforma.
El costo de persona del Consultor HubSpot, como el de todo perfil, viene del Excel: el monto está confirmado por su
autor y, desde el catálogo v5, declarado como costo en Chile; para una persona en otro país se ajusta por el factor
de talento (estimado) y no es un costo local verificado. El monto se lee con `catalog search --kind cost --current`;
no se copia a documentos.

## Precio, evidencia, redacción y mantenimiento

Kernel Decimal separa factor de talento (costo/localización) del factor de mercado (precio/disposición de pago);
desde el catálogo v5 ambos tienen valores por país
([delta 2026-10-11](#país-del-cliente-y-de-la-persona-delta-2026-10-11)).
No multiplicar todo indiscriminadamente: humanPrice aplica policy y mercado; recursos tienen sus propias reglas.
`markup`: costo×(1+tasa); `target_margin`: costo/(1−tasa). Margen real=(neto−costo)/neto. No llamar margen a markup,
ni confundir descuento, IVA, FX, setup y costo mensual. FX exige par/dirección/fecha/fuente explícitos; EUR no se
convierte por tasa mental. Redondeo y reconciliación pertenecen al kernel, no al agente o consumer.

`commercialUnit=role_capacity` describe capacidad; `managed_service` conserva funciones/personas como costo
interno y preview agrega fee por periodo más implementación. No vende horas automáticamente ni valida SOW,
entregables, aceptación, límites, responsabilidades, resultados garantizados o renovación del servicio.
`assess` añade gaps por salario/coberturas, provisiones, acceso/capacidad, usuario, impuestos/entidad, alcance y
aprobación. Siempre `requires_review`, `binding=false`. Sus40%/35% son propuestas **no aprobadas**; nunca sustituyen
el piso vigente de una práctica (Creative Studio mantiene45% aprobado) ni decisiones por caso. Además reporta el
veredicto del kernel sobre el piso de la política: un gap `MARGIN_BELOW_POLICY_FLOOR` por línea marcada y
`margin.policyFloor.linesBelowFloor`. `assess` nunca aprueba una excepción.

`explain` usa el artefacto interno congelado y expone componentes/fuentes: no se entrega al cliente tal cual.
`preview` es proyección allowlist JSON/Markdown sin stack de costos/márgenes/providers/IDs internos/país del talento;
sus importes derivados conservan la escala de la moneda (CLP sin decimales).
Permanece simulación local no vinculante. Replay primero verifica digest y equivalencia con motor registrado;
ninguna de esas operaciones emite cotización, maker-checker, CRMwrite, factura, contrato o mensaje.

Mantenimiento monetario usa change-set `add/replace/retire`, fuente/vigencia/actor/motivo, `baseDigest`,
`nextVersion`; `catalog preview` con impacto de briefs y `catalog apply --confirm previewDigest --out sucesor.json`.
Reglas de redondeo (`price_rounding`) y FX de cotización son registros de ese catálogo y cambian por la misma vía;
el valor lo decide el operador. Pasos y ejemplo real (`rounding-fx-confirmed-costs.change.json`, v3 → v4) en
[«Cambiar el redondeo o el FX de cotización»](../../../../docs/manual-de-uso/finance/catalogo-v3-seleccion-y-actualizacion.md#cambiar-el-redondeo-o-el-fx-de-cotización).
Factores de país (`talent_factor`, `market_factor` con `floorBasis` opcional) y costo específico de un perfil en un
país (`cost` con `localization.kind: "specific"`): misma vía, ejemplo real `country-factors.change.json` (v4 → v5) en
[«Cambiar un factor de país o registrar el costo de un perfil en un país»](../../../../docs/manual-de-uso/finance/catalogo-v3-seleccion-y-actualizacion.md#cambiar-un-factor-de-país-o-registrar-el-costo-de-un-perfil-en-un-país).
Policy/packs usan `pricing-v3-resource-change/1` con `kind=policy|credits`, baseDigest, motivo y `replacement`
**completo válido**. `resources inspect --current` devuelve los digests; `resources preview|apply` cargan las tres
bases con `--current` y reciben `--impact`, array de demandas. Confirmación ata catálogo/policy/créditos (`contextDigests`), base,
sucesor, motivo e impactos; cambiar cualquiera invalida preview. Un costo confirmado cambiado no puede heredar
la fuente anterior; packs modificados exigen nueva evidencia. Apply escribe sucesor local, no mueve el puntero ni
repricea cotizaciones previas. El sucesor queda vigente cuando se mueve el puntero
([pasos](#mantenimiento-versión-nueva-y-puntero-delta-2026-10-11)); las cotizaciones anteriores conservan replay.
Mantenimiento no es contrato de indexación al cliente ni monitor automático.

Si una versión emitida resultó mala, se corrige con otra versión; para cotizar mientras tanto con la anterior se
nombran sus rutas a mano y se dice. Conservar sucesores/artefactos como evidencia. Sin `--current` ni `--catalog`,
la CLI mantiene la baseline predeterminada histórica: no suponer que usa el catálogo operativo. Promoción API/UI/MCP requiere ADR/cutover, datos aprobados, adapters canónicos, permisos,
tenancy, audiencias, snapshots/lifecycle/idempotencia, prueba de paridad, rollout/readback y rollback propios.
No crear fórmulas o autoridad independientes en cada consumer ni dar por desplegado el prototipo local.

## Servicio gestionado por volumen (delta 2026-10-10)

Para un servicio que se dimensiona por volumen (social care, soporte, producción recurrente) usar las versiones
vigentes con `--current` (bandeja = Sprout Social Advanced por asiento) y la oferta de la práctica que lo entrega:
`creative-managed-service` (creativa) o `seo-aeo-managed-service` (SEO/AEO); ejemplo completo, con la oferta
creativa, en `data/pricing/v3-operating/managed-care.*` y pasos en el manual
(«Cotizar un servicio gestionado por volumen»). Ese ejemplo (cliente y equipo en Chile) da CLP 9.530.000 al mes, sin
líneas bajo el piso; el mismo servicio para un cliente y un equipo en Colombia está en `managed-care-colombia.*`.

- **Dedicación desde el volumen:** `pricing:v3 compose workload --input workload.json [--brief brief.json --out nuevo.json]`
  (`pricing-v3-workload/1`). Driver = unidades/mes × minutos; más horas fijas y horas de presencia por línea. La
  dedicación es el mayor entre trabajo/horas productivas y presencia/horas contratadas, redondeada hacia arriba.
  Cuotas de cada driver y bloque fijo suman 1. Exit 0 listo, 2 falta input (`LINE_OVER_CAPACITY` pide decidir dotación).
  No escribir la dedicación a mano si hay volumen declarado; no leer el resultado como dotación comprometida.
- **Receta del perfil que no aplica:** `work[].excludedProfileTasks: [{ task, reason }]`. Nunca editar la receta ni
  declarar una herramienta que el servicio no usa para «pasar» la validación. Sólo se excluye lo que la receta agrega.
- **Piso de margen:** la política `creative-managed-service` usa `target_margin` 0,45 y `minimumMargin` 0,45 en los
  32 perfiles. Decidido por el CEO el 2026-10-10: 45 % es el piso de margen de los servicios gestionados; un servicio
  donde se puede ganar más sube su objetivo en su propia política, no el piso. Así lo hace
  `seo-aeo-managed-service` (servicios gestionados de la práctica SEO/AEO, catálogo v8, `quoteDate` ≥ 2026-10-11):
  `target_margin` 0,55 —extremo bajo de la banda 55–60 % de esa práctica, propuesto por el agente y confirmado por
  el CEO el 2026-10-11— con `minimumMargin` 0,45, aprobado el 2026-07-13 (`confirmed`); el ejemplo con esa oferta
  calcula a 55,07 %. Un programa SEO/AEO no se cotiza con la oferta creativa. `talent-assurance-staffing` (una
  persona vendida por dedicación, staff augmentation) tiene desde el catálogo v7 `minimumMargin` 0,25 —piso decidido
  por el CEO el 2026-10-11— y objetivo 0,30/0,30/0,35/0,40 por tier, propuesto por el agente y confirmado por el CEO
  el mismo día (`confirmed`); antes de
  esa fecha rige el recargo histórico sin piso. No usarla para un servicio gestionado ni bajar un piso para que un
  precio pase: un neto bajo el piso sale `MARGIN_BELOW_FLOOR` y se informa. `assess` mantiene sus 40/35 como
  propuestas no aprobadas.
- **Kit y provisiones:** `kitId: "managed-service-core"` en cada línea; provisiones opcionales por `choices`
  (`provision-backfill-coverage`, `provision-on-call-alert-guard`), declaradas en una sola línea. Son estimaciones.
- **Consumo de agentes:** `serviceToolIds: ["agent-runtime-usage"]` + asignación con cantidad = bloques de 1.000 ítems
  al mes. Hipótesis sin medir. La bandeja (`social-inbox`) lleva el precio público de Sprout; plan contratado,
  asientos y quién paga siguen sin confirmar.
- **Lo que la CLI aporta y un cálculo a mano no:** herramientas base y licencias mínimas con su costo (Notion,
  Microsoft 365), fee de contratación completo por persona, FX de cotización y redondeo comercial. Por eso el precio
  se saca de la CLI.
- **Costos de persona:** los 32 registros están confirmados por su autor (el CEO, 2026-10-10) con los montos del Excel
  y, desde el v5 (2026-10-11), declarados como el costo de cada perfil en Chile: no pedir los montos otra vez. Con
  `quoteDate` 2026-10-11 o posterior ya no salen `ESTIMATED_SOURCE` por esos costos, el supuesto
  `UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY` ni, en `assess`, `HUMAN_COST_EVIDENCE_REQUIRED`. Si alguno aparece, la demanda
  está fechada antes (caso de `managed-care.demand.json`, 2026-10-10) y no recibió factores de país.
- Brechas abiertas en `operational-gaps.json`: provisiones sin medir, consumo sin medidor, bandeja sin contratar,
  setup no paramétrico, factores de país sin validar (`COUNTRY_FACTORS_UNVALIDATED`), costo específico por perfil y
  país donde se aparte del factor (`LOCALIZED_TALENT_COSTS`; la base de costo quedó decidida), revisión del FX de
  cotización con CLF y EUR sin decidir (`QUOTE_FX_REVIEW`), múltiplos de redondeo para otras monedas u ofertas
  (`COMMERCIAL_ROUNDING_SCOPE`) y revisión de precios unitarios de herramientas (`UNIT_PRICE_REVIEW`). El alcance
  del piso (`MARGIN_FLOOR_SCOPE`) quedó decidido.

## Resumen, piso y precio acordado (delta 2026-10-10)

Campos del resumen y qué hacer con cada uno: manual,
[«Leer el resumen»](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#leer-el-resumen). Aquí
sólo las reglas de lectura. Desde el motor 1.1 y el catálogo v4 (mismo día, más tarde) el precio acordado y el
redondeo ocurren dentro del motor.

- **Bloqueo o señal:** `diagnostics` son los bloqueos, completos; si no está vacío → `needs_input`, `totals: null`,
  exit 2, sin precio. `reviewSignals[]` agrupa los diagnósticos de periodo por código y severidad; no bloquean
  totales, pero cada código presente se explica. `reviewStatus` de la composición siempre es `requires_review`.
- **Margen:** leerlo de `totals` / `marginRateRoundedDown` (6 decimales, hacia abajo). No recalcularlo a mano.
- **Claves del motor 1.1:** `engineVersion`, `commercialAdjustments` (los ajustes del brief) y `priceRounding`
  (`{ currency, multiple, scope: 'offer'|'general', offerId, recordId, revision, sourceStatus }` o `null`). `totals`
  suma `roundingAdjustment` y `uplift` sólo en una cotización 1.1.0; `net = undiscountedPrice + uplift − discount` y
  `undiscountedPrice` ya incluye el redondeo. `explain.commercialAdjustments.rows` trae el recorrido por fila;
  `compose preview` y la proyección cliente muestran sólo el neto final.
- **Versión del motor:** conviven tres contratos. Una cotización usa 1.2.0 sólo si el factor de mercado del país del
  cliente declara `floorBasis`; 1.1.0 si necesita un neto acordado, varios ajustes o una regla de redondeo para su
  moneda; si no, 1.0.0. El agente no la elige: se lee en `engineVersion`.
- **Redondeo por moneda:** registros `price_rounding` del catálogo (desde el v4), una regla general por moneda para toda oferta:
  CLP 10000, USD 10, PEN 50, COP 50000, MXN 100 (`catalog search --kind price_rounding --current --date <fecha>`).
  Cada fila facturable sube al múltiplo siguiente antes de los ajustes; nunca baja; una fila que cumplía su piso
  antes de redondear lo sigue cumpliendo. Una regla con `offerId` prevalece sobre la general. Moneda sin regla: no se
  redondea.
- **Línea bajo el piso:** con `priceRounding` presente, una línea en `marginFloor.lines[]` es un **incumplimiento
  real** (un neto acordado o un descuento la dejó bajo el piso de su mercado): requiere decisión del operador. La
  lectura «fracciones = redondeo» vale sólo cuando `priceRounding` es `null`: cotizaciones congeladas sobre catálogos
  anteriores (`engineVersion` `pricing-v3-local/1.0.0`) o una moneda sin regla. Lo inverso ya no vale en todo
  mercado: con `marketFactor.floorBasis` (Colombia, Perú) «ninguna línea marcada» no significa margen ≥ piso
  ([delta 2026-10-11](#país-del-cliente-y-de-la-persona-delta-2026-10-11)).
- **Otra moneda:** `brief.outputCurrency` = CLP, USD, COP, MXN o PEN, en una **copia** de la demanda (no editar la
  versionada). USD es la moneda de referencia: costos en USD, conversión al final con el FX de cotización del
  catálogo, que es política del CEO con margen prudencial y no tipo de cambio de mercado (USD→CLP 1000, COP 3650,
  MXN 19.25, PEN 3.70). Cada moneda redondea a su múltiplo, así que la misma oferta en dos monedas no es una
  conversión exacta: cotizar en la moneda pedida, nunca convertir a mano. Sin FX de salida (EUR u otra) →
  `needs_input` con `MISSING_CATALOG_SELECTION` en `fx.USD:<moneda>`: **no se emite una cotización en EUR** (no hay
  USD→EUR ni múltiplo); España se cotiza en USD. CLF calcula sin redondeo y con un FX estimado de 2025: no
  presentarlo. Herramienta con precio en EUR: la demanda nombra `fx:EUR:USD` en `fxRecordIds` (FX de cotización
  `1.20` desde 2026-10-11, `estimated`, propuesto por el agente con el margen prudencial del operador; no decidido de
  forma explícita para EUR). Con el registro de un solo día `fx:EUR:USD:ECB:2026-10-09` en una fecha posterior →
  `RESOURCE_FX_SELECTION_REQUIRED`. Detalle y cifras:
  [«Cotizar en otra moneda»](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#cotizar-en-otra-moneda).
- **Registrar el precio acordado:** el precio real pasa por el motor, declarado directo en `brief.adjustments`:
  `{ "adjustmentId", "kind": "agreed_net", "amount", "billing": "monthly"|"setup", "lineIds": [líneas del brief], "reason" }`.
  `amount` = neto de las filas de esa clase de esas líneas, **por periodo**, en la moneda de salida, como cadena y
  sin más decimales que la moneda. El motor deriva `discount` (acordado bajo el precio) o `uplift` (sobre el precio)
  y cae en el monto exacto. Hasta 10 ajustes, a lo más uno por fila facturable (un `discount` toma filas mensuales y
  de implementación de sus líneas); `reason` obligatorio; `setup` rige sólo en periodos con filas de implementación.
  **NUNCA** calcular una tasa a mano para llegar a un precio: el `discount` con tasa `1 − neto ÷ precio` sólo sirve
  para leer artefactos anteriores al motor 1.1. Mal declarado → exit 2 con el código en `diagnostics`:
  `OVERLAPPING_ADJUSTMENTS`, `INVALID_AGREED_AMOUNT`, `AGREED_NET_WITHOUT_BASE`, `DUPLICATE_ID`,
  `INVALID_ADJUSTMENT_LINE`; un documento que no cumple el schema sigue siendo `SCHEMA_INVALID` (exit 1). Después:
  comprobar `totals.net`, `compose quote --out` nuevo + resumen + `assess` junto al expediente. Pasos y JSON en el
  manual
  ([«Registrar el precio acordado»](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#registrar-el-precio-acordado)).
- **Caso SKY social care 2027** (v4 + v5): precio calculado CLP 5.430.000 (9.855 de redondeo), `agreed_net` 4.990.000
  → descuento derivado 440.000, neto exacto, margen `0.402589`, tres líneas marcadas, CLP 236.579/mes bajo el piso.
  Archivos `acordado-neto.*` y
  [nota de la excepción](../../../../docs/commercial/prospects/sky-social-care-2027/pricing/EXCEPCION-PISO-2026-10-10.md).
  Los `acordado.*` anteriores (tasa 0,0793605, catálogo v3, motor 1.0.0) siguen válidos y reproducibles.
  `final.artifact.json` de ese expediente contiene el precio sin el acuerdo.
- **Quién decide:** el operador es CEO y dueño; márgenes, pisos, precios, cifras comerciales (FX de cotización,
  múltiplos) y excepciones al piso son su decisión. El agente le lleva el margen real del motor y una recomendación,
  y registra la excepción con su motivo junto al artefacto; no la aprueba, no la da por implícita ni usa el redondeo
  o un ajuste para «cumplir» un piso. Confirmado 2026-10-10: 45 % es el piso de los servicios gestionados y un
  servicio que puede ganar más sube su objetivo, no el piso; la política queda 0,45/0,45; SKY es excepción aprobada
  por ser cliente vigente. No usar el precio de SKY como referencia de margen para otro cliente. Confirmado
  2026-10-11: 25 % es el piso de una persona vendida por dedicación y de ahí sube según el caso (objetivos 30/35/40
  por tier, confirmados); y SEO/AEO lleva oferta propia con objetivo 55 % y piso 45 %.
- **Abierto** ([`operational-gaps.json`](../../../../data/pricing/v3-operating/operational-gaps.json)):
  `QUOTE_FX_REVIEW`, `COMMERCIAL_ROUNDING_SCOPE`, `COUNTRY_FACTORS_UNVALIDATED`, `LOCALIZED_TALENT_COSTS`, provisiones
  estimadas y consumo de agentes sin medir. `MARGIN_FLOOR_SCOPE` quedó decidido; `FLOOR_PRICE_ROUNDS_UNDER_FLOOR` y `AGREED_PRICE_OUTSIDE_ENGINE` se
  resolvieron y salieron del ledger. No decidido a propósito: redondear sobre el total del periodo en vez de por
  fila, terminaciones comerciales como 990.000 (hoy es un neto acordado) y múltiplos para CLF y EUR. No resolverlos
  en una cotización.
- Sin cambio: códigos de salida, flags, contrato de errores y escritura exclusiva. El contrato 1.0.0 no se movió:
  todo artefacto congelado se sigue reproduciendo con `replay` (`verified: true`).

## País del cliente y de la persona (delta 2026-10-11)

Valores, tabla de resultados, comandos y lectura para el operador: manual,
[«Cotizar según el país del cliente y del equipo»](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#cotizar-según-el-país-del-cliente-y-del-equipo).
Decisión: delta 2026-10-11 del ADR motor 1.1. Aquí sólo las reglas.

- **Dos ejes, dos campos, dos hechos.** `brief.offerMarketCountry` = país del cliente → factor de mercado sobre el
  **precio de la parte humana** (herramientas y fees no). `brief.lines[].talentCountry` = país de cada persona, por
  línea → factor de talento sobre el **costo** (costo en Chile × factor), y de ahí el precio. No deducir uno del otro
  ni de `outputCurrency`: país fija factores; moneda fija FX y redondeo. Países registrados: CL, CO, PE, MX, US, ES.
- **Valores vigentes** (rigen con `quoteDate` ≥ 2026-10-11). Talento respecto de Chile: CL 1; CO 0.80, PE 0.85,
  MX 0.90, ES 3, US 5 — los cinco **estimados** y propuestos por el agente, uno por país para todo perfil; siguen
  estimados por elección del operador, no es una decisión que deba. Mercado: CL 1, CO 0.90, US 1.10 **decididos**
  por el CEO; PE 0.95, MX 1, ES 1.10 **estimados**. Un factor estimado sale en `reviewSignals` como `ESTIMATED_SOURCE`
  (`paths` `snapshot.talentFactors` / `snapshot.marketFactors`): decirlo al presentar el precio. No citar estos
  valores de memoria: `catalog search --kind talent_factor|market_factor --current --date <fecha>`.
- **El piso acompaña al factor en CO y PE.** Su `market_factor` declara `floorBasis: "base_market"`: el piso se lee
  sobre el precio del mercado base, la cotización se firma con `pricing-v3-local/1.2.0` y al precio de política **no
  sale marcada aunque el margen real quede bajo 45 %** (CO ≈ 41 %, PE ≈ 43 %). `marginRateRoundedDown` es siempre el
  margen real: es el que se informa. **NUNCA** presentar el 45 % del mercado base como margen de la cotización ni leer
  «cero líneas marcadas» como «sobre el piso» en esos mercados.
- **Rebaja adicional en CO/PE:** la línea marcada trae `floorNet` (neto mínimo en ese mercado) y `netShortOfFloor`
  (lo que falta), con `marginAmountShortOfFloor: null`. En los demás mercados sigue `marginAmountShortOfFloor`.
- **Claves nuevas del resumen:** raíz `marketFactor` `{ country, factor, floorBasis, recordId, revision, sourceStatus }`
  sólo si cambia algo (factor ≠ 1 o `floorBasis`); ausente con cliente CL o MX. `totals.marketAdjustment` sólo en
  1.2.0. `assess` repite el factor en `margin.policyFloor.marketFactor`. `compose preview` y la proyección cliente
  siguen mostrando sólo el neto final.
- **Comprobar que el país entró:** `marketFactor` con el país esperado y `assumptions` sin
  `UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY`. Si aparece ese supuesto, la demanda está fechada antes del 2026-10-11.
  El resumen de `compose prepare|quote` trae además `runNotices.laterCatalogValues` cuando la demanda está fechada
  antes de valores más nuevos del catálogo: en una cotización nueva significa corregir `quoteDate`.
- **País sin factor:** exit 2, `MISSING_CATALOG_SELECTION` en `lines.<lineId>.talentFactor` o en `offerMarketCountry`
  (en el carril `calculate` el kernel lo llama `MISSING_TALENT_FACTOR`). No sustituir por otro país: se agrega al
  catálogo con decisión del operador.
- **Costo específico antes que factor:** si el costo objetivo de un perfil en un país se aparta del costo de Chile ×
  factor, se registra como `cost` con `localization: { kind: "specific", country }`; para ese perfil y ese
  `talentCountry` reemplaza al costo de Chile × factor y no recibe factor. Es un costo objetivo que decide el
  operador, no la nómina de una persona. Plantearlo sobre todo con equipo en ES o US (factores 3 y 5 son órdenes de
  magnitud). No «corregir» un costo moviendo el factor del país ni el factor de mercado.
- **Tipo de cliente** (pyme, licitación pública, cliente estratégico): existe en el Excel, no en el cotizador. Se
  registra como `agreed_net` con su motivo.
- **España:** país registrado, sin regla de redondeo ni FX USD→EUR: no se emite cotización en EUR; se cotiza en USD.
- **Quién decide:** factores, `floorBasis` por mercado y excepciones son del operador (CEO). Confirmado 2026-10-11:
  precio sigue al país del cliente, costo al país de la persona, y en mercados bajo 1 el piso acompaña al factor;
  45 % sigue siendo el piso de los servicios gestionados en el mercado base. **NUNCA** declarar `floorBasis` ni mover
  un factor sin su decisión.

## Avisos de la corrida, exposición a estimados y base de costo (delta 2026-10-11)

Tablas, ejemplos y comandos:
[«Leer el resumen»](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#leer-el-resumen) y
[«Un precio unitario no vence»](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#un-precio-unitario-no-vence).
Aquí las reglas.

- **`runNotices`** (sólo en el stdout de `compose prepare|quote`; ausente si no hay nada que avisar; **no** está en
  el artefacto ni en `replay`). Hasta dos miembros: `laterCatalogValues`
  `{ quoteDate, newestEffectiveFrom, records, byKind }` —la demanda está fechada antes de valores más nuevos del
  catálogo— y `priceDates` `{ withinDays, reviewDue, dueSoon, expired }` —fechas de los precios, registros y
  proveedores que esta cotización usa—. **Nunca bloquea** ni cambia exit, estado o totales. **Siempre se informa al
  operador junto al resultado.** `laterCatalogValues` en una cotización nueva = `quoteDate` atrasado: corregir y
  volver a correr.
- **Un precio unitario no vence** (decisión del CEO, 2026-10-11): el precio de una suscripción es estable; lo que
  cambia es cuántas licencias se contratan, y eso se declara en cada cotización. Policy v6: los 25 precios de
  herramientas con `effectiveUntil` 9999-12-31 y `reviewBy` 2027-04-11. `reviewBy` (opcional, por precio) avisa,
  nunca bloquea y nunca cambia un resultado; la fecha a seis meses la eligió el agente, no el operador. Un precio
  cambia **sólo** emitiendo una versión nueva de la policy. 23 de los 25 siguen marcados `estimated`; la mayoría
  es precio público de lista.
- **`priceReview`** en `resources inspect --current --date <fecha>`: `{ withinDays, reviewDue, dueSoon, expired }`.
  `reviewDue` = revisiones ya pasadas (recordatorio); `dueSoon` = revisiones o vigencias duras dentro de 30 días;
  `expired` = vigencias duras ya pasadas, que sí bloquean (`blocksWith` nombra el diagnóstico). Hoy `expired` trae
  sólo `fx:EUR:USD:ECB:2026-10-09`, la referencia de un día que `fx:EUR:USD` reemplaza para fechas posteriores.
- **`estimateExposure`** (resumen; también en `replay`; `null` si la cotización quedó bloqueada): derivado del
  resultado congelado, nada se recalcula. `estimatedCost` + `confirmedCost` = `totalCost`; `estimatedShareOfCost`;
  `costInputs[]` ordenado por `costAtRisk` (costo que depende de ese dato), con `shareOfCost` (÷ costo total) y
  `marginRateLostIfTenPctHigher` (= 0,10 × `costAtRisk` ÷ `net`: margen perdido si el dato resulta 10 % más alto y
  el neto no cambia). `priceInputs[]` = factor de mercado estimado (mueve precio, no costo); `estimatedRules[]` =
  políticas estimadas que son reglas, fuera del ranking. Los `costAtRisk` pueden sumar más que `estimatedCost`: un
  componente puede depender de dos datos.
- **Qué hacer con la exposición:** decirle al operador qué parte del costo es estimada y **qué dato confirmar
  primero**, con su efecto en puntos de margen. Es una lectura de sensibilidad: no es pronóstico, validación ni
  aprobación, y no se usa para «corregir» un dato. `compose assess` da el mismo orden en `costEvidencePriority`
  `{ currency, estimatedCost, confirmedCost, estimatedShareOfCost, confirmFirst }` (`confirmFirst` = los cinco
  primeros `costInputs`); `assess` no lista un factor de país estimado entre sus `gaps`, pero sí aparece ahí.
  Ejemplo (`managed-care-colombia`, COP 28.100.000, margen real 41,5 %): 98,7 % del costo es estimado; el factor de
  talento CO sobre CL lleva 64,7 % del costo y 3,8 puntos de margen por cada 10 %; la bandeja Sprout, 17,7 % y 1,0.
- **Base de costo = costo objetivo, no nómina** (decisión del CEO, 2026-10-11). Los costos de persona vienen del
  Excel de pricing y son el nivel de sueldo que el CEO quiere alcanzar para el equipo; no quiere que el cotizador use
  la nómina real. La nómina actual está bajo ese costo: el margen real de hoy sobre personas es **mayor** que el que
  muestra el cotizador. No proponer «conectar la nómina real», no llamar al costo del catálogo «lo que Efeonce paga»,
  no escribir el sueldo de una persona en ningún archivo.

## Mantenimiento: versión nueva y puntero (delta 2026-10-11)

Pasos completos, flags y problemas:
[«Versiones vigentes: el puntero»](../../../../docs/manual-de-uso/finance/catalogo-v3-seleccion-y-actualizacion.md#versiones-vigentes-el-puntero-currentjson).

1. Preparar el cambio sobre la base vigente: `baseDigest` = `digest` de `catalog validate --current` (catálogo) o
   `policyDigest`/`creditCatalogDigest` de `resources inspect --current --date <fecha>` (policy/créditos).
2. `catalog preview --current --input cambio.json` o `resources preview --current --input cambio.json`; mostrar el
   preview al operador. Los valores los decide él.
3. Con su confirmación, emitir: `catalog apply|resources apply --current --input cambio.json --confirm <previewDigest>
   --out <carpeta>/<familia>.review-vN.json` (número siguiente; catálogo y policy en `data/pricing/v3-operating/`,
   créditos en `data/pricing/v3-resources/`). `apply` no mueve el puntero.
4. Probar el sucesor antes de dejarlo vigente: `compose prepare --catalog <sucesor> --current --input <demanda>`
   (la opción escrita gana), un caso por país, moneda u oferta tocada. Un registro de factor duplicado pasa `preview`
   y `apply` y recién bloquea al cotizar con `AMBIGUOUS_SELECTION` en `lines.<lineId>.talentFactor`.
5. Mover el puntero: `current show` → copiar `pointerDigest` →
   `current set --catalog A --policy B --credits C --reason "…" --confirm <pointerDigest>`. Las tres rutas van
   escritas y dentro del repo (`current set` no acepta `--current`); versión y digest los calcula la CLI.
   `--out otro.json` escribe el puntero en otra ruta para revisarlo (`current show --input otro.json`). Digest
   equivocado → `CURRENT_VERSIONS_CONFLICT`; sin `--confirm` al reemplazar → `MISSING_ARGUMENT`.
6. Verificar: `current show` exit 0 con `consistent: true` (exit 2 si no; `status` por fuente: `match`,
   `version_mismatch`, `digest_mismatch`, `invalid`, `unreadable`) y `pnpm pricing:v3:test` verde. Una guarda exige
   que el puntero nombre la versión de número más alto de cada carpeta: emitir sin mover el puntero la deja en rojo.

No editar `current.json` a mano, ni editar o borrar una versión anterior: los artefactos congelados dependen de ellas.

## Nunca

- Nombrar versiones a mano en una cotización nueva, o saltarse `CURRENT_VERSIONS_MISMATCH` con rutas escritas.
- Callar `runNotices`, o leerlo como bloqueo.
- Presentar `estimateExposure`/`costEvidencePriority` como validación o pronóstico.
- Proponer conectar la nómina real, llamar al costo del catálogo «lo que Efeonce paga» o escribir el sueldo de una
  persona.
- Emitir u ofrecer una cotización en EUR, o convertir a mano entre monedas.
- Usar el precio de SKY o su margen como referencia para otro cliente; presentar los 40/35 de `assess` como piso. La
  norma es el piso de 45 % en servicios gestionados y de 25 % en una persona por dedicación.
- Decidir cifras comerciales (márgenes, pisos, precios, FX de cotización, múltiplos, factores, `floorBasis`,
  excepciones): son del operador (CEO). Atribuirle lo que propuso el agente: la fecha de revisión 2027-04-11, el FX
  EUR→USD 1.20 y los factores de talento estimados.
- Calcular una tasa a mano para llegar a un precio, o usar redondeo, ajuste o fecha para «cumplir» un piso.
- Emitir una versión sin mover el puntero; editar un archivo versionado o un artefacto congelado.
- Tratar una simulación calculada como costo validado, asignación live, aprobación de precio o cotización emitida.

## Mapa de implementación y evidencia reusable

| Responsabilidad | Fuente vigente |
| --- | --- |
| Kernel puro, markup/margen, factores de talento y de mercado, coberturas, FX, rounding; contratos 1.0.0/1.1.0/1.2.0, ajustes (`discount`, `agreed_net`), redondeo comercial, piso sobre el mercado base (`floorBasis`, `floorNet`) y registro de motores | `src/lib/finance/pricing-v3/calculate.ts`, `schemas.ts` |
| Registro cerrado de rechazos (dominio y adaptador) | `src/lib/finance/pricing-v3/errors.ts` |
| Registros (incluye `price_rounding`, `talent_factor`, `market_factor` con `floorBasis`, `cost` con `localization`)/brief/resolución/quote/explicación; selección de costo específico o de referencia con factor, elección del contrato por cotización y recorrido del precio por fila | `src/lib/finance/pricing-v3/catalog/{contracts,catalog,resolve,quote,explain}.ts` |
| Demanda/policy y atribuciones | `src/lib/finance/pricing-v3/resources/{composition-contracts,composition}.ts` |
| Packs/costo base/caja/caducidad | `src/lib/finance/pricing-v3/resources/credit-budget.ts` |
| Discovery/scaffold/portfolio/plan | `src/lib/finance/pricing-v3/resources/operating.ts` |
| Volumen → dedicación (`compose workload`) | `src/lib/finance/pricing-v3/resources/workload.ts` |
| Resumen derivado (`compose prepare`, `compose quote`, `replay`): líneas bajo el piso (`floorNet`, `netShortOfFloor`), `engineVersion`, `commercialAdjustments`, `priceRounding`, `marketFactor`, `estimateExposure` | `src/lib/finance/pricing-v3/resources/summary.ts` |
| Fechas de precios: `priceReview` de `resources inspect` y `runNotices.priceDates`; `reviewBy` en el contrato de la policy | `src/lib/finance/pricing-v3/resources/price-review.ts`, `composition-contracts.ts` |
| Puntero de versiones vigentes: schema, verificación, `--current`, `current show|set` | `src/lib/finance/pricing-v3/adapters/current-versions.ts`, `data/pricing/v3-operating/current.json` |
| Gaps económicos, `costEvidencePriority`, veredicto del piso por línea (con `marketFactor`) y proyección comercial redactada | `src/lib/finance/pricing-v3/resources/readiness.ts` |
| Snapshots/digests/IO/mantenimiento local | `src/lib/finance/pricing-v3/adapters/{local-snapshot,catalog-local,resource-composition,resource-maintenance}.ts` |
| Adapter CLI, flags, exit, clasificación de errores, escritura exclusiva y `runNotices` | `scripts/commercial/pricing-v3.ts` |
| Guarda permanente: replay de todo artefacto congelado (`data/pricing/**` + SKY `acordado*`) | `src/lib/finance/pricing-v3/__tests__/pricing-v3-frozen-artifacts.test.ts` |
| Guarda permanente: el puntero nombra la versión de número más alto de cada carpeta | `src/lib/finance/pricing-v3/__tests__/pricing-v3-current-versions.test.ts` |
| Regresiones y negativos | `src/lib/finance/pricing-v3/__tests__/`, `pnpm pricing:v3:test` |

Versionar y conservar originales: `data/pricing/v3-catalog/` y `v3-composition/` son fixtures previas; sucesores y
casos operativos están en `v3-operating/`, créditos en `v3-resources/`. No convertir fixtures, synthetic access o
`portfolio.example.json` en default de cartera. `historical-resource-index.json` conserva26filas del Excel:
25tools y fee de plataforma; tools registradas no equivalen a todos los planes/precios actuales confirmados.
`operational-gaps.json` conserva owner/acción de costos salariales, factores de país, provisiones, asignación/acceso,
licencia, margen, impuestos y SOW. Cerrar esos gaps con evidencia; no inferirlos del número de pruebas o de un commit.

Las fuentes y cambios locales no acreditan adopción API/UI/MCP, sincronización remota, aprobación económica,
inventario, persistencia o emisión. Si se cambia la arquitectura o un contrato, actualizar su dueño en docs,
sincronizar este router/referencia y mirrors y correr los gates proporcionales; evitar duplicar spec en skills.
