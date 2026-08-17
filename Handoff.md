# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

## 2026-08-17 — TASK-1719 code complete: asignación de tests por etapa (Slices 0-5)

Se cerró el código de los seis slices. Antes de esto la task tenía la fundación (policy + command)
pero **el command no tenía un solo llamador**: era un motor sin llave. Ahora hay superficie manual
(propose→confirm con effect digest y expiry enforceado a 30 min), cancelación gobernada, consumer
reactivo de etapa y cola de reconciliación con endpoint propio.

Decisiones que cambian el contrato y no estaban en la spec:

- **Slices 4 y 5 colapsaron en UNA pieza.** El ADR exige un consumer único que absorba el correo de
  etapa; mantenerlos separados es justamente lo que produce cero correos o dos.
  `hiring_stage_changed_email` (TASK-1689) fue **reemplazado** por
  `hiring_stage_changed_candidate_comms`. El `handler` key cambió.
- **Ventana de accionabilidad de 24 h.** Un `stage_changed` más viejo no comunica ni asigna: va a la
  cola humana. Es regla de dominio y además hace segura la primera corrida del consumer nuevo, cuya
  Phase A barre todo el histórico del event type.
- **`_occurredAt` se inyecta ahora en el payload reactivo** (`parsePayload`). La fila ya lo traía y
  no se exponía, así que ninguna projection podía saber la edad de lo que procesaba. Con test propio:
  sin esa inyección la ventana sería código muerto que nunca dispara, con build y tests verdes.
- **`already_assigned` es ambiguo** y la ambigüedad manda cero o dos correos. El fan-in lo desambigua
  leyendo el LEDGER (replay propio ⇒ callar; `existing_open_instance` ⇒ degradar). El deduplicador de
  emails NO cubre este caso: los dos correos viajan con `sourceEventId` distintos.
- **Cancelar libera el cupo de unicidad** (`cancelled` fuera del predicado del índice parcial), que es
  lo que la vuelve recuperación real y no sólo un cierre. Verificado contra PG.

Hallazgo colateral, ya corregido y commiteado aparte: **dos plantillas de assessment activas eran
irrenderizables** (5 preguntas para 8 módulos y 6 para 5) — el módulo sin preguntas no desaparece, el
candidato ve la sección vacía y el examen encogido se envía sin error. Archivadas + señal
`hiring.assessment.template_module_without_questions`. Precursor vivo: **6 competencias sin banco**.

**Estado: `code complete, rollout pendiente`.** `HIRING_STAGE_TEST_ASSIGNMENT_ENABLED` nace OFF (SoT
`services/ops-worker/deploy.sh`, sólo ops-worker — prenderlo en Vercel no hace nada) y toda policy nace
`draft`+`manual`. Falta lo operacional: declarar la policy del canary, drenar el backlog del consumer,
flip y monitor 7 días. Con el flag OFF el candidato **sigue recibiendo** el aviso de avance: apagarlo
es rollback seguro, no apagón. Manual: `docs/manual-de-uso/hr/operar-asignacion-de-tests.md`.

## 2026-08-17 — Beneficios globales de Efeonce documentados para vacantes

Las skills espejo de Talent y Payroll ahora comparten el `Efeonce Candidate Benefits Charter`: 15 días
hábiles de vacaciones remuneradas más un día por cada año continuo cumplido hasta 20 para todos los
colaboradores globales; dos días flotantes, 16 horas de atención médica, dos días de bienestar, duelo,
deber cívico, matrimonio/unión civil, 10 semanas para la madre/persona que da a luz y 2 para el padre/progenitor no gestante (adopción/cuidado: 4/2), mudanza, desarrollo y apoyo para
trabajo remoto/salud mental. Los feriados corporativos son los de Chile y van aparte de vacaciones; una cobertura preacordada recibe descanso compensatorio. La carta permite comunicar el baseline global en vacantes,
pero prohíbe afirmar que todos los permisos ya se autogestionan o calculan en Greenhouse. Payroll/Legal debe
incorporar cada beneficio al instrumento contractual o del proveedor según país/modalidad antes de operarlo.
La carta ahora define año/prorrateo, carry-over, continuidad de servicio, familia, retorno postparto, equivalencia contractor y wallets: aprendizaje US$500/año, conectividad/coworking US$50/mes y salud mental US$300/año. El aporte de equipo (US$400/36 meses) sigue siendo política aprobada, pero se conversa en entrevista u oferta y no aparece en el copy estándar de vacantes. La ley local es overlay que puede mejorar, nunca reducir, el baseline. No hubo cambio de runtime, schema,
contratos ni política configurada.

