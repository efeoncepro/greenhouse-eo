# SEO Specialist Senior — cierre de preparación para asignación manual

## Solicitud y estado

El operador pidió completar la preparación del test SEO y revisar después la automatización.
Este documento registra discovery, ejecución y evidencia; no declara activación ni release.

- Vacante: `EO-OPN-0674` / `opng-262f0d6d-f139-4355-9017-165cbab54b9c`.
- Checkout compartido observado: `develop`; no se cambia de rama ni se usan worktrees o subagentes.
- WIP previo preservado: afinación de `scripts/hiring/task-1604-role-assessment-pack.ts` y
  `docs/documentation/hr/task-1604-seo-art-assessment-pack.md`.
- La conformidad del operador con las nueve preguntas y la autorización de afinación constan en la conversación.
  No prueban que dos expertos hayan realizado la calibración de respuestas y tiempos descrita en el pack.
- La petición general autoriza el resultado funcional. El preflight formal de ejecución de las tasks existentes
  se completó con el goal confirmado mediante «Ok vamos» y los hooks de ambas tasks.

## Evidencia inicial (antes de ejecutar)

Readback del 2026-09-13, mediante:

```bash
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/create-task-1604-assessment-pack.ts --readback
```

Resultado: vacante `active/published/public_listed`, nueve preguntas authored en `sme_review`,
`templates=[]`, `policy_count=0`, `assessment_count=0`. En ese readback inicial no se hicieron mutaciones a la base. Ver ejecución posterior abajo.

Inspección de código:

- `create-task-1604-assessment-pack.ts`: la carga busca por texto exacto; no es un actualizador de borradores.
- `assessment/store.ts`: existen `createQuestion` y `transitionQuestionStatus`; no se encontró un command
  dedicado de edición/versionado de contenido existente. No usar UPDATE ad hoc para suplirlo.
- `assessment/public-taking.ts`: selecciona preguntas activas del banco por competencia/nivel/rank;
  no lee un cuestionario congelado por instancia.
- `assessment/instances.ts`: `insertCandidateTest` es el primitive transaccional común de asignación.
- `assessment/scoring.ts`, `review.ts`, `ai/score-response.ts` y `ai/scoring-run/*`: consumen pregunta/rúbrica
  del banco; el congelado debe cubrir también corrección humana y asistida, no sólo pantalla candidata.
- `api/hiring/applications/[id]/assessment-assignment/route.ts`: propose → confirm canónico, plantilla
  resuelta desde la policy; ningún token o enlace sale al operador.

## Ownership y decisión existente

No crear una task o binding paralelo:

- `TASK-1604`: pack SEO, revisión/autoría, materialización y evidencia de cobertura.
- `TASK-1719`: policy, assignment, cuestionario inmutable y comunicación.
- ADR existente: `GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md`, D4.

Precisión respecto de las respuestas anteriores: D4 exige el snapshot antes de expandir **la automatización**
más allá del canary. No afirma que el motor manual esté deshabilitado por su ausencia. El objetivo propuesto
incluye completarlo para conservar lo que cada postulante respondió y preparar el siguiente paso automático.
La asignación básica no necesita emitir claims de TASK-1602 ni implementar el Quality Gate de TASK-1603;
se debe reconciliar el lenguaje antiguo de las dependencias, sin declarar aprobado Talent Assurance.

## Plan de ejecución propuesto

1. Ejecutar los hooks de las tasks dueñas después de confirmar el goal. Registrar el delta de alcance y
   criterios en cada dueña. Mantener código server-only en `src/lib/hiring/assessment`; sin nueva topología.
2. Preparar una revisión idempotente del banco con comparación de contenido anterior y objetivo. Reutilizar
   versiones iguales; conservar trazabilidad de las reemplazadas. Guardar actor y evidencia de aprobación;
   abortar ante cambios concurrentes o preguntas con uso no contemplado. Preview antes de apply.
3. Preparar la calibración de las nueve rúbricas y tiempos, sin fabricar dictámenes humanos. Si falta la
   revisión independiente exigida por el pack, reportarla antes de activar; no convertir automáticamente
   la conformidad editorial en dos revisiones realizadas.
4. Implementar D4: captura atómica del cuestionario exacto y digest con asignación, inmutabilidad en DB,
   lectura pública allowlisted desde la captura, corrección humana/objetiva/IA con la misma versión y
   fallback explícito sólo para instancias anteriores. No backfill presentado como historia original.
5. Activar las preguntas aprobadas, materializar la plantilla SEO con el operador existente, verificar IDs,
   contenido, rúbricas, seis módulos, pesos `30/20/20/10/10/10` y 75 minutos. Si la resolución efectiva
   selecciona otras preguntas, resolver el contrato de selección antes de habilitar.
