# ISSUE-179 — El composer contractor envía un período localizado como fecha SQL

## Ambiente

Producción, `/my/contractor`; corrección local pendiente de release.

## Detectado

2026-10-05, captura del operador: Valentina Hoyos inicia sesión con su cuenta corporativa y recibe «No se pudo completar la operación del engagement contractor» al intentar presentar la boleta.

## Síntoma

No hay un nuevo envío persistido para septiembre/octubre. El formulario precarga `scenario.servicePeriod`, una etiqueta humana, y la transmite como `servicePeriodStart`.

## Causa raíz

Defecto confirmado del contrato formulario/command: `formatServicePeriod` produce `20 ago - 31 ago 2026`; `ContractorSubmissionComposer` usa ese texto como fecha y el writer lo castea a `$5::date`. Una consulta SELECT de solo lectura contra PostgreSQL reproduce `22007`. No se obtuvo el payload del intento concreto: las consultas de logs Vercel agotaron su presupuesto y el lector local de Sentry no tiene token. La atribución del incidente individual sigue siendo hipótesis de alta confianza.

## Impacto

El envío nuevo falla antes de guardar el trabajo; no puede avanzar a payable. La contratación actual EO-CENG-0002 está activa. Este defecto no requiere alterar su identidad, tarifa ni pagos anteriores.

## Solución

Fase inicial issue-only, ampliada a ISSUE + TASK-2009/2010 por la auditoría general: capturar fechas explícitas mediante controles de fecha, validar fechas ISO y orden del período en el command canónico antes de SQL, conservar validación en edición de borradores y mostrar errores de dominio accionables. No inferir fechas nuevas desde el envío anterior. ADR existente: GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1; sin cambio de schema, acceso ni fuente de verdad.

## Verificación

- SELECT con etiqueta localizada: error PostgreSQL `22007`, sin escrituras.
- Reader vigente: contratación activa; último envío EO-CWS-0004 de agosto, sin envío nuevo.
- 188 tests PASS en `src/lib/contractor-engagements` (incluye fechas localizadas/imposibles, rango invertido, nullable histórico, creación antes de DB y edición contra fin existente). Lint focal y TypeScript global PASS. La regresión de creación falla sin el guard y vuelve a pasar al restaurarlo. `docs:closure-check` PASS.
- GVC local del componente real sobre fixture anónima, desktop 1440×1000 y mobile 390×844: `.captures/2026-10-05T20-26-38_issue179-local-check/`; ambos PNG inspeccionados. El harness temporal fue retirado.
- Browser fixture: fechas nuevas vacías, validación visible sin request, payload ISO de inicio/fin y monto derivado conservado; POST interceptado, cero escrituras reales. Evidencia `.captures/issue179-interaction/evidence.json`.
- `qa:gates --changed --agent codex`: bloqueos de cierre de licitaciones ajenas en el checkout compartido; no se modifican ni se silencian.
- Pendiente: release/readback de un envío real. No se declara recuperada producción.
- No usar la identidad de Valentina para un canary ni generar un cobro/pago sin autoridad explícita.

## Estado

open — defecto corregido y validado localmente; sin push ni release. Intento individual sin payload/log confirmado.

La [auditoría general de contractors del 05/10](../../audits/payroll/CONTRACTOR_FLOW_PRE_RELEASE_AUDIT_2026-10-05.md) encontró ocho defectos adicionales. Por la autorización «Corrígelos todos», TASK-2009 y TASK-2010 implementan las correcciones comunes de monto/scope, transacción y reintentos, soporte por período, órdenes/cascade/cancelación/parciales y CTA. 314 pruebas PASS, SQL real de sólo lectura con diez casos ficticios PASS, GVC premium desktop/mobile PASS. Lint/TypeScript PASS. Sigue open porque faltan release y readback productivo, y el único drift histórico requiere el plan de recovery separado. No se alteraron pagos ni personas reales.

## Relacionado

- `src/views/greenhouse/contractors/ContractorSubmissionComposer.tsx`
- `src/lib/contractor-engagements/work-submissions/store.ts`
- `src/lib/contractor-engagements/self-service-scenario.ts`
- `docs/manual-de-uso/hr/contratistas.md`

Revisión adicional solicitada por el operador: dos bordes de replay corregidos; 321 tests focales PASS, suite global 18.007 PASS/uno FAIL de SVG AXIS ajeno/48 skipped, y TypeScript/lint/build/workers PASS. Evidencia: `.captures/contractor-regression-review-2026-10-05/verification.json`. El estado sigue open por release/canary/recovery pendientes.

Segunda revisión solicitada («vuelve a revisar tu trabajo»): R03–R06 corregidos para todos los contractors; concurrencia confirmada en PostgreSQL local aislado, tarifa/snapshot coherentes, período editado por HR protegido y cantidad limitada a la precisión real del schema. 333 pruebas focales y build/lint/workers PASS; suite global final 18.014 PASS / un FAIL ajeno de SVG AXIS / 48 skipped. Evidencia: `.captures/contractor-review-2-2026-10-05/verification.json`. El issue continúa open por rollout pendiente.
