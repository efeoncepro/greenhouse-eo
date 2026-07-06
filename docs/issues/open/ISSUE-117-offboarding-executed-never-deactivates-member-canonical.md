# ISSUE-117 — Offboarding ejecutado nunca desactiva `greenhouse_core.members` (active/status) → colaboradores desvinculados filtran a rosters/nómina/360

## Ambiente

production + staging (identity canónico — `greenhouse_core.members`)

## Detectado

2026-07-06, por el operador, durante el envío de avisos de nómina 1:1 por Teams (`pnpm teams:payment-announcement`). Al reconstruir el roster de colaboradores activos desde `greenhouse_core.members`, aparecían **María Camila Hoyos** y **Maggie Borralles** como `active=true` pese a estar **desvinculadas hace semanas** (y ya removidas del tenant de Microsoft Entra). El operador confirmó que ambas "pasaron por el flujo de Offboarding y supuestamente ya no deberían salir".

## Síntoma

Personas con salida laboral procesada siguen `status='active'`, `active=true` en `greenhouse_core.members`, con `updated_at` **congelado en su fecha de creación** (nunca lo tocó el offboarding). Como consecuencia filtran a todo consumidor que lee "workforce activo": rosters (Teams payment-announcement), candidatos de cálculo de nómina, Person/Account 360, People directory, etc.

Evidencia (query 2026-07-06):

| Persona | member_id | status | active | updated_at | En Entra |
|---|---|---|---|---|---|
| María Camila Hoyos | `d1a72374-f4b7-415f-b54a-0dcf76749e46` | active | true | 2026-05-14 | no (SCIM la desactivó) |
| Maggie Borralles | `0e6a896e-f1d2-481c-9c97-ee43ab1714d8` | active | true | 2026-06-01 | no |

Casos de offboarding existentes:

| public_id | member | source | separation_type | rule_lane | exec_mode | status | executed_at |
|---|---|---|---|---|---|---|---|
| EO-OFF-2026-0609A520 | María Camila | manual_hr | resignation | external_payroll | partial | **executed** | 2026-05-15 |
| EO-OFF-2026-FE2179AC | María Camila | scim | identity_only | identity_only | informational | needs_review | — |
| *(ninguno)* | **Maggie** | — | — | — | — | — | — |

Dos manifestaciones distintas del mismo hueco:
1. **María Camila**: caso HR **ejecutado** (`executed`, 15-may) pero `members` nunca cambió. Además un 2.º caso SCIM colgado en `needs_review`.
2. **Maggie**: **no existe ningún caso de offboarding**; salió de Entra por otra vía y Greenhouse no tiene registro de exit ni desactivó el member.

## Causa raíz

**No existe en todo el repo ningún code path que ponga `greenhouse_core.members.active=false` ni un `status` de salida.** El executor de offboarding cierra las capas que sí toca, pero **omite el writeback del ciclo de vida al registro canónico `members`**:

