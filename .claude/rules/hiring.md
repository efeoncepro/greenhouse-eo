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
