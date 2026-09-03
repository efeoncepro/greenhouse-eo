# 13 · Formato Tutorial híbrido

> **Fuente:** actualización del `📘 Playbook Producción` en Notion, sincronizada el **2026-09-02**.
> Se activa **solo** cuando `Content Hub.Formato = Tutorial`.
> Complemento operativo del operador **2026-09-03**: completitud técnica, cambios acotados y paridad.
> No equivale a una nueva sincronización integral del Playbook de Notion.

## Qué es

El formato Tutorial **no reemplaza** la Modalidad A/B. Primero se produce el análisis/plan y el V1
normal; después se crea una versión de carga al CMS que reorganiza el contenido dentro del template
`/tutoriales/`.

🔴 **Una intención = una URL.** No publicar artículo y tutorial separados para la misma keyword. El
híbrido reestructura el V1 y conserva aproximadamente 90% de su cobertura útil.

## Preflight: alcance, versión y sistema técnico

Antes de redactar, completar [el control técnico](../templates/control-tecnico-tutorial.md):
- Leer el Playbook y Ficha Tutoriales vivos; registrar cambios frente a esta copia.
- Leer la revisión vigente y las observaciones fechadas del cliente en Notion/Teams, incluidas las
  posteriores al brief. Registrar pieza, fecha, autor y enlace; no inferir aprobación del silencio.
- Identificar si se pide auditoría, corrección puntual o reescritura. En piezas previas, conservar
  lo no afectado. La estructura futura no autoriza reconvertir todo el histórico.
- Confirmar producto/acabado, soporte y exposición con el módulo 12; el tutorial de referencia
  gobierna formato, no selección de producto, proporciones ni tiempos.
- Inventariar texto, tablas, FAQ, fotos, banners, tareas, pares sociales y assets ya entregados.
  No ordenar producirlos otra vez sólo porque un campo de la tarea esté vacío.

## Dónde vive en Notion

En la misma página del Content Hub, al final:

`🔁 Reescritura en formato Tutorial (híbrido) — [Artículo]`

No crear subpágina. No borrar Brief/Plan ni V1. Identificar una única revisión vigente y rotular
las anteriores como historial. Corregir la revisión propia vigente sólo cuando el operador autorice
el ajuste, con lectura fresca y reemplazos acotados; nunca sobrescribir originales ajenos.
Una referencia eliminada/archivada no se restaura automáticamente: resolver la página vigente.

## Referencia de formato

Referencia viva usada por el Playbook:

`/tutoriales/en-esta-temporada-prepara-tu-patio-con-berelinte`

El formato de tutorial puede sostener cobertura SEO amplia desde una sola URL, pero los datos de
ranking son evidencia contextual, no promesa de resultado.

## Estructura obligatoria del híbrido

1. **Callout de procedencia**
   - por qué es híbrido;
   - referencia de formato;
   - regla una intención = una URL;
   - notas de carga CMS.
2. **Metadatos en viñetas**
   - title;
   - meta description;
   - slug;
   - schema recomendado: `Article`, `FAQPage`, `BreadcrumbList`; `HowTo` cuando el Paso a Paso
     cumple la estructura visible.
3. **Intro corta**
   - subtítulo/promesa;
   - cápsula autocontenida de 20–25 palabras;
   - gancho breve con producto/datos verificados.
4. **Paso a Paso — 4 pasos**
   - `1. Limpieza y preparación de la superficie`
   - `2. Aplicación de sellador`
   - `3. Primera capa`
   - `4. Segunda capa y revisión del acabado`
5. **Productos Berel**
6. **Materiales y Herramientas**
7. **Colores sugeridos**
8. **Preguntas frecuentes**
9. **Toques finales + BerelTip de Don Bere**
10. **Cierre**
11. **Callout ⚠️ de pendientes**

El corte de 4 pasos es el canónico del template actual. Solo se cambia si el cliente/template lo
pide explícitamente. Son **macropasos de presentación, no sólo cuatro operaciones**. No eliminar
preparación, mezcla, dilución o esperas para encajar. Si el sistema exige otra secuencia, documentar
el conflicto y pedir la excepción; nunca inventar sellador o una segunda mano para cumplir el número.

