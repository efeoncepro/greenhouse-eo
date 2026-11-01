# Catálogo V3 v14 · Performance y Ecuador

27/10/2026. Julio pidió expresamente incorporar la oferta Performance y Ecuador, recalcular ARMOR y actualizar
la propuesta para revisión antes de enviar. Mantenimiento bajo el
[ADR de catálogo](../../../docs/architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md)
y [ADR operativo](../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md),
sin cambio de schema/kernel/API ni promoción a la base de la plataforma.

## Cambio y autoridad

[Change-set](performance-ecuador.change.json), padre v13. Preview digest
`daaadd3decb2104c577f4c7e6f5dc16deeb591e65ffcbfd52ab72daa9de0b491`.
`catalog apply` generó [catalog.review-v14.json](catalog.review-v14.json); `current set` lo dejó vigente y
`current show` confirmó todas las fuentes. Policy v12 y créditos v1 no cambian.

Se agregan38 registros: oferta `performance-commerce-distribution` como `managed_service`,35 reglas de precio,
factor de mercado `market:EC` y reserva de contingencia de Performance On-Demand. Ecuador se añade a la dimensión
países, como mercado cliente; no se agrega un factor salarial/costo localizado EC.

| Regla | Valor incorporado | Evidencia y límite |
| --- | --- | --- |
| Margen Performance | Objetivo55%; piso45% | Pack de Performance V1, todavía hipótesis. Incorporación autorizada; valor `estimated`, no nuevo tarifario validado. |
| Mercado Ecuador | Factor1,00 | Estimación neutra explícita del agente; no WTP demostrado ni número confirmado por el CEO. Revisión con primer caso cerrado. |
| Reserva Performance On-Demand | 12% del costo humano | Extensión estimada del patrón existente para servicios gestionados de alcance cerrado. No overhead ni reserva sobre medios. |
| Forma On-Demand | Razón1,10 | Regla general ya vigente y confirmada; sin cambio. |
| Otras ofertas, costos, FX y redondeo | Sin cambio | Ningún registro anterior fue reemplazado o retirado. |

No se publica una banda de precios ni se aprueba el precio de ARMOR al aplicar este catálogo. `estimated`
deja la revisión económica abierta. La oferta puede usar perfiles de distintas prácticas como funciones de
un equipo; la presencia de una regla no valida el alcance ni habilita promesas fuera de su competencia.

## Evidencia y alcance operativo

[Caso ARMOR calculado](../../../docs/commercial/accounts/indecaucho-armor/COSTEO-V3-2026-10-27.md):
US$22.450 de fee en90días; US$18.000 de medios `client_direct`, separados. Margen modelado59,28%, sin filas
bajo piso, estado`requires_review`. No préstamo de otra oferta, factor vecino o ajuste a precio acordado.

Suite V3:37 archivos,1.860 pruebas aprobadas/3 omitidas. Resolución de las cuatro ofertas en EC sin diagnósticos.
Los artefactos anteriores conservan su contexto congelado. Sin importación a producción, commit, push o envío.
