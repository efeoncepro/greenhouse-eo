# Offboarding

> **Tipo de documento:** Manual de uso
> **Version:** 1.3
> **Creado:** 2026-05-04 por Codex
> **Ultima actualizacion:** 2026-05-15 por Claude Opus (TASK-890 — cierre con proveedor externo auditado)
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

1. Entra a `Personas y HR > Supervision > Offboarding`.
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

## Avanzar estados

La cola muestra la accion disponible cuando corresponde:

- `Aprobar`: valida una salida con fecha efectiva.
- `Programar`: requiere ultimo dia trabajado.
- `Ejecutar`: marca el caso como ejecutado.

Si el ultimo dia trabajado cae despues de la salida efectiva, debes registrar una razon explicita antes de avanzar. Esa excepcion queda auditada.

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

## Que no hacer

- No uses `Desactivar` como sustituto de salida laboral.
- No uses `contractEndDate` como fecha efectiva de salida sin abrir caso.
- No emitas documento formal desde esta vista; eso pertenece a la lane documental posterior.
- No cierres un caso si faltan handoffs, assets, permisos o aprobaciones criticas.
- No uses "Cerrar con proveedor" cuando el caso es `internal_payroll` (Chile dependiente). Esa lane requiere finiquito formal — usa el flujo normal "Calcular finiquito" + "Aprobar" + "Emitir documento".

## Problemas comunes

### El sistema dice que ya existe un caso activo

Revisa la tabla de casos activos o la ficha People 360. Solo puede existir un caso activo por relacion laboral o, como fallback, por colaborador.

### La accion de programar falla

Confirma que el caso tenga `Salida efectiva` y `Ultimo dia`. El ultimo dia no puede ser posterior a la salida efectiva salvo que exista una razon explicita.

### SCIM desactivo a alguien y aparecio un caso identity-only

Es esperado. SCIM es una senal de identidad, no una decision laboral. HR debe revisar si corresponde abrir o completar un offboarding laboral real.

### El colaborador sigue saliendo en nomina proyectada despues de cerrar con proveedor

Verifica:

1. El caso quedo en `Aprobado` (no en `Borrador`). Si quedo en `Borrador`, el cierre falló — vuelve a intentar con motivo y referencia.
2. El feature flag `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` esta en `true` para el ambiente. Mientras esta en `false` (default V1.0 hasta staging shadow compare verde ≥7d), Greenhouse mantiene comportamiento legacy y el colaborador puede seguir apareciendo full-month.
3. El `last_working_day` esta poblado en el caso. Sin esa fecha el resolver no puede calcular el cutoff.

Si despues de revisar los tres puntos el colaborador sigue apareciendo, contacta a plataforma/HR para revisar el signal `payroll.exit_window.full_month_projection_drift` en `/admin/operations`.

### El dialog "Cerrar con proveedor" dice "El motivo debe tener al menos 10 caracteres"

El motivo es obligatorio y debe tener al menos 10 caracteres porque queda en el audit log append-only. Escribe contexto util (no solo "ok" o "cerrar") porque cualquier persona que audite el caso despues vera ese motivo como unica explicacion del cierre.

### Veo un caso marcado "Proveedor externo" pero el colaborador es de Chile dependiente

Eso indica drift entre el runtime del member y la clasificacion del caso. Revisa `member.contract_type` y `member.payroll_via` en People 360. Si el colaborador es realmente Chile dependiente, debe estar en lane `internal_payroll` y usar el flujo finiquito normal, no el cierre con proveedor.

## Referencias tecnicas

- `greenhouse_hr.work_relationship_offboarding_cases`
- `greenhouse_hr.work_relationship_offboarding_case_events`
- `src/lib/workforce/offboarding/**`
- `src/lib/payroll/exit-eligibility/**` (TASK-890 resolver canonico)
- `/api/hr/offboarding/cases`
- Capabilities: `hr.offboarding_case`, `workforce.offboarding.close_external_provider` (TASK-890)
- Signal `identity.relationship.member_contract_drift` (subsystem Identity & Access)
