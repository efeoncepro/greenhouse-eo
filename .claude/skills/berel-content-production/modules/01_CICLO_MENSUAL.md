# 01 · El ciclo mensual de producción

> **Fuente de verdad viva:** `📘 Playbook Producción` en Notion (`3b239c2fefe780ceb71dff4f5bed4646`).
> Sincronizado el **2026-09-02**. Si una petición fechada del cliente o una spec específica contradice
> este módulo, manda la fuente más reciente/específica.

## 0 · Resolver estructura y modalidad antes de producir

### Paso 0A — Leer `Formato` en Content Hub

La propiedad `Formato` decide **la estructura CMS**, no si la pieza es nueva o reescritura:

| `Formato` | Qué hacer |
|---|---|
| `Artículo` | Ejecutar Modalidad A o B normal |
| `Tutorial` | Ejecutar Modalidad A o B normal **y después** `13_FORMATO_TUTORIAL_HIBRIDO.md` |
| vacío | No asumir. Reportar el gap antes de escribir |

### Paso 0B — Determinar modalidad por contenido vivo

| Modalidad | Condición real | Ruta |
|---|---|---|
| **A · Reescritura** | La URL contiene `title`, H1 y cuerpo editorial vivo | F1–F5 → F6–F10 |
| **B · Artículo nuevo** | No hay URL viva, o la canónica planificada sirve shell soft-404 | B1–B5 → F6–F10 |

🔴 **No basta `Enlace`, ni HTTP 200.** `berel.com` puede devolver 200 para rutas inexistentes.

## 1 · Orden canónico dentro de la página del Content Hub

### Modalidad A

1. `Contenido anterior del artículo`
2. `Análisis SEO/AEO`
3. `Análisis de contenido`
4. `✍️ Reescritura V1`
5. Si `Formato = Tutorial`: `🔁 Reescritura en formato Tutorial (híbrido) — [Artículo]`

### Modalidad B

Si la pieza se investiga desde cero:

1. `🧭 Plan editorial y SEO`
2. `✍️ Artículo V1`
3. Si `Formato = Tutorial`: híbrido al final

Si ya llega con brief aguas arriba:

1. `📋 Brief SEO/AEO — [tema]`
2. `✍️ Artículo V1`
3. Si `Formato = Tutorial`: híbrido al final

🔴 No duplicar `Plan editorial y SEO` si ya existe `📋 Brief SEO/AEO`.

## 2 · Fase 1 — Identificar el lote

1. Filtrar Content Hub por `Fecha de publicación` del mes objetivo.
2. Separar por alcance pedido: reescrituras · artículos nuevos · ya publicados fuera del ciclo.
3. Leer `Formato` en cada fila.
4. Para cualquier fila con `Enlace`, abrir la URL antes de asignar modalidad.
5. Si falta un enlace esperado de reescritura, buscar en Teams; si sigue faltando, reportar bloqueo y continuar.
6. Tema `por definir` → crear contenedor/tarea solo si corresponde al alcance, **sin subtareas**.

## 3 · Fase 2 — Rescatar contenido anterior (solo A)

- Abrir una URL a la vez con extracción completa.
- Agregar `Contenido anterior del artículo` sin borrar ni modificar lo previo.
- Esa copia es texto plano: no sirve para afirmar enlaces, ALT, `title`, jerarquías o schema.

## 4 · Fases 3 y 4 — Análisis

→ `02_ANALISIS_AUDITORIA.md`

Regla central: todo hallazgo técnico se verifica contra HTML/URL viva y termina con sección fechada
`Verificación en la URL publicada`.

## 5 · Fase 5 / B5 — Escritura

→ `03_REDACCION_ARTICULO.md`

Al terminar el V1:

- mover Content Hub a `En revisión`;
- si `Formato = Artículo`, continuar a producción visual;
- si `Formato = Tutorial`, **todavía no crear la tarea de fotos de pasos**: primero producir el
  híbrido con `13_FORMATO_TUTORIAL_HIBRIDO.md`.

## 6 · Modalidad B — Artículo nuevo

### B1 · Brief de origen

Antes de idear:

- buscar qué pidió el cliente en Teams;
- buscar fichas/material oficial en SharePoint;
- registrar literalmente el pedido y los assets pendientes;
- no declarar que algo “no existe” solo porque no apareció en un listado paginado.

### B2 · Decidir el ángulo

Responder por escrito: **¿por qué esto es un artículo y no una ficha de producto?**

- entrar por el problema del lector, no por un nombre de producto desconocido;
- explicar el problema antes de introducir marca/producto;
- no esconder limitaciones reales del producto.

### B3 · Arquitectura SEO antes de escribir

Dejar decidido:

- keyword principal + 3–4 secundarias con rol;
- title, slug, meta y H1 con conteos;
- mapa de H2/H3;
- longitud objetivo;
- dosis/entrada del producto;
- validación de colisión del slug.

Jerarquías sin herramienta = **estimación**, no dato medido.

### B4 · Datos verificados

Crear tabla de claims permitidos a partir de la ficha técnica + la página pública del producto viva.

- lo que no esté verificado no entra;
- si dos fuentes contradicen, ambas quedan como discrepancia y ninguna se publica;
- una canónica planificada puede vivir en metadata, pero no activa distribución mientras siga soft-404.

### B5 · Escribir

Usar la misma estructura del módulo `03`.

Además:

- plan de enlaces **salientes + entrantes**;
- handoff explícito a CMS;
- renombrar fila si traía marcador `por desarrollar`;
- estado `En revisión`.

## 7 · Fase 6 — Proyecto mensual

Buscar primero si ya existe. No duplicar.

| Campo | Valor |
|---|---|
| Nombre | `Produccion Creativa - [Mes] [AA]` |
| Ícono | 🎨 |
| Estado inicial | `Planificación` |
| Estado con producción real | `En curso` |
| Fechas | primer → último día del mes |

