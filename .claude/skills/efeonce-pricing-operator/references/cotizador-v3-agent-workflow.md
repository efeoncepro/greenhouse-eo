# Cotizador V3: contrato operativo para agentes

Referencia load-on-demand compartida Codex/Claude. Estado verificado 2026-10-09: prototipo local opt-in;
catálogo, kernel Decimal, mantenimiento, créditos, composición y flujo operativo implementados; desde 2026-10-10,
motor 1.1 (precio acordado, redondeo comercial) y catálogo v4 con cotización en CLP, USD, COP, MXN y PEN. El canon de
cotizaciones Greenhouse conserva autoridad, permisos y lifecycle. Esta referencia interpreta sus contratos;
los schemas y primitives de `src/lib/finance/pricing-v3/` calculan.

## Entrada y fuentes dueñas

- [Manual operativo](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md): secuencia completa y comandos.
- [Data operativa](../../../../data/pricing/v3-operating/README.md): catálogo monetario/policy sucesores, casos y evidencias.
- [Selección y actualización monetaria](../../../../docs/manual-de-uso/finance/catalogo-v3-seleccion-y-actualizacion.md).
- [Composición](../../../../docs/manual-de-uso/finance/componer-cotizacion-v3-con-herramientas.md) y
  [créditos](../../../../docs/manual-de-uso/finance/presupuestar-creditos-ia-v3.md).
- [Mantenimiento](../../../../docs/documentation/finance/cotizador-v3-mantenimiento-catalogo.md): owners, vigencia y cadencia.
- [ADR operativo](../../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md),
  [ADR motor 1.1](../../../../docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md)
  (precio acordado, redondeo comercial, contratos convivientes; 2026-10-10) y
  [promoción futura](../../../../docs/documentation/finance/cotizador-v3-promocion-canonica.md).

Para interpretar un pedido, identificar unidad comercial, variante/seniority/tier, país del talento, mercado del
cliente, dedicación, headcount, duración, tareas, moneda y fecha. Una vacante CRM es señal de necesidad; no acredita
intención de contratar proveedor. Talent Assurance aceptado no aprueba cada salario, fee ni garantía comercial.

El expediente aporta demanda/alcance y evidencias: no reemplaza valores centrales de tools, factores, salario,
provisiones o FX con montos arbitrarios. Excel y `pricing:workbook` sirven para investigación histórica;
V3 no depende de leer el archivo al cotizar. Las escalas de Consultor HubSpot siguen separadas. Una tarea SEO en
Copywriter añade SEMrush cuando corresponde, sin cambiarlo al costo de SEO Specialist.

## Secuencia verificable por CLI

Desde la raíz, seleccionar las tres versiones explícitamente. **Trío vigente para cotizaciones nuevas** (desde
2026-10-10): `catalog.review-v4.json` (`operating-review-2026-10-10-v4`: redondeo por moneda, FX de cotización, 32
costos de persona confirmados) + `resources.review-v5.json` + `ai-credits.review-v1.json`, con `quoteDate` 2026-10-10
o posterior. `catalog.review-v2|v3` y `resources.review-v2…v4` son padres congelados: sus cotizaciones se siguen
reproduciendo igual y sólo se nombran para repetir un ejemplo anterior (`designer.plan.json`, fechado 2026-10-09,
corre con v2 + v2; con el trío vigente devuelve `RESOURCE_POLICY_NOT_EFFECTIVE`).

