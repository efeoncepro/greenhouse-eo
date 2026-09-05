---
name: greenhouse-qa-release-auditor
description: Risk-based QA and closure gate for Greenhouse implementations. Use after any non-trivial code, UI, schema, integration, workflow, release, local skill, incident, or docs-affecting change; before saying "listo", moving a task to complete, committing a risky slice, pushing, opening a PR, or approving work where tests may be green but runtime, rollout, UX, security, data, docs, or observability evidence is not proven. Also use when the operator asks for QA, robust validation, regression review, release readiness, "tests verdes pero no confio", or cross-agent closure audit.
---

# Greenhouse QA Release Auditor

This is the final implementation QA judge. It does not replace domain skills,
tests, GVC, Sentry, release tooling, or documentation governance. It routes to
them, requires evidence, and blocks false closure.

Core rule: **tests passing is evidence, not a verdict**. A change is not
complete until the relevant runtime, rollout, UX, data, security, observability,
and documentation gates are satisfied or explicitly reported as pending.

## First Reads

Read only what the change needs:

- `AGENTS.md`
- `CLAUDE.md`
- `project_context.md`
- `Handoff.md`
- the active `TASK-###`, `MINI-###`, `EPIC-###`, issue, audit, or spec
- `references/risk-matrix.md`
- `references/verification-matrix.md`
- `references/ui-qa.md` when UI is touched
- `references/runtime-rollout.md` when runtime/rollout can differ from code
- `references/security-qa.md` when auth, access, input, secrets, webhooks, or external APIs are touched
- `references/observability-qa.md` when incidents, Sentry, logs, health, or production reliability are involved
- `references/evidence-format.md`
- `references/skill-injection-map.md`
- `references/verdict-format.md`

If the change touches UI, release, finance, payroll, auth/access, cloud,
integrations, data/schema, AI/agent workflows, documents, or security, load the
agent-specific specialized skill(s) from the injection map before issuing a
verdict. Codex and Claude skill names are not assumed to match.

## QA Workflow

1. Identify the real diff.
   - Run `git status --short`.
   - Run `pnpm qa:gates --changed --agent claude` as the mechanical first pass.
     Always pass `--agent claude` when running as Claude: the CLI defaults to
     `both` and would print Codex-only skill names (e.g. `software-architect-2026`,
     `greenhouse-portal-ui-implementer`, `greenhouse-browser-diagnostics`,
     `vercel-operations`) that do not exist as Claude skills.
   - Add explicit flags when the diff is incomplete or intent matters:
     `--ui`, `--runtime`, `--auth`, `--data`, `--finance`, `--payroll`,
     `--integration`, `--release`, `--security`, `--docs`, `--production`.
   - If there is an active task, include `--task TASK-###`.

2. Classify risk.
   - Use `risk-matrix.md`.
   - Treat the highest-risk touched domain as the closure bar.
   - If code paths are shared, tenant-sensitive, finance/payroll/auth/data, or
     production-facing, do not downgrade the risk because the diff is small.
   - If the worktree contains unrelated changes, scope QA to owned files and
     call out the coordination boundary.

3. Inject domain skills on demand.
   - For every triggered domain in `skill-injection-map.md`, read the relevant
     Codex, Claude, or both-agent skill column before judging that domain.
   - Record the injected skills in the QA report by agent namespace when both
     agents are in scope.
   - If a needed same-name skill is missing in one agent, say so, name the
     documented fallback, and treat missing auditor coverage as a blocker
     unless equivalent evidence exists.
   - Never copy the Codex skill list into Claude by assumption, or vice versa.

4. Build the evidence plan.
   - Use `verification-matrix.md` to choose required commands and live/runtime
     checks.
   - Prefer existing scripts and canonical CLIs over ad-hoc probes.
   - UI evidence must come from GVC or an explained GVC blocker.
   - Runtime evidence must use the active runtime, not only mocks or local unit
     tests, when rollout behavior depends on env, flags, migrations, workers,
     webhooks, external systems, or deployed services.

5. Run or require gates.
   - Run lightweight checks directly when safe.
   - Do not perform destructive, mutating, production, or push/release actions
     without explicit operator approval and the relevant skill.
   - If a gate cannot be run, explain the exact blocker and what would satisfy
     it.

6. Adversarial review.
   Ask:
   - What would make an agent falsely believe this is done?
   - What passed locally but might fail in Vercel, Cloud Run, Cloud SQL, Sentry,
     Entra, HubSpot, Notion, Teams, or a real browser?
   - Are there flags/env vars/redeploys/backfills/migrations/webhooks/secrets
     still missing?
   - Are docs/task lifecycle/handoff synced with the actual runtime state?
   - ¿Qué afirmación de este cierre viene de un doc/handoff/turno anterior y no de
     una verificación propia? ¿Algún gate tiene su expectativa escrita como literal?
     ¿Alguna exención nueva de lint fue medida? Ver §Integridad de la evidencia.

