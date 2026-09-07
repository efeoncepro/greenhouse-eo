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

En la misma página del Content Hub, como única zona activa:

`✍️ Versión vigente para revisión — Tutorial híbrido`

No crear subpágina. No borrar versiones anteriores: rotularlas como `Histórico`. El Brief/Plan y las
notas de implementación viven en el sistema privado de Efeonce. Corregir la revisión propia vigente solo cuando el operador autorice
el ajuste, con lectura fresca y reemplazos acotados; nunca sobrescribir originales ajenos.
Una referencia eliminada/archivada no se restaura automáticamente: resolver la página vigente.

## Referencia de formato

Referencia viva usada por el Playbook:

`/tutoriales/en-esta-temporada-prepara-tu-patio-con-berelinte`

El formato de tutorial puede sostener cobertura SEO amplia desde una sola URL, pero los datos de
ranking son evidencia contextual, no promesa de resultado.

## Estructura obligatoria del híbrido

La versión vigente del híbrido es una **zona de lectura del cliente**. Contiene solo el contenido
aprobable/publicable; la procedencia, la justificación del formato, las notas CMS y los pendientes viven en
el sistema privado de Efeonce.

1. **Metadatos en viñetas**
   - title;
   - meta description;
   - slug;
2. **Intro corta**
   - subtítulo/promesa;
   - cápsula autocontenida de 20–25 palabras;
   - gancho breve con producto/datos verificados.
3. **Paso a Paso — 4 pasos**
   - `1. Limpieza y preparación de la superficie`
   - `2. Aplicación de sellador`
   - `3. Primera capa`
   - `4. Segunda capa y revisión del acabado`
4. **Productos Berel**
5. **Materiales y Herramientas**
6. **Colores sugeridos**
7. **Preguntas frecuentes**
8. **Toques finales + BerelTip de Don Bere**
9. **Cierre**

La tarea privada de implementación conserva el schema recomendado: `Article`, `FAQPage`,
`BreadcrumbList` y `HowTo` cuando el Paso a Paso cumple la estructura visible.

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

En la tarea privada de la secuencia, crear una fila `Foto del paso N` por cada paso con:

- descripción literal de lo que debe verse;
- archivo `.webp` descriptivo, minúsculas y guiones;
- peso objetivo menor a 200 KB;
- `loading="lazy"`;
- ALT literal entre comillas;
- proporción 1:1;
- medida CMS final; si falta confirmación, registrar el bloqueo en la tarea privada.

Para diseño, la entrega de cada foto es **1:1 de 500 px**, sin texto, logo ni gráficos adicionales.
Todas las fotos deben compartir espacio, luz y muro para continuidad visual.

🔴 Estas fotos **no son** los banners N1–N4. La versión que revisa el cliente no muestra briefs,
archivos, ALT, medidas ni instrucciones de implementación intercaladas entre los pasos.

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

Las descripciones se redactan y gobiernan en esta tabla. Si hace falta comprobar la ubicación, se anclan
al número y título del paso; no se copian a un callout dentro del híbrido.

## Bloque `Tutorial Contenido` en Drupal

`Productos Berel`, `Materiales y Herramientas` y `Colores sugeridos` se preparan como referencia de
carga para el bloque CMS **`Tutorial Contenido`**.

### Productos Berel

Tabla:

`Producto · Dónde va · Dato clave de ficha · Enlace`

- URL solo si está verificada;
- si falta una URL pública, usar una categoría verificada o dejar el producto sin enlace en el texto;
  registrar el pendiente solo en el sistema privado;
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

Los banners del artículo original conservan su especificación completa en las tareas visuales asociadas al
híbrido. Cada ficha conserva:

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

🔴 No usar un puntero tipo “ver ficha en V1” dentro de una tarea que deba ser autosuficiente. Tampoco
copiar la ficha ni sus instrucciones a la versión que lee el cliente.

### Fuente única de verdad

ALT + archivo + posición se conservan iguales entre la subtarea de banner/fotos, las notas privadas para
Dev y cada par social afectado (tarea + subítem), según su canal. La revisión vigente conserva la sección
editorial de destino o el arte final, no la especificación operativa.

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
- [ ] 1 foto 📸 por paso, especificada en la tarea privada y no dentro de la lectura
- [ ] Fotos ≠ banners
- [ ] Tarea única de secuencia creada solo después del híbrido
- [ ] La tarea tiene `Tipo de pieza = Estatico` y `Canal de pieza = Blog`, releídos; no dividirla por foto
- [ ] Productos/Materiales/Colores mapeados a `Tutorial Contenido`
- [ ] Ningún `/search?q=`
- [ ] FAQ visible = schema
- [ ] Banners heredados conservados completos en sus tareas visuales
- [ ] ALT/archivo/posición mantienen paridad
- [ ] Pendientes propios del formato declarados en el sistema privado, sin disclaimers en la página del cliente
- [ ] Cambio de producto conciliado con cada destino o pendiente de distribución explícito
- [ ] Assets existentes revisados o declarados no verificados; no confundir brief con arte
- [ ] Una sola versión vigente; procedencia, specs, QA, CMS/Dev y pendientes ausentes de toda superficie del cliente
- [ ] Gate `client-visible-copy-gate.mjs` y lectura humana de cliente aprobados sobre export fresco
- [ ] Segunda lectura fresca confirma contenido, jerarquía/tabuladores, tarea, relaciones, responsables, fechas y estado
- [ ] Control técnico adjunto con evidencia; estos checks no se tildan por cumplir sólo la plantilla
