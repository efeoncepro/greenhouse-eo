# 05 — Do's & Don'ts (reglas duras consolidadas)

> **Capa:** reglas duras transversales de Nexa Intelligence. Consolida lo de las otras capas en una
> checklist accionable. Si una regla y su capa divergen, **gana la capa** (esta es el resumen).

## System prompt

- ✅ Editar el prompt SOLO en [`nexa-system-prompt.ts`](../../../src/lib/nexa/nexa-system-prompt.ts), como módulos versionados.
- ✅ Toda edición: clase de cambio + bump de versión + entrada de changelog (`NEXA_PROMPT_GOVERNANCE`) + tests.
- ❌ NUNCA prompt inline en `nexa-service.ts`.
- ❌ NUNCA modificar V1 (es el rollback byte-equivalente).

## Comportamiento + routing

- ✅ Rutear por intención: proceso/política/definición → `search_knowledge`; dato en vivo → tool operativo.
- ✅ Selección de modelo 100% interna (auto-router); observabilidad por `modelId`.
- ❌ NUNCA exponer la selección de modelo al usuario.
- ❌ NUNCA responder un dato operativo en vivo desde Knowledge.
- ❌ NUNCA instanciar un SDK LLM dentro de un dominio (usar `src/lib/ai/*`).

## Voz

- ✅ Tuteo es-CL neutro; dato primero; cerrar con próxima acción cuando el usuario opera.
- ❌ NUNCA voseo, 🍏, emoji-personalidad, superlativos vacíos, jerga de agencia genérica.

## Knowledge / respuesta

- ✅ **Sintetizar** cruzando la evidencia (no copiar un fragmento).
- ✅ Citar `[n]` inline ligado al fragmento.
- ✅ Gap honesto cuando la confianza es `none` (no inventar).
- ✅ Declarar fuentes `stale`/`deprecated`.
- ✅ En temas sensibles (finanzas/nómina/legal/seguridad/contractual): citar + cerrar con validación humana.
- ❌ NUNCA anexar una lista "Fuentes:" en el texto (la UI es dueña de la evidencia).
- ❌ NUNCA mostrar Markdown estructural crudo (`##`, `#`, frontmatter) como texto.

## Evidencia / citas

- ✅ El número del trace sale del packet (`chunk.score` = `ts_rank`); la confianza se deriva, no se inventa.
- ✅ El preview del excerpt de la fuente se limpia a prosa (`toPlainExcerpt`) — sin Markdown crudo.
- ❌ NUNCA fabricar un score/confianza paralelo en la UI.
- ❌ NUNCA pintar estado falso ("Auditar") cuando la verdad es "no sé" — usar degraded/gap honesto.

## Retrieval (search SSOT)

- ✅ Todo retrieval pasa por `searchKnowledge` (SSOT, modo agentic para Nexa).
- ✅ El rerank reordena el top-N FTS (mismo set; default OFF byte-equivalente); no muta `chunk.score`.
- ❌ NUNCA queryear las tablas del corpus directo (lint `no-direct-knowledge-chunk-query`).
- ❌ NUNCA un LLM call sin retrieval para una respuesta de conocimiento.

## Corpus

- ✅ Si Nexa responde algo raro pero **citado**, la fuente suele ser real → arreglar el documento
  del corpus + re-ingestar, NO tocar el prompt. (Caso RpA "Revisions per Asset" → "Rounds per Asset".)
- ❌ NUNCA habilitar `--apply` de ingesta sin dry-run revisado; staging/prod `sync_enabled=FALSE`.

## Documentación (este folder)

- ✅ Al tocar un dominio Nexa, actualizar su(s) doc(s) de capa en el mismo cambio (gate `pnpm nexa:doc-gate`).
- ✅ Dominio Nexa nuevo → agregarlo al [`manifest.json`](manifest.json) + crear/asignar su capa.
- ❌ NUNCA mergear "toqué Nexa pero no documenté" (el gate lo bloquea).
