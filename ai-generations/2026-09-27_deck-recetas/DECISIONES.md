# Decisiones del operador y pendientes — recetas del deck (2026-09-27)

Catálogo canónico (69 recetas, JSON): `docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json`.
Referencias aprobadas (JPG, fuera de git): `ai-generations/2026-09-27_deck-recetas/references/<board>.jpg`
(en el JSON, `referenceSource`); en AXIS se publican como `references/surfaces/deck/<id>.jpg`.

## Decisiones del operador (2026-09-27) — se escriben en el canon, no se discuten

1. **Las 69 láminas del canvas están aprobadas.** Todo lo que el canon o AXIS marque como `option`,
   «prueba» u «opción sin elegida» pasa a aprobado: lente, sangre, partida, foco, respiro, hoja de contactos,
   secciones cine (servicios y equipo), las tres portadas generales del brochure y la de cinco líneas con
   selección y cursor de Nexa (`cover-brochure-cine-lines-selection`).
2. **Tríptico:** una palabra por toma, cada una con su esfera: «Escucha.» «Crea.» «Mide.» (reemplaza la
   frase única «Escucha, crea y mide.» con la esfera al final).
3. **Sección partida (las tres variantes):** el indicador sube por la **izquierda** y la esfera queda
   **arriba a la izquierda** (corrección explícita; reemplaza «sube por la derecha»). La variante de la
   órbita a la derecha fue descartada. Variantes aprobadas: esquina arriba (`section-split`), esquina abajo
   (`section-split-corner-bottom`) y panel a la derecha (`section-split-panel-end`).
4. **Fotos de las secciones partidas y de «Quiénes somos» / «Por qué lo hacemos»:** aprobadas con personas
   del equipo en luz dramática. Se registran como excepción aprobada del registro cine para secciones y
   láminas «about» (no amplían el cine a otras superficies).
5. **Cotización:** tres variantes aprobadas (tabla, en escena 3D, en vivo). Montos siempre `[MONTO]`.
6. **Día a día:** cuatro momentos + alternativa con herramientas + dos «vívelo» (avanza a la vista,
   resultados en vivo).
7. **Próximos pasos:** la versión con impacto (agenda del diagnóstico abierta y cursor en «Agenda un
   diagnóstico») reemplaza la de tres columnas.
8. **Clientes:** un solo tono navy; Aguas Andinas y UC Temuco en tonos de navy para conservar sus formas.
9. **Caso Sky:** la foto es de EJEMPLO y se reemplaza por una real del caso.
10. **BeX:** la escalera (`method-staircase`) es la principal; la plana (`method-staircase-flat`) es variante.

## Pendientes de QA (no bloquean la aprobación; se corrigen al llevar la receta a plantilla de producción)

- Respuesta bajo 3× la pregunta en cotización (2,95×), clientes (2,9×), plan (2,8×), partners (2,75×) y
  contraportadas de brochure («Cuando quieras.» 118 px = 2,95×; el token pide 124 px). La plantilla usa el
  valor del canon (≥3×).
- Acento en texto < 24 px (regla D1) en etiquetas pequeñas (día a día, «Recomendado», cabecera de la
  cotización en vivo, «01 · Diagnóstico · Sin costo», kicker de propuestas sobrias, etiqueta del tablero
  Notion; posible halo en equipo/plan). La plantilla lo lleva a navy/blanco salvo confirmación.
- Cifras sin fuente visible: clientes (+127 %, +180 %), por qué elegirnos, «+10 años · 5 países ·
  1 interlocutor»; prueba de Sky sin fuente impresa. No se inventa fuente.
- Partners sin burbuja URL en el pie.
- `quienes.mjs` usa un degradado sobre el plate (el canon prohíbe velos): regenerar con reserva.
- Logo chico en las secciones cine (servicios y equipo) contra «lámina con foto sin logo» (§6 fila 19).
- Logo dentro de la órbita en el cierre (§6 fila 17) no aplicado.
- Isotipo: faltan registros de procedencia de `foto:isotipo` en varios plates `b` (NX6b, CR2b, WB1b, RV1b,
  BR2b…) y HW1, T2, T3, H2, LN4 sin isotipo compuesto: pasar por `foto:emblema` antes de publicar.
- Plate P1 repetido en lente, sangre, contenido-foto y hoja de contactos: no repetir en un mismo deck.
- Dirección de contacto: usar la fuente `EFEONCE_CONTACT` («71, of. 1105»).
- `pnpm brand:compose` fija el contrato 0.1.1: `proposal-cinematic` sin prueba y los layouts hero/lines
  no componen hasta TASK-1927 (0.1.2). `src/lib/brand-surfaces/recipes/deck.ts` (`sectionSplit`) y la
  plantilla del tríptico aún tienen la versión anterior: se corrigen en la task de producción, con el visual
  gate del composer.
