# Hiring Desk

## Qué es

Hiring Desk es el espacio interno para operar la demanda de talento, el pipeline de postulaciones, la ficha 360 y la publicación de vacantes desde el dominio canónico Hiring / ATS. No crea candidatos, openings ni decisiones paralelos: consume `TalentDemand`, `HiringOpening` y `HiringApplication`.

## Superficies

- **Demanda:** KPIs del pipeline, filtros y tabla de openings. `Nueva demanda` crea demanda + opening en borrador; publicar sigue siendo una acción explícita.
- **Pipeline:** seis lanes visuales sobre las etapas canónicas. Una tarjeta representa una `HiringApplication`; se mueve por drag o por menú de etapa y vuelve a su posición anterior si el write falla.
- **Application 360:** resumen con PII enmascarada, assessment/scorecard advisory, documentos, decisión estructurada, handoff bridge hacia Activation Lane y actividad append-only.
- **Publicación:** compara la verdad interna con el payload público allowlist y confirma publicar, pausar o cerrar.
- **Distribución externa:** una vez que el opening está publicado, el equipo puede difundir su URL de postulación en canales aprobados. Es una actividad de inbound recruiting, no una segunda publicación de Hiring: no altera `HiringOpening`, no reemplaza el apply canónico y debe conservar evidencia de grupo/canal y estado de moderación.

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
3. Greenhouse crea `hiring_assessment`, evita duplicados abiertos por aplicación/plantilla y emite el acceso
   sólo por un transporte token-sensitive. El token crudo se revela una vez y luego sólo existe su hash.
4. Hoy el sender conserva el enlace legacy porque `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED` está OFF.
   El corte futuro intercambia `#access=<token>` por una cookie segura y deja cargar, iniciar, guardar y enviar
   sin bearer en la URL. Ese código está validado, pero su rollout sigue pendiente.
5. El autosave llama `saveResponse`; el submit exige que todas las preguntas públicas tengan respuesta guardada y que la instancia siga `in_progress`.
6. Application 360 carga el review interno por `GET /api/hiring/assessments/[id]`: scorecard, módulos, respuestas abiertas, rúbrica interna y sugerencias IA si existen.
7. El humano confirma/ajusta score por respuesta y finaliza el scorecard. El rollup actualiza el headline advisory en `hiring_application`.
8. La decisión se toma en `Decisión`, no en el scorecard.

## Endpoints y capabilities principales

- `POST /api/hiring/assessments`: asigna template a postulación. Requiere `hiring.assessment.author`.
- `GET /api/hiring/assessments?applicationId=...`: lista instancias de la postulación. Requiere `hiring.assessment.read`.
- `GET /api/hiring/assessments/[id]`: detalle de review interno. Requiere `hiring.assessment.read`.
- `POST /api/hiring/assessments/[id]/score`: registra/cierra score humano. Requiere `hiring.assessment.score`.
- `GET/POST /api/public/assessment/[token]`: compatibilidad pública legacy mientras el cutover siga OFF.
- `/api/public/assessment/access/exchange` y `/api/public/assessment/session`: boundary de sesión pública
  futuro; no usa sesión de dashboard y todavía no está habilitado en producción.
- `POST /api/hiring/openings/[id]/ai/propose-public-copy` (TASK-1385): la IA propone un borrador del copy público del aviso (título, resumen, descripción, requisitos, tags) desde inputs seguros — nunca ve presupuesto, tarifas ni notas internas. Requiere `hiring.opening.ai_assist` y el flag `HIRING_VACANCY_AI_ENABLED`. El borrador se confirma (editable) por `POST /api/hiring/assessments/ai/proposals/[id]/confirm` con `hiring.opening.write`; publicar sigue siendo la acción humana de siempre. **Desde TASK-1422 esto tiene UI en la pestaña Publicación**: botón `✨ Redactar con IA` en la columna pública del diff → drawer con el bloque "Lo que la IA verá", formulario editable y Aplicar/Descartar (manual: `docs/manual-de-uso/hr/operar-hiring-desk.md`).

No crear instancias por SQL, no leer tokens desde logs y no exponer rúbricas/answer keys al browser candidato.
Para pérdida o falla de acceso, se recupera el mismo assessment; nunca se crea otro. La capacidad está
code-complete y pendiente de rollout: [Entrega y recuperación de acceso a tests](entrega-y-recuperacion-de-acceso-a-tests.md).

