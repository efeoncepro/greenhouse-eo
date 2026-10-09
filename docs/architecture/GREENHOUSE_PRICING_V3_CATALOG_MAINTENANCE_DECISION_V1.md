# Pricing V3 — catálogo, resolución y mantenimiento local

- Status: Accepted para prototipo local; aprobado por operador 2026-10-09.
- Owner: Finance/Commercial (valores y precio), Operations (kits/capacidad), Platform (contrato).
- Work unit: TASK-2019.
- Predecessor: GREENHOUSE_PRICING_V3_LOCAL_PROTOTYPE_DECISION_V1.md permanece vigente para kernel/V2.

## Decision

Catálogo versionado de registros tipados, separado de demanda. Resolver por fecha de cotización, país, perfil/variante y policy explícita. No insertar presupuestos de un expediente como tarifa general. JSON local es source of truth de este prototipo, no del catálogo runtime Greenhouse.

Brief → selección/bindings → snapshots por período → kernel V3 existente → quote congelada con explicación. Calendario puede variar actividad/dedicación por mes; es economía de capacidad, no contrato comercial de programa/hitos. Quote usa catálogo válido en quoteDate y fija esos términos para su horizonte; cambios posteriores sólo afectan nuevas cotizaciones o una revisión explícita.

Recursos declaran monto/moneda/unidad/scope, kits declaran cantidad/asignación. Seats no se prorratean por FTE automáticamente. Recursos de cuenta/equipo compartidos sólo por regla explícita y suman una unidad sin duplicación. Recursos provistos por cliente requieren exclusión justificada. No mezclar salarios con fee/software. Faltantes/ambigüedad detienen el cálculo completo; modo simulación permite históricos explícitos, jamás los convierte en actuales.

## Maintenance

Cambios add/replace/retire con fecha efectiva, fuente, responsable, motivo y versión nueva. Preview lista diferencias y recalcula briefs opcionales; apply verifica digest de preview y padre, genera archivo nuevo sin sobrescritura. Intervalos de vigencia no se solapan para una misma clave de resolución. Futuras alzas no se aplican antes de fecha. Retiro no borra historia. Fecha/fuente de un incremento reemplazan datos anteriores, no heredan confirmación automáticamente. Quote y replay conservan catálogo/inputs/resultados congelados.

No automatizar búsqueda de precios/salarios ni promover estados sin revisión. Revisión propuesta trimestral y por evento (factura/licencia, salario, FX/política); dueño Finance/Operations. El contrato no crea un cron ni autorización comercial/contable/laboral.

## Alternatives / boundaries

Rechazado: pricing en agente/CLI, seguir leyendo Excel en runtime, mutar catálogo in-place, reutilizar presupuestos de expediente como catálogo. Elegido: primitive reusable + filesystem adapter. Sin nuevos servicios/dependencias/DB/API/MCP; futuros consumers usan el mismo dominio. Export público continúa su gate, no se exponen costos internos por inferencia.

## Verification / revisit

Resolución ambigua/faltante, seats no lineales, compartidos sin doble cobro, calendarios, cambios efectivos, conflicto base y replay previo tras actualización. Reabrir para promoción runtime, permisos/persistencia, tarifas comerciales y facturación gestionada.
