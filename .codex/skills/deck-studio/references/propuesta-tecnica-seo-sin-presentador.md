# Propuesta técnica SEO/AEO para leer sin presentador — alternativa aprobada

> **Estado:** aprobada por el operador (CEO) el 2026-10-07 como **alternativa** para propuestas técnicas SEO/AEO;
> actualizada el 2026-10-08 con el segundo caso y las correcciones del operador.
> **No reemplaza** a los brochures ni a las propuestas compuestas con las recetas de La órbita (`pnpm brand:compose`):
> para brochure manda el set de recetas aprobado. Caso fuente: propuesta técnica Pibank / Banco Pichincha Perú 2027
> (v11 del 2026-10-08, 46 láminas, con la evaluación 2026 que pidió el banco). Segundo caso: deck de la propuesta técnica UTEM, Compra Ágil SEO/GEO/AEO (2026-10-08, 35 láminas,
> Engine; registro en `docs/audits/commercial/2026-10-08-utem-deck-propuesta-tecnica.md`).

## Cuándo usarla

- Licitación o propuesta técnica que el cliente **lee sin nosotros** (comité, gerencia, compras).
- Cuando la propuesta tiene que **explicar** —diagnóstico real, plan, medición, responsabilidades, supuestos—, no solo
  vender la práctica. Si el objetivo es presentar la práctica, usa el brochure o la propuesta de recetas.

## Cómo se construye

Es un híbrido sobre un canvas Design, con la línea de servicio de la propuesta (Pibank: Engine `#0375db`):

1. **Láminas a mano en HTML con tokens** para todo lo que lleva datos del cliente: búsqueda real, demanda,
   diagnóstico, cadena, frentes, calendario, meta, inversión, supuestos. Generador de referencia:
   `ai-generations/2026-10-07_pibank-propuesta/build-tecnica.py` (helpers `page`, `eyebrow` con anillo, `headline`
   con esfera, `means`, `obj`, `halo_platform`; íconos Trazo y navegación de capítulo desde AXIS en `axis-assets.mjs`).
   Segundo generador de referencia: `ai-generations/2026-10-08_utem-propuesta/build-tecnica.py` (UTEM; ver su
   `LEEME.md`). Los datos van como **objetos sobre la plataforma de luz** —escalera para priorizar, tablero para
   medir, fichas para fuentes—, no como tablas planas: el operador las rechazó por falta de impacto visual.
2. **Láminas del compositor** (`pnpm brand:compose`) para lo que tiene receta: portada, ciclo, métricas, equipo,
   diferencia, clientes, E-E-A-T, reporte y cierre. Entran como imagen. **Portada y contraportada salen siempre del
   compositor**, nunca armadas a mano: `cover-proposal` con el logo oficial del cliente dentro de la órbita y la
   selección quitada (UTEM: `quitar-seleccion-portada.mjs`), y `close-proposal`. Del set aprobado se traen el equipo
   (`content-team`), los casos (`decision-case`), los clientes (`content-clients`), el día a día (`content-day` con
   `tools` / `live-progress` / `live-results`) y las portadas de capítulo (`section-classic`).
3. **Ritmo:** se alternan láminas azules con las de foto del set aprobado (secciones partidas y láminas con persona).
   Ninguna racha larga de láminas de texto.
4. **Láminas de otros decks aprobados** (casos, países, día a día): se importan como imagen y se llevan a **un solo
   acento**. Para láminas claras de Growth usar `ai-generations/2026-10-08_utem-propuesta/recolor-engine.mjs` (peso
   continuo por tono, `RECOLOR_LO=156` respeta el verde de Greenhouse), no `teal2engine.cjs`: su corte por saturación
   deja manchas. QA al 100 % y con contraste aumentado; las manchas no se ven en la hoja de contacto.
5. **PDF:** `render-pdf.mjs` renderiza cada lámina con las imágenes locales y arma el PDF 16:9. Sin PowerPoint
   (UTEM: `render-pdf-utem.mjs`, con el mapa de imágenes en `blobs.json`).

### Restricciones del compositor (UTEM, 2026-10-08)

- `decision-case` y `content-clients` sólo existen claros y en Growth (`line-piece-keeps-efeonce-dark`): se recolorean.
- El registro `cine` exige Nexa o propuesta (`cine-requires-nexa-or-proposal`).
- En un documento el `progress` debe ser monótono (`document-progress-inconsistent`).
- `section-classic` muestra una sola línea de respuesta; `content-team` exige 5 fichas.
- `method-eeat`: el `meterTopic` admite 24 caracteres; evitar jerarquías absolutas en el medidor (Pibank v11 usa
  «Relevantes» en Google y en IA).
- Título central vacío: U+2800 se dibuja como puntos braille y NBSP lo recorta el compositor (detalle en la skill
  `efeonce-graphic-line`, `references/lessons.md`).

## Columna narrativa (lo que hace que se entienda solo)

- **Cinco capítulos con una pregunta cada uno**, una lámina «Cómo leer esta propuesta» y navegación de capítulo con
  la órbita. Anexos al final: supuestos y fuentes, glosario.
