# Offboarding

> **Tipo de documento:** Manual de uso
> **Version:** 1.7
> **Creado:** 2026-05-04 por Codex
> **Ultima actualizacion:** 2026-09-03 por Claude (TASK-1349 — revisión de caso, ejecución por lane, elegibilidad de nómina, recuperación gobernada)
> **Modulo:** HR / Workforce
> **Ruta en portal:** `/hr/offboarding`
> **Documentacion relacionada:** [Offboarding laboral y contractual](../../documentation/hr/offboarding.md), [GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md)

## Para que sirve

La vista `Offboarding` permite abrir y operar casos de salida laboral o contractual sin confundirlos con desactivaciones de acceso.

## Antes de empezar

- Necesitas acceso a la vista `equipo.offboarding`.
- Para crear o avanzar casos necesitas capability `hr.offboarding_case`.
- Debes conocer la causal, la fecha efectiva de salida y el ultimo dia trabajado antes de programar o ejecutar.

## Crear un caso manual

1. En el menu lateral, zona **Operacion**, abre el dominio `Personas > Supervision > Offboarding`.
2. Haz clic en `Nuevo caso`.
3. En el drawer, selecciona el colaborador.
4. Elige la causal.
5. Completa `Salida efectiva` y `Ultimo dia`.
6. Agrega notas si hay contexto operativo o legal relevante.
7. Haz clic en `Crear`.

El caso queda con lane resuelta automaticamente. Si corresponde a payroll interno Chile, Greenhouse marca que requiere cierre de payroll y reconciliacion de leave. Desde ese caso puedes calcular el finiquito, aprobar el settlement y avanzar el documento formal en el carril `Finiquito`.

## Revisar contratos proximos o vencidos

Usa `Revisar contratos` para abrir casos `needs_review` cuando hay `contractEndDate` proximo o vencido.

Ese boton no ejecuta offboarding, no desactiva usuarios y no fija una fecha de termino laboral. Solo abre una revision para que HR confirme si la relacion termina, se renueva o cambia.

## Usar la cola operacional

La vista principal muestra una cola con summary, filtros y una accion principal por fila:

- `Atencion`: casos con bloqueo o siguiente paso critico.
- `Listos para calculo`: renuncias con carta y declaracion de pension completas.
- `Documentos`: casos con documento por revisar, emitir, reemitir o ratificar.
- `Sin finiquito`: honorarios o proveedor externo.

Haz clic en una fila para abrir el drawer de detalle con progreso, prerequisitos y acciones secundarias.

Desde TASK-1349, un caso de acceso sin revisar se muestra como **"Por clasificar"**; una vez revisado como solo acceso, se muestra **"Solo acceso"**. La acción **"Revisar caso"** aparece para cualquier caso no terminal, incluidos los bloqueados.

## Revisar un caso — solo acceso vs. término de relación (TASK-1349)

La revisión es obligatoria antes de poder aprobar, programar o ejecutar un caso que nació de una señal de acceso (SCIM/Admin). Hoy no existe pantalla dedicada para esto en la cola (viene con TASK-1814) — se opera por API, con `pnpm staging:request` (o directo contra local con `curl`) usando la persona agente HR o EFEONCE_ADMIN.

1. Ubica el caso en `/hr/offboarding` y copia su `caseId` y su `updatedAt` vigente (visible en el drawer de detalle o en la respuesta de `GET /api/hr/offboarding/cases`). El `updatedAt` es obligatorio: si el caso cambió desde que lo miraste, la revisión se rechaza con conflicto de versión.
2. Decide con el HR responsable si la señal fue **solo baja de acceso** o si la relación **realmente terminó**. Nunca se infiere de la fecha ni de la fuente del caso.
3. (Opcional pero recomendado) Antes de guardar, previsualiza el efecto en nómina sin escribir nada:

   ```bash
   pnpm staging:request POST /api/hr/offboarding/cases/<caseId>/review/preview '{
     "decision": "relationship_ended",
     "separationType": "resignation",
     "effectiveDate": "2026-09-15",
     "lastWorkingDay": "2026-09-15",
     "reason": "Renuncia confirmada por el colaborador, carta recibida 2026-09-01.",
     "expectedUpdatedAt": "2026-09-01T14:32:10.123Z"
   }'
   ```

   La respuesta muestra qué campos cambiarían, si se invalida una aprobación previa, y el efecto en los períodos de nómina afectados (política proyectada, si el período queda bloqueado, y advertencias).