6. Configurar policy de `EO-OPN-0674` inicialmente `draft/manual`; habilitar manual tras readiness.
   No activar `on_stage_entry`, no cambiar la etapa de candidatos, no activar banderas globales.
7. Probar el recorrido completo con fixtures aisladas y verificadas como sintéticas, destino controlado y
   evidencia de entrega. Ningún correo a postulantes reales ni asignación real sin selección explícita.
8. Verificar el código desplegado y los consumidores Vercel/worker, migración compatible y readback final
   del binding. Usar el control plane canónico para el rollout requerido; no sustituir producción por
   un script local con credenciales productivas. Un release tiene que identificar el SHA exacto y no
   arrastrar cambios ajenos por estar en develop.

## Evidencia exigible

- [x] Preview y apply del banco idempotentes, sin duplicados de la revisión ni pérdida de historia (readback abajo).
- [ ] Revisión/calibración humana requerida registrada con alcance y versión honestos.
- [ ] Plantilla efectiva: nueve preguntas esperadas, seis competencias, pesos y tiempo correctos.
- [x] Tras asignar, editar/retirar preguntas del banco no cambia el examen ni su corrección (live transaccional).
- [x] DB rechaza mutación del cuestionario capturado; assignment y captura son atómicos (live transaccional).
- [x] Respuestas a preguntas fuera del snapshot se rechazan; rúbricas/answer keys nunca cruzan al candidato (live + contract).
- [ ] Repetir confirmación no duplica instancia ni correo; se conserva el ledger y su linaje.
- [ ] Recorrido sintético recibido → abierto → respondido → entregado, con evidencia runtime.
- [ ] Readback de vacante/template/policy `enabled/manual` y ausencia de asignaciones reales no solicitadas.
- [ ] Tests focales, `pnpm test:live` serializado, QA, docs closure y context strict con resultados explícitos.

## Goal propuesto

Completar TASK-1604 (sólo SEO) y D4 de TASK-1719 para dejar EO-OPN-0674 correctamente vinculada a un test
asignable manualmente: preguntas afinadas y revisión registrada, plantilla exacta, cuestionario inmutable,
policy manual habilitada y recorrido sintético verificado en el runtime desplegado. Trabajar únicamente en
el checkout compartido develop actual, preservar WIP, sin cambiar de rama, worktrees ni subagentes. Mantener
Arte y automatización por etapa fuera de alcance. No enviar a postulantes reales ni inventar calibración
humana. Preparar cualquier release sobre el SHA exacto y control plane canónico, sin incluir WIP ajeno.
No declarar complete si faltan calibración, rollout o evidencia runtime: registrar el bloqueo concreto o
code complete, rollout pendiente según corresponda.

## Inicio de ejecución

Goal confirmado por el operador mediante «Ok vamos», después de explicar el reparto TASK-1604/1719.
Hooks ejecutados; rama develop confirmada; trabajo secuencial sin subagentes. ADR D4 reutilizado.
Modelo de acceso: writers/readers internos de Hiring con capabilities existentes, snapshot sensible
server-only y proyección pública por allowlist. No se amplían scopes ni recipients.
Plan aprobado: schema aditivo → primitive snapshot y consumidores → tests → banco/policy → runtime.

## Ejecución y readback 2026-09-13

- Dos migraciones aplicadas: `20260913095245733` (snapshot D4) y `20260913095857943`
  (linaje append-only de revisiones). `pnpm migrate:status`: sin migraciones pendientes.
  `pnpm db:generate-types`: tipos regenerados; sólo los dos objetos y la columna de este alcance.
- Writer canónico `reviseUnpublishedQuestion`: revisión transaccional con digest esperado, conservación
  del original retirado, sucesor en SME review e idempotencia. API interna author-capability:
  `POST /api/hiring/assessments/questions/revisions`. No activa.
- Preview contrastado con las nueve preguntas originales y el contenido versionado previo. Ocho cambios,
  una pregunta intacta. `revise-task-1604-seo-questions.ts --apply` ejecutado dos veces: misma salida e IDs.
  [Readback de versiones](2026-09-13-seo-question-revision-readback.json). Nueve `sme_review`, ocho originales
  `retired`. No hay duplicados nuevos en la repetición. Motivo explicita aprobación editorial, sin inventar
  calibración independiente.
- Readback mediante `create-task-1604-assessment-pack.ts --readback`: ambas vacantes publicadas/activas,
  `templates=[]`, `policy_count=0`, `assessment_count=0`. Arte no se modificó.
