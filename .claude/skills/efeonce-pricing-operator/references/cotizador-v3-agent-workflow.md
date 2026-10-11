# Cotizador V3: contrato operativo para agentes

Referencia load-on-demand compartida Codex/Claude. Estado verificado 2026-10-09: prototipo local opt-in;
catálogo, kernel Decimal, mantenimiento, créditos, composición y flujo operativo implementados; desde 2026-10-10,
motor 1.1 (precio acordado, redondeo comercial) y catálogo v4 con cotización en CLP, USD, COP, MXN y PEN; desde
2026-10-11, catálogo v5 con factores por país del cliente y de cada persona y contrato 1.2.0 (el piso acompaña al
factor de mercado); el mismo día, más tarde: puntero de versiones vigentes (`current.json`, `--current`), catálogo v6
(FX de cotización EUR→USD) y policy v6 (precios unitarios que no vencen), avisos de la corrida (`runNotices`) y peso
de cada dato estimado (`estimateExposure`); y por la tarde del 2026-10-11: contrato 1.3.0 con la forma del
compromiso (On-Going / On-Demand), provisiones de puesta en marcha (catálogo v9), Adobe como se factura y plazos de
proveedor (policies v7 a v10) y tres lecturas de un artefacto congelado (`compose schedule|cash|commitments`); y
por la noche del 2026-10-11: contrato 1.4.0 y catálogo v10, con los costos de terceros de un trabajo, la reserva de
contingencia de un alcance fijo, el margen del trabajo propio junto al margen total y los factores de país cerrados
como valores de política (confirmados desde 2026-10-12); y al cierre del 2026-10-11: la lectura `compose document`,
que convierte una cotización congelada en los datos (versión 2) de la plantilla A4 de cotización, el documento que
recibe el cliente. El
canon de cotizaciones Greenhouse conserva autoridad, permisos y lifecycle. Esta referencia interpreta sus contratos;
los schemas y primitives de `src/lib/finance/pricing-v3/` calculan.

