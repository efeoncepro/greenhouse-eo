# Rooms — revisión independiente de AXIS y ViewTransitions

2026-10-25. Revisor `rooms_qa`, separado del implementador UI. Build local Next de `efeonce-rooms`, SHA `0453852`, servido en `http://127.0.0.1:3210`. Evidencia local; publicación y autenticación federada tienen verificaciones distintas.

## Resultado

- Matriz amplia: 41 pruebas Playwright aprobadas; tres duplicados de la prueba exclusivamente API omitidos deliberadamente. Tamaños: 1440×900, 390×844, 1024×768 y 320×740.
- Revisión de readiness: 16 pruebas de movimiento y navegación de autoridad aprobadas con `domcontentloaded`, marker real y fuentes cargadas.
- Después de los ajustes de contraste: ocho pruebas afectadas aprobadas en los cuatro tamaños, incluyendo hover del enlace original de las tres piezas y radiografía editorial.
- Regresión posterior de foco: 24 pruebas aprobadas (32,7 s) después de corregir el foco de los extremos del paginador. Incluyen la matriz de movimiento y clics rápidos en modo normal, reducido y sin API, en los cuatro tamaños. Las capturas GVC conservan la composición ya validada; esta corrección sólo cambia la actualización de estado/foco.
- GVC final: `.captures/2026-10-25T21-13-43_rooms-first-experience/manifest.json`; cuatro variantes, 68 frames, cero hallazgos y cero errores de consola, página, hidratación o HTTP. Dossier generado por el runner en el mismo directorio, `review-dossier.md`.

El run anterior `2026-10-25T21-11-32_rooms-first-experience` se conserva como evidencia fallida. Encontró una regla de caption que alcanzaba el label interno de AXIS (hover 4,23:1) y pérdida temporal de contraste al animar la opacidad del diálogo. Se acotó el selector al dato de proporción; el diálogo ahora entra con desplazamiento y mantiene el texto opaco. La nueva captura confirma ambas correcciones. Antes se detectó y corrigió también el uso de `cta="external"` con una URL relativa, que hacía fallar el visor al abrirlo.

## Movimiento probado

En cada tamaño, `motion-supported.json` registra cinco transiciones nativas iniciadas, terminadas y renderizadas. La prueba observa `ViewTransition.ready` y animaciones reales sobre `::view-transition-old/new(rooms-client-chapter)` y `::view-transition-old/new(rooms-client-piece)`, no sólo una llamada a `startTransition` ni una clase CSS. `motion-reduced.json` y `motion-unsupported.json` registran cero capturas animadas y el mismo recorrido funcional. Los JSON viven en los subdirectorios `desktop`, `mobile`, `tablet` y `compact` de esta carpeta.

El visor mantiene foco en sus controles al avanzar; Escape regresa al disparador original. Los extremos deshabilitan anterior/siguiente. El cambio de persona carga otro documento, verificado por respuesta de navegación y `performance.timeOrigin`, sin conservar notas o snapshots de la vista interna.

La prueba de ráfagas encontró que volver a la primera pieza deshabilitaba el botón enfocado y dejaba foco en `body`. Se corrigió con actualización funcional desde la pieza vigente y recuperación acotada al control que acaba de deshabilitarse. Los archivos `rapid-input-{supported,reduced,unsupported}.json` de cada tamaño confirman tres cambios de capítulo sin esperar animación, siguiente→anterior y siguiente→siguiente, ambos extremos correctos, foco dentro del diálogo en un control habilitado, regreso con Escape y cero promesas rechazadas sin manejar.

## Revisión renderizada

Inspeccionados directamente: entrada desktop y móvil, visor horizontal desktop, visor vertical móvil, workspace administrador móvil y radiografía móvil. El logo crece sin disputar jerarquía al concepto; los badges diferencian rol, hipótesis y estado sin reemplazar sus etiquetas. El paginador aparece antes de la pieza en móvil y en la cabecera en desktop. La composición mantiene los archivos originales contenidos, sin recortar.