```bash
pricing_catalog=data/pricing/v3-operating/catalog.review-v4.json
pricing_policy=data/pricing/v3-operating/resources.review-v5.json
pricing_credits=data/pricing/v3-resources/ai-credits.review-v1.json

pnpm --silent pricing:v3 catalog search --catalog "$pricing_catalog" --query consultor
pnpm --silent pricing:v3 resources inspect --catalog "$pricing_catalog" \
  --policy "$pricing_policy" --credits "$pricing_credits" --date 2026-10-10
pnpm --silent pricing:v3 compose scaffold --catalog "$pricing_catalog" \
  --policy "$pricing_policy" --input pedido.json
pnpm --silent pricing:v3 resources portfolio --catalog "$pricing_catalog" \
  --policy "$pricing_policy" --date 2026-10-10 --input cartera.json
pnpm --silent pricing:v3 compose plan --catalog "$pricing_catalog" \
  --policy "$pricing_policy" --credits "$pricing_credits" --input plan.json --out demanda-nueva.json
pnpm --silent pricing:v3 compose quote --catalog "$pricing_catalog" \
  --policy "$pricing_policy" --credits "$pricing_credits" --input demanda-nueva.json --out artefacto-nuevo.json
pnpm --silent pricing:v3 explain --input artefacto-nuevo.json
pnpm --silent pricing:v3 replay --input artefacto-nuevo.json
pnpm --silent pricing:v3 compose assess --input artefacto-nuevo.json
pnpm --silent pricing:v3 compose preview --input artefacto-nuevo.json --format markdown --out preview-nuevo.md
```

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
`INPUT_NOT_FOUND`, `INPUT_NOT_JSON`, `SCHEMA_INVALID`, `OUTPUT_EXISTS`, `OUTPUT_NOT_WRITABLE`. Los conflictos de dominio
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
públicos preservan fuente y ventana interna de revisión; renovar evidencias vencidas antes de una nueva selección.
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
El salario declarado10400USD mensual del Consultor HubSpot viene del Excel: en el catálogo v4 el monto está confirmado
por su autor, sin país declarado; no es un costo local verificado.

## Precio, evidencia, redacción y mantenimiento

Kernel Decimal separa factor de talento (costo/localización) del factor de mercado (precio/disposición de pago).
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
Policy/packs usan `pricing-v3-resource-change/1` con `kind=policy|credits`, baseDigest, motivo y `replacement`
**completo válido**. `resources inspect --credits` devuelve digests; `resources preview|apply` recibe las tres bases
explicitamente y `--impact` array de demandas. Confirmación ata catálogo/policy/créditos (`contextDigests`), base,
sucesor, motivo e impactos; cambiar cualquiera invalida preview. Un costo confirmado cambiado no puede heredar
la fuente anterior; packs modificados exigen nueva evidencia. Apply escribe sucesor local, no activa defaults ni
repricea cotizaciones previas. Cada quote nueva selecciona versión explícita; las anteriores conservan replay.
Mantenimiento no es contrato de indexación al cliente ni monitor automático.

Rollback local: volver a escoger las versiones anteriores para pedidos nuevos; conservar sucesores/artefactos
como evidencia. Sin `--catalog`, la CLI mantiene baseline predeterminada histórica: no suponer que ahora usa el
sucesor operativo. Promoción API/UI/MCP requiere ADR/cutover, datos aprobados, adapters canónicos, permisos,
tenancy, audiencias, snapshots/lifecycle/idempotencia, prueba de paridad, rollout/readback y rollback propios.
No crear fórmulas o autoridad independientes en cada consumer ni dar por desplegado el prototipo local.

## Servicio gestionado por volumen (delta 2026-10-10)

Para un servicio que se dimensiona por volumen (social care, soporte, producción recurrente) usar el trío vigente
`catalog.review-v4.json` + `resources.review-v5.json` (bandeja = Sprout Social Advanced por asiento) y la oferta
`creative-managed-service`; ejemplo completo en `data/pricing/v3-operating/managed-care.*` y pasos en el manual
(«Cotizar un servicio gestionado por volumen»). Ese ejemplo da CLP 9.530.000 al mes, sin líneas bajo el piso.

- **Dedicación desde el volumen:** `pricing:v3 compose workload --input workload.json [--brief brief.json --out nuevo.json]`
  (`pricing-v3-workload/1`). Driver = unidades/mes × minutos; más horas fijas y horas de presencia por línea. La
  dedicación es el mayor entre trabajo/horas productivas y presencia/horas contratadas, redondeada hacia arriba.
  Cuotas de cada driver y bloque fijo suman 1. Exit 0 listo, 2 falta input (`LINE_OVER_CAPACITY` pide decidir dotación).
  No escribir la dedicación a mano si hay volumen declarado; no leer el resultado como dotación comprometida.
- **Receta del perfil que no aplica:** `work[].excludedProfileTasks: [{ task, reason }]`. Nunca editar la receta ni
  declarar una herramienta que el servicio no usa para «pasar» la validación. Sólo se excluye lo que la receta agrega.