Orden para actuar: 1) [qué cargar](#entrada-y-fuentes-dueñas); 2) [cadena de comandos](#secuencia-verificable-por-cli);
3) contratos de selección, capacidad, créditos y precio; 4) leer el resumen
([piso y precio acordado](#resumen-piso-y-precio-acordado-delta-2026-10-10),
[país](#país-del-cliente-y-de-la-persona-delta-2026-10-11),
[avisos y estimados](#avisos-de-la-corrida-exposición-a-estimados-y-base-de-costo-delta-2026-10-11));
5) [forma del compromiso, puesta en marcha y herramientas con contrato](#forma-puesta-en-marcha-y-herramientas-con-contrato-delta-2026-10-11)
y [costos de terceros y reserva de contingencia](#costos-de-terceros-y-reserva-de-contingencia-delta-2026-10-11-noche);
6) [lecturas del artefacto](#presentar-persona-y-kit-de-herramientas-delta-2026-10-11): persona y kit, y
[calendario, caja y compromisos](#tres-lecturas-del-artefacto-calendario-caja-y-compromisos-delta-2026-10-11);
7) [«la cotización» para el cliente: `compose document`](#documento-de-cotización-para-el-cliente-delta-2026-10-11-cierre);
8) [mantenimiento: versión nueva y puntero](#mantenimiento-versión-nueva-y-puntero-delta-2026-10-11);
9) [lo que nunca se hace](#nunca).

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
no citarlo de memoria. Al cierre del 2026-10-11: `catalog.review-v10.json` (`operating-review-2026-10-11-v10`) +
`resources.review-v11.json` (`operating-review-2026-10-11-v11`) + `ai-credits.review-v1.json`; los siguientes serían
catálogo v11 y policy v12.

Los valores se toman por `quoteDate`, no por el archivo: factores de país, costos en Chile, FX EUR→USD y CLP→USD,
forma del compromiso, provisiones de puesta en marcha, reglas de terceros, reserva de contingencia y la policy
vigente rigen con `quoteDate` 2026-10-11 o posterior; los ocho factores de país que el v10 confirmó, desde el
2026-10-12 (una cotización fechada 2026-10-11 los lee como estimados y trae `runNotices.laterCatalogValues` con
`records` 8: es lo esperado ese día, no una fecha atrasada). Con `--current`, una demanda fechada antes del
2026-10-11 devuelve exit 2 con `RESOURCE_POLICY_NOT_EFFECTIVE` (y
`runNotices.laterCatalogValues` avisa de los valores posteriores): le pasa a `managed-care.demand.json` y a las
demandas de SKY, fechadas 2026-10-10. Una ruta `…review-vN.json` se escribe sólo para repetir un caso con las
versiones de su fecha, diciéndolo: `designer.plan.json` (2026-10-09) corre con `catalog.review-v2.json` +
`resources.review-v2.json`; SKY, con `catalog.review-v4.json` + `resources.review-v5.json`. Las versiones anteriores
no se borran ni se editan.

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
pnpm --silent pricing:v3 compose split --input artefacto-nuevo.json --tools adobe,higgsfield
pnpm --silent pricing:v3 compose schedule --input artefacto-nuevo.json --milestones hitos.json
pnpm --silent pricing:v3 compose cash --input artefacto-nuevo.json
pnpm --silent pricing:v3 compose commitments --input artefacto-nuevo.json
pnpm --silent pricing:v3 compose document --input artefacto-nuevo.json
pnpm --silent pricing:v3 compose document --input artefacto-nuevo.json --brief brief-documento.json --out datos-documento.json
node scripts/documents/render-cotizacion-a4.mjs --data datos-documento.json --out carpeta-nueva
```

`pedido.json`, `cartera.json`, `plan.json`, `hitos.json` y `brief-documento.json` son los archivos del caso; la misma
cadena, con entradas versionadas y sus códigos de salida, está en el
[manual](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#secuencia-de-comandos).
`compose split|schedule|cash|commitments` son lecturas opcionales del artefacto: se corren cuando el pedido las pide,
no siempre. Las tres últimas líneas producen el documento que recibe el cliente y se corren cuando hay que entregar
«la cotización» ([sección](#documento-de-cotización-para-el-cliente-delta-2026-10-11-cierre)).
`explain`, `replay`, `compose assess|preview|split|schedule|cash|commitments|document`, `calculate`, `validate`,
`compare`, `export` y `current` no aceptan `--current` (`INVALID_ARGUMENT`).

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
`creditBudgets`, `fxRecordIds` y opcional `clientProvidedTools`. El `brief` admite `engagementForm` (opcional; la
forma del compromiso, aparte de `engagementCode`), `thirdPartyCosts` (opcional; costos de terceros del trabajo) y
`contingency` (opcional; sólo para renunciar a la reserva)
([detalle](#costos-de-terceros-y-reserva-de-contingencia-delta-2026-10-11-noche)). `work` declara IDs estables, tareas, selección IA
con motivo, consumo por proveedor/mes y `excludedProfileTasks` (tareas de la receta del perfil que este trabajo no
hace, cada una con su motivo). `planned-*` son slots, nunca personas asignadas o seats reales.
`pricing-v3-resource-policy/1` enlaza perfiles/tareas/tools; `access` diferencia `named`, `shared`, `credits`.
32 reglas de perfil son recetas iniciales para revisión, no una cobertura universal del trabajo solicitado.

Base Notion/Microsoft365 obligatoria para todos. SEMrush se añade al trabajo SEO; Adobe a diseño/video que lo
requiere. ChatGPT, Claude, Higgsfield, Magnific y demás IA se eligen por necesidad y motivo; no sumarlos todos a
cada rol. WordPress, stock, publicación social, datos y automatización usan tareas explícitas del alcance.
Elegir `priceId`/frecuencia; plan múltiple o costo desconocido produce pregunta, nunca el plan más barato o cero.

Una licencia nominativa mantiene cantidad entera, usuarios, capacidad y mínimos contractuales. Dedicación50%
no significa licencia50%. Un costo compartido no autoriza compartir login. `basis=seat` no se transforma en pool;
paquetes nominativos pueden distribuir costo respetando capacidad contractual. Adobe, desde la policy v7, se cotiza
como se factura: **dos productos en CLP, tres licencias cada uno, una licencia = 1/3 del paquete**
([detalle](#forma-puesta-en-marcha-y-herramientas-con-contrato-delta-2026-10-11)). Los USD 180 y 306 de las policies
v2 a v6 son historia: sólo sirven para repetir un caso con las versiones de su fecha.

El estado de cada fuente importa: factura acredita facturado, no pago; operador acredita declaración; tarifa
pública no acredita el plan Efeonce; histórico no acredita salario vigente. Notion factura período21sep–21oct2026:
9usuarios Business×24USD y30USD por3000créditos, componentes separados. No distribuir créditosNotion como otra
licencia obligatoria ni considerar que cada usuario recibe todo ese presupuesto. SEMrush/Claude/ChatGPT y los precios
públicos de M365 preservan su fuente y siguen marcados `estimated`; desde la policy v9 el `current` de M365 es el de
su factura (G185142527, 2026-09-16: Business Standard, USD 14,70/licencia, 6 licencias, sin impuesto), `confirmed`,
y es el que debe elegir una cotización nueva. La factura de Adobe 3582641940 del 2026-09-16 sustenta el precio de
Express y los dos de Creative Cloud Pro. Desde la policy v6 un precio unitario no vence: rige
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

Ejemplo hipotético (`portfolio.example.json`, con `--current`) Adobe CLP 325.405,5/capacidad 160: cliente 40 → CLP
81.351,375, interno 80 → 162.702,75, sin asignar 40 → 81.351,375; no es reparto real ni porcentaje por defecto. Dentro de una cuenta,
attributions noIA se distribuyen por usuarios únicos y créditos por consumo. No presentar esos pesos como una fórmula de horas que el código no implementa. Portfolio no consulta,
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
precio. `trial-*` de la baseline son placeholders no medidos; desde el catálogo v9 la puesta en marcha son dos
provisiones estimadas por persona y `trial-setup` quedó retirado
([detalle](#forma-puesta-en-marcha-y-herramientas-con-contrato-delta-2026-10-11)). Fee genérico de plataforma del Excel (ETG-017) queda
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
Permanece simulación local no vinculante. `compose document` toma esos mismos ítems (una sola función decide qué
puede ver un cliente) y los pliega en el documento A4 de cotización
([sección](#documento-de-cotización-para-el-cliente-delta-2026-10-11-cierre)); la salida de `preview` no cambió.
Replay primero verifica digest y equivalencia con motor registrado;
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
líneas bajo el piso; el mismo servicio para un cliente y un equipo en Colombia está en `managed-care-colombia.*`
(COP 28.100.000). Las dos demandas versionadas ya no calculan tal cual con `--current`: la de Chile está fechada
2026-10-10 y a las dos les falta resolver `express-design`. Se cotiza una **copia** con la fecha del día y la tarea
excluida en las dos personas de la bandeja; los comandos están en el manual y las cifras no cambian.
**Desde el catálogo v10 la forma cambia el resultado de un servicio gestionado:** sin `engagementForm` da esas
cifras y el resumen trae el supuesto `CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM`; con `on_going`, el
mismo neto sin supuesto (motor 1.3.0); con `on_demand`, recargo de la forma más reserva de contingencia: CLP
11.370.000, margen `0.501607`, motor 1.4.0. Preguntar la forma siempre.

- **Dedicación desde el volumen:** `pricing:v3 compose workload --input workload.json [--brief brief.json --out nuevo.json]`
  (`pricing-v3-workload/1`). Driver = unidades/mes × minutos; más horas fijas y horas de presencia por línea. La
  dedicación es el mayor entre trabajo/horas productivas y presencia/horas contratadas, redondeada hacia arriba.
  Cuotas de cada driver y bloque fijo suman 1. Exit 0 listo, 2 falta input (`LINE_OVER_CAPACITY` pide decidir dotación).
  No escribir la dedicación a mano si hay volumen declarado; no leer el resultado como dotación comprometida.
- **Receta del perfil que no aplica:** `work[].excludedProfileTasks: [{ task, reason }]`. Nunca editar la receta ni
  declarar una herramienta que el servicio no usa para «pasar» la validación. Sólo se excluye lo que la receta agrega.
  Desde la policy v7 la receta de Social Media Manager, Community Manager, Content Manager y Content Creator trae
  `express-design` (Adobe Express): sin asignación ni exclusión → `RESOURCE_ALLOCATION_REQUIRED` en
  `<periodo>:adobe-express`. Quien atiende una bandeja no diseña: se excluye con ese motivo. Quien arma piezas lleva
  la asignación de `adobe-express` (una licencia = 1/3). Nunca excluir sólo para que la corrida pase.
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
  está fechada antes (caso de `managed-care.demand.json`, 2026-10-10) y no recibió factores de país; con `--current`
  esa fecha además bloquea la corrida (`RESOURCE_POLICY_NOT_EFFECTIVE`).
- **Sin puesta en marcha:** `managed-service-core` no carga onboarding ni admite reclutamiento.
- Brechas abiertas en `operational-gaps.json`: provisiones sin medir, consumo sin medidor, bandeja sin contratar,
  setup no paramétrico, costo específico por perfil y
  país donde se aparte del factor (`LOCALIZED_TALENT_COSTS`; la base de costo quedó decidida), revisión del FX de
  cotización con CLF y EUR sin decidir (`QUOTE_FX_REVIEW`), múltiplos de redondeo para otras monedas u ofertas
  (`COMMERCIAL_ROUNDING_SCOPE`), revisión de precios unitarios de herramientas (`UNIT_PRICE_REVIEW`) y ajuste de las
  tasas de terceros y de la reserva con el primer trabajo real (`THIRD_PARTY_AND_CONTINGENCY`). El alcance del piso
  (`MARGIN_FLOOR_SCOPE`) y los factores de país (`COUNTRY_FACTORS_UNVALIDATED`) quedaron decididos: no deben nada.

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
- **Versión del motor:** conviven cinco contratos. Una cotización usa 1.4.0 si la demanda refactura al menos un
  costo de terceros o si tiene reserva de contingencia (también cuando se renuncia a ella); si no, 1.3.0 si declara
  `engagementForm` (también con razón 1); si no, 1.2.0 sólo si el factor de mercado del país del
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
  `{ "adjustmentId", "kind": "agreed_net", "amount", "billing": "monthly"|"setup", "lineIds": [líneas del brief], "reason" }`
  (desde el contrato 1.4.0, `billing: "third_party"` con `lineIds` = `costId` acuerda el neto de costos de terceros).
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
  `QUOTE_FX_REVIEW`, `COMMERCIAL_ROUNDING_SCOPE`, `LOCALIZED_TALENT_COSTS`, `THIRD_PARTY_AND_CONTINGENCY`, provisiones
  estimadas y consumo de agentes sin medir. `MARGIN_FLOOR_SCOPE` y `COUNTRY_FACTORS_UNVALIDATED` quedaron decididos;
  `FLOOR_PRICE_ROUNDS_UNDER_FLOOR` y `AGREED_PRICE_OUTSIDE_ENGINE` se
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
  MX 0.90, ES 3, US 5, uno por país para todo perfil. Mercado: CL 1, CO 0.90, US 1.10, PE 0.95, MX 1, ES 1.10.
  **Los doce son valores de política confirmados y están cerrados.** CL (los dos), CO y US de mercado los decidió el
  CEO el 2026-10-11; los otros ocho los propuso el agente y el CEO los cerró ese día («deja eso cerrado ya»): el
  catálogo v10 los registra `confirmed` desde el 2026-10-12. Son valores de política, no observaciones de mercado;
  uno se revisa sólo si una contratación real o un negocio cerrado lo contradice. **No volver a presentarlos como
  estimados ni como una decisión que el operador deba.** Sólo una cotización fechada 2026-10-11 los lee todavía como
  estimados (`ESTIMATED_SOURCE` con `paths` `snapshot.talentFactors` / `snapshot.marketFactors`, peso en
  `estimateExposure` y `runNotices.laterCatalogValues`); el precio es el mismo. No citar estos valores de memoria:
  `catalog search --kind talent_factor|market_factor --current --date <fecha>`.
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
  antes de valores más nuevos del catálogo: en una cotización nueva significa corregir `quoteDate` (salvo el
  2026-10-11, por los factores confirmados desde el día siguiente).
- **País sin factor:** exit 2, `MISSING_CATALOG_SELECTION` en `lines.<lineId>.talentFactor` o en `offerMarketCountry`
  (en el carril `calculate` el kernel lo llama `MISSING_TALENT_FACTOR`). No sustituir por otro país: se agrega al
  catálogo con decisión del operador.
- **Costo específico antes que factor:** si el costo objetivo de un perfil en un país se aparta del costo de Chile ×
  factor, se registra como `cost` con `localization: { kind: "specific", country }`; para ese perfil y ese
  `talentCountry` reemplaza al costo de Chile × factor y no recibe factor. Es un costo objetivo que decide el
  operador, no la nómina de una persona. Plantearlo sobre todo con equipo en ES o US (factores 3 y 5: un solo número
  para todo perfil). Es la única vía para apartarse de un factor cerrado: no «corregir» un costo moviendo el factor
  del país ni el factor de mercado.
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
  volver a correr; la excepción es el 2026-10-11 (ocho factores de país confirmados desde el 2026-10-12). En
  `priceDates`, la vigencia de la cotización de un proveedor sale con `subject` `third_party_quote` y `blocksWith`
  `STALE_SOURCE`; el fin de un registro de reserva, con `blocksWith: null` y `consequence` (no bloquea: la cotización
  siguiente no lleva reserva).
- **Un precio unitario no vence** (decisión del CEO, 2026-10-11): el precio de una suscripción es estable; lo que
  cambia es cuántas licencias se contratan, y eso se declara en cada cotización. Policy vigente: 27 precios de
  herramientas con `effectiveUntil` 9999-12-31; 24 con `reviewBy` 2027-04-11 y los tres de Adobe con 2026-11-16 (el
  día en que renueva su contrato). `reviewBy` (opcional, por precio) avisa,
  nunca bloquea y nunca cambia un resultado; la fecha a seis meses la eligió el agente, no el operador. Un precio
  cambia **sólo** emitiendo una versión nueva de la policy. 22 de los 27 siguen marcados `estimated`; la mayoría
  es precio público de lista.
- **`priceReview`** en `resources inspect --current --date <fecha>`: `{ withinDays, reviewDue, dueSoon, expired }`.
  `reviewDue` = revisiones ya pasadas (recordatorio); `dueSoon` = revisiones o vigencias duras dentro de 30 días;
  `expired` = vigencias duras ya pasadas, que sí bloquean (`blocksWith` nombra el diagnóstico). Hoy `expired` trae
  sólo `fx:EUR:USD:ECB:2026-10-09`, la referencia de un día que `fx:EUR:USD` reemplaza para fechas posteriores.
- **`estimateExposure`** (resumen; también en `replay`; `null` si la cotización quedó bloqueada): derivado del
  resultado congelado, nada se recalcula. `estimatedCost` + `confirmedCost` = `totalCost`; `estimatedShareOfCost`;
  `costInputs[]` ordenado por `costAtRisk` (costo que depende de ese dato), con `shareOfCost` (÷ costo total) y
  `marginRateLostIfTenPctHigher` (= 0,10 × `costAtRisk` ÷ `net`: margen perdido si el dato resulta 10 % más alto y
  el neto no cambia). La cotización estimada de un proveedor es un dato del ranking (`kind` `third_party`, `id` =
  `costId`). `priceInputs[]` = factor de mercado estimado (mueve precio, no costo; sólo con fecha 2026-10-11);
  `estimatedRules[]` = políticas estimadas que son reglas, fuera del ranking, incluidas `contingency_reserve` y
  `third_party_policy`. La reserva no es un dato: agranda en `(1 + tasa)` lo que depende de su base. Los
  `costAtRisk` pueden sumar más que `estimatedCost`: un
  componente puede depender de dos datos.
- **Qué hacer con la exposición:** decirle al operador qué parte del costo es estimada y **qué dato confirmar
  primero**, con su efecto en puntos de margen. Es una lectura de sensibilidad: no es pronóstico, validación ni
  aprobación, y no se usa para «corregir» un dato. `compose assess` da el mismo orden en `costEvidencePriority`
  `{ currency, estimatedCost, confirmedCost, estimatedShareOfCost, confirmFirst }` (`confirmFirst` = los cinco
  primeros `costInputs`); `assess` no lista un factor de país estimado entre sus `gaps`, pero sí aparece ahí.
  Ejemplo (`managed-care-colombia`, COP 28.100.000, margen real 41,5 %), con fecha 2026-10-12 o posterior: 34,0 %
  del costo es estimado y el primer dato es la bandeja Sprout, 17,7 % del costo y 1,0 punto de margen por cada 10 %.
  (Con fecha 2026-10-11 el factor de talento CO todavía cuenta como estimado: 98,7 %, 64,7 % y 3,8 puntos.)
- **Base de costo = costo objetivo, no nómina** (decisión del CEO, 2026-10-11). Los costos de persona vienen del
  Excel de pricing y son el nivel de sueldo que el CEO quiere alcanzar para el equipo; no quiere que el cotizador use
  la nómina real. La nómina actual está bajo ese costo: el margen real de hoy sobre personas es **mayor** que el que
  muestra el cotizador. No proponer «conectar la nómina real», no llamar al costo del catálogo «lo que Efeonce paga»,
  no escribir el sueldo de una persona en ningún archivo.

## Forma, puesta en marcha y herramientas con contrato (delta 2026-10-11)

Pasos, ejemplos y tablas: manual,
[«Cotizar On-Demand u On-Going»](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#cotizar-on-demand-u-on-going),
[«Puesta en marcha»](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#puesta-en-marcha-onboarding-y-reclutamiento)
y [«Herramientas con contrato»](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#herramientas-con-contrato-adobe-y-los-plazos-del-proveedor).
Ejemplo de referencia: `data/pricing/v3-operating/designer-on-demand.demand.json` / `.artifact.json` (un mes de un
diseñador senior dedicado en Chile, On-Demand, CLP: neto 2.790.000, margen `0.366151`, primer artefacto 1.3.0; son
las cifras del artefacto, que congeló la policy v7 con Adobe con descuento. Con `--current` y la policy v10: costo
1.822.704, neto 2.870.000). Todo
rige con `quoteDate` 2026-10-11 o posterior. Aquí, en el orden en que se arma una demanda.

**1. Forma del compromiso (`brief.engagementForm`, contrato 1.3.0).**

- Preguntar si el trabajo es continuo (On-Going) o acotado (On-Demand: alcance, inicio, término, aceptación y
  salida). Es una **forma de compromiso**: no es una cuarta oferta ni un modelo de entrega; la oferta sigue en
  `offerId`. Efeonce Factory es la ruta comercial de los trabajos On-Demand
  (`docs/business-models/EFEONCE_ENGAGEMENT_PROJECT_OPERATING_MODEL_V1.md`,
  `docs/business-models/factory/EFEONCE_FACTORY_BUSINESS_MODEL_V1.md`).
- Declarar `"engagementForm": "on_demand"` u `"on_going"` en el `brief`. `engagementCode` (`monthly`) no se toca: es
  la cadencia de cobro y elige la política de precio.
- Las formas son datos del catálogo (`engagement_factor`, un registro por forma; el de una oferta prevalece sobre el
  general): hoy `on_going` razón `1` y `on_demand` razón `1.10`. Verlas:
  `catalog search --kind engagement_factor --current --date <fecha>`.
- La razón multiplica el precio de **toda** la fila (persona, fee, provisiones, herramientas; filas mensuales y de
  puesta en marcha) después de la política y del factor de mercado, antes del redondeo y de `discount`/`agreed_net`.
  **No cambia el costo ni mueve el piso**: el recargo es margen y un descuento puede consumirlo hasta el piso de
  On-Going. En CO/PE, `marketAdjustment`, `marketPriceRatio` y `floorNet` son iguales con y sin forma.
- Leer en el resumen: `engineVersion` `pricing-v3-local/1.3.0`, `engagementForm`
  `{ form, priceRatio, scope, offerId, recordId, revision, sourceStatus }` y `totals.engagementAdjustment`. `explain`
  y `compose assess` lo repiten; `compose preview` muestra sólo el neto.
- **Sin el campo cotiza como On-Going y no avisa** (contratos 1.0.0–1.2.0, idénticos byte a byte; el resumen no trae
  `engagementForm`). Con `on_going` declarado emite 1.3.0 con `engagementAdjustment` `0`. En un trabajo acotado,
  comprobar que la clave está.
- **Híbrido son dos cotizaciones** (una base On-Demand y una operación On-Going). No hay forma Híbrido ni
  Licencia/Consultoría, ni tope a la razón.
- Falla de selección (exit 2, `diagnostics`): `MISSING_CATALOG_SELECTION` con `path` `engagementForm` (id sin
  registro vigente a la fecha) o `AMBIGUOUS_SELECTION` (dos del mismo nivel). En el carril `calculate` el faltante se
  llama `MISSING_ENGAGEMENT_FACTOR`.
- Quién decidió: el CEO eligió el diseño (un registro por forma, no duplicar las 96 políticas) y preguntó si 10 %
  era correcto dejando el ajuste al agente, que lo mantuvo: extremo bajo del 10–15 % que las agencias descuentan a un
  retainer frente a una tarifa de proyecto, y en V3 puesta en marcha, coordinación y compromisos se costean aparte.
- **No modelado en un trabajo acotado, y se dice:** duración del contrato (hay periodos, no plazo) y periodos
  menores a un mes (se expresan como horas en un periodo). Los costos de terceros y la reserva de contingencia sí
  están modelados desde el contrato 1.4.0
  ([sección](#costos-de-terceros-y-reserva-de-contingencia-delta-2026-10-11-noche)).
- **En un servicio gestionado, `on_demand` trae además la reserva de contingencia** y la cotización se firma con
  1.4.0. Una persona por dedicación no lleva reserva: el ejemplo de referencia de esta sección sigue en 1.3.0.

**2. Puesta en marcha (catálogo v9).**

- `provision-account-onboarding`, USD 200, una vez **por persona** que se suma a una cuenta: entra sola (requisito
  `setup` de los siete kits de staffing).
- `provision-recruiting`, USD 500, una vez por persona, **sólo por elección**, cuando hay que contratar a alguien
  para ese cliente: `"choices": [{ "requirementId": "recruiting", "resourceId": "provision-recruiting" }]` en la
  línea.
- Las dos son estimaciones propuestas por el agente y aceptadas por el CEO, a medir en las próximas dos
  incorporaciones reales; llevan el margen de la oferta y caen en la única fila `setup` de la línea. Salen como
  `ESTIMATED_SOURCE`.
- Quien se suma después paga la suya (antes era una por cuenta). Un servicio gestionado no tiene ninguna
  (`UNKNOWN_RESOURCE_REQUIREMENT` si se le pide reclutamiento). `trial-setup` (USD 100) quedó retirado; una demanda
  fechada antes lo sigue resolviendo.
- La regla del Excel «un mes de costo del recurso» no está en el cotizador; esa protección va en el contrato (plazo
  mínimo, cláusula de conversión) y es un tema legal.

**3. Herramientas con contrato (policies v7 a v10).**

- Adobe son dos productos (factura 3582641940 del 2026-09-16, mostrada por el CEO): `adobe` = Creative Cloud Pro, 3
  licencias, `current` CLP 325.405,5/mes (sin descuento), diseñadores, tareas `visual-design` y `video-editing`, ya incluye Express;
  `adobe-express` = Adobe Express, 3 licencias, CLP 16.240/mes, tarea `express-design`, para Social Media Manager,
  Community Manager, Content Manager y Content Creator (perfiles confirmados por el CEO).
- **Una licencia = 1/3 del paquete**: `quantity "1"`, `seatCapacity 3`, `serviceShare "0.333333333333333333"`,
  `driver { unit "assigned-user-seat", totalUnits "3", allocatedUnits "1" }`. Nunca el paquete entero a una persona.
- Montos **con IVA** por decisión del CEO (se recupera, pero no mes a mes) y en **CLP**: la demanda nombra
  `fx:CLP:USD` en `fxRecordIds` (con Magnific, también `fx:EUR:USD`); si falta →
  `RESOURCE_FX_SELECTION_REQUIRED` en `<periodo>:adobe`.
- **Creative Cloud Pro se cotiza sin su descuento** (decisión del CEO, 2026-10-11; policy v10): `current` es el
  precio de lista, CLP 325.405,5/mes (una licencia: 108.468,5), `confirmed` desde la policy v11 — es un valor
  decidido por el CEO, no un dato a la espera de otra factura; nunca listarlo como pendiente — y es el default. Lo que Adobe factura mientras dura el descuento es
  `priceId: "invoiced-with-discount"` (CLP 162.605/mes, una licencia 54.202, `confirmed`): sólo para un trabajo que
  termina antes que el descuento y **sólo si el operador lo decide**; decir cuál se usó. `renewal-scenario` ya no
  existe (nombrarlo deja `RESOURCE_PRICE_SELECTION_REQUIRED`). Los tres precios de Adobe llevan `reviewBy`
  2026-11-16.
- `commitmentTermMonths` (1..120, opcional, por precio): por cuántos meses hay que pagar una licencia **una vez
  tomada**. `1` es una declaración (se suelta al quitar el asiento), distinta de no declarado. Adobe `12` (se sigue
  cobrando hasta que el contrato se renueva); Microsoft 365 mensual `1` (contrato anual pagado mes a mes, pero asignar
  o quitar una licencia sube o baja la factura); Notion `1`; HubSpot sin declarar: el CEO indicó el 2026-10-11 que
  hoy no hace falta en las cotizaciones, así que su precio queda sin cargar a propósito y no se pide como dato
  pendiente. Dicho por el CEO. Nunca entra a un cálculo: sólo lo lee `compose commitments`.
- `commitmentRenewsOn` (fecha ISO, opcional, sólo junto con el plazo): cuándo renueva el contrato. Adobe:
  **2026-11-16** (consola del proveedor, mostrada por el CEO; ahí se puede cambiar el número de licencias o
  cancelar). Que el descuento termine justo ese día no está confirmado.
- Equipo mixto (un diseñador con Creative Cloud Pro y un Community Manager con Express) es normal.
  `BUNDLED_TOOL_DOUBLE_COUNT` sale sólo si la **misma** línea o persona tiene el plan y un producto que el plan
  incluye.

## Costos de terceros y reserva de contingencia (delta 2026-10-11, noche)

Contrato 1.4.0, motor `pricing-v3-local/1.4.0`, catálogo v10; rige con `quoteDate` 2026-10-11 o posterior. Tablas,
JSON completo y cifras: manual,
[«Costos de terceros»](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#costos-de-terceros),
[«Reserva de contingencia»](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#reserva-de-contingencia)
y [«Cómo leer una cotización con terceros»](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#cómo-leer-una-cotización-con-terceros).
Ejemplo de referencia: `data/pricing/v3-operating/managed-on-demand-third-party.demand.json` / `.artifact.json`
(primer artefacto 1.4.0): servicio gestionado creativo On-Demand en Chile, CLP, con producción en CLP, talento en
USD, medios al costo y una licencia que paga el cliente. Volver a correrlo antes de citar una cifra. Aquí, en el
orden en que se arma y se lee una cotización.

**1. Preguntar antes de escribir.**

- ¿Hay algo que se le compra a otro para este trabajo (productora, talento, impresión, medios, una licencia)? Por
  cada cosa: monto y moneda del proveedor, su cotización (referencia, fecha, hasta cuándo vale), en qué periodo cae
  y **quién le paga al proveedor**.
- ¿El trabajo es de alcance fijo? En un servicio gestionado, declarar `engagementForm` decide si lleva reserva.

**2. Declarar los costos (`brief.thirdPartyCosts[]`, hasta 50).**

- Campos: `{ costId, category, label, supplier, settlement, amount, currency, quantity, periodIds, evidence }`. El
  objeto es estricto: un campo de más (una tasa) es `SCHEMA_INVALID`.
- `settlement`: `reinvoiced` (Efeonce compra, paga y refactura: fila comercial propia; `evidence` obligatoria) o
  `client_direct` (el cliente le paga al proveedor: nota congelada en el brief, fuera del motor, de todo total, de
  toda cifra de caja y de toda conversión; `evidence` opcional). Un brief con sólo notas `client_direct` se queda en
  su contrato anterior.
- `category`: un id del catálogo. **La demanda lleva la categoría, nunca una tasa.** Verlas:
  `catalog search --current --kind third_party_policy`. Hoy: `production`, `talent`, `printing` (`markup` 0.10, piso
  0.05, redondeo comercial) y `media`, `licences` (`markup` 0, piso 0, sin redondeo: exactamente al costo). Las
  propuso el agente y el CEO las aceptó el 2026-10-11 («seguiré tu recomendación») como estimaciones por ajustar con
  el primer trabajo real; el 10 % es el fee de gestión de proyecto del Excel y «sin margen sobre medios» es la regla
  del propio operador. Registros `estimated` → `ESTIMATED_SOURCE`.
- `label`: **lo ve el cliente** en `compose preview`; no nombra al proveedor ni un costo. `supplier`: interno, no
  sale del brief.
- `amount`: monto unitario del proveedor, cadena, mayor que cero, sin más decimales que su moneda. `quantity`: entero
  1–9999 como cadena. `periodIds`: obligatorio; **el costo completo se cobra en cada periodo listado** (un costo
  único lleva un solo periodo).
- `evidence`: `{ reference, effectiveFrom, effectiveUntil, status }`. `reference` es un id de la cotización del
  proveedor, no el documento.
- `costId`: único y distinto de todo `lineId` (comparten nombres).

**3. Lo que el motor hace con cada costo refacturado.**

- Fila propia por periodo, `kind: "third_party"` (`<costId>:<periodo>:third_party`), con el piso de su categoría
  (`minimumMargin`, `floorNet`). Costo = `amount × quantity`; precio = costo × (1 + tasa) con `markup`.
- **Nunca la tocan** el factor de mercado, la razón de la forma, un `discount` por tasa, la reserva ni la política
  de la oferta. El único ajuste que le llega: `agreed_net` con `billing: "third_party"` y `lineIds` = `costId` de
  costos `reinvoiced`. Bajo su `floorNet` sale en `marginFloor.lines[]` con `kind` `third_party`.
- **Moneda:** proveedor en la moneda de la cotización → sin conversión (entra exacto). Otra moneda → pasa por la
  moneda de cálculo con el FX que la cotización congela (`fxPath`, `fxRate` en la fila). **Ese FX se elige solo: no
  se nombra en `fxRecordIds`** (`UNUSED_FX_SELECTION`). El resumen lista los expuestos en `thirdParty.fxExposed` y
  `assess` levanta `THIRD_PARTY_FX_EXPOSURE`: al proveedor se le paga al tipo de cambio del día del pago.
- **Vigencia:** `quoteDate` fuera de `effectiveFrom`–`effectiveUntil` → `STALE_SOURCE` (exit 2): se pide una
  cotización nueva al proveedor, no se estira la fecha. `status: "estimated"` calcula en revisión; `"pending"`
  bloquea (`MISSING_SOURCE_CONFIRMATION`). `runNotices.priceDates` avisa antes (`subject` `third_party_quote`).

**4. Reserva de contingencia.**

- Qué es: un registro del catálogo (`contingency_reserve`: `{ label, rate, base: human|own_costs, offerId?,
  engagementForm? }`) que el motor agrega como **costo** a cada fila del equipo (`base × rate`). Nunca descansa
  sobre una fila de terceros.
- Cuándo aplica hoy: 12 % del costo de persona (`base: human`) en `creative-managed-service` y
  `seo-aeo-managed-service` cuando la demanda declara `engagementForm: "on_demand"`. No aplica On-Going ni en
  staffing (el cliente dirige el trabajo). Verla: `catalog search --current --kind contingency_reserve`. El 12 % es
  el colchón que el operador usó en una oferta de licitación; lo propuso el agente y el CEO lo aceptó el 2026-10-11
  como estimación. No se declara nada para tenerla.
- **Es un costo, así que se vende** con el margen de la oferta y la razón de On-Demand, y sube `floorNet`. En el
  ejemplo, 436.800 de costo son unos 870.000 de precio.
- **Renuncia:** `"contingency": { "kind": "waived", "reason": "…" }` en el `brief`. La reserva pasa a 0, el precio
  baja en lo que valía, `totals.contingencyReserveWaived` informa lo renunciado (`contingencyBase` queda en 0), sale
  `CONTINGENCY_RESERVE_WAIVED` en `reviewSignals` y en `assess`, y la cotización sigue en 1.4.0. La decide el
  operador y lleva su motivo. Sin reserva que renunciar → `CONTINGENCY_WAIVER_WITHOUT_RESERVE` (exit 2).
- **Forma no declarada:** calcula sin reserva y `assumptions` trae
  `CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM`. No se presenta así: se pregunta la forma y se vuelve
  a correr.

**5. Cuándo sale 1.4.0.** Sólo si el brief refactura al menos un costo o si una reserva prevalece para la cotización
(también renunciada). Si no, rige la cadena anterior y las cotizaciones previas quedan idénticas byte a byte. 1.4.0
es un superconjunto: admite neto acordado, redondeo, factor de mercado y forma.

**6. Leer el resultado: dos márgenes.**

- `totals` suma `thirdPartyCost`, `thirdPartyNet`, `ownWorkMarginRate`, `contingencyReserve`, `contingencyBase` y
  `contingencyReserveWaived`. El resumen agrega `ownWork { cost, net, marginAmount, marginRateRoundedDown }`,
  `thirdParty { reinvoiced { cost, net, marginAmount, shareOfNet, rows[] }, clientDirect[], fxExposed[] }` y
  `contingencyReserve { rate, base, amount, baseAmount, shareOfNet, waived, … }`. El resumen **no** trae el nombre
  del proveedor ni la referencia de su cotización: un costo se nombra por `costId`, `label` y categoría.
- **La regla:** `marginRateRoundedDown` sigue siendo el margen real, pero **mezclado**: baja con todo lo que se
  refactura al costo o cerca y **no es el número que se compara con el piso de la oferta**. Ese número es
  `ownWork.marginRateRoundedDown`. No hay veredicto a nivel de cotización sobre ninguno: el piso se juzga por fila
  (una del equipo contra su política, una de terceros contra su categoría). Informar los dos, cada uno con su nombre.
- Ejemplo de referencia: costo 14.750.055, neto 21.033.333, margen mezclado 29,87 %; terceros costo 9.083.333 y neto
  9.663.333; trabajo propio neto 11.370.000 a 50,16 %; reserva 436.800 = 12 % de 3.640.000; ninguna fila bajo su
  piso.
- `estimateExposure`: la cotización estimada de un proveedor es un dato del ranking (`kind` `third_party`); la
  reserva y las reglas de terceros estimadas van en `estimatedRules`.

**7. Las lecturas del artefacto con terceros.**

- `explain`: `commercialAdjustments.thirdPartyPolicies[]` y `.contingencyReserve`; filas de terceros en el desglose
  de costo; la reserva bajo su propia clave.
- `compose assess`: `margin.ownWorkRate` y `margin.proposedFloorReadOn: "ownWorkRate"` (`belowProposedFloor` se lee
  sobre el trabajo propio). Gaps nuevos: `THIRD_PARTY_COST_EVIDENCE_REQUIRED`, `THIRD_PARTY_FX_EXPOSURE`,
  `THIRD_PARTY_SCOPE_AND_TERMS_REQUIRED`, `THIRD_PARTY_TAX_TREATMENT_REVIEW` (sólo con impuesto `exclusive` y un
  costo refacturado) y `CONTINGENCY_RESERVE_WAIVED`.
- `compose preview` (la proyección para el cliente; el documento de `compose document` sale de ella): el fee es sólo
  el trabajo propio; un ítem por costo de terceros con su `label` y su neto final; `clientPaidDirectly[]` después de
  los totales, en su moneda y sin convertir. Nunca un proveedor, un costo, una tasa ni la reserva.
- `compose document`: el fee es una línea (clave `fee`) y cada costo refacturado otra (`third_party:<costId>`, grupo
  «Costos de terceros»); lo que el cliente paga directo se imprime en un bloque aparte, en su moneda, fuera de todo
  total. La reserva no aparece: está dentro del fee.
- `compose split`: tres partes cuando hay filas de terceros (`tools + person + thirdParty = net`); la reserva queda
  dentro de `person`.
- `compose cash`: naturalezas `thirdParty` y `contingencyReserve`; **`newSupplierCash` incluye lo que se les paga a
  los proveedores de los costos refacturados**; la reserva es una provisión dentro del costo, no es caja de nadie ni
  capacidad; lo que paga el cliente se lista y no se cuenta. La fecha de pago a un proveedor no se puede leer.
- `compose schedule`: reparte todo el neto, terceros incluidos; `thirdParty.byPeriod` muestra dónde los hitos
  puestos en un periodo son menores que el costo de proveedores de ese periodo (lo que la empresa adelanta).
- `compose commitments`: las compras a terceros quedan **fuera** a propósito; dice cuántas vio y que sus condiciones
  no están congeladas (`THIRD_PARTY_PURCHASE_TERMS_NOT_FROZEN`). Que no aparezca un compromiso no significa que no
  lo haya.

**8. Diagnósticos (exit 2, en `diagnostics`, salvo donde se indica).**

- `MISSING_CATALOG_SELECTION` / `AMBIGUOUS_SELECTION` en `thirdPartyCosts.<costId>.policy`: categoría sin regla
  vigente / con dos del mismo nivel. En el carril `calculate` el faltante se llama `MISSING_THIRD_PARTY_POLICY`.
- `INVALID_THIRD_PARTY_AMOUNT` (más decimales que la moneda del proveedor), `DUPLICATE_THIRD_PARTY_COST_ID`
  (`costId` repetido o igual a un `lineId`), `INVALID_THIRD_PARTY_SCHEDULE` (`periodIds` repetido o fuera del
  plazo), `THIRD_PARTY_COST_OUTSIDE_ACTIVE_PERIOD` (costo refacturado en un periodo sin ninguna línea activa),
  `UNCONFIRMED_THIRD_PARTY_COST` (sólo en `mode: "commercial_draft"`, evidencia sin confirmar).
- `STALE_SOURCE` / `MISSING_SOURCE_CONFIRMATION` en `periods.<n>.request.thirdPartyCosts.<i>.source`.
- `INVALID_ADJUSTMENT_LINE`: un `discount` o un `agreed_net` `monthly`/`setup` nombra un `costId`, o un `agreed_net`
  `third_party` nombra una línea o un costo `client_direct`.
- `AMBIGUOUS_CONTINGENCY_RESERVE` en `contingency` (dos registros del mismo nivel: error del catálogo),
  `CONTINGENCY_WAIVER_WITHOUT_RESERVE` en `contingency`, y `CONTINGENCY_RESERVE_WAIVED` (exit 3, señal de revisión,
  no bloquea).
- Exit 1, `SCHEMA_INVALID`: falta `evidence` en un costo `reinvoiced`, falta `reason` en la renuncia, sobra un campo.

**9. No modelado, y se dice:** cuándo se le paga a un proveedor y si una compra obliga más allá del trabajo (plazo
mínimo, derechos de uso que siguen); una comisión sobre lo que paga el cliente; una tarifa registrada de proveedores
recurrentes; tratamiento de impuestos por fila; una cotización sólo de terceros, sin línea de equipo; la reserva para
un servicio On-Going ganado en licitación con multas; la liberación de la reserva después de la entrega. En el
ledger: `THIRD_PARTY_AND_CONTINGENCY`.

## Presentar persona y kit de herramientas (delta 2026-10-11)

`compose split --input <artefacto> --tools <id,id|all> [--label …] [--out …]` presenta el neto ya cotizado en dos
cifras por fila: persona y kit de las herramientas elegidas. Es lectura de un artefacto congelado (se verifica con
replay antes): `tools.net + person.net` = neto de la fila, el total no cambia, exit 3. `--tools` es obligatorio; qué
se muestra aparte lo decide el operador (recomendado: base de trabajo dentro del fee; especializadas e IA aparte).
El kit toma el precio de política de esas herramientas con el ajuste de la fila y sube al múltiplo de la moneda; el
factor de mercado y el redondeo de la fila quedan en la persona. Informar `person.belowFloor` y
`partsBelowFloorWhileRowMeetsIt` si aparecen; no corregirlos a mano. La salida trae costos: no va al cliente.
Rechazos: `SPLIT_TOOL_NOT_ATTRIBUTED`, `SPLIT_REQUIRES_CALCULATED_QUOTE`, `SPLIT_ATTRIBUTION_NOT_TRACEABLE`.
Bajo el contrato 1.3.0 el kit lleva la razón de la forma como cualquier componente. Ejemplo de referencia con
`--tools adobe,higgsfield,magnific`: kit 190.000 + persona 2.600.000 = 2.790.000. Bajo el contrato 1.4.0, con filas
de terceros, son tres partes (`thirdParty`) y la reserva queda en la persona.

## Tres lecturas del artefacto: calendario, caja y compromisos (delta 2026-10-11)

Como `compose split`: leen un artefacto de composición, lo verifican con replay antes (alterado → `REPLAY_MISMATCH`),
no recalculan ni cambian nada, no reciben `--current`, aceptan `--out` (ruta nueva) y devuelven exit 3. Se corren
cuando el pedido lo pide, sobre todo en un trabajo acotado. Las tres salidas traen costos: no van al cliente. Lo
que cada una agrega con costos de terceros o reserva está en el
[paso 7 de la sección anterior](#costos-de-terceros-y-reserva-de-contingencia-delta-2026-10-11-noche).
Detalle, tablas y ejemplo en el manual,
[«Tres lecturas de una cotización»](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#tres-lecturas-de-una-cotización).

- **`compose schedule --input <artefacto> --milestones <hitos.json> [--out …]`** — calendario de pagos. El archivo es
  un arreglo JSON de `{ id, label, share, periodId? | when? }`; `share` es una cadena decimal y las partes suman
  exactamente 1 (máximo 60 hitos). Los montos suman exactamente el neto; cada uno se lee al múltiplo de redondeo de
  la cotización y el último recibe el resto (`remainder`). Impuestos sólo si la cotización los resolvió. **Es un
  calendario: no es factura, cobro ni precio nuevo**, y nada comprueba una fecha o una aceptación. Los porcentajes
  los decide el operador. Rechazos (exit 1): `SCHEDULE_MILESTONES_INVALID` con `option: "milestones"` e `issues`
  (`shares_must_sum_to_one`, `share_not_decimal`, `duplicate_id`, `unknown_period`, `period_and_when`,
  `amount_not_representable`…), `SCHEDULE_REQUIRES_CALCULATED_QUOTE` sobre una cotización bloqueada y
  `MISSING_ARGUMENT` sin `--milestones`.
- **`compose cash --input <artefacto> [--out …]`** — lectura de caja: neto, costo completo y margen (leídos, no
  recalculados), costo por naturaleza (`people`, `provisions`, `platformFee`, `setup`, `toolCreditBudgets`,
  `toolSeatsAndPackages`; en 1.4.0 también `thirdParty` y `contingencyReserve`), `newSupplierCash` (la caja **nueva**
  a proveedores: packs extra de créditos y, en 1.4.0, el costo de cada tercero refacturado) y
  `cashAddedOnContractedCapacity` = neto − caja nueva. **Esa cifra no es un margen y no decide precio**
  (`isMargin: false`, `decidesPrice: false`): supone que las personas son capacidad ya contratada y que no se compra
  ningún asiento para el trabajo, y lo dice en `restsOn` y `notDerivable`. El margen que decide la viabilidad es el
  del costo completo. Siempre informar la cifra con sus supuestos. Rechazo:
  `ENGAGEMENT_CASH_REQUIRES_CALCULATED_QUOTE`.
- **`compose commitments --input <artefacto> [--out …]`** — compromisos con proveedores que duran más que los
  periodos cotizados: herramientas con precio por año, herramientas mensuales con `commitmentTermMonths` declarado y
  créditos de IA que sobran con su vencimiento. Por cada uno: `committed`, `attributedWithinPeriods`, `unrecovered` y
  `sharing`: si la cotización es el único usuario declarado, el resto queda **varado**
  (`strandedIfNothingElseUsesIt`); si es parte de una capacidad compartida (una de tres licencias), **vuelve al
  paquete** (`releasedToSharedCapacity`). También lista precios de la misma herramienta con menos compromiso y, en
  `notDerivable`, las herramientas que no declaran plazo. Exit 3 (2 si la cotización no está calculada). Con los
  plazos de hoy, Adobe aparece en un trabajo corto y Microsoft 365 y Notion no. Con `commitmentRenewsOn` el plazo se
  lee como ya corriendo: `commitment.boundUntil` es la primera renovación posterior al último mes cotizado y queda
  comprometido sólo lo que falta hasta ahí; si la cotización cruza una renovación, ata hasta la siguiente y suma
  `COMMITMENT_RENEWS_WITHIN_ENGAGEMENT` (mismo importe, no se suma). Ejemplo de referencia vuelto a cotizar con
  `--current` (policy v10): un mes de Adobe, CLP 108.468, liberado al paquete, atado hasta el 2026-11-16.
- **Límites de la lectura de compromisos, que se dicen al informarla:** no distingue un trabajo de un mes de un mes
  representativo de un servicio continuo (conoce periodos, no la duración del contrato): es un comando para trabajos
  acotados, no un aviso automático. **Un precio con plazo y sin fecha de renovación se lee como un plazo entero desde
  el primer mes cotizado**: ese monto es un techo y no se presenta como cifra cierta. Con fecha, un mes cubierto en
  parte cuenta entero (hasta un mes de más) y no conoce las condiciones de salida. No sabe si el asiento ya
  existe ni quién tiene las otras licencias. Depende de la policy que congeló el artefacto
  (`designer-on-demand.artifact.json` congeló la v7): decir de qué artefacto es la lectura. **Informa; el operador
  decide** si un compromiso es aceptable.

## Documento de cotización para el cliente (delta 2026-10-11, cierre)

Cuando el operador pide «la cotización» de una cotización V3, el entregable es un PDF: la
[plantilla A4 de cotización](../../../../docs/commercial/templates/cotizacion-a4/README.md), versión 2 de sus datos
(decisión del CEO, 2026-10-11). `compose document` emite esos datos desde el artefacto congelado y el generador de la
plantilla los compone. El manual de la plantilla es la autoridad sobre su contrato de datos, su paginación y su
revisión; aquí, lo que hace el agente. Como las otras lecturas: verifica el artefacto con replay antes (alterado →
`REPLAY_MISMATCH`), no recalcula ni cambia ningún total, no recibe `--current`, `--out` es una ruta nueva
(`OUTPUT_EXISTS` si existe) y devuelve exit 3.

**1. Secuencia de trabajo.**

1. Cotizar: `compose quote --current --input demanda.json --out artefacto.json`.
2. Revisar: `compose assess --input artefacto.json`, pisos y señales. Una excepción bajo un piso es del CEO.
3. Andamio del brief: `pnpm --silent pricing:v3 compose document --input artefacto.json`. Imprime
   `pricing-v3-quote-document-scaffold/1` y sale con **exit 2** (falta el brief; no es un error): `quote` (fecha,
   moneda, periodos, neto, impuesto y total que el documento va a decir), `lines[]` (cada línea ya plegada, con su
   `key`, su etiqueta y su grupo por defecto), `optional` (los campos opcionales) y `brief` (el esqueleto por
   llenar). Con `--out brief.json` guarda sólo el esqueleto.
4. Llenar el brief **sólo con textos** (paso 2 de esta sección).
5. Emitir los datos: `pnpm --silent pricing:v3 compose document --input artefacto.json --brief brief.json --out
   datos.json` (exit 3).
6. Componer: `node scripts/documents/render-cotizacion-a4.mjs --data datos.json --out <carpeta nueva o vacía>`.
   Escribe `cotizacion.html`, `cotizacion.pdf`, `datos.json`, `manifest.json` y capturas en `qa/`
   (`pagina-N.png`, `mobile.png`). Necesita Chromium local (Playwright).
7. Leer las capturas de `qa/` y **todas** las páginas del PDF: textos, cortes, importes contra el resumen de la
   cotización. El manifiesto nace con la revisión visual pendiente.
8. Entregar el PDF **como borrador** mientras el precio no esté aprobado, y decirlo.

**NUNCA digitar una cifra en el brief ni editar los datos emitidos.** Si un número debe cambiar (precio, plazo,
impuesto, un costo de terceros, la moneda), se cambia la demanda, se vuelve a cotizar y se repiten los pasos 3 a 7.
Si sólo cambia un texto, se edita el brief y se repiten 5 a 7, con `--out` y carpeta nuevos.

**2. El brief (`pricing-v3-quote-document-brief/1`, estricto).**

- Trae lo que la cotización no sabe: `reference`, `supplier { name, taxId, contact, email, phone }`,
  `buyer { name, unit, taxId, logo? }`, `cover { label, title, subtitle }`, `service { name }`,
  `scope { title, intro, rows[] }` (1 a 7 filas `{ title, text }`), `schedule { title, note, phases[] }` (calendario
  **del trabajo**, 1 a 3 fases `{ label, title, text }`), `pricing { title, intro, summary, taxNote, taxLabel?,
  monthly? }` y `conditions { title, rows[] }` (1 a 6). Opcionales: `locale`, `lines`, `paymentMilestones` y
  `paymentScheduleTexts`. Un título es una línea o un arreglo de hasta tres; todo es texto plano.
- **No tiene clave para un monto, una moneda, una tasa de impuesto ni una fecha.** La fecha del documento es
  `quoteDate`; la moneda, la de salida de la cotización, sin conversión. Un brief que trae una clave de más se
  rechaza. `pricing.monthly` es `{ months, note }`: una **cantidad de meses** con la que la plantilla divide los
  totales, no un importe; lo decide el operador.
- Un andamio sin llenar no pasa: un texto vacío se rechaza.
- Los textos se escriben por cotización, desde el alcance y las condiciones del expediente; nada los trae de un
  catálogo ni de una biblioteca de condiciones. Vigencia, forma de pago y condiciones las decide el operador: no
  inventarlas. Datos del emisor: [Datos para licitaciones](../../../../docs/commercial/EFEONCE_DATOS_PARA_LICITACIONES.md).
- `buyer.logo` es `{ path, source }`: un archivo local ya descargado y la fuente oficial HTTPS de donde salió. Sin
  logo se imprime el nombre.

**3. Las líneas y sus claves.**

- Las líneas salen de la misma función cliente-segura que `compose preview`: ni costo, ni margen, ni tasa, ni
  proveedor, ni política, ni id interno. Un servicio gestionado es **una línea de fee**, nunca equipo y horas.
- Claves (para nombrar una línea en `brief.lines`; nunca se imprimen). Servicio gestionado: `fee`, `setup`,
  `third_party:<costId>`. Cotización vendida por líneas: `<lineId>`, `<lineId>:setup`, `third_party:<costId>`. El
  andamio las lista; no adivinarlas.
- Por clave, `brief.lines.<clave>` admite `label`, `detail` y `group` (una línea de texto cada uno). Una clave que
  la cotización no tiene, o un campo distinto de esos tres, es un rechazo.
- **Revisar cada etiqueta por defecto**: viene del catálogo y puede estar en inglés o ser genérica (un perfil sale
  con su nombre de catálogo; la puesta en marcha, «Implementación inicial»; el fee, «Servicio gestionado — fee del
  periodo»). Se reescribe con `label`. Una etiqueta nunca nombra un proveedor, un costo ni una tasa.
- Grupos por defecto: «Servicio» (fee y líneas), «Puesta en marcha», «Costos de terceros». Las líneas se ordenan por
  grupo, en el orden en que cada grupo aparece.

**4. Plegado por meses (lo hace la lectura; no se configura).**

- Meses consecutivos en que una clave tiene el mismo neto son **una** línea: cantidad `n meses`, valor unitario = el
  neto de un mes, neto = su suma exacta. Un solo mes de fee o de línea: `1 mes`.
- Una puesta en marcha o un costo de terceros que cae en un solo periodo es `1 pago único`, sin valor unitario; el
  mismo costo repetido en meses consecutivos se cuenta en meses, como el resto.
- Una clave cuyo neto cambia da una línea por tramo, con los meses como detalle automático («Mes 3», «Meses 1 a
  2»). Un `detail` del brief reemplaza ese detalle en todos sus tramos: no ponerlo en una clave con varios tramos.
- Un mes con neto cero no se cobra y no imprime nada.

**5. Impuesto.** Sale del tratamiento con que se congeló la cotización; el brief sólo puede nombrarlo
(`pricing.taxLabel`) y explicarlo (`pricing.taxNote`).

- `exclusive` → la tasa y `taxAmount` = el impuesto que la cotización congeló. El documento imprime **esa** cifra,
  nunca un segundo cálculo: la cotización tributa mes a mes y calcular una vez sobre el total puede diferir en
  unidades. El manifiesto lo registra como `amounts.taxSource: "stated"`.
- `not_resolved` → impuesto y total «Por confirmar». No asumir una tasa para «completar» el documento: se resuelve
  en la demanda.
- `not_applicable` → «No aplica»; el total es igual al neto.

**6. Bloques opcionales.**

- Costos que el cliente paga directo a su proveedor (`client_direct` de la demanda): se imprimen solos, en un bloque
  aparte, en su propia moneda, fuera de todo total. No se declaran en el brief.
- Calendario de pagos: `brief.paymentMilestones`, la misma lista que recibe `compose schedule --milestones`
  (`{ id, label, share, periodId? | when? }`, partes que suman 1; **nunca montos**). Aquí cada hito necesita
  `periodId` o `when`, y son a lo más 12. `paymentScheduleTexts { title?, note? }` sólo junto con los hitos. Los
  porcentajes los decide el operador.

**7. Rechazos (exit 1, stdout vacío; `option` dice qué corregir: `brief` o `input`).** Cada uno sale en lugar de un
documento equivocado; ninguno se resuelve tocando cifras.

- `QUOTE_DOCUMENT_BRIEF_INVALID` (`option: "brief"`): el brief no cumple. `issues` trae hasta 20 `{ path, rule }`,
  por posición y sin contenido: `unrecognized_keys` (una clave de más, como un monto), `unknown_key` en `lines.<n>`
  (clave que la cotización no tiene; `<n>` es su posición en el mapa), `unknown_field`, `invalid_label|detail|group`,
  `requires_payment_milestones`, `timing_required` (hito sin `periodId` ni `when`).
- `SCHEDULE_MILESTONES_INVALID` (`option: "brief"`): los hitos, con las reglas de `compose schedule`
  (`shares_must_sum_to_one`…), bajo `paymentMilestones`.
- `QUOTE_DOCUMENT_REQUIRES_CALCULATED_QUOTE`: la cotización está bloqueada; se resuelve en la demanda.
- `QUOTE_DOCUMENT_LINES_DO_NOT_ADD_UP`: las líneas no suman exactamente el neto de la cotización. No hay tolerancia.
- `QUOTE_DOCUMENT_NOT_REPRESENTABLE`: un importe que la moneda no representa, una moneda que la plantilla no
  formatea, más de 40 líneas, más de 8 costos pagados por el cliente, o dos filas con la misma clave.
- `QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE`: el impuesto congelado no corresponde a su tasa sobre ese neto (más allá
  del redondeo de sus meses), o la tasa tiene más de cuatro decimales.
- Los cuatro últimos son de la cotización (`option: "input"`): reportarlos; no «arreglarlos» en el brief.
- El generador tiene los suyos: «Contenido fuera del A4» (dice qué acortar: se acorta el **texto** en el brief —un
  título de portada largo es el caso típico, la portada es una página fija— y nunca se reduce la tipografía), y una
  carpeta de salida con archivos (usar una nueva).

**8. Lo que se entrega y lo que no.** Al cliente va el PDF. `datos.json`, el brief, el manifiesto y las capturas son
internos. Los datos llevan `status: "draft"` y `source { system, calculationId, digest, engineVersion }`, que llega al
manifiesto y no se imprime: así se sabe de qué cotización salió un PDF. Un documento producido aquí **no** es un
`quotation_id`, un precio aprobado ni una cotización emitida, y no registra nada en Greenhouse ni en el CRM: la
frontera de la [promoción canónica](../../../../docs/documentation/finance/cotizador-v3-promocion-canonica.md) no
cambió. Enviarlo es otra acción, con su propia autorización.

**9. Ejemplos versionados** (`data/pricing/v3-operating/`; por cada uno `<nombre>.document-brief.json`, con un
comprador inventado, y `<nombre>.document.json`, lo que emite la CLI). Volver a correrlos antes de citar una cifra.

- `designer-on-demand` (un mes, impuesto sin resolver): una línea de `1 mes` por 2.470.000 y una puesta en marcha de
  `1 pago único` por 320.000 = neto CLP 2.790.000; impuesto y total «Por confirmar». 4 páginas.
- `designer-three-months-iva` (también `.demand.json` y `.artifact.json`; tres meses, IVA 19 % como fuente de
  ejemplo, no un criterio tributario): `3 meses` × 2.550.000 = 7.650.000 + 320.000 = neto 7.970.000; IVA 1.514.300;
  total 9.484.300. 4 páginas. El mes difiere del ejemplo anterior porque aquél congeló una policy anterior.
- `managed-on-demand-third-party` (contrato 1.4.0, impuesto sin resolver): fee 11.370.000 + tres costos de terceros
  refacturados (4.950.000 + 1.380.000 + 3.333.333) = neto 21.033.333; un costo de USD 890 que paga el cliente,
  aparte; calendario de pagos 50/30/20: 10.520.000 / 6.310.000 / 4.203.333. 5 páginas.

**10. No modelado, y se dice.**

- Número de cotización, historial de versiones, verificación por QR, firmas, aprobación, envío y CRM: existen sólo
  en el cotizador de Greenhouse, al que esta lectura no escribe. Llevar este diseño a ese cotizador es la dirección
  acordada y **no está empezada**: no prometerla ni describirla como disponible.
- Persona + kit de herramientas (`compose split`) no es un diseño de documento: el documento imprime las líneas de
  la cotización.
- Una moneda de presentación distinta de la de la cotización: la versión 2 rechaza la conversión. Otra moneda es
  otra cotización (`brief.outputCurrency`) y otro documento.
- Portada, alcance y condiciones son páginas fijas (7 filas de alcance, 3 fases, 6 condiciones); sólo la sección de
  inversión pagina.
- Un precio aprobado fuera de V3 no pasa por aquí: se digita en la plantilla según su manual, con su fuente en el
  expediente.

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
   y `apply` y recién bloquea al cotizar con `AMBIGUOUS_SELECTION` en `lines.<lineId>.talentFactor`. Lo mismo un
   kit que sigue listando un recurso retirado: pasa `preview` y `apply` y al cotizar da
   `MISSING_CATALOG_SELECTION` en `lines.<lineId>.<requirementId>`; el kit se reemplaza en el mismo change-set que
   retira el recurso (así lo hizo `engagement-forms-setup-clp.change.json`, v8 → v9). Y una tarea agregada a la
   receta de un perfil deja `needs_input` las demandas existentes con ese perfil: probarlas. Dos registros de
   reserva del mismo nivel dan `AMBIGUOUS_CONTINGENCY_RESERVE` al cotizar; y **un registro de reserva que termina o
   se retira no bloquea nada**: la cotización siguiente sale sin reserva, sin diagnóstico y en su contrato anterior
   (sólo lo nota una demanda que renuncia). Al tocar una reserva, cotizar un servicio gestionado On-Demand y
   comprobar que `contingencyReserve` sigue en el resumen.
5. Mover el puntero: `current show` → copiar `pointerDigest` →
   `current set --catalog A --policy B --credits C --reason "…" --confirm <pointerDigest>`. Las tres rutas van
   escritas y dentro del repo (`current set` no acepta `--current`); versión y digest los calcula la CLI.
   `--out otro.json` escribe el puntero en otra ruta para revisarlo (`current show --input otro.json`). Digest
   equivocado → `CURRENT_VERSIONS_CONFLICT`; sin `--confirm` al reemplazar → `MISSING_ARGUMENT`.
6. Verificar: `current show` exit 0 con `consistent: true` (exit 2 si no; `status` por fuente: `match`,
   `version_mismatch`, `digest_mismatch`, `invalid`, `unreadable`) y `pnpm pricing:v3:test` verde. Una guarda exige
   que el puntero nombre la versión de número más alto de cada carpeta: emitir sin mover el puntero la deja en rojo.

No editar `current.json` a mano, ni editar o borrar una versión anterior: los artefactos congelados dependen de ellas.

Registros y campos del 2026-10-11 por la tarde, con sus change-sets reales, en el manual del catálogo
([«Forma del compromiso, puesta en marcha y plazos de proveedor»](../../../../docs/manual-de-uso/finance/catalogo-v3-seleccion-y-actualizacion.md#forma-del-compromiso-puesta-en-marcha-y-plazos-de-proveedor)):
la clase `engagement_factor` `{ form, priceRatio, offerId? }` (un registro por forma y nivel; cambiar la razón es
`replace`), las provisiones de puesta en marcha y los requisitos `setup`/`recruiting` de los kits, `fx:CLP:USD` (el
inverso de `fx:USD:CLP`; se mueven juntos), y en la policy un precio en CLP como se factura, `commitmentTermMonths`,
`commitmentRenewsOn` y un `priceId` aparte para el importe con un descuento que termina. Change-sets:
`engagement-forms-setup-clp.change.json` (catálogo v8 → v9), `adobe-invoice.change.json` (policy v6 → v7),
`supplier-contract-terms.change.json` (v7 → v8), `microsoft-invoice-adobe-renewal.change.json` (v8 → v9) y
`adobe-without-discount.change.json` (v9 → v10).

Registros del 2026-10-11 por la noche, en
[«Costos de terceros, reserva de contingencia y factores de país cerrados»](../../../../docs/manual-de-uso/finance/catalogo-v3-seleccion-y-actualizacion.md#costos-de-terceros-reserva-de-contingencia-y-factores-de-país-cerrados):
la clase `third_party_policy` `{ category, label, method: markup|target_margin, rate, minimumMargin, rounding:
commercial|none, offerId? }` (un registro por categoría y nivel; el piso no puede pedir más margen del que da el
método: `INVALID_THIRD_PARTY_POLICY`) y la clase `contingency_reserve` `{ label, rate, base: human|own_costs,
offerId?, engagementForm? }` (tasa mayor que 0 y menor que 1: `INVALID_CONTINGENCY_RESERVE`; prevalece el registro
que nombra más dimensiones). **Cambiar una tasa es un change-set con un `replace` de un registro**; nunca se escribe
en una demanda. Change-set: `third-party-contingency-factors.change.json` (catálogo v9 → v10): 5 reglas de terceros
y 2 reservas (`estimated`, desde 2026-10-11) y 8 factores de país confirmados sin cambiar su valor (desde
2026-10-12). Los factores quedaron cerrados: no se prepara un cambio para «validarlos».

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
  excepciones, formas del compromiso y su razón, montos de puesta en marcha, plazos de proveedor): son del operador
  (CEO). Atribuirle lo que propuso el agente: la fecha de revisión 2027-04-11, el FX EUR→USD 1.20, el 10 % de
  On-Demand (lo mantuvo el agente por su encargo), y los montos de puesta en marcha, las reglas de terceros y el
  12 % de la reserva (los propuso el agente; él los aceptó como estimaciones).
- Reabrir los factores de país: el CEO los cerró el 2026-10-11 y están confirmados desde el 2026-10-12. No
  presentarlos como estimados, como un dato por validar ni como una decisión que él deba. Tampoco pedir el precio de
  HubSpot como dato pendiente: hoy no hace falta en las cotizaciones.
- Cotizar un trabajo acotado sin declarar `engagementForm`, declarar On-Demand para subir un precio, usar
  `engagementCode` para expresar la forma, inventar un id de forma (Híbrido son dos cotizaciones) o tratar On-Demand
  como una oferta o un modelo de entrega.
- Aplicar el «mes de costo» del Excel como fee de reclutamiento y onboarding, agregar reclutamiento sin que haya que
  contratar a alguien, o presentar las dos provisiones como costos medidos.
- Atribuir un paquete entero de Adobe a una persona, quitarle el IVA, convertirlo a USD a mano, olvidar
  `fx:CLP:USD`, elegir `invoiced-with-discount` sin que el operador lo decida, nombrar `renewal-scenario`, o excluir
  `express-design` sólo para que la corrida pase.
- Usar `cashAddedOnContractedCapacity` como margen o para decidir un precio; presentar el calendario de pagos como
  factura o cobro; decidir qué compromiso con un proveedor es aceptable; presentar como cifra cierta el monto
  comprometido de un precio con plazo que no declara fecha de renovación; entregar al cliente la salida
  de `split`, `schedule`, `cash` o `commitments`.
- Prometer lo que el cotizador no modela en un trabajo acotado: duración del contrato, periodos menores a un mes y
  lo que falta de terceros y reserva (cuándo se le paga a un proveedor, compromisos que siguen después del trabajo,
  comisión sobre lo que paga el cliente, liberación de la reserva).
- Escribir una tasa en la demanda para un costo de terceros, o calcular a mano el precio de su fila.
- Esconder un costo de proveedor dentro de una línea de persona, de una herramienta o de una provisión, o restarlo
  como un descuento; declarar `client_direct` lo que Efeonce va a pagar para sacarlo del margen.
- Renunciar a la reserva de contingencia para llegar a un precio sin decirlo, omitir `engagementForm` para que no
  entre, sumar una reserva a mano, o presentar el 12 % como un dato medido.
- Comparar el margen mezclado con el piso de la oferta (se compara `ownWork.marginRateRoundedDown`), o presentar uno
  de los dos márgenes con el nombre del otro.
- Mostrarle al cliente una lectura interna (resumen, `explain`, `assess`, `split`, `cash`, `schedule`,
  `commitments`): al cliente va la proyección de `compose preview` y, como entregable, el PDF que sale de
  `compose document`. Escribir un proveedor o su monto en `label`.
- Digitar un monto, una moneda, una tasa o una fecha en el brief del documento; editar a mano los datos que emitió
  `compose document` o el `datos.json` del generador; armar a mano un JSON versión 2 con cifras de una cotización V3.
  Si un número debe cambiar, se cambia la cotización y se vuelve a correr.
- Asumir una tasa de impuesto para que el documento no diga «Por confirmar», o reducir tipografía, recortar alcance
  u omitir una condición para que el documento quepa: se acorta el texto.
- Presentar el documento como cotización emitida, precio aprobado o `quotation_id`; ponerle un número de cotización
  de Greenhouse, una firma o un QR que no tiene; prometer que el cotizador de Greenhouse ya usa este diseño.
- Entregar el PDF sin haber leído sus capturas y todas sus páginas, o entregar junto a él el brief, los datos, el
  manifiesto o el artefacto.
- Estirar la vigencia de la cotización de un proveedor, marcarla `confirmed` sin respaldo, o nombrar el tipo de
  cambio de un costo de terceros en `fxRecordIds`.
- Ponerle fecha de término a un registro de reserva o retirarlo sin su reemplazo.
- Retirar un recurso del catálogo sin reemplazar en el mismo change-set los kits que lo nombran.
- Calcular una tasa a mano para llegar a un precio, o usar redondeo, ajuste o fecha para «cumplir» un piso.
- Emitir una versión sin mover el puntero; editar un archivo versionado o un artefacto congelado.
- Tratar una simulación calculada como costo validado, asignación live, aprobación de precio o cotización emitida.

## Mapa de implementación y evidencia reusable

| Responsabilidad | Fuente vigente |
| --- | --- |
| Kernel puro, markup/margen, factores de talento y de mercado, coberturas, FX, rounding; contratos 1.0.0/1.1.0/1.2.0/1.3.0/1.4.0, ajustes (`discount`, `agreed_net`, también de `billing` `third_party`), redondeo comercial, piso sobre el mercado base (`floorBasis`, `floorNet`), razón de la forma del compromiso (`engagementForm`, `engagementFactors`, `engagementAdjustment`), filas de terceros (`thirdPartyCosts`, `thirdPartyPolicies`), reserva de contingencia (`contingencyReserve`, `contingencyWaiver`) y registro de motores | `src/lib/finance/pricing-v3/calculate.ts`, `schemas.ts` |
| Registro cerrado de rechazos (dominio y adaptador), incluidos `SCHEDULE_*`, `ENGAGEMENT_CASH_*` y `QUOTE_DOCUMENT_*` | `src/lib/finance/pricing-v3/errors.ts` |
| Registros (incluye `price_rounding`, `talent_factor`, `market_factor` con `floorBasis`, `cost` con `localization` y las clases `engagement_factor`, `third_party_policy` y `contingency_reserve`)/brief con `engagementForm`, `thirdPartyCosts` y `contingency`/resolución/quote/explicación; selección de costo específico o de referencia con factor, selección de la forma (registro de la oferta antes que el general), de la regla de cada categoría de terceros y de la reserva (el registro que nombra más dimensiones), elección del contrato por cotización y recorrido del precio por fila | `src/lib/finance/pricing-v3/catalog/{contracts,catalog,resolve,quote,explain}.ts` |
| Demanda/policy y atribuciones; `excludedProfileTasks`, `bundledToolIds` y la regla `BUNDLED_TOOL_DOUBLE_COUNT` por persona o línea; `commitmentTermMonths` en el precio de la policy | `src/lib/finance/pricing-v3/resources/{composition-contracts,composition}.ts` |
| Packs/costo base/caja/caducidad | `src/lib/finance/pricing-v3/resources/credit-budget.ts` |
| Discovery/scaffold/portfolio/plan | `src/lib/finance/pricing-v3/resources/operating.ts` |
| Volumen → dedicación (`compose workload`) | `src/lib/finance/pricing-v3/resources/workload.ts` |
| Resumen derivado (`compose prepare`, `compose quote`, `replay`): líneas bajo el piso (`floorNet`, `netShortOfFloor`), `engineVersion`, `commercialAdjustments`, `priceRounding`, `marketFactor`, `engagementForm`, `ownWork`, `thirdParty`, `contingencyReserve`, `estimateExposure` | `src/lib/finance/pricing-v3/resources/summary.ts` |
| Fechas de precios: `priceReview` de `resources inspect` y `runNotices.priceDates` (incluye `third_party_quote` y el fin de un registro de reserva, que no bloquea); `reviewBy` en el contrato de la policy | `src/lib/finance/pricing-v3/resources/price-review.ts`, `composition-contracts.ts` |
| Puntero de versiones vigentes: schema, verificación, `--current`, `current show|set` | `src/lib/finance/pricing-v3/adapters/current-versions.ts`, `data/pricing/v3-operating/current.json` |
| Persona, kit de herramientas y terceros sobre un artefacto congelado (`compose split`) | `src/lib/finance/pricing-v3/resources/price-split.ts` |
| Calendario de pagos (`compose schedule`) y lectura de caja (`compose cash`) sobre un artefacto congelado | `src/lib/finance/pricing-v3/resources/engagement-view.ts` |
| Compromisos con proveedores más allá de los periodos cotizados (`compose commitments`) | `src/lib/finance/pricing-v3/resources/commitment-exposure.ts` |
| Documento de cotización para el cliente (`compose document`): schema del brief, andamio, plegado de líneas, impuesto y rechazos; ítems cliente-seguros que comparte con `compose preview` (`clientSafePeriodItems`) | `src/lib/finance/pricing-v3/resources/quote-document.ts`, `readiness.ts`, `__tests__/pricing-v3-quote-document.test.ts` |
| Plantilla A4 de cotización (contrato de datos versión 1 y 2, paginación, revisión) y su generador | `docs/commercial/templates/cotizacion-a4/{README,VERIFICACION,MULTIMONEDA}.md`, `scripts/documents/render-cotizacion-a4.mjs` |
| Ejemplos del documento: brief y datos emitidos de tres cotizaciones congeladas | `data/pricing/v3-operating/{designer-on-demand,designer-three-months-iva,managed-on-demand-third-party}.document{-brief,}.json` |
| Gaps económicos (incluye los `THIRD_PARTY_*` y `CONTINGENCY_RESERVE_WAIVED`), `costEvidencePriority`, margen propuesto leído sobre el trabajo propio, veredicto del piso por línea (con `marketFactor`) y proyección comercial redactada (`clientPaidDirectly`) | `src/lib/finance/pricing-v3/resources/readiness.ts` |
| Snapshots/digests/IO/mantenimiento local | `src/lib/finance/pricing-v3/adapters/{local-snapshot,catalog-local,resource-composition,resource-maintenance}.ts` |
| Adapter CLI, flags, exit, clasificación de errores, escritura exclusiva y `runNotices` | `scripts/commercial/pricing-v3.ts` |
| Guarda permanente: replay de todo artefacto congelado (`data/pricing/**` + SKY `acordado*`) | `src/lib/finance/pricing-v3/__tests__/pricing-v3-frozen-artifacts.test.ts` |
| Guarda permanente: el puntero nombra la versión de número más alto de cada carpeta | `src/lib/finance/pricing-v3/__tests__/pricing-v3-current-versions.test.ts` |
| Forma del compromiso de punta a punta (registro, resolución, contrato 1.3.0, piso, resumen/assess/explain, mantenimiento y CLI) | `src/lib/finance/pricing-v3/__tests__/pricing-v3-engagement-form.test.ts` |
| Lecturas del artefacto: calendario y caja; compromisos | `src/lib/finance/pricing-v3/__tests__/pricing-v3-engagement-view.test.ts`, `pricing-v3-commitment-exposure.test.ts` |
| Ejemplo de referencia On-Demand (primer artefacto 1.3.0, exigido por la guarda de artefactos congelados) | `data/pricing/v3-operating/designer-on-demand.{demand,artifact}.json` |
| Costos de terceros y reserva: kernel 1.4.0; resolución de reglas y reserva; resumen; lecturas del artefacto | `src/lib/finance/pricing-v3/__tests__/pricing-v3-third-party-reserve.test.ts`, `pricing-v3-third-party-reserve-resolution.test.ts`, `pricing-v3-third-party-readers-summary.test.ts`, `pricing-v3-third-party-readers-views.test.ts` |
| Clases de registro `third_party_policy` y `contingency_reserve`, con su change-set (catálogo v9 → v10) | `data/pricing/v3-operating/catalog.review-v10.json`, `third-party-contingency-factors.change.json` |
| Ejemplo de referencia con terceros y reserva (primer artefacto 1.4.0) | `data/pricing/v3-operating/managed-on-demand-third-party.{demand,artifact}.json` |
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
