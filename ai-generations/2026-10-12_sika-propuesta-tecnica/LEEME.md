# Sika Mexicana · Wherex N.º 1164 · Propuesta técnica (deck 16:9)

**Estado al 12/10/2026:** borrador v3 (22 láminas) para revisión del operador. No se ha enviado ni cargado en Wherex. Documento
**separado** del anexo gráfico «POSIBLE» (decisión del operador: no se presentan como una sola propuesta).

- 22 láminas, línea Brand (Efeonce Creative Studio), molde «propuesta técnica para leer sin presentador» (Pibank/UTEM).
- Títulos directos, sin pregunta y respuesta (instrucción del operador del 07/10). Registro formal, de usted.
- Lienzo (privado): https://claude.ai/artifact/ES3QGcjSiLViUcSW3AG2o5 → página «3 · Propuesta técnica (documento aparte)».
- PDF: OneDrive `Alineación/4. Comercial/Licitaciones/Sika/2. Campaña Creativa/Efeonce-Propuesta-Tecnica-Sika-1164-BORRADOR-v2.pdf`.

## Cómo se produce

```bash
node ai-generations/2026-10-12_sika-propuesta-tecnica/axis-assets.mjs > ai-generations/2026-10-12_sika-propuesta-tecnica/axis-assets.json   # navegación e íconos Trazo desde AXIS
pnpm brand:compose -- --intent ai-generations/2026-10-12_sika-propuesta-tecnica/composer/cover.json --out ai-generations/2026-10-12_sika-propuesta-tecnica/composer/out-cover
pnpm brand:compose -- --intent ai-generations/2026-10-12_sika-propuesta-tecnica/composer/close.json --out ai-generations/2026-10-12_sika-propuesta-tecnica/composer/out-close
pnpm brand:compose -- --intent ai-generations/2026-10-12_sika-propuesta-tecnica/composer/caso.json --out ai-generations/2026-10-12_sika-propuesta-tecnica/composer/out-caso   # → img/caso-sky.png
cd ai-generations/2026-10-12_sika-propuesta-tecnica
node quitar-seleccion-dawn.mjs composer/out-cover/01-deck-cover-proposal.png img/portada.png   # quita «Cliente» y el cursor
python3 build-tecnica.py local && node render.mjs && node pdf.mjs out/<nombre>.pdf             # HTML → PNG → PDF
python3 build-tecnica.py dc out/canvas/project                                                  # tableros del lienzo (blobs.json)
```

`img/` (no está en git): portada y cierre del compositor, las fotos reales del equipo
(`src/lib/artifact-composer/catalogs/deck-axis/assets/squad/`) y los recortes del anexo gráfico
(`pdftoppm -r 192` sobre `Efeonce-Propuesta-Sika-POSIBLE.pdf`; páginas 2, 3, 4, 13, 15–20). El logo de Sika es el archivo
oficial extraído del PDF de las bases (activo `e9c0d61c…` del lienzo). `render.mjs` avisa si un bloque se desborda.

## Orden vigente (v3, 12/10)

1 portada · 2 la idea (Master Graphic a página completa) · 3 cumplimiento · 4 punto de partida · 5 evolución (qué se conserva y
qué se ordena) · 6 el sistema · 7 el brief, punto por punto · 8 audiencias · 9 muestras · 10 alcance · 11 método ·
12 lanzamiento tipo · 13 reel · 14 piezas adicionales · 15 plazo · 16 control · 17 equipo · 18 trabajo con México ·
19 caso Sky · 20 continuidad · 21 inicio · 22 cierre. **Las tablas de abajo conservan la numeración de la v2 (19 láminas).**

Cambios de la v3, pedidos por el operador tras revisar la narrativa contra la ficha: salió el resumen de «tres
documentos»; el deck abre con el trabajo; la lámina 4 dejó el tono de diagnóstico; se sumaron evolución, el cruce con el
brief (factores diferenciadores, mensajes clave y tono, secciones 2 y 6 del brief) y continuidad (el brief fija la campaña
hasta diciembre de 2027).

## El reel como video

`reel/animatic-sin-audio.mp4` es el animatic de 25 s del 06/10 (activo `6e04eb5d…` del lienzo). `reel/mezcla.sh` le monta
la locución (`vo-v4.mp3`, voz «Marco», locutor mexicano, **Eleven v4** por indicación del operador del 12/10: voz mexicana, no coloquial, con el motor más avanzado; una toma cortada por sus silencios)
y la música (`musica.mp3`, ElevenLabs Music v2.5, instrumental) y escribe `reel-sikaseal-170.mp4`. Los dos servidores
MCP locales de ElevenLabs tienen mal la clave (usan el id de la clave, no la `sk_`): la generación salió por el conector
de claude.ai (`creative_generate_speech` y `creative_generate_in_flow` con nodo `music`).

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
| 15 | «+85 profesionales en toda Latinoamérica» | Cifra del operador (comentario del 12/10), con el tratamiento de la lámina «Expertos multidisciplinarios» canonizada el 10/10; sin fuente en el repo |
| 16 | Personas en Chile y en México; Teams, Notion y Frame.io | Indicación del operador del 12/10 (pidió quitar «desde Chile» y las horas en común: «nos puede jugar en contra»); herramientas del brochure «Agencia Creativa» |
| 17 | Caso Sky: +2.000 piezas, 39 campañas, 88 %, −25 % | Lámina aprobada `decision-case` del compositor (`composer/caso.json`, foto `SK1-vuelo-amanecer` del brochure «Agencia Creativa»; se compone como lámina clara de Efeonce, línea growth: el contrato rechaza Brand en claro). El operador rechazó la lámina hecha a mano el 12/10. Autorización de Sky para citarlo fuera, sin verificar |

## Por confirmar antes de enviar

1. Plazo de diez días hábiles y rondas (lámina 13): visto bueno de operaciones.
2. Equipo con nombre (lámina 15): revierte el criterio del borrador anterior («sin capacidad nominada»); lo pidió el operador el 12/10.
3. Caso SKY (lámina 17): autorización de SKY para citar las cifras en una licitación.
4. Reel base con locución y música incluidas; rodaje, talento y voz exclusiva, aparte (lámina 11): depende de la económica.
5. Impresión, instalación y pauta fuera del servicio (lámina 12).
6. «Personas en Chile y en México» (lámina 16): lo indicó el operador; el repo no dice quiénes están en México. Herramientas con nombre.
7. «El manual y la pieza madre quedan a disposición de Sika» (lámina 18): revisar contra la cláusula de derechos.
8. Logo de Sika en la portada y miniaturas de su material (lámina 4): uso de marca de terceros (TASK-1937).
9. Lámina 14: qué quiso decir Sika con «no AI/PSD» en su respuesta del 06/10. Hoy la lámina no promete archivos editables.
10. Berel no se menciona: conflicto de interés sin decidir.
11. Sika respondió nuestra pregunta el 09/10 (registro en el research INTERNO): sin manual en esta etapa, cierre 16/10 a las 16:00 de Ciudad de México (19:00 de Santiago), historias en Instagram y Facebook, reel con adaptación para TikTok. Moneda y facturación siguen sin respuesta.
12. El reel: la ficha pide «1 video tipo reel no mayor a 30 seg» y el anexo lleva storyboard (admitido por Sika el 06/10). Existe un animatic MP4 de 25 s sin audio; decidir si se termina con locución y música y se adjunta.
13. Propuesta económica desglosada: sin empezar.