- **Piso de margen:** la política `creative-managed-service` usa `target_margin` 0,45 y `minimumMargin` 0,45 en los
  32 perfiles. Decidido por el CEO el 2026-10-10: 45 % es el piso de margen de los servicios gestionados; un servicio
  donde se puede ganar más sube su objetivo en su propia política, no el piso. `talent-assurance-staffing` sigue con
  el recargo histórico (margen ~25 %): no usarla para un servicio gestionado. `assess` mantiene sus 40/35 como
  propuestas no aprobadas.
- **Kit y provisiones:** `kitId: "managed-service-core"` en cada línea; provisiones opcionales por `choices`
  (`provision-backfill-coverage`, `provision-on-call-alert-guard`), declaradas en una sola línea. Son estimaciones.
- **Consumo de agentes:** `serviceToolIds: ["agent-runtime-usage"]` + asignación con cantidad = bloques de 1.000 ítems
  al mes. Hipótesis sin medir. La bandeja (`social-inbox`) lleva el precio público de Sprout; plan contratado,
  asientos y quién paga siguen sin confirmar.
- **Lo que la CLI aporta y un cálculo a mano no:** herramientas base y licencias mínimas con su costo (Notion,
  Microsoft 365), fee de contratación completo por persona, FX de cotización y redondeo comercial. Por eso el precio
  se saca de la CLI.
- **Costos de persona:** los 32 registros están confirmados por su autor (el CEO, 2026-10-10) con los montos del Excel.
  Ninguno declara su país, así que la herramienta sigue informando `ESTIMATED_SOURCE`, el supuesto
  `UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY` y, en `assess`, `HUMAN_COST_EVIDENCE_REQUIRED`: no pedir los montos otra vez.
- Brechas abiertas en `operational-gaps.json`: provisiones sin medir, consumo sin medidor, bandeja sin contratar,
  setup no paramétrico, país de cada costo de persona (`LOCALIZED_TALENT_COSTS`), revisión del FX de cotización con
  CLF y EUR sin decidir (`QUOTE_FX_REVIEW`) y múltiplos de redondeo para otras monedas u ofertas
  (`COMMERCIAL_ROUNDING_SCOPE`). El alcance del piso (`MARGIN_FLOOR_SCOPE`) quedó decidido.

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
- **Versión del motor:** conviven dos contratos. Una cotización usa 1.1.0 sólo si necesita un neto acordado, varios
  ajustes o una regla de redondeo para su moneda; si no, 1.0.0. El agente no la elige: se lee en `engineVersion`.
- **Redondeo por moneda:** registros `price_rounding` del catálogo v4, una regla general por moneda para toda oferta:
  CLP 10000, USD 10, PEN 50, COP 50000, MXN 100 (`catalog search --kind price_rounding --catalog … --date 2026-10-10`).
  Cada fila facturable sube al múltiplo siguiente antes de los ajustes; nunca baja; una fila que cumplía su piso
  antes de redondear lo sigue cumpliendo. Una regla con `offerId` prevalece sobre la general. Moneda sin regla: no se
  redondea.
- **Línea bajo el piso:** con `priceRounding` presente, una línea en `marginFloor.lines[]` es un **incumplimiento
  real** (un neto acordado o un descuento la dejó bajo el piso): requiere decisión del operador. La lectura
  «fracciones = redondeo» vale sólo cuando `priceRounding` es `null`: cotizaciones congeladas sobre catálogos
  anteriores (`engineVersion` `pricing-v3-local/1.0.0`) o una moneda sin regla.
- **Otra moneda:** `brief.outputCurrency` = CLP, USD, COP, MXN o PEN, en una **copia** de la demanda (no editar la
  versionada). USD es la moneda de referencia: costos en USD, conversión al final con el FX de cotización del
  catálogo, que es política del CEO con margen prudencial y no tipo de cambio de mercado (USD→CLP 1000, COP 3650,
  MXN 19.25, PEN 3.70). Cada moneda redondea a su múltiplo, así que la misma oferta en dos monedas no es una
  conversión exacta: cotizar en la moneda pedida, nunca convertir a mano. Sin FX (EUR u otra) → `needs_input` con
  `MISSING_CATALOG_SELECTION` en `fx.USD:<moneda>`. CLF calcula sin redondeo y con un FX estimado de 2025: no
  presentarlo. Herramienta con precio en EUR en una cotización posterior al 2026-10-09 →
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
  por ser cliente vigente. No usar el precio de SKY como referencia de margen para otro cliente.
