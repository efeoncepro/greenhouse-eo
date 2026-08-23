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
  emite el evento, arranca el reloj de retención y elige el tipo de correo. `HIRING_PIPELINE_STAGES`
  es el subconjunto **escribible** y no contiene `closed`.
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

Lo PENDIENTE del release — **no afirmarlo en presente**: el `CHECK` del invariante
`stage='closed'` ⟺ desenlace declarado, y los contract que retiran `on_hold` y las etapas viejas.
Viven en `docs/tasks/pending-migrations/`. Hoy la base acepta el vocabulario viejo **a propósito**.
