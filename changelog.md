# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al

## 2026-08-18 — Evaluación provisional automática y CV por MCP interno

- Los assessments elegibles de cualquier vacante generan ahora evaluación IA provisional en segundo plano para
  operadores. No cambia el score efectivo y el postulante no recibe resultado, rationale ni estado de revisión.
- El expediente auto-propone análisis con CV procesado + assessment puntuado; la confirmación sigue siendo humana.
- Los agentes internos pueden leer el review packet exacto por MCP con CV minimizado/redactado y ligado a hash.
  Sin contacto, PDF crudo, ranking, decisiones, writes ni acceso B2B.
- La UI operator-only quedó compactada y validada GVC 4,82/5; su último ajuste visual aún espera promoción
  ordinaria. TASK-1742/1718 conservan observación, rollback y firmas pendientes.

## 2026-08-18 — Un dato de prueba de Hiring ya no puede hacerse pasar por un candidato real

- **La procedencia ahora es un hecho declarado, no una adivinanza.** Cada persona y cada vacante dice
  si representa algo del mundo real, y la postulación lo hereda de ambas. Antes la única forma de
  distinguir un seed de un candidato era adivinar por el nombre, y esa adivinanza falla en las dos
  direcciones: hay una respuesta REAL de un candidato que dice "pequeñas pruebas o pilotos" y que un
  barrido por regex habría borrado como basura.
- **Omitir la declaración deja el dato visible, nunca oculto.** Es deliberado: la suciedad es molesta
  y evidente; perder un candidato real sería grave e invisible.
- **Una vacante de prueba ya no se puede publicar.** Ocho llegaron a estar publicadas en el careers
  real y que ningún candidato externo postulara fue suerte. La guarda bloqueó el día uno al smoke que
  las creaba, que además nunca limpiaba lo que dejaba.
- **La IA deja de poder calibrarse contra respuestas inventadas.** El gold set excluye datos sintéticos
  sin interruptor para volver atrás: es evidencia de un gate de promoción, no una preferencia.
- **El desk podrá dejar de contar fantasmas**, detrás de un flag que nace apagado y con aviso previo a
  HR, porque 12 de 14 vacantes son sintéticas y sin contexto eso se lee como pérdida de datos.

## 2026-08-18 — Los dos flags que quedaron "ON con pendiente" ya tienen su verificación hecha

- **Canary de identidad del intake (TASK-1736), ejecutado y verde.** Los 5 puntos del runbook contra PG
  real: la evidencia guarda el nombre EXACTO como lo escribió la persona, la clasifica `degenerate_lower`
  y propone la versión capitalizada; la Person queda con esa propuesta y no con el verbatim; el audit
  registra `reconcile/applied`; un segundo envío en MAYÚSCULAS no duplica a la persona y deja el outcome
  del CAS; un reenvío idéntico no agrega evidencia. **Cero correos** emitidos.
- **El canary NO se corre contra una vacante real, y ahora el runbook lo dice.** Hacerlo mete un candidato
  falso en el pipeline de una vacante viva (llevaban 15 y 33 candidatos) y dispara el aviso a People. Peor:
  la evidencia es **append-only por grant**, así que ese candidato falso **no se puede borrar** — queda
  pinneado por FK hasta que un humano purgue con perfil `ops`. El carril correcto es un live test opt-in
  sobre una vacante desechable propia, que se despublica sola.
- **Expediente de evaluación (TASK-1735): el arreglo del truncado quedó probado con el caso real.** La nota
  posterior al fix persistió sus 8240 caracteres completos —termina en punto— contra los 8000 exactos de la
  mutilada, y la vieja quedó enlazada como *versión superada*, no como vigente. El límite en base ya es 20000.
- **Una señal que iba a mentir para siempre.** `evidence_coverage_gap` contaba TODAS las postulaciones, pero
  la evidencia sólo la escribe el intake público: cada postulación cargada a mano desde el desk (6 en 30 días)
  la habría dejado en `warning` de forma permanente, sobre la señal que justamente gatea este rollout.

## 2026-08-18 — Careers público en producción: una vacante que se lee como una oferta, y que Google entiende

- **Lo que ve ahora un candidato.** El detalle de una vacante dejó de ser un bloque de prosa con
  requisitos: hoy abre con la promesa del rol y sigue con qué resultados se esperan, cómo es el trabajo
  real, qué es imprescindible, qué es deseable y **qué puede aprender ahí** — separado a propósito, para
  que nadie se autodescarte por algo que el rol enseña. Lee además cuánto dura el proceso y **en qué
  plazo tendrá respuesta: 3 a 4 semanas**, avance o no. Y ve la vinculación sin letra chica: en Chile
  contrato laboral local; fuera de Chile, vía internacional con pago directo de Efeonce, sobre 20 países
  elegibles (toda Latinoamérica salvo Cuba, más Estados Unidos y España). Las dos vacantes vivas ya están
  escritas así.
- **Lo que ve Google.** Cada vacante publicada emite `JobPosting` estructurado, construido desde el mismo
  contenido visible en la página — nunca desde datos que la persona no puede leer. El schema **pasó la
  validación externa de `validator.schema.org` con 0 errores y 0 advertencias**. Una vacante remota sin
  países declarados sigue sin emitir schema, a propósito: es preferible no aparecer a aparecerle a alguien
  a quien no podemos contratar. Pausar o cerrar una vacante la retira del aire y del schema en el mismo acto.
- **Republicar una vacante viva ya no la saca del aire.** La barra editorial se exige al publicar por
  primera vez, no al volver a publicar: antes, pausar una vacante con postulantes en proceso la habría
  dejado en 404 hasta reescribir su contenido completo.

## 2026-08-17 — TASK-1740: una vacante pública tiene contenido estructurado y schema honesto

- **El contenido candidate-facing deja de vivir sólo en prosa parseada.** Un opening puede declarar
  el bloque versionado `PublicOpeningContent` v1 (promesa, resultados, trabajo, essentials/learnables,
  evidencia, modelo remoto, proceso, beneficios y compensación estructurada opcional). Se escribe por
  el command canónico con validación estricta (422); su ausencia degrada al fallback legacy de prosa,
  nunca a huecos. La allowlist pública sigue siendo la única puerta al navegador (anti-leak extendido).
- **El schema de Google nace del mismo contenido visible y es fail-closed.** Canonical explícito en
  toda leaf publicada; `JobPosting` JSON-LD detrás de `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED`
  (Vercel-only, nace OFF). Remoto exige países elegibles ISO reales
  (`public_remote_eligible_countries` — `LATAM`/`Global` se rechazan como país); híbrido/presencial
  exige ciudad+país; salario sólo desde compensación estructurada; nunca `directApply` ni
  `validThrough`. Pausar/cerrar retira URL y schema (404). Hoy ninguna vacante viva emite schema
  (ambas son remotas `LATAM` sin país declarado) — comportamiento correcto por diseño.
- Estado: `code complete, rollout pendiente` (países por confirmar con People/Legal, flag
  staging→Rich Results→prod). TASK-1741 (renderer editorial) queda desbloqueada con fixture.

## 2026-08-17 — Backlog de Careers: contenido público/JobPosting y renderer editorial separados

- Se registran `TASK-1740` y `TASK-1741` para mejorar el detalle de una vacante sin una regresión de
  aplicación. La primera posee proyección pública allowlist-safe, fallback legacy, lifecycle,
  canonical y `JobPosting` coherente con el HTML visible; no implementa Indexing API ni inventa
  países, salario, beneficios o `directApply`.
- La segunda consume ese contrato para un renderer `Editorial dossier` incremental de
  `/public/careers/[publicId]`, con baseline/GVC desktop+móvil y flag reversible. El formulario no
  cambia y se conservan exactamente los CTA existentes del hero y resumen; no se añade CTA final.
- Sin cambio runtime: son tasks de diseño/ejecución futura. El contrato de contenido y el schema se
  implementan antes del render.

## 2026-08-17 — Se pueden otorgar ajustes razonables en las evaluaciones

- **Tiempo extra para quien lo necesita.** Hasta ahora el campo existía en el sistema pero **nadie
  podía escribirlo**: 17 evaluaciones, las 17 sin ajuste, porque no había forma de concederlo. La
  única salida era alargar el límite de la plantilla, que se lo alarga a todos. Ahora People puede
  conceder entre 1 y 180 minutos a una persona concreta, **incluso mientras está rindiendo** — el
  contador se le alarga en el momento.
- **El motivo no se guarda, a propósito.** Un ajuste revela una condición de salud o discapacidad:
  dato protegido. Guardarlo sería crear el registro con el que después se discrimina. Se guarda sólo
  el arreglo. La constancia narrativa va al expediente de evaluación, que tiene su propio control.
- **El correo de la prueba ahora invita a pedirlo**, en español e inglés, y dice explícitamente que
  no hay que explicar por qué. Sin esa línea sólo preguntan quienes ya se sienten con derecho a
  hacerlo, que es justo el sesgo que el ajuste existe para corregir.
- Otorgarlo requiere ser People: no alcanza con poder autorar evaluaciones.

## 2026-08-17 — TASK-1719: la vacante declara su prueba y una sola pieza decide qué recibe el candidato

- **La vacante declara su plantilla una vez y Greenhouse la resuelve sola.** Quien asigna ya no elige
  plantilla: confirma. El camino manual es proponer→confirmar, atado por una huella del efecto que se
  mostró y con vencimiento de 30 minutos **enforceado server-side** — si algo cambia en el medio o
  pasa demasiado tiempo, el confirmar se rechaza en vez de ejecutar algo distinto de lo aprobado.
