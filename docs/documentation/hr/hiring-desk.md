# Hiring Desk

## Qué es

Hiring Desk es el espacio interno para operar la demanda de talento, el pipeline de postulaciones, la ficha 360 y la publicación de vacantes desde el dominio canónico Hiring / ATS. No crea candidatos, openings ni decisiones paralelos: consume `TalentDemand`, `HiringOpening` y `HiringApplication`.

## Superficies

- **Demanda:** KPIs del pipeline, filtros y tabla de openings. `Nueva demanda` crea demanda + opening en borrador; publicar sigue siendo una acción explícita.
- **Pipeline:** seis lanes visuales sobre las etapas canónicas. Una tarjeta representa una `HiringApplication`; se mueve por drag o por menú de etapa y vuelve a su posición anterior si el write falla.
- **Application 360:** resumen con PII enmascarada, assessment/scorecard advisory, documentos, decisión estructurada, handoff bridge hacia Activation Lane y actividad append-only.
- **Publicación:** compara la verdad interna con el payload público allowlist y confirma publicar, pausar o cerrar.

## Modelo assessment operativo

El assessment runtime se divide en cuatro objetos. Esta distinción es obligatoria para humanos y agentes:

| Objeto | Qué representa | Qué NO representa |
|---|---|---|
| `hiring_assessment_template` | Plantilla lista para un rol: competencias, pesos, nivel objetivo y pool de preguntas. | No es una rendición ni guarda respuestas. |
| `hiring_opening` | La vacante publicada o interna que recibe postulaciones. | No es el target de ejecución del test. |
| `hiring_application` | La postulación concreta del candidato dentro del pipeline. | No duplica la identidad de la persona. |
| `hiring_assessment` | Instancia template × application, con token, tiempo, estado, respuestas y scorecard. | No es reusable entre candidatos. |

Regla práctica: si una vacante ya tiene la plantilla "lista", todavía hay que asignar esa plantilla a cada postulación que deba rendir. El command de asignación crea una instancia por `hiring_application`; el token crudo se muestra una vez y luego sólo existe su hash.

## Flujo assessment end-to-end

1. El operador abre Application 360 de la postulación.
2. En la pestaña `Evaluación`, asigna una plantilla activa (`POST /api/hiring/assessments` con `applicationId`, `templateId`, `method='candidate_test'` y tiempo límite si aplica).
3. Greenhouse crea `hiring_assessment`, evita duplicados abiertos por aplicación/plantilla y devuelve el link limpio `/assessment/<token>`.
4. El candidato rinde por `GET/POST /api/public/assessment/[token]`. El payload público es allowlisted: pregunta, opciones públicas, respuestas propias, progreso, timer y accommodation. Nunca incluye `answer_key_json`, `rubric_json`, token hash ni datos internos.
5. El autosave llama `saveResponse`; el submit exige que todas las preguntas públicas tengan respuesta guardada y que la instancia siga `in_progress`.
6. Application 360 carga el review interno por `GET /api/hiring/assessments/[id]`: scorecard, módulos, respuestas abiertas, rúbrica interna y sugerencias IA si existen.
7. El humano confirma/ajusta score por respuesta y finaliza el scorecard. El rollup actualiza el headline advisory en `hiring_application`.
8. La decisión se toma en `Decisión`, no en el scorecard.

## Endpoints y capabilities principales

- `POST /api/hiring/assessments`: asigna template a postulación. Requiere `hiring.assessment.author`.
- `GET /api/hiring/assessments?applicationId=...`: lista instancias de la postulación. Requiere `hiring.assessment.read`.
- `GET /api/hiring/assessments/[id]`: detalle de review interno. Requiere `hiring.assessment.read`.
- `POST /api/hiring/assessments/[id]/score`: registra/cierra score humano. Requiere `hiring.assessment.score`.
- `GET/POST /api/public/assessment/[token]`: superficie pública por token; no usa sesión de dashboard.
- `POST /api/hiring/openings/[id]/ai/propose-public-copy` (TASK-1385): la IA propone un borrador del copy público del aviso (título, resumen, descripción, requisitos, tags) desde inputs seguros — nunca ve presupuesto, tarifas ni notas internas. Requiere `hiring.opening.ai_assist` y el flag `HIRING_VACANCY_AI_ENABLED`. El borrador se confirma (editable) por `POST /api/hiring/assessments/ai/proposals/[id]/confirm` con `hiring.opening.write`; publicar sigue siendo la acción humana de siempre. **Desde TASK-1422 esto tiene UI en la pestaña Publicación**: botón `✨ Redactar con IA` en la columna pública del diff → drawer con el bloque "Lo que la IA verá", formulario editable y Aplicar/Descartar (manual: `docs/manual-de-uso/hr/operar-hiring-desk.md`).

