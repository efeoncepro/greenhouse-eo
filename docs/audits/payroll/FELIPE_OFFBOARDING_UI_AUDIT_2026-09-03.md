# Felipe Zurita — auditoría del flujo de salida desde la UI

Fecha: 2026-09-03. Estado: **operativamente bloqueado; fechas reparadas, salida y exclusión de nómina pendientes**.

Confirmación posterior del operador, en esta misma sesión: **a Felipe se le pagó todo y no se le debe nada**.
El CTA observado “Revisar pago pendiente” describe la UI defectuosa, no una deuda real. La recuperación
debe reflejar saldo pendiente cero y conciliar registros con el pago ya realizado, sin emitir otro pago.
Relacionado: [ISSUE-117](../../issues/open/ISSUE-117-offboarding-executed-never-deactivates-member-canonical.md) y [TASK-1349](../../tasks/to-do/TASK-1349-offboarding-member-lifecycle-writeback.md).

Ampliación solicitada por el operador: [causa raíz, auditoría de tres subagentes y propuesta de solución](OFFBOARDING_ROOT_CAUSE_AND_REMEDIATION_2026-09-03.md).

## Alcance y autorización

El operador pidió intentar la baja mediante Computer Use en la UI de Greenhouse e identificar el bug de proceso si no era posible. Se operó Chrome con `@oai/sky`, sesión visible de Julio Reyes Rangel, en producción: `https://greenhouse.efeoncepro.com/hr/offboarding`. La consulta posterior a PostgreSQL fue solo lectura. Tras identificar el defecto y recibir la fecha real del operador, se reparó el efecto accidental mediante la API autenticada canónica; esa reparación no constituye éxito del flujo UI.

Sujeto: Felipe Zurita, member `e603fade-b262-43d3-896f-09f04dd6ddd7`, caso `EO-OFF-2026-8B8AF9BA` / `offboarding-case-b6fe63d6-4c75-4318-943b-5ccc28deb6cf`. Al inicio solo se conocía salida desde junio. Luego el operador confirmó explícitamente: **Felipe dejó de trabajar el 02 de junio de 2026**. El 10 de junio es la creación del caso SCIM, no la fecha laboral.

## Reproducción y efecto real

1. Personas muestra a Felipe como activo. La cola de offboarding muestra `Requiere revisión`, `Cierre contractual`, `Último día —` y **Listo, 2 de 2 pasos**.
2. Seleccionar Felipe abre un inspector con `Revisar pago pendiente` (link a `/hr/payroll`), reconciliación de relación legal y `Aprobar caso`. No ofrece editar causal/fechas ni reclasificar el caso SCIM.
3. Al pulsar **Aprobar caso**, sin introducir fecha alguna, el sistema guarda `approved`, `effective_date=2026-09-03` y `last_working_day=2026-09-03`. No abrió formulario ni pidió confirmar las fechas. El readback registra `updated_at=2026-09-03T14:09:46.924Z`.
4. El inspector ofrece ahora `Programar salida`, sin corregir fechas ni revertir aprobación. Se abrió y cerró `Nuevo caso` sin guardar: contiene campos de fecha solo para creación, con default del día actual.
5. Se detuvo el avance: **no se programó ni ejecutó la salida**, no se creó otro caso, no se calcularon nóminas ni se ordenaron pagos.
6. Con la fecha confirmada se usó `POST /api/hr/offboarding/cases/[caseId]/transition` con `status=blocked`, ambas fechas `2026-06-02` y razón explícita de recuperación del bug. Se invocó mediante `scripts/staging-request.mjs`, actor autenticado `user-agent-e2e-001`, con los gates de sesión y `hr.offboarding_case:update` del endpoint. Staging y producción comparten la base: la reparación es operativa y afecta el dato que lee producción. HTTP 200, readback PG `updated_at=2026-09-03T14:12:14.458Z` y recarga de Chrome en producción confirmaron **Bloqueado / Último día 02/06/2026**. No hubo SQL directo ni impersonación de Julio para reparar; la aprobación inicial conserva su evento histórico.

## Hallazgos

### P1 — La aprobación inventa fechas usando el estado del formulario de creación