- **Un avance de etapa produce UNA comunicación: ni cero ni dos.** El consumer
  `hiring_stage_changed_candidate_comms` **reemplaza** a `hiring_stage_changed_email` (TASK-1689) y
  decide: correo de la prueba si se asigna, aviso genérico si la asignación se detuvo. Nunca se le
  promete al candidato una prueba que no existe. La etapa que se comunica es la vigente en la base,
  nunca la del payload — el consumer reactivo coalescea y pierde las intermedias.
- **Cancelar una prueba no iniciada libera el cupo** y permite reasignar: es recuperación real, no
  sólo un cierre. El enlace muere de inmediato y responde igual que cualquier enlace inválido. Si el
  correo ya había salido, la plataforma lo declara para que una persona avise — no manda correcciones
  automáticas sin texto aprobado. Una prueba cancelada no entra al expediente de evaluación.
- **Se archivaron dos plantillas de Content Creator que eran irrenderizables** (una entregaba 5
  preguntas para 8 módulos, con 45% del peso sin instrumento). El módulo sin preguntas no desaparecía:
  el candidato veía la sección vacía y el examen encogido se enviaba sin error. Señal nueva
  `hiring.assessment.template_module_without_questions` para que la clase no vuelva a pasar inadvertida.
- Runtime: la asignación automática nace **apagada** (`HIRING_STAGE_TEST_ASSIGNMENT_ENABLED`, sólo
  ops-worker). Con el flag OFF el comportamiento visible es el mismo de antes.

## 2026-08-17 — Baseline global de beneficios para vacantes Efeonce documentado en las skills

- Las skills espejo de Talent y Payroll incorporan el `Efeonce Candidate Benefits Charter` para comunicar en
  todas las vacantes una política global: 15 días hábiles de vacaciones remuneradas más un día por cada año
  continuo cumplido hasta 20, dos días flotantes, 16 horas de atención médica, dos días de bienestar, duelo,
  deber cívico, matrimonio/unión civil, 10 semanas para la madre/persona que da a luz y 2 para el padre/progenitor no gestante (adopción/cuidado: 4/2), mudanza, desarrollo, apoyo remoto y feriados corporativos chilenos aparte de vacaciones.
  La ley local puede mejorar ese piso, nunca reducirlo. La carta diferencia esta política candidato-facing del
  runtime actual de Leave y del instrumento contractual/proveedor que Payroll/Legal debe validar. También
  define devengo, arrastre, familia, retorno postparto, cobertura, equivalencia contractor y wallets de
  aprendizaje (US$500/año), conectividad/coworking (US$50/mes) y salud mental (US$300/año). El aporte de
  equipo (US$400/36 meses) continúa como política, pero se revela durante entrevista u oferta, no en el copy
  estándar de vacantes. Sin cambio de runtime, schema, contratos ni configuración de permisos.

## 2026-08-17 — Vacantes públicas e inbound recruiting reforzados en la skill de Talent

- Las skills espejo de Talent para Claude/Codex ahora exigen evidence packet, benchmark actual,
  claim ledger y condiciones explícitas para roles remotos/globales antes de redactar una vacante.
  La nueva referencia documenta evidencia y límites para atracción, realistic preview, inclusividad,
  roles creativos senior, aplicación de baja fricción, candidate experience, Talent Pool consentido,
  compensación, distribución y experimentación por quality-of-hire. Sin cambio de runtime ni de
  política de beneficios.

## 2026-08-17 — Cierre del programa Hiring: Expediente + Scoring IA + Identidad (TASK-1734/1735/1736/1737/1738)

- Hiring: cierre documental del programa. Las 5 tasks quedan `complete` con estado honesto y las
  dos ADRs pasan a **`Accepted`** — la decisión fue autorizada por el CEO e implementada.
  **Aceptar no es prender:** el rollout de cada flag manda y vive en el ledger.
- Hiring: **remediación de nombres EJECUTADA** el 2026-08-16 — 3 personas reales corregidas
  (Valentina Villa, Stana Medina, Aldo Romano) con actor + razón en auditoría, 2 perfiles QA
  podados a mano. Los docs que citaban "4 propuestas = 2 humanos" quedaron corregidos.
- Hiring: `HIRING_EVALUATION_DOSSIER_AI_ENABLED` y
  `HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED` quedan **ON en staging** (2026-08-16, CEO) y
  **OFF en producción**. El ledger decía OFF en todos lados: corregido contra `vercel env ls`.
- Hiring: **el gate del gold set ya no está bloqueado por instrumento, sino por volumen.** El
  muestreo real encontró **11 respuestas humanas calificadas contra un piso de 49**: falta DATA,
  no personas. El carril uno-a-uno es el modo correcto hoy porque es el que genera esa materia
  prima; el instrumento (muestreo estratificado + rúbrica BARS + protocolo en ciego) se entrega
  vacío y ningún agente puede llenarlo.
- Hiring: el expediente ya no trunca en silencio (límite **20.000**, error explícito en vez de
  recorte) y la nota reparada se lee como historia con chip **"Versión superada"**.

## 2026-08-17 — Workbench de scoring IA + escala explícita de criterios (TASK-1738, TASK-1734)

- Hiring: el **workbench de revisión del scoring IA** queda operable desde la card del assessment
  en la Application 360 — cobertura honesta sticky, cola por riesgo, muestra ciega real (la
  propuesta no llega al navegador) y confirmación con manifest. Revisar deja de ser solo API.
- Hiring: **la escala de `perCriterion` ahora es explícita.** Los criterios son aportes ponderados
  que suman el score global (`18 / 25`), no notas independientes: el prompt lo pide
  (`...scoring.v2`), el contrato lo valida y el router de riesgo compara contra lo que el contrato
  garantiza. La señal `per_criterion_contradictory` disparaba en 11 de 14 items reales — justo en
  las respuestas buenas — y dejaba muerto el carril por lote; ahora dispara en 2, que son
  contradicciones reales.
- Hiring: el resumen del manifest dejó de mostrar siempre 100% (`{a}/{a}`) y las frases
  load-bearing del workbench pasaron a tinta AA.

## 2026-08-16 — Tab Expediente en la Application 360 (TASK-1737)

- Hiring: el tab "Actividad" pasa a ser **Expediente** — timeline de notas persistidas con
  provenance del agente intercalado con eventos de etapa, composer tipado y flujo
  propose → editar → confirmar/rechazar del análisis IA. Deep-links `?tab=activity` intactos.
- Hiring: **gate anti-anclaje cerrado server-side.** Un evaluador con scorecard propio abierto
  deja de recibir el análisis IA y las notas de evaluación ajenas — el filtro vive en el reader
  con el MISMO predicado del anti-anclaje de ratings; sus notas propias y las `general` ajenas
  siempre pasan. La ceguera no es de la pantalla: cualquier consumer futuro la hereda.
- Rollout gated: flag `HIRING_EVALUATION_DOSSIER_AI_ENABLED` sigue OFF en producción (la UI lo
  declara honestamente); evidencia visual del panel de propuesta pendiente de staging.

## 2026-08-16 — Identidad de intake canonicalizada completa (TASK-1736)

- Hiring: cierre del trío del día — TASK-1736 complete con remediación gobernada
  (dry-run → allowlist humana → apply CAS → rollback real), señales de reliability y
  runbook. Flag OFF; 4 nombres históricos esperan la allowlist del operador.

## 2026-08-16 — Scoring IA de assessments a escala (TASK-1734) + intake de identidad (TASK-1736 S0-S2)

- Hiring: run asíncrono gobernado de scoring IA por assessment — propone todos los scores
  abiertos, enruta por riesgo (mandatory/muestra ciega estructural/batch), confirmación humana
  por lote con manifest auditable; gate de promoción bloqueante hasta gold set humano. Flags
  OFF; rollout por runbook.
- Hiring: intake de identidad — normalización culturalmente segura del nombre (evidencia raw
  inmutable + display corregible + searchKey), reconciliación CAS del sticky name y corrección
  humana capability-gated. Flag OFF.
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-08-16 — Pipeline Hiring contenido en un plano operacional

- El selector de vacante y el conteo se integran al encabezado canónico; búsqueda, ayuda y Kanban comparten una
  sola superficie blanca, con lanes tonales internas y tarjetas como elementos dominantes.
- El selector conserva títulos completos en 390 px; se corrigieron nombres accesibles y contraste del scope.
- Evidencia local desktop/mobile: `.captures/2026-08-16T22-13-39_task355-hiring-pipeline-board` (0 findings GVC).

## 2026-08-16 — Radar de assessment legible y honesto

- Application 360 reemplaza el radar SVG manual por Recharts sobre el wrapper tipográfico canónico.
- Los ejes muestran etiquetas humanas sin cortar palabras; una guía visible conserva los nombres completos,
  puntajes y objetivos, con leyenda explícita y adaptación a 390 px.
- Un scorecard parcial ya no convierte competencias pendientes en cero ni dibuja un perfil engañoso.
- Evidencia local desktop/mobile: `.captures/2026-08-16T19-02-20_task1363-assessment-radar-runtime`.

## 2026-08-16 — Hiring Desk contenido en planos canónicos

- Hiring Desk y Application 360 migran su chrome compartido a `SurfaceRecipe`, `WorkbenchHeader`, breadcrumbs y `DetailHero`; el gris queda reservado como gutter.
- Navegación global y tabs locales corrigen su semántica y teclado; la evaluación elimina card-on-card y compacta la cola sin pendientes.
- Evidencia local desktop/mobile: `.captures/2026-08-16T21-30-17_task1363-assessment-radar-runtime`.

