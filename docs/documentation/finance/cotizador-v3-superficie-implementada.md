# Cotizador V3: superficie local implementada

Estado verificado el 2026-10-09, TASK-2016/2019/2020/2021/2022. Este documento describe el comportamiento
ejecutable; el [contrato objetivo](cotizador-v3-contrato-y-validacion.md) conserva la dirección de evolución.
El [manual operativo](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) es la entrada para Codex y
Claude. El [cotizador canónico](cotizador.md) conserva su API, permisos, lifecycle y consumidores actuales.
Los párrafos fechados 2026-10-10 describen el endurecimiento posterior de la CLI (errores tipados, resumen
derivado y veredicto de piso); el resto conserva el estado verificado del 2026-10-09.

## Las piezas y sus versiones

| Pieza                     | Contrato ejecutable                                         | Qué recibe y qué devuelve                                                                      |
| ------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Núcleo                    | `schemas.ts`, `calculate.ts`                                | Request `1.0.0` y snapshot resuelto; cálculo Decimal sin archivos, DB, HTTP, proveedores o LLM |
| Catálogo monetario        | `pricing-v3-catalog/1`                                      | Perfiles, costos, kits, asignación, precio, países, monedas, factores y FX con fuentes         |
| Brief                     | `pricing-v3-brief/1`                                        | Necesidad y selecciones; el resolver devuelve bindings, supuestos y pendientes                 |
| Policy de recursos        | `pricing-v3-resource-policy/1`                              | Base común, tareas, reglas de perfil, acceso, planes y capacidades; modo `review_only`         |
| Demanda compuesta         | `pricing-v3-composition-demand/1`                           | Brief, trabajo, usuarios, tareas, IA, allocations, presupuestos y cobertura cliente            |
| Plan                      | `pricing-v3-operating-plan/1`                               | Demanda y portfolio opcional; produce demanda resuelta sin elegir reparto arbitrario           |
| Portfolio                 | `pricing-v3-resource-portfolio/1`                           | Capacidad de clientes, interna y sin asignar; genera allocations y reconciliación              |
| Créditos                  | `pricing-v3-credit-catalog/1`, `pricing-v3-credit-budget/1` | Suscripción, paquetes y demanda por proveedor; presupuesto, caja y remanente                   |
| Mantenimiento monetario   | `pricing-v3-catalog-change/1`                               | Add/replace/retire y dimensiones nuevas; preview con impacto y sucesor con audit               |
| Mantenimiento de recursos | `pricing-v3-resource-change/1`                              | Replacement completo `policy` o `credits`; preview con impacto y sucesor nuevo                 |
| Composición congelada     | `pricing-v3-resource-composition/1`                         | Catálogo, policy, créditos, demanda y resultado completos; digest y replay verificable         |
| Preview                   | `pricing-v3-composition-preview/1`                          | Proyección local de precio, calendario e impuestos; no una cotización emitida                  |
| Resumen de composición    | `pricing-v3-composition-summary/1`                          | Lectura derivada del resultado congelado: bloqueos, señales, piso y caja; no decide nada       |
| Rechazos                  | `errors.ts`, `PricingV3Error`                               | Registro cerrado de códigos de dominio y adaptador; el detalle sólo nombra opción o ruta       |

Fuentes ejecutables: [dominio](../../../src/lib/finance/pricing-v3/),
[CLI](../../../scripts/commercial/pricing-v3.ts), [fixtures operativas](../../../data/pricing/v3-operating/README.md).
Versiones de reproducción: motor `pricing-v3-local/1.0.0`, artefacto de snapshot `pricing-v3-local-artifact/1`, quote de catálogo `pricing-v3-selection-quote/1` y composición `pricing-v3-resource-composition/1`.
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

FX conserva par, tasa, fecha, fuente e IDs; convertir exige la dirección seleccionada, sin invertir o cruzar
automáticamente. La referencia EUR→USD de la fixture operativa es 1.1206 al 09-10-2026; permite simular Magnific,
no fija una tasa contractual. Impuestos pueden quedar pendientes con `tax=null` y `grandTotal=null`, no cero.
El kernel no infiere obligaciones fiscales por país.

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