## Reglas de negocio

- La IA puede sugerir un score; una persona lo confirma o edita antes de que cuente. El scorecard orienta y nunca rechaza automáticamente.
- La IA también puede redactar el borrador del aviso público de una vacante (TASK-1385): propone solo texto desde datos seguros, con lenguaje neutro y sin señales de género/edad; una persona lo revisa, edita y confirma. La IA nunca escribe el opening ni publica.
- La decisión exige motivo humano estructurado, soporta re-decisión con supersede y conserva historial append-only.
- Publicación solo expone `buildPublicOpeningPayload()`; compensación, notas y riesgo internos no se publican.
- La difusión en grupos externos usa únicamente el copy público aprobado y requiere confirmación humana. Un resultado `enviada a aprobación` no equivale a una publicación visible; cada destino se registra y se verifica antes de reintentar. Manual: `docs/manual-de-uso/hr/operar-careers-publicas.md` §Difundir una vacante publicada.
- El correo agregado permanece enmascarado. Los archivos de CV/portafolio se abren desde el panel
  **Documentos** dentro del portal; un documento de identidad sí exige el reveal auditado de
  `TASK-1714` (`hiring.candidate.reveal_identity`, motivo y trazabilidad). Un error del reader no
  equivale a “sin documentos”.
- Los outcomes terminales no se alcanzan arrastrando una tarjeta: selección/rechazo/espera pasan por la decisión estructurada.

## Acceso

Las vistas `gestion.hiring*` controlan visibilidad de rutas. Cada reader y command vuelve a exigir capabilities `hiring.*`; `hiring.application.decide` usa acción `execute`. No se concede a roles `client_*`.

## Estados y límites

La interfaz diferencia loading, vacío inicial, filtros sin resultados, error recuperable, write optimista/rollback y dependencia degradada. La UI candidate-facing para rendir tests quedó implementada en TASK-1363; el panel documental real y el reveal de identidad del candidato corresponden a TASK-1715 y TASK-1714, respectivamente.

## Handoff downstream (TASK-356)

Cuando una postulación se decide como **seleccionada**, Greenhouse materializa automáticamente (vía el pipeline reactivo) un **handoff**: una ficha auditable que dice "esta persona fue seleccionada para este destino" y espera aprobación humana. Nada se contrata solo: aprobar el handoff no crea colaboradores ni asignaciones — entrega la solicitud al equipo receptor (HRIS para contratación interna, Staff Augmentation para placements). El equipo receptor confirma el cierre con evidencia (referencia del colaborador o placement creado).

- Un rechazo, un respaldo o una espera **nunca** generan handoff.
- Si la decisión cambia después de aprobar el handoff, este se **bloquea** para revisión humana en lugar de sobrescribirse en silencio.
- Los destinos que aún no tienen equipo receptor en Greenhouse (contractor, partner, reasignación interna) nacen bloqueados con motivo visible, nunca en silencio.
- Para contratación interna, el **bridge de activación** (TASK-770) toma el handoff aprobado y crea la ficha de colaborador **sobre la misma persona** (nunca una identidad nueva), en estado "pendiente de intake" — invisible para nómina hasta que HR completa la ficha por Workforce Activation. El cierre siempre exige evidencia (la ficha creada) y los conflictos de identidad quedan bloqueados para revisión humana, nunca se fusionan solos.
- Application 360 muestra el handoff real cuando la decisión es `selected` + destino `internal_hire`. Si el handoff está pendiente y el actor tiene `hiring.handoff.approve`, puede aprobarlo desde la pestaña **Decisión**; si está aprobado o en ejecución, **Abrir Activation Lane** lleva a `/hr/onboarding?lane=hiring-activation&applicationId=...&handoffId=...`.
- La Activation Lane de TASK-1368 es la UI People Ops de N11. Consume el bridge de TASK-770 y el resolver de blockers de TASK-1400; si el target todavía no está en la cola, muestra estado honesto en vez de seleccionar otro caso.

## Las seis etapas del pipeline, y por qué el candidato lee otro nombre (TASK-1754)

