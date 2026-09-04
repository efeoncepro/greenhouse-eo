# Fuentes — de dónde salió cada regla

> **Última sincronización:** **2026-09-02** contra la Wiki viva de Berel en Notion.
> Notion sigue siendo la fuente de verdad viva; el repo es una copia operativa. Cuando una petición
> fechada del cliente o una spec específica contradice una regla más vieja, manda la fuente más
> reciente/específica y se registra el drift.

## Clasificación de piezas verificada — 2026-09-03

Esquemas vivos de Tareas, Content Hub y Proyectos: `Tipo de pieza`, `Canal de pieza`,
`Formato`, auxiliares y destinos de rollup. Revisión directa de 147 tareas de noviembre/diciembre
y tareas puntuales de tutoriales; 51 correcciones de propiedades con readback, sin modificar cuerpos,
estados, fórmulas ni automatizaciones. El módulo 07 conserva la matriz y los límites de conteo.
El Playbook vivo fue leído, no editado en esta corrección. No es una resincronización completa de la Wiki.
Confirmación posterior del operador (2026-09-03): mantener el patrón y solo etiquetar; no crear
campos de cantidad, cambiar fórmulas ni dividir tareas. Se exige tipo/canal desde la creación
y en los checklists de banners, sociales y fotos. Relectura de 221 tareas de octubre–diciembre:
196 visuales con ambas etiquetas y 25 principales excluidas; sin nuevas escrituras en esa revisión.

## Distribución selectiva y cupos — 2026-09-03

Petición explícita del operador: mantener formatos, seleccionar distribución por artículo y aplicar
noviembre/diciembre. Playbooks Social y Producción actualizados en Notion; módulo 15 gobierna la
selección y el tratamiento reversible. No es aprobación de publicaciones ni de nuevos formatos.
Contrato comunicado en esta sesión: 8 artículos de 3.000–5.000 palabras, 50 gráficas, 3 videos
cortos de cortesía durante seis meses, 4 superficies activas y reporting quincenal; SEO técnico,
AEO, Laboratorio Berel, Digital PR y link building. El operador confirmó que las 50 gráficas
incluyen blog y RRSS. Superficies verificadas contra las tareas N35 del ciclo anterior:
Blog, Facebook, Instagram y Pinterest; no se crean redes adicionales. El operador confirmó inicio de cortesía en mayo y extensión a noviembre/diciembre
2026 (tres videos por mes). No inferir cumplimiento desde tareas ni reescribir todos los artículos
para alcanzar longitud dentro de este cambio de distribución.

## Informes de auditoría al cliente — 2026-09-04

Petición explícita del operador tras la auditoría de agosto: incorporar la continuidad con auditorías
anteriores y Content Hub, la responsabilidad de Efeonce como redactor y publicador, la revisión
integral de voz y los límites del run de AEO Grader. El módulo 17 aplica estas reglas junto al
canon compartido de reporting. Es una actualización del proceso autorizada en esta conversación,
no una nueva sincronización integral de la Wiki ni una declaración de estado actual del sitio.
El informe de agosto enlazado en el módulo es un caso fechado; sus cifras no se reutilizan como
baseline sin comprobar periodo y comparabilidad.

## Fuentes principales

Numeración editorial: corrección autorizada 2026-09-03 en módulo 16 y
[auditoría por ID](../../../docs/audits/seo/BEREL_EDITORIAL_NUMBERING_2026-09-03.md).
Los números de las auditorías anteriores son históricos; consultar el mapa antes de operar.

| Fuente | ID / ubicación | Qué gobierna |
|---|---|---|
| 📘 **Playbook Producción** | `3b239c2fefe780ceb71dff4f5bed4646` | ciclo mensual, modalidades, `Formato`, estructura de artículo y Tutorial híbrido |
| 5️⃣ **Recomendaciones Cliente** | `38239c2fefe780e0aeeae0ada3170d81` | peticiones fechadas, voz en primera persona, series, CTA, anchors, CMS |
| 🗣️ **6. Voz y Tono** | `33139c2fefe781ff9ae6f0b2cb8f0933` | estándar editorial general es-MX |
| 📋 **Spec para imágenes** | `38f39c2fefe780aba8e3de74983a23d6` | campos, tamaños, ALT, peso y permanencia de banners |
| 📣 **Playbook Derivados Sociales** | `f58f34efd1e04043b9982b932a034464` | atomización social por canal |
| ➡️ **Modulación por canal** | `38139c2fefe7805683c8eea4586b1587` | registro por red |
| 📤 **Cómo subir un artículo (Drupal)** | `4ed619156c0e4f6a89fb83b78ea6c0ad` | carga CMS y handoff |
| 📝 **Ficha Tutoriales** | `3cf39c2fefe780f29a2ec7fae06cff67` | tarea/ficha de fotos Paso a Paso del formato Tutorial |
| 📝 **Fichas para Gráficos** | `3c739c2fefe7803d9958cd74648cb036` | ficha de producción de infografías |
| 🖼️ **Formatos de infografía** | `collection://06d39c2f-efe7-82be-99f6-87b9e8e34745` | 5 formatos aprobados + paleta de acento |
| 📆 **Content Hub** | `35f39c2fefe7808186efc6ec63475640` | planificación y propiedad `Formato` |
| **Tareas** | `35c39c2fefe780c9bc37e811a7b95a7c` | ejecución, relaciones, estados e íconos |

## Cambios promovidos en la sincronización 2026-09-02

1. **`Formato` es obligatorio antes de escribir.**
   - `Artículo` → Modalidad A/B normal.
   - `Tutorial` → Modalidad A/B + versión híbrida para CMS.
