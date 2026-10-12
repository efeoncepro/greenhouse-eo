# Sika Mexicana · Wherex N.º 1164 · Propuesta técnica (deck 16:9)

**Estado al 12/10/2026:** borrador v2 (19 láminas) para revisión del operador. No se ha enviado ni cargado en Wherex. Documento
**separado** del anexo gráfico «POSIBLE» (decisión del operador: no se presentan como una sola propuesta).

- 19 láminas, línea Brand (Efeonce Creative Studio), molde «propuesta técnica para leer sin presentador» (Pibank/UTEM).
- Títulos directos, sin pregunta y respuesta (instrucción del operador del 07/10). Registro formal, de usted.
- Lienzo (privado): https://claude.ai/artifact/ES3QGcjSiLViUcSW3AG2o5 → página «3 · Propuesta técnica (documento aparte)».
- PDF: OneDrive `Alineación/4. Comercial/Licitaciones/Sika/2. Campaña Creativa/Efeonce-Propuesta-Tecnica-Sika-1164-BORRADOR-v2.pdf`.

## Cómo se produce

```bash
node ai-generations/2026-10-12_sika-propuesta-tecnica/axis-assets.mjs > ai-generations/2026-10-12_sika-propuesta-tecnica/axis-assets.json   # navegación e íconos Trazo desde AXIS
pnpm brand:compose -- --intent ai-generations/2026-10-12_sika-propuesta-tecnica/composer/cover.json --out ai-generations/2026-10-12_sika-propuesta-tecnica/composer/out-cover
pnpm brand:compose -- --intent ai-generations/2026-10-12_sika-propuesta-tecnica/composer/close.json --out ai-generations/2026-10-12_sika-propuesta-tecnica/composer/out-close
cd ai-generations/2026-10-12_sika-propuesta-tecnica
node quitar-seleccion-dawn.mjs composer/out-cover/01-deck-cover-proposal.png img/portada.png   # quita «Cliente» y el cursor
python3 build-tecnica.py local && node render.mjs && node pdf.mjs out/<nombre>.pdf             # HTML → PNG → PDF
python3 build-tecnica.py dc out/canvas/project                                                  # tableros del lienzo (blobs.json)
```

`img/` (no está en git): portada y cierre del compositor, las fotos reales del equipo
(`src/lib/artifact-composer/catalogs/deck-axis/assets/squad/`) y los recortes del anexo gráfico
(`pdftoppm -r 192` sobre `Efeonce-Propuesta-Sika-POSIBLE.pdf`; páginas 2, 3, 4, 13, 15–20). El logo de Sika es el archivo
oficial extraído del PDF de las bases (activo `e9c0d61c…` del lienzo). `render.mjs` avisa si un bloque se desborda.

## De dónde sale cada dato

| Lámina | Dato | Fuente |
|---|---|---|
| 3 | Los cinco contenidos que pide la ficha | Ficha de Wherex leída el 07/10 (`docs/commercial/tenders/sika-mexico-campana-creativa-1164/research/2026-10-07-propuesta-tecnica-INTERNO.md`) |
| 6 | Tres audiencias, tono e información | Tablero «Audiencias» del anexo gráfico (página 13) |
| 7, 10 | Tres muestras, un solo producto, storyboard admitido; alcance base del lanzamiento tipo | Respuestas de Sika en Wherex del 02, 05 y 06/10 |
| 11, 12 | El reel puede animar imágenes; recursos existentes y producción adicional, por separado; extras opcionales | Respuestas de Sika del 05 y 06/10. Qué entra en el reel base y qué queda fuera del servicio es **propuesta propia** |
| 13 | Diez días hábiles, hasta dos rondas (el operador rechazó 15 a 20 el 12/10: «demasiado tiempo para un cliente de este tipo») | **Propuesta propia, sin validar por operaciones** |
| 14 | Rondas, aprobación, IA, derechos | Modelo operativo de servicios creativos y brochure «Agencia Creativa» aprobado, pasados a usted |
| 15 | Nombres y cargos | `docs/operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md`; fotos reales del catálogo del compositor |
| 16 | Seis horas en común (Santiago UTC−3 / Ciudad de México UTC−6 en esta época); Teams, Notion y Frame.io | Cálculo propio; herramientas del brochure «Agencia Creativa» |
| 17 | +2.000 piezas, 39 campañas, 88 %, 0,12, 5 mercados | Caso SKY creativo, 12 meses (`.claude/skills/creative-practice/efeonce/ESTADO_ACTUAL.md`); autorización para citarlo fuera, sin verificar |

## Por confirmar antes de enviar

1. Plazo de diez días hábiles y rondas (lámina 13): visto bueno de operaciones.
2. Equipo con nombre (lámina 15): revierte el criterio del borrador anterior («sin capacidad nominada»); lo pidió el operador el 12/10.
3. Caso SKY (lámina 17): autorización de SKY para citar las cifras en una licitación.
4. Reel base con locución y música incluidas; rodaje, talento y voz exclusiva, aparte (lámina 11): depende de la económica.
5. Impresión, instalación y pauta fuera del servicio (lámina 12).
6. Seis horas en común y herramientas con nombre (lámina 16).
7. «El manual y la pieza madre quedan a disposición de Sika» (lámina 18): revisar contra la cláusula de derechos.
8. Logo de Sika en la portada y miniaturas de su material (lámina 4): uso de marca de terceros (TASK-1937).
9. Lámina 14: qué quiso decir Sika con «no AI/PSD» en su respuesta del 06/10. Hoy la lámina no promete archivos editables.
10. Berel no se menciona: conflicto de interés sin decidir.
11. Dos preguntas siguen sin respuesta en Wherex (manual de marca, moneda y facturación, zona horaria del cierre, historias por red, versión TikTok).
