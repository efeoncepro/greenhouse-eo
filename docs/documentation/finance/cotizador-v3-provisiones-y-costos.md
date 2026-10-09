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