4. Envía la revisión real (mismo body, sin `/preview`):

   **Solo acceso:**

   ```bash
   pnpm staging:request POST /api/hr/offboarding/cases/<caseId>/review '{
     "decision": "access_only",
     "effectiveDate": "2026-09-01",
     "reason": "Cuenta dada de baja por SCIM al desvincular acceso; no hay término de relación laboral confirmado.",
     "expectedUpdatedAt": "2026-09-01T14:32:10.123Z"
   }'
   ```

   **Terminó la relación** (causal obligatoria — una de `resignation`, `termination`, `fixed_term_expiry`, `mutual_agreement`, `contract_end`, `other`):

   ```bash
   pnpm staging:request POST /api/hr/offboarding/cases/<caseId>/review '{
     "decision": "relationship_ended",
     "separationType": "resignation",
     "effectiveDate": "2026-09-15",
     "lastWorkingDay": "2026-09-15",
     "reason": "Renuncia confirmada por el colaborador, carta recibida 2026-09-01.",
     "expectedUpdatedAt": "2026-09-01T14:32:10.123Z",
     "approveNow": false
   }'
   ```

   El motivo (`reason`) es obligatorio, mínimo 10 caracteres, y queda en el registro de auditoría del caso — escribe contexto real, no "ok" o "revisado".

5. Si la revisión de "terminó la relación" invalida una aprobación previa, el caso vuelve a "Requiere revisión" y hay que aprobarlo de nuevo — a menos que se envíe `"approveNow": true` y quien ejecuta tenga permiso de aprobar, en cuyo caso queda aprobado en el mismo paso.
6. Cuando la revisión es "solo acceso", el caso queda listo para cerrarse directo con la acción **"Ejecutar"** (cierre informativo — no toca compensación, relación ni el registro del colaborador).

## Avanzar estados

La cola muestra la accion disponible cuando corresponde:

- `Aprobar`: valida una salida con fecha efectiva.
- `Programar`: requiere ultimo dia trabajado.
- `Ejecutar`: marca el caso como ejecutado.

Si el ultimo dia trabajado cae despues de la salida efectiva, debes registrar una razon explicita antes de avanzar. Esa excepcion queda auditada.

**Guardia de revisión (TASK-1349):** si el caso nació de una señal de acceso y todavía no tiene revisión, `Aprobar`, `Programar` y `Ejecutar` se rechazan con el error `offboarding_case_review_required`. Revisa el caso primero (ver sección anterior). Bloquear el caso o cancelarlo sigue permitido sin revisión previa.

### Estados y errores de la revisión

| Código | Cuándo aparece | Qué hacer |
| --- | --- | --- |
| `offboarding_case_review_required` (409) | Se intenta aprobar/programar/ejecutar un caso `identity_only` sin revisión. | Revisar el caso primero (solo acceso o término de relación). |
| `offboarding_case_version_conflict` (409) | El caso cambió desde que se leyó `updatedAt`. | Recargar el caso y reintentar con el `updatedAt` vigente. |
| `offboarding_review_dates_required` (400) | Falta `effectiveDate` (ambas decisiones) o `lastWorkingDay` (término de relación). | Declarar la fecha explícita — nunca se asume "hoy". |
| `offboarding_review_separation_type_required` (400) | `decision=relationship_ended` sin `separationType` válido. | Declarar la causal explícita del término. |
| `compensation_future_version_conflict` (409) | Al ejecutar un término real, hay versiones de compensación que empiezan después del último día trabajado. | Corregir o supersender esas versiones en Payroll antes de reintentar — el sistema no las borra. |
| `unresolved_exit_signal` (warning bloqueante en readiness de nómina) | Hay una salida sin decidir cuya señal cae en o antes del período de cálculo. | Revisar el caso pendiente antes de calcular o aprobar ese período. |

