# Prueba conjunta — Julio y Nexa en imprenta

- Ficha: `ficha.json`; prompt exacto construido por `pnpm foto:prompt`: `prompt.txt` (`prompt-build.txt` conserva el reporte completo).
- Referencias de identidad, en orden: Julio `julio-reyes-01.png`, `julio-reyes-04.png`; Nexa `nexa-cuerpo-completo-v2.png`, `nexa-the-point.png`.
- Una generación nativa 4:5, 1122 × 1402. `plate.png` no incluye firma generada. `final.png` incorpora el SVG oficial sobre el riel de la máquina, sin scrim ni recorte.
- Revisión visual: ambos rostros completos y reconocibles, manos plausibles, acción conjunta legible; el azul proviene de la fotografía impresa y el naranja de pequeñas marcas de registro. El espacio de imprenta es más amplio y claro de lo previsto, pero el primer plano de prensa proporciona el lecho oscuro. Sin textos ni marcas de terceros en la toma.
- `pnpm foto:validar plate.png`: 2/4 reservas; pasa el lecho de firma y sombras neutras. Fallan aire lateral para cursores y campo profundo de margen, reservas opcionales para una futura capa gráfica. Esta prueba no lleva texto ni cursores.
- Firma blanca compuesta a 20% del lado corto: contraste medido **14,27:1** (mínimo 4,5:1). Sin logo generado en el plate.
- Colorimetría orientativa: L* media 38, contraste 80, sombras b* −0,6, azul detectado 1,1%; las marcas naranjas son visualmente presentes, aunque el detector cromático reporta 0,00% por su tamaño. Los porcentajes no son cuotas de color.
- El validador de prompt avisó que no encontró una palabra de su lista cerrada para “MOMENTO”; la escena sí especificó que la prueba emerge de la prensa y la imagen muestra una interacción en curso. No se alteró el prompt después de generar.
- Estado: **prueba para revisión del operador**, sin aprobación ni publicación implícita.
