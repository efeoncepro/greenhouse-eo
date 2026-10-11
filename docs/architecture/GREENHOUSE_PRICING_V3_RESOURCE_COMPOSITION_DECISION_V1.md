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