- Snapshot captura contenido privado, competencias, pesos y orden; lectura pública allowlisted y corrección
  objetiva/humana/IA, dossier y exportación gold-set usan la versión de cada instancia. Legacy sólo cuando
  la columna es NULL. No se fabricó backfill histórico. Migraciones aditivas conservan compatibilidad con
  el código desplegado anterior; por ello no bastan por sí solas para afirmar D4 operativo.
- `pnpm exec vitest run --project unit src/lib/hiring/assessment src/lib/hiring/dossier-ai
  src/app/api/hiring/assessments/questions/revisions src/lib/hiring/data-origin`: **67 archivos, 594 passed**.
- `pnpm test:live src/lib/hiring/assessment/questionnaire.live.test.ts
  src/lib/hiring/assessment/question-revisions.live.test.ts`: **2 archivos, 2 passed**, serializados.
  Prueban inmutabilidad, retiro/cambio del banco sin alterar examen/corrección, anti-leak, pregunta ajena,
  replay, linaje y rechazo de revisión activa/conflictiva. Demand/opening/application/assessment/questions
  de prueba revertidos dentro de la transacción; sólo identidad sintética scoped como fixture durable.
  Sin evento de assignment ni correo. Esto NO equivale a entrega/apertura real en el runtime desplegado.
- `tsc --noEmit` pasó; compilación y gates de cierre se registran en el cierre de esta auditoría.
- La primera invocación amplia de Vitest con `--exclude` también ejecutó el proyecto live sin credenciales:
  dos fallos de configuración. Se corrigió la selección con `--project unit` y se verificaron ambos live
  por el runner canónico; no se ocultaron fallos funcionales ni se contaron skips como evidencia.

### Pendientes al corte previo a la autorización

1. Decisión del operador sobre mantener calibración independiente previa o autorizar piloto manual con
   conformidad editorial y calibración pendiente explícita. Pregunta enviada; todavía sin respuesta.
2. Tras esa decisión: activar por writer, materializar nueve preguntas/seis módulos, configurar/habilitar
   policy manual, comprobar contenido efectivo y asignabilidad. No cambiar trigger a `on_stage_entry`.
3. Release canónico del código D4 y sus consumidores, seguido de smoke real del recorrido y entrega a
   destino de prueba autorizado. No hubo push/deploy ni envío. No declarar test asignable todavía.

## QA Release Audit — corte previo a la autorización de piloto

### Verdict

**BLOCK para activación y cierre operativo.** Closure state: `code complete, rollout pendiente` para D4;
preparación SEO aún espera decisión de calibración/piloto y vinculación. La task completa sigue in-progress.

### Scope

Diff propio de preguntas SEO, revisión interna, snapshot y consumidores, migraciones/tipos y documentación.
Runtime comprobado: PostgreSQL compartido por primitive transaccional, sin correo. No se verificó Vercel/worker
con este código. Fuera de alcance: Arte, automatización de etapa, asignaciones reales.

### Risk Classification

| Riesgo | Nivel | Motivo |
|---|---|---|
| Schema y primitive compartido | Alto | Preguntas y corrección por instancia; compatibilidad legacy. |
| API author y pauta privada | Alto | Autor interno autenticado; deny 401/403 y allowlist pública. |
| Release | Pendiente | No confundir schema aplicado con consumidores desplegados. |

### Injected Skills

`greenhouse-talent-people-operator`, `software-architect-2026`, `greenhouse-secret-hygiene`,
`greenhouse-qa-release-auditor`, `greenhouse-documentation-governor`. Release/browser skills consultadas
para preparar límites; no se ejecutó despliegue ni smoke browser. `vercel-operations` consultada por router;
no se operó Vercel.

### Evidence

| Gate | Resultado | Evidencia |
|---|---|---|
| Unit focal | PASS | 67 archivos, 594 passed; 66 repetidos tras ajuste de imports, todos passed. |
| PostgreSQL | PASS | 2 archivos, 2 passed con `pnpm test:live`, cero skipped. |
| Build | PASS | `pnpm build`, exit 0; route revisions compilada; tsconfig temporal restaurado por runner. |
| Tipos | PASS | `tsc --noEmit`; tipos DB regenerados, delta acotado a este schema. |
| Migraciones | PASS | `migrate:status`: ninguna pendiente; dos migraciones nuevas aplicadas. |
| Procedencia | PASS | `hiring:data-origin-gate`, fixtures explícitas sintéticas. |
| Worker dependencies | PASS | `worker:runtime-deps-gate`, externos resueltos. |
| Task lint | PASS | Ambas tasks: cero errores/warnings; siguen in-progress. |
| Docs closure | PASS | Warning de revisar lifecycle; ambas tasks verificadas sin movimiento de estado. |
| Secret audit | No concluyente | Runner sin carga de entorno devolvió ocho `unconfigured`; no prueba secrets de producción. No hubo cambios de secrets/env. |

