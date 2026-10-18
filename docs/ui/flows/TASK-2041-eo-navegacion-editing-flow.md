# TASK-2041 — Edición del menú global: flujo

> Nodos **E1** (persona en el admin), **E2** (agente por WP-CLI) y **E3** (otro sitio que lee) del flujo maestro
> [`EPIC-055-public-site-global-navigation-UI-FLOW.md`](EPIC-055-public-site-global-navigation-UI-FLOW.md).
> Pantalla: [`TASK-2041-eo-navegacion-admin.md`](../wireframes/TASK-2041-eo-navegacion-admin.md).

## Flow Goal

Que una persona o un agente cambie el menú con la misma garantía: nada inválido se publica, nada se pisa en silencio,
todo cambio queda en el historial y se puede deshacer.

## Happy Path

### E1 · Persona en el admin

1. Abre Ajustes → «Navegación del sitio». Ve el estado: revisión publicada, autor y fecha.
2. Elige un nodo en el árbol, edita en el editor de nodo y, si quiere, abre la vista previa (1440 y 390). La vista
   previa no publica.
3. Guarda. El servicio:
   1. valida contra `site-nav.v1`;
   2. compara la revisión base;
   3. crea la revisión con autor y mensaje;
   4. publica la copia;
   5. purga la caché.
4. Ve «Publicado como revisión N». El sitio pinta el documento nuevo en el siguiente request.

### E2 · Agente por WP-CLI

1. `pnpm public-website:ssh-check`.
2. `wp eo-nav export > actual.json` (foto previa).
3. Edita el archivo y corre `wp eo-nav validate --file=nuevo.json`.
4. Aplica con `wp eo-nav apply --file=nuevo.json --message="…"`. Es el mismo servicio que el admin.
5. `wp eo-nav export` para confirmar que lo publicado es lo aplicado.

### E3 · Otro sitio

Lee `GET /wp-json/eo/v1/site-nav` con `ETag` y vuelve a pedir el documento sólo si cambió.

## Recovery Branches

| Situación | Comportamiento |
|---|---|
| Validación fallida (admin) | No guarda. Lista de errores con enlace al nodo y error en línea; el foco va al primer error. |
| Validación fallida (WP-CLI) | Sale con código distinto de cero y lista los errores por ruta del documento. No cambia nada. |
| Conflicto: alguien guardó después de abrir | No pisa. El admin muestra la revisión nueva y ofrece comparar antes de decidir; WP-CLI falla con la revisión vigente. |
| Mismo contenido aplicado dos veces | No crea revisión nueva (idempotente). |
| Algo salió mal en producción | «Restaurar» en el historial o `wp eo-nav restore <revisión>`: crea una revisión nueva con el contenido anterior y nunca borra historia. |
| Salir con cambios sin guardar | Aviso del navegador antes de salir. |
| Sin permiso | La pantalla no aparece; el acceso directo da el aviso estándar de WordPress. |

## Focus and Navigation

- La pantalla vive en una sola ruta del admin; no hay saltos entre pantallas.
- El árbol se recorre con teclado.
- Tras guardar, el foco vuelve al nodo editado; tras fallar, va al primer error.
- La confirmación de restaurar es en línea, dentro del historial.

## GVC Scenario Plan

Playwright sobre el admin de staging o local, a 1440×900 y 1280×800:

1. Editar un servicio y guardar.
2. Provocar un error de validación.
3. Simular un conflicto (guardar por WP-CLI con la pantalla abierta).
4. Restaurar una revisión.
5. Vista previa.

Verificaciones: igualdad con `wp eo-nav export`, ningún guardado ante error y revisión nueva al restaurar.

## Design Decision Log

| Decisión | Por qué |
|---|---|
| Mismo servicio para admin y WP-CLI | Full API Parity: dos clientes, una implementación; el comportamiento ante errores y conflictos es idéntico. |
| Conflicto visible en vez de «último gana» | Personas y agentes editan el mismo documento; pisar en silencio rompe la confianza. |
| Restaurar crea revisión nueva | El historial es la auditoría; nunca se reescribe. |
