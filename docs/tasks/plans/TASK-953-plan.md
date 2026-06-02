# TASK-953 Plan — Greenhouse Visual Capture Evidence Hardening

## Discovery

- Runtime real confirmado: GVC vive en `scripts/frontend/` con DSL tipado en `lib/scenario.ts`, recorder en `lib/recorder.ts`, manifest v1 en `lib/manifest.ts`, review/diff/health CLIs y scenarios bajo `scripts/frontend/scenarios/`.
- La spec sigue vigente, con drift positivo: TASK-796 ya promovio rutas runtime `/my/contractor` y `/hr/contractors`, por lo que baseline mockup -> runtime se puede documentar y probar con contractor.
- No hay PR ni branch activo para `TASK-953`. El operador pidio mantenerse en `develop`, por lo que no se crea branch aunque la task declare `task/TASK-953-gvc-evidence-hardening`.
- Access model: no cambia `views`, `entitlements`, `routeGroups` ni startup policy. Es tooling local/agent-facing.
- ADR: existe ADR/spec aceptado `GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`; esta task lo extiende con Delta V1.4. No requiere ADR dedicado nuevo porque no cambia runtime productivo ni access model.
- Skills: `greenhouse-task-planner` para lifecycle/plan y `greenhouse-agent` para operar el stack del repo. No se usan subagentes porque los archivos están fuertemente acoplados y el cambio es de una primitive compartida.

## Audit

### Supuestos correctos

- `hold` y `wait selector` no prueban readiness real.
- El manifest v1 no tiene findings, taxonomy ni report HTML navegable.
- Multi-viewport todavía depende de corridas separadas o `--device`.
- Los scenarios de microinteractions existen, pero la evidencia se expresa manualmente como `hover/sleep/mark`.

### Supuestos desactualizados o refinados

- El scenario contractor runtime de referencia ya puede apuntar a ruta real porque TASK-796 completó las pages runtime.
- El cierre debe preservar scenarios V1, no forzar migración inmediata de todos los scenarios existentes.

## Plan

1. Extender el DSL de forma aditiva: readiness, assertions, interaction step, viewports, baseline metadata y validation rules.
2. Extraer primitives runtime pequeñas: failure taxonomy, readiness/assertions runner, quality guard de screenshots, report HTML estático y manifest enrichment.
3. Actualizar `capture.ts` para ejecutar variantes multi-viewport sin romper el manifest legacy: mantener campos top-level v1 y agregar `variants`/`qualityFindings`/`reportHtml`.
4. Evolucionar `review.ts`, `diff.ts` y `health.ts` para consumir findings/taxonomy.
5. Agregar regression scenarios: readiness/assertions/report, microinteraction V2, multi-viewport y contractor runtime baseline.
6. Sincronizar docs vivas y cierre de task con validaciones focales.

## Checkpoint

Derivado por `TASK_PROCESS.md`: `P2` + `Effort Alto` => `human` checkpoint. En esta sesión el operador pegó instrucción explícita de implementación y de mantenerse en `develop`; se continúa con ejecución local-first, sin push remoto automático.
