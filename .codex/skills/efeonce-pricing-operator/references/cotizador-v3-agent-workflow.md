# Cotizador V3: procedimiento para agentes

Referencia load-on-demand compartida Codex/Claude. Describe el comportamiento **vigente** del cotizador local
(`pnpm --silent pricing:v3`), en el orden en que se cotiza un negocio. La historia de cómo llegó aquí vive en los
ADR enlazados al final; aquí no se narra. Si esta referencia y el código difieren, gana el código
(`src/lib/finance/pricing-v3/`, `scripts/commercial/pricing-v3.ts`): repórtalo.

Orden: 1) [reglas de fondo](#1-reglas-de-fondo) → 2) [decidir qué cotizar](#2-decidir-qué-cotizar) →
3) [componer la demanda](#3-componer-la-demanda) → 4) [cotizar y leer el resultado](#4-cotizar-y-leer-el-resultado) →
5) [revisar](#5-revisar-antes-de-presentar) → 6) [el documento para el cliente](#6-el-documento-para-el-cliente) →
7) [ejemplos por tipo de negocio](#7-ejemplos-por-tipo-de-negocio) → 8) [nunca](#8-nunca) →
9) [lo que no está modelado](#9-lo-que-no-está-modelado) → 10) [datos, mantenimiento y código](#10-datos-mantenimiento-y-código).

## 1. Reglas de fondo

- **El agente interpreta; el dominio calcula.** Tú escribes la demanda y los textos; precio, margen, impuesto,
  redondeo, FX y veredicto del piso salen del motor. Nunca calcules una tasa a mano para llegar a un precio.
- **Es un prototipo local.** No escribe en base de datos, API ni CRM. Una cotización calculada es una simulación en
  revisión (`binding: false`, `reviewStatus: requires_review`): no es costo validado, precio aprobado, asignación de
  personas ni cotización emitida. Número de cotización, versiones, QR, firmas, aprobación y envío existen sólo en el
  cotizador de Greenhouse, al que este carril no escribe.
- **Las versiones vigentes no se nombran a mano.** `--current` carga catálogo, policy de recursos y catálogo de
  créditos desde el puntero `data/pricing/v3-operating/current.json`, después de verificar versión y digest.
  `pnpm --silent pricing:v3 current show` dice cuáles son; no las cites de memoria. Sin `--current` ni `--catalog`
  la CLI usa una baseline histórica: nunca cotices así un negocio nuevo.
- **Decisiones del CEO (operador y dueño), que no se reabren:** los pisos de margen y toda excepción bajo un piso;
  los objetivos por oferta; el FX de cotización y los múltiplos de redondeo; los factores de país (cerrados, valores
  de política); la base de costo es el **costo objetivo** de cada perfil, no la nómina (el margen real de hoy sobre
  personas es mayor que el que muestra el cotizador: no propongas conectar la nómina, no llames a ese costo «lo que
  Efeonce paga» y no escribas el pago de una persona en ningún archivo); y **una cotización no es un contrato**: la
  fecha de inicio del servicio y la duración del contrato no son insumos, no se piden, no se listan como pendiente y
  el documento no dice lo obvio.
- **El agente le lleva al operador** el margen real del motor, las filas bajo el piso, qué parte del costo es
  estimada y una recomendación. No aprueba, no da una excepción por implícita y no usa un ajuste, un redondeo o una
  fecha para «cumplir» un piso.
- **Códigos de salida:** `0` operación técnica verificada; `2` falta un insumo (`needs_input`, sin precio); `3`
  calculado o preparado, en revisión (es el resultado normal de una cotización); `1` rechazo. No encadenes comandos
  con `&&` esperando `0` de una cotización calculada.
- **Nada se sobrescribe.** `--out` es siempre una ruta nueva (`OUTPUT_EXISTS` si existe). No edites un archivo
  versionado ni un artefacto congelado: trabaja sobre una copia de la demanda.

## 2. Decidir qué cotizar

### 2.1 Tabla por tipo de negocio

| El negocio es… | `offerId` | `commercialUnit` | `engagementForm` | `periods` | Precio acordado | En el documento |
| --- | --- | --- | --- | --- | --- | --- |
| Una persona vendida por dedicación (refuerzo, staff augmentation); el cliente dirige el trabajo | `talent-assurance-staffing` | `role_capacity` | Según el negocio ([2.3](#23-forma-del-compromiso)) | Los meses que la cotización valoriza | `agreed_net` `monthly` por mes; la puesta en marcha, con `agreed_net` `setup` | Una línea por persona, plegada por meses, más su puesta en marcha |
| Un servicio recurrente gestionado de la práctica creativa (social care, producción, contenido) | `creative-managed-service` | `managed_service` | `on_going` | Los meses que la cotización valoriza | `agreed_net` `monthly` (fee mensual) | Una línea de fee, plegada por meses; nunca equipo ni horas |
| Un programa SEO/AEO | `seo-aeo-managed-service` | `managed_service` | `on_going` si es continuo; `on_demand` si tiene inicio, término y entregables | Todos los meses del programa | Programa: `agreed_total`. Fee mensual continuo: `agreed_net` `monthly` | Programa: `combine` → «1 programa». Mensual: fee plegado por meses |
| Un proyecto único de alcance cerrado (un sitio web, una campaña, una pieza mayor) | La oferta gestionada de la práctica que lo entrega | `managed_service` | `on_demand` | `1` si dura hasta un mes o pocas semanas; si no, sus meses | `agreed_total` (un precio por el trabajo completo) | `combine` → «1 proyecto», `cover.netLabel` |
| Un programa de varios meses en una licitación o Compra Ágil | La oferta gestionada de la práctica | `managed_service` | `on_demand` (alcance, plazo y aceptación fijados por las bases) | Los meses del programa | `agreed_total` (precio del programa) | `combine` → «1 programa», hitos de pago |

**No existe una oferta dedicada a proyectos únicos.** Hoy un proyecto se cotiza con la oferta de servicio gestionado
de su práctica, vendida On-Demand y a un precio; dilo al operador cuando aplique. Un negocio híbrido (una base
acotada y una operación continua) son **dos cotizaciones**: no hay forma «Híbrido».

### 2.2 Oferta y unidad comercial

- Hay tres ofertas (`catalog search --current --kind offer --date <fecha>`), con el objetivo y el piso que les fijó
  el CEO: `creative-managed-service` (objetivo 45 %, piso 45 %), `seo-aeo-managed-service` (objetivo 55 %, piso
  45 %) y `talent-assurance-staffing` (objetivo 30 %, 35 % o 40 % según el tier del perfil; piso 25 %). Lee la regla
  que le tocó a cada línea en `compose assess` → `margin.pricingPolicies[]`.
- Se elige **por práctica y por lo que se vende**, nunca por el margen que deja pasar: un programa SEO/AEO no se
  cotiza con la oferta creativa, y la oferta de staffing no se usa para un servicio gestionado.
- **La unidad comercial es un hecho del catálogo**, no una elección de la demanda: `creative-managed-service` y
  `seo-aeo-managed-service` se venden como `managed_service` (un fee; el cliente nunca ve equipo, horas ni roles) y
  `talent-assurance-staffing` como `role_capacity` (línea por línea). `compose scaffold` la escribe desde el
  catálogo. Una demanda que declara otra no calcula: `COMMERCIAL_UNIT_CONTRADICTS_OFFER` (exit 2). Si el catálogo
  no la declara para una oferta, el andamio deja `commercialUnit: null` y pregunta (`COMMERCIAL_UNIT_REQUIRED`): la
  confirma el operador.
- Dos demandas antiguas versionadas (`service.demand.json`, `service.plan.json`) juntan la oferta de staffing con
  `managed_service`: ya no cotizan con `--current`; sus artefactos congelados se siguen reproduciendo con `replay`.

### 2.3 Forma del compromiso

`brief.engagementForm` es `on_going` u `on_demand`. Es una condición comercial, no una oferta ni un modelo de
entrega; `engagementCode` (`monthly`) no se toca: es la cadencia y elige la política de precio.

Decídela desde el negocio, sin esperar a que alguien la dicte:

- **`on_demand`** si el trabajo tiene alcance acotado, inicio y término, y una aceptación o entrega final: un
  proyecto, una campaña, un programa de licitación, un refuerzo por una campaña.
- **`on_going`** si es un servicio mensual que continúa mientras no se le ponga término: una operación, un fee
  recurrente, una persona sumada al equipo del cliente sin fecha de salida.

Qué trae cada una:

- `on_going` tiene razón `1`; `on_demand`, `1.10`: multiplica el precio de **toda** la fila (persona, fee,
  provisiones, herramientas; mensual y puesta en marcha) después de la política y del factor de mercado y antes del
  redondeo y de los ajustes. **No cambia el costo ni mueve el piso**: es margen, y un descuento puede consumirlo.
  Las filas de terceros no la reciben.
- En un servicio gestionado, `on_demand` trae además la **reserva de contingencia** ([3.8](#38-reserva-de-contingencia)).
  Una persona por dedicación no lleva reserva.
- **Declárala siempre.** Sin el campo la cotización calcula como On-Going y no avisa; en un servicio gestionado
  deja el supuesto `CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM`: así no se presenta.
- No declares `on_demand` para subir un precio ni lo omitas para que no entre la reserva.
- Ver los registros: `catalog search --current --kind engagement_factor --date <fecha>`.

### 2.4 Periodos

`brief.periods` (1 a 60) son **los meses que la cotización valoriza**, no la duración del contrato. Cada periodo es
un mes; el periodo 1 es el mes de `quoteDate`. No se modelan periodos menores a un mes: un trabajo de pocas semanas
va en un periodo y su tamaño se expresa en la dedicación (horas del periodo).

| Lo que se ofrece | `periods` | Qué imprime el documento |
| --- | --- | --- |
| Un precio mensual, sin plazo que valorizar | `1` | «1 mes» al neto del mes. La portada dice el neto de un mes: nómbralo con `cover.netLabel` («Valor neto mensual») |
| Un precio mensual con un compromiso inicial que la oferta propone (p. ej. seis meses) | Los meses del compromiso | «6 meses» × el neto de un mes y el total de esos meses; nombra el neto de portada con `cover.netLabel` («Valor neto de seis meses de servicio») |
| Un programa de varios meses a un precio | Los meses del programa | Con `combine`: «1 programa», sin valor unitario, por el total |
| Un proyecto de pocas semanas | `1` | Con `combine`: «1 proyecto», por el total |

Lo que se cobra una vez (puesta en marcha, un costo de terceros único) cae en un periodo, normalmente el 1. Una
persona que trabaja sólo algunos meses lleva `activePeriods` en su línea. `compose commitments` lee los periodos
cotizados y supone que el trabajo termina con el último: dilo cuando cotices un mes representativo.

### 2.5 País, moneda, fecha e impuesto

- **Dos países, dos campos.** `brief.offerMarketCountry` = país del **cliente** → factor de mercado sobre el precio
  de la parte humana. `brief.lines[].talentCountry` = país de **cada persona** → factor de talento sobre el costo
  (costo en Chile × factor). No deduzcas uno del otro ni de la moneda. Registrados: CL, CO, PE, MX, US, ES. Valores:
  `catalog search --current --kind market_factor|talent_factor --date <fecha>`. País sin factor → exit 2
  (`MISSING_CATALOG_SELECTION`); no lo sustituyas por otro.
- **En Colombia y Perú el piso acompaña al factor de mercado** (`floorBasis: base_market`): al precio de política la
  cotización no sale marcada aunque su margen real quede bajo el piso de la oferta. El margen que se informa es
  siempre `marginRateRoundedDown`; «cero líneas marcadas» no significa «sobre el piso» en esos mercados.
- **Moneda:** `brief.outputCurrency` = CLP, USD, COP, MXN o PEN. USD es la moneda de cálculo; se convierte al final
  con el FX de cotización del catálogo (política del CEO, no tipo de cambio de mercado) y cada fila sube al múltiplo
  de su moneda (`catalog search --current --kind price_rounding`). La misma oferta en dos monedas no es una
  conversión exacta: cotiza en la moneda pedida, nunca conviertas a mano. **No se emite en EUR** (España se cotiza
  en USD); CLF no se presenta.
- **Fecha:** `brief.quoteDate` es la fecha de la cotización y elige los valores del catálogo. Una cotización no
  puede llevar una fecha anterior a los datos que usa: antes del primer día del catálogo →
  `QUOTE_DATE_BEFORE_CATALOG`; antes de la política de precio de esa oferta → `QUOTE_DATE_BEFORE_OFFER_POLICY`;
  antes de la policy de recursos → `RESOURCE_POLICY_NOT_EFFECTIVE`. Cada una dice en `detail` desde qué fecha rige.
  Con las versiones vigentes hoy, una fecha anterior al 2026-10-11 no calcula. No muevas `quoteDate` para simular
  otro inicio del servicio.
- **Impuesto:** `brief.taxTreatment` es `{ kind: "not_resolved" }` (por defecto: impuesto y total «Por confirmar»),
  `{ kind: "not_applicable", reason }` o `{ kind: "exclusive", rate, policyRef, source }`. El tratamiento lo decide
  el operador; no asumas una tasa para completar un documento.
- `brief.mode` es `simulation` (otro valor → `COMPOSITION_REVIEW_ONLY`). `brief.accountId` es un id propio del caso.

## 3. Componer la demanda

La demanda es un archivo `pricing-v3-composition-demand/1` con `commercialUnit`, `brief`, `work`, `serviceToolIds`,
`allocations`, `creditBudgets`, `fxRecordIds` y, opcionales, `seatSharing` y `clientProvidedTools`. Parte de un
ejemplo ([sección 7](#7-ejemplos-por-tipo-de-negocio)) o del andamio.

### 3.1 Andamio

```bash
pnpm --silent pricing:v3 catalog search --current --kind profile --query <texto> --date <fecha>
pnpm --silent pricing:v3 resources inspect --current --date <fecha> [--query <texto>]
pnpm --silent pricing:v3 compose scaffold --current --input brief.json      # exit 2: demanda editable + preguntas
```

`compose scaffold` recibe **sólo el `brief`** (`pricing-v3-brief/1`) y devuelve `demand` y `questions`. Pregunta por
el perfil exacto (`PROFILE_SELECTION_REQUIRED`), por tareas y personas (`WORK_TASKS_AND_USERS_REQUIRED`) y por el
plan y la asignación de las herramientas **base** y de las que agrega la receta del perfil
(`TOOL_PLAN_AND_ALLOCATION_REQUIRED`, con los `priceId` candidatos). **No pregunta por lo que el trabajo agrega**:
IA, herramientas de una tarea extra, créditos, terceros. Eso lo declaras tú ([3.3](#33-trabajo-work) a
[3.7](#37-costos-de-terceros)). No hay receta de servicio implícita.

### 3.2 Líneas (`brief.lines[]`)

Una línea es un perfil con su dedicación. Campos: `lineId`, `profile` (id `ECG-…`, alias o etiqueta exacta),
`seniorityCode` (opcional), `talentCountry`, `headcount`, `dedication`, `dedicationEvidence`, `allocationMode`,
`allocationPolicyId`, `kitId` (opcional), `activePeriods` (opcional), `choices`.

- **Dedicación, dos unidades.** `{ "unit": "fte", "value": "0.5" }` (mayor que 0, hasta 1) o
  `{ "unit": "hours_per_month", "value": "90" }`. Las horas se convierten con `hoursPerFteMonth` de la regla de
  asignación: **180 horas = 1 FTE-mes** (`catalog search --current --kind allocation`; es una referencia histórica,
  `estimated`). Más de 180 horas en una persona → `INVALID_DEDICATION`: sube `headcount` o divide la línea. Con
  horas, el resumen lista la línea en `estimateExposure.estimatedRules[].billedFteSetByRuleOn` (la capacidad
  cobrada la fijó la regla de conversión).
- **Modo.** `allocationMode: "dedicated"` con `allocationPolicyId: "allocation:dedicated"` cobra **1 FTE entero**
  sea cual sea la dedicación escrita. Una persona a tiempo parcial va `"shared"` con `"allocation:shared"`: se cobra
  su dedicación (la regla supone que el resto de su capacidad se vende a otra cuenta).
- **De dónde sale la dedicación (`dedicationEvidence`).** `{ reference, effectiveFrom, effectiveUntil, status }`,
  con `status` `confirmed` o `estimated`. Una dedicación acordada con el cliente se declara a mano, con su
  referencia; horas estimadas por la práctica van `estimated`. Debe estar vigente en `quoteDate` y no puede ir
  `pending` (`DEDICATION_EVIDENCE_NOT_EFFECTIVE`, `PENDING_DEDICATION_EVIDENCE`). Sin el campo la cotización
  calcula, pero su costo no cuenta como confirmado ([4.4](#44-qué-parte-del-costo-es-estimada)). No marques
  `confirmed` unas horas que nadie confirmó.
- **Dedicación desde un volumen.** Si el servicio se dimensiona por volumen (conversaciones, piezas, tickets), no
  escribas la dedicación a mano: `pnpm --silent pricing:v3 compose workload --input workload.json --brief brief.json
  --out brief-dimensionado.json` (`pricing-v3-workload/1`: unidades al mes × minutos, horas fijas y horas de
  presencia por línea; redondea hacia arriba) escribe la dedicación y su `dedicationEvidence`. Exit 0 listo; 2 si
  falta algo (`LINE_OVER_CAPACITY` pide decidir dotación). Ejemplo: `data/pricing/v3-operating/managed-care.workload.json`.
- **Kit.** Sin `kitId` rige el kit por defecto del perfil (los de staffing). Un servicio gestionado lleva
  `"kitId": "managed-service-core"` en cada línea. Qué agrega cada kit: [3.6](#36-lo-que-el-kit-agrega-solo).
- **Costo de persona.** Viene del catálogo, como costo objetivo de cada perfil en Chile, ajustado por el factor de
  talento del país de la línea. No se escribe en la demanda ni se copia a un documento.

### 3.3 Trabajo (`work[]`)

Una entrada por línea (`INVALID_WORK_LINES` si falta alguna): `lineId`, `assigneeIds`, `tasks`, `aiToolIds`,
`creditDemand` y, opcionales, `aiSelectionReason` y `excludedProfileTasks`.

- **`assigneeIds`**: tantos como `headcount`, sin repetir dentro de la línea (`INVALID_ASSIGNEE_SLOTS`). Son ids
  anónimos y estables: una etiqueta sin nombre ni correo, **la misma** cada vez que esa persona aparece (otra línea,
  `seatSharing`), porque los asientos se cuentan por id distinto y una persona en dos líneas ocupa un solo asiento.
  El andamio escribe `planned-<lineId>-<n>`: es un cupo, no una persona asignada ni un asiento comprado. Si nadie
  está asignado todavía, deja el cupo `planned-*`: la cotización calcula igual y `compose assess` mantiene abierto
  `USER_ASSIGNMENT_REQUIRED`, que es la verdad. No lo renombres para callar esa brecha.
- **`tasks`**: tareas del alcance que agregan herramientas, además de las de la receta del perfil (códigos en
  `resources inspect`, `tools[].tasks`). Ejemplo: `seo-writing` en un redactor agrega la suite SEO.
- **`excludedProfileTasks: [{ task, reason }]`**: una tarea de la receta del perfil que este trabajo no hace.
  Quien atiende una bandeja no diseña: se excluye `express-design` con ese motivo. Sólo se excluye lo que la receta
  agrega, y nunca para que la corrida pase ni para que cuadre una cuenta de asientos.
- **`aiToolIds`** + **`aiSelectionReason`**: IA elegida por necesidad, con su motivo
  (`AI_SELECTION_REASON_REQUIRED`). No sumes todas las IA a cada rol.
- **Sólo se declaran las herramientas que el negocio compromete.** Notion y Microsoft 365 son base de toda persona.
  El resto entra por la receta del perfil, por una tarea, por una selección de IA o por `serviceToolIds`
  (herramientas del servicio, no de una persona). Lo que el trabajo no usa no se declara «por si acaso».

### 3.4 Herramientas (`allocations[]`)

Cada herramienta que alguien usa en un periodo necesita su asignación, o la corrida se detiene con
`RESOURCE_ALLOCATION_REQUIRED` en `<periodo>:<toolId>` (y lista en `candidates` los `priceId` utilizables).

```json
{ "periodIds": [1, 2, 3], "toolId": "notion", "priceId": "current", "quantity": "3",
  "serviceShare": "0.283333333333333333",
  "driver": { "unit": "declared-fte-share", "totalUnits": "3", "allocatedUnits": "0.85" },
  "reason": "Tres asientos, uno por persona; el programa carga 0,85 de 3." }
```

- **`quantity`** es lo que se compra: asientos, o paquetes. En una herramienta nominativa (`access: named`) es
  entera (`WHOLE_NAMED_LICENSE_REQUIRED`).
- **`serviceShare`** es la parte del costo de esa compra que carga esta cotización, y **debe ser exactamente
  `allocatedUnits ÷ totalUnits`, truncado a 18 decimales** (0,85 ÷ 3 = `0.283333333333333333`; 1 ÷ 3 =
  `0.333333333333333333`). Otro valor → `ALLOCATION_DRIVER_MISMATCH`. `driver.unit` es un texto que nombra el
  denominador; no inventes un denominador ni un número de clientes.
- **Elegir el precio (`priceId`).** `resources inspect` lista por herramienta sus precios con `availability`:
  `reference_only` = tiene un monto vigente a esa fecha y se puede usar (es una referencia de precio: no acredita
  un asiento comprado ni un acceso); `needs_input` = no tiene monto (`pendingReason`) o está fuera de vigencia, y
  nombrarlo detiene la corrida (`RESOURCE_PRICE_PENDING`, `RESOURCE_PRICE_NOT_EFFECTIVE`). Los ids más comunes:
  `current` = lo que Efeonce tiene contratado, según factura o decisión del operador; `historical` = el monto del
  Excel histórico de pricing (`estimated`); `public-…` = precio público de lista (`estimated`). Regla: `current`
  cuando tiene monto. Cuando `current` es `needs_input`, elige entre los ids con monto el que describe el plan que
  de verdad se usaría y **repórtalo como un supuesto de la cotización**; sale como `ESTIMATED_SOURCE` y como
  `TOOL_COST_EVIDENCE_REVIEW` en `assess`. Nunca el más barato por serlo, ni cero. El precio de HubSpot está sin
  cargar a propósito: no lo pidas como dato pendiente.
- **Los asientos se declaran como se compran.** Por herramienta nominativa y periodo, con precios por asiento:
  asientos pagados (`quantity`) − asientos ociosos = personas que la usan (un grupo que comparte cuenta una vez).
  Si falta uno: `INSUFFICIENT_NAMED_SEAT_CAPACITY`. Si sobra uno: `UNACCOUNTED_NAMED_SEATS`. Con un paquete
  (`basis: package`), la asignación declara `seatCapacity` y la capacidad debe alcanzar.
- **Persona dedicada o a tiempo parcial.** El asiento es entero en los dos casos; lo que cambia es cuánto de su
  costo carga la cotización:
  - Dedicada: `quantity "1"`, `serviceShare "1"` (`driver` 1 de 1).
  - A tiempo parcial (`shared`): `quantity` sigue siendo un asiento por persona y `serviceShare` es la dedicación
    declarada sobre esos asientos. Una persona al 50 %: `allocatedUnits "0.5"` de `totalUnits "1"`. Un equipo de
    tres personas que suman 0,85 FTE: `quantity "3"`, 0,85 de 3. Así lo hacen los ejemplos versionados
    (`driver.unit: "declared-fte-share"`): el resto del asiento es de las otras cuentas de esa persona.
  - El costo se reparte entre las líneas por asiento (cada persona pesa 1, o `1/g` en un grupo), no por horas.
- **Adobe** se cotiza como se factura: paquetes de tres licencias, en CLP y con IVA. Creative Cloud Pro (`adobe`,
  tareas `visual-design` y `video-editing`; incluye Express) y Adobe Express (`adobe-express`, tarea
  `express-design`). **Una licencia es un tercio del paquete; nunca el paquete entero a una persona:**
  `quantity "1"`, `seatCapacity 3`, `driver { "unit": "assigned-user-seat", "totalUnits": "3", "allocatedUnits":
  "1" }`, `serviceShare "0.333333333333333333"`. Para una persona a tiempo parcial, `allocatedUnits` es su
  dedicación (media jornada: `"0.5"` de 3 → `"0.166666666666666666"`). La demanda nombra `fx:CLP:USD` en
  `fxRecordIds`. `current` es el precio sin descuento, decidido por el CEO; `invoiced-with-discount` sólo si él lo
  elige para un trabajo corto. `BUNDLED_TOOL_DOUBLE_COUNT` sale si la misma persona o línea tiene el plan y un
  producto que el plan incluye.
- **Tres formas de declarar una compra que no es «un asiento por persona todo el plazo»:**
  - *Varios planes en un periodo*: dos asignaciones de la misma herramienta con `priceId` distinto (un asiento
    anual todo el año y uno mensual en los meses de campaña). Repetir (periodo, herramienta, `priceId`) es
    `DUPLICATE_RESOURCE_ALLOCATION`.
  - *Asiento ocioso*: `idleSeats` (entero) + `idleReason`, juntos, en la asignación: un asiento pagado que nadie usa
    ese periodo. **Su costo se queda en la cotización**, sobre las líneas que usan la herramienta. Si ese periodo no
    la usa nadie, `bornByLineIds` nombra las líneas activas que lo cargan.
  - *Asiento compartido*: `seatSharing: [{ toolId, periodId | periodIds, assigneeIds: [dos o más], reason }]` en la
    raíz. El grupo cuenta como un asiento. Es una declaración: el cotizador no valida que el proveedor lo permita;
    compartir lo decide el operador.
- **Periodos declarados una vez.** `allocations[]`, `work[].creditDemand[]`, `seatSharing[]` y
  `clientProvidedTools[]` llevan `periodId` o `periodIds: [..]`, exactamente uno de los dos. Meses idénticos van en
  una entrada; los que difieren, en otra. `creditBudgets[]` lleva siempre un `periodId` por entrada.
- **Herramienta que pone el cliente.** `clientProvidedTools: [{ toolId, periodId | periodIds, lineIds, reason,
  evidence }]` omite el costo de esa herramienta para esas líneas. Exige evidencia **confirmada** que cubra el
  periodo completo (desde `quoteDate` en el periodo 1; mes entero en los demás): si no,
  `CLIENT_ACCESS_EVIDENCE_REQUIRED`, y `detail` dice qué parte falla. No vale para Notion, Microsoft 365 ni
  herramientas de créditos (`CLIENT_COVERAGE_NOT_ALLOWED`). **Sin esa evidencia, no la declares:** deja la
  herramienta fuera del trabajo (no agregues su tarea) y escribe en las condiciones del documento que la aporta el
  cliente.
- **`fxRecordIds`**: sólo los FX de herramientas con precio en otra moneda que la de cálculo: `fx:CLP:USD` (Adobe),
  `fx:EUR:USD` (una herramienta en EUR). Uno de más es `UNUSED_FX_SELECTION`; uno de menos,
  `RESOURCE_FX_SELECTION_REQUIRED`. El FX de un costo de terceros no se nombra aquí.
- **Capacidad compartida entre cuentas** (un paquete o una plataforma con varios clientes): `compose plan --current
  --input plan.json --out demanda.json` combina una demanda con un portfolio `pricing-v3-resource-portfolio/1`
  (cliente + interno + sin asignar = total, exacto). No cargues al cliente capacidad interna o sin asignar. Pasos:
  [manual de composición](../../../../docs/manual-de-uso/finance/componer-cotizacion-v3-con-herramientas.md).

### 3.5 Créditos de IA

Una herramienta de créditos (`access: credits`; hoy Higgsfield y Magnific) necesita dos declaraciones:

- **Demanda**, por línea: `work[].creditDemand: [{ periodId | periodIds, toolId, credits }]`, con `credits` entero
  (1 a 1.000.000) de **ese proveedor** al mes. Los créditos de un proveedor no son los de otro, ni dinero, ni horas.
- **Presupuesto**, por (periodo, herramienta): `creditBudgets: [{ periodId, toolId, purchaseDate, useBy,
  subscriptionCreditsAllocated, subscriptionCreditsAvailable, activeSubscription, allowRepeatedPacks }]`.
  `purchaseDate` y `useBy` caen **en el mes de ese periodo** (el periodo 1 es el mes de `quoteDate`; el periodo n,
  n − 1 meses después) y `purchaseDate` no es anterior a `quoteDate`: si no, `CREDIT_PERIOD_WINDOW_MISMATCH`.
  `subscriptionCreditsAllocated`/`Available` son los créditos de la suscripción que se le asignan a esta cuenta ese
  mes; no inventes un remanente.

El planificador cubre el déficit con packs enteros al menor costo y atribuye la parte base y el pack extra completo.
Falta alguna de las dos → `CREDIT_DEMAND_REQUIRED` o `CREDIT_BUDGET_REQUIRED`. Detalle:
[manual de créditos](../../../../docs/manual-de-uso/finance/presupuestar-creditos-ia-v3.md).

### 3.6 Lo que el kit agrega solo

Sin que la demanda lo declare, cada línea recibe del kit:

- **Fee de plataforma** (`fee:<perfil>`): **entero por cada persona de la línea, sea cual sea su dedicación** (no se
  prorratea por FTE). Pesa en trabajos chicos y en cotizaciones con muchas líneas a tiempo parcial: mira su parte
  del costo en `estimateExposure.costInputs` (`kind: platform_fee`, una entrada por perfil). Si conviene prorratearlo
  es una decisión del CEO que está **abierta**: no la presentes como tomada ni lo ajustes a mano.
- **Kits de staffing** (por defecto en una persona por dedicación): además, dos provisiones mensuales,
  `trial-assurance` y `trial-operations`, cuya etiqueta dice «TEST ONLY, NOT MEASURED». Son marcadores heredados de
  la simulación histórica, sin medir: entran al costo como estimados, `assess` levanta
  `PROVISION_COST_EVIDENCE_REQUIRED` y su medición está pendiente. Informa su peso; no los quites.
- **Puesta en marcha de una persona** (kits de staffing): `provision-account-onboarding`, una vez por persona,
  entra sola en el periodo 1 como fila `setup`. `provision-recruiting` entra sólo por elección, cuando hay que
  contratar a alguien para ese cliente: `"choices": [{ "requirementId": "recruiting", "resourceId":
  "provision-recruiting" }]`. Las dos son estimaciones aceptadas por el CEO. Montos: `catalog search --current
  --kind resource --query provision`.
- **`managed-service-core`** (servicio gestionado): fee de plataforma y, por elección en **una** línea, cobertura
  de reemplazo y guardia de alertas (`choices` con `requirementId` `assurance` → `provision-backfill-coverage`,
  `operations` → `provision-on-call-alert-guard`; estimaciones). **No tiene puesta en marcha** ni admite
  reclutamiento (`UNKNOWN_RESOURCE_REQUIREMENT`): una «puesta en marcha bonificada» de un servicio gestionado queda
  como texto del documento, sin valor de referencia.

### 3.7 Costos de terceros

Lo que se le compra a otro para este trabajo (producción, talento, impresión, medios, una licencia) va en
`brief.thirdPartyCosts[]` (hasta 50): `{ costId, category, label, supplier, settlement, amount, currency, quantity,
periodIds, evidence }`.

- `settlement`: `reinvoiced` (Efeonce compra y refactura: fila comercial propia; `evidence` obligatoria) o
  `client_direct` (el cliente le paga a su proveedor: una nota fuera de todo total; no declares así lo que Efeonce
  va a pagar).
- `category`: un id del catálogo; **la demanda lleva la categoría, nunca una tasa** (`catalog search --current
  --kind third_party_policy`). Hoy `production`, `talent` y `printing` llevan 10 % de gestión con piso 5 % y
  redondeo comercial; `media` y `licences` van al costo. Son estimaciones aceptadas por el CEO.
- `label` lo ve el cliente: no nombra al proveedor ni un costo. `supplier` es interno.
- `amount` es el monto unitario del proveedor, como cadena; `quantity`, entero como cadena; **el costo completo se
  cobra en cada periodo de `periodIds`** (un costo único lleva un periodo). `costId` es distinto de todo `lineId`.
- `evidence { reference, effectiveFrom, effectiveUntil, status }`: la cotización del proveedor. Fuera de vigencia
  en `quoteDate` → `STALE_SOURCE` (se pide una nueva, no se estira la fecha); `pending` bloquea; `estimated` calcula
  en revisión.
- La fila no recibe el factor de mercado, la razón de la forma, un `discount` ni la reserva. Otra moneda que la de
  la cotización se convierte con el FX que la cotización congela, sin nombrarlo en `fxRecordIds`; queda expuesta al
  tipo de cambio del día del pago (`thirdParty.fxExposed`, `THIRD_PARTY_FX_EXPOSURE`).
- Ejemplo: `data/pricing/v3-operating/managed-on-demand-third-party.demand.json`.

### 3.8 Reserva de contingencia

Un servicio gestionado (`creative-managed-service` o `seo-aeo-managed-service`) declarado `on_demand` recibe sola
una reserva de 12 % del costo de persona, **como costo**: se vende con el margen de la oferta y la razón On-Demand,
y sube el piso de cada fila. No se declara nada para tenerla. Sólo sale con `"contingency": { "kind": "waived",
"reason": "…" }` en el `brief`, que decide el operador y queda señalado (`CONTINGENCY_RESERVE_WAIVED`). Es una
estimación aceptada por el CEO; no la sumes a mano ni la presentes como dato medido. Registro: `catalog search
--current --kind contingency_reserve`.

### 3.9 El precio acordado

El precio que se acuerda se **declara** en `brief.adjustments` y se vuelve a cotizar: el motor deriva el descuento o
el recargo y cae en el monto exacto. Hay dos ajustes; elige por cómo se acordó el precio.

| Se acordó… | Ajuste | `amount` es… |
| --- | --- | --- |
| Un precio por el trabajo completo: un programa, un proyecto, un todo incluido con su puesta en marcha | `agreed_total` | El neto de las líneas nombradas por **todo el plazo**: todos los periodos y todas las clases de cobro juntas |
| Un precio por mes (fee mensual, valor mensual de una persona) | `agreed_net` con `billing: "monthly"` | El neto **de un periodo** de las filas mensuales de esas líneas |
| El precio de la puesta en marcha (o su bonificación, con `"0"`) | `agreed_net` con `billing: "setup"` | El neto de las filas de puesta en marcha de esas líneas |
| El precio de costos de terceros refacturados | `agreed_net` con `billing: "third_party"` y `lineIds` = `costId` | El neto de esos costos por periodo |

```json
{ "adjustmentId": "agreed-price", "kind": "agreed_total", "amount": "13500000",
  "lineIds": ["seo", "content", "lead"], "reason": "Precio del programa fijado por el operador." }
```

- `amount` va en la moneda de salida, como cadena y sin más decimales que la moneda; `reason` es obligatorio.
  `agreed_total` no lleva `billing`.
- **`agreed_total`**: el motor cotiza una vez sin el acuerdo, reparte el total en proporción al precio de política
  de cada (periodo, clase) y congela la declaración y el reparto en `agreedTotals` (`policyNet`,
  `differenceFromPolicyNet`, `distributionUnit`, `distributionUnitBasis`, `distribution[]`). Con impuesto
  `exclusive`, las partes son múltiplos de una unidad en la que el impuesto es exacto, así que el impuesto de la
  cotización es el de la tasa sobre el total (`tax_exact`); vale cuando todas las filas están dentro de un solo
  `agreed_total`. Para incluir en el precio un costo de terceros refacturado, nombra su `costId` en `lineIds`; sin
  nombrarlo, queda fuera y se suma al neto.
- Una línea o costo que nombra un `agreed_total` no puede estar en otro ajuste
  (`AGREED_TOTAL_OVERLAPS_ADJUSTMENT`). Cada fila facturable admite a lo más un ajuste y son hasta 10 por
  cotización.
- **Los pisos siguen siendo por fila.** Un precio acordado bajo el piso de su mercado deja filas marcadas: es un
  incumplimiento real y la excepción es del CEO.
- `{ "kind": "discount", "rate", "lineIds", "reason" }` existe para una rebaja pactada como porcentaje. No lo uses
  para llegar a un monto: eso es un ajuste acordado.
- Un tipo de cliente (pyme, licitación, estratégico) no existe en el cotizador: se registra como precio acordado,
  con su motivo.

## 4. Cotizar y leer el resultado

### 4.1 Comandos

```bash
pnpm --silent pricing:v3 compose prepare --current --input demanda.json                      # diagnostica; no congela
pnpm --silent pricing:v3 compose quote --current --input demanda.json --out artefacto.json   # congela entradas y resultado
pnpm --silent pricing:v3 replay --input artefacto.json                                        # verified: true + el mismo resumen
pnpm --silent pricing:v3 explain --input artefacto.json                                       # detalle interno, grande
```

- Los dos imprimen el mismo resumen (`pricing-v3-composition-summary/1`); `quote` añade `replayDigest`. **El
  resultado completo existe sólo en el artefacto de `--out`**: `quote` siempre lleva `--out`.
- **`--out` es una cotización calculada o nada.** Una corrida que no calcula (exit 2) imprime su resumen, no escribe
  nada y lo dice en `runNotices.output` (`written: false`, `reason: "QUOTE_NOT_CALCULATED"`): corrige la demanda y
  vuelve a correr **con el mismo `--out`**. `--keep-blocked` (exige `--out` y una ruta propia) guarda a propósito el
  artefacto de una corrida bloqueada para `explain`, `replay`, `compose assess` o `compose commitments`; ese archivo
  no es una cotización.
- `--current` lo aceptan `catalog`, `resources`, `compose scaffold|plan|prepare|quote`, `prepare` y `quote`. Las
  lecturas de un artefacto (`explain`, `replay`, `compose assess|preview|split|schedule|cash|commitments|increment|
  document`) no: leen lo que el artefacto congeló.
- **Rechazo (exit 1):** stdout vacío y en stderr `{ "error": { "code", "message", "option"?, "issues"? }, "binding":
  false }`. Decide por `code`; `option` nombra la opción a corregir e `issues` trae hasta 20 `{ path, rule }`, sin
  valores. Una demanda que no cumple el schema es `SCHEMA_INVALID`; en un enum inválido el rechazo lista los valores
  permitidos (`allowed`), y en un límite, el límite (`limit`). `ADAPTER_FAILURE` es una falla sin clasificar de la
  herramienta: repórtala, no reintentes a ciegas.

### 4.2 Si no calcula: diagnósticos más frecuentes

`diagnostics[]` (bloqueos, completos) no vacío → `calculationStatus: needs_input`, `totals: null`, exit 2. Cada uno
trae `code` y `path`; varios traen `detail` (la causa) y `candidates` (ids utilizables).

| `code` | Qué pasó | Qué hacer |
| --- | --- | --- |
| `QUOTE_DATE_BEFORE_CATALOG`, `QUOTE_DATE_BEFORE_OFFER_POLICY`, `RESOURCE_POLICY_NOT_EFFECTIVE` | `quoteDate` es anterior a los datos que usa | Fecha la cotización desde el día que dice `detail` |
| `COMMERCIAL_UNIT_CONTRADICTS_OFFER` | La unidad no es la de la oferta | Usa la que dice `detail` |
| `RESOURCE_ALLOCATION_REQUIRED` | Alguien usa una herramienta sin asignación ese periodo | Declara la asignación con un `priceId` de `candidates`, o excluye la tarea de la receta si el trabajo de verdad no la hace |
| `RESOURCE_PRICE_SELECTION_REQUIRED` | El `priceId` no existe en esa herramienta | Usa uno de `candidates` |
| `RESOURCE_PRICE_PENDING`, `RESOURCE_PRICE_NOT_EFFECTIVE` | El precio elegido no tiene monto o no rige en la fecha | Elige otro `priceId` con monto y repórtalo como supuesto |
| `ALLOCATION_DRIVER_MISMATCH` | `serviceShare` ≠ `allocatedUnits ÷ totalUnits` truncado a 18 decimales | Corrige el valor |
| `INSUFFICIENT_NAMED_SEAT_CAPACITY`, `UNACCOUNTED_NAMED_SEATS` | Faltan o sobran asientos | Declara la compra real: otro asiento u otro plan, `idleSeats`, `seatSharing` |
| `INVALID_IDLE_SEATS`, `IDLE_SEAT_BEARER_REQUIRED`, `IDLE_SEAT_BEARER_NOT_ALLOWED`, `INVALID_IDLE_SEAT_BEARER`, `INVALID_SEAT_SHARING`, `UNUSED_SEAT_SHARING` | Asientos ociosos o compartidos mal declarados | Lee `detail` y [3.4](#34-herramientas-allocations) |
| `UNUSED_RESOURCE_ALLOCATION`, `UNUSED_CREDIT_BUDGET`, `UNUSED_CREDIT_DEMAND`, `UNUSED_FX_SELECTION`, `UNUSED_CLIENT_TOOL_COVERAGE` | La demanda declara algo que nadie usa | Quítalo |
| `RESOURCE_FX_SELECTION_REQUIRED` | Una herramienta en otra moneda sin su FX | Nombra `fx:CLP:USD` o `fx:EUR:USD` en `fxRecordIds` |
| `CREDIT_DEMAND_REQUIRED`, `CREDIT_BUDGET_REQUIRED`, `CREDIT_PERIOD_WINDOW_MISMATCH` | Créditos sin demanda, sin presupuesto o con fechas fuera del mes del periodo | [3.5](#35-créditos-de-ia) |
| `CLIENT_ACCESS_EVIDENCE_REQUIRED` | La herramienta del cliente no tiene evidencia confirmada del periodo completo | Consigue la evidencia, o deja la herramienta fuera y dilo en las condiciones |
| `MISSING_CATALOG_SELECTION`, `AMBIGUOUS_SELECTION` | El catálogo no tiene un registro vigente para esa selección (país, forma, categoría), o tiene dos | No sustituyas: se resuelve en el catálogo, con decisión del operador |
| `AGREED_TOTAL_OVERLAPS_ADJUSTMENT`, `AGREED_TOTAL_NOT_REPRESENTABLE`, `AGREED_TOTAL_WITHOUT_BASE`, `AGREED_TOTAL_WITHOUT_POLICY_PRICE`, `ADJUSTMENTS_EXCEED_PERIOD_LIMIT` | El total acordado se cruza con otro ajuste, tiene más decimales que la moneda, cae sobre filas sin precio, la cotización no calcula sin él, o hay demasiados ajustes en un periodo | Lee `detail`; con `…_WITHOUT_POLICY_PRICE` resuelve primero los demás diagnósticos |
| `OVERLAPPING_ADJUSTMENTS`, `INVALID_AGREED_AMOUNT`, `AGREED_NET_WITHOUT_BASE`, `INVALID_ADJUSTMENT_LINE` | Un `agreed_net` o `discount` mal declarado | Una fila, un ajuste; montos con la precisión de la moneda; `lineIds` de la clase correcta |
| `STALE_SOURCE`, `MISSING_SOURCE_CONFIRMATION` | Una fuente fuera de vigencia o `pending` | En un tercero, pide una cotización nueva; no estires la fecha |
| `DEDICATION_EVIDENCE_NOT_EFFECTIVE`, `PENDING_DEDICATION_EVIDENCE` | La evidencia de una dedicación no rige en la fecha o está `pending` | Corrige la evidencia |
| `CONTINGENCY_WAIVER_WITHOUT_RESERVE` | Se renuncia a una reserva que la cotización no tiene | Quita `contingency` |

Arreglo por código de rechazo y diagnósticos menos frecuentes:
[manual](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md).

### 4.3 El resumen

Con `calculationStatus: calculated` (exit 3), lee en este orden:

- **`totals`**: `net`, `tax`, `grandTotal`, `cost`, `marginAmount`, y los movimientos que ya están dentro del neto
  (`roundingAdjustment`, `marketAdjustment`, `engagementAdjustment`, `discount`, `uplift`). `tax: null` = impuesto
  sin resolver. `periods[]` trae los totales de cada mes.
- **Margen:** `marginRateRoundedDown` (6 decimales, hacia abajo) es el margen real del neto final. No lo recalcules.
- **Con terceros refacturados hay dos márgenes.** `marginRateRoundedDown` es el **mezclado**: baja con todo lo que
  se refactura al costo. El que se compara con el piso de la oferta es `ownWork.marginRateRoundedDown`. Informa los
  dos, cada uno con su nombre. `thirdParty { reinvoiced, clientDirect, fxExposed }` y `contingencyReserve { rate,
  base, amount, baseAmount, waived }` traen el detalle.
- **`marginFloor.lines[]`: filas bajo el piso de su política.** El piso se juzga **por fila**, nunca sobre el
  margen de la cotización completa. Con una regla de redondeo vigente (`priceRounding` presente), una fila marcada
  es un incumplimiento real (un precio acordado o un descuento la dejó bajo el piso): requiere decisión del
  operador. Cada fila trae `minimumMargin`, `net`, `marginAmount`, `marginRateRoundedDown` y:
  - `floorNet`: el neto más bajo con que esa fila cumple su piso en ese mercado.
  - **`netShortOfFloor` = `floorNet − net`: cuánto más tendría que valer la fila. Es la respuesta a «¿cuánto habría
    que subir el precio?»**; súmalo sobre las filas marcadas.
  - `marginAmountShortOfFloor`: el margen (en moneda) que le falta a la fila **al neto actual**
    (`minimumMargin × net − marginAmount`); sirve para distinguir un redondeo de una decisión de precio.
  - Con cliente en **Chile** (y en todo mercado sin `floorBasis`) una fila marcada trae las tres claves. Con cliente
    en **Colombia o Perú** trae `floorNet` y `netShortOfFloor`, y `marginAmountShortOfFloor` va `null`. Sólo una
    cotización que no declara `engagementForm` (contrato anterior) trae `marginAmountShortOfFloor` sin las otras
    dos: otra razón para declararla siempre.
- **`reviewSignals[]`**: señales por código; no bloquean, pero cada una se explica.
  - `ESTIMATED_SOURCE`: algún valor usado es estimado; `paths` dice cuáles. Qué pesa cada uno:
    [4.4](#44-qué-parte-del-costo-es-estimada).
  - `HISTORICAL_ONLY` (`paths: ["snapshot.mode"]`): el catálogo operativo está declarado en modo `historical`
    (valores de referencia en revisión, no un catálogo comercial aprobado). Sale en **toda** cotización, una vez por
    periodo: es la marca de simulación, no un defecto de la demanda.
  - `MARGIN_BELOW_FLOOR`: las filas de `marginFloor`. `CONTINGENCY_RESERVE_WAIVED`: se renunció a la reserva.
- **`assumptions[]`**: supuestos con que se calculó (`DEDICATION_ESTIMATED` por línea con dedicación estimada;
  `CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM`). Se informan.
- **`commercialAdjustments`** (los ajustes como se declararon), **`agreedTotals`** (el reparto de cada total
  acordado), **`priceRounding`**, **`marketFactor`** (sólo si cambia algo), **`engagementForm`** (sólo si se
  declaró) y **`engineVersion`** (el contrato con que se calculó; no se elige).
- **`attributions[]`**: una fila por herramienta y plan, con `quantity`, `serviceShare`, `fullMonthlyCost`,
  `attributedMonthlyCost` y `lineIds`. Trae `seats { needed, paid, idle, sharedSeats[] }` **sólo** si el periodo
  declara asientos ociosos o compartidos o tiene la herramienta bajo varios planes; `idle` y `bornByLineIds`, sólo
  si se declararon. Comprueba ahí que la cuenta es la de la compra real.
- **`runNotices`** (sólo en el stdout de `compose prepare|quote`; nunca bloquea; **siempre se le informa al
  operador**):
  - `laterCatalogValues { quoteDate, newestEffectiveFrom, records, byKind }`: el catálogo tiene valores que empiezan
    a regir después de `quoteDate`, así que la cotización usó los de su fecha. En una cotización nueva significa
    fecha atrasada: corrígela y vuelve a correr. Excepción: con fecha 2026-10-11 sale siempre (ocho factores de país
    rigen como confirmados desde el 2026-10-12; el precio es el mismo).
  - `priceDates { reviewDue, dueSoon, expired }`: fechas de revisión o de vigencia de los precios que esta
    cotización usa. Una revisión vencida avisa; una vigencia vencida es la que bloquea.
  - `output`: qué pasó con `--out` cuando la cotización no calculó.

### 4.4 Qué parte del costo es estimada

`estimateExposure` (también en `replay`) ordena los datos estimados por el costo que depende de cada uno. Nada se
recalcula; es sensibilidad, no validación ni pronóstico.

- `estimatedCost` + `dedicationNotEvidenced.cost` + `confirmedCost` = `totalCost`.
- `costInputs[]`, de mayor a menor `costAtRisk`, con `shareOfCost` y `marginRateLostIfTenPctHigher` (= 0,10 ×
  `costAtRisk` ÷ neto). `kind`: `dedication`, `person_cost`, `talent_factor`, `fx`, `tool`, `platform_fee`,
  `talent_assurance`, `operations`, `setup`, `third_party`. Pueden sumar más que `estimatedCost`: un componente
  puede depender de dos datos.
- **La dedicación es un dato.** Una línea con `dedicationEvidence` `estimated` entra en `costInputs` como
  `kind: "dedication"`, con el costo que gobierna (su persona y lo que el kit reparte por capacidad). Una línea sin
  evidencia va en `dedicationNotEvidenced { lineIds, cost, shareOfCost }`: ese costo no es estimado ni confirmado.
  Una cotización con horas estimadas nunca se lee como confirmada. `capacitySetByRule: true` marca la línea cuya
  capacidad cobrada la fijó la regla (dedicada, u horas convertidas): ahí «10 % más» no aplica en proporción.
- Un fee o provisión que se carga por línea aparece **una vez por cada registro** (`fee:<perfil>`): con tres
  perfiles distintos, tres entradas.
- `estimatedRules[]`: reglas estimadas (la regla de asignación de 180 horas, una política de precio, la reserva, la
  regla de una categoría de terceros); quedan fuera del ranking. `priceInputs[]`: un factor de mercado estimado.
- **Qué hacer:** dile al operador qué parte del costo es estimada y **qué dato confirmar primero**, con su efecto en
  puntos de margen. No lo uses para «corregir» un dato.

## 5. Revisar antes de presentar

```bash
pnpm --silent pricing:v3 compose assess --input artefacto.json          # brechas económicas y veredicto del piso
pnpm --silent pricing:v3 compose preview --input artefacto.json --format markdown --out preview.md
```

**`compose assess`** (exit 3; siempre `commercialStatus: requires_review`, `binding: false`; nunca aprueba):

- `gaps[] { code, path, owner, action }`: lo que falta evidenciar. Los habituales: `COMMERCIAL_APPROVAL_REQUIRED`
  (siempre), `DEDICATION_NOT_EVIDENCED` / `DEDICATION_EVIDENCE_REVIEW` (dedicación sin evidencia / estimada),
  `PROVISION_COST_EVIDENCE_REQUIRED` (provisiones sin medir), `TOOL_COST_EVIDENCE_REVIEW` (precio de herramienta no
  confirmado), `RESOURCE_ACCESS_AND_CAPACITY_REQUIRED` (una referencia de precio no acredita acceso),
  `ALLOCATION_EVIDENCE_REQUIRED` (el `reason` de una asignación dice que es hipótesis, simulación o ejemplo),
  `USER_ASSIGNMENT_REQUIRED` (cupos `planned-*`), `IDLE_SEAT_COST_REVIEW`, `SHARED_SEAT_TERMS_REVIEW`,
  `TAX_AND_ENTITY_REQUIRED` (impuesto sin resolver), `SERVICE_SCOPE_AND_DELIVERY_REQUIRED` (todo servicio
  gestionado), los `THIRD_PARTY_*`, `CONTINGENCY_RESERVE_WAIVED` y `MARGIN_BELOW_POLICY_FLOOR` (uno por fila
  marcada). Ninguno se cierra solo: se llevan al operador.
- **`margin` juzga contra el piso de la propia oferta.** `pricingPolicies[]` trae la regla con que se cotizó cada
  línea (`offerId`, `method`, `rate` = objetivo, `minimumMargin` = piso, `lineIds`); `thirdPartyPolicies[]`, la de
  cada categoría de terceros; **`belowPolicyFloor`** es `true` sólo si el motor marcó alguna fila, y
  `policyFloor.linesBelowFloor` las lista. `modeledRate` es el margen real; `ownWorkRate`, el del trabajo propio
  (con terceros). No hay un objetivo ni un piso genérico: una cotización responde a su oferta.
- `costEvidencePriority`: el mismo orden de `estimateExposure`; `confirmFirst` = los cinco primeros datos
  (`dedicationNotEvidenced` va aparte).

**`compose preview`** es la proyección que un cliente podría ver: conceptos y netos finales, sin costos, márgenes,
proveedores ni ids. Un servicio gestionado es una línea de fee. Sigue siendo simulación no vinculante.

**Lecturas del artefacto** (opcionales; no recalculan ni cambian nada; exit 3; **traen costos: ninguna va al
cliente**):

- `compose split --input a.json --tools <id,id|all>`: presenta el neto de cada fila en persona + kit de las
  herramientas elegidas (y terceros). Qué se muestra aparte lo decide el operador. Informa `person.belowFloor` y
  `partsBelowFloorWhileRowMeetsIt` si aparecen.
- `compose schedule --input a.json --milestones hitos.json`: calendario de pagos. `hitos.json` es un arreglo de
  `{ id, label, share, periodId | when }` (hasta 60; `share` es una cadena decimal y las partes suman exactamente
  1; nunca montos). Los montos suman el neto; el último recibe el resto. No es factura ni cobro; los porcentajes
  los decide el operador. Rechazo: `SCHEDULE_MILESTONES_INVALID` (`shares_must_sum_to_one`, `share_not_decimal`,
  `duplicate_id`, `unknown_period`, `period_and_when`…).
- `compose cash --input a.json`: costo por naturaleza, `newSupplierCash` (caja nueva a proveedores: packs extra y
  terceros refacturados) y `cashAddedOnContractedCapacity`. **Esa cifra no es un margen ni decide un precio**
  (`isMargin: false`, `decidesPrice: false`): supone que las personas son capacidad ya contratada; dila con sus
  supuestos (`restsOn`, `notDerivable`).
- `compose commitments --input a.json`: compromisos con proveedores que duran más que los periodos cotizados (una
  licencia con plazo anual tomada para un trabajo corto; créditos que sobran) y asientos ociosos dentro de ellos
  (`kind: "idle_seat"`). Dice si lo no recuperado queda varado o vuelve a una capacidad compartida. Un plazo sin
  fecha de renovación se lee como un plazo entero desde el primer mes: es un techo, no una cifra cierta. Las compras
  a terceros quedan fuera a propósito (`THIRD_PARTY_PURCHASE_TERMS_NOT_FROZEN`). Informa; el operador decide.
- `compose increment`: el costo y el margen de un opcional que amplía la base ([6.6](#66-opciones-incrementos-y-cortesías)).

**Qué le llevas al operador:** neto, impuesto y total; margen real (y el del trabajo propio si hay terceros); filas
bajo el piso con `netShortOfFloor`; qué parte del costo es estimada y qué confirmar primero; los supuestos que
tomaste (precios elegidos sin `current`, dedicaciones estimadas, herramientas que pone el cliente); `runNotices`; y
lo que el cotizador no modela de ese negocio ([sección 9](#9-lo-que-no-está-modelado)).

## 6. El documento para el cliente

«La cotización» de una cotización V3 es un PDF: la
[plantilla A4](../../../../docs/commercial/templates/cotizacion-a4/README.md), versión 2 de sus datos. `compose
document` emite esos datos desde el artefacto congelado; el generador los compone. El manual de la plantilla es la
autoridad sobre paginación, límites y revisión.

### 6.1 Secuencia

```bash
pnpm --silent pricing:v3 compose document --input artefacto.json                                     # exit 2: andamio del brief
pnpm --silent pricing:v3 compose document --input artefacto.json --brief brief.json --out datos.json # exit 3
node scripts/documents/render-cotizacion-a4.mjs --data datos.json --out <carpeta nueva o vacía>     # exit 0
```

1. Cotiza y revisa (secciones 4 y 5). Si hay opcionales, cotízalos antes ([6.6](#66-opciones-incrementos-y-cortesías)).
2. Corre el andamio (`pricing-v3-quote-document-scaffold/1`): `quote` (fecha, moneda, periodos, neto, impuesto y
   total que el documento va a decir), `lines[]` (cada línea ya plegada, con su `key`), `optional` (las claves
   opcionales, explicadas), `brief` (el esqueleto por llenar) y, si aplica, `waived[]` y `options[]`. El exit 2 no
   es un error: falta el brief.
3. Llena el brief **sólo con textos** y emite los datos. Usa los mismos `--option`/`--increment` del andamio.
4. Compón. La carpeta recibe `cotizacion.html`, `cotizacion.pdf`, `datos.json`, `manifest.json` y capturas en
   `qa/`. Necesita Chromium local (Playwright).
5. Lee las capturas de `qa/` y **todas** las páginas del PDF: textos, cortes, importes contra el resumen.
6. Entrega **sólo el PDF**. Brief, datos, manifiesto, capturas y artefacto son internos.

**Nunca digites una cifra en el brief ni edites los datos emitidos.** Si un número debe cambiar (precio, plazo,
impuesto, moneda, un tercero, una opción, un valor de referencia), cambia la demanda, vuelve a cotizar y repite. Si
sólo cambia un texto, edita el brief y vuelve a emitir, con `--out` y carpeta nuevos.

### 6.2 El brief (`pricing-v3-quote-document-brief/1`, estricto)

- Obligatorios: `reference`, `supplier { name, taxId, contact, email, phone }`, `buyer { name, taxId }`,
  `cover { label, title, subtitle }`, `service { name }`, `scope { title, intro, rows[] }` (1 a 7 filas `{ title,
  text }`), `schedule { title, phases[] }` (calendario **del trabajo**: 1 a 3 fases `{ label, title, text }`),
  `pricing { title, intro, summary, taxNote }` y `conditions { title, rows[] }` (1 a 6). Un título es una línea o un
  arreglo de hasta tres. Todo es texto plano; un texto vacío se rechaza.
- Opcionales: `locale`, `buyer.unit`, `buyer.logo { path, source }`, `cover.netLabel`, `schedule.note`,
  `pricing.taxLabel`, `pricing.monthly { months, note }`, `lines`, `combine`, `options`, `optionsTexts`,
  `paymentMilestones`, `paymentScheduleTexts`.
- **No tiene clave para un monto, una moneda, una tasa ni una fecha.** La fecha del documento es `quoteDate`; la
  moneda, la de la cotización. Una clave de más se rechaza.
- **Los opcionales se dejan fuera cuando no dicen nada.** `buyer.unit` es el área del cliente a la que se dirige el
  documento: si no hay, se omite (nunca el nombre del cliente otra vez). `schedule.note` es una línea junto al
  título del calendario: se omite si sólo diría lo que toda cotización implica. **Nunca escribas quién define la
  fecha de inicio, ni una fecha de inicio o una duración «por definir».** Antes de emitir, relee cada fila, fase y
  condición y quita la que sólo afirma algo que el cliente ya sabe.
- Los textos se escriben por cotización, desde el alcance y las condiciones del expediente. Datos del emisor:
  [Datos para licitaciones](../../../../docs/commercial/EFEONCE_DATOS_PARA_LICITACIONES.md).

### 6.3 Líneas: plegado por defecto y `combine`

- Las líneas salen de la misma función cliente-segura que `compose preview`: ni costo, ni margen, ni proveedor.
  **Claves** (las lista el andamio; nunca se imprimen): servicio gestionado → `fee`, `setup`,
  `third_party:<costId>`; cotización vendida por líneas → `<lineId>`, `<lineId>:setup`, `third_party:<costId>`.
- **Por defecto, cada clave se pliega por meses**: meses consecutivos con el mismo neto son una línea «n meses» con
  el neto de un mes como valor unitario y su suma como neto. Un solo mes: «1 mes». Lo que cae en un solo periodo
  (una puesta en marcha, un tercero único) es «1 pago único», sin valor unitario. Una clave cuyo neto cambia da una
  línea por tramo («Mes 3», «Meses 1 a 2»).
- `lines.<clave>` admite `label`, `detail` y `group`. **Revisa cada etiqueta por defecto**: viene del catálogo
  (un perfil sale con su nombre de catálogo, a veces en inglés; la puesta en marcha, «Implementación inicial»; el
  fee, «Servicio gestionado — fee del periodo»). Una clave que la cotización no tiene es un rechazo (`unknown_key`).
- **`combine` imprime un precio por el trabajo completo**: `combine: [{ keys, label, unit, detail?, group? }]`
  imprime esas claves como **una** línea de cantidad 1 de `unit` («programa», «proyecto», «servicio»), sin valor
  unitario, por la suma exacta que la cotización congeló para ellas en todo el plazo. Una sola clave se puede
  combinar (un `fee` de tres meses impreso como «1 programa»). Una clave va en una sola combinación
  (`duplicate_key`) y entonces no tiene entrada en `lines` (`key_is_combined`); una clave bonificada no se combina
  (`key_not_charged`).
- **Cuál usar:** precio mensual → plegado por defecto. Precio de programa o de proyecto (normalmente cotizado con
  `agreed_total`) → `combine`. Las líneas suman el mismo neto de las dos maneras.
- Un servicio gestionado se imprime como fee; nunca como equipo y horas. Persona + kit (`compose split`) no es un
  diseño de documento.

### 6.4 Portada y encabezado

- **`cover.netLabel`** nombra el neto de la portada en lugar del rótulo de la plantilla («Valor neto del servicio
  completo»). Úsalo cuando ese rótulo no describe lo cotizado: «Valor neto mensual» (un mes de un servicio
  continuo), «Valor neto de seis meses de servicio», «Valor neto del proyecto», «Valor neto del programa». Es un
  texto, nunca un monto.
- **La portada es una página fija.** Cada entrada de `cover.title` es una línea del diseño y debe caber en su
  ancho: una entrada larga se parte y la portada no cabe. Orientación de la plantilla: sin logo, un título de tres
  líneas con una bajada (`cover.subtitle`) de hasta cinco. Si no cabe, el generador falla con «Contenido fuera del
  A4» y dice qué acortar: se acorta el **texto**, nunca la tipografía.
- **Encabezado de las páginas interiores:** admite tres líneas entre `buyer.unit`, el nombre de la sección y
  `reference`. Sin `buyer.unit`, la referencia puede ocupar dos líneas; **con `buyer.unit`, sólo una**: una
  referencia larga con unidad falla antes de abrir el navegador. Acorta `reference` o quita `buyer.unit`.
- Alcance (7 filas), calendario (3 fases) y condiciones (6) también son páginas fijas; sólo la sección de inversión
  pagina.

### 6.5 Impuesto e hitos de pago

- El impuesto y el total impresos son **los que la cotización congeló**, nunca un segundo cálculo. `exclusive` → la
  tasa y su impuesto; `not_resolved` → «Por confirmar»; `not_applicable` → «No aplica». El brief sólo puede
  nombrarlo (`pricing.taxLabel`) y explicarlo (`pricing.taxNote`). Una cotización con `agreed_total` tributa
  exactamente la tasa sobre el total.
- **Hitos de pago:** `paymentMilestones` es la lista de `compose schedule` (`{ id, label, share, periodId | when }`;
  aquí cada hito necesita `periodId` o `when`, y son a lo más 12). **Con impuesto `exclusive`, cada hito se imprime
  con su neto, su impuesto y su total**, y las partes suman el impuesto y el total de la cotización; con impuesto
  sin resolver o que no aplica, un hito es su neto. `paymentScheduleTexts { title?, note? }` sólo junto a los
  hitos. Los porcentajes los decide el operador.
- `pricing.monthly { months, note }` imprime un equivalente mensual de los totales: una cantidad de meses, no un
  importe.

### 6.6 Opciones, incrementos y cortesías

- **Servicio opcional** (lo que el cliente puede contratar aparte): se imprime en un bloque propio, «Opcional ·
  Fuera de esta cotización», y **no entra en ninguna línea, neto, impuesto ni total**. Su precio nunca se digita. A
  lo más 8. El brief nombra exactamente las opciones pasadas: `options: { "<clave>": { label, unit, detail? } }`
  (`unit` = «al mes», «por campaña»).
- **De dónde sale su precio, dos casos:**
  - *Una persona nueva o un trabajo aparte* → su propia cotización congelada, pasada con `--option
    <clave>=<opcion.artifact.json>`. Debe estar calculada, en la misma moneda, **con el mismo neto en todos sus
    periodos** y sin costos que el cliente paga directo. Una opción «al mes» con puesta en marcha no cumple: se
    bonifica su puesta en marcha en su demanda (decisión del operador) o se cotiza a un periodo y se nombra por esa
    unidad. Su margen se revisa con `compose assess` sobre su artefacto.
  - *Amplía a personas que ya son líneas de la base* (más dedicación, más consumo) → **incremento**. Su cotización
    propia cobraría otra vez lo que se cobra una vez por línea (el fee de plataforma, su parte de las herramientas
    base) y subestimaría su margen. Se cotiza **la base con el opcional adentro** y se lee la diferencia.
- **Armar el incremento:** copia la demanda de la base; en la **misma línea** de cada persona sube
  `dedication.value` (o `headcount`); sube el consumo que crece (`serviceShare`/`driver.allocatedUnits`, créditos,
  terceros); si la base lleva un precio acordado, el de esta cotización es el de la base **más** el del opcional; no
  toques nada más (moneda, oferta, cuenta, impuesto, forma, país, fecha, periodos). Cotiza con las mismas versiones.
  ```bash
  pnpm --silent pricing:v3 compose increment --input con-opcional.artifact.json --base base.artifact.json
  pnpm --silent pricing:v3 compose document --input base.artifact.json --brief brief.json \
    --increment <clave>=con-opcional.artifact.json --out datos.json
  ```
  `compose increment` (`pricing-v3-quote-increment/1`, interno) da por periodo y en total `base`, `withAddOn` e
  `increment { net, cost, marginAmount, marginRateRoundedDown }`; `totals.costByComponentKind[]` (lo que se cobra
  una vez por línea, como `platform_fee`, debe salir con incremento `0`); `netIncrementPerPeriod` (lo único que toma
  el documento; `null` si el opcional no agrega lo mismo en cada periodo) y `changed`. El margen del opcional es
  `increment.marginRateRoundedDown`; el piso del servicio con el opcional se lee con `compose assess` sobre la
  cotización con el opcional.
- **Si dos cotizaciones no son comparables, la lectura se rechaza y nunca se aproxima** (exit 1):
  `QUOTE_INCREMENT_REQUIRES_CALCULATED_QUOTES`, `QUOTE_INCREMENT_CONTEXT_DIFFERS` (moneda, oferta, cuenta,
  impuesto, forma, país, fecha…), `QUOTE_INCREMENT_VERSIONS_DIFFER`, `QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE`
  (cotiza las dos sobre los mismos periodos), `QUOTE_INCREMENT_BASE_NOT_CONTAINED` (parte de una copia de la base y
  sólo suma; es lo que sale al pasar la cotización propia del opcional) y `QUOTE_INCREMENT_NET_NOT_POSITIVE` (falta
  el precio del opcional). `issues[].rule` dice cuál regla falló.
- **Cortesía.** Una fila que la cotización bonifica por completo (neto 0 por un ajuste explícito, p. ej.
  `agreed_net` `"0"` de `billing: "setup"`, con su motivo y decisión del operador) no imprime nada por defecto. Para
  mostrarla, toma su clave de `waived[]` del andamio y márcala: `"<lineId>:setup": { "label": "…", "courtesy":
  true }`. Se imprime «Bonificado» con «Valor de referencia» = el precio que tenía antes de la bonificación, tomado
  de la cotización. No suma a nada. Una línea que se cobra no se puede marcar (`line_is_charged`).
- Lo que el cliente paga directo a su proveedor (`client_direct`) se imprime solo, en un bloque aparte y en su
  moneda, fuera de todo total.

### 6.7 La leyenda de borrador

- Los datos emitidos llevan siempre `status: "draft"` y `source { system, calculationId, digest, engineVersion }`,
  que llega al manifiesto y no se imprime. Un documento producido aquí no es un `quotation_id`, un precio aprobado
  ni una cotización emitida.
- **La leyenda visible es un texto tuyo**: `cover.label` (los ejemplos usan «Borrador · Sin validez comercial»),
  `reference` y la condición de vigencia. Mientras el operador no haya aprobado el precio, la portada y las
  condiciones dicen que es un borrador.
- **Si el precio lo fijó el propio operador y hay filas bajo el piso:** el precio está decidido, pero la excepción
  no se da por implícita. Infórmale las filas marcadas y cuánto falta (`netShortOfFloor`); con su confirmación,
  registra la excepción con su motivo junto al artefacto. La leyenda se quita cuando él pide la versión para
  enviar, no antes y no por tu cuenta. Nada del piso, del margen ni de la excepción se imprime.

### 6.8 Lo que el documento no calcula y queda como texto

No tienen clave propia; van como filas de `conditions.rows` (o de `scope`), con lo que el operador decidió y sin
inventar nada:

- **Vigencia de la oferta** y **forma y plazo de pago**.
- **Lo que el cliente debe aportar** (accesos, contenidos, aprobaciones, una herramienta o un alojamiento que él
  contrata y paga).
- Límites del alcance, rondas de cambios, y la bonificación de la puesta en marcha de un servicio gestionado (sin
  valor de referencia).
- Otra moneda de presentación no existe: es otra cotización (`brief.outputCurrency`) y otro documento.

### 6.9 Rechazos del documento (exit 1; `option` dice qué corregir)

- `QUOTE_DOCUMENT_BRIEF_INVALID` (`option: "brief"`): `issues` por posición y sin contenido. Reglas frecuentes:
  `unrecognized_keys` (una clave que el brief no admite: un monto, una fecha), `unknown_key`, `unknown_field`,
  `key_is_combined`,
  `duplicate_key`, `key_not_charged`, `line_is_charged`, `invalid_courtesy`, `option_not_named`,
  `requires_options`, `requires_payment_milestones`, `timing_required`.
- `SCHEDULE_MILESTONES_INVALID` (`option: "brief"`): los hitos, con las reglas de `compose schedule`.
- `QUOTE_DOCUMENT_OPTION_INVALID` (`option: "option"` o `"increment"`): `not_calculated`,
  `currency_differs_from_quote`, `net_differs_between_periods`, `client_pays_costs_directly`, `same_as_quote`,
  `duplicate_option`, `too_many`. Se corrige en la demanda de la opción.
- De la cotización (`option: "input"`; se reportan, no se «arreglan» en el brief):
  `QUOTE_DOCUMENT_REQUIRES_CALCULATED_QUOTE`, `QUOTE_DOCUMENT_LINES_DO_NOT_ADD_UP`,
  `QUOTE_DOCUMENT_NOT_REPRESENTABLE` (más de 40 líneas, más de 8 costos pagados por el cliente, un importe que la
  moneda no representa) y `QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE`.
- Del generador: «Contenido fuera del A4» (dice qué acortar) y una carpeta de salida con archivos (usa una nueva).

## 7. Ejemplos por tipo de negocio

Cada ejemplo trae la demanda mínima y el brief del documento, con un comprador inventado. Están en
[`examples/`](examples/) (`.claude/skills/efeonce-pricing-operator/references/examples/`), fechados 2026-10-12, y
cotizan con `--current`. **Vuelve a correrlos antes de citar una cifra**: las cifras de abajo son las de las
versiones vigentes al escribir esta referencia. Cópialos a tu carpeta de trabajo; no los edites en su lugar.

La cadena es la misma en los tres (`X` = la ruta de `examples/`, `<n>` = el nombre del ejemplo):

```bash
pnpm --silent pricing:v3 compose quote --current --input X/<n>.demand.json --out salida/<n>.artifact.json        # exit 3
pnpm --silent pricing:v3 compose assess --input salida/<n>.artifact.json                                         # exit 3
pnpm --silent pricing:v3 compose document --input salida/<n>.artifact.json                                       # exit 2 (andamio)
pnpm --silent pricing:v3 compose document --input salida/<n>.artifact.json --brief X/<n>.document-brief.json \
  --out salida/<n>.document.json                                                                                 # exit 3
node scripts/documents/render-cotizacion-a4.mjs --data salida/<n>.document.json --out salida/<n>-pdf            # exit 0
```

### 7.1 Una persona por dedicación — `person-by-dedication`

Un redactor a 90 horas al mes, seis meses, servicio continuo, cliente y persona en Chile, CLP, IVA 19 % (fuente de
ejemplo, no un criterio tributario).

- Forma de la demanda: `talent-assurance-staffing`, `role_capacity`, `on_going`, `periods: 6`; una línea `shared`
  con `dedication { "unit": "hours_per_month", "value": "90" }` y `dedicationEvidence` `confirmed`; un cupo
  `planned-copy-1`; Notion y Microsoft 365 `current`, un asiento cada uno, `serviceShare "0.5"` (`driver` 0,5 de
  1), una vez con `periodIds: [1, …, 6]`. Sin `kitId`: el kit de staffing agrega solo el fee de plataforma, las dos
  provisiones «TEST ONLY» y la puesta en marcha.
- Resultado: neto 7.790.000 (seis meses de 1.250.000 más una puesta en marcha de 290.000), IVA 1.480.100, total
  9.270.100; margen `0.305507` contra objetivo 30 % y piso 25 %; ninguna fila marcada; 14,7 % del costo es estimado
  (fee de plataforma, puesta en marcha y las dos provisiones sin medir).
- Documento: «6 meses» × 1.250.000 y «1 pago único» por la puesta en marcha; `cover.netLabel` «Valor neto de seis
  meses de servicio»; sin `buyer.unit` ni `schedule.note`. 4 páginas.
- Variantes: precio mensual acordado → `{ "kind": "agreed_net", "billing": "monthly", "amount": "<neto de un
  mes>", "lineIds": ["copy"], … }`; puesta en marcha bonificada → `agreed_net` `"0"` de `billing: "setup"` y
  `courtesy: true` en el brief (ejemplo versionado `designer-startup-courtesy`).
- **Un mes On-Demand de una persona dedicada**: es el ejemplo versionado
  `data/pricing/v3-operating/designer-on-demand.demand.json` (`on_demand`, `periods: 1`, `dedicated`, Adobe a un
  tercio del paquete, créditos de IA con su presupuesto). Con `--current` da neto 2.870.000 y exit 3; su demanda
  está fechada 2026-10-11, así que trae el aviso `laterCatalogValues`. Su artefacto congelado
  (`designer-on-demand.artifact.json`, neto 2.790.000) se calculó con una policy anterior y se reproduce con
  `replay`.

### 7.2 Un proyecto de alcance cerrado — `fixed-scope-project`

Un sitio web: desarrollo (72 h), diseño (36 h) y coordinación (18 h) en un mes, a un precio por el proyecto.

- Forma de la demanda: `creative-managed-service`, `managed_service`, `on_demand`, `periods: 1`; tres líneas
  `shared` con horas y `dedicationEvidence` `estimated`, `kitId: "managed-service-core"`; Notion y Microsoft 365
  con tres asientos y `serviceShare "0.233333333333333333"` (0,7 de 3); Figma para el diseñador con
  `priceId: "historical"` porque su `current` no tiene monto (supuesto a reportar); el precio con
  `{ "kind": "agreed_total", "amount": "2900000", "lineIds": ["build", "design", "lead"] }`. El alojamiento lo
  contrata el comprador: no se declara, y va como condición.
- Resultado: precio de política 3.150.000; neto acordado 2.900.000, IVA 551.000, total 3.451.000; margen
  `0.459831` contra piso 45 %; ninguna fila marcada; `engineVersion` `pricing-v3-local/1.4.0` (lleva reserva de
  contingencia); 98 % del costo es estimado porque las horas lo son (`costInputs` `kind: dedication`).
- Documento: `combine` de `fee` → «1 proyecto» por 2.900.000; `cover.netLabel` «Valor neto del proyecto»; dos hitos
  50/50, cada uno con neto 1.450.000, IVA 275.500 y total 1.725.500. 4 páginas.
- Para ver filas bajo el piso, cotiza una copia con el total en `"2700000"`: `marginFloor.lines[]` trae tres filas
  con `marginAmountShortOfFloor`, `floorNet` y `netShortOfFloor`.

### 7.3 Un programa de tres meses en una licitación — `tender-programme`

Un programa SEO/AEO de tres meses, a un precio por el programa, con pago mensual.

- Forma de la demanda: `seo-aeo-managed-service`, `managed_service`, `on_demand`, `periods: 3`; tres líneas
  `shared` en FTE (0,5, 0,25 y 0,1) con `dedicationEvidence` `estimated`; la tarea `seo-writing` agregada al
  redactor; Notion y Microsoft 365 con `serviceShare "0.283333333333333333"` (0,85 de 3) y la suite SEO con un
  precio público de lista porque su `current` no tiene monto (supuesto a reportar), todo una vez con
  `periodIds: [1, 2, 3]`; el precio con `{ "kind": "agreed_total", "amount": "13500000", "lineIds": ["seo",
  "content", "lead"] }`.
- Resultado: precio de política 14.010.000; neto acordado 13.500.000 (4.500.000 por mes en el reparto), IVA
  2.565.000, total 16.065.000; margen `0.575914` contra objetivo 55 % y piso 45 %; ninguna fila marcada.
- Documento: `combine` de `fee` → «1 programa» por 13.500.000; `cover.netLabel` «Valor neto del programa»; tres
  hitos con `periodId`, cada uno con neto 4.500.000, IVA 855.000 y total 5.355.000. 4 páginas.
- **En una licitación:** se cotiza en la moneda de las bases y el precio del programa va con `agreed_total`; el
  plazo y el inicio los fijan las bases y son materia del contrato. El presupuesto máximo del comprador y su
  fórmula de puntaje **no están modelados**: el precio lo decide el operador y tú le llevas el margen real. La
  reserva de 12 % cubre un alcance fijo On-Demand; el colchón de un servicio On-Going con multas no está modelado y
  se costea aparte, diciéndolo.

### 7.4 Otros ejemplos versionados (`data/pricing/v3-operating/`)

| Para… | Archivos |
| --- | --- |
| Un servicio gestionado mensual con precio acordado por mes y un opcional por incremento | `managed-addon-increment.*` (`.with-addon.*`, `.option-standalone.*`, `.increment.json`) |
| El mismo servicio impreso como programa, con hitos e IVA por hito | `managed-addon-increment.programme-price.document-brief.json` / `.document.json` |
| Terceros refacturados, un costo que paga el cliente y la reserva de contingencia | `managed-on-demand-third-party.*` |
| Una cortesía y dos opciones con cotización propia | `designer-startup-courtesy.*` (y `.option-copywriter.*`, `.option-motion.*`) |
| Tres meses de una persona con IVA | `designer-three-months-iva.*` |
| Dedicación desde un volumen | `managed-care.workload.json`, `managed-care.brief.json` |

`managed-care.demand.json` y `managed-care-colombia.demand.json` ya no calculan tal cual con `--current` (la primera
está fechada antes de las versiones vigentes; a las dos les falta resolver `express-design`): se cotiza una copia.

## 8. Nunca

- Cotizar un negocio nuevo sin `--current`, nombrar versiones a mano, o saltarse `CURRENT_VERSIONS_MISMATCH` con
  rutas escritas.
- Calcular una tasa a mano para llegar a un precio; usar un ajuste, el redondeo o `quoteDate` para «cumplir» un
  piso; mover `quoteDate` para simular otro inicio.
- Decidir un margen, un piso, una excepción, un FX, un factor o un porcentaje de hitos: son del operador (CEO).
  Tampoco reabrir los factores de país ni presentar como decidido lo que está abierto (el prorrateo del fee de
  plataforma).
- Proponer conectar la nómina, llamar al costo del catálogo «lo que Efeonce paga», o escribir el pago de una
  persona en un archivo.
- Elegir la oferta por el margen que deja pasar; usar la oferta de staffing para un servicio gestionado; declarar
  una unidad comercial distinta de la de la oferta.
- Cotizar sin `engagementForm`; declarar `on_demand` para subir un precio u omitirlo para evitar la reserva;
  renunciar a la reserva sin decisión del operador; sumar una reserva a mano.
- Marcar `confirmed` una dedicación que nadie confirmó, u omitir `dedicationEvidence` para que no aparezca como
  estimada. Presentar como confirmada una cotización con horas estimadas.
- Quitarle a una persona una tarea, sacarla de `assigneeIds` o excluir una tarea de su receta para que la cuenta de
  asientos cuadre o la corrida pase: se declara la compra como es.
- Atribuir un paquete entero de Adobe a una persona, quitarle el IVA, convertirlo a USD a mano o elegir
  `invoiced-with-discount` sin decisión del operador.
- Elegir un `priceId` por ser el más barato, inventar un monto o un cero, o callar que elegiste un precio que no es
  `current`.
- Declarar `clientProvidedTools` sin evidencia confirmada, o `client_direct` lo que Efeonce va a pagar; esconder un
  costo de proveedor dentro de una línea de persona o restarlo como descuento; escribir una tasa de terceros en la
  demanda o un proveedor en `label`.
- Comparar el margen mezclado con el piso de la oferta, o leer «cero filas marcadas» como «sobre el piso» en
  Colombia y Perú.
- Usar `agreed_net` para un precio de programa o de proyecto (es por periodo), o `agreed_total` para un valor
  mensual.
- Callar `runNotices`, las filas bajo el piso, los supuestos o lo que el cotizador no modela; presentar
  `estimateExposure` como validación.
- Mostrarle al cliente una lectura interna (resumen, `explain`, `assess`, `split`, `schedule`, `cash`,
  `commitments`, `increment`) o entregarle el brief, los datos, el manifiesto o el artefacto.
- Digitar o editar una cifra en el brief o en los datos del documento; asumir una tasa de impuesto para que no diga
  «Por confirmar»; reducir tipografía o recortar alcance para que quepa.
- Escribir en el documento lo obvio: quién define la fecha de inicio, una fecha o una duración «por definir»,
  `buyer.unit` con el nombre del cliente repetido, o cualquier texto de relleno.
- Digitar el precio de una opción o un valor de referencia; sumar una opción al neto; leer el margen de un opcional
  que amplía la base en su cotización propia; restar dos cotizaciones a mano o aproximar un incremento rechazado.
- Presentar el documento como cotización emitida, precio aprobado o `quotation_id`; ponerle un número, una firma o
  un QR; quitar la leyenda de borrador por tu cuenta; prometer que el cotizador de Greenhouse ya usa este diseño.
- Emitir u ofrecer una cotización en EUR, o convertir a mano entre monedas.
- Usar el precio o el margen de un cliente como referencia para otro: una excepción bajo un piso nunca es
  precedente.
- Editar un archivo versionado, un artefacto congelado o `current.json`; emitir una versión del catálogo sin mover
  el puntero.

## 9. Lo que no está modelado

Dilo cuando el negocio lo toca; no lo presentes como existente ni lo resuelvas dentro de una cotización.

- **Una oferta dedicada a proyectos únicos.** Hoy: oferta gestionada + `on_demand` + un precio.
- **La puesta en marcha de un servicio gestionado**: `managed-service-core` no la costea.
- **Si el fee de plataforma se prorratea por dedicación**: decisión del CEO pendiente. Hoy se cobra entero por
  persona.
- **El costo medido detrás de las provisiones «TEST ONLY»** de los kits de staffing, y de las demás provisiones
  estimadas.
- **Herramientas sin precio vigente** (`current` en `needs_input`): se elige otro `priceId` como supuesto.
- **El presupuesto máximo y la fórmula de puntaje de un comprador** en una licitación.
- **El costo del dinero de un pago tardío**; cuándo se le paga a un proveedor; compromisos de una compra que siguen
  después del trabajo (derechos de uso); una comisión sobre lo que paga el cliente; la reserva de un servicio
  On-Going con multas.
- **El panel de Greenhouse e Insights como recursos costeados.**
- **Número de cotización, versiones, QR, firmas y aprobación**: existen sólo en el cotizador de Greenhouse. Llevar
  este diseño allá es el paso acordado y **no está empezado**.
- **Periodos menores a un mes** y una moneda de presentación distinta de la de la cotización.

**Fuera del cotizador por decisión, no un pendiente:** la fecha de inicio del servicio y la duración del contrato
(una cotización no es un contrato). El registro de brechas con dueño y acción está en
`data/pricing/v3-operating/operational-gaps.json`.

## 10. Datos, mantenimiento y código

- **Datos operativos:** `data/pricing/v3-operating/` (catálogo y policy versionados, puntero `current.json`,
  ejemplos, change-sets, `operational-gaps.json`; [README](../../../../data/pricing/v3-operating/README.md));
  créditos en `data/pricing/v3-resources/`. `data/pricing/v3-catalog/` y `v3-composition/` son fixtures anteriores:
  no las uses como punto de partida.
- **Manuales:** [operar el cotizador con agentes](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md),
  [componer con herramientas](../../../../docs/manual-de-uso/finance/componer-cotizacion-v3-con-herramientas.md),
  [créditos de IA](../../../../docs/manual-de-uso/finance/presupuestar-creditos-ia-v3.md),
  [catálogo: selección y actualización](../../../../docs/manual-de-uso/finance/catalogo-v3-seleccion-y-actualizacion.md),
  [plantilla A4](../../../../docs/commercial/templates/cotizacion-a4/README.md).
- **Decisiones (la historia):**
  [ADR operativo](../../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md),
  [ADR motor 1.1 y contratos posteriores](../../../../docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md),
  [promoción canónica](../../../../docs/documentation/finance/cotizador-v3-promocion-canonica.md) (la frontera con
  el cotizador de Greenhouse: este carril no la cruza).
- **Mantenimiento del catálogo** (un valor cambia sólo con una versión nueva; los valores los decide el operador):
  preparar el change-set sobre la base vigente → `catalog preview --current --input cambio.json` (o `resources
  preview`) y mostrárselo → con su confirmación, `catalog apply --current --input cambio.json --confirm
  <previewDigest> --out <sucesor>` → probar el sucesor cotizando un caso por oferta, país o moneda tocada → mover el
  puntero con `current set --catalog A --policy B --credits C --reason "…" --confirm <pointerDigest>` → `current
  show` con `consistent: true` y `pnpm pricing:v3:test` verde. `apply` no mueve el puntero ni repricea cotizaciones
  previas. Pasos completos y campos de cada clase de registro: manual del catálogo.
- **Código:**

| Qué | Dónde |
| --- | --- |
| Kernel, contratos por versión, ajustes, redondeo, piso | `src/lib/finance/pricing-v3/calculate.ts`, `schemas.ts` |
| Brief, registros del catálogo, resolución, total acordado | `src/lib/finance/pricing-v3/catalog/{contracts,resolve,agreed-total,quote,explain}.ts` |
| Demanda, policy de recursos, asientos, atribuciones | `src/lib/finance/pricing-v3/resources/{composition-contracts,composition}.ts` |
| Andamio, portfolio, plan, `resources inspect` | `src/lib/finance/pricing-v3/resources/operating.ts` |
| Volumen → dedicación | `src/lib/finance/pricing-v3/resources/workload.ts` |
| Créditos | `src/lib/finance/pricing-v3/resources/credit-budget.ts` |
| Resumen, piso por fila, exposición a estimados | `src/lib/finance/pricing-v3/resources/summary.ts` |
| `assess`, proyección cliente-segura, `preview` | `src/lib/finance/pricing-v3/resources/readiness.ts` |
| `split`, `schedule`/`cash`, `commitments`, `increment` | `src/lib/finance/pricing-v3/resources/{price-split,engagement-view,commitment-exposure,quote-increment}.ts` |
| Documento | `src/lib/finance/pricing-v3/resources/quote-document.ts`, `scripts/documents/render-cotizacion-a4.mjs` |
| Rechazos (registro cerrado) | `src/lib/finance/pricing-v3/errors.ts` |
| CLI, `--current`, `--out`, `runNotices` | `scripts/commercial/pricing-v3.ts`, `src/lib/finance/pricing-v3/adapters/` |
| Pruebas y guardas (replay de todo artefacto congelado; el puntero nombra la versión más alta) | `src/lib/finance/pricing-v3/__tests__/`, `pnpm pricing:v3:test` |

Las fuentes y los cambios locales no acreditan adopción en API, UI o MCP, sincronización remota, aprobación
económica ni emisión. Si cambia un contrato, se actualiza su dueño en docs y después este procedimiento y sus
espejos; no se duplica la spec aquí.