## 2026-08-16 — Expediente de Evaluación SMART (TASK-1735) + fix scorecard parcial (ISSUE-159)

- Hiring: nueva capa de expediente per-application — notas append-only tipadas + borrador de
  análisis CV↔assessment generado por IA (claude-sonnet-5) con confirmación humana obligatoria.
  APIs `/api/hiring/applications/[id]/notes` y `/dossier`; capability `hiring.application.annotate`;
  flag `HIRING_EVALUATION_DOSSIER_AI_ENABLED` OFF (rollout pendiente).
- Application 360: el scorecard ya no muestra un promedio parcial como resultado final — estado
  "Parcial · X de Y competencias corregidas" mientras haya respuestas por corregir (ISSUE-159).
- Storage: timestamps del asset mapper corregidos (bug latente TASK-1718).
- TASK-1734: ADR del scoring IA a escala aceptado como Proposed (Slice 0), con autorización
  ejecutiva del CEO registrada.

## 2026-08-16 — TASK-1736 registrada para canonicalizar el intake de candidatos

Se agregó a `EPIC-011` una task backend-critical para separar el nombre submitted por aplicación, el display
person-first normalizado/corregible y una search key versionada; ambas entradas públicas deberán usar el mismo
primitive. La remediación histórica queda limitada a ADR y sign-offs previos, detector read-only, dry-run,
allowlist humana, compare-and-set, audit y rollback ensayado. No hubo implementación, migración ni cambios de datos.

## 2026-08-16 — Sincronización documental y de skills del Talent Pool

Después del rollout productivo se auditó todo el contrato construido en la sesión: arquitectura Hiring, API reference,
manual operativo, EPIC-011/038, TASK-1718/1723/1724/1725, ledgers de flags/releases, `project_context` y README/registry.
Las skills espejo `.codex`/`.claude` de Talent, MCP y release quedaron alineadas con el runtime real. Se preservaron los
límites: CV/review por MCP y automatización de tests continúan OFF; invite/self-service sólo operan mediante consentimiento
explícito, confirmación tokenizada y rollback por flags. Sin cambios de código ni schema en este barrido.

## 2026-08-16 — Talent Pool self-service e invitación gobernada habilitados en producción

Por autorización explícita del CEO, los flags `HIRING_TALENT_POOL_SELF_SERVICE_ENABLED` y
`HIRING_TALENT_POOL_INVITE_ENABLED` quedaron en `true` en Vercel Production y el consumer de confirmación quedó
declarado en `ops-worker`. El cambio se promovió por PR #197 y el orquestador `31953851353`, con preflight break-glass
auditado por el único archivo `services/ops-worker/deploy.sh` que toca `cloud_release`; no hubo migraciones nuevas.

Evidencia live: Vercel redeploy `dpl_CTxG3tx66S159tazMSyNiGSmqzHJ` `READY`, health 200, CI/CI Deep/Playwright verdes,
workers Ready y watchdog `aggregateSeverity=ok`/`drift_count=0`. El endpoint tokenizado conserva el anti-oracle
`404 talent_pool_link_unavailable` para tokens inválidos y la API interna sin sesión responde `401`. No se envió correo a
un candidato real durante el flip; el primer correo real debe verificarse con un candidato de prueba controlado.
El opt-in futuro sigue siendo explícito, versionado y revocable; la revisión jurídica formal de copy, TTL y retención
queda como sign-off residual si la política interna la exige.

## 2026-08-16 — Cuenta candidata y `/my` longitudinal quedan formalizados en EPIC-011

Se aceptó la arquitectura para que una persona postule, reclame una cuenta y use `/my` antes de ser colaborador,
sin recrear su identidad ni copiar su ficha al ser seleccionada. El mismo principal y `identity_profile_id`
persisten; `candidate_facet` y `member` pueden coexistir y la activación laboral agrega capabilities sobre la misma
cuenta. `/my` pasa conceptualmente de “workspace de member” a espacio personal compuesto por capabilities, pero el
runtime actual permanece sin cambios hasta implementar las tasks.

El perfil profesional reusable será person-scoped —skills, herramientas, idiomas, certificaciones, links,
portfolio, evidencia y CV versionado— mientras cada `hiring_application` conserva su propio status publicado, CV
snapshot, respuestas del rol y expectativa económica. El estado candidato nunca deriva stages/notas/scores crudos
y una actualización del perfil no reescribe evidencia histórica.

Se agregaron el ADR y la arquitectura canónica, se actualizó `EPIC-011` y se registró el grafo `TASK-1727`–
`TASK-1733`: identidad/sesión, professional profile, application self-service, `/my` UI, activation continuity,
People 360 reader y People 360 UI. Las tasks UI tienen direction/wireframe/flow/motion iniciales y permanecen
`UI ready: no`; no se implementó código, schema, migración, flag ni rollout.

## 2026-08-16 — Banco de Talento person-first con autoservicio, Desk y paridad para agentes

Greenhouse ya tiene operativa en producción interna la fundación canónica del Banco de Talento: una sola ficha por persona,
consentimiento/purpose versionado, evidencia estructurada con lineage, disponibilidad, retiro, búsqueda y una
invitación gobernada `propose → confirm`. El backfill de desarrollo incorporó 52 perfiles históricos sin inventar
permiso futuro: 50 permanecen limitados a su proceso vigente y 2 requieren nuevo consentimiento.

La experiencia tiene dos caras separadas. El candidato puede confirmar interés futuro, actualizar disponibilidad o
retirarse mediante un enlace acotado; People opera un workspace propio en Hiring Desk con filtros, coverage,
freshness, ficha lateral y acceso exacto a Application 360. Ninguna de las dos superficies rankea, decide, mueve
etapas, asigna tests ni copia CV/contacto al índice.

La misma lectura existe como App API y como provider read-only live para `mcp.efeonce.org`, con identidad humana
delegada, capability, propósito fijo, DTO allowlisted y audit sin contenido. El canary OAuth obtuvo `200` en search y
profile; un cliente separado sin scope Hiring obtuvo `403`. Projection/search/MCP están ON. El recontacto y el
autoservicio externos permanecen OFF hasta aprobación People + Legal/Privacy de copy, propósito, TTL y retención.

El release inicial `a369165dfb2d`/run `31941320983` dejó búsqueda, proyección y MCP operativos. La promoción ampliada
`6b78b040252d`/release `6b78b040252d-d0d36c25-3634-4567-8be5-a807272e0ccb`/run `31949566099` terminó
`released`; Vercel, health, los cuatro workers y el watchdog quedaron verdes, con cero migraciones pendientes.
Durante el canary se detectó que la policy OAuth persistía `revalidateAfterSeconds=0` aunque el parser exige mínimo
`15`; una migración aditiva lo corrigió y agregó una prueba sobre el parser real antes de la promoción final. La
auditoría Talent posterior endureció además el rate guard público: IP ausente usa un bucket opaco compartido y una
caída del store niega la solicitud, en vez de abrir ilimitadamente el autoservicio futuro.

El operador ya puede abrir el CV exacto desde el sidecar del Banco. El packet agent-safe de TASK-1718 —reader por
postulación, proyección PDF minimizada, App API, OAuth/capability separados, auditoría y dos tools MCP read-only—
está desplegado pero completamente apagado, sin backfill ni lectura de CV real hasta completar sign-offs
Security/Privacy/Talent/Identity/MCP. La evidencia visual se rehízo sobre un harness sintético que no existe
en producción, después de comprobar que una máscara de diff no anonimiza los píxeles ni el árbol de accesibilidad.
También se retiró del theme la importación residual de Public Sans; el runtime conserva Poppins + Geist como familias
canónicas.

## 2026-08-15 — People queda avisado cuando un candidato termina su test

El evento canónico `hiring.assessment.submitted` ahora tiene un consumer idempotente que prepara un
correo interno a `people@efeoncepro.com` con candidato, vacante, hora de envío y acceso directo a la
postulación. Sólo acepta `candidate_test` realmente completados, nunca scorecards, y no interpreta
el resultado ni mueve al candidato de etapa. La migración quedó aplicada en Cloud SQL, la configuración
`hiring_assessment_submitted_internal` está habilitada y el release `0fe2420ed894` terminó en el
manifest `released` (run `31915501771`), con Vercel y watchdog verdes. No se ejercitó una entrega real
de candidato en este release; People/Operations debe verificar la primera entrega futura sin hacer
backfill del evento histórico.

La revisión read-only del test vigente de Content Creator confirmó 11 preguntas sobre 8
competencias, pesos que suman 100, límite de 90 minutos, cero prompts vacíos o duplicados, opciones
objetivas válidas y ninguna clave de respuesta o rúbrica en la proyección pública. Un recorrido
sintético sin correo completó además `assigned → in_progress → submitted`, probó el bloqueo por
respuestas pendientes, guardó las 11 respuestas, auto-calificó una y dejó diez en cola humana; el
fixture y sus eventos se eliminaron al terminar.

## 2026-08-15 — El CV del candidato se puede leer (y el candado se movió a donde protege)

El tab **Documentos** de la Application 360 pasó de mockup a superficie real. Antes mostraba tres
filas escritas a mano y un "Revelar" que sólo movía un `useState`: el motivo se descartaba y la
auditoría prometida no se escribía. Ahora consume el reader canónico en servidor y separa las dos
clases del modelo de dominio: **un archivo se abre** (la capability de la pantalla ya autorizó) y **la
identidad se revela** (capability propia + motivo + audit append-only, `TASK-1714`).