- `updateOffboardingCaseStatus` (transición `→ executed`) en [src/lib/workforce/offboarding/store.ts:926-999](../../../src/lib/workforce/offboarding/store.ts#L926-L999) hace: `assertPayrollExecutionReadiness` → `closeFuturePayrollEligibility` (corta elegibilidad futura de nómina) → `UPDATE greenhouse_hr.work_relationship_offboarding_cases SET status='executed', executed_at=now()...` → eventos/outbox. **Nunca hace `UPDATE greenhouse_core.members`.**
- No hay **consumer reactivo** del evento `workRelationshipOffboardingCaseExecuted` que desactive el member (`rg` sobre `src`/`services` no devuelve ninguno fuera del catálogo de eventos).
- `grep` global de `greenhouse_core.members` con `active=false` / `status='offboarded'|'inactive'|'terminated'` → **cero coincidencias** en código productivo. La desactivación del member simplemente no está implementada en ninguna lane (`full`/`partial`/`informational`).
- El lane `external_payroll` (Deel) resuelve `greenhouseExecutionMode='partial'` ([src/lib/workforce/offboarding/lane.ts](../../../src/lib/workforce/offboarding/lane.ts)) bajo la premisa de que Deel hace la baja real; pero aun en `partial`/`full` el member canónico debería marcarse inactivo, y no ocurre.
- El lane SCIM `identity_only` cae en `informational`/`needs_review` y por diseño no muta; queda esperando revisión HR que nunca desactiva el member. Y cuando la baja de Entra no genera caso (Maggie), no hay nada que reconcilie.

Es decir: aunque un offboarding llegue a `executed`, el colaborador permanece "activo" en el objeto 360 canónico.

## Impacto

- **Privacidad/operacional (gatillo de este issue)**: ex-colaboradores entraban al roster de avisos de nómina 1:1. En este caso NO se les envió porque el cruce contra Entra los descartó (sus cuentas ya no existen), pero cualquier consumidor que confíe solo en `members.active` sin verificar Entra los incluiría.
- **Nómina**: personas desvinculadas siguen siendo "workforce activo" → riesgo de aparecer como candidatas de cálculo/pago si no las filtra otra capa.
- **360 / People / reporting**: headcount y directorios inflados con gente que ya salió.
- **Drift silencioso**: no hay señal que detecte "member `active=true` con offboarding `executed`" ni "member ausente de Entra pero `active=true`".

## Solución

Propuesta (a validar con `greenhouse-payroll-auditor` + `arch-architect`; **no** parche por-registro, corregir la primitiva):

1. **Writeback canónico del ciclo de vida en el executor**: al transicionar un caso `→ executed`, dentro de la misma `withTransaction`, marcar `greenhouse_core.members` como inactivo con estado de salida (`status` de baja + `active=false` + `contract_end_date`/último día laboral), vía un command auditado (no UPDATE suelto). Debe aplicar a `full` y `partial`; para `external_payroll` el member canónico igual se desactiva (Greenhouse es el 360, Deel es el payer).
2. **SCIM `identity_only`/`informational`**: definir la política — o (a) al confirmarse baja de acceso persistente se escala a un cierre laboral que desactive el member, o (b) queda explícito que `identity_only` NO desactiva y entonces la baja de Entra debe reconciliarse por otra vía. Hoy no hace ni una ni otra.
3. **Caso "sin offboarding" (Maggie)**: reconciliar bajas de Entra que no generaron caso — el pipeline SCIM debe crear (o cerrar) un caso, o un detector debe levantarlas.
4. **Reliability signal nuevo**: `workforce.offboarding.executed_member_still_active` (steady=0) — member con caso `executed` que sigue `active=true`; y complementario `identity.workforce.active_member_absent_from_entra`.
5. **Backfill** de los casos ya rotos (María Camila, Maggie y cualquier otro que el detector encuentre) por el command canónico, no por SQL manual.

Requiere task(s) de implementación (dominio Payroll/Workforce, EPIC offboarding). Este issue documenta el bug de runtime; la remediación amplia (writeback + política SCIM + detector + backfill) excede un fix localizado.

## Verificación

- Tras el fix: ejecutar un offboarding de prueba en staging y confirmar que `greenhouse_core.members` queda `active=false` + `status` de salida + `updated_at` movido, en la misma transacción del `executed`.
- Backfill: `María Camila` y `Maggie` quedan inactivas por el command canónico; desaparecen del roster de `members active` y de candidatos de nómina.
- Signals `workforce.offboarding.executed_member_still_active` y `identity.workforce.active_member_absent_from_entra` en `0`.
- `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde (gate de no-regresión del dominio).

## Estado

open

## Relacionado

- Código: [src/lib/workforce/offboarding/store.ts](../../../src/lib/workforce/offboarding/store.ts) (`updateOffboardingCaseStatus`), [src/lib/workforce/offboarding/lane.ts](../../../src/lib/workforce/offboarding/lane.ts)
- Arquitectura: `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`, `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md` (§offboarding closure completeness), `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` (SCIM provisioning/deprovisioning)
- Detectado desde: CLI `pnpm teams:payment-announcement` (skill `greenhouse-teams-message-operator`)
- Objeto canónico: `Colaborador` → `greenhouse_core.members.member_id`
