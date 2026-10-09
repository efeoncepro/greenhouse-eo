# V3 — Componentes de costo, provisiones y evidencia

Fecha: 2026-10-09. Propuesta interna ligada a TASK-2017; no valores aprobados ni asientos contables.
[Pricing Integrity Pack](../../business-models/EFEONCE_CAPACITY_PRICING_INTEGRITY_PACK_V1.md) posee las recomendaciones de política.
[Inputs de revisión](../../../data/pricing/v3-pilot/economics/commercial-policy-proposal/driver-inputs.json) registran drivers, unknowns y destinos en el catálogo candidato. No se pasan directamente a la CLI.

## Perímetro y fórmula de cada componente

| Componente | Base de cálculo propuesta | Tratamiento y prevención de doble costo |
| --- | --- | --- |
| Remuneración | Honorario/salario autorizado + bonos contractuales + cargas aplicables | País, modalidad y coberturas de People/Finance; no sumar cargas ya incluidas |
| Capacidad no vendida | Loaded cost comprometido menos costo financiado por capacidad vendida | Si se compromete persona completa y sólo se vende50%, no asumir el resto vendido; no sumar bench además de full-FTE |
| Formación | Tiempo protegido de especialista, tiempo de mentor y cursos | Si especialista está remunerado, restar horas de capacidad útil; sumar sólo curso/mentor incremental o asignación no contada |
| Evaluación/QA | Horas del verificador/lead × rate cargado | Assessment inicial a setup; QA periódico a Assurance. Lead recurrente que ya incluye QA no se duplica |
| Respaldo | Horas reservadas/retainer de backup + accesos específicos | Identificar rol equivalente y disponibilidad real; no costear sólo un nombre en lista |
| Reemplazo | Frecuencia de eventos × costo de selección, transición y overlap / meses del horizonte | Sin frecuencia observada no declarar una reserva esperada; simular un evento y decidir quién financia exposición |
| Gestión | Horas de Account/Delivery/Operations × rate cargado | Presupuesto de coordinación/reporte/cobranza según modelo; no repetir horas del lead de QA |
| Onboarding | Trabajo inicial incremental de contexto, acceso, assessment y handoff | Costear por actor; cobrar una sola vez o incluir expresamente, sin amortizar dos veces |
| Licencias | Precio/contrato × seats/unidades y cuota de asignación demostrada | No dividir una licencia personal entre usuarios ni por FTE automáticamente; annual, pago y compromiso separados |
| Infraestructura | Uso de equipo, soporte, conectividad/seguridad y política de amortización Finance | Costo periódico y compra inicial de caja son distintos; no duplicar depreciación con compra como costo operativo |
| Financiación | Capital realmente financiado × tasa y plazo efectivo, más comisiones aplicables | DSO no es gasto en sí; separar caja y costo financiero, no sumar una reserva porcentual opaca |
| FX | Conversión con snapshot de pares/fecha/fuente; estrés de exposición específica | No aplicar shock FX a costos ya fijados en USD ni usar factor país como cambio de moneda |
| Exposición anual | Compromiso pendiente no reasignable o cancelación contractual | No sumar todo el anual además de los meses ya devengados; probar reasignación y caja |
| Impuestos | Tratamiento fiscal de cada entidad/operación | IVA recuperable/no recuperable, retenciones y renta no son un factor genérico; aprobación Finance correspondiente |

