---
paths:
  - "src/lib/hiring/**"
---

# Hiring / ATS — invariantes (auto-load por path)

Invoca la skill `greenhouse-talent-people-operator` y carga
`docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` +
`docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md`.

**TRES ejes ortogonales**: `stage` (dónde va la persona: `sourced`, `screening`, `shortlisted`,
`interview`, `decision_pending`, `closed`) · **desenlace** en la columna física `decision`
(`selected`, `backup_selected`, `not_selected`, `rejected`, `withdrawn`, `unresponsive`) ·
`archived_at` (si el registro se muestra).

Lo que YA rige:

- **NUNCA cerrar por `PATCH` de etapa.** Cerrar es decidir: pasa por `decideHiringApplication`, que
  emite el evento, arranca el reloj de retención y elige el tipo de correo.
- **Tres listas en `src/types/hiring.ts`, y confundirlas ES el bug** (TASK-1754 Slice F):
  `HIRING_APPLICATION_STAGES` (6, lo que admite la columna — vuelve a ser el espejo del `CHECK`
  desde que el Slice F aplicó el contract; el bug fue el intervalo en que NO lo era),
  `HIRING_PIPELINE_STAGES` (5, el subconjunto **escribible** por un cambio de etapa; **allowlist**, y
  no contiene `closed`) y `TERMINAL_APPLICATION_STAGES` (fuente única de «terminó», hoy `{'closed'}`;
  antes eran tres copias verbatim). **NUNCA** declarar una copia local ni ensanchar el escribible para
  destrabar un gesto del tablero.
- **NUNCA `on_hold` como desenlace.** Una pausa no es un cierre: se registra dejando la etapa en
  `decision_pending`.
- **NUNCA `rejected` para un cierre sin juicio sobre la persona.** Eso es `not_selected` + causa
  gobernada (`capacity_filled`, `opening_closed`, `process_cancelled`), obligatoria ahí y prohibida
  en los otros cinco. Usar `rejected` infla la tasa de rechazo de esa cohorte en el análisis de
  impacto adverso y la saca del Banco de Talento.
- **NUNCA registrar el silencio como `withdrawn`.** Quien dejó de responder es `unresponsive`;
  `withdrawn` significa que la persona lo **declaró**. Las dos son atribución falsa.
- **NUNCA archivar escribiendo `closed`.** `archived_at` es eje propio: archivar no declara desenlace.
- **NUNCA aplicar un contract de enum antes del release** que retira el escritor de `origin/main`:
  hay UNA instancia Cloud SQL para dev/staging/producción (`ISSUE-161`).
- **NUNCA deducir «nadie lo escribe» de «cero filas».** La alcanzabilidad sale del contrato de la
  superficie desplegada, no del contenido de la tabla.
- **NUNCA tomar un `grep -c` como prueba de escritura**: `stage = $n` en `store.ts` era un **filtro** de
  lista y `on_hold` en `src/types/hiring.ts` era un **comentario** explicando su ausencia. Y
  `TALENT_DEMAND_STATUSES` tiene su propio `'qualified'` — es demanda de talento, otro dominio: no
  tocarlo al limpiar etapas de postulación.

El release YA ocurrió (`709e15f66`, 2026-08-23). Estos tres **están aplicados** — afirmarlos en
presente es correcto, y `docs/tasks/pending-migrations/` está **vacía** (sólo su `README`):

- `CHECK` del invariante `stage='closed'` ⟺ desenlace declarado →
  `migrations/20260823101823762_task-1765-closed-invariant.sql`.
- contract del enum de `decision`, seis desenlaces →
  `migrations/20260823100709766_task-1765-decision-enum-contract.sql`.
- contract del vocabulario de **etapas**, de trece a seis (retira `on_hold` y las viejas) →
  `migrations/20260823111250596_task-1754-stage-vocabulary-contract.sql`.

La regla del `NUNCA` de más arriba **no se relaja**: sigue prohibido aplicar un contract antes del
release que retira su escritor. Lo que cambió es el hecho, no el invariante.

## Evaluación pública — el plazo y la completitud (TASK-1746/1751)

Estas dos viven bajo `src/lib/hiring/assessment/**`, así que se tocan desde acá y el daño es al candidato:

