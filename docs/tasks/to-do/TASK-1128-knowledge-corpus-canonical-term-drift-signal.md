# TASK-1128 — Reliability signal: drift de términos canónicos en el corpus Knowledge

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Domain: `knowledge|nexa|reliability`

## Por qué existe

Follow-up de TASK-1124. El caso RpA ("Revisions per Asset" en lugar del canónico "Rounds per Asset")
demostró que **una respuesta incorrecta pero citada de Nexa casi siempre viene de un drift de
contenido en el corpus, no de una alucinación**. Hoy ese drift solo se detecta cuando un usuario lo
reporta. Falta un detector que lo atrape antes.

## Qué hacer

1. **Señal de reliability** `knowledge.corpus.canonical_term_drift` (kind `data_quality`, moduleKey
   `knowledge`, steady=0): cruza una lista de **términos canónicos vs prohibidos** (semilla desde el
   context pack `06_glosario-metricas.md` / `00_INDEX.md` — p.ej. "Rounds per Asset" ✓ vs "Revisions
   per Asset" / "Reviews per Asset" ✗) contra el texto de los chunks publicados (`greenhouse_knowledge`).
   Si un chunk publicado contiene un término prohibido → cuenta > 0 → alerta con el slug del doc.
2. Lista declarativa de pares canónico↔prohibido (extensible; arrancar con las métricas ICO + nombres
   de marca "Greenhouse" nunca "Greenhouse EO").
3. (Opcional) CLI `pnpm knowledge:term-audit` read-only que liste los chunks con drift + su slug para
   remediación (corregir el doc fuente + re-ingestar).

## Aceptación

- Señal en `/admin/operations` (o el reliability dashboard) que detecta términos prohibidos en el
  corpus publicado, con el slug del doc para arreglar.
- Steady = 0 tras la corrección del corpus (verificar con el caso RpA, ya resuelto).

## Referencias

- Causa fuente: TASK-1124 follow-up (RpA drift). Doc: `docs/architecture/nexa-intelligence/` (knowledge layer).
- Términos canónicos: `docs/context/06_glosario-metricas.md`, `docs/context/00_INDEX.md`, `docs/context/10_experiencia-cliente.md`.
- Patrón de señal: `src/lib/reliability/queries/*` + wire-up en `get-reliability-overview.ts`.
