@AGENTS.md

## Notas para Claude

- Los permisos y el hook de `.claude/settings.json` bloquean la edición de archivos gestionados y los
  comandos peligrosos (leer secretos, borrar en buckets, push forzado). Si un bloqueo te impide
  avanzar, explica a la persona qué querías hacer y propón el issue; no busques rodeos.
- Carga la skill que corresponda **antes** de producir (tabla en AGENTS.md). Para imagen o video con
  IA, primero `ai-model-selection`.
- Cuando termines una pieza, deja `pieza.json` al día y dile a la persona qué falta para el PR.
