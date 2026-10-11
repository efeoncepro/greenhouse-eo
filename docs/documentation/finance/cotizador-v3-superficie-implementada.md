# Cotizador V3: superficie local implementada

Estado verificado el 2026-10-09, TASK-2016/2019/2020/2021/2022. Este documento describe el comportamiento
ejecutable; el [contrato objetivo](cotizador-v3-contrato-y-validacion.md) conserva la dirección de evolución.
El [manual operativo](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) es la entrada para Codex y
Claude. El [cotizador canónico](cotizador.md) conserva su API, permisos, lifecycle y consumidores actuales.
Los párrafos fechados 2026-10-10 describen el endurecimiento posterior de la CLI (errores tipados, resumen
derivado y veredicto de piso); el resto conserva el estado verificado del 2026-10-09.
Los párrafos marcados «motor 1.1» describen el cambio posterior del mismo 2026-10-10: contrato 1.1.0 del kernel,
neto pactado, redondeo comercial y catálogo v4
([ADR](../../architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md)).
Los párrafos marcados «motor 1.2» describen el cambio del 2026-10-11: contrato 1.2.0 del kernel (el piso acompaña al
factor de mercado), factores de país con valor y catálogo v5
([delta del ADR](../../architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md#delta-2026-10-11--contrato-120-el-piso-acompaña-al-factor-de-mercado)).
Los párrafos marcados «versiones vigentes (2026-10-11)» describen el cambio posterior de ese mismo día, que no toca
ningún contrato del kernel: un puntero que dice qué versiones son las vigentes, precios unitarios que no vencen,
avisos de la corrida, la lectura de qué dato estimado pesa más y el catálogo v6. El resumen para leer primero está
en [Qué versiones se usan hoy](#qué-versiones-se-usan-hoy-2026-10-11).

## Qué versiones se usan hoy (2026-10-11)

Esta sección resume, en lenguaje simple, lo que cambia para quien cotiza. El detalle de cada punto está más abajo o
en el documento que se enlaza.

- **Un puntero dice cuáles son las versiones vigentes.** El archivo `data/pricing/v3-operating/current.json` nombra
  el catálogo de precios, la policy de recursos (las reglas y precios de herramientas) y el catálogo de créditos IA
  que se usan hoy. Al cotizar agregas `--current` y la CLI toma esas tres fuentes sin que escribas el nombre de
  ningún archivo. Ya no hace falta saber si «la vigente es la v5 o la v6»: `pnpm --silent pricing:v3 current show`
  lo responde. Cómo se mueve el puntero: [mantenimiento](cotizador-v3-mantenimiento-catalogo.md#puntero-de-versiones-vigentes-2026-10-11).
- **Un precio unitario no vence.** El precio de una licencia vale hasta que alguien lo reemplaza por otro. Lo que sí
  tiene es una fecha de revisión, que avisa cuando toca volver a mirarlo y nunca bloquea una cotización. La cantidad
  de licencias no es parte del precio: se declara en cada cotización.
- **El resumen puede traer avisos de la corrida.** Son notas sobre el momento en que se cotizó (por ejemplo, que la
  fecha de la cotización es anterior a valores más nuevos del catálogo). No forman parte de la cotización congelada
  y no bloquean. Claves y forma: [contrato](cotizador-v3-contrato-y-validacion.md#resumen-avisos-de-la-corrida-y-exposición-a-estimados-2026-10-11).
- **El resumen ordena qué datos estimados cargan más costo.** Para cada dato estimado dice cuánto costo descansa en
  él y cuántos puntos de margen se perderían si ese dato fuera 10 % más alto. Sirve para decidir qué confirmar
  primero. Cómo leerlo: [provisiones y costos](cotizador-v3-provisiones-y-costos.md#qué-dato-estimado-conviene-confirmar-primero-2026-10-11).
- **El costo de las personas es un costo objetivo.** Sale del Excel de pricing y representa el nivel salarial al que
  el CEO quiere llevar al equipo; no es la nómina de hoy. Por eso el margen real actual sobre las personas es mayor
  que el que muestra el cotizador. Detalle y límites:
  [provisiones y costos](cotizador-v3-provisiones-y-costos.md#la-base-de-costo-de-las-personas-es-un-costo-objetivo-2026-10-11).
- **Todavía no se puede emitir una cotización en EUR.** El catálogo v6 permite convertir a USD una herramienta que se
  paga en EUR, pero no existe la tasa inversa ni una regla de redondeo para EUR. A un cliente de España se le cotiza
  en USD.

Nada de esto convierte una simulación en un precio aprobado, un costo validado o una cotización emitida.

## Las piezas y sus versiones

| Pieza                     | Contrato ejecutable                                         | Qué recibe y qué devuelve                                                                      |
| ------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Núcleo                    | `schemas.ts`, `calculate.ts`                                | Request y snapshot resueltos, contrato `1.0.0`, `1.1.0` (motor 1.1) o `1.2.0` (motor 1.2); cálculo Decimal sin archivos, DB, HTTP, proveedores o LLM |
| Catálogo monetario        | `pricing-v3-catalog/1`                                      | Perfiles, costos, kits, asignación, precio, países, monedas, factores y FX con fuentes; desde el motor 1.1, también reglas de redondeo (`kind: price_rounding`); desde el motor 1.2, `floorBasis` opcional en `market_factor` |
| Brief                     | `pricing-v3-brief/1`                                        | Necesidad, selecciones y ajustes comerciales (`discount`, `agreed_net`); el resolver devuelve bindings, supuestos, pendientes y el contrato que emite al kernel |
| Policy de recursos        | `pricing-v3-resource-policy/1`                              | Base común, tareas, reglas de perfil, acceso, planes y capacidades; modo `review_only`. Versiones vigentes (2026-10-11): cada precio admite `reviewBy`, una fecha de revisión que avisa y no bloquea |
| Puntero de versiones vigentes | `pricing-v3-current/1` (`adapters/current-versions.ts`) | Versiones vigentes (2026-10-11): `data/pricing/v3-operating/current.json` nombra catálogo, policy y catálogo de créditos por ruta, versión y digest; `--current` lo usa y `current show\|set` lo lee y lo reemplaza |
| Fechas de los precios     | `resources/price-review.ts`                                 | Versiones vigentes (2026-10-11): lectura derivada de qué fechas de revisión pasaron, cuáles vencen pronto y qué vigencias ya terminaron; no cambia ningún precio ni resultado |
| Demanda compuesta         | `pricing-v3-composition-demand/1`                           | Brief, trabajo, usuarios, tareas, IA, allocations, presupuestos y cobertura cliente            |
| Plan                      | `pricing-v3-operating-plan/1`                               | Demanda y portfolio opcional; produce demanda resuelta sin elegir reparto arbitrario           |
| Portfolio                 | `pricing-v3-resource-portfolio/1`                           | Capacidad de clientes, interna y sin asignar; genera allocations y reconciliación              |
| Créditos                  | `pricing-v3-credit-catalog/1`, `pricing-v3-credit-budget/1` | Suscripción, paquetes y demanda por proveedor; presupuesto, caja y remanente                   |
| Mantenimiento monetario   | `pricing-v3-catalog-change/1`                               | Add/replace/retire y dimensiones nuevas; preview con impacto y sucesor con audit               |
| Mantenimiento de recursos | `pricing-v3-resource-change/1`                              | Replacement completo `policy` o `credits`; preview con impacto y sucesor nuevo                 |
| Composición congelada     | `pricing-v3-resource-composition/1`                         | Catálogo, policy, créditos, demanda y resultado completos; digest y replay verificable         |
| Preview                   | `pricing-v3-composition-preview/1`                          | Proyección local de precio, calendario e impuestos; no una cotización emitida                  |
| Resumen de composición    | `pricing-v3-composition-summary/1`                          | Lectura derivada del resultado congelado: bloqueos, señales, piso y caja; no decide nada. Motor 1.1 (aditivo): `engineVersion`, `commercialAdjustments`, `priceRounding`. Motor 1.2 (aditivo): `marketFactor` cuando el factor elegido cambia algo, y `floorNet` y `netShortOfFloor` por línea marcada. Versiones vigentes (2026-10-11, aditivo): `estimateExposure`; la CLI agrega además `runNotices`, que describe la corrida y no viene del resultado congelado |
| Rechazos                  | `errors.ts`, `PricingV3Error`                               | Registro cerrado de códigos de dominio y adaptador; el detalle sólo nombra opción o ruta       |
| Registro de motores       | `PRICING_V3_ENGINES` en `schemas.ts`                        | Contrato de entrada → motor que firma: `1.0.0` → `pricing-v3-local/1.0.0`, `1.1.0` → `pricing-v3-local/1.1.0`, `1.2.0` → `pricing-v3-local/1.2.0` (motor 1.2); cada uno con su `precisionPolicy` |
| Guarda de artefactos      | `__tests__/pricing-v3-frozen-artifacts.test.ts`             | Reproduce cada `*.artifact.json` bajo `data/pricing/**` y los dos del caso SKY versionados; exige uno firmado por cada motor registrado |

Fuentes ejecutables: [dominio](../../../src/lib/finance/pricing-v3/),
[CLI](../../../scripts/commercial/pricing-v3.ts), [fixtures operativas](../../../data/pricing/v3-operating/README.md).
Versiones de reproducción: motor `pricing-v3-local/1.0.0`, desde el motor 1.1 también `pricing-v3-local/1.1.0` y desde el motor 1.2 también `pricing-v3-local/1.2.0` (cada artefacto se reproduce con el que lo firmó; `ENGINE_VERSION` ya no existe), artefacto de snapshot `pricing-v3-local-artifact/1`, quote de catálogo `pricing-v3-selection-quote/1` y composición `pricing-v3-resource-composition/1`. Las tres versiones de artefacto no cambiaron.
Las propiedades desconocidas de los inputs estrictos se rechazan. Versiones o hashes incompatibles no se
reinterpretan con la versión más reciente.

## Del pedido al precio

El agente interpreta el pedido y el alcance. El dominio resuelve IDs, valida selecciones y calcula.
`scaffold` prepara una demanda editable y preguntas: no adivina plan, divisor, usuarios reales o presupuesto IA.
Los IDs `planned-*` representan capacidad por confirmar. `plan` incorpora el reparto de la cuenta declarada;
`compose quote` congela la demanda y las tres fuentes. `explain` y `replay` usan esa evidencia congelada.

Un perfil mantiene su variante, seniority y tier. Implementador, desarrollador, consultor HubSpot y consultor
premium conservan costos separados. La tarea SEO de un Copywriter añade SEMrush sin cambiarlo por un SEO
Specialist. El tier selecciona una política de precio; no convierte un perfil especializado en IP propietaria.

El país del talento define localización del costo; el mercado de oferta ajusta el precio humano. Son dimensiones
independientes de moneda y FX. `specific` usa costo del país y no recibe un segundo factor salarial.
`reference_adjusted` exige un factor desde el país de referencia. Histórico sin país sólo se admite bajo la
opción explícita de simulación; no constituye una remuneración colombiana, peruana o chilena vigente.

Motor 1.2 (2026-10-11): hasta `catalog.review-v4` ningún costo declaraba país y todos los factores de mercado valían
1, así que el país de la persona sólo producía un supuesto y el del cliente sólo cambiaba moneda y redondeo. En
`catalog.review-v5` las dos dimensiones tienen valores. Los 32 costos del workbook son `reference_adjusted` con
referencia Chile, y `talentCountry` los multiplica por el registro `talent_factor` de ese país: mueve el costo y,
con él, el precio. `offerMarketCountry` selecciona el `market_factor` del país del cliente, que multiplica sólo el
precio del componente humano. Un costo `specific` de un país reemplaza al factor de talento para ese perfil. Sin
factor para el país de la persona la cotización queda `needs_input`. Cómo componen los dos ejes:
[contrato 1.2.0](cotizador-v3-contrato-y-validacion.md#contrato-120--el-piso-acompaña-al-factor-de-mercado-2026-10-11).

## Cuenta económica y calendario

Se opera con cadenas decimales, decimal.js y precisión 80. Una tasa `"0.30"` significa 30%; markup y margen
objetivo son métodos diferentes. Las fórmulas pertenecen a [`calculate.ts`](../../../src/lib/finance/pricing-v3/calculate.ts); calendario/caja del catálogo a [`catalog/quote.ts`](../../../src/lib/finance/pricing-v3/catalog/quote.ts):

- Costo humano mensual = costo base × FTE facturable × personas × factor de talento aplicable × FX a moneda de cálculo.
- FTE solicitado = FTE explícito, o horas / horas por FTE de la política. Shared respeta su mínimo facturable;
  dedicated absorbe su FTE comprometido. Part time no implica shared ni licencia a media tarifa.
- Con markup, multiplicador = `1 + tasa`; con margen objetivo, `1 / (1 - tasa)`.
- Precio humano = costo humano × multiplicador × factor de mercado. Recursos elegibles reciben la política
  de precio cuando `basis=all_costs`; con `human_only` conservan costo como precio. El factor de mercado del contrato local se aplica al humano, no a todas las tools.
- Margen final = `(neto - costo) / neto`, después de descuento. Neto cero deja tasa de margen `null`.

Cada mes tiene resultado propio. `activePeriods` y `dedicationByPeriod` modelan activaciones y dedicación;
asignaciones de recursos indican meses específicos. El salario y políticas no se reprecian automáticamente
por mes. `uniformMonthlyNet=null` cuando el calendario no es uniforme. Setup se cobra una vez según su alcance.
Month/year/once distinguen recurrencia y pago; anual/12 es devengo, el compromiso anual se ve en `cashLedger`.
Variar una asignación anual o reactivarla tras pausa exige política, sin inventar cancelación o reembolso.

HALF_UP redondea cada línea a la precisión de su moneda; el total suma esas líneas. El único descuento global
se distribuye por base elegible con residual por mayor resto y desempate por `lineId`. No hay redondeo comercial
adicional ni cadena arbitraria de ajustes. Fee genérico de contratación/pagos, Assurance, gestión y setup son
recursos/coberturas explícitos: no porcentajes laborales o reservas escondidas ni una dependencia del nombre Deel.

Motor 1.1 (2026-10-10): el párrafo anterior describe el contrato 1.0.0, que sigue igual. En el contrato 1.1.0 sí hay
redondeo comercial y varios ajustes. Cada fila facturable con precio mayor que cero se eleva al múltiplo de la regla
`price_rounding` vigente para la moneda de salida, antes de los ajustes y nunca hacia abajo; una fila que cumplía su
piso antes de redondear lo sigue cumpliendo. Los ajustes son hasta 10, `discount` por tasa o `agreed_net` (neto
pactado por período; el motor deriva `discount` o `uplift` y llega al monto exacto), y cada fila recibe a lo más uno:
sigue sin haber cadena de ajustes sobre una misma fila. Margen final = `(neto − costo) / neto` sobre el neto después
de redondeo, descuento y recargo. Detalle: [contrato 1.1.0](cotizador-v3-contrato-y-validacion.md#contrato-110--ajustes-comerciales-y-redondeo-2026-10-10).

Motor 1.2 (2026-10-11): las fórmulas de costo, precio y margen no cambian. Cambia contra qué se compara el piso
cuando el factor de mercado elegido declara `floorBasis: "base_market"` y es menor que 1. Cada fila calcula
`ρ` = su precio de política con el factor ÷ su precio con factor 1 (ambos a la precisión de la moneda, antes del
redondeo comercial) y su piso pasa a ser `floorNet = costo × ρ / (1 − minimumMargin)`, elevado a la unidad de la
moneda. El kernel marca la fila cuando el neto final es menor que `floorNet`. Sin componente humano, con factor 1 o
mayor, o sin `floorBasis`, `ρ = 1` y el control es el de 1.1.0. El margen final sigue siendo `(neto − costo) / neto`:
en un mercado con factor menor que 1 puede quedar bajo el mínimo de la política sin que ninguna línea esté marcada.
Detalle: [contrato 1.2.0](cotizador-v3-contrato-y-validacion.md#contrato-120--el-piso-acompaña-al-factor-de-mercado-2026-10-11).

FX conserva par, tasa, fecha, fuente e IDs; convertir exige la dirección seleccionada, sin invertir o cruzar
automáticamente. La referencia EUR→USD de la fixture operativa es 1.1206 al 09-10-2026; permite simular Magnific,
no fija una tasa contractual. Impuestos pueden quedar pendientes con `tax=null` y `grandTotal=null`, no cero.
El kernel no infiere obligaciones fiscales por país.

Motor 1.1 (2026-10-10): en `catalog.review-v4.json` el tipo de cambio de cotización es un valor de política decidido
por el operador, con USD como moneda de referencia y un margen prudencial sobre el spot; no es una tasa observada ni
contractual. La referencia EUR→USD sigue fechada sólo el 2026-10-09: una cotización posterior que necesite EUR no
tiene tasa vigente. USD→CLF sigue siendo un valor estimado de 2025.

Versiones vigentes (2026-10-11): el catálogo v6 cierra ese hueco para las herramientas que se pagan en EUR. Agrega
una tasa de cotización EUR→USD de 1,20, sin fecha de término y marcada como estimada (la referencia del BCE era
1,1206). La eligió el agente aplicando la instrucción del operador de usar un margen prudencial sobre el spot; el
operador no la decidió expresamente para EUR. Con ella el catálogo tiene una tasa EUR→USD vigente en cualquier fecha
posterior; la demanda que la necesita, por ejemplo por Magnific, la nombra en `fxRecordIds` (registro `fx:EUR:USD`).
Lo que sigue faltando es el camino inverso: no hay tasa USD→EUR ni regla de redondeo para EUR, así que una
cotización con salida en EUR queda `needs_input` (`MISSING_CATALOG_SELECTION` en `fx.USD:EUR`). La referencia del BCE
anterior sigue apareciendo como vencida en `resources inspect`; es un pendiente conocido.

## Herramientas, personas y servicio

La selección combina Notion/Microsoft 365 comunes, tareas de perfil y tareas adicionales, IA explícita y
`serviceToolIds`. Una tool desconocida o un plan pendiente bloquea; no se sustituye por la opción barata.
Cada elección conserva razón y fuente. Las 32 reglas iniciales son revisables: alcance WordPress, plugins,
stock, publicación, video, UX, automatización o IA requiere evaluación específica.

`assigneeIds` identifica usuarios únicos: dos filas del mismo usuario no crean dos seats. `allocations` declara
por tool/mes `priceId`, cantidad, cuota, driver, motivo y, cuando aplica, capacidad y seats contractuales.
Los nominativos requieren cantidad entera; seat por usuario no se convierte en pool en el portfolio.
Un paquete nominativo exige capacidad suficiente. Mínimos de contratación se mantienen separados de los
usuarios atribuidos a la cuenta. Ningún reparto permite compartir credenciales ni prueba acceso real.

Adobe 180 USD/mes cubre el paquete 3 CC Teams+3 Express confirmado por el operador. La capacidad de CC es 3 por
paquete; no se divide el costo entre seis usuarios equivalentes. `bundledToolIds` impide sumar Express aparte
cuando se selecciona ese paquete. 306 USD es escenario del alza 70% con fecha desconocida; no se activa al renovar
sin evidencia. Fuentes de precio y fechas de revisión son datos de selección, no garantía contractual futura.

Versiones vigentes (2026-10-11): un precio unitario no vence. Por decisión del operador (CEO), el precio de una
licencia es estable —en sus palabras, Notion o Microsoft 365 no cambian su precio—; lo que cambia es cuántas
licencias se contratan, y esa cantidad se declara en cada cotización. Hasta la policy `resources.review-v5` cada
precio de herramienta tenía una fecha de término cercana (casi todos, 30 días después de su evidencia) y una
cotización con fecha posterior quedaba bloqueada con `RESOURCE_PRICE_NOT_EFFECTIVE`. En la policy v6 los 25 precios
con importe propio valen hasta que se reemplacen y cada uno lleva una fecha de revisión, `reviewBy`, hoy el
2027-04-11. Esa fecha la eligió el agente (seis meses), no el operador. Pasada la fecha, la cotización se calcula
igual y el resumen lo avisa; el precio sólo cambia cuando se emite una versión nueva de la policy. La mayoría sigue
siendo precio de lista público marcado como estimado: que no venza no significa que esté confirmado. Cómo se revisan:
[mantenimiento](cotizador-v3-mantenimiento-catalogo.md#precios-unitarios-vigencia-y-fecha-de-revisión-2026-10-11).

`role_capacity` mantiene funciones como unidad de la simulación. `managed_service` usa las mismas funciones
como costo interno y proyecta un fee por periodo más implementación. No convierte una suma de roles en SOW:
entregables, aceptación, cadencia, límites, responsabilidades y continuidad requieren validación de la práctica.
El preview del servicio omite perfiles, horas, headcount y países de talento.

`clientProvidedTools` identifica tool/mes/líneas, razón y evidencia confirmada para toda la ventana de uso.
Se omite costo Efeonce únicamente en las líneas cubiertas y queda motivo `client-provided`. Base común y tools
de créditos no se sustituyen con esta excepción. Duplicados, líneas desconocidas, evidencia insuficiente o
allocations que quedaron sin uso bloquean. Esto modela una cobertura declarada; no verifica un tenant del cliente.

## Reparto de pools y plataforma

El portfolio reconcilia exactamente `totalUnits = clientes + internalUnits + unallocatedUnits`. La cuota de
cada cuenta deriva de unidades/total, a 18 decimales con residual explícito. Con catálogo y fecha devuelve costo
mensual en moneda original, incluyendo interno y sin asignar. Capacidad insuficiente o duplicada deja pendientes.
Un plan no mezcla una allocation manual y otra derivada para la misma tool/mes.

Vercel y GCP usan el driver declarado por recurso; el rango Vercel 60–100 no se vuelve una cifra exacta sin
selección. No se inventa cartera, número de clientes ni ocupación. El ejemplo Adobe 160 unidades/40 cliente/80 interno/
40 sin asignar produce 45/90/45 USD: hipótesis, no distribución de Efeonce. Dentro de una cuenta, los recursos se
distribuyen por usuarios únicos; créditos por demanda. El motor no pondera internamente esas líneas por horas.

## IA: presupuesto atribuido frente a pago adicional

Higgsfield 139 USD/3000 créditos y Magnific 40 EUR/45000 créditos mensuales son bases declaradas. Costo de base
atribuido = cuota × créditos base asignados / incluidos. Déficit = demanda agregada − créditos base asignados.
El [planner](../../../src/lib/finance/pricing-v3/resources/credit-budget.ts) minimiza costo de packs enteros que cubren el déficit; no usa el costo medio de la suscripción como
precio del extra. Default permite una unidad de cada pack distinto; repetición requiere `allowRepeatedPacks`.

El compositor agrega demanda por proveedor/mes, compra el presupuesto de packs una vez y distribuye su costo
por consumo. Expone créditos adquiridos, remanente y caja extra; el coste completo del pack permanece atribuido,
sin monetizar un remanente futuro. Bases asignadas no pueden superar disponibilidad ni demanda, y la disponibilidad
declarada no supera la suscripción. Normales requieren ventana mensual compatible; suscripción activa cuando aplica.

Caducidad extra: 90 días Higgsfield, 3 años Magnific según capturas; cutoff date-only exclusivo y aniversario UTC
con ajuste de año bisiesto. No implica vigencia de promoción ni saldo live. Compra, impuestos, reservas,
auto-refill y reutilización de remanentes siguen fuera. Créditos de proveedores distintos no son intercambiables.
Los 30 USD de créditos Notion facturados se modelan como presupuesto separado, no como pack del planner Higgsfield/Magnific.
[Paquetes y algoritmos observables](cotizador-v3-creditos-ia.md).

## Fuentes, mantenimiento y reproducción

El catálogo operativo incorpora 32 perfiles y 25 tools históricas más nuevos recursos; las 26 filas originales
incluyen ETG-017, fee genérico separado. Factura, operador, referencia pública, histórico y estimado se conservan
distintos. Notion tiene factura 9 Business×24 USD más 30 USD por 3000 créditos para 21-09–21-10, cutoff 20-10 inclusivo;
facturado no significa pagado. Microsoft 365, SEMrush, ChatGPT y Claude tienen variantes públicas explícitas;
no prueban plan, número de usuarios ni gasto actual de Efeonce. Ventana interna de revisión no es promesa de precio.

Versiones vigentes (2026-10-11): los costos de persona del catálogo son un **costo objetivo**, no lo que Efeonce
paga hoy. Vienen del Excel de pricing y representan el nivel salarial al que el CEO quiere llevar al equipo; por
decisión suya el cotizador no usa la nómina real, que hoy es más baja. La consecuencia es que el margen real actual
sobre las personas es mayor que el que muestra una cotización. Conectar la nómina real no es una mejora pendiente.
[Explicación completa](cotizador-v3-provisiones-y-costos.md#la-base-de-costo-de-las-personas-es-un-costo-objetivo-2026-10-11).

Mantenimiento monetario y de recursos son carriles distintos. Preview valida schema/referencias/base, calcula
impactos y digest; apply reconstruye el mismo contexto/impacto y exige ese digest. Un cambio confirmado de importe
no hereda evidencia vieja. Change-set monetario retiene actor/audit; cambio de policy/créditos conserva reason y
preview y exige nueva versión completa. Ninguno activa automáticamente un archivo, compra, reajusta contratos
o modifica artefactos. Elegir sucesor requiere rutas explícitas. El CLI sin `--catalog` conserva review-v1.

Versiones vigentes (2026-10-11): ya no hace falta escribir las rutas a mano para usar lo vigente. Un puntero,
`data/pricing/v3-operating/current.json`, nombra el catálogo, la policy y el catálogo de créditos vigentes, cada uno
con su ruta, versión y digest (la huella de su contenido). Con `--current`, la CLI toma de ahí cada fuente que no
pasaste; si pasas una ruta explícita, gana la ruta. Antes de usar el puntero lo comprueba contra los archivos: si la
versión o el digest no coinciden, rechaza con `CURRENT_VERSIONS_MISMATCH` en vez de seguirlo. Sin `--current` todo
sigue como antes: sin `--catalog` se lee review-v1 y `--policy` y `--credits` son obligatorios. Qué nombra el puntero
lo imprime `pnpm --silent pricing:v3 current show`; al 2026-10-11, tras la oferta SEO/AEO, es
`catalog.review-v8.json`, `resources.review-v6.json` y `ai-credits.review-v1.json`, y esa frase envejece, así que
confírmalo con el comando. Emitir una versión nueva no mueve el puntero: es un paso
aparte. [Cómo se mueve](cotizador-v3-mantenimiento-catalogo.md#puntero-de-versiones-vigentes-2026-10-11).

Un artefacto de composición congela catálogo, policy, créditos, demanda y resultado; `createdAt` queda fuera
del digest semántico. Replay verifica integridad y vuelve a calcular con la versión soportada disponible.
Explicación, comparación y nuevas versiones preservan lo anterior; no siguen punteros a precios actuales.
Eso vale también para el puntero de versiones vigentes: sólo se consulta al cotizar con `--current`. Un artefacto ya
congelado lleva sus tres fuentes dentro y nunca lo sigue; por eso las versiones anteriores no se borran ni se editan.
El presupuesto IA separado posee su propio formato: no es una quote válida para replay.
[Mantenimiento completo](cotizador-v3-mantenimiento-catalogo.md).

## Evaluación, salidas y límites

`compose assess` separa completitud matemática de evidencia: salario localizado, provisiones medidas,
suscripciones/acceso/capacidad reales, asignación simulada, impuestos/entidad, SOW y autorización comercial.
Siempre devuelve revisión. 40% objetivo/35% piso son propuesta, `approved=false`; no reemplazan la policy elegida ni pisos vigentes de la práctica. Creative Practice conserva 45% bruto aprobado; la práctica SEO/AEO tiene el mismo piso de 45% y, desde el 2026-10-11, su propia oferta con objetivo 55%; y desde esa fecha una persona vendida por dedicación (staff augmentation) tiene piso de 25%. Los tres los decidió el CEO: el aviso genérico de `assess` no certifica esos pisos ni permite una excepción. El agente debe calcular y verificar el piso de la oferta correspondiente.
TrialAssurance 25/operación 25/setup 100 permanecen recursos de prueba, no estándares de Talent Assurance.

Delta 2026-10-10: `assess` ya reporta el piso de la política de precio seleccionada, sin recalcularlo. Agrega una
brecha `MARGIN_BELOW_POLICY_FLOOR` (owner Commercial/Finance) por cada línea que el kernel marcó
`MARGIN_BELOW_FLOOR`, y `margin.policyFloor.linesBelowFloor` con neto, margen, `marginRateRoundedDown` y
`marginAmountShortOfFloor` de cada una. `proposedTarget`/`proposedFloor` no cambian. El veredicto vale sólo si la
oferta elegida codifica el piso de su práctica: con `creative-managed-service` (objetivo y mínimo 0,45) lo hace, y
desde el catálogo v8 también `seo-aeo-managed-service` (práctica SEO/AEO: objetivo 0,55, mínimo 0,45); una
política con mínimo 0 no marca nada y `assess` no suple esa verificación (desde el catálogo v7 del 2026-10-11
`talent-assurance-staffing`, la persona por dedicación, también codifica el suyo: mínimo 0,25; sólo los catálogos
anteriores la dejan en mínimo 0). Con objetivo igual al mínimo, costo y precio
se redondean a CLP enteros por separado y una línea al piso puede quedar bajo él por menos de 1 CLP: el kernel la
marca y nunca sube el precio. En el ejemplo `managed-care.*` las seis líneas quedan cortas por 0,1 a 0,5 CLP;
`marginAmountShortOfFloor` distingue esa brecha de redondeo de un incumplimiento real.

Motor 1.1 (2026-10-10): lo anterior es el contrato 1.0.0 (el ejemplo con `catalog.review-v3`). Con una regla de
redondeo vigente, el contrato 1.1.0 conserva el piso de toda fila que lo cumplía antes de redondear: el mismo ejemplo
con `catalog.review-v4` no marca ninguna línea. `assess` no cambió; sigue leyendo sólo `MARGIN_BELOW_FLOOR`.

Motor 1.2 (2026-10-11): `assess` sigue leyendo sólo `MARGIN_BELOW_FLOOR` y el texto de su brecha no cambió. Agrega
`margin.policyFloor.marketFactor` cuando el factor elegido no es neutral, y cada entrada de `linesBelowFloor` de una
fila 1.2.0 trae `floorNet` y `netShortOfFloor`. `modeledRate` es el margen real: con un factor de mercado cuyo piso
acompaña al mercado base puede estar bajo el mínimo de la política con `linesBelowFloor` vacío. `proposedTarget` y
`proposedFloor` siguen siendo la propuesta genérica y no conocen el factor de mercado.

Versiones vigentes (2026-10-11): `assess` agrega `costEvidencePriority`, el orden en que conviene confirmar los
datos estimados del costo. Trae `currency`, `estimatedCost`, `confirmedCost`, `estimatedShareOfCost` y
`confirmFirst`, que son los cinco primeros datos del mismo ranking que el resumen publica en `estimateExposure`. No
es una brecha nueva ni cambia el estado: es una lectura para priorizar. Pendiente conocido: `assess` todavía no
lista como brecha propia que un factor de país sea estimado; hoy eso se ve en `reviewSignals` (`ESTIMATED_SOURCE`) y
en este ranking.

`compose preview` admite simulación calculada en revisión y entrega JSON/Markdown con allowlist. Excluye
costos, margen, IDs/fuentes privados, providers, drivers y países de talento. No autoriza publicación o envío.
Desde el 2026-10-10, en `managed_service` los importes derivados (fee del período e implementación) conservan la
escala con que el kernel formateó la moneda: CLP mostraba `9508946.00` en la línea y `9508946` en el total.
`export` conserva el gate propio de cálculo completo dentro de policy; los ejemplos de composición en revisión
no lo evaden mediante preview. Ninguna salida crea quote canónica, aprobación, documento emitido o CRM write.

CLI: JSON limpio por stdout con `pnpm --silent`; exit 0 técnico, exit 2 pendiente, exit 3 cálculo/revisión y exit 1
schema/argumentos/conflicto/adaptador/export rechazado, error sanitizado en stderr. `--out` usa ruta nueva
`wx`/0600; no sobrescribe. Códigos 2/3 exigen leer envelope, no concatenar pasos suponiendo exit 0.

Delta 2026-10-10, qué imprime cada comando. Códigos de salida, flags, digests y el escritor `wx`/0600 no cambian.

- `compose prepare` y `compose quote` imprimen el resumen `pricing-v3-composition-summary/1`
  ([`resources/summary.ts`](../../../src/lib/finance/pricing-v3/resources/summary.ts)), no el resultado completo.
  `quote` incluye `replayDigest`; `prepare` no. El resultado completo existe sólo en el artefacto escrito con `--out`
  (bajo `semantic.result`) y se lee con `explain`, que no cambia. `prepare|quote` del carril de catálogo y `calculate`
  del kernel tampoco cambian.
- `replay` de un artefacto de composición imprime `{ verified, calculationId, summary }`; los artefactos de snapshot y
  de quote de catálogo conservan `{ verified, calculationId, result }`.
- El resumen sólo cuenta, agrupa y formatea. `diagnostics` trae los bloqueos completos (no vacío implica `totals` nulo
  y `needs_input`); `reviewSignals` agrupa todo diagnóstico de período por código y severidad con conteo, períodos,
  líneas y rutas; `marginFloor.lines` lista las líneas que el kernel marcó bajo su piso; `toolSelections` separa
  incluidas, aportadas por el cliente y excluidas con motivo, y sólo cuenta las no requeridas; `attributions`,
  `creditBudgets`, `resourceIncrementalCash`, `cashLedger` y `cashMeaning` mantienen separados costo atribuido y caja.
  `marginRateRoundedDown` es la tasa a 6 decimales redondeada hacia abajo; `totals.marginRate` conserva la exacta.
- Medido en `managed-care.*` (`catalog.review-v3` + `resources.review-v5`): stdout de `compose quote` pasó de 196 KB a
  unos 15 KB; con 12 períodos el resumen crece cerca de 1,5× y el resultado completo cerca de 8,8×.
- Exit 1 reporta en stderr `{ "error": { "code", "message", "option"?, "issues"? }, "binding": false }`. `code` sale
  del [registro cerrado](../../../src/lib/finance/pricing-v3/errors.ts) de `PricingV3Error`, sin lista propia en la
  CLI; el registro es la fuente y este documento no copia su lista ni su conteo. Un documento que no pasa su schema
  sale como `SCHEMA_INVALID` con hasta 20 `{ path, rule }`. Los códigos de adaptador distinguen `INPUT_NOT_FOUND`,
  `INPUT_NOT_JSON`, `OUTPUT_EXISTS`, `OUTPUT_NOT_WRITABLE` y `UNKNOWN_OPTION`; `MISSING_ARGUMENT`, `INVALID_ARGUMENT`
  e `INVALID_FORMAT` nombran la opción cuando la falla es de una opción. `message` es estático: nunca aparece un valor,
  una ruta de archivo ni el mensaje de un parser o validador. `ADAPTER_FAILURE` significa «caso sin clasificar en el
  adaptador», no «fallo técnico». Antes, diez códigos que el dominio lanzaba salían como `ADAPTER_FAILURE`.
- Un precio realmente acordado se pasa por el motor como el único ajuste de descuento del brief
  (`brief.adjustments[]`, `kind: "discount"`, con `rate`, `lineIds` y `reason`); así el artefacto lleva el neto, el
  margen y el veredicto de piso reales. Decisiones, alternativas descartadas y el primer caso:
  [delta del ADR](../../architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-10--endurecimiento-de-la-cli-errores-tipados-resumen-derivado-y-veredicto-de-piso).
  Corrección del mismo día (motor 1.1): el precio pactado se declara como `agreed_net`, sin calcular una tasa, y el
  brief admite hasta 10 ajustes sobre filas disjuntas. El método de la tasa queda como evidencia del contrato 1.0.0.

Motor 1.1 (2026-10-10), qué imprime cada comando. No hay comandos, flags ni códigos de salida nuevos.

- `compose prepare|quote` y `replay` de una composición: el mismo resumen `pricing-v3-composition-summary/1`, con
  tres claves aditivas. `engineVersion` es el motor del contrato con que se resolvió (`null` si la resolución no
  produjo ningún período); `commercialAdjustments` son los ajustes tal como los declara el brief congelado;
  `priceRounding` es la regla
  aplicada, `{ currency, multiple, scope: "offer" | "general", offerId, recordId, revision, sourceStatus }`, o `null`.
  En una quote 1.1.0, `totals` y los totales por período agregan `roundingAdjustment` y `uplift`; en una 1.0.0 esas
  claves no existen.
- `explain` (catálogo y composición) agrega `commercialAdjustments`: los dos datos anteriores, la identidad
  `net = undiscountedPrice + uplift − discount` y `rows[]` con el recorrido de precio por fila y período
  (`undiscountedPrice`, `roundingAdjustment`, `discount`, `uplift`, `net`; las dos claves nuevas sólo en filas 1.1.0).
- `prepare|quote` del carril de catálogo y `calculate` del kernel entregan el resultado completo como antes, con las
  claves nuevas cuando el contrato es 1.1.0.
- `compare` de dos artefactos de snapshot compara `roundingAdjustment` y `uplift` sólo si ambos lados los traen.
- `catalog search|show` aceptan `--kind price_rounding`.
- `compose preview`, `export` y la proyección cliente no cambian de forma: muestran el neto final, ya redondeado y
  ajustado, y nunca el desglose de redondeo, descuento o recargo.
- Un error de ajuste del kernel (`OVERLAPPING_ADJUSTMENTS`, `INVALID_AGREED_AMOUNT`, `AGREED_NET_WITHOUT_BASE`,
  `INVALID_PRICE_ROUNDING`, `DUPLICATE_ID`) sale en composición como bloqueo en `diagnostics` del resumen, con
  `totals` nulo y exit 2; en `quote` del carril de catálogo queda bajo `periods[].diagnostics` con
  `calculationStatus: needs_input`. `AMBIGUOUS_PRICE_ROUNDING` y un neto de `setup` que no cae en ningún período
  (`AGREED_NET_WITHOUT_BASE`, ruta `adjustments.<adjustmentId>`) son bloqueos de resolución.

Motor 1.2 (2026-10-11), qué imprime cada comando. No hay comandos, flags ni códigos de salida nuevos.

- `compose prepare|quote` y `replay` de una composición: el mismo resumen, con claves aditivas. `marketFactor`
  (`{ country, factor, floorBasis, recordId, revision, sourceStatus }`) aparece en la raíz **sólo** cuando el factor
  de mercado elegido cambia algo: factor distinto de 1 o `floorBasis` declarado. Con el factor neutral la clave no
  existe (no va en `null`), así que el resumen de una cotización anterior conserva sus claves. `floorBasis` es
  `"base_market"` o `null`; un factor mayor que 1 sin base de piso se nombra igual, y esa cotización sigue en 1.1.0.
  `engineVersion` es `pricing-v3-local/1.2.0` cuando el factor elegido declara `floorBasis`. En una quote 1.2.0,
  `totals` y los totales por período agregan `marketAdjustment`.
- `marginFloor.lines[]`: en una fila 1.2.0 cada línea marcada agrega `floorNet` y `netShortOfFloor`
  (`floorNet − net`). Si el piso de esa fila se lee sobre el mercado base (`ρ < 1`), `marginAmountShortOfFloor` es
  `null`: esa cifra sería la del mercado base. Si `ρ = 1` se conserva junto a las dos nuevas. `net`, `marginAmount`
  y `marginRateRoundedDown` son siempre los reales.
- `compose assess`: `margin.policyFloor` agrega `marketFactor` cuando no es neutral; `linesBelowFloor` trae las
  mismas claves nuevas por línea.
- `explain` (catálogo y composición): `commercialAdjustments` agrega `marketFactor` cuando la quote es 1.2.0, la
  identidad suma que `undiscountedPrice − roundingAdjustment − marketAdjustment` es el precio del mercado base, y cada
  fila 1.2.0 de `rows[]` agrega `marketAdjustment`, `marketPriceRatio` y `floorNet`.
- `prepare|quote` del carril de catálogo y `calculate` del kernel entregan el resultado completo, con las claves
  nuevas por fila y en totales cuando el contrato es 1.2.0.
- `compare` de dos artefactos de snapshot compara `marketAdjustment` sólo si ambos lados lo traen.
- `catalog search|show|validate` leen `floorBasis`; `catalog preview|apply` lo llevan en `add` y `replace`, y otro
  valor que no sea `base_market` se rechaza como `SCHEMA_INVALID`.
- `compose preview`, `export` y las proyecciones cliente no cambian: muestran el neto final y nada del ajuste de
  mercado, la razón ni el piso.
- Supuestos y señales: con `catalog.review-v5` y fecha desde el 2026-10-11, `assumptions` ya no trae
  `UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY` y el costo de la persona ya no sale como `ESTIMATED_SOURCE`; los factores de
  talento y de mercado estimados sí salen como `ESTIMATED_SOURCE` en `reviewSignals`.

Versiones vigentes (2026-10-11), qué imprime cada comando. Hay un comando nuevo (`current`), un interruptor nuevo
(`--current`) y dos códigos de rechazo nuevos; los códigos de salida 0, 1, 2 y 3 significan lo mismo que antes.

- `--current` es un interruptor sin valor. Lo aceptan todas las operaciones que reciben `--catalog`, `--policy` o
  `--credits`: `prepare` y `quote` del carril de catálogo, `catalog search|show|validate|preview|apply`,
  `resources inspect|portfolio|budget|preview|apply` y `compose scaffold|plan|prepare|quote`. Llena sólo las fuentes
  que no pasaste. En `resources budget`, que recibe el catálogo de créditos por `--catalog`, llena ese. `compose
  assess|preview`, `explain`, `replay`, `compare` y `export` no lo aceptan: leen un artefacto que ya lleva sus
  fuentes dentro. La forma recomendada de cotizar pasa a ser:

  ```bash
  pnpm --silent pricing:v3 compose quote --input demand.json --current --out artifact.json
  ```

- `current show` imprime el puntero, su `pointerDigest`, el estado de cada fuente (`match`, `version_mismatch`,
  `digest_mismatch`, `invalid` o `unreadable`) y `consistent`. Sale con 0 si las tres coinciden y con 2 si no.
  `current show --input otro.json` revisa un puntero que no es el versionado.
- `current set --catalog A --policy B --credits C --reason "…" --confirm <pointerDigest>` reemplaza el puntero. El
  detalle del candado está en
  [mantenimiento](cotizador-v3-mantenimiento-catalogo.md#puntero-de-versiones-vigentes-2026-10-11).
- `compose prepare|quote`: el resumen agrega `estimateExposure`, que ordena los datos estimados por el costo que
  descansa en cada uno. `replay` de una composición lo imprime igual, porque se deriva del resultado congelado.
- `compose prepare|quote` pueden agregar `runNotices`, con `laterCatalogValues`, `priceDates` o ambos. Describe la
  corrida, no la cotización: no se guarda en el artefacto, `replay` no lo imprime y la clave no existe cuando no hay
  nada que avisar. Nunca bloquea; se informa al operador junto al resultado. Forma de las dos claves:
  [contrato](cotizador-v3-contrato-y-validacion.md#resumen-avisos-de-la-corrida-y-exposición-a-estimados-2026-10-11).
- `resources inspect` agrega `priceReview` (`{ withinDays, reviewDue, dueSoon, expired }`): fechas de revisión ya
  pasadas, fechas que caen en los próximos 30 días y vigencias que ya terminaron. Sólo estas últimas bloquean una
  cotización de esa fecha. Con `--current` incluye además el digest del catálogo de créditos.
- `compose assess` agrega `costEvidencePriority`, descrito en la sección de evaluación.
- `compose split --input <artefacto> --tools <ids|all>` presenta una cotización ya calculada en dos cifras por
  fila, la persona y un kit con las herramientas elegidas, sin cambiar el total. Sirve para vender una persona por
  dedicación mostrando las herramientas como ítem propio. Avisa si una de las dos partes queda bajo el piso aunque
  la fila lo cumpla. Es una lectura interna (trae costos), no un documento para el cliente.
- Rechazos nuevos del [registro](../../../src/lib/finance/pricing-v3/errors.ts), ambos con salida 1:
  `CURRENT_VERSIONS_MISMATCH` (el puntero y un archivo que nombra no coinciden) y `CURRENT_VERSIONS_CONFLICT` (el
  `--confirm` de `current set` no es el digest del puntero que se reemplaza, o se pasó un `--confirm` cuando el
  puntero de destino todavía no existe). Reemplazar un puntero existente sin `--confirm` es `MISSING_ARGUMENT`.

Verificación de implementación TASK-2022: 135 tests V3 + 78 V2 = 213, 26 smokes CLI y replay de baselines preservados.
Readback del 2026-10-10 tras el endurecimiento de la CLI: `pnpm pricing:v3:test` con 9 archivos y 179 pruebas V3,
ESLint y `pnpm typecheck` limpios, y `pricing:v3 replay` con `verified: true` en los `*.artifact.json` presentes ese
día bajo `data/pricing/` (16) y en la carpeta del caso SKY (13). Los conteos de TASK-2022 siguen siendo la evidencia
fechada de ese cierre; `verification.cli.json` registra sólo operación y código de salida, así que sigue vigente.
Readback del 2026-10-10 tras el motor 1.1 y el catálogo v4: `pnpm pricing:v3:test` con 12 archivos y 320 pruebas V3,
ESLint y `pnpm typecheck` limpios, y `verified: true` en todos los `*.artifact.json` en disco: 16 bajo
`data/pricing/` y 14 en la carpeta del caso SKY (30). La guarda permanente cubre los versionados: 17 en el commit
`9e397278c` y 18 desde `72fbf10d4`, que agregó `acordado-neto.artifact.json`, el primero firmado por el motor 1.1.0.
Cotizaciones de prueba de ese día con `catalog.review-v4` + `resources.review-v5`:

| Caso | Contrato | Resultado |
| --- | --- | --- |
| SKY social care con `agreed_net` 4.990.000 | 1.1.0 | `undiscountedPrice` 5.430.000 (redondeo 9.855), `discount` 440.000, `net` 4.990.000 exacto; margen 0,402589; tres líneas marcadas, 236.579 CLP al mes bajo el piso en total |
| SKY al piso, sin precio pactado | 1.0.0 en v3 → 1.1.0 en v4 | 5.420.145 → 5.430.000; en v4, margen 0,450998 y ninguna línea marcada |
| `managed-care.demand.json` en v3 (CLP) | 1.0.0 | 9.508.946; seis líneas marcadas por fracciones de peso |
| `managed-care.demand.json` en v4 | 1.1.0 | CLP 9.530.000 · USD 9.530,00 · COP 34.900.000 · MXN 183.300,00 · PEN 35.300,00; todos múltiplos de su regla, ninguna línea marcada |

Los archivos `acordado-neto.*` del caso SKY están junto al
[registro de la excepción](../../commercial/prospects/sky-social-care-2027/pricing/EXCEPCION-PISO-2026-10-10.md).
Las cifras son evidencia fechada de esa corrida, no un contrato.

Readback del 2026-10-11 tras el motor 1.2 y el catálogo v5: `pnpm pricing:v3:test` con 13 archivos y 407 pruebas V3,
ESLint limpio, y `verified: true` en todos los `*.artifact.json` en disco: 17 bajo `data/pricing/` y 14 en la
carpeta del caso SKY (31). La guarda permanente cubre los versionados: 19 desde el commit `e8117442b`, que agregó
`managed-care-colombia.artifact.json`, el primero firmado por el motor 1.2.0.
Cotizaciones de prueba de ese día con `catalog.review-v5` + `resources.review-v5`: `managed-care.demand.json` con
`quoteDate` 2026-10-11 y salida en USD, cambiando sólo el país del cliente (`offerMarketCountry`) y el del equipo
(`talentCountry` de las seis líneas). Todas salen calculadas y en revisión (exit 3).

| Cliente / equipo | Contrato | Neto mensual USD | Costo USD | Margen real | Líneas marcadas |
| --- | --- | --- | --- | --- | --- |
| CL / CL | 1.1.0 | 9.530,00 | 5.229,94 | 0,4512 | 0 |
| CL / CO | 1.1.0 | 8.210,00 | 4.501,94 | 0,4516 | 0 |
| CO / CL | 1.2.0 | 8.890,00 | 5.229,94 | 0,4117 | 0 |
| CO / CO | 1.2.0 | 7.690,00 | 4.501,94 | 0,4145 | 0 |
| PE / PE | 1.2.0 | 8.260,00 | 4.683,94 | 0,4329 | 0 |
| MX / MX | 1.1.0 | 8.890,00 | 4.865,94 | 0,4526 | 0 |
| US / CL | 1.1.0 | 10.180,00 | 5.229,94 | 0,4862 | 0 |
| US / US | 1.1.0 | 39.300,00 | 19.789,94 | 0,4964 | 0 |
| ES / ES | 1.1.0 | 24.740,00 | 12.509,94 | 0,4943 | 0 |
| ES / CL | 1.1.0 | 10.180,00 | 5.229,94 | 0,4862 | 0 |

- El equipo en Colombia baja el costo (4.501,94 contra 5.229,94) y el precio con él: el margen queda en el de la
  política. El cliente en Colombia baja sólo el precio: en CO / CL `totals.marketAdjustment` es −661,84 y el margen
  real queda en 0,4117 sin ninguna línea marcada.
- Estados Unidos y España cotizan en 1.1.0 porque su factor de mercado, mayor que 1, no declara `floorBasis`; el
  resumen igual lo nombra en `marketFactor` y los totales no traen `marketAdjustment`. Con el factor neutral
  (CL, MX) `marketFactor` no aparece.
- En COP, cliente y equipo en Colombia
  ([`managed-care-colombia.demand.json`](../../../data/pricing/v3-operating/managed-care-colombia.demand.json) →
  `.artifact.json`, versionados): 28.100.000 al mes, costo 16.432.006, `marketAdjustment` −1.932.511, margen real
  0,4152, ninguna línea marcada, replay verificado. Sin `floorBasis`, esa misma cotización con factor 0,90 marcaba
  las seis líneas (medido antes del cambio).
- La misma cotización con un `agreed_net` de 24.000.000 (sin versionar): `discount` 4.100.000, margen real 0,3153 y
  las seis líneas marcadas, cada una con `floorNet` y `netShortOfFloor`; `marginAmountShortOfFloor` es `null` en
  todas. Primera línea: neto 10.163.701, piso 11.872.366, faltan 1.708.665.
- La demanda versionada original (`quoteDate` 2026-10-10) sobre v5 sigue dando CLP 9.530.000 en 1.1.0 y con el
  supuesto `UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY`, también si se le cambia el mercado a Colombia: los valores de v5
  rigen desde el 2026-10-11.
- Una cotización en EUR para un cliente de España queda `needs_input` (falta la tasa USD→EUR vigente): no hay tipo
  de cambio ni regla de redondeo para EUR.

Readback del 2026-10-11 tras el puntero de versiones vigentes, la policy v6 y el catálogo v6, hecho con la CLI:
`current show` responde `consistent: true` con las tres fuentes en `match`, y `replay` da `verified: true` en los 31
`*.artifact.json` en disco (17 bajo `data/pricing/` y 14 en la carpeta del caso SKY). Corridas de ese día con
`--current`:

| Caso | Salida | Resultado |
| --- | --- | --- |
| `managed-care-colombia.demand.json` (cliente y equipo en Colombia, COP, fecha 2026-10-11) | 3 | Contrato 1.2.0; neto 28.100.000, costo 16.432.006, margen real 0,4152; ninguna línea marcada; sin `runNotices` |
| Su `estimateExposure` | — | 98,7 % del costo descansa en datos estimados. Primero el factor de talento Colombia sobre Chile: 64,7 % del costo y 3,8 puntos de margen si fuera 10 % más alto. Después la bandeja de Sprout: 17,7 % y 1,0 punto |
| `managed-care.demand.json` (fecha 2026-10-10) | 3 | Contrato 1.1.0; CLP 9.530.000; `runNotices.laterCatalogValues` avisa 45 registros que rigen desde el 2026-10-11 (32 costos, 6 factores de talento, 6 de mercado y 1 tipo de cambio) |
| La demanda de Colombia con fecha 2026-12-15 | 3 | Calcula igual sobre la policy v6. La misma fecha con `--policy` en `resources.review-v5.json` queda `needs_input` por `RESOURCE_PRICE_NOT_EFFECTIVE` |
| La demanda de Colombia con fecha 2027-05-01 | 3 | Calcula igual; `runNotices.priceDates.reviewDue` lista los cuatro precios usados cuya fecha de revisión ya pasó |
| La demanda de Colombia con salida en EUR | 2 | `needs_input`: `MISSING_CATALOG_SELECTION` en `fx.USD:EUR` |

Las tres últimas filas usan copias de la demanda con un solo campo cambiado; no están versionadas. La exposición es
una lectura de sensibilidad sobre el resultado congelado, no un pronóstico ni una validación de esos datos.

Las cifras son evidencia fechada de esa corrida, no un contrato.
[Evidencia de comandos](../../../data/pricing/v3-operating/verification.cli.json). El inventario vivo, salarios
vigentes, medición de provisiones, policy comercial y términos reales siguen en
[ledger de pendientes](../../../data/pricing/v3-operating/operational-gaps.json). Cambios salariales por periodo,
drivers actuariales/contables, setup amortizado, fees porcentuales, ajustes encadenados y promoción de consumers
API/UI/MCP/Nexa necesitan extensión propia. [Handoff de promoción](cotizador-v3-promocion-canonica.md).
