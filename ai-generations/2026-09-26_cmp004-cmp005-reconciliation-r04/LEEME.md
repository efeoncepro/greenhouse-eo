# CMP-004 / CMP-005 · Otra pasada de dirección

Fecha: 2026-09-26. Cuatro **pilotos 4:5 para revisión**, sin aprobación creativa ni publicación.
Fotografía generativa y composición tipográfica determinista con activos oficiales.

## Cómo se concilia el sistema

- La fotografía demuestra el servicio: identidad en superficies digitales, revisión con Pencil, diagnóstico de fricción y decisión dirigida.
- Azul y naranja viven en la obra y la luz local de la escena. El teal de Efeonce identifica la voz gráfica. Blanco neutro-cálido; sombras medidas sin dominante azul.
- Pregunta: Poppins Light 300 + anillo. Respuesta: Bricolage 760, ancho normal, máximo tres palabras y esfera terminal. Sustento: Poppins, con énfasis verbal donde aporta.
- Dos cajas de selección destacan respuestas completas, incluida su esfera. No son botones ni se superponen al CTA.
- CTA por función: contorno consultivo para branding y diagnóstico, texto para continuidad de producción, relleno para concentrar la elección de prioridades. El contraste verifica la decisión posteriormente.
- Firma: SVG Efeonce oficial, centrado, 20% del lado corto. Sin burbuja URL porque el logo no aparece en la escena.
- No se añadió una gran órbita decorativa: anillo y esfera ya cumplen una función semántica.

| ID | Registro | Respuesta | Énfasis | CTA |
|---|---|---|---|---|
| CMP004-C01-KV-45-R04 | C, respuesta a la vista | Por tu identidad | Selección de respuesta + esfera | Hablemos de tu marca · contorno |
| CMP004-C04-KV-45-R04 | A, oficio documental | Con criterio | Selección de respuesta + esfera | Escala tu producción · texto |
| CMP005-S01-KV-45-R02 | A, diagnóstico documental | Diagnóstico | Escala tipográfica + esfera | Revisemos tu estrategia · contorno |
| CMP005-S02-KV-45-R02 | B, puesta en escena | Con foco | Escala tipográfica + esfera | Definamos prioridades · relleno |

S01 se desplaza hacia la reserva real a la derecha de la luz. Una edición generada dibujó una banda artificial: se descartó y se conserva sólo como evidencia. S02 usa una edición arquitectónica del muro, sin banda añadida. Las personas son ficticias y las obras son ilustrativas; no son staff identificado, testimonios, clientes ni resultados reales.

## Verificación y límites

- Las cuatro composiciones pasan `foto:cta:gate --reproducir`: PNG idéntico al recompuesto, texto, firma, safe area y protección de sujetos.
- Revisión visual del master y/o preview 390: voces separadas, preguntas completas, esfera dentro de selección, CTA independiente, firma y hardware contemporáneo.
- 39 tests dirigidos pasan. Cuatro fixtures previos mantienen píxeles idénticos; no se afirma certificación global del compositor.
- Corchetes C04 corregidos: el adapter admite un piso óptico optativo y ahora miden 1.04 CSS px. El gate final por reproducción no emite ese aviso. El valor por defecto conserva los píxeles previos.
- **Reserva fotográfica general:** C01 cumple 4/5; C04 y S01, 3/5; S02, 5/5. Campo profundo y/o aire lateral fallan en tres plates. Estas composiciones concretas sí pasan el gate; los plates no quedan aprobados para adaptaciones libres o nuevos ratios. No se oculta ni exceptúa este resultado.
- Pendientes: evaluación creativa del operador y corrección de reservas antes de convertir los plates en plantillas de producción multiformato.

## Fuentes y reproducción

Canon: `EFEONCE_GRAPHIC_LINE_V1`, `EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1`, skill `design-studio/references/efeonce-photographic-language.md`, contratos/tokens AXIS y compositor canónico. Las fichas alimentaron `foto:prompt`; los prompts y fotografías quedan separados de los overlays.

Desde la raíz de greenhouse-eo:

```sh
node scripts/foto/componer-cta.mjs ai-generations/2026-09-26_cmp004-cmp005-reconciliation-r04/piezas.json
node scripts/foto/componer-cta.gate.mjs ai-generations/2026-09-26_cmp004-cmp005-reconciliation-r04/piezas.json --reproducir
```

La nueva opción `graphicVoice` no migra planes anteriores. La evidencia detallada está en `verification/`, el manifiesto en `delivery-manifest.json` y los exports/overlays/layouts/alt text en `out/`.

## Corrección de esquinas — 2026-09-26

C01, S01 y S02: CTA con radio 14 px para cuerpo 34 px, mediante el compositor canónico. C04 conserva el tratamiento de texto, idéntico en píxeles. Se conservaron los exports anteriores en `verification/before-rounded-cta/`. La validación del modo `graphicVoice: efeonce` ahora rechaza radio cero o ausente en contorno/relleno. Los resultados de la nueva reproducción viven en `verification/rounded-cta-gate.log`.
