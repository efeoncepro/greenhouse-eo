# EPIC-043 — Payroll Reliability and Agentic API Parity

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `12 tasks nuevas TASK-1816–TASK-1827 registradas; cuatro briefs históricos cerrados por supersesión; sin implementación ni rollout`
- Rank: `1`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `develop; checkout compartido; sin ramas ni worktrees por task`
- GitHub Issue: `none`

## Summary

Hacer confiable el ciclo de nómina y operable desde el portal, Nexa, Codex y Claude mediante los mismos commands
canónicos: preparar, calcular, revisar, aprobar, cerrar, generar PDFs y enviar comunicaciones con resultado
verificable. El epic reúne las auditorías de integridad y full API parity del 2026-09-03, incorpora trabajo
existente y separa recuperación financiera, autorización, documentos, correo y experiencia de uso.

No se implementa directamente este epic. Cada unidad se ejecuta como task propia, con plan, gates y cierre operativo. La creación del epic no autoriza pagos, envíos, cambios de
grants, migraciones financieras ni deploys.

## Why This Epic Exists

Payroll tiene APIs, generadores y commands, pero las pruebas encontraron recálculo parcial que conserva
aprobación, versiones exportadas sobrescritas, obligaciones residuales, efectos repetibles y resultados de
PDF/email que no expresan todos los fallos. No hay herramientas Payroll en MCP interno ni gateway; Nexa
dispone de lectores pero no de acciones Payroll. Exponer estas rutas sin endurecer su contrato trasladaría
los problemas al chat.

El backlog tenía cuatro briefs parciales con supuestos anteriores a esta auditoría. Por instrucción del
operador, TASK-731/1214/1215/730 se cierran por supersesión documental y se reemplazan por
TASK-1820/1821/1825/1827, respectivamente. `TASK-1625` conserva la coordinación de `ISSUE-129`–`ISSUE-134`.
Cerrar los briefs no significa corregir sus hallazgos ni certificar su implementación.

## Outcome

- El cálculo se publica completo y su aprobación referencia una versión precisa; los fallos y cambios
  concurrentes impiden exportar mezclas.
- Reliquidar conserva historia, obligaciones, órdenes y pagos; repetir un evento no repite el efecto.
- Los datos indispensables faltantes bloquean con explicación; los prorrateos y montos conservan período,
  régimen, moneda y procedencia.
- Una instrucción desde chat inicia un flujo recuperable, usa identidad y permisos reales y ejecuta los
  mismos commands que el portal. Confirmaciones vinculadas a período, versión, acciones y destinatarios.
