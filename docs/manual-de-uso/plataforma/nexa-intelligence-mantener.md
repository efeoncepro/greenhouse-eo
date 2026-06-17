# Manual — Mantener Nexa Intelligence

> Para quien va a **tocar Nexa** (agente o dev): cómo cambiar el prompt, verificar la calidad,
> correr el gate de docs y arreglar el corpus cuando una respuesta sale mal. No necesitas leer código.

## Para qué sirve

Nexa tiene varias capas (prompt, voz, comportamiento, knowledge, evidencia). Este manual te dice
cómo operarlas sin romper nada y cómo dejar la documentación en regla (hay un gate que lo exige).

## Antes de empezar

- Mapa de capas: [docs/architecture/nexa-intelligence/README.md](../../architecture/nexa-intelligence/README.md).
- SSOT del mapeo código↔docs: `docs/architecture/nexa-intelligence/manifest.json`.
- El system prompt vive en `src/lib/nexa/nexa-system-prompt.ts` (NUNCA inline en `nexa-service.ts`).

## Cambiar el system prompt (paso a paso)

1. Editá los módulos en `nexa-system-prompt.ts` (V2).
2. Elegí la **clase de cambio**: `editorial` (redacción) · `voice` (tono/emoji) · `policy`
   (knowledge/citas/sensibles) · `structural` (secciones/orden).
3. Bumpeá la versión y agregá la entrada al `changelog` de `NEXA_PROMPT_GOVERNANCE` (en el mismo archivo).
4. Corré los tests del prompt: `pnpm vitest run src/lib/nexa/nexa-system-prompt.test.ts`.
5. Si fue `voice`/`policy`: corré la QA matrix (abajo).
6. Actualizá el doc de capa correspondiente (el gate lo exige).

## Verificar la calidad de respuesta (QA matrix)

```bash
# Local (usa Gemini). Requiere dev server + AGENT_AUTH_SECRET en .env.local
pnpm qa:nexa-knowledge -- --env=local
# Un subconjunto:
pnpm qa:nexa-knowledge -- --env=local --case=K2,K4,G2
# Staging (usa Claude vía auto-router) — la verificación canónica:
pnpm qa:nexa-knowledge -- --env=staging
```

Qué chequea: que rutee bien (knowledge vs operativo), que cite `[n]`, que NO vuelque "Fuentes:",
que NO muestre `##` crudo, y la voz (sin 🍏, sin voseo). **Local usa Gemini; staging/prod usan
Claude** para conocimiento — una regla de voz puede variar; la verdad es staging.

## Correr el gate de documentación

```bash
pnpm nexa:doc-gate            # audit estructural (docs existen, cobertura de archivos Nexa)
pnpm nexa:doc-gate --changed  # ¿toqué Nexa y actualicé sus docs? (lo que corre CI)
```

Si falla en `--changed`: tocaste un dominio Nexa (p.ej. el prompt) pero no actualizaste su doc de
capa. Actualizá el doc que indica el mensaje. Si agregaste un **archivo Nexa nuevo**, registralo en
`manifest.json` (en `domains` con su doc, o en `codeAllowlist` si es plumbing sin capa).

## Si Nexa responde algo incorrecto pero CITADO

Casi siempre la **fuente del corpus** tiene el error (no es alucinación). Fix de raíz:

1. Corregí el documento fuente (los del corpus piloto están en `docs/...`, listados en
   `src/lib/knowledge/ingestion/pilot-corpus.ts`).
2. Dry-run de la ingesta (NO escribe): `npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/ingest.ts --source=repo_docs`
3. Revisá el dry-run (qué docs se re-publicarían, 0 quarantined/failed).
4. Aplicá: agregá `--apply`. El corpus local queda corregido.
5. Verificá preguntándole a Nexa de nuevo.

> **Staging/Producción:** tienen su propia copia del corpus (`sync_enabled=FALSE`). El fix llega ahí
> sólo con su **propia re-ingesta** (dry-run revisado → apply), como paso de operador.

## Qué NO hacer

- NO editar el prompt inline en `nexa-service.ts` (vive en `nexa-system-prompt.ts`).
- NO cambiar V1 del prompt (es el botón de rollback).
- NO parchear el prompt para tapar un dato incorrecto que viene de una fuente: arreglá la fuente.
- NO mergear tocando Nexa sin actualizar su doc de capa (el gate lo bloquea).
- NO habilitar `--apply` de la ingesta sin revisar el dry-run.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Sale `##` o `**` en el panel de Fuentes | preview del excerpt sin limpiar | ya está corregido (`toPlainExcerpt`); si reaparece, revisá los constructores de excerpt |
| Respuesta sin `[n]` aunque hay fuentes | prompt V1 activo (flag OFF) o modelo no citó | confirmá `NEXA_SYSTEM_PROMPT_V2_ENABLED=true` + reiniciá el dev server |
| Dato incorrecto pero citado | la fuente del corpus tiene el error | corregí el doc + re-ingestá |
| El gate de docs falla | tocaste Nexa sin actualizar su capa | actualizá el doc que indica el mensaje |

## Referencias técnicas

- Capas: [docs/architecture/nexa-intelligence/](../../architecture/nexa-intelligence/README.md)
- Governance del prompt: [GREENHOUSE_NEXA_SYSTEM_PROMPT_GOVERNANCE_V1.md](../../architecture/GREENHOUSE_NEXA_SYSTEM_PROMPT_GOVERNANCE_V1.md)
- Arquitectura Nexa: [GREENHOUSE_NEXA_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md)