Mantenimiento monetario y de recursos son carriles distintos. Preview valida schema/referencias/base, calcula
impactos y digest; apply reconstruye el mismo contexto/impacto y exige ese digest. Un cambio confirmado de importe
no hereda evidencia vieja. Change-set monetario retiene actor/audit; cambio de policy/créditos conserva reason y
preview y exige nueva versión completa. Ninguno activa automáticamente un archivo, compra, reajusta contratos
o modifica artefactos. Elegir sucesor requiere rutas explícitas. El CLI sin `--catalog` conserva review-v1.

Un artefacto de composición congela catálogo, policy, créditos, demanda y resultado; `createdAt` queda fuera
del digest semántico. Replay verifica integridad y vuelve a calcular con la versión soportada disponible.
Explicación, comparación y nuevas versiones preservan lo anterior; no siguen punteros a precios actuales.
El presupuesto IA separado posee su propio formato: no es una quote válida para replay.
[Mantenimiento completo](cotizador-v3-mantenimiento-catalogo.md).

## Evaluación, salidas y límites

`compose assess` separa completitud matemática de evidencia: salario localizado, provisiones medidas,
suscripciones/acceso/capacidad reales, asignación simulada, impuestos/entidad, SOW y autorización comercial.
Siempre devuelve revisión. 40% objetivo/35% piso son propuesta, `approved=false`; no reemplazan la policy elegida ni pisos vigentes de la práctica. Creative Practice conserva 45% bruto aprobado: el aviso genérico de `assess` no certifica ese piso ni permite una excepción creativa. El agente debe calcular y verificar el piso de la oferta correspondiente.
TrialAssurance 25/operación 25/setup 100 permanecen recursos de prueba, no estándares de Talent Assurance.

Delta 2026-10-10: `assess` ya reporta el piso de la política de precio seleccionada, sin recalcularlo. Agrega una
brecha `MARGIN_BELOW_POLICY_FLOOR` (owner Commercial/Finance) por cada línea que el kernel marcó
`MARGIN_BELOW_FLOOR`, y `margin.policyFloor.linesBelowFloor` con neto, margen, `marginRateRoundedDown` y
`marginAmountShortOfFloor` de cada una. `proposedTarget`/`proposedFloor` no cambian. El veredicto vale sólo si la
oferta elegida codifica el piso de su práctica: con `creative-managed-service` (objetivo y mínimo 0,45) lo hace; una
política con mínimo 0 no marca nada y `assess` no suple esa verificación. Con objetivo igual al mínimo, costo y precio
se redondean a CLP enteros por separado y una línea al piso puede quedar bajo él por menos de 1 CLP: el kernel la
marca y nunca sube el precio. En el ejemplo `managed-care.*` las seis líneas quedan cortas por 0,1 a 0,5 CLP;
`marginAmountShortOfFloor` distingue esa brecha de redondeo de un incumplimiento real.

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

Verificación de implementación TASK-2022: 135 tests V3 + 78 V2 = 213, 26 smokes CLI y replay de baselines preservados.
Readback del 2026-10-10 tras el endurecimiento de la CLI: `pnpm pricing:v3:test` con 9 archivos y 179 pruebas V3,
ESLint y `pnpm typecheck` limpios, y `pricing:v3 replay` con `verified: true` en los `*.artifact.json` presentes ese
día bajo `data/pricing/` (16) y en la carpeta del caso SKY (13). Los conteos de TASK-2022 siguen siendo la evidencia
fechada de ese cierre; `verification.cli.json` registra sólo operación y código de salida, así que sigue vigente.
[Evidencia de comandos](../../../data/pricing/v3-operating/verification.cli.json). El inventario vivo, salarios
vigentes, medición de provisiones, policy comercial y términos reales siguen en
[ledger de pendientes](../../../data/pricing/v3-operating/operational-gaps.json). Cambios salariales por periodo,
drivers actuariales/contables, setup amortizado, fees porcentuales, ajustes encadenados y promoción de consumers
API/UI/MCP/Nexa necesitan extensión propia. [Handoff de promoción](cotizador-v3-promocion-canonica.md).
