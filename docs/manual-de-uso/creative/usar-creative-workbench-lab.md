# Usar el Design System Lab de Creative Workbench

Corte: 2026-10-01. Cliente admitido de este sitio: SKY Airline.
[Qué incluye el Lab](../../documentation/creative/creative-workbench-lab.md) ·
[Estado publicado y evidencia](../../operations/creative-production/WORKBENCH_CURRENT_STATE.md).

## Abrir la versión publicada

Abrir [creative-workbench-sky.vercel.app](https://creative-workbench-sky.vercel.app/).
El sitio abre sin login tras la autorización del operador para compartirlo con el equipo.
[Estado de acceso y deployment actual](../../operations/creative-production/WORKBENCH_LAB_ACCESS_STATE.md):
cinco páginas y manifiesto HTTP 200 anónimos. PR17/v6 es el corte funcional histórico de este manual.
Un enlace `127.0.0.1` identifica una preview local; no abre la versión publicada en Vercel.

La navegación lateral organiza Vista general, Composiciones, Adaptaciones, Tokens, Tipografía,
Recursos y Guía. En móvil usar «Explorar bibliotecas». `creative.efeonce.org` sigue como dominio
previsto: comprobar su DNS, alias, TLS y acceso antes de comunicarlo como sitio disponible.

## Explorar una composición y su receta

1. Entrar a Composiciones y recorrer la paginación; cada entidad muestra una referencia completa.
2. Abrir «Ver receta» para consultar pasos, componentes y variantes admitidos. Ampliar una pieza
   conserva la relación con esa receta.
3. «Explorar zonas» abre la mesa de revisión. Escape cierra primero la ampliación si existe y luego
   el detalle; Cerrar/Escape devuelve el foco al origen visible. Sin JS, abrir el disclosure nativo.

No elegir variantes por parecido. La composición/receta y los IDs de la adaptación son sus fuentes.
Para producir copy/foto nuevos, continuar con el flujo nativo `docs/manual/native-design.md` de
Workbench y la [operación de plataforma](../plataforma/operar-creative-workbench.md).

## Buscar, filtrar e inspeccionar adaptaciones

1. Abrir [Adaptaciones](https://creative-workbench-sky.vercel.app/#adaptaciones) y buscar destino,
   formato o dimensiones. El contador indica resultados y referencias mostradas; «Ver más» amplía
   la consulta sin modificar el catálogo.
2. Abrir «Explorar por familia». El menú v6 muestra nombres, conteos y check. Flechas/Home/End o
   escribir navegan; Enter/Espacio aplica. Escape cancela, Tab cierra y avanza. También puede
   seleccionarse con clic; clic exterior cierra.
3. «Restablecer» vuelve a la consulta completa de 126 y sincroniza menú, texto y valor. Las familias
   son Always On 7, Eventos 24, Display 53, SKY WEEK 36, Campañas 2, Financiación 2 y Originales
   agrupados 2. Estos conteos pertenecen al snapshot de este corte.
4. «Explorar pieza» abre `#pieza=<formatId>`: variantes de receta, original proporcional y zonas.
   Seleccionar una zona para leer su función/campos; activar contornos sólo si hace falta inspección.
5. Descargar referencia obtiene el original; volver a Adaptaciones recupera búsqueda y scroll.
   En móvil revisar primero la pieza y después zonas/variantes, sin forzar anchos de escritorio.

Si una zona no existe en esa adaptación, permanece ausente. Verificar la referencia completa y
sus metadatos: tarifas, fechas y condiciones históricas no constituyen contenido aprobado nuevo.

## Consultar tokens, tipografía y recursos

En [Tokens](https://creative-workbench-sky.vercel.app/tokens/) buscar nombre/valor, seleccionar una
colección y copiar el dato original con su nombre/procedencia. La lista mejorada muestra Todas
las colecciones 108, Primitives 27, Semantic 33 y Typography 48; mismo teclado/reset que familias.
El reset de la lista progresiva vuelve al estado inicial de 24/108, conservando el inventario.

Tipografía muestra cinco specimens Metric en SVG, sin ofrecer fuentes privadas. Recursos vincula
archivos admitidos con componentes/recetas; leer su fuente antes de usarlo. Logo, módulo y
referencia histórica son clases diferentes de recurso. Bricolage/Poppins pertenecen al host Lab,
no a la pieza SKY. No copiar estilos de la UI para reconstruir contenido del cliente.

## Motion y fallbacks

### Explorar la nueva biblioteca de íconos (unidad local)

En el snapshot nuevo de Workbench, abrir **Recursos → Explorar íconos** o **Íconos**
en la navegación; la ruta es `/iconos/`. No agregar esa ruta al alias publicado
como si ya estuviera desplegada: comprobar primero su estado/build actual.

1. Buscar nombre, ID de componente o nodo Figma **de familia**, sin exigir tildes.
2. Elegir kind (Outline, Filled o Duotone) y tamaño nativo. Si no existe la
   combinación, usar otro tamaño o pulsar la sugerencia explícita; no hay fallback.
3. Descargar el SVG exacto; abrir **Variantes y receta** para sus 19 combinaciones,
   fuente y selector de agente. **Mostrar más** agrega 24 familias; reset vuelve
   a Outline / 24 y limpia la búsqueda.
4. Abrir **Originales y alternativas** para los otros 303 vectores por nodo.
   Sin JS quedan visibles todas las familias y descargas/disclosures HTML;
   filtros, paginación y copia requieren la mejora cliente.

Consulta API/CLI, tamaños admitidos, procedencia y mantenimiento en Workbench
`docs/manual/sky-icon-library.md` y la
[skill](../../../.codex/skills/efeonce-creative-workbench/references/icons.md).
Los candidatos no se insertan en jobs por path/SVG libre. Para nuevos KV se
necesita una revisión propia de recurso/placement/receta y QA, conservando marca,
fuente y hashes. La página no altera las 126 adaptaciones ni los 108 tokens.

La portada se compone con scroll manual en desktop; las bibliotecas mantienen lectura estable.
Reduced motion ofrece la misma información sin ensamblaje/entradas. En móvil la escena es compacta.
Sin JavaScript o Popover API el selector nativo conserva su etiqueta/valor; recetas y galerías
siguen accesibles como disclosure/grid. No es un error de despliegue ver ese fallback en un
navegador sin soporte. El menú host completo se verificó en desktop y móvil con soporte.

## Construir y publicar otro snapshot

Desde Workbench, consultar `docs/manual/workbench-lab.md` para compilar con inputs admitidos,
UUID/locks y proyección explícita por SHA cuando corresponda. Servir el `out` devuelto en un puerto
libre para revisión; no editar el snapshot, sobrescribir corridas ni ejecutar CLIs Greenhouse.

Publicar requiere el alcance autorizado, proyecto SKY correcto, source/build exactos y QA.
Verificar deployment READY, promoción y alias explícito, bytes críticos autenticados, protección y
navegador en el alias. El status Vercel genérico asociado al repo no sustituye esa comprobación.
Registrar evidencia fuera de Git sin secretos. El [cierre v6](../../audits/creative-workbench/2026-10-01-lab-premium-v6-documentation-closure.md)
conserva el ejemplo verificado, no una autorización automática para otro deploy.
