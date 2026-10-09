# Plan TASK-2019 — Catálogo, selección y mantenimiento V3

Aprobado por el operador 2026-10-09: «apruebo todo ... contrato de mantenimiento ... Vamos». El plan concreta los seis pasos ya presentados; no requiere nueva autorización ni /goal (el pedido no menciona TASK).

## Discovery

TASK-2016 kernel completo. CLI catalog sólo busca seis perfiles review_only. No selección/versionado. TASK-2017 vigente económico pendiente, TASK-2018 sólo reconciliación. Código nuevo local sin DB ni UI. Shared checkout develop; cambios gráficos/PDF ajenos preservados.

## Architecture and contracts

Catálogo local JSON de registros tipados con id, procedencia/estado y vigencia; versiones inmutables. Perfil separado de costo país, recursos, kit y políticas. Brief explícito, sin precios inline; resolver produce snapshots y bindings por período. Orquestador invoca kernel existente sin duplicar pricing, congela catálogo/brief/selección/resultados. Salida interna explica componentes, fuente y asignación. Replay usa contenido congelado, no catálogo actual.

Mantenimiento: add/replace/retire por id, fecha efectiva, motivo/actor/fuente; comparación de base por digest; preview de cambios e impacto por recalcular briefs; apply exige digest del preview, escribe archivo nuevo con wx. Sin lectura remota, job o actualización de contratos. Las estimaciones históricas se mantienen como tales.

## Slices

1. Contrato catálogo/brief/cambio, ADR y seed histórico desde JSON/CSV existentes.
2. Readers/resolvedor/kits/calendario mensual y quote/explicación congelada.
3. Update preview/apply, conflict/fechas/diff y audit de nueva versión.
4. CLI, pruebas independientes y ejemplos diseñador/Pibank por selección.
5. Manual, contrato mantenimiento, QA/cierre y commit sólo propio.

## Quality / concerns

Finance: sin costos implícitos ni duplicación; margen vs markup explícito. Operations: seats no siguen FTE sin política, shared por consumidores explícito, upfront una vez. Agente: ambiguos/faltantes accionables, catálogo consultable. Continuidad: quote anterior se reproduce tras aumento; cambios futuros no mutan padre. Datos: moneda/país/unidad/fechas tipados, faltantes null.

## Subagent strategy

Sequential. El operador no pidió subagentes; cuatro superficies estrechamente acopladas, sin delegación.

## Skills

software-architect-2026: contratos/boundaries/ADR; efeonce-pricing-operator + greenhouse-finance-accounting-operator: reglas/evidencia económica; greenhouse-task-planner: registro formal; greenhouse-documentation-governor: manual/cierre; greenhouse-qa-release-auditor: pruebas/veredicto.

## Verification

Vitest kernel+catálogo, lint focal/typecheck, CLI prepare/quote/explain/replay, actualización+impacto+conflicto+replay viejo. Ejemplos históricos no validan salarios/providerprices. Pibank demanda sin provisiones del expediente convertidas en tarifas; faltantes visibles.

## Rollback / limits

Retirar nuevos módulos/datos/comandos; no rutas API/V2/CRM/migraciones. Integración canónica y tarifas operativas pendientes. Futuros HTTP/UI/MCP consumen estos primitives; parity live no se declara.
