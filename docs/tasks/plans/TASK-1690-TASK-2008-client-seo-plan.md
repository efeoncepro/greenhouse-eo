# Plan — TASK-1690 foundation + TASK-2008 UI cliente

2026-10-05. Opción1 corregida seleccionada por «Ok construyamosla».
Código aún no iniciado: `/goal` propuesto al operador, pendiente de confirmación; luego hooks.

## Discovery summary

Reusar discovery2026-10-04 revalidado: DTO sin cobertura/metrics, GSC corta rank/gap, UI calcula
posición desde rank con etiqueta GSC, previous confunde cero real y ausencia. WIP2007 en índices
preservado. AEO ya existe: readClientGraderReport es reader client-safe por org independiente;
readSeoAeoGap retorna no_seo_data antes de leer AEO si falta GSC. El resumen AEO requiere lectura
canónica propia, no inferir disponibilidad del producto desde disponibilidad del cruce.

## Goal recomendado

Construir opción1 corregida en Greenhouse: contrato/estados TASK-1690 y consumer TASK-2008,
SEO/AEO independientes; pruebas, tipos/build, desktop/390px y QA visual premium. Sin push/deploy;
si falta verificación desplegada, dejar code complete, rollout pendiente. Mantener checkout/branch
existentes. No confirmar ni ampliar permisos por inferencia.

## Placement / ADR / access

Adapter client/overview y readers existentes; browser sólo DTO. Sin nuevo pool/migración/package.
ADRs SEO/SearchVisibility, FullAPIParity, CompositionShell y modular decomposition existentes.
Preservar sesión/tenant/routeGroup/capability/module. Brecha view revocation requiere issue/canary
propios antes de release; no mezclar cambio de auth con adapter/UI sin intake/hook.

## Slice ordering

1. TASK-1690: tipos browser-safe/cobertura, fuente AEO client-safe independiente, composición
   con fallos separados y target resolution; preservar campos legacy. Cero previo se corrige en ownerGSC.
2. TASK-1690: fixtures/selector autenticado, matriz fuentes/errors/zero/previous/ambiguous;
   guard de atribución y selección según orden canónico1700, sin nuevo scoring/fallback local.
3. Verificar contrato local; registrar evidencia del slice que desbloquea TASK-2008 sin esperar
   cierre de rollout completo. Ejecutar hookUI sólo tras declarar ese desbloqueo real.
4. TASK-2008: hoja GSC+AEO, chart real de observaciones, fuentes/copy/cortes y estados por región;
   tabs existentes y navegación coverage/SEO×AEO, report legacy compatible.
5. QA/tests/tipos/build; GVC desktop390/foco/reduced motion por familia; source vs runtime mismo
   viewport. Revisar imágenes, corregir P0/P1/P2, dossier/scorecard/design-qa.
6. Continuidad documental, gates y frontera release. Sin close/push/deploy automáticos.

## Verification

Tests de readers/DTO y no leakage; cero medido/sin filas/densidad/frescura separados; paridadCTR
contra reader y preservesprevious; AEO-only a pesar de no GSC/rank; readiness/flow/motion; typecheck
build local; GVC sin scroll horizontal, teclado/foco, source fidelity, promedio≥4.5 y críticas≥4.5.
No meter datos cliente en fixtures. Sin providers/captura pagada ni nueva emisión de informes.

## Subagent strategy

Discovery anterior delegado y consolidado. Implementación secuencial por root: la autorización de
subagentes del discovery no se amplía a editar código en este pase. Otros agentes/WIP se preservan.

## Closure boundary

Backend y UI requieren evidence propia. Code complete local no certifica rollout, cliente real,
permisos revocados, freshnesslive o calidad de producción. Release/canary quedan explícitos.