## 2026-08-17 — Skill de Talent reforzada para vacantes públicas e inbound

Las skills espejo `greenhouse-talent-people-operator` de Claude/Codex incorporan un protocolo
evidence-led para vacantes públicas: evidence packet, benchmark de roles comparables, ledger de
claims, estructura de conversión, medición por fuente y gates de publicación global/remota. La
referencia nueva `references/inbound-recruiting-job-ad-research.md` ahora documenta el playbook
completo: propuesta y prueba, realistic preview, experiencia de candidato, Talent Pool con
consentimiento, compensación/condiciones como señales de confianza y experimentación por outcome,
con fuerza y límites de la evidencia explícitos. No hubo cambio de runtime, schema, beneficios ni
publicación de vacante. Pendiente operativo: completar los datos reales del Senior Visual Designer
antes de redactar/publicar su opening.

## 2026-08-17 — Ajuste de TASK-1397/TASK-1398: alertas de vacantes y Talent Pool

Se reescribieron las tasks antiguas de Careers Alerts para el modelo actual. La audiencia
primaria de avisos es el Talent Pool: solo reciben quienes estén `pool_eligible`, tengan
`future_opportunities` vigente y activen explícitamente la nueva preferencia `opening_alerts`.
La caja pública de Careers queda como carril secundario anónimo de avisos generales: usa Growth
Forms, no crea `Person`, candidato, aplicación ni membresía, y no concede `future_opportunities`.

`TASK-1397` ahora posee el contrato server-side, consentimiento/preferencia, fan-out de
`hiring.opening.published`, dedupe y delivery de ambos carriles. `TASK-1398` solo posee el host
visual público y consume el formulario gobernado. La preferencia del banco debe consumirse en el
self-service tokenizado ya existente de `TASK-1724` antes de activar el carril primario. Ambas
flags permanecen propuestas/OFF; no hubo cambios de runtime. Artefactos actualizados: tasks,
Epic-011, índices, flow y wireframe de TASK-1398.

## 2026-08-17 — Cierre del programa Hiring: Expediente + Scoring IA + Identidad (TASK-1734/1735/1736/1737/1738)

Cierre documental de dos días de trabajo en el dominio Hiring. Las 5 tasks están `complete` y
mergeadas en `develop`; ISSUE-159 resuelta. Esto es lo que quedó **operativo**, lo que quedó
**gated** y lo que le toca al operador.

**Operativo hoy (staging).** El **tab Expediente** de la Application 360 (`TASK-1737`) y el
**workbench de scoring** montado en la card del assessment (`TASK-1738`) son superficies reales.
Los flags `HIRING_EVALUATION_DOSSIER_AI_ENABLED` y
`HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED` fueron **creados ON en staging el 2026-08-16**
con autorización explícita del CEO (verdad live: `vercel env ls`); ambos siguen **OFF en
producción**. La **remediación histórica de nombres se EJECUTÓ**: 3 personas reales corregidas
(Valentina Villa, Stana Medina, Aldo Romano), con actor y razón en
`candidate_identity_display_audit`, y 2 perfiles QA podados a mano de la allowlist. Verificado
contra la DB real durante este cierre.

**Gated (y por qué).** Los 3 flags del run de scoring (`..._RUN_ENQUEUE_`, `..._EXCEPTION_POLICY_`,
`..._RUN_CONFIRM_`) siguen OFF en todos los runtimes y el scheduler `ops-assessment-ai-drain` nace
pausado. El gate de promoción sigue bloqueante — pero **el bloqueo ya no es de instrumento, es de
volumen**: `pnpm hiring:ai:gold-set-sample`, la rúbrica BARS y el protocolo en ciego existen y se
entregan **vacíos**, y el muestreo real mostró **11 respuestas humanas calificadas contra un piso
de 49**. La ruta A (doble rating + adjudicación) **no es ejecutable hoy por falta de DATOS, no de
personas**. Consecuencia operativa que conviene no perder: **el carril uno-a-uno es el modo
correcto ahora, y es el que genera esa materia prima.**

