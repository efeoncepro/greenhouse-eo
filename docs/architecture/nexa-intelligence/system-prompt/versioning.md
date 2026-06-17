# 01 — System Prompt: Versionado y Governance

> **Capa:** System prompt (versionado). **Código:** [`src/lib/nexa/nexa-system-prompt.ts`](../../../../src/lib/nexa/nexa-system-prompt.ts).
> **Governance canónica:** [`GREENHOUSE_NEXA_SYSTEM_PROMPT_GOVERNANCE_V1.md`](../../GREENHOUSE_NEXA_SYSTEM_PROMPT_GOVERNANCE_V1.md).

## Principio

El system prompt de Nexa es un **artefacto de producto versionado**, no prosa escondida en
código. Define cómo Nexa habla, qué políticas aplica y su contrato de voz. Por eso vive como
**builder modular con versión + snapshot tests + rollback por flag**.

## Versiones

| Pieza | Valor |
|---|---|
| Familia | `home-chat` (`NEXA_SYSTEM_PROMPT_FAMILY`) |
| Versión activa | `nexa-system-prompt.v2.0` (`NEXA_SYSTEM_PROMPT_V2_VERSION`) — modular |
| Rollback | `nexa-system-prompt.v1` (`NEXA_SYSTEM_PROMPT_V1_VERSION`) — extracción **byte-equivalente** del prompt inline previo |
| Flag de activación | `NEXA_SYSTEM_PROMPT_V2_ENABLED` (default OFF → V1) |

- `buildNexaSystemPrompt(context)` despacha por flag y devuelve `{ text, version, family }`. La
  metadata viaja con cada turno para observabilidad/governance.
- V1 existe **solo** como rollback seguro: toda mejora va a V2 (o V3 cuando toque un MAJOR).

## Clases de cambio → trigger de versión

Metadata machine-readable: `NEXA_PROMPT_GOVERNANCE` (en el mismo módulo) con `changeClasses` +
`changelog` (append-only, más reciente primero).

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

## Cómo cambiar el prompt (checklist)

1. Editá los módulos en `nexa-system-prompt.ts` (NUNCA el prompt inline en `nexa-service.ts` — ya no existe).
2. Elegí la **clase de cambio** y bumpeá la versión según la tabla.
3. Agregá la entrada al `changelog` de `NEXA_PROMPT_GOVERNANCE` (más reciente primero). Al bumpear:
   **congelá** la entrada que pasa a ser histórica a su **versión literal** (ej. `version: 'nexa-system-prompt.v2.0'`)
   y dejá que la **nueva** entrada activa referencie el const (`NEXA_SYSTEM_PROMPT_V2_VERSION`). Así el
   changelog es append-only de verdad: bumpear el const no relabela retroactivamente una entrada vieja.
4. Actualizá el **golden snapshot** del prompt: `pnpm vitest run src/lib/nexa/nexa-system-prompt.test.ts -u`.
   El `.snap` committeado captura el prompt ENTERO (no anclas) → el cambio aparece en el diff y exige
   revisión consciente. Corré también (para `voice`/`policy`) la QA matrix (`pnpm qa:nexa-knowledge`).
5. Actualizá [`current.md`](current.md) si cambió el contenido vigente.
6. El gate `pnpm nexa:doc-gate --changed` exige, cuando cambia el módulo: (a) que su(s) doc(s) de capa
   cambien; **y** (b) que `NEXA_PROMPT_GOVERNANCE` tenga una entrada de changelog para la `activeVersion`
   **y** que la `activeVersion` haya bumpeado vs base **o** que el changelog haya crecido. Cierra el caso
   "cambié el prompt pero dejé la versión vieja sin tocar el changelog".

## Reglas duras

- **NUNCA** editar el prompt inline en `nexa-service.ts`. El prompt vive en `nexa-system-prompt.ts`.
- **NUNCA** cambiar V1: es el baseline de rollback byte-equivalente.
- **NUNCA** mergear un cambio de prompt sin clase de cambio + bump + entrada de changelog + golden snapshot actualizado.
- **NUNCA** romper la shape canónica de `NEXA_PROMPT_GOVERNANCE` (consts string `NEXA_SYSTEM_PROMPT_V*_VERSION`,
  más el objeto con `activeVersion` y `changelog`): el doc-gate la **parsea por regex** (no importa el módulo TS).
  Si cambiás cómo se expresa la versión, actualizá también el parser en `scripts/ci/nexa-intelligence-doc-gate.mjs`.

## Rollback

Flag `NEXA_SYSTEM_PROMPT_V2_ENABLED=false` → vuelve a V1 byte-equivalente, sin deploy de código.
