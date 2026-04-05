# ISSUE-011 — Pre-merge conflict check produces false positives from SQL ON CONFLICT

## Ambiente

develop (tooling / CI)

## Detectado

2026-04-05, durante verificacion pre-merge develop → main

## Sintoma

El comando `git merge-tree ... | grep "CONFLICT"` reporto 10 conflictos antes de mergear develop a main. Inspeccion manual revelo que todos eran sentencias SQL `ON CONFLICT` dentro del codigo fuente, no conflictos reales de merge.

Esto genera ruido y puede bloquear un merge seguro o, peor, dar falsa confianza si se invierte la logica ("solo 10 conflictos, son SQL" cuando uno real se oculta entre ellos).

## Causa raiz

`git merge-tree` produce un diff combinado donde la palabra "CONFLICT" aparece tanto como marcador de conflicto de merge como dentro del contenido de archivos que usan SQL con `ON CONFLICT` (PostgreSQL upsert). Un grep naive no distingue entre ambos.

Archivos afectados (contienen `ON CONFLICT`):
- `src/lib/sync/projections/agency-performance-report.ts`
- `src/lib/sync/projections/ico-member-metrics.ts`
- `src/lib/sync/projections/ico-organization-metrics.ts`
- `src/lib/sync/projections/ico-ai-signals.ts`
- `src/lib/ico-engine/ai/materialize-ai-signals.ts`
- Y otros archivos con upsert patterns

## Impacto

- **Proceso**: el operador (humano o agente) puede interpretar erronneamente que hay conflictos y retrasar un merge limpio
- **Riesgo inverso**: si se aprende a ignorar los "CONFLICT" por ser SQL, un conflicto real puede pasar inadvertido
- **No hay impacto en runtime** — es puramente un problema de tooling

## Solucion

Reemplazar el comando de verificacion pre-merge por uno que distinga conflictos reales:

**Opcion A (preferida)**: usar `git merge --no-commit --no-ff` como dry-run — es lo que se hizo despues del falso positivo y confirmo 0 conflictos reales.

**Opcion B**: filtrar el grep para buscar solo marcadores de conflicto de merge-tree, no contenido de archivos:
```bash
git merge-tree ... | grep "^CONFLICT" | grep -v "ON CONFLICT"
```

**Opcion C**: documentar en AGENTS.md el comando correcto para verificacion pre-merge.

## Verificacion

El proximo merge develop → main debe usar el comando correcto y no reportar falsos positivos.

## Estado

open

## Relacionado

- Release `greenhouse/2026.04` — merge donde se detecto el falso positivo
