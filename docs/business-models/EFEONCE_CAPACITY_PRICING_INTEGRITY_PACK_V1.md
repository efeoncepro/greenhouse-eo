# Capacidad especializada — Pricing Integrity Pack V1

Fecha: 2026-10-09. Estado: `Proposed / hypothesis_only`. Autor: Codex, por encargo del operador.
Owners: Finance/Pricing, Commercial, Talent/Operations y práctica dueña. Unidad: TASK-2017.
El encargo autoriza preparar y probar; los porcentajes y términos siguientes son recomendaciones nuevas, no aprobaciones comerciales.

Canon: [Talent Assurance](EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1.md),
[modelo CRM](revenue-operations-crm/CRM_SPECIALIST_CAPACITY_BUSINESS_MODEL_V1.md),
[Embedded Creative Pod](../services/creative-services/EFEONCE_EMBEDDED_CREATIVE_POD_OPERATING_MODEL_V1.md),
[ADR local V3](../architecture/GREENHOUSE_PRICING_V3_LOCAL_PROTOTYPE_DECISION_V1.md) y
[ADR de mantenimiento](../architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md).
No cambia semántica del motor, payroll, catálogo comercial o contratos. No aplica pisos de otras líneas por analogía.

## 1. Qué compra el cliente

JTBD: sumar capacidad competente y continuidad sin administrar por su cuenta selección, formación y proveedores.
El operador cliente aporta contexto/prioridades y acepta trabajo; sponsor/economic buyer valida scope y presupuesto;
Finance/Procurement y governance owners validan términos. Vacante, entusiasmo o presupuesto de contratación no prueban compra de servicios.
Primer valor: tarea/backlog prioritario aceptado y usado, con horas de supervisión y calidad observables.
Anti-fit: pide disponibilidad ilimitada, ausencia de owner, acceso inseguro, presupuesto sin estándar financiado o dirección incompatible con la modalidad.

| Configuración | Cobro propuesto | Responsabilidad y perímetro |
| --- | --- | --- |
| Staff Augmentation | Fee mensual por rol, seniority y capacidad neta reservada | Cliente dirige; Efeonce costea selección, formación y continuidad acordadas; no promete outcome gestionado |
| Managed / Embedded Creative Pod | Fee por alcance y capacidad con gobierno | Efeonce dirige y responde por delivery dentro de SOW; requiere coordinación/QA/composición completos |
| Onboarding adicional | Cargo único según trabajo incremental | Sólo si no está cubierto en recurrente; evaluación y transición inicial con outputs definidos |
| Terceros / consumo extraordinario | Línea explícita autorizada | Sin uso ilimitado ni compra automática; derechos y responsabilidad definidos |

Staffing/Staff Augmentation son delivery, no nuevas marcas. Talent Assurance es estándar costeado, no SKU para cobrar el mismo backup dos veces.
El piloto diseñador prueba aritmética de un perfil con antecedentes históricos. El flujo local ahora distingue
`role_capacity` y `managed_service`; este último agrega un fee de servicio manteniendo roles como costeo interno.
Ese preview no valida economía, capacidad, SOW ni oferta completa de pod.
No cambiar el modelo creativo aprobado para poder emitir un archivo. CRM conserva su propia práctica/scorecard.

## 2. Unidad, tiers y plazo

Unidad propuesta: capacidad neta reservada por mes con alcance, horario/ventana, prioridad, criterios de aceptación y límites. Horas sirven para costeo interno y capacidad.
Distinguir FTE contratado, capacidad útil, costo comprometido y capacidad vendida. 50% vendido no prueba que podamos contratar media persona o revender la otra mitad.

Tier describe especialización, dificultad de contratar, QA y continuidad; seniority describe competencias/experiencia.
HubSpot/Salesforce no se fusionan ni heredan costos por etiqueta. No asignar margen mayor automáticamente a todo tier alto: primero costear recursos y riesgo; luego validar valor/disposición de pago.
Hipótesis del piloto: 1 persona, 3 meses, USD y modalidad compartida. No fija mínimo universal, equivalencia legal de 180 horas ni términos del cliente.