- **Abierto** ([`operational-gaps.json`](../../../../data/pricing/v3-operating/operational-gaps.json)):
  `QUOTE_FX_REVIEW`, `COMMERCIAL_ROUNDING_SCOPE`, `LOCALIZED_TALENT_COSTS`, provisiones estimadas y consumo de agentes
  sin medir. `MARGIN_FLOOR_SCOPE` quedó decidido; `FLOOR_PRICE_ROUNDS_UNDER_FLOOR` y `AGREED_PRICE_OUTSIDE_ENGINE` se
  resolvieron y salieron del ledger. No decidido a propósito: redondear sobre el total del periodo en vez de por
  fila, terminaciones comerciales como 990.000 (hoy es un neto acordado) y múltiplos para CLF y EUR. No resolverlos
  en una cotización.
- Sin cambio: códigos de salida, flags, contrato de errores y escritura exclusiva. El contrato 1.0.0 no se movió:
  todo artefacto congelado se sigue reproduciendo con `replay` (`verified: true`).

## Mapa de implementación y evidencia reusable

| Responsabilidad | Fuente vigente |
| --- | --- |
| Kernel puro, markup/margen, factores, coberturas, FX, rounding; contratos 1.0.0/1.1.0, ajustes (`discount`, `agreed_net`), redondeo comercial y registro de motores | `src/lib/finance/pricing-v3/calculate.ts`, `schemas.ts` |
| Registro cerrado de rechazos (dominio y adaptador) | `src/lib/finance/pricing-v3/errors.ts` |
| Registros (incluye `price_rounding`)/brief/resolución/quote/explicación; elección del contrato por cotización y recorrido del precio por fila | `src/lib/finance/pricing-v3/catalog/{contracts,catalog,resolve,quote,explain}.ts` |
| Demanda/policy y atribuciones | `src/lib/finance/pricing-v3/resources/{composition-contracts,composition}.ts` |
| Packs/costo base/caja/caducidad | `src/lib/finance/pricing-v3/resources/credit-budget.ts` |
| Discovery/scaffold/portfolio/plan | `src/lib/finance/pricing-v3/resources/operating.ts` |
| Volumen → dedicación (`compose workload`) | `src/lib/finance/pricing-v3/resources/workload.ts` |
| Resumen derivado (`compose prepare`, `compose quote`, `replay`): líneas bajo el piso, `engineVersion`, `commercialAdjustments`, `priceRounding` | `src/lib/finance/pricing-v3/resources/summary.ts` |
| Gaps económicos, veredicto del piso por línea y proyección comercial redactada | `src/lib/finance/pricing-v3/resources/readiness.ts` |
| Snapshots/digests/IO/mantenimiento local | `src/lib/finance/pricing-v3/adapters/{local-snapshot,catalog-local,resource-composition,resource-maintenance}.ts` |
| Adapter CLI, flags, exit, clasificación de errores y escritura exclusiva | `scripts/commercial/pricing-v3.ts` |
| Guarda permanente: replay de todo artefacto congelado (`data/pricing/**` + SKY `acordado*`) | `src/lib/finance/pricing-v3/__tests__/pricing-v3-frozen-artifacts.test.ts` |
| Regresiones y negativos | `src/lib/finance/pricing-v3/__tests__/`, `pnpm pricing:v3:test` |

Versionar y conservar originales: `data/pricing/v3-catalog/` y `v3-composition/` son fixtures previas; sucesores y
casos operativos están en `v3-operating/`, créditos en `v3-resources/`. No convertir fixtures, synthetic access o
`portfolio.example.json` en default de cartera. `historical-resource-index.json` conserva26filas del Excel:
25tools y fee de plataforma; tools registradas no equivalen a todos los planes/precios actuales confirmados.
`operational-gaps.json` conserva owner/acción de costos salariales, provisiones, asignación/acceso, licencia,
margen, impuestos y SOW. Cerrar esos gaps con evidencia; no inferirlos del número de pruebas o de un commit.

Las fuentes y cambios locales no acreditan adopción API/UI/MCP, sincronización remota, aprobación económica,
inventario, persistencia o emisión. Si se cambia la arquitectura o un contrato, actualizar su dueño en docs,
sincronizar este router/referencia y mirrors y correr los gates proporcionales; evitar duplicar spec en skills.