### Blockers

1. Decisión sobre calibración o piloto, luego activación y binding manual comprobados.
2. D4 aún sin release ni evidencia de los consumidores desplegados.
3. Recorrido de entrega/apertura/respondido no ejercitado en destino autorizado.

### Conditional Follow-Ups

No expansión automática ni activación de flags globales con este cambio. Cualquier nueva revisión del contenido
requiere nuevo manifest/revisión, sin sobreescribir el historial aplicado. No retirar migración de linaje una
vez usada; rollback de código conserva schema aditivo y evidencia.

### False-Closure Traps Checked

- Tests locales y DB no se presentan como deploy ni entrega real.
- No UI modificada; no se atribuye evidencia visual a esta ejecución.
- No flags activados, backfill histórico ni recipients ampliados.
- Docs y task distinguen calibración, código, migración, activación y release.
- Sentry/observabilidad de producción no verificados; no se afirma estabilidad desplegada.

### Final Call

Las revisiones están guardadas y la implementación técnica probada. No puede declararse asignable ni complete:
faltan decisión humana indicada, plantilla/policy, despliegue y prueba del recorrido en el runtime destino.

## Autorización de piloto manual — 2026-09-13

El operador respondió «Autorizaso» a la pregunta explícita de autorizar un piloto manual con su aprobación
editorial y calibración independiente pendiente. Esa respuesta autoriza activar las nueve versiones del
manifest, materializar la plantilla y habilitar su policy manual para EO-OPN-0674. No acredita dos dictámenes
SME ni una calibración realizada; no autoriza envíos a postulantes ni automatización por etapa.
Actor del acto delegado: `user-efeonce-admin-julio-reyes`; ejecución por Codex mediante writers canónicos.
Esta decisión sustituye el bloqueo de calibración descrito en el corte anterior de esta auditoría.

## Vinculación manual aplicada — 2026-09-13 10:14 UTC

- Activadas las nueve versiones exactas por `transitionQuestionStatus`, con autorización del operador
  para piloto; calibración independiente permanece pendiente.
- Plantilla `atpl-6621f306-cb50-4286-a41d-969927a579e3` materializada por el operador existente.
- Policy `hoap-e7e269ac-2c2a-4023-8873-15db1302d63e`, versión 1, `enabled/manual`, trigger NULL,
  75 minutos, límite piloto de cinco asignaciones por hora. Creación y habilitación vía API desplegada
  `PUT/POST /api/hiring/openings/.../assessment-policy`, actor autenticado `user-agent-e2e-001` en nombre
  del operador; HTTP 200 y GET posterior HTTP 200 con eventos configured/enabled.
- Despliegue consultado: `dpl_AU6AsoXoqy7M8habT4dNedqoiniC`, staging vigente; no es un deploy de D4.
- Verificación exacta: nueve preguntas esperadas activas, seis módulos, pesos correctos, cero módulos vacíos,
  digest policy idéntico al resolvedor canónico. [Readback](2026-09-13-seo-binding-readback.json).
- Ningún command de asignación ejecutado, ninguna comunicación enviada. La policy manual ya está habilitada;
  la protección D4 todavía requiere su release y smoke desplegado. El bloqueo de calibración quedó resuelto
  para el piloto por decisión humana, no por una calibración ficticia.

## Preparación de release acotado

Commit candidato inicial `8461c90c1f6818147470d871c0141528fd1c55d8`, padre main
`586a8627568a86ebee15c910cff2cb0f8e2405ce`. Preparado mediante índice Git temporal y commit-tree;
no cambió la rama/índice/worktree compartidos. El patch de este alcance se aplicó con merge de tres vías
sobre main; 119 cambios previos de documentación/tooling de develop quedaron excluidos. Igualdad de árbol
runtime (src, services, migraciones, package/lock/config) con el código probado verificada.
Preflight local: `release_batch_policy=requires_break_glass`, por las dos migraciones y tipos DB. Requiere
excepción auditada con motivo >=20 caracteres y capability del operador. No se aplicó ningún override.
Los otros resultados previos a publicar son evidencia incompleta (SHA todavía local/sin CI, credenciales
WIF/Sentry del proceso local); no se presentan como fallos funcionales del código ni se omiten para desplegar.
La aprobación del piloto no se presenta como autorización de esta excepción del control plane.