## 3. Recomendación de margen para el piloto

- Objetivo propuesto: **40% de contribución sobre venta neta**, sobre costo atribuible completo del mismo horizonte.
- Piso propuesto: **35%**, controlado tras descuento, ajuste de mercado, FX y redondeo.
- Descuento automático: ninguno. Revisar precio neto y alcance antes de concederlo.
- Bandas 35/40/45% son sensibilidad, no tres paquetes públicos ni willingness-to-pay confirmado.
- No se garantiza margen operativo corporativo: overhead no atribuido, CAC y estructura deben conciliarse aparte. Si faltan costos, este margen corresponde sólo al perímetro modelado.

El método elegido es margen objetivo, ya soportado por el motor. Precio neto objetivo = costo atribuible / (1 − margen objetivo), antes de otros ajustes declarados.
Un markup de 30% deja aproximadamente 23,08% de margen, no 30%. Una mejora del margen exige costos completos y valor defendible, no rebajar el salario para mantener la promesa.

Con 40% objetivo y 35% piso, el límite aritmético de descuento es aproximadamente 7,69% **si costo/base no cambian**. No autoriza ese descuento: usar resultado exacto de CLI y precio final; preservar capacidad/continuidad.
Con el catálogo vigente el redondeo comercial sube cada fila al múltiplo de su moneda y no deja bajo el piso una fila que lo cumplía (§12). Una fila bajo piso por otra causa la señala el motor; no tolerar automáticamente ni esconder la diferencia. Revisar precio explícitamente.
Bajo piso: `re-price | re-scope | no-go`; excepción sólo con razón, owner, plazo y financiación de validación separados.

## 4. Cómo se arma el costo

[Contrato de componentes, provisiones y evidencias](../documentation/finance/cotizador-v3-provisiones-y-costos.md): humano con coberturas, licencias, plataforma, formación/verificación, backup/reemplazo, gestión, setup, infraestructura, costos financieros y exposición a compromisos.
No insertar un 20% laboral ni una reserva 15% sin base. No transformar null en cero.
Reserva de gestión, presupuesto de riesgo, devengo y provisión contable son conceptos diferentes. Este pack no registra contabilidad.
Delta 2026-10-11 (decisión del operador, CEO): el costo de las personas en el cotizador es el nivel salarial objetivo del Excel de pricing, no la nómina actual, y no se conecta a ella. El margen real sobre personas hoy es mayor que el simulado.

## 5. País, mercado y monedas

Costo específico de talento por país/contrato: usar fuente localizada y coberturas, sin factor salarial adicional. Referencia ajustada: país de origen y factor con método/fecha; la moneda USD no identifica país.
Mercado de oferta: política separada de precio humano; calibrar con ofertas comparables, pérdidas/ganancias y entrevistas de buyer. No descontar licencias/fees al aplicar un factor de mercado.
Chile es la base de ambos ejes (factor 1). Un recargo no prueba disposición de pago; donde el factor de mercado es menor que 1 (hoy CO y PE) el piso se lee sobre el precio del mercado base (§12).
Moneda contractual/entidad/impuestos requieren evidencia. El FX de cotización es un valor de política del CEO con USD de referencia (§12), no una observación de mercado ni la tasa de una transacción.
El esquema sirve para CL/CO/PE/MX/US; cada configuración necesita datos y responsabilidades propios. No trasladar un loaded cost o dictamen de un país a otro.

## 6. Herramientas y consumo

[Research fechado](../../data/pricing/v3-pilot/economics/commercial-policy-proposal/resource-research.json): referencias oficiales públicas, no factura Efeonce ni precio local contratado.
Cada kit elige plan, unidad, seat/cuenta, moneda, plazo/pago, asignación y cobertura técnica. Seat nominativo completo no se divide por la dedicación del usuario.
Atribuir un seat de una persona entre cuentas requiere reparto real y política aprobada; no compartir credenciales ni dividir un paquete entre personas por supuesto.
No cobrar dos veces el mismo costo de documentación/collaboration si una plataforma cubre ambas necesidades. Licencias del cliente requieren evidencia de acceso, plan y continuidad.
Compromiso anual y pago mensual son dimensiones distintas. Un contrato cliente de tres meses no libera los nueve restantes del proveedor. Resolver reasignación o costo no recuperable y caja antes de aceptar.
Consumo API/AI medido y topes se separan de suscripción; no presumir que ChatGPT Business incluye uso API. Aprobación de datos/derechos sigue su carril.

