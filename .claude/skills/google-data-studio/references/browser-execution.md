# Ejecución con navegador

## Principio

Usa el navegador para la superficie visual/interactiva y una API, connector o CLI cuando exista una operación
semántica más segura. Data Studio no ofrece una API general para editar el canvas, por lo que muchas mejoras requieren
UI autenticada.

No dependas de un nombre de herramienta común entre Codex y Claude. Detecta capacidades y conserva este procedimiento:

```text
observar → localizar semánticamente → actuar → reobservar → verificar
```

## Selección de motor

### Browser control / Playwright

Preferido para navegación, accessibility snapshots, roles/labels, acciones granulares, consola, red, capturas y
verificación repetible. Usa el browser elegido por el entorno y su sesión disponible. Si el usuario nombra Chrome,
in-app Browser u otra familia, respeta esa elección.

Reglas:

- `domcontentloaded` + readiness visual; no uses `networkidle` como única verdad;
- locators por role/name/label/text estable antes que CSS generado o `nth-child`;
- confirma unicidad antes de click/fill;
- usa herramientas granulares; evita ejecución arbitraria cuando no sea necesaria;
- captura console/page errors y requests fallidos con redacción.

### Computer Use

Úsalo para Chrome autenticado, canvas, drag/resize o UI que expone poco DOM/ARIA.

- Inspecciona el árbol de accesibilidad antes de usar la imagen.
- Prefiere `element_index` sobre coordenadas.
- Después de cada acción vuelve a obtener el estado y deriva índices nuevos; nunca reutilices índices stale.
- Usa screenshot/coordenadas solo si AX no basta.
- Fija ventana, zoom y viewport antes de comparar bounds.
- Para drag/resize conserva screenshot y bounds antes/después; prefiere inputs de posición/tamaño o teclado si existen.

### Webwright

Úsalo cuando el runtime lo exponga y aporte exploración multi-step, script reproducible o Critical Points con
evidencia. No lo conviertas en dependencia: puede abrir un navegador fresco sin la sesión Google existente.

Importa su disciplina `plan → explore → script → execute → self-verify`, no selectores o coordenadas descubiertos en
otra sesión. Un script durable se vuelve a observar antes de ejecutarse contra un reporte real.

### Estrategia híbrida

Computer Use puede aplicar cambios en una sesión autenticada; Playwright/Webwright puede verificar una URL en view
mode si tiene acceso. No asumas que comparten cookies, cuenta, idioma, rollout ni permisos.

Si ningún motor disponible conserva una sesión autorizada y permite verificar el actor, detente: no inicies sesión,
no trasplantes cookies ni sustituyas la cuenta. Reporta el bloqueo y entrega el plan y los Critical Points ejecutables.

## Modos operativos

### `inspect`

1. Abre view mode y registra URL segura, versión `draft|published`, páginas, navegación, controles y estados visibles.
2. Captura baseline por página/región.
3. Si hace falta edit mode, selecciona componentes solo para leer sus propiedades; no cambies sources, fields,
   filters, parameters ni layout.
4. Redacta datos sensibles y no abras sharing/credentials salvo que sean parte explícita del diagnóstico.

### `draft-copy`

1. Confirma que la copia está autorizada y será privada.
2. Registra qué fuentes son embedded/reusable y qué credenciales continúan activas.
3. No asumas que copiar duplica fuentes reutilizables, ownership, historial ni conexión.
4. Aplica cambios y verifica primero en la copia.

### `apply`

1. Confirma reporte, cuenta, publishing `enabled|disabled`, versión objetivo y estrategia de rollback.
2. Data Studio autosavea: realiza una mutación atómica y reobserva.
3. Antes de modificar Setup/Style confirma nombre/tipo del componente seleccionado.
4. Si la propiedad esperada no aparece, busca settings o reinspecciona; no adivines otra pestaña/coordenada.
5. En propiedades con estados alternos —positivo/negativo, hover, empty o error— verifica cada valor configurado en
   el panel; el estado visible actual no prueba los estados que los datos no materializan.
6. Detente ante editor concurrente, permiso/cuenta inesperados, login, OAuth o selector ambiguo.

### `verify`

1. Cambia a view mode y selecciona explícitamente draft o published cuando report publishing esté activo.
2. Espera contenido listo y ausencia de loaders/error visibles.
3. Prueba controles desde su default, una selección y reset.
4. Valida filtros en todos los charts esperados, no solo en el primero.
5. Captura regiones; evita `fullPage` en páginas con charts responsivos o elementos fixed.
6. Revisa datos, AX, visual, consola/red y permisos según alcance.

## Critical Points

Convierte cada requisito en una afirmación observable:

```text
CP-01 dato: Revenue = SUM(net_revenue), período y moneda visibles
CP-02 visual: time series usa Date como date range dimension
CP-03 interacción: Region filtra KPIs, tendencia y tabla, y reset restaura All
CP-04 alcance: control de Campaign afecta solo la sección Acquisition
CP-05 responsive: no hay corte/overflow en el viewport objetivo
```

No cierres un CP con una inferencia. Cada uno debe mapear a propiedad leída, valor reconciliado, estado accesible,
screenshot o log saneado.

## Evidencia

Cuando el trabajo requiere artifacts, usa una carpeta task-scoped y gitignored:

```text
plan.md
manifest.json
screenshots/NN-page-region-state.png
actions.log
```

El manifest debería registrar timestamp, URL segura/report ID redactado, actor, modo, viewport, page, acción,
pre/post state, errores saneados, CP verdict, rollback y blocker. No guardes cookies, auth headers, códigos OAuth,
tokens, payloads sensibles ni screenshots de dialogs de autenticación.

Recorta o enmascara PII y datos comerciales que no sean necesarios. Guarda la evidencia fuera del repo o en una ruta
ya ignorada y con acceso mínimo; no la publiques ni la conserves más allá del encargo sin autorización.

Los KPIs y fechas dinámicas hacen que pixel diff sea inadecuado para verdad semántica. Úsalo solo para layout con
máscaras deliberadas.

## Confirmaciones

Read-only no requiere confirmación. Pide autorización en el momento antes de OAuth/grants, data credentials,
community visualizations/connectors, sharing público o ampliado, ownership, scheduled delivery, pagos, uploads de
datos sensibles, Publish, cambio de publishing, restore que reemplace trabajo actual o eliminación sin rollback fiable.
Contraseñas y credenciales siempre las ingresa el usuario.