Cada macropaso indica acción y orden, materiales, condiciones para continuar y precauciones de la
ficha. Comprobar, según aplique:
- diagnóstico del soporte/acabado previo y corrección de humedad;
- limpieza, retiro de pintura inestable, lijado y reparación compatibles;
- sellador/primario exacto, preparación y secado propios, sin copiar la dilución de la pintura;
- mezcla, diluyente y proporción, herramienta y condiciones ambientales;
- aplicación de capas, intervalo mínimo y criterio de inspección;
- curado, primer lavado o uso sólo si la fuente los establece.

Cada operación lleva fuente y ubicación en el tutorial; “no aplica” requiere razón. Una instrucción
esencial sin resolver bloquea el procedimiento dependiente, no se esconde en una nota al final.
Comprobar texto real, no sólo contar encabezados. Evitar recetas universales de limpieza o promesas
como “cualquier mancha sale” sin respaldo.

## Fotos 📸 del Paso a Paso

Antes de cada paso insertar un callout `📸 Foto del paso N` con:

- descripción literal de lo que debe verse;
- archivo `.webp` descriptivo, minúsculas y guiones;
- peso objetivo menor a 200 KB;
- `loading="lazy"`;
- ALT literal entre comillas;
- proporción 1:1;
- medida CMS final pendiente de Dev cuando aplique.

Para diseño, la entrega de cada foto es **1:1 de 500 px**, sin texto, logo ni gráficos adicionales.
Todas las fotos deben compartir espacio, luz y muro para continuidad visual.

🔴 Estas fotos **no son** los banners N1–N4.

## Tarea única de diseño para la secuencia

Crear una sola subtarea cuando el híbrido ya esté escrito:

`Tutorial N## - Secuencia Paso a Paso (X fotos) — [Artículo]`

Propiedades:

- `Proyecto` = proyecto mensual
- `Tarea principal` = tarea del artículo
- `Artículo (Content Hub)` = fila del artículo
- `Tipo de entregable` = `Diseño gráfico`
- `Tipo de pieza` = `Estatico` desde la creación
- `Canal de pieza` = `Blog` desde la creación
- `Formato` = `Tutorial`
- responsable = diseñador del ciclo
- ícono = 📸
- fecha = junto a los banners

Nomenclatura de archivos de diseño:

- `N##_PASO-1`
- `N##_PASO-2`
- `N##_PASO-3`
- `N##_PASO-4`

La nomenclatura de diseño no sustituye el nombre `.webp` definido para CMS.

## Ficha de la secuencia

La tarea replica la **Ficha Tutoriales** y debe incluir:

- formato;
- función;
- tipo de gráfico/foto;
- cantidad de pasos;
- formato de entrega;
- lineamientos;
- referencia visual;
- notas generales;
- tabla `Paso · Nombre de archivo · Descripción · Referencia visual · Notas para diseño`.

Las descripciones se copian de los callouts 📸 del híbrido. No se reescriben.

## Bloque `Tutorial Contenido` en Drupal

`Productos Berel`, `Materiales y Herramientas` y `Colores sugeridos` se preparan como referencia de
carga para el bloque CMS **`Tutorial Contenido`**.

### Productos Berel

Tabla:

`Producto · Dónde va · Dato clave de ficha · Enlace`

- URL solo si está verificada;
- si falta: `URL de ficha por definir (pendiente)`;
- nunca inventar una ruta.

### Materiales y Herramientas

Tabla:

`Material · Se usa en`

Mapear cada material al paso donde se usa.

### Colores sugeridos

Tabla:

`Color + código · Familia · Enlace`

- usar nombre + código alfanumérico;
- familia apunta a `/colores/<familia>` verificada;
- nunca `/search?q=`.

## FAQ y AEO

Las preguntas del fan-out que no quedaron resueltas en los pasos pasan a FAQ. Cada una debe tener:

1. H2 en pregunta cuando corresponda;
2. cápsula de respuesta de 20–25 palabras;
3. desarrollo;
4. tabla/lista si mejora extracción;
5. texto visible idéntico al schema `FAQPage`.

## Toques finales y BerelTip

- El último punto de Toques finales debe retomar la escena o promesa del gancho.
- El BerelTip enseña el beneficio de la técnica correcta, sin dramatizar el error.

## Cierre

Debe incluir siguientes pasos útiles y específicos, por ejemplo:

- calculadora de material;
- ubica-tienda;
- pieza hermana relevante;
- disclaimer cuando aplique;
- firma: `Pinta con Confianza. Pinta con Berel.`

CTA nunca al Home.

## Banners heredados del V1

