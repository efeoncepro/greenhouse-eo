# Alta frecuencia · campaña E2E

> Estado: **creative release complete**. Corrida Efeonce-managed operada localmente el 2026-07-18.

## Resultado

Se produjo una campaña visual completa para comunicar **producción creativa a escala sin perder estándar**. La metáfora seleccionada es un solo colibrí que conserva precisión e identidad mientras su vuelo se transforma en una estela de módulos: una idea que se multiplica sin degradarse.

- 3 territorios generados con Seedream 5 Lite;
- 1 anchor desarrollado con Seedream 5 Pro;
- 3 source plates derivados directamente del anchor con GPT Image 2;
- 3 mensajes × 6 formatos = **18 piezas still de campaña**;
- 12 masters digitales + 6 proofs de producción A2/OOH;
- 2 hero motion de 15 s + 2 masters de 10 s + 2 bumpers de 6 s, en 9:16 y 16:9;
- 1 clip Omni de 3 s conservado sólo como prueba técnica, fuera del release;
- EDL documentada para la familia 15/10/6 s y format wall determinista con piezas reales 4:5, 9:16 y 16:9;
- copy Poppins trazado, logo oficial y URL compuestos de forma determinista;
- JPEG sRGB, dimensiones exactas, todas las piezas bajo 5 MB;
- loudness/peak medidos en los 6 MP4; heroes normalizados cerca de −16 LUFS y masters/bumpers marcados
  `measurement-only` hasta mezcla humana por canal;
- QA técnica: **PASS**;
- costo generativo still estimado: **USD 0.8850**;
- masters motion Omni estimados: **USD 2.08**;
- costo generativo del release: **USD 2.965**, al precio publicado el 2026-07-18.
- costo generativo incremental de los dos heroes: **USD 0**; reutilizan masters/stills aprobados;
- paquete inmutable V3: SHA-256 `13a84dbbffd9be389c2304fbc5360c3410cd5d91b2a45e5b14ae372e2322d24b`.

## Dirección seleccionada

**Alta frecuencia. Alto estándar.** El territorio `T02 — Chromatic wake` obtuvo `27/30`: fue el que mejor convirtió el beneficio operativo en una imagen. Seedream Pro elevó materialidad y control espacial; GPT Image 2 reorganizó ese mismo anchor para cada formato sin crear una campaña distinta.

## Entrega

- [Paquete creativo](./delivery/)
- [ZIP de release](./delivery/high-frequency-campaign-release-v3.zip)
- [Matriz de assets y alt text](./delivery/asset-matrix.csv)
- [Contact sheet del set still](./review/campaign-contact-sheet.jpg)
- [Secuencia del master motion 10 s · 9:16](./review/motion-master-9x16-contact-sheet.jpg)
- [Secuencia del master motion 10 s · 16:9](./review/motion-master-16x9-contact-sheet.jpg)
- [Secuencia del hero motion 15 s · 9:16](./review/motion-hero-9x16-15s-contact-sheet.jpg)
- [Secuencia del hero motion 15 s · 16:9](./review/motion-hero-16x9-15s-contact-sheet.jpg)
- [Contact sheet del probe técnico de 3 s · fuera del release](./review/omni-motion-contact-sheet.jpg)
- [Master motion 10 s · 9:16](./delivery/motion/high-frequency-m01-brand-light-master-9x16-10s-v1.mp4)
- [Master motion 10 s · 16:9](./delivery/motion/high-frequency-m01-brand-light-master-16x9-10s-v1.mp4)
- [Hero motion 15 s · 9:16](./delivery/motion/high-frequency-m01-brand-light-hero-9x16-15s-v1.mp4)
- [Hero motion 15 s · 16:9](./delivery/motion/high-frequency-m01-brand-light-hero-16x9-15s-v1.mp4)
- [Cutdown 6 s · 9:16](./delivery/motion/high-frequency-m01-brand-light-bumper-9x16-6s-v1.mp4)
- [Cutdown 6 s · 16:9](./delivery/motion/high-frequency-m01-brand-light-bumper-16x9-6s-v1.mp4)
- [QA multimodal](./qa/multimodal-qa.json)
- [Revisión motion](./qa/motion-review.md)
- [Tablero de revisión](./review/review-board.html)
- [QA técnica](./qa/technical-qa.json)
- [Dictamen de release](./qa/release-verdict.md)
- [Scorecard visual](./qa/key-visual-scorecard.md)
- [Métricas y costo](./qa/run-metrics.json)
- [Flujo profesional reproducible](./workflow.md)

