# Runbook — Visual gate del Artifact Composer (cómo cambiar un deck/template sin romper el baseline)

> **Para quién:** cualquier agente (Claude, Codex, futuro) o humano que **toque un deck-plan, una
> plantilla, el catálogo (`registry.json`/`resolvers.ts`) o el renderer** del Artifact Composer.
> **Cárgalo ANTES de correr `pnpm composer:visual-gate --freeze`.** Fuente del bug class: `ISSUE-122`.
> **Es la fuente única de este proceso** — si algo acá contradice un Handoff viejo, gana esto.

## 1. El modelo mental en 30 segundos

- El **composer** compone decks/artefactos desde el catálogo (`src/lib/artifact-composer/**`).
- El **visual gate** (`pnpm composer:visual-gate`) recompone **el árbol vivo** (deck-plan de SKY +
  probes de plantillas) y lo diffea **a CERO píxeles** contra el **baseline committeado**
  (`scripts/frontend/baselines/artifact-composer/**`: los PNG + `baseline-manifest.json` + el ledger
  `BASELINE_DELTAS.md`).
- Un cambio de píxel **intencional** se **declara** en `BASELINE_DELTAS.md` y se **re-promueve** con
  `--freeze`. Un cambio **no declarado** = regresión → el gate falla (esa es su razón de existir).

> 🔴 El gate compone el **árbol VIVO**: lee el deck-plan, el catálogo y el renderer **tal como están en
> tu working tree en ese momento** — incluyendo cambios sin commitear, tuyos o de otro agente.

## 2. La regla de oro — el freeze es SINGLE-OWNER, SERIALIZADO y ATÓMICO

Porque el gate compone el árbol vivo, **dos agentes tocando el composer a la vez se pisan**:
sus cambios se mezclan en el render y cualquier `--freeze` co-mingla el trabajo de los dos.

- **SINGLE-OWNER:** solo **un** agente/sesión toca el composer (deck-plan/catálogo/renderer/baseline) a la
  vez. Si otro agente lo tiene sucio (`git status` muestra `M` en esos paths), **NO congelas** — coordinas.
- **SERIALIZADO:** antes de `--freeze`, verifica que el árbol del composer esté **limpio salvo TU cambio**
  (`git status --short src/lib/artifact-composer scripts/frontend/baselines <tu deck-plan>`).
- **ATÓMICO:** `--freeze` **y** el commit van **juntos**. Nunca dejes un freeze en el working tree sin
  commitear (deja el baseline en un estado ambiguo que el próximo agente no puede interpretar).

## 3. El flujo canónico — cambié un deck o una plantilla, ¿ahora qué?

```
1. Editás el deck-plan / la plantilla / el catálogo.
2. Recomponés y MIRÁS el frame:   pnpm deck:compose <plan>   → Read del PNG (nunca "listo" sin mirar)
3. Corrés la suite:               pnpm vitest run src/lib/artifact-composer   (boundary/composability/…)
4. Corrés el gate:                pnpm composer:visual-gate    → va a fallar en las láminas que cambiaste
5. ¿El cambio es INTENCIONAL?
     → SÍ:  declarás lámina por lámina en BASELINE_DELTAS.md (§5) + pnpm composer:visual-gate --freeze
     → NO:  acabás de atrapar una regresión. Arreglá el código, no el baseline.
6. git add <tu deck-plan> <las plantillas> scripts/frontend/baselines/artifact-composer + COMMIT (atómico).
```

## 4. 🩸 El gotcha que TIENES que conocer: las fotos raster no son deterministas (ISSUE-122)

Las láminas con **fotos** (`TeamGalleryFull` / la lámina del equipo) **driftean unos píxeles entre
corridas/entornos** aunque nadie cambie la foto — Chromium re-samplea/rasteriza con leve variación
(color profile, resample, `border-radius`). Consecuencias que te van a confundir:

- El `--selftest` (2 corridas **juntas**, mismo proceso) da **cero px** → parece determinista. Pero el
  frame que **vos** congelaste puede **no coincidir** con el render de **otro agente/sesión/CI**.
- El gate puede reportar `TeamGalleryFull.png` o `18-equipo.png` con **miles de píxeles** distintos **sin
  que hayas tocado esa lámina**. Eso **NO es tu regresión** — es el nondeterminismo de fotos.

**Qué hacer cuando el gate flagea SOLO una lámina con fotos y vos no la tocaste:**

- **NO** la aceptes repitiendo `--freeze` (rebaselina un estado que va a driftear otra vez → el gate se
  vuelve inútil ahí). Es el "rebaseline silencioso" que el gate existe para impedir.
- **Confírmalo:** ¿el diff está **solo** en el área de foto? ¿el `--selftest` da cero pero el gate global no?
  → es ISSUE-122, no tu cambio.
- **Reportalo** contra `ISSUE-122` y NO congeles esa lámina hasta que el determinismo de fotos esté
  arreglado (pre-rasterizar avatares al tamaño exacto + pinnear color profile).

## 5. Cómo declarar un delta en `BASELINE_DELTAS.md`

- Una entrada con fecha, **lámina por lámina**, diciendo **qué cambió y por qué** (intención, no "actualicé
  el baseline"). Ver las entradas existentes como molde.
- El `--freeze` **sella un digest** del manifest en el ledger. **NUNCA** edites un PNG del baseline a mano
  ni toques el digest — el gate lo detecta y falla.

## 6. Qué NO hacer NUNCA

- ❌ `--freeze` con el composer sucio por **otro agente** (co-mingla su WIP). Coordiná primero.
- ❌ Dejar un `--freeze` **sin commitear** (estado ambiguo para el próximo).
- ❌ Rebaselinear una lámina con fotos que driftea sin cambio real (ISSUE-122) — eso oculta el bug.
- ❌ Editar un PNG del baseline, `baseline-manifest.json` o el digest **a mano**.
- ❌ Declarar "listo" sin **mirar** los frames recompuestos (Read del PNG), desktop y con foco en lo que cambiaste.
- ❌ Meter `HEX`/fuentes literales en una plantilla (`pnpm composer:color-ledger` / font pack lo bloquean).

## 7. Troubleshooting rápido

| Síntoma | Causa probable | Acción |
|---|---|---|
| Gate falla en la lámina que **sí** cambiaste | Cambio intencional no declarado | Declará en `BASELINE_DELTAS.md` + `--freeze` + commit |
| Gate falla en `TeamGalleryFull`/`18-equipo` que **NO** tocaste, solo en el área de foto | Nondeterminismo de fotos (ISSUE-122) | NO congeles esa lámina; reportá a ISSUE-122 |
| `item_too_long` al recomponer | Copy > límite de chars del filler (`overflow: reject`) | Acortá el copy (el gate fail-closa, no trunca) |
| `git status` muestra `M` en `resolvers.ts`/`registry.json`/baseline y no fuiste vos | Otro agente tiene el composer sucio | NO congeles; coordiná (regla single-owner) |
| `--selftest` da cero pero el gate global no | Drift entre tu render y el frame congelado por otro | Probablemente ISSUE-122 (fotos) o un freeze ajeno stale |

## Referencias

- Gate + freeze: `scripts/artifact-composer/visual-gate.ts` · ledger `scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md`
- Invariantes del dominio: `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` · `.claude/rules/tenders.md`
- Bug class: `docs/issues/open/ISSUE-122-composer-visual-gate-photo-nondeterminism-concurrency-docs.md`
- Skills: `greenhouse-public-private-tenders` → `deck-visual-system.md` · `proposal-studio-runtime.md` · `deck-studio` → `composition.md`