`src/views/greenhouse/hr-core/offboarding/HrOffboardingView.tsx`: el estado `effectiveDate` / `lastWorkingDay` nace de `today()` (líneas 260–261). `transitionCase()` usa `item.effectiveDate ?? effectiveDate` y `item.lastWorkingDay ?? lastWorkingDay` (484–485), aunque ese formulario no se haya abierto. El backend exige una fecha pero acepta la inventada por el cliente. Abrir o editar el formulario de creación también puede alterar los defaults usados al aprobar otro caso sin fechas; esta última variante se deduce del código, no se ejecutó en producción.

### P1 — No hay circuito de corrección del caso existente en el inspector

`deriveSecondaryActions()` en `src/lib/workforce/offboarding/work-queue/derivation.ts` solo ofrece aprobar → programar → ejecutar para el lifecycle. No publica editar, reclasificar, bloquear ni cancelar, aunque la máquina de estados soporta algunas transiciones de contención. `Nuevo caso` no es una sustitución segura: `createOffboardingCase()` en `store.ts` rechaza con 409 un member con caso activo; se verificó el guard en código, sin provocar una creación adicional en producción.

### P1 — La clasificación visual oculta la clasificación que usa nómina

`resolveOffboardingClosureLane()` muestra `contractual_close` por `contractTypeSnapshot='honorarios'`, incluso con `ruleLane='identity_only'`. El readback posterior confirma que la aprobación **no cambió** `rule_lane` ni `separation_type`: ambos siguen `identity_only`. El resolver de nómina devuelve `full_period` para ese lane. La UI puede dar apariencia de cierre contractual mientras el dato canónico conserva una baja solo de acceso.

### P2 — “Listo, 2 de 2” no verifica las fechas ni la resolución de salida

`deriveProgress()` asigna 2/2 a lanes sin finiquito que no sean `needs_classification`, sin comprobar fechas ni cierre laboral. Se observó 2/2 antes de aprobar, con fechas nulas y caso pendiente desde junio.

## Readback de datos tras la recuperación

| Capa | Antes | Después de reparar el efecto del intento UI |
| --- | --- | --- |
| Caso | `needs_review`, fechas nulas | `blocked`, ambas fechas `2026-06-02` confirmadas por el operador |
| Lane / causal | `identity_only` / `identity_only` | Sin cambio |
| Member | `active=true`, `status=active`, sin fin contractual | Sin cambio |
| Compensación | CLP 650.000, `effective_to=NULL`, vigente | Sin cambio |
| Acceso | Desactivado | Sin cambio |
| Nómina agosto | `draft`, cero entries de Felipe | Sin cambio |
| Entries/ajustes mayo–julio | Existen exclusiones puntuales junio/julio | Sin cambio |

El reader local contra la base compartida reprodujo, antes del intento, seis incluidos y uno sin compensación con exit-window ON; Felipe incluido como `full_period`, sin warnings. No se consultaron ni modificaron flags de Vercel en esta auditoría.

Evidencia visual local: `.captures/felipe-offboarding-ui-2026-09-03/approved-auto-date.png` y `blocked-corrected-date.png`. El segundo estado sigue mostrando 2/2 “Listo” junto a “Bloqueado”, otra manifestación del progreso engañoso.

## Recuperación y corrección requeridas

- Fechas confirmadas y rectificadas a `2026-06-02`; aprobación contenida en `blocked`, con historial conservado. Falta corregir la clasificación mediante un command auditado. La UI examinada no ofrece esa operación.
- **Bloquear el caso de offboarding no bloquea ni excluye a Felipe de nómina**: el resolver considera `blocked` como `full_period`. Member y compensación siguen abiertos. La mitigación de payroll de TASK-1349 sigue pendiente.
- Separar el formulario de creación del de transición; exigir captura y revisión explícita de fechas faltantes antes de aprobar.
- Exponer revisión/reclasificación de casos SCIM y edición/contención auditada, conservando historial y obligaciones pendientes.
- Derivar progreso y acciones de los requisitos reales; hacer visible el desacuerdo entre baja de acceso y salida contractual.
- Completar el cierre de elegibilidad y lifecycle de TASK-1349, verificando después la exclusión de períodos posteriores y la preservación de historia/pagos finales.

No se implementó código, no hubo commit, push ni deploy. No se marca ISSUE-117 ni TASK-1349 como resueltos.