## 8 · Fase 7 — Tarea principal por pieza

Naming: `Artículo N## - [Título]`.

`N##` es continuo por bloques mensuales completos, no por orden de redacción o creación.
Antes de asignarlo, aplicar [numeración editorial e identidad](16_NUMERACION_EDITORIAL.md):
reservar también slots nuevos/por definir y revisar adicionales antes de numerar el siguiente mes.

Propiedades mínimas:

- Responsable del ciclo
- `Tipo de entregable = Contenido`
- `Formato` mapeado desde Content Hub: `Artículo → Articulo`, `Tutorial → Tutorial`
- `Tipo de pieza` y `Canal de pieza` vacíos en la principal para no inflar el conteo visual
- primera semana como fecha objetivo
- relación al proyecto
- relación `Artículo (Content Hub)`
- estado real

## 9 · Fase 8 — Producción derivada

### Para `Formato = Artículo`

Por artículo escrito:

- 4 banners
- de 0 a 4 derivados sociales según la matriz del [módulo 15](15_DISTRIBUCION_SELECTIVA.md)

Opciones vigentes, sin obligación de producirlas todas:

1. Facebook
2. **Instagram Story** — no post estático
3. Pinterest Pin
4. Reel/TikTok/Short

### Para `Formato = Tutorial`

Además del set anterior, cuando el híbrido ya esté escrito:

- **1 tarea adicional** `Tutorial N## - Secuencia Paso a Paso (X fotos) — [Artículo]`
- normalmente X = 4 fotos, una por paso
- seguir `13_FORMATO_TUTORIAL_HIBRIDO.md`

🔴 Las fotos de pasos **no sustituyen** los banners N1–N4.

### Numeraciones

- artículo/social → `N##` continuo mensual;
- banner → `N1…N4`, reinicia por artículo;
- fotos de tutorial → archivos de diseño `N##_PASO-1`, etc.

### Relaciones

Toda subtarea visual debe llevar desde su creación:

- Proyecto
- Tarea principal
- `Artículo (Content Hub)`
- Responsable real tomado del ciclo anterior o instrucción explícita
- Estado real

- `Tipo de pieza` = `Estatico` o `Video`, según el entregable
- `Canal de pieza` = `Blog` o `Social Media`, según el destino

Antes de cerrar subtareas, aplicar la matriz de clasificación y el readback de
[`07_SISTEMA_NOTION.md`](07_SISTEMA_NOTION.md): tipo, canal y formato son propiedades separadas.
Las cantidades siguientes describen tareas/paquetes; no acreditan cantidad de archivos entregados.

## 10 · Aritmética de aceptación

Definir `P` principales editoriales (artículos + tutoriales), `B` tareas de banners,
`T` tareas de secuencia fotográfica y `S` derivados sociales seleccionados/reservados.

- Tareas activas/reservadas esperadas: **`P + B + T + S`**.
- Si todas las piezas tienen sus cuatro banners: `B = 4P`; total **`5P + T + S`**.
- Subítems sociales activos/reservados: **`S`**, con pares verificados `S/S`.
- Cancelados/archivados históricos se conservan y reportan aparte; las filas físicas pueden ser más.
- Son tareas/paquetes, no archivos entregados ni una modificación de fórmulas Notion.

## 11 · Fase 9 — Íconos

| Tipo | Ícono |
|---|---|
| Proyecto | 🎨 |
| Artículo | ▶️ |
| Banner | 🖼️ |
| Tutorial secuencia | 📸 |
| Instagram Story | 📱 |
| Facebook | 🔲 |
| Pinterest tarea | 📍 |
| Reel/TikTok/Short | ▶️ |

## 12 · Fase 10 — Estados y cierre

- V1 terminado → Content Hub `En revisión`.
- Aprobado → `Aprobado`; live → `Publicado`.
- Sin tema → `Idea`, no tocar.
- Proyecto con trabajo activo → `En curso`.

🔴 Hacer **segunda lectura fresca** tras automatizaciones de Notion: fechas, estados, relaciones,
responsables, `Formato` y contenido guardado.

## 13 · Reporte de avance

Siempre tres grupos:

1. **Listos**
2. **Bloqueados**, con motivo explícito
3. **Fuera de alcance**

## Checklist de cierre

- [ ] `Formato` leído en cada fila
- [ ] Modalidad asignada por contenido vivo, no por `Enlace`/HTTP 200
- [ ] Contenido anterior rescatado solo donde corresponde
- [ ] Auditoría SEO/AEO verificada contra URL viva
- [ ] Artículo/rewrite escrito sin borrar contenido previo
- [ ] Enlaces sin `/search?q=` y verificados
- [ ] Sin RGB/HEX de pintura en cuerpo
- [ ] Voz Berel es-MX auditada
- [ ] Proyecto mensual único y en estado real
- [ ] Tareas principales relacionadas al Content Hub
- [ ] 4 banners solo después de texto escrito
- [ ] Instagram = Story
- [ ] Derivados seleccionados con paridad tarea ↔ subítem; exclusiones y reservas documentadas
- [ ] Tutoriales llevan híbrido antes de fotos
- [ ] Tutoriales llevan 1 tarea adicional de secuencia Paso a Paso
- [ ] ALT/archivo/posición conservan una sola fuente de verdad
- [ ] Cada tarea visual, incluidas las bloqueadas, tiene tipo y canal verificados según módulo 07
- [ ] Segunda lectura fresca confirma propiedades guardadas
- [ ] Conteo `P + B + T + S` conciliado; históricos separados y cupos/archivos/entregas diferenciados
- [ ] Reporte final separa listos · bloqueados · fuera de alcance
