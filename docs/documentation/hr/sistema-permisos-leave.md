# Sistema de Permisos y Licencias

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.3
> **Creado:** 2026-04-06 por Claude (TASK-271)
> **Ultima actualizacion:** 2026-05-16 por Claude Opus (TASK-895 V1.1a, accrual participation-aware)
> **Documentacion tecnica:** docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md + docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md

## Que es

El sistema de permisos y licencias permite a los colaboradores solicitar dias libres (vacaciones, estudio, permisos personales, licencias medicas, entre otros) y a los supervisores y HR aprobar o rechazar esas solicitudes. Todo el proceso es digital: desde la solicitud hasta la aprobacion, pasando por el calculo automatico de dias habiles y la validacion de saldo disponible.

## Superficies del portal

| Vista | Quien la usa | Que muestra |
|-------|-------------|-------------|
| `/my/leave` | Colaborador | Saldo personal, historial de solicitudes, calendario propio |
| `/hr/leave` | Supervisor / HR | Solicitudes del equipo, saldos, calendario del equipo y operaciones administrativas |

Ambas vistas usan el mismo motor de calculo. No hay formulas distintas entre lo que ve el colaborador y lo que ve HR.

En la vista del equipo, Greenhouse intenta mostrar la identidad visible completa de cada colaborador:

- nombre visible resuelto
- avatar del perfil cuando existe
- iniciales como fallback cuando no hay avatar disponible

Esto evita que la lectura operativa dependa de identificadores tecnicos o listados anonimos.

## Operaciones administrativas

La vista `/hr/leave` ahora distingue dos operaciones distintas cuando HR necesita corregir historial:

### Registrar dias ya tomados

Se usa cuando el colaborador **si tomo vacaciones o permiso en fechas reales**, pero ese periodo no fue solicitado antes en Greenhouse.

Este flujo:

- registra el rango real tomado
- deja el historial visible como una carga administrativa
- mueve esos dias a usados
- conserva razon, notas, actor y fecha de registro

Ejemplo: Valentina tomo 5 dias la semana pasada y HR los registra despues.

### Ajustar saldo

Se usa cuando HR **necesita corregir el saldo** pero no existen fechas reales defendibles para crear una solicitud retroactiva.

Este flujo:

- aplica un delta positivo o negativo al saldo
- exige motivo
- deja un historial auditable
- permite revertir el ajuste si fue cargado por error

Ejemplo: arrastre heredado, correccion de onboarding o regularizacion historica.

### Actividad administrativa del colaborador

Cuando HR entra al detalle de una persona en `/hr/leave`, Greenhouse agrupa la trazabilidad operativa en una seccion de **Actividad administrativa**.

Esa seccion separa dos cosas distintas:

- **Dias ya tomados registrados**: periodos reales que la persona ya uso y que HR cargo despues
- **Ajustes de saldo**: correcciones manuales al saldo, positivas o negativas

La diferencia importa:

- un registro de dias ya tomados afecta el historial del permiso y los dias usados
- un ajuste de saldo corrige la contabilidad del saldo, pero no inventa fechas de ausencia

Por eso puede pasar que una persona tenga actividad administrativa visible aun cuando no tenga ajustes manuales en su saldo.

## Tipos de permiso disponibles

| Tipo | Codigo | Trackea saldo | Requiere anticipacion |
|------|--------|---------------|----------------------|
| Vacaciones | `vacation` | Si | 7 dias |
| Feriado movil | `floating_holiday` | Si | 2 dias |
| Duelo | `bereavement` | Si | Sin anticipacion |
| Deber civico | `civic_duty` | Si | Sin anticipacion |
| Estudio | `study` | No (saldo negativo permitido) | 1.5 dias (36h) |
| Personal | `personal` | No (saldo negativo permitido) | 1 dia |
| Licencia medica | `medical` | No (saldo negativo permitido) | Sin anticipacion |
| Sin goce de sueldo | `unpaid` | No (saldo negativo permitido) | 2 dias (48h) |

## Permisos de medio dia

Desde abril 2026 se pueden solicitar permisos de medio dia (manana o tarde). Esto permite, por ejemplo, pedir la manana libre para un tramite y trabajar la tarde, o viceversa.

### Como funciona en el formulario

**Cuando se pide un solo dia:**

El formulario muestra tres opciones:
- **Dia completo** — se descuenta 1 dia del saldo
- **Solo manana** — se descuenta 0.5 dias del saldo
- **Solo tarde** — se descuenta 0.5 dias del saldo

**Cuando se pide un rango de fechas (varios dias):**

El formulario muestra selectores independientes para el primer y el ultimo dia:
- **Primer dia:** dia completo o solo tarde (si se elige solo tarde, ese dia cuenta como 0.5)
- **Ultimo dia:** dia completo o solo manana (si se elige solo manana, ese dia cuenta como 0.5)
- Los dias intermedios siempre cuentan como dias completos

### Ejemplos

