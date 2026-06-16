# Roadmap — cockpit del backlog

> **Tipo de documento:** Manual de uso (operador del portal)
> **Versión:** 1.0
> **Creado:** 2026-06-16 por Claude (TASK-1153)
> **Documentación técnica:** `docs/tasks/complete/TASK-1153-roadmap-cockpit-ui-main-menu.md`, `docs/documentation/plataforma/roadmap-cockpit.md`

## Para qué sirve

El **Roadmap** es la pantalla para priorizar el backlog operativo completo —epics, tasks, mini-tasks e incidentes— sin tener que abrir los Markdown uno por uno. Lee el índice read-only de TASK-1152; **no edita** ningún archivo: los Markdown siguen siendo la fuente de verdad de los agentes.

Lo usas para: planificar la semana, hacer grooming, elegir la próxima task, ver qué está bloqueado y revisar incidentes abiertos.

## Antes de empezar

- Es una superficie **interna**. Vive como item de menú **Roadmap** (no dentro de Admin), junto a Design System y Knowledge.
- Solo la ven usuarios internos de Efeonce. Los clientes no acceden.

## Paso a paso

1. En el menú lateral, abre **Roadmap**.
2. Arriba ves la **banda de KPIs**: cuántos work items hay en el backlog, epics activos, listas para ejecutar, bloqueadas, incidentes abiertos, las que necesitan grooming y las que están en progreso.
3. Si aparece un **banner amarillo** ("N work items no parsean del todo"), son archivos con front-matter incompleto: se muestran en la lane «Necesitan grooming» con sus warnings. El resto del backlog sigue siendo legible.
4. Usa la **barra de filtros**:
   - Las **pills** (Todos / Epics / Tasks / Mini-tasks / Issues) filtran por tipo.
   - La **búsqueda** filtra por ID o título.
   - Los selects **Prioridad**, **Dominio** y **Salud** acotan más.
   - "Limpiar" resetea todos los filtros.
5. El **tablero** organiza el backlog en lanes: Programas, Listas para ejecutar, Bloqueadas, Incidentes abiertos, Necesitan grooming, En progreso y Resueltas hace poco. Si una lane tiene muchas, muestra las primeras y un "+N más — filtra para acotar".
6. Haz clic en cualquier **card** para abrir el **inspector** (a la derecha en desktop, como panel deslizante en móvil): ahí ves el resumen, por qué existe, archivos, dependencias, relacionadas y —solo para tasks ejecutables— el comando `/implement-task`.
7. Desde el inspector, **Abrir task** despliega un **panel ancho** con el **contenido completo del Markdown renderizado** (títulos, listas, código, tablas) sin salir del cockpit. Sigue siendo solo lectura: el archivo en el repo es la fuente de verdad.

## Qué significan las señales

- **Color del borde izquierdo** de la card = tipo: azul (epic), celeste (task), verde (mini-task), rojo (issue).
- **Chip de prioridad** (P0–P3) y **ícono de salud** (saludable / necesita atención / bloqueada).
- **Lanes**: una card cae en exactamente una lane según su tipo, estado, bloqueo y salud.
- **"Sincronizado hace X"**: cuándo se construyó el índice. Usa **Actualizar índice** para releerlo.

## Acciones seguras

- **Abrir task**: abre el panel ancho con el contenido del Markdown renderizado (solo lectura).
- **Copiar ID**: copia el ID del work item.
- **Copiar comando**: copia `/implement-task TASK-###` (solo para tasks; si está bloqueada, te avisa por cuál).
- **Copiar ruta** (dentro del panel "Abrir task"): copia la ruta del archivo en el repo.

## Qué no hacer

- No esperes editar tasks desde acá: el cockpit es de **solo lectura**. Para cambiar una task, edita su Markdown.
- No uses `/implement-task` con un issue o un epic: el comando solo aplica a tasks ejecutables.

## Problemas comunes

- **No veo el item Roadmap en el menú**: tu rol no tiene el acceso `plataforma.roadmap`, o tu sesión es vieja. Cierra y vuelve a iniciar sesión; si persiste, pide acceso a un administrador.
- **El banner dice que faltan work items**: revisa el front-matter (Status, Lifecycle, filename canónico) de los archivos que aparecen en «Necesitan grooming».
- **Una lane dice "+N más"**: hay más items de los que caben; filtra por prioridad/dominio/búsqueda para acotar.

> Detalle técnico: la UI consume `buildRoadmapCockpitData` (server-side) sobre el reader de TASK-1152. Capa funcional: `docs/documentation/plataforma/roadmap-cockpit.md`.