## Desde People 360

En la ficha HR de una persona, Greenhouse muestra:

- fecha de ingreso
- fin de contrato si existe
- salida efectiva si hay caso activo
- ultimo dia trabajado si hay caso activo
- estado de offboarding
- historial de relaciones persona ↔ entidad legal cuando existe

Si no hay caso activo, el CTA `Iniciar offboarding` abre la vista con el colaborador preseleccionado.

Si una persona paso de dependiente a contractor/honorarios, People 360 debe mostrar ambas etapas por separado: la relacion laboral cerrada y la relacion contractor u honorarios activa. No uses ese historial como instruccion de pago: los pagos contractor se operan por el flujo contractor/payables futuro, no por finiquito ni por ajuste de nomina.

## Finiquito

Cuando el caso corresponde a renuncia Chile dependiente con payroll interno, Payroll puede calcular el final settlement desde el caso aprobado o agendado.

El calculo exige capability `hr.final_settlement`, usa `effective_date` y `last_working_day`, y queda separado de la nomina mensual. Si el settlement ya fue aprobado y necesita cambio, se cancela con razon auditable y se recalcula una nueva version.

## Cerrar caso con proveedor externo (Deel / EOR)

Cuando el colaborador tiene contrato gestionado por **Deel, EOR u otro proveedor externo**, Greenhouse NO emite finiquito Chile interno — el cierre legal y operativo vive en el proveedor. El caso del proveedor se marca como `Proveedor externo` en la cola (badge azul).

Para cerrar el caso desde Greenhouse:

1. Desde `/hr/offboarding`, ubica el caso con badge **Proveedor externo**.
2. Haz click en la accion primaria **"Cerrar con proveedor"** del inspector.
3. Se abre el dialog "Cerrar caso con proveedor externo":
   - **Motivo del cierre** (obligatorio): minimo 10 caracteres. Es libre pero queda en el audit log del caso, asi que escribe contexto util ("Renuncia gestionada por Deel desde el portal del proveedor.", "Termino de contrato EOR Brasil — finiquito local procesado por el proveedor.").
   - **Referencia del proveedor** (opcional): ID, ticket o referencia que permita encontrar el cierre en el portal del proveedor. Util para auditoria post-cierre.
4. Confirma con **"Confirmar cierre"**. El caso pasa a `Aprobado` y, cuando el feature flag `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` esta activo, el colaborador queda excluido de la nomina interna proyectada del periodo.

Capabilities que necesitas: `workforce.offboarding.close_external_provider:update` (asignada a HR, FINANCE_ADMIN y EFEONCE_ADMIN). Si no la tienes, el boton aparece pero el POST devuelve 403.

**Importante:** el cierre con proveedor en Greenhouse NO ejecuta nada en Deel/EOR. Es solo un registro auditable del lado Greenhouse para que la nomina interna proyectada deje de incluir al colaborador. El cierre legal del lado proveedor lo gestionas en su portal.

## Reconciliar drift Person 360 (TASK-891, EFEONCE_ADMIN solo)

Algunos colaboradores muestran inconsistencia entre lo que dice su member runtime (`contract_type='contractor' / payroll_via='deel'`) y la relación legal activa en Person 360 (`relationship_type='employee'`). Eso se llama **drift Person 360** y aparece como alerta en `/admin/operations` bajo el subsystem `Identity & Access`.

Para resolverlo (solo si tienes rol EFEONCE_ADMIN):

