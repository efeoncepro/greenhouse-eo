# TASK-2015 — Plan de extracción y consulta del Excel de pricing

- Solicitud: «hacerlo o extraerlo a algo más accesible para agentes… en una CLI».
- Priority P2, Effort Medio: checkpoint auto; ejecución secuencial, sin subagentes.
- Descubrimiento: Excel histórico de 13 hojas; seeds CSV existentes; motor vigente
  `src/lib/finance/pricing/pricing-engine-v2.ts` usa margen sobre venta y costos gobernados.
- Decisión: herramienta local de evidencia histórica, nunca fuente alternativa del catálogo vigente.
  Consulta sin DB/credenciales; export explícito JSON; Excel original y seeds intactos.
- Acceso: acceso al checkout interno; contenido sensible comercial no se publica por API/MCP.
- ADR: [contrato local](../../architecture/GREENHOUSE_PRICING_WORKBOOK_AGENT_CLI_DECISION_V1.md).

## Ejecución

1. Extraer todas las hojas con valores, fórmulas resueltas, resultados cacheados, coordenadas y SHA256.
2. Proyectar roles y habilitar summary/search/role/sheet/audit/scenario/export en JSON.
3. Escenarios USD hipotéticos con margen explícito, horas vendibles, dedicación, gastos y setup.
   No sustituir datos ausentes por costos reales cero ni aprobar precios.
4. Probar contra el Excel y casos adversos (faltantes, drift, capacidad, parámetros y salida JSON).
5. Documentar arquitectura, función, manual, skills espejo y verificación local; cierre de task.

## Límites y QA

Sin cambios a motor, DB, payroll, seeds, cotizaciones o HubSpot; sin despliegue.
ExcelJS existente se carga sólo en export; scripts fuera del grafo del portal.
Tests Node focales, smoke CLI, integridad por hash, lint scoped, task/docs/context gates.
Rollback: retirar archivos/alias nuevos; no hay estado remoto que revertir.