7. Verdict.
   - Use `evidence-format.md` and `verdict-format.md`.
   - Verdicts are `PASS`, `CONDITIONAL PASS`, or `BLOCK`.
   - Use `code complete, rollout pendiente` when code is correct but runtime
     activation is not done.
   - Use `operativamente bloqueado` when the behavior cannot exist until an
     external action or missing dependency is resolved.

## Recuperación de lifecycle y cierre del release

Para una reparación que emite eventos, exige guardas activas en todos los runtimes consumidores y
readback después de sus entregas/proyecciones exactas. Compara los datos protegidos antes y después;
no basta que el command devuelva éxito. Acceso elegible por reader no prueba un login interactivo.
`references/runtime-rollout.md` contiene el checklist y los límites de evidencia.

En releases con intentos concurrentes, separa run, manifest y runtime; `cancelled` no es éxito ni una
causa técnica de fallo. La cancelación de un duplicado del mismo SHA puede afectar al manifest activo
por una limitación aún abierta del reconciler. Usa `greenhouse-production-release` y su runbook §0.1;
no recomiendes retry del job final sobre `aborted` ni cierres el bug de correlación por un release verde.

## Cierre de incidentes Sentry

Para un incidente de cliente o identidad, separa corrección, evidencia de runtime y estado de
Sentry. Ninguna de las tres sustituye a otra.

- Un filtro cliente sólo es admisible si usa una conjunción de señales estables y específicas del
  incidente (origen/entorno, mensaje y frame o mecanismo conocido). Nunca suprimas por user-agent,
  proveedor, texto parcial o familia de error de forma amplia: conserva eventos que no satisfagan
  todas las condiciones y cúbrelo con casos positivos y negativos.
- Un acceso reparado mediante migración debe probar el estado persistido: migración registrada,
  view activa, grant exacto y persona/rol esperado. Un fallback que deja pasar la ruta es evidencia
  de compatibilidad, no de que la proyección de permisos quedó sana.
- Antes de declarar una issue de Sentry resuelta, confirma que el principal realmente puede mutar su
  estado. Un token de sólo lectura puede listar eventos pero no resolverlos; ante un `403`, registra
  la limitación sin exponer el token y usa una sesión o credencial con alcance de escritura autorizada.
- Tras producción, verifica el runtime que generaba el evento, la salud o smoke asociado y la
  frescura de eventos durante una ventana explícita. "No hubo eventos desde el deploy" no equivale
  a cierre si no se inspeccionó la misma organización, entorno y issue.

## Non-Negotiable Blockers

### AXIS Shared UI Platform Gate

For AXIS changes, verify the shared UI platform ADR, `TASK-1591`, and
`docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`. Require evidence that package auth/env/secrets are
wired in the consuming runtime, the adapter works, visual and accessibility checks pass, and rollback is defined
and testable. A successful package publish is not consumer runtime evidence and cannot produce a `complete` verdict.

- No GVC/screenshot evidence for visible UI changes.
- Runtime-dependent change validated only by unit tests.
- Flags, env vars, migrations, backfills, secrets, webhooks, worker deploys, or
  redeploys required but not applied or explicitly left pending.
- Auth/access change without both visible surface (`views`) and fine-grained
  capability/entitlement reasoning.
- Finance/payroll/accounting change without the domain auditor skill.
- Production release/promotion/rollback without `greenhouse-production-release`.
- Documentation closure missing for behavior/runtime/shared-contract changes.
- Sentry/runtime issue declared resolved without live evidence or issue-state
  follow-through.
- Hardcoded visible reusable copy, tokens, secrets, tenant ids, or ad-hoc API
  endpoints where canonical primitives/contracts exist.
- Cross-agent QA that reports only Codex injected skills when Claude also needs
  a different skill or an explicit fallback.
