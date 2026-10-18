# Hero de `/contacto/` — Nexa canónica (2026-10-15/16)

Publicado en `eo-elementor-widgets/assets/img/contact/contacto-nexa-hero.png` y en el OG del sitio.

| Archivo | Qué es | Estado |
|---|---|---|
| `base.png` | Hero original (Codex): no era Nexa y tenía piel craquelada de upscaler | reemplazado |
| `contacto-nexa-hero-piel-v2.png` | Primer arreglo: sólo la textura de piel (Seedream 5 Pro Edit, inpaint `f9df20c69d68` cand. 1) | reemplazado |
| `contacto-nexa-hero-rostro-canonico-v3.png` | **Vigente.** Rostro canónico de Nexa (`gpt-image-2.5-sunburst` high + anclas `ancla-1-v2` y `ancla-2`, inpaint `c35ef248aad4` cand. 1) | live desde 2026-10-16 |
| `contacto-og-1200x630-v3.png` | OG determinístico (`build-contacto-og.cjs`) desde el hero vigente; sha256 en `og-v3.sha256` | live, adjunto WP `251980` |
| `mask-piel.png` | Máscara cara + cuello + mano (`pnpm ai:mask`) | — |
| `antes-despues.png` · `antes-ancla-despues.png` | Comparaciones para el operador | — |

Descartados: Flux Pro Fill (`ebabf03b4969`, inventó otra persona y dibujó grietas), Flare con `--zone-resolution`
(`d68ec3311058`, panel negro). Lecciones en el playbook de inpainting de `greenhouse-ai-image-generator`
(§2, «Rostros y piel»). Contexto de la landing: `efeonce-public-site-wordpress/references/landings/contacto.md`.
