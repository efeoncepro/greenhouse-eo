# Mural Guacamayas — Agencia Creativa 16:9

Adaptación cinematográfica horizontal del Hero `El mural que alza vuelo` para el video promocional de
Agencia Creativa. La toma se regenera nativamente en `16:9` mediante Gemini Omni y reutiliza los tres
keyframes aprobados del run vertical más un extracto de tres segundos del master original como set mixto
imagen+video. Los stills fijan identidad y detalle; el extracto fija timing, materialidad y peso de cámara.

## Estado

`rejected_by_operator`. El canario completó el contrato técnico, pero no preservó la experiencia, la
materialidad ni la dramaturgia temporal del master de referencia. No autoriza publicación, upscale,
integración ni un segundo attempt automático. Diagnóstico: `review/reference-fidelity-analysis.md`.

## Ejecución

```bash
node ai-generations/2026-07-22_mural-guacamayas-agency-promo-16x9/render-omni-16x9.mjs --plan
node ai-generations/2026-07-22_mural-guacamayas-agency-promo-16x9/render-omni-16x9.mjs --execute
```

El canario autorizado permite un solo attempt de 10 segundos. Variaciones adicionales requieren revisar
primero el candidato completo.

## Resultado del canario

- Master: `masters/art-macaws-agency-promo-16x9-v1-omni-master.mp4`.
- `1280×720`, `24 fps`, `10.005 s`, H.264 + AAC.
- Gemini Omni consumió `57,920` tokens de video en el único attempt autorizado.
- QA visual: `review/QA.md`, `review/reference-fidelity-analysis.md` y
  `review/art-macaws-agency-promo-16x9-v1-contact-sheet.jpg`.
