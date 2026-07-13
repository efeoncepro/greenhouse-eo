# Plan — TASK-1365 Adverse-Impact & Fairness Monitoring

## Discovery summary

- `TASK-1360`, `TASK-1364` y `TASK-1383` están complete. El blocker y las rutas `to-do` de la spec eran drift y fueron corregidos antes de rerun del hook.
- El hook pasó con `develop override: yes` y `subagents authorized: no`. La ejecución permanece en `develop`, sin worktree nuevo.
- La primitive canónica vive en `src/lib/hiring/assessment/fairness/**`; routes y el assessment público serán adapters delgados.
- Se reutilizan `withGreenhousePostgresTransaction`, outbox/event catalog, errores Hiring, patrón flag default OFF y evidencia append-only de validity.
- `greenhouse_hiring.hiring_application` conserva estado actual y outbox histórico de stage/decision. La proyección fairness reconstruirá máximo avance y solo expondrá buckets mensuales con `k=10`.
- `pnpm lint` y `pnpm typecheck` están verdes como baseline. `pnpm pg:doctor` falla antes de consultar DB por `GOOGLE_APPLICATION_CREDENTIALS_JSON` local malformado; GCP CLI y ADC sí están alineados. Se intentará smoke mediante el proxy canónico sin modificar credenciales.
- Calidad: se crea un command/reader reusable y una proyección privacy-safe; no se agrega lógica de fairness a routes, UI ni decisión individual.

## Access model

- `routeGroups`: sin grant por route group para fairness.
- `views` / `authorizedViews`: sin cambios; no hay UI en esta task.
- `entitlements`: capability nueva `hiring.assessment.fairness_read`, acción `read`, scope `tenant`, solo `EFEONCE_ADMIN`, `HR_MANAGER` y `EFEONCE_OPERATIONS`.
- `startup policy`: sin cambios.
- Captura candidato: token opaco vigente de `candidate_test`, flag OFF y policy config completa; nunca acepta `identity_profile_id` desde el request.
- Decisión: la lectura de assessment general no confiere acceso a fairness y los roles `client_*` no reciben la capability.

## Architecture decision

- ADR existente: `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` gobierna assessment, separación de decisión y template versioning; `GREENHOUSE_EVENT_CATALOG_V1.md` gobierna outbox PII-free.
- ADR nuevo/propuesto: no aplica. Es una extensión additive ya prevista del dominio Hiring, sin cambiar identidad, auth, source of truth compartido ni topología.
- Docs as-built requeridas: delta Hiring ATS + Event Catalog.

## Backend/data contract

- Rigor: `backend-critical`.
- SoT: `greenhouse_hiring.hiring_demographic_selfid`, audit append-only, proyección `greenhouse_hiring.assessment_fairness` y evidencia `greenhouse_hr.assessment_fairness_evidence`.
- Contratos: `captureVoluntaryDemographicSelfId` y `getSelectionFairness`; API interna fairness + acción pública tokenizada de self-ID.
- Privacidad: categorías como claves sin texto libre, allowlist config-driven, policy version obligatoria, retención explícita, `k=10`, mínimo dos grupos reportables, cero IDs per-candidato en report/evidence/signal.
- Idempotencia: upsert transaccional por persona+dimensión; audit/outbox solo ante cambio real. Reader read-only.
- Drift: ventana actual vs anterior de igual duración; delta de tasa e impact ratio.
- Rollout: flag `HIRING_FAIRNESS_MONITOR_ENABLED=false`; flag ON con policy/categorías/retención incompletas falla cerrado. Sin backfill.
- Rollback: flag OFF. Reverse migration solo antes de captura real; tras rollout cualquier eliminación será gobernada por retención/privacidad.

## Skills

- Intake/spec: `greenhouse-task-execution-hook` + `greenhouse-task-planner`.
- Privacy boundary: `legal-privacy-ip-operator` (orientación técnica, no dictamen; sign-off legal sigue externo).
- QA: `greenhouse-qa-release-auditor` al cierre.
- Docs: `greenhouse-documentation-governor` al cierre.
- `greenhouse-agent` es UI-only y no aplica a los slices de implementación; `greenhouse-secret-hygiene` no requiere acciones porque no se crean secretos ni se rotan credenciales.

## Subagent strategy

`sequential`.

- El operador prohibió subagentes y los slices son causales, con ownership solapado entre schema, contracts, API y tests.

## Execution order

1. Crear migración additive con self-ID separado, audit append-only, evidence append-only, proyección mensual k-safe y capability DB.
2. Agregar config fail-closed, contratos browser-safe y cálculo puro de 4/5 + drift.
3. Implementar command transaccional de self-ID y adapter público ligado al token del assessment.
4. Implementar reader agregado, evidencia AI-Act y signal adverse-impact sin PII.
5. Agregar capability al catálogo/runtime role-only, route interna y eventos PII-free.
6. Agregar unit/boundary/live tests y script/smoke DB sintético con cleanup transaccional.
7. Aplicar migración en dev si el acceso DB funciona; regenerar `src/types/db.d.ts` y ejecutar smoke.
8. Sincronizar arquitectura, catálogo de eventos, flag ledger, changelog, task/README/registry, project context y handoff.
9. Ejecutar lint, typecheck, tests, flags, task/ops/docs y auditoría QA.

## Files to create

- `migrations/20260713165547000_task-1365-voluntary-demographics-and-fairness.sql`
- `src/lib/hiring/assessment/fairness/{config,contracts,stats,capture-self-id,get-selection-fairness,evidence,index}.ts`
- tests unitarios/boundary/live en `src/lib/hiring/assessment/fairness/**`
- `src/app/api/hiring/assessments/fairness/route.ts`
- `scripts/hiring/verify-assessment-fairness-smoke.ts`

## Files to modify

- `src/app/api/public/assessment/[token]/route.ts` y `src/lib/hiring/assessment/public-taking.ts` — adapter candidato tokenizado.
- `src/lib/hiring/assessment/index.ts` — export del command público.
- `src/config/entitlements-catalog.ts` y `src/lib/entitlements/runtime.ts` — capability role-only.
- `src/lib/sync/event-catalog.ts` y docs del catálogo — eventos sin PII.
- `src/types/db.d.ts` — regenerado tras migración.
- docs de arquitectura, flag ledger, task lifecycle, changelog, context y handoff.

## Files to delete

- Ninguno.

## Risk flags

- Un join individual es necesario dentro de la proyección DB, pero ninguna fila individual sale del boundary; la view aplica k antes de exponer.
- Buckets mensuales bajo k se suprimen incluso si combinados superarían k: degradación conservadora deliberada.
- Categorías/consentimiento/retención definitivos no se inventan; mantienen rollout bloqueado.
- No se toca `.claude/skills/seo-aeo-practice/` ni se reabre TASK-1371.

## Open questions

- Ninguna bloquea code-complete. El sign-off legal/privacidad y la policy final bloquean staging/prod y el flag permanece OFF.

## Checkpoint

- Autoaprobado por matriz (`P2`, esfuerzo `Medio`) después de baseline verde y Audit documentado.