El CV se lee **dentro del portal**, en un diálogo sobre un blob same-origin. Se descartó `react-pdf`
con evidencia —no arranca bajo `next dev --webpack` porque `pdfjs-dist` v5 rompe el interop ESM, y aun
funcionando cuesta ~400 KB para hacer lo que el navegador ya hace— y el hueco de móvil se cierra por
**capacidad** (`navigator.pdfViewerEnabled`), no por viewport: cuando el navegador no embebe PDF, el
diálogo lo dice y ofrece salida, en vez de un marco en blanco.

Además dejan de aplastarse en "Enmascarado" los cuatro estados que el escáner sí distingue: un archivo
bloqueado por el antivirus y un candidato que nunca adjuntó CV se veían idénticos, así que el
reclutador culpaba al candidato por una falla del sistema.

Impacto operativo: quien opera Hiring ya no necesita pedir el CV por fuera del portal, y People Ops
tiene un camino auditado para el documento de identidad — antes ese dato salía por mail, sin
capability, sin motivo y sin trail.

Follow-up abierto: `TASK-1716` mide si el fallo de `react-pdf` alcanza producción (hoy sólo verificado
en desarrollo) y unifica las **tres** implementaciones de visor que conviven en el repo.

## 2026-08-15 — El portal dejó de mostrar el favicon de Vuexy antes del suyo

Durante unas dos semanas, cada carga del portal pintaba primero el ícono morado del template Vuexy y
recién después el isotipo de Greenhouse. El reporte llegó como "carga dos favicon", y la causa no
estaba donde uno la buscaría: el HTML servido siempre estuvo limpio, con una sola declaración
apuntando al SVG correcto.

Lo que pasó es que a fines de julio se borró el `favicon.ico` heredado de Vuexy —correcto— pero no se
lo reemplazó. La marca quedó declarada sólo como SVG desde el código del layout, y `/favicon.ico`
empezó a responder 404 devolviendo, además, la página de not-found completa: 105 KB de HTML en cada
carga del portal, para una ruta que el navegador pide de forma implícita **siempre**, sin importar lo
que declare el `<head>`. Mientras ese 404 resolvía y el navegador lo descartaba, la pestaña mostraba
el ícono que tuviera guardado de antes.

El arreglo pasa los tres íconos a la convención de archivos de Next (`favicon.ico` multi-tamaño,
`icon.svg`, `apple-icon.png`), los genera desde el SVG de marca con `pnpm branding:favicon`, y saca
la declaración duplicada del layout: teniéndola en ambos lados, compiten. Next ahora emite los links
solo, con huella de contenido, así que un cambio futuro del asset invalida el caché por sí mismo.

Vale la pena registrar por qué el síntoma sobrevivió a un primer intento de arreglo. Los navegadores
guardan los favicons en una base propia, separada del caché de páginas, que alimenta la barra de
direcciones y el historial y no se refresca ni con recarga forzada. El operador seguía viendo el
ícono viejo aunque el servidor ya sirviera el nuevo. De ahí el invariante que quedó escrito: al
verificar un favicon, no confiar en el navegador propio — verificar el `200 image/x-icon` en el
runtime y contar los `link[rel*=icon]` en el DOM.

## 2026-08-15 — Auditamos Descubrir con dos lentes y la pantalla dejó de prometer cosas que no cumplía (TASK-1665)

La lente se cerró ayer con la captura verde y el build en verde. Igual la pasamos por dos auditorías
independientes —una de arquitectura, otra del oficio SEO/AEO— y las dos dijeron lo mismo: el fondo
está bien, lo que fallaba era **cableado**. Capacidades que el motor ya servía y la pantalla no
pedía, y promesas que la interfaz hacía sin que el runtime las cumpliera.

Tres importaban de verdad. La primera: cuando el sistema rechazaba una corrida —cupo agotado,
proveedor caído—, el botón se ponía rojo y no decía por qué. El código tenía un comentario
tranquilizador que aseguraba que el detalle «lo cuenta la banda de estado», pero cuando el rechazo
ocurre no se crea ninguna corrida, así que esa banda sigue mostrando la anterior. El operador se
quedaba sin saber si reintentar servía de algo. Ahora el mensaje exacto del servidor aparece en
pantalla, y el consejo depende de la causa: reintentar sólo se ofrece cuando reintentar sirve.

La segunda: la banda de costo prometía responder «¿me cabe en el presupuesto?» y siempre decía
«cupo no disponible». El dato existía —el mismo control que autoriza el gasto lo devuelve— y nadie
se lo pedía. La tercera: al declarar un objetivo, la tabla se actualizaba pero el panel de detalle
se quedaba congelado en la foto vieja, mostrando los botones de gasto habilitados sobre algo que ya
se había confirmado.

Después vinieron diez más, del mismo tipo. La tabla decía «Candidatos (312)» y mostraba 50, sin
avisar: ahora dice «50 de 312» y explica el resto. Una corrida en curso no se actualizaba sola, así
que la barra animada no podía distinguir «sigue trabajando» de «se congeló». Un candidato ya
descartado ofrecía un botón que el sistema iba a rechazar al confirmarlo. Y el símbolo `◑`, que
significa «estimado de mercado», se estaba usando también en cifras de dinero —incluido el costo
real ya cobrado—, lo que iba borrando la distinción entre lo estimado y lo medido que el resto de
la pantalla defiende con cuidado.

Lo que no era de esta pantalla quedó escrito como trabajo propio: los estados de candidato que hoy
nadie puede alcanzar porque ningún proceso los registra, la paginación de verdad, las tres formas de
partir una búsqueda que el motor soporta y la interfaz todavía no ofrece —incluida la que arranca
desde lo que Search Console ya midió, que es la de mejor calidad—, y un par de detalles finos del
generador de preguntas para motores de respuesta.

## 2026-08-14 — Descubrir keywords deja de ser una API y se convierte en pantalla (TASK-1665)

El motor de descubrimiento existía desde ayer y sólo se podía operar por API, Nexa o MCP. Ahora
tiene cara: la lente **Descubrir** de `Growth > SEO > Keywords` — la misma ruta, el mismo permiso,
el mismo Space; sólo `?view=discovery`.

Lo interesante no es que ahora se vea, sino **qué se negó a suavizar al hacerse visible**. La banda
de costo muestra la fórmula completa antes de confirmar, y el estimado es el peor caso a propósito:
si la corrida sale más barata, esa diferencia no es crédito que puedas volver a gastar. El estimado
de mercado (`◑`) y lo que Search Console midió de tu sitio (`●`) viven en columnas separadas y no se
promedian nunca; donde no hay dato dice "Sin dato de mercado", no `0` — porque un cero se lee como
"no hay demanda", y eso sería inventar. Y la columna que en toda herramienta se llama "dificultad"
acá se llama **Barrera de enlaces**, en niveles: el índice crudo del proveedor colapsa a 0 en
búsquedas en español de LATAM y se leería como "trivial" siendo falso.

La decisión que más costó defender fue la más aburrida: **nada se pinta antes de que el command
confirme**. `trackKeywords` responde HTTP 200 con la keyword rebotada por techo de cupo; tratar ese
200 como éxito habría pintado "siguiendo" sobre un término que nadie mide, y el error sólo aparece
cuando llega la factura. Por eso el resultado se lee y se anuncia **por término**, nunca como un
"Listo" agregado. En la misma línea: ver y gastar son dos permisos, y sin el de gasto los botones no
aparecen apagados — no aparecen.

Cierra además una deuda que no era suya: no existía forma de conmutar lentes en una `page.tsx` del
dashboard. Ahora existe, y `TASK-1660` la reusa en vez de inventarla de nuevo.

**Delta 2026-08-15 — mirar los frames cambió cuatro cosas.** La pantalla pasaba lint, tipos, build y
10.763 tests. Aun así, la primera captura real encontró que el botón `Detalles` rendía 3,71:1 sobre
el tinte de hover de su propia fila —sobre blanco daba 4,59, o sea que el defecto sólo existía con el
puntero encima— y que el panel de detalle apretaba cinco métricas en 460 px hasta convertir su texto
de ayuda en una cinta vertical de una palabra por línea. Ninguna de las dos es detectable sin ojos.

Lo interesante fue el arreglo del contraste: bajar el tono no alcanzaba (4,42) y la variante tonal
del design system lo empeoró a 3,69 —pinta el azul principal sobre un tinte del mismo azul—, así que
la salida fue sacar el color de la ecuación y dejar la affordance en el chevron y la columna. Los dos
intentos fallidos quedaron escritos con su medición, para que nadie los repita.

De paso apareció un desajuste en el propio verificador visual: su contrato decía que el teclado sobre
interfaces que no mutan nada estaba permitido, pero rechazaba cualquier tecla. Eso empuja a declarar
"esto sí muta" a un guion que no muta, y esa declaración apaga el resguardo para siempre en ese
archivo. Ahora distingue teclas que navegan de teclas que activan.

Evidencia: captura verde en 1440 y 390, scorecard 4,55. Queda el build de producción como último
gate.

## 2026-08-14 — El set monitoreado ahora sabe POR QUÉ una keyword está ahí (TASK-1659)

