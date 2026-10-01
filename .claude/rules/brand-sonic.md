---
paths:
  - "docs/operations/brand-sonic/**"
  - "ai-generations/*branding-sonoro*/**"
  - "scripts/creative/brand-motion/**"
---

# Identidad sonora de Efeonce — invariantes (auto-load por path)

**Archivos de `ai-generations/` que no están en disco** (plates, kits, identidades): `pnpm ai-gen:where` + `pnpm ai-gen:pull` antes de componer; nunca regenerar ni resellar el lock. Regla [`ai-generations-storage.md`](./ai-generations-storage.md) · SSOT [`AI_GENERATIONS_STORAGE_V1.md`](../../docs/operations/AI_GENERATIONS_STORAGE_V1.md).

Carga **`docs/operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md`** (canon operativo) y la skill **`audio-studio`**
(overlay Efeonce) + **`efeonce-graphic-line`** (`references/motion.md` §Sonido). ADR
`docs/architecture/EFEONCE_SONIC_IDENTITY_DECISION_V1.md` (Proposed). Kit y datos para agentes en AXIS:
`https://axis.efeonce.org/references/sonic-brand.json` (URL + SHA-256 de cada archivo; bucket
`efeonce-group-axis-public-media/sonic/v1/`).

Reglas duras:

- **Estado recomendada, no canon.** Los valores NO están en `@efeoncepro/axis-tokens`; entran al canonizar junto a
  `efeonceGraphicLine.motion.sound`, con el reemplazo del sonido de los masters V1.1 (hoy siguen con `orbit-sound.mjs`).
- **NUNCA regenerar** el logo sonoro, la voz de Brian ni la esfera con un modelo: se usan los archivos del kit por URL y
  se verifica su `sha256`.
- La voz es Brian **por ID** `nPczCjzI2devNBz1zQrb` (hay 25 «Brian» en ElevenLabs); en fal, `voice: "Brian"` ya es ésa.
- La melodía **Mi · Mi · Mi → La** con su pausa no cambia; la línea de servicio cambia sólo el timbre de la esfera.
- **Glitch (podcast) no se sonoriza con este kit.** Glitch tiene su diseño sonoro propio, **aprobado (versión B,
  2026-09-27), sólo de Glitch**, en la norma de Glitch §13.11, y su música propia, **aprobada** (§13.12) (regla `.claude/rules/glitch.md`); ambos
  se producen y entregan en el repo taller (`tools/glitch-motion`: `src/sound.mjs` sobre `tools/brand-sound`,
  `src/music.mjs`), separados de este kit. Nunca se mezcla con este kit ni cambia esta identidad, que sigue «recomendada».
- Nivelar por **sonoridad al destino** (−14 LUFS video/redes, −16 podcast, pico −1 dBFS), nunca por pico ni comprimiendo
  el golpe. Nunca en piezas de clientes, en la UI de Greenhouse ni en la pantalla de recepción.