1. Desde `/admin/operations`, identifica el signal `identity.relationship.member_contract_drift` (severity `warning` si reciente, `error` si lleva >30 días sin reconciliar).
2. Click en el CTA "Resolver drift" → navega a `/admin/identity/drift-reconciliation?memberId=<id>`.
3. En el form:
   - **memberId** viene pre-llenado y deshabilitado (no editable si llegaste por deep link).
   - **Subtipo de la nueva relación**: elige `Contractor estándar` (default) o `Honorarios`. Define cómo se clasifica la nueva relación contractor.
   - **Motivo** (obligatorio, mínimo 20 caracteres): explica por qué se reconcilia. Queda en el audit log de ambas relaciones — escribe contexto útil (ej. "Maria Hoyos transicionó a contractor via Deel — relación employee legacy cerrada per HR review 2026-05-14"), no solo "fix drift".
   - **Fecha de cierre externa** (opcional): si el cierre legal ocurrió en una fecha pasada (ej. el proveedor externo emitió termination el día X), regístrala aquí. Default: hoy.
4. Click **"Confirmar reconciliación"**. El sistema:
   - Cierra la relación `employee` activa (`effective_to=NOW() + status='ended'`).
   - Abre nueva relación `contractor` con el subtipo elegido.
   - Ambos cambios en una sola transacción atómica.
   - Emite outbox events `.deactivated` + `.created` con correlation forensic.
   - Append marker `[TASK-891 reconciled by actor=X on Y]` en notes de ambas filas.

**Reversibilidad**: la reconciliación no se deshace automáticamente, pero el historial Person 360 preserva ambos eventos. Si te equivocaste, ejecuta una NUEVA reconciliación inversa con el subtype correcto — ambos eventos quedan en el audit trail.

**Quién más puede ejecutar**: V1.0 solo EFEONCE_ADMIN. Delegación a HR queda como follow-up V1.1 post 30 días sin incidentes operativos.

## Recuperación gobernada (TASK-1349)

Cuando un caso quedó desalineado con la realidad — por ejemplo, una salida real ya ejecutada pero el colaborador sigue activo (`hr.offboarding.executed_member_still_active`, ver [ISSUE-117](../../issues/open/ISSUE-117-offboarding-executed-never-deactivates-member-canonical.md)), o un caso de solo-acceso que en verdad fue un término real — la corrección se hace con el script `pnpm workforce:offboarding:recovery`. **Nunca** con un UPDATE manual en PostgreSQL: el script usa los mismos commands canónicos que la API (revisar → aprobar → programar → ejecutar), así que deja el mismo rastro de auditoría y respeta las mismas reglas.

El script corre en modo simulación por defecto — no escribe nada hasta que se lo pidas explícitamente:

```bash
# Ver el estado de toda la cohorte con drift, sin aplicar nada
pnpm workforce:offboarding:recovery

# Ver el estado de un colaborador puntual
pnpm workforce:offboarding:recovery --member <memberId>
```

Para aplicar un cambio real, siempre con `--apply` y `--member <memberId>` explícito (nunca aplica a la cohorte completa de una sola vez):

```bash
# Lane A — cerrar el ciclo de vida de una salida real ya ejecutada
# (compensación, relación legal, members.active=false, cierre de asignaciones)
pnpm workforce:offboarding:recovery --apply --member <memberId> \
  --decision relationship_ended --separation-type resignation \
  --reason "Renuncia confirmada, caso quedó ejecutado sin cerrar el ciclo de vida del colaborador." \
  --approve

# Lane B — un caso de solo-acceso que en verdad fue un término real
pnpm workforce:offboarding:recovery --apply --member <memberId> \
  --decision access_only --access-revoked-on 2026-09-01 \
  --reason "Baja de acceso SCIM confirmada, sin evidencia de término de relación laboral."
```

El script vuelve a leer el estado en vivo justo antes de escribir, e imprime un readback después: elegibilidad de nómina por período, estado del colaborador, y obligaciones de Finance en solo lectura. **Nunca** emite pagos ni toca datos de Finance — si hay una obligación generada por error, esa se corrige en Finance con sus propios commands, no desde este script.

Para verificar el resolver de elegibilidad de nómina de forma aislada (sin tocar casos), usa `pnpm payroll:exit-eligibility:smoke`.