Los banners del artículo original **viajan completos** al híbrido.

Cada callout 🖼️ conserva:

- número/rol;
- ubicación exacta;
- objetivo;
- 1408 × 768 px y variantes cuando apliquen;
- composición;
- texto literal sobre imagen;
- estilo/paleta;
- ALT;
- archivo `.webp`;
- peso menor a 200 KB;
- lazy sí/no;
- anti banner-blindness.

🔴 No usar un puntero tipo “ver ficha en V1”.

### Fuente única de verdad

ALT + archivo + posición se conservan iguales entre:

- revisión vigente del híbrido;
- subtarea de banner/fotos;
- notas para Dev;
- cada par social afectado (tarea + subítem), según su canal.

El V1 preservado puede contener datos supersedidos: marcarlo como historial, no exigir modificarlo
para fingir paridad. Si cambia el corte o un dato, registrar la adaptación y copiar desde la revisión
vigente. No confundir igualdad de textos con aprobación o verificación del arte.

## Imagen 🔁 para redes

Sigue existiendo una sola pieza base de adaptación social por artículo, normalmente la infografía.
Variantes:

- Pinterest 2:3 — 1000 × 1500
- Instagram 4:5 — solo como adaptación técnica si una spec lo exige, **no como publicación estática**
- Instagram Story 9:16 — 1080 × 1920
- Reel 9:16

La distribución vigente de Instagram es **Story**, no post estático.

## Corrección de producto: revisión de dependencias

Un cambio como N29 Berelinte → Berelex Semibrillante no se ejecuta con reemplazo global:
1. Confirmar la variante solicitada y revalidar su ficha. Mantener separado el enlace a un tutorial
   de referencia que legítimamente nombre otro producto.
2. Revisar prosa, pasos, tablas, cálculo, FAQ, enlaces y metadatos afectados; no heredar cifras,
   acabados o garantías. Mantener título, slug, colores y narrativa cuando no cambie su validez.
3. Copiar las correcciones a ALT y fichas de foto/banner, envases PNG y notas CMS. Un envase correcto
   no demuestra que el producto sea compatible con todas las superficies de una infografía.
4. Reconciliar derivados afectados en tarea y subítem. Copiar el significado técnico, no trasladar
   mecánicamente todos los datos al canal: redes no lleva ciclos de lavado (módulo 06).
5. Contrastar assets existentes antes de solicitar sustitución. No afirmar que Frame.io o Drupal
   cambiaron al guardar una ficha de Notion.
6. Releer cada destino y registrar corregido / no afectado / pendiente / fuera de alcance.
   Si algún derivado o asset queda pendiente, bloquear su distribución y decirlo; el ajuste no
   equivale al cierre del paquete completo.

## QA antes de cerrar

- [ ] Alcance autorizado y revisión vigente identificados; originales preservados
- [ ] Cambios recientes del cliente leídos con fecha/enlace
- [ ] Control técnico completo por variante y fuente, sin datos trasladados
- [ ] Todas las operaciones necesarias ubicadas dentro de los macropasos
- [ ] Tacto/repintado/curado/lavado/uso distinguidos; pendientes con efecto explícito
- [ ] `Formato = Tutorial` confirmado
- [ ] V1 normal existe antes del híbrido
- [ ] Una sola intención/URL
- [ ] Híbrido vive en la misma página del Content Hub
- [ ] Metadatos no se reinventaron
- [ ] 4 pasos canónicos o excepción documentada
- [ ] 1 foto 📸 por paso
- [ ] Fotos ≠ banners
- [ ] Tarea única de secuencia creada solo después del híbrido
- [ ] La tarea tiene `Tipo de pieza = Estatico` y `Canal de pieza = Blog`, releídos; no dividirla por foto
- [ ] Productos/Materiales/Colores mapeados a `Tutorial Contenido`
- [ ] Ningún `/search?q=`
- [ ] FAQ visible = schema
- [ ] Banners heredados copiados completos
- [ ] ALT/archivo/posición mantienen paridad
- [ ] Pendientes propios del formato declarados
- [ ] Cambio de producto conciliado con cada destino o pendiente de distribución explícito
- [ ] Assets existentes revisados o declarados no verificados; no confundir brief con arte
- [ ] Segunda lectura fresca confirma contenido, tarea, relaciones, responsables, fechas y estado
- [ ] Control técnico adjunto con evidencia; estos checks no se tildan por cumplir sólo la plantilla
