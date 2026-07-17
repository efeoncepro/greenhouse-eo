# ISSUE-122 — Visual gate del composer: nondeterminismo de fotos + sin protocolo de concurrencia + docs dispersas

> **Estado:** 🟡 Abierto (causa 3 —el runbook— cerrada 2026-07-15; causas 1 y 2 coordinadas con la sesión que tenga el composer)
> **Ambiente:** local (composer `pnpm composer:visual-gate` + baseline `scripts/frontend/baselines/artifact-composer/**`)
> **Detectado:** 2026-07-15, durante trabajo concurrente de dos agentes (Claude + Codex) sobre el deck de SKY

## Resumen

En una sola sesión, **dos agentes con contexto del repo tropezaron con el visual gate**: colisión de
`--freeze` concurrente, drift de fotos raster que el gate reporta como regresión sin que nadie cambie la
foto, y un freeze que quedó inconsistente + sin commitear. La conclusión del operador es la correcta y es
la raíz del issue: **si dos agentes expertos lo rompen, un agente nuevo no sabe usarlo.** No es culpa de un
agente; es que el sistema exige conocimiento tribal y tiene un bug de determinismo real.

## Síntoma

1. `sky/18-equipo.png` (y su template `TeamGalleryFull`) reportan diferencia de píxeles contra el baseline
   **sin que la lámina haya cambiado** — solo en el área de las fotos (54 px en las esquinas de los avatares
   en un caso; 680.802 px en toda el área de foto del template probe en otro).
2. El `--selftest` (2 corridas seguidas, mismo entorno) da **CERO píxeles** — o sea el render ES determinista
   *dentro* de una corrida, pero el frame congelado por un agente **no coincide con el render de otro
   momento/sesión**.
3. Dos agentes editando `deck-plan`/`catálogo`/`renderer` a la vez → el gate (que compone el árbol vivo)
   mezcla ambos cambios → cualquier `--freeze` co-mingla trabajo de los dos y queda inconsistente.

## Causa raíz (tres, distintas)

1. **Técnica — el gate "cero píxeles" es incompatible con fotos raster.** Chromium rasteriza/re-samplea las
   fotos (`object-fit: cover` + `border-radius` + escalado en runtime) con leve variación entre corridas y
   entornos (color profile, resample, timing). El `--selftest` de 2 corridas juntas NO lo atrapa (comparte
   el estado de proceso); el drift aparece entre freezes separados por tiempo o entre máquinas/CI.
2. **De proceso — el baseline es un artefacto ÚNICO compartido sin protocolo de concurrencia.** No hay regla
   que serialice el `--freeze` a un solo dueño ni que lo obligue a ser atómico (freeze + commit juntos). Dos
   agentes lo tocan a la vez y colisionan; un freeze queda en el working tree sin commitear.
3. **De documentación — el "cómo se hace" está disperso** entre `CLAUDE.md`, `BASELINE_DELTAS.md`, las skills
   (`deck-visual-system.md`, `proposal-studio-runtime.md`) y los Handoffs. Un agente nuevo tiene que
   reconstruir el proceso leyendo cinco lugares. Eso ES "no sabe cómo usarlo".

## Impacto

- El gate a "cero píxeles" **no es cumplible de forma confiable en láminas con fotos** → falsos rojos que
  bloquean cierres y erosionan la confianza en el gate (un gate que da falsos positivos se empieza a ignorar).
- Trabajo concurrente sobre el composer **corrompe el baseline** o deja freezes sin commitear.
- Un agente nuevo no tiene una fuente única que le enseñe el proceso → repite los mismos tropiezos.

## Solución

| Causa | Fix robusto | Estado |
|---|---|---|
| **1 · Fotos raster no deterministas** | **Pre-rasterizar los avatares al tamaño EXACTO de display** (× deviceScaleFactor) → Chromium hace blit 1:1, sin resample. **Pinnear el color profile** de Chromium en el compose (`--force-color-profile=srgb`, raster GPU off). Y una **prueba cross-entorno** (no solo el selftest de 2 corridas juntas): re-render desde un proceso fresco y diff. | ⏳ Pendiente — coordinado con la sesión que tenga el composer (área de Codex al 2026-07-15) |
| **2 · Sin protocolo de concurrencia** | **Regla dura:** el `--freeze` es **single-owner, serializado y atómico** (freeze + commit en un solo paso; nunca mid-edit; nunca dos agentes a la vez). Un agente que va a re-baselinear **anuncia y toma el lock lógico** del composer hasta committear. | ⏳ Pendiente — documentado en el runbook; falta promover a regla dura en `CLAUDE.md` cuando el composer esté en una sola mano |
| **3 · Docs dispersas** | **Runbook canónico** `docs/operations/runbooks/composer-visual-gate.md` — un solo lugar que cualquier agente carga al tocar el composer. | ✅ Cerrado 2026-07-15 (este commit) |

## Verificación

- Causa 3: el runbook existe y está referenciado desde `.claude/rules/tenders.md` + los invariantes de tenders.
- Causa 1: se cierra cuando `--selftest` **desde procesos frescos separados** (o CI vs local) da cero píxeles
  en las láminas con foto, y el drift de `TeamGalleryFull`/`18-equipo` desaparece.
- Causa 2: se cierra cuando la regla single-owner/atómica está en `CLAUDE.md` y ningún freeze queda sin commitear.

## Estado

🟡 **Abierto** — parcialmente resuelto (runbook). El fix técnico de determinismo de fotos y la regla dura de
concurrencia quedan coordinados con la sesión que controle el composer, para no correr una segunda carrera
sobre el mismo artefacto compartido (que es, literalmente, la causa 2).

## Relacionado

- `ISSUE-121` — artifact-worker: bug class del primer deploy (mismo espíritu: "el render difiere entre
  entornos y nos enteramos tarde"; ya cerró 3 no-determinismos del composer — Chromium sandbox, race de
  `img.decode()`, paths absolutos — con guards permanentes).
- `TASK-1393` (Artifact Composer primitive) · `TASK-1391` (render pipeline) · `TASK-1414` (Codex, plantillas
  reutilizables — la sesión concurrente que expuso este issue).
- Runbook: `docs/operations/runbooks/composer-visual-gate.md`.
