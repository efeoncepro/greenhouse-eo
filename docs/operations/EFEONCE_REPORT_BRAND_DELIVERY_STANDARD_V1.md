# Estándar de marca y entrega de informes Efeonce

**Estado:** vigente · **Origen:** instrucción del operador, 2026-09-04.
**Alcance:** todos los informes de Efeonce, internos o dirigidos a clientes, cualquiera que sea su disciplina.
La metodología y las cifras siguen bajo el contrato del dominio; este estándar gobierna su presentación.

## Identidad y pie de página obligatorios

**Distinción de formato · instrucción del operador, 2026-09-04:** en decks o presentaciones, incluidas las exportadas a PDF A4 horizontal, el pie lleva como máximo la URL bubble oficial. No trasladar dirección, teléfonos, línea divisoria ni folio del informe escrito a las láminas. El pie completo descrito abajo aplica a informes escritos, no a decks.

- Cada página del informe lleva un pie legible con el **URL bubble oficial de Efeonce**, dirección
  institucional y teléfono. Incluye la portada, adaptando contraste y espacio sin omitir los datos.
  Reserva el área del pie antes de paginar: no debe invadir texto, tablas, notas ni numeración.
- Usa el asset real `src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg` y conserva su
  proporción. Su URL se verifica en `back-cover-full.html`, junto al mismo catálogo. No sustituyas
  el bubble por texto, una cápsula dibujada ni una aproximación generada. En PDF conserva un enlace
  clicable sobre el asset, además de su identificación visual.
- Resuelve dirección y teléfono desde `slots.contactDetails.value` en
  `src/lib/artifact-composer/catalogs/deck-axis/back-cover-full.slots.json`; contrasta el contexto
  institucional en [Quiénes somos](../context/01_quienes-somos.md). Estos son los dueños de los valores:
  no mantengas otra copia manual en skills. Selecciona el teléfono regional aplicable y no infieras
  WhatsApp, horarios ni presencia física estadounidense. Ante discrepancias, resuélvelas antes de entregar.
- Todos los informes incorporan el **logo oficial de Efeonce**, con su variante positiva, negativa o
  monocromática autorizada según el fondo. Los informes para un cliente incorporan también su logo
  oficial. Mantén proporción, contraste y área de protección; no recrees ni recolorees logos.
- Colores y tipografías provienen del canon de marca y de assets verificados. Reutiliza variantes
  existentes del catálogo/branding; no inventes una paleta para significar «premium».

## Composición para lectura autónoma

El lector debe poder entender resultado, evidencia, limitación y siguiente paso sin un presentador.
Usa jerarquía editorial, títulos informativos, espaciado consistente e iconos que ayuden a identificar
secciones. Las imágenes deben aportar información y tener procedencia autorizada; no son un requisito
para llenar espacio. Mantén el texto dirigido a su audiencia y explica los términos especializados.

Incluye gráficos cuando permitan comprender mejor una comparación, evolución, composición o relación.
Cada gráfico muestra período, unidad, fuente y, cuando corresponda, denominador y cobertura. Etiqueta
los valores directamente; no dependas sólo del color. No mezcles universos ni conviertas ausencia de
medición en cero. Las tablas de respaldo conservan el detalle necesario para auditar las conclusiones.

## Entrega PDF y control de calidad

Cuando el destino es PDF, el HTML es **insumo editable**, no el entregable final. Para informes escritos
usa **A4 (210 × 297 mm)** salvo formato solicitado expresamente; una presentación no cambia de formato
por ser exportada a PDF. Embebe las fuentes y assets necesarios para reproducibilidad y comprueba el
archivo exportado, no sólo el navegador.

Antes de entregar:

1. Confirma audiencia, formato final, logos, tipografías, paleta y fuentes del pie.
2. Compón el contenido con márgenes reservados para pie y numeración. Usa índice paginado cuando el
   largo lo requiera; repite encabezados de tablas y evita títulos huérfanos, cortes de fichas y páginas
   vacías accidentales.
3. Exporta y revisa visualmente todas las páginas del PDF; inspecciona al tamaño de lectura las más
   densas, la portada, las tablas, los gráficos y los cambios de sección.
4. Verifica tamaño A4, integridad del contenido, fuentes, logos, pie en cada página, vínculos y ausencia
   de recortes o solapamientos. Valida contraste y texto seleccionable; no reduzcas el cuerpo para
   forzar un número de páginas arbitrario.
5. Corrige y vuelve a exportar hasta resolver los defectos observados. Entrega el PDF y conserva el
   insumo editable y evidencia de revisión. Un HTML correcto no prueba que el PDF esté revisado.

## Aplicación y propietarios

`design-studio` gobierna composición; `deck-studio` aporta lectura sin narrador y evidencia visual;
`copywriting` gobierna claridad. Las skills de dominio (incluidas SEO/AEO y Berel) aplican este
estándar junto a sus criterios de datos y responsabilidad. Esta instrucción extiende el uso de assets
existentes a informes; no modifica tokens de producto, plantillas del Composer ni sus resolvers.

## Ejecución del estándar

La skill `report-studio`, espejada para Claude y Codex, integra este contrato en el flujo de brief, evidencia, narrativa, visualización, producción y revisión. Su `SOURCES.md` distingue fuentes primarias de recomendaciones propias; `references/quality-and-delivery.md` y el helper PDF definen verificaciones y límites. El estándar sigue siendo el dueño de la identidad institucional.
