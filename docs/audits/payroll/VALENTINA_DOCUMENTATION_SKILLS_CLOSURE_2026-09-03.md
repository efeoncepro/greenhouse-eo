# Valentina — cierre documental y skills

- Fecha: 2026-09-03.
- Alcance: sincronización documental solicitada después de la recuperación y release. Tres subagentes con
  ownership separado y revisión integradora; sin otra mutación de datos, permisos, flags ni deployment.
- Evidencia operativa: [auditoría de recuperación](VALENTINA_REHIRE_IDENTITY_RECOVERY_2026-09-03.md).
  Los readbacks fechados de esa auditoría no sustituyen una consulta futura del estado vivo.
- Contrato aceptado: [decisión de reingreso](../../architecture/GREENHOUSE_WORKFORCE_REENTRY_RECOVERY_DECISION_V1.md).

## Cobertura por dueño

| Dueño | Documentos y skills actualizados | Contrato preservado |
|---|---|---|
| Workforce / Talent | ADR de reingreso, arquitectura de offboarding, invariantes Payroll, runbook `workforce-reentry-recovery`; SKILL y referencias Payroll/Talent en `.codex` y `.claude` | Predicado compartido vigente, fechas inclusivas, reingreso por perfil/member, autoridad más estricta del command compensatorio, snapshot/locks/idempotencia, atomicidad, auditoría/outbox y readback de consumidores |
| Identity | Invariantes Identity/Workforce, `GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1`, runbook SCIM | Misma identidad longitudinal, acceso separado de disponibilidad/contrato, links canónicos y transacción PostgreSQL de `updateMember`, proyección legal sin resurrección; retiro de receta aislada de UPDATE |
| Contractors / Finance | Arquitectura engagements/payables; docs HR compensación, onboarding, lifecycle, self-service y flujo completo; docs y manual Finance; manual HR | Bruto frente a acuerdo neto, snapshots no retroactivos, proporcional autorizado por período, PK frente a ID público, boleta/readiness y separación entre payable/obligación/orden/settlement |
| Finance skills | SKILL, runtime-map y nueva referencia `contractor-compensation-reentry.md`; nuevo bundle Claude completo | Mismo contrato operativo en ambos agentes, con `greenhouse-finance-accounting-operator` añadido al gate byte-identical |
| Release / QA | Arquitectura control plane, runbook, playbook de incidentes, manual y documentación funcional; skills Release/QA y referencia runtime-rollout en ambos agentes | Un coordinador, intentos/eventos correlacionados, cancelled no equivale a success, terminal abortado exige intento nuevo, reparación de datos separada del release; bug SHA/run ID todavía pendiente |
| Arquitectura transversal | Router de `software-architect-2026` y overlay Claude `arch-architect` | Descubrimiento dirigido a ADR/runbook/especialistas; sin duplicar el modelo de dominio |
| Continuidad | TASK-1349, TASK-1814, índices docs/tasks/audits, auditoría de Valentina, project_context, Handoff y changelog | Recuperación/release cerrados; UI y Finance con progreso honesto; no prescribir SQL retirado ni repetir recoveries reales |

Hiring/ATS, objetos de Person 360, roles/capabilities y catálogo de herramientas no introdujeron nuevos
contratos en esta entrega documental: se revisaron sus fronteras y se reutilizaron los dueños existentes.
No se añadió un endpoint ni una UI de restauración. AGENTS ya enruta a los especialistas pertinentes y no
requiere copiar en raíz los contratos desarrollados en ADR/invariantes.

## Paridad entre agentes

Finance, Release y Talent pasan el gate de mirrors del repositorio. Finance tiene cinco archivos idénticos.
Payroll conserva diferencias históricas ajenas a esta entrega (por ejemplo, checklist PREVIRED); los bloques
Offboarding/Reentry se sincronizaron sin borrar contenido. QA conserva instrucciones locales de cada agente;
su referencia `runtime-rollout.md` es idéntica. Arquitectura usa dos overlays distintos con el mismo destino
canónico, no bundles que se pretendan byte-identical.

## Límites que deben seguir visibles

- Valentina tiene un nuevo episodio contractor activo desde 20/08; el anterior termina sus servicios al
  30/05/2026 y conserva sus pendientes financieros. El employee histórico tiene su propia fecha final.
- El acuerdo es 450.000 CLP líquidos mensuales; agosto usa 12/31 por confirmación expresa del operador.
  No hay prorrateo automático nuevo ni resolución de ID público añadida al formulario off-cycle.
- EO-CPAY-0002 conserva el bloqueo por boleta. La reparación no creó obligación, orden ni transferencia de agosto.
- SSO elegible no demuestra un login interactivo; esa prueba no se realizó.
- TASK-1814 sigue sin implementación/validación UI. La recuperación ya aplicada no se repite para probarla.
- El defecto de correlación de releases por SHA antes de run ID sigue documentado en el playbook y auditoría;
  la coordinación de un solo operador es una mitigación, no un fix del reconciliador.

## Validación documental

- `pnpm skills:mirrors`: correcto, incluido el nuevo espejo Finance.
- `pnpm mcp:skills:check`: catálogo vigente, sin regeneración necesaria.
- `pnpm task:lint --task TASK-1349` y `TASK-1814`: cero errores y advertencias.
- Enlaces relativos de los lotes Workforce/Contractors/Release y revisión de paridad local: correctos.
- `pnpm docs:closure-check`: aprobado; dos advertencias previas sobre tamaño de las arquitecturas Contractors y Release.
- El gate de contexto detectó exceso de presupuesto: se redujo el pointer durable y se rotó historial sin
  pérdida antes de repetir el chequeo estricto. No se requiere otro build ni prueba que escriba en base por esta sincronización.