## 7. Condiciones comerciales propuestas para revisar

- Piloto de tres meses; fee recurrente + onboarding justificado. Es horizonte de validación, no regla obligatoria global.
- Proponer pago mensual anticipado y setup antes de activar; si procurement requiere pago posterior, costear DSO/caja y financiarlo explícitamente.
- Precio del borrador válido 15 días como hipótesis; revalidar fuentes antes de emisión. No confundir vigencia del borrador con vigencia anual del proveedor.
- Aumentos de catálogo afectan nuevas quotes. Contratos activos sólo según cláusula pactada, notice y revisión explícita; no imponer alzas retroactivas.
- Sin cambios ilimitados, garantía de revenue ni SLA de reemplazo hasta tener backup, costo y capacidad demostrados.
- Pausa/salida, renovación, sustitución, entrega de memoria y eventual contratación directa se acuerdan en SOW. Plazos y penalidades requieren revisión; no inventarlos para fijar el precio.

## 8. Resultados reproducibles

[CLI y artefactos](../../data/pricing/v3-pilot/economics/commercial-policy-proposal/README.md).
Costos históricos + trial Assurance/gestión/setup permanecen iguales para aislar política; no son costo colombiano confirmado.

| Sensibilidad | Neto 3 meses USD | Qué muestra |
| --- | ---: | --- |
| Margen objetivo 35% | 5.129,23 | Cerca del piso; redondeo puede activar revisión |
| Margen objetivo 40% | 5.556,68 | Recomendación de política sobre perímetro histórico |
| Margen objetivo 45% | 6.061,82 | Mayor contribución; falta validar compra |
| 40%, costo de persona completa reservado | 8.831,66 | Riesgo de asumir que la capacidad restante se vende |
| 40%, descuento 5% | 5.278,85 | Margen modelado ~36,84% |
| 40%, descuento 10% | 5.001,01 | Margen modelado ~33,33%, cruza piso35 |

En escenario40: USD1.796,67 recurrentes/mes y USD166,67 de setup; promedio del plazo USD1.852,23 incluye setup. No anunciar USD1.796,67 como tarifa vigente.
El brief de comercialización usa costo CO y recursos pendientes explícitos y retorna needs_input sin totales. Los ensayos históricos requieren_review y no exportan borrador cliente.

## 9. Validación, responsables y parada

| Evidencia pendiente | Owner | Salida concreta |
| --- | --- | --- |
| Costo y modalidad en Colombia | People + Finance | Cotización/compensación autorizada con moneda, vigencia y coberturas; comprobación de recruitability |
| Capacidad50% y reserva restante | Operations | Calendario, horas útiles y costo comprometido reconciliados; no revender reserva de otro contrato |
| Formación, QA, continuidad y gestión | Práctica + Operations | Actividades, horas, rates cargados, backup equivalente y fronteras de costo |
| Planes/facturas de herramientas/plataforma | Operations + Finance | Seats, unidad, mínimo, país/entidad, términos y asignación registrados |
| 40%/35%, pagos y mercado | Commercial + Finance | Decisión explícita sobre propuesta, con costo completo y buyer evidence |
| Alcance/entidad/contrato/impuestos | Commercial + práctica + Legal/Finance | SOW aplicable a la dirección real y costos/compromisos completos |

Prueba propuesta: piloto pagado con baseline de primer valor, calidad, supervisión, coste real y pago. Revisión30/60/90 es hipótesis operativa, no SLA universal.
Seguir si hay aceptación útil, staffing/continuidad financiados y contribución dentro de política. Re-scope/re-price si cambia demanda o costos. Parar si no hay capacidad, contrato operativo, respaldo financiado o buyer que compre.
No existe muestra de compra validada; no inventar un threshold de conversión o precio competitivo. Medir y contrastar antes de escalar países/perfiles.

