# Pricing V3 — composición de recursos por demanda

- Status: Accepted para prototipo local, dirección autorizada por operador2026-10-09.
- Owner: Operations/Finance para reglas/costos/asignación; Platform para contrato.
- Work unit: TASK-2021.
- Predecessors: catálogo/mantenimiento V3 y presupuesto IA; no los sustituye.

## Decision

Policy de recursos versionada separada del catálogo monetario y crédito. Demanda declara perfiles/tareas,
slots de usuarios, selección IA, créditos y asignaciones por mes; no precios. Selección aplica base universal,
reglas de perfiles/tareas y elecciones explícitas. No confundir Copywriter con SEO Specialist ni cambiar salario
por requerir SEMrush. Cliente aporta alcance; catálogo/policy aportan valores y reglas.

Resolver primero componentes humanos y no-tool del kit elegido. Compositor inyecta recursos/asignaciones
normalizados en snapshots por periodo y reusa orquestador/kernel V3 para precio, márgenes y FX. Ninguna fórmula
comercial pertenece al agente o CLI. Baseline y formato legacy permanecen intactos; el nuevo artefacto congela
catálogo monetario, policy, créditos, demanda, selección y resultado para explain/replay independiente.

Cada precio tiene unidad/fuente/vigencia. Variantes múltiples requieren elección, no opción barata implícita.
Pool exige cantidad de paquetes/seats y cuota atribuida con razón; asignación dentro del quote pondera usuarios
únicos, reparto entre funciones de una misma persona explícitamente trazable. Licencias nominativas no se
comparten entre usuarios: cantidades requeridas por usuarios únicos. No reducir licencias por FTE. Pools de
plataforma requieren driver y capacidad externos al quote; no se inventa denominador de cartera ni se duplica
el costo íntegro por persona. Reconciliación es local al input, no reserva global.

Créditos se agregan por proveedor/mes antes de planear un paquete; consumo por función distribuye costo del
presupuesto con remanente visible. Saldo disponible declarado, no live. Cuota atribuida y nueva compra se
separan; caja modelada del kernel no es factura ni gasto incremental. No reutilizar créditos/paquetes fuera de
su ventana ni asumir remanente de otro cliente. FX requiere referencia explícita cuando se agrega otra moneda.

Servicios conservan unidad comercial/alcance; el quote de capacidad es costeo interno y no certifica venta por
hora, suficiencia de delivery o términos contractuales. Composición local es sólo simulación/requires_review;
planes nuevos/desconocidos, históricos y reparto sin confirmar no se convierten en costo operativo aprobado.

## Boundaries and failure

Dominio browser-safe, Zod/Decimal existentes; hash/FS sólo adapter/CLI. Sin DB/API/UI/MCP/provider writes,
compra, asignación live ni export público. Faltante/ambigüedad, usuarios inconsistentes, asignación sobrante,
consumo inválido, FX ausente o fecha incompatible → needs_input, sin total completo. Ningún precio inline.
Tool común obligatoria no desaparece por usar otro PMS cliente. Reemplazo de cuotas/precios exige versión nueva;
quotes anteriores sólo se verifican desde sus propios datos congelados.

