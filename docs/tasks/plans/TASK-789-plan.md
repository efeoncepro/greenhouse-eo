# Plan — TASK-789 Workforce Relationship Transition

## Discovery Summary

- `TASK-789` estaba libre: sin PR abierto, sin branch local/remota obvia; se movio a `in-progress` y se creo branch `task/TASK-789-workforce-relationship-transition`.
- La arquitectura vigente exige modelar `employee -> contractor/honorarios` como cierre de una relacion y apertura de otra bajo el mismo `identity_profile`.
- Runtime real ya tiene `greenhouse_core.person_legal_entity_relationships`, `greenhouse_hr.work_relationship_offboarding_cases`, `greenhouse_payroll.final_settlements`, `greenhouse_payroll.final_settlement_documents` y cutoff de roster payroll post-offboarding ejecutado.
- Drift no bloqueante: la spec lista `src/lib/person-legal-entity-relationships/**`, pero esa carpeta no existe. La tabla y eventos si existen; se debe crear el helper canonico en esa ubicacion.
- Drift documental no bloqueante: `docs/tasks/TASK_ID_REGISTRY.md` todavia marca `TASK-784` como `to-do`, pero `docs/tasks/README.md`, Handoff, codigo, migrations y `docs/tasks/complete/TASK-784-*` prueban que esta completa.
- `../Greenhouse_Portal_Spec_v1.md` no existe en el workspace. No bloquea porque la task esta cubierta por arquitectura vigente + runtime real.
- `pg:doctor` OK con `greenhouse_app` como runtime, sin `CREATE` en schemas.

## Access Model

- `routeGroups`: no cambia.
- `views` / `authorizedViews`: no se agrega view nueva; People 360 ya consume la surface existente de People/HR profile.
- `entitlements`: no se agrega capability nueva en este slice. La command primitive se usara desde contexto HR/admin futuro; no se expone endpoint nuevo en TASK-789.
- `startup policy`: no cambia.
- Decision de diseno: TASK-789 introduce backend/read-model foundation y mejora People 360 como consumidor existente, sin abrir una accion visible nueva.

## Skills

- `greenhouse-agent`: patrones Greenhouse/Next/Vuexy y People 360.
- `greenhouse-payroll-auditor`: guardrails de regimen, payroll dependiente vs honorarios/contractor, y no romper roster/finiquito.

## Subagent Strategy

- `sequential`: la tarea esta altamente acoplada entre relacion legal, offboarding y People 360. No hay slice independiente suficientemente grande que justifique subagente sin duplicar lectura.

## Execution Order

1. `src/lib/person-legal-entity-relationships/**`
   - Crear helper server-only canonico para listar relaciones por profile/member, cerrar una relacion activa y abrir una relacion contractor/honorarios en transaccion.
   - Reutiliza `withTransaction`, `query`, `publishOutboxEvent`, `AGGREGATE_TYPES.personLegalEntityRelationship` y eventos existentes.
   - No existe helper reutilizable; la spec ya reservaba esta ubicacion.

2. `src/lib/workforce/relationship-transition/**`
   - Crear command `transitionEmployeeToContractor` que:
     - valida offboarding case `executed`/`relationship_transition` o caso ejecutado dependiente compatible,
     - bloquea overlaps activos de employee/contractor/honorarios para la misma entidad legal salvo politica explicita futura,
     - cierra la relacion employee con `effective_to=lastWorkingDay`, `status='ended'`,
     - abre nueva relacion `contractor` o `honorarios` desde `contractorEffectiveFrom`,
     - preserva actor, reason y source metadata.
   - No se usa `payroll_adjustments`, `final_settlements` ni mutation destructiva de la relacion anterior.

3. Payroll/offboarding guardrails
   - Extender tests existentes para confirmar que el cutoff post-offboarding no incluye al colaborador en periodos posteriores y que relationship transition no habilita final settlement para contractor/honorarios.
   - No tocar formulas Chile ni cálculo mensual salvo tests focales.

4. People 360 projection
   - Extender `getPersonHrContext` con timeline compacto de relaciones legales/economicas.
   - Extender `buildPersonHrProfileViewModel` y `PersonHrProfileTab` para mostrar relacion laboral cerrada y contractor/honorarios activa con labels claros.
   - Mantener UI dentro de la card existente `Lifecycle laboral`; no crear shell nuevo.

5. Tests
   - Unit tests para helpers de relacion/transition con mocks de DB o SQL assertions segun patron local.
   - Tests de view-model y componente People 360 para caso Valentina-like: employee ended + contractor active.
   - Regression focal payroll/offboarding.

6. Docs / lifecycle
   - Actualizar `Handoff.md`, `changelog.md`, arquitectura o documentacion funcional si el contrato nuevo se materializa.
   - Si termina end-to-end, mover task a `complete`, sincronizar README/registry.

## Files To Create

- `src/lib/person-legal-entity-relationships/index.ts`
- `src/lib/person-legal-entity-relationships/store.ts`
- `src/lib/person-legal-entity-relationships/types.ts`
- `src/lib/person-legal-entity-relationships/store.test.ts`
- `src/lib/workforce/relationship-transition/index.ts`
- `src/lib/workforce/relationship-transition/employee-to-contractor.ts`
- `src/lib/workforce/relationship-transition/employee-to-contractor.test.ts`

## Files To Modify

- `src/lib/person-360/get-person-hr.ts` — agregar relationship timeline read-only.
- `src/views/greenhouse/people/tabs/person-hr-profile-view-model.ts` — exponer timeline y labels.
- `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx` — render claro de relacion cerrada vs contractor/honorarios activa.
- `src/views/greenhouse/people/tabs/*.test.tsx?` — casos de regresion UI/view-model.
- `src/lib/workforce/offboarding/lane.test.ts` o tests de store — reforzar frontera relationship_transition/no finiquito contractor.
- `docs/tasks/in-progress/TASK-789-*` — documentar drift y decisiones si cambia contrato.
- `Handoff.md`, `changelog.md` — cierre operativo.

## Files To Delete

- Ninguno.

## Risk Flags

- Payroll: alto. No se debe reactivar historico dependiente ni crear compensaciones contractor desde el motor mensual.
- Offboarding/finiquito: alto. Contractor/honorarios no debe desbloquear `final_settlements`.
- People 360: visible. Copy debe distinguir "relacion laboral cerrada" de "relacion contractor activa" sin sugerir pago por payroll.
- Schema: por ahora no se planea migration; se reutiliza tabla existente. Si al implementar aparece constraint insuficiente para `honorarios`, se corregira con migration creada via `pnpm migrate:create`.

## Open Questions

- Ninguna bloqueante en la spec. Decision tomada: V1 modela `honorarios` como `relationship_type='contractor'` con `metadata_json.relationshipSubtype='honorarios'`, porque la tabla actual no permite `honorarios` como `relationship_type` y la arquitectura acepta contractor/honorarios como relacion contractor separada hasta que TASK-790/794 materialicen subtipo dedicado.