Hasta hoy, "estoy en la 12 y quiero la 5" y "el cliente quiere rankear acá y estoy en la 60" eran
la misma fila. Nada distinguía una **oportunidad** que se está empujando de un **objetivo**
acordado con el cliente, así que un compromiso lejano se leía como fracaso permanente en cualquier
lectura agregada y no existía narrativa de avance. Ahora cada membresía puede declarar su
intención, con autor y fecha propios — y el autor del compromiso se guarda aparte de quién ejecutó
el write, porque un agente puede declarar por encargo.

Dos decisiones que valen más que la columna: **nada se backfilleó y el command no asume nada.**
Marcar lo viejo como "oportunidad" habría afirmado que alguien lo clasificó, e inflado el conteo
con filas que nadie miró; la ausencia se propaga honesta hasta la pantalla. Y **cambiar la
intención no sobrescribe: cierra la membresía y abre otra**, porque el dato que sirve para reportar
no es "esta keyword es un objetivo" sino "es objetivo desde marzo, y en marzo estaba en la 45".
Reclasificar no consume cupo del techo, así que se puede hacer con el set lleno — que es cuando más
falta hace.

Salió de intentar construir el workbench de discovery (TASK-1665) y descubrir que dos de sus
acciones citaban un contrato que no existía. Desbloquea la lente de Objetivos.

## 2026-08-14 — La auditoría del oficio afinó el discovery y el puente antes de congelarlos (TASK-1664/1666)

Una tri-auditoría con las skills de SEO/AEO revisó los dos cierres del día y encontró lo que los
tests verdes no ven: el set "grounded" real había perdido una seed completa y traía un competidor
con nombre y apellido. Ahora la cobertura por seed se **verifica** (el draft declara qué candidatos
quedaron sin huella y lo advierte al revisor), los nombres literales se normalizan a placeholders,
y un set degenerado cae honesto al baseline. En el discovery, el inbox ordena primero la
oportunidad medida (lo que el sitio ya recibe y no sigue), el desempate usa la barrera de enlaces
canónica en vez del KD que colapsa en es-LATAM, y repetir el mismo intent en un mes nuevo vuelve a
descubrir (antes quedaba congelado para siempre). Todo corregido el mismo día, antes de que el
workbench (TASK-1665) congelara el contrato.

## 2026-08-14 — Las keywords descubiertas ahora saben llegar a los motores de IA (TASK-1666)

El mismo día que el discovery quedó operativo, se cerró el puente que faltaba hacia el otro
internet de búsqueda: un operador selecciona hasta 20 candidatos de una corrida y pide un
**borrador de grounded queries** para el grader AEO. La regla central es semántica: una keyword
de Google no es una pregunta a ChatGPT — el sistema la usa como **tema de investigación** (dato
delimitado, inmune a prompt injection) y redacta preguntas naturales con la identidad de marca ya
autorizada del perfil. La prueba real lo mostró: de "recubrimiento epóxico" salió "qué tipos de
recubrimientos existen para madera", no una copia; y ninguna pregunta de descubrimiento nombra la
marca (la medición a ciegas sigue siendo a ciegas).

La honestidad quedó cableada, no prometida: el modo `grounded_llm` sólo existe cuando la autoría
usó de verdad el contexto (cerebro versionado aparte; el authoring sin contexto quedó byte a byte
idéntico y probado); sin autoría disponible el borrador sale del baseline **y lo dice** con un
aviso obligatorio. La trazabilidad viaja como referencias opacas (corrida, candidatos y hash
verificable del contexto exacto) — jamás la keyword en logs. Y el puente sólo crea borradores:
aprobar y activar sigue siendo el flujo AEO con revisión humana, sin atajos.

Verificado contra el mundo real: 16/16 checks contra PG incluyendo una autoría LLM real de 15
preguntas evaluadas a mano, idempotencia que devuelve el mismo borrador sin segundo gasto, y el
active previo intacto. Con esto TASK-1665 (el workbench visual) quedó sin bloqueos.

## 2026-08-14 — Descubrir keywords deja de ser un viaje a otra herramienta (TASK-1664)

El módulo SEO contestaba qué empujar de lo que ya aparece en Search Console; no contestaba cómo
pasar de una hipótesis a un conjunto priorizado de términos. Hoy existe el primitive completo de
**keyword discovery**: una corrida recibe hasta 10 seeds (manuales, de las consultas GSC, del set
monitoreado o del dominio propio), las expande con DataForSEO Labs, deduplica y deja **candidatos**
con procedencia trazable — y con volumen, intención y barrera de enlaces compuestos desde el store
de mercado de TASK-1661, porque el `keyword_info` que viene inline y pagado en cada respuesta se
persiste ahí mediante un writer canónico nuevo (`persistKeywordMarketData`) en vez de tirarse.
`keyword_overview` quedó como top-up sólo del faltante: en el smoke real, el enriquecimiento costó
**cero llamadas** porque el inline ya había dejado todo fresco.

Las tres fronteras que la spec exigía quedaron en el código, no en la disciplina: el **costo se ve
antes de gastar** (preview con fórmula, gate de entitlement y fence cada 10 llamadas); **descubrir
no es seguir** (ninguna pieza escribe el set monitoreado; las decisiones son un log append-only y
la promoción usa el command de tracking existente); y **repetir la pregunta no paga dos veces**
(idempotencia por intent completo — el smoke lo midió: segunda corrida USD 0). Paridad completa en
el mismo cambio: route admin, lane ecosystem (write sólo bindings internos), tools MCP con preview
y confirmación humana obligatoria, y dos señales de confiabilidad nuevas.

Verificado contra el mundo real, no contra mocks: sanity de 27 checks contra PG y una corrida live
de Berel MX que costó **USD 0.0132** (estimado conservador 0.0612) y dejó 10 candidatos. Queda
apagado por diseño: flag OFF en ambos runtimes y scheduler pausado hasta el sign-off de rollout.

## 2026-08-13 — Berel se mide donde vive su mercado, y el país deja de elegirse en silencio

Una pregunta del operador sobre un dato dudoso destapó dos problemas reales, y los dos quedaron
resueltos el mismo día.

**El primero era de datos.** El seguimiento SEO de Berel llevaba un año midiendo Chile — y Berel es
una marca mexicana. Su propio nombre tiene 1.650 veces más búsquedas en México que en Chile, y nada
en el dashboard lo delataba porque la serie se veía poblada y sana. La corrección respetó la regla
de oro del histórico: no se reescribió nada. Se creó un target nuevo para México, el de Chile quedó
pausado con su serie íntegra, y las 31 keywords se re-trackearon por el command canónico. La
verificación con capturas reales contó el final de la historia: **Berel es #1 en México en sus
términos de marca** — la marca siempre fue real; el país era el equivocado.

**El segundo era de arquitectura, y era más profundo.** El módulo asumía que una organización tiene
UN mercado, y esa suposición vivía escondida en un `LIMIT 1` copiado en cuatro lugares: con dos
países activos, cada pantalla servía el más nuevo sin error, sin señal y sin decir cuál. Efeonce
misma —que opera en Chile, México, Colombia y Perú— es el caso que ese código no sabía describir.
Ahora la resolución vive en un solo lugar y dice la verdad: un mercado resuelve solo, varios exigen
elegir (con la lista de opciones en la respuesta), y toda lectura declara qué país está sirviendo.
Las posiciones de países distintos jamás se promedian: son experimentos distintos.

## 2026-08-13 — El módulo SEO deja de leer "volumen: sin dato", y un smoke real destapa una fuga de costo

Durante meses la tabla de oportunidades mostraba las columnas de volumen y dificultad vacías, y eso
se leía como "falta integrar DataForSEO". Era falso: la cañería estaba desde hace tiempo; lo que
faltaba eran las columnas donde guardar el agua. Ahora existen, y `market` deja de estar cableado a
"no disponible".

La decisión de fondo no fue traer el dato sino **dónde vive**. El volumen de una keyword es un hecho
de la keyword, el país y la fecha — no de si nosotros la seguimos ni de quién la descubrió: "pintura
industrial" tiene el mismo volumen en Chile para todos los clientes de la cartera. Por eso la tabla
no cuelga de un target ni del set monitoreado, y nace **multi-productor**: la captura de hoy la llena
desde un endpoint, y el descubrimiento de keywords y el análisis de competencia que vienen después
escribirán en la MISMA tabla el dato que ya viene incluido y pagado en sus propias respuestas.
Guardarlo dos veces habría garantizado que dos pantallas mostraran cifras distintas para lo mismo
dentro del mismo mes.

La captura corre **una vez al mes**, porque el proveedor refresca una vez al mes: un cron diario
pagaría treinta veces por el mismo número. Y nace con dos frenos independientes —el cron pausado y
el flag apagado— porque a diferencia del resto del módulo, esta corrida le paga al proveedor por cada
fila.

**Lo que enseñó correrlo de verdad.** El smoke con dinero real (USD 0.05 en total) destapó un defecto
que ningún test con mocks podía ver: una keyword que el proveedor **no tiene** no escribía fila, y
como el chequeo previo mira filas, esas keywords nunca quedaban "ya consultadas" y se volvían a
comprar en cada corrida, para siempre. El modelo correcto son tres estados y no dos —nunca
preguntamos, preguntamos y no hay, demanda cero real— y con eso la segunda corrida pasó a costar
exactamente cero. Quedó también una observación honesta sin resolver: el proveedor devuelve
dificultad 0 para cabeceras de alto volumen, y esa columna no se le muestra a un cliente hasta
contrastarla con otra fuente.

## 2026-08-13 — La credencial de partner entra al deck sin duplicar la contraportada

