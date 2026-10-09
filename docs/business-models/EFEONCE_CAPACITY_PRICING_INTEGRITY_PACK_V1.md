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
El piloto diseñador verifica economía de un perfil; el kernel local sólo representa staffing. No exportarlo como oferta completa de pod.
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
Un caso al 35% puede caer unas fracciones por debajo del piso por redondeo monetario. El motor lo señala; no tolerar automáticamente ni esconder la diferencia. Revisar precio explícitamente.
Bajo piso: `re-price | re-scope | no-go`; excepción sólo con razón, owner, plazo y financiación de validación separados.

## 4. Cómo se arma el costo

[Contrato de componentes, provisiones y evidencias](../documentation/finance/cotizador-v3-provisiones-y-costos.md): humano con coberturas, licencias, plataforma, formación/verificación, backup/reemplazo, gestión, setup, infraestructura, costos financieros y exposición a compromisos.
No insertar un 20% laboral ni una reserva 15% sin base. No transformar null en cero.
Reserva de gestión, presupuesto de riesgo, devengo y provisión contable son conceptos diferentes. Este pack no registra contabilidad.

## 5. País, mercado y monedas

Costo específico de talento por país/contrato: usar fuente localizada y coberturas, sin factor salarial adicional. Referencia ajustada: país de origen y factor con método/fecha; la moneda USD no identifica país.
Mercado de oferta: política separada de precio humano; calibrar con ofertas comparables, pérdidas/ganancias y entrevistas de buyer. No descontar licencias/fees al aplicar un factor de mercado.
Mantener factor Chile 1 sólo en escenarios de aislamiento, como hipótesis. Un recargo no prueba disposición de pago; un descuento no puede cruzar el piso.
Moneda contractual/entidad/impuestos y FX requieren evidencia; no usar la tasa histórica 1.000 CLP/USD como actual.
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
