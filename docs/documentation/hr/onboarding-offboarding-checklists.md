# Checklists de Onboarding y Offboarding

> **Tipo de documento:** Documentacion funcional  
> **Version:** 1.0  
> **Creado:** 2026-05-04  
> **Modulo:** HR / HRIS  
> **Rutas:** `/hr/onboarding`, `/my/onboarding`  
> **Arquitectura relacionada:** `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`, `docs/architecture/GREENHOUSE_WORKFORCE_ONBOARDING_ARCHITECTURE_V1.md`, `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`

## Para que sirve

Los checklists permiten convertir procesos repetibles de entrada y salida en tareas asignables a HR, IT, supervisor, payroll, delivery o colaborador.

## Que es fuente de verdad

- La plantilla define tareas reutilizables.
- La instancia copia esas tareas para un colaborador concreto y conserva snapshots de titulo, rol, vencimiento y obligatoriedad.
- En offboarding, el caso canonico sigue siendo `WorkRelationshipOffboardingCase`; el checklist solo acompana la ejecucion operativa.
- Completar un checklist no ejecuta salida laboral, no emite finiquito y no revoca accesos automaticamente.

## Estados

- Instancia: `active`, `completed`, `cancelled`.
- Tarea: `pending`, `in_progress`, `done`, `skipped`, `blocked`.
- Una instancia se completa automaticamente cuando todas sus tareas obligatorias quedan `done` o `skipped`.

## Acceso

- HR opera plantillas e instancias con `hr.onboarding_template` y `hr.onboarding_instance`.
- Colaboradores ven y actualizan solo sus tareas asignadas con `my.onboarding`.
- Las vistas visibles son `equipo.onboarding` y `mi_ficha.onboarding`.

## Automatizacion

Los eventos `member.created`, `member.updated` y `member.deactivated` disparan una proyeccion idempotente. Si aplica, crea o reutiliza el checklist activo del colaborador. En salidas, enlaza el checklist al caso de offboarding activo cuando existe.
