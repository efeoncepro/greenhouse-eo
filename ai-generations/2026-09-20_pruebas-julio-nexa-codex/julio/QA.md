# Prueba individual · Julio · dirección de rodaje de producto

Estado: **prueba para revisión, no aprobación de publicación**. Motor integrado de Codex con tres imágenes canónicas de identidad; prompt compilado con `pnpm foto:prompt ficha.json`, sin `--batch`. El motor devolvió 1122×1402 px, proporción 4:5. Plate sin logo ni texto; firma oficial compuesta después con `LOGO=0.20`.

## Preflight visual abierto antes de generar

- `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/rondas/personas/julio-nexa-firmadas.jpg`: serie de sujetos y variación de lechos.
- `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/rondas/curado/set-curado-12.jpg`: azul activo como luz u objeto y alternancia de materiales.
- `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/rondas/personas/J1-retrato-final.png`: rostro, lentes plateados y barba entrecana en plano cercano.
- `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/rondas/personas/J3-escenario-final.png`: luz con carácter y campo azul.
- `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/rondas/personas2/J5-respaldo-final.png`: gesto de trabajo y profundidad con lecho oscuro.

Las referencias de **identidad pasadas al motor** fueron únicamente `julio-reyes-01.png`, `julio-reyes-04.png` y `julio-reyes-07.png` de `ai-generations/2026-09-17_equipo-vestuario/refs/`; las salidas aprobadas anteriores no se usaron como entrada para evitar deriva acumulada.

## Decisión de arte y revisión

- Oficio: Julio ajusta la posición de una botella prototipo durante un rodaje de producto sin marca. Se ve la obra, el mecanismo de iluminación y el momento de ajuste. Vestuario crudo y gris, sin repetir el blazer navy de las referencias.
- Azul: botella mate sin etiqueta. Naranja: bolsa de arena que estabiliza el pie de luz. Lecho: lona carbón del estuche de cámara junto al lente, en sombra pareja. No se añadió scrim ni grade.
- `plate-v1.png`: azul 1,2 %, naranja 0,15 %, blanco sobre lecho 9,99:1. Ambos colores demasiado discretos.
- `plate-v2.png`: azul 1,4 %, naranja 0,48 %, blanco sobre lecho 4,76:1. Se acercaron los objetos, pero el contraste del lecho quedó justo.
- `plate.png` / `final.png`: azul 1,8 %, naranja 1,00 %, blanco sobre lecho 8,97:1 en `foto:validar`; el compositor midió el SVG blanco a **12,05:1** en su área exacta. Azul y naranja presentes y distinguibles. La banda de 3–10 % orienta la lectura, no es una cuota de aprobación.

## QA final

`pnpm foto:validar plate.png` informa **2/4 reservas**: lecho de firma y sombras no azules pasan. Aire para cursores y campo profundo al margen fallan; esta toma no reserva ni anuncia cursores o cita lateral. Zona de titular y objeto para selección no se declararon. La señal de nitidez del lecho fue 0,0006, que el validador considera frágil; a tamaño completo el primer plano se ve desenfocado y ligado al estuche real.

`metricas.cjs`: quemado **3,74 %** (sobre el rango usual de 0,5–1 %), aplastado **0,4 %**, contraste **91**, b* sombras **−0,6**, piel **L53/C26**. Los ventanales tienen altas luces demasiado fuertes. La luz sobre Julio y el objeto funciona, pero el nivel de quemado y la dirección de color demasiado dependiente de utilería impiden llamar a esta prueba un master aprobado.

Revisión visual: lentes, pelo corto rizado y barba entrecana presentes; el parecido con J1/J5 es razonable para exploración, pero requiere visto bueno del operador. No se ven texto ni logos inventados en el plate a tamaño completo. La bolsa de arena es funcional, aunque su volumen puede distraer. Esta imagen no prueba trabajo para una marca o cliente real.