**Lo que el primer uso real corrigió** (ninguno lo atrapó un test verde):

- El primer expediente confirmado se guardó **cortado a mitad de frase** en exactamente 8000
  caracteres. El panel no lo delataba porque renderiza desde `proposedJson`. Límite a **20000**,
  write path que **falla loud**, y la versión completa registrada como nota nueva con chip
  **"Versión superada"** sobre la truncada.
- `per_criterion_contradictory` disparaba en **11 de 14** items reales, justo en las respuestas
  buenas: el scorer devolvía aportes ponderados que suman el global y el router los comparaba
  contra su promedio. La escala ahora se **declara** (`weighted_contribution`, prompt
  `...scoring.v2`, policy `...risk_policy.v1_1`) → **2/14**, y las 2 son contradicciones reales.
- `manifestSummary` renderizaba `{a}/{a}` y **decía siempre 100%** mientras los gates debajo decían
  "faltan 10" — en la superficie cuyo propósito es no mentir sobre cobertura.

**Próximos pasos del operador**, en orden:

1. Smoke en staging del propose/confirm del expediente + evidencia visual del panel de propuesta
   con datos reales (es lo único que separa a `TASK-1735`/`1737` de producción).
2. Canary de identidad en staging por el runbook `candidate-identity-rollout.md`; luego flip de
   producción.
3. Acumular gold set por el carril uno-a-uno hasta el piso de 49 (protocolo
   `docs/manual-de-uso/hr/calificar-gold-set-de-referencia.md`). Recién ahí corre
   `pnpm hiring:ai:promotion-gate` y se abre la secuencia shadow → canary → promoción del run.

Ambas ADRs pasaron a **`Accepted`** en este cierre: la decisión fue autorizada e implementada.
**Aceptar no es prender** — el estado de rollout de cada flag manda y vive en el ledger.

## 2026-08-17 — Workbench de scoring IA (TASK-1738 complete) + escala de perCriterion (TASK-1734 delta)

Dos trabajos encadenados: cerrar el workbench de revisión y arreglar el bug de dominio que el
propio workbench destapó al correr con datos reales.

**TASK-1734 — delta correctivo: `per_criterion_contradictory` medía la escala equivocada.** El
primer run real (14 items) disparaba la señal en **11 de 14** — y justo en las respuestas BUENAS.
El scorer devolvía **aportes ponderados que suman el score global** (91 = 18+25+25+23, la escala
que la rúbrica del banco declara en su propio texto: `"0-100 (25 puntos por criterio)"`) y el
router los comparaba contra su **promedio**. Con 4 criterios de 25 puntos, un 91 sano tiene
promedio 22,75 → delta 68 ≫ 25 → contradicción falsa por construcción: cuanto mejor la respuesta,
más contradictoria se veía. `batch_eligible` quedaba muerto y el operador revisaba todo a mano —
el subsistema perdía su razón de ser.

La causa no fue un `mean` mal tipeado: fue un **contrato implícito**. El prompt v1 pedía "el
puntaje por criterio" y el schema declaraba 0–100 por criterio; aporte y nota independiente eran
lecturas igual de válidas, y el modelo alternaba entre ambas según la calidad de la respuesta.
Fix: la escala se **declara** (`weighted_contribution`, `weight` + `score` ≤ weight), el prompt la
pide explícitamente (`...scoring.v2`, las proposals v1 quedan stale), `summarizeCriterionContribution`
es la única traducción aportes → score global, y el router compara contra ese implicado
(`...risk_policy.v1_1`). Replay de los 14 proposals reales: **11/14 → 2/14**, y las 2 restantes son
contradicciones reales del modelo (global 21 con aportes que implican 65).

**TASK-1738 complete (code complete; smoke staging pendiente).** El workbench quedó montado en la
card del assessment de la Application 360, con `UI ready: yes` (dirección visual versionada +
scorecard 4,46). La evidencia GVC se corrió sobre un run REAL con `claude-sonnet-5`, y mirar los
frames reveló lo que ningún test verde había atrapado: la entrada vivía dentro del panel de
revisión (una cola pendiente quedaba invisible), `manifestSummary` renderizaba `{a}/{a}` y por lo
tanto **decía siempre 100%** mientras los gates debajo decían "faltan 10" — exactamente el bug
class que esta superficie existe para impedir —, `warning.main` como texto daba 1,74:1 en las dos
frases más load-bearing de la pantalla, la cobertura honesta se iba con el scroll y `sx={{ ms: 1 }}`
no aplicaba ningún margen porque `ms` no existe en MUI.