| Solicitud | Primer dia | Ultimo dia | Dias habiles descontados |
|-----------|-----------|-----------|------------------------|
| Lunes completo | Dia completo | — | 1.0 |
| Lunes por la manana | Manana | — | 0.5 |
| Lunes a viernes, saliendo el lunes por la tarde | Tarde (lun) | Completo (vie) | 4.5 |
| Lunes a viernes, solo la manana del viernes | Completo (lun) | Manana (vie) | 4.5 |
| Lunes a viernes, tarde del lunes + manana del viernes | Tarde (lun) | Manana (vie) | 4.0 |

### Calendario

Las solicitudes de medio dia se muestran en el calendario con indicadores **AM** (manana) o **PM** (tarde) para distinguirlas de los dias completos.

### Compatibilidad

Los permisos que ya existian antes de esta funcionalidad no cambian. Todos se consideran como dias completos por defecto. Solo las solicitudes nuevas pueden usar la opcion de medio dia.

## Calculo de dias habiles

El sistema calcula automaticamente cuantos dias habiles incluye una solicitud:

- **Excluye** fines de semana (sabado y domingo)
- **Excluye** feriados nacionales de Chile
- **Incluye** fracciones de 0.5 cuando se pide medio dia
- La zona horaria de referencia es siempre `America/Santiago`

El usuario nunca ingresa manualmente la cantidad de dias. Solo selecciona fechas y periodos, y el sistema hace el calculo.

## Reglas de anticipacion

Algunos tipos de permiso requieren que la solicitud se haga con cierta anticipacion respecto a la fecha de inicio:

| Tipo | Anticipacion minima |
|------|-------------------|
| Vacaciones | 7 dias calendario |
| Feriado movil | 2 dias calendario |
| Estudio | 1.5 dias (36 horas habiles) |
| Personal | 1 dia calendario |
| Sin goce de sueldo | 2 dias (48 horas habiles) |
| Duelo, deber civico, medica | Sin anticipacion |

Si no se cumple la anticipacion, la solicitud se rechaza automaticamente al intentar crearla.

## Flujo de aprobacion

1. El colaborador crea la solicitud
2. Si tiene supervisor asignado, la solicitud entra como **pendiente de supervisor**
3. Si no tiene supervisor, entra directo como **pendiente de HR**
4. El supervisor puede aprobar (pasa a HR) o rechazar
5. HR puede aprobar definitivamente o rechazar
6. El colaborador puede cancelar solicitudes que aun esten pendientes

Las solicitudes ya cerradas (aprobadas, rechazadas o canceladas) no se pueden reabrir.

## Saldo y acumulacion

- El saldo anual se asigna por tipo de permiso y por ano
- Vacaciones Chile: 15 dias anuales, con posibilidad de acumular hasta 5 dias del ano anterior (carry-over)
- Colaboradores con antiguedad pueden recibir dias progresivos adicionales segun la legislacion chilena
- Al crear una solicitud pendiente, los dias quedan **reservados** en el saldo
- Al aprobar, se mueven de reservados a **usados**
- Al rechazar o cancelar, se **devuelven** al saldo disponible
- Los ajustes manuales quedan separados del historial de solicitudes y se reflejan como **ajustes** del saldo

### Como leer los saldos administrativos

En `HR > Permisos`, el detalle administrativo separa el saldo en columnas distintas para que RRHH no mezcle conceptos:

- **Base / acumulado**: dias que la politica ya devengo para ese ano
- **Progresivos**: dias extra por antiguedad cuando aplica
- **Arrastre**: dias heredados del periodo anterior segun la politica
- **Usados**: dias ya consumidos o cargados como backfill historico
- **Reservados**: solicitudes pendientes que ya bloquean saldo
- **Ajustes**: correcciones manuales netas
- **Saldo actual**: resultado visible despues de sumar base, progresivos, arrastre y ajustes, y restar usados y reservados

Esto evita interpretar mal casos como vacaciones Chile del primer ciclo laboral, donde una persona puede tener un **base / acumulado** parcial y aun asi un **saldo actual** mayor porque trae arrastre del periodo anterior.

En la vista del equipo, ese detalle ya no depende de una tabla horizontal gigante. Greenhouse muestra cada tipo de permiso como un bloque administrativo mas legible, para que RRHH pueda revisar saldos, actividad y acciones sin perder contexto en pantallas medianas o pequenas.

## Politica de vacaciones

Greenhouse no decide vacaciones solo por moneda. Para el calculo y la explicacion administrativa considera, como minimo:

- `contract_type`
- `pay_regime`
- `payroll_via`
- `hire_date`

### Caso Chile interno

Cuando la persona pertenece a Chile interno y tiene contrato laboral aplicable, el saldo anual y los progresivos se calculan desde su fecha de ingreso y la politica chilena vigente del portal.

En la practica eso significa que Greenhouse no debe sembrar automaticamente `15` dias completos para una persona que aun esta en su primer ciclo de antiguedad laboral. Durante ese primer tramo, el saldo visible se accrualiza desde `hire_date`; una vez que se cumple el aniversario laboral, la politica ya puede consolidarse al anual completo segun corresponda.

Mientras ese primer ciclo sigue en curso, RRHH puede ver mensajes de apoyo como:

- acumulacion proporcional desde la fecha de ingreso
- arrastre visible del periodo anterior

La idea es que el saldo no solo sea correcto, sino tambien legible para operacion y auditoria.

### Casos no equivalentes

No todos los contratos usan la misma logica:

- `Indefinido` y `Plazo fijo` pueden seguir la politica laboral Chile interna
- `Honorarios` no se interpreta automaticamente como vacaciones legales
- `Contractor` y `EOR` pueden quedar sujetos a politica externa o sin saldo legal equivalente dentro del portal

Por eso HR puede ver en la pantalla administrativa una explicacion basica de la politica aplicada a cada saldo.

### Transiciones contractor a dependent mid-year (TASK-895, V1.1a)

Cuando un colaborador entra a Greenhouse como contractor o honorarios y mas tarde, en el mismo year calendario, transita a relacion dependent CL (`indefinido` o `plazo_fijo` con `pay_regime='chile'` y `payroll_via='internal'`), Greenhouse necesita ser mas preciso que la logica legacy anclada en `hire_date`.

Por que importa:

- El feriado legal CL Art 67 del Codigo del Trabajo acumula solo durante el vinculo dependent activo. Honorarios y contractor no son trabajadores subordinados bajo CT y no generan derecho a feriado legal.
- La logica legacy anclaba el accrual en `members.hire_date`. Cuando el hire_date era anterior al inicio del vinculo dependent real, el sistema sobreacumulaba dias que legalmente no corresponden.
- En el finiquito, esa sobreacumulacion se traduce en sobrepago al colaborador y precedente contractual riesgoso si emerge litigio "consideren que mi vinculo continuo era dependent".

Como funciona la version participation-aware:

- Cuando el flag `LEAVE_PARTICIPATION_AWARE_ENABLED` esta activado en el ambiente, el motor de accrual compone el primitive year-scope `LeaveAccrualEligibilityWindow` mes a mes del year.
- Filtra solo los periodos donde el colaborador tuvo vinculo dependent CL activo (`contract_type IN ('indefinido','plazo_fijo')` Y `pay_regime='chile'` Y `payroll_via='internal'`).
- Aplica truncacion de salida via TASK-890 (Workforce Exit Payroll Eligibility) si hubo offboarding mid-year.
- Computa el saldo anual con la formula canonica `(dias anuales × dias elegibles dependent) / dias del primer ciclo de servicio`.

Que ve HR:

- Si el flag esta apagado (default productivo hoy), el saldo se calcula con la logica legacy y aparece igual que siempre.
- Si el flag esta encendido y el colaborador tuvo transicion contractor a dependent, el saldo de feriado refleja solo el tramo dependent. HR puede ver la diferencia en el script de auditoria (operativo, no UI).
- En la planilla del colaborador (vista admin del balance), la cifra aparece con el saldo correcto sin sobre-comunicacion del cambio.

Reglas duras:

- El flag tiene dependencias canonicas: requiere `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` (TASK-893) y `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` (TASK-890) en el mismo ambiente. Sin esas pre-condiciones, el motor cae al calculo legacy automaticamente (degraded honesto, sin romper).
- El cambio nunca muta saldos automaticamente. Solo aplica al recalcular el seed del balance (nueva siembra anual o re-seed manual). Los saldos historicos persistidos no se tocan.
- El script `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/leave/audit-accrual-drift.ts` permite a HR ver el drift entre logica legacy y participation-aware sin tocar datos. Runbook canonical en `docs/operations/runbooks/leave-accrual-drift-audit.md`.

Ejemplo real:

- Persona contratada el 15 de enero de 2026 como contractor.
- En el mismo year, el 13 de mayo de 2026, pasa a `indefinido` dependent CL.
- Legacy: acumula desde 15 de enero, daria aproximadamente todo el year proporcionalmente.
- Participation-aware: acumula solo desde 13 de mayo, daria 233 dias elegibles / 365 dias del primer ciclo × 15 dias = aproximadamente 9.58 dias.
- Diferencia: aproximadamente 5+ dias que legalmente no corresponden bajo Art 67 CT.

> Detalle tecnico: el motor de calculo vive en `src/lib/hr-core/leave-domain.ts` (helper puro legacy intacto). La integration participation-aware vive en `src/lib/hr-core/postgres-leave-store.ts:computeBalanceSeedForYear` via el helper local `tryComputeParticipationAwareAllowanceDays`. El primitive year-scope canonical vive en `src/lib/leave/participation-window/`. El signal de reliability `hr.leave.accrual_overshoot_drift` aparece en `/admin/operations` bajo subsystem Payroll Data Quality. Ver spec arquitectonica en `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md` Delta 2026-05-16 TASK-895.

> Detalle tecnico: el motor de calculo vive en `src/lib/hr-core/leave-day-calculation.ts` y usa el calendario operativo de `src/lib/calendar/operational-calendar.ts`. Los schemas de datos estan en `greenhouse_hr` (leave_requests, leave_policies, leave_balances). Ver spec completa en `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` seccion 2.8.
