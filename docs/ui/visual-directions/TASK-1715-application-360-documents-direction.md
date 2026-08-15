# TASK-1715 — Visual Direction: documentos del candidato, dos clases de dato

## Decision

Un documento que el reclutador debe leer y un dato de identidad que la ley protege no son el
mismo objeto y no pueden verse igual. La dirección separa el panel en **dos grupos con peso
visual distinto**: archivos y enlaces se leen sin fricción (acción directa, sin candado), la
identidad se revela con fricción deliberada (chip `Sensible`, motivo, auditoría). El candado
recupera su significado porque deja de aparecer donde no protege nada.

La referencia visual es el propio Hiring Desk (TASK-355/1422) — filas con icon-tile, chip de
estado y acción a la derecha — más el patrón de reveal enmascarado del Person 360 (TASK-784).
Cero vocabulario visual nuevo: lo que cambia es la semántica, no el lenguaje.

## Desktop target

A 1440 px el panel ocupa el canvas del tab dentro de la Application 360, sin card anidada
sobre card: cada grupo es un `Paper variant='outlined'` precedido por un `overline` de sección.
La fila resuelve en una línea — icon-tile 44×44, label + chip de estado, meta secundaria
debajo, acciones alineadas a la derecha — y el ojo baja por la columna de acciones sin
tropezar. El grupo Identidad es visualmente más denso y más quieto: una sola fila, chip
`Sensible` en el encabezado y un caption que declara la consecuencia de revelar. La jerarquía
se lee de un vistazo: arriba lo que se usa todos los días, abajo lo que se toca por excepción.

## Mobile target

A 390 px la fila colapsa a columna: icon-tile y label arriba, meta debajo, acciones
full-width al final. Las acciones nunca comparten línea con el label —la causa de overlap que
el loop GVC de TASK-1422 ya detectó en esta misma familia de filas— y el chip de estado usa
`alignSelf` para no estirarse. El dialog de reveal va `fullWidth` con márgenes. Ningún
viewport produce scroll horizontal de página; los nombres de archivo largos rompen con
`overflowWrap: anywhere` en lugar de empujar el layout.

## Alternatives

1. Lista uniforme con candado en las tres filas (el mockup actual): descartado — enseña a
   ignorar el candado y bloquea el trabajo central del ATS.
2. Dos tabs separados (Archivos / Identidad): descartado — sobre-navegación para dos y una
   fila; la separación semántica se resuelve con jerarquía, no con rutas.
3. Tabla densa con columna de estado: descartado — son 2 a 5 filas; una tabla impone chrome
   (headers, alineación, densidad) que a este volumen solo agrega ruido.
4. Dos grupos en la composición de filas ya aprobada: **seleccionado**.

## Token mapping

- Contenedores: `Paper variant='outlined'` + `borderRadius: 3` (patrón desk TASK-355).
- Encabezado de grupo: `Typography variant='overline'` + `GreenhouseChip kind='status' variant='label' tone='warning'` para `Sensible`.
- Estados: `GreenhouseChip` `tone='error'` (cuarentena), `tone='info'` (procesando), `tone='warning'` (sin escanear), `tone='success'` (revelado).
- Icon-tile: `warning.lightOpacity` / `primary.lightOpacity` del tema, nunca HEX literal.
- Acciones: MUI `Button` `variant='outlined'` (Ver / Abrir) y `variant='text'` (Descargar), con anillo de foco vía `var(--mui-palette-primary-main)`; iconos Tabler (`tabler-eye`, `tabler-download`, `tabler-external-link`, `tabler-lock`). **NO** `variant='tonal'`: rinde 3.69:1 y falla AA.
- Copy: `hiringDesk.application.documents.*` en `src/lib/copy/dictionaries/{es-CL,en-US}`; cero literal en JSX.
- Motion: solo la transición por defecto del `Dialog` MUI; sin animación sobre el dato sensible.
- Visor: `Dialog maxWidth='lg'` a `90vh`, documento sobre blob same-origin; el motor es el del navegador, no una librería.

## Anti-patterns

- Candado sobre un documento que la capability de la pantalla ya autorizó a leer.
- Copy que promete auditoría donde no se escribe ninguna entrada.
- "Enmascarado" como texto para un archivo ausente, en cuarentena o en escaneo: son cuatro
  situaciones distintas y merecen cuatro mensajes distintos.
- Botón deshabilitado sin causa adyacente.
- Valor de identidad presente en el DOM antes del reveal, o persistido tras el remount.
- Marco de documento EN BLANCO cuando el navegador no embebe PDF: hay que decirlo y ofrecer la salida.
- Mandar el CV a otra pestaña como camino principal: rompe el contexto de evaluación y deja los estados fuera de nuestro control.
- Card dentro de card, o un grupo que desaparece cuando está vacío (el vacío se dice en la
  fila, no borrando la sección).
