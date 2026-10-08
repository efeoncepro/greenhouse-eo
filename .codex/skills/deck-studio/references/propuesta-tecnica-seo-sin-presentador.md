# Propuesta técnica SEO/AEO para leer sin presentador — alternativa aprobada

> **Estado:** aprobada por el operador (CEO) el 2026-10-07 como **alternativa** para propuestas técnicas SEO/AEO.
> **No reemplaza** a los brochures ni a las propuestas compuestas con las recetas de La órbita (`pnpm brand:compose`):
> para brochure manda el set de recetas aprobado. Caso fuente: propuesta técnica Pibank / Banco Pichincha Perú 2027
> (44 láminas).

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
2. **Láminas del compositor** (`pnpm brand:compose`) para lo que tiene receta: portada, ciclo, métricas, equipo,
   diferencia, clientes, E-E-A-T, reporte y cierre. Entran como imagen.
3. **Ritmo:** se alternan láminas azules con las de foto del set aprobado (secciones partidas y láminas con persona).
   Ninguna racha larga de láminas de texto.
4. **Láminas de otros decks aprobados** (casos, países, día a día): se importan como imagen y se llevan a **un solo
   acento** (`teal2engine.cjs` corre el turquesa al acento de la línea; revisar fotos al 100 %).
5. **PDF:** `render-pdf.mjs` renderiza cada lámina con las imágenes locales y arma el PDF 16:9. Sin PowerPoint.

## Columna narrativa (lo que hace que se entienda solo)

- **Cinco capítulos con una pregunta cada uno**, una lámina «Cómo leer esta propuesta» y navegación de capítulo con
  la órbita. Anexos al final: supuestos y fuentes, glosario.
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

## Lo que el operador rechazó (no repetir)

- Margen, costos internos, horas o salarios en material de cliente.
- Copy adulador o de auto-justificación («proponemos que nos mida con esta vara»), frases de relleno y Q/A absurdas.
- Una lámina entera para una cifra de aporte pequeña o una lámina de riesgos que responde objeciones no planteadas.
- Cursores o selecciones que no dicen nada (un cursor «Pibank» apuntando al logo de Pibank).
- Relato centrado solo en la métrica de negocio: una propuesta SEO/AEO tiene que mostrar SEO y AEO.
- Texto que se desborda de una tarjeta: el compositor no la agranda; acorta el texto y mira la lámina al 100 %.

## Antes de entregar

- Cifras y logos de casos importados: requieren OK explícito para **esta** pieza (la decisión de otro deck no se
  extiende) y autorización de logos (TASK-1937).
- No prometer formatos de producto que no estén operando (correo de Insights, modo presentación).
- Si es licitación formal, ver el gate de Proposal Studio (`pnpm tender:canonical-gate`).
- Nada se envía ni se mueve a la carpeta de envío sin aprobación del operador.