## Que no hacer

- No uses `Desactivar` como sustituto de salida laboral.
- No uses `contractEndDate` como fecha efectiva de salida sin abrir caso.
- No emitas documento formal desde esta vista; eso pertenece a la lane documental posterior.
- No cierres un caso si faltan handoffs, assets, permisos o aprobaciones criticas.
- No uses "Cerrar con proveedor" cuando el caso es `internal_payroll` (Chile dependiente). Esa lane requiere finiquito formal — usa el flujo normal "Calcular finiquito" + "Aprobar" + "Emitir documento".
- No apruebes, programes ni ejecutes un caso `identity_only` sin revisarlo primero (TASK-1349) — el sistema lo va a rechazar, pero tampoco lo intentes forzar.
- No corrijas un caso desalineado (ejecutado con colaborador activo, o solo-acceso mal clasificado) con un UPDATE manual en PostgreSQL. Usa siempre `pnpm workforce:offboarding:recovery` — es la vía auditada y gobernada.
- No asumas la fecha de hoy al revisar un caso, y no infieras la causal del término desde la fecha efectiva — ambas deben declararse explícitamente.
- No marques como pagada una obligación de Finance generada por un caso mal clasificado; esa corrección la hace Finance con sus propios commands, no este flujo.

## Problemas comunes

### El sistema dice que ya existe un caso activo

Revisa la tabla de casos activos o la ficha People 360. Solo puede existir un caso activo por relacion laboral o, como fallback, por colaborador.

### La accion de programar falla

Confirma que el caso tenga `Salida efectiva` y `Ultimo dia`. El ultimo dia no puede ser posterior a la salida efectiva salvo que exista una razon explicita.

### SCIM desactivo a alguien y aparecio un caso identity-only

Es esperado. SCIM es una senal de identidad, no una decision laboral. HR debe revisar si corresponde abrir o completar un offboarding laboral real.

### No puedo aprobar/programar/ejecutar un caso — dice "offboarding_case_review_required"

El caso nació de una señal de acceso y todavía no tiene revisión. Revísalo primero (ver "Revisar un caso — solo acceso vs. término de relación") declarando si fue solo baja de acceso o si la relación realmente terminó.

### Al calcular nómina del período aparece un bloqueo por "unresolved_exit_signal"

Hay al menos un colaborador con una salida sin decidir (caso en `Borrador`, `Requiere revisión` o `Bloqueado`) cuya señal cae en o antes de ese período. Identifica el caso desde `/hr/offboarding` (filtro `Atención` o `Por clasificar`) y revísalo — el cálculo se desbloquea una vez que la revisión queda registrada.

### El caso quedó "Ejecutado" pero el colaborador sigue activo en People 360

Puede ser esperado: el paso que marca `members.active=false` está detrás del flag `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED`, hoy apagado. Si ves la señal `hr.offboarding.executed_member_still_active` en `/admin/operations`, usa `pnpm workforce:offboarding:recovery` (lane A, "cerrar ciclo de vida") — nunca un UPDATE manual.

### El colaborador sigue saliendo en nomina proyectada despues de cerrar con proveedor

Verifica:

1. El caso quedo en `Aprobado` (no en `Borrador`). Si quedo en `Borrador`, el cierre falló — vuelve a intentar con motivo y referencia.
2. El feature flag `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` esta en `true` para el ambiente (desde TASK-1349 esta encendido en producción y staging). Si estuviera en `false`, Greenhouse mantiene comportamiento legacy y el colaborador puede seguir apareciendo full-month.
3. El `last_working_day` esta poblado en el caso. Sin esa fecha el resolver no puede calcular el cutoff.

Si despues de revisar los tres puntos el colaborador sigue apareciendo, contacta a plataforma/HR para revisar el signal `payroll.exit_window.full_month_projection_drift` en `/admin/operations`.

### El dialog "Cerrar con proveedor" dice "El motivo debe tener al menos 10 caracteres"

