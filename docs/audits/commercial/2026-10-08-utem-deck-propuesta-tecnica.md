# UTEM · deck de la propuesta técnica SEO/GEO/AEO — 2026-10-08

**Estado vigente 08/10/2026:** oferta presentada por Julio en Mercado Público. Neto CLP 4.800.000 + IVA 912.000 = total 5.712.000, por tres meses. HubSpot: `presentationscheduled` / Presentación de soluciones, `amount=4800000`, CLP; dos readbacks verificados. Siguiente paso: evaluación/resultado, sin adjudicación confirmada. [Presentación y continuidad](../../commercial/tenders/utem-seo-aeo-2026/PRESENTACION-2026-10-08.md). La auditoría de producción siguiente conserva su corte anterior al envío.

Owner: Commercial / Julio Reyes. Ejecutado por Claude (sesión «Propuesta UTEM») sobre la técnica v1.0 de Codex, con el
estilo alternativo «propuesta técnica para leer sin presentador» aprobado en Pibank (2026-10-07). Compra Ágil
5251-1060-COT26, cierre observado 08/10/2026 18:00 Chile. **En el corte de producción aún no se había presentado; después Julio presentó y aportó confirmación, enlazada arriba.**

## Qué quedó

| Pieza | Dónde | Estado |
| --- | --- | --- |
| Deck v2, 35 láminas 16:9, línea Engine | Canvas Design https://claude.ai/artifact/28wHXcgyA3ANNqaaeJcrfb (privado) | Revisado por el operador lámina por lámina; paquete posteriormente presentado por Julio |
| PDF del deck | OneDrive `Licitaciones/UTEM/1. Agencia SEO-AEO/05. Propuesta tecnica/UTEM - Propuesta tecnica SEO GEO AEO - Deck.pdf` | Generado con `render-pdf-utem.mjs` |
| Técnica v1.1 (MD/HTML/PDF) | [oferta-tecnica.md](../../commercial/tenders/utem-seo-aeo-2026/oferta-tecnica.md) → misma carpeta OneDrive | Alineada con el deck: §2.2 revisión pública, §8 equipo nominal, §8.1 experiencia, fuentes F6–F7 |
| Producción | [`ai-generations/2026-10-08_utem-propuesta/`](../../../ai-generations/2026-10-08_utem-propuesta/LEEME.md) | Commit `940700c9c` (sin push) |

## Estructura del deck (5 capítulos con portada propia)

Portada (`cover-proposal`, logo oficial de Educación Continua UTEM en blanco, selección quitada) · Cómo leer · Resumen ·
**Cap. 1** Contexto, Búsqueda hoy (revisión pública), Objetivos · **Cap. 2** Método, Auditoría, Priorización,
Implementación (logos Efeonce y UTEM), Quince artículos, Ficha y aprobación, PR digital · **Cap. 3** Medición
(tablero), Panel de respuestas de IA, Cronograma · **Cap. 4** Equipo (`content-team`), Funciones, Todo junto, A la
vista (artículo UTEM de ejemplo), Cada mes, Clientes, Caso Sky, Caso Berel, Alcance · **Cap. 5** Entregables,
Siguiente paso, Matriz de cumplimiento (anexo), Fuentes y supuestos (anexo) · Cierre (`close-proposal`, «Empower your
Engine»).

## Datos usados (con procedencia)

- **Revisión pública 08/10/2026** (DataForSEO `serp-compare`, Google Chile, escritorio, top 20 + AI Overview; volumen
  Semrush Chile): 15 búsquedas ≈ 17.900 consultas/mes. UTEM entre los primeros 20 en **2 de 15** (posiciones 10 y 11);
  Google responde con IA en **15 de 15**; las respuestas de IA citan o enlazan a UTEM en **3 de 15** (gestión pública,
  administración pública, seguridad privada). Resumen: `ai-generations/2026-10-08_utem-propuesta/serp/utem-serp-resumen.json`.
- **Caso Sky** (dato entregado por el operador, corregido en la sesión): estrategia SEO/AEO editorial, 6 meses,
  **+65 % impresiones, +27 % clics orgánicos, +39 % citabilidad en ChatGPT y Perplexity**. Fuente exacta pendiente.
- **Caso Berel**: cifras del deck SEO/AEO aprobado (2026-09-29): +54 % tráfico orgánico, +120 páginas de color, ×2
  citas en respuestas IA, +38 % búsquedas de marca, 12 meses.
- **Equipo**: Andrés (SEO Specialist), Valentina (Redactora SEO), Julio (Responsable de Cuenta), Daniela (Creative
  Operations Lead), Melkin (Senior Visual Designer; la receta exige 5 fichas, provisional como en Pibank).
- **Clientes**: Universidad Católica de Temuco, Gobierno de Santiago, Marca Chile, ANAM, Aguas Andinas, Sky, Berel,
  Bresler, Carozzi.

## Correcciones del operador (registrar como criterio)

1. «Estas no son nuestras portadas»: portada y contraportada de propuesta salen **siempre** del compositor
   (`cover-proposal`, `close-proposal`), nunca armadas a mano.
2. Pregunta y respuesta deben tener lógica («¿Dónde se elige un programa? Al buscar» rechazada; vigente «¿Dónde nace
   una postulación? En la búsqueda»).
3. Tablas planas → «más impacto visual»: se rehicieron como objetos sobre la plataforma de luz (Objetivos, Priorización
   como escalera, Medición como tablero, Fuentes como fichas).
4. En láminas de responsabilidades, los **logos** de Efeonce y del cliente en vez de los nombres.
5. «No se garantizan» **perjudica más de lo que ayuda**: retirado del anexo (como la lámina de riesgos de Pibank).
6. Equipo, casos (Sky, Berel), clientes y las láminas del día a día ya hechas se traen del set aprobado.

## Trampas técnicas (detalle en la skill de la línea gráfica)

- `decision-case` y `content-clients` sólo existen claros y en Growth (`line-piece-keeps-efeonce-dark`); registro
  `cine` exige Nexa o propuesta (`cine-requires-nexa-or-proposal`); en un documento el `progress` debe ser monótono
  (`document-progress-inconsistent`); `section-classic` muestra una sola línea de respuesta; `content-team` exige 5 fichas.
- Recolor turquesa → Engine con corte de saturación (`teal2engine.cjs`) deja manchas: usar `recolor-engine.mjs`
  (peso continuo, `RECOLOR_LO=156` respeta el verde de Greenhouse).
- Título central vacío con U+2800 se dibuja como puntos braille; NBSP lo recorta el compositor.
- Semrush MCP quedó sin unidades a mitad de la corrida (`API UNITS BALANCE IS ZERO`): se completó con DataForSEO.
- `serp-compare` con alias genérico (`educacioncontinua`) marca `aiMention` por el texto «educación continua»: contar
  sólo `aiCitation`/`aiDirectLink`.

## Pendientes documentados en el corte de producción — estado posterior

- La cotización posterior incluye Insights y panel Greenhouse durante tres meses según fuentes disponibles, sin integraciones nuevas. En el corte inicial la técnica no los incluía expresamente;
  «Cada mes» trae cifras de muestra.
- Fuente exacta del caso Sky; nombres completos del equipo si la oferta los exige.
- `CLAUDE-HANDOFF-INTERNO.md` está en la carpeta de entrega de OneDrive (lo copia `render-proposal.mjs`): no se carga.
- Cotización exacta y presentación resueltas posteriormente: CLP4,8M netos /5,712M total, enviada por Julio. Costeo/margen medidos permanecen pendientes internos.
