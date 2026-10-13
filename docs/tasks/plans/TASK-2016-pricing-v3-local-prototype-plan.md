# Plan TASK-2016 — Pricing V3 local

- Date: 2026-10-09.
- Checkpoint: auto-aprobable P2/Medio conforme a TASK_PROCESS; alcance local, ejecución secuencial sin delegación.
- Authorization: operador aprobó modelo/contrato y pidió «avanza con lo que sigue»; primer escenario comercial Colombia → Chile. No autoriza migración, precios nuevos, envío ni despliegue.

## Discovery

V2, simulate schema, redactor y commands existen. TASK-346/464d/1211/1212 están complete en filesystem aunque algunas filas legacy del registry estén stale; no se reabren. TASK-2015 es el lector histórico completo, no owner del nuevo motor. TASK-2016 libre contra registry/filesystem al registrar.

El catálogo piloto tiene variantes HubSpot separadas, Salesforce sin costo y costos/FX históricos sin país efectivo. Esto bloquea cotización vigente, no desarrollo con fixtures declarados. El módulo recibe snapshots; no se usa el Excel en ejecución.

## Skills / architecture

Software Architect, Pricing Operator y Finance para separación de costo/precio/moneda; Task Planner para registro, QA Release Auditor y Documentation Governor para cierre. ADR local `GREENHOUSE_PRICING_V3_LOCAL_PROTOTYPE_DECISION_V1.md`; ADR Quote API Parity intacto.

## Plan

1. Contrato estricto y cálculo puro con decimales: resolver perfiles, costos/unidades/políticas explícitos; estados de faltantes/invalid/review. Nombres de perfil no resuelven variante ambigua por precio.
2. Servicio/snapshots y proyección: digest, explicación/comparación/replay, costos separados y export cliente con allowlist.
3. CLI delgada y fixtures sintéticos completos, caso Colombia→Chile incompleto y discovery del catálogo piloto. Manual y ejemplos de uso.
4. Casos focales y smoke del núcleo/CLI, gates estáticos, QA/documentación y cierre de la unidad local.

## Placement

`src/lib/finance/pricing-v3/` dominio reusable, sin consumidores del portal; CLI en scripts. Núcleo y schemas browser-safe; adapter de digest/archivos local Node explícito. Dependency decimal directa, sin nuevo deployable ni paquete de dominio. No se toca source of truth canónico ni permisos.

## Verification / rollout

Baseline lint y tipos antes de código; pruebas independientes y tests focales del cambio, tipos/lint y checks de task/QA/docs. Validar money rounding, FX, faltantes, privacidad, variantes y replay/tamper. Local únicamente; ningún resultado sintético/histórico se declara tarifa operativa.

## Risk / rollback

Datos ausentes o incompatibles no se sustituyen; zero/not_applicable requieren cobertura. No magia country/currency. Entradas incorrectas no imprimen secretos. El snapshot guarda contenido y versión. Retirar los archivos/alias nuevos deshace la etapa; catálogo y cotizaciones canónicas intactos. P2/Medio describe esta vertical local acotada, no la integración financiera productiva, cuyo rigor y esfuerzo se determinarán aparte.
