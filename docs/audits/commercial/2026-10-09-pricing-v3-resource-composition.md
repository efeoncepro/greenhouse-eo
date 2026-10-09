# QA local — composición de recursos V3, 09/10/2026

[TASK-2021](../../tasks/complete/TASK-2021-pricing-v3-demand-resource-composition.md) y
[manual ejecutable](../../manual-de-uso/finance/componer-cotizacion-v3-con-herramientas.md).

Estado: implementación local verificada. Dominio puro y adapter/CLI; sin API, UI, DB, inventario live,
compra, envío, publicación o aprobación comercial. TASK-2017 conserva economía parcial.

## Evidencia de cálculo

- Suite V3: 108 tests en cuatro archivos, incluidos 19 de composición; regresión legacy verde.
- Typecheck `pnpm exec tsc --noEmit --pretty false`: exit0. ESLint focal y formato de los seis archivos TS: exit0.
- Tres `compose quote`: exit3, calculated/requires_review. Tres replay congelados y replay legacy: verified, exit3.
- `explain` del diseñador conserva fuente, selección, atribución, provisiones y presupuesto de créditos.
- Conciliación independiente Python Decimal: suma de shares por línea igual al share del servicio;
  suma de costos asignados igual al costo atribuido; atribuido + no asignado igual al costo mensual completo.
- Escribir sobre artifact existente falla (exit1); replay posterior sigue verified. Export comercial bloqueado,
  sin archivo de salida. Artifacts locales 0600/wx; ningún quote histórico alterado.

| Ensayo de un mes | Costo USD | Neto simulado USD |
| --- | ---: | ---: |
| Redactor SEO | 1.038,00 | 1.297,50 |
| Diseñador | 996,78 | 1.295,81 |
| Servicio SEO multirol | 2.048,40 | 2.945,22 |

Fixtures y artifacts en [v3-composition](../../../data/pricing/v3-composition/README.md).
Higgsfield del diseñador: 1.000 créditos, 400 de cuota asignada, 600 adicionales en packs500+100;
USD32,25 adicionales + USD18,53 de cuota atribuida = USD50,78 integrados al costo.
Neto usa policy histórica; impuestos indeterminados y setup/provisiones de prueba. No es tarifa vigente.

## Negativos y fronteras

Tests cubren tareas/perfiles desconocidos, slots/contrato mínimo, no descuento implícito por FTE,
identidad repetida entre funciones, pool IA agregado antes de compra, driver/share, precios pendientes sin
fallback, anualidad/caja, FX explícito, meses/vigencia, conciliación de decimales y tampering.
Selección IA requiere justificación. Policy inicial soporta Copywriter, diseñador senior y SEO Specialist.
Resto exige reglas propias. Magnific requiere EUR y FX en catálogo; la tasa1,1 del test es sintética.

Asignaciones de ejemplos son hipótesis declaradas, no cartera ni permisos medidos. Claude usa referencias
públicas, no factura Efeonce. Adobe actual conserva pendiente de cobertura/base/fecha; ensayo usa histórico.
No hay reserva global de créditos o seats entre quotes. `managed_service` preserva unidad comercial;
su cálculo histórico por capacidad interna no valida alcance, precio o contrato de un servicio.

## Gates y alcance

`qa:gates --changed --agent codex --task TASK-2021` se usó como router: Finance y Documentation cargadas.
El e2e de Finance/DB no aplica a este dominio local opt-in: no cambian readers canónicos, ledger, HTTP,
permisos, migraciones o UI. No se presenta como gate ejecutado. QA equivalente: kernel/adapter/CLI y replay.
Task lint errors0/warnings0; ops lint exit0 con19 warnings de paridad preexistentes ajenos; mirrors exit0.
Closure exit0 con dos avisos advisory: project_context fue revisado y conserva el enlace vigente V3 al índice
actualizado; Handoff/changelog/skills se sincronizaron. Contexto strict exit0, errors0/warnings0, tras el cierre documental.

Trabajo ajeno de línea gráfica y stack-v13 de Pibank preservado, fuera del commit. Fuentes Excel,
catálogo histórico y artifacts previos permanecen intactos. Extracción canónica/API parity es follow-up.