El motivo es obligatorio y debe tener al menos 10 caracteres porque queda en el audit log append-only. Escribe contexto util (no solo "ok" o "cerrar") porque cualquier persona que audite el caso despues vera ese motivo como unica explicacion del cierre.

### Veo un caso marcado "Proveedor externo" pero el colaborador es de Chile dependiente

Eso indica drift entre el runtime del member y la clasificacion del caso. Revisa `member.contract_type` y `member.payroll_via` en People 360. Si el colaborador es realmente Chile dependiente, debe estar en lane `internal_payroll` y usar el flujo finiquito normal, no el cierre con proveedor.

## Closure Completeness (TASK-892) — entender los 4 estados de cierre

A partir del 15-may-2026, cada case muestra **dos badges** lado a lado:

1. **Status del case** (`Borrador` / `Requiere revision` / `Ejecutado` / etc.) — el estado del agregado puro.
2. **Estado de cierre** (`En curso` / `Cierre parcial` / `Cerrado completamente` / `Bloqueado`) — sintesis de las 4 capas operativas.

| Badge "Estado de cierre" | Significado | Que ve el operador |
|--------------------------|-------------|---------------------|
| `En curso` | El case esta abierto y operandose | CTA al proximo paso del workflow |
| `Cierre parcial` | Case ejecutado/cancelado PERO falta alinear capas (drift Person 360, payroll proyectada) | Seccion "Capas pendientes" con CTAs especificos |
| `Cerrado completamente` | Las 4 capas alineadas | Sin CTAs pendientes |
| `Bloqueado` | El case tiene un blocker que requiere resolucion humana | CTA al step de resolucion del blocker |

### Que hacer cuando ves "Cierre parcial"

Abre el case (click en la fila o boton "Ver detalle"). En el inspector vas a ver una seccion nueva titulada **"Capas pendientes"** con uno o mas items:

- **"Reconciliar relacion legal Person 360"** (warning): el member runtime declara contractor/Deel/honorarios pero la relacion legal activa sigue como `employee`. Solo `EFEONCE_ADMIN` puede ejecutarla. Click en el boton "Reconciliar relacion legal" abre el dialog auditado de TASK-891.

- **"Confirmar exclusion de nomina"** (info, hint): informativo. Click en "Ver" navega a `/hr/payroll/projected` para que confirmes que el colaborador esta excluido del periodo. No requiere accion adicional si ya esta excluido.

Si NO tienes capability para el step (no eres EFEONCE_ADMIN), el step se esconde de tu UI. Contacta a tu admin para resolverlo.

## Referencias tecnicas

- `greenhouse_hr.work_relationship_offboarding_cases`
- `greenhouse_hr.work_relationship_offboarding_case_events`
- `src/lib/workforce/offboarding/**`
- `src/lib/workforce/offboarding/store.ts` (`reviewOffboardingCase`), `review-policy.ts`, `review-preview.ts`, `state-machine.ts`, `member-lifecycle.ts` (TASK-1349)
- `src/lib/workforce/offboarding/work-queue/closure-completeness.ts` (TASK-892 aggregate canonical)
- `src/lib/payroll/exit-eligibility/**` (TASK-890/1349 resolver canonico)
- `scripts/workforce/offboarding-recovery.ts` (`pnpm workforce:offboarding:recovery`, TASK-1349)
- `/api/hr/offboarding/cases`, `/api/hr/offboarding/cases/{caseId}/review[/preview]`, `/api/platform/app/hr/offboarding/cases/{caseId}/review[/preview]` (TASK-1349)
- Capabilities: `hr.offboarding_case`, `workforce.offboarding.close_external_provider` (TASK-890), `person.legal_entity_relationships.reconcile_drift` (TASK-891), `workforce.offboarding.review_case` (TASK-1349)
- Signals: `identity.relationship.member_contract_drift` + `hr.offboarding.completeness_partial` (TASK-892), `hr.offboarding.unresolved_exit_signal` + `hr.offboarding.executed_member_still_active` + `workforce.offboarding.deprovisioned_member_without_case` (TASK-1349)
