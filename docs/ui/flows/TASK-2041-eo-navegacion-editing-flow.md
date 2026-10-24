# TASK-2041 — Edición del menú global: flujo

> Nodos **E1** (persona en el admin), **E2** (agente u operador por comandos) y **E3** (otro sitio que lee) del flujo
> maestro [`EPIC-055-public-site-global-navigation-UI-FLOW.md`](EPIC-055-public-site-global-navigation-UI-FLOW.md).
> Pantalla: [`TASK-2041-eo-navegacion-admin.md`](../wireframes/TASK-2041-eo-navegacion-admin.md).
>
> Estado (2026-10-23): el plugin está activo en efeoncepro.com y el documento vivo va en la revisión 4. **Hoy el menú
> se cambia con E2** (`pnpm public-website:site-nav`); el admin de E1 falta construirlo con la dirección B (vista
> previa en vivo) y el árbol de la dirección A.

## Flow Goal

Que una persona o un agente cambie el menú con la misma garantía: nada inválido se publica, nada se pisa en silencio,
todo cambio queda en el historial y se puede deshacer.

## Happy Path

### E1 · Persona en el admin (pendiente de construir)

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

### E2 · Agente u operador con `pnpm public-website:site-nav` (forma vigente)

Se corre desde `greenhouse-eo`; los archivos de trabajo quedan en `tmp/site-nav/`, que no se versiona. Primer uso real:
revisión 4.

1. `pull` trae el documento vivo (o `--revision n`) como base.
2. `set`, `unset`, `add`, `remove`, `move`, `patch` (RFC 6902), `glyph` o `photo` lo cambian por selectores
   (`primary|line|service|format|item|case|reading|featured|strip|onepage:<id>`, `header`, `cta`, `logo`, `footer`).
3. `check`, `fit`, `diff` y `preview` lo revisan: validador del plugin, enlaces y fotos que responden, sin entidades
   HTML, títulos de tarjeta que caben y capturas de escritorio y teléfono.
4. `apply --message "…"` hace un ensayo en el servidor y guarda contra la revisión base, por el mismo servicio de
   guardado que usará el admin; un guardado concurrente nunca se pisa. Purga.
5. `verify` revisa el menú publicado.

Las escrituras en producción (subir fotos, `apply` y `restore`) necesitan el go del operador. Por debajo quedan los
comandos del plugin (`wp eo-nav export|validate|apply|revisions|restore`), que se corren con
`pnpm public-website:wpcli` después de `pnpm public-website:ssh-check` y con la foto previa del documento.

### E3 · Otro sitio

Lee `GET /wp-json/eo/v1/site-nav` con `ETag` y vuelve a pedir el documento sólo si cambió.

## Recovery Branches

| Situación | Comportamiento |
|---|---|
| Validación fallida (admin) | No guarda. Lista de errores con enlace al nodo y error en línea; el foco va al primer error. |
| Validación fallida (`site-nav`) | `check` corre el validador del plugin y `apply` ensaya en el servidor antes de guardar; si no valida, no guarda. |
| Validación fallida (WP-CLI) | Sale con código distinto de cero y lista los errores por ruta del documento. No cambia nada. |
| Conflicto: alguien guardó después de abrir | No pisa. El admin mostrará la revisión nueva y ofrecerá comparar antes de decidir; `site-nav apply` y WP-CLI no guardan y dan la revisión vigente. |
| Un filtro del anfitrión altera lo guardado | El JSON se guarda en ASCII escapado; tras guardar se relee y, si el hash no coincide, falla con `eosn_storage_altered`. |
| Mismo contenido aplicado dos veces | No crea revisión nueva (idempotente: compara con el documento guardado). |
| Algo salió mal en producción | `site-nav restore <n> --message` («Restaurar» en el historial cuando exista el admin, o `wp eo-nav restore <revisión>`): crea una revisión nueva con el contenido anterior y nunca borra historia. |
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
| Mismo servicio para admin, CLI y WP-CLI | Full API Parity: dos clientes, una implementación; el comportamiento ante errores y conflictos es idéntico. |
| Conflicto visible en vez de «último gana» | Personas y agentes editan el mismo documento; pisar en silencio rompe la confianza. |
| Restaurar crea revisión nueva | El historial es la auditoría; nunca se reescribe. |