La provisión contable exige criterio propio; una reserva presupuestaria de contingencia no se convierte en un pasivo por llamarla «provisión». El resumen oficial de [IAS37](https://www.ifrs.org/issued-standards/list-of-standards/ias-37-provisions-contingent-liabilities-and-contingent-assets/) distingue obligaciones presentes de pérdidas operativas futuras. Este documento propone gestión/costeo, no su reconocimiento contable.

## Actividades iniciales propuestas, sin inventar rates

Para diseñador senior50%, probar mensualmente: 2h de aprendizaje del especialista, 1h de mentor y 2h de verificación/QA; 2h de coordinación de cuenta. Inicialmente: 4h de inmersión del especialista, 2h de assessment/lead y 2h de accesos/coordinación. Son presupuestos de actividad para discutir, no estándares medidos ni garantías.

No convertir las 2h+4h del especialista en un cargo adicional si ya están pagadas: reconocerlas dentro de su dedicación y explicar la capacidad neta. Si el cliente exige 50% de capacidad de ejecución **más** formación/onboarding, costear el compromiso adicional; no vender como neto el tiempo bruto.
180h/FTE es referencia del prototipo, no jornada legal colombiana. People/Operations debe definir horas útiles por mes, ausencias y simultaneidad del backup. No publicar 90h netas sin descontar todas las actividades del caso.

Para reemplazo, preparar downside con un evento realista cuyo costo desglosa selección, trabajo de transición y coexistencia. Frecuencia, horas y rates siguen null. Para bench, contrastar costo50% compartido frente a persona completa; no sumar luego otro 50% de reserva.

## Conectar las evidencias al catálogo y a la CLI

1. Revisión contiene fórmula/driver, responsable, cobertura y evidencia requerida; importes actuales ausentes siguen null.
2. Finance convierte cada driver medido en un monto de recurso con moneda/unidad/fuente y vigencia, o registra exclusión/zeroReason fundamentado.
3. Change-set agrega/reemplaza esos registros y el kit. No pegar costos o reservas del expediente en el brief.
4. Preview muestra impacto; apply produce nueva versión. El agente selecciona `--catalog`, resuelve el brief y ejecuta quote/explain/replay.
5. Revisar costo completo, margen tras ajustes, caja, recruitability y alcance antes de aprobación comercial.

El [catálogo candidato](../../../data/pricing/v3-pilot/economics/commercial-policy-proposal/catalog.proposed.json) mantiene pendientes separados para formación/verificación, backup/reemplazo, gestión, infraestructura, setup, financiación y anualidades. No reutiliza trial-assurance25/operations25 para aparentar cobertura comercial.
El [brief comercial](../../../data/pricing/v3-pilot/economics/commercial-policy-proposal/commercial-readiness.brief.json) exige esos registros y conserva bloqueo. No publica catálogo ni habilita fuente confirmed por cambiar etiquetas.

## Qué representa hoy el motor

Recursos ya normalizados month/year/once, dedicación y asignación, países separados, markup/margen, descuentos, snapshots y desglose. No hidrata fórmulas de drivers, probabilidad de reemplazo, activos/depreciación, interés por DSO o mínimos de procurement desde este documento.
El kernel staffing tampoco certifica delivery de un pod. Estas brechas se resuelven con evidencia/recursos explícitos o una futura extensión formal; no esconderlas en un monto global.
Compromiso anual con pago mensual necesita términos de contrato separados: unit=month no demuestra cancelación mensual. Si no se puede representar correctamente caja/costo, no promocionar el caso.

## Licencias y plataforma declaradas por el operador

[Presupuesto IA y recargas](cotizador-v3-creditos-ia.md): primitive/CLI incorpora paquetes enteros observados, remanente/caducidad y costo de compra separado de cuota existente. No hidrata automáticamente quote/kit ni modifica el reparto de plataforma pendiente.

[Registro2026-10-09](../../../data/pricing/v3-pilot/economics/resource-inputs/README.md): Higgsfield139USD/mes con3000créditos, Magnific40EUR/mes con45000créditos, Adobe180USD/mes y3CC Teams+3Express, Vercel60–100USD/mes, GCP/BBDD264USD/mes. Son declaraciones del operador; no facturas verificadas, import automático, accesos asignados ni tarifa aprobada. Magnific mantiene EUR y requiere FX explícito al convertir.

Adobe: cobertura del180, frecuencia mensual asumida por contexto y alcance/fecha del alza70% pendientes de confirmación.306USD/mes es proyección condicional si180 es la base afectada; no dividir entre seis seats de planes distintos, duplicar Express ni anticipar renovación sin fecha.

Tratamiento propuesto para revisar con Finance/Operations:

- Seat nominativo: costo según plan/persona y reparto entre servicios donde trabaja, con evidencia; no dividir por FTE sin regla ni compartir usuarios por supuesto.
- Higgsfield/Magnific: cuota fija y presupuesto de consumo por servicio. `139/3000` y `40/45000` son referencias de costo medio del paquete si se utiliza completo, no tarifa marginal ni equivalencia entre proveedores. Asignaciones más remanente/interno deben reconciliar la cuota. Un consumo no cubierto puede exigir nuevo paquete/excedente, con precio pendiente; no sumar cuota completa y el mismo costo de créditos otra vez.
- Vercel/GCP: pool compartido324–364USD/mes. Separar consumo atribuible a servicios y operación interna; revisar si cada proveedor necesita driver propio. Cada servicio absorbe `pool mensual × proporción de delivery × proporción del servicio`, con denominadores medidos y policy aprobada. No asignar todo el pool a cada cliente/persona ni ocultar capacidad interna/no vendida redistribuyéndola.
- Vercel100 es escenario conservador de presupuesto, no costo fijo confirmado. Reparto igual entre cuentas elegibles sólo sirve como simulación mientras falten elegibilidad, número de cuentas y policy. No duplica un addon de operaciones ni overhead que ya cubra esta infraestructura.

En servicio gestionado, equipo/esfuerzo/licencias/IA/plataforma son inputs internos de costo; la unidad comercial conserva alcance, cadencia y límites acordados. El rol/capacidad ofertado especifica su dedicación y cobertura. El kernel staffing actual no adquiere soporte de composición comercial de servicios por registrar estos antecedentes.

Datos pendientes: asignaciones por persona/cuenta, permisos/planes, ventanas de vigencia/renovación, compromiso/plazo, uso y excedentes, fuente FX y reparto delivery/interno. Baseline/quotes previas quedan intactas. Se reutiliza ADR de mantenimiento; no cambia schema, cálculo, contabilidad ni runtime cloud.