- **Pregunta y respuesta con lógica:** la respuesta contesta la pregunta. Rechazada en UTEM: «¿Dónde se elige un
  programa? Al buscar»; vigente: «¿Dónde nace una postulación? En la búsqueda».
- **Lámina «Búsqueda hoy» con revisión pública real:** DataForSEO `serp-compare` (top 20 + AI Overview) sobre las
  búsquedas del cliente y Semrush para volumen. Se rotula **revisión pública** con fecha, nunca auditoría. UTEM:
  15 búsquedas, presente entre los 20 primeros en 2, respuesta de IA en 15, citado por la IA en 3.
- **Responsabilidades con logos:** en láminas de quién hace qué, los logos de Efeonce y del cliente en vez de sus
  nombres.
- **Cada título afirma su conclusión.** Cada lámina con datos cierra con una franja «Qué significa para <cliente>» y
  su fuente.
- **Equilibrio SEO/AEO ↔ negocio (regla del operador).** SEO y AEO valen por sí mismos y además conectan con el
  negocio. Patrón: la **cadena búsqueda → cuenta** (Aparecer → Ser elegido → Convencer → Convertir/abrir), donde SEO y
  AEO trabajan los primeros eslabones con **su métrica propia**, y la meta de negocio aparece **al final de la
  cadena**, no como protagonista. El resumen muestra **dos tableros**: visibilidad (posiciones, menciones en IA,
  orgánico sin marca) y negocio.
- **«Lo que veremos moverse, en orden»:** señales SEO/AEO por etapa (base → visibilidad → decisión), observables y no
  garantizadas.
- **Economía:** precio cerrado comercialmente, inversión mes a mes y **costo por cuenta** como escenarios aritméticos
  frente a otros canales, sin prometer volumen.
- **Supuestos reunidos en un anexo**, no repartidos en advertencias por lámina.
- **Cuando el cliente pide una estimación de impacto** (Pibank, correo del 07-10): se entrega en la propuesta, no se
  difiere al mes 1. Dos láminas: (1) la evaluación con el escenario central en grande, la curva por trimestre y los
  tres escenarios, con «ejercicio hipotético, no pronóstico» junto a la cifra; (2) la conexión con la meta del
  cliente: aporte directo + mejora de conversión por cada 100.000 visitas de otros canales, la fila que resuelve la
  meta y el tráfico requerido rotulado como requisito, no predicción. El mes 1 **calibra** esa estimación. Las cifras
  salen del modelo del caso (Pibank: `estimacion-seo-aeo-2026-10-08/` de Codex), nunca se inventan en la lámina.
- **Equipo:** nombres sólo de personas confirmadas por el operador; el resto como rol «por asignar antes del inicio»
  (en `content-team`, que exige cinco fichas, con una ficha neutra).

## Lo que el operador rechazó (no repetir)

- Margen, costos internos, horas o salarios en material de cliente.
- Copy adulador o de auto-justificación («proponemos que nos mida con esta vara»), frases de relleno y Q/A absurdas.
- Una lámina entera para una cifra de aporte pequeña o una lámina de riesgos que responde objeciones no planteadas.
- Bloques «No se garantizan» o autodefensas en anexos: perjudican más de lo que ayudan (retirado en UTEM, como la
  lámina de riesgos de Pibank).
- Portadas y contraportadas armadas a mano («estas no son nuestras portadas»).
- Tablas planas de texto donde cabe un objeto sobre la plataforma.
- Cursores o selecciones que no dicen nada (un cursor «Pibank» apuntando al logo de Pibank).
- Relato centrado solo en la métrica de negocio: una propuesta SEO/AEO tiene que mostrar SEO y AEO.
- Texto que se desborda de una tarjeta: el compositor no la agranda; acorta el texto y mira la lámina al 100 %.

## Antes de entregar

- Cifras y logos de casos importados: requieren OK explícito para **esta** pieza (la decisión de otro deck no se
  extiende) y autorización de logos (TASK-1937).
- No prometer formatos de producto que no estén operando (correo de Insights, modo presentación).
- Si es licitación formal, ver el gate de Proposal Studio (`pnpm tender:canonical-gate`).
- Nada se envía ni se mueve a la carpeta de envío sin aprobación del operador.

## UTEM: paquete presentado y preservación — 08/10/2026

El segundo caso ya fue presentado por Julio en Mercado Público. El deck v2 de 35 láminas y la técnica v1.1 forman el paquete preparado; la cotización formal se mantiene separada en HTML/PDF A4 vertical. [Estado, precio final y evidencia](../../../../docs/commercial/tenders/utem-seo-aeo-2026/PRESENTACION-2026-10-08.md).

Después de presentar, conservar archivos y hashes aprobados. Actualizar estado en el expediente y seguimiento sin regenerar la técnica/deck ni sustituir adjuntos. La confirmación de envío no acredita adjudicación ni valida por sí sola los pendientes internos de costos, capacidad, panel o fuentes de casos.