## 10. Estado y mantenimiento

Preparación ejecutada; economía comercial parcial. Review date propuesta: 2026-11-08, o antes ante evidencia nueva. No se creó recordatorio/cron.
Actualizar según [contrato versionado](../documentation/finance/cotizador-v3-mantenimiento-catalogo.md), con fuente, vigencia, preview, confirmación técnica y sucesor explícito.
Resolver cada unknown, usar change-set y volver a prepare/quote/explain/replay. Catalog/apply no firma ni aprueba tarifas. TASK-2017 sigue abierta; TASK-2019 conserva implementación local completa.

## 11. Aplicación operativa con Cotizador V3

El [flujo de agentes](../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) ya resuelve selección,
atribución y cálculo local desde catálogos versionados; el [ADR operativo](../architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md)
fija sus fronteras. Expediente aporta demanda, el agente selecciona recursos justificables y la primitive calcula.
No copiar honorarios del expediente a la rate card ni sumar todas las suites a todos los perfiles.

La base Notion/Microsoft 365 es interna obligatoria. Perfiles/tareas y elecciones IA determinan el resto;
planes, seats, cantidades, cuota y calendario se declaran. Creative Cloud Pro ya incluye Express: no se cargan ambos a
la misma persona (§12).
Recursos específicos aportados por el cliente necesitan evidencia de acceso por líneas y período; ese caso
no elimina la base interna ni acredita gratuidad global. La modalidad de venta se elige antes del preview:
rol/capacidad o fee de servicio, con los mismos costos internos completos y el SOW de la práctica correspondiente.

Portfolio reparte paquetes/pools por capacidad declarada: cuenta, uso interno y no asignado reconcilian con
el denominador y el costo completo. El operador autorizó ese método, pero todavía no aportó cartera real.
Seats nominativos requieren usuarios y capacidad, no reducción por FTE ni uso compartido de credenciales.
En IA se separan suscripción atribuida, paquetes a demanda, compra mínima/caja, remanente y vencimiento.
La reserva contable o laboral no se deriva de ese reparto; se mantiene el contrato de provisiones anterior.

Evidencia incorporada: Adobe según su factura, dos productos en CLP (§12; reemplaza al paquete combinado declarado el
2026-10-09); factura Notion por seat y créditos en su período, pago no comprobado; variantes oficiales públicas
para planes que no acreditan contrato Efeonce. Valores ejecutables en
[fuentes versionadas](../../data/pricing/v3-operating/README.md), sin replicar tablas como tarifas vigentes.

`compose assess` enumera brechas económicas y `compose preview` muestra sólo conceptos comerciales y precios
de simulación. Ninguno garantiza cierre de los gates de esta práctica; 40%/35% conserva estado propuesto.
Actualizar catálogos/policy/packs usa preview de impacto y apply a sucesor, sin reprecificar quotes anteriores
ni imponer cambios al cliente. [Brechas por owner](../../data/pricing/v3-operating/operational-gaps.json):
economía parcial en TASK-2017; funcionamiento local completo en TASK-2022; integración canónica pendiente.

## 12. Delta 2026-10-11 — decisiones del operador que acotan este pack

Las cifras comerciales y las excepciones las decide el operador (Julio Reyes, CEO). Este pack conserva su estado
`Proposed / hypothesis_only`; lo siguiente corrige lo que el texto del 2026-10-09 ya no describe bien.