2. **Tutorial híbrido formalizado.**
   - vive en la misma página del Content Hub;
   - una intención = una URL;
   - conserva aproximadamente 90% de la cobertura útil del V1;
   - estructura canónica de 4 pasos;
   - productos/materiales/colores se preparan para el bloque CMS `Tutorial Contenido`.
3. **Fotos del Paso a Paso separadas de banners.**
   - una sola tarea de diseño por secuencia;
   - 1:1 de 500 px para diseño;
   - sin texto/logo;
   - coherencia visual entre pasos.
4. **Banners del V1 viajan completos al híbrido.** No basta un puntero.
5. **Links del handoff CMS en ruta relativa** cuando corresponde; anchor siempre descriptivo.
6. **La modalidad sigue determinándose por contenido vivo**, no por `Enlace` ni HTTP 200.
7. **Instagram = Story**, decisión posterior del cliente; la mención antigua a post estático queda
   explícitamente superada.
8. **Nunca `/search?q=`**: aunque una línea vieja del Playbook todavía lo mencione, `robots.txt` lo
   bloquea y la regla vigente es paleta/artículo válido → `/colores/<familia>`.

## Decisión de cobertura editorial del operador — 2026-09-02

La conversación del operador y el inventario de 49 páginas desarrolladas sustentan
[`BEREL_EDITORIAL_COVERAGE_STRATEGY_V1.md`](../../../docs/operations/BEREL_EDITORIAL_COVERAGE_STRATEGY_V1.md).
La sección «Planeación temática y cobertura capilar — decisión del operador 2026-09-02» fue añadida
al Playbook vivo y confirmada mediante una nueva lectura. Es dirección editorial del operador,
no aprobación del cliente de artículos concretos ni del calendario.

- Prioridad: elección/planeación; protección/reparación/mantenimiento; preparación/aplicación.
- Color y paletas conservan su papel de marca; cultura y celebraciones no tienen cuota.
- Baseline: 49 desarrolladas, no 49 entregadas ni 49 publicadas.
- Minería de México/español con presupuesto agregado, lectura de cuerpos y hogar canónico por intención.
- Implementación operativa: `modules/14_PLANEACION_TEMATICA_Y_COBERTURA.md`.
- Este añadido no declara una nueva sincronización integral de todas las fuentes de la Wiki.

## Aprendizajes de tutoriales incorporados — 2026-09-03

Ajuste autorizado por el operador tras la auditoría y corrección de N29; **no es una nueva
sincronización integral de la Wiki** ni aprobación editorial/técnica del cliente de nuevas piezas.

- Evidencia: [N29, revisión vigente y control de fuentes](https://www.notion.so/3a639c2fefe78004bf2dd1a2864a29b6);
  [solicitud de María Fernanda del 2026-09-02](https://teams.microsoft.com/l/message/19%3a1f04b439276946b6b8285e9969bf2d2d%40thread.v2/1788379450056?context=%7B%22contextType%22:%22chat%22%7D).
- Wiki, página y PDF de Berelex Semibrillante: fuentes, datos coincidentes y discrepancia de años
  registrados en [módulo 12 §3.1](modules/12_DATOS_VERIFICADOS_DEL_CATALOGO.md).
- [Módulo 13](modules/13_FORMATO_TUTORIAL_HIBRIDO.md): operaciones completas dentro de cuatro
  macropasos, alcance acotado, revisión vigente y conciliación de dependencias de producto.
- [Control técnico](templates/control-tecnico-tutorial.md): evidencia por operación, fuente y
  destino; no un check de cantidad de títulos.
- N29 en Notion: tutorial, ALT del paso 3, instrucciones de N2 y nota en tarea principal corregidos
  y releídos. Artes/Frame.io, copies sociales y publicación Drupal no quedaron cerrados.
- Estas reglas gobiernan nuevas ejecuciones; no autorizan más reescrituras retroactivas.

## Precedencia cuando hay contradicción

1. petición fechada del cliente;
2. spec específica del artefacto;
3. Playbook Producción vivo;
4. guía general;
5. copia del repo.

Ejemplos conocidos:

- `Instagram Post estático` en una versión vieja del Playbook → **no gobierna**; se usa Story.
- `/search?q=<color>` en una línea vieja de Fase 5 → **no gobierna**; se usa `/colores/<familia>` o
  una pieza editorial válida.
- `Enlace` presente → no prueba Modalidad A si la URL sigue siendo soft-404.

## Verificaciones externas promovidas al repo

Verificadas en vivo el 2026-08-25:

- `robots.txt` bloquea `/search` y `?q=`;
- `berel.com` puede devolver shell 200 para rutas inexistentes;
- sitemaps autoritativos:
  - `/sitemap-productos.xml`
  - `/sitemap-articulos.xml`
  - `/sitemap-colores.xml`
- una URL real debe confirmar `title`, H1 y cuerpo editorial frente a una ruta de control.

## Material sensible

**Accesos CMS** contiene credenciales en texto plano. Nunca se copia a skill, repo, log, commit ni
prompt. Solo se usa desde el workspace autorizado cuando toca publicar.

## Regla de mantenimiento

Cada vez que cambie el Playbook Producción, revisar como mínimo:

- `SKILL.md`
- `01_CICLO_MENSUAL.md`
- `03_REDACCION_ARTICULO.md`
- `05_BANNERS_IMAGENES.md`
- `06_DERIVADOS_SOCIALES.md`
- `07_SISTEMA_NOTION.md`
- `08_PUBLICACION_CMS_DRUPAL.md`
- `09_RECOMENDACIONES_DEL_CLIENTE.md`
- `13_FORMATO_TUTORIAL_HIBRIDO.md`
- `14_PLANEACION_TEMATICA_Y_COBERTURA.md`
- `GLOSSARY.md`
- este `SOURCES.md`

Los espejos `.claude` y `.codex` deben quedar **byte-identical**.
