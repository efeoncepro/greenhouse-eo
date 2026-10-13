# Pricing workbook CLI — verificación local 2026-10-09

## Resultado

PASS local: alternativa de costeo por CLI sin UI/DB, extracción completa y escenarios editables.
No se diagnosticó/reparó la UI del portal; no se modificaron motor, catálogo, seeds, payroll,
cotizaciones, HubSpot ni archivos del Excel. No hay nuevo despliegue o importación remota.

## Alcance y autoridad

El operador pidió extraer su Excel para agentes y aclaró que necesita una alternativa porque
el motor/UI actuales no le han servido. Implementación local reversible en scripts/commercial.
ADR y tres capas documentales declaran la separación entre costo histórico, costos declarados
por el operador y precio comercial aprobado. Escenarios nunca otorgan aprobación.

## Evidencia del libro

- Fuente: `data/pricing/efeonce-pricing-model-v1.xlsx`.
- SHA256 antes/después: `68a0c361e7ec3b188419cc5d5c7b758419e4d4d499eba5d9242b3f78a1c78d1b`.
- 13 hojas; 3.110 celdas capturadas; 1.480 fórmulas.
- Comparación independiente con openpyxl: 0 diferencias de valor/fórmula, 0 celdas no vacías faltantes.
- Hijos combinados conservan `mergedTo` y null; no duplican el master como input independiente.
- 32 roles conciliados con sus inputs y recargos; sin drift aritmético de roles.
- No hubo recálculo general de fórmulas: resultados cacheados se conservan explícitamente.
- Audit detecta tiers incompatibles, Factor País/Tiers desconectados, addons no incorporados,
  horas laborales frente a horas vendibles y cuatro servicios con cero no validado como tarifa.

## Pruebas y checks

- `pnpm --silent pricing:workbook:test`: 23/23 PASS.
- ESLint focal de adapter/módulo/tests: PASS tras aplicar formato del repo.
- CLI real: export, audit, role, search, scenario, estimate y compare ejercitados por pruebas/smokes.
- Casos negativos: null, texto, costo negativo, margen inválido, capacidad excedida, costo nuevo
  sin fuente/fecha, campos desconocidos, setup sin amortización, drift de archivo, caché divergente,
  output existente y symlink al Excel. JSON stderr/exit coherentes; archivo original preservado.
- Margen sobre venta concilia con costos y comisión redondeada; dedicado absorbe el mes completo.
- Plan multirol aplica gastos/margen una vez; costos sustituidos conservan fuente y fecha.
- `qa:gates --changed --agent codex` scoped: tooling/docs; Finance audit adicional por aritmética.
- Skills pricing Codex/Claude: nueva sección CLI idéntica; cuerpos previos conservan diferencias existentes.
- Task lint focal y cierre documental scoped: 0 errores/advertencias.
- Context check strict: 0 errores/advertencias; root docs dentro del presupuesto.
- Ops lint: sin errores; 5 warnings de tasks y 14 de epics ajenos, conservados.

## Límites prácticos

Los JSON de examples son hipótesis, no costos actuales comprobados. La reserva de Talent Assurance,
capacidad vendible y venta de remanente deben validarse por caso. No se calculan impuestos/FX actuales
ni gastos omitidos. Los planes son costeo local y no documentos comerciales emitidos. El cálculo
del portal no cambia y su problema de usabilidad sigue sin diagnóstico en esta unidad.

## Referencias

- [Manual](../../manual-de-uso/finance/consultar-excel-pricing-por-cli.md)
- [Funcional](../../documentation/finance/pricing-workbook-cli.md)
- [ADR](../../architecture/GREENHOUSE_PRICING_WORKBOOK_AGENT_CLI_DECISION_V1.md)
- [Task](../../tasks/complete/TASK-2015-pricing-workbook-agent-cli.md)