El tablero muestra **seis columnas**, y desde 2026-08-22 el dominio tiene una etapa por columna.
Antes tenía trece, y tres de ellas —`qualified`, `shortlisted` y `client_review`— se mostraban todas
como «Evaluación». Ese desajuste no era cosmético: la automatización de assessment vigila
`shortlisted`, pero mover una tarjeta a «Evaluación» guardaba `qualified`. Quince vacantes tenían su
política configurada y ninguna disparaba; dos candidatas reales cruzaron esa columna el 2026-08-19 sin
recibir su prueba, y en pantalla no se veía nada raro.

| Columna | Etapa | Qué significa | ¿Dispara la prueba? |
|---|---|---|---|
| Sourced | `sourced` | Entró al pipeline, sin revisar | no |
| Screening | `screening` | En revisión inicial | no |
| **Evaluación** | `shortlisted` | Se evalúa con evidencia (prueba, muestra de trabajo) | **sí** |
| Entrevista | `interview` | En conversación con el equipo | opcional |
| Decisión | `decision_pending` | Evaluada, esperando desenlace | no |
| Cerrado | `closed` | El recorrido terminó; el desenlace dice cómo | no |

`qualified` y `client_review` se absorbieron en `shortlisted`. Es un colapso **con pérdida
declarada**: ninguna postulación conserva de cuál de las tres venía. Se aceptó porque ninguna de las
dos absorbidas fue jamás elegible desde una superficie —los movimientos humanos a «Evaluación» caían
todos en `qualified` sin que nadie pudiera elegirlo—, así que no había intención humana que preservar.

### «Preselección» en el correo y «Evaluación» en el tablero son a propósito

El correo de avance al candidato llama a `shortlisted` **«Preselección»** («Shortlist» en inglés),
mientras el desk la llama **«Evaluación»** («Evaluation»). **No es drift y no hay que alinearlo.** Es
una decisión del operador del 2026-08-22, por dos razones:

1. Hacia afuera el registro es más suave: «te preseleccionamos» dice algo sobre el avance de la
   persona; «estás en evaluación» la deja en un estado sin promesa.
2. «Evaluación» en el correo chocaría con el correo del test, que ya dice *«tienes una evaluación
   pendiente»*. En inglés esa colisión no existe (`assessment` ≠ `evaluation`), pero la divergencia se
   mantiene espejada para que las dos versiones digan lo mismo.

Un agente que lea las dos capas y las «arregle» reintroduce esa colisión. La divergencia está anotada
en el código, en los dos diccionarios de copy y acá.

### Lo que todavía no está hecho

Los cinco literales terminales del enum de etapas (`selected`, `backup`, `rejected`, `withdrawn`,
`handoff_ready`) siguen existiendo aunque ninguna superficie los escriba: el command de decisión ya
escribe siempre `closed`. Se retiran cuando el eje de desenlace (`TASK-1765`) esté verificado en
producción — antes de eso se perdería el último discriminante de cómo terminó un proceso. Mientras
tanto, el tablero los sigue agrupando en «Cerrado» para que ninguna tarjeta histórica desaparezca.

> Detalle técnico: ADR `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md`
> · enum en `src/types/hiring.ts` · nombres visibles en `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts`
> · allowlist del correo en `src/lib/hiring/notifications/stage-policy.ts`.

## Datos de contacto del candidato (TASK-1688)

Desde 2026-08-12, cada postulación nueva del apply público (formulario estándar o Growth Form
nativo) guarda tres datos que antes se perdían:

- **Teléfono** (opcional, formato internacional E.164) y **país de residencia** (obligatorio,
  autodeclarado por el candidato) — viven en el perfil de la persona candidata y se conservan
  entre postulaciones. El país NUNCA se deduce del prefijo telefónico.
- **Mensaje del candidato** (opcional, hasta 4.000 caracteres) — pertenece a esa postulación
  específica.

Desde el 2026-08-12 el país de residencia es obligatorio también en el servidor (flip de
contrato): una postulación que llegue sin país válido se rechaza con un error genérico, aunque
provenga de un formulario que no muestre el campo.

Los tres se leen únicamente en la Postulación 360 (bloque "Perfil del candidato"), sólo para
usuarios internos autorizados. Las postulaciones históricas muestran "No informado": no se
rellenan con suposiciones. Estos datos son PII interna y no aparecen en vistas públicas,
portales de cliente, analítica ni exportaciones.

## Referencias

- Arquitectura: `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- Task: `docs/tasks/complete/TASK-355-hiring-desk-internal-workspaces-publication-governance.md`
- Manual: `docs/manual-de-uso/hr/operar-hiring-desk.md`