El badge de HubSpot Solutions Partner apuntaba a una carpeta fuera del catálogo, y eso rompía la
regla que mantiene los decks reproducibles: un catálogo tiene que renderizar igual en cualquier
máquina, y una referencia que se sale funciona en el repo del autor y falla en el worker. El badge se
mudó adentro del catálogo y ahora se pide por una clave cerrada, el mismo trato que los logos de
cliente: una acreditación que no se tiene no se puede presentar por accidente.

No hizo falta una contraportada nueva. La misma lámina ya sirve las dos versiones —con y sin
credencial— porque el motor borra el elemento cuando el plan no lo declara; una segunda plantilla
casi idéntica solo habría garantizado que las dos se separaran con el tiempo.

Los aprendizajes quedaron escritos donde se van a leer: el runbook del gate visual explica por qué
declarar un slot nuevo siempre mueve la imagen de referencia de esa lámina, y cómo distinguir un
drift propio de un baseline viejo; el estándar premium de UI incorpora que un scorecard es una foto
con fecha (uno vencido bloqueó cuatro días un trabajo ya terminado) y que ningún gate lee lo que la
pantalla dice; y la skill de captura registra que una superficie gateada por organización exige la
persona de esa organización, con la consulta que la encuentra.

## 2026-08-12 — El portal SEO del cliente quedó cerrado, y su propio scorecard estaba equivocado

`TASK-1310` cierra la cara cliente del módulo SEO: dashboard `/growth/seo` con Resumen, Evolución y
Quadrant 360, más el informe `/growth/seo/report` en web e imprimible sobre el mismo modelo de
artefacto que el AEO. Con ella el módulo tiene sus dos caras —las cuatro pestañas del operador y el
portal del cliente— y la pata visible del criterio de paridad queda cubierta.

El cierre empezó desmintiendo su propia evidencia: el scorecard vigente bloqueaba la task con 2.29
sobre capturas tomadas nueve horas antes del commit que ejecutó la ronda premium, así que describía
una interfaz que ya no existía. Medida de nuevo contra el código real —tres superficies, escritorio y
móvil, con sesión de un cliente de verdad atravesando el gate por organización— las tres cierran sin
un solo hallazgo de calidad y los cuatro gates de UI quedan en verde.

En el camino aparecieron dos defectos que ningún gate podía ver porque ninguno es un error técnico:
el informe anunciaba "Aún no hay una posición media para leer" con la posición impresa al lado, y el
botón global de "volver arriba" no tenía nombre accesible en ninguna ruta del portal. Los dos
salieron mirando las capturas, no leyendo los reportes.

## 2026-08-12 — El contrato de contacto de Careers quedó cerrado de punta a punta

Segundo release del día (`950f5bdb4`): el país de residencia pasó a ser requerido también en el
parser (antes sólo la UI lo exigía), el formulario nativo lo muestra en «Tus datos» junto al correo
—ya no relegado a una sección genérica— y el selector dejó de mostrar la primera opción como si
estuviera elegida cuando no hay valor. El sexto y último correo del ciclo (seleccionado) se
ejercitó en vivo, el scorecard visual formal quedó en PASS con capturas de escritorio y móvil, y la
revisión de privacidad de los tres campos quedó documentada con dos recomendaciones no bloqueantes.
De paso se cazó un flake real del CI (timer de verificación de email que dispara tras el teardown).

## 2026-08-12 — Los emails de hiring y el contacto completo de Careers quedaron VIVOS en producción

Rollout completo en una sesión: el flag de los 6 emails del ciclo de contratación quedó prendido en
el ops-worker (con default durable en deploy.sh), un ejercicio E2E real con los commands canónicos
recorrió postulación → preselección → evaluación → rechazo y los 5 correos salieron `sent` con
asuntos personalizados (el aviso interno llegó a people@efeoncepro.com con teléfono, país y mensaje
del candidato). El Growth Form de careers se republicó (v4) con el país de residencia para cerrar la
paridad nativa, y el release `393144e9f` promovió todo a producción por el control plane (manifest
`released`, watchdog ok, campo país verificado en vivo). Quedan como pendientes menores la revisión
de Privacy, el flip del país a requerido-en-parser y el scorecard GVC formal.

## 2026-08-12 — Archivo puntual de adjuntos Wherex

- `wherex:radar` incorpora `--tender-id` + `--archive-originals <carpeta>`: guarda y analiza originales únicamente cuando Wherex emite una descarga nativa; el visor protegido queda explícitamente en `manual-save-required`, sin extraer enlaces firmados.
- Para una sesión Chrome principal expresamente autorizada, el manual y ambas skills documentan el fallback visible: activar temporalmente **Descargar archivos PDF**, validar cada descarga individual y restaurar el visor cuando corresponda. Sika LIC-1120 quedó archivada en OneDrive; sus anexos contienen una discrepancia de plazo que exige aclaración antes de cotizar.

## 2026-08-12 — El formulario de Careers ya no pierde el contacto del candidato (TASK-1688)

Se cerró la pérdida silenciosa que descubrió la auditoría de postulaciones: teléfono y mensaje se
validaban en el navegador pero el command los descartaba, y no existía país de residencia. Ahora el
apply (estándar y Growth Form nativo, mismo parser/command) pide país de residencia autodeclarado
(select textual del catálogo ISO — jamás deducido del prefijo telefónico), guarda el teléfono E.164
opcional en el perfil del candidato con política anti-wipe y el mensaje como contexto de esa
postulación. El reclutador lo lee en la Postulación 360; las postulaciones históricas muestran "No
informado" sin inventar datos. ADR registrado, migración aditiva aplicada, país requerido primero
en UI (expand/contract). Pendiente de rollout: ejercicio en staging + GVC, revisión de Privacy y el
flip a requerido en parser.

## 2026-08-12 — El proceso de contratación ahora avisa por correo en cada hito (TASK-1689)

Greenhouse deja de estar mudo durante el hiring: al llegar una postulación, People recibe un aviso
con los datos del postulante y el candidato un acuse de recibo; al asignarle un test le llega su
link de acceso (con token re-emitido de forma canónica — nunca viaja por el outbox); al avanzar a
una etapa candidate-facing (Preselección/Entrevista, nunca etapas internas) se le informa; y la
decisión final llega como felicitación o como agradecimiento cuidado si no quedó. Todo corre como
consumers reactivos en el ops-worker sobre la plataforma de email canónica, idempotente ante
retries, con kill-switch por tipo (el de rechazo pausable aparte) y detrás de
`HIRING_LIFECYCLE_EMAILS_ENABLED` default OFF. Code complete con suite completa verde; el flip
espera deploy del worker, ejercicio en staging y revisión del copy por Talent.

## 2026-08-12 — Sentry separa el ruido del bridge de Facebook de los errores reales de Careers

El cliente de Sentry filtra exclusivamente la firma del bridge nativo que Facebook inyecta en
Android cuando el objeto Java desaparece durante el ciclo de vida de su WebView: exige el mensaje,
navegador y frame `app://` exactos. No toca Careers, Turnstile ni la captura de otros errores de
Facebook/Android. La investigación comprobó que la página pública y el formulario nativo responden
correctamente; el cambio llegó a producción por `d139726ff` y 8W no tuvo recurrencias posteriores al rollout.

En el mismo cierre se recupera la gobernanza persistida de `/admin/globe/credits`: una migration
añade el registry y el único grant que autoriza su contrato (`efeonce_admin`), eliminando el
fallback que generaba `role_view_fallback_used` durante el refresh de claims. La migration quedó aplicada y
el grant se verificó en Cloud SQL. También se corrigió el smoke de identidad: el `ops-worker` compartido
consultaba el portal staging protegido por SSO (HTTP 302); al usar el portal público dos runs fueron 5/5 y
la health fue `ready`. Los tickets remotos de Sentry quedan por marcar como resueltos cuando exista una
sesión o token con escritura.

## 2026-08-12 — El escáner de malware quedó vivo en producción, verificado de punta a punta

Cierre de la historia que las dos entradas siguientes cuentan: el escáner de firmas
está operativo en staging y en producción, y esta vez la verificación corrió donde
tenía que correr. Tres capas independientes, todas desde el runtime real: el
endpoint de diagnóstico acuñó la credencial y el servicio la aceptó ANTES de
prender el flag; después del flip el mismo endpoint confirmó el flag horneado; y
una postulación de prueba por el formulario público real atravesó el camino
completo — escaneada por los dos motores, limpia y adjunta en 129 ms. La issue del
doble incidente quedó resuelta y la task de provisión cerrada. Costo steady del
servicio: ≈USD 19/mes. Recursos Humanos descarta la postulación de prueba desde el
Hiring Desk.

## 2026-08-11 — El flag del escáner falló dos veces en producción; causa raíz cerrada en código

Corrección al estado que reporta la entrada siguiente: en producción el escáner de
firmas quedó **apagado**. Prenderlo falló dos veces el mismo día bloqueando CVs de
candidatos reales (recuperados todos, 5+1): primero porque el código estaba sólo en
`develop` y producción sirve `main`; después —con el código ya promovido— porque
producción resuelve credenciales GCP por service account key (postura transicional,
TASK-800) y el camino de ID tokens del scanner no tenía esa rama: caía a un método
que exige credenciales ambiente que Vercel no tiene, y fallaba en 21 ms. Staging
nunca lo mostró porque usa la rama WIF, que sí existía.