- PDFs recuperables por acceso autorizado y comunicaciones con resultado por destinatario, diferenciando
  encolado, aceptado por proveedor y entregado. El chat puede retomar sólo lo pendiente.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md`
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/PAYROLL_LEGAL_DOCS_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Decisión pendiente antes del primer cambio estructural: ADR de publicación atómica del cálculo, versiones
aprobadas/exportadas y recuperación por operación. La lane delegada Payroll y su política de confirmación
requieren una decisión de acceso coordinada con identidad. Este documento no acepta esas decisiones por
anticipado. Mantener homes actuales y separar adapters de commands; no extraer servicios ni crear un motor
alternativo en el gateway.

## Child Tasks

**12 tasks nuevas: TASK-1816–TASK-1827, una por cada unidad U01–U12.** Las cuatro anteriores
quedan en `complete/` con resultado explícito de supersesión, conservando su historia. El orden de trabajo
lo define este epic y el `Rank`, no la antigüedad del ID.

| Unidad | Task / procedencia | Entregable y límite de ownership | Dependencia |
|---|---|---|---|
| **U01** | [TASK-1816](../../tasks/to-do/TASK-1816-payroll-atomic-calculation-and-version-bound-approval.md) | **Publicación atómica del cálculo y aprobación de versión.** Fallo parcial, carreras calculate/approve/close y precondiciones; `calculate-payroll`, writers y lifecycle. F7/F14. Primera implementación. | ADR acotado y reproducción base |
| **U02** | [TASK-1817](../../tasks/to-do/TASK-1817-payroll-adjustment-consistency-and-canonical-derivation.md) | Ajustes coherentes: derivación monetaria única, ceros válidos, validación cross-record y conservación de guardas. F13; no duplica el catálogo API de U06. | U01 para integrar writers; coordinación U06 |
| **U03** | [TASK-1818](../../tasks/to-do/TASK-1818-payroll-participation-effective-segments-and-calendar-integrity.md) | Vigencias/participación y permisos por mes: fallo de lectura no paga factor1 silenciosamente, segmentos intra-mes, calendarios independientes de TZ. F4/F5; F6 agrupado como dependencia del historial, no sobrepago demostrado. KPI/compliance conserva sus owners. | U01; contrato de fuentes vigente |
| **U04** | [TASK-1819](../../tasks/to-do/TASK-1819-payroll-immutable-reliquidation-and-finance-reconciliation.md) | Versiones exportadas inmutables, conciliación de obligaciones netas/retenciones e idempotencia de deltas Finance. F1/F2/F3/F8. Separar generated, scheduled, partially_paid y paid; no sobrescribir pagos ni cancelar órdenes genéricamente. | U01/U02 |
| **U05** | [TASK-1820](../../tasks/to-do/TASK-1820-payroll-stage-preflight-and-payment-readiness.md) — supersede TASK-731 | Preflight compartido por etapa y moneda; completar UF resoluble y preparación del pago/perfiles, sin «Sin bloqueos» ficticio. F12/F15. Reader puro; bloqueos oficiales siguen en command y UI pasa a U11. | U02/U03; coordinación U06 |
| **U06** | [TASK-1821](../../tasks/to-do/TASK-1821-payroll-canonical-commands-and-governed-api.md) — supersede TASK-1214 | Commands completos de aprobación/ajustes y API Platform Payroll: identidad, capabilities, errores, versión esperada, claves de intención y readback. Preservar grants operativos. No reemplaza atomicidad U01 ni implementa gateway. | U01/U02; dominio U03/U04 para cierre write |
| **U07** | [TASK-1822](../../tasks/to-do/TASK-1822-payroll-durable-operations-and-recovery.md) | Operación durable de Payroll: plan de etapas, correlación, estado y reanudación; el worker compone commands, nunca lógica dentro del LLM/gateway. Timeout no duplica efectos; status por etapa/entry/artifact. | U04/U05/U06 |
| **U08** | [TASK-1823](../../tasks/to-do/TASK-1823-payroll-document-generation-and-delivery-recovery.md) | Generación/descarga explícitas y dispatch por destinatario recuperable. D1–D4: resultados honestos, retry parcial, idempotencia del envío, enlaces privados y estado provider. Alinear modo portal/worker. No reconstruye aggregate legal ni cambia branding de EPIC-042. | U04/U06; integra U07 |
| **U09** | [TASK-1824](../../tasks/to-do/TASK-1824-payroll-mcp-delegated-operations-and-served-manual.md) | Provider/lane/tools MCP Payroll, permisos delegados, manifest, federación/exclusiones y skill operativa servida/espejada. Tools de lectura primero; writes sólo tras sus gates. No ampliar cliente público compartido ni implementar OAuth alternativo. | Lecturas U05/U06; writes U07/U08; compatibilidad `TASK-1813` y decisión de identidad |
| **U10** | [TASK-1825](../../tasks/to-do/TASK-1825-payroll-nexa-governed-complete-operations.md) — supersede TASK-1215 | Acciones Nexa sobre los mismos commands y operaciones; selección explícita de período, lecturas por moneda, propuesta/confirmación vinculada a versión y destinatarios. Reutiliza runtime existente; no promete todo con subset aprobado. | U05/U06/U07/U08 |
| **U11** | [TASK-1826](../../tasks/to-do/TASK-1826-payroll-period-consistency-and-operation-feedback.md) | Consumer UI separado: no mezclar períodos, refrescar período seleccionado, no ofrecer edición bloqueada, mostrar estado real/preflight. F9/F10/F11. Contrato UI, wireframe/flow, copy canónico y GVC; no rediseña Payroll entero. | U05/U06/U07; U08 para entregas |
| **U12** | [TASK-1827](../../tasks/to-do/TASK-1827-payroll-cross-client-e2e-and-operational-release-proof.md) — supersede TASK-730 | Pruebas E2E portal/API/Nexa/Codex/Claude, recuperación y cierre operativo. Fixtures locales primero; smoke autorizado con datos/recipientes de prueba, readback por etapa y revisión/reparación controlada de datos históricos afectados. | Todas las unidades obligatorias y dependencias externas necesarias |

Una sola task ejecutable posee cada unidad. `TASK-1625` no cuenta como decimotercera implementación:
sus issues se referencian y sólo se cierran con evidencia del arreglo. Las demás tasks relacionadas
conservan su ownership; sus contratos se integran sin absorber programas ajenos.

## Execution Order

1. **Empezar por TASK-1816 (U01 / ISSUE-130).** Preparar su plan y ADR acotado, integrar el repro ya verificado, y lograr
   que fallo en la segunda persona deje el lote anterior intacto o un estado no aprobable. Probar también
   el control exitoso, dos cálculos simultáneos y aprobación sobre versión cambiada. No empezar por MCP write.
2. U02 y U03 pueden diseñarse en paralelo; integrar secuencialmente los archivos compartidos de cálculo/store.
   U04 cierra historia y efectos financieros. El error F6 retirado impide usar «borrar entry vieja» como arreglo.
3. U05/U06 consolidan contrato de lectura y comandos. Avanzar `TASK-1813` en su carril paralelo, conservando su
   ownership. La ausencia de conectividad no debe bloquear las correcciones locales del motor.
4. U07/U08 hacen recuperables las etapas y comunicaciones. U09/U10 consumen ese contrato; lecturas MCP pueden
   adelantarse, pero ninguna escritura se habilita por tener el schema publicado.
5. U11 converge con el portal y U12 cierra contra runtime. Cada unidad lleva sus tests; U12 no posterga toda
   la verificación hasta el final.

Archivos compartidos `postgres-store.ts`, `calculate-payroll.ts`, catálogos de permisos, registry de proyecciones
y gateway se editan secuencialmente con ownership de slice. Subagentes sólo con alcance independiente; no
cambios de branch, worktrees ni despliegues como mecanismo de coordinación.

## Existing Related Work

- [TASK-1625](../../tasks/to-do/TASK-1625-payroll-correctness-and-operational-hardening.md) y
  [ISSUE-130](../../issues/open/ISSUE-130-payroll-calculation-non-atomic-period-race.md): coordinación e incidente
  inicial; conservar trazabilidad con ISSUE-129/131/132/133/134.
- [TASK-1214](../../tasks/complete/TASK-1214-payroll-full-api-parity-capability-governance.md),
  [TASK-1215](../../tasks/complete/TASK-1215-payroll-nexa-write-actionability.md),
  [TASK-731](../../tasks/complete/TASK-731-payroll-pre-close-validator.md),
  [TASK-730](../../tasks/complete/TASK-730-payroll-e2e-smoke-lane.md): cerradas por supersesión; sucesoras TASK-1821/1825/1820/1827, respectivamente.
- `TASK-940` gobierna readiness oficial con premisas de mayo que deben revalidarse; `TASK-1820` posee el preflight
  informativo que reemplaza TASK-731. U03/U05/U06 deben delimitar enforcement sin sustituirlos por un segundo gate divergente.
- `TASK-732` / `EPIC-009`: KPI/provenance; `TASK-896`: shadow compare; `TASK-414`: política de reapertura;
  `TASK-898`: participación en recibos; `TASK-868` / `EPIC-001`: aggregate legal del recibo. Sus epics primarios
  permanecen intactos; aquí son integración/relación, no hijas nuevas.
- `TASK-759d` y `TASK-759f`: timeline y señales de delivery; `TASK-1142`: prompts contextuales Nexa;
  `EPIC-042`: presentación de emails. No duplicar componentes, señales o branding.
- [TASK-1813](../../tasks/to-do/TASK-1813-efeonce-mcp-oauth-client-interoperability.md): compatibilidad OAuth
  Codex/Claude. `TASK-1631`: identidad/broker/grants; `TASK-658`: resource authorization bridge. Dependencias
  compartidas externas a las doce tareas. El hito obligatorio es delegación interna Payroll verificable
  (actor, scope, revocación y decisión de acceso), no el rollout B2B/WorkOS/Globe completo de TASK-1631.
- `TASK-756`: creación automática de órdenes. Fuera del alcance obligatorio: el epic no convierte cerrar
  nómina en ejecutar transferencias ni necesita auto-pagar para enviar un recibo.
- [Baseline de auditorías](../../audits/payroll/PAYROLL_RELIABILITY_API_PARITY_PROGRAM_BASELINE_2026-09-03.md).

## Exit Criteria

- [x] Las doce unidades tienen task dueña, alcance y dependencia registrada: TASK-1816–TASK-1827 declaran
  `Epic: EPIC-043`. Gates individuales `template=1 legacy=0 errors=0 warnings=0` y epic con strict-child-parity
  pasados el 2026-09-03; implementación y demás criterios siguen pendientes.
- [ ] F1–F5/F7–F15 y D1–D4 tienen regresión, corrección verificada o exclusión explícita justificada; F6 permanece
  reclasificado y multiversión/TZ tienen tratamiento comprobado, no borrado de sueldo previo por inferencia.
- [ ] Calcular, aprobar y exportar refieren una versión completa; ningún fallo parcial o carrera permite
  publicar mezcla. Ajustes con cero mantienen consistencia entre bruto, deducciones, retención y neto.
- [ ] Reexport/replay no duplican obligaciones, deltas ni envíos; historia y pagos existentes se conservan.
- [ ] Portal, API Platform, Nexa y MCP consumen commands/readers equivalentes. Cada capacidad está expuesta
  o excluida con razón; no hay writes sin reautorización de actor, entidad y acción.
- [ ] Codex y Claude Code completan el escenario aceptado con un cliente real y versión registrada. Si se
  declara soporte Desktop/claude.ai, cuentan con su propio smoke; no heredan el de Claude Code.
- [ ] Una corrida se retoma por ID y muestra resultados por etapa; un2xx no se transforma en «pagado» o
  «entregado». Assets privados recuperables y estado de correo corroborado por evidencia del proveedor.
- [ ] Suscriptores/destinatarios y modo export/paid se resuelven canónicamente, coinciden entre portal/worker,
  y la autorización de envío cubre los destinatarios y versión mostrados.
- [ ] UI verificada con errores, recarga/cambio de período, permisos, teclado, móvil y GVC conforme al scope.
- [ ] Migraciones, flags, grants, workers, webhooks y deploy tienen readback. Datos históricos revisados en
  modo lectura; cualquier recovery aprobada usa commands, conserva evidencia y verifica conciliación.
- [ ] Matriz de capabilities/tools/manuales y guías operativas actualizadas. Código completo con rollout
  pendiente no cierra este epic.

## Non-goals

- Certificar ausencia absoluta de bugs o cumplimiento tributario de todas las jurisdicciones.
- Ejecutar bancos/Deel, marcar pagos realizados, enviar comunicaciones o cambiar datos durante planificación.
- Reescribir Payroll, mover reglas de dominio al LLM/gateway o crear un executor arbitrario de SQL/endpoints.
- Absorber todos los programas de identidad, documentos legales, branding email o automatización de órdenes.
- Cambiar grants del cliente OAuth público compartido para destrabar escrituras.

## Delta 2026-09-03

Programa creado tras auditorías adversariales y full API parity. La propuesta inicial de reutilizar cuatro
briefs fue sustituida por instrucción expresa del operador: cerrar esas cuatro por supersesión documental
y crear las doce tasks con supuestos actuales. TASK-1816–TASK-1827 materializan U01–U12. No se iniciaron
implementaciones ni se cerraron los incidentes de producto; sólo se retiraron los briefs reemplazados.
