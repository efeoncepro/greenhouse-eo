# TASK-1125 — Re-ingesta del corpus Knowledge en producción (fix RpA + drift sweep)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `ops`
- Domain: `knowledge|nexa|ops`

## Por qué existe

El corpus de Greenhouse Knowledge (`greenhouse_knowledge`) tenía un drift de contenido: el doc
`docs/documentation/delivery/motor-ico-metricas-operativas.md` decía **"RpA (Revisions per Asset)"**
en vez del término canónico **"Rounds per Asset"** (context pack `06_glosario-metricas.md`,
`00_INDEX.md`, spec `RPA_V1.md`; `10_experiencia-cliente.md` lo marca explícito). Nexa lo recuperaba
y lo respondía citado — NO era alucinación, era la fuente.

- **Fix de la fuente:** commit `b9e119045` (`develop`) corrigió el doc a "Rounds per Asset".
- **Re-ingesta aplicada:** local + la Cloud SQL compartida `greenhouse-pg-dev` (que sirve a
  **staging** `dev-greenhouse`) → verificado: el chunk `motor-ico-metricas-operativas` quedó
  `published` con "Rounds per Asset". **Staging OK.**
- **Pendiente:** confirmar/aplicar la re-ingesta en **producción**.

## Pregunta a resolver primero (decide si hay trabajo real)

¿Producción usa la **misma** Cloud SQL `greenhouse-pg-dev` que staging, o una instancia separada?

- El env var `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` existe en el environment **Production**
  de Vercel (valor encriptado, no inspeccionado en esta sesión). CLAUDE.md documenta una sola
  instancia (`greenhouse-pg-dev`).
- Si Production apunta a `greenhouse-pg-dev` → **el fix ya está live en prod** (misma DB) y esta task
  es solo verificación (no-op).
- Si Production apunta a una instancia separada → re-ingestar el corpus ahí.

## Qué hacer

1. Resolver el valor de `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` en Production (Vercel) y
   comparar con `efeonce-group:us-east4:greenhouse-pg-dev`.
2. **Si es la misma instancia:** verificar el chunk en prod (query a `greenhouse_knowledge`) y cerrar.
   El término debe ser "Rounds per Asset".
3. **Si es una instancia separada:** correr la ingesta contra la DB de prod:
   - Dry-run (NO escribe): `npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/ingest.ts --source=repo_docs`
   - Revisar el dry-run (qué docs se re-publicarían; 0 `quarantined`/`failed`).
   - Aplicar: agregar `--apply`. (Idempotente por checksum.)
4. Verificar en prod preguntándole a Nexa "¿Qué es el RpA?" (con V2 + auto-router) → debe responder
   "Rounds per Asset" con cita `[n]`.

## Aceptación

- El chunk `motor-ico-metricas-operativas` en la DB de producción dice "Rounds per Asset" (`published`).
- `grep "Revisions per Asset"` en el corpus de prod = 0.
- Nexa en producción responde RpA = "Rounds per Asset".

## Notas

- El corpus es `sync_enabled=FALSE`; el `--apply` requiere dry-run revisado (no auto-sync).
- La ingesta es idempotente por checksum: re-correrla es seguro.
- Manual: `docs/manual-de-uso/plataforma/nexa-intelligence-mantener.md` §"Si Nexa responde algo
  incorrecto pero CITADO".
- Procedencia: TASK-1124 (calidad de respuesta de Nexa Knowledge) + su follow-up de corpus.
