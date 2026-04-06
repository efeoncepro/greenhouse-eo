# Sistema de Permisos y Licencias

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-06 por Claude (TASK-271)
> **Ultima actualizacion:** 2026-04-06 por Claude (TASK-271)
> **Documentacion tecnica:** docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md

## Que es

El sistema de permisos y licencias permite a los colaboradores solicitar dias libres (vacaciones, estudio, permisos personales, licencias medicas, entre otros) y a los supervisores y HR aprobar o rechazar esas solicitudes. Todo el proceso es digital: desde la solicitud hasta la aprobacion, pasando por el calculo automatico de dias habiles y la validacion de saldo disponible.

## Superficies del portal

| Vista | Quien la usa | Que muestra |
|-------|-------------|-------------|
| `/my/leave` | Colaborador | Saldo personal, historial de solicitudes, calendario propio |
| `/hr/leave` | Supervisor / HR | Solicitudes del equipo, saldos, calendario del equipo |

Ambas vistas usan el mismo motor de calculo. No hay formulas distintas entre lo que ve el colaborador y lo que ve HR.

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

> Detalle tecnico: el motor de calculo vive en `src/lib/hr-core/leave-day-calculation.ts` y usa el calendario operativo de `src/lib/calendar/operational-calendar.ts`. Los schemas de datos estan en `greenhouse_hr` (leave_requests, leave_policies, leave_balances). Ver spec completa en `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` seccion 2.8.