Contratos verificados sobre el runtime real: muestra ciega sin propuesta en el DOM,
`sawProposalBeforeScoring` veraz en ambas direcciones contra la DB, confirm `disabled` con causas
visibles, cero scroll horizontal en 390.

Pendientes declarados: smoke staging (runbook de 1734) y el contraste del `Alert severity='info'`
del tema (3,94:1, preexistente portal-wide — causa raíz global, no se parcha por host).

## 2026-08-16 — TASK-1737 complete (code complete, rollout gated) — tab Expediente

El tab `activity` sintético de la Application 360 es ahora el **Expediente** real: timeline de
notas persistidas (kind, autor, source con provenance del agente) intercalado con eventos de
etapa, composer tipado y flujo dossier propose → editar → confirmar/rechazar con estados
honestos. Alias `?tab=activity` preservado y probado por el GVC.

**El gate BLOQUEANTE anti-anclaje del Delta (3) de TASK-1735 queda cerrado.** El predicado
"scorecard propio abierto" se extrajo a `getOwnScorecardStateForApplication` y ahora es UNO
solo, compartido por `listResponses`, `listPeerScorecardResults` e
`isViewerBlindForApplicationEvaluation`. El reader `listHiringApplicationNotes(appId, viewerUserId?)`
omite score-bearing ajeno + toda nota `agent` para el viewer bloqueado, y `GET /dossier`
devuelve `proposal: null`. Sin `viewerUserId` (server-internal) no filtra. La ceguera vive en el
reader, así que Nexa/MCP la heredan por construcción. Delta registrado en 1735 con la Open
Question de `interview_note` resuelta.

`UI ready` subió a `yes` en el cierre: se materializó la dirección visual versionada
(`docs/ui/visual-directions/TASK-1737-application-expediente-direction.md`, 3 direcciones
comparadas → "documento de decisión") y el scorecard
(`docs/ui/reviews/TASK-1737-application-360-expediente-tab.scorecard.json`, promedio 4,54).
`visualImpact` 4,0 queda bajo el sub-piso premium 4,5 por razón **estructural** declarada y
aceptada: es un tab de lectura larga dentro de una vista anfitriona que ya define el momento
visual dominante. `pnpm task:lint --task TASK-1737` → template=1 errors=0.

**Drift corregido en el cierre:** el scenario GVC estaba declarado como `.yaml` cuando el DSL
del repo es `.scenario.ts`, y el scorecard visual estaba declarado pero no existía.

**Rollout gated (no cerrado):**

1. `HIRING_EVALUATION_DOSSIER_AI_ENABLED` sigue **OFF** en producción — dueño TASK-1735, esta
   task no lo prende. Con el flag OFF la UI muestra `ai-off` honesto y las notas manuales operan.
2. Evidencia visual del panel de propuesta con datos reales (`proposal-panel`, `proposal-edit`,
   `reject-dialog`, `blind-lock`) pendiente de seed en staging.
3. Smoke `staging:request` con las dos personas agente (superadmin vs evaluadora bloqueada).

GVC premium local verde: `.captures/2026-08-16T23-49-12_task1737-application-expediente/`
(exitCode 0, 0 quality findings, rubric enterprise `pass`, 1440 + iPhone 13).

**Impacto cruzado:** TASK-1737 libera la propiedad de `Application360View.tsx`. La nota
"pendiente: integración con Application360View, el archivo lo posee TASK-1737" de
`TASK-1738-assessment-ai-review-workbench.md` quedó **stale** — el commit `a533d10dd` ya montó
`AssessmentAiRunEntry`. No edité esa spec porque otro agente la tiene en vuelo en esta misma
sesión; que la actualice en su cierre.

## 2026-08-16 — Pipeline Hiring contenido y accesible

El scope de vacante y el conteo de postulantes se integraron al `WorkbenchHeader`; búsqueda, ayuda y Kanban
quedaron dentro de un solo plano operacional, con lanes tonales y tarjetas como superficies primarias. El título
de la vacante no se trunca a 390 px y el fallo simulado queda solo en el harness. GVC desktop/mobile, teclado,
rollback, reduced-motion y axe están verdes sin findings en
`.captures/2026-08-16T22-13-39_task355-hiring-pipeline-board`. Cambio local, sin commit/push/deploy.

