# Hoja de prompt de imagen IA

> **Cómo usar.** Un prompt no es una frase suelta: es una receta con orden. Rellena el
> prompt estructurado (sujeto → composición → estilo → luz → paleta → material → ratio →
> negativos) y registra variantes/seeds para poder reproducir el mejor. Antes de nombrar
> una herramienta o versión, **reverifica** (landscape IA es volátil — `SOURCES.md`).
> Si el asset entra a la UI de Greenhouse, **NO produzcas acá**: delega a
> `greenhouse-ai-image-generator`. Esta hoja dirige; esa mano produce.

- **Proyecto / uso del asset:** [nombre — marketing / concept / UI]
- **Fecha:** [YYYY-MM-DD]
- **Deriva de:** [`art-direction-moodboard.md` / `key-visual-brief.md`]

## 1. Herramienta elegida + por qué

- **Herramienta:** [Nano Banana / Midjourney / Ideogram / Firefly / Flux / Higgsfield / otro]
- **Versión (reverificada):** [vX — `as-of` YYYY-MM]
- **Por qué esta y no otra:** [tipo con texto → Ideogram · fotoreal → Midjourney/Flux · edición dirigida → Nano Banana · etc.]
- **Si va a UI:** delegar a `greenhouse-ai-image-generator` — [sí/no]

## 2. Prompt estructurado

> Construye por capas; el orden importa. No amontones adjetivos vacíos.

- **Sujeto / foco:** [qué es, nivel-1 de la composición]
- **Acción / gesto:** [qué hace, si aplica]
- **Composición / encuadre:** [tercios / centrado dinámico / close-up / wide — con tensión]
- **Estilo / tratamiento:** [foto / ilustración / 3D / mixed-media / editorial]
- **Luz / atmósfera:** [tipo de luz + hora + ambiente]
- **Paleta:** [colores o tokens de la marca — no el default del modelo]
- **Material / textura:** [grano / vidrio / papel / imperfección]
- **Ratio / formato:** [16:9 / 4:5 / 9:16 / 1:1]
- **Cámara / lente (si fotoreal):** [focal, apertura, ángulo]

**Prompt final (para pegar):**
```
[sujeto], [acción], [composición], [estilo], [luz], [paleta], [material], --ar [ratio] [flags]
```

## 3. Negativos / exclusiones

```
[texto deforme, marca de agua, dedos rotos, look plástico IA, bokeh sin motivo, lens flare, simetría muerta, ...]
```

## 4. Variantes y seeds

| Variante | Cambio respecto al base | Seed | Resultado / nota |
|---|---|---|---|
| v1 (base) | — | [seed] | [nota] |
| v2 | [qué moví] | [seed] | [nota] |
| v3 | [qué moví] | [seed] | [nota] |

- **Ganadora provisional:** [vX] — [por qué]

## 5. Referencias adjuntas

- **Imagen de referencia (style/char):** [link + peso/influencia]
- **Referencia de composición:** [link]
- **Referencia de color:** [link]
- **Uso ético:** [inspiración, no copia — ver `reference-library.md`]

## 6. Post-proceso

- [ ] **Upscale:** [Magnific / nativo — target px]
- [ ] **Remove bg / transparencia:** [si va a UI — lo hace la mano canónica]
- [ ] **Edición / retoque:** [qué corregir — color, recorte, defectos]
- [ ] **Mapeo a tokens:** [si va a UI, la imagen es intención → AXIS/SoT, no HEX crudo]

## 7. QA de la imagen (antes de dar por buena)

- [ ] Comunica el mensaje / concepto sin explicación.
- [ ] Jerarquía con un solo nivel-1.
- [ ] Paleta = la de la marca, no la del modelo.
- [ ] Sin artefactos IA visibles al zoom (manos, texto, bordes).
- [ ] No cae en las señales de "look IA genérico" (ver scorecard §3).
- [ ] Ratio/safe-zone correctos para el formato destino.
- [ ] Si es marca/cliente: respeta SSOT, disclosure de IA si aplica.