- **Margen.** El 40%/35% de §3 sigue siendo una propuesta sin aprobar y nunca se usa como piso; su decisión (§9)
  corresponde al operador, con costo completo y evidencia de comprador de Commercial y Finance. El piso de 45% es la
  norma de los servicios gestionados de la práctica creativa (política `creative-managed-service`, objetivo 45% y
  mínimo 45%): donde se puede ganar más se sube el objetivo de la oferta, no el piso, como en los servicios gestionados
  de la práctica SEO/AEO (política `seo-aeo-managed-service`, objetivo 55% y mínimo 45%, desde el 2026-10-11). Una
  persona vendida por dedicación (staff augmentation, política `talent-assurance-staffing`) tiene desde el 2026-10-11
  un piso de 25%, también decidido por el CEO, y de ahí sube según el caso: ese es el piso que rige en el catálogo
  para esa oferta, no el 35% propuesto en §3. Los objetivos por tier del catálogo (30%, 35% y 40%) los propuso un
  agente y los confirmó el CEO el mismo día. Una excepción bajo un piso es
  una decisión explícita del CEO para un cliente (la aprobada el 2026-10-10 está registrada en el expediente comercial de
  ese cliente) y nunca sirve de referencia de margen para otro.
- **Costo de personas.** Los 32 costos de perfil del catálogo vienen del Excel de pricing, confirmados por su autor
  como el costo de cada perfil en Chile; son el nivel objetivo descrito en §4. La fila «Costo y modalidad en
  Colombia» de §9 ya no espera una base de costo: queda validar la recruitability, o registrar un costo específico
  cuando el costo objetivo de un perfil en un país se aparte de esa referencia (el factor de talento quedó cerrado
  esa noche: ver «País»).
- **País.** El país de la persona cambia el costo (factor de talento; Chile es la base con 1; CO 0,80 · PE 0,85 ·
  MX 0,90 · ES 3 · US 5, propuestos por un agente). El país del cliente cambia el precio del componente humano
  (factor de mercado: CL 1 · CO 0,90 · US 1,10 · PE 0,95 · MX 1 · ES 1,10). El CEO los cerró todos el 2026-10-11 por la
  noche y rigen como valores de política confirmados desde el 2026-10-12: no son estimaciones a la espera de su
  decisión, y uno se revisa sólo si una contratación real o un negocio cerrado en ese país lo contradice. Donde el factor declara `floorBasis: base_market` (CO y PE) el piso se lee sobre el precio del
  mercado base. No hay factores por tipo de cliente ni factores de talento por perfil.
- **Monedas.** El redondeo comercial sube cada fila al múltiplo de su moneda: CLP 10.000 · USD 10 · PEN 50 ·
  COP 50.000 · MXN 100. El FX de cotización es política del CEO, con USD de referencia y margen prudencial sobre el
  spot: USD→CLP 1.000 · COP 3.650 · MXN 19,25 · PEN 3,70. Todavía no se puede emitir una cotización en EUR (no hay
  FX USD→EUR ni regla de redondeo); a un cliente español se le cotiza en USD. CLF tampoco tiene redondeo ni FX revisado.
- **Herramientas.** Un precio unitario no vence: rige hasta que una versión nueva de la policy lo reemplaza y lleva
  una fecha de revisión que avisa sin bloquear. Lo que varía es la cantidad de seats, que se declara en cada
  cotización. La mayoría sigue siendo precio público de lista marcado como estimado (§6).
- **Adobe y plazos de contrato.** Adobe se costea como se factura: dos productos, tres licencias cada uno, en CLP y con
  IVA por decisión del CEO. Creative Cloud Pro es para diseñadores e incluye Express; Adobe Express es para los perfiles
  de contenido (Social Media Manager, Community Manager, Content Manager y Content Creator, confirmados por el CEO). El
  contrato es de doce meses pagado al mes y renueva el 2026-11-16. Creative Cloud Pro se factura hoy con un 50% de
  descuento que termina pronto; por decisión del CEO (2026-10-11) se cotiza desde ya sin descuento, y el importe
  facturado sólo se usa, si el CEO lo elige, en un encargo que termina antes que el descuento. Lo que
  importa es cuánto tiempo se paga una licencia una vez tomada, según lo declaró el CEO: una licencia Adobe se sigue
  cobrando hasta que renueva el contrato; en Microsoft 365 (contrato anual pagado al mes, con el precio de su
  factura desde el 2026-10-11) quitar una licencia baja la cuenta, y Notion es mes a mes; HubSpot es anual,
  pero no tiene precio ni plazo declarado, a propósito: el CEO indicó que hoy no se necesita en las cotizaciones. Esto concreta la regla de §6 sobre compromiso y
  pago: una licencia Adobe comprada para un encargo de un mes se sigue cobrando hasta la renovación del contrato si
  nadie más la usa.
