# Greenhouse — Nexa System Prompt Governance V1

> **Tipo:** Decisión de arquitectura + governance operativa
> **Creado:** 2026-06-14 (TASK-1124)
> **Artefacto:** `src/lib/nexa/nexa-system-prompt.ts`
> **Metadata machine-readable:** `NEXA_PROMPT_GOVERNANCE` (mismo módulo)

## Principio

El **system prompt de Nexa es un artefacto de PRODUCTO versionado**, no prosa escondida en
código. Define cómo Nexa habla, qué políticas aplica (Knowledge, datos vivos, citas,
escalamiento sensible) y su contrato de voz Efeonce. Por eso vive como **builder modular con
versión + snapshot tests + rollback por flag**, igual que cualquier contrato versionado del repo.

## Artefacto y versiones

| Pieza | Valor |
|---|---|
| Familia | `home-chat` (`NEXA_SYSTEM_PROMPT_FAMILY`) |
| Versión activa | `nexa-system-prompt.v2.0` (`NEXA_SYSTEM_PROMPT_V2_VERSION`) |
| Rollback | `nexa-system-prompt.v1` (`NEXA_SYSTEM_PROMPT_V1_VERSION`) — extracción **byte-equivalente** del prompt inline previo |
| Flag de activación | `NEXA_SYSTEM_PROMPT_V2_ENABLED` (default OFF → V1) |

- `buildNexaSystemPrompt(context)` despacha por flag y devuelve `{ text, version, family }` (la
  metadata viaja con cada turno para observabilidad/governance).
- V1 existe **solo** como rollback seguro: cualquier mejora va a V2 (o V3 cuando toque MAJOR).

## V2 — módulos

`identity · platformReality · userContext · toolRouting · knowledgePolicy · operationalPolicy ·
responseModes · voiceContract · placementPolicy`. La fecha runtime se inyecta determinista
(`America/Santiago`). La política de Knowledge solo aparece con retrieval ON.

### Contrato de voz Efeonce (fuente: `docs/context/05_voz-tono-estilo.md`)

Tuteo neutro es-CL; datos primero; sin superlativos vacíos; humor quirúrgico; **sin 🍏**; sin
jerga Big4/startup-bro. La QA matrix (`pnpm qa:nexa-knowledge`) asserta 🍏 + voseo + síntesis.

## Clases de cambio → trigger de versión

| Clase | Qué es | Versión | Gate adicional |
|---|---|---|---|
| `editorial` | Redacción sin tocar reglas/políticas | PATCH (`vX.Y+1`) | — |
| `voice` | Tono / emoji / tuteo (contrato de voz) | MINOR (`vX+1.0`) | assert de voz en QA matrix |
| `policy` | Knowledge / datos vivos / citas / escalamiento sensible | MINOR/MAJOR | snapshot test + QA matrix |
| `structural` | Secciones / orden / response modes / frontera V1↔V2 | MAJOR (`vX+1.0`) | revisión de governance |

## Triggers (cuándo bumpear)

1. Cambia el comportamiento observable de Nexa (cómo cita, qué rehúsa, cómo escala) → `policy`/`structural`.
2. Cambia el tono o un símbolo de marca → `voice`.
3. Cambia la plataforma real que el prompt describe (módulos, herramientas, nombres) → `editorial`/`structural`.
4. Solo limpieza de redacción → `editorial`.

## Reglas duras

- **NUNCA** editar el prompt inline en `nexa-service.ts`. El prompt vive en `nexa-system-prompt.ts`.
- **NUNCA** cambiar V1: es el baseline de rollback byte-equivalente. Toda mejora va a V2+.
- **NUNCA** mergear un cambio de prompt sin (a) elegir su clase de cambio, (b) bumpear versión según la
  tabla, (c) agregar la entrada al `changelog` de `NEXA_PROMPT_GOVERNANCE` (más reciente primero),
  (d) correr los snapshot tests + (para `voice`/`policy`) la QA matrix.
- **NUNCA** reintroducir un volcado "Fuentes:" ni encabezados Markdown crudos (`##`) en la política
  de respuesta: la interfaz es dueña de la evidencia; la QA matrix tiene la regresión.

## Changelog

El changelog canónico vive en el código (`NEXA_PROMPT_GOVERNANCE.changelog`, append-only,
más reciente primero) para que sea machine-readable y testeable. Este doc no lo duplica.