## Arquitectura de producción

`brief -> brand mode -> diverge -> select -> develop -> anchor -> derive still -> animate -> compose -> prepress -> QA -> package`

La imagen generativa produce sujeto, material, luz y atmósfera. Copy, logo, URL, safe zones, naming y exports son determinísticos. Cada formato deriva directamente del anchor aprobado; no existe una cadena de derivados que acumule deriva. Gemini Omni recibe un plate limpio, sin marca ni copy, y produce motion; la firma se añade después según el `brandMode` de la pieza.

## Reproducción

Desde la raíz del repo:

```bash
FAL_API_KEY_SECRET_REF=greenhouse-fal-api-key \
GCP_PROJECT=efeonce-group GOOGLE_CLOUD_PROJECT=efeonce-group \
NODE_OPTIONS='--conditions=react-server' \
pnpm tsx ai-generations/2026-07-18_high-frequency-campaign-e2e/scripts/01-generate-lite-territories.ts

FAL_API_KEY_SECRET_REF=greenhouse-fal-api-key \
GCP_PROJECT=efeonce-group GOOGLE_CLOUD_PROJECT=efeonce-group \
NODE_OPTIONS='--conditions=react-server' \
pnpm tsx ai-generations/2026-07-18_high-frequency-campaign-e2e/scripts/02-develop-pro-anchor.ts

OPENAI_API_KEY_SECRET_REF=greenhouse-openai-api-key \
GCP_PROJECT=efeonce-group GOOGLE_CLOUD_PROJECT=efeonce-group \
NODE_OPTIONS='--conditions=react-server' \
pnpm tsx ai-generations/2026-07-18_high-frequency-campaign-e2e/scripts/03-derive-gpt-plates.ts

node ai-generations/2026-07-18_high-frequency-campaign-e2e/scripts/04-compose-campaign.mjs
node ai-generations/2026-07-18_high-frequency-campaign-e2e/scripts/05-qa-campaign.mjs

FAL_API_KEY_SECRET_REF=greenhouse-fal-api-key \
GCP_PROJECT=efeonce-group GOOGLE_CLOUD_PROJECT=efeonce-group \
NODE_OPTIONS='--conditions=react-server' \
pnpm tsx ai-generations/2026-07-18_high-frequency-campaign-e2e/scripts/06-animate-off-brand-omni.ts

FAL_API_KEY_SECRET_REF=greenhouse-fal-api-key \
GCP_PROJECT=efeonce-group GOOGLE_CLOUD_PROJECT=efeonce-group \
NODE_OPTIONS='--conditions=react-server' \
pnpm tsx ai-generations/2026-07-18_high-frequency-campaign-e2e/scripts/07-generate-omni-motion-masters.ts

node ai-generations/2026-07-18_high-frequency-campaign-e2e/scripts/08-compose-motion-release.mjs
node ai-generations/2026-07-18_high-frequency-campaign-e2e/scripts/10-compose-hero-15s.mjs
node ai-generations/2026-07-18_high-frequency-campaign-e2e/scripts/09-qa-multimodal-campaign.mjs
```

Los scripts generativos `01`, `02`, `03`, `06` y `07` consumen presupuesto; `06` es sólo el probe histórico.
`04`, `05`, `08`, `09` y `10` son determinísticos y pueden repetirse sin costo de modelo.

El fallback de motion previsto era Seedance reference-to-video si Omni no preservaba identidad espacial,
anatomía o continuidad. No se invocó: los dos clean masters Omni pasaron el gate temporal y el hero se
extendió por montaje determinístico, con costo incremental de modelo cero. El probe de 3 s costó USD 0.390,
se conserva como evidencia técnica y queda excluido tanto del conteo como del costo release.

## Límite de la entrega

El paquete está **listo como producción creativa**, no activado en medios. Faltan escucha humana en audífonos
y teléfono; normalización por canal de masters/bumpers si se trafican; aprobación final de marca/legal;
objetivo de campaña, audiencia, landing, UTMs, evento de conversión, presupuesto, trafficking y diseño del
experimento. El ZIP V3 no se reempaqueta durante esta auditoría: su hash permanece como evidencia inmutable;
los documentos adyacentes contienen las correcciones de reproducibilidad posteriores.