- **Puesta en marcha.** La regla del Excel de pricing (fee de reclutamiento y onboarding = un mes del costo del recurso)
  no se usa en el cotizador: en un refuerzo de un mes duplicaría el precio. En su lugar hay dos provisiones de costo,
  propuestas por un agente y aceptadas por el CEO, ambas estimadas y por medir en las próximas dos incorporaciones:
  onboarding de cuenta, USD 200 una vez por cada persona que entra (por defecto en una persona vendida por dedicación),
  y reclutamiento, USD 500 una vez por persona, sólo cuando hay que contratar a alguien para ese cliente. Quien se suma
  después paga su propio onboarding. Un servicio gestionado no trae requisito de puesta en marcha. La protección que
  buscaba la regla (plazo mínimo cuando se recluta, cláusula de conversión si el cliente contrata a la persona) es
  materia de contrato y revisión legal (§7), no de precio.
- **Forma del compromiso.** On-Demand es una forma de compromiso que se declara en la cotización, no una oferta ni un
  delivery model: suma 10% al precio de toda la fila sobre On-Going y no mueve el piso. El diseño lo eligió el CEO; el
  10% es el multiplicador del Excel de pricing, que el agente mantuvo cuando el CEO le dejó el ajuste. En el cotizador
  los costos reales de un trabajo acotado (puesta en marcha, coordinación como dedicación de una persona, compromisos
  con proveedores) van como costo, y el 10% cubre sólo riesgo y política. No hay forma híbrida: se cotiza una fundación
  On-Demand y una operación On-Going por separado. Una forma no declarada se cotiza como On-Going.
- **Lecturas y pendientes.** De una cotización congelada salen tres lecturas: calendario de pagos, compromisos con
  proveedores y lectura de caja, que nunca es un margen ni decide el precio. Todavía no se modelan la duración del
  contrato ni períodos menores a un mes.
- **Terceros y reserva (noche del 2026-10-11).** La línea «Terceros / consumo extraordinario» de §2 ya se puede
  cotizar: cada costo que se compra para un trabajo y se refactura es una fila propia, con la regla de su categoría
  (producción, talento e impresión: 10% de gestión con piso de 5%; medios y licencias: al costo), y un costo que el
  cliente paga directo es una nota que no entra a ningún total. Un servicio gestionado vendido On-Demand lleva una
  reserva de contingencia de 12% del costo de las personas, como costo: se vende con el margen de la oferta y con la
  razón On-Demand y sale sólo por una renuncia declarada con su motivo, que queda señalada; una persona por dedicación
  no la lleva. Las dos son estimaciones propuestas por un agente y aceptadas por el CEO, a ajustar con el primer
  trabajo real. Con terceros hay dos márgenes: el mezclado baja con todo lo refacturado cerca del costo y el piso de
  la oferta (45% o 25%) se lee sobre el del trabajo propio; quien juzgue por el mezclado rechaza trabajo sano o le baja
  el precio al equipo. No se modelan cuándo se le paga al proveedor, si una compra obliga más allá del trabajo
  (derechos de uso que lo sobreviven), una comisión sobre lo que paga el cliente, un tarifario de proveedores
  recurrentes ni el colchón de un servicio On-Going ganado en licitación con multas.
- **Resultados de §8.** Son el registro del piloto del 2026-10-09, anterior al redondeo comercial, al FX de política y
  a los factores de país; una cotización nueva con las versiones vigentes no tiene por qué repetir esas cifras.
- **Comandos.** Usa `--current` en lugar de nombrar a mano las versiones de catálogo, policy y créditos; los pasos y
  los valores vigentes están en el [manual](../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md).