El fix agrega la rama de service account key al resolver canónico
(`src/lib/google-credentials.ts`), con el plan de credencial exportado y testeado
contra los shapes exactos de producción y staging, y nace el endpoint de diagnóstico
`GET /api/internal/health/scanner-auth`: acuña el ID token en el runtime donde corre
y opcionalmente golpea el `/scan` real, sin tocar el path de uploads. Es la
verificación que faltó dos veces — probar con la identidad del operador no prueba
nada sobre el runtime. Verificado con la credencial real de producción: token en
120 ms y el Cloud Run lo aceptó. El flag se re-prende recién cuando el endpoint
responda verde EN producción (ISSUE-150 tiene la secuencia exacta). Staging sigue
operativo end-to-end.

## 2026-08-11 — Escaneo de malware activo sobre los archivos que suben desde afuera

El escáner de firmas dejó de ser código latente y quedó operativo en staging y en
producción. Todo archivo que entra desde afuera pasa ahora por dos revisiones
complementarias: la estructural, que mira los bytes reales y detecta un ejecutable
renombrado a `.pdf`, y ClamAV, que reconoce firmas de malware dentro de archivos que
sí son del tipo que dicen ser. El peor veredicto gana. No es una función de
reclutamiento: cubre el CV público, los adjuntos de Growth Forms y los pliegos y
entregables que se cargan a una propuesta.

Se verificó con postulaciones reales por el formulario público, no con mocks: un PDF
válido queda adjunto y un archivo de prueba EICAR queda en cuarentena, sin que la
persona que lo subió reciba ninguna señal distinta — avisarle a un atacante que su
archivo fue rechazado le diría qué probar después. Si el escáner no puede
pronunciarse, el archivo también se bloquea: es deliberado, y por eso una mala
configuración es más peligrosa que no tener antivirus.

Corre en un único servicio Cloud Run cerrado por IAM, ≈USD 19/mes, con las firmas
actualizándose solas dentro del contenedor. De paso quedó corregida en el flag ledger
una calibración de costo que estaba desfasada 24×: Cloud Run no cuesta USD 7,32 cada
30 días sino ≈USD 169.

## 2026-08-11 — Distribución de vacantes en Facebook, trazable y reusable

Se difundieron las vacantes públicas `EO-OPN-0061` (Content Creator) y `EO-OPN-0009`
(Account Manager) en grupos de Facebook ya unidos y afines; la expansión dejó diez
envíos adicionales por rol, con nueve visibles y uno a moderación en cada caso al
momento de verificar. El registro operativo conserva copy, beneficios aprobados,
destinos, evidencia de estado y la decisión explícita de continuar sin imágenes.
Hiring Desk, el manual de Careers y las skills espejo ahora separan con claridad la
publicación canónica del opening de su distribución externa: confirmación humana,
sin grupos nuevos ni DMs no autorizados, y nunca reintentar un estado ambiguo sin
verificar antes el texto exacto.

## 2026-08-11 — Radar Wherex reutilizable y documentado

La skill de licitaciones incorpora el companion `wherex-radar-chrome-playwright.md`, el manual comercial y la
CLI `pnpm wherex:radar`. Su setup aislado guarda la cuenta sólo en `.auth/` con `0600` y Git ignore; el runner
usa un perfil Chrome separado, revisa **Nueva** y **Editando**, lee fichas y adjuntos técnicos temporales, y deja
un reporte local protegido. Su salida es read-only y evidence-first; participar, responder, cargar o firmar sigue
bajo control humano explícito. El flujo documentado continúa con el archivo de originales en OneDrive y con la
verificación/alta por MCP HubSpot de empresa, deal y asociación en dos confirmaciones; no se eluden visores
protegidos ni se guardan URLs firmadas. El dictamen exige leer la descripción completa y el Centro de mensajes →
Preguntas, porque ahí pueden estar el máximo de presupuesto, pago, alcance, inicio, facturación y exclusiones; si
el reporte no contiene esas aclaraciones, se revisan en la UI autenticada antes de clasificar. La misma fuente ahora
documenta el cierre de una postulación: precio desde cotización aprobada → condiciones/adjuntos → reconciliación
en resumen → aceptación y envío únicamente con confirmación humana final.

## 2026-08-11 — Oferta completa para Ajinomoto LIC-962

Se redactó la propuesta técnica y económica para el programa influen-SER Team de Ajinomoto del Perú, con ledger
trazable al brief y a las respuestas de Wherex, matriz de cumplimiento, límites de alcance y condiciones de
facturación Chile–Perú. La oferta fija S/ 7.000 mensuales sin IGV peruano y S/ 84.000 referenciales para los 12
meses de la ficha; no promete resultados de plataforma ni producción ilimitada. Se emitió la cotización XLSX y
se compuso una presentación técnica de 11 láminas, validada por el composer. Ningún precio, adjunto, término o
envío fue ingresado en Wherex. El blueprint interno conserva el gate de Finanzas por costo cargado/squad y la
revisión tributaria previa a adjudicación.

## 2026-08-10 — TASK-1685 cerrada: el portal cliente tiene un solo primitive de visibilidad

El menú del portal cliente y la puerta de cada página dejaron de decidir por su cuenta. Existe un solo
predicado —`acceso = interna ∨ (¬revocada ∧ (vistaBase ∨ móduloDeLaOrgLaDeclara))`— y lo consumen los
cuatro caminos: page guard, lista base del menú, ⌘K y layouts de ruta. Antes el menú preguntaba por el
ROL y la puerta por el MÓDULO contratado, y ninguna de las dos mitades podía observar a la otra:
medidos contra PG, eran **36 enlaces que el menú ofrecía y la puerta negaba**, sobre los 8 usuarios
cliente activos, incluidos los 3 reales de Sky Airlines. Hoy el menú muestra exactamente lo que se
puede abrir. Un `user_view_overrides` con `override_type='revoke'` pasó de decorativo a cerrar la
puerta de verdad.

Cambio de acceso, no sólo de experiencia: cuatro rutas de detalle del portal (`/proyectos/[id]`,
`/campanas/[campaignId]`, `/sprints/[id]`, `/notifications/preferences`) no tienen guard propio y su
única puerta era un layout que gateaba por el carril de rol — un cliente cuyo rol concedía la vista
pero cuya organización no tenía el módulo entraba al detalle por URL. Los cuatro pasan al guard
canónico.

Verificado contra PG antes y después: los 24 pares usuario×vista contratados quedaron intactos —ningún
cliente perdió una superficie que su organización pagó— y los enlaces muertos bajaron de 36 a 0. Sin
migraciones y sin feature flag: la tabla de overrides estaba vacía, así que el delta de acceso es cero.
`role_view_assignments` deja de gobernar vistas `cliente.*` (para el portal interno sigue siendo el
carril canónico) y un lint en `error` impide reintroducir la segunda fuente. Cierra `ISSUE-148`.

## 2026-08-10 — Task planner: un resultado `legacy=1` deja de ser registrable

Se corrigió TASK-1686 para preservar los cinco marcadores HTML `ZONE` del template y se endurecieron los
planners `.codex` y `.claude`: antes de tocar registry/README o commitear, toda task nueva debe pasar
`pnpm task:lint --task TASK-###` con `template=1 legacy=0 errors=0 warnings=0`. La salida `legacy=1`,
aunque tenga cero errores, es un fallo bloqueante. La reparación también completó los contratos
wireframe/flow/motion/readiness de TASK-1686; no cambió runtime, rutas, acceso ni la implementación de
la task.

## 2026-08-10 — TASK-1389 cerrada: la navegación quedó con candado anti-regresión

Cierra el programa de navegación del día (1388 → 1686 → 1389): Contrato de Asignación de Superficies
canónico (qué destino va a qué superficie, sin duplicar, nada nuevo colgado del primer nivel fuera de
zonas) + campo `Nav placement` obligatorio en tasks con destino visible + gate `pnpm nav:budget` que
mide el árbol real del rail interno contra el presupuesto (8 slots top-level · profundidad 2 · cero
`/my/*`) y el manifest. Nació directo en `error` con 0 violaciones medidas; doble cobertura CI (suite
+ job en design-contract.yml). Lo que infló el sidebar a 96 hojas ya no puede repetirse en silencio.

## 2026-08-10 — TASK-1686 cerrada: el colaborador puro deja de ver un portal ajeno

Continuación directa de TASK-1388, mismo día: la rama no-interna del menú bifurca con
`isPureCollaborator` y el colaborador (solo rol Colaborador) ve exclusivamente su portal — rail =
Mi Greenhouse + Mi Ficha + recursos concedidos; avatar = identidad + Mi Perfil + salir. Se cierran
los shortcuts cliente sin gating del avatar, el heading "Mi Cuenta" vacío y el borde de claims
vacíos. El trigger del avatar pasa a botón semántico (aria + teclado + Esc/restore) para TODAS las
audiencias. Cliente, interno e híbrido my+client conservan su salida byte-a-byte (tests de control
19+7). Evidencia GVC con la persona collaborator real, baselines durables y scorecard 5.0.

## 2026-08-10 — TASK-1388 cerrada: la navegación interna se reparte entre sus 3 superficies

Reequilibrio del portal interno en develop (5 commits, sin push): el rail pasa de 12 grupos top-level
a 3 zonas (Operación · Administración · Recursos) con dominios colapsables uniformes; las hojas
personales `/my/*` viven ahora en el dropdown del avatar (header de perfil clickeable, sin atajos
admin duplicados) servidas por el builder canónico `src/lib/navigation/my-nav-items.ts`; y hay UNA
sola palette ⌘K (la `CommandPalette` de TASK-696, ahora con filtro de audiencia + recientes +
acciones — la `NavSearch` retirada exponía el `VIEW_REGISTRY` completo sin filtrar).

