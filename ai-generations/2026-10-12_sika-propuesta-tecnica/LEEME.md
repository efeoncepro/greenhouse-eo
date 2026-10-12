# Sika Mexicana · Wherex N.º 1164 · Propuesta técnica (deck 16:9)

**Estado al 12/10/2026:** borrador v1 para revisión del operador. No se ha enviado ni cargado en Wherex. Documento
**separado** del anexo gráfico «POSIBLE» (decisión del operador: no se presentan como una sola propuesta).

- 14 láminas, línea Brand (Efeonce Creative Studio), molde «propuesta técnica para leer sin presentador» (Pibank/UTEM).
- Títulos directos, sin pregunta y respuesta (instrucción del operador del 07/10). Registro formal, de usted.
- Lienzo (privado): https://claude.ai/artifact/ES3QGcjSiLViUcSW3AG2o5 → página «3 · Propuesta técnica (documento aparte)».
- PDF: OneDrive `Alineación/4. Comercial/Licitaciones/Sika/2. Campaña Creativa/Efeonce-Propuesta-Tecnica-Sika-1164-BORRADOR-v1.pdf`.

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
(`pdftoppm -r 192` sobre `Efeonce-Propuesta-Sika-POSIBLE.pdf`; páginas 2, 3, 4, 15–20). El logo de Sika es el archivo
oficial extraído del PDF de las bases (activo `e9c0d61c…` del lienzo). `render.mjs` avisa si un bloque se desborda.

## De dónde sale cada dato

| Lámina | Dato | Fuente |
|---|---|---|
| 5, 8 | Tres muestras, un solo producto, storyboard admitido; alcance base del lanzamiento tipo | Respuestas de Sika en Wherex del 02, 05 y 06/10 (`docs/commercial/tenders/sika-mexico-campana-creativa-1164/research/2026-10-07-propuesta-tecnica-INTERNO.md`) |
| 9 | Diez días hábiles, hasta dos rondas (el operador rechazó 15 a 20 el 12/10: «demasiado tiempo para un cliente de este tipo») | **Propuesta propia, sin validar por operaciones** |
| 10 | Rondas, aprobación, IA, derechos | Modelo operativo de servicios creativos y brochure «Agencia Creativa» aprobado, pasados a usted |
| 11 | Nombres y cargos | `docs/operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md`; fotos reales del catálogo del compositor |
| 12 | +2.000 piezas, 39 campañas, 88 %, 0,12, 5 mercados | Caso SKY creativo, 12 meses (`.claude/skills/creative-practice/efeonce/ESTADO_ACTUAL.md`); autorización para citarlo fuera, sin verificar |

## Por confirmar antes de enviar

1. Plazo de diez días hábiles y rondas (lámina 9): visto bueno de operaciones.
2. Equipo con nombre (lámina 11): revierte el criterio del borrador anterior («sin capacidad nominada»); lo pidió el operador el 12/10.
3. Caso SKY (lámina 12): autorización de SKY para citar las cifras en una licitación.
4. Logo de Sika en la portada y miniaturas del material de Sika (lámina 3): uso de marca de terceros (TASK-1937).
5. Lámina 10: qué quiso decir Sika con «no AI/PSD» en su respuesta del 06/10. Hoy la lámina no promete archivos editables.
6. Berel no se menciona: conflicto de interés sin decidir.
7. Dos preguntas siguen sin respuesta en Wherex (manual de marca, moneda y facturación, zona horaria del cierre, historias por red, versión TikTok).