No crear instancias por SQL, no leer tokens desde logs y no exponer rúbricas/answer keys al browser candidato.

## Reglas de negocio

- La IA puede sugerir un score; una persona lo confirma o edita antes de que cuente. El scorecard orienta y nunca rechaza automáticamente.
- La IA también puede redactar el borrador del aviso público de una vacante (TASK-1385): propone solo texto desde datos seguros, con lenguaje neutro y sin señales de género/edad; una persona lo revisa, edita y confirma. La IA nunca escribe el opening ni publica.
- La decisión exige motivo humano estructurado, soporta re-decisión con supersede y conserva historial append-only.
- Publicación solo expone `buildPublicOpeningPayload()`; compensación, notas y riesgo internos no se publican.
- El correo agregado está enmascarado. El reveal de identidad/documentos requiere el resolver, capability, motivo y auditoría de TASK-1362; mientras no esté disponible, la interfaz lo comunica como degradación real.
- Los outcomes terminales no se alcanzan arrastrando una tarjeta: selección/rechazo/espera pasan por la decisión estructurada.

## Acceso

Las vistas `gestion.hiring*` controlan visibilidad de rutas. Cada reader y command vuelve a exigir capabilities `hiring.*`; `hiring.application.decide` usa acción `execute`. No se concede a roles `client_*`.

## Estados y límites

La interfaz diferencia loading, vacío inicial, filtros sin resultados, error recuperable, write optimista/rollback y dependencia degradada. La UI candidate-facing para rendir tests quedó implementada en TASK-1363; captura/reveal documental completo sigue en TASK-1362.

## Handoff downstream (TASK-356)

Cuando una postulación se decide como **seleccionada**, Greenhouse materializa automáticamente (vía el pipeline reactivo) un **handoff**: una ficha auditable que dice "esta persona fue seleccionada para este destino" y espera aprobación humana. Nada se contrata solo: aprobar el handoff no crea colaboradores ni asignaciones — entrega la solicitud al equipo receptor (HRIS para contratación interna, Staff Augmentation para placements). El equipo receptor confirma el cierre con evidencia (referencia del colaborador o placement creado).

- Un rechazo, un respaldo o una espera **nunca** generan handoff.
- Si la decisión cambia después de aprobar el handoff, este se **bloquea** para revisión humana en lugar de sobrescribirse en silencio.
- Los destinos que aún no tienen equipo receptor en Greenhouse (contractor, partner, reasignación interna) nacen bloqueados con motivo visible, nunca en silencio.
- Para contratación interna, el **bridge de activación** (TASK-770) toma el handoff aprobado y crea la ficha de colaborador **sobre la misma persona** (nunca una identidad nueva), en estado "pendiente de intake" — invisible para nómina hasta que HR completa la ficha por Workforce Activation. El cierre siempre exige evidencia (la ficha creada) y los conflictos de identidad quedan bloqueados para revisión humana, nunca se fusionan solos.
- Application 360 muestra el handoff real cuando la decisión es `selected` + destino `internal_hire`. Si el handoff está pendiente y el actor tiene `hiring.handoff.approve`, puede aprobarlo desde la pestaña **Decisión**; si está aprobado o en ejecución, **Abrir Activation Lane** lleva a `/hr/onboarding?lane=hiring-activation&applicationId=...&handoffId=...`.
- La Activation Lane de TASK-1368 es la UI People Ops de N11. Consume el bridge de TASK-770 y el resolver de blockers de TASK-1400; si el target todavía no está en la cola, muestra estado honesto en vez de seleccionar otro caso.

## Referencias

- Arquitectura: `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- Task: `docs/tasks/in-progress/TASK-355-hiring-desk-internal-workspaces-publication-governance.md`
- Manual: `docs/manual-de-uso/hr/operar-hiring-desk.md`
