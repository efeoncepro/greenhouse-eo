# Carretera Austral Omni Video

Purpose: create an illustrative 10s video atom for the AEO repurposing section, grounded in the article photo set rather than a generic generated landscape.

Source reference:

- `refs/capillas-de-marmol-article-reference.jpg`
- Original runtime source: `/Users/jreye/Documents/efeonce-think/src/assets/muestras/sky-carretera-austral/capillas-de-marmol.jpg`

Pipeline:

1. Edit the article photo with OpenAI `gpt-image-2` to create a first frame with adult travelers enjoying the place.
2. Feed that generated keyframe to Gemini Omni on Google Cloud / Vertex AI with a controlled 10s image-to-video prompt.
3. Review with contact sheets and ffprobe metadata before using in `efeonce-think`.

Creative constraints:

- Illustrative generated asset, not documentary SKY footage.
- No logos, text, UI overlays, SKY uniforms, or recognizable real people.
- Preserve the Capillas de Marmol visual anchor from the article image.
- Treat native audio as a candidate and review before publishing.
