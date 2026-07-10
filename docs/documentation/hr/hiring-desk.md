# Hiring Desk

## Qué es

Hiring Desk es el espacio interno para operar la demanda de talento, el pipeline de postulaciones, la ficha 360 y la publicación de vacantes desde el dominio canónico Hiring / ATS. No crea candidatos, openings ni decisiones paralelos: consume `TalentDemand`, `HiringOpening` y `HiringApplication`.

## Superficies

- **Demanda:** KPIs del pipeline, filtros y tabla de openings. `Nueva demanda` crea demanda + opening en borrador; publicar sigue siendo una acción explícita.
- **Pipeline:** seis lanes visuales sobre las etapas canónicas. Una tarjeta representa una `HiringApplication`; se mueve por drag o por menú de etapa y vuelve a su posición anterior si el write falla.
- **Application 360:** resumen con PII enmascarada, assessment/scorecard advisory, documentos, decisión estructurada y actividad append-only.
- **Publicación:** compara la verdad interna con el payload público allowlist y confirma publicar, pausar o cerrar.

## Reglas de negocio

- La IA puede sugerir un score; una persona lo confirma o edita antes de que cuente. El scorecard orienta y nunca rechaza automáticamente.
- La decisión exige motivo humano estructurado, soporta re-decisión con supersede y conserva historial append-only.
- Publicación solo expone `buildPublicOpeningPayload()`; compensación, notas y riesgo internos no se publican.
- El correo agregado está enmascarado. El reveal de identidad/documentos requiere el resolver, capability, motivo y auditoría de TASK-1362; mientras no esté disponible, la interfaz lo comunica como degradación real.
- Los outcomes terminales no se alcanzan arrastrando una tarjeta: selección/rechazo/espera pasan por la decisión estructurada.

## Acceso

Las vistas `gestion.hiring*` controlan visibilidad de rutas. Cada reader y command vuelve a exigir capabilities `hiring.*`; `hiring.application.decide` usa acción `execute`. No se concede a roles `client_*`.

## Estados y límites

La interfaz diferencia loading, vacío inicial, filtros sin resultados, error recuperable, write optimista/rollback y dependencia degradada. La UI candidate-facing para rendir tests sigue en TASK-1363; captura/reveal documental completo sigue en TASK-1362.

## Handoff downstream (TASK-356)

Cuando una postulación se decide como **seleccionada**, Greenhouse materializa automáticamente (vía el pipeline reactivo) un **handoff**: una ficha auditable que dice "esta persona fue seleccionada para este destino" y espera aprobación humana. Nada se contrata solo: aprobar el handoff no crea colaboradores ni asignaciones — entrega la solicitud al equipo receptor (HRIS para contratación interna, Staff Augmentation para placements). El equipo receptor confirma el cierre con evidencia (referencia del colaborador o placement creado).

- Un rechazo, un respaldo o una espera **nunca** generan handoff.
- Si la decisión cambia después de aprobar el handoff, este se **bloquea** para revisión humana en lugar de sobrescribirse en silencio.
- Los destinos que aún no tienen equipo receptor en Greenhouse (contractor, partner, reasignación interna) nacen bloqueados con motivo visible, nunca en silencio.
- Para contratación interna, el **bridge de activación** (TASK-770) toma el handoff aprobado y crea la ficha de colaborador **sobre la misma persona** (nunca una identidad nueva), en estado "pendiente de intake" — invisible para nómina hasta que HR completa la ficha por Workforce Activation. El cierre siempre exige evidencia (la ficha creada) y los conflictos de identidad quedan bloqueados para revisión humana, nunca se fusionan solos.
- La pantalla de la cola de activación llega con TASK-1368 (los flags del bridge están apagados por defecto).

## Referencias

- Arquitectura: `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- Task: `docs/tasks/in-progress/TASK-355-hiring-desk-internal-workspaces-publication-governance.md`
- Manual: `docs/manual-de-uso/hr/operar-hiring-desk.md`