- Cero cambios de ruta/URL ni de gating: el set de hojas por rol quedó fijado por test de identidad
  (`VerticalMenu.test.tsx`, interno + no-interno).
- Dedup: Sample Sprints con hogar único en Comercial, Growth como sección de Comercial, "Spaces
  (admin)" desambiguado, Herramientas IA una sola vez, `verticalMenuData.tsx` legacy borrado.
- Los 4 hallazgos a11y del chrome que TASK-1675 midió quedaron cerrados: focus ring en el rail,
  región scrollable con role/label/foco, toggle del drawer accesible, desborde de 8px del panel.
- Evidencia GVC premium (3 scenarios, desktop+390px) + scorecard 4.93 + baselines durables
  promovidos. Cerrada el mismo día con autorización del operador: build de producción verde, test
  full (10.447), `UI ready: yes` (card-sort formal queda como validación posterior no bloqueante).

## 2026-08-09 — Barrido documental del carril cliente: el doc de contrato estaba invertido

Tres auditorías paralelas (arquitectura, docs funcionales/manuales, skills) tras los dos releases.

- 🔴 **El §0 Status de `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1` afirmaba que no existían cuatro piezas que
  se implementaron entre `TASK-824` y `TASK-828`** — carpeta, namespace de API, schema y modelo de
  módulos. Tres meses así, y es lo primero que lee un agente que abre el doc de contrato del dominio.
- ⚠️ **Defecto vivo que causó el assignment de hoy:** `/creative-hub` no existe y Sky Airlines ve el
  enlace. Señal nueva `identity.client_portal.assigned_view_without_route` (hoy en 1). La condición la
  crea un cambio de DATO, no un deploy, así que ningún gate de código la veía — y
  `route-reachability-gate` sólo cubre la dirección contraria.
- Los dos companions de invariantes no tenían nada del page guard ni de la derivación invertida, que es
  justo lo que un agente carga al tocar el dominio. Agregados.
- Cinco aprendizajes de proceso a sus skills dueñas: el context gate va último, un gate con expectativa
  hardcodeada no prueba el motor, un override de lint fuera del alcance de la regla no protege nada,
  `VERCEL_ENV` nunca `NODE_ENV`, y una nota del Handoff no es evidencia.

## 2026-08-09 — El carril del portal cliente, cerrado y verificado EN PRODUCCIÓN (release `ee0d568b8614`)

Segundo release del día. Manifest `released`, watchdog `drift_count=0`, **sin bypass del batch policy**
(cero migraciones — el contraste con el release de la mañana, que sí lo necesitó, muestra que la
diferencia es la presencia de migraciones y no el tamaño del batch).

- **Verificación completa en producción:** 9 rutas × 3 personas con sesión real. Las 3 vistas base
  sirven `200`, las 6 module-gated redirigen a `/home?denied=<slug>`, cero `resolver_unavailable`, y
  `/proyectos` sirve `200` al operador interno donde antes devolvía `/401`.
- 🔴 **Corrección de un supuesto propio:** `agent-session` **sí** funciona en producción
  (`AGENT_AUTH_ALLOW_PRODUCTION` seteada desde ~90 días). Lo negué toda la sesión tomándolo de una nota
  del Handoff sin verificarlo. Postura abierta en `TASK-1684`.
- Dos aprendizajes de release documentados en runbook + ambas skills: `vercel redeploy` no arregla un
  staging cancelado por docs-only, y el context gate va último porque `docs:closure-check` no lo
  reemplaza.

## 2026-08-09 — La verificación en staging del portal cliente encontró dos defectos más

Recorrí las 9 rutas × 3 personas con sesión real contra staging. El fix quedó confirmado en runtime
desplegado —3 base sirven `200`, las 6 module-gated redirigen a `/home?denied=<slug>`, **cero**
`?error=resolver_unavailable`— y de paso salieron dos cosas que sólo se ven ejerciendo el flujo:

- **`/proyectos` devolvía `/401` al operador interno**, y era la única de las 9 que conservaba un gate
  legacy por route group **encima** del canónico, con el comentario de al lado diciendo que el
  canónico lo reemplazaba. Corría primero, así que ganaba, y el scope del operador interno no incluye
  `client`. Arreglado, con una guarda de source que barre las 9 páginas. **Producción sigue con el
  síntoma hasta el próximo release** — clasificado `MENOR`: es fail-closed de más, no expone nada.
- **El override de organización era solo-local por usar `NODE_ENV`.** Vercel compila todos los
  deployments con `NODE_ENV=production`, así que el bloqueo apagaba el flag también en staging. El
  discriminador canónico del repo es `VERCEL_ENV` (mismo que `agent-session` y `proxy.ts`). Corregido,
  y **sin** válvula de escape de producción: la divergencia con `agent-session` es deliberada porque
  este override concede lectura cross-tenant.

## 2026-08-09 — El carril de acceso del portal cliente queda cerrado del todo (TASK-1680 + Creative a SKY)

Las tres piezas que quedaban después del release: el módulo Creative asignado, el lint cerrado y los
dos hallazgos de tooling con ID.

- **Creative Hub Globe asignado a Sky Airlines** vía el command canónico `enableClientPortalModule`
  (no SQL: es el único camino con audit + outbox + invalidación de cache en una transacción). Las 4
  páginas Creative del portal abren para SKY y siguen en empty state para el resto — que es el
  producto funcionando.
- **`TASK-1680`**: el lint `no-untokenized-business-line-branching` pasa a `error`. La medición dio
  **0 violaciones** con el override intacto, y reveló que **4 de sus 6 entradas eximían paths que la
  regla nunca miró** — hacían ver la gobernanza más estricta de lo que era. Quedó una exención, medida
  y con dueño. 6 archivos muertos borrados de paso.
- **El gate de verificación pasa a derivar su expectativa de los datos.** Hardcodeaba "3 abren y 6
  empty state" y al asignarle el módulo a SKY reportó cuatro desvíos **por hacer lo correcto**. Un
  gate que se edita por organización no prueba el carril: prueba que la primera organización sigue
  igual.
- `TASK-1682` (la capability del bypass de release sin verificador ni grant) y `TASK-1683` (la
  rotación de contexto que borra el puntero al archive) quedan registradas con su medición.

## 2026-08-09 — El carril de acceso del portal cliente, EN PRODUCCIÓN (release `2c87d71e2eca`)

`TASK-1678` + `TASK-1679` promovidas juntas a propósito: la contención del fail-open se retira en el
mismo instante en que el fail-open se cierra, así que no hubo ventana de exposición. Manifest
`2c87d71e2eca-f444748c-92aa-484c-b118-02713ee63e06` en `released`, run `31335921151`, watchdog
`drift_count=0`, `/api/auth/health` 200 con los 3 providers `ready`.

- Pasó a la primera con un solo bypass previsto: los dos hallazgos del preflight se pre-emptaron antes
  de tocar `main` (el staging `CANCELED` se resolvió con el propio push de código; el smoke sobre `main`
  se **produjo** en vez de bypassearse).
- 🔴 **Aprendizaje que no estaba en ningún runbook:** el marker `[release-coupled:]` **no** sirve para
  `requires_break_glass` — sólo limpia `split_batch`. Ponerle marker a un `requires_break_glass` es
  cargo-cult; su única salida es el bypass.
- **Hay una sola instancia Cloud SQL:** producción, staging y local leen la misma base, así que las 2
  migraciones del batch ya estaban aplicadas antes del deploy. Eso cambia cómo se evalúa el riesgo de un
  release con `db_migrations`.
- `TASK-1680` quedó desbloqueada (su `Blocked by` apuntaba a `TASK-1679`).

## 2026-08-09 — Las 9 páginas del portal cliente dejaron de mentir (TASK-1679, cierra ISSUE-146)

Las nueve rutas guardadas redirigían con `?error=resolver_unavailable` —el banner de "el servicio no
está disponible"— por tres defectos que vivían en la misma función y se tapaban entre sí: el
`redirect()` del camino `denied` estaba **dentro** del `try`, así que su propio `catch` lo interceptaba;
el guard pasaba un `clientId` donde el resolver espera un `organizationId`; y seis viewCodes de rutas
vivas no los declaraba ningún módulo. Ahora cada resultado tiene su destino: empty state para
module-gated sin módulo, `organization_unresolved` para sesión sin organización, y
`resolver_unavailable` sólo cuando el resolver falla de verdad.

- `ModuleNotAssignedEmpty` volvió a existir en runtime, y una denegación legítima dejó de reportarse a
  Sentry como error del resolver — el dominio `client_portal` acumulaba incidentes por funcionamiento
  normal.
- Tres vistas pasaron a allowlist base (`notificaciones`, `configuracion`, `actualizaciones`): no son
  producto vendible. Ciclos y Analytics quedaron module-gated por decisión del operador.
- `/reviews` se unificó en `cliente.reviews`; `cliente.revisiones` queda marcado como retirado
  (append-only).
- **Medido, no supuesto:** corregir el guard NO abre las 9. Los módulos que declaran 4 de esas vistas
  no están asignados a ninguna organización, así que 3 abren y 6 muestran el empty state. Abrirlas es
  un assignment, no código.
- Persona de verificación con organización configurable, con 4 condiciones fail-closed y auditoría.
  **Rollout pendiente:** no está en `main`.
