# Propuesta económica — diseñador senior 50%, Colombia → Chile

[Superficie V3 implementada y frontera comercial](../../../../../docs/documentation/finance/cotizador-v3-superficie-implementada.md). Este conjunto conserva su versión/caso original; las fuentes y la policy operativa sucesora se seleccionan explícitamente y no alteran resultados congelados.

Preparado 2026-10-09, TASK-2017. `review_only`, economics parciales; ningún precio aprobado.

- [Pricing Integrity Pack](../../../../../docs/business-models/EFEONCE_CAPACITY_PRICING_INTEGRITY_PACK_V1.md): recomendaciones y validación.
- [Provisiones y componentes](../../../../../docs/documentation/finance/cotizador-v3-provisiones-y-costos.md).
- [Fuentes oficiales de recursos](resource-research.json): precio público, unidad/plazo y contexto; no costo contratado.
- [Drivers pendientes](driver-inputs.json): horas propuestas, tasas/montos null, owners y evidencia. No input CLI.
- [Change-set](change-set.json) y [catálogo candidato](catalog.proposed.json): generado por preview/apply; modo histórico, sucesor local no activado.
- [Resultados](results.json): seis simulaciones/replays, conciliación decimal, descuentos/piso y 32 diagnósticos comerciales.
- [Artefacto 40%](margin-40.artifact.json): frozen quote para explicar/replay.
- [Brief de comercialización pendiente](commercial-readiness.brief.json) y [artefacto](commercial-readiness.artifact.json): needs_input, sin totales.

Las seis sensibilidades mantienen costos del catálogo histórico y sus trial 25/25/100. Los escenarios especifican costo histórico por id para aislar el cambio de política; no usan el costo CO pendiente. Todos calculan/requires_review (exit 3).
El costo CO pendiente y catorce recursos de revisión son destinos de evidencia. No se interprete su moneda/unidad provisional como selección aprobada. La nueva propuesta de pricing debe elegirse explícitamente; si falta selección, la CLI indica ambigüedad.

```bash
pnpm --silent pricing:v3 catalog validate --catalog data/pricing/v3-pilot/economics/commercial-policy-proposal/catalog.proposed.json
pnpm --silent pricing:v3 quote --catalog data/pricing/v3-pilot/economics/commercial-policy-proposal/catalog.proposed.json --input data/pricing/v3-pilot/economics/commercial-policy-proposal/margin-40.brief.json --out /tmp/mi-ensayo-politica-v3.artifact.json
pnpm --silent pricing:v3 explain --input /tmp/mi-ensayo-politica-v3.artifact.json
pnpm --silent pricing:v3 replay --input data/pricing/v3-pilot/economics/commercial-policy-proposal/margin-40.artifact.json
pnpm --silent pricing:v3 prepare --catalog data/pricing/v3-pilot/economics/commercial-policy-proposal/catalog.proposed.json --input data/pricing/v3-pilot/economics/commercial-policy-proposal/commercial-readiness.brief.json
```

`--out` exige ruta nueva. Último comando devuelve código 2: catálogo sólo simulación, fuente salarial/recursos pendientes y fuentes/políticas no comerciales. Export del ensayo permanece bloqueado. La lista incluye diagnósticos técnicos y estados de evidencia, no 32 decisiones de negocio distintas.

Los importes de research no hidratan el catálogo automáticamente. Finance/Operations valida costo localizado y normaliza drivers como registros de una nueva versión; Commercial/práctica revisa margen/alcance. Para activar, seguir el contrato de mantenimiento y el proceso comercial canónico; no basta cambiar mode/status.

La propuesta genérica de sensibilidad 40%/35% no reemplaza pisos vigentes por práctica: Creative Practice
conserva 45% bruto aprobado. El flujo posterior `compose assess` devuelve gaps, no aprueba esta policy ni una
excepción. Estos artefactos se conservan para comparar; nuevas fuentes de licencia y capacidad se seleccionan
en versiones nuevas, sin recalcularlos in-place.