*Nota 2026-10-11 (noche):* «no precios» y «ningún precio inline» siguen valiendo para personas, herramientas,
créditos y provisiones. Desde el contrato `1.4.0` el brief de una demanda puede declarar además los costos de
terceros del encargo (`thirdPartyCosts[]`). Cada uno lleva el importe de la cotización de un proveedor con su
evidencia: es un costo con fuente, no un precio, y su regla de precio sale del catálogo por categoría; la demanda
nunca escribe una tasa. El compositor lleva el brief al kernel sin tocarlo y sigue inyectando sus herramientas. Una
reserva de contingencia de base `own_costs` descansa también sobre esas herramientas compuestas, y nunca sobre un
costo de terceros.
[ADR del motor](GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md#delta-2026-10-11--contrato-140-costos-de-terceros-y-reserva-de-contingencia).

## Verification / alternatives

Tres escenarios de selección, asignación y costo (SEO, diseño y servicio multirol), negativos, replay y
regresiones legacy. Rechazado: sumar todas las tools a todos, fórmulas en CLI, actualizar baseline in-place,
usar divisores históricos como permisos de compartir seats o facturas actuales. Reabrir para promoción
comercial, inventario/portfolio live, contratos de licencias y consumers canónicos.

## Operación vigente y guardas ampliadas

La policy inicial de tres perfiles y sus artifacts se conservan inmutables. TASK-2022 añadió una sucesora de
revisión con reglas para los 32 perfiles históricos: [flujo operativo](GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md).
Los 26 recursos originales se clasifican en 25 herramientas y un fee de plataforma genérico; ese fee permanece
en el resolvedor monetario y no se duplica como herramienta ni depende de una marca como Deel.

El compositor ahora verifica seats nominativos enteros, cantidad por usuarios únicos, capacidad de paquete y
mínimo de contrato de Team; paquetes combinados no permiten sumar otra vez el componente incluido. Cobertura
aportada por el cliente exige líneas, motivo y evidencia confirmada que abarque todo el período de actividad,
no sólo el día de cotización. No sustituye Notion/Microsoft 365 internos ni el planner de créditos. Cobertura
parcial excluye sólo sus consumidores; cobertura/asignación sobrante o duplicada se rechaza.

Portfolio deriva cuotas desde unidades declaradas reconciliadas por recurso/período/cuenta y conserva la parte
interna, no asignada y residual. El reparto dentro de la cotización continúa ponderando usuarios únicos de las
funciones consumidoras; no inferir dedicación real a partir de esa distribución. Seat individual necesita
asignación por usuario y no se convierte en pool de cartera. `assess` separa cálculo y preparación económica;
`preview` proyecta únicamente datos comerciales allowlisted y estado de simulación. Nuevas versiones de policy
no cambian quotes existentes y ninguna de estas guardas demuestra compra, acceso real o reserva global.

*Nota 2026-10-11:* «paquetes combinados no permiten sumar otra vez el componente incluido» vale desde la policy v7
por persona o línea, no por cotización: ver el
[delta de plazo de compromiso y Adobe](#delta-2026-10-11--plazo-de-compromiso-de-una-licencia-adobe-como-se-factura-y-costos-en-clp).

## Delta 2026-10-11 — un precio unitario no vence: vigencia dura y fecha de revisión

**Contexto.** Cada precio de herramienta de la policy lleva una fuente con vigencia (`price.source.effectiveFrom` y
`effectiveUntil`), y una cotización fechada fuera de ella se bloquea con `RESOURCE_PRICE_NOT_EFFECTIVE`. Hasta la
policy v5 esa vigencia era una ventana corta de revisión: 30 días desde la evidencia en casi todos los precios y el
período facturado en Notion. El cotizador dejaba de calcular por sí solo: con v5, una cotización fechada desde el
2026-10-21 se bloquea en Notion, que es base común de todo trabajo.

**Decisión del operador (CEO, 2026-10-11).** Un precio unitario no vence. En sus términos: Notion o Microsoft 365 no
cambian su precio; lo que cambia es cuántas licencias se contratan.

- El precio unitario rige hasta que se lo reemplaza (`effectiveUntil` `9999-12-31`) y cambia sólo emitiendo una
  versión nueva de la policy. La cantidad de asientos se declara por cotización; no es parte del precio.
- Quedan dos fechas con significado distinto:

  | Campo | Qué es | Efecto |
  | --- | --- | --- |
  | `price.source.effectiveUntil` | Vigencia dura | Pasada, bloquea la cotización (`RESOURCE_PRICE_NOT_EFFECTIVE`) |
  | `reviewBy` (opcional, por entrada de precio) | Fecha para volver a mirar el precio | Avisa; nunca bloquea ni cambia un resultado |

- `reviewBy` vive en la entrada de precio y no en `price.source`, porque ese objeto es la fuente estricta que recibe
  el kernel. No llega a ningún cálculo ni a un resultado congelado. Una entrada con `pendingReason` (un precio que
  todavía nadie tiene) no admite `reviewBy`.
- **Lectura** (`resources/price-review.ts`, contrato `pricing-v3-price-review/1`, derivada y sin efecto sobre
  precios ni cálculos). `resources inspect` devuelve un bloque `priceReview` con `withinDays` (30), `reviewDue`
  (revisiones ya pasadas), `dueSoon` (vigencias duras o revisiones dentro de la ventana) y `expired` (vigencias duras
  ya pasadas: una cotización con esa fecha no puede usarlas), leídas a la fecha de `--date`. Cada aviso trae `kind` (`hard_expiry | review`),
  `subject` (`tool_price | resource_policy | catalog_record | credit_provider`), `ref`, `date`, `daysLeft` y
  `blocksWith`: el diagnóstico que recibirá una cotización cuando pase esa vigencia dura, o `null` en una revisión.
  Incluye las vigencias duras del catálogo monetario que recibe y, con `--credits` o `--current`, las de los
  proveedores de crédito. Un registro de catálogo que termina porque empieza su siguiente revisión, o que fue
  retirado, no se lista. Para una cotización, lo mismo filtrado a lo que usó sale en `runNotices.priceDates`
  ([flujo operativo](GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--versiones-vigentes-por-puntero-avisos-de-la-corrida-y-exposición-a-estimaciones)).
  *Nota 2026-10-11 (noche):* la lista de `subject` tiene un quinto valor, `third_party_quote`: la vigencia de la
  cotización del proveedor de un costo de terceros refacturado (contrato `1.4.0`). Sale sólo en los avisos de una
  cotización, por `costId` y concepto, con `blocksWith: "STALE_SOURCE"`. Y `blocksWith` puede ser `null` también en
  una vigencia dura: la de un registro `contingency_reserve`, cuyo término no bloquea nada. Ese aviso lleva un campo
  `consequence` que dice qué pasa en su lugar (la cotización siguiente sale sin reserva); para una cotización que
  renuncia a la reserva, `blocksWith` es `CONTINGENCY_WAIVER_WITHOUT_RESERVE`.

**Datos.** `resources.review-v6.json` (versión `operating-review-2026-10-11-v6`, cambio
`stable-unit-prices.change.json` sobre v5): los 25 precios de herramienta quedan sin fecha de término y cada uno
lleva `reviewBy` 2027-04-11. Ningún importe, moneda, unidad ni referencia de fuente cambió. La fecha a seis meses la
eligió el agente; el operador decidió que el precio no vence, no esa fecha. La mayoría de esos precios siguen siendo
precios públicos de lista marcados como estimados: que no venzan no los confirma.

**Alternativas descartadas.**

- *Mantener vencimientos de 30 días y avisar antes.* El aviso no evita el bloqueo: cada mes habría que reemitir la
  policy sin que ningún precio hubiera cambiado, y una cotización con fecha futura seguiría sin poder calcularse.
- *Quitar toda fecha.* Un precio de lista sin fecha de revisión se queda viejo sin que nadie lo note.
- *Poner la fecha de revisión dentro de `price.source`.* Ese objeto es la fuente estricta que recibe el kernel; un
  campo nuevo ahí exigiría cambiar su contrato de entrada por un dato que no participa del cálculo.
- *Que la revisión vencida degrade el estado de la cotización.* Mezcla un recordatorio de mantenimiento con el
  resultado; el estado ya es `requires_review` y los datos estimados ya se informan aparte.

**Reglas duras.**

- **NUNCA** tratar una fecha de revisión pasada (`reviewDue`) como bloqueo ni cambiar una cifra por ella.
- **NUNCA** dar a un precio unitario una vigencia corta «para forzar la revisión»: la vigencia dura es para un precio
  que de verdad deja de regir en una fecha; la revisión va en `reviewBy`.
- **NUNCA** cambiar un precio o su `reviewBy` editando una policy emitida: se emite una versión nueva y se mueve el
  puntero.
- **NUNCA** leer «no vence» como «confirmado»: el estado de la fuente (`estimated | confirmed`) no cambió.
- **SIEMPRE** declarar la cantidad de asientos en la demanda; nunca dentro del precio.
- **SIEMPRE** informar al operador las revisiones vencidas o próximas que traiga `runNotices.priceDates`, junto al
  resultado.

**Sigue abierto.** Confirmar el plan contratado donde el precio es público de lista y revisar cada precio en su
fecha: `UNIT_PRICE_REVIEW` en [operational-gaps.json](../../data/pricing/v3-operating/operational-gaps.json). El
registro EUR→USD del BCE, válido un solo día, sigue saliendo como `expired` en `resources inspect` aunque el
catálogo v6 ya tiene un tipo de cambio de cotización EUR→USD sin fecha de término.

*Nota 2026-10-11 (tarde):* «los 25 precios de herramienta» y «cada uno lleva `reviewBy` 2027-04-11» describen la
policy v6. La v7 separó Adobe en dos productos con otros importes y otra fecha de revisión para Creative Cloud Pro;
es el delta siguiente. El modelo de dos fechas no cambió.

## Delta 2026-10-11 — plazo de compromiso de una licencia, Adobe como se factura y costos en CLP

Posterior al delta anterior del mismo día. Son cuatro cambios de la composición, registrados en las policies v7 y v8
y en un registro del catálogo v9. La policy v9, del mismo día, completó la Decisión 3 con las facturas de Microsoft
365 y Notion y la fecha de renovación de Adobe. La policy v10, también del mismo día, cambió qué precio de Creative
Cloud Pro es el de defecto (Decisión 1, última viñeta).

**Contexto.** Tres cosas no cuadraban con los hechos.

- Adobe estaba en la policy como un solo paquete de USD 180 declarado por el operador. La factura de Adobe
  3582641940, del 2026-09-16, que el operador (CEO) mostró el 2026-10-11, tiene dos productos, en CLP.
- Una entrada de precio decía qué se factura (`price.unit`: mes, año, una vez) y no tenía dónde decir por cuánto
  tiempo hay que seguir pagando una licencia una vez tomada. Una licencia que se sigue cobrando hasta que termina un
  contrato anual se veía igual que una que se suelta cuando deja de usarse.
- La regla `BUNDLED_TOOL_DOUBLE_COUNT` bloqueaba cualquier cotización que tuviera el plan y un producto incluido en
  él, aunque fueran de personas distintas.

**Decisión 1 — Adobe como se factura (policy v7, `adobe-invoice.change.json`).** Dos productos, no un paquete:

| Herramienta | Qué es | Licencias | Importe mensual | Tareas |
| --- | --- | --- | --- | --- |
| `adobe` | Adobe Creative Cloud Pro; ya incluye Adobe Express (`bundledToolIds`) | 3 | CLP 162.605 | `visual-design`, `video-editing` |
| `adobe-express` | Adobe Express | 3 | CLP 16.240 | `express-design` |

- **Quién usa cuál.** Creative Cloud Pro, los diseñadores. Adobe Express, los perfiles de contenido: las recetas de
  Social Media Manager (ECG-006), Community Manager (ECG-007), Content Manager (ECG-010) y Content Creator
  (ECG-028) incluyen `express-design`. Los cuatro perfiles los confirmó el CEO.
- **Importes con IVA**, por decisión del CEO: el impuesto se recupera, pero no mes a mes. Son los totales de la
  factura.
- **Moneda CLP**, como se factura. En la policy v7 los dos precios `current` estaban `confirmed` con la factura como
  fuente; desde la v10 el `current` de Creative Cloud Pro es el precio sin descuento, `estimated` (última viñeta).
- **Una licencia de tres es un tercio del paquete**: CLP 54.202 al mes del importe facturado con descuento, CLP
  108.468,5 del precio sin descuento que rige desde la policy v10. La demanda lo declara
  con `seatCapacity: 3` y la cuota correspondiente. Una simulación anterior atribuyó el paquete entero a una persona;
  los ejemplos escritos desde ella sobrestiman las herramientas.
- **El descuento de Creative Cloud Pro termina.** Hoy tiene 50 % de descuento y el CEO espera que termine en unos
  dos meses; después rige el precio de lista. Ese precio es la entrada `renewal-scenario`: CLP 325.405,5 al mes (el
  precio de lista de la factura, con IVA), `estimated`. `current` llevaba `reviewBy` 2026-12-01; desde la policy v9
  es 2026-11-16, la fecha en que renueva el contrato (Decisión 3). Que el descuento termine justo en esa renovación
  no está confirmado. Nada se activa solo.
- **Desde la policy v10 se cotiza sin el descuento (`adobe-without-discount.change.json`).** Decisión del CEO del
  2026-10-11, en sus términos: «prefiero que se calcule sin descuento de una vez», porque al descuento le quedan
  unos 36 días y un fee cotizado hoy tiene que sostenerse después. Sólo cambia la herramienta `adobe`:
  - `current` pasa a ser el precio **sin** descuento: CLP 325.405,5 al mes por las tres licencias (el precio de
    lista de la factura 3582641940, CLP 91.150 por licencia más IVA), es decir CLP 108.468,5 por licencia. Queda
    `estimated` hasta que exista una factura a precio completo. Es lo que usa por defecto toda cotización nueva.
    *Nota 2026-10-11 (noche):* la policy v11 lo marca `confirmed`: es un valor decidido por el CEO sobre el precio
    de lista impreso en la factura, no un dato a la espera de otra factura. Si Adobe cambia su precio de lista, es
    un cambio de precio común y se resuelve con una versión nueva.
  - `invoiced-with-discount` es un `priceId` nuevo: CLP 162.605 al mes, lo que Adobe factura hasta que termine el
    descuento, `confirmed`. Sólo entra por elección explícita, para un trabajo que termina antes que el descuento, y
    esa elección es del operador.
  - `renewal-scenario` desaparece: es el `current` de ahora.
  - Los dos precios conservan `commitmentTermMonths: 12`, `commitmentRenewsOn: 2026-11-16` y `reviewBy` 2026-11-16.
    Adobe Express no cambia (CLP 16.240, sin descuento).

  La alternativa que queda descartada es la de la policy v7: cotizar con el importe facturado y cambiar a mano de
  precio cuando el engagement pasa del fin del descuento. Dejaba el precio correcto dependiendo de que alguien se
  acordara.

**Decisión 2 — un costo en CLP vuelve a CLP por el mismo importe (catálogo v9).** El catálogo calcula en USD. Se
agrega `fx:CLP:USD` = 0,001, el inverso del tipo de cambio de cotización de 1.000 CLP por USD que mantiene el CEO.
Es un valor de política, no una observación de mercado, y debe moverse junto con `fx:USD:CLP`. Así un costo
facturado en CLP entra al cálculo y vuelve a una cotización en CLP por el mismo importe. Una demanda que usa una
herramienta con precio en CLP debe nombrar `fx:CLP:USD` en `fxRecordIds`, igual que una en EUR nombra `fx:EUR:USD`.

**Decisión 3 — el plazo de compromiso es un dato aparte de la facturación.** Campo opcional nuevo en la entrada de
precio de la policy: `commitmentTermMonths`, entero de 1 a 120. Dice por cuántos meses hay que pagar una licencia
una vez que se toma.

- **Es un dato del asiento, no del papel.** Lo que cuenta no es por cuánto se firmó el contrato, sino si la cuenta
  baja cuando se quita una licencia. Los dos casos que el CEO describió el 2026-10-11:
  - Adobe: una licencia comprada queda disponible y se sigue cobrando hasta que el contrato renueva; la cuenta no
    baja antes. Plazo 12.
  - Microsoft 365: también se contrata por un año y se paga mes a mes, **pero quitar una licencia baja la cuenta**.
    Plazo 1: cuando termina un encargo corto no queda nada comprometido.
- Facturación y compromiso son dos hechos. `price.unit` sigue diciendo qué se factura y es lo único que necesita el
  kernel. Un asiento que se sigue cobrando hasta el fin de un contrato anual es `unit: "month"` con
  `commitmentTermMonths: 12`.
- `1` también es una declaración: se paga mes a mes y se puede dejar. Es distinto de no declarar nada, que significa
  «nadie lo dijo».
- El campo nunca llega a un cálculo ni a un resultado congelado. Lo lee una sola cosa: `compose commitments`
  ([flujo operativo](GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--tres-lecturas-de-una-cotización-congelada-calendario-caja-y-compromisos)).
- Una entrada con `pendingReason` (un precio que todavía nadie tiene) no admite plazo, como no admite `reviewBy`.
- **Plazos declarados**, todos dichos por el CEO el 2026-10-11:

  | Herramienta y precio | Plazo | Desde |
  | --- | --- | --- |
  | `adobe` (`current`, y `renewal-scenario` hasta la v9 o `invoiced-with-discount` desde la v10) y `adobe-express` (`current`) | 12 | policy v7 |
  | `notion` (`current`) | 1 | policy v8 |
  | `microsoft-365` (los dos precios públicos por mes) | 1 | policy v8 |
  | `microsoft-365` (`current`, como se factura) | 1 | policy v9 |

  HubSpot se contrata por año, según el CEO, pero su precio vigente está pendiente de evidencia y por eso no lleva
  plazo. La policy v8 (`supplier-contract-terms.change.json`) sólo agrega plazos: ningún importe, moneda ni unidad
  cambió. En ella los importes de Microsoft 365 eran precios públicos de lista, porque su factura estaba pendiente.
  *Nota 2026-10-11 (noche):* el CEO dijo ese día que HubSpot no hace falta en las cotizaciones por ahora; su precio
  queda pendiente a propósito y no es un insumo que falte para cotizar.
- **Microsoft 365 y Notion como se facturan (policy v9, `microsoft-invoice-adobe-renewal.change.json`).** El CEO
  mostró las dos facturas el 2026-10-11. Microsoft 365, factura G185142527 del 2026-09-16: Business Standard, USD
  14,70 por licencia al mes, seis licencias, sin impuesto; su precio `current` deja de estar pendiente y queda
  `confirmed`. La factura nombra un compromiso de un año facturado mes a mes, y el CEO afirma que asignar o quitar
  una licencia sube o baja el monto mensual: el asiento ata un mes. Los precios públicos (`public-standard-teams-monthly`
  a USD 16,80 y los demás) siguen en la policy; una cotización nueva debería elegir `current`. Notion, factura
  0D8C80A9-0039 del 2026-09-21: Business mensual, nueve miembros a USD 24, más 3000 créditos de Notion a USD 30, sin
  impuesto. Los importes no cambian; ahora citan la factura. Mes a mes.
- **La fecha de renovación es parte de la misma decisión.** Campo opcional `commitmentRenewsOn` (fecha ISO), que
  sólo se admite junto con `commitmentTermMonths`. El plazo dice cuánto ata un asiento; la fecha dice en qué punto
  está el plazo que ya corre. Con ella, `compose commitments` cuenta lo que queda hasta la renovación en lugar de
  suponer un plazo entero desde el primer mes cotizado. El contrato de Adobe renueva el 2026-11-16, según la consola
  del proveedor que mostró el CEO: plan anual pagado mes a mes; en la renovación se puede cambiar el número de
  licencias o cancelar el plan. Los precios de `adobe` y `adobe-express` declaran esa fecha y la llevan también como
  `reviewBy`.

**Decisión 4 — la regla de doble conteo de un bundle se acota.** `BUNDLED_TOOL_DOUBLE_COUNT` salta sólo cuando la
**misma** línea o persona tiene el plan y un producto que el plan incluye. Un diseñador con Creative Cloud Pro y un
community manager con Adobe Express en la misma cotización es un equipo mixto normal, no un doble conteo.

**Alternativas descartadas y por qué.**

- *Mantener el paquete de USD 180 declarado.* Hay factura: dos productos, en CLP, con otros importes. Una
  declaración no prevalece sobre la factura del mismo gasto.
- *Registrar los importes sin IVA.* El CEO decidió que van con IVA: el impuesto se recupera, pero no mes a mes.
- *Convertir la factura a USD y guardar ese importe.* El importe en CLP dejaría de ser el de la factura y una
  cotización en CLP lo devolvería distinto según el tipo de cambio de ese día. Con el inverso del tipo de cambio de
  cotización, ida y vuelta dan el mismo importe.
- *Expresar el contrato anual como `unit: "year"`.* El kernel cobraría el año entero en el primer período, y eso no
  es lo que se paga: se paga mes a mes. Mezcla facturación con compromiso.
- *Tomar el plazo del contrato firmado.* Microsoft 365 y Adobe son los dos contratos anuales pagados mes a mes, y
  sólo en uno queda algo comprometido cuando se quita una licencia. El plazo del papel no distingue los dos casos.
- *Poner el plazo dentro de `price.source`.* Es la fuente estricta que recibe el kernel; el plazo no participa del
  cálculo. Es el mismo motivo por el que `reviewBy` vive en la entrada de precio.
- *Seguir suponiendo un plazo entero y llamarlo techo.* Era el límite declarado de la policy v8. Con la fecha de la
  consola, la licencia de un encargo de un mes deja un mes comprometido, no once: el techo multiplicaba por once un
  dato que se podía declarar.
- *Dejar la regla de bundle por cotización.* Bloqueaba la forma normal de un equipo con un diseñador y perfiles de
  contenido.

Las dos primeras son decisiones del CEO, y la distinción entre el papel y el asiento es su aclaración del
2026-10-11. Las demás son razones de diseño que están en los datos y en el código; no fueron alternativas
presentadas al operador.

**Consecuencia para ejemplos anteriores.** Una demanda escrita para la policy v6 que tenga uno de los cuatro perfiles
de contenido, cotizada con `--current`, queda `needs_input` con `RESOURCE_ALLOCATION_REQUIRED` para `adobe-express`
hasta que declare la asignación o excluya la tarea con motivo (`work[].excludedProfileTasks`). Es el caso de
`managed-care-colombia.demand.json`; su artefacto congelado sigue respondiendo `verified: true`.

**Reglas duras.**

- **NUNCA** atribuir el paquete entero de Adobe a una persona: una licencia de tres es un tercio.
- **NUNCA** quitar el IVA de los importes de Adobe ni convertirlos a USD a mano.
- **NUNCA** leer la ausencia de `commitmentTermMonths` como «sin compromiso»: es «no declarado». Sin compromiso se
  declara con `1`.
- **NUNCA** declarar un plazo que el operador no dijo, ni sobre un precio pendiente.
- **NUNCA** copiar la duración del contrato firmado en `commitmentTermMonths`: se declara cuánto se sigue pagando un
  asiento después de quitarlo.
- **NUNCA** cambiar `price.unit` para expresar un compromiso, ni usar `effectiveUntil` para eso.
- **NUNCA** mover `fx:USD:CLP` sin mover `fx:CLP:USD` en el mismo change-set.
- **NUNCA** agregar Adobe Express a quien ya tiene Creative Cloud Pro.
- **SIEMPRE** nombrar `fx:CLP:USD` en `fxRecordIds` cuando la demanda usa una herramienta con precio en CLP.
- **SIEMPRE** cotizar Creative Cloud Pro con `current`, que desde la policy v10 ya es el precio sin descuento.
  `invoiced-with-discount` es la excepción, para un trabajo que termina antes que el descuento, y la decide el
  operador: **NUNCA** elegirlo por cuenta propia. (Hasta la v9 la regla era cotizar con `renewal-scenario` un
  engagement que pasara del fin del descuento, o decir que el fee absorbe el alza.)
- **SIEMPRE** correr `compose commitments` en un engagement acotado que use herramientas con plazo.

**Sigue abierto.**

- La fecha exacta en que termina el descuento de Creative Cloud Pro. El contrato renueva el 2026-11-16; que el
  descuento termine en esa renovación no está confirmado.
- La evidencia del plan de HubSpot. La factura de Microsoft 365 llegó con la policy v9.
  *Nota 2026-10-11 (noche):* la de HubSpot no se le debe pedir al operador: dijo que no hace falta en las
  cotizaciones por ahora, y el precio queda pendiente a propósito.
- El resto de las herramientas no declara plazo.
- La recuperación del IVA no se modela: el costo lleva el impuesto.
- **La fecha de renovación sólo está declarada para Adobe.** Un precio con `commitmentTermMonths` y sin
  `commitmentRenewsOn` se sigue leyendo como un plazo entero desde el primer mes cotizado, que sobrestima un contrato
  que ya está corriendo: sus importes son un techo. Con fecha, un mes cubierto en parte cuenta entero (hasta un mes
  de más) y las condiciones de salida no están en el artefacto. Los precios con `unit: "year"` ignoran los dos
  campos. Medido el 2026-10-11 al volver a cotizar `designer-on-demand.demand.json` con `--current` (policy v10): la
  licencia de Creative Cloud Pro (una de tres, CLP 108.468 al mes sin descuento) deja un mes comprometido, atada
  hasta el 2026-11-16.