- Any of the three fake-evidence forms below (hardcoded gate expectation, lint
  exemption outside the rule's scope, runtime claim sourced from a doc).

## Integridad de la evidencia — cuando el artefacto de verificación miente (2026-08-09)

`tests passing is evidence, not a verdict` tiene un corolario que se olvida: **el
artefacto de verificación también miente, y miente pareciendo verde.** Estas tres
formas se detectaron en UNA sesión (cierre del carril de acceso del portal cliente,
`TASK-1678/1679/1680`, dos releases a producción) y ninguna la atrapó un gate:
las tres se veían bien hasta que alguien miró el runtime. Búscalas en el paso 6
(Adversarial review), no al final.

1. 🔴 **Una nota del `Handoff.md` —o de un doc, o de un turno anterior— NO es
   evidencia de runtime.** Caso fuente: durante toda la sesión se repitió que
   "`/api/auth/agent-session` devuelve 403 en producción por diseño", tomado de una
   nota del handoff y nunca verificado. Era **falso**: `AGENT_AUTH_ALLOW_PRODUCTION`
   estaba seteada en Production desde hacía 90 días y las sesiones de agente SÍ
   funcionaban ahí (comprobado después con un `curl` de diez segundos). Qué se
   rompe: se declaró "pendiente del operador" una verificación que el agente podía
   hacer solo, y un release estuvo a punto de cerrarse con una casilla sin marcar
   **por una creencia**. Una creencia heredada es peor que una duda: no se
   investiga.
   **Regla: toda afirmación sobre runtime se verifica contra el runtime** — `curl`
   al endpoint real, `vercel env ls`, `gcloud run services describe`, el reader, la
   consulta a PG. Nunca contra `Handoff.md`, un doc de arquitectura, un runbook o
   la memoria de la sesión: **un doc describe el día en que se escribió**, y las
   env vars, flags y revisiones cambian sin tocarlo. Si no se puede verificar, se
   reporta como *no verificada* — no como hecho, y tampoco como "pendiente del
   operador" cuando el agente tiene el CLI en la mano. Esto vale igual para
   afirmaciones cómodas ("eso está apagado", "eso ya se probó") que para incómodas.

2. **Un gate cuya expectativa está hardcodeada no prueba el motor: prueba que el
   estado de hoy sigue igual.** Caso fuente: el script de verificación del carril
   de acceso fijaba "3 rutas abren y 6 muestran empty state". Al asignarle un
   módulo a un cliente —el comportamiento CORRECTO— el script reportó **4 desvíos
   por hacer lo correcto**, y la salida fácil era editar los esperados. Se corrigió
   derivando la expectativa de los datos. Qué se rompe: el gate degenera en test de
   regresión del snapshot con que se escribió, cada cambio legítimo lo "rompe", y la
   presión es siempre silenciarlo en vez de leerlo.
   **Regla: los conteos y selectores esperados se DERIVAN del mismo estado que el
   motor lee** (consulta las asignaciones y computa cuántas rutas deben abrir),
   nunca se escriben como literal. Olfato: *si un cambio legítimo obliga a editar
   el gate, está mal el gate, no el cambio.* Es la 4.ª trampa del ejercicio del
   SEGUNDO CONSUMIDOR (`arch-architect` en Claude / `software-architect-2026` en
   Codex) aplicada a un segundo **estado de datos** en vez de a un segundo cliente:
   no hace falta un segundo consumidor para desnudarla.

3. **Una exención de lint sobre un path que la regla nunca evalúa no exime nada — y
   hace ver la gobernanza más estricta de lo que es.** Caso fuente: el override de
   `greenhouse/no-untokenized-business-line-branching` tenía 6 entradas; medido
   corriendo la regla en `error` con el override vacío, **4 eximían paths fuera de
   su alcance** (su `isUiFile` excluye `src/app/api/**` y sólo evalúa
   `src/(components|views|app)/**`), 1 era especulativa ("si emergen casos" — nunca
   emergieron) y 1 apuntaba a un archivo muerto. Quedó **una** exención real, con
   dueño y condición de retiro. Qué se rompe: nadie puede distinguir cuál exención
   es deuda real, y retirar la regla parece más caro de lo que es — la lista protege
   al ruido y esconde al deudor.
   **Regla: antes de agregar un path a un override, corre la regla en `error` con el
   override vacío y confirma que ESE path produce una violación.** Si no la produce,
   el path no va. Un override es deuda declarada con dueño y condición de retiro, no
   una lista por si acaso; y cada entrada nueva declara por qué existe y qué trabajo
   la retira.

4. 🔴 **El mensaje de un gate es una PROMESA verificable: ejercítala literal.** Un
   gate puede estar **verde, elocuente y equivocado** — ofrece una salida en su
   mensaje de error y otra rama del código la anula, o se rompe justo cuando el
   autor hace lo que la plantilla PIDE. Es la falla más cara de detectar, porque
   el operador obedece la instrucción, falla, y concluye que el problema es suyo.
   Casos fuente, los tres del mismo día (2026-09-01, `task:lint`): (a)
   `ui-wireframe-contract` decía *«o set UI impact to none with rationale»* y la
   inferencia por `Domain` anulaba esa salida; (b) `normalizeStatusValue`
   comparaba el valor crudo del campo y el parser dobla las líneas de
   continuación dentro de él, así que declarar el valor **con su razón debajo**
   —exactamente lo que la plantilla exige— rompía tres reglas distintas; (c) la
   misma regla trataba como error a una task en `to-do` tocada de refilón,
   cuando su propio mensaje dice *«before implementation»*. **Qué se hace:**
   escribe la salida que el mensaje ofrece, tal cual la ofrece, y confirma que
   el gate pasa. Si no pasa, el defecto es del MECANISMO, no del autor — y
   arreglarlo vale más que el trabajo que estabas haciendo. ⚠️ Ninguno de los
   tres rompía un test: los tests fijaban la intención, no la promesa del texto.

   **Delta 2026-09-01 (barrido `stale-progress`) — tres más de la misma familia,
   todas destapadas al USAR el gate en volumen, no al leerlo:** (d) `stale-blocker`
   disparaba con `Blocked by: \`none\` (razón que nombra al blocker cerrado)` — el
   campo decía `none` y la prosa que explica POR QUÉ se desbloqueó activaba el
   guard, castigando justo el contexto útil; (e) `ui-flow-contract` no tenía la
   calibración incidental-vs-focal que su gemela `ui-wireframe-contract` ya
   había recibido — el mismo defecto (c), sin propagar; (f) un commit
   `fix(docs):` contaba como implementación, así que una task sin una línea de
   código aparecía como «ya trabajada». ⚠️ **Lección de propagación: al corregir
   una regla, revisa sus hermanas.** (c) y (e) son literalmente el mismo bug en
   dos reglas que comparten forma.

5. 🔴 **Un test que pasa SIN el arreglo no está midiendo nada — falsifícalo
   siempre.** Escribe el test, revierte la corrección, y **confirma que se pone
   rojo**. Si sigue verde es teatro, y peor que no tenerlo: da confianza falsa y
   protege a la siguiente regresión. Caso fuente 2026-09-01: un test del
   `stale-blocker` pasaba con y sin el arreglo porque reusaba el repo temporal
   del caso anterior — el índice de lifecycle se resuelve por root y ya estaba
   recorrido, así que **no veía los archivos escritos después**. Aislado en su
   propio repo, pasó a 47/48 sin el arreglo y 48/48 con él. El mismo protocolo
   destapó que otro test necesitaba `git init` para siquiera ejercitar el modo
   que decía probar.

6. 🔴 **Un canary hecho de casos NEGATIVOS o ANÓNIMOS no verifica el carril
   autenticado — y en verde se ve idéntico a uno que sí.** Caso fuente 2026-09-05
   (activación del authorization server `auth.efeonce.org`): los canaries pasaron
   **9/9** —metadata, 401s, códigos inválidos, DCR— mientras el correo del magic link
   llevaba días fallando en producción con `RESEND_API_KEY is not configured`. Ninguno
   tocaba el carril por donde entra una persona real. **Regla: clasifica los canaries
   de una activación por lo que EJERCITAN, no los cuentes.** Si todos son negativos o
   anónimos, la cobertura del camino feliz autenticado es **cero** y el veredicto no
   puede ser `PASS`. ⚠️ Corolario: cuando el endpoint responde igual exista o no el
   sujeto —el de magic link devuelve 202 idéntico por anti-enumeración—, su código HTTP
   no es evidencia de nada; hay que leer el hecho observable aguas abajo (la fila de
   `email_deliveries`, la sesión creada, el registro escrito).

   Dos reglas más del mismo caso. **(a) Un canary con pasos OMITIDOS no es verde.** Dos
   estados esconden la mitad del resultado; el canary de ese carril distingue tres —`0`
   verde, `1` rojo, `2` INCOMPLETO— y nombra qué se saltó y por qué. Un `exit 0` con
   pasos silenciosamente omitidos es la misma mentira que el gate elocuente de (4).
   **(b) Un detector sólo está probado cuando se lo ve ENCENDERSE.** Verlo en `ok` no
   prueba que funcione: prueba que hoy no hay nada que detectar. Ese canary revoca el
   acceso a propósito y comprueba que la señal de sesión huérfana se prende — es (5),
   falsificar el test, aplicado a un detector de runtime.

## CLI

Use the repo helper. Running as Claude, always scope skill output with
`--agent claude` (the CLI default is `both`):

```bash
pnpm qa:gates --changed --agent claude
pnpm qa:gates --changed --agent claude --task TASK-1107 --ui --runtime
pnpm qa:gates --staged --agent claude --json
```

The CLI is advisory. This skill owns the final verdict.

Note: the auto-trigger Stop hook (`.codex/hooks/qa-release-stop-hook.mjs`) is
Codex-only and does not fire for Claude. As Claude, invoke this skill yourself
per the QA Release Auditor Gate rule in `CLAUDE.md` — it never auto-runs.
