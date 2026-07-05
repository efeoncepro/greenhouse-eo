# Shot Prompt Sheet — Toma [#] · [Nombre del proyecto]

> **Qué es esto.** La hoja de producción de UNA toma IA. Traduce el plano del storyboard/shotlist en
> una orden precisa para el modelo de video. Una hoja por toma (o por grupo de tomas equivalentes).
> Regla dura: **reverifica el modelo/feature antes de comprometerte** — el landscape IA es volátil
> (`SOURCES.md`, `SKILL.md` §Frescura). Doctrina de prompting: `modules/09_AI_VIDEO_PIPELINE.md`.

## Encuadre de la toma

| Campo | Valor |
|---|---|
| Toma # | [n] · [descripción de la shotlist] |
| Duración objetivo | [Xs] → [chunks de 5-8s: n chunks] |
| Aspecto / resolución | [16:9 · 1080p / 4K] |
| Rol en el arco | [gancho · desarrollo · clímax · cierre] |

## Modelo elegido y por qué

- **Modelo.** [Higgsfield Cinema Studio · Runway Gen-4.5 · Seedance · Kling · Veo · Gemini Omni] — `as-of [YYYY-MM]`
- **Por qué este.** [control de cámara/focal · consistencia de personaje · beats coreografiados · broadcast · voz]
- **Modo.** [image-to-video (keyframes) · text-to-video · start+end frame] — preferir i2v con keyframes (doctrina 7)

## Prompt cinematográfico estructurado

Construye el prompt por capas, no en una frase suelta:

- **[Dirección de cámara].** [tipo de plano + lente/focal + movimiento: "medium close-up, 50mm, slow push-in"]
- **[Ritmo / velocidad].** [ease, tempo del movimiento: "deliberate, slow build, no snap"]
- **[Acción / movimiento].** [qué se mueve y cómo, con anticipación/arco: "she turns, a subtle wind-up first"]
- **[Detalles atmosféricos].** [luz, textura, partículas, grade: "warm rim light, volumetric dust, shallow DoF, filmic"]

**Prompt final (armado):**
> [pega acá el prompt completo, en el idioma que el modelo prefiera — normalmente inglés]

## Keyframes

| Keyframe | Fuente | Descripción / encuadre |
|---|---|---|
| Inicio | [KV / still / greenhouse-ai-image-generator] | [pose, encuadre, luz de arranque] |
| Fin | [ ] | [pose, encuadre, luz de cierre] |

## Consistencia de personaje / marca

- **Soul ID / refs.** [ID o set de refs que bloquea rostro/voz — `higgsfield-soul-id`] · [n/a si no hay personaje]
- **Mascota / marca.** [Nexa u otro asset propietario · reglas de `efeonce/EFEONCE_OVERLAY.md`]

## Negativos y modos de fallo a evitar

- **Negativos.** [morphing, extra fingers, warping de logo, text garbled, flicker, plastic skin]
- **Modos de fallo típicos de esta toma.** [drift de personaje entre chunks · manos · texto en pantalla · cámara errática]
- **Mitigación.** [start+end frame · refs más fuertes · acortar chunk · fijar seed si el modelo lo permite]

## Post y QA de la toma

- **Post previsto.** [upscale Magnific/`upscale_video` a 2K/4K · estabilización · grade en DaVinci · limpieza AE]
- **QA — la toma pasa si:**
  - [ ] Cumple el encuadre y el movimiento del storyboard
  - [ ] El timing/ease se siente con peso (no lineal, no robótico — `modules/01-02`)
  - [ ] Sin artefactos: morphing, flicker, warping de logo/texto, manos rotas
  - [ ] Consistencia de personaje/marca mantenida entre chunks
  - [ ] Empalma con la toma anterior y siguiente (dirección, luz, continuidad)
  - [ ] Créditos gastados dentro de lo previsto en la shotlist
- **Veredicto.** [aprobada · reintentar (razón) · cambiar de mano] · **iteraciones usadas:** [n]