## 2026-08-16 — TASK-1736 complete (code complete, rollout gated) — cierre del trío del día

TASK-1736 cerró sus 5 slices (0-4): ADR de canonicalización, primitive de normalización
culturalmente segura (62 tests multiculturales), evidencia append-only + reconcile CAS +
corrección humana capability-gated, detector live (51 perfiles: 4 remediables — 2 humanos +
2 QA a podar) + remediación dry-run→allowlist→apply→rollback, 2 señales reliability, runbook.
Auditoría doble: talent PASS, arch CONDITIONAL → resuelta (actor/razón al audit, rollback real
con CAS del before-value, PII edge 401 chars, placeholder anti display-invisible, retry
idempotente, nota A3 del COALESCE cross-dominio). Gates: suite full + build verdes. Rollout
gated al runbook candidate-identity-rollout.md: flag OFF; remediación histórica requiere
allowlist humana del operador. Con esto las 3 tasks del día (1735, 1734, 1736) están complete.
Siguiente: /implement-task TASK-1737 (tab Expediente) + TASK-1738 (workbench scoring IA).

## 2026-08-16 — Hiring Desk/Application 360 migrada a superficies canónicas

El frame compartido de Hiring Desk y la Application 360 dejaron de montar título, navegación, identidad y tabs
directamente sobre el canvas gris. Ahora usan `SurfaceRecipe`, `WorkbenchHeader`, `GreenhouseBreadcrumbs` y
`DetailHero`; la evaluación quedó en una sola superficie y la cola vacía se compacta. ESLint focal, typecheck,
8 tests y GVC desktop/390 px están verdes en
`.captures/2026-08-16T21-30-17_task1363-assessment-radar-runtime`. Cambio local, sin push/deploy.

## 2026-08-16 — TASK-1734 complete (code complete, rollout gated) + TASK-1736 Slices 0-2

TASK-1734 cerró sus 7 slices: ADR aceptado, run aggregate durable, fan-out con risk router,
eval harness con gate de promoción BLOQUEANTE (dataset humano de Talent pendiente, owner por
asignar), exception review + batch confirm con manifest anti-anclaje, suite anti-leak (37 tests,
cero leaks reales), señales de reliability + rollback CLI + runbook. Auditoría doble CONDITIONAL
→ resuelta (terminal SQL del enum, drain sin head-of-line, muestra ciega ESTRUCTURAL en el
reader). Gates: suite full 11.157+ y build verdes. Rollout gated al runbook
`docs/operations/runbooks/assessment-ai-scoring-rollout.md`: flags OFF en todos los runtimes,
scheduler `ops-assessment-ai-drain` declarado nacido en pausa (se crea en el próximo deploy del
ops-worker). TASK-1736 avanza: S0 ADR + S1 primitive de normalización + S2 evidencia/reconcile/
corrección humana (flag OFF); quedan S3 (detector + remediación histórica) y S4 (canary/cierre).

## 2026-08-16 — TASK-1736 tomada por la sesión Claude (reasignación de operador)

El operador (CEO) reasignó TASK-1736 a esta sesión para avanzar en paralelo con TASK-1734
(Slices 4-5 en vuelo por subagentes). Arranca por Slice 0 (ADR + field policy matrix,
docs-only). La matriz de sign-offs se resuelve por la misma autorización ejecutiva del CEO
registrada hoy para 1734. La sesión que la creó no había iniciado ejecución.

## 2026-08-16 — Radar de assessment corregido localmente

Application 360 ya usa Recharts para el radar de competencias: eliminó `competencyKey.slice(0, 7)`, muestra
etiquetas humanas sin cortar palabras, leyenda puntaje/objetivo y una guía visible con nombres completos. El
perfil azul sólo se dibuja con el scorecard completo; pendientes nunca se convierten en cero. La cola vacía
cede ancho al scorecard y el copy técnico cercano quedó localizado. Tests focalizados, ESLint, typecheck y
captura GVC desktop/mobile verdes en `.captures/2026-08-16T19-02-20_task1363-assessment-radar-runtime`.
Rollout remoto pendiente de push/deploy.