- **NUNCA relajar la exigencia de evaluación COMPLETA para enviar.** `submitPublicAssessmentWithClient`
  (`public-taking.ts:651-657`) lanza `assessment_incomplete` si falta cualquier respuesta. Con faltantes,
  enviar es **imposible** — así que ninguna superficie, correo ni respuesta puede prometer «envía lo que
  alcanzaste a guardar» sin verificar antes esta compuerta. La UI lo deriva de `responses` y directamente no
  renderiza el CTA.
- **NUNCA mover el corte del plazo ni intentar un flush AL cumplirse.** El corte es `nowMs >= answerDeadline`
  sin epsilon, contra el reloj de la DB, que es el canónico (`instances.ts:578`). El cliente va ≥1 RTT atrás:
  lo que se dispara al cruzar llega tarde y se rechaza. Lo que salva texto es el guardado **preventivo**,
  antes del plazo — y no extiende nada. El borde `deadline − 1s` tiene test propio; no romperlo.
- **NUNCA aflojar el `message` genérico del endpoint público «para que el error diga la verdad».** El
  contrato es `{ok, code, message}` con mensaje genérico, fijado por test anti-leak; la frontera es pública y
  sin autenticación. El `code` es lo que viaja, y la verdad se construye en el cliente desde ese `code`.
  Si necesitas un caso nuevo, **agrega un `code`**, nunca prosa al `message`.

## Desenlace federado — el carril gobernado y su guard (TASK-1773)

Cerrar una postulación ya NO se opera sólo desde el portal: además del desk hay lane `app`
(`…/hiring/applications/{id}/{outcome,decision/propose,decision/confirm}`) y acción de Nexa
(`decide_hiring_application`). Los tres delegan en `decideHiringApplication`.

- **NUNCA reimplementar una regla de decisión fuera del command.** Causa obligatoria/prohibida, destino
  de etapa, idempotencia, historial, evento y tipo de correo viven ahí. Un lane es un ADAPTADOR; si un
  consumer necesita una regla que el command no tiene, la regla va al command.
- 🔴 **NUNCA crear una tabla de propuestas de decisión.** El guard de `decision-parity.ts` es un **digest
  del estado actual** que `propose` calcula y `confirm` revalida (409 `hiring_decision_proposal_stale`);
  `Migration: none` a propósito. El Banco de Talento persiste sus invitaciones porque una **invitación**
  ES una entidad con ciclo de vida; una **propuesta de decisión** nace y muere dentro de un gesto humano.
- 🔴 **Toda capability `hiring.*` chequeada con `can()` DEBE declarar su parity** en
  `src/lib/hiring/capability-parity-manifest.ts` (`federated` con `evidence` = ruta del lane `app` que el
  test verifica que exista · `deliberately-internal` con razón · `pending` con razón). Agregar una sin
  declararla **rompe el test**, y esa es la intención: el hueco no fue una ruta faltante, fue que nadie se
  hizo la pregunta. **NUNCA** meter ahí un scope OAuth delegado (`oauthCapabilities.includes(...)`): son
  dos planos de autorización distintos.
- **Confirmar es fail-closed para agentes delegados**: `authSource === 'sister_platform_oauth'` → 403.
  Un token delegado lee y propone; confirmar exige sesión humana hasta que un token delegado porte el grant:
  el grant revocable por organización y por persona YA existe (`external_capability_grants`, `TASK-1631`,
  2026-09-04); falta el emisor propio + gateway multi-issuer de EPIC-044 (TASK-1829/1830/1831/1832).
- **Nexa cierra una postulación ABIERTA, nunca re-decide una cerrada** (el contrato compartido de acciones
  no transporta la huella del preview al execute). Y el cierre **MASIVO** por capacidad sigue **sin
  federarse** (`TASK-1762`): de una cohorte un agente lee y explica, jamás dispara.

`NEXA_HIRING_ACTIONS_ENABLED` nace **OFF** (Vercel-only, sobre el master `NEXA_ACTION_RUNTIME_ENABLED`):
`code complete, rollout pendiente`. No describir este carril como operativo sin verificar el valor vivo.
