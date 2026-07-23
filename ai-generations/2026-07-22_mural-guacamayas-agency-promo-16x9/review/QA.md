# QA — Art Macaws Agencia Creativa 16:9 V1

## Veredicto

`rejected_by_operator`.

Aunque el candidato resuelve un cuadro horizontal nativo y pasa los checks técnicos, la revisión del
operador detectó que perdió la maravilla del original. La primera evaluación sobreponderó nitidez,
resolución y presencia de motivos aislados; no midió si sobrevivía la experiencia temporal completa.
El diagnóstico corregido vive en `reference-fidelity-analysis.md`.

## Checks

- `PASS` — 16:9 real, `1280×720`, 24 fps, 10.005 s.
- `FAIL` — el cierre no reproduce con suficiente precisión la escala, identidad ni tensión del ojo inicial;
  no es un loop perceptualmente equivalente.
- `FAIL` — la transformación deja de ser mural→materia viva y se vuelve mural + ave separada.
- `FAIL` — la materialidad impasto se diluye al emerger el ave; plumas y cuerpo se naturalizan demasiado.
- `FAIL` — el cuadro horizontal reduce escala monumental, profundidad y sorpresa pese a no usar pillarbox.
- `FAIL` — el request aceptó una referencia de video, pero el usage reportó sólo modalidades `text` e
  `image`; no hay evidencia de que Omni consumiera el video como condicionamiento temporal.
- `PASS` — sin black frames ni freezes mayores a 1.5 s.
- `PASS` — un solo attempt; no se abrió una variante después de obtener candidato útil.
- `NOTE` — el audio AAC es ambiente nativo de referencia (`peak -0.55 dBFS`, `RMS -21.20 dBFS`); debe
  reemplazarse o mezclarse durante el diseño sonoro del master promocional.
- `NOTE` — posters ficticios del callejón heredan pseudo-tipografía ambiental. No contienen marca Efeonce
  ni copy comercial; revisar de nuevo si la toma se usa a pantalla completa por más de diez segundos.

## Evidencia

- Contact sheet de 10 frames: `art-macaws-agency-promo-16x9-v1-contact-sheet.jpg`.
- Frames dirigidos: `frames/opening-eye.jpg`, `frames/wide-mural.jpg`, `frames/wing-emergence.jpg`,
  `frames/flight.jpg`, `frames/final-eye.jpg`.
- Metadata y hash del provider: `../masters/art-macaws-agency-promo-16x9-v1-omni-master.metadata.json`.
- Diagnóstico comparativo: `reference-fidelity-analysis.md`.