Se conserva la evaluación visual anterior (media 4,554/5, mínimo 4,25 en densidad), sin elevarla por el hecho de que las pruebas pasen. Sigue siendo razonable compactar la introducción de títulos de radiografía móvil. No bloquea lectura, fuente, método o retorno. La evidencia nueva apoya mantener el criterio de jerarquía, proporción, tipografía y responsive; la aceptación estética final continúa pendiente del operador.

Frames finales principales, relativos al directorio GVC indicado:

- `01-desktop/frames/01-initial-room.png`
- `02-mobile/frames/01-initial-room.png`
- `01-desktop/frames/07-piece-detail.png`
- `01-desktop/frames/09-landscape-detail.png`
- `03-tablet/frames/09-landscape-detail.png`
- `02-mobile/frames/07-piece-detail.png`
- `02-mobile/frames/11-radiography-detail.png`
- `04-compact/frames/11-radiography-detail.png`
- `01-desktop/frames/14-operator-workspace.png`
- `02-mobile/frames/15-administrator-access.png`

## Límites

Axe incompletos se conservan en los archivos `.axe.json`; no equivalen a aprobado automático. La tipografía integrada en PNG mantiene la limitación de contraste por píxel documentada en la revisión original. Los textos UI, controles y estados de hover sí fueron comprobados. La evidencia usa datos sintéticos; no acredita Efeonce ID remoto ni acceso a información cliente real.

## Candidata Vercel verificada

Deployment `dpl_8vJ75Cbn1q75JNe7FEa7LkUccigc`, SHA `bd4b802acbbe1db1b0089c9dc0d558c67c41d111`, URL `https://efeonce-rooms-7rmb7rftw-efeonce-7670142f.vercel.app`. Prueba de la candidata protegida: bypass sólo en memoria y en requests al origen autorizado; ninguna credencial se conserva en evidencia.

Resultado: siete comprobaciones HTTP aprobadas (demo cliente/operador/administrador, cliente sin workspace, API GET y command POST reales con credenciales fabricadas responden `401 unauthenticated`). Desktop 1440×900 y móvil 390×844 aprobaron entrada y fuentes, pieza y contraste hover, cambios rápidos de capítulos y ambos límites del paginador, foco/Escape, cinco transiciones nativas renderizadas por tamaño, fallback reducido/sin API, roles sintéticos y denegación cliente. Cero errores de consola, página, requests fallidos o promesas sin manejar. Capturas de entrada, detalle hover y administrador en `cloud-candidate/`; resumen y diagnóstico por tamaño en JSON. Las capturas desktop del visor y entrada móvil también fueron inspeccionadas visualmente.

El primer intento de browser esperaba `decode()` de todas las imágenes, incluidas piezas lazy fuera del viewport, y no constituyó evidencia de fallo de producto. La verificación final usa readiness acotado al hero visible (`complete` y `naturalWidth > 0`) y fuentes concretas con timeout. Este PASS de candidata no sustituye la comprobación posterior del alias público.

## Comprobación posterior a la promoción

`https://efeonce-rooms.vercel.app/demo` verificado sin bypass ni credenciales especiales después de la promoción del deployment indicado. Cinco controles HTTP aprobados: muestra cliente, workspace operador y administrador, workspace cliente denegado y API real con bearer/rol fabricados responde `401 unauthenticated`. La proyección cliente no contiene la nota interna sintética.

Desktop y móvil cargan con `200` sin redirigir a otro origen; logo y fotografía completos, pieza original con `object-fit: contain`, Escape restaura el foco al disparador y no hay errores de consola/página. Evidencia: `cloud-production/summary.json`, `desktop-entry.png`, `mobile-entry.png`, `desktop-piece.png` y `mobile-piece.png`. Queda verificada la experiencia sintética publicada; no se declaran habilitados Efeonce ID, persistencia cloud ni comandos reales.
